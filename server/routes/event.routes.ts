import { Router, Response } from 'express';
import { eventController } from '../controllers/event.controller';
import { requireAuth, requireAdmin } from '../middleware/authentication';
import { csrfProtection } from '../middleware/csrf';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

router.get('/', asyncHandler((req: AuthenticatedRequest, res: Response) => eventController.getEvents(req, res)));
router.get('/user/registrations', asyncHandler((req: AuthenticatedRequest, res: Response) => eventController.getUserRegistrations(req, res)));

// Admin only routes
router.post('/', requireAdmin, csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => eventController.createEvent(req, res)));

// Event registration (user)
router.post('/:id/register', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => eventController.registerForEvent(req, res)));
router.delete('/:id/register', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => eventController.unregisterFromEvent(req, res)));

export default router;
