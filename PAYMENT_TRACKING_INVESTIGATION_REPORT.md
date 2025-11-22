# Payment Tracking System Investigation Report

**Date**: November 09, 2025  
**Purpose**: Comprehensive investigation of payment tracking infrastructure to support fixing revenue tracking issues  
**Investigator**: Replit Agent

---

## Executive Summary

This report provides a comprehensive analysis of the payment tracking system. **CRITICAL FINDING**: The system has **NO dedicated payments/transactions table**. All payment data is stored directly in the `user_subscriptions` table with a **1:1 relationship between subscriptions and payments**. This architecture has significant limitations for revenue tracking, payment history, and upgrade scenarios.

---

## 1. Database Schema Analysis

### 1.1 Payment-Related Tables

#### A. **user_subscriptions** Table (PRIMARY PAYMENT STORAGE)

**Location**: `shared/schema.ts` (lines 876-905)  
**Migration**: `migrations/0005_add_payment_tracking.sql`

**Payment Fields**:
```sql
amount_paid         DECIMAL(10, 2) NOT NULL  -- Actual amount paid by user
currency            VARCHAR(3) DEFAULT 'INR'  -- Currency code (ISO 4217)
paid_at             TIMESTAMP                 -- Payment completion timestamp
order_id            TEXT                      -- Razorpay order ID (for idempotency)
payment_reference   TEXT                      -- Razorpay payment ID
payment_gateway     TEXT                      -- Payment gateway identifier (e.g., 'razorpay')
```

**Critical Characteristics**:
- **No dedicated transactions table** - payment data lives in subscription record
- **One payment per subscription** - upgrades OVERWRITE previous payment data
- **No payment history** - only current/latest payment is preserved
- Amount paid is stored as the actual charged amount (includes proration for upgrades)

**Database Statistics** (from query):
```
Total subscriptions: 1
With amount_paid: 1 (100%)
With paid_at: 1 (100%)
With order_id: 1 (100%)
With payment_reference: 1 (100%)
```

**Index Coverage**:
```sql
CREATE INDEX "idx_user_subscriptions_paid_at" ON "user_subscriptions" ("paid_at");
```

---

#### B. **subscription_events** Table (AUDIT TRAIL)

**Location**: `shared/schema.ts` (lines 936-946)  
**Migration**: `migrations/0006_add_subscription_events.sql`

**Schema**:
```sql
id                uuid PRIMARY KEY
subscription_id   uuid NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE
user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
event_type       text NOT NULL
old_status       text
new_status       text
metadata         jsonb                -- ⚠️ CRITICAL: Contains payment details
created_at       timestamp NOT NULL DEFAULT NOW()
```

**Event Types Observed** (from database query):
```
- subscription_created
- subscription_upgraded
```

**Payment Data in Metadata** (Real Examples from Database):

**Example 1: subscription_created**
```json
{
  "planId": "9a20ef30-23eb-43f3-a49f-0cac24d0570b",
  "orderId": "order_RdijHKBSibuCoD",
  "currency": "INR",
  "planName": "basic",
  "paymentId": "pay_RdijcDOzHze0Nx",
  "tierLevel": 1,
  "amountPaid": 20000,
  "isLifetime": true
}
```

**Example 2: subscription_upgraded**
```json
{
  "orderId": "order_Rdikflcjlq8AJ1",
  "currency": "INR",
  "newPlanId": "8d1c23a9-1297-4a19-b6c2-0ec250b235cf",
  "oldPlanId": "9a20ef30-23eb-43f3-a49f-0cac24d0570b",
  "paymentId": "pay_RdiktEFRV8XQOD",
  "amountPaid": 20000,
  "newTierLevel": 2,
  "oldTierLevel": 1
}
```

**Indexes**:
```sql
CREATE INDEX "idx_subscription_events_subscription_id" ON "subscription_events" ("subscription_id");
CREATE INDEX "idx_subscription_events_user_id" ON "subscription_events" ("user_id");
CREATE INDEX "idx_subscription_events_event_type" ON "subscription_events" ("event_type");
CREATE INDEX "idx_subscription_events_created_at" ON "subscription_events" ("created_at" DESC);
```

**⚠️ CRITICAL DATA RECOVERY OPPORTUNITY**: This table contains historical payment data in the `metadata` field including:
- `orderId`: Razorpay order ID
- `paymentId`: Razorpay payment ID
- `amountPaid`: Actual amount paid (in paise for some events)
- `currency`: Payment currency
- Plan transition information for upgrades

---

#### C. **webhook_events** Table (DEDUPLICATION)

**Location**: `shared/schema.ts` (lines 925-934)  
**Migration**: `migrations/0004_add_webhook_events_table.sql`

**Schema**:
```sql
id             uuid PRIMARY KEY
event_id       text NOT NULL UNIQUE         -- Razorpay event ID
event_type     text NOT NULL                -- Webhook event type
payload        jsonb                        -- Full webhook payload
status         text NOT NULL DEFAULT 'processing'
error_message  text
processed_at   timestamp
created_at     timestamp NOT NULL DEFAULT NOW()
```

**Current Status** (from database query):
- No webhook events currently stored
- Table is ready but likely webhooks haven't been received yet or retention policy cleans them

**Purpose**:
- Prevents duplicate webhook processing from Razorpay retries
- Stores complete webhook payload including payment details
- Could contain historical payment data if webhooks were received

**Indexes**:
```sql
CREATE UNIQUE INDEX "idx_webhook_events_event_id" ON "webhook_events" ("event_id");
CREATE INDEX "idx_webhook_events_created_at" ON "webhook_events" ("created_at");
CREATE INDEX "idx_webhook_events_status" ON "webhook_events" ("status");
```

