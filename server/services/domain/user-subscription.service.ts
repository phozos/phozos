import { BaseService } from '../base.service';
import { IUserSubscriptionRepository, ISubscriptionPlanRepository } from '../../repositories';
import { container, TYPES } from '../container';
import { UserSubscription, InsertUserSubscription } from '@shared/schema';
import { ValidationServiceError, InvalidOperationError } from '../errors';
import { CommonValidators } from '../validation';
import { NotFoundError } from '../../repositories/errors';
import { logger } from '../../utils/logger';

export interface IUserSubscriptionService {
  getCurrentSubscription(userId: string): Promise<UserSubscription | undefined>;
  getSubscriptionWithPlan(userId: string): Promise<any>;
  getSubscriptionWithPlanAndPayment(userId: string): Promise<any>;
  getAllSubscriptions(): Promise<any[]>;
  getSubscriptionHistory(userId: string): Promise<any[]>;
  createSubscription(subscription: InsertUserSubscription): Promise<UserSubscription>;
  updateSubscription(id: string, updates: Partial<UserSubscription>): Promise<UserSubscription | undefined>;
  cancelSubscription(subscriptionId: string): Promise<boolean>;
  validateUpgrade(currentSubscription: UserSubscription, targetPlanId: string): Promise<{ allowed: boolean; reason?: string }>;
  upgradeSubscription(userId: string, newPlanId: string): Promise<UserSubscription>;
  subscribeUserToPlan(userId: string, planId: string, orderId?: string): Promise<UserSubscription>;
  canPurchasePlan(userId: string, planId: string): Promise<{ allowed: boolean; reason?: string; requiresUpgrade?: boolean; currentPlan?: any }>;
  getEffectivePrice(userId: string): Promise<number | null>;
  shouldOfferPriceUpdate(userId: string): Promise<{ shouldOffer: boolean; currentPrice: number; newPrice: number; savings?: number }>;
}

export class UserSubscriptionService extends BaseService implements IUserSubscriptionService {
  constructor(
    private userSubscriptionRepo: IUserSubscriptionRepository = container.get<IUserSubscriptionRepository>(TYPES.IUserSubscriptionRepository),
    private subscriptionPlanRepo: ISubscriptionPlanRepository = container.get<ISubscriptionPlanRepository>(TYPES.ISubscriptionPlanRepository)
  ) {
    super();
  }

  async getCurrentSubscription(userId: string): Promise<UserSubscription | undefined> {
    try {
      // Use array of statuses to get any subscription, not just active
      return await this.userSubscriptionRepo.findByUser(userId, ['active', 'cancelled', 'expired', 'pending']);
    } catch (error) {
      return this.handleError(error, 'UserSubscriptionService.getCurrentSubscription');
    }
  }

  async getSubscriptionWithPlan(userId: string): Promise<any> {
    try {
      // Use array of statuses to get any subscription, not just active
      return await this.userSubscriptionRepo.findByUserWithPlan(userId, ['active', 'cancelled', 'expired', 'pending']);
    } catch (error) {
      return this.handleError(error, 'UserSubscriptionService.getSubscriptionWithPlan');
    }
  }

  async getSubscriptionWithPlanAndPayment(userId: string): Promise<any> {
    try {
      // Use array of statuses to get any subscription, not just active
      return await this.userSubscriptionRepo.findByUserWithPlanAndPayment(userId, ['active', 'cancelled', 'expired', 'pending']);
    } catch (error) {
      return this.handleError(error, 'UserSubscriptionService.getSubscriptionWithPlanAndPayment');
    }
  }

  async getAllSubscriptions(): Promise<any[]> {
    try {
      return await this.userSubscriptionRepo.findAllWithDetails();
    } catch (error) {
      return this.handleError(error, 'UserSubscriptionService.getAllSubscriptions');
    }
  }

  async getSubscriptionHistory(userId: string): Promise<any[]> {
    try {
      // Use array of statuses to get any subscription, not just active
      const subscription = await this.userSubscriptionRepo.findByUser(userId, ['active', 'cancelled', 'expired', 'pending']);
      if (!subscription) {
        return [];
      }
      
      const { subscriptionAuditService } = await import('../infrastructure/subscription-audit.service');
      return await subscriptionAuditService.getSubscriptionHistory(subscription.id);
    } catch (error) {
      return this.handleError(error, 'UserSubscriptionService.getSubscriptionHistory');
    }
  }

