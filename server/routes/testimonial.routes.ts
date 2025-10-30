import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error-handler';
import { testimonialController } from '../controllers/testimonial.controller';

const router = Router();

// Public route
router.get('/', asyncHandler((req: Request, res: Response) => testimonialController.getTestimonials(req, res)));

export default router;
