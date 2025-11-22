/**
 * Feature Constraints Types
 * Defines validation rules for feature dependencies, compatibility, tier requirements, and quota constraints
 */

/**
 * Feature dependency rule
 * Defines which features require other features to be enabled
 */
export interface FeatureDependency {
  feature: string;
  requires: string[];
  reason?: string;
}

/**
 * Feature incompatibility rule
 * Defines which features cannot be enabled together
 */
export interface FeatureIncompatibility {
  feature: string;
  incompatibleWith: string[];
  reason: string;
}

/**
 * Tier requirement for a feature
 * Defines the minimum tier level required to access a feature
 */
export interface TierRequirement {
  feature: string;
  minTierLevel: number;
  reason?: string;
}

/**
 * University tier access per plan tier
 */
export interface UniversityTierAccess {
  tierLevel: number;
  allowedUniversityTiers: string[];
}

/**
 * Quota constraint for a tier
 * Defines maximum allowed quotas per tier level
 */
export interface QuotaConstraint {
  tierLevel: number;
  maxUniversities: number | null; // null means unlimited
  maxCountries: number | null; // null means unlimited
  reason?: string;
}

/**
 * Plan configuration to validate
 */
export interface PlanConfiguration {
  name?: string;
  tierLevel: number;
  maxUniversities: number;
  maxCountries: number;
  universityTier?: string;
  
  // Boolean features
  includeLoanAssistance?: boolean;
  includeVisaSupport?: boolean;
  includeCounselorSession?: boolean;
  includeScholarshipPlanning?: boolean;
  includeMockInterview?: boolean;
  includeExpertEditing?: boolean;
  includePostAdmitSupport?: boolean;
  includeDedicatedManager?: boolean;
  includeNetworkingEvents?: boolean;
  includeFlightAccommodation?: boolean;
  isBusinessFocused?: boolean;
  
  // Any other custom features
  [key: string]: any;
}

/**
 * Validation error detail
 */
export interface ValidationError {
  field: string;
  message: string;
  rule: string;
  context?: Record<string, any>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

/**
 * Feature dependency map
 * Key: feature name, Value: array of required features
 */
export type FeatureDependencyMap = Record<string, string[]>;

/**
 * Feature incompatibility map
 * Key: feature name, Value: incompatibility rule
 */
export type FeatureIncompatibilityMap = Record<string, {
  incompatibleWith: string[];
  reason: string;
}>;

/**
 * Tier requirement map
 * Key: feature name, Value: minimum tier level
 */
export type TierRequirementMap = Record<string, number>;

/**
 * University tier access map
 * Key: tier level, Value: array of allowed university tiers
 */
export type UniversityTierAccessMap = Record<number, string[]>;
