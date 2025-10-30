import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CounselorAssignmentService } from '../counselor-assignment.service';
import { CounselorDashboardService } from '../counselor-dashboard.service';
import { studentRepository } from '../../../repositories/student.repository';
import { userRepository } from '../../../repositories/user.repository';
import { documentRepository } from '../../../repositories/document.repository';

describe('CounselorAssignmentService', () => {
  let counselorAssignmentService: CounselorAssignmentService;
  let testUserIds: string[] = [];
  let testStudentIds: string[] = [];
  let testDocumentIds: string[] = [];

  beforeEach(() => {
    counselorAssignmentService = new CounselorAssignmentService();
  });

  afterEach(async () => {
    for (const docId of testDocumentIds) {
      try {
        await documentRepository.delete(docId);
      } catch (error) {
        console.log('Document cleanup failed:', error);
      }
    }
    testDocumentIds = [];

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
    it('should return students assigned to counselor', async () => {
      const counselorUser = await userRepository.create({
        email: `counselor-assigned-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'team_member',
        firstName: 'Assigned',
        lastName: 'Counselor'
      });
      testUserIds.push(counselorUser.id);

      const studentUser = await userRepository.create({
        email: `student-assigned-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'customer',
        firstName: 'John',
        lastName: 'Doe'
      });
      testUserIds.push(studentUser.id);

      const student = await studentRepository.create({
        userId: studentUser.id,
        assignedCounselorId: counselorUser.id
      });
      testStudentIds.push(student.id);

      const result = await counselorAssignmentService.getAssignedStudents(counselorUser.id);

      expect(result.length).toBeGreaterThanOrEqual(1);
      const foundStudent = result.find(s => s.id === student.id);
      expect(foundStudent).toBeDefined();
      expect(foundStudent?.userId).toBe(studentUser.id);
    });

    it('should throw error when fetching students with invalid counselor ID', async () => {
      await expect(
        counselorAssignmentService.getAssignedStudents('00000000-0000-0000-0000-000000000001')
      ).rejects.toThrow();
    });
  });

  describe('assignStudent', () => {
    it('should assign student to counselor successfully', async () => {
      const counselorUser = await userRepository.create({
        email: `counselor-assign-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'team_member',
        firstName: 'Assigning',
        lastName: 'Counselor'
      });
      testUserIds.push(counselorUser.id);

      const studentUser = await userRepository.create({
        email: `student-assign-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'customer',
        firstName: 'Test',
        lastName: 'Student'
      });
      testUserIds.push(studentUser.id);

      const student = await studentRepository.create({
        userId: studentUser.id
      });
      testStudentIds.push(student.id);

      await counselorAssignmentService.assignStudent(student.id, counselorUser.id);

      const updatedStudent = await studentRepository.findById(student.id);
      expect(updatedStudent?.assignedCounselorId).toBe(counselorUser.id);
    });

    it('should throw error if counselor is invalid', async () => {
      const customerUser = await userRepository.create({
        email: `customer-invalid-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'customer',
        firstName: 'Not',
        lastName: 'Counselor'
      });
      testUserIds.push(customerUser.id);

      const studentUser = await userRepository.create({
        email: `student-invalid-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'customer',
        firstName: 'Test',
        lastName: 'Student'
      });
      testUserIds.push(studentUser.id);

      const student = await studentRepository.create({
        userId: studentUser.id
      });
      testStudentIds.push(student.id);

      await expect(
        counselorAssignmentService.assignStudent(student.id, customerUser.id)
      ).rejects.toThrow('INVALID_COUNSELOR');
    });

    it('should throw error if counselor not found', async () => {
      const studentUser = await userRepository.create({
        email: `student-nocounselor-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'customer',
        firstName: 'Test',
        lastName: 'Student'
      });
      testUserIds.push(studentUser.id);

      const student = await studentRepository.create({
        userId: studentUser.id
      });
      testStudentIds.push(student.id);

      await expect(
        counselorAssignmentService.assignStudent(student.id, '00000000-0000-0000-0000-000000000001')
      ).rejects.toThrow('INVALID_COUNSELOR');
    });

    it('should throw error if student not found', async () => {
      const counselorUser = await userRepository.create({
        email: `counselor-nostudent-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'team_member',
        firstName: 'Test',
        lastName: 'Counselor'
      });
      testUserIds.push(counselorUser.id);

      await expect(
        counselorAssignmentService.assignStudent('00000000-0000-0000-0000-000000000001', counselorUser.id)
      ).rejects.toThrow();
    });
  });

  describe('unassignStudent', () => {
    it('should unassign student successfully', async () => {
      const counselorUser = await userRepository.create({
        email: `counselor-unassign-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'team_member',
        firstName: 'Unassigning',
        lastName: 'Counselor'
      });
      testUserIds.push(counselorUser.id);

      const studentUser = await userRepository.create({
        email: `student-unassign-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'customer',
        firstName: 'Test',
        lastName: 'Student'
      });
      testUserIds.push(studentUser.id);

      const student = await studentRepository.create({
        userId: studentUser.id,
        assignedCounselorId: counselorUser.id
      });
      testStudentIds.push(student.id);

      await counselorAssignmentService.unassignStudent(student.id);

      const updatedStudent = await studentRepository.findById(student.id);
      expect(updatedStudent?.assignedCounselorId).toBeNull();
    });

    it('should throw error when unassigning with invalid student ID', async () => {
      await expect(
        counselorAssignmentService.unassignStudent('00000000-0000-0000-0000-000000000001')
      ).rejects.toThrow();
    });
  });

  describe('verifyCounselorAccess', () => {
    it('should return true if counselor has access to student', async () => {
      const counselorUser = await userRepository.create({
        email: `counselor-access-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'team_member',
        firstName: 'Access',
        lastName: 'Counselor'
      });
      testUserIds.push(counselorUser.id);

      const studentUser = await userRepository.create({
        email: `student-access-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'customer',
        firstName: 'Test',
        lastName: 'Student'
      });
      testUserIds.push(studentUser.id);

      const student = await studentRepository.create({
        userId: studentUser.id,
        assignedCounselorId: counselorUser.id
      });
      testStudentIds.push(student.id);

      const result = await counselorAssignmentService.verifyCounselorAccess(counselorUser.id, student.id);

      expect(result).toBe(true);
    });

    it('should return false if counselor does not have access', async () => {
      const counselorUser = await userRepository.create({
        email: `counselor-noaccess-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'team_member',
        firstName: 'NoAccess',
        lastName: 'Counselor'
      });
      testUserIds.push(counselorUser.id);

      const studentUser = await userRepository.create({
        email: `student-noaccess-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'customer',
        firstName: 'Test',
        lastName: 'Student'
      });
      testUserIds.push(studentUser.id);

      const student = await studentRepository.create({
        userId: studentUser.id
      });
      testStudentIds.push(student.id);

      const result = await counselorAssignmentService.verifyCounselorAccess(counselorUser.id, student.id);

      expect(result).toBe(false);
    });

    it('should throw error when verifying access with invalid IDs', async () => {
      await expect(
        counselorAssignmentService.verifyCounselorAccess('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002')
      ).rejects.toThrow();
    });
  });
});

