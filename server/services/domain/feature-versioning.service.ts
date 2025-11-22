/**
 * Feature Versioning Service
 * 
 * Handles feature-level versioning, change validation, and grandfathering
 * for subscription plans.
 * 
 * WORKFLOW:
 * 1. Validate proposed feature changes
 * 2. Create new plan version with changes
 * 3. Apply grandfathering rules to existing subscribers
 * 4. Track version history and migration paths
 */

import { BaseService } from '../base.service';
import { container, TYPES } from '../container';
import { 
  ISubscriptionPlanRepository, 
  IUserSubscriptionRepository,
  ISubscriptionPlanAuditRepository
} from '../../repositories';
import { SubscriptionPlan, UserSubscription } from '@shared/schema';
import {
  FeatureVersion,
  FeatureChange,
  GrandfatheringRule,
  VersionOptions,
  ValidationResult,
  VersionHistoryEntry,
  GrandfatheringApplicationResult,
  ChangeType
} from '@shared/types/feature-changes';
import { ResourceNotFoundError, InvalidOperationError, ValidationServiceError } from '../errors';
import { logger } from '../../utils/logger';

export interface IFeatureVersioningService {
  createFeatureVersion(
    basePlanId: string,
    featureChanges: FeatureChange[],
    options: VersionOptions,
    adminId: string
  ): Promise<SubscriptionPlan>;
  
  validateFeatureChanges(
    planId: string,
    changes: FeatureChange[]
  ): Promise<ValidationResult>;
  
  applyGrandfatheringRules(
    planId: string,
    rules: GrandfatheringRule[]
  ): Promise<GrandfatheringApplicationResult>;
  
  getFeatureVersionHistory(basePlanId: string): Promise<VersionHistoryEntry[]>;
}

export class FeatureVersioningService extends BaseService implements IFeatureVersioningService {
  private _subscriptionPlanRepo?: ISubscriptionPlanRepository;
  private _userSubscriptionRepo?: IUserSubscriptionRepository;
  private _planAuditRepo?: ISubscriptionPlanAuditRepository;

  constructor(
    subscriptionPlanRepo?: ISubscriptionPlanRepository,
    userSubscriptionRepo?: IUserSubscriptionRepository,
    planAuditRepo?: ISubscriptionPlanAuditRepository
  ) {
    super();
    this._subscriptionPlanRepo = subscriptionPlanRepo;
    this._userSubscriptionRepo = userSubscriptionRepo;
    this._planAuditRepo = planAuditRepo;
  }

  // Lazy getters to avoid circular dependency at initialization
  private get subscriptionPlanRepo(): ISubscriptionPlanRepository {
    if (!this._subscriptionPlanRepo) {
      this._subscriptionPlanRepo = container.get<ISubscriptionPlanRepository>(TYPES.ISubscriptionPlanRepository);
    }
    return this._subscriptionPlanRepo;
  }

  private get userSubscriptionRepo(): IUserSubscriptionRepository {
    if (!this._userSubscriptionRepo) {
      this._userSubscriptionRepo = container.get<IUserSubscriptionRepository>(TYPES.IUserSubscriptionRepository);
    }
    return this._userSubscriptionRepo;
  }

  private get planAuditRepo(): ISubscriptionPlanAuditRepository {
    if (!this._planAuditRepo) {
      this._planAuditRepo = container.get<ISubscriptionPlanAuditRepository>(TYPES.ISubscriptionPlanAuditRepository);
    }
    return this._planAuditRepo;
  }

