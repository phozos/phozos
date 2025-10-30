/**
 * Shared API Response Types for Phozos Application
 * 
 * These types provide a consistent contract between client and server
 * for all API responses, eliminating type erosion issues.
 */

// Core response envelope - all API responses follow this structure
export type ApiResponse<T> = {
  success: true;
  data: T;
  meta?: ApiMeta;
} | {
  success: false;
  error: ApiError;
  meta?: ApiMeta;
};

// Standardized error structure
export interface ApiError {
  code: string;           // Machine-readable error code (e.g., "AUTH_INVALID_TOKEN")
  message: string;        // Human-readable error message
  details?: unknown;      // Optional additional error details
  field?: string;         // For validation errors - which field caused the error
  hint?: string;          // Optional hint for resolving the error
}

// Response metadata
export interface ApiMeta {
  requestId: string;      // Unique request identifier for tracing
  timestamp: string;      // ISO timestamp of response
  pagination?: PaginationMeta;  // For paginated responses
  totalCount?: number;    // Total number of items (for lists)
}

// Pagination metadata
export interface PaginationMeta {
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Standard HTTP status codes mapped to error types
export const ErrorCodes = {
  // Authentication & Authorization
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  
  // CSRF & Security
  CSRF_INVALID: 'CSRF_INVALID',
  CSRF_MISSING: 'CSRF_MISSING',
  
  // Rate Limiting
  RATE_LIMITED: 'RATE_LIMITED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  RESPONSE_VALIDATION_ERROR: 'RESPONSE_VALIDATION_ERROR',
  
  // Resources
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  
  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  
  // Business Logic
  STUDENTS_FETCH_ERROR: 'STUDENTS_FETCH_ERROR',
  UNIVERSITY_CREATE_ERROR: 'UNIVERSITY_CREATE_ERROR',
  FORUM_POST_ERROR: 'FORUM_POST_ERROR'
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

// Helper type for success responses
export type SuccessResponse<T> = Extract<ApiResponse<T>, { success: true }>;

// Helper type for error responses  
export type ErrorResponse = Extract<ApiResponse<never>, { success: false }>;

// Utility type for API handlers
export type ApiHandler<T> = () => Promise<T>;

// Request options for client
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  skipCsrf?: boolean;
  timeout?: number;
}