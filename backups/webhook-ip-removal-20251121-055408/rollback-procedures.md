# Rollback Procedures
## Webhook IP Whitelist Removal

**Date**: November 21, 2025  
**Feature**: Webhook IP Whitelist Removal  
**Rollback Complexity**: LOW (code designed for easy rollback)  
**Rollback Time**: <5 minutes

---

## When to Rollback

### Immediate Rollback Triggers

Execute rollback immediately if any of these occur:

1. **Webhook Success Rate < 90%**
   - Massive webhook failures
   - Payments not activating subscriptions
   - Database not recording events

2. **Security Breach**
   - Unauthorized webhook processing detected
   - Suspicious activity in logs
   - Signature verification completely broken

3. **Production Down**
   - Server crashes after deployment
   - Critical errors preventing webhook processing
   - Database corruption

### Consider Rollback If

Evaluate rollback for these scenarios:

1. **Webhook Success Rate 90-95%**
   - Some webhooks failing but not catastrophic
   - Investigate before rolling back

2. **Unexpected Behavior**
   - Edge cases not working correctly
   - Performance degradation
   - Increased error rate

3. **Team Request**
   - Engineering team uncomfortable with changes
   - Need more time to investigate

---

## Rollback Methods

### Method 1: Code Restoration (FASTEST - Recommended)

**Time**: <5 minutes  
**Complexity**: LOW  
**Downtime**: Minimal (restart only)

This method simply restores the IP whitelist middleware to active use. The code was intentionally left in place (marked @deprecated) for instant rollback.

#### Step 1: Re-enable IP Whitelist in Routes

**File**: `server/routes/payment.routes.ts`

```typescript
// BEFORE (current - signature only):
import { webhookRateLimit } from '../middleware/webhook-security';

router.post('/webhook', webhookRateLimit, asyncHandler(...));
router.post('/webhook/refund', webhookRateLimit, asyncHandler(...));

// AFTER (rollback - with IP whitelist):
import { webhookIpWhitelist, webhookRateLimit } from '../middleware/webhook-security';

router.post('/webhook', webhookIpWhitelist, webhookRateLimit, asyncHandler(...));
router.post('/webhook/refund', webhookIpWhitelist, webhookRateLimit, asyncHandler(...));
```

**Changes**:
1. Add `webhookIpWhitelist` to import statement
2. Add `webhookIpWhitelist` before `webhookRateLimit` in both routes

#### Step 2: Restart Application

```bash
# Restart server
pm2 restart app
# OR
npm run dev
```

#### Step 3: Verify IP Whitelist Active

```bash
# Test 1: Webhook from non-whitelisted IP should fail
curl -X POST http://localhost:5000/api/payment/webhook \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}' \
  -v

# Expected: 403 Forbidden
# Response: {"success":false,"error":"Forbidden","message":"Webhooks only accepted from Razorpay IPs"}

# Test 2: Check logs for IP filtering
tail -50 /var/log/application.log | grep "whitelisted IP"
# Expected: "Webhook request from whitelisted IP accepted" for Razorpay IPs
```

**Rollback Complete**: IP whitelist is now active again

---

### Method 2: File Restoration (SAFEST)

**Time**: <10 minutes  
**Complexity**: MEDIUM  
**Downtime**: Minimal (restart only)

This method restores all files from backups created in Phase 1.

#### Step 1: Locate Backups

```bash
cd /home/runner/workspace/backups/webhook-ip-removal-20251121-055408/

# Verify backups exist
ls -la
# Expected files:
# - payment.routes.ts.backup
# - webhook-security.ts.backup
# - config.index.ts.backup
# - replit.md.backup
# - RAZORPAY_WEBHOOK_TESTING_GUIDE.md.backup
```

#### Step 2: Restore Files

```bash
# Navigate to backup directory
cd /home/runner/workspace/backups/webhook-ip-removal-20251121-055408/

# Restore all files
cp payment.routes.ts.backup ../../server/routes/payment.routes.ts
cp webhook-security.ts.backup ../../server/middleware/webhook-security.ts
cp config.index.ts.backup ../../server/config/index.ts
cp replit.md.backup ../../replit.md
cp RAZORPAY_WEBHOOK_TESTING_GUIDE.md.backup ../../RAZORPAY_WEBHOOK_TESTING_GUIDE.md

# Verify restoration
echo "Files restored successfully"
```

#### Step 3: Verify Code Integrity

```bash
# Check for TypeScript errors
npm run typecheck

# Expected: No errors
```

#### Step 4: Restart Application

```bash
# Restart server
pm2 restart app
# OR
npm run dev
```

#### Step 5: Verify Rollback

```bash
# Test IP whitelist is active
curl -X POST http://localhost:5000/api/payment/webhook \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}' \
  -v

# Expected: 403 Forbidden (IP not whitelisted)
```

**Rollback Complete**: All code restored to pre-change state

---

### Method 3: Git Revert (If Git Used)

**Time**: <3 minutes  
**Complexity**: LOW  
**Downtime**: Minimal (restart only)

**Note**: This requires Git was used to commit changes. If Git branch creation was restricted, use Method 1 or 2 instead.

#### Step 1: Revert Commit

```bash
# Find the commit to revert
git log --oneline -10
# Look for: "Remove webhook IP whitelist from security"

# Revert the commit (replace COMMIT_HASH)
git revert COMMIT_HASH

# Push revert
git push origin main
```

