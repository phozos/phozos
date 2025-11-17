import { BaseRepository, DbOrTransaction } from './base.repository';
import { 
  SubscriptionPlan, InsertSubscriptionPlan, subscriptionPlans,
  UserSubscription, InsertUserSubscription, userSubscriptions,
  users,
  payments
} from '@shared/schema';
import { db } from '../db';
import { eq, and, desc, SQL, sql, inArray } from 'drizzle-orm';
import { handleDatabaseError, NotFoundError } from './errors';
import { SubscriptionWithPlan, SubscriptionWithDetails, SubscriptionWithPlanAndPayment } from '../types/repository-responses';
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
  findLatestVersions(filters?: { isActive?: boolean }): Promise<SubscriptionPlan[]>;
  findAllVersionsOfPlan(basePlanId: string): Promise<SubscriptionPlan[]>;
  findPlanVersion(basePlanId: string, version: number): Promise<SubscriptionPlan | undefined>;
  getLatestVersionNumber(basePlanId: string): Promise<number>;
  markAsNotLatest(planId: string): Promise<void>;
  getActiveVersionCount(basePlanId: string): Promise<number>;
}

export interface IUserSubscriptionRepository {
  findById(id: string, tx?: DbOrTransaction): Promise<UserSubscription>;
  findByIdOptional(id: string, tx?: DbOrTransaction): Promise<UserSubscription | undefined>;
  findByUser(userId: string, status?: string | string[]): Promise<UserSubscription | undefined>;
  findByUserWithPlan(userId: string, status?: string | string[]): Promise<SubscriptionWithPlan | undefined>;
  findByUserWithPlanAndPayment(userId: string, status?: string | string[]): Promise<SubscriptionWithPlanAndPayment | undefined>;
  findAll(filters?: UserSubscriptionFilters): Promise<UserSubscription[]>;
  findAllWithDetails(): Promise<SubscriptionWithDetails[]>;
  create(data: InsertUserSubscription, tx?: DbOrTransaction): Promise<UserSubscription>;
  update(id: string, data: Partial<UserSubscription>, tx?: DbOrTransaction): Promise<UserSubscription>;
  delete(id: string, tx?: DbOrTransaction): Promise<boolean>;
  findActiveByUserId(userId: string): Promise<UserSubscription | undefined>;
  findByOrderId(orderId: string): Promise<UserSubscription | undefined>;
  hasActiveSubscription(userId: string): Promise<boolean>;
  updateGrandfatheredPrice(subscriptionId: string, newPrice: number): Promise<UserSubscription>;
  clearGrandfathering(subscriptionId: string): Promise<UserSubscription>;
  findGrandfatheredSubscriptions(planId: string): Promise<UserSubscription[]>;
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
        // Use SELECT FOR UPDATE to lock the row and prevent race conditions
        // This ensures that concurrent version creation will be serialized
        const currentLatest = await tx
          .select()
          .from(subscriptionPlans)
          .where(
            and(
              eq(subscriptionPlans.basePlanId, basePlanId),
              eq(subscriptionPlans.isLatestVersion, true)
            )
          )
          .limit(1)
          .for('update');

        if (!currentLatest[0]) {
          throw new NotFoundError('Base Plan', basePlanId);
        }

        const nextVersion = currentLatest[0].version + 1;

        // Update the current latest version to mark it as not latest
        // This row is already locked, so no race condition here
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

  async findLatestVersions(filters?: { isActive?: boolean }): Promise<SubscriptionPlan[]> {
    try {
      const conditions: SQL[] = [eq(subscriptionPlans.isLatestVersion, true)];
      
      if (filters?.isActive !== undefined) {
        conditions.push(eq(subscriptionPlans.isActive, filters.isActive));
      }
      
      return await db
        .select()
        .from(subscriptionPlans)
        .where(and(...conditions))
        .orderBy(subscriptionPlans.tierLevel, subscriptionPlans.displayOrder) as SubscriptionPlan[];
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanRepository.findLatestVersions');
    }
  }

  async findAllVersionsOfPlan(basePlanId: string): Promise<SubscriptionPlan[]> {
    try {
      return await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.basePlanId, basePlanId))
        .orderBy(desc(subscriptionPlans.version)) as SubscriptionPlan[];
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanRepository.findAllVersionsOfPlan');
    }
  }

  async findPlanVersion(basePlanId: string, version: number): Promise<SubscriptionPlan | undefined> {
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
      handleDatabaseError(error, 'SubscriptionPlanRepository.findPlanVersion');
    }
  }

  async getLatestVersionNumber(basePlanId: string): Promise<number> {
    try {
      const result = await db
        .select({ maxVersion: sql<number>`MAX(${subscriptionPlans.version})` })
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.basePlanId, basePlanId));
      
      return result[0]?.maxVersion || 0;
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanRepository.getLatestVersionNumber');
    }
  }

  async markAsNotLatest(planId: string): Promise<void> {
    try {
      await db
        .update(subscriptionPlans)
        .set({ isLatestVersion: false, updatedAt: new Date() })
        .where(eq(subscriptionPlans.id, planId));
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanRepository.markAsNotLatest');
    }
  }

  async getActiveVersionCount(basePlanId: string): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(subscriptionPlans)
        .where(
          and(
            eq(subscriptionPlans.basePlanId, basePlanId),
            eq(subscriptionPlans.isActive, true)
          )
        );
      
      return result[0]?.count || 0;
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanRepository.getActiveVersionCount');
    }
  }
}

