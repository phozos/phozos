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
import { ISubscriptionAnalyticsService } from '../services/domain/subscription-analytics.service';
import { IUserProfileService } from '../services/domain/user-profile.service';
import { IRegistrationService } from '../services/domain/registration.service';
import { ICompanyProfileService } from '../services/domain/company-profile.service';
import { IUniversityService } from '../services/domain/university.service';
import { ICounselorAssignmentService } from '../services/domain/counselor-assignment.service';
import { ICounselorDashboardService } from '../services/domain/counselor-dashboard.service';
import { ISubscriptionService } from '../services/domain/subscription.service';
import { IUserSubscriptionService } from '../services/domain/user-subscription.service';
import { IPaymentService } from '../services/domain/payment.service';
import { IPlanMigrationService } from '../services/domain/plan-migration.service';
import { IBulkSubscriptionAdminService } from '../services/domain/bulk-subscription-admin.service';
import { ISubscriptionPlanRepository, ISubscriptionPlanAuditRepository } from '../repositories';
import { AuthenticatedRequest } from '../types/auth';
import { z } from 'zod';
import { 
  insertUserSchema, 
  insertUniversitySchema,
  insertSubscriptionPlanSchema 
} from '@shared/schema';
import { 
  createPlanVersionSchema,
  updatePlanPriceSchema,
  deprecatePlanSchema,
  archivePlanSchema,
  rollbackPlanVersionSchema,
  createMigrationSchema,
  startMigrationSchema,
  cancelMigrationSchema,
  bulkMigrateSubscribersSchema,
  bulkCancelSubscriptionsSchema,
  exportSubscribersSchema
} from '../services/validation/schemas';
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
  isActive: z.boolean().optional(),
  changeReason: z.string().optional(),
  forceUpdate: z.boolean().optional(),
  includeLoanAssistance: z.boolean().optional(),
  includeVisaSupport: z.boolean().optional(),
  includeCounselorSession: z.boolean().optional(),
  includeScholarshipPlanning: z.boolean().optional(),
  includeMockInterview: z.boolean().optional(),
  includeExpertEditing: z.boolean().optional(),
  includePostAdmitSupport: z.boolean().optional(),
  includeDedicatedManager: z.boolean().optional(),
  includeNetworkingEvents: z.boolean().optional(),
  includeFlightAccommodation: z.boolean().optional(),
  maxUniversities: z.number().optional(),
  maxCountries: z.number().optional(),
  universityTier: z.enum(['general', 'top500', 'top200', 'top100', 'ivy_league']).optional(),
  supportType: z.enum(['email', 'whatsapp', 'phone', 'premium']).optional(),
  turnaroundDays: z.number().optional(),
  
  // Category 1: Core Application Services
  includeCourseCountrySelection: z.boolean().optional(),
  includeUniversityShortlisting: z.boolean().optional(),
  includeOneOnOneEditing: z.boolean().optional(),
  includeProfileBuilding: z.boolean().optional(),
  includeTop50Counselling: z.boolean().optional(),
  
  // Category 2: Student Support & Mentorship
  supportTypes: z.array(z.enum(['email', 'whatsapp', 'phone', 'premium']))
    .min(1, 'At least one support type is required')
    .refine((types) => new Set(types).size === types.length, {
      message: 'Support types must not contain duplicates'
    })
    .optional(),
  
  // Category 3: Phozos AI
  phozosAiTier: z.enum(['none', 'basic', 'pro', 'ultra']).optional(),
  
  // Category 4: Financial & Scholarship Services
  includeForexServices: z.boolean().optional(),
  
  // Category 5: Visa & Post-Admission
  includePreDepartureSession: z.boolean().optional(),
  
  // Category 6: Phozos Prep
  phozosPrepTier: z.enum(['none', 'basic', 'pro', 'ultra']).optional(),
  phozosPrepDescription: z.string()
    .max(1000, 'Phozos Prep description must not exceed 1000 characters')
    .optional()
    .nullable()
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
      const plan = await subscriptionService.createSubscriptionPlan(
        validatedData,
        req.user!.id,
        req.ip,
        req.get('user-agent')
      );
      
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
      const { changeReason, forceUpdate, ...updateData } = validatedData;
      
      const subscriptionService = getService<ISubscriptionService>(TYPES.ISubscriptionService);
      const subscriptionPlanRepo = getService<ISubscriptionPlanRepository>(TYPES.ISubscriptionPlanRepository);
      
      // Get current plan to detect feature changes
      const currentPlan = await subscriptionPlanRepo.findById(id);
      
      // Check subscriber count
      const subscriberCount = await subscriptionPlanRepo.getSubscriberCount(id);
      
      // CRITICAL: Block price changes for plans with active subscribers
      // Price changes require versioning to preserve grandfathering
      if (subscriberCount > 0 && updateData.price && Number(updateData.price) !== Number(currentPlan.price)) {
        return this.sendError(
          res,
          400,
          'PRICE_CHANGE_NOT_ALLOWED',
          `Cannot change price for plan with ${subscriberCount} active subscribers`,
          {
            subscriberCount,
            currentPrice: currentPlan.price,
            attemptedPrice: updateData.price,
            recommendation: 'Use createPlanVersion() to preserve grandfathering for existing users',
            alternativeEndpoint: `/api/admin/subscription-plans/${currentPlan.basePlanId}/versions`,
            priceUpdateEndpoint: `/api/admin/subscription-plans/${currentPlan.basePlanId}/price`
          }
        );
      }
      
      // Protected feature fields that affect user entitlements
      const PROTECTED_FEATURE_FIELDS = [
        'features',
        'includeLoanAssistance',
        'includeVisaSupport',
        'includeCounselorSession',
        'includeScholarshipPlanning',
        'includeMockInterview',
        'includeExpertEditing',
        'includePostAdmitSupport',
        'includeDedicatedManager',
        'includeNetworkingEvents',
        'includeFlightAccommodation',
        'maxUniversities',
        'maxCountries',
        'universityTier',
        'supportType',
        'turnaroundDays'
      ];
      
      // Detect if any protected features are being changed
      const featureChanges: { field: string; oldValue: any; newValue: any }[] = [];
      
      for (const field of PROTECTED_FEATURE_FIELDS) {
        if (field in updateData) {
          const oldValue = (currentPlan as any)[field];
          const newValue = (updateData as any)[field];
          
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            featureChanges.push({
              field,
              oldValue,
              newValue
            });
          }
        }
      }
      
      // If there are feature changes and plan has active subscribers
      if (featureChanges.length > 0 && subscriberCount > 0) {
        if (!forceUpdate) {
          // Return warning instead of updating
          return res.status(400).json({
            success: false,
            error: 'FEATURE_CHANGE_WARNING',
            message: 'Cannot modify features on plans with active subscribers. Use forceUpdate=true with changeReason if you must proceed.',
            code: 400,
            data: {
              subscriberCount,
              featureChanges,
              recommendation: 'Use createPlanVersion() to preserve grandfathering for existing users',
              requiresForceUpdate: true
            }
          });
        }
        
        // Force update enabled - require change reason
        if (!changeReason) {
          return this.sendError(
            res,
            400,
            'CHANGE_REASON_REQUIRED',
            'Change reason is required when forcing feature updates on plans with active subscribers'
          );
        }
        
        // Log warning about forced feature changes
        console.warn(`⚠️ FORCED FEATURE UPDATE: Plan ${id} (${currentPlan.name}) with ${subscriberCount} subscribers`);
        console.warn(`Changed fields:`, featureChanges.map(c => c.field).join(', '));
        console.warn(`Reason: ${changeReason}`);
        console.warn(`Admin: ${req.user!.id}`);
      }
      
      const updated = await subscriptionService.updateSubscriptionPlan(
        id,
        updateData,
        req.user!.id,
        changeReason,
        req.ip,
        req.get('user-agent')
      );
      
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
      const success = await subscriptionService.deleteSubscriptionPlan(
        id,
        req.user!.id,
        req.ip,
        req.get('user-agent')
      );
      
      if (!success) {
        return this.sendError(res, 404, 'NOT_FOUND', 'Subscription plan not found');
      }
      
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.deleteSubscriptionPlan');
    }
  }

  async getPlanChangeHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const auditRepository = getService<ISubscriptionPlanAuditRepository>(TYPES.ISubscriptionPlanAuditRepository);
      const history = await auditRepository.getChangeHistory(id);
      return this.sendSuccess(res, history);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getPlanChangeHistory');
    }
  }

  async getRecentPlanChanges(req: AuthenticatedRequest, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const auditRepository = getService<ISubscriptionPlanAuditRepository>(TYPES.ISubscriptionPlanAuditRepository);
      const changes = await auditRepository.getRecentChanges(limit);
      return this.sendSuccess(res, changes);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getRecentPlanChanges');
    }
  }

  /**
   * Create a new version of a subscription plan
   * 
   * @route POST /api/admin/subscription-plans/:basePlanId/versions
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with basePlanId and version details
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns the newly created plan version with enriched metadata
   */
  async createPlanVersion(req: AuthenticatedRequest, res: Response) {
    try {
      const { basePlanId } = req.params;
      const validatedData = createPlanVersionSchema.parse(req.body);
      const adminId = this.getUserId(req);

      const subscriptionService = getService<ISubscriptionService>(TYPES.ISubscriptionService);
      const subscriptionPlanRepo = getService<ISubscriptionPlanRepository>(TYPES.ISubscriptionPlanRepository);
      
      const { price, ...restUpdates } = validatedData.updates;
      const updates = {
        ...restUpdates,
        ...(price !== undefined && { price: price.toString() })
      };
      
      const newVersion = await subscriptionService.createPlanVersion(
        basePlanId,
        updates,
        adminId,
        validatedData.releaseNotes
      );

      // Enhanced response with subscriber counts
      const subscribersAffected = await subscriptionPlanRepo.getSubscriberCount(basePlanId);

      res.status(201);
      return this.sendSuccess(res, {
        newVersion,
        subscribersAffected,
        message: `Version ${newVersion.version} created successfully`
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminController.createPlanVersion');
    }
  }

  /**
   * Get all versions of a subscription plan
   * 
   * @route GET /api/admin/subscription-plans/:basePlanId/versions
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with basePlanId
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns array of all plan versions
   */
  async getPlanVersions(req: AuthenticatedRequest, res: Response) {
    try {
      const { basePlanId } = req.params;

      const subscriptionService = getService<ISubscriptionService>(TYPES.ISubscriptionService);
      const versions = await subscriptionService.getPlanVersions(basePlanId);

      return this.sendSuccess(res, versions);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getPlanVersions');
    }
  }

  /**
   * Get a specific version of a subscription plan
   * 
   * @route GET /api/admin/subscription-plans/:basePlanId/versions/:version
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with basePlanId and version number
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns the specific plan version
   */
  async getPlanVersion(req: AuthenticatedRequest, res: Response) {
    try {
      const { basePlanId, version } = req.params;
      const versionNumber = parseInt(version, 10);

      const subscriptionService = getService<ISubscriptionService>(TYPES.ISubscriptionService);
      const planVersion = await subscriptionService.getPlanVersion(basePlanId, versionNumber);

      if (!planVersion) {
        return this.sendError(res, 404, 'NOT_FOUND', 'Plan version not found');
      }

      return this.sendSuccess(res, planVersion);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getPlanVersion');
    }
  }

  /**
   * Update plan price with versioning (dedicated price update endpoint)
   * 
   * Creates a new plan version with updated pricing while preserving existing subscriber terms.
   * This is the recommended way to change prices for plans with active subscribers.
   * 
   * @route POST /api/admin/subscription-plans/:basePlanId/price
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with price update data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns new version with price update confirmation
   * 
   * @example
   * // Request body:
   * {
   *   "newPrice": 14999,
   *   "effectiveDate": "2025-12-01T00:00:00Z",
   *   "notifySubscribers": true
   * }
   */
  async updatePlanPrice(req: AuthenticatedRequest, res: Response) {
    try {
      const { basePlanId } = req.params;
      const validatedData = updatePlanPriceSchema.parse(req.body);
      const adminId = this.getUserId(req);
      
      const effectiveDateParsed = new Date(validatedData.effectiveDate);
      
      if (isNaN(effectiveDateParsed.getTime())) {
        return this.sendError(res, 400, 'INVALID_DATE', 'effectiveDate must be a valid ISO 8601 date');
      }
      
      const subscriptionService = getService<ISubscriptionService>(TYPES.ISubscriptionService);
      
      // Create release notes with effective date information
      const releaseNotes = `Price updated to ${validatedData.newPrice}. Effective date: ${effectiveDateParsed.toISOString()}`;
      
      // Call service with correct parameter order: planId, newPrice, adminId, releaseNotes, notifySubscribers
      const newVersion = await subscriptionService.updatePlanPrice(
        basePlanId,
        validatedData.newPrice,
        adminId,
        releaseNotes,
        validatedData.notifySubscribers ?? true,
        req.ip,
        req.get('user-agent')
      );
      
      return this.sendSuccess(res, {
        message: 'Price updated successfully',
        newVersion,
        effectiveDate: effectiveDateParsed,
        subscribersNotified: validatedData.notifySubscribers ?? true
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminController.updatePlanPrice');
    }
  }

  /**
   * Get plan version history with subscriber counts
   * 
   * Returns all versions of a plan family with active subscriber counts for each version.
   * This helps admins understand the impact of versioning and grandfathering.
   * 
   * @route GET /api/admin/subscription-plans/:basePlanId/versions/history
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with basePlanId
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns version history with subscriber metadata
   */
  async getPlanVersionHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const { basePlanId } = req.params;
      
      const subscriptionService = getService<ISubscriptionService>(TYPES.ISubscriptionService);
      const subscriptionPlanRepo = getService<ISubscriptionPlanRepository>(TYPES.ISubscriptionPlanRepository);
      
      const versions = await subscriptionService.getPlanVersions(basePlanId);
      
      // Enrich with subscriber counts for each version
      const versionsWithCounts = await Promise.all(
        versions.map(async (version) => ({
          ...version,
          activeSubscribers: await subscriptionPlanRepo.getSubscriberCount(version.id)
        }))
      );
      
      return this.sendSuccess(res, {
        basePlanId,
        versions: versionsWithCounts,
        latestVersion: versionsWithCounts.find(v => v.isLatestVersion)
      });
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getPlanVersionHistory');
    }
  }

  /**
   * Deprecate a subscription plan
   * 
   * Marks a plan as deprecated and optionally specifies a successor plan.
   * Existing subscribers can continue using the plan, but new subscriptions are not allowed.
   * 
   * @route POST /api/admin/subscription-plans/:id/deprecate
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with id, successorPlanId, and reason
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns deprecation confirmation with details
   */
  async deprecatePlan(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = deprecatePlanSchema.parse(req.body);
      const adminId = this.getUserId(req);
      
      if (!validatedData.reason || validatedData.reason.trim().length === 0) {
        return this.sendError(res, 400, 'REASON_REQUIRED', 'Deprecation reason is required');
      }

      const subscriptionService = getService<ISubscriptionService>(TYPES.ISubscriptionService);
      await subscriptionService.deprecatePlan(
        id, 
        validatedData.successorPlanId || undefined, 
        adminId, 
        validatedData.reason
      );

      let migrationId: string | null = null;

      // Create migration workflow if requested and successor plan is specified
      if (validatedData.createMigration && validatedData.successorPlanId) {
        const migrationService = getService<IPlanMigrationService>(TYPES.IPlanMigrationService);
        const deprecatedPlan = await subscriptionService.getSubscriptionPlan(id);
        const successorPlan = await subscriptionService.getSubscriptionPlan(validatedData.successorPlanId);
        
        if (deprecatedPlan && successorPlan) {
          const migration = await migrationService.createMigration({
            name: `Migration from ${deprecatedPlan.name} to ${successorPlan.name}`,
            sourcePlanId: id,
            targetPlanId: validatedData.successorPlanId,
            migrationType: 'voluntary',
            startDate: new Date(),
            incentiveType: undefined,
            incentiveValue: undefined
          }, adminId);
          
          migrationId = migration.id;
        }
      }

      return this.sendSuccess(res, {
        message: 'Plan deprecated successfully',
        deprecatedPlanId: id,
        successorPlanId: validatedData.successorPlanId || null,
        reason: validatedData.reason,
        migrationCreated: !!migrationId,
        migrationId: migrationId
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminController.deprecatePlan');
    }
  }

  /**
   * Archive a subscription plan (only if no active subscribers)
   * 
   * Permanently archives a plan that has no active subscribers.
   * This is typically used for cleanup of old, unused plans.
   * 
   * @route POST /api/admin/subscription-plans/:id/archive
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with id and reason
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns archive confirmation with details
   */
  async archivePlan(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = archivePlanSchema.parse(req.body);
      const adminId = this.getUserId(req);
      
      if (!validatedData.reason || validatedData.reason.trim().length === 0) {
        return this.sendError(res, 400, 'REASON_REQUIRED', 'Archive reason is required');
      }

      const subscriptionService = getService<ISubscriptionService>(TYPES.ISubscriptionService);
      await subscriptionService.archivePlan(id, adminId, validatedData.reason);

      return this.sendSuccess(res, {
        message: 'Plan archived successfully',
        archivedPlanId: id,
        reason: validatedData.reason
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminController.archivePlan');
    }
  }

  /**
   * P3.4: Rollback plan to a previous version
   * 
   * Creates a new version with fields copied from the target version.
   * Historical data remains immutable - this creates a new version with incremented version number.
   * Useful for reverting unwanted price or feature changes.
   * 
   * @route POST /api/admin/subscription-plans/:planId/rollback
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with planId and rollback data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns new version created from rollback
   * 
   * @example
   * // Request body:
   * {
   *   "targetVersion": 2,
   *   "reason": "Reverting price increase due to customer feedback",
   *   "notifySubscribers": false
   * }
   */
  async rollbackPlanVersion(req: AuthenticatedRequest, res: Response) {
    try {
      const { planId } = req.params;
      const validatedData = rollbackPlanVersionSchema.parse(req.body);
      const adminId = this.getUserId(req);
      
      if (!validatedData.reason || validatedData.reason.trim().length === 0) {
        return this.sendError(res, 400, 'REASON_REQUIRED', 'Rollback reason is required');
      }

      const subscriptionService = getService<ISubscriptionService>(TYPES.ISubscriptionService);
      
      const newVersion = await subscriptionService.rollbackPlanVersion(
        planId,
        validatedData.targetVersion,
        adminId,
        validatedData.reason,
        validatedData.notifySubscribers ?? false
      );

      return this.sendSuccess(res, {
        message: 'Plan rolled back successfully',
        newVersion,
        rolledBackTo: validatedData.targetVersion,
        reason: validatedData.reason,
        subscribersNotified: validatedData.notifySubscribers ?? false
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminController.rollbackPlanVersion');
    }
  }

  /**
   * Get analytics for a subscription plan
   * 
   * Returns comprehensive analytics for a specific plan version including
   * subscriber count, revenue, deprecation status, and successor information.
   * 
   * @route GET /api/admin/subscription-plans/:id/analytics
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with id
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns plan analytics including subscriber count and revenue
   */
  async getPlanAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const subscriptionService = getService<ISubscriptionService>(TYPES.ISubscriptionService);
      const analytics = await subscriptionService.getPlanAnalytics(id);

      return this.sendSuccess(res, analytics);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getPlanAnalytics');
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

  async getSubscriptionAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const analyticsService = getService<ISubscriptionAnalyticsService>(TYPES.ISubscriptionAnalyticsService);
      
      const [subscriptionMetrics, churnMetrics, paymentMetrics, upgradeDowngradeMetrics] = await Promise.all([
        analyticsService.getSubscriptionMetrics(),
        analyticsService.getChurnMetrics(),
        analyticsService.getPaymentMetrics(),
        analyticsService.getUpgradeDowngradeMetrics()
      ]);

      return this.sendSuccess(res, {
        subscriptions: subscriptionMetrics,
        churn: churnMetrics,
        payments: paymentMetrics,
        upgradesDowngrades: upgradeDowngradeMetrics
      });
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getSubscriptionAnalytics');
    }
  }

  async getRevenueAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const analyticsService = getService<ISubscriptionAnalyticsService>(TYPES.ISubscriptionAnalyticsService);
      
      const revenueMetrics = await analyticsService.getRevenueMetrics();

      return this.sendSuccess(res, revenueMetrics);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getRevenueAnalytics');
    }
  }

  async getSubscriptionGrowth(req: AuthenticatedRequest, res: Response) {
    try {
      const analyticsService = getService<ISubscriptionAnalyticsService>(TYPES.ISubscriptionAnalyticsService);
      
      const growthData = await analyticsService.getSubscriptionGrowth();

      return this.sendSuccess(res, growthData);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getSubscriptionGrowth');
    }
  }

  /**
   * Get lifetime subscription metrics
   * 
   * @route GET /api/admin/analytics/lifetime-metrics
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns lifetime subscription metrics including total revenue, ATV, upgrade rate, plan distribution, revenue by tier, and lifetime value by plan
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getLifetimeMetrics(req: AuthenticatedRequest, res: Response) {
    try {
      const analyticsService = getService<ISubscriptionAnalyticsService>(TYPES.ISubscriptionAnalyticsService);
      
      const lifetimeMetrics = await analyticsService.getLifetimeMetrics();

      return this.sendSuccess(res, lifetimeMetrics);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getLifetimeMetrics');
    }
  }

  /**
   * Cancel a user's subscription
   * 
   * @route DELETE /api/admin/user-subscriptions/:subscriptionId
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with subscription ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns success message
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Subscription not found
   */
  async cancelUserSubscription(req: AuthenticatedRequest, res: Response) {
    try {
      const { subscriptionId } = req.params;

      const userSubscriptionService = getService<IUserSubscriptionService>(TYPES.IUserSubscriptionService);
      const cancelled = await userSubscriptionService.cancelSubscription(subscriptionId);

      if (!cancelled) {
        return this.sendError(res, 404, 'NOT_FOUND', 'Subscription not found');
      }

      return this.sendSuccess(res, { message: 'Subscription cancelled successfully', subscriptionId });
    } catch (error) {
      return this.handleError(res, error, 'AdminController.cancelUserSubscription');
    }
  }

  /**
   * Get all failed payments
   * 
   * @route GET /api/admin/failed-payments
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of failed payments with user and plan details
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getFailedPayments(req: AuthenticatedRequest, res: Response) {
    try {
      const { db } = await import('../db');
      const { failedPayments, users, subscriptionPlans } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');

      const failedPaymentsData = await db
        .select({
          id: failedPayments.id,
          userId: failedPayments.userId,
          planId: failedPayments.planId,
          orderId: failedPayments.orderId,
          paymentId: failedPayments.paymentId,
          amount: failedPayments.amount,
          currency: failedPayments.currency,
          failureReason: failedPayments.failureReason,
          razorpayErrorCode: failedPayments.razorpayErrorCode,
          razorpayErrorDescription: failedPayments.razorpayErrorDescription,
          failedAt: failedPayments.failedAt,
          notifiedAt: failedPayments.notifiedAt,
          createdAt: failedPayments.createdAt,
          userEmail: users.email,
          userFirstName: users.firstName,
          userLastName: users.lastName,
          planName: subscriptionPlans.name,
          planPrice: subscriptionPlans.price,
        })
        .from(failedPayments)
        .leftJoin(users, eq(failedPayments.userId, users.id))
        .leftJoin(subscriptionPlans, eq(failedPayments.planId, subscriptionPlans.id))
        .orderBy(failedPayments.failedAt);

      return this.sendSuccess(res, failedPaymentsData);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getFailedPayments');
    }
  }

  /**
   * Get payment history for a user
   * 
   * @route GET /api/admin/user-subscriptions/:userId/payment-history
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with user ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns payment history for the user
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getUserPaymentHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      const { db } = await import('../db');
      const { payments, subscriptionPlans } = await import('@shared/schema');
      const { eq, desc } = await import('drizzle-orm');

      const paymentHistoryData = await db
        .select({
          id: payments.id,
          userId: payments.userId,
          planId: payments.planId,
          planName: subscriptionPlans.name,
          paymentType: payments.paymentType,
          amount: payments.amount,
          currency: payments.currency,
          orderId: payments.orderId,
          paymentReference: payments.paymentReference,
          paymentGateway: payments.paymentGateway,
          paidAt: payments.paidAt,
        })
        .from(payments)
        .leftJoin(subscriptionPlans, eq(payments.planId, subscriptionPlans.id))
        .where(eq(payments.userId, userId))
        .orderBy(desc(payments.paidAt));

      const paymentTypeLabels: Record<string, string> = {
        'new_subscription': 'Initial Purchase',
        'upgrade': 'Upgrade',
        'renewal': 'Renewal',
      };

      const paymentHistory = paymentHistoryData.map(payment => ({
        ...payment,
        planId: payment.planId || '',
        planName: payment.planName || 'Unknown Plan',
        paymentType: payment.paymentType 
          ? paymentTypeLabels[payment.paymentType] || 'Payment'
          : 'Payment'
      }));

      return this.sendSuccess(res, paymentHistory);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getUserPaymentHistory');
    }
  }

  /**
   * Get subscription events for a user
   * 
   * @route GET /api/admin/user-subscriptions/:userId/events
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with user ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns subscription lifecycle events for the user
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getUserSubscriptionEvents(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      const { subscriptionAuditService } = await import('../services/infrastructure/subscription-audit.service');
      
      const events = await subscriptionAuditService.getUserSubscriptionEvents(userId);

      return this.sendSuccess(res, events);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getUserSubscriptionEvents');
    }
  }

  async getOutboxMetrics(req: AuthenticatedRequest, res: Response) {
    try {
      const { db } = await import('../db');
      const { subscriptionAuditOutbox } = await import('@shared/schema');
      const { eq, and, gte, sql } = await import('drizzle-orm');
      const { subscriptionAuditOutboxProcessor } = await import('../services/infrastructure/subscription-audit-outbox-processor');

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const allEvents = await db.select().from(subscriptionAuditOutbox);

      const pendingEvents = allEvents.filter(e => e.status === 'pending');
      const failedEvents = allEvents.filter(e => e.status === 'failed');
      const completedInLastHour = allEvents.filter(
        e => e.status === 'completed' && e.processedAt && new Date(e.processedAt) >= oneHourAgo
      );
      const retriesInLastHour = allEvents.filter(
        e => e.createdAt >= oneHourAgo && e.retries > 0
      ).reduce((sum, e) => sum + e.retries, 0);

      const oldestPending = pendingEvents.length > 0
        ? pendingEvents.reduce((oldest, event) => 
            new Date(event.createdAt) < new Date(oldest.createdAt) ? event : oldest
          )
        : null;

      const processingLagSeconds = oldestPending
        ? Math.floor((now.getTime() - new Date(oldestPending.createdAt).getTime()) / 1000)
        : 0;

      const throughputPerMinute = completedInLastHour.length / 60;

      const metrics = {
        outbox_pending_events: pendingEvents.length,
        outbox_processing_lag: processingLagSeconds,
        outbox_dlq_count: failedEvents.length,
        outbox_retry_count: retriesInLastHour,
        outbox_throughput: parseFloat(throughputPerMinute.toFixed(2)),
        worker_health: subscriptionAuditOutboxProcessor['isRunning'] || false,
      };

      return this.sendSuccess(res, metrics);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getOutboxMetrics');
    }
  }

  async getOutboxEvents(req: AuthenticatedRequest, res: Response) {
    try {
      const { db } = await import('../db');
      const { subscriptionAuditOutbox } = await import('@shared/schema');
      const { eq, desc, and, or, like, sql } = await import('drizzle-orm');

      const { 
        status, 
        page = '1', 
        limit = '50',
        search 
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      let whereConditions: any[] = [];

      if (status) {
        whereConditions.push(eq(subscriptionAuditOutbox.status, status as string));
      }

      if (search) {
        whereConditions.push(
          or(
            like(subscriptionAuditOutbox.subscriptionId, `%${search}%`),
            like(subscriptionAuditOutbox.userId, `%${search}%`)
          )
        );
      }

      const query = db
        .select()
        .from(subscriptionAuditOutbox)
        .orderBy(desc(subscriptionAuditOutbox.createdAt))
        .limit(limitNum)
        .offset(offset);

      const events = whereConditions.length > 0
        ? await query.where(and(...whereConditions))
        : await query;

      const totalQuery = whereConditions.length > 0
        ? db.select({ count: sql`count(*)` }).from(subscriptionAuditOutbox).where(and(...whereConditions))
        : db.select({ count: sql`count(*)` }).from(subscriptionAuditOutbox);

      const totalResult = await totalQuery;
      const total = Number(totalResult[0].count);

      return this.sendSuccess(res, {
        events,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getOutboxEvents');
    }
  }

  async retryOutboxEvent(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { db } = await import('../db');
      const { subscriptionAuditOutbox } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');

      const event = await db.query.subscriptionAuditOutbox.findFirst({
        where: eq(subscriptionAuditOutbox.id, id),
      });

      if (!event) {
        return this.sendError(res, 404, 'NOT_FOUND', 'Outbox event not found');
      }

      if (event.status !== 'failed') {
        return this.sendError(res, 400, 'INVALID_STATUS', 'Only failed events can be retried');
      }

      await db
        .update(subscriptionAuditOutbox)
        .set({
          status: 'pending',
          retries: 0,
          nextRetryAt: null,
          errorMessage: null,
        })
        .where(eq(subscriptionAuditOutbox.id, id));

      return this.sendSuccess(res, { message: 'Event queued for retry' });
    } catch (error) {
      return this.handleError(res, error, 'AdminController.retryOutboxEvent');
    }
  }

  async deleteOutboxEvent(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { db } = await import('../db');
      const { subscriptionAuditOutbox } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');

      const event = await db.query.subscriptionAuditOutbox.findFirst({
        where: eq(subscriptionAuditOutbox.id, id),
      });

      if (!event) {
        return this.sendError(res, 404, 'NOT_FOUND', 'Outbox event not found');
      }

      await db.delete(subscriptionAuditOutbox).where(eq(subscriptionAuditOutbox.id, id));

      return this.sendSuccess(res, { message: 'Event deleted successfully' });
    } catch (error) {
      return this.handleError(res, error, 'AdminController.deleteOutboxEvent');
    }
  }

  async createMigration(req: AuthenticatedRequest, res: Response) {
    try {
      const validatedData = createMigrationSchema.parse(req.body);
      const planMigrationService = getService<IPlanMigrationService>(TYPES.IPlanMigrationService);

      const migrationData = {
        ...validatedData,
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined
      };

      const migration = await planMigrationService.createMigration(migrationData, req.user!.id);
      res.status(201);
      return this.sendSuccess(res, migration);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.createMigration');
    }
  }

  async getMigrations(req: AuthenticatedRequest, res: Response) {
    try {
      const { status } = req.query;
      const planMigrationService = getService<IPlanMigrationService>(TYPES.IPlanMigrationService);

      const migrations = await planMigrationService.getAllMigrations({ 
        status: status as string | undefined 
      });

      return this.sendSuccess(res, migrations);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getMigrations');
    }
  }

  async getMigration(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const planMigrationService = getService<IPlanMigrationService>(TYPES.IPlanMigrationService);

      const migration = await planMigrationService.getMigration(id);
      return this.sendSuccess(res, migration);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getMigration');
    }
  }

  async startMigration(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const planMigrationService = getService<IPlanMigrationService>(TYPES.IPlanMigrationService);

      await planMigrationService.startMigration(id, req.user!.id);
      return this.sendSuccess(res, { message: 'Migration started successfully' });
    } catch (error) {
      return this.handleError(res, error, 'AdminController.startMigration');
    }
  }

  async cancelMigration(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = cancelMigrationSchema.parse(req.body);
      const planMigrationService = getService<IPlanMigrationService>(TYPES.IPlanMigrationService);

      await planMigrationService.cancelMigration(id, req.user!.id, validatedData.reason);
      return this.sendSuccess(res, { message: 'Migration cancelled successfully' });
    } catch (error) {
      return this.handleError(res, error, 'AdminController.cancelMigration');
    }
  }

  async getMigrationStats(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const planMigrationService = getService<IPlanMigrationService>(TYPES.IPlanMigrationService);

      const stats = await planMigrationService.getMigrationStats(id);
      return this.sendSuccess(res, stats);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getMigrationStats');
    }
  }

  async getComprehensivePlanAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const subscriptionAnalyticsService = getService<ISubscriptionAnalyticsService>(TYPES.ISubscriptionAnalyticsService);
      const analytics = await subscriptionAnalyticsService.getComprehensiveAnalytics();
      return this.sendSuccess(res, analytics);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getComprehensivePlanAnalytics');
    }
  }

  async getFeatureImpactPreview(req: AuthenticatedRequest, res: Response) {
    try {
      const { planId } = req.params;
      const changes = req.body;
      const { FeatureImpactPreviewService } = await import('../services/domain/admin/feature-impact-preview.service');
      const service = new FeatureImpactPreviewService();
      const analysis = await service.analyzeFeatureChange(planId, changes);
      return this.sendSuccess(res, analysis);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getFeatureImpactPreview');
    }
  }

  async getFeatureManagementDashboard(req: AuthenticatedRequest, res: Response) {
    try {
      const { FeatureManagementAdminService } = await import('../services/domain/admin/feature-management-admin.service');
      const service = new FeatureManagementAdminService();
      const dashboard = await service.getDashboardSummary();
      return this.sendSuccess(res, dashboard);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getFeatureManagementDashboard');
    }
  }

  async getFeatureUsageOverview(req: AuthenticatedRequest, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      const dateRange = startDate && endDate ? {
        start: new Date(startDate as string),
        end: new Date(endDate as string)
      } : undefined;
      const { FeatureManagementAdminService } = await import('../services/domain/admin/feature-management-admin.service');
      const service = new FeatureManagementAdminService();
      const overview = await service.getFeatureUsageOverview(dateRange);
      return this.sendSuccess(res, overview);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getFeatureUsageOverview');
    }
  }

  async getFeatureHealth(req: AuthenticatedRequest, res: Response) {
    try {
      const { featureName } = req.params;
      const { FeatureManagementAdminService } = await import('../services/domain/admin/feature-management-admin.service');
      const service = new FeatureManagementAdminService();
      const health = await service.getFeatureHealth(featureName);
      return this.sendSuccess(res, health);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getFeatureHealth');
    }
  }

  async getFeatureLifecycle(req: AuthenticatedRequest, res: Response) {
    try {
      const { featureName } = req.params;
      const { FeatureManagementAdminService } = await import('../services/domain/admin/feature-management-admin.service');
      const service = new FeatureManagementAdminService();
      const lifecycle = await service.getFeatureLifecycle(featureName);
      return this.sendSuccess(res, lifecycle);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getFeatureLifecycle');
    }
  }

  async executeBulkFeatureOperation(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = this.getUserId(req);
      const operation = req.body;
      const { FeatureManagementAdminService } = await import('../services/domain/admin/feature-management-admin.service');
      const service = new FeatureManagementAdminService();
      const result = await service.executeBulkOperation(operation, adminId);
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.executeBulkFeatureOperation');
    }
  }

  async createDeprecationSchedule(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = this.getUserId(req);
      const request = req.body;
      const { FeatureDeprecationWorkflowService } = await import('../services/domain/admin/feature-deprecation-workflow.service');
      const service = new FeatureDeprecationWorkflowService();
      const schedule = await service.createDeprecationSchedule(request, adminId);
      return this.sendSuccess(res, schedule);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.createDeprecationSchedule');
    }
  }

  async getDeprecationSchedules(req: AuthenticatedRequest, res: Response) {
    try {
      const { status } = req.query;
      const { FeatureDeprecationWorkflowService } = await import('../services/domain/admin/feature-deprecation-workflow.service');
      const service = new FeatureDeprecationWorkflowService();
      const schedules = await service.getAllDeprecationSchedules(status as any);
      return this.sendSuccess(res, schedules);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getDeprecationSchedules');
    }
  }

  async getDeprecationSchedule(req: AuthenticatedRequest, res: Response) {
    try {
      const { scheduleId } = req.params;
      const { FeatureDeprecationWorkflowService } = await import('../services/domain/admin/feature-deprecation-workflow.service');
      const service = new FeatureDeprecationWorkflowService();
      const schedule = await service.getDeprecationSchedule(scheduleId);
      if (!schedule) {
        return this.sendError(res, 404, 'NOT_FOUND', 'Deprecation schedule not found');
      }
      return this.sendSuccess(res, schedule);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getDeprecationSchedule');
    }
  }

  async updateDeprecationSchedule(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = this.getUserId(req);
      const request = req.body;
      const { FeatureDeprecationWorkflowService } = await import('../services/domain/admin/feature-deprecation-workflow.service');
      const service = new FeatureDeprecationWorkflowService();
      const schedule = await service.updateDeprecationSchedule(request, adminId);
      return this.sendSuccess(res, schedule);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.updateDeprecationSchedule');
    }
  }

  async cancelDeprecationSchedule(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = this.getUserId(req);
      const { scheduleId } = req.params;
      const { reason } = req.body;
      const { FeatureDeprecationWorkflowService } = await import('../services/domain/admin/feature-deprecation-workflow.service');
      const service = new FeatureDeprecationWorkflowService();
      await service.cancelDeprecationSchedule(scheduleId, reason, adminId);
      return this.sendSuccess(res, { message: 'Deprecation schedule cancelled successfully' });
    } catch (error) {
      return this.handleError(res, error, 'AdminController.cancelDeprecationSchedule');
    }
  }

  async getDeprecationImpact(req: AuthenticatedRequest, res: Response) {
    try {
      const { scheduleId } = req.params;
      const { FeatureDeprecationWorkflowService } = await import('../services/domain/admin/feature-deprecation-workflow.service');
      const service = new FeatureDeprecationWorkflowService();
      const impact = await service.getDeprecationImpact(scheduleId);
      return this.sendSuccess(res, impact);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getDeprecationImpact');
    }
  }

  async getDeprecationTimeline(req: AuthenticatedRequest, res: Response) {
    try {
      const { scheduleId } = req.params;
      const { FeatureDeprecationWorkflowService } = await import('../services/domain/admin/feature-deprecation-workflow.service');
      const service = new FeatureDeprecationWorkflowService();
      const timeline = await service.getDeprecationTimeline(scheduleId);
      return this.sendSuccess(res, timeline);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.getDeprecationTimeline');
    }
  }

  async bulkMigrateSubscribers(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = this.getUserId(req);
      
      const validated = bulkMigrateSubscribersSchema.parse(req.body);
      
      const bulkService = getService<IBulkSubscriptionAdminService>(TYPES.IBulkSubscriptionAdminService);
      const result = await bulkService.bulkMigrateSubscribers(
        validated.sourcePlanId,
        validated.targetPlanId,
        validated.userIds,
        adminId
      );
      
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.bulkMigrateSubscribers');
    }
  }

  async bulkCancelSubscriptions(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = this.getUserId(req);
      
      const validated = bulkCancelSubscriptionsSchema.parse(req.body);
      
      const bulkService = getService<IBulkSubscriptionAdminService>(TYPES.IBulkSubscriptionAdminService);
      const result = await bulkService.bulkCancelSubscriptions(
        validated.userIds,
        validated.reason,
        adminId
      );
      
      return this.sendSuccess(res, result);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.bulkCancelSubscriptions');
    }
  }

  async exportSubscribers(req: AuthenticatedRequest, res: Response) {
    try {
      const validated = exportSubscribersSchema.parse(req.query);
      
      const bulkService = getService<IBulkSubscriptionAdminService>(TYPES.IBulkSubscriptionAdminService);
      const csv = await bulkService.exportSubscribers(
        validated.planId,
        validated.status,
        validated.format
      );
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="subscribers-export-${new Date().toISOString()}.csv"`);
      return res.send(csv);
    } catch (error) {
      return this.handleError(res, error, 'AdminController.exportSubscribers');
    }
  }
}

export const adminController = new AdminController();
