/**
 * Production Monitoring and Alerts for API Compliance
 * 
 * Monitors API format compliance and alerts if dev features
 * accidentally activate in production.
 */

import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { featuresConfig, appConfig } from '../config';

interface MonitoringMetrics {
  totalRequests: number;
  legacyFormatDetected: number;
  devFeatureAccess: number;
  errorResponses: number;
  lastReset: Date;
}

class ProductionMonitor {
  private metrics: MonitoringMetrics = {
    totalRequests: 0,
    legacyFormatDetected: 0,
    devFeatureAccess: 0,
    errorResponses: 0,
    lastReset: new Date()
  };

  private alerts: Array<{
    timestamp: Date;
    type: 'legacy_format' | 'dev_feature' | 'error_spike';
    message: string;
    details: any;
  }> = [];

  track(type: 'request' | 'legacy_format' | 'dev_feature' | 'error', details?: any) {
    this.metrics.totalRequests++;
    
    switch (type) {
      case 'legacy_format':
        this.metrics.legacyFormatDetected++;
        this.alert('legacy_format', 'Legacy API format detected in production', details);
        break;
      case 'dev_feature':
        this.metrics.devFeatureAccess++;
        this.alert('dev_feature', 'Development feature accessed in production', details);
        break;
      case 'error':
        this.metrics.errorResponses++;
        if (this.isErrorSpike()) {
          this.alert('error_spike', 'Error response spike detected', { 
            current: this.metrics.errorResponses, 
            total: this.metrics.totalRequests 
          });
        }
        break;
    }
  }

  private isErrorSpike(): boolean {
    const errorRate = this.metrics.errorResponses / this.metrics.totalRequests;
    return errorRate > 0.1 && this.metrics.totalRequests > 100; // > 10% error rate
  }

  private alert(type: string, message: string, details: any) {
    const alert = {
      timestamp: new Date(),
      type: type as any,
      message,
      details
    };

    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Log critical alerts
    if (featuresConfig.MONITORING_ENABLED) {
      console.error(`🚨 PRODUCTION ALERT: ${message}`, details);
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.lastReset.getTime(),
      errorRate: this.metrics.totalRequests > 0 ? 
        (this.metrics.errorResponses / this.metrics.totalRequests * 100).toFixed(2) + '%' : '0%'
    };
  }

  getAlerts() {
    return this.alerts.slice(-50); // Last 50 alerts
  }

  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      legacyFormatDetected: 0,
      devFeatureAccess: 0,
      errorResponses: 0,
      lastReset: new Date()
    };
  }
}

// Global monitor instance
export const productionMonitor = new ProductionMonitor();

/**
 * Middleware to track API format compliance
 */
export function trackApiCompliance(req: Request, res: Response, next: NextFunction) {
  // Only monitor when monitoring is enabled
  if (!featuresConfig.MONITORING_ENABLED) {
    return next();
  }

  productionMonitor.track('request');

  // Check for dev feature access
  if (req.path.startsWith('/api/dev/')) {
    productionMonitor.track('dev_feature', { path: req.path, method: req.method });
  }

  // Store original json method to detect legacy format
  const originalJson = res.json;
  
  res.json = function(data: any) {
    // Check if response follows new API format
    const isNewFormat = data && typeof data === 'object' && 
                       'success' in data && 'meta' in data;
    
    if (!isNewFormat) {
      productionMonitor.track('legacy_format', { 
        path: req.path, 
        method: req.method, 
        responseType: typeof data 
      });
    }

    // Track errors
    if (res.statusCode >= 400) {
      productionMonitor.track('error', { 
        status: res.statusCode, 
        path: req.path 
      });
    }

    return originalJson.call(this, data);
  };

  next();
}

/**
 * Endpoint to get production monitoring report
 */
export function getProductionReport(req: Request, res: Response) {
  // Admin only when compliance reporting is enabled
  if (featuresConfig.COMPLIANCE_REPORT_ENABLED && 
      (!req.user || (req.user as any).teamRole !== 'admin')) {
    return sendError(res, 403, 'ACCESS_DENIED', 'Admin access required');
  }

  const metrics = productionMonitor.getMetrics();
  const alerts = productionMonitor.getAlerts();

  res.json({
    success: true,
    data: {
      metrics,
      alerts,
      status: alerts.length > 0 ? 'issues_detected' : 'healthy',
      recommendations: generateRecommendations(metrics, alerts)
    },
    meta: {
      timestamp: new Date().toISOString(),
      environment: appConfig.NODE_ENV
    }
  });
}

function generateRecommendations(metrics: any, alerts: any[]): string[] {
  const recommendations: string[] = [];

  if (metrics.legacyFormatDetected > 0) {
    recommendations.push('Legacy API format detected - migrate remaining endpoints to standardized format');
  }

  if (metrics.devFeatureAccess > 0) {
    recommendations.push('Development features accessed in production - strengthen environment checks');
  }

  if (parseFloat(metrics.errorRate) > 5) {
    recommendations.push('High error rate detected - investigate server issues');
  }

  if (recommendations.length === 0) {
    recommendations.push('API compliance is excellent - no issues detected');
  }

  return recommendations;
}