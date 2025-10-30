# Winston Logger Migration Plan - EduPath Application

**Investigation Date:** October 22, 2025  
**Current State:** Using `console.log/error/warn` throughout codebase  
**Target State:** Centralized Winston logger with structured logging

---

## Executive Summary

This document provides a comprehensive investigation of all console logging in the EduPath application and a detailed phased plan for migrating to Winston logger. The investigation found **292+ console statements** across 93+ files, with critical security and sensitive data logging concerns that require immediate attention.

### Key Findings:
- **Server-side:** 70+ files with 210+ console statements
- **Client-side:** 23+ files with 82+ console statements  
- **Test files:** 40+ files with extensive console usage (handled separately)
- **Critical security issues:** Sensitive data logging in authentication, CSRF, and security middleware
- **High-concentration areas:** Community.tsx (16), AdminDashboard.tsx (13), csrf.ts (15), security.ts (10)

---

## 1. FULL CODEBASE AUDIT

### 1.1 Console Statement Distribution

#### Server-Side (70+ files, ~210 statements)

**Middleware Layer (8 files, ~60 statements):**
- `server/middleware/csrf.ts` - 15 statements (CRITICAL - token validation logs)
- `server/middleware/security.ts` - 10 statements (CRITICAL - user email exposure)
- `server/middleware/error-handler.ts` - 7 statements (errors with sensitive data)
- `server/middleware/authentication.ts` - 4 statements (user identification warnings)
- `server/middleware/performanceMonitor.ts` - 2 statements (performance metrics)
- `server/middleware/production-monitor.ts` - 1 statement (production compliance)
- `server/middleware/database-health.ts` - 1 statement (database health)
- `server/middleware/__tests__/csrf.test.ts` - 4 statements (test code)

**Infrastructure Services (5 files, ~27 statements):**
- `server/services/infrastructure/websocket.ts` - 9 statements (connection logs)
- `server/services/infrastructure/messageQueue.ts` - 9 statements (message queue ops)
- `server/services/infrastructure/websocket-handlers.ts` - 3 statements (event handling)
- `server/services/infrastructure/__tests__/` - 6 statements (test code)

**Core Application (6 files, ~37 statements):**
- `server/index.ts` - 19 statements (CRITICAL - startup, config, errors)
- `server/admin-setup.ts` - 5 statements (admin user creation)
- `server/setup-after-migration.ts` - 33 statements (migration scripts)
- `server/seed-data.ts` - 8 statements (data seeding)
- `server/seed-subscription-plans.ts` - 6 statements (plan seeding)
- `server/vite.ts` - 1 statement (dev server)

**Controllers (4 files, ~13 statements):**
- `server/controllers/systemMetrics.controller.ts` - 5 statements (metrics)
- `server/controllers/chat.controller.ts` - 4 statements (chat operations)
- `server/controllers/admin.controller.ts` - 2 statements (admin ops)
- `server/controllers/counselor.controller.ts` - 1 statement (counselor ops)
- `server/controllers/base.controller.ts` - 1 statement (base controller)

**Domain Services (13 files, ~20 statements in production code):**
- `server/services/domain/university.service.ts` - 1 statement (import errors)
- `server/services/domain/registration.service.ts` - 1 statement (staff registration)
- `server/services/domain/temporaryPassword.service.ts` - 1 statement (password gen)
- `server/services/domain/admin/company-admin.service.ts` - 1 statement (password reset)
- `server/services/base.service.ts` - 1 statement (base service)

**Security & Authentication (2 files, ~4 statements):**
- `server/security/jwtService.ts` - 4 statements (JWT operations)

**Utilities & Helpers (2 files, ~4 statements):**
- `server/utils/migration-helpers.ts` - 3 statements (migration utilities)
- `server/routes/index.ts` - 1 statement (route setup)

**Test Files (40+ files, ~70+ statements):**
- All `__tests__` directories contain console statements for test output
- These should be handled separately from production code

#### Client-Side (23 files, ~82 statements)

**High-Concentration Pages:**
- `client/src/pages/Community.tsx` - 16 statements (forum debugging, mobile UI)
- `client/src/pages/AdminDashboard.tsx` - 13 statements (admin operations, debugging)

**Authentication & User Management:**
- `client/src/pages/Auth.tsx` - 6 statements (CSRF token flow, login errors)
- `client/src/main.tsx` - 6 statements (app initialization)
- `client/src/hooks/useAuth.tsx` - 3 statements (auth state)

**API & Infrastructure:**
- `client/src/lib/api-client.ts` - 5 statements (CRITICAL - token errors, validation)
- `client/src/hooks/useWebSocket.ts` - 9 statements (WebSocket connection)
- `client/src/lib/queryClient.ts` - 1 statement (query cache)

**Components:**
- `client/src/components/ErrorBoundary.tsx` - 3 statements (error catching)
- `client/src/components/Navigation.tsx` - 2 statements (navigation)
- `client/src/components/ProtectedRoute.tsx` - 2 statements (route protection)
- `client/src/components/mobile/MobileCreatePostModal.tsx` - 2 statements (mobile UI)
- `client/src/components/Header.tsx` - 1 statement
- `client/src/components/ReCaptcha.tsx` - 1 statement
- `client/src/components/BulkImportDialog.tsx` - 1 statement
- `client/src/components/UniversityExport.tsx` - 1 statement
- `client/src/components/admin/PasswordResetDialog.tsx` - 1 statement

**Other Pages:**
- `client/src/pages/TeamDashboard.tsx` - 5 statements (team operations)
- `client/src/pages/StudentChat.tsx` - 1 statement (message reading)
- `client/src/pages/CounselorProfile.tsx` - 1 statement (profile updates)
- `client/src/pages/CompanyProfile.tsx` - 1 statement (profile updates)
- `client/src/pages/AdminProfile.tsx` - 1 statement (profile updates)
- `client/src/pages/Universities.tsx` - 1 statement (pagination)

### 1.2 Console Statement Types

**Distribution by Method:**
- `console.log` - ~180 statements (60%)
- `console.error` - ~70 statements (25%)
- `console.warn` - ~42 statements (15%)
- `console.info` - 0 statements
- `console.debug` - 0 statements

---

## 2. LOGGING REQUIREMENTS ANALYSIS

### 2.1 Classification by Purpose

#### **Security Audit Logs** (CRITICAL - Must preserve, sanitize)
- **Authentication events:** Login attempts, JWT verification failures
  - `server/middleware/authentication.ts`: User not found, unauthorized access
  - `server/middleware/error-handler.ts`: JWT verification failures
  - `server/index.ts`: JWT service initialization
  
- **CSRF protection:** Token validation, mismatches
  - `server/middleware/csrf.ts`: All 15 console statements track CSRF lifecycle
  - `client/src/pages/Auth.tsx`: CSRF token acquisition for registration
  
- **Security events:** Cooling period checks, admin actions
  - `server/middleware/security.ts`: User email exposure, cooling period logic
  - `server/services/domain/admin/company-admin.service.ts`: Password resets

**Required Log Level:** `warn` (security warnings), `info` (security audit trail)

#### **Error Handling** (CRITICAL - Production essential)
- **Unhandled errors:** Application crashes, database failures
  - `server/middleware/error-handler.ts`: Unhandled API errors with full context
  - `client/src/components/ErrorBoundary.tsx`: React error boundary catches
  - `server/index.ts`: Startup failures (admin creation, DI container, JWT)

- **Service failures:** Database connections, external APIs
  - `server/middleware/error-handler.ts`: Database connection errors
  - `client/src/lib/api-client.ts`: Token storage failures, validation errors

**Required Log Level:** `error`

#### **Application Lifecycle** (Production monitoring)
- **Startup/shutdown:** Server initialization, configuration
  - `server/index.ts`: 19 statements for startup sequence, CORS config, feature flags
  - `server/admin-setup.ts`: Default admin creation
  - `server/setup-after-migration.ts`: Post-migration setup (33 statements)

- **Configuration:** Environment validation, feature toggles
  - `server/index.ts`: CORS validation, HTTPS warnings, production monitoring

**Required Log Level:** `info`

#### **Business Operations** (Audit trail)
- **User registration:** New accounts, staff invitations
  - `server/services/domain/registration.service.ts`: Staff member registration
  - `server/services/domain/temporaryPassword.service.ts`: Temp password generation

- **Admin actions:** Password resets, security bypasses
  - `server/services/domain/admin/company-admin.service.ts`: Admin password resets
  - `server/middleware/security.ts`: Cooling period bypasses

