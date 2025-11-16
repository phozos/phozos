import { db } from '../db';
import { cancellationRequests, refunds } from '@shared/schema';
import { eq, and, lt } from 'drizzle-orm';
import logger from '../utils/logger';
import { subscriptionManagementNotificationService } from '../services/domain/subscription-management-notifications.service';

export class StaleRequestCleanupJob {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private readonly STALE_THRESHOLD_DAYS = 30;

  start(): void {
    if (this.isRunning) {
      logger.warn('Stale request cleanup job already running');
      return;
    }

    logger.info('Starting stale request cleanup job');

    this.scheduleCleanupJob();

    this.isRunning = true;
    logger.info('Stale request cleanup job started successfully');
  }

  stop(): void {
    if (!this.isRunning) {
      logger.warn('Stale request cleanup job is not running');
      return;
    }

    logger.info('Stopping stale request cleanup job');

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.isRunning = false;
    logger.info('Stale request cleanup job stopped successfully');
  }

  private scheduleCleanupJob(): void {
    const now = new Date();
    const next2AM = new Date();
    next2AM.setHours(2, 0, 0, 0);

    if (now.getHours() >= 2) {
      next2AM.setDate(next2AM.getDate() + 1);
    }

    const msUntilNext2AM = next2AM.getTime() - now.getTime();

    logger.info('Stale request cleanup job scheduled', {
      nextRun: next2AM.toISOString(),
      msUntilNextRun: msUntilNext2AM,
      staleThresholdDays: this.STALE_THRESHOLD_DAYS,
    });

    if (now.getHours() === 2 && now.getMinutes() === 0) {
      logger.info('Running cleanup job immediately (startup at scheduled time)');
      this.runCleanup();
    }

    setTimeout(() => {
      this.runCleanup();

      this.cleanupInterval = setInterval(() => {
        this.runCleanup();
      }, 24 * 60 * 60 * 1000);

      logger.info('Cleanup job recurring schedule established');
    }, msUntilNext2AM);
  }

  private async runCleanup(): Promise<void> {
    logger.info('Running stale request cleanup job', {
      staleThresholdDays: this.STALE_THRESHOLD_DAYS,
    });

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.STALE_THRESHOLD_DAYS);

      const staleCancellations = await this.cleanupStaleCancellations(cutoffDate);
      const staleRefunds = await this.cleanupStaleRefunds(cutoffDate);

      logger.info('Stale request cleanup completed', {
        cutoffDate: cutoffDate.toISOString(),
        cancellationsRejected: staleCancellations,
        refundsRejected: staleRefunds,
      });
    } catch (error) {
      logger.error('Stale request cleanup job failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async cleanupStaleCancellations(cutoffDate: Date): Promise<number> {
    const staleCancellationRequests = await db
      .select()
      .from(cancellationRequests)
      .where(
        and(
          eq(cancellationRequests.status, 'pending'),
          lt(cancellationRequests.requestedAt, cutoffDate)
        )
      );

    if (staleCancellationRequests.length === 0) {
      logger.info('No stale cancellation requests found');
      return 0;
    }

    logger.info('Found stale cancellation requests', {
      count: staleCancellationRequests.length,
      cutoffDate: cutoffDate.toISOString(),
    });

    for (const request of staleCancellationRequests) {
      try {
        await db.transaction(async (tx) => {
          await tx
            .update(cancellationRequests)
            .set({
              status: 'rejected',
              processedAt: new Date(),
              adminNotes: `Automatically rejected: Request pending for more than ${this.STALE_THRESHOLD_DAYS} days`,
              updatedAt: new Date(),
            })
            .where(eq(cancellationRequests.id, request.id));

          logger.info('Stale cancellation request rejected', {
            requestId: request.id,
            userId: request.userId,
            daysPending: Math.floor(
              (Date.now() - new Date(request.requestedAt).getTime()) / (1000 * 60 * 60 * 24)
            ),
          });
        });

        await subscriptionManagementNotificationService.notifyCancellationRejected(
          request.userId,
          request.subscriptionId,
          `Your cancellation request was automatically rejected after ${this.STALE_THRESHOLD_DAYS} days without processing. Please contact support if you need assistance.`
        );
      } catch (error) {
        logger.error('Failed to reject stale cancellation request', {
          requestId: request.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return staleCancellationRequests.length;
  }

  private async cleanupStaleRefunds(cutoffDate: Date): Promise<number> {
    const staleRefundRequests = await db
      .select()
      .from(refunds)
      .where(
        and(
          eq(refunds.status, 'pending'),
          lt(refunds.requestedAt, cutoffDate)
        )
      );

    if (staleRefundRequests.length === 0) {
      logger.info('No stale refund requests found');
      return 0;
    }

    logger.info('Found stale refund requests', {
      count: staleRefundRequests.length,
      cutoffDate: cutoffDate.toISOString(),
    });

    for (const request of staleRefundRequests) {
      try {
        await db.transaction(async (tx) => {
          await tx
            .update(refunds)
            .set({
              status: 'rejected',
              processedAt: new Date(),
              adminNotes: `Automatically rejected: Request pending for more than ${this.STALE_THRESHOLD_DAYS} days`,
              updatedAt: new Date(),
            })
            .where(eq(refunds.id, request.id));

          logger.info('Stale refund request rejected', {
            requestId: request.id,
            userId: request.userId,
            daysPending: Math.floor(
              (Date.now() - new Date(request.requestedAt).getTime()) / (1000 * 60 * 60 * 24)
            ),
          });
        });

        await subscriptionManagementNotificationService.notifyRefundRejected(
          request.userId,
          request.subscriptionId,
          parseFloat(request.amount),
          `Your refund request was automatically rejected after ${this.STALE_THRESHOLD_DAYS} days without processing. Please contact support if you need assistance.`
        );
      } catch (error) {
        logger.error('Failed to reject stale refund request', {
          requestId: request.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return staleRefundRequests.length;
  }
}
