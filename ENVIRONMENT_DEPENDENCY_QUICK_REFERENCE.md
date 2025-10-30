# Environment Dependency Quick Reference
## Phozos Platform - Critical Findings Summary

**Total Issues Found:** 87+ locations  
**Estimated Fix Time:** 12-17 hours (2-3 days)

---

## 🔴 CRITICAL - Fix Immediately

### 1. Remove Hardcoded NODE_ENV from package.json (5 minutes)
**File:** `package.json` lines 7, 10, 15, 29

```json
// Change from:
"dev": "NODE_ENV=development npx tsx server/index.ts"
// To:
"dev": "tsx server/index.ts"
```

**Impact:** Prevents infrastructure from setting NODE_ENV

---

### 2. Create Environment Files (30 minutes)
**Missing:** `.env.development`, `.env.production`, `.env.local.example`

Create development defaults that persist across restarts:
- JWT_SECRET (64 chars) - Currently auto-generated, invalidates sessions
- CSRF_SECRET (32 chars) - Currently auto-generated, breaks forms
- Feature flags for testing production features locally

---

### 3. Create Config Module (2 hours)
**Missing:** `server/config/index.ts`

Centralized configuration with:
- Zod validation (fail fast on errors)
- Type safety
- Feature flag exports
- Clear startup validation messages

---

## 🟡 HIGH PRIORITY - Fix Soon

### Production-Only Features (Cannot Test Locally)

| Feature | File | Line | Fix |
|---------|------|------|-----|
| SEO Meta Injection | `server/middleware/seo-meta.ts` | 85 | Use `SEO_META_ENABLED` flag |
| HTTPS Redirect | `server/index.ts` | 39 | Use `FORCE_HTTPS_REDIRECT` flag |
| Canonical URL | `server/index.ts` | 51 | Use `CANONICAL_URL_ENFORCEMENT` flag |
| Production Monitoring | `server/middleware/production-monitor.ts` | 80,117,163 | Use `MONITORING_ENABLED` flag |
| File Logging | `server/utils/logger-config.ts` | 125 | Use `LOG_FILE_ENABLED` flag |
| Compliance Endpoint | `server/index.ts` | 190 | Use `COMPLIANCE_REPORT_ENABLED` flag |

---

### Different Behavior (Dev vs Prod)

| Behavior | File | Line | Problem | Fix |
|----------|------|------|---------|-----|
| Cookie Secure | `server/middleware/csrf.ts` | 71 | Secure in prod, not in dev | Use `COOKIE_SECURE` config |
| CORS MaxAge | `server/index.ts` | 96 | 24h in dev, 10min in prod | Use `CORS_MAX_AGE` config |
| Error Details | `server/middleware/error-handler.ts` | 262 | Detailed in dev, hidden in prod | Use `ERROR_DETAILS_ENABLED` flag |
| Logger Format | `server/utils/logger-config.ts` | 79 | Pretty in dev, JSON in prod | Use `LOG_FORMAT` config |

---

### Auto-Generated Secrets (Session Invalidation)

| Secret | File | Line | Impact |
|--------|------|------|--------|
| JWT_SECRET | `server/security/jwtService.ts` | 54 | All users logged out on restart |
| CSRF_SECRET | `server/middleware/csrf.ts` | 138 | Forms break on restart |

**Fix:** Require secrets from environment, add to `.env.development`

---

## 📋 Complete File List

### Files to CREATE:
1. `server/config/index.ts` - Centralized config (CRITICAL)
2. `.env.development` - Dev defaults with persistent secrets
3. `.env.production` - Prod defaults (no secrets)
4. `.env.local.example` - Personal overrides template
5. `server/config/__tests__/config.test.ts` - Validation tests
6. `server/types/env.d.ts` - TypeScript typing

### Files to UPDATE:
1. `package.json` - 5 lines (remove NODE_ENV)
2. `server/index.ts` - 20+ locations
3. `server/middleware/seo-meta.ts` - 1 location
4. `server/middleware/production-monitor.ts` - 3 locations
5. `server/middleware/error-handler.ts` - 1 location
6. `server/middleware/csrf.ts` - 6 locations
7. `server/utils/logger-config.ts` - 3 locations
8. `server/controllers/base.controller.ts` - 9 locations
9. `server/security/jwtService.ts` - 2 locations
10. `vite.config.ts` - 2 locations
11. `.env.example` - Update with new variables
12. `.gitignore` - Add .env.local patterns
13. `README.md` - Configuration docs

---

## 🎯 Quick Win Actions (Do Today)

### 1. Stop Hardcoding NODE_ENV (5 min)
```bash
# Edit package.json, remove all NODE_ENV= from scripts
```

### 2. Generate Persistent Secrets (2 min)
```bash
# JWT Secret (64 chars)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# CSRF Secret (32 chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Create .env.development (5 min)
```bash
# Copy template and add generated secrets
cp .env.example .env.development
# Edit and paste secrets from step 2
```

---

## 🚀 Feature Flags to Add

### Server-Side Feature Flags:
```bash
# Production Features (should be testable in dev)
SEO_META_ENABLED=true
MONITORING_ENABLED=true
ERROR_DETAILS_ENABLED=false
FORCE_HTTPS_REDIRECT=false
CANONICAL_URL_ENFORCEMENT=false
COMPLIANCE_REPORT_ENABLED=true

# Logging
LOG_LEVEL=debug
LOG_FORMAT=pretty
LOG_FILE_ENABLED=true

# CORS
CORS_ENABLED=false
CORS_MAX_AGE=86400

# Cookies
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
```

---

## 📊 Impact Metrics

### Before Fix:
- ✗ 13 features only work in production
- ✗ 8 features behave differently per environment
- ✗ 4 auto-generated values that invalidate on restart
- ✗ 60+ direct NODE_ENV checks
- ✗ Cannot test production features locally
- ✗ Sessions lost on every restart

### After Fix:
- ✅ All features testable in any environment
- ✅ Consistent behavior across environments
- ✅ Secrets persist across restarts
- ✅ 0 business logic NODE_ENV checks
- ✅ Validated configuration with clear errors
- ✅ Can run production build locally

---

## 🔍 Search for More Issues

Use these grep commands to find remaining issues:
```bash
# Find all NODE_ENV checks
grep -rn "NODE_ENV" server/ client/

# Find all process.env direct access
grep -rn "process\.env\." server/ --include="*.ts"

# Find auto-generation patterns
grep -rn "randomBytes\|generateSecure" server/
```

---

## 📚 Related Documents

- **Full Analysis:** `ENVIRONMENT_DEPENDENCY_ANALYSIS_REPORT.md` (87+ findings with details)
- **Industry Standards:** `attached_assets/Pasted-Critical-Findings-Summary-...txt`
- **Example Config Module:** See full analysis report Section 4.3

---

## ⚠️ Common Pitfalls to Avoid

1. ❌ **Don't** use `process.env` directly - use config module
2. ❌ **Don't** use NODE_ENV for feature flags - use explicit flags
3. ❌ **Don't** auto-generate secrets - require from environment
4. ❌ **Don't** hardcode defaults - use .env files
5. ❌ **Don't** set NODE_ENV in package.json - let environment set it

✅ **Do** validate all config on startup  
✅ **Do** fail fast with clear errors  
✅ **Do** use feature flags for testability  
✅ **Do** document all configuration  
✅ **Do** use layered .env files  

---

*See full analysis report for detailed code examples and implementation guidance.*