  async createSubscription(subscription: InsertUserSubscription): Promise<UserSubscription> {
    try {
      this.validateRequired(subscription, ['userId', 'planId']);

      const errors: Record<string, string> = {};

      const userIdValidation = CommonValidators.validateUUID(subscription.userId, 'User ID');
      if (!userIdValidation.valid) {
        errors.userId = userIdValidation.error!;
      }

      const planIdValidation = CommonValidators.validateUUID(subscription.planId, 'Plan ID');
      if (!planIdValidation.valid) {
        errors.planId = planIdValidation.error!;
      }

      if (subscription.startedAt && subscription.expiresAt) {
        const dateRangeValidation = CommonValidators.validateDateRange(
          new Date(subscription.startedAt),
          new Date(subscription.expiresAt)
        );
        if (!dateRangeValidation.valid) {
          errors.dateRange = dateRangeValidation.error!;
        }
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('User Subscription', errors);
      }

      return await this.userSubscriptionRepo.create(subscription);
    } catch (error) {
      return this.handleError(error, 'UserSubscriptionService.createSubscription');
    }
  }

  async updateSubscription(id: string, updates: Partial<UserSubscription>): Promise<UserSubscription | undefined> {
    try {
      const errors: Record<string, string> = {};

      if (updates.userId !== undefined) {
        const userIdValidation = CommonValidators.validateUUID(updates.userId, 'User ID');
        if (!userIdValidation.valid) {
          errors.userId = userIdValidation.error!;
        }
      }

      if (updates.planId !== undefined) {
        const planIdValidation = CommonValidators.validateUUID(updates.planId, 'Plan ID');
        if (!planIdValidation.valid) {
          errors.planId = planIdValidation.error!;
        }
      }

      if (updates.startedAt && updates.expiresAt) {
        const dateRangeValidation = CommonValidators.validateDateRange(
          new Date(updates.startedAt),
          new Date(updates.expiresAt)
        );
        if (!dateRangeValidation.valid) {
          errors.dateRange = dateRangeValidation.error!;
        }
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('User Subscription', errors);
      }

      return await this.userSubscriptionRepo.update(id, updates);
    } catch (error) {
      return this.handleError(error, 'UserSubscriptionService.updateSubscription');
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      const subscription = await this.userSubscriptionRepo.findByIdOptional(subscriptionId);
      if (!subscription) {
        return false;
      }

      await this.userSubscriptionRepo.update(subscriptionId, {
        status: 'cancelled',
        expiresAt: new Date()
      });

      return true;
    } catch (error) {
      return this.handleError(error, 'UserSubscriptionService.cancelSubscription');
    }
  }

