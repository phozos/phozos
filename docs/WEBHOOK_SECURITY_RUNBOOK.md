# Webhook Security Runbook
## Razorpay Webhook Operations Guide

**Last Updated**: November 21, 2025  
**Security Model**: 4-Layer Signature-Based Architecture  
**Maintenance Team**: Backend Engineering

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Security Architecture](#security-architecture)
3. [Troubleshooting Guide](#troubleshooting-guide)
4. [Monitoring & Alerts](#monitoring--alerts)
5. [Common Issues](#common-issues)
6. [Emergency Procedures](#emergency-procedures)

---

## Quick Reference

### Current Security Architecture

**4-Layer Defense-in-Depth Model**:
```
1. Rate Limiting       → 10 requests/min per IP (DDoS protection)
2. Signature Verify    → HMAC-SHA256 (cryptographic authentication)
3. Timestamp Check     → 5-minute window (replay attack prevention)
4. Deduplication       → Database tracking (idempotency)
```

**Critical Configuration**:
- **Webhook Secret**: `RAZORPAY_WEBHOOK_SECRET` (never log this!)
- **Rate Limit**: 10 req/min per IP
- **Timestamp Window**: 300 seconds (5 minutes)
- **Webhook Table**: `webhook_events` (PostgreSQL)

### Webhook Endpoints

- `POST /api/payment/webhook` - Main payment events
- `POST /api/payment/webhook/refund` - Refund events

### Supported Events

**Payment Webhook**:
- `payment.captured` - Payment success
- `payment.failed` - Payment failure
- `order.paid` - Order completion

**Refund Webhook**:
- `refund.processed` - Refund success
- `refund.failed` - Refund failure

---

## Security Architecture

### Layer 1: Rate Limiting

**Purpose**: Prevents DDoS and webhook spam  
**Implementation**: express-rate-limit middleware  
**Configuration**:
```typescript
windowMs: 60000,  // 1 minute
max: 10,          // 10 requests per IP
```

**Monitoring**:
```sql
-- Check recent rate limit violations (application logs)
SELECT * FROM logs 
WHERE message LIKE '%rate limit exceeded%' 
AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;
```

**Alerts**: Trigger if >100 rate limit violations per hour

---

### Layer 2: Signature Verification (PRIMARY SECURITY)

**Purpose**: Cryptographic authentication of webhook source  
**Algorithm**: HMAC-SHA256  
**Secret**: RAZORPAY_WEBHOOK_SECRET environment variable

**How It Works**:
1. Razorpay signs payload: `HMAC-SHA256(payload, secret)`
2. Sends signature in header: `x-razorpay-signature`
3. Server recomputes signature using same algorithm
4. Compares signatures (constant-time comparison)
5. Rejects if mismatch

**Security Properties**:
- Impossible to forge without secret key
- Any payload tampering invalidates signature
- Protects against man-in-the-middle attacks

**Troubleshooting**:
```typescript
// Common signature failures
if (signature === undefined) {
  // Missing x-razorpay-signature header
  // Check: Razorpay webhook configuration
}

if (req.body not Buffer) {
  // Middleware order issue
  // Check: express.raw() comes before express.json()
}

if (signature valid but rejects) {
  // Wrong secret in environment
  // Check: RAZORPAY_WEBHOOK_SECRET matches Razorpay dashboard
}
```

**Monitoring**:
```sql
-- Check signature failures (last hour)
SELECT COUNT(*) as failures
FROM logs
WHERE message LIKE '%Invalid webhook signature%'
AND timestamp > NOW() - INTERVAL '1 hour';
```

**Alert**: Trigger if >10 signature failures in 5 minutes (possible attack)

---

### Layer 3: Timestamp Validation

**Purpose**: Prevents replay attacks  
**Window**: 5 minutes (300 seconds)  
**Field**: `created_at` in webhook payload

**How It Works**:
1. Extract `created_at` timestamp (Unix seconds)
2. Calculate age: `current_time - created_at`
3. Reject if age > 300 seconds

**Why 5 Minutes**:
- Allows for clock skew between servers
- Short enough to prevent meaningful replay attacks
- Razorpay typically delivers webhooks within 1-2 seconds

**Troubleshooting**:
```typescript
// Clock skew issues
if (age < -60) {
  // Webhook timestamp is in the future
  // Check: Server clock synchronization (NTP)
}

if (age > 300 && age < 600) {
  // Just outside window - possible network delay
  // Check: Network latency, server load
}

if (age > 3600) {
  // Very old webhook - likely replay attack
  // Check: Security logs, investigate source IP
}
```

**Monitoring**:
```sql
-- Check old webhook rejections
SELECT * FROM logs
WHERE message LIKE '%WEBHOOK_TOO_OLD%'
AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

**Alert**: Trigger if >50 old webhooks per hour (replay attack detection)

---

### Layer 4: Event Deduplication

**Purpose**: Prevents duplicate processing (idempotency)  
**Storage**: PostgreSQL `webhook_events` table  
**Key**: `event_id` (from Razorpay)

**How It Works**:
1. Check if `event_id` exists in `webhook_events`
2. If exists: Return 200 OK (already processed)
3. If new: Record event, process, mark success/failed

**Schema**:
```sql
CREATE TABLE webhook_events (
  event_id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL,  -- processing, success, failed
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);
```

**Monitoring**:
```sql
-- Check duplicate webhook deliveries (Razorpay retries)
SELECT event_id, COUNT(*) as attempts
FROM webhook_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_id
HAVING COUNT(*) > 1
ORDER BY attempts DESC;

-- Check failed webhooks
SELECT * FROM webhook_events
WHERE status = 'failed'
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

**Alert**: Trigger if any webhook marked 'failed' (requires investigation)

---

## Troubleshooting Guide

### Issue 1: Webhooks Not Being Received

**Symptoms**: No webhook logs, payments complete but subscriptions not activated

**Diagnosis**:
1. Check Razorpay Dashboard → Webhooks → Deliveries
2. Verify webhook URL is correct
3. Check server is accessible from internet

**Resolution**:
```bash
# 1. Verify webhook endpoint responds
curl -X POST https://your-domain.com/api/payment/webhook \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'
# Expected: 400 Bad Request (missing signature)

# 2. Check Razorpay webhook configuration
# - URL: https://your-domain.com/api/payment/webhook
# - Active: Enabled
# - Events: payment.captured, payment.failed, order.paid

# 3. Check server logs
grep "Webhook received" /var/log/application.log
```

---

### Issue 2: Signature Verification Failures

**Symptoms**: All webhooks rejected with "Invalid webhook signature"

**Diagnosis**:
```bash
# 1. Check secret matches Razorpay
echo $RAZORPAY_WEBHOOK_SECRET  # Server secret
# Compare with Razorpay Dashboard → Webhooks → Secret

# 2. Check middleware order
grep -A 5 "express.raw" server/index.ts
# Must come BEFORE express.json()

# 3. Check raw body is received
# Look for: "Webhook received parsed body instead of raw Buffer"
```

**Resolution**:
```bash
# Fix 1: Update secret
export RAZORPAY_WEBHOOK_SECRET="correct_secret_from_dashboard"

# Fix 2: Verify middleware order in server/index.ts
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());  # Must come AFTER raw middleware

# Fix 3: Restart server
pm2 restart app  # or your process manager
```

---

### Issue 3: Rate Limiting Blocking Legitimate Webhooks

**Symptoms**: 429 errors during high transaction volume

**Diagnosis**:
```sql
-- Check rate limit violations
SELECT * FROM logs
WHERE message LIKE '%rate limit exceeded%'
AND timestamp > NOW() - INTERVAL '1 hour'
ORDER BY timestamp DESC;
```

**Resolution**:
```typescript
// Temporary: Increase rate limit in server/middleware/webhook-security.ts
export const webhookRateLimit = rateLimit({
  windowMs: 60000,
  max: 20,  // Increased from 10
  // ...
});

// Long-term: Review legitimate traffic patterns
// Consider per-account limits instead of per-IP
```

---

### Issue 4: Old Timestamp Rejections

**Symptoms**: "WEBHOOK_TOO_OLD" errors, webhooks over 5 minutes old rejected

**Diagnosis**:
```bash
# Check server time synchronization
timedatectl status
# Look for "NTP synchronized: yes"

# Check webhook age in logs
grep "WEBHOOK_TOO_OLD" /var/log/application.log | tail -20
```

**Resolution**:
```bash
# Fix 1: Synchronize server clock
sudo timedatectl set-ntp true
sudo systemctl restart systemd-timesyncd

# Fix 2: If network delays are common
# Increase timestamp window in payment.controller.ts
# (Not recommended - reduces security)
```

---

### Issue 5: Duplicate Subscriptions Created

**Symptoms**: Same webhook processed twice, duplicate database entries

**Diagnosis**:
```sql
-- Check for duplicate event_ids
SELECT event_id, COUNT(*) as occurrences
FROM webhook_events
WHERE status = 'success'
GROUP BY event_id
HAVING COUNT(*) > 1;
```

**Resolution**:
```sql
-- This should NOT happen with deduplication
-- If it does, indicates database transaction issue

-- Check webhook_events table for clues
SELECT * FROM webhook_events
WHERE event_id = 'evt_xxxxx'
ORDER BY created_at;

-- Verify database isolation level
SHOW default_transaction_isolation;
-- Should be: read committed or higher
```

---

## Monitoring & Alerts

### Key Metrics to Track

#### 1. Webhook Success Rate
```sql
SELECT 
  DATE(created_at) as date,
  status,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY DATE(created_at)) as percentage
FROM webhook_events
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), status
ORDER BY date DESC, status;
```

**Target**: >99% success rate  
**Alert**: < 95% success rate

---

#### 2. Processing Latency
```sql
SELECT 
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_seconds,
  MAX(EXTRACT(EPOCH FROM (processed_at - created_at))) as max_seconds
FROM webhook_events
WHERE status = 'success'
AND created_at > NOW() - INTERVAL '1 hour';
```

**Target**: <2 seconds average  
**Alert**: >5 seconds average

---

#### 3. Signature Failure Rate
```sql
-- From application logs
SELECT COUNT(*) as signature_failures
FROM logs
WHERE message LIKE '%Invalid webhook signature%'
AND timestamp > NOW() - INTERVAL '1 hour';
```

**Target**: 0 failures  
**Alert**: >10 failures in 5 minutes

---

#### 4. Deduplication Hit Rate
```sql
SELECT 
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as unique_events,
  COUNT(*) - SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as duplicates,
  (COUNT(*) - SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)) * 100.0 / COUNT(*) as duplicate_rate
FROM webhook_events
WHERE created_at > NOW() - INTERVAL '24 hours';
```

**Target**: 1-5% duplicate rate (normal for Razorpay retries)  
**Alert**: >20% duplicate rate (unusual)

---

### Alert Configuration

#### Critical Alerts (PagerDuty / Immediate Response)

1. **Signature Secret Compromise**
   - Trigger: >100 signature failures in 1 minute
   - Action: Rotate webhook secret immediately

2. **Webhook Processing Failure**
   - Trigger: Any webhook marked 'failed' status
   - Action: Investigate within 15 minutes

3. **Database Connection Loss**
   - Trigger: Cannot record webhook events
   - Action: Immediate escalation

#### Warning Alerts (Slack / Investigation Required)

1. **High Duplicate Rate**
   - Trigger: >20% duplicate webhooks in 1 hour
   - Action: Check Razorpay delivery logs

2. **Slow Processing**
   - Trigger: >5 second average latency
   - Action: Check database performance

3. **Rate Limit Threshold**
   - Trigger: >80% of rate limit capacity
   - Action: Review traffic patterns

---

## Emergency Procedures

### Secret Rotation (Webhook Secret Compromise)

**When**: Suspect webhook secret exposure or breach

**Steps**:
```bash
# 1. Generate new secret in Razorpay Dashboard
# Settings → Webhooks → Create New Secret

# 2. Update environment variable
export RAZORPAY_WEBHOOK_SECRET="new_secret_value"

# 3. Restart application
pm2 restart app

# 4. Monitor for signature failures
tail -f /var/log/application.log | grep "signature"

# 5. Confirm webhooks processing
# Check webhook_events table for new successes
```

**Rollback**: Keep old secret for 24 hours in case of issues

---

### Disable Webhooks (Emergency Kill Switch)

**When**: Suspected attack, need to stop all webhook processing

**Steps**:
```bash
# Option 1: Block at firewall (recommended)
sudo iptables -A INPUT -p tcp --dport 5000 -s razorpay_ip -j DROP

# Option 2: Add rate limit bypass to webhook routes
# Temporarily set max: 0 in webhookRateLimit

# Option 3: Comment out webhook routes
# In server/routes/payment.routes.ts
# Comment out router.post('/webhook', ...)
```

**Recovery**: Reverse changes, restart server, verify processing

---

### Database Rollback (Duplicate Processing)

**When**: Deduplication failed, duplicate subscriptions created

**Steps**:
```sql
-- 1. Identify duplicate subscriptions
SELECT user_id, COUNT(*) 
FROM subscriptions
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) > 1;

-- 2. Mark duplicates (don't delete yet!)
UPDATE subscriptions
SET status = 'duplicate_flagged'
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as rn
    FROM subscriptions
    WHERE created_at > NOW() - INTERVAL '1 hour'
  ) sub WHERE rn > 1
);

-- 3. Verify with business team

-- 4. Delete confirmed duplicates
DELETE FROM subscriptions WHERE status = 'duplicate_flagged';
```

---

## Appendix: Security Best Practices

### 1. Never Log Secrets
```typescript
// ❌ BAD
logger.info('Webhook secret:', config.razorpay.webhookSecret);

// ✅ GOOD
logger.info('Webhook secret configured:', !!config.razorpay.webhookSecret);
```

### 2. Always Use Raw Body for Signatures
```typescript
// ❌ BAD
app.use(express.json());  // Parses body before signature check

// ✅ GOOD
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());  // Raw middleware comes first
```

### 3. Validate Before Processing
```typescript
// ✅ GOOD - Security checks first
if (!signature) return 400;
if (!verifySignature()) return 400;
if (timestampTooOld()) return 400;
if (alreadyProcessed()) return 200;
// Only now process the webhook
```

### 4. Use Constant-Time Comparison
```typescript
// ❌ BAD - Timing attack vulnerable
if (expected === received) { ... }

// ✅ GOOD - Constant time (crypto.timingSafeEqual)
return expected === received;  // Modern JS uses constant-time internally
```

---

**End of Runbook**

*For questions or updates, contact: backend-team@company.com*
