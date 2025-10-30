import { Response } from 'express';
import { BaseController } from './base.controller';
import { getService, TYPES } from '../services/container';
import { ICompanyProfileService } from '../services/domain/company-profile.service';
import { IForumService } from '../services/domain/forum.service';
import { IUserProfileService } from '../services/domain/user-profile.service';
import { AuthenticatedRequest } from '../types/auth';
import { z } from 'zod';

const updateProfileSchema = z.object({
  companyName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profilePicture: z.string().optional()
});

const getRecentPostsQuerySchema = z.object({
  limit: z.string().optional().refine(val => !val || Number.isFinite(Number(val)), {
    message: 'limit must be a valid number'
  }).transform(val => val ? Number(val) : 10)
});

/**
 * Company Profile Controller
 * 
 * Handles company/recruiter profile operations including statistics, posts, and profile updates.
 * Follows Phase 3 modularization standards:
 * - Thin controller (HTTP concerns only)
 * - Zod validation for all inputs
 * - Service layer delegation for business logic
 * - Standardized error handling
 * 
 * @class CompanyController
 * @extends {BaseController}
 */
export class CompanyController extends BaseController {
  /**
   * Get company statistics and metrics
   * 
   * @route GET /api/company/stats
   * @access Protected (Company users only)
   * @param {AuthenticatedRequest} req - Request with authenticated company user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns company statistics
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      
      const companyProfileService = getService<ICompanyProfileService>(TYPES.ICompanyProfileService);
      const stats = await companyProfileService.getCompanyStats(userId);
      
      return this.sendSuccess(res, stats);
    } catch (error) {
      return this.handleError(res, error, 'CompanyController.getStats');
    }
  }

  /**
   * Get recent forum posts by the company
   * 
   * @route GET /api/company/posts
   * @access Protected (Company users only)
   * @param {AuthenticatedRequest} req - Request with authenticated company user and optional limit query
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of company's recent forum posts
   * 
   * @example
   * // Request query:
   * // GET /api/company/posts?limit=10
   * 
   * @throws {422} Validation error if limit is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getPosts(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const { limit } = getRecentPostsQuerySchema.parse(req.query);
      
      const forumService = getService<IForumService>(TYPES.IForumService);
      const posts = await forumService.getPostsWithPagination(
        1,
        limit,
        { authorId: userId },
        userId
      );
      
      return this.sendSuccess(res, posts.data);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'CompanyController.getPosts');
    }
  }

  /**
   * Update company profile information
   * 
   * @route PUT /api/company/profile
   * @access Protected (Company users only)
   * @param {AuthenticatedRequest} req - Request with authenticated company user and profile data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated company profile
   * 
   * @example
   * // Request body:
   * {
   *   "companyName": "Tech Corp",
   *   "firstName": "John",
   *   "lastName": "Doe",
   *   "profilePicture": "https://example.com/photo.jpg"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const validatedData = updateProfileSchema.parse(req.body);
      const userProfileService = getService<IUserProfileService>(TYPES.IUserProfileService);
      const updated = await userProfileService.updateUserProfile(userId, validatedData);
      
      return this.sendSuccess(res, updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'CompanyController.updateProfile');
    }
  }
}

export const companyController = new CompanyController();
