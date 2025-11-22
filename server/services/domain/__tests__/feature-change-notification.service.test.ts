/**
 * Feature Change Notification Service Tests
 * 
 * Tests for feature change notification functionality including:
 * - Feature addition notifications
 * - Feature deprecation notifications
 * - Feature modification notifications
 * - Batching and throttling
 * - Multi-channel delivery
 * - Notification tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FeatureChangeNotificationService, IFeatureChangeNotificationService, FeatureChangeDetails } from '../feature-change-notification.service';
import { NotificationService } from '../notification.service';
import { userRepository } from '../../../repositories/user.repository';
import { notificationRepository } from '../../../repositories/notification.repository';
import { subscriptionPlanRepository } from '../../../repositories/subscription.repository';
import sgMail from '@sendgrid/mail';

vi.mock('@sendgrid/mail');

describe('FeatureChangeNotificationService', () => {
  let service: IFeatureChangeNotificationService;
  let testUserIds: string[] = [];
  let testPlanId: string;
  let testNotificationIds: string[] = [];

  beforeEach(async () => {
    service = new FeatureChangeNotificationService();

    const plan = await subscriptionPlanRepository.create({
      name: 'Test Premium Plan',
      description: 'Test plan for notifications',
      price: 999,
      billingPeriod: 'monthly',
      isActive: true,
      basePlanId: 'base-plan-123',
      version: 1,
      includeLoanAssistance: true,
      includeVisaSupport: true,
      maxUniversities: 10,
      maxCountries: 5
    });
    testPlanId = plan.id;

    for (let i = 0; i < 5; i++) {
      const user = await userRepository.create({
        email: `feature-notif-user-${i}-${Date.now()}-${Math.random()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: `TestUser${i}`,
        lastName: 'FeatureNotif'
      });
      testUserIds.push(user.id);
    }

    vi.mocked(sgMail.send).mockResolvedValue([{
      statusCode: 202,
      body: {},
      headers: {}
    }] as any);
  });

  afterEach(async () => {
    for (const notificationId of testNotificationIds) {
      try {
        await notificationRepository.delete(notificationId);
      } catch (error) {
        console.log('Notification cleanup failed:', error);
      }
    }
    testNotificationIds = [];

    for (const userId of testUserIds) {
      try {
        await userRepository.delete(userId);
      } catch (error) {
        console.log('User cleanup failed:', error);
      }
    }
    testUserIds = [];

    if (testPlanId) {
      try {
        await subscriptionPlanRepository.delete(testPlanId);
      } catch (error) {
        console.log('Plan cleanup failed:', error);
      }
    }

    vi.clearAllMocks();
  });

  describe('Feature Addition Notifications', () => {
    it('should send feature addition notification to all users', async () => {
      const featureDetails: FeatureChangeDetails = {
        planId: testPlanId,
        planName: 'Test Premium Plan',
        featureName: 'includeLoanAssistance',
        featureDisplayName: 'Loan Assistance',
        effectiveDate: new Date(),
        migrationGuideUrl: 'https://example.com/guide',
        grandfathered: false
      };

      const result = await service.sendFeatureAdditionNotification(
        testUserIds,
        featureDetails
      );

      expect(result.totalUsers).toBe(testUserIds.length);
      expect(result.inAppCreated).toBe(testUserIds.length);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);

      const notifications = await notificationRepository.findAll();
      const additionNotifs = notifications.filter(
        n => n.type === 'feature_addition' && testUserIds.includes(n.userId)
      );
      
      expect(additionNotifs.length).toBeGreaterThanOrEqual(testUserIds.length);
      
      additionNotifs.forEach(notif => {
        testNotificationIds.push(notif.id);
        expect(notif.title).toContain('New Feature Available');
        expect(notif.title).toContain('Loan Assistance');
        expect(notif.message).toContain('Test Premium Plan');
      });
    });

    it('should handle feature addition with grandfathering status', async () => {
      const featureDetails: FeatureChangeDetails = {
        planId: testPlanId,
        planName: 'Test Premium Plan',
        featureName: 'maxUniversities',
        featureDisplayName: 'Maximum Universities',
        effectiveDate: new Date(),
        grandfathered: true,
        grandfatherExpiryDate: new Date('2025-12-31')
      };

      const result = await service.sendFeatureAdditionNotification(
        [testUserIds[0]],
        featureDetails
      );

      expect(result.totalUsers).toBe(1);
      expect(result.inAppCreated).toBe(1);

      const notifications = await notificationRepository.findByUser(testUserIds[0]);
      const additionNotif = notifications.find(n => n.type === 'feature_addition');
      
      if (additionNotif) {
        testNotificationIds.push(additionNotif.id);
        expect(additionNotif.data).toBeDefined();
        expect(additionNotif.data.featureName).toBe('maxUniversities');
      }
    });

    it('should track errors for failed notifications', async () => {
      const invalidUserId = 'invalid-user-id';
      const featureDetails: FeatureChangeDetails = {
        planId: testPlanId,
        planName: 'Test Premium Plan',
        featureName: 'includeLoanAssistance',
        featureDisplayName: 'Loan Assistance',
        effectiveDate: new Date()
      };

      const result = await service.sendFeatureAdditionNotification(
        [invalidUserId],
        featureDetails
      );

      expect(result.totalUsers).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].userId).toBe(invalidUserId);
      expect(result.errors[0].error).toBeDefined();
    });
  });

  describe('Feature Deprecation Notifications', () => {
    it('should send feature deprecation notification to all users', async () => {
      const featureDetails: FeatureChangeDetails = {
        planId: testPlanId,
        planName: 'Test Premium Plan',
        featureName: 'includeLoanAssistance',
        featureDisplayName: 'Loan Assistance',
        effectiveDate: new Date('2025-12-31'),
        migrationGuideUrl: 'https://example.com/migration',
        grandfathered: false
      };

      const result = await service.sendFeatureDeprecationNotification(
        testUserIds,
        featureDetails
      );

      expect(result.totalUsers).toBe(testUserIds.length);
      expect(result.inAppCreated).toBe(testUserIds.length);
      expect(result.failed).toBe(0);

      const notifications = await notificationRepository.findAll();
      const deprecationNotifs = notifications.filter(
        n => n.type === 'feature_deprecation' && testUserIds.includes(n.userId)
      );
      
      expect(deprecationNotifs.length).toBeGreaterThanOrEqual(testUserIds.length);
      
      deprecationNotifs.forEach(notif => {
        testNotificationIds.push(notif.id);
        expect(notif.title).toContain('Scheduled for Removal');
        expect(notif.message).toContain('Test Premium Plan');
      });
    });

    it('should indicate grandfathered users in deprecation notifications', async () => {
      const featureDetails: FeatureChangeDetails = {
        planId: testPlanId,
        planName: 'Test Premium Plan',
        featureName: 'includeLoanAssistance',
        featureDisplayName: 'Loan Assistance',
        effectiveDate: new Date('2025-12-31'),
        grandfathered: true,
        grandfatherExpiryDate: null
      };

      const result = await service.sendFeatureDeprecationNotification(
        [testUserIds[0]],
        featureDetails
      );

      expect(result.totalUsers).toBe(1);
      expect(result.inAppCreated).toBe(1);

      const notifications = await notificationRepository.findByUser(testUserIds[0]);
      const deprecationNotif = notifications.find(n => n.type === 'feature_deprecation');
      
      if (deprecationNotif) {
        testNotificationIds.push(deprecationNotif.id);
        expect(deprecationNotif.message).toContain('grandfathered');
      }
    });
  });

  describe('Feature Modification Notifications', () => {
    it('should send feature modification notification to all users', async () => {
      const featureDetails: FeatureChangeDetails = {
        planId: testPlanId,
        planName: 'Test Premium Plan',
        featureName: 'maxUniversities',
        featureDisplayName: 'Maximum Universities',
        oldValue: 10,
        newValue: 15,
        effectiveDate: new Date(),
        grandfathered: false
      };

      const result = await service.sendFeatureModificationNotification(
        testUserIds,
        featureDetails
      );

      expect(result.totalUsers).toBe(testUserIds.length);
      expect(result.inAppCreated).toBe(testUserIds.length);
      expect(result.failed).toBe(0);

      const notifications = await notificationRepository.findAll();
      const modificationNotifs = notifications.filter(
        n => n.type === 'feature_modification' && testUserIds.includes(n.userId)
      );
      
      expect(modificationNotifs.length).toBeGreaterThanOrEqual(testUserIds.length);
      
      modificationNotifs.forEach(notif => {
        testNotificationIds.push(notif.id);
        expect(notif.title).toContain('Changes to');
        expect(notif.title).toContain('Maximum Universities');
      });
    });
  });

  describe('Batching and Throttling', () => {
    it('should process users in batches of 1000', async () => {
      const largeUserSet: string[] = [];
      for (let i = 0; i < 2500; i++) {
        largeUserSet.push(`user-${i}`);
      }

      const featureDetails: FeatureChangeDetails = {
        planId: testPlanId,
        planName: 'Test Premium Plan',
        featureName: 'includeLoanAssistance',
        featureDisplayName: 'Loan Assistance',
        effectiveDate: new Date()
      };

      const startTime = Date.now();
      const result = await service.sendFeatureAdditionNotification(
        largeUserSet,
        featureDetails
      );
      const endTime = Date.now();

      expect(result.totalUsers).toBe(largeUserSet.length);
      
      const processingTime = endTime - startTime;
      expect(processingTime).toBeGreaterThan(1000);
    });

    it('should handle batching correctly with small user sets', async () => {
      const featureDetails: FeatureChangeDetails = {
        planId: testPlanId,
        planName: 'Test Premium Plan',
        featureName: 'includeLoanAssistance',
        featureDisplayName: 'Loan Assistance',
        effectiveDate: new Date()
      };

      const result = await service.sendFeatureAdditionNotification(
        [testUserIds[0], testUserIds[1]],
        featureDetails
      );

      expect(result.totalUsers).toBe(2);
      expect(result.inAppCreated).toBe(2);
    });
  });

  describe('Multi-channel Delivery', () => {
    it('should create in-app notifications for all users', async () => {
      const featureDetails: FeatureChangeDetails = {
        planId: testPlanId,
        planName: 'Test Premium Plan',
        featureName: 'includeLoanAssistance',
        featureDisplayName: 'Loan Assistance',
        effectiveDate: new Date()
      };

      const result = await service.sendFeatureAdditionNotification(
        testUserIds,
        featureDetails
      );

      expect(result.inAppCreated).toBe(testUserIds.length);

      for (const userId of testUserIds) {
        const userNotifications = await notificationRepository.findByUser(userId);
        const featureNotif = userNotifications.find(n => n.type === 'feature_addition');
        expect(featureNotif).toBeDefined();
        if (featureNotif) {
          testNotificationIds.push(featureNotif.id);
        }
      }
    });
  });

  describe('Notification Orchestration', () => {
    it('should route to correct handler for addition type', async () => {
      const featureDetails: FeatureChangeDetails = {
        planId: testPlanId,
        planName: 'Test Premium Plan',
        featureName: 'includeLoanAssistance',
        featureDisplayName: 'Loan Assistance',
        effectiveDate: new Date()
      };

      const result = await service.notifyFeatureChange(
        'addition',
        testUserIds,
        featureDetails,
        { emailEnabled: true, inAppEnabled: true }
      );

      expect(result.totalUsers).toBe(testUserIds.length);
      expect(result.inAppCreated).toBeGreaterThan(0);
    });

    it('should route to correct handler for deprecation type', async () => {
      const featureDetails: FeatureChangeDetails = {
        planId: testPlanId,
        planName: 'Test Premium Plan',
        featureName: 'includeLoanAssistance',
        featureDisplayName: 'Loan Assistance',
        effectiveDate: new Date()
      };

      const result = await service.notifyFeatureChange(
        'deprecation',
        testUserIds,
        featureDetails,
        { emailEnabled: true, inAppEnabled: true }
      );

      expect(result.totalUsers).toBe(testUserIds.length);
      expect(result.inAppCreated).toBeGreaterThan(0);
    });

    it('should route to correct handler for modification type', async () => {
      const featureDetails: FeatureChangeDetails = {
        planId: testPlanId,
        planName: 'Test Premium Plan',
        featureName: 'maxUniversities',
        featureDisplayName: 'Maximum Universities',
        oldValue: 10,
        newValue: 15,
        effectiveDate: new Date()
      };

      const result = await service.notifyFeatureChange(
        'modification',
        testUserIds,
        featureDetails,
        { emailEnabled: true, inAppEnabled: true }
      );

      expect(result.totalUsers).toBe(testUserIds.length);
      expect(result.inAppCreated).toBeGreaterThan(0);
    });

    it('should throw error for unknown change type', async () => {
      const featureDetails: FeatureChangeDetails = {
        planId: testPlanId,
        planName: 'Test Premium Plan',
        featureName: 'includeLoanAssistance',
        featureDisplayName: 'Loan Assistance',
        effectiveDate: new Date()
      };

      await expect(
        service.notifyFeatureChange(
          'unknown' as any,
          testUserIds,
          featureDetails,
          { emailEnabled: true, inAppEnabled: true }
        )
      ).rejects.toThrow();
    });
  });

  describe('Notification Tracking', () => {
    it('should track delivery status for each user', async () => {
      const featureDetails: FeatureChangeDetails = {
        planId: testPlanId,
        planName: 'Test Premium Plan',
        featureName: 'includeLoanAssistance',
        featureDisplayName: 'Loan Assistance',
        effectiveDate: new Date()
      };

      const result = await service.sendFeatureAdditionNotification(
        testUserIds,
        featureDetails
      );

      expect(result.totalUsers).toBe(testUserIds.length);
      expect(result.inAppCreated + result.failed).toBe(testUserIds.length);
    });

    it('should store feature details in notification data', async () => {
      const featureDetails: FeatureChangeDetails = {
        planId: testPlanId,
        planName: 'Test Premium Plan',
        featureName: 'includeLoanAssistance',
        featureDisplayName: 'Loan Assistance',
        effectiveDate: new Date(),
        migrationGuideUrl: 'https://example.com/guide'
      };

      await service.sendFeatureAdditionNotification(
        [testUserIds[0]],
        featureDetails
      );

      const notifications = await notificationRepository.findByUser(testUserIds[0]);
      const featureNotif = notifications.find(n => n.type === 'feature_addition');
      
      if (featureNotif) {
        testNotificationIds.push(featureNotif.id);
        expect(featureNotif.data).toBeDefined();
        expect(featureNotif.data.featureName).toBe('includeLoanAssistance');
        expect(featureNotif.data.planId).toBe(testPlanId);
        expect(featureNotif.data.migrationGuideUrl).toBe('https://example.com/guide');
      }
    });
  });

  describe('Error Handling', () => {
    it('should continue processing other users if one fails', async () => {
      const mixedUserIds = [testUserIds[0], 'invalid-id', testUserIds[1]];
      const featureDetails: FeatureChangeDetails = {
        planId: testPlanId,
        planName: 'Test Premium Plan',
        featureName: 'includeLoanAssistance',
        featureDisplayName: 'Loan Assistance',
        effectiveDate: new Date()
      };

      const result = await service.sendFeatureAdditionNotification(
        mixedUserIds,
        featureDetails
      );

      expect(result.totalUsers).toBe(3);
      expect(result.inAppCreated).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].userId).toBe('invalid-id');
    });

    it('should handle empty user list gracefully', async () => {
      const featureDetails: FeatureChangeDetails = {
        planId: testPlanId,
        planName: 'Test Premium Plan',
        featureName: 'includeLoanAssistance',
        featureDisplayName: 'Loan Assistance',
        effectiveDate: new Date()
      };

      const result = await service.sendFeatureAdditionNotification(
        [],
        featureDetails
      );

      expect(result.totalUsers).toBe(0);
      expect(result.inAppCreated).toBe(0);
      expect(result.failed).toBe(0);
    });
  });
});
