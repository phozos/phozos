import { BaseRepository, DbOrTransaction } from './base.repository';
import { 
  FeatureUsageEvent, 
  InsertFeatureUsageEvent, 
  featureUsageEvents,
  FeatureUsageSummary,
  InsertFeatureUsageSummary,
  featureUsageSummary,
  userSubscriptions,
  subscriptionPlans
} from '@shared/schema';
import { db } from '../db';
import { eq, and, sql, desc, gte, lte, between } from 'drizzle-orm';
import { handleDatabaseError, NotFoundError } from './errors';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface FeatureAdoptionData {
  featureName: string;
  availableToUsers: number;
  activeUsers: number;
  adoptionRate: number;
  avgUsagePerUser: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface UsageTrendData {
  date: Date;
  usageCount: number;
  uniqueUsers: number;
}

export interface IFeatureUsageRepository {
  findById(id: string, tx?: DbOrTransaction): Promise<FeatureUsageEvent>;
  findByIdOptional(id: string, tx?: DbOrTransaction): Promise<FeatureUsageEvent | undefined>;
  create(data: InsertFeatureUsageEvent, tx?: DbOrTransaction): Promise<FeatureUsageEvent>;
  trackFeatureUsage(
    userId: string, 
    subscriptionId: string, 
    featureName: string, 
    usageType: string, 
    metadata?: Record<string, any>,
    tx?: DbOrTransaction
  ): Promise<FeatureUsageEvent>;
  getFeatureAdoptionByPlan(
    planId: string, 
    dateRange?: DateRange,
    tx?: DbOrTransaction
  ): Promise<FeatureAdoptionData[]>;
  getFeatureUsageTrends(
    featureName: string, 
    timeRange: DateRange,
    tx?: DbOrTransaction
  ): Promise<UsageTrendData[]>;
  getUnderutilizedFeatures(
    threshold: number,
    tx?: DbOrTransaction
  ): Promise<string[]>;
  getUserFeatureActivity(
    userId: string, 
    dateRange?: DateRange,
    tx?: DbOrTransaction
  ): Promise<FeatureUsageEvent[]>;
  aggregateUsageSummary(
    planId: string, 
    periodStart: Date, 
    periodEnd: Date,
    tx?: DbOrTransaction
  ): Promise<FeatureUsageSummary[]>;
  createSummary(data: InsertFeatureUsageSummary, tx?: DbOrTransaction): Promise<FeatureUsageSummary>;
  updateSummary(id: string, data: Partial<FeatureUsageSummary>, tx?: DbOrTransaction): Promise<FeatureUsageSummary>;
}

export class FeatureUsageRepository extends BaseRepository<FeatureUsageEvent, InsertFeatureUsageEvent> implements IFeatureUsageRepository {
  constructor() {
    super(featureUsageEvents, 'id');
  }

  async trackFeatureUsage(
    userId: string,
    subscriptionId: string,
    featureName: string,
    usageType: string,
    metadata?: Record<string, any>,
    tx?: DbOrTransaction
  ): Promise<FeatureUsageEvent> {
    try {
      return await this.create({
        userId,
        subscriptionId,
        featureName,
        usageType,
        metadata: metadata || null
      }, tx);
    } catch (error) {
      handleDatabaseError(error, 'FeatureUsageRepository.trackFeatureUsage');
    }
  }

  async getFeatureAdoptionByPlan(
    planId: string,
    dateRange?: DateRange,
    tx?: DbOrTransaction
  ): Promise<FeatureAdoptionData[]> {
    try {
      const executor = tx || db;
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const startDate = dateRange?.start || thirtyDaysAgo;
      const endDate = dateRange?.end || new Date();

      const query = sql`
        SELECT 
          fue.feature_name,
          COUNT(DISTINCT us.user_id) as available_to_users,
          COUNT(DISTINCT fue.user_id) as active_users,
          ROUND(
            (COUNT(DISTINCT fue.user_id)::decimal / NULLIF(COUNT(DISTINCT us.user_id), 0)) * 100, 
            2
          ) as adoption_rate,
          ROUND(
            COUNT(fue.id)::decimal / NULLIF(COUNT(DISTINCT fue.user_id), 0), 
            2
          ) as avg_usage_per_user
        FROM ${subscriptionPlans} sp
        LEFT JOIN ${userSubscriptions} us ON us.plan_id = sp.id AND us.status = 'active'
        LEFT JOIN ${featureUsageEvents} fue ON fue.subscription_id = us.id 
          AND fue.created_at BETWEEN ${startDate} AND ${endDate}
        WHERE sp.id = ${planId}
        GROUP BY fue.feature_name
        HAVING fue.feature_name IS NOT NULL
        ORDER BY adoption_rate DESC
      `;

      const results = await executor.execute(query);
      
      return (results.rows as any[]).map(row => ({
        featureName: row.feature_name,
        availableToUsers: parseInt(row.available_to_users) || 0,
        activeUsers: parseInt(row.active_users) || 0,
        adoptionRate: parseFloat(row.adoption_rate) || 0,
        avgUsagePerUser: parseFloat(row.avg_usage_per_user) || 0,
        trend: 'stable' as const
      }));
    } catch (error) {
      handleDatabaseError(error, 'FeatureUsageRepository.getFeatureAdoptionByPlan');
    }
  }

  async getFeatureUsageTrends(
    featureName: string,
    timeRange: DateRange,
    tx?: DbOrTransaction
  ): Promise<UsageTrendData[]> {
    try {
      const executor = tx || db;

      const query = sql`
        SELECT 
          DATE(created_at) as date,
          COUNT(id) as usage_count,
          COUNT(DISTINCT user_id) as unique_users
        FROM ${featureUsageEvents}
        WHERE feature_name = ${featureName}
          AND created_at BETWEEN ${timeRange.start} AND ${timeRange.end}
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC
      `;

      const results = await executor.execute(query);
      
      return (results.rows as any[]).map(row => ({
        date: new Date(row.date),
        usageCount: parseInt(row.usage_count) || 0,
        uniqueUsers: parseInt(row.unique_users) || 0
      }));
    } catch (error) {
      handleDatabaseError(error, 'FeatureUsageRepository.getFeatureUsageTrends');
    }
  }

  async getUnderutilizedFeatures(
    threshold: number,
    tx?: DbOrTransaction
  ): Promise<string[]> {
    try {
      const executor = tx || db;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const query = sql`
        SELECT DISTINCT fus.feature_name
        FROM ${featureUsageSummary} fus
        WHERE fus.adoption_rate < ${threshold}
          AND fus.period_end >= ${thirtyDaysAgo}
        ORDER BY fus.adoption_rate ASC
      `;

      const results = await executor.execute(query);
      
      return (results.rows as any[]).map(row => row.feature_name);
    } catch (error) {
      handleDatabaseError(error, 'FeatureUsageRepository.getUnderutilizedFeatures');
    }
  }

  async getUserFeatureActivity(
    userId: string,
    dateRange?: DateRange,
    tx?: DbOrTransaction
  ): Promise<FeatureUsageEvent[]> {
    try {
      const executor = tx || db;
      
      let query = executor
        .select()
        .from(featureUsageEvents)
        .where(eq(featureUsageEvents.userId, userId))
        .orderBy(desc(featureUsageEvents.createdAt));

      if (dateRange) {
        query = executor
          .select()
          .from(featureUsageEvents)
          .where(
            and(
              eq(featureUsageEvents.userId, userId),
              gte(featureUsageEvents.createdAt, dateRange.start),
              lte(featureUsageEvents.createdAt, dateRange.end)
            )
          )
          .orderBy(desc(featureUsageEvents.createdAt)) as typeof query;
      }

      return await query as FeatureUsageEvent[];
    } catch (error) {
      handleDatabaseError(error, 'FeatureUsageRepository.getUserFeatureActivity');
    }
  }

  async aggregateUsageSummary(
    planId: string,
    periodStart: Date,
    periodEnd: Date,
    tx?: DbOrTransaction
  ): Promise<FeatureUsageSummary[]> {
    try {
      const executor = tx || db;

      const query = sql`
        SELECT 
          fue.feature_name,
          COUNT(DISTINCT us.user_id) as total_users,
          COUNT(DISTINCT fue.user_id) as active_users,
          COUNT(fue.id) as usage_count,
          ROUND(
            (COUNT(DISTINCT fue.user_id)::decimal / NULLIF(COUNT(DISTINCT us.user_id), 0)) * 100, 
            2
          ) as adoption_rate
        FROM ${subscriptionPlans} sp
        LEFT JOIN ${userSubscriptions} us ON us.plan_id = sp.id
        LEFT JOIN ${featureUsageEvents} fue ON fue.subscription_id = us.id 
          AND fue.created_at BETWEEN ${periodStart} AND ${periodEnd}
        WHERE sp.id = ${planId}
        GROUP BY fue.feature_name
        HAVING fue.feature_name IS NOT NULL
      `;

      const results = await executor.execute(query);
      
      const summaries: FeatureUsageSummary[] = [];
      
      for (const row of results.rows as any[]) {
        const summary = await this.createSummary({
          planId,
          featureName: row.feature_name,
          totalUsers: parseInt(row.total_users) || 0,
          activeUsers: parseInt(row.active_users) || 0,
          usageCount: parseInt(row.usage_count) || 0,
          adoptionRate: row.adoption_rate?.toString() || '0',
          periodStart,
          periodEnd
        }, executor);
        
        summaries.push(summary);
      }

      return summaries;
    } catch (error) {
      handleDatabaseError(error, 'FeatureUsageRepository.aggregateUsageSummary');
    }
  }

  async createSummary(data: InsertFeatureUsageSummary, tx?: DbOrTransaction): Promise<FeatureUsageSummary> {
    try {
      const executor = tx || db;
      const results = await executor
        .insert(featureUsageSummary)
        .values(data)
        .returning();

      return results[0] as FeatureUsageSummary;
    } catch (error) {
      handleDatabaseError(error, 'FeatureUsageRepository.createSummary');
    }
  }

  async updateSummary(id: string, data: Partial<FeatureUsageSummary>, tx?: DbOrTransaction): Promise<FeatureUsageSummary> {
    try {
      const executor = tx || db;
      const results = await executor
        .update(featureUsageSummary)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(featureUsageSummary.id, id))
        .returning();

      if (!results[0]) {
        throw new NotFoundError('feature_usage_summary', id);
      }

      return results[0] as FeatureUsageSummary;
    } catch (error) {
      handleDatabaseError(error, 'FeatureUsageRepository.updateSummary');
    }
  }
}

export const featureUsageRepository = new FeatureUsageRepository();
