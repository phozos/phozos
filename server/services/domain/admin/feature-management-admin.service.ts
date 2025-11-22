/**
 * Feature Management Admin Service (Phase 4.2)
 * 
 * Provides admin-level aggregation and management of features across all plans.
 * Includes:
 * - Feature usage overview across all plans
 * - Feature health monitoring
 * - Bulk feature operations
 * - Feature lifecycle management
 */

import { BaseService } from '../../base.service';
import { container, TYPES } from '../../container';
import { 
  ISubscriptionPlanRepository,
  IUserSubscriptionRepository,
  IFeatureUsageRepository,
  DateRange
} from '../../../repositories';
import { IFeatureAnalyticsService } from '../feature-analytics.service';
import { IFeatureVersioningService } from '../feature-versioning.service';
import { FeatureChange, RolloutStrategy, GrandfatheringRule } from '@shared/types/feature-changes';
import { logger } from '../../../utils/logger';
import { UserSubscription } from '@shared/schema';

/**
 * Feature usage statistics across all plans
 */
export interface FeatureUsageOverview {
  featureName: string;
  displayName: string;
  totalPlansOffering: number;
  totalUsersWithAccess: number;
  activeUsers: number;
  adoptionRate: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  usageCount: number;
}

/**
 * Feature health status
 */
export interface FeatureHealth {
  featureName: string;
  healthStatus: 'healthy' | 'warning' | 'critical';
  adoptionRate: number;
  satisfactionScore?: number;
  alerts: FeatureHealthAlert[];
  metrics: {
    totalUsers: number;
    activeUsers: number;
    usageFrequency: number;
    upgradeDriveRate?: number; // % of upgrades driven by this feature
  };
}

/**
 * Health alert for a feature
 */
export interface FeatureHealthAlert {
  type: 'low_adoption' | 'high_cost' | 'high_value' | 'deprecation_candidate';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  recommendation?: string;
  estimatedSavings?: number;
}

/**
 * Bulk feature operation request
 */
export interface BulkFeatureOperation {
  operation: 'enable' | 'disable' | 'modify';
  featureName: string;
  targetPlanIds: string[];
  newValue?: any;
  rolloutStrategy: RolloutStrategy;
  scheduledDate?: Date;
  grandfatheringRule: 'all' | 'none' | 'custom';
  customGrandfatheringRules?: GrandfatheringRule[];
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  success: boolean;
  operationId: string;
  affectedPlans: number;
  affectedUsers: number;
  errors: Array<{
    planId: string;
    error: string;
  }>;
  warnings: string[];
}

/**
 * Feature lifecycle information
 */
export interface FeatureLifecycle {
  featureName: string;
  status: 'active' | 'deprecated' | 'sunset';
  addedDate: Date;
  plans: Array<{
    planId: string;
    planName: string;
    addedVersion: number;
    currentVersion: number;
  }>;
  totalUsers: number;
  versionHistory: Array<{
    version: number;
    date: Date;
    changes: string;
    addedToPlanCount: number;
  }>;
  deprecationSchedule?: {
    announcementDate: Date;
    removalDate: Date;
    reason: string;
  };
}

/**
 * Dashboard summary statistics
 */
export interface DashboardSummary {
  totalFeatures: number;
  activePlans: number;
  totalSubscribers: number;
  healthyFeatures: number;
  featuresAtRisk: number;
  deprecatedFeatures: number;
  recentChanges: number;
}

export interface IFeatureManagementAdminService {
  getDashboardSummary(): Promise<DashboardSummary>;
  getFeatureUsageOverview(dateRange?: DateRange): Promise<FeatureUsageOverview[]>;
  getFeatureHealth(featureName?: string): Promise<FeatureHealth[]>;
  getUnderutilizedFeatures(threshold: number): Promise<FeatureUsageOverview[]>;
  getHighValueFeatures(limit: number): Promise<FeatureUsageOverview[]>;
  getFeatureLifecycle(featureName: string): Promise<FeatureLifecycle>;
  executeBulkOperation(operation: BulkFeatureOperation, adminId: string): Promise<BulkOperationResult>;
}

export class FeatureManagementAdminService extends BaseService implements IFeatureManagementAdminService {
  private get subscriptionPlanRepo(): ISubscriptionPlanRepository {
    return container.get<ISubscriptionPlanRepository>(TYPES.ISubscriptionPlanRepository);
  }

