# Razorpay Webhook Testing Guide

## Table of Contents
1. [Current Implementation Overview](#current-implementation-overview)
2. [Configuration Requirements](#configuration-requirements)
3. [Testing Methods](#testing-methods)
4. [Common Issues & Diagnosis](#common-issues--diagnosis)
5. [Step-by-Step Testing Checklist](#step-by-step-testing-checklist)

---

## Current Implementation Overview

### Webhook Endpoints

Your application has **two webhook endpoints** configured:

#### 1. Main Payment Webhook
- **URL**: `POST /api/payment/webhook`
- **Purpose**: Handles payment lifecycle events
- **Supported Events**:
  - `payment.captured` - Payment successfully captured
  - `payment.failed` - Payment attempt failed
  - `order.paid` - Order marked as paid

#### 2. Refund Webhook
- **URL**: `POST /api/payment/webhook/refund`
- **Purpose**: Handles refund status updates
- **Supported Events**:
  - `refund.processed` - Refund successfully processed
  - `refund.failed` - Refund failed

### Security Measures

Your webhook implementation has **multi-layered security**:

#### Layer 1: IP Whitelisting
- **Middleware**: `webhookIpWhitelist` in `server/middleware/webhook-security.ts`
- **Function**: Only accepts webhooks from Razorpay's official IP addresses
- **Default IPs**:
  - `3.7.71.51`
  - `3.7.71.52`
  - `3.7.71.53`
- **Features**:
  - Normalizes IPv6-mapped IPv4 addresses (e.g., `::ffff:3.7.71.51` → `3.7.71.51`)
  - Requires `trust proxy` to be configured correctly
  - Returns `403 Forbidden` for unauthorized IPs
  - Logs all rejected attempts

#### Layer 2: Rate Limiting
- **Middleware**: `webhookRateLimit` in `server/middleware/webhook-security.ts`
- **Limits**: 10 requests per minute per IP
- **Purpose**: Prevents DDoS attacks and webhook spam
- **Response**: `429 Too Many Requests` when exceeded

#### Layer 3: Signature Verification
- **Method**: HMAC SHA256 signature verification
- **Header**: `x-razorpay-signature`
- **Secret**: Uses `RAZORPAY_WEBHOOK_SECRET` environment variable
- **Process**:
  1. Receives raw request body as Buffer
  2. Computes HMAC-SHA256 hash using webhook secret
  3. Compares computed signature with received signature
  4. Rejects if signatures don't match

#### Layer 4: Timestamp Validation
- **Purpose**: Prevents replay attacks
- **Validation**: Rejects webhooks older than 5 minutes (300 seconds)
- **Field**: Uses `created_at` field from webhook payload
- **Response**: `400 WEBHOOK_TOO_OLD` for expired webhooks

#### Layer 5: Deduplication
- **Purpose**: Prevents duplicate processing of the same event
- **Table**: `webhook_events` in database
- **Fields**:
  - `event_id` - Unique event identifier from Razorpay
  - `event_type` - Type of webhook event
  - `payload` - Full webhook payload (for debugging)
  - `status` - Processing status: `processing`, `success`, `failed`
  - `error_message` - Error details if processing failed
  - `processed_at` - Timestamp when processing completed
- **Process**:
  1. Check if `event_id` already exists in database
  2. If exists, return `200 OK` (idempotent response)
  3. If new, record event and process
  4. Mark as `success` or `failed` after processing
- **Benefits**:
  - Handles Razorpay's automatic retry mechanism safely
  - Prevents double-charging or duplicate subscriptions
  - Provides audit trail for debugging

### Raw Body Handling

**CRITICAL**: Webhook signature verification requires the raw request body.

- **Configuration**: `server/index.ts` line 129
  ```javascript
  app.use('/api/payment/webhook', express.raw({ type: 'application/json', limit: '1kb' }));
  ```
- **Placement**: MUST come BEFORE `express.json()` middleware
- **Purpose**: Preserves raw bytes for accurate signature computation
- **Validation**: Controller checks `Buffer.isBuffer(req.body)` to ensure raw body

---

## Configuration Requirements

### Required Environment Variables

#### 1. Razorpay API Credentials
```bash
# Get these from Razorpay Dashboard → Settings → API Keys
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
```

#### 2. Webhook Secret
```bash
# Get from Razorpay Dashboard → Settings → Webhooks
# Or generate your own secure secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

**How to get Webhook Secret from Razorpay:**
1. Log in to Razorpay Dashboard
2. Go to **Settings** → **Webhooks**
3. Click on your webhook configuration
4. Copy the **Secret** value

#### 3. Webhook IP Whitelist (Optional)
```bash
# Leave empty to use default Razorpay IPs
# Or specify custom IPs (comma-separated)
RAZORPAY_WEBHOOK_IPS=3.7.71.51,3.7.71.52,3.7.71.53
```

#### 4. Trust Proxy Configuration (CRITICAL for Production)
```bash
# Number of proxies between client and server
# - 1: Single proxy (AWS, Heroku, most cloud platforms)
# - 2+: Multiple proxies (CDN + load balancer)
# - false/0: Direct connection (local development)
TRUST_PROXY=1
```

**Why TRUST_PROXY is critical:**
- Production deployments use reverse proxies (Nginx, AWS ALB, etc.)
- Proxies add `X-Forwarded-For` header with real client IP
- Without `trust proxy`, Express sees proxy IP instead of client IP
- **IP whitelist validation will FAIL** if misconfigured

### Razorpay Dashboard Configuration

#### 1. Create Webhook in Razorpay Dashboard
1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to **Settings** → **Webhooks**
3. Click **+ Create New Webhook**

#### 2. Configure Webhook URL

**For Production:**
```
https://yourdomain.com/api/payment/webhook
```

**For Local Testing (with ngrok/localxpose):**
```
https://your-tunnel-url.ngrok.io/api/payment/webhook
```

#### 3. Select Events to Subscribe

**Payment Events:**
- ✅ `payment.captured`
- ✅ `payment.failed`
- ✅ `order.paid`

**Refund Events** (if using refund endpoint):
- ✅ `refund.processed`
- ✅ `refund.failed`

#### 4. Set Alert Email (Optional)
Add your email to receive notifications about webhook failures.

#### 5. Save Webhook Secret
Copy the **Secret** shown after creation and add to `.env`:
```bash
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

---

## Testing Methods

### Method 1: Razorpay Dashboard Test Mode (Recommended for Development)

**Easiest method for initial testing without real payments.**

#### Step 1: Enable Test Mode
1. Open Razorpay Dashboard
2. Toggle to **Test Mode** (top-left corner)
3. Use test API keys (start with `rzp_test_`)

#### Step 2: Configure Test Webhook
1. Go to **Settings** → **Webhooks**
2. Create webhook pointing to your tunnel URL (see Method 2)
3. Subscribe to events: `payment.captured`, `payment.failed`, `order.paid`

#### Step 3: Create Test Payment
```javascript
// Use Razorpay test cards
// Success: 4111 1111 1111 1111
// Failure: 4000 0000 0000 0002
// Any CVV, future expiry date
```

#### Step 4: Verify Webhook Delivery
1. Go to **Settings** → **Webhooks** → **Logs**
2. Check webhook delivery status
3. View request/response payloads
4. Retry failed webhooks manually

**Pros:**
- ✅ No real money involved
- ✅ Can test all scenarios (success, failure)
- ✅ Built-in retry and debugging tools
- ✅ View exact payloads and responses

**Cons:**
- ❌ Requires public URL (use ngrok for local)

---

### Method 2: Local Testing with Tunneling Tools

**Required for local development since Razorpay needs a public URL.**

#### Option A: ngrok (Most Popular)

1. **Install ngrok:**
   ```bash
   # macOS
   brew install ngrok
   
   # Windows
   choco install ngrok
   
   # Linux
   snap install ngrok
   ```

2. **Start your application:**
   ```bash
   npm run dev
   # Server running on http://localhost:5000
   ```

3. **Create tunnel:**
   ```bash
   ngrok http 5000
   ```

4. **Copy HTTPS URL:**
   ```
   Forwarding: https://abc123.ngrok.io → http://localhost:5000
   ```

5. **Configure in Razorpay:**
   ```
   Webhook URL: https://abc123.ngrok.io/api/payment/webhook
   ```

6. **Monitor tunnel:**
   - Visit http://127.0.0.1:4040 for ngrok web interface
   - View all HTTP requests/responses in real-time
   - Replay requests for debugging

**Pros:**
- ✅ Free tier available
- ✅ Built-in request inspector
- ✅ HTTPS by default
- ✅ Can replay requests

**Cons:**
- ❌ URL changes on restart (free tier)
- ❌ 2-hour session limit (free tier)

#### Option B: Pinggy

1. **No installation required** (single command):
   ```bash
   ssh -p 443 -R0:localhost:5000 a.pinggy.io
   ```

2. **Copy HTTPS URL from output**

3. **Configure in Razorpay:**
   ```
   Webhook URL: https://randomstring.pinggy.io/api/payment/webhook
   ```

**Pros:**
- ✅ No installation
- ✅ Fast setup
- ✅ Free

**Cons:**
- ❌ URL changes on restart
- ❌ Less debugging features than ngrok

#### Option C: LocalXpose

1. **Install:**
   ```bash
   # Download from https://localxpose.io/
   ```

2. **Start tunnel:**
   ```bash
   loclx tunnel http --to localhost:5000
   ```

3. **Copy HTTPS URL**

**Pros:**
- ✅ Similar to ngrok
- ✅ Good free tier

---

### Method 3: Webhook Testing Tools

**Useful for testing signature verification without setting up full payment flow.**

#### Option A: Webhook.site

1. **Go to https://webhook.site/**
2. **Copy your unique URL** (e.g., `https://webhook.site/abc123`)
3. **Configure in Razorpay temporarily**
4. **Trigger payment** → webhook sent to webhook.site
5. **Copy raw payload** from webhook.site
6. **Send to your local server** using curl/Postman:
   ```bash
   curl -X POST http://localhost:5000/api/payment/webhook \
     -H "Content-Type: application/json" \
     -H "x-razorpay-signature: SIGNATURE_FROM_WEBHOOKSITE" \
     -d 'PAYLOAD_FROM_WEBHOOKSITE'
   ```

**Pros:**
- ✅ No setup required
- ✅ View payloads instantly
- ✅ Automatic request capture

**Cons:**
- ❌ Public URL (anyone can send data)
- ❌ Extra step to forward to local server
- ❌ Won't work for signature verification (secret mismatch)

#### Option B: RequestBin (requestbin.com)

Similar to Webhook.site but with additional features:
- Custom endpoint names
- Request inspection
- Response simulation

---

### Method 4: Manual Webhook Simulation

**For unit testing or offline development.**

#### Step 1: Create Test Payload

Save as `test-webhook-payload.json`:
```json
{
  "entity": "event",
  "account_id": "acc_XXXXXXXXXXX",
  "event": "payment.captured",
  "event_id": "evt_test_123456789",
  "created_at": 1732099200,
  "contains": ["payment"],
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_test_123456789",
        "entity": "payment",
        "amount": 50000,
        "currency": "INR",
        "status": "captured",
        "order_id": "order_test_123456789",
        "method": "card",
        "amount_refunded": 0,
        "captured": true,
        "email": "test@example.com",
        "contact": "+919876543210",
        "created_at": 1732099100
      }
    }
  }
}
```

#### Step 2: Generate Signature

**Using Node.js:**
```javascript
const crypto = require('crypto');
const fs = require('fs');

const webhookSecret = 'your_webhook_secret_here';
const payload = fs.readFileSync('test-webhook-payload.json', 'utf8');

const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(payload)
  .digest('hex');

console.log('Signature:', signature);
```

#### Step 3: Send Request

```bash
# Replace SIGNATURE with output from Step 2
curl -X POST http://localhost:5000/api/payment/webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: SIGNATURE" \
  -d @test-webhook-payload.json
```

#### Step 4: Verify Response

**Success Response:**
```
HTTP/1.1 200 OK
OK
```

**Failure Responses:**
```
403 Forbidden - IP not whitelisted
400 Bad Request - Invalid signature
400 Bad Request - Webhook too old
429 Too Many Requests - Rate limit exceeded
```

---

### Method 5: Production Testing

**After deployment, test webhooks in production environment.**

#### Step 1: Configure Production Webhook
1. Switch Razorpay to **Live Mode**
2. Create webhook with production URL:
   ```
   https://yourdomain.com/api/payment/webhook
   ```
3. Use **live API keys** (start with `rzp_live_`)

#### Step 2: Make Real Test Payment
- Use a real payment method
- Small amount (e.g., ₹1)
- Verify subscription activation

#### Step 3: Monitor Logs
- Check application logs for webhook processing
- Query `webhook_events` table
- Review Razorpay webhook logs

#### Step 4: Test Failure Scenarios
- Temporarily misconfigure webhook secret → verify rejection
- Trigger payment failure → verify `payment.failed` handling
- Check rate limiting with rapid requests

---

## Common Issues & Diagnosis

### Issue 1: Webhook Returns 403 Forbidden

**Symptom:**
```
{"success":false,"error":"Forbidden","message":"Webhooks only accepted from Razorpay IPs"}
```

**Causes & Solutions:**

#### Cause A: IP Whitelisting in Development
When testing locally with ngrok/tunneling, requests come from tunnel provider's IPs, not Razorpay's IPs.

**Solution:**
Temporarily disable IP whitelisting for local testing:
```typescript
// In server/routes/payment.routes.ts
// Comment out webhookIpWhitelist middleware
router.post('/webhook', 
  // webhookIpWhitelist,  // <-- Comment this line
  webhookRateLimit, 
  asyncHandler((req: AuthenticatedRequest, res: Response) => 
    paymentController.handleWebhook(req, res)
  )
);
```

**⚠️ WARNING**: Re-enable in production! This security layer is critical.

#### Cause B: Trust Proxy Misconfigured
Production environment behind proxy, but `TRUST_PROXY` not set correctly.

**Solution:**
```bash
# In .env (production)
TRUST_PROXY=1
```

**Verification:**
Check logs for IP detection:
```
Rejected webhook from unauthorized IP {
  clientIp: '::ffff:10.0.0.1',  // ← Wrong (internal proxy IP)
  normalizedIp: '10.0.0.1',
  whitelistedIps: ['3.7.71.51', '3.7.71.52', '3.7.71.53']
}
```

Should be:
```
Webhook request from whitelisted IP accepted {
  clientIp: '3.7.71.51',  // ← Correct (Razorpay IP)
  normalizedIp: '3.7.71.51'
}
```

#### Cause C: Custom Webhook IPs Configured Incorrectly
`RAZORPAY_WEBHOOK_IPS` environment variable has typos or wrong IPs.

**Solution:**
```bash
# Remove or fix RAZORPAY_WEBHOOK_IPS in .env
# Leave empty to use default Razorpay IPs
RAZORPAY_WEBHOOK_IPS=
```

---

### Issue 2: Webhook Returns 400 Invalid Signature

**Symptom:**
```
{"success":false,"message":"Invalid webhook signature"}
```

**Causes & Solutions:**

#### Cause A: Wrong Webhook Secret
Mismatch between `RAZORPAY_WEBHOOK_SECRET` and actual secret in Razorpay dashboard.

**Solution:**
1. Go to Razorpay Dashboard → Settings → Webhooks
2. Click on your webhook
3. Copy the **Secret** value
4. Update `.env`:
   ```bash
   RAZORPAY_WEBHOOK_SECRET=whsec_actual_secret_from_dashboard
   ```
5. Restart server

#### Cause B: Body Parsing Issue
Request body was parsed as JSON instead of raw Buffer.

**Solution:**
Verify middleware order in `server/index.ts`:
```javascript
// CORRECT ORDER:
app.use('/api/payment/webhook', express.raw({ type: 'application/json', limit: '1kb' }));
app.use(express.json());  // <-- Must come AFTER webhook raw body handler

// WRONG ORDER (will break signature verification):
app.use(express.json());  // <-- Parses body before webhook handler
app.use('/api/payment/webhook', express.raw({ type: 'application/json', limit: '1kb' }));
```

**Verification:**
Check controller logs:
```
Webhook received parsed body instead of raw Buffer
```

#### Cause C: Signature Computation Issue
Webhook secret contains extra whitespace or wrong encoding.

**Solution:**
```bash
# Ensure no quotes, spaces, or newlines in secret
RAZORPAY_WEBHOOK_SECRET=whsec_abc123xyz
```

**Verification Test:**
```javascript
// Test signature generation locally
const crypto = require('crypto');
const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
const payload = '{"test":"data"}';
const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
console.log('Test signature:', signature);
```

---

### Issue 3: Webhook Returns 400 Webhook Too Old

**Symptom:**
```
{"error":"WEBHOOK_TOO_OLD","message":"Webhook timestamp too old, possible replay attack"}
```

**Causes & Solutions:**

#### Cause A: Server Clock Skew
Server time is significantly different from actual time.

**Solution:**
1. Check server time:
   ```bash
   date
   ```
2. Sync server clock:
   ```bash
   # Linux
   sudo ntpdate -s time.nist.gov
   
   # Or configure NTP service
   sudo systemctl enable systemd-timesyncd
   sudo systemctl start systemd-timesyncd
   ```

#### Cause B: Delayed Webhook Delivery
Network issues or Razorpay delays caused webhook to arrive late.

**Solution:**
- This is expected behavior (security feature)
- Razorpay will retry automatically
- Check Razorpay webhook logs for retry status

#### Cause C: Replayed Old Webhook
Someone is replaying an old webhook (attack attempt).

**Solution:**
- No action needed - security working as intended
- Monitor logs for unusual patterns

---

### Issue 4: Duplicate Webhook Processing

**Symptom:**
- Same payment creates multiple subscriptions
- Logs show same `event_id` processed multiple times

**Causes & Solutions:**

#### Cause A: Deduplication Service Not Working
Database unique constraint not created or service bypassed.

**Solution:**
1. Verify `webhook_events` table exists:
   ```sql
   SELECT * FROM webhook_events LIMIT 1;
   ```

2. Check unique constraint on `event_id`:
   ```sql
   SELECT constraint_name, constraint_type 
   FROM information_schema.table_constraints 
   WHERE table_name = 'webhook_events' AND constraint_type = 'UNIQUE';
   ```

3. If missing, run migration:
   ```bash
   npm run db:migrate
   ```

#### Cause B: Transaction Rollback
Webhook processing succeeded but transaction rolled back, so event marked as failed.

**Solution:**
- Check logs for transaction errors
- Review `webhook_events` table for events with `status = 'failed'`
- Manually retry if needed

---

### Issue 5: No Webhook Received

**Symptom:**
- Payment succeeds in Razorpay dashboard
- No webhook logged in application
- `webhook_events` table empty

**Diagnostic Steps:**

#### Step 1: Verify Webhook Configuration
1. Razorpay Dashboard → Settings → Webhooks
2. Check webhook is **Active** (not Disabled)
3. Verify URL is correct
4. Check events are subscribed

#### Step 2: Check Razorpay Webhook Logs
1. Razorpay Dashboard → Settings → Webhooks → Logs
2. Find your payment event
3. Check delivery status:
   - **Success (200)**: Webhook delivered successfully → check app logs
   - **Failed (4xx/5xx)**: See error message → fix issue
   - **Not Sent**: Event not subscribed or webhook disabled

#### Step 3: Verify Public URL Accessibility
```bash
# Test if your webhook URL is publicly reachable
curl -X POST https://yourdomain.com/api/payment/webhook \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'

# Expected: 400 Bad Request (missing signature)
# Good: Means endpoint is reachable
# Bad: Connection timeout/refused → firewall or server down
```

#### Step 4: Check Firewall Rules
- Ensure port 443 (HTTPS) or 80 (HTTP) is open
- Allow incoming traffic from Razorpay IPs
- Check cloud provider security groups

#### Step 5: Review Application Logs
```bash
# Check if webhook endpoint was hit
grep "Webhook received" logs/combined.log

# Check for middleware rejections
grep "Rejected webhook" logs/combined.log

# Check for errors
grep "ERROR" logs/error.log
```

---

### Issue 6: Rate Limiting Triggered

**Symptom:**
```
{"success":false,"error":"Too Many Requests","message":"Too many webhook requests"}
```

**Causes & Solutions:**

#### Cause A: Legitimate High Volume
Razorpay sending webhooks faster than rate limit (10/min).

**Solution:**
Increase rate limit temporarily:
```typescript
// In server/middleware/webhook-security.ts
export const webhookRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 50,  // Increase from 10 to 50
  // ...
});
```

#### Cause B: Webhook Retry Loop
Webhook fails → Razorpay retries → fails again → retries repeatedly.

**Solution:**
1. Fix underlying issue causing failures
2. Razorpay will stop retrying after 24 hours
3. Manually mark old events as processed in database

#### Cause C: Attack/Spam
Someone spamming webhook endpoint.

**Solution:**
- Rate limiting working as intended
- Review IP whitelist configuration
- Enable IP whitelist if disabled

---

## Step-by-Step Testing Checklist

### Pre-Deployment Testing (Local Development)

#### 1. Environment Setup
- [ ] `.env` file contains all required Razorpay variables
- [ ] `RAZORPAY_KEY_ID` is set (test mode: `rzp_test_xxx`)
- [ ] `RAZORPAY_KEY_SECRET` is set
- [ ] `RAZORPAY_WEBHOOK_SECRET` is set
- [ ] `TRUST_PROXY` is configured correctly
- [ ] Server starts without errors

#### 2. Database Setup
- [ ] `webhook_events` table exists
- [ ] Unique constraint on `event_id` column
- [ ] Table has required columns: `status`, `payload`, `error_message`, etc.

#### 3. Middleware Configuration
- [ ] Raw body middleware is BEFORE `express.json()`
- [ ] IP whitelist disabled OR tunnel IP whitelisted
- [ ] Rate limiting enabled
- [ ] Trust proxy setting matches deployment

#### 4. Razorpay Dashboard Setup
- [ ] Switched to **Test Mode**
- [ ] Webhook created with tunnel URL (ngrok/pinggy)
- [ ] Events subscribed: `payment.captured`, `payment.failed`, `order.paid`
- [ ] Webhook secret copied to `.env`
- [ ] Webhook is **Active**

#### 5. Tunneling Setup (ngrok/pinggy)
- [ ] Tunnel running and pointing to localhost:5000
- [ ] HTTPS URL obtained
- [ ] URL updated in Razorpay webhook configuration
- [ ] Test request to tunnel succeeds

#### 6. Signature Verification Test
```bash
# Test with manual webhook simulation
- [ ] Generated test payload
- [ ] Computed correct signature
- [ ] Sent request to local server
- [ ] Received 200 OK response
- [ ] Event recorded in webhook_events table
```

#### 7. Full Payment Flow Test
```bash
- [ ] Created test order via /api/payment/create-order
- [ ] Completed payment with test card (4111 1111 1111 1111)
- [ ] Webhook received by application
- [ ] Signature verified successfully
- [ ] Event recorded in webhook_events
- [ ] Payment.captured handler executed
- [ ] Subscription created/updated
- [ ] User can access subscription features
```

#### 8. Failure Scenario Tests
```bash
- [ ] Test payment failure (card 4000 0000 0000 0002)
- [ ] payment.failed webhook received
- [ ] Failed payment logged in database
- [ ] Alert email sent (if configured)

- [ ] Test invalid signature → returns 400
- [ ] Test missing signature → returns 400
- [ ] Test old timestamp → returns 400 WEBHOOK_TOO_OLD
- [ ] Test duplicate event_id → returns 200 (idempotent)
- [ ] Test rate limiting → returns 429 after 10 requests
```

#### 9. Log Verification
```bash
- [ ] Check application logs for webhook processing
- [ ] Verify no errors in logs/error.log
- [ ] Check ngrok request inspector (http://localhost:4040)
- [ ] Review Razorpay webhook logs (dashboard)
```

---

### Production Deployment Testing

#### 1. Pre-Deployment
- [ ] Switch Razorpay to **Live Mode**
- [ ] Update environment variables with live keys:
  - [ ] `RAZORPAY_KEY_ID=rzp_live_xxx`
  - [ ] `RAZORPAY_KEY_SECRET=xxx`
  - [ ] `RAZORPAY_WEBHOOK_SECRET=whsec_xxx` (new secret for live mode)
- [ ] `TRUST_PROXY=1` (or appropriate value)
- [ ] IP whitelist enabled
- [ ] Deploy application to production

#### 2. Razorpay Live Webhook Setup
- [ ] Create webhook with production URL: `https://yourdomain.com/api/payment/webhook`
- [ ] Subscribe to events: `payment.captured`, `payment.failed`, `order.paid`
- [ ] Copy webhook secret to production `.env`
- [ ] Webhook is **Active**
- [ ] Alert email configured

#### 3. Connectivity Test
```bash
- [ ] Test webhook endpoint accessibility from external network
- [ ] Verify HTTPS certificate is valid
- [ ] Check firewall allows incoming HTTPS (port 443)
- [ ] Verify server is running
```

#### 4. IP Whitelist Verification
```bash
# Test from non-whitelisted IP
- [ ] Send test request → expect 403 Forbidden
- [ ] Check logs show IP rejection

# Wait for real Razorpay webhook
- [ ] Webhook from Razorpay IP → expect 200 OK
- [ ] Check logs show IP acceptance
```

#### 5. Real Payment Test
```bash
- [ ] Create small test payment (₹1 or ₹10)
- [ ] Complete payment with real payment method
- [ ] Verify webhook received within 30 seconds
- [ ] Check webhook_events table for event record
- [ ] Verify subscription activated
- [ ] Test user access to subscription features
```

#### 6. Razorpay Dashboard Verification
- [ ] Go to Settings → Webhooks → Logs
- [ ] Find test payment event
- [ ] Status shows **200 OK**
- [ ] Response body shows `OK`
- [ ] Timestamp within expected range

#### 7. Database Verification
```sql
-- Check webhook event
SELECT * FROM webhook_events 
WHERE event_type = 'payment.captured' 
ORDER BY created_at DESC LIMIT 5;
-- Expected: status = 'success', error_message = NULL

-- Check payment record
SELECT * FROM payments 
WHERE payment_reference = 'pay_xxx' 
LIMIT 1;
-- Expected: record exists with correct amount

-- Check subscription
SELECT * FROM user_subscriptions 
WHERE user_id = 'test_user_id' 
ORDER BY created_at DESC LIMIT 1;
-- Expected: status = 'active', plan_id correct
```

#### 8. Monitoring Setup
- [ ] Set up log monitoring (CloudWatch, Datadog, etc.)
- [ ] Create alerts for webhook failures
- [ ] Monitor `webhook_events` table for failed events
- [ ] Set up Slack/email alerts for payment failures (if configured)

#### 9. Failure Recovery Test
```bash
- [ ] Trigger webhook failure (temporarily break database)
- [ ] Verify event marked as 'failed' in webhook_events
- [ ] Verify error_message populated
- [ ] Fix issue
- [ ] Manually retry event from Razorpay dashboard
- [ ] Verify retry succeeds
```

#### 10. Load Testing
```bash
- [ ] Simulate 10 concurrent webhooks
- [ ] Verify all processed successfully
- [ ] Check for race conditions
- [ ] Verify deduplication works
- [ ] Monitor database locks
- [ ] Check application performance
```

---

## Debugging Tips

### 1. Enable Verbose Logging

Temporarily increase log level for debugging:
```bash
# In .env
LOG_LEVEL=debug
LOG_FORMAT=pretty
```

Restart server and check logs:
```bash
tail -f logs/combined.log | grep -i webhook
```

### 2. Query Webhook Events

```sql
-- Recent webhook events
SELECT 
  event_id,
  event_type,
  status,
  error_message,
  created_at,
  processed_at
FROM webhook_events
ORDER BY created_at DESC
LIMIT 20;

-- Failed webhooks
SELECT * FROM webhook_events 
WHERE status = 'failed' 
ORDER BY created_at DESC;

-- Processing webhooks (stuck?)
SELECT * FROM webhook_events 
WHERE status = 'processing' 
AND created_at < NOW() - INTERVAL '5 minutes';
```

### 3. Manual Webhook Replay

If webhook failed and you need to replay:

```javascript
// Get payload from webhook_events table
const payload = { /* copy from database */ };

// Compute new signature with current secret
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');

// Send with curl
curl -X POST http://localhost:5000/api/payment/webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: ${signature}" \
  -d '${JSON.stringify(payload)}'
```

### 4. Test Signature Verification in Isolation

Create test script:
```javascript
// test-signature.js
const crypto = require('crypto');

const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
const payload = '{"test":"data"}';
const receivedSignature = 'signature_from_razorpay';

const computedSignature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

console.log('Received:', receivedSignature);
console.log('Computed:', computedSignature);
console.log('Match:', receivedSignature === computedSignature);
```

### 5. Monitor Real-Time Logs

```bash
# Watch all webhook activity
tail -f logs/combined.log | grep -i "webhook"

# Watch for errors only
tail -f logs/error.log

# Watch specific event type
tail -f logs/combined.log | grep "payment.captured"
```

---

## Security Best Practices

### 1. Always Verify Signatures
Never process webhooks without signature verification in production.

### 2. Use HTTPS Only
Webhooks must use HTTPS to prevent man-in-the-middle attacks.

### 3. Keep Webhook Secret Secure
- Never commit secrets to git
- Use environment variables
- Rotate secrets periodically
- Use different secrets for test and live modes

### 4. Enable IP Whitelisting in Production
Critical security layer - only disable for local testing.

### 5. Implement Rate Limiting
Prevent DDoS attacks by limiting requests per IP.

### 6. Use Deduplication
Prevent duplicate processing of webhook events.

### 7. Validate Timestamps
Reject old webhooks to prevent replay attacks.

### 8. Log Everything
Maintain audit trail for debugging and compliance.

### 9. Return 200 OK Quickly
Process webhooks asynchronously to avoid timeouts.
Always return 200 OK to prevent Razorpay retries.

### 10. Monitor Failures
Set up alerts for webhook processing failures.

---

## Quick Reference

### Webhook URLs
```
Payment Webhook:  POST /api/payment/webhook
Refund Webhook:   POST /api/payment/webhook/refund
```

### Expected HTTP Responses
```
200 OK               - Success (always return this to Razorpay)
400 Bad Request      - Invalid signature, missing fields, old timestamp
403 Forbidden        - IP not whitelisted
429 Too Many Requests - Rate limit exceeded
500 Internal Server Error - Unexpected server error
```

### Razorpay Test Cards
```
Success:  4111 1111 1111 1111 (any CVV, future expiry)
Failure:  4000 0000 0000 0002 (any CVV, future expiry)
```

### Environment Variables
```bash
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
RAZORPAY_WEBHOOK_IPS=3.7.71.51,3.7.71.52,3.7.71.53
TRUST_PROXY=1
```

### Useful SQL Queries
```sql
-- Check recent webhooks
SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 10;

-- Check failed webhooks
SELECT * FROM webhook_events WHERE status = 'failed';

-- Check webhook by event_id
SELECT * FROM webhook_events WHERE event_id = 'evt_xxxxx';
```

---

## Support Resources

### Razorpay Documentation
- [Webhooks Guide](https://razorpay.com/docs/webhooks/)
- [Webhook Events Reference](https://razorpay.com/docs/webhooks/events/)
- [Signature Verification](https://razorpay.com/docs/webhooks/validate-test/)

### Your Implementation Files
- Main webhook handler: `server/controllers/payment.controller.ts`
- Security middleware: `server/middleware/webhook-security.ts`
- Razorpay service: `server/services/integration/razorpay.service.ts`
- Deduplication service: `server/services/infrastructure/webhook-deduplication.service.ts`
- Routes: `server/routes/payment.routes.ts`
- Configuration: `server/config/index.ts`

### Database Tables
- `webhook_events` - Webhook event tracking and deduplication
- `payments` - Payment records
- `user_subscriptions` - Active subscriptions
- `failed_payments` - Failed payment attempts

---

## Conclusion

Your Razorpay webhook implementation includes comprehensive security measures:
- ✅ IP whitelisting
- ✅ Rate limiting
- ✅ Signature verification
- ✅ Timestamp validation
- ✅ Deduplication
- ✅ Audit logging

Follow this guide to test thoroughly before going live. Start with local testing using ngrok, then move to production with small test payments. Monitor logs and database closely during the transition.

**Remember**: Webhooks are critical for subscription activation. Test all scenarios (success, failure, retry, duplicate) to ensure robust handling.
