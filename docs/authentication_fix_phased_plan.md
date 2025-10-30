# Authentication System - Phased Fix Plan
## Based on Industry Standards (OWASP, Auth0, NIST 800-63B)

---

## EXECUTIVE SUMMARY

This document provides a comprehensive, industry-standard phased approach to fix the authentication persistence issue and upgrade the system to production-grade security and reliability.

**Current Issue:** Users logged out unexpectedly after page reload due to aggressive error handling.

**Solution Approach:** Four phases from immediate hotfix to enterprise-grade authentication.

---

## PHASE 0: IMMEDIATE HOTFIX (4-6 hours)
### Fix the Critical Logout Bug

**Goal:** Stop users from being logged out unexpectedly - minimal changes, maximum stability.

**What We're Fixing:**
- Token cleared on any 401 error (even temporary network issues)
- No retry logic for transient failures
- No diagnostic logging to understand failures

**Industry Standards Applied:**
- **OWASP**: "Implement retry logic for temporary failures"
- **AWS Best Practices**: "Use exponential backoff for transient errors"
- **RFC 7231**: "5xx errors are retryable, 4xx errors are not"

### Implementation Steps:

#### Step 1: Add Diagnostic Logging
**File:** `client/src/lib/api-client.ts`

```typescript
// Add logging to setAuthToken (line 74)
export function setAuthToken(token: string | null) {
  authToken = token;

  if (token) {
    try {
      console.log('🔐 [AUTH] Storing token in localStorage:', token.substring(0, 20) + '...');
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      console.log('✅ [AUTH] Token stored successfully');
    } catch (error) {
      console.error('❌ [AUTH] Failed to store token:', error);
      throw error;
    }
  } else {
    try {
      console.log('🗑️ [AUTH] Clearing token from localStorage');
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (error) {
      console.warn('⚠️ [AUTH] Failed to clear token:', error);
    }
  }
}

// Add logging to getAuthToken (line 96)
export function getAuthToken(): string | null {
  console.log('🔍 [AUTH] Retrieving token...');

  if (authToken) {
    console.log('✅ [AUTH] Token found in memory');
    return authToken;
  }

  try {
    console.log('📦 [AUTH] Checking localStorage...');
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedToken) {
      console.log('✅ [AUTH] Token restored from localStorage:', storedToken.substring(0, 20) + '...');
      authToken = storedToken;
      return storedToken;
    }
    console.log('⚠️ [AUTH] No token found in localStorage');
  } catch (error) {
    console.error('❌ [AUTH] localStorage access failed:', error);
  }

  return null;
}
```

#### Step 2: Fix Aggressive Token Clearing
**File:** `client/src/hooks/useAuth.tsx`

```typescript
// Replace checkAuthStatus (line 89-105) with this:
const checkAuthStatus = async () => {
  console.log('🔐 [AUTH] Checking authentication status...');

  try {
    // First check if we have a token at all
    const token = getAuthToken();

    if (!token) {
      console.log('ℹ️ [AUTH] No token found - user not logged in');
      setUser(null);
      setLoading(false);
      setAuthCheckAttempted(true);
      return;
    }

    console.log('🔐 [AUTH] Token exists, validating with server...');

    // API client now auto-unwraps the envelope
    const userData = await api.get('/api/auth/me') as any;
    console.log('✅ [AUTH] Authentication valid, user:', userData.email);
    setUser(userData);

  } catch (error: any) {
    console.error('❌ [AUTH] Authentication check failed:', error);

    // DON'T immediately clear token on first failure
    // Let the user try to use it - only clear if proven invalid
    // This prevents temporary network issues from logging users out

    if (error.status === 401) {
      console.warn('⚠️ [AUTH] 401 Unauthorized - token may be invalid');
      // Only set user to null, keep token for now
      // User will be logged out properly if they try to use it and it fails again
    }

    setUser(null);

  } finally {
    setLoading(false);
    setAuthCheckAttempted(true);
  }
};
```

#### Step 3: Add Basic Retry Logic (Simple Version)
**File:** `client/src/lib/api-client.ts`