  async validateUpgrade(
    currentSubscription: UserSubscription,
    targetPlanId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const targetPlan = await this.subscriptionPlanRepo.findById(targetPlanId);
      if (!targetPlan) {
        throw new NotFoundError('Subscription Plan', targetPlanId);
      }

      const currentPlan = await this.subscriptionPlanRepo.findById(currentSubscription.planId);
      if (!currentPlan) {
        throw new NotFoundError('Subscription Plan', currentSubscription.planId);
      }

      if (targetPlan.tierLevel <= currentPlan.tierLevel) {
        return {
          allowed: false,
          reason: `Cannot ${targetPlan.tierLevel < currentPlan.tierLevel ? 'downgrade' : 'switch to same tier'}. Only upgrades to higher tiers are allowed.`
        };
      }

      return { allowed: true };
    } catch (error) {
      return this.handleError(error, 'UserSubscriptionService.validateUpgrade');
    }
  }

  async upgradeSubscription(userId: string, newPlanId: string): Promise<UserSubscription> {
    try {
      const errors: Record<string, string> = {};

      const userIdValidation = CommonValidators.validateUUID(userId, 'User ID');
      if (!userIdValidation.valid) {
        errors.userId = userIdValidation.error!;
      }

      const planIdValidation = CommonValidators.validateUUID(newPlanId, 'Plan ID');
      if (!planIdValidation.valid) {
        errors.planId = planIdValidation.error!;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Subscription Upgrade', errors);
      }

      const currentSubscription = await this.userSubscriptionRepo.findByUser(userId);
      
      if (currentSubscription) {
        // Validate upgrade
        const validation = await this.validateUpgrade(currentSubscription, newPlanId);
        if (!validation.allowed) {
          throw new InvalidOperationError('upgrade subscription', validation.reason || 'Upgrade not allowed');
        }

        // Fetch new plan to get tierLevel
        const newPlan = await this.subscriptionPlanRepo.findById(newPlanId);
        if (!newPlan) {
          throw new NotFoundError('Subscription Plan', newPlanId);
        }

        const updated = await this.userSubscriptionRepo.update(currentSubscription.id, {
          planId: newPlanId,
          status: 'active',
          isLifetime: true,
          tierLevel: newPlan.tierLevel,
          highestTierReached: newPlan.tierLevel,
          expiresAt: null,
          autoRenew: null,
          lifetimeActivatedAt: currentSubscription.lifetimeActivatedAt || new Date()
        });
        return updated!;
      } else {
        return await this.subscribeUserToPlan(userId, newPlanId);
      }
    } catch (error) {
      return this.handleError(error, 'UserSubscriptionService.upgradeSubscription');
    }
  }

  async canPurchasePlan(userId: string, planId: string): Promise<{ allowed: boolean; reason?: string; requiresUpgrade?: boolean; currentPlan?: any }> {
    try {
      const activeSubscription = await this.userSubscriptionRepo.findActiveByUserId(userId);
      
      if (!activeSubscription) {
        return { allowed: true };
      }
      
      const targetPlan = await this.subscriptionPlanRepo.findById(planId);
      if (!targetPlan) {
        throw new NotFoundError('Subscription Plan', planId);
      }
      
      const currentPlan = await this.subscriptionPlanRepo.findById(activeSubscription.planId);
      if (!currentPlan) {
        throw new NotFoundError('Subscription Plan', activeSubscription.planId);
      }
      
      if (targetPlan.id === currentPlan.id) {
        return {
          allowed: false,
          reason: 'You already have this plan',
          currentPlan
        };
      }
      
      if (targetPlan.tierLevel <= currentPlan.tierLevel) {
        return {
          allowed: false,
          reason: `You cannot ${targetPlan.tierLevel < currentPlan.tierLevel ? 'downgrade to a lower tier' : 'switch to the same tier'}. Only upgrades to higher tiers are allowed.`,
          currentPlan
        };
      }
      
      return {
        allowed: true,
        requiresUpgrade: true,
        currentPlan
      };
    } catch (error) {
      return this.handleError(error, 'UserSubscriptionService.canPurchasePlan');
    }
  }

  /**
   * Subscribe user to a plan with automatic version redirection and full grandfathering
   * - Redirects to latest version if an older version is requested
   * - Implements full grandfathering (snapshot, locked price, forever)
   */
  async subscribeUserToPlan(userId: string, planId: string, orderId?: string): Promise<UserSubscription> {
    try {
      const errors: Record<string, string> = {};

      const userIdValidation = CommonValidators.validateUUID(userId, 'User ID');
      if (!userIdValidation.valid) {
        errors.userId = userIdValidation.error!;
      }

      const planIdValidation = CommonValidators.validateUUID(planId, 'Plan ID');
      if (!planIdValidation.valid) {
        errors.planId = planIdValidation.error!;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Subscription', errors);
      }

      // Idempotency: Check if subscription already exists for this order
      if (orderId) {
        const existingSubscription = await this.userSubscriptionRepo.findByOrderId(orderId);
        if (existingSubscription) {
          return existingSubscription;
        }
      }

      // Fetch the requested plan
      let plan = await this.subscriptionPlanRepo.findById(planId);
      if (!plan) {
        throw new NotFoundError('Subscription Plan', planId);
      }

      // PHASE 3: Check if planId is the latest version, redirect if not
      if (!plan.isLatestVersion) {
        if (!plan.basePlanId) {
          throw new InvalidOperationError('subscribe to plan', 'Plan is missing base plan reference');
        }
        const basePlanId = plan.basePlanId;
        const latestVersion = await this.subscriptionPlanRepo.findLatestVersion(basePlanId);
        
        if (latestVersion && latestVersion.id !== planId) {
          logger.info('Redirecting subscription to latest plan version', {
            userId,
            requestedPlanId: planId,
            requestedVersion: plan.version,
            latestPlanId: latestVersion.id,
            latestVersion: latestVersion.version,
            planFamily: basePlanId
          });
          
          // Use latest version instead
          plan = latestVersion;
        }
      }

      // Check if user can purchase this plan (using the potentially redirected plan)
      const validation = await this.canPurchasePlan(userId, plan.id);
      if (!validation.allowed) {
        throw new InvalidOperationError('purchase plan', validation.reason || 'Plan purchase not allowed');
      }

      const startDate = new Date();

      // If this is an upgrade, update existing subscription with FULL grandfathering
      if (validation.requiresUpgrade) {
        const currentSubscription = await this.userSubscriptionRepo.findActiveByUserId(userId);
        if (currentSubscription) {
          return await this.userSubscriptionRepo.update(currentSubscription.id, {
            planId: plan.id,  // Use potentially redirected plan
            orderId,
            status: 'active',
            isLifetime: true,
            tierLevel: plan.tierLevel,
            highestTierReached: plan.tierLevel,
            expiresAt: null,
            autoRenew: null,
            lifetimeActivatedAt: currentSubscription.lifetimeActivatedAt || new Date(),
            
            // PHASE 3: Full grandfathering for upgrades
            subscribedPlanSnapshot: plan as any,
            grandfatheredPrice: plan.price,
            isGrandfathered: true,
            grandfatheredUntil: null
          });
        }
      }

      // Create new subscription with FULL grandfathering support
      return await this.createSubscription({
        userId,
        planId: plan.id,  // Use potentially redirected plan
        orderId,
        status: 'active',
        startedAt: startDate,
        isLifetime: true,
        tierLevel: plan.tierLevel,
        lifetimeActivatedAt: new Date(),
        highestTierReached: plan.tierLevel,
        expiresAt: null,
        autoRenew: null,
        
        // PHASE 3: Full grandfathering (snapshot, locked price, forever)
        subscribedPlanSnapshot: plan as any,  // Full immutable snapshot
        grandfatheredPrice: plan.price,       // Lock the price
        isGrandfathered: true,                // Mark as grandfathered
        grandfatheredUntil: null              // Forever (null = no expiration)
      });
    } catch (error) {
      return this.handleError(error, 'UserSubscriptionService.subscribeUserToPlan');
    }
  }

  async getEffectivePrice(userId: string): Promise<number | null> {
    try {
      const subscription = await this.userSubscriptionRepo.findByUser(userId);
      
      if (!subscription) {
        return null;
      }

      // If grandfathered, return locked price
      if (subscription.isGrandfathered && subscription.grandfatheredPrice) {
        return Number(subscription.grandfatheredPrice);
      }

      // Otherwise, return current plan price
      const currentPlan = await this.subscriptionPlanRepo.findById(subscription.planId);
      return currentPlan ? Number(currentPlan.price) : null;
    } catch (error) {
      return this.handleError(error, 'UserSubscriptionService.getEffectivePrice');
    }
  }

  async shouldOfferPriceUpdate(userId: string): Promise<{ 
    shouldOffer: boolean; 
    currentPrice: number; 
    newPrice: number;
    savings?: number;
  }> {
    try {
      const subscription = await this.userSubscriptionRepo.findByUser(userId);
      
      if (!subscription || !subscription.isGrandfathered) {
        return { shouldOffer: false, currentPrice: 0, newPrice: 0 };
      }

      const currentPlan = await this.subscriptionPlanRepo.findById(subscription.planId);
      if (!currentPlan) {
        return { shouldOffer: false, currentPrice: 0, newPrice: 0 };
      }

      const lockedPrice = Number(subscription.grandfatheredPrice);
      const currentPrice = Number(currentPlan.price);

      // Offer if current price is LOWER than locked price
      if (currentPrice < lockedPrice) {
        return {
          shouldOffer: true,
          currentPrice: lockedPrice,
          newPrice: currentPrice,
          savings: lockedPrice - currentPrice
        };
      }

      return { shouldOffer: false, currentPrice: lockedPrice, newPrice: currentPrice };
    } catch (error) {
      return this.handleError(error, 'UserSubscriptionService.shouldOfferPriceUpdate');
    }
  }
}

export const userSubscriptionService = new UserSubscriptionService();
