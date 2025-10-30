import { describe, it, expect } from 'vitest';
import { BusinessRuleValidators } from '../business-rules';
import { BusinessRuleViolationError, ValidationServiceError } from '../../errors';

describe('BusinessRuleValidators', () => {
  describe('validateApplicationStatus', () => {
    it('should allow valid status transitions', () => {
      expect(() => {
        BusinessRuleValidators.validateApplicationStatus('draft', 'submitted');
      }).not.toThrow();
    });

    it('should reject invalid status transitions', () => {
      expect(() => {
        BusinessRuleValidators.validateApplicationStatus('rejected', 'submitted');
      }).toThrow(BusinessRuleViolationError);
    });
  });

  describe('validateEventCapacity', () => {
    it('should pass when capacity is not exceeded', () => {
      expect(() => {
        BusinessRuleValidators.validateEventCapacity(50, 100);
      }).not.toThrow();
    });

    it('should throw when capacity is exceeded', () => {
      expect(() => {
        BusinessRuleValidators.validateEventCapacity(100, 100);
      }).toThrow(BusinessRuleViolationError);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong passwords', () => {
      expect(() => {
        BusinessRuleValidators.validatePasswordStrength('Password123!');
      }).not.toThrow();
    });

    it('should reject weak passwords', () => {
      expect(() => {
        BusinessRuleValidators.validatePasswordStrength('weak');
      }).toThrow(ValidationServiceError);
    });
  });

  describe('validateUniversityRanking', () => {
    it('should validate rankings in valid range', () => {
      expect(() => {
        BusinessRuleValidators.validateUniversityRanking(100);
      }).not.toThrow();
    });

    it('should reject rankings out of range', () => {
      expect(() => {
        BusinessRuleValidators.validateUniversityRanking(6000);
      }).toThrow(ValidationServiceError);
    });
  });

  describe('validatePaymentAmount', () => {
    it('should validate positive amounts', () => {
      expect(() => {
        BusinessRuleValidators.validatePaymentAmount(100, 1);
      }).not.toThrow();
    });

    it('should reject amounts below minimum', () => {
      expect(() => {
        BusinessRuleValidators.validatePaymentAmount(0.5, 1);
      }).toThrow(ValidationServiceError);
    });
  });
});
