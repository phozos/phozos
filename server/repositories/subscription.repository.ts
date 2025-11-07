import { BaseRepository } from './base.repository';
import { 
  SubscriptionPlan, InsertSubscriptionPlan, subscriptionPlans,
  UserSubscription, InsertUserSubscription, userSubscriptions,
  users
} from '@shared/schema';
import { db } from '../db';
import { eq, and, desc, SQL, sql } from 'drizzle-orm';
import { handleDatabaseError, NotFoundError } from './errors';
import { SubscriptionWithPlan, SubscriptionWithDetails } from '../types/repository-responses';
import { SubscriptionPlanFilters, UserSubscriptionFilters } from '../types/repository-filters';

export interface ISubscriptionPlanRepository {
  findAll(filters?: SubscriptionPlanFilters): Promise<SubscriptionPlan[]>;
  findActive(): Promise<SubscriptionPlan[]>;
  findById(id: string): Promise<SubscriptionPlan>;
  findByIdOptional(id: string): Promise<SubscriptionPlan | undefined>;
  create(data: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  update(id: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan>;
  delete(id: string): Promise<boolean>;
  findByTierLevel(tierLevel: number): Promise<SubscriptionPlan | undefined>;
  findHigherTiers(currentTierLevel: number): Promise<SubscriptionPlan[]>;
  findLatestVersion(basePlanId: string): Promise<SubscriptionPlan | undefined>;
  findAllVersions(basePlanId: string): Promise<SubscriptionPlan[]>;
  findVersion(basePlanId: string, version: number): Promise<SubscriptionPlan | undefined>;
  createNewVersion(basePlanId: string, updates: Partial<SubscriptionPlan>, adminId: string): Promise<SubscriptionPlan>;
  deprecatePlan(planId: string, successorPlanId?: string): Promise<SubscriptionPlan>;
  archivePlan(planId: string): Promise<SubscriptionPlan>;
  getSubscriberCount(planId: string): Promise<number>;
}

export interface IUserSubscriptionRepository {
  findById(id: string): Promise<UserSubscription>;
  findByIdOptional(id: string): Promise<UserSubscription | undefined>;
  findByUser(userId: string): Promise<UserSubscription | undefined>;
  findByUserWithPlan(userId: string): Promise<SubscriptionWithPlan | undefined>;
  findAll(filters?: UserSubscriptionFilters): Promise<UserSubscription[]>;
  findAllWithDetails(): Promise<SubscriptionWithDetails[]>;
  create(data: InsertUserSubscription): Promise<UserSubscription>;
  update(id: string, data: Partial<UserSubscription>): Promise<UserSubscription>;
  delete(id: string): Promise<boolean>;
  findActiveByUserId(userId: string): Promise<UserSubscription | undefined>;
  findByOrderId(orderId: string): Promise<UserSubscription | undefined>;
  hasActiveSubscription(userId: string): Promise<boolean>;
}

export class SubscriptionPlanRepository extends BaseRepository<SubscriptionPlan, InsertSubscriptionPlan> implements ISubscriptionPlanRepository {
  constructor() {
    super(subscriptionPlans, 'id');
  }

  async findAll(filters?: SubscriptionPlanFilters): Promise<SubscriptionPlan[]> {
    try {
      const conditions: SQL[] = [];
      
      // By default, only return latest versions and active plans (customer-facing behavior)
      // Admins can override with includeAllVersions: true
      if (!filters?.includeAllVersions) {
        conditions.push(eq(subscriptionPlans.isLatestVersion, true));
      }
      
      // Filter by isActive if specified
      if (filters?.isActive !== undefined) {
        conditions.push(eq(subscriptionPlans.isActive, filters.isActive));
      } else if (!filters?.includeAllVersions) {
        // Default to active plans for customer-facing queries
        conditions.push(eq(subscriptionPlans.isActive, true));
      }
      
      let query = db
        .select()
        .from(subscriptionPlans);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }
      
      return await query.orderBy(subscriptionPlans.displayOrder, subscriptionPlans.price) as SubscriptionPlan[];
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanRepository.findAll');
    }
  }

  async findActive(): Promise<SubscriptionPlan[]> {
    try {
      // For customer-facing queries, only return latest versions of active plans
      return await db
        .select()
        .from(subscriptionPlans)
        .where(
          and(
            eq(subscriptionPlans.isActive, true),
            eq(subscriptionPlans.isLatestVersion, true)
          )
        )
        .orderBy(subscriptionPlans.displayOrder, subscriptionPlans.price) as SubscriptionPlan[];
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanRepository.findActive');
    }
  }

  async findByTierLevel(tierLevel: number): Promise<SubscriptionPlan | undefined> {
    try {
      const results = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.tierLevel, tierLevel))
        .limit(1);
      return results[0] as SubscriptionPlan | undefined;
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanRepository.findByTierLevel');
    }
  }

  async findHigherTiers(currentTierLevel: number): Promise<SubscriptionPlan[]> {
    try {
      return await db
        .select()
        .from(subscriptionPlans)
        .where(sql`${subscriptionPlans.tierLevel} > ${currentTierLevel}`)
        .orderBy(subscriptionPlans.tierLevel) as SubscriptionPlan[];
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanRepository.findHigherTiers');
    }
  }

  async update(id: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    try {
      const results = await db
        .update(subscriptionPlans)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(subscriptionPlans.id, id))
        .returning();
      
      if (!results[0]) {
        throw new NotFoundError('SubscriptionPlan', id);
      }
      
      return results[0] as SubscriptionPlan;
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanRepository.update');
    }
  }

  async findLatestVersion(basePlanId: string): Promise<SubscriptionPlan | undefined> {
    try {
      const results = await db
        .select()
        .from(subscriptionPlans)
        .where(
          and(
            eq(subscriptionPlans.basePlanId, basePlanId),
            eq(subscriptionPlans.isLatestVersion, true)
          )
        )
        .limit(1);
      return results[0] as SubscriptionPlan | undefined;
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanRepository.findLatestVersion');
    }
  }

  async findAllVersions(basePlanId: string): Promise<SubscriptionPlan[]> {
    try {
      return await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.basePlanId, basePlanId))
        .orderBy(desc(subscriptionPlans.version)) as SubscriptionPlan[];
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanRepository.findAllVersions');
    }
  }

  async findVersion(basePlanId: string, version: number): Promise<SubscriptionPlan | undefined> {
    try {
      const results = await db
        .select()
        .from(subscriptionPlans)
        .where(
          and(
            eq(subscriptionPlans.basePlanId, basePlanId),
            eq(subscriptionPlans.version, version)
          )
        )
        .limit(1);
      return results[0] as SubscriptionPlan | undefined;
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanRepository.findVersion');
    }
  }

  async createNewVersion(
    basePlanId: string,
    updates: Partial<SubscriptionPlan>,
    adminId: string
  ): Promise<SubscriptionPlan> {
    try {
      return await db.transaction(async (tx) => {
        const currentLatest = await tx
          .select()
          .from(subscriptionPlans)
          .where(
            and(
              eq(subscriptionPlans.basePlanId, basePlanId),
              eq(subscriptionPlans.isLatestVersion, true)
            )
          )
          .limit(1);

        if (!currentLatest[0]) {
          throw new NotFoundError('Base Plan', basePlanId);
        }

        const nextVersion = currentLatest[0].version + 1;

        await tx
          .update(subscriptionPlans)
          .set({ isLatestVersion: false, updatedAt: new Date() })
          .where(eq(subscriptionPlans.id, currentLatest[0].id));

        const newPlanData: any = {
          ...currentLatest[0],
          ...updates,
          id: undefined,
          basePlanId,
          version: nextVersion,
          versionName: `v${nextVersion}`,
          isLatestVersion: true,
          deprecatedAt: null,
          archivedAt: null,
          successorPlanId: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        delete newPlanData.id;

        const newPlan = await tx
          .insert(subscriptionPlans)
          .values(newPlanData)
          .returning();

        return newPlan[0] as SubscriptionPlan;
      });
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanRepository.createNewVersion');
    }
  }

  async deprecatePlan(planId: string, successorPlanId?: string): Promise<SubscriptionPlan> {
    try {
      const updated = await db
        .update(subscriptionPlans)
        .set({
          deprecatedAt: new Date(),
          successorPlanId,
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(subscriptionPlans.id, planId))
        .returning();

      if (!updated[0]) {
        throw new NotFoundError('Subscription Plan', planId);
      }

      return updated[0] as SubscriptionPlan;
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanRepository.deprecatePlan');
    }
  }

  async archivePlan(planId: string): Promise<SubscriptionPlan> {
    try {
      const subscriberCount = await this.getSubscriberCount(planId);
      if (subscriberCount > 0) {
        throw new Error(
          `Cannot archive plan with ${subscriberCount} active subscribers`
        );
      }

      const updated = await db
        .update(subscriptionPlans)
        .set({
          archivedAt: new Date(),
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(subscriptionPlans.id, planId))
        .returning();

      if (!updated[0]) {
        throw new NotFoundError('Subscription Plan', planId);
      }

      return updated[0] as SubscriptionPlan;
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanRepository.archivePlan');
    }
  }

  async getSubscriberCount(planId: string): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(userSubscriptions)
        .where(
          and(
            eq(userSubscriptions.planId, planId),
            eq(userSubscriptions.status, 'active')
          )
        );

      return Number(result[0]?.count || 0);
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanRepository.getSubscriberCount');
    }
  }
}

