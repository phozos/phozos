import { describe, it, expect, afterEach } from 'vitest';
import { applicationRepository } from '../application.repository';
import { userRepository } from '../user.repository';
import { universityRepository } from '../university.repository';

describe('ApplicationRepository', () => {
  let testApplicationId: string;
  let testUserId: string;
  let testUniversityId: string;

  afterEach(async () => {
    if (testApplicationId) {
      try {
        await applicationRepository.delete(testApplicationId);
      } catch (error) {
        console.log('Application cleanup failed:', error);
      }
    }
    if (testUserId) {
      try {
        await userRepository.delete(testUserId);
      } catch (error) {
        console.log('User cleanup failed:', error);
      }
    }
    if (testUniversityId) {
      try {
        await universityRepository.delete(testUniversityId);
      } catch (error) {
        console.log('University cleanup failed:', error);
      }
    }
  });

  describe('create', () => {
    it('should create an application', async () => {
      const user = await userRepository.create({
        email: `app-test-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'App',
        lastName: 'Test'
      });
      testUserId = user.id;

      const university = await universityRepository.create({
        name: `App Test Univ ${Date.now()}`,
        country: 'USA',
        city: 'Boston',
        isActive: true
      });
      testUniversityId = university.id;

      const application = await applicationRepository.create({
        userId: user.id,
        universityId: university.id,
        status: 'draft'
      });
      testApplicationId = application.id;

      expect(application.id).toBeDefined();
      expect(application.userId).toBe(user.id);
      expect(application.universityId).toBe(university.id);
      expect(application.status).toBe('draft');
    });
  });

  describe('findByUser', () => {
    it('should find applications by user ID', async () => {
      const user = await userRepository.create({
        email: `find-app-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Find',
        lastName: 'App'
      });
      testUserId = user.id;

      const university = await universityRepository.create({
        name: `Find App Univ ${Date.now()}`,
        country: 'Canada',
        city: 'Toronto',
        isActive: true
      });
      testUniversityId = university.id;

      const application = await applicationRepository.create({
        userId: user.id,
        universityId: university.id,
        status: 'submitted'
      });
      testApplicationId = application.id;

      const applications = await applicationRepository.findByUser(user.id);
      expect(applications.length).toBeGreaterThan(0);
      expect(applications.some(a => a.id === application.id)).toBe(true);
    });
  });

  describe('findByStatus', () => {
    it('should find applications by status', async () => {
      const user = await userRepository.create({
        email: `status-test-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Status',
        lastName: 'Test'
      });
      testUserId = user.id;

      const university = await universityRepository.create({
        name: `Status Univ ${Date.now()}`,
        country: 'UK',
        city: 'London',
        isActive: true
      });
      testUniversityId = university.id;

      const application = await applicationRepository.create({
        userId: user.id,
        universityId: university.id,
        status: 'accepted'
      });
      testApplicationId = application.id;

      const applications = await applicationRepository.findByStatus('accepted');
      expect(applications.length).toBeGreaterThan(0);
      expect(applications.some(a => a.id === application.id)).toBe(true);
    });
  });

  describe('update', () => {
    it('should update application status', async () => {
      const user = await userRepository.create({
        email: `update-app-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Update',
        lastName: 'App'
      });
      testUserId = user.id;

      const university = await universityRepository.create({
        name: `Update Univ ${Date.now()}`,
        country: 'Australia',
        city: 'Sydney',
        isActive: true
      });
      testUniversityId = university.id;

      const application = await applicationRepository.create({
        userId: user.id,
        universityId: university.id,
        status: 'draft'
      });
      testApplicationId = application.id;

      const updated = await applicationRepository.update(application.id, {
        status: 'accepted'
      });

      expect(updated?.status).toBe('accepted');
    });
  });

  describe('delete', () => {
    it('should delete an application', async () => {
      const user = await userRepository.create({
        email: `delete-app-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Delete',
        lastName: 'App'
      });
      testUserId = user.id;

      const university = await universityRepository.create({
        name: `Delete Univ ${Date.now()}`,
        country: 'Germany',
        city: 'Berlin',
        isActive: true
      });
      testUniversityId = university.id;

      const application = await applicationRepository.create({
        userId: user.id,
        universityId: university.id,
        status: 'draft'
      });

      const deleted = await applicationRepository.delete(application.id);
      expect(deleted).toBe(true);

      const found = await applicationRepository.findById(application.id);
      expect(found).toBeUndefined();
      testApplicationId = '';
    });
  });

  describe('findByUniversity', () => {
    it('should find all applications for a university', async () => {
      const user = await userRepository.create({
        email: `uni-app-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Uni',
        lastName: 'App'
      });
      testUserId = user.id;

      const university = await universityRepository.create({
        name: `Find By Uni ${Date.now()}`,
        country: 'UK',
        city: 'Oxford',
        isActive: true
      });
      testUniversityId = university.id;

      const application = await applicationRepository.create({
        userId: user.id,
        universityId: university.id,
        status: 'submitted'
      });
      testApplicationId = application.id;

      const applications = await applicationRepository.findByUniversity(university.id);
      expect(applications.length).toBeGreaterThan(0);
      expect(applications.some(a => a.id === application.id)).toBe(true);
    });
  });

  describe('findById', () => {
    it('should find application by ID', async () => {
      const user = await userRepository.create({
        email: `findbyid-app-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'FindById',
        lastName: 'App'
      });
      testUserId = user.id;

      const university = await universityRepository.create({
        name: `FindById Uni ${Date.now()}`,
        country: 'USA',
        city: 'New York',
        isActive: true
      });
      testUniversityId = university.id;

      const application = await applicationRepository.create({
        userId: user.id,
        universityId: university.id,
        status: 'draft'
      });
      testApplicationId = application.id;

      const found = await applicationRepository.findById(application.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(application.id);
      expect(found?.status).toBe('draft');
    });
  });

  describe('findAll', () => {
    it('should find all applications', async () => {
      const user = await userRepository.create({
        email: `findall-app-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'FindAll',
        lastName: 'App'
      });
      testUserId = user.id;

      const university = await universityRepository.create({
        name: `FindAll Uni ${Date.now()}`,
        country: 'Japan',
        city: 'Tokyo',
        isActive: true
      });
      testUniversityId = university.id;

      const application = await applicationRepository.create({
        userId: user.id,
        universityId: university.id,
        status: 'draft'
      });
      testApplicationId = application.id;

      const applications = await applicationRepository.findAll({ status: 'draft' });
      expect(applications.length).toBeGreaterThan(0);
      expect(applications.some(a => a.id === application.id)).toBe(true);
    });
  });

  describe('countByUser', () => {
    it('should count applications by user', async () => {
      const user = await userRepository.create({
        email: `count-app-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Count',
        lastName: 'App'
      });
      testUserId = user.id;

      const university = await universityRepository.create({
        name: `Count Uni ${Date.now()}`,
        country: 'Spain',
        city: 'Madrid',
        isActive: true
      });
      testUniversityId = university.id;

      const application = await applicationRepository.create({
        userId: user.id,
        universityId: university.id,
        status: 'draft'
      });
      testApplicationId = application.id;

      const count = await applicationRepository.countByUser(user.id);
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('findByUserWithUniversity', () => {
    it('should find applications by user with university details', async () => {
      const user = await userRepository.create({
        email: `useruni-app-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'UserUni',
        lastName: 'App'
      });
      testUserId = user.id;

      const university = await universityRepository.create({
        name: `UserUni Test ${Date.now()}`,
        country: 'Canada',
        city: 'Toronto',
        isActive: true,
        worldRanking: 50,
        website: 'https://example.edu'
      });
      testUniversityId = university.id;

      const application = await applicationRepository.create({
        userId: user.id,
        universityId: university.id,
        status: 'submitted'
      });
      testApplicationId = application.id;

      const applications = await applicationRepository.findByUserWithUniversity(user.id);
      expect(Array.isArray(applications)).toBe(true);
      expect(applications.length).toBeGreaterThan(0);
      
      const foundApp = applications.find(a => a.id === application.id);
      expect(foundApp).toBeDefined();
      expect(foundApp?.universityName).toBe(university.name);
      expect(foundApp?.universityCountry).toBe(university.country);
      expect(foundApp?.universityWorldRanking).toBe(50);
      expect(foundApp?.universityWebsite).toBe('https://example.edu');
    });

    it('should return empty array for user with no applications', async () => {
      const user = await userRepository.create({
        email: `noapp-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'NoApp',
        lastName: 'User'
      });
      testUserId = user.id;

      const applications = await applicationRepository.findByUserWithUniversity(user.id);
      expect(Array.isArray(applications)).toBe(true);
      expect(applications.length).toBe(0);
    });
  });
});
