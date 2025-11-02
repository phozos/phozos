/**
 * Token Refresh Client Library (Phase 4: Token Refresh & 401 Handling Hardening)
 * 
 * Provides client-side token management with automatic refresh capabilities:
 * - JWT token decoding and expiration detection
 * - Automatic token refresh scheduling (at 75% of token lifetime - Phase 4 optimization)
 * - Seamless token renewal using HttpOnly refresh tokens
 * - Refresh lock to prevent concurrent refresh attempts
 * 
 * Security features:
 * - Access tokens stored in memory and localStorage (managed by api-client.ts)
 * - Refresh tokens in HttpOnly cookies (managed by server)
 * - Auto-refresh prevents token expiration during user sessions
 * - Event-driven refresh lifecycle for UI coordination
 * 
 * Phase 4 Improvements:
 * - Unified token state (uses api-client.ts as single source of truth)
 * - Refresh lock prevents race conditions
 * - Enhanced event system for refresh lifecycle tracking
 * - Timer management for login/logout coordination
 */

import { getAuthToken, setAuthToken } from './api-client';

let refreshTimer: NodeJS.Timeout | null = null;
// Phase 4.1: Removed duplicate currentToken - using api-client.ts as single source of truth
let isRefreshing: boolean = false; // Phase 4.2: Refresh lock to prevent concurrent refreshes

interface JWTPayload {
  userId: string;
  role: string;
  email: string;
  exp: number;
  iat: number;
}

/**
 * Decode JWT token payload without validation
 * 
 * @param token - JWT token string
 * @returns Decoded payload object or null if invalid
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as JWTPayload;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

/**
 * Check if token is expiring soon (within 2 minutes)
 * 
 * @param token - JWT token string
 * @returns True if token expires within 2 minutes
 */
export function isTokenExpiringSoon(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload) {
    return true;
  }

  const expirationTime = payload.exp * 1000; // Convert to milliseconds
  const currentTime = Date.now();
  const timeUntilExpiry = expirationTime - currentTime;
  const twoMinutes = 2 * 60 * 1000;

  return timeUntilExpiry < twoMinutes;
}

/**
 * Refresh access token by calling the refresh endpoint (Phase 4: Enhanced)
 * 
 * This function:
 * 1. Checks refresh lock to prevent concurrent refreshes
 * 2. Emits token-refresh-started event
 * 3. Calls /api/auth/refresh with credentials (includes HttpOnly cookie)
 * 4. Updates token in api-client.ts (single source of truth)
 * 5. Schedules next auto-refresh
 * 6. Emits token-refreshed or token-refresh-failed event
 * 
 * @returns New access token or null if refresh failed
 */
export async function refreshAccessToken(): Promise<string | null> {
  // Phase 4.2: Prevent concurrent refresh attempts
  if (isRefreshing) {
    console.log('⏳ [REFRESH] Refresh already in progress, skipping...');
    return null;
  }
  
  isRefreshing = true;
  console.log('🔄 [REFRESH] Starting token refresh...');
  
  // Phase 4.4: Emit refresh started event
  window.dispatchEvent(new CustomEvent('token-refresh-started'));
  
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include', // Include HttpOnly cookie
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('❌ [REFRESH] Token refresh failed:', response.status);
      
      // Phase 4.4: Emit enhanced failure event with details
      window.dispatchEvent(new CustomEvent('token-refresh-failed', {
        detail: { 
          status: response.status,
          reason: 'HTTP error',
          timestamp: Date.now()
        }
      }));
      
      // Phase 4.2: Clear timers on failure
      stopTokenRefresh();
      
      return null;
    }

    const data = await response.json();
    
    if (data.success && data.data?.accessToken) {
      const newToken = data.data.accessToken;
      
      // Phase 4.1: Update token in api-client.ts (single source of truth)
      setAuthToken(newToken);
      console.log('✅ [REFRESH] Token refreshed successfully');
      
      // Schedule next refresh
      scheduleTokenRefresh(newToken);
      
      // Phase 4.4: Emit success event
      window.dispatchEvent(new CustomEvent('token-refreshed', { 
        detail: { token: newToken, timestamp: Date.now() } 
      }));
      
      return newToken;
    }

    console.error('❌ [REFRESH] Invalid response format');
    
    // Phase 4.4: Emit failure event
    window.dispatchEvent(new CustomEvent('token-refresh-failed', {
      detail: { 
        reason: 'Invalid response format',
        timestamp: Date.now()
      }
    }));
    
    return null;
  } catch (error) {
    console.error('❌ [REFRESH] Error refreshing token:', error);
    
    // Phase 4.4: Emit failure event with error details
    window.dispatchEvent(new CustomEvent('token-refresh-failed', {
      detail: { 
        reason: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      }
    }));
    
    return null;
  } finally {
    // Phase 4.2: Always clear refresh lock
    isRefreshing = false;
  }
}

