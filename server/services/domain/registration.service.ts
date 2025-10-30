import { BaseService } from '../base.service';
import { IUserRepository, IStudentRepository } from '../../repositories';
import { container, TYPES } from '../container';
import { IValidationService } from '../infrastructure/validation.service';
import { IAdminStaffInvitationService } from './admin';
import * as bcrypt from 'bcrypt';
import { User, InsertUser, InsertStudentProfile } from '@shared/schema';
import {
  ValidationServiceError,
  DuplicateResourceError,
  InvalidOperationError
} from '../errors';

export interface RegisterStudentDTO {
  message: string;
  userId: string;
  coolingPeriod: boolean;
  coolingPeriodEnds: Date | null;
}

export interface IRegistrationService {
  registerStudent(data: InsertUser & { profile: InsertStudentProfile }): Promise<{ user: User }>;
  registerStudentComplete(email: string, password: string, firstName: string, lastName: string, phone: string): Promise<RegisterStudentDTO>;
  createCompanyProfile(data: InsertUser & { companyName?: string; description?: string }): Promise<{ user: User; temporaryPassword?: string }>;
  registerStaffWithInvite(data: { email: string; password: string; firstName: string; lastName: string; teamRole: string; invitationToken: string }): Promise<{ user: User }>;
  validateRegistrationData(email: string, password: string): void;
  createDefaultStudentProfile(phone?: string): InsertStudentProfile;
}

export class RegistrationService extends BaseService implements IRegistrationService {
  constructor(
    private userRepo: IUserRepository = container.get<IUserRepository>(TYPES.IUserRepository),
    private studentRepo: IStudentRepository = container.get<IStudentRepository>(TYPES.IStudentRepository)
  ) {
    super();
  }

  private get validationService(): IValidationService {
    return container.get<IValidationService>(TYPES.IValidationService);
  }

  private get adminStaffInvitationService(): IAdminStaffInvitationService {
    return container.get<IAdminStaffInvitationService>(TYPES.IAdminStaffInvitationService);
  }

  validateRegistrationData(email: string, password: string): void {
    // Validate email
    const emailValidation = this.validationService.validateEmail(email);
    if (!emailValidation.valid) {
      throw new ValidationServiceError('Registration', {
        email: emailValidation.error || 'Invalid email format'
      });
    }

    // Validate password
    const passwordValidation = this.validationService.validatePassword(password);
    if (!passwordValidation.valid) {
      throw new ValidationServiceError('Registration', {
        password: passwordValidation.error || 'Invalid password format'
      });
    }
  }

  async registerStudent(data: InsertUser & { profile: InsertStudentProfile }): Promise<{ user: User }> {
    try {
      this.validateRequired(data, ['email', 'password']);

      // Validate email and password
      this.validateRegistrationData(data.email, data.password!);

      const existingUser = await this.userRepo.findByEmail(data.email);
      if (existingUser) {
        throw new DuplicateResourceError('User', 'email', data.email);
      }

      const hashedPassword = await bcrypt.hash(data.password!, 10);

      const user = await this.userRepo.create({
        ...data,
        password: hashedPassword,
        userType: data.userType || 'customer',
        accountStatus: 'active'
      });

      if (data.userType === 'customer' || !data.userType) {
        await this.studentRepo.create({
          ...data.profile,
          userId: user.id
        });
      }

      return { user: this.sanitizeUser(user) };
    } catch (error) {
      return this.handleError(error, 'RegistrationService.registerStudent');
    }
  }

  createDefaultStudentProfile(phone?: string): InsertStudentProfile {
    return {
      userId: '',
      phone: phone || null,
      dateOfBirth: null,
      nationality: null,
      currentEducationLevel: null,
      gpa: null,
      testScores: null,
      intendedMajor: null,
      preferredCountries: [],
      destinationCountry: null,
      intakeYear: null,
      budgetRange: null,
      academicInterests: [],
      extracurriculars: [],
      workExperience: [],
      familyInfo: null,
      educationHistory: [],
      notes: null
    };
  }

  /**
   * Complete student registration with cooling period info
   * Handles all business logic including email normalization, profile creation, and cooling period calculation
   */
  async registerStudentComplete(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone: string
  ): Promise<RegisterStudentDTO> {
    try {
      const emailLower = email.toLowerCase();
      const profile = this.createDefaultStudentProfile(phone);

      const result = await this.registerStudent({
        email: emailLower,
        password,
        firstName,
        lastName,
        userType: 'customer',
        accountStatus: 'active',
        profile
      });

      // Import authService to check cooling period
      const { authService } = await import('./auth.service');
      const coolingPeriod = authService.isInCoolingPeriod(result.user);
      const coolingPeriodEnds = authService.getCoolingPeriodEnd(result.user);

      return {
        message: 'Registration successful! You can now login. Note: Community posting is restricted for the first hour.',
        userId: result.user.id,
        coolingPeriod,
        coolingPeriodEnds
      };
    } catch (error) {
      return this.handleError(error, 'RegistrationService.registerStudentComplete');
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
        temporaryPassword = Math.random().toString(36).slice(-12);
        hashedPassword = await bcrypt.hash(temporaryPassword, 10);
      }

      const user = await this.userRepo.create({
        ...data,
        password: hashedPassword,
        userType: 'company_profile',
        accountStatus: 'active'
      });

      return { user: this.sanitizeUser(user), temporaryPassword };
    } catch (error) {
      return this.handleError(error, 'RegistrationService.createCompanyProfile');
    }
  }

  /**
   * Register staff member with invitation token
   * Uses atomic token claiming to prevent race conditions
   */
  async registerStaffWithInvite(data: { 
    email: string; 
    password: string; 
    firstName: string; 
    lastName: string; 
    teamRole: string; 
    invitationToken: string 
  }): Promise<{ user: User }> {
    try {
      const { email, password, firstName, lastName, teamRole, invitationToken } = data;
      
      // Check if user already exists first (before claiming token)
      const existingUser = await this.userRepo.findByEmail(email.toLowerCase());
      if (existingUser) {
        throw new DuplicateResourceError('User', 'email', email.toLowerCase());
      }
      
      // Validate registration data
      this.validateRegistrationData(email, password);
      
      // Atomically claim and invalidate the invitation token (prevents race conditions)
      const claimedLink = await this.adminStaffInvitationService.claimAndInvalidateInvitationToken(invitationToken);
      
      if (!claimedLink) {
        throw new InvalidOperationError('register staff', 'Invalid or expired invitation token');
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create staff user
      const user = await this.userRepo.create({
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        userType: 'team_member',
        teamRole: teamRole as any,
        accountStatus: 'active'
      });
      
      console.log(`👤 New staff member registered: ${email} (${teamRole}) via invite token`);
      
      return { user: this.sanitizeUser(user) };
    } catch (error) {
      return this.handleError(error, 'RegistrationService.registerStaffWithInvite');
    }
  }
}

export const registrationService = new RegistrationService();
