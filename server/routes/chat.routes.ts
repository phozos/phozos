import { Router, Response } from 'express';
import { chatController } from '../controllers/chat.controller';
import { requireAuth } from '../middleware/authentication';
import { csrfProtection } from '../middleware/csrf';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Student chat routes
router.get('/student', asyncHandler((req: AuthenticatedRequest, res: Response) => 
  chatController.getMessages(req, res)
));

router.post('/student', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => 
  chatController.createMessage(req, res)
));

// Message read status routes
router.put('/messages/:messageId/read', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => 
  chatController.updateMessageReadStatus(req, res)
));

router.put('/messages/bulk-read', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => 
  chatController.updateMessagesReadStatus(req, res)
));

export default router;
