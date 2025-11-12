import { BaseRepository } from './base.repository';
import { 
  PartnerReferralLink, 
  InsertPartnerReferralLink, 
  partnerReferralLinks 
} from '@shared/schema';
import { db } from '../db';
import { eq, and, sql, desc } from 'drizzle-orm';
import { handleDatabaseError } from './errors';

export interface IPartnerReferralLinkRepository {
  findById(id: string): Promise<PartnerReferralLink>;
  findByIdOptional(id: string): Promise<PartnerReferralLink | undefined>;
  findByLinkCode(linkCode: string): Promise<PartnerReferralLink | undefined>;
  findByPartnerId(partnerId: string): Promise<PartnerReferralLink[]>;
  findActiveByPartnerId(partnerId: string): Promise<PartnerReferralLink[]>;
  create(data: InsertPartnerReferralLink): Promise<PartnerReferralLink>;
  update(id: string, data: Partial<PartnerReferralLink>): Promise<PartnerReferralLink>;
  delete(id: string): Promise<boolean>;
  incrementClickCount(linkId: string, isUnique: boolean): Promise<void>;
  incrementConversionCount(linkId: string): Promise<void>;
  updateLastClickedAt(linkId: string): Promise<void>;
  generateUniqueLinkCode(length: number): Promise<string>;
}

export class PartnerReferralLinkRepository 
  extends BaseRepository<PartnerReferralLink, InsertPartnerReferralLink> 
  implements IPartnerReferralLinkRepository 
{
  constructor() {
    super(partnerReferralLinks, 'id');
  }

  async findByLinkCode(linkCode: string): Promise<PartnerReferralLink | undefined> {
    try {
      const results = await db
        .select()
        .from(partnerReferralLinks)
        .where(eq(partnerReferralLinks.linkCode, linkCode))
        .limit(1);
      return results[0];
    } catch (error) {
      handleDatabaseError(error, 'PartnerReferralLinkRepository.findByLinkCode');
    }
  }

  async findByPartnerId(partnerId: string): Promise<PartnerReferralLink[]> {
    try {
      return await db
        .select()
        .from(partnerReferralLinks)
        .where(eq(partnerReferralLinks.partnerId, partnerId))
        .orderBy(desc(partnerReferralLinks.createdAt)) as PartnerReferralLink[];
    } catch (error) {
      handleDatabaseError(error, 'PartnerReferralLinkRepository.findByPartnerId');
    }
  }

  async findActiveByPartnerId(partnerId: string): Promise<PartnerReferralLink[]> {
    try {
      return await db
        .select()
        .from(partnerReferralLinks)
        .where(
          and(
            eq(partnerReferralLinks.partnerId, partnerId),
            eq(partnerReferralLinks.isActive, true)
          )
        )
        .orderBy(desc(partnerReferralLinks.createdAt)) as PartnerReferralLink[];
    } catch (error) {
      handleDatabaseError(error, 'PartnerReferralLinkRepository.findActiveByPartnerId');
    }
  }

  async incrementClickCount(linkId: string, isUnique: boolean): Promise<void> {
    try {
      const updateData: any = {
        clickCount: sql`${partnerReferralLinks.clickCount} + 1`,
        updatedAt: new Date()
      };

      if (isUnique) {
        updateData.uniqueClickCount = sql`${partnerReferralLinks.uniqueClickCount} + 1`;
      }

      await db
        .update(partnerReferralLinks)
        .set(updateData)
        .where(eq(partnerReferralLinks.id, linkId));
    } catch (error) {
      handleDatabaseError(error, 'PartnerReferralLinkRepository.incrementClickCount');
    }
  }

  async incrementConversionCount(linkId: string): Promise<void> {
    try {
      await db
        .update(partnerReferralLinks)
        .set({ 
          conversionCount: sql`${partnerReferralLinks.conversionCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(partnerReferralLinks.id, linkId));
    } catch (error) {
      handleDatabaseError(error, 'PartnerReferralLinkRepository.incrementConversionCount');
    }
  }

  async updateLastClickedAt(linkId: string): Promise<void> {
    try {
      await db
        .update(partnerReferralLinks)
        .set({ 
          lastClickedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(partnerReferralLinks.id, linkId));
    } catch (error) {
      handleDatabaseError(error, 'PartnerReferralLinkRepository.updateLastClickedAt');
    }
  }

  async generateUniqueLinkCode(length: number = 8): Promise<string> {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      let code = '';
      for (let i = 0; i < length; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      const existing = await this.findByLinkCode(code);
      if (!existing) {
        return code;
      }

      attempts++;
    }

    throw new Error('Failed to generate unique link code after multiple attempts');
  }
}

export const partnerReferralLinkRepository = new PartnerReferralLinkRepository();
