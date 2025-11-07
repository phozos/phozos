/**
 * Feature Analytics Service
 * 
 * Tracks feature usage, calculates adoption rates, and provides analytics
 * for understanding which features are actively used across subscription plans.
 */

import { BaseService } from '../base.service';
import { container, TYPES } from '../container';
import { 
  IFeatureUsageRepository, 
  DateRange, 
  FeatureAdoptionData,
  UsageTrendData,
  IUserSubscriptionRepository,
  ISubscriptionPlanRepository
} from '../../repositories';
import { ValidationServiceError } from '../errors';

export interface FeatureAdoptionReport {
  planName: string;
  planId: string;
  totalSubscribers: number;
  features: Array<{
    name: string;
    availableToUsers: number;
    activeUsers: number;
    adoptionRate: number;
    avgUsagePerUser: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  }>;
}

export interface FeatureROI {
  featureName: string;
  totalUsers: number;
  activeUsers: number;
  adoptionRate: number;
  avgUsagePerActiveUser: number;
  totalUsageCount: number;
  firstUsedDate: Date | null;
  lastUsedDate: Date | null;
  trend: 'increasing' | 'stable' | 'decreasing';
  recommendations: string[];
}

export interface UsageTrend {
  date: Date;
  usageCount: number;
  uniqueUsers: number;
}

export type UsageType = 'accessed' | 'completed' | 'attempted';

export interface IFeatureAnalyticsService {
  trackFeatureUsage(
    userId: string,
    featureName: string,
    usageType: UsageType,
    metadata?: Record<string, any>
  ): Promise<void>;
  getFeatureAdoption(planId: string, dateRange?: DateRange): Promise<FeatureAdoptionReport>;
  getUnderutilizedFeatures(threshold: number): Promise<string[]>;
  calculateFeatureROI(featureName: string, dateRange?: DateRange): Promise<FeatureROI>;
  getFeatureUsageTrends(featureName: string, timeRange: DateRange): Promise<UsageTrend[]>;
  generateUsageSummaries(planId: string, periodStart: Date, periodEnd: Date): Promise<void>;
}

export class FeatureAnalyticsService extends BaseService implements IFeatureAnalyticsService {
  private get featureUsageRepo(): IFeatureUsageRepository {
    return container.get<IFeatureUsageRepository>(TYPES.IFeatureUsageRepository);
  }

  private get userSubscriptionRepo(): IUserSubscriptionRepository {
    return container.get<IUserSubscriptionRepository>(TYPES.IUserSubscriptionRepository);
  }

  private get subscriptionPlanRepo(): ISubscriptionPlanRepository {
    return container.get<ISubscriptionPlanRepository>(TYPES.ISubscriptionPlanRepository);
  }

