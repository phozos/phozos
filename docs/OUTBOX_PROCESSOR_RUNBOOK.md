# Event Outbox Processor - Operations Runbook

## Overview

The Event Outbox Processor is a critical background worker that processes subscription audit events asynchronously using the Transactional Outbox Pattern. This runbook provides operational procedures for managing and troubleshooting the processor in production.

**Last Updated:** November 6, 2025  
**Component:** `SubscriptionAuditOutboxProcessor`  
**Location:** `server/services/infrastructure/subscription-audit-outbox-processor.ts`

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [System Architecture](#system-architecture)
3. [Monitoring Dashboard](#monitoring-dashboard)
4. [Common Operations](#common-operations)
5. [Troubleshooting Guide](#troubleshooting-guide)
6. [Manual Intervention Procedures](#manual-intervention-procedures)
7. [Emergency Procedures](#emergency-procedures)
8. [Escalation Contacts](#escalation-contacts)

---

## Quick Reference

### Key Metrics Thresholds

| Metric | Normal | Warning | Critical | Action Required |
|--------|--------|---------|----------|-----------------|
| Pending Events | < 100 | 100-1000 | > 1000 | Investigate worker health |
| Processing Lag | < 30s | 30-60s | > 60s | Check worker status |
| DLQ Count | < 10 | 10-50 | > 50 | Review failed events |
| Throughput | > 10 events/min | 5-10 events/min | < 5 events/min | Check database performance |

### Configuration Values

```typescript
pollIntervalMs: 2000        // Poll every 2 seconds
batchSize: 10               // Process 10 events per batch
maxRetries: 5               // Retry up to 5 times
retryDelays: [1s, 2s, 4s, 8s, 16s]  // Exponential backoff
```

### Environment Variables

```bash
ENABLE_OUTBOX_PROCESSOR=true   # Default: enabled
```

---

## System Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Payment Transaction                       │
│            (payment-transaction.service.ts)                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Writes to outbox
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              subscription_audit_outbox Table                 │
│  Status: pending → processing → completed/failed             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Polled every 2 seconds
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           Outbox Processor Worker (Background)               │
│  - Polls for pending events                                  │
│  - Processes in batches of 10                                │
│  - Implements retry logic with exponential backoff           │
│  - Moves to DLQ after max retries                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Creates audit records
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              subscription_events Table                       │
│            (Permanent audit trail)                           │
└─────────────────────────────────────────────────────────────┘
```

### Worker Lifecycle

1. **Start**: Worker begins polling every 2 seconds
2. **Poll**: Fetches up to 10 pending events
3. **Process**: For each event:
   - Mark as `processing`
   - Create subscription_events record
   - Mark as `completed`
4. **Retry**: On failure:
   - Increment retry count
   - Calculate next retry time (exponential backoff)
   - Store error message
5. **DLQ**: After 5 failed retries:
   - Mark as `failed` (Dead Letter Queue)
   - Requires manual intervention

---

## Monitoring Dashboard

### Access the Dashboard

**URL:** `/admin/outbox-monitoring`  
**Authentication:** Admin role required

### Dashboard Sections

#### 1. Overview Tab
- **Real-time Metrics**: Updates every 5 seconds
  - Pending Events
  - Processing Lag (seconds)
  - DLQ Count
  - Retry Count
  - Throughput (events/minute)
  - Worker Health Status

- **Visual Charts**:
  - Status Distribution (Pending vs DLQ)
  - Processing trends

#### 2. Events Tab
- **Event List**: Paginated table showing all outbox events
- **Filters**:
  - Status: All, Pending, Processing, Completed, Failed
  - Search: Filter by subscription ID, user ID, or event ID
- **Actions**:
  - Retry: Queue event for immediate reprocessing
  - Delete: Remove event from outbox (use with caution)

#### 3. DLQ Tab
- **Failed Events Only**: Shows events that exceeded max retries
- **Investigation Details**:
  - Error messages
  - Retry history
  - Event metadata
- **Bulk Actions**:
  - Retry all DLQ events
  - Export for analysis

### Dashboard Alerts

The dashboard displays visual alerts for:

- **High Pending Events** (> 1000): Orange badge with warning icon
- **High Processing Lag** (> 60s): Red badge with alert icon
- **DLQ Increase** (> 10 events in 30s): Flashing red alert banner

---

## Common Operations

### 1. Restart the Outbox Processor

The outbox processor is automatically started when the server starts. To restart:

#### Via Server Restart (Recommended)
```bash
# Restart the entire application
# In production, use your deployment platform's restart command
npm run dev  # Development
pm2 restart app  # Production with PM2
```

#### Via Code (Development Only)
```typescript
import { outboxProcessor } from './services/infrastructure/subscription-audit-outbox-processor';

// Stop the processor
outboxProcessor.stop();

// Start the processor
outboxProcessor.start();
```

#### Verification
```bash
# Check logs for startup message
tail -f logs/combined.log | grep "outbox processor"

# Expected output:
# "Starting subscription audit outbox processor"
# "Subscription audit outbox processor started successfully"
```

### 2. Check Worker Status

#### Via Monitoring Dashboard
1. Navigate to `/admin/outbox-monitoring`
2. Check "Worker Health" indicator in Overview tab
3. Green = Running, Red = Stopped or Unhealthy

#### Via Database Query
```sql
-- Check recent processing activity
SELECT 
  status,
  COUNT(*) as count,
  MAX(created_at) as latest_created,
  MAX(processed_at) as latest_processed
FROM subscription_audit_outbox
GROUP BY status;
```

#### Via Logs
```bash
# Check for recent processing logs
tail -f logs/combined.log | grep "Processing outbox event"
```

### 3. Handle Dead Letter Queue (DLQ) Events

#### Investigate Failed Events

1. **Access DLQ Tab** in monitoring dashboard
2. **Review Error Messages** for each failed event
3. **Common Failure Reasons**:
   - Foreign key constraint violation (subscription doesn't exist)
   - Invalid data in metadata field
   - Database connection timeout
   - Serialization conflict

#### Retry Single DLQ Event

**Via Dashboard:**
1. Navigate to DLQ tab
2. Click "Retry" button on the event row
3. Event status changes from `failed` → `pending`
4. Processor will pick it up in the next poll cycle

**Via API:**
```bash
curl -X POST https://your-domain.com/api/admin/outbox/events/{EVENT_ID}/retry \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN"
```

#### Retry All DLQ Events

```sql
-- Reset all failed events to pending
UPDATE subscription_audit_outbox
SET 
  status = 'pending',
  retries = 0,
  next_retry_at = NULL,
  error_message = NULL
WHERE status = 'failed';
```

⚠️ **Warning**: Only retry all DLQ events after fixing the underlying issue.

#### Delete Irrecoverable Events

If an event cannot be processed due to data corruption or invalid subscription:

**Via Dashboard:**
1. Navigate to DLQ tab
2. Click "Delete" button on the event row
3. Confirm deletion

**Via API:**
```bash
curl -X DELETE https://your-domain.com/api/admin/outbox/events/{EVENT_ID} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN"
```

⚠️ **Warning**: Deletion is permanent and cannot be undone.

---

## Troubleshooting Guide

### Issue 1: Worker Not Processing Events

**Symptoms:**
- Pending events count increasing
- `processed_at` timestamps not updating
- No processing logs

**Diagnosis Steps:**
1. Check if processor is enabled:
   ```bash
   echo $ENABLE_OUTBOX_PROCESSOR
   # Should output: true (or be empty, which defaults to true)
   ```

2. Check worker status in logs:
   ```bash
   grep "outbox processor" logs/combined.log | tail -20
   ```

3. Verify no database connection issues:
   ```bash
   grep "database" logs/error.log | tail -20
   ```

**Resolution:**

**A. Processor Disabled**
```bash
# Set environment variable
export ENABLE_OUTBOX_PROCESSOR=true

# Restart server
npm run dev
```

**B. Worker Crashed**
```bash
# Check for error logs
grep -A 10 "Error during batch processing" logs/error.log

# Restart server
npm run dev
```

**C. Database Connection Lost**
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# If database is up, restart server
npm run dev
```

### Issue 2: High Processing Lag (> 60 seconds)

**Symptoms:**
- Events created long ago still showing as `pending`
- Large gap between `created_at` and `processed_at`

**Diagnosis Steps:**
1. Check pending event count:
   ```sql
   SELECT COUNT(*) FROM subscription_audit_outbox WHERE status = 'pending';
   ```

2. Check database performance:
   ```sql
   SELECT 
     schemaname,
     tablename,
     seq_scan,
     idx_scan,
     n_tup_ins,
     n_tup_upd
   FROM pg_stat_user_tables
   WHERE tablename = 'subscription_audit_outbox';
   ```

3. Check for lock contention:
   ```sql
   SELECT 
     l.locktype,
     l.mode,
     l.granted,
     a.query
   FROM pg_locks l
   JOIN pg_stat_activity a ON l.pid = a.pid
   WHERE l.relation = 'subscription_audit_outbox'::regclass;
   ```

**Resolution:**

**A. Increase Batch Size (Temporary)**
```typescript
// In outbox-processor.config.ts
export const outboxConfig = {
  batchSize: 50,  // Increase from 10 to 50
  // ... other config
};

// Restart server
```

⚠️ **Warning**: Higher batch sizes increase memory usage and transaction time.

**B. Add More Worker Instances**
```bash
# Run multiple server instances (if using clustered deployment)
# Ensure each instance processes different events using distributed locking
```

**C. Optimize Database**
```sql
-- Analyze table for query optimization
ANALYZE subscription_audit_outbox;

-- Rebuild indexes if needed
REINDEX TABLE subscription_audit_outbox;
```

### Issue 3: DLQ Growth (> 50 events)

**Symptoms:**
- Large number of events in `failed` status
- Repeated error messages in logs

**Diagnosis Steps:**
1. **Identify Common Error Patterns:**
   ```sql
   SELECT 
     error_message,
     COUNT(*) as occurrence_count,
     MIN(created_at) as first_seen,
     MAX(created_at) as last_seen
   FROM subscription_audit_outbox
   WHERE status = 'failed'
   GROUP BY error_message
   ORDER BY occurrence_count DESC
   LIMIT 10;
   ```

2. **Check for Data Integrity Issues:**
   ```sql
   -- Find events with non-existent subscriptions
   SELECT o.*
   FROM subscription_audit_outbox o
   LEFT JOIN user_subscriptions s ON o.subscription_id = s.id
   WHERE o.status = 'failed' AND s.id IS NULL;
   ```

**Resolution:**

**A. Foreign Key Violations (Subscription Doesn't Exist)**
```sql
-- Delete events for non-existent subscriptions
DELETE FROM subscription_audit_outbox
WHERE status = 'failed'
  AND subscription_id NOT IN (SELECT id FROM user_subscriptions);
```

**B. Invalid Metadata**
```sql
-- Find events with invalid JSON metadata
SELECT id, metadata, error_message
FROM subscription_audit_outbox
WHERE status = 'failed'
  AND error_message LIKE '%JSON%';

-- Fix or delete these events manually
```

**C. Database Timeout Issues**
```sql
-- Increase statement timeout (PostgreSQL)
ALTER DATABASE your_db SET statement_timeout = '30s';

-- Retry failed events
UPDATE subscription_audit_outbox
SET status = 'pending', retries = 0
WHERE status = 'failed';
```

### Issue 4: Duplicate Events in subscription_events

**Symptoms:**
- Same event appears multiple times in `subscription_events` table
- Audit trail shows duplicate entries

**Diagnosis Steps:**
```sql
-- Find duplicate events
SELECT 
  subscription_id,
  event_type,
  created_at,
  COUNT(*) as count
FROM subscription_events
GROUP BY subscription_id, event_type, created_at
HAVING COUNT(*) > 1;
```

**Resolution:**

**A. Remove Duplicates (Keep Oldest)**
```sql
-- Delete duplicates, keeping the oldest entry
DELETE FROM subscription_events
WHERE id NOT IN (
  SELECT MIN(id)
  FROM subscription_events
  GROUP BY subscription_id, event_type, DATE_TRUNC('second', created_at)
);
```

**B. Prevent Future Duplicates**
```sql
-- Add unique constraint (optional, may conflict with legitimate cases)
CREATE UNIQUE INDEX idx_unique_subscription_event
ON subscription_events (subscription_id, event_type, created_at);
```

⚠️ **Warning**: This assumes each subscription can only have one event of a type at the same timestamp.

---

## Manual Intervention Procedures

### Procedure 1: Emergency Stop Worker

**When to Use:**
- Worker is causing database performance issues
- Processing incorrect data that needs investigation
- Critical bug discovered in processing logic

**Steps:**
```bash
# 1. Set environment variable to disable processor
export ENABLE_OUTBOX_PROCESSOR=false

# 2. Restart server
npm run dev

# 3. Verify worker is stopped
grep "Outbox processor is disabled" logs/combined.log
```

**Verification:**
```sql
-- Check that no events are being processed
SELECT COUNT(*)
FROM subscription_audit_outbox
WHERE status = 'processing'
  AND updated_at > NOW() - INTERVAL '1 minute';

-- Should return 0
```

### Procedure 2: Batch Retry Failed Events

**When to Use:**
- After fixing a systemic issue causing failures
- After database maintenance
- After deploying a bug fix

**Steps:**

1. **Identify Events to Retry:**
   ```sql
   -- Find failed events from a specific time range
   SELECT id, subscription_id, event_type, error_message
   FROM subscription_audit_outbox
   WHERE status = 'failed'
     AND created_at >= '2025-11-01'
     AND created_at < '2025-11-07';
   ```

2. **Reset to Pending:**
   ```sql
   UPDATE subscription_audit_outbox
   SET 
     status = 'pending',
     retries = 0,
     next_retry_at = NULL,
     error_message = NULL
   WHERE status = 'failed'
     AND created_at >= '2025-11-01'
     AND created_at < '2025-11-07';
   ```

3. **Monitor Processing:**
   ```bash
   # Watch logs for processing activity
   tail -f logs/combined.log | grep "Processing outbox event"
   ```

4. **Verify Success:**
   ```sql
   -- Check completion rate
   SELECT 
     status,
     COUNT(*) as count
   FROM subscription_audit_outbox
   WHERE created_at >= '2025-11-01'
     AND created_at < '2025-11-07'
   GROUP BY status;
   ```

### Procedure 3: Manual Event Creation

**When to Use:**
- Recovering from a catastrophic failure
- Backfilling missing audit events
- Testing processor functionality

**Steps:**

1. **Gather Required Information:**
   - `subscription_id`: From `user_subscriptions` table
   - `user_id`: From `users` table
   - `event_type`: e.g., `subscription_created`, `subscription_upgraded`
   - `metadata`: JSON object with event details

2. **Insert Event:**
   ```sql
   INSERT INTO subscription_audit_outbox (
     subscription_id,
     user_id,
     event_type,
     old_status,
     new_status,
     metadata,
     status,
     retries
   ) VALUES (
     'uuid-of-subscription',
     'uuid-of-user',
     'subscription_created',
     NULL,
     'active',
     '{"planId": "uuid", "planName": "Premium", "tierLevel": 2}'::jsonb,
     'pending',
     0
   );
   ```

3. **Verify Processing:**
   ```bash
   # Wait for processor to pick it up (max 2 seconds)
   sleep 3
   
   # Check if processed
   psql $DATABASE_URL -c "
     SELECT status, processed_at 
     FROM subscription_audit_outbox 
     WHERE subscription_id = 'uuid-of-subscription'
     ORDER BY created_at DESC LIMIT 1;
   "
   ```

### Procedure 4: Purge Old Completed Events (Manual)

**When to Use:**
- Archival job is disabled
- Need to free up database space immediately
- Custom retention policy (default is 30 days)

**Steps:**

1. **Check Current Table Size:**
   ```sql
   SELECT 
     pg_size_pretty(pg_total_relation_size('subscription_audit_outbox')) as total_size,
     COUNT(*) as total_events,
     COUNT(*) FILTER (WHERE status = 'completed') as completed_events,
     MIN(created_at) as oldest_event,
     MAX(created_at) as newest_event
   FROM subscription_audit_outbox;
   ```

2. **Preview Events to Delete:**
   ```sql
   SELECT 
     status,
     COUNT(*) as count,
     MIN(processed_at) as oldest_processed
   FROM subscription_audit_outbox
   WHERE status = 'completed'
     AND processed_at < NOW() - INTERVAL '30 days'
   GROUP BY status;
   ```

3. **Delete Old Completed Events:**
   ```sql
   DELETE FROM subscription_audit_outbox
   WHERE status = 'completed'
     AND processed_at < NOW() - INTERVAL '30 days';
   ```

4. **Vacuum Table:**
   ```sql
   VACUUM ANALYZE subscription_audit_outbox;
   ```

---

## Emergency Procedures

### Emergency 1: Database Corruption

**Scenario:** Outbox table is corrupted or has invalid data.

**Immediate Actions:**
1. **Stop the Worker:**
   ```bash
   export ENABLE_OUTBOX_PROCESSOR=false
   npm run dev
   ```

2. **Backup Current State:**
   ```bash
   pg_dump $DATABASE_URL -t subscription_audit_outbox > outbox_backup_$(date +%Y%m%d_%H%M%S).sql
   ```

3. **Assess Damage:**
   ```sql
   -- Check for NULL violations
   SELECT * FROM subscription_audit_outbox WHERE subscription_id IS NULL OR user_id IS NULL;
   
   -- Check for invalid statuses
   SELECT * FROM subscription_audit_outbox WHERE status NOT IN ('pending', 'processing', 'completed', 'failed');
   ```

4. **Repair or Truncate:**
   ```sql
   -- Option A: Delete invalid entries
   DELETE FROM subscription_audit_outbox WHERE subscription_id IS NULL OR user_id IS NULL;
   
   -- Option B: Truncate and start fresh (DESTRUCTIVE!)
   TRUNCATE TABLE subscription_audit_outbox;
   ```

5. **Restart Worker:**
   ```bash
   export ENABLE_OUTBOX_PROCESSOR=true
   npm run dev
   ```

### Emergency 2: Infinite Retry Loop

**Scenario:** Events keep failing and retrying infinitely, consuming resources.

**Immediate Actions:**
1. **Identify Looping Events:**
   ```sql
   SELECT id, subscription_id, event_type, retries, error_message
   FROM subscription_audit_outbox
   WHERE retries > 10
   ORDER BY retries DESC;
   ```

2. **Move to Failed Status:**
   ```sql
   UPDATE subscription_audit_outbox
   SET status = 'failed', next_retry_at = NULL
   WHERE retries > 10;
   ```

3. **Investigate Root Cause:**
   - Check error messages for patterns
   - Verify database constraints
   - Review recent code changes

### Emergency 3: Complete Outage

**Scenario:** Worker completely down, thousands of pending events.

**Immediate Actions:**
1. **Assess Backlog:**
   ```sql
   SELECT 
     COUNT(*) as pending_count,
     MIN(created_at) as oldest_pending,
     NOW() - MIN(created_at) as max_lag
   FROM subscription_audit_outbox
   WHERE status = 'pending';
   ```

2. **Scale Up Processing:**
   ```typescript
   // Temporarily increase batch size
   export const outboxConfig = {
     batchSize: 100,  // Increase from 10
     pollIntervalMs: 1000,  // Decrease from 2000
   };
   ```

3. **Monitor Progress:**
   ```bash
   watch -n 5 "psql $DATABASE_URL -c \"SELECT status, COUNT(*) FROM subscription_audit_outbox GROUP BY status;\""
   ```

4. **Return to Normal:**
   ```typescript
   // After backlog is cleared, restore normal config
   export const outboxConfig = {
     batchSize: 10,
     pollIntervalMs: 2000,
   };
   ```

---

## Escalation Contacts

### Level 1: Operations Team
- **When to Escalate:** Worker not processing, high lag, DLQ growth
- **Contact:** ops-team@your-company.com
- **Response Time:** 15 minutes during business hours

### Level 2: Engineering Team
- **When to Escalate:** Database corruption, infinite loops, critical bugs
- **Contact:** engineering@your-company.com
- **Response Time:** 30 minutes during business hours, 2 hours off-hours

### Level 3: Database Administrator
- **When to Escalate:** Database performance issues, lock contention, query optimization
- **Contact:** dba@your-company.com
- **Response Time:** 1 hour

### Level 4: On-Call Engineer
- **When to Escalate:** Complete system outage, data loss risk
- **Contact:** oncall@your-company.com (PagerDuty)
- **Response Time:** Immediate

---

## Related Documentation

- [Outbox Pattern Architecture](./OUTBOX_PATTERN_ARCHITECTURE.md) - Technical design and implementation details
- [Outbox Operations Guide](./OUTBOX_OPERATIONS.md) - Daily, weekly, and monthly operational procedures
- [Payment Transaction Service](../server/services/domain/payment-transaction.service.ts) - Source code
- [Outbox Processor](../server/services/infrastructure/subscription-audit-outbox-processor.ts) - Source code
- [Monitoring Dashboard](../client/src/pages/admin/OutboxMonitoring.tsx) - UI source code

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-06 | System | Initial runbook creation |

---

**Note:** This runbook is a living document. Update it whenever operational procedures change or new issues are discovered.