---

#### D. **failed_payments** Table (FAILURE TRACKING)

**Location**: `shared/schema.ts` (lines 966-981)  
**Migration**: `migrations/0007_add_failed_payments.sql`

**Schema**:
```sql
id                          uuid PRIMARY KEY
user_id                     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
plan_id                     uuid REFERENCES subscription_plans(id) ON DELETE SET NULL
order_id                    text
payment_id                  text
amount                      DECIMAL(10, 2)
currency                    VARCHAR(3) DEFAULT 'INR'
failure_reason              text                    -- High-level reason
razorpay_error_code        text                    -- Razorpay error code
razorpay_error_description text                    -- Detailed error from Razorpay
failed_at                   timestamp NOT NULL DEFAULT NOW()
notified_at                 timestamp               -- When user was notified
digest_sent_at             timestamp               -- Email digest tracking
created_at                  timestamp NOT NULL DEFAULT NOW()
```

**Indexes**:
```sql
CREATE INDEX "idx_failed_payments_user_id" ON "failed_payments" ("user_id");
CREATE INDEX "idx_failed_payments_plan_id" ON "failed_payments" ("plan_id");
CREATE INDEX "idx_failed_payments_failed_at" ON "failed_payments" ("failed_at" DESC);
CREATE INDEX "idx_failed_payments_order_id" ON "failed_payments" ("order_id") WHERE order_id IS NOT NULL;
```

**Purpose**: Tracks payment failures for debugging, analytics, and user support

---

#### E. **subscription_audit_outbox** Table (EVENT OUTBOX PATTERN)

**Location**: `shared/schema.ts` (lines 948-963)

**Schema**:
```sql
id              uuid PRIMARY KEY
subscription_id uuid NOT NULL
user_id         uuid NOT NULL REFERENCES users(id)
event_type      VARCHAR(100) NOT NULL
old_status      VARCHAR(50)
new_status      VARCHAR(50)
metadata        jsonb                        -- Contains payment data
status          VARCHAR(20) DEFAULT 'pending' NOT NULL
retries         INTEGER DEFAULT 0 NOT NULL
next_retry_at   timestamp
error_message   text
created_at      timestamp NOT NULL DEFAULT NOW()
processed_at    timestamp
```

**Purpose**: 
- Reliable event processing using outbox pattern
- Ensures subscription events are eventually written to `subscription_events`
- Contains same payment metadata as `subscription_events`

---

### 1.2 Tables NOT Found (Architecture Gap)

**CRITICAL FINDINGS**: The following standard payment system tables are **MISSING**:

1. **transactions** / **payments** table
   - No dedicated table for payment records
   - Payment data embedded in subscription records
   - No historical payment tracking beyond audit logs

2. **payment_methods** table
   - No storage of customer payment methods
   - No tokenization support for recurring payments

3. **invoices** table
   - No invoice generation or tracking
   - No billing history for accounting purposes

4. **refunds** table
   - No refund tracking capability
   - No payment reversal history

---

## 2. Payment Flow Analysis

### 2.1 Order Creation Flow

**Endpoint**: `POST /api/payment/create-order`  
**Controller**: `server/controllers/payment.controller.ts` (lines 37-207)  
**Service**: `server/services/domain/proration.service.ts`

**Flow Diagram**:
```
User Requests Plan
       ↓
Check if user can purchase plan (userSubscriptionService.canPurchasePlan)
       ↓
Fetch plan details from subscriptionPlanRepository
       ↓
IF upgrade detected:
   ├─ Calculate proration (prorationService.calculate)
   ├─ Check if zero-cost upgrade
   │  └─ If yes: Direct upgrade without payment
   └─ Use prorated amount
ELSE:
   └─ Use full plan price
       ↓
Generate unique receipt ID: `${timestamp}_${hash}`
       ↓
Create Razorpay order with metadata:
   - userId
   - planId
   - planName
   - isLifetime: true
   - isUpgrade: boolean
   - originalPrice
   - prorationAmount
   - alreadyPaid
       ↓
Return order details to frontend
```

**Order Metadata Stored in Razorpay**:
```typescript
notes: {
  userId: string,
  planId: string,
  planName: string,
  isLifetime: true,
  isUpgrade: boolean,
  originalPrice: string,
  prorationAmount: string,
  alreadyPaid: string
}
```

**Key Logging Points**:
- Line 177-187: Order creation success with full payment details
- Logs include: userId, planId, orderId, amount, currency, isUpgrade, originalPrice, prorationAmount, alreadyPaid

---

### 2.2 Payment Verification Flow

**Endpoint**: `POST /api/payment/verify`  
**Controller**: `server/controllers/payment.controller.ts` (lines 221-431)  
**Service**: `server/services/domain/payment-transaction.service.ts`

