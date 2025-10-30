import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, setAuthToken, clearAuthToken, getAuthToken, setCsrfToken } from '@/lib/api-client';
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
   * Check authentication status
   */
  const checkAuthStatus = async () => {
    try {
      // API client now auto-unwraps the envelope, so we get user data directly
      const userData = await api.get('/api/auth/me') as any;
      setUser(userData);
    } catch (error: any) {
      // Clear token and user on auth failure
      if (error.status === 401) {
        clearAuthToken();
      }
      setUser(null);
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
   * Logout user
   */
  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    clearAuthToken();
    setUser(null);
    setAuthCheckAttempted(false);
    
    // CRITICAL: Refresh CSRF token after logout to bind it to the unauthenticated session
    // This prevents validation failures when logging back in immediately
    // Without this, the old CSRF token (bound to authenticated userId) will cause
    // "Invalid signature or session mismatch" errors on the next login attempt
    await refreshCsrfToken();
  };

  // Initialize on mount
  useEffect(() => {
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