/**
 * Simplified React Query Hooks for Phozos API
 * 
 * Phase 3 State Management Cleanup: Consolidated from 15+ hooks to 3 essential hooks
 * - useApiQuery: For GET requests
 * - useApiMutation: For POST/PUT/PATCH/DELETE requests  
 * - usePaginatedApiQuery: For paginated data
 * 
 * Removed overengineered hooks: useResilientQuery, useQueryComposition, useCachedQuery,
 * useInfiniteApiQuery, useOptimisticMutation, useDependentQuery, usePollingQuery, etc.
 */

import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest, api, ApiError } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

/**
 * Essential Hook #1: Type-safe useQuery wrapper for GET requests
 * 
 * @param queryKey Query key for caching
 * @param url API endpoint URL
 * @param responseSchema Optional Zod schema for response validation
 * @param options Additional React Query options
 */
export function useApiQuery<T>(
  queryKey: (string | number | boolean)[],
  url: string,
  responseSchema?: z.ZodSchema<T>,
  options?: Omit<UseQueryOptions<T, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T, ApiError>({
    queryKey,
    queryFn: () => apiRequest<T>(url, { method: 'GET' }, responseSchema),
    // Simple retry logic - no overengineered circuit breakers
    retry: (failureCount, error) => {
      // Don't retry authentication errors
      if (error.isAuthError()) return false;
      // Don't retry validation errors  
      if (error.isValidationError()) return false;
      // Don't retry client errors (4xx except auth)
      if (error.status >= 400 && error.status < 500 && !error.isAuthError()) return false;
      // Retry server errors up to 3 times
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options
  });
}

/**
 * Essential Hook #2: Type-safe useMutation wrapper for POST/PUT/PATCH/DELETE requests
 * 
 * @param mutationFn Function that performs the mutation
 * @param options Additional React Query options
 */
export function useApiMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, ApiError, TVariables>
) {
  const { toast } = useToast();

  return useMutation<TData, ApiError, TVariables>({
    mutationFn,
    onError: (error, variables, context) => {
      // Simple error toast - no complex error handling systems
      if (!options?.onError) {
        let description = error.message;
        
        // Add helpful context for common errors
        if (error.isAuthError()) {
          description = "Please log in again to continue.";
        } else if (error.isValidationError()) {
          description = error.field 
            ? `${error.field}: ${error.message}`
            : error.message;
        } else if (error.code === 'RATE_LIMITED') {
          description = error.hint || "Too many requests. Please wait before trying again.";
        }

        toast({
          title: "Error",
          description,
          variant: "destructive"
        });
      }

      // Call custom error handler if provided
      options?.onError?.(error, variables, context);
    },
    ...options
  });
}

/**
 * Essential Hook #3: Simplified pagination for lists
 * 
 * @param queryKey Base query key
 * @param url Base API endpoint URL
 * @param page Current page number (1-indexed)
 * @param limit Items per page
 * @param responseSchema Optional Zod schema for response validation
 * @param options Additional React Query options
 */
export function usePaginatedApiQuery<T>(
  queryKey: (string | number | boolean)[],
  url: string,
  page: number,
  limit: number,
  responseSchema?: z.ZodSchema<{ data: T[]; total: number; page: number; limit: number }>,
  options?: Omit<UseQueryOptions<{ data: T[]; total: number; page: number; limit: number }, ApiError>, 'queryKey' | 'queryFn'>
) {
  const paginatedQueryKey = [...queryKey, 'paginated', page, limit];
  const paginatedUrl = `${url}?page=${page}&limit=${limit}`;
  
  return useApiQuery(paginatedQueryKey, paginatedUrl, responseSchema, options);
}

/**
 * Convenience hooks for common HTTP methods - simplified from original complex set
 */

// GET requests
export const useApiGet = <T>(
  queryKey: (string | number | boolean)[],
  url: string,
  responseSchema?: z.ZodSchema<T>,
  options?: Omit<UseQueryOptions<T, ApiError>, 'queryKey' | 'queryFn'>
) => useApiQuery(queryKey, url, responseSchema, options);

// POST requests
export const useApiPost = <TData, TVariables = void>(
  url: string,
  responseSchema?: z.ZodSchema<TData>,
  options?: UseMutationOptions<TData, ApiError, TVariables>
) => useApiMutation<TData, TVariables>(
  (variables) => api.post<TData>(url, variables, responseSchema),
  options
);

// PUT requests
export const useApiPut = <TData, TVariables = void>(
  url: string,
  responseSchema?: z.ZodSchema<TData>,
  options?: UseMutationOptions<TData, ApiError, TVariables>
) => useApiMutation<TData, TVariables>(
  (variables) => api.put<TData>(url, variables, responseSchema),
  options
);

// PATCH requests
export const useApiPatch = <TData, TVariables = void>(
  url: string,
  responseSchema?: z.ZodSchema<TData>,
  options?: UseMutationOptions<TData, ApiError, TVariables>
) => useApiMutation<TData, TVariables>(
  (variables) => api.patch<TData>(url, variables, responseSchema),
  options
);

// DELETE requests
export const useApiDelete = <TData = void>(
  url: string,
  responseSchema?: z.ZodSchema<TData>,
  options?: UseMutationOptions<TData, ApiError, void>
) => useApiMutation<TData, void>(
  () => api.delete<TData>(url, responseSchema),
  options
);

/**
 * Legacy Compatibility Exports
 * 
 * These provide backward compatibility during the Phase 3 transition.
 * Components using these hooks will continue to work without changes.
 */

// Legacy pagination hook - maps to new simplified version
export const usePaginatedQuery = usePaginatedApiQuery;

// Legacy dependent query - simplified to basic conditional query
export function useDependentQuery<T, TDep>(
  queryKey: (string | number | boolean)[],
  url: string,
  dependency: TDep | undefined,
  responseSchema?: z.ZodSchema<T>,
  options?: Omit<UseQueryOptions<T, ApiError>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  return useApiQuery(
    queryKey,
    url,
    responseSchema,
    {
      enabled: dependency !== undefined,
      ...options
    }
  );
}

/**
 * Phase 3 Complexity Reduction Summary:
 * 
 * REMOVED (Overengineered):
 * - useInfiniteApiQuery: Complex infinite scrolling
 * - useResilientQuery: Circuit breaker patterns  
 * - useQueryComposition: Multi-step query chaining
 * - useCachedQuery: Complex TTL caching systems
 * - useOptimisticMutation: Advanced optimistic updates
 * - usePollingQuery: Real-time polling
 * - useBatchQuery: Batch request processing
 * - useBatchMutation: Batch mutation processing
 * - useTransformedQuery: Data transformation layers
 * - useAggregatedQuery: Data aggregation
 * - useAuthenticatedQuery: Auth-specific query logic
 * 
 * KEPT (Essential):
 * - useApiQuery: Simple, reliable GET requests
 * - useApiMutation: Simple, reliable mutations
 * - usePaginatedApiQuery: Basic pagination
 * - Convenience HTTP method hooks
 * - Basic legacy compatibility
 * 
 * Result: ~1300 lines → ~170 lines (87% reduction in code complexity)
 */
