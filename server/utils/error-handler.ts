/**
 * Standardized Error Handling Utility
 * Implements P2.6 from REMEDIATION_PLAN.md
 * 
 * Pattern: Services throw, controllers catch
 * - Services focus on business logic and throw typed errors
 * - Controllers handle all errors and convert to HTTP responses
 */

import { Response } from 'express';
import { 
  NotFoundError, 
  ValidationError, 
  DuplicateRecordError,
  ForeignKeyViolationError 
} from '../repositories/errors';
import { 
  InvalidOperationError, 
  ValidationServiceError 
} from '../services/errors';
import { logger } from './logger';

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Centralized error handler for controllers
 * Maps all application errors to appropriate HTTP responses
 */
export class ErrorHandler {
  /**
   * Handle error and send appropriate HTTP response
   */
  static handleError(res: Response, error: unknown, context?: string): Response {
    // Log error for debugging
    logger.error('Error occurred', {
      context,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    // Handle known error types
    if (error instanceof NotFoundError) {
      return this.sendError(res, 404, 'NOT_FOUND', error.message);
    }

    if (error instanceof ValidationError) {
      return this.sendError(res, 400, 'VALIDATION_ERROR', error.message, {
        field: error.field,
        constraint: error.constraint
      });
    }

    if (error instanceof ValidationServiceError) {
      return this.sendError(res, 400, 'VALIDATION_ERROR', error.message, {
        errors: error.validationErrors
      });
    }

    if (error instanceof InvalidOperationError) {
      return this.sendError(res, 400, 'INVALID_OPERATION', error.message, {
        operation: error.operation
      });
    }

    if (error instanceof DuplicateRecordError) {
      return this.sendError(res, 409, 'DUPLICATE_RECORD', error.message, {
        field: error.field
      });
    }

    if (error instanceof ForeignKeyViolationError) {
      return this.sendError(res, 400, 'FOREIGN_KEY_VIOLATION', error.message, {
        constraint: error.constraint
      });
    }

    // Handle unknown errors
    return this.sendError(
      res, 
      500, 
      'INTERNAL_SERVER_ERROR', 
      'An unexpected error occurred. Please try again later.'
    );
  }

  /**
   * Send error response with consistent format
   */
  private static sendError(
    res: Response,
    status: number,
    code: string,
    message: string,
    details?: any
  ): Response {
    const response: ErrorResponse = {
      success: false,
      error: {
        code,
        message,
        ...(details && { details })
      }
    };

    return res.status(status).json(response);
  }

  /**
   * Send success response with consistent format
   */
  static sendSuccess<T = any>(
    res: Response,
    data: T,
    status: number = 200
  ): Response {
    return res.status(status).json({
      success: true,
      data
    });
  }
}

/**
 * Express error handling middleware
 * Catches all unhandled errors from routes
 */
export function globalErrorHandler(
  error: unknown,
  req: any,
  res: Response,
  next: any
) {
  return ErrorHandler.handleError(res, error, `${req.method} ${req.path}`);
}
