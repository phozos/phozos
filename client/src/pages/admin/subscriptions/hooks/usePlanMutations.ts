/**
 * Custom hook for managing subscription plan mutations
 * Extracted from SubscriptionPlans.tsx as part of P2.4 refactoring
 * Consolidates all plan CRUD operations with consistent error handling
 */
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useApiMutation } from '@/hooks/api-hooks';
import { api } from '@/lib/api-client';

export function usePlanMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createPlanMutation = useApiMutation(
    async (data: any) => await api.post('/api/admin/subscription-plans', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
        toast({ title: "Success", description: "Plan created successfully" });
      },
      onError: (error: any) => {
        toast({ 
          title: "Error", 
          description: error.message || "Failed to create plan",
          variant: "destructive"
        });
      }
    }
  );
  
  const updatePlanMutation = useApiMutation(
    async ({ id, data }: { id: string; data: any }) => 
      await api.put(`/api/admin/subscription-plans/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
        toast({ title: "Success", description: "Plan updated successfully" });
      },
      onError: (error: any) => {
        toast({ 
          title: "Error", 
          description: error.message || "Failed to update plan",
          variant: "destructive"
        });
      }
    }
  );
  
  const deletePlanMutation = useApiMutation(
    async (id: string) => await api.delete(`/api/admin/subscription-plans/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
        toast({ title: "Success", description: "Plan deleted successfully" });
      },
      onError: (error: any) => {
        toast({ 
          title: "Error", 
          description: error.message || "Failed to delete plan",
          variant: "destructive"
        });
      }
    }
  );
  
  return {
    createPlan: createPlanMutation.mutate,
    updatePlan: updatePlanMutation.mutate,
    deletePlan: deletePlanMutation.mutate,
    isLoading: createPlanMutation.isPending || updatePlanMutation.isPending || deletePlanMutation.isPending
  };
}
