# Comprehensive Environment Dependency Analysis Report
## Phozos Study Abroad Platform

**Analysis Date:** October 28, 2025  
**Codebase:** Express + React + Vite  
**Total Environment-Dependent Locations Found:** 87+

---

## Executive Summary

This codebase exhibits **extensive environment-dependent behavior** that violates industry best practices. The primary anti-pattern is using `NODE_ENV` as a feature flag for business logic instead of limiting it to framework-level concerns. This makes it impossible to test production features in development and creates significant deployment risks.

### Critical Findings:
- **13 Production-Only Features** that cannot be tested locally
- **8 Features with Different Behavior** between environments
- **4 Auto-Generated Secrets** that invalidate on restart
- **62+ Direct NODE_ENV Checks** scattered across the codebase
- **No Centralized Configuration Module**
- **No Layered Environment Files** (.env.development, .env.production)
- **Hardcoded NODE_ENV in package.json** scripts

---

## 1. Complete Inventory of Environment-Dependent Behavior

### Category A: Production-Only Features (13 Locations)

These features **ONLY work in production** and cannot be tested in development:

#### A1. SEO Meta Injection
**File:** `server/middleware/seo-meta.ts:85`  
**Code:**
```typescript
if (meta && process.env.NODE_ENV === 'production') {
  // Inject meta tags into HTML
}
```
**Problem:** SEO meta tags are completely disabled in development. Developers cannot:
- Test meta tag generation
- Verify OpenGraph tags
- Debug canonical URLs
- Test social media previews

**Better Approach:** Feature flag `SEO_META_ENABLED=true` (default true in all envs)

---

#### A2. HTTPS Redirect Middleware
**File:** `server/index.ts:39-48`  
**Code:**
```typescript
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
  });
}
```
**Problem:** Cannot test HTTPS redirect logic locally. If redirect logic has bugs, they'll only appear in production.

**Better Approach:** Feature flag `FORCE_HTTPS_REDIRECT=true` + separate `HTTPS=true` config

---

#### A3. Canonical URL Enforcement
**File:** `server/index.ts:51-78`  
**Code:**
```typescript
if (process.env.NODE_ENV === 'production') {
  // Enforce non-www and remove trailing slashes
}
```
**Problem:** Cannot test:
- WWW to non-WWW redirects
- Trailing slash removal
- URL canonicalization logic

**Better Approach:** Feature flag `CANONICAL_URL_ENFORCEMENT=true`

---

