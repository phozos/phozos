import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { getService, TYPES } from '../services/container';
import { IApplicationService } from '../services/domain/application.service';
import { AuthenticatedRequest } from '../types/auth';
import { z } from 'zod';

// Validation schemas
const createApplicationSchema = z.object({
  universityId: z.string().min(1),
  courseId: z.string().min(1),
  status: z.string().optional(),
  notes: z.string().optional().nullable()
});

const updateApplicationSchema = z.object({
  status: z.string().optional(),
  notes: z.string().optional().nullable(),
  submittedAt: z.string().optional().nullable(),
  decidedAt: z.string().optional().nullable()
});

const updateStatusSchema = z.object({
  status: z.string().min(1)
});

/**
 * Application Controller
 * 
 * Handles university application management including creation, tracking, and status updates.
 * Follows Phase 3 modularization standards:
 * - Thin controller (HTTP concerns only)
 * - Zod validation for all inputs
 * - Service layer delegation for business logic
 * - Standardized error handling
 * 
 * @class ApplicationController
 * @extends {BaseController}
 */
export class ApplicationController extends BaseController {
  /**
   * Get all applications for the authenticated user
   * 
   * @route GET /api/applications/my-applications
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of user's applications
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getMyApplications(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const applicationService = getService<IApplicationService>(TYPES.IApplicationService);
      const applications = await applicationService.getApplicationsByUser(userId);
      return this.sendSuccess(res, applications);
    } catch (error) {
      return this.handleError(res, error, 'ApplicationController.getMyApplications');
    }
  }

  /**
   * Get applications for a specific user by ID
   * 
   * @route GET /api/applications/user/:userId
   * @access Protected (Admin/Counselor only)
   * @param {AuthenticatedRequest} req - Request with authenticated admin/counselor and user ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of applications for the specified user
   * 
   * @throws {401} Unauthorized if not admin/counselor
   * @throws {500} Internal server error
   */
  async getApplicationsByUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      const applicationService = getService<IApplicationService>(TYPES.IApplicationService);
      const applications = await applicationService.getApplicationsByUser(userId);
      return this.sendSuccess(res, applications);
    } catch (error) {
      return this.handleError(res, error, 'ApplicationController.getApplicationsByUser');
    }
  }

  /**
   * Get a specific application by ID
   * 
   * @route GET /api/applications/:id
   * @access Public
   * @param {Request} req - Express request object with application ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns application details
   * 
   * @throws {404} Not found if application doesn't exist
   * @throws {500} Internal server error
   */
  async getApplicationById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const applicationService = getService<IApplicationService>(TYPES.IApplicationService);
      const application = await applicationService.getApplicationById(id);
      return this.sendSuccess(res, application);
    } catch (error) {
      return this.handleError(res, error, 'ApplicationController.getApplicationById');
    }
  }

  /**
   * Get all applications filtered by status
   * 
   * @route GET /api/applications/status/:status
   * @access Protected (Admin/Counselor only)
   * @param {AuthenticatedRequest} req - Request with authenticated admin/counselor and status parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of applications with the specified status
   * 
   * @throws {401} Unauthorized if not admin/counselor
   * @throws {500} Internal server error
   */
  async getApplicationsByStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { status } = req.params;
      const applicationService = getService<IApplicationService>(TYPES.IApplicationService);
      const applications = await applicationService.getApplicationsByStatus(status);
      return this.sendSuccess(res, applications);
    } catch (error) {
      return this.handleError(res, error, 'ApplicationController.getApplicationsByStatus');
    }
  }

  /**
   * Get all applications for a specific university
   * 
   * @route GET /api/applications/university/:universityId
   * @access Admin
   * @param {AuthenticatedRequest} req - Request with authenticated admin and university ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of applications for the specified university
   * 
   * @throws {401} Unauthorized if not admin
   * @throws {500} Internal server error
   */
  async getApplicationsByUniversity(req: AuthenticatedRequest, res: Response) {
    try {
      const { universityId } = req.params;
      const applicationService = getService<IApplicationService>(TYPES.IApplicationService);
      const applications = await applicationService.getApplicationsByUniversity(universityId);
      return this.sendSuccess(res, applications);
    } catch (error) {
      return this.handleError(res, error, 'ApplicationController.getApplicationsByUniversity');
    }
  }

  /**
   * Create a new university application
   * 
   * @route POST /api/applications
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user and application data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created application
   * 
   * @example
   * // Request body:
   * {
   *   "universityId": "uni-123",
   *   "courseId": "course-456",
   *   "notes": "Applying for Fall 2025 intake"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {409} Conflict if duplicate application exists
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async createApplication(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const validatedData = createApplicationSchema.parse(req.body);

      const applicationService = getService<IApplicationService>(TYPES.IApplicationService);
      const application = await applicationService.createApplication({
        userId,
        ...validatedData
      } as any);

      res.status(201);
      return this.sendSuccess(res, application);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      if (error.message === 'DUPLICATE_APPLICATION') {
        return this.sendError(res, 409, 'DUPLICATE_APPLICATION', 'You have already applied to this course');
      }
      return this.handleError(res, error, 'ApplicationController.createApplication');
    }
  }

  /**
   * Update an existing application
   * 
   * @route PUT /api/applications/:id
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user, application ID, and update data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated application
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {404} Not found if application doesn't exist
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async updateApplication(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updateApplicationSchema.parse(req.body);

      const applicationService = getService<IApplicationService>(TYPES.IApplicationService);
      const application = await applicationService.updateApplication(id, validatedData as any);
      return this.sendSuccess(res, application);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'ApplicationController.updateApplication');
    }
  }

  /**
   * Update the status of an application
   * 
   * @route PUT /api/applications/:id/status
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user, application ID, and new status
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated application with new status
   * 
   * @example
   * // Request body:
   * {
   *   "status": "accepted"
   * }
   * 
   * @throws {422} Validation error if status is invalid
   * @throws {404} Not found if application doesn't exist
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async updateApplicationStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = updateStatusSchema.parse(req.body);

      const applicationService = getService<IApplicationService>(TYPES.IApplicationService);
      const application = await applicationService.updateApplicationStatus(id, status);
      return this.sendSuccess(res, application);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'ApplicationController.updateApplicationStatus');
    }
  }

  /**
   * Delete an application
   * 
   * @route DELETE /api/applications/:id
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user and application ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @throws {404} Not found if application doesn't exist
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async deleteApplication(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const applicationService = getService<IApplicationService>(TYPES.IApplicationService);
      await applicationService.deleteApplication(id);
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, 'ApplicationController.deleteApplication');
    }
  }
}

export const applicationController = new ApplicationController();
