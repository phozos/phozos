import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegistrationService } from '../registration.service';
import { ValidationServiceError, DuplicateResourceError, InvalidOperationError } from '../../errors';
import * as bcrypt from 'bcrypt';

// Mock dependencies
const mockUserRepo = {
  findByEmail: vi.fn(),
  create: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findAll: vi.fn()
};

const mockStudentRepo = {
  create: vi.fn(),
  findByUserId: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  findAll: vi.fn()
};

const mockAdminStaffInvitationService = {
  claimAndInvalidateInvitationToken: vi.fn()
};

describe('RegistrationService', () => {
  let registrationService: RegistrationService;

  beforeEach(() => {
    vi.clearAllMocks();
    registrationService = new RegistrationService(mockUserRepo as any, mockStudentRepo as any);
  });

  describe('validateRegistrationData', () => {
    it('should validate correct email and password', () => {
      expect(() => {
        registrationService.validateRegistrationData('test@example.com', 'ValidPass123!');
      }).not.toThrow();
    });

    it('should throw ValidationServiceError for invalid email', () => {
      expect(() => {
        registrationService.validateRegistrationData('invalid-email', 'ValidPass123!');
      }).toThrow(ValidationServiceError);
    });

    it('should throw ValidationServiceError for weak password', () => {
      expect(() => {
        registrationService.validateRegistrationData('test@example.com', 'weak');
      }).toThrow(ValidationServiceError);
    });
  });

  describe('registerStudent', () => {
    it('should successfully register a new student', async () => {
      const mockUser = {
        id: '123',
        email: 'student@test.com',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer',
        accountStatus: 'active'
      };

      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue(mockUser);
      mockStudentRepo.create.mockResolvedValue({ userId: '123' });

      const result = await registrationService.registerStudent({
        email: 'student@test.com',
        password: 'ValidPass123!',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer',
        profile: {
          userId: '',
          phone: '+1234567890'
        } as any
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('student@test.com');
      expect(mockUserRepo.create).toHaveBeenCalled();
      expect(mockStudentRepo.create).toHaveBeenCalled();
    });

    it('should throw DuplicateResourceError if email exists', async () => {
      mockUserRepo.findByEmail.mockResolvedValue({ id: '123', email: 'existing@test.com' });

      await expect(
        registrationService.registerStudent({
          email: 'existing@test.com',
          password: 'ValidPass123!',
          firstName: 'John',
          lastName: 'Doe',
          profile: {} as any
        })
      ).rejects.toThrow(DuplicateResourceError);
    });
  });

  describe('createCompanyProfile', () => {
    it('should create company profile with provided password', async () => {
      const mockUser = {
        id: '123',
        email: 'company@test.com',
        firstName: 'Company',
        lastName: 'Admin',
        userType: 'company_profile'
      };

      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue(mockUser);

      const result = await registrationService.createCompanyProfile({
        email: 'company@test.com',
        password: 'CompanyPass123!',
        firstName: 'Company',
        lastName: 'Admin',
        companyName: 'Test Corp'
      });

      expect(result.user).toBeDefined();
      expect(result.temporaryPassword).toBeUndefined();
      expect(mockUserRepo.create).toHaveBeenCalled();
    });

    it('should generate temporary password if not provided', async () => {
      const mockUser = {
        id: '123',
        email: 'company@test.com',
        userType: 'company_profile'
      };

      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue(mockUser);

      const result = await registrationService.createCompanyProfile({
        email: 'company@test.com',
        firstName: 'Company',
        lastName: 'Admin',
        companyName: 'Test Corp'
      });

      expect(result.user).toBeDefined();
      expect(result.temporaryPassword).toBeDefined();
      expect(typeof result.temporaryPassword).toBe('string');
    });

    it('should throw DuplicateResourceError if company email exists', async () => {
      mockUserRepo.findByEmail.mockResolvedValue({ id: '123', email: 'existing@company.com' });

      await expect(
        registrationService.createCompanyProfile({
          email: 'existing@company.com',
          firstName: 'Company',
          lastName: 'Admin'
        })
      ).rejects.toThrow(DuplicateResourceError);
    });
  });

  describe('createDefaultStudentProfile', () => {
    it('should create default student profile with phone', () => {
      const profile = registrationService.createDefaultStudentProfile('+1234567890');
      
      expect(profile.phone).toBe('+1234567890');
      expect(profile.userId).toBe('');
      expect(profile.dateOfBirth).toBeNull();
      expect(profile.preferredCountries).toEqual([]);
    });

    it('should create default student profile without phone', () => {
      const profile = registrationService.createDefaultStudentProfile();
      
      expect(profile.phone).toBeNull();
      expect(Array.isArray(profile.academicInterests)).toBe(true);
    });
  });

  describe('registerStaffWithInvite', () => {
    it('should successfully register staff with valid invitation', async () => {
      const mockUser = {
        id: '123',
        email: 'staff@test.com',
        userType: 'team_member',
        teamRole: 'counselor'
      };

      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue(mockUser);
      
      // Mock the adminStaffInvitationService
      vi.mock('../admin', () => ({
        adminStaffInvitationService: {
          claimAndInvalidateInvitationToken: vi.fn().mockResolvedValue({ id: 'invite-123', token: 'valid-token' })
        }
      }));

      const result = await registrationService.registerStaffWithInvite({
        email: 'staff@test.com',
        password: 'StaffPass123!',
        firstName: 'Staff',
        lastName: 'Member',
        teamRole: 'counselor',
        invitationToken: 'valid-token'
      });

      expect(result.user).toBeDefined();
      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'staff@test.com',
          userType: 'team_member',
          teamRole: 'counselor'
        })
      );
    });

    it('should throw DuplicateResourceError if staff email exists', async () => {
      mockUserRepo.findByEmail.mockResolvedValue({ id: '123', email: 'existing@staff.com' });

      await expect(
        registrationService.registerStaffWithInvite({
          email: 'existing@staff.com',
          password: 'StaffPass123!',
          firstName: 'Staff',
          lastName: 'Member',
          teamRole: 'counselor',
          invitationToken: 'valid-token'
        })
      ).rejects.toThrow(DuplicateResourceError);
    });
  });

  describe('registerStudentComplete', () => {
    it('should register student and return cooling period info', async () => {
      const mockUser = {
        id: '123',
        email: 'student@test.com',
        firstName: 'John',
        lastName: 'Doe',
        userType: 'customer',
        createdAt: new Date()
      };

      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue(mockUser);
      mockStudentRepo.create.mockResolvedValue({ userId: '123' });

      const result = await registrationService.registerStudentComplete(
        'student@test.com',
        'ValidPass123!',
        'John',
        'Doe',
        '+1234567890'
      );

      expect(result.message).toContain('Registration successful');
      expect(result.userId).toBe('123');
      expect(result.coolingPeriod).toBeDefined();
      expect(result.coolingPeriodEnds).toBeDefined();
    });
  });
});
