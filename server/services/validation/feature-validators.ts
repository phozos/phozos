/**
 * Feature Validation System
 * Validates feature configurations, dependencies, compatibility, tier requirements, and quota constraints
 */

import {
  PlanConfiguration,
  ValidationResult,
  ValidationError,
  FeatureDependencyMap,
  FeatureIncompatibilityMap,
  TierRequirementMap,
  QuotaConstraint,
  UniversityTierAccessMap,
} from '@shared/types/feature-constraints';
import { ValidationServiceError } from '../errors';

/**
 * Feature dependency rules
 * Defines which features require other features to be enabled
 */
export const FEATURE_DEPENDENCIES: FeatureDependencyMap = {
  includeDedicatedManager: ['includeCounselorSession'],
  includeFlightAccommodation: ['includeVisaSupport'],
  includeNetworkingEvents: ['includeCounselorSession'],
};

/**
 * Feature incompatibility rules
 * Defines which features cannot be enabled together
 */
export const INCOMPATIBLE_FEATURES: FeatureIncompatibilityMap = {
  isBusinessFocused: {
    incompatibleWith: ['includeMockInterview'],
    reason: 'Business plans focus on corporate training, not individual student interviews',
  },
};

/**
 * Tier requirement rules
 * Defines the minimum tier level required for premium features
 */
export const TIER_REQUIREMENTS: TierRequirementMap = {
  includeDedicatedManager: 3,
  includeFlightAccommodation: 4,
};

/**
 * University tier access per plan tier
 * Defines which university tiers are accessible at each plan tier
 */
export const UNIVERSITY_TIER_ACCESS: UniversityTierAccessMap = {
  1: ['general', 'top500'],
  2: ['general', 'top500', 'top200'],
  3: ['general', 'top500', 'top200', 'top100'],
  4: ['general', 'top500', 'top200', 'top100', 'ivy_league'],
};

/**
 * Tier quota constraints
 * Defines maximum quotas per tier level (null means unlimited)
 */
export const TIER_QUOTA_CONSTRAINTS: QuotaConstraint[] = [
  {
    tierLevel: 1,
    maxUniversities: 4,
    maxCountries: 2,
    reason: 'Entry-level tier has limited capacity',
  },
  {
    tierLevel: 2,
    maxUniversities: 8,
    maxCountries: 4,
    reason: 'Mid-tier allows moderate capacity',
  },
  {
    tierLevel: 3,
    maxUniversities: 15,
    maxCountries: 8,
    reason: 'Premium tier allows high capacity',
  },
  {
    tierLevel: 4,
    maxUniversities: null, // unlimited
    maxCountries: null, // unlimited
    reason: 'Elite tier has unlimited capacity',
  },
];

/**
 * Validate feature dependencies
 * Ensures all required dependencies are met for enabled features
 */
