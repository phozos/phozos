import { db } from '../db';
import { subscriptionAuditOutbox } from '@shared/schema';
import { eq, and, lt } from 'drizzle-orm';
import logger from '../utils/logger';

/**
 * Archive Outbox Events Job
 * 
 * Manages cleanup of old completed outbox events:
 * - Runs daily at 2 AM
 * - Deletes completed events older than 30 days
 * - Keeps 'failed' events indefinitely for investigation
 * - Keeps 'pending' and 'processing' events indefinitely
 * 
 * This service uses setInterval for simplicity. For production
 * with multiple server instances, consider using:
 * - node-cron with cluster management
 * - External scheduler (e.g., AWS EventBridge, Google Cloud Scheduler)
 * - Job queue (e.g., Bull, BullMQ with Redis)
 */
export class ArchiveOutboxEventsJob {
  private archivalInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private readonly RETENTION_DAYS = 30;

  /**
   * Start the archival job scheduler
   * Begins running scheduled archival tasks
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Archive outbox events job already running');
      return;
    }

    logger.info('Starting archive outbox events job');

    this.scheduleArchivalJob();

    this.isRunning = true;
    logger.info('Archive outbox events job started successfully');
  }

  /**
   * Stop the archival job scheduler
   * Clears all scheduled tasks
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Archive outbox events job is not running');
      return;
    }

    logger.info('Stopping archive outbox events job');

    if (this.archivalInterval) {
      clearInterval(this.archivalInterval);
      this.archivalInterval = null;
    }

    this.isRunning = false;
    logger.info('Archive outbox events job stopped successfully');
  }

  /**
   * Schedule the archival job to run at 2 AM every day
   * 
   * Implementation notes:
   * - Calculates time until next 2 AM
   * - Runs archival immediately if within 1 minute of 2 AM on startup
   * - Sets up daily interval to repeat every 24 hours
   */
  private scheduleArchivalJob(): void {
    const now = new Date();
    const next2AM = new Date();
    next2AM.setHours(2, 0, 0, 0);

    if (now.getHours() >= 2) {
      next2AM.setDate(next2AM.getDate() + 1);
    }

    const msUntilNext2AM = next2AM.getTime() - now.getTime();

    logger.info('Archival job scheduled', {
      nextRun: next2AM.toISOString(),
      msUntilNextRun: msUntilNext2AM,
      retentionDays: this.RETENTION_DAYS,
    });

    if (now.getHours() === 2 && now.getMinutes() === 0) {
      logger.info('Running archival job immediately (startup at scheduled time)');
      this.runArchival();
    }

    setTimeout(() => {
      this.runArchival();

      this.archivalInterval = setInterval(() => {
        this.runArchival();
      }, 24 * 60 * 60 * 1000);

      logger.info('Archival job recurring schedule established');
    }, msUntilNext2AM);
  }

  /**
   * Run the archival job
   * Deletes completed events older than retention period
   */
  private async runArchival(): Promise<void> {
    logger.info('Running outbox archival job', {
      retentionDays: this.RETENTION_DAYS,
    });

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

      const eventsToArchive = await db
        .select()
        .from(subscriptionAuditOutbox)
        .where(
          and(
            eq(subscriptionAuditOutbox.status, 'completed'),
            lt(subscriptionAuditOutbox.processedAt, cutoffDate)
          )
        );

      if (eventsToArchive.length === 0) {
        logger.info('No events to archive', {
          cutoffDate: cutoffDate.toISOString(),
        });
        return;
      }

      logger.info('Found events to archive', {
        count: eventsToArchive.length,
        cutoffDate: cutoffDate.toISOString(),
      });

      const result = await db
        .delete(subscriptionAuditOutbox)
        .where(
          and(
            eq(subscriptionAuditOutbox.status, 'completed'),
            lt(subscriptionAuditOutbox.processedAt, cutoffDate)
          )
        );

      logger.info('Archival job completed successfully', {
        deletedCount: eventsToArchive.length,
        cutoffDate: cutoffDate.toISOString(),
      });
    } catch (error) {
      logger.error('Failed to run archival job', {
        error,
        retentionDays: this.RETENTION_DAYS,
      });
    }
  }

  /**
   * Manually trigger the archival job (for testing)
   * Can be called via admin endpoint if needed
   */
  async triggerArchivalNow(): Promise<void> {
    logger.info('Manually triggering archival job');
    await this.runArchival();
  }

  /**
   * Get archival job status
   * Returns whether the job is currently running
   */
  getStatus(): { isRunning: boolean; retentionDays: number } {
    return {
      isRunning: this.isRunning,
      retentionDays: this.RETENTION_DAYS,
    };
  }
}

export const archiveOutboxEventsJob = new ArchiveOutboxEventsJob();
