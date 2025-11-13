import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { getService, TYPES } from '../services/container';
import { IPartnerService } from '../services/domain/partner.service';
import { IReferralLinkService } from '../services/domain/referral-link.service';
import { ICommissionService } from '../services/domain/commission.service';
import { IPayoutService } from '../services/domain/payout.service';
import { IPartnerStudentReferralRepository } from '../repositories';
import { AuthenticatedRequest } from '../types/auth';
import { z } from 'zod';

/**
 * Validation Schemas
 */

const registerPartnerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  companyName: z.string().min(1),
  contactPerson: z.string().min(1),
  phone: z.string().min(1),
  businessType: z.enum([
    'education_consultant',
    'immigration_firm',
    'language_school',
    'travel_agency',
    'career_counselor',
    'individual_consultant',
    'other'
  ]).optional(),
  commissionRate: z.number().min(0).max(100).optional()
});

const updatePartnerProfileSchema = z.object({
  companyName: z.string().min(1).optional(),
  contactPerson: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  whatsappNumber: z.string().optional(),
  website: z.string().url().optional(),
  address: z.string().optional(),
  bankDetails: z.any().optional(),
  paypalEmail: z.string().email().optional(),
  bio: z.string().optional()
});

const createReferralLinkSchema = z.object({
  campaignName: z.string().min(1).optional(),
  campaignSource: z.string().optional(),
  campaignMedium: z.string().optional(),
  description: z.string().optional(),
  expiresAt: z.string().datetime().optional()
});

const updateReferralLinkSchema = z.object({
  campaignName: z.string().min(1).optional(),
  campaignSource: z.string().optional(),
  campaignMedium: z.string().optional(),
  description: z.string().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional()
});

const createPayoutSchema = z.object({
  commissionIds: z.array(z.string()).min(1),
  payoutMethod: z.enum(['bank_transfer', 'paypal', 'check']),
  notes: z.string().optional()
});

/**
 * Partner Controller
 * 
 * Handles all partner-specific operations including registration, profile management,
 * dashboard statistics, referral link management, and commission/payout tracking.
 * 
 * Follows Phase 3 modularization standards:
 * - Thin controller (HTTP concerns only)
 * - Zod validation for all inputs
 * - Service layer delegation for business logic
 * - Standardized error handling
 * 
 * @class PartnerController
 * @extends {BaseController}
 */
export class PartnerController extends BaseController {
  /**
   * Register a new partner account
   * 
   * @route POST /api/partner/register
   * @access Public
   * @param {Request} req - Express request object containing registration data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns partner data and referral link
   * 
   * @example
   * // Request body:
   * {
   *   "email": "partner@example.com",
   *   "password": "SecurePass123",
   *   "firstName": "John",
   *   "lastName": "Doe",
   *   "companyName": "Education Consultants Ltd",
   *   "contactPerson": "John Doe",
   *   "phone": "+1234567890",
   *   "businessType": "education_consultant"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {409} Conflict if email already exists
   */
  async registerPartner(req: Request, res: Response) {
    try {
      const validatedData = registerPartnerSchema.parse(req.body);

      const partnerService = getService<IPartnerService>(TYPES.IPartnerService);
      const result = await partnerService.registerPartner(validatedData);

      res.status(201);
      return this.sendSuccess(res, result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'PartnerController.registerPartner');
    }
  }

