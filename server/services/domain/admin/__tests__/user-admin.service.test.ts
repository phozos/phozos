import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdminUserService } from '../user-admin.service';
import { userRepository } from '../../../../repositories/user.repository';

describe('AdminUserService', () => {
  let adminUserService: AdminUserService;
  let testUserIds: string[] = [];

  beforeEach(() => {
    adminUserService = new AdminUserService();
  });

  afterEach(async () => {
    for (const userId of testUserIds) {
      try {
        await userRepository.delete(userId);
      } catch (error) {
        console.log('User cleanup failed:', error);
      }
    }
    testUserIds = [];
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const users = await adminUserService.getAllUsers();
      expect(Array.isArray(users)).toBe(true);
    });
  });

  describe('createTeamMemberWithPassword', () => {
    it('should create team member with temporary password', async () => {
      // Create a real admin user first
      const adminUser = await userRepository.create({
        email: `admin-${Date.now()}@example.com`,
        password: 'hashedPassword',
        userType: 'team_member',
        teamRole: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        accountStatus: 'active'
      });
      testUserIds.push(adminUser.id);

      const email = `team-${Date.now()}@example.com`;
      
      const result = await adminUserService.createTeamMemberWithPassword(adminUser.id, {
        email,
        firstName: 'Team',
        lastName: 'Member',
        teamRole: 'counselor'
      });

      testUserIds.push(result.user.id);

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(email);
      expect(result.temporaryPassword).toBeDefined();
      expect(result.temporaryPassword.length).toBeGreaterThan(8);
    });
  });

  describe('updateUserAccountStatus', () => {
    it('should update user account status', async () => {
      const user = await userRepository.create({
        email: `status-test-${Date.now()}@example.com`,
        password: 'hashedPassword',
        userType: 'customer',
        firstName: 'Test',
        lastName: 'User',
        accountStatus: 'inactive'
      });
      testUserIds.push(user.id);

      const updated = await adminUserService.updateUserAccountStatus(user.id, 'active');
      expect(updated.accountStatus).toBe('active');
    });
  });

  describe('getStaffMembers', () => {
    it('should return only staff members', async () => {
      const staff = await adminUserService.getStaffMembers();
      expect(Array.isArray(staff)).toBe(true);
      staff.forEach((member: any) => {
        expect(member.userType).toBe('team_member');
      });
    });
  });
});
