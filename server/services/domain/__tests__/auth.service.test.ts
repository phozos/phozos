import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthService } from '../auth.service';
import { userRepository } from '../../../repositories/user.repository';
import { studentRepository } from '../../../repositories/student.repository';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let authService: AuthService;
  let testUserIds: string[] = [];
  let testStudentIds: string[] = [];

  beforeEach(() => {
    authService = new AuthService();
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

  // registerStudent tests moved to registration.service.test.ts (Phase 5.1 refactoring)

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const email = `login-${Date.now()}@example.com`;
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await userRepository.create({
        email,
        password: hashedPassword,
        accountStatus: 'active',
        userType: 'customer',
        firstName: 'John',
        lastName: 'Doe'
      });
      testUserIds.push(user.id);

      const result = await authService.login(email, password);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(email);
      expect(result.user.password).toBeUndefined();
      
      const updatedUser = await userRepository.findById(user.id);
      expect(updatedUser?.failedLoginAttempts).toBe(0);
      expect(updatedUser?.lastLoginAt).toBeDefined();
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        authService.login('nonexistent@example.com', 'password123')
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('should throw error for inactive user', async () => {
      const email = `inactive-${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash('password123', 10);

      const user = await userRepository.create({
        email,
        password: hashedPassword,
        accountStatus: 'inactive',
        userType: 'customer',
        firstName: 'Inactive',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      await expect(
        authService.login(email, 'password123')
      ).rejects.toThrow('ACCOUNT_SUSPENDED');
    });

    it('should throw error for pending account', async () => {
      const email = `pending-${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash('password123', 10);

      const user = await userRepository.create({
        email,
        password: hashedPassword,
        accountStatus: 'pending_approval',
        userType: 'customer',
        firstName: 'Pending',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      await expect(
        authService.login(email, 'password123')
      ).rejects.toThrow('ACCOUNT_PENDING_APPROVAL');
    });

    it('should throw error for invalid password', async () => {
      const email = `wrongpass-${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash('password123', 10);

      const user = await userRepository.create({
        email,
        password: hashedPassword,
        accountStatus: 'active',
        userType: 'customer',
        firstName: 'Test',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      await expect(
        authService.login(email, 'wrong-password')
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });
  });

  describe('validatePassword', () => {
    it('should return true for valid password', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const user = await userRepository.create({
        email: `validate-${Date.now()}@example.com`,
        password: hashedPassword,
        userType: 'customer',
        firstName: 'Test',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      const result = await authService.validatePassword(user.id, 'password123');

      expect(result).toBe(true);
    });

    it('should return false for invalid password', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      const user = await userRepository.create({
        email: `validate-wrong-${Date.now()}@example.com`,
        password: hashedPassword,
        userType: 'customer',
        firstName: 'Test',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      const result = await authService.validatePassword(user.id, 'wrong-password');

      expect(result).toBe(false);
    });

    it('should return false if user not found', async () => {
      const result = await authService.validatePassword('00000000-0000-0000-0000-000000000001', 'password123');

      expect(result).toBe(false);
    });

    it('should return false if user has no password', async () => {
      const user = await userRepository.create({
        email: `nopass-${Date.now()}@example.com`,
        password: null,
        userType: 'customer',
        firstName: 'No',
        lastName: 'Pass'
      });
      testUserIds.push(user.id);

      const result = await authService.validatePassword(user.id, 'password123');

      expect(result).toBe(false);
    });

    it('should handle errors during validation', async () => {
      await expect(
        authService.validatePassword('invalid-id-format', 'password123')
      ).rejects.toThrow();
    });
  });

  // registerStudent tests moved to registration.service.test.ts (Phase 5.1 refactoring)

  describe('login - additional cases', () => {
    it('should throw error when userType does not match', async () => {
      const email = `type-mismatch-${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash('password123', 10);

      const user = await userRepository.create({
        email,
        password: hashedPassword,
        userType: 'customer',
        accountStatus: 'active',
        firstName: 'Test',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      await expect(
        authService.login(email, 'password123', 'team_member')
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('should throw error when user has no password', async () => {
      const email = `nopass-login-${Date.now()}@example.com`;

      const user = await userRepository.create({
        email,
        password: null,
        userType: 'customer',
        accountStatus: 'active',
        firstName: 'No',
        lastName: 'Pass'
      });
      testUserIds.push(user.id);

      await expect(
        authService.login(email, 'password123')
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('should successfully login when userType matches', async () => {
      const email = `team-${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash('password123', 10);

      const user = await userRepository.create({
        email,
        password: hashedPassword,
        userType: 'team_member',
        accountStatus: 'active',
        firstName: 'Team',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      const result = await authService.login(email, 'password123', 'team_member');

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(email);
    });
  });

  describe('loginWithType', () => {
    it('should successfully login with allowed user type', async () => {
      const email = `team-login-${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash('password123', 10);

      const user = await userRepository.create({
        email,
        password: hashedPassword,
        userType: 'team_member',
        accountStatus: 'active',
        firstName: 'Jane',
        lastName: 'Doe'
      });
      testUserIds.push(user.id);

      const result = await authService.loginWithType(email, 'password123', ['team_member', 'company_profile']);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(email);
      expect(result.user.password).toBeUndefined();
      
      const updatedUser = await userRepository.findById(user.id);
      expect(updatedUser?.failedLoginAttempts).toBe(0);
    });

    it('should throw error when user type is not in allowed types', async () => {
      const email = `customer-not-allowed-${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash('password123', 10);

      const user = await userRepository.create({
        email,
        password: hashedPassword,
        userType: 'customer',
        accountStatus: 'active',
        firstName: 'Customer',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      await expect(
        authService.loginWithType(email, 'password123', ['team_member', 'company_profile'])
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('should throw error when user not found', async () => {
      await expect(
        authService.loginWithType('nonexistent@example.com', 'password123', ['team_member'])
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('should throw error for inactive user', async () => {
      const email = `inactive-type-${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash('password123', 10);

      const user = await userRepository.create({
        email,
        password: hashedPassword,
        userType: 'team_member',
        accountStatus: 'inactive',
        firstName: 'Inactive',
        lastName: 'Team'
      });
      testUserIds.push(user.id);

      await expect(
        authService.loginWithType(email, 'password123', ['team_member'])
      ).rejects.toThrow('ACCOUNT_SUSPENDED');
    });

    it('should throw error when user has no password', async () => {
      const email = `nopass-type-${Date.now()}@example.com`;

      const user = await userRepository.create({
        email,
        password: null,
        userType: 'team_member',
        accountStatus: 'active',
        firstName: 'No',
        lastName: 'Pass'
      });
      testUserIds.push(user.id);

      await expect(
        authService.loginWithType(email, 'password123', ['team_member'])
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });

    it('should throw error for invalid password', async () => {
      const email = `wrongpass-type-${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash('password123', 10);

      const user = await userRepository.create({
        email,
        password: hashedPassword,
        userType: 'team_member',
        accountStatus: 'active',
        firstName: 'Team',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      await expect(
        authService.loginWithType(email, 'wrong-password', ['team_member'])
      ).rejects.toThrow('INVALID_CREDENTIALS');
    });
  });

  describe('getUserByEmail', () => {
    it('should return sanitized user when found', async () => {
      const email = `get-by-email-${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash('password123', 10);

      const user = await userRepository.create({
        email,
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const result = await authService.getUserByEmail(email);

      expect(result).toBeDefined();
      expect(result?.email).toBe(email);
      expect(result?.password).toBeUndefined();
    });

    it('should return undefined when user not found', async () => {
      const result = await authService.getUserByEmail('nonexistent@example.com');

      expect(result).toBeUndefined();
    });

    it('should return undefined for non-existent email', async () => {
      const result = await authService.getUserByEmail('nonexistent-email@example.com');
      expect(result).toBeUndefined();
    });
  });

  // createCompanyProfile tests moved to registration.service.test.ts (Phase 5.1 refactoring)
});
