import { BaseService } from '../base.service';
import { ITestimonialRepository } from '../../repositories';
import { container, TYPES } from '../container';
import { db } from '../../db';
import { testimonials, users } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

export interface TestimonialWithUser {
  id: string;
  name: string;
  destinationCountry: string;
  intake: string;
  photo: string | null;
  counselorName: string;
  feedback: string;
  isApproved: boolean;
  createdAt: Date;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    profilePicture: string | null;
  } | null;
}

export interface ITestimonialService {
  getApprovedTestimonialsWithUsers(limit?: number): Promise<TestimonialWithUser[]>;
}

export class TestimonialService extends BaseService implements ITestimonialService {
  constructor(
    private testimonialRepository: ITestimonialRepository = container.get<ITestimonialRepository>(TYPES.ITestimonialRepository)
  ) {
    super();
  }

  async getApprovedTestimonialsWithUsers(limit: number = 10): Promise<TestimonialWithUser[]> {
    try {
      const results = await db
        .select({
          id: testimonials.id,
          name: testimonials.name,
          destinationCountry: testimonials.destinationCountry,
          intake: testimonials.intake,
          photo: testimonials.photo,
          counselorName: testimonials.counselorName,
          feedback: testimonials.feedback,
          isApproved: testimonials.isApproved,
          createdAt: testimonials.createdAt,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            profilePicture: users.profilePicture
          }
        })
        .from(testimonials)
        .leftJoin(users, eq(testimonials.userId, users.id))
        .where(eq(testimonials.isApproved, true))
        .orderBy(desc(testimonials.createdAt))
        .limit(limit);

      return results as TestimonialWithUser[];
    } catch (error) {
      return this.handleError(error, 'TestimonialService.getApprovedTestimonialsWithUsers');
    }
  }
}

export const testimonialService = new TestimonialService();
