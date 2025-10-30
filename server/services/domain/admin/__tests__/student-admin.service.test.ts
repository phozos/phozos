import { describe, it, expect, beforeEach } from 'vitest';
import { AdminStudentService } from '../student-admin.service';

describe('AdminStudentService', () => {
  let adminStudentService: AdminStudentService;

  beforeEach(() => {
    adminStudentService = new AdminStudentService();
  });

  describe('getAllStudents', () => {
    it('should return all students', async () => {
      const students = await adminStudentService.getAllStudents();
      expect(Array.isArray(students)).toBe(true);
    });
  });

  describe('getStudentsWithSubscriptions', () => {
    it('should return students with subscription data', async () => {
      const studentsWithSubs = await adminStudentService.getStudentsWithSubscriptions();
      expect(Array.isArray(studentsWithSubs)).toBe(true);
    });
  });

  describe('getStudentTimeline', () => {
    it('should return student timeline events', async () => {
      const studentId = 'test-student-id';
      const timeline = await adminStudentService.getStudentTimeline(studentId);
      expect(Array.isArray(timeline)).toBe(true);
    });
  });
});
