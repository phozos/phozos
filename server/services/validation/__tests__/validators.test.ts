import { describe, it, expect } from 'vitest';
import { CommonValidators, ValidationResult } from '../validators';

describe('CommonValidators', () => {
  describe('validateEmail', () => {
    it('should validate correct email', () => {
      const result = CommonValidators.validateEmail('test@example.com');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = CommonValidators.validateEmail('invalid-email');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    it('should reject empty email', () => {
      const result = CommonValidators.validateEmail('');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URL', () => {
      const result = CommonValidators.validateUrl('https://example.com');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid URL', () => {
      const result = CommonValidators.validateUrl('not-a-url');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid URL format');
    });
  });

  describe('validateUUID', () => {
    it('should validate correct UUID', () => {
      const result = CommonValidators.validateUUID('550e8400-e29b-41d4-a716-446655440000');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = CommonValidators.validateUUID('not-a-uuid');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('ID must be a valid UUID');
    });
  });

  describe('validatePositiveNumber', () => {
    it('should validate positive numbers', () => {
      const result = CommonValidators.validatePositiveNumber(10);
      expect(result.valid).toBe(true);
    });

    it('should reject zero', () => {
      const result = CommonValidators.validatePositiveNumber(0);
      expect(result.valid).toBe(false);
    });

    it('should reject negative numbers', () => {
      const result = CommonValidators.validatePositiveNumber(-5);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateStringLength', () => {
    it('should validate strings within range', () => {
      const result = CommonValidators.validateStringLength('hello', 1, 10);
      expect(result.valid).toBe(true);
    });

    it('should reject strings too short', () => {
      const result = CommonValidators.validateStringLength('hi', 5, 10);
      expect(result.valid).toBe(false);
    });

    it('should reject strings too long', () => {
      const result = CommonValidators.validateStringLength('hello world', 1, 5);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateFileExtension', () => {
    it('should validate allowed extensions', () => {
      const result = CommonValidators.validateFileExtension('document.pdf', ['pdf', 'doc']);
      expect(result.valid).toBe(true);
    });

    it('should reject disallowed extensions', () => {
      const result = CommonValidators.validateFileExtension('document.exe', ['pdf', 'doc']);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('should validate files within size limit', () => {
      const result = CommonValidators.validateFileSize(1024 * 1024, 5); // 1MB, max 5MB
      expect(result.valid).toBe(true);
    });

    it('should reject files exceeding size limit', () => {
      const result = CommonValidators.validateFileSize(6 * 1024 * 1024, 5); // 6MB, max 5MB
      expect(result.valid).toBe(false);
    });
  });

  describe('validateDateRange', () => {
    it('should validate valid date range', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const result = CommonValidators.validateDateRange(start, end);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid date range', () => {
      const start = new Date('2024-12-31');
      const end = new Date('2024-01-01');
      const result = CommonValidators.validateDateRange(start, end);
      expect(result.valid).toBe(false);
    });

    it('should reject Invalid Date (NaN)', () => {
      const start = new Date('not-a-date');
      const end = new Date('2024-12-31');
      const result = CommonValidators.validateDateRange(start, end);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid date values');
    });
  });

  describe('validateFutureDate', () => {
    it('should reject Invalid Date (NaN)', () => {
      const invalidDate = new Date('invalid-date-string');
      const result = CommonValidators.validateFutureDate(invalidDate);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid date value');
    });
  });

  describe('validatePastDate', () => {
    it('should reject Invalid Date (NaN)', () => {
      const invalidDate = new Date('garbage-input');
      const result = CommonValidators.validatePastDate(invalidDate);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid date value');
    });
  });
});
