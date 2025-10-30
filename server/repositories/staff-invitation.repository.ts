import { BaseRepository, DeleteResult } from './base.repository';
import { StaffInvitationLink, InsertStaffInvitationLink, staffInvitationLinks } from '@shared/schema';
import { db } from '../db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { handleDatabaseError } from './errors';
import type { DbOrTransaction } from './base.repository';

export interface IStaffInvitationRepository {
  findById(id: string): Promise<StaffInvitationLink>;
  findByIdOptional(id: string): Promise<StaffInvitationLink | undefined>;
  findByToken(token: string): Promise<StaffInvitationLink | undefined>;
  findActiveByToken(token: string): Promise<StaffInvitationLink | undefined>;
  findAllActive(): Promise<StaffInvitationLink[]>;
  create(data: InsertStaffInvitationLink): Promise<StaffInvitationLink>;
  update(id: string, data: Partial<StaffInvitationLink>): Promise<StaffInvitationLink>;
  refreshToken(linkId: string, newToken: string): Promise<StaffInvitationLink>;
  incrementUsageCount(linkId: string): Promise<void>;
  deactivate(linkId: string): Promise<boolean>;
  claimAndInvalidate(token: string): Promise<StaffInvitationLink | undefined>;
  delete(id: string): Promise<boolean>;
}

export class StaffInvitationRepository extends BaseRepository<StaffInvitationLink, InsertStaffInvitationLink> implements IStaffInvitationRepository {
  constructor() {
    super(staffInvitationLinks, 'id');
  }

  async findByToken(token: string): Promise<StaffInvitationLink | undefined> {
    try {
      return await this.findOne(eq(staffInvitationLinks.token, token));
    } catch (error) {
      handleDatabaseError(error, 'StaffInvitationRepository.findByToken');
    }
  }

  async findActiveByToken(token: string): Promise<StaffInvitationLink | undefined> {
    try {
      return await this.findOne(
        and(
          eq(staffInvitationLinks.token, token),
          eq(staffInvitationLinks.isActive, true)
        )
      );
    } catch (error) {
      handleDatabaseError(error, 'StaffInvitationRepository.findActiveByToken');
    }
  }

  async findAllActive(): Promise<StaffInvitationLink[]> {
    try {
      return await db
        .select()
        .from(staffInvitationLinks)
        .where(eq(staffInvitationLinks.isActive, true))
        .orderBy(desc(staffInvitationLinks.createdAt)) as StaffInvitationLink[];
    } catch (error) {
      handleDatabaseError(error, 'StaffInvitationRepository.findAllActive');
    }
  }

  async refreshToken(linkId: string, newToken: string): Promise<StaffInvitationLink> {
    try {
      const results = await db
        .update(staffInvitationLinks)
        .set({
          token: newToken,
          updatedAt: new Date()
        })
        .where(eq(staffInvitationLinks.id, linkId))
        .returning();
      
      return results[0] as StaffInvitationLink;
    } catch (error) {
      handleDatabaseError(error, 'StaffInvitationRepository.refreshToken');
    }
  }

  async incrementUsageCount(linkId: string): Promise<void> {
    try {
      await db
        .update(staffInvitationLinks)
        .set({
          usedCount: sql`${staffInvitationLinks.usedCount} + 1`,
          lastUsedAt: new Date()
        })
        .where(eq(staffInvitationLinks.id, linkId));
    } catch (error) {
      handleDatabaseError(error, 'StaffInvitationRepository.incrementUsageCount');
    }
  }

  async deactivate(linkId: string): Promise<boolean> {
    try {
      const result = await db
        .update(staffInvitationLinks)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(staffInvitationLinks.id, linkId)) as unknown as DeleteResult;
      
      return result.rowCount > 0;
    } catch (error) {
      handleDatabaseError(error, 'StaffInvitationRepository.deactivate');
    }
  }

  async claimAndInvalidate(token: string): Promise<StaffInvitationLink | undefined> {
    try {
      return await this.executeInTransaction(async (tx) => {
        // Find and claim the token
        const [link] = await tx
          .select()
          .from(staffInvitationLinks)
          .where(and(
            eq(staffInvitationLinks.token, token),
            eq(staffInvitationLinks.isActive, true)
          ))
          .limit(1);

        if (!link) {
          return undefined;
        }

        // Atomically increment usage and deactivate if needed
        const [updated] = await tx
          .update(staffInvitationLinks)
          .set({
            usedCount: sql`${staffInvitationLinks.usedCount} + 1`,
            lastUsedAt: new Date(),
            isActive: false,
            updatedAt: new Date()
          })
          .where(eq(staffInvitationLinks.id, link.id))
          .returning();

        return updated as StaffInvitationLink;
      });
    } catch (error) {
      handleDatabaseError(error, 'StaffInvitationRepository.claimAndInvalidate');
    }
  }
}

export const staffInvitationRepository = new StaffInvitationRepository();
