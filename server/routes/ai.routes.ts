import { Router, Response } from 'express';
import { requireAuth } from '../middleware/authentication';
import { csrfProtection } from '../middleware/csrf';
import { aiController } from '../controllers/ai.controller';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

router.post('/match', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => aiController.matchUniversities(req, res)));
router.get('/matches', asyncHandler((req: AuthenticatedRequest, res: Response) => aiController.getMatches(req, res)));

export default router;
