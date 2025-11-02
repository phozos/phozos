import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { api, setAuthToken, clearAuthToken, getAuthToken, setCsrfToken } from '@/lib/api-client';
import { stopTokenRefresh } from '@/lib/token-refresh';
import type { User } from '../../../shared/types';

/**
 * Consolidated Auth & Security Provider
 * Handles both authentication and CSRF token management in a single, simplified provider
 * Replaces separate AuthProvider and CSRFProvider to reduce complexity
 */

interface AuthContextType {
  // Authentication state
  user: User | null;
  loading: boolean;
  
  // Authentication actions
  login: (userData: User, token?: string) => Promise<void>;
  logout: () => void;
  
  // CSRF management (consolidated)
  csrfToken: string | null;
  csrfLoading: boolean;
  refreshCsrfToken: () => Promise<void>;
  getCsrfToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authCheckAttempted, setAuthCheckAttempted] = useState(false);
  
  // ✅ STEP 1.5: StrictMode protection - use ref to persist across re-mounts
  const isInitializing = useRef(false);
  
  // CSRF state (consolidated into auth provider)
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
      // API client now auto-unwraps the envelope, so we get { csrfToken: "..." } directly
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

  /**
   * Refresh CSRF token
   */
  const refreshCsrfToken = useCallback(async (): Promise<void> => {
    await fetchCsrfToken();
  }, [fetchCsrfToken]);

  /**
   * Get current CSRF token, fetch if not available
   */
  const getCsrfToken = useCallback(async (): Promise<string | null> => {
    if (csrfToken) {
      return csrfToken;
    }
    return await fetchCsrfToken();
  }, [csrfToken, fetchCsrfToken]);

  /**
   * Check authentication status with smart token clearing logic
   * ✅ STEP 1.3: Only clear tokens on confirmed expiration, not on race conditions
   */
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

  /**
   * Login user with proper state synchronization
   */
  const login = async (userData: User, token?: string): Promise<void> => {
    // Store token immediately (synchronous operation)
    if (token) {
      setAuthToken(token);
      
      // Verify token was stored successfully
      const storedToken = getAuthToken();
      if (!storedToken) {
        console.error('Failed to store authentication token');
        throw new Error('Authentication token storage failed');
      }
    }
    
    // CRITICAL: Refresh CSRF token after login to bind it to the authenticated session
    // Without this, the old CSRF token (bound to 'unauthenticated' session) will cause
    // validation failures when creating posts or performing other state-changing operations
    await refreshCsrfToken();
    
    // Update React state
    setUser(userData);
    setLoading(false);
    setAuthCheckAttempted(true);
    
    // Small delay to ensure React state updates are processed
    // This prevents race conditions with immediate API calls after navigation
    await new Promise(resolve => setTimeout(resolve, 100));
  };

  /**
   * Logout user (Phase 2: Token Refresh Pattern)
   */
  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Stop automatic token refresh (Phase 2)
    stopTokenRefresh();
    
    clearAuthToken();
    setUser(null);
    setAuthCheckAttempted(false);
    
    // CRITICAL: Refresh CSRF token after logout to bind it to the unauthenticated session
    // This prevents validation failures when logging back in immediately
    // Without this, the old CSRF token (bound to authenticated userId) will cause
    // "Invalid signature or session mismatch" errors on the next login attempt
    await refreshCsrfToken();
  };

  // Initialize on mount with StrictMode protection
  useEffect(() => {
    // ✅ STEP 1.5: Prevent double execution in StrictMode
    if (isInitializing.current) {
      console.log('⚠️ [AUTH] Already initializing, skipping duplicate mount (StrictMode)');
      return;
    }
    
    isInitializing.current = true;
    console.log('🔄 [AUTH] Initializing auth provider...');
    
    checkAuthStatus();
    if (!csrfInitialized) {
      fetchCsrfToken().finally(() => setCsrfInitialized(true));
    }
  }, []);

  const value = {
    // Authentication
    user,
    loading,
    login,
    logout,
    
    // CSRF (consolidated)
    csrfToken,
    csrfLoading,
    refreshCsrfToken,
    getCsrfToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access consolidated auth & security context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * Legacy CSRF hook - for backward compatibility during transition
 * Points to the consolidated auth context
 */
export function useCsrf() {
  const { csrfToken, csrfLoading, refreshCsrfToken, getCsrfToken } = useAuth();
  
  return {
    token: csrfToken,
    isLoading: csrfLoading,
    refreshToken: refreshCsrfToken,
    getToken: getCsrfToken
  };
}