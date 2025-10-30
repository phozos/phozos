import { Router, Response } from 'express';
import { userController } from '../controllers/user.controller';
import { requireAuth, requireAdmin } from '../middleware/authentication';
import { csrfProtection } from '../middleware/csrf';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Get current user profile
router.get('/profile', asyncHandler((req: AuthenticatedRequest, res: Response) => userController.getProfile(req, res)));

// Update current user profile
router.put('/profile', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => userController.updateProfile(req, res)));

// Change password
router.post('/change-password', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => userController.changePassword(req, res)));

// Update student profile
router.put('/student-profile', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => userController.updateStudentProfile(req, res)));

// Admin routes
router.get('/all', requireAdmin, asyncHandler((req: AuthenticatedRequest, res: Response) => userController.getAllUsers(req, res)));
router.get('/team-members', requireAdmin, asyncHandler((req: AuthenticatedRequest, res: Response) => userController.getTeamMembers(req, res)));

export default router;
