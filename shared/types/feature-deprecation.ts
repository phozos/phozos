/**
 * Feature Deprecation Types
 * Defines types for the 4-phase feature deprecation workflow
 */

/**
 * Deprecation phase in the lifecycle
 */
export type DeprecationPhase = 'announcement' | 'grace_period' | 'soft_disable' | 'hard_removal';

/**
 * Status of a deprecation schedule
 */
export type DeprecationStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Feature deprecation schedule
 */
export interface FeatureDeprecationSchedule {
  id: string;
  featureName: string;
  planIds: string[];
  currentPhase: DeprecationPhase;
  status: DeprecationStatus;
  
  // Phase dates
  announcementDate: Date;
  gracePeriodStartDate: Date;
  softDisableDate: Date;
  hardRemovalDate: Date;
  
  // Metadata
  reason: string;
  replacementFeature?: string;
  migrationGuideUrl?: string;
  affectedUserCount: number;
  
  // Tracking
  notificationsSent: number;
  usersAcknowledged: number;
  usersMigrated: number;
  
  // Admin details
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}

/**
 * Phase timeline for deprecation workflow
 */
export interface DeprecationTimeline {
  phase: DeprecationPhase;
  startDate: Date;
  endDate: Date;
  status: 'pending' | 'active' | 'completed';
  actions: string[];
}

/**
 * User response to deprecation notice
 */
export interface UserDeprecationResponse {
  userId: string;
  featureName: string;
  acknowledgedAt?: Date;
  migratedAt?: Date;
  feedbackProvided?: string;
  alternativeFeatureAdopted?: string;
}

/**
 * Deprecation impact summary
 */
export interface DeprecationImpact {
  featureName: string;
  totalAffectedUsers: number;
  activeUsers: number;
  usageFrequency: number;
  lastUsedDate: Date | null;
  
  // User segments
  byPlan: Array<{
    planId: string;
    planName: string;
    affectedUsers: number;
  }>;
  
  // Migration readiness
  usersAcknowledged: number;
  usersMigrated: number;
  usersAtRisk: number;
  
  // Financial impact
  estimatedChurnRisk: number;
  estimatedCostSavings: number;
}

/**
 * Deprecation workflow configuration
 */
export interface DeprecationConfig {
  // Minimum notice periods (in days)
  minNoticePeriod: number;
  minGracePeriod: number;
  minSoftDisablePeriod: number;
  
  // Notification settings
  sendAnnouncement: boolean;
  sendReminders: boolean;
  reminderIntervals: number[]; // Days before each phase
  
  // Compliance settings
  requireUserConsent: boolean;
  offerProRatedRefund: boolean;
  retainDataYears: number;
}

/**
 * Phase-specific actions and notifications
 */
export interface PhaseActions {
  phase: DeprecationPhase;
  actions: Array<{
    type: 'notification' | 'ui_update' | 'access_restriction' | 'data_archive';
    description: string;
    completedAt?: Date;
    completedBy?: string;
  }>;
}

/**
 * Deprecation analytics
 */
export interface DeprecationAnalytics {
  featureName: string;
  scheduleId: string;
  
  // User engagement during deprecation
  usageTrend: Array<{
    date: Date;
    usageCount: number;
    uniqueUsers: number;
  }>;
  
  // Migration success
  migrationRate: number;
  alternativeFeaturesAdopted: Array<{
    featureName: string;
    adoptionCount: number;
  }>;
  
  // Financial metrics
  churnPrevented: number;
  costSavingsRealized: number;
  refundsIssued: number;
}

/**
 * Request to create deprecation schedule
 */
export interface CreateDeprecationScheduleRequest {
  featureName: string;
  planIds: string[];
  reason: string;
  replacementFeature?: string;
  migrationGuideUrl?: string;
  
  // Timeline (must respect minimum periods)
  announcementDate: Date;
  gracePeriodStartDate: Date;
  softDisableDate: Date;
  hardRemovalDate: Date;
  
  // Configuration
  sendNotifications?: boolean;
  requireConsent?: boolean;
  offerRefunds?: boolean;
}

/**
 * Request to update deprecation schedule
 */
export interface UpdateDeprecationScheduleRequest {
  scheduleId: string;
  updates: Partial<{
    status: DeprecationStatus;
    currentPhase: DeprecationPhase;
    softDisableDate: Date;
    hardRemovalDate: Date;
    migrationGuideUrl: string;
  }>;
  reason: string;
}

/**
 * Deprecation report for admin review
 */
export interface DeprecationReport {
  schedule: FeatureDeprecationSchedule;
  impact: DeprecationImpact;
  analytics: DeprecationAnalytics;
  timeline: DeprecationTimeline[];
  recommendations: string[];
  risks: Array<{
    level: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    mitigation: string;
  }>;
}
