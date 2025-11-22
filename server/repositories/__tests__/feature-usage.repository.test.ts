import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { featureUsageRepository } from '../feature-usage.repository';
import { userRepository } from '../user.repository';
import { subscriptionPlanRepository, userSubscriptionRepository } from '../subscription.repository';

describe('FeatureUsageRepository', () => {
  let testUserIds: string[] = [];
  let testPlanIds: string[] = [];
  let testSubscriptionIds: string[] = [];
  let testEventIds: string[] = [];

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
    it('should create feature usage event', async () => {
      const user = await userRepository.create({
        email: `repo-track-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'customer',
        firstName: 'Repo',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      const plan = await subscriptionPlanRepository.create({
        name: `Repo Test Plan ${Date.now()}`,
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

      const event = await featureUsageRepository.trackFeatureUsage(
        user.id,
        subscription.id,
        'includeExpertEditing',
        'accessed',
        { testData: 'value' }
      );

      expect(event).toBeDefined();
      expect(event.userId).toBe(user.id);
      expect(event.subscriptionId).toBe(subscription.id);
      expect(event.featureName).toBe('includeExpertEditing');
      expect(event.usageType).toBe('accessed');
    });
  });

  describe('getUserFeatureActivity', () => {
    it('should return user feature activity', async () => {
      const user = await userRepository.create({
        email: `repo-activity-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'customer',
        firstName: 'Activity',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      const plan = await subscriptionPlanRepository.create({
        name: `Activity Plan ${Date.now()}`,
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

      await featureUsageRepository.trackFeatureUsage(
        user.id,
        subscription.id,
        'includeExpertEditing',
        'accessed'
      );

      const activity = await featureUsageRepository.getUserFeatureActivity(user.id);

      expect(Array.isArray(activity)).toBe(true);
      expect(activity.length).toBeGreaterThan(0);
    });

    it('should filter by date range', async () => {
      const user = await userRepository.create({
        email: `repo-range-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'customer',
        firstName: 'Range',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const activity = await featureUsageRepository.getUserFeatureActivity(
        user.id,
        { start: startDate, end: endDate }
      );

      expect(Array.isArray(activity)).toBe(true);
    });
  });

  describe('getFeatureUsageTrends', () => {
    it('should return usage trends', async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const trends = await featureUsageRepository.getFeatureUsageTrends(
        'includeExpertEditing',
        { start: startDate, end: endDate }
      );

      expect(Array.isArray(trends)).toBe(true);
    });
  });

  describe('getUnderutilizedFeatures', () => {
    it('should return list of underutilized features', async () => {
      const features = await featureUsageRepository.getUnderutilizedFeatures(20);

      expect(Array.isArray(features)).toBe(true);
    });
  });
});
