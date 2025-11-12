import { BaseRepository } from './base.repository';
import { 
  PartnerCommission, 
  InsertPartnerCommission, 
  partnerCommissions 
} from '@shared/schema';
import { db } from '../db';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { handleDatabaseError } from './errors';

export interface IPartnerCommissionRepository {
  findById(id: string): Promise<PartnerCommission>;
  findByIdOptional(id: string): Promise<PartnerCommission | undefined>;
  findByPartnerId(partnerId: string): Promise<PartnerCommission[]>;
  findPendingByPartnerId(partnerId: string): Promise<PartnerCommission[]>;
  findByPayoutId(payoutId: string): Promise<PartnerCommission[]>;
  create(data: InsertPartnerCommission): Promise<PartnerCommission>;
  update(id: string, data: Partial<PartnerCommission>): Promise<PartnerCommission>;
  approve(commissionId: string, adminId: string): Promise<void>;
  reject(commissionId: string, adminId: string, reason: string): Promise<void>;
  markAsPaid(commissionId: string, payoutId: string): Promise<void>;
}

export class PartnerCommissionRepository 
  extends BaseRepository<PartnerCommission, InsertPartnerCommission> 
  implements IPartnerCommissionRepository 
{
  constructor() {
    super(partnerCommissions, 'id');
  }

  async findByPartnerId(partnerId: string): Promise<PartnerCommission[]> {
    try {
      return await db
        .select()
        .from(partnerCommissions)
        .where(eq(partnerCommissions.partnerId, partnerId))
        .orderBy(desc(partnerCommissions.createdAt)) as PartnerCommission[];
    } catch (error) {
      handleDatabaseError(error, 'PartnerCommissionRepository.findByPartnerId');
    }
  }

  async findPendingByPartnerId(partnerId: string): Promise<PartnerCommission[]> {
    try {
      return await db
        .select()
        .from(partnerCommissions)
        .where(
          and(
            eq(partnerCommissions.partnerId, partnerId),
            eq(partnerCommissions.status, 'pending'),
            isNull(partnerCommissions.payoutId)
          )
        )
        .orderBy(desc(partnerCommissions.createdAt)) as PartnerCommission[];
    } catch (error) {
      handleDatabaseError(error, 'PartnerCommissionRepository.findPendingByPartnerId');
    }
  }

  async findByPayoutId(payoutId: string): Promise<PartnerCommission[]> {
    try {
      return await db
        .select()
        .from(partnerCommissions)
        .where(eq(partnerCommissions.payoutId, payoutId))
        .orderBy(desc(partnerCommissions.createdAt)) as PartnerCommission[];
    } catch (error) {
      handleDatabaseError(error, 'PartnerCommissionRepository.findByPayoutId');
    }
  }

  async approve(commissionId: string, adminId: string): Promise<void> {
    try {
      await db
        .update(partnerCommissions)
        .set({ 
          status: 'approved',
          approvedBy: adminId,
          approvedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(partnerCommissions.id, commissionId));
    } catch (error) {
      handleDatabaseError(error, 'PartnerCommissionRepository.approve');
    }
  }

  async reject(commissionId: string, adminId: string, reason: string): Promise<void> {
    try {
      await db
        .update(partnerCommissions)
        .set({ 
          status: 'rejected',
          statusReason: reason,
          rejectedBy: adminId,
          rejectedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(partnerCommissions.id, commissionId));
    } catch (error) {
      handleDatabaseError(error, 'PartnerCommissionRepository.reject');
    }
  }

  async markAsPaid(commissionId: string, payoutId: string): Promise<void> {
    try {
      await db
        .update(partnerCommissions)
        .set({ 
          status: 'paid',
          payoutId,
          paidAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(partnerCommissions.id, commissionId));
    } catch (error) {
      handleDatabaseError(error, 'PartnerCommissionRepository.markAsPaid');
    }
  }
}

export const partnerCommissionRepository = new PartnerCommissionRepository();
