import { BaseRepository } from './base.repository';
import { db } from '../db';
import { studentTimeline } from '@shared/schema';
import { eq, desc, and, SQL } from 'drizzle-orm';
import { handleDatabaseError } from './errors';
import { StudentTimelineFilters } from '../types/repository-filters';

export type StudentTimeline = typeof studentTimeline.$inferSelect;
export type InsertStudentTimeline = typeof studentTimeline.$inferInsert;

export interface IStudentTimelineRepository {
  findById(id: string): Promise<StudentTimeline>;
  findByIdOptional(id: string): Promise<StudentTimeline | undefined>;
  findAll(filters?: StudentTimelineFilters): Promise<StudentTimeline[]>;
  create(data: InsertStudentTimeline): Promise<StudentTimeline>;
  update(id: string, data: Partial<StudentTimeline>): Promise<StudentTimeline>;
  delete(id: string): Promise<boolean>;
  findByStudentId(studentId: string): Promise<StudentTimeline[]>;
  addTimelineEntry(entry: InsertStudentTimeline): Promise<StudentTimeline>;
}

export class StudentTimelineRepository extends BaseRepository<StudentTimeline, InsertStudentTimeline> implements IStudentTimelineRepository {
  constructor() {
    super(studentTimeline, 'id');
  }

  async findByStudentId(studentId: string): Promise<StudentTimeline[]> {
    try {
      return await db
        .select()
        .from(studentTimeline)
        .where(eq(studentTimeline.studentId, studentId))
        .orderBy(desc(studentTimeline.createdAt));
    } catch (error) {
      handleDatabaseError(error, 'StudentTimelineRepository.findByStudentId');
    }
  }

  async addTimelineEntry(entry: InsertStudentTimeline): Promise<StudentTimeline> {
    return await this.create(entry);
  }

  async findAll(filters?: StudentTimelineFilters): Promise<StudentTimeline[]> {
    try {
      const conditions: SQL[] = [];
      
      if (filters) {
        if (filters.studentId) {
          conditions.push(eq(studentTimeline.studentId, filters.studentId));
        }
        if (filters.eventType) {
          conditions.push(eq(studentTimeline.action, filters.eventType));
        }
      }
      
      let query = db.select().from(studentTimeline);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }
      
      return await query.orderBy(desc(studentTimeline.createdAt)) as StudentTimeline[];
    } catch (error) {
      handleDatabaseError(error, 'StudentTimelineRepository.findAll');
    }
  }
}

export const studentTimelineRepository = new StudentTimelineRepository();
