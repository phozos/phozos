/**
 * Feature Entitlement Service
 * 
 * Provides feature access control using snapshot-first pattern.
 * This service is the core of the grandfathering system.
 * 
 * CRITICAL LOGIC:
 * - ALWAYS check subscribedPlanSnapshot FIRST
 * - Fallback to live plan ONLY if snapshot doesn't exist
 * - Cache entitlements per request for performance
 */

import { BaseService } from '../base.service';
import { container, TYPES } from '../container';
import { IUserSubscriptionRepository, ISubscriptionPlanRepository } from '../../repositories';
import { SubscriptionPlan, UserSubscription } from '@shared/schema';
import {
  IFeatureEntitlementService,
  FeatureSet,
  QuotaInfo,
  QuotaType,
  FeatureAccessResult,
  ImpactAnalysis,
  ChangePreview,
  FeatureChanges,
  FeatureChange,
  CachedEntitlement,
  BooleanFeatureName
} from '../../types/feature-types';
import { NotFoundError } from '../../repositories/errors';

export class FeatureEntitlementService extends BaseService implements IFeatureEntitlementService {
  private cache: Map<string, CachedEntitlement>;
  private readonly CACHE_TTL = 60000; // 1 minute cache

  constructor(
    private userSubscriptionRepo: IUserSubscriptionRepository = container.get<IUserSubscriptionRepository>(TYPES.IUserSubscriptionRepository),
    private subscriptionPlanRepo: ISubscriptionPlanRepository = container.get<ISubscriptionPlanRepository>(TYPES.ISubscriptionPlanRepository)
  ) {
    super();
    this.cache = new Map();
  }

  /**
   * Get effective features for a user using snapshot-first pattern
   * 
   * LOGIC:
   * 1. Get user's active subscription
   * 2. IF isGrandfathered && subscribedPlanSnapshot exists -> use snapshot
   * 3. ELSE -> use current live plan
   * 4. Cache result for request lifetime
   */
  async getEffectiveFeatures(userId: string): Promise<FeatureSet | null> {
    try {
      // Check cache first
      const cached = this.getCachedEntitlement(userId);
      if (cached) {
        return cached.featureSet;
      }

      // Get active subscription
      const subscription = await this.userSubscriptionRepo.findByUser(userId);
      
      if (!subscription || subscription.status !== 'active') {
        return null;
      }

      // Determine which plan to use: snapshot or live
      let effectivePlan: SubscriptionPlan;
      
      if (subscription.isGrandfathered && subscription.subscribedPlanSnapshot) {
        // Use snapshot (grandfathered features)
        effectivePlan = subscription.subscribedPlanSnapshot as SubscriptionPlan;
      } else {
        // Use current live plan
        effectivePlan = await this.subscriptionPlanRepo.findById(subscription.planId);
      }

      // Build feature set
      const featureSet: FeatureSet = {
        // JSONB array features
        features: effectivePlan.features || [],
        
        // Boolean features
        includeLoanAssistance: effectivePlan.includeLoanAssistance || false,
        includeVisaSupport: effectivePlan.includeVisaSupport || false,
        includeCounselorSession: effectivePlan.includeCounselorSession || false,
        includeScholarshipPlanning: effectivePlan.includeScholarshipPlanning || false,
        includeMockInterview: effectivePlan.includeMockInterview || false,
        includeExpertEditing: effectivePlan.includeExpertEditing || false,
        includePostAdmitSupport: effectivePlan.includePostAdmitSupport || false,
        includeDedicatedManager: effectivePlan.includeDedicatedManager || false,
        includeNetworkingEvents: effectivePlan.includeNetworkingEvents || false,
        includeFlightAccommodation: effectivePlan.includeFlightAccommodation || false,
        
        // Quota features
        maxUniversities: effectivePlan.maxUniversities,
        maxCountries: effectivePlan.maxCountries,
        
        // Tier features
        universityTier: effectivePlan.universityTier,
        supportType: effectivePlan.supportType,
        turnaroundDays: effectivePlan.turnaroundDays,
        
        // Metadata
        planName: effectivePlan.name,
        planId: effectivePlan.id,
        tierLevel: effectivePlan.tierLevel,
        isLifetime: effectivePlan.isLifetime || false
      };

      // Cache the result
      this.cacheEntitlement(userId, featureSet, subscription);

      return featureSet;
    } catch (error) {
      return this.handleError(error, 'FeatureEntitlementService.getEffectiveFeatures');
    }
  }

