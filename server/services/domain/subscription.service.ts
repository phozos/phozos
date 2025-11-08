import { BaseService } from '../base.service';
import { ISubscriptionPlanRepository, IStudentRepository, ISubscriptionPlanAuditRepository, IUserSubscriptionRepository } from '../../repositories';
import { container, TYPES, getService } from '../container';
import { 
  SubscriptionPlan, InsertSubscriptionPlan, subscriptionPlans
} from '@shared/schema';
import { ValidationServiceError, InvalidOperationError } from '../errors';
import { CommonValidators, BusinessRuleValidators } from '../validation';
import { IPlanNotificationService } from './plan-notification.service';
import { db } from '../../db';
import { eq } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import { InputSanitizer } from '../../utils/input-sanitizer';

export interface PlanAnalytics {
  planId: string;
  planName: string;
  version: number;
  activeSubscribers: number;
  totalRevenue: number;
  isDeprecated: boolean;
  deprecatedAt: Date | null;
  successorPlan: SubscriptionPlan | null;
}

export interface ISubscriptionService {
  // Subscription Plans
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getAllSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getAllSubscriptionPlansWithVersions(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan, adminId: string, ipAddress?: string, userAgent?: string): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(id: string, updates: Partial<SubscriptionPlan>, adminId: string, changeReason?: string, ipAddress?: string, userAgent?: string): Promise<SubscriptionPlan | undefined>;
  updatePlanPrice(planId: string, newPrice: number, adminId: string, releaseNotes?: string, notifySubscribers?: boolean, ipAddress?: string, userAgent?: string): Promise<SubscriptionPlan>;
  deleteSubscriptionPlan(id: string, adminId: string, ipAddress?: string, userAgent?: string): Promise<boolean>;
  // Versioning Methods
  createPlanVersion(basePlanId: string, updates: Partial<SubscriptionPlan>, adminId: string, releaseNotes?: string, notifySubscribers?: boolean): Promise<SubscriptionPlan>;
  getPlanVersions(basePlanId: string): Promise<SubscriptionPlan[]>;
  getPlanVersion(basePlanId: string, version: number): Promise<SubscriptionPlan | undefined>;
  deprecatePlan(planId: string, successorPlanId: string | undefined, adminId: string, reason: string): Promise<void>;
  archivePlan(planId: string, adminId: string, reason: string): Promise<void>;
  getPlanAnalytics(planId: string): Promise<PlanAnalytics>;
  // Helper Methods (temporary - should be moved to appropriate service)
  getCounselorStudentAssignment(counselorId: string, studentId: string): Promise<boolean>;
}

export class SubscriptionService extends BaseService implements ISubscriptionService {
  constructor(
    private subscriptionPlanRepository: ISubscriptionPlanRepository = container.get<ISubscriptionPlanRepository>(TYPES.ISubscriptionPlanRepository),
    private studentRepository: IStudentRepository = container.get<IStudentRepository>(TYPES.IStudentRepository),
    private planAuditRepository: ISubscriptionPlanAuditRepository = container.get<ISubscriptionPlanAuditRepository>(TYPES.ISubscriptionPlanAuditRepository),
    private userSubscriptionRepo: IUserSubscriptionRepository = container.get<IUserSubscriptionRepository>(TYPES.IUserSubscriptionRepository)
  ) {
    super();
  }

