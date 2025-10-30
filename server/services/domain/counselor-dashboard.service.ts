import { BaseService } from '../base.service';
import { IStudentRepository, IUserRepository, IDocumentRepository } from '../../repositories';
import { container, TYPES } from '../container';
import { User, Document } from '@shared/schema';
import { AuthorizationError, ValidationServiceError } from '../errors';
import { CommonValidators } from '../validation';
import { IAdminAnalyticsService } from './admin';
import { ICounselorAssignmentService } from './counselor-assignment.service';

/**
 * CounselorDashboardService
 * Handles counselor workspace, dashboard, and data presentation
 * Single Responsibility: Counselor workspace features and data formatting
 */

export interface ICounselorDashboardService {
  getCounselorStats(): Promise<any>;
  getStudentDocuments(studentId: string): Promise<Document[]>;
  getStudentDocumentsWithAccess(counselorId: string, studentId: string): Promise<Document[]>;
  getCounselors(): Promise<User[]>;
  getAllStaff(): Promise<User[]>;
  formatAssignedStudents(students: any[]): any[];
  getAssignedStudentsFormatted(counselorId: string): Promise<any[]>;
  getApplicationStage(status: string): string;
  formatLastActivity(createdAt: Date): string;
}

export class CounselorDashboardService extends BaseService implements ICounselorDashboardService {
  constructor(
    private studentRepository: IStudentRepository = container.get<IStudentRepository>(TYPES.IStudentRepository),
    private userRepository: IUserRepository = container.get<IUserRepository>(TYPES.IUserRepository),
    private documentRepository: IDocumentRepository = container.get<IDocumentRepository>(TYPES.IDocumentRepository)
  ) {
    super();
  }

  private get adminAnalyticsService(): IAdminAnalyticsService {
    return container.get<IAdminAnalyticsService>(TYPES.IAdminAnalyticsService);
  }

  private get counselorAssignmentService(): ICounselorAssignmentService {
    return container.get<ICounselorAssignmentService>(TYPES.ICounselorAssignmentService);
  }

  /**
   * Get counselor dashboard statistics
   * @returns Dashboard stats including total students, active applications, success rate, etc.
   */
  async getCounselorStats(): Promise<any> {
    try {
      const users = await this.userRepository.findAll();
      const students = users.filter(u => u.userType === 'customer');
      
      const applications = await this.adminAnalyticsService.getAllApplications();
      
      const totalStudents = students.length;
      const activeApplications = applications.filter(
        app => app.status === 'submitted' || app.status === 'under_review'
      ).length;
      const successRate = applications.length > 0 
        ? Math.round((applications.filter(app => app.status === 'accepted').length / applications.length) * 100) 
        : 0;
      const pendingActions = applications.filter(app => app.status === 'under_review').length;
      
      const currentMonth = new Date().getMonth();
      const newStudentsThisMonth = students.filter(
        s => s.createdAt && new Date(s.createdAt).getMonth() === currentMonth
      ).length;
      
      return {
        totalStudents,
        activeApplications,
        successRate,
        pendingActions,
        newStudentsThisMonth,
        upcomingDeadlines: []
      };
    } catch (error) {
      return this.handleError(error, 'CounselorDashboardService.getCounselorStats');
    }
  }

  /**
   * Get documents for a specific student
   * @param studentId - The student's profile ID
   * @returns Array of student documents
   */
  async getStudentDocuments(studentId: string): Promise<Document[]> {
    try {
      const validation = CommonValidators.validateUUID(studentId, 'Student ID');
      if (!validation.valid) {
        throw new ValidationServiceError('Student Documents', {
          studentId: validation.error!
        });
      }

      const profile = await this.studentRepository.findById(studentId);
      return await this.documentRepository.findByUser(profile.userId);
    } catch (error) {
      return this.handleError(error, 'CounselorDashboardService.getStudentDocuments');
    }
  }

