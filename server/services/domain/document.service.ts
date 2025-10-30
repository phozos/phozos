import { BaseService } from '../base.service';
import { IDocumentRepository } from '../../repositories';
import { Document, InsertDocument } from '@shared/schema';
import { container, TYPES } from '../container';
import { CommonValidators, BusinessRuleValidators } from '../validation';
import { ValidationServiceError } from '../errors';

export interface IDocumentService {
  getDocumentById(id: string): Promise<Document>;
  getDocumentsByUser(userId: string): Promise<Document[]>;
  getDocumentsByApplication(applicationId: string): Promise<Document[]>;
  createDocument(data: InsertDocument): Promise<Document>;
  deleteDocument(id: string): Promise<boolean>;
}

export class DocumentService extends BaseService implements IDocumentService {
  constructor(
    private documentRepository: IDocumentRepository = container.get<IDocumentRepository>(TYPES.IDocumentRepository)
  ) {
    super();
  }

  async getDocumentById(id: string): Promise<Document> {
    try {
      const document = await this.documentRepository.findById(id);
      return document;
    } catch (error) {
      return this.handleError(error, 'DocumentService.getDocumentById');
    }
  }

  async getDocumentsByUser(userId: string): Promise<Document[]> {
    try {
      return await this.documentRepository.findByUser(userId);
    } catch (error) {
      return this.handleError(error, 'DocumentService.getDocumentsByUser');
    }
  }

  async getDocumentsByApplication(applicationId: string): Promise<Document[]> {
    try {
      return await this.documentRepository.findByApplication(applicationId);
    } catch (error) {
      return this.handleError(error, 'DocumentService.getDocumentsByApplication');
    }
  }

  async createDocument(data: InsertDocument): Promise<Document> {
    try {
      this.validateRequired(data, ['userId', 'name', 'type', 'fileName', 'filePath']);

      const errors: Record<string, string> = {};

      const userIdValidation = CommonValidators.validateUUID(data.userId, 'User ID');
      if (!userIdValidation.valid) {
        errors.userId = userIdValidation.error!;
      }

      if (data.applicationId) {
        const appIdValidation = CommonValidators.validateUUID(data.applicationId, 'Application ID');
        if (!appIdValidation.valid) {
          errors.applicationId = appIdValidation.error!;
        }
      }

      const nameValidation = CommonValidators.validateStringLength(data.name, 1, 255, 'Document name');
      if (!nameValidation.valid) {
        errors.name = nameValidation.error!;
      }

      const validDocumentTypes = ['transcript', 'test_score', 'essay', 'recommendation', 'resume', 'certificate', 'other'];
      BusinessRuleValidators.validateDocumentType(data.type, validDocumentTypes);

      if (data.fileName) {
        const allowedExtensions = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'txt'];
        const extensionValidation = CommonValidators.validateFileExtension(data.fileName, allowedExtensions);
        if (!extensionValidation.valid) {
          errors.fileName = extensionValidation.error!;
        }
      }

      if (data.fileSize) {
        const maxSizeMB = 10;
        const sizeValidation = CommonValidators.validateFileSize(data.fileSize, maxSizeMB);
        if (!sizeValidation.valid) {
          errors.fileSize = sizeValidation.error!;
        }
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Document', errors);
      }

      return await this.documentRepository.create(data);
    } catch (error) {
      return this.handleError(error, 'DocumentService.createDocument');
    }
  }

  async deleteDocument(id: string): Promise<boolean> {
    try {
      return await this.documentRepository.delete(id);
    } catch (error) {
      return this.handleError(error, 'DocumentService.deleteDocument');
    }
  }
}

export const documentService = new DocumentService();
