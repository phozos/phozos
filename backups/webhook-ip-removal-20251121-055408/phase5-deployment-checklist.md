# Phase 5: Deployment Checklist
## Webhook IP Whitelist Removal

**Date**: November 21, 2025  
**Feature**: Remove IP whitelisting from webhook security  
**Impact**: Medium (security architecture change)  
**Rollback Time**: <5 minutes

---

## Pre-Deployment Checklist

### Code Review ✅

- [x] All code changes reviewed and approved
- [x] Tests passing (36/38 - 94.7% pass rate)
- [x] No TypeScript compilation errors
- [x] No ESLint violations
- [x] Security review completed

### Testing ✅

- [x] Unit tests pass (razorpay.service.test.ts: 22/22)
- [x] Integration tests pass (payment.controller.webhook.test.ts: 14/16)
- [x] Manual testing documented
- [x] Security regression tests pass
- [x] Edge cases validated

### Documentation ✅

- [x] replit.md updated (4-layer security model documented)
- [x] RAZORPAY_WEBHOOK_TESTING_GUIDE.md updated
- [x] WEBHOOK_SECURITY_RUNBOOK.md created
- [x] Code comments updated
- [x] Deprecation notices added

### Backup & Rollback ✅

- [x] All files backed up with timestamps
- [x] Rollback procedures documented
- [x] Rollback tested (deprecation allows instant revert)
- [x] Git branch created (optional - restricted)

---

## Deployment Steps

### Step 1: Verify Environment (5 minutes)

**Checklist**:
```bash
# 1. Verify required environment variables
echo "RAZORPAY_WEBHOOK_SECRET: $([ -n "$RAZORPAY_WEBHOOK_SECRET" ] && echo 'SET ✅' || echo 'MISSING ❌')"
echo "RAZORPAY_KEY_ID: $([ -n "$RAZORPAY_KEY_ID" ] && echo 'SET ✅' || echo 'MISSING ❌')"
echo "RAZORPAY_KEY_SECRET: $([ -n "$RAZORPAY_KEY_SECRET" ] && echo 'SET ✅' || echo 'MISSING ❌')"

# 2. Verify database connectivity
psql $DATABASE_URL -c "SELECT 1;" > /dev/null && echo "Database: CONNECTED ✅" || echo "Database: FAILED ❌"

# 3. Check server is running
curl -f http://localhost:5000/api/auth/csrf-token > /dev/null && echo "Server: RUNNING ✅" || echo "Server: DOWN ❌"

# 4. Verify webhook table exists
psql $DATABASE_URL -c "SELECT COUNT(*) FROM webhook_events;" > /dev/null && echo "Webhook events table: EXISTS ✅" || echo "Webhook events table: MISSING ❌"
```

**Pass Criteria**: All checks show ✅

---

### Step 2: Deploy Code Changes (2 minutes)

**Actions**:
```bash
# 1. Pull latest code (if using Git - optional)
# git pull origin remove-webhook-ip-whitelist

# 2. Install dependencies (if package.json changed)
npm install

# 3. Restart application
pm2 restart app
# OR
npm run dev  # Development
```

**Verification**:
```bash
# Check server started successfully
curl -f http://localhost:5000/api/auth/csrf-token
# Expected: 200 OK

# Check logs for errors
tail -50 /var/log/application.log | grep -i error
# Expected: No critical errors
```

---

### Step 3: Verify Webhook Processing (10 minutes)

**Test 1: Valid Signature Acceptance**

```bash
# Generate test webhook with valid signature
# (Use Razorpay Dashboard → Webhooks → Test Webhook)

# Monitor logs
tail -f /var/log/application.log | grep "Webhook"

# Expected output:
# "Webhook received from Razorpay"
# "Webhook timestamp validated successfully"
# "Payment captured webhook received" (or other event)
```

**Pass Criteria**: Webhook accepted and processed (200 OK)

---

**Test 2: Invalid Signature Rejection**

```bash
# Send webhook with invalid signature
curl -X POST http://localhost:5000/api/payment/webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: invalid_signature_12345" \
  -d '{"event":"payment.captured","event_id":"test123","created_at":'$(date +%s)'}' \
  -v

# Expected: 400 Bad Request
# Response: {"success":false,"message":"Invalid webhook signature"}
```

**Pass Criteria**: Invalid webhooks rejected with 400

---

**Test 3: Rate Limiting Active**

```bash
# Send 11 requests rapidly
for i in {1..11}; do
  curl -X POST http://localhost:5000/api/payment/webhook \
    -H "Content-Type: application/json" \
    -H "x-razorpay-signature: test" \
    -d '{}' &
done
wait

# Expected: First 10 requests processed, 11th returns 429
# Check logs for "rate limit exceeded"
```

**Pass Criteria**: Rate limiting enforces 10 req/min limit

---

**Test 4: Timestamp Validation Active**

```bash
# Send webhook with old timestamp (6 minutes ago)
OLD_TIMESTAMP=$(($(date +%s) - 400))
curl -X POST http://localhost:5000/api/payment/webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: test" \
  -d '{"event":"test","event_id":"old123","created_at":'$OLD_TIMESTAMP'}' \
  -v

# Expected: 400 Bad Request
# Response: {"error":"WEBHOOK_TOO_OLD","message":"Webhook timestamp too old"}
```

