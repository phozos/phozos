import { BaseRepository } from './base.repository';
import { 
  PlanMigration, InsertPlanMigration, planMigrations,
  PlanMigrationUser, InsertPlanMigrationUser, planMigrationUsers
} from '@shared/schema';
import { db } from '../db';
import { eq, and, desc, SQL, sql } from 'drizzle-orm';
import { handleDatabaseError, NotFoundError } from './errors';

export interface PlanMigrationFilters {
  status?: string;
  sourcePlanId?: string;
  targetPlanId?: string;
  createdBy?: string;
}

export interface IPlanMigrationRepository {
  create(data: InsertPlanMigration): Promise<PlanMigration>;
  update(id: string, data: Partial<PlanMigration>): Promise<PlanMigration>;
  findById(id: string): Promise<PlanMigration>;
  findByIdOptional(id: string): Promise<PlanMigration | undefined>;
  findAll(filters?: PlanMigrationFilters): Promise<PlanMigration[]>;
  findByPlan(planId: string): Promise<PlanMigration[]>;
  increment(id: string, field: 'migratedUsers' | 'declinedUsers'): Promise<void>;
}

export interface IPlanMigrationUserRepository {
  create(data: InsertPlanMigrationUser): Promise<PlanMigrationUser>;
  update(id: string, data: Partial<PlanMigrationUser>): Promise<PlanMigrationUser>;
  findById(id: string): Promise<PlanMigrationUser>;
  findByIdOptional(id: string): Promise<PlanMigrationUser | undefined>;
  findAll(filters?: { migrationId?: string; userId?: string; status?: string }): Promise<PlanMigrationUser[]>;
  findByMigration(migrationId: string, status?: string): Promise<PlanMigrationUser[]>;
  findByMigrationAndUser(migrationId: string, userId: string): Promise<PlanMigrationUser | undefined>;
  findByUser(userId: string, status?: string): Promise<PlanMigrationUser[]>;
}

export class PlanMigrationRepository extends BaseRepository<PlanMigration, InsertPlanMigration> implements IPlanMigrationRepository {
  constructor() {
    super(planMigrations, 'id');
  }

  async findAll(filters?: PlanMigrationFilters): Promise<PlanMigration[]> {
    try {
      const conditions: SQL[] = [];
      
      if (filters?.status) {
        conditions.push(eq(planMigrations.status, filters.status));
      }
      
      if (filters?.sourcePlanId) {
        conditions.push(eq(planMigrations.sourcePlanId, filters.sourcePlanId));
      }
      
      if (filters?.targetPlanId) {
        conditions.push(eq(planMigrations.targetPlanId, filters.targetPlanId));
      }
      
      if (filters?.createdBy) {
        conditions.push(eq(planMigrations.createdBy, filters.createdBy));
      }

      let query = db.select().from(planMigrations);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      return await query.orderBy(desc(planMigrations.createdAt)) as PlanMigration[];
    } catch (error) {
      handleDatabaseError(error, 'PlanMigrationRepository.findAll');
    }
  }

  async findByPlan(planId: string): Promise<PlanMigration[]> {
    try {
      return await db
        .select()
        .from(planMigrations)
        .where(
          and(
            eq(planMigrations.sourcePlanId, planId)
          )
        )
        .orderBy(desc(planMigrations.createdAt)) as PlanMigration[];
    } catch (error) {
      handleDatabaseError(error, 'PlanMigrationRepository.findByPlan');
    }
  }

  async increment(id: string, field: 'migratedUsers' | 'declinedUsers'): Promise<void> {
    try {
      const fieldMap = {
        migratedUsers: planMigrations.migratedUsers,
        declinedUsers: planMigrations.declinedUsers,
      };

      await db
        .update(planMigrations)
        .set({ 
          [field]: sql`${fieldMap[field]} + 1`,
          updatedAt: new Date()
        })
        .where(eq(planMigrations.id, id));
    } catch (error) {
      handleDatabaseError(error, 'PlanMigrationRepository.increment');
    }
  }
}

export class PlanMigrationUserRepository extends BaseRepository<PlanMigrationUser, InsertPlanMigrationUser> implements IPlanMigrationUserRepository {
  constructor() {
    super(planMigrationUsers, 'id');
  }

  async findAll(filters?: { migrationId?: string; userId?: string; status?: string }): Promise<PlanMigrationUser[]> {
    try {
      const conditions: SQL[] = [];
      
      if (filters?.migrationId) {
        conditions.push(eq(planMigrationUsers.migrationId, filters.migrationId));
      }
      
      if (filters?.userId) {
        conditions.push(eq(planMigrationUsers.userId, filters.userId));
      }
      
      if (filters?.status) {
        conditions.push(eq(planMigrationUsers.status, filters.status));
      }

      let query = db.select().from(planMigrationUsers);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      return await query.orderBy(desc(planMigrationUsers.createdAt)) as PlanMigrationUser[];
    } catch (error) {
      handleDatabaseError(error, 'PlanMigrationUserRepository.findAll');
    }
  }

  async findByMigration(migrationId: string, status?: string): Promise<PlanMigrationUser[]> {
    try {
      const conditions: SQL[] = [eq(planMigrationUsers.migrationId, migrationId)];
      
      if (status) {
        conditions.push(eq(planMigrationUsers.status, status));
      }

      return await db
        .select()
        .from(planMigrationUsers)
        .where(and(...conditions))
        .orderBy(desc(planMigrationUsers.createdAt)) as PlanMigrationUser[];
    } catch (error) {
      handleDatabaseError(error, 'PlanMigrationUserRepository.findByMigration');
    }
  }

  async findByMigrationAndUser(migrationId: string, userId: string): Promise<PlanMigrationUser | undefined> {
    try {
      const result = await db
        .select()
        .from(planMigrationUsers)
        .where(
          and(
            eq(planMigrationUsers.migrationId, migrationId),
            eq(planMigrationUsers.userId, userId)
          )
        )
        .limit(1);
      
      return result[0] as PlanMigrationUser | undefined;
    } catch (error) {
      handleDatabaseError(error, 'PlanMigrationUserRepository.findByMigrationAndUser');
    }
  }

  async findByUser(userId: string, status?: string): Promise<PlanMigrationUser[]> {
    try {
      const conditions: SQL[] = [eq(planMigrationUsers.userId, userId)];
      
      if (status) {
        conditions.push(eq(planMigrationUsers.status, status));
      }

      return await db
        .select()
        .from(planMigrationUsers)
        .where(and(...conditions))
        .orderBy(desc(planMigrationUsers.createdAt)) as PlanMigrationUser[];
    } catch (error) {
      handleDatabaseError(error, 'PlanMigrationUserRepository.findByUser');
    }
  }
}

export const planMigrationRepository = new PlanMigrationRepository();
export const planMigrationUserRepository = new PlanMigrationUserRepository();