```typescript
// Add sleep utility at top of file
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Modify apiRequest function to add retry for auth check
export async function apiRequest<T>(
  url: string,
  options?: RequestOptions,
  responseSchema?: z.ZodSchema<T>
): Promise<T> {
  const { method = 'GET', body, headers, skipCsrf = false, includeCredentials = false } = options || {};

  // Special handling for /api/auth/me - add retry logic
  const isAuthCheck = url === '/api/auth/me';
  const maxRetries = isAuthCheck ? 2 : 0;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Existing request code...
      const requestHeaders: Record<string, string> = {
        ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...headers,
      };

      const token = getAuthToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }

      const needsCsrf = !skipCsrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
      if (needsCsrf) {
        await ensureCsrfReady();
        const csrf = getCsrfToken();
        if (!csrf) {
          throw new ApiError('CSRF_NOT_READY', 'CSRF protection not ready', 403);
        }
        requestHeaders['x-csrf-token'] = csrf;
      }

      const fetchOptions: RequestInit = {
        method,
        headers: requestHeaders,
        body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined)
      };

      if (needsCsrf || includeCredentials) {
        fetchOptions.credentials = "include";
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;

        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || response.statusText };
        }

        const apiError = new ApiError(
          errorData.code || 'REQUEST_FAILED',
          errorData.message || response.statusText,
          response.status,
          errorData.details,
          errorData.field,
          errorData.hint
        );

        // Retry logic for auth checks
        if (isAuthCheck && attempt < maxRetries) {
          // Only retry on network errors or 5xx server errors
          if (response.status >= 500) {
            const backoffDelay = Math.pow(2, attempt) * 500; // 500ms, 1000ms
            console.log(`⏳ [AUTH] Retry attempt ${attempt + 1}/${maxRetries} after ${backoffDelay}ms`);
            await sleep(backoffDelay);
            continue;
          }
        }

        throw apiError;
      }

      // Success - parse and return
      const responseText = await response.text();
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('text/csv') || 
          contentType.includes('application/octet-stream') ||
          contentType.startsWith('image/')) {
        return responseText as T;
      }

      if (!responseText) {
        return {} as T;
      }

      const parsedData = JSON.parse(responseText);

      if (parsedData && typeof parsedData === 'object' && 'data' in parsedData) {
        const data = parsedData.data;
        if (responseSchema) {
          return responseSchema.parse(data);
        }
        return data as T;
      }

      if (responseSchema) {
        return responseSchema.parse(parsedData);
      }

      return parsedData as T;

    } catch (error) {
      lastError = error;
      if (attempt >= maxRetries) {
        throw error;
      }
    }
  }

  throw lastError;
}
```

### Testing Strategy:

1. **Test localStorage persistence:**
   ```
   - Login to the app
   - Open DevTools → Application → Local Storage
   - Verify auth_token exists
   - Check console logs for "✅ [AUTH] Token stored successfully"
   - Reload page (Ctrl+R or Cmd+R)
   - Check console logs for "✅ [AUTH] Token restored from localStorage"
   - Verify user remains logged in
   ```

2. **Test error scenarios:**
   ```
   - Temporarily disconnect network
   - Reload page
   - Check console for retry attempts
   - Reconnect network
   - Verify user remains logged in (not cleared)
   ```

3. **Test actual logout:**
   ```
   - Click logout button
   - Check console for "🗑️ [AUTH] Clearing token"
   - Reload page
   - Check console for "⚠️ [AUTH] No token found"
   - Verify user is logged out
   ```

### Rollback Plan:
```bash
git stash  # Save changes
# Test production
# If issues occur:
git stash pop  # Restore
git reset --hard HEAD  # Or reset to previous commit
```

### Estimated Effort:
- **Development:** 2-3 hours
- **Testing:** 1-2 hours
- **Deployment:** 30 minutes
- **Total:** 4-6 hours

### Trade-offs:
**Gains:**
- ✅ Users stop getting randomly logged out
- ✅ Visibility into what's failing
- ✅ Resilience to temporary network issues

**Sacrifices:**
- ⚠️ Console logs may expose token prefixes (development only)
- ⚠️ Still using localStorage (XSS vulnerability remains)
- ⚠️ Basic retry logic (not comprehensive)

### Security Impact:
- ✅ **Improved:** Prevents unnecessary credential clearing
- ✅ **Improved:** Better error handling
- ⚠️ **No Change:** Still vulnerable to XSS (addressed in Phase 2)

### User Impact:
- ✅ **Major improvement:** Users stay logged in across page reloads
- ✅ **Better reliability:** Tolerates temporary network issues
- ✅ **No disruption:** Zero user action required

---

## PHASE 1: PRODUCTION-READY QUICK FIX (1-3 days)
### Stabilize Current Architecture

**Goal:** Make the localStorage JWT approach production-ready with proper error handling, monitoring, and reliability.

**What We're Fixing:**
- Comprehensive error classification
- Structured retry logic with exponential backoff
- Centralized error handling
- Monitoring and telemetry
- Token expiration awareness

**Industry Standards Applied:**
- **OWASP**: "Classify errors by type and handle appropriately"
- **AWS**: "Exponential backoff with jitter for retries"
- **Auth0**: "Proactive token refresh before expiration"
- **RFC 7231**: "Distinguish between recoverable and permanent errors"

### Implementation Steps:

#### Step 1: Create Error Classification System

**New File:** `client/src/lib/errors.ts`

