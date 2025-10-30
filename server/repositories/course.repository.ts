import { BaseRepository } from './base.repository';
import { Course, InsertCourse, courses } from '@shared/schema';
import { db } from '../db';
import { eq, and, SQL } from 'drizzle-orm';
import { handleDatabaseError } from './errors';
import { CourseFilters } from '../types/repository-filters';

export interface ICourseRepository {
  findById(id: string): Promise<Course>;
  findByIdOptional(id: string): Promise<Course | undefined>;
  findAll(filters?: CourseFilters): Promise<Course[]>;
  create(data: InsertCourse): Promise<Course>;
  update(id: string, data: Partial<Course>): Promise<Course>;
  delete(id: string): Promise<boolean>;
  findByUniversity(universityId: string): Promise<Course[]>;
}

export class CourseRepository extends BaseRepository<Course, InsertCourse> implements ICourseRepository {
  constructor() {
    super(courses, 'id');
  }

  async findByUniversity(universityId: string): Promise<Course[]> {
    try {
      return await db
        .select()
        .from(courses)
        .where(eq(courses.universityId, universityId))
        .orderBy(courses.name) as Course[];
    } catch (error) {
      handleDatabaseError(error, 'CourseRepository.findByUniversity');
    }
  }

  async findAll(filters?: CourseFilters): Promise<Course[]> {
    try {
      const conditions: SQL[] = [];
      
      if (filters) {
        if (filters.universityId) {
          conditions.push(eq(courses.universityId, filters.universityId));
        }
        if (filters.degree) {
          conditions.push(eq(courses.degree, filters.degree));
        }
        if (filters.field) {
          conditions.push(eq(courses.field, filters.field));
        }
        if (filters.isActive !== undefined) {
          conditions.push(eq(courses.isActive, filters.isActive));
        }
      }
      
      let query = db.select().from(courses);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }
      
      return await query.orderBy(courses.name) as Course[];
    } catch (error) {
      handleDatabaseError(error, 'CourseRepository.findAll');
    }
  }
}

export const courseRepository = new CourseRepository();
