import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SubscriptionAuditOutboxService } from '../subscription-audit-outbox.service';
import { db } from '../../../db';
import { subscriptionAuditOutbox, userSubscriptions, subscriptionPlans } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { userRepository } from '../../../repositories/user.repository';

describe('SubscriptionAuditOutboxService', () => {
  let service: SubscriptionAuditOutboxService;
  let testEventIds: string[] = [];
  let testUserIds: string[] = [];
  let testSubscriptionIds: string[] = [];
  let testPlanId: string;

  beforeEach(async () => {
    service = new SubscriptionAuditOutboxService();

    const user = await userRepository.create({
      email: `outbox-test-${Date.now()}-${Math.random()}@test.com`,
      password: 'hashed',
      userType: 'customer',
      firstName: 'Outbox',
      lastName: 'Test'
    });
    testUserIds.push(user.id);

    const plans = await db.query.subscriptionPlans.findMany({
      limit: 1
    });
    
    if (plans.length > 0) {
      testPlanId = plans[0].id;
    }
  });

  afterEach(async () => {
    for (const id of testEventIds) {
      try {
        await db.delete(subscriptionAuditOutbox).where(eq(subscriptionAuditOutbox.id, id));
      } catch (error) {
        console.log('Event cleanup failed:', error);
      }
    }
    testEventIds = [];

    for (const id of testSubscriptionIds) {
      try {
        await db.delete(userSubscriptions).where(eq(userSubscriptions.id, id));
      } catch (error) {
        console.log('Subscription cleanup failed:', error);
      }
    }
    testSubscriptionIds = [];

    for (const userId of testUserIds) {
      try {
        await userRepository.delete(userId);
      } catch (error) {
        console.log('User cleanup failed:', error);
      }
    }
    testUserIds = [];
  });

  describe('enqueueEvent', () => {
    it('should create pending entry in outbox', async () => {
      const userId = testUserIds[0];
      
      await db.transaction(async (tx) => {
        const subscription = await tx.insert(userSubscriptions).values({
          userId,
          planId: testPlanId,
          status: 'active',
          isLifetime: true,
          tierLevel: 1,
          highestTierReached: 1,
          universitiesUsed: 0,
          countriesUsed: 0,
        }).returning();
        
        testSubscriptionIds.push(subscription[0].id);

        await service.enqueueEvent(
          tx,
          subscription[0].id,
          userId,
          'subscription_created',
          undefined,
          'active',
          { planId: testPlanId }
        );
      });

      const events = await db.query.subscriptionAuditOutbox.findMany({
        where: (subscriptionAuditOutbox, { eq }) => eq(subscriptionAuditOutbox.userId, userId)
      });

      expect(events.length).toBeGreaterThan(0);
      const event = events[0];
      testEventIds.push(event.id);

      expect(event.eventType).toBe('subscription_created');
      expect(event.status).toBe('pending');
      expect(event.retries).toBe(0);
      expect(event.oldStatus).toBeNull();
      expect(event.newStatus).toBe('active');
    });

    it('should use transaction context for atomicity', async () => {
      const userId = testUserIds[0];
      let eventId: string | null = null;

      try {
        await db.transaction(async (tx) => {
          const subscription = await tx.insert(userSubscriptions).values({
            userId,
            planId: testPlanId,
            status: 'active',
            isLifetime: true,
            tierLevel: 1,
            highestTierReached: 1,
            universitiesUsed: 0,
            countriesUsed: 0,
          }).returning();
          
          testSubscriptionIds.push(subscription[0].id);

          await service.enqueueEvent(
            tx,
            subscription[0].id,
            userId,
            'test_event',
            undefined,
            'active',
            { test: 'data' }
          );

          const events = await tx.select().from(subscriptionAuditOutbox)
            .where(eq(subscriptionAuditOutbox.userId, userId));
          
          if (events.length > 0) {
            eventId = events[0].id;
          }

          throw new Error('Simulated transaction rollback');
        });
      } catch (error: any) {
        expect(error.message).toBe('Simulated transaction rollback');
      }

      const eventsAfterRollback = await db.query.subscriptionAuditOutbox.findMany({
        where: (subscriptionAuditOutbox, { eq }) => eq(subscriptionAuditOutbox.userId, userId)
      });

      expect(eventsAfterRollback.length).toBe(0);
    });

    it('should handle metadata correctly', async () => {
      const userId = testUserIds[0];
      const metadata = {
        planId: testPlanId,
        amount: 999,
        currency: 'USD',
        orderId: 'order_123',
        nested: {
          key: 'value'
        }
      };

      await db.transaction(async (tx) => {
        const subscription = await tx.insert(userSubscriptions).values({
          userId,
          planId: testPlanId,
          status: 'active',
          isLifetime: true,
          tierLevel: 1,
          highestTierReached: 1,
          universitiesUsed: 0,
          countriesUsed: 0,
        }).returning();
        
        testSubscriptionIds.push(subscription[0].id);

        await service.enqueueEvent(
          tx,
          subscription[0].id,
          userId,
          'subscription_upgraded',
          'free',
          'premium',
          metadata
        );
      });

      const events = await db.query.subscriptionAuditOutbox.findMany({
        where: (subscriptionAuditOutbox, { eq }) => eq(subscriptionAuditOutbox.userId, userId)
      });

      expect(events.length).toBeGreaterThan(0);
      const event = events[0];
      testEventIds.push(event.id);

      expect(event.metadata).toEqual(metadata);
      expect(event.oldStatus).toBe('free');
      expect(event.newStatus).toBe('premium');
    });
  });

  describe('getStatus', () => {
    it('should return correct event status', async () => {
      const userId = testUserIds[0];
      let eventId: string = '';

      await db.transaction(async (tx) => {
        const subscription = await tx.insert(userSubscriptions).values({
          userId,
          planId: testPlanId,
          status: 'active',
          isLifetime: true,
          tierLevel: 1,
          highestTierReached: 1,
          universitiesUsed: 0,
          countriesUsed: 0,
        }).returning();
        
        testSubscriptionIds.push(subscription[0].id);

        await service.enqueueEvent(
          tx,
          subscription[0].id,
          userId,
          'test_event',
          undefined,
          'active',
          undefined
        );

        const events = await tx.select().from(subscriptionAuditOutbox)
          .where(eq(subscriptionAuditOutbox.userId, userId));
        
        eventId = events[0].id;
        testEventIds.push(eventId);
      });

      const status = await service.getStatus(eventId);

      expect(status).toBeDefined();
      expect(status.id).toBe(eventId);
      expect(status.status).toBe('pending');
      expect(status.eventType).toBe('test_event');
    });

    it('should return undefined for non-existent event', async () => {
      const status = await service.getStatus('00000000-0000-0000-0000-000000000000');

      expect(status).toBeUndefined();
    });
  });

  describe('getMetrics', () => {
    it('should return accurate counts of events by status', async () => {
      const userId = testUserIds[0];

      await db.transaction(async (tx) => {
        const subscription = await tx.insert(userSubscriptions).values({
          userId,
          planId: testPlanId,
          status: 'active',
          isLifetime: true,
          tierLevel: 1,
          highestTierReached: 1,
          universitiesUsed: 0,
          countriesUsed: 0,
        }).returning();
        
        testSubscriptionIds.push(subscription[0].id);

        await service.enqueueEvent(tx, subscription[0].id, userId, 'event_1', undefined, 'active', undefined);
        await service.enqueueEvent(tx, subscription[0].id, userId, 'event_2', undefined, 'active', undefined);
        await service.enqueueEvent(tx, subscription[0].id, userId, 'event_3', undefined, 'active', undefined);
      });

      const events = await db.query.subscriptionAuditOutbox.findMany({
        where: (subscriptionAuditOutbox, { eq }) => eq(subscriptionAuditOutbox.userId, userId)
      });
      
      events.forEach(e => testEventIds.push(e.id));

      await db.update(subscriptionAuditOutbox)
        .set({ status: 'processing' })
        .where(eq(subscriptionAuditOutbox.id, events[0].id));

      await db.update(subscriptionAuditOutbox)
        .set({ status: 'failed' })
        .where(eq(subscriptionAuditOutbox.id, events[1].id));

      const metrics = await service.getMetrics();

      expect(metrics.pending).toBeGreaterThanOrEqual(1);
      expect(metrics.processing).toBeGreaterThanOrEqual(1);
      expect(metrics.failed).toBeGreaterThanOrEqual(1);
    });

    it('should return zero counts when no events exist', async () => {
      await db.delete(subscriptionAuditOutbox);

      const metrics = await service.getMetrics();

      expect(metrics.pending).toBe(0);
      expect(metrics.processing).toBe(0);
      expect(metrics.failed).toBe(0);
    });

    it('should count only pending events correctly', async () => {
      const userId = testUserIds[0];

      await db.transaction(async (tx) => {
        const subscription = await tx.insert(userSubscriptions).values({
          userId,
          planId: testPlanId,
          status: 'active',
          isLifetime: true,
          tierLevel: 1,
          highestTierReached: 1,
          universitiesUsed: 0,
          countriesUsed: 0,
        }).returning();
        
        testSubscriptionIds.push(subscription[0].id);

        await service.enqueueEvent(tx, subscription[0].id, userId, 'pending_event_1', undefined, 'active', undefined);
        await service.enqueueEvent(tx, subscription[0].id, userId, 'pending_event_2', undefined, 'active', undefined);
      });

      const events = await db.query.subscriptionAuditOutbox.findMany({
        where: (subscriptionAuditOutbox, { eq }) => eq(subscriptionAuditOutbox.userId, userId)
      });
      
      events.forEach(e => testEventIds.push(e.id));

      const metricsBefore = await service.getMetrics();
      const pendingCountBefore = metricsBefore.pending;

      expect(pendingCountBefore).toBeGreaterThanOrEqual(2);
    });
  });
});
