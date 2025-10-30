# Configuration Guide - EduPath Platform

**Last Updated:** October 28, 2025  
**Version:** 2.0 (Centralized Configuration System)

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Configuration Files](#configuration-files)
4. [All Configuration Options](#all-configuration-options)
5. [Environment-Specific Examples](#environment-specific-examples)
6. [TRUST_PROXY Configuration](#trust_proxy-configuration)
7. [Migration from NODE_ENV](#migration-from-nodeenv)
8. [Testing Configuration](#testing-configuration)
9. [Common Pitfalls and Solutions](#common-pitfalls-and-solutions)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The EduPath platform uses a **centralized, type-safe configuration system** that replaces scattered `process.env` checks with a unified config module. This approach:

✅ **Enables testing of production features in development**  
✅ **Provides type safety and validation via Zod schemas**  
✅ **Supports layered environment files** (.env, .env.local, .env.development, etc.)  
✅ **Prevents common deployment mistakes** with fail-fast validation  
✅ **Eliminates auto-generated secrets** that invalidate on restart

### Key Principles

1. **NODE_ENV** is for framework-level concerns only (build optimizations, framework behavior)
2. **Feature flags** control business logic (SEO, monitoring, error details)
3. **Configuration** drives behavior (CORS, logging, cookies)
4. **Secrets** are always required (never auto-generated)

### Architecture

The configuration module (`server/config/index.ts`) uses:
- **dotenv-flow** for automatic layered environment file loading
- **Zod** for schema validation and type safety
- **TypeScript** for compile-time type checking
- **Fail-fast** validation to catch errors immediately

---

## Quick Start

### 1. Copy Environment Template

```bash
cp .env.example .env.local
```

### 2. Set Required Secrets

```bash
# Generate secure secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"  # For JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # For CSRF_SECRET

# Add to .env.local
JWT_SECRET=your-generated-jwt-secret-min-64-characters
CSRF_SECRET=your-generated-csrf-secret-min-32-characters
```

### 3. Configure Features (Optional)

Edit `.env.local` to enable/disable features:

```env
# Enable SEO in development for testing
SEO_META_ENABLED=true

# Enable monitoring in development
MONITORING_ENABLED=true

# Show detailed errors
ERROR_DETAILS_ENABLED=true
```

### 4. Start the Server

```bash
npm run dev
```

The configuration module will:
- ✅ Load environment files in correct order
- ✅ Validate all required variables
- ✅ Fail fast with clear error messages if anything is missing

---

## Configuration Files

### File Loading Order

Environment files are loaded in this order (later files override earlier ones):

1. **`.env`** (base configuration, committed to git)
2. **`.env.local`** (local overrides, gitignored)
3. **`.env.{NODE_ENV}`** (e.g., `.env.development`, `.env.production`)
4. **`.env.{NODE_ENV}.local`** (environment-specific local overrides, gitignored)

### Which File to Use?

| File | Purpose | Committed? | Use For |
|------|---------|------------|---------|
| `.env` | Base defaults | ✅ Yes | Default values safe to commit |
| `.env.local` | Personal overrides | ❌ No | Your local development secrets |
| `.env.development` | Dev defaults | ❌ No | Development-specific settings |
| `.env.production` | Prod template | ✅ Yes | Production configuration template |
| `.env.test` | Test config | ✅ Yes | Test environment settings |
| `.env.example` | Documentation | ✅ Yes | Documentation and templates |

### Local Override Instructions

#### Step 1: Create `.env.local`

```bash
cp .env.example .env.local
```

#### Step 2: Add Your Secrets

```env
# .env.local (never commit this file!)
JWT_SECRET=your-personal-dev-secret-min-64-characters
CSRF_SECRET=your-personal-dev-secret-min-32-characters
```

#### Step 3: Override Any Settings

```env
# .env.local

# Enable production features for testing
SEO_META_ENABLED=true
MONITORING_ENABLED=true

# Customize logging
LOG_LEVEL=debug
LOG_FORMAT=pretty

# Test CORS
CORS_ENABLED=true
ALLOWED_ORIGINS=http://localhost:3000
```

#### Step 4: Restart Server

Environment files are loaded at startup, so restart the server to apply changes:

```bash
# Stop server (Ctrl+C)
npm run dev
```

---

## All Configuration Options

### Application Configuration

```env
# Environment mode (auto-detected, usually don't need to set)
NODE_ENV=development  # Options: development, production, test

# Server port
PORT=5000
```

### Required Security Secrets

```env
# JWT secret for authentication (minimum 64 characters)
JWT_SECRET=your-secure-jwt-secret-min-64-characters

# CSRF secret for CSRF protection (minimum 32 characters)
CSRF_SECRET=your-secure-csrf-secret-min-32-characters

# Trust Proxy Configuration - Critical for secure IP detection and rate limiting
# Set to the number of proxies between clients and your server
# - false or 0: No proxy (direct connection to clients)
# - 1: Behind single proxy (AWS Lightsail, Heroku, most cloud platforms)
# - 2+: Behind multiple proxies (CDN + load balancer, etc.)
# WARNING: Setting this incorrectly allows IP spoofing and rate limit bypass!
TRUST_PROXY=1
```

### Feature Flags - Production Features

Control which production features are enabled. All flags can be enabled in any environment for testing.

```env
# SEO & Meta Tags - Inject SEO meta tags into HTML pages
SEO_META_ENABLED=true

# Security & Redirects - Force HTTPS redirection
FORCE_HTTPS_REDIRECT=false  # Enable in production only

# SEO - Enforce canonical URLs (remove www, trailing slashes)
CANONICAL_URL_ENFORCEMENT=false  # Enable in production only

# Monitoring - Enable production monitoring and API compliance tracking
MONITORING_ENABLED=true

# Compliance - Enable compliance reporting endpoint
COMPLIANCE_REPORT_ENABLED=true

# Error Handling - Show detailed error messages
ERROR_DETAILS_ENABLED=true  # Disable in production for security
```

### Security Configuration

```env
# CSRF Metrics - Enable CSRF performance metrics logging
CSRF_METRICS_ENABLED=false  # Enable for debugging CSRF issues
```

### Logging Configuration

```env
# Log level: error, warn, info, debug
LOG_LEVEL=debug  # Use 'info' in production, 'debug' in development

# Log format: pretty (human-readable) or json (machine-readable)
LOG_FORMAT=pretty  # Use 'json' in production, 'pretty' in development

# File logging - Write logs to files
LOG_FILE_ENABLED=true
```

### CORS Configuration

```env
# CORS - Enable Cross-Origin Resource Sharing
CORS_ENABLED=false  # Enable for split deployments (frontend ≠ backend domain)

# CORS preflight cache duration in seconds
CORS_MAX_AGE=86400  # 24 hours

# Comma-separated list of allowed origins
ALLOWED_ORIGINS=http://localhost:5000,http://localhost:5173
```

### Cookie Configuration

```env
# Cookie security - Require HTTPS for cookies
COOKIE_SECURE=false  # Set to true in production

# Cookie SameSite attribute: strict, lax, or none
COOKIE_SAMESITE=lax  # Use 'none' for cross-origin deployments (requires COOKIE_SECURE=true)
```

### Build Configuration

These control build-time behavior and development tools.

```env
# Hot Module Replacement - Enable HMR for faster development
HMR_ENABLED=true  # Disable in production builds

# Image Optimization - Optimize images during build
IMAGE_OPTIMIZATION_ENABLED=false  # Enable in production builds

# Cartographer - Replit's debugging tool
CARTOGRAPHER_ENABLED=false  # Auto-enabled on Replit in development
```

### Optional Services

```env
# Email service (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key

# Admin account
ADMIN_PASSWORD=your-secure-admin-password

# Admin IPs (comma-separated list for rate limit bypass)
ADMIN_IPS=127.0.0.1,192.168.1.100
```

### Database

```env
# Database connection string (auto-provided by Replit)
DATABASE_URL=postgresql://user:password@host:5432/database
```

---

## Environment-Specific Examples

### Development (Local Monolithic)

**File:** `.env.local`

```env
NODE_ENV=development

# Secrets (keep these persistent!)
JWT_SECRET=your-local-dev-jwt-secret-min-64-characters
CSRF_SECRET=your-local-dev-csrf-secret-min-32-characters

# Features - enable for testing
SEO_META_ENABLED=true
FORCE_HTTPS_REDIRECT=false
CANONICAL_URL_ENFORCEMENT=false
MONITORING_ENABLED=true
COMPLIANCE_REPORT_ENABLED=true
ERROR_DETAILS_ENABLED=true
CSRF_METRICS_ENABLED=false

# Logging - verbose for debugging
LOG_LEVEL=debug
LOG_FORMAT=pretty
LOG_FILE_ENABLED=true

# CORS - disabled for same-origin
CORS_ENABLED=false
CORS_MAX_AGE=86400
ALLOWED_ORIGINS=http://localhost:5000,http://localhost:5173

# Cookies - insecure for HTTP
COOKIE_SECURE=false
COOKIE_SAMESITE=lax

# Security - single proxy (Replit)
TRUST_PROXY=1

# Build - fast development builds
HMR_ENABLED=true
IMAGE_OPTIMIZATION_ENABLED=false
CARTOGRAPHER_ENABLED=false
```

### Staging/Production (Split Deployment)

**File:** `.env.production`

```env
NODE_ENV=production

# Secrets (set via environment variables, not in file!)
JWT_SECRET=${JWT_SECRET}
CSRF_SECRET=${CSRF_SECRET}

# Features - production settings
SEO_META_ENABLED=true
FORCE_HTTPS_REDIRECT=true
CANONICAL_URL_ENFORCEMENT=true
MONITORING_ENABLED=true
COMPLIANCE_REPORT_ENABLED=true
ERROR_DETAILS_ENABLED=false  # Hide error details

# Security
CSRF_METRICS_ENABLED=false
TRUST_PROXY=1  # Adjust based on your infrastructure

# Logging - production settings
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE_ENABLED=true

# CORS - enabled for split deployment
CORS_ENABLED=true
CORS_MAX_AGE=86400
ALLOWED_ORIGINS=https://yourdomain.com

# Cookies - secure for HTTPS
COOKIE_SECURE=true
COOKIE_SAMESITE=none  # Required for cross-origin

# Build - optimized production build
HMR_ENABLED=false
IMAGE_OPTIMIZATION_ENABLED=true
CARTOGRAPHER_ENABLED=false
```

### Testing

**File:** `.env.test`

```env
NODE_ENV=test

# Secrets (test values)
JWT_SECRET=test-jwt-secret-min-64-characters-for-testing-purposes-only
CSRF_SECRET=test-csrf-secret-min-32-characters

# Features - all enabled for comprehensive testing
SEO_META_ENABLED=true
FORCE_HTTPS_REDIRECT=false
CANONICAL_URL_ENFORCEMENT=false
MONITORING_ENABLED=true
COMPLIANCE_REPORT_ENABLED=true
ERROR_DETAILS_ENABLED=true
CSRF_METRICS_ENABLED=true

# Security
TRUST_PROXY=false

# Logging - minimal for test output
LOG_LEVEL=error
LOG_FORMAT=json
LOG_FILE_ENABLED=false

# CORS - disabled for tests
CORS_ENABLED=false

# Cookies
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
```

---

## TRUST_PROXY Configuration

### What is TRUST_PROXY?

`TRUST_PROXY` tells Express how many proxies (load balancers, CDNs, reverse proxies) sit between your application and the client. This setting is **critical for security** because it determines:

1. **IP Address Detection** - Which IP Express treats as the client's real IP
2. **HTTPS Detection** - Whether Express sees the connection as secure
3. **Rate Limiting** - Whether rate limits work correctly

### Why It Matters

When your app is behind a proxy, the connection to your app comes from the proxy's IP, not the client's IP. Proxies add headers like `X-Forwarded-For` to preserve the original client IP:

```
Client (1.2.3.4) → Proxy (10.0.0.1) → Your App

Request headers received by your app:
- Direct connection IP: 10.0.0.1 (proxy's IP)
- X-Forwarded-For: 1.2.3.4 (client's real IP)
```

### Configuration Values

| Value | Meaning | Use Case |
|-------|---------|----------|
| `false` or `0` | Trust no proxies | Direct client connections (rare) |
| `1` | Trust 1 proxy | AWS, Heroku, Replit, single load balancer |
| `2` | Trust 2 proxies | CDN + load balancer |
| `3+` | Trust N proxies | Multiple proxy layers |

### Deployment Examples

#### AWS Lightsail / Heroku / Replit (Single Proxy)

```env
TRUST_PROXY=1
```

**Architecture:**
```
Client → AWS/Heroku/Replit Load Balancer → Your App
         (1 proxy)
```

---

#### Cloudflare + AWS (Two Proxies)

```env
TRUST_PROXY=2
```

**Architecture:**
```
Client → Cloudflare CDN → AWS Load Balancer → Your App
         (proxy 1)         (proxy 2)
```

---

#### No Proxy (Direct Connection)

```env
TRUST_PROXY=false
```

**Architecture:**
```
Client → Your App (directly)
```

---

### ⚠️ Security Risks

#### Setting Too Low (Undercounting Proxies)

If `TRUST_PROXY=0` but you actually have 1 proxy:

- ❌ `req.ip` returns proxy's IP, not client's IP
- ❌ Rate limiting ineffective (all requests from same proxy IP)
- ❌ Can't detect HTTPS properly
- ❌ Logging shows proxy IP instead of client IP

**Impact:** Reduced security and broken features, but no catastrophic vulnerability.

---

#### Setting Too High (Overcounting Proxies) 🚨 CRITICAL

If `TRUST_PROXY=2` but you actually have 1 proxy:

- 🚨 **Attackers can spoof client IP by adding fake `X-Forwarded-For` headers**
- 🚨 **Rate limiting can be bypassed completely**
- 🚨 **IP-based security controls fail**
- 🚨 **Malicious users can impersonate any IP address**

**Impact:** Severe security vulnerability allowing IP spoofing attacks.

---

### How to Determine Correct Value

#### Method 1: Check Hosting Documentation

- **Replit:** 1 proxy (Replit's infrastructure)
- **Heroku:** 1 proxy (Heroku router)
- **AWS Lightsail:** 1 proxy (AWS load balancer)
- **Vercel:** 1 proxy (Vercel edge network)
- **Cloudflare + your server:** 2 proxies (Cloudflare + your load balancer)

#### Method 2: Test Endpoint

Add this test route to verify:

```typescript
app.get('/test-proxy', (req, res) => {
  res.json({
    ip: req.ip,              // What Express sees as client IP
    ips: req.ips,            // All IPs in forwarded chain
    protocol: req.protocol,  // http or https
    secure: req.secure,      // true if https
    headers: {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-forwarded-proto': req.headers['x-forwarded-proto'],
      'x-real-ip': req.headers['x-real-ip'],
    }
  });
});
```

**Test it:**
1. Deploy with `TRUST_PROXY=1`
2. Visit `/test-proxy`
3. Check if `req.ip` shows **your real IP** (not a proxy IP)
4. Check if `req.secure` is `true` for HTTPS connections

#### Method 3: Inspect Headers

```bash
# Make request and see headers
curl -v https://your-app.com/test-proxy
```

Look for:
- `X-Forwarded-For: client-ip, proxy1-ip, proxy2-ip`
- Count the commas to know how many proxies added IPs

---

### Code Usage

```typescript
import { securityConfig } from './server/config/index.js';

// Configure Express
app.set('trust proxy', securityConfig.TRUST_PROXY);

// Now you can safely use:
const clientIP = req.ip;           // Real client IP
const isSecure = req.secure;       // True if HTTPS
const protocol = req.protocol;     // 'http' or 'https'

// For rate limiting
const rateLimiter = rateLimit({
  keyGenerator: (req) => req.ip,   // Uses real client IP
});
```

---

### Common Mistakes

#### ❌ Mistake 1: Not Setting TRUST_PROXY

```env
# Missing or commented out
# TRUST_PROXY=1
```

**Result:** Express doesn't trust any proxies, sees proxy IPs instead of client IPs.

---

#### ❌ Mistake 2: Using Boolean 'true'

```env
TRUST_PROXY=true  # Dangerous! This means "trust all proxies"
```

**Result:** Severe security vulnerability - attackers can spoof any IP.

**Fix:**
```env
TRUST_PROXY=1  # Trust exactly 1 proxy
```

---

#### ❌ Mistake 3: Guessing the Value

```env
TRUST_PROXY=2  # "I think we have 2 proxies?"
```

**Result:** If wrong, either IP detection fails or security vulnerability.

**Fix:** Check hosting provider documentation or test with `/test-proxy` endpoint.

---

## Migration from NODE_ENV

### Before (Anti-Pattern)

```typescript
// ❌ BAD: Business logic depends on NODE_ENV
if (process.env.NODE_ENV === 'production') {
  enableMonitoring();
}

// ❌ BAD: Cannot test this in development
if (process.env.NODE_ENV === 'production') {
  injectSEOTags();
}

// ❌ BAD: Auto-generated secret
const secret = process.env.JWT_SECRET || generateSecret();
```

### After (Best Practice)

```typescript
// ✅ GOOD: Feature flag controls behavior
if (featuresConfig.MONITORING_ENABLED) {
  enableMonitoring();
}

// ✅ GOOD: Can test SEO in any environment
if (featuresConfig.SEO_META_ENABLED) {
  injectSEOTags();
}

// ✅ GOOD: Secret always required
const secret = securityConfig.JWT_SECRET; // Validated by Zod, never auto-generated
```

### Import Pattern

```typescript
// Import what you need
import { featuresConfig, loggingConfig, isDev } from './server/config/index.js';

// Use typed, validated config
if (featuresConfig.MONITORING_ENABLED) {
  // Monitoring code
}

// Environment helpers for framework concerns
if (isDev()) {
  // Development-only framework setup
}
```

### When to Use NODE_ENV vs Feature Flags

| Use Case | Use | Don't Use |
|----------|-----|-----------|
| Build optimization | `isDev()` ✅ | Feature flags ❌ |
| Framework dev tools | `isDev()` ✅ | Feature flags ❌ |
| SEO meta tags | Feature flags ✅ | `isProd()` ❌ |
| Monitoring | Feature flags ✅ | `isProd()` ❌ |
| Error details | Feature flags ✅ | `isProd()` ❌ |
| HTTPS redirect | Feature flags ✅ | `isProd()` ❌ |

---

## Testing Configuration

### Unit Tests

Configuration has comprehensive unit tests:

```bash
# Run config tests
npm run test -- server/config/__tests__/config.test.ts

# Run integration tests
npm run test -- server/config/__tests__/feature-flags.integration.test.ts
```

### Runtime Validation

```bash
# Test current configuration
tsx server/config/test-config.ts

# Comprehensive validation
tsx server/config/__tests__/validate-feature-flags.ts
```

### Test Different Configurations

```bash
# Test production config locally
NODE_ENV=production npm run dev

# Test with CORS enabled
CORS_ENABLED=true ALLOWED_ORIGINS=https://example.com npm run dev

# Test with different log levels
LOG_LEVEL=debug LOG_FORMAT=pretty npm run dev

# Test specific feature
SEO_META_ENABLED=true npm run dev
```

### Testing Checklist

Before deploying, verify:

- [ ] All required secrets are set (JWT_SECRET, CSRF_SECRET, DATABASE_URL)
- [ ] Secrets meet minimum length requirements
- [ ] TRUST_PROXY is correct for your infrastructure
- [ ] CORS settings match your deployment (enabled/disabled, origins)
- [ ] Cookie settings are secure for production (COOKIE_SECURE=true)
- [ ] Feature flags are appropriate (ERROR_DETAILS_ENABLED=false in prod)
- [ ] Logging is configured (LOG_FORMAT=json, LOG_LEVEL=info in prod)
- [ ] Test configuration loads: `tsx server/config/test-config.ts`

---

## Common Pitfalls and Solutions

### Pitfall 1: Committing Secrets to Git

**Problem:**
```bash
git add .env.local
git commit -m "Add configuration"  # 🚨 DON'T DO THIS!
```

**Solution:**
- `.env.local` is in `.gitignore` - should never be committed
- Use environment variables in production (not `.env` files)
- Keep secrets in `.env.local` for local development only

**Check:**
```bash
# Verify .env.local is gitignored
git check-ignore .env.local
# Should output: .env.local
```

---

### Pitfall 2: Auto-Generating Secrets

**Problem:**
```typescript
const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
```

**Why it's bad:**
- Secret changes on every restart
- All users logged out on restart
- CSRF tokens invalidated
- Sessions lost

**Solution:**
```bash
# Generate once
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Save to .env.local (persist across restarts)
JWT_SECRET=your-generated-secret-here
```

---

### Pitfall 3: Testing Production Features

**Problem:**
"I want to test SEO tags but `NODE_ENV=production` breaks my dev setup"

**Solution:**
Use feature flags! Enable production features in development:

```env
# .env.local
NODE_ENV=development  # Keep dev mode
SEO_META_ENABLED=true  # But enable production feature
```

---

### Pitfall 4: CORS Configuration

**Problem:**
"CORS works locally but fails in production"

**Common issues:**
1. **Missing protocol:**
   ```env
   # ❌ WRONG
   ALLOWED_ORIGINS=localhost:3000
   
   # ✅ CORRECT
   ALLOWED_ORIGINS=http://localhost:3000
   ```

2. **Wrong port:**
   ```env
   # ❌ WRONG - missing port
   ALLOWED_ORIGINS=http://localhost
   
   # ✅ CORRECT
   ALLOWED_ORIGINS=http://localhost:3000
   ```

3. **Missing www:**
   ```env
   # ❌ INCOMPLETE
   ALLOWED_ORIGINS=https://yourdomain.com
   
   # ✅ COMPLETE - include both
   ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   ```

---

### Pitfall 5: SameSite=none Without Secure

**Problem:**
```env
COOKIE_SAMESITE=none
COOKIE_SECURE=false  # ❌ Browsers reject this combination
```

**Solution:**
```env
# For cross-origin (split deployment)
COOKIE_SAMESITE=none
COOKIE_SECURE=true  # Required with SameSite=none

# For same-origin (monolithic)
COOKIE_SAMESITE=lax
COOKIE_SECURE=false  # OK for development
```

---

### Pitfall 6: Not Restarting After Changes

**Problem:**
Changed `.env.local` but nothing happens.

**Why:**
Environment files are loaded once at startup.

**Solution:**
```bash
# Always restart after .env changes
# Stop server (Ctrl+C)
npm run dev
```

---

### Pitfall 7: Wrong TRUST_PROXY Value

**Problem:**
Set `TRUST_PROXY=2` but infrastructure only has 1 proxy.

**Result:**
Attackers can spoof IPs, bypass rate limiting.

**Solution:**
1. Check hosting provider documentation
2. Test with `/test-proxy` endpoint
3. Verify `req.ip` shows your real IP
4. When in doubt, start with `TRUST_PROXY=1` for cloud hosting

---

## Troubleshooting

### Configuration Validation Failed

**Error:**
```
❌ Configuration Validation Failed

The following environment variables are missing or invalid:

[SECURITY]
  • JWT_SECRET: JWT_SECRET must be at least 64 characters
```

**Solution:**
1. Check that `.env.local` exists
2. Ensure secrets meet minimum length requirements
3. Use the secret generation commands from Quick Start

---

### CORS Configuration Warning

**Error:**
```
⚠️ Warning: CORS_ENABLED=true but ALLOWED_ORIGINS is not set.
```

**Solution:**
Set `ALLOWED_ORIGINS` when `CORS_ENABLED=true`:
```env
CORS_ENABLED=true
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

### SameSite=none Requires Secure

**Error:**
```
⚠️ Warning: CSRF_COOKIE_SAMESITE=none requires HTTPS.
```

**Solution:**
When using `COOKIE_SAMESITE=none`, you must also set `COOKIE_SECURE=true`:
```env
COOKIE_SAMESITE=none
COOKIE_SECURE=true
```

---

### Environment Files Not Loading

**Problem:** Changes to `.env.local` don't take effect

**Solution:**
1. Restart the server (environment files load on startup)
2. Check file name is exactly `.env.local` (no typos)
3. Ensure file is in project root directory
4. Check file is not corrupted (try `cat .env.local`)

---

### Testing Production Features in Development

**Problem:** Need to test production-only features locally

**Solution:**
Use feature flags! Enable any production feature in development:
```env
# .env.local
SEO_META_ENABLED=true
MONITORING_ENABLED=true
FORCE_HTTPS_REDIRECT=false  # Keep this off unless testing HTTPS
```

---

### Database Connection Errors

**Problem:** `DATABASE_URL` is required but not set

**Solution:**

**On Replit:** Database URL is auto-provided
```bash
# Verify it's set
echo $DATABASE_URL
```

**Locally:** Set in `.env.local`
```env
DATABASE_URL=postgresql://user:password@localhost:5432/edupath
```

---

### Feature Flags Not Working

**Problem:** Set feature flag but behavior doesn't change

**Checklist:**
1. ✅ Restart server after changing `.env.local`
2. ✅ Use exact values: `true`, `false`, `1`, `0` (lowercase)
3. ✅ No quotes around values
4. ✅ No spaces around `=` sign
5. ✅ Verify with: `tsx server/config/test-config.ts`

---

## Additional Resources

- **Technical Documentation:** `server/config/README.md`
- **Usage Examples:** `server/config/usage-example.ts`
- **Environment Template:** `.env.example`
- **Feature Flags Test Report:** `FEATURE_FLAGS_TEST_REPORT.md`
- **Environment Dependency Analysis:** `ENVIRONMENT_DEPENDENCY_ANALYSIS_REPORT.md`

---

## Support

For questions or issues with configuration:
1. Check this guide first
2. Review `.env.example` for all available options
3. Run `tsx server/config/test-config.ts` to validate your configuration
4. Check `server/config/README.md` for technical details

**Last Updated:** October 28, 2025 - Centralized Configuration System v2.0
