import { BaseRepository } from './base.repository';
import { University, InsertUniversity, universities } from '@shared/schema';
import { db } from '../db';
import { eq, and, or, ilike, sql, SQL } from 'drizzle-orm';
import { handleDatabaseError } from './errors';
import { UniversityFilters } from '../types/repository-filters';

export interface IUniversityRepository {
  findById(id: string): Promise<University>;
  findByIdOptional(id: string): Promise<University | undefined>;
  findAll(filters?: UniversityFilters): Promise<University[]>;
  search(query: string, filters?: UniversityFilters): Promise<University[]>;
  create(data: InsertUniversity): Promise<University>;
  update(id: string, data: Partial<University>): Promise<University>;
  delete(id: string): Promise<boolean>;
}

export class UniversityRepository extends BaseRepository<University, InsertUniversity> implements IUniversityRepository {
  constructor() {
    super(universities, 'id');
  }

  private buildUniversityFilters(filters?: UniversityFilters): SQL[] {
    const conditions: SQL[] = [];

    if (filters) {
      if (filters.country) {
        conditions.push(eq(universities.country, filters.country));
      }
      if (filters.minWorldRanking) {
        conditions.push(sql`(${universities.ranking}->>'world')::int >= ${filters.minWorldRanking}`);
      }
      if (filters.maxWorldRanking) {
        conditions.push(sql`(${universities.ranking}->>'world')::int <= ${filters.maxWorldRanking}`);
      }
      if (filters.tier) {
        conditions.push(eq(universities.tier, filters.tier));
      }
      if (filters.isActive !== undefined) {
        conditions.push(eq(universities.isActive, filters.isActive));
      }
    }

    return conditions;
  }

  async findAll(filters?: UniversityFilters): Promise<University[]> {
    try {
      let query = db.select().from(universities);
      const conditions = this.buildUniversityFilters(filters);

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      return await query.orderBy(universities.ranking) as University[];
    } catch (error) {
      handleDatabaseError(error, 'universities.findAll');
    }
  }

  async search(query: string, filters?: UniversityFilters): Promise<University[]> {
    try {
      const searchConditions = [
        ilike(universities.name, `%${query}%`),
        ilike(universities.description, `%${query}%`),
        ilike(universities.country, `%${query}%`)
      ];

      const filterConditions = this.buildUniversityFilters(filters);

      let finalConditions: SQL | undefined;
      if (filterConditions.length > 0) {
        finalConditions = and(or(...searchConditions), ...filterConditions);
      } else {
        finalConditions = or(...searchConditions);
      }

      return await db
        .select()
        .from(universities)
        .where(finalConditions)
        .orderBy(universities.ranking)
        .limit(50) as University[];
    } catch (error) {
      handleDatabaseError(error, 'universities.search');
    }
  }
}

export const universityRepository = new UniversityRepository();
