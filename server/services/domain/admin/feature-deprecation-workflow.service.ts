/**
 * Feature Deprecation Workflow Service (Phase 4.3)
 * 
 * Implements the 4-phase feature deprecation workflow:
 * 1. Announcement (T-90 days): Notify users, add UI banners
 * 2. Grace Period (T-60 to T-30 days): Send reminders, offer migration incentives
 * 3. Soft Disable (T-30 to T-0 days): Show warnings, track usage
 * 4. Hard Removal (T-0): Disable feature, archive data, complete process
 * 
 * Ensures compliance with minimum notice periods and user consent requirements.
 */

import { BaseService } from '../../base.service';
import { container, TYPES } from '../../container';
import { db } from '../../../db';
import { featureDeprecationSchedules } from '@shared/schema';
import { 
  FeatureDeprecationSchedule,
  DeprecationPhase,
  DeprecationStatus,
  CreateDeprecationScheduleRequest,
  UpdateDeprecationScheduleRequest,
  DeprecationImpact,
  DeprecationTimeline,
  DeprecationConfig
} from '@shared/types/feature-deprecation';
import { 
  IUserSubscriptionRepository,
  ISubscriptionPlanRepository,
  IFeatureUsageRepository,
  DateRange
} from '../../../repositories';
import { IFeatureChangeNotificationService, FeatureChangeDetails } from '../feature-change-notification.service';
import { logger } from '../../../utils/logger';
import { eq, and, inArray } from 'drizzle-orm';
import { UserSubscription } from '@shared/schema';

/**
 * Default deprecation configuration
 */
const DEFAULT_CONFIG: DeprecationConfig = {
  minNoticePeriod: 90, // 90 days minimum notice
  minGracePeriod: 30, // 30 days grace period
  minSoftDisablePeriod: 30, // 30 days soft disable
  sendAnnouncement: true,
  sendReminders: true,
  reminderIntervals: [60, 30, 14, 7], // Days before each phase
  requireUserConsent: true,
  offerProRatedRefund: true,
  retainDataYears: 2
};

export interface IFeatureDeprecationWorkflowService {
  createDeprecationSchedule(
    request: CreateDeprecationScheduleRequest,
    adminId: string
  ): Promise<FeatureDeprecationSchedule>;
  
  updateDeprecationSchedule(
    request: UpdateDeprecationScheduleRequest,
    adminId: string
  ): Promise<FeatureDeprecationSchedule>;
  
  cancelDeprecationSchedule(
    scheduleId: string,
    reason: string,
    adminId: string
  ): Promise<void>;
  
  getDeprecationSchedule(scheduleId: string): Promise<FeatureDeprecationSchedule | null>;
  
  getAllDeprecationSchedules(status?: DeprecationStatus): Promise<FeatureDeprecationSchedule[]>;
  
  getDeprecationImpact(scheduleId: string): Promise<DeprecationImpact>;
  
  getDeprecationTimeline(scheduleId: string): Promise<DeprecationTimeline[]>;
  
  executePhaseActions(scheduleId: string, phase: DeprecationPhase): Promise<void>;
  
  processScheduledPhases(): Promise<void>;
}

export class FeatureDeprecationWorkflowService extends BaseService implements IFeatureDeprecationWorkflowService {
  private get userSubscriptionRepo(): IUserSubscriptionRepository {
    return container.get<IUserSubscriptionRepository>(TYPES.IUserSubscriptionRepository);
  }

  private get subscriptionPlanRepo(): ISubscriptionPlanRepository {
    return container.get<ISubscriptionPlanRepository>(TYPES.ISubscriptionPlanRepository);
  }

  private get featureUsageRepo(): IFeatureUsageRepository {
    return container.get<IFeatureUsageRepository>(TYPES.IFeatureUsageRepository);
  }

  private get notificationService(): IFeatureChangeNotificationService {
    return container.get<IFeatureChangeNotificationService>(TYPES.IFeatureChangeNotificationService);
  }