  private get userSubscriptionRepo(): IUserSubscriptionRepository {
    return container.get<IUserSubscriptionRepository>(TYPES.IUserSubscriptionRepository);
  }

  private get featureUsageRepo(): IFeatureUsageRepository {
    return container.get<IFeatureUsageRepository>(TYPES.IFeatureUsageRepository);
  }

  private get featureAnalyticsService(): IFeatureAnalyticsService {
    return container.get<IFeatureAnalyticsService>(TYPES.IFeatureAnalyticsService);
  }

  private get featureVersioningService(): IFeatureVersioningService {
    return container.get<IFeatureVersioningService>(TYPES.IFeatureVersioningService);
  }

  /**
   * Get dashboard summary statistics
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    try {
      const plans = await this.subscriptionPlanRepo.findAll();
      const activePlans = plans.filter(p => p.isActive).length;
      
      // Get all unique features across all plans
      const allFeatures = new Set<string>();
      for (const plan of plans) {
        if (plan.features && Array.isArray(plan.features)) {
          plan.features.forEach(f => allFeatures.add(f));
        }
      }

      // Get subscriptions
      const subscriptions = await this.userSubscriptionRepo.findAll({});
      const totalSubscribers = subscriptions.filter(s => s.status === 'active').length;

      // Get feature health for all features
      const featureHealthList = await this.getFeatureHealth();
      const healthyFeatures = featureHealthList.filter(f => f.healthStatus === 'healthy').length;
      const featuresAtRisk = featureHealthList.filter(
        f => f.healthStatus === 'warning' || f.healthStatus === 'critical'
      ).length;

      // Get recent changes (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentChanges = plans.filter(
        p => p.updatedAt && new Date(p.updatedAt) > thirtyDaysAgo
      ).length;

      return {
        totalFeatures: allFeatures.size,
        activePlans,
        totalSubscribers,
        healthyFeatures,
        featuresAtRisk,
        deprecatedFeatures: 0, // Would query deprecation schedules
        recentChanges
      };
    } catch (error) {
      logger.error('Failed to get dashboard summary', { error });
      throw error;
    }
  }

  /**
   * Get feature usage overview across all plans
   */
  async getFeatureUsageOverview(dateRange?: DateRange): Promise<FeatureUsageOverview[]> {
    try {
      const plans = await this.subscriptionPlanRepo.findAll();
      const featureMap = new Map<string, FeatureUsageOverview>();

      // Initialize date range (default: last 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const range: DateRange = dateRange || { start: thirtyDaysAgo, end: now };

      // Aggregate across all plans
      for (const plan of plans) {
        if (!plan.isActive) continue;

        // Get adoption data for this plan
        try {
          const adoptionData = await this.featureAnalyticsService.getFeatureAdoption(plan.id, range);
          
          for (const feature of adoptionData.features) {
            const existing = featureMap.get(feature.name);
            
            if (existing) {
              existing.totalPlansOffering++;
              existing.totalUsersWithAccess += feature.availableToUsers;
              existing.activeUsers += feature.activeUsers;
              existing.usageCount += feature.avgUsagePerUser * feature.activeUsers;
            } else {
              featureMap.set(feature.name, {
                featureName: feature.name,
                displayName: this.getFeatureDisplayName(feature.name),
                totalPlansOffering: 1,
                totalUsersWithAccess: feature.availableToUsers,
                activeUsers: feature.activeUsers,
                adoptionRate: feature.adoptionRate,
                trend: feature.trend,
                usageCount: feature.avgUsagePerUser * feature.activeUsers
              });
            }
          }
        } catch (error) {
          logger.warn('Failed to get adoption data for plan', { planId: plan.id, error });
        }
      }

      // Recalculate adoption rates
      const overview = Array.from(featureMap.values()).map(f => ({
        ...f,
        adoptionRate: f.totalUsersWithAccess > 0 
          ? (f.activeUsers / f.totalUsersWithAccess) * 100 
          : 0
      }));

      return overview.sort((a, b) => b.adoptionRate - a.adoptionRate);
    } catch (error) {
      logger.error('Failed to get feature usage overview', { error });
      throw error;
    }
  }

