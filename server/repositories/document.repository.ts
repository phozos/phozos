import { BaseRepository } from './base.repository';
import { Document, InsertDocument, documents } from '@shared/schema';
import { db } from '../db';
import { eq, and, desc, SQL, sql } from 'drizzle-orm';
import { handleDatabaseError } from './errors';
import { DocumentFilters } from '../types/repository-filters';

export interface IDocumentRepository {
  findById(id: string): Promise<Document>;
  findByIdOptional(id: string): Promise<Document | undefined>;
  findByUser(userId: string): Promise<Document[]>;
  findByApplication(applicationId: string): Promise<Document[]>;
  findAll(filters?: DocumentFilters): Promise<Document[]>;
  create(data: InsertDocument): Promise<Document>;
  update(id: string, data: Partial<Document>): Promise<Document>;
  delete(id: string): Promise<boolean>;
  countByUser(userId: string): Promise<number>;
}

export class DocumentRepository extends BaseRepository<Document, InsertDocument> implements IDocumentRepository {
  constructor() {
    super(documents, 'id');
  }

  async findByUser(userId: string): Promise<Document[]> {
    try {
      return await db
        .select()
        .from(documents)
        .where(eq(documents.userId, userId))
        .orderBy(desc(documents.createdAt)) as Document[];
    } catch (error) {
      handleDatabaseError(error, 'DocumentRepository.findByUser');
    }
  }

  async findByApplication(applicationId: string): Promise<Document[]> {
    try {
      return await db
        .select()
        .from(documents)
        .where(eq(documents.applicationId, applicationId))
        .orderBy(desc(documents.createdAt)) as Document[];
    } catch (error) {
      handleDatabaseError(error, 'DocumentRepository.findByApplication');
    }
  }

  async countByUser(userId: string): Promise<number> {
    try {
      return await this.count(eq(documents.userId, userId));
    } catch (error) {
      handleDatabaseError(error, 'DocumentRepository.countByUser');
    }
  }

  async findAll(filters?: DocumentFilters): Promise<Document[]> {
    try {
      const conditions: SQL[] = [];
      
      if (filters) {
        if (filters.userId) {
          conditions.push(eq(documents.userId, filters.userId));
        }
        if (filters.applicationId) {
          conditions.push(eq(documents.applicationId, filters.applicationId));
        }
        if (filters.documentType) {
          conditions.push(sql`${documents.type} = ${filters.documentType}`);
        }
        // Note: status column doesn't exist in schema
        // This filter option is ignored for now
      }
      
      let query = db.select().from(documents);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }
      
      return await query.orderBy(desc(documents.createdAt)) as Document[];
    } catch (error) {
      handleDatabaseError(error, 'DocumentRepository.findAll');
    }
  }
}

export const documentRepository = new DocumentRepository();
