import { db } from '../../db';
import { subscriptionAuditOutbox, subscriptionEvents } from '@shared/schema';
import { eq, and, or, lte, isNull } from 'drizzle-orm';
import logger from '../../utils/logger';
import outboxConfig from '../../config/outbox-processor.config';

/**
 * Subscription Audit Outbox Processor
 * 
 * Processes subscription events from the outbox table asynchronously.
 * Implements the Transactional Outbox Pattern to ensure reliable event processing.
 * 
 * Features:
 * - Polls for pending events every 2 seconds
 * - Batch processing (10 events per batch)
 * - Exponential backoff retry logic
 * - Dead Letter Queue (DLQ) for failed events after max retries
 * - Comprehensive logging for observability
 * 
 * @see server/config/outbox-processor.config.ts for configuration
 */
export class SubscriptionAuditOutboxProcessor {
  private pollInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private isProcessing: boolean = false;

  /**
   * Start the outbox processor
   * Begins polling for pending events
   */
  start(): void {
    if (!outboxConfig.enableProcessor) {
      logger.info('Outbox processor is disabled via configuration');
      return;
    }

    if (this.isRunning) {
      logger.warn('Outbox processor already running');
      return;
    }

    logger.info('Starting subscription audit outbox processor', {
      pollIntervalMs: outboxConfig.pollIntervalMs,
      batchSize: outboxConfig.batchSize,
      maxRetries: outboxConfig.maxRetries,
    });

    this.isRunning = true;

    this.pollInterval = setInterval(() => {
      this.processEvents();
    }, outboxConfig.pollIntervalMs);

    logger.info('Subscription audit outbox processor started successfully');
  }

  /**
   * Stop the outbox processor
   * Clears the polling interval and waits for current batch to complete
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Outbox processor is not running');
      return;
    }

    logger.info('Stopping subscription audit outbox processor');

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    this.isRunning = false;
    logger.info('Subscription audit outbox processor stopped successfully');
  }

  /**
   * Process a batch of pending events
   * Polls the database for events ready to be processed
   */
  private async processEvents(): Promise<void> {
    if (this.isProcessing) {
      logger.debug('Previous batch still processing, skipping this poll cycle');
      return;
    }

    this.isProcessing = true;

    try {
      const now = new Date();

      const pendingEvents = await db.query.subscriptionAuditOutbox.findMany({
        where: and(
          or(
            eq(subscriptionAuditOutbox.status, 'pending'),
            and(
              eq(subscriptionAuditOutbox.status, 'processing'),
              lte(subscriptionAuditOutbox.nextRetryAt, now)
            )
          ),
          lte(subscriptionAuditOutbox.retries, outboxConfig.maxRetries)
        ),
        limit: outboxConfig.batchSize,
        orderBy: (subscriptionAuditOutbox, { asc }) => [asc(subscriptionAuditOutbox.createdAt)],
      });

      if (pendingEvents.length === 0) {
        logger.debug('No pending events to process');
        return;
      }

      logger.info('Processing outbox events batch', {
        batchSize: pendingEvents.length,
      });

      for (const event of pendingEvents) {
        await this.processEvent(event);
      }

      logger.info('Batch processing completed', {
        processedCount: pendingEvents.length,
      });
    } catch (error) {
      logger.error('Error during batch processing', { error });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single event
   * Attempts to create a subscription event and mark the outbox entry as completed
   * 
   * @param event - The outbox event to process
   */
  private async processEvent(event: any): Promise<void> {
    const startTime = Date.now();

    try {
      logger.info('Processing outbox event', {
        eventId: event.id,
        subscriptionId: event.subscriptionId,
        userId: event.userId,
        eventType: event.eventType,
        retries: event.retries,
      });

      await db.transaction(async (tx) => {
        await tx
          .update(subscriptionAuditOutbox)
          .set({
            status: 'processing',
          })
          .where(eq(subscriptionAuditOutbox.id, event.id));

        await tx.insert(subscriptionEvents).values({
          subscriptionId: event.subscriptionId,
          userId: event.userId,
          eventType: event.eventType,
          oldStatus: event.oldStatus,
          newStatus: event.newStatus,
          metadata: event.metadata,
        });

        await tx
          .update(subscriptionAuditOutbox)
          .set({
            status: 'completed',
            processedAt: new Date(),
            errorMessage: null,
          })
          .where(eq(subscriptionAuditOutbox.id, event.id));
      });

      const duration = Date.now() - startTime;

      logger.info('Successfully processed outbox event', {
        eventId: event.id,
        subscriptionId: event.subscriptionId,
        eventType: event.eventType,
        durationMs: duration,
      });
    } catch (error) {
      await this.handleEventError(event, error);
    }
  }

  /**
   * Handle event processing errors
   * Implements exponential backoff retry logic and DLQ for permanent failures
   * 
   * @param event - The event that failed to process
   * @param error - The error that occurred
   */
  private async handleEventError(event: any, error: any): Promise<void> {
    const newRetries = event.retries + 1;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error('Failed to process outbox event', {
      eventId: event.id,
      subscriptionId: event.subscriptionId,
      eventType: event.eventType,
      retries: newRetries,
      maxRetries: outboxConfig.maxRetries,
      error: errorMessage,
    });

    if (newRetries > outboxConfig.maxRetries) {
      logger.error('Event moved to DLQ after max retries', {
        eventId: event.id,
        subscriptionId: event.subscriptionId,
        eventType: event.eventType,
        totalRetries: newRetries,
      });

      await db
        .update(subscriptionAuditOutbox)
        .set({
          status: 'failed',
          retries: newRetries,
          errorMessage,
          processedAt: new Date(),
          nextRetryAt: null,
        })
        .where(eq(subscriptionAuditOutbox.id, event.id));
    } else {
      const retryDelayMs = outboxConfig.retryDelays[newRetries - 1] || outboxConfig.retryDelays[outboxConfig.retryDelays.length - 1];
      const nextRetryAt = new Date(Date.now() + retryDelayMs);

      logger.info('Scheduling event retry with exponential backoff', {
        eventId: event.id,
        retries: newRetries,
        retryDelayMs,
        nextRetryAt: nextRetryAt.toISOString(),
      });

      await db
        .update(subscriptionAuditOutbox)
        .set({
          status: 'pending',
          retries: newRetries,
          errorMessage,
          nextRetryAt,
        })
        .where(eq(subscriptionAuditOutbox.id, event.id));
    }
  }

  /**
   * Manually trigger event processing (for testing)
   */
  async triggerProcessingNow(): Promise<void> {
    logger.info('Manually triggering outbox event processing');
    await this.processEvents();
  }

  /**
   * Get processor status
   */
  getStatus(): { isRunning: boolean; isProcessing: boolean } {
    return {
      isRunning: this.isRunning,
      isProcessing: this.isProcessing,
    };
  }
}

export const subscriptionAuditOutboxProcessor = new SubscriptionAuditOutboxProcessor();