- **Data operations:** Imports, exports, seeding
  - `server/services/domain/university.service.ts`: University import failures
  - `server/seed-data.ts`: Sample data seeding (8 statements)

**Required Log Level:** `info` (successful operations), `warn` (failures)

#### **Performance Monitoring** (Production optimization)
- **Slow requests:** Response time tracking
  - `server/middleware/performanceMonitor.ts`: Requests exceeding threshold
  
- **WebSocket monitoring:** Connection counts, peak usage
  - `server/services/infrastructure/websocket.ts`: Active connections (every 30s)

- **Metrics:** System health, API compliance
  - `server/controllers/systemMetrics.controller.ts`: System metrics
  - `server/middleware/production-monitor.ts`: Production compliance

**Required Log Level:** `debug` (detailed), `info` (summaries)

#### **Development Debugging** (Remove from production)
- **UI state changes:** Mobile tabs, modal states
  - `client/src/pages/Community.tsx`: 16 statements for mobile debugging
  - `client/src/pages/AdminDashboard.tsx`: 13 statements for admin UI debugging

- **Data flow:** API responses, state updates
  - `client/src/pages/TeamDashboard.tsx`: Placeholder operations (5 statements)
  - `client/src/pages/AdminDashboard.tsx`: Mutation debugging

- **Component lifecycle:** Render tracking, prop changes
  - `client/src/pages/Community.tsx`: Tab initialization, post filtering

**Action:** Remove or convert to `logger.debug()` with environment check

#### **Test Output** (Test-only)
- **Test cleanup:** Database cleanup errors
  - All `__tests__` files: Cleanup failure logging
  
- **Test mocking:** Console warning suppression
  - `server/middleware/__tests__/csrf.test.ts`: Mock console.warn

**Action:** Keep as-is or convert to test logger (separate from production)

### 2.2 Sensitive Data Exposure Analysis

#### **CRITICAL - Immediate Security Risks**

**1. User Email Exposure** (PII violation)
- **Location:** `server/middleware/security.ts:74`
  ```typescript
  console.log("🔍 Checking cooling period for user:", user.email, "userType:", user.userType);
  ```
- **Risk:** HIGH - Logs personal identifiable information (email addresses)
- **Impact:** GDPR/privacy violation, security audit failure
- **Fix:** Redact email (show only first char + domain) or use user ID

**2. Session ID Partial Exposure**
- **Location:** `server/middleware/csrf.ts:396,412`
  ```typescript
  console.warn(`🔒 CSRF validation failed: Invalid signature or session mismatch (session: ${sessionId.substring(0, 8)}...)`);
  console.log(`🔒 CSRF validation successful for session: ${sessionId.substring(0, 8)}...`);
  ```
- **Risk:** MEDIUM - Partial session IDs could aid session enumeration attacks
- **Impact:** Session hijacking vulnerability if logs are compromised
- **Fix:** Replace with session hash or omit entirely

**3. Full Request Context in Errors**
- **Location:** `server/middleware/error-handler.ts:238-246`
  ```typescript
  console.error('🚨 Unhandled error in API:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    headers: req.headers,  // ⚠️ May contain Authorization tokens
    body: req.body,        // ⚠️ May contain passwords
    user: (req as any).user?.id || 'anonymous'
  });
  ```
- **Risk:** CRITICAL - Logs may contain passwords, tokens, credit cards
- **Impact:** Credential leakage if logs are stolen or improperly stored
- **Fix:** Sanitize headers (redact Authorization), sanitize body (redact password fields)

**4. CSRF Token Exposure**
- **Location:** `server/middleware/csrf.ts` (multiple locations)
- **Risk:** MEDIUM - Token values logged during validation
- **Impact:** CSRF bypass if logs are compromised
- **Fix:** Log only token presence (true/false), not actual values

**5. JWT Service Logging**
- **Location:** `server/security/jwtService.ts`
- **Risk:** MEDIUM - May log token-related information
- **Impact:** Token compromise
- **Fix:** Review and sanitize token logging

#### **MEDIUM - Data Privacy Concerns**

**6. User Identification in Warnings**
- **Location:** `server/middleware/authentication.ts:75,114,121`
  ```typescript
  console.warn(`User not found for token: ${userId}`);
  console.warn(`Unauthorized access attempt: ${user.email} (${user.userType}) - Required: ${rules.userTypes.join('|')}`);
  ```
- **Risk:** MEDIUM - Logs user emails during failed auth attempts
- **Impact:** User enumeration, privacy violation
- **Fix:** Use user IDs instead of emails

**7. Admin Credentials**
- **Location:** `server/admin-setup.ts:29-31`
  ```typescript
  console.log("Default admin user created:");
  console.log("Email:", adminEmail);
  console.log("Please check the temporary password and change it after first login!");
  ```
- **Risk:** LOW - Logs admin email (not password, which is good)
- **Impact:** Information disclosure if logs accessible
- **Fix:** Reduce verbosity in production

**8. WebSocket User Authentication**
- **Location:** `server/services/infrastructure/websocket.ts:118`
  ```typescript
  console.log(`🔐 User authenticated via JWT: ${payload.userId}`);
  ```
- **Risk:** LOW - Logs user IDs during WebSocket auth
- **Impact:** User activity tracking via logs
- **Fix:** Acceptable if using user IDs (not emails)

#### **LOW - Informational**

**9. Business Operations**
- **Location:** `server/services/domain/registration.service.ts:239`
  ```typescript
  console.log(`👤 New staff member registered: ${email} (${teamRole}) via invite token`);
  ```
- **Risk:** LOW - Logs business events with emails
- **Impact:** Audit trail (beneficial), but contains PII
- **Fix:** Consider using user IDs for compliance

**10. Client-Side Debugging**
- **Location:** `client/src/pages/` (various)
- **Risk:** NEGLIGIBLE - Client-side logs visible only in browser console
- **Impact:** No server-side exposure
- **Fix:** Remove or make development-only

### 2.3 Production vs Development Logging

#### **Production-Critical (Must retain):**
1. Startup/shutdown logs (`server/index.ts`)
2. Error handling logs (`server/middleware/error-handler.ts`)
3. Security audit logs (`server/middleware/security.ts`, `csrf.ts`, `authentication.ts`)
4. Business operation logs (registration, password resets)
5. Performance monitoring (`performanceMonitor.ts`, `production-monitor.ts`)
6. WebSocket connection tracking (`websocket.ts`)

#### **Development-Only (Remove or disable in production):**
1. UI debugging (`client/src/pages/Community.tsx`, `AdminDashboard.tsx`)
2. State change tracking (mobile tabs, modal visibility)
3. Mutation debugging (`AdminDashboard.tsx` optimistic updates)
4. CORS debugging (`server/index.ts` - development mode only)
5. Request/response logging (`server/index.ts` - already has isDev check ✅)

#### **Test-Only (Keep separate):**
1. All `__tests__` files
2. Test cleanup logs
3. Mock console usage

---

## 3. CURRENT ARCHITECTURE ASSESSMENT

### 3.1 Existing Infrastructure

#### **Error Handling (Strong foundation ✅)**
- **Centralized error handler:** `server/middleware/error-handler.ts`
  - Well-structured `HttpError` class
  - Consistent error response format via `sendError()` utility
  - Pattern-based error matching
  - **Integration opportunity:** Perfect place to inject Winston logger

- **Response utilities:** `server/utils/response.ts`
  - Standardized success/error responses
  - Type-safe error codes
  - **Integration opportunity:** Add logging to `sendError()` function

#### **Middleware Architecture (Good structure ✅)**
- **Request lifecycle tracking:** `server/index.ts` lines 56-103
  - Already captures request metadata (method, path, duration, CORS headers)
  - Response interception for logging
  - Development-only filtering
  - **Integration opportunity:** Replace `log()` function with Winston

- **Performance monitoring:** `server/middleware/performanceMonitor.ts`
  - Tracks slow requests
  - Maintains metrics
  - **Integration opportunity:** Integrate with Winston for structured metrics

#### **Service Architecture (DI Container ✅)**
- **Dependency injection:** `server/services/container.ts`
  - Centralized service initialization
  - **Integration opportunity:** Register Winston logger as singleton service

- **Base service class:** `server/services/base.service.ts`
  - Shared functionality for all services
  - **Integration opportunity:** Add protected `logger` property

#### **Logging Utilities (Minimal)**
- **Vite logger:** `server/vite.ts` exports `log()` function
  - Basic console wrapper for dev server
  - **Replacement opportunity:** Replace with Winston logger

