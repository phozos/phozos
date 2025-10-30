import { BaseService } from '../base.service';
import { IUserRepository } from '../../repositories';
import { container, TYPES } from '../container';
import { User, InsertUser } from '@shared/schema';
import { DuplicateResourceError, ResourceNotFoundError, InvalidOperationError, ValidationServiceError } from '../errors';
import { CommonValidators } from '../validation';
import type { IForumService } from './forum.service';
import { temporaryPasswordService } from './temporaryPassword.service';
import * as bcrypt from 'bcrypt';

export interface CompanyStats {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  engagementRate: string;
}

export interface ICompanyProfileService {
  getCompanyProfile(companyId: string): Promise<User>;
  getCompanyProfileByEmail(email: string): Promise<User | undefined>;
  updateCompanyProfile(companyId: string, data: Partial<User>): Promise<User>;
  createCompanyProfile(data: InsertUser & { companyName?: string; description?: string }): Promise<{ user: User; temporaryPassword?: string }>;
  getCompanyStats(userId: string): Promise<CompanyStats>;
}

export class CompanyProfileService extends BaseService implements ICompanyProfileService {
  constructor(
    private userRepo: IUserRepository = container.get<IUserRepository>(TYPES.IUserRepository)
  ) {
    super();
  }

  async getCompanyProfile(companyId: string): Promise<User> {
    try {
      const company = await this.userRepo.findById(companyId);
      
      if (company.userType !== 'company_profile') {
        throw new InvalidOperationError('get company profile', 'User is not a company profile');
      }

      return this.sanitizeUser(company);
    } catch (error) {
      return this.handleError(error, 'CompanyProfileService.getCompanyProfile');
    }
  }

  async getCompanyProfileByEmail(email: string): Promise<User | undefined> {
    try {
      const user = await this.userRepo.findByEmail(email);
      
      if (!user) {
        return undefined;
      }

      if (user.userType !== 'company_profile') {
        return undefined;
      }

      return this.sanitizeUser(user);
    } catch (error) {
      return this.handleError(error, 'CompanyProfileService.getCompanyProfileByEmail');
    }
  }

  async updateCompanyProfile(companyId: string, data: Partial<User>): Promise<User> {
    try {
      const company = await this.userRepo.findById(companyId);
      
      if (company.userType !== 'company_profile') {
        throw new InvalidOperationError('update company profile', 'User is not a company profile');
      }

      const errors: Record<string, string> = {};

      if (data.email !== undefined) {
        const emailValidation = CommonValidators.validateEmail(data.email);
        if (!emailValidation.valid) {
          errors.email = emailValidation.error!;
        }
      }

      if (data.firstName !== undefined && data.firstName !== null) {
        const firstNameValidation = CommonValidators.validateStringLength(data.firstName, 1, 100, 'First name');
        if (!firstNameValidation.valid) {
          errors.firstName = firstNameValidation.error!;
        }
      }

      if (data.lastName !== undefined && data.lastName !== null) {
        const lastNameValidation = CommonValidators.validateStringLength(data.lastName, 1, 100, 'Last name');
        if (!lastNameValidation.valid) {
          errors.lastName = lastNameValidation.error!;
        }
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Company Profile', errors);
      }

      const updated = await this.userRepo.update(companyId, data);
      
      if (!updated) {
        throw new ResourceNotFoundError('Company Profile', companyId);
      }

      return this.sanitizeUser(updated);
    } catch (error) {
      return this.handleError(error, 'CompanyProfileService.updateCompanyProfile');
    }
  }

  async createCompanyProfile(data: InsertUser & { companyName?: string; description?: string }): Promise<{ user: User; temporaryPassword?: string }> {
    try {
      this.validateRequired(data, ['email', 'firstName', 'lastName']);

      const existingUser = await this.userRepo.findByEmail(data.email);
      if (existingUser) {
        throw new DuplicateResourceError('User', 'email', data.email);
      }

      let temporaryPassword: string | undefined;
      let hashedPassword: string;

      if (data.password) {
        hashedPassword = await bcrypt.hash(data.password, 10);
      } else {
        // Use standardized TempPasswordService for secure password generation
        const { plainPassword, encryptedPassword } = await temporaryPasswordService.generateAndEncryptTempPassword();
        temporaryPassword = plainPassword;
        hashedPassword = encryptedPassword;
      }

      const user = await this.userRepo.create({
        ...data,
        password: hashedPassword,
        userType: 'company_profile',
        accountStatus: 'active'
      });

      return { user: this.sanitizeUser(user), temporaryPassword };
    } catch (error) {
      return this.handleError(error, 'CompanyProfileService.createCompanyProfile');
    }
  }

  async getCompanyStats(userId: string): Promise<CompanyStats> {
    try {
      const forumService = container.get<IForumService>(TYPES.IForumService);
      
      const posts = await forumService.getAllPosts({ authorId: userId }, userId);
      
      const totalPosts = posts.length;
      const totalLikes = posts.reduce((sum: number, post: any) => sum + (post.likesCount || 0), 0);
      const totalComments = posts.reduce((sum: number, post: any) => sum + (post.commentsCount || 0), 0);
      const totalViews = posts.reduce((sum: number, post: any) => sum + (post.viewsCount || 0), 0);
      const engagementRate = totalPosts > 0 
        ? ((totalLikes + totalComments) / totalPosts).toFixed(2) 
        : '0';

      return {
        totalPosts,
        totalLikes,
        totalComments,
        totalViews,
        engagementRate
      };
    } catch (error) {
      return this.handleError(error, 'CompanyProfileService.getCompanyStats');
    }
  }
}

export const companyProfileService = new CompanyProfileService();
