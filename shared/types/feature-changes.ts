/**
 * Feature Changes Types
 * Defines types for feature versioning, changes, and grandfathering rules
 */

/**
 * Rollout strategy for feature changes
 */
export type RolloutStrategy = 'immediate' | 'gradual' | 'opt-in';

/**
 * Feature change type
 */
export type ChangeType = 'added' | 'removed' | 'modified' | 'deprecated';

/**
 * Grandfathering condition type
 */
export type GrandfatheringCondition = 'all' | 'before_date' | 'specific_users';

/**
 * Individual feature change descriptor
 */
export interface FeatureChange {
  featureName: string;
  changeType: ChangeType;
  oldValue: any;
  newValue: any;
  reason: string;
  migrationPath?: string;
  affectedUsers?: number;
}

/**
 * Grandfathering rule for feature changes
 */
export interface GrandfatheringRule {
  condition: GrandfatheringCondition;
  retainOldValue: boolean;
  expirationDate?: Date | null;
  notificationRequired: boolean;
  affectedFeatures?: string[];
  userIds?: string[];
}

/**
 * Feature version metadata
 */
export interface FeatureVersion {
  version: number;
  effectiveDate: Date;
  changes: FeatureChange[];
  affectedFeatures: string[];
  rolloutStrategy: RolloutStrategy;
  grandfatheringRules: GrandfatheringRule[];
  releaseNotes?: string;
  createdBy?: string;
}

/**
 * Version creation options
 */
export interface VersionOptions {
  rolloutStrategy?: RolloutStrategy;
  grandfatheringRules?: GrandfatheringRule[];
  releaseNotes?: string;
  effectiveDate?: Date;
  notifySubscribers?: boolean;
}

/**
 * Feature change validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  breakingChanges: FeatureChange[];
  deprecatedFeatures: string[];
  migrationImpact: {
    affectedSubscribers: number;
    requiresGrandfathering: boolean;
    estimatedMigrationTime: string;
  };
  recommendedActions: string[];
}

/**
 * Feature version history entry
 */
export interface VersionHistoryEntry {
  version: number;
  versionName: string;
  effectiveDate: Date;
  changes: FeatureChange[];
  subscriberCount: number;
  isLatestVersion: boolean;
  deprecatedAt: Date | null;
}

/**
 * Grandfathering application result
 */
export interface GrandfatheringApplicationResult {
  appliedCount: number;
  failedCount: number;
  affectedUserIds: string[];
  errors: Array<{
    userId: string;
    error: string;
  }>;
  expirationScheduled: boolean;
}
