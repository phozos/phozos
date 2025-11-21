import { db } from '../../db';
import { webhookQueue } from '@shared/schema';
import { eq, and, lt, lte, sql } from 'drizzle-orm';
import logger from '../../utils/logger';

/**
 * Webhook Queue Service
 * 
 * Provides async webhook processing queue functionality for improved webhook response times.
 * Key features:
 * - Enqueues webhooks immediately after signature verification
 * - Enables fast 200 OK response to Razorpay (<100ms target)
 * - Handles retry logic with exponential backoff
 * - Prevents duplicate processing via event_id uniqueness
 * 
 * @see WEBHOOK_FIX_PLAN.md Phase 3 - Performance Optimization
 */

export interface WebhookQueueItem {
  id: string;
  eventId: string;
  eventType: string;
  payload: any;
  status: 'pending' | 'processing' | 'success' | 'failed';
  attempts: number;
  maxAttempts: number;
  errorMessage?: string | null;
  createdAt: Date;
  processedAt?: Date | null;
  nextRetryAt?: Date | null;
}

export class WebhookQueueService {
  /**
   * Queue webhook event for async processing
   * 
   * @param eventId - Unique event ID from x-razorpay-event-id header
   * @param eventType - Event type (e.g., 'payment.captured', 'order.paid')
   * @param payload - Full webhook payload from Razorpay
   */
  async enqueue(
    eventId: string,
    eventType: string,
    payload: any
  ): Promise<void> {
    try {
      await db.insert(webhookQueue).values({
        eventId,
        eventType,
        payload,
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        nextRetryAt: new Date(), // Process immediately
      });

      logger.info('Webhook queued for async processing', {
        eventId,
        eventType,
      });
    } catch (error: any) {
      // Duplicate event (already queued) - this is OK, idempotent
      if (error.code === '23505') {
        logger.info('Webhook already queued (duplicate)', { eventId });
        return;
      }
      throw error;
    }
  }

  /**
   * Get next pending webhook to process
   * 
   * Atomically updates the status to 'processing' and increments attempts counter
   * to prevent race conditions in multi-worker scenarios.
   * 
   * @returns Next webhook to process, or null if queue is empty
   */
  async getNextPending(): Promise<WebhookQueueItem | null> {
    const now = new Date();
    
    // Use a transaction with SELECT FOR UPDATE SKIP LOCKED for concurrent safety
    // This prevents race conditions when multiple processors are running
    const result = await db.transaction(async (tx) => {
      // First, select and lock one pending webhook
      const webhooks = await tx
        .select()
        .from(webhookQueue)
        .where(
          and(
            eq(webhookQueue.status, 'pending'),
            lte(webhookQueue.nextRetryAt, now)
          )
        )
        .orderBy(webhookQueue.createdAt)
        .limit(1)
        .for('update', { skipLocked: true });

      if (webhooks.length === 0) {
        return null;
      }

      const webhook = webhooks[0];

      // Now update its status to processing
      const updated = await tx
        .update(webhookQueue)
        .set({ 
          status: 'processing' as const,
          attempts: sql`${webhookQueue.attempts} + 1`
        })
        .where(eq(webhookQueue.id, webhook.id))
        .returning();

      return updated[0] || null;
    });

    return result as WebhookQueueItem | null;
  }

  /**
   * Mark webhook as successfully processed
   * 
   * @param eventId - Event ID to mark as success
   */
  async markSuccess(eventId: string): Promise<void> {
    await db
      .update(webhookQueue)
      .set({
        status: 'success',
        processedAt: new Date(),
      })
      .where(eq(webhookQueue.eventId, eventId));

    logger.info('Webhook processed successfully', { eventId });
  }

  /**
   * Mark webhook as failed (with retry logic)
   * 
   * Implements exponential backoff:
   * - Attempt 1 fails: Retry in 1 minute (2^0 * 60s)
   * - Attempt 2 fails: Retry in 2 minutes (2^1 * 60s)
   * - Attempt 3 fails: Retry in 4 minutes (2^2 * 60s)
   * - After max attempts: Mark as permanently failed
   * 
   * @param eventId - Event ID to mark as failed
   * @param error - Error message describing the failure
   * @param attempts - Current number of attempts
   * @param maxAttempts - Maximum retry attempts allowed
   */
  async markFailed(
    eventId: string,
    error: string,
    attempts: number,
    maxAttempts: number
  ): Promise<void> {
    const shouldRetry = attempts < maxAttempts;
    
    // Exponential backoff: 2^attempts minutes
    const nextRetryAt = shouldRetry
      ? new Date(Date.now() + Math.pow(2, attempts) * 60000)
      : undefined;

    await db
      .update(webhookQueue)
      .set({
        status: shouldRetry ? 'pending' : 'failed',
        errorMessage: error,
        processedAt: shouldRetry ? undefined : new Date(),
        nextRetryAt: shouldRetry ? nextRetryAt : undefined,
      })
      .where(eq(webhookQueue.eventId, eventId));

    logger.warn('Webhook processing failed', {
      eventId,
      error,
      attempts,
      maxAttempts,
      willRetry: shouldRetry,
      nextRetryAt: shouldRetry ? nextRetryAt?.toISOString() : null,
    });
  }

  /**
   * Get queue statistics for monitoring
   * 
   * @returns Queue depth statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    success: number;
    failed: number;
  }> {
    const pending = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(webhookQueue)
      .where(eq(webhookQueue.status, 'pending'));

    const processing = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(webhookQueue)
      .where(eq(webhookQueue.status, 'processing'));

    const success = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(webhookQueue)
      .where(eq(webhookQueue.status, 'success'));

    const failed = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(webhookQueue)
      .where(eq(webhookQueue.status, 'failed'));

    return {
      pending: Number(pending[0]?.count || 0),
      processing: Number(processing[0]?.count || 0),
      success: Number(success[0]?.count || 0),
      failed: Number(failed[0]?.count || 0),
    };
  }
}

export const webhookQueueService = new WebhookQueueService();
