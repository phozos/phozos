import { BaseService } from '../base.service';
import { IApplicationRepository } from '../../repositories';
import { container, TYPES } from '../container';
import { Application, InsertApplication } from '@shared/schema';
import { DuplicateResourceError, ValidationServiceError } from '../errors';
import { CommonValidators, BusinessRuleValidators } from '../validation';

export interface IApplicationService {
  getApplicationById(id: string): Promise<Application>;
  getApplicationsByUser(userId: string): Promise<Application[]>;
  getApplicationsByStatus(status: string): Promise<Application[]>;
  createApplication(data: InsertApplication): Promise<Application>;
  updateApplication(id: string, data: Partial<Application>): Promise<Application>;
  updateApplicationStatus(id: string, status: string): Promise<Application>;
  deleteApplication(id: string): Promise<boolean>;
  getApplicationsByUniversity(universityId: string): Promise<Application[]>;
}

export class ApplicationService extends BaseService implements IApplicationService {
  constructor(
    private applicationRepository: IApplicationRepository = container.get<IApplicationRepository>(TYPES.IApplicationRepository)
  ) {
    super();
  }

  async getApplicationById(id: string): Promise<Application> {
    try {
      const application = await this.applicationRepository.findById(id);
      return application;
    } catch (error) {
      return this.handleError(error, 'ApplicationService.getApplicationById');
    }
  }

  async getApplicationsByUser(userId: string): Promise<Application[]> {
    try {
      return await this.applicationRepository.findByUser(userId);
    } catch (error) {
      return this.handleError(error, 'ApplicationService.getApplicationsByUser');
    }
  }

  async getApplicationsByStatus(status: string): Promise<Application[]> {
    try {
      return await this.applicationRepository.findByStatus(status);
    } catch (error) {
      return this.handleError(error, 'ApplicationService.getApplicationsByStatus');
    }
  }

  async createApplication(data: InsertApplication): Promise<Application> {
    try {
      this.validateRequired(data, ['userId', 'universityId']);

      const errors: Record<string, string> = {};

      const userIdValidation = CommonValidators.validateUUID(data.userId, 'User ID');
      if (!userIdValidation.valid) {
        errors.userId = userIdValidation.error!;
      }

      const universityIdValidation = CommonValidators.validateUUID(data.universityId, 'University ID');
      if (!universityIdValidation.valid) {
        errors.universityId = universityIdValidation.error!;
      }

      if (data.courseId) {
        const courseIdValidation = CommonValidators.validateUUID(data.courseId, 'Course ID');
        if (!courseIdValidation.valid) {
          errors.courseId = courseIdValidation.error!;
        }
      }

      if (data.deadlineDate) {
        const deadlineValidation = CommonValidators.validateFutureDate(new Date(data.deadlineDate));
        if (!deadlineValidation.valid) {
          errors.deadlineDate = deadlineValidation.error!;
        }
      }

      if (data.status && !['draft', 'submitted', 'under_review', 'accepted', 'rejected', 'waitlisted'].includes(data.status)) {
        errors.status = 'Invalid application status';
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Application', errors);
      }

      const existingApps = await this.applicationRepository.findByUser(data.userId);
      const duplicate = existingApps.find(
        app => app.universityId === data.universityId && app.courseId === data.courseId
      );

      if (duplicate) {
        throw new DuplicateResourceError('Application', 'university and course combination', `${data.universityId}-${data.courseId}`);
      }

      return await this.applicationRepository.create(data);
    } catch (error) {
      return this.handleError(error, 'ApplicationService.createApplication');
    }
  }

  async updateApplication(id: string, data: Partial<Application>): Promise<Application> {
    try {
      const errors: Record<string, string> = {};

      const idValidation = CommonValidators.validateUUID(id, 'Application ID');
      if (!idValidation.valid) {
        errors.id = idValidation.error!;
      }

      if (data.deadlineDate) {
        const deadlineValidation = CommonValidators.validateFutureDate(new Date(data.deadlineDate));
        if (!deadlineValidation.valid) {
          errors.deadlineDate = deadlineValidation.error!;
        }
      }

      if (data.status && !['draft', 'submitted', 'under_review', 'accepted', 'rejected', 'waitlisted'].includes(data.status)) {
        errors.status = 'Invalid application status';
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Application', errors);
      }

      const updated = await this.applicationRepository.update(id, data);
      return updated;
    } catch (error) {
      return this.handleError(error, 'ApplicationService.updateApplication');
    }
  }

  async updateApplicationStatus(id: string, status: string): Promise<Application> {
    try {
      const validStatuses = ['draft', 'submitted', 'under_review', 'accepted', 'rejected', 'waitlisted'];
      if (!validStatuses.includes(status)) {
        throw new ValidationServiceError('Application', {
          status: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      const application = await this.applicationRepository.findById(id);
      
      BusinessRuleValidators.validateApplicationStatus(application.status || 'draft', status);

      return await this.updateApplication(id, { status: status as any });
    } catch (error) {
      return this.handleError(error, 'ApplicationService.updateApplicationStatus');
    }
  }

  async deleteApplication(id: string): Promise<boolean> {
    try {
      return await this.applicationRepository.delete(id);
    } catch (error) {
      return this.handleError(error, 'ApplicationService.deleteApplication');
    }
  }

  async getApplicationsByUniversity(universityId: string): Promise<Application[]> {
    try {
      return await this.applicationRepository.findByUniversity(universityId);
    } catch (error) {
      return this.handleError(error, 'ApplicationService.getApplicationsByUniversity');
    }
  }
}

export const applicationService = new ApplicationService();
