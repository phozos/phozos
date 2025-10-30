import { BaseService } from '../base.service';
import { IStudentRepository, IUserRepository } from '../../repositories';
import { container, TYPES } from '../container';
import { InvalidOperationError, ValidationServiceError } from '../errors';
import { CommonValidators } from '../validation';

/**
 * CounselorAssignmentService
 * Handles counselor-student relationship management
 * Single Responsibility: Managing assignment relationships between counselors and students
 */

export interface ICounselorAssignmentService {
  getAssignedStudents(counselorId: string): Promise<any[]>;
  assignStudent(studentId: string, counselorId: string): Promise<void>;
  unassignStudent(studentId: string): Promise<void>;
  verifyCounselorAccess(counselorId: string, studentId: string): Promise<boolean>;
}

export class CounselorAssignmentService extends BaseService implements ICounselorAssignmentService {
  constructor(
    private studentRepository: IStudentRepository = container.get<IStudentRepository>(TYPES.IStudentRepository),
    private userRepository: IUserRepository = container.get<IUserRepository>(TYPES.IUserRepository)
  ) {
    super();
  }

  /**
   * Get all students assigned to a specific counselor
   * @param counselorId - The counselor's user ID
   * @returns Array of assigned students with their profiles
   */
  async getAssignedStudents(counselorId: string): Promise<any[]> {
    try {
      const validation = CommonValidators.validateUUID(counselorId, 'Counselor ID');
      if (!validation.valid) {
        throw new ValidationServiceError('Counselor Assignment', {
          counselorId: validation.error!
        });
      }

      return await this.studentRepository.findAssignedToCounselor(counselorId);
    } catch (error) {
      return this.handleError(error, 'CounselorAssignmentService.getAssignedStudents');
    }
  }

  /**
   * Assign a student to a counselor
   * @param studentId - The student's profile ID
   * @param counselorId - The counselor's user ID
   */
  async assignStudent(studentId: string, counselorId: string): Promise<void> {
    try {
      const errors: Record<string, string> = {};

      const studentIdValidation = CommonValidators.validateUUID(studentId, 'Student ID');
      if (!studentIdValidation.valid) {
        errors.studentId = studentIdValidation.error!;
      }

      const counselorIdValidation = CommonValidators.validateUUID(counselorId, 'Counselor ID');
      if (!counselorIdValidation.valid) {
        errors.counselorId = counselorIdValidation.error!;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Student Assignment', errors);
      }

      // Verify counselor is a valid team member
      const counselor = await this.userRepository.findById(counselorId);
      if (counselor.userType !== 'team_member') {
        throw new InvalidOperationError('assign student', 'User is not a valid counselor');
      }

      // Verify student exists
      await this.studentRepository.findById(studentId);

      // Perform assignment
      await this.studentRepository.assignCounselor(studentId, counselorId);
    } catch (error) {
      return this.handleError(error, 'CounselorAssignmentService.assignStudent');
    }
  }

  /**
   * Unassign a student from their counselor
   * @param studentId - The student's profile ID
   */
  async unassignStudent(studentId: string): Promise<void> {
    try {
      const validation = CommonValidators.validateUUID(studentId, 'Student ID');
      if (!validation.valid) {
        throw new ValidationServiceError('Student Unassignment', {
          studentId: validation.error!
        });
      }

      await this.studentRepository.unassign(studentId);
    } catch (error) {
      return this.handleError(error, 'CounselorAssignmentService.unassignStudent');
    }
  }

  /**
   * Verify if a counselor has access to a specific student
   * @param counselorId - The counselor's user ID
   * @param studentId - The student's profile ID
   * @returns True if counselor is assigned to the student, false otherwise
   */
  async verifyCounselorAccess(counselorId: string, studentId: string): Promise<boolean> {
    try {
      const errors: Record<string, string> = {};

      const studentIdValidation = CommonValidators.validateUUID(studentId, 'Student ID');
      if (!studentIdValidation.valid) {
        errors.studentId = studentIdValidation.error!;
      }

      const counselorIdValidation = CommonValidators.validateUUID(counselorId, 'Counselor ID');
      if (!counselorIdValidation.valid) {
        errors.counselorId = counselorIdValidation.error!;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Access Verification', errors);
      }

      return await this.studentRepository.checkAssignment(counselorId, studentId);
    } catch (error) {
      return this.handleError(error, 'CounselorAssignmentService.verifyCounselorAccess');
    }
  }
}

export const counselorAssignmentService = new CounselorAssignmentService();