### 3.2 Environment Variable Usage

**Current environment-based logging:**
- `process.env.NODE_ENV` - Used for development/production checks
- `process.env.ADMIN_IPS` - Admin IP whitelisting (security.ts)
- `process.env.CORS_ENABLED` - CORS logging control
- `process.env.DISABLE_DEV_FEATURES` - Development feature toggle
- `process.env.ALLOW_DEV_MIDDLEWARE` - Development middleware toggle

**Recommended Winston environment variables:**
```bash
LOG_LEVEL=info                    # info, warn, error, debug
LOG_FORMAT=json                   # json, pretty
LOG_FILE_ENABLED=true            # Enable file transport
LOG_FILE_PATH=/var/log/edupath   # Log file directory
LOG_CONSOLE_ENABLED=true         # Enable console transport
LOG_SANITIZE_ENABLED=true        # Enable sensitive data redaction
LOG_MAX_FILE_SIZE=10485760       # 10MB
LOG_MAX_FILES=7                  # 7 days retention
```

### 3.3 Directory Structure (Logger placement)

**Recommended structure:**
```
server/
├── utils/
│   ├── logger.ts              # NEW - Winston logger singleton
│   ├── logger-config.ts       # NEW - Winston configuration
│   ├── logger-sanitizers.ts   # NEW - Sensitive data redaction
│   └── response.ts            # MODIFY - Integrate logger
├── middleware/
│   ├── error-handler.ts       # MODIFY - Use logger instead of console
│   ├── security.ts            # MODIFY - Use logger with sanitization
│   ├── csrf.ts                # MODIFY - Use logger with sanitization
│   └── request-logger.ts      # NEW - Dedicated HTTP request logger
├── services/
│   ├── container.ts           # MODIFY - Register logger service
│   └── base.service.ts        # MODIFY - Add logger property
└── index.ts                   # MODIFY - Initialize logger early
```

---

## 4. WINSTON IMPLEMENTATION PLANNING

### 4.1 Winston Configuration Design

#### **Log Levels Strategy**
```typescript
const levels = {
  error: 0,   // Application errors, crashes, failures
  warn: 1,    // Security warnings, validation failures, deprecations
  info: 2,    // Business events, startup, lifecycle, audit trail
  http: 3,    // HTTP requests/responses (custom level)
  debug: 4,   // Detailed debugging (development only)
};
```

#### **Transport Configuration**

**Production:**
```typescript
transports: [
  // Console (JSON format for log aggregation systems)
  new winston.transports.Console({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    )
  }),
  
  // File - Combined logs
  new winston.transports.File({
    filename: 'logs/combined.log',
    level: 'info',
    maxsize: 10485760, // 10MB
    maxFiles: 7,       // 7 days
    tailable: true,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  
  // File - Error logs only
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 10485760,
    maxFiles: 14, // 14 days for errors
    tailable: true,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    )
  })
]
```

**Development:**
```typescript
transports: [
  new winston.transports.Console({
    level: 'debug',
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    )
  })
]
```

#### **Metadata Structure**
```typescript
interface LogMetadata {
  // Request context (for HTTP logs)
  requestId?: string;
  userId?: string;
  userType?: string;
  ip?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  
  // Error context
  errorCode?: string;
  errorStack?: string;
  
  // Business context
  action?: string;
  resource?: string;
  resourceId?: string;
  
  // Custom fields
  [key: string]: any;
}
```

### 4.2 Logger Utility Structure

#### **Option 1: Single Logger (Recommended)**
**Pros:**
- Simple to use
- Easy to configure
- Consistent log format
- Lower maintenance

**Cons:**
- Less granular control
- Cannot filter by category easily

**Implementation:**
```typescript
// server/utils/logger.ts
import winston from 'winston';
import { sanitizeLogData } from './logger-sanitizers';

export const logger = winston.createLogger({
  // Configuration...
});

export default logger;
```

**Usage:**
```typescript
import logger from '@/utils/logger';
logger.info('User registered', { userId: user.id, action: 'registration' });
```

#### **Option 2: Category-based Loggers**
**Pros:**
- Fine-grained control per category
- Can set different levels per module
- Better for large applications
- Easier to filter in log aggregation

**Cons:**
- More complex setup
- Requires consistent category naming
- Slightly more overhead

**Implementation:**
```typescript
// server/utils/logger.ts
export const getLogger = (category: string) => {
  return winston.createLogger({
    defaultMeta: { category },
    // Configuration...
  });
};

export const httpLogger = getLogger('http');
export const securityLogger = getLogger('security');
export const dbLogger = getLogger('database');
```

**Usage:**
```typescript
import { securityLogger } from '@/utils/logger';
securityLogger.warn('Failed login attempt', { userId: user.id });
```

**Recommendation:** Start with **Option 1** (single logger) for simplicity. Can evolve to category-based if needed later.

### 4.3 Sensitive Data Sanitization Strategy

#### **Redaction Rules**
```typescript
// server/utils/logger-sanitizers.ts

const SENSITIVE_FIELDS = [
  'password',
  'passwordConfirm', 
  'currentPassword',
  'newPassword',
  'token',
  'accessToken',
  'refreshToken',
  'csrfToken',
  'authorization',
  'cookie',
  'creditCard',
  'cvv',
  'ssn'
];

const EMAIL_REGEX = /^(.)[^@]*(.@.*)$/;

export function sanitizeLogData(data: any): any {
  if (typeof data !== 'object' || data === null) return data;
  
  const sanitized = { ...data };
  
  // Redact sensitive fields
  for (const field of SENSITIVE_FIELDS) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  // Mask email addresses (keep first char + domain)
  if (sanitized.email && typeof sanitized.email === 'string') {
    sanitized.email = sanitized.email.replace(EMAIL_REGEX, '$1***$2');
  }
  
  // Redact Authorization headers
  if (sanitized.headers?.authorization) {
    sanitized.headers.authorization = 'Bearer [REDACTED]';
  }
  
  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }
  
  return sanitized;
}
```

#### **Usage Pattern**
```typescript
// BEFORE (unsafe)
logger.error('Login failed', { user, password, headers: req.headers });

// AFTER (safe)
logger.error('Login failed', sanitizeLogData({ user, password, headers: req.headers }));
```

### 4.4 Client-Side Logging Strategy

#### **Option 1: Winston Browser (Not Recommended)**
**Pros:** Same API as server-side
**Cons:** 
- Large bundle size (~50KB)
- Limited browser transport options
- Overkill for client-side needs

#### **Option 2: Custom Client Logger (Recommended)**
**Pros:**
- Lightweight (<5KB)
- Browser-optimized
- Can send to server endpoint
- Better performance

**Implementation:**
```typescript
// client/src/utils/logger.ts
class ClientLogger {
  private enabled = import.meta.env.DEV;
  
  debug(message: string, ...args: any[]) {
    if (this.enabled) console.log(`[DEBUG] ${message}`, ...args);
  }
  
  info(message: string, ...args: any[]) {
    if (this.enabled) console.info(`[INFO] ${message}`, ...args);
  }
  
  warn(message: string, ...args: any[]) {
    console.warn(`[WARN] ${message}`, ...args);
  }
  
  error(message: string, ...args: any[]) {
    console.error(`[ERROR] ${message}`, ...args);
    // Optional: Send to server
    this.sendToServer('error', message, args);
  }
  
  private async sendToServer(level: string, message: string, data: any[]) {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, message, data, timestamp: new Date() })
      });
    } catch {
      // Fail silently
    }
  }
}

export const logger = new ClientLogger();
```

**Strategy:**
- Development: Log to browser console with prefixes
- Production: Suppress `debug`/`info`, only log `warn`/`error`
- Optional: Send critical errors to server endpoint for centralized tracking

#### **Option 3: Remove Client Logging (Minimal)**
**Approach:**
- Remove all debugging console statements from client code
- Keep only error boundary logging
- Use browser DevTools for debugging instead

**Recommendation:** **Option 2** (Custom Client Logger) - provides control without bloat

---

## 5. PHASED IMPLEMENTATION PLAN

### PHASE 1: Foundation & Critical Security Fixes

**Objective:** Establish Winston infrastructure and fix critical security vulnerabilities

**Timeline:** 2-3 days

#### Step 1.1: Install Dependencies
```bash
npm install winston winston-daily-rotate-file
npm install --save-dev @types/winston
```

