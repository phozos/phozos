import { describe, it, expect } from 'vitest';
import { userRepository } from '../user.repository';
import { studentRepository } from '../student.repository';
import { applicationRepository } from '../application.repository';
import { forumPostRepository } from '../forum-post.repository';
import { 
  RepositoryError, 
  NotFoundError, 
  DuplicateError, 
  ForeignKeyError,
  DatabaseError
} from '../errors';

describe('Repository Error Handling', () => {
  describe('NotFoundError', () => {
    it('should throw NotFoundError when finding non-existent user by id', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      await expect(
        userRepository.findById(nonExistentId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when updating non-existent user', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      await expect(
        userRepository.update(nonExistentId, { firstName: 'Updated' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when updating non-existent application', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      await expect(
        applicationRepository.update(nonExistentId, { status: 'accepted' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when assigning counselor to non-existent student', async () => {
      const nonExistentStudentId = '00000000-0000-0000-0000-000000000000';
      const nonExistentCounselorId = '00000000-0000-0000-0000-000000000001';
      
      await expect(
        studentRepository.assignCounselor(nonExistentStudentId, nonExistentCounselorId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when unassigning non-existent student', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      await expect(
        studentRepository.unassign(nonExistentId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when incrementing report count for non-existent post', async () => {
      const nonExistentPostId = '00000000-0000-0000-0000-000000000000';
      
      await expect(
        forumPostRepository.incrementReportCount(nonExistentPostId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should include correct entity and id in NotFoundError context', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      try {
        await userRepository.findById(nonExistentId);
        expect.fail('Should have thrown NotFoundError');
      } catch (error) {
        if (error instanceof NotFoundError) {
          expect(error.context).toBeDefined();
          expect(error.context?.identifier).toBe(nonExistentId);
          expect(error.message).toContain('not found');
        } else {
          throw error;
        }
      }
    });

    it('should return undefined for optional find methods', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      const result = await userRepository.findByIdOptional(nonExistentId);
      expect(result).toBeUndefined();
    });

    it('should return undefined for findByEmail when user does not exist', async () => {
      const result = await userRepository.findByEmail('nonexistent@example.com');
      expect(result).toBeUndefined();
    });
  });

  describe('DuplicateError', () => {
    it('should throw DuplicateError when creating user with existing email', async () => {
      const uniqueEmail = `test-duplicate-${Date.now()}@example.com`;
      
      await userRepository.create({
        email: uniqueEmail,
        password: 'password123',
        userType: 'customer',
        firstName: 'Test',
        lastName: 'User'
      });

      await expect(
        userRepository.create({
          email: uniqueEmail,
          password: 'password456',
          userType: 'customer',
          firstName: 'Test2',
          lastName: 'User2'
        })
      ).rejects.toThrow(DuplicateError);
    });
  });

  describe('Error Context', () => {
    it('should include error context in DuplicateError', async () => {
      const uniqueEmail = `test-context-${Date.now()}@example.com`;
      
      await userRepository.create({
        email: uniqueEmail,
        password: 'password123',
        userType: 'customer',
        firstName: 'Test',
        lastName: 'User'
      });

      try {
        await userRepository.create({
          email: uniqueEmail,
          password: 'password456',
          userType: 'customer',
          firstName: 'Test2',
          lastName: 'User2'
        });
        expect.fail('Should have thrown DuplicateError');
      } catch (error) {
        if (error instanceof DuplicateError) {
          expect(error.context).toBeDefined();
          expect(error.message).toContain('already exists');
        } else {
          throw error;
        }
      }
    });
  });

  describe('Error Inheritance', () => {
    it('should properly inherit from RepositoryError', () => {
      const error = new DuplicateError('User', 'email', 'test@example.com');
      expect(error).toBeInstanceOf(RepositoryError);
      expect(error).toBeInstanceOf(DuplicateError);
      expect(error.name).toBe('DuplicateError');
    });

    it('should properly inherit from Error', () => {
      const error = new DatabaseError('test operation');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(RepositoryError);
      expect(error.name).toBe('DatabaseError');
    });
  });

  describe('Error Messages', () => {
    it('should have clear error messages', () => {
      const duplicateError = new DuplicateError('User', 'email', 'test@example.com');
      expect(duplicateError.message).toContain('User');
      expect(duplicateError.message).toContain('email');
      expect(duplicateError.message).toContain('test@example.com');
      expect(duplicateError.message).toContain('already exists');
    });

    it('should include operation context in database errors', () => {
      const dbError = new DatabaseError('findByEmail');
      expect(dbError.message).toContain('findByEmail');
      expect(dbError.context).toEqual({ operation: 'findByEmail' });
    });
  });

  describe('ForeignKeyError', () => {
    it('should throw ForeignKeyError when referencing non-existent foreign key', async () => {
      const nonExistentUserId = '00000000-0000-0000-0000-000000000000';
      
      await expect(
        studentRepository.create({
          userId: nonExistentUserId,
          status: 'inquiry'
        })
      ).rejects.toThrow();
    });
  });
});

describe('Repository Error Propagation', () => {
  it('should propagate errors from base methods', async () => {
    await expect(
      userRepository.update('non-existent-id', { firstName: 'Test' })
    ).rejects.toThrow(DatabaseError);
  });

  it('should handle errors in custom repository methods', async () => {
    const result = await userRepository.findByEmail('nonexistent@example.com');
    expect(result).toBeUndefined();
  });
});
