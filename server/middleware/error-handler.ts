/**
 * Centralized Error Handling Middleware for Phozos API
 * 
 * This middleware provides consistent error responses and handles
 * different types of errors in a standardized way.
 */

import { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response";
import { ErrorCodes } from "@shared/api-types";
import logger from "../utils/logger";
import { sanitizeHeaders, sanitizeBody } from "../utils/logger-sanitizers";
import { featuresConfig } from "../config";

/**
 * Custom HTTP Error class for throwing structured errors
 * Use this instead of throwing plain Error objects
 */
export class HttpError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly field?: string;
  public readonly hint?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
    field?: string,
    hint?: string
  ) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.field = field;
    this.hint = hint;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError);
    }
  }

  /**
   * Convert to JSON for logging
   */
  toJSON() {
    return {
      name: this.name,
      status: this.status,
      code: this.code,
      message: this.message,
      details: this.details,
      field: this.field,
      hint: this.hint,
      stack: this.stack
    };
  }
}

/**
 * Centralized error handling middleware
 * This should be the LAST middleware in your Express app
 */
export const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // If response already sent, delegate to Express default error handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle our custom HttpError
  if (err instanceof HttpError) {
    return sendError(
      res,
      err.status,
      err.code,
      err.message,
      err.details,
      err.field,
      err.hint
    );
  }

  // Handle JWT-specific errors
  if (err.name === 'JsonWebTokenError') {
    logger.warn('JWT verification failed', { error: err.message });
    return sendError(res, 401, ErrorCodes.AUTH_INVALID_TOKEN, 'Invalid authentication token');
  }

  if (err.name === 'TokenExpiredError') {
    logger.warn('JWT token expired');
    return sendError(res, 401, ErrorCodes.AUTH_TOKEN_EXPIRED, 'Authentication token has expired');
  }

  if (err.name === 'NotBeforeError') {
    logger.warn('JWT token used before valid');
    return sendError(res, 401, ErrorCodes.AUTH_INVALID_TOKEN, 'Token is not yet valid');
  }

  // Handle CSRF errors
  if (err.message?.toLowerCase().includes('csrf') || err.code === 'EBADCSRFTOKEN') {
    logger.warn('CSRF error', { error: err.message, code: err.code });
    return sendError(
      res, 
      403, 
      ErrorCodes.CSRF_INVALID, 
      'CSRF token validation failed',
      undefined,
      undefined,
      'Please refresh the page and try again'
    );
  }

  // Handle validation errors (from middleware like express-validator)
  if (err.name === 'ValidationError' || err.type === 'validation') {
    const details = err.details || err.errors || err.array?.();
    return sendError(
      res,
      422,
      ErrorCodes.VALIDATION_ERROR,
      err.message || 'Validation failed',
      details
    );
  }

  // Handle rate limiting errors
  if (err.status === 429 || err.message?.includes('rate limit')) {
    const retryAfter = err.retryAfter || 60;
    res.set('Retry-After', retryAfter.toString());
    return sendError(
      res,
      429,
      ErrorCodes.RATE_LIMITED,
      'Too many requests. Please try again later.',
      { retryAfter },
      undefined,
      `Try again in ${retryAfter} seconds`
    );
  }

  // Handle common Express/Node.js errors
  if (err.code === 'ENOENT') {
    return sendError(res, 404, ErrorCodes.RESOURCE_NOT_FOUND, 'Resource not found');
  }

  if (err.code === 'ECONNREFUSED') {
    return sendError(res, 503, ErrorCodes.SERVICE_UNAVAILABLE, 'Service temporarily unavailable');
  }

  // Handle database connection errors
  if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
    logger.error('Database connection error', { 
      code: err.code, 
      error: err.message,
      stack: err.stack
    });
    return sendError(res, 503, ErrorCodes.SERVICE_UNAVAILABLE, 'Database service unavailable');
  }

  // Handle Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return sendError(
      res,
      413,
      ErrorCodes.VALIDATION_ERROR,
      'File size too large',
      { maxSize: err.field === 'fileSize' ? '5MB' : 'unknown' }
    );
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return sendError(
      res,
      400,
      ErrorCodes.VALIDATION_ERROR,
      'Unexpected file field',
      { field: err.field }
    );
  }

  // Handle syntax errors in JSON parsing
  if (err instanceof SyntaxError && 'body' in err) {
    return sendError(
      res,
      400,
      ErrorCodes.INVALID_INPUT,
      'Invalid JSON in request body'
    );
  }

  // Handle custom application errors by checking error message patterns
  const errorPatterns = [
    {
      pattern: /jwt enhanced verification failed/i,
      status: 401,
      code: ErrorCodes.AUTH_INVALID_TOKEN,
      message: 'Authentication failed'
    },
    {
      pattern: /jwt verification blocked/i,
      status: 401,
      code: ErrorCodes.AUTH_INVALID_TOKEN,
      message: 'Authentication blocked due to security policy',
      hint: 'Contact administrator if this persists'
    },
    {
      pattern: /invalid algorithm/i,
      status: 401,
      code: ErrorCodes.AUTH_INVALID_TOKEN,
      message: 'Invalid token algorithm'
    },
    {
      pattern: /audience mismatch|issuer mismatch/i,
      status: 401,
      code: ErrorCodes.AUTH_INVALID_TOKEN,
      message: 'Token validation failed'
    }
  ];

  for (const pattern of errorPatterns) {
    if (pattern.pattern.test(err.message)) {
      logger.warn('Pattern matched error', { 
        error: err.message,
        pattern: pattern.message
      });
      return sendError(
        res,
        pattern.status,
        pattern.code,
        pattern.message,
        undefined,
        undefined,
        pattern.hint
      );
    }
  }

  // Log unhandled errors for debugging (with sanitization)
  logger.error('Unhandled error in API', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    headers: sanitizeHeaders(req.headers),
    body: sanitizeBody(req.body),
    userId: (req as any).user?.id || 'anonymous'
  });

  // Default fallback for any unhandled errors
  return sendError(
    res,
    500,
    ErrorCodes.INTERNAL_ERROR,
    featuresConfig.ERROR_DETAILS_ENABLED 
      ? `Internal server error: ${err.message}` 
      : 'Internal server error'
  );
};

/**
 * 404 handler for unmatched routes
 * This should be added after all your routes but before the error handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new HttpError(
    404,
    ErrorCodes.RESOURCE_NOT_FOUND,
    `Cannot ${req.method} ${req.path}`,
    {
      method: req.method,
      path: req.path,
      availableRoutes: 'Check API documentation for available endpoints'
    }
  );
  
  next(error);
};

/**
 * Async error wrapper for route handlers
 * Use this to wrap async route handlers to catch and forward errors
 */
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Helper function to create common HTTP errors
 */
export const createHttpError = {
  badRequest: (message: string, details?: unknown, field?: string) =>
    new HttpError(400, ErrorCodes.INVALID_INPUT, message, details, field),

  unauthorized: (message: string = "Authentication required") =>
    new HttpError(401, ErrorCodes.AUTH_REQUIRED, message),

  forbidden: (message: string = "Insufficient permissions") =>
    new HttpError(403, ErrorCodes.AUTH_INSUFFICIENT_PERMISSIONS, message),

  notFound: (resource: string = "Resource") =>
    new HttpError(404, ErrorCodes.RESOURCE_NOT_FOUND, `${resource} not found`),

  conflict: (message: string) =>
    new HttpError(409, ErrorCodes.RESOURCE_CONFLICT, message),

  validationError: (message: string, details?: unknown, field?: string) =>
    new HttpError(422, ErrorCodes.VALIDATION_ERROR, message, details, field),

  internalError: (message: string = "Internal server error") =>
    new HttpError(500, ErrorCodes.INTERNAL_ERROR, message),

  serviceUnavailable: (message: string = "Service temporarily unavailable") =>
    new HttpError(503, ErrorCodes.SERVICE_UNAVAILABLE, message)
};