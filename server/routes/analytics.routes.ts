import { Router, Response } from 'express';
import { adminController } from '../controllers/admin.controller';
import { requireAuth } from '../middleware/authentication';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';

const router = Router();

// Analytics dashboard for team members
router.get('/dashboard', requireAuth, asyncHandler((req: AuthenticatedRequest, res: Response) => 
  adminController.getAnalyticsDashboard(req, res)
));

export default router;
