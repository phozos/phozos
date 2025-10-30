import { Router, Request, Response } from 'express';
import { universityController } from '../controllers/university.controller';
import { requireAuth, requireAdmin } from '../middleware/authentication';
import { csrfProtection } from '../middleware/csrf';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';

const router = Router();

// Public routes
router.get('/', asyncHandler((req: Request, res: Response) => universityController.getAllUniversities(req, res)));
router.get('/search', asyncHandler((req: Request, res: Response) => universityController.searchUniversities(req, res)));
router.get('/:id', asyncHandler((req: Request, res: Response) => universityController.getUniversityById(req, res)));
router.get('/:id/courses', asyncHandler((req: Request, res: Response) => universityController.getCoursesByUniversity(req, res)));

// Admin routes - require authentication and admin role
router.post('/', requireAuth, requireAdmin, csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => universityController.createUniversity(req, res)));
router.put('/:id', requireAuth, requireAdmin, csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => universityController.updateUniversity(req, res)));
router.delete('/:id', requireAuth, requireAdmin, csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => universityController.deleteUniversity(req, res)));

export default router;
