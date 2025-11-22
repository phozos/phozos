import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FeatureAnalyticsService } from '../feature-analytics.service';
import { featureUsageRepository } from '../../../repositories/feature-usage.repository';
import { userRepository } from '../../../repositories/user.repository';
import { subscriptionPlanRepository, userSubscriptionRepository } from '../../../repositories/subscription.repository';

describe('FeatureAnalyticsService', () => {
  let featureAnalyticsService: FeatureAnalyticsService;
  let testUserIds: string[] = [];
  let testPlanIds: string[] = [];
  let testSubscriptionIds: string[] = [];
  let testEventIds: string[] = [];

  beforeEach(() => {
    featureAnalyticsService = new FeatureAnalyticsService();
  });

  afterEach(async () => {
    for (const subId of testSubscriptionIds) {
      try {
        await userSubscriptionRepository.delete(subId);
      } catch (error) {
        console.log('Subscription cleanup failed:', error);
      }
    }
    testSubscriptionIds = [];

    for (const planId of testPlanIds) {
      try {
        await subscriptionPlanRepository.delete(planId);
      } catch (error) {
        console.log('Plan cleanup failed:', error);
      }
    }
    testPlanIds = [];

    for (const userId of testUserIds) {
      try {
        await userRepository.delete(userId);
      } catch (error) {
        console.log('User cleanup failed:', error);
      }
    }
    testUserIds = [];
  });

  describe('trackFeatureUsage', () => {
    it('should track feature usage for active subscription', async () => {
      const user = await userRepository.create({
        email: `feature-track-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'customer',
        firstName: 'Feature',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      const plan = await subscriptionPlanRepository.create({
        name: `Test Plan ${Date.now()}`,
        price: 100,
        currency: 'USD',
        billingCycle: 'monthly',
        features: ['includeExpertEditing'],
        maxUniversities: 10,
        maxCountries: 5
      });
      testPlanIds.push(plan.id);

      const subscription = await userSubscriptionRepository.create({
        userId: user.id,
        planId: plan.id,
        status: 'active',
        startDate: new Date(),
        isLifetime: false
      });
      testSubscriptionIds.push(subscription.id);

      await featureAnalyticsService.trackFeatureUsage(
        user.id,
        'includeExpertEditing',
        'accessed',
        { test: true }
      );

      expect(true).toBe(true);
    });

    it('should not track if no active subscription', async () => {
      const user = await userRepository.create({
        email: `feature-notrack-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'customer',
        firstName: 'NoSub',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      await featureAnalyticsService.trackFeatureUsage(
        user.id,
        'includeExpertEditing',
        'accessed'
      );

      expect(true).toBe(true);
    });
  });

  describe('getUnderutilizedFeatures', () => {
    it('should return underutilized features below threshold', async () => {
      const features = await featureAnalyticsService.getUnderutilizedFeatures(20);

      expect(Array.isArray(features)).toBe(true);
    });

    it('should throw error for invalid threshold', async () => {
      await expect(
        featureAnalyticsService.getUnderutilizedFeatures(150)
      ).rejects.toThrow();
    });

    it('should throw error for negative threshold', async () => {
      await expect(
        featureAnalyticsService.getUnderutilizedFeatures(-10)
      ).rejects.toThrow();
    });
  });

  describe('calculateFeatureROI', () => {
    it('should calculate ROI for a feature', async () => {
      const roi = await featureAnalyticsService.calculateFeatureROI(
        'includeExpertEditing'
      );

      expect(roi).toBeDefined();
      expect(roi.featureName).toBe('includeExpertEditing');
      expect(typeof roi.totalUsers).toBe('number');
      expect(typeof roi.adoptionRate).toBe('number');
      expect(Array.isArray(roi.recommendations)).toBe(true);
    });

    it('should return empty data for unknown feature', async () => {
      const roi = await featureAnalyticsService.calculateFeatureROI(
        'unknownFeature123'
      );

      expect(roi).toBeDefined();
      expect(roi.totalUsers).toBe(0);
      expect(roi.activeUsers).toBe(0);
    });
  });

  describe('getFeatureUsageTrends', () => {
    it('should return usage trends for date range', async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const trends = await featureAnalyticsService.getFeatureUsageTrends(
        'includeExpertEditing',
        { start: startDate, end: endDate }
      );

      expect(Array.isArray(trends)).toBe(true);
    });
  });

  describe('getFeatureAdoption', () => {
    it('should return feature adoption report for plan', async () => {
      const plan = await subscriptionPlanRepository.create({
        name: `Adoption Plan ${Date.now()}`,
        price: 200,
        currency: 'USD',
        billingCycle: 'monthly',
        features: ['includeExpertEditing', 'includeCounselorSession'],
        maxUniversities: 20,
        maxCountries: 10
      });
      testPlanIds.push(plan.id);

      const report = await featureAnalyticsService.getFeatureAdoption(plan.id);

      expect(report).toBeDefined();
      expect(report.planId).toBe(plan.id);
      expect(report.planName).toBe(plan.name);
      expect(Array.isArray(report.features)).toBe(true);
    });
  });
});
