import { BaseService } from '../base.service';
import {
  IPartnerProfileRepository,
  IPartnerReferralLinkRepository,
  IPartnerStudentReferralRepository,
  IPartnerCommissionRepository,
  IUserRepository
} from '../../repositories';
import { container, TYPES } from '../container';
import { PartnerProfile, InsertPartnerProfile, InsertUser, User } from '@shared/schema';
import {
  CreatePartnerRequest,
  UpdatePartnerProfileRequest,
  PartnerRegistrationResponse,
  PartnerDashboardStats,
  PartnerWithUser,
  DEFAULT_COMMISSION_RATE,
  COMMISSION_TYPES
} from '@shared/types/partner-types';
import {
  ValidationServiceError,
  ResourceNotFoundError,
  InvalidOperationError,
  DuplicateResourceError
} from '../errors';
import { IValidationService } from '../infrastructure/validation.service';
import * as bcrypt from 'bcrypt';

export interface IPartnerService {
  registerPartner(data: CreatePartnerRequest): Promise<PartnerRegistrationResponse>;
  getPartnerProfile(partnerId: string): Promise<PartnerProfile>;
  getPartnerByUserId(userId: string): Promise<PartnerProfile>;
  updatePartnerProfile(partnerId: string, updates: UpdatePartnerProfileRequest): Promise<PartnerProfile>;
  verifyPartner(partnerId: string, adminId: string): Promise<PartnerProfile>;
  deactivatePartner(partnerId: string, adminId: string, reason: string): Promise<PartnerProfile>;
  getAllPartners(): Promise<PartnerWithUser[]>;
  getDashboardStats(partnerId: string): Promise<PartnerDashboardStats>;
}

export class PartnerService extends BaseService implements IPartnerService {
  constructor(
    private partnerProfileRepo: IPartnerProfileRepository = container.get<IPartnerProfileRepository>(TYPES.IPartnerProfileRepository),
    private partnerReferralLinkRepo: IPartnerReferralLinkRepository = container.get<IPartnerReferralLinkRepository>(TYPES.IPartnerReferralLinkRepository),
    private partnerStudentReferralRepo: IPartnerStudentReferralRepository = container.get<IPartnerStudentReferralRepository>(TYPES.IPartnerStudentReferralRepository),
    private partnerCommissionRepo: IPartnerCommissionRepository = container.get<IPartnerCommissionRepository>(TYPES.IPartnerCommissionRepository),
    private userRepo: IUserRepository = container.get<IUserRepository>(TYPES.IUserRepository)
  ) {
    super();
  }

  private get validationService(): IValidationService {
    return container.get<IValidationService>(TYPES.IValidationService);
  }

