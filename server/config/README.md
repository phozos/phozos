# Configuration Module - Architecture & Developer Guide

**Version:** 2.0  
**Last Updated:** October 28, 2025

A comprehensive, production-ready configuration module for the EduPath platform with type-safe environment variable management, layered configuration loading, and fail-fast validation.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Features](#features)
3. [Quick Start](#quick-start)
4. [Layered Configuration Loading](#layered-configuration-loading)
5. [Required Secrets Checklist](#required-secrets-checklist)
6. [Configuration Sections](#configuration-sections)
7. [Feature Flag Matrix](#feature-flag-matrix)
8. [TRUST_PROXY Configuration Guide](#trust_proxy-configuration-guide)
9. [Helper Functions](#helper-functions)
10. [Type Safety](#type-safety)
11. [Troubleshooting](#troubleshooting)
12. [Migration Guide](#migration-guide)
13. [Testing](#testing)

---

## Architecture Overview

### Design Principles

The configuration module is built on four key principles:

1. **Centralization** - Single source of truth for all application configuration
2. **Type Safety** - Zod schema validation with TypeScript type inference
3. **Fail Fast** - Invalid configuration stops the application immediately
4. **Testability** - Production features can be tested in any environment

### Module Structure

```
server/config/
├── index.ts                    # Main configuration module (this is what you import)
├── README.md                   # This documentation
├── usage-example.ts            # Usage examples and patterns
├── test-config.ts             # Runtime configuration test script
└── __tests__/
    ├── config.test.ts         # Unit tests for configuration
    ├── feature-flags.integration.test.ts  # Integration tests
    └── validate-feature-flags.ts  # Comprehensive validation script
```

### How It Works

```typescript
// 1. Load environment files with dotenv-flow (automatic layering)
dotenvFlow.config({ ... });

// 2. Define Zod schemas for each configuration section
const appConfigSchema = z.object({ ... });
const securityConfigSchema = z.object({ ... });

// 3. Parse and validate all environment variables
const validatedConfig = configSchema.parse(rawConfig);

// 4. Export typed, validated configuration
export const appConfig: AppConfig = validatedConfig.app;
```

### Benefits Over Direct `process.env` Access

| Approach | Type Safety | Validation | Defaults | Testability |
|----------|-------------|------------|----------|-------------|
| `process.env.VAR` | ❌ No | ❌ No | ❌ No | ❌ Hard |
| **Config Module** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Easy |

---

## Features

✅ **Layered Environment Loading** - Automatic `.env`, `.env.local`, `.env.{NODE_ENV}` merging  
✅ **Zod Schema Validation** - Comprehensive validation with detailed error reporting  
✅ **Type Safety** - Fully typed with TypeScript using Zod type inference  
✅ **Environment Detection** - Helper functions for `isDev()`, `isProd()`, `isTest()`  
✅ **Smart Parsing** - Automatic parsing of booleans, numbers, and comma-separated lists  
✅ **Fail Fast** - Process exits immediately if required variables are missing or invalid  
✅ **Feature Flags** - Test production features in any environment  
✅ **Security First** - Never auto-generates secrets, enforces minimum lengths  

---

## Quick Start

### 1. Import Configuration

```typescript
// Import the entire config object
import config from './server/config/index.js';

// Or import specific sections
import { 
  appConfig, 
  databaseConfig, 
  securityConfig,
  featuresConfig,
  isDev,
  isProd 
} from './server/config/index.js';
```

### 2. Use in Your Code

```typescript
// Environment detection
if (isDev()) {
  console.log('Running in development mode');
}

// Access configuration values
const port = appConfig.PORT;
const dbUrl = databaseConfig.DATABASE_URL;

// Feature flags
if (featuresConfig.SEO_META_ENABLED) {
  injectSEOTags();
}

// Security configuration
app.set('trust proxy', securityConfig.TRUST_PROXY);
```

---

## Layered Configuration Loading

The module uses **dotenv-flow** for automatic layered environment file loading. Files are loaded in this order (later files override earlier ones):

### Loading Order

```
1. .env                         (Base defaults - committed to git)
2. .env.local                   (Local overrides - gitignored)
3. .env.{NODE_ENV}              (Environment-specific - e.g., .env.development)
4. .env.{NODE_ENV}.local        (Environment + local overrides - gitignored)
```

### File Purpose Matrix

| File | Committed? | Purpose | Example Use Case |
|------|------------|---------|------------------|
| `.env` | ✅ Yes | Base defaults safe to share | Default feature flags, PORT=5000 |
| `.env.local` | ❌ No | Your personal secrets & overrides | Your JWT_SECRET, test flags |
| `.env.development` | ❌ No | Development team defaults | LOG_LEVEL=debug, HMR_ENABLED=true |
| `.env.production` | ✅ Yes | Production template | FORCE_HTTPS_REDIRECT=true |
| `.env.test` | ✅ Yes | Test environment | LOG_LEVEL=error, fixtures |
| `.env.example` | ✅ Yes | Documentation template | All variables with examples |

### Example: Override Precedence

```bash
# .env (base)
LOG_LEVEL=info
SEO_META_ENABLED=false

# .env.development (environment-specific)
LOG_LEVEL=debug
SEO_META_ENABLED=true

# .env.local (your overrides)
LOG_LEVEL=error

# Final result when NODE_ENV=development:
# LOG_LEVEL=error (from .env.local - highest precedence)
# SEO_META_ENABLED=true (from .env.development)
```

### Why Layered Configuration?

- **Security** - Keep secrets in `.env.local` (never committed)
- **Collaboration** - Share safe defaults in `.env`
- **Flexibility** - Test production features locally
- **Simplicity** - No manual file merging needed

---

## Required Secrets Checklist

### Critical Security Secrets

These **must** be set before the application will start. The module validates minimum lengths and fails fast if they're missing or too short.

#### ✅ JWT_SECRET (Minimum 64 characters)

**Purpose:** Signs JWT authentication tokens  
**Security Risk if Missing:** Attackers can forge authentication tokens

**Generate:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Set in `.env.local`:**
```env
JWT_SECRET=your-generated-128-character-hex-string-here
```

#### ✅ CSRF_SECRET (Minimum 32 characters)

**Purpose:** Signs CSRF protection tokens  
**Security Risk if Missing:** CSRF attacks can succeed

**Generate:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Set in `.env.local`:**
```env
CSRF_SECRET=your-generated-64-character-hex-string-here
```

#### ✅ DATABASE_URL (Required)

**Purpose:** PostgreSQL connection string  
**Provided by:** Replit automatically (via environment)

**Format:**
```env
DATABASE_URL=postgresql://user:password@host:5432/database
```

### Setup Checklist

- [ ] Copy `.env.example` to `.env.local`
- [ ] Generate `JWT_SECRET` (64 bytes = 128 hex chars)
- [ ] Generate `CSRF_SECRET` (32 bytes = 64 hex chars)
- [ ] Verify `DATABASE_URL` is set (auto-provided on Replit)
- [ ] Test configuration: `tsx server/config/test-config.ts`
- [ ] Start server: `npm run dev`

### ⚠️ Security Warnings

1. **Never commit** `.env.local` to git (it's in `.gitignore`)
2. **Never auto-generate** secrets at runtime (leads to session invalidation)
3. **Never use** short or weak secrets in production
4. **Rotate secrets** regularly in production
5. **Use environment variables** in production (not `.env` files)

---

## Configuration Sections

### App Configuration

```typescript
appConfig.NODE_ENV          // 'development' | 'production' | 'test'
appConfig.PORT              // number (default: 5000)
appConfig.isDevelopment     // boolean (computed)
appConfig.isProduction      // boolean (computed)
appConfig.isTest            // boolean (computed)
```

**Environment Variables:**
```env
NODE_ENV=development  # Auto-detected, usually don't need to set
PORT=5000
```

---

### Database Configuration

```typescript
databaseConfig.DATABASE_URL // string (required)
```

**Environment Variables:**
```env
DATABASE_URL=postgresql://user:password@host:5432/database
```

---

### Security Configuration

```typescript
securityConfig.JWT_SECRET           // string (required, min 64 chars)
securityConfig.CSRF_SECRET          // string (required, min 32 chars)
securityConfig.CSRF_METRICS_ENABLED // boolean
securityConfig.TRUST_PROXY          // false | number
```

**Environment Variables:**
```env
JWT_SECRET=your-jwt-secret-min-64-characters
CSRF_SECRET=your-csrf-secret-min-32-characters
CSRF_METRICS_ENABLED=false
TRUST_PROXY=1  # See TRUST_PROXY guide below
```

---

### Email Configuration

```typescript
emailConfig.SENDGRID_API_KEY // string | undefined
```

**Environment Variables:**
```env
SENDGRID_API_KEY=SG.your-sendgrid-api-key
```

---

### Admin Configuration

```typescript
adminConfig.ADMIN_PASSWORD  // string | undefined
adminConfig.ADMIN_IPS       // string[] (comma-separated)
```

**Environment Variables:**
```env
ADMIN_PASSWORD=your-secure-admin-password
ADMIN_IPS=127.0.0.1,192.168.1.100
```

---

### Features Configuration

See [Feature Flag Matrix](#feature-flag-matrix) below for detailed information.

```typescript
featuresConfig.SEO_META_ENABLED              // boolean
featuresConfig.FORCE_HTTPS_REDIRECT          // boolean
featuresConfig.CANONICAL_URL_ENFORCEMENT     // boolean
featuresConfig.MONITORING_ENABLED            // boolean
featuresConfig.COMPLIANCE_REPORT_ENABLED     // boolean
featuresConfig.ERROR_DETAILS_ENABLED         // boolean
```

---

### Logging Configuration

```typescript
loggingConfig.LOG_LEVEL         // 'error' | 'warn' | 'info' | 'debug'
loggingConfig.LOG_FORMAT        // 'pretty' | 'json'
loggingConfig.LOG_FILE_ENABLED  // boolean
```

**Environment Variables:**
```env
LOG_LEVEL=debug        # error, warn, info, debug
LOG_FORMAT=pretty      # pretty (dev), json (prod)
LOG_FILE_ENABLED=true
```

---

### CORS Configuration

```typescript
corsConfig.CORS_ENABLED        // boolean
corsConfig.CORS_MAX_AGE        // number (seconds)
corsConfig.ALLOWED_ORIGINS     // string[] (comma-separated)
```

**Environment Variables:**
```env
CORS_ENABLED=false  # Enable for split frontend/backend deployments
CORS_MAX_AGE=86400  # 24 hours in seconds
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

### Cookies Configuration

```typescript
cookiesConfig.COOKIE_SECURE     // boolean
cookiesConfig.COOKIE_SAMESITE   // 'strict' | 'lax' | 'none'
```

**Environment Variables:**
```env
COOKIE_SECURE=false      # Set to true in production (HTTPS)
COOKIE_SAMESITE=lax      # strict, lax, or none
```

⚠️ **Important:** `COOKIE_SAMESITE=none` requires `COOKIE_SECURE=true`

---

### Build Configuration

```typescript
buildConfig.HMR_ENABLED                   // boolean
buildConfig.IMAGE_OPTIMIZATION_ENABLED    // boolean
buildConfig.CARTOGRAPHER_ENABLED          // boolean
```

**Environment Variables:**
```env
# Smart defaults - usually don't need to set these
HMR_ENABLED=true                      # Auto: true locally, false on Replit
IMAGE_OPTIMIZATION_ENABLED=false      # Enable in production builds
CARTOGRAPHER_ENABLED=false            # Auto-enabled on Replit
```

---

## Feature Flag Matrix

Feature flags allow you to **test production features in any environment**. This is the key difference from the old `NODE_ENV`-based approach.

| Flag | Controls | Development Default | Production Default | Test in Dev? |
|------|----------|--------------------|--------------------|--------------|
| `SEO_META_ENABLED` | Inject SEO meta tags into HTML | `true` | `true` | ✅ Yes |
| `FORCE_HTTPS_REDIRECT` | Redirect HTTP → HTTPS | `false` | `true` | ⚠️ Careful |
| `CANONICAL_URL_ENFORCEMENT` | Enforce canonical URLs (remove www, etc.) | `false` | `true` | ✅ Yes |
| `MONITORING_ENABLED` | Performance monitoring & metrics | `true` | `true` | ✅ Yes |
| `COMPLIANCE_REPORT_ENABLED` | Compliance reporting endpoint | `true` | `true` | ✅ Yes |
| `ERROR_DETAILS_ENABLED` | Show detailed error messages | `true` | `false` | ✅ Yes |

### Feature Flag Details

#### SEO_META_ENABLED

**What it does:**
- Injects SEO meta tags into HTML responses
- Adds Open Graph tags for social media
- Adds structured data for search engines

**When to enable:**
- ✅ Always in production
- ✅ In development to test SEO implementation
- ✅ In staging environments

**Code usage:**
```typescript
import { featuresConfig } from './server/config/index.js';

if (featuresConfig.SEO_META_ENABLED) {
  app.use(seoMetaMiddleware);
}
```

---

#### FORCE_HTTPS_REDIRECT

**What it does:**
- Redirects all HTTP requests to HTTPS
- Sets secure headers

**When to enable:**
- ✅ Always in production (with valid SSL certificate)
- ❌ Never in local development (no SSL)
- ⚠️ Only in staging if you have SSL configured

**Code usage:**
```typescript
if (featuresConfig.FORCE_HTTPS_REDIRECT && req.protocol === 'http') {
  res.redirect(`https://${req.hostname}${req.url}`);
}
```

---

#### CANONICAL_URL_ENFORCEMENT

**What it does:**
- Redirects `www.example.com` → `example.com`
- Removes trailing slashes
- Enforces consistent URL structure

**When to enable:**
- ✅ Always in production
- ✅ In development to test URL normalization
- ✅ In staging environments

---

#### MONITORING_ENABLED

**What it does:**
- Enables performance monitoring
- Tracks API response times
- Logs slow queries

**When to enable:**
- ✅ Always in production
- ✅ In development to test monitoring setup
- ❌ In tests (to avoid noise)

---

#### COMPLIANCE_REPORT_ENABLED

**What it does:**
- Enables `/api/system/compliance` endpoint
- Reports on security headers, HTTPS status, etc.

**When to enable:**
- ✅ Always in production
- ✅ In development for testing
- ✅ In staging for pre-deployment checks

---

#### ERROR_DETAILS_ENABLED

**What it does:**
- Shows full error stack traces
- Includes detailed validation errors
- Exposes internal error messages

**When to enable:**
- ✅ Always in development (for debugging)
- ❌ Never in production (security risk)
- ✅ In testing (for debugging tests)

**Security Warning:** Detailed errors can leak sensitive information (file paths, database structure, internal logic). Always disable in production.

---

## TRUST_PROXY Configuration Guide

### What is TRUST_PROXY?

`TRUST_PROXY` tells Express how many proxies are between your application and the client. This is **critical** for:

1. **Security** - Detecting real client IPs (for rate limiting, logging)
2. **HTTPS Detection** - Knowing when requests come via HTTPS
3. **Rate Limiting** - Preventing IP spoofing attacks

### How Proxies Work

```
Client → Proxy 1 → Proxy 2 → Your App
         (CDN)     (Load Balancer)
```

Each proxy adds headers like `X-Forwarded-For`:
```
X-Forwarded-For: [client IP], [proxy 1 IP], [proxy 2 IP]
```

### Configuration Values

| Value | Meaning | When to Use |
|-------|---------|-------------|
| `false` or `0` | Don't trust any proxy | Direct connection to clients (rare) |
| `1` | Trust first proxy | Behind single proxy (AWS, Heroku, most cloud) |
| `2` | Trust two proxies | Behind CDN + load balancer |
| `3+` | Trust N proxies | Behind multiple proxy layers |

### Deployment Examples

#### AWS Lightsail / Heroku / Replit

```env
TRUST_PROXY=1
```

**Why:** Your app is directly behind AWS/Heroku/Replit's load balancer (1 proxy).

---

#### Cloudflare CDN + AWS Lightsail

```env
TRUST_PROXY=2
```

**Why:** Cloudflare (proxy 1) → AWS Lightsail (proxy 2) → Your app.

---

#### No Proxy (Direct Connection)

```env
TRUST_PROXY=false
```

**Why:** Your app receives direct connections (rare in production).

---

### ⚠️ Security Warning: Setting TRUST_PROXY Wrong

**Setting too low (e.g., 0 when you have proxies):**
- ❌ IP detection fails (you see proxy IP, not client IP)
- ❌ Rate limiting ineffective (all requests appear from same IP)
- ❌ HTTPS detection fails

**Setting too high (e.g., 2 when you have 1 proxy):**
- 🚨 **SEVERE SECURITY RISK**
- 🚨 Attackers can spoof their IP by adding fake `X-Forwarded-For` headers
- 🚨 Rate limiting can be bypassed
- 🚨 Malicious users can impersonate any IP

### How to Determine Your TRUST_PROXY Value

1. **Check your hosting provider's documentation**
   - AWS Lightsail: 1 proxy
   - Heroku: 1 proxy
   - Replit: 1 proxy
   - Cloudflare: 1 proxy (if direct), 2 if behind another load balancer

2. **Test in development:**
   ```typescript
   app.get('/test-proxy', (req, res) => {
     res.json({
       ip: req.ip,
       ips: req.ips,
       protocol: req.protocol,
       secure: req.secure,
       headers: {
         'x-forwarded-for': req.headers['x-forwarded-for'],
         'x-forwarded-proto': req.headers['x-forwarded-proto'],
       }
     });
   });
   ```

3. **Verify in production:**
   - Make a request to your app
   - Check that `req.ip` shows your real IP (not proxy IP)
   - Check that `req.protocol` correctly shows `https` or `http`

### Code Usage

```typescript
import { securityConfig } from './server/config/index.js';

// Configure Express
app.set('trust proxy', securityConfig.TRUST_PROXY);

// Now you can safely use:
const clientIP = req.ip;  // Real client IP
const isSecure = req.secure;  // True if HTTPS
const protocol = req.protocol;  // 'http' or 'https'
```

---

## Helper Functions

### Environment Detection

```typescript
import { isDev, isProd, isTest } from './server/config/index.js';

if (isDev()) {
  console.log('Development mode - enabling debug features');
}

if (isProd()) {
  console.log('Production mode - optimizing for performance');
}

if (isTest()) {
  console.log('Test mode - using test database');
}
```

**When to use:**
- Use for **framework-level concerns** (build optimizations, dev tools)
- **Don't use** for business logic (use feature flags instead)

### Example: When to Use Each

```typescript
// ✅ GOOD: Use environment helpers for framework setup
if (isDev()) {
  app.use(errorHandler({ showStack: true }));
}

// ✅ GOOD: Use feature flags for business logic
if (featuresConfig.MONITORING_ENABLED) {
  app.use(performanceMonitoringMiddleware);
}

// ❌ BAD: Using environment for business logic
if (isProd()) {
  app.use(performanceMonitoringMiddleware); // Can't test in dev!
}
```

---

## Type Safety

All configuration values are fully typed using Zod's type inference:

```typescript
import type { 
  Config,          // Complete configuration object
  AppConfig,       // Application configuration
  DatabaseConfig,  // Database configuration
  SecurityConfig,  // Security configuration
  FeaturesConfig,  // Feature flags
  LoggingConfig,   // Logging configuration
  CorsConfig,      // CORS configuration
  CookiesConfig,   // Cookie configuration
  BuildConfig,     // Build configuration
} from './server/config/index.js';

// Example: Type-safe function
function setupLogger(config: LoggingConfig) {
  const level = config.LOG_LEVEL; // Type: 'error' | 'warn' | 'info' | 'debug'
  const format = config.LOG_FORMAT; // Type: 'pretty' | 'json'
  
  // TypeScript enforces correct usage
}
```

### Benefits

- ✅ **Autocomplete** - IDE suggests available configuration keys
- ✅ **Type checking** - Compiler catches typos and wrong types
- ✅ **Refactoring** - Rename configuration keys safely
- ✅ **Documentation** - Types serve as inline documentation

---

## Troubleshooting

### Problem: Configuration Validation Failed

**Error:**
```
❌ Configuration Validation Failed

The following environment variables are missing or invalid:

[SECURITY]
  • JWT_SECRET: String must contain at least 64 character(s)
  • CSRF_SECRET: Required

[DATABASE]
  • DATABASE_URL: Required
```

**Solution:**

1. Check that `.env.local` exists:
   ```bash
   ls -la .env.local
   ```

2. Verify secrets meet minimum lengths:
   ```bash
   # JWT_SECRET should be 128 characters (64 bytes hex)
   # CSRF_SECRET should be 64 characters (32 bytes hex)
   cat .env.local | grep SECRET
   ```

3. Generate new secrets if needed:
   ```bash
   echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"
   echo "CSRF_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
   ```

4. Restart the server after updating `.env.local`

---

### Problem: Changes to .env Files Don't Take Effect

**Symptoms:**
- Modified `.env.local` but behavior doesn't change
- Feature flags not working as expected

**Solution:**

1. **Restart the server** - Environment files are loaded at startup only
   ```bash
   # Stop server (Ctrl+C) and restart
   npm run dev
   ```

2. **Check file name** - Must be exactly `.env.local` (no typos)
   ```bash
   ls -la | grep .env
   ```

3. **Check file location** - Must be in project root (not in subdirectory)
   ```bash
   pwd  # Should be project root
   ls .env.local  # Should exist
   ```

4. **Check file syntax** - No spaces around `=` sign
   ```bash
   # ✅ CORRECT
   JWT_SECRET=abc123
   
   # ❌ WRONG
   JWT_SECRET = abc123
   ```

---

### Problem: Feature Flag Not Working

**Symptoms:**
- Set `SEO_META_ENABLED=true` but SEO tags not appearing
- Set `MONITORING_ENABLED=false` but monitoring still running

**Solution:**

1. **Check boolean syntax** - Must be exactly `true` or `false`
   ```bash
   # ✅ CORRECT
   SEO_META_ENABLED=true
   SEO_META_ENABLED=false
   SEO_META_ENABLED=1
   SEO_META_ENABLED=0
   
   # ❌ WRONG
   SEO_META_ENABLED=True
   SEO_META_ENABLED=TRUE
   SEO_META_ENABLED=yes
   SEO_META_ENABLED="true"
   ```

2. **Test configuration loading:**
   ```bash
   tsx server/config/test-config.ts
   ```

3. **Check if feature is actually implemented:**
   ```bash
   # Search for feature flag usage in code
   grep -r "SEO_META_ENABLED" server/
   ```

---

### Problem: CORS Errors in Browser Console

**Error:**
```
Access to fetch at 'http://localhost:5000/api/...' from origin 'http://localhost:3000' 
has been blocked by CORS policy
```

**Solution:**

1. **Enable CORS** in `.env.local`:
   ```env
   CORS_ENABLED=true
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

2. **Restart server** to apply changes

3. **Verify CORS configuration:**
   ```bash
   tsx server/config/test-config.ts | grep CORS
   ```

4. **Check origin matches exactly** (protocol, domain, port must all match):
   ```env
   # ✅ CORRECT
   ALLOWED_ORIGINS=http://localhost:3000
   
   # ❌ WRONG (missing port)
   ALLOWED_ORIGINS=http://localhost
   
   # ❌ WRONG (wrong protocol)
   ALLOWED_ORIGINS=https://localhost:3000
   ```

---

### Problem: Cookies Not Working

**Symptoms:**
- Authentication fails
- Session lost on refresh
- CSRF token errors

**Solution:**

1. **Check cookie settings for your deployment:**

   **Monolithic (same domain):**
   ```env
   COOKIE_SECURE=false        # false for HTTP development
   COOKIE_SAMESITE=lax
   ```

   **Split deployment (different domains):**
   ```env
   COOKIE_SECURE=true         # Required for cross-origin
   COOKIE_SAMESITE=none       # Required for cross-origin
   ```

2. **Verify browser console** - Look for cookie warnings

3. **Test with different browsers** - Some browsers have stricter cookie policies

---

### Problem: Database Connection Error

**Error:**
```
[DATABASE]
  • DATABASE_URL: Required
```

**Solution:**

1. **On Replit** - `DATABASE_URL` is auto-provided:
   ```bash
   # Verify it's set
   echo $DATABASE_URL
   ```

2. **Locally** - Set in `.env.local`:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/edupath
   ```

3. **Test database connection:**
   ```bash
   npm run db:push
   ```

---

### Problem: Secrets Keep Changing / Sessions Invalidate

**Symptom:**
- Users logged out after server restart
- CSRF tokens invalid after restart

**Cause:**
❌ **Never do this:**
```typescript
const secret = process.env.JWT_SECRET || generateRandomSecret();
```

**Solution:**
✅ **Always set persistent secrets:**
```bash
# Generate once and save to .env.local
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Add to .env.local (NEVER auto-generate)
JWT_SECRET=your-generated-secret-here
```

---

### Problem: TypeScript Errors with Config Import

**Error:**
```typescript
Cannot find module './server/config/index.js'
```

**Solution:**

1. **Use correct import extension** - Always use `.js` for ES modules:
   ```typescript
   // ✅ CORRECT
   import { appConfig } from './server/config/index.js';
   
   // ❌ WRONG
   import { appConfig } from './server/config/index';
   import { appConfig } from './server/config';
   ```

2. **Check tsconfig.json** has `"module": "ESNext"` and `"moduleResolution": "bundler"`

---

### Testing Configuration

Run these commands to verify your configuration:

```bash
# Test configuration loading
tsx server/config/test-config.ts

# Run configuration unit tests
npm run test -- server/config/__tests__/config.test.ts

# Run integration tests
npm run test -- server/config/__tests__/feature-flags.integration.test.ts

# Comprehensive validation
tsx server/config/__tests__/validate-feature-flags.ts
```

---

## Migration Guide

### From Direct `process.env` Access

**Before:**
```typescript
const port = parseInt(process.env.PORT || '5000', 10);
const isDev = process.env.NODE_ENV === 'development';
const dbUrl = process.env.DATABASE_URL || 'postgresql://localhost';
```

**After:**
```typescript
import { appConfig, databaseConfig, isDev } from './server/config/index.js';

const port = appConfig.PORT;  // Always number, never undefined
const isDevelopment = isDev();  // Type-safe boolean
const dbUrl = databaseConfig.DATABASE_URL;  // Validated, never undefined
```

---

### From NODE_ENV Checks to Feature Flags

**Before:**
```typescript
// ❌ BAD: Business logic depends on NODE_ENV
if (process.env.NODE_ENV === 'production') {
  app.use(seoMiddleware);
  app.use(monitoringMiddleware);
  showDetailedErrors = false;
}
```

**After:**
```typescript
// ✅ GOOD: Feature flags control behavior
import { featuresConfig } from './server/config/index.js';

if (featuresConfig.SEO_META_ENABLED) {
  app.use(seoMiddleware);
}

if (featuresConfig.MONITORING_ENABLED) {
  app.use(monitoringMiddleware);
}

const showDetailedErrors = featuresConfig.ERROR_DETAILS_ENABLED;
```

**Benefits:**
- ✅ Test production features in development
- ✅ Gradual rollout of features
- ✅ A/B testing capabilities
- ✅ Easier debugging

---

## Testing

### Test Scripts

```bash
# Test current configuration
tsx server/config/test-config.ts

# Run unit tests
npm run test -- server/config/__tests__/config.test.ts

# Run integration tests
npm run test -- server/config/__tests__/feature-flags.integration.test.ts

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

# Test specific feature flag
SEO_META_ENABLED=true npm run dev
```

### Test Configuration in Code

```typescript
import { describe, it, expect } from 'vitest';
import { appConfig, featuresConfig } from './server/config/index.js';

describe('Configuration', () => {
  it('should load app configuration', () => {
    expect(appConfig.PORT).toBeTypeOf('number');
    expect(appConfig.NODE_ENV).toMatch(/development|production|test/);
  });

  it('should have feature flags', () => {
    expect(featuresConfig.SEO_META_ENABLED).toBeTypeOf('boolean');
    expect(featuresConfig.MONITORING_ENABLED).toBeTypeOf('boolean');
  });
});
```

---

## Best Practices

### ✅ DO

1. **Always set required secrets** before starting the application
2. **Use feature flags** for business logic, not `NODE_ENV`
3. **Test production features** in development using feature flags
4. **Use `.env.local`** for personal overrides and secrets
5. **Generate secrets** using cryptographically secure methods
6. **Commit `.env.example`** with documentation
7. **Set `TRUST_PROXY`** correctly for your deployment

### ❌ DON'T

1. **Don't commit** `.env.local` or `.env.*.local` files
2. **Don't auto-generate** secrets at runtime
3. **Don't use** `process.env` directly (use config module)
4. **Don't use** NODE_ENV for business logic
5. **Don't guess** `TRUST_PROXY` value (check hosting docs)
6. **Don't set** `COOKIE_SAMESITE=none` without `COOKIE_SECURE=true`

---

## Additional Resources

- **Usage Examples:** `server/config/usage-example.ts`
- **Configuration Guide:** `docs/CONFIGURATION_GUIDE.md` (comprehensive developer guide)
- **Environment Template:** `.env.example`
- **Environment Analysis:** `ENVIRONMENT_DEPENDENCY_ANALYSIS_REPORT.md`
- **Feature Flags Report:** `FEATURE_FLAGS_TEST_REPORT.md`

---

**Last Updated:** October 28, 2025  
**Module Version:** 2.0  
**Documentation Version:** 2.0