#### A4. Production Monitoring & Compliance Tracking
**File:** `server/middleware/production-monitor.ts:80,117,163`  
**Code:**
```typescript
if (process.env.NODE_ENV === 'production') {
  console.error(`🚨 PRODUCTION ALERT: ${message}`, details);
}
if (process.env.NODE_ENV !== 'production') {
  return next(); // Skip monitoring in dev
}
```
**Problem:** 
- Cannot test alert logic
- Cannot verify monitoring works
- Cannot test compliance reporting
- Alerts only trigger in production (when it's too late)

**Better Approach:** Feature flags:
- `MONITORING_ENABLED=true`
- `COMPLIANCE_TRACKING_ENABLED=true`

---

#### A5. File Logging
**File:** `server/utils/logger-config.ts:125-128`  
**Code:**
```typescript
if (process.env.NODE_ENV === 'production' || process.env.LOG_FILE_ENABLED === 'true') {
  transports.push(getCombinedFileTransport());
  transports.push(getErrorFileTransport());
}
```
**Problem:** Developers cannot test file logging unless they know to set `LOG_FILE_ENABLED=true`

**Better Approach:** Use `LOG_FILE_ENABLED` everywhere (remove NODE_ENV check)

---

#### A6. Production Compliance Report Endpoint
**File:** `server/index.ts:190-194`  
**Code:**
```typescript
if (process.env.NODE_ENV === 'production') {
  app.get('/api/system/compliance-report', requireAdmin, (req, res) => {
    // Compliance reporting
  });
}
```
**Problem:** Cannot test compliance endpoint in development

**Better Approach:** Feature flag `COMPLIANCE_REPORT_ENABLED=true`

---

#### A7. JWT Secret Validation
**File:** `server/security/jwtService.ts:49-54`  
**Code:**
```typescript
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  console.warn('⚠️  Using generated JWT secret (development only)');
  this.secret = this.generateSecureSecret();
}
```
**Problem:** Different behavior in dev vs prod - dev auto-generates secret, prod requires it

**Better Approach:** Always require JWT_SECRET, use .env files to manage per-environment

---

#### A8. CSRF Secret Validation
**File:** `server/middleware/csrf.ts:129-140`  
**Code:**
```typescript
const csrfSecret = config?.secret || process.env.CSRF_SECRET;
if (!csrfSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CSRF_SECRET required in production');
  }
  console.warn('⚠️ Auto-generating CSRF secret (development only)');
  this.secret = randomBytes(32).toString('hex');
}
```
**Problem:** Auto-generated secrets in development invalidate on restart, losing all sessions

**Better Approach:** Always require CSRF_SECRET from environment

---

#### A9. CORS Configuration Warnings
**File:** `server/index.ts:262-272`  
**Code:**
```typescript
if (!allowedOriginsSet && !isDev) {
  console.warn('⚠️ Warning: CORS_ENABLED=true but ALLOWED_ORIGINS is not set.');
}
if (corsEnabled && !sameSiteNone && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ Warning: CORS is enabled but CSRF_COOKIE_SAMESITE is not set to "none".');
}
```
**Problem:** Warnings only show in production, when it's too late

**Better Approach:** Validate at startup in all environments

---

#### A10. Production Monitoring Console Logs
**File:** `server/index.ts:168,180,193,290`  
**Code:**
```typescript
if (process.env.NODE_ENV === 'production') {
  console.log('🏭 Production monitoring enabled: API compliance tracking');
}
console.log('🔧 Development features available...');
```
**Problem:** Different startup messages prevent testing actual production configuration

**Better Approach:** Feature-flag-based messages

---

#### A11-A13. Vite Plugin Loading (Production Build Optimizations)
**File:** `vite.config.ts:11-51`  
**Code:**
```typescript
...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
  ? [cartographer()]
  : []),
...(process.env.NODE_ENV === "production"
  ? [viteImagemin({ /* config */ })]
  : []),
```
**Problem:** 
- Cartographer plugin only in dev on Replit
- Image optimization only in production builds
- Cannot test production build behavior locally

**Better Approach:** Separate build configs for dev/prod, not runtime checks

---

### Category B: Features with Different Behavior (8 Locations)

These features **work differently** in dev vs production:

#### B1. Cookie Security Flags
**File:** `server/middleware/csrf.ts:71,350`  
**Code:**
```typescript
secure: process.env.NODE_ENV === 'production' || process.env.CORS_ENABLED === 'true',
sameSite: process.env.CORS_ENABLED === 'true' ? 'none' : 'lax',
```
**Problem:** 
- Cookies secure in prod, insecure in dev
- Different SameSite settings create subtle bugs
- Cannot test cross-origin cookie behavior locally

**Better Approach:** Use explicit `COOKIE_SECURE=true` and `COOKIE_SAMESITE=lax` configs

---

#### B2. CORS MaxAge
**File:** `server/index.ts:96`  
**Code:**
```typescript
maxAge: process.env.NODE_ENV === 'development' ? 86400 : 600,
```
**Problem:** 
- Dev caches CORS for 24h
- Prod caches for 10min
- Different behavior can hide CORS issues in dev

**Better Approach:** Use `CORS_MAX_AGE=600` config variable

---

#### B3. Error Message Detail Level
**File:** `server/middleware/error-handler.ts:262-264`  
**Code:**
```typescript
process.env.NODE_ENV === 'development' 
  ? `Internal server error: ${err.message}` 
  : 'Internal server error'
```
**Problem:** Detailed errors in dev, generic in prod - cannot test production error messages

**Better Approach:** Feature flag `ERROR_DETAILS_ENABLED=false` (explicit control)

---

#### B4. Logger Format & Colors
**File:** `server/utils/logger-config.ts:40,79`  
**Code:**
```typescript
// Log level
return process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Format
format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
```
**Problem:** 
- Different log formats between envs
- Cannot test JSON logging locally
- Cannot set log level independently

**Better Approach:** Use `LOG_LEVEL=debug` and `LOG_FORMAT=json` config

---

#### B5. Error Context in Controllers
**File:** `server/controllers/base.controller.ts:182,192,212,222,232,242,252,263,308`  
**Code:**
```typescript
process.env.NODE_ENV === 'development' ? error.context : undefined
```
**Problem:** Error context only available in dev, missing in production when actually needed for debugging

**Better Approach:** Always log context to logs, but don't expose to client in production

---

#### B6. CSRF Performance Metrics
**File:** `server/middleware/csrf.ts:65,149,235,255,471`  
**Code:**
```typescript
metricsEnabled: process.env.CSRF_ENABLE_METRICS === 'true',
if (this.config.metricsEnabled && process.env.NODE_ENV === 'development') {
  console.log('📊 CSRF Metrics:', this.metrics);
}
const start = process.env.NODE_ENV === 'development' ? Date.now() : 0;
```
**Problem:** Metrics tied to NODE_ENV instead of explicit flag

**Better Approach:** Use `CSRF_ENABLE_METRICS` only (already exists partially)

---

#### B7. HMR & WebSocket in Vite Dev Server
**File:** `server/vite.ts:25`, `vite.config.ts:110-112`  
**Code:**
```typescript
hmr: process.env.REPL_ID ? false : { server },

...(process.env.REPL_ID && {
  define: { 'import.meta.hot': 'undefined' },
}),
```
**Problem:** Different behavior on Replit vs local - mixing platform detection with environment

**Better Approach:** Explicit `HMR_ENABLED` config

---

#### B8. Development Features Toggle
**File:** `server/index.ts:173-175`  
**Code:**
```typescript
const devFeaturesEnabled = process.env.NODE_ENV === 'development' && 
                           !process.env.DISABLE_DEV_FEATURES &&
                           process.env.ALLOW_DEV_MIDDLEWARE === 'true';
```
**Problem:** Complex boolean logic mixing NODE_ENV with feature flags

**Better Approach:** Single `DEV_MIDDLEWARE_ENABLED` flag

---

### Category C: Auto-Generated Secrets & Configuration (4 Locations)

These create **security and stability issues**:

#### C1. JWT Secret Auto-Generation
**File:** `server/security/jwtService.ts:54`  
**Code:**
```typescript
this.secret = this.generateSecureSecret(); // crypto.randomBytes(64)
```
**Problem:** 
- New secret generated on every restart
- All existing JWTs become invalid
- Users logged out on every deployment
- Cannot share sessions across instances

**Impact:** CRITICAL - invalidates all user sessions on restart

---

#### C2. CSRF Secret Auto-Generation
**File:** `server/middleware/csrf.ts:138`  
**Code:**
```typescript
this.secret = randomBytes(32).toString('hex');
```
**Problem:**
- New secret on every restart
- All CSRF tokens become invalid
- Users get CSRF errors mid-session
- Forms fail randomly after deployment

**Impact:** HIGH - breaks user experience on restart

---

#### C3. Admin Password Default
**File:** `server/admin-setup.ts:16`  
**Code:**
```typescript
const adminPassword = process.env.ADMIN_PASSWORD || "Phozos2025!";
```
**Problem:** Hardcoded default password is a security risk

**Better Approach:** Require ADMIN_PASSWORD in production, fail if not set

---

#### C4. Base URL Fallback
**File:** `server/middleware/seo-meta.ts:94`, `client/src/components/SEO.tsx:42`  
**Code:**
```typescript
const baseUrl = process.env.BASE_URL || 'https://phozos.com';
const baseUrl = import.meta.env.VITE_BASE_URL || 'https://phozos.com';
```
**Problem:** Hardcoded fallback makes development use production URL

**Better Approach:** Require BASE_URL/VITE_BASE_URL in all environments

---

### Category D: Package.json Script Environment Hardcoding (5 Locations)

**File:** `package.json:7,10,15,29`  
**Code:**
```json
{
  "dev": "NODE_ENV=development npx tsx server/index.ts",
  "start": "NODE_ENV=production node dist/index.js",
  "db:migrate:prod": "NODE_ENV=production tsx server/db/migrate.ts",
  "build:production": "NODE_ENV=production npm run build && npm run validate:production"
}
```

**Problem:** 
- Hardcoding NODE_ENV in scripts prevents infrastructure from setting it
- Cannot run production build locally with different NODE_ENV
- Cannot test staging environment properly
- Scripts are not environment-neutral

**Better Approach:** Remove all NODE_ENV from scripts, let environment or .env files set it

---

### Category E: Other Environment-Specific Logic (15+ Locations)

#### E1. Schema Registry Development Logging
**File:** `shared/schema-registry.ts:507`  
**Code:**
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('Schema validation enabled in development');
}
```

#### E2. Database Configuration
**File:** `drizzle.config.ts:3-4`, `server/db.ts:4-5`, `server/db/migrate.ts:8-9`  
**Code:**
```typescript
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}
```
**Note:** This is CORRECT - database should always be required

#### E3. CORS Origin Parsing
**File:** `server/index.ts:29-31`  
**Code:**
```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5000', 'http://localhost:5173'];
```
**Problem:** Hardcoded localhost fallback

**Better Approach:** Require ALLOWED_ORIGINS or fail

#### E4. Admin IP Whitelist
**File:** `server/middleware/security.ts:33`  
**Code:**
```typescript
const adminIps = process.env.ADMIN_IPS?.split(',') || [];
```
**Note:** This is acceptable - optional feature

---

## 2. Current Configuration Structure Analysis

### 2.1 Environment Variable Management

**Current State:**
```
📁 Project Root
├── .env.example         ✅ Exists (template)
├── .env                 ❌ Not in repo (gitignored)
├── .env.development     ❌ MISSING
├── .env.production      ❌ MISSING
├── .env.local           ❌ Not used
└── server/
    └── config/          ❌ MISSING (no centralized config)
