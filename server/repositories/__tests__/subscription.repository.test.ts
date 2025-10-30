import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { subscriptionPlanRepository, userSubscriptionRepository } from '../subscription.repository';
import { userRepository } from '../user.repository';

describe('SubscriptionPlanRepository', () => {
  let testPlanIds: string[] = [];

  afterEach(async () => {
    for (const planId of testPlanIds) {
      try {
        await subscriptionPlanRepository.delete(planId);
      } catch (error) {
        console.log('Plan cleanup failed:', error);
      }
    }
    testPlanIds = [];
  });

  describe('create and findById', () => {
    it('should create and retrieve a subscription plan', async () => {
      const plan = await subscriptionPlanRepository.create({
        name: `Test Plan ${Date.now()}`,
        price: 9.99,
        currency: 'USD',
        billingCycle: 'monthly',
        features: ['Feature 1', 'Feature 2'],
        maxUniversities: 10,
        maxCountries: 5,
        turnaroundDays: 7,
        isActive: true
      });
      testPlanIds.push(plan.id);

      expect(plan.id).toBeDefined();
      expect(plan.name).toContain('Test Plan');

      const found = await subscriptionPlanRepository.findById(plan.id);
      expect(found).toBeDefined();
      expect(found?.price).toBe('9.99');
    });
  });

  describe('findActive', () => {
    it('should return only active plans', async () => {
      const activePlan = await subscriptionPlanRepository.create({
        name: `Active Plan ${Date.now()}`,
        price: 19.99,
        currency: 'USD',
        billingCycle: 'monthly',
        features: ['Active Feature'],
        maxUniversities: 20,
        maxCountries: 10,
        turnaroundDays: 5,
        isActive: true
      });
      testPlanIds.push(activePlan.id);

      const inactivePlan = await subscriptionPlanRepository.create({
        name: `Inactive Plan ${Date.now()}`,
        price: 29.99,
        currency: 'USD',
        billingCycle: 'monthly',
        features: ['Inactive Feature'],
        maxUniversities: 30,
        maxCountries: 15,
        turnaroundDays: 3,
        isActive: false
      });
      testPlanIds.push(inactivePlan.id);

      const activePlans = await subscriptionPlanRepository.findActive();
      const planNames = activePlans.map(p => p.name);
      
      expect(planNames).toContain(activePlan.name);
      expect(planNames).not.toContain(inactivePlan.name);
    });
  });

  describe('update', () => {
    it('should update subscription plan', async () => {
      const plan = await subscriptionPlanRepository.create({
        name: `Original Plan ${Date.now()}`,
        price: 9.99,
        currency: 'USD',
        billingCycle: 'monthly',
        features: ['Original Feature'],
        maxUniversities: 5,
        maxCountries: 3,
        turnaroundDays: 10,
        isActive: true
      });
      testPlanIds.push(plan.id);

      const updated = await subscriptionPlanRepository.update(plan.id, {
        name: 'Updated Plan',
        price: 14.99
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated Plan');
      expect(updated?.price).toBe('14.99');
    });
  });

  describe('findAll', () => {
    it('should find all subscription plans', async () => {
      const plan = await subscriptionPlanRepository.create({
        name: `FindAll Plan ${Date.now()}`,
        price: 24.99,
        currency: 'USD',
        billingCycle: 'monthly',
        features: ['Feature'],
        maxUniversities: 25,
        maxCountries: 10,
        turnaroundDays: 5,
        isActive: true
      });
      testPlanIds.push(plan.id);

      const plans = await subscriptionPlanRepository.findAll();
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBeGreaterThan(0);
    });
  });

  describe('delete', () => {
    it('should delete a subscription plan', async () => {
      const plan = await subscriptionPlanRepository.create({
        name: `Delete Plan ${Date.now()}`,
        price: 39.99,
        currency: 'USD',
        billingCycle: 'monthly',
        features: ['To Delete'],
        maxUniversities: 50,
        maxCountries: 20,
        turnaroundDays: 2,
        isActive: false
      });

      const deleted = await subscriptionPlanRepository.delete(plan.id);
      expect(deleted).toBe(true);

      const found = await subscriptionPlanRepository.findById(plan.id);
      expect(found).toBeUndefined();
    });
  });
});

describe('UserSubscriptionRepository', () => {
  let testUserId: string;
  let testPlanId: string;
  let testSubscriptionIds: string[] = [];

  beforeEach(async () => {
    // Create test user
    const user = await userRepository.create({
      email: `sub-test-${Date.now()}@example.com`,
      password: 'hashedPassword123',
      userType: 'customer',
      firstName: 'Sub',
      lastName: 'Test'
    });
    testUserId = user.id;

    // Create test plan
    const plan = await subscriptionPlanRepository.create({
      name: `Test Plan ${Date.now()}`,
      price: 19.99,
      currency: 'USD',
      billingCycle: 'monthly',
      features: ['Test Feature'],
      maxUniversities: 15,
      maxCountries: 8,
      turnaroundDays: 7,
      isActive: true
    });
    testPlanId = plan.id;
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

    if (testPlanId) {
      try {
        await subscriptionPlanRepository.delete(testPlanId);
      } catch (error) {
        console.log('Plan cleanup failed:', error);
      }
    }
    if (testUserId) {
      try {
        await userRepository.delete(testUserId);
      } catch (error) {
        console.log('User cleanup failed:', error);
      }
    }
  });

  describe('create and findById', () => {
    it('should create and retrieve a user subscription', async () => {
      const subscription = await userSubscriptionRepository.create({
        userId: testUserId,
        planId: testPlanId,
        status: 'active'
      });
      testSubscriptionIds.push(subscription.id);

      expect(subscription.id).toBeDefined();
      expect(subscription.userId).toBe(testUserId);

      const found = await userSubscriptionRepository.findById(subscription.id);
      expect(found).toBeDefined();
      expect(found?.status).toBe('active');
    });
  });

  describe('findByUser', () => {
    it('should find active subscription for user', async () => {
      const subscription = await userSubscriptionRepository.create({
        userId: testUserId,
        planId: testPlanId,
        status: 'active'
      });
      testSubscriptionIds.push(subscription.id);

      const found = await userSubscriptionRepository.findByUser(testUserId);
      expect(found).toBeDefined();
      expect(found?.userId).toBe(testUserId);
      expect(found?.status).toBe('active');
    });

    it('should return undefined for user with no active subscription', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000001';
      const found = await userSubscriptionRepository.findByUser(fakeUserId);
      expect(found).toBeUndefined();
    });
  });

  describe('findByUserWithPlan', () => {
    it('should return subscription with plan details', async () => {
      const subscription = await userSubscriptionRepository.create({
        userId: testUserId,
        planId: testPlanId,
        status: 'active'
      });
      testSubscriptionIds.push(subscription.id);

      const result = await userSubscriptionRepository.findByUserWithPlan(testUserId);
      expect(result).toBeDefined();
      expect(result.subscription).toBeDefined();
      expect(result.plan).toBeDefined();
      expect(result.plan.id).toBe(testPlanId);
    });

    it('should return undefined when user has no active subscription', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000999';
      const result = await userSubscriptionRepository.findByUserWithPlan(fakeUserId);
      expect(result).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update user subscription', async () => {
      const subscription = await userSubscriptionRepository.create({
        userId: testUserId,
        planId: testPlanId,
        status: 'active'
      });
      testSubscriptionIds.push(subscription.id);

      const updated = await userSubscriptionRepository.update(subscription.id, {
        status: 'cancelled'
      });

      expect(updated).toBeDefined();
      expect(updated?.status).toBe('cancelled');
    });
  });

  describe('findAll', () => {
    it('should find all user subscriptions', async () => {
      const subscription = await userSubscriptionRepository.create({
        userId: testUserId,
        planId: testPlanId,
        status: 'active'
      });
      testSubscriptionIds.push(subscription.id);

      const subscriptions = await userSubscriptionRepository.findAll();
      expect(Array.isArray(subscriptions)).toBe(true);
      expect(subscriptions.length).toBeGreaterThan(0);
    });
  });

  describe('findAllWithDetails', () => {
    it('should find all subscriptions with user and plan details', async () => {
      const subscription = await userSubscriptionRepository.create({
        userId: testUserId,
        planId: testPlanId,
        status: 'active'
      });
      testSubscriptionIds.push(subscription.id);

      const details = await userSubscriptionRepository.findAllWithDetails();
      expect(Array.isArray(details)).toBe(true);
      expect(details.length).toBeGreaterThan(0);
      expect(details[0].subscription).toBeDefined();
      expect(details[0].user).toBeDefined();
      expect(details[0].plan).toBeDefined();
    });
  });

  describe('delete', () => {
    it('should delete a user subscription', async () => {
      const subscription = await userSubscriptionRepository.create({
        userId: testUserId,
        planId: testPlanId,
        status: 'active'
      });

      const deleted = await userSubscriptionRepository.delete(subscription.id);
      expect(deleted).toBe(true);

      const found = await userSubscriptionRepository.findById(subscription.id);
      expect(found).toBeUndefined();
    });
  });
});
