/**
 * Feature Impact Preview Service (Phase 4.1)
 * 
 * Analyzes the impact of feature changes before applying them.
 * Provides comprehensive preview including:
 * - Affected user counts
 * - Financial impact
 * - Risk assessment
 * - Recommendations
 */

import { BaseService } from '../../base.service';
import { container, TYPES } from '../../container';
import { 
  IUserSubscriptionRepository,
  ISubscriptionPlanRepository,
  IFeatureUsageRepository,
  DateRange
} from '../../../repositories';
import { FeatureEntitlementService } from '../feature-entitlement.service';
import { IFeatureAnalyticsService } from '../feature-analytics.service';
import { FeatureChanges } from '../../../types/feature-types';
import { logger } from '../../../utils/logger';
import { UserSubscription } from '@shared/schema';

/**
 * Summary of subscribers affected by changes
 */
export interface ImpactSummary {
  totalSubscribers: number;
  grandfatheredUsers: number;
  affectedUsers: number;
  byTier: Record<string, number>;
  byStatus: {
    active: number;
    grandfathered: number;
    expired: number;
  };
}

/**
 * Detailed impact for a specific feature
 */
export interface FeatureImpactDetail {
  featureName: string;
  changeType: 'added' | 'removed' | 'modified';
  oldValue?: any;
  newValue?: any;
  impact: {
    affectedUsers: number;
    notificationsRequired: number;
    estimatedAdoption: number;
    currentlyAtLimit?: number;
    willBenefitImmediately?: number;
  };
}

/**
 * Risk assessment for the changes
 */
export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation: string;
}

/**
 * Financial impact estimation
 */
export interface FinancialImpact {
  estimatedRevenue: {
    upgrades: number;
    downgrades: number;
    net: number;
  };
  churnRisk: {
    level: 'low' | 'medium' | 'high';
    percentage: number;
    affectedUsers: number;
  };
  costSavings?: number;
}

/**
 * Migration plan for feature changes
 */
export interface MigrationPlan {
  recommendedStrategy: 'immediate' | 'gradual' | 'phased';
  suggestedTimeline: {
    announcement: Date;
    implementation: Date;
    completion: Date;
  };
  requiredActions: string[];
}

/**
 * Complete impact analysis
 */
export interface ImpactAnalysis {
  summary: ImpactSummary;
  featureBreakdown: FeatureImpactDetail[];
  recommendations: string[];
  risks: RiskAssessment[];
  financialImpact: FinancialImpact;
  migrationPlan?: MigrationPlan;
}

/**
 * User at risk of churning
 */
export interface AtRiskUser {
  userId: string;
  userName: string;
  planName: string;
  riskScore: number;
  reasons: string[];
}

export interface IFeatureImpactPreviewService {
  analyzeFeatureChange(
    planId: string,
    changes: FeatureChanges
  ): Promise<ImpactAnalysis>;
  
  predictAdoptionRate(
    featureName: string,
    planId: string
  ): Promise<number>;
  
  calculateFinancialImpact(
    planId: string,
    changes: FeatureChanges
  ): Promise<FinancialImpact>;
  
  identifyAtRiskUsers(
    planId: string,
    changes: FeatureChanges
  ): Promise<AtRiskUser[]>;
}

export class FeatureImpactPreviewService extends BaseService implements IFeatureImpactPreviewService {
  private get userSubscriptionRepo(): IUserSubscriptionRepository {
    return container.get<IUserSubscriptionRepository>(TYPES.IUserSubscriptionRepository);
  }

  private get subscriptionPlanRepo(): ISubscriptionPlanRepository {
    return container.get<ISubscriptionPlanRepository>(TYPES.ISubscriptionPlanRepository);
  }

  private get featureUsageRepo(): IFeatureUsageRepository {
    return container.get<IFeatureUsageRepository>(TYPES.IFeatureUsageRepository);
  }

