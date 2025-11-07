/**
 * useFeatureAccess Hook Tests
 * 
 * Comprehensive tests for the useFeatureAccess hook including:
 * - Snapshot-first pattern
 * - Feature access checks
 * - Quota information
 * - Loading states
 * - Edge cases
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  useFeatureAccess, 
  useQuotaInfo, 
  useHasAnyFeature, 
  useHasAllFeatures 
} from '../useFeatureAccess';
import * as useUserSubscriptionModule from '../useUserSubscription';

// Mock useUserSubscription
vi.mock('../useUserSubscription');

describe('useFeatureAccess', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('Basic Feature Access', () => {
    it('should return hasAccess=true when user has the feature', () => {
      vi.spyOn(useUserSubscriptionModule, 'useUserSubscription').mockReturnValue({
        data: {
          subscription: {
            id: 'sub-123',
            userId: 'user-123',
            planId: 'plan-123',
            status: 'active',
            isLifetime: true,
            tierLevel: 2,
            subscribedPlanSnapshot: null,
            universitiesUsed: 0,
            countriesUsed: 0
          },
          plan: {
            id: 'plan-123',
            name: 'Premium',
            price: '199',
            currency: 'INR',
            tierLevel: 2,
            features: [],
            maxUniversities: 10,
            maxCountries: 5,
            includeLoanAssistance: true,
            includeVisaSupport: false
          }
        } as any,
        isLoading: false,
        error: null,
        isError: false
      } as any);

      const { result } = renderHook(
        () => useFeatureAccess('includeLoanAssistance'),
        { wrapper }
      );

      expect(result.current.hasAccess).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.upgradeRequired).toBe(false);
      expect(result.current.currentPlan).toBe('Premium');
      expect(result.current.featureValue).toBe(true);
    });

    it('should return hasAccess=false when user lacks the feature', () => {
      vi.spyOn(useUserSubscriptionModule, 'useUserSubscription').mockReturnValue({
        data: {
          subscription: {
            id: 'sub-123',
            userId: 'user-123',
            planId: 'plan-123',
            status: 'active',
            isLifetime: true,
            subscribedPlanSnapshot: null
          },
          plan: {
            id: 'plan-123',
            name: 'Basic',
            includeLoanAssistance: false,
            includeVisaSupport: false
          }
        } as any,
        isLoading: false
      } as any);

      const { result } = renderHook(
        () => useFeatureAccess('includeLoanAssistance'),
        { wrapper }
      );

      expect(result.current.hasAccess).toBe(false);
      expect(result.current.upgradeRequired).toBe(true);
    });
  });

  describe('Snapshot-First Pattern (Grandfathering)', () => {
    it('should use snapshot features when snapshot exists', () => {
      vi.spyOn(useUserSubscriptionModule, 'useUserSubscription').mockReturnValue({
        data: {
          subscription: {
            id: 'sub-123',
            userId: 'user-123',
            planId: 'plan-123',
            status: 'active',
            isLifetime: true,
            subscribedPlanSnapshot: {
              id: 'plan-123',
              name: 'Premium v1',
              includeLoanAssistance: true, // Grandfathered
              includeVisaSupport: true,    // Grandfathered
              maxUniversities: 15           // Grandfathered
            }
          },
          plan: {
            id: 'plan-123',
            name: 'Premium v2',
            includeLoanAssistance: false,  // Current plan doesn't have this
            includeVisaSupport: false,     // Current plan doesn't have this
            maxUniversities: 10            // Current plan has lower limit
          }
        } as any,
        isLoading: false
      } as any);

      const { result } = renderHook(
        () => useFeatureAccess('includeLoanAssistance'),
        { wrapper }
      );

      // Should use snapshot value (true), not current plan value (false)
      expect(result.current.hasAccess).toBe(true);
      expect(result.current.featureValue).toBe(true);
    });

    it('should fallback to live plan when snapshot does not exist', () => {
      vi.spyOn(useUserSubscriptionModule, 'useUserSubscription').mockReturnValue({
        data: {
          subscription: {
            id: 'sub-123',
            userId: 'user-123',
            planId: 'plan-123',
            status: 'active',
            isLifetime: true,
            subscribedPlanSnapshot: null // No snapshot
          },
          plan: {
            id: 'plan-123',
            name: 'Premium',
            includeLoanAssistance: true,
            maxUniversities: 10
          }
        } as any,
        isLoading: false
      } as any);

      const { result } = renderHook(
        () => useFeatureAccess('includeLoanAssistance'),
        { wrapper }
      );

      // Should use live plan value
      expect(result.current.hasAccess).toBe(true);
    });
  });

  describe('Loading States', () => {
    it('should return isLoading=true when subscription is loading', () => {
      vi.spyOn(useUserSubscriptionModule, 'useUserSubscription').mockReturnValue({
        data: null,
        isLoading: true
      } as any);

      const { result } = renderHook(
        () => useFeatureAccess('includeLoanAssistance'),
        { wrapper }
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.hasAccess).toBe(false);
    });

    it('should handle no subscription gracefully', () => {
      vi.spyOn(useUserSubscriptionModule, 'useUserSubscription').mockReturnValue({
        data: null,
        isLoading: false
      } as any);

      const { result } = renderHook(
        () => useFeatureAccess('includeLoanAssistance'),
        { wrapper }
      );

      expect(result.current.hasAccess).toBe(false);
      expect(result.current.upgradeRequired).toBe(true);
      expect(result.current.currentPlan).toBe('Free');
    });
  });

  describe('Feature Types', () => {
    it('should handle boolean features correctly', () => {
      vi.spyOn(useUserSubscriptionModule, 'useUserSubscription').mockReturnValue({
        data: {
          subscription: { status: 'active', subscribedPlanSnapshot: null },
          plan: { includeLoanAssistance: true }
        } as any,
        isLoading: false
      } as any);

      const { result } = renderHook(
        () => useFeatureAccess('includeLoanAssistance'),
        { wrapper }
      );

      expect(result.current.hasAccess).toBe(true);
    });

    it('should handle numeric features (quotas) correctly', () => {
      vi.spyOn(useUserSubscriptionModule, 'useUserSubscription').mockReturnValue({
        data: {
          subscription: { status: 'active', subscribedPlanSnapshot: null },
          plan: { maxUniversities: 10 }
        } as any,
        isLoading: false
      } as any);

      const { result } = renderHook(
        () => useFeatureAccess('maxUniversities'),
        { wrapper }
      );

      expect(result.current.hasAccess).toBe(true);
      expect(result.current.featureValue).toBe(10);
    });

    it('should handle JSONB array features correctly', () => {
      vi.spyOn(useUserSubscriptionModule, 'useUserSubscription').mockReturnValue({
        data: {
          subscription: { status: 'active', subscribedPlanSnapshot: null },
          plan: { 
            features: ['Feature A', 'Feature B', 'Feature C']
          }
        } as any,
        isLoading: false
      } as any);

      const { result } = renderHook(
        () => useFeatureAccess('Feature B'),
        { wrapper }
      );

      expect(result.current.hasAccess).toBe(true);
    });
  });
});

describe('useQuotaInfo', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should calculate quota correctly from snapshot', () => {
    vi.spyOn(useUserSubscriptionModule, 'useUserSubscription').mockReturnValue({
      data: {
        subscription: {
          status: 'active',
          subscribedPlanSnapshot: {
            maxUniversities: 15
          },
          universitiesUsed: 5
        },
        plan: {
          maxUniversities: 10 // Should be ignored
        }
      } as any,
      isLoading: false
    } as any);

    const { result } = renderHook(
      () => useQuotaInfo('universities'),
      { wrapper }
    );

    expect(result.current.limit).toBe(15); // From snapshot
    expect(result.current.used).toBe(5);
    expect(result.current.remaining).toBe(10);
    expect(result.current.canAdd).toBe(true);
  });

  it('should handle unlimited quotas correctly', () => {
    vi.spyOn(useUserSubscriptionModule, 'useUserSubscription').mockReturnValue({
      data: {
        subscription: {
          status: 'active',
          subscribedPlanSnapshot: null,
          universitiesUsed: 100
        },
        plan: {
          maxUniversities: 999
        }
      } as any,
      isLoading: false
    } as any);

    const { result } = renderHook(
      () => useQuotaInfo('universities'),
      { wrapper }
    );

    expect(result.current.isUnlimited).toBe(true);
    expect(result.current.canAdd).toBe(true);
  });

  it('should handle quota exceeded state', () => {
    vi.spyOn(useUserSubscriptionModule, 'useUserSubscription').mockReturnValue({
      data: {
        subscription: {
          status: 'active',
          subscribedPlanSnapshot: null,
          universitiesUsed: 10
        },
        plan: {
          maxUniversities: 10
        }
      } as any,
      isLoading: false
    } as any);

    const { result } = renderHook(
      () => useQuotaInfo('universities'),
      { wrapper }
    );

    expect(result.current.remaining).toBe(0);
    expect(result.current.canAdd).toBe(false);
  });
});

describe('useHasAnyFeature', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should return true if user has any of the features', () => {
    vi.spyOn(useUserSubscriptionModule, 'useUserSubscription').mockReturnValue({
      data: {
        subscription: { status: 'active', subscribedPlanSnapshot: null },
        plan: {
          includeLoanAssistance: false,
          includeVisaSupport: true,
          includeCounselorSession: false
        }
      } as any,
      isLoading: false
    } as any);

    const { result } = renderHook(
      () => useHasAnyFeature([
        'includeLoanAssistance',
        'includeVisaSupport',
        'includeCounselorSession'
      ]),
      { wrapper }
    );

    expect(result.current).toBe(true);
  });

  it('should return false if user has none of the features', () => {
    vi.spyOn(useUserSubscriptionModule, 'useUserSubscription').mockReturnValue({
      data: {
        subscription: { status: 'active', subscribedPlanSnapshot: null },
        plan: {
          includeLoanAssistance: false,
          includeVisaSupport: false,
          includeCounselorSession: false
        }
      } as any,
      isLoading: false
    } as any);

    const { result } = renderHook(
      () => useHasAnyFeature([
        'includeLoanAssistance',
        'includeVisaSupport',
        'includeCounselorSession'
      ]),
      { wrapper }
    );

    expect(result.current).toBe(false);
  });
});

describe('useHasAllFeatures', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('should return true if user has all of the features', () => {
    vi.spyOn(useUserSubscriptionModule, 'useUserSubscription').mockReturnValue({
      data: {
        subscription: { status: 'active', subscribedPlanSnapshot: null },
        plan: {
          includeLoanAssistance: true,
          includeVisaSupport: true,
          includeCounselorSession: true
        }
      } as any,
      isLoading: false
    } as any);

    const { result } = renderHook(
      () => useHasAllFeatures([
        'includeLoanAssistance',
        'includeVisaSupport',
        'includeCounselorSession'
      ]),
      { wrapper }
    );

    expect(result.current).toBe(true);
  });

  it('should return false if user lacks any of the features', () => {
    vi.spyOn(useUserSubscriptionModule, 'useUserSubscription').mockReturnValue({
      data: {
        subscription: { status: 'active', subscribedPlanSnapshot: null },
        plan: {
          includeLoanAssistance: true,
          includeVisaSupport: false, // Missing this one
          includeCounselorSession: true
        }
      } as any,
      isLoading: false
    } as any);

    const { result } = renderHook(
      () => useHasAllFeatures([
        'includeLoanAssistance',
        'includeVisaSupport',
        'includeCounselorSession'
      ]),
      { wrapper }
    );

    expect(result.current).toBe(false);
  });
});