```

**How Environment Variables Are Currently Loaded:**
1. `dotenv/config` at top of `server/index.ts`
2. Direct `process.env.VAR_NAME` access throughout codebase
3. No validation
4. No type safety
5. No centralization

**Problems:**
- **No layering** - cannot have dev defaults + production overrides
- **No validation** - typos silently result in undefined
- **Scattered access** - 80+ files directly access process.env
- **No documentation** - hard to know what variables are needed
- **No type safety** - all values are strings

---

### 2.2 Centralized Configuration

**Current State:** ❌ **DOES NOT EXIST**

**What's Missing:**
- No `server/config/index.ts` module
- No configuration validation
- No typed config object
- No single source of truth
- No environment-based defaults

**Existing Patterns:**
- `server/utils/logger-config.ts` - Logger-specific config ✅ Good pattern
- `server/middleware/csrf.ts` - CSRF-specific config ✅ Good pattern
- But no **unified** config module

---

### 2.3 Feature Flags

**Current State:** ❌ **MINIMAL / NON-EXISTENT**

**Existing (Partial):**
- `client/src/lib/constants.ts:13-20` - Client-side feature flags (basic)
```typescript
features: {
  realTimeNotifications: true,
  aiMatching: true,
  darkMode: true,
  fileUpload: true,
  forum: true,
  analytics: true,
}
```

**Problems:**
- Only exists on client side
- No server-side feature flags
- Hardcoded boolean values (not environment-based)
- No connection to backend features

**Missing:**
- Server-side feature flag system
- Environment-based feature flags
- Runtime feature flag toggling
- Feature flag validation

---

## 3. Industry Standard Violations

Based on the attached industry standards document and practices from companies like Airbnb, Stripe, Shopify:

### Violation #1: Using NODE_ENV for Business Logic
**Industry Standard:** NODE_ENV should ONLY control framework behavior (error handling, minification, source maps)

**This Codebase:** Uses NODE_ENV to control:
- SEO meta injection
- HTTPS redirects
- Monitoring
- File logging
- Error message detail
- And 60+ more features

**Impact:** Cannot test production features in development

---

### Violation #2: No Layered Environment Files
**Industry Standard:** Use `.env` → `.env.development` → `.env.production` → `.env.local` hierarchy

**This Codebase:** 
- Only `.env.example` (template)
- No environment-specific files
- No layering

**Impact:** Developers must manually copy .env.example and know what to change

---

### Violation #3: No Centralized Config Module
**Industry Standard:** Single config module that:
- Loads all environment variables
- Validates them
- Provides typed access
- Fails fast on missing required vars

**This Codebase:**
- Direct `process.env` access in 80+ files
- No validation
- No type safety
- Silent failures

**Impact:** Typos and missing vars only discovered at runtime

---

### Violation #4: Hardcoded NODE_ENV in Package Scripts
**Industry Standard:** Scripts should be environment-neutral, let infrastructure set NODE_ENV

**This Codebase:**
```json
"dev": "NODE_ENV=development npx tsx server/index.ts"
```

**Impact:** Cannot run production build locally, cannot test staging properly

---

### Violation #5: Auto-Generated Secrets
**Industry Standard:** All secrets come from environment/secret manager

**This Codebase:** Auto-generates JWT_SECRET and CSRF_SECRET in development

**Impact:** Sessions invalidated on every restart

---

## 4. Prioritized Recommendations

### Priority 1: CRITICAL (Do First) 🔴

#### Recommendation 1.1: Remove Hardcoded NODE_ENV from package.json
**Impact:** HIGH - Enables proper environment testing  
**Effort:** LOW - 5 minutes

**Action:**
```json
// ❌ BEFORE
{
  "dev": "NODE_ENV=development npx tsx server/index.ts",
  "start": "NODE_ENV=production node dist/index.js"
}

