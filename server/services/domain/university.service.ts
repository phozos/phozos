import { BaseService } from '../base.service';
import { IUniversityRepository, ICourseRepository } from '../../repositories';
import { container, TYPES } from '../container';
import { University, InsertUniversity, Course } from '@shared/schema';
import { ResourceNotFoundError, InvalidOperationError, ValidationServiceError } from '../errors';
import { CommonValidators, BusinessRuleValidators } from '../validation';

export interface IUniversityService {
  bulkImportUniversities(universities: any[]): Promise<{ imported: number; failed: number }>;
  getAllUniversities(filters?: any): Promise<University[]>;
  getUniversityById(id: string): Promise<University>;
  searchUniversities(query: string, filters?: any): Promise<University[]>;
  createUniversity(data: InsertUniversity): Promise<University>;
  createUniversityWithNormalization(data: InsertUniversity): Promise<University>;
  updateUniversity(id: string, data: Partial<University>): Promise<University>;
  deleteUniversity(id: string): Promise<boolean>;
  getCoursesByUniversity(universityId: string): Promise<Course[]>;
}

export class UniversityService extends BaseService implements IUniversityService {
  constructor(
    private universityRepository: IUniversityRepository = container.get<IUniversityRepository>(TYPES.IUniversityRepository),
    private courseRepository: ICourseRepository = container.get<ICourseRepository>(TYPES.ICourseRepository)
  ) {
    super();
  }

  async getAllUniversities(filters?: any): Promise<University[]> {
    try {
      return await this.universityRepository.findAll(filters);
    } catch (error) {
      return this.handleError(error, 'UniversityService.getAllUniversities');
    }
  }

  async getUniversityById(id: string): Promise<University> {
    try {
      const university = await this.universityRepository.findById(id);
      if (!university) {
        throw new ResourceNotFoundError('University', id);
      }
      return university;
    } catch (error) {
      return this.handleError(error, 'UniversityService.getUniversityById');
    }
  }

  async searchUniversities(query: string, filters?: any): Promise<University[]> {
    try {
      return await this.universityRepository.search(query, filters);
    } catch (error) {
      return this.handleError(error, 'UniversityService.searchUniversities');
    }
  }

  async createUniversity(data: InsertUniversity): Promise<University> {
    try {
      this.validateRequired(data, ['name', 'country']);

      const errors: Record<string, string> = {};

      const nameValidation = CommonValidators.validateStringLength(data.name, 1, 500, 'University name');
      if (!nameValidation.valid) {
        errors.name = nameValidation.error!;
      }

      const countryValidation = CommonValidators.validateStringLength(data.country, 1, 100, 'Country');
      if (!countryValidation.valid) {
        errors.country = countryValidation.error!;
      }

      if (data.worldRanking !== undefined && data.worldRanking !== null) {
        BusinessRuleValidators.validateUniversityRanking(data.worldRanking);
      }

      if (data.annualFee !== undefined && data.annualFee !== null) {
        const feeValidation = CommonValidators.validatePositiveNumber(Number(data.annualFee), 'Annual fee');
        if (!feeValidation.valid) {
          errors.annualFee = feeValidation.error!;
        }
      }

      if (data.website) {
        const urlValidation = CommonValidators.validateUrl(data.website);
        if (!urlValidation.valid) {
          errors.website = urlValidation.error!;
        }
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('University', errors);
      }

      return await this.universityRepository.create(data);
    } catch (error) {
      return this.handleError(error, 'UniversityService.createUniversity');
    }
  }

