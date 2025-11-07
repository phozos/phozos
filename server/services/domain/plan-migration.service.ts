import { BaseService } from '../base.service';
import { 
  IPlanMigrationRepository,
  IPlanMigrationUserRepository,
  ISubscriptionPlanRepository,
  IUserSubscriptionRepository
} from '../../repositories';
import { INotificationService } from './notification.service';
import { container, TYPES } from '../container';
import { PlanMigration, SubscriptionPlan } from '@shared/schema';
import { InvalidOperationError } from '../errors';
import { NotFoundError } from '../../repositories/errors';

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
    private userSubscriptionRepo: IUserSubscriptionRepository = container.get<IUserSubscriptionRepository>(TYPES.IUserSubscriptionRepository),
    private notificationService: INotificationService = container.get<INotificationService>(TYPES.INotificationService)
  ) {
    super();
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
      const migUser = await this.migrationUserRepo.findByMigrationAndUser(migrationId, userId);
      const migration = await this.migrationRepo.findById(migrationId);

      if (!migUser) {
        throw new NotFoundError('Migration User', 'not found');
      }

      const subscription = await this.userSubscriptionRepo.findById(migUser.subscriptionId);
      const targetPlan = await this.subscriptionPlanRepo.findById(migration.targetPlanId);

      await this.userSubscriptionRepo.update(subscription.id, {
        planId: migration.targetPlanId,
        tierLevel: targetPlan.tierLevel,
        grandfatheredPrice: this.calculateIncentivePrice(targetPlan, migration),
        isGrandfathered: !!migration.incentiveValue
      });

      await this.migrationUserRepo.update(migUser.id, {
        status: 'migrated',
        respondedAt: new Date(),
        migratedAt: new Date(),
        incentiveApplied: !!migration.incentiveValue
      });

      await this.migrationRepo.increment(migrationId, 'migratedUsers');

      await this.notificationService.createNotification({
        userId: userId,
        type: 'system',
        title: 'Migration Successful',
        message: `You have successfully migrated to the ${targetPlan.name} plan.`,
        data: { migrationId, newPlanId: targetPlan.id }
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
