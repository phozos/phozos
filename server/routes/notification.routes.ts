import { Router, Response } from 'express';
import { requireAuth } from '../middleware/authentication';
import { csrfProtection } from '../middleware/csrf';
import { notificationController } from '../controllers/notification.controller';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';

export function createNotificationRoutes(): Router {
  const router = Router();

  // All routes require authentication
  router.use(requireAuth);

  router.get('/', asyncHandler((req: AuthenticatedRequest, res: Response) => notificationController.getNotifications(req, res)));
  router.put('/:id/read', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => notificationController.updateReadStatus(req, res)));
  router.get('/unread-count', asyncHandler((req: AuthenticatedRequest, res: Response) => notificationController.getUnreadCount(req, res)));

  return router;
}

export default createNotificationRoutes;
