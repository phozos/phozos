import logger from '../utils/logger';
import { RefundStatusSyncJob } from './refund-status-sync';
import { StaleRequestCleanupJob } from './stale-request-cleanup';
import { DisputeEscalationJob } from './dispute-escalation';
import { RefundMetricsAggregationJob } from './refund-metrics-aggregation';

class JobScheduler {
  private refundStatusSyncJob: RefundStatusSyncJob;
  private staleRequestCleanupJob: StaleRequestCleanupJob;
  private disputeEscalationJob: DisputeEscalationJob;
  private refundMetricsAggregationJob: RefundMetricsAggregationJob;
  private isRunning: boolean = false;

  constructor() {
    this.refundStatusSyncJob = new RefundStatusSyncJob();
    this.staleRequestCleanupJob = new StaleRequestCleanupJob();
    this.disputeEscalationJob = new DisputeEscalationJob();
    this.refundMetricsAggregationJob = new RefundMetricsAggregationJob();
  }

  start(): void {
    if (this.isRunning) {
      logger.warn('Job scheduler already running');
      return;
    }

    logger.info('Starting Phase 3 background jobs');

    try {
      this.refundStatusSyncJob.start();
      this.staleRequestCleanupJob.start();
      this.disputeEscalationJob.start();
      this.refundMetricsAggregationJob.start();

      this.isRunning = true;
      logger.info('Phase 3 background jobs started successfully', {
        jobs: [
          'RefundStatusSyncJob',
          'StaleRequestCleanupJob',
          'DisputeEscalationJob',
          'RefundMetricsAggregationJob',
        ],
      });
    } catch (error) {
      logger.error('Failed to start Phase 3 background jobs', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  stop(): void {
    if (!this.isRunning) {
      logger.warn('Job scheduler is not running');
      return;
    }

    logger.info('Stopping Phase 3 background jobs');

    try {
      this.refundStatusSyncJob.stop();
      this.staleRequestCleanupJob.stop();
      this.disputeEscalationJob.stop();
      this.refundMetricsAggregationJob.stop();

      this.isRunning = false;
      logger.info('Phase 3 background jobs stopped successfully');
    } catch (error) {
      logger.error('Error stopping Phase 3 background jobs', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  getStatus(): {
    running: boolean;
    jobs: Record<string, string>;
  } {
    return {
      running: this.isRunning,
      jobs: {
        refundStatusSync: this.isRunning ? 'running' : 'stopped',
        staleRequestCleanup: this.isRunning ? 'running' : 'stopped',
        disputeEscalation: this.isRunning ? 'running' : 'stopped',
        refundMetricsAggregation: this.isRunning ? 'running' : 'stopped',
      },
    };
  }
}

export const jobScheduler = new JobScheduler();

export function startBackgroundJobs(): void {
  jobScheduler.start();
}

export function stopBackgroundJobs(): void {
  jobScheduler.stop();
}

export function getJobStatus() {
  return jobScheduler.getStatus();
}
