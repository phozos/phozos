import { BaseService } from '../base.service';
import { 
  IPlanMigrationRepository,
  IPlanMigrationUserRepository,
  ISubscriptionPlanRepository,
  IUserSubscriptionRepository
} from '../../repositories';
import { INotificationService } from './notification.service';
import { container, TYPES } from '../container';
import { 
  PlanMigration, 
  SubscriptionPlan,
  planMigrations,
  planMigrationUsers,
  userSubscriptions,
  subscriptionPlans,
  notifications
} from '@shared/schema';
import { InvalidOperationError } from '../errors';
import { NotFoundError } from '../../repositories/errors';
import { db } from '../../db';
import { eq, and, sql } from 'drizzle-orm';

export interface CreateMigrationData {
  name: string;
  sourcePlanId: string;
  targetPlanId: string;
  migrationType: 'voluntary' | 'mandatory' | 'incentivized';
  startDate: Date;
  endDate?: Date;
  incentiveType?: 'discount' | 'free_months' | 'feature_upgrade';
  incentiveValue?: any;
}

export interface MigrationStats {
  totalEligible: number;
  migrated: number;
  declined: number;
  pending: number;
  conversionRate: number;
}

export interface IPlanMigrationService {
  createMigration(data: CreateMigrationData, adminId: string): Promise<PlanMigration>;
  getMigration(migrationId: string): Promise<PlanMigration>;
  getMigrationsByPlan(planId: string): Promise<PlanMigration[]>;
  getAllMigrations(filters?: { status?: string }): Promise<PlanMigration[]>;
  startMigration(migrationId: string, adminId: string): Promise<void>;
  processMigrationAcceptance(migrationId: string, userId: string): Promise<void>;
  processMigrationDecline(migrationId: string, userId: string, reason?: string): Promise<void>;
  getMigrationStats(migrationId: string): Promise<MigrationStats>;
  cancelMigration(migrationId: string, adminId: string, reason: string): Promise<void>;
  getUserMigrationOffer(userId: string): Promise<any>;
}

export class PlanMigrationService extends BaseService implements IPlanMigrationService {
  constructor(
    private migrationRepo: IPlanMigrationRepository = container.get<IPlanMigrationRepository>(TYPES.IPlanMigrationRepository),
    private migrationUserRepo: IPlanMigrationUserRepository = container.get<IPlanMigrationUserRepository>(TYPES.IPlanMigrationUserRepository),
    private subscriptionPlanRepo: ISubscriptionPlanRepository = container.get<ISubscriptionPlanRepository>(TYPES.ISubscriptionPlanRepository),
    private userSubscriptionRepo: IUserSubscriptionRepository = container.get<IUserSubscriptionRepository>(TYPES.IUserSubscriptionRepository)
  ) {
    super();
  }

  private get notificationService(): INotificationService {
    return container.get<INotificationService>(TYPES.INotificationService);
  }

  async createMigration(data: CreateMigrationData, adminId: string): Promise<PlanMigration> {
    try {
      const sourcePlan = await this.subscriptionPlanRepo.findById(data.sourcePlanId);
      const targetPlan = await this.subscriptionPlanRepo.findById(data.targetPlanId);

      if (!sourcePlan || !targetPlan) {
        throw new NotFoundError('Plan', 'source or target plan not found');
      }

      const eligibleSubscriptions = await this.userSubscriptionRepo.findAll({
        planId: data.sourcePlanId,
        status: 'active'
      });

      const migration = await this.migrationRepo.create({
        ...data,
        status: 'draft',
        totalEligibleUsers: eligibleSubscriptions.length,
        migratedUsers: 0,
        declinedUsers: 0,
        createdBy: adminId
      });

      for (const subscription of eligibleSubscriptions) {
        await this.migrationUserRepo.create({
          migrationId: migration.id,
          userId: subscription.userId,
          subscriptionId: subscription.id,
          status: 'pending'
        });
      }

      return migration;
    } catch (error) {
      return this.handleError(error, 'PlanMigrationService.createMigration');
    }
  }

  async getMigration(migrationId: string): Promise<PlanMigration> {
    try {
      return await this.migrationRepo.findById(migrationId);
    } catch (error) {
      return this.handleError(error, 'PlanMigrationService.getMigration');
    }
  }

  async getMigrationsByPlan(planId: string): Promise<PlanMigration[]> {
    try {
      return await this.migrationRepo.findByPlan(planId);
    } catch (error) {
      return this.handleError(error, 'PlanMigrationService.getMigrationsByPlan');
    }
  }

