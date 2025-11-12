import { BaseRepository } from './base.repository';
import { 
  PartnerStudentReferral, 
  InsertPartnerStudentReferral, 
  partnerStudentReferrals 
} from '@shared/schema';
import { db } from '../db';
import { eq, desc } from 'drizzle-orm';
import { handleDatabaseError } from './errors';

export interface IPartnerStudentReferralRepository {
  findById(id: string): Promise<PartnerStudentReferral>;
  findByIdOptional(id: string): Promise<PartnerStudentReferral | undefined>;
  findByPartnerId(partnerId: string): Promise<PartnerStudentReferral[]>;
  findByStudentId(studentId: string): Promise<PartnerStudentReferral | undefined>;
  create(data: InsertPartnerStudentReferral): Promise<PartnerStudentReferral>;
  update(id: string, data: Partial<PartnerStudentReferral>): Promise<PartnerStudentReferral>;
  updateStatus(referralId: string, status: string, statusReason?: string): Promise<void>;
  updateCommission(referralId: string, commissionAmount: number, commissionStatus: string): Promise<void>;
}

export class PartnerStudentReferralRepository 
  extends BaseRepository<PartnerStudentReferral, InsertPartnerStudentReferral> 
  implements IPartnerStudentReferralRepository 
{
  constructor() {
    super(partnerStudentReferrals, 'id');
  }

  async findByPartnerId(partnerId: string): Promise<PartnerStudentReferral[]> {
    try {
      return await db
        .select()
        .from(partnerStudentReferrals)
        .where(eq(partnerStudentReferrals.partnerId, partnerId))
        .orderBy(desc(partnerStudentReferrals.createdAt)) as PartnerStudentReferral[];
    } catch (error) {
      handleDatabaseError(error, 'PartnerStudentReferralRepository.findByPartnerId');
    }
  }

  async findByStudentId(studentId: string): Promise<PartnerStudentReferral | undefined> {
    try {
      const results = await db
        .select()
        .from(partnerStudentReferrals)
        .where(eq(partnerStudentReferrals.studentId, studentId))
        .limit(1);
      return results[0];
    } catch (error) {
      handleDatabaseError(error, 'PartnerStudentReferralRepository.findByStudentId');
    }
  }

  async updateStatus(referralId: string, status: string, statusReason?: string): Promise<void> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date()
      };

      if (statusReason) {
        updateData.statusReason = statusReason;
      }

      await db
        .update(partnerStudentReferrals)
        .set(updateData)
        .where(eq(partnerStudentReferrals.id, referralId));
    } catch (error) {
      handleDatabaseError(error, 'PartnerStudentReferralRepository.updateStatus');
    }
  }

  async updateCommission(referralId: string, commissionAmount: number, commissionStatus: string): Promise<void> {
    try {
      await db
        .update(partnerStudentReferrals)
        .set({ 
          commissionAmount: commissionAmount.toString(),
          commissionStatus,
          updatedAt: new Date()
        })
        .where(eq(partnerStudentReferrals.id, referralId));
    } catch (error) {
      handleDatabaseError(error, 'PartnerStudentReferralRepository.updateCommission');
    }
  }
}

export const partnerStudentReferralRepository = new PartnerStudentReferralRepository();
