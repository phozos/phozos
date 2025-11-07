import { BaseService } from '../base.service';
import { 
  IUserSubscriptionRepository,
  ISubscriptionPlanRepository
} from '../../repositories';
import { container, TYPES } from '../container';
import { db } from '../../db';
import { 
  userSubscriptions, 
  subscriptionPlans, 
  subscriptionEvents,
  failedPayments 
} from '@shared/schema';
import { eq, and, sql, gte, lt, desc, count } from 'drizzle-orm';

export interface SubscriptionMetrics {
  activeSubscriptionsByPlan: Array<{
    planId: string;
    planName: string;
    count: number;
    percentage: number;
  }>;
  totalActive: number;
  totalExpired: number;
  totalCancelled: number;
  totalPending: number;
}

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  totalRevenue: number;
  averageTransactionValue: number;
  revenueByPlan: Array<{
    planId: string;
    planName: string;
    revenue: number;
    subscriptionCount: number;
  }>;
}

export interface ChurnMetrics {
  churnRate: number;
  cancellationsThisMonth: number;
  cancellationsLastMonth: number;
  retentionRate: number;
  totalActiveStart: number;
  totalActiveEnd: number;
}

export interface PaymentMetrics {
  paymentSuccessRate: number;
  totalPaymentAttempts: number;
  failedPaymentCount: number;
  failedPaymentAmount: number;
  gracePeriodRecoveryRate: number;
  recentFailures: number;
}

export interface SubscriptionGrowthData {
  monthlyGrowth: Array<{
    month: string;
    year: number;
    activeSubscriptions: number;
    newSubscriptions: number;
    cancelledSubscriptions: number;
    netGrowth: number;
    revenue: number;
  }>;
}

export interface UpgradeDowngradeMetrics {
  upgradesThisMonth: number;
  downgradesThisMonth: number;
  upgradesLastMonth: number;
  downgradesLastMonth: number;
  upgradeRate: number;
  downgradeRate: number;
  netUpgrades: number;
  upgradesByPlan: Array<{
    fromPlan: string;
    toPlan: string;
    count: number;
  }>;
}

export interface PlanVersionBreakdown {
  basePlanId: string;
  planName: string;
  version: number;
  isLatestVersion: boolean;
  isDeprecated: boolean;
  subscribers: number;
  mrr: number;
  avgPrice: number;
  status: string;
}

export interface GrandfatheringImpact {
  totalGrandfatheredUsers: number;
  totalGrandfatheredMRR: number;
  totalCurrentPriceMRR: number;
  revenueGap: number;
  percentageImpact: number;
}

export interface RecentPlanChange {
  id: string;
  planId: string;
  planName: string;
  changeType: string;
  fieldChanges: Record<string, { old: any; new: any }>;
  changeReason: string | null;
  changedBy: string;
  changedByName: string | null;
  createdAt: Date;
}

export interface ComprehensiveAnalytics {
  overview: {
    totalMRR: number;
    totalActiveSubscribers: number;
    grandfatheredCount: number;
    arpu: number;
    activeMigrationsCount: number;
  };
  planVersions: PlanVersionBreakdown[];
  grandfatheringImpact: GrandfatheringImpact;
  recentChanges: RecentPlanChange[];
}

export interface ISubscriptionAnalyticsService {
  getSubscriptionMetrics(): Promise<SubscriptionMetrics>;
  getRevenueMetrics(): Promise<RevenueMetrics>;
  getChurnMetrics(): Promise<ChurnMetrics>;
  getPaymentMetrics(): Promise<PaymentMetrics>;
  getSubscriptionGrowth(): Promise<SubscriptionGrowthData>;
  getUpgradeDowngradeMetrics(): Promise<UpgradeDowngradeMetrics>;
  getComprehensiveAnalytics(): Promise<ComprehensiveAnalytics>;
}

export class SubscriptionAnalyticsService extends BaseService implements ISubscriptionAnalyticsService {
  constructor(
    private userSubscriptionRepo: IUserSubscriptionRepository = container.get<IUserSubscriptionRepository>(TYPES.IUserSubscriptionRepository),
    private subscriptionPlanRepo: ISubscriptionPlanRepository = container.get<ISubscriptionPlanRepository>(TYPES.ISubscriptionPlanRepository)
  ) {
    super();
  }

