import { BaseService } from '../base.service';
import { IUserRepository, IStudentRepository } from '../../repositories';
import { container, TYPES } from '../container';
import { ITemporaryPasswordService } from './temporaryPassword.service';
import { User, StudentProfile } from '@shared/schema';
import * as bcrypt from 'bcrypt';
import {
  AuthenticationError,
  ResourceNotFoundError,
  InvalidOperationError,
  ValidationServiceError
} from '../errors';
import { CommonValidators } from '../validation/validators';

export interface IUserProfileService {
  getUserById(userId: string): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserProfile(userId: string): Promise<{ user: User; profile?: StudentProfile }>;
  getStudentProfileFlat(studentId: string): Promise<StudentProfile>;
  updateUserProfile(userId: string, data: Partial<User>): Promise<User>;
  updateStudentProfile(userId: string, data: Partial<StudentProfile>): Promise<StudentProfile>;
  changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void>;
  resetUserPassword(userId: string): Promise<{ user: User; plainPassword: string }>;
}

export class UserProfileService extends BaseService implements IUserProfileService {
  constructor(
    private userRepository: IUserRepository = container.get<IUserRepository>(TYPES.IUserRepository),
    private studentRepository: IStudentRepository = container.get<IStudentRepository>(TYPES.IStudentRepository)
  ) {
    super();
  }

  private get temporaryPasswordService(): ITemporaryPasswordService {
    return container.get<ITemporaryPasswordService>(TYPES.ITemporaryPasswordService);
  }

  async getUserById(userId: string): Promise<User> {
    try {
      const user = await this.userRepository.findById(userId);
      return this.sanitizeUser(user);
    } catch (error) {
      return this.handleError(error, 'UserProfileService.getUserById');
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const user = await this.userRepository.findByEmail(email);
      return user ? this.sanitizeUser(user) : undefined;
    } catch (error) {
      return this.handleError(error, 'UserProfileService.getUserByEmail');
    }
  }

  async getUserProfile(userId: string): Promise<{ user: User; profile?: StudentProfile }> {
    try {
      const user = await this.getUserById(userId);
      let profile;

      if (user.userType === 'customer') {
        profile = await this.studentRepository.findByUserId(userId);
      }

      return { user, profile };
    } catch (error) {
      return this.handleError(error, 'UserProfileService.getUserProfile');
    }
  }

  /**
   * Get flattened student profile by student profile ID
   * Merges user data and student profile data into a single flat object
   * This matches the StudentProfile type expected by the frontend
   */
  async getStudentProfileFlat(studentId: string): Promise<StudentProfile> {
    try {
      // Get student profile from studentProfiles table
      const profile = await this.studentRepository.findById(studentId);
      
      // Get associated user data from users table
      const user = await this.getUserById(profile.userId);

      // Convert database dates to ISO strings
      const formatDate = (date: Date | null | undefined): string | null => {
        if (!date) return null;
        return date instanceof Date ? date.toISOString() : String(date);
      };

      // Merge user and profile data into flat structure matching StudentProfile type
      const flattenedProfile: any = {
        // Profile ID fields
        id: profile.id,
        userId: profile.userId,
        
        // User fields (from users table)
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email,
        
        // Student profile fields (from studentProfiles table)
        phone: profile.phone,
        dateOfBirth: formatDate(profile.dateOfBirth),
        nationality: profile.nationality,
        currentEducationLevel: profile.currentEducationLevel,
        institutionName: profile.institutionName,
        gpa: profile.gpa ? Number(profile.gpa) : null,
        academicScoringType: profile.academicScoringType,
        intendedMajor: profile.intendedMajor,
        preferredCountries: profile.preferredCountries,
        destinationCountry: profile.destinationCountry,
        intakeYear: profile.intakeYear,
        status: profile.status || 'inquiry',
        assignedCounselorId: profile.assignedCounselorId,
        academicInterests: profile.academicInterests,
        extracurriculars: profile.extracurriculars,
        createdAt: formatDate(profile.createdAt) || new Date().toISOString(),
        updatedAt: formatDate(profile.updatedAt),
        
        // Nested JSONB fields
        personalDetails: profile.personalDetails,
        academicDetails: profile.academicDetails,
        workDetails: profile.workDetails,
        testScores: profile.testScores,
        studyPreferences: profile.studyPreferences,
        universityPreferences: profile.universityPreferences,
        financialInfo: profile.financialInfo,
        visaHistory: profile.visaHistory,
        familyDetails: profile.familyDetails,
        additionalInfo: profile.additionalInfo,
        
        // Extended properties for backward compatibility
        budgetRange: profile.budgetRange,
        workExperience: profile.workExperience,
        familyInfo: profile.familyInfo,
        educationHistory: profile.educationHistory,
      };

      return flattenedProfile;
    } catch (error) {
      return this.handleError(error, 'UserProfileService.getStudentProfileFlat');
    }
  }

