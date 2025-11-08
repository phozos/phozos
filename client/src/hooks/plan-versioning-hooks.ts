import { useApiQuery, useApiMutation } from "@/hooks/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function usePlanVersionHistory<T = any>(basePlanId: string) {
  return useApiQuery<T>(
    [`/api/admin/subscription-plans/${basePlanId}/versions/history`],
    `/api/admin/subscription-plans/${basePlanId}/versions/history`,
    undefined,
    { enabled: !!basePlanId }
  );
}

export function useCreatePriceVersion() {
  const queryClient = useQueryClient();
  
  return useApiMutation(
    ({ basePlanId, data }: { basePlanId: string; data: any }) =>
      api.post(`/api/admin/subscription-plans/${basePlanId}/price`, data),
    {
      onSuccess: (_result, variables) => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
        queryClient.invalidateQueries({ queryKey: [`/api/admin/subscription-plans/${variables.basePlanId}/versions/history`] });
        queryClient.invalidateQueries({ predicate: (query) => 
          query.queryKey[0]?.toString().includes('/analytics') || false
        });
      }
    }
  );
}

export function useDeprecatePlan() {
  const queryClient = useQueryClient();
  
  return useApiMutation(
    ({ planId, data }: { planId: string; data: any }) =>
      api.post(`/api/admin/subscription-plans/${planId}/deprecate`, data),
    {
      onSuccess: (_result, variables) => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
        queryClient.invalidateQueries({ predicate: (query) => 
          query.queryKey[0]?.toString().includes(`/subscription-plans/${variables.planId}`) || false
        });
        queryClient.invalidateQueries({ predicate: (query) => 
          query.queryKey[0]?.toString().includes('/analytics') || false
        });
      }
    }
  );
}

export function useMigrations<T = any[]>() {
  return useApiQuery<T>(
    ['/api/admin/migrations'],
    '/api/admin/migrations'
  );
}

export function useCreateMigration() {
  const queryClient = useQueryClient();
  
  return useApiMutation(
    (data: any) => api.post('/api/admin/migrations', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/migrations'] });
        queryClient.invalidateQueries({ predicate: (query) => {
          const key = query.queryKey[0]?.toString();
          return (key?.includes('/migrations/') && key?.includes('/stats')) || false;
        }});
      }
    }
  );
}

export function useStartMigration() {
  const queryClient = useQueryClient();
  
  return useApiMutation(
    (migrationId: string) => 
      api.post(`/api/admin/migrations/${migrationId}/start`, {}),
    {
      onSuccess: (_result, migrationId) => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/migrations'] });
        queryClient.invalidateQueries({ queryKey: [`/api/admin/migrations/${migrationId}/stats`] });
      }
    }
  );
}

export function useCancelMigration() {
  const queryClient = useQueryClient();
  
  return useApiMutation(
    (migrationId: string) => 
      api.post(`/api/admin/migrations/${migrationId}/cancel`, {}),
    {
      onSuccess: (_result, migrationId) => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/migrations'] });
        queryClient.invalidateQueries({ queryKey: [`/api/admin/migrations/${migrationId}/stats`] });
      }
    }
  );
}

export function useMigrationStats<T = any>(migrationId: string) {
  return useApiQuery<T>(
    [`/api/admin/migrations/${migrationId}/stats`],
    `/api/admin/migrations/${migrationId}/stats`,
    undefined,
    { enabled: !!migrationId, refetchInterval: 5000 }
  );
}

export function usePlanAnalytics<T = any>(planId: string) {
  return useApiQuery<T>(
    [`/api/admin/subscription-plans/${planId}/analytics`],
    `/api/admin/subscription-plans/${planId}/analytics`,
    undefined,
    { enabled: !!planId }
  );
}
