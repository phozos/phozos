/**
 * Feature Entitlement Service Tests
 * 
 * Comprehensive tests for the feature entitlement service including:
 * - Snapshot-first access pattern
 * - Fallback to live plan
 * - Grandfathered vs non-grandfathered users
 * - Quota calculations
 * - Feature access checks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeatureEntitlementService } from '../feature-entitlement.service';
import type { SubscriptionPlan, UserSubscription } from '../../../../shared/schema';

// Mock repositories
const mockUserSubscriptionRepo = {
  findByUser: vi.fn(),
  findById: vi.fn(),
  findByIdOptional: vi.fn(),
  findByUserWithPlan: vi.fn(),
  findAll: vi.fn(),
  findAllWithDetails: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findActiveByUserId: vi.fn(),
  findByOrderId: vi.fn(),
  hasActiveSubscription: vi.fn()
};

const mockSubscriptionPlanRepo = {
  findAll: vi.fn(),
  findActive: vi.fn(),
  findById: vi.fn(),
  findByIdOptional: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findByTierLevel: vi.fn(),
  findHigherTiers: vi.fn(),
  findLatestVersion: vi.fn(),
  findAllVersions: vi.fn(),
  findVersion: vi.fn(),
  createNewVersion: vi.fn(),
  deprecatePlan: vi.fn(),
  archivePlan: vi.fn(),
  getSubscriberCount: vi.fn()
};

describe('FeatureEntitlementService', () => {
  let service: FeatureEntitlementService;
  
  // Sample test data
  const mockPlanId = '123e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '223e4567-e89b-12d3-a456-426614174000';
  const mockSubscriptionId = '323e4567-e89b-12d3-a456-426614174000';

  const mockLivePlan: SubscriptionPlan = {
    id: mockPlanId,
    name: 'Premium Plan',
    price: '199.00',
    currency: 'INR',
    description: 'Premium features',
    logo: 'premium',
    features: ['Feature A', 'Feature B', 'Feature C'],
    tierLevel: 2,
    isLifetime: true,
    maxUniversities: 10,
    maxCountries: 5,
    universityTier: 'top500',
    supportType: 'whatsapp',
    turnaroundDays: 3,
    includeLoanAssistance: true,
    includeVisaSupport: true,
    includeCounselorSession: true,
    includeScholarshipPlanning: true,
    includeMockInterview: false,
    includeExpertEditing: true,
    includePostAdmitSupport: false,
    includeDedicatedManager: false,
    includeNetworkingEvents: false,
    includeFlightAccommodation: false,
    isBusinessFocused: false,
    displayOrder: 2,
    isActive: true,
    basePlanId: mockPlanId,
    version: 2,
    versionName: 'v2.0',
    isLatestVersion: true,
    deprecatedAt: null,
    archivedAt: null,
    successorPlanId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockSnapshotPlan: SubscriptionPlan = {
    ...mockLivePlan,
    maxUniversities: 15, // Grandfathered - higher than current
    includeMockInterview: true, // Grandfathered feature
    version: 1,
    versionName: 'v1.0'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FeatureEntitlementService(
      mockUserSubscriptionRepo as any,
      mockSubscriptionPlanRepo as any
    );
  });

  describe('getEffectiveFeatures - Snapshot First Pattern', () => {
    it('should use snapshot when user is grandfathered', async () => {
      const mockSubscription: UserSubscription = {
        id: mockSubscriptionId,
        userId: mockUserId,
        planId: mockPlanId,
        status: 'active',
        isLifetime: true,
        tierLevel: 2,
        lifetimeActivatedAt: new Date(),
        highestTierReached: 2,
        startedAt: new Date(),
        expiresAt: null,
        orderId: null,
        paymentReference: null,
        paymentGateway: null,
        autoRenew: null,
        universitiesUsed: 5,
        countriesUsed: 2,
        amountPaid: '199.00',
        currency: 'INR',
        paidAt: new Date(),
        subscribedPlanSnapshot: mockSnapshotPlan,
        grandfatheredPrice: '199.00',
        grandfatheredUntil: null,
        isGrandfathered: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockUserSubscriptionRepo.findByUser.mockResolvedValue(mockSubscription);

      const features = await service.getEffectiveFeatures(mockUserId);

      expect(features).not.toBeNull();
      expect(features?.maxUniversities).toBe(15); // From snapshot, not live plan
      expect(features?.includeMockInterview).toBe(true); // Grandfathered feature
      expect(mockSubscriptionPlanRepo.findById).not.toHaveBeenCalled(); // Should NOT fetch live plan
    });

    it('should use live plan when user is not grandfathered', async () => {
      const mockSubscription: UserSubscription = {
        id: mockSubscriptionId,
        userId: mockUserId,
        planId: mockPlanId,
        status: 'active',
        isLifetime: true,
        tierLevel: 2,
        lifetimeActivatedAt: new Date(),
        highestTierReached: 2,
        startedAt: new Date(),
        expiresAt: null,
        orderId: null,
        paymentReference: null,
        paymentGateway: null,
        autoRenew: null,
        universitiesUsed: 5,
        countriesUsed: 2,
        amountPaid: '199.00',
        currency: 'INR',
        paidAt: new Date(),
        subscribedPlanSnapshot: null,
        grandfatheredPrice: null,
        grandfatheredUntil: null,
        isGrandfathered: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockUserSubscriptionRepo.findByUser.mockResolvedValue(mockSubscription);
      mockSubscriptionPlanRepo.findById.mockResolvedValue(mockLivePlan);

      const features = await service.getEffectiveFeatures(mockUserId);

      expect(features).not.toBeNull();
      expect(features?.maxUniversities).toBe(10); // From live plan
      expect(features?.includeMockInterview).toBe(false); // Not grandfathered
      expect(mockSubscriptionPlanRepo.findById).toHaveBeenCalledWith(mockPlanId);
    });

    it('should use live plan when snapshot exists but isGrandfathered is false', async () => {
      const mockSubscription: UserSubscription = {
        id: mockSubscriptionId,
        userId: mockUserId,
        planId: mockPlanId,
        status: 'active',
        isLifetime: true,
        tierLevel: 2,
        lifetimeActivatedAt: new Date(),
        highestTierReached: 2,
        startedAt: new Date(),
        expiresAt: null,
        orderId: null,
        paymentReference: null,
        paymentGateway: null,
        autoRenew: null,
        universitiesUsed: 5,
        countriesUsed: 2,
        amountPaid: '199.00',
        currency: 'INR',
        paidAt: new Date(),
        subscribedPlanSnapshot: mockSnapshotPlan,
        grandfatheredPrice: null,
        grandfatheredUntil: null,
        isGrandfathered: false, // Not grandfathered despite having snapshot
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockUserSubscriptionRepo.findByUser.mockResolvedValue(mockSubscription);
      mockSubscriptionPlanRepo.findById.mockResolvedValue(mockLivePlan);

      const features = await service.getEffectiveFeatures(mockUserId);

      expect(features).not.toBeNull();
      expect(features?.maxUniversities).toBe(10); // From live plan
      expect(mockSubscriptionPlanRepo.findById).toHaveBeenCalledWith(mockPlanId);
    });

    it('should return null for users without active subscription', async () => {
      mockUserSubscriptionRepo.findByUser.mockResolvedValue(null);

      const features = await service.getEffectiveFeatures(mockUserId);

      expect(features).toBeNull();
    });

    it('should return null for inactive subscriptions', async () => {
      const mockSubscription: UserSubscription = {
        id: mockSubscriptionId,
        userId: mockUserId,
        planId: mockPlanId,
        status: 'expired',
        isLifetime: true,
        tierLevel: 2,
        lifetimeActivatedAt: new Date(),
        highestTierReached: 2,
        startedAt: new Date(),
        expiresAt: new Date(),
        orderId: null,
        paymentReference: null,
        paymentGateway: null,
        autoRenew: null,
        universitiesUsed: 5,
        countriesUsed: 2,
        amountPaid: '199.00',
        currency: 'INR',
        paidAt: new Date(),
        subscribedPlanSnapshot: null,
        grandfatheredPrice: null,
        grandfatheredUntil: null,
        isGrandfathered: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockUserSubscriptionRepo.findByUser.mockResolvedValue(mockSubscription);

      const features = await service.getEffectiveFeatures(mockUserId);

      expect(features).toBeNull();
    });
  });

  describe('hasFeatureAccess', () => {
    beforeEach(() => {
      const mockSubscription: UserSubscription = {
        id: mockSubscriptionId,
        userId: mockUserId,
        planId: mockPlanId,
        status: 'active',
        isLifetime: true,
        tierLevel: 2,
        lifetimeActivatedAt: new Date(),
        highestTierReached: 2,
        startedAt: new Date(),
        expiresAt: null,
        orderId: null,
        paymentReference: null,
        paymentGateway: null,
        autoRenew: null,
        universitiesUsed: 5,
        countriesUsed: 2,
        amountPaid: '199.00',
        currency: 'INR',
        paidAt: new Date(),
        subscribedPlanSnapshot: null,
        grandfatheredPrice: null,
        grandfatheredUntil: null,
        isGrandfathered: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockUserSubscriptionRepo.findByUser.mockResolvedValue(mockSubscription);
      mockSubscriptionPlanRepo.findById.mockResolvedValue(mockLivePlan);
    });

    it('should return true for boolean features user has', async () => {
      const hasAccess = await service.hasFeatureAccess(mockUserId, 'includeLoanAssistance');
      expect(hasAccess).toBe(true);
    });

    it('should return false for boolean features user lacks', async () => {
      const hasAccess = await service.hasFeatureAccess(mockUserId, 'includeMockInterview');
      expect(hasAccess).toBe(false);
    });

    it('should return true for JSONB array features user has', async () => {
      const hasAccess = await service.hasFeatureAccess(mockUserId, 'Feature A');
      expect(hasAccess).toBe(true);
    });

    it('should return false for JSONB array features user lacks', async () => {
      const hasAccess = await service.hasFeatureAccess(mockUserId, 'Feature X');
      expect(hasAccess).toBe(false);
    });

    it('should return false when user has no subscription', async () => {
      mockUserSubscriptionRepo.findByUser.mockResolvedValue(null);
      const hasAccess = await service.hasFeatureAccess(mockUserId, 'includeLoanAssistance');
      expect(hasAccess).toBe(false);
    });
  });

  describe('checkFeatures - Bulk Operations', () => {
    beforeEach(() => {
      const mockSubscription: UserSubscription = {
        id: mockSubscriptionId,
        userId: mockUserId,
        planId: mockPlanId,
        status: 'active',
        isLifetime: true,
        tierLevel: 2,
        lifetimeActivatedAt: new Date(),
        highestTierReached: 2,
        startedAt: new Date(),
        expiresAt: null,
        orderId: null,
        paymentReference: null,
        paymentGateway: null,
        autoRenew: null,
        universitiesUsed: 5,
        countriesUsed: 2,
        amountPaid: '199.00',
        currency: 'INR',
        paidAt: new Date(),
        subscribedPlanSnapshot: null,
        grandfatheredPrice: null,
        grandfatheredUntil: null,
        isGrandfathered: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockUserSubscriptionRepo.findByUser.mockResolvedValue(mockSubscription);
      mockSubscriptionPlanRepo.findById.mockResolvedValue(mockLivePlan);
    });

    it('should check multiple features at once', async () => {
      const features = ['includeLoanAssistance', 'includeVisaSupport', 'includeMockInterview', 'Feature A'];
      const results = await service.checkFeatures(mockUserId, features);

      expect(results).toEqual({
        includeLoanAssistance: true,
        includeVisaSupport: true,
        includeMockInterview: false,
        'Feature A': true
      });
    });

    it('should return all false when user has no subscription', async () => {
      mockUserSubscriptionRepo.findByUser.mockResolvedValue(null);
      
      const features = ['includeLoanAssistance', 'includeVisaSupport'];
      const results = await service.checkFeatures(mockUserId, features);

      expect(results).toEqual({
        includeLoanAssistance: false,
        includeVisaSupport: false
      });
    });
  });

  describe('getQuotaInfo and getRemainingQuota', () => {
    beforeEach(() => {
      const mockSubscription: UserSubscription = {
        id: mockSubscriptionId,
        userId: mockUserId,
        planId: mockPlanId,
        status: 'active',
        isLifetime: true,
        tierLevel: 2,
        lifetimeActivatedAt: new Date(),
        highestTierReached: 2,
        startedAt: new Date(),
        expiresAt: null,
        orderId: null,
        paymentReference: null,
        paymentGateway: null,
        autoRenew: null,
        universitiesUsed: 5,
        countriesUsed: 2,
        amountPaid: '199.00',
        currency: 'INR',
        paidAt: new Date(),
        subscribedPlanSnapshot: null,
        grandfatheredPrice: null,
        grandfatheredUntil: null,
        isGrandfathered: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockUserSubscriptionRepo.findByUser.mockResolvedValue(mockSubscription);
      mockSubscriptionPlanRepo.findById.mockResolvedValue(mockLivePlan);
    });

    it('should calculate remaining universities quota correctly', async () => {
      const quotaInfo = await service.getQuotaInfo(mockUserId, 'universities');

      expect(quotaInfo.quotaType).toBe('universities');
      expect(quotaInfo.limit).toBe(10);
      expect(quotaInfo.used).toBe(5);
      expect(quotaInfo.remaining).toBe(5);
      expect(quotaInfo.isUnlimited).toBe(false);
    });

    it('should calculate remaining countries quota correctly', async () => {
      const quotaInfo = await service.getQuotaInfo(mockUserId, 'countries');

      expect(quotaInfo.quotaType).toBe('countries');
      expect(quotaInfo.limit).toBe(5);
      expect(quotaInfo.used).toBe(2);
      expect(quotaInfo.remaining).toBe(3);
      expect(quotaInfo.isUnlimited).toBe(false);
    });

    it('should return 0 remaining when quota is exceeded', async () => {
      const mockSubscription: UserSubscription = {
        id: mockSubscriptionId,
        userId: mockUserId,
        planId: mockPlanId,
        status: 'active',
        isLifetime: true,
        tierLevel: 2,
        lifetimeActivatedAt: new Date(),
        highestTierReached: 2,
        startedAt: new Date(),
        expiresAt: null,
        orderId: null,
        paymentReference: null,
        paymentGateway: null,
        autoRenew: null,
        universitiesUsed: 12, // Exceeded limit
        countriesUsed: 6, // Exceeded limit
        amountPaid: '199.00',
        currency: 'INR',
        paidAt: new Date(),
        subscribedPlanSnapshot: null,
        grandfatheredPrice: null,
        grandfatheredUntil: null,
        isGrandfathered: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockUserSubscriptionRepo.findByUser.mockResolvedValue(mockSubscription);
      mockSubscriptionPlanRepo.findById.mockResolvedValue(mockLivePlan);

      const universitiesQuota = await service.getQuotaInfo(mockUserId, 'universities');
      const countriesQuota = await service.getQuotaInfo(mockUserId, 'countries');

      expect(universitiesQuota.remaining).toBe(0);
      expect(countriesQuota.remaining).toBe(0);
    });

    it('should use getRemainingQuota for simplified quota checks', async () => {
      const remaining = await service.getRemainingQuota(mockUserId, 'universities');
      expect(remaining).toBe(5);
    });
  });

  describe('getFeatureImpact and previewFeatureChange', () => {
    beforeEach(() => {
      mockSubscriptionPlanRepo.findById.mockResolvedValue(mockLivePlan);
    });

    it('should analyze impact of feature changes', async () => {
      mockSubscriptionPlanRepo.getSubscriberCount.mockResolvedValue(50);

      const impact = await service.getFeatureImpact(mockPlanId, 'maxUniversities', 5);

      expect(impact.planId).toBe(mockPlanId);
      expect(impact.planName).toBe('Premium Plan');
      expect(impact.affectedSubscribers).toBe(50);
      expect(impact.riskLevel).toBe('medium');
      expect(impact.featureChanges).toHaveLength(1);
      expect(impact.featureChanges[0].featureName).toBe('maxUniversities');
      expect(impact.featureChanges[0].oldValue).toBe(10);
      expect(impact.featureChanges[0].newValue).toBe(5);
    });

    it('should recommend using versioning when subscribers exist', async () => {
      mockSubscriptionPlanRepo.getSubscriberCount.mockResolvedValue(25);

      const impact = await service.getFeatureImpact(mockPlanId, 'maxUniversities', 5);

      expect(impact.recommendation).toBe('Use createPlanVersion() to grandfather existing users');
    });

    it('should allow direct update when no subscribers exist', async () => {
      mockSubscriptionPlanRepo.getSubscriberCount.mockResolvedValue(0);

      const impact = await service.getFeatureImpact(mockPlanId, 'maxUniversities', 5);

      expect(impact.recommendation).toBe('Safe to update directly (no active subscribers)');
      expect(impact.riskLevel).toBe('low');
    });

    it('should preview multiple feature changes', async () => {
      mockSubscriptionPlanRepo.getSubscriberCount.mockResolvedValue(10);

      const changes = {
        maxUniversities: 5,
        includeLoanAssistance: false,
        features: ['Feature A', 'Feature B']
      };

      const preview = await service.previewFeatureChange(mockPlanId, changes);

      expect(preview.planId).toBe(mockPlanId);
      expect(preview.subscriberCount).toBe(10);
      expect(preview.requiresConfirmation).toBe(true);
      expect(preview.changes.length).toBeGreaterThan(0);
      expect(preview.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Cache Management', () => {
    it('should cache feature set after first fetch', async () => {
      const mockSubscription: UserSubscription = {
        id: mockSubscriptionId,
        userId: mockUserId,
        planId: mockPlanId,
        status: 'active',
        isLifetime: true,
        tierLevel: 2,
        lifetimeActivatedAt: new Date(),
        highestTierReached: 2,
        startedAt: new Date(),
        expiresAt: null,
        orderId: null,
        paymentReference: null,
        paymentGateway: null,
        autoRenew: null,
        universitiesUsed: 5,
        countriesUsed: 2,
        amountPaid: '199.00',
        currency: 'INR',
        paidAt: new Date(),
        subscribedPlanSnapshot: null,
        grandfatheredPrice: null,
        grandfatheredUntil: null,
        isGrandfathered: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockUserSubscriptionRepo.findByUser.mockResolvedValue(mockSubscription);
      mockSubscriptionPlanRepo.findById.mockResolvedValue(mockLivePlan);

      // First call
      await service.getEffectiveFeatures(mockUserId);
      expect(mockUserSubscriptionRepo.findByUser).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await service.getEffectiveFeatures(mockUserId);
      expect(mockUserSubscriptionRepo.findByUser).toHaveBeenCalledTimes(1); // Still 1 (cached)
    });

    it('should clear cache for specific user', async () => {
      const mockSubscription: UserSubscription = {
        id: mockSubscriptionId,
        userId: mockUserId,
        planId: mockPlanId,
        status: 'active',
        isLifetime: true,
        tierLevel: 2,
        lifetimeActivatedAt: new Date(),
        highestTierReached: 2,
        startedAt: new Date(),
        expiresAt: null,
        orderId: null,
        paymentReference: null,
        paymentGateway: null,
        autoRenew: null,
        universitiesUsed: 5,
        countriesUsed: 2,
        amountPaid: '199.00',
        currency: 'INR',
        paidAt: new Date(),
        subscribedPlanSnapshot: null,
        grandfatheredPrice: null,
        grandfatheredUntil: null,
        isGrandfathered: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockUserSubscriptionRepo.findByUser.mockResolvedValue(mockSubscription);
      mockSubscriptionPlanRepo.findById.mockResolvedValue(mockLivePlan);

      // First call
      await service.getEffectiveFeatures(mockUserId);
      
      // Clear cache
      service.clearCache(mockUserId);
      
      // Second call should fetch again
      await service.getEffectiveFeatures(mockUserId);
      expect(mockUserSubscriptionRepo.findByUser).toHaveBeenCalledTimes(2);
    });
  });
});