**Flow Diagram**:
```
Frontend sends: orderId, paymentId, signature, planId
       ↓
[SECURITY STEP 1] Verify Razorpay signature
       ↓
[SECURITY STEP 2] Fetch order from Razorpay to get original metadata
       ↓
[SECURITY STEP 3] Validate planId matches order.notes.planId
       ↓
[SECURITY STEP 4] Validate userId matches order.notes.userId
       ↓
[SECURITY STEP 5] Fetch plan to validate amount
       ↓
[SECURITY STEP 6] Validate payment amount:
   IF upgrade:
      └─ Validate against order.notes.prorationAmount
   ELSE:
      └─ Validate against plan.price
       ↓
[STEP 7] Fetch payment details from Razorpay
       ↓
[STEP 8] Check payment status === 'captured'
       ↓
[STEP 9] Call paymentTransactionService.createSubscriptionWithLock()
       ↓
[DATABASE TRANSACTION with row-level locking]
   ├─ Check if subscription exists for this orderId (idempotency)
   ├─ Lock existing user subscriptions (FOR UPDATE)
   ├─ IF active subscription exists:
   │  ├─ UPDATE user_subscriptions SET
   │  │  ├─ planId = targetPlan.id
   │  │  ├─ orderId = orderId
   │  │  ├─ paymentReference = paymentId
   │  │  ├─ amountPaid = amountPaid          ⚠️ OVERWRITES previous amount
   │  │  ├─ currency = currency
   │  │  ├─ paidAt = new Date()
   │  │  └─ tierLevel, status, etc.
   │  └─ Log to subscriptionAuditOutbox (subscription_upgraded event)
   └─ ELSE (new subscription):
      ├─ INSERT INTO user_subscriptions
      │  ├─ All payment fields
      │  └─ Subscription details
      └─ Log to subscriptionAuditOutbox (subscription_created event)
       ↓
Return subscription to frontend
```

**Payment Data Recording Locations**:

1. **user_subscriptions table** (PRIMARY):
   ```typescript
   // File: server/services/domain/payment-transaction.service.ts
   // Lines: 165-183 (upgrade) and 215-236 (new subscription)
   {
     amountPaid: amountPaid.toString(),  // Converted to string
     currency: currency,
     paidAt: new Date(),
     orderId: orderId,
     paymentReference: paymentId,
     paymentGateway: 'razorpay'
   }
   ```

2. **subscription_events metadata** (AUDIT):
   ```typescript
   // File: server/services/domain/payment-transaction.service.ts
   // Lines: 194-211 (upgrade) and 247-261 (new subscription)
   metadata: {
     orderId: orderId,
     paymentId: paymentId,
     amountPaid: amountPaid,
     currency: currency,
     // Plus plan transition details for upgrades
   }
   ```

**⚠️ CRITICAL ISSUE - Data Loss on Upgrades**:
When a user upgrades:
- The **UPDATE** statement (line 165-183) **OVERWRITES** the previous `amountPaid`, `currency`, and `paidAt`
- **Previous payment data is LOST** from `user_subscriptions` table
- Only way to recover is from `subscription_events.metadata`

---

### 2.3 Webhook Handler Flow

**Endpoint**: `POST /api/payment/webhook`  
**Controller**: `server/controllers/payment.controller.ts` (lines 443-575)  
**Security Middleware**: `server/middleware/webhook-security.ts`

**Security Flow**:
```
Razorpay sends webhook
       ↓
[MIDDLEWARE 1] webhookIpWhitelist
   └─ Validates IP against Razorpay's official IPs
   └─ Normalizes IPv6-mapped IPv4 addresses
       ↓
[MIDDLEWARE 2] webhookRateLimit
   └─ Limits to 10 requests/minute per IP
       ↓
[HANDLER STEP 1] Verify raw body is Buffer (not parsed JSON)
       ↓
[HANDLER STEP 2] Verify X-Razorpay-Signature header
       ↓
[HANDLER STEP 3] Parse JSON after signature verification
       ↓
[HANDLER STEP 4] Timestamp validation (reject if >5 minutes old)
       ↓
[HANDLER STEP 5] Deduplication check (webhookDeduplicationService)
   └─ Check if event_id already processed
   └─ If yes: Return 200 OK (idempotent)
   └─ If no: Record event in webhook_events table
       ↓
[HANDLER STEP 6] Process event based on type:
   - payment.captured → handlePaymentCaptured()
   - payment.failed → handlePaymentFailed()
   - order.paid → handleOrderPaid()
       ↓
[HANDLER STEP 7] Mark event as success/failed in webhook_events
       ↓
Always return 200 OK to Razorpay
```

**Event Handlers**:

1. **handlePaymentCaptured()** (lines 577-580):
   - Currently only logs the payment ID
   - **DOES NOT** persist any payment data

2. **handlePaymentFailed()** (lines 582-624):
   - Extracts userId and planId from payment.notes
   - Calls `paymentFailureService.logFailedPayment()`
   - Stores in `failed_payments` table:
     ```typescript
     {
       userId: payment.notes.userId,
       planId: payment.notes.planId,
       orderId: payment.order_id,
       paymentId: payment.id,
       amount: payment.amount / 100,  // Convert paise to rupees
       currency: payment.currency,
       failureReason: 'payment_failed',
       razorpayErrorCode: payment.error_code,
       razorpayErrorDescription: payment.error_description
     }
     ```

3. **handleOrderPaid()** (not shown in snippet):
   - Handler exists in switch statement
   - Implementation not visible in current code

**Payment Data Persistence from Webhooks**:
- **webhook_events.payload** contains full Razorpay webhook payload
- **failed_payments** table stores failure details
- **No direct subscription creation** from webhooks (only from verify endpoint)

---

### 2.4 Upgrade Payment Handling

**Service**: `server/services/domain/proration.service.ts`  
**Transaction Service**: `server/services/domain/payment-transaction.service.ts`

**Upgrade Process**:

1. **Proration Calculation**:
   - Fetches current active subscription
   - Fetches target plan
   - Calculates: `prorationAmount = targetPlanPrice - currentSubscription.amountPaid`
   - Validates currency match
   - Returns:
     ```typescript
     {
       allowed: boolean,
       requiresPayment: boolean,
       prorationAmount: number,
       alreadyPaid: number,
       newPlanPrice: number,
       reason?: string
     }
     ```

