import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../../db';
import { users, User, InsertUser } from '../../../shared/schema';
import { UserRepository } from '../user.repository';
import { BaseRepository } from '../base.repository';
import { eq } from 'drizzle-orm';

class TestableUserRepository extends BaseRepository<User, InsertUser> {
  constructor() {
    super(users, 'id');
  }

  async testFindOne(conditions: any) {
    return this.findOne(conditions);
  }

  async testFindMany(conditions?: any) {
    return this.findMany(conditions);
  }

  async testCount(conditions?: any) {
    return this.count(conditions);
  }

  async testExists(conditions: any) {
    return this.exists(conditions);
  }
}

class TestableUserRepositoryWithDefaultPK extends BaseRepository<User, InsertUser> {
  constructor() {
    super(users);
  }
}

describe('BaseRepository', () => {
  const userRepo = new UserRepository();
  const testableRepo = new TestableUserRepository();
  const testableRepoDefaultPK = new TestableUserRepositoryWithDefaultPK();
  const testUserIds: string[] = [];

  afterEach(async () => {
    for (const id of testUserIds) {
      try {
        await db.delete(users).where({ id } as any);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    testUserIds.length = 0;
  });

  describe('findAll with filters', () => {
    it('should find all records without filters', async () => {
      const user1 = await userRepo.create({
        email: `test1-${Date.now()}@example.com`,
        password: 'password123',
        userType: 'customer',
        firstName: 'Test',
        lastName: 'User1'
      });
      testUserIds.push(user1.id);

      const user2 = await userRepo.create({
        email: `test2-${Date.now()}@example.com`,
        password: 'password123',
        userType: 'customer',
        firstName: 'Test',
        lastName: 'User2'
      });
      testUserIds.push(user2.id);

      const results = await userRepo.findAll();
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter records by single field', async () => {
      const user = await userRepo.create({
        email: `unique-filter-${Date.now()}@example.com`,
        password: 'password123',
        userType: 'team_member',
        teamRole: 'counselor',
        firstName: 'Team',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      const results = await userRepo.findAll({ userType: 'team_member' } as any);
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some(u => u.id === user.id)).toBe(true);
    });

    it('should handle filters with undefined values', async () => {
      const user = await userRepo.create({
        email: `undefined-filter-${Date.now()}@example.com`,
        password: 'password123',
        userType: 'customer',
        firstName: 'Test',
        lastName: 'User'
      });
      testUserIds.push(user.id);

      const results = await userRepo.findAll({ 
        userType: 'customer',
        teamRole: undefined 
      } as any);
      
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty filter object', async () => {
      const results = await userRepo.findAll({});
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('update method', () => {
    it('should return undefined when updating non-existent record', async () => {
      const result = await userRepo.update('00000000-0000-0000-0000-000000000000', {
        firstName: 'Updated'
      });
      expect(result).toBeUndefined();
    });

    it('should update existing record and return it', async () => {
      const user = await userRepo.create({
        email: `update-test-${Date.now()}@example.com`,
        password: 'password123',
        userType: 'customer',
        firstName: 'Original',
        lastName: 'Name'
      });
      testUserIds.push(user.id);

      const updated = await userRepo.update(user.id, {
        firstName: 'Updated'
      });

      expect(updated).toBeDefined();
      expect(updated?.firstName).toBe('Updated');
    });
  });

  describe('delete method', () => {
    it('should return false when deleting non-existent record', async () => {
      const result = await userRepo.delete('00000000-0000-0000-0000-000000000000');
      expect(result).toBe(false);
    });

    it('should return true when successfully deleting record', async () => {
      const user = await userRepo.create({
        email: `delete-test-${Date.now()}@example.com`,
        password: 'password123',
        userType: 'customer',
        firstName: 'Delete',
        lastName: 'Me'
      });
      testUserIds.push(user.id);

      const result = await userRepo.delete(user.id);
      expect(result).toBe(true);

      const found = await userRepo.findById(user.id);
      expect(found).toBeUndefined();
      
      // Remove from cleanup list since it's already deleted
      const index = testUserIds.indexOf(user.id);
      if (index > -1) testUserIds.splice(index, 1);
    });
  });

  describe('findById method', () => {
    it('should return undefined for non-existent id', async () => {
      const result = await userRepo.findById('00000000-0000-0000-0000-000000000000');
      expect(result).toBeUndefined();
    });

    it('should return user when found', async () => {
      const user = await userRepo.create({
        email: `findbyid-${Date.now()}@example.com`,
        password: 'password123',
        userType: 'customer',
        firstName: 'Find',
        lastName: 'Me'
      });
      testUserIds.push(user.id);

      const found = await userRepo.findById(user.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(user.id);
    });
  });

  describe('create method', () => {
    it('should create a new user and return it', async () => {
      const userData = {
        email: `create-test-${Date.now()}@example.com`,
        password: 'password123',
        userType: 'customer' as const,
        firstName: 'New',
        lastName: 'User'
      };

      const user = await userRepo.create(userData);
      testUserIds.push(user.id);

      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
    });
  });

  describe('protected methods', () => {
    describe('findOne', () => {
      it('should find one record with conditions', async () => {
        const user = await userRepo.create({
          email: `findone-${Date.now()}@example.com`,
          password: 'password123',
          userType: 'customer',
          firstName: 'FindOne',
          lastName: 'Test'
        });
        testUserIds.push(user.id);

        const found = await testableRepo.testFindOne(eq(users.id, user.id));
        expect(found).toBeDefined();
        expect(found?.id).toBe(user.id);
      });

      it('should return undefined when no record matches', async () => {
        const found = await testableRepo.testFindOne(eq(users.email, 'nonexistent@example.com'));
        expect(found).toBeUndefined();
      });
    });

    describe('findMany', () => {
      it('should find many records with conditions', async () => {
        const user1 = await userRepo.create({
          email: `findmany1-${Date.now()}@example.com`,
          password: 'password123',
          userType: 'team_member',
          teamRole: 'counselor',
          firstName: 'FindMany',
          lastName: 'Test1'
        });
        testUserIds.push(user1.id);

        const user2 = await userRepo.create({
          email: `findmany2-${Date.now()}@example.com`,
          password: 'password123',
          userType: 'team_member',
          teamRole: 'counselor',
          firstName: 'FindMany',
          lastName: 'Test2'
        });
        testUserIds.push(user2.id);

        const found = await testableRepo.testFindMany(eq(users.userType, 'team_member'));
        expect(found.length).toBeGreaterThanOrEqual(2);
        expect(found.some(u => u.id === user1.id)).toBe(true);
        expect(found.some(u => u.id === user2.id)).toBe(true);
      });

      it('should find all records when no conditions provided', async () => {
        const found = await testableRepo.testFindMany();
        expect(Array.isArray(found)).toBe(true);
        expect(found.length).toBeGreaterThan(0);
      });
    });

    describe('count', () => {
      it('should count records with conditions', async () => {
        const user = await userRepo.create({
          email: `count-test-${Date.now()}@example.com`,
          password: 'password123',
          userType: 'customer',
          firstName: 'Count',
          lastName: 'Test'
        });
        testUserIds.push(user.id);

        const count = await testableRepo.testCount(eq(users.id, user.id));
        expect(count).toBe(1);
      });

      it('should count all records when no conditions provided', async () => {
        const count = await testableRepo.testCount();
        expect(count).toBeGreaterThan(0);
      });

      it('should return 0 when no records match conditions', async () => {
        const count = await testableRepo.testCount(eq(users.email, 'nonexistent-count@example.com'));
        expect(count).toBe(0);
      });
    });

    describe('exists', () => {
      it('should return true when record exists', async () => {
        const user = await userRepo.create({
          email: `exists-test-${Date.now()}@example.com`,
          password: 'password123',
          userType: 'customer',
          firstName: 'Exists',
          lastName: 'Test'
        });
        testUserIds.push(user.id);

        const exists = await testableRepo.testExists(eq(users.id, user.id));
        expect(exists).toBe(true);
      });

      it('should return false when record does not exist', async () => {
        const exists = await testableRepo.testExists(eq(users.email, 'nonexistent@example.com'));
        expect(exists).toBe(false);
      });
    });
  });

  describe('default primary key parameter', () => {
    it('should use default primary key when not explicitly provided', async () => {
      const user = await testableRepoDefaultPK.create({
        email: `default-pk-${Date.now()}@example.com`,
        password: 'password123',
        userType: 'customer',
        firstName: 'Default',
        lastName: 'PK'
      });
      testUserIds.push(user.id);

      const found = await testableRepoDefaultPK.findById(user.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(user.id);
    });
  });
});
