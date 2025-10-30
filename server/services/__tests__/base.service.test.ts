import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BaseService } from '../base.service';
import { userRepository } from '../../repositories/user.repository';
import { studentRepository } from '../../repositories/student.repository';

// Create a concrete implementation for testing
class TestService extends BaseService {
  public testHandleError(error: any, context: string) {
    return this.handleError(error, context);
  }

  public testValidateRequired(data: any, fields: string[]) {
    return this.validateRequired(data, fields);
  }

  public testSanitizeUser(user: any) {
    return this.sanitizeUser(user);
  }

  // Real service method that uses BaseService utilities
  public async createUserWithValidation(userData: any) {
    try {
      this.validateRequired(userData, ['email', 'firstName', 'lastName', 'userType']);
      
      const user = await userRepository.create(userData);
      return this.sanitizeUser(user);
    } catch (error) {
      this.handleError(error, 'createUserWithValidation');
    }
  }

  // Real service method that handles database errors
  public async createDuplicateUser(email: string) {
    try {
      const user = await userRepository.create({
        email,
        firstName: 'Test',
        lastName: 'User',
        userType: 'customer',
        password: 'test123'
      });
      return user;
    } catch (error) {
      this.handleError(error, 'createDuplicateUser');
    }
  }

  // Real service method that tests sanitization
  public async getUserSanitized(userId: string) {
    try {
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }
      return this.sanitizeUser(user);
    } catch (error) {
      this.handleError(error, 'getUserSanitized');
    }
  }
}

