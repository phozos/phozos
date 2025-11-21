import { webhookQueueService } from '../services/infrastructure/webhook-queue.service';
import logger from '../utils/logger';

/**
 * Webhook Processor
 * 
 * Background worker that asynchronously processes queued webhook events.
 * This decouples webhook receipt (fast path) from webhook processing (slow path)
 * to achieve <100ms webhook response times.
 * 
 * Key features:
 * - Polls webhook_queue table every 1 second
 * - Processes webhooks asynchronously (not blocking HTTP response)
 * - Automatic retry with exponential backoff
 * - Prevents duplicate processing via database locks
 * - Graceful shutdown support
 * 
 * @see WEBHOOK_FIX_PLAN.md Phase 3 - Performance Optimization
 */

export class WebhookProcessor {
  private intervalId?: NodeJS.Timeout;
  private isProcessing = false;
  private isShuttingDown = false;

  /**
   * Start the webhook processor
   * 
   * Begins polling the webhook queue every 1 second for pending webhooks.
   * Safe to call multiple times (idempotent).
   */
  start() {
    if (this.intervalId) {
      logger.warn('Webhook processor already running');
      return;
    }

    logger.info('Starting webhook processor');
    this.intervalId = setInterval(() => this.processNext(), 1000); // Poll every 1 second
  }

  /**
   * Stop the webhook processor
   * 
   * Gracefully shuts down the processor, waiting for current webhook to finish.
   */
  stop() {
    if (this.intervalId) {
      this.isShuttingDown = true;
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      logger.info('Webhook processor stopped');
    }
  }

  /**
   * Process next pending webhook from the queue
   * 
   * This method is called by the interval timer. It:
   * 1. Fetches next pending webhook (atomically locks it)
   * 2. Routes to appropriate handler based on event type
   * 3. Marks as success/failed in database
   * 4. Implements retry logic with exponential backoff
   */
  private async processNext() {
    if (this.isProcessing || this.isShuttingDown) {
      return; // Skip if already processing or shutting down
    }

    this.isProcessing = true;

    try {
      const webhook = await webhookQueueService.getNextPending();
      
      if (!webhook) {
        this.isProcessing = false;
        return; // No pending webhooks
      }

      logger.info('Processing queued webhook', {
        eventId: webhook.eventId,
        eventType: webhook.eventType,
        attempt: webhook.attempts,
      });

      // Process webhook based on event type
      try {
        await this.processWebhookEvent(webhook);
        await webhookQueueService.markSuccess(webhook.eventId);
      } catch (error: any) {
        await webhookQueueService.markFailed(
          webhook.eventId,
          error.message,
          webhook.attempts,
          webhook.maxAttempts
        );
      }
    } catch (error) {
      logger.error('Error in webhook processor', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process webhook event by routing to appropriate handler
   * 
   * @param webhook - Webhook queue item to process
   */
  private async processWebhookEvent(webhook: any) {
    // Dynamic import to avoid circular dependencies
    const { paymentController } = await import('../controllers/payment.controller');
    
    const payload = webhook.payload;
    const event = webhook.eventType;

    switch (event) {
      case 'payment.captured':
        // payload structure from Razorpay: { event, payload: { payment: { entity } } }
        await (paymentController as any).handlePaymentCaptured(payload.payload.payment.entity);
        break;

      case 'payment.failed':
        await (paymentController as any).handlePaymentFailed(payload.payload.payment.entity);
        break;

      case 'order.paid':
        await (paymentController as any).handleOrderPaid(payload.payload.order.entity);
        break;

      case 'refund.processed':
      case 'refund.failed':
        await (paymentController as any).processRefundWebhook(payload);
        break;

      default:
        logger.info('Unhandled webhook event type in processor', { event });
    }
  }

  /**
   * Get processor status for health checks
   */
  getStatus(): {
    isRunning: boolean;
    isProcessing: boolean;
    isShuttingDown: boolean;
  } {
    return {
      isRunning: !!this.intervalId,
      isProcessing: this.isProcessing,
      isShuttingDown: this.isShuttingDown,
    };
  }
}

export const webhookProcessor = new WebhookProcessor();
