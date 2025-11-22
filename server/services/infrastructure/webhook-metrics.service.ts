import logger from '../../utils/logger';

/**
 * Webhook Metrics Service
 * 
 * Tracks webhook health metrics for monitoring and alerting.
 * Provides visibility into webhook performance, error rates, and potential issues.
 * 
 * Key metrics tracked:
 * - Total webhooks received
 * - Signature verification failures
 * - Timestamp validation failures
 * - Duplicate webhook events
 * - Processing errors
 * - Average response time
 * 
 * Alerting thresholds:
 * - Signature failure rate > 5% → CRITICAL alert
 * - Processing error rate > 10% → HIGH alert
 * - Average response time > 200ms → MEDIUM alert
 * 
 * @see WEBHOOK_FIX_PLAN.md Phase 4 - Monitoring & Testing
 */

export interface WebhookMetrics {
  totalReceived: number;
  signatureFailures: number;
  timestampFailures: number;
  duplicates: number;
  processingErrors: number;
  averageResponseTime: number;
  signatureFailureRate: number;
  errorRate: number;
}

export class WebhookMetricsService {
  private metrics = {
    totalReceived: 0,
    signatureFailures: 0,
    timestampFailures: 0,
    duplicates: 0,
    processingErrors: 0,
    averageResponseTime: 0,
  };

  private responseTimeSamples: number[] = [];
  private readonly maxSamples = 100; // Rolling window of last 100 webhooks

  /**
   * Record a webhook received
   */
  recordWebhookReceived() {
    this.metrics.totalReceived++;
  }

  /**
   * Record a signature verification failure
   * 
   * Triggers alert if failure rate exceeds threshold
   */
  recordSignatureFailure() {
    this.metrics.signatureFailures++;
    this.checkAlertThresholds();
  }

  /**
   * Record a timestamp validation failure
   * 
   * Indicates potential replay attacks or clock skew issues
   */
  recordTimestampFailure() {
    this.metrics.timestampFailures++;
  }

  /**
   * Record a duplicate webhook event
   * 
   * This is expected behavior (idempotent handling)
   */
  recordDuplicate() {
    this.metrics.duplicates++;
  }

  /**
   * Record a processing error
   * 
   * Triggers alert if error rate exceeds threshold
   */
  recordProcessingError() {
    this.metrics.processingErrors++;
    this.checkAlertThresholds();
  }

  /**
   * Record webhook response time
   * 
   * Maintains rolling average of last 100 webhooks
   * 
   * @param durationMs - Response time in milliseconds
   */
  recordResponseTime(durationMs: number) {
    this.responseTimeSamples.push(durationMs);
    
    // Keep only last N samples (rolling window)
    if (this.responseTimeSamples.length > this.maxSamples) {
      this.responseTimeSamples.shift();
    }
    
    // Recalculate average
    this.metrics.averageResponseTime =
      this.responseTimeSamples.reduce((a, b) => a + b, 0) /
      this.responseTimeSamples.length;

    // Alert if response time exceeds threshold
    if (durationMs > 200) {
      logger.warn('Slow webhook response detected', {
        durationMs,
        threshold: 200,
        urgency: 'medium',
      });
    }
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics(): WebhookMetrics {
    return {
      ...this.metrics,
      signatureFailureRate: this.calculateRate(this.metrics.signatureFailures),
      errorRate: this.calculateRate(this.metrics.processingErrors),
    };
  }

  /**
   * Get detailed metrics with percentiles
   */
  getDetailedMetrics() {
    const metrics = this.getMetrics();
    
    return {
      ...metrics,
      responseTimePercentiles: this.calculatePercentiles(),
      sampleSize: this.responseTimeSamples.length,
    };
  }

  /**
   * Calculate percentage rate
   * 
   * @param count - Number of events
   * @returns Percentage (0-100)
   */
  private calculateRate(count: number): number {
    if (this.metrics.totalReceived === 0) return 0;
    return (count / this.metrics.totalReceived) * 100;
  }

  /**
   * Calculate response time percentiles
   */
  private calculatePercentiles() {
    if (this.responseTimeSamples.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...this.responseTimeSamples].sort((a, b) => a - b);
    const len = sorted.length;

    return {
      p50: sorted[Math.floor(len * 0.5)],
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)],
    };
  }

  /**
   * Check alert thresholds and log critical issues
   */
  private checkAlertThresholds() {
    const metrics = this.getMetrics();

    // CRITICAL: Signature failure rate > 5%
    if (metrics.signatureFailureRate > 5) {
      logger.error('HIGH WEBHOOK SIGNATURE FAILURE RATE DETECTED', {
        rate: metrics.signatureFailureRate.toFixed(2) + '%',
        failures: metrics.signatureFailures,
        total: metrics.totalReceived,
        urgency: 'critical',
        action: 'Verify RAZORPAY_WEBHOOK_SECRET environment variable',
      });
    }

    // HIGH: Processing error rate > 10%
    if (metrics.errorRate > 10) {
      logger.error('HIGH WEBHOOK PROCESSING ERROR RATE DETECTED', {
        rate: metrics.errorRate.toFixed(2) + '%',
        errors: metrics.processingErrors,
        total: metrics.totalReceived,
        urgency: 'high',
        action: 'Check application logs for processing errors',
      });
    }

    // MEDIUM: Average response time > 200ms
    if (metrics.averageResponseTime > 200) {
      logger.warn('SLOW WEBHOOK RESPONSE TIME DETECTED', {
        averageResponseTime: metrics.averageResponseTime.toFixed(2) + 'ms',
        threshold: '200ms',
        urgency: 'medium',
        action: 'Review webhook queue depth and processor performance',
      });
    }
  }

  /**
   * Reset all metrics
   * 
   * Useful for testing or periodic resets
   */
  reset() {
    this.metrics = {
      totalReceived: 0,
      signatureFailures: 0,
      timestampFailures: 0,
      duplicates: 0,
      processingErrors: 0,
      averageResponseTime: 0,
    };
    this.responseTimeSamples = [];
    
    logger.info('Webhook metrics reset');
  }

  /**
   * Get metrics summary for dashboards
   */
  getSummary() {
    const metrics = this.getMetrics();
    const percentiles = this.calculatePercentiles();

    return {
      health: this.calculateHealthScore(metrics),
      metrics: {
        totalReceived: metrics.totalReceived,
        signatureFailures: metrics.signatureFailures,
        duplicates: metrics.duplicates,
        processingErrors: metrics.processingErrors,
      },
      rates: {
        signatureFailureRate: metrics.signatureFailureRate.toFixed(2) + '%',
        errorRate: metrics.errorRate.toFixed(2) + '%',
      },
      performance: {
        averageResponseTime: metrics.averageResponseTime.toFixed(2) + 'ms',
        p50: percentiles.p50.toFixed(2) + 'ms',
        p95: percentiles.p95.toFixed(2) + 'ms',
        p99: percentiles.p99.toFixed(2) + 'ms',
      },
    };
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateHealthScore(metrics: WebhookMetrics): number {
    let score = 100;

    // Deduct points for signature failures
    if (metrics.signatureFailureRate > 0) {
      score -= Math.min(50, metrics.signatureFailureRate * 10);
    }

    // Deduct points for processing errors
    if (metrics.errorRate > 0) {
      score -= Math.min(30, metrics.errorRate * 3);
    }

    // Deduct points for slow response times
    if (metrics.averageResponseTime > 200) {
      score -= Math.min(20, (metrics.averageResponseTime - 200) / 10);
    }

    return Math.max(0, Math.round(score));
  }
}

export const webhookMetricsService = new WebhookMetricsService();