2. **Zero-Cost Upgrades**:
   - If user already paid >= new plan price → Direct upgrade without payment
   - Updates subscription record without Razorpay order
   - Example: User paid ₹20,000 for Basic, upgrading to Premium (₹15,000) = Free upgrade

3. **Payment Recording on Upgrade**:
   ```typescript
   // File: server/services/domain/payment-transaction.service.ts
   // Lines 165-183
   await tx.update(userSubscriptions).set({
     planId: targetPlan.id,
     orderId: orderId,                    // New order ID
     paymentReference: paymentId,         // New payment ID
     amountPaid: amountPaid.toString(),   // ⚠️ NEW amount (overwrites old)
     currency: currency,
     paidAt: new Date(),                  // ⚠️ NEW timestamp (overwrites old)
     // ... other fields
   })
   ```

4. **Audit Event for Upgrade**:
   ```typescript
   // Lines 194-211
   await subscriptionAuditOutboxService.enqueueEvent(tx,
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
       orderId: orderId,              // Preserved
       paymentId: paymentId,          // Preserved
       amountPaid: amountPaid,        // Preserved
       currency: currency             // Preserved
     }
   );
   ```

**⚠️ CRITICAL DATA PRESERVATION**:
- **Previous payment details ARE preserved** in `subscription_events.metadata`
- **Previous payment details ARE LOST** from `user_subscriptions` table
- To reconstruct full payment history, must query `subscription_events`

---

## 3. Data Recovery Opportunities

### 3.1 Historical Payment Data in subscription_events

**Recovery Source**: `subscription_events.metadata` JSONB field

**Available Data**:
- ✅ Complete payment amounts (`amountPaid`)
- ✅ Order IDs (`orderId`)
- ✅ Payment IDs (`paymentId`)
- ✅ Currency codes (`currency`)
- ✅ Plan transitions (oldPlanId → newPlanId)
- ✅ Tier levels (oldTierLevel → newTierLevel)
- ✅ Event timestamps (`created_at`)

**Sample Recovery Query**:
```sql
SELECT 
  se.id as event_id,
  se.subscription_id,
  se.user_id,
  se.event_type,
  se.created_at as event_timestamp,
  se.metadata->>'orderId' as order_id,
  se.metadata->>'paymentId' as payment_id,
  se.metadata->>'amountPaid' as amount_paid,
  se.metadata->>'currency' as currency,
  se.metadata->>'planId' as plan_id,
  se.metadata->>'planName' as plan_name,
  -- For upgrades:
  se.metadata->>'oldPlanId' as old_plan_id,
  se.metadata->>'newPlanId' as new_plan_id,
  se.metadata->>'oldTierLevel' as old_tier_level,
  se.metadata->>'newTierLevel' as new_tier_level
FROM subscription_events se
WHERE se.metadata IS NOT NULL
  AND se.event_type IN ('subscription_created', 'subscription_upgraded')
ORDER BY se.created_at;
```

**Data Completeness** (from database analysis):
- Current events in database: 2
- Event types: subscription_created, subscription_upgraded
- 100% of events have payment metadata
- All events have orderId, paymentId, amountPaid, currency

---

### 3.2 Razorpay Order/Payment ID Preservation

**Preservation Locations**:

1. **user_subscriptions table** (CURRENT ONLY):
   - `order_id`: Latest Razorpay order ID
   - `payment_reference`: Latest Razorpay payment ID
   - ⚠️ Overwritten on upgrades

2. **subscription_events.metadata** (HISTORICAL):
   - `orderId`: Preserved for each payment event
   - `paymentId`: Preserved for each payment event
   - ✅ Full history available

3. **webhook_events.payload** (IF WEBHOOKS RECEIVED):
   - `payload.order.entity.id`: Razorpay order ID
   - `payload.payment.entity.id`: Razorpay payment ID
   - Full Razorpay webhook payload preserved
   - ⚠️ Currently empty (no webhooks received yet)

4. **failed_payments table** (FAILURES ONLY):
   - `order_id`: Razorpay order ID for failed payments
   - `payment_id`: Razorpay payment ID for failed payments

**Recovery Capability**:
- ✅ All successful payment IDs can be recovered from `subscription_events`
- ✅ Can query Razorpay API using these IDs to fetch original payment details
- ✅ Can reconstruct complete payment timeline

---

### 3.3 Audit Log Analysis

**Audit Trail Components**:

1. **subscription_events** (PRIMARY AUDIT TRAIL):
   - **Location**: Database table
   - **Retention**: Permanent (no cleanup job found)
   - **Data**: Full payment metadata
   - **Completeness**: 100% coverage for payment events

2. **subscription_audit_outbox** (OUTBOX PATTERN):
   - **Location**: Database table
   - **Purpose**: Ensures reliable event processing
   - **Retention**: Completed events archived periodically
   - **File**: `server/jobs/archive-completed-outbox-events.ts`
   - **Data**: Same as subscription_events

3. **webhook_events** (WEBHOOK DEDUPLICATION):
   - **Location**: Database table
   - **Purpose**: Prevent duplicate webhook processing
   - **Retention**: Unknown (no cleanup job visible)
   - **Data**: Full Razorpay webhook payloads
   - **Current Status**: Empty (no webhooks yet)

4. **Application Logs** (WINSTON LOGGER):
   - **Location**: `logs/combined.log`, `logs/error.log`
   - **Rotation**: Daily rotation (winston-daily-rotate-file)
   - **Payment Events Logged**:
     - Order creation (with full details)
     - Payment verification (with full details)
     - Webhook processing
     - Failed payments
   - **Format**: Structured JSON logs
   - **Retention**: Configure via Winston settings