#### Step 1.2: Create Logger Infrastructure
**Files to create:**
- `server/utils/logger.ts` - Winston logger singleton
- `server/utils/logger-config.ts` - Environment-based configuration
- `server/utils/logger-sanitizers.ts` - Sensitive data redaction

**Tasks:**
1. Create basic Winston logger with console + file transports
2. Implement environment-based configuration (LOG_LEVEL, LOG_FORMAT)
3. Implement sensitive data sanitization functions
4. Add request ID generation middleware for tracing
5. Write unit tests for sanitization functions

**Deliverables:**
```typescript
// Export ready-to-use logger
export default logger;

// Export sanitization utilities
export { sanitizeLogData, sanitizeHeaders, maskEmail };
```

#### Step 1.3: Fix Critical Security Logs (Immediate)
**Priority order:**

**1. Fix error-handler.ts (CRITICAL - credential exposure)**
```typescript
// BEFORE
console.error('🚨 Unhandled error in API:', {
  headers: req.headers,  // Contains Authorization token
  body: req.body         // May contain passwords
});

// AFTER
logger.error('Unhandled error in API', sanitizeLogData({
  message: err.message,
  stack: err.stack,
  method: req.method,
  url: req.url,
  headers: sanitizeHeaders(req.headers),
  body: sanitizeBody(req.body),
  userId: req.user?.id || 'anonymous'
}));
```

**2. Fix security.ts (CRITICAL - email exposure)**
```typescript
// BEFORE
console.log("🔍 Checking cooling period for user:", user.email, "userType:", user.userType);

// AFTER
logger.info('Checking cooling period', {
  userId: user.id,
  userType: user.userType,
  accountAge: accountAge / 1000 / 60,
  coolingPeriod: coolingPeriod / 1000 / 60
});
```

**3. Fix csrf.ts (HIGH - token/session exposure)**
```typescript
// BEFORE
console.warn(`🔒 CSRF validation failed: Invalid signature or session mismatch (session: ${sessionId.substring(0, 8)}...)`);

// AFTER
logger.warn('CSRF validation failed', {
  reason: 'invalid_signature',
  sessionHash: createHash('sha256').update(sessionId).digest('hex').substring(0, 16)
});
```

**4. Fix authentication.ts (HIGH - user enumeration)**
```typescript
// BEFORE
console.warn(`Unauthorized access attempt: ${user.email} (${user.userType}) - Required: ${rules.userTypes.join('|')}`);

// AFTER
logger.warn('Unauthorized access attempt', {
  userId: user.id,
  userType: user.userType,
  requiredTypes: rules.userTypes
});
```

**Files to modify:**
- `server/middleware/error-handler.ts` (7 console → logger)
- `server/middleware/security.ts` (10 console → logger with sanitization)
- `server/middleware/csrf.ts` (15 console → logger with redaction)
- `server/middleware/authentication.ts` (4 console → logger)

#### Step 1.4: Testing Strategy
**Unit tests:**
- Test sanitization functions with various inputs
- Test email masking
- Test header redaction
- Test nested object sanitization

**Integration tests:**
- Trigger authentication failures, verify no sensitive data in logs
- Trigger CSRF errors, verify session IDs redacted
- Trigger validation errors, verify request bodies sanitized

**Manual verification:**
1. Review log files for sensitive data
2. Grep logs for patterns: `password`, `@`, `Bearer`, `csrf-token`
3. Confirm no matches for actual sensitive values

#### Step 1.5: Rollback Strategy
**If issues arise:**
1. Feature flag: `ENABLE_WINSTON_LOGGER=false` to revert to console
2. Keep console statements commented out for 1 sprint
3. Git tag: `pre-winston-migration` for easy revert
4. Gradual rollout: Test in staging for 1 week before production

**Risk Assessment:**
- **Risk:** Logger initialization failure → app crash
  - **Mitigation:** Wrap logger creation in try-catch, fallback to console
- **Risk:** Over-sanitization → loss of debugging info
  - **Mitigation:** Test with real error scenarios, tune redaction rules
- **Risk:** Performance impact from file I/O
  - **Mitigation:** Use async file transport, monitor performance metrics

**Estimated Effort:** 16-20 hours (2-3 days)

---

### PHASE 2: Server-Side Migration (Production Code)

**Objective:** Migrate all production server-side logging to Winston

**Timeline:** 5-7 days

#### Step 2.1: Core Application Files (High Priority)

**Order of migration:**

**1. Server initialization (server/index.ts - 19 console statements)**
- **Why first:** Application entry point, critical startup logs
- **Approach:**
  ```typescript
  // Initialize logger BEFORE anything else
  import logger from './utils/logger';
  
  // Replace console.log/error/warn throughout
  logger.info('Starting application with validated security configuration');
  logger.info('CORS Configuration', { enabled: corsEnabled, origins: allowedOrigins });
  logger.error('Failed to create default admin', { error: error.message, stack: error.stack });
  ```
- **Testing:** Verify all startup logs appear in log files, no console output in production

**2. Error handling (server/middleware/error-handler.ts - ALREADY DONE in Phase 1)**

**3. Security & auth (ALREADY DONE in Phase 1)**

**4. Admin setup (server/admin-setup.ts - 5 statements)**
```typescript
logger.info('Admin user already exists', { email: sanitizeEmail(adminEmail) });
logger.info('Default admin user created', { 
  email: sanitizeEmail(adminEmail),
  action: 'admin_creation' 
});
logger.error('Error creating default admin', { error: error.message });
```

**Files:**
- ✅ `server/index.ts` (19 statements)
- ✅ `server/admin-setup.ts` (5 statements)
- ✅ `server/setup-after-migration.ts` (33 statements) - Consider making silent or debug-level
- ✅ `server/seed-data.ts` (8 statements) - Debug level
- ✅ `server/seed-subscription-plans.ts` (6 statements) - Debug level

#### Step 2.2: Infrastructure Services (Medium Priority)

**1. WebSocket service (server/services/infrastructure/websocket.ts - 9 statements)**
```typescript
logger.info('WebSocket connected', { 
  connectionId, 
  totalConnections: this.connections.size 
});
logger.debug('WebSocket monitoring', { 
  activeConnections,
  peak: Math.max(activeConnections, 0) 
});
logger.error('Invalid WebSocket message', { 
  connectionId, 
  error: error.message 
});
```

**2. Message Queue (server/services/infrastructure/messageQueue.ts - 9 statements)**

**3. WebSocket handlers (server/services/infrastructure/websocket-handlers.ts - 3 statements)**

**Files:**
- ✅ `server/services/infrastructure/websocket.ts` (9 statements)
- ✅ `server/services/infrastructure/messageQueue.ts` (9 statements)
- ✅ `server/services/infrastructure/websocket-handlers.ts` (3 statements)

#### Step 2.3: Middleware (Medium Priority)

**1. Performance monitor (server/middleware/performanceMonitor.ts - 2 statements)**
```typescript
logger.warn('Slow request detected', { 
  method: req.method, 
  path: req.path, 
  duration: responseTime,
  threshold: this.SLOW_REQUEST_THRESHOLD
});
logger.info('Performance metrics reset');
```

**2. Production monitor (server/middleware/production-monitor.ts - 1 statement)**
**3. Database health (server/middleware/database-health.ts - 1 statement)**

**Files:**
- ✅ `server/middleware/performanceMonitor.ts` (2 statements)
- ✅ `server/middleware/production-monitor.ts` (1 statement)
- ✅ `server/middleware/database-health.ts` (1 statement)

#### Step 2.4: Controllers (Low Priority)

**Files:**
- ✅ `server/controllers/systemMetrics.controller.ts` (5 statements)
- ✅ `server/controllers/chat.controller.ts` (4 statements)
- ✅ `server/controllers/admin.controller.ts` (2 statements)
- ✅ `server/controllers/counselor.controller.ts` (1 statement)
- ✅ `server/controllers/base.controller.ts` (1 statement)

**Approach:**
- Inject logger via DI container
- Use structured logging with metadata
- Log business operations at `info` level
- Log failures at `warn` level

#### Step 2.5: Domain Services (Low Priority)

**Files:**
- ✅ `server/services/domain/university.service.ts` (1 statement)
- ✅ `server/services/domain/registration.service.ts` (1 statement)
- ✅ `server/services/domain/temporaryPassword.service.ts` (1 statement)
- ✅ `server/services/domain/admin/company-admin.service.ts` (1 statement)
- ✅ `server/services/base.service.ts` (1 statement)