  /**
   * Track a feature usage event
   * This is called whenever a user accesses, completes, or attempts a feature
   */
  async trackFeatureUsage(
    userId: string,
    featureName: string,
    usageType: UsageType,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const subscription = await this.userSubscriptionRepo.findByUser(userId);
      
      if (!subscription || subscription.status !== 'active') {
        return;
      }

      await this.featureUsageRepo.trackFeatureUsage(
        userId,
        subscription.id,
        featureName,
        usageType,
        metadata
      );
    } catch (error) {
      return this.handleError(error, 'FeatureAnalyticsService.trackFeatureUsage');
    }
  }

  /**
   * Get feature adoption report for a subscription plan
   * Shows which features are being used and by how many users
   */
  async getFeatureAdoption(planId: string, dateRange?: DateRange): Promise<FeatureAdoptionReport> {
    try {
      const plan = await this.subscriptionPlanRepo.findById(planId);
      
      const allSubscriptions = await this.userSubscriptionRepo.findAll({ planId } as any);
      const activeCount = allSubscriptions.filter((sub: any) => sub.status === 'active').length;

      const adoptionData = await this.featureUsageRepo.getFeatureAdoptionByPlan(
        planId,
        dateRange
      );

      return {
        planName: plan.name,
        planId: plan.id,
        totalSubscribers: activeCount,
        features: adoptionData.map(feature => ({
          name: feature.featureName,
          availableToUsers: feature.availableToUsers,
          activeUsers: feature.activeUsers,
          adoptionRate: feature.adoptionRate,
          avgUsagePerUser: feature.avgUsagePerUser,
          trend: this.calculateTrend(feature)
        }))
      };
    } catch (error) {
      return this.handleError(error, 'FeatureAnalyticsService.getFeatureAdoption');
    }
  }

  /**
   * Get list of underutilized features based on adoption threshold
   * Helps identify features that may need better promotion or should be deprecated
   */
  async getUnderutilizedFeatures(threshold: number = 20): Promise<string[]> {
    try {
      if (threshold < 0 || threshold > 100) {
        throw new ValidationServiceError('FeatureAnalytics', {
          threshold: 'Threshold must be between 0 and 100'
        });
      }

      return await this.featureUsageRepo.getUnderutilizedFeatures(threshold);
    } catch (error) {
      return this.handleError(error, 'FeatureAnalyticsService.getUnderutilizedFeatures');
    }
  }

  /**
   * Calculate ROI and usage statistics for a specific feature
   * Provides detailed insights about feature value and engagement
   */
  async calculateFeatureROI(featureName: string, dateRange?: DateRange): Promise<FeatureROI> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const range = dateRange || {
        start: thirtyDaysAgo,
        end: new Date()
      };

      const trends = await this.featureUsageRepo.getFeatureUsageTrends(
        featureName,
        range
      );

      if (trends.length === 0) {
        return {
          featureName,
          totalUsers: 0,
          activeUsers: 0,
          adoptionRate: 0,
          avgUsagePerActiveUser: 0,
          totalUsageCount: 0,
          firstUsedDate: null,
          lastUsedDate: null,
          trend: 'stable',
          recommendations: ['No usage data available for this feature in the specified time range']
        };
      }

      const totalUsageCount = trends.reduce((sum, day) => sum + day.usageCount, 0);
      const uniqueUsersSet = new Set<number>();
      trends.forEach(day => uniqueUsersSet.add(day.uniqueUsers));
      const totalUniqueUsers = trends.reduce((sum, day) => sum + day.uniqueUsers, 0);
      const avgUniqueUsers = Math.round(totalUniqueUsers / trends.length);

      const avgUsagePerActiveUser = avgUniqueUsers > 0 
        ? Math.round((totalUsageCount / avgUniqueUsers) * 100) / 100
        : 0;

      const trendDirection = this.analyzeTrendDirection(trends);

      const recommendations = this.generateRecommendations({
        featureName,
        totalUsageCount,
        avgUniqueUsers,
        trendDirection,
        avgUsagePerActiveUser
      });

      return {
        featureName,
        totalUsers: avgUniqueUsers,
        activeUsers: avgUniqueUsers,
        adoptionRate: 0,
        avgUsagePerActiveUser,
        totalUsageCount,
        firstUsedDate: trends.length > 0 ? trends[0].date : null,
        lastUsedDate: trends.length > 0 ? trends[trends.length - 1].date : null,
        trend: trendDirection,
        recommendations
      };
    } catch (error) {
      return this.handleError(error, 'FeatureAnalyticsService.calculateFeatureROI');
    }
  }

  /**
   * Get usage trends over time for a specific feature
   * Shows daily usage patterns and unique user engagement
   */
  async getFeatureUsageTrends(featureName: string, timeRange: DateRange): Promise<UsageTrend[]> {
    try {
      const trends = await this.featureUsageRepo.getFeatureUsageTrends(
        featureName,
        timeRange
      );

      return trends.map(trend => ({
        date: trend.date,
        usageCount: trend.usageCount,
        uniqueUsers: trend.uniqueUsers
      }));
    } catch (error) {
      return this.handleError(error, 'FeatureAnalyticsService.getFeatureUsageTrends');
    }
  }

  /**
   * Generate aggregated usage summaries for a plan over a period
   * This can be run periodically to create summary reports
   */
  async generateUsageSummaries(
    planId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<void> {
    try {
      await this.featureUsageRepo.aggregateUsageSummary(
        planId,
        periodStart,
        periodEnd
      );
    } catch (error) {
      return this.handleError(error, 'FeatureAnalyticsService.generateUsageSummaries');
    }
  }

  /**
   * Helper method to calculate trend from adoption data
   */
  private calculateTrend(feature: FeatureAdoptionData): 'increasing' | 'stable' | 'decreasing' {
    return feature.trend || 'stable';
  }

  /**
   * Analyze trend direction from usage trend data
   */
  private analyzeTrendDirection(trends: UsageTrendData[]): 'increasing' | 'stable' | 'decreasing' {
    if (trends.length < 3) {
      return 'stable';
    }

    const midPoint = Math.floor(trends.length / 2);
    const firstHalf = trends.slice(0, midPoint);
    const secondHalf = trends.slice(midPoint);

    const firstHalfAvg = firstHalf.reduce((sum, t) => sum + t.usageCount, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, t) => sum + t.usageCount, 0) / secondHalf.length;

    const percentChange = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    if (percentChange > 10) return 'increasing';
    if (percentChange < -10) return 'decreasing';
    return 'stable';
  }

  /**
   * Generate recommendations based on feature usage patterns
   */
  private generateRecommendations(data: {
    featureName: string;
    totalUsageCount: number;
    avgUniqueUsers: number;
    trendDirection: 'increasing' | 'stable' | 'decreasing';
    avgUsagePerActiveUser: number;
  }): string[] {
    const recommendations: string[] = [];

    if (data.totalUsageCount === 0) {
      recommendations.push('Feature has no usage. Consider removing or better promoting this feature.');
    } else if (data.avgUniqueUsers < 5) {
      recommendations.push('Low user adoption. Consider improving feature visibility or user education.');
    }

    if (data.trendDirection === 'decreasing') {
      recommendations.push('Usage is declining. Investigate user feedback or consider feature improvements.');
    } else if (data.trendDirection === 'increasing') {
      recommendations.push('Feature adoption is growing. Consider expanding or enhancing this feature.');
    }

    if (data.avgUsagePerActiveUser > 10) {
      recommendations.push('High engagement from active users. This is a valuable feature worth maintaining.');
    } else if (data.avgUsagePerActiveUser < 2 && data.avgUniqueUsers > 0) {
      recommendations.push('Users try the feature but don\'t use it repeatedly. Improve user experience or value proposition.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Feature shows stable, healthy usage patterns.');
    }

    return recommendations;
  }
}

export const featureAnalyticsService = new FeatureAnalyticsService();
