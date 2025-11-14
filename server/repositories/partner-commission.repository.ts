import { BaseRepository, DbOrTransaction } from './base.repository';
import { 
  PartnerCommission, 
  InsertPartnerCommission, 
  partnerCommissions 
} from '@shared/schema';
import { db } from '../db';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { handleDatabaseError } from './errors';

export interface IPartnerCommissionRepository {
  findById(id: string, tx?: DbOrTransaction): Promise<PartnerCommission>;
  findByIdOptional(id: string, tx?: DbOrTransaction): Promise<PartnerCommission | undefined>;
  findByPartnerId(partnerId: string, tx?: DbOrTransaction): Promise<PartnerCommission[]>;
  findPendingByPartnerId(partnerId: string, tx?: DbOrTransaction): Promise<PartnerCommission[]>;
  findByPayoutId(payoutId: string, tx?: DbOrTransaction): Promise<PartnerCommission[]>;
  findByReferralId(referralId: string, tx?: DbOrTransaction): Promise<PartnerCommission | undefined>;
  create(data: InsertPartnerCommission, tx?: DbOrTransaction): Promise<PartnerCommission>;
  update(id: string, data: Partial<PartnerCommission>, tx?: DbOrTransaction): Promise<PartnerCommission>;
  approve(commissionId: string, adminId: string, tx?: DbOrTransaction): Promise<void>;
  reject(commissionId: string, adminId: string, reason: string, tx?: DbOrTransaction): Promise<void>;
  markAsPaid(commissionId: string, payoutId: string, tx?: DbOrTransaction): Promise<void>;
}

export class PartnerCommissionRepository 
  extends BaseRepository<PartnerCommission, InsertPartnerCommission> 
  implements IPartnerCommissionRepository 
{
  constructor() {
    super(partnerCommissions, 'id');
  }

  async findByPartnerId(partnerId: string, tx?: DbOrTransaction): Promise<PartnerCommission[]> {
    try {
      const executor = tx || db;
      return await executor
        .select()
        .from(partnerCommissions)
        .where(eq(partnerCommissions.partnerId, partnerId))
        .orderBy(desc(partnerCommissions.createdAt)) as PartnerCommission[];
    } catch (error) {
      handleDatabaseError(error, 'PartnerCommissionRepository.findByPartnerId');
    }
  }

  async findPendingByPartnerId(partnerId: string, tx?: DbOrTransaction): Promise<PartnerCommission[]> {
    try {
      const executor = tx || db;
      return await executor
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

  async findByPayoutId(payoutId: string, tx?: DbOrTransaction): Promise<PartnerCommission[]> {
    try {
      const executor = tx || db;
      return await executor
        .select()
        .from(partnerCommissions)
        .where(eq(partnerCommissions.payoutId, payoutId))
        .orderBy(desc(partnerCommissions.createdAt)) as PartnerCommission[];
    } catch (error) {
      handleDatabaseError(error, 'PartnerCommissionRepository.findByPayoutId');
    }
  }

  async findByReferralId(referralId: string, tx?: DbOrTransaction): Promise<PartnerCommission | undefined> {
    try {
      const executor = tx || db;
      const results = await executor
        .select()
        .from(partnerCommissions)
        .where(eq(partnerCommissions.referralId, referralId))
        .limit(1);
      return results[0] as PartnerCommission | undefined;
    } catch (error) {
      handleDatabaseError(error, 'PartnerCommissionRepository.findByReferralId');
    }
  }

  async approve(commissionId: string, adminId: string, tx?: DbOrTransaction): Promise<void> {
    try {
      const executor = tx || db;
      await executor
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

  async reject(commissionId: string, adminId: string, reason: string, tx?: DbOrTransaction): Promise<void> {
    try {
      const executor = tx || db;
      await executor
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

  async markAsPaid(commissionId: string, payoutId: string, tx?: DbOrTransaction): Promise<void> {
    try {
      const executor = tx || db;
      await executor
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
