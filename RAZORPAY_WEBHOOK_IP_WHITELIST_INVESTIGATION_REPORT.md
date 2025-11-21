# Razorpay Webhook IP Whitelisting Investigation Report

**Date**: November 21, 2025  
**Environment**: Replit Cloud Platform  
**Issue**: Razorpay webhooks rejected with 403 Forbidden  
**Investigator**: Replit Agent (Subagent)

---

## Executive Summary

Razorpay webhooks are being blocked due to IP address mismatch in Replit's cloud infrastructure. Incoming webhooks appear to originate from IP `10.84.6.70` (Replit's internal proxy) instead of Razorpay's official IPs (`3.7.71.51-53`). This is caused by incorrect Express trust proxy configuration combined with fundamental architectural limitations of IP whitelisting in cloud environments.

**Recommended Solution**: Remove IP whitelisting entirely and rely exclusively on HMAC signature verification (already implemented). This aligns with industry best practices and eliminates cloud infrastructure dependencies.

---

## Table of Contents

1. [Root Cause Analysis](#1-root-cause-analysis)
2. [Current Implementation Review](#2-current-implementation-review)
3. [Replit Infrastructure Architecture](#3-replit-infrastructure-architecture)
4. [Security Implications](#4-security-implications)
5. [Solution Options Analysis](#5-solution-options-analysis)
6. [Recommended Solution](#6-recommended-solution)
7. [Implementation Guidance](#7-implementation-guidance)
8. [Conclusion](#8-conclusion)

---

## 1. Root Cause Analysis

### 1.1 The Problem

**Symptom**: Webhooks from Razorpay are rejected with:
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Webhooks only accepted from Razorpay IPs"
}
```

**Observed Behavior**:
- Webhooks appear to come from IP: `10.84.6.70`
- Expected IPs: `3.7.71.51`, `3.7.71.52`, `3.7.71.53`
- Environment: Replit cloud platform (REPL_ID: `872c6f8a-44e4-496d-9848-c9f46e9f4ee8`)

### 1.2 Why IP 10.84.6.70 Appears

The IP `10.84.6.70` is **Replit's internal proxy infrastructure**, not the original Razorpay webhook sender. Here's the request flow:

```
[Razorpay Server]     [Replit Proxy]         [Your App]
3.7.71.51       →     10.84.6.70       →     Express req.ip
(Real sender)         (What you see)         (What gets validated)
```

**Why this happens**:

1. **Replit Architecture**: Every Repl is accessed via `<repl-name>.<username>.repl.co` through a reverse proxy service
2. **TCP Connection**: Your Express app only sees the direct TCP connection from Replit's proxy (`10.84.6.70`)
3. **Original IP Location**: Razorpay's IP (`3.7.71.51`) is in the `X-Forwarded-For` HTTP header
4. **Express Behavior**: Without correct `trust proxy` configuration, Express uses the socket IP (`10.84.6.70`) instead of parsing `X-Forwarded-For`

### 1.3 Trust Proxy Misconfiguration

**Current Configuration** (from `server/index.ts` line 62):
```typescript
app.set('trust proxy', securityConfig.TRUST_PROXY);
```

**Current Value** (from investigation):
```bash
# .env file check: TRUST_PROXY is NOT set
# Config default: TRUST_PROXY defaults to false (0)
```

**Impact**:
- `req.ip` returns `10.84.6.70` (Replit proxy)
- `X-Forwarded-For` header is ignored
- IP whitelist validation fails

**What should happen with TRUST_PROXY=1**:
- Express trusts the first proxy (Replit)
- Parses `X-Forwarded-For: 3.7.71.51, 10.84.6.70`
- Sets `req.ip = '3.7.71.51'`
- IP whitelist validation succeeds

---

## 2. Current Implementation Review

### 2.1 Webhook Security Middleware

**File**: `server/middleware/webhook-security.ts`

**Current Security Layers**:

```typescript
// Layer 1: IP Whitelisting (PROBLEMATIC)
export function webhookIpWhitelist(req, res, next) {
  const clientIp = req.ip || req.connection?.remoteAddress || '';
  const normalizedIp = normalizeIp(clientIp); // Handles ::ffff: prefix
  
  if (!whitelistedIps.includes(normalizedIp)) {
    // REJECTS webhook with 403 Forbidden
    return res.status(403).json({...});
  }
  next();
}

// Layer 2: Rate Limiting (WORKS)
export const webhookRateLimit = rateLimit({
  windowMs: 60000,
  max: 10,
  // Uses req.ip (also affected by trust proxy)
});
```

**Route Configuration** (`server/routes/payment.routes.ts` line 22):
```typescript
router.post('/webhook', 
  webhookIpWhitelist,    // ← BLOCKS HERE
  webhookRateLimit,      
  asyncHandler(paymentController.handleWebhook)
);
```

### 2.2 Additional Security Layers (Working Correctly)

The application already has **robust signature verification** that works independently of IP:

**Layer 3: HMAC Signature Verification** (`server/controllers/payment.controller.ts`):
```typescript
const signature = req.headers['x-razorpay-signature'];
const isValid = razorpayService.verifyWebhookSignature(
  req.body,  // Raw buffer
  signature
);

if (!isValid) {
  return this.sendError(res, 400, 'INVALID_SIGNATURE', 'Invalid webhook signature');
}
```

**Layer 4: Timestamp Validation** (prevents replay attacks):
```typescript
const webhookAge = Date.now() / 1000 - payload.created_at;
if (webhookAge > 300) {  // 5 minutes
  return this.sendError(res, 400, 'WEBHOOK_TOO_OLD', 'Webhook timestamp too old');
}
```

**Layer 5: Deduplication** (`webhookDeduplicationService`):
```typescript
const isDuplicate = await webhookDeduplicationService.isDuplicate(eventId);
if (isDuplicate) {
  return this.sendSuccess(res, 'Event already processed');
}
```

### 2.3 Raw Body Handling

**Correct implementation** (`server/index.ts` line 129):
```typescript
// CRITICAL: Must be BEFORE express.json()
app.use('/api/payment/webhook', express.raw({ 
  type: 'application/json', 
  limit: '1kb' 
}));
app.use(express.json());
```

This ensures signature verification works correctly by preserving raw request bytes.

---

## 3. Replit Infrastructure Architecture

### 3.1 Replit Proxy System

Based on web research and environment analysis:

**Architecture**:
```
Internet
   ↓
Replit DNS (*.repl.co)
   ↓
Replit Reverse Proxy Cluster
   ↓ (adds X-Forwarded-For, X-Forwarded-Proto, etc.)
Container (10.84.6.70 internal IP)
   ↓
Your Express App
```

**Key Characteristics**:

1. **No Static IPs**: Replit does NOT provide static IP addresses for incoming traffic
2. **Dynamic Routing**: Proxies route based on `<repl-name>.<username>.repl.co` hostname
3. **Automatic HTTPS**: SSL/TLS termination at proxy layer
4. **Internal IPs**: Containers use private 10.x.x.x addresses
5. **IP Rotation**: Container IPs change during deploys/restarts

### 3.2 X-Forwarded-For Header

**Header Contents** (typical webhook from Razorpay):
```
X-Forwarded-For: 3.7.71.51, 10.84.6.70
                 ^^^^^^^^^^^  ^^^^^^^^^^^
                 Original IP  Replit Proxy
```

**Header Format**: `client, proxy1, proxy2, ...`
- **Leftmost IP**: Original client (Razorpay: `3.7.71.51`)
- **Rightmost IP**: Last proxy before your app (Replit: `10.84.6.70`)

**Express Parsing with TRUST_PROXY=1**:
- Trusts 1 proxy (Replit)
- Removes rightmost IP (`10.84.6.70`)
- Sets `req.ip = '3.7.71.51'`

### 3.3 Fundamental Limitation

**Critical Issue**: Even if trust proxy is configured correctly, **IP whitelisting is unreliable in cloud environments** because:

1. **Shared Infrastructure**: Replit's proxies are shared across all users
2. **No IP Guarantees**: IPs can change without notice
3. **Spoofing Risk**: `X-Forwarded-For` can be spoofed if trust proxy is misconfigured
4. **Deployment Variability**: Different cloud providers have different proxy configurations

---

## 4. Security Implications

### 4.1 Current State (IP Whitelist + Signature)

**Security Posture**:
- ✅ **Defense in Depth**: Multiple layers
- ❌ **Operational Failure**: Webhooks completely blocked
- ⚠️ **False Security**: IP whitelist provides minimal actual protection

**Risk Assessment**:
```
┌─────────────────────────────────────────────────────────┐
│ Attack Vector          │ IP Whitelist │ HMAC Signature │
├────────────────────────┼──────────────┼────────────────┤
│ Forged webhook         │ ✅ Blocks    │ ✅ Blocks      │
│ Replay attack          │ ❌ Allows    │ ✅ Blocks*     │
│ MITM (no HTTPS)        │ ❌ Allows    │ ✅ Blocks      │
│ IP spoofing            │ ⚠️ Bypassable│ ✅ Blocks      │
│ DDoS                   │ ✅ Helps     │ ❌ No help     │
│ Proxy infrastructure   │ ❌ BREAKS    │ ✅ Works       │
└─────────────────────────────────────────────────────────┘
* With timestamp validation
```

### 4.2 Security Analysis by Layer

#### Layer 1: IP Whitelisting
**Effectiveness**: LOW in cloud environments

**Why it's weak**:
1. **Spoofing**: Attacker can set `X-Forwarded-For: 3.7.71.51` header
2. **Proxy Variance**: Different deployments have different proxy counts
3. **Maintenance**: Razorpay can change IPs without notice (breaks webhooks)
4. **Shared IPs**: Cloud providers often use shared IP pools

**Only useful for**:
- Quick rejection of obviously malicious traffic
- Rate limiting per IP
- Network-level filtering (firewall rules)

#### Layer 2: HMAC Signature Verification
**Effectiveness**: VERY HIGH

**Why it's strong**:
1. **Cryptographic Proof**: Only Razorpay knows the webhook secret
2. **Tamper Detection**: Any modification invalidates signature
3. **Cloud-Agnostic**: Works through any number of proxies
4. **Industry Standard**: Used by Stripe, GitHub, Twilio, etc.

**Attack Resistance**:
- ✅ Forged webhooks: Attacker can't generate valid signature
- ✅ Modified payloads: Changes break signature
- ✅ Replay attacks: Combined with timestamp validation
- ✅ MITM: Requires HTTPS (already enforced by Replit)

#### Layer 3: Rate Limiting
**Effectiveness**: MEDIUM

**Purpose**: Prevent DDoS, not authentication

**Note**: Also affected by trust proxy (uses req.ip)

### 4.3 Industry Comparison

**Major Payment Providers**:

| Provider | IP Whitelist | Signature | Timestamp | Recommendation |
|----------|--------------|-----------|-----------|----------------|
| **Stripe** | ❌ No | ✅ Yes | ✅ Yes | "Do not verify IP" |
| **PayPal** | ❌ No | ✅ Yes | ❌ No | Signature only |
| **Razorpay** | ⚠️ Optional | ✅ Yes | ❌ No | Signature primary |
| **Twilio** | ❌ No* | ✅ Yes | ❌ No | "No fixed IPs" |
| **GitHub** | ❌ No | ✅ Yes | ❌ No | Signature only |

*Twilio explicitly states: "We do not have a fixed range of IP addresses that issue webhooks"

**Key Insight**: **No major provider recommends IP whitelisting as a primary security measure.**

---

## 5. Solution Options Analysis

### Solution 1: Signature-Only Verification (Remove IP Whitelist)

**Implementation**: Remove `webhookIpWhitelist` middleware entirely.

**Configuration Change**:
```typescript
// server/routes/payment.routes.ts
router.post('/webhook', 
  // webhookIpWhitelist,  ← REMOVE THIS LINE
  webhookRateLimit,
  asyncHandler(paymentController.handleWebhook)
);
```

**Pros**:
- ✅ **Immediate Fix**: Webhooks work instantly
- ✅ **Cloud-Native**: Works in any deployment (AWS, Replit, Heroku, etc.)
- ✅ **Industry Standard**: Matches Stripe, GitHub, PayPal approach
- ✅ **Maintenance-Free**: No IP updates needed
- ✅ **Cryptographically Secure**: HMAC-SHA256 provides strong authentication
- ✅ **No Configuration**: Works without trust proxy setup
- ✅ **Migration-Friendly**: Deploy anywhere without code changes

**Cons**:
- ⚠️ **Reduced Defense Layers**: One less barrier (but strongest layer remains)
- ⚠️ **DDoS Vulnerability**: Without IP filter, rate limiting is sole DDoS protection
- ❌ **Cannot Block by IP**: Can't proactively block malicious IPs at webhook level

**Security Assessment**: **STRONG**
- Signature verification is cryptographically secure
- Timestamp validation prevents replay attacks
- Deduplication prevents duplicate processing
- HTTPS prevents MITM attacks
- Rate limiting prevents brute force

**Recommendation**: **STRONGLY RECOMMENDED** ⭐

---

### Solution 2: Fix Trust Proxy Configuration

**Implementation**: Set `TRUST_PROXY=1` to trust Replit's proxy.

**Configuration Change**:
```bash
# .env
TRUST_PROXY=1
```

**Pros**:
- ✅ **Preserves Current Code**: No middleware changes
- ✅ **Defense in Depth**: Keeps all security layers
- ✅ **Quick Fix**: Single environment variable
- ✅ **Works on Replit**: Correctly parses X-Forwarded-For

**Cons**:
- ❌ **Platform-Specific**: Breaks if deployed elsewhere (AWS needs 1-2, Cloudflare needs 2+)
- ❌ **Fragile**: IP whitelist still fundamentally flawed in cloud
- ❌ **Maintenance Burden**: Must update if Razorpay changes IPs
- ⚠️ **Security Risk**: Incorrect trust proxy value enables IP spoofing
- ❌ **Vendor Lock-in**: Different platforms require different TRUST_PROXY values

**Trust Proxy Values by Platform**:
```
Platform          | TRUST_PROXY | Reason
------------------+-------------+----------------------------------
Replit            | 1           | Single Replit proxy
AWS ALB           | 1           | Single load balancer
AWS ALB + CDN     | 2           | CloudFront + ALB
Heroku            | 1           | Heroku router
Cloudflare + AWS  | 2+          | Cloudflare + your infrastructure
Direct connection | false       | No proxy
```

**Security Assessment**: **MODERATE**
- Still relies on IP whitelisting (weak in cloud)
- Risk of misconfiguration enabling spoofing
- Platform-dependent behavior

**Recommendation**: **ACCEPTABLE AS TEMPORARY FIX** ⚠️

---

### Solution 3: Add Replit's IP Range to Whitelist

**Implementation**: Whitelist `10.84.6.70` (or entire 10.0.0.0/8 range).

**Configuration Change**:
```bash
# .env
RAZORPAY_WEBHOOK_IPS=3.7.71.51,3.7.71.52,3.7.71.53,10.84.6.70
```

**Pros**:
- ✅ **Immediate Fix**: Webhooks work now
- ✅ **Minimal Changes**: Just update environment variable

**Cons**:
- ❌ **SECURITY DISASTER**: Opens webhooks to ALL Replit users
- ❌ **10.x.x.x is Private**: Any Replit app could send fake webhooks
- ❌ **Shared Infrastructure**: Other users' apps can hit your webhook
- ❌ **Defeats Purpose**: IP whitelist becomes meaningless
- ❌ **Compliance Risk**: Auditors will flag this as critical vulnerability

**Attack Scenario**:
```
Attacker's Replit App (10.84.6.70) → Your Webhook
                                      ↓
                           IP check passes ✅
                                      ↓
                    Fake webhook processed 💥
```

**Security Assessment**: **CRITICALLY INSECURE** 🚨

**Recommendation**: **NEVER DO THIS** ❌

---

### Solution 4: Parse X-Forwarded-For Manually

**Implementation**: Custom middleware to extract original IP from X-Forwarded-For.

**Code Change**:
```typescript
// Custom middleware (BEFORE webhookIpWhitelist)
function extractOriginalIp(req, res, next) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string') {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    req.ip = ips[0];  // Leftmost = original client
  }
  next();
}

router.post('/webhook',
  extractOriginalIp,      // ← NEW
  webhookIpWhitelist,
  webhookRateLimit,
  asyncHandler(paymentController.handleWebhook)
);
```

**Pros**:
- ✅ **Platform-Agnostic**: Works without trust proxy
- ✅ **Explicit Control**: You decide which IP to use
- ✅ **Preserves Whitelist**: Keeps defense-in-depth

**Cons**:
- ⚠️ **SECURITY RISK**: `X-Forwarded-For` is easily spoofed
- ❌ **Bypasses Express Security**: Circumvents trust proxy protection
- ❌ **Reinventing Wheel**: Express already does this correctly
- ⚠️ **Spoofing Vector**: Attacker sends `X-Forwarded-For: 3.7.71.51`

**Attack Scenario**:
```bash
# Attacker crafts request:
curl -X POST https://yourapp.repl.co/api/payment/webhook \
  -H "X-Forwarded-For: 3.7.71.51" \  # Spoofed Razorpay IP
  -H "x-razorpay-signature: fake" \
  -d '{"malicious":"payload"}'

# Your custom middleware:
req.ip = '3.7.71.51'  # ← Spoofed!

# IP check passes ✅
# Signature check fails ✅ (webhook rejected, but IP layer was bypassed)
```

**Security Assessment**: **INSECURE**

**Recommendation**: **DO NOT IMPLEMENT** ❌

---

### Solution 5: Hybrid Approach (Trust Proxy + Signature)

**Implementation**: Configure trust proxy correctly AND keep all security layers.

**Changes**:
```bash
# .env
TRUST_PROXY=1
```

**No code changes required** (already implemented correctly).

**Pros**:
- ✅ **Defense in Depth**: Multiple security layers
- ✅ **Standards Compliant**: Uses Express built-in security
- ✅ **Works on Replit**: Immediate fix
- ✅ **Production-Ready**: Robust configuration

**Cons**:
- ⚠️ **Platform-Specific**: Requires different TRUST_PROXY per platform
- ⚠️ **Maintenance**: Must update if Razorpay changes IPs
- ❌ **Unnecessary Complexity**: IP whitelist adds minimal security value

**Platform Migration Checklist**:
```
Replit     → Set TRUST_PROXY=1
AWS ALB    → Set TRUST_PROXY=1
Heroku     → Set TRUST_PROXY=1
Cloudflare → Set TRUST_PROXY=2 (or more)
Local dev  → Set TRUST_PROXY=false
```

**Security Assessment**: **STRONG**

**Recommendation**: **ACCEPTABLE FOR PRODUCTION** ✅

---

## 6. Recommended Solution

### 6.1 Primary Recommendation: Signature-Only Verification

**Remove IP whitelisting entirely.** This is the industry-standard approach used by Stripe, GitHub, PayPal, and other major platforms.

**Rationale**:

1. **Security**: HMAC signature verification is cryptographically secure and sufficient
2. **Cloud-Native**: Works in any deployment environment without configuration
3. **Maintainability**: No need to track IP changes or configure trust proxy
4. **Industry Standard**: Aligns with best practices from security experts
5. **Simplicity**: Fewer moving parts = fewer failure points

### 6.2 Security Layers (After Removing IP Whitelist)

Your application will still have **4 robust security layers**:

#### Layer 1: HTTPS (Replit-enforced)
- Prevents man-in-the-middle attacks
- Encrypts signature in transit
- Certificate validation

#### Layer 2: HMAC-SHA256 Signature Verification
```typescript
const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);
// Only Razorpay knows the webhook secret
// Tampering invalidates signature
```

#### Layer 3: Timestamp Validation
```typescript
if (webhookAge > 300) {  // 5 minutes
  // Prevents replay attacks
}
```

#### Layer 4: Deduplication
```typescript
if (webhookDeduplicationService.isDuplicate(eventId)) {
  // Prevents duplicate processing
}
```

#### Layer 5: Rate Limiting
```typescript
webhookRateLimit  // 10 requests per minute
```

**Security Assessment**: ✅ **EXCELLENT**

This configuration matches or exceeds the security of major payment providers.

### 6.3 Why IP Whitelisting Adds Minimal Value

**In cloud environments**, IP whitelisting is:

1. **Weak Authentication**: Easily bypassed with proxy/VPN
2. **Operational Burden**: Breaks during deployments or IP changes
3. **False Security**: Creates illusion of protection without real benefit
4. **Redundant**: HMAC signature already provides strong authentication

**OWASP Recommendation**: "Don't rely on IP addresses for authentication."

**Industry Consensus**: Signature verification is sufficient for webhooks.

---

## 7. Implementation Guidance

### 7.1 Recommended Implementation (Signature-Only)

#### Step 1: Remove IP Whitelist Middleware

**File**: `server/routes/payment.routes.ts`

**Before**:
```typescript
router.post('/webhook', 
  webhookIpWhitelist,    // ← REMOVE
  webhookRateLimit, 
  asyncHandler((req: AuthenticatedRequest, res: Response) => 
    paymentController.handleWebhook(req, res)
  )
);

router.post('/webhook/refund', 
  webhookIpWhitelist,    // ← REMOVE
  webhookRateLimit, 
  asyncHandler((req: AuthenticatedRequest, res: Response) => 
    paymentController.handleRefundWebhook(req, res)
  )
);
```

**After**:
```typescript
// Public webhook endpoints (verified via signature + rate limiting)
// Raw body handling configured globally in server/index.ts
// Security: Rate limit, then signature verification in handler
router.post('/webhook', 
  webhookRateLimit, 
  asyncHandler((req: AuthenticatedRequest, res: Response) => 
    paymentController.handleWebhook(req, res)
  )
);

router.post('/webhook/refund', 
  webhookRateLimit, 
  asyncHandler((req: AuthenticatedRequest, res: Response) => 
    paymentController.handleRefundWebhook(req, res)
  )
);
```

#### Step 2: Update Middleware Documentation

**File**: `server/middleware/webhook-security.ts`

Add deprecation notice at top:
```typescript
/**
 * Webhook Security Middleware
 * 
 * DEPRECATION NOTICE:
 * IP whitelisting (webhookIpWhitelist) is DEPRECATED and should not be used
 * in cloud environments. Use signature verification instead (already implemented
 * in payment controller).
 * 
 * WHY DEPRECATED:
 * - Unreliable in cloud/proxy environments (Replit, AWS, Heroku)
 * - Requires platform-specific trust proxy configuration
 * - Maintenance burden (tracking IP changes)
 * - Industry standard is signature-only verification
 * 
 * RECOMMENDED:
 * - Use webhookRateLimit for DDoS protection
 * - Rely on HMAC signature verification (cryptographically secure)
 * - Add timestamp validation for replay attack prevention
 * - Implement deduplication for idempotency
 * 
 * See: Stripe, GitHub, PayPal webhook security documentation
 */
```

Keep the middleware code for backward compatibility but don't use it in routes.

#### Step 3: Update Configuration Documentation

**File**: `docs/CONFIGURATION_GUIDE.md` or `README.md`

Add section:
```markdown
## Webhook Security

This application uses **signature-only verification** for webhooks, following
industry best practices from Stripe, GitHub, and PayPal.

### Security Layers

1. **HTTPS**: All webhooks must use HTTPS (enforced by hosting platform)
2. **HMAC-SHA256 Signature**: Cryptographic verification of webhook authenticity
3. **Timestamp Validation**: Prevents replay attacks (5-minute window)
4. **Deduplication**: Prevents duplicate processing via database tracking
5. **Rate Limiting**: 10 requests per minute per IP

### Why No IP Whitelisting?

IP whitelisting is NOT used because:
- **Cloud-Incompatible**: Unreliable with proxies (Replit, AWS, Cloudflare)
- **Maintenance Burden**: Provider IPs change without notice
- **False Security**: Easily bypassed in cloud environments
- **Industry Standard**: Major providers use signature-only verification

### Configuration

Required environment variable:
```bash
RAZORPAY_WEBHOOK_SECRET=whsec_your_secret_here
```

No trust proxy configuration needed for webhooks.
```

#### Step 4: Remove Unused Environment Variables

**File**: `.env.example` or configuration docs

**Remove** (no longer needed):
```bash
RAZORPAY_WEBHOOK_IPS=  # DEPRECATED: Not needed with signature verification
TRUST_PROXY=           # DEPRECATED: Not needed for webhooks
```

**Keep**:
```bash
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

#### Step 5: Testing Checklist

**Before deploying**:

1. ✅ Test webhook with valid signature → Should succeed
2. ✅ Test webhook with invalid signature → Should reject (400)
3. ✅ Test webhook with old timestamp → Should reject (400)
4. ✅ Test duplicate webhook (same event_id) → Should return success but skip processing
5. ✅ Test rate limiting (>10 requests/minute) → Should reject (429)
6. ✅ Test from Razorpay test mode → Should succeed
7. ✅ Verify no IP-related errors in logs

**Testing Commands**:

```bash
# Generate test signature
node -e "
const crypto = require('crypto');
const payload = '{\"test\":\"data\"}';
const secret = 'YOUR_WEBHOOK_SECRET';
const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
console.log('Signature:', signature);
"

# Test webhook endpoint
curl -X POST https://yourapp.repl.co/api/payment/webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: SIGNATURE_FROM_ABOVE" \
  -d '{"test":"data"}'

# Expected: 400 (invalid event structure, but signature accepted)
# NOT: 403 (IP rejected)
```

---

### 7.2 Alternative Implementation (Trust Proxy + Whitelist)

**Only if you must keep IP whitelisting** (not recommended):

#### Step 1: Set Trust Proxy

**File**: `.env`

```bash
# Trust Replit's single proxy
TRUST_PROXY=1
```

#### Step 2: Platform-Specific Configuration

Create deployment guide:

```markdown
## Platform Trust Proxy Configuration

### Replit
```bash
TRUST_PROXY=1
```

### AWS Application Load Balancer
```bash
TRUST_PROXY=1
```

### AWS ALB + CloudFront
```bash
TRUST_PROXY=2
```

### Heroku
```bash
TRUST_PROXY=1
```

### Local Development
```bash
TRUST_PROXY=false
# AND disable IP whitelist in routes
```
```

#### Step 3: Monitoring

Add logging to detect IP parsing issues:

```typescript
// In webhookIpWhitelist middleware
logger.info('Webhook IP detection', {
  'req.ip': req.ip,
  'socket.remoteAddress': req.connection?.remoteAddress,
  'x-forwarded-for': req.headers['x-forwarded-for'],
  'normalized': normalizedIp,
  'whitelisted': whitelistedIps.includes(normalizedIp),
  trustProxyConfig: app.get('trust proxy'),
});
```

---

### 7.3 Testing Guide

#### Local Testing (Without IP Whitelist)

**Using ngrok**:
```bash
# Terminal 1: Start app
npm run dev

# Terminal 2: Create tunnel
ngrok http 5000

# Copy HTTPS URL: https://abc123.ngrok.io
# Configure in Razorpay Dashboard:
#   Webhook URL: https://abc123.ngrok.io/api/payment/webhook
#   Events: payment.captured, payment.failed, order.paid

# Create test payment in Razorpay Dashboard
# Monitor ngrok inspector: http://127.0.0.1:4040
```

#### Production Testing

**Razorpay Test Mode**:
1. Switch to Test Mode in Razorpay Dashboard
2. Configure webhook with production URL
3. Create test payment using test card: `4111 1111 1111 1111`
4. Verify webhook delivery in Razorpay Webhook Logs
5. Check application logs for successful processing

**Verification Queries**:
```sql
-- Check webhook processing
SELECT event_id, event_type, status, created_at, processed_at
FROM webhook_events
ORDER BY created_at DESC
LIMIT 10;

-- Check for any failures
SELECT * FROM webhook_events
WHERE status = 'failed'
ORDER BY created_at DESC;
```

---

## 8. Conclusion

### 8.1 Summary

The Razorpay webhook IP whitelisting issue is caused by:
1. Replit's proxy infrastructure (webhooks appear from 10.84.6.70)
2. Missing `TRUST_PROXY=1` configuration (Express can't parse X-Forwarded-For)
3. Fundamental limitation of IP whitelisting in cloud environments

### 8.2 Recommended Action

**Remove IP whitelisting entirely** and rely on signature verification.

**Justification**:
- ✅ Aligns with industry best practices (Stripe, GitHub, PayPal)
- ✅ Works in any cloud environment without configuration
- ✅ Cryptographically secure (HMAC-SHA256)
- ✅ No maintenance burden (no IP tracking)
- ✅ Simpler codebase (fewer failure points)

### 8.3 Alternative Actions

**If IP whitelist must be kept** (not recommended):
1. Set `TRUST_PROXY=1` in `.env`
2. Document platform-specific requirements
3. Add monitoring for IP detection issues
4. Plan to remove IP whitelist in future

**Never do**:
- ❌ Whitelist Replit's internal IPs (10.x.x.x)
- ❌ Parse X-Forwarded-For manually
- ❌ Disable signature verification

### 8.4 Security Assessment

**Current State** (IP whitelist blocking webhooks):
- Security: HIGH (but non-functional)
- Reliability: BROKEN
- Maintainability: POOR

**After Removing IP Whitelist**:
- Security: VERY HIGH (signature + timestamp + deduplication)
- Reliability: EXCELLENT (works in any environment)
- Maintainability: EXCELLENT (no configuration needed)

**After Fixing Trust Proxy** (alternative):
- Security: HIGH (defense in depth)
- Reliability: MODERATE (platform-specific)
- Maintainability: MODERATE (requires monitoring)

### 8.5 Next Steps

1. **Immediate**: Remove `webhookIpWhitelist` from payment routes
2. **Testing**: Verify webhooks work in Razorpay test mode
3. **Documentation**: Update security docs to reflect signature-only approach
4. **Monitoring**: Set up alerts for webhook failures
5. **Cleanup**: Mark IP whitelist middleware as deprecated

---

## Appendix A: Reference Implementation

**Complete secure webhook handler** (signature-only):

```typescript
// server/routes/payment.routes.ts
import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { webhookRateLimit } from '../middleware/webhook-security';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';

const router = Router();

// Public webhook endpoints - Security via signature verification
router.post('/webhook', 
  webhookRateLimit,  // DDoS protection only
  asyncHandler((req: AuthenticatedRequest, res: Response) => 
    paymentController.handleWebhook(req, res)
  )
);

router.post('/webhook/refund', 
  webhookRateLimit,
  asyncHandler((req: AuthenticatedRequest, res: Response) => 
    paymentController.handleRefundWebhook(req, res)
  )
);

export default router;
```

**Security verification in controller** (already implemented):

```typescript
// server/controllers/payment.controller.ts
async handleWebhook(req: AuthenticatedRequest, res: Response) {
  // 1. Verify signature (cryptographic authentication)
  const signature = req.headers['x-razorpay-signature'];
  const isValid = razorpayService.verifyWebhookSignature(req.body, signature);
  if (!isValid) {
    return this.sendError(res, 400, 'INVALID_SIGNATURE');
  }

  // 2. Parse payload
  const payload = JSON.parse(req.body.toString('utf8'));
  
  // 3. Verify timestamp (replay attack prevention)
  const webhookAge = Date.now() / 1000 - payload.created_at;
  if (webhookAge > 300) {  // 5 minutes
    return this.sendError(res, 400, 'WEBHOOK_TOO_OLD');
  }

  // 4. Check deduplication (idempotency)
  const isDuplicate = await webhookDeduplicationService.isDuplicate(payload.event_id);
  if (isDuplicate) {
    return this.sendSuccess(res, 'Event already processed');
  }

  // 5. Process webhook
  await this.processWebhook(payload);
  
  return this.sendSuccess(res, 'OK');
}
```

---

## Appendix B: Security Comparison

### Industry Standard Implementations

**Stripe Webhooks**:
```typescript
// Stripe's recommended approach
const signature = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.body, 
  signature, 
  webhookSecret
);
// No IP whitelisting
// Signature-only verification
// Works in any environment
```

**GitHub Webhooks**:
```typescript
// GitHub's approach
const signature = req.headers['x-hub-signature-256'];
const hmac = crypto.createHmac('sha256', secret);
hmac.update(req.body);
const digest = 'sha256=' + hmac.digest('hex');
const isValid = crypto.timingSafeEqual(
  Buffer.from(signature), 
  Buffer.from(digest)
);
// No IP whitelisting
// Signature-only + constant-time comparison
```

**PayPal Webhooks**:
```typescript
// PayPal's approach
const verifyResult = await paypal.notification.webhookEvent.verify(
  req.headers,
  req.body,
  webhookId
);
// No IP whitelisting
// Signature verification via API call
```

**Common Pattern**: All major providers use signature verification without IP whitelisting.

---

## Appendix C: Troubleshooting Guide

### Symptom: 403 Forbidden (IP Rejected)

**Check**:
1. Is `webhookIpWhitelist` middleware used? → Remove it
2. Is `TRUST_PROXY` set? → If using IP whitelist, set to `1`
3. Check logs for `clientIp` value

### Symptom: 400 Invalid Signature

**Check**:
1. Verify `RAZORPAY_WEBHOOK_SECRET` matches Razorpay Dashboard
2. Ensure raw body middleware is BEFORE `express.json()`
3. Check signature header: `x-razorpay-signature`

### Symptom: 400 Webhook Too Old

**Check**:
1. Server clock sync: `date` should match current time
2. Network latency (should be <5 minutes)
3. Razorpay retry delay

### Symptom: Duplicate Processing

**Check**:
1. `webhook_events` table has unique constraint on `event_id`
2. Deduplication service is called before processing
3. Database transaction commits successfully

### Symptom: No Webhook Received

**Check**:
1. Razorpay Dashboard → Webhooks → Logs (check delivery status)
2. Webhook URL is correct and publicly accessible
3. Events are subscribed in Razorpay Dashboard
4. Application logs for any errors

---

**Report Generated**: November 21, 2025  
**Recommended by**: Industry standards (Stripe, GitHub, PayPal, OWASP)  
**Implementation**: Remove IP whitelist, keep signature verification  
**Impact**: Immediate fix + improved security + better maintainability
