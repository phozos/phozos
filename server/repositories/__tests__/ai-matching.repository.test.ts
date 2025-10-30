import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { aiMatchingRepository } from '../ai-matching.repository';
import { userRepository } from '../user.repository';
import { universityRepository } from '../university.repository';

describe('AIMatchingRepository', () => {
  let testUserId: string;
  let testUniversityId: string;
  let testMatchId: string;

  beforeEach(async () => {
    // Create test user
    const user = await userRepository.create({
      email: `ai-match-test-${Date.now()}@example.com`,
      password: 'hashedPassword123',
      userType: 'customer',
      firstName: 'AI',
      lastName: 'Test'
    });
    testUserId = user.id;

    // Create test university
    const university = await universityRepository.create({
      name: `Test University ${Date.now()}`,
      country: 'Test Country',
      city: 'Test City',
      ranking: 100
    });
    testUniversityId = university.id;
  });

  afterEach(async () => {
    // Cleanup
    if (testMatchId) {
      try {
        await aiMatchingRepository.delete(testMatchId);
      } catch (error) {
        console.log('Match cleanup failed:', error);
      }
    }
    if (testUserId) {
      try {
        await aiMatchingRepository.deleteByUser(testUserId);
        await userRepository.delete(testUserId);
      } catch (error) {
        console.log('User cleanup failed:', error);
      }
    }
    if (testUniversityId) {
      try {
        await universityRepository.delete(testUniversityId);
      } catch (error) {
        console.log('University cleanup failed:', error);
      }
    }
  });

  describe('create', () => {
    it('should create AI matching result', async () => {
      const matchResult = await aiMatchingRepository.create({
        userId: testUserId,
        universityId: testUniversityId,
        matchScore: '85',
        reasoning: { academic: 'good fit', location: 'preferred' },
        modelVersion: '1.0.0'
      });
      testMatchId = matchResult.id;

      expect(matchResult.id).toBeDefined();
      expect(matchResult.userId).toBe(testUserId);
      expect(matchResult.universityId).toBe(testUniversityId);
      expect(matchResult.matchScore).toBe('85.00');
    });
  });

  describe('findByUser', () => {
    it('should find all matches for a user', async () => {
      const match1 = await aiMatchingRepository.create({
        userId: testUserId,
        universityId: testUniversityId,
        matchScore: '90',
        reasoning: { test: 'match1' },
        modelVersion: '1.0.0'
      });
      testMatchId = match1.id;

      const matches = await aiMatchingRepository.findByUser(testUserId);
      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].userId).toBe(testUserId);
    });

    it('should return empty array for user with no matches', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000001';
      const matches = await aiMatchingRepository.findByUser(fakeUserId);
      expect(Array.isArray(matches)).toBe(true);
      expect(matches.length).toBe(0);
    });
  });

  describe('findByUserAndUniversity', () => {
    it('should find match by user and university', async () => {
      const match = await aiMatchingRepository.create({
        userId: testUserId,
        universityId: testUniversityId,
        matchScore: '75',
        reasoning: { test: 'specific match' },
        modelVersion: '1.0.0'
      });
      testMatchId = match.id;

      const found = await aiMatchingRepository.findByUserAndUniversity(testUserId, testUniversityId);
      expect(found).toBeDefined();
      expect(found?.userId).toBe(testUserId);
      expect(found?.universityId).toBe(testUniversityId);
    });

    it('should return undefined for non-existent match', async () => {
      const fakeUuid1 = '00000000-0000-0000-0000-000000000001';
      const fakeUuid2 = '00000000-0000-0000-0000-000000000002';
      const found = await aiMatchingRepository.findByUserAndUniversity(fakeUuid1, fakeUuid2);
      expect(found).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update match score and reasoning', async () => {
      const match = await aiMatchingRepository.create({
        userId: testUserId,
        universityId: testUniversityId,
        matchScore: '70',
        reasoning: { original: 'reasoning' },
        modelVersion: '1.0.0'
      });
      testMatchId = match.id;

      const updated = await aiMatchingRepository.update(match.id, {
        matchScore: '85',
        reasoning: { updated: 'new reasoning' }
      });

      expect(updated).toBeDefined();
      expect(updated?.matchScore).toBe('85.00');
      expect(updated?.reasoning).toEqual({ updated: 'new reasoning' });
    });
  });

  describe('deleteByUser', () => {
    it('should delete all matches for a user', async () => {
      await aiMatchingRepository.create({
        userId: testUserId,
        universityId: testUniversityId,
        matchScore: '80',
        reasoning: { test: 'to delete' },
        modelVersion: '1.0.0'
      });

      const deleted = await aiMatchingRepository.deleteByUser(testUserId);
      expect(deleted).toBe(true);

      const matches = await aiMatchingRepository.findByUser(testUserId);
      expect(matches.length).toBe(0);
    });

    it('should return false when no matches to delete', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000999';
      const deleted = await aiMatchingRepository.deleteByUser(fakeUserId);
      expect(deleted).toBe(false);
    });
  });

  describe('findById', () => {
    it('should find match by ID', async () => {
      const match = await aiMatchingRepository.create({
        userId: testUserId,
        universityId: testUniversityId,
        matchScore: '88',
        reasoning: { test: 'findById' },
        modelVersion: '1.0.0'
      });
      testMatchId = match.id;

      const found = await aiMatchingRepository.findById(match.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(match.id);
      expect(found?.matchScore).toBe('88.00');
    });

    it('should return undefined for non-existent ID', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000001';
      const found = await aiMatchingRepository.findById(fakeId);
      expect(found).toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('should find all matches', async () => {
      const match = await aiMatchingRepository.create({
        userId: testUserId,
        universityId: testUniversityId,
        matchScore: '92',
        reasoning: { test: 'findAll' },
        modelVersion: '1.0.0'
      });
      testMatchId = match.id;

      const allMatches = await aiMatchingRepository.findAll();
      expect(Array.isArray(allMatches)).toBe(true);
      expect(allMatches.length).toBeGreaterThan(0);
    });

    it('should find matches with filters', async () => {
      const match = await aiMatchingRepository.create({
        userId: testUserId,
        universityId: testUniversityId,
        matchScore: '95',
        reasoning: { test: 'filtered' },
        modelVersion: '1.0.0'
      });
      testMatchId = match.id;

      const filteredMatches = await aiMatchingRepository.findAll({ userId: testUserId });
      expect(Array.isArray(filteredMatches)).toBe(true);
      expect(filteredMatches.some(m => m.id === match.id)).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete a match by ID', async () => {
      const match = await aiMatchingRepository.create({
        userId: testUserId,
        universityId: testUniversityId,
        matchScore: '78',
        reasoning: { test: 'to be deleted' },
        modelVersion: '1.0.0'
      });

      const deleted = await aiMatchingRepository.delete(match.id);
      expect(deleted).toBe(true);

      const found = await aiMatchingRepository.findById(match.id);
      expect(found).toBeUndefined();
      testMatchId = '';
    });

    it('should return false when deleting non-existent match', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000999';
      const deleted = await aiMatchingRepository.delete(fakeId);
      expect(deleted).toBe(false);
    });
  });
});