  /**
   * Create a new deprecation schedule
   */
  async createDeprecationSchedule(
    request: CreateDeprecationScheduleRequest,
    adminId: string
  ): Promise<FeatureDeprecationSchedule> {
    try {
      logger.info('Creating feature deprecation schedule', { request, adminId });

      // Validate timeline
      this.validateTimeline(request);

      // Calculate affected users
      const affectedUserCount = await this.calculateAffectedUsers(
        request.featureName,
        request.planIds
      );

      // Create schedule
      const [schedule] = await db.insert(featureDeprecationSchedules).values({
        featureName: request.featureName,
        planIds: request.planIds,
        currentPhase: 'announcement',
        status: 'scheduled',
        announcementDate: request.announcementDate,
        gracePeriodStartDate: request.gracePeriodStartDate,
        softDisableDate: request.softDisableDate,
        hardRemovalDate: request.hardRemovalDate,
        reason: request.reason,
        replacementFeature: request.replacementFeature,
        migrationGuideUrl: request.migrationGuideUrl,
        affectedUserCount,
        createdBy: adminId
      }).returning();

      // If announcement date is now or past, execute announcement phase
      if (request.announcementDate <= new Date()) {
        await this.executePhaseActions(schedule.id, 'announcement');
      }

      logger.info('Created deprecation schedule', { scheduleId: schedule.id });
      
      return {
        ...schedule,
        replacementFeature: schedule.replacementFeature || undefined,
        completedAt: schedule.completedAt || undefined,
        cancelledAt: schedule.cancelledAt || undefined,
        cancellationReason: schedule.cancellationReason || undefined
      } as FeatureDeprecationSchedule;
    } catch (error) {
      logger.error('Failed to create deprecation schedule', { request, adminId, error });
      throw error;
    }
  }

  /**
   * Update an existing deprecation schedule
   */
  async updateDeprecationSchedule(
    request: UpdateDeprecationScheduleRequest,
    adminId: string
  ): Promise<FeatureDeprecationSchedule> {
    try {
      logger.info('Updating deprecation schedule', { request, adminId });

      const existing = await this.getDeprecationSchedule(request.scheduleId);
      if (!existing) {
        throw new Error(`Schedule not found: ${request.scheduleId}`);
      }

      // Prevent updates to completed or cancelled schedules
      if (existing.status === 'completed' || existing.status === 'cancelled') {
        throw new Error(`Cannot update ${existing.status} schedule`);
      }

      // Update schedule
      const [updated] = await db
        .update(featureDeprecationSchedules)
        .set({
          ...request.updates,
          updatedAt: new Date()
        })
        .where(eq(featureDeprecationSchedules.id, request.scheduleId))
        .returning();

      logger.info('Updated deprecation schedule', { 
        scheduleId: request.scheduleId, 
        reason: request.reason 
      });

      return {
        ...updated,
        replacementFeature: updated.replacementFeature || undefined,
        completedAt: updated.completedAt || undefined,
        cancelledAt: updated.cancelledAt || undefined,
        cancellationReason: updated.cancellationReason || undefined
      } as FeatureDeprecationSchedule;
    } catch (error) {
      logger.error('Failed to update deprecation schedule', { request, adminId, error });
      throw error;
    }
  }

  /**
   * Cancel a deprecation schedule
   */
  async cancelDeprecationSchedule(
    scheduleId: string,
    reason: string,
    adminId: string
  ): Promise<void> {
    try {
      logger.info('Cancelling deprecation schedule', { scheduleId, reason, adminId });

      await db
        .update(featureDeprecationSchedules)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: reason,
          updatedAt: new Date()
        })
        .where(eq(featureDeprecationSchedules.id, scheduleId));

