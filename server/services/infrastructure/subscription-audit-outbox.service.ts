import { BaseService } from '../base.service';
import { db } from '../../db';
import { subscriptionAuditOutbox } from '@shared/schema';
import logger from '../../utils/logger';
import { eq, and } from 'drizzle-orm';

export interface ISubscriptionAuditOutboxService {
  enqueueEvent(
    tx: any,
    subscriptionId: string,
    userId: string,
    eventType: string,
    oldStatus?: string,
    newStatus?: string,
    metadata?: Record<string, any>
  ): Promise<void>;
  getStatus(eventId: string): Promise<any>;
  getMetrics(): Promise<{ pending: number; processing: number; failed: number }>;
}

export class SubscriptionAuditOutboxService extends BaseService implements ISubscriptionAuditOutboxService {
  /**
   * Enqueue a subscription event to the outbox within a transaction
   * @param tx - Drizzle transaction object
   * @param subscriptionId - UUID of the subscription
   * @param userId - UUID of the user
   * @param eventType - Type of event (subscription_created, subscription_upgraded, etc.)
   * @param oldStatus - Previous status (for status changes)
   * @param newStatus - New status (for status changes)
   * @param metadata - Additional context about the event
   */
  async enqueueEvent(
    tx: any,
    subscriptionId: string,
    userId: string,
    eventType: string,
    oldStatus?: string,
    newStatus?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await tx.insert(subscriptionAuditOutbox).values({
        subscriptionId,
        userId,
        eventType,
        oldStatus: oldStatus || null,
        newStatus: newStatus || null,
        metadata: metadata || null,
        status: 'pending',
        retries: 0,
      });

      logger.info('Subscription event enqueued to outbox', {
        subscriptionId,
        userId,
        eventType,
        oldStatus,
        newStatus,
        metadata,
      });
    } catch (error) {
      logger.error('Failed to enqueue subscription event to outbox', {
        error,
        subscriptionId,
        userId,
        eventType,
      });
      throw error;
    }
  }

  /**
   * Get the status of an outbox event by ID
   * @param eventId - UUID of the outbox event
   * @returns The outbox event record
   */
  async getStatus(eventId: string): Promise<any> {
    try {
      const event = await db.query.subscriptionAuditOutbox.findFirst({
        where: (subscriptionAuditOutbox, { eq }) => eq(subscriptionAuditOutbox.id, eventId),
      });

      return event;
    } catch (error) {
      logger.error('Failed to get outbox event status', {
        error,
        eventId,
      });
      return this.handleError(error, 'SubscriptionAuditOutboxService.getStatus');
    }
  }

  /**
   * Get metrics for outbox events
   * @returns Counts of pending, processing, and failed events
   */
  async getMetrics(): Promise<{ pending: number; processing: number; failed: number }> {
    try {
      const events = await db.query.subscriptionAuditOutbox.findMany();

      const metrics = {
        pending: events.filter(e => e.status === 'pending').length,
        processing: events.filter(e => e.status === 'processing').length,
        failed: events.filter(e => e.status === 'failed').length,
      };

      return metrics;
    } catch (error) {
      logger.error('Failed to get outbox metrics', { error });
      return this.handleError(error, 'SubscriptionAuditOutboxService.getMetrics');
    }
  }
}

export const subscriptionAuditOutboxService = new SubscriptionAuditOutboxService();
