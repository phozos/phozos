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
}

export class SubscriptionPlanRepository extends BaseRepository<SubscriptionPlan, InsertSubscriptionPlan> implements ISubscriptionPlanRepository {
  constructor() {
    super(subscriptionPlans, 'id');
  }

  async findAll(filters?: SubscriptionPlanFilters): Promise<SubscriptionPlan[]> {
    try {
      let query = db
        .select()
        .from(subscriptionPlans);
      
      if (filters?.isActive !== undefined) {
        query = query.where(eq(subscriptionPlans.isActive, filters.isActive)) as typeof query;
      }
      
      return await query.orderBy(subscriptionPlans.displayOrder, subscriptionPlans.price) as SubscriptionPlan[];
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanRepository.findAll');
    }
  }

  async findActive(): Promise<SubscriptionPlan[]> {
    try {
      return await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.isActive, true))
        .orderBy(subscriptionPlans.displayOrder, subscriptionPlans.price) as SubscriptionPlan[];
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanRepository.findActive');
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
}

export const subscriptionPlanRepository = new SubscriptionPlanRepository();
export const userSubscriptionRepository = new UserSubscriptionRepository();
