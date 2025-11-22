import { useApiQuery, useApiMutation } from "@/hooks/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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

export interface CancellationRequestsResponse {
  requests: CancellationRequest[];
  total: number;
  page: number;
  limit: number;
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

export interface RefundsResponse {
  refunds: Refund[];
  total: number;
  page: number;
  limit: number;
}

export interface Dispute {
  id: string;
  paymentId: string;
  subscriptionId: string;
  userId: string;
  type: 'chargeback' | 'dispute';
  reason: string;
  description?: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  amount: string;
  currency: string;
  evidence?: Record<string, any>;
  razorpayDisputeId?: string;
  resolution?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  assignedTo?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DisputesResponse {
  disputes: Dispute[];
  total: number;
  page: number;
  limit: number;
}

export interface RefundStatusResponse {
  id: string;
  status: string;
  razorpayStatus?: string;
  lastUpdated: string;
}

// ============================================================================
// ADMIN SUBSCRIPTIONS
// ============================================================================

export function useAdminSubscriptions(filters?: {
  status?: string;
  userId?: string;
  planId?: string;
  page?: number;
  limit?: number;
}) {
  const queryString = new URLSearchParams(filters as any).toString();
  return useApiQuery(
    ['/api/admin/subscription-management/subscriptions', queryString],
    `/api/admin/subscription-management/subscriptions${queryString ? `?${queryString}` : ''}`,
    undefined,
    { staleTime: 30000 }
  );
}

export function useAdminSubscriptionDetails(id: string) {
  return useApiQuery(
    [`/api/admin/subscription-management/subscriptions/${id}`],
    `/api/admin/subscription-management/subscriptions/${id}`,
    undefined,
    { enabled: !!id }
  );
}

export function useForceCancelSubscription() {
  const queryClient = useQueryClient();
  return useApiMutation(
    ({ id, data }: { id: string; data: any }) =>
      api.patch(`/api/admin/subscription-management/subscriptions/${id}/force-cancel`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-management/subscriptions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-management/analytics'] });
      }
    }
  );
}

export function useForceRefund() {
  const queryClient = useQueryClient();
  return useApiMutation(
    ({ id, data }: { id: string; data: any }) =>
      api.patch(`/api/admin/subscription-management/subscriptions/${id}/force-refund`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-management/subscriptions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-management/refund-requests'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-management/analytics'] });
      }
    }
  );
}

// ============================================================================
// CANCELLATION REQUESTS
// ============================================================================

export function useAdminCancellationRequests(filters?: {
  status?: string;
  userId?: string;
  page?: number;
  limit?: number;
}) {
  const queryString = new URLSearchParams(filters as any).toString();
  return useApiQuery<CancellationRequestsResponse>(
    ['/api/admin/subscription-management/cancellation-requests', queryString],
    `/api/admin/subscription-management/cancellation-requests${queryString ? `?${queryString}` : ''}`,
    undefined,
    { staleTime: 30000 }
  );
}

export function useAdminCancellationRequest(id: string) {
  return useApiQuery<CancellationRequest>(
    [`/api/admin/subscription-management/cancellation-requests/${id}`],
    `/api/admin/subscription-management/cancellation-requests/${id}`,
    undefined,
    { enabled: !!id }
  );
}

export function useApproveCancellation() {
  const queryClient = useQueryClient();
  return useApiMutation(
    ({ id, adminNotes }: { id: string; adminNotes?: string }) =>
      api.patch(`/api/admin/subscription-management/cancellation-requests/${id}/approve`, { adminNotes }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-management/cancellation-requests'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-management/analytics'] });
      }
    }
  );
}

export function useRejectCancellation() {
  const queryClient = useQueryClient();
  return useApiMutation(
    ({ id, adminNotes }: { id: string; adminNotes: string }) =>
      api.patch(`/api/admin/subscription-management/cancellation-requests/${id}/reject`, { adminNotes }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-management/cancellation-requests'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-management/analytics'] });
      }
    }
  );
}

// ============================================================================
// REFUND REQUESTS
// ============================================================================

