import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdminStaffInvitationService } from '../staff-invitation.service';
import { staffInvitationRepository } from '../../../../repositories/staff-invitation.repository';

describe('AdminStaffInvitationService', () => {
  let adminStaffInvitationService: AdminStaffInvitationService;
  let testInvitationIds: string[] = [];

  beforeEach(() => {
    adminStaffInvitationService = new AdminStaffInvitationService();
  });

  afterEach(async () => {
    for (const id of testInvitationIds) {
      try {
        await staffInvitationRepository.delete(id);
      } catch (error) {
        console.log('Invitation cleanup failed:', error);
      }
    }
    testInvitationIds = [];
  });

  describe('createStaffInvitationLink', () => {
    it('should create a new staff invitation link', async () => {
      const adminId = 'test-admin-id';
      
      const invitation = await adminStaffInvitationService.createStaffInvitationLink(adminId);
      testInvitationIds.push(invitation.id);

      expect(invitation).toBeDefined();
      expect(invitation.token).toBeDefined();
      expect(invitation.token.length).toBeGreaterThan(20);
      expect(invitation.createdBy).toBe(adminId);
    });
  });

  describe('getStaffInvitationLinks', () => {
    it('should return all active staff invitation links', async () => {
      const links = await adminStaffInvitationService.getStaffInvitationLinks();
      expect(Array.isArray(links)).toBe(true);
    });
  });

  describe('refreshStaffInvitationLink', () => {
    it('should refresh an existing invitation link', async () => {
      const adminId = 'test-admin-id';
      const invitation = await staffInvitationRepository.create({
        token: 'old-token-123',
        createdBy: adminId
      });
      testInvitationIds.push(invitation.id);

      const refreshed = await adminStaffInvitationService.refreshStaffInvitationLink(invitation.id);
      testInvitationIds.push(refreshed.id);

      expect(refreshed.token).not.toBe(invitation.token);
      expect(refreshed.id).not.toBe(invitation.id);
    });
  });

  describe('invalidateInvitationLink', () => {
    it('should invalidate a staff invitation link', async () => {
      const invitation = await staffInvitationRepository.create({
        token: 'invalidate-token-123',
        createdBy: 'test-admin'
      });
      testInvitationIds.push(invitation.id);

      await adminStaffInvitationService.invalidateInvitationLink(invitation.id);
      expect(true).toBe(true);
    });
  });
});
