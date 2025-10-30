import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ApplicationService } from '../application.service';
import { applicationRepository } from '../../../repositories/application.repository';
import { userRepository } from '../../../repositories/user.repository';
import { universityRepository } from '../../../repositories/university.repository';

describe('ApplicationService', () => {
  let applicationService: ApplicationService;
  let testUserIds: string[] = [];
  let testUniversityIds: string[] = [];
  let testCourseIds: string[] = [];
  let testApplicationIds: string[] = [];

  beforeEach(() => {
    applicationService = new ApplicationService();
  });

  afterEach(async () => {
    for (const appId of testApplicationIds) {
      try {
        await applicationRepository.delete(appId);
      } catch (error) {
        console.log('Application cleanup failed:', error);
      }
    }
    testApplicationIds = [];

    for (const courseId of testCourseIds) {
      try {
        await universityRepository.deleteCourse?.(courseId);
      } catch (error) {
        console.log('Course cleanup failed:', error);
      }
    }
    testCourseIds = [];

    for (const uniId of testUniversityIds) {
      try {
        await universityRepository.delete(uniId);
      } catch (error) {
        console.log('University cleanup failed:', error);
      }
    }
    testUniversityIds = [];

    for (const userId of testUserIds) {
      try {
        await userRepository.delete(userId);
      } catch (error) {
        console.log('User cleanup failed:', error);
      }
    }
    testUserIds = [];
  });

  describe('getApplicationById', () => {
    it('should return application by id', async () => {
      const user = await userRepository.create({
        email: `app-user-${Date.now()}@example.com`,
        password: 'hashedPassword',
        userType: 'customer',
        firstName: 'App',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      const university = await universityRepository.create({
        name: `Test University ${Date.now()}`,
        country: 'USA',
        city: 'New York',
        ranking: 100
      });
      testUniversityIds.push(university.id);

      const course = await universityRepository.createCourse({
        universityId: university.id,
        name: `Test Course ${Date.now()}`,
        degree: 'Bachelor',
        field: 'Computer Science'
      });
      testCourseIds.push(course.id);

      const application = await applicationRepository.create({
        userId: user.id,
        universityId: university.id,
        courseId: course.id,
        status: 'submitted'
      });
      testApplicationIds.push(application.id);

      const result = await applicationService.getApplicationById(application.id);

      expect(result.id).toBe(application.id);
      expect(result.status).toBe('submitted');
    });

    it('should throw error if application not found', async () => {
      await expect(
        applicationService.getApplicationById('00000000-0000-0000-0000-000000000001')
      ).rejects.toThrow();
    });
  });

  describe('getApplicationsByUser', () => {
    it('should return all applications for a user', async () => {
      const user = await userRepository.create({
        email: `multi-app-user-${Date.now()}@example.com`,
        password: 'hashedPassword',
        userType: 'customer',
        firstName: 'Multi',
        lastName: 'App'
      });
      testUserIds.push(user.id);

      const uni1 = await universityRepository.create({
        name: `University 1 ${Date.now()}`,
        country: 'USA',
        city: 'Los Angeles',
        ranking: 100
      });
      testUniversityIds.push(uni1.id);

      const uni2 = await universityRepository.create({
        name: `University 2 ${Date.now()}`,
        country: 'UK',
        city: 'London',
        ranking: 101
      });
      testUniversityIds.push(uni2.id);

      const course1 = await universityRepository.createCourse({
        universityId: uni1.id,
        name: `Course 1 ${Date.now()}`,
        degree: 'Bachelor',
        field: 'CS'
      });
      testCourseIds.push(course1.id);

      const course2 = await universityRepository.createCourse({
        universityId: uni2.id,
        name: `Course 2 ${Date.now()}`,
        degree: 'Master',
        field: 'Engineering'
      });
      testCourseIds.push(course2.id);

      const app1 = await applicationRepository.create({
        userId: user.id,
        universityId: uni1.id,
        courseId: course1.id,
        status: 'submitted'
      });
      testApplicationIds.push(app1.id);

      const app2 = await applicationRepository.create({
        userId: user.id,
        universityId: uni2.id,
        courseId: course2.id,
        status: 'accepted'
      });
      testApplicationIds.push(app2.id);

      const result = await applicationService.getApplicationsByUser(user.id);

      expect(result.length).toBeGreaterThanOrEqual(2);
      const foundApp1 = result.find(a => a.id === app1.id);
      const foundApp2 = result.find(a => a.id === app2.id);
      expect(foundApp1?.userId).toBe(user.id);
      expect(foundApp2?.userId).toBe(user.id);
    });
  });

  describe('getApplicationsByStatus', () => {
    it('should return applications by status', async () => {
      const user = await userRepository.create({
        email: `status-user-${Date.now()}@example.com`,
        password: 'hashedPassword',
        userType: 'customer',
        firstName: 'Status',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      const university = await universityRepository.create({
        name: `Status Uni ${Date.now()}`,
        country: 'USA',
        city: 'San Francisco',
        ranking: 102
      });
      testUniversityIds.push(university.id);

      const course = await universityRepository.createCourse({
        universityId: university.id,
        name: `Status Course ${Date.now()}`,
        degree: 'Bachelor',
        field: 'CS'
      });
      testCourseIds.push(course.id);

      const app = await applicationRepository.create({
        userId: user.id,
        universityId: university.id,
        courseId: course.id,
        status: 'submitted'
      });
      testApplicationIds.push(app.id);

      const result = await applicationService.getApplicationsByStatus('submitted');

      expect(result.length).toBeGreaterThanOrEqual(1);
      const foundApp = result.find(a => a.id === app.id);
      expect(foundApp?.status).toBe('submitted');
    });
  });

  describe('createApplication', () => {
    it('should create application successfully', async () => {
      const user = await userRepository.create({
        email: `create-app-user-${Date.now()}@example.com`,
        password: 'hashedPassword',
        userType: 'customer',
        firstName: 'Create',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      const university = await universityRepository.create({
        name: `Create Uni ${Date.now()}`,
        country: 'USA',
        city: 'Chicago',
        ranking: 103
      });
      testUniversityIds.push(university.id);

      const course = await universityRepository.createCourse({
        universityId: university.id,
        name: `Create Course ${Date.now()}`,
        degree: 'Bachelor',
        field: 'CS'
      });
      testCourseIds.push(course.id);

      const result = await applicationService.createApplication({
        userId: user.id,
        universityId: university.id,
        courseId: course.id
      });
      testApplicationIds.push(result.id);

      expect(result.id).toBeDefined();
      expect(result.userId).toBe(user.id);
      expect(result.universityId).toBe(university.id);
      expect(result.courseId).toBe(course.id);
    });

    it('should throw error for duplicate application', async () => {
      const user = await userRepository.create({
        email: `dup-app-user-${Date.now()}@example.com`,
        password: 'hashedPassword',
        userType: 'customer',
        firstName: 'Duplicate',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      const university = await universityRepository.create({
        name: `Dup Uni ${Date.now()}`,
        country: 'USA',
        city: 'Denver',
        ranking: 104
      });
      testUniversityIds.push(university.id);

      const course = await universityRepository.createCourse({
        universityId: university.id,
        name: `Dup Course ${Date.now()}`,
        degree: 'Bachelor',
        field: 'CS'
      });
      testCourseIds.push(course.id);

      const app = await applicationRepository.create({
        userId: user.id,
        universityId: university.id,
        courseId: course.id
      });
      testApplicationIds.push(app.id);

      await expect(
        applicationService.createApplication({
          userId: user.id,
          universityId: university.id,
          courseId: course.id
        })
      ).rejects.toThrow('DUPLICATE_APPLICATION');
    });

    it('should throw error if required fields are missing', async () => {
      await expect(
        applicationService.createApplication({} as any)
      ).rejects.toThrow();
    });
  });

  describe('updateApplication', () => {
    it('should update application successfully', async () => {
      const user = await userRepository.create({
        email: `update-app-user-${Date.now()}@example.com`,
        password: 'hashedPassword',
        userType: 'customer',
        firstName: 'Update',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      const university = await universityRepository.create({
        name: `Update Uni ${Date.now()}`,
        country: 'USA',
        city: 'Austin',
        ranking: 105
      });
      testUniversityIds.push(university.id);

      const course = await universityRepository.createCourse({
        universityId: university.id,
        name: `Update Course ${Date.now()}`,
        degree: 'Bachelor',
        field: 'CS'
      });
      testCourseIds.push(course.id);

      const app = await applicationRepository.create({
        userId: user.id,
        universityId: university.id,
        courseId: course.id,
        status: 'draft'
      });
      testApplicationIds.push(app.id);

      const result = await applicationService.updateApplication(app.id, {
        status: 'accepted'
      });

      expect(result.status).toBe('accepted');
    });

    it('should throw error if update fails', async () => {
      await expect(
        applicationService.updateApplication('00000000-0000-0000-0000-000000000001', { status: 'accepted' })
      ).rejects.toThrow('UPDATE_FAILED');
    });
  });

  describe('updateApplicationStatus', () => {
    it('should update application status', async () => {
      const user = await userRepository.create({
        email: `status-update-user-${Date.now()}@example.com`,
        password: 'hashedPassword',
        userType: 'customer',
        firstName: 'Status',
        lastName: 'Update'
      });
      testUserIds.push(user.id);

      const university = await universityRepository.create({
        name: `Status Update Uni ${Date.now()}`,
        country: 'USA',
        city: 'Boston',
        ranking: 106
      });
      testUniversityIds.push(university.id);

      const course = await universityRepository.createCourse({
        universityId: university.id,
        name: `Status Update Course ${Date.now()}`,
        degree: 'Bachelor',
        field: 'CS'
      });
      testCourseIds.push(course.id);

      const app = await applicationRepository.create({
        userId: user.id,
        universityId: university.id,
        courseId: course.id,
        status: 'submitted'
      });
      testApplicationIds.push(app.id);

      const result = await applicationService.updateApplicationStatus(app.id, 'rejected');

      expect(result.status).toBe('rejected');
    });
  });

  describe('deleteApplication', () => {
    it('should delete application successfully', async () => {
      const user = await userRepository.create({
        email: `delete-app-user-${Date.now()}@example.com`,
        password: 'hashedPassword',
        userType: 'customer',
        firstName: 'Delete',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      const university = await universityRepository.create({
        name: `Delete Uni ${Date.now()}`,
        country: 'USA',
        city: 'Seattle',
        ranking: 107
      });
      testUniversityIds.push(university.id);

      const course = await universityRepository.createCourse({
        universityId: university.id,
        name: `Delete Course ${Date.now()}`,
        degree: 'Bachelor',
        field: 'CS'
      });
      testCourseIds.push(course.id);

      const app = await applicationRepository.create({
        userId: user.id,
        universityId: university.id,
        courseId: course.id
      });

      const result = await applicationService.deleteApplication(app.id);

      expect(result).toBe(true);
    });

    it('should return false if delete fails', async () => {
      const result = await applicationService.deleteApplication('00000000-0000-0000-0000-000000000001');

      expect(result).toBe(false);
    });
  });

  describe('getApplicationsByUniversity', () => {
    it('should return applications for a university', async () => {
      const user = await userRepository.create({
        email: `uni-apps-user-${Date.now()}@example.com`,
        password: 'hashedPassword',
        userType: 'customer',
        firstName: 'Uni',
        lastName: 'Apps'
      });
      testUserIds.push(user.id);

      const university = await universityRepository.create({
        name: `Uni Apps ${Date.now()}`,
        country: 'USA',
        city: 'Portland',
        ranking: 108
      });
      testUniversityIds.push(university.id);

      const course = await universityRepository.createCourse({
        universityId: university.id,
        name: `Uni Apps Course ${Date.now()}`,
        degree: 'Bachelor',
        field: 'CS'
      });
      testCourseIds.push(course.id);

      const app = await applicationRepository.create({
        userId: user.id,
        universityId: university.id,
        courseId: course.id
      });
      testApplicationIds.push(app.id);

      const result = await applicationService.getApplicationsByUniversity(university.id);

      expect(result.length).toBeGreaterThanOrEqual(1);
      const foundApp = result.find(a => a.id === app.id);
      expect(foundApp?.universityId).toBe(university.id);
    });

    it('should throw error for invalid UUID in getApplicationsByUniversity', async () => {
      await expect(
        applicationService.getApplicationsByUniversity('invalid-uuid-format')
      ).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid UUID in getApplicationsByUser', async () => {
      await expect(
        applicationService.getApplicationsByUser('invalid-uuid-format')
      ).rejects.toThrow();
    });

    it('should return empty array for status with no applications', async () => {
      const result = await applicationService.getApplicationsByStatus('draft');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle errors in deleteApplication', async () => {
      await expect(
        applicationService.deleteApplication('invalid-uuid-format')
      ).rejects.toThrow();
    });
  });
});