// ✅ AFTER
{
  "dev": "tsx server/index.ts",
  "start": "node dist/index.js"
}
```

**Files to Change:**
- `package.json` lines 7, 10, 15, 29

---

#### Recommendation 1.2: Create Layered Environment Files
**Impact:** HIGH - Enables environment-specific defaults  
**Effort:** MEDIUM - 30 minutes

**Files to Create:**

**`.env.development`:**
```bash
# Development Environment Configuration
NODE_ENV=development

# Database (local)
DATABASE_URL=postgresql://user:password@localhost:5432/phozos_dev

# Security Secrets (use generated but consistent)
# Generate once with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=dev-jwt-secret-change-me-generate-a-real-one
CSRF_SECRET=dev-csrf-secret-change-me-generate-a-real-one

# Feature Flags
SEO_META_ENABLED=true
MONITORING_ENABLED=true
ERROR_DETAILS_ENABLED=true
FORCE_HTTPS_REDIRECT=false
CANONICAL_URL_ENFORCEMENT=false
COMPLIANCE_REPORT_ENABLED=true

# Logging
LOG_LEVEL=debug
LOG_FORMAT=pretty
LOG_FILE_ENABLED=true

# CORS
CORS_ENABLED=false
ALLOWED_ORIGINS=http://localhost:5000,http://localhost:5173

# Cookie Settings
COOKIE_SECURE=false
COOKIE_SAMESITE=lax

# Performance
CORS_MAX_AGE=86400

# Base URLs
BASE_URL=http://localhost:5000
VITE_BASE_URL=http://localhost:5173
```

**`.env.production`:**
```bash
# Production Environment Configuration
NODE_ENV=production

# Database (set by infrastructure)
# DATABASE_URL=<from environment>

# Security Secrets (set by infrastructure/secret manager)
# JWT_SECRET=<from environment>
# CSRF_SECRET=<from environment>

# Feature Flags
SEO_META_ENABLED=true
MONITORING_ENABLED=true
ERROR_DETAILS_ENABLED=false
FORCE_HTTPS_REDIRECT=true
CANONICAL_URL_ENFORCEMENT=true
COMPLIANCE_REPORT_ENABLED=true

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE_ENABLED=true

# CORS (for split deployments)
CORS_ENABLED=false
# ALLOWED_ORIGINS=https://yourdomain.com

# Cookie Settings
COOKIE_SECURE=true
COOKIE_SAMESITE=lax

# Performance
CORS_MAX_AGE=600

# Base URLs
BASE_URL=https://phozos.com
VITE_BASE_URL=https://phozos.com
```

**`.env.local.example`:**
```bash
# Personal Development Overrides
# Copy this to .env.local and customize for your setup
# .env.local is gitignored and takes precedence over .env.development

# Use your own database
# DATABASE_URL=postgresql://me:password@localhost:5432/my_phozos_dev

# Use your own secrets
# JWT_SECRET=my-personal-jwt-secret
# CSRF_SECRET=my-personal-csrf-secret
```

**Update `.gitignore`:**
```gitignore
# Environment files
.env
.env.local
.env.*.local

# Keep templates
!.env.example
!.env.local.example
```

---

#### Recommendation 1.3: Create Centralized Config Module
**Impact:** HIGH - Single source of truth  
**Effort:** HIGH - 2 hours

**File to Create:** `server/config/index.ts`

```typescript
/**
 * Centralized Configuration Module
 * 
 * Single source of truth for all application configuration.
 * Validates and provides typed access to environment variables.
 */

import { z } from 'zod';

// Environment schema with validation
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Server
  PORT: z.string().default('5000').transform(Number),
  
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // Security Secrets
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  CSRF_SECRET: z.string().min(32, 'CSRF_SECRET must be at least 32 characters'),
  
  // Optional Secrets
  ADMIN_PASSWORD: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  
  // Feature Flags
  SEO_META_ENABLED: z.string().default('true').transform(v => v === 'true'),
  MONITORING_ENABLED: z.string().default('true').transform(v => v === 'true'),
  ERROR_DETAILS_ENABLED: z.string().default('false').transform(v => v === 'true'),
  FORCE_HTTPS_REDIRECT: z.string().default('false').transform(v => v === 'true'),
  CANONICAL_URL_ENFORCEMENT: z.string().default('false').transform(v => v === 'true'),
  COMPLIANCE_REPORT_ENABLED: z.string().default('true').transform(v => v === 'true'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
  LOG_FILE_ENABLED: z.string().default('false').transform(v => v === 'true'),
  
  // CORS
  CORS_ENABLED: z.string().default('false').transform(v => v === 'true'),
  ALLOWED_ORIGINS: z.string().optional(),
  CORS_MAX_AGE: z.string().default('600').transform(Number),
  
  // Cookie Settings
  COOKIE_SECURE: z.string().default('false').transform(v => v === 'true'),
  COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('lax'),
  
  // URLs
  BASE_URL: z.string().url('BASE_URL must be a valid URL'),
  VITE_BASE_URL: z.string().url().optional(),
  
  // Admin
  ADMIN_IPS: z.string().optional(),
  
  // CSRF
  CSRF_ENABLE_METRICS: z.string().default('false').transform(v => v === 'true'),
  
  // Platform Detection
  REPL_ID: z.string().optional(),
  HTTPS: z.string().optional(),
  DISABLE_DEV_FEATURES: z.string().optional(),
  ALLOW_DEV_MIDDLEWARE: z.string().optional(),
});

