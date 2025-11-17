import { db } from '../db';
import { refunds } from '@shared/schema';
import { eq, and, or, isNotNull } from 'drizzle-orm';
import logger from '../utils/logger';
import { RazorpayService } from '../services/integration/razorpay.service';
import { subscriptionManagementNotificationService } from '../services/domain/subscription-management-notifications.service';

export class RefundStatusSyncJob {
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private readonly SYNC_INTERVAL_MS = 15 * 60 * 1000;
  private readonly MAX_RETRIES = 3;
  private readonly BASE_BACKOFF_MS = 1000;
  private razorpayService: RazorpayService;

  constructor() {
    this.razorpayService = new RazorpayService();
  }

  start(): void {
    if (this.isRunning) {
      logger.warn('Refund status sync job already running');
      return;
    }

    logger.info('Starting refund status sync job', {
      intervalMinutes: this.SYNC_INTERVAL_MS / 60000,
    });

    this.runSync();

    this.syncInterval = setInterval(() => {
      this.runSync();
    }, this.SYNC_INTERVAL_MS);

    this.isRunning = true;
    logger.info('Refund status sync job started successfully');
  }

  stop(): void {
    if (!this.isRunning) {
      logger.warn('Refund status sync job is not running');
      return;
    }

    logger.info('Stopping refund status sync job');

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.isRunning = false;
    logger.info('Refund status sync job stopped successfully');
  }

  private async runSync(): Promise<void> {
    logger.info('Running refund status sync');

    try {
      const refundsToSync = await db
        .select()
        .from(refunds)
        .where(
          and(
            isNotNull(refunds.razorpayRefundId),
            eq(refunds.status, 'processing')
          )
        );

      if (refundsToSync.length === 0) {
        logger.info('No refunds to sync');
        return;
      }

      logger.info('Found refunds to sync', { count: refundsToSync.length });

      let successCount = 0;
      let failureCount = 0;

      for (const refund of refundsToSync) {
        try {
          await this.syncRefundStatus(refund);
          successCount++;
        } catch (error) {
          failureCount++;
          logger.error('Failed to sync refund status', {
            refundId: refund.id,
            razorpayRefundId: refund.razorpayRefundId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      logger.info('Refund status sync completed', {
        total: refundsToSync.length,
        success: successCount,
        failures: failureCount,
      });
    } catch (error) {
      logger.error('Refund status sync job failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async syncRefundStatus(refund: any): Promise<void> {
    if (!refund.razorpayRefundId) {
      return;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const razorpayRefund = await this.razorpayService.getRefundStatus(
          refund.razorpayRefundId
        );

        const previousStatus = refund.status;
        let newStatus = refund.status;

        if (razorpayRefund.status === 'processed') {
          newStatus = 'completed';
        } else if (razorpayRefund.status === 'failed') {
          newStatus = 'failed';
        }

        if (newStatus !== previousStatus || refund.razorpayStatus !== razorpayRefund.status) {
          await db
            .update(refunds)
            .set({
              status: newStatus,
              razorpayStatus: razorpayRefund.status,
              razorpayResponse: razorpayRefund as any,
              processedAt: razorpayRefund.status === 'processed' ? new Date() : refund.processedAt,
              updatedAt: new Date(),
            })
            .where(eq(refunds.id, refund.id));

          logger.info('Refund status updated', {
            refundId: refund.id,
            razorpayRefundId: refund.razorpayRefundId,
            previousStatus,
            newStatus,
            razorpayStatus: razorpayRefund.status,
          });

          if (newStatus === 'completed' && previousStatus !== 'completed') {
            await subscriptionManagementNotificationService.notifyRefundProcessed(
              refund.userId,
              refund.subscriptionId,
              parseFloat(refund.amount)
            );
          } else if (newStatus === 'failed' && previousStatus !== 'failed') {
            await subscriptionManagementNotificationService.notifyRefundFailed(
              refund.userId,
              refund.subscriptionId,
              parseFloat(refund.amount)
            );
          }
        }

        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.MAX_RETRIES - 1) {
          const backoffMs = this.BASE_BACKOFF_MS * Math.pow(2, attempt);
          logger.warn('Retrying refund status sync after backoff', {
            refundId: refund.id,
            attempt: attempt + 1,
            backoffMs,
          });
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }

    if (lastError) {
      throw lastError;
    }
  }
}
