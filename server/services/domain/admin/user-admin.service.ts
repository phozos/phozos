import { BaseService } from '../../base.service';
import { IUserRepository } from '../../../repositories';
import { container, TYPES } from '../../container';
import { User } from '@shared/schema';
import {
  InvalidOperationError,
  ResourceNotFoundError,
  ValidationServiceError,
  AuthorizationError,
  DuplicateResourceError
} from '../../errors';
import { CommonValidators } from '../../validation';
import { temporaryPasswordService } from '../temporaryPassword.service';

export interface IAdminUserService {
  getAllUsers(): Promise<User[]>;
  updateUserAccountStatus(userId: string, status: string): Promise<User>;
  deleteUser(userId: string): Promise<boolean>;
  createTeamMemberWithPassword(
    adminId: string, 
    teamMemberData: { email: string; firstName: string; lastName: string; teamRole: 'admin' | 'counselor'; department?: string }
  ): Promise<{ user: any; temporaryPassword: string }>;
  getStaffMembers(): Promise<User[]>;
}

export class AdminUserService extends BaseService implements IAdminUserService {
  constructor(
    private userRepository: IUserRepository = container.get<IUserRepository>(TYPES.IUserRepository)
  ) {
    super();
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const users = await this.userRepository.findAll();
      return users.map(u => this.sanitizeUser(u));
    } catch (error) {
      return this.handleError(error, 'AdminUserService.getAllUsers');
    }
  }

  async updateUserAccountStatus(userId: string, status: string): Promise<User> {
    try {
      const errors: Record<string, string> = {};

      const userIdValidation = CommonValidators.validateUUID(userId, 'User ID');
      if (!userIdValidation.valid) {
        errors.userId = userIdValidation.error!;
      }

      const statusValidation = CommonValidators.validateStringLength(status, 1, 50, 'Account status');
      if (!statusValidation.valid) {
        errors.status = statusValidation.error!;
      } else {
        const validStatuses = ['active', 'inactive', 'pending_approval', 'suspended', 'rejected'];
        if (!validStatuses.includes(status)) {
          errors.status = `Status must be one of: ${validStatuses.join(', ')}`;
        }
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('User Account Status', errors);
      }

      const updated = await this.userRepository.update(userId, { accountStatus: status as any });
      if (!updated) {
        throw new InvalidOperationError('update account status', 'Account status update failed or user not found');
      }
      return this.sanitizeUser(updated);
    } catch (error) {
      return this.handleError(error, 'AdminUserService.updateUserAccountStatus');
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      const errors: Record<string, string> = {};

      const userIdValidation = CommonValidators.validateUUID(userId, 'User ID');
      if (!userIdValidation.valid) {
        errors.userId = userIdValidation.error!;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Delete User', errors);
      }

      return await this.userRepository.delete(userId);
    } catch (error) {
      return this.handleError(error, 'AdminUserService.deleteUser');
    }
  }

  async createTeamMemberWithPassword(
    adminId: string, 
    teamMemberData: { email: string; firstName: string; lastName: string; teamRole: 'admin' | 'counselor'; department?: string }
  ): Promise<{ user: any; temporaryPassword: string }> {
    try {
      // 1. Validate inputs
      const errors: Record<string, string> = {};

      const emailValidation = CommonValidators.validateEmail(teamMemberData.email);
      if (!emailValidation.valid) {
        errors.email = emailValidation.error!;
      }

      const firstNameValidation = CommonValidators.validateStringLength(
        teamMemberData.firstName, 
        1, 
        50,
        'First Name'
      );
      if (!firstNameValidation.valid) {
        errors.firstName = firstNameValidation.error!;
      }

      const lastNameValidation = CommonValidators.validateStringLength(
        teamMemberData.lastName, 
        1, 
        50,
        'Last Name'
      );
      if (!lastNameValidation.valid) {
        errors.lastName = lastNameValidation.error!;
      }

      const adminIdValidation = CommonValidators.validateUUID(adminId, 'Admin ID');
      if (!adminIdValidation.valid) {
        errors.adminId = adminIdValidation.error!;
      }

      const validTeamRoles = ['admin', 'counselor'];
      if (!validTeamRoles.includes(teamMemberData.teamRole)) {
        errors.teamRole = `Team role must be one of: ${validTeamRoles.join(', ')}`;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Team Member Creation', errors);
      }

      // 2. Verify admin permissions
      const admin = await this.userRepository.findById(adminId);
      if (!admin || admin.userType !== 'team_member' || admin.teamRole !== 'admin') {
        throw new AuthorizationError('Only admins can create team members');
      }

      // 3. Check for duplicate email
      const existingUser = await this.userRepository.findByEmail(
        teamMemberData.email.toLowerCase()
      );
      if (existingUser) {
        throw new DuplicateResourceError('User', 'email', teamMemberData.email);
      }

      // 4. Generate temporary password using standardized service (16 characters)
      const { plainPassword: temporaryPassword, encryptedPassword: hashedPassword } = 
        await temporaryPasswordService.generateAndEncryptTempPassword();

      // 5. Create team member
      const teamMember = await this.userRepository.create({
        email: teamMemberData.email.toLowerCase(),
        password: hashedPassword,
        firstName: teamMemberData.firstName,
        lastName: teamMemberData.lastName,
        userType: 'team_member',
        teamRole: teamMemberData.teamRole,
        accountStatus: 'active',
        profilePicture: null
      });

      // 6. Return sanitized user with temporary password
      const sanitizedUser = this.sanitizeUser(teamMember);
      
      return {
        user: sanitizedUser,
        temporaryPassword: temporaryPassword
      };
    } catch (error) {
      return this.handleError(error, 'AdminUserService.createTeamMemberWithPassword');
    }
  }

  async getStaffMembers(): Promise<User[]> {
    try {
      const allUsers = await this.userRepository.findAll();
      const staff = allUsers.filter(u => u.userType === 'team_member');
      return staff.map(u => this.sanitizeUser(u));
    } catch (error) {
      return this.handleError(error, 'AdminUserService.getStaffMembers');
    }
  }
}

// Export singleton instance
export const adminUserService = new AdminUserService();
