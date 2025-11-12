import { Response } from 'express';
import { BaseController } from './base.controller';
import { getService, TYPES } from '../services/container';
import { IPartnerService } from '../services/domain/partner.service';
import { ICommissionService } from '../services/domain/commission.service';
import { IPayoutService } from '../services/domain/payout.service';
import { IPartnerStudentReferralRepository, IPartnerCommissionRepository, IPartnerPayoutRepository } from '../repositories';
import { AuthenticatedRequest } from '../types/auth';
import { z } from 'zod';

/**
 * Validation Schemas
 */

const verifyPartnerSchema = z.object({
  partnerId: z.string().uuid()
});

const deactivatePartnerSchema = z.object({
  partnerId: z.string().uuid(),
  reason: z.string().min(1)
});

const approveReferralSchema = z.object({
  referralId: z.string().uuid()
});

const rejectReferralSchema = z.object({
  referralId: z.string().uuid(),
  reason: z.string().min(1)
});

const approveCommissionsSchema = z.object({
  commissionIds: z.array(z.string().uuid()).min(1)
});

const rejectCommissionsSchema = z.object({
  commissionIds: z.array(z.string().uuid()).min(1),
  reason: z.string().min(1)
});

const processPayoutBankTransferSchema = z.object({
  payoutId: z.string().uuid(),
  referenceNumber: z.string().min(1)
});

const processPayoutPayPalSchema = z.object({
  payoutId: z.string().uuid(),
  transactionId: z.string().min(1)
});

const completePayoutSchema = z.object({
  payoutId: z.string().uuid()
});

const cancelPayoutSchema = z.object({
  payoutId: z.string().uuid(),
  reason: z.string().min(1)
});

/**
 * Admin Partner Controller
 * 
 * Handles all administrative operations for the partner system including partner verification,
 * referral management, commission approval, and payout processing.
 * 
 * Follows Phase 3 modularization standards:
 * - Thin controller (HTTP concerns only)
 * - Zod validation for all inputs
 * - Service layer delegation for business logic
 * - Standardized error handling
 * - Admin-only access via requireAdmin middleware
 * 
 * @class AdminPartnerController
 * @extends {BaseController}
 */
export class AdminPartnerController extends BaseController {
  /**
   * Get all partners with user details
   * 
   * @route GET /api/admin/partners
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with authenticated admin
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of all partners with user details
   * 
   * @example
   * // Response:
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "id": "uuid",
   *       "userId": "uuid",
   *       "companyName": "Education Consultants Ltd",
   *       "contactPerson": "John Doe",
   *       "isVerified": true,
   *       "isActive": true,
   *       "user": {
   *         "email": "partner@example.com",
   *         "firstName": "John",
   *         "lastName": "Doe",
   *         "accountStatus": "active"
   *       }
   *     }
   *   ]
   * }
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getAllPartners(req: AuthenticatedRequest, res: Response) {
    try {
      const partnerService = getService<IPartnerService>(TYPES.IPartnerService);
      const partners = await partnerService.getAllPartners();

      return this.sendSuccess(res, partners);
    } catch (error: any) {
      return this.handleError(res, error, 'AdminPartnerController.getAllPartners');
    }
  }

  /**
   * Get partner details by ID
   * 
   * @route GET /api/admin/partners/:partnerId
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with authenticated admin
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns detailed partner information
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Not found if partner doesn't exist
   */
  async getPartnerDetails(req: AuthenticatedRequest, res: Response) {
    try {
      const { partnerId } = req.params;

      const partnerService = getService<IPartnerService>(TYPES.IPartnerService);
      const partner = await partnerService.getPartnerProfile(partnerId);

      return this.sendSuccess(res, partner);
    } catch (error: any) {
      return this.handleError(res, error, 'AdminPartnerController.getPartnerDetails');
    }
  }

  /**
   * Verify a partner account
   * 
   * @route POST /api/admin/partners/verify
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with authenticated admin
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated partner profile
   * 
   * @example
   * // Request body:
   * {
   *   "partnerId": "uuid"
   * }
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Not found if partner doesn't exist
   * @throws {422} Validation error if partner is already verified
   */
  async verifyPartner(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = this.getUserId(req);
      const validatedData = verifyPartnerSchema.parse(req.body);

      const partnerService = getService<IPartnerService>(TYPES.IPartnerService);
      const updated = await partnerService.verifyPartner(validatedData.partnerId, adminId);

      return this.sendSuccess(res, updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminPartnerController.verifyPartner');
    }
  }

