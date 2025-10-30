import { BaseService } from '../base.service';
import { IUserSubscriptionRepository } from '../../repositories';
import { container, TYPES } from '../container';
import { UserSubscription, InsertUserSubscription } from '@shared/schema';
import { ValidationServiceError } from '../errors';
import { CommonValidators } from '../validation';

export interface IUserSubscriptionService {
  getCurrentSubscription(userId: string): Promise<UserSubscription | undefined>;
  getSubscriptionWithPlan(userId: string): Promise<any>;
  getAllSubscriptions(): Promise<any[]>;
  createSubscription(subscription: InsertUserSubscription): Promise<UserSubscription>;
  updateSubscription(id: string, updates: Partial<UserSubscription>): Promise<UserSubscription | undefined>;
  cancelSubscription(subscriptionId: string): Promise<boolean>;
  upgradeSubscription(userId: string, newPlanId: string): Promise<UserSubscription>;
  subscribeUserToPlan(userId: string, planId: string): Promise<UserSubscription>;
}

export class UserSubscriptionService extends BaseService implements IUserSubscriptionService {
  constructor(
    private userSubscriptionRepo: IUserSubscriptionRepository = container.get<IUserSubscriptionRepository>(TYPES.IUserSubscriptionRepository)
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
        const updated = await this.userSubscriptionRepo.update(currentSubscription.id, {
          planId: newPlanId,
          status: 'active',
          startedAt: new Date()
        });
        return updated!;
      } else {
        return await this.createSubscription({
          userId,
          planId: newPlanId,
          status: 'active',
          startedAt: new Date()
        });
      }
    } catch (error) {
      return this.handleError(error, 'UserSubscriptionService.upgradeSubscription');
    }
  }

  async subscribeUserToPlan(userId: string, planId: string): Promise<UserSubscription> {
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

      const startDate = new Date();
      const expiresDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      return await this.createSubscription({
        userId,
        planId,
        status: 'active',
        startedAt: startDate,
        expiresAt: expiresDate
      });
    } catch (error) {
      return this.handleError(error, 'UserSubscriptionService.subscribeUserToPlan');
    }
  }
}

export const userSubscriptionService = new UserSubscriptionService();
