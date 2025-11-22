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

interface Payment {
  id: string;
  userId: string;
  subscriptionId: string;
  orderId: string;
  paymentReference: string;
  amount: string;
  currency: string;
  status: string;
  paidAt: string | null;
  createdAt: string | null;
}

interface SubscriptionWithPlanAndPayment {
  subscription: UserSubscription;
  plan: SubscriptionPlan;
  payment: Payment | null;
}

export function useUserSubscription() {
  const { user } = useAuth();

  return useQuery<SubscriptionWithPlanAndPayment | null>({
    queryKey: ['user-subscription', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      try {
        const response = await api.get('/api/subscription/user/subscription');
        return response as SubscriptionWithPlanAndPayment;
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