  async getAllMigrations(filters?: { status?: string }): Promise<PlanMigration[]> {
    try {
      return await this.migrationRepo.findAll(filters);
    } catch (error) {
      return this.handleError(error, 'PlanMigrationService.getAllMigrations');
    }
  }

  async startMigration(migrationId: string, adminId: string): Promise<void> {
    try {
      const migration = await this.migrationRepo.findById(migrationId);

      if (migration.status !== 'draft') {
        throw new InvalidOperationError('start migration', 'Migration is not in draft status');
      }

      await this.migrationRepo.update(migrationId, { status: 'active' });

      const migrationUsers = await this.migrationUserRepo.findByMigration(migrationId, 'pending');

      for (const migUser of migrationUsers) {
        await this.notificationService.createNotification({
          userId: migUser.userId,
          type: 'system',
          title: `Plan Migration Opportunity: ${migration.name}`,
          message: this.generateMigrationMessage(migration),
          data: {
            migrationId: migration.id,
            sourcePlanId: migration.sourcePlanId,
            targetPlanId: migration.targetPlanId,
            incentive: migration.incentiveValue
          }
        });

        await this.migrationUserRepo.update(migUser.id, { 
          notifiedAt: new Date() 
        });
      }
    } catch (error) {
      return this.handleError(error, 'PlanMigrationService.startMigration');
    }
  }

  async processMigrationAcceptance(migrationId: string, userId: string): Promise<void> {
    try {
      return await db.transaction(async (tx) => {
        // Step 1: Validate migration and lock migration row
        const migration = await tx
          .select()
          .from(planMigrations)
          .where(eq(planMigrations.id, migrationId))
          .for('update')  // Lock migration row
          .limit(1);
        
        if (migration.length === 0) {
          throw new NotFoundError('Plan Migration', migrationId);
        }
        
        const migrationData = migration[0];
        
        // Step 2: Find migration user record and lock
        const migUser = await tx
          .select()
          .from(planMigrationUsers)
          .where(and(
            eq(planMigrationUsers.migrationId, migrationId),
            eq(planMigrationUsers.userId, userId)
          ))
          .for('update')  // Lock user migration row
          .limit(1);
        
        if (migUser.length === 0 || migUser[0].status !== 'pending') {
          throw new InvalidOperationError(
            'process migration',
            'Migration not found or already processed'
          );
        }
        
        // Step 3: Get subscription and lock (using subscriptionId from migUser)
        const subscription = await tx
          .select()
          .from(userSubscriptions)
          .where(eq(userSubscriptions.id, migUser[0].subscriptionId))
          .for('update')  // Lock subscription row
          .limit(1);
        
        if (subscription.length === 0) {
          throw new NotFoundError('User Subscription', migUser[0].subscriptionId);
        }
        
        // Step 4: Get target plan details
        const targetPlan = await tx
          .select()
          .from(subscriptionPlans)
          .where(eq(subscriptionPlans.id, migrationData.targetPlanId))
          .limit(1);
        
        if (targetPlan.length === 0) {
          throw new NotFoundError('Target Plan', migrationData.targetPlanId);
        }
        
        // Step 5: Calculate incentive price
        const incentivePrice = this.calculateIncentivePrice(
          targetPlan[0], 
          migrationData as PlanMigration
        );
        
        // Step 6: Update subscription
        await tx
          .update(userSubscriptions)
          .set({
            planId: migrationData.targetPlanId,
            tierLevel: targetPlan[0].tierLevel,
            grandfatheredPrice: incentivePrice,
            isGrandfathered: !!migrationData.incentiveValue,
            updatedAt: new Date()
          })
          .where(eq(userSubscriptions.id, subscription[0].id));
        
        // Step 7: Update migration user status
        await tx
          .update(planMigrationUsers)
          .set({
            status: 'migrated',
            respondedAt: new Date(),
            migratedAt: new Date(),
            incentiveApplied: !!migrationData.incentiveValue
          })
          .where(eq(planMigrationUsers.id, migUser[0].id));
        
        // Step 8: Increment migration counter
        await tx
          .update(planMigrations)
          .set({
            migratedUsers: sql`${planMigrations.migratedUsers} + 1`,
            updatedAt: new Date()
          })
          .where(eq(planMigrations.id, migrationId));
        
        // Step 9: Create notification (within transaction)
        await tx
          .insert(notifications)
          .values({
            userId,
            type: 'system',
            title: 'Plan Migration Successful',
            message: `You've been migrated to ${targetPlan[0].name}`,
            isRead: false,
            createdAt: new Date()
          });
        
        // ✅ All steps succeed or ALL rollback
      });
    } catch (error) {
      return this.handleError(error, 'PlanMigrationService.processMigrationAcceptance');
    }
  }

