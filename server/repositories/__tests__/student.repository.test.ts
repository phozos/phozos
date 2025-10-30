import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { studentRepository } from '../student.repository';
import { userRepository } from '../user.repository';
import { db } from '../../db';

describe('StudentRepository', () => {
  let testUserId: string;
  let testStudentId: string;

  afterEach(async () => {
    if (testStudentId) {
      try {
        await studentRepository.delete(testStudentId);
      } catch (error) {
        console.log('Student cleanup failed:', error);
      }
    }
    if (testUserId) {
      try {
        await userRepository.delete(testUserId);
      } catch (error) {
        console.log('User cleanup failed:', error);
      }
    }
  });

  describe('findByUserId', () => {
    it('should find student profile by user ID', async () => {
      const user = await userRepository.create({
        email: `student-test-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Student',
        lastName: 'Test'
      });
      testUserId = user.id;

      const profile = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = profile.id;

      const found = await studentRepository.findByUserId(user.id);
      expect(found).toBeDefined();
      expect(found?.userId).toBe(user.id);
    });

    it('should return undefined for non-existent user', async () => {
      const found = await studentRepository.findByUserId('00000000-0000-0000-0000-000000000000');
      expect(found).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should create a student profile', async () => {
      const user = await userRepository.create({
        email: `create-student-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Create',
        lastName: 'Student'
      });
      testUserId = user.id;

      const profile = await studentRepository.create({
        userId: user.id,
        status: 'inquiry',
        phone: '+1234567890',
        nationality: 'USA'
      });
      testStudentId = profile.id;

      expect(profile.id).toBeDefined();
      expect(profile.userId).toBe(user.id);
      expect(profile.status).toBe('inquiry');
      expect(profile.phone).toBe('+1234567890');
    });
  });

  describe('assignCounselor', () => {
    it('should assign counselor to student', async () => {
      const user = await userRepository.create({
        email: `assign-test-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Assign',
        lastName: 'Test'
      });
      testUserId = user.id;

      const counselor = await userRepository.create({
        email: `counselor-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'team_member',
        teamRole: 'counselor',
        firstName: 'Test',
        lastName: 'Counselor'
      });

      const profile = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = profile.id;

      await studentRepository.assignCounselor(profile.id, counselor.id);

      const updated = await studentRepository.findById(profile.id);
      expect(updated?.assignedCounselorId).toBe(counselor.id);

      await studentRepository.delete(profile.id);
      await userRepository.delete(counselor.id);
      testStudentId = '';
    });
  });

  describe('checkAssignment', () => {
    it('should check if counselor is assigned to student', async () => {
      const user = await userRepository.create({
        email: `check-assign-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Check',
        lastName: 'Assign'
      });
      testUserId = user.id;

      const counselor = await userRepository.create({
        email: `counselor-check-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'team_member',
        teamRole: 'counselor',
        firstName: 'Check',
        lastName: 'Counselor'
      });

      const profile = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = profile.id;

      await studentRepository.assignCounselor(profile.id, counselor.id);

      const isAssigned = await studentRepository.checkAssignment(counselor.id, profile.id);
      expect(isAssigned).toBe(true);

      const notAssigned = await studentRepository.checkAssignment('00000000-0000-0000-0000-000000000000', profile.id);
      expect(notAssigned).toBe(false);

      await studentRepository.delete(profile.id);
      await userRepository.delete(counselor.id);
      testStudentId = '';
    });
  });

  describe('update', () => {
    it('should update student profile', async () => {
      const user = await userRepository.create({
        email: `update-student-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Update',
        lastName: 'Student'
      });
      testUserId = user.id;

      const profile = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = profile.id;

      const updated = await studentRepository.update(profile.id, {
        status: 'converted',
        nationality: 'Canada',
        destinationCountry: 'UK'
      });

      expect(updated).toBeDefined();
      expect(updated?.status).toBe('converted');
      expect(updated?.nationality).toBe('Canada');
      expect(updated?.destinationCountry).toBe('UK');
    });
  });

  describe('unassign', () => {
    it('should unassign counselor from student', async () => {
      const user = await userRepository.create({
        email: `unassign-test-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Unassign',
        lastName: 'Test'
      });
      testUserId = user.id;

      const counselor = await userRepository.create({
        email: `counselor-unassign-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'team_member',
        teamRole: 'counselor',
        firstName: 'Unassign',
        lastName: 'Counselor'
      });

      const profile = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = profile.id;

      await studentRepository.assignCounselor(profile.id, counselor.id);
      await studentRepository.unassign(profile.id);

      const updated = await studentRepository.findById(profile.id);
      expect(updated?.assignedCounselorId).toBeNull();

      await studentRepository.delete(profile.id);
      await userRepository.delete(counselor.id);
      testStudentId = '';
    });
  });

  describe('findAllWithUserDetails', () => {
    it('should find all students with user details', async () => {
      const user = await userRepository.create({
        email: `details-test-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Details',
        lastName: 'Test'
      });
      testUserId = user.id;

      const profile = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = profile.id;

      const students = await studentRepository.findAllWithUserDetails();
      expect(students.length).toBeGreaterThan(0);
      expect(students.some(s => s.id === profile.id)).toBe(true);
    });
  });

  describe('findAssignedToCounselor', () => {
    it('should find students assigned to a counselor', async () => {
      const user = await userRepository.create({
        email: `find-assigned-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Find',
        lastName: 'Assigned'
      });
      testUserId = user.id;

      const counselor = await userRepository.create({
        email: `counselor-find-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'team_member',
        teamRole: 'counselor',
        firstName: 'Find',
        lastName: 'Counselor'
      });

      const profile = await studentRepository.create({
        userId: user.id,
        status: 'converted'
      });
      testStudentId = profile.id;

      await studentRepository.assignCounselor(profile.id, counselor.id);

      const assigned = await studentRepository.findAssignedToCounselor(counselor.id);
      expect(assigned.length).toBeGreaterThan(0);
      expect(assigned.some(s => s.id === profile.id)).toBe(true);

      await studentRepository.delete(profile.id);
      await userRepository.delete(counselor.id);
      testStudentId = '';
    });
  });

  describe('findById', () => {
    it('should find student profile by ID', async () => {
      const user = await userRepository.create({
        email: `findbyid-student-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'FindById',
        lastName: 'Student'
      });
      testUserId = user.id;

      const profile = await studentRepository.create({
        userId: user.id,
        status: 'inquiry',
        nationality: 'France'
      });
      testStudentId = profile.id;

      const found = await studentRepository.findById(profile.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(profile.id);
      expect(found?.userId).toBe(user.id);
      expect(found?.nationality).toBe('France');
    });

    it('should return undefined for non-existent ID', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const found = await studentRepository.findById(fakeId);
      expect(found).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should find all student profiles', async () => {
      const user = await userRepository.create({
        email: `findall-student-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'FindAll',
        lastName: 'Student'
      });
      testUserId = user.id;

      const profile = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = profile.id;

      const allStudents = await studentRepository.findAll();
      expect(Array.isArray(allStudents)).toBe(true);
      expect(allStudents.length).toBeGreaterThan(0);
    });

    it('should find students with filters', async () => {
      const user = await userRepository.create({
        email: `filter-student-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Filter',
        lastName: 'Student'
      });
      testUserId = user.id;

      const profile = await studentRepository.create({
        userId: user.id,
        status: 'converted'
      });
      testStudentId = profile.id;

      const filteredStudents = await studentRepository.findAll({ status: 'converted' });
      expect(Array.isArray(filteredStudents)).toBe(true);
      expect(filteredStudents.some(s => s.id === profile.id)).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete a student profile', async () => {
      const user = await userRepository.create({
        email: `delete-student-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Delete',
        lastName: 'Student'
      });
      testUserId = user.id;

      const profile = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });

      const deleted = await studentRepository.delete(profile.id);
      expect(deleted).toBe(true);

      const found = await studentRepository.findById(profile.id);
      expect(found).toBeUndefined();
      testStudentId = '';
    });

    it('should return false when deleting non-existent profile', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000999';
      const deleted = await studentRepository.delete(fakeId);
      expect(deleted).toBe(false);
    });
  });
});
