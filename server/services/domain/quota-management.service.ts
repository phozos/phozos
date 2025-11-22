/**
 * Quota Management Service
 * 
 * Comprehensive quota tracking and enforcement system for subscription plans.
 * Tracks university and country quotas, enforces limits, and provides usage analytics.
 * 
 * Integration with FeatureEntitlementService for quota limits from plan snapshots.
 */

import { BaseService } from '../base.service';
import { container, TYPES } from '../container';
import { IQuotaUsageRepository, IUserSubscriptionRepository, QuotaUsageReport } from '../../repositories';
import { IFeatureEntitlementService, QuotaType, QuotaInfo } from '../../types/feature-types';
import { ValidationServiceError } from '../errors';

export interface QuotaStatus {
  quotaType: string;
  allocated: number;
  used: number;
  remaining: number;
  percentage: number;
  unlimited: boolean;
  lastUsedAt: Date | null;
}

export interface QuotaValidationResult {
  allowed: boolean;
  reason?: string;
  currentUsage: number;
  limit: number;
  remaining: number;
}

export class QuotaExceededError extends ValidationServiceError {
  constructor(
    quotaType: string,
    used: number,
    limit: number,
    requested: number
  ) {
    super('Quota', {
      quotaExceeded: `You have reached your ${quotaType} quota limit. Current usage: ${used}/${limit}. Requested: ${requested}. Please upgrade your plan to get more ${quotaType}.`
    });
    this.name = 'QuotaExceededError';
  }
}

export interface IQuotaManagementService {
  trackQuotaUsage(userId: string, quotaType: QuotaType, amount?: number): Promise<void>;
  validateQuotaAvailability(userId: string, quotaType: QuotaType, required?: number): Promise<QuotaValidationResult>;
  getRemainingQuota(userId: string, quotaType: QuotaType): Promise<number>;
  enforceQuotaLimit(userId: string, quotaType: QuotaType, required?: number): Promise<void>;
  releaseQuota(userId: string, quotaType: QuotaType, amount?: number): Promise<void>;
  resetUserQuota(userId: string, quotaType: QuotaType): Promise<void>;
  getQuotaUsageReport(userId: string): Promise<QuotaUsageReport[]>;
  getQuotaStatus(userId: string, quotaType: QuotaType): Promise<QuotaStatus>;
  initializeUserQuotas(userId: string, subscriptionId: string): Promise<void>;
  syncQuotaLimits(userId: string): Promise<void>;
}

export class QuotaManagementService extends BaseService implements IQuotaManagementService {
  private get quotaUsageRepo(): IQuotaUsageRepository {
    return container.get<IQuotaUsageRepository>(TYPES.IQuotaUsageRepository);
  }

  private get userSubscriptionRepo(): IUserSubscriptionRepository {
    return container.get<IUserSubscriptionRepository>(TYPES.IUserSubscriptionRepository);
  }

  private get featureEntitlementService(): IFeatureEntitlementService {
    return container.get<IFeatureEntitlementService>(TYPES.IFeatureEntitlementService);
  }

  /**
   * Track quota usage (increment counter)
   */
  async trackQuotaUsage(userId: string, quotaType: QuotaType, amount: number = 1): Promise<void> {
    try {
      await this.enforceQuotaLimit(userId, quotaType, amount);

      const existing = await this.quotaUsageRepo.findByUserAndType(userId, quotaType);
      
      if (!existing) {
        const subscription = await this.userSubscriptionRepo.findByUser(userId);
        if (!subscription) {
          throw new ValidationServiceError('Quota', {
            subscription: 'No active subscription found for user'
          });
        }

        const quotaInfo = await this.featureEntitlementService.getQuotaInfo(userId, quotaType);
        await this.quotaUsageRepo.initializeQuota(
          userId,
          subscription.id,
          quotaType,
          quotaInfo.limit
        );
      }

      await this.quotaUsageRepo.incrementUsage(userId, quotaType, amount);
    } catch (error) {
      return this.handleError(error, 'QuotaManagementService.trackQuotaUsage');
    }
  }

  /**
   * Validate if quota is available for consumption
   */
  async validateQuotaAvailability(
    userId: string, 
    quotaType: QuotaType, 
    required: number = 1
  ): Promise<QuotaValidationResult> {
    try {
      const quotaInfo = await this.featureEntitlementService.getQuotaInfo(userId, quotaType);

      if (quotaInfo.isUnlimited) {
        return {
          allowed: true,
          currentUsage: quotaInfo.used,
          limit: -1,
          remaining: -1
        };
      }

      const available = quotaInfo.remaining >= required;
      
      return {
        allowed: available,
        reason: available ? undefined : `Insufficient quota. You need ${required} but only have ${quotaInfo.remaining} remaining.`,
        currentUsage: quotaInfo.used,
        limit: quotaInfo.limit,
        remaining: quotaInfo.remaining
      };
    } catch (error) {
      return this.handleError(error, 'QuotaManagementService.validateQuotaAvailability');
    }
  }

