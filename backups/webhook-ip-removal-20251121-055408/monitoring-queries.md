# Monitoring Queries & Success Metrics
## Webhook IP Whitelist Removal

**Date**: November 21, 2025  
**Purpose**: Production monitoring after deployment  
**Database**: PostgreSQL

---

## Quick Health Check (Run Every 5 Minutes)

### Overall Webhook Health

```sql
-- Quick status check for last 5 minutes
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM webhook_events
WHERE created_at > NOW() - INTERVAL '5 minutes'
GROUP BY status
ORDER BY count DESC;
```

**Expected**:
- `success`: >95%
- `processing`: <5%
- `failed`: <1%

**Alert If**: `failed` >5% or `success` <90%

---

## Detailed Monitoring Queries

### 1. Webhook Success Rate (Last Hour)

```sql
SELECT 
  DATE_TRUNC('minute', created_at) as minute,
  status,
  COUNT(*) as count
FROM webhook_events
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY DATE_TRUNC('minute', created_at), status
ORDER BY minute DESC, status;
```

**Visualization**: Time-series graph  
**Alert**: If any minute shows <80% success rate

---

### 2. Processing Latency

```sql
SELECT 
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_latency_seconds,
  MAX(EXTRACT(EPOCH FROM (processed_at - created_at))) as max_latency_seconds,
  MIN(EXTRACT(EPOCH FROM (processed_at - created_at))) as min_latency_seconds,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (processed_at - created_at))) as p95_latency_seconds
FROM webhook_events
WHERE status = 'success'
AND created_at > NOW() - INTERVAL '1 hour';
```

**Expected**:
- avg_latency_seconds: <2
- max_latency_seconds: <10
- p95_latency_seconds: <5

**Alert**: If avg >5 seconds or max >30 seconds

---

### 3. Event Type Distribution

```sql
SELECT 
  event_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM webhook_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY count DESC;
```

**Expected Event Types**:
- payment.captured: Most common
- payment.failed: <10% of payment.captured
- order.paid: Similar to payment.captured
- refund.processed: Variable
- refund.failed: Rare

---

### 4. Failed Webhooks (Last 24 Hours)

```sql
SELECT 
  event_id,
  event_type,
  error_message,
  created_at,
  processed_at
FROM webhook_events
WHERE status = 'failed'
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

**Expected**: 0-5 failed webhooks per day  
**Alert**: If >10 failed webhooks in 1 hour

---

### 5. Duplicate Event Detection

```sql
SELECT 
  event_id,
  event_type,
  COUNT(*) as occurrences,
  MIN(created_at) as first_received,
  MAX(created_at) as last_received,
  MAX(created_at) - MIN(created_at) as time_between_duplicates
FROM webhook_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_id, event_type
HAVING COUNT(*) > 1
ORDER BY occurrences DESC, last_received DESC;
```

**Expected**: 1-5% duplicate rate (Razorpay retries)  
**Alert**: If duplicate rate >20%

---

### 6. Event Processing Timeline

```sql
SELECT 
  event_id,
  event_type,
  status,
  created_at,
  processed_at,
  EXTRACT(EPOCH FROM (processed_at - created_at)) as processing_seconds
FROM webhook_events
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 50;
```

**Use**: Identify slow-processing webhooks

---

### 7. Hourly Webhook Volume

```sql
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_webhooks,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM webhook_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;
```

**Use**: Identify traffic patterns and anomalies

---

## Application Log Queries

These queries search application logs (replace with your log query tool):

### 8. Signature Verification Failures

```bash
# Last 100 signature failures
grep "Invalid webhook signature" /var/log/application.log | tail -100

# Count failures in last hour
grep "Invalid webhook signature" /var/log/application.log | \
  grep "$(date -d '1 hour ago' +'%Y-%m-%d %H')" | \
  wc -l
```

**Expected**: 0 failures for production webhooks  
**Alert**: If >10 failures in 5 minutes

---

### 9. Rate Limit Violations

```bash
# Recent rate limit violations
grep "rate limit exceeded" /var/log/application.log | tail -50

# Count violations in last hour
grep "rate limit exceeded" /var/log/application.log | \
  grep "$(date -d '1 hour ago' +'%Y-%m-%d %H')" | \
  wc -l
```

**Expected**: 0-5 per hour (normal traffic)  
**Alert**: If >100 per hour (possible attack)

---

### 10. Timestamp Validation Failures

```bash
# Old webhook rejections
grep "WEBHOOK_TOO_OLD" /var/log/application.log | tail -50

# Count rejections in last hour
grep "WEBHOOK_TOO_OLD" /var/log/application.log | \
  grep "$(date -d '1 hour ago' +'%Y-%m-%d %H')" | \
  wc -l