  private get featureEntitlementService(): FeatureEntitlementService {
    return container.get<FeatureEntitlementService>(TYPES.IFeatureEntitlementService);
  }

  private get featureAnalyticsService(): IFeatureAnalyticsService {
    return container.get<IFeatureAnalyticsService>(TYPES.IFeatureAnalyticsService);
  }

  /**
   * Analyze the complete impact of feature changes
   */
  async analyzeFeatureChange(
    planId: string,
    changes: FeatureChanges
  ): Promise<ImpactAnalysis> {
    try {
      logger.info('Analyzing feature change impact', { planId, changes });

      // Get plan details
      const plan = await this.subscriptionPlanRepo.findById(planId);
      if (!plan) {
        throw new Error(`Plan not found: ${planId}`);
      }

      // Get impact summary
      const summary = await this.calculateImpactSummary(planId);

      // Analyze each feature change
      const featureBreakdown = await this.analyzeFeatureChanges(planId, changes, plan);

      // Calculate financial impact
      const financialImpact = await this.calculateFinancialImpact(planId, changes);

      // Assess risks
      const risks = this.assessRisks(summary, featureBreakdown, financialImpact);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        summary,
        featureBreakdown,
        risks,
        financialImpact
      );

      // Create migration plan if needed
      const migrationPlan = this.createMigrationPlan(summary, risks);

      return {
        summary,
        featureBreakdown,
        recommendations,
        risks,
        financialImpact,
        migrationPlan
      };
    } catch (error) {
      logger.error('Failed to analyze feature change impact', { planId, changes, error });
      throw error;
    }
  }

  /**
   * Calculate impact summary
   */
  private async calculateImpactSummary(planId: string): Promise<ImpactSummary> {
    const subscribers = await this.userSubscriptionRepo.findAll({ planId });
    
    const totalSubscribers = subscribers.length;
    const grandfatheredUsers = subscribers.filter((s: UserSubscription) => s.isGrandfathered).length;
    const affectedUsers = totalSubscribers - grandfatheredUsers;

    // Group by tier (based on plan name or tier level)
    const byTier: Record<string, number> = {};
    for (const sub of subscribers) {
      const plan = await this.subscriptionPlanRepo.findById(sub.planId);
      if (plan) {
        byTier[plan.name] = (byTier[plan.name] || 0) + 1;
      }
    }

    // Group by status
    const byStatus = {
      active: subscribers.filter((s: UserSubscription) => s.status === 'active').length,
      grandfathered: grandfatheredUsers,
      expired: subscribers.filter((s: UserSubscription) => s.status === 'expired').length
    };

    return {
      totalSubscribers,
      grandfatheredUsers,
      affectedUsers,
      byTier,
      byStatus
    };
  }

  /**
   * Analyze individual feature changes
   */
  private async analyzeFeatureChanges(
    planId: string,
    changes: FeatureChanges,
    plan: any
  ): Promise<FeatureImpactDetail[]> {
    const details: FeatureImpactDetail[] = [];

    // Analyze each changed field
    for (const [fieldName, newValue] of Object.entries(changes)) {
      const oldValue = (plan as any)[fieldName];
      
      // Skip if no actual change
      if (oldValue === newValue) continue;

      const detail = await this.analyzeFeatureDetail(
        planId,
        fieldName,
        oldValue,
        newValue
      );
      
      if (detail) {
        details.push(detail);
      }
    }

    return details;
  }

  /**
   * Analyze a single feature change
   */
  private async analyzeFeatureDetail(
    planId: string,
    featureName: string,
    oldValue: any,
    newValue: any
  ): Promise<FeatureImpactDetail | null> {
    try {
      const subscribers = await this.userSubscriptionRepo.findAll({ planId });
      const affectedUsers = subscribers.filter((s: UserSubscription) => !s.isGrandfathered).length;

      // Determine change type
      let changeType: 'added' | 'removed' | 'modified';
      if (oldValue === null || oldValue === undefined) {
        changeType = 'added';
      } else if (newValue === null || newValue === undefined) {
        changeType = 'removed';
      } else {
        changeType = 'modified';
      }

      // Predict adoption rate
      const estimatedAdoption = await this.predictAdoptionRate(featureName, planId);

      // For quota changes, check users currently at limit
      let currentlyAtLimit: number | undefined;
      let willBenefitImmediately: number | undefined;
      
      if (featureName.startsWith('max')) {
        currentlyAtLimit = await this.getUsersAtQuotaLimit(
          planId,
          featureName,
          oldValue
        );
        willBenefitImmediately = currentlyAtLimit;
      }

      return {
        featureName,
        changeType,
        oldValue,
        newValue,
        impact: {
          affectedUsers,
          notificationsRequired: affectedUsers,
          estimatedAdoption,
          currentlyAtLimit,
          willBenefitImmediately
        }
      };
    } catch (error) {
      logger.error('Failed to analyze feature detail', { featureName, error });
      return null;
    }
  }

  /**
   * Predict adoption rate for a feature
   */
  async predictAdoptionRate(
    featureName: string,
    planId: string
  ): Promise<number> {
    try {
      // Get historical adoption data for similar features
      const now = new Date();
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      
      const dateRange: DateRange = {
        start: threeMonthsAgo,
        end: now
      };

      const adoptionData = await this.featureAnalyticsService.getFeatureAdoption(
        planId,
        dateRange
      );

      // Find similar feature or use average
      const similarFeature = adoptionData.features.find(
        f => f.name.includes(featureName.replace(/^include/, '').replace(/^max/, ''))
      );

      if (similarFeature) {
        return similarFeature.adoptionRate / 100;
      }

      // Calculate average adoption across all features
      const avgAdoption = adoptionData.features.reduce(
        (sum, f) => sum + f.adoptionRate,
        0
      ) / adoptionData.features.length;

      return (avgAdoption || 45) / 100; // Default to 45% if no data
    } catch (error) {
      logger.error('Failed to predict adoption rate', { featureName, planId, error });
      return 0.45; // Default 45% adoption
    }
  }

  /**
   * Calculate financial impact of changes
   */
  async calculateFinancialImpact(
    planId: string,
    changes: FeatureChanges
  ): Promise<FinancialImpact> {
    try {
      const plan = await this.subscriptionPlanRepo.findById(planId);
      if (!plan) {
        throw new Error(`Plan not found: ${planId}`);
      }

      const subscribers = await this.userSubscriptionRepo.findAll({ planId });
      const affectedUsers = subscribers.filter((s: UserSubscription) => !s.isGrandfathered);

      // Simple heuristic for upgrade/downgrade estimation
      const hasPositiveChanges = this.hasPositiveChanges(changes);
      const hasNegativeChanges = this.hasNegativeChanges(changes);

      let estimatedUpgrades = 0;
      let estimatedDowngrades = 0;
      
      const planPrice = parseFloat(plan.price);

      if (hasPositiveChanges) {
        // New features may reduce downgrades or encourage upgrades
        estimatedUpgrades = Math.floor(affectedUsers.length * 0.05) * planPrice;
      }

      if (hasNegativeChanges) {
        // Removing features may cause downgrades
        estimatedDowngrades = Math.floor(affectedUsers.length * 0.02) * planPrice;
      }

      // Calculate churn risk
      const churnRisk = this.calculateChurnRisk(subscribers.length, changes);

      return {
        estimatedRevenue: {
          upgrades: estimatedUpgrades,
          downgrades: -estimatedDowngrades,
          net: estimatedUpgrades - estimatedDowngrades
        },
        churnRisk
      };
    } catch (error) {
      logger.error('Failed to calculate financial impact', { planId, changes, error });
      throw error;
    }
  }

  /**
   * Identify users at risk of churning
   */
  async identifyAtRiskUsers(
    planId: string,
    changes: FeatureChanges
  ): Promise<AtRiskUser[]> {
    try {
      const subscribers = await this.userSubscriptionRepo.findAll({ planId });
      const plan = await this.subscriptionPlanRepo.findById(planId);
      
      if (!plan) {
        throw new Error(`Plan not found: ${planId}`);
      }

      const atRiskUsers: AtRiskUser[] = [];

      for (const sub of subscribers) {
        if (sub.isGrandfathered) continue;

        const riskScore = await this.calculateUserRiskScore(sub.userId, changes);
        
        if (riskScore > 0.5) {
          const user = await container.get<any>(TYPES.IUserRepository).findById(sub.userId);
          
          atRiskUsers.push({
            userId: sub.userId,
            userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
            planName: plan.name,
            riskScore,
            reasons: this.getRiskReasons(riskScore, changes)
          });
        }
      }

      return atRiskUsers.sort((a, b) => b.riskScore - a.riskScore);
    } catch (error) {
      logger.error('Failed to identify at-risk users', { planId, changes, error });
      return [];
    }
  }

  /**
   * Calculate user's churn risk score (0-1)
   */
  private async calculateUserRiskScore(
    userId: string,
    changes: FeatureChanges
  ): Promise<number> {
    let score = 0;

    // Check if removing features
    const hasRemovedFeatures = this.hasNegativeChanges(changes);
    if (hasRemovedFeatures) {
      score += 0.4;
    }

    // Check if reducing quotas
    const hasReducedQuotas = Object.entries(changes).some(
      ([key, value]) => key.startsWith('max') && typeof value === 'number'
    );
    if (hasReducedQuotas) {
      score += 0.3;
    }

    return Math.min(score, 1);
  }

  /**
   * Get risk reasons based on score and changes
   */
  private getRiskReasons(score: number, changes: FeatureChanges): string[] {
    const reasons: string[] = [];

    if (this.hasNegativeChanges(changes)) {
      reasons.push('Features being removed from plan');
    }

    if (Object.keys(changes).some(k => k.startsWith('max'))) {
      reasons.push('Quota limits being modified');
    }

    if (score > 0.7) {
      reasons.push('High impact changes to subscription value');
    }

    return reasons;
  }

  /**
   * Get users currently at quota limit
   */
  private async getUsersAtQuotaLimit(
    planId: string,
    quotaField: string,
    currentLimit: number
  ): Promise<number> {
    // This would query quota_usage table
    // For now, return estimate
    const subscribers = await this.userSubscriptionRepo.findAll({ planId });
    return Math.floor(subscribers.length * 0.15); // Estimate 15% at limit
  }

  /**
   * Check if changes include positive improvements
   */
  private hasPositiveChanges(changes: FeatureChanges): boolean {
    return Object.entries(changes).some(([key, value]) => {
      if (key.startsWith('include') && value === true) return true;
      if (key.startsWith('max') && typeof value === 'number') return true;
      if (Array.isArray(value) && value.length > 0) return true;
      return false;
    });
  }

  /**
   * Check if changes include negative impacts
   */
  private hasNegativeChanges(changes: FeatureChanges): boolean {
    return Object.entries(changes).some(([key, value]) => {
      if (key.startsWith('include') && value === false) return true;
      if (Array.isArray(value) && value.length === 0) return true;
      return false;
    });
  }

  /**
   * Calculate churn risk
   */
  private calculateChurnRisk(
    totalUsers: number,
    changes: FeatureChanges
  ): FinancialImpact['churnRisk'] {
    const hasNegativeChanges = this.hasNegativeChanges(changes);
    
    if (!hasNegativeChanges) {
      return {
        level: 'low',
        percentage: 2.3,
        affectedUsers: Math.floor(totalUsers * 0.023)
      };
    }

    // More negative changes = higher churn risk
    const negativeCount = Object.values(changes).filter(v => v === false || (Array.isArray(v) && v.length === 0)).length;
    
    if (negativeCount >= 3) {
      return {
        level: 'high',
        percentage: 8.5,
        affectedUsers: Math.floor(totalUsers * 0.085)
      };
    }

    return {
      level: 'medium',
      percentage: 5.0,
      affectedUsers: Math.floor(totalUsers * 0.05)
    };
  }

  /**
   * Assess risks of the changes
   */
  private assessRisks(
    summary: ImpactSummary,
    featureBreakdown: FeatureImpactDetail[],
    financialImpact: FinancialImpact
  ): RiskAssessment[] {
    const risks: RiskAssessment[] = [];

    // Check for users at quota limit
    const usersAtLimit = featureBreakdown.reduce(
      (sum, f) => sum + (f.impact.currentlyAtLimit || 0),
      0
    );

    if (usersAtLimit > 0) {
      risks.push({
        level: usersAtLimit > 50 ? 'high' : 'medium',
        description: `${usersAtLimit} users currently at quota limits`,
        mitigation: 'Grandfather existing users or provide migration path before reducing quotas'
      });
    }

    // Check churn risk
    if (financialImpact.churnRisk.level === 'high') {
      risks.push({
        level: 'high',
        description: `High churn risk (${financialImpact.churnRisk.percentage}%) affecting ${financialImpact.churnRisk.affectedUsers} users`,
        mitigation: 'Consider gradual rollout with notification period and migration incentives'
      });
    }

    // Check for feature removals
    const removedFeatures = featureBreakdown.filter(f => f.changeType === 'removed');
    if (removedFeatures.length > 0) {
      risks.push({
        level: 'medium',
        description: `Removing ${removedFeatures.length} features may impact user satisfaction`,
        mitigation: 'Provide alternative features or migration guide before removal'
      });
    }

    // If no risks found, add low risk
    if (risks.length === 0) {
      risks.push({
        level: 'low',
        description: 'Changes have minimal negative impact',
        mitigation: 'Standard notification and monitoring recommended'
      });
    }

    return risks;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    summary: ImpactSummary,
    featureBreakdown: FeatureImpactDetail[],
    risks: RiskAssessment[],
    financialImpact: FinancialImpact
  ): string[] {
    const recommendations: string[] = [];

    // Check if should grandfather
    if (summary.affectedUsers > 100) {
      recommendations.push('Create new plan version to grandfather existing users');
    }

    // Check if should notify early
    const hasHighRisk = risks.some(r => r.level === 'high' || r.level === 'critical');
    if (hasHighRisk) {
      recommendations.push('Send notification 30-60 days before change implementation');
    } else {
      recommendations.push('Send notification 14-30 days before change');
    }

    // Check for migration incentives
    if (financialImpact.churnRisk.level !== 'low') {
      recommendations.push('Offer migration incentive or discount to affected users');
    }

    // Feature additions
    const addedFeatures = featureBreakdown.filter(f => f.changeType === 'added');
    if (addedFeatures.length > 0) {
      recommendations.push('Highlight new features in marketing and user communications');
    }

    // Feature removals
    const removedFeatures = featureBreakdown.filter(f => f.changeType === 'removed');
    if (removedFeatures.length > 0) {
      recommendations.push('Provide detailed migration guide for removed features');
    }

    return recommendations;
  }

  /**
   * Create migration plan
   */
  private createMigrationPlan(
    summary: ImpactSummary,
    risks: RiskAssessment[]
  ): MigrationPlan | undefined {
    const hasHighImpact = summary.affectedUsers > 100 || risks.some(r => r.level === 'high' || r.level === 'critical');
    
    if (!hasHighImpact) {
      return undefined;
    }

    const now = new Date();
    const announcement = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week
    const implementation = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 1 month
    const completion = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 2 months

    return {
      recommendedStrategy: 'phased',
      suggestedTimeline: {
        announcement,
        implementation,
        completion
      },
      requiredActions: [
        'Prepare user communication materials',
        'Set up migration support channels',
        'Create FAQ and documentation',
        'Monitor user feedback and adjust plan as needed'
      ]
    };
  }
}
