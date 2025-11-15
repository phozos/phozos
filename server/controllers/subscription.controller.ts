import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { getService, TYPES } from '../services/container';
import { ISubscriptionService } from '../services/domain/subscription.service';
import { IUserSubscriptionService } from '../services/domain/user-subscription.service';
import { IPlanMigrationService } from '../services/domain/plan-migration.service';
import { ICancellationService } from '../services/domain/cancellation.service';
import { IRefundService } from '../services/domain/refund.service';
import { IDisputeService } from '../services/domain/dispute.service';
import { AuthenticatedRequest } from '../types/auth';
import { z } from 'zod';

const subscribeSchema = z.object({
  planId: z.string().min(1)
});

const createCancellationRequestSchema = z.object({
  subscriptionId: z.string().uuid(),
  reason: z.string().min(10).max(1000)
});

const createRefundRequestSchema = z.object({
  subscriptionId: z.string().uuid(),
  paymentId: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  reason: z.string().min(10).max(1000)
});

const createDisputeSchema = z.object({
  subscriptionId: z.string().uuid(),
  paymentId: z.string().uuid(),
  type: z.enum(['chargeback', 'dispute']),
  reason: z.string().min(10).max(2000),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/)
});

/**
 * Subscription Controller
 * 
 * Handles subscription plan management and user subscription operations.
 * Follows Phase 3 modularization standards:
 * - Thin controller (HTTP concerns only)
 * - Zod validation for all inputs
 * - Service layer delegation for business logic
 * - Standardized error handling
 * 
 * @class SubscriptionController
 * @extends {BaseController}
 */
export class SubscriptionController extends BaseController {
  /**
   * Get all available subscription plans
   * 
   * @route GET /api/subscriptions/plans
   * @access Public
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of subscription plans
   * 
   * @throws {500} Internal server error
   */
  async getPublicPlans(req: Request, res: Response) {
    try {
      const subscriptionService = getService<ISubscriptionService>(TYPES.ISubscriptionService);
      const plans = await subscriptionService.getSubscriptionPlans();
      return this.sendSuccess(res, plans);
    } catch (error) {
      return this.handleError(res, error, 'SubscriptionController.getPublicPlans');
    }
  }

  /**
   * Get a subscription plan by ID
   * 
   * @route GET /api/subscriptions/plans/:id
   * @access Public
   * @param {Request} req - Express request object with plan ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns subscription plan details
   * 
   * @throws {404} Not found if plan doesn't exist
   * @throws {500} Internal server error
   */
  async getPlanById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const subscriptionService = getService<ISubscriptionService>(TYPES.ISubscriptionService);
      const plan = await subscriptionService.getSubscriptionPlan(id);
      
      if (!plan) {
        return this.sendError(res, 404, 'PLAN_NOT_FOUND', 'Subscription plan not found');
      }
      
