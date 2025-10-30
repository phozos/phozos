import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { getService, TYPES } from '../services/container';
import { IAuthService } from '../services/domain/auth.service';
import { IRegistrationService } from '../services/domain/registration.service';
import { AuthenticatedRequest } from '../types/auth';
import { z } from 'zod';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(1),
  captchaToken: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const teamLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const registerStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  teamRole: z.string().min(1),
  invitationToken: z.string().min(1)
});

/**
 * Authentication Controller
 * 
 * Handles all authentication-related operations including student and team member login/registration.
 * Follows Phase 3 modularization standards:
 * - Thin controller (HTTP concerns only)
 * - Zod validation for all inputs
 * - Service layer delegation for business logic
 * - Standardized error handling
 * 
 * @class AuthController
 * @extends {BaseController}
 */
export class AuthController extends BaseController {
  /**
   * Register a new student account
   * 
   * @route POST /api/auth/student-register
   * @access Public
   * @param {Request} req - Express request object containing registration data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns user data and authentication token
   * 
   * @example
   * // Request body:
   * {
   *   "email": "student@example.com",
   *   "password": "SecurePass123",
   *   "firstName": "John",
   *   "lastName": "Doe",
   *   "phone": "+1234567890"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {409} Conflict if email already exists
   */
  async registerStudent(req: Request, res: Response) {
    try {
      const validatedData = registerSchema.parse(req.body);

      const registrationService = getService<IRegistrationService>(TYPES.IRegistrationService);
      const result = await registrationService.registerStudentComplete(
        validatedData.email,
        validatedData.password,
        validatedData.firstName,
        validatedData.lastName,
        validatedData.phone
      );

      res.status(201);
      return this.sendSuccess(res, result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      if (error.message === 'EMAIL_ALREADY_EXISTS') {
        return this.sendError(res, 409, 'AUTH_EMAIL_EXISTS', 'An account with this email already exists');
      }
      if (error.message?.includes('Password must')) {
        return this.sendError(res, 400, 'VALIDATION_PASSWORD_STRENGTH', error.message);
      }
      if (error.message?.includes('email')) {
        return this.sendError(res, 400, 'VALIDATION_EMAIL_DISPOSABLE', error.message);
      }
      
      return this.handleError(res, error, 'AuthController.registerStudent');
    }
  }

  /**
   * Authenticate a student and return session token
   * 
   * @route POST /api/auth/student-login
   * @access Public
   * @param {Request} req - Express request object containing login credentials
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns user data and authentication token
   * 
   * @example
   * // Request body:
   * {
   *   "email": "student@example.com",
   *   "password": "SecurePass123"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if credentials are invalid
   */
  async loginStudent(req: Request, res: Response) {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const authService = getService<IAuthService>(TYPES.IAuthService);
      const result = await authService.loginStudentComplete(email, password);

      return this.sendSuccess(res, result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      
      return this.handleError(res, error, 'AuthController.loginStudent');
    }
  }

  /**
   * Authenticate a team member (counselor/staff) and return session token
   * 
   * @route POST /api/auth/team-login
   * @access Public
   * @param {Request} req - Express request object containing login credentials
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns team member data and authentication token
   * 
   * @example
   * // Request body:
   * {
   *   "email": "counselor@edupath.com",
   *   "password": "SecurePass123"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if credentials are invalid
   */
  async loginTeam(req: Request, res: Response) {
    try {
      const { email, password } = teamLoginSchema.parse(req.body);

      const authService = getService<IAuthService>(TYPES.IAuthService);
      const result = await authService.loginTeamComplete(email, password);

      return this.sendSuccess(res, result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      
      return this.handleError(res, error, 'AuthController.loginTeam');
    }
  }

  /**
   * Get current authenticated user information
   * 
   * @route GET /api/auth/me
   * @access Protected (requires authentication)
   * @param {AuthenticatedRequest} req - Express request object with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns sanitized user data (without password)
   * 
   * @throws {401} Unauthorized if user is not authenticated
   */
  async me(req: AuthenticatedRequest, res: Response) {
    try {
      const sanitizedUser = this.sanitizeUser(req.user);
      return this.sendSuccess(res, sanitizedUser);
    } catch (error) {
      return this.handleError(res, error, 'AuthController.me');
    }
  }

  /**
   * Logout current user (client-side token removal for JWT)
   * 
   * @route POST /api/auth/logout
   * @access Protected (requires authentication)
   * @param {AuthenticatedRequest} req - Express request object with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns success message
   * 
   * @note With JWT tokens, logout is handled client-side by removing the token
   */
  async logout(req: AuthenticatedRequest, res: Response) {
    try {
      // With JWT tokens, logout is handled client-side by removing the token
      return this.sendSuccess(res, { message: 'Logged out successfully' });
    } catch (error) {
      return this.handleError(res, error, 'AuthController.logout');
    }
  }

  /**
   * Get team login visibility setting (whether team login should be shown on login page)
   * 
   * @route GET /api/auth/team-login-visibility
   * @access Public
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns visibility status
   * 
   * @example
   * // Response:
   * {
   *   "success": true,
   *   "data": {
   *     "visible": true
   *   }
   * }
   */
  async getTeamLoginVisibility(req: Request, res: Response) {
    try {
      const authService = getService<IAuthService>(TYPES.IAuthService);
      const result = await authService.getTeamLoginVisibilityStatus();
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.handleError(res, error, 'AuthController.getTeamLoginVisibility');
    }
  }

  /**
   * View staff invitation link details
   * 
   * @route GET /api/staff-invite/:token
   * @access Public
   * @param {Request} req - Express request object with token parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns invitation details
   * 
   * @note Does not record usage - usage tracking happens only on actual registration
   */
  async viewStaffInvite(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const { adminStaffInvitationService } = await import('../services/domain/admin');
      
      const invitationLink = await adminStaffInvitationService.getStaffInviteInfo(token);
      
      const protocol = req.protocol;
      const host = req.get('host');
      
      return this.sendSuccess(res, {
        id: invitationLink.id,
        token: invitationLink.token,
        url: `${protocol}://${host}/auth/staff-invite/${invitationLink.token}`,
        createdAt: invitationLink.createdAt
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'INVITATION_NOT_FOUND') {
        return this.sendError(res, 404, 'INVITATION_NOT_FOUND', 'Invalid or expired invitation link');
      }
      return this.handleError(res, error, 'AuthController.viewStaffInvite');
    }
  }

  /**
   * Register staff member via invitation link
   * 
   * @route POST /api/auth/register-staff
   * @access Public (requires valid invitation token)
   * @param {Request} req - Express request object containing registration data and invitation token
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns success message and user data
   */
  async registerStaff(req: Request, res: Response) {
    try {
      const { email, password, firstName, lastName, teamRole, invitationToken } = registerStaffSchema.parse(req.body);
      
      const registrationService = getService<IRegistrationService>(TYPES.IRegistrationService);
      const result = await registrationService.registerStaffWithInvite({
        email,
        password,
        firstName,
        lastName,
        teamRole,
        invitationToken
      });
      
      return this.sendSuccess(res, {
        message: 'Staff account created successfully',
        user: result.user
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      if (error instanceof Error) {
        if (error.message === 'INVALID_INVITATION_TOKEN') {
          return this.sendError(res, 400, 'INVALID_INVITATION_TOKEN', 'Invalid or expired invitation token');
        }
        if (error.message === 'USER_ALREADY_EXISTS') {
          return this.sendError(res, 400, 'USER_ALREADY_EXISTS', 'User already exists with this email');
        }
      }
      return this.handleError(res, error, 'AuthController.registerStaff');
    }
  }
}

export const authController = new AuthController();