  /**
   * Get feature health monitoring data
   */
  async getFeatureHealth(featureName?: string): Promise<FeatureHealth[]> {
    try {
      const overview = await this.getFeatureUsageOverview();
      const features = featureName 
        ? overview.filter(f => f.featureName === featureName)
        : overview;

      const healthData: FeatureHealth[] = [];

      for (const feature of features) {
        const alerts = this.generateHealthAlerts(feature);
        const healthStatus = this.determineHealthStatus(feature, alerts);

        healthData.push({
          featureName: feature.featureName,
          healthStatus,
          adoptionRate: feature.adoptionRate,
          alerts,
          metrics: {
            totalUsers: feature.totalUsersWithAccess,
            activeUsers: feature.activeUsers,
            usageFrequency: feature.usageCount / Math.max(feature.activeUsers, 1)
          }
        });
      }

      return healthData;
    } catch (error) {
      logger.error('Failed to get feature health', { featureName, error });
      throw error;
    }
  }

  /**
   * Get underutilized features below threshold
   */
  async getUnderutilizedFeatures(threshold: number = 30): Promise<FeatureUsageOverview[]> {
    try {
      const overview = await this.getFeatureUsageOverview();
      return overview.filter(f => f.adoptionRate < threshold);
    } catch (error) {
      logger.error('Failed to get underutilized features', { threshold, error });
      throw error;
    }
  }

  /**
   * Get high-value features driving upgrades
   */
  async getHighValueFeatures(limit: number = 10): Promise<FeatureUsageOverview[]> {
    try {
      const overview = await this.getFeatureUsageOverview();
      
      // Sort by adoption rate and usage count
      const sorted = overview.sort((a, b) => {
        const scoreA = a.adoptionRate * 0.6 + (a.usageCount / a.totalUsersWithAccess) * 0.4;
        const scoreB = b.adoptionRate * 0.6 + (b.usageCount / b.totalUsersWithAccess) * 0.4;
        return scoreB - scoreA;
      });

      return sorted.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get high-value features', { limit, error });
      throw error;
    }
  }

  /**
   * Get feature lifecycle information
   */
  async getFeatureLifecycle(featureName: string): Promise<FeatureLifecycle> {
    try {
      const plans = await this.subscriptionPlanRepo.findAll();
      const plansWithFeature = plans.filter(p => 
        p.features && Array.isArray(p.features) && p.features.includes(featureName)
      );

      // Get total users
      let totalUsers = 0;
      for (const plan of plansWithFeature) {
        const subs = await this.userSubscriptionRepo.findAll({ planId: plan.id });
        totalUsers += subs.filter((s: UserSubscription) => s.status === 'active').length;
      }

      // Get version history from the first plan (simplified)
      const versionHistory = plansWithFeature.length > 0 
        ? await this.featureVersioningService.getFeatureVersionHistory(plansWithFeature[0].basePlanId || plansWithFeature[0].id)
        : [];

      return {
        featureName,
        status: 'active',
        addedDate: plansWithFeature.length > 0 && plansWithFeature[0].createdAt ? plansWithFeature[0].createdAt : new Date(),
        plans: plansWithFeature.map(p => ({
          planId: p.id,
          planName: p.name,
          addedVersion: 1,
          currentVersion: p.version || 1
        })),
        totalUsers,
        versionHistory: versionHistory.map(v => ({
          version: v.version,
          date: v.effectiveDate,
          changes: v.changes.map(c => `${c.changeType}: ${c.featureName}`).join(', '),
          addedToPlanCount: 1
        }))
      };
    } catch (error) {
      logger.error('Failed to get feature lifecycle', { featureName, error });
      throw error;
    }
  }

