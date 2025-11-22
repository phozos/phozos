import { z } from 'zod';

/**
 * Validation schemas for domain entities
 * These Zod schemas provide type-safe validation and can be used for API request validation
 */

// User-related schemas
export const emailSchema = z.string().email('Invalid email format');

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

export const phoneNumberSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format (E.164)');

export const uuidSchema = z.string().uuid('Invalid UUID format');

// Forum-related schemas
export const forumCategorySchema = z.enum([
  'general',
  'usa_study',
  'uk_study',
  'canada_study',
  'australia_study',
  'ielts_prep',
  'visa_tips',
  'scholarships',
  'europe_study'
]);

export const forumPostSchema = z.object({
  authorId: uuidSchema,
  content: z.string().min(1).max(10000, 'Post content must not exceed 10000 characters'),
  title: z.string().min(1).max(500, 'Post title must not exceed 500 characters').optional().nullable(),
  category: forumCategorySchema.optional(),
  image: z.string().optional(),
  pollQuestion: z.string().optional(),
  pollOptions: z.array(z.string()).optional()
});

export const forumCommentSchema = z.object({
  postId: uuidSchema,
  userId: uuidSchema,
  content: z.string().min(1).max(2000, 'Comment must not exceed 2000 characters')
});

// University-related schemas
export const universityRankingSchema = z.number()
  .int()
  .min(1, 'Ranking must be at least 1')
  .max(5000, 'Ranking must not exceed 5000');

export const universitySchema = z.object({
  name: z.string().min(1).max(500, 'University name must not exceed 500 characters'),
  country: z.string().min(1).max(100, 'Country must not exceed 100 characters'),
  worldRanking: universityRankingSchema.optional(),
  annualFee: z.number().positive('Annual fee must be positive').optional(),
  website: z.string().url('Invalid website URL').optional(),
  city: z.string().max(100).optional(),
  description: z.string().optional(),
  acceptanceRate: z.string().optional(),
  degreeLevels: z.array(z.string()).optional()
});

// Subscription-related schemas
export const subscriptionStatusSchema = z.enum([
  'active',
  'cancelled',
  'expired',
  'pending'
]);

// Support type enum for validation
const supportTypeEnum = z.enum(['email', 'whatsapp', 'phone', 'premium']);

// AI and Prep tier enums
const aiTierEnum = z.enum(['none', 'basic', 'pro', 'ultra']);
const prepTierEnum = z.enum(['none', 'basic', 'pro', 'ultra']);

export const subscriptionPlanSchema = z.object({
  name: z.string().min(1).max(255, 'Plan name must not exceed 255 characters'),
  price: z.number().nonnegative('Price must be non-negative'),
  features: z.array(z.string()),
  maxUniversities: z.number().int().positive('Max universities must be positive').optional(),
  maxCountries: z.number().int().positive('Max countries must be positive').optional(),
  turnaroundDays: z.number().int().positive('Turnaround days must be positive'),
  tierLevel: z.number().int().positive('Tier level must be positive'),
  
  // Category 1: Core Application Services
  includeCourseCountrySelection: z.boolean().optional(),
  includeUniversityShortlisting: z.boolean().optional(),
  includeOneOnOneEditing: z.boolean().optional(),
  includeProfileBuilding: z.boolean().optional(),
  includeTop50Counselling: z.boolean().optional(),
  
  // Category 2: Student Support & Mentorship
  supportTypes: z.array(supportTypeEnum)
    .min(1, 'At least one support type is required')
    .refine((types) => new Set(types).size === types.length, {
      message: 'Support types must not contain duplicates'
    })
    .optional(),
  
  // Category 3: Phozos AI
  phozosAiTier: aiTierEnum.optional(),
  
  // Category 4: Financial & Scholarship Services
  includeForexServices: z.boolean().optional(),
  
  // Category 5: Visa & Post-Admission
  includePreDepartureSession: z.boolean().optional(),
  
  // Category 6: Phozos Prep
  phozosPrepTier: prepTierEnum.optional(),
  phozosPrepDescription: z.string()
    .max(1000, 'Phozos Prep description must not exceed 1000 characters')
    .optional()
    .nullable()
});

export const updateSubscriptionPlanBodySchema = subscriptionPlanSchema.partial().extend({
  changeReason: z.string().optional()
});