#### Step 2: Deploy Revert

```bash
# Pull latest code
git pull origin main

# Restart server
pm2 restart app
```

**Rollback Complete**: Git history shows revert

---

## Post-Rollback Verification

### Immediate Checks (0-5 minutes)

```bash
# 1. Server running
curl -f http://localhost:5000/api/auth/csrf-token
# Expected: 200 OK

# 2. IP whitelist active
curl -X POST http://localhost:5000/api/payment/webhook \
  -H "Content-Type: application/json" \
  -d '{}' \
  -v
# Expected: 403 Forbidden (IP not whitelisted)

# 3. No errors in logs
tail -100 /var/log/application.log | grep -i error
# Expected: No critical errors

# 4. Environment variables intact
echo "RAZORPAY_WEBHOOK_SECRET: $([ -n "$RAZORPAY_WEBHOOK_SECRET" ] && echo 'SET' || echo 'MISSING')"
echo "RAZORPAY_WEBHOOK_IPS: $([ -n "$RAZORPAY_WEBHOOK_IPS" ] && echo 'SET' || echo 'USING_DEFAULTS')"
```

**All checks pass**: Rollback successful

---

### Monitoring (5-30 minutes)

```sql
-- 1. Webhook success rate
SELECT 
  status,
  COUNT(*) as count
FROM webhook_events
WHERE created_at > NOW() - INTERVAL '30 minutes'
GROUP BY status;
-- Expected: Success rate increasing

-- 2. Recent webhook events
SELECT * FROM webhook_events
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC
LIMIT 20;
-- Expected: Events being processed

-- 3. IP rejection logs (application logs)
-- Check for "Webhook request from whitelisted IP accepted"
-- Check for "Rejected webhook from unauthorized IP"
```

**Metrics stable**: System returned to normal

---

## Communication Plan

### During Rollback

**To**: Engineering Team (Slack - Immediate)  
**Message**: "⚠️ ROLLBACK IN PROGRESS: Reverting webhook security changes due to [REASON]. ETA 5 minutes."

### After Rollback

**To**: Engineering Team + Leadership  
**Subject**: "Webhook Security Rollback Complete"  
**Message**:
```
Rollback completed successfully at [TIME].

Reason: [DETAILED REASON]

Current Status:
- IP whitelist: ACTIVE ✅
- Webhooks: PROCESSING ✅
- System: STABLE ✅

Next Steps:
1. Root cause analysis
2. Fix identified issues
3. Re-plan deployment

Metrics:
- Webhook success rate: [X]%
- System uptime: [X]%
- Customer impact: [DESCRIPTION]
```

---

## Root Cause Analysis Template

After rollback, complete this analysis:

### What Happened?

**Trigger**: _________  
**Time Detected**: _________  
**Time Rolled Back**: _________  
**Downtime**: _________

### Why Did It Happen?

**Root Cause**: _________

**Contributing Factors**:
- _________
- _________

### What Was the Impact?

**Customer Impact**: _________  
**Business Impact**: _________  
**Technical Impact**: _________

### How Do We Prevent This?

**Immediate Actions**:
- [ ] _________
- [ ] _________

**Long-term Actions**:
- [ ] _________
- [ ] _________

### Timeline

| Time | Event | Action Taken |
|------|-------|--------------|
| 00:00 | Deployed webhook changes | Monitoring started |
| 00:15 | Issue detected | Investigation began |
| 00:20 | Rollback decision | Rollback initiated |
| 00:25 | Rollback complete | Verification started |
| 00:30 | System stable | Declared resolved |

---

## Prevention Checklist

Before re-attempting deployment:

- [ ] Root cause identified and fixed
- [ ] Additional tests added to cover edge case
- [ ] More thorough testing in staging environment
- [ ] Gradual rollout plan (e.g., canary deployment)
- [ ] Better monitoring in place
- [ ] Team alignment on decision criteria
- [ ] Customer communication plan ready

---

## Escalation Path

If rollback doesn't resolve issues:

1. **Tier 1** (0-5 min): Engineering team attempts rollback
2. **Tier 2** (5-15 min): Tech lead + DevOps investigate
3. **Tier 3** (15-30 min): CTO notified, incident response team activated
4. **Tier 4** (30+ min): External support (Razorpay, hosting provider) contacted

**Contact List**:
- Tech Lead: _________
- DevOps: _________
- CTO: _________
- Razorpay Support: support@razorpay.com

---

## Success Criteria

Rollback is considered successful when:

- [x] Server running without errors
- [x] IP whitelist active and filtering correctly
- [x] Webhooks processing from Razorpay IPs
- [x] Non-Razorpay IPs rejected (403)
- [x] Webhook success rate >99%
- [x] No increase in support tickets
- [x] Team confirms system stability

---

## Lessons Learned Template

After incident resolution:

### What Went Well?

- Rollback procedures worked as designed
- Team responded quickly
- [Add more]

### What Could Be Improved?

- [Improvement area 1]
- [Improvement area 2]

### Action Items

- [ ] [Action 1] - Owner: _____ - Due: _____
- [ ] [Action 2] - Owner: _____ - Due: _____

---

**Rollback Status**: ⬜ Not Required | ⬜ In Progress | ⬜ Complete  
**Date**: ___________  
**Rolled Back By**: ___________  
**Verification By**: ___________

---

*End of Rollback Procedures*