  /**
   * Create a new feature version of a plan
   * 
   * Steps:
   * 1. Load base plan
   * 2. Validate feature changes
   * 3. Create new plan version with updated features
   * 4. Store version metadata
   * 5. Apply grandfathering rules if specified
   */
  async createFeatureVersion(
    basePlanId: string,
    featureChanges: FeatureChange[],
    options: VersionOptions,
    adminId: string
  ): Promise<SubscriptionPlan> {
    try {
      logger.info('Creating feature version', {
        basePlanId,
        changeCount: featureChanges.length,
        options
      });

      // Step 1: Validate the base plan exists
      const basePlan = await this.subscriptionPlanRepo.findById(basePlanId);
      if (!basePlan) {
        throw new ResourceNotFoundError('Plan', basePlanId);
      }

      // Step 2: Validate the feature changes
      const validation = await this.validateFeatureChanges(basePlanId, featureChanges);
      if (!validation.isValid) {
        throw new ValidationServiceError('FeatureChanges', {
          errors: validation.errors.join(', '),
          warnings: validation.warnings.join(', ')
        });
      }

      // Step 3: Apply feature changes to create updated plan data
      const updatedPlanData = this.applyFeatureChangesToPlan(basePlan, featureChanges);

      // Step 4: Get next version number
      const versions = await this.subscriptionPlanRepo.findAllVersions(basePlan.basePlanId);
      const nextVersion = Math.max(...versions.map(v => v.version)) + 1;

      // Step 5: Build feature version metadata
      const featureVersionMetadata: FeatureVersion = {
        version: nextVersion,
        effectiveDate: options.effectiveDate || new Date(),
        changes: featureChanges,
        affectedFeatures: featureChanges.map(c => c.featureName),
        rolloutStrategy: options.rolloutStrategy || 'immediate',
        grandfatheringRules: options.grandfatheringRules || [],
        releaseNotes: options.releaseNotes,
        createdBy: adminId
      };

      // Step 6: Create new plan version
      const newVersion = await this.subscriptionPlanRepo.createNewVersion(
        basePlan.basePlanId,
        {
          ...updatedPlanData,
          feature_version_metadata: featureVersionMetadata
        },
        adminId
      );

      logger.info('Feature version created', {
        planId: newVersion.id,
        version: nextVersion,
        basePlanId: basePlan.basePlanId
      });

      // Step 7: Apply grandfathering rules if specified
      if (options.grandfatheringRules && options.grandfatheringRules.length > 0) {
        await this.applyGrandfatheringRules(basePlan.id, options.grandfatheringRules);
      }

      return newVersion;
    } catch (error) {
      logger.error('Error creating feature version', {
        basePlanId,
        error: error instanceof Error ? error.message : String(error)
      });
      return this.handleError(error, 'FeatureVersioningService.createFeatureVersion');
    }
  }

