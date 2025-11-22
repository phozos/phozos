/**
 * API Contracts and Response Schemas for Phozos Application
 * 
 * This file defines the TypeScript interfaces and Zod schemas for all
 * API endpoints, ensuring type safety between client and server.
 */

import { z } from "zod";
import { createApiResponseSchema } from "./response-schemas";
import { USER_TYPES, TEAM_ROLES } from "./role-constants";

// ===========================
// User & Authentication Types
// ===========================

export const UserResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  userType: z.enum(USER_TYPES),
  teamRole: z.enum(TEAM_ROLES).nullable(),
  profilePicture: z.string().nullable(),
  accountStatus: z.enum(['active', 'inactive', 'pending_approval', 'suspended', 'rejected']).optional(),
  companyName: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastLoginAt: z.string().nullable().optional()
});

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional()
});

export const LoginResponseSchema = z.object({
  user: UserResponseSchema,
  message: z.string().optional()
});

export const CsrfTokenResponseSchema = z.object({
  csrfToken: z.string()
});

export const TeamLoginVisibilityResponseSchema = z.object({
  visible: z.boolean()
});

// ===========================
// Admin & Staff Management Types
// ===========================

export const CreateStaffRequestSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  teamRole: z.enum(['admin', 'counselor']),
  department: z.string().optional(),
});

export const CreateStaffResponseSchema = UserResponseSchema.extend({
  temporaryPassword: z.string().optional(),
});

// ===========================
// Student & Counselor Types
// ===========================

export const StudentProfileSchema = z.object({
  id: z.string(),
  userId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  nationality: z.string().nullable(),
  destinationCountry: z.string().nullable(),
  intakeYear: z.string().nullable(),
  status: z.enum(['inquiry', 'converted', 'visa_applied', 'visa_approved', 'departed']),
  profilePicture: z.string().nullable(),
  applicationStage: z.string(),
  documentsCount: z.number().int().nonnegative(),
  universitiesShortlisted: z.number().int().nonnegative(),
  lastActivity: z.string(),
  urgentActions: z.number().int().nonnegative(),
  currentEducationLevel: z.string().nullable().optional(),
  intendedMajor: z.string().nullable().optional(),
  budgetRange: z.string().nullable().optional(),
  gpa: z.string().nullable().optional(),
  testScores: z.record(z.any()).nullable().optional(),
  academicInterests: z.array(z.string()).nullable().optional(),
  extracurriculars: z.array(z.string()).nullable().optional(),
  workExperience: z.array(z.any()).nullable().optional()
});

export const StudentsListResponseSchema = z.array(StudentProfileSchema);

// Counselor-specific student profile schema with nested objects
export const CounselorStudentProfileSchema = StudentProfileSchema.extend({
  personalDetails: z.record(z.any()).optional(),
  academicDetails: z.record(z.any()).optional(),
  workDetails: z.record(z.any()).optional(),
  studyPreferences: z.record(z.any()).optional(),
  universityPreferences: z.record(z.any()).optional(),
  financialInfo: z.record(z.any()).optional(),
  visaHistory: z.record(z.any()).optional(),
  familyDetails: z.record(z.any()).optional(),
  additionalInfo: z.record(z.any()).optional(),
  userType: z.string().optional(),
  familyInfo: z.string().optional(),
  educationHistory: z.string().optional(),
  notes: z.string().optional(),
  preferredCountries: z.array(z.string()).optional(),
  dateOfBirth: z.string().nullable().optional()
});

// ===========================
// University Types
// ===========================