export function useAdminRefundRequests(filters?: {
  status?: string;
  userId?: string;
  page?: number;
  limit?: number;
}) {
  const queryString = new URLSearchParams(filters as any).toString();
  return useApiQuery<RefundsResponse>(
    ['/api/admin/subscription-management/refund-requests', queryString],
    `/api/admin/subscription-management/refund-requests${queryString ? `?${queryString}` : ''}`,
    undefined,
    { staleTime: 30000 }
  );
}

export function useAdminRefundRequest(id: string) {
  return useApiQuery<Refund>(
    [`/api/admin/subscription-management/refund-requests/${id}`],
    `/api/admin/subscription-management/refund-requests/${id}`,
    undefined,
    { enabled: !!id }
  );
}

export function useApproveRefund() {
  const queryClient = useQueryClient();
  return useApiMutation(
    ({ id, adminNotes }: { id: string; adminNotes?: string }) =>
      api.patch(`/api/admin/subscription-management/refund-requests/${id}/approve`, { adminNotes }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-management/refund-requests'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-management/analytics'] });
      }
    }
  );
}

export function useRejectRefund() {
  const queryClient = useQueryClient();
  return useApiMutation(
    ({ id, adminNotes }: { id: string; adminNotes: string }) =>
      api.patch(`/api/admin/subscription-management/refund-requests/${id}/reject`, { adminNotes }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-management/refund-requests'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-management/analytics'] });
      }
    }
  );
}

export function useProcessRefundManually() {
  const queryClient = useQueryClient();
  return useApiMutation(
    (id: string) =>
      api.post(`/api/admin/subscription-management/refund-requests/${id}/process`, {}),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-management/refund-requests'] });
      }
    }
  );
}

export function useRefundStatus(id: string) {
  return useApiQuery<RefundStatusResponse>(
    [`/api/admin/subscription-management/refund-requests/${id}/status`],
    `/api/admin/subscription-management/refund-requests/${id}/status`,
    undefined,
    { enabled: !!id, refetchInterval: 10000 }
  );
}

// ============================================================================
// DISPUTES
// ============================================================================

export function useAdminDisputes(filters?: {
  status?: string;
  userId?: string;
  page?: number;
  limit?: number;
}) {
  const queryString = new URLSearchParams(filters as any).toString();
  return useApiQuery<DisputesResponse>(
    ['/api/admin/subscription-management/disputes', queryString],
    `/api/admin/subscription-management/disputes${queryString ? `?${queryString}` : ''}`,
    undefined,
    { staleTime: 30000 }
  );
}

export function useAdminDispute(id: string) {
  return useApiQuery<Dispute>(
    [`/api/admin/subscription-management/disputes/${id}`],
    `/api/admin/subscription-management/disputes/${id}`,
    undefined,
    { enabled: !!id }
  );
}

export function useAssignDispute() {
  const queryClient = useQueryClient();
  return useApiMutation(
    ({ id, assignedAdminId }: { id: string; assignedAdminId: string }) =>
      api.patch(`/api/admin/subscription-management/disputes/${id}/assign`, { assignedAdminId }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-management/disputes'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-management/analytics'] });
      }
    }
  );
}

export function useInvestigateDispute() {
  const queryClient = useQueryClient();
  return useApiMutation(
    (id: string) =>
      api.patch(`/api/admin/subscription-management/disputes/${id}/investigate`, {}),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-management/disputes'] });
      }
    }
  );
}

export function useResolveDispute() {
  const queryClient = useQueryClient();
  return useApiMutation(
    ({ id, resolution }: { id: string; resolution: string }) =>
      api.patch(`/api/admin/subscription-management/disputes/${id}/resolve`, { resolution }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-management/disputes'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-management/analytics'] });
      }
    }
  );
}

export function useAddDisputeEvidence() {
  const queryClient = useQueryClient();
  return useApiMutation(
    ({ id, evidence }: { id: string; evidence: any }) =>
      api.post(`/api/admin/subscription-management/disputes/${id}/evidence`, { evidence }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/subscription-management/disputes'] });
      }
    }
  );
}

// ============================================================================
// ANALYTICS
// ============================================================================

export function useSubscriptionManagementAnalytics() {
  return useApiQuery(
    ['/api/admin/subscription-management/analytics'],
    '/api/admin/subscription-management/analytics',
    undefined,
    { staleTime: 60000 }
  );
}
