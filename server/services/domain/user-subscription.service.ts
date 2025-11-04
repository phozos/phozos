import { BaseService } from '../base.service';
import { IUserSubscriptionRepository, ISubscriptionPlanRepository } from '../../repositories';
import { container, TYPES } from '../container';
import { UserSubscription, InsertUserSubscription } from '@shared/schema';
import { ValidationServiceError, InvalidOperationError } from '../errors';
import { CommonValidators } from '../validation';
import { NotFoundError } from '../../repositories/errors';

export interface IUserSubscriptionService {
  getCurrentSubscription(userId: string): Promise<UserSubscription | undefined>;
  getSubscriptionWithPlan(userId: string): Promise<any>;
  getAllSubscriptions(): Promise<any[]>;
  createSubscription(subscription: InsertUserSubscription): Promise<UserSubscription>;
  updateSubscription(id: string, updates: Partial<UserSubscription>): Promise<UserSubscription | undefined>;
  cancelSubscription(subscriptionId: string): Promise<boolean>;
  validateUpgrade(currentSubscription: UserSubscription, targetPlanId: string): Promise<{ allowed: boolean; reason?: string }>;
  upgradeSubscription(userId: string, newPlanId: string): Promise<UserSubscription>;
  subscribeUserToPlan(userId: string, planId: string, orderId?: string): Promise<UserSubscription>;
  canPurchasePlan(userId: string, planId: string): Promise<{ allowed: boolean; reason?: string; requiresUpgrade?: boolean; currentPlan?: any }>;
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
      return await this.userSubscriptionRepo.findByUser(userId);
    } catch (error) {
      return this.handleError(error, 'UserSubscriptionService.getCurrentSubscription');
    }
  }

  async getSubscriptionWithPlan(userId: string): Promise<any> {
    try {
      return await this.userSubscriptionRepo.findByUserWithPlan(userId);
    } catch (error) {
      return this.handleError(error, 'UserSubscriptionService.getSubscriptionWithPlan');
    }
  }

  async getAllSubscriptions(): Promise<any[]> {
    try {
      return await this.userSubscriptionRepo.findAllWithDetails();
    } catch (error) {
      return this.handleError(error, 'UserSubscriptionService.getAllSubscriptions');
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

      // Check if user can purchase this plan
      const validation = await this.canPurchasePlan(userId, planId);
      if (!validation.allowed) {
        throw new InvalidOperationError('purchase plan', validation.reason || 'Plan purchase not allowed');
      }

      // Fetch the plan to get tierLevel
      const plan = await this.subscriptionPlanRepo.findById(planId);
      if (!plan) {
        throw new NotFoundError('Subscription Plan', planId);
      }

      const startDate = new Date();

      // If this is an upgrade, update existing subscription
      if (validation.requiresUpgrade) {
        const currentSubscription = await this.userSubscriptionRepo.findActiveByUserId(userId);
        if (currentSubscription) {
          return await this.userSubscriptionRepo.update(currentSubscription.id, {
            planId,
            orderId,
            status: 'active',
            isLifetime: true,
            tierLevel: plan.tierLevel,
            highestTierReached: plan.tierLevel,
            expiresAt: null,
            autoRenew: null,
            lifetimeActivatedAt: currentSubscription.lifetimeActivatedAt || new Date()
          });
        }
      }

      // Create new subscription
      return await this.createSubscription({
        userId,
        planId,
        orderId,
        status: 'active',
        startedAt: startDate,
        isLifetime: true,
        tierLevel: plan.tierLevel,
        lifetimeActivatedAt: new Date(),
        highestTierReached: plan.tierLevel,
        expiresAt: null,
        autoRenew: null
      });
    } catch (error) {
      return this.handleError(error, 'UserSubscriptionService.subscribeUserToPlan');
    }
  }
}

export const userSubscriptionService = new UserSubscriptionService();