**Approach:**
- Add protected `logger` property to `BaseService`
- All services inherit logger access
- Consistent logging format across services

```typescript
// server/services/base.service.ts
export class BaseService {
  protected logger = logger; // Winston logger instance
}

// Usage in services
export class UniversityService extends BaseService {
  async importUniversities() {
    this.logger.error('Failed to import university', { 
      name: uni.name, 
      error: error.message 
    });
  }
}
```

#### Step 2.6: Security & Utilities

**Files:**
- ✅ `server/security/jwtService.ts` (4 statements)
- ✅ `server/utils/migration-helpers.ts` (3 statements)
- ✅ `server/routes/index.ts` (1 statement)
- ✅ `server/vite.ts` (1 statement - replace `log()` export)

#### Step 2.7: Integration with Response Utilities

**Modify server/utils/response.ts:**
```typescript
import logger from './logger';

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
  field?: string,
  hint?: string
) {
  // Log all errors automatically
  const logLevel = status >= 500 ? 'error' : 'warn';
  logger[logLevel]('API error', {
    status,
    code,
    message,
    details: sanitizeLogData(details),
    field,
    hint
  });
  
  // Send response...
}
```

#### Step 2.8: Testing Strategy (Phase 2)

**For each migrated file:**
1. **Unit tests:** Verify logger methods called with correct arguments
2. **Integration tests:** Trigger real scenarios, verify log output
3. **Manual testing:** Review log files for expected entries

**Example test:**
```typescript
import logger from '@/utils/logger';
import { jest } from '@jest/globals';

describe('WebSocket Service', () => {
  let loggerSpy: jest.SpyInstance;
  
  beforeEach(() => {
    loggerSpy = jest.spyOn(logger, 'info');
  });
  
  it('should log WebSocket connection', () => {
    // Trigger connection
    expect(loggerSpy).toHaveBeenCalledWith(
      'WebSocket connected',
      expect.objectContaining({ connectionId: expect.any(String) })
    );
  });
});
```

**Regression testing:**
- Run full test suite after each file migration
- Monitor for console.* calls in production build
- Check log file sizes and rotation

**Estimated Effort:** 32-40 hours (5-7 days)

---

### PHASE 3: Client-Side Strategy (Secondary Priority)

**Objective:** Clean up client-side logging, establish development-only strategy

**Timeline:** 2-3 days

#### Step 3.1: Create Custom Client Logger

**File:** `client/src/utils/logger.ts`

```typescript
const isDev = import.meta.env.DEV;

class ClientLogger {
  debug(message: string, meta?: any) {
    if (isDev) {
      console.log(`%c[DEBUG] ${message}`, 'color: #888', meta || '');
    }
  }
  
  info(message: string, meta?: any) {
    if (isDev) {
      console.info(`%c[INFO] ${message}`, 'color: #00f', meta || '');
    }
  }
  
  warn(message: string, meta?: any) {
    console.warn(`[WARN] ${message}`, meta || '');
  }
  
  error(message: string, meta?: any) {
    console.error(`[ERROR] ${message}`, meta || '');
    // Optional: Send to server
    if (!isDev && import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true') {
      this.reportToServer('error', message, meta);
    }
  }
  
  private async reportToServer(level: string, message: string, meta: any) {
    try {
      await fetch('/api/client-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          message,
          meta,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        })
      });
    } catch {
      // Fail silently - don't break app due to logging failure
    }
  }
}

export const logger = new ClientLogger();
export default logger;
```

#### Step 3.2: Migrate High-Concentration Files

**Priority order:**

**1. Community.tsx (16 statements - mostly debugging)**
```typescript
// BEFORE
console.log(`📱 [DEBUG] showCreatePost state changed to: ${showCreatePost}, isMobile: ${isMobile}`);
console.log(`🔄 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Loading posts for category:`, selectedCategory);

// AFTER
logger.debug('Create post modal state changed', { showCreatePost, isMobile });
logger.debug('Loading posts', { 
  device: isMobile ? 'mobile' : 'desktop',
  category: selectedCategory,
  search: debouncedSearchQuery
});
```

**Approach:**
- Replace mobile debugging logs → `logger.debug()` (auto-suppressed in prod)
- Replace error logs → `logger.error()` (always visible)
- Remove verbose render logs (use React DevTools instead)

**2. AdminDashboard.tsx (13 statements)**
```typescript
// BEFORE
console.log('Mutation starting:', settingKey, '=', settingValue);
console.error('Security setting update error:', error);

// AFTER
logger.debug('Security setting mutation starting', { settingKey, settingValue });
logger.error('Security setting update failed', { settingKey, error: error.message });
```

**3. Auth.tsx (6 statements - CSRF flow)**
```typescript
// BEFORE
console.log('🔒 Attempting to get CSRF token for student registration...');
console.error('🔒 Failed to get CSRF token for student registration');

// AFTER
logger.debug('Getting CSRF token for registration');
logger.error('Failed to get CSRF token', { context: 'student_registration' });
```

**Files to migrate:**
- ✅ `client/src/pages/Community.tsx` (16 statements)
- ✅ `client/src/pages/AdminDashboard.tsx` (13 statements)
- ✅ `client/src/pages/Auth.tsx` (6 statements)
- ✅ `client/src/main.tsx` (6 statements)
- ✅ `client/src/pages/TeamDashboard.tsx` (5 statements)
- ✅ `client/src/lib/api-client.ts` (5 statements - keep error logs)
- ✅ `client/src/hooks/useAuth.tsx` (3 statements)
- ✅ `client/src/components/ErrorBoundary.tsx` (3 statements - keep all)
- ✅ All remaining client files (1-2 statements each)

#### Step 3.3: Remove Unnecessary Debugging

**Categories to remove entirely:**
1. **UI state logging** - Use React DevTools
   - Tab changes, modal visibility, button clicks
   - Example: `console.log('📱 [MOBILE] Create First Post button clicked')`

2. **Render debugging** - Use React Profiler
   - Component render counts, prop logging
   - Example: `console.log('📱 [MOBILE RENDER] Rendering mobile view with ${posts.length} posts')`

3. **Data flow logging** - Use Redux DevTools or React Query DevTools
   - Optimistic updates, cache invalidation
   - Example: `console.log('Optimistically updating cache with:', updatedSettings)`

**Categories to keep:**
1. **Error logging** - Production errors need visibility
2. **API failures** - Network/auth errors
3. **Critical user actions** - Registration, login failures

#### Step 3.4: Optional Server Error Reporting

**Create endpoint:** `server/routes/client-logs.ts`
```typescript
import { Router } from 'express';
import logger from '../utils/logger';
import { requireAuth } from '../middleware/authentication';

const router = Router();

router.post('/client-logs', requireAuth, (req, res) => {
  const { level, message, meta, userAgent, url } = req.body;
  
  // Log with client-specific prefix
  logger[level](`[CLIENT] ${message}`, {
    userId: req.user?.id,
    userAgent,
    url,
    meta: sanitizeLogData(meta)
  });
  
  res.json({ success: true });
});

export default router;
```

**Benefits:**
- Centralized error tracking
- Correlate client errors with server logs
- Monitor production client issues

**Considerations:**
- Rate limit to prevent abuse
- Sanitize client data (users can send anything)
- Make optional via environment variable

#### Step 3.5: Testing Strategy (Phase 3)

**Development testing:**
1. Verify `logger.debug()` appears in dev console
2. Verify emojis/colors work
3. Test error reporting to server (if enabled)

**Production testing:**
1. Build production bundle: `npm run build`
2. Serve production build: `npm run preview`
3. Open browser console
4. Verify NO debug/info logs appear
5. Trigger error, verify it's logged
6. Check server logs for client errors (if reporting enabled)

**Bundle size check:**
```bash
npm run build
# Verify client logger adds <2KB to bundle
```

**Estimated Effort:** 12-16 hours (2-3 days)

---

### PHASE 4: Enhancement & Monitoring (Optional)

**Objective:** Advanced logging features for production monitoring

**Timeline:** 3-5 days (can be deferred)

#### Enhancement 4.1: Log Rotation & Retention

**Install:** `npm install winston-daily-rotate-file`

```typescript
import DailyRotateFile from 'winston-daily-rotate-file';

const rotatingFileTransport = new DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d', // Keep 14 days
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  )
});
```

**Benefits:**
- Automatic log rotation
- Compressed old logs
- Automatic cleanup

**Estimated effort:** 2 hours

#### Enhancement 4.2: Remote Logging (Production)