export class UserSubscriptionRepository extends BaseRepository<UserSubscription, InsertUserSubscription> implements IUserSubscriptionRepository {
  constructor() {
    super(userSubscriptions, 'id');
  }

  async findByUser(userId: string): Promise<UserSubscription | undefined> {
    try {
      const results = await db
        .select()
        .from(userSubscriptions)
        .where(and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.status, "active")
        ))
        .limit(1);
      return results[0] as UserSubscription | undefined;
    } catch (error) {
      handleDatabaseError(error, 'UserSubscriptionRepository.findByUser');
    }
  }

  async findByUserWithPlan(userId: string): Promise<SubscriptionWithPlan | undefined> {
    try {
      const results = await db
        .select({
          subscription: userSubscriptions,
          plan: subscriptionPlans
        })
        .from(userSubscriptions)
        .leftJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
        .where(and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.status, "active")
        ))
        .limit(1);
      
      const result = results[0];
      if (!result) return undefined;
      
      return {
        subscription: result.subscription,
        plan: result.plan
      } as SubscriptionWithPlan;
    } catch (error) {
      handleDatabaseError(error, 'UserSubscriptionRepository.findByUserWithPlan');
    }
  }

  async findAll(filters?: UserSubscriptionFilters): Promise<UserSubscription[]> {
    try {
      const conditions: SQL[] = [];
      
      if (filters) {
        if (filters.userId) {
          conditions.push(eq(userSubscriptions.userId, filters.userId));
        }
        if (filters.planId) {
          conditions.push(eq(userSubscriptions.planId, filters.planId));
        }
        if (filters.status) {
          conditions.push(sql`${userSubscriptions.status} = ${filters.status}`);
        }
      }
      
      let query = db
        .select()
        .from(userSubscriptions);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }
      
      return await query.orderBy(desc(userSubscriptions.createdAt)) as UserSubscription[];
    } catch (error) {
      handleDatabaseError(error, 'UserSubscriptionRepository.findAll');
    }
  }

  async findAllWithDetails(): Promise<SubscriptionWithDetails[]> {
    try {
      return await db
        .select({
          subscription: userSubscriptions,
          user: {
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName
          },
          plan: {
            id: subscriptionPlans.id,
            name: subscriptionPlans.name,
            price: subscriptionPlans.price,
            currency: subscriptionPlans.currency
          }
        })
        .from(userSubscriptions)
        .leftJoin(users, eq(userSubscriptions.userId, users.id))
        .leftJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
        .orderBy(desc(userSubscriptions.createdAt));
    } catch (error) {
      handleDatabaseError(error, 'UserSubscriptionRepository.findAllWithDetails');
    }
  }

  async update(id: string, data: Partial<UserSubscription>): Promise<UserSubscription> {
    try {
      const results = await db
        .update(userSubscriptions)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(userSubscriptions.id, id))
        .returning();
      
      if (!results[0]) {
        throw new NotFoundError('UserSubscription', id);
      }
      
      return results[0] as UserSubscription;
    } catch (error) {
      handleDatabaseError(error, 'UserSubscriptionRepository.update');
    }
  }

  async findActiveByUserId(userId: string): Promise<UserSubscription | undefined> {
    try {
      const results = await db
        .select()
        .from(userSubscriptions)
        .where(and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.status, "active")
        ))
        .limit(1);
      return results[0] as UserSubscription | undefined;
    } catch (error) {
      handleDatabaseError(error, 'UserSubscriptionRepository.findActiveByUserId');
    }
  }

  async findByOrderId(orderId: string): Promise<UserSubscription | undefined> {
    try {
      const results = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.orderId, orderId))
        .limit(1);
      return results[0] as UserSubscription | undefined;
    } catch (error) {
      handleDatabaseError(error, 'UserSubscriptionRepository.findByOrderId');
    }
  }

  async hasActiveSubscription(userId: string): Promise<boolean> {
    try {
      const results = await db
        .select({ id: userSubscriptions.id })
        .from(userSubscriptions)
        .where(and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.status, "active")
        ))
        .limit(1);
      return results.length > 0;
    } catch (error) {
      handleDatabaseError(error, 'UserSubscriptionRepository.hasActiveSubscription');
    }
  }
}

export const subscriptionPlanRepository = new SubscriptionPlanRepository();
export const userSubscriptionRepository = new UserSubscriptionRepository();