  /**
   * Deactivate a partner account
   * 
   * @route POST /api/admin/partners/deactivate
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with authenticated admin
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated partner profile
   * 
   * @example
   * // Request body:
   * {
   *   "partnerId": "uuid",
   *   "reason": "Fraudulent activity detected"
   * }
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Not found if partner doesn't exist
   * @throws {422} Validation error if input is invalid
   */
  async deactivatePartner(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = this.getUserId(req);
      const validatedData = deactivatePartnerSchema.parse(req.body);

      const partnerService = getService<IPartnerService>(TYPES.IPartnerService);
      const updated = await partnerService.deactivatePartner(
        validatedData.partnerId,
        adminId,
        validatedData.reason
      );

      return this.sendSuccess(res, updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminPartnerController.deactivatePartner');
    }
  }

  /**
   * Get all student referrals across all partners
   * 
   * @route GET /api/admin/partners/referrals
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with authenticated admin
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of all student referrals
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getAllReferrals(req: AuthenticatedRequest, res: Response) {
    try {
      const referralRepo = getService<IPartnerStudentReferralRepository>(TYPES.IPartnerStudentReferralRepository);
      const referrals = await referralRepo.findAll();

      return this.sendSuccess(res, referrals);
    } catch (error: any) {
      return this.handleError(res, error, 'AdminPartnerController.getAllReferrals');
    }
  }

  /**
   * Approve a student referral
   * 
   * @route POST /api/admin/partners/referrals/approve
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with authenticated admin
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated referral
   * 
   * @example
   * // Request body:
   * {
   *   "referralId": "uuid"
   * }
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Not found if referral doesn't exist
   * @throws {422} Validation error if input is invalid
   */
  async approveReferral(req: AuthenticatedRequest, res: Response) {
    try {
      const validatedData = approveReferralSchema.parse(req.body);

      const referralRepo = getService<IPartnerStudentReferralRepository>(TYPES.IPartnerStudentReferralRepository);
      const updated = await referralRepo.updateStatus(validatedData.referralId, 'converted');

      return this.sendSuccess(res, updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminPartnerController.approveReferral');
    }
  }

  /**
   * Reject a student referral
   * 
   * @route POST /api/admin/partners/referrals/reject
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with authenticated admin
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated referral
   * 
   * @example
   * // Request body:
   * {
   *   "referralId": "uuid",
   *   "reason": "Invalid referral source"
   * }
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {404} Not found if referral doesn't exist
   * @throws {422} Validation error if input is invalid
   */
  async rejectReferral(req: AuthenticatedRequest, res: Response) {
    try {
      const validatedData = rejectReferralSchema.parse(req.body);

      const referralRepo = getService<IPartnerStudentReferralRepository>(TYPES.IPartnerStudentReferralRepository);
      const updated = await referralRepo.updateStatus(
        validatedData.referralId,
        'rejected',
        validatedData.reason
      );

      return this.sendSuccess(res, updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminPartnerController.rejectReferral');
    }
  }

  /**
   * Get all pending commissions across all partners
   * 
   * @route GET /api/admin/partners/commissions/pending
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with authenticated admin
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of pending commissions
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getPendingCommissions(req: AuthenticatedRequest, res: Response) {
    try {
      const commissionRepo = getService<IPartnerCommissionRepository>(TYPES.IPartnerCommissionRepository);
      const commissions = await commissionRepo.findPending();

      return this.sendSuccess(res, commissions);
    } catch (error: any) {
      return this.handleError(res, error, 'AdminPartnerController.getPendingCommissions');
    }
  }

  /**
   * Approve multiple commissions
   * 
   * @route POST /api/admin/partners/commissions/approve
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with authenticated admin
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of approved commissions
   * 
   * @example
   * // Request body:
   * {
   *   "commissionIds": ["uuid1", "uuid2", "uuid3"]
   * }
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {422} Validation error if input is invalid
   */
  async approveCommissions(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = this.getUserId(req);
      const validatedData = approveCommissionsSchema.parse(req.body);

      const commissionService = getService<ICommissionService>(TYPES.ICommissionService);
      const approved = await commissionService.approveCommissions(validatedData.commissionIds, adminId);

      return this.sendSuccess(res, approved);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminPartnerController.approveCommissions');
    }
  }

  /**
   * Reject multiple commissions
   * 
   * @route POST /api/admin/partners/commissions/reject
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with authenticated admin
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of rejected commissions
   * 
   * @example
   * // Request body:
   * {
   *   "commissionIds": ["uuid1", "uuid2"],
   *   "reason": "Fraudulent referrals detected"
   * }
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {422} Validation error if input is invalid
   */
  async rejectCommissions(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = this.getUserId(req);
      const validatedData = rejectCommissionsSchema.parse(req.body);

      const commissionService = getService<ICommissionService>(TYPES.ICommissionService);
      const rejected = await commissionService.rejectCommissions(
        validatedData.commissionIds,
        adminId,
        validatedData.reason
      );

      return this.sendSuccess(res, rejected);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminPartnerController.rejectCommissions');
    }
  }