      logger.info('Cancelled deprecation schedule', { scheduleId });
    } catch (error) {
      logger.error('Failed to cancel deprecation schedule', { scheduleId, reason, error });
      throw error;
    }
  }

  /**
   * Get a specific deprecation schedule
   */
  async getDeprecationSchedule(scheduleId: string): Promise<FeatureDeprecationSchedule | null> {
    try {
      const [schedule] = await db
        .select()
        .from(featureDeprecationSchedules)
        .where(eq(featureDeprecationSchedules.id, scheduleId))
        .limit(1);

      if (!schedule) return null;
      
      return {
        ...schedule,
        replacementFeature: schedule.replacementFeature || undefined,
        completedAt: schedule.completedAt || undefined,
        cancelledAt: schedule.cancelledAt || undefined,
        cancellationReason: schedule.cancellationReason || undefined
      } as FeatureDeprecationSchedule;
    } catch (error) {
      logger.error('Failed to get deprecation schedule', { scheduleId, error });
      return null;
    }
  }

  /**
   * Get all deprecation schedules, optionally filtered by status
   */
  async getAllDeprecationSchedules(status?: DeprecationStatus): Promise<FeatureDeprecationSchedule[]> {
    try {
      let query = db.select().from(featureDeprecationSchedules);

      if (status) {
        query = query.where(eq(featureDeprecationSchedules.status, status)) as any;
      }

      const schedules = await query;
      return schedules.map(s => ({
        ...s,
        replacementFeature: s.replacementFeature || undefined,
        completedAt: s.completedAt || undefined,
        cancelledAt: s.cancelledAt || undefined,
        cancellationReason: s.cancellationReason || undefined
      })) as FeatureDeprecationSchedule[];
    } catch (error) {
      logger.error('Failed to get deprecation schedules', { status, error });
      return [];
    }
  }

  /**
   * Get deprecation impact analysis
   */
  async getDeprecationImpact(scheduleId: string): Promise<DeprecationImpact> {
    try {
      const schedule = await this.getDeprecationSchedule(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule not found: ${scheduleId}`);
      }

      // Get affected users by plan
      const byPlan: DeprecationImpact['byPlan'] = [];
      let totalAffectedUsers = 0;
      let activeUsers = 0;

      for (const planId of schedule.planIds) {
        const plan = await this.subscriptionPlanRepo.findById(planId);
        if (!plan) continue;

        const subscribers = await this.userSubscriptionRepo.findAll({ planId });
        const activeSubscribers = subscribers.filter((s: UserSubscription) => s.status === 'active' && !s.isGrandfathered);
        
        totalAffectedUsers += activeSubscribers.length;
        activeUsers += activeSubscribers.length;

        byPlan.push({
          planId: plan.id,
          planName: plan.name,
          affectedUsers: activeSubscribers.length
        });
      }

      // Get usage data
      const now = new Date();
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const dateRange: DateRange = { start: lastMonth, end: now };
      const usageData = await this.featureUsageRepo.getFeatureUsageTrends(
        schedule.featureName,
        dateRange
      );

      const usageFrequency = usageData.length > 0
        ? usageData.reduce((sum, d) => sum + d.usageCount, 0) / usageData.length
        : 0;

      const lastUsedDate = usageData.length > 0
        ? new Date(Math.max(...usageData.map(d => d.date.getTime())))
        : null;

      // Calculate migration readiness
      const usersAcknowledged = schedule.usersAcknowledged || 0;
      const usersMigrated = schedule.usersMigrated || 0;
      const usersAtRisk = totalAffectedUsers - usersAcknowledged;

      // Estimate financial impact
      const estimatedChurnRisk = this.estimateChurnRisk(totalAffectedUsers, schedule.currentPhase);
      const estimatedCostSavings = this.estimateCostSavings(schedule.featureName, totalAffectedUsers);

      return {
        featureName: schedule.featureName,
        totalAffectedUsers,
        activeUsers,
        usageFrequency,
        lastUsedDate,
        byPlan,
        usersAcknowledged,
        usersMigrated,
        usersAtRisk,
        estimatedChurnRisk,
        estimatedCostSavings
      };
    } catch (error) {
      logger.error('Failed to get deprecation impact', { scheduleId, error });
      throw error;
    }
  }

  /**
   * Get deprecation timeline with phase details
   */
  async getDeprecationTimeline(scheduleId: string): Promise<DeprecationTimeline[]> {
    try {
      const schedule = await this.getDeprecationSchedule(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule not found: ${scheduleId}`);
      }

      const now = new Date();
      const timeline: DeprecationTimeline[] = [];

      // Phase 1: Announcement
      timeline.push({
        phase: 'announcement',
        startDate: schedule.announcementDate,
        endDate: schedule.gracePeriodStartDate,
        status: this.getPhaseStatus(now, schedule.announcementDate, schedule.gracePeriodStartDate, schedule.currentPhase, 'announcement'),
        actions: [
          'Send announcement notifications to all affected users',
          'Add deprecation banner in UI',
          'Update plan documentation',
          'Create migration guide'
        ]
      });

      // Phase 2: Grace Period
      timeline.push({
        phase: 'grace_period',
        startDate: schedule.gracePeriodStartDate,
        endDate: schedule.softDisableDate,
        status: this.getPhaseStatus(now, schedule.gracePeriodStartDate, schedule.softDisableDate, schedule.currentPhase, 'grace_period'),
        actions: [
          'Send reminder notifications',
          'Offer migration incentives',
          'Track user migration progress',
          'Provide migration assistance'
        ]
      });

      // Phase 3: Soft Disable
      timeline.push({
        phase: 'soft_disable',
        startDate: schedule.softDisableDate,
        endDate: schedule.hardRemovalDate,
        status: this.getPhaseStatus(now, schedule.softDisableDate, schedule.hardRemovalDate, schedule.currentPhase, 'soft_disable'),
        actions: [
          'Show warning on feature access',
          'Track remaining usage',
          'Suggest alternative features',
          'Prevent new subscriptions from accessing feature'
        ]
      });

      // Phase 4: Hard Removal
      timeline.push({
        phase: 'hard_removal',
        startDate: schedule.hardRemovalDate,
        endDate: schedule.hardRemovalDate,
        status: now >= schedule.hardRemovalDate ? 'completed' : 'pending',
        actions: [
          'Disable feature access for all users',
          'Update plan definitions',
          'Archive feature usage data',
          'Update documentation',
          'Send completion notification'
        ]
      });

      return timeline;
    } catch (error) {
      logger.error('Failed to get deprecation timeline', { scheduleId, error });
      throw error;
    }
  }

  /**
   * Execute actions for a specific phase
   */
  async executePhaseActions(scheduleId: string, phase: DeprecationPhase): Promise<void> {
    try {
      logger.info('Executing deprecation phase actions', { scheduleId, phase });

      const schedule = await this.getDeprecationSchedule(scheduleId);
      if (!schedule) {
        throw new Error(`Schedule not found: ${scheduleId}`);
      }

      // Update current phase
      await db
        .update(featureDeprecationSchedules)
        .set({ currentPhase: phase, status: 'in_progress', updatedAt: new Date() })
        .where(eq(featureDeprecationSchedules.id, scheduleId));

      // Execute phase-specific actions
      switch (phase) {
        case 'announcement':
          await this.executeAnnouncementPhase(schedule);
          break;
        case 'grace_period':
          await this.executeGracePeriodPhase(schedule);
          break;
        case 'soft_disable':
          await this.executeSoftDisablePhase(schedule);
          break;
        case 'hard_removal':
          await this.executeHardRemovalPhase(schedule);
          break;
      }

      logger.info('Completed deprecation phase actions', { scheduleId, phase });
    } catch (error) {
      logger.error('Failed to execute phase actions', { scheduleId, phase, error });
      throw error;
    }
  }

  /**
   * Process all scheduled phases (run via cron job)
   */
  async processScheduledPhases(): Promise<void> {
    try {
      logger.info('Processing scheduled deprecation phases');

      const schedules = await this.getAllDeprecationSchedules('scheduled');
      const now = new Date();

      for (const schedule of schedules) {
        try {
          // Check which phase should be active
          if (now >= schedule.hardRemovalDate && schedule.currentPhase !== 'hard_removal') {
            await this.executePhaseActions(schedule.id, 'hard_removal');
          } else if (now >= schedule.softDisableDate && schedule.currentPhase !== 'soft_disable') {
            await this.executePhaseActions(schedule.id, 'soft_disable');
          } else if (now >= schedule.gracePeriodStartDate && schedule.currentPhase !== 'grace_period') {
            await this.executePhaseActions(schedule.id, 'grace_period');
          } else if (now >= schedule.announcementDate && schedule.currentPhase === 'announcement') {
            await this.executePhaseActions(schedule.id, 'announcement');
          }
        } catch (error) {
          logger.error('Failed to process schedule', { scheduleId: schedule.id, error });
        }
      }

      logger.info('Completed processing scheduled phases');
    } catch (error) {
      logger.error('Failed to process scheduled phases', { error });
    }
  }

  /**
   * Phase 1: Announcement Phase
   */
  private async executeAnnouncementPhase(schedule: FeatureDeprecationSchedule): Promise<void> {
    logger.info('Executing announcement phase', { scheduleId: schedule.id });

    // Get affected users
    const affectedUserIds = await this.getAffectedUserIds(schedule.planIds);

    // Send announcement notifications
    const featureDetails: FeatureChangeDetails = {
      planId: schedule.planIds[0],
      planName: 'Multiple Plans',
      featureName: schedule.featureName,
      featureDisplayName: this.getFeatureDisplayName(schedule.featureName),
      effectiveDate: schedule.hardRemovalDate,
      migrationGuideUrl: schedule.migrationGuideUrl,

      oldValue: true,
      newValue: false
    };

    await this.notificationService.sendFeatureDeprecationNotification(
      affectedUserIds,
      featureDetails
    );

    // Update notification count
    await db
      .update(featureDeprecationSchedules)
      .set({
        notificationsSent: affectedUserIds.length,
        updatedAt: new Date()
      })
      .where(eq(featureDeprecationSchedules.id, schedule.id));
  }

  /**
   * Phase 2: Grace Period Phase
   */
  private async executeGracePeriodPhase(schedule: FeatureDeprecationSchedule): Promise<void> {
    logger.info('Executing grace period phase', { scheduleId: schedule.id });

    // Send reminder notifications
    const affectedUserIds = await this.getAffectedUserIds(schedule.planIds);
    
    const featureDetails: FeatureChangeDetails = {
      planId: schedule.planIds[0],
      planName: 'Multiple Plans',
      featureName: schedule.featureName,
      featureDisplayName: this.getFeatureDisplayName(schedule.featureName),
      effectiveDate: schedule.hardRemovalDate,
      migrationGuideUrl: schedule.migrationGuideUrl,

      oldValue: true,
      newValue: false
    };

    await this.notificationService.sendFeatureDeprecationNotification(
      affectedUserIds,
      featureDetails
    );
  }

  /**
   * Phase 3: Soft Disable Phase
   */
  private async executeSoftDisablePhase(schedule: FeatureDeprecationSchedule): Promise<void> {
    logger.info('Executing soft disable phase', { scheduleId: schedule.id });

    // Mark feature as deprecated in plans but still accessible
    // This would typically set a flag that shows warnings in the UI
    
    for (const planId of schedule.planIds) {
      const plan = await this.subscriptionPlanRepo.findById(planId);
      if (plan) {
        // Add deprecation metadata to plan
        await this.subscriptionPlanRepo.update(planId, {
          feature_version_metadata: {
            ...(plan.feature_version_metadata as any || {}),
            deprecatedFeatures: [
              ...((plan.feature_version_metadata as any)?.deprecatedFeatures || []),
              schedule.featureName
            ]
          }
        });
      }
    }
  }

  /**
   * Phase 4: Hard Removal Phase
   */
  private async executeHardRemovalPhase(schedule: FeatureDeprecationSchedule): Promise<void> {
    logger.info('Executing hard removal phase', { scheduleId: schedule.id });

    // Remove feature from all plans
    for (const planId of schedule.planIds) {
      const plan = await this.subscriptionPlanRepo.findById(planId);
      if (plan) {
        // Remove feature from plan
        const updates: any = {};
        
        // If boolean feature
        if (schedule.featureName.startsWith('include')) {
          updates[schedule.featureName] = false;
        }
        
        // If array feature
        if (plan.features && Array.isArray(plan.features)) {
          updates.features = plan.features.filter(f => f !== schedule.featureName);
        }

        await this.subscriptionPlanRepo.update(planId, updates);
      }
    }

    // Mark schedule as completed
    await db
      .update(featureDeprecationSchedules)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(featureDeprecationSchedules.id, schedule.id));

    // Send completion notification
    const affectedUserIds = await this.getAffectedUserIds(schedule.planIds);
    
    const featureDetails: FeatureChangeDetails = {
      planId: schedule.planIds[0],
      planName: 'Multiple Plans',
      featureName: schedule.featureName,
      featureDisplayName: this.getFeatureDisplayName(schedule.featureName),
      effectiveDate: new Date(),
      oldValue: true,
      newValue: false
    };

    await this.notificationService.sendFeatureDeprecationNotification(
      affectedUserIds,
      featureDetails
    );
  }

  /**
   * Validate deprecation timeline
   */
  private validateTimeline(request: CreateDeprecationScheduleRequest): void {
    const config = DEFAULT_CONFIG;
    
    // Check minimum notice period
    const noticePeriod = this.getDaysDifference(new Date(), request.announcementDate);
    if (noticePeriod < 0) {
      throw new Error(`Announcement date must be in the future`);
    }

    // Check phase ordering
    if (request.gracePeriodStartDate <= request.announcementDate) {
      throw new Error('Grace period must start after announcement');
    }
    
    if (request.softDisableDate <= request.gracePeriodStartDate) {
      throw new Error('Soft disable must start after grace period');
    }
    
    if (request.hardRemovalDate <= request.softDisableDate) {
      throw new Error('Hard removal must occur after soft disable');
    }

    // Check minimum grace period
    const gracePeriod = this.getDaysDifference(request.gracePeriodStartDate, request.softDisableDate);
    if (gracePeriod < config.minGracePeriod) {
      throw new Error(`Grace period must be at least ${config.minGracePeriod} days`);
    }

    // Check minimum soft disable period
    const softDisablePeriod = this.getDaysDifference(request.softDisableDate, request.hardRemovalDate);
    if (softDisablePeriod < config.minSoftDisablePeriod) {
      throw new Error(`Soft disable period must be at least ${config.minSoftDisablePeriod} days`);
    }

    // Check total notice period
    const totalNoticePeriod = this.getDaysDifference(request.announcementDate, request.hardRemovalDate);
    if (totalNoticePeriod < config.minNoticePeriod) {
      throw new Error(`Total notice period must be at least ${config.minNoticePeriod} days`);
    }
  }

  /**
   * Calculate affected users for a feature
   */
  private async calculateAffectedUsers(featureName: string, planIds: string[]): Promise<number> {
    let total = 0;
    
    for (const planId of planIds) {
      const subscribers = await this.userSubscriptionRepo.findAll({ planId });
      const active = subscribers.filter((s: UserSubscription) => s.status === 'active' && !s.isGrandfathered);
      total += active.length;
    }

    return total;
  }

  /**
   * Get all affected user IDs
   */
  private async getAffectedUserIds(planIds: string[]): Promise<string[]> {
    const userIds = new Set<string>();
    
    for (const planId of planIds) {
      const subscribers = await this.userSubscriptionRepo.findAll({ planId });
      subscribers
        .filter((s: UserSubscription) => s.status === 'active' && !s.isGrandfathered)
        .forEach((s: UserSubscription) => userIds.add(s.userId));
    }

    return Array.from(userIds);
  }

  /**
   * Get feature display name
   */
  private getFeatureDisplayName(featureName: string): string {
    return featureName
      .replace(/^include/, '')
      .replace(/^max/, 'Max ')
      .replace(/([A-Z])/g, ' $1')
      .trim();
  }

  /**
   * Estimate churn risk based on phase
   */
  private estimateChurnRisk(totalUsers: number, currentPhase: DeprecationPhase): number {
    const riskMultipliers: Record<DeprecationPhase, number> = {
      announcement: 0.02,
      grace_period: 0.03,
      soft_disable: 0.05,
      hard_removal: 0.08
    };

    return totalUsers * riskMultipliers[currentPhase];
  }

  /**
   * Estimate cost savings from deprecating a feature
   */
  private estimateCostSavings(featureName: string, totalUsers: number): number {
    // Rough estimate: $5 per user per month in maintenance costs
    return totalUsers * 5;
  }

  /**
   * Get phase status
   */
  private getPhaseStatus(
    now: Date,
    startDate: Date,
    endDate: Date,
    currentPhase: DeprecationPhase,
    phase: DeprecationPhase
  ): 'pending' | 'active' | 'completed' {
    if (now < startDate) return 'pending';
    if (now >= endDate) return 'completed';
    if (currentPhase === phase) return 'active';
    return 'pending';
  }

  /**
   * Get difference in days between two dates
   */
  private getDaysDifference(date1: Date, date2: Date): number {
    const diffTime = date2.getTime() - date1.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