  async updateUserProfile(userId: string, data: Partial<User>): Promise<User> {
    try {
      const errors: Record<string, string> = {};

      // Validate email if provided
      if (data.email !== undefined) {
        const emailValidation = CommonValidators.validateEmail(data.email);
        if (!emailValidation.valid) {
          errors.email = emailValidation.error || 'Invalid email';
        }
      }

      // Validate name fields if provided
      if (data.firstName !== undefined && data.firstName !== null) {
        if (typeof data.firstName === 'string' && data.firstName.trim().length < 1) {
          errors.firstName = 'First name cannot be empty';
        }
      }

      if (data.lastName !== undefined && data.lastName !== null) {
        if (typeof data.lastName === 'string' && data.lastName.trim().length < 1) {
          errors.lastName = 'Last name cannot be empty';
        }
      }

      // Prevent direct password updates (use changePassword method instead)
      if (data.password !== undefined) {
        errors.password = 'Use changePassword method to update password';
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('User Profile', errors);
      }

      const updated = await this.userRepository.update(userId, data);
      return this.sanitizeUser(updated);
    } catch (error) {
      return this.handleError(error, 'UserProfileService.updateUserProfile');
    }
  }

  async updateStudentProfile(userId: string, data: Partial<StudentProfile>): Promise<StudentProfile> {
    try {
      const profile = await this.studentRepository.findByUserId(userId);
      if (!profile) {
        throw new ResourceNotFoundError('Student Profile', userId);
      }

      const errors: Record<string, string> = {};

      // Validate date of birth if provided
      if (data.dateOfBirth !== undefined) {
        const dobDate = typeof data.dateOfBirth === 'string' 
          ? new Date(data.dateOfBirth) 
          : data.dateOfBirth;

        if (!(dobDate instanceof Date) || isNaN(dobDate.getTime())) {
          errors.dateOfBirth = 'Invalid date of birth';
        } else {
          const dobValidation = CommonValidators.validatePastDate(dobDate);
          if (!dobValidation.valid) {
            errors.dateOfBirth = dobValidation.error || 'Date of birth must be in the past';
          }
        }
      }

      // Validate GPA if provided (validate based on academicScoringType)
      if (data.gpa !== undefined && data.gpa !== null) {
        const gpaNum = typeof data.gpa === 'string' ? parseFloat(data.gpa) : Number(data.gpa);
        const scoringType = data.academicScoringType || 'gpa';
        
        let gpaValidation;
        if (scoringType === 'percentage') {
          gpaValidation = CommonValidators.validateRange(gpaNum, 0, 100, 'Percentage');
          if (!gpaValidation.valid) {
            errors.gpa = gpaValidation.error || 'Percentage must be between 0 and 100';
          }
        } else if (scoringType === 'gpa' || scoringType === 'grade') {
          gpaValidation = CommonValidators.validateRange(gpaNum, 0, 10, 'Score');
          if (!gpaValidation.valid) {
            errors.gpa = gpaValidation.error || 'Score must be between 0 and 10';
          }
        }
      }

      // Validate phone if provided
      if (data.phone !== undefined && data.phone) {
        const phoneValidation = CommonValidators.validatePhoneNumber(data.phone);
        if (!phoneValidation.valid) {
          errors.phone = phoneValidation.error || 'Invalid phone number';
        }
      }

      // Validate nationality if provided
      if (data.nationality !== undefined && data.nationality) {
        const nationalityValidation = CommonValidators.validateStringLength(data.nationality, 1, 100, 'Nationality');
        if (!nationalityValidation.valid) {
          errors.nationality = nationalityValidation.error || 'Invalid nationality';
        }
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Student Profile', errors);
      }

      // Handle date conversion if dateOfBirth is a string
      const dataWithDate = data.dateOfBirth && typeof data.dateOfBirth === 'string'
        ? { ...data, dateOfBirth: new Date(data.dateOfBirth) }
        : data;

      const updated = await this.studentRepository.update(profile.id, dataWithDate);
      return updated;
    } catch (error) {
      return this.handleError(error, 'UserProfileService.updateStudentProfile');
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);

      if (!user.password) {
        throw new InvalidOperationError('change password', 'No password is set for this account');
      }

      const isValid = await bcrypt.compare(oldPassword, user.password);
      if (!isValid) {
        throw new AuthenticationError('Current password is incorrect');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.userRepository.update(userId, { password: hashedPassword });
    } catch (error) {
      return this.handleError(error, 'UserProfileService.changePassword');
    }
  }

  async resetUserPassword(userId: string): Promise<{ user: User; plainPassword: string }> {
    try {
      const user = await this.userRepository.findById(userId);

      const { plainPassword, encryptedPassword } = await this.temporaryPasswordService.generateAndEncryptTempPassword();
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const updated = await this.userRepository.update(userId, {
        password: hashedPassword,
        temporaryPassword: encryptedPassword
      });

      return {
        user: this.sanitizeUser(updated),
        plainPassword
      };
    } catch (error) {
      return this.handleError(error, 'UserProfileService.resetUserPassword');
    }
  }
}

export const userProfileService = new UserProfileService();
