/**
 * Partner System API Hooks
 * 
 * React Query hooks for partner-related API calls.
 * Follows the established pattern from api-hooks.ts
 */

import { useApiQuery, useApiMutation } from '@/hooks/api-hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api-client';
import type {
  PartnerDashboardStats,
  ReferralLinkWithStats,
  ReferralLinkCreatedResponse,
  CommissionWithDetails,
  PayoutWithCommissions,
  PartnerProfile,
  UpdatePartnerProfileRequest,
  CreateReferralLinkRequest,
  PartnerWithUser,
} from '@shared/types/partner-types';

// ============================================================================
// PARTNER PROFILE HOOKS
// ============================================================================

/**
 * Fetch partner profile
 */
export function usePartnerProfile() {
  return useApiQuery<PartnerProfile>(
    ['/api/partner/profile'],
    '/api/partner/profile',
    undefined,
    { staleTime: 5 * 60 * 1000 }
  );
}

/**
 * Update partner profile
 */
export function useUpdatePartnerProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useApiMutation<PartnerProfile, UpdatePartnerProfileRequest>(
    async (data) => {
      const response = await api.put('/api/partner/profile', data);
      return response as PartnerProfile;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/partner/profile'] });
        toast({
          title: 'Success',
          description: 'Profile updated successfully',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to update profile',
          variant: 'destructive',
        });
      },
    }
  );
}

// ============================================================================
// DASHBOARD HOOKS
// ============================================================================

/**
 * Fetch partner dashboard statistics
 */
export function usePartnerDashboardStats() {
  return useApiQuery<PartnerDashboardStats>(
    ['/api/partner/dashboard-stats'],
    '/api/partner/dashboard-stats',
    undefined,
    { staleTime: 2 * 60 * 1000 }
  );
}

// ============================================================================
// REFERRAL LINK HOOKS
// ============================================================================

/**
 * Fetch all referral links with stats
 */
export function useReferralLinks() {
  return useApiQuery<ReferralLinkWithStats[]>(
    ['/api/partner/referral-links'],
    '/api/partner/referral-links',
    undefined,
    { staleTime: 1 * 60 * 1000 }
  );
}

/**
 * Create new referral link
 */
export function useCreateReferralLink() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useApiMutation<ReferralLinkCreatedResponse, CreateReferralLinkRequest>(
    async (data) => {
      const response = await api.post('/api/partner/referral-links', data);
      return response as ReferralLinkCreatedResponse;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/partner/referral-links'] });
        queryClient.invalidateQueries({ queryKey: ['/api/partner/dashboard-stats'] });
        toast({
          title: 'Success',
          description: 'Referral link created successfully',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to create referral link',
          variant: 'destructive',
        });
      },
    }
  );
}

/**
 * Update referral link
 */
export function useUpdateReferralLink() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useApiMutation<void, { linkId: string; updates: Partial<CreateReferralLinkRequest> }>(
    async ({ linkId, updates }) => {
      await api.put(`/api/partner/referral-links/${linkId}`, updates);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/partner/referral-links'] });
        toast({
          title: 'Success',
          description: 'Referral link updated successfully',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to update referral link',
          variant: 'destructive',
        });
      },
    }
  );
}

/**
 * Deactivate referral link
 */
