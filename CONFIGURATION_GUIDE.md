# Configuration Guide - EduPath Platform

**Last Updated:** October 28, 2025  
**Version:** 2.1 (Phase 4 Complete - Legacy Code Cleanup)

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Configuration Files](#configuration-files)
4. [All Configuration Options](#all-configuration-options)
5. [Environment-Specific Examples](#environment-specific-examples)
6. [Migration from NODE_ENV](#migration-from-nodeenv)
7. [Testing Configuration](#testing-configuration)
8. [Troubleshooting](#troubleshooting)

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
| `.env.example` | Documentation | ✅ Yes | Documentation and templates |

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
```

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
1. Check your `.env.local` file exists
2. Ensure secrets meet minimum length requirements
3. Use the secret generation commands from Quick Start

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

### Environment Files Not Loading

**Problem:** Changes to `.env.local` don't take effect

**Solution:**
1. Restart the server (environment files load on startup)
2. Check file name is exactly `.env.local` (no typos)
3. Ensure file is in project root directory
4. Check file is not corrupted (try `cat .env.local`)

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

## Additional Resources

- **Feature Flags Test Report:** `FEATURE_FLAGS_TEST_REPORT.md`
- **Environment Dependency Analysis:** `ENVIRONMENT_DEPENDENCY_ANALYSIS_REPORT.md`
- **Configuration Module Source:** `server/config/index.ts`
- **Example Configuration:** `.env.example`

---

## Support

For questions or issues with configuration:
1. Check this guide first
2. Review `.env.example` for all available options
3. Run `tsx server/config/test-config.ts` to validate your configuration
4. Check the test reports for detailed documentation

**Last Updated:** October 28, 2025 - Phase 3 Complete
