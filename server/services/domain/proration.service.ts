import { BaseService } from '../base.service';
import { IUserSubscriptionService } from './user-subscription.service';
import { ISubscriptionPlanRepository } from '../../repositories';
import { container, TYPES } from '../container';
import { ValidationServiceError } from '../errors';
import { CommonValidators } from '../validation';

export interface ProrationCalculationResult {
  allowed: boolean;
  prorationAmount: number;
  newPlanPrice: number;
  alreadyPaid: number;
  currency: string;
  isUpgrade: boolean;
  requiresPayment: boolean;
  reason?: string;
}

export interface IProrationService {
  calculate(userId: string, targetPlanId: string): Promise<ProrationCalculationResult>;
}

export class ProrationService extends BaseService implements IProrationService {
  constructor(
    private subscriptionPlanRepo: ISubscriptionPlanRepository = container.get<ISubscriptionPlanRepository>(TYPES.ISubscriptionPlanRepository)
  ) {
    super();
  }

  private get userSubscriptionService(): IUserSubscriptionService {
    return container.get<IUserSubscriptionService>(TYPES.IUserSubscriptionService);
  }

  async calculate(userId: string, targetPlanId: string): Promise<ProrationCalculationResult> {
    try {
      const errors: Record<string, string> = {};
      
      const userIdValidation = CommonValidators.validateUUID(userId, 'User ID');
      if (!userIdValidation.valid) {
        errors.userId = userIdValidation.error!;
      }
      
      const planIdValidation = CommonValidators.validateUUID(targetPlanId, 'Target Plan ID');
      if (!planIdValidation.valid) {
        errors.targetPlanId = planIdValidation.error!;
      }
      
      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Proration Calculation', errors);
      }
      
      const targetPlan = await this.subscriptionPlanRepo.findById(targetPlanId);
      if (!targetPlan) {
        return {
          allowed: false,
          prorationAmount: 0,
          newPlanPrice: 0,
          alreadyPaid: 0,
          currency: 'INR',
          isUpgrade: false,
          requiresPayment: false,
          reason: 'Target plan not found'
        };
      }
      
      const currentSubscription = await this.userSubscriptionService.getCurrentSubscription(userId);
      
      if (!currentSubscription || currentSubscription.status !== 'active') {
        return {
          allowed: true,
          prorationAmount: Number(targetPlan.price),
          newPlanPrice: Number(targetPlan.price),
          alreadyPaid: 0,
          currency: targetPlan.currency,
          isUpgrade: false,
          requiresPayment: true,
          reason: 'New subscription - full price'
        };
      }
      
      const currentPlan = await this.subscriptionPlanRepo.findById(currentSubscription.planId);
      if (!currentPlan) {
        return {
          allowed: false,
          prorationAmount: 0,
          newPlanPrice: Number(targetPlan.price),
          alreadyPaid: 0,
          currency: targetPlan.currency,
          isUpgrade: false,
          requiresPayment: false,
          reason: 'Current plan not found'
        };
      }
      
      if (targetPlan.id === currentPlan.id) {
        return {
          allowed: false,
          prorationAmount: 0,
          newPlanPrice: Number(targetPlan.price),
          alreadyPaid: Number(currentSubscription.amountPaid || currentPlan.price),
          currency: targetPlan.currency,
          isUpgrade: false,
          requiresPayment: false,
          reason: 'You already have this plan'
        };
      }
      
      if (targetPlan.tierLevel <= currentPlan.tierLevel) {
        const isDowngrade = targetPlan.tierLevel < currentPlan.tierLevel;
        return {
          allowed: false,
          prorationAmount: 0,
          newPlanPrice: Number(targetPlan.price),
          alreadyPaid: Number(currentSubscription.amountPaid || currentPlan.price),
          currency: targetPlan.currency,
          isUpgrade: false,
          requiresPayment: false,
          reason: isDowngrade 
            ? 'Cannot downgrade to a lower tier. Only upgrades to higher tiers are allowed.'
            : 'Cannot switch to the same tier. Only upgrades to higher tiers are allowed.'
        };
      }
      
      const alreadyPaid = Number(currentSubscription.amountPaid || currentPlan.price);
      const newPlanPrice = Number(targetPlan.price);
      
      if (currentSubscription.currency && targetPlan.currency !== currentSubscription.currency) {
        return {
          allowed: false,
          prorationAmount: 0,
          newPlanPrice,
          alreadyPaid,
          currency: targetPlan.currency,
          isUpgrade: true,
          requiresPayment: false,
          reason: `Currency mismatch: current plan is in ${currentSubscription.currency}, target plan is in ${targetPlan.currency}`
        };
      }
      
      const prorationAmount = newPlanPrice - alreadyPaid;
      const requiresPayment = prorationAmount > 0;
      
      return {
        allowed: true,
        prorationAmount: Math.max(0, prorationAmount),
        newPlanPrice,
        alreadyPaid,
        currency: targetPlan.currency,
        isUpgrade: true,
        requiresPayment,
        reason: requiresPayment 
          ? `Upgrade to ${targetPlan.name} - Pay ${prorationAmount.toFixed(2)} ${targetPlan.currency}`
          : `Upgrade to ${targetPlan.name} - No additional payment required`
      };
      
    } catch (error) {
      return this.handleError(error, 'ProrationService.calculate');
    }
  }
}

export const prorationService = new ProrationService();