  /**
   * Get partner profile
   * 
   * @route GET /api/partner/profile
   * @access Partner
   * @param {AuthenticatedRequest} req - Express request object with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns partner profile data
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not a partner
   * @throws {404} Not found if partner profile doesn't exist
   */
  async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);

      const partnerService = getService<IPartnerService>(TYPES.IPartnerService);
      const profile = await partnerService.getPartnerByUserId(userId);

      return this.sendSuccess(res, profile);
    } catch (error: any) {
      return this.handleError(res, error, 'PartnerController.getProfile');
    }
  }

  /**
   * Update partner profile
   * 
   * @route PUT /api/partner/profile
   * @access Partner
   * @param {AuthenticatedRequest} req - Express request object with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated partner profile
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not a partner
   * @throws {404} Not found if partner profile doesn't exist
   * @throws {422} Validation error if input is invalid
   */
  async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const validatedData = updatePartnerProfileSchema.parse(req.body);

      const partnerService = getService<IPartnerService>(TYPES.IPartnerService);
      const partner = await partnerService.getPartnerByUserId(userId);
      const updated = await partnerService.updatePartnerProfile(partner.id, validatedData);

      return this.sendSuccess(res, updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'PartnerController.updateProfile');
    }
  }

  /**
   * Get partner dashboard statistics
   * 
   * @route GET /api/partner/dashboard
   * @access Partner
   * @param {AuthenticatedRequest} req - Express request object with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns dashboard statistics
   * 
   * @example
   * // Response:
   * {
   *   "success": true,
   *   "data": {
   *     "totalReferrals": 45,
   *     "totalConversions": 12,
   *     "conversionRate": 26.67,
   *     "totalClicks": 320,
   *     "uniqueClicks": 245,
   *     "clickToRegistrationRate": 18.37,
   *     "totalCommissionEarned": 125000.00,
   *     "totalCommissionPaid": 85000.00,
   *     "pendingCommission": 40000.00,
   *     "currentMonthReferrals": 8,
   *     "currentMonthConversions": 3,
   *     "activeLinks": 5
   *   }
   * }
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not a partner
   */
  async getDashboardStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);

      const partnerService = getService<IPartnerService>(TYPES.IPartnerService);
      const partner = await partnerService.getPartnerByUserId(userId);
      const stats = await partnerService.getDashboardStats(partner.id);

      return this.sendSuccess(res, stats);
    } catch (error: any) {
      return this.handleError(res, error, 'PartnerController.getDashboardStats');
    }
  }

  /**
   * Create a new referral link
   * 
   * @route POST /api/partner/referral-links
   * @access Partner
   * @param {AuthenticatedRequest} req - Express request object with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created referral link with full URL
   * 
   * @example
   * // Request body:
   * {
   *   "campaignName": "Summer 2024",
   *   "campaignSource": "instagram",
   *   "campaignMedium": "social",
   *   "description": "Instagram summer campaign",
   *   "expiresAt": "2024-12-31T23:59:59Z"
   * }
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not a partner
   * @throws {422} Validation error if input is invalid
   */
  async createReferralLink(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const validatedData = createReferralLinkSchema.parse(req.body);

      const partnerService = getService<IPartnerService>(TYPES.IPartnerService);
      const partner = await partnerService.getPartnerByUserId(userId);

      const referralLinkService = getService<IReferralLinkService>(TYPES.IReferralLinkService);
      const result = await referralLinkService.createReferralLink(partner.id, validatedData);

      res.status(201);
      return this.sendSuccess(res, result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'PartnerController.createReferralLink');
    }
  }

  /**
   * Get all referral links for partner
   * 
   * @route GET /api/partner/referral-links
   * @access Partner
   * @param {AuthenticatedRequest} req - Express request object with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of referral links with statistics
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not a partner
   */
  async getReferralLinks(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);

      const partnerService = getService<IPartnerService>(TYPES.IPartnerService);
      const partner = await partnerService.getPartnerByUserId(userId);

      const referralLinkService = getService<IReferralLinkService>(TYPES.IReferralLinkService);
      const links = await referralLinkService.getReferralLinks(partner.id);

      return this.sendSuccess(res, links);
    } catch (error: any) {
      return this.handleError(res, error, 'PartnerController.getReferralLinks');
    }
  }

  /**
   * Update a referral link
   * 
   * @route PUT /api/partner/referral-links/:linkId
   * @access Partner
   * @param {AuthenticatedRequest} req - Express request object with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated referral link
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not a partner or doesn't own the link
   * @throws {404} Not found if link doesn't exist
   * @throws {422} Validation error if input is invalid
   */
  async updateReferralLink(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const { linkId } = req.params;
      const validatedData = updateReferralLinkSchema.parse(req.body);

      const partnerService = getService<IPartnerService>(TYPES.IPartnerService);
      const partner = await partnerService.getPartnerByUserId(userId);

      const referralLinkService = getService<IReferralLinkService>(TYPES.IReferralLinkService);
      const updated = await referralLinkService.updateReferralLink(linkId, validatedData);

      return this.sendSuccess(res, updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'PartnerController.updateReferralLink');
    }
  }

  /**
   * Deactivate a referral link
   * 
   * @route DELETE /api/partner/referral-links/:linkId
   * @access Partner
   * @param {AuthenticatedRequest} req - Express request object with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns success message
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not a partner or doesn't own the link
   * @throws {404} Not found if link doesn't exist
   */
  async deactivateReferralLink(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const { linkId } = req.params;

      const partnerService = getService<IPartnerService>(TYPES.IPartnerService);
      const partner = await partnerService.getPartnerByUserId(userId);

      const referralLinkService = getService<IReferralLinkService>(TYPES.IReferralLinkService);
      await referralLinkService.updateReferralLink(linkId, { isActive: false });

      return this.sendSuccess(res, { message: 'Referral link deactivated successfully' });
    } catch (error: any) {
      return this.handleError(res, error, 'PartnerController.deactivateReferralLink');
    }
  }

  /**
   * Get all student referrals for partner
   * 
   * @route GET /api/partner/referrals
   * @access Partner
   * @param {AuthenticatedRequest} req - Express request object with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of student referrals
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not a partner
   */
  async getReferrals(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);

      const partnerService = getService<IPartnerService>(TYPES.IPartnerService);
      const partner = await partnerService.getPartnerByUserId(userId);

      const referralRepo = getService<IPartnerStudentReferralRepository>(TYPES.IPartnerStudentReferralRepository);
      const referrals = await referralRepo.findByPartnerId(partner.id);

      return this.sendSuccess(res, referrals);
    } catch (error: any) {
      return this.handleError(res, error, 'PartnerController.getReferrals');
    }
  }

  /**
   * Get all commissions for partner
   * 
   * @route GET /api/partner/commissions
   * @access Partner
   * @param {AuthenticatedRequest} req - Express request object with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of all commissions with details
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not a partner
   */
  async getCommissions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);

      const partnerService = getService<IPartnerService>(TYPES.IPartnerService);
      const partner = await partnerService.getPartnerByUserId(userId);

      const commissionService = getService<ICommissionService>(TYPES.ICommissionService);
      const commissions = await commissionService.getCommissionHistory(partner.id);

      return this.sendSuccess(res, commissions);
    } catch (error: any) {
      return this.handleError(res, error, 'PartnerController.getCommissions');
    }
  }

  /**
   * Get pending commissions for partner
   * 
   * @route GET /api/partner/commissions/pending
   * @access Partner
   * @param {AuthenticatedRequest} req - Express request object with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of pending commissions
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not a partner
   */
  async getPendingCommissions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);

      const partnerService = getService<IPartnerService>(TYPES.IPartnerService);
      const partner = await partnerService.getPartnerByUserId(userId);

      const commissionService = getService<ICommissionService>(TYPES.ICommissionService);
      const commissions = await commissionService.getPendingCommissions(partner.id);

      return this.sendSuccess(res, commissions);
    } catch (error: any) {
      return this.handleError(res, error, 'PartnerController.getPendingCommissions');
    }
  }

  /**
   * Get commission history for partner (approved/rejected/paid)
   * 
   * @route GET /api/partner/commissions/history
   * @access Partner
   * @param {AuthenticatedRequest} req - Express request object with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of processed commissions
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not a partner
   */
  async getCommissionHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);

      const partnerService = getService<IPartnerService>(TYPES.IPartnerService);
      const partner = await partnerService.getPartnerByUserId(userId);

      const commissionService = getService<ICommissionService>(TYPES.ICommissionService);
      const commissions = await commissionService.getCommissionHistory(partner.id);

      return this.sendSuccess(res, commissions);
    } catch (error: any) {
      return this.handleError(res, error, 'PartnerController.getCommissionHistory');
    }
  }

  /**
   * Get payout history for partner
   * 
   * @route GET /api/partner/payouts
   * @access Partner
   * @param {AuthenticatedRequest} req - Express request object with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of payouts with commission details
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not a partner
   */
  async getPayouts(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);

      const partnerService = getService<IPartnerService>(TYPES.IPartnerService);
      const partner = await partnerService.getPartnerByUserId(userId);

      const payoutService = getService<IPayoutService>(TYPES.IPayoutService);
      const payouts = await payoutService.getPayoutHistory(partner.id);

      return this.sendSuccess(res, payouts);
    } catch (error: any) {
      return this.handleError(res, error, 'PartnerController.getPayouts');
    }
  }

  /**
   * Request a payout
   * 
   * @route POST /api/partner/payouts
   * @access Partner
   * @param {AuthenticatedRequest} req - Express request object with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created payout request
   * 
   * @example
   * // Request body:
   * {
   *   "commissionIds": ["uuid1", "uuid2", "uuid3"],
   *   "payoutMethod": "bank_transfer",
   *   "notes": "Monthly payout request"
   * }
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not a partner
   * @throws {422} Validation error if input is invalid or amount below minimum
   */
  async createPayout(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const validatedData = createPayoutSchema.parse(req.body);

      const partnerService = getService<IPartnerService>(TYPES.IPartnerService);
      const partner = await partnerService.getPartnerByUserId(userId);

      const payoutService = getService<IPayoutService>(TYPES.IPayoutService);
      const payout = await payoutService.createPayout(
        partner.id,
        validatedData.commissionIds,
        validatedData.payoutMethod,
        validatedData.notes
      );

      res.status(201);
      return this.sendSuccess(res, payout);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'PartnerController.createPayout');
    }
  }
}

export const partnerController = new PartnerController();