**Option A: CloudWatch Logs**
```bash
npm install winston-cloudwatch
```

```typescript
import WinstonCloudWatch from 'winston-cloudwatch';

const cloudwatchTransport = new WinstonCloudWatch({
  logGroupName: 'edupath-prod',
  logStreamName: `${process.env.NODE_ENV}-${new Date().toISOString().split('T')[0]}`,
  awsRegion: process.env.AWS_REGION,
  jsonMessage: true
});
```

**Option B: Logstash/ELK Stack**
```bash
npm install winston-logstash
```

**Option C: Datadog**
```bash
npm install winston-datadog
```

**Option D: Simple HTTP endpoint**
```typescript
import { HttpTransport } from 'winston-transport';

class RemoteLogTransport extends HttpTransport {
  async log(info: any, callback: () => void) {
    await fetch(process.env.LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(info)
    });
    callback();
  }
}
```

**Recommendation:** Start with file logs, add remote logging when scaling

**Estimated effort:** 4-8 hours (depends on service)

#### Enhancement 4.3: Log Correlation (Request Tracing)

**Add request ID middleware:**
```typescript
import { v4 as uuidv4 } from 'uuid';

app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});
```

**Use in logger:**
```typescript
logger.info('User login', {
  requestId: req.requestId,
  userId: user.id
});
```

**Benefits:**
- Trace requests across microservices
- Correlate client-server interactions
- Debug complex flows

**Estimated effort:** 2 hours

#### Enhancement 4.4: Structured Error Tracking

**Create error taxonomy:**
```typescript
enum ErrorCategory {
  AUTH = 'authentication',
  VALIDATION = 'validation',
  DATABASE = 'database',
  EXTERNAL_API = 'external_api',
  BUSINESS_LOGIC = 'business_logic',
  UNKNOWN = 'unknown'
}

logger.error('Database query failed', {
  category: ErrorCategory.DATABASE,
  operation: 'user_lookup',
  userId: userId,
  error: error.message,
  stack: error.stack
});
```

**Benefits:**
- Categorize errors for metrics
- Easy filtering in log analysis
- Better alerting rules

**Estimated effort:** 4 hours

#### Enhancement 4.5: Performance Metrics Integration

**Integrate with existing performance monitor:**
```typescript
// server/middleware/performanceMonitor.ts
export class PerformanceMonitor {
  logSlowRequest(req: Request, duration: number) {
    logger.warn('Slow request detected', {
      method: req.method,
      path: req.path,
      duration,
      threshold: this.SLOW_REQUEST_THRESHOLD,
      requestId: req.requestId,
      userId: req.user?.id
    });
  }
  
  logMetricsSummary() {
    logger.info('Performance metrics summary', {
      totalRequests: this.getTotalRequests(),
      averageResponseTime: this.getAverageResponseTime(),
      slowestEndpoints: this.getSlowestEndpoints(),
      errorRate: this.getErrorRate()
    });
  }
}
```

**Estimated effort:** 3 hours

#### Enhancement 4.6: Log Analysis & Alerting

**Setup log queries:**
```bash
# Find all authentication failures in last hour
grep -r '"level":"warn"' logs/ | grep '"category":"authentication"' | tail -100

# Count errors by category
jq -r 'select(.level == "error") | .category' logs/combined.log | sort | uniq -c

# Find slow requests
jq -r 'select(.duration > 1000) | "\(.method) \(.path) - \(.duration)ms"' logs/combined.log
```

**Setup alerts (example with simple script):**
```bash
#!/bin/bash
# alert-on-errors.sh

ERROR_COUNT=$(grep -c '"level":"error"' logs/combined.log)
if [ $ERROR_COUNT -gt 10 ]; then
  echo "High error rate detected: $ERROR_COUNT errors" | mail -s "EduPath Alert" admin@edupath.com
fi
```

**Estimated effort:** 4-6 hours

#### Enhancement 4.7: Log Sanitization Testing

**Automated tests:**
```typescript
describe('Log Sanitization', () => {
  it('should redact passwords from logs', () => {
    const data = { username: 'test', password: 'secret123' };
    const sanitized = sanitizeLogData(data);
    expect(sanitized.password).toBe('[REDACTED]');
  });
  
  it('should mask email addresses', () => {
    const data = { email: 'john.doe@example.com' };
    const sanitized = sanitizeLogData(data);
    expect(sanitized.email).toMatch(/^j\*\*\*@example\.com$/);
  });
  
  it('should redact Authorization headers', () => {
    const headers = { authorization: 'Bearer abc123' };
    const sanitized = sanitizeHeaders(headers);
    expect(sanitized.authorization).toBe('Bearer [REDACTED]');
  });
});
```

**Manual audit:**
```bash
# Search production logs for sensitive patterns
grep -r "password" logs/
grep -r "@.*\.com" logs/ | grep -v "\*\*\*"
grep -r "Bearer [^R]" logs/ # Find non-redacted tokens
```

**Estimated effort:** 3 hours

**Total Phase 4 Estimated Effort:** 24-32 hours (3-5 days)

---

## 6. RISK ASSESSMENT & MITIGATION

### 6.1 High Risks

**Risk 1: Logger initialization failure crashes application**
- **Impact:** High - App won't start
- **Likelihood:** Low - Winston is stable
- **Mitigation:**
  ```typescript
  let logger: winston.Logger;
  try {
    logger = createWinstonLogger();
  } catch (error) {
    console.error('Failed to initialize logger, falling back to console', error);
    logger = createConsoleLogger(); // Fallback
  }
  ```

