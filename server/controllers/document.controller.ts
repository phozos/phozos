import { Response } from 'express';
import { BaseController } from './base.controller';
import { getService, TYPES } from '../services/container';
import { IDocumentService } from '../services/domain/document.service';
import { AuthenticatedRequest } from '../types/auth';
import { z } from 'zod';
import { insertDocumentSchema } from '@shared/schema';

/**
 * Document Controller
 * 
 * Handles student document management including upload, retrieval, and deletion.
 * Follows Phase 3 modularization standards:
 * - Thin controller (HTTP concerns only)
 * - Zod validation for all inputs
 * - Service layer delegation for business logic
 * - Standardized error handling
 * 
 * @class DocumentController
 * @extends {BaseController}
 */
export class DocumentController extends BaseController {
  /**
   * Get all documents for the authenticated user
   * 
   * @route GET /api/documents
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user ID
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns list of user's documents
   * 
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async getDocuments(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const documentService = getService<IDocumentService>(TYPES.IDocumentService);
      const documents = await documentService.getDocumentsByUser(userId);
      return this.sendSuccess(res, documents);
    } catch (error) {
      return this.handleError(res, error, 'DocumentController.getDocuments');
    }
  }

  /**
   * Upload and create a new document for the authenticated user
   * 
   * @route POST /api/documents
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user and document data
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns created document
   * 
   * @example
   * // Request body:
   * {
   *   "name": "Transcript",
   *   "type": "academic",
   *   "url": "https://storage.example.com/transcript.pdf"
   * }
   * 
   * @throws {422} Validation error if input is invalid
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async createDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const validatedData = insertDocumentSchema.parse({
        ...req.body,
        userId
      });
      
      const documentService = getService<IDocumentService>(TYPES.IDocumentService);
      const document = await documentService.createDocument(validatedData);
      res.status(201);
      return this.sendSuccess(res, document);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'DocumentController.createDocument');
    }
  }

  /**
   * Delete a document by ID
   * 
   * @route DELETE /api/documents/:id
   * @access Protected
   * @param {AuthenticatedRequest} req - Request with authenticated user and document ID parameter
   * @param {Response} res - Express response object
   * @returns {Promise<Response>} Returns empty success response
   * 
   * @throws {404} Not found if document doesn't exist
   * @throws {401} Unauthorized if user is not authenticated
   * @throws {500} Internal server error
   */
  async deleteDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      
      const documentService = getService<IDocumentService>(TYPES.IDocumentService);
      const success = await documentService.deleteDocument(id);
      
      if (!success) {
        return this.sendError(res, 404, 'NOT_FOUND', 'Document not found');
      }
      
      return this.sendEmptySuccess(res);
    } catch (error) {
      return this.handleError(res, error, 'DocumentController.deleteDocument');
    }
  }
}

export const documentController = new DocumentController();