// Plan versioning schemas
export const createPlanVersionSchema = z.object({
  updates: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    price: z.number().nonnegative().optional(),
    features: z.array(z.string()).optional(),
    maxUniversities: z.number().int().positive().optional(),
    maxCountries: z.number().int().positive().optional(),
    turnaroundDays: z.number().int().positive().optional(),
    tierLevel: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
    displayOrder: z.number().int().optional(),
    
    // Category 1: Core Application Services
    includeCourseCountrySelection: z.boolean().optional(),
    includeUniversityShortlisting: z.boolean().optional(),
    includeOneOnOneEditing: z.boolean().optional(),
    includeProfileBuilding: z.boolean().optional(),
    includeTop50Counselling: z.boolean().optional(),
    
    // Category 2: Student Support & Mentorship
    supportTypes: z.array(supportTypeEnum)
      .min(1, 'At least one support type is required')
      .refine((types) => new Set(types).size === types.length, {
        message: 'Support types must not contain duplicates'
      })
      .optional(),
    
    // Category 3: Phozos AI
    phozosAiTier: aiTierEnum.optional(),
    
    // Category 4: Financial & Scholarship Services
    includeForexServices: z.boolean().optional(),
    
    // Category 5: Visa & Post-Admission
    includePreDepartureSession: z.boolean().optional(),
    
    // Category 6: Phozos Prep
    phozosPrepTier: prepTierEnum.optional(),
    phozosPrepDescription: z.string()
      .max(1000, 'Phozos Prep description must not exceed 1000 characters')
      .optional()
      .nullable()
  }),
  releaseNotes: z.string().min(1, 'Release notes are required').max(2000)
});

// Price update schema - for dedicated price change endpoint
export const updatePlanPriceSchema = z.object({
  newPrice: z.number().positive('Price must be positive'),
  effectiveDate: z.string().datetime('Must be ISO 8601 date'),
  notifySubscribers: z.boolean().optional().default(true)
});

// Deprecation schema - enhanced with detailed reason requirement
export const deprecatePlanSchema = z.object({
  successorPlanId: uuidSchema.optional().nullable(),
  reason: z.string().min(10, 'Deprecation reason must be at least 10 characters').max(500),
  createMigration: z.boolean().default(false),
  notifySubscribers: z.boolean().default(true)
});

// Archive schema - enhanced with detailed reason requirement
export const archivePlanSchema = z.object({
  reason: z.string().min(10, 'Archive reason must be at least 10 characters').max(500)
});

// Rollback schema - for plan version rollback
export const rollbackPlanVersionSchema = z.object({
  targetVersion: z.number().int().positive('Target version must be a positive integer'),
  reason: z.string().min(10, 'Rollback reason must be at least 10 characters').max(500),
  notifySubscribers: z.boolean().optional().default(false)
});

// Plan migration schemas
export const createMigrationSchema = z.object({
  name: z.string().min(1).max(255, 'Migration name must not exceed 255 characters'),
  sourcePlanId: uuidSchema,
  targetPlanId: uuidSchema,
  migrationType: z.enum(['voluntary', 'mandatory', 'incentivized']),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()).optional(),
  incentiveType: z.enum(['discount', 'free_months', 'feature_upgrade']).optional(),
  incentiveValue: z.any().optional()
});

export const startMigrationSchema = z.object({
  migrationId: uuidSchema
});

export const cancelMigrationSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(1000)
});

export const acceptMigrationSchema = z.object({
  migrationId: uuidSchema
});

export const declineMigrationSchema = z.object({
  migrationId: uuidSchema,
  reason: z.string().optional()
});

export const userSubscriptionSchema = z.object({
  userId: uuidSchema,
  planId: uuidSchema,
  status: subscriptionStatusSchema,
  startedAt: z.date().optional(),
  expiresAt: z.date().optional()
}).refine(
  (data) => {
    if (data.startedAt && data.expiresAt) {
      return data.expiresAt > data.startedAt;
    }
    return true;
  },
  { message: 'Expiration date must be after start date' }
);

// Application-related schemas
export const applicationStatusSchema = z.enum([
  'draft',
  'submitted',
  'under_review',
  'pending_info',
  'approved',
  'rejected',
  'cancelled',
  'enrolled'
]);

// Event-related schemas
export const eventSchema = z.object({
  title: z.string().min(1).max(200, 'Event title must not exceed 200 characters'),
  description: z.string().optional(),
  startDate: z.date(),
  endDate: z.date(),
  capacity: z.number().int().positive('Capacity must be positive').optional(),
  location: z.string().max(200).optional(),
  isVirtual: z.boolean().optional()
}).refine(
  (data) => data.endDate > data.startDate,
  { message: 'End date must be after start date' }
);

// Document-related schemas
export const documentTypeSchema = z.enum([
  'transcript',
  'recommendation_letter',
  'personal_statement',
  'resume',
  'passport',
  'test_score',
  'other'
]);