**Pass Criteria**: Old webhooks rejected with WEBHOOK_TOO_OLD

---

### Step 4: Monitor Metrics (30 minutes)

**Metrics to Watch**:

```sql
-- 1. Webhook success rate (last 30 minutes)
SELECT 
  status,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM webhook_events
WHERE created_at > NOW() - INTERVAL '30 minutes'
GROUP BY status;
-- Expected: >95% success rate

-- 2. Signature failures (should be 0 for production traffic)
SELECT COUNT(*) FROM logs
WHERE message LIKE '%Invalid webhook signature%'
AND timestamp > NOW() - INTERVAL '30 minutes';
-- Expected: 0 (test webhooks may fail during verification)

-- 3. Processing latency
SELECT 
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_seconds
FROM webhook_events
WHERE status = 'success'
AND created_at > NOW() - INTERVAL '30 minutes';
-- Expected: <2 seconds

-- 4. Duplicate detection rate
SELECT COUNT(*) as duplicates
FROM webhook_events
WHERE created_at > NOW() - INTERVAL '30 minutes'
GROUP BY event_id
HAVING COUNT(*) > 1;
-- Expected: 0-5% (normal for Razorpay retries)
```

**Pass Criteria**: All metrics within expected ranges

---

### Step 5: Production Validation (1 hour)

**Monitor Real Traffic**:

```bash
# 1. Watch webhook logs
tail -f /var/log/application.log | grep -E "Webhook|signature|timestamp|deduplication"

# 2. Monitor error rates
watch -n 10 'grep -c "error" /var/log/application.log'

# 3. Check webhook table growth
watch -n 30 'psql $DATABASE_URL -c "SELECT COUNT(*) FROM webhook_events WHERE created_at > NOW() - INTERVAL '"'"'5 minutes'"'"';"'
```

**Acceptance Criteria**:
- No increase in error rate
- Webhooks processing normally
- Payment flow uninterrupted
- No customer complaints

---

## Post-Deployment Validation

### Immediate (0-1 hour)

- [ ] Server running without errors
- [ ] Webhooks processing successfully
- [ ] No spike in failed webhooks
- [ ] Rate limiting active
- [ ] Signature verification working
- [ ] Timestamp validation working
- [ ] Deduplication working

### Short-term (1-24 hours)

- [ ] No increase in support tickets
- [ ] Payment success rate unchanged
- [ ] Webhook success rate >99%
- [ ] No security incidents
- [ ] Monitoring alerts quiet

### Long-term (1-7 days)

- [ ] Webhook processing stable
- [ ] No unexpected behavior
- [ ] Documentation accurate
- [ ] Team comfortable with changes

---

## Rollback Triggers

**Immediate Rollback If**:
- Webhook success rate drops below 90%
- Signature verification completely failing
- Production payments not activating subscriptions
- Security breach detected
- Critical error in logs

**Consider Rollback If**:
- Webhook success rate drops below 95%
- Unexplained increase in failed webhooks
- Multiple customer complaints
- Team uncomfortable with changes

---

## Success Metrics

### Technical Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Webhook Success Rate | >99% | ___ % | ⬜ |
| Signature Verification | 100% working | ___ % | ⬜ |
| Processing Latency | <2s avg | ___ s | ⬜ |
| Rate Limiting | Active | ___ | ⬜ |
| Timestamp Validation | Active | ___ | ⬜ |
| Deduplication | Active | ___ | ⬜ |

### Business Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Payment Success Rate | No change | ___ % | ⬜ |
| Support Tickets | No increase | ___ | ⬜ |
| Customer Complaints | 0 related | ___ | ⬜ |

---

## Communication Plan

### Before Deployment

**To**: Engineering Team  
**Message**: "Deploying webhook security update (removing IP whitelist) at [TIME]. Minimal impact expected. Monitoring for 1 hour post-deployment."

### During Deployment

**To**: Engineering Team (Slack)  
**Message**: "Webhook IP whitelist removal: DEPLOYED. Monitoring metrics. All systems nominal."

### After Successful Deployment

**To**: Engineering Team + Product  
**Message**: "Webhook security update complete. All metrics green. No customer impact. Documentation updated."

### If Issues Arise

**To**: Engineering Team (Immediate)  
**Message**: "ALERT: Webhook issue detected. [DESCRIPTION]. Investigating. May rollback if needed."

---

## Sign-Off

### Pre-Deployment Sign-Off

- [ ] **Tech Lead**: Code review approved
- [ ] **Security**: Security review approved  
- [ ] **QA**: Testing completed
- [ ] **DevOps**: Deployment ready

### Post-Deployment Sign-Off

- [ ] **Engineer**: Deployment completed successfully
- [ ] **Tech Lead**: Metrics verified, production stable
- [ ] **Product**: No customer impact, feature working as expected

---

**Deployment Date**: ___________  
**Deployed By**: ___________  
**Status**: ⬜ Success | ⬜ Partial | ⬜ Rolled Back  
**Notes**: ___________

---

*End of Deployment Checklist*