**Log Search Queries for Payment Recovery**:
```bash
# Search for payment order creations
grep "Payment order created successfully" logs/combined.log

# Search for payment verifications
grep "Payment verification started" logs/combined.log

# Search for subscription upgrades
grep "subscription_upgraded" logs/combined.log
```

---

## 4. Existing Payment History Features

### 4.1 Admin Endpoints

**File**: `server/routes/admin.routes.ts`

| Endpoint | Method | Controller Method | Description |
|----------|--------|-------------------|-------------|
| `/api/admin/user-subscriptions/:userId/payment-history` | GET | getUserPaymentHistory | Payment history for specific user |
| `/api/admin/user-subscriptions/:userId/events` | GET | getUserSubscriptionEvents | Subscription events for user |
| `/api/admin/failed-payments` | GET | getFailedPayments | All failed payment attempts |
| `/api/admin/analytics/subscriptions` | GET | getSubscriptionAnalytics | Subscription metrics |
| `/api/admin/analytics/revenue` | GET | getRevenueAnalytics | Revenue metrics |
| `/api/admin/analytics/lifetime-metrics` | GET | getLifetimeMetrics | Lifetime subscription metrics |
| `/api/admin/subscription-plans/analytics` | GET | getComprehensivePlanAnalytics | Plan-level analytics |

---

### 4.2 Payment History Query Implementation

**Endpoint**: `GET /api/admin/user-subscriptions/:userId/payment-history`  
**File**: `server/controllers/admin.controller.ts` (lines 2422-2458)

**Current Implementation**:
```typescript
const paymentHistory = await db
  .select({
    subscriptionId: userSubscriptions.id,
    planId: userSubscriptions.planId,
    planName: subscriptionPlans.name,
    orderId: userSubscriptions.orderId,
    paymentReference: userSubscriptions.paymentReference,
    paymentGateway: userSubscriptions.paymentGateway,
    amountPaid: userSubscriptions.amountPaid,
    currency: userSubscriptions.currency,
    paidAt: userSubscriptions.paidAt,
    status: userSubscriptions.status,
    startedAt: userSubscriptions.startedAt,
    expiresAt: userSubscriptions.expiresAt,
  })
  .from(userSubscriptions)
  .leftJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
  .where(
    and(
      eq(userSubscriptions.userId, userId),
      isNotNull(userSubscriptions.paidAt)
    )
  )
  .orderBy(userSubscriptions.paidAt);
```

**⚠️ CRITICAL LIMITATION**:
- **Only returns CURRENT subscription payment data**
- **Does NOT include historical payments from upgrades**
- **Missing**: Previous payments that were overwritten by upgrades
- **Result**: Incomplete payment history

**Data Source**: `user_subscriptions` table only (does not query `subscription_events`)

---

### 4.3 Subscription Events Query

**Endpoint**: `GET /api/admin/user-subscriptions/:userId/events`  
**File**: `server/controllers/admin.controller.ts` (lines 2472-2483)

**Current Implementation**:
```typescript
const events = await subscriptionAuditService.getUserSubscriptionEvents(userId);
```

**Service Implementation**:  
**File**: `server/services/infrastructure/subscription-audit.service.ts` (lines 66-79)

```typescript
async getUserSubscriptionEvents(userId: string): Promise<any[]> {
  const events = await db.query.subscriptionEvents.findMany({
    where: (subscriptionEvents, { eq }) => eq(subscriptionEvents.userId, userId),
    orderBy: (subscriptionEvents, { desc }) => [desc(subscriptionEvents.createdAt)],
  });
  return events;
}
```

**Data Returned**:
- ✅ Full subscription events including metadata
- ✅ Contains historical payment data
- ✅ Ordered by creation date (newest first)
- ⚠️ BUT: Not used for payment history display

---

### 4.4 Failed Payments Query

**Endpoint**: `GET /api/admin/failed-payments`  
**File**: `server/controllers/admin.controller.ts` (lines 2372-2408)

**Current Implementation**:
```typescript
const failedPaymentsData = await db
  .select({
    id: failedPayments.id,
    userId: failedPayments.userId,
    planId: failedPayments.planId,
    orderId: failedPayments.orderId,
    paymentId: failedPayments.paymentId,
    amount: failedPayments.amount,
    currency: failedPayments.currency,
    failureReason: failedPayments.failureReason,
    razorpayErrorCode: failedPayments.razorpayErrorCode,
    razorpayErrorDescription: failedPayments.razorpayErrorDescription,
    failedAt: failedPayments.failedAt,
    notifiedAt: failedPayments.notifiedAt,
    userEmail: users.email,
    userName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
    planName: subscriptionPlans.name,
  })
  .from(failedPayments)
  .leftJoin(users, eq(failedPayments.userId, users.id))
  .leftJoin(subscriptionPlans, eq(failedPayments.planId, subscriptionPlans.id))
  .orderBy(desc(failedPayments.failedAt));
```

**Data Source**: `failed_payments` table with user and plan details

---

### 4.5 User-Facing Payment History

**Search Results**: No user-facing payment history endpoints found

**Files Checked**:
- `server/routes/user.routes.ts` - No payment history endpoints
- `server/routes/subscription.routes.ts` - No payment history endpoints
- Client components:
  - `client/src/components/admin/PlanChangeHistory.tsx` - Admin only
  - `client/src/pages/SubscriptionPlans.tsx` - No history display

