import { BaseRepository } from './base.repository';
import { db } from '../db';
import { testimonials } from '@shared/schema';
import { eq, and, SQL } from 'drizzle-orm';
import { handleDatabaseError } from './errors';
import { TestimonialFilters } from '../types/repository-filters';

export type Testimonial = typeof testimonials.$inferSelect;
export type InsertTestimonial = typeof testimonials.$inferInsert;

export interface ITestimonialRepository {
  findById(id: string): Promise<Testimonial>;
  findByIdOptional(id: string): Promise<Testimonial | undefined>;
  findAll(filters?: TestimonialFilters): Promise<Testimonial[]>;
  create(data: InsertTestimonial): Promise<Testimonial>;
  update(id: string, data: Partial<Testimonial>): Promise<Testimonial>;
  delete(id: string): Promise<boolean>;
  findApproved(): Promise<Testimonial[]>;
  findByUserId(userId: string): Promise<Testimonial[]>;
  approve(id: string): Promise<Testimonial>;
}

export class TestimonialRepository extends BaseRepository<Testimonial, InsertTestimonial> implements ITestimonialRepository {
  constructor() {
    super(testimonials, 'id');
  }

  async findApproved(): Promise<Testimonial[]> {
    try {
      return await db
        .select()
        .from(testimonials)
        .where(eq(testimonials.isApproved, true));
    } catch (error) {
      handleDatabaseError(error, 'TestimonialRepository.findApproved');
    }
  }

  async findByUserId(userId: string): Promise<Testimonial[]> {
    try {
      return await db
        .select()
        .from(testimonials)
        .where(eq(testimonials.userId, userId));
    } catch (error) {
      handleDatabaseError(error, 'TestimonialRepository.findByUserId');
    }
  }

  async approve(id: string): Promise<Testimonial> {
    return await this.update(id, { isApproved: true });
  }

  async findAll(filters?: TestimonialFilters): Promise<Testimonial[]> {
    try {
      const conditions: SQL[] = [];
      
      if (filters) {
        if (filters.userId) {
          conditions.push(eq(testimonials.userId, filters.userId));
        }
        if (filters.isApproved !== undefined) {
          conditions.push(eq(testimonials.isApproved, filters.isApproved));
        }
        // Note: isFeatured column doesn't exist in schema
        // This filter option is ignored for now
      }
      
      let query = db.select().from(testimonials);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }
      
      return await query as Testimonial[];
    } catch (error) {
      handleDatabaseError(error, 'TestimonialRepository.findAll');
    }
  }
}

export const testimonialRepository = new TestimonialRepository();
