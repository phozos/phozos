import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/authentication';
import { csrfProtection } from '../middleware/csrf';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';
import { subscriptionController } from '../controllers/subscription.controller';

const router = Router();

// Public routes
router.get('/plans', asyncHandler((req: Request, res: Response) => subscriptionController.getPublicPlans(req, res)));
router.get('/plans/:id', asyncHandler((req: Request, res: Response) => subscriptionController.getPlanById(req, res)));
router.get('/status/:studentId', asyncHandler((req: Request, res: Response) => subscriptionController.getSubscriptionStatus(req, res)));

// Authenticated routes
router.use(requireAuth);
router.get('/user/subscription', asyncHandler((req: AuthenticatedRequest, res: Response) => subscriptionController.getUserSubscription(req, res)));
router.post('/user/subscribe', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => subscriptionController.subscribe(req, res)));

export default router;
