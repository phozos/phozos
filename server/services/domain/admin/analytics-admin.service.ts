import { BaseService } from '../../base.service';
import { 
  IUserRepository, 
  IStudentRepository, 
  IApplicationRepository, 
  IUniversityRepository 
} from '../../../repositories';
import { container, TYPES } from '../../container';
import { Application } from '@shared/schema';

export interface IAdminAnalyticsService {
  getSystemStats(): Promise<{
    totalUsers: number;
    totalStudents: number;
    totalApplications: number;
    totalUniversities: number;
    pendingTasks: number;
    newSignups: number;
    conversionRate: number;
  }>;
  getAnalyticsDashboard(): Promise<{
    activeStudents: number;
    totalApplications: number;
    successRate: number;
    teamMembers: number;
    recentActivity: Application[];
  }>;
  getAllApplications(): Promise<Application[]>;
}

export class AdminAnalyticsService extends BaseService implements IAdminAnalyticsService {
  constructor(
    private userRepository: IUserRepository = container.get<IUserRepository>(TYPES.IUserRepository),
    private studentRepository: IStudentRepository = container.get<IStudentRepository>(TYPES.IStudentRepository),
    private applicationRepository: IApplicationRepository = container.get<IApplicationRepository>(TYPES.IApplicationRepository),
    private universityRepository: IUniversityRepository = container.get<IUniversityRepository>(TYPES.IUniversityRepository)
  ) {
    super();
  }

  async getSystemStats(): Promise<{
    totalUsers: number;
    totalStudents: number;
    totalApplications: number;
    totalUniversities: number;
    pendingTasks: number;
    newSignups: number;
    conversionRate: number;
  }> {
    try {
      const [users, students, applications, universities] = await Promise.all([
        this.userRepository.findAll(),
        this.studentRepository.findAll(),
        this.applicationRepository.findAll(),
        this.universityRepository.findAll()
      ]);

      const pendingTasks = applications.filter(app => app.status === 'under_review').length;
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const newSignups = students.filter(s => {
        if (!s.createdAt) return false;
        const created = new Date(s.createdAt);
        return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
      }).length;

      const totalApps = applications.length;
      const acceptedApps = applications.filter(app => app.status === 'accepted').length;
      const conversionRate = totalApps > 0 ? Math.round((acceptedApps / totalApps) * 100 * 100) / 100 : 0;

      return {
        totalUsers: users.length,
        totalStudents: students.length,
        totalApplications: applications.length,
        totalUniversities: universities.length,
        pendingTasks,
        newSignups,
        conversionRate
      };
    } catch (error) {
      return this.handleError(error, 'AdminAnalyticsService.getSystemStats');
    }
  }

  async getAnalyticsDashboard(): Promise<{
    activeStudents: number;
    totalApplications: number;
    successRate: number;
    teamMembers: number;
    recentActivity: Application[];
  }> {
    try {
      const [applications, users] = await Promise.all([
        this.applicationRepository.findAll(),
        this.userRepository.findAll()
      ]);
      
      const teamMembers = users.filter(u => u.userType === 'team_member');
      const submittedApps = applications.filter(app => app.status === 'submitted');
      
      return {
        activeStudents: submittedApps.length,
        totalApplications: applications.length,
        successRate: 94.5,
        teamMembers: teamMembers.length,
        recentActivity: applications.slice(0, 10)
      };
    } catch (error) {
      return this.handleError(error, 'AdminAnalyticsService.getAnalyticsDashboard');
    }
  }

  async getAllApplications(): Promise<Application[]> {
    try {
      return await this.applicationRepository.findAll();
    } catch (error) {
      return this.handleError(error, 'AdminAnalyticsService.getAllApplications');
    }
  }
}

// Export singleton instance
export const adminAnalyticsService = new AdminAnalyticsService();
