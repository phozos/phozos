import { describe, it, expect, afterEach } from 'vitest';
import { universityRepository } from '../university.repository';
import { db } from '../../db';
import { courses } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

describe('UniversityRepository', () => {
  let testUniversityId: string;
  let testCourseId: string;

  afterEach(async () => {
    if (testCourseId) {
      try {
        await db.delete(courses).where(eq(courses.id, testCourseId));
      } catch (error) {
        console.log('Course cleanup failed:', error);
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
    it('should create a university', async () => {
      const university = await universityRepository.create({
        name: `Test University ${Date.now()}`,
        country: 'United States',
        city: 'Boston',
        website: 'https://test.edu',
        isActive: true
      });
      testUniversityId = university.id;

      expect(university.id).toBeDefined();
      expect(university.name).toContain('Test University');
      expect(university.country).toBe('United States');
    });
  });

  describe('findById', () => {
    it('should find university by ID', async () => {
      const university = await universityRepository.create({
        name: `Find Test University ${Date.now()}`,
        country: 'Canada',
        city: 'Toronto',
        isActive: true
      });
      testUniversityId = university.id;

      const found = await universityRepository.findById(university.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(university.id);
      expect(found?.name).toContain('Find Test University');
    });

    it('should return undefined for non-existent ID', async () => {
      const found = await universityRepository.findById('00000000-0000-0000-0000-000000000000');
      expect(found).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update university fields', async () => {
      const university = await universityRepository.create({
        name: `Update Test ${Date.now()}`,
        country: 'UK',
        city: 'London',
        isActive: true
      });
      testUniversityId = university.id;

      const updated = await universityRepository.update(university.id, {
        city: 'Oxford',
        website: 'https://updated.edu'
      });

      expect(updated?.city).toBe('Oxford');
      expect(updated?.website).toBe('https://updated.edu');
      expect(updated?.name).toContain('Update Test');
    });
  });

  describe('search', () => {
    it('should search universities by name', async () => {
      const university = await universityRepository.create({
        name: `Unique Search Test ${Date.now()}`,
        country: 'Australia',
        city: 'Sydney',
        isActive: true
      });
      testUniversityId = university.id;

      const results = await universityRepository.search('Unique Search Test');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(u => u.id === university.id)).toBe(true);
    });

    it('should search universities with country filter', async () => {
      const university = await universityRepository.create({
        name: `Search Country Test ${Date.now()}`,
        country: 'Japan',
        city: 'Tokyo',
        isActive: true
      });
      testUniversityId = university.id;

      const results = await universityRepository.search('Search Country', { country: 'Japan' });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(u => u.id === university.id)).toBe(true);
    });

    it('should search universities with minRanking filter', async () => {
      const university = await universityRepository.create({
        name: `Search Ranking Min ${Date.now()}`,
        country: 'China',
        city: 'Beijing',
        ranking: 150,
        isActive: true
      });
      testUniversityId = university.id;

      const results = await universityRepository.search('Search Ranking', { minRanking: 100 });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(u => u.id === university.id)).toBe(true);
    });

    it('should search universities with maxRanking filter', async () => {
      const university = await universityRepository.create({
        name: `Search Ranking Max ${Date.now()}`,
        country: 'South Korea',
        city: 'Seoul',
        ranking: 80,
        isActive: true
      });
      testUniversityId = university.id;

      const results = await universityRepository.search('Search Ranking', { maxRanking: 100 });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(u => u.id === university.id)).toBe(true);
    });

    it('should search universities without filters', async () => {
      const university = await universityRepository.create({
        name: `Search No Filter ${Date.now()}`,
        country: 'India',
        city: 'Mumbai',
        isActive: true
      });
      testUniversityId = university.id;

      const results = await universityRepository.search('Search No Filter');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(u => u.id === university.id)).toBe(true);
    });
  });

  describe('findAll', () => {
    it('should find all universities with country filter', async () => {
      const university = await universityRepository.create({
        name: `Filter Test ${Date.now()}`,
        country: 'Germany',
        city: 'Berlin',
        isActive: true
      });
      testUniversityId = university.id;

      const results = await universityRepository.findAll({ country: 'Germany' });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(u => u.id === university.id)).toBe(true);
    });

    it('should find all universities with minRanking filter', async () => {
      const university = await universityRepository.create({
        name: `Ranking Test ${Date.now()}`,
        country: 'USA',
        city: 'Boston',
        ranking: 100,
        isActive: true
      });
      testUniversityId = university.id;

      const results = await universityRepository.findAll({ minRanking: 50 });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(u => u.id === university.id)).toBe(true);
    });

    it('should find all universities with maxRanking filter', async () => {
      const university = await universityRepository.create({
        name: `Max Ranking Test ${Date.now()}`,
        country: 'UK',
        city: 'Oxford',
        ranking: 50,
        isActive: true
      });
      testUniversityId = university.id;

      const results = await universityRepository.findAll({ maxRanking: 100 });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(u => u.id === university.id)).toBe(true);
    });

    it('should find all universities with isActive filter', async () => {
      const university = await universityRepository.create({
        name: `Active Test ${Date.now()}`,
        country: 'France',
        city: 'Paris',
        isActive: true
      });
      testUniversityId = university.id;

      const results = await universityRepository.findAll({ isActive: true });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(u => u.id === university.id)).toBe(true);
    });

    it('should find all universities with tier filter', async () => {
      const university = await universityRepository.create({
        name: `Tier Test ${Date.now()}`,
        country: 'Singapore',
        city: 'Singapore',
        tier: 'top100',
        isActive: true
      });
      testUniversityId = university.id;

      const results = await universityRepository.findAll({ tier: 'top100' });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(u => u.id === university.id)).toBe(true);
    });

    it('should find all universities without any filters', async () => {
      const results = await universityRepository.findAll();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete a university', async () => {
      const university = await universityRepository.create({
        name: `Delete Test ${Date.now()}`,
        country: 'France',
        city: 'Paris',
        isActive: true
      });

      const deleted = await universityRepository.delete(university.id);
      expect(deleted).toBe(true);

      const found = await universityRepository.findById(university.id);
      expect(found).toBeUndefined();
      testUniversityId = '';
    });
  });

  describe('createCourse', () => {
    it('should create a course for a university', async () => {
      const university = await universityRepository.create({
        name: `Course Uni ${Date.now()}`,
        country: 'USA',
        city: 'New York',
        isActive: true
      });
      testUniversityId = university.id;

      const course = await universityRepository.createCourse({
        universityId: university.id,
        name: 'Computer Science',
        degree: 'Bachelor'
      });
      testCourseId = course.id;

      expect(course.id).toBeDefined();
      expect(course.name).toBe('Computer Science');
      expect(course.degree).toBe('Bachelor');
    });
  });

  describe('getCoursesByUniversity', () => {
    it('should get all courses for a university', async () => {
      const university = await universityRepository.create({
        name: `Get Courses Uni ${Date.now()}`,
        country: 'Canada',
        city: 'Vancouver',
        isActive: true
      });
      testUniversityId = university.id;

      const course = await universityRepository.createCourse({
        universityId: university.id,
        name: 'Mathematics',
        degree: 'Master'
      });
      testCourseId = course.id;

      const courses = await universityRepository.getCoursesByUniversity(university.id);
      expect(courses.length).toBeGreaterThan(0);
      expect(courses.some(c => c.id === course.id)).toBe(true);
    });
  });

  describe('getCourse', () => {
    it('should get a specific course', async () => {
      const university = await universityRepository.create({
        name: `Get Course Uni ${Date.now()}`,
        country: 'UK',
        city: 'Cambridge',
        isActive: true
      });
      testUniversityId = university.id;

      const course = await universityRepository.createCourse({
        universityId: university.id,
        name: 'Physics',
        degree: 'PhD'
      });
      testCourseId = course.id;

      const found = await universityRepository.getCourse(course.id);
      expect(found).toBeDefined();
      expect(found?.name).toBe('Physics');
      expect(found?.degree).toBe('PhD');
    });
  });
});
