import { BaseRepository } from './base.repository';
import { 
  PartnerProfile, 
  InsertPartnerProfile, 
  partnerProfiles,
  users
} from '@shared/schema';
import { db } from '../db';
import { eq, desc, sql } from 'drizzle-orm';
import { handleDatabaseError } from './errors';
import { PartnerWithUser } from '@shared/types/partner-types';

export interface IPartnerProfileRepository {
  findById(id: string): Promise<PartnerProfile>;
  findByIdOptional(id: string): Promise<PartnerProfile | undefined>;
  findByUserId(userId: string): Promise<PartnerProfile | undefined>;
  findAll(): Promise<PartnerProfile[]>;
  findAllWithUserDetails(): Promise<PartnerWithUser[]>;
  findActive(): Promise<PartnerProfile[]>;
  findVerified(): Promise<PartnerProfile[]>;
  create(data: InsertPartnerProfile): Promise<PartnerProfile>;
  update(id: string, data: Partial<PartnerProfile>): Promise<PartnerProfile>;
  delete(id: string): Promise<boolean>;
  incrementReferralCount(partnerId: string): Promise<void>;
  incrementConversionCount(partnerId: string): Promise<void>;
  updateCommissionEarned(partnerId: string, amount: number): Promise<void>;
  updateCommissionPaid(partnerId: string, amount: number): Promise<void>;
}

