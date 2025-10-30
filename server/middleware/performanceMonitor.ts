import type { Request, Response, NextFunction } from 'express';
import { messageQueue } from '../services/infrastructure/messageQueue';

interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  slowRequests: number;
  errorCount: number;
  errorRate: number;
  lastChecked: Date;
  corsPreflightRequests: number;
  corsCrossOriginRequests: number;
  corsErrors: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    requestCount: 0,
    averageResponseTime: 0,
    slowRequests: 0,
    errorCount: 0,
    errorRate: 0,
    lastChecked: new Date(),
    corsPreflightRequests: 0,
    corsCrossOriginRequests: 0,
    corsErrors: 0
  };

  private requestTimes: number[] = [];
  private readonly SLOW_REQUEST_THRESHOLD = 2000; // 2 seconds
  private readonly MAX_STORED_TIMES = 1000;

  /**
   * Express middleware for performance monitoring
   */
  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const isCorsRequest = !!req.headers.origin;
      const isPreflightRequest = req.method === 'OPTIONS' && isCorsRequest;
      
      // Track response completion
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        const isError = res.statusCode >= 400;
        
        this.recordRequest(responseTime, isError, isCorsRequest, isPreflightRequest);
        
        // Log slow requests
        if (responseTime > this.SLOW_REQUEST_THRESHOLD) {
          console.warn(`🐌 Slow request: ${req.method} ${req.path} took ${responseTime}ms`);
        }
      });

      next();
    };
  }

  /**
   * Record request metrics
   */
  private recordRequest(
    responseTime: number, 
    isError: boolean, 
    isCorsRequest: boolean = false, 
    isPreflightRequest: boolean = false
  ): void {
    this.metrics.requestCount++;
    
    if (isError) {
      this.metrics.errorCount++;
      
      // Track CORS errors (cross-origin requests that failed)
      if (isCorsRequest) {
        this.metrics.corsErrors++;
      }
    }

    if (responseTime > this.SLOW_REQUEST_THRESHOLD) {
      this.metrics.slowRequests++;
    }

    // Track CORS-specific metrics
    if (isPreflightRequest) {
      this.metrics.corsPreflightRequests++;
    } else if (isCorsRequest) {
      this.metrics.corsCrossOriginRequests++;
    }

    // Store response time (with circular buffer)
    this.requestTimes.push(responseTime);
    if (this.requestTimes.length > this.MAX_STORED_TIMES) {
      this.requestTimes.shift();
    }

    // Recalculate average
    this.metrics.averageResponseTime = 
      this.requestTimes.reduce((sum, time) => sum + time, 0) / this.requestTimes.length;

    // Recalculate error rate
    this.metrics.errorRate = this.metrics.errorCount / Math.max(this.metrics.requestCount, 1);
  }

  /**
   * Get comprehensive system performance metrics
   */
  public getSystemMetrics() {
    const queueStats = messageQueue.getStats();

    return {
      timestamp: new Date(),
      api: {
        ...this.metrics,
        errorRate: this.metrics.errorCount / Math.max(this.metrics.requestCount, 1),
        slowRequestRate: this.metrics.slowRequests / Math.max(this.metrics.requestCount, 1)
      },
      messageQueue: queueStats,
      memory: {
        used: process.memoryUsage().heapUsed / (1024 * 1024), // MB
        total: process.memoryUsage().heapTotal / (1024 * 1024), // MB
        external: process.memoryUsage().external / (1024 * 1024), // MB
        rss: process.memoryUsage().rss / (1024 * 1024) // MB
      },
      system: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform
      }
    };
  }

  /**
   * Check if system is under high load
   */
  public isSystemUnderLoad(): boolean {
    const recentRequests = this.requestTimes.slice(-100); // Last 100 requests
    const avgRecentTime = recentRequests.reduce((sum, time) => sum + time, 0) / recentRequests.length;
    
    return (
      avgRecentTime > this.SLOW_REQUEST_THRESHOLD ||
      this.metrics.errorRate > 0.1 // More than 10% error rate
    );
  }

  /**
   * Reset metrics (for testing or periodic cleanup)
   */
  public reset(): void {
    this.metrics = {
      requestCount: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      errorCount: 0,
      errorRate: 0,
      lastChecked: new Date(),
      corsPreflightRequests: 0,
      corsCrossOriginRequests: 0,
      corsErrors: 0
    };
    this.requestTimes = [];
    console.log('📊 Performance metrics reset');
  }

  /**
   * Generate performance report for monitoring
   */
  public generateReport(): string {
    const metrics = this.getSystemMetrics();
    
    return `
🚀 Phozos Performance Report (${metrics.timestamp.toISOString()})

📊 API Performance:
  • Total Requests: ${metrics.api.requestCount}
  • Average Response Time: ${metrics.api.averageResponseTime.toFixed(2)}ms
  • Error Rate: ${(metrics.api.errorRate * 100).toFixed(2)}%
  • Slow Requests: ${metrics.api.slowRequests} (${(metrics.api.slowRequestRate * 100).toFixed(2)}%)

🌐 CORS Metrics:
  • Preflight Requests (OPTIONS): ${metrics.api.corsPreflightRequests}
  • Cross-Origin Requests: ${metrics.api.corsCrossOriginRequests}
  • CORS Errors: ${metrics.api.corsErrors}

📋 Message Queue Status:
  • Queue Size: ${metrics.messageQueue.queueSize || 0} messages
  • Processing: ${metrics.messageQueue.processing ? 'Yes' : 'No'}

💾 Memory Usage:
  • Heap Used: ${metrics.memory.used.toFixed(2)} MB
  • Heap Total: ${metrics.memory.total.toFixed(2)} MB
  • RSS: ${metrics.memory.rss.toFixed(2)} MB

⏱️ System Info:
  • Uptime: ${(metrics.system.uptime / 3600).toFixed(2)} hours
  • Platform: ${metrics.system.platform}
  • Node Version: ${metrics.system.nodeVersion}

${this.isSystemUnderLoad() ? '⚠️ SYSTEM UNDER HIGH LOAD' : '✅ System Performance Normal'}
    `.trim();
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();