describe('BaseService', () => {
  let service: TestService;
  let testUserIds: string[] = [];
  let testStudentIds: string[] = [];

  beforeEach(() => {
    service = new TestService();
  });

  afterEach(async () => {
    // Clean up students first
    for (const studentId of testStudentIds) {
      try {
        await studentRepository.delete(studentId);
      } catch (error) {
        console.log('Student cleanup failed:', error);
      }
    }
    testStudentIds = [];

    // Clean up users
    for (const userId of testUserIds) {
      try {
        await userRepository.delete(userId);
      } catch (error) {
        console.log('User cleanup failed:', error);
      }
    }
    testUserIds = [];
  });

  describe('handleError with real database', () => {
    it('should handle DUPLICATE_ENTRY error from real database', async () => {
      const email = `duplicate-${Date.now()}@example.com`;
      
      // Create first user
      const user1 = await userRepository.create({
        email,
        firstName: 'First',
        lastName: 'User',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user1.id);

      // Try to create duplicate - should throw DuplicateResourceError
      await expect(
        service.createDuplicateUser(email)
      ).rejects.toThrow('already exists');
    });

    it('should handle generic database errors', async () => {
      const invalidData = {
        email: null, // This should cause a NOT_NULL_VIOLATION
        firstName: 'Test',
        lastName: 'User',
        userType: 'customer'
      };

      await expect(
        service.createUserWithValidation(invalidData)
      ).rejects.toThrow();
    });

    it('should propagate NOT_FOUND errors', async () => {
      await expect(
        service.getUserSanitized('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('not found');
    });
  });

  describe('validateRequired with real data', () => {
    it('should validate required fields before creating user', async () => {
      const validData = {
        email: `valid-${Date.now()}@example.com`,
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer',
        password: 'test123'
      };

      const result = await service.createUserWithValidation(validData);
      testUserIds.push(result.id);

      expect(result).toBeDefined();
      expect(result.email).toBe(validData.email);
      expect(result.firstName).toBe(validData.firstName);
    });

    it('should throw error when required fields are missing', async () => {
      const invalidData = {
        email: `missing-${Date.now()}@example.com`,
        // Missing firstName, lastName, userType
      };

      await expect(
        service.createUserWithValidation(invalidData)
      ).rejects.toThrow('Validation failed');
    });

    it('should throw error when email is missing', async () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer'
        // Missing email
      };

      await expect(
        service.createUserWithValidation(invalidData)
      ).rejects.toThrow('Validation failed');
    });

    it('should throw error for empty string fields', async () => {
      const invalidData = {
        email: '',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer'
      };

      await expect(
        service.createUserWithValidation(invalidData)
      ).rejects.toThrow('Validation failed');
    });

    it('should throw error for null fields', async () => {
      const invalidData = {
        email: `test-${Date.now()}@example.com`,
        firstName: null,
        lastName: 'Doe',
        userType: 'customer'
      };

      await expect(
        service.createUserWithValidation(invalidData)
      ).rejects.toThrow('Validation failed');
    });

    it('should throw error for undefined fields', async () => {
      const invalidData = {
        email: `test-${Date.now()}@example.com`,
        firstName: 'John',
        lastName: undefined,
        userType: 'customer'
      };

      await expect(
        service.createUserWithValidation(invalidData)
      ).rejects.toThrow('Validation failed');
    });

    it('should throw error for multiple missing fields', async () => {
      const invalidData = {
        email: `test-${Date.now()}@example.com`
        // Missing firstName, lastName, userType
      };

      await expect(
        service.createUserWithValidation(invalidData)
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('sanitizeUser with real user data', () => {
    it('should remove password from real user object', async () => {
      const user = await userRepository.create({
        email: `sanitize-${Date.now()}@example.com`,
        password: 'hashed-password-123',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const sanitized = await service.getUserSanitized(user.id);

      expect(sanitized).toBeDefined();
      expect(sanitized.id).toBe(user.id);
      expect(sanitized.email).toBe(user.email);
      expect(sanitized.password).toBeUndefined();
      expect(sanitized.firstName).toBe('John');
      expect(sanitized.lastName).toBe('Doe');
    });

    it('should remove temporaryPassword from real user object', async () => {
      const user = await userRepository.create({
        email: `temppass-${Date.now()}@example.com`,
        password: 'hashed-password',
        temporaryPassword: 'temp-pass-123',
        firstName: 'Jane',
        lastName: 'Smith',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const sanitized = await service.getUserSanitized(user.id);

      expect(sanitized).toBeDefined();
      expect(sanitized.temporaryPassword).toBeUndefined();
      expect(sanitized.password).toBeUndefined();
      expect(sanitized.email).toBe(user.email);
    });

    it('should preserve all other user properties', async () => {
      const user = await userRepository.create({
        email: `preserve-${Date.now()}@example.com`,
        password: 'hashed-password',
        temporaryPassword: 'temp-pass',
        firstName: 'Alice',
        lastName: 'Johnson',
        userType: 'team_member',
        accountStatus: 'active',
        profilePicture: 'https://example.com/pic.jpg'
      });
      testUserIds.push(user.id);

      const sanitized = await service.getUserSanitized(user.id);

      expect(sanitized.id).toBe(user.id);
      expect(sanitized.email).toBe(user.email);
      expect(sanitized.firstName).toBe('Alice');
      expect(sanitized.lastName).toBe('Johnson');
      expect(sanitized.userType).toBe('team_member');
      expect(sanitized.accountStatus).toBe('active');
      expect(sanitized.profilePicture).toBe('https://example.com/pic.jpg');
      expect(sanitized.createdAt).toBeDefined();
      expect(sanitized.updatedAt).toBeDefined();
      expect(sanitized.password).toBeUndefined();
      expect(sanitized.temporaryPassword).toBeUndefined();
    });

    it('should sanitize user with student profile', async () => {
      const user = await userRepository.create({
        email: `student-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'Student',
        lastName: 'User',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const student = await studentRepository.create({
        userId: user.id,
        dateOfBirth: new Date('2000-01-01'),
        academicLevel: 'undergraduate',
        gpa: 3.5,
        desiredMajor: 'Computer Science'
      });
      testStudentIds.push(student.id);

      const sanitized = await service.getUserSanitized(user.id);

      expect(sanitized.password).toBeUndefined();
      expect(sanitized.id).toBe(user.id);
      expect(sanitized.email).toBe(user.email);
    });

    it('should handle users with minimal data', async () => {
      const user = await userRepository.create({
        email: `minimal-${Date.now()}@example.com`,
        firstName: 'Min',
        lastName: 'User',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      const sanitized = await service.getUserSanitized(user.id);

      expect(sanitized.password).toBeUndefined();
      expect(sanitized.id).toBe(user.id);
      expect(sanitized.email).toBe(user.email);
      expect(sanitized.firstName).toBe('Min');
      expect(sanitized.lastName).toBe('User');
    });
  });

  describe('integrated workflow tests', () => {
    it('should validate, create, and sanitize user in complete flow', async () => {
      const userData = {
        email: `workflow-${Date.now()}@example.com`,
        firstName: 'Complete',
        lastName: 'Flow',
        userType: 'team_member',
        password: 'secure-password-123'
      };

      const result = await service.createUserWithValidation(userData);
      testUserIds.push(result.id);

      // Verify validation passed
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();

      // Verify sanitization worked
      expect(result.password).toBeUndefined();

      // Verify data integrity
      expect(result.email).toBe(userData.email);
      expect(result.firstName).toBe(userData.firstName);
      expect(result.lastName).toBe(userData.lastName);
      expect(result.userType).toBe(userData.userType);
    });

    it('should handle validation failure before database interaction', async () => {
      const invalidData = {
        email: `invalid-${Date.now()}@example.com`,
        firstName: 'Test'
        // Missing required fields
      };

      await expect(
        service.createUserWithValidation(invalidData)
      ).rejects.toThrow('Validation failed');

      // Verify no user was created
      const users = await userRepository.findAll();
      const createdUser = users.find(u => u.email === invalidData.email);
      expect(createdUser).toBeUndefined();
    });

    it('should handle database error and provide meaningful message', async () => {
      const email = `error-handling-${Date.now()}@example.com`;

      // Create first user
      const user1 = await userRepository.create({
        email,
        firstName: 'First',
        lastName: 'User',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user1.id);

      // Attempt to create duplicate should trigger DuplicateResourceError
      await expect(
        service.createDuplicateUser(email)
      ).rejects.toThrow('already exists');
    });
  });

  describe('edge cases with real data', () => {
    it('should handle special characters in user data', async () => {
      const userData = {
        email: `special-${Date.now()}@example.com`,
        firstName: "O'Brien",
        lastName: 'Smith-Jones',
        userType: 'customer',
        password: 'p@ssw0rd!#$'
      };

      const result = await service.createUserWithValidation(userData);
      testUserIds.push(result.id);

      expect(result.firstName).toBe("O'Brien");
      expect(result.lastName).toBe('Smith-Jones');
      expect(result.password).toBeUndefined();
    });

    it('should handle long email addresses', async () => {
      const longEmail = `very-long-email-address-for-testing-purposes-${Date.now()}@example-domain.com`;
      const userData = {
        email: longEmail,
        firstName: 'Long',
        lastName: 'Email',
        userType: 'customer',
        password: 'test123'
      };

      const result = await service.createUserWithValidation(userData);
      testUserIds.push(result.id);

      expect(result.email).toBe(longEmail);
    });

    it('should handle Unicode characters in names', async () => {
      const userData = {
        email: `unicode-${Date.now()}@example.com`,
        firstName: 'José',
        lastName: 'Müller',
        userType: 'customer',
        password: 'test123'
      };

      const result = await service.createUserWithValidation(userData);
      testUserIds.push(result.id);

      expect(result.firstName).toBe('José');
      expect(result.lastName).toBe('Müller');
    });
  });
});
