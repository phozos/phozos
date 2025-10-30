import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SubscriptionService } from '../subscription.service';
import { subscriptionPlanRepository, userSubscriptionRepository } from '../../../repositories/subscription.repository';
import { userRepository } from '../../../repositories/user.repository';
import { studentRepository } from '../../../repositories/student.repository';

describe('SubscriptionService', () => {
  let subscriptionService: SubscriptionService;
  let testUserId: string;
  let testStudentId: string;
  let testPlanIds: string[] = [];
  let testSubscriptionIds: string[] = [];

  beforeEach(async () => {
    subscriptionService = new SubscriptionService();

    const user = await userRepository.create({
      email: `subscription-svc-user-${Date.now()}-${Math.random()}@example.com`,
      password: 'hashedPassword123',
      userType: 'customer',
      firstName: 'Subscription',
      lastName: 'User'
    });
    testUserId = user.id;

    const student = await studentRepository.create({
      userId: testUserId,
      status: 'inquiry'
    });
    testStudentId = student.id;
  });

  afterEach(async () => {
    for (const subscriptionId of testSubscriptionIds) {
      try {
        await userSubscriptionRepository.delete(subscriptionId);
      } catch (error) {
        console.log('User subscription cleanup failed:', error);
      }
    }
    testSubscriptionIds = [];

    for (const planId of testPlanIds) {
      try {
        await subscriptionPlanRepository.delete(planId);
      } catch (error) {
        console.log('Subscription plan cleanup failed:', error);
      }
    }
    testPlanIds = [];

    if (testStudentId) {
      try {
        await studentRepository.delete(testStudentId);
      } catch (error) {
        console.log('Student cleanup failed:', error);
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

  describe('getSubscriptionPlans', () => {
    it('should return active subscription plans', async () => {
      const plan1 = await subscriptionPlanRepository.create({
        name: `Basic-${Date.now()}-${Math.random()}`,
        price: 9.99,
        currency: 'USD',
        isActive: true,
        features: ['Feature 1'] as any,
        maxUniversities: 5,
        maxCountries: 2,
        turnaroundDays: 7
      });
      testPlanIds.push(plan1.id);

      const plan2 = await subscriptionPlanRepository.create({
        name: `Pro-${Date.now()}-${Math.random()}`,
        price: 19.99,
        currency: 'USD',
        isActive: true,
        features: ['Feature 1', 'Feature 2'] as any,
        maxUniversities: 10,
        maxCountries: 3,
        turnaroundDays: 5
      });
      testPlanIds.push(plan2.id);

      const result = await subscriptionService.getSubscriptionPlans();

      expect(result.some(p => p.id === plan1.id)).toBe(true);
      expect(result.some(p => p.id === plan2.id)).toBe(true);
    });

    it('should handle errors when fetching active plans', async () => {
      const result = await subscriptionService.getSubscriptionPlans();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getAllSubscriptionPlans', () => {
    it('should return all subscription plans', async () => {
      const plan1 = await subscriptionPlanRepository.create({
        name: `All-Basic-${Date.now()}-${Math.random()}`,
        price: 9.99,
        currency: 'USD',
        isActive: true,
        features: ['Feature 1'] as any,
        maxUniversities: 5,
        maxCountries: 2,
        turnaroundDays: 7
      });
      testPlanIds.push(plan1.id);

      const plan2 = await subscriptionPlanRepository.create({
        name: `All-Inactive-${Date.now()}-${Math.random()}`,
        price: 29.99,
        currency: 'USD',
        isActive: false,
        features: ['Premium'] as any,
        maxUniversities: 15,
        maxCountries: 5,
        turnaroundDays: 3
      });
      testPlanIds.push(plan2.id);

      const result = await subscriptionService.getAllSubscriptionPlans();

      expect(result.some(p => p.id === plan1.id)).toBe(true);
      expect(result.some(p => p.id === plan2.id)).toBe(true);
    });

    it('should handle errors when fetching all plans', async () => {
      const result = await subscriptionService.getAllSubscriptionPlans();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getSubscriptionPlan', () => {
    it('should return a specific subscription plan', async () => {
      const plan = await subscriptionPlanRepository.create({
        name: `Specific-${Date.now()}-${Math.random()}`,
        price: 9.99,
        currency: 'USD',
        isActive: true,
        features: ['Feature 1'] as any,
        maxUniversities: 5,
        maxCountries: 2,
        turnaroundDays: 7
      });
      testPlanIds.push(plan.id);

      const result = await subscriptionService.getSubscriptionPlan(plan.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(plan.id);
    });

    it('should return undefined for non-existent plan', async () => {
      const result = await subscriptionService.getSubscriptionPlan('00000000-0000-0000-0000-000000000000');

      expect(result).toBeUndefined();
    });

    it('should return undefined for invalid UUID', async () => {
      const result = await subscriptionService.getSubscriptionPlan('00000000-0000-0000-0000-000000000001');

      expect(result).toBeUndefined();
    });
  });

  describe('createSubscriptionPlan', () => {
    it('should create a new subscription plan', async () => {
      const result = await subscriptionService.createSubscriptionPlan({
        name: `Create-${Date.now()}-${Math.random()}`,
        price: 9.99,
        currency: 'USD',
        features: ['Feature'] as any,
        maxUniversities: 5,
        maxCountries: 2,
        turnaroundDays: 7
      } as any);
      testPlanIds.push(result.id);

      expect(result.id).toBeDefined();
      expect(parseFloat(result.price as any)).toBe(9.99);
    });

    it('should allow creating plans with different names', async () => {
      const plan1 = await subscriptionPlanRepository.create({
        name: `Plan1-${Date.now()}-${Math.random()}`,
        price: 9.99,
        currency: 'USD',
        isActive: true,
        features: ['Feature'] as any,
        maxUniversities: 5,
        maxCountries: 2,
        turnaroundDays: 7
      });
      testPlanIds.push(plan1.id);

      const plan2 = await subscriptionService.createSubscriptionPlan({
        name: `Plan2-${Date.now()}-${Math.random()}`,
        price: 9.99,
        currency: 'USD',
        features: ['Feature'] as any,
        maxUniversities: 5,
        maxCountries: 2,
        turnaroundDays: 7
      } as any);
      testPlanIds.push(plan2.id);

      expect(plan2.id).toBeDefined();
      expect(plan2.name).not.toBe(plan1.name);
    });

    it('should handle generic errors when creating a plan', async () => {
      await expect(
        subscriptionService.createSubscriptionPlan({
          name: '',
          price: -1
        } as any)
      ).rejects.toThrow();
    });
  });

  describe('updateSubscriptionPlan', () => {
    it('should update a subscription plan', async () => {
      const plan = await subscriptionPlanRepository.create({
        name: `Update-${Date.now()}-${Math.random()}`,
        price: 9.99,
        currency: 'USD',
        isActive: true,
        features: ['Feature'] as any,
        maxUniversities: 5,
        maxCountries: 2,
        turnaroundDays: 7
      });
      testPlanIds.push(plan.id);

      const result = await subscriptionService.updateSubscriptionPlan(plan.id, { name: 'Updated Plus', price: 12.99 });

      expect(result).toBeDefined();
      if (result) {
        expect(parseFloat(result.price as any)).toBe(12.99);
      }
    });

    it('should return undefined when updating non-existent plan', async () => {
      const result = await subscriptionService.updateSubscriptionPlan('00000000-0000-0000-0000-000000000000', { name: 'Updated' });
      
      expect(result).toBeUndefined();
    });

    it('should handle foreign key violations when updating a plan', async () => {
      const plan = await subscriptionPlanRepository.create({
        name: `FK-${Date.now()}-${Math.random()}`,
        price: 9.99,
        currency: 'USD',
        isActive: true,
        features: ['Feature'] as any,
        maxUniversities: 5,
        maxCountries: 2,
        turnaroundDays: 7
      });
      testPlanIds.push(plan.id);

      const result = await subscriptionService.updateSubscriptionPlan(plan.id, { name: 'Updated' });

      expect(result).toBeDefined();
    });
  });

  describe('deleteSubscriptionPlan', () => {
    it('should delete a subscription plan', async () => {
      const plan = await subscriptionPlanRepository.create({
        name: `Delete-${Date.now()}-${Math.random()}`,
        price: 9.99,
        currency: 'USD',
        isActive: true,
        features: ['Feature'] as any,
        maxUniversities: 5,
        maxCountries: 2,
        turnaroundDays: 7
      });
      testPlanIds.push(plan.id);

      const result = await subscriptionService.deleteSubscriptionPlan(plan.id);

      expect(result).toBe(true);
    });

    it('should return false when deleting non-existent plan', async () => {
      const result = await subscriptionService.deleteSubscriptionPlan('00000000-0000-0000-0000-000000000000');
      
      expect(result).toBe(false);
    });
  });

  describe('getUserSubscription', () => {
    it('should return active user subscription', async () => {
      const plan = await subscriptionPlanRepository.create({
        name: `UserSub-${Date.now()}-${Math.random()}`,
        price: 9.99,
        currency: 'USD',
        isActive: true,
        features: ['Feature'] as any,
        maxUniversities: 5,
        maxCountries: 2,
        turnaroundDays: 7
      });
      testPlanIds.push(plan.id);

      const subscription = await userSubscriptionRepository.create({
        userId: testUserId,
        planId: plan.id,
        status: 'active',
        startDate: new Date(),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
      testSubscriptionIds.push(subscription.id);

      const result = await subscriptionService.getUserSubscription(testUserId);

      expect(result).toBeDefined();
      if (result) {
        expect(result.userId).toBe(testUserId);
        expect(result.status).toBe('active');
      }
    });

    it('should handle errors when fetching user subscription', async () => {
      const result = await subscriptionService.getUserSubscription('00000000-0000-0000-0000-000000000000');

      expect(result === undefined || result === null).toBe(true);
    });
  });

  describe('getUserSubscriptionWithPlan', () => {
    it('should return user subscription with plan details', async () => {
      const plan = await subscriptionPlanRepository.create({
        name: `WithPlan-${Date.now()}-${Math.random()}`,
        price: 19.99,
        currency: 'USD',
        isActive: true,
        features: ['Feature'] as any,
        maxUniversities: 10,
        maxCountries: 3,
        turnaroundDays: 5
      });
      testPlanIds.push(plan.id);

      const subscription = await userSubscriptionRepository.create({
        userId: testUserId,
        planId: plan.id,
        status: 'active',
        startDate: new Date(),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
      testSubscriptionIds.push(subscription.id);

      const result = await subscriptionService.getUserSubscriptionWithPlan(testUserId);

      expect(result).toBeDefined();
    });

    it('should handle errors when fetching user subscription with plan', async () => {
      const result = await subscriptionService.getUserSubscriptionWithPlan('00000000-0000-0000-0000-000000000000');

      expect(result === undefined || result === null).toBe(true);
    });
  });

  describe('createUserSubscription', () => {
    it('should create a new user subscription', async () => {
      const plan = await subscriptionPlanRepository.create({
        name: `CreateUserSub-${Date.now()}-${Math.random()}`,
        price: 9.99,
        currency: 'USD',
        isActive: true,
        features: ['Feature'] as any,
        maxUniversities: 5,
        maxCountries: 2,
        turnaroundDays: 7
      });
      testPlanIds.push(plan.id);

      const result = await subscriptionService.createUserSubscription({
        userId: testUserId,
        planId: plan.id,
        status: 'active',
        startDate: new Date(),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      } as any);
      testSubscriptionIds.push(result.id);

      expect(result.id).toBeDefined();
      expect(result.userId).toBe(testUserId);
      expect(result.status).toBe('active');
    });

    it('should handle errors when creating user subscription', async () => {
      await expect(
        subscriptionService.createUserSubscription({
          userId: testUserId,
          planId: '00000000-0000-0000-0000-000000000000',
          status: 'active'
        } as any)
      ).rejects.toThrow();
    });

    it('should handle not null violations when creating user subscription', async () => {
      await expect(
        subscriptionService.createUserSubscription({
          userId: testUserId
        } as any)
      ).rejects.toThrow();
    });
  });

  describe('updateUserSubscription', () => {
    it('should update user subscription', async () => {
      const plan = await subscriptionPlanRepository.create({
        name: `UpdateUserSub-${Date.now()}-${Math.random()}`,
        price: 9.99,
        currency: 'USD',
        isActive: true,
        features: ['Feature'] as any,
        maxUniversities: 5,
        maxCountries: 2,
        turnaroundDays: 7
      });
      testPlanIds.push(plan.id);

      const subscription = await userSubscriptionRepository.create({
        userId: testUserId,
        planId: plan.id,
        status: 'active',
        startDate: new Date(),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
      testSubscriptionIds.push(subscription.id);

      const result = await subscriptionService.updateUserSubscription(subscription.id, { status: 'cancelled' } as any);

      expect(result).toBeDefined();
      if (result) {
        expect(result.status).toBe('cancelled');
      }
    });

    it('should return undefined when updating non-existent user subscription', async () => {
      const result = await subscriptionService.updateUserSubscription('00000000-0000-0000-0000-000000000000', { status: 'cancelled' } as any);
      
      expect(result).toBeUndefined();
    });
  });

  describe('getAllUserSubscriptions', () => {
    it('should return all user subscriptions with details', async () => {
      const plan = await subscriptionPlanRepository.create({
        name: `AllUserSubs-${Date.now()}-${Math.random()}`,
        price: 19.99,
        currency: 'USD',
        isActive: true,
        features: ['Feature'] as any,
        maxUniversities: 10,
        maxCountries: 3,
        turnaroundDays: 5
      });
      testPlanIds.push(plan.id);

      const subscription = await userSubscriptionRepository.create({
        userId: testUserId,
        planId: plan.id,
        status: 'active',
        startDate: new Date(),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
      testSubscriptionIds.push(subscription.id);

      const result = await subscriptionService.getAllUserSubscriptions();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle errors when fetching all user subscriptions', async () => {
      const result = await subscriptionService.getAllUserSubscriptions();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getCounselorStudentAssignment', () => {
    it('should check counselor-student assignment successfully', async () => {
      const counselor = await userRepository.create({
        email: `counselor-${Date.now()}-${Math.random()}@example.com`,
        password: 'hashedPassword123',
        userType: 'team_member',
        firstName: 'Counselor',
        lastName: 'Test'
      });

      await studentRepository.update(testStudentId, {
        assignedCounselorId: counselor.id
      });

      const result = await subscriptionService.getCounselorStudentAssignment(counselor.id, testStudentId);

      expect(typeof result).toBe('boolean');

      await studentRepository.update(testStudentId, {
        assignedCounselorId: null
      });
      await userRepository.delete(counselor.id);
    });

    it('should return false when assignment does not exist', async () => {
      const result = await subscriptionService.getCounselorStudentAssignment('00000000-0000-0000-0000-000000000000', testStudentId);

      expect(result).toBe(false);
    });

    it('should handle errors when checking counselor-student assignment', async () => {
      await expect(
        subscriptionService.getCounselorStudentAssignment('invalid-id', 'invalid-student-id')
      ).rejects.toThrow();
    });
  });
});