  async getSubscriptionMetrics(): Promise<SubscriptionMetrics> {
    try {
      const activeByPlan = await db
        .select({
          planId: userSubscriptions.planId,
          planName: subscriptionPlans.name,
          count: sql<number>`cast(count(*) as int)`
        })
        .from(userSubscriptions)
        .leftJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
        .where(eq(userSubscriptions.status, 'active'))
        .groupBy(userSubscriptions.planId, subscriptionPlans.name);

      const statusCounts = await db
        .select({
          status: userSubscriptions.status,
          count: sql<number>`cast(count(*) as int)`
        })
        .from(userSubscriptions)
        .groupBy(userSubscriptions.status);

      const totalActive = statusCounts.find(s => s.status === 'active')?.count || 0;
      const totalExpired = statusCounts.find(s => s.status === 'expired')?.count || 0;
      const totalCancelled = statusCounts.find(s => s.status === 'cancelled')?.count || 0;
      const totalPending = statusCounts.find(s => s.status === 'pending')?.count || 0;

      const activeSubscriptionsByPlan = activeByPlan.map(item => ({
        planId: item.planId,
        planName: item.planName || 'Unknown',
        count: item.count,
        percentage: totalActive > 0 ? Math.round((item.count / totalActive) * 100 * 100) / 100 : 0
      }));

      return {
        activeSubscriptionsByPlan,
        totalActive,
        totalExpired,
        totalCancelled,
        totalPending
      };
    } catch (error) {
      return this.handleError(error, 'SubscriptionAnalyticsService.getSubscriptionMetrics');
    }
  }

