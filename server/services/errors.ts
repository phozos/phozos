/**
 * Service Layer Error Classes
 * These errors represent domain-level failures and are thrown by services
 * They provide better context than generic errors and enable proper HTTP mapping
 */

/**
 * Base class for all service-layer errors
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ServiceError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication errors - Invalid credentials, tokens, etc.
 * HTTP Status: 401
 */
export class AuthenticationError extends ServiceError {
  constructor(message: string = 'Authentication failed', context?: Record<string, any>) {
    super(message, 'AUTHENTICATION_ERROR', 401, context);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization errors - User lacks permission
 * HTTP Status: 403
 */
export class AuthorizationError extends ServiceError {
  constructor(message: string = 'You do not have permission to perform this action', context?: Record<string, any>) {
    super(message, 'AUTHORIZATION_ERROR', 403, context);
    this.name = 'AuthorizationError';
  }
}

/**
 * Validation errors - Invalid input data
 * HTTP Status: 400
 */
export class ValidationServiceError extends ServiceError {
  constructor(
    entity: string,
    errors: Record<string, string>,
    context?: Record<string, any>
  ) {
    const message = `Validation failed for ${entity}`;
    super(message, 'VALIDATION_ERROR', 400, { ...context, entity, errors });
    this.name = 'ValidationServiceError';
  }
}

/**
 * Business rule violation errors - Operation violates domain rules
 * HTTP Status: 422
 */
export class BusinessRuleViolationError extends ServiceError {
  constructor(
    rule: string,
    message: string,
    context?: Record<string, any>
  ) {
    super(message, 'BUSINESS_RULE_VIOLATION', 422, { ...context, rule });
    this.name = 'BusinessRuleViolationError';
  }
}

/**
 * Resource not found errors
 * HTTP Status: 404
 */
export class ResourceNotFoundError extends ServiceError {
  constructor(
    resource: string,
    identifier?: string | Record<string, any>,
    context?: Record<string, any>
  ) {
    const id = identifier 
      ? (typeof identifier === 'string' ? identifier : JSON.stringify(identifier))
      : '';
    const message = id 
      ? `${resource} not found: ${id}`
      : `${resource} not found`;
    super(message, 'RESOURCE_NOT_FOUND', 404, { ...context, resource, identifier });
    this.name = 'ResourceNotFoundError';
  }
}

/**
 * Duplicate resource errors - Resource already exists
 * HTTP Status: 409
 */
export class DuplicateResourceError extends ServiceError {
  constructor(
    resource: string,
    field: string,
    value: any,
    context?: Record<string, any>
  ) {
    const message = `${resource} with ${field} '${value}' already exists`;
    super(message, 'DUPLICATE_RESOURCE', 409, { ...context, resource, field, value });
    this.name = 'DuplicateResourceError';
  }
}

/**
 * Service unavailable errors - External service or dependency failure
 * HTTP Status: 503
 */
export class ServiceUnavailableError extends ServiceError {
  constructor(
    service: string,
    message: string = 'Service temporarily unavailable',
    context?: Record<string, any>
  ) {
    super(message, 'SERVICE_UNAVAILABLE', 503, { ...context, service });
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Invalid operation errors - Operation cannot be performed in current state
 * HTTP Status: 400
 */
export class InvalidOperationError extends ServiceError {
  constructor(
    operation: string,
    reason: string,
    context?: Record<string, any>
  ) {
    const message = `Cannot ${operation}: ${reason}`;
    super(message, 'INVALID_OPERATION', 400, { ...context, operation, reason });
    this.name = 'InvalidOperationError';
  }
}
