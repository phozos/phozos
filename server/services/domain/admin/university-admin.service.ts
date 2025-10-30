import { BaseService } from '../../base.service';
import { IUniversityRepository } from '../../../repositories';
import { container, TYPES } from '../../container';
import { University } from '@shared/schema';

export interface IAdminUniversityService {
  getAllUniversities(): Promise<University[]>;
}

export class AdminUniversityService extends BaseService implements IAdminUniversityService {
  constructor(
    private universityRepository: IUniversityRepository = container.get<IUniversityRepository>(TYPES.IUniversityRepository)
  ) {
    super();
  }

  async getAllUniversities(): Promise<University[]> {
    try {
      return await this.universityRepository.findAll();
    } catch (error) {
      return this.handleError(error, 'AdminUniversityService.getAllUniversities');
    }
  }
}

// Export singleton instance
export const adminUniversityService = new AdminUniversityService();
