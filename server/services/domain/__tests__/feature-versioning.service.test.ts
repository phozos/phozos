/**
 * Feature Versioning Service Tests
 * 
 * Comprehensive tests for feature versioning including:
 * - Feature version creation
 * - Feature change validation
 * - Grandfathering rule application
 * - Version history tracking
 * - Breaking change detection
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeatureVersioningService } from '../feature-versioning.service';
import type { SubscriptionPlan, UserSubscription } from '@shared/schema';
import type { 
  FeatureChange, 
  GrandfatheringRule,
  VersionOptions 
} from '@shared/types/feature-changes';

// Mock repositories
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

const mockUserSubscriptionRepo = {
  findById: vi.fn(),
  findByIdOptional: vi.fn(),
  findByUser: vi.fn(),
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

const mockPlanAuditRepo = {
  findById: vi.fn(),
  findByIdOptional: vi.fn(),
  findAll: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findByPlanId: vi.fn(),
  findByAdminId: vi.fn()
};

describe('FeatureVersioningService', () => {
  let service: FeatureVersioningService;

  // Sample test data
  const mockPlanId = '123e4567-e89b-12d3-a456-426614174000';
  const mockBasePlanId = '223e4567-e89b-12d3-a456-426614174000';
  const mockUserId = '323e4567-e89b-12d3-a456-426614174000';
  const mockAdminId = '423e4567-e89b-12d3-a456-426614174000';

  const mockBasePlan: SubscriptionPlan = {
    id: mockPlanId,
    name: 'Premium Plan',
    price: '199.00',
    currency: 'INR',
    description: 'Premium features',
    logo: 'premium',
    features: ['Feature A', 'Feature B'],
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
    includeScholarshipPlanning: false,
    includeMockInterview: false,
    includeExpertEditing: true,
    includePostAdmitSupport: false,
    includeDedicatedManager: false,
    includeNetworkingEvents: false,
    includeFlightAccommodation: false,
    isBusinessFocused: false,
    displayOrder: 2,
    isActive: true,
    basePlanId: mockBasePlanId,
    version: 1,
    versionName: 'v1.0',
    isLatestVersion: true,
    deprecatedAt: null,
    archivedAt: null,
    successorPlanId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FeatureVersioningService(
      mockSubscriptionPlanRepo as any,
      mockUserSubscriptionRepo as any,
      mockPlanAuditRepo as any
    );
  });

  describe('createFeatureVersion', () => {
    it('should create a new feature version with feature additions', async () => {
      const featureChanges: FeatureChange[] = [
        {
          featureName: 'includeMockInterview',
          changeType: 'added',
          oldValue: false,
          newValue: true,
          reason: 'Enhanced service offering to include mock interview preparation',
          migrationPath: 'Automatically enabled for all subscribers'
        }
      ];

      const options: VersionOptions = {
        rolloutStrategy: 'immediate',
        releaseNotes: 'Added mock interview feature',
        notifySubscribers: true
      };

      const expectedNewVersion: SubscriptionPlan = {
        ...mockBasePlan,
        id: 'new-plan-id',
        version: 2,
        versionName: 'v2.0',
        includeMockInterview: true
      };

      mockSubscriptionPlanRepo.findById.mockResolvedValue(mockBasePlan);
      mockSubscriptionPlanRepo.getSubscriberCount.mockResolvedValue(0);
      mockSubscriptionPlanRepo.findAllVersions.mockResolvedValue([mockBasePlan]);
      mockSubscriptionPlanRepo.createNewVersion.mockResolvedValue(expectedNewVersion);

      const result = await service.createFeatureVersion(
        mockPlanId,
        featureChanges,
        options,
        mockAdminId
      );

      expect(result).toEqual(expectedNewVersion);
      expect(mockSubscriptionPlanRepo.createNewVersion).toHaveBeenCalledWith(
        mockBasePlanId,
        expect.objectContaining({
          includeMockInterview: true,
          feature_version_metadata: expect.objectContaining({
            version: 2,
            changes: featureChanges,
            rolloutStrategy: 'immediate'
          })
        }),
        mockAdminId
      );
    });

    it('should create version with feature removal and apply grandfathering', async () => {
      const featureChanges: FeatureChange[] = [
        {
          featureName: 'includeLoanAssistance',
          changeType: 'removed',
          oldValue: true,
          newValue: false,
          reason: 'Service restructuring',
          migrationPath: 'Existing users retain this feature'
        }
      ];

      const grandfatheringRules: GrandfatheringRule[] = [
        {
          condition: 'all',
          retainOldValue: true,
          expirationDate: null,
          notificationRequired: true,
          affectedFeatures: ['includeLoanAssistance']
        }
      ];

      const options: VersionOptions = {
        rolloutStrategy: 'immediate',
        grandfatheringRules,
        releaseNotes: 'Removed loan assistance from plan'
      };

      const mockSubscriptions: UserSubscription[] = [
        {
          id: 'sub-1',
          userId: 'user-1',
          planId: mockPlanId,
          status: 'active',
          isLifetime: true,
          tierLevel: 2,
          lifetimeActivatedAt: new Date(),
          highestTierReached: 2,
          startedAt: new Date('2024-01-01'),
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
        }
      ];

      const expectedNewVersion: SubscriptionPlan = {
        ...mockBasePlan,
        id: 'new-plan-id',
        version: 2,
        includeLoanAssistance: false
      };

      mockSubscriptionPlanRepo.findById.mockResolvedValue(mockBasePlan);
      mockSubscriptionPlanRepo.getSubscriberCount.mockResolvedValue(1);
      mockSubscriptionPlanRepo.findAllVersions.mockResolvedValue([mockBasePlan]);
      mockSubscriptionPlanRepo.createNewVersion.mockResolvedValue(expectedNewVersion);
      mockUserSubscriptionRepo.findAll.mockResolvedValue(mockSubscriptions);
      mockUserSubscriptionRepo.update.mockResolvedValue(mockSubscriptions[0]);

      const result = await service.createFeatureVersion(
        mockPlanId,
        featureChanges,
        options,
        mockAdminId
      );

      expect(result.includeLoanAssistance).toBe(false);
      expect(mockUserSubscriptionRepo.update).toHaveBeenCalledWith(
        'sub-1',
        expect.objectContaining({
          subscribedPlanSnapshot: mockBasePlan,
          isGrandfathered: true
        })
      );
    });

    it('should create version with quota modification', async () => {
      const featureChanges: FeatureChange[] = [
        {
          featureName: 'maxUniversities',
          changeType: 'modified',
          oldValue: 10,
          newValue: 15,
          reason: 'Increasing quota for better value',
          migrationPath: 'All users automatically upgraded'
        }
      ];

      const options: VersionOptions = {
        rolloutStrategy: 'immediate',
        releaseNotes: 'Increased university quota'
      };

      const expectedNewVersion: SubscriptionPlan = {
        ...mockBasePlan,
        id: 'new-plan-id',
        version: 2,
        maxUniversities: 15
      };

      mockSubscriptionPlanRepo.findById.mockResolvedValue(mockBasePlan);
      mockSubscriptionPlanRepo.getSubscriberCount.mockResolvedValue(0);
      mockSubscriptionPlanRepo.findAllVersions.mockResolvedValue([mockBasePlan]);
      mockSubscriptionPlanRepo.createNewVersion.mockResolvedValue(expectedNewVersion);

      const result = await service.createFeatureVersion(
        mockPlanId,
        featureChanges,
        options,
        mockAdminId
      );

      expect(result.maxUniversities).toBe(15);
    });

    it('should fail validation for changes with insufficient reason', async () => {
      const featureChanges: FeatureChange[] = [
        {
          featureName: 'includeMockInterview',
          changeType: 'added',
          oldValue: false,
          newValue: true,
          reason: 'Update', // Too short
          migrationPath: 'Auto'
        }
      ];

      const options: VersionOptions = {
        rolloutStrategy: 'immediate'
      };

      mockSubscriptionPlanRepo.findById.mockResolvedValue(mockBasePlan);
      mockSubscriptionPlanRepo.getSubscriberCount.mockResolvedValue(0);

      await expect(
        service.createFeatureVersion(mockPlanId, featureChanges, options, mockAdminId)
      ).rejects.toThrow();
    });
  });

  describe('validateFeatureChanges', () => {
    beforeEach(() => {
      mockSubscriptionPlanRepo.findById.mockResolvedValue(mockBasePlan);
    });

    it('should detect breaking changes - feature removal', async () => {
      const changes: FeatureChange[] = [
        {
          featureName: 'includeLoanAssistance',
          changeType: 'removed',
          oldValue: true,
          newValue: false,
          reason: 'Service restructuring to focus on core features'
        }
      ];

      mockSubscriptionPlanRepo.getSubscriberCount.mockResolvedValue(50);

      const result = await service.validateFeatureChanges(mockPlanId, changes);

      expect(result.breakingChanges.length).toBe(1);
      expect(result.breakingChanges[0].featureName).toBe('includeLoanAssistance');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.migrationImpact.affectedSubscribers).toBe(50);
      expect(result.migrationImpact.requiresGrandfathering).toBe(true);
      expect(result.recommendedActions).toContain(
        'Apply grandfathering for includeLoanAssistance to protect existing 50 subscribers'
      );
    });

    it('should detect breaking changes - quota reduction', async () => {
      const changes: FeatureChange[] = [
        {
          featureName: 'maxUniversities',
          changeType: 'modified',
          oldValue: 10,
          newValue: 5,
          reason: 'Tier restructuring for better cost alignment'
        }
      ];

      mockSubscriptionPlanRepo.getSubscriberCount.mockResolvedValue(25);

      const result = await service.validateFeatureChanges(mockPlanId, changes);

      expect(result.breakingChanges.length).toBe(1);
      expect(result.warnings).toContain(
        'Quota reduction detected: maxUniversities from 10 to 5'
      );
      expect(result.recommendedActions).toContain(
        'Consider gradual rollout for maxUniversities quota change'
      );
    });

    it('should detect breaking changes - boolean feature disabled', async () => {
      const changes: FeatureChange[] = [
        {
          featureName: 'includeVisaSupport',
          changeType: 'modified',
          oldValue: true,
          newValue: false,
          reason: 'Moving visa support to higher tier plan only'
        }
      ];

      mockSubscriptionPlanRepo.getSubscriberCount.mockResolvedValue(100);

      const result = await service.validateFeatureChanges(mockPlanId, changes);

      expect(result.breakingChanges.length).toBe(1);
      expect(result.migrationImpact.requiresGrandfathering).toBe(true);
    });

    it('should allow non-breaking changes without warnings', async () => {
      const changes: FeatureChange[] = [
        {
          featureName: 'includeMockInterview',
          changeType: 'added',
          oldValue: false,
          newValue: true,
          reason: 'Adding new feature to enhance value proposition for subscribers'
        }
      ];

      mockSubscriptionPlanRepo.getSubscriberCount.mockResolvedValue(50);

      const result = await service.validateFeatureChanges(mockPlanId, changes);

      expect(result.isValid).toBe(true);
      expect(result.breakingChanges.length).toBe(0);
      expect(result.errors.length).toBe(0);
      expect(result.migrationImpact.requiresGrandfathering).toBe(false);
    });

    it('should warn about deprecated features without migration path', async () => {
      const changes: FeatureChange[] = [
        {
          featureName: 'oldFeature',
          changeType: 'deprecated',
          oldValue: true,
          newValue: true,
          reason: 'Feature is being phased out in favor of new implementation'
        }
      ];

      mockSubscriptionPlanRepo.getSubscriberCount.mockResolvedValue(10);

      const result = await service.validateFeatureChanges(mockPlanId, changes);

      expect(result.deprecatedFeatures).toContain('oldFeature');
      expect(result.warnings).toContain('No migration path specified for oldFeature');
    });

    it('should recommend safe direct update when no subscribers exist', async () => {
      const changes: FeatureChange[] = [
        {
          featureName: 'maxUniversities',
          changeType: 'modified',
          oldValue: 10,
          newValue: 5,
          reason: 'Adjusting quotas before plan launch'
        }
      ];

      mockSubscriptionPlanRepo.getSubscriberCount.mockResolvedValue(0);

      const result = await service.validateFeatureChanges(mockPlanId, changes);

      expect(result.recommendedActions).toContain(
        'Safe to apply directly (no active subscribers)'
      );
    });

    it('should detect tier downgrade as breaking change', async () => {
      const changes: FeatureChange[] = [
        {
          featureName: 'universityTier',
          changeType: 'modified',
          oldValue: 'top500',
          newValue: 'general',
          reason: 'Adjusting tier structure'
        }
      ];

      mockSubscriptionPlanRepo.getSubscriberCount.mockResolvedValue(30);

      const result = await service.validateFeatureChanges(mockPlanId, changes);

      expect(result.breakingChanges.length).toBe(1);
      expect(result.migrationImpact.requiresGrandfathering).toBe(true);
    });

    it('should validate turnaroundDays increase as breaking change', async () => {
      const changes: FeatureChange[] = [
        {
          featureName: 'turnaroundDays',
          changeType: 'modified',
          oldValue: 3,
          newValue: 7,
          reason: 'Adjusting service delivery timelines'
        }
      ];

      mockSubscriptionPlanRepo.getSubscriberCount.mockResolvedValue(40);

      const result = await service.validateFeatureChanges(mockPlanId, changes);

      expect(result.breakingChanges.length).toBe(1);
      expect(result.warnings).toContain(
        'Quota reduction detected: turnaroundDays from 3 to 7'
      );
    });
  });

  describe('applyGrandfatheringRules', () => {
    it('should apply grandfathering to all active subscriptions with "all" condition', async () => {
      const rules: GrandfatheringRule[] = [
        {
          condition: 'all',
          retainOldValue: true,
          expirationDate: null,
          notificationRequired: true
        }
      ];

      const mockSubscriptions: UserSubscription[] = [
        {
          id: 'sub-1',
          userId: 'user-1',
          planId: mockPlanId,
          status: 'active',
          isLifetime: true,
          tierLevel: 2,
          lifetimeActivatedAt: new Date(),
          highestTierReached: 2,
          startedAt: new Date('2024-01-01'),
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
        },
        {
          id: 'sub-2',
          userId: 'user-2',
          planId: mockPlanId,
          status: 'active',
          isLifetime: true,
          tierLevel: 2,
          lifetimeActivatedAt: new Date(),
          highestTierReached: 2,
          startedAt: new Date('2024-01-15'),
          expiresAt: null,
          orderId: null,
          paymentReference: null,
          paymentGateway: null,
          autoRenew: null,
          universitiesUsed: 3,
          countriesUsed: 1,
          amountPaid: '199.00',
          currency: 'INR',
          paidAt: new Date(),
          subscribedPlanSnapshot: null,
          grandfatheredPrice: null,
          grandfatheredUntil: null,
          isGrandfathered: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockSubscriptionPlanRepo.findById.mockResolvedValue(mockBasePlan);
      mockUserSubscriptionRepo.findAll.mockResolvedValue(mockSubscriptions);
      mockUserSubscriptionRepo.update.mockResolvedValue(mockSubscriptions[0]);

      const result = await service.applyGrandfatheringRules(mockPlanId, rules);

      expect(result.appliedCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.affectedUserIds).toEqual(['user-1', 'user-2']);
      expect(mockUserSubscriptionRepo.update).toHaveBeenCalledTimes(2);
    });

    it('should apply grandfathering with before_date condition', async () => {
      const cutoffDate = new Date('2024-01-10');
      
      const rules: GrandfatheringRule[] = [
        {
          condition: 'before_date',
          retainOldValue: true,
          expirationDate: cutoffDate,
          notificationRequired: true
        }
      ];

      const mockSubscriptions: UserSubscription[] = [
        {
          id: 'sub-1',
          userId: 'user-1',
          planId: mockPlanId,
          status: 'active',
          isLifetime: true,
          tierLevel: 2,
          lifetimeActivatedAt: new Date(),
          highestTierReached: 2,
          startedAt: new Date('2024-01-05'), // Before cutoff
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
        },
        {
          id: 'sub-2',
          userId: 'user-2',
          planId: mockPlanId,
          status: 'active',
          isLifetime: true,
          tierLevel: 2,
          lifetimeActivatedAt: new Date(),
          highestTierReached: 2,
          startedAt: new Date('2024-01-15'), // After cutoff
          expiresAt: null,
          orderId: null,
          paymentReference: null,
          paymentGateway: null,
          autoRenew: null,
          universitiesUsed: 3,
          countriesUsed: 1,
          amountPaid: '199.00',
          currency: 'INR',
          paidAt: new Date(),
          subscribedPlanSnapshot: null,
          grandfatheredPrice: null,
          grandfatheredUntil: null,
          isGrandfathered: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockSubscriptionPlanRepo.findById.mockResolvedValue(mockBasePlan);
      mockUserSubscriptionRepo.findAll.mockResolvedValue(mockSubscriptions);
      mockUserSubscriptionRepo.update.mockResolvedValue(mockSubscriptions[0]);

      const result = await service.applyGrandfatheringRules(mockPlanId, rules);

      expect(result.appliedCount).toBe(1); // Only first subscription
      expect(result.affectedUserIds).toEqual(['user-1']);
      expect(result.expirationScheduled).toBe(true);
    });

    it('should apply grandfathering to specific users only', async () => {
      const rules: GrandfatheringRule[] = [
        {
          condition: 'specific_users',
          retainOldValue: true,
          expirationDate: null,
          notificationRequired: true,
          userIds: ['user-1']
        }
      ];

      const mockSubscriptions: UserSubscription[] = [
        {
          id: 'sub-1',
          userId: 'user-1',
          planId: mockPlanId,
          status: 'active',
          isLifetime: true,
          tierLevel: 2,
          lifetimeActivatedAt: new Date(),
          highestTierReached: 2,
          startedAt: new Date('2024-01-01'),
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
        },
        {
          id: 'sub-2',
          userId: 'user-2',
          planId: mockPlanId,
          status: 'active',
          isLifetime: true,
          tierLevel: 2,
          lifetimeActivatedAt: new Date(),
          highestTierReached: 2,
          startedAt: new Date('2024-01-15'),
          expiresAt: null,
          orderId: null,
          paymentReference: null,
          paymentGateway: null,
          autoRenew: null,
          universitiesUsed: 3,
          countriesUsed: 1,
          amountPaid: '199.00',
          currency: 'INR',
          paidAt: new Date(),
          subscribedPlanSnapshot: null,
          grandfatheredPrice: null,
          grandfatheredUntil: null,
          isGrandfathered: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockSubscriptionPlanRepo.findById.mockResolvedValue(mockBasePlan);
      mockUserSubscriptionRepo.findAll.mockResolvedValue(mockSubscriptions);
      mockUserSubscriptionRepo.update.mockResolvedValue(mockSubscriptions[0]);

      const result = await service.applyGrandfatheringRules(mockPlanId, rules);

      expect(result.appliedCount).toBe(1);
      expect(result.affectedUserIds).toEqual(['user-1']);
      expect(mockUserSubscriptionRepo.update).toHaveBeenCalledTimes(1);
      expect(mockUserSubscriptionRepo.update).toHaveBeenCalledWith(
        'sub-1',
        expect.objectContaining({
          isGrandfathered: true
        })
      );
    });

    it('should track failures and continue processing', async () => {
      const rules: GrandfatheringRule[] = [
        {
          condition: 'all',
          retainOldValue: true,
          expirationDate: null,
          notificationRequired: true
        }
      ];

      const mockSubscriptions: UserSubscription[] = [
        {
          id: 'sub-1',
          userId: 'user-1',
          planId: mockPlanId,
          status: 'active',
          isLifetime: true,
          tierLevel: 2,
          lifetimeActivatedAt: new Date(),
          highestTierReached: 2,
          startedAt: new Date('2024-01-01'),
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
        }
      ];

      mockSubscriptionPlanRepo.findById.mockResolvedValue(mockBasePlan);
      mockUserSubscriptionRepo.findAll.mockResolvedValue(mockSubscriptions);
      mockUserSubscriptionRepo.update.mockRejectedValue(new Error('Database error'));

      const result = await service.applyGrandfatheringRules(mockPlanId, rules);

      expect(result.appliedCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].userId).toBe('user-1');
      expect(result.errors[0].error).toBe('Database error');
    });
  });

  describe('getFeatureVersionHistory', () => {
    it('should return version history sorted by version number descending', async () => {
      const mockVersions: SubscriptionPlan[] = [
        {
          ...mockBasePlan,
          id: 'plan-v1',
          version: 1,
          versionName: 'v1.0',
          isLatestVersion: false,
          createdAt: new Date('2024-01-01')
        },
        {
          ...mockBasePlan,
          id: 'plan-v2',
          version: 2,
          versionName: 'v2.0',
          includeMockInterview: true,
          isLatestVersion: true,
          createdAt: new Date('2024-02-01'),
          feature_version_metadata: {
            version: 2,
            effectiveDate: new Date('2024-02-01'),
            changes: [
              {
                featureName: 'includeMockInterview',
                changeType: 'added',
                oldValue: false,
                newValue: true,
                reason: 'Enhanced service'
              }
            ],
            affectedFeatures: ['includeMockInterview'],
            rolloutStrategy: 'immediate',
            grandfatheringRules: []
          }
        }
      ];

      mockSubscriptionPlanRepo.findAllVersions.mockResolvedValue(mockVersions);
      mockSubscriptionPlanRepo.getSubscriberCount
        .mockResolvedValueOnce(10) // v1
        .mockResolvedValueOnce(25); // v2

      const history = await service.getFeatureVersionHistory(mockBasePlanId);

      expect(history.length).toBe(2);
      expect(history[0].version).toBe(2); // Latest first
      expect(history[1].version).toBe(1);
      expect(history[0].subscriberCount).toBe(25);
      expect(history[1].subscriberCount).toBe(10);
      expect(history[0].changes.length).toBe(1);
      expect(history[0].changes[0].featureName).toBe('includeMockInterview');
    });

    it('should handle versions without metadata gracefully', async () => {
      const mockVersions: SubscriptionPlan[] = [
        {
          ...mockBasePlan,
          id: 'plan-v1',
          version: 1,
          versionName: 'v1.0 (Legacy)',
          isLatestVersion: true,
          createdAt: new Date('2024-01-01'),
          feature_version_metadata: null
        }
      ];

      mockSubscriptionPlanRepo.findAllVersions.mockResolvedValue(mockVersions);
      mockSubscriptionPlanRepo.getSubscriberCount.mockResolvedValue(5);

      const history = await service.getFeatureVersionHistory(mockBasePlanId);

      expect(history.length).toBe(1);
      expect(history[0].changes).toEqual([]);
      expect(history[0].effectiveDate).toEqual(mockVersions[0].createdAt);
    });
  });
});
