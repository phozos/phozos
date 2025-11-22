import { paymentAlertingService } from '../domain/payment-alerting.service';
import logger from '../../utils/logger';

/**
 * Payment Alerts Scheduler
 * 
 * Manages scheduled tasks for payment alerting:
 * - Daily digest of failed payments (runs at 9 AM daily)
 * 
 * This service uses setInterval for simplicity. For production
 * with multiple server instances, consider using:
 * - node-cron with cluster management
 * - External scheduler (e.g., AWS EventBridge, Google Cloud Scheduler)
 * - Job queue (e.g., Bull, BullMQ with Redis)
 */
export class PaymentAlertsScheduler {
  private dailyDigestInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  /**
   * Start the scheduler
   * Begins running scheduled tasks
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Payment alerts scheduler already running');
      return;
    }

    logger.info('Starting payment alerts scheduler');

    // Schedule daily digest to run once per day at 9 AM
    this.scheduleDailyDigest();

    this.isRunning = true;
    logger.info('Payment alerts scheduler started successfully');
  }

  /**
   * Stop the scheduler
   * Clears all scheduled tasks
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Payment alerts scheduler is not running');
      return;
    }

    logger.info('Stopping payment alerts scheduler');

    if (this.dailyDigestInterval) {
      clearInterval(this.dailyDigestInterval);
      this.dailyDigestInterval = null;
    }

    this.isRunning = false;
    logger.info('Payment alerts scheduler stopped successfully');
  }

  /**
   * Schedule the daily digest to run at 9 AM every day
   * 
   * Implementation notes:
   * - Calculates time until next 9 AM
   * - Runs digest immediately if within 1 minute of 9 AM on startup
   * - Sets up daily interval to repeat every 24 hours
   */
  private scheduleDailyDigest(): void {
    // Calculate milliseconds until next 9 AM
    const now = new Date();
    const next9AM = new Date();
    next9AM.setHours(9, 0, 0, 0);

    // If it's already past 9 AM today, schedule for tomorrow
    if (now.getHours() >= 9) {
      next9AM.setDate(next9AM.getDate() + 1);
    }

    const msUntilNext9AM = next9AM.getTime() - now.getTime();

    logger.info('Daily digest scheduled', {
      nextRun: next9AM.toISOString(),
      msUntilNextRun: msUntilNext9AM,
    });

    // Run immediately if we're starting within 1 minute of 9 AM
    if (now.getHours() === 9 && now.getMinutes() === 0) {
      logger.info('Running daily digest immediately (startup at scheduled time)');
      this.runDailyDigest();
    }

    // Schedule first run at next 9 AM
    setTimeout(() => {
      // Run the digest
      this.runDailyDigest();

      // Then set up recurring daily execution
      // Run every 24 hours (86400000 ms)
      this.dailyDigestInterval = setInterval(() => {
        this.runDailyDigest();
      }, 24 * 60 * 60 * 1000);

      logger.info('Daily digest recurring schedule established');
    }, msUntilNext9AM);
  }

  /**
   * Run the daily digest
   * Executes the digest email generation and sending
   */
  private async runDailyDigest(): Promise<void> {
    logger.info('Running daily payment failures digest');

    try {
      await paymentAlertingService.sendDailyDigest();
      logger.info('Daily payment failures digest completed successfully');
    } catch (error) {
      logger.error('Failed to run daily payment failures digest', { error });
    }
  }

  /**
   * Manually trigger the daily digest (for testing)
   * Can be called via admin endpoint if needed
   */
  async triggerDigestNow(): Promise<void> {
    logger.info('Manually triggering daily digest');
    await this.runDailyDigest();
  }
}

export const paymentAlertsScheduler = new PaymentAlertsScheduler();
