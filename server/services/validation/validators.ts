import { ValidationServiceError } from '../errors';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export class CommonValidators {
  static validateEmail(email: string): ValidationResult {
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true };
  }

  static validateUrl(url: string): ValidationResult {
    if (!url || typeof url !== 'string') {
      return { valid: false, error: 'URL is required' };
    }

    try {
      new URL(url);
      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  static validatePhoneNumber(phone: string): ValidationResult {
    if (!phone || typeof phone !== 'string') {
      return { valid: false, error: 'Phone number is required' };
    }

    const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
    if (!phoneRegex.test(phone)) {
      return { valid: false, error: 'Invalid phone number format' };
    }

    return { valid: true };
  }

  static validateDateRange(startDate: Date, endDate: Date): ValidationResult {
    if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
      return { valid: false, error: 'Invalid date objects' };
    }

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return { valid: false, error: 'Invalid date values' };
    }

    if (startDate >= endDate) {
      return { valid: false, error: 'Start date must be before end date' };
    }

    return { valid: true };
  }

  static validateFutureDate(date: Date): ValidationResult {
    if (!(date instanceof Date)) {
      return { valid: false, error: 'Invalid date object' };
    }

    if (Number.isNaN(date.getTime())) {
      return { valid: false, error: 'Invalid date value' };
    }

    if (date <= new Date()) {
      return { valid: false, error: 'Date must be in the future' };
    }

    return { valid: true };
  }

  static validatePastDate(date: Date): ValidationResult {
    if (!(date instanceof Date)) {
      return { valid: false, error: 'Invalid date object' };
    }

    if (Number.isNaN(date.getTime())) {
      return { valid: false, error: 'Invalid date value' };
    }

    if (date >= new Date()) {
      return { valid: false, error: 'Date must be in the past' };
    }

    return { valid: true };
  }

  static validatePositiveNumber(num: number, fieldName: string = 'Value'): ValidationResult {
    if (typeof num !== 'number' || isNaN(num)) {
      return { valid: false, error: `${fieldName} must be a valid number` };
    }

    if (num <= 0) {
      return { valid: false, error: `${fieldName} must be positive` };
    }

    return { valid: true };
  }

  static validateRange(value: number, min: number, max: number, fieldName: string = 'Value'): ValidationResult {
    if (typeof value !== 'number' || isNaN(value)) {
      return { valid: false, error: `${fieldName} must be a valid number` };
    }

    if (value < min || value > max) {
      return { valid: false, error: `${fieldName} must be between ${min} and ${max}` };
    }

    return { valid: true };
  }

  static validateStringLength(str: string, min: number, max: number, fieldName: string = 'Value'): ValidationResult {
    if (typeof str !== 'string') {
      return { valid: false, error: `${fieldName} must be a string` };
    }

    if (str.length < min) {
      return { valid: false, error: `${fieldName} must be at least ${min} characters` };
    }

    if (str.length > max) {
      return { valid: false, error: `${fieldName} must not exceed ${max} characters` };
    }

    return { valid: true };
  }

  static validateEnum<T extends string>(value: T, allowedValues: T[], fieldName: string = 'Value'): ValidationResult {
    if (!allowedValues.includes(value)) {
      return { valid: false, error: `${fieldName} must be one of: ${allowedValues.join(', ')}` };
    }

    return { valid: true };
  }

  static validateUUID(id: string, fieldName: string = 'ID'): ValidationResult {
    if (!id || typeof id !== 'string') {
      return { valid: false, error: `${fieldName} is required` };
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return { valid: false, error: `${fieldName} must be a valid UUID` };
    }

    return { valid: true };
  }

  static validateArrayNotEmpty<T>(arr: T[], fieldName: string = 'Array'): ValidationResult {
    if (!Array.isArray(arr) || arr.length === 0) {
      return { valid: false, error: `${fieldName} must contain at least one item` };
    }

    return { valid: true };
  }

  static validateFileExtension(filename: string, allowedExtensions: string[]): ValidationResult {
    if (!filename || typeof filename !== 'string') {
      return { valid: false, error: 'Filename is required' };
    }

    const ext = filename.split('.').pop()?.toLowerCase();
    if (!ext || !allowedExtensions.includes(ext)) {
      return { valid: false, error: `File must have one of these extensions: ${allowedExtensions.join(', ')}` };
    }

    return { valid: true };
  }

  static validateFileSize(sizeInBytes: number, maxSizeInMB: number): ValidationResult {
    if (typeof sizeInBytes !== 'number' || sizeInBytes <= 0) {
      return { valid: false, error: 'Invalid file size' };
    }

    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (sizeInBytes > maxSizeInBytes) {
      return { valid: false, error: `File size must not exceed ${maxSizeInMB}MB` };
    }

    return { valid: true };
  }
}

export function throwValidationError(entity: string, errors: Record<string, string>): never {
  throw new ValidationServiceError(entity, errors);
}

export function validateOrThrow(result: ValidationResult, entity: string, field: string): void {
  if (!result.valid) {
    throw new ValidationServiceError(entity, { [field]: result.error || 'Validation failed' });
  }
}