export class PartnerProfileRepository 
  extends BaseRepository<PartnerProfile, InsertPartnerProfile> 
  implements IPartnerProfileRepository 
{
  constructor() {
    super(partnerProfiles, 'id');
  }

  async findByUserId(userId: string): Promise<PartnerProfile | undefined> {
    try {
      const results = await db
        .select()
        .from(partnerProfiles)
        .where(eq(partnerProfiles.userId, userId))
        .limit(1);
      return results[0];
    } catch (error) {
      handleDatabaseError(error, 'PartnerProfileRepository.findByUserId');
    }
  }

  async findAllWithUserDetails(): Promise<PartnerWithUser[]> {
    try {
      const results = await db
        .select({
          id: partnerProfiles.id,
          userId: partnerProfiles.userId,
          companyName: partnerProfiles.companyName,
          businessType: partnerProfiles.businessType,
          registrationNumber: partnerProfiles.registrationNumber,
          taxId: partnerProfiles.taxId,
          contactPerson: partnerProfiles.contactPerson,
          phone: partnerProfiles.phone,
          whatsappNumber: partnerProfiles.whatsappNumber,
          website: partnerProfiles.website,
          address: partnerProfiles.address,
          commissionRate: partnerProfiles.commissionRate,
          commissionType: partnerProfiles.commissionType,
          fixedCommissionAmount: partnerProfiles.fixedCommissionAmount,
          payoutMethod: partnerProfiles.payoutMethod,
          bankDetails: partnerProfiles.bankDetails,
          paypalEmail: partnerProfiles.paypalEmail,
          minimumPayoutAmount: partnerProfiles.minimumPayoutAmount,
          totalReferrals: partnerProfiles.totalReferrals,
          totalConversions: partnerProfiles.totalConversions,
          totalCommissionEarned: partnerProfiles.totalCommissionEarned,
          totalCommissionPaid: partnerProfiles.totalCommissionPaid,
          isActive: partnerProfiles.isActive,
          isVerified: partnerProfiles.isVerified,
          verifiedAt: partnerProfiles.verifiedAt,
          verifiedBy: partnerProfiles.verifiedBy,
          logo: partnerProfiles.logo,
          bio: partnerProfiles.bio,
          createdAt: partnerProfiles.createdAt,
          updatedAt: partnerProfiles.updatedAt,
          userEmail: users.email,
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userAccountStatus: users.accountStatus,
          userCreatedAt: users.createdAt,
        })
        .from(partnerProfiles)
        .leftJoin(users, eq(partnerProfiles.userId, users.id))
        .orderBy(desc(partnerProfiles.createdAt));

      return results.map(row => ({
        id: row.id,
        userId: row.userId,
        companyName: row.companyName,
        businessType: row.businessType,
        registrationNumber: row.registrationNumber,
        taxId: row.taxId,
        contactPerson: row.contactPerson,
        phone: row.phone,
        whatsappNumber: row.whatsappNumber,
        website: row.website,
        address: row.address,
        commissionRate: row.commissionRate,
        commissionType: row.commissionType,
        fixedCommissionAmount: row.fixedCommissionAmount,
        payoutMethod: row.payoutMethod,
        bankDetails: row.bankDetails,
        paypalEmail: row.paypalEmail,
        minimumPayoutAmount: row.minimumPayoutAmount,
        totalReferrals: row.totalReferrals,
        totalConversions: row.totalConversions,
        totalCommissionEarned: row.totalCommissionEarned,
        totalCommissionPaid: row.totalCommissionPaid,
        isActive: row.isActive,
        isVerified: row.isVerified,
        verifiedAt: row.verifiedAt,
        verifiedBy: row.verifiedBy,
        logo: row.logo,
        bio: row.bio,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        user: {
          id: row.userId,
          email: row.userEmail || '',
          firstName: row.userFirstName,
          lastName: row.userLastName,
          accountStatus: row.userAccountStatus || 'pending_approval',
          createdAt: row.userCreatedAt || new Date(),
        },
      })) as PartnerWithUser[];
    } catch (error) {
      handleDatabaseError(error, 'PartnerProfileRepository.findAllWithUserDetails');
    }
  }

  async findActive(): Promise<PartnerProfile[]> {
    try {
      return await db
        .select()
        .from(partnerProfiles)
        .where(eq(partnerProfiles.isActive, true))
        .orderBy(desc(partnerProfiles.createdAt)) as PartnerProfile[];
    } catch (error) {
      handleDatabaseError(error, 'PartnerProfileRepository.findActive');
    }
  }

  async findVerified(): Promise<PartnerProfile[]> {
    try {
      return await db
        .select()
        .from(partnerProfiles)
        .where(eq(partnerProfiles.isVerified, true))
        .orderBy(desc(partnerProfiles.createdAt)) as PartnerProfile[];
    } catch (error) {
      handleDatabaseError(error, 'PartnerProfileRepository.findVerified');
    }
  }

  async incrementReferralCount(partnerId: string): Promise<void> {
    try {
      await db
        .update(partnerProfiles)
        .set({ 
          totalReferrals: sql`${partnerProfiles.totalReferrals} + 1`,
          updatedAt: new Date()
        })
        .where(eq(partnerProfiles.id, partnerId));
    } catch (error) {
      handleDatabaseError(error, 'PartnerProfileRepository.incrementReferralCount');
    }
  }

  async incrementConversionCount(partnerId: string): Promise<void> {
    try {
      await db
        .update(partnerProfiles)
        .set({ 
          totalConversions: sql`${partnerProfiles.totalConversions} + 1`,
          updatedAt: new Date()
        })
        .where(eq(partnerProfiles.id, partnerId));
    } catch (error) {
      handleDatabaseError(error, 'PartnerProfileRepository.incrementConversionCount');
    }
  }

  async updateCommissionEarned(partnerId: string, amount: number): Promise<void> {
    try {
      await db
        .update(partnerProfiles)
        .set({ 
          totalCommissionEarned: sql`${partnerProfiles.totalCommissionEarned} + ${amount}`,
          updatedAt: new Date()
        })
        .where(eq(partnerProfiles.id, partnerId));
    } catch (error) {
      handleDatabaseError(error, 'PartnerProfileRepository.updateCommissionEarned');
    }
  }

  async updateCommissionPaid(partnerId: string, amount: number): Promise<void> {
    try {
      await db
        .update(partnerProfiles)
        .set({ 
          totalCommissionPaid: sql`${partnerProfiles.totalCommissionPaid} + ${amount}`,
          updatedAt: new Date()
        })
        .where(eq(partnerProfiles.id, partnerId));
    } catch (error) {
      handleDatabaseError(error, 'PartnerProfileRepository.updateCommissionPaid');
    }
  }
}

export const partnerProfileRepository = new PartnerProfileRepository();
