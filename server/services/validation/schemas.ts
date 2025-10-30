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

export const subscriptionPlanSchema = z.object({
  name: z.string().min(1).max(255, 'Plan name must not exceed 255 characters'),
  price: z.number().nonnegative('Price must be non-negative'),
  features: z.array(z.string()),
  maxUniversities: z.number().int().positive('Max universities must be positive').optional(),
  maxCountries: z.number().int().positive('Max countries must be positive').optional(),
  turnaroundDays: z.number().int().positive('Turnaround days must be positive')
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
export const paymentGatewaySchema = z.enum(['stripe', 'paypal', 'flutterwave', 'paystack']);

export const paymentSchema = z.object({
  amount: z.number().positive('Payment amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3-letter ISO code'),
  gateway: paymentGatewaySchema,
  userId: uuidSchema.optional(),
  metadata: z.record(z.any()).optional()
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