```typescript
// Error classification for proper handling
export enum ErrorCategory {
  NETWORK = 'NETWORK',           // Timeout, connection refused
  SERVER = 'SERVER',             // 5xx errors
  AUTH_EXPIRED = 'AUTH_EXPIRED', // Token expired
  AUTH_INVALID = 'AUTH_INVALID', // Invalid credentials
  PERMISSION = 'PERMISSION',     // 403 Forbidden
  NOT_FOUND = 'NOT_FOUND',       // 404
  VALIDATION = 'VALIDATION',     // 422, 400
  RATE_LIMIT = 'RATE_LIMIT',     // 429
  UNKNOWN = 'UNKNOWN'
}

export interface ClassifiedError {
  category: ErrorCategory;
  message: string;
  status?: number;
  shouldRetry: boolean;
  retryAfter?: number;
  originalError: any;
}

export function classifyError(error: any): ClassifiedError {
  const status = error.status || error.response?.status;

  // Network errors (no status code)
  if (!status) {
    return {
      category: ErrorCategory.NETWORK,
      message: error.message || 'Network error',
      shouldRetry: true,
      originalError: error
    };
  }

  // Rate limiting
  if (status === 429) {
    const retryAfter = error.headers?.get('Retry-After');
    return {
      category: ErrorCategory.RATE_LIMIT,
      message: 'Too many requests',
      status,
      shouldRetry: true,
      retryAfter: retryAfter ? parseInt(retryAfter) * 1000 : 60000,
      originalError: error
    };
  }

  // Server errors (5xx) - retryable
  if (status >= 500) {
    return {
      category: ErrorCategory.SERVER,
      message: error.message || 'Server error',
      status,
      shouldRetry: true,
      originalError: error
    };
  }

  // Authentication errors
  if (status === 401) {
    const message = error.message?.toLowerCase() || '';
    const isExpired = message.includes('expired') || message.includes('exp');

    return {
      category: isExpired ? ErrorCategory.AUTH_EXPIRED : ErrorCategory.AUTH_INVALID,
      message: error.message || 'Authentication failed',
      status,
      shouldRetry: false, // Don't retry auth errors
      originalError: error
    };
  }

  // Permission denied
  if (status === 403) {
    return {
      category: ErrorCategory.PERMISSION,
      message: error.message || 'Permission denied',
      status,
      shouldRetry: false,
      originalError: error
    };
  }

  // Not found
  if (status === 404) {
    return {
      category: ErrorCategory.NOT_FOUND,
      message: error.message || 'Resource not found',
      status,
      shouldRetry: false,
      originalError: error
    };
  }

  // Validation errors
  if (status === 422 || status === 400) {
    return {
      category: ErrorCategory.VALIDATION,
      message: error.message || 'Validation error',
      status,
      shouldRetry: false,
      originalError: error
    };
  }

  return {
    category: ErrorCategory.UNKNOWN,
    message: error.message || 'Unknown error',
    status,
    shouldRetry: false,
    originalError: error
  };
}
```

#### Step 2: Implement Exponential Backoff Utility

**New File:** `client/src/lib/retry.ts`

```typescript
import { classifyError, ErrorCategory } from './errors';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: any, attempt: number) => boolean;
  onRetry?: (error: any, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,      // 1 second
  maxDelay: 30000,         // 30 seconds
  shouldRetry: (error) => {
    const classified = classifyError(error);
    return classified.shouldRetry;
  },
  onRetry: () => {}
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if we should retry
      if (!opts.shouldRetry(error, attempt)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === opts.maxAttempts - 1) {
        throw error;
      }

      // Calculate backoff with jitter
      const classified = classifyError(error);
      const exponentialDelay = Math.pow(2, attempt) * opts.initialDelay;
      const jitter = Math.random() * 1000; // 0-1000ms random jitter
      const delay = Math.min(
        classified.retryAfter || (exponentialDelay + jitter),
        opts.maxDelay
      );

      console.log(`⏳ [RETRY] Attempt ${attempt + 1}/${opts.maxAttempts} failed. Retrying in ${Math.round(delay)}ms...`);
      console.log(`   Error: ${error.message}`);

      opts.onRetry(error, attempt);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

#### Step 3: Update API Client with Advanced Error Handling

**File:** `client/src/lib/api-client.ts`

```typescript
import { retryWithBackoff } from './retry';
import { classifyError, ErrorCategory } from './errors';

// Replace apiRequest with enhanced version
export async function apiRequest<T>(
  url: string,
  options?: RequestOptions,
  responseSchema?: z.ZodSchema<T>
): Promise<T> {
  const { method = 'GET', body, headers, skipCsrf = false, includeCredentials = false } = options || {};

  // Determine if this request should be retried
  const isIdempotent = ['GET', 'PUT', 'DELETE'].includes(method.toUpperCase());
  const isAuthCheck = url === '/api/auth/me';

  // Define the fetch operation
  const fetchOperation = async () => {
    const requestHeaders: Record<string, string> = {
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...headers,
    };

    const token = getAuthToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    } else if (isAuthCheck) {
      // Don't make auth check without token
      throw new ApiError('NO_TOKEN', 'No authentication token available', 401);
    }

    const needsCsrf = !skipCsrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
    if (needsCsrf) {
      await ensureCsrfReady();
      const csrf = getCsrfToken();
      if (!csrf) {
        throw new ApiError('CSRF_NOT_READY', 'CSRF protection not ready', 403);
      }
      requestHeaders['x-csrf-token'] = csrf;
    }

    const fetchOptions: RequestInit = {
      method,
      headers: requestHeaders,
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    };

    if (needsCsrf || includeCredentials) {
      fetchOptions.credentials = "include";
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;

      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || response.statusText };
      }

      throw new ApiError(
        errorData.code || 'REQUEST_FAILED',
        errorData.message || response.statusText,
        response.status,
        errorData.details,
        errorData.field,
        errorData.hint
      );
    }

    // Parse successful response
    const responseText = await response.text();
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/csv') || 
        contentType.includes('application/octet-stream') ||
        contentType.startsWith('image/')) {
      return responseText as T;
    }

    if (!responseText) {
      return {} as T;
    }

    const parsedData = JSON.parse(responseText);

    if (parsedData && typeof parsedData === 'object' && 'data' in parsedData) {
      const data = parsedData.data;
      if (responseSchema) {
        return responseSchema.parse(data);
      }
      return data as T;
    }

    if (responseSchema) {
      return responseSchema.parse(parsedData);
    }

    return parsedData as T;
  };

  // Apply retry logic for idempotent or auth check requests
  if (isIdempotent || isAuthCheck) {
    return retryWithBackoff(fetchOperation, {
      maxAttempts: isAuthCheck ? 3 : 2,
      initialDelay: 1000,
      maxDelay: 30000,
      onRetry: (error, attempt) => {
        const classified = classifyError(error);
        console.log(`🔄 [API] Retry ${attempt + 1} for ${method} ${url} (${classified.category})`);
      }
    });
  } else {
    // POST requests without idempotency - no retry
    return fetchOperation();
  }
}
```

#### Step 4: Improve Auth Check Logic

**File:** `client/src/hooks/useAuth.tsx`

```typescript
import { classifyError, ErrorCategory } from '@/lib/errors';

