import { BaseRepository } from './base.repository';
import { Application, InsertApplication, applications, universities } from '@shared/schema';
import { db } from '../db';
import { eq, and, desc, sql, SQL } from 'drizzle-orm';
import { handleDatabaseError } from './errors';
import { ApplicationWithUniversity } from '../types/repository-responses';
import { ApplicationFilters } from '../types/repository-filters';

export interface IApplicationRepository {
  findById(id: string): Promise<Application>;
  findByIdOptional(id: string): Promise<Application | undefined>;
  findByUser(userId: string): Promise<Application[]>;
  findByUserWithUniversity(userId: string): Promise<ApplicationWithUniversity[]>;
  findByUniversity(universityId: string): Promise<Application[]>;
  findByStatus(status: string): Promise<Application[]>;
  findAll(filters?: ApplicationFilters): Promise<Application[]>;
  create(data: InsertApplication): Promise<Application>;
  update(id: string, data: Partial<Application>): Promise<Application>;
  delete(id: string): Promise<boolean>;
  countByUser(userId: string): Promise<number>;
}

export class ApplicationRepository extends BaseRepository<Application, InsertApplication> implements IApplicationRepository {
  constructor() {
    super(applications, 'id');
  }

  async findByUser(userId: string): Promise<Application[]> {
    try {
      return await db
        .select()
        .from(applications)
        .where(eq(applications.userId, userId))
        .orderBy(desc(applications.createdAt)) as Application[];
    } catch (error) {
      handleDatabaseError(error, 'ApplicationRepository.findByUser');
    }
  }

  async findByUserWithUniversity(userId: string): Promise<ApplicationWithUniversity[]> {
    try {
      return await db
        .select({
          id: applications.id,
          userId: applications.userId,
          universityId: applications.universityId,
          courseId: applications.courseId,
          status: applications.status,
          submittedAt: applications.submittedAt,
          deadlineDate: applications.deadlineDate,
          notes: applications.notes,
          createdAt: applications.createdAt,
          updatedAt: applications.updatedAt,
          universityName: universities.name,
          universityCountry: universities.country,
          universityWorldRanking: universities.worldRanking,
          universityWebsite: universities.website
        })
        .from(applications)
        .leftJoin(universities, eq(applications.universityId, universities.id))
        .where(eq(applications.userId, userId))
        .orderBy(desc(applications.createdAt));
    } catch (error) {
      handleDatabaseError(error, 'ApplicationRepository.findByUserWithUniversity');
    }
  }

  async findByUniversity(universityId: string): Promise<Application[]> {
    try {
      return await db
        .select()
        .from(applications)
        .where(eq(applications.universityId, universityId))
        .orderBy(desc(applications.createdAt)) as Application[];
    } catch (error) {
      handleDatabaseError(error, 'ApplicationRepository.findByUniversity');
    }
  }

  async findByStatus(status: string): Promise<Application[]> {
    try {
      return await db
        .select()
        .from(applications)
        .where(sql`${applications.status} = ${status}`)
        .orderBy(desc(applications.createdAt)) as Application[];
    } catch (error) {
      handleDatabaseError(error, 'ApplicationRepository.findByStatus');
    }
  }

  async countByUser(userId: string): Promise<number> {
    try {
      return await this.count(eq(applications.userId, userId));
    } catch (error) {
      handleDatabaseError(error, 'ApplicationRepository.countByUser');
    }
  }

  async findAll(filters?: ApplicationFilters): Promise<Application[]> {
    try {
      const conditions: SQL[] = [];
      
      if (filters) {
        if (filters.userId) {
          conditions.push(eq(applications.userId, filters.userId));
        }
        if (filters.universityId) {
          conditions.push(eq(applications.universityId, filters.universityId));
        }
        if (filters.status) {
          conditions.push(eq(applications.status, filters.status));
        }
      }
      
      let query = db.select().from(applications);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }
      
      return await query.orderBy(desc(applications.createdAt)) as Application[];
    } catch (error) {
      handleDatabaseError(error, 'ApplicationRepository.findAll');
    }
  }
}

export const applicationRepository = new ApplicationRepository();