```

**Expected**: 0 failures  
**Alert**: If >10 failures in 1 hour

---

## Success Metrics Dashboard

### Key Performance Indicators (KPIs)

```sql
-- Comprehensive KPI query
WITH webhook_stats AS (
  SELECT 
    COUNT(*) as total_webhooks,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_webhooks,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_webhooks,
    AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_latency_seconds
  FROM webhook_events
  WHERE created_at > NOW() - INTERVAL '1 hour'
)
SELECT 
  total_webhooks,
  successful_webhooks,
  failed_webhooks,
  ROUND(successful_webhooks * 100.0 / NULLIF(total_webhooks, 0), 2) as success_rate_percentage,
  ROUND(avg_latency_seconds, 2) as avg_latency_seconds
FROM webhook_stats;
```

**Dashboard Display**:
```
┌─────────────────────────────────────────┐
│ Webhook Health (Last Hour)              │
├─────────────────────────────────────────┤
│ Total Webhooks:        1,234            │
│ Successful:            1,227 (99.43%)   │
│ Failed:                7 (0.57%)        │
│ Avg Latency:           1.23s            │
└─────────────────────────────────────────┘
```

---

## Comparison Metrics (Before vs After)

### Before Deployment (With IP Whitelist)

```sql
-- Get baseline metrics from before deployment
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
  ROUND(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate,
  ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - created_at))), 2) as avg_latency
FROM webhook_events
WHERE created_at BETWEEN '2025-11-20 00:00:00' AND '2025-11-21 05:54:00'  -- Before deployment
```

### After Deployment (Signature Only)

```sql
-- Get metrics after deployment
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
  ROUND(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate,
  ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - created_at))), 2) as avg_latency
FROM webhook_events
WHERE created_at > '2025-11-21 06:00:00';  -- After deployment
```

**Compare**: Ensure success_rate and avg_latency are similar or better

---

## Alert Thresholds

### Critical Alerts (Immediate Action)

| Metric | Threshold | Action |
|--------|-----------|--------|
| Webhook success rate | <90% | Investigate immediately, consider rollback |
| Signature failures | >10/min | Possible secret mismatch or attack |
| Processing latency | >10s avg | Database/performance issue |
| Failed webhooks | >20/hour | System malfunction |

### Warning Alerts (Investigation Needed)

| Metric | Threshold | Action |
|--------|-----------|--------|
| Webhook success rate | 90-95% | Investigate within 30 minutes |
| Duplicate rate | >20% | Check Razorpay retry behavior |
| Processing latency | 5-10s avg | Monitor, optimize if persistent |
| Rate limit hits | >100/hour | Review traffic patterns |

---

## Monitoring Tools Integration

### Grafana Dashboard Query Examples

```sql
-- Prometheus-style metrics (if using metric exporter)

-- Webhook success rate (gauge)
webhook_success_rate{job="webhook-processor"} = 
  SELECT SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)
  FROM webhook_events
  WHERE created_at > NOW() - INTERVAL '5 minutes';

-- Webhook processing latency (histogram)
webhook_processing_duration_seconds{job="webhook-processor"} = 
  SELECT EXTRACT(EPOCH FROM (processed_at - created_at))
  FROM webhook_events
  WHERE created_at > NOW() - INTERVAL '5 minutes';

-- Webhook total count (counter)
webhook_total{status="success"} = 
  SELECT COUNT(*) FROM webhook_events WHERE status='success';
webhook_total{status="failed"} = 
  SELECT COUNT(*) FROM webhook_events WHERE status='failed';
```

---

## Daily Report Query

```sql
-- Daily summary report
WITH daily_stats AS (
  SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_webhooks,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
    AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_latency,
    MAX(EXTRACT(EPOCH FROM (processed_at - created_at))) as max_latency
  FROM webhook_events
  WHERE created_at > NOW() - INTERVAL '30 days'
  GROUP BY DATE(created_at)
)
SELECT 
  date,
  total_webhooks,
  successful,
  failed,
  ROUND(successful * 100.0 / total_webhooks, 2) as success_rate,
  ROUND(avg_latency, 2) as avg_latency_seconds,
  ROUND(max_latency, 2) as max_latency_seconds
FROM daily_stats
ORDER BY date DESC;
```

**Email daily to**: engineering-team@company.com

---

## Success Criteria Validation

After 7 days of deployment, validate these criteria:

```sql
-- Success criteria check (7 days post-deployment)
WITH deployment_metrics AS (
  SELECT 
    ROUND(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate,
    ROUND(AVG(EXTRACT(EPOCH FROM (processed_at - created_at))), 2) as avg_latency,
    COUNT(*) as total_webhooks,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as total_failures
  FROM webhook_events
  WHERE created_at > NOW() - INTERVAL '7 days'
)
SELECT 
  success_rate,
  CASE WHEN success_rate >= 99 THEN '✅ PASS' ELSE '❌ FAIL' END as success_rate_check,
  avg_latency,
  CASE WHEN avg_latency < 2 THEN '✅ PASS' ELSE '❌ FAIL' END as latency_check,
  total_webhooks,
  total_failures,
  CASE WHEN total_failures = 0 THEN '✅ PASS' ELSE '⚠️ REVIEW' END as failure_check
FROM deployment_metrics;
```

**Pass Criteria**:
- Success rate: ≥99% ✅
- Avg latency: <2 seconds ✅
- Zero critical failures ✅

---

**End of Monitoring Queries Document**
