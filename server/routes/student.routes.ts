import { Router, Response } from 'express';
import { adminController } from '../controllers/admin.controller';
import { requireAuth } from '../middleware/authentication';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';

const router = Router();

// All student routes require authentication
router.use(requireAuth);

// Student routes
router.get('/timeline/:studentId', asyncHandler((req: AuthenticatedRequest, res: Response) => 
  adminController.getStudentTimeline(req, res)
));

router.get('/status/:studentId', asyncHandler((req: AuthenticatedRequest, res: Response) => 
  adminController.getStudentStatus(req, res)
));

export default router;
