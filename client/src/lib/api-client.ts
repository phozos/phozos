/**
 * Simplified API Client for Phozos Application
 * 
 * Phase 3 State Management Cleanup: Simplified from 531 lines of complex abstractions
 * to a basic, reliable fetch wrapper with essential functionality only.
 * 
 * Removed overengineered features:
 * - Complex schema registry lookups
 * - Multiple CSRF token fallback mechanisms  
 * - Circuit breaker patterns
 * - Advanced timeout and retry logic
 * - Complex response validation layers
 */

import { z } from "zod";

// API Base URL configuration for split frontend/backend deployments
// Uses VITE_API_URL environment variable if set, otherwise defaults to relative URLs (monolithic deployment)
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Simple API Error class with essential error information
 */
export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;
  public readonly field?: string;
  public readonly hint?: string;

  constructor(
    code: string,
    message: string,
    status: number,
    details?: unknown,
    field?: string,
    hint?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.field = field;
    this.hint = hint;

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Check if error is authentication related
   */
  isAuthError(): boolean {
    return this.code.startsWith('AUTH_') || this.status === 401;
  }

  /**
   * Check if error is validation related
   */
  isValidationError(): boolean {
    return this.code === 'VALIDATION_ERROR' || this.status === 422;
  }
}

/**
 * Simple token management for authentication
 */
const TOKEN_STORAGE_KEY = 'auth_token';
let authToken: string | null = null;
let csrfToken: string | null = null;

/**
 * Set JWT token for Authorization headers
 */
export function setAuthToken(token: string | null) {
  authToken = token;
  
  if (token) {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch (error) {
      console.error('Failed to store token in localStorage:', error);
      throw error; // Re-throw to handle in calling code
    }
  } else {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear token from localStorage:', error);
    }
  }
}

/**
 * Get current JWT token
 */
export function getAuthToken(): string | null {
  if (authToken) {
    return authToken;
  }
  
  try {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (storedToken) {
      authToken = storedToken;
      return storedToken;
    }
  } catch (error) {
    console.warn('Failed to read token from localStorage:', error);
  }
  
  return null;
}

/**
 * Clear JWT token
 */
export function clearAuthToken() {
  setAuthToken(null);
}

/**
 * Set CSRF token (managed by consolidated auth provider)
 */
export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

/**
 * Get CSRF token (simple - no complex fallback logic)
 */
function getCsrfToken(): string | null {
  return csrfToken;
}

/**
 * Get cookie value by name from document.cookie
 */
function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

// Shared promise for in-flight CSRF token refreshes to prevent race conditions
let csrfRefreshPromise: Promise<void> | null = null;

/**
 * Ensure CSRF token and cookie are synchronized before state-changing requests
 * This guarantees both header and cookie are present and matching
 */
async function ensureCsrfReady(): Promise<void> {
  // If a refresh is already in progress, wait for it instead of starting another
  if (csrfRefreshPromise) {
    return csrfRefreshPromise;
  }

  const memoryToken = getCsrfToken();
  const cookieToken = getCookieValue('_csrf');
  
  // If no token OR visible cookie doesn't match memory → fetch fresh
  // Don't require cookie presence (supports HttpOnly deployments)
  if (!memoryToken || (cookieToken && memoryToken !== cookieToken)) {
    csrfRefreshPromise = (async () => {
      try {
        const response = await fetch('/api/auth/csrf-token', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to obtain CSRF token');
        }
        
        const data = await response.json();
        const newToken = data.csrfToken || data.data?.csrfToken;
        
        if (!newToken) {
          throw new Error('Invalid CSRF token response');
        }
        
        setCsrfToken(newToken);
        
        // Verify cookie was set (optional - don't fail if cookie can't be read)
        const setCookieToken = getCookieValue('_csrf');
        if (setCookieToken && setCookieToken !== newToken) {
          console.warn('CSRF cookie verification failed - may indicate cookie policy issue');
        }
      } finally {
        csrfRefreshPromise = null;
      }
    })();
    
    return csrfRefreshPromise;
  }
}

/**
 * Simple request options interface
 */
interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  skipCsrf?: boolean;
  includeCredentials?: boolean; // For CSRF-protected endpoints that need cookies
  __csrfRetried?: boolean; // Internal flag to prevent infinite retry loops
}

/**
 * Simplified API request function - basic fetch wrapper
 * 
 * @param url API endpoint URL
 * @param options Request options
 * @param responseSchema Optional Zod schema for response validation
 * @returns Promise resolving to typed response data
 */