  async processMigrationDecline(migrationId: string, userId: string, reason?: string): Promise<void> {
    try {
      const migUser = await this.migrationUserRepo.findByMigrationAndUser(migrationId, userId);

      if (!migUser) {
        throw new NotFoundError('Migration User', 'not found');
      }

      await this.migrationUserRepo.update(migUser.id, {
        status: 'declined',
        respondedAt: new Date(),
        notes: reason
      });

      await this.migrationRepo.increment(migrationId, 'declinedUsers');
    } catch (error) {
      return this.handleError(error, 'PlanMigrationService.processMigrationDecline');
    }
  }

  async getMigrationStats(migrationId: string): Promise<MigrationStats> {
    try {
      const migration = await this.migrationRepo.findById(migrationId);
      const pending = migration.totalEligibleUsers - migration.migratedUsers - migration.declinedUsers;

      return {
        totalEligible: migration.totalEligibleUsers,
        migrated: migration.migratedUsers,
        declined: migration.declinedUsers,
        pending,
        conversionRate: migration.totalEligibleUsers > 0 
          ? (migration.migratedUsers / migration.totalEligibleUsers) * 100 
          : 0
      };
    } catch (error) {
      return this.handleError(error, 'PlanMigrationService.getMigrationStats');
    }
  }

  async cancelMigration(migrationId: string, adminId: string, reason: string): Promise<void> {
    try {
      const migration = await this.migrationRepo.findById(migrationId);

      if (migration.status === 'completed' || migration.status === 'cancelled') {
        throw new InvalidOperationError('cancel migration', 'Migration is already completed or cancelled');
      }

      await this.migrationRepo.update(migrationId, { 
        status: 'cancelled',
        updatedAt: new Date()
      });
    } catch (error) {
      return this.handleError(error, 'PlanMigrationService.cancelMigration');
    }
  }

  async getUserMigrationOffer(userId: string): Promise<any> {
    try {
      const migrationUsers = await this.migrationUserRepo.findByUser(userId, 'pending');

      if (migrationUsers.length === 0) {
        return null;
      }

      const migUser = migrationUsers[0];
      const migration = await this.migrationRepo.findById(migUser.migrationId);

      if (migration.status !== 'active') {
        return null;
      }

      const sourcePlan = await this.subscriptionPlanRepo.findById(migration.sourcePlanId);
      const targetPlan = await this.subscriptionPlanRepo.findById(migration.targetPlanId);

      return {
        migrationId: migration.id,
        migrationUserId: migUser.id,
        name: migration.name,
        currentPlanName: sourcePlan.name,
        targetPlanName: targetPlan.name,
        migrationType: migration.migrationType,
        incentive: migration.incentiveValue ? {
          type: migration.incentiveType,
          value: migration.incentiveValue
        } : null,
        endDate: migration.endDate,
        message: this.generateMigrationMessage(migration)
      };
    } catch (error) {
      return this.handleError(error, 'PlanMigrationService.getUserMigrationOffer');
    }
  }

  private generateMigrationMessage(migration: PlanMigration): string {
    const baseMessage = `We're offering you an opportunity to migrate to an improved plan.`;
    
    if (migration.incentiveType === 'discount' && migration.incentiveValue?.percentage) {
      return `${baseMessage} As a valued customer, you'll receive a ${migration.incentiveValue.percentage}% discount.`;
    } else if (migration.incentiveType === 'free_months' && migration.incentiveValue?.months) {
      return `${baseMessage} Plus, you'll get ${migration.incentiveValue.months} months free!`;
    }
    
    return baseMessage;
  }

  private calculateIncentivePrice(targetPlan: SubscriptionPlan, migration: PlanMigration): string {
    const basePrice = Number(targetPlan.price);
    
    if (migration.incentiveType === 'discount' && migration.incentiveValue?.percentage) {
      const discountPercent = migration.incentiveValue.percentage || 0;
      return (basePrice * (1 - discountPercent / 100)).toFixed(2);
    }
    
    return basePrice.toFixed(2);
  }
}

export const planMigrationService = new PlanMigrationService();
