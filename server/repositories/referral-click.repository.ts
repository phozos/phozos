import { BaseRepository } from './base.repository';
import { 
  ReferralClick, 
  InsertReferralClick, 
  referralClicks 
} from '@shared/schema';
import { db } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { handleDatabaseError } from './errors';

export interface IReferralClickRepository {
  findById(id: string): Promise<ReferralClick>;
  findByIdOptional(id: string): Promise<ReferralClick | undefined>;
  findByReferralLinkId(referralLinkId: string): Promise<ReferralClick[]>;
  findByFingerprint(fingerprint: string): Promise<ReferralClick[]>;
  findByFingerprintAndLink(fingerprint: string, referralLinkId: string): Promise<ReferralClick | undefined>;
  create(data: InsertReferralClick): Promise<ReferralClick>;
  markAsConverted(clickId: string): Promise<void>;
}

export class ReferralClickRepository 
  extends BaseRepository<ReferralClick, InsertReferralClick> 
  implements IReferralClickRepository 
{
  constructor() {
    super(referralClicks, 'id');
  }

  async findByReferralLinkId(referralLinkId: string): Promise<ReferralClick[]> {
    try {
      return await db
        .select()
        .from(referralClicks)
        .where(eq(referralClicks.referralLinkId, referralLinkId))
        .orderBy(desc(referralClicks.clickedAt)) as ReferralClick[];
    } catch (error) {
      handleDatabaseError(error, 'ReferralClickRepository.findByReferralLinkId');
    }
  }

  async findByFingerprint(fingerprint: string): Promise<ReferralClick[]> {
    try {
      return await db
        .select()
        .from(referralClicks)
        .where(eq(referralClicks.fingerprint, fingerprint))
        .orderBy(desc(referralClicks.clickedAt)) as ReferralClick[];
    } catch (error) {
      handleDatabaseError(error, 'ReferralClickRepository.findByFingerprint');
    }
  }

  async findByFingerprintAndLink(fingerprint: string, referralLinkId: string): Promise<ReferralClick | undefined> {
    try {
      const results = await db
        .select()
        .from(referralClicks)
        .where(
          and(
            eq(referralClicks.fingerprint, fingerprint),
            eq(referralClicks.referralLinkId, referralLinkId)
          )
        )
        .limit(1);
      return results[0];
    } catch (error) {
      handleDatabaseError(error, 'ReferralClickRepository.findByFingerprintAndLink');
    }
  }

  async markAsConverted(clickId: string): Promise<void> {
    try {
      await db
        .update(referralClicks)
        .set({ 
          convertedToRegistration: true,
          convertedAt: new Date()
        })
        .where(eq(referralClicks.id, clickId));
    } catch (error) {
      handleDatabaseError(error, 'ReferralClickRepository.markAsConverted');
    }
  }
}

export const referralClickRepository = new ReferralClickRepository();
