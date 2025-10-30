import { Response } from 'express';
import { sendSuccess, sendError, sendEmptySuccess, sendPaginatedSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types/auth';
import {
  ServiceError,
  AuthenticationError,
  AuthorizationError,
  ValidationServiceError,
  BusinessRuleViolationError,
  ResourceNotFoundError,
  DuplicateResourceError,
  ServiceUnavailableError,
  InvalidOperationError
} from '../services/errors';
import { featuresConfig } from '../config';

/**
 * Base Controller
 * 
 * Abstract base class providing common functionality for all controllers.
 * Provides standardized response handling, error processing, and utility methods.
 * All controllers should extend this class to maintain consistency.
 * 
 * @abstract
 * @class BaseController
 */
export abstract class BaseController {
  /**
   * Send a successful API response with data
   * 
   * @protected
   * @template T - Type of the response data
   * @param {Response} res - Express response object
   * @param {T} data - Data to send in the response
   * @returns {Response} Express response with success format
   */
  protected sendSuccess<T>(res: Response, data: T) {
    return sendSuccess(res, data);
  }

  /**
   * Send a paginated success response
   * 
   * @protected
   * @template T - Type of the array elements
   * @param {Response} res - Express response object
   * @param {T[]} data - Array of data items
   * @param {Object} pagination - Pagination metadata
   * @param {number} pagination.page - Current page number
   * @param {number} pagination.limit - Items per page
   * @param {number} pagination.totalPages - Total number of pages
   * @param {boolean} pagination.hasNext - Whether there is a next page
   * @param {boolean} pagination.hasPrev - Whether there is a previous page
   * @param {number} [totalCount] - Optional total count of items
   * @returns {Response} Express response with paginated success format
   */
  protected sendPaginatedSuccess<T>(
    res: Response,
    data: T[],
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    },
    totalCount?: number
  ) {
    return sendPaginatedSuccess(res, data, pagination, totalCount);
  }

  /**
   * Send an error API response
   * 
   * @protected
   * @param {Response} res - Express response object
   * @param {number} status - HTTP status code
   * @param {string} code - Application-specific error code
   * @param {string} message - Human-readable error message
   * @param {any} [details] - Additional error details
   * @param {string} [field] - Field name if validation error
   * @param {string} [hint] - Helpful hint for resolving the error
   * @returns {Response} Express response with error format
   */
  protected sendError(
    res: Response,
    status: number,
    code: string,
    message: string,
    details?: any,
    field?: string,
    hint?: string
  ) {
    return sendError(res, status, code, message, details, field, hint);
  }

  /**
   * Send an empty success response (for DELETE operations, etc.)
   * 
   * @protected
   * @param {Response} res - Express response object
   * @returns {Response} Express response with empty success format
   */
  protected sendEmptySuccess(res: Response) {
    return sendEmptySuccess(res);
  }

  /**
   * Send a file download response (for CSV, PDF, etc.)
   * This is a standardized helper for file downloads that maintains
   * consistency while allowing proper Content-Type and Content-Disposition headers
   * 
   * @protected
   * @param {Response} res - Express response object
   * @param {string | Buffer} content - File content to download
   * @param {string} filename - Name of the file for download
   * @param {string} [mimeType='application/octet-stream'] - MIME type of the file
   * @returns {Response} Express response with file download headers
   */
  protected sendFileDownload(
    res: Response,
    content: string | Buffer,
    filename: string,
    mimeType: string = 'application/octet-stream'
  ) {
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    return res.send(content);
  }

  /**
   * Get authenticated user ID from request
   * 
   * @protected
   * @param {AuthenticatedRequest} req - Express request with authenticated user
   * @returns {string} User ID from the authenticated request
   * @throws {AuthenticationError} If user is not authenticated or ID is missing
   */
  protected getUserId(req: AuthenticatedRequest): string {
    if (!req.user?.id) {
      throw new AuthenticationError('Authentication required');
    }
    return req.user.id;
  }

  /**
   * Get authenticated user object from request
   * 
   * @protected
   * @param {AuthenticatedRequest} req - Express request with authenticated user
   * @returns {User} Authenticated user object
   * @throws {AuthenticationError} If user is not authenticated
   */
  protected getUser(req: AuthenticatedRequest) {
    if (!req.user) {
      throw new AuthenticationError('Authentication required');
    }
    return req.user;
  }

  /**
   * Centralized error handling for controllers
   * 
   * Handles all service-layer errors and legacy error formats.
   * Maps domain errors to appropriate HTTP status codes and error responses.
   * 
   * @protected
   * @param {Response} res - Express response object
   * @param {any} error - Error object to handle
   * @param {string} context - Context string for logging (e.g., 'ControllerName.methodName')
   * @returns {Response} Express response with formatted error
   */
  protected handleError(res: Response, error: any, context: string) {
    console.error(`Error in ${context}:`, error);

    // Handle new service-layer domain errors
    if (error instanceof AuthenticationError) {
      return this.sendError(
        res,
        error.statusCode,
        error.code,
        error.message,
        featuresConfig.ERROR_DETAILS_ENABLED ? error.context : undefined
      );
    }

    if (error instanceof AuthorizationError) {
      return this.sendError(
        res,
        error.statusCode,
        error.code,
        error.message,
        featuresConfig.ERROR_DETAILS_ENABLED ? error.context : undefined
      );
    }

    if (error instanceof ValidationServiceError) {
      return this.sendError(
        res,
        error.statusCode,
        error.code,
        error.message,
        error.context?.errors
      );
    }

    if (error instanceof BusinessRuleViolationError) {
      return this.sendError(
        res,
        error.statusCode,
        error.code,
        error.message,
        featuresConfig.ERROR_DETAILS_ENABLED ? error.context : undefined
      );
    }

    if (error instanceof ResourceNotFoundError) {
      return this.sendError(
        res,
        error.statusCode,
        error.code,
        error.message,
        featuresConfig.ERROR_DETAILS_ENABLED ? error.context : undefined
      );
    }

    if (error instanceof DuplicateResourceError) {
      return this.sendError(
        res,
        error.statusCode,
        error.code,
        error.message,
        featuresConfig.ERROR_DETAILS_ENABLED ? error.context : undefined
      );
    }

    if (error instanceof ServiceUnavailableError) {
      return this.sendError(
        res,
        error.statusCode,
        error.code,
        error.message,
        featuresConfig.ERROR_DETAILS_ENABLED ? error.context : undefined
      );
    }

    if (error instanceof InvalidOperationError) {
      return this.sendError(
        res,
        error.statusCode,
        error.code,
        error.message,
        featuresConfig.ERROR_DETAILS_ENABLED ? error.context : undefined
      );
    }

    // Generic ServiceError catch-all
    if (error instanceof ServiceError) {
      return this.sendError(
        res,
        error.statusCode,
        error.code,
        error.message,
        featuresConfig.ERROR_DETAILS_ENABLED ? error.context : undefined
      );
    }

    // Legacy error message handling (for backwards compatibility during migration)
    if (error.message === 'USER_NOT_FOUND') {
      return this.sendError(res, 404, 'USER_NOT_FOUND', 'User not found');
    }
    if (error.message === 'EMAIL_ALREADY_EXISTS') {
      return this.sendError(res, 409, 'EMAIL_EXISTS', 'Email already registered');
    }
    if (error.message === 'INVALID_CREDENTIALS') {
      return this.sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }
    if (error.message === 'USER_NOT_AUTHENTICATED') {
      return this.sendError(res, 401, 'AUTH_REQUIRED', 'Authentication required');
    }
    if (error.message === 'ACCESS_DENIED' || error.message === 'FORBIDDEN') {
      return this.sendError(res, 403, 'ACCESS_DENIED', 'You do not have permission to perform this action');
    }
    if (error.message === 'RESOURCE_NOT_FOUND' || error.message?.includes('not found')) {
      return this.sendError(res, 404, 'RESOURCE_NOT_FOUND', error.message || 'Resource not found');
    }
    if (error.message === 'DUPLICATE_ENTRY') {
      return this.sendError(res, 409, 'DUPLICATE_ENTRY', 'A resource with this information already exists');
    }
    if (error.message === 'FOREIGN_KEY_VIOLATION') {
      return this.sendError(res, 400, 'INVALID_REFERENCE', 'Referenced resource does not exist');
    }
    if (error.message === 'NOT_NULL_VIOLATION') {
      return this.sendError(res, 400, 'MISSING_REQUIRED_FIELD', 'Required field is missing');
    }
    if (error.message?.includes('Missing required fields')) {
      return this.sendError(res, 400, 'VALIDATION_ERROR', error.message);
    }
    if (error.message === 'INVALID_PAGINATION') {
      return this.sendError(res, 400, 'INVALID_PAGINATION', error.details || 'Invalid pagination parameters');
    }

    // Default internal server error
    return this.sendError(
      res,
      500,
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      featuresConfig.ERROR_DETAILS_ENABLED ? error.message : undefined
    );
  }

  /**
   * Sanitize user object by removing sensitive fields
   * 
   * @protected
   * @param {any} user - User object to sanitize
   * @returns {any} Sanitized user object without password fields
   */
  protected sanitizeUser(user: any) {
    if (!user) return null;
    const { password, temporaryPassword, ...sanitized } = user;
    return sanitized;
  }

  /**
   * Validate and parse pagination parameters
   * 
   * @protected
   * @param {string} [page] - Page number as string
   * @param {string} [limit] - Items per page as string
   * @returns {{ page: number; limit: number }} Validated pagination object
   * @throws {Error} Throws INVALID_PAGINATION error if parameters are invalid
   */
  protected validatePagination(page?: string, limit?: string) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    if (isNaN(pageNum) || pageNum < 1) {
      const error: any = new Error('INVALID_PAGINATION');
      error.details = 'Invalid page number';
      throw error;
    }
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      const error: any = new Error('INVALID_PAGINATION');
      error.details = 'Invalid limit (must be between 1 and 100)';
      throw error;
    }

    return { page: pageNum, limit: limitNum };
  }
}
