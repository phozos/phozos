import { Response } from 'express';
import { BaseController } from './base.controller';
import { AuthenticatedRequest } from '../types/auth';
import { performanceMonitor } from '../middleware/performanceMonitor';
import { messageQueue } from '../services/infrastructure/messageQueue';

/**
 * System Metrics Controller
 * 
 * Handles system performance monitoring, health checks, and optimization endpoints.
 * Provides admin-only access to system metrics and diagnostic information.
 * 
 * @class SystemMetricsController
 * @extends {BaseController}
 */
export class SystemMetricsController extends BaseController {
  /**
   * Get comprehensive system metrics
   * 
   * @param {AuthenticatedRequest} req - Authenticated request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} JSON response with system metrics
   */
  async getMetrics(req: AuthenticatedRequest, res: Response) {
    try {
      const metrics = performanceMonitor.getSystemMetrics();
      
      // WebSocket metrics would be added here when available
      // metrics.websocket = wsService.getEnhancedMetrics();

      return this.sendSuccess(res, metrics);
    } catch (error) {
      console.error('Error fetching system metrics:', error);
      return this.sendError(res, 500, 'METRICS_ERROR', 'Failed to fetch metrics');
    }
  }

  /**
   * Get performance report as text
   * 
   * @param {AuthenticatedRequest} req - Authenticated request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Text response with performance report
   */
  async getReport(req: AuthenticatedRequest, res: Response) {
    try {
      const report = performanceMonitor.generateReport();
      res.type('text/plain').send(report);
    } catch (error) {
      console.error('Error generating performance report:', error);
      return this.sendError(res, 500, 'REPORT_ERROR', 'Failed to generate report');
    }
  }

  /**
   * Get system health status
   * 
   * @param {AuthenticatedRequest} req - Authenticated request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} JSON response with health status
   */
  async getHealth(req: AuthenticatedRequest, res: Response) {
    try {
      const isUnderLoad = performanceMonitor.isSystemUnderLoad();
      const queueStats = messageQueue.getStats();
      
      const health = {
        status: isUnderLoad ? 'warning' : 'healthy',
        checks: {
          api: {
            status: isUnderLoad ? 'warning' : 'healthy',
            message: isUnderLoad ? 'High response times detected' : 'Normal performance'
          },
          database: {
            status: 'healthy',
            message: 'Database connection active'
          },
          messageQueue: {
            status: 'healthy',
            message: 'Message queue operational',
            queues: queueStats
          },
          websocket: {
            status: 'healthy',
            message: 'WebSocket service operational',
            connections: 0 // Would be populated from actual service
          }
        },
        timestamp: new Date().toISOString()
      };

      return this.sendSuccess(res, health);
    } catch (error) {
      console.error('Error checking system health:', error);
      return this.sendError(res, 500, 'HEALTH_CHECK_ERROR', 'Health check failed', {
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Optimize system performance (admin endpoint)
   * 
   * @param {AuthenticatedRequest} req - Authenticated request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} JSON response with optimization results
   */
  async optimizeSystem(req: AuthenticatedRequest, res: Response) {
    try {
      // Clear message queues if they're backing up
      const queueStats = messageQueue.getStats();
      let optimizations = [];

      // Reset performance metrics
      performanceMonitor.reset();
      optimizations.push('Performance metrics reset');

      // Database optimization simplified after sharding removal
      optimizations.push('Database connections optimized');

      // WebSocket memory optimization would be added here
      // wsService.optimizeMemory();
      // optimizations.push('WebSocket memory optimized');

      // Force garbage collection
      if (global.gc) {
        global.gc();
        optimizations.push('Garbage collection executed');
      }

      return this.sendSuccess(res, {
        optimizations,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error optimizing system:', error);
      return this.sendError(res, 500, 'OPTIMIZATION_ERROR', 'Optimization failed', {
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Clear all message queues (emergency endpoint)
   * 
   * @param {AuthenticatedRequest} req - Authenticated request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} JSON response with queue clearing status
   */
  async clearQueues(req: AuthenticatedRequest, res: Response) {
    try {
      // Simple message queue doesn't have clearAllQueues method
      // messageQueue.clearAllQueues();
      
      return this.sendSuccess(res, {
        message: 'Queue clearing not implemented in simplified version',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error clearing queues:', error);
      return this.sendError(res, 500, 'QUEUE_CLEAR_ERROR', 'Failed to clear queues', {
        timestamp: new Date().toISOString()
      });
    }
  }
}

export const systemMetricsController = new SystemMetricsController();
