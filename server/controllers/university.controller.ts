import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { getService, TYPES } from '../services/container';
import { IUniversityService } from '../services/domain/university.service';
import { AuthenticatedRequest } from '../types/auth';
import { z } from 'zod';

// Validation schemas
const createUniversitySchema = z.object({
  name: z.string().min(1),
  country: z.string().min(1),
  city: z.string().min(1),
  description: z.string().optional(),
  ranking: z.object({
    world: z.number().optional(),
    national: z.number().optional(),
    subject: z.record(z.number()).optional()
  }).optional().nullable(),
  worldRanking: z.number().optional().nullable(),
  tuitionFee: z.number().optional().nullable(),
  specialization: z.string().optional().nullable(),
  degreeLevels: z.array(z.string()).optional(),
  logo: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  applicationDeadline: z.string().optional().nullable(),
  tier: z.enum(['general', 'top500', 'top200', 'top100', 'ivy_league']).optional().nullable(),
  isActive: z.boolean().optional()
});

const updateUniversitySchema = createUniversitySchema.partial();

const getAllUniversitiesQuerySchema = z.object({
  country: z.string().optional(),
  city: z.string().optional(),
  tier: z.enum(['general', 'top500', 'top200', 'top100', 'ivy_league']).optional(),
  minTuition: z.string().optional().refine(val => !val || Number.isFinite(Number(val)), {
    message: 'minTuition must be a valid number'
  }).transform(val => val ? Number(val) : undefined),
  maxTuition: z.string().optional().refine(val => !val || Number.isFinite(Number(val)), {
    message: 'maxTuition must be a valid number'
  }).transform(val => val ? Number(val) : undefined),
  specialization: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined)
});

const searchUniversitiesQuerySchema = z.object({
  query: z.string().min(1),
  country: z.string().optional(),
  city: z.string().optional(),
  tier: z.enum(['general', 'top500', 'top200', 'top100', 'ivy_league']).optional(),
  minTuition: z.string().optional().refine(val => !val || Number.isFinite(Number(val)), {
    message: 'minTuition must be a valid number'
  }).transform(val => val ? Number(val) : undefined),
  maxTuition: z.string().optional().refine(val => !val || Number.isFinite(Number(val)), {
    message: 'maxTuition must be a valid number'
  }).transform(val => val ? Number(val) : undefined)
});

/**
 * University Controller
 * 
 * Handles university management including CRUD operations, search, and filtering.
 * Follows Phase 3 modularization standards:
 * - Thin controller (HTTP concerns only)
 * - Zod validation for all inputs
 * - Service layer delegation for business logic
 * - Standardized error handling
 * 
 * @class UniversityController
 * @extends {BaseController}
 */
export class UniversityController extends BaseController {
  /**
   * Get all universities with optional filters
   * 
   * @route GET /api/universities
   * @access Public
   * @param {Request} req - Express request object with optional query filters
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns filtered list of universities
   * 
   * @example
   * // Request query:
   * // GET /api/universities?country=USA&tier=top100&minTuition=20000&maxTuition=50000
   * 
   * @throws {422} Validation error if query parameters are invalid
   * @throws {500} Internal server error
   */
  async getAllUniversities(req: Request, res: Response) {
    try {
      const validatedQuery = getAllUniversitiesQuerySchema.parse(req.query);
      const universityService = getService<IUniversityService>(TYPES.IUniversityService);
      const universities = await universityService.getAllUniversities(validatedQuery);
      return this.sendSuccess(res, universities);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid query parameters', error.errors);
      }
      return this.handleError(res, error, 'UniversityController.getAllUniversities');
    }
  }

  /**
   * Get a specific university by ID
   * 
   * @route GET /api/universities/:id
   * @access Public
   * @param {Request} req - Express request object with university ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns university details
   * 
   * @throws {404} Not found if university doesn't exist
   * @throws {500} Internal server error
   */
  async getUniversityById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const universityService = getService<IUniversityService>(TYPES.IUniversityService);
      const university = await universityService.getUniversityById(id);
      return this.sendSuccess(res, university);
    } catch (error) {
      return this.handleError(res, error, 'UniversityController.getUniversityById');
    }
  }

  /**
   * Search universities by name with optional filters
   * 
   * @route GET /api/universities/search
   * @access Public
   * @param {Request} req - Express request object with search query and optional filters
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns matching universities
   * 
   * @example
   * // Request query:
   * // GET /api/universities/search?query=Harvard&country=USA&tier=ivy_league
   * 
   * @throws {422} Validation error if query parameters are invalid
   * @throws {500} Internal server error
   */
  async searchUniversities(req: Request, res: Response) {
    try {
      const validatedQuery = searchUniversitiesQuerySchema.parse(req.query);
      const { query, ...filters } = validatedQuery;
      
      const universityService = getService<IUniversityService>(TYPES.IUniversityService);
      const universities = await universityService.searchUniversities(query, filters);
      return this.sendSuccess(res, universities);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid query parameters', error.errors);
      }
      return this.handleError(res, error, 'UniversityController.searchUniversities');
    }
  }

  /**
   * Create a new university
   * 
   * @route POST /api/universities
   * @access Admin
   * @param {AuthenticatedRequest} req - Request with admin user and university data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created university
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if not admin
   * @throws {500} Internal server error
   */
  async createUniversity(req: AuthenticatedRequest, res: Response) {
    try {
      const validatedData = createUniversitySchema.parse(req.body);
      const universityService = getService<IUniversityService>(TYPES.IUniversityService);
      const university = await universityService.createUniversity(validatedData);
      
      res.status(201);
      return this.sendSuccess(res, university);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'UniversityController.createUniversity');
    }
  }

  /**
   * Update an existing university
   * 
   * @route PUT /api/universities/:id
   * @access Admin
   * @param {AuthenticatedRequest} req - Request with admin user, university ID, and update data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated university
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {404} Not found if university doesn't exist
   * @throws {401} Unauthorized if not admin
   * @throws {500} Internal server error
   */
  async updateUniversity(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updateUniversitySchema.parse(req.body);
      
      const universityService = getService<IUniversityService>(TYPES.IUniversityService);
      const university = await universityService.updateUniversity(id, validatedData);
      return this.sendSuccess(res, university);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'UniversityController.updateUniversity');
    }
  }

  /**
   * Delete a university
   * 
   * @route DELETE /api/universities/:id
   * @access Admin
   * @param {AuthenticatedRequest} req - Request with admin user and university ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @throws {404} Not found if university doesn't exist
   * @throws {401} Unauthorized if not admin
   * @throws {500} Internal server error
   */
  async deleteUniversity(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const universityService = getService<IUniversityService>(TYPES.IUniversityService);
      await universityService.deleteUniversity(id);
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, 'UniversityController.deleteUniversity');
    }
  }

  /**
   * Get all courses offered by a specific university
   * 
   * @route GET /api/universities/:id/courses
   * @access Public
   * @param {Request} req - Express request object with university ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of courses for the university
   * 
   * @throws {404} Not found if university doesn't exist
   * @throws {500} Internal server error
   */
  async getCoursesByUniversity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const universityService = getService<IUniversityService>(TYPES.IUniversityService);
      const courses = await universityService.getCoursesByUniversity(id);
      return this.sendSuccess(res, courses);
    } catch (error) {
      return this.handleError(res, error, 'UniversityController.getCoursesByUniversity');
    }
  }
}

export const universityController = new UniversityController();