  private calculateFieldChanges(oldPlan: SubscriptionPlan, newPlan: Partial<SubscriptionPlan>): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};
    
    for (const key in newPlan) {
      if (newPlan.hasOwnProperty(key) && key !== 'updatedAt') {
        const oldValue = (oldPlan as any)[key];
        const newValue = (newPlan as any)[key];
        
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          changes[key] = { old: oldValue, new: newValue };
        }
      }
    }
    
    return changes;
  }

  // Subscription Plans
  /**
   * Get customer-facing subscription plans (latest versions only, active plans)
   * This is the primary method for displaying plans to customers
   */
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      return await this.subscriptionPlanRepository.findLatestVersions({ isActive: true });
    } catch (error) {
      return this.handleError(error, 'SubscriptionService.getSubscriptionPlans');
    }
  }

  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      return await this.subscriptionPlanRepository.findAll();
    } catch (error) {
      return this.handleError(error, 'SubscriptionService.getAllSubscriptionPlans');
    }
  }

  /**
   * Get all subscription plans including all versions (for admin dashboard)
   * Shows complete version history for each plan family
   */
  async getAllSubscriptionPlansWithVersions(): Promise<SubscriptionPlan[]> {
    try {
      return await this.subscriptionPlanRepository.findAll({ includeAllVersions: true });
    } catch (error) {
      return this.handleError(error, 'SubscriptionService.getAllSubscriptionPlansWithVersions');
    }
  }

  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined> {
    try {
      return await this.subscriptionPlanRepository.findById(id);
    } catch (error) {
      return this.handleError(error, 'SubscriptionService.getSubscriptionPlan');
    }
  }

  async createSubscriptionPlan(plan: InsertSubscriptionPlan, adminId: string, ipAddress?: string, userAgent?: string): Promise<SubscriptionPlan> {
    try {
      this.validateRequired(plan, ['name', 'price', 'features', 'maxUniversities', 'maxCountries', 'turnaroundDays']);

      // P0.5: Sanitize user inputs to prevent XSS attacks
      const sanitizedPlan: InsertSubscriptionPlan = {
        ...plan,
        name: InputSanitizer.sanitizePlainText(plan.name),
        description: InputSanitizer.sanitizePlainText(plan.description),
        features: InputSanitizer.sanitizeArray(plan.features),
        universityTier: plan.universityTier ? InputSanitizer.sanitizePlainText(plan.universityTier) as any : plan.universityTier,
        supportType: plan.supportType ? InputSanitizer.sanitizePlainText(plan.supportType) as any : plan.supportType
      };

      const errors: Record<string, string> = {};

      const nameValidation = CommonValidators.validateStringLength(sanitizedPlan.name, 1, 255, 'Plan name');
      if (!nameValidation.valid) {
        errors.name = nameValidation.error!;
      }

      if (sanitizedPlan.price !== undefined && sanitizedPlan.price !== null) {
        BusinessRuleValidators.validatePaymentAmount(Number(sanitizedPlan.price), 0);
      }

      if (sanitizedPlan.maxUniversities !== undefined && sanitizedPlan.maxUniversities !== null) {
        const maxUnivValidation = CommonValidators.validatePositiveNumber(sanitizedPlan.maxUniversities, 'Max universities');
        if (!maxUnivValidation.valid) {
          errors.maxUniversities = maxUnivValidation.error!;
        }
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Subscription Plan', errors);
      }

      // PHASE 0 HOTFIX: Two-step creation for self-referencing FK
      const finalPlan = await db.transaction(async (tx) => {
        // Step 1: Insert with NULL basePlanId
        const tempPlan = {
          ...sanitizedPlan,
          basePlanId: null as any,
          version: 1,
          versionName: 'v1',
          isLatestVersion: true,
        };
        
        const [createdPlan] = await tx
          .insert(subscriptionPlans)
          .values(tempPlan)
          .returning();
        
        // Step 2: Update basePlanId to self-reference
        const [finalPlan] = await tx
          .update(subscriptionPlans)
          .set({ basePlanId: createdPlan.id })
          .where(eq(subscriptionPlans.id, createdPlan.id))
          .returning();

        return finalPlan as SubscriptionPlan;
      });

      // Step 3: Audit log (AFTER transaction commits)
      await this.planAuditRepository.logChange({
        planId: finalPlan.id,
        changedBy: adminId,
        changeType: 'created',
        fieldChanges: { created: { old: null, new: finalPlan } },
        ipAddress,
        userAgent
      });

      return finalPlan;
    } catch (error) {
      return this.handleError(error, 'SubscriptionService.createSubscriptionPlan');
    }
  }

  /**
   * Update subscription plan (NON-PRICE updates only)
   * Price changes are blocked if plan has active subscribers - use updatePlanPrice() instead
   * Logs deprecation warning if updating a plan with active subscribers
   */
  async updateSubscriptionPlan(id: string, updates: Partial<SubscriptionPlan>, adminId: string, changeReason?: string, ipAddress?: string, userAgent?: string): Promise<SubscriptionPlan | undefined> {
    try {
      // P0.5: Sanitize user inputs to prevent XSS attacks
      const sanitizedUpdates: Partial<SubscriptionPlan> = { ...updates };
      if (updates.name !== undefined) {
        sanitizedUpdates.name = InputSanitizer.sanitizePlainText(updates.name);
      }
      if (updates.description !== undefined) {
        sanitizedUpdates.description = InputSanitizer.sanitizePlainText(updates.description);
      }
      if (updates.features !== undefined) {
        sanitizedUpdates.features = InputSanitizer.sanitizeArray(updates.features);
      }
      if (updates.universityTier !== undefined) {
        sanitizedUpdates.universityTier = InputSanitizer.sanitizePlainText(updates.universityTier) as any;
      }
      if (updates.supportType !== undefined) {
        sanitizedUpdates.supportType = InputSanitizer.sanitizePlainText(updates.supportType) as any;
      }
      
      const sanitizedChangeReason = changeReason ? InputSanitizer.sanitizePlainText(changeReason) : undefined;

      const errors: Record<string, string> = {};

      if (sanitizedUpdates.name !== undefined) {
        const nameValidation = CommonValidators.validateStringLength(sanitizedUpdates.name, 1, 255, 'Plan name');
        if (!nameValidation.valid) {
          errors.name = nameValidation.error!;
        }
      }

      if (sanitizedUpdates.price !== undefined && sanitizedUpdates.price !== null) {
        BusinessRuleValidators.validatePaymentAmount(Number(sanitizedUpdates.price), 0);
      }

      if (sanitizedUpdates.maxUniversities !== undefined && sanitizedUpdates.maxUniversities !== null) {
        const maxUnivValidation = CommonValidators.validatePositiveNumber(sanitizedUpdates.maxUniversities, 'Max universities');
        if (!maxUnivValidation.valid) {
          errors.maxUniversities = maxUnivValidation.error!;
        }
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Subscription Plan', errors);
      }

      const oldPlan = await this.subscriptionPlanRepository.findById(id);
      if (!oldPlan) {
        return undefined;
      }

      // Check if price is being changed
      if (sanitizedUpdates.price !== undefined && Number(sanitizedUpdates.price) !== Number(oldPlan.price)) {
        const subscriberCount = await this.subscriptionPlanRepository.getSubscriberCount(id);
        
        if (subscriberCount > 0) {
          throw new InvalidOperationError(
            'update plan price',
            `Cannot change price for plan with ${subscriberCount} active subscribers. Use updatePlanPrice() to create a new version instead.`
          );
        }
      }

      // Log warning if updating plan with subscribers (non-price changes)
      const subscriberCount = await this.subscriptionPlanRepository.getSubscriberCount(id);
      if (subscriberCount > 0 && !sanitizedChangeReason) {
        logger.warn('Updating plan with active subscribers without changeReason', {
          planId: id,
          planName: oldPlan.name,
          subscriberCount,
          adminId,
          updates: Object.keys(sanitizedUpdates)
        });
      }

      const fieldChanges = this.calculateFieldChanges(oldPlan, sanitizedUpdates);

      const updatedPlan = await this.subscriptionPlanRepository.update(id, sanitizedUpdates);

      if (Object.keys(fieldChanges).length > 0) {
        await this.planAuditRepository.logChange({
          planId: id,
          changedBy: adminId,
          changeType: 'updated',
          fieldChanges,
          changeReason: sanitizedChangeReason,
          ipAddress,
          userAgent
        });
      }

      return updatedPlan;
    } catch (error) {
      return this.handleError(error, 'SubscriptionService.updateSubscriptionPlan');
    }
  }

  /**
   * Dedicated method for price changes with proper versioning
   * Creates a new version of the plan with the new price
   * Existing subscribers remain on their current version (grandfathering)
   * Optionally notifies subscribers about the upcoming price change
   */
  async updatePlanPrice(
    planId: string,
    newPrice: number,
    adminId: string,
    releaseNotes?: string,
    notifySubscribers: boolean = true,
    ipAddress?: string,
    userAgent?: string
  ): Promise<SubscriptionPlan> {
    try {
      // P0.5: Sanitize release notes
      const sanitizedReleaseNotes = releaseNotes ? InputSanitizer.sanitizePlainText(releaseNotes) : undefined;
      
      // Validate price
      BusinessRuleValidators.validatePaymentAmount(newPrice, 0);

      const oldPlan = await this.subscriptionPlanRepository.findById(planId);
      if (!oldPlan) {
        throw new InvalidOperationError(
          'update plan price',
          'Plan not found'
        );
      }

      // Check if price is actually changing
      if (Number(newPrice) === Number(oldPlan.price)) {
        logger.warn('Attempted to update price to same value', {
          planId,
          currentPrice: oldPlan.price,
          newPrice,
          adminId
        });
        throw new InvalidOperationError(
          'update plan price',
          `New price (${newPrice}) must be different from current price (${oldPlan.price}). Price update cancelled.`
        );
      }

      // Use the basePlanId for versioning
      const basePlanId = oldPlan.basePlanId || oldPlan.id;

      // Create new version with price change
      const newVersion = await this.createPlanVersion(
        basePlanId,
        { price: newPrice.toString() as any },
        adminId,
        sanitizedReleaseNotes || `Price updated from ${oldPlan.price} to ${newPrice}`,
        notifySubscribers
      );

      logger.info('Plan price updated via versioning', {
        planId,
        basePlanId,
        oldVersion: oldPlan.version,
        newVersion: newVersion.version,
        oldPrice: oldPlan.price,
        newPrice,
        adminId
      });

      return newVersion;
    } catch (error) {
      return this.handleError(error, 'SubscriptionService.updatePlanPrice');
    }
  }

  async deleteSubscriptionPlan(id: string, adminId: string, ipAddress?: string, userAgent?: string): Promise<boolean> {
    try {
      const plan = await this.subscriptionPlanRepository.findById(id);
      if (plan) {
        await this.planAuditRepository.logChange({
          planId: id,
          changedBy: adminId,
          changeType: 'archived',
          fieldChanges: { archived: { old: plan, new: null } },
          ipAddress,
          userAgent
        });
      }

      return await this.subscriptionPlanRepository.delete(id);
    } catch (error) {
      return this.handleError(error, 'SubscriptionService.deleteSubscriptionPlan');
    }
  }

  // Versioning Methods
  async createPlanVersion(
    basePlanId: string,
    updates: Partial<SubscriptionPlan>,
    adminId: string,
    releaseNotes?: string,
    notifySubscribers: boolean = true
  ): Promise<SubscriptionPlan> {
    try {
      const oldPlan = await this.subscriptionPlanRepository.findLatestVersion(basePlanId);
      
      const newVersion = await this.subscriptionPlanRepository.createNewVersion(
        basePlanId,
        updates,
        adminId
      );

      await this.planAuditRepository.logChange({
        planId: newVersion.id,
        changedBy: adminId,
        changeType: 'created',
        fieldChanges: {
          type: { old: null, new: 'new_version' },
          basePlanId: { old: null, new: basePlanId },
          version: { old: oldPlan?.version || 0, new: newVersion.version },
          changes: { old: oldPlan, new: updates },
          releaseNotes: { old: null, new: releaseNotes || '' }
        },
        changeReason: `Created version ${newVersion.version}${releaseNotes ? ': ' + releaseNotes : ''}`
      });

      // Auto-grandfather existing subscribers on price increases (P0.4)
      if (oldPlan && updates.price && Number(updates.price) > Number(oldPlan.price)) {
        try {
          const grandfatheredCount = await this.grandfatherExistingSubscribers(
            oldPlan.id,
            Number(oldPlan.price),
            adminId
          );
          
          logger.info('Auto-grandfathered existing subscribers on price increase', {
            oldPlanId: oldPlan.id,
            newPlanId: newVersion.id,
            oldPrice: oldPlan.price,
            newPrice: updates.price,
            subscribersGrandfathered: grandfatheredCount,
            adminId
          });
        } catch (grandfatherError) {
          logger.error('Failed to auto-grandfather existing subscribers', {
            error: grandfatherError,
            oldPlanId: oldPlan.id,
            newPlanId: newVersion.id
          });
          // Don't fail the entire operation, but log the error
        }
      }

      // Send notifications if price changed and notification service is available
      if (notifySubscribers && oldPlan && updates.price && Number(updates.price) !== Number(oldPlan.price)) {
        try {
          const effectiveDate = new Date();
          effectiveDate.setDate(effectiveDate.getDate() + 30);

          const planNotificationService = getService<IPlanNotificationService>(TYPES.IPlanNotificationService);
          const notification = await planNotificationService.createPriceChangeNotification(
            oldPlan.id,
            Number(oldPlan.price),
            Number(updates.price),
            effectiveDate,
            adminId
          );

          await planNotificationService.sendPlanNotifications(notification.id);
        } catch (notificationError) {
          // Log but don't fail if notification service is unavailable (e.g., during tests)
          logger.warn('Failed to send price change notifications', {
            error: notificationError,
            basePlanId,
            oldPrice: oldPlan.price,
            newPrice: updates.price
          });
        }
      }

      return newVersion;
    } catch (error) {
      return this.handleError(error, 'SubscriptionService.createPlanVersion');
    }
  }

  async getPlanVersions(basePlanId: string): Promise<SubscriptionPlan[]> {
    try {
      return await this.subscriptionPlanRepository.findAllVersions(basePlanId);
    } catch (error) {
      return this.handleError(error, 'SubscriptionService.getPlanVersions');
    }
  }

  async getPlanVersion(basePlanId: string, version: number): Promise<SubscriptionPlan | undefined> {
    try {
      return await this.subscriptionPlanRepository.findVersion(basePlanId, version);
    } catch (error) {
      return this.handleError(error, 'SubscriptionService.getPlanVersion');
    }
  }

  /**
   * Auto-grandfather existing subscribers when price increases
   * This ensures existing customers retain their original price
   * P0.4: Critical fix for auto-grandfathering on price updates
   */
  private async grandfatherExistingSubscribers(
    planId: string,
    grandfatheredPrice: number,
    adminId: string
  ): Promise<number> {
    try {
      // Find all active subscriptions for this plan
      const activeSubscriptions = await this.userSubscriptionRepo.findAll({
        planId,
        status: 'active'
      });

      if (activeSubscriptions.length === 0) {
        logger.info('No active subscribers to grandfather', { planId });
        return 0;
      }

      let grandfatheredCount = 0;

      // Update each subscription with grandfathered price
      for (const subscription of activeSubscriptions) {
        // Skip if already grandfathered at a lower price
        if (subscription.isGrandfathered && subscription.grandfatheredPrice) {
          const existingGrandfatheredPrice = Number(subscription.grandfatheredPrice);
          if (existingGrandfatheredPrice <= grandfatheredPrice) {
            logger.debug('Skipping subscription already grandfathered at lower price', {
              subscriptionId: subscription.id,
              existingPrice: existingGrandfatheredPrice,
              newGrandfatheredPrice: grandfatheredPrice
            });
            continue;
          }
        }

        // Apply grandfathering
        await this.userSubscriptionRepo.updateGrandfatheredPrice(
          subscription.id,
          grandfatheredPrice
        );

        grandfatheredCount++;

        // Log to audit trail
        await this.planAuditRepository.logChange({
          planId,
          changedBy: adminId,
          changeType: 'grandfathered',
          fieldChanges: {
            subscriptionId: { old: null, new: subscription.id },
            userId: { old: null, new: subscription.userId },
            grandfatheredPrice: { old: subscription.grandfatheredPrice || null, new: grandfatheredPrice },
            isGrandfathered: { old: subscription.isGrandfathered || false, new: true }
          },
          changeReason: `Auto-grandfathered due to price increase`
        });
      }

      return grandfatheredCount;
    } catch (error) {
      logger.error('Error grandfathering existing subscribers', {
        error,
        planId,
        grandfatheredPrice,
        adminId
      });
      throw error;
    }
  }

  async deprecatePlan(
    planId: string,
    successorPlanId: string | undefined,
    adminId: string,
    reason: string
  ): Promise<void> {
    try {
      const subscriberCount = await this.subscriptionPlanRepository.getSubscriberCount(planId);
      
      if (subscriberCount === 0) {
        throw new Error(
          'Cannot deprecate plan with no subscribers. Use archive instead.'
        );
      }

      await this.subscriptionPlanRepository.deprecatePlan(planId, successorPlanId);

      await this.planAuditRepository.logChange({
        planId,
        changedBy: adminId,
        changeType: 'deprecated',
        fieldChanges: {
          subscriberCount: { old: 0, new: subscriberCount },
          successorPlanId: { old: null, new: successorPlanId || null }
        },
        changeReason: reason
      });
    } catch (error) {
      return this.handleError(error, 'SubscriptionService.deprecatePlan');
    }
  }

  async archivePlan(planId: string, adminId: string, reason: string): Promise<void> {
    try {
      await this.subscriptionPlanRepository.archivePlan(planId);

      await this.planAuditRepository.logChange({
        planId,
        changedBy: adminId,
        changeType: 'archived',
        fieldChanges: {
          archived: { old: false, new: true }
        },
        changeReason: reason
      });
    } catch (error) {
      return this.handleError(error, 'SubscriptionService.archivePlan');
    }
  }

  async getPlanAnalytics(planId: string): Promise<PlanAnalytics> {
    try {
      const plan = await this.subscriptionPlanRepository.findById(planId);
      const subscriberCount = await this.subscriptionPlanRepository.getSubscriberCount(planId);
      
      const subscriptions = await this.userSubscriptionRepo.findAll({ planId });
      const totalRevenue = subscriptions.reduce((sum, sub) => {
        return sum + Number(sub.amountPaid || 0);
      }, 0);

      let successorPlan: SubscriptionPlan | null = null;
      if (plan.successorPlanId) {
        const foundSuccessor = await this.subscriptionPlanRepository.findByIdOptional(plan.successorPlanId);
        successorPlan = foundSuccessor || null;
      }

      return {
        planId: plan.id,
        planName: plan.name,
        version: plan.version,
        activeSubscribers: subscriberCount,
        totalRevenue,
        isDeprecated: !!plan.deprecatedAt,
        deprecatedAt: plan.deprecatedAt,
        successorPlan
      };
    } catch (error) {
      return this.handleError(error, 'SubscriptionService.getPlanAnalytics');
    }
  }

  // Helper Methods (temporary - should be moved to CounselorAssignmentService)
  async getCounselorStudentAssignment(counselorId: string, studentId: string): Promise<boolean> {
    try {
      return await this.studentRepository.checkAssignment(counselorId, studentId);
    } catch (error) {
      return this.handleError(error, 'SubscriptionService.getCounselorStudentAssignment');
    }
  }
}

export const subscriptionService = new SubscriptionService();
