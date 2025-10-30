import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { getService, TYPES } from '../services/container';
import { ISubscriptionService } from '../services/domain/subscription.service';
import { IUserSubscriptionService } from '../services/domain/user-subscription.service';
import { AuthenticatedRequest } from '../types/auth';
import { z } from 'zod';

const subscribeSchema = z.object({
  planId: z.string().min(1)
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
}

export const subscriptionController = new SubscriptionController();
