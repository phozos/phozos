import { describe, it, expect, afterEach } from 'vitest';
import { documentRepository } from '../document.repository';
import { userRepository } from '../user.repository';
import { studentRepository } from '../student.repository';
import { applicationRepository } from '../application.repository';
import { universityRepository } from '../university.repository';

describe('DocumentRepository', () => {
  let testDocumentId: string;
  let testUserId: string;
  let testStudentId: string;

  afterEach(async () => {
    if (testDocumentId) {
      try {
        await documentRepository.delete(testDocumentId);
      } catch (error) {
        console.log('Document cleanup failed:', error);
      }
    }
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

  describe('create', () => {
    it('should create a document', async () => {
      const user = await userRepository.create({
        email: `doc-test-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Doc',
        lastName: 'Test'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const document = await documentRepository.create({
        userId: user.id,
        type: 'other',
        name: 'Test Passport',
        fileName: 'test-passport.pdf',
        filePath: '/uploads/test-passport.pdf'
      });
      testDocumentId = document.id;

      expect(document.id).toBeDefined();
      expect(document.userId).toBe(user.id);
      expect(document.name).toBe('Test Passport');
      expect(document.fileName).toBe('test-passport.pdf');
    });
  });

  describe('findByUser', () => {
    it('should find documents by user ID', async () => {
      const user = await userRepository.create({
        email: `find-doc-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Find',
        lastName: 'Doc'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const document = await documentRepository.create({
        userId: user.id,
        type: 'transcript',
        name: 'Test Transcript',
        fileName: 'test-transcript.pdf',
        filePath: '/uploads/test-transcript.pdf'
      });
      testDocumentId = document.id;

      const documents = await documentRepository.findByUser(user.id);
      expect(documents.length).toBeGreaterThan(0);
      expect(documents.some(d => d.id === document.id)).toBe(true);
    });
  });

  describe('update', () => {
    it('should update document fields', async () => {
      const user = await userRepository.create({
        email: `update-doc-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Update',
        lastName: 'Doc'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const document = await documentRepository.create({
        userId: user.id,
        type: 'other',
        name: 'Old Document',
        fileName: 'old-name.pdf',
        filePath: '/uploads/old-name.pdf'
      });
      testDocumentId = document.id;

      const updated = await documentRepository.update(document.id, {
        name: 'New Document',
        type: 'transcript'
      });

      expect(updated?.name).toBe('New Document');
      expect(updated?.type).toBe('transcript');
    });
  });

  describe('delete', () => {
    it('should delete a document', async () => {
      const user = await userRepository.create({
        email: `delete-doc-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Delete',
        lastName: 'Doc'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const document = await documentRepository.create({
        userId: user.id,
        type: 'other',
        name: 'Delete Document',
        fileName: 'delete-me.pdf',
        filePath: '/uploads/delete-me.pdf'
      });

      const deleted = await documentRepository.delete(document.id);
      expect(deleted).toBe(true);

      const found = await documentRepository.findById(document.id);
      expect(found).toBeUndefined();
      testDocumentId = '';
    });
  });

  describe('findById', () => {
    it('should find document by ID', async () => {
      const user = await userRepository.create({
        email: `findbyid-doc-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'FindById',
        lastName: 'Doc'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const document = await documentRepository.create({
        userId: user.id,
        type: 'essay',
        name: 'Essay Document',
        fileName: 'essay.pdf',
        filePath: '/uploads/essay.pdf'
      });
      testDocumentId = document.id;

      const found = await documentRepository.findById(document.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(document.id);
      expect(found?.type).toBe('essay');
    });
  });

  describe('findAll', () => {
    it('should find all documents with filters', async () => {
      const user = await userRepository.create({
        email: `findall-doc-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'FindAll',
        lastName: 'Doc'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const document = await documentRepository.create({
        userId: user.id,
        type: 'test_score',
        name: 'Test Score',
        fileName: 'scores.pdf',
        filePath: '/uploads/scores.pdf'
      });
      testDocumentId = document.id;

      const documents = await documentRepository.findAll({ type: 'test_score' });
      expect(documents.length).toBeGreaterThan(0);
      expect(documents.some(d => d.id === document.id)).toBe(true);
    });
  });

  describe('findByApplication', () => {
    it('should find documents by application ID', async () => {
      const user = await userRepository.create({
        email: `app-doc-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'App',
        lastName: 'Doc'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const university = await universityRepository.create({
        name: `Test Uni ${Date.now()}`,
        country: 'United Kingdom',
        city: 'London',
        ranking: 100
      });

      const application = await applicationRepository.create({
        userId: user.id,
        studentId: student.id,
        universityId: university.id,
        status: 'draft'
      });

      const document = await documentRepository.create({
        userId: user.id,
        applicationId: application.id,
        type: 'recommendation',
        name: 'Recommendation Letter',
        fileName: 'recommendation.pdf',
        filePath: '/uploads/recommendation.pdf'
      });
      testDocumentId = document.id;

      const documents = await documentRepository.findByApplication(application.id);
      expect(documents.length).toBeGreaterThan(0);
      expect(documents.some(d => d.id === document.id)).toBe(true);

      await documentRepository.delete(document.id);
      await applicationRepository.delete(application.id);
      await universityRepository.delete(university.id);
      await studentRepository.delete(student.id);
      await userRepository.delete(user.id);
      
      testDocumentId = '';
      testStudentId = '';
      testUserId = '';
    });
  });

  describe('countByUser', () => {
    it('should count documents for a user', async () => {
      const user = await userRepository.create({
        email: `count-doc-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Count',
        lastName: 'Doc'
      });
      testUserId = user.id;

      const student = await studentRepository.create({
        userId: user.id,
        status: 'inquiry'
      });
      testStudentId = student.id;

      const document = await documentRepository.create({
        userId: user.id,
        type: 'essay',
        name: 'Personal Statement',
        fileName: 'statement.pdf',
        filePath: '/uploads/statement.pdf'
      });
      testDocumentId = document.id;

      const count = await documentRepository.countByUser(user.id);
      expect(count).toBeGreaterThan(0);
    });
  });
});
