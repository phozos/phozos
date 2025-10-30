import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UniversityService } from '../university.service';
import { universityRepository } from '../../../repositories/university.repository';

describe('UniversityService', () => {
  let universityService: UniversityService;
  let testUniversityIds: string[] = [];

  beforeEach(async () => {
    universityService = new UniversityService();
  });

  afterEach(async () => {
    for (const universityId of testUniversityIds) {
      try {
        await universityRepository.delete(universityId);
      } catch (error) {
        console.log('University cleanup failed:', error);
      }
    }
    testUniversityIds = [];
  });

  describe('getAllUniversities', () => {
    it('should return all universities', async () => {
      const uni1 = await universityRepository.create({
        name: `University A ${Date.now()}-${Math.random()}`,
        country: 'USA',
        city: 'Boston',
        description: 'Test university'
      });
      testUniversityIds.push(uni1.id);

      const uni2 = await universityRepository.create({
        name: `University B ${Date.now()}-${Math.random()}`,
        country: 'UK',
        city: 'London',
        description: 'Test university'
      });
      testUniversityIds.push(uni2.id);

      const result = await universityService.getAllUniversities();

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some(u => u.id === uni1.id)).toBe(true);
      expect(result.some(u => u.id === uni2.id)).toBe(true);
    });

    it('should return universities with filters', async () => {
      const uni = await universityRepository.create({
        name: `Filtered University ${Date.now()}-${Math.random()}`,
        country: 'USA',
        city: 'New York',
        description: 'Test university'
      });
      testUniversityIds.push(uni.id);

      const result = await universityService.getAllUniversities({ country: 'USA' });

      expect(result.some(u => u.id === uni.id)).toBe(true);
    });

    it('should handle errors from repository', async () => {
      const result = await universityService.getAllUniversities();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getUniversityById', () => {
    it('should return university by id', async () => {
      const university = await universityRepository.create({
        name: `Get By ID ${Date.now()}-${Math.random()}`,
        country: 'USA',
        city: 'Chicago',
        description: 'Test university'
      });
      testUniversityIds.push(university.id);

      const result = await universityService.getUniversityById(university.id);

      expect(result.id).toBe(university.id);
      expect(result.name).toContain('Get By ID');
    });

    it('should throw error if university not found', async () => {
      await expect(
        universityService.getUniversityById('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow();
    });
  });

  describe('searchUniversities', () => {
    it('should search universities by query', async () => {
      const university = await universityRepository.create({
        name: `Harvard University ${Date.now()}-${Math.random()}`,
        country: 'USA',
        city: 'Cambridge',
        description: 'Prestigious university'
      });
      testUniversityIds.push(university.id);

      const result = await universityService.searchUniversities('Harvard');

      expect(result.some(u => u.id === university.id)).toBe(true);
    });

    it('should search with filters', async () => {
      const university = await universityRepository.create({
        name: `Cambridge University ${Date.now()}-${Math.random()}`,
        country: 'UK',
        city: 'Cambridge',
        description: 'Historic university'
      });
      testUniversityIds.push(university.id);

      const result = await universityService.searchUniversities('Cambridge', { country: 'UK' });

      expect(result.some(u => u.id === university.id)).toBe(true);
    });

    it('should handle errors from repository', async () => {
      const result = await universityService.searchUniversities('NonExistent');

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('createUniversity', () => {
    it('should create university successfully', async () => {
      const result = await universityService.createUniversity({
        name: `New University ${Date.now()}-${Math.random()}`,
        country: 'Canada',
        city: 'Toronto',
        description: 'Newly created university'
      });
      testUniversityIds.push(result.id);

      expect(result.id).toBeDefined();
      expect(result.country).toBe('Canada');
    });

    it('should throw error if required fields are missing', async () => {
      await expect(
        universityService.createUniversity({ name: '' } as any)
      ).rejects.toThrow();
    });

    it('should handle errors from repository', async () => {
      await expect(
        universityService.createUniversity({ name: '', country: '' } as any)
      ).rejects.toThrow();
    });
  });

  describe('updateUniversity', () => {
    it('should update university successfully', async () => {
      const university = await universityRepository.create({
        name: `Update Me ${Date.now()}-${Math.random()}`,
        country: 'USA',
        city: 'Seattle',
        description: 'Original description'
      });
      testUniversityIds.push(university.id);

      const result = await universityService.updateUniversity(university.id, {
        name: 'Updated University',
        description: 'Updated description'
      });

      expect(result.name).toBe('Updated University');
      expect(result.description).toBe('Updated description');
    });

    it('should throw error if update fails', async () => {
      await expect(
        universityService.updateUniversity('00000000-0000-0000-0000-000000000000', { name: 'Updated' })
      ).rejects.toThrow('UPDATE_FAILED');
    });

    it('should handle errors from repository', async () => {
      await expect(
        universityService.updateUniversity('invalid-id', { name: 'Updated' })
      ).rejects.toThrow();
    });
  });

  describe('deleteUniversity', () => {
    it('should delete university successfully', async () => {
      const university = await universityRepository.create({
        name: `Delete Me ${Date.now()}-${Math.random()}`,
        country: 'USA',
        city: 'Austin',
        description: 'To be deleted'
      });
      testUniversityIds.push(university.id);

      const result = await universityService.deleteUniversity(university.id);

      expect(result).toBe(true);
    });

    it('should return false if delete fails', async () => {
      const result = await universityService.deleteUniversity('00000000-0000-0000-0000-000000000000');

      expect(result).toBe(false);
    });

    it('should handle errors from repository', async () => {
      await expect(
        universityService.deleteUniversity('invalid-id')
      ).rejects.toThrow();
    });
  });

  describe('getCoursesByUniversity', () => {
    it('should return courses for a university', async () => {
      const university = await universityRepository.create({
        name: `With Courses ${Date.now()}-${Math.random()}`,
        country: 'USA',
        city: 'Philadelphia',
        description: 'University with courses'
      });
      testUniversityIds.push(university.id);

      const result = await universityService.getCoursesByUniversity(university.id);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle errors from repository', async () => {
      const result = await universityService.getCoursesByUniversity('00000000-0000-0000-0000-000000000000');

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
