import { Router, Response } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { requireAuth } from '../middleware/authentication';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';

const router = Router();

// Protected routes (require authentication)
router.post('/create-order', requireAuth, asyncHandler((req: AuthenticatedRequest, res: Response) => 
  paymentController.createOrder(req, res)
));

router.post('/verify', requireAuth, asyncHandler((req: AuthenticatedRequest, res: Response) => 
  paymentController.verifyPayment(req, res)
));

// Public webhook endpoint (verified via signature)
router.post('/webhook', asyncHandler((req: AuthenticatedRequest, res: Response) => 
  paymentController.handleWebhook(req, res)
));

export default router;