  /**
   * Get remaining quota for a user
   */
  async getRemainingQuota(userId: string, quotaType: QuotaType): Promise<number> {
    try {
      const quotaInfo = await this.featureEntitlementService.getQuotaInfo(userId, quotaType);
      return quotaInfo.isUnlimited ? -1 : quotaInfo.remaining;
    } catch (error) {
      return this.handleError(error, 'QuotaManagementService.getRemainingQuota');
    }
  }

  /**
   * Enforce quota limit - throws error if quota would be exceeded
   */
  async enforceQuotaLimit(userId: string, quotaType: QuotaType, required: number = 1): Promise<void> {
    try {
      const validation = await this.validateQuotaAvailability(userId, quotaType, required);
      
      if (!validation.allowed) {
        throw new QuotaExceededError(
          quotaType,
          validation.currentUsage,
          validation.limit,
          required
        );
      }
    } catch (error) {
      return this.handleError(error, 'QuotaManagementService.enforceQuotaLimit');
    }
  }

  /**
   * Release quota (decrement counter) - used when deleting resources
   */
  async releaseQuota(userId: string, quotaType: QuotaType, amount: number = 1): Promise<void> {
    try {
      const existing = await this.quotaUsageRepo.findByUserAndType(userId, quotaType);
      
      if (existing) {
        await this.quotaUsageRepo.decrementUsage(userId, quotaType, amount);
      }
    } catch (error) {
      return this.handleError(error, 'QuotaManagementService.releaseQuota');
    }
  }

  /**
   * Reset quota for a user (set used count to 0)
   */
  async resetUserQuota(userId: string, quotaType: QuotaType): Promise<void> {
    try {
      const existing = await this.quotaUsageRepo.findByUserAndType(userId, quotaType);
      
      if (existing) {
        await this.quotaUsageRepo.resetQuota(userId, quotaType);
      } else {
        const subscription = await this.userSubscriptionRepo.findByUser(userId);
        if (subscription) {
          const quotaInfo = await this.featureEntitlementService.getQuotaInfo(userId, quotaType);
          await this.quotaUsageRepo.initializeQuota(
            userId,
            subscription.id,
            quotaType,
            quotaInfo.limit
          );
        }
      }
    } catch (error) {
      return this.handleError(error, 'QuotaManagementService.resetUserQuota');
    }
  }

  /**
   * Get comprehensive usage report for all quotas
   */
  async getQuotaUsageReport(userId: string): Promise<QuotaUsageReport[]> {
    try {
      return await this.quotaUsageRepo.getUsageReport(userId);
    } catch (error) {
      return this.handleError(error, 'QuotaManagementService.getQuotaUsageReport');
    }
  }

  /**
   * Get detailed quota status
   */
  async getQuotaStatus(userId: string, quotaType: QuotaType): Promise<QuotaStatus> {
    try {
      const quotaInfo = await this.featureEntitlementService.getQuotaInfo(userId, quotaType);
      const existing = await this.quotaUsageRepo.findByUserAndType(userId, quotaType);

      return {
        quotaType,
        allocated: quotaInfo.limit,
        used: quotaInfo.used,
        remaining: quotaInfo.isUnlimited ? -1 : quotaInfo.remaining,
        percentage: quotaInfo.isUnlimited ? 0 : Math.round((quotaInfo.used / quotaInfo.limit) * 100),
        unlimited: quotaInfo.isUnlimited,
        lastUsedAt: existing?.lastUsedAt || null
      };
    } catch (error) {
      return this.handleError(error, 'QuotaManagementService.getQuotaStatus');
    }
  }

  /**
   * Initialize all quotas for a new subscription
   */
  async initializeUserQuotas(userId: string, subscriptionId: string): Promise<void> {
    try {
      const quotaTypes: QuotaType[] = ['universities', 'countries'];
      
      for (const quotaType of quotaTypes) {
        const quotaInfo = await this.featureEntitlementService.getQuotaInfo(userId, quotaType);
        
        await this.quotaUsageRepo.initializeQuota(
          userId,
          subscriptionId,
          quotaType,
          quotaInfo.limit
        );
      }
    } catch (error) {
      return this.handleError(error, 'QuotaManagementService.initializeUserQuotas');
    }
  }

  /**
   * Sync quota limits with current plan (for upgrades/downgrades)
   */
  async syncQuotaLimits(userId: string): Promise<void> {
    try {
      const subscription = await this.userSubscriptionRepo.findByUser(userId);
      if (!subscription) {
        return;
      }

      const quotaTypes: QuotaType[] = ['universities', 'countries'];
      
      for (const quotaType of quotaTypes) {
        const quotaInfo = await this.featureEntitlementService.getQuotaInfo(userId, quotaType);
        const existing = await this.quotaUsageRepo.findByUserAndType(userId, quotaType);
        
        if (existing) {
          await this.quotaUsageRepo.update(existing.id, {
            allocatedCount: quotaInfo.limit,
            subscriptionId: subscription.id
          });
        } else {
          await this.quotaUsageRepo.initializeQuota(
            userId,
            subscription.id,
            quotaType,
            quotaInfo.limit
          );
        }
      }
    } catch (error) {
      return this.handleError(error, 'QuotaManagementService.syncQuotaLimits');
    }
  }
}

export const quotaManagementService = new QuotaManagementService();
