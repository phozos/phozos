import { db } from '../db';
import { refunds } from '@shared/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import logger from '../utils/logger';

export class RefundMetricsAggregationJob {
  private aggregationInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  start(): void {
    if (this.isRunning) {
      logger.warn('Refund metrics aggregation job already running');
      return;
    }

    logger.info('Starting refund metrics aggregation job');

    this.scheduleAggregationJob();

    this.isRunning = true;
    logger.info('Refund metrics aggregation job started successfully');
  }

  stop(): void {
    if (!this.isRunning) {
      logger.warn('Refund metrics aggregation job is not running');
      return;
    }

    logger.info('Stopping refund metrics aggregation job');

    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
      this.aggregationInterval = null;
    }

    this.isRunning = false;
    logger.info('Refund metrics aggregation job stopped successfully');
  }

  private scheduleAggregationJob(): void {
    const now = new Date();
    const next3AM = new Date();
    next3AM.setHours(3, 0, 0, 0);

    if (now.getHours() >= 3) {
      next3AM.setDate(next3AM.getDate() + 1);
    }

    const msUntilNext3AM = next3AM.getTime() - now.getTime();

    logger.info('Refund metrics aggregation job scheduled', {
      nextRun: next3AM.toISOString(),
      msUntilNextRun: msUntilNext3AM,
    });

    if (now.getHours() === 3 && now.getMinutes() === 0) {
      logger.info('Running aggregation job immediately (startup at scheduled time)');
      this.runAggregation();
    }

    setTimeout(() => {
      this.runAggregation();

      this.aggregationInterval = setInterval(() => {
        this.runAggregation();
      }, 24 * 60 * 60 * 1000);

      logger.info('Aggregation job recurring schedule established');
    }, msUntilNext3AM);
  }

  private async runAggregation(): Promise<void> {
    logger.info('Running refund metrics aggregation');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);

      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      const [dailyMetrics, weeklyMetrics, monthlyMetrics] = await Promise.all([
        this.aggregateMetrics(yesterday, today, 'daily'),
        this.aggregateMetrics(last7Days, today, 'weekly'),
        this.aggregateMetrics(last30Days, today, 'monthly'),
      ]);

      logger.info('Refund metrics aggregation completed', {
        daily: dailyMetrics,
        weekly: weeklyMetrics,
        monthly: monthlyMetrics,
      });
    } catch (error) {
      logger.error('Refund metrics aggregation job failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async aggregateMetrics(
    startDate: Date,
    endDate: Date,
    period: string
  ): Promise<{
    totalRefunds: number;
    totalAmount: number;
    approvalRate: number;
    avgProcessingTimeHours: number;
    statusBreakdown: Record<string, number>;
  }> {
    const refundData = await db
      .select()
      .from(refunds)
      .where(
        and(
          gte(refunds.createdAt, startDate)
        )
      );

    const totalRefunds = refundData.length;
    const totalAmount = refundData.reduce((sum, r) => sum + parseFloat(r.amount), 0);

    const approvedCount = refundData.filter(
      (r) => r.status === 'approved' || r.status === 'completed' || r.status === 'processing'
    ).length;
    const approvalRate = totalRefunds > 0 ? (approvedCount / totalRefunds) * 100 : 0;

    const processedRefunds = refundData.filter((r) => r.processedAt && r.requestedAt);
    const totalProcessingTimeMs = processedRefunds.reduce((sum, r) => {
      const requested = new Date(r.requestedAt).getTime();
      const processed = new Date(r.processedAt!).getTime();
      return sum + (processed - requested);
    }, 0);
    const avgProcessingTimeHours =
      processedRefunds.length > 0
        ? totalProcessingTimeMs / (processedRefunds.length * 1000 * 60 * 60)
        : 0;

    const statusBreakdown = refundData.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    logger.info('Refund metrics aggregated', {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalRefunds,
      totalAmount: totalAmount.toFixed(2),
      approvalRate: approvalRate.toFixed(2) + '%',
      avgProcessingTimeHours: avgProcessingTimeHours.toFixed(2),
      statusBreakdown,
    });

    return {
      totalRefunds,
      totalAmount,
      approvalRate,
      avgProcessingTimeHours,
      statusBreakdown,
    };
  }
}
