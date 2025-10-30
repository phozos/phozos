import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdminTestimonialService } from '../testimonial-admin.service';
import { testimonialRepository } from '../../../../repositories/testimonial.repository';

describe('AdminTestimonialService', () => {
  let adminTestimonialService: AdminTestimonialService;
  let testTestimonialIds: string[] = [];

  beforeEach(() => {
    adminTestimonialService = new AdminTestimonialService();
  });

  afterEach(async () => {
    for (const id of testTestimonialIds) {
      try {
        await testimonialRepository.delete(id);
      } catch (error) {
        console.log('Testimonial cleanup failed:', error);
      }
    }
    testTestimonialIds = [];
  });

  describe('getTestimonials', () => {
    it('should return all testimonials', async () => {
      const testimonials = await adminTestimonialService.getTestimonials();
      expect(Array.isArray(testimonials)).toBe(true);
    });
  });

  describe('createTestimonial', () => {
    it('should create a new testimonial', async () => {
      const testimonialData = {
        studentName: 'Test Student',
        studentUniversity: 'Test University',
        content: 'This is a test testimonial',
        rating: 5,
        isApproved: true
      };

      const testimonial = await adminTestimonialService.createTestimonial(testimonialData);
      testTestimonialIds.push(testimonial.id);

      expect(testimonial).toBeDefined();
      expect(testimonial.studentName).toBe(testimonialData.studentName);
      expect(testimonial.rating).toBe(testimonialData.rating);
    });
  });

  describe('testimonial operations', () => {
    it('should handle testimonials properly', async () => {
      const testimonials = await adminTestimonialService.getTestimonials();
      expect(Array.isArray(testimonials)).toBe(true);
      
      const created = await adminTestimonialService.createTestimonial({
        studentName: 'Test Student',
        studentUniversity: 'Test University',
        content: 'Great service!',
        rating: 5
      });
      testTestimonialIds.push(created.id);
      expect(created).toBeDefined();
    });
  });
});
