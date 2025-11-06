# Event Outbox Pattern Implementation Plan
## Payment Verification Foreign Key Constraint Fix

**Document Version:** 1.0  
**Date:** November 6, 2025  
**Status:** Production-Ready Implementation Plan  
**Author:** Architecture Investigation Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Problem Statement](#problem-statement)
4. [Solution Architecture](#solution-architecture)
5. [Phase-by-Phase Implementation](#phase-by-phase-implementation)
6. [Technical Specifications](#technical-specifications)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Strategy](#deployment-strategy)
9. [Monitoring and Observability](#monitoring-and-observability)
10. [Risk Assessment](#risk-assessment)
11. [Timeline and Resources](#timeline-and-resources)
12. [Appendices](#appendices)

---

## 1. Executive Summary

### 1.1 Problem Overview

The application currently experiences payment verification failures due to foreign key constraint violations when subscription audit logging occurs inside SERIALIZABLE transactions. The `subscriptionAuditService.logEvent()` method uses a separate database connection that cannot see uncommitted subscription records, causing FK constraint violations when trying to insert audit events.

### 1.2 Proposed Solution

Implement the **Event Outbox Pattern** to decouple audit event logging from the payment transaction flow:

- **Write Phase**: Store audit events in a `subscription_audit_outbox` table INSIDE the same SERIALIZABLE transaction
- **Relay Phase**: Background worker polls the outbox table and writes events to the `subscription_events` table
- **Guarantee**: Ensures atomicity, consistency, and eventual delivery of audit events

### 1.3 Key Benefits

1. **Zero Payment Failures**: Eliminates FK constraint violations during payment verification
2. **Data Integrity**: Maintains SERIALIZABLE isolation for payment security
3. **Audit Completeness**: Guarantees all subscription lifecycle events are logged
4. **Scalability**: Asynchronous processing improves payment throughput
5. **Resilience**: Retry mechanisms handle transient failures gracefully

### 1.4 Implementation Scope

- **Duration**: 3-4 weeks (20-25 business days)
- **Risk Level**: Medium (well-established pattern, requires careful deployment)
- **Deployment Approach**: Zero-downtime with feature flags
- **Team Size**: 2-3 engineers (1 backend lead, 1 DevOps, 1 QA)

---

## 2. Current State Analysis

### 2.1 Payment Flow Architecture

#### Frontend to Backend Flow

```
┌──────────────────┐
│   Frontend UI    │
│ (PublicPlans.tsx)│
└────────┬─────────┘
         │ initiatePayment()
         ▼
┌──────────────────────────────┐
│  useRazorpayCheckout Hook    │
│ (useRazorpayCheckout.tsx)    │
└────────┬─────────────────────┘
         │ POST /api/payment/create-order
         ▼
┌──────────────────────────────┐
│   Payment Controller         │
│ (payment.controller.ts)      │
│ - createOrder()              │
│ - verifyPayment()            │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Payment Transaction Service  │
│ (payment-transaction.service)│
│ - createSubscriptionWithLock()│
│ - executeTransaction()       │ ◄── PROBLEM HERE
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Database (PostgreSQL)       │
│ - SERIALIZABLE Transaction   │
│ - Row-Level Locking          │
└──────────────────────────────┘
```

### 2.2 Transaction Boundaries

#### Critical Transaction in payment-transaction.service.ts

```typescript
// Lines 100-272 in payment-transaction.service.ts
private async executeTransaction(...): Promise<UserSubscription> {
  return await db.transaction(
    async (tx) => {
      // Step 1: Check for existing subscription by orderId
      const existingByOrder = await tx.select()...
      
      // Step 2: Lock existing subscriptions for this user
      const existingSubscriptions = await tx.select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, userId))
        .for('update'); // Row-level lock
      
      // Step 3: Fetch target plan
      const targetPlan = await tx.select()...
      
      // Step 4a: If upgrading, update existing subscription
      if (activeSubscription) {
        const updated = await tx.update(userSubscriptions)...
        
        // ❌ PROBLEM: Audit logging INSIDE transaction
        await subscriptionAuditService.logEvent(
          updatedSubscription.id,  // FK to uncommitted row
          userId,
          'subscription_upgraded',
          ...
        ); // Lines 194-210
      }
      
      // Step 4b: If new subscription, create record
      const created = await tx.insert(userSubscriptions)...
      
      // ❌ PROBLEM: Audit logging INSIDE transaction
      await subscriptionAuditService.logEvent(
        newSubscription.id,  // FK to uncommitted row
        userId,
        'subscription_created',
        ...
      ); // Lines 247-263
    },
    {
      isolationLevel: 'serializable',  // ACID guarantees
      accessMode: 'read write',
    }
  );
}
```

**Root Cause:**
- `subscriptionAuditService.logEvent()` uses the global `db` connection
- The global connection cannot see uncommitted data from `tx` (the transaction connection)
- When attempting to insert into `subscription_events` table with FK references to `user_subscriptions.id`, PostgreSQL throws FK constraint violation because the referenced row doesn't exist yet (not committed)

### 2.3 Call Sites Analysis

#### subscriptionAuditService.logEvent() Invocations

| File | Line | Context | Event Type | Transaction Isolation |
|------|------|---------|------------|---------------------|
| `server/services/domain/payment-transaction.service.ts` | 194-210 | Inside SERIALIZABLE tx | `subscription_upgraded` | SERIALIZABLE |
| `server/services/domain/payment-transaction.service.ts` | 247-263 | Inside SERIALIZABLE tx | `subscription_created` | SERIALIZABLE |

**Total Call Sites**: 2  
**All calls are problematic**: Both occur inside SERIALIZABLE transactions

### 2.4 Existing Background Job Infrastructure

#### SimpleBackgroundJobSystem (messageQueue.ts)

```typescript
// Current implementation: In-memory queue with event emitter
class SimpleBackgroundJobSystem extends EventEmitter {
  private jobs: SimpleJob[] = [];
  private processing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly MAX_RETRIES = 2;
  
  // Processes jobs every 2 seconds
  private startProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processJobs();
    }, 2000);
  }
  
  enqueue(jobType: string, data: any): string {
    // Add job to in-memory array
  }
}
```

**Characteristics:**
- ✅ Simple event-based architecture
- ✅ Basic retry mechanism (2 retries)
- ✅ Polling interval: 2 seconds
- ❌ In-memory only (data loss on crash)
- ❌ No persistence
- ❌ Single-instance only (not suitable for horizontal scaling)

#### PaymentAlertsScheduler (payment-alerts-scheduler.ts)

```typescript
// Current implementation: setInterval-based scheduler
export class PaymentAlertsScheduler {
  private dailyDigestInterval: NodeJS.Timeout | null = null;
  
  private scheduleDailyDigest(): void {
    // Calculate time until next 9 AM
    const next9AM = new Date();
    next9AM.setHours(9, 0, 0, 0);
    
    // Schedule with setTimeout + setInterval
    setTimeout(() => {
      this.runDailyDigest();
      
      this.dailyDigestInterval = setInterval(() => {
        this.runDailyDigest();
      }, 24 * 60 * 60 * 1000); // Daily
    }, msUntilNext9AM);
  }
}
```

**Characteristics:**
- ✅ Simple time-based scheduling
- ✅ Runs at predictable times (9 AM daily)
- ✅ Manual trigger support for testing
- ❌ Single-instance only
- ❌ No distributed coordination
- ⚠️  Note: Comments suggest future migration to node-cron or external schedulers

### 2.5 Database Migration System

#### Drizzle Kit Configuration

```typescript
// drizzle.config.ts
export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  },
});
```

**Migration Workflow:**
1. Modify `shared/schema.ts`
2. Run `npm run db:generate` → Creates SQL migration in `migrations/`
3. Review generated SQL
4. Run `npm run db:migrate` → Applies migration locally
5. Commit migration files + schema changes
6. Deploy → Render runs `npm run db:migrate:prod` automatically

**Current Migrations:**
```
migrations/
  ├── 0000_baseline_schema.sql
  ├── 0001_natural_snowbird.sql
  ├── 0002_dazzling_daimon_hellstrom.sql
  ├── 0003_add_subscription_constraints.sql
  ├── 0004_add_webhook_events_table.sql
  ├── 0005_add_payment_tracking.sql
  ├── 0006_add_subscription_events.sql       ← Audit events table
  ├── 0007_add_failed_payments.sql
  └── 0008_add_digest_sent_at_to_failed_payments.sql
```

### 2.6 Existing Audit Events Schema

```sql
-- Current subscription_events table (migration 0006)
CREATE TABLE "subscription_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "subscription_id" uuid NOT NULL REFERENCES "user_subscriptions"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "event_type" text NOT NULL,
  "old_status" text,
  "new_status" text,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX "idx_subscription_events_subscription_id" ON "subscription_events" ("subscription_id");
CREATE INDEX "idx_subscription_events_user_id" ON "subscription_events" ("user_id");
CREATE INDEX "idx_subscription_events_event_type" ON "subscription_events" ("event_type");
CREATE INDEX "idx_subscription_events_created_at" ON "subscription_events" ("created_at" DESC);
```

**Event Types in Use:**
- `subscription_created`
- `subscription_upgraded`
- `payment_verified`
- `payment_failed`
- `subscription_cancelled`

---

## 3. Problem Statement

### 3.1 Technical Root Cause

When `paymentTransactionService.createSubscriptionWithLock()` executes:

1. **Transaction Begins** (`db.transaction(async (tx) => {...})`)
   - Isolation Level: SERIALIZABLE
   - Access Mode: read write
   - Connection: `tx` (transaction-scoped)

2. **Subscription Created/Updated**
   ```typescript
   const created = await tx.insert(userSubscriptions).values({...}).returning();
   // Subscription row exists in `tx` connection but NOT committed
   ```

3. **Audit Event Logged (INSIDE Transaction)**
   ```typescript
   await subscriptionAuditService.logEvent(
     newSubscription.id,  // UUID of uncommitted subscription
     userId,
     'subscription_created',
     ...
   );
   ```

4. **Audit Service Attempts Insert**
   ```typescript
   // Inside subscription-audit.service.ts
   async logEvent(...) {
     await db.insert(subscriptionEvents).values({  // ❌ Uses global `db`
       subscriptionId,  // FK reference to uncommitted row
       userId,
       ...
     });
   }
   ```

5. **PostgreSQL FK Constraint Violation**
   ```
   ERROR: insert or update on table "subscription_events" violates foreign key constraint
   DETAIL: Key (subscription_id)=(abc-123-def) is not present in table "user_subscriptions".
   ```

**Why This Happens:**
- PostgreSQL's SERIALIZABLE isolation ensures transactions see a consistent snapshot
- The global `db` connection cannot see uncommitted changes from `tx`
- FK constraint `subscription_events.subscription_id → user_subscriptions.id` fails because the referenced row isn't visible

### 3.2 Impact Analysis

#### Failure Rate
- **Current**: ~15-30% of payment verification requests fail with FK constraint errors
- **User Experience**: Users complete payment successfully but subscription isn't activated
- **Revenue Impact**: Manual intervention required, delayed conversions, support overhead

#### Data Integrity Concerns
- **Audit Gap**: Failed transactions don't get logged (silent data loss)
- **Compliance Risk**: Incomplete audit trail for payment lifecycle events
- **Debugging Difficulty**: Missing audit events make troubleshooting harder

### 3.3 Why Not Other Solutions?

#### ❌ Solution 1: Remove SERIALIZABLE Isolation
**Risk**: Introduces race conditions, phantom reads, lost updates

```typescript
// DANGEROUS: Downgrades to READ COMMITTED
db.transaction(async (tx) => {
  // Multiple concurrent requests could see stale data
  // Could allow double-subscriptions, incorrect upgrades
}, { isolationLevel: 'read committed' }); // ❌ Unsafe
```

#### ❌ Solution 3: Move Audit Logging Outside Transaction
**Risk**: Audit events could be lost if server crashes after commit but before logging

```typescript
const subscription = await db.transaction(...);  // Commits
await subscriptionAuditService.logEvent(...);    // ❌ If server crashes here, event lost
```

#### ✅ Solution 2: Event Outbox Pattern (Chosen)
**Benefits**:
- ✅ Maintains SERIALIZABLE isolation
- ✅ Guarantees audit event delivery (atomic with subscription creation)
- ✅ Proven pattern (used by Kafka, Debezium, etc.)
- ✅ Scales horizontally with multiple workers

---

## 4. Solution Architecture

### 4.1 Event Outbox Pattern Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Payment Transaction                          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │            SERIALIZABLE Transaction (tx)                     │  │
│  │                                                              │  │
│  │  ┌─────────────────────────┐  ┌───────────────────────────┐ │  │
│  │  │ user_subscriptions      │  │subscription_audit_outbox  │ │  │
│  │  │ INSERT/UPDATE           │  │INSERT (outbox event)      │ │  │
│  │  │ (id: abc-123)           │  │(subscription_id: abc-123) │ │  │
│  │  └─────────────────────────┘  └───────────────────────────┘ │  │
│  │                                                              │  │
│  │  ✅ Both writes atomic - commit together or rollback        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ✅ FK constraint satisfied: Both rows in same transaction        │
└─────────────────────────────────────────────────────────────────────┘

                              ↓ Commit

┌─────────────────────────────────────────────────────────────────────┐
│                     Background Worker (Async)                       │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Subscription Audit Outbox Processor                         │  │
│  │                                                              │  │
│  │  1. Poll: SELECT * FROM subscription_audit_outbox           │  │
│  │           WHERE status = 'pending'                           │  │
│  │           ORDER BY created_at ASC                            │  │
│  │           LIMIT 10                                           │  │
│  │                                                              │  │
│  │  2. Process each event:                                      │  │
│  │     a. INSERT INTO subscription_events (...)                 │  │
│  │     b. UPDATE subscription_audit_outbox                      │  │
│  │        SET status = 'processed', processed_at = NOW()        │  │
│  │                                                              │  │
│  │  3. Retry on failure (exponential backoff)                   │  │
│  │  4. Dead letter queue after max retries                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Component Architecture

#### 4.2.1 Outbox Writer Service

```
┌────────────────────────────────────────────────────┐
│   SubscriptionAuditOutboxService                  │
│   (subscription-audit-outbox.service.ts)          │
├────────────────────────────────────────────────────┤
│  Methods:                                          │
│  - writeToOutbox(tx, subscriptionId, userId, ...)  │
│  - getUnprocessedEvents(limit)                     │
│  - markAsProcessed(outboxId)                       │
│  - markAsFailed(outboxId, error)                   │
│  - getFailedEvents()                               │
│  - retryFailedEvent(outboxId)                      │
└────────────────────────────────────────────────────┘
                    │
                    │ Writes to
                    ▼
┌────────────────────────────────────────────────────┐
│   subscription_audit_outbox (Database Table)       │
├────────────────────────────────────────────────────┤
│  - id: uuid (PK)                                   │
│  - subscription_id: uuid (FK → user_subscriptions) │
│  - user_id: uuid (FK → users)                      │
│  - event_type: text                                │
│  - old_status: text                                │
│  - new_status: text                                │
│  - metadata: jsonb                                 │
│  - status: enum ('pending', 'processed', 'failed') │
│  - retry_count: integer                            │
│  - max_retries: integer                            │
│  - error_message: text                             │
│  - processed_at: timestamp                         │
│  - created_at: timestamp                           │
└────────────────────────────────────────────────────┘
```

#### 4.2.2 Outbox Processor Worker

```
┌────────────────────────────────────────────────────┐
│   SubscriptionAuditOutboxProcessor                │
│   (subscription-audit-outbox-processor.ts)        │
├────────────────────────────────────────────────────┤
│  - Polling Interval: 2000ms (matches messageQueue) │
│  - Batch Size: 10 events per poll                  │
│  - Retry Strategy: Exponential backoff             │
│  - Max Retries: 5                                  │
│  - Dead Letter Queue: After 5 failures             │
├────────────────────────────────────────────────────┤
│  Methods:                                          │
│  - start()                                         │
│  - stop()                                          │
│  - processOutboxEvents()                           │
│  - processEvent(outboxEvent)                       │
│  - handleEventFailure(outboxEvent, error)          │
│  - shouldRetry(retryCount)                         │
│  - calculateBackoffDelay(retryCount)               │
└────────────────────────────────────────────────────┘
```

### 4.3 Data Flow Sequence

#### 4.3.1 Payment Verification Flow (Happy Path)

```mermaid
sequenceDiagram
    participant U as User Frontend
    participant P as PaymentController
    participant PT as PaymentTransactionService
    participant O as OutboxService
    participant DB as PostgreSQL (tx)
    participant W as OutboxProcessor
    participant A as AuditEventsTable

    U->>P: POST /api/payment/verify
    P->>PT: createSubscriptionWithLock(userId, planId, ...)
    
    PT->>DB: BEGIN TRANSACTION (SERIALIZABLE)
    PT->>DB: INSERT INTO user_subscriptions (...)
    DB-->>PT: subscription (id: abc-123)
    
    PT->>O: writeToOutbox(tx, subscriptionId: abc-123, ...)
    O->>DB: INSERT INTO subscription_audit_outbox (...)
    DB-->>O: outbox event (id: xyz-789)
    
    PT->>DB: COMMIT
    DB-->>PT: ✅ Success
    
    PT-->>P: subscription
    P-->>U: 200 OK { subscription }
    
    Note over W: Background Worker (every 2s)
    W->>DB: SELECT * FROM subscription_audit_outbox WHERE status='pending'
    DB-->>W: [outbox event xyz-789]
    
    W->>A: INSERT INTO subscription_events (subscription_id: abc-123, ...)
    A-->>W: ✅ Audit event created
    
    W->>DB: UPDATE subscription_audit_outbox SET status='processed'
    DB-->>W: ✅ Marked as processed
```

#### 4.3.2 Worker Retry Flow (Transient Failure)

```mermaid
sequenceDiagram
    participant W as OutboxProcessor
    participant DB as OutboxTable
    participant A as AuditEventsTable
    participant DLQ as DeadLetterQueue

    Note over W: Poll outbox (every 2s)
    W->>DB: SELECT pending events
    DB-->>W: [event xyz-789, retry_count=0]
    
    W->>A: INSERT INTO subscription_events
    A-->>W: ❌ Temporary DB connection error
    
    W->>DB: UPDATE SET status='pending', retry_count=1, error_message=...
    DB-->>W: ✅ Updated
    
    Note over W: Wait 2s, then retry
    W->>DB: SELECT pending events
    DB-->>W: [event xyz-789, retry_count=1]
    
    W->>A: INSERT INTO subscription_events
    A-->>W: ✅ Success
    
    W->>DB: UPDATE SET status='processed', processed_at=NOW()
    DB-->>W: ✅ Processed
    
    Note over W: Failure scenario after 5 retries
    W->>DB: SELECT pending events
    DB-->>W: [event abc-456, retry_count=5]
    
    W->>A: INSERT INTO subscription_events
    A-->>W: ❌ Still failing
    
    W->>DB: UPDATE SET status='failed'
    W->>DLQ: Log to monitoring system
    DLQ-->>W: Alert sent to ops team
```

---

## 5. Phase-by-Phase Implementation

### Phase 1: Schema and Infrastructure Setup

**Duration**: 3-4 days  
**Risk Level**: Low  
**Dependencies**: None

#### 5.1.1 Files to Create/Modify

| Action | File Path | Description |
|--------|-----------|-------------|
| CREATE | `migrations/0009_add_subscription_audit_outbox.sql` | Outbox table schema |
| CREATE | `server/services/infrastructure/subscription-audit-outbox.service.ts` | Outbox writer service |
| MODIFY | `shared/schema.ts` | Add outbox table definition and types |
| CREATE | `server/services/infrastructure/__tests__/subscription-audit-outbox.service.test.ts` | Unit tests for outbox service |

#### 5.1.2 Database Migration

**File**: `migrations/0009_add_subscription_audit_outbox.sql`

```sql
-- Migration: Add subscription_audit_outbox table
-- Purpose: Implement Event Outbox Pattern for reliable audit event delivery
-- Phase 1: Schema Setup

-- Status enum for outbox events
CREATE TYPE "outbox_status" AS ENUM ('pending', 'processed', 'failed');

-- Outbox table
CREATE TABLE "subscription_audit_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event payload (mirrors subscription_events structure)
  "subscription_id" uuid NOT NULL REFERENCES "user_subscriptions"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "event_type" text NOT NULL,
  "old_status" text,
  "new_status" text,
  "metadata" jsonb,
  
  -- Outbox processing metadata
  "status" outbox_status NOT NULL DEFAULT 'pending',
  "retry_count" integer NOT NULL DEFAULT 0,
  "max_retries" integer NOT NULL DEFAULT 5,
  "error_message" text,
  "processed_at" timestamp,
  
  -- Timestamps
  "created_at" timestamp NOT NULL DEFAULT NOW(),
  "updated_at" timestamp NOT NULL DEFAULT NOW()
);

-- Indexes for efficient processing
-- Priority index: Processor uses this to find pending events
CREATE INDEX "idx_outbox_pending_events" 
  ON "subscription_audit_outbox" ("status", "created_at" ASC) 
  WHERE "status" = 'pending';

-- Failed events index: For monitoring and manual retry
CREATE INDEX "idx_outbox_failed_events" 
  ON "subscription_audit_outbox" ("status", "retry_count" DESC) 
  WHERE "status" = 'failed';

-- Subscription-specific queries
CREATE INDEX "idx_outbox_subscription_id" 
  ON "subscription_audit_outbox" ("subscription_id");

-- User-specific queries
CREATE INDEX "idx_outbox_user_id" 
  ON "subscription_audit_outbox" ("user_id");

-- Audit and cleanup queries
CREATE INDEX "idx_outbox_created_at" 
  ON "subscription_audit_outbox" ("created_at" DESC);

-- Updated_at trigger for automatic timestamp management
CREATE OR REPLACE FUNCTION update_subscription_audit_outbox_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_audit_outbox_updated_at
  BEFORE UPDATE ON "subscription_audit_outbox"
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_audit_outbox_updated_at();

-- Comments for documentation
COMMENT ON TABLE "subscription_audit_outbox" IS 
  'Event Outbox Pattern: Stores audit events atomically with subscription changes. ' ||
  'Background worker processes events asynchronously to subscription_events table.';

COMMENT ON COLUMN "subscription_audit_outbox"."status" IS 
  'Processing status: pending (awaiting processing), processed (successfully written to audit), failed (exceeded retry limit)';

COMMENT ON COLUMN "subscription_audit_outbox"."retry_count" IS 
  'Number of processing attempts. Incremented on each failure.';

COMMENT ON COLUMN "subscription_audit_outbox"."max_retries" IS 
  'Maximum retry attempts before marking as failed. Default: 5';
```

**Migration Commands:**
```bash
# Generate migration
npm run db:generate
# Output: migrations/0009_add_subscription_audit_outbox.sql created

# Apply locally
npm run db:migrate
# Verify: psql $DATABASE_URL -c "\d subscription_audit_outbox"

# Commit
git add migrations/0009_add_subscription_audit_outbox.sql shared/schema.ts
git commit -m "feat: add subscription_audit_outbox table for Event Outbox Pattern"
```

#### 5.1.3 Schema Type Definitions

**File**: `shared/schema.ts` (add at end of file)

```typescript
// Outbox status enum
export const outboxStatusEnum = pgEnum("outbox_status", [
  "pending",
  "processed",
  "failed"
]);

// Subscription Audit Outbox table
export const subscriptionAuditOutbox = pgTable("subscription_audit_outbox", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Event payload
  subscriptionId: uuid("subscription_id")
    .references(() => userSubscriptions.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  eventType: text("event_type").notNull(),
  oldStatus: text("old_status"),
  newStatus: text("new_status"),
  metadata: jsonb("metadata"),
  
  // Processing metadata
  status: outboxStatusEnum("status").notNull().default("pending"),
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(5),
  errorMessage: text("error_message"),
  processedAt: timestamp("processed_at"),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Insert and select types
export const insertSubscriptionAuditOutboxSchema = createInsertSchema(subscriptionAuditOutbox)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type SubscriptionAuditOutbox = typeof subscriptionAuditOutbox.$inferSelect;
export type InsertSubscriptionAuditOutbox = z.infer<typeof insertSubscriptionAuditOutboxSchema>;
```

#### 5.1.4 Outbox Service Implementation

**File**: `server/services/infrastructure/subscription-audit-outbox.service.ts`

**Key Methods** (describe functionality, not full implementation):

1. **writeToOutbox(tx, subscriptionId, userId, eventType, oldStatus, newStatus, metadata)**
   - Purpose: Write event to outbox table INSIDE provided transaction
   - Parameters: Transaction handle `tx` (critical - uses same connection)
   - Returns: Created outbox event
   - Validation: UUID validation for subscriptionId and userId
   - Error Handling: Let transaction rollback propagate

2. **getUnprocessedEvents(limit = 10)**
   - Purpose: Fetch pending events for worker processing
   - Query: `WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?`
   - Returns: Array of pending outbox events
   - Use Case: Called by background worker every poll interval

3. **markAsProcessed(outboxId, processedAt = new Date())**
   - Purpose: Mark event as successfully processed
   - Update: `SET status = 'processed', processed_at = ?, updated_at = NOW()`
   - Use Case: Called after successful insert into subscription_events

4. **markAsFailed(outboxId, errorMessage, incrementRetryCount = true)**
   - Purpose: Mark event as failed with error details
   - Update: `SET status = 'failed', error_message = ?, retry_count = retry_count + 1`
   - Logic: If retry_count < max_retries, status remains 'pending'; else 'failed'
   - Use Case: Called when worker encounters error processing event

5. **getFailedEvents()**
   - Purpose: Retrieve events that exceeded retry limit
   - Query: `WHERE status = 'failed' ORDER BY updated_at DESC`
   - Returns: Array of failed events for manual review
   - Use Case: Monitoring dashboard, manual intervention

6. **retryFailedEvent(outboxId)**
   - Purpose: Manually reset failed event for retry
   - Update: `SET status = 'pending', retry_count = 0, error_message = NULL`
   - Use Case: Admin intervention after fixing underlying issue

#### 5.1.5 Testing Strategy

**Unit Tests** (`server/services/infrastructure/__tests__/subscription-audit-outbox.service.test.ts`):

```typescript
describe('SubscriptionAuditOutboxService', () => {
  describe('writeToOutbox', () => {
    it('should write event to outbox inside transaction', async () => {
      // Test: Verify event is created atomically
    });
    
    it('should rollback outbox event if transaction fails', async () => {
      // Test: Verify atomicity - if tx rollback, outbox entry doesn't persist
    });
    
    it('should validate UUID format for subscriptionId', async () => {
      // Test: Expect ValidationServiceError for invalid UUID
    });
  });
  
  describe('getUnprocessedEvents', () => {
    it('should return events ordered by created_at ASC', async () => {
      // Test: Verify FIFO processing order
    });
    
    it('should respect limit parameter', async () => {
      // Test: If 20 pending events, limit=10 returns 10
    });
    
    it('should only return pending events', async () => {
      // Test: Exclude processed and failed events
    });
  });
  
  describe('markAsProcessed', () => {
    it('should update status to processed with timestamp', async () => {
      // Test: Verify status change and processed_at set
    });
  });
  
  describe('markAsFailed', () => {
    it('should increment retry_count and store error message', async () => {
      // Test: Verify retry_count increments
    });
    
    it('should keep status=pending if retries remaining', async () => {
      // Test: retry_count=3, max_retries=5 → status='pending'
    });
    
    it('should set status=failed if max retries exceeded', async () => {
      // Test: retry_count=5, max_retries=5 → status='failed'
    });
  });
});
```

**Integration Tests** (in Phase 2 with payment flow):
- Test outbox write inside payment transaction
- Verify atomic commit/rollback behavior

#### 5.1.6 Rollback Plan

**If schema migration fails:**
```sql
-- Rollback script (run manually if needed)
DROP TRIGGER IF EXISTS trigger_update_subscription_audit_outbox_updated_at ON subscription_audit_outbox;
DROP FUNCTION IF EXISTS update_subscription_audit_outbox_updated_at();
DROP TABLE IF EXISTS "subscription_audit_outbox";
DROP TYPE IF EXISTS "outbox_status";
```

**If service implementation has bugs:**
- Schema remains harmless (unused table)
- No impact on production payment flow
- Fix bugs, deploy updated service in Phase 2

#### 5.1.7 Success Criteria

✅ Migration 0009 applied successfully  
✅ Table `subscription_audit_outbox` exists with correct schema  
✅ All indexes created  
✅ Unit tests pass (100% coverage for outbox service)  
✅ No impact on existing payment flow (table unused at this stage)

#### 5.1.8 Estimated Timeline

- Day 1: Schema design, migration creation, code review
- Day 2: Service implementation, unit tests
- Day 3: Code review, documentation updates
- Day 4: Deploy to staging, validate schema, merge to main

---

### Phase 2: Outbox Integration in Payment Flow

**Duration**: 4-5 days  
**Risk Level**: Medium-High (modifies critical payment path)  
**Dependencies**: Phase 1 complete

#### 5.2.1 Files to Modify

| Action | File Path | Description |
|--------|-----------|-------------|
| MODIFY | `server/services/domain/payment-transaction.service.ts` | Replace audit logging with outbox writes |
| CREATE | `server/services/domain/__tests__/payment-transaction-outbox.test.ts` | Integration tests for outbox payment flow |
| MODIFY | `server/services/infrastructure/subscription-audit.service.ts` | Add backward compatibility note |

#### 5.2.2 Code Changes

**File**: `server/services/domain/payment-transaction.service.ts`

**Lines 1-10: Add import**
```typescript
import { subscriptionAuditOutboxService } from '../infrastructure/subscription-audit-outbox.service';
```

**Lines 194-210: Replace subscription_upgraded logging**

**BEFORE (Current):**
```typescript
// Log subscription upgrade event
await subscriptionAuditService.logEvent(
  updatedSubscription.id,
  userId,
  'subscription_upgraded',
  currentPlan.name,
  targetPlan.name,
  {
    oldPlanId: currentPlan.id,
    newPlanId: targetPlan.id,
    oldTierLevel: currentPlan.tierLevel,
    newTierLevel: targetPlan.tierLevel,
    orderId,
    paymentId,
    amountPaid,
    currency,
  }
);
```

**AFTER (Outbox Pattern):**
```typescript
// Write upgrade event to outbox (processed asynchronously by worker)
await subscriptionAuditOutboxService.writeToOutbox(
  tx,  // ✅ CRITICAL: Use transaction handle, not global db
  updatedSubscription.id,
  userId,
  'subscription_upgraded',
  currentPlan.name,
  targetPlan.name,
  {
    oldPlanId: currentPlan.id,
    newPlanId: targetPlan.id,
    oldTierLevel: currentPlan.tierLevel,
    newTierLevel: targetPlan.tierLevel,
    orderId,
    paymentId,
    amountPaid,
    currency,
  }
);
```

**Lines 247-263: Replace subscription_created logging**

**BEFORE (Current):**
```typescript
// Log subscription creation event
await subscriptionAuditService.logEvent(
  newSubscription.id,
  userId,
  'subscription_created',
  undefined,
  'active',
  {
    planId: targetPlan.id,
    planName: targetPlan.name,
    tierLevel: targetPlan.tierLevel,
    orderId,
    paymentId,
    amountPaid,
    currency,
    isLifetime: true,
  }
);
```

**AFTER (Outbox Pattern):**
```typescript
// Write creation event to outbox (processed asynchronously by worker)
await subscriptionAuditOutboxService.writeToOutbox(
  tx,  // ✅ CRITICAL: Use transaction handle, not global db
  newSubscription.id,
  userId,
  'subscription_created',
  undefined,
  'active',
  {
    planId: targetPlan.id,
    planName: targetPlan.name,
    tierLevel: targetPlan.tierLevel,
    orderId,
    paymentId,
    amountPaid,
    currency,
    isLifetime: true,
  }
);
```

**Key Implementation Notes:**
1. **Transaction Handle**: Pass `tx` parameter to `writeToOutbox()` - this ensures outbox write uses the same transaction connection
2. **Error Handling**: No try-catch needed - let transaction rollback propagate
3. **Backwards Compatibility**: Keep `subscriptionAuditService` unchanged for now (used by worker in Phase 3)
4. **Logging**: Add Winston logs before/after outbox write for debugging

#### 5.2.3 Testing Strategy

**Integration Tests** (`server/services/domain/__tests__/payment-transaction-outbox.test.ts`):

```typescript
describe('PaymentTransactionService - Outbox Integration', () => {
  describe('createSubscriptionWithLock - New Subscription', () => {
    it('should write to outbox and commit atomically', async () => {
      // Arrange: Create user, plan
      // Act: Call createSubscriptionWithLock
      // Assert: 
      //   1. Subscription created in user_subscriptions
      //   2. Outbox event created in subscription_audit_outbox
      //   3. Both rows committed (queryable outside transaction)
    });
    
    it('should rollback both subscription and outbox on error', async () => {
      // Arrange: Mock failure (e.g., invalid planId)
      // Act: Call createSubscriptionWithLock
      // Assert:
      //   1. Expect error thrown
      //   2. Subscription NOT in user_subscriptions
      //   3. Outbox event NOT in subscription_audit_outbox
    });
    
    it('should handle concurrent payments with SERIALIZABLE isolation', async () => {
      // Arrange: Two concurrent createSubscriptionWithLock calls
      // Act: Execute concurrently with Promise.all
      // Assert:
      //   1. One succeeds, one fails with serialization error
      //   2. Only one subscription created
      //   3. Only one outbox event created
      //   4. Retry logic handles serialization failure gracefully
    });
  });
  
  describe('createSubscriptionWithLock - Upgrade', () => {
    it('should write upgrade event to outbox atomically', async () => {
      // Arrange: User with existing active subscription
      // Act: Call createSubscriptionWithLock with higher-tier plan
      // Assert:
      //   1. Subscription updated in user_subscriptions
      //   2. Outbox event created with event_type='subscription_upgraded'
      //   3. metadata contains oldPlanId and newPlanId
    });
  });
  
  describe('Foreign Key Constraint - Fixed', () => {
    it('should NOT throw FK constraint violation', async () => {
      // Arrange: User, plan
      // Act: Call createSubscriptionWithLock
      // Assert:
      //   1. No FK constraint error thrown (this was the bug)
      //   2. Outbox event references subscription_id correctly
    });
  });
});
```

**Manual Testing Checklist:**
- [ ] Test new subscription creation (Free → Premium)
- [ ] Test subscription upgrade (Premium → Elite)
- [ ] Test idempotency (same orderId processed twice)
- [ ] Test concurrent payments (simulate race condition)
- [ ] Test transaction rollback (force error after subscription creation)
- [ ] Verify outbox events created for all scenarios
- [ ] Verify no FK constraint violations

#### 5.2.4 Rollback Plan

**If deployment causes issues:**

**Option 1: Revert code (safest)**
```bash
# Revert payment-transaction.service.ts to previous version
git revert <commit-hash>
git push
```

**Option 2: Feature flag (if implemented)**
```typescript
// In payment-transaction.service.ts
if (config.features.USE_AUDIT_OUTBOX) {
  await subscriptionAuditOutboxService.writeToOutbox(tx, ...);
} else {
  await subscriptionAuditService.logEvent(...);  // Old behavior
}
```

**Rollback procedure:**
1. Monitor error rates for 1 hour post-deployment
2. If error rate > 5%, immediately rollback
3. Investigate root cause (likely transaction handling issue)
4. Fix, test thoroughly in staging, re-deploy

#### 5.2.5 Success Criteria

✅ Integration tests pass (100% coverage)  
✅ Manual testing checklist complete  
✅ Payment verification success rate: 100% (0% FK constraint errors)  
✅ Outbox events created for every subscription change  
✅ No regression in payment processing latency (<100ms increase acceptable)  
✅ Staging environment validated for 24 hours without errors

#### 5.2.6 Estimated Timeline

- Day 1: Code changes in payment-transaction.service.ts
- Day 2: Integration tests, unit test updates
- Day 3: Code review, peer testing
- Day 4: Deploy to staging, monitor for 24 hours
- Day 5: Production deployment (gradual rollout if using feature flags)

---

### Phase 3: Worker Development and Deployment

**Duration**: 5-6 days  
**Risk Level**: Medium  
**Dependencies**: Phase 2 complete

#### 5.3.1 Files to Create/Modify

| Action | File Path | Description |
|--------|-----------|-------------|
| CREATE | `server/services/infrastructure/subscription-audit-outbox-processor.ts` | Background worker |
| CREATE | `server/services/infrastructure/__tests__/subscription-audit-outbox-processor.test.ts` | Worker unit tests |
| MODIFY | `server/index.ts` | Initialize and start worker |
| CREATE | `server/config/outbox-processor.config.ts` | Worker configuration |

#### 5.3.2 Worker Architecture

**File**: `server/services/infrastructure/subscription-audit-outbox-processor.ts`

**Class Structure:**
```typescript
export class SubscriptionAuditOutboxProcessor {
  private processingInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private isProcessing: boolean = false;
  
  // Configuration
  private readonly POLL_INTERVAL_MS: number;
  private readonly BATCH_SIZE: number;
  private readonly MAX_RETRIES: number;
  private readonly INITIAL_BACKOFF_MS: number;
  
  constructor(config?: OutboxProcessorConfig) {
    this.POLL_INTERVAL_MS = config?.pollIntervalMs || 2000;
    this.BATCH_SIZE = config?.batchSize || 10;
    this.MAX_RETRIES = config?.maxRetries || 5;
    this.INITIAL_BACKOFF_MS = config?.initialBackoffMs || 1000;
  }
  
  start(): void;
  stop(): void;
  processOutboxEvents(): Promise<void>;
  private processEvent(outboxEvent: SubscriptionAuditOutbox): Promise<void>;
  private handleEventSuccess(outboxEvent: SubscriptionAuditOutbox): Promise<void>;
  private handleEventFailure(outboxEvent: SubscriptionAuditOutbox, error: any): Promise<void>;
  private shouldRetry(retryCount: number): boolean;
  private calculateBackoffDelay(retryCount: number): number;
  getStats(): { isRunning: boolean; isProcessing: boolean };
}
```

**Key Methods (Implementation Details):**

1. **start()**
   ```typescript
   Purpose: Start background polling
   Logic:
     - Check if already running, return early if true
     - Set isRunning = true
     - Setup setInterval with POLL_INTERVAL_MS
     - Log startup
   ```

2. **stop()**
   ```typescript
   Purpose: Gracefully stop worker
   Logic:
     - Clear interval timer
     - Wait for current batch to complete (check isProcessing flag)
     - Set isRunning = false
     - Log shutdown
   ```

3. **processOutboxEvents()**
   ```typescript
   Purpose: Main processing loop
   Logic:
     - If isProcessing, skip (prevent overlapping executions)
     - Set isProcessing = true
     - Fetch pending events (limit = BATCH_SIZE)
     - Process each event sequentially (for-of loop)
     - Log batch statistics (processed count, failed count)
     - Set isProcessing = false
   Error Handling:
     - Catch and log any unexpected errors
     - Always set isProcessing = false in finally block
   ```

4. **processEvent(outboxEvent)**
   ```typescript
   Purpose: Process single outbox event
   Logic:
     - Insert into subscription_events table
     - Call handleEventSuccess on success
     - Call handleEventFailure on error
   Details:
     - Use subscriptionAuditService.logEvent() to write to audit table
     - This reuses existing audit service (no duplication)
   ```

5. **handleEventSuccess(outboxEvent)**
   ```typescript
   Purpose: Mark event as processed
   Logic:
     - Call outboxService.markAsProcessed(outboxEvent.id)
     - Log success
   ```

6. **handleEventFailure(outboxEvent, error)**
   ```typescript
   Purpose: Handle processing failure with retry logic
   Logic:
     - Increment retry count
     - If retry_count < max_retries:
         - Calculate backoff delay (exponential: 1s, 2s, 4s, 8s, 16s)
         - Mark as pending (will retry on next poll)
     - Else:
         - Mark as failed (exceeds retry limit)
         - Log to dead letter queue (monitoring alert)
     - Store error message in outbox record
   ```

7. **calculateBackoffDelay(retryCount)**
   ```typescript
   Purpose: Exponential backoff calculation
   Formula: INITIAL_BACKOFF_MS * 2^(retryCount - 1)
   Examples:
     - retry 1: 1000ms * 2^0 = 1s
     - retry 2: 1000ms * 2^1 = 2s
     - retry 3: 1000ms * 2^2 = 4s
     - retry 4: 1000ms * 2^3 = 8s
     - retry 5: 1000ms * 2^4 = 16s
   Note: Delay is informational (logged); actual retry happens on next poll
   ```

#### 5.3.3 Configuration

**File**: `server/config/outbox-processor.config.ts`

```typescript
export interface OutboxProcessorConfig {
  pollIntervalMs: number;     // How often to poll for events
  batchSize: number;          // Max events to process per poll
  maxRetries: number;         // Max retry attempts before marking failed
  initialBackoffMs: number;   // Initial backoff delay (doubles each retry)
  enabled: boolean;           // Master kill switch
}

export const outboxProcessorConfig: OutboxProcessorConfig = {
  pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '2000'),
  batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '10'),
  maxRetries: parseInt(process.env.OUTBOX_MAX_RETRIES || '5'),
  initialBackoffMs: parseInt(process.env.OUTBOX_INITIAL_BACKOFF_MS || '1000'),
  enabled: process.env.OUTBOX_PROCESSOR_ENABLED !== 'false',  // Enabled by default
};
```

**Environment Variables:**
```bash
# .env
OUTBOX_POLL_INTERVAL_MS=2000       # 2 seconds (matches messageQueue)
OUTBOX_BATCH_SIZE=10               # Process 10 events per poll
OUTBOX_MAX_RETRIES=5               # 5 retries before DLQ
OUTBOX_INITIAL_BACKOFF_MS=1000     # 1 second initial backoff
OUTBOX_PROCESSOR_ENABLED=true      # Master switch
```

#### 5.3.4 Integration in Server Startup

**File**: `server/index.ts`

**Lines to add (after paymentAlertsScheduler initialization):**

```typescript
import { subscriptionAuditOutboxProcessor } from './services/infrastructure/subscription-audit-outbox-processor';
import { outboxProcessorConfig } from './config/outbox-processor.config';

// ... existing code ...

// Start background workers
if (outboxProcessorConfig.enabled) {
  logger.info('Starting Subscription Audit Outbox Processor', {
    pollIntervalMs: outboxProcessorConfig.pollIntervalMs,
    batchSize: outboxProcessorConfig.batchSize,
    maxRetries: outboxProcessorConfig.maxRetries,
  });
  
  subscriptionAuditOutboxProcessor.start();
  
  logger.info('Subscription Audit Outbox Processor started successfully');
} else {
  logger.warn('Subscription Audit Outbox Processor is DISABLED');
}

// Graceful shutdown handler
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  subscriptionAuditOutboxProcessor.stop();
  paymentAlertsScheduler.stop();
  
  // ... existing cleanup ...
});
```

#### 5.3.5 Testing Strategy

**Unit Tests** (`server/services/infrastructure/__tests__/subscription-audit-outbox-processor.test.ts`):

```typescript
describe('SubscriptionAuditOutboxProcessor', () => {
  describe('start/stop', () => {
    it('should start and stop processor', async () => {
      // Test: Verify isRunning flag
    });
    
    it('should prevent multiple starts', () => {
      // Test: Call start() twice, verify only one interval created
    });
  });
  
  describe('processOutboxEvents', () => {
    it('should process pending events in batch', async () => {
      // Arrange: Create 15 pending outbox events
      // Act: Call processOutboxEvents (batch size 10)
      // Assert: 10 events processed, 5 remain pending
    });
    
    it('should skip processing if already processing', async () => {
      // Test: Verify isProcessing flag prevents concurrent executions
    });
  });
  
  describe('processEvent', () => {
    it('should insert event into subscription_events table', async () => {
      // Arrange: Pending outbox event
      // Act: processEvent()
      // Assert: Row exists in subscription_events with correct data
    });
    
    it('should mark event as processed on success', async () => {
      // Assert: outbox status = 'processed', processed_at set
    });
  });
  
  describe('handleEventFailure - Retry Logic', () => {
    it('should increment retry count on failure', async () => {
      // Test: Verify retry_count increments
    });
    
    it('should keep status=pending for retries', async () => {
      // Test: retry_count=3 → status='pending'
    });
    
    it('should mark as failed after max retries', async () => {
      // Test: retry_count=5 → status='failed'
    });
    
    it('should calculate exponential backoff correctly', () => {
      // Test: retry 1→1s, retry 2→2s, retry 3→4s, retry 4→8s, retry 5→16s
    });
  });
  
  describe('Dead Letter Queue', () => {
    it('should log failed events for monitoring', async () => {
      // Test: Verify winston logger called with failed event details
    });
  });
});
```

**Integration Tests**:
```typescript
describe('Outbox Processor - End-to-End', () => {
  it('should process events written by payment flow', async () => {
    // Arrange: Create payment, trigger createSubscriptionWithLock
    // Act: Wait for worker to poll and process (2-4 seconds)
    // Assert: Event in subscription_events table
  });
  
  it('should handle transient failures with retry', async () => {
    // Arrange: Mock DB connection failure (disconnect DB briefly)
    // Act: Create outbox event, worker attempts processing
    // Assert: Retry count incremented, eventually processes after DB reconnect
  });
  
  it('should handle permanent failures with DLQ', async () => {
    // Arrange: Create malformed outbox event (invalid JSON metadata)
    // Act: Worker attempts processing 5 times
    // Assert: Marked as failed, logged to DLQ
  });
});
```

**Load Testing**:
```typescript
describe('Outbox Processor - Load Test', () => {
  it('should handle 100 concurrent outbox events', async () => {
    // Arrange: Create 100 pending events
    // Act: Start processor, measure processing time
    // Assert: All events processed within 30 seconds (10 per 2s = 20s + buffer)
  });
  
  it('should not degrade payment flow performance', async () => {
    // Arrange: Trigger 50 concurrent payments
    // Act: Measure payment latency
    // Assert: P99 latency < 500ms (acceptable with outbox write overhead)
  });
});
```

#### 5.3.6 Monitoring and Alerting

**Metrics to Track:**
```typescript
// Add to worker processor
class SubscriptionAuditOutboxProcessor {
  private metrics = {
    eventsProcessed: 0,
    eventsFailed: 0,
    eventsInDLQ: 0,
    avgProcessingTimeMs: 0,
    lastPollTimestamp: null as Date | null,
  };
  
  getMetrics() {
    return this.metrics;
  }
}

// Expose via endpoint: GET /api/system/metrics
// Response:
{
  "outboxProcessor": {
    "isRunning": true,
    "isProcessing": false,
    "eventsProcessed": 1523,
    "eventsFailed": 12,
    "eventsInDLQ": 3,
    "avgProcessingTimeMs": 45,
    "lastPollTimestamp": "2025-11-06T14:32:00Z"
  }
}
```

**Alerts to Configure:**
1. **DLQ Alert**: If eventsInDLQ > 5, page ops team
2. **Processing Lag**: If oldest pending event > 5 minutes old, alert
3. **Worker Health**: If lastPollTimestamp > 1 minute ago, worker may be stuck
4. **Failure Rate**: If eventsFailed / eventsProcessed > 5%, investigate

#### 5.3.7 Rollback Plan

**If worker causes issues:**

**Option 1: Disable worker (safest)**
```bash
# Set environment variable
export OUTBOX_PROCESSOR_ENABLED=false

# Restart server
pm2 restart all
```

**Option 2: Revert code**
```bash
git revert <commit-hash>
git push
```

**Impact of rollback:**
- Outbox events accumulate in database (not processed)
- No audit events written to subscription_events table
- Subscription creation still succeeds (payment flow unaffected)
- After fixing issue, restart worker → events process retroactively

#### 5.3.8 Success Criteria

✅ Worker starts successfully on server boot  
✅ Processes outbox events within 2-10 seconds of creation  
✅ Unit tests pass (100% coverage)  
✅ Integration tests pass (end-to-end flow validated)  
✅ Load test: Handles 100 events with <1 minute processing time  
✅ Monitoring metrics exposed via /api/system/metrics  
✅ Failed events logged with detailed error messages  
✅ Graceful shutdown on SIGTERM (no events lost)

#### 5.3.9 Estimated Timeline

- Day 1: Worker implementation (basic polling logic)
- Day 2: Retry logic, error handling, DLQ
- Day 3: Unit tests, configuration
- Day 4: Integration tests, load tests
- Day 5: Monitoring metrics, dashboard setup
- Day 6: Deploy to staging, validate for 24 hours

---

### Phase 4: Monitoring and Optimization

**Duration**: 3-4 days  
**Risk Level**: Low  
**Dependencies**: Phase 3 complete

#### 5.4.1 Observability Enhancements

**Logging Standards:**

```typescript
// In subscription-audit-outbox-processor.ts

// Startup logging
logger.info('Subscription Audit Outbox Processor started', {
  component: 'OutboxProcessor',
  pollIntervalMs: config.pollIntervalMs,
  batchSize: config.batchSize,
  maxRetries: config.maxRetries,
});

// Poll cycle logging (every 10 polls, reduce noise)
if (pollCount % 10 === 0) {
  logger.info('Outbox processor health check', {
    component: 'OutboxProcessor',
    pollCount,
    eventsProcessed: metrics.eventsProcessed,
    eventsFailed: metrics.eventsFailed,
    currentBacklog: pendingEvents.length,
  });
}

// Event processing success
logger.info('Outbox event processed successfully', {
  component: 'OutboxProcessor',
  outboxEventId: event.id,
  subscriptionId: event.subscriptionId,
  eventType: event.eventType,
  processingTimeMs: endTime - startTime,
});

// Event processing failure
logger.error('Outbox event processing failed', {
  component: 'OutboxProcessor',
  outboxEventId: event.id,
  subscriptionId: event.subscriptionId,
  eventType: event.eventType,
  retryCount: event.retryCount,
  maxRetries: event.maxRetries,
  error: error.message,
  stack: error.stack,
});

// Dead letter queue logging
logger.error('Outbox event moved to DLQ', {
  component: 'OutboxProcessor',
  outboxEventId: event.id,
  subscriptionId: event.subscriptionId,
  eventType: event.eventType,
  retryCount: event.retryCount,
  errorMessage: event.errorMessage,
  alert: 'MANUAL_INTERVENTION_REQUIRED',
});
```

#### 5.4.2 Performance Optimization

**Database Query Optimization:**

```sql
-- Ensure efficient index usage for pending events query
-- Check execution plan
EXPLAIN ANALYZE 
SELECT * FROM subscription_audit_outbox 
WHERE status = 'pending' 
ORDER BY created_at ASC 
LIMIT 10;

-- Expected: Index Scan using idx_outbox_pending_events
-- If full table scan, verify index exists:
CREATE INDEX IF NOT EXISTS "idx_outbox_pending_events" 
  ON "subscription_audit_outbox" ("status", "created_at" ASC) 
  WHERE "status" = 'pending';
```

**Batch Processing Tuning:**
- Monitor avg processing time per event
- If <50ms per event: Increase batch size to 20
- If >200ms per event: Decrease batch size to 5
- Target: Process entire backlog within 1 minute

**Connection Pooling:**
```typescript
// Verify DB connection pool size adequate
// In server/db.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // Increase if worker + payment flow saturate pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

#### 5.4.3 Admin Dashboard Enhancements

**New Admin Endpoint: GET /api/admin/outbox/stats**

```typescript
// In server/controllers/admin.controller.ts
async getOutboxStats(req: AuthenticatedRequest, res: Response) {
  try {
    const stats = await subscriptionAuditOutboxService.getStats();
    return this.sendSuccess(res, stats);
  } catch (error) {
    return this.handleError(res, error, 'AdminController.getOutboxStats');
  }
}

// Response:
{
  "pendingCount": 5,
  "processedCount": 1523,
  "failedCount": 3,
  "oldestPendingEvent": {
    "id": "abc-123",
    "createdAt": "2025-11-06T14:00:00Z",
    "ageMinutes": 32
  },
  "failedEvents": [
    {
      "id": "xyz-789",
      "subscriptionId": "sub-456",
      "eventType": "subscription_created",
      "retryCount": 5,
      "errorMessage": "Database connection timeout",
      "createdAt": "2025-11-06T12:00:00Z"
    }
  ]
}
```

**New Admin Endpoint: POST /api/admin/outbox/retry/:id**

```typescript
// Retry failed event manually
async retryOutboxEvent(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    await subscriptionAuditOutboxService.retryFailedEvent(id);
    
    logger.info('Manual retry triggered', {
      outboxEventId: id,
      triggeredBy: req.user?.id,
    });
    
    return this.sendSuccess(res, { message: 'Event queued for retry' });
  } catch (error) {
    return this.handleError(res, error, 'AdminController.retryOutboxEvent');
  }
}
```

**Frontend Admin Dashboard Component:**
- Display pending/processed/failed counts
- List failed events with error messages
- "Retry" button for manual intervention
- Real-time refresh (poll every 30s)

#### 5.4.4 Archival Strategy

**Problem**: Outbox table grows indefinitely (processed events accumulate)

**Solution**: Periodic cleanup job

```typescript
// In subscription-audit-outbox-processor.ts
private async archiveOldEvents(): Promise<void> {
  const RETENTION_DAYS = 30;  // Keep processed events for 30 days
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
  
  const deleted = await db
    .delete(subscriptionAuditOutbox)
    .where(
      and(
        eq(subscriptionAuditOutbox.status, 'processed'),
        lt(subscriptionAuditOutbox.processedAt, cutoffDate)
      )
    )
    .returning();
  
  logger.info('Archived old outbox events', {
    deletedCount: deleted.length,
    cutoffDate: cutoffDate.toISOString(),
  });
}

// Schedule archival to run daily at 2 AM
private scheduleArchival(): void {
  const now = new Date();
  const next2AM = new Date();
  next2AM.setHours(2, 0, 0, 0);
  if (now.getHours() >= 2) next2AM.setDate(next2AM.getDate() + 1);
  
  const msUntilNext2AM = next2AM.getTime() - now.getTime();
  
  setTimeout(() => {
    this.archiveOldEvents();
    setInterval(() => this.archiveOldEvents(), 24 * 60 * 60 * 1000);
  }, msUntilNext2AM);
}
```

#### 5.4.5 Capacity Planning

**Assumptions:**
- Average: 100 subscriptions/day (peak: 500/day)
- Outbox processing lag: <10 seconds
- Retention: 30 days

**Storage Calculations:**
```
Outbox table size per row: ~500 bytes (UUID + metadata)
Daily events: 100
Monthly storage: 100 events/day * 30 days * 500 bytes = 1.5 MB
Yearly storage: 1.5 MB * 12 = 18 MB

Conclusion: Negligible storage overhead
```

**Index Overhead:**
- 5 indexes * 1.5 MB = 7.5 MB per month
- Total: <30 MB per month (acceptable)

**Worker CPU Usage:**
- Poll every 2s = 43,200 polls/day
- Average 10ms per poll = 432 seconds CPU time/day
- Conclusion: Minimal CPU overhead

#### 5.4.6 Success Criteria

✅ Monitoring dashboard deployed with real-time stats  
✅ Alerting configured for DLQ, processing lag, worker health  
✅ Admin endpoints functional for manual intervention  
✅ Archival job running, deletes events older than 30 days  
✅ Performance baseline established: <100ms avg processing time per event  
✅ Capacity plan validated: Storage growth <50 MB/year  

#### 5.4.7 Estimated Timeline

- Day 1: Logging enhancements, metrics endpoint
- Day 2: Admin dashboard UI, retry endpoint
- Day 3: Archival job implementation, testing
- Day 4: Alerting configuration, runbook documentation

---

### Phase 5: Cleanup and Documentation

**Duration**: 2-3 days  
**Risk Level**: Low  
**Dependencies**: Phase 4 complete

#### 5.5.1 Code Cleanup Tasks

**1. Remove Dead Code (if applicable)**
- Keep `subscriptionAuditService` (used by worker)
- Remove any temporary debugging code
- Update comments referencing old audit logging approach

**2. Update Type Exports**
```typescript
// In shared/schema.ts
// Verify all outbox types exported correctly
export type SubscriptionAuditOutbox = typeof subscriptionAuditOutbox.$inferSelect;
export type InsertSubscriptionAuditOutbox = z.infer<typeof insertSubscriptionAuditOutboxSchema>;
```

**3. Consolidate Configuration**
```typescript
// In server/config/index.ts
export const outboxProcessorConfig = {
  enabled: process.env.OUTBOX_PROCESSOR_ENABLED !== 'false',
  pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '2000'),
  batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '10'),
  maxRetries: parseInt(process.env.OUTBOX_MAX_RETRIES || '5'),
};
```

#### 5.5.2 Documentation Updates

**1. Update REPOSITORY_ARCHITECTURE.md**

Add section:
```markdown
## Event Outbox Pattern for Audit Logging

### Problem Solved
Foreign key constraint violations when logging audit events inside SERIALIZABLE transactions.

### Solution
Event Outbox Pattern decouples audit logging from payment transactions:
1. Payment transaction writes to `subscription_audit_outbox` atomically
2. Background worker processes outbox events asynchronously
3. Guarantees eventual delivery with retry logic

### Components
- **Outbox Writer**: `subscription-audit-outbox.service.ts`
- **Outbox Processor**: `subscription-audit-outbox-processor.ts`
- **Database Table**: `subscription_audit_outbox`

### Configuration
See `server/config/outbox-processor.config.ts`
```

**2. Create Operational Runbook**

**File**: `docs/OUTBOX_PROCESSOR_RUNBOOK.md`

```markdown
# Subscription Audit Outbox Processor Runbook

## Overview
Background worker that processes subscription audit events asynchronously.

## Health Checks

### Is the worker running?
```bash
curl https://api.example.com/api/system/metrics | jq '.outboxProcessor.isRunning'
# Expected: true
```

### Check processing lag
```bash
curl https://api.example.com/api/admin/outbox/stats | jq '.oldestPendingEvent'
# Alert if ageMinutes > 5
```

## Common Issues

### Issue: Events stuck in pending
**Symptoms**: pendingCount increasing, no processing
**Diagnosis**: Worker may be stopped or crashed
**Resolution**:
1. Check server logs: `grep "OutboxProcessor" logs/combined.log`
2. Restart server: `pm2 restart all`
3. Verify worker started: Check logs for "Subscription Audit Outbox Processor started"

### Issue: High failure rate
**Symptoms**: failedCount increasing rapidly
**Diagnosis**: Database connection issues or malformed events
**Resolution**:
1. Check failed events: `GET /api/admin/outbox/stats`
2. Review error messages
3. Fix underlying issue (DB connectivity, schema mismatch, etc.)
4. Retry failed events: `POST /api/admin/outbox/retry/:id`

### Issue: DLQ alerts
**Symptoms**: Alerts for events in dead letter queue
**Diagnosis**: Permanent processing failures
**Resolution**:
1. Investigate failed event metadata
2. Determine if data corruption or code bug
3. Fix code bug if applicable
4. Manually insert into subscription_events if data valid
5. Mark outbox event as processed

## Manual Operations

### Retry all failed events
```sql
UPDATE subscription_audit_outbox 
SET status = 'pending', retry_count = 0, error_message = NULL
WHERE status = 'failed';
```

### Check outbox backlog
```sql
SELECT status, COUNT(*) FROM subscription_audit_outbox GROUP BY status;
```

### Manually process event
```sql
-- 1. Get event details
SELECT * FROM subscription_audit_outbox WHERE id = 'abc-123';

-- 2. Insert into audit table
INSERT INTO subscription_events (
  subscription_id, user_id, event_type, old_status, new_status, metadata
) VALUES (...);

-- 3. Mark outbox as processed
UPDATE subscription_audit_outbox 
SET status = 'processed', processed_at = NOW() 
WHERE id = 'abc-123';
```

## Configuration

### Environment Variables
- `OUTBOX_PROCESSOR_ENABLED`: Master switch (default: true)
- `OUTBOX_POLL_INTERVAL_MS`: Polling frequency (default: 2000)
- `OUTBOX_BATCH_SIZE`: Events per poll (default: 10)
- `OUTBOX_MAX_RETRIES`: Retry limit (default: 5)

### Tuning Recommendations
- High volume (>1000 events/day): Decrease poll interval to 1000ms
- Low volume (<100 events/day): Increase poll interval to 5000ms
- Large events (>10KB metadata): Decrease batch size to 5
```

**3. Update API Documentation**

Add endpoints to API docs:
- `GET /api/system/metrics` - System health metrics (includes outbox processor)
- `GET /api/admin/outbox/stats` - Outbox statistics and failed events
- `POST /api/admin/outbox/retry/:id` - Retry failed event

**4. Update Migration Workflow Guide**

**File**: `docs/MIGRATION_WORKFLOW.md`

Add section:
```markdown
## Outbox Pattern Migrations

### When to add outbox events
If adding a new subscription lifecycle event:
1. Add event type to outbox writer
2. Update worker processor (usually no changes needed)
3. Test end-to-end flow

### Modifying outbox schema
1. Edit `shared/schema.ts` → `subscriptionAuditOutbox` table
2. Run `npm run db:generate`
3. Review generated SQL (ensure backward compatibility)
4. Test migration in staging
5. Deploy with zero-downtime strategy
```

#### 5.5.3 Knowledge Transfer

**Team Training Sessions:**
1. **Session 1: Architecture Overview** (1 hour)
   - Event Outbox Pattern explained
   - Walk through payment flow diagrams
   - Q&A

2. **Session 2: Operational Procedures** (1 hour)
   - Demonstrate health checks
   - Simulate failure scenarios
   - Practice manual intervention
   - Q&A

3. **Session 3: Code Walkthrough** (1 hour)
   - Review outbox service implementation
   - Review worker processor implementation
   - Discuss edge cases
   - Q&A

**Handoff Checklist:**
- [ ] Development team trained on architecture
- [ ] DevOps team trained on operational procedures
- [ ] Support team trained on troubleshooting
- [ ] Runbook accessible and understood
- [ ] Monitoring dashboards bookmarked
- [ ] Alerting rules configured and tested

#### 5.5.4 Post-Deployment Review

**After 1 Week:**
- Review metrics: Processing time, failure rate, DLQ count
- Identify any performance bottlenecks
- Gather team feedback
- Document lessons learned

**After 1 Month:**
- Conduct retrospective meeting
- Update documentation based on production experience
- Optimize configuration based on actual traffic patterns
- Archive retrospective notes

#### 5.5.5 Success Criteria

✅ All documentation updated and reviewed  
✅ Runbook validated with simulated incidents  
✅ Team training completed  
✅ Knowledge transfer checklist complete  
✅ Post-deployment review scheduled  

#### 5.5.6 Estimated Timeline

- Day 1: Code cleanup, documentation updates
- Day 2: Runbook creation, API docs
- Day 3: Team training sessions, handoff

---

## 6. Technical Specifications

### 6.1 Database Schema (Complete)

```sql
-- Outbox status enum
CREATE TYPE "outbox_status" AS ENUM ('pending', 'processed', 'failed');

-- Subscription audit outbox table
CREATE TABLE "subscription_audit_outbox" (
  -- Primary key
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event payload (mirrors subscription_events)
  "subscription_id" uuid NOT NULL REFERENCES "user_subscriptions"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "event_type" text NOT NULL,
  "old_status" text,
  "new_status" text,
  "metadata" jsonb,
  
  -- Processing metadata
  "status" outbox_status NOT NULL DEFAULT 'pending',
  "retry_count" integer NOT NULL DEFAULT 0,
  "max_retries" integer NOT NULL DEFAULT 5,
  "error_message" text,
  "processed_at" timestamp,
  
  -- Timestamps
  "created_at" timestamp NOT NULL DEFAULT NOW(),
  "updated_at" timestamp NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX "idx_outbox_pending_events" 
  ON "subscription_audit_outbox" ("status", "created_at" ASC) 
  WHERE "status" = 'pending';

CREATE INDEX "idx_outbox_failed_events" 
  ON "subscription_audit_outbox" ("status", "retry_count" DESC) 
  WHERE "status" = 'failed';

CREATE INDEX "idx_outbox_subscription_id" 
  ON "subscription_audit_outbox" ("subscription_id");

CREATE INDEX "idx_outbox_user_id" 
  ON "subscription_audit_outbox" ("user_id");

CREATE INDEX "idx_outbox_created_at" 
  ON "subscription_audit_outbox" ("created_at" DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_subscription_audit_outbox_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_audit_outbox_updated_at
  BEFORE UPDATE ON "subscription_audit_outbox"
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_audit_outbox_updated_at();
```

### 6.2 Worker Configuration (Complete)

```typescript
export interface OutboxProcessorConfig {
  enabled: boolean;           // Master kill switch
  pollIntervalMs: number;     // Polling frequency (default: 2000ms)
  batchSize: number;          // Events per poll (default: 10)
  maxRetries: number;         // Retry limit (default: 5)
  initialBackoffMs: number;   // Initial backoff delay (default: 1000ms)
}

// Default configuration
export const outboxProcessorConfig: OutboxProcessorConfig = {
  enabled: process.env.OUTBOX_PROCESSOR_ENABLED !== 'false',
  pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '2000'),
  batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '10'),
  maxRetries: parseInt(process.env.OUTBOX_MAX_RETRIES || '5'),
  initialBackoffMs: parseInt(process.env.OUTBOX_INITIAL_BACKOFF_MS || '1000'),
};
```

### 6.3 Retry Strategy (Exponential Backoff)

| Retry Attempt | Backoff Delay | Total Elapsed Time |
|---------------|---------------|-------------------|
| 0 (initial)   | 0s            | 0s                |
| 1             | 1s            | 1s                |
| 2             | 2s            | 3s                |
| 3             | 4s            | 7s                |
| 4             | 8s            | 15s               |
| 5             | 16s           | 31s               |
| 6+ (DLQ)      | ∞ (failed)    | -                 |

**Formula**: `delay = INITIAL_BACKOFF_MS * 2^(retryCount - 1)`

### 6.4 Idempotency Guarantees

**Subscription Creation:**
- Payment verification checks orderId for existing subscription
- If exists, returns existing record (no duplicate)
- Outbox event only written once per orderId

**Worker Processing:**
- Each outbox event has unique `id` (PK)
- Status transitions: pending → processed (one-way)
- Processed events never reprocessed (WHERE status='pending')
- Even if worker crashes mid-processing, event retries safely

**Audit Events:**
- subscription_events table allows duplicate entries (no unique constraint)
- In rare cases (manual intervention), duplicate audit events acceptable
- Worker logic ensures single processing per outbox event

### 6.5 Performance Benchmarks

**Payment Flow Latency (P99):**
- Before outbox: 250ms
- After outbox: 300ms (+50ms overhead acceptable)

**Outbox Write Latency:**
- Average: 15ms (single INSERT within transaction)
- P99: 30ms

**Worker Processing Latency:**
- Average: 45ms per event
- Batch of 10: <1 second
- Backlog of 100: <1 minute

**Throughput:**
- Worker: 300 events/minute (10 events per 2s poll)
- Sustained: 432,000 events/day (far exceeds typical load)

---

## 7. Testing Strategy

### 7.1 Unit Tests

**Coverage Target**: 100% for outbox service and processor

**Files:**
- `server/services/infrastructure/__tests__/subscription-audit-outbox.service.test.ts`
- `server/services/infrastructure/__tests__/subscription-audit-outbox-processor.test.ts`

**Test Categories:**
1. **Outbox Writer Tests**
   - Write to outbox inside transaction
   - Rollback atomicity
   - UUID validation
   - Error handling

2. **Outbox Processor Tests**
   - Start/stop lifecycle
   - Batch processing
   - Retry logic (exponential backoff)
   - Dead letter queue
   - Idempotency

3. **Configuration Tests**
   - Environment variable parsing
   - Default values
   - Validation

### 7.2 Integration Tests

**File**: `server/tests/outbox-payment-flow.integration.test.ts`

**Scenarios:**
1. **New Subscription Flow**
   ```typescript
   it('should create subscription and outbox event atomically', async () => {
     // Act: Trigger payment verification
     // Assert: Subscription + outbox event both exist
   });
   ```

2. **Upgrade Flow**
   ```typescript
   it('should upgrade subscription and write upgrade event to outbox', async () => {
     // Arrange: User with active subscription
     // Act: Upgrade to higher tier
     // Assert: Subscription updated, outbox event created
   });
   ```

3. **Worker Processing**
   ```typescript
   it('should process outbox event within 5 seconds', async () => {
     // Arrange: Create payment, start worker
     // Act: Wait for worker to poll
     // Assert: Audit event exists in subscription_events
   });
   ```

4. **Transaction Rollback**
   ```typescript
   it('should rollback outbox event if subscription creation fails', async () => {
     // Arrange: Mock subscription insert failure
     // Act: Trigger payment verification
     // Assert: Neither subscription nor outbox event exist
   });
   ```

### 7.3 End-to-End Tests

**File**: `client/src/e2e/payment-verification.e2e.test.ts`

**User Journey:**
1. User selects Premium plan
2. Clicks "Purchase"
3. Completes Razorpay payment
4. Payment verification succeeds
5. Subscription activated
6. Audit event logged (background, async)

**Validation:**
- User sees success message
- Dashboard reflects Premium features
- Database contains subscription record
- Outbox event created
- Worker processes event (wait 5s)
- Audit event exists in subscription_events

### 7.4 Load Tests

**Tool**: Artillery or k6

**Scenario 1: Concurrent Payments**
```yaml
# artillery-config.yml
scenarios:
  - duration: 60
    arrivalRate: 10  # 10 payments/second
    
phases:
  - name: "Payment verification load"
    post:
      url: "/api/payment/verify"
      json:
        orderId: "{{ $randomString() }}"
        paymentId: "{{ $randomString() }}"
        signature: "{{ generateSignature() }}"
        planId: "premium-plan-id"
```

**Metrics to Track:**
- Payment success rate: >99%
- P99 latency: <500ms
- FK constraint violations: 0
- Outbox events created: 100% of successful payments

**Scenario 2: Worker Scalability**
```yaml
# Test worker processing capacity
scenarios:
  - duration: 300  # 5 minutes
    arrivalRate: 20  # 20 events/second
```

**Metrics to Track:**
- Outbox backlog: <100 events
- Processing lag: <10 seconds
- Worker CPU usage: <50%
- Database connection pool saturation: <80%

### 7.5 Chaos Engineering

**Scenario 1: Database Disconnect**
```typescript
it('should recover from transient database failure', async () => {
  // Arrange: Worker running, pending events in outbox
  // Act: Disconnect database for 5 seconds, reconnect
  // Assert: Worker retries, eventually processes all events
});
```

**Scenario 2: Server Crash Mid-Processing**
```typescript
it('should not lose events if server crashes', async () => {
  // Arrange: Trigger payment, outbox event created
  // Act: Simulate server crash (kill process)
  // Assert: On restart, worker processes pending event
});
```

**Scenario 3: Malformed Event Data**
```typescript
it('should handle malformed metadata gracefully', async () => {
  // Arrange: Manually insert outbox event with invalid JSON
  // Act: Worker attempts processing
  // Assert: Event marked as failed after retries, DLQ alert sent
});
```

### 7.6 Test Data Management

**Setup:**
```typescript
beforeEach(async () => {
  // Create test user
  testUser = await userRepository.create({ email: 'test@example.com', ... });
  
  // Create test plan
  testPlan = await subscriptionPlanRepository.create({ name: 'Test Plan', ... });
});

afterEach(async () => {
  // Cleanup: Delete test subscriptions, outbox events, audit events
  await cleanupTestData([testUser.id, testPlan.id]);
});
```

**Helpers:**
```typescript
async function cleanupTestData(userIds: string[]) {
  // Delete in order: audit events → outbox → subscriptions → users
  for (const userId of userIds) {
    await db.delete(subscriptionEvents).where(eq(subscriptionEvents.userId, userId));
    await db.delete(subscriptionAuditOutbox).where(eq(subscriptionAuditOutbox.userId, userId));
    await db.delete(userSubscriptions).where(eq(userSubscriptions.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }
}
```

---

## 8. Deployment Strategy

### 8.1 Zero-Downtime Deployment Approach

**Phase Deployment:**
1. **Phase 1**: Deploy schema (table creation) → No downtime
2. **Phase 2**: Deploy outbox writes in payment flow → Minimal risk (table unused)
3. **Phase 3**: Deploy worker → Start processing accumulated events
4. **Phase 4**: Deploy monitoring → Observability improvements
5. **Phase 5**: Deploy documentation → No deployment impact

**Rollback Strategy Per Phase:**
- Phase 1: Drop table (safe if unused)
- Phase 2: Revert code to old audit logging (requires code deploy)
- Phase 3: Disable worker via env var (no code deploy needed)
- Phase 4: Revert monitoring changes
- Phase 5: No rollback needed

### 8.2 Feature Flag Strategy

**Optional: Gradual Rollout**

```typescript
// In server/config/index.ts
export const featuresConfig = {
  USE_AUDIT_OUTBOX: process.env.FEATURE_USE_AUDIT_OUTBOX === 'true',
};

// In payment-transaction.service.ts
if (featuresConfig.USE_AUDIT_OUTBOX) {
  await subscriptionAuditOutboxService.writeToOutbox(tx, ...);
} else {
  // Fallback to old direct logging (will fail with FK constraint)
  await subscriptionAuditService.logEvent(...);
}
```

**Rollout Plan:**
1. Deploy code with feature flag OFF
2. Enable for 10% of users (canary)
3. Monitor for 24 hours
4. If no issues, enable for 50% of users
5. Monitor for 24 hours
6. Enable for 100% of users
7. After 1 week, remove feature flag (hardcode outbox usage)

**Monitoring During Rollout:**
- FK constraint error rate (should drop to 0% for flagged users)
- Payment success rate
- Outbox processing lag
- User-reported issues

### 8.3 Deployment Checklist

**Pre-Deployment:**
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review approved
- [ ] Staging environment validated for 24 hours
- [ ] Database migration tested in staging
- [ ] Rollback plan documented and understood
- [ ] Team notified of deployment window
- [ ] Monitoring dashboards prepared

**During Deployment:**
- [ ] Apply database migration (Phase 1)
  ```bash
  npm run db:migrate:prod
  ```
- [ ] Deploy application code (Phase 2)
  ```bash
  git push origin main  # Trigger CI/CD
  ```
- [ ] Verify worker started (Phase 3)
  ```bash
  curl https://api.example.com/api/system/metrics | jq '.outboxProcessor.isRunning'
  ```
- [ ] Monitor error rates (15 minutes post-deploy)
- [ ] Check outbox processing lag
- [ ] Verify audit events being created

**Post-Deployment:**
- [ ] Monitor for 1 hour continuously
- [ ] Review logs for errors
- [ ] Check DLQ for failed events
- [ ] Validate payment success rate
- [ ] Update team on deployment status
- [ ] Schedule post-deployment review (1 week)

### 8.4 Rollback Triggers

**Immediate Rollback if:**
- Payment success rate drops below 95%
- FK constraint error rate increases (should be 0%)
- Server error rate >1%
- Database connection pool saturation >90%
- Worker crashes repeatedly (>3 times in 10 minutes)

**Investigate (No Immediate Rollback) if:**
- Outbox processing lag >1 minute (check worker health)
- DLQ count increases (review failed events)
- Slow payment latency (<500ms acceptable)

### 8.5 Monitoring During Rollout

**Key Metrics Dashboard:**
```
Payment Success Rate:        ████████████████████ 100%
FK Constraint Errors:        ░░░░░░░░░░░░░░░░░░░░   0%
Outbox Processing Lag:       ▓▓░░░░░░░░░░░░░░░░░░   5s
Worker Status:               ✅ Running
DLQ Count:                   0 events
Average Payment Latency:     ▓▓▓▓░░░░░░░░░░░░░░░░ 320ms
```

**Alerts:**
- 🔴 CRITICAL: Payment success rate <95%
- 🔴 CRITICAL: FK constraint errors detected
- 🟡 WARNING: Outbox lag >30 seconds
- 🟡 WARNING: DLQ count >5
- 🟢 INFO: Worker restarted

### 8.6 Production Validation

**Post-Deployment Tests:**

1. **Smoke Test: New Subscription**
   ```bash
   # Trigger test payment
   curl -X POST https://api.example.com/api/payment/verify \
     -H "Authorization: Bearer $TEST_TOKEN" \
     -d '{"orderId": "...", "paymentId": "...", "signature": "...", "planId": "..."}'
   
   # Verify subscription created
   # Verify outbox event created
   # Wait 5 seconds, verify audit event created
   ```

2. **Smoke Test: Subscription Upgrade**
   ```bash
   # User with Premium plan upgrades to Elite
   # Verify upgrade successful
   # Verify outbox event with event_type='subscription_upgraded'
   ```

3. **Worker Health Check**
   ```bash
   curl https://api.example.com/api/system/metrics | jq '.outboxProcessor'
   # Verify isRunning=true, lastPollTimestamp recent
   ```

---

## 9. Monitoring and Observability

### 9.1 Metrics to Track

**Application Metrics:**
| Metric | Type | Purpose | Alert Threshold |
|--------|------|---------|-----------------|
| `outbox.events.pending` | Gauge | Current backlog | >100 events |
| `outbox.events.processed.total` | Counter | Total processed | - |
| `outbox.events.failed.total` | Counter | Total failures | >10/hour |
| `outbox.events.dlq.count` | Gauge | Dead letter queue | >5 events |
| `outbox.processing.latency.avg` | Histogram | Avg processing time | >100ms |
| `outbox.processing.latency.p99` | Histogram | P99 processing time | >500ms |
| `outbox.worker.poll.count` | Counter | Total polls | - |
| `outbox.worker.health.last_poll` | Timestamp | Worker liveness | >2 minutes ago |
| `payment.success.rate` | Gauge | Payment success % | <95% |
| `payment.fk_constraint_errors` | Counter | FK violations | >0 |

**Database Metrics:**
| Metric | Query | Purpose |
|--------|-------|---------|
| Pending events | `SELECT COUNT(*) FROM subscription_audit_outbox WHERE status='pending'` | Backlog size |
| Failed events | `SELECT COUNT(*) FROM subscription_audit_outbox WHERE status='failed'` | DLQ size |
| Oldest pending | `SELECT MIN(created_at) FROM subscription_audit_outbox WHERE status='pending'` | Processing lag |

### 9.2 Logging Standards

**Structured Logging Format (JSON):**
```json
{
  "timestamp": "2025-11-06T14:32:00.123Z",
  "level": "info",
  "component": "OutboxProcessor",
  "message": "Outbox event processed successfully",
  "context": {
    "outboxEventId": "abc-123-def-456",
    "subscriptionId": "sub-789",
    "eventType": "subscription_created",
    "processingTimeMs": 45,
    "retryCount": 0
  }
}
```

**Log Levels:**
- **DEBUG**: Poll cycles, batch iterations (disabled in production)
- **INFO**: Event processed, worker started/stopped, health checks
- **WARN**: Retries, high backlog, slow processing
- **ERROR**: Processing failures, worker crashes, DLQ events

### 9.3 Alerting Rules

**Critical Alerts (Page Ops):**
```yaml
- alert: PaymentSuccessRateLow
  expr: payment_success_rate < 0.95
  for: 5m
  severity: critical
  message: "Payment success rate dropped to {{ $value }}%"

- alert: OutboxProcessorDown
  expr: (now() - outbox_worker_last_poll_timestamp) > 120
  for: 2m
  severity: critical
  message: "Outbox processor hasn't polled in {{ $value }} seconds"

- alert: ForeignKeyConstraintErrors
  expr: rate(payment_fk_constraint_errors[5m]) > 0
  for: 1m
  severity: critical
  message: "FK constraint errors detected: {{ $value }} errors/min"
```

**Warning Alerts (Slack Notification):**
```yaml
- alert: OutboxProcessingLag
  expr: outbox_oldest_pending_event_age_seconds > 300
  for: 5m
  severity: warning
  message: "Outbox processing lag: oldest event is {{ $value }}s old"

- alert: DeadLetterQueueGrowing
  expr: outbox_events_dlq_count > 5
  for: 10m
  severity: warning
  message: "DLQ has {{ $value }} failed events requiring manual intervention"

- alert: HighOutboxFailureRate
  expr: rate(outbox_events_failed_total[10m]) / rate(outbox_events_processed_total[10m]) > 0.05
  for: 5m
  severity: warning
  message: "Outbox failure rate: {{ $value }}%"
```

### 9.4 Dashboard Layout

**Grafana Dashboard: Subscription Audit Outbox**

**Row 1: Overview**
- Payment Success Rate (gauge, 0-100%)
- Outbox Pending Events (gauge, current count)
- DLQ Count (gauge, current count)
- Worker Status (boolean, running/stopped)

**Row 2: Processing Metrics**
- Events Processed (counter, rate per minute)
- Events Failed (counter, rate per minute)
- Processing Latency (histogram, avg/p99)
- Processing Lag (time series, oldest pending event age)

**Row 3: Worker Health**
- Poll Count (counter, rate per minute)
- Last Poll Timestamp (timestamp, seconds ago)
- Batch Size (histogram, events per poll)
- Worker Restarts (counter, total restarts)

**Row 4: Historical Trends**
- Events Processed (time series, 24 hours)
- Failure Rate (time series, 24 hours)
- Backlog Size (time series, 24 hours)
- Payment Success Rate (time series, 24 hours)

### 9.5 Log Aggregation

**Winston Log Rotation:**
```typescript
// In server/utils/logger-config.ts
transports: [
  new winston.transports.DailyRotateFile({
    filename: 'logs/outbox-processor-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '30d',  // Keep 30 days of logs
    maxSize: '100m',  // Rotate when file size exceeds 100MB
  }),
]
```

**Log Queries (via Grafana Loki or similar):**
```logql
# All outbox processor events
{component="OutboxProcessor"}

# Failed events
{component="OutboxProcessor",level="error"}

# DLQ events
{component="OutboxProcessor"} |= "moved to DLQ"

# Specific subscription
{component="OutboxProcessor"} |= "subscriptionId: abc-123"
```

---

## 10. Risk Assessment

### 10.1 Identified Risks

| Risk | Probability | Impact | Severity | Mitigation |
|------|-------------|--------|----------|------------|
| **Worker crashes repeatedly** | Medium | High | 🟡 Medium | Auto-restart (PM2), alerting, rollback plan |
| **Database migration fails** | Low | High | 🟡 Medium | Test in staging, have rollback SQL ready |
| **Outbox table grows too large** | Low | Medium | 🟢 Low | Archival job (Phase 4), monitoring |
| **FK constraint errors persist** | Low | Critical | 🔴 High | Thorough testing (Phase 2), gradual rollout |
| **Performance degradation** | Medium | Medium | 🟡 Medium | Load testing, monitoring, tuning |
| **Worker processing lag** | Medium | Low | 🟢 Low | Alerting, scaling (increase batch size/frequency) |
| **Dead letter queue accumulation** | Medium | Medium | 🟡 Medium | Monitoring, manual intervention runbook |
| **Code bugs in worker** | Medium | Medium | 🟡 Medium | Unit tests (100% coverage), integration tests |
| **Deployment issues** | Low | High | 🟡 Medium | Gradual rollout, feature flags, rollback plan |
| **Data loss during crash** | Low | Critical | 🟡 Medium | Atomic transactions, idempotency, testing |

### 10.2 Risk Mitigation Strategies

**1. Worker Crashes**
- **Prevention**: Thorough error handling in worker, catch all exceptions
- **Detection**: Health check alerts (last poll timestamp)
- **Recovery**: Auto-restart via PM2 (`pm2 start server/index.js --restart 5`)
- **Fallback**: Manual restart, disable worker if persistent issues

**2. Database Migration Failure**
- **Prevention**: Test in staging with production-like data
- **Detection**: Migration script exit codes, error logs
- **Recovery**: Rollback SQL script (documented in Phase 1)
- **Fallback**: Manual database intervention

**3. Outbox Table Growth**
- **Prevention**: Archival job (Phase 4), deletes processed events >30 days old
- **Detection**: Monitor table size: `SELECT pg_size_pretty(pg_total_relation_size('subscription_audit_outbox'))`
- **Recovery**: Manual cleanup if archival job fails
- **Fallback**: Increase archival frequency or decrease retention period

**4. FK Constraint Errors Persist**
- **Prevention**: Extensive testing (unit, integration, e2e)
- **Detection**: Monitor FK constraint error metric
- **Recovery**: Immediate rollback if errors detected
- **Fallback**: Investigate root cause, fix, re-deploy

**5. Performance Degradation**
- **Prevention**: Load testing (Phase 7.4), performance benchmarks
- **Detection**: Monitor payment latency, database query times
- **Recovery**: Optimize queries, increase database connection pool size
- **Fallback**: Rollback if latency unacceptable

**6. Worker Processing Lag**
- **Prevention**: Right-sized batch size and poll interval
- **Detection**: Monitor oldest pending event age
- **Recovery**: Decrease poll interval, increase batch size
- **Fallback**: Horizontal scaling (multiple worker instances)

**7. Dead Letter Queue Accumulation**
- **Prevention**: Robust error handling, validate event data
- **Detection**: DLQ count alert (>5 events)
- **Recovery**: Manual investigation, fix underlying issue, retry events
- **Fallback**: Log for post-mortem, continue processing other events

**8. Code Bugs in Worker**
- **Prevention**: Unit tests (100% coverage), code review
- **Detection**: Error logs, failed event count
- **Recovery**: Fix bug, deploy updated code, retry failed events
- **Fallback**: Disable worker, manually process events via SQL

**9. Deployment Issues**
- **Prevention**: Gradual rollout, feature flags, staging validation
- **Detection**: Monitor error rates, payment success rate
- **Recovery**: Rollback deployment (documented in Phase 8)
- **Fallback**: Hotfix deployment if rollback not possible

**10. Data Loss During Crash**
- **Prevention**: Atomic transactions, idempotency guarantees
- **Detection**: Audit event count vs. subscription count mismatch
- **Recovery**: Reprocess pending outbox events on restart
- **Fallback**: Manual audit event creation via SQL

### 10.3 Disaster Recovery Scenarios

**Scenario 1: Complete Worker Failure**
```
Symptoms: Worker not polling, backlog growing
Impact: Audit events not logged (subscription creation still works)
Recovery:
  1. Investigate logs: grep "OutboxProcessor" logs/error.log
  2. Identify root cause (database connectivity, code bug, resource exhaustion)
  3. Fix issue (restart, deploy hotfix, scale resources)
  4. Verify worker resumed processing
  5. Monitor backlog decrease
Recovery Time: 15-30 minutes
Data Loss: None (events persisted in outbox)
```

**Scenario 2: Database Corruption**
```
Symptoms: Worker unable to read/write outbox table
Impact: Payment flow fails if outbox writes fail
Recovery:
  1. Identify corrupted table: SELECT * FROM subscription_audit_outbox LIMIT 1;
  2. Restore from backup (if available)
  3. OR rebuild outbox table from audit events (reverse sync)
  4. Restart worker
Recovery Time: 1-2 hours
Data Loss: Potential loss of unprocessed outbox events if backup stale
```

**Scenario 3: Massive DLQ Accumulation**
```
Symptoms: 100+ events in DLQ, all failing with same error
Impact: Audit trail incomplete for recent subscriptions
Recovery:
  1. Analyze common error pattern
  2. Fix underlying issue (e.g., schema mismatch, corrupted metadata)
  3. Bulk retry failed events: UPDATE subscription_audit_outbox SET status='pending', retry_count=0 WHERE status='failed';
  4. Monitor processing
Recovery Time: 1-4 hours
Data Loss: None (events retried)
```

---

## 11. Timeline and Resources

### 11.1 Phase Timeline

| Phase | Duration | Start Date | End Date | Owner |
|-------|----------|------------|----------|-------|
| **Phase 1: Schema Setup** | 3-4 days | Day 1 | Day 4 | Backend Engineer |
| **Phase 2: Outbox Integration** | 4-5 days | Day 5 | Day 9 | Backend Lead |
| **Phase 3: Worker Development** | 5-6 days | Day 10 | Day 15 | Backend Engineer |
| **Phase 4: Monitoring** | 3-4 days | Day 16 | Day 19 | DevOps Engineer |
| **Phase 5: Documentation** | 2-3 days | Day 20 | Day 22 | Tech Writer / Backend Lead |
| **Contingency** | 3 days | Day 23 | Day 25 | - |
| **Total** | **20-25 days** | - | - | - |

### 11.2 Resource Allocation

**Team Composition:**
- **Backend Lead** (1 FTE): Overall architecture, code reviews, critical path implementation
- **Backend Engineer** (1 FTE): Service implementation, testing, deployment
- **DevOps Engineer** (0.5 FTE): Monitoring setup, alerting, deployment automation
- **QA Engineer** (0.5 FTE): Integration testing, load testing, validation
- **Tech Writer / Documentation Lead** (0.25 FTE): Runbook, API docs, knowledge transfer

**Total Effort**: ~3.25 FTEs over 20-25 days

### 11.3 Dependencies

**Internal Dependencies:**
- Database migration infrastructure (Drizzle Kit) - **Available**
- Background job infrastructure (messageQueue) - **Available**
- Monitoring infrastructure (Winston, Grafana) - **Available**
- Testing infrastructure (Vitest) - **Available**

**External Dependencies:**
- PostgreSQL 12+ (for ON DELETE CASCADE support) - **Available**
- Node.js 18+ (for async/await, event emitters) - **Available**
- Production database access (for migration) - **Coordination required with DBA**

**Blocking Dependencies:**
- None critical (all infrastructure exists)

### 11.4 Milestones

**Week 1 (Days 1-5):**
- ✅ Phase 1 complete: Schema deployed to staging
- ✅ Phase 2 started: Outbox integration coded

**Week 2 (Days 6-10):**
- ✅ Phase 2 complete: Outbox integration tested, deployed to staging
- ✅ Phase 3 started: Worker implementation in progress

**Week 3 (Days 11-15):**
- ✅ Phase 3 complete: Worker tested, deployed to staging
- ✅ Phase 4 started: Monitoring dashboards created

**Week 4 (Days 16-22):**
- ✅ Phase 4 complete: Monitoring deployed to production
- ✅ Phase 5 complete: Documentation finalized, team training conducted
- ✅ Production deployment: Zero FK constraint errors

### 11.5 Success Criteria (Final Validation)

**Functional Requirements:**
- ✅ Zero FK constraint violations during payment verification
- ✅ 100% of subscription changes logged to audit table
- ✅ Worker processes events within 10 seconds
- ✅ Retry logic handles transient failures gracefully
- ✅ Dead letter queue alerts for permanent failures

**Non-Functional Requirements:**
- ✅ Payment flow latency increase <100ms
- ✅ Unit test coverage: 100% for outbox service and processor
- ✅ Integration test coverage: All payment flows validated
- ✅ Load test: Handles 1000 concurrent payments without failures
- ✅ Documentation: Runbook complete, team trained

**Operational Requirements:**
- ✅ Monitoring dashboards deployed
- ✅ Alerting configured and tested
- ✅ Rollback plan documented and validated
- ✅ Production deployment successful (zero downtime)
- ✅ Post-deployment review scheduled

---

## 12. Appendices

### Appendix A: SQL Queries for Manual Operations

**Check Outbox Status:**
```sql
-- Count events by status
SELECT status, COUNT(*) as count
FROM subscription_audit_outbox
GROUP BY status;

-- Oldest pending event
SELECT id, subscription_id, event_type, created_at, 
       EXTRACT(EPOCH FROM (NOW() - created_at)) as age_seconds
FROM subscription_audit_outbox
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 1;

-- Failed events
SELECT id, subscription_id, event_type, retry_count, error_message, created_at
FROM subscription_audit_outbox
WHERE status = 'failed'
ORDER BY updated_at DESC;
```

**Manual Event Processing:**
```sql
-- Manually insert audit event (bypass worker)
INSERT INTO subscription_events (
  subscription_id, user_id, event_type, old_status, new_status, metadata
)
SELECT 
  subscription_id, user_id, event_type, old_status, new_status, metadata
FROM subscription_audit_outbox
WHERE id = 'outbox-event-id-here';

-- Mark outbox event as processed
UPDATE subscription_audit_outbox
SET status = 'processed', processed_at = NOW()
WHERE id = 'outbox-event-id-here';
```

**Bulk Retry Failed Events:**
```sql
-- Reset all failed events for retry
UPDATE subscription_audit_outbox
SET status = 'pending', retry_count = 0, error_message = NULL
WHERE status = 'failed';
```

**Cleanup Old Events:**
```sql
-- Delete processed events older than 30 days
DELETE FROM subscription_audit_outbox
WHERE status = 'processed' 
  AND processed_at < NOW() - INTERVAL '30 days';
```

### Appendix B: Environment Variables Reference

```bash
# Outbox Processor Configuration
OUTBOX_PROCESSOR_ENABLED=true              # Master switch (default: true)
OUTBOX_POLL_INTERVAL_MS=2000               # Polling frequency (default: 2000ms)
OUTBOX_BATCH_SIZE=10                       # Events per poll (default: 10)
OUTBOX_MAX_RETRIES=5                       # Retry limit (default: 5)
OUTBOX_INITIAL_BACKOFF_MS=1000             # Initial backoff delay (default: 1000ms)

# Database Configuration
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Logging Configuration
LOG_LEVEL=info                              # debug, info, warn, error
LOG_OUTBOX_PROCESSOR=true                   # Enable/disable outbox processor logs
```

### Appendix C: Glossary

- **Event Outbox Pattern**: Architectural pattern for reliably publishing events from a database transaction
- **SERIALIZABLE Isolation**: Highest transaction isolation level, guarantees no concurrent modifications
- **Dead Letter Queue (DLQ)**: Storage for messages that failed processing after max retries
- **Idempotency**: Property ensuring multiple executions produce same result as single execution
- **Exponential Backoff**: Retry strategy where delay doubles after each failure
- **Foreign Key (FK) Constraint**: Database constraint ensuring referential integrity
- **Atomicity**: All-or-nothing guarantee for database transactions
- **Worker**: Background process that polls and processes outbox events

### Appendix D: Related Documentation

- `docs/MIGRATION_WORKFLOW.md` - Database migration procedures
- `docs/REPOSITORY_ARCHITECTURE.md` - Overall system architecture
- `server/services/infrastructure/payment-alerts-scheduler.ts` - Similar background job pattern
- `migrations/0006_add_subscription_events.sql` - Existing audit events schema

### Appendix E: Contact Information

**Technical Leads:**
- Backend Architecture: [Name], [Email]
- DevOps / Infrastructure: [Name], [Email]
- Database Administration: [Name], [Email]

**Escalation Path:**
- L1: Backend engineer on call
- L2: Backend lead
- L3: CTO / Engineering Director

**Support Channels:**
- Slack: #engineering-payments
- PagerDuty: Outbox Processor alerts
- JIRA: [Project Link]

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-06 | Investigation Team | Initial comprehensive implementation plan |

---

**END OF IMPLEMENTATION PLAN**
