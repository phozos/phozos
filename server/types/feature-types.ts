/**
 * Feature Types and Interfaces
 * Defines all types for feature entitlement and access control
 */

import { SubscriptionPlan } from '@shared/schema';

/**
 * Quota types available in the system
 */
export type QuotaType = 'universities' | 'countries';

/**
 * Support tier types
 */
export type SupportType = 'email' | 'whatsapp' | 'phone' | 'premium';

/**
 * University tier types
 */
export type UniversityTier = 'general' | 'top500' | 'top200' | 'top100' | 'ivy_league';

/**
 * Complete feature set for a subscription plan
 */
export interface FeatureSet {
  // JSONB array features
  features: string[];
  
  // Boolean features (25 total)
  includeLoanAssistance: boolean;
  includeVisaSupport: boolean;
  includeCounselorSession: boolean;
  includeScholarshipPlanning: boolean;
  includeMockInterview: boolean;
  includeExpertEditing: boolean;
  includePostAdmitSupport: boolean;
  includeDedicatedManager: boolean;
  includeNetworkingEvents: boolean;
  includeFlightAccommodation: boolean;
  
  // Quota features
  maxUniversities: number;
  maxCountries: number;
  
  // Tier features
  universityTier: UniversityTier;
  supportType: SupportType;
  turnaroundDays: number;
  
  // Metadata
  planName: string;
  planId: string;
  tierLevel: number;
  isLifetime: boolean;
}

/**
 * Quota information for a user
 */
export interface QuotaInfo {
  quotaType: QuotaType;
  limit: number;
  used: number;
  remaining: number;
  isUnlimited: boolean;
}

/**
 * Result of a feature access check
 */
export interface FeatureAccessResult {
  allowed: boolean;
  reason?: string;
  requiresUpgrade?: boolean;
  currentPlan?: string;
  upgradeOptions?: string[];
}

/**
 * Impact analysis for feature changes
 */
export interface ImpactAnalysis {
  planId: string;
  planName: string;
  affectedSubscribers: number;
  featureChanges: FeatureChange[];
  recommendation: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Individual feature change
 */
export interface FeatureChange {
  featureName: string;
  changeType: 'added' | 'removed' | 'modified';
  oldValue: any;
  newValue: any;
  affectedUsers: number;
}

/**
 * Preview of plan changes before applying
 */
export interface ChangePreview {
  planId: string;
  changes: FeatureChange[];
  subscriberCount: number;
  requiresConfirmation: boolean;
  warnings: string[];
  recommendations: string[];
}

/**
 * Feature changes payload
 */
export interface FeatureChanges {
  features?: string[];
  [key: string]: any;
}

/**
 * Cached entitlement data for request context
 */
export interface CachedEntitlement {
  userId: string;
  featureSet: FeatureSet;
  quotas: Record<QuotaType, QuotaInfo>;
  timestamp: number;
}

/**
 * Feature entitlement service interface
 */
export interface IFeatureEntitlementService {
  /**
   * Get the effective feature set for a user (snapshot-first)
   */
  getEffectiveFeatures(userId: string): Promise<FeatureSet | null>;
  
  /**
   * Check if user has access to a specific feature
   */
  hasFeatureAccess(userId: string, featureName: string): Promise<boolean>;
  
  /**
   * Get the value of a specific feature
   */
  getFeatureValue<T>(userId: string, featureName: string): Promise<T | null>;
  
  /**
   * Check multiple features at once (bulk operation)
   */
  checkFeatures(userId: string, features: string[]): Promise<Record<string, boolean>>;
  
  /**
   * Get remaining quota for a user
   */
  getRemainingQuota(userId: string, quotaType: QuotaType): Promise<number>;
  
  /**
   * Check if user can use a feature with detailed reason
   */
  canUseFeature(userId: string, featureName: string): Promise<FeatureAccessResult>;
  
  /**
   * Get quota information for a user
   */
  getQuotaInfo(userId: string, quotaType: QuotaType): Promise<QuotaInfo>;
  
  /**
   * Get impact analysis for changing a plan feature
   */
  getFeatureImpact(planId: string, featureName: string, newValue: any): Promise<ImpactAnalysis>;
  
  /**
   * Preview changes before applying them
   */
  previewFeatureChange(planId: string, changes: FeatureChanges): Promise<ChangePreview>;
}

/**
 * Helper type for boolean feature names
 */
export type BooleanFeatureName = 
  | 'includeLoanAssistance'
  | 'includeVisaSupport'
  | 'includeCounselorSession'
  | 'includeScholarshipPlanning'
  | 'includeMockInterview'
  | 'includeExpertEditing'
  | 'includePostAdmitSupport'
  | 'includeDedicatedManager'
  | 'includeNetworkingEvents'
  | 'includeFlightAccommodation';

/**
 * Helper type for all feature names (boolean + quota + tier)
 */
export type FeatureName = 
  | BooleanFeatureName
  | 'maxUniversities'
  | 'maxCountries'
  | 'universityTier'
  | 'supportType'
  | 'turnaroundDays';