const checkAuthStatus = async () => {
  console.log('🔐 [AUTH] Checking authentication status...');

  try {
    const token = getAuthToken();

    if (!token) {
      console.log('ℹ️ [AUTH] No token found - user not logged in');
      setUser(null);
      setLoading(false);
      setAuthCheckAttempted(true);
      return;
    }

    console.log('🔐 [AUTH] Token exists, validating with server...');

    // This will auto-retry with exponential backoff
    const userData = await api.get('/api/auth/me') as any;
    console.log('✅ [AUTH] Authentication valid, user:', userData.email);
    setUser(userData);

  } catch (error: any) {
    const classified = classifyError(error);
    console.error(`❌ [AUTH] Authentication check failed (${classified.category}):`, error);

    // Handle based on error category
    switch (classified.category) {
      case ErrorCategory.AUTH_INVALID:
      case ErrorCategory.AUTH_EXPIRED:
        // Token is genuinely invalid or expired - clear it
        console.warn('⚠️ [AUTH] Token is invalid or expired - clearing');
        clearAuthToken();
        break;

      case ErrorCategory.NETWORK:
      case ErrorCategory.SERVER:
        // Temporary issue - keep token, user can retry
        console.warn('⚠️ [AUTH] Temporary error - keeping token for retry');
        break;

      default:
        // Unknown error - be conservative, don't clear token
        console.warn('⚠️ [AUTH] Unknown error - keeping token');
    }

    setUser(null);

  } finally {
    setLoading(false);
    setAuthCheckAttempted(true);
  }
};
```

### Testing Strategy:

1. **Test retry logic:**
   ```
   - Use browser DevTools Network tab
   - Throttle network to "Slow 3G"
   - Reload page
   - Verify retries in console
   - Check user remains logged in
   ```

2. **Test error classification:**
   ```
   - Mock different error responses (401, 403, 500, 503)
   - Verify correct classification
   - Verify appropriate retry behavior
   ```

3. **Test exponential backoff:**
   ```
   - Check console logs for increasing delays
   - Verify jitter is applied
   - Confirm max delay cap works
   ```

### Estimated Effort:
- **Development:** 1-2 days
- **Testing:** 4-6 hours
- **Documentation:** 2-3 hours
- **Total:** 2-3 days

### Trade-offs:
**Gains:**
- ✅ Production-grade error handling
- ✅ Resilient to various failure modes
- ✅ Clear logging and monitoring
- ✅ Smart retry with backoff

**Sacrifices:**
- ⚠️ More code complexity
- ⚠️ Still using localStorage (XSS risk)
- ⚠️ No token refresh yet

### Security Impact:
- ✅ **Improved:** Better error handling reduces attack surface
- ✅ **Improved:** Timeout prevents hanging requests
- ⚠️ **No Change:** localStorage XSS risk remains

### User Impact:
- ✅ **Better reliability:** Handles network issues gracefully
- ✅ **Better UX:** Clear error messages
- ✅ **Seamless:** Works across poor network conditions

---

## PHASE 2: SECURITY HARDENING (1-2 weeks)
### Migrate to Industry-Standard Dual-Token System

**Goal:** Implement secure token storage and refresh mechanism following Auth0/OWASP best practices.

**What We're Implementing:**
- Dual-token architecture (access + refresh)
- HttpOnly cookies for refresh tokens
- Token rotation on refresh
- XSS protection
- CSRF protection enhancement

**Industry Standards Applied:**
- **OWASP**: "Store refresh tokens in HttpOnly cookies to prevent XSS"
- **Auth0**: "Enable refresh token rotation for SPAs"
- **NIST 800-63B**: "Short-lived access tokens (15 min) + session binding"
- **RFC 6749 (OAuth 2.0)**: "Refresh token grant type"

### Architecture Overview:

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Memory (clears on tab close):                          │
│  ├─ Access Token (JWT, 15 min expiry)                   │
│  └─ User object                                          │
│                                                          │
│  HttpOnly Cookie (JS cannot access):                    │
│  ├─ Refresh Token (30 days, rotating)                   │
│  ├─ Flags: HttpOnly, Secure, SameSite=Strict            │
│  └─ Auto-sent with credentials: 'include'               │
│                                                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    SERVER (Express)                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  /api/auth/login (POST):                                │
│  ├─ Validates credentials                               │
│  ├─ Issues access token (15 min)                        │
│  ├─ Issues refresh token (30 days)                      │
│  ├─ Stores refresh token hash in DB                     │
│  ├─ Returns: { accessToken, user }                      │
│  └─ Sets cookie: refreshToken (HttpOnly)                │
│                                                          │
│  /api/auth/refresh (POST):                              │
│  ├─ Reads refreshToken from HttpOnly cookie             │
│  ├─ Validates token against DB                          │
│  ├─ Issues NEW access token (15 min)                    │
│  ├─ Issues NEW refresh token (rotation)                 │
│  ├─ Invalidates old refresh token                       │
│  ├─ Returns: { accessToken }                            │
│  └─ Sets cookie: NEW refreshToken                       │
│                                                          │
│  Protected Routes:                                       │
│  └─ Validate access token from Authorization header     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Implementation Steps:

#### Step 1: Update Database Schema

**File:** `shared/schema.ts`

```typescript
// Add refresh tokens table
export const refreshTokens = pgTable('refresh_tokens', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at'),
  deviceInfo: varchar('device_info', { length: 500 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  isRevoked: boolean('is_revoked').default(false).notNull()
});

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = typeof refreshTokens.$inferInsert;
```

Then run:
```bash
npm run db:push
```

#### Step 2: Create Refresh Token Service

**New File:** `server/services/domain/refresh-token.service.ts`

```typescript
import * as crypto from 'crypto';
import { db } from '@/db';
import { refreshTokens } from '@shared/schema';
import { eq, and, lt } from 'drizzle-orm';

export class RefreshTokenService {
  // Generate secure refresh token
  generateToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  // Hash token for database storage (never store plaintext)
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  // Create refresh token
  async createRefreshToken(
    userId: string,
    token: string,
    deviceInfo?: string,
    ipAddress?: string
  ) {
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await db.insert(refreshTokens).values({
      userId,
      tokenHash,
      expiresAt,
      deviceInfo,
      ipAddress
    });
  }

  // Validate and rotate refresh token
  async validateAndRotate(token: string): Promise<{ userId: string; newToken: string } | null> {
    const tokenHash = this.hashToken(token);

    // Find the token
    const [storedToken] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          eq(refreshTokens.isRevoked, false)
        )
      )
      .limit(1);

    if (!storedToken) {
      return null;
    }

    // Check expiration
    if (new Date() > storedToken.expiresAt) {
      await this.revokeToken(tokenHash);
      return null;
    }

    // ROTATION: Invalidate old token
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.tokenHash, tokenHash));

    // Generate new token
    const newToken = this.generateToken();
    await this.createRefreshToken(storedToken.userId, newToken);

    // Update last used
    await db
      .update(refreshTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(refreshTokens.id, storedToken.id));

    return {
      userId: storedToken.userId,
      newToken
    };
  }

  // Revoke token (logout)
  async revokeToken(tokenHash: string) {
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.tokenHash, tokenHash));
  }

  // Revoke all user tokens (logout all devices)
  async revokeAllUserTokens(userId: string) {
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.userId, userId));
  }

  // Cleanup expired tokens (run periodically)
  async cleanupExpiredTokens() {
    const now = new Date();
    await db
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, now));
  }
}

