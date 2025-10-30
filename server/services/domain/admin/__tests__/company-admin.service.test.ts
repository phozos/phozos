import { describe, it, expect, beforeEach } from 'vitest';
import { AdminCompanyService } from '../company-admin.service';

describe('AdminCompanyService', () => {
  let adminCompanyService: AdminCompanyService;

  beforeEach(() => {
    adminCompanyService = new AdminCompanyService();
  });

  describe('getCompanyProfiles', () => {
    it('should return all company profiles', async () => {
      const companies = await adminCompanyService.getCompanyProfiles();
      expect(Array.isArray(companies)).toBe(true);
    });
  });

  describe('updateCompanyProfile', () => {
    it('should update company profile', async () => {
      const userId = 'test-user-id';
      const updateData = { firstName: 'Updated Name' };
      
      const result = await adminCompanyService.updateCompanyProfile(userId, updateData);
      expect(result).toBeDefined();
    });
  });

  describe('resetCompanyPassword', () => {
    it('should reset company password', async () => {
      const companyId = 'test-company-id';
      const adminEmail = 'admin@test.com';
      
      const result = await adminCompanyService.resetCompanyPassword(companyId, adminEmail);
      expect(result).toBeDefined();
    });
  });
});
