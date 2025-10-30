import { Response } from 'express';
import { BaseController } from './base.controller';
import { getService, TYPES } from '../services/container';
import { IUserProfileService } from '../services/domain/user-profile.service';
import { IAdminUserService } from '../services/domain/admin/user-admin.service';
import { AuthenticatedRequest } from '../types/auth';
import { z } from 'zod';

// Validation schemas
const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  profilePicture: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional()
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

const updateStudentProfileSchema = z.object({
  phone: z.string().optional(),
  dateOfBirth: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  currentEducationLevel: z.string().optional().nullable(),
  institutionName: z.string().optional().nullable(),
  gpa: z.union([z.number(), z.string()]).optional().nullable(),
  academicScoringType: z.string().optional().nullable(),
  testScores: z.record(z.any()).optional().nullable(),
  intendedMajor: z.string().optional().nullable(),
  preferredCountries: z.array(z.string()).optional(),
  destinationCountry: z.string().optional().nullable(),
  intakeYear: z.string().optional().nullable(),
  budgetRange: z.string().optional().nullable(),
  academicInterests: z.array(z.string()).optional(),
  extracurriculars: z.array(z.any()).optional(),
  workExperience: z.array(z.any()).optional(),
  familyInfo: z.record(z.any()).optional().nullable(),
  educationHistory: z.array(z.any()).optional(),
  notes: z.string().optional().nullable(),
  // Nested objects
  personalDetails: z.record(z.any()).optional().nullable(),
  academicDetails: z.record(z.any()).optional().nullable(),
  workDetails: z.record(z.any()).optional().nullable(),
  studyPreferences: z.record(z.any()).optional().nullable(),
  universityPreferences: z.record(z.any()).optional().nullable(),
  financialInfo: z.record(z.any()).optional().nullable(),
  visaHistory: z.record(z.any()).optional().nullable(),
  familyDetails: z.record(z.any()).optional().nullable(),
  additionalInfo: z.record(z.any()).optional().nullable()
});

/**
 * User Profile Controller
 * 
 * Handles user profile operations including retrieval, updates, and password management.
 * Follows Phase 3 modularization standards:
 * - Thin controller (HTTP concerns only)
 * - Zod validation for all inputs
 * - Service layer delegation for business logic
 * - Standardized error handling
 * 
 * @class UserController
 * @extends {BaseController}
 */
export class UserController extends BaseController {
  /**
   * Get the authenticated user's profile
   * 
   * @route GET /api/users/profile
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns user profile data
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const userProfileService = getService<IUserProfileService>(TYPES.IUserProfileService);
      const profile = await userProfileService.getUserProfile(userId);
      return this.sendSuccess(res, profile);
    } catch (error) {
      return this.handleError(res, error, 'UserController.getProfile');
    }
  }

  /**
   * Update the authenticated user's profile
   * 
   * @route PUT /api/users/profile
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user and profile update data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated profile
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
      return this.handleError(res, error, 'UserController.updateProfile');
    }
  }

  /**
   * Change the authenticated user's password
   * 
   * @route PUT /api/users/change-password
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user, old and new passwords
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns success message
   * 
   * @example
   * // Request body:
   * {
   *   "oldPassword": "CurrentPassword123",
   *   "newPassword": "NewSecurePassword456"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if old password is incorrect or user not authenticated
   * @throws {500} Internal server error
   */
  async changePassword(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const { oldPassword, newPassword } = changePasswordSchema.parse(req.body);
      
      const userProfileService = getService<IUserProfileService>(TYPES.IUserProfileService);
      await userProfileService.changePassword(userId, oldPassword, newPassword);
      return this.sendSuccess(res, { message: 'Password changed successfully' });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      if (error.message === 'INVALID_OLD_PASSWORD') {
        return this.sendError(res, 401, 'INVALID_OLD_PASSWORD', 'Current password is incorrect');
      }
      return this.handleError(res, error, 'UserController.changePassword');
    }
  }

  /**
   * Update student-specific profile information
   * 
   * @route PUT /api/users/student-profile
   * @access Protected (Students only)
   * @param {AuthenticatedRequest} req - Request with authenticated student user and academic data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated student profile
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async updateStudentProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const validatedData = updateStudentProfileSchema.parse(req.body);
      
      const userProfileService = getService<IUserProfileService>(TYPES.IUserProfileService);
      const updated = await userProfileService.updateStudentProfile(userId, validatedData as any);
      return this.sendSuccess(res, updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'UserController.updateStudentProfile');
    }
  }

  /**
   * Get all users in the system
   * 
   * @route GET /api/users
   * @access Admin
   * @param {AuthenticatedRequest} req - Request with authenticated admin user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of all users
   * 
   * @throws {401} Unauthorized if not admin
   * @throws {500} Internal server error
   */
  async getAllUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const adminUserService = getService<IAdminUserService>(TYPES.IAdminUserService);
      const users = await adminUserService.getAllUsers();
      return this.sendSuccess(res, users);
    } catch (error) {
      return this.handleError(res, error, 'UserController.getAllUsers');
    }
  }

  /**
   * Get all team/staff members
   * 
   * @route GET /api/users/team
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of team members
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getTeamMembers(req: AuthenticatedRequest, res: Response) {
    try {
      const adminUserService = getService<IAdminUserService>(TYPES.IAdminUserService);
      const teamMembers = await adminUserService.getStaffMembers();
      return this.sendSuccess(res, teamMembers);
    } catch (error) {
      return this.handleError(res, error, 'UserController.getTeamMembers');
    }
  }

}

export const userController = new UserController();