export const documentSchema = z.object({
  userId: uuidSchema,
  name: z.string().min(1).max(255, 'Document name must not exceed 255 characters'),
  type: documentTypeSchema,
  size: z.number().int().positive('File size must be positive').max(10485760, 'File size must not exceed 10MB'),
  url: z.string().url('Invalid document URL')
});

// Notification-related schemas
export const notificationTypeSchema = z.enum([
  'application_update',
  'message',
  'event_reminder',
  'system',
  'deadline_reminder'
]);

export const notificationSchema = z.object({
  userId: uuidSchema,
  type: notificationTypeSchema,
  title: z.string().min(1).max(200, 'Title must not exceed 200 characters'),
  message: z.string().min(1).max(1000, 'Message must not exceed 1000 characters'),
  isRead: z.boolean().optional()
});

// Payment-related schemas
export const paymentGatewaySchema = z.enum(['razorpay', 'paypal', 'flutterwave', 'paystack']);

export const paymentSchema = z.object({
  amount: z.number().positive('Payment amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3-letter ISO code'),
  gateway: paymentGatewaySchema,
  userId: uuidSchema.optional(),
  metadata: z.record(z.any()).optional()
});

// Bulk subscription operations schemas
export const bulkMigrateSubscribersSchema = z.object({
  sourcePlanId: uuidSchema,
  targetPlanId: uuidSchema,
  userIds: z.array(uuidSchema).min(1, 'At least one user ID is required').max(100, 'Cannot migrate more than 100 users at once')
});

export const bulkCancelSubscriptionsSchema = z.object({
  userIds: z.array(uuidSchema).min(1, 'At least one user ID is required').max(100, 'Cannot cancel more than 100 subscriptions at once'),
  reason: z.string().min(1, 'Cancellation reason is required').max(500, 'Reason must not exceed 500 characters')
});

export const exportSubscribersSchema = z.object({
  planId: uuidSchema.optional(),
  status: z.enum(['active', 'cancelled', 'expired', 'pending']).optional(),
  format: z.enum(['csv']).optional().default('csv')
});

// Subscription Management schemas (Phase 1.2)
export const cancellationStatusSchema = z.enum(['pending', 'approved', 'rejected', 'cancelled']);
export const refundStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed', 'rejected']);
export const disputeStatusSchema = z.enum(['open', 'investigating', 'resolved', 'closed']);
export const disputeTypeSchema = z.enum(['chargeback', 'dispute']);

export const createCancellationRequestSchema = z.object({
  subscriptionId: uuidSchema,
  userId: uuidSchema,
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000, 'Reason must not exceed 1000 characters')
});

export const processCancellationRequestSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  adminNotes: z.string().max(2000, 'Admin notes must not exceed 2000 characters').optional()
});

export const createRefundRequestSchema = z.object({
  subscriptionId: uuidSchema,
  userId: uuidSchema,
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000, 'Reason must not exceed 1000 characters'),
  amount: z.number().positive('Refund amount must be positive').optional()
});

export const processRefundRequestSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  adminNotes: z.string().max(2000, 'Admin notes must not exceed 2000 characters').optional(),
  refundAmount: z.number().positive('Refund amount must be positive').optional()
});

export const createDisputeSchema = z.object({
  subscriptionId: uuidSchema,
  userId: uuidSchema,
  type: disputeTypeSchema,
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(2000, 'Reason must not exceed 2000 characters'),
  evidence: z.record(z.any()).optional()
});

export const updateDisputeStatusSchema = z.object({
  status: disputeStatusSchema,
  resolution: z.string().max(2000, 'Resolution must not exceed 2000 characters').optional(),
  adminNotes: z.string().max(2000, 'Admin notes must not exceed 2000 characters').optional()
});

// Export helper type inference
export type ForumPostInput = z.infer<typeof forumPostSchema>;
export type ForumCommentInput = z.infer<typeof forumCommentSchema>;
export type UniversityInput = z.infer<typeof universitySchema>;
export type SubscriptionPlanInput = z.infer<typeof subscriptionPlanSchema>;
export type UserSubscriptionInput = z.infer<typeof userSubscriptionSchema>;
export type EventInput = z.infer<typeof eventSchema>;
export type DocumentInput = z.infer<typeof documentSchema>;
export type NotificationInput = z.infer<typeof notificationSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type CreateCancellationRequestInput = z.infer<typeof createCancellationRequestSchema>;
export type ProcessCancellationRequestInput = z.infer<typeof processCancellationRequestSchema>;
export type CreateRefundRequestInput = z.infer<typeof createRefundRequestSchema>;
export type ProcessRefundRequestInput = z.infer<typeof processRefundRequestSchema>;
export type CreateDisputeInput = z.infer<typeof createDisputeSchema>;
export type UpdateDisputeStatusInput = z.infer<typeof updateDisputeStatusSchema>;