  /**
   * Check if user has access to a specific feature
   * Handles both boolean features and JSONB array features
   */
  async hasFeatureAccess(userId: string, featureName: string): Promise<boolean> {
    try {
      const features = await this.getEffectiveFeatures(userId);
      
      if (!features) {
        return false;
      }

      // Check if it's a boolean feature
      if (featureName in features && typeof (features as any)[featureName] === 'boolean') {
        return (features as any)[featureName];
      }

      // Check if it's in the JSONB features array
      return features.features.includes(featureName);
    } catch (error) {
      return this.handleError(error, 'FeatureEntitlementService.hasFeatureAccess');
    }
  }

  /**
   * Get the value of a specific feature
   */
  async getFeatureValue<T>(userId: string, featureName: string): Promise<T | null> {
    try {
      const features = await this.getEffectiveFeatures(userId);
      
      if (!features) {
        return null;
      }

      if (featureName in features) {
        return (features as any)[featureName] as T;
      }

      return null;
    } catch (error) {
      return this.handleError(error, 'FeatureEntitlementService.getFeatureValue');
    }
  }

  /**
   * Bulk check multiple features at once
   */
  async checkFeatures(userId: string, featureNames: string[]): Promise<Record<string, boolean>> {
    try {
      const result: Record<string, boolean> = {};
      const features = await this.getEffectiveFeatures(userId);

      if (!features) {
        return featureNames.reduce((acc, name) => ({ ...acc, [name]: false }), {});
      }

      for (const featureName of featureNames) {
        if (featureName in features && typeof (features as any)[featureName] === 'boolean') {
          result[featureName] = (features as any)[featureName];
        } else {
          result[featureName] = features.features.includes(featureName);
        }
      }

      return result;
    } catch (error) {
      return this.handleError(error, 'FeatureEntitlementService.checkFeatures');
    }
  }

  /**
   * Get remaining quota for a user
   */
  async getRemainingQuota(userId: string, quotaType: QuotaType): Promise<number> {
    try {
      const quotaInfo = await this.getQuotaInfo(userId, quotaType);
      return quotaInfo.remaining;
    } catch (error) {
      return this.handleError(error, 'FeatureEntitlementService.getRemainingQuota');
    }
  }

  /**
   * Get detailed quota information
   */
  async getQuotaInfo(userId: string, quotaType: QuotaType): Promise<QuotaInfo> {
    try {
      const features = await this.getEffectiveFeatures(userId);
      const subscription = await this.userSubscriptionRepo.findByUser(userId);

      if (!features || !subscription) {
        return {
          quotaType,
          limit: 0,
          used: 0,
          remaining: 0,
          isUnlimited: false
        };
      }

      const limit = quotaType === 'universities' ? features.maxUniversities : features.maxCountries;
      const used = quotaType === 'universities' 
        ? (subscription.universitiesUsed || 0)
        : (subscription.countriesUsed || 0);

      return {
        quotaType,
        limit,
        used,
        remaining: Math.max(0, limit - used),
        isUnlimited: limit === -1 || limit >= 999
      };
    } catch (error) {
      return this.handleError(error, 'FeatureEntitlementService.getQuotaInfo');
    }
  }

  /**
   * Check if user can use a feature with detailed response
   */
  async canUseFeature(userId: string, featureName: string): Promise<FeatureAccessResult> {
    try {
      const hasAccess = await this.hasFeatureAccess(userId, featureName);
      const features = await this.getEffectiveFeatures(userId);

      if (hasAccess) {
        return {
          allowed: true
        };
      }

      // User doesn't have access
      const currentPlan = features?.planName || 'Free';
      
      return {
        allowed: false,
        reason: `This feature requires a plan with ${featureName}. Please upgrade your plan.`,
        requiresUpgrade: true,
        currentPlan,
        upgradeOptions: [] // This could be populated by checking higher tier plans
      };
    } catch (error) {
      return this.handleError(error, 'FeatureEntitlementService.canUseFeature');
    }
  }

