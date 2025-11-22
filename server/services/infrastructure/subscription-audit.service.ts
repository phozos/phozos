import { db } from '../../db';
import { subscriptionEvents } from '@shared/schema';
import logger from '../../utils/logger';

export interface ISubscriptionAuditService {
  logEvent(
    subscriptionId: string,
    userId: string,
    eventType: string,
    oldStatus?: string,
    newStatus?: string,
    metadata?: Record<string, any>
  ): Promise<void>;
  getSubscriptionHistory(subscriptionId: string): Promise<any[]>;
  getUserSubscriptionEvents(userId: string): Promise<any[]>;
}

export class SubscriptionAuditService implements ISubscriptionAuditService {
  /**
   * Log a subscription lifecycle event
   * @param subscriptionId - UUID of the subscription
   * @param userId - UUID of the user
   * @param eventType - Type of event (subscription_created, subscription_upgraded, etc.)
   * @param oldStatus - Previous status (for status changes)
   * @param newStatus - New status (for status changes)
   * @param metadata - Additional context about the event
   */
  async logEvent(
    subscriptionId: string,
    userId: string,
    eventType: string,
    oldStatus?: string,
    newStatus?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await db.insert(subscriptionEvents).values({
        subscriptionId,
        userId,
        eventType,
        oldStatus: oldStatus || null,
        newStatus: newStatus || null,
        metadata: metadata || null,
      });

      logger.info('Subscription event logged', {
        subscriptionId,
        userId,
        eventType,
        oldStatus,
        newStatus,
        metadata,
      });
    } catch (error) {
      logger.error('Failed to log subscription event', {
        error,
        subscriptionId,
        userId,
        eventType,
      });
      throw error;
    }
  }

  /**
   * Get all events for a specific subscription
   * @param subscriptionId - UUID of the subscription
   * @returns Array of subscription events ordered by creation date
   */
  async getSubscriptionHistory(subscriptionId: string): Promise<any[]> {
    try {
      const events = await db.query.subscriptionEvents.findMany({
        where: (subscriptionEvents, { eq }) => eq(subscriptionEvents.subscriptionId, subscriptionId),
        orderBy: (subscriptionEvents, { desc }) => [desc(subscriptionEvents.createdAt)],
      });

      return events;
    } catch (error) {
      logger.error('Failed to get subscription history', {
        error,
        subscriptionId,
      });
      throw error;
    }
  }

  /**
   * Get all subscription events for a specific user
   * @param userId - UUID of the user
   * @returns Array of all subscription events for the user
   */
  async getUserSubscriptionEvents(userId: string): Promise<any[]> {
    try {
      const events = await db.query.subscriptionEvents.findMany({
        where: (subscriptionEvents, { eq }) => eq(subscriptionEvents.userId, userId),
        orderBy: (subscriptionEvents, { desc }) => [desc(subscriptionEvents.createdAt)],
      });

      return events;
    } catch (error) {
      logger.error('Failed to get user subscription events', {
        error,
        userId,
      });
      throw error;
    }
  }
}

export const subscriptionAuditService = new SubscriptionAuditService();
