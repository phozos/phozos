import { BaseService } from '../../base.service';
import { ITestimonialRepository } from '../../../repositories';
import { container, TYPES } from '../../container';
import { Testimonial, InsertTestimonial } from '@shared/schema';
import { ValidationServiceError } from '../../errors';
import { CommonValidators } from '../../validation';

export interface IAdminTestimonialService {
  getTestimonials(): Promise<Testimonial[]>;
  createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial>;
}

export class AdminTestimonialService extends BaseService implements IAdminTestimonialService {
  constructor(
    private testimonialRepository: ITestimonialRepository = container.get<ITestimonialRepository>(TYPES.ITestimonialRepository)
  ) {
    super();
  }

  async getTestimonials(): Promise<Testimonial[]> {
    try {
      return await this.testimonialRepository.findApproved();
    } catch (error) {
      return this.handleError(error, 'AdminTestimonialService.getTestimonials');
    }
  }

  async createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial> {
    try {
      this.validateRequired(testimonial, ['userId', 'name', 'feedback', 'destinationCountry', 'intake', 'counselorName']);

      const errors: Record<string, string> = {};

      const userIdValidation = CommonValidators.validateUUID(testimonial.userId, 'User ID');
      if (!userIdValidation.valid) {
        errors.userId = userIdValidation.error!;
      }

      const nameValidation = CommonValidators.validateStringLength(testimonial.name, 1, 100, 'Student name');
      if (!nameValidation.valid) {
        errors.name = nameValidation.error!;
      }

      const feedbackValidation = CommonValidators.validateStringLength(testimonial.feedback, 1, 1000, 'Testimonial feedback');
      if (!feedbackValidation.valid) {
        errors.feedback = feedbackValidation.error!;
      }

      const destinationCountryValidation = CommonValidators.validateStringLength(testimonial.destinationCountry, 1, 100, 'Destination country');
      if (!destinationCountryValidation.valid) {
        errors.destinationCountry = destinationCountryValidation.error!;
      }

      const intakeValidation = CommonValidators.validateStringLength(testimonial.intake, 1, 50, 'Intake period');
      if (!intakeValidation.valid) {
        errors.intake = intakeValidation.error!;
      }

      const counselorNameValidation = CommonValidators.validateStringLength(testimonial.counselorName, 1, 100, 'Counselor name');
      if (!counselorNameValidation.valid) {
        errors.counselorName = counselorNameValidation.error!;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Testimonial', errors);
      }

      return await this.testimonialRepository.create(testimonial);
    } catch (error) {
      return this.handleError(error, 'AdminTestimonialService.createTestimonial');
    }
  }
}

// Export singleton instance
export const adminTestimonialService = new AdminTestimonialService();
