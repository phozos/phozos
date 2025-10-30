export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'RepositoryError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends RepositoryError {
  constructor(entity: string, identifier: string | Record<string, any>, cause?: unknown) {
    const id = typeof identifier === 'string' ? identifier : JSON.stringify(identifier);
    super(
      `${entity} not found: ${id}`,
      cause,
      { entity, identifier }
    );
    this.name = 'NotFoundError';
  }
}

export class DuplicateError extends RepositoryError {
  constructor(entity: string, field: string, value: any, cause?: unknown) {
    super(
      `${entity} with ${field} '${value}' already exists`,
      cause,
      { entity, field, value }
    );
    this.name = 'DuplicateError';
  }
}

export class ForeignKeyError extends RepositoryError {
  constructor(entity: string, referencedEntity: string, cause?: unknown) {
    super(
      `${entity} references non-existent ${referencedEntity}`,
      cause,
      { entity, referencedEntity }
    );
    this.name = 'ForeignKeyError';
  }
}

export class ValidationError extends RepositoryError {
  constructor(entity: string, errors: Record<string, string>, cause?: unknown) {
    super(
      `Validation failed for ${entity}: ${JSON.stringify(errors)}`,
      cause,
      { entity, errors }
    );
    this.name = 'ValidationError';
  }
}

export class TransactionError extends RepositoryError {
  constructor(operation: string, cause?: unknown) {
    super(
      `Transaction failed during ${operation}`,
      cause,
      { operation }
    );
    this.name = 'TransactionError';
  }
}

export class DatabaseError extends RepositoryError {
  constructor(operation: string, cause?: unknown) {
    super(
      `Database operation failed: ${operation}`,
      cause,
      { operation }
    );
    this.name = 'DatabaseError';
  }
}

export function handleDatabaseError(error: any, context: string): never {
  // If error is already a RepositoryError, re-throw it as-is
  if (error instanceof RepositoryError) {
    throw error;
  }
  
  if (error.code === '23505') {
    const match = error.detail?.match(/Key \(([^)]+)\)=\(([^)]+)\)/);
    if (match) {
      throw new DuplicateError(context, match[1], match[2], error);
    }
    throw new DuplicateError(context, 'unknown', 'unknown', error);
  }
  
  if (error.code === '23503') {
    const match = error.detail?.match(/Key \(([^)]+)\)=\(([^)]+)\) is not present in table "([^"]+)"/);
    if (match) {
      throw new ForeignKeyError(context, match[3], error);
    }
    throw new ForeignKeyError(context, 'unknown entity', error);
  }
  
  if (error.code === '23502') {
    throw new ValidationError(context, { error: 'Required field is missing' }, error);
  }
  
  throw new DatabaseError(context, error);
}
