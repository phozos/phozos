import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CounselorDashboardService } from '../counselor-dashboard.service';
import { userRepository } from '../../../repositories/user.repository';
import { studentRepository } from '../../../repositories/student.repository';
import { ValidationServiceError } from '../../errors';

describe('CounselorDashboardService', () => {
  let service: CounselorDashboardService;
  let testUserIds: string[] = [];
  let testStudentIds: string[] = [];

  beforeEach(() => {
    service = new CounselorDashboardService();
  });

  afterEach(async () => {
    for (const studentId of testStudentIds) {
      try {
        await studentRepository.delete(studentId);
      } catch (error) {
        console.log('Student cleanup failed:', error);
      }
    }
    testStudentIds = [];

    for (const userId of testUserIds) {
      try {
        await userRepository.delete(userId);
      } catch (error) {
        console.log('User cleanup failed:', error);
      }
    }
    testUserIds = [];
  });

  describe('getCounselorStats', () => {
    it('should return dashboard statistics', async () => {
      const stats = await service.getCounselorStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalStudents');
      expect(stats).toHaveProperty('activeApplications');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('pendingActions');
      expect(stats).toHaveProperty('newStudentsThisMonth');
      expect(stats).toHaveProperty('upcomingDeadlines');
    });
  });

  describe('getStudentDocuments', () => {
    it('should return documents for a student', async () => {
      const studentUser = await userRepository.create({
        email: `student-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'John',
        lastName: 'Student',
        userType: 'customer'
      });
      testUserIds.push(studentUser.id);

      const studentProfile = await studentRepository.create({
        userId: studentUser.id,
        firstName: 'John',
        lastName: 'Student',
        email: studentUser.email,
        phone: '+1234567890',
        nationality: 'USA',
        destinationCountry: 'Canada'
      });
      testStudentIds.push(studentProfile.id);

      const documents = await service.getStudentDocuments(studentProfile.id);

      expect(documents).toBeDefined();
      expect(Array.isArray(documents)).toBe(true);
    });

    it('should throw ValidationServiceError for invalid student ID', async () => {
      await expect(service.getStudentDocuments('invalid-id')).rejects.toThrow(ValidationServiceError);
    });
  });

  describe('getCounselors', () => {
    it('should return all counselors', async () => {
      const counselor = await userRepository.create({
        email: `counselor-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Jane',
        lastName: 'Counselor',
        userType: 'team_member',
        teamRole: 'counselor'
      });
      testUserIds.push(counselor.id);

      const counselors = await service.getCounselors();

      expect(counselors).toBeDefined();
      expect(Array.isArray(counselors)).toBe(true);
      expect(counselors.some(c => c.id === counselor.id)).toBe(true);
      expect(counselors[0]).not.toHaveProperty('password');
      expect(counselors[0]).not.toHaveProperty('temporaryPassword');
    });
  });

  describe('getAllStaff', () => {
    it('should return all staff members', async () => {
      const staffMember = await userRepository.create({
        email: `staff-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Bob',
        lastName: 'Staff',
        userType: 'team_member'
      });
      testUserIds.push(staffMember.id);

      const staff = await service.getAllStaff();

      expect(staff).toBeDefined();
      expect(Array.isArray(staff)).toBe(true);
      expect(staff.some(s => s.id === staffMember.id)).toBe(true);
      expect(staff[0]).not.toHaveProperty('password');
      expect(staff[0]).not.toHaveProperty('temporaryPassword');
    });
  });

  describe('getApplicationStage', () => {
    it('should return correct stage for inquiry status', () => {
      expect(service.getApplicationStage('inquiry')).toBe('Initial Consultation');
    });

    it('should return correct stage for converted status', () => {
      expect(service.getApplicationStage('converted')).toBe('Document Collection');
    });

    it('should return correct stage for visa_applied status', () => {
      expect(service.getApplicationStage('visa_applied')).toBe('Visa Processing');
    });

    it('should return correct stage for visa_approved status', () => {
      expect(service.getApplicationStage('visa_approved')).toBe('Pre-Departure');
    });

    it('should return correct stage for departed status', () => {
      expect(service.getApplicationStage('departed')).toBe('Completed');
    });

    it('should return Unknown for unknown status', () => {
      expect(service.getApplicationStage('unknown')).toBe('Unknown');
    });
  });

  describe('formatLastActivity', () => {
    it('should return "Just now" for recent activity', () => {
      const now = new Date();
      expect(service.formatLastActivity(now)).toBe('Just now');
    });

    it('should return hours ago for activity within 24 hours', () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
      expect(service.formatLastActivity(fiveHoursAgo)).toBe('5 hours ago');
    });

    it('should return "1 day ago" for activity exactly 1 day ago', () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(service.formatLastActivity(oneDayAgo)).toBe('1 day ago');
    });

    it('should return days ago for activity more than 1 day ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      expect(service.formatLastActivity(threeDaysAgo)).toBe('3 days ago');
    });
  });

  describe('formatAssignedStudents', () => {
    it('should format students for dashboard display', () => {
      const mockStudents = [
        {
          id: 'student-1',
          userId: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          nationality: 'USA',
          destinationCountry: 'Canada',
          intakeYear: '2024',
          status: 'inquiry',
          profilePicture: null,
          createdAt: new Date(),
          currentEducationLevel: 'Bachelor',
          intendedMajor: 'Computer Science',
          budgetRange: { min: 10000, max: 50000 },
          gpa: '3.5',
          testScores: { SAT: 1400 },
          academicInterests: ['AI', 'ML'],
          extracurriculars: [],
          workExperience: []
        }
      ];

      const formatted = service.formatAssignedStudents(mockStudents);

      expect(formatted).toBeDefined();
      expect(Array.isArray(formatted)).toBe(true);
      expect(formatted[0]).toHaveProperty('id');
      expect(formatted[0]).toHaveProperty('applicationStage');
      expect(formatted[0]).toHaveProperty('lastActivity');
      expect(formatted[0].applicationStage).toBe('Initial Consultation');
    });

    it('should handle students with missing optional fields', () => {
      const mockStudents = [
        {
          id: 'student-1',
          userId: 'user-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          createdAt: new Date()
        }
      ];

      const formatted = service.formatAssignedStudents(mockStudents);

      expect(formatted[0].phone).toBe('Not provided');
      expect(formatted[0].nationality).toBe('Not specified');
      expect(formatted[0].destinationCountry).toBe('Not specified');
      expect(formatted[0].intakeYear).toBe('Not specified');
    });
  });

  describe('getAssignedStudentsFormatted', () => {
    it('should get and format assigned students for a counselor', async () => {
      const counselor = await userRepository.create({
        email: `counselor-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Jane',
        lastName: 'Counselor',
        userType: 'team_member'
      });
      testUserIds.push(counselor.id);

      const formattedStudents = await service.getAssignedStudentsFormatted(counselor.id);

      expect(formattedStudents).toBeDefined();
      expect(Array.isArray(formattedStudents)).toBe(true);
    });
  });
});
