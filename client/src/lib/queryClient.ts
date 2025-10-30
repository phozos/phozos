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
 * QueryClient Configuration
 * 
 * This configuration balances fresh data with performance:
 * - staleTime: 5 minutes means data is considered fresh for 5 min
 * - refetchOnWindowFocus: true ensures users see fresh data when returning to the app
 * - refetchOnMount: true provides fresh data when components mount (if stale)
 * - refetchOnReconnect: true fetches fresh data after network recovery
 * 
 * Individual queries can override these defaults using options parameter.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      refetchInterval: false,
      refetchOnWindowFocus: true,   // ✅ Enable for fresh data when tab regains focus
      staleTime: 5 * 60 * 1000,     // 5 minutes - data stays fresh for 5 min
      retry: false,                  // Handled by useApiQuery/useApiMutation
      refetchOnMount: true,          // ✅ Enable for fresh data on component mount
      refetchOnReconnect: true,      // ✅ Enable for fresh data after network recovery
      refetchIntervalInBackground: false,
    },
    mutations: {
      retry: false,
    },
  },
});


