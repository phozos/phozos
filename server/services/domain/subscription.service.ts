import { BaseService } from '../base.service';
import { ISubscriptionPlanRepository, IStudentRepository, ISubscriptionPlanAuditRepository, IUserSubscriptionRepository } from '../../repositories';
import { container, TYPES } from '../container';
import { 
  SubscriptionPlan, InsertSubscriptionPlan
} from '@shared/schema';
import { ValidationServiceError } from '../errors';
import { CommonValidators, BusinessRuleValidators } from '../validation';

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
  getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan, adminId: string, ipAddress?: string, userAgent?: string): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(id: string, updates: Partial<SubscriptionPlan>, adminId: string, changeReason?: string, ipAddress?: string, userAgent?: string): Promise<SubscriptionPlan | undefined>;
  deleteSubscriptionPlan(id: string, adminId: string, ipAddress?: string, userAgent?: string): Promise<boolean>;
  // Versioning Methods
  createPlanVersion(basePlanId: string, updates: Partial<SubscriptionPlan>, adminId: string, releaseNotes?: string): Promise<SubscriptionPlan>;
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
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      return await this.subscriptionPlanRepository.findActive();
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

      const errors: Record<string, string> = {};

      const nameValidation = CommonValidators.validateStringLength(plan.name, 1, 255, 'Plan name');
      if (!nameValidation.valid) {
        errors.name = nameValidation.error!;
      }

      if (plan.price !== undefined && plan.price !== null) {
        BusinessRuleValidators.validatePaymentAmount(Number(plan.price), 0);
      }

      if (plan.maxUniversities !== undefined && plan.maxUniversities !== null) {
        const maxUnivValidation = CommonValidators.validatePositiveNumber(plan.maxUniversities, 'Max universities');
        if (!maxUnivValidation.valid) {
          errors.maxUniversities = maxUnivValidation.error!;
        }
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Subscription Plan', errors);
      }

      const createdPlan = await this.subscriptionPlanRepository.create(plan);

      await this.planAuditRepository.logChange({
        planId: createdPlan.id,
        changedBy: adminId,
        changeType: 'created',
        fieldChanges: { created: { old: null, new: createdPlan } },
        ipAddress,
        userAgent
      });

      return createdPlan;
    } catch (error) {
      return this.handleError(error, 'SubscriptionService.createSubscriptionPlan');
    }
  }

  async updateSubscriptionPlan(id: string, updates: Partial<SubscriptionPlan>, adminId: string, changeReason?: string, ipAddress?: string, userAgent?: string): Promise<SubscriptionPlan | undefined> {
    try {
      const errors: Record<string, string> = {};

      if (updates.name !== undefined) {
        const nameValidation = CommonValidators.validateStringLength(updates.name, 1, 255, 'Plan name');
        if (!nameValidation.valid) {
          errors.name = nameValidation.error!;
        }
      }

      if (updates.price !== undefined && updates.price !== null) {
        BusinessRuleValidators.validatePaymentAmount(Number(updates.price), 0);
      }

      if (updates.maxUniversities !== undefined && updates.maxUniversities !== null) {
        const maxUnivValidation = CommonValidators.validatePositiveNumber(updates.maxUniversities, 'Max universities');
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

      const fieldChanges = this.calculateFieldChanges(oldPlan, updates);

      const updatedPlan = await this.subscriptionPlanRepository.update(id, updates);

      if (Object.keys(fieldChanges).length > 0) {
        await this.planAuditRepository.logChange({
          planId: id,
          changedBy: adminId,
          changeType: 'updated',
          fieldChanges,
          changeReason,
          ipAddress,
          userAgent
        });
      }

      return updatedPlan;
    } catch (error) {
      return this.handleError(error, 'SubscriptionService.updateSubscriptionPlan');
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
    releaseNotes?: string
  ): Promise<SubscriptionPlan> {
    try {
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
          type: 'new_version',
          basePlanId,
          version: newVersion.version,
          changes: updates,
          releaseNotes
        },
        changeReason: `Created version ${newVersion.version}${releaseNotes ? ': ' + releaseNotes : ''}`
      });

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
          subscriberCount,
          successorPlanId
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
          archived: true
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

      let successorPlan = null;
      if (plan.successorPlanId) {
        successorPlan = await this.subscriptionPlanRepository.findByIdOptional(plan.successorPlanId);
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