**⚠️ GAP**: Users cannot view their own payment history through the application

---

## 5. Related Components - Analytics & Revenue Tracking

### 5.1 Revenue Calculation Methodology

**Service**: `server/services/domain/subscription-analytics.service.ts`  
**Method**: `getRevenueMetrics()` (lines 222-306)

**Current Revenue Calculation**:
```typescript
async getRevenueMetrics(): Promise<RevenueMetrics> {
  // Fetch active subscriptions with plan details
  const activeSubscriptionsWithPlans = await db
    .select({
      planId: userSubscriptions.planId,
      planName: subscriptionPlans.name,
      planPrice: subscriptionPlans.price,
      amountPaid: userSubscriptions.amountPaid,  // ⚠️ Only current amount
      currency: userSubscriptions.currency,
      isLifetime: userSubscriptions.isLifetime
    })
    .from(userSubscriptions)
    .leftJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
    .where(eq(userSubscriptions.status, 'active'));

  // Fetch ALL paid subscriptions for total revenue
  const allPaidSubscriptions = await db
    .select({
      amountPaid: userSubscriptions.amountPaid
    })
    .from(userSubscriptions)
    .where(sql`${userSubscriptions.amountPaid} IS NOT NULL`);

  // Calculate total revenue by summing amountPaid
  for (const sub of allPaidSubscriptions) {
    totalRevenue += parseFloat(sub.amountPaid || '0');
  }
}
```

**⚠️ CRITICAL REVENUE TRACKING BUG**:

**Problem**: Revenue calculation is **INCORRECT** for users who upgraded

**Example Scenario**:
1. User pays ₹20,000 for Basic plan
   - `user_subscriptions.amount_paid = 20000`
2. User upgrades to Premium for ₹20,000 more
   - **UPDATE** sets `amount_paid = 20000` (overwrites!)
3. Revenue query sums `amount_paid` = **₹20,000 total** ❌
4. **Actual revenue received**: ₹40,000 ✅

**Impact**:
- **Total revenue is UNDERSTATED**
- **Each upgrade LOSES the previous payment from revenue calculations**
- **Revenue per plan is INCORRECT** (only shows latest payment)

**Root Cause**:
- No dedicated `transactions` table
- Payment data stored in `user_subscriptions` (1:1 relationship)
- Upgrades overwrite previous payment amounts

---

### 5.2 Lifetime Subscription Metrics

**Method**: `getLifetimeMetrics()` (lines 788-892)

**Calculation**:
```typescript
async getLifetimeMetrics(): Promise<LifetimeSubscriptionMetrics> {
  // Get all active lifetime subscriptions
  const lifetimeSubscriptions = await db
    .select({
      userId: userSubscriptions.userId,
      planId: userSubscriptions.planId,
      planName: subscriptionPlans.name,
      tierLevel: userSubscriptions.tierLevel,
      amountPaid: userSubscriptions.amountPaid,  // ⚠️ Only current amount
      currency: userSubscriptions.currency,
      paidAt: userSubscriptions.paidAt,
    })
    .from(userSubscriptions)
    .leftJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
    .where(
      and(
        eq(userSubscriptions.isLifetime, true),
        eq(userSubscriptions.status, 'active')
      )
    );

  // Calculate total revenue and metrics
  let totalRevenue = 0;
  for (const sub of lifetimeSubscriptions) {
    totalRevenue += parseFloat(sub.amountPaid || '0');
  }
}
```

**Same Bug Applies**:
- Lifetime revenue calculation uses `user_subscriptions.amountPaid`
- Does not account for historical upgrade payments
- **Understates actual lifetime revenue**

---

### 5.3 Plan Distribution Analytics

**Method**: `getLifetimeMetrics()` - Plan Distribution Section

**Current Implementation**:
```typescript
// Group by plan for distribution
const planDistribution = Array.from(planRevenueMap.values()).map(item => ({
  planId: item.planId,
  planName: item.planName,
  subscriberCount: item.count,
  revenue: item.revenue,  // ⚠️ Sum of current amountPaid only
  percentage: totalSubscribers > 0 
    ? Math.round((item.count / totalSubscribers) * 10000) / 100 
    : 0
}));
```

**Issue**:
- Revenue per plan calculated from current `amountPaid`
- **Does not include historical payments made to that plan**
- Example: User paid ₹15,000 for Basic, then upgraded to Premium
  - Basic plan revenue: ₹0 (user no longer on Basic)
  - Premium plan revenue: ₹20,000 (current subscription)
  - **Missing**: ₹15,000 paid to Basic plan

---

### 5.4 Revenue by Tier

**Method**: `getLifetimeMetrics()` - Revenue by Tier Section

**Current Implementation**:
```typescript
const tierRevenueMap = new Map<number, { revenue: number; count: number }>();

for (const sub of lifetimeSubscriptions) {
  const tierLevel = sub.tierLevel || 0;
  const amount = parseFloat(sub.amountPaid || '0');
  
  const existing = tierRevenueMap.get(tierLevel) || { revenue: 0, count: 0 };
  existing.revenue += amount;  // ⚠️ Only current amountPaid
  existing.count += 1;
  tierRevenueMap.set(tierLevel, existing);
}
```

**Issue**:
- Tier revenue calculated from current subscription tier
- **Historical tier revenue is lost**
- User transitions between tiers are not tracked in revenue

---

### 5.5 Upgrade/Downgrade Metrics

**Method**: `getUpgradeDowngradeMetrics()` (not shown in provided snippets)

**Expected Data Source**: Would need to query `subscription_events` for tier changes

