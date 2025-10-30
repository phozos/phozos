import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CounselorAssignmentService } from '../counselor-assignment.service';
import { userRepository } from '../../../repositories/user.repository';
import { studentRepository } from '../../../repositories/student.repository';
import { ValidationServiceError, InvalidOperationError } from '../../errors';

describe('CounselorAssignmentService', () => {
  let service: CounselorAssignmentService;
  let testUserIds: string[] = [];
  let testStudentIds: string[] = [];

  beforeEach(() => {
    service = new CounselorAssignmentService();
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

  describe('getAssignedStudents', () => {
    it('should return assigned students for a counselor', async () => {
      const counselor = await userRepository.create({
        email: `counselor-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Jane',
        lastName: 'Counselor',
        userType: 'team_member'
      });
      testUserIds.push(counselor.id);

      const students = await service.getAssignedStudents(counselor.id);

      expect(students).toBeDefined();
      expect(Array.isArray(students)).toBe(true);
    });

    it('should throw ValidationServiceError for invalid counselor ID', async () => {
      await expect(service.getAssignedStudents('invalid-id')).rejects.toThrow(ValidationServiceError);
    });
  });

  describe('assignStudent', () => {
    it('should assign a student to a counselor', async () => {
      const counselor = await userRepository.create({
        email: `counselor-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Jane',
        lastName: 'Counselor',
        userType: 'team_member'
      });
      testUserIds.push(counselor.id);

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

      await expect(service.assignStudent(studentProfile.id, counselor.id)).resolves.not.toThrow();
    });

    it('should throw ValidationServiceError for invalid student ID', async () => {
      const counselor = await userRepository.create({
        email: `counselor-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Jane',
        lastName: 'Counselor',
        userType: 'team_member'
      });
      testUserIds.push(counselor.id);

      await expect(service.assignStudent('invalid-id', counselor.id)).rejects.toThrow(ValidationServiceError);
    });

    it('should throw InvalidOperationError when user is not a team member', async () => {
      const notCounselor = await userRepository.create({
        email: `user-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Not',
        lastName: 'Counselor',
        userType: 'customer'
      });
      testUserIds.push(notCounselor.id);

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

      await expect(service.assignStudent(studentProfile.id, notCounselor.id)).rejects.toThrow(InvalidOperationError);
    });
  });

  describe('unassignStudent', () => {
    it('should unassign a student from their counselor', async () => {
      const counselor = await userRepository.create({
        email: `counselor-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Jane',
        lastName: 'Counselor',
        userType: 'team_member'
      });
      testUserIds.push(counselor.id);

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
        destinationCountry: 'Canada',
        assignedCounselorId: counselor.id
      });
      testStudentIds.push(studentProfile.id);

      await expect(service.unassignStudent(studentProfile.id)).resolves.not.toThrow();
    });

    it('should throw ValidationServiceError for invalid student ID', async () => {
      await expect(service.unassignStudent('invalid-id')).rejects.toThrow(ValidationServiceError);
    });
  });

  describe('verifyCounselorAccess', () => {
    it('should return true for valid counselor-student assignment', async () => {
      const counselor = await userRepository.create({
        email: `counselor-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Jane',
        lastName: 'Counselor',
        userType: 'team_member'
      });
      testUserIds.push(counselor.id);

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
        destinationCountry: 'Canada',
        assignedCounselorId: counselor.id
      });
      testStudentIds.push(studentProfile.id);

      const hasAccess = await service.verifyCounselorAccess(counselor.id, studentProfile.id);

      expect(hasAccess).toBe(true);
    });

    it('should return false for invalid assignment', async () => {
      const counselor = await userRepository.create({
        email: `counselor-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Jane',
        lastName: 'Counselor',
        userType: 'team_member'
      });
      testUserIds.push(counselor.id);

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

      const hasAccess = await service.verifyCounselorAccess(counselor.id, studentProfile.id);

      expect(hasAccess).toBe(false);
    });

    it('should throw ValidationServiceError for invalid counselor ID', async () => {
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

      await expect(service.verifyCounselorAccess('invalid-id', studentProfile.id)).rejects.toThrow(ValidationServiceError);
    });
  });
});