// CounselorDashboardService Tests
describe('CounselorDashboardService', () => {
  let counselorDashboardService: CounselorDashboardService;
  let testUserIds: string[] = [];
  let testStudentIds: string[] = [];
  let testDocumentIds: string[] = [];

  beforeEach(() => {
    counselorDashboardService = new CounselorDashboardService();
  });

  afterEach(async () => {
    for (const docId of testDocumentIds) {
      try {
        await documentRepository.delete(docId);
      } catch (error) {
        console.log('Document cleanup failed:', error);
      }
    }
    testDocumentIds = [];

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

  describe('getStudentDocuments', () => {
    it('should return documents for a student', async () => {
      const studentUser = await userRepository.create({
        email: `student-docs-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'customer',
        firstName: 'Document',
        lastName: 'Student'
      });
      testUserIds.push(studentUser.id);

      const student = await studentRepository.create({
        userId: studentUser.id
      });
      testStudentIds.push(student.id);

      const doc1 = await documentRepository.create({
        userId: studentUser.id,
        type: 'transcript',
        name: 'Transcript',
        fileName: 'transcript.pdf',
        filePath: '/path/to/transcript.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024
      });
      testDocumentIds.push(doc1.id);

      const doc2 = await documentRepository.create({
        userId: studentUser.id,
        type: 'resume',
        name: 'Resume',
        fileName: 'resume.pdf',
        filePath: '/path/to/resume.pdf',
        mimeType: 'application/pdf',
        fileSize: 2048
      });
      testDocumentIds.push(doc2.id);

      const result = await counselorDashboardService.getStudentDocuments(student.id);

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some(d => d.id === doc1.id)).toBe(true);
      expect(result.some(d => d.id === doc2.id)).toBe(true);
    });

    it('should throw error if student not found', async () => {
      await expect(
        counselorDashboardService.getStudentDocuments('00000000-0000-0000-0000-000000000001')
      ).rejects.toThrow();
    });
  });

  describe('getCounselors', () => {
    it('should return all counselors', async () => {
      const counselor1 = await userRepository.create({
        email: `counselor1-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'team_member',
        firstName: 'Jane',
        lastName: 'Smith'
      });
      testUserIds.push(counselor1.id);

      const counselor2 = await userRepository.create({
        email: `counselor2-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'team_member',
        firstName: 'Bob',
        lastName: 'Jones'
      });
      testUserIds.push(counselor2.id);

      const result = await counselorDashboardService.getCounselors();

      expect(result.length).toBeGreaterThanOrEqual(2);
      const found1 = result.find(c => c.id === counselor1.id);
      const found2 = result.find(c => c.id === counselor2.id);
      expect(found1?.password).toBeUndefined();
      expect(found2?.password).toBeUndefined();
    });

    it('should handle errors when fetching counselors', async () => {
      const result = await counselorDashboardService.getCounselors();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
