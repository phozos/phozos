import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UserProfileService } from '../user-profile.service';
import { userRepository } from '../../../repositories/user.repository';
import { studentRepository } from '../../../repositories/student.repository';
import * as bcrypt from 'bcrypt';

describe('UserProfileService', () => {
  let userProfileService: UserProfileService;
  let testUserIds: string[] = [];
  let testStudentIds: string[] = [];

  beforeEach(() => {
    userProfileService = new UserProfileService();
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

  describe('getUserById', () => {
    it('should return sanitized user by id', async () => {
      const user = await userRepository.create({
        email: `test-${Date.now()}@example.com`,
        password: 'hashed-password',
        temporaryPassword: 'temp-pass',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const result = await userProfileService.getUserById(user.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(user.id);
      expect(result.password).toBeUndefined();
      expect(result.temporaryPassword).toBeUndefined();
    });

    it('should throw error if user not found', async () => {
      await expect(userProfileService.getUserById('00000000-0000-0000-0000-000000000001')).rejects.toThrow();
    });
  });

  describe('getUserByEmail', () => {
    it('should return sanitized user by email', async () => {
      const email = `test-${Date.now()}@example.com`;
      const user = await userRepository.create({
        email,
        password: 'hashed-password',
        temporaryPassword: 'temp-pass',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const result = await userProfileService.getUserByEmail(email);

      expect(result).toBeDefined();
      expect(result?.id).toBe(user.id);
      expect(result?.password).toBeUndefined();
      expect(result?.temporaryPassword).toBeUndefined();
    });

    it('should return undefined if user not found by email', async () => {
      const result = await userProfileService.getUserByEmail('nonexistent@example.com');

      expect(result).toBeUndefined();
    });

    it('should return undefined for non-existent email', async () => {
      const result = await userProfileService.getUserByEmail('nonexistent-email@example.com');
      expect(result).toBeUndefined();
    });
  });

  describe('getUserProfile', () => {
    it('should return user with student profile for customer', async () => {
      const user = await userRepository.create({
        email: `customer-${Date.now()}@example.com`,
        userType: 'customer',
        firstName: 'John',
        lastName: 'Doe',
        password: 'hashedPassword'
      });
      testUserIds.push(user.id);

      const profile = await studentRepository.create({
        userId: user.id,
        phone: '1234567890'
      });
      testStudentIds.push(profile.id);

      const result = await userProfileService.getUserProfile(user.id);

      expect(result.user).toBeDefined();
      expect(result.profile).toBeDefined();
      expect(result.profile?.id).toBe(profile.id);
    });

    it('should return user without profile for non-customer', async () => {
      const user = await userRepository.create({
        email: `admin-${Date.now()}@example.com`,
        userType: 'team_member',
        firstName: 'Admin',
        lastName: 'User',
        password: 'hashedPassword'
      });
      testUserIds.push(user.id);

      const result = await userProfileService.getUserProfile(user.id);

      expect(result.user).toBeDefined();
      expect(result.profile).toBeUndefined();
    });

    it('should throw error if user not found', async () => {
      await expect(userProfileService.getUserProfile('00000000-0000-0000-0000-000000000001')).rejects.toThrow();
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const user = await userRepository.create({
        email: `update-${Date.now()}@example.com`,
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer',
        password: 'hashedPassword'
      });
      testUserIds.push(user.id);

      const result = await userProfileService.updateUserProfile(user.id, {
        firstName: 'Jane',
        lastName: 'Smith'
      });

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
    });

    it('should throw error if update fails', async () => {
      await expect(
        userProfileService.updateUserProfile('00000000-0000-0000-0000-000000000001', { firstName: 'Jane' })
      ).rejects.toThrow();
    });
  });

  describe('changePassword', () => {
    it('should change password successfully with valid old password', async () => {
      const oldPassword = 'oldPassword';
      const hashedOldPassword = await bcrypt.hash(oldPassword, 10);
      
      const user = await userRepository.create({
        email: `changepass-${Date.now()}@example.com`,
        password: hashedOldPassword,
        userType: 'customer',
        firstName: 'Test',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      await userProfileService.changePassword(user.id, oldPassword, 'newPassword');

      const updatedUser = await userRepository.findById(user.id);
      expect(updatedUser).toBeDefined();
      expect(await bcrypt.compare('newPassword', updatedUser!.password!)).toBe(true);
    });

    it('should throw error if old password is invalid', async () => {
      const oldPassword = 'oldPassword';
      const hashedOldPassword = await bcrypt.hash(oldPassword, 10);
      
      const user = await userRepository.create({
        email: `wrongpass-${Date.now()}@example.com`,
        password: hashedOldPassword,
        userType: 'customer',
        firstName: 'Test',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      await expect(
        userProfileService.changePassword(user.id, 'wrongOldPassword', 'newPassword')
      ).rejects.toThrow();
    });

    it('should throw error if user not found', async () => {
      await expect(
        userProfileService.changePassword('00000000-0000-0000-0000-000000000001', 'oldPassword', 'newPassword')
      ).rejects.toThrow();
    });

    it('should throw error if user has no password', async () => {
      const user = await userRepository.create({
        email: `nopass-${Date.now()}@example.com`,
        password: null,
        userType: 'customer',
        firstName: 'No',
        lastName: 'Pass'
      });
      testUserIds.push(user.id);

      await expect(
        userProfileService.changePassword(user.id, 'oldPassword', 'newPassword')
      ).rejects.toThrow();
    });
  });

  describe('resetUserPassword', () => {
    it('should reset user password and return plain password', async () => {
      const user = await userRepository.create({
        email: `reset-${Date.now()}@example.com`,
        password: 'oldHashedPassword',
        userType: 'customer',
        firstName: 'Reset',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      const result = await userProfileService.resetUserPassword(user.id);

      expect(result.user).toBeDefined();
      expect(result.user.id).toBe(user.id);
      expect(result.plainPassword).toBeDefined();
      expect(typeof result.plainPassword).toBe('string');
      expect(result.plainPassword.length).toBeGreaterThan(0);
    });

    it('should throw error if user not found', async () => {
      await expect(
        userProfileService.resetUserPassword('00000000-0000-0000-0000-000000000001')
      ).rejects.toThrow();
    });
  });

  describe('updateStudentProfile', () => {
    it('should update student profile successfully', async () => {
      const user = await userRepository.create({
        email: `student-${Date.now()}@example.com`,
        userType: 'customer',
        firstName: 'Student',
        lastName: 'User',
        password: 'hashedPassword'
      });
      testUserIds.push(user.id);

      const profile = await studentRepository.create({
        userId: user.id,
        phone: '1234567890'
      });
      testStudentIds.push(profile.id);

      const result = await userProfileService.updateStudentProfile(user.id, {
        phone: '0987654321'
      });

      expect(result.phone).toBe('0987654321');
    });

    it('should throw error if profile not found', async () => {
      const user = await userRepository.create({
        email: `noprofile-${Date.now()}@example.com`,
        userType: 'customer',
        firstName: 'No',
        lastName: 'Profile',
        password: 'hashedPassword'
      });
      testUserIds.push(user.id);

      await expect(
        userProfileService.updateStudentProfile(user.id, { phone: '1234567890' })
      ).rejects.toThrow();
    });

    it('should throw error if update fails', async () => {
      await expect(
        userProfileService.updateStudentProfile('00000000-0000-0000-0000-000000000001', { phone: '1234567890' })
      ).rejects.toThrow();
    });
  });
});