export class UserSubscriptionRepository extends BaseRepository<UserSubscription, InsertUserSubscription> implements IUserSubscriptionRepository {
  constructor() {
    super(userSubscriptions, 'id');
  }

  /**
   * Find subscription by user ID with optional status filter
   * @param userId - The user ID to search for
   * @param status - Optional status filter. Can be a single status string or array of statuses.
   *                 Defaults to 'active' for backward compatibility.
   * @returns User subscription or undefined if not found
   */
  async findByUser(userId: string, status: string | string[] = 'active'): Promise<UserSubscription | undefined> {
    try {
      const conditions: SQL[] = [eq(userSubscriptions.userId, userId)];
      
      if (Array.isArray(status)) {
        conditions.push(inArray(userSubscriptions.status, status));
      } else {
        conditions.push(eq(userSubscriptions.status, status));
      }
      
      const results = await db
        .select()
        .from(userSubscriptions)
        .where(and(...conditions))
        .limit(1);
      return results[0] as UserSubscription | undefined;
    } catch (error) {
      handleDatabaseError(error, 'UserSubscriptionRepository.findByUser');
    }
  }

  /**
   * Find subscription with plan details by user ID with optional status filter
   * @param userId - The user ID to search for
   * @param status - Optional status filter. Can be a single status string or array of statuses.
   *                 Defaults to 'active' for backward compatibility.
   * @returns Subscription with plan details or undefined if not found
   */
  async findByUserWithPlan(userId: string, status: string | string[] = 'active'): Promise<SubscriptionWithPlan | undefined> {
    try {
      const conditions: SQL[] = [eq(userSubscriptions.userId, userId)];
      
      if (Array.isArray(status)) {
        conditions.push(inArray(userSubscriptions.status, status));
      } else {
        conditions.push(eq(userSubscriptions.status, status));
      }
      
      const results = await db
        .select({
          subscription: userSubscriptions,
          plan: subscriptionPlans
        })
        .from(userSubscriptions)
        .leftJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
        .where(and(...conditions))
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

  /**
   * Find subscription with plan and payment details by user ID with optional status filter
   * This method joins the payments table to include the most recent payment for the subscription.
   * 
   * @param userId - The user ID to search for
   * @param status - Optional status filter. Can be a single status string or array of statuses.
   *                 Defaults to 'active' for backward compatibility.
   * @returns Subscription with plan and payment details or undefined if not found
   * 
   * Note: If no payment exists for the subscription, the payment field will be null.
   * This is expected for subscriptions created before the payment tracking system.
   */
  async findByUserWithPlanAndPayment(userId: string, status: string | string[] = 'active'): Promise<SubscriptionWithPlanAndPayment | undefined> {
    try {
      const conditions: SQL[] = [eq(userSubscriptions.userId, userId)];
      
      if (Array.isArray(status)) {
        conditions.push(inArray(userSubscriptions.status, status));
      } else {
        conditions.push(eq(userSubscriptions.status, status));
      }
      
      const results = await db
        .select({
          subscription: userSubscriptions,
          plan: subscriptionPlans,
          payment: payments
        })
        .from(userSubscriptions)
        .leftJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
        .leftJoin(payments, eq(userSubscriptions.id, payments.subscriptionId))
        .where(and(...conditions))
        .orderBy(desc(payments.paidAt))
        .limit(1);
      
      const result = results[0];
      if (!result) return undefined;
      
      return {
        subscription: result.subscription,
        plan: result.plan,
        payment: result.payment
      } as SubscriptionWithPlanAndPayment;
    } catch (error) {
      handleDatabaseError(error, 'UserSubscriptionRepository.findByUserWithPlanAndPayment');
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

  async updateGrandfatheredPrice(subscriptionId: string, newPrice: number): Promise<UserSubscription> {
    try {
      const [updated] = await db
        .update(userSubscriptions)
        .set({
          grandfatheredPrice: newPrice.toString(),
          isGrandfathered: true,
          updatedAt: new Date()
        })
        .where(eq(userSubscriptions.id, subscriptionId))
        .returning();
      
      if (!updated) {
        throw new NotFoundError('UserSubscription', subscriptionId);
      }
      
      return updated as UserSubscription;
    } catch (error) {
      handleDatabaseError(error, 'UserSubscriptionRepository.updateGrandfatheredPrice');
    }
  }

  async clearGrandfathering(subscriptionId: string): Promise<UserSubscription> {
    try {
      const [updated] = await db
        .update(userSubscriptions)
        .set({
          grandfatheredPrice: null,
          grandfatheredUntil: null,
          isGrandfathered: false,
          updatedAt: new Date()
        })
        .where(eq(userSubscriptions.id, subscriptionId))
        .returning();
      
      if (!updated) {
        throw new NotFoundError('UserSubscription', subscriptionId);
      }
      
      return updated as UserSubscription;
    } catch (error) {
      handleDatabaseError(error, 'UserSubscriptionRepository.clearGrandfathering');
    }
  }

  async findGrandfatheredSubscriptions(planId: string): Promise<UserSubscription[]> {
    try {
      return await db
        .select()
        .from(userSubscriptions)
        .where(
          and(
            eq(userSubscriptions.planId, planId),
            eq(userSubscriptions.isGrandfathered, true),
            eq(userSubscriptions.status, 'active')
          )
        ) as UserSubscription[];
    } catch (error) {
      handleDatabaseError(error, 'UserSubscriptionRepository.findGrandfatheredSubscriptions');
    }
  }
}

export const subscriptionPlanRepository = new SubscriptionPlanRepository();
export const userSubscriptionRepository = new UserSubscriptionRepository();
