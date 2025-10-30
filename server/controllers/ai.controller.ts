import { Response } from 'express';
import { BaseController } from './base.controller';
import { getService, TYPES } from '../services/container';
import { AuthenticatedRequest } from '../types/auth';
import { z } from 'zod';

const matchSchema = z.object({
  academicProfile: z.object({
    gpa: z.number().optional(),
    testScores: z.any().optional(),
    intendedMajor: z.string().optional()
  }).optional(),
  preferences: z.object({
    country: z.string().optional(),
    budgetRange: z.string().optional()
  }).optional()
});

/**
 * AI University Matching Controller
 * 
 * Handles AI-powered university matching and recommendations based on student profiles.
 * Follows Phase 3 modularization standards:
 * - Thin controller (HTTP concerns only)
 * - Zod validation for all inputs
 * - Service layer delegation for AI matching logic
 * - Standardized error handling
 * 
 * @class AIController
 * @extends {BaseController}
 */
export class AIController extends BaseController {
  /**
   * Generate university matches using AI
   * 
   * @route POST /api/ai/match
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with user ID and academic profile data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns AI-generated university matches
   * 
   * @example
   * // Request body:
   * {
   *   "academicProfile": {
   *     "gpa": 3.8,
   *     "testScores": { "SAT": 1450 },
   *     "intendedMajor": "Computer Science"
   *   },
   *   "preferences": {
   *     "country": "USA",
   *     "budgetRange": "30000-50000"
   *   }
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async createMatchRequest(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const validatedData = matchSchema.parse(req.body);
      
      const aiMatchingService = getService(TYPES.IAIMatchingService) as any;
      const matches = await aiMatchingService.generateMatches(userId);
      res.status(201);
      return this.sendSuccess(res, matches);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AIController.createMatchRequest');
    }
  }

  /**
   * Get existing university matches for the authenticated user
   * 
   * @route GET /api/ai/matches
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of previously generated university matches
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getMatches(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const aiMatchingService = getService(TYPES.IAIMatchingService) as any;
      const matches = await aiMatchingService.getMatches(userId);
      return this.sendSuccess(res, matches);
    } catch (error) {
      return this.handleError(res, error, 'AIController.getMatches');
    }
  }
}

export const aiController = new AIController();
