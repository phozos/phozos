import { BaseRepository } from './base.repository';
import { AIMatchingResult, aiMatchingResults } from '@shared/schema';
import { db } from '../db';
import { eq, desc, and, gte, lte, SQL, sql } from 'drizzle-orm';
import { handleDatabaseError } from './errors';
import { AIMatchingFilters } from '../types/repository-filters';

type InsertAIMatchingResult = typeof aiMatchingResults.$inferInsert;

export interface IAIMatchingRepository {
  findById(id: string): Promise<AIMatchingResult>;
  findByIdOptional(id: string): Promise<AIMatchingResult | undefined>;
  findByUser(userId: string): Promise<AIMatchingResult[]>;
  findByUserAndUniversity(userId: string, universityId: string): Promise<AIMatchingResult | undefined>;
  findAll(filters?: AIMatchingFilters): Promise<AIMatchingResult[]>;
  create(data: InsertAIMatchingResult): Promise<AIMatchingResult>;
  update(id: string, data: Partial<AIMatchingResult>): Promise<AIMatchingResult>;
  delete(id: string): Promise<boolean>;
  deleteByUser(userId: string): Promise<boolean>;
}

export class AIMatchingRepository extends BaseRepository<AIMatchingResult, InsertAIMatchingResult> implements IAIMatchingRepository {
  constructor() {
    super(aiMatchingResults, 'id');
  }

  async findByUser(userId: string): Promise<AIMatchingResult[]> {
    try {
      return await db
        .select()
        .from(aiMatchingResults)
        .where(eq(aiMatchingResults.userId, userId))
        .orderBy(desc(aiMatchingResults.createdAt)) as AIMatchingResult[];
    } catch (error) {
      handleDatabaseError(error, 'AIMatchingRepository.findByUser');
    }
  }

  async findByUserAndUniversity(userId: string, universityId: string): Promise<AIMatchingResult | undefined> {
    try {
      const results = await db
        .select()
        .from(aiMatchingResults)
        .where(and(
          eq(aiMatchingResults.userId, userId),
          eq(aiMatchingResults.universityId, universityId)
        ))
        .limit(1);
      return results[0] as AIMatchingResult | undefined;
    } catch (error) {
      handleDatabaseError(error, 'AIMatchingRepository.findByUserAndUniversity');
    }
  }

  async deleteByUser(userId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(aiMatchingResults)
        .where(eq(aiMatchingResults.userId, userId));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      handleDatabaseError(error, 'AIMatchingRepository.deleteByUser');
    }
  }

  async findAll(filters?: AIMatchingFilters): Promise<AIMatchingResult[]> {
    try {
      const conditions: SQL[] = [];
      
      if (filters) {
        if (filters.userId) {
          conditions.push(eq(aiMatchingResults.userId, filters.userId));
        }
        if (filters.universityId) {
          conditions.push(eq(aiMatchingResults.universityId, filters.universityId));
        }
        if (filters.minScore !== undefined) {
          conditions.push(sql`${aiMatchingResults.matchScore}::numeric >= ${filters.minScore}`);
        }
        if (filters.maxScore !== undefined) {
          conditions.push(sql`${aiMatchingResults.matchScore}::numeric <= ${filters.maxScore}`);
        }
      }
      
      let query = db.select().from(aiMatchingResults);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }
      
      return await query.orderBy(desc(aiMatchingResults.createdAt)) as AIMatchingResult[];
    } catch (error) {
      handleDatabaseError(error, 'AIMatchingRepository.findAll');
    }
  }
}

export const aiMatchingRepository = new AIMatchingRepository();
