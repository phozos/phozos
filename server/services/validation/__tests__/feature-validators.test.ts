/**
 * Feature Validators Tests
 * Comprehensive tests for feature validation system
 */

import { describe, it, expect } from 'vitest';
import {
  validateFeatureDependencies,
  validateFeatureCompatibility,
  validateTierRequirements,
  validateQuotaConsistency,
  validatePlanConfiguration,
  validatePlanConfigurationOrThrow,
  getTierQuotaConstraint,
  isFeatureAllowedForTier,
  getAllowedUniversityTiers,
  validatePlanConfigurationChanges,
  FEATURE_DEPENDENCIES,
  INCOMPATIBLE_FEATURES,
  TIER_REQUIREMENTS,
  TIER_QUOTA_CONSTRAINTS,
  UNIVERSITY_TIER_ACCESS,
} from '../feature-validators';
import { PlanConfiguration } from '@shared/types/feature-constraints';
import { ValidationServiceError } from '../../errors';

describe('Feature Validators', () => {
  describe('validateFeatureDependencies', () => {
    it('should pass when all dependencies are met', () => {
      const config: PlanConfiguration = {
        tierLevel: 3,
        maxUniversities: 10,
        maxCountries: 5,
        includeDedicatedManager: true,
        includeCounselorSession: true,
      };

      const result = validateFeatureDependencies(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when includeDedicatedManager is enabled without includeCounselorSession', () => {
      const config: PlanConfiguration = {
        tierLevel: 3,
        maxUniversities: 10,
        maxCountries: 5,
        includeDedicatedManager: true,
        includeCounselorSession: false,
      };

      const result = validateFeatureDependencies(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('includeDedicatedManager');
      expect(result.errors[0].rule).toBe('FEATURE_DEPENDENCY');
      expect(result.errors[0].message).toContain('includeCounselorSession');
    });

    it('should fail when includeFlightAccommodation is enabled without includeVisaSupport', () => {
      const config: PlanConfiguration = {
        tierLevel: 4,
        maxUniversities: 20,
        maxCountries: 10,
        includeFlightAccommodation: true,
        includeVisaSupport: false,
      };

      const result = validateFeatureDependencies(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('includeFlightAccommodation');
      expect(result.errors[0].message).toContain('includeVisaSupport');
    });

    it('should fail when includeNetworkingEvents is enabled without includeCounselorSession', () => {
      const config: PlanConfiguration = {
        tierLevel: 2,
        maxUniversities: 8,
        maxCountries: 4,
        includeNetworkingEvents: true,
        includeCounselorSession: false,
      };

      const result = validateFeatureDependencies(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('includeNetworkingEvents');
      expect(result.errors[0].message).toContain('includeCounselorSession');
    });

    it('should pass when dependent features are not enabled', () => {
      const config: PlanConfiguration = {
        tierLevel: 1,
        maxUniversities: 4,
        maxCountries: 2,
        includeDedicatedManager: false,
        includeFlightAccommodation: false,
      };

      const result = validateFeatureDependencies(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle multiple dependency violations', () => {
      const config: PlanConfiguration = {
        tierLevel: 4,
        maxUniversities: 20,
        maxCountries: 10,
        includeDedicatedManager: true,
        includeFlightAccommodation: true,
        includeNetworkingEvents: true,
        includeCounselorSession: false,
        includeVisaSupport: false,
      };

      const result = validateFeatureDependencies(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('validateFeatureCompatibility', () => {
    it('should pass when no incompatible features are enabled', () => {
      const config: PlanConfiguration = {
        tierLevel: 2,
        maxUniversities: 8,
        maxCountries: 4,
        isBusinessFocused: true,
        includeMockInterview: false,
      };

      const result = validateFeatureCompatibility(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when isBusinessFocused and includeMockInterview are both enabled', () => {
      const config: PlanConfiguration = {
        tierLevel: 2,
        maxUniversities: 8,
        maxCountries: 4,
        isBusinessFocused: true,
        includeMockInterview: true,
      };

      const result = validateFeatureCompatibility(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('isBusinessFocused');
      expect(result.errors[0].rule).toBe('FEATURE_INCOMPATIBILITY');
      expect(result.errors[0].message).toContain('includeMockInterview');
      expect(result.errors[0].context?.reason).toBeDefined();
    });

    it('should pass when neither incompatible feature is enabled', () => {
      const config: PlanConfiguration = {
        tierLevel: 2,
        maxUniversities: 8,
        maxCountries: 4,
        isBusinessFocused: false,
        includeMockInterview: false,
      };

      const result = validateFeatureCompatibility(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass when only includeMockInterview is enabled', () => {
      const config: PlanConfiguration = {
        tierLevel: 2,
        maxUniversities: 8,
        maxCountries: 4,
        isBusinessFocused: false,
        includeMockInterview: true,
      };

      const result = validateFeatureCompatibility(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateTierRequirements', () => {
    it('should pass when includeDedicatedManager is enabled for tier 3', () => {
      const config: PlanConfiguration = {
        tierLevel: 3,
        maxUniversities: 15,
        maxCountries: 8,
        includeDedicatedManager: true,
      };

      const result = validateTierRequirements(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when includeDedicatedManager is enabled for tier 2', () => {
      const config: PlanConfiguration = {
        tierLevel: 2,
        maxUniversities: 8,
        maxCountries: 4,
        includeDedicatedManager: true,
      };

      const result = validateTierRequirements(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('includeDedicatedManager');
      expect(result.errors[0].rule).toBe('TIER_REQUIREMENT');
      expect(result.errors[0].message).toContain('tier level 3');
    });

    it('should pass when includeFlightAccommodation is enabled for tier 4', () => {
      const config: PlanConfiguration = {
        tierLevel: 4,
        maxUniversities: 100,
        maxCountries: 50,
        includeFlightAccommodation: true,
      };

      const result = validateTierRequirements(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when includeFlightAccommodation is enabled for tier 3', () => {
      const config: PlanConfiguration = {
        tierLevel: 3,
        maxUniversities: 15,
        maxCountries: 8,
        includeFlightAccommodation: true,
      };

      const result = validateTierRequirements(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('includeFlightAccommodation');
      expect(result.errors[0].message).toContain('tier level 4');
    });

    it('should validate university tier access for tier 1', () => {
      const config: PlanConfiguration = {
        tierLevel: 1,
        maxUniversities: 4,
        maxCountries: 2,
        universityTier: 'top500',
      };

      const result = validateTierRequirements(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when tier 1 tries to access ivy_league universities', () => {
      const config: PlanConfiguration = {
        tierLevel: 1,
        maxUniversities: 4,
        maxCountries: 2,
        universityTier: 'ivy_league',
      };

      const result = validateTierRequirements(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('universityTier');
      expect(result.errors[0].rule).toBe('UNIVERSITY_TIER_ACCESS');
      expect(result.errors[0].message).toContain('ivy_league');
    });

    it('should allow tier 4 to access all university tiers', () => {
      const config: PlanConfiguration = {
        tierLevel: 4,
        maxUniversities: 100,
        maxCountries: 50,
        universityTier: 'ivy_league',
      };

      const result = validateTierRequirements(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateQuotaConsistency', () => {
    it('should pass for valid tier 1 quotas', () => {
      const config: PlanConfiguration = {
        tierLevel: 1,
        maxUniversities: 4,
        maxCountries: 2,
      };

      const result = validateQuotaConsistency(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when tier 1 exceeds university limit', () => {
      const config: PlanConfiguration = {
        tierLevel: 1,
        maxUniversities: 5,
        maxCountries: 2,
      };

      const result = validateQuotaConsistency(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('maxUniversities');
      expect(result.errors[0].rule).toBe('QUOTA_EXCEEDED');
    });

    it('should fail when tier 1 exceeds country limit', () => {
      const config: PlanConfiguration = {
        tierLevel: 1,
        maxUniversities: 4,
        maxCountries: 3,
      };

      const result = validateQuotaConsistency(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      const countryError = result.errors.find(e => e.field === 'maxCountries');
      expect(countryError).toBeDefined();
      expect(countryError?.rule).toBe('QUOTA_EXCEEDED');
    });

    it('should pass for valid tier 2 quotas', () => {
      const config: PlanConfiguration = {
        tierLevel: 2,
        maxUniversities: 8,
        maxCountries: 4,
      };

      const result = validateQuotaConsistency(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for valid tier 3 quotas', () => {
      const config: PlanConfiguration = {
        tierLevel: 3,
        maxUniversities: 15,
        maxCountries: 8,
      };

      const result = validateQuotaConsistency(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for unlimited tier 4 quotas', () => {
      const config: PlanConfiguration = {
        tierLevel: 4,
        maxUniversities: 1000,
        maxCountries: 500,
      };

      const result = validateQuotaConsistency(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when maxCountries exceeds maxUniversities', () => {
      const config: PlanConfiguration = {
        tierLevel: 2,
        maxUniversities: 4,
        maxCountries: 8,
      };

      const result = validateQuotaConsistency(config);
      expect(result.isValid).toBe(false);
      const consistencyError = result.errors.find(e => e.rule === 'QUOTA_CONSISTENCY');
      expect(consistencyError).toBeDefined();
      expect(consistencyError?.message).toContain('cannot exceed maximum universities');
    });

    it('should fail for non-positive maxUniversities', () => {
      const config: PlanConfiguration = {
        tierLevel: 1,
        maxUniversities: 0,
        maxCountries: 2,
      };

      const result = validateQuotaConsistency(config);
      expect(result.isValid).toBe(false);
      const positiveError = result.errors.find(e => e.rule === 'POSITIVE_QUOTA' && e.field === 'maxUniversities');
      expect(positiveError).toBeDefined();
    });

    it('should fail for non-positive maxCountries', () => {
      const config: PlanConfiguration = {
        tierLevel: 1,
        maxUniversities: 4,
        maxCountries: -1,
      };

      const result = validateQuotaConsistency(config);
      expect(result.isValid).toBe(false);
      const positiveError = result.errors.find(e => e.rule === 'POSITIVE_QUOTA' && e.field === 'maxCountries');
      expect(positiveError).toBeDefined();
    });

    it('should warn when higher tier has fewer universities than lower tier', () => {
      const config: PlanConfiguration = {
        tierLevel: 2,
        maxUniversities: 3,
        maxCountries: 2,
      };

      const result = validateQuotaConsistency(config);
      expect(result.warnings?.length).toBeGreaterThan(0);
      const progressionWarning = result.warnings?.find(w => w.rule === 'TIER_PROGRESSION');
      expect(progressionWarning).toBeDefined();
    });
  });

  describe('validatePlanConfiguration', () => {
    it('should pass for a valid basic plan configuration', () => {
      const config: PlanConfiguration = {
        name: 'Basic Plan',
        tierLevel: 1,
        maxUniversities: 4,
        maxCountries: 2,
        universityTier: 'general',
        includeLoanAssistance: false,
        includeVisaSupport: false,
      };

      const result = validatePlanConfiguration(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for a valid premium plan configuration', () => {
      const config: PlanConfiguration = {
        name: 'Premium Plan',
        tierLevel: 3,
        maxUniversities: 15,
        maxCountries: 8,
        universityTier: 'top100',
        includeLoanAssistance: true,
        includeVisaSupport: true,
        includeCounselorSession: true,
        includeDedicatedManager: true,
        includeNetworkingEvents: true,
      };

      const result = validatePlanConfiguration(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass for a valid elite plan configuration', () => {
      const config: PlanConfiguration = {
        name: 'Elite Plan',
        tierLevel: 4,
        maxUniversities: 100,
        maxCountries: 50,
        universityTier: 'ivy_league',
        includeLoanAssistance: true,
        includeVisaSupport: true,
        includeCounselorSession: true,
        includeDedicatedManager: true,
        includeFlightAccommodation: true,
        includeNetworkingEvents: true,
      };

      const result = validatePlanConfiguration(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail with multiple validation errors', () => {
      const config: PlanConfiguration = {
        name: 'Invalid Plan',
        tierLevel: 1,
        maxUniversities: 10, // Exceeds tier 1 limit
        maxCountries: 5, // Exceeds tier 1 limit
        universityTier: 'ivy_league', // Not allowed for tier 1
        includeDedicatedManager: true, // Requires tier 3+
        includeCounselorSession: false, // Missing dependency
        isBusinessFocused: true,
        includeMockInterview: true, // Incompatible with isBusinessFocused
      };

      const result = validatePlanConfiguration(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });

    it('should collect warnings along with errors', () => {
      const config: PlanConfiguration = {
        tierLevel: 2,
        maxUniversities: 3, // Will trigger tier progression warning
        maxCountries: 2,
      };

      const result = validatePlanConfiguration(config);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });
  });

  describe('validatePlanConfigurationOrThrow', () => {
    it('should not throw for valid configuration', () => {
      const config: PlanConfiguration = {
        tierLevel: 2,
        maxUniversities: 8,
        maxCountries: 4,
      };

      expect(() => validatePlanConfigurationOrThrow(config)).not.toThrow();
    });

    it('should throw ValidationServiceError for invalid configuration', () => {
      const config: PlanConfiguration = {
        tierLevel: 1,
        maxUniversities: 10,
        maxCountries: 5,
      };

      expect(() => validatePlanConfigurationOrThrow(config)).toThrow(ValidationServiceError);
    });

    it('should include error details in thrown exception', () => {
      const config: PlanConfiguration = {
        tierLevel: 1,
        maxUniversities: 10,
        maxCountries: 5,
      };

      try {
        validatePlanConfigurationOrThrow(config);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationServiceError);
        const validationError = error as ValidationServiceError;
        expect(validationError.context?.entity).toBe('PlanConfiguration');
        expect(validationError.context?.errors).toBeDefined();
      }
    });
  });

  describe('Helper Functions', () => {
    describe('getTierQuotaConstraint', () => {
      it('should return constraint for tier 1', () => {
        const constraint = getTierQuotaConstraint(1);
        expect(constraint).toBeDefined();
        expect(constraint?.tierLevel).toBe(1);
        expect(constraint?.maxUniversities).toBe(4);
        expect(constraint?.maxCountries).toBe(2);
      });

      it('should return constraint for tier 4 with unlimited quotas', () => {
        const constraint = getTierQuotaConstraint(4);
        expect(constraint).toBeDefined();
        expect(constraint?.tierLevel).toBe(4);
        expect(constraint?.maxUniversities).toBeNull();
        expect(constraint?.maxCountries).toBeNull();
      });

      it('should return null for invalid tier', () => {
        const constraint = getTierQuotaConstraint(999);
        expect(constraint).toBeNull();
      });
    });

    describe('isFeatureAllowedForTier', () => {
      it('should return true when tier meets requirement', () => {
        const allowed = isFeatureAllowedForTier('includeDedicatedManager', 3);
        expect(allowed).toBe(true);
      });

      it('should return false when tier does not meet requirement', () => {
        const allowed = isFeatureAllowedForTier('includeDedicatedManager', 2);
        expect(allowed).toBe(false);
      });

      it('should return true for features without tier restrictions', () => {
        const allowed = isFeatureAllowedForTier('includeLoanAssistance', 1);
        expect(allowed).toBe(true);
      });

      it('should return true when tier exceeds requirement', () => {
        const allowed = isFeatureAllowedForTier('includeDedicatedManager', 4);
        expect(allowed).toBe(true);
      });
    });

    describe('getAllowedUniversityTiers', () => {
      it('should return correct tiers for tier 1', () => {
        const tiers = getAllowedUniversityTiers(1);
        expect(tiers).toEqual(['general', 'top500']);
      });

      it('should return correct tiers for tier 4', () => {
        const tiers = getAllowedUniversityTiers(4);
        expect(tiers).toEqual(['general', 'top500', 'top200', 'top100', 'ivy_league']);
      });

      it('should return empty array for invalid tier', () => {
        const tiers = getAllowedUniversityTiers(999);
        expect(tiers).toEqual([]);
      });
    });

    describe('validatePlanConfigurationChanges', () => {
      it('should validate merged configuration', () => {
        const currentConfig: PlanConfiguration = {
          tierLevel: 2,
          maxUniversities: 8,
          maxCountries: 4,
          includeCounselorSession: true,
        };

        const changes = {
          includeDedicatedManager: true, // Would require tier 3
        };

        const result = validatePlanConfigurationChanges(currentConfig, changes);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should pass for valid changes', () => {
        const currentConfig: PlanConfiguration = {
          tierLevel: 3,
          maxUniversities: 15,
          maxCountries: 8,
          includeCounselorSession: true,
        };

        const changes = {
          includeDedicatedManager: true,
        };

        const result = validatePlanConfigurationChanges(currentConfig, changes);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('Validation Constants', () => {
    it('should have correct feature dependencies defined', () => {
      expect(FEATURE_DEPENDENCIES).toBeDefined();
      expect(FEATURE_DEPENDENCIES.includeDedicatedManager).toContain('includeCounselorSession');
      expect(FEATURE_DEPENDENCIES.includeFlightAccommodation).toContain('includeVisaSupport');
      expect(FEATURE_DEPENDENCIES.includeNetworkingEvents).toContain('includeCounselorSession');
    });

    it('should have correct incompatible features defined', () => {
      expect(INCOMPATIBLE_FEATURES).toBeDefined();
      expect(INCOMPATIBLE_FEATURES.isBusinessFocused).toBeDefined();
      expect(INCOMPATIBLE_FEATURES.isBusinessFocused.incompatibleWith).toContain('includeMockInterview');
    });

    it('should have correct tier requirements defined', () => {
      expect(TIER_REQUIREMENTS).toBeDefined();
      expect(TIER_REQUIREMENTS.includeDedicatedManager).toBe(3);
      expect(TIER_REQUIREMENTS.includeFlightAccommodation).toBe(4);
    });

    it('should have correct quota constraints defined', () => {
      expect(TIER_QUOTA_CONSTRAINTS).toBeDefined();
      expect(TIER_QUOTA_CONSTRAINTS).toHaveLength(4);
      
      const tier1 = TIER_QUOTA_CONSTRAINTS.find(c => c.tierLevel === 1);
      expect(tier1?.maxUniversities).toBe(4);
      expect(tier1?.maxCountries).toBe(2);

      const tier4 = TIER_QUOTA_CONSTRAINTS.find(c => c.tierLevel === 4);
      expect(tier4?.maxUniversities).toBeNull();
      expect(tier4?.maxCountries).toBeNull();
    });

    it('should have correct university tier access defined', () => {
      expect(UNIVERSITY_TIER_ACCESS).toBeDefined();
      expect(UNIVERSITY_TIER_ACCESS[1]).toEqual(['general', 'top500']);
      expect(UNIVERSITY_TIER_ACCESS[4]).toContain('ivy_league');
    });
  });
});
