import { BaseService } from '../../base.service';
import { IUserRepository } from '../../../repositories';
import { container, TYPES } from '../../container';
import { User } from '@shared/schema';
import {
  InvalidOperationError,
  ResourceNotFoundError,
  ValidationServiceError
} from '../../errors';
import { CommonValidators } from '../../validation';
import type { IUserProfileService } from '../user-profile.service';

export interface IAdminCompanyService {
  getCompanyProfiles(): Promise<User[]>;
  updateCompanyProfile(userId: string, data: Partial<User>): Promise<User>;
  resetCompanyPassword(companyId: string, adminEmail: string): Promise<any>;
  formatCompanyProfileResponse(user: User, companyName?: string, temporaryPassword?: string): any;
}

export class AdminCompanyService extends BaseService implements IAdminCompanyService {
  constructor(
    private userRepository: IUserRepository = container.get<IUserRepository>(TYPES.IUserRepository)
  ) {
    super();
  }

  // Lazy getter to resolve service from container, avoiding circular dependency
  private get userProfileService(): IUserProfileService {
    return container.get<IUserProfileService>(TYPES.IUserProfileService);
  }

  async getCompanyProfiles(): Promise<User[]> {
    try {
      const allUsers = await this.userRepository.findAll();
      const companies = allUsers.filter(u => u.userType === 'company_profile');
      return companies.map(u => this.sanitizeUser(u));
    } catch (error) {
      return this.handleError(error, 'AdminCompanyService.getCompanyProfiles');
    }
  }

  async updateCompanyProfile(userId: string, data: Partial<User>): Promise<User> {
    try {
      const errors: Record<string, string> = {};

      const userIdValidation = CommonValidators.validateUUID(userId, 'User ID');
      if (!userIdValidation.valid) {
        errors.userId = userIdValidation.error!;
      }

      if (data.email) {
        const emailValidation = CommonValidators.validateEmail(data.email);
        if (!emailValidation.valid) {
          errors.email = emailValidation.error!;
        }
      }

      if (data.firstName) {
        const firstNameValidation = CommonValidators.validateStringLength(data.firstName, 1, 50, 'First name');
        if (!firstNameValidation.valid) {
          errors.firstName = firstNameValidation.error!;
        }
      }

      if (data.lastName) {
        const lastNameValidation = CommonValidators.validateStringLength(data.lastName, 1, 50, 'Last name');
        if (!lastNameValidation.valid) {
          errors.lastName = lastNameValidation.error!;
        }
      }

      if (data.companyName) {
        const companyNameValidation = CommonValidators.validateStringLength(data.companyName, 1, 200, 'Company name');
        if (!companyNameValidation.valid) {
          errors.companyName = companyNameValidation.error!;
        }
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Company Profile', errors);
      }

      const updated = await this.userRepository.update(userId, data);
      if (!updated) {
        throw new InvalidOperationError('update company profile', 'Company profile update failed or user not found');
      }
      return this.sanitizeUser(updated);
    } catch (error) {
      return this.handleError(error, 'AdminCompanyService.updateCompanyProfile');
    }
  }

  async resetCompanyPassword(companyId: string, adminEmail: string): Promise<any> {
    try {
      const errors: Record<string, string> = {};

      const companyIdValidation = CommonValidators.validateUUID(companyId, 'Company ID');
      if (!companyIdValidation.valid) {
        errors.companyId = companyIdValidation.error!;
      }

      const adminEmailValidation = CommonValidators.validateEmail(adminEmail);
      if (!adminEmailValidation.valid) {
        errors.adminEmail = adminEmailValidation.error!;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Reset Company Password', errors);
      }

      const company = await this.userRepository.findById(companyId);
      
      if (!company || company.userType !== 'company_profile') {
        throw new ResourceNotFoundError('Company', companyId);
      }
      
      const { user, plainPassword } = await this.userProfileService.resetUserPassword(companyId);
      
      console.log(`🔐 Admin ${adminEmail} reset password for company ${company.email}`);
      
      return {
        success: true,
        message: 'Company password has been reset successfully',
        temporaryPassword: plainPassword,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.companyName,
        userType: user.userType
      };
    } catch (error) {
      return this.handleError(error, 'AdminCompanyService.resetCompanyPassword');
    }
  }

  formatCompanyProfileResponse(user: User, companyName?: string, temporaryPassword?: string): any {
    const response: any = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      userType: user.userType,
      accountStatus: user.accountStatus,
      createdAt: user.createdAt,
      companyName
    };

    if (temporaryPassword) {
      response.temporaryPassword = temporaryPassword;
    }

    return response;
  }
}

// Export singleton instance
export const adminCompanyService = new AdminCompanyService(
  container.get<IUserRepository>(TYPES.IUserRepository)
);
