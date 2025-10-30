import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { userRepository } from '../user.repository';
import { db } from '../../db';

describe('UserRepository', () => {
  let testUserId: string;

  afterEach(async () => {
    if (testUserId) {
      try {
        await userRepository.delete(testUserId);
      } catch (error) {
        console.log('Cleanup failed:', error);
      }
    }
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const user = await userRepository.create({
        email: `test-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Test',
        lastName: 'User'
      });
      testUserId = user.id;

      const found = await userRepository.findByEmail(user.email);
      expect(found).toBeDefined();
      expect(found?.email).toBe(user.email);
    });

    it('should return undefined for non-existent email', async () => {
      const found = await userRepository.findByEmail('nonexistent@example.com');
      expect(found).toBeUndefined();
    });
  });

  describe('findTeamMembers', () => {
    it('should find all team members', async () => {
      const teamMembers = await userRepository.findTeamMembers();
      expect(Array.isArray(teamMembers)).toBe(true);
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const newUser = await userRepository.create({
        email: `new-user-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'New',
        lastName: 'User'
      });
      testUserId = newUser.id;

      expect(newUser.id).toBeDefined();
      expect(newUser.email).toContain('new-user-');
      expect(newUser.userType).toBe('customer');
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      const user = await userRepository.create({
        email: `update-test-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Original',
        lastName: 'Name'
      });
      testUserId = user.id;

      const updated = await userRepository.update(user.id, {
        firstName: 'Updated',
        lastName: 'Name2'
      });

      expect(updated).toBeDefined();
      expect(updated?.firstName).toBe('Updated');
      expect(updated?.lastName).toBe('Name2');
    });
  });

  describe('updateAccountStatus', () => {
    it('should update user account status', async () => {
      const user = await userRepository.create({
        email: `status-test-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Status',
        lastName: 'Test',
        accountStatus: 'active'
      });
      testUserId = user.id;

      const updated = await userRepository.update(user.id, { accountStatus: 'inactive' });
      expect(updated?.accountStatus).toBe('inactive');
    });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      const user = await userRepository.create({
        email: `username-test-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Username',
        lastName: 'Test'
      });
      testUserId = user.id;

      const found = await userRepository.findByUsername(user.email);
      expect(found).toBeDefined();
      expect(found?.email).toBe(user.email);
    });

    it('should return undefined for empty username', async () => {
      const found = await userRepository.findByUsername('');
      expect(found).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const user = await userRepository.create({
        email: `findbyid-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'FindById',
        lastName: 'Test'
      });
      testUserId = user.id;

      const found = await userRepository.findById(user.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(user.id);
    });
  });

  describe('delete', () => {
    it('should delete a user', async () => {
      const user = await userRepository.create({
        email: `delete-user-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Delete',
        lastName: 'User'
      });

      const deleted = await userRepository.delete(user.id);
      expect(deleted).toBe(true);

      const found = await userRepository.findById(user.id);
      expect(found).toBeUndefined();
      testUserId = '';
    });
  });
});
