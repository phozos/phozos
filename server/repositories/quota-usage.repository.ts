import { BaseRepository, DbOrTransaction } from './base.repository';
import { QuotaUsage, InsertQuotaUsage, quotaUsage, userSubscriptions } from '@shared/schema';
import { db } from '../db';
import { eq, and, sql } from 'drizzle-orm';
import { handleDatabaseError, NotFoundError } from './errors';

export interface QuotaUsageReport {
  quotaType: string;
  usedCount: number;
  allocatedCount: number;
  remaining: number;
  percentage: number;
  lastUsedAt: Date | null;
}

export interface IQuotaUsageRepository {
  findById(id: string, tx?: DbOrTransaction): Promise<QuotaUsage>;
  findByIdOptional(id: string, tx?: DbOrTransaction): Promise<QuotaUsage | undefined>;
  findByUser(userId: string, quotaType?: string, tx?: DbOrTransaction): Promise<QuotaUsage[]>;
  findByUserAndType(userId: string, quotaType: string, tx?: DbOrTransaction): Promise<QuotaUsage | undefined>;
  create(data: InsertQuotaUsage, tx?: DbOrTransaction): Promise<QuotaUsage>;
  update(id: string, data: Partial<QuotaUsage>, tx?: DbOrTransaction): Promise<QuotaUsage>;
  delete(id: string, tx?: DbOrTransaction): Promise<boolean>;
  incrementUsage(userId: string, quotaType: string, amount: number, tx?: DbOrTransaction): Promise<QuotaUsage>;
  decrementUsage(userId: string, quotaType: string, amount: number, tx?: DbOrTransaction): Promise<QuotaUsage>;
  resetQuota(userId: string, quotaType: string, tx?: DbOrTransaction): Promise<QuotaUsage>;
  getUsageReport(userId: string, tx?: DbOrTransaction): Promise<QuotaUsageReport[]>;
  initializeQuota(userId: string, subscriptionId: string, quotaType: string, allocatedCount: number, tx?: DbOrTransaction): Promise<QuotaUsage>;
}

export class QuotaUsageRepository extends BaseRepository<QuotaUsage, InsertQuotaUsage> implements IQuotaUsageRepository {
  constructor() {
    super(quotaUsage, 'id');
  }

  async findByUser(userId: string, quotaType?: string, tx?: DbOrTransaction): Promise<QuotaUsage[]> {
    try {
      const executor = tx || db;
      let query = executor
        .select()
        .from(quotaUsage)
        .where(eq(quotaUsage.userId, userId));

      if (quotaType) {
        query = query.where(
          and(
            eq(quotaUsage.userId, userId),
            eq(quotaUsage.quotaType, quotaType)
          )
        ) as typeof query;
      }

      return await query as QuotaUsage[];
    } catch (error) {
      handleDatabaseError(error, 'QuotaUsageRepository.findByUser');
    }
  }

  async findByUserAndType(userId: string, quotaType: string, tx?: DbOrTransaction): Promise<QuotaUsage | undefined> {
    try {
      const executor = tx || db;
      const results = await executor
        .select()
        .from(quotaUsage)
        .where(
          and(
            eq(quotaUsage.userId, userId),
            eq(quotaUsage.quotaType, quotaType)
          )
        )
        .limit(1);

      return results[0] as QuotaUsage | undefined;
    } catch (error) {
      handleDatabaseError(error, 'QuotaUsageRepository.findByUserAndType');
    }
  }

  async incrementUsage(userId: string, quotaType: string, amount: number = 1, tx?: DbOrTransaction): Promise<QuotaUsage> {
    try {
      const executor = tx || db;
      
      const results = await executor
        .update(quotaUsage)
        .set({
          usedCount: sql`${quotaUsage.usedCount} + ${amount}`,
          lastUsedAt: new Date(),
          updatedAt: new Date()
        })
        .where(
          and(
            eq(quotaUsage.userId, userId),
            eq(quotaUsage.quotaType, quotaType)
          )
        )
        .returning();

      if (!results[0]) {
        throw new NotFoundError('quota_usage', `userId: ${userId}, quotaType: ${quotaType}`);
      }

      return results[0] as QuotaUsage;
    } catch (error) {
      handleDatabaseError(error, 'QuotaUsageRepository.incrementUsage');
    }
  }

  async decrementUsage(userId: string, quotaType: string, amount: number = 1, tx?: DbOrTransaction): Promise<QuotaUsage> {
    try {
      const executor = tx || db;
      
      const results = await executor
        .update(quotaUsage)
        .set({
          usedCount: sql`GREATEST(0, ${quotaUsage.usedCount} - ${amount})`,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(quotaUsage.userId, userId),
            eq(quotaUsage.quotaType, quotaType)
          )
        )
        .returning();

      if (!results[0]) {
        throw new NotFoundError('quota_usage', `userId: ${userId}, quotaType: ${quotaType}`);
      }

      return results[0] as QuotaUsage;
    } catch (error) {
      handleDatabaseError(error, 'QuotaUsageRepository.decrementUsage');
    }
  }

  async resetQuota(userId: string, quotaType: string, tx?: DbOrTransaction): Promise<QuotaUsage> {
    try {
      const executor = tx || db;
      
      const results = await executor
        .update(quotaUsage)
        .set({
          usedCount: 0,
          lastUsedAt: null,
          resetAt: new Date(),
          updatedAt: new Date()
        })
        .where(
          and(
            eq(quotaUsage.userId, userId),
            eq(quotaUsage.quotaType, quotaType)
          )
        )
        .returning();

      if (!results[0]) {
        throw new NotFoundError('quota_usage', `userId: ${userId}, quotaType: ${quotaType}`);
      }

      return results[0] as QuotaUsage;
    } catch (error) {
      handleDatabaseError(error, 'QuotaUsageRepository.resetQuota');
    }
  }

  async getUsageReport(userId: string, tx?: DbOrTransaction): Promise<QuotaUsageReport[]> {
    try {
      const executor = tx || db;
      const usages = await executor
        .select()
        .from(quotaUsage)
        .where(eq(quotaUsage.userId, userId));

      return usages.map(usage => ({
        quotaType: usage.quotaType,
        usedCount: usage.usedCount,
        allocatedCount: usage.allocatedCount,
        remaining: Math.max(0, usage.allocatedCount - usage.usedCount),
        percentage: usage.allocatedCount > 0 
          ? Math.round((usage.usedCount / usage.allocatedCount) * 100)
          : 0,
        lastUsedAt: usage.lastUsedAt
      }));
    } catch (error) {
      handleDatabaseError(error, 'QuotaUsageRepository.getUsageReport');
    }
  }

  async initializeQuota(
    userId: string, 
    subscriptionId: string, 
    quotaType: string, 
    allocatedCount: number,
    tx?: DbOrTransaction
  ): Promise<QuotaUsage> {
    try {
      const executor = tx || db;
      
      const existing = await this.findByUserAndType(userId, quotaType, executor);
      
      if (existing) {
        return await executor
          .update(quotaUsage)
          .set({
            subscriptionId,
            allocatedCount,
            updatedAt: new Date()
          })
          .where(eq(quotaUsage.id, existing.id))
          .returning()
          .then(results => results[0] as QuotaUsage);
      }

      return await this.create({
        userId,
        subscriptionId,
        quotaType,
        usedCount: 0,
        allocatedCount,
        lastUsedAt: null,
        resetAt: null
      }, executor);
    } catch (error) {
      handleDatabaseError(error, 'QuotaUsageRepository.initializeQuota');
    }
  }
}

export const quotaUsageRepository = new QuotaUsageRepository();
