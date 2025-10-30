import { Router, Response } from 'express';
import { requireAdmin } from '../middleware/authentication';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';
import { systemMetricsController } from '../controllers/systemMetrics.controller';
import { csrfProtection } from '../middleware/csrf';

const router = Router();

/**
 * Get comprehensive system metrics
 */
router.get('/metrics', requireAdmin, asyncHandler((req: AuthenticatedRequest, res: Response) => 
  systemMetricsController.getMetrics(req, res)
));

/**
 * Get performance report as text
 */
router.get('/report', requireAdmin, asyncHandler((req: AuthenticatedRequest, res: Response) => 
  systemMetricsController.getReport(req, res)
));

/**
 * Get system health status
 */
router.get('/health', requireAdmin, asyncHandler((req: AuthenticatedRequest, res: Response) => 
  systemMetricsController.getHealth(req, res)
));

/**
 * Optimize system performance (admin endpoint)
 */
router.post('/optimize', requireAdmin, csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => 
  systemMetricsController.optimizeSystem(req, res)
));

/**
 * Clear all message queues (emergency endpoint)
 */
router.post('/clear-queues', requireAdmin, csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => 
  systemMetricsController.clearQueues(req, res)
));

export default router;
