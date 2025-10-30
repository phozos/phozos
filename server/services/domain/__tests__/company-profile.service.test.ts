import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CompanyProfileService } from '../company-profile.service';
import { userRepository } from '../../../repositories/user.repository';

describe('CompanyProfileService', () => {
  let companyProfileService: CompanyProfileService;
  let testUserIds: string[] = [];

  beforeEach(() => {
    companyProfileService = new CompanyProfileService();
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

  describe('createCompanyProfile', () => {
    it('should create company profile successfully', async () => {
      const result = await companyProfileService.createCompanyProfile({
        email: `company-${Date.now()}@example.com`,
        firstName: 'Company',
        lastName: 'Admin',
        companyName: 'Test Company',
        description: 'A test company'
      });
      testUserIds.push(result.user.id);

      expect(result.user).toBeDefined();
      expect(result.user.userType).toBe('company_profile');
      expect(result.user.email).toContain('company-');
      expect(result.user.companyName).toBe('Test Company');
      expect(result.temporaryPassword).toBeDefined();
      expect(result.user.password).toBeUndefined(); // Should be sanitized
    });

    it('should create company profile with provided password', async () => {
      const result = await companyProfileService.createCompanyProfile({
        email: `company-${Date.now()}@example.com`,
        firstName: 'Company',
        lastName: 'Admin',
        password: 'SecurePassword123!',
        companyName: 'Test Company'
      });
      testUserIds.push(result.user.id);

      expect(result.user).toBeDefined();
      expect(result.temporaryPassword).toBeUndefined();
    });

    it('should throw error if email already exists', async () => {
      const email = `company-${Date.now()}@example.com`;
      const firstResult = await companyProfileService.createCompanyProfile({
        email,
        firstName: 'Company',
        lastName: 'Admin',
        companyName: 'Test Company'
      });
      testUserIds.push(firstResult.user.id);

      await expect(
        companyProfileService.createCompanyProfile({
          email,
          firstName: 'Another',
          lastName: 'Company',
          companyName: 'Another Company'
        })
      ).rejects.toThrow();
    });

    it('should throw validation error for missing required fields', async () => {
      await expect(
        companyProfileService.createCompanyProfile({
          email: `company-${Date.now()}@example.com`,
          // Missing firstName and lastName
        } as any)
      ).rejects.toThrow();
    });
  });

  describe('getCompanyProfile', () => {
    it('should return company profile by id', async () => {
      const created = await companyProfileService.createCompanyProfile({
        email: `company-${Date.now()}@example.com`,
        firstName: 'Company',
        lastName: 'Admin',
        companyName: 'Test Company'
      });
      testUserIds.push(created.user.id);

      const result = await companyProfileService.getCompanyProfile(created.user.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.user.id);
      expect(result.userType).toBe('company_profile');
      expect(result.password).toBeUndefined(); // Sanitized
    });

    it('should throw error if user is not a company profile', async () => {
      const user = await userRepository.create({
        email: `test-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      await expect(
        companyProfileService.getCompanyProfile(user.id)
      ).rejects.toThrow();
    });

    it('should throw error if company profile not found', async () => {
      await expect(
        companyProfileService.getCompanyProfile('00000000-0000-0000-0000-000000000001')
      ).rejects.toThrow();
    });
  });

  describe('getCompanyProfileByEmail', () => {
    it('should return company profile by email', async () => {
      const email = `company-${Date.now()}@example.com`;
      const created = await companyProfileService.createCompanyProfile({
        email,
        firstName: 'Company',
        lastName: 'Admin',
        companyName: 'Test Company'
      });
      testUserIds.push(created.user.id);

      const result = await companyProfileService.getCompanyProfileByEmail(email);

      expect(result).toBeDefined();
      expect(result?.email).toBe(email);
      expect(result?.userType).toBe('company_profile');
    });

    it('should return undefined if email not found', async () => {
      const result = await companyProfileService.getCompanyProfileByEmail('nonexistent@example.com');

      expect(result).toBeUndefined();
    });

    it('should return undefined if user is not a company profile', async () => {
      const email = `test-${Date.now()}@example.com`;
      const user = await userRepository.create({
        email,
        password: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      const result = await companyProfileService.getCompanyProfileByEmail(email);

      expect(result).toBeUndefined();
    });
  });

  describe('updateCompanyProfile', () => {
    it('should update company profile successfully', async () => {
      const created = await companyProfileService.createCompanyProfile({
        email: `company-${Date.now()}@example.com`,
        firstName: 'Company',
        lastName: 'Admin',
        companyName: 'Test Company'
      });
      testUserIds.push(created.user.id);

      const updated = await companyProfileService.updateCompanyProfile(created.user.id, {
        companyName: 'Updated Company Name',
        firstName: 'Updated'
      });

      expect(updated).toBeDefined();
      expect(updated.companyName).toBe('Updated Company Name');
      expect(updated.firstName).toBe('Updated');
    });

    it('should throw error if user is not a company profile', async () => {
      const user = await userRepository.create({
        email: `test-${Date.now()}@example.com`,
        password: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer'
      });
      testUserIds.push(user.id);

      await expect(
        companyProfileService.updateCompanyProfile(user.id, {
          companyName: 'Should Fail'
        })
      ).rejects.toThrow();
    });

    it('should throw error if company profile not found', async () => {
      await expect(
        companyProfileService.updateCompanyProfile('00000000-0000-0000-0000-000000000001', {
          companyName: 'Should Fail'
        })
      ).rejects.toThrow();
    });
  });
});