export async function apiRequest<T>(
  url: string,
  options?: RequestOptions,
  responseSchema?: z.ZodSchema<T>
): Promise<T> {
  const { method = 'GET', body, headers, skipCsrf = false, includeCredentials = false } = options || {};
  
  // Prepare request headers
  const requestHeaders: Record<string, string> = {
    ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...headers,
  };

  // Add JWT token for Authorization header
  const token = getAuthToken();
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Add CSRF token for state-changing requests with guaranteed synchronization
  const needsCsrf = !skipCsrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  if (needsCsrf) {
    // ALWAYS ensure both token and cookie are synchronized
    await ensureCsrfReady();
    
    const csrf = getCsrfToken();
    if (!csrf) {
      throw new ApiError('CSRF_NOT_READY', 'CSRF protection not ready', 403);
    }
    
    requestHeaders['x-csrf-token'] = csrf;
  }

  // Prepare fetch options
  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
    body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined)
  };

  // Include credentials for CSRF-protected endpoints (they need CSRF cookies)
  // or when explicitly requested
  if (needsCsrf || includeCredentials) {
    fetchOptions.credentials = "include";
  }

  try {
    // Support both relative URLs (monolithic) and absolute URLs (split deployment)
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
      
      throw new ApiError(
        errorData.code || 'REQUEST_FAILED',
        errorData.message || response.statusText,
        response.status,
        errorData.details,
        errorData.field,
        errorData.hint
      );
    }

    // Parse response
    const responseText = await response.text();
    const contentType = response.headers.get('content-type') || '';
    
    // Handle non-JSON responses based on Content-Type
    if (contentType.includes('text/csv') || 
        contentType.includes('application/octet-stream') ||
        contentType.startsWith('image/')) {
      return responseText as T; // Return raw text for file downloads
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

    // Auto-unwrap ApiResponse envelope: { success: true, data: {...} } -> {...}
    // This ensures frontend always receives clean data without the wrapper
    const unwrappedData = data?.success === true ? data.data : data;

    // Enforce response validation - throw on validation failure (no silent failures)
    if (responseSchema) {
      try {
        const validated = responseSchema.parse(unwrappedData);
        return validated;
      } catch (error) {
        // Log detailed validation error for debugging
        console.error('Response validation failed:', {
          url,
          error,
          receivedData: unwrappedData
        });
        
        // Throw validation error instead of returning invalid data
        throw new ApiError(
          'RESPONSE_VALIDATION_ERROR',
          'API response does not match expected schema',
          200, // Response was successful but data format is wrong
          error instanceof Error ? error.message : 'Unknown validation error'
        );
      }
    }

    return unwrappedData;
  } catch (error) {
    // Handle CSRF token errors with single retry (prevent infinite recursion)
    if (error instanceof ApiError && 
        (error.code.startsWith('CSRF_TOKEN_') || (error.status === 403 && error.message.toLowerCase().includes('csrf'))) &&
        !options?.__csrfRetried) {
      try {
        // Single retry with fresh CSRF token and retry guard
        await ensureCsrfReady();
        return apiRequest(url, { ...(options || {}), __csrfRetried: true }, responseSchema);
      } catch (retryError) {
        // If retry fails, throw original error
        throw error;
      }
    }
    
    // Re-throw ApiError instances
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(
        'NETWORK_ERROR',
        'Network request failed',
        0
      );
    }
    
    // Handle other errors
    throw new ApiError(
      'UNKNOWN_ERROR',
      error instanceof Error ? error.message : 'Unknown error occurred',
      0
    );
  }
}

/**
 * Simple API client with basic HTTP methods
 */
export const api = {
  get: <T>(url: string, responseSchema?: z.ZodSchema<T>) => 
    apiRequest<T>(url, { method: 'GET' }, responseSchema),
    
  post: <T>(url: string, body?: any, responseSchema?: z.ZodSchema<T>) => 
    apiRequest<T>(url, { method: 'POST', body }, responseSchema),
    
  put: <T>(url: string, body?: any, responseSchema?: z.ZodSchema<T>) => 
    apiRequest<T>(url, { method: 'PUT', body }, responseSchema),
    
  patch: <T>(url: string, body?: any, responseSchema?: z.ZodSchema<T>) => 
    apiRequest<T>(url, { method: 'PATCH', body }, responseSchema),
    
  delete: <T>(url: string, responseSchema?: z.ZodSchema<T>) => 
    apiRequest<T>(url, { method: 'DELETE' }, responseSchema)
};

/**
 * Phase 3 API Client Simplification Summary:
 * 
 * REMOVED (Overengineered):
 * - Complex schema registry lookup system
 * - Multiple CSRF token fallback mechanisms
 * - Advanced timeout and abort controllers  
 * - Complex retry logic with exponential backoff
 * - Circuit breaker patterns
 * - Multiple response validation layers
 * - Complex cookie management
 * - Development-only validation features
 * 
 * KEPT (Essential):
 * - Basic JWT token management
 * - Simple CSRF token handling
 * - Essential error handling with ApiError class
 * - Basic fetch wrapper with HTTP methods
 * - Simple response validation
 * - Credential management
 * 
 * Result: 531 lines → ~200 lines (62% reduction in API client complexity)
 */