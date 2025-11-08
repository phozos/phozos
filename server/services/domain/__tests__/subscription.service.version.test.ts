import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SubscriptionService } from '../subscription.service';
import { UserSubscriptionService } from '../user-subscription.service';
import { subscriptionPlanRepository, userSubscriptionRepository } from '../../../repositories/subscription.repository';
import { userRepository } from '../../../repositories/user.repository';
import { InvalidOperationError } from '../../errors';

describe('SubscriptionService - Phase 3: Versioning & Grandfathering', () => {
  let subscriptionService: SubscriptionService;
  let userSubscriptionService: UserSubscriptionService;
  let testUserIds: string[] = [];
  let testPlanIds: string[] = [];
  let testSubscriptionIds: string[] = [];
  let testAdminId: string;

  beforeEach(async () => {
    subscriptionService = new SubscriptionService();
    userSubscriptionService = new UserSubscriptionService();

    const adminUser = await userRepository.create({
      email: `admin-version-test-${Date.now()}-${Math.random()}@example.com`,
      password: 'hashedPassword123',
      userType: 'team_member',
      teamRole: 'admin',
      firstName: 'Admin',
      lastName: 'User'
    });
    testAdminId = adminUser.id;
    testUserIds.push(adminUser.id);
  });

  afterEach(async () => {
    for (const subscriptionId of testSubscriptionIds) {
      try {
        await userSubscriptionRepository.delete(subscriptionId);
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

  describe('Price Change Protection', () => {
    it('should BLOCK price updates on plans with active subscribers', async () => {
      const plan = await subscriptionService.createSubscriptionPlan(
        {
          name: `Test Plan ${Date.now()}`,
          price: 100,
          currency: 'USD',
          isActive: true,
          features: ['Feature 1'] as any,
          maxUniversities: 10,
          maxCountries: 5,
          turnaroundDays: 7,
          tierLevel: 1
        },
        testAdminId
      );
      testPlanIds.push(plan.id);

      const user = await userRepository.create({
        email: `subscriber-${Date.now()}@example.com`,
        password: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const subscription = await userSubscriptionService.subscribeUserToPlan(user.id, plan.id);
      testSubscriptionIds.push(subscription.id);

      await expect(
        subscriptionService.updateSubscriptionPlan(
          plan.id,
          { price: 150 as any },
          testAdminId,
          'Attempted price change'
        )
      ).rejects.toThrow(InvalidOperationError);
    });

    it('should ALLOW non-price updates on plans with subscribers', async () => {
      const plan = await subscriptionService.createSubscriptionPlan(
        {
          name: `Allow Update Plan ${Date.now()}`,
          price: 100,
          currency: 'USD',
          isActive: true,
          features: ['Feature 1'] as any,
          maxUniversities: 10,
          maxCountries: 5,
          turnaroundDays: 7,
          tierLevel: 1
        },
        testAdminId
      );
      testPlanIds.push(plan.id);

      const user = await userRepository.create({
        email: `subscriber2-${Date.now()}@example.com`,
        password: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const subscription = await userSubscriptionService.subscribeUserToPlan(user.id, plan.id);
      testSubscriptionIds.push(subscription.id);

      const updated = await subscriptionService.updateSubscriptionPlan(
        plan.id,
        { description: 'Updated description' },
        testAdminId,
        'Updating description'
      );

      expect(updated).toBeDefined();
      expect(updated?.description).toBe('Updated description');
      expect(Number(updated?.price)).toBe(100);
    });

    it('should ALLOW price updates on plans with NO subscribers', async () => {
      const plan = await subscriptionService.createSubscriptionPlan(
        {
          name: `No Subscribers Plan ${Date.now()}`,
          price: 100,
          currency: 'USD',
          isActive: true,
          features: ['Feature 1'] as any,
          maxUniversities: 10,
          maxCountries: 5,
          turnaroundDays: 7,
          tierLevel: 1
        },
        testAdminId
      );
      testPlanIds.push(plan.id);

      const updated = await subscriptionService.updateSubscriptionPlan(
        plan.id,
        { price: 150 as any },
        testAdminId,
        'Price update on plan with no subscribers'
      );

      expect(updated).toBeDefined();
      expect(Number(updated?.price)).toBe(150);
    });
  });

  describe('Price Change Versioning with updatePlanPrice()', () => {
    it('should create new version for price changes', async () => {
      const plan = await subscriptionService.createSubscriptionPlan(
        {
          name: `Versioning Plan ${Date.now()}`,
          price: 100,
          currency: 'USD',
          isActive: true,
          features: ['Feature 1'] as any,
          maxUniversities: 10,
          maxCountries: 5,
          turnaroundDays: 7,
          tierLevel: 1
        },
        testAdminId
      );
      testPlanIds.push(plan.id);

      expect(plan.version).toBe(1);
      expect(plan.isLatestVersion).toBe(true);

      const newVersion = await subscriptionService.updatePlanPrice(
        plan.id,
        150,
        testAdminId,
        'Price increase due to market changes'
      );
      testPlanIds.push(newVersion.id);

      expect(newVersion.id).not.toBe(plan.id);
      expect(newVersion.version).toBe(2);
      expect(newVersion.basePlanId).toBe(plan.basePlanId || plan.id);
      expect(Number(newVersion.price)).toBe(150);
      expect(newVersion.isLatestVersion).toBe(true);

      const oldPlanRefresh = await subscriptionService.getSubscriptionPlan(plan.id);
      expect(oldPlanRefresh?.isLatestVersion).toBe(false);
    });

    it('should keep old version unchanged after price update', async () => {
      const plan = await subscriptionService.createSubscriptionPlan(
        {
          name: `Keep Old Version ${Date.now()}`,
          price: 100,
          currency: 'USD',
          isActive: true,
          features: ['Feature 1'] as any,
          maxUniversities: 10,
          maxCountries: 5,
          turnaroundDays: 7,
          tierLevel: 1
        },
        testAdminId
      );
      testPlanIds.push(plan.id);

      const newVersion = await subscriptionService.updatePlanPrice(plan.id, 200, testAdminId);
      testPlanIds.push(newVersion.id);

      const oldPlan = await subscriptionService.getSubscriptionPlan(plan.id);
      expect(oldPlan).toBeDefined();
      expect(Number(oldPlan?.price)).toBe(100);
      expect(oldPlan?.isLatestVersion).toBe(false);
    });
  });

  describe('Grandfathering on Subscription Creation', () => {
    it('should populate grandfathering snapshot on new subscription', async () => {
      const plan = await subscriptionService.createSubscriptionPlan(
        {
          name: `Grandfathering Test ${Date.now()}`,
          price: 99.99,
          currency: 'USD',
          isActive: true,
          features: ['Feature A', 'Feature B'] as any,
          maxUniversities: 15,
          maxCountries: 8,
          turnaroundDays: 5,
          tierLevel: 2
        },
        testAdminId
      );
      testPlanIds.push(plan.id);

      const user = await userRepository.create({
        email: `grandfathered-${Date.now()}@example.com`,
        password: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const subscription = await userSubscriptionService.subscribeUserToPlan(user.id, plan.id);
      testSubscriptionIds.push(subscription.id);

      expect(subscription.isGrandfathered).toBe(true);
      expect(subscription.grandfatheredPrice).toBeDefined();
      expect(Number(subscription.grandfatheredPrice)).toBe(99.99);
      expect(subscription.grandfatheredUntil).toBeNull();
      expect(subscription.subscribedPlanSnapshot).toBeDefined();
      
      const snapshot = subscription.subscribedPlanSnapshot as any;
      expect(snapshot.name).toBe(plan.name);
      expect(Number(snapshot.price)).toBe(99.99);
      expect(snapshot.features).toEqual(['Feature A', 'Feature B']);
    });

    it('should preserve grandfathered price after plan price increase', async () => {
      const plan = await subscriptionService.createSubscriptionPlan(
        {
          name: `Price Preservation ${Date.now()}`,
          price: 100,
          currency: 'USD',
          isActive: true,
          features: ['Feature 1'] as any,
          maxUniversities: 10,
          maxCountries: 5,
          turnaroundDays: 7,
          tierLevel: 1
        },
        testAdminId
      );
      testPlanIds.push(plan.id);

      const user = await userRepository.create({
        email: `preserve-price-${Date.now()}@example.com`,
        password: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const subscription = await userSubscriptionService.subscribeUserToPlan(user.id, plan.id);
      testSubscriptionIds.push(subscription.id);

      const newVersion = await subscriptionService.updatePlanPrice(plan.id, 150, testAdminId);
      testPlanIds.push(newVersion.id);

      const refreshedSub = await userSubscriptionService.getCurrentSubscription(user.id);
      
      expect(refreshedSub?.planId).toBe(plan.id);
      expect(Number(refreshedSub?.grandfatheredPrice)).toBe(100);
      expect(refreshedSub?.isGrandfathered).toBe(true);
    });
  });

  describe('Version Redirection on New Subscriptions', () => {
    it('should redirect to latest version when subscribing to old version', async () => {
      const plan = await subscriptionService.createSubscriptionPlan(
        {
          name: `Redirection Test ${Date.now()}`,
          price: 100,
          currency: 'USD',
          isActive: true,
          features: ['Feature 1'] as any,
          maxUniversities: 10,
          maxCountries: 5,
          turnaroundDays: 7,
          tierLevel: 1
        },
        testAdminId
      );
      testPlanIds.push(plan.id);

      const v2 = await subscriptionService.updatePlanPrice(plan.id, 120, testAdminId);
      testPlanIds.push(v2.id);

      const user = await userRepository.create({
        email: `redirect-test-${Date.now()}@example.com`,
        password: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const subscription = await userSubscriptionService.subscribeUserToPlan(user.id, plan.id);
      testSubscriptionIds.push(subscription.id);

      expect(subscription.planId).toBe(v2.id);
      expect(Number(subscription.grandfatheredPrice)).toBe(120);
    });
  });

  describe('getSubscriptionPlans() - Latest Versions Only', () => {
    it('should return only latest versions of active plans', async () => {
      const plan = await subscriptionService.createSubscriptionPlan(
        {
          name: `Latest Only ${Date.now()}`,
          price: 100,
          currency: 'USD',
          isActive: true,
          features: ['Feature 1'] as any,
          maxUniversities: 10,
          maxCountries: 5,
          turnaroundDays: 7,
          tierLevel: 1
        },
        testAdminId
      );
      testPlanIds.push(plan.id);

      const v2 = await subscriptionService.updatePlanPrice(plan.id, 120, testAdminId);
      testPlanIds.push(v2.id);

      const customerPlans = await subscriptionService.getSubscriptionPlans();

      const planFamily = customerPlans.filter(p => 
        p.basePlanId === (plan.basePlanId || plan.id)
      );

      expect(planFamily.length).toBe(1);
      expect(planFamily[0].id).toBe(v2.id);
      expect(planFamily[0].isLatestVersion).toBe(true);
      expect(Number(planFamily[0].price)).toBe(120);
    });
  });

  describe('getAllSubscriptionPlansWithVersions() - Admin View', () => {
    it('should return all versions for admin dashboard', async () => {
      const plan = await subscriptionService.createSubscriptionPlan(
        {
          name: `Admin All Versions ${Date.now()}`,
          price: 100,
          currency: 'USD',
          isActive: true,
          features: ['Feature 1'] as any,
          maxUniversities: 10,
          maxCountries: 5,
          turnaroundDays: 7,
          tierLevel: 1
        },
        testAdminId
      );
      testPlanIds.push(plan.id);

      const v2 = await subscriptionService.updatePlanPrice(plan.id, 120, testAdminId);
      testPlanIds.push(v2.id);

      const v3 = await subscriptionService.updatePlanPrice(v2.id, 150, testAdminId);
      testPlanIds.push(v3.id);

      const allPlans = await subscriptionService.getAllSubscriptionPlansWithVersions();

      const planFamily = allPlans.filter(p => 
        p.basePlanId === (plan.basePlanId || plan.id)
      );

      expect(planFamily.length).toBe(3);
      
      const versions = planFamily.map(p => p.version).sort();
      expect(versions).toEqual([1, 2, 3]);
    });
  });

  describe('Deprecation Workflow', () => {
    it('should successfully deprecate plan with subscribers', async () => {
      const plan = await subscriptionService.createSubscriptionPlan(
        {
          name: `Deprecate Test ${Date.now()}`,
          price: 100,
          currency: 'USD',
          isActive: true,
          features: ['Feature 1'] as any,
          maxUniversities: 10,
          maxCountries: 5,
          turnaroundDays: 7,
          tierLevel: 1
        },
        testAdminId
      );
      testPlanIds.push(plan.id);

      const user = await userRepository.create({
        email: `deprecate-${Date.now()}@example.com`,
        password: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const subscription = await userSubscriptionService.subscribeUserToPlan(user.id, plan.id);
      testSubscriptionIds.push(subscription.id);

      await subscriptionService.deprecatePlan(
        plan.id,
        undefined,
        testAdminId,
        'End of life for this tier'
      );

      const deprecatedPlan = await subscriptionService.getSubscriptionPlan(plan.id);
      expect(deprecatedPlan?.deprecatedAt).toBeDefined();
      expect(deprecatedPlan?.isActive).toBe(false);
    });

    it('should fail to deprecate plan with NO subscribers', async () => {
      const plan = await subscriptionService.createSubscriptionPlan(
        {
          name: `No Subscribers Deprecate ${Date.now()}`,
          price: 100,
          currency: 'USD',
          isActive: true,
          features: ['Feature 1'] as any,
          maxUniversities: 10,
          maxCountries: 5,
          turnaroundDays: 7,
          tierLevel: 1
        },
        testAdminId
      );
      testPlanIds.push(plan.id);

      await expect(
        subscriptionService.deprecatePlan(
          plan.id,
          undefined,
          testAdminId,
          'Trying to deprecate empty plan'
        )
      ).rejects.toThrow();
    });
  });

  describe('Archive Workflow', () => {
    it('should successfully archive plan', async () => {
      const plan = await subscriptionService.createSubscriptionPlan(
        {
          name: `Archive Test ${Date.now()}`,
          price: 100,
          currency: 'USD',
          isActive: true,
          features: ['Feature 1'] as any,
          maxUniversities: 10,
          maxCountries: 5,
          turnaroundDays: 7,
          tierLevel: 1
        },
        testAdminId
      );
      testPlanIds.push(plan.id);

      await subscriptionService.archivePlan(plan.id, testAdminId, 'No longer needed');

      const archivedPlan = await subscriptionService.getSubscriptionPlan(plan.id);
      expect(archivedPlan?.isActive).toBe(false);
    });
  });
});
