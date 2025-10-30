import { BaseRepository } from './base.repository';
import { db } from '../db';
import { forumPostReports } from '@shared/schema';
import { eq, desc, and, SQL } from 'drizzle-orm';
import { handleDatabaseError } from './errors';
import { ForumReportFilters } from '../types/repository-filters';

export type ForumPostReport = typeof forumPostReports.$inferSelect;
export type InsertForumPostReport = typeof forumPostReports.$inferInsert;

export interface IForumReportsRepository {
  findById(id: string): Promise<ForumPostReport>;
  findByIdOptional(id: string): Promise<ForumPostReport | undefined>;
  findAll(filters?: ForumReportFilters): Promise<ForumPostReport[]>;
  create(data: InsertForumPostReport): Promise<ForumPostReport>;
  update(id: string, data: Partial<ForumPostReport>): Promise<ForumPostReport>;
  delete(id: string): Promise<boolean>;
  findByPostAndUser(postId: string, userId: string): Promise<ForumPostReport | undefined>;
  findByPostId(postId: string): Promise<ForumPostReport[]>;
  deleteByPostId(postId: string): Promise<void>;
}

export class ForumReportsRepository extends BaseRepository<ForumPostReport, InsertForumPostReport> implements IForumReportsRepository {
  constructor() {
    super(forumPostReports, 'id');
  }

  async findByPostAndUser(postId: string, userId: string): Promise<ForumPostReport | undefined> {
    try {
      const results = await db
        .select()
        .from(forumPostReports)
        .where(
          and(
            eq(forumPostReports.postId, postId),
            eq(forumPostReports.reporterUserId, userId)
          )
        )
        .limit(1);
      return results[0];
    } catch (error) {
      handleDatabaseError(error, 'ForumReportsRepository.findByPostAndUser');
    }
  }

  async findByPostId(postId: string): Promise<ForumPostReport[]> {
    try {
      return await db
        .select()
        .from(forumPostReports)
        .where(eq(forumPostReports.postId, postId))
        .orderBy(desc(forumPostReports.createdAt));
    } catch (error) {
      handleDatabaseError(error, 'ForumReportsRepository.findByPostId');
    }
  }

  async deleteByPostId(postId: string): Promise<void> {
    try {
      await db
        .delete(forumPostReports)
        .where(eq(forumPostReports.postId, postId));
    } catch (error) {
      handleDatabaseError(error, 'ForumReportsRepository.deleteByPostId');
    }
  }

  async findAll(filters?: ForumReportFilters): Promise<ForumPostReport[]> {
    try {
      const conditions: SQL[] = [];
      
      if (filters) {
        if (filters.postId) {
          conditions.push(eq(forumPostReports.postId, filters.postId));
        }
        if (filters.reporterUserId) {
          conditions.push(eq(forumPostReports.reporterUserId, filters.reporterUserId));
        }
        // Note: reviewedByUserId and status columns don't exist in schema
        // These filter options are ignored for now
      }
      
      let query = db.select().from(forumPostReports);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }
      
      return await query.orderBy(desc(forumPostReports.createdAt)) as ForumPostReport[];
    } catch (error) {
      handleDatabaseError(error, 'ForumReportsRepository.findAll');
    }
  }
}

export const forumReportsRepository = new ForumReportsRepository();