  /**
   * Execute bulk feature operation across multiple plans
   */
  async executeBulkOperation(
    operation: BulkFeatureOperation,
    adminId: string
  ): Promise<BulkOperationResult> {
    try {
      logger.info('Executing bulk feature operation', { operation, adminId });

      const operationId = `bulk_${Date.now()}`;
      const errors: Array<{ planId: string; error: string }> = [];
      const warnings: string[] = [];
      let affectedPlans = 0;
      let affectedUsers = 0;

      for (const planId of operation.targetPlanIds) {
        try {
          // Get plan
          const plan = await this.subscriptionPlanRepo.findById(planId);
          if (!plan) {
            errors.push({ planId, error: 'Plan not found' });
            continue;
          }

          // Prepare feature changes
          const changes: FeatureChange[] = [{
            featureName: operation.featureName,
            changeType: operation.operation === 'enable' ? 'added' : 
                       operation.operation === 'disable' ? 'removed' : 'modified',
            oldValue: this.getFeatureValue(plan, operation.featureName),
            newValue: operation.newValue,
            reason: `Bulk ${operation.operation} operation`,
          }];

          // Apply versioning
          const grandfatheringRules = this.buildGrandfatheringRules(operation);
          
          await this.featureVersioningService.createFeatureVersion(
            planId,
            changes,
            {
              rolloutStrategy: operation.rolloutStrategy,
              grandfatheringRules,
              effectiveDate: operation.scheduledDate,
              releaseNotes: `Bulk operation: ${operation.operation} ${operation.featureName}`
            },
            adminId
          );

          // Count affected users
          const subs = await this.userSubscriptionRepo.findAll({ planId });
          affectedUsers += subs.filter((s: UserSubscription) => !s.isGrandfathered).length;
          affectedPlans++;

        } catch (error: any) {
          errors.push({ 
            planId, 
            error: error.message || 'Unknown error' 
          });
        }
      }

      // Add warnings if needed
      if (affectedUsers > 1000) {
        warnings.push('Large number of users affected. Consider gradual rollout.');
      }

      return {
        success: errors.length === 0,
        operationId,
        affectedPlans,
        affectedUsers,
        errors,
        warnings
      };
    } catch (error) {
      logger.error('Failed to execute bulk operation', { operation, adminId, error });
      throw error;
    }
  }

  /**
   * Generate health alerts for a feature
   */
  private generateHealthAlerts(feature: FeatureUsageOverview): FeatureHealthAlert[] {
    const alerts: FeatureHealthAlert[] = [];

    // Low adoption alert
    if (feature.adoptionRate < 25) {
      alerts.push({
        type: 'low_adoption',
        severity: 'warning',
        message: `Low adoption rate (${feature.adoptionRate.toFixed(1)}%)`,
        recommendation: 'Consider deprecation or better promotion',
        estimatedSavings: feature.totalUsersWithAccess * 5 // Rough estimate
      });
    }

    // High value alert
    if (feature.adoptionRate > 80 && feature.usageCount > 1000) {
      alerts.push({
        type: 'high_value',
        severity: 'info',
        message: 'High adoption and usage - key feature',
        recommendation: 'Highlight in marketing and protect from changes'
      });
    }

    // Deprecation candidate
    if (feature.adoptionRate < 15 && feature.trend === 'decreasing') {
      alerts.push({
        type: 'deprecation_candidate',
        severity: 'critical',
        message: 'Very low and decreasing adoption',
        recommendation: 'Strong candidate for deprecation',
        estimatedSavings: feature.totalUsersWithAccess * 8
      });
    }

    return alerts;
  }

  /**
   * Determine overall health status
   */
  private determineHealthStatus(
    feature: FeatureUsageOverview,
    alerts: FeatureHealthAlert[]
  ): 'healthy' | 'warning' | 'critical' {
    const hasCritical = alerts.some(a => a.severity === 'critical');
    const hasWarning = alerts.some(a => a.severity === 'warning');

    if (hasCritical) return 'critical';
    if (hasWarning) return 'warning';
    return 'healthy';
  }

  /**
   * Get feature display name
   */
  private getFeatureDisplayName(featureName: string): string {
    // Convert camelCase to Title Case
    const name = featureName
      .replace(/^include/, '')
      .replace(/^max/, 'Max ')
      .replace(/([A-Z])/g, ' $1')
      .trim();
    
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  /**
   * Get current feature value from plan
   */
  private getFeatureValue(plan: any, featureName: string): any {
    return plan[featureName];
  }

  /**
   * Build grandfathering rules from operation
   */
  private buildGrandfatheringRules(operation: BulkFeatureOperation): GrandfatheringRule[] {
    if (operation.grandfatheringRule === 'all') {
      return [{
        condition: 'all',
        retainOldValue: true,
        notificationRequired: true
      }];
    }

    if (operation.grandfatheringRule === 'none') {
      return [];
    }

    return operation.customGrandfatheringRules || [];
  }
}