/**
 * Schedule automatic token refresh at 75% of token lifetime (Phase 4.2: Optimized)
 * 
 * For a 15-minute token:
 * - Refresh scheduled at 11.25 minutes (75% of 15 minutes)
 * - Earlier refresh provides more buffer time before expiration
 * 
 * Phase 4.2 Improvements:
 * - Moved from 80% → 75% for better safety margin
 * - Enhanced logging for debugging
 * - Timer properly managed (cleared on logout, restarted on login)
 * 
 * @param token - JWT token string
 */
export function scheduleTokenRefresh(token: string): void {
  // Clear any existing timer
  stopTokenRefresh();

  const payload = decodeToken(token);
  if (!payload) {
    console.error('❌ [REFRESH] Cannot schedule refresh: invalid token');
    return;
  }

  // Phase 4.1: Token is now managed by api-client.ts (no need to store here)

  const expirationTime = payload.exp * 1000; // Convert to milliseconds
  const issuedTime = payload.iat * 1000; // Convert to milliseconds
  const tokenLifetime = expirationTime - issuedTime;
  
  // Phase 4.2: Schedule refresh at 75% of token lifetime (was 80%)
  const refreshTime = tokenLifetime * 0.75;

  refreshTimer = setTimeout(async () => {
    console.log('⏰ [REFRESH] Auto-refresh timer triggered');
    const newToken = await refreshAccessToken();
    
    // Events are now emitted inside refreshAccessToken (Phase 4.4)
    if (!newToken) {
      console.warn('⚠️ [REFRESH] Auto-refresh failed, user may need to re-authenticate');
    }
  }, refreshTime);

  const refreshInMinutes = Math.round(refreshTime / 1000 / 60 * 10) / 10;
  console.log(`⏰ [REFRESH] Token refresh scheduled in ${refreshInMinutes} minutes (75% of ${Math.round(tokenLifetime / 1000 / 60)} min lifetime)`);
}

/**
 * Stop automatic token refresh (Phase 4.2: Enhanced)
 * 
 * Call this when:
 * - User logs out (Phase 4.2: Timer cancellation on logout)
 * - Token is cleared
 * - Token refresh fails (Phase 4.2: Clear timers on failure)
 * - Component unmounts
 */
export function stopTokenRefresh(): void {
  if (refreshTimer) {
    console.log('⏹️ [REFRESH] Stopping token refresh timer');
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  // Phase 4.1: Removed currentToken = null (managed by api-client.ts)
}

/**
 * Get current token (Phase 4.1: Unified with api-client.ts)
 * 
 * This now delegates to api-client.ts for single source of truth
 * 
 * @returns Current token or null
 */
export function getCurrentToken(): string | null {
  return getAuthToken();
}

/**
 * Restart token refresh on login (Phase 4.2: Timer restart)
 * 
 * This should be called after successful login to ensure
 * the refresh timer is active for the new token.
 * 
 * @param token - JWT token string from login
 */
export function restartTokenRefresh(token: string): void {
  console.log('🔄 [REFRESH] Restarting token refresh for new login');
  scheduleTokenRefresh(token);
}
