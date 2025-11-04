import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { api } from '@/lib/api-client';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  currency: string;
  tierLevel: number;
  features: string[];
  maxUniversities: number;
  maxCountries: number;
}

interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: string;
  isLifetime: boolean;
  tierLevel: number;
  startedAt: string;
  expiresAt: string | null;
}

interface SubscriptionWithPlan {
  subscription: UserSubscription;
  plan: SubscriptionPlan;
}

export function useUserSubscription() {
  const { user } = useAuth();

  return useQuery<SubscriptionWithPlan | null>({
    queryKey: ['user-subscription', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      try {
        const response = await api.get('/api/subscription/user/subscription');
        return response as SubscriptionWithPlan;
      } catch (error: any) {
        if (error?.status === 404 || error?.code === 'NOT_FOUND') {
          return null;
        }
        throw error;
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}
