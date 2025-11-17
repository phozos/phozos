import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { api } from '@/lib/api-client';
import { useToast } from './use-toast';

export interface CancellationRequest {
  id: string;
  subscriptionId: string;
  userId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Refund {
  id: string;
  paymentId: string;
  subscriptionId: string;
  userId: string;
  cancellationRequestId?: string;
  amount: string;
  currency: string;
  reason: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'rejected';
  razorpayRefundId?: string;
  razorpayStatus?: string;
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChargebackDispute {
  id: string;
  paymentId: string;
  subscriptionId: string;
  userId: string;
  type: 'chargeback' | 'dispute';
  reason: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  amount: string;
  currency: string;
  evidence?: Record<string, any>;
  razorpayDisputeId?: string;
  resolution?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionHistory {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startedAt: string;
  expiresAt?: string;
  endDate?: string;
  paidAt?: string;
  amount?: string;
}

export interface RefundEligibility {
  eligible: boolean;
  reason?: string;
  hoursRemaining?: number;
}

export function useUserSubscription() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['subscription', 'me'],
    queryFn: async () => {
      const response = await api.get('/api/subscription/me');
      return response;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

export function useSubscriptionHistory() {
  const { user } = useAuth();

  return useQuery<SubscriptionHistory[]>({
    queryKey: ['subscription', 'history'],
    queryFn: async () => {
      const response = await api.get('/api/subscription/me/history');
      return response as SubscriptionHistory[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCancellationRequests() {
  const { user } = useAuth();

  return useQuery<CancellationRequest[]>({
    queryKey: ['cancellation-requests'],
    queryFn: async () => {
      const response = await api.get('/api/subscription/me/cancel-requests');
      return response as CancellationRequest[];
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000,
  });
}

export function useRefundRequests() {
  const { user } = useAuth();

  return useQuery<Refund[]>({
    queryKey: ['refund-requests'],
    queryFn: async () => {
      const response = await api.get('/api/subscription/me/refund-requests');
      return response as Refund[];
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000,
  });
}

export function useDisputes() {
  const { user } = useAuth();

  return useQuery<ChargebackDispute[]>({
    queryKey: ['disputes'],
    queryFn: async () => {
      const response = await api.get('/api/subscription/me/disputes');
      return response as ChargebackDispute[];
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000,
  });
}

export function useRefundEligibility(paymentId?: string) {
  const { user } = useAuth();

  return useQuery<RefundEligibility>({
    queryKey: ['refund-eligibility', paymentId],
    queryFn: async () => {
      const response = await api.get(`/api/subscription/me/refund-eligibility?paymentId=${paymentId}`);
      return response as RefundEligibility;
    },
    enabled: !!user && !!paymentId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useCreateCancellationRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { subscriptionId: string; reason: string }) => {
      const response = await api.post('/api/subscription/me/cancel-request', data);
      return response as CancellationRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cancellation-requests'] });
      queryClient.invalidateQueries({ queryKey: ['subscription', 'me'] });
      toast({
        title: 'Cancellation Request Submitted',
        description: 'Your cancellation request has been submitted and is pending admin approval.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Request Failed',
        description: error.message || 'Failed to submit cancellation request. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useCreateRefundRequest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      subscriptionId: string;
      paymentId: string;
      amount: string;
      reason: string;
    }) => {
      const response = await api.post('/api/subscription/me/refund-request', data);
      return response as Refund;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refund-requests'] });
      queryClient.invalidateQueries({ queryKey: ['subscription', 'me'] });
      toast({
        title: 'Refund Request Submitted',
        description: 'Your refund request has been submitted and is pending admin approval.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Request Failed',
        description: error.message || 'Failed to submit refund request. Please check eligibility and try again.',
        variant: 'destructive',
      });
    },
  });
}

export function useCreateDispute() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      subscriptionId: string;
      paymentId: string;
      type: 'chargeback' | 'dispute';
      reason: string;
      amount: string;
    }) => {
      const response = await api.post('/api/subscription/me/dispute', data);
      return response as ChargebackDispute;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      toast({
        title: 'Dispute Submitted',
        description: 'Your dispute has been submitted and will be reviewed by our team.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Submission Failed',
        description: error.message || 'Failed to submit dispute. Please try again.',
        variant: 'destructive',
      });
    },
  });
}
