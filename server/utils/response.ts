/**
 * Standardized Response Utilities for Phozos API
 * 
 * These utilities ensure all API responses follow the same structure,
 * eliminating response type erosion across the application.
 */

import { Response } from "express";
import { randomUUID } from "crypto";
import type { ApiResponse, ApiError, ApiMeta, ErrorCode } from "@shared/api-types";

/**
 * Send a successful API response with data
 * 
 * @param res Express response object
 * @param data Response data of any type
 * @param meta Optional metadata (pagination, etc.)
 * @returns Express response for chaining
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  meta?: Partial<ApiMeta>
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      requestId: res.locals.requestId || randomUUID(),
      timestamp: new Date().toISOString(),
      ...meta
    }
  };

  return res.json(response);
};

/**
 * Send an error API response
 * 
 * @param res Express response object
 * @param status HTTP status code
 * @param code Machine-readable error code
 * @param message Human-readable error message
 * @param details Optional additional error details
 * @param field Optional field name for validation errors
 * @param hint Optional hint for resolving the error
 * @returns Express response for chaining
 */
export const sendError = (
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
  field?: string,
  hint?: string
): Response => {
  const response: ApiResponse<never> = {
    success: false,
    error: {
      code,
      message,
      details,
      field,
      hint
    },
    meta: {
      requestId: res.locals.requestId || randomUUID(),
      timestamp: new Date().toISOString()
    }
  };

  return res.status(status).json(response);
};

/**
 * Send a paginated success response
 * 
 * @param res Express response object
 * @param data Array of items
 * @param pagination Pagination metadata
 * @param totalCount Total number of items
 * @returns Express response for chaining
 */
export const sendPaginatedSuccess = <T>(
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
): Response => {
  return sendSuccess(res, data, {
    pagination,
    totalCount
  });
};

/**
 * Send an empty success response (for DELETE operations, etc.)
 * 
 * @param res Express response object
 * @returns Express response for chaining
 */
export const sendEmptySuccess = (
  res: Response
): Response => {
  return sendSuccess(res, {});
};

/**
 * Common error response helpers with predefined status codes
 */
export const responseHelpers = {
  // 400 Bad Request
  badRequest: (res: Response, message: string, details?: unknown, field?: string) =>
    sendError(res, 400, "INVALID_INPUT", message, details, field),

  // 401 Unauthorized
  unauthorized: (res: Response, message: string = "Authentication required") =>
    sendError(res, 401, "AUTH_REQUIRED", message),

  invalidToken: (res: Response, message: string = "Invalid or expired token") =>
    sendError(res, 401, "AUTH_INVALID_TOKEN", message),

  tokenExpired: (res: Response, message: string = "Token has expired") =>
    sendError(res, 401, "AUTH_TOKEN_EXPIRED", message),

  // 403 Forbidden
  forbidden: (res: Response, message: string = "Insufficient permissions") =>
    sendError(res, 403, "AUTH_INSUFFICIENT_PERMISSIONS", message),

  csrfInvalid: (res: Response, message: string = "Invalid CSRF token") =>
    sendError(res, 403, "CSRF_INVALID", message),

  // 404 Not Found
  notFound: (res: Response, resource: string = "Resource") =>
    sendError(res, 404, "RESOURCE_NOT_FOUND", `${resource} not found`),

  // 409 Conflict
  conflict: (res: Response, message: string) =>
    sendError(res, 409, "RESOURCE_CONFLICT", message),

  // 422 Validation Error
  validationError: (res: Response, message: string, details?: unknown, field?: string) =>
    sendError(res, 422, "VALIDATION_ERROR", message, details, field),

  // 429 Rate Limited
  rateLimited: (res: Response, retryAfter?: number) => {
    const response = sendError(
      res, 
      429, 
      "RATE_LIMITED", 
      "Too many requests. Please try again later.",
      retryAfter ? { retryAfter } : undefined,
      undefined,
      retryAfter ? `Try again in ${retryAfter} seconds` : undefined
    );
    
    if (retryAfter) {
      res.set('Retry-After', retryAfter.toString());
    }
    
    return response;
  },

  // 500 Internal Server Error
  internalError: (res: Response, message: string = "Internal server error") =>
    sendError(res, 500, "INTERNAL_ERROR", message),

  // 503 Service Unavailable
  serviceUnavailable: (res: Response, message: string = "Service temporarily unavailable") =>
    sendError(res, 503, "SERVICE_UNAVAILABLE", message)
};

/**
 * Middleware to add request ID to response locals
 * This should be added early in the middleware chain
 */
export const addRequestId = (req: any, res: Response, next: any) => {
  res.locals.requestId = randomUUID();
  next();
};

/**
 * Legacy response compatibility helper
 * Gradually migrate away from this by using sendSuccess/sendError directly
 */
export const legacyResponse = {
  // Convert old error format to new format
  convertError: (oldError: { message?: string; error?: string }) => {
    return {
      code: "LEGACY_ERROR",
      message: oldError.message || oldError.error || "Unknown error"
    };
  },

  // Check if response is already in new format
  isNewFormat: (responseBody: any): boolean => {
    return typeof responseBody === 'object' && 
           responseBody !== null && 
           'success' in responseBody;
  }
};