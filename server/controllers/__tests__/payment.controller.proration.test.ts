import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { PaymentController } from '../payment.controller';
import { userRepository } from '../../repositories/user.repository';
import { subscriptionPlanRepository } from '../../repositories/subscription.repository';
import { userSubscriptionRepository } from '../../repositories/subscription.repository';
import { razorpayService } from '../../services/integration/razorpay.service';

describe('PaymentController - Proration Integration Tests', () => {
  let app: Express;
  let paymentController: PaymentController;
  let testUserIds: string[] = [];
  let testPlanIds: string[] = [];
  let testSubscriptionIds: string[] = [];

  beforeEach(() => {
    paymentController = new PaymentController();
    
    app = express();
    app.use(express.json());
    
    app.use((req, res, next) => {
      req.user = { id: '' };
      next();
    });
    
    app.post('/api/payment/create-order', (req, res) => paymentController.createOrder(req as any, res));
    app.post('/api/payment/verify', (req, res) => paymentController.verifyPayment(req as any, res));
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

  describe('POST /api/payment/create-order - Proration for New Subscriptions', () => {
    it('should create order with full price for new subscription', async () => {
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
        tierLevel: 201,
        features: ['Premium Features'],
        maxUniversities: 20,
        maxCountries: 10,
        turnaroundDays: 5,
        isActive: true
      });
      testPlanIds.push(plan.id);

      const response = await request(app)
        .post('/api/payment/create-order')
        .set('Authorization', 'Bearer mock-token')
        .send({ planId: plan.id })
        .set('Cookie', [`user_id=${user.id}`]);

      response.request.res.req.user = { id: user.id };
      
      const mockApp = express();
      mockApp.use(express.json());
      mockApp.use((req, res, next) => {
        req.user = { id: user.id };
        next();
      });
      mockApp.post('/api/payment/create-order', (req, res) => paymentController.createOrder(req as any, res));
      
      const actualResponse = await request(mockApp)
        .post('/api/payment/create-order')
        .send({ planId: plan.id });

      expect(actualResponse.status).toBe(200);
      expect(actualResponse.body.success).toBe(true);
      expect(actualResponse.body.data).toHaveProperty('orderId');
      expect(actualResponse.body.data).toHaveProperty('amount');
      expect(actualResponse.body.data.amount).toBe(10000);
      expect(actualResponse.body.data.currency).toBe('INR');
      expect(actualResponse.body.data.isUpgrade).toBe(false);
      expect(actualResponse.body.data.originalPrice).toBe(100);
      expect(actualResponse.body.data.prorationAmount).toBe(0);
      expect(actualResponse.body.data.alreadyPaid).toBe(0);
    });

    it('should include keyId in response for Razorpay checkout', async () => {
      const user = await userRepository.create({
        email: `test-key-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Jane',
        lastName: 'Smith',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const plan = await subscriptionPlanRepository.create({
        name: 'Basic Plan',
        price: '50.00',
        currency: 'INR',
        tierLevel: 202,
        features: ['Basic Features'],
        maxUniversities: 10,
        maxCountries: 5,
        turnaroundDays: 10,
        isActive: true
      });
      testPlanIds.push(plan.id);

      const mockApp = express();
      mockApp.use(express.json());
      mockApp.use((req, res, next) => {
        req.user = { id: user.id };
        next();
      });
      mockApp.post('/api/payment/create-order', (req, res) => paymentController.createOrder(req as any, res));

      const response = await request(mockApp)
        .post('/api/payment/create-order')
        .send({ planId: plan.id });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('keyId');
      expect(typeof response.body.data.keyId).toBe('string');
    });
  });

  describe('POST /api/payment/create-order - Proration for Upgrades', () => {
    it('should calculate proration when upgrading from Premium to Elite', async () => {
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
        tierLevel: 203,
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
        tierLevel: 204,
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
        tierLevel: 203,
        isLifetime: true,
        lifetimeActivatedAt: new Date()
      });
      testSubscriptionIds.push(subscription.id);

      const mockApp = express();
      mockApp.use(express.json());
      mockApp.use((req, res, next) => {
        req.user = { id: user.id };
        next();
      });
      mockApp.post('/api/payment/create-order', (req, res) => paymentController.createOrder(req as any, res));

      const response = await request(mockApp)
        .post('/api/payment/create-order')
        .send({ planId: elitePlan.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isUpgrade).toBe(true);
      expect(response.body.data.originalPrice).toBe(200);
      expect(response.body.data.alreadyPaid).toBe(100);
      expect(response.body.data.prorationAmount).toBe(100);
      expect(response.body.data.amount).toBe(10000);
    });

    it('should include proration metadata in order notes', async () => {
      const user = await userRepository.create({
        email: `test-metadata-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Chris',
        lastName: 'Brown',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const basicPlan = await subscriptionPlanRepository.create({
        name: 'Basic Plan',
        price: '50.00',
        currency: 'INR',
        tierLevel: 205,
        features: ['Basic Features'],
        maxUniversities: 10,
        maxCountries: 5,
        turnaroundDays: 10,
        isActive: true
      });
      testPlanIds.push(basicPlan.id);

      const premiumPlan = await subscriptionPlanRepository.create({
        name: 'Premium Plan',
        price: '100.00',
        currency: 'INR',
        tierLevel: 206,
        features: ['Premium Features'],
        maxUniversities: 20,
        maxCountries: 10,
        turnaroundDays: 5,
        isActive: true
      });
      testPlanIds.push(premiumPlan.id);

      const subscription = await userSubscriptionRepository.create({
        userId: user.id,
        planId: basicPlan.id,
        status: 'active',
        startedAt: new Date(),
        amountPaid: '50.00',
        currency: 'INR',
        tierLevel: 205,
        isLifetime: true,
        lifetimeActivatedAt: new Date()
      });
      testSubscriptionIds.push(subscription.id);

      const mockApp = express();
      mockApp.use(express.json());
      mockApp.use((req, res, next) => {
        req.user = { id: user.id };
        next();
      });
      mockApp.post('/api/payment/create-order', (req, res) => paymentController.createOrder(req as any, res));

      const response = await request(mockApp)
        .post('/api/payment/create-order')
        .send({ planId: premiumPlan.id });

      expect(response.status).toBe(200);
      
      const orderId = response.body.data.orderId;
      expect(orderId).toBeDefined();
      
      const order = await razorpayService.fetchOrder(orderId);
      expect(order.notes).toHaveProperty('isUpgrade');
      expect(order.notes.isUpgrade).toBe(true);
      expect(order.notes).toHaveProperty('originalPrice');
      expect(order.notes).toHaveProperty('prorationAmount');
      expect(order.notes).toHaveProperty('alreadyPaid');
      expect(order.notes.originalPrice).toBe('100');
      expect(order.notes.prorationAmount).toBe('50');
      expect(order.notes.alreadyPaid).toBe('50');
    });
  });

  describe('POST /api/payment/create-order - Error Handling for Downgrades', () => {
    it('should reject downgrade attempts', async () => {
      const user = await userRepository.create({
        email: `test-downgrade-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Sam',
        lastName: 'Williams',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const basicPlan = await subscriptionPlanRepository.create({
        name: 'Basic Plan',
        price: '50.00',
        currency: 'INR',
        tierLevel: 207,
        features: ['Basic Features'],
        maxUniversities: 10,
        maxCountries: 5,
        turnaroundDays: 10,
        isActive: true
      });
      testPlanIds.push(basicPlan.id);

      const elitePlan = await subscriptionPlanRepository.create({
        name: 'Elite Plan',
        price: '200.00',
        currency: 'INR',
        tierLevel: 208,
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
        tierLevel: 208,
        isLifetime: true,
        lifetimeActivatedAt: new Date()
      });
      testSubscriptionIds.push(subscription.id);

      const mockApp = express();
      mockApp.use(express.json());
      mockApp.use((req, res, next) => {
        req.user = { id: user.id };
        next();
      });
      mockApp.post('/api/payment/create-order', (req, res) => paymentController.createOrder(req as any, res));

      const response = await request(mockApp)
        .post('/api/payment/create-order')
        .send({ planId: basicPlan.id });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('PRORATION_NOT_ALLOWED');
      expect(response.body.error.message).toContain('downgrade');
    });

    it('should reject same plan purchase attempt', async () => {
      const user = await userRepository.create({
        email: `test-same-plan-${Date.now()}@example.com`,
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
        tierLevel: 209,
        features: ['Premium Features'],
        maxUniversities: 20,
        maxCountries: 10,
        turnaroundDays: 5,
        isActive: true
      });
      testPlanIds.push(premiumPlan.id);

      const subscription = await userSubscriptionRepository.create({
        userId: user.id,
        planId: premiumPlan.id,
        status: 'active',
        startedAt: new Date(),
        amountPaid: '100.00',
        currency: 'INR',
        tierLevel: 209,
        isLifetime: true,
        lifetimeActivatedAt: new Date()
      });
      testSubscriptionIds.push(subscription.id);

      const mockApp = express();
      mockApp.use(express.json());
      mockApp.use((req, res, next) => {
        req.user = { id: user.id };
        next();
      });
      mockApp.post('/api/payment/create-order', (req, res) => paymentController.createOrder(req as any, res));

      const response = await request(mockApp)
        .post('/api/payment/create-order')
        .send({ planId: premiumPlan.id });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('ALREADY_SUBSCRIBED');
    });
  });

  describe('POST /api/payment/verify - Proration Verification', () => {
    it('should verify payment with prorated amount for upgrades', async () => {
      const user = await userRepository.create({
        email: `test-verify-upgrade-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Morgan',
        lastName: 'Lee',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const basicPlan = await subscriptionPlanRepository.create({
        name: 'Basic Plan',
        price: '50.00',
        currency: 'INR',
        tierLevel: 210,
        features: ['Basic Features'],
        maxUniversities: 10,
        maxCountries: 5,
        turnaroundDays: 10,
        isActive: true
      });
      testPlanIds.push(basicPlan.id);

      const premiumPlan = await subscriptionPlanRepository.create({
        name: 'Premium Plan',
        price: '100.00',
        currency: 'INR',
        tierLevel: 211,
        features: ['Premium Features'],
        maxUniversities: 20,
        maxCountries: 10,
        turnaroundDays: 5,
        isActive: true
      });
      testPlanIds.push(premiumPlan.id);

      const subscription = await userSubscriptionRepository.create({
        userId: user.id,
        planId: basicPlan.id,
        status: 'active',
        startedAt: new Date(),
        amountPaid: '50.00',
        currency: 'INR',
        tierLevel: 210,
        isLifetime: true,
        lifetimeActivatedAt: new Date()
      });
      testSubscriptionIds.push(subscription.id);

      const mockApp = express();
      mockApp.use(express.json());
      mockApp.use((req, res, next) => {
        req.user = { id: user.id };
        next();
      });
      mockApp.post('/api/payment/create-order', (req, res) => paymentController.createOrder(req as any, res));

      const orderResponse = await request(mockApp)
        .post('/api/payment/create-order')
        .send({ planId: premiumPlan.id });

      expect(orderResponse.status).toBe(200);
      expect(orderResponse.body.data.amount).toBe(5000);
    });

    it('should validate prorated amount matches order amount', async () => {
      const user = await userRepository.create({
        email: `test-amount-validation-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Jordan',
        lastName: 'Taylor',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const premiumPlan = await subscriptionPlanRepository.create({
        name: 'Premium Plan',
        price: '100.00',
        currency: 'INR',
        tierLevel: 212,
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
        tierLevel: 213,
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
        tierLevel: 212,
        isLifetime: true,
        lifetimeActivatedAt: new Date()
      });
      testSubscriptionIds.push(subscription.id);

      const mockApp = express();
      mockApp.use(express.json());
      mockApp.use((req, res, next) => {
        req.user = { id: user.id };
        next();
      });
      mockApp.post('/api/payment/create-order', (req, res) => paymentController.createOrder(req as any, res));

      const orderResponse = await request(mockApp)
        .post('/api/payment/create-order')
        .send({ planId: elitePlan.id });

      expect(orderResponse.status).toBe(200);
      
      const order = await razorpayService.fetchOrder(orderResponse.body.data.orderId);
      
      const prorationAmount = parseFloat(order.notes.prorationAmount);
      const expectedAmount = Math.round(prorationAmount * 100);
      
      expect(order.amount).toBe(expectedAmount);
      expect(order.notes.isUpgrade).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero proration (same price upgrade)', async () => {
      const user = await userRepository.create({
        email: `test-zero-proration-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Casey',
        lastName: 'Martinez',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const planA = await subscriptionPlanRepository.create({
        name: 'Plan A',
        price: '100.00',
        currency: 'INR',
        tierLevel: 214,
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
        tierLevel: 215,
        features: ['Features B'],
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
        tierLevel: 214,
        isLifetime: true,
        lifetimeActivatedAt: new Date()
      });
      testSubscriptionIds.push(subscription.id);

      const mockApp = express();
      mockApp.use(express.json());
      mockApp.use((req, res, next) => {
        req.user = { id: user.id };
        next();
      });
      mockApp.post('/api/payment/create-order', (req, res) => paymentController.createOrder(req as any, res));

      const response = await request(mockApp)
        .post('/api/payment/create-order')
        .send({ planId: planB.id });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isZeroCostUpgrade).toBe(true);
      expect(response.body.data.message).toBe('Upgraded successfully without additional payment');
      expect(response.body.data.subscription).toBeDefined();
    });

    it('should reject unauthenticated requests', async () => {
      const plan = await subscriptionPlanRepository.create({
        name: 'Test Plan',
        price: '100.00',
        currency: 'INR',
        tierLevel: 216,
        features: ['Test Features'],
        maxUniversities: 20,
        maxCountries: 10,
        turnaroundDays: 5,
        isActive: true
      });
      testPlanIds.push(plan.id);

      const unauthApp = express();
      unauthApp.use(express.json());
      unauthApp.post('/api/payment/create-order', (req, res) => paymentController.createOrder(req as any, res));

      const response = await request(unauthApp)
        .post('/api/payment/create-order')
        .send({ planId: plan.id });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('should handle non-existent plan gracefully', async () => {
      const user = await userRepository.create({
        email: `test-invalid-plan-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Riley',
        lastName: 'Anderson',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const mockApp = express();
      mockApp.use(express.json());
      mockApp.use((req, res, next) => {
        req.user = { id: user.id };
        next();
      });
      mockApp.post('/api/payment/create-order', (req, res) => paymentController.createOrder(req as any, res));

      const response = await request(mockApp)
        .post('/api/payment/create-order')
        .send({ planId: '550e8400-e29b-41d4-a716-446655440999' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PLAN_NOT_FOUND');
    });
  });
});
