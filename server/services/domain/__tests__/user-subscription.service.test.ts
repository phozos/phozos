import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UserSubscriptionService } from '../user-subscription.service';
import { userRepository } from '../../../repositories/user.repository';
import { userSubscriptionRepository } from '../../../repositories/subscription.repository';
import { subscriptionPlanRepository } from '../../../repositories/subscription.repository';

describe('UserSubscriptionService', () => {
  let userSubscriptionService: UserSubscriptionService;
  let testUserIds: string[] = [];
  let testPlanIds: string[] = [];
  let testSubscriptionIds: string[] = [];

  beforeEach(() => {
    userSubscriptionService = new UserSubscriptionService();
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

  describe('getCurrentSubscription', () => {
    it('should return current subscription for user', async () => {
      const user = await userRepository.create({
        email: `test-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const plan = await subscriptionPlanRepository.create({
        name: 'Test Plan',
        price: 99.99,
        features: ['feature1', 'feature2'],
        maxUniversities: 10,
        maxCountries: 5,
        turnaroundDays: 7,
        isActive: true
      });
      testPlanIds.push(plan.id);

      const subscription = await userSubscriptionRepository.create({
        userId: user.id,
        planId: plan.id,
        status: 'active',
        startedAt: new Date()
      });
      testSubscriptionIds.push(subscription.id);

      const result = await userSubscriptionService.getCurrentSubscription(user.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(subscription.id);
      expect(result?.userId).toBe(user.id);
      expect(result?.planId).toBe(plan.id);
    });

    it('should return undefined if user has no subscription', async () => {
      const user = await userRepository.create({
        email: `test-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const result = await userSubscriptionService.getCurrentSubscription(user.id);

      expect(result).toBeUndefined();
    });
  });

  describe('createSubscription', () => {
    it('should create new subscription successfully', async () => {
      const user = await userRepository.create({
        email: `test-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const plan = await subscriptionPlanRepository.create({
        name: 'Premium Plan',
        price: 199.99,
        features: ['premium1', 'premium2'],
        maxUniversities: 20,
        maxCountries: 10,
        turnaroundDays: 3,
        isActive: true
      });
      testPlanIds.push(plan.id);

      const subscription = await userSubscriptionService.createSubscription({
        userId: user.id,
        planId: plan.id,
        status: 'active',
        startedAt: new Date()
      });
      testSubscriptionIds.push(subscription.id);

      expect(subscription).toBeDefined();
      expect(subscription.userId).toBe(user.id);
      expect(subscription.planId).toBe(plan.id);
      expect(subscription.status).toBe('active');
    });

    it('should throw validation error for invalid userId', async () => {
      const plan = await subscriptionPlanRepository.create({
        name: 'Test Plan',
        price: 99.99,
        features: ['feature1'],
        maxUniversities: 10,
        maxCountries: 5,
        turnaroundDays: 7,
        isActive: true
      });
      testPlanIds.push(plan.id);

      await expect(
        userSubscriptionService.createSubscription({
          userId: 'invalid-uuid',
          planId: plan.id,
          status: 'active',
          startedAt: new Date()
        })
      ).rejects.toThrow();
    });
  });

  describe('upgradeSubscription', () => {
    it('should upgrade existing subscription to new plan', async () => {
      const user = await userRepository.create({
        email: `test-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const oldPlan = await subscriptionPlanRepository.create({
        name: 'Basic Plan',
        price: 49.99,
        features: ['basic1'],
        maxUniversities: 5,
        maxCountries: 3,
        turnaroundDays: 14,
        isActive: true
      });
      testPlanIds.push(oldPlan.id);

      const newPlan = await subscriptionPlanRepository.create({
        name: 'Premium Plan',
        price: 199.99,
        features: ['premium1', 'premium2'],
        maxUniversities: 20,
        maxCountries: 10,
        turnaroundDays: 3,
        isActive: true
      });
      testPlanIds.push(newPlan.id);

      const oldSubscription = await userSubscriptionRepository.create({
        userId: user.id,
        planId: oldPlan.id,
        status: 'active',
        startedAt: new Date()
      });
      testSubscriptionIds.push(oldSubscription.id);

      const upgraded = await userSubscriptionService.upgradeSubscription(user.id, newPlan.id);

      expect(upgraded).toBeDefined();
      expect(upgraded.planId).toBe(newPlan.id);
      expect(upgraded.status).toBe('active');
    });

    it('should create new subscription if user has none', async () => {
      const user = await userRepository.create({
        email: `test-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const plan = await subscriptionPlanRepository.create({
        name: 'Premium Plan',
        price: 199.99,
        features: ['premium1'],
        maxUniversities: 20,
        maxCountries: 10,
        turnaroundDays: 3,
        isActive: true
      });
      testPlanIds.push(plan.id);

      const subscription = await userSubscriptionService.upgradeSubscription(user.id, plan.id);
      testSubscriptionIds.push(subscription.id);

      expect(subscription).toBeDefined();
      expect(subscription.userId).toBe(user.id);
      expect(subscription.planId).toBe(plan.id);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel active subscription', async () => {
      const user = await userRepository.create({
        email: `test-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const plan = await subscriptionPlanRepository.create({
        name: 'Test Plan',
        price: 99.99,
        features: ['feature1'],
        maxUniversities: 10,
        maxCountries: 5,
        turnaroundDays: 7,
        isActive: true
      });
      testPlanIds.push(plan.id);

      const subscription = await userSubscriptionRepository.create({
        userId: user.id,
        planId: plan.id,
        status: 'active',
        startedAt: new Date()
      });
      testSubscriptionIds.push(subscription.id);

      const result = await userSubscriptionService.cancelSubscription(subscription.id);

      expect(result).toBe(true);

      const cancelled = await userSubscriptionRepository.findById(subscription.id);
      expect(cancelled?.status).toBe('cancelled');
    });

    it('should return false if subscription not found', async () => {
      const result = await userSubscriptionService.cancelSubscription('00000000-0000-0000-0000-000000000001');

      expect(result).toBe(false);
    });
  });

  describe('getAllSubscriptions', () => {
    it('should return all user subscriptions with details', async () => {
      const user = await userRepository.create({
        email: `test-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const plan = await subscriptionPlanRepository.create({
        name: 'Test Plan',
        price: 99.99,
        features: ['feature1'],
        maxUniversities: 10,
        maxCountries: 5,
        turnaroundDays: 7,
        isActive: true
      });
      testPlanIds.push(plan.id);

      const subscription = await userSubscriptionRepository.create({
        userId: user.id,
        planId: plan.id,
        status: 'active',
        startedAt: new Date()
      });
      testSubscriptionIds.push(subscription.id);

      const result = await userSubscriptionService.getAllSubscriptions();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