**Current Capability**: Unknown (method not provided in code snippets)

---

### 5.6 Admin Dashboards Using Payment Data

**Analytics Dashboard Endpoints**:

1. **GET /api/admin/analytics/subscriptions**
   - **File**: `server/controllers/admin.controller.ts` (lines 2260-2280)
   - **Returns**:
     - Subscription metrics
     - Churn metrics
     - Payment metrics
     - Upgrade/downgrade metrics
   - **Data Source**: `user_subscriptions` table

2. **GET /api/admin/analytics/revenue**
   - **File**: `server/controllers/admin.controller.ts` (lines 2282-2292)
   - **Returns**: Revenue metrics
   - **Data Source**: `user_subscriptions.amountPaid` ⚠️

3. **GET /api/admin/analytics/lifetime-metrics**
   - **File**: `server/controllers/admin.controller.ts` (lines 2318-2328)
   - **Returns**: Lifetime subscription metrics
   - **Data Source**: `user_subscriptions.amountPaid` ⚠️

4. **GET /api/admin/subscription-plans/analytics**
   - **File**: `server/routes/admin.routes.ts` (line 190)
   - **Returns**: Comprehensive plan analytics
   - **Data Source**: Multiple sources (user_subscriptions, subscription_events, etc.)

**Frontend Dashboards**:
- `client/src/pages/admin/SubscriptionAnalytics.tsx` - Uses revenue analytics endpoint
- `client/src/pages/admin/PlanAnalytics.tsx` - Uses plan analytics endpoint
- `client/src/components/admin/LifetimeAnalyticsDashboard.tsx` - Uses lifetime metrics endpoint

**⚠️ All dashboards are affected by the revenue tracking bug**

---

## 6. Critical Findings Summary

### 6.1 Architecture Gaps

| Gap | Impact | Severity |
|-----|--------|----------|
| **No dedicated payments/transactions table** | Cannot track payment history properly | 🔴 CRITICAL |
| **1:1 relationship between subscriptions and payments** | Upgrades overwrite payment data | 🔴 CRITICAL |
| **Revenue calculated from current amountPaid** | Total revenue is UNDERSTATED | 🔴 CRITICAL |
| **No user-facing payment history** | Users cannot view their payment history | 🟡 MEDIUM |
| **No invoice generation** | No billing records for accounting | 🟡 MEDIUM |
| **No refund tracking** | Cannot track payment reversals | 🟢 LOW |

---

### 6.2 Data Loss Points

1. **Upgrade Payment Overwrite** (🔴 CRITICAL):
   - **Location**: `server/services/domain/payment-transaction.service.ts` (line 179)
   - **Impact**: Previous payment amount is lost from `user_subscriptions`
   - **Mitigation**: Data preserved in `subscription_events.metadata`

2. **Payment History Truncation** (🔴 CRITICAL):
   - **Location**: `server/controllers/admin.controller.ts` (line 2429-2452)
   - **Impact**: Payment history endpoint only shows latest payment
   - **Mitigation**: Must query `subscription_events` instead

3. **Revenue Understatement** (🔴 CRITICAL):
   - **Location**: `server/services/domain/subscription-analytics.service.ts` (line 280-282)
   - **Impact**: Total revenue calculation misses upgrade payments
   - **Mitigation**: Must sum payments from `subscription_events.metadata`

---

### 6.3 Data Recovery Opportunities

| Data Type | Recovery Source | Completeness | Query Complexity |
|-----------|-----------------|--------------|------------------|
| **Historical payment amounts** | `subscription_events.metadata->>'amountPaid'` | 100% | Low |
| **Razorpay order IDs** | `subscription_events.metadata->>'orderId'` | 100% | Low |
| **Razorpay payment IDs** | `subscription_events.metadata->>'paymentId'` | 100% | Low |
| **Payment timestamps** | `subscription_events.created_at` | 100% | Low |
| **Plan transitions** | `subscription_events.metadata` (oldPlanId/newPlanId) | 100% | Low |
| **Webhook payloads** | `webhook_events.payload` | 0% (no webhooks yet) | N/A |
| **Application logs** | `logs/combined.log` | Variable (depends on retention) | High |

---

## 7. Recommendations for Fix Plan

### 7.1 Immediate Fixes (High Priority)

1. **Fix Revenue Calculation** (🔴 CRITICAL):
   - Modify `getRevenueMetrics()` to query `subscription_events`
   - Sum all payments from metadata instead of current `amountPaid`
   - Query:
     ```sql
     SELECT SUM((metadata->>'amountPaid')::numeric) as total_revenue
     FROM subscription_events
     WHERE event_type IN ('subscription_created', 'subscription_upgraded')
       AND metadata->>'amountPaid' IS NOT NULL;
     ```

2. **Fix Payment History Endpoint** (🔴 CRITICAL):
   - Modify `getUserPaymentHistory()` to include all payments
   - Join `user_subscriptions` with `subscription_events`
   - Return complete payment timeline

3. **Add Payment History Reconstruction Service**:
   - Create service to rebuild payment history from `subscription_events`
   - Provide API to get complete payment timeline per user
   - Include plan transitions and amounts

---

### 7.2 Short-Term Improvements (Medium Priority)

1. **Create Dedicated Transactions Table**:
   - Design: `payment_transactions` table
   - Columns: id, user_id, subscription_id, order_id, payment_id, amount, currency, status, created_at
   - Migrate existing data from `subscription_events.metadata`

2. **Modify Payment Flow to Use Transactions Table**:
   - **INSERT** into `payment_transactions` instead of UPDATE `user_subscriptions`
   - Keep `user_subscriptions.amountPaid` as calculated field (sum of transactions)
   - Preserve backward compatibility