export const UniversitySchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  city: z.string().nullable(),
  website: z.string().nullable(),
  worldRanking: z.number().int().nullable(),
  degreeLevels: z.array(z.string()).nullable(),
  specialization: z.string().nullable(),
  offerLetterFee: z.string().nullable(),
  annualFee: z.string().nullable(),
  admissionRequirements: z.record(z.any()).nullable(),
  alumni1: z.string().nullable(),
  alumni2: z.string().nullable(),
  alumni3: z.string().nullable(),
  description: z.string().nullable(),
  acceptanceRate: z.string().nullable(),
  scholarshipAvailable: z.boolean().nullable(),
  applicationDeadline: z.string().nullable(),
  intakeMonths: z.array(z.string()).nullable(),
  campusSize: z.string().nullable(),
  studentPopulation: z.number().int().nullable(),
  internationalStudents: z.number().int().nullable(),
  languageRequirements: z.record(z.any()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const UniversitiesListResponseSchema = z.array(UniversitySchema);

export const CreateUniversityRequestSchema = z.object({
  name: z.string().min(1),
  country: z.string().min(1),
  city: z.string().optional(),
  website: z.string().url().optional(),
  worldRanking: z.number().int().positive().optional(),
  degreeLevels: z.array(z.string()).optional(),
  specialization: z.string().optional(),
  description: z.string().optional()
});

// ===========================
// Forum & Community Types
// ===========================

export const ForumPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  category: z.enum(['uk_study', 'visa_tips', 'ielts_prep', 'general', 'usa_study', 'canada_study', 'australia_study']),
  authorId: z.string(),
  authorName: z.string(),
  authorType: z.enum(['customer', 'team_member', 'company_profile']),
  isAnonymous: z.boolean(),
  anonymousName: z.string().nullable(),
  likesCount: z.number().int().nonnegative(),
  commentsCount: z.number().int().nonnegative(),
  viewsCount: z.number().int().nonnegative(),
  isPinned: z.boolean(),
  tags: z.array(z.string()).nullable(),
  attachments: z.array(z.string()).nullable(),
  pollQuestion: z.string().nullable(),
  pollOptions: z.array(z.string()).nullable(),
  pollEndsAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const ForumPostsListResponseSchema = z.array(ForumPostSchema);

export const CreateForumPostRequestSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).max(100),
  category: z.enum(['uk_study', 'visa_tips', 'ielts_prep', 'general', 'usa_study', 'canada_study', 'australia_study']),
  isAnonymous: z.boolean().optional(),
  anonymousName: z.string().optional(),
  tags: z.array(z.string()).optional(),
  pollQuestion: z.string().optional(),
  pollOptions: z.array(z.string()).optional(),
  pollEndsAt: z.string().optional()
});

// ===========================
// System & Health Types
// ===========================

export const SystemMetricsSchema = z.object({
  database: z.object({
    activeConnections: z.number(),
    idleConnections: z.number(),
    waitingRequests: z.number()
  }),
  messageQueue: z.object({
    queueSizes: z.record(z.number()),
    processedMessages: z.number(),
    failedMessages: z.number()
  }),
  performance: z.object({
    averageResponseTime: z.number(),
    requestsPerMinute: z.number(),
    errorRate: z.number()
  }),
  memory: z.object({
    used: z.number(),
    total: z.number(),
    percentage: z.number()
  }).optional()
});

export const HealthCheckSchema = z.object({
  status: z.enum(['healthy', 'warning', 'error']),
  checks: z.object({
    api: z.object({
      status: z.enum(['healthy', 'warning', 'error']),
      message: z.string()
    }),
    database: z.object({
      status: z.enum(['healthy', 'warning', 'error']),
      message: z.string(),
      connections: z.object({
        active: z.number(),
        idle: z.number(),
        waiting: z.number()
      })
    }),
    messageQueue: z.object({
      status: z.enum(['healthy', 'warning', 'error']),
      message: z.string(),
      queues: z.record(z.number())
    }),
    websocket: z.object({
      status: z.enum(['healthy', 'warning', 'error']),
      message: z.string(),
      connections: z.number()
    })
  }),
  timestamp: z.string()
});

// ===========================
// Document & File Types
// ===========================

export const DocumentSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  filename: z.string(),
  originalName: z.string(),
  type: z.enum(['transcript', 'test_score', 'essay', 'recommendation', 'resume', 'certificate', 'other']),
  size: z.number().int().positive(),
  uploadedAt: z.string(),
  status: z.enum(['pending', 'approved', 'rejected']).optional()
});

export const DocumentsListResponseSchema = z.array(DocumentSchema);

// ===========================
// Error Types
// ===========================

export const ValidationErrorDetailsSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string().optional()
});