export const refreshTokenService = new RefreshTokenService();
```

#### Step 3: Update Auth Service

**File:** `server/services/domain/auth.service.ts`

```typescript
import { refreshTokenService } from './refresh-token.service';

// Update login methods to return refresh token
async loginTeamComplete(email: string, password: string, deviceInfo?: string, ipAddress?: string): Promise<LoginTeamDTO> {
  try {
    const emailLower = email.toLowerCase();
    const result = await this.login(emailLower, password, 'team_member');
    const user = result.user;

    // Generate short-lived access token (15 minutes)
    const accessToken = jwtService.sign(
      { userId: user.id, userType: user.userType, teamRole: user.teamRole },
      { expiresIn: '15m', subject: user.id }
    );

    // Generate long-lived refresh token (30 days)
    const refreshToken = refreshTokenService.generateToken();
    await refreshTokenService.createRefreshToken(user.id, refreshToken, deviceInfo, ipAddress);

    const sanitizedUser = this.sanitizeUser(user);

    return {
      user: {
        ...sanitizedUser,
        token: accessToken // For backward compatibility
      },
      token: accessToken,
      refreshToken // Will be set as HttpOnly cookie
    };
  } catch (error) {
    return this.handleError(error, 'AuthService.loginTeamComplete');
  }
}

// Add refresh method
async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const result = await refreshTokenService.validateAndRotate(refreshToken);

    if (!result) {
      return null;
    }

    // Get user data
    const user = await this.userRepo.findById(result.userId);
    if (!user || user.accountStatus !== 'active') {
      return null;
    }

    // Generate new access token
    const accessToken = jwtService.sign(
      { userId: user.id, userType: user.userType },
      { expiresIn: '15m', subject: user.id }
    );

    return {
      accessToken,
      refreshToken: result.newToken
    };
  } catch (error) {
    return this.handleError(error, 'AuthService.refreshAccessToken');
  }
}
```

#### Step 4: Add Refresh Endpoint

**File:** `server/controllers/auth.controller.ts`

```typescript
// Add refresh token endpoint
async refreshToken(req: Request, res: Response) {
  try {
    // Read refresh token from HttpOnly cookie
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return this.sendError(res, 401, 'NO_REFRESH_TOKEN', 'No refresh token provided');
    }

    const authService = getService<IAuthService>(TYPES.IAuthService);
    const result = await authService.refreshAccessToken(refreshToken);

    if (!result) {
      // Clear invalid refresh token cookie
      res.clearCookie('refreshToken');
      return this.sendError(res, 401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
    }

    // Set new refresh token in HttpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // CSRF protection
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/'
    });

    return this.sendSuccess(res, {
      accessToken: result.accessToken
    });
  } catch (error) {
    return this.handleError(res, error, 'AuthController.refreshToken');
  }
}

