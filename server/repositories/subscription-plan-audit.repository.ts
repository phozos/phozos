import { BaseRepository } from './base.repository';
import { db } from '../db';
import { subscriptionPlanChanges, users } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { handleDatabaseError } from './errors';

export type SubscriptionPlanChange = typeof subscriptionPlanChanges.$inferSelect;
export type InsertSubscriptionPlanChange = typeof subscriptionPlanChanges.$inferInsert;

export interface ISubscriptionPlanAuditRepository {
  logChange(data: InsertSubscriptionPlanChange): Promise<SubscriptionPlanChange>;
  getChangeHistory(planId: string): Promise<SubscriptionPlanChange[]>;
  getChangesBy(userId: string): Promise<SubscriptionPlanChange[]>;
  getRecentChanges(limit?: number): Promise<SubscriptionPlanChange[]>;
}

export class SubscriptionPlanAuditRepository 
  extends BaseRepository<SubscriptionPlanChange, InsertSubscriptionPlanChange> 
  implements ISubscriptionPlanAuditRepository {
  
  constructor() {
    super(subscriptionPlanChanges, 'id');
  }

  async logChange(data: InsertSubscriptionPlanChange): Promise<SubscriptionPlanChange> {
    try {
      return await this.create(data);
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanAuditRepository.logChange');
    }
  }

  async getChangeHistory(planId: string): Promise<SubscriptionPlanChange[]> {
    try {
      return await db
        .select()
        .from(subscriptionPlanChanges)
        .where(eq(subscriptionPlanChanges.planId, planId))
        .orderBy(desc(subscriptionPlanChanges.createdAt)) as SubscriptionPlanChange[];
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanAuditRepository.getChangeHistory');
    }
  }

  async getChangesBy(userId: string): Promise<SubscriptionPlanChange[]> {
    try {
      return await db
        .select()
        .from(subscriptionPlanChanges)
        .where(eq(subscriptionPlanChanges.changedBy, userId))
        .orderBy(desc(subscriptionPlanChanges.createdAt)) as SubscriptionPlanChange[];
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanAuditRepository.getChangesBy');
    }
  }

  async getRecentChanges(limit: number = 50): Promise<SubscriptionPlanChange[]> {
    try {
      return await db
        .select()
        .from(subscriptionPlanChanges)
        .orderBy(desc(subscriptionPlanChanges.createdAt))
        .limit(limit) as SubscriptionPlanChange[];
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanAuditRepository.getRecentChanges');
    }
  }
}

export const subscriptionPlanAuditRepository = new SubscriptionPlanAuditRepository();