export const ValidationErrorResponseSchema = z.object({
  message: z.string(),
  errors: z.array(ValidationErrorDetailsSchema)
});

// ===========================
// Generic Message Responses
// ===========================

export const MessageResponseSchema = z.object({
  message: z.string()
});

export const EmptyResponseSchema = z.object({});

// ===========================
// API Response Wrappers
// ===========================

// Authentication endpoints
export const ApiLoginResponse = createApiResponseSchema(LoginResponseSchema);
export const ApiUserResponse = createApiResponseSchema(UserResponseSchema);
export const ApiCsrfTokenResponse = createApiResponseSchema(CsrfTokenResponseSchema);
export const ApiTeamLoginVisibilityResponse = createApiResponseSchema(TeamLoginVisibilityResponseSchema);

// Student/Counselor endpoints
export const ApiStudentsListResponse = createApiResponseSchema(StudentsListResponseSchema);
export const ApiStudentProfileResponse = createApiResponseSchema(StudentProfileSchema);

// University endpoints
export const ApiUniversitiesListResponse = createApiResponseSchema(UniversitiesListResponseSchema);
export const ApiUniversityResponse = createApiResponseSchema(UniversitySchema);

// Forum endpoints
export const ApiForumPostsListResponse = createApiResponseSchema(ForumPostsListResponseSchema);
export const ApiForumPostResponse = createApiResponseSchema(ForumPostSchema);

// System endpoints
export const ApiSystemMetricsResponse = createApiResponseSchema(SystemMetricsSchema);
export const ApiHealthCheckResponse = createApiResponseSchema(HealthCheckSchema);

// Document endpoints
export const ApiDocumentsListResponse = createApiResponseSchema(DocumentsListResponseSchema);
export const ApiDocumentResponse = createApiResponseSchema(DocumentSchema);

// Generic responses
export const ApiMessageResponse = createApiResponseSchema(MessageResponseSchema);
export const ApiEmptyResponse = createApiResponseSchema(EmptyResponseSchema);

// ===========================
// Type Exports
// ===========================

export type UserResponse = z.infer<typeof UserResponseSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type StudentProfile = z.infer<typeof StudentProfileSchema>;
export type StudentsListResponse = z.infer<typeof StudentsListResponseSchema>;
export type University = z.infer<typeof UniversitySchema>;
export type UniversitiesListResponse = z.infer<typeof UniversitiesListResponseSchema>;
export type CreateUniversityRequest = z.infer<typeof CreateUniversityRequestSchema>;
export type ForumPost = z.infer<typeof ForumPostSchema>;
export type ForumPostsListResponse = z.infer<typeof ForumPostsListResponseSchema>;
export type CreateForumPostRequest = z.infer<typeof CreateForumPostRequestSchema>;
export type SystemMetrics = z.infer<typeof SystemMetricsSchema>;
export type HealthCheck = z.infer<typeof HealthCheckSchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type DocumentsListResponse = z.infer<typeof DocumentsListResponseSchema>;
export type MessageResponse = z.infer<typeof MessageResponseSchema>;

// ===========================
// Feature Management Types (Phase 4)
// ===========================

export const ImpactAnalysisSchema = z.object({
  summary: z.object({
    totalSubscribers: z.number(),
    grandfatheredUsers: z.number(),
    affectedUsers: z.number(),
    byTier: z.record(z.number()),
    byStatus: z.object({
      active: z.number(),
      grandfathered: z.number(),
      expired: z.number()
    })
  }),
  featureBreakdown: z.array(z.object({
    featureName: z.string(),
    changeType: z.enum(['added', 'removed', 'modified']),
    oldValue: z.any().optional(),
    newValue: z.any().optional(),
    impact: z.object({
      affectedUsers: z.number(),
      notificationsRequired: z.number(),
      estimatedAdoption: z.number(),
      currentlyAtLimit: z.number().optional(),
      willBenefitImmediately: z.number().optional()
    })
  })),
  recommendations: z.array(z.string()),
  risks: z.array(z.object({
    level: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string(),
    mitigation: z.string()
  })),
  financialImpact: z.object({
    estimatedRevenue: z.object({
      upgrades: z.number(),
      downgrades: z.number(),
      net: z.number()
    }),
    churnRisk: z.object({
      level: z.enum(['low', 'medium', 'high']),
      percentage: z.number(),
      affectedUsers: z.number()
    }),
    costSavings: z.number().optional()
  }),
  migrationPlan: z.object({
    recommendedStrategy: z.enum(['immediate', 'gradual', 'phased']),
    suggestedTimeline: z.object({
      announcement: z.string(),
      implementation: z.string(),
      completion: z.string()
    }),
    requiredActions: z.array(z.string())
  }).optional()
});