  async createUniversityWithNormalization(data: InsertUniversity): Promise<University> {
    try {
      this.validateRequired(data, ['name', 'country']);
      
      const errors: Record<string, string> = {};

      const nameValidation = CommonValidators.validateStringLength(data.name, 1, 500, 'University name');
      if (!nameValidation.valid) {
        errors.name = nameValidation.error!;
      }

      const countryValidation = CommonValidators.validateStringLength(data.country, 1, 100, 'Country');
      if (!countryValidation.valid) {
        errors.country = countryValidation.error!;
      }

      if (data.website) {
        const urlValidation = CommonValidators.validateUrl(data.website);
        if (!urlValidation.valid) {
          errors.website = urlValidation.error!;
        }
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('University', errors);
      }
      
      const normalizedData: any = { ...data };
      
      if (normalizedData.acceptanceRate && typeof normalizedData.acceptanceRate === 'string') {
        normalizedData.acceptanceRate = normalizedData.acceptanceRate.replace('%', '').trim();
        const rate = parseFloat(normalizedData.acceptanceRate);
        normalizedData.acceptanceRate = isNaN(rate) ? null : rate.toString();
      }
      
      if (normalizedData.worldRanking && typeof normalizedData.worldRanking === 'string') {
        const ranking = parseInt(normalizedData.worldRanking.trim());
        normalizedData.worldRanking = isNaN(ranking) ? null : ranking;
      }

      if (normalizedData.worldRanking !== undefined && normalizedData.worldRanking !== null) {
        BusinessRuleValidators.validateUniversityRanking(normalizedData.worldRanking);
      }

      if (normalizedData.annualFee !== undefined && normalizedData.annualFee !== null) {
        const feeValidation = CommonValidators.validatePositiveNumber(Number(normalizedData.annualFee), 'Annual fee');
        if (!feeValidation.valid) {
          throw new ValidationServiceError('University', { annualFee: feeValidation.error! });
        }
      }
      
      return await this.universityRepository.create(normalizedData);
    } catch (error) {
      return this.handleError(error, 'UniversityService.createUniversityWithNormalization');
    }
  }

  async updateUniversity(id: string, data: Partial<University>): Promise<University> {
    try {
      const errors: Record<string, string> = {};

      if (data.name !== undefined) {
        const nameValidation = CommonValidators.validateStringLength(data.name, 1, 500, 'University name');
        if (!nameValidation.valid) {
          errors.name = nameValidation.error!;
        }
      }

      if (data.country !== undefined) {
        const countryValidation = CommonValidators.validateStringLength(data.country, 1, 100, 'Country');
        if (!countryValidation.valid) {
          errors.country = countryValidation.error!;
        }
      }

      if (data.worldRanking !== undefined && data.worldRanking !== null) {
        BusinessRuleValidators.validateUniversityRanking(data.worldRanking);
      }

      if (data.annualFee !== undefined && data.annualFee !== null) {
        const feeValidation = CommonValidators.validatePositiveNumber(Number(data.annualFee), 'Annual fee');
        if (!feeValidation.valid) {
          errors.annualFee = feeValidation.error!;
        }
      }

      if (data.website !== undefined && data.website) {
        const urlValidation = CommonValidators.validateUrl(data.website);
        if (!urlValidation.valid) {
          errors.website = urlValidation.error!;
        }
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('University', errors);
      }

      const updated = await this.universityRepository.update(id, data);
      if (!updated) {
        throw new InvalidOperationError('update university', 'University update failed or university not found');
      }
      return updated;
    } catch (error) {
      return this.handleError(error, 'UniversityService.updateUniversity');
    }
  }

  async deleteUniversity(id: string): Promise<boolean> {
    try {
      return await this.universityRepository.delete(id);
    } catch (error) {
      return this.handleError(error, 'UniversityService.deleteUniversity');
    }
  }

  async getCoursesByUniversity(universityId: string): Promise<Course[]> {
    try {
      return await this.courseRepository.findByUniversity(universityId);
    } catch (error) {
      return this.handleError(error, 'UniversityService.getCoursesByUniversity');
    }
  }

  async bulkImportUniversities(universities: any[]): Promise<{ imported: number; failed: number }> {
    try {
      let imported = 0;
      let failed = 0;

      for (const uni of universities) {
        try {
          // Normalize the data
          const normalizedData: any = { ...uni };
          
          // Handle degreeLevels if it's a string
          if (typeof normalizedData.degreeLevels === 'string') {
            normalizedData.degreeLevels = normalizedData.degreeLevels.split(',').map((s: string) => s.trim());
          }
          
          // Handle acceptanceRate
          if (normalizedData.acceptanceRate && typeof normalizedData.acceptanceRate === 'string') {
            normalizedData.acceptanceRate = normalizedData.acceptanceRate.replace('%', '').trim();
          }
          
          await this.createUniversityWithNormalization(normalizedData);
          imported++;
        } catch (error) {
          console.error(`Failed to import university: ${uni.name}`, error);
          failed++;
        }
      }

      return { imported, failed };
    } catch (error) {
      return this.handleError(error, 'UniversityService.bulkImportUniversities');
    }
  }
}

export const universityService = new UniversityService();