  async getRevenueMetrics(): Promise<RevenueMetrics> {
    try {
      const activeSubscriptionsWithPlans = await db
        .select({
          planId: userSubscriptions.planId,
          planName: subscriptionPlans.name,
          planPrice: subscriptionPlans.price,
          amountPaid: userSubscriptions.amountPaid,
          currency: userSubscriptions.currency,
          isLifetime: userSubscriptions.isLifetime
        })
        .from(userSubscriptions)
        .leftJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
        .where(eq(userSubscriptions.status, 'active'));

      const allPaidSubscriptions = await db
        .select({
          amountPaid: userSubscriptions.amountPaid
        })
        .from(userSubscriptions)
        .where(sql`${userSubscriptions.amountPaid} IS NOT NULL`);

      let totalRevenue = 0;
      let mrr = 0;
      const revenueByPlanMap = new Map<string, { planId: string; planName: string; revenue: number; count: number }>();

      for (const sub of activeSubscriptionsWithPlans) {
        const amount = parseFloat(sub.amountPaid || '0');
        const planPrice = parseFloat(sub.planPrice || '0');
        
        if (sub.isLifetime) {
          if (sub.planId) {
            const existing = revenueByPlanMap.get(sub.planId) || {
              planId: sub.planId,
              planName: sub.planName || 'Unknown',
              revenue: 0,
              count: 0
            };
            existing.revenue += amount;
            existing.count += 1;
            revenueByPlanMap.set(sub.planId, existing);
          }
        } else {
          mrr += planPrice;
          if (sub.planId) {
            const existing = revenueByPlanMap.get(sub.planId) || {
              planId: sub.planId,
              planName: sub.planName || 'Unknown',
              revenue: 0,
              count: 0
            };
            existing.revenue += planPrice;
            existing.count += 1;
            revenueByPlanMap.set(sub.planId, existing);
          }
        }
      }

      for (const sub of allPaidSubscriptions) {
        totalRevenue += parseFloat(sub.amountPaid || '0');
      }

      const arr = mrr * 12;
      const averageTransactionValue = allPaidSubscriptions.length > 0 
        ? totalRevenue / allPaidSubscriptions.length 
        : 0;

      const revenueByPlan = Array.from(revenueByPlanMap.values()).map(item => ({
        planId: item.planId,
        planName: item.planName,
        revenue: Math.round(item.revenue * 100) / 100,
        subscriptionCount: item.count
      }));

      return {
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(arr * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageTransactionValue: Math.round(averageTransactionValue * 100) / 100,
        revenueByPlan
      };
    } catch (error) {
      return this.handleError(error, 'SubscriptionAnalyticsService.getRevenueMetrics');
    }
  }

  async getChurnMetrics(): Promise<ChurnMetrics> {
    try {
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      const cancellationsThisMonth = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(userSubscriptions)
        .where(
          and(
            eq(userSubscriptions.status, 'cancelled'),
            gte(userSubscriptions.updatedAt, currentMonthStart)
          )
        );

      const cancellationsLastMonth = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(userSubscriptions)
        .where(
          and(
            eq(userSubscriptions.status, 'cancelled'),
            gte(userSubscriptions.updatedAt, lastMonthStart),
            lt(userSubscriptions.updatedAt, currentMonthStart)
          )
        );

      const activeAtMonthStart = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(userSubscriptions)
        .where(
          and(
            eq(userSubscriptions.status, 'active'),
            lt(userSubscriptions.createdAt, currentMonthStart)
          )
        );

      const activeNow = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(userSubscriptions)
        .where(eq(userSubscriptions.status, 'active'));

      const totalActiveStart = activeAtMonthStart[0]?.count || 0;
      const totalActiveEnd = activeNow[0]?.count || 0;
      const cancelledThisMonth = cancellationsThisMonth[0]?.count || 0;
      const cancelledLastMonth = cancellationsLastMonth[0]?.count || 0;

      const churnRate = totalActiveStart > 0 
        ? Math.round((cancelledThisMonth / totalActiveStart) * 100 * 100) / 100 
        : 0;

      const retentionRate = totalActiveStart > 0
        ? Math.round(((totalActiveStart - cancelledThisMonth) / totalActiveStart) * 100 * 100) / 100
        : 0;

      return {
        churnRate,
        cancellationsThisMonth: cancelledThisMonth,
        cancellationsLastMonth: cancelledLastMonth,
        retentionRate,
        totalActiveStart,
        totalActiveEnd
      };
    } catch (error) {
      return this.handleError(error, 'SubscriptionAnalyticsService.getChurnMetrics');
    }
  }

  async getPaymentMetrics(): Promise<PaymentMetrics> {
    try {
      const totalSubscriptions = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(userSubscriptions)
        .where(sql`${userSubscriptions.amountPaid} IS NOT NULL OR ${userSubscriptions.status} = 'active'`);

      const failedPaymentsResult = await db
        .select({ 
          count: sql<number>`cast(count(*) as int)`,
          totalAmount: sql<number>`cast(coalesce(sum(cast(${failedPayments.amount} as decimal)), 0) as decimal)`
        })
        .from(failedPayments);

      const recentFailures = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(failedPayments)
        .where(gte(failedPayments.failedAt, sql`NOW() - INTERVAL '30 days'`));

      const recoveredPayments = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(userSubscriptions)
        .where(
          and(
            eq(userSubscriptions.status, 'active'),
            sql`${userSubscriptions.paidAt} > ${userSubscriptions.startedAt}`
          )
        );

      const totalAttempts = totalSubscriptions[0]?.count || 0;
      const failedCount = failedPaymentsResult[0]?.count || 0;
      const failedAmount = parseFloat(failedPaymentsResult[0]?.totalAmount?.toString() || '0');
      const recovered = recoveredPayments[0]?.count || 0;
      const recentFails = recentFailures[0]?.count || 0;

      const totalPaymentAttempts = totalAttempts + failedCount;
      const paymentSuccessRate = totalPaymentAttempts > 0
        ? Math.round((totalAttempts / totalPaymentAttempts) * 100 * 100) / 100
        : 0;

      const gracePeriodRecoveryRate = failedCount > 0
        ? Math.round((recovered / failedCount) * 100 * 100) / 100
        : 0;

      return {
        paymentSuccessRate,
        totalPaymentAttempts,
        failedPaymentCount: failedCount,
        failedPaymentAmount: Math.round(failedAmount * 100) / 100,
        gracePeriodRecoveryRate,
        recentFailures: recentFails
      };
    } catch (error) {
      return this.handleError(error, 'SubscriptionAnalyticsService.getPaymentMetrics');
    }
  }

  async getSubscriptionGrowth(): Promise<SubscriptionGrowthData> {
    try {
      const monthlyData: Array<{
        month: string;
        year: number;
        activeSubscriptions: number;
        newSubscriptions: number;
        cancelledSubscriptions: number;
        netGrowth: number;
        revenue: number;
      }> = [];

      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const monthName = monthDate.toLocaleString('default', { month: 'short' });
        const year = monthDate.getFullYear();

        const newSubs = await db
          .select({ count: sql<number>`cast(count(*) as int)` })
          .from(userSubscriptions)
          .where(
            and(
              gte(userSubscriptions.createdAt, monthDate),
              lt(userSubscriptions.createdAt, nextMonthDate)
            )
          );

        const cancelledSubs = await db
          .select({ count: sql<number>`cast(count(*) as int)` })
          .from(userSubscriptions)
          .where(
            and(
              eq(userSubscriptions.status, 'cancelled'),
              gte(userSubscriptions.updatedAt, monthDate),
              lt(userSubscriptions.updatedAt, nextMonthDate)
            )
          );

        const activeSubs = await db
          .select({ count: sql<number>`cast(count(*) as int)` })
          .from(userSubscriptions)
          .where(
            and(
              eq(userSubscriptions.status, 'active'),
              lt(userSubscriptions.createdAt, nextMonthDate)
            )
          );

        const monthRevenue = await db
          .select({ 
            total: sql<number>`cast(coalesce(sum(cast(${userSubscriptions.amountPaid} as decimal)), 0) as decimal)`
          })
          .from(userSubscriptions)
          .where(
            and(
              gte(userSubscriptions.paidAt, monthDate),
              lt(userSubscriptions.paidAt, nextMonthDate)
            )
          );

        const newCount = newSubs[0]?.count || 0;
        const cancelledCount = cancelledSubs[0]?.count || 0;
        const activeCount = activeSubs[0]?.count || 0;
        const revenue = parseFloat(monthRevenue[0]?.total?.toString() || '0');

        monthlyData.push({
          month: monthName,
          year,
          activeSubscriptions: activeCount,
          newSubscriptions: newCount,
          cancelledSubscriptions: cancelledCount,
          netGrowth: newCount - cancelledCount,
          revenue: Math.round(revenue * 100) / 100
        });
      }

      return {
        monthlyGrowth: monthlyData
      };
    } catch (error) {
      return this.handleError(error, 'SubscriptionAnalyticsService.getSubscriptionGrowth');
    }
  }

