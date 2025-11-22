# Event Outbox Pattern - Operations Guide

## Overview

This document provides operational procedures and checklists for monitoring and maintaining the Event Outbox Pattern implementation. It covers daily, weekly, and monthly tasks, key metrics, alert responses, and performance tuning.

**Last Updated:** November 6, 2025  
**Audience:** Operations Teams, DevOps, Site Reliability Engineers  
**Related Docs:** [Runbook](./OUTBOX_PROCESSOR_RUNBOOK.md), [Architecture](./OUTBOX_PATTERN_ARCHITECTURE.md)

---

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Weekly Maintenance](#weekly-maintenance)
3. [Monthly Review](#monthly-review)
4. [Key Metrics to Watch](#key-metrics-to-watch)
5. [Alert Response Procedures](#alert-response-procedures)
6. [Performance Tuning](#performance-tuning)
7. [Capacity Planning](#capacity-planning)
8. [Incident Response](#incident-response)

---

## Daily Operations

### Morning Health Check (15 minutes)

**Time:** Start of business day (9:00 AM)

#### Checklist

- [ ] **1. Access Monitoring Dashboard**
  - Navigate to `/admin/outbox-monitoring`
  - Verify dashboard loads without errors

- [ ] **2. Review Key Metrics**
  - Pending Events: Should be < 100
  - Processing Lag: Should be < 30 seconds
  - DLQ Count: Note any increase from yesterday
  - Worker Health: Should show green "Running" status
  - Throughput: Should be consistent with historical average

- [ ] **3. Check for Visual Alerts**
  - No orange badges (high pending)
  - No red badges (high lag)
  - No flashing DLQ alerts

- [ ] **4. Review Error Logs**
  ```bash
  # Check for processor errors in the last 24 hours
  grep -A 5 "Error during batch processing" logs/error.log | tail -50
  
  # Check for high retry counts
  grep "retry" logs/combined.log | grep "$(date +%Y-%m-%d)" | wc -l
  ```

- [ ] **5. Verify Archival Job Ran**
  ```bash
  # Check if archival ran at 2 AM
  grep "Archival job completed" logs/combined.log | tail -1
  
  # Expected format: "2025-11-06 02:00:15 Archival job completed successfully"
  ```

#### Expected Results

✅ **Healthy System:**
- Pending events: 0-50
- Processing lag: < 10 seconds
- No DLQ growth in last 24 hours
- Worker running continuously
- No error spikes in logs

⚠️ **Action Required:**
- Pending events: 100-1000 → Monitor closely, review in 1 hour
- DLQ count increased by > 5 → Investigate failed events
- Worker health: Red → Restart worker immediately

#### Documentation

Record findings in daily operations log:

```
Date: 2025-11-06
Time: 09:00
Operator: John Doe

Metrics:
- Pending: 12
- Lag: 4 seconds
- DLQ: 3 (no change from yesterday)
- Worker: Running

Notes:
- System healthy, no action required
- Archival job ran successfully at 02:00:15
```

---

### Mid-Day Spot Check (5 minutes)

**Time:** Mid-day (12:00 PM)

#### Quick Checklist

- [ ] **1. Check Pending Events**
  - Quick glance at dashboard
  - Should still be < 100

- [ ] **2. Verify Worker Still Running**
  - Green status in dashboard
  - Or check recent logs:
    ```bash
    tail logs/combined.log | grep "Processing outbox event"
    ```

- [ ] **3. Check for DLQ Growth**
  - Compare DLQ count to morning check
  - Alert if increased by > 10

#### Action if Anomalies Detected

- **Pending > 100:** Follow [High Pending Events Alert](#alert-1-high-pending-events) procedure
- **Worker Stopped:** Follow [Worker Down Alert](#alert-2-worker-stopped) procedure
- **DLQ Growing:** Follow [DLQ Growth Alert](#alert-3-dlq-growth) procedure

---

### End of Day Review (10 minutes)

**Time:** End of business day (5:00 PM)

#### Checklist

- [ ] **1. Compare Metrics to Morning**
  - Note any trends (increasing pending, DLQ growth)
  - Document in operations log

- [ ] **2. Review Day's Failed Events**
  ```sql
  -- Count events that failed today
  SELECT COUNT(*)
  FROM subscription_audit_outbox
  WHERE status = 'failed'
    AND DATE(created_at) = CURRENT_DATE;
  ```

- [ ] **3. Check Event Processing Volume**
  ```sql
  -- Count events processed today
  SELECT COUNT(*)
  FROM subscription_audit_outbox
  WHERE status = 'completed'
    AND DATE(processed_at) = CURRENT_DATE;
  ```

- [ ] **4. Verify No Stuck Events**
  ```sql
  -- Find events stuck in 'processing' for > 1 hour
  SELECT id, subscription_id, created_at
  FROM subscription_audit_outbox
  WHERE status = 'processing'
    AND created_at < NOW() - INTERVAL '1 hour';
  ```

- [ ] **5. Prepare Handoff Notes**
  - Summarize any issues encountered
  - Document any manual interventions performed
  - Note any trends to watch

#### Daily Operations Report Template

```markdown
## Daily Outbox Operations Report

**Date:** 2025-11-06
**Operator:** John Doe

### Metrics Summary
| Metric | Morning | Mid-Day | End of Day | Trend |
|--------|---------|---------|------------|-------|
| Pending | 12 | 18 | 8 | Stable |
| Lag (s) | 4 | 6 | 3 | Stable |
| DLQ | 3 | 3 | 4 | +1 |
| Processed Today | - | - | 1,247 | Normal |

### Events
- **Total Processed:** 1,247 events
- **Failed Today:** 1 event
- **DLQ Growth:** +1 (subscription not found)

### Actions Taken
- None

### Issues
- One event failed due to deleted subscription (moved to DLQ)
- Reviewed and deleted DLQ event (subscription confirmed deleted by admin)

### Handoff Notes
- System healthy, no action required
- Watch DLQ count tomorrow morning
```

---

## Weekly Maintenance

### Weekly Deep Dive (60 minutes)

**Time:** Monday morning or Friday afternoon

#### Checklist

- [ ] **1. Review Weekly Metrics Trends**
  ```sql
  -- Weekly summary
  SELECT 
    DATE(created_at) as date,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_lag_seconds
  FROM subscription_audit_outbox
  WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY DATE(created_at)
  ORDER BY date;
  ```

- [ ] **2. Analyze DLQ Events**
  ```sql
  -- Categorize DLQ failures
  SELECT 
    SUBSTRING(error_message, 1, 50) as error_pattern,
    COUNT(*) as occurrence_count
  FROM subscription_audit_outbox
  WHERE status = 'failed'
    AND created_at >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY SUBSTRING(error_message, 1, 50)
  ORDER BY occurrence_count DESC;
  ```

- [ ] **3. Review Retry Patterns**
  ```sql
  -- Events that needed retries
  SELECT 
    retries,
    COUNT(*) as event_count
  FROM subscription_audit_outbox
  WHERE status = 'completed'
    AND retries > 0
    AND processed_at >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY retries
  ORDER BY retries;
  ```

- [ ] **4. Check Database Table Size**
  ```sql
  -- Table size and row counts
  SELECT 
    pg_size_pretty(pg_total_relation_size('subscription_audit_outbox')) as total_size,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    MIN(created_at) as oldest_event,
    MAX(created_at) as newest_event
  FROM subscription_audit_outbox;
  ```

- [ ] **5. Verify Index Health**
  ```sql
  -- Check index usage statistics
  SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
  FROM pg_stat_user_indexes
  WHERE tablename = 'subscription_audit_outbox'
  ORDER BY idx_scan DESC;
  ```

- [ ] **6. Review Archival Job Effectiveness**
  ```bash
  # Check archival logs for the week
  grep "Archival job completed" logs/combined.log | grep "$(date +%Y-%m)" | tail -7
  
  # Expected: 7 entries (one per day)
  ```

- [ ] **7. Test Manual Retry Procedure**
  - Identify a safe DLQ event (if any)
  - Retry it manually via dashboard
  - Verify successful processing

- [ ] **8. Update Documentation**
  - Note any new error patterns discovered
  - Document any workarounds applied
  - Update runbook if procedures changed

#### Weekly Report Template

```markdown
## Weekly Outbox Operations Report

**Week of:** 2025-11-04 to 2025-11-10
**Operator:** Operations Team

### Volume Metrics
- **Total Events Processed:** 8,734
- **Average Events/Day:** 1,248
- **Peak Day:** Tuesday (1,512 events)
- **Low Day:** Sunday (487 events)

### Performance Metrics
- **Average Processing Lag:** 3.2 seconds
- **Max Processing Lag:** 12 seconds (during peak)
- **Throughput:** 250 events/minute average

### DLQ Analysis
- **Total Failed Events:** 7
- **Common Errors:**
  - FK violation (subscription deleted): 4 events
  - Database timeout: 2 events
  - Invalid metadata: 1 event

### Actions Taken
- Deleted 4 DLQ events (confirmed subscriptions deleted)
- Retried 2 timeout events (successful)
- Escalated 1 invalid metadata event to engineering

### Database Health
- **Table Size:** 4.2 MB
- **Total Events:** 8,741 (7 pending, 8,734 completed, 7 failed)
- **Oldest Event:** 2025-10-11 (30 days ago)
- **Index Performance:** All indexes used efficiently

### Recommendations
- Continue monitoring FK violations (may indicate deletion without cleanup)
- Consider increasing retry timeout for database timeout errors
```

---

## Monthly Review

### Monthly Operations Review (2-3 hours)

**Time:** First Monday of the month

#### Comprehensive Checklist

- [ ] **1. Generate Monthly Metrics Report**
  ```sql
  -- Monthly summary
  SELECT 
    DATE_TRUNC('week', created_at) as week,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_lag_seconds,
    MAX(EXTRACT(EPOCH FROM (processed_at - created_at))) as max_lag_seconds
  FROM subscription_audit_outbox
  WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
  GROUP BY DATE_TRUNC('week', created_at)
  ORDER BY week;
  ```

- [ ] **2. Review All DLQ Events from Last Month**
  - Export DLQ events to CSV for analysis
  - Categorize by error type
  - Identify systemic issues

- [ ] **3. Analyze Performance Trends**
  - Plot daily throughput over the month
  - Identify any degradation or improvement
  - Correlate with application traffic patterns

- [ ] **4. Database Maintenance**
  ```sql
  -- Analyze table for query optimization
  ANALYZE subscription_audit_outbox;
  
  -- Check for index bloat
  SELECT 
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
  FROM pg_stat_user_indexes
  WHERE tablename = 'subscription_audit_outbox';
  
  -- Vacuum if needed (during low traffic)
  VACUUM ANALYZE subscription_audit_outbox;
  ```

- [ ] **5. Review Configuration**
  - Verify `outbox-processor.config.ts` settings are optimal
  - Consider adjustments based on traffic patterns
  - Document any proposed changes

- [ ] **6. Capacity Planning**
  - Project growth for next 3 months
  - Assess if current config will handle growth
  - Plan for scaling if needed

- [ ] **7. Disaster Recovery Drill**
  - Simulate worker failure and recovery
  - Test backup/restore procedures
  - Verify documentation is accurate

- [ ] **8. Security Review**
  - Verify admin dashboard access controls
  - Review audit logs for unauthorized access
  - Check for any suspicious DLQ patterns

- [ ] **9. Documentation Updates**
  - Update runbook with new procedures
  - Add new troubleshooting scenarios discovered
  - Update architecture docs if changes made

- [ ] **10. Stakeholder Report**
  - Prepare executive summary of monthly operations
  - Highlight any incidents or achievements
  - Propose improvements for next month

#### Monthly Report Template

```markdown
## Monthly Outbox Operations Report

**Month:** October 2025
**Prepared By:** Operations Team
**Date:** 2025-11-01

### Executive Summary
The Event Outbox Pattern performed reliably throughout October with 99.97% success rate. Total of 38,456 subscription events processed with an average latency of 2.8 seconds.

### Volume Metrics
| Week | Events Processed | Daily Average | Peak Day |
|------|------------------|---------------|----------|
| Week 1 | 9,234 | 1,319 | 1,502 |
| Week 2 | 10,112 | 1,445 | 1,678 |
| Week 3 | 9,876 | 1,411 | 1,589 |
| Week 4 | 9,234 | 1,319 | 1,445 |

**Total:** 38,456 events

### Performance Metrics
- **Average Processing Lag:** 2.8 seconds
- **95th Percentile Lag:** 5.2 seconds
- **99th Percentile Lag:** 8.7 seconds
- **Maximum Lag:** 14.3 seconds
- **Throughput:** 267 events/minute average

### Reliability Metrics
- **Success Rate:** 99.97%
- **Total Failures:** 12 events (0.03%)
- **Retry Success Rate:** 58% (7 out of 12 eventually succeeded)
- **DLQ Final Count:** 5 events (0.01%)

### DLQ Analysis
| Error Type | Count | Resolution |
|------------|-------|------------|
| FK violation (deleted subscription) | 3 | Deleted from DLQ |
| Database timeout | 1 | Retried successfully |
| Invalid metadata | 1 | Escalated to engineering |

### Incidents
**No major incidents this month.**

Minor Issues:
- Oct 15: Brief spike in pending events (cleared in 5 minutes)
- Oct 22: One database timeout during high load (auto-recovered)

### Database Health
- **Start of Month Table Size:** 3.8 MB
- **End of Month Table Size:** 4.1 MB
- **Growth:** 0.3 MB (8% monthly growth)
- **Archival Effectiveness:** 31 archival jobs ran successfully, deleted 35,120 old events

### Changes Implemented
- None this month

### Recommendations for Next Month
1. **No action required** - System performing within SLA
2. **Continue monitoring** FK violations for potential cleanup process improvement
3. **Plan capacity** review for Q1 2026 (projecting 20% traffic growth)

### Action Items
- [ ] Engineering to investigate invalid metadata error (JIRA-1234)
- [ ] Schedule Q1 capacity planning meeting
- [ ] Update disaster recovery documentation
```

---

## Key Metrics to Watch

### Critical Metrics (Check Daily)

#### 1. Pending Events Count

**What It Measures:** Number of events waiting to be processed

**Thresholds:**
- 🟢 **Normal:** 0-100
- 🟡 **Warning:** 100-1000
- 🔴 **Critical:** > 1000

**Action:**
- Warning: Monitor for 1 hour, check for trends
- Critical: Investigate worker health, consider scaling

**Query:**
```sql
SELECT COUNT(*) 
FROM subscription_audit_outbox 
WHERE status = 'pending';
```

#### 2. Processing Lag

**What It Measures:** Time between event creation and processing

**Thresholds:**
- 🟢 **Normal:** < 30 seconds
- 🟡 **Warning:** 30-60 seconds
- 🔴 **Critical:** > 60 seconds

**Action:**
- Warning: Check database performance
- Critical: Increase batch size or add workers

**Query:**
```sql
SELECT AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_lag_seconds
FROM subscription_audit_outbox
WHERE status = 'pending';
```

#### 3. Dead Letter Queue (DLQ) Count

**What It Measures:** Number of events that failed after max retries

**Thresholds:**
- 🟢 **Normal:** < 10
- 🟡 **Warning:** 10-50
- 🔴 **Critical:** > 50

**Action:**
- Warning: Review error messages, plan investigation
- Critical: Immediate investigation, may indicate systemic issue

**Query:**
```sql
SELECT COUNT(*) 
FROM subscription_audit_outbox 
WHERE status = 'failed';
```

#### 4. Worker Health Status

**What It Measures:** Whether the processor is running

**States:**
- 🟢 **Running:** Worker polling and processing
- 🔴 **Stopped:** Worker not running

**Action:**
- Stopped: Restart worker immediately

**Check:**
```bash
# Recent processing activity
tail logs/combined.log | grep "Processing outbox event"

# Or via dashboard: Check "Worker Health" indicator
```

---

### Performance Metrics (Check Weekly)

#### 5. Throughput (Events per Minute)

**What It Measures:** Event processing rate

**Baseline:** 250-300 events/minute

**Action:**
- Below baseline: Investigate performance degradation

**Query:**
```sql
SELECT 
  COUNT(*) / EXTRACT(EPOCH FROM (MAX(processed_at) - MIN(processed_at))) * 60 as events_per_minute
FROM subscription_audit_outbox
WHERE status = 'completed'
  AND processed_at >= NOW() - INTERVAL '1 hour';
```

#### 6. Retry Rate

**What It Measures:** Percentage of events that needed retries

**Baseline:** < 5%

**Action:**
- Above baseline: Investigate common failure causes

**Query:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE retries > 0) * 100.0 / COUNT(*) as retry_percentage
FROM subscription_audit_outbox
WHERE status = 'completed'
  AND processed_at >= NOW() - INTERVAL '7 days';
```

#### 7. Database Table Size

**What It Measures:** Storage consumed by outbox table

**Baseline:** 3-5 MB (with 30-day retention)

**Action:**
- Rapid growth: Verify archival job running
- Excessive size: Consider manual cleanup

**Query:**
```sql
SELECT pg_size_pretty(pg_total_relation_size('subscription_audit_outbox')) as total_size;
```

---

### Business Metrics (Check Monthly)

#### 8. Total Events Processed

**What It Measures:** Monthly volume of subscription events

**Use:** Capacity planning, growth tracking

**Query:**
```sql
SELECT COUNT(*)
FROM subscription_audit_outbox
WHERE status = 'completed'
  AND DATE_TRUNC('month', processed_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');
```

#### 9. Success Rate

**What It Measures:** Percentage of events successfully processed

**Target:** > 99.9%

**Query:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as success_rate
FROM subscription_audit_outbox
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');
```

#### 10. Average Processing Latency

**What It Measures:** End-to-end event processing time

**Target:** < 5 seconds

**Query:**
```sql
SELECT AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_latency_seconds
FROM subscription_audit_outbox
WHERE status = 'completed'
  AND processed_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');
```

---

## Alert Response Procedures

### Alert 1: High Pending Events (> 1000)

**Severity:** High  
**Response Time:** 15 minutes

#### Immediate Actions

1. **Verify Worker Status**
   ```bash
   grep "outbox processor" logs/combined.log | tail -20
   ```
   - If stopped: Restart worker
   - If running: Proceed to next step

2. **Check Database Performance**
   ```sql
   -- Check for long-running queries
   SELECT pid, query, state, query_start
   FROM pg_stat_activity
   WHERE query LIKE '%subscription_audit_outbox%'
     AND state != 'idle';
   ```

3. **Assess Backlog Size**
   ```sql
   SELECT 
     MIN(created_at) as oldest_pending,
     NOW() - MIN(created_at) as max_lag
   FROM subscription_audit_outbox
   WHERE status = 'pending';
   ```

4. **Temporary Mitigation** (if needed)
   ```typescript
   // Increase batch size (requires code change + restart)
   export const outboxConfig = {
     batchSize: 50,  // Increase from 10
     pollIntervalMs: 1000,  // Decrease from 2000
   };
   ```

#### Follow-up Actions

- Monitor pending count every 15 minutes
- Once backlog cleared, revert to normal config
- Document incident in operations log
- Investigate root cause (traffic spike, database issue, etc.)

#### Escalation

- If backlog not clearing after 1 hour: Escalate to engineering
- If database performance issue: Escalate to DBA

---

### Alert 2: Worker Stopped

**Severity:** Critical  
**Response Time:** Immediate

#### Immediate Actions

1. **Restart Worker**
   ```bash
   # In production
   pm2 restart app
   
   # In development
   npm run dev
   ```

2. **Verify Restart**
   ```bash
   grep "Subscription audit outbox processor started successfully" logs/combined.log | tail -1
   ```

3. **Check for Crash Logs**
   ```bash
   grep -A 20 "Error during batch processing" logs/error.log | tail -50
   ```

4. **Monitor Processing Resumption**
   ```bash
   tail -f logs/combined.log | grep "Processing outbox event"
   ```

#### Follow-up Actions

- Review crash logs for root cause
- If repeating crashes: Disable processor and escalate to engineering
- Document incident and root cause
- Plan preventive measures

#### Escalation

- If worker won't start: Escalate to on-call engineer immediately
- If crashes repeatedly: Escalate to engineering team

---

### Alert 3: DLQ Growth (> 10 new events in 30 minutes)

**Severity:** Medium  
**Response Time:** 30 minutes

#### Immediate Actions

1. **Identify Error Pattern**
   ```sql
   SELECT 
     error_message,
     COUNT(*) as count
   FROM subscription_audit_outbox
   WHERE status = 'failed'
     AND created_at >= NOW() - INTERVAL '30 minutes'
   GROUP BY error_message;
   ```

2. **Categorize Failures**
   - **FK Violations:** Likely deleted subscriptions (safe to delete)
   - **Database Timeouts:** May resolve with retry
   - **Invalid Data:** Requires investigation

3. **Take Appropriate Action**
   
   **For FK Violations:**
   ```sql
   -- Verify subscription deleted
   SELECT * FROM user_subscriptions WHERE id = '<subscription_id>';
   
   -- If confirmed deleted, remove from DLQ
   DELETE FROM subscription_audit_outbox WHERE id = '<event_id>';
   ```
   
   **For Timeouts:**
   ```sql
   -- Retry failed events
   UPDATE subscription_audit_outbox
   SET status = 'pending', retries = 0, error_message = NULL
   WHERE status = 'failed'
     AND error_message LIKE '%timeout%';
   ```
   
   **For Invalid Data:**
   - Export event details for engineering review
   - Create ticket with error details
   - Leave in DLQ until resolved

#### Follow-up Actions

- Monitor DLQ count for next 24 hours
- Document error patterns and resolutions
- If systemic issue identified: Escalate to engineering

#### Escalation

- If > 50 new DLQ events in 1 hour: Escalate to engineering
- If data corruption suspected: Escalate immediately

---

### Alert 4: High Processing Lag (> 60 seconds)

**Severity:** Medium  
**Response Time:** 30 minutes

#### Immediate Actions

1. **Check Pending Count**
   - If high: Follow [High Pending Events](#alert-1-high-pending-events) procedure
   - If normal: Proceed to next step

2. **Check Database Performance**
   ```sql
   -- Check for slow queries
   SELECT 
     query,
     mean_exec_time,
     calls
   FROM pg_stat_statements
   WHERE query LIKE '%subscription_audit_outbox%'
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

3. **Check for Lock Contention**
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

4. **Optimize if Needed**
   ```sql
   -- Analyze table
   ANALYZE subscription_audit_outbox;
   
   -- Rebuild indexes (during low traffic)
   REINDEX TABLE subscription_audit_outbox;
   ```

#### Follow-up Actions

- Monitor lag for next 2 hours
- If persistent: Plan database optimization during maintenance window
- Document findings in weekly report

#### Escalation

- If lag persists > 2 hours: Escalate to DBA
- If database performance degraded: Escalate to infrastructure team

---

## Performance Tuning

### Scenario 1: High Traffic (> 1000 events/hour)

**Symptoms:**
- Pending events growing
- Processing lag increasing
- Worker at capacity

**Recommended Config Changes:**

```typescript
// outbox-processor.config.ts
export const outboxConfig = {
  pollIntervalMs: 1000,  // Decrease from 2000 (poll more frequently)
  batchSize: 50,         // Increase from 10 (process more per batch)
  maxRetries: 5,         // Keep same
  retryDelays: [1000, 2000, 4000, 8000, 16000],  // Keep same
};
```

**Expected Impact:**
- Throughput: 500+ events/minute (vs. 300)
- Latency: < 2 seconds (vs. 3-5 seconds)
- Database load: +30% queries/second

**Risks:**
- Higher memory usage
- Increased database load
- Potential connection pool exhaustion

**Monitoring:**
- Watch database CPU and connection count
- Revert if database performance degrades

---

### Scenario 2: Low Traffic (< 100 events/hour)

**Symptoms:**
- Mostly idle
- Wasting resources

**Recommended Config Changes:**

```typescript
// outbox-processor.config.ts
export const outboxConfig = {
  pollIntervalMs: 5000,  // Increase from 2000 (poll less frequently)
  batchSize: 5,          // Decrease from 10 (smaller batches)
  maxRetries: 5,         // Keep same
  retryDelays: [2000, 4000, 8000, 16000, 32000],  // Longer delays
};
```

**Expected Impact:**
- Reduced database queries: 12/minute (vs. 30/minute)
- Latency: 5-10 seconds (vs. 2-5 seconds)
- Lower resource usage

---

### Scenario 3: High Failure Rate (> 10% retries)

**Symptoms:**
- Many events requiring retries
- DLQ growing steadily

**Recommended Config Changes:**

```typescript
// outbox-processor.config.ts
export const outboxConfig = {
  pollIntervalMs: 2000,  // Keep same
  batchSize: 10,         // Keep same
  maxRetries: 10,        // Increase from 5 (more retry attempts)
  retryDelays: [1000, 2000, 5000, 10000, 30000, 60000],  // Longer delays
};
```

**Expected Impact:**
- Fewer events reaching DLQ
- Longer total retry duration (~2 minutes vs. 31 seconds)
- More chances for transient issues to resolve

**Root Cause Investigation:**
- Analyze error messages for patterns
- Address systemic issues causing failures

---

### Scenario 4: Database Under Load

**Symptoms:**
- Slow queries on outbox table
- Processing lag increasing
- Database CPU high

**Recommended Config Changes:**

```typescript
// outbox-processor.config.ts
export const outboxConfig = {
  pollIntervalMs: 5000,  // Increase from 2000 (poll less frequently)
  batchSize: 5,          // Decrease from 10 (smaller transactions)
  maxRetries: 5,         // Keep same
  retryDelays: [2000, 4000, 8000, 16000, 32000],  // Longer delays
};
```

**Database Optimizations:**

```sql
-- Analyze table
ANALYZE subscription_audit_outbox;

-- Check index health
REINDEX TABLE subscription_audit_outbox;

-- Archive old completed events (manual trigger)
DELETE FROM subscription_audit_outbox
WHERE status = 'completed'
  AND processed_at < NOW() - INTERVAL '7 days';

-- Vacuum to reclaim space
VACUUM ANALYZE subscription_audit_outbox;
```

**Expected Impact:**
- Reduced database load
- Slower event processing (acceptable trade-off)

---

## Capacity Planning

### Current Capacity (Default Config)

**Maximum Throughput:**
- Theoretical: 300 events/minute
- Actual (measured): 250-280 events/minute
- Daily capacity: 400,000 events/day

**Current Usage:**
- Average: 1,200 events/day
- Peak: 2,000 events/day
- Utilization: 0.5% of capacity

### Growth Projections

#### Conservative (20% annual growth)

| Year | Events/Day | Events/Month | Capacity Used |
|------|------------|--------------|---------------|
| 2025 | 1,200 | 36,000 | 0.5% |
| 2026 | 1,440 | 43,200 | 0.6% |
| 2027 | 1,728 | 51,840 | 0.7% |
| 2028 | 2,074 | 62,208 | 0.8% |

**Recommendation:** No scaling needed for 3+ years

#### Aggressive (100% annual growth)

| Year | Events/Day | Events/Month | Capacity Used |
|------|------------|--------------|---------------|
| 2025 | 1,200 | 36,000 | 0.5% |
| 2026 | 2,400 | 72,000 | 1.0% |
| 2027 | 4,800 | 144,000 | 2.0% |
| 2028 | 9,600 | 288,000 | 4.0% |

**Recommendation:** Re-evaluate in 2027

### Scaling Strategies

#### Vertical Scaling (Config Tuning)
- **Increase to 500 events/minute:**
  - `batchSize: 50`
  - `pollIntervalMs: 1000`
  - Capacity: 720,000 events/day
  - Cost: Minimal (same infrastructure)

#### Horizontal Scaling (Multiple Workers)
- **Add 2nd worker instance:**
  - Implement distributed locking
  - Use `FOR UPDATE SKIP LOCKED`
  - Capacity: 2x (600 events/minute)
  - Cost: +1 server instance

#### Database Scaling
- **PostgreSQL Read Replicas:**
  - Read from replicas (not applicable for outbox pattern)
  - Write to primary (outbox requires writes)
  - Limited benefit for this use case

### Recommended Scaling Triggers

- **Yellow Alert (30% capacity):** Plan for vertical scaling
- **Orange Alert (50% capacity):** Implement vertical scaling
- **Red Alert (70% capacity):** Plan for horizontal scaling
- **Critical (90% capacity):** Implement horizontal scaling immediately

---

## Incident Response

### Incident Severity Levels

#### Severity 1: Critical

**Definition:** Complete outbox failure, no events processing

**Examples:**
- Worker completely down for > 1 hour
- Database corruption preventing all processing
- > 10,000 pending events

**Response:**
- **Response Time:** Immediate
- **Escalation:** On-call engineer via PagerDuty
- **Communication:** Notify stakeholders immediately

**Actions:**
1. Page on-call engineer
2. Stop worker to prevent data corruption
3. Assess damage (backup database)
4. Implement fix or rollback
5. Restart worker
6. Verify recovery
7. Post-incident review within 24 hours

#### Severity 2: High

**Definition:** Degraded performance, events processing slowly

**Examples:**
- Worker processing but high lag (> 5 minutes)
- DLQ growing rapidly (> 100 events/hour)
- Database performance degraded

**Response:**
- **Response Time:** 30 minutes
- **Escalation:** Engineering team during business hours
- **Communication:** Internal notification

**Actions:**
1. Assess impact and scope
2. Implement mitigation (config tuning, manual cleanup)
3. Monitor for improvement
4. Escalate if not resolving
5. Document findings

#### Severity 3: Medium

**Definition:** Minor issues, events still processing

**Examples:**
- Occasional DLQ events
- Brief lag spikes
- Non-critical errors in logs

**Response:**
- **Response Time:** 2 hours
- **Escalation:** Operations team
- **Communication:** Document in daily report

**Actions:**
1. Monitor for trends
2. Document error patterns
3. Plan investigation during maintenance window
4. Implement fix in next deployment

### Post-Incident Review Template

```markdown
## Incident Post-Mortem

**Incident ID:** INC-2025-001
**Date:** 2025-11-06
**Severity:** 2 (High)
**Duration:** 45 minutes
**Impact:** 2,000 events delayed by 10 minutes

### Timeline
- 14:00: Alert triggered (high pending events)
- 14:05: Operator investigates
- 14:15: Database slowdown identified
- 14:20: DBA engaged
- 14:30: Slow query identified and killed
- 14:35: Processing resumed
- 14:45: Backlog cleared

### Root Cause
Long-running analytics query on subscription_events table caused lock contention on subscription_audit_outbox table.

### Contributing Factors
- No query timeout set on analytics queries
- Lack of query monitoring on subscription_events table

### Resolution
- Killed long-running query
- Processing resumed normally
- Backlog cleared within 15 minutes

### Action Items
- [ ] Set query timeout for analytics queries (Owner: DBA, Due: 2025-11-13)
- [ ] Add monitoring for long-running queries (Owner: Ops, Due: 2025-11-13)
- [ ] Review query patterns on subscription_events (Owner: Engineering, Due: 2025-11-20)

### Lessons Learned
- Need better isolation between OLTP (outbox) and OLAP (analytics) workloads
- Consider read replica for analytics queries

### Stakeholder Communication
- Internal notification sent at 14:15
- Resolution confirmed at 14:45
- Post-mortem shared with team on 2025-11-07
```

---

## Related Documentation

- **[Outbox Processor Runbook](./OUTBOX_PROCESSOR_RUNBOOK.md)** - Detailed troubleshooting and manual intervention procedures
- **[Outbox Pattern Architecture](./OUTBOX_PATTERN_ARCHITECTURE.md)** - Technical design and implementation details
- **[Payment Transaction Service](../server/services/domain/payment-transaction.service.ts)** - Source code for payment flow
- **[Outbox Processor](../server/services/infrastructure/subscription-audit-outbox-processor.ts)** - Source code for worker
- **[Admin Monitoring Dashboard](../client/src/pages/admin/OutboxMonitoring.tsx)** - Monitoring UI source code

---

## Appendix

### Useful SQL Queries

```sql
-- Find events stuck in processing for > 1 hour
SELECT id, subscription_id, created_at, 
       NOW() - created_at as stuck_duration
FROM subscription_audit_outbox
WHERE status = 'processing'
  AND created_at < NOW() - INTERVAL '1 hour';

-- Calculate success rate for last 24 hours
SELECT 
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as success_rate,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_events
FROM subscription_audit_outbox
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- Find top error messages in DLQ
SELECT 
  SUBSTRING(error_message, 1, 100) as error,
  COUNT(*) as count
FROM subscription_audit_outbox
WHERE status = 'failed'
GROUP BY SUBSTRING(error_message, 1, 100)
ORDER BY count DESC
LIMIT 10;

-- Calculate average processing time by hour
SELECT 
  DATE_TRUNC('hour', processed_at) as hour,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_seconds,
  COUNT(*) as events_processed
FROM subscription_audit_outbox
WHERE status = 'completed'
  AND processed_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', processed_at)
ORDER BY hour;
```

---

**Document Version:** 1.0  
**Last Updated:** November 6, 2025  
**Next Review:** December 6, 2025  
**Maintained By:** Operations Team
