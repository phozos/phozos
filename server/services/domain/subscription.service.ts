import { BaseService } from '../base.service';
import { ISubscriptionPlanRepository, IStudentRepository } from '../../repositories';
import { container, TYPES } from '../container';
import { 
  SubscriptionPlan, InsertSubscriptionPlan
} from '@shared/schema';
import { ValidationServiceError } from '../errors';
import { CommonValidators, BusinessRuleValidators } from '../validation';

export interface ISubscriptionService {
  // Subscription Plans
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getAllSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(id: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | undefined>;
  deleteSubscriptionPlan(id: string): Promise<boolean>;
  // Helper Methods (temporary - should be moved to appropriate service)
  getCounselorStudentAssignment(counselorId: string, studentId: string): Promise<boolean>;
}

export class SubscriptionService extends BaseService implements ISubscriptionService {
  constructor(
    private subscriptionPlanRepository: ISubscriptionPlanRepository = container.get<ISubscriptionPlanRepository>(TYPES.ISubscriptionPlanRepository),
    private studentRepository: IStudentRepository = container.get<IStudentRepository>(TYPES.IStudentRepository)
  ) {
    super();
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

  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
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

      return await this.subscriptionPlanRepository.create(plan);
    } catch (error) {
      return this.handleError(error, 'SubscriptionService.createSubscriptionPlan');
    }
  }

  async updateSubscriptionPlan(id: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | undefined> {
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

      return await this.subscriptionPlanRepository.update(id, updates);
    } catch (error) {
      return this.handleError(error, 'SubscriptionService.updateSubscriptionPlan');
    }
  }

  async deleteSubscriptionPlan(id: string): Promise<boolean> {
    try {
      return await this.subscriptionPlanRepository.delete(id);
    } catch (error) {
      return this.handleError(error, 'SubscriptionService.deleteSubscriptionPlan');
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