**Risk 2: Over-sanitization removes useful debugging information**
- **Impact:** Medium - Harder to debug production issues
- **Likelihood:** Medium - Balance needed
- **Mitigation:**
  - Test sanitization with real error scenarios
  - Review sanitized logs before production deployment
  - Add opt-in "verbose mode" for temporary detailed logging
  - Keep original error stacks (they don't contain sensitive data)

**Risk 3: File I/O performance impact**
- **Impact:** Medium - Slower response times
- **Likelihood:** Low - Async transport mitigates this
- **Mitigation:**
  - Use async file transport (non-blocking)
  - Monitor application performance metrics before/after
  - Add file logging only to non-critical path (use console in critical sections)
  - Consider remote logging for production (offload I/O)

### 6.2 Medium Risks

**Risk 4: Disk space exhaustion from log files**
- **Impact:** High - Server crash
- **Likelihood:** Low - Log rotation prevents this
- **Mitigation:**
  - Implement log rotation from day 1
  - Set maxFiles and maxSize limits
  - Monitor disk usage with alerts
  - Use compressed archives

**Risk 5: Inconsistent logging patterns across team**
- **Impact:** Low - Hard to search logs
- **Likelihood:** High - Multiple developers
- **Mitigation:**
  - Create logging guidelines document
  - Add ESLint rule to ban console.*
  - Code review checklist for logging
  - Provide examples in documentation

**Risk 6: Test suite failures due to logger mocking**
- **Impact:** Medium - Broken CI/CD
- **Likelihood:** Medium - Tests may assert console output
- **Mitigation:**
  - Mock logger in test setup
  - Provide test-specific logger
  - Update test assertions to check logger calls
  - Example:
    ```typescript
    jest.mock('@/utils/logger');
    ```

### 6.3 Low Risks

**Risk 7: Client bundle size increase**
- **Impact:** Low - Custom logger is <5KB
- **Likelihood:** High - Any addition increases size
- **Mitigation:**
  - Use custom logger (not winston-browser)
  - Tree-shake unused code
  - Monitor bundle size in CI

**Risk 8: Timezone confusion in log timestamps**
- **Impact:** Low - Harder to correlate events
- **Likelihood:** Medium - Servers in different zones
- **Mitigation:**
  - Always log in UTC
  - Add timezone to log format
  - Document timezone in logging guidelines

---

## 7. ROLLBACK STRATEGY

### 7.1 Gradual Rollout Plan

**Stage 1: Canary Deployment (1-2 files)**
- Deploy winston to staging environment
- Migrate only `error-handler.ts` and `security.ts`
- Monitor for 3 days
- Verify logs are correct, no missing data

**Stage 2: Partial Rollout (critical middleware)**
- Migrate all Phase 1 files
- Deploy to staging
- Monitor for 1 week
- Load test to verify performance

**Stage 3: Full Server Rollout**
- Migrate all server files (Phase 2)
- Deploy to staging
- Monitor for 1 week
- Production deployment with feature flag

**Stage 4: Client Migration**
- Migrate client files (Phase 3)
- Deploy to staging
- Monitor for 3 days
- Production deployment

### 7.2 Feature Flag Implementation

```typescript
// server/utils/logger.ts
const USE_WINSTON = process.env.ENABLE_WINSTON_LOGGER !== 'false';

export function log(level: string, message: string, meta?: any) {
  if (USE_WINSTON) {
    logger[level](message, meta);
  } else {
    console[level](message, meta); // Fallback
  }
}
```

**Environment variable:**
```bash
ENABLE_WINSTON_LOGGER=true  # Use Winston
ENABLE_WINSTON_LOGGER=false # Revert to console
```

### 7.3 Revert Procedure

**If critical issues found:**
1. Set `ENABLE_WINSTON_LOGGER=false` in environment
2. Restart application
3. Monitor for stabilization
4. Investigate issue in staging environment
5. Fix and redeploy

**Git strategy:**
```bash
# Tag before migration
git tag -a pre-winston-migration -m "Before Winston logger migration"

# If revert needed
git revert <commit-hash> # Revert specific commits
# OR
git reset --hard pre-winston-migration # Full rollback (destructive)
```

### 7.4 Monitoring During Rollout

**Metrics to track:**
- Application response time (p50, p95, p99)
- Error rate (should not increase)
- Log file sizes (should be reasonable)
- Disk I/O (should not spike)
- Memory usage (winston has small overhead)

**Alerts to configure:**
- Response time > 2x baseline
- Error rate > 5% increase
- Disk space < 10%
- Log file size > 100MB

---

## 8. TESTING APPROACH

### 8.1 Unit Testing

**Logger utility tests:**
```typescript
// server/utils/__tests__/logger.test.ts
describe('Winston Logger', () => {
  it('should initialize without errors', () => {
    expect(() => createLogger()).not.toThrow();
  });
  
  it('should log to console in development', () => {
    process.env.NODE_ENV = 'development';
    const logger = createLogger();
    expect(logger.transports).toContainEqual(
      expect.objectContaining({ name: 'console' })
    );
  });
  
  it('should log to file in production', () => {
    process.env.NODE_ENV = 'production';
    const logger = createLogger();
    expect(logger.transports).toContainEqual(
      expect.objectContaining({ filename: expect.stringContaining('log') })
    );
  });
});
```

**Sanitization tests:**
```typescript
describe('sanitizeLogData', () => {
  it('should redact password fields', () => {
    const input = { username: 'test', password: 'secret' };
    const output = sanitizeLogData(input);
    expect(output.password).toBe('[REDACTED]');
    expect(output.username).toBe('test');
  });
  
  it('should mask email addresses', () => {
    const input = { email: 'john.doe@example.com' };
    const output = sanitizeLogData(input);
    expect(output.email).toMatch(/^j\*\*\*.*@example\.com$/);
  });
  
  it('should handle nested objects', () => {
    const input = { user: { email: 'test@test.com', password: '123' } };
    const output = sanitizeLogData(input);
    expect(output.user.password).toBe('[REDACTED]');
    expect(output.user.email).toContain('***');
  });
  
  it('should redact Authorization headers', () => {
    const headers = { authorization: 'Bearer token123', 'content-type': 'json' };
    const output = sanitizeHeaders(headers);
    expect(output.authorization).toBe('Bearer [REDACTED]');
    expect(output['content-type']).toBe('json');
  });
});
```

### 8.2 Integration Testing

**Middleware integration:**
```typescript
describe('Error Handler with Winston', () => {
  let loggerSpy: jest.SpyInstance;
  
  beforeEach(() => {
    loggerSpy = jest.spyOn(logger, 'error');
  });
  
  it('should log unhandled errors', async () => {
    const req = mockRequest();
    const res = mockResponse();
    const error = new Error('Test error');
    
    await errorHandler(error, req, res, jest.fn());
    
    expect(loggerSpy).toHaveBeenCalledWith(
      'Unhandled error in API',
      expect.objectContaining({
        message: 'Test error',
        url: req.url,
        method: req.method
      })
    );
  });
  
  it('should sanitize sensitive data in error logs', async () => {
    const req = mockRequest({ 
      headers: { authorization: 'Bearer secret' },
      body: { password: 'pass123' }
    });
    const res = mockResponse();
    const error = new Error('Auth error');
    
    await errorHandler(error, req, res, jest.fn());
    
    const logCall = loggerSpy.mock.calls[0][1];
    expect(logCall.headers.authorization).toBe('Bearer [REDACTED]');
    expect(logCall.body.password).toBe('[REDACTED]');
  });
});
```

### 8.3 End-to-End Testing

**Log file verification:**
```typescript
describe('Winston Logger E2E', () => {
  beforeAll(() => {
    // Clear log files
    fs.rmSync('logs', { recursive: true, force: true });
  });
  
  it('should write logs to file', async () => {
    logger.info('Test log entry');
    
    // Wait for async write
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const logContent = fs.readFileSync('logs/combined.log', 'utf-8');
    expect(logContent).toContain('Test log entry');
  });
  
  it('should rotate log files', async () => {
    // Generate large log volume
    for (let i = 0; i < 100000; i++) {
      logger.info('Log entry ' + i);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const files = fs.readdirSync('logs');
    expect(files.length).toBeGreaterThan(1); // Multiple log files
  });
});
```

### 8.4 Manual Testing Checklist

**Before production deployment:**
- [ ] Review log files in staging for 7 days
- [ ] Verify no sensitive data in logs (grep for emails, passwords, tokens)
- [ ] Check log rotation works correctly
- [ ] Verify log file sizes are reasonable
- [ ] Test error scenarios trigger correct log levels
- [ ] Verify production logs don't include debug statements
- [ ] Check client console in production build (should be minimal)
- [ ] Test log search/filtering tools work
- [ ] Verify alerts trigger for high error rates
- [ ] Check disk space monitoring works

---

## 9. SUCCESS CRITERIA

### 9.1 Functional Requirements

**Must have:**
- ✅ All production console statements migrated to Winston
- ✅ Sensitive data redacted from logs
- ✅ Log levels correctly assigned
- ✅ File rotation configured and working
- ✅ Error logs captured with full context
- ✅ No console.* calls in production code (except client errors)

**Should have:**
- ✅ Structured logging with metadata
- ✅ Request correlation via request IDs
- ✅ Performance impact < 5%
- ✅ Client error reporting (optional)
- ✅ Log search/query tools

**Nice to have:**
- ⭕ Remote logging integration
- ⭕ Real-time alerting
- ⭕ Log analytics dashboard
- ⭕ Error categorization and metrics

### 9.2 Performance Requirements

- Application response time increase < 5%
- Log file I/O does not block critical paths
- Memory overhead < 50MB
- Log files < 100MB per day (before rotation)

### 9.3 Security Requirements

- No passwords in logs
- No JWT tokens in logs
- No CSRF tokens in logs
- Email addresses masked or replaced with IDs
- Request bodies sanitized
- Authorization headers redacted

### 9.4 Operational Requirements

- Log rotation configured (daily or size-based)
- Retention period: 14 days for errors, 7 days for info
- Disk space monitoring enabled
- Automated cleanup working
- Rollback procedure tested

---

## 10. DOCUMENTATION DELIVERABLES

### 10.1 Developer Documentation

**File:** `docs/logging-guide.md`

**Contents:**
- How to use Winston logger
- Log levels and when to use them
- Sanitization best practices
- Examples for common scenarios
- Client vs server logging differences

### 10.2 Operations Guide

**File:** `docs/operations/logging.md`

**Contents:**
- Log file locations
- Rotation configuration
- How to search logs
- Alert configuration
- Troubleshooting common issues

### 10.3 Migration Changelog

**File:** `WINSTON_MIGRATION_CHANGELOG.md`

**Contents:**
- Phase completion dates
- Files migrated per phase
- Issues encountered and resolutions
- Performance metrics before/after
- Security audit results

---

## 11. TIMELINE SUMMARY

| Phase | Description | Duration | Effort (hours) |
|-------|-------------|----------|----------------|
| **Phase 1** | Foundation & Critical Security Fixes | 2-3 days | 16-20 |
| **Phase 2** | Server-Side Migration (Production) | 5-7 days | 32-40 |
| **Phase 3** | Client-Side Strategy | 2-3 days | 12-16 |
| **Phase 4** | Enhancement & Monitoring (Optional) | 3-5 days | 24-32 |
| **Total** | | **12-18 days** | **84-108 hours** |

**Recommended approach:**
- **Sprint 1:** Phase 1 (critical security fixes)
- **Sprint 2:** Phase 2 (server-side migration)
- **Sprint 3:** Phase 3 (client-side)
- **Sprint 4:** Phase 4 (enhancements) - can be deferred

---

## 12. TEAM RECOMMENDATIONS

### 12.1 Code Review Guidelines

**For every PR with logging changes:**
- [ ] Verify correct log level used
- [ ] Check for sensitive data exposure
- [ ] Ensure structured metadata included
- [ ] Confirm no console.* in production code
- [ ] Test with real error scenarios

### 12.2 ESLint Rule (Optional)

```javascript
// .eslintrc.js
rules: {
  'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
  // Or custom rule:
  'no-restricted-syntax': [
    'error',
    {
      selector: 'CallExpression[callee.object.name="console"]',
      message: 'Use logger from @/utils/logger instead of console'
    }
  ]
}
```

### 12.3 Pre-commit Hook

```bash
#!/bin/sh
# .husky/pre-commit

# Check for console.* in staged files
if git diff --cached --name-only | grep -E '\.(ts|tsx|js|jsx)$' | xargs grep -l 'console\.\(log\|error\|warn\)' > /dev/null; then
  echo "❌ Found console statements in staged files. Please use logger instead."
  exit 1
fi
```

---

## 13. OPEN QUESTIONS & DECISIONS NEEDED

### 13.1 Configuration Decisions

**Q1: Log retention period?**
- Option A: 7 days (minimize storage)
- Option B: 14 days (balance storage & debugging)
- Option C: 30 days (maximum debugging capability)
- **Recommendation:** 14 days for errors, 7 days for info

**Q2: Remote logging service?**
- Option A: None (file-based only)
- Option B: CloudWatch Logs
- Option C: Datadog
- Option D: Self-hosted ELK stack
- **Recommendation:** Start with file-based, add remote logging when scaling

**Q3: Client error reporting?**
- Option A: None (browser console only)
- Option B: Send to server endpoint
- Option C: Third-party service (Sentry, Bugsnag)
- **Recommendation:** Option B (server endpoint) for control

### 13.2 Technical Decisions

**Q4: Category-based loggers?**
- Option A: Single logger (simple)
- Option B: Category-based (granular control)
- **Recommendation:** Start with single logger, evolve if needed

**Q5: Log format?**
- Option A: JSON (for log aggregation)
- Option B: Pretty-print (human-readable)
- **Recommendation:** JSON for production, pretty-print for development

---

## 14. APPENDIX

### 14.1 File Checklist (Complete Migration)

**Server-side (70 files):**

**Critical (Phase 1):**
- [x] server/middleware/error-handler.ts
- [x] server/middleware/security.ts
- [x] server/middleware/csrf.ts
- [x] server/middleware/authentication.ts

**Phase 2 - Core:**
- [x] server/index.ts
- [x] server/admin-setup.ts
- [x] server/setup-after-migration.ts
- [x] server/seed-data.ts
- [x] server/seed-subscription-plans.ts
- [x] server/vite.ts

**Phase 2 - Infrastructure:**
- [x] server/services/infrastructure/websocket.ts
- [x] server/services/infrastructure/messageQueue.ts
- [x] server/services/infrastructure/websocket-handlers.ts

**Phase 2 - Middleware:**
- [x] server/middleware/performanceMonitor.ts
- [x] server/middleware/production-monitor.ts
- [x] server/middleware/database-health.ts

**Phase 2 - Controllers:**
- [x] server/controllers/systemMetrics.controller.ts
- [x] server/controllers/chat.controller.ts
- [x] server/controllers/admin.controller.ts
- [x] server/controllers/counselor.controller.ts
- [x] server/controllers/base.controller.ts

**Phase 2 - Services:**
- [x] server/services/domain/university.service.ts
- [x] server/services/domain/registration.service.ts
- [x] server/services/domain/temporaryPassword.service.ts
- [x] server/services/domain/admin/company-admin.service.ts
- [x] server/services/base.service.ts

**Phase 2 - Security & Utils:**
- [x] server/security/jwtService.ts
- [x] server/utils/migration-helpers.ts
- [x] server/routes/index.ts

**Test files (40+ files):**
- [ ] Handle separately - keep console or use test logger

**Client-side (23 files):**

**Phase 3 - High Priority:**
- [x] client/src/pages/Community.tsx
- [x] client/src/pages/AdminDashboard.tsx
- [x] client/src/pages/Auth.tsx
- [x] client/src/main.tsx

**Phase 3 - Medium Priority:**
- [x] client/src/pages/TeamDashboard.tsx
- [x] client/src/lib/api-client.ts
- [x] client/src/hooks/useAuth.tsx
- [x] client/src/hooks/useWebSocket.ts
- [x] client/src/components/ErrorBoundary.tsx

**Phase 3 - Low Priority:**
- [x] client/src/components/Navigation.tsx
- [x] client/src/components/ProtectedRoute.tsx
- [x] client/src/components/mobile/MobileCreatePostModal.tsx
- [x] client/src/pages/StudentChat.tsx
- [x] client/src/pages/CounselorProfile.tsx
- [x] client/src/pages/CompanyProfile.tsx
- [x] client/src/pages/AdminProfile.tsx
- [x] client/src/pages/Universities.tsx
- [x] client/src/lib/queryClient.ts
- [x] client/src/components/Header.tsx
- [x] client/src/components/ReCaptcha.tsx
- [x] client/src/components/BulkImportDialog.tsx
- [x] client/src/components/UniversityExport.tsx
- [x] client/src/components/admin/PasswordResetDialog.tsx

### 14.2 Quick Reference: Log Level Guide

| Level | When to Use | Examples |
|-------|-------------|----------|
| **error** | Application failures, crashes | Database connection lost, unhandled exceptions, service failures |
| **warn** | Recoverable issues, security warnings | Failed login attempts, deprecated API usage, invalid tokens, rate limiting |
| **info** | Important business events, lifecycle | User registration, admin actions, server startup, configuration changes |
| **http** | HTTP requests/responses (custom) | Request method/path/duration, response status |
| **debug** | Detailed debugging (dev only) | Variable values, function entry/exit, state changes |

### 14.3 Example Log Entries (Target Format)

**Error log:**
```json
{
  "level": "error",
  "message": "Database connection failed",
  "timestamp": "2025-10-22T10:30:00.000Z",
  "requestId": "req-abc123",
  "userId": "user-456",
  "error": {
    "code": "ECONNREFUSED",
    "message": "Connection refused",
    "stack": "Error: Connection refused\n  at ..."
  },
  "context": {
    "operation": "user_lookup",
    "database": "postgres"
  }
}
```

**Security warning:**
```json
{
  "level": "warn",
  "message": "Failed login attempt",
  "timestamp": "2025-10-22T10:30:00.000Z",
  "requestId": "req-def456",
  "userId": null,
  "context": {
    "email": "u***@example.com",
    "ip": "192.168.1.100",
    "reason": "invalid_credentials",
    "attemptCount": 3
  }
}
```

**Business event:**
```json
{
  "level": "info",
  "message": "User registered successfully",
  "timestamp": "2025-10-22T10:30:00.000Z",
  "requestId": "req-ghi789",
  "userId": "user-789",
  "context": {
    "userType": "student",
    "registrationMethod": "email",
    "action": "user_registration"
  }
}
```

---

## CONCLUSION

This migration plan provides a comprehensive roadmap for transitioning the EduPath application from unstructured console logging to a production-ready Winston logger system. The phased approach ensures:

1. **Immediate security fixes** (Phase 1) address critical data exposure risks
2. **Systematic server migration** (Phase 2) maintains stability and testability
3. **Clean client-side logging** (Phase 3) reduces noise and improves debugging
4. **Optional enhancements** (Phase 4) provide scalability for future growth

**Key Success Factors:**
- Gradual rollout with feature flags
- Comprehensive testing at each phase
- Sensitive data sanitization from day 1
- Clear rollback procedures
- Team education and documentation

**Next Steps:**
1. Review and approve this plan
2. Make configuration decisions (Q1-Q5)
3. Allocate development resources
4. Begin Phase 1 implementation

**Estimated Total Effort:** 12-18 days (84-108 hours) across 3-4 sprints

---

**Document Version:** 1.0  
**Last Updated:** October 22, 2025  
**Status:** Investigation Complete - Awaiting Approval for Implementation