export const FeatureUsageOverviewSchema = z.object({
  featureName: z.string(),
  displayName: z.string(),
  totalPlansOffering: z.number(),
  totalUsersWithAccess: z.number(),
  activeUsers: z.number(),
  adoptionRate: z.number(),
  trend: z.enum(['increasing', 'stable', 'decreasing']),
  usageCount: z.number()
});

export const FeatureHealthSchema = z.object({
  featureName: z.string(),
  healthStatus: z.enum(['healthy', 'warning', 'critical']),
  adoptionRate: z.number(),
  satisfactionScore: z.number().optional(),
  alerts: z.array(z.object({
    type: z.enum(['low_adoption', 'high_cost', 'high_value', 'deprecation_candidate']),
    severity: z.enum(['info', 'warning', 'critical']),
    message: z.string(),
    recommendation: z.string().optional(),
    estimatedSavings: z.number().optional()
  })),
  metrics: z.object({
    totalUsers: z.number(),
    activeUsers: z.number(),
    usageFrequency: z.number(),
    upgradeDriveRate: z.number().optional()
  })
});

export const DashboardSummarySchema = z.object({
  totalFeatures: z.number(),
  activePlans: z.number(),
  totalSubscribers: z.number(),
  healthyFeatures: z.number(),
  featuresAtRisk: z.number(),
  deprecatedFeatures: z.number(),
  recentChanges: z.number()
});

export const FeatureLifecycleSchema = z.object({
  featureName: z.string(),
  status: z.enum(['active', 'deprecated', 'sunset']),
  addedDate: z.string(),
  plans: z.array(z.object({
    planId: z.string(),
    planName: z.string(),
    addedVersion: z.number(),
    currentVersion: z.number()
  })),
  totalUsers: z.number(),
  versionHistory: z.array(z.object({
    version: z.number(),
    date: z.string(),
    changes: z.string(),
    addedToPlanCount: z.number()
  })),
  deprecationSchedule: z.object({
    announcementDate: z.string(),
    removalDate: z.string(),
    reason: z.string()
  }).optional()
});

export const BulkOperationResultSchema = z.object({
  success: z.boolean(),
  operationId: z.string(),
  affectedPlans: z.number(),
  affectedUsers: z.number(),
  errors: z.array(z.object({
    planId: z.string(),
    error: z.string()
  })),
  warnings: z.array(z.string())
});

