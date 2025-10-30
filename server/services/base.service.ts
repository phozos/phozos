import {
  NotFoundError as RepoNotFoundError,
  DuplicateError as RepoDuplicateError,
  ForeignKeyError as RepoForeignKeyError,
  ValidationError as RepoValidationError,
  TransactionError as RepoTransactionError,
  DatabaseError as RepoDatabaseError,
  RepositoryError
} from '../repositories/errors';

import {
  ResourceNotFoundError,
  DuplicateResourceError,
  ValidationServiceError,
  ServiceUnavailableError,
  InvalidOperationError,
  ServiceError
} from './errors';

export interface IService {
  // Base service interface - can be extended with common methods
}

export abstract class BaseService implements IService {
  /**
   * Handle errors from repositories and map them to service-layer errors
   * Preserves error context and stack traces
   */
  protected handleError(error: any, context: string): never {
    console.error(`Error in ${context}:`, error);
    
    // Map repository errors to service errors
    if (error instanceof RepoNotFoundError) {
      throw new ResourceNotFoundError(
        error.context?.entity || 'Resource',
        error.context?.identifier,
        { originalError: error.message, context }
      );
    }
    
    if (error instanceof RepoDuplicateError) {
      throw new DuplicateResourceError(
        error.context?.entity || 'Resource',
        error.context?.field || 'field',
        error.context?.value,
        { originalError: error.message, context }
      );
    }
    
    if (error instanceof RepoForeignKeyError) {
      throw new InvalidOperationError(
        'reference resource',
        `Referenced ${error.context?.referencedEntity || 'resource'} does not exist`,
        { originalError: error.message, context }
      );
    }
    
    if (error instanceof RepoValidationError) {
      throw new ValidationServiceError(
        error.context?.entity || 'Resource',
        error.context?.errors || { general: error.message },
        { originalError: error.message, context }
      );
    }
    
    if (error instanceof RepoTransactionError || error instanceof RepoDatabaseError) {
      throw new ServiceUnavailableError(
        'database',
        'Database operation failed, please try again',
        { originalError: error.message, context }
      );
    }
    
    // Map database error codes directly (for errors not wrapped by repository)
    if (error.code === '23505') {
      const match = error.detail?.match(/Key \(([^)]+)\)=\(([^)]+)\)/);
      const field = match?.[1] || 'field';
      const value = match?.[2] || 'unknown';
      throw new DuplicateResourceError('Resource', field, value, { context });
    }
    
    if (error.code === '23503') {
      throw new InvalidOperationError(
        'reference resource',
        'Referenced resource does not exist',
        { context, detail: error.detail }
      );
    }
    
    if (error.code === '23502') {
      throw new ValidationServiceError(
        'Resource',
        { general: 'Required field is missing' },
        { context, detail: error.detail }
      );
    }
    
    // If already a ServiceError, re-throw it
    if (error instanceof ServiceError) {
      throw error;
    }
    
    // For any other error, wrap in generic ServiceError
    throw new ServiceError(
      error.message || 'An unexpected error occurred',
      'INTERNAL_ERROR',
      500,
      { originalError: error, context }
    );
  }

  protected validateRequired(data: any, fields: string[]): void {
    const missing = fields.filter(field => !data[field]);
    if (missing.length > 0) {
      throw new ValidationServiceError(
        'Input',
        { fields: `Missing required fields: ${missing.join(', ')}` }
      );
    }
  }

  protected sanitizeUser(user: any) {
    const { password, temporaryPassword, ...sanitized } = user;
    return sanitized;
  }
}
