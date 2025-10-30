import { Router, Request, Response } from 'express';
import { applicationController } from '../controllers/application.controller';
import { requireAuth, requireAdmin, requireTeamMember } from '../middleware/authentication';
import { csrfProtection } from '../middleware/csrf';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Student routes
router.get('/my-applications', asyncHandler((req: AuthenticatedRequest, res: Response) => applicationController.getMyApplications(req, res)));
router.post('/', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => applicationController.createApplication(req, res)));

// Shared routes (with appropriate access control enforced at controller level if needed)
router.get('/:id', asyncHandler((req: Request, res: Response) => applicationController.getApplicationById(req, res)));
router.put('/:id', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => applicationController.updateApplication(req, res)));
router.patch('/:id/status', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => applicationController.updateApplicationStatus(req, res)));
router.delete('/:id', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => applicationController.deleteApplication(req, res)));

// Admin/Counselor routes - require team member or admin access
router.get('/user/:userId', requireTeamMember, asyncHandler((req: AuthenticatedRequest, res: Response) => applicationController.getApplicationsByUser(req, res)));
router.get('/status/:status', requireTeamMember, asyncHandler((req: AuthenticatedRequest, res: Response) => applicationController.getApplicationsByStatus(req, res)));
router.get('/university/:universityId', requireAdmin, asyncHandler((req: AuthenticatedRequest, res: Response) => applicationController.getApplicationsByUniversity(req, res)));

export default router;
