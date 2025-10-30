import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DocumentService } from '../document.service';
import { documentRepository } from '../../../repositories/document.repository';
import { userRepository } from '../../../repositories/user.repository';
import { studentRepository } from '../../../repositories/student.repository';
import { universityRepository } from '../../../repositories/university.repository';
import { applicationRepository } from '../../../repositories/application.repository';

describe('DocumentService', () => {
  let documentService: DocumentService;
  let testUserIds: string[] = [];
  let testStudentIds: string[] = [];
  let testDocumentIds: string[] = [];
  let testApplicationIds: string[] = [];
  let testUniversityIds: string[] = [];

  beforeEach(() => {
    documentService = new DocumentService();
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

    for (const appId of testApplicationIds) {
      try {
        await applicationRepository.delete(appId);
      } catch (error) {
        console.log('Application cleanup failed:', error);
      }
    }
    testApplicationIds = [];

    for (const uniId of testUniversityIds) {
      try {
        await universityRepository.delete(uniId);
      } catch (error) {
        console.log('University cleanup failed:', error);
      }
    }
    testUniversityIds = [];

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

  describe('getDocumentById', () => {
    it('should return document by id', async () => {
      const user = await userRepository.create({
        email: `doc-byid-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'customer',
        firstName: 'Document',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      const document = await documentRepository.create({
        userId: user.id,
        type: 'transcript',
        name: 'Transcript',
        fileName: 'Transcript.pdf',
        filePath: '/path/to/transcript',
        mimeType: 'application/pdf',
        fileSize: 1024
      });
      testDocumentIds.push(document.id);

      const result = await documentService.getDocumentById(document.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(document.id);
      expect(result.userId).toBe(user.id);
    });

    it('should throw error if document not found', async () => {
      await expect(
        documentService.getDocumentById('00000000-0000-0000-0000-000000000001')
      ).rejects.toThrow();
    });
  });

  describe('getDocumentsByUser', () => {
    it('should return all documents for user', async () => {
      const user = await userRepository.create({
        email: `doc-byuser-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'customer',
        firstName: 'Multi',
        lastName: 'Doc'
      });
      testUserIds.push(user.id);

      const doc1 = await documentRepository.create({
        userId: user.id,
        type: 'resume',
        name: 'Document 1',
        fileName: 'Document1.pdf',
        filePath: '/path/to/doc1',
        mimeType: 'application/pdf',
        fileSize: 1024
      });
      testDocumentIds.push(doc1.id);

      const doc2 = await documentRepository.create({
        userId: user.id,
        type: 'essay',
        name: 'Document 2',
        fileName: 'Document2.pdf',
        filePath: '/path/to/doc2',
        mimeType: 'application/pdf',
        fileSize: 2048
      });
      testDocumentIds.push(doc2.id);

      const result = await documentService.getDocumentsByUser(user.id);

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some(d => d.id === doc1.id)).toBe(true);
      expect(result.some(d => d.id === doc2.id)).toBe(true);
    });

    it('should return empty array when fetching documents for non-existent user', async () => {
      const result = await documentService.getDocumentsByUser('00000000-0000-0000-0000-000000000001');
      expect(result).toEqual([]);
    });
  });

  describe('getDocumentsByApplication', () => {
    it('should return documents for specific application', async () => {
      const user = await userRepository.create({
        email: `doc-byapp-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'customer',
        firstName: 'App',
        lastName: 'Doc'
      });
      testUserIds.push(user.id);

      const student = await studentRepository.create({
        userId: user.id
      });
      testStudentIds.push(student.id);

      const university = await universityRepository.create({
        name: `Doc Test University ${Date.now()}-${Math.random()}`,
        country: 'USA',
        city: 'Test City'
      });
      testUniversityIds.push(university.id);

      const application = await applicationRepository.create({
        userId: user.id,
        studentId: student.id,
        universityId: university.id,
        status: 'submitted'
      });
      testApplicationIds.push(application.id);

      const document = await documentRepository.create({
        userId: user.id,
        applicationId: application.id,
        type: 'other',
        name: 'Application Document',
        fileName: 'ApplicationDoc.pdf',
        filePath: '/path/to/app-doc',
        mimeType: 'application/pdf',
        fileSize: 1024
      });
      testDocumentIds.push(document.id);

      const result = await documentService.getDocumentsByApplication(application.id);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some(d => d.id === document.id)).toBe(true);
    });

    it('should return empty array when fetching documents for non-existent application', async () => {
      const result = await documentService.getDocumentsByApplication('00000000-0000-0000-0000-000000000001');
      expect(result).toEqual([]);
    });
  });

  describe('createDocument', () => {
    it('should create document successfully', async () => {
      const user = await userRepository.create({
        email: `doc-create-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'customer',
        firstName: 'Create',
        lastName: 'Doc'
      });
      testUserIds.push(user.id);

      const result = await documentService.createDocument({
        userId: user.id,
        type: 'transcript',
        name: 'Transcript',
        fileName: 'Transcript.pdf',
        filePath: '/path/to/transcript',
        mimeType: 'application/pdf',
        fileSize: 1024
      } as any);
      testDocumentIds.push(result.id);

      expect(result).toBeDefined();
      expect(result.fileName).toBe('Transcript.pdf');
      expect(result.userId).toBe(user.id);
    });

    it('should throw error if required fields are missing', async () => {
      await expect(
        documentService.createDocument({} as any)
      ).rejects.toThrow('Missing required fields');
    });
  });

  describe('deleteDocument', () => {
    it('should delete document successfully', async () => {
      const user = await userRepository.create({
        email: `doc-delete-${Date.now()}-${Math.random()}@test.com`,
        password: 'hashed',
        userType: 'customer',
        firstName: 'Delete',
        lastName: 'Doc'
      });
      testUserIds.push(user.id);

      const document = await documentRepository.create({
        userId: user.id,
        type: 'other',
        name: 'To Delete',
        fileName: 'ToDelete.pdf',
        filePath: '/path/to/delete',
        mimeType: 'application/pdf',
        fileSize: 1024
      });

      const result = await documentService.deleteDocument(document.id);

      expect(result).toBe(true);
      const deletedDoc = await documentRepository.findById(document.id);
      expect(deletedDoc).toBeUndefined();
    });

    it('should return false when deleting non-existent document', async () => {
      const result = await documentService.deleteDocument('00000000-0000-0000-0000-000000000001');
      expect(result).toBe(false);
    });
  });
});