  async getUpgradeDowngradeMetrics(): Promise<UpgradeDowngradeMetrics> {
    try {
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const upgradeEventsThisMonth = await db
        .select({ 
          count: sql<number>`cast(count(*) as int)`,
          oldPlan: subscriptionEvents.oldStatus,
          newPlan: subscriptionEvents.newStatus
        })
        .from(subscriptionEvents)
        .where(
          and(
            eq(subscriptionEvents.eventType, 'upgrade'),
            gte(subscriptionEvents.createdAt, currentMonthStart)
          )
        )
        .groupBy(subscriptionEvents.oldStatus, subscriptionEvents.newStatus);

      const downgradeEventsThisMonth = await db
        .select({ 
          count: sql<number>`cast(count(*) as int)`,
          oldPlan: subscriptionEvents.oldStatus,
          newPlan: subscriptionEvents.newStatus
        })
        .from(subscriptionEvents)
        .where(
          and(
            eq(subscriptionEvents.eventType, 'downgrade'),
            gte(subscriptionEvents.createdAt, currentMonthStart)
          )
        )
        .groupBy(subscriptionEvents.oldStatus, subscriptionEvents.newStatus);

      const upgradeEventsLastMonth = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(subscriptionEvents)
        .where(
          and(
            eq(subscriptionEvents.eventType, 'upgrade'),
            gte(subscriptionEvents.createdAt, lastMonthStart),
            lt(subscriptionEvents.createdAt, currentMonthStart)
          )
        );

      const downgradeEventsLastMonth = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(subscriptionEvents)
        .where(
          and(
            eq(subscriptionEvents.eventType, 'downgrade'),
            gte(subscriptionEvents.createdAt, lastMonthStart),
            lt(subscriptionEvents.createdAt, currentMonthStart)
          )
        );

      const totalActiveSubscriptions = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(userSubscriptions)
        .where(eq(userSubscriptions.status, 'active'));

      const upgradesThisMonth = upgradeEventsThisMonth.reduce((sum, item) => sum + item.count, 0);
      const downgradesThisMonth = downgradeEventsThisMonth.reduce((sum, item) => sum + item.count, 0);
      const upgradesLastMonth = upgradeEventsLastMonth[0]?.count || 0;
      const downgradesLastMonth = downgradeEventsLastMonth[0]?.count || 0;
      const totalActive = totalActiveSubscriptions[0]?.count || 1;

      const upgradeRate = Math.round((upgradesThisMonth / totalActive) * 100 * 100) / 100;
      const downgradeRate = Math.round((downgradesThisMonth / totalActive) * 100 * 100) / 100;
      const netUpgrades = upgradesThisMonth - downgradesThisMonth;

      const upgradesByPlan = upgradeEventsThisMonth.map(item => ({
        fromPlan: item.oldPlan || 'Unknown',
        toPlan: item.newPlan || 'Unknown',
        count: item.count
      }));

      return {
        upgradesThisMonth,
        downgradesThisMonth,
        upgradesLastMonth,
        downgradesLastMonth,
        upgradeRate,
        downgradeRate,
        netUpgrades,
        upgradesByPlan
      };
    } catch (error) {
      return this.handleError(error, 'SubscriptionAnalyticsService.getUpgradeDowngradeMetrics');
    }
  }