  /**
   * Get all pending payouts across all partners
   * 
   * @route GET /api/admin/partners/payouts/pending
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with authenticated admin
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of pending payouts
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   */
  async getPendingPayouts(req: AuthenticatedRequest, res: Response) {
    try {
      const payoutRepo = getService<IPartnerPayoutRepository>(TYPES.IPartnerPayoutRepository);
      const payouts = await payoutRepo.findPending();

      return this.sendSuccess(res, payouts);
    } catch (error: any) {
      return this.handleError(res, error, 'AdminPartnerController.getPendingPayouts');
    }
  }

  /**
   * Process payout via bank transfer
   * 
   * @route POST /api/admin/partners/payouts/process-bank-transfer
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with authenticated admin
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated payout
   * 
   * @example
   * // Request body:
   * {
   *   "payoutId": "uuid",
   *   "referenceNumber": "TXN123456789"
   * }
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {422} Validation error if input is invalid
   */
  async processPayoutBankTransfer(req: AuthenticatedRequest, res: Response) {
    try {
      const validatedData = processPayoutBankTransferSchema.parse(req.body);

      const payoutService = getService<IPayoutService>(TYPES.IPayoutService);
      const updated = await payoutService.processPayoutBankTransfer(
        validatedData.payoutId,
        validatedData.referenceNumber
      );

      return this.sendSuccess(res, updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminPartnerController.processPayoutBankTransfer');
    }
  }

  /**
   * Process payout via PayPal
   * 
   * @route POST /api/admin/partners/payouts/process-paypal
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with authenticated admin
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns updated payout
   * 
   * @example
   * // Request body:
   * {
   *   "payoutId": "uuid",
   *   "transactionId": "PP123456789"
   * }
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {422} Validation error if input is invalid
   */
  async processPayoutPayPal(req: AuthenticatedRequest, res: Response) {
    try {
      const validatedData = processPayoutPayPalSchema.parse(req.body);

      const payoutService = getService<IPayoutService>(TYPES.IPayoutService);
      const updated = await payoutService.processPayoutPayPal(
        validatedData.payoutId,
        validatedData.transactionId
      );

      return this.sendSuccess(res, updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminPartnerController.processPayoutPayPal');
    }
  }

  /**
   * Complete a payout
   * 
   * @route POST /api/admin/partners/payouts/complete
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with authenticated admin
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns completed payout
   * 
   * @example
   * // Request body:
   * {
   *   "payoutId": "uuid"
   * }
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {422} Validation error if payout is not in processing status
   */
  async completePayout(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = this.getUserId(req);
      const validatedData = completePayoutSchema.parse(req.body);

      const payoutService = getService<IPayoutService>(TYPES.IPayoutService);
      const completed = await payoutService.completePayout(validatedData.payoutId, adminId);

      return this.sendSuccess(res, completed);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminPartnerController.completePayout');
    }
  }

  /**
   * Cancel a payout
   * 
   * @route POST /api/admin/partners/payouts/cancel
   * @access Admin
   * @param {AuthenticatedRequest} req - Express request object with authenticated admin
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns cancelled payout
   * 
   * @example
   * // Request body:
   * {
   *   "payoutId": "uuid",
   *   "reason": "Invalid bank details"
   * }
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {403} Forbidden if user is not an admin
   * @throws {422} Validation error if input is invalid or payout is already completed
   */
  async cancelPayout(req: AuthenticatedRequest, res: Response) {
    try {
      const adminId = this.getUserId(req);
      const validatedData = cancelPayoutSchema.parse(req.body);

      const payoutService = getService<IPayoutService>(TYPES.IPayoutService);
      const cancelled = await payoutService.cancelPayout(
        validatedData.payoutId,
        adminId,
        validatedData.reason
      );

      return this.sendSuccess(res, cancelled);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AdminPartnerController.cancelPayout');
    }
  }
}

export const adminPartnerController = new AdminPartnerController();
