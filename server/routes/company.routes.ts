import { Router, Response } from 'express';
import { requireAuth } from '../middleware/authentication';
import { csrfProtection } from '../middleware/csrf';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';
import { companyController } from '../controllers/company.controller';

const router = Router();

// Require company_profile user type
const requireCompany = (req: AuthenticatedRequest, res: Response, next: Function) => {
  if (req.user?.userType !== 'company_profile') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Access denied. Company profile required.' }
    });
  }
  next();
};

router.use(requireAuth);
router.use(requireCompany as any);

// Company routes
router.get('/stats', asyncHandler((req: AuthenticatedRequest, res: Response) => companyController.getStats(req, res)));
router.get('/recent-posts', asyncHandler((req: AuthenticatedRequest, res: Response) => companyController.getRecentPosts(req, res)));
router.patch('/profile', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => companyController.updateProfile(req, res)));

export default router;
