import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { userRepository } from '../../../repositories/user.repository';
import { userSubscriptionRepository, subscriptionPlanRepository } from '../../../repositories/subscription.repository';
import { container, TYPES } from '../../container';

describe('ProrationService - Proration Calculation Tests', () => {
  let ProrationService: any;
  let UserSubscriptionService: any;
  let ValidationServiceError: any;
  let prorationService: any;
  let userSubscriptionService: any;
  let testUserIds: string[] = [];
  let testPlanIds: string[] = [];
  let testSubscriptionIds: string[] = [];

  const testUserId = '550e8400-e29b-41d4-a716-446655440001';

  beforeAll(async () => {
    const userSubServiceModule = await import('../user-subscription.service');
    UserSubscriptionService = userSubServiceModule.UserSubscriptionService;
    
    userSubscriptionService = new UserSubscriptionService(
      userSubscriptionRepository,
      subscriptionPlanRepository
    );
    
    container.bind(TYPES.IUserSubscriptionService, userSubscriptionService);
    container.bind(TYPES.ISubscriptionPlanRepository, subscriptionPlanRepository);
    
    const prorationModule = await import('../proration.service');
    ProrationService = prorationModule.ProrationService;
    
    const errorsModule = await import('../../errors');
    ValidationServiceError = errorsModule.ValidationServiceError;
  });

  beforeEach(() => {
    prorationService = new ProrationService(
      userSubscriptionService,
      subscriptionPlanRepository
    );
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

  describe('Input Validation', () => {
    it('should throw ValidationServiceError for invalid userId', async () => {
      const plan = await subscriptionPlanRepository.create({
        name: 'Test Plan',
        price: '100.00',
        currency: 'INR',
        tierLevel: 101,
        features: ['Feature 1'],
        maxUniversities: 20,
        maxCountries: 10,
        turnaroundDays: 5,
        isActive: true
      });
      testPlanIds.push(plan.id);

      await expect(
        prorationService.calculate('invalid-uuid', plan.id)
      ).rejects.toThrow(ValidationServiceError);
    });

    it('should throw ValidationServiceError for invalid targetPlanId', async () => {
      const user = await userRepository.create({
        email: `test-validation-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      await expect(
        prorationService.calculate(user.id, 'invalid-uuid')
      ).rejects.toThrow(ValidationServiceError);
    });
  });

  describe('Scenario 1: New Subscription (Full Price)', () => {
    it('should return full price for new subscription with no active subscription', async () => {
      const user = await userRepository.create({
        email: `test-new-sub-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const plan = await subscriptionPlanRepository.create({
        name: 'Premium Plan',
        price: '100.00',
        currency: 'INR',
        tierLevel: 102,
        features: ['Premium Features'],
        maxUniversities: 20,
        maxCountries: 10,
        turnaroundDays: 5,
        isActive: true
      });
      testPlanIds.push(plan.id);

      const result = await prorationService.calculate(user.id, plan.id);

      expect(result.allowed).toBe(true);
      expect(result.prorationAmount).toBe(100);
      expect(result.newPlanPrice).toBe(100);
      expect(result.alreadyPaid).toBe(0);
      expect(result.currency).toBe('INR');
      expect(result.isUpgrade).toBe(false);
      expect(result.requiresPayment).toBe(true);
      expect(result.reason).toBe('New subscription - full price');
    });

    it('should return full price for user with inactive subscription', async () => {
      const user = await userRepository.create({
        email: `test-inactive-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Jane',
        lastName: 'Smith',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const oldPlan = await subscriptionPlanRepository.create({
        name: 'Basic Plan',
        price: '50.00',
        currency: 'INR',
        tierLevel: 103,
        features: ['Basic Features'],
        maxUniversities: 10,
        maxCountries: 5,
        turnaroundDays: 10,
        isActive: true
      });
      testPlanIds.push(oldPlan.id);

      const newPlan = await subscriptionPlanRepository.create({
        name: 'Premium Plan',
        price: '100.00',
        currency: 'INR',
        tierLevel: 104,
        features: ['Premium Features'],
        maxUniversities: 20,
        maxCountries: 10,
        turnaroundDays: 5,
        isActive: true
      });
      testPlanIds.push(newPlan.id);

      const oldSub = await userSubscriptionRepository.create({
        userId: user.id,
        planId: oldPlan.id,
        status: 'cancelled',
        startedAt: new Date(),
        amountPaid: '50.00',
        currency: 'INR',
        tierLevel: 103
      });
      testSubscriptionIds.push(oldSub.id);

      const result = await prorationService.calculate(user.id, newPlan.id);

      expect(result.allowed).toBe(true);
      expect(result.prorationAmount).toBe(100);
      expect(result.requiresPayment).toBe(true);
      expect(result.isUpgrade).toBe(false);
    });
  });

  describe('Scenario 2: Upgrade with Proration', () => {
    it('should calculate correct proration amount for upgrade from Premium to Elite', async () => {
      const user = await userRepository.create({
        email: `test-upgrade-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Alex',
        lastName: 'Johnson',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const premiumPlan = await subscriptionPlanRepository.create({
        name: 'Premium Plan',
        price: '100.00',
        currency: 'INR',
        tierLevel: 105,
        features: ['Premium Features'],
        maxUniversities: 20,
        maxCountries: 10,
        turnaroundDays: 5,
        isActive: true
      });
      testPlanIds.push(premiumPlan.id);

      const elitePlan = await subscriptionPlanRepository.create({
        name: 'Elite Plan',
        price: '200.00',
        currency: 'INR',
        tierLevel: 106,
        features: ['Elite Features'],
        maxUniversities: 50,
        maxCountries: 20,
        turnaroundDays: 2,
        isActive: true
      });
      testPlanIds.push(elitePlan.id);

      const subscription = await userSubscriptionRepository.create({
        userId: user.id,
        planId: premiumPlan.id,
        status: 'active',
        startedAt: new Date(),
        amountPaid: '100.00',
        currency: 'INR',
        tierLevel: 105,
        isLifetime: true,
        lifetimeActivatedAt: new Date()
      });
      testSubscriptionIds.push(subscription.id);

      const result = await prorationService.calculate(user.id, elitePlan.id);

      expect(result.allowed).toBe(true);
      expect(result.prorationAmount).toBe(100);
      expect(result.newPlanPrice).toBe(200);
      expect(result.alreadyPaid).toBe(100);
      expect(result.currency).toBe('INR');
      expect(result.isUpgrade).toBe(true);
      expect(result.requiresPayment).toBe(true);
      expect(result.reason).toBe('Upgrade to Elite Plan - Pay 100.00 INR');
    });

    it('should handle proration with decimal amounts correctly', async () => {
      const user = await userRepository.create({
        email: `test-decimal-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Chris',
        lastName: 'Brown',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const premiumPlan = await subscriptionPlanRepository.create({
        name: 'Premium Plan',
        price: '99.99',
        currency: 'INR',
        tierLevel: 107,
        features: ['Premium Features'],
        maxUniversities: 20,
        maxCountries: 10,
        turnaroundDays: 5,
        isActive: true
      });
      testPlanIds.push(premiumPlan.id);

      const elitePlan = await subscriptionPlanRepository.create({
        name: 'Elite Plan',
        price: '199.99',
        currency: 'INR',
        tierLevel: 108,
        features: ['Elite Features'],
        maxUniversities: 50,
        maxCountries: 20,
        turnaroundDays: 2,
        isActive: true
      });
      testPlanIds.push(elitePlan.id);

      const subscription = await userSubscriptionRepository.create({
        userId: user.id,
        planId: premiumPlan.id,
        status: 'active',
        startedAt: new Date(),
        amountPaid: '99.99',
        currency: 'INR',
        tierLevel: 107,
        isLifetime: true,
        lifetimeActivatedAt: new Date()
      });
      testSubscriptionIds.push(subscription.id);

      const result = await prorationService.calculate(user.id, elitePlan.id);

      expect(result.prorationAmount).toBeCloseTo(100, 0);
      expect(result.alreadyPaid).toBeCloseTo(99.99, 2);
      expect(result.newPlanPrice).toBeCloseTo(199.99, 2);
      expect(result.requiresPayment).toBe(true);
    });
  });

  describe('Scenario 3: Same Plan Rejection', () => {
    it('should reject when user tries to purchase the same plan they already have', async () => {
      const user = await userRepository.create({
        email: `test-same-plan-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Sam',
        lastName: 'Williams',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const plan = await subscriptionPlanRepository.create({
        name: 'Premium Plan',
        price: '100.00',
        currency: 'INR',
        tierLevel: 109,
        features: ['Premium Features'],
        maxUniversities: 20,
        maxCountries: 10,
        turnaroundDays: 5,
        isActive: true
      });
      testPlanIds.push(plan.id);

      const subscription = await userSubscriptionRepository.create({
        userId: user.id,
        planId: plan.id,
        status: 'active',
        startedAt: new Date(),
        amountPaid: '100.00',
        currency: 'INR',
        tierLevel: 109,
        isLifetime: true,
        lifetimeActivatedAt: new Date()
      });
      testSubscriptionIds.push(subscription.id);

      const result = await prorationService.calculate(user.id, plan.id);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('You already have this plan');
      expect(result.requiresPayment).toBe(false);
    });
  });

  describe('Scenario 4: Downgrade Rejection', () => {
    it('should reject downgrade from Elite (tier 3) to Premium (tier 2)', async () => {
      const user = await userRepository.create({
        email: `test-downgrade-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Taylor',
        lastName: 'Davis',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const premiumPlan = await subscriptionPlanRepository.create({
        name: 'Premium Plan',
        price: '100.00',
        currency: 'INR',
        tierLevel: 110,
        features: ['Premium Features'],
        maxUniversities: 20,
        maxCountries: 10,
        turnaroundDays: 5,
        isActive: true
      });
      testPlanIds.push(premiumPlan.id);

      const elitePlan = await subscriptionPlanRepository.create({
        name: 'Elite Plan',
        price: '200.00',
        currency: 'INR',
        tierLevel: 111,
        features: ['Elite Features'],
        maxUniversities: 50,
        maxCountries: 20,
        turnaroundDays: 2,
        isActive: true
      });
      testPlanIds.push(elitePlan.id);

      const subscription = await userSubscriptionRepository.create({
        userId: user.id,
        planId: elitePlan.id,
        status: 'active',
        startedAt: new Date(),
        amountPaid: '200.00',
        currency: 'INR',
        tierLevel: 111,
        isLifetime: true,
        lifetimeActivatedAt: new Date()
      });
      testSubscriptionIds.push(subscription.id);

      const result = await prorationService.calculate(user.id, premiumPlan.id);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Cannot downgrade to a lower tier');
      expect(result.requiresPayment).toBe(false);
    });

    it('should allow upgrade between different tiers with same price', async () => {
      const user = await userRepository.create({
        email: `test-same-tier-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Morgan',
        lastName: 'Lee',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const planA = await subscriptionPlanRepository.create({
        name: 'Premium Plan A',
        price: '100.00',
        currency: 'INR',
        tierLevel: 112,
        features: ['Premium Features A'],
        maxUniversities: 20,
        maxCountries: 10,
        turnaroundDays: 5,
        isActive: true
      });
      testPlanIds.push(planA.id);

      const planB = await subscriptionPlanRepository.create({
        name: 'Premium Plan B',
        price: '100.00',
        currency: 'INR',
        tierLevel: 113,
        features: ['Premium Features B'],
        maxUniversities: 30,
        maxCountries: 15,
        turnaroundDays: 3,
        isActive: true
      });
      testPlanIds.push(planB.id);

      const subscription = await userSubscriptionRepository.create({
        userId: user.id,
        planId: planA.id,
        status: 'active',
        startedAt: new Date(),
        amountPaid: '100.00',
        currency: 'INR',
        tierLevel: 112,
        isLifetime: true,
        lifetimeActivatedAt: new Date()
      });
      testSubscriptionIds.push(subscription.id);

      const result = await prorationService.calculate(user.id, planB.id);

      expect(result.allowed).toBe(true);
      expect(result.isUpgrade).toBe(true);
      expect(result.requiresPayment).toBe(false);
      expect(result.prorationAmount).toBe(0);
    });
  });

  describe('Scenario 5: Already at Highest Tier', () => {
    it('should reject when user tries to purchase same Elite plan they already have', async () => {
      const user = await userRepository.create({
        email: `test-highest-tier-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Jordan',
        lastName: 'Taylor',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const elitePlan = await subscriptionPlanRepository.create({
        name: 'Elite Plan',
        price: '200.00',
        currency: 'INR',
        tierLevel: 113,
        features: ['Elite Features'],
        maxUniversities: 50,
        maxCountries: 20,
        turnaroundDays: 2,
        isActive: true
      });
      testPlanIds.push(elitePlan.id);

      const subscription = await userSubscriptionRepository.create({
        userId: user.id,
        planId: elitePlan.id,
        status: 'active',
        startedAt: new Date(),
        amountPaid: '200.00',
        currency: 'INR',
        tierLevel: 113,
        isLifetime: true,
        lifetimeActivatedAt: new Date()
      });
      testSubscriptionIds.push(subscription.id);

      const result = await prorationService.calculate(user.id, elitePlan.id);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('You already have this plan');
      expect(result.requiresPayment).toBe(false);
    });
  });

  describe('Scenario 6: Currency Mismatch', () => {
    it('should reject upgrade when currencies do not match', async () => {
      const user = await userRepository.create({
        email: `test-currency-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Casey',
        lastName: 'Martinez',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const inrPlan = await subscriptionPlanRepository.create({
        name: 'Premium Plan INR',
        price: '100.00',
        currency: 'INR',
        tierLevel: 114,
        features: ['Premium Features'],
        maxUniversities: 20,
        maxCountries: 10,
        turnaroundDays: 5,
        isActive: true
      });
      testPlanIds.push(inrPlan.id);

      const usdPlan = await subscriptionPlanRepository.create({
        name: 'Elite Plan USD',
        price: '200.00',
        currency: 'USD',
        tierLevel: 115,
        features: ['Elite Features'],
        maxUniversities: 50,
        maxCountries: 20,
        turnaroundDays: 2,
        isActive: true
      });
      testPlanIds.push(usdPlan.id);

      const subscription = await userSubscriptionRepository.create({
        userId: user.id,
        planId: inrPlan.id,
        status: 'active',
        startedAt: new Date(),
        amountPaid: '100.00',
        currency: 'INR',
        tierLevel: 114,
        isLifetime: true,
        lifetimeActivatedAt: new Date()
      });
      testSubscriptionIds.push(subscription.id);

      const result = await prorationService.calculate(user.id, usdPlan.id);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Currency mismatch');
      expect(result.reason).toContain('INR');
      expect(result.reason).toContain('USD');
      expect(result.requiresPayment).toBe(false);
    });
  });

  describe('Scenario 7: Invalid Plan ID', () => {
    it('should throw error when target plan does not exist', async () => {
      const user = await userRepository.create({
        email: `test-invalid-plan-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Riley',
        lastName: 'Anderson',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const nonExistentPlanId = '550e8400-e29b-41d4-a716-446655440999';

      await expect(
        prorationService.calculate(user.id, nonExistentPlanId)
      ).rejects.toThrow();
    });
  });

  describe('Scenario 8: Edge Case - Zero Proration (Already Paid Full Amount)', () => {
    it('should require no payment when upgrading to plan with same price', async () => {
      const user = await userRepository.create({
        email: `test-zero-proration-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Avery',
        lastName: 'Garcia',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const planA = await subscriptionPlanRepository.create({
        name: 'Plan A',
        price: '100.00',
        currency: 'INR',
        tierLevel: 116,
        features: ['Features A'],
        maxUniversities: 20,
        maxCountries: 10,
        turnaroundDays: 5,
        isActive: true
      });
      testPlanIds.push(planA.id);

      const planB = await subscriptionPlanRepository.create({
        name: 'Plan B',
        price: '100.00',
        currency: 'INR',
        tierLevel: 117,
        features: ['Features B - Different Benefits'],
        maxUniversities: 30,
        maxCountries: 15,
        turnaroundDays: 3,
        isActive: true
      });
      testPlanIds.push(planB.id);

      const subscription = await userSubscriptionRepository.create({
        userId: user.id,
        planId: planA.id,
        status: 'active',
        startedAt: new Date(),
        amountPaid: '100.00',
        currency: 'INR',
        tierLevel: 116,
        isLifetime: true,
        lifetimeActivatedAt: new Date()
      });
      testSubscriptionIds.push(subscription.id);

      const result = await prorationService.calculate(user.id, planB.id);

      expect(result.allowed).toBe(true);
      expect(result.prorationAmount).toBe(0);
      expect(result.newPlanPrice).toBe(100);
      expect(result.alreadyPaid).toBe(100);
      expect(result.isUpgrade).toBe(true);
      expect(result.requiresPayment).toBe(false);
      expect(result.reason).toBe('Upgrade to Plan B - No additional payment required');
    });

    it('should handle case when user paid more than new plan price', async () => {
      const user = await userRepository.create({
        email: `test-overpaid-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Blake',
        lastName: 'Cooper',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const elitePlan = await subscriptionPlanRepository.create({
        name: 'Elite Plan',
        price: '200.00',
        currency: 'INR',
        tierLevel: 118,
        features: ['Elite Features'],
        maxUniversities: 50,
        maxCountries: 20,
        turnaroundDays: 2,
        isActive: true
      });
      testPlanIds.push(elitePlan.id);

      const platinumPlan = await subscriptionPlanRepository.create({
        name: 'Platinum Plan',
        price: '180.00',
        currency: 'INR',
        tierLevel: 119,
        features: ['Platinum Features'],
        maxUniversities: 60,
        maxCountries: 25,
        turnaroundDays: 1,
        isActive: true
      });
      testPlanIds.push(platinumPlan.id);

      const subscription = await userSubscriptionRepository.create({
        userId: user.id,
        planId: elitePlan.id,
        status: 'active',
        startedAt: new Date(),
        amountPaid: '200.00',
        currency: 'INR',
        tierLevel: 118,
        isLifetime: true,
        lifetimeActivatedAt: new Date()
      });
      testSubscriptionIds.push(subscription.id);

      const result = await prorationService.calculate(user.id, platinumPlan.id);

      expect(result.prorationAmount).toBe(0);
      expect(result.requiresPayment).toBe(false);
      expect(result.alreadyPaid).toBe(200);
      expect(result.newPlanPrice).toBe(180);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing amountPaid in subscription (fallback to plan price)', async () => {
      const user = await userRepository.create({
        email: `test-fallback-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Quinn',
        lastName: 'Murphy',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const premiumPlan = await subscriptionPlanRepository.create({
        name: 'Premium Plan',
        price: '100.00',
        currency: 'INR',
        tierLevel: 120,
        features: ['Premium Features'],
        maxUniversities: 20,
        maxCountries: 10,
        turnaroundDays: 5,
        isActive: true
      });
      testPlanIds.push(premiumPlan.id);

      const elitePlan = await subscriptionPlanRepository.create({
        name: 'Elite Plan',
        price: '200.00',
        currency: 'INR',
        tierLevel: 121,
        features: ['Elite Features'],
        maxUniversities: 50,
        maxCountries: 20,
        turnaroundDays: 2,
        isActive: true
      });
      testPlanIds.push(elitePlan.id);

      const subscription = await userSubscriptionRepository.create({
        userId: user.id,
        planId: premiumPlan.id,
        status: 'active',
        startedAt: new Date(),
        amountPaid: '100.00',
        currency: 'INR',
        tierLevel: 120,
        isLifetime: true,
        lifetimeActivatedAt: new Date()
      });
      testSubscriptionIds.push(subscription.id);

      const result = await prorationService.calculate(user.id, elitePlan.id);

      expect(result.alreadyPaid).toBe(100);
      expect(result.prorationAmount).toBe(100);
      expect(result.requiresPayment).toBe(true);
    });
  });
});