3. **Add User Payment History Endpoint**:
   - Create `GET /api/user/payment-history`
   - Return user's own payment history
   - Display in user profile/settings

---

### 7.3 Long-Term Architecture (Low Priority)

1. **Implement Full Payment System**:
   - `payment_transactions` table (all payments)
   - `payment_methods` table (stored payment methods)
   - `invoices` table (billing records)
   - `refunds` table (payment reversals)

2. **Webhook Enhancement**:
   - Persist all webhook data long-term
   - Use webhooks as source of truth for payment confirmation
   - Implement webhook reconciliation job

3. **Revenue Reporting Improvements**:
   - Monthly revenue reports
   - Cohort analysis
   - Payment success rate tracking
   - Revenue forecasting

---

## 8. Data Migration Plan

### 8.1 Historical Data Extraction

**Objective**: Extract all payment data from `subscription_events.metadata`

**Query to Extract All Payments**:
```sql
SELECT 
  se.id as event_id,
  se.subscription_id,
  se.user_id,
  se.event_type,
  se.created_at as payment_date,
  (se.metadata->>'amountPaid')::numeric / 100 as amount,  -- Convert paise to rupees if needed
  se.metadata->>'currency' as currency,
  se.metadata->>'orderId' as order_id,
  se.metadata->>'paymentId' as payment_id,
  se.metadata->>'planId' as plan_id,
  se.metadata->>'planName' as plan_name
FROM subscription_events se
WHERE se.event_type IN ('subscription_created', 'subscription_upgraded')
  AND se.metadata IS NOT NULL
  AND se.metadata->>'amountPaid' IS NOT NULL
ORDER BY se.user_id, se.created_at;
```

**Expected Output**: Complete payment history with all fields needed for transactions table

---

### 8.2 Validation Queries

**Check Revenue Discrepancy**:
```sql
-- Current (incorrect) revenue calculation
SELECT SUM(amount_paid) as current_revenue_method
FROM user_subscriptions
WHERE amount_paid IS NOT NULL;

-- Correct revenue calculation from events
SELECT SUM((metadata->>'amountPaid')::numeric) as correct_revenue_method
FROM subscription_events
WHERE event_type IN ('subscription_created', 'subscription_upgraded')
  AND metadata->>'amountPaid' IS NOT NULL;

-- Discrepancy
SELECT 
  (SELECT SUM(amount_paid) FROM user_subscriptions WHERE amount_paid IS NOT NULL) as reported_revenue,
  (SELECT SUM((metadata->>'amountPaid')::numeric) FROM subscription_events 
   WHERE event_type IN ('subscription_created', 'subscription_upgraded') 
   AND metadata->>'amountPaid' IS NOT NULL) as actual_revenue,
  ((SELECT SUM((metadata->>'amountPaid')::numeric) FROM subscription_events 
    WHERE event_type IN ('subscription_created', 'subscription_upgraded') 
    AND metadata->>'amountPaid' IS NOT NULL) - 
   (SELECT SUM(amount_paid) FROM user_subscriptions WHERE amount_paid IS NOT NULL)) as understatement;
```

---

## 9. Appendix: File Reference Index

### Database Schema Files
- `shared/schema.ts` - All table definitions
- `migrations/0005_add_payment_tracking.sql` - Payment fields in user_subscriptions
- `migrations/0006_add_subscription_events.sql` - Subscription events audit table
- `migrations/0007_add_failed_payments.sql` - Failed payments tracking
- `migrations/0004_add_webhook_events_table.sql` - Webhook deduplication

### Payment Flow Files
- `server/controllers/payment.controller.ts` - Payment endpoints (create-order, verify, webhook)
- `server/services/domain/payment-transaction.service.ts` - Transaction processing with locking
- `server/services/domain/proration.service.ts` - Upgrade proration calculations
- `server/services/integration/razorpay.service.ts` - Razorpay API integration
- `server/middleware/webhook-security.ts` - Webhook IP whitelist and rate limiting

### Analytics Files
- `server/services/domain/subscription-analytics.service.ts` - Revenue and subscription metrics
- `server/controllers/admin.controller.ts` - Admin analytics endpoints
- `server/routes/admin.routes.ts` - Admin route definitions
- `server/routes/analytics.routes.ts` - Analytics route definitions

### Audit/Event Files
- `server/services/infrastructure/subscription-audit.service.ts` - Event logging service
- `server/services/infrastructure/subscription-audit-outbox.service.ts` - Outbox pattern implementation
- `server/services/infrastructure/subscription-audit-outbox-processor.ts` - Event processor
- `server/services/infrastructure/webhook-deduplication.service.ts` - Webhook deduplication

### Payment Failure Files
- `server/services/domain/payment-failure.service.ts` - Failed payment logging
- `server/services/domain/payment-alerting.service.ts` - Payment failure alerts

### Frontend Files
- `client/src/components/admin/LifetimeAnalyticsDashboard.tsx` - Lifetime metrics display
- `client/src/pages/admin/SubscriptionAnalytics.tsx` - Subscription analytics page
- `client/src/pages/admin/PlanAnalytics.tsx` - Plan analytics page
- `client/src/hooks/useRazorpayCheckout.tsx` - Razorpay checkout integration

---

## Report End

**Generated**: November 09, 2025  
**Investigation Scope**: Complete payment tracking system analysis  
**Status**: ✅ Comprehensive investigation completed  
**Next Steps**: Review findings and develop fix plan based on recommendations