  async getComprehensiveAnalytics(): Promise<ComprehensiveAnalytics> {
    try {
      const { subscriptionPlanChanges, planMigrations, users } = await import('@shared/schema');

      const activeSubscriptions = await db
        .select({
          subscriptionId: userSubscriptions.id,
          planId: userSubscriptions.planId,
          isGrandfathered: userSubscriptions.isGrandfathered,
          grandfatheredPrice: userSubscriptions.grandfatheredPrice,
          amountPaid: userSubscriptions.amountPaid,
          planPrice: subscriptionPlans.price,
          planName: subscriptionPlans.name,
          basePlanId: subscriptionPlans.basePlanId,
          version: subscriptionPlans.version,
          isLatestVersion: subscriptionPlans.isLatestVersion,
          isActive: subscriptionPlans.isActive,
          deprecatedAt: subscriptionPlans.deprecatedAt,
          isLifetime: userSubscriptions.isLifetime
        })
        .from(userSubscriptions)
        .leftJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
        .where(eq(userSubscriptions.status, 'active'));

      let totalMRR = 0;
      let totalGrandfatheredUsers = 0;
      let totalGrandfatheredMRR = 0;
      let totalCurrentPriceMRR = 0;
      const planVersionMap = new Map<string, {
        basePlanId: string;
        planName: string;
        version: number;
        isLatestVersion: boolean;
        isDeprecated: boolean;
        subscribers: number;
        mrr: number;
        totalPrice: number;
        status: string;
      }>();

      for (const sub of activeSubscriptions) {
        if (!sub.planId || sub.isLifetime) continue;

        const planPrice = parseFloat(sub.planPrice || '0');
        const grandfatheredPrice = sub.grandfatheredPrice ? parseFloat(sub.grandfatheredPrice) : null;
        const actualPrice = sub.isGrandfathered && grandfatheredPrice ? grandfatheredPrice : planPrice;

        totalMRR += actualPrice;

        if (sub.isGrandfathered) {
          totalGrandfatheredUsers++;
          totalGrandfatheredMRR += actualPrice;
          totalCurrentPriceMRR += planPrice;
        }

        const key = `${sub.basePlanId || sub.planId}-v${sub.version || 1}`;
        const existing = planVersionMap.get(key) || {
          basePlanId: sub.basePlanId || sub.planId,
          planName: sub.planName || 'Unknown Plan',
          version: sub.version || 1,
          isLatestVersion: sub.isLatestVersion || false,
          isDeprecated: !!sub.deprecatedAt,
          subscribers: 0,
          mrr: 0,
          totalPrice: 0,
          status: sub.isActive ? 'active' : 'inactive'
        };

        existing.subscribers += 1;
        existing.mrr += actualPrice;
        existing.totalPrice += actualPrice;
        planVersionMap.set(key, existing);
      }

      const totalActiveSubscribers = activeSubscriptions.filter(s => !s.isLifetime).length;
      const arpu = totalActiveSubscribers > 0 ? totalMRR / totalActiveSubscribers : 0;
      const revenueGap = totalCurrentPriceMRR - totalGrandfatheredMRR;
      const percentageImpact = totalCurrentPriceMRR > 0 
        ? (revenueGap / totalCurrentPriceMRR) * 100 
        : 0;

      const planVersions: PlanVersionBreakdown[] = Array.from(planVersionMap.values()).map(item => ({
        basePlanId: item.basePlanId,
        planName: item.planName,
        version: item.version,
        isLatestVersion: item.isLatestVersion,
        isDeprecated: item.isDeprecated,
        subscribers: item.subscribers,
        mrr: Math.round(item.mrr * 100) / 100,
        avgPrice: item.subscribers > 0 ? Math.round((item.totalPrice / item.subscribers) * 100) / 100 : 0,
        status: item.isDeprecated ? 'deprecated' : item.status
      })).sort((a, b) => {
        if (a.planName !== b.planName) return a.planName.localeCompare(b.planName);
        return b.version - a.version;
      });

      const activeMigrations = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(planMigrations)
        .where(eq(planMigrations.status, 'active'));

      const recentChangesData = await db
        .select({
          id: subscriptionPlanChanges.id,
          planId: subscriptionPlanChanges.planId,
          planName: subscriptionPlans.name,
          changeType: subscriptionPlanChanges.changeType,
          fieldChanges: subscriptionPlanChanges.fieldChanges,
          changeReason: subscriptionPlanChanges.changeReason,
          changedBy: subscriptionPlanChanges.changedBy,
          changedByFirstName: users.firstName,
          changedByLastName: users.lastName,
          createdAt: subscriptionPlanChanges.createdAt
        })
        .from(subscriptionPlanChanges)
        .leftJoin(subscriptionPlans, eq(subscriptionPlanChanges.planId, subscriptionPlans.id))
        .leftJoin(users, eq(subscriptionPlanChanges.changedBy, users.id))
        .orderBy(desc(subscriptionPlanChanges.createdAt))
        .limit(20);

      const recentChanges: RecentPlanChange[] = recentChangesData.map(change => ({
        id: change.id,
        planId: change.planId,
        planName: change.planName || 'Unknown Plan',
        changeType: change.changeType,
        fieldChanges: change.fieldChanges as Record<string, { old: any; new: any }>,
        changeReason: change.changeReason,
        changedBy: change.changedBy,
        changedByName: change.changedByFirstName && change.changedByLastName 
          ? `${change.changedByFirstName} ${change.changedByLastName}`
          : null,
        createdAt: change.createdAt
      }));

      return {
        overview: {
          totalMRR: Math.round(totalMRR * 100) / 100,
          totalActiveSubscribers,
          grandfatheredCount: totalGrandfatheredUsers,
          arpu: Math.round(arpu * 100) / 100,
          activeMigrationsCount: activeMigrations[0]?.count || 0
        },
        planVersions,
        grandfatheringImpact: {
          totalGrandfatheredUsers,
          totalGrandfatheredMRR: Math.round(totalGrandfatheredMRR * 100) / 100,
          totalCurrentPriceMRR: Math.round(totalCurrentPriceMRR * 100) / 100,
          revenueGap: Math.round(revenueGap * 100) / 100,
          percentageImpact: Math.round(percentageImpact * 100) / 100
        },
        recentChanges
      };
    } catch (error) {
      return this.handleError(error, 'SubscriptionAnalyticsService.getComprehensiveAnalytics');
    }
  }
}

export const subscriptionAnalyticsService = new SubscriptionAnalyticsService();
