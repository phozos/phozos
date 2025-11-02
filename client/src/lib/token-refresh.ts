/**
 * Token Refresh Client Library (Phase 2: Token Refresh Pattern)
 * 
 * Provides client-side token management with automatic refresh capabilities:
 * - JWT token decoding and expiration detection
 * - Automatic token refresh scheduling (at 80% of token lifetime)
 * - Seamless token renewal using HttpOnly refresh tokens
 * 
 * Security features:
 * - Access tokens stored in memory (not localStorage for XSS protection)
 * - Refresh tokens in HttpOnly cookies (managed by server)
 * - Auto-refresh prevents token expiration during user sessions
 */

let refreshTimer: NodeJS.Timeout | null = null;
let currentToken: string | null = null;

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
 * Refresh access token by calling the refresh endpoint
 * 
 * This function:
 * 1. Calls /api/auth/refresh with credentials (includes HttpOnly cookie)
 * 2. Receives new access token
 * 3. Schedules next auto-refresh
 * 
 * @returns New access token or null if refresh failed
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include', // Include HttpOnly cookie
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Token refresh failed:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.success && data.data?.accessToken) {
      const newToken = data.data.accessToken;
      currentToken = newToken;
      
      // Schedule next refresh
      scheduleTokenRefresh(newToken);
      
      return newToken;
    }

    return null;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

/**
 * Schedule automatic token refresh at 80% of token lifetime
 * 
 * For a 15-minute token:
 * - Refresh scheduled at 12 minutes (80% of 15 minutes)
 * - Ensures token is refreshed before it expires
 * 
 * @param token - JWT token string
 */
export function scheduleTokenRefresh(token: string): void {
  // Clear any existing timer
  stopTokenRefresh();

  const payload = decodeToken(token);
  if (!payload) {
    console.error('Cannot schedule refresh: invalid token');
    return;
  }

  currentToken = token;

  const expirationTime = payload.exp * 1000; // Convert to milliseconds
  const issuedTime = payload.iat * 1000; // Convert to milliseconds
  const tokenLifetime = expirationTime - issuedTime;
  
  // Schedule refresh at 80% of token lifetime
  const refreshTime = tokenLifetime * 0.8;

  refreshTimer = setTimeout(async () => {
    const newToken = await refreshAccessToken();
    
    if (newToken) {
      // Notify the app about the new token
      window.dispatchEvent(new CustomEvent('token-refreshed', { 
        detail: { token: newToken } 
      }));
    } else {
      // Token refresh failed, user needs to re-authenticate
      window.dispatchEvent(new CustomEvent('token-refresh-failed'));
    }
  }, refreshTime);

  console.log(`Token refresh scheduled in ${Math.round(refreshTime / 1000)} seconds`);
}

/**
 * Stop automatic token refresh
 * 
 * Call this when:
 * - User logs out
 * - Token is cleared
 * - Component unmounts
 */
export function stopTokenRefresh(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  currentToken = null;
}

/**
 * Get current token (for internal use)
 * 
 * @returns Current token or null
 */
export function getCurrentToken(): string | null {
  return currentToken;
}