  /**
   * Validate feature changes for breaking changes and impact
   * 
   * Checks:
   * - Breaking changes (feature removal, quota reduction)
   * - Deprecated feature usage
   * - Migration complexity
   * - Impact on existing subscribers
   */
  async validateFeatureChanges(
    planId: string,
    changes: FeatureChange[]
  ): Promise<ValidationResult> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];
      const breakingChanges: FeatureChange[] = [];
      const deprecatedFeatures: string[] = [];
      const recommendedActions: string[] = [];

      // Get current plan
      const plan = await this.subscriptionPlanRepo.findById(planId);
      if (!plan) {
        return {
          isValid: false,
          errors: ['Plan not found'],
          warnings: [],
          breakingChanges: [],
          deprecatedFeatures: [],
          migrationImpact: {
            affectedSubscribers: 0,
            requiresGrandfathering: false,
            estimatedMigrationTime: '0 minutes'
          },
          recommendedActions: []
        };
      }

      // Get subscriber count for impact analysis
      const subscriberCount = await this.subscriptionPlanRepo.getSubscriberCount(planId);

      // Analyze each change
      for (const change of changes) {
        // Check for breaking changes
        if (this.isBreakingChange(change)) {
          breakingChanges.push(change);
          warnings.push(`Breaking change detected: ${change.featureName} (${change.changeType})`);
          
          if (subscriberCount > 0) {
            recommendedActions.push(
              `Apply grandfathering for ${change.featureName} to protect existing ${subscriberCount} subscribers`
            );
          }
        }

        // Check for deprecated features
        if (change.changeType === 'deprecated' || change.changeType === 'removed') {
          deprecatedFeatures.push(change.featureName);
          
          if (!change.migrationPath) {
            warnings.push(`No migration path specified for ${change.featureName}`);
          }
        }

        // Validate change has proper documentation
        if (!change.reason || change.reason.trim().length < 10) {
          errors.push(`Change reason for ${change.featureName} is too short or missing`);
        }

        // Check for quota reductions
        if (this.isQuotaReduction(change)) {
          warnings.push(
            `Quota reduction detected: ${change.featureName} from ${change.oldValue} to ${change.newValue}`
          );
          
          if (subscriberCount > 0) {
            recommendedActions.push(
              `Consider gradual rollout for ${change.featureName} quota change`
            );
          }
        }
      }

      // Calculate migration impact
      const requiresGrandfathering = breakingChanges.length > 0 && subscriberCount > 0;
      const estimatedMigrationTime = this.estimateMigrationTime(subscriberCount, changes.length);

      // Add general recommendations
      if (subscriberCount > 0 && changes.length > 0) {
        recommendedActions.push('Create backup snapshot before applying changes');
        recommendedActions.push('Test changes in staging environment first');
        
        if (subscriberCount > 100) {
          recommendedActions.push('Consider gradual rollout strategy');
        }
      }

      if (breakingChanges.length > 0 && subscriberCount === 0) {
        recommendedActions.push('Safe to apply directly (no active subscribers)');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        breakingChanges,
        deprecatedFeatures,
        migrationImpact: {
          affectedSubscribers: subscriberCount,
          requiresGrandfathering,
          estimatedMigrationTime
        },
        recommendedActions
      };
    } catch (error) {
      logger.error('Error validating feature changes', {
        planId,
        error: error instanceof Error ? error.message : String(error)
      });
      return this.handleError(error, 'FeatureVersioningService.validateFeatureChanges');
    }
  }

  /**
   * Apply grandfathering rules to affected subscriptions
   * 
   * Updates user subscriptions to preserve old feature values
   * according to the specified rules.
   */
  async applyGrandfatheringRules(
    planId: string,
    rules: GrandfatheringRule[]
  ): Promise<GrandfatheringApplicationResult> {
    try {
      logger.info('Applying grandfathering rules', {
        planId,
        ruleCount: rules.length
      });

      const result: GrandfatheringApplicationResult = {
        appliedCount: 0,
        failedCount: 0,
        affectedUserIds: [],
        errors: [],
        expirationScheduled: false
      };

      // Get current plan
      const plan = await this.subscriptionPlanRepo.findById(planId);
      if (!plan) {
        throw new ResourceNotFoundError('Plan', planId);
      }

      // Get all active subscriptions for this plan
      const subscriptions = await this.userSubscriptionRepo.findAll({
        planId,
        status: 'active'
      });

      logger.info('Found subscriptions to grandfather', {
        count: subscriptions.length
      });

      // Apply rules to each subscription
      for (const subscription of subscriptions) {
        try {
          // Check if subscription matches rule conditions
          const applicableRule = this.findApplicableRule(subscription, rules);
          
          if (applicableRule && applicableRule.retainOldValue) {
            // Set snapshot and grandfathering flags
            await this.userSubscriptionRepo.update(subscription.id, {
              subscribedPlanSnapshot: plan,
              isGrandfathered: true,
              grandfatheredUntil: applicableRule.expirationDate || null
            });

            result.appliedCount++;
            result.affectedUserIds.push(subscription.userId);

            if (applicableRule.expirationDate) {
              result.expirationScheduled = true;
            }

            logger.debug('Grandfathering applied', {
              userId: subscription.userId,
              subscriptionId: subscription.id,
              expiresAt: applicableRule.expirationDate
            });
          }
        } catch (error) {
          result.failedCount++;
          result.errors.push({
            userId: subscription.userId,
            error: error instanceof Error ? error.message : String(error)
          });

          logger.error('Failed to apply grandfathering', {
            userId: subscription.userId,
            subscriptionId: subscription.id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      logger.info('Grandfathering rules applied', {
        appliedCount: result.appliedCount,
        failedCount: result.failedCount
      });

      return result;
    } catch (error) {
      logger.error('Error applying grandfathering rules', {
        planId,
        error: error instanceof Error ? error.message : String(error)
      });
      return this.handleError(error, 'FeatureVersioningService.applyGrandfatheringRules');
    }
  }

  /**
   * Get feature version history for a plan
   */
  async getFeatureVersionHistory(basePlanId: string): Promise<VersionHistoryEntry[]> {
    try {
      const versions = await this.subscriptionPlanRepo.findAllVersions(basePlanId);

      const history: VersionHistoryEntry[] = await Promise.all(
        versions.map(async (version) => {
          const subscriberCount = await this.subscriptionPlanRepo.getSubscriberCount(version.id);
          
          // Extract changes from feature_version_metadata if available
          const metadata = version.feature_version_metadata as FeatureVersion | null;
          const changes = metadata?.changes || [];

          return {
            version: version.version,
            versionName: version.versionName || `v${version.version}`,
            effectiveDate: metadata?.effectiveDate || version.createdAt,
            changes,
            subscriberCount,
            isLatestVersion: version.isLatestVersion,
            deprecatedAt: version.deprecatedAt
          };
        })
      );

      return history.sort((a, b) => b.version - a.version);
    } catch (error) {
      logger.error('Error getting feature version history', {
        basePlanId,
        error: error instanceof Error ? error.message : String(error)
      });
      return this.handleError(error, 'FeatureVersioningService.getFeatureVersionHistory');
    }
  }

  /**
   * Helper: Apply feature changes to plan object
   */
  private applyFeatureChangesToPlan(
    plan: SubscriptionPlan,
    changes: FeatureChange[]
  ): Partial<SubscriptionPlan> {
    const updated: any = { ...plan };

    for (const change of changes) {
      if (change.changeType === 'removed') {
        // Handle feature removal
        if (Array.isArray(updated.features)) {
          updated.features = updated.features.filter(
            (f: string) => f !== change.featureName
          );
        } else if (change.featureName in updated) {
          // For boolean features, set to false
          updated[change.featureName] = false;
        }
      } else if (change.changeType === 'added' || change.changeType === 'modified') {
        // Handle feature addition or modification
        if (change.featureName === 'features' && Array.isArray(change.newValue)) {
          updated.features = change.newValue;
        } else {
          updated[change.featureName] = change.newValue;
        }
      } else if (change.changeType === 'deprecated') {
        // Mark as deprecated but keep the feature
        // Could add to a deprecation list if needed
        logger.warn('Feature marked as deprecated', {
          featureName: change.featureName,
          reason: change.reason
        });
      }
    }

    return updated;
  }

  /**
   * Helper: Check if a change is breaking
   */
  private isBreakingChange(change: FeatureChange): boolean {
    // Feature removal is always breaking
    if (change.changeType === 'removed') {
      return true;
    }

    // Quota reduction is breaking
    if (this.isQuotaReduction(change)) {
      return true;
    }

    // Boolean feature disabled is breaking
    if (typeof change.oldValue === 'boolean' && 
        change.oldValue === true && 
        change.newValue === false) {
      return true;
    }

    // Tier downgrade is breaking
    if (change.featureName === 'universityTier' || 
        change.featureName === 'supportType') {
      return this.isTierDowngrade(change);
    }

    return false;
  }

  /**
   * Helper: Check if change is a quota reduction
   */
  private isQuotaReduction(change: FeatureChange): boolean {
    const quotaFields = ['maxUniversities', 'maxCountries', 'turnaroundDays'];
    
    if (!quotaFields.includes(change.featureName)) {
      return false;
    }

    // For turnaroundDays, higher value is worse (longer wait)
    if (change.featureName === 'turnaroundDays') {
      return Number(change.newValue) > Number(change.oldValue);
    }

    // For other quotas, lower value is worse
    return Number(change.newValue) < Number(change.oldValue);
  }

  /**
   * Helper: Check if change is a tier downgrade
   */
  private isTierDowngrade(change: FeatureChange): boolean {
    const tierOrder: Record<string, number> = {
      // University tiers
      general: 1,
      top500: 2,
      top200: 3,
      top100: 4,
      ivy_league: 5,
      // Support types
      email: 1,
      whatsapp: 2,
      phone: 3,
      premium: 4
    };

    const oldRank = tierOrder[change.oldValue] || 0;
    const newRank = tierOrder[change.newValue] || 0;

    return newRank < oldRank;
  }

  /**
   * Helper: Estimate migration time based on subscriber count
   */
  private estimateMigrationTime(subscriberCount: number, changeCount: number): string {
    // Rough estimate: 100ms per subscriber per change
    const totalMs = subscriberCount * changeCount * 100;
    
    if (totalMs < 60000) {
      return `${Math.ceil(totalMs / 1000)} seconds`;
    } else if (totalMs < 3600000) {
      return `${Math.ceil(totalMs / 60000)} minutes`;
    } else {
      return `${Math.ceil(totalMs / 3600000)} hours`;
    }
  }

  /**
   * Helper: Find applicable grandfathering rule for a subscription
   */
  private findApplicableRule(
    subscription: UserSubscription,
    rules: GrandfatheringRule[]
  ): GrandfatheringRule | null {
    for (const rule of rules) {
      if (rule.condition === 'all') {
        return rule;
      }

      if (rule.condition === 'before_date' && rule.expirationDate) {
        const subscriptionDate = subscription.startedAt;
        if (subscriptionDate < rule.expirationDate) {
          return rule;
        }
      }

      if (rule.condition === 'specific_users' && rule.userIds) {
        if (rule.userIds.includes(subscription.userId)) {
          return rule;
        }
      }
    }

    return null;
  }
}

// Export singleton instance
export const featureVersioningService = new FeatureVersioningService();
