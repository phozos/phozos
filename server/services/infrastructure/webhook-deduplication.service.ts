import { db } from '../../db';
import { webhookEvents } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

export interface IWebhookDeduplicationService {
  isEventProcessed(eventId: string): Promise<boolean>;
  recordEvent(eventId: string, eventType: string, payload: any): Promise<void>;
  markSuccess(eventId: string): Promise<void>;
  markFailed(eventId: string, error: string): Promise<void>;
}

export class WebhookDeduplicationService implements IWebhookDeduplicationService {
  /**
   * Check if a webhook event has already been processed
   * @param eventId - Unique event ID from Razorpay
   * @returns true if event already exists (processed or processing), false otherwise
   */
  async isEventProcessed(eventId: string): Promise<boolean> {
    try {
      const existingEvent = await db
        .select()
        .from(webhookEvents)
        .where(eq(webhookEvents.eventId, eventId))
        .limit(1);

      return existingEvent.length > 0;
    } catch (error) {
      console.error('[WebhookDeduplication] Error checking event:', error);
      throw error;
    }
  }

  /**
   * Record a new webhook event in the database
   * @param eventId - Unique event ID from Razorpay
   * @param eventType - Type of webhook event (e.g., 'payment.captured', 'order.paid')
   * @param payload - Full webhook payload for debugging
   */
  async recordEvent(eventId: string, eventType: string, payload: any): Promise<void> {
    try {
      await db.insert(webhookEvents).values({
        eventId,
        eventType,
        payload,
        status: 'processing',
      });

      console.log(`[WebhookDeduplication] Recorded event: ${eventId} (${eventType})`);
    } catch (error) {
      // If unique constraint violation, event already exists (race condition)
      // This is expected behavior when concurrent webhooks arrive
      if ((error as any).code === '23505') {
        console.log(`[WebhookDeduplication] Event ${eventId} already recorded (duplicate)`);
        return;
      }

      console.error('[WebhookDeduplication] Error recording event:', error);
      throw error;
    }
  }

  /**
   * Mark a webhook event as successfully processed
   * @param eventId - Unique event ID from Razorpay
   */
  async markSuccess(eventId: string): Promise<void> {
    try {
      await db
        .update(webhookEvents)
        .set({
          status: 'success',
          processedAt: new Date(),
        })
        .where(eq(webhookEvents.eventId, eventId));

      console.log(`[WebhookDeduplication] Marked event as success: ${eventId}`);
    } catch (error) {
      console.error('[WebhookDeduplication] Error marking success:', error);
      throw error;
    }
  }

  /**
   * Mark a webhook event as failed with error details
   * @param eventId - Unique event ID from Razorpay
   * @param error - Error message describing what went wrong
   */
  async markFailed(eventId: string, error: string): Promise<void> {
    try {
      await db
        .update(webhookEvents)
        .set({
          status: 'failed',
          errorMessage: error,
          processedAt: new Date(),
        })
        .where(eq(webhookEvents.eventId, eventId));

      console.log(`[WebhookDeduplication] Marked event as failed: ${eventId} - ${error}`);
    } catch (error) {
      console.error('[WebhookDeduplication] Error marking failed:', error);
      throw error;
    }
  }
}

export const webhookDeduplicationService = new WebhookDeduplicationService();