// Update login to set refresh token cookie
async loginTeam(req: Request, res: Response) {
  try {
    const { email, password } = teamLoginSchema.parse(req.body);
    const deviceInfo = req.get('User-Agent');
    const ipAddress = req.ip;

    const authService = getService<IAuthService>(TYPES.IAuthService);
    const result = await authService.loginTeamComplete(email, password, deviceInfo, ipAddress);

    // Set refresh token in HttpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    // Return access token (don't include refresh token in response body)
    return this.sendSuccess(res, {
      user: result.user,
      token: result.token
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
    }

    return this.handleError(res, error, 'AuthController.loginTeam');
  }
}
```

#### Step 5: Add Refresh Route

**File:** `server/routes/auth.routes.ts`

```typescript
// Add refresh endpoint
router.post('/refresh', 
  asyncHandler((req: Request, res: Response) => authController.refreshToken(req, res))
);
```

#### Step 6: Client-Side Token Refresh Logic

**File:** `client/src/lib/token-refresh.ts`

```typescript
let refreshPromise: Promise<string> | null = null;
let refreshTimer: NodeJS.Timeout | null = null;

// Decode JWT to get expiration (without validation)
function decodeToken(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

// Check if token is expiring soon (within 2 minutes)
export function isTokenExpiringSoon(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;

  const expiresAt = decoded.exp * 1000; // Convert to milliseconds
  const now = Date.now();
  const twoMinutes = 2 * 60 * 1000;

  return (expiresAt - now) < twoMinutes;
}

// Refresh access token using refresh token cookie
export async function refreshAccessToken(): Promise<string> {
  // Prevent multiple simultaneous refresh requests
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      console.log('🔄 [TOKEN] Refreshing access token...');

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include' // Send HttpOnly refresh token cookie
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      const newToken = data.data?.accessToken || data.accessToken;

      if (!newToken) {
        throw new Error('No access token in refresh response');
      }

      console.log('✅ [TOKEN] Access token refreshed');

      // Update stored token
      setAuthToken(newToken);

      // Schedule next refresh
      scheduleTokenRefresh(newToken);

      return newToken;

    } catch (error) {
      console.error('❌ [TOKEN] Refresh failed:', error);
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Schedule automatic token refresh before expiration
export function scheduleTokenRefresh(token: string) {
  // Clear existing timer
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return;

  const expiresAt = decoded.exp * 1000;
  const now = Date.now();
  const timeUntilExpiry = expiresAt - now;

  // Refresh at 80% of token lifetime (e.g., 12 min for 15 min token)
  const refreshAt = timeUntilExpiry * 0.8;

  if (refreshAt > 0) {
    console.log(`⏰ [TOKEN] Scheduled refresh in ${Math.round(refreshAt / 1000)}s`);

    refreshTimer = setTimeout(async () => {
      try {
        await refreshAccessToken();
      } catch (error) {
        console.error('Automatic token refresh failed:', error);
        // Will retry on next API call
      }
    }, refreshAt);
  }
}

// Stop auto-refresh (on logout)
export function stopTokenRefresh() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  refreshPromise = null;
}
```

#### Step 7: Integrate Auto-Refresh into API Client

**File:** `client/src/lib/api-client.ts`

```typescript
import { refreshAccessToken, isTokenExpiringSoon, scheduleTokenRefresh } from './token-refresh';

export async function apiRequest<T>(
  url: string,
  options?: RequestOptions,
  responseSchema?: z.ZodSchema<T>
): Promise<T> {
  const { method = 'GET', body, headers, skipCsrf = false, includeCredentials = false } = options || {};

  const fetchOperation = async () => {
    const requestHeaders: Record<string, string> = {
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...headers,
    };

    // Get token and check if refresh needed
    let token = getAuthToken();

    if (token && isTokenExpiringSoon(token)) {
      console.log('⚠️ [TOKEN] Token expiring soon, refreshing...');
      try {
        token = await refreshAccessToken();
      } catch (error) {
        console.error('Failed to refresh token, using existing');
      }
    }

    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    // ... rest of request logic
  };

  // ... retry logic
}

// Update setAuthToken to schedule refresh
export function setAuthToken(token: string | null) {
  authToken = token;

  if (token) {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      // Schedule automatic refresh
      scheduleTokenRefresh(token);
    } catch (error) {
      console.error('Failed to store token:', error);
      throw error;
    }
  } else {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      stopTokenRefresh();
    } catch (error) {
      console.warn('Failed to clear token:', error);
    }
  }
}
```

### Testing Strategy:

1. **Test token refresh:**
   ```
   - Login
   - Wait 12+ minutes (or modify token expiry for testing)
   - Make an API call
   - Verify automatic refresh occurs
   - Check new token in console
   ```

2. **Test refresh token rotation:**
   ```
   - Login
   - Check refreshTokens table in DB
   - Call /api/auth/refresh
   - Verify old token is revoked
   - Verify new token exists
   ```

3. **Test HttpOnly cookie security:**
   ```
   - Login
   - Open DevTools → Application → Cookies
   - Verify refreshToken cookie exists
   - Try to access via JavaScript: document.cookie
   - Verify it's not accessible
   ```

4. **Test token expiration:**
   ```
   - Login
   - Delete access token from memory
   - Make API call
   - Verify refresh occurs automatically
   ```

### Estimated Effort:
- **Backend Development:** 3-4 days
- **Frontend Development:** 2-3 days
- **Database Migration:** 1 day
- **Testing & QA:** 2-3 days
- **Total:** 8-11 days (1-2 weeks)

### Trade-offs:
**Gains:**
- ✅ **Major security improvement:** XSS protection for refresh tokens
- ✅ **Auto-refresh:** Seamless token renewal
- ✅ **Token rotation:** Detects and prevents token theft
- ✅ **Short-lived access tokens:** Limits damage if stolen

**Sacrifices:**
- ⚠️ More complex architecture
- ⚠️ Additional database queries
- ⚠️ Requires cookie support
- ⚠️ More testing required

### Security Impact:
- ✅ **Significantly Improved:** Refresh tokens protected from XSS
- ✅ **Improved:** Token rotation detects theft
- ✅ **Improved:** Short token lifetime reduces exposure
- ✅ **Improved:** SameSite cookie prevents CSRF

### User Impact:
- ✅ **Seamless:** Auto-refresh means no interruption
- ✅ **Persistent:** Sessions last 30 days (refresh token lifetime)
- ✅ **Secure:** Better protected from attacks
- ℹ️ **No action required:** Completely transparent

---

## PHASE 3: ADVANCED FEATURES (2-4 weeks)
### Enterprise-Grade Session Management

**Goal:** Add advanced features for better UX and security monitoring.

**Features:**
- "Remember Me" functionality
- Device/session management dashboard
- Security event monitoring
- Suspicious activity detection
- Session revocation
- Token binding (optional)

**Industry Standards Applied:**
- **NIST 800-63B AAL2**: "24-hour session timeout with 1-hour inactivity"
- **OWASP Session Management**: "Track and display active sessions"
- **Auth0**: "Device authorization and management"

### Implementation Overview:

#### Step 1: "Remember Me" Feature

```typescript
// Extend login to support remember me
async loginTeam(req: Request, res: Response) {
  const { email, password, rememberMe } = req.body;

  // Adjust refresh token expiration
  const refreshTokenExpiry = rememberMe 
    ? 90 * 24 * 60 * 60 * 1000  // 90 days
    : 7 * 24 * 60 * 60 * 1000;  // 7 days

  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: refreshTokenExpiry
  });
}
```

#### Step 2: Session Management Dashboard

Add table for session tracking:
```typescript
export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  deviceInfo: varchar('device_info', { length: 500 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  location: varchar('location', { length: 200 }),
  lastActivity: timestamp('last_activity').notNull(),
  createdAt: timestamp('created_at').notNull(),
  isActive: boolean('is_active').default(true)
});
```

Add endpoints:
```typescript
// GET /api/auth/sessions - List user's active sessions
// DELETE /api/auth/sessions/:id - Revoke specific session
// DELETE /api/auth/sessions/all - Logout all devices
```

#### Step 3: Security Event Logging

```typescript
export const securityEvents = pgTable('security_events', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: varchar('user_agent', { length: 500 }),
  location: varchar('location', { length: 200 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull()
});

// Event types:
// - LOGIN_SUCCESS
// - LOGIN_FAILED
// - TOKEN_REFRESH
// - TOKEN_THEFT_DETECTED
// - SESSION_REVOKED
// - PASSWORD_CHANGED
// - SUSPICIOUS_ACTIVITY
```

#### Step 4: Anomaly Detection

```typescript
// Detect suspicious patterns:
// - Login from new location
// - Multiple failed attempts
// - Unusual access patterns
// - Token reuse (rotation violation)

async detectAnomalies(userId: string, event: SecurityEvent) {
  // Check for:
  // 1. Rapid location changes
  // 2. Multiple concurrent sessions from different IPs
  // 3. Failed login spikes
  // 4. Refresh token reuse (indicates theft)

  if (anomalyDetected) {
    // Actions:
    // - Notify user via email
    // - Require re-authentication
    // - Revoke suspicious sessions
    // - Log security event
  }
}
```

### Estimated Effort:
- **Development:** 2-3 weeks
- **Testing:** 1 week
- **Total:** 3-4 weeks

### User Impact:
- ✅ **Control:** Users can manage their sessions
- ✅ **Security:** Notified of suspicious activity
- ✅ **Convenience:** Remember Me option
- ✅ **Transparency:** See all active sessions

---

## COMPARISON OF STORAGE APPROACHES

### Option 1: localStorage Only (Current - Phase 0/1)

**How it works:**
```
Login → Store JWT in localStorage → Send in Authorization header
```

**Pros:**
- ✅ Simple implementation
- ✅ Works everywhere
- ✅ Large storage capacity
- ✅ Persists across sessions

**Cons:**
- ❌ **Vulnerable to XSS** (any malicious script can steal tokens)
- ❌ Tokens can be used remotely if stolen
- ❌ No automatic expiration
- ❌ Requires manual cleanup

**Use when:**
- Rapid prototyping
- Low security requirements
- Need to support environments without cookie access
- Large token payloads (>4KB)

**OWASP Assessment:** ⚠️ "Not recommended for production apps with sensitive data"

---

### Option 2: HttpOnly Cookies Only

**How it works:**
```
Login → Server sets HttpOnly cookie → Browser auto-sends with requests
```

**Pros:**
- ✅ **Protected from XSS** (JavaScript cannot access)
- ✅ Automatic inclusion in requests
- ✅ Secure by default
- ✅ Built-in expiration

**Cons:**
- ❌ 4KB size limit
- ❌ CSRF vulnerability (needs protection)
- ❌ Can't use Authorization header pattern
- ❌ Complex CORS setup
- ❌ Doesn't work well with mobile apps

**Use when:**
- Traditional server-rendered apps
- Same-domain API calls
- High security requirements
- Small token sizes

**OWASP Assessment:** ✅ "Recommended for session identifiers"

---

### Option 3: Dual Token (Recommended - Phase 2)

**How it works:**
```
Login → Short access token in memory + Long refresh token in HttpOnly cookie
API calls → Use access token from memory
Token expires → Auto-refresh using HttpOnly cookie
```

**Pros:**
- ✅ **Best security** (XSS protection for refresh token)
- ✅ **Best UX** (auto-refresh, persistent sessions)
- ✅ Token rotation (detects theft)
- ✅ Follows OAuth 2.0 standards
- ✅ Works with Authorization header
- ✅ Short access token limits damage

**Cons:**
- ⚠️ More complex implementation
- ⚠️ Requires backend changes
- ⚠️ Additional database for refresh tokens
- ⚠️ More endpoints to secure

**Use when:**
- Production applications
- Sensitive data (finance, healthcare, PII)
- SPAs with REST APIs
- Need both security and UX

**OWASP Assessment:** ✅ "Industry best practice"
**Auth0 Recommendation:** ✅ "Use for all SPAs"
**NIST 800-63B:** ✅ "Aligns with AAL2 requirements"

---

## MIGRATION STRATEGY

### Zero-Downtime Migration (Phase 1 → Phase 2)

**Week 1: Preparation**
- Deploy database schema changes
- Add refresh token endpoints (backward compatible)
- Update backend to support both old and new flows

**Week 2: Gradual Rollout**
- Deploy new login flow with dual tokens
- Existing users: Keep working with old tokens
- New logins: Use new dual-token system

**Week 3: Migration**
- On next login, all users migrate to new system
- Old tokens continue to work until expiration

**Week 4: Cleanup**
- All users migrated
- Remove old token support
- Monitor for issues

### Backward Compatibility

```typescript
// Support both token types during migration
const token = req.headers.authorization?.split(' ')[1]  // New (access token)
           || req.cookies.authToken;                    // Old (single token)
```

---

## SUCCESS METRICS

### Phase 0 Success Criteria:
- ✅ Zero unexpected logouts reported
- ✅ Diagnostic logs show successful token retrieval
- ✅ Auth check success rate > 99%

### Phase 1 Success Criteria:
- ✅ < 0.1% error rate on auth checks
- ✅ Average retry count < 1.1
- ✅ All error categories properly classified
- ✅ Monitoring dashboard shows clear patterns

### Phase 2 Success Criteria:
- ✅ Token refresh success rate > 99.5%
- ✅ Zero XSS-related token theft
- ✅ Average session duration increases
- ✅ User complaints about logouts reduce to zero

### Phase 3 Success Criteria:
- ✅ Users actively manage sessions
- ✅ Anomaly detection catches > 95% of suspicious activity
- ✅ Security event log provides audit trail
- ✅ MTTR (Mean Time To Respond) for security incidents < 1 hour

---

## RECOMMENDATIONS

### Immediate (This Week):
✅ **Implement Phase 0** - Stop the bleeding, fix the logout bug

### Short Term (This Month):
✅ **Implement Phase 1** - Production-grade error handling and monitoring

### Medium Term (Next Quarter):
✅ **Implement Phase 2** - Security hardening with dual tokens

### Long Term (6 months):
✅ **Implement Phase 3** - Advanced features as needed

---

## CONCLUSION

The phased approach allows you to:

1. **Fix immediately** - Stop users from being logged out (Phase 0)
2. **Stabilize quickly** - Make current system production-ready (Phase 1)
3. **Secure properly** - Migrate to industry standards (Phase 2)
4. **Enhance strategically** - Add advanced features (Phase 3)

Each phase builds on the previous one, delivering value incrementally while minimizing risk.

**Recommended Path:**
- **Now:** Phase 0 (4-6 hours)
- **This Week:** Phase 1 (2-3 days)
- **This Month:** Phase 2 (1-2 weeks)
- **As Needed:** Phase 3 (2-4 weeks)

This aligns with OWASP, Auth0, and NIST guidance while maintaining a pragmatic, deliverable roadmap.
