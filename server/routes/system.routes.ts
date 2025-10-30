import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/authentication';
import { csrfProtection } from '../middleware/csrf';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';
import { systemController } from '../controllers/system.controller';

const router = Router();

// Public route for maintenance status
router.get('/maintenance-status', asyncHandler((req: Request, res: Response) => systemController.getMaintenanceStatus(req, res)));

// Admin routes
router.use(requireAuth);
router.use(requireAdmin);
router.post('/students/:studentId/bypass-cooling', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => systemController.bypassCooling(req, res)));

export default router;
