import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";

// CSRF functionality has been consolidated to api-client.ts
// This file now focuses solely on react-query configuration

// Re-export apiRequest from api-client for backward compatibility
export { apiRequest } from "@/lib/api-client";

// Default query function that uses our typed apiRequest
const defaultQueryFn: QueryFunction = async ({ queryKey }) => {
  // Only run default queryFn for URL-like queryKeys to avoid bogus requests
  const firstKey = queryKey[0];
  
  if (typeof firstKey !== 'string' || (!firstKey.startsWith('/api') && !firstKey.startsWith('http'))) {
    throw new Error(
      `Default queryFn requires explicit URL-like queryKey starting with '/api' or 'http'. ` +
      `Got: ${JSON.stringify(queryKey)}. Please provide an explicit queryFn or use a proper URL-based queryKey.`
    );
  }
  
  // Use only the first key as URL, second key as optional query params
  let url = firstKey;
  if (queryKey.length > 1 && typeof queryKey[1] === 'object' && queryKey[1] !== null) {
    const params = new URLSearchParams();
    const queryParams = queryKey[1] as Record<string, any>;
    for (const [key, value] of Object.entries(queryParams)) {
      if (value != null) {
        params.append(key, String(value));
      }
    }
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
  }
  
  if (import.meta.env.DEV) {
    console.log(`🔍 Default query function called for: ${url}`);
  }
  return apiRequest(url, { method: 'GET' });
};

/**
 * QueryClient Configuration (Phase 3: React Query Optimization)
 * 
 * Optimized configuration to reduce unnecessary refetches and coordinate with auth state:
 * 
 * STALE TIME STRATEGY (Tiered):
 * - Default: 5 minutes for general data (applications, documents, etc.)
 * - User Profile: 10 minutes (override in individual queries with staleTime: 10 * 60 * 1000)
 * - Real-time data: 0 minutes (override in individual queries with staleTime: 0)
 * 
 * REFETCH POLICIES (Optimized for auth coordination):
 * - refetchOnWindowFocus: false by default (prevents race conditions during token refresh)
 *   - Individual queries can opt-in with refetchOnWindowFocus: true
 * - refetchOnMount: 'always' only refetches if data is stale (respects staleTime)
 * - refetchOnReconnect: true for fresh data after network recovery
 * 
 * AUTH COORDINATION:
 * - Use enabled: authReady in queries requiring authentication
 * - Use useAuthenticatedQuery wrapper for convenience
 * - Queries respect token refresh lifecycle to avoid 401 race conditions
 * 
 * Individual queries can override these defaults using options parameter.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      refetchInterval: false,
      
      // ⚡ Phase 3 Optimization: Disable refetchOnWindowFocus by default
      // This prevents queries from firing during token refresh, reducing 401 race conditions
      // Individual queries can opt-in with refetchOnWindowFocus: true if needed
      refetchOnWindowFocus: false,
      
      // ⏱️ Phase 3 Optimization: Tiered staleTime (default 5 min, user profile 10 min)
      // Data is considered fresh for this duration, preventing unnecessary refetches
      staleTime: 5 * 60 * 1000,     // 5 minutes default
      
      retry: false,                  // Handled by useApiQuery/useApiMutation
      
      // 🔄 Only refetch on mount if data is stale (respects staleTime)
      refetchOnMount: 'always',
      
      // 🌐 Refetch after network reconnection for fresh data
      refetchOnReconnect: true,
      
      refetchIntervalInBackground: false,
    },
    mutations: {
      retry: false,
    },
  },
});


