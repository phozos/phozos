import { BaseService } from '../../base.service';
import { IStaffInvitationRepository } from '../../../repositories';
import { container, TYPES } from '../../container';
import * as crypto from 'crypto';
import { ResourceNotFoundError, ValidationServiceError } from '../../errors';
import { CommonValidators } from '../../validation';

export interface IAdminStaffInvitationService {
  createStaffInvitationLink(adminId: string): Promise<any>;
  getStaffInvitationLinks(): Promise<any[]>;
  refreshStaffInvitationLink(linkId: string): Promise<any>;
  getStaffInviteInfo(token: string): Promise<any>;
  recordInviteLinkUsage(linkId: string): Promise<void>;
  invalidateInvitationLink(linkId: string): Promise<void>;
  claimAndInvalidateInvitationToken(token: string): Promise<any>;
}

export class AdminStaffInvitationService extends BaseService implements IAdminStaffInvitationService {
  constructor(
    private staffInvitationRepository: IStaffInvitationRepository = container.get<IStaffInvitationRepository>(TYPES.IStaffInvitationRepository)
  ) {
    super();
  }

  async createStaffInvitationLink(adminId: string): Promise<any> {
    try {
      const errors: Record<string, string> = {};

      const adminIdValidation = CommonValidators.validateUUID(adminId, 'Admin ID');
      if (!adminIdValidation.valid) {
        errors.adminId = adminIdValidation.error!;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Staff Invitation', errors);
      }

      const token = crypto.randomBytes(32).toString('hex');
      
      const invitationLink = await this.staffInvitationRepository.create({
        token,
        createdBy: adminId
      });
      
      return invitationLink;
    } catch (error) {
      return this.handleError(error, 'AdminStaffInvitationService.createStaffInvitationLink');
    }
  }

  async getStaffInvitationLinks(): Promise<any[]> {
    try {
      const links = await this.staffInvitationRepository.findAllActive();
      
      return links;
    } catch (error) {
      return this.handleError(error, 'AdminStaffInvitationService.getStaffInvitationLinks');
    }
  }

  async refreshStaffInvitationLink(linkId: string): Promise<any> {
    try {
      const errors: Record<string, string> = {};

      const linkIdValidation = CommonValidators.validateUUID(linkId, 'Link ID');
      if (!linkIdValidation.valid) {
        errors.linkId = linkIdValidation.error!;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Staff Invitation Link', errors);
      }

      const newToken = crypto.randomBytes(32).toString('hex');
      
      const updatedLink = await this.staffInvitationRepository.refreshToken(linkId, newToken);
      
      return updatedLink;
    } catch (error) {
      return this.handleError(error, 'AdminStaffInvitationService.refreshStaffInvitationLink');
    }
  }

  async getStaffInviteInfo(token: string): Promise<any> {
    try {
      const errors: Record<string, string> = {};

      const tokenValidation = CommonValidators.validateStringLength(token, 1, 255, 'Invitation token');
      if (!tokenValidation.valid) {
        errors.token = tokenValidation.error!;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Staff Invitation Token', errors);
      }

      const invitationLink = await this.staffInvitationRepository.findActiveByToken(token);
      
      if (!invitationLink) {
        throw new ResourceNotFoundError('Staff Invitation', token);
      }
      
      return invitationLink;
    } catch (error) {
      return this.handleError(error, 'AdminStaffInvitationService.getStaffInviteInfo');
    }
  }

  async recordInviteLinkUsage(linkId: string): Promise<void> {
    try {
      const errors: Record<string, string> = {};

      const linkIdValidation = CommonValidators.validateUUID(linkId, 'Link ID');
      if (!linkIdValidation.valid) {
        errors.linkId = linkIdValidation.error!;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Record Link Usage', errors);
      }

      await this.staffInvitationRepository.incrementUsageCount(linkId);
    } catch (error) {
      return this.handleError(error, 'AdminStaffInvitationService.recordInviteLinkUsage');
    }
  }

  async invalidateInvitationLink(linkId: string): Promise<void> {
    try {
      const errors: Record<string, string> = {};

      const linkIdValidation = CommonValidators.validateUUID(linkId, 'Link ID');
      if (!linkIdValidation.valid) {
        errors.linkId = linkIdValidation.error!;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Staff Invitation Link', errors);
      }

      await this.staffInvitationRepository.deactivate(linkId);
    } catch (error) {
      return this.handleError(error, 'AdminStaffInvitationService.invalidateInvitationLink');
    }
  }

  async claimAndInvalidateInvitationToken(token: string): Promise<any> {
    try {
      const errors: Record<string, string> = {};

      const tokenValidation = CommonValidators.validateStringLength(token, 1, 255, 'Invitation token');
      if (!tokenValidation.valid) {
        errors.token = tokenValidation.error!;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Claim Invitation Token', errors);
      }

      const claimedLink = await this.staffInvitationRepository.claimAndInvalidate(token);
      
      return claimedLink || null;
    } catch (error) {
      return this.handleError(error, 'AdminStaffInvitationService.claimAndInvalidateInvitationToken');
    }
  }
}

// Export singleton instance
export const adminStaffInvitationService = new AdminStaffInvitationService();
