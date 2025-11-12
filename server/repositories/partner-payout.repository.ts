import { BaseRepository } from './base.repository';
import { 
  PartnerPayout, 
  InsertPartnerPayout, 
  partnerPayouts 
} from '@shared/schema';
import { db } from '../db';
import { eq, desc } from 'drizzle-orm';
import { handleDatabaseError } from './errors';

export interface IPartnerPayoutRepository {
  findById(id: string): Promise<PartnerPayout>;
  findByIdOptional(id: string): Promise<PartnerPayout | undefined>;
  findByPartnerId(partnerId: string): Promise<PartnerPayout[]>;
  create(data: InsertPartnerPayout): Promise<PartnerPayout>;
  update(id: string, data: Partial<PartnerPayout>): Promise<PartnerPayout>;
  updateStatus(payoutId: string, status: string, statusReason?: string): Promise<void>;
  complete(payoutId: string, adminId: string): Promise<void>;
}

export class PartnerPayoutRepository 
  extends BaseRepository<PartnerPayout, InsertPartnerPayout> 
  implements IPartnerPayoutRepository 
{
  constructor() {
    super(partnerPayouts, 'id');
  }

  async findByPartnerId(partnerId: string): Promise<PartnerPayout[]> {
    try {
      return await db
        .select()
        .from(partnerPayouts)
        .where(eq(partnerPayouts.partnerId, partnerId))
        .orderBy(desc(partnerPayouts.createdAt)) as PartnerPayout[];
    } catch (error) {
      handleDatabaseError(error, 'PartnerPayoutRepository.findByPartnerId');
    }
  }

  async updateStatus(payoutId: string, status: string, statusReason?: string): Promise<void> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date()
      };

      if (statusReason) {
        updateData.statusReason = statusReason;
      }

      if (status === 'processing') {
        updateData.processedAt = new Date();
      }

      await db
        .update(partnerPayouts)
        .set(updateData)
        .where(eq(partnerPayouts.id, payoutId));
    } catch (error) {
      handleDatabaseError(error, 'PartnerPayoutRepository.updateStatus');
    }
  }

  async complete(payoutId: string, adminId: string): Promise<void> {
    try {
      await db
        .update(partnerPayouts)
        .set({ 
          status: 'completed',
          processedBy: adminId,
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(partnerPayouts.id, payoutId));
    } catch (error) {
      handleDatabaseError(error, 'PartnerPayoutRepository.complete');
    }
  }
}

export const partnerPayoutRepository = new PartnerPayoutRepository();
