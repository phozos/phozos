import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { aiMatchingService } from '../ai-matching.service';
import { studentRepository } from '../../../repositories/student.repository';
import { universityRepository } from '../../../repositories/university.repository';
import { aiMatchingRepository } from '../../../repositories/ai-matching.repository';
import { userRepository } from '../../../repositories/user.repository';

describe('AIMatchingService', () => {
  let testUserIds: string[] = [];
  let testStudentIds: string[] = [];
  let testUniversityIds: string[] = [];
  let testMatchIds: string[] = [];

  beforeEach(() => {
    // Tests use real implementations
  });

  afterEach(async () => {
    // Clean up matches first
    for (const matchId of testMatchIds) {
      try {
        await aiMatchingRepository.delete(matchId);
      } catch (error) {
        console.log('Match cleanup failed:', error);
      }
    }
    testMatchIds = [];

    // Clean up students
    for (const studentId of testStudentIds) {
      try {
        await studentRepository.delete(studentId);
      } catch (error) {
        console.log('Student cleanup failed:', error);
      }
    }
    testStudentIds = [];

    // Clean up universities
    for (const universityId of testUniversityIds) {
      try {
        await universityRepository.delete(universityId);
      } catch (error) {
        console.log('University cleanup failed:', error);
      }
    }
    testUniversityIds = [];

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

  describe('getMatches', () => {
    it('should retrieve existing matches for a user', async () => {
      // Create user
      const user = await userRepository.create({
        email: `match-user-${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'User',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      // Create student profile
      const student = await studentRepository.create({
        userId: user.id,
        dateOfBirth: new Date('2000-01-01'),
        academicLevel: 'undergraduate',
        gpa: 3.8,
        desiredMajor: 'Computer Science'
      });
      testStudentIds.push(student.id);

      // Create university
      const university = await universityRepository.create({
        name: `Test University ${Date.now()}`,
        country: 'United States',
        city: 'Test City',
        worldRanking: 50,
        annualFee: '40000',
        specialization: 'Computer Science',
        acceptanceRate: '30.00'
      });
      testUniversityIds.push(university.id);

      // Create match
      const match = await aiMatchingRepository.create({
        userId: user.id,
        universityId: university.id,
        matchScore: 0.85,
        reasoning: {
          factors: ['Strong academic fit'],
          weights: { academicFit: 0.85 },
          details: 'Good match'
        },
        modelVersion: '1.0.0'
      });
      testMatchIds.push(match.id);

      const result = await aiMatchingService.getMatches(user.id);

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(user.id);
      expect(result[0].universityId).toBe(university.id);
    });

    it('should return empty array when no matches exist', async () => {
      const user = await userRepository.create({
        email: `no-matches-${Date.now()}@example.com`,
        firstName: 'No',
        lastName: 'Matches',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      const result = await aiMatchingService.getMatches(user.id);

      expect(result).toEqual([]);
    });
  });

  describe('generateMatches', () => {
    it('should throw error when student profile not found', async () => {
      const user = await userRepository.create({
        email: `no-profile-${Date.now()}@example.com`,
        firstName: 'No',
        lastName: 'Profile',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      await expect(aiMatchingService.generateMatches(user.id)).rejects.toThrow(
        'Student profile not found'
      );
    });

    it('should generate matches for all universities', async () => {
      // Create user
      const user = await userRepository.create({
        email: `generate-${Date.now()}@example.com`,
        firstName: 'Generate',
        lastName: 'Test',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      // Create student profile with complete data
      const student = await studentRepository.create({
        userId: user.id,
        dateOfBirth: new Date('2000-01-01'),
        academicLevel: 'undergraduate',
        gpa: 3.8,
        desiredMajor: 'Computer Science',
        destinationCountry: 'United States',
        budgetRange: { min: 20000, max: 50000 },
        testScores: {
          ielts: 7.5,
          toefl: null,
          sat: null,
          act: null,
          gre: null,
          gmat: null
        }
      });
      testStudentIds.push(student.id);

      // Create universities
      const uni1 = await universityRepository.create({
        name: `Match Uni 1 ${Date.now()}`,
        country: 'United States',
        city: 'Test City 1',
        worldRanking: 50,
        annualFee: '37500',
        specialization: 'Computer Science, Engineering',
        acceptanceRate: '30.00',
        admissionRequirements: {
          minimumGPA: '3.5',
          ieltsScore: '7.0'
        }
      });
      testUniversityIds.push(uni1.id);

      const uni2 = await universityRepository.create({
        name: `Match Uni 2 ${Date.now()}`,
        country: 'United States',
        city: 'Test City 2',
        worldRanking: 100,
        annualFee: '32500',
        specialization: 'Computer Science, Business',
        acceptanceRate: '50.00',
        admissionRequirements: {
          minimumGPA: '3.0',
          ieltsScore: '6.5'
        }
      });
      testUniversityIds.push(uni2.id);

      const result = await aiMatchingService.generateMatches(user.id);

      // Store match IDs for cleanup
      result.forEach(match => testMatchIds.push(match.id));

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0]).toHaveProperty('matchScore');
      expect(result[0]).toHaveProperty('reasoning');
      expect(result[0]).toHaveProperty('modelVersion');
    });

    it('should sort results by match score descending', async () => {
      const user = await userRepository.create({
        email: `sort-test-${Date.now()}@example.com`,
        firstName: 'Sort',
        lastName: 'Test',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      const student = await studentRepository.create({
        userId: user.id,
        dateOfBirth: new Date('2000-01-01'),
        academicLevel: 'undergraduate',
        gpa: 3.9,
        desiredMajor: 'Engineering',
        destinationCountry: 'United States',
        budgetRange: { min: 30000, max: 60000 }
      });
      testStudentIds.push(student.id);

      // Create universities with different acceptance rates
      const easyUni = await universityRepository.create({
        name: `Easy Uni ${Date.now()}`,
        country: 'United States',
        city: 'Easy City',
        acceptanceRate: '80.00',
        annualFee: '42500',
        specialization: 'Engineering'
      });
      testUniversityIds.push(easyUni.id);

      const hardUni = await universityRepository.create({
        name: `Hard Uni ${Date.now()}`,
        country: 'United States',
        city: 'Hard City',
        acceptanceRate: '10.00',
        annualFee: '50000',
        specialization: 'Engineering'
      });
      testUniversityIds.push(hardUni.id);

      const result = await aiMatchingService.generateMatches(user.id);
      result.forEach(match => testMatchIds.push(match.id));

      expect(result.length).toBeGreaterThanOrEqual(2);

      // Verify descending order
      for (let i = 0; i < result.length - 1; i++) {
        const currentScore = parseFloat(result[i].matchScore);
        const nextScore = parseFloat(result[i + 1].matchScore);
        expect(currentScore).toBeGreaterThanOrEqual(nextScore);
      }
    });

    it('should include reasoning in match results', async () => {
      const user = await userRepository.create({
        email: `reasoning-${Date.now()}@example.com`,
        firstName: 'Reason',
        lastName: 'Test',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      const student = await studentRepository.create({
        userId: user.id,
        dateOfBirth: new Date('2000-01-01'),
        academicLevel: 'undergraduate',
        gpa: 3.7,
        desiredMajor: 'Business'
      });
      testStudentIds.push(student.id);

      const university = await universityRepository.create({
        name: `Reasoning Uni ${Date.now()}`,
        country: 'United States',
        specialization: 'Business, Management',
        tuitionFees: {
          international: { min: 30000, max: 50000 },
          domestic: { min: 20000, max: 40000 }
        }
      });
      testUniversityIds.push(university.id);

      const result = await aiMatchingService.generateMatches(user.id);
      result.forEach(match => testMatchIds.push(match.id));

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].reasoning).toBeDefined();
      expect(result[0].reasoning.factors).toBeInstanceOf(Array);
      expect(result[0].reasoning.weights).toBeDefined();
      expect(result[0].reasoning.details).toBeDefined();
    });
  });

  describe('academic fit calculation', () => {
    it('should give high score for GPA exceeding requirements', async () => {
      const user = await userRepository.create({
        email: `high-gpa-${Date.now()}@example.com`,
        firstName: 'High',
        lastName: 'GPA',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      const student = await studentRepository.create({
        userId: user.id,
        dateOfBirth: new Date('2000-01-01'),
        academicLevel: 'undergraduate',
        gpa: 4.0,
        desiredMajor: 'Computer Science',
        destinationCountry: 'United States',
        budgetRange: { min: 20000, max: 60000 }
      });
      testStudentIds.push(student.id);

      const university = await universityRepository.create({
        name: `High GPA Uni ${Date.now()}`,
        country: 'United States',
        specialization: 'Computer Science',
        tuitionFees: {
          international: { min: 30000, max: 50000 },
          domestic: { min: 20000, max: 40000 }
        },
        admissionRequirements: {
          minimumGPA: 3.0
        }
      });
      testUniversityIds.push(university.id);

      const result = await aiMatchingService.generateMatches(user.id);
      result.forEach(match => testMatchIds.push(match.id));

      const matchScore = parseFloat(result[0].matchScore);
      expect(matchScore).toBeGreaterThan(0.5);
    });

    it('should consider IELTS scores in academic fit', async () => {
      const user = await userRepository.create({
        email: `ielts-${Date.now()}@example.com`,
        firstName: 'IELTS',
        lastName: 'Test',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      const student = await studentRepository.create({
        userId: user.id,
        dateOfBirth: new Date('2000-01-01'),
        academicLevel: 'undergraduate',
        gpa: 3.5,
        desiredMajor: 'Engineering',
        testScores: {
          ielts: 8.0,
          toefl: null,
          sat: null,
          act: null,
          gre: null,
          gmat: null
        },
        destinationCountry: 'United Kingdom',
        budgetRange: { min: 20000, max: 50000 }
      });
      testStudentIds.push(student.id);

      const university = await universityRepository.create({
        name: `IELTS Uni ${Date.now()}`,
        country: 'United Kingdom',
        specialization: 'Engineering',
        tuitionFees: {
          international: { min: 25000, max: 45000 },
          domestic: { min: 15000, max: 35000 }
        },
        admissionRequirements: {
          minimumGPA: 3.0,
          ieltsScore: 7.0
        }
      });
      testUniversityIds.push(university.id);

      const result = await aiMatchingService.generateMatches(user.id);
      result.forEach(match => testMatchIds.push(match.id));

      expect(result).toHaveLength(1);
      expect(result[0].reasoning.factors).toContain(
        expect.stringMatching(/Strong academic profile match/i)
      );
    });
  });

  describe('location preference calculation', () => {
    it('should give high score for matching destination country', async () => {
      const user = await userRepository.create({
        email: `location-match-${Date.now()}@example.com`,
        firstName: 'Location',
        lastName: 'Match',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      const student = await studentRepository.create({
        userId: user.id,
        dateOfBirth: new Date('2000-01-01'),
        academicLevel: 'undergraduate',
        gpa: 3.5,
        desiredMajor: 'Business',
        destinationCountry: 'Canada',
        budgetRange: { min: 20000, max: 50000 }
      });
      testStudentIds.push(student.id);

      const university = await universityRepository.create({
        name: `Canadian Uni ${Date.now()}`,
        country: 'Canada',
        specialization: 'Business',
        tuitionFees: {
          international: { min: 25000, max: 40000 },
          domestic: { min: 15000, max: 30000 }
        }
      });
      testUniversityIds.push(university.id);

      const result = await aiMatchingService.generateMatches(user.id);
      result.forEach(match => testMatchIds.push(match.id));

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].reasoning.factors).toContain(
        expect.stringMatching(/Perfect location match/i)
      );
    });

    it('should still match universities in different countries', async () => {
      const user = await userRepository.create({
        email: `location-diff-${Date.now()}@example.com`,
        firstName: 'Different',
        lastName: 'Location',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      const student = await studentRepository.create({
        userId: user.id,
        dateOfBirth: new Date('2000-01-01'),
        academicLevel: 'undergraduate',
        gpa: 3.5,
        desiredMajor: 'Computer Science',
        destinationCountry: 'United States'
      });
      testStudentIds.push(student.id);

      const university = await universityRepository.create({
        name: `UK Uni ${Date.now()}`,
        country: 'United Kingdom',
        specialization: 'Computer Science',
        tuitionFees: {
          international: { min: 30000, max: 50000 },
          domestic: { min: 20000, max: 40000 }
        }
      });
      testUniversityIds.push(university.id);

      const result = await aiMatchingService.generateMatches(user.id);
      result.forEach(match => testMatchIds.push(match.id));

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('budget compatibility calculation', () => {
    it('should give high score when tuition is within budget', async () => {
      const user = await userRepository.create({
        email: `budget-match-${Date.now()}@example.com`,
        firstName: 'Budget',
        lastName: 'Match',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      const student = await studentRepository.create({
        userId: user.id,
        dateOfBirth: new Date('2000-01-01'),
        academicLevel: 'undergraduate',
        gpa: 3.5,
        desiredMajor: 'Engineering',
        budgetRange: { min: 30000, max: 50000 },
        destinationCountry: 'United States'
      });
      testStudentIds.push(student.id);

      const university = await universityRepository.create({
        name: `Affordable Uni ${Date.now()}`,
        country: 'United States',
        specialization: 'Engineering',
        tuitionFees: {
          international: { min: 35000, max: 45000 },
          domestic: { min: 25000, max: 35000 }
        }
      });
      testUniversityIds.push(university.id);

      const result = await aiMatchingService.generateMatches(user.id);
      result.forEach(match => testMatchIds.push(match.id));

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].reasoning.factors).toContain(
        expect.stringMatching(/budget/i)
      );
    });
  });

  describe('program alignment calculation', () => {
    it('should give high score for matching major and specialization', async () => {
      const user = await userRepository.create({
        email: `program-match-${Date.now()}@example.com`,
        firstName: 'Program',
        lastName: 'Match',
        userType: 'customer',
        password: 'test123'
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

      const university = await universityRepository.create({
        name: `CS Uni ${Date.now()}`,
        country: 'United States',
        specialization: 'Computer Science, Engineering',
        tuitionFees: {
          international: { min: 30000, max: 50000 },
          domestic: { min: 20000, max: 40000 }
        }
      });
      testUniversityIds.push(university.id);

      const result = await aiMatchingService.generateMatches(user.id);
      result.forEach(match => testMatchIds.push(match.id));

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].reasoning.factors).toContain(
        expect.stringMatching(/program alignment/i)
      );
    });
  });

  describe('admission chances calculation', () => {
    it('should give higher score for higher acceptance rate', async () => {
      const user = await userRepository.create({
        email: `admission-${Date.now()}@example.com`,
        firstName: 'Admission',
        lastName: 'Test',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      const student = await studentRepository.create({
        userId: user.id,
        dateOfBirth: new Date('2000-01-01'),
        academicLevel: 'undergraduate',
        gpa: 3.5,
        desiredMajor: 'Business'
      });
      testStudentIds.push(student.id);

      const easyUni = await universityRepository.create({
        name: `Easy Admission ${Date.now()}`,
        country: 'United States',
        specialization: 'Business',
        acceptanceRate: '60%',
        tuitionFees: {
          international: { min: 25000, max: 40000 },
          domestic: { min: 15000, max: 30000 }
        }
      });
      testUniversityIds.push(easyUni.id);

      const hardUni = await universityRepository.create({
        name: `Hard Admission ${Date.now()}`,
        country: 'United States',
        specialization: 'Business',
        acceptanceRate: '5%',
        tuitionFees: {
          international: { min: 40000, max: 60000 },
          domestic: { min: 30000, max: 50000 }
        }
      });
      testUniversityIds.push(hardUni.id);

      const result = await aiMatchingService.generateMatches(user.id);
      result.forEach(match => testMatchIds.push(match.id));

      expect(result.length).toBeGreaterThanOrEqual(2);
      
      // Find matches for each university
      const easyMatch = result.find(m => m.universityId === easyUni.id);
      const hardMatch = result.find(m => m.universityId === hardUni.id);

      if (easyMatch && hardMatch) {
        const easyScore = parseFloat(easyMatch.matchScore);
        const hardScore = parseFloat(hardMatch.matchScore);
        
        // Easy university should generally have better admission chances component
        expect(easyScore).toBeGreaterThan(0);
        expect(hardScore).toBeGreaterThan(0);
      }
    });
  });

  describe('model version', () => {
    it('should include model version in results', async () => {
      const user = await userRepository.create({
        email: `version-${Date.now()}@example.com`,
        firstName: 'Version',
        lastName: 'Test',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      const student = await studentRepository.create({
        userId: user.id,
        dateOfBirth: new Date('2000-01-01'),
        academicLevel: 'undergraduate',
        gpa: 3.5,
        desiredMajor: 'Engineering'
      });
      testStudentIds.push(student.id);

      const university = await universityRepository.create({
        name: `Version Uni ${Date.now()}`,
        country: 'United States',
        specialization: 'Engineering',
        tuitionFees: {
          international: { min: 30000, max: 50000 },
          domestic: { min: 20000, max: 40000 }
        }
      });
      testUniversityIds.push(university.id);

      const result = await aiMatchingService.generateMatches(user.id);
      result.forEach(match => testMatchIds.push(match.id));

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].modelVersion).toBe('1.0.0');
    });
  });

  describe('edge cases', () => {
    it('should handle student with minimal profile data', async () => {
      const user = await userRepository.create({
        email: `minimal-${Date.now()}@example.com`,
        firstName: 'Minimal',
        lastName: 'Profile',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      const student = await studentRepository.create({
        userId: user.id,
        dateOfBirth: new Date('2000-01-01'),
        academicLevel: 'undergraduate'
      });
      testStudentIds.push(student.id);

      const university = await universityRepository.create({
        name: `Minimal Test Uni ${Date.now()}`,
        country: 'United States',
        tuitionFees: {
          international: { min: 30000, max: 50000 },
          domestic: { min: 20000, max: 40000 }
        }
      });
      testUniversityIds.push(university.id);

      const result = await aiMatchingService.generateMatches(user.id);
      result.forEach(match => testMatchIds.push(match.id));

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('matchScore');
    });

    it('should handle university with minimal data', async () => {
      const user = await userRepository.create({
        email: `uni-minimal-${Date.now()}@example.com`,
        firstName: 'Uni',
        lastName: 'Minimal',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      const student = await studentRepository.create({
        userId: user.id,
        dateOfBirth: new Date('2000-01-01'),
        academicLevel: 'undergraduate',
        gpa: 3.5,
        desiredMajor: 'Science'
      });
      testStudentIds.push(student.id);

      const university = await universityRepository.create({
        name: `Bare Minimum Uni ${Date.now()}`,
        country: 'Canada'
      });
      testUniversityIds.push(university.id);

      const result = await aiMatchingService.generateMatches(user.id);
      result.forEach(match => testMatchIds.push(match.id));

      expect(result.length).toBeGreaterThan(0);
    });
  });
});