// Parse and validate environment
function loadConfig() {
  try {
    const parsed = envSchema.parse(process.env);
    
    // Additional validation
    if (parsed.NODE_ENV === 'production') {
      if (!parsed.JWT_SECRET || parsed.JWT_SECRET.length < 64) {
        throw new Error('Production requires JWT_SECRET of at least 64 characters');
      }
      if (!parsed.CSRF_SECRET || parsed.CSRF_SECRET.length < 32) {
        throw new Error('Production requires CSRF_SECRET of at least 32 characters');
      }
      if (parsed.CORS_ENABLED && !parsed.ALLOWED_ORIGINS) {
        throw new Error('Production with CORS requires ALLOWED_ORIGINS to be set');
      }
    }
    
    return parsed;
  } catch (error) {
    console.error('❌ Configuration validation failed:');
    if (error instanceof z.ZodError) {
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

// Export typed config
export const config = loadConfig();

// Export feature flags separately for easy access
export const features = {
  seoMeta: config.SEO_META_ENABLED,
  monitoring: config.MONITORING_ENABLED,
  errorDetails: config.ERROR_DETAILS_ENABLED,
  forceHttps: config.FORCE_HTTPS_REDIRECT,
  canonicalUrl: config.CANONICAL_URL_ENFORCEMENT,
  complianceReport: config.COMPLIANCE_REPORT_ENABLED,
};

// Export helper functions
export function isProduction(): boolean {
  return config.NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return config.NODE_ENV === 'development';
}

export function isTest(): boolean {
  return config.NODE_ENV === 'test';
}

// Log configuration on startup (non-sensitive info only)
console.log('📋 Configuration loaded successfully');
console.log(`   Environment: ${config.NODE_ENV}`);
console.log(`   Port: ${config.PORT}`);
console.log(`   Database: ${config.DATABASE_URL ? '✓ Connected' : '✗ Missing'}`);
console.log(`   SEO Meta: ${features.seoMeta ? 'Enabled' : 'Disabled'}`);
console.log(`   Monitoring: ${features.monitoring ? 'Enabled' : 'Disabled'}`);
console.log(`   HTTPS Redirect: ${features.forceHttps ? 'Enabled' : 'Disabled'}`);
console.log(`   CORS: ${config.CORS_ENABLED ? 'Enabled' : 'Disabled'}`);
console.log(`   Log Level: ${config.LOG_LEVEL}`);
```

**Usage Throughout Codebase:**
```typescript
// ❌ BEFORE
if (process.env.NODE_ENV === 'production') {
  injectSEOMeta();
}

// ✅ AFTER
import { config, features } from './config';

if (features.seoMeta) {
  injectSEOMeta();
}
```

---

### Priority 2: HIGH (Do Next) 🟡

#### Recommendation 2.1: Replace NODE_ENV Checks with Feature Flags
**Impact:** HIGH - Enables testing production features  
**Effort:** HIGH - 4-6 hours

**Files to Update:**

1. **`server/middleware/seo-meta.ts:85`**
```typescript
// ❌ BEFORE
if (meta && process.env.NODE_ENV === 'production') {

// ✅ AFTER
import { features } from '../config';
if (meta && features.seoMeta) {
```

2. **`server/index.ts:39-48` (HTTPS Redirect)**
```typescript
// ❌ BEFORE
if (process.env.NODE_ENV === 'production') {

// ✅ AFTER
import { config, features } from './config';
if (features.forceHttps) {
```

3. **`server/index.ts:51-78` (Canonical URL)**
```typescript
// ❌ BEFORE
if (process.env.NODE_ENV === 'production') {

// ✅ AFTER
if (features.canonicalUrl) {
```

4. **`server/middleware/production-monitor.ts`**
```typescript
// ❌ BEFORE
if (process.env.NODE_ENV === 'production') {
  console.error(`🚨 PRODUCTION ALERT: ${message}`, details);
}

// ✅ AFTER
import { features } from '../config';
if (features.monitoring) {
  console.error(`🚨 ALERT: ${message}`, details);
}
```

5. **`server/utils/logger-config.ts`**
```typescript
// ❌ BEFORE
return process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,

// ✅ AFTER
import { config } from '../config';
return config.LOG_LEVEL;
format: config.LOG_FORMAT === 'json' ? productionFormat : developmentFormat,
```

6. **`server/middleware/error-handler.ts:262`**
```typescript
// ❌ BEFORE
process.env.NODE_ENV === 'development' 
  ? `Internal server error: ${err.message}` 
  : 'Internal server error'

// ✅ AFTER
import { features } from '../config';
features.errorDetails
  ? `Internal server error: ${err.message}` 
  : 'Internal server error'
```

7. **`server/middleware/csrf.ts`**
```typescript
// ❌ BEFORE
secure: process.env.NODE_ENV === 'production' || process.env.CORS_ENABLED === 'true',
sameSite: process.env.CORS_ENABLED === 'true' ? 'none' : 'lax',

// ✅ AFTER
import { config } from '../config';
secure: config.COOKIE_SECURE,
sameSite: config.COOKIE_SAMESITE,
```

8. **`server/index.ts:96` (CORS MaxAge)**
```typescript
// ❌ BEFORE
maxAge: process.env.NODE_ENV === 'development' ? 86400 : 600,

// ✅ AFTER
maxAge: config.CORS_MAX_AGE,
```

**Complete List of Files Requiring Updates:**
- `server/index.ts` (10 locations)
- `server/middleware/seo-meta.ts` (1 location)
- `server/middleware/production-monitor.ts` (3 locations)
- `server/middleware/error-handler.ts` (1 location)
- `server/middleware/csrf.ts` (6 locations)
- `server/utils/logger-config.ts` (3 locations)
- `server/controllers/base.controller.ts` (9 locations)
- `server/security/jwtService.ts` (2 locations)
- `vite.config.ts` (3 locations)

---

#### Recommendation 2.2: Require Secrets, Stop Auto-Generation
**Impact:** HIGH - Prevents session invalidation  
**Effort:** LOW - 30 minutes

**Files to Update:**

1. **`server/security/jwtService.ts:49-54`**
```typescript
// ❌ BEFORE
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  console.warn('⚠️  Using generated JWT secret (development only)');
  this.secret = this.generateSecureSecret();
} else {
  this.secret = process.env.JWT_SECRET;
}

// ✅ AFTER
import { config } from '../config';
this.secret = config.JWT_SECRET; // Config module ensures it exists
```

2. **`server/middleware/csrf.ts:129-140`**
```typescript
// ❌ BEFORE
const csrfSecret = config?.secret || process.env.CSRF_SECRET;
if (!csrfSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CSRF_SECRET required in production');
  }
  console.warn('⚠️ Auto-generating CSRF secret (development only)');
  this.secret = randomBytes(32).toString('hex');
}

// ✅ AFTER
import { config } from '../config';
this.secret = config.CSRF_SECRET; // Config module ensures it exists
```

3. **Update `.env.development` with persistent secrets:**
```bash
# Generate these ONCE and commit to .env.development
# These stay consistent across restarts in development
JWT_SECRET=dev-jwt-secret-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
CSRF_SECRET=dev-csrf-secret-0123456789abcdef0123456789abcdef
```

4. **Update `README.md` with secret generation instructions:**
```markdown
## Environment Setup

1. Copy environment template:
   ```bash
   cp .env.development .env
   ```

2. Generate production secrets (for production only):
   ```bash
   # JWT Secret (64 characters minimum)
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   
   # CSRF Secret (32 characters minimum)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. Set secrets in production environment (AWS, Replit, etc.)
```

---

#### Recommendation 2.3: Update Vite Config
**Impact:** MEDIUM - Cleaner build configuration  
**Effort:** LOW - 15 minutes

**File:** `vite.config.ts`

```typescript
// ❌ BEFORE
...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
  ? [cartographer()]
  : []),
...(process.env.NODE_ENV === "production"
  ? [viteImagemin({ /* ... */ })]
  : []),

// ✅ AFTER (Option 1: Use explicit build flags)
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';
  const isReplit = !!env.REPL_ID;
  
  return {
    plugins: [
      react(),
      runtimeErrorOverlay(),
      // Cartographer only in Replit development
      ...(!isProduction && isReplit ? [cartographer()] : []),
      // Image optimization only in production builds
      ...(isProduction ? [viteImagemin({ /* ... */ })] : []),
    ],
    // ... rest of config
  };
});

// ✅ AFTER (Option 2: Separate config files)
// vite.config.base.ts - shared config
// vite.config.dev.ts - dev overrides
// vite.config.prod.ts - prod overrides
```

---

### Priority 3: MEDIUM (Improve) 🟢

#### Recommendation 3.1: Add dotenv-flow for Layered Loading
**Impact:** MEDIUM - Automatic layer loading  
**Effort:** LOW - 15 minutes

**Install:**
```bash
npm install dotenv-flow
```

**Update `server/index.ts:1`:**
```typescript
// ❌ BEFORE
import 'dotenv/config';

// ✅ AFTER
import 'dotenv-flow/config'; // Automatically loads .env.{NODE_ENV}
```

**How it works:**
```
dotenv-flow loads files in this order (later overrides earlier):
1. .env                    (common defaults)
2. .env.local              (local overrides, gitignored)
3. .env.{NODE_ENV}         (.env.development or .env.production)
4. .env.{NODE_ENV}.local   (.env.development.local, gitignored)
```

---

#### Recommendation 3.2: Add Config Validation Tests
**Impact:** MEDIUM - Catch config errors early  
**Effort:** LOW - 30 minutes

**File to Create:** `server/config/__tests__/config.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Configuration Module', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should fail if DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    expect(() => require('../index')).toThrow('DATABASE_URL is required');
  });

  it('should fail if JWT_SECRET is too short in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'tooshort';
    expect(() => require('../index')).toThrow('at least 32 characters');
  });

  it('should default LOG_LEVEL to info', () => {
    delete process.env.LOG_LEVEL;
    const { config } = require('../index');
    expect(config.LOG_LEVEL).toBe('info');
  });

  it('should parse boolean feature flags correctly', () => {
    process.env.SEO_META_ENABLED = 'true';
    process.env.MONITORING_ENABLED = 'false';
    const { features } = require('../index');
    expect(features.seoMeta).toBe(true);
    expect(features.monitoring).toBe(false);
  });
});
```

---

#### Recommendation 3.3: Add TypeScript Environment Typing
**Impact:** LOW - Better IDE support  
**Effort:** LOW - 15 minutes

**File to Create:** `server/types/env.d.ts`

```typescript
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Node
      NODE_ENV: 'development' | 'production' | 'test';
      PORT?: string;
      
      // Database
      DATABASE_URL: string;
      
      // Security
      JWT_SECRET: string;
      CSRF_SECRET: string;
      ADMIN_PASSWORD?: string;
      SENDGRID_API_KEY?: string;
      
      // Feature Flags
      SEO_META_ENABLED?: string;
      MONITORING_ENABLED?: string;
      ERROR_DETAILS_ENABLED?: string;
      FORCE_HTTPS_REDIRECT?: string;
      CANONICAL_URL_ENFORCEMENT?: string;
      COMPLIANCE_REPORT_ENABLED?: string;
      
      // Logging
      LOG_LEVEL?: 'error' | 'warn' | 'info' | 'http' | 'debug';
      LOG_FORMAT?: 'json' | 'pretty';
      LOG_FILE_ENABLED?: string;
      
      // CORS
      CORS_ENABLED?: string;
      ALLOWED_ORIGINS?: string;
      CORS_MAX_AGE?: string;
      
      // Cookies
      COOKIE_SECURE?: string;
      COOKIE_SAMESITE?: 'strict' | 'lax' | 'none';
      
      // URLs
      BASE_URL: string;
      VITE_BASE_URL?: string;
      
      // Admin
      ADMIN_IPS?: string;
      
      // Platform
      REPL_ID?: string;
      HTTPS?: string;
      DISABLE_DEV_FEATURES?: string;
      ALLOW_DEV_MIDDLEWARE?: string;
    }
  }
}

export {};
```

---

#### Recommendation 3.4: Document Configuration in README
**Impact:** LOW - Better onboarding  
**Effort:** LOW - 30 minutes

**Add to `README.md`:**

````markdown
## Configuration

This application uses a layered environment configuration system.

### Environment Files

```
.env                 - Common defaults (committed, no secrets)
.env.development     - Development defaults (committed)
.env.production      - Production defaults (committed, no secrets)
.env.local          - Personal overrides (gitignored, optional)
.env.{NODE_ENV}.local - Environment-specific personal overrides (gitignored)
```

**Loading Order:** (later overrides earlier)
1. `.env`
2. `.env.local`
3. `.env.{NODE_ENV}` (e.g., `.env.development`)
4. `.env.{NODE_ENV}.local`

### Required Environment Variables

#### All Environments:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (min 32 chars, 64+ recommended)
- `CSRF_SECRET` - CSRF token secret (min 32 chars)
- `BASE_URL` - Application base URL

#### Production Only:
- `ADMIN_PASSWORD` - Initial admin password (optional, defaults to generated)
- `SENDGRID_API_KEY` - Email service API key (if using email features)

### Feature Flags

Control application behavior via environment variables:

| Flag | Default | Description |
|------|---------|-------------|
| `SEO_META_ENABLED` | `true` | Enable server-side SEO meta injection |
| `MONITORING_ENABLED` | `true` | Enable production monitoring & alerts |
| `ERROR_DETAILS_ENABLED` | `false` | Show detailed error messages |
| `FORCE_HTTPS_REDIRECT` | `false` | Redirect HTTP to HTTPS |
| `CANONICAL_URL_ENFORCEMENT` | `false` | Enforce canonical URLs |
| `COMPLIANCE_REPORT_ENABLED` | `true` | Enable compliance reporting endpoint |
| `LOG_FILE_ENABLED` | `false` | Write logs to files |
| `CORS_ENABLED` | `false` | Enable CORS (for split deployments) |

### Quick Start

```bash
# Development
cp .env.development .env
npm install
npm run dev

# Production
# Set environment variables via infrastructure (AWS, Replit, etc.)
npm run build
npm start
```
````

---

## 5. Migration Strategy

### Phase 1: Foundation (Week 1)
**Goal:** Set up configuration infrastructure

1. ✅ Create `.env.development` and `.env.production`
2. ✅ Create `server/config/index.ts` with validation
3. ✅ Install `dotenv-flow`
4. ✅ Update `server/index.ts` to use `dotenv-flow/config`
5. ✅ Remove `NODE_ENV` from `package.json` scripts
6. ✅ Test that application starts with new config

**Success Criteria:**
- Application starts with validated config
- Missing variables fail fast with clear errors
- Developers can override with `.env.local`

---

### Phase 2: Replace NODE_ENV Checks (Week 2-3)
**Goal:** Convert environment checks to feature flags

1. ✅ Update `server/middleware/seo-meta.ts` to use `features.seoMeta`
2. ✅ Update `server/index.ts` HTTPS and canonical URL middleware
3. ✅ Update `server/middleware/production-monitor.ts`
4. ✅ Update `server/utils/logger-config.ts`
5. ✅ Update `server/middleware/error-handler.ts`
6. ✅ Update `server/middleware/csrf.ts` cookie settings
7. ✅ Update all `server/controllers/base.controller.ts` error contexts
8. ✅ Test each feature flag works in both dev and production

**Success Criteria:**
- Can enable SEO meta in development
- Can disable monitoring in production
- Can test HTTPS redirect locally
- No more `if (NODE_ENV === 'production')` for business logic

---

### Phase 3: Fix Auto-Generated Secrets (Week 3)
**Goal:** Eliminate session invalidation on restart

1. ✅ Remove auto-generation from `server/security/jwtService.ts`
2. ✅ Remove auto-generation from `server/middleware/csrf.ts`
3. ✅ Add persistent secrets to `.env.development`
4. ✅ Update config module to require secrets
5. ✅ Test that sessions persist across restarts in development

**Success Criteria:**
- No more "auto-generating secret" warnings
- Sessions survive server restarts
- Clear error if secrets missing

---

### Phase 4: Clean Up & Test (Week 4)
**Goal:** Ensure everything works

1. ✅ Add config validation tests
2. ✅ Add environment typing (`env.d.ts`)
3. ✅ Update documentation
4. ✅ Test all feature flags
5. ✅ Test production build locally
6. ✅ Test staging deployment

**Success Criteria:**
- All tests pass
- Documentation complete
- Can run production build locally
- Staging environment works

---

## 6. Testing Checklist

### Before Migration:
- [ ] Document current NODE_ENV usages
- [ ] Identify all auto-generated values
- [ ] Backup current `.env` file
- [ ] Document current behavior

### During Migration:
- [ ] Config module validates all variables
- [ ] Config module fails fast on missing required vars
- [ ] Feature flags work in all environments
- [ ] Secrets persist across restarts
- [ ] No hardcoded NODE_ENV in package.json

### After Migration:
- [ ] Can enable SEO meta in development
- [ ] Can test HTTPS redirect locally
- [ ] Can test monitoring alerts locally
- [ ] Sessions persist across restarts
- [ ] Production build works locally
- [ ] Staging environment works
- [ ] All tests pass
- [ ] Documentation updated

---

## 7. Files to Create

### New Files:
1. `server/config/index.ts` - Centralized config module (CRITICAL)
2. `.env.development` - Development defaults
3. `.env.production` - Production defaults
4. `.env.local.example` - Personal overrides template
5. `server/config/__tests__/config.test.ts` - Config validation tests
6. `server/types/env.d.ts` - TypeScript environment typing

### Files to Update:
1. `package.json` - Remove hardcoded NODE_ENV (5 lines)
2. `server/index.ts` - Use config module (20+ locations)
3. `server/middleware/seo-meta.ts` - Use feature flag (1 location)
4. `server/middleware/production-monitor.ts` - Use feature flag (3 locations)
5. `server/middleware/error-handler.ts` - Use feature flag (1 location)
6. `server/middleware/csrf.ts` - Use config (6 locations)
7. `server/utils/logger-config.ts` - Use config (3 locations)
8. `server/controllers/base.controller.ts` - Use feature flag (9 locations)
9. `server/security/jwtService.ts` - Use config, remove auto-gen (2 locations)
10. `vite.config.ts` - Cleaner build logic (2 locations)
11. `.env.example` - Update with new variables
12. `.gitignore` - Add .env.local patterns
13. `README.md` - Add configuration documentation

**Total:** 6 new files, 13 files to update, ~60 specific code locations

---

## 8. Risk Analysis

### High Risk:
- ❌ **Breaking sessions on deployment** - Auto-generated secrets invalidate all users
- ❌ **Untested production features** - SEO, HTTPS redirects only work in prod
- ❌ **Config typos** - Silent failures with no validation

### Medium Risk:
- ⚠️ **Cookie security inconsistency** - Different settings per environment
- ⚠️ **CORS misconfiguration** - Hard to debug when wrong
- ⚠️ **Missing environment variables** - Only discovered at runtime

### Low Risk:
- ℹ️ **Log format differences** - Mostly cosmetic
- ℹ️ **Performance metrics** - Already optional

---

## 9. Estimated Effort

### Developer Time:
- **Initial Setup (Priority 1):** 4-6 hours
  - Environment files: 1 hour
  - Config module: 2-3 hours
  - Testing: 1-2 hours

- **Code Migration (Priority 2):** 6-8 hours
  - Replace NODE_ENV checks: 4-5 hours
  - Fix auto-generation: 1 hour
  - Testing: 1-2 hours

- **Polish (Priority 3):** 2-3 hours
  - Tests: 1 hour
  - Documentation: 1 hour
  - TypeScript typing: 30 min

**Total:** 12-17 hours (2-3 days)

---

## 10. Success Metrics

### Before Migration:
- ✗ 87+ environment-dependent locations
- ✗ 13 production-only features
- ✗ 4 auto-generated secrets
- ✗ 0 feature flags (server)
- ✗ No config validation
- ✗ Sessions lost on restart

### After Migration:
- ✅ 0 business logic NODE_ENV checks (only framework-level)
- ✅ 0 production-only features (all testable locally)
- ✅ 0 auto-generated secrets
- ✅ 10+ feature flags
- ✅ Full config validation
- ✅ Sessions persist across restarts
- ✅ Can run production build locally
- ✅ Can test all features in all environments

---

## 11. References

### Industry Standards:
- **12-Factor App:** Environment-based configuration
- **Airbnb Engineering:** Layered environment files
- **Stripe Engineering:** Feature flags over environment checks
- **Shopify Engineering:** Centralized config modules
- **Next.js:** Validated environment variables with Zod

### Tools Used:
- **dotenv-flow:** Layered environment file loading
- **Zod:** Runtime validation and type safety
- **TypeScript:** Compile-time environment typing

---

## Conclusion

This codebase has **87+ locations of environment-dependent behavior** that violate industry standards and create significant deployment risks. The recommended migration will:

1. **Enable Testing:** All production features testable locally
2. **Improve Reliability:** Validated configuration, no silent failures
3. **Enhance Developer Experience:** Clear defaults, easy overrides
4. **Reduce Risk:** No session invalidation, no untested features
5. **Follow Best Practices:** Industry-standard configuration patterns

**Priority Order:**
1. 🔴 **CRITICAL:** Environment files + Config module + Remove hardcoded NODE_ENV
2. 🟡 **HIGH:** Replace NODE_ENV checks + Fix auto-generation
3. 🟢 **MEDIUM:** Tests + Documentation + TypeScript typing

**Estimated Time:** 12-17 hours (2-3 days)  
**Impact:** Massive improvement in testability, reliability, and maintainability

---

*This report was generated on October 28, 2025 for the Phozos Study Abroad Platform codebase.*