export function useDeactivateReferralLink() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useApiMutation<void, string>(
    async (linkId) => {
      await api.delete(`/api/partner/referral-links/${linkId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/partner/referral-links'] });
        queryClient.invalidateQueries({ queryKey: ['/api/partner/dashboard-stats'] });
        toast({
          title: 'Success',
          description: 'Referral link deactivated',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to deactivate referral link',
          variant: 'destructive',
        });
      },
    }
  );
}

// ============================================================================
// COMMISSION HOOKS
// ============================================================================

/**
 * Fetch pending commissions
 */
export function usePendingCommissions() {
  return useApiQuery<CommissionWithDetails[]>(
    ['/api/partner/commissions/pending'],
    '/api/partner/commissions/pending',
    undefined,
    { staleTime: 30 * 1000 }
  );
}

/**
 * Fetch commission history
 */
export function useCommissionHistory() {
  return useApiQuery<CommissionWithDetails[]>(
    ['/api/partner/commissions/history'],
    '/api/partner/commissions/history',
    undefined,
    { staleTime: 2 * 60 * 1000 }
  );
}

// ============================================================================
// PAYOUT HOOKS
// ============================================================================

/**
 * Fetch payout history
 */
export function usePayoutHistory() {
  return useApiQuery<PayoutWithCommissions[]>(
    ['/api/partner/payouts'],
    '/api/partner/payouts',
    undefined,
    { staleTime: 2 * 60 * 1000 }
  );
}

/**
 * Request new payout
 */
export function useRequestPayout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useApiMutation<void, { commissionIds: string[]; payoutMethod: string; notes?: string }>(
    async (data) => {
      await api.post('/api/partner/payouts', data);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/partner/payouts'] });
        queryClient.invalidateQueries({ queryKey: ['/api/partner/commissions/pending'] });
        queryClient.invalidateQueries({ queryKey: ['/api/partner/dashboard-stats'] });
        toast({
          title: 'Success',
          description: 'Payout request submitted successfully',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to request payout',
          variant: 'destructive',
        });
      },
    }
  );
}

// ============================================================================
// ADMIN PARTNER HOOKS
// ============================================================================

/**
 * Fetch all partners (Admin only)
 */
export function useAllPartners() {
  return useApiQuery<PartnerWithUser[]>(
    ['/api/admin/partners'],
    '/api/admin/partners',
    undefined,
    { staleTime: 5 * 60 * 1000 }
  );
}

/**
 * Verify partner (Admin only)
 */
export function useVerifyPartner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useApiMutation<void, string>(
    async (partnerId) => {
      await api.post(`/api/admin/partners/${partnerId}/verify`, {});
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/partners'] });
        toast({
          title: 'Success',
          description: 'Partner verified successfully',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to verify partner',
          variant: 'destructive',
        });
      },
    }
  );
}

/**
 * Deactivate partner (Admin only)
 */
export function useDeactivatePartner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useApiMutation<void, { partnerId: string; reason: string }>(
    async ({ partnerId, reason }) => {
      await api.post(`/api/admin/partners/${partnerId}/deactivate`, { reason });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/partners'] });
        toast({
          title: 'Success',
          description: 'Partner deactivated',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to deactivate partner',
          variant: 'destructive',
        });
      },
    }
  );
}

// ============================================================================
// ADMIN ANALYTICS HOOKS
// ============================================================================

/**
 * Fetch partner analytics (Admin only)
 */
export function usePartnerAnalytics() {
  return useApiQuery<any>(
    ['/api/admin/partners/analytics'],
    '/api/admin/partners/analytics',
    undefined,
    { staleTime: 2 * 60 * 1000 }
  );
}

// ============================================================================
// ADMIN REFERRAL HOOKS
// ============================================================================

/**
 * Fetch all referrals (Admin only)
 */
export function useAllReferrals() {
  return useApiQuery<any[]>(
    ['/api/admin/partners/referrals'],
    '/api/admin/partners/referrals',
    undefined,
    { staleTime: 1 * 60 * 1000 }
  );
}

/**
 * Approve referral (Admin only)
 */
export function useApproveReferral() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useApiMutation<void, { referralId: string }>(
    async ({ referralId }) => {
      await api.post('/api/admin/partners/referrals/approve', { referralId });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/partners/referrals'] });
        toast({
          title: 'Success',
          description: 'Referral approved successfully',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to approve referral',
          variant: 'destructive',
        });
      },
    }
  );
}

/**
 * Reject referral (Admin only)
 */
export function useRejectReferral() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useApiMutation<void, { referralId: string; reason: string }>(
    async ({ referralId, reason }) => {
      await api.post('/api/admin/partners/referrals/reject', { referralId, reason });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/partners/referrals'] });
        toast({
          title: 'Success',
          description: 'Referral rejected',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to reject referral',
          variant: 'destructive',
        });
      },
    }
  );
}

// ============================================================================
// ADMIN COMMISSION HOOKS
// ============================================================================

/**
 * Approve commissions (Admin only)
 */
export function useApproveCommissions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useApiMutation<void, { commissionIds: string[]; notes?: string }>(
    async (data) => {
      await api.post('/api/admin/commissions/approve', data);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/commissions'] });
        toast({
          title: 'Success',
          description: 'Commissions approved successfully',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to approve commissions',
          variant: 'destructive',
        });
      },
    }
  );
}

/**
 * Reject commissions (Admin only)
 */
export function useRejectCommissions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useApiMutation<void, { commissionIds: string[]; reason: string }>(
    async (data) => {
      await api.post('/api/admin/commissions/reject', data);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/commissions'] });
        toast({
          title: 'Success',
          description: 'Commissions rejected',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to reject commissions',
          variant: 'destructive',
        });
      },
    }
  );
}

// ============================================================================
// ADMIN PAYOUT HOOKS
// ============================================================================

/**
 * Process bank payout (Admin only)
 */
export function useProcessBankPayout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useApiMutation<void, { payoutId: string; referenceId: string }>(
    async ({ payoutId, referenceId }) => {
      await api.post(`/api/admin/payouts/${payoutId}/process-bank`, { referenceId });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/payouts'] });
        toast({
          title: 'Success',
          description: 'Bank payout processing started',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to process bank payout',
          variant: 'destructive',
        });
      },
    }
  );
}

/**
 * Process PayPal payout (Admin only)
 */
export function useProcessPaypalPayout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useApiMutation<void, { payoutId: string; referenceId: string }>(
    async ({ payoutId, referenceId }) => {
      await api.post(`/api/admin/payouts/${payoutId}/process-paypal`, { referenceId });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/payouts'] });
        toast({
          title: 'Success',
          description: 'PayPal payout processing started',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to process PayPal payout',
          variant: 'destructive',
        });
      },
    }
  );
}

/**
 * Complete payout (Admin only)
 */
export function useCompletePayout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useApiMutation<void, string>(
    async (payoutId) => {
      await api.post(`/api/admin/payouts/${payoutId}/complete`, {});
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/payouts'] });
        toast({
          title: 'Success',
          description: 'Payout marked as completed',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to complete payout',
          variant: 'destructive',
        });
      },
    }
  );
}

/**
 * Cancel payout (Admin only)
 */
export function useCancelPayout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useApiMutation<void, { payoutId: string; reason: string }>(
    async ({ payoutId, reason }) => {
      await api.post(`/api/admin/payouts/${payoutId}/cancel`, { reason });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/payouts'] });
        toast({
          title: 'Success',
          description: 'Payout cancelled',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to cancel payout',
          variant: 'destructive',
        });
      },
    }
  );
}
