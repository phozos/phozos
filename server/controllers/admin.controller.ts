import { Response } from 'express';
import { BaseController } from './base.controller';
import { getService, TYPES } from '../services/container';
import { IAdminUserService } from '../services/domain/admin/user-admin.service';
import { IAdminUniversityService } from '../services/domain/admin/university-admin.service';
import { IAdminStudentService } from '../services/domain/admin/student-admin.service';
import { IAdminCompanyService } from '../services/domain/admin/company-admin.service';
import { IAdminSecurityService } from '../services/domain/admin/security-admin.service';
import { IAdminTestimonialService } from '../services/domain/admin/testimonial-admin.service';
import { IAdminForumModerationService } from '../services/domain/admin/forum-moderation.service';
import { IAdminStaffInvitationService } from '../services/domain/admin/staff-invitation.service';
import { IAdminAnalyticsService } from '../services/domain/admin/analytics-admin.service';
import { IUserProfileService } from '../services/domain/user-profile.service';
import { IRegistrationService } from '../services/domain/registration.service';
import { ICompanyProfileService } from '../services/domain/company-profile.service';
import { IUniversityService } from '../services/domain/university.service';
import { ICounselorAssignmentService } from '../services/domain/counselor-assignment.service';
import { ICounselorDashboardService } from '../services/domain/counselor-dashboard.service';
import { ISubscriptionService } from '../services/domain/subscription.service';
import { IUserSubscriptionService } from '../services/domain/user-subscription.service';
import { IPaymentService } from '../services/domain/payment.service';
import { AuthenticatedRequest } from '../types/auth';
import { z } from 'zod';
import { 
  insertUserSchema, 
  insertUniversitySchema,
  insertSubscriptionPlanSchema 
} from '@shared/schema';
import { CreateStaffRequestSchema } from '@shared/api-contracts';
import { VALID_ACCOUNT_STATUSES } from '@shared/account-status';
import { AccountId, StudentProfileId, toAccountId, toStudentProfileId } from '@shared/types/branded-ids';
import { generateSampleCSV } from '../bulk-import';

// Validation schemas

const accountStatusToggleSchema = z.object({
  status: z.enum(['active', 'inactive', 'pending_approval', 'suspended', 'rejected'])
});

const createCompanyProfileSchema = z.object({
  email: z.string().email(),
  companyName: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  password: z.string().optional(),
  generatePassword: z.boolean().optional()
});

const updateSecuritySettingSchema = z.object({
  settingValue: z.string()
});

const resetPasswordSchema = z.object({
  userId: z.string()
});

const assignStudentSchema = z.object({
  studentId: z.string(),
  counselorId: z.string()
});

const updatePaymentSettingsSchema = z.object({
  apiKey: z.string().optional(),
  secretKey: z.string().optional(),
  webhookSecret: z.string().optional(),
  isEnabled: z.boolean().optional()
});

const updateCompanyProfileSchema = z.object({
  companyName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional()
});

const updateUniversityBodySchema = z.object({
  name: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  description: z.string().optional(),
  ranking: z.any().optional(),
  worldRanking: z.number().optional(),
  tuitionFee: z.number().optional(),
  specialization: z.string().optional(),
  degreeLevels: z.array(z.string()).optional(),
  logo: z.string().optional(),
  website: z.string().optional(),
  applicationDeadline: z.string().optional(),
  tier: z.enum(['general', 'top500', 'top200', 'top100', 'ivy_league']).optional(),
  acceptanceRate: z.string().optional()
});

const unassignStudentSchema = z.object({
  studentId: z.string()
});

const togglePaymentGatewaySchema = z.object({
  isActive: z.boolean().optional()
});

const updateSubscriptionPlanBodySchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  price: z.number().transform(val => val.toString()).optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional()
});

const updateStudentSubscriptionSchema = z.object({
  planId: z.string(),
  status: z.enum(['active', 'cancelled', 'expired', 'pending']).optional(),
  startedAt: z.string().transform(val => val ? new Date(val) : undefined).optional(),
  expiresAt: z.string().transform(val => val ? new Date(val) : null).optional().nullable()
});

const bulkImportUniversitiesSchema = z.object({
  universities: z.array(z.object({
    name: z.string(),
    country: z.string(),
    city: z.string().optional(),
    description: z.string().optional(),
    ranking: z.number().optional(),
    worldRanking: z.number().optional(),
    tuitionFee: z.number().optional(),
    specialization: z.string().optional(),
    degreeLevels: z.array(z.string()).optional(),
    logo: z.string().optional(),
    website: z.string().optional(),
    applicationDeadline: z.string().optional(),
    tier: z.enum(['general', 'top500', 'top200', 'top100', 'ivy_league']).optional(),
    acceptanceRate: z.string().optional()
  }))
});