export const DeprecationScheduleSchema = z.object({
  id: z.string(),
  featureName: z.string(),
  planIds: z.array(z.string()),
  currentPhase: z.enum(['announcement', 'grace_period', 'soft_disable', 'hard_removal']),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']),
  announcementDate: z.string(),
  gracePeriodStartDate: z.string(),
  softDisableDate: z.string(),
  hardRemovalDate: z.string(),
  reason: z.string(),
  replacementFeature: z.string().optional(),
  migrationGuideUrl: z.string().optional(),
  affectedUserCount: z.number(),
  notificationsSent: z.number(),
  usersAcknowledged: z.number(),
  usersMigrated: z.number(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
  cancelledAt: z.string().optional(),
  cancellationReason: z.string().optional()
});

export const DeprecationImpactSchema = z.object({
  featureName: z.string(),
  totalAffectedUsers: z.number(),
  activeUsers: z.number(),
  usageFrequency: z.number(),
  lastUsedDate: z.string().nullable(),
  byPlan: z.array(z.object({
    planId: z.string(),
    planName: z.string(),
    affectedUsers: z.number()
  })),
  usersAcknowledged: z.number(),
  usersMigrated: z.number(),
  usersAtRisk: z.number(),
  estimatedChurnRisk: z.number(),
  estimatedCostSavings: z.number()
});

export const DeprecationTimelineSchema = z.array(z.object({
  phase: z.enum(['announcement', 'grace_period', 'soft_disable', 'hard_removal']),
  startDate: z.string(),
  endDate: z.string(),
  status: z.enum(['pending', 'active', 'completed']),
  actions: z.array(z.string())
}));

// API Response Wrappers for Feature Management
export const ApiImpactAnalysisResponse = createApiResponseSchema(ImpactAnalysisSchema);
export const ApiFeatureUsageOverviewResponse = createApiResponseSchema(z.array(FeatureUsageOverviewSchema));
export const ApiFeatureHealthResponse = createApiResponseSchema(z.array(FeatureHealthSchema));
export const ApiDashboardSummaryResponse = createApiResponseSchema(DashboardSummarySchema);
export const ApiFeatureLifecycleResponse = createApiResponseSchema(FeatureLifecycleSchema);
export const ApiBulkOperationResultResponse = createApiResponseSchema(BulkOperationResultSchema);
export const ApiDeprecationScheduleResponse = createApiResponseSchema(DeprecationScheduleSchema);
export const ApiDeprecationSchedulesResponse = createApiResponseSchema(z.array(DeprecationScheduleSchema));
export const ApiDeprecationImpactResponse = createApiResponseSchema(DeprecationImpactSchema);
export const ApiDeprecationTimelineResponse = createApiResponseSchema(DeprecationTimelineSchema);

// Type Exports for Feature Management
export type ImpactAnalysis = z.infer<typeof ImpactAnalysisSchema>;
export type FeatureUsageOverview = z.infer<typeof FeatureUsageOverviewSchema>;
export type FeatureHealth = z.infer<typeof FeatureHealthSchema>;
export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;
export type FeatureLifecycle = z.infer<typeof FeatureLifecycleSchema>;
export type BulkOperationResult = z.infer<typeof BulkOperationResultSchema>;
export type DeprecationSchedule = z.infer<typeof DeprecationScheduleSchema>;
export type DeprecationImpact = z.infer<typeof DeprecationImpactSchema>;
export type DeprecationTimeline = z.infer<typeof DeprecationTimelineSchema>;

// ===========================
// Endpoint URL Constants
// ===========================

export const API_ENDPOINTS = {
  // Authentication
  AUTH_ME: '/api/auth/me',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_CSRF_TOKEN: '/api/auth/csrf-token',
  AUTH_TEAM_LOGIN_VISIBILITY: '/api/auth/team-login-visibility',
  
  // Students & Counselors
  COUNSELOR_ASSIGNED_STUDENTS: '/api/counselor/assigned-students',
  
  // Universities
  ADMIN_UNIVERSITIES: '/api/admin/universities',
  
  // Forum
  FORUM_POSTS: '/api/forum/posts',
  
  // System
  SYSTEM_METRICS: '/api/system/metrics',
  SYSTEM_HEALTH: '/api/system/health',
  
  // Documents
  DOCUMENTS: '/api/documents',
  
  // Feature Management (Admin)
  FEATURE_MANAGEMENT_DASHBOARD: '/api/admin/feature-management/dashboard',
  FEATURE_MANAGEMENT_USAGE_OVERVIEW: '/api/admin/feature-management/usage-overview',
  FEATURE_MANAGEMENT_HEALTH: '/api/admin/feature-management/health',
  FEATURE_MANAGEMENT_LIFECYCLE: '/api/admin/feature-management/lifecycle',
  FEATURE_MANAGEMENT_BULK_OPERATION: '/api/admin/feature-management/bulk-operation',
  FEATURE_IMPACT_PREVIEW: '/api/admin/feature-management/impact-preview',
  FEATURE_DEPRECATION_SCHEDULES: '/api/admin/feature-management/deprecation/schedules',
  FEATURE_DEPRECATION_IMPACT: '/api/admin/feature-management/deprecation/impact',
  FEATURE_DEPRECATION_TIMELINE: '/api/admin/feature-management/deprecation/timeline'
} as const;