      return this.sendSuccess(res, plan);
    } catch (error) {
      return this.handleError(res, error, 'SubscriptionController.getPlanById');
    }
  }

  /**
   * Get subscription status for a specific student
   * 
   * @route GET /api/subscriptions/status/:studentId
   * @access Public
   * @param {Request} req - Express request object with student ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns student's subscription status
   * 
   * @throws {500} Internal server error
   */
  async getSubscriptionStatus(req: Request, res: Response) {
    try {
      const { studentId } = req.params;
      const userSubscriptionService = getService<IUserSubscriptionService>(TYPES.IUserSubscriptionService);
      const status = await userSubscriptionService.getCurrentSubscription(studentId);
      
      return this.sendSuccess(res, status || { status: 'inactive', plan: null });
    } catch (error) {
      return this.handleError(res, error, 'SubscriptionController.getSubscriptionStatus');
    }
  }

  /**
   * Get current subscription for the authenticated user
   * 
   * @route GET /api/subscriptions/my-subscription
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns user's current subscription
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getUserSubscription(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const userSubscriptionService = getService<IUserSubscriptionService>(TYPES.IUserSubscriptionService);
      const subscription = await userSubscriptionService.getCurrentSubscription(userId);
      
      return this.sendSuccess(res, subscription || { status: 'inactive', plan: null });
    } catch (error) {
      return this.handleError(res, error, 'SubscriptionController.getUserSubscription');
    }
  }

  /**
   * Subscribe the authenticated user to a plan
   * 
   * @route POST /api/subscriptions/subscribe
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user and plan ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created subscription
   * 
   * @example
   * // Request body:
   * {
   *   "planId": "plan-premium-001"
   * }
   * 
   * @throws {422} Validation error if plan ID is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async createSubscription(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const { planId } = subscribeSchema.parse(req.body);
      
      const userSubscriptionService = getService<IUserSubscriptionService>(TYPES.IUserSubscriptionService);
      const subscription = await userSubscriptionService.subscribeUserToPlan(userId, planId);
      res.status(201);
      return this.sendSuccess(res, subscription);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'SubscriptionController.createSubscription');
    }
  }

  /**
   * Subscribe user to a subscription plan
   * 
   * @route POST /api/subscription/user/subscribe
   * @access Private (requires authentication)
   * @param {AuthenticatedRequest} req - Request with authenticated user and plan ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created subscription
   * 
   * @example
   * // Request body:
   * {
   *   "planId": "plan-premium-001"
   * }
   * 
   * @throws {422} Validation error if plan ID is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async subscribe(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return this.sendError(res, 401, 'UNAUTHORIZED', 'User not authenticated');
      }

      const { planId } = subscribeSchema.parse(req.body);
      
      const userSubscriptionService = getService<IUserSubscriptionService>(TYPES.IUserSubscriptionService);
      const subscription = await userSubscriptionService.subscribeUserToPlan(userId, planId);
      
      res.status(201);
      return this.sendSuccess(res, subscription);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'SubscriptionController.subscribe');
    }
  }

  /**
   * Upgrade user subscription to a higher tier plan
   * 
   * @route POST /api/subscription/upgrade
   * @access Private (requires authentication)
   * @param {AuthenticatedRequest} req - Request with authenticated user and plan ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns upgraded subscription
   * 
   * @example
   * // Request body:
   * {
   *   "planId": "plan-premium-001"
   * }
   * 
   * @throws {400} Missing plan ID
   * @throws {403} Upgrade not allowed (downgrade or same tier)
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async upgradeSubscription(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const { planId } = req.body;

      if (!planId) {
        return this.sendError(res, 400, 'MISSING_PLAN_ID', 'Plan ID is required');
      }

      const userSubscriptionService = getService<IUserSubscriptionService>(TYPES.IUserSubscriptionService);
      const subscription = await userSubscriptionService.upgradeSubscription(userId, planId);
      
      return this.sendSuccess(res, subscription);
    } catch (error: any) {
      if (error.name === 'InvalidOperationError') {
        return this.sendError(res, 403, 'UPGRADE_NOT_ALLOWED', error.message);
      }
      return this.handleError(res, error, 'SubscriptionController.upgradeSubscription');
    }
  }

  /**
   * Get effective price for the authenticated user's subscription
   * 
   * @route GET /api/subscription/effective-price
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns effective price and price update offer information
   * 
   * @description
   * Returns the user's effective subscription price (grandfathered if applicable)
   * and information about whether they can benefit from a price drop.
   * 
   * @example
   * // Response:
   * {
   *   "effectivePrice": 7999,
   *   "priceUpdate": {
   *     "shouldOffer": true,
   *     "currentPrice": 7999,
   *     "newPrice": 6999,
   *     "savings": 1000
   *   }
   * }
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getMyEffectivePrice(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const userSubscriptionService = getService<IUserSubscriptionService>(TYPES.IUserSubscriptionService);
      
      const effectivePrice = await userSubscriptionService.getEffectivePrice(userId);
      const priceUpdate = await userSubscriptionService.shouldOfferPriceUpdate(userId);
      
      return this.sendSuccess(res, {
        effectivePrice,
        priceUpdate
      });
    } catch (error) {
      return this.handleError(res, error, 'SubscriptionController.getMyEffectivePrice');
    }
  }

  /**
   * Get unread plan notifications for the authenticated user
   * 
   * @route GET /api/subscription/plan-notifications/unread
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of unread plan notifications
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getUnreadPlanNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const planNotificationService = getService<any>(TYPES.IPlanNotificationService);
      
      const notifications = await planNotificationService.getUnreadPlanNotifications(userId);
      
      return this.sendSuccess(res, notifications);
    } catch (error) {
      return this.handleError(res, error, 'SubscriptionController.getUnreadPlanNotifications');
    }
  }

  /**
   * Mark a plan notification as read
   * 
   * @route POST /api/subscription/plan-notifications/:notificationId/read
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user and notification ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns success response
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async markPlanNotificationRead(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const { notificationId } = req.params;
      
      const planNotificationService = getService<any>(TYPES.IPlanNotificationService);
      await planNotificationService.markPlanNotificationRead(userId, notificationId);
      
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, 'SubscriptionController.markPlanNotificationRead');
    }
  }

  /**
   * Acknowledge a plan change notification
   * 
   * @route POST /api/subscription/plan-notifications/:notificationId/acknowledge
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user and notification ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns success response
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async acknowledgePlanChange(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const { notificationId } = req.params;
      
      const planNotificationService = getService<any>(TYPES.IPlanNotificationService);
      await planNotificationService.acknowledgePlanChange(userId, notificationId);
      
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, 'SubscriptionController.acknowledgePlanChange');
    }
  }

  async getMigrationOffer(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const planMigrationService = getService<IPlanMigrationService>(TYPES.IPlanMigrationService);
      
      const offer = await planMigrationService.getUserMigrationOffer(userId);
      
      return this.sendSuccess(res, offer);
    } catch (error) {
      return this.handleError(res, error, 'SubscriptionController.getMigrationOffer');
    }
  }

  async acceptMigration(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const { migrationId } = req.params;
      
      const planMigrationService = getService<IPlanMigrationService>(TYPES.IPlanMigrationService);
      await planMigrationService.processMigrationAcceptance(migrationId, userId);
      
      return this.sendSuccess(res, { message: 'Migration accepted successfully' });
    } catch (error) {
      return this.handleError(res, error, 'SubscriptionController.acceptMigration');
    }
  }

  async declineMigration(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const { migrationId } = req.params;
      const { reason } = req.body;
      
      const planMigrationService = getService<IPlanMigrationService>(TYPES.IPlanMigrationService);
      await planMigrationService.processMigrationDecline(migrationId, userId, reason);
      
      return this.sendSuccess(res, { message: 'Migration declined' });
    } catch (error) {
      return this.handleError(res, error, 'SubscriptionController.declineMigration');
    }
  }

  async getUserSubscriptionHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const userSubscriptionService = getService<IUserSubscriptionService>(TYPES.IUserSubscriptionService);
      
      const history = await userSubscriptionService.getSubscriptionHistory(userId);
      
      return this.sendSuccess(res, history);
    } catch (error) {
      return this.handleError(res, error, 'SubscriptionController.getUserSubscriptionHistory');
    }
  }

  async createCancellationRequest(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const { subscriptionId, reason } = createCancellationRequestSchema.parse(req.body);
      
      const cancellationService = getService<ICancellationService>(TYPES.ICancellationService);
      const request = await cancellationService.createCancellationRequest({
        userId,
        subscriptionId,
        reason,
      });
      
      res.status(201);
      return this.sendSuccess(res, request);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'SubscriptionController.createCancellationRequest');
    }
  }

  async getUserCancellationRequests(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const cancellationService = getService<ICancellationService>(TYPES.ICancellationService);
      
      const requests = await cancellationService.getCancellationRequestsByUser(userId);
      
      return this.sendSuccess(res, requests);
    } catch (error) {
      return this.handleError(res, error, 'SubscriptionController.getUserCancellationRequests');
    }
  }

  async createRefundRequest(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const { subscriptionId, paymentId, amount, reason } = createRefundRequestSchema.parse(req.body);
      
      const refundService = getService<IRefundService>(TYPES.IRefundService);
      
      const eligibility = await refundService.isRefundEligible(paymentId);
      if (!eligibility.eligible) {
        return this.sendError(res, 400, 'REFUND_NOT_ELIGIBLE', eligibility.reason || 'Refund not eligible');
      }
      
      const request = await refundService.createRefundRequest({
        userId,
        subscriptionId,
        paymentId,
        amount,
        reason,
      });
      
      res.status(201);
      return this.sendSuccess(res, request);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'SubscriptionController.createRefundRequest');
    }
  }

  async getUserRefundRequests(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const refundService = getService<IRefundService>(TYPES.IRefundService);
      
      const requests = await refundService.getRefundsByUser(userId);
      
      return this.sendSuccess(res, requests);
    } catch (error) {
      return this.handleError(res, error, 'SubscriptionController.getUserRefundRequests');
    }
  }

  async createDispute(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const { subscriptionId, paymentId, type, reason, amount } = createDisputeSchema.parse(req.body);
      
      const disputeService = getService<IDisputeService>(TYPES.IDisputeService);
      const dispute = await disputeService.createDispute({
        userId,
        subscriptionId,
        paymentId,
        type,
        reason,
        amount,
      });
      
      res.status(201);
      return this.sendSuccess(res, dispute);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'SubscriptionController.createDispute');
    }
  }

  async getUserDisputes(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const disputeService = getService<IDisputeService>(TYPES.IDisputeService);
      
      const disputes = await disputeService.getDisputesByUser(userId);
      
      return this.sendSuccess(res, disputes);
    } catch (error) {
      return this.handleError(res, error, 'SubscriptionController.getUserDisputes');
    }
  }

  async checkRefundEligibility(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const { paymentId } = req.query;
      
      if (!paymentId || typeof paymentId !== 'string') {
        return this.sendError(res, 400, 'MISSING_PAYMENT_ID', 'Payment ID is required');
      }
      
      const refundService = getService<IRefundService>(TYPES.IRefundService);
      const eligibility = await refundService.isRefundEligible(paymentId);
      
      return this.sendSuccess(res, eligibility);
    } catch (error) {
      return this.handleError(res, error, 'SubscriptionController.checkRefundEligibility');
    }
  }
}

export const subscriptionController = new SubscriptionController();
