import express, { Router, Response } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { requireAuth } from '../middleware/authentication';
import { asyncHandler } from '../middleware/error-handler';
import { webhookIpWhitelist, webhookRateLimit } from '../middleware/webhook-security';
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
// Raw body handling configured globally in server/index.ts
// Security: IP whitelist first, then rate limit, then handler
router.post('/webhook', webhookIpWhitelist, webhookRateLimit, asyncHandler((req: AuthenticatedRequest, res: Response) => 
  paymentController.handleWebhook(req, res)
));

router.post('/webhook/refund', webhookIpWhitelist, webhookRateLimit, asyncHandler((req: AuthenticatedRequest, res: Response) => 
  paymentController.handleRefundWebhook(req, res)
));

export default router;