  async registerPartner(data: CreatePartnerRequest): Promise<PartnerRegistrationResponse> {
    try {
      const errors: Record<string, string> = {};

      const emailValidation = this.validationService.validateEmail(data.email);
      if (!emailValidation.valid) {
        errors.email = emailValidation.error || 'Invalid email format';
      }

      const passwordValidation = this.validationService.validatePassword(data.password);
      if (!passwordValidation.valid) {
        errors.password = passwordValidation.error || 'Invalid password format';
      }

      if (!data.firstName?.trim()) {
        errors.firstName = 'First name is required';
      }

      if (!data.lastName?.trim()) {
        errors.lastName = 'Last name is required';
      }

      if (!data.companyName?.trim()) {
        errors.companyName = 'Company name is required';
      }

      if (!data.contactPerson?.trim()) {
        errors.contactPerson = 'Contact person is required';
      }

      if (!data.phone?.trim()) {
        errors.phone = 'Phone number is required';
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Partner Registration', errors);
      }

      const existingUser = await this.userRepo.findByEmail(data.email.toLowerCase());
      if (existingUser) {
        throw new DuplicateResourceError('User', 'email', data.email);
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      const userData: InsertUser = {
        email: data.email.toLowerCase(),
        password: hashedPassword,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        userType: 'partner',
        accountStatus: 'pending_approval'
      };

      const user = await this.userRepo.create(userData);

      const partnerData: InsertPartnerProfile = {
        userId: user.id,
        companyName: data.companyName.trim(),
        contactPerson: data.contactPerson.trim(),
        phone: data.phone.trim(),
        businessType: data.businessType || 'other',
        commissionRate: String(data.commissionRate || DEFAULT_COMMISSION_RATE),
        commissionType: 'percentage',
        isVerified: false,
        isActive: true
      };

      const partner = await this.partnerProfileRepo.create(partnerData);

      const linkCode = await this.partnerReferralLinkRepo.generateUniqueLinkCode(8);
      const linkUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/register?ref=${linkCode}`;
      
      const referralLink = await this.partnerReferralLinkRepo.create({
        partnerId: partner.id,
        linkCode,
        linkUrl,
        campaignName: 'Default',
        isActive: true
      });

      return {
        message: 'Partner registration successful. Your account is pending approval.',
        partnerId: partner.id,
        userId: user.id,
        referralLink: {
          linkCode: referralLink.linkCode,
          linkUrl: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/register?ref=${referralLink.linkCode}`
        }
      };
    } catch (error) {
      return this.handleError(error, 'PartnerService.registerPartner');
    }
  }

  async getPartnerProfile(partnerId: string): Promise<PartnerProfile> {
    try {
      return await this.partnerProfileRepo.findById(partnerId);
    } catch (error) {
      return this.handleError(error, 'PartnerService.getPartnerProfile');
    }
  }

  async getPartnerByUserId(userId: string): Promise<PartnerProfile> {
    try {
      const partner = await this.partnerProfileRepo.findByUserId(userId);
      if (!partner) {
        throw new ResourceNotFoundError('Partner profile', userId);
      }
      return partner;
    } catch (error) {
      return this.handleError(error, 'PartnerService.getPartnerByUserId');
    }
  }

  async updatePartnerProfile(partnerId: string, updates: UpdatePartnerProfileRequest): Promise<PartnerProfile> {
    try {
      const partner = await this.partnerProfileRepo.findById(partnerId);

      const updateData: Partial<PartnerProfile> = {};

      if (updates.companyName !== undefined) {
        updateData.companyName = updates.companyName.trim();
      }

      if (updates.contactPerson !== undefined) {
        updateData.contactPerson = updates.contactPerson.trim();
      }

      if (updates.phone !== undefined) {
        updateData.phone = updates.phone.trim();
      }

      if (updates.whatsappNumber !== undefined) {
        updateData.whatsappNumber = updates.whatsappNumber;
      }

      if (updates.website !== undefined) {
        updateData.website = updates.website;
      }

      if (updates.address !== undefined) {
        updateData.address = updates.address;
      }

      if (updates.bankDetails !== undefined) {
        updateData.bankDetails = updates.bankDetails;
      }

      if (updates.paypalEmail !== undefined) {
        updateData.paypalEmail = updates.paypalEmail;
      }

      if (updates.bio !== undefined) {
        updateData.bio = updates.bio;
      }

      updateData.updatedAt = new Date();

      return await this.partnerProfileRepo.update(partnerId, updateData);
    } catch (error) {
      return this.handleError(error, 'PartnerService.updatePartnerProfile');
    }
  }

  async verifyPartner(partnerId: string, adminId: string): Promise<PartnerProfile> {
    try {
      const partner = await this.partnerProfileRepo.findById(partnerId);

      if (partner.isVerified) {
        throw new InvalidOperationError('verify partner', 'Partner is already verified');
      }

      const updated = await this.partnerProfileRepo.update(partnerId, {
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: adminId,
        updatedAt: new Date()
      });

      await this.userRepo.update(partner.userId, {
        accountStatus: 'active'
      });

      return updated;
    } catch (error) {
      return this.handleError(error, 'PartnerService.verifyPartner');
    }
  }

  async deactivatePartner(partnerId: string, adminId: string, reason: string): Promise<PartnerProfile> {
    try {
      const partner = await this.partnerProfileRepo.findById(partnerId);

      const updated = await this.partnerProfileRepo.update(partnerId, {
        isActive: false,
        updatedAt: new Date()
      });

      await this.userRepo.update(partner.userId, {
        accountStatus: 'suspended'
      });

      return updated;
    } catch (error) {
      return this.handleError(error, 'PartnerService.deactivatePartner');
    }
  }

  async getAllPartners(): Promise<PartnerWithUser[]> {
    try {
      return await this.partnerProfileRepo.findAllWithUserDetails();
    } catch (error) {
      return this.handleError(error, 'PartnerService.getAllPartners');
    }
  }

  async getDashboardStats(partnerId: string): Promise<PartnerDashboardStats> {
    try {
      await this.partnerProfileRepo.findById(partnerId);

      const referrals = await this.partnerStudentReferralRepo.findByPartnerId(partnerId);
      const links = await this.partnerReferralLinkRepo.findActiveByPartnerId(partnerId);
      const commissions = await this.partnerCommissionRepo.findByPartnerId(partnerId);

      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const conversions = referrals.filter(r => r.status === 'converted' || r.status === 'paid');
      const currentMonthReferrals = referrals.filter(r => r.createdAt && new Date(r.createdAt) >= currentMonthStart);
      const currentMonthConversions = conversions.filter(r => r.createdAt && new Date(r.createdAt) >= currentMonthStart);

      const totalClicks = links.reduce((sum, link) => sum + (link.clickCount || 0), 0);
      const uniqueClicks = links.reduce((sum, link) => sum + (link.uniqueClickCount || 0), 0);

      const totalCommissionEarned = commissions
        .filter(c => c.status === 'approved' || c.status === 'paid')
        .reduce((sum, c) => sum + Number(c.commissionAmount), 0);

      const totalCommissionPaid = commissions
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + Number(c.commissionAmount), 0);

      const pendingCommission = commissions
        .filter(c => c.status === 'pending' || c.status === 'approved')
        .reduce((sum, c) => sum + Number(c.commissionAmount), 0);

      return {
        totalReferrals: referrals.length,
        totalConversions: conversions.length,
        conversionRate: referrals.length > 0 ? (conversions.length / referrals.length) * 100 : 0,
        totalClicks,
        uniqueClicks,
        clickToRegistrationRate: uniqueClicks > 0 ? (referrals.length / uniqueClicks) * 100 : 0,
        totalCommissionEarned,
        totalCommissionPaid,
        pendingCommission,
        currentMonthReferrals: currentMonthReferrals.length,
        currentMonthConversions: currentMonthConversions.length,
        activeLinks: links.length
      };
    } catch (error) {
      return this.handleError(error, 'PartnerService.getDashboardStats');
    }
  }
}

export const partnerService = new PartnerService();