  /**
   * Get student documents with access verification
   * @param counselorId - The counselor's user ID
   * @param studentId - The student's profile ID
   * @returns Array of student documents if access is granted
   */
  async getStudentDocumentsWithAccess(counselorId: string, studentId: string): Promise<Document[]> {
    try {
      const hasAccess = await this.counselorAssignmentService.verifyCounselorAccess(counselorId, studentId);
      
      if (!hasAccess) {
        throw new AuthorizationError('You do not have access to this student\'s documents');
      }
      
      return await this.getStudentDocuments(studentId);
    } catch (error) {
      return this.handleError(error, 'CounselorDashboardService.getStudentDocumentsWithAccess');
    }
  }

  /**
   * Get all counselors (team members)
   * @returns Array of counselor users (sanitized)
   */
  async getCounselors(): Promise<User[]> {
    try {
      const counselors = await this.userRepository.findCounselors();
      return counselors.map(u => this.sanitizeUser(u));
    } catch (error) {
      return this.handleError(error, 'CounselorDashboardService.getCounselors');
    }
  }

  /**
   * Get all staff members (team members)
   * @returns Array of staff users (sanitized)
   */
  async getAllStaff(): Promise<User[]> {
    try {
      const staff = await this.userRepository.findAllTeamMembers();
      return staff.map(u => this.sanitizeUser(u));
    } catch (error) {
      return this.handleError(error, 'CounselorDashboardService.getAllStaff');
    }
  }

  /**
   * Get application stage label from status
   * @param status - Application status
   * @returns Human-readable stage label
   */
  getApplicationStage(status: string): string {
    switch (status) {
      case 'inquiry': return 'Initial Consultation';
      case 'converted': return 'Document Collection';
      case 'visa_applied': return 'Visa Processing';
      case 'visa_approved': return 'Pre-Departure';
      case 'departed': return 'Completed';
      default: return 'Unknown';
    }
  }

  /**
   * Format a date as relative time
   * @param createdAt - The date to format
   * @returns Human-readable relative time string
   */
  formatLastActivity(createdAt: Date): string {
    const now = new Date();
    const diffInMs = now.getTime() - createdAt.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInDays === 1) return '1 day ago';
    return `${diffInDays} days ago`;
  }

  /**
   * Format students for dashboard display
   * @param students - Array of raw student data
   * @returns Array of formatted student objects for display
   */
  formatAssignedStudents(students: any[]): any[] {
    return students.map((student: any) => ({
      id: student.id,
      userId: student.userId,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone || 'Not provided',
      nationality: student.nationality || 'Not specified',
      destinationCountry: student.destinationCountry || 'Not specified',
      intakeYear: student.intakeYear || 'Not specified',
      status: student.status || 'inquiry',
      profilePicture: student.profilePicture,
      applicationStage: this.getApplicationStage(student.status || 'inquiry'),
      documentsCount: 0,
      universitiesShortlisted: 0,
      lastActivity: this.formatLastActivity(student.createdAt),
      urgentActions: 0,
      currentEducationLevel: student.currentEducationLevel,
      intendedMajor: student.intendedMajor,
      budgetRange: student.budgetRange,
      gpa: student.gpa,
      testScores: student.testScores,
      academicInterests: student.academicInterests,
      extracurriculars: student.extracurriculars,
      workExperience: student.workExperience
    }));
  }

  /**
   * Get formatted assigned students - combines retrieval and formatting
   * @param counselorId - The counselor's user ID
   * @returns Array of formatted students assigned to the counselor
   */
  async getAssignedStudentsFormatted(counselorId: string): Promise<any[]> {
    try {
      const students = await this.counselorAssignmentService.getAssignedStudents(counselorId);
      return this.formatAssignedStudents(students);
    } catch (error) {
      return this.handleError(error, 'CounselorDashboardService.getAssignedStudentsFormatted');
    }
  }
}

export const counselorDashboardService = new CounselorDashboardService();