/**
 * Admin Controller
 * 
 * Handles all administrative operations including system stats, user management, university management,
 * company profiles, security settings, subscription plans, and forum moderation.
 * Follows Phase 3 modularization standards:
 * - Thin controller (HTTP concerns only)
 * - Zod validation for all inputs
 * - Service layer delegation for business logic
 * - Standardized error handling
 * 
 * @class AdminController
 * @extends {BaseController}
 */
export class AdminController extends BaseController {
  /**
   * Get system-wide statistics and metrics
   * 
   * @route GET /api/admin/stats
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with admin user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns system statistics (users, universities, applications, etc.)
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getStats(req: AuthenticatedRequest, res: Response) {
    try {
      const adminAnalyticsService = getService<IAdminAnalyticsService>(TYPES.IAdminAnalyticsService);
      const stats = await adminAnalyticsService.getSystemStats();
      return this.sendSuccess(res, stats);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getStats');
    }
  }

  /**
   * Create a new team member (counselor or staff)
   * 
   * @route POST /api/admin/team-members
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with team member data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created team member data with temporary password
   * 
   * @example
   * // Request body:
   * {
   *   "email": "counselor@edupath.com",
   *   "firstName": "Jane",
   *   "lastName": "Smith",
   *   "teamRole": "counselor"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async createTeamMember(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = this.getUserId(req);
      const validatedData = CreateStaffRequestSchema.parse(req.body);
      
      const adminUserService = getService<IAdminUserService>(TYPES.IAdminUserService);
      const result = await adminUserService.createTeamMemberWithPassword(adminId, {
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        teamRole: validatedData.teamRole,
        department: validatedData.department
      });
      
      res.status(201);
      return this.sendSuccess(res, {
        ...result.user,
        temporaryPassword: result.temporaryPassword
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminController.createTeamMember');
    }
  }

  /**
   * Create a new company profile
   * 
   * @route POST /api/admin/company-profiles
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with company profile data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created company profile with credentials
   * 
   * @example
   * // Request body:
   * {
   *   "email": "company@example.com",
   *   "companyName": "Acme Corp",
   *   "firstName": "John",
   *   "lastName": "Doe",
   *   "generatePassword": true
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async createCompanyProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const validatedData = createCompanyProfileSchema.parse(req.body);

      const companyProfileService = getService<ICompanyProfileService>(TYPES.ICompanyProfileService);
      const result = await companyProfileService.createCompanyProfile({
        email: validatedData.email.toLowerCase(),
        password: validatedData.generatePassword ? undefined : validatedData.password,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        companyName: validatedData.companyName,
        userType: 'company_profile',
        teamRole: null,
        profilePicture: null
      });

      const adminCompanyService = getService<IAdminCompanyService>(TYPES.IAdminCompanyService);
      const response = adminCompanyService.formatCompanyProfileResponse(
        result.user,
        validatedData.companyName,
        result.temporaryPassword
      );

      res.status(201);
      return this.sendSuccess(res, response);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminController.createCompanyProfile');
    }
  }

  /**
   * Get all company profiles
   * 
   * @route GET /api/admin/company-profiles
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of company profiles
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getCompanyProfiles(req: AuthenticatedRequest, res: Response) {
    try {
      const adminCompanyService = getService<IAdminCompanyService>(TYPES.IAdminCompanyService);
      const profiles = await adminCompanyService.getCompanyProfiles();
      return this.sendSuccess(res, profiles);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getCompanyProfiles');
    }
  }

  /**
   * Update an existing company profile
   * 
   * @route PUT /api/admin/company-profiles/:id
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with company ID and update data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated company profile
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Company profile not found
   */
  async updateCompanyProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updateCompanyProfileSchema.parse(req.body);
      const adminCompanyService = getService<IAdminCompanyService>(TYPES.IAdminCompanyService);
      const updated = await adminCompanyService.updateCompanyProfile(id, validatedData);
      return this.sendSuccess(res, this.sanitizeUser(updated));
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminController.updateCompanyProfile');
    }
  }

  /**
   * Reset password for a company profile
   * 
   * @route POST /api/admin/company-profiles/:id/reset-password
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with company ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns new temporary password
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Company profile not found
   */
  async resetCompanyPassword(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const adminUser = this.getUser(req);
      
      const adminCompanyService = getService<IAdminCompanyService>(TYPES.IAdminCompanyService);
      const result = await adminCompanyService.resetCompanyPassword(id, adminUser.email);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.resetCompanyPassword');
    }
  }

  /**
   * Delete a company profile
   * 
   * @route DELETE /api/admin/company-profiles/:id
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with company ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Company profile not found
   */
  async deleteCompanyProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const adminUserService = getService<IAdminUserService>(TYPES.IAdminUserService);
      const success = await adminUserService.deleteUser(id);
      
      if (!success) {
        return this.sendError(res, 404, 'NOT_FOUND', 'Company profile not found');
      }
      
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.deleteCompanyProfile');
    }
  }

  /**
   * Toggle company profile account status
   * 
   * @route PUT /api/admin/company-profiles/:id/toggle-status
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with company ID and status
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated company profile data
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Company profile not found
   */
  async toggleCompanyStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = accountStatusToggleSchema.parse(req.body);
      
      const adminUserService = getService<IAdminUserService>(TYPES.IAdminUserService);
      const updated = await adminUserService.updateUserAccountStatus(id, status);
      return this.sendSuccess(res, this.sanitizeUser(updated));
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminController.toggleCompanyStatus');
    }
  }

  /**
   * Get all universities
   * 
   * @route GET /api/admin/universities
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of all universities
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getUniversities(req: AuthenticatedRequest, res: Response) {
    try {
      const universityService = getService<IUniversityService>(TYPES.IUniversityService);
      const universities = await universityService.getAllUniversities();
      return this.sendSuccess(res, universities);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getUniversities');
    }
  }

  /**
   * Create a new university
   * 
   * @route POST /api/admin/universities
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with university data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created university
   * 
   * @throws {422} Validation error if university data is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async createUniversity(req: AuthenticatedRequest, res: Response) {
    try {
      const universityData = insertUniversitySchema.parse(req.body);
      const universityService = getService<IUniversityService>(TYPES.IUniversityService);
      const university = await universityService.createUniversityWithNormalization(universityData);
      
      res.status(201);
      return this.sendSuccess(res, university);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid university data', error.errors);
      }
      return this.handleError(res, error, 'AdminController.createUniversity');
    }
  }

  /**
   * Update an existing university
   * 
   * @route PUT /api/admin/universities/:id
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with university ID and update data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated university
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} University not found
   */
  async updateUniversity(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updateUniversityBodySchema.parse(req.body);
      const universityService = getService<IUniversityService>(TYPES.IUniversityService);
      const updated = await universityService.updateUniversity(id, validatedData);
      return this.sendSuccess(res, updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminController.updateUniversity');
    }
  }

  /**
   * Delete a university
   * 
   * @route DELETE /api/admin/universities/:id
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with university ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} University not found
   */
  async deleteUniversity(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const universityService = getService<IUniversityService>(TYPES.IUniversityService);
      const success = await universityService.deleteUniversity(id);
      
      if (!success) {
        return this.sendError(res, 404, 'NOT_FOUND', 'University not found');
      }
      
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.deleteUniversity');
    }
  }

  /**
   * Get all students
   * 
   * @route GET /api/admin/students
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of all students
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getStudents(req: AuthenticatedRequest, res: Response) {
    try {
      const adminStudentService = getService<IAdminStudentService>(TYPES.IAdminStudentService);
      const students = await adminStudentService.getAllStudents();
      return this.sendSuccess(res, students);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getStudents');
    }
  }

  /**
   * Get detailed information for a specific student
   * 
   * @route GET /api/admin/students/:studentId
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with student ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns student profile data
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Student not found
   */
  async getStudentById(req: AuthenticatedRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const userProfileService = getService<IUserProfileService>(TYPES.IUserProfileService);
      const student = await userProfileService.getUserProfile(studentId);
      return this.sendSuccess(res, student);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getStudentById');
    }
  }

  /**
   * Reset password for a student
   * 
   * @route POST /api/admin/students/:studentId/reset-password
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with student ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns temporary password and email
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Student not found
   */
  async resetStudentPassword(req: AuthenticatedRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const userProfileService = getService<IUserProfileService>(TYPES.IUserProfileService);
      const student = await userProfileService.getUserById(studentId);
      
      if (!student) {
        return this.sendError(res, 404, 'NOT_FOUND', 'Student not found');
      }
      
      const { user, plainPassword } = await userProfileService.resetUserPassword(studentId);
      
      const adminUser = this.getUser(req);
      console.log(`🔐 Admin ${adminUser.email} reset password for student ${student.email}`);

      return this.sendSuccess(res, { 
        temporaryPassword: plainPassword,
        email: user.email 
      });
    } catch (error) {
      return this.handleError(res, error, 'AdminController.resetStudentPassword');
    }
  }

  /**
   * Toggle student account status
   * 
   * **IMPORTANT**: This endpoint expects a user account ID (userId), NOT a student profile ID.
   * The studentId parameter must be the user's account ID from the users table.
   * Use getStudentAccountId(student) helper to extract the correct ID from StudentWithUserDetails.
   * 
   * @route PUT /api/admin/students/:studentId/toggle-status
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with user account ID (userId) and status
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated student data
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Student not found (when userId doesn't exist)
   */
  async toggleStudentStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const { status } = accountStatusToggleSchema.parse(req.body);
      
      const accountId = toAccountId(studentId);
      
      const adminUserService = getService<IAdminUserService>(TYPES.IAdminUserService);
      const updated = await adminUserService.updateUserAccountStatus(accountId, status);
      return this.sendSuccess(res, this.sanitizeUser(updated));
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminController.toggleStudentStatus');
    }
  }

  /**
   * Toggle staff account status
   * 
   * @route PUT /api/admin/staff/:id/toggle-status
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with staff ID and status
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated staff data
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Staff member not found
   */
  async toggleStaffStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status } = accountStatusToggleSchema.parse(req.body);
      
      const adminUserService = getService<IAdminUserService>(TYPES.IAdminUserService);
      const updated = await adminUserService.updateUserAccountStatus(id, status);
      return this.sendSuccess(res, this.sanitizeUser(updated));
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminController.toggleStaffStatus');
    }
  }

  /**
   * Get all staff members
   * 
   * @route GET /api/admin/staff
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of all staff members
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getStaff(req: AuthenticatedRequest, res: Response) {
    try {
      const adminUserService = getService<IAdminUserService>(TYPES.IAdminUserService);
      const staff = await adminUserService.getStaffMembers();
      return this.sendSuccess(res, staff.map(u => this.sanitizeUser(u)));
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getStaff');
    }
  }

  /**
   * Create a new staff member
   * 
   * @route POST /api/admin/staff
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with staff member data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created staff member with temporary password
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async createStaff(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = this.getUserId(req);
      const validatedData = CreateStaffRequestSchema.parse(req.body);
      
      const adminUserService = getService<IAdminUserService>(TYPES.IAdminUserService);
      const result = await adminUserService.createTeamMemberWithPassword(adminId, {
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        teamRole: validatedData.teamRole,
        department: validatedData.department
      });
      
      res.status(201);
      return this.sendSuccess(res, {
        ...result.user,
        temporaryPassword: result.temporaryPassword
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminController.createStaff');
    }
  }

  /**
   * Get credentials for a specific staff member
   * 
   * @route GET /api/admin/staff/:id/credentials
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with staff ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns email and encrypted password status
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Staff member not found
   */
  async getStaffCredentials(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userProfileService = getService<IUserProfileService>(TYPES.IUserProfileService);
      const staff = await userProfileService.getUserById(id);
      
      if (!staff) {
        return this.sendError(res, 404, 'NOT_FOUND', 'Staff member not found');
      }
      
      return this.sendSuccess(res, {
        email: staff.email,
        temporaryPassword: staff.temporaryPassword ? '***encrypted***' : null
      });
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getStaffCredentials');
    }
  }

  /**
   * Reset password for a staff member
   * 
   * @route POST /api/admin/staff/:id/reset-password
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with staff ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns temporary password and email
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Staff member not found
   */
  async resetStaffPassword(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userProfileService = getService<IUserProfileService>(TYPES.IUserProfileService);
      const staff = await userProfileService.getUserById(id);
      
      if (!staff) {
        return this.sendError(res, 404, 'NOT_FOUND', 'Staff member not found');
      }
      
      const { user, plainPassword } = await userProfileService.resetUserPassword(id);
      
      const adminUser = this.getUser(req);
      console.log(`🔐 Admin ${adminUser.email} reset password for staff ${staff.email}`);

      return this.sendSuccess(res, { 
        temporaryPassword: plainPassword,
        email: user.email 
      });
    } catch (error) {
      return this.handleError(res, error, 'AdminController.resetStaffPassword');
    }
  }

  /**
   * Approve a staff member's account
   * 
   * @route PUT /api/admin/staff/:id/approve
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with staff ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated staff member with approved status
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Staff member not found
   */
  async approveStaff(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const adminUserService = getService<IAdminUserService>(TYPES.IAdminUserService);
      const updated = await adminUserService.updateUserAccountStatus(id, 'active');
      return this.sendSuccess(res, this.sanitizeUser(updated));
    } catch (error) {
      return this.handleError(res, error, 'AdminController.approveStaff');
    }
  }

  /**
   * Reject a staff member's account
   * 
   * @route PUT /api/admin/staff/:id/reject
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with staff ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated staff member with rejected status
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Staff member not found
   */
  async rejectStaff(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const adminUserService = getService<IAdminUserService>(TYPES.IAdminUserService);
      const updated = await adminUserService.updateUserAccountStatus(id, 'rejected');
      return this.sendSuccess(res, this.sanitizeUser(updated));
    } catch (error) {
      return this.handleError(res, error, 'AdminController.rejectStaff');
    }
  }

  /**
   * Suspend a staff member's account
   * 
   * @route PUT /api/admin/staff/:id/suspend
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with staff ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated staff member with suspended status
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Staff member not found
   */
  async suspendStaff(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const adminUserService = getService<IAdminUserService>(TYPES.IAdminUserService);
      const updated = await adminUserService.updateUserAccountStatus(id, 'suspended');
      return this.sendSuccess(res, this.sanitizeUser(updated));
    } catch (error) {
      return this.handleError(res, error, 'AdminController.suspendStaff');
    }
  }

  /**
   * Reactivate a suspended staff member's account
   * 
   * @route PUT /api/admin/staff/:id/reactivate
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with staff ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated staff member with active status
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Staff member not found
   */
  async reactivateStaff(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const adminUserService = getService<IAdminUserService>(TYPES.IAdminUserService);
      const updated = await adminUserService.updateUserAccountStatus(id, 'active');
      return this.sendSuccess(res, this.sanitizeUser(updated));
    } catch (error) {
      return this.handleError(res, error, 'AdminController.reactivateStaff');
    }
  }

  /**
   * Get all counselors
   * 
   * @route GET /api/admin/counselors
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of all counselors
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getCounselors(req: AuthenticatedRequest, res: Response) {
    try {
      const counselorDashboardService = getService<ICounselorDashboardService>(TYPES.ICounselorDashboardService);
      const counselors = await counselorDashboardService.getCounselors();
      return this.sendSuccess(res, counselors);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getCounselors');
    }
  }

  /**
   * Assign a student to a counselor
   * 
   * @route POST /api/admin/assign-student
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with student and counselor IDs
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @example
   * // Request body:
   * {
   *   "studentId": "student-123",
   *   "counselorId": "counselor-456"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Student or counselor not found
   */
  async assignStudent(req: AuthenticatedRequest, res: Response) {
    try {
      const { studentId, counselorId } = assignStudentSchema.parse(req.body);
      const counselorAssignmentService = getService<ICounselorAssignmentService>(TYPES.ICounselorAssignmentService);
      await counselorAssignmentService.assignStudent(studentId, counselorId);
      return this.sendEmptySuccess(res);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminController.assignStudent');
    }
  }

  /**
   * Unassign a student from their counselor
   * 
   * @route POST /api/admin/unassign-student
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with student ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @example
   * // Request body:
   * {
   *   "studentId": "student-123"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Student not found
   */
  async unassignStudent(req: AuthenticatedRequest, res: Response) {
    try {
      const { studentId } = unassignStudentSchema.parse(req.body);
      const counselorAssignmentService = getService<ICounselorAssignmentService>(TYPES.ICounselorAssignmentService);
      await counselorAssignmentService.unassignStudent(studentId);
      return this.sendEmptySuccess(res);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminController.unassignStudent');
    }
  }

  /**
   * Get all security settings
   * 
   * @route GET /api/admin/security/settings
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of security settings
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getSecuritySettings(req: AuthenticatedRequest, res: Response) {
    try {
      const adminSecurityService = getService<IAdminSecurityService>(TYPES.IAdminSecurityService);
      const settings = await adminSecurityService.getSecuritySettings();
      return this.sendSuccess(res, settings);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getSecuritySettings');
    }
  }

  /**
   * Update a specific security setting
   * 
   * @route PUT /api/admin/security/settings/:settingKey
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with setting key and value
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated security setting
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async updateSecuritySetting(req: AuthenticatedRequest, res: Response) {
    try {
      const { settingKey } = req.params;
      const { settingValue } = updateSecuritySettingSchema.parse(req.body);
      const adminId = this.getUserId(req);
      
      const adminSecurityService = getService<IAdminSecurityService>(TYPES.IAdminSecurityService);
      const updated = await adminSecurityService.updateSecuritySetting(settingKey, settingValue, adminId);
      return this.sendSuccess(res, updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminController.updateSecuritySetting');
    }
  }

  /**
   * Get payment gateway settings
   * 
   * @route GET /api/admin/payment-settings
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns payment settings configuration
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getPaymentSettings(req: AuthenticatedRequest, res: Response) {
    try {
      const paymentService = getService<IPaymentService>(TYPES.IPaymentService);
      const settings = await paymentService.getPaymentSettings();
      return this.sendSuccess(res, settings);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getPaymentSettings');
    }
  }

  /**
   * Update payment gateway settings
   * 
   * @route PUT /api/admin/payment-settings/:gateway
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with gateway name and settings
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated payment settings
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async updatePaymentSettings(req: AuthenticatedRequest, res: Response) {
    try {
      const { gateway } = req.params;
      const validatedData = updatePaymentSettingsSchema.parse(req.body);
      const adminId = this.getUserId(req);
      
      const paymentService = getService<IPaymentService>(TYPES.IPaymentService);
      const updated = await paymentService.updatePaymentSettings(gateway, validatedData, adminId);
      return this.sendSuccess(res, updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminController.updatePaymentSettings');
    }
  }

  /**
   * Toggle payment gateway active/inactive status
   * 
   * @route PATCH /api/admin/payment-settings/:gateway/toggle
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with gateway name and status
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated payment gateway status
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async togglePaymentGateway(req: AuthenticatedRequest, res: Response) {
    try {
      const { gateway } = req.params;
      const { isActive } = togglePaymentGatewaySchema.parse(req.body);
      const adminId = this.getUserId(req);
      
      const paymentService = getService<IPaymentService>(TYPES.IPaymentService);
      const updated = await paymentService.togglePaymentGateway(gateway, isActive ?? true, adminId);
      return this.sendSuccess(res, updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminController.togglePaymentGateway');
    }
  }

  /**
   * Get all subscription plans
   * 
   * @route GET /api/admin/subscription-plans
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of all subscription plans
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getSubscriptionPlans(req: AuthenticatedRequest, res: Response) {
    try {
      const subscriptionService = getService<ISubscriptionService>(TYPES.ISubscriptionService);
      const plans = await subscriptionService.getAllSubscriptionPlans();
      return this.sendSuccess(res, plans);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getSubscriptionPlans');
    }
  }

  /**
   * Create a new subscription plan
   * 
   * @route POST /api/admin/subscription-plans
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with subscription plan data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created subscription plan
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async createSubscriptionPlan(req: AuthenticatedRequest, res: Response) {
    try {
      const validatedData = insertSubscriptionPlanSchema.parse(req.body);
      const subscriptionService = getService<ISubscriptionService>(TYPES.ISubscriptionService);
      const plan = await subscriptionService.createSubscriptionPlan(validatedData);
      
      res.status(201);
      return this.sendSuccess(res, plan);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminController.createSubscriptionPlan');
    }
  }

  /**
   * Update an existing subscription plan
   * 
   * @route PUT /api/admin/subscription-plans/:id
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with plan ID and update data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated subscription plan
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Subscription plan not found
   */
  async updateSubscriptionPlan(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updateSubscriptionPlanBodySchema.parse(req.body);
      const subscriptionService = getService<ISubscriptionService>(TYPES.ISubscriptionService);
      const updated = await subscriptionService.updateSubscriptionPlan(id, validatedData);
      return this.sendSuccess(res, updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminController.updateSubscriptionPlan');
    }
  }

  /**
   * Delete a subscription plan
   * 
   * @route DELETE /api/admin/subscription-plans/:id
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with plan ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Subscription plan not found
   */
  async deleteSubscriptionPlan(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const subscriptionService = getService<ISubscriptionService>(TYPES.ISubscriptionService);
      const success = await subscriptionService.deleteSubscriptionPlan(id);
      
      if (!success) {
        return this.sendError(res, 404, 'NOT_FOUND', 'Subscription plan not found');
      }
      
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.deleteSubscriptionPlan');
    }
  }

  /**
   * Get all user subscriptions
   * 
   * @route GET /api/admin/user-subscriptions
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of all user subscriptions
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getUserSubscriptions(req: AuthenticatedRequest, res: Response) {
    try {
      const userSubscriptionService = getService<IUserSubscriptionService>(TYPES.IUserSubscriptionService);
      const subscriptions = await userSubscriptionService.getAllSubscriptions();
      return this.sendSuccess(res, subscriptions);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getUserSubscriptions');
    }
  }

  /**
   * Update or create a student's subscription
   * 
   * @route POST /api/admin/student-subscription/:studentId
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with student ID and subscription data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created/updated subscription
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Student not found
   */
  async updateStudentSubscription(req: AuthenticatedRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const validatedData = updateStudentSubscriptionSchema.parse(req.body);
      
      const userSubscriptionService = getService<IUserSubscriptionService>(TYPES.IUserSubscriptionService);
      const subscription = await userSubscriptionService.createSubscription({
        userId: studentId,
        planId: validatedData.planId,
        status: validatedData.status || 'active',
        startedAt: validatedData.startedAt as any || new Date(),
        expiresAt: validatedData.expiresAt as any || null
      });
      return this.sendSuccess(res, subscription);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminController.updateStudentSubscription');
    }
  }

  /**
   * Get all students with their subscription details
   * 
   * @route GET /api/admin/students-subscriptions
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of students with subscription data
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getStudentsWithSubscriptions(req: AuthenticatedRequest, res: Response) {
    try {
      const adminStudentService = getService<IAdminStudentService>(TYPES.IAdminStudentService);
      const studentsWithSubs = await adminStudentService.getStudentsWithSubscriptions();
      return this.sendSuccess(res, studentsWithSubs);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getStudentsWithSubscriptions');
    }
  }

  /**
   * Get all reported forum posts
   * 
   * @route GET /api/admin/forum/reported-posts
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of reported posts
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getReportedPosts(req: AuthenticatedRequest, res: Response) {
    try {
      const adminForumModerationService = getService<IAdminForumModerationService>(TYPES.IAdminForumModerationService);
      const posts = await adminForumModerationService.getReportedPosts();
      return this.sendSuccess(res, posts);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getReportedPosts');
    }
  }

  /**
   * Get detailed reports for a specific post
   * 
   * @route GET /api/admin/forum/posts/:id/reports
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with post ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of reports for the post
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Post not found
   */
  async getPostReports(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const adminForumModerationService = getService<IAdminForumModerationService>(TYPES.IAdminForumModerationService);
      const reports = await adminForumModerationService.getReportDetails(id);
      return this.sendSuccess(res, reports);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getPostReports');
    }
  }

  /**
   * Restore a reported/deleted forum post
   * 
   * @route POST /api/admin/forum/posts/:id/restore
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with post ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Post not found
   */
  async restorePost(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const adminId = this.getUserId(req);
      
      const adminForumModerationService = getService<IAdminForumModerationService>(TYPES.IAdminForumModerationService);
      const success = await adminForumModerationService.restoreReportedPost(id, adminId);
      
      if (!success) {
        return this.sendError(res, 404, 'NOT_FOUND', 'Post not found');
      }
      
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.restorePost');
    }
  }

  /**
   * Permanently delete a reported forum post
   * 
   * @route DELETE /api/admin/forum/posts/:id/permanent
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with post ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Post not found
   */
  async permanentlyDeletePost(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const adminId = this.getUserId(req);
      
      const adminForumModerationService = getService<IAdminForumModerationService>(TYPES.IAdminForumModerationService);
      const success = await adminForumModerationService.permanentlyDeleteReportedPost(id, adminId);
      
      if (!success) {
        return this.sendError(res, 404, 'NOT_FOUND', 'Post not found');
      }
      
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.permanentlyDeletePost');
    }
  }

  /**
   * Force logout all users (delete all sessions)
   * 
   * @route POST /api/admin/force-logout-all
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @note With JWT tokens, this is a placeholder as logout is handled client-side
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async deleteAllSessions(req: AuthenticatedRequest, res: Response) {
    try {
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.deleteAllSessions');
    }
  }

  /**
   * Get analytics dashboard data for team members
   * 
   * @route GET /api/admin/analytics-dashboard
   * @access Admin (Team Member)
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns analytics dashboard statistics
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not a team member
   */
  async getAnalyticsDashboard(req: AuthenticatedRequest, res: Response) {
    try {
      const user = this.getUser(req);
      
      if (user.userType !== 'team_member') {
        return this.sendError(res, 403, 'ACCESS_DENIED', 'Team member access required');
      }

      const adminAnalyticsService = getService<IAdminAnalyticsService>(TYPES.IAdminAnalyticsService);
      const stats = await adminAnalyticsService.getAnalyticsDashboard();
      return this.sendSuccess(res, stats);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getAnalyticsDashboard');
    }
  }

  /**
   * Get timeline/activity history for a specific student
   * 
   * @route GET /api/admin/students/:studentId/timeline
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with student ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns student timeline events
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Student not found
   */
  async getStudentTimeline(req: AuthenticatedRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const profileId = toStudentProfileId(studentId);
      const adminStudentService = getService<IAdminStudentService>(TYPES.IAdminStudentService);
      const timeline = await adminStudentService.getStudentTimeline(profileId);
      return this.sendSuccess(res, timeline);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getStudentTimeline');
    }
  }

  /**
   * Get current status for a specific student
   * 
   * @route GET /api/admin/students/:studentId/status
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with student ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns student status
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Student not found
   */
  async getStudentStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { studentId } = req.params;
      const userProfileService = getService<IUserProfileService>(TYPES.IUserProfileService);
      const { profile } = await userProfileService.getUserProfile(studentId);
      return this.sendSuccess(res, { status: profile?.status || 'inquiry' });
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getStudentStatus');
    }
  }

  /**
   * Create a new staff invitation link
   * 
   * @route POST /api/admin/staff-invitation-links
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created invitation link with URL
   * 
   * @example
   * // Response:
   * {
   *   "success": true,
   *   "data": {
   *     "id": "inv-123",
   *     "token": "abc123xyz",
   *     "url": "https://edupath.com/auth/staff-invite/abc123xyz",
   *     "createdAt": "2025-01-01T00:00:00Z"
   *   }
   * }
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async createStaffInvitationLink(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = this.getUserId(req);
      const adminStaffInvitationService = getService<IAdminStaffInvitationService>(TYPES.IAdminStaffInvitationService);
      const invitationLink = await adminStaffInvitationService.createStaffInvitationLink(adminId);
      
      const protocol = req.protocol;
      const host = req.get('host');
      const url = `${protocol}://${host}/auth/staff-invite/${invitationLink.token}`;
      
      return this.sendSuccess(res, {
        id: invitationLink.id,
        token: invitationLink.token,
        url,
        createdAt: invitationLink.createdAt
      });
    } catch (error) {
      return this.handleError(res, error, 'AdminController.createStaffInvitationLink');
    }
  }

  /**
   * Get all staff invitation links
   * 
   * @route GET /api/admin/staff-invitation-links
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of invitation links with URLs
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getStaffInvitationLinks(req: AuthenticatedRequest, res: Response) {
    try {
      const adminStaffInvitationService = getService<IAdminStaffInvitationService>(TYPES.IAdminStaffInvitationService);
      const links = await adminStaffInvitationService.getStaffInvitationLinks();
      
      const protocol = req.protocol;
      const host = req.get('host');
      
      const linksWithUrls = links.map((link: any) => ({
        ...link,
        url: `${protocol}://${host}/auth/staff-invite/${link.token}`
      }));
      
      return this.sendSuccess(res, linksWithUrls);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getStaffInvitationLinks');
    }
  }

  /**
   * Refresh/regenerate a staff invitation link
   * 
   * @route PUT /api/admin/staff-invitation-links/:id/refresh
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with invitation link ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns refreshed invitation link with new URL
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Invitation link not found
   */
  async refreshStaffInvitationLink(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const adminStaffInvitationService = getService<IAdminStaffInvitationService>(TYPES.IAdminStaffInvitationService);
      const updatedLink = await adminStaffInvitationService.refreshStaffInvitationLink(id);
      
      if (!updatedLink) {
        return this.sendError(res, 404, 'RESOURCE_NOT_FOUND', 'Invitation link not found');
      }
      
      const protocol = req.protocol;
      const host = req.get('host');
      const url = `${protocol}://${host}/auth/staff-invite/${updatedLink.token}`;
      
      return this.sendSuccess(res, {
        ...updatedLink,
        url
      });
    } catch (error) {
      return this.handleError(res, error, 'AdminController.refreshStaffInvitationLink');
    }
  }

  /**
   * Bulk import universities from CSV content
   * 
   * @route POST /api/admin/universities/bulk-import
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with CSV content
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns import results (success count, failed count, and errors)
   * 
   * @example
   * // Request body:
   * {
   *   "csvContent": "name,country,city,website,worldRanking,description,degreeLevels,specialization,offerLetterFee,annualFee,minimumGPA,ieltsScore,gmatScore,alumni1,alumni2,alumni3\nHarvard University,United States,Cambridge,https://www.harvard.edu,3,Prestigious Ivy League university,Bachelor,Master,PhD,general,150,54000,3.7,7.5,700,Mark Zuckerberg,Barack Obama,Bill Gates"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async bulkImportUniversities(req: AuthenticatedRequest, res: Response) {
    try {
      const csvContentSchema = z.object({
        csvContent: z.string().min(1, 'CSV content is required')
      });
      
      const validatedData = csvContentSchema.parse(req.body);
      
      const { bulkImportUniversities } = await import('../bulk-import.js');
      const result = await bulkImportUniversities(validatedData.csvContent);
      
      res.status(201);
      return this.sendSuccess(res, {
        success: result.success,
        failed: result.failed,
        errors: result.errors,
        message: `Successfully imported ${result.success} universities. ${result.failed} failed.`
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminController.bulkImportUniversities');
    }
  }

  /**
   * Download a sample CSV template for university bulk import
   * 
   * @route GET /api/admin/universities/sample-csv
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns CSV file download
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getSampleCSV(req: AuthenticatedRequest, res: Response) {
    try {
      const csvContent = generateSampleCSV();
      
      return this.sendFileDownload(res, csvContent, 'universities-sample.csv', 'text/csv');
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getSampleCSV');
    }
  }
}

export const adminController = new AdminController();
