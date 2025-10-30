import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { getService, TYPES } from '../services/container';
import { ITestimonialService } from '../services/domain/testimonial.service';
import { z } from 'zod';

const getTestimonialsQuerySchema = z.object({
  limit: z.string().optional().refine(val => !val || Number.isFinite(Number(val)), {
    message: 'limit must be a valid number'
  }).transform(val => val ? Number(val) : 10)
});

/**
 * Testimonial Controller
 * 
 * Handles testimonial-related operations including fetching approved testimonials.
 * Follows Phase 3 modularization standards:
 * - Thin controller (HTTP concerns only)
 * - Zod validation for all inputs
 * - Service layer delegation for business logic
 * - Standardized error handling
 * 
 * @class TestimonialController
 * @extends {BaseController}
 */
export class TestimonialController extends BaseController {
  /**
   * Get approved testimonials with user information
   * 
   * @route GET /api/testimonials
   * @access Public
   * @param {Request} req - Express request object with optional limit query parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of approved testimonials with user details
   * 
   * @example
   * // Request query:
   * // GET /api/testimonials?limit=5
   * 
   * @throws {422} Validation error if limit is invalid
   * @throws {500} Internal server error
   */
  async getTestimonials(req: Request, res: Response) {
    try {
      const { limit } = getTestimonialsQuerySchema.parse(req.query);
      
      const testimonialService = getService<ITestimonialService>(TYPES.ITestimonialService);
      const results = await testimonialService.getApprovedTestimonialsWithUsers(limit);
      
      return this.sendSuccess(res, results);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'TestimonialController.getTestimonials');
    }
  }
}

export const testimonialController = new TestimonialController();
