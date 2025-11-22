import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SubscriptionAuditOutboxProcessor } from '../subscription-audit-outbox-processor';
import { db } from '../../../db';
import { subscriptionAuditOutbox, subscriptionEvents, userSubscriptions, subscriptionPlans } from '../../../../shared/schema';
import { eq } from 'drizzle-orm';
import { userRepository } from '../../../repositories/user.repository';
import outboxConfig from '../../../config/outbox-processor.config';

describe('SubscriptionAuditOutboxProcessor', () => {
  let processor: SubscriptionAuditOutboxProcessor;
  let testEventIds: string[] = [];
  let testUserIds: string[] = [];
  let testSubscriptionIds: string[] = [];
  let testPlanIds: string[] = [];
  let testPlanId: string;

  beforeEach(async () => {
    processor = new SubscriptionAuditOutboxProcessor();

    const user = await userRepository.create({
      email: `processor-test-${Date.now()}-${Math.random()}@test.com`,
      password: 'hashed',
      userType: 'customer',
      firstName: 'Processor',
      lastName: 'Test'
    });
    testUserIds.push(user.id);

    const plan = await db.insert(subscriptionPlans).values({
      name: 'Test Premium Plan',
      description: 'Test plan for outbox processor tests',
      price: '999.00',
      currency: 'INR',
      tierLevel: Date.now() % 1000000,
      features: ['feature1', 'feature2'],
      maxUniversities: 10,
      maxCountries: 5,
      universityTier: 'general',
      supportType: 'email',
      turnaroundDays: 7,
      isActive: true,
    }).returning();
    testPlanId = plan[0].id;
    testPlanIds.push(testPlanId);

    const subscription = await db.insert(userSubscriptions).values({
      userId: user.id,
      planId: testPlanId,
      status: 'active',
    }).returning();
    testSubscriptionIds.push(subscription[0].id);
  });

  afterEach(async () => {
    processor.stop();

    for (const id of testEventIds) {
      try {
        await db.delete(subscriptionAuditOutbox).where(eq(subscriptionAuditOutbox.id, id));
      } catch (error) {
        console.log('Event cleanup failed:', error);
      }
    }
    testEventIds = [];

    await db.delete(subscriptionEvents).where(eq(subscriptionEvents.userId, testUserIds[0]));

    for (const id of testSubscriptionIds) {
      try {
        await db.delete(userSubscriptions).where(eq(userSubscriptions.id, id));
      } catch (error) {
        console.log('Subscription cleanup failed:', error);
      }
    }
    testSubscriptionIds = [];

    for (const planId of testPlanIds) {
      try {
        await db.delete(subscriptionPlans).where(eq(subscriptionPlans.id, planId));
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

  describe('start() and stop()', () => {
    it('should start the processor successfully', () => {
      processor.start();
      const status = processor.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('should stop the processor successfully', () => {
      processor.start();
      processor.stop();
      const status = processor.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('should not start if already running', () => {
      processor.start();
      const consoleWarnSpy = vi.spyOn(console, 'log');
      processor.start();
      processor.stop();
    });

    it('should respect enable/disable flag', () => {
      const originalValue = outboxConfig.enableProcessor;
      outboxConfig.enableProcessor = false;

      processor.start();
      const status = processor.getStatus();
      expect(status.isRunning).toBe(false);

      outboxConfig.enableProcessor = originalValue;
    });
  });

  describe('processEvents()', () => {
    it('should process pending events successfully', async () => {
      const event = await db.insert(subscriptionAuditOutbox).values({
        subscriptionId: testSubscriptionIds[0],
        userId: testUserIds[0],
        eventType: 'subscription_created',
        oldStatus: null,
        newStatus: 'active',
        metadata: { planId: testPlanId },
        status: 'pending',
        retries: 0,
      }).returning();
      testEventIds.push(event[0].id);

      await processor.triggerProcessingNow();

      await new Promise(resolve => setTimeout(resolve, 500));

      const updatedEvent = await db.query.subscriptionAuditOutbox.findFirst({
        where: eq(subscriptionAuditOutbox.id, event[0].id),
      });
      expect(updatedEvent?.status).toBe('completed');
      expect(updatedEvent?.processedAt).toBeTruthy();

      const createdEvent = await db.query.subscriptionEvents.findFirst({
        where: (subscriptionEvents, { eq, and }) => and(
          eq(subscriptionEvents.subscriptionId, testSubscriptionIds[0]),
          eq(subscriptionEvents.eventType, 'subscription_created')
        ),
      });
      expect(createdEvent).toBeTruthy();
      expect(createdEvent?.userId).toBe(testUserIds[0]);
      expect(createdEvent?.newStatus).toBe('active');
    });

    it('should handle batch processing correctly', async () => {
      for (let i = 0; i < 5; i++) {
        const event = await db.insert(subscriptionAuditOutbox).values({
          subscriptionId: testSubscriptionIds[0],
          userId: testUserIds[0],
          eventType: `test_event_${i}`,
          oldStatus: null,
          newStatus: 'active',
          metadata: { index: i },
          status: 'pending',
          retries: 0,
        }).returning();
        testEventIds.push(event[0].id);
      }

      await processor.triggerProcessingNow();

      await new Promise(resolve => setTimeout(resolve, 1000));

      const completedEvents = await db.query.subscriptionAuditOutbox.findMany({
        where: (subscriptionAuditOutbox, { eq }) => eq(subscriptionAuditOutbox.status, 'completed'),
      });
      expect(completedEvents.length).toBeGreaterThanOrEqual(5);
    });

    it('should handle no pending events gracefully', async () => {
      await processor.triggerProcessingNow();

      const status = processor.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });

  describe('retry logic with exponential backoff', () => {
    it('should retry failed events with exponential backoff', async () => {
      const invalidSubscriptionId = '00000000-0000-0000-0000-000000000000';
      
      const event = await db.insert(subscriptionAuditOutbox).values({
        subscriptionId: invalidSubscriptionId,
        userId: testUserIds[0],
        eventType: 'test_retry',
        oldStatus: null,
        newStatus: 'active',
        metadata: {},
        status: 'pending',
        retries: 0,
      }).returning();
      testEventIds.push(event[0].id);

      await processor.triggerProcessingNow();

      await new Promise(resolve => setTimeout(resolve, 500));

      const updatedEvent = await db.query.subscriptionAuditOutbox.findFirst({
        where: eq(subscriptionAuditOutbox.id, event[0].id),
      });
      
      expect(updatedEvent?.status).toBe('pending');
      expect(updatedEvent?.retries).toBe(1);
      expect(updatedEvent?.errorMessage).toBeTruthy();
      expect(updatedEvent?.nextRetryAt).toBeTruthy();
    });

    it('should move to DLQ after max retries', async () => {
      const invalidSubscriptionId = '00000000-0000-0000-0000-000000000000';
      
      const event = await db.insert(subscriptionAuditOutbox).values({
        subscriptionId: invalidSubscriptionId,
        userId: testUserIds[0],
        eventType: 'test_dlq',
        oldStatus: null,
        newStatus: 'active',
        metadata: {},
        status: 'pending',
        retries: outboxConfig.maxRetries,
      }).returning();
      testEventIds.push(event[0].id);

      await processor.triggerProcessingNow();

      await new Promise(resolve => setTimeout(resolve, 500));

      const updatedEvent = await db.query.subscriptionAuditOutbox.findFirst({
        where: eq(subscriptionAuditOutbox.id, event[0].id),
      });
      
      expect(updatedEvent?.status).toBe('failed');
      expect(updatedEvent?.retries).toBe(outboxConfig.maxRetries + 1);
      expect(updatedEvent?.processedAt).toBeTruthy();
      expect(updatedEvent?.nextRetryAt).toBeNull();
    });

    it('should apply correct exponential backoff delays', async () => {
      const invalidSubscriptionId = '00000000-0000-0000-0000-000000000000';
      
      const event = await db.insert(subscriptionAuditOutbox).values({
        subscriptionId: invalidSubscriptionId,
        userId: testUserIds[0],
        eventType: 'test_backoff',
        oldStatus: null,
        newStatus: 'active',
        metadata: {},
        status: 'pending',
        retries: 2,
      }).returning();
      testEventIds.push(event[0].id);

      const beforeTime = Date.now();
      await processor.triggerProcessingNow();
      await new Promise(resolve => setTimeout(resolve, 500));

      const updatedEvent = await db.query.subscriptionAuditOutbox.findFirst({
        where: eq(subscriptionAuditOutbox.id, event[0].id),
      });
      
      const expectedDelay = outboxConfig.retryDelays[2];
      const nextRetryTime = new Date(updatedEvent!.nextRetryAt!).getTime();
      const actualDelay = nextRetryTime - beforeTime;
      
      expect(actualDelay).toBeGreaterThanOrEqual(expectedDelay - 100);
      expect(actualDelay).toBeLessThanOrEqual(expectedDelay + 1000);
    });
  });

  describe('event processing workflow', () => {
    it('should complete full workflow: pending -> processing -> completed', async () => {
      const event = await db.insert(subscriptionAuditOutbox).values({
        subscriptionId: testSubscriptionIds[0],
        userId: testUserIds[0],
        eventType: 'subscription_upgraded',
        oldStatus: 'free',
        newStatus: 'premium',
        metadata: { upgradeReason: 'user_requested' },
        status: 'pending',
        retries: 0,
      }).returning();
      testEventIds.push(event[0].id);

      await processor.triggerProcessingNow();

      await new Promise(resolve => setTimeout(resolve, 500));

      const finalEvent = await db.query.subscriptionAuditOutbox.findFirst({
        where: eq(subscriptionAuditOutbox.id, event[0].id),
      });

      expect(finalEvent?.status).toBe('completed');
      expect(finalEvent?.processedAt).toBeTruthy();
      expect(finalEvent?.errorMessage).toBeNull();

      const auditEvent = await db.query.subscriptionEvents.findFirst({
        where: (subscriptionEvents, { eq, and }) => and(
          eq(subscriptionEvents.subscriptionId, testSubscriptionIds[0]),
          eq(subscriptionEvents.eventType, 'subscription_upgraded')
        ),
      });

      expect(auditEvent).toBeTruthy();
      expect(auditEvent?.oldStatus).toBe('free');
      expect(auditEvent?.newStatus).toBe('premium');
      expect(auditEvent?.metadata).toEqual({ upgradeReason: 'user_requested' });
    });
  });
});