export function validateFeatureDependencies(config: PlanConfiguration): ValidationResult {
  const errors: ValidationError[] = [];

  for (const [feature, dependencies] of Object.entries(FEATURE_DEPENDENCIES)) {
    const isFeatureEnabled = config[feature] === true;

    if (isFeatureEnabled) {
      for (const requiredFeature of dependencies) {
        if (config[requiredFeature] !== true) {
          errors.push({
            field: feature,
            message: `Feature '${feature}' requires '${requiredFeature}' to be enabled`,
            rule: 'FEATURE_DEPENDENCY',
            context: {
              feature,
              requiredFeature,
              dependencies,
            },
          });
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate feature compatibility
 * Ensures no incompatible features are enabled together
 */
export function validateFeatureCompatibility(config: PlanConfiguration): ValidationResult {
  const errors: ValidationError[] = [];

  for (const [feature, rule] of Object.entries(INCOMPATIBLE_FEATURES)) {
    const isFeatureEnabled = config[feature] === true;

    if (isFeatureEnabled) {
      for (const incompatibleFeature of rule.incompatibleWith) {
        if (config[incompatibleFeature] === true) {
          errors.push({
            field: feature,
            message: `Feature '${feature}' is incompatible with '${incompatibleFeature}': ${rule.reason}`,
            rule: 'FEATURE_INCOMPATIBILITY',
            context: {
              feature,
              incompatibleFeature,
              reason: rule.reason,
            },
          });
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate tier requirements
 * Ensures features are only enabled for appropriate tier levels
 */
export function validateTierRequirements(config: PlanConfiguration): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  for (const [feature, minTierLevel] of Object.entries(TIER_REQUIREMENTS)) {
    const isFeatureEnabled = config[feature] === true;

    if (isFeatureEnabled && config.tierLevel < minTierLevel) {
      errors.push({
        field: feature,
        message: `Feature '${feature}' requires tier level ${minTierLevel} or higher (current: ${config.tierLevel})`,
        rule: 'TIER_REQUIREMENT',
        context: {
          feature,
          minTierLevel,
          currentTierLevel: config.tierLevel,
        },
      });
    }
  }

  // Validate university tier access
  if (config.universityTier) {
    const allowedTiers = UNIVERSITY_TIER_ACCESS[config.tierLevel] || [];
    if (!allowedTiers.includes(config.universityTier)) {
      errors.push({
        field: 'universityTier',
        message: `University tier '${config.universityTier}' is not available for tier level ${config.tierLevel}. Allowed tiers: ${allowedTiers.join(', ')}`,
        rule: 'UNIVERSITY_TIER_ACCESS',
        context: {
          universityTier: config.universityTier,
          tierLevel: config.tierLevel,
          allowedTiers,
        },
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate quota consistency
 * Ensures quotas are consistent with tier level and business rules
 */
export function validateQuotaConsistency(config: PlanConfiguration): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Find constraint for tier level
  const constraint = TIER_QUOTA_CONSTRAINTS.find(c => c.tierLevel === config.tierLevel);

  if (!constraint) {
    errors.push({
      field: 'tierLevel',
      message: `No quota constraints defined for tier level ${config.tierLevel}`,
      rule: 'INVALID_TIER',
      context: {
        tierLevel: config.tierLevel,
      },
    });
    return { isValid: false, errors, warnings };
  }

  // Validate maxUniversities against tier constraint
  if (constraint.maxUniversities !== null && config.maxUniversities > constraint.maxUniversities) {
    errors.push({
      field: 'maxUniversities',
      message: `Maximum universities (${config.maxUniversities}) exceeds tier ${config.tierLevel} limit of ${constraint.maxUniversities}`,
      rule: 'QUOTA_EXCEEDED',
      context: {
        maxUniversities: config.maxUniversities,
        tierLimit: constraint.maxUniversities,
        tierLevel: config.tierLevel,
      },
    });
  }

  // Validate maxCountries against tier constraint
  if (constraint.maxCountries !== null && config.maxCountries > constraint.maxCountries) {
    errors.push({
      field: 'maxCountries',
      message: `Maximum countries (${config.maxCountries}) exceeds tier ${config.tierLevel} limit of ${constraint.maxCountries}`,
      rule: 'QUOTA_EXCEEDED',
      context: {
        maxCountries: config.maxCountries,
        tierLimit: constraint.maxCountries,
        tierLevel: config.tierLevel,
      },
    });
  }

  // Business rule: maxCountries should not exceed maxUniversities
  if (config.maxCountries > config.maxUniversities) {
    errors.push({
      field: 'maxCountries',
      message: `Maximum countries (${config.maxCountries}) cannot exceed maximum universities (${config.maxUniversities})`,
      rule: 'QUOTA_CONSISTENCY',
      context: {
        maxCountries: config.maxCountries,
        maxUniversities: config.maxUniversities,
      },
    });
  }

  // Validate quotas are positive
  if (config.maxUniversities <= 0) {
    errors.push({
      field: 'maxUniversities',
      message: 'Maximum universities must be greater than 0',
      rule: 'POSITIVE_QUOTA',
      context: {
        maxUniversities: config.maxUniversities,
      },
    });
  }

  if (config.maxCountries <= 0) {
    errors.push({
      field: 'maxCountries',
      message: 'Maximum countries must be greater than 0',
      rule: 'POSITIVE_QUOTA',
      context: {
        maxCountries: config.maxCountries,
      },
    });
  }

  // Warning: Higher tier should have more or equal universities than lower tiers
  if (config.tierLevel > 1) {
    const lowerTierConstraint = TIER_QUOTA_CONSTRAINTS.find(c => c.tierLevel === config.tierLevel - 1);
    if (lowerTierConstraint && lowerTierConstraint.maxUniversities !== null) {
      if (config.maxUniversities < lowerTierConstraint.maxUniversities) {
        warnings.push({
          field: 'maxUniversities',
          message: `Tier ${config.tierLevel} has fewer universities (${config.maxUniversities}) than tier ${config.tierLevel - 1} (${lowerTierConstraint.maxUniversities})`,
          rule: 'TIER_PROGRESSION',
          context: {
            currentTier: config.tierLevel,
            currentUniversities: config.maxUniversities,
            lowerTier: config.tierLevel - 1,
            lowerTierUniversities: lowerTierConstraint.maxUniversities,
          },
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Main validation orchestrator
 * Validates all aspects of a plan configuration
 */
export function validatePlanConfiguration(config: PlanConfiguration): ValidationResult {
  const results: ValidationResult[] = [];

  // Run all validation checks
  results.push(validateFeatureDependencies(config));
  results.push(validateFeatureCompatibility(config));
  results.push(validateTierRequirements(config));
  results.push(validateQuotaConsistency(config));

  // Aggregate errors and warnings
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];

  for (const result of results) {
    allErrors.push(...result.errors);
    if (result.warnings) {
      allWarnings.push(...result.warnings);
    }
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Validate plan configuration and throw error if invalid
 * Convenience method for use in services
 */
export function validatePlanConfigurationOrThrow(config: PlanConfiguration): void {
  const result = validatePlanConfiguration(config);

  if (!result.isValid) {
    const errorMessages = result.errors.map(e => `${e.field}: ${e.message}`);
    throw new ValidationServiceError('PlanConfiguration', {
      validation: errorMessages.join('; '),
    });
  }
}

/**
 * Get tier quota constraint for a specific tier level
 */
export function getTierQuotaConstraint(tierLevel: number): QuotaConstraint | null {
  return TIER_QUOTA_CONSTRAINTS.find(c => c.tierLevel === tierLevel) || null;
}

/**
 * Check if a feature is allowed for a specific tier level
 */
export function isFeatureAllowedForTier(featureName: string, tierLevel: number): boolean {
  const minTierLevel = TIER_REQUIREMENTS[featureName];
  if (minTierLevel === undefined) {
    return true; // No tier restriction
  }
  return tierLevel >= minTierLevel;
}

/**
 * Get allowed university tiers for a plan tier
 */
export function getAllowedUniversityTiers(tierLevel: number): string[] {
  return UNIVERSITY_TIER_ACCESS[tierLevel] || [];
}

/**
 * Validate configuration changes (for updates)
 * Provides more lenient validation for backward compatibility
 */
export function validatePlanConfigurationChanges(
  currentConfig: PlanConfiguration,
  newConfig: Partial<PlanConfiguration>
): ValidationResult {
  // Merge current and new config
  const mergedConfig: PlanConfiguration = {
    ...currentConfig,
    ...newConfig,
  };

  // Run full validation on merged config
  return validatePlanConfiguration(mergedConfig);
}
