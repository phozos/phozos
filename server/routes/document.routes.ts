import { Router, Response } from 'express';
import { documentController } from '../controllers/document.controller';
import { requireAuth } from '../middleware/authentication';
import { csrfProtection } from '../middleware/csrf';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

router.get('/', asyncHandler((req: AuthenticatedRequest, res: Response) => documentController.getDocuments(req, res)));
router.post('/', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => documentController.createDocument(req, res)));
router.delete('/:id', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => documentController.deleteDocument(req, res)));

export default router;
