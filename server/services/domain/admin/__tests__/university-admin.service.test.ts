import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdminUniversityService } from '../university-admin.service';
import { universityRepository } from '../../../../repositories/university.repository';

describe('AdminUniversityService', () => {
  let adminUniversityService: AdminUniversityService;
  let testUniversityIds: string[] = [];

  beforeEach(() => {
    adminUniversityService = new AdminUniversityService();
  });

  afterEach(async () => {
    for (const id of testUniversityIds) {
      try {
        await universityRepository.delete(id);
      } catch (error) {
        console.log('University cleanup failed:', error);
      }
    }
    testUniversityIds = [];
  });

  describe('getAllUniversities', () => {
    it('should return all universities', async () => {
      const universities = await adminUniversityService.getAllUniversities();
      expect(Array.isArray(universities)).toBe(true);
    });
  });

  describe('getAllUniversities', () => {
    it('should return universities with proper structure', async () => {
      const universities = await adminUniversityService.getAllUniversities();
      expect(Array.isArray(universities)).toBe(true);
      
      if (universities.length > 0) {
        expect(universities[0]).toHaveProperty('id');
        expect(universities[0]).toHaveProperty('name');
      }
    });
  });
});