  /**
   * Get impact analysis for changing a feature on a plan
   */
  async getFeatureImpact(planId: string, featureName: string, newValue: any): Promise<ImpactAnalysis> {
    try {
      const plan = await this.subscriptionPlanRepo.findById(planId);
      const subscriberCount = await this.subscriptionPlanRepo.getSubscriberCount(planId);

      const oldValue = (plan as any)[featureName];
      const hasChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);

      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      
      if (subscriberCount > 100) {
        riskLevel = 'critical';
      } else if (subscriberCount > 50) {
        riskLevel = 'high';
      } else if (subscriberCount > 10) {
        riskLevel = 'medium';
      }

      const featureChanges: FeatureChange[] = hasChanged ? [{
        featureName,
        changeType: 'modified',
        oldValue,
        newValue,
        affectedUsers: subscriberCount
      }] : [];

      return {
        planId,
        planName: plan.name,
        affectedSubscribers: subscriberCount,
        featureChanges,
        recommendation: subscriberCount > 0 
          ? 'Use createPlanVersion() to grandfather existing users'
          : 'Safe to update directly (no active subscribers)',
        riskLevel
      };
    } catch (error) {
      return this.handleError(error, 'FeatureEntitlementService.getFeatureImpact');
    }
  }

  /**
   * Preview feature changes before applying
   */
  async previewFeatureChange(planId: string, changes: FeatureChanges): Promise<ChangePreview> {
    try {
      const plan = await this.subscriptionPlanRepo.findById(planId);
      const subscriberCount = await this.subscriptionPlanRepo.getSubscriberCount(planId);

      const featureChanges: FeatureChange[] = [];
      const warnings: string[] = [];
      const recommendations: string[] = [];

      // Analyze each change
      for (const [key, newValue] of Object.entries(changes)) {
        const oldValue = (plan as any)[key];
        
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          featureChanges.push({
            featureName: key,
            changeType: oldValue === undefined ? 'added' : 'modified',
            oldValue,
            newValue,
            affectedUsers: subscriberCount
          });

          // Check if removing a feature
          if (typeof oldValue === 'boolean' && oldValue === true && newValue === false) {
            warnings.push(`Removing ${key} will affect ${subscriberCount} users`);
          }

          // Check if reducing quota
          if (key === 'maxUniversities' || key === 'maxCountries') {
            if (typeof newValue === 'number' && typeof oldValue === 'number' && newValue < oldValue) {
              warnings.push(`Reducing ${key} from ${oldValue} to ${newValue} may break existing users`);
            }
          }
        }
      }

      if (subscriberCount > 0 && featureChanges.length > 0) {
        recommendations.push('Create a new plan version to grandfather existing users');
        recommendations.push('Notify affected users of the changes');
      }

      return {
        planId,
        changes: featureChanges,
        subscriberCount,
        requiresConfirmation: subscriberCount > 0 && featureChanges.length > 0,
        warnings,
        recommendations
      };
    } catch (error) {
      return this.handleError(error, 'FeatureEntitlementService.previewFeatureChange');
    }
  }

  /**
   * Cache entitlement data
   */
  private cacheEntitlement(userId: string, featureSet: FeatureSet, subscription: UserSubscription): void {
    const quotas: Record<QuotaType, QuotaInfo> = {
      universities: {
        quotaType: 'universities',
        limit: featureSet.maxUniversities,
        used: subscription.universitiesUsed || 0,
        remaining: Math.max(0, featureSet.maxUniversities - (subscription.universitiesUsed || 0)),
        isUnlimited: featureSet.maxUniversities >= 999
      },
      countries: {
        quotaType: 'countries',
        limit: featureSet.maxCountries,
        used: subscription.countriesUsed || 0,
        remaining: Math.max(0, featureSet.maxCountries - (subscription.countriesUsed || 0)),
        isUnlimited: featureSet.maxCountries >= 999
      }
    };

    this.cache.set(userId, {
      userId,
      featureSet,
      quotas,
      timestamp: Date.now()
    });
  }

  /**
   * Get cached entitlement if still valid
   */
  private getCachedEntitlement(userId: string): CachedEntitlement | null {
    const cached = this.cache.get(userId);
    
    if (!cached) {
      return null;
    }

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(userId);
      return null;
    }

    return cached;
  }

  /**
   * Clear cache for a specific user (call on subscription update)
   */
  public clearCache(userId: string): void {
    this.cache.delete(userId);
  }

  /**
   * Clear all cached entitlements
   */
  public clearAllCache(): void {
    this.cache.clear();
  }
}

export const featureEntitlementService = new FeatureEntitlementService();
