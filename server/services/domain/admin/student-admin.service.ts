import { BaseService } from '../../base.service';
import { IStudentRepository, IStudentTimelineRepository } from '../../../repositories';
import { container, TYPES } from '../../container';
import { StudentTimeline } from '@shared/schema';
import { InvalidOperationError, ValidationServiceError } from '../../errors';
import { CommonValidators } from '../../validation';
import type { IUserSubscriptionService } from '../user-subscription.service';
import { StudentProfileId } from '@shared/types/branded-ids';

export interface IAdminStudentService {
  getAllStudents(): Promise<any[]>;
  getStudentsWithSubscriptions(): Promise<any[]>;
  getStudentTimeline(studentId: StudentProfileId): Promise<StudentTimeline[]>;
}

export class AdminStudentService extends BaseService implements IAdminStudentService {
  constructor(
    private studentRepository: IStudentRepository = container.get<IStudentRepository>(TYPES.IStudentRepository),
    private studentTimelineRepository: IStudentTimelineRepository = container.get<IStudentTimelineRepository>(TYPES.IStudentTimelineRepository)
  ) {
    super();
  }

  // Lazy getter to resolve service from container, avoiding circular dependency
  private get userSubscriptionService(): IUserSubscriptionService {
    return container.get<IUserSubscriptionService>(TYPES.IUserSubscriptionService);
  }

  async getAllStudents(): Promise<any[]> {
    try {
      return await this.studentRepository.findAllWithUserDetails();
    } catch (error) {
      return this.handleError(error, 'AdminStudentService.getAllStudents');
    }
  }

  async getStudentsWithSubscriptions(): Promise<any[]> {
    try {
      const students = await this.getAllStudents();
      const subscriptions = await this.userSubscriptionService.getAllSubscriptions();
      
      const studentsWithSubs = students.map(student => {
        const subscription = subscriptions.find((s: any) => s.userId === student.userId);
        return {
          ...student,
          subscription: subscription || null
        };
      });
      
      return studentsWithSubs;
    } catch (error) {
      return this.handleError(error, 'AdminStudentService.getStudentsWithSubscriptions');
    }
  }

  async getStudentTimeline(studentId: StudentProfileId): Promise<StudentTimeline[]> {
    try {
      const errors: Record<string, string> = {};

      const studentIdValidation = CommonValidators.validateUUID(studentId, 'Student ID');
      if (!studentIdValidation.valid) {
        errors.studentId = studentIdValidation.error!;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Student Timeline', errors);
      }

      return await this.studentTimelineRepository.findByStudentId(studentId);
    } catch (error) {
      return this.handleError(error, 'AdminStudentService.getStudentTimeline');
    }
  }
}

// Export singleton instance
export const adminStudentService = new AdminStudentService(
  container.get<IStudentRepository>(TYPES.IStudentRepository),
  container.get<IStudentTimelineRepository>(TYPES.IStudentTimelineRepository)
);
