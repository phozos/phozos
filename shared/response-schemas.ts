/**
 * Simplified API Response Schemas
 * 
 * Basic validation schemas for API responses - simplified for maintainability.
 */

import { z } from "zod";
import type { ApiResponse, ApiError, ApiMeta, PaginationMeta } from "./api-types";

// Basic response schemas
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional()
});

export const ApiSuccessResponseSchema = <T>(dataSchema: z.ZodSchema<T>) => 
  z.object({
    success: z.literal(true),
    data: dataSchema
  });

export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: ApiErrorSchema
});

// Restored for compatibility - simplified version
export const createApiResponseSchema = <T>(dataSchema: z.ZodSchema<T>) => {
  return z.union([
    z.object({
      success: z.literal(true),
      data: dataSchema
    }),
    z.object({
      success: z.literal(false),
      error: ApiErrorSchema
    })
  ]);
};

// Simple message response
export const MessageResponseSchema = z.object({
  message: z.string()
});

// ============================================================================
// DOMAIN-SPECIFIC RESPONSE SCHEMAS
// ============================================================================

// ============================================================================
// SCHEMA PREPROCESSING HELPERS
// ============================================================================

// Flexible UUID that accepts various UUID formats or strings
const flexibleUuid = z.union([
  z.string().uuid(),
  z.string().min(1) // Fallback for non-standard IDs
]).transform(val => val);

// Flexible datetime that accepts ISO strings or timestamps
const flexibleDatetime = z.union([
  z.string().datetime(),
  z.string().min(1),
  z.number()
]).transform(val => {
  if (typeof val === 'number') {
    return new Date(val).toISOString();
  }
  if (typeof val === 'string' && !isNaN(Date.parse(val))) {
    return new Date(val).toISOString();
  }
  return val;
});

// Flexible number that coerces strings to numbers
const flexibleNumber = z.union([
  z.number(),
  z.string().regex(/^\d+(\.\d+)?$/).transform(val => parseFloat(val)),
  z.null()
]).nullable();

// Flexible boolean that handles various boolean representations
const flexibleBoolean = z.union([
  z.boolean(),
  z.string().transform(val => val === 'true' || val === '1'),
  z.number().transform(val => val === 1)
]);

// ============================================================================
// USER & AUTHENTICATION SCHEMAS
// ============================================================================

export const UserSchema = z.object({
  id: flexibleUuid,
  email: z.string().email(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  userType: z.enum(["customer", "team_member", "company_profile"]),
  teamRole: z.enum(["admin", "counselor"]).nullable().optional(),
  accountStatus: z.enum(["active", "inactive", "pending_approval", "suspended", "rejected"]),
  profilePicture: z.string().nullable().optional(),
  companyName: z.string().nullable().optional(),
  createdAt: flexibleDatetime,
  updatedAt: flexibleDatetime
});

export const AuthResponseSchema = z.object({
  user: UserSchema,
  token: z.string(),
  expiresAt: flexibleDatetime
});

// Student Profile Schemas
export const StudentProfileSchema = z.object({
  id: flexibleUuid,
  userId: flexibleUuid,
  phone: z.string().nullable().optional(),
  dateOfBirth: flexibleDatetime.nullable().optional(),
  nationality: z.string().nullable().optional(),
  currentEducationLevel: z.string().nullable().optional(),
  institutionName: z.string().nullable().optional(),
  gpa: z.union([z.string(), flexibleNumber]).nullable().optional(),
  testScores: z.object({
    sat: flexibleNumber.optional(),
    act: flexibleNumber.optional(),
    gre: flexibleNumber.optional(),
    gmat: flexibleNumber.optional(),
    toefl: flexibleNumber.optional(),
    ielts: flexibleNumber.optional(),
    englishTestScore: z.string().nullable().optional(),
    englishBandScores: z.string().nullable().optional(),
    englishTestDate: z.string().nullable().optional(),
    standardizedTestScore: z.string().nullable().optional(),
    standardizedTestDate: z.string().nullable().optional(),
    planToRetake: flexibleBoolean.nullable().optional()
  }).nullable().optional(),
  intendedMajor: z.string().nullable().optional(),
  preferredCountries: z.array(z.string()).nullable().optional(),
  destinationCountry: z.string().nullable().optional(),
  intakeYear: z.string().nullable().optional(),
  status: z.enum(["inquiry", "converted", "visa_applied", "visa_approved", "departed"]),
  assignedCounselorId: flexibleUuid.nullable().optional(),
  budgetRange: z.object({
    min: flexibleNumber,
    max: flexibleNumber
  }).nullable().optional(),
  academicInterests: z.array(z.string()).nullable().optional(),
  extracurriculars: z.array(z.string()).nullable().optional(),
  workExperience: z.array(z.object({
    company: z.string(),
    position: z.string(),
    duration: z.string(),
    description: z.string()
  })).nullable().optional(),
  familyInfo: z.object({
    fatherName: z.string().nullable().optional(),
    motherName: z.string().nullable().optional(),
    fatherOccupation: z.string().nullable().optional(),
    motherOccupation: z.string().nullable().optional(),
    familyIncome: flexibleNumber.nullable().optional(),
    siblings: flexibleNumber.nullable().optional()
  }).nullable().optional(),
  createdAt: flexibleDatetime,
  updatedAt: flexibleDatetime
});

// University Schemas
export const UniversitySchema = z.object({
  id: flexibleUuid,
  name: z.string(),
  country: z.string(),
  city: z.string(),
  website: z.string().nullable().optional(),
  worldRanking: flexibleNumber.nullable().optional(),
  degreeLevels: z.array(z.string()).nullable().optional(),
  specialization: z.string().nullable().optional(),
  offerLetterFee: z.union([z.string(), flexibleNumber]).nullable().optional(),
  annualFee: z.union([z.string(), flexibleNumber]).nullable().optional(),
  admissionRequirements: z.object({
    minimumGPA: z.string().nullable().optional(),
    ieltsScore: z.string().nullable().optional(),
    gmatScore: z.string().nullable().optional()
  }).nullable().optional(),
  alumni1: z.string().nullable().optional(),
  alumni2: z.string().nullable().optional(),
  alumni3: z.string().nullable().optional(),
  logo: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  ranking: z.object({
    world: flexibleNumber.nullable().optional(),
    national: flexibleNumber.nullable().optional(),
    subject: z.record(flexibleNumber).nullable().optional()
  }).nullable().optional(),
  tuitionFees: z.object({
    domestic: z.object({ min: flexibleNumber, max: flexibleNumber }),
    international: z.object({ min: flexibleNumber, max: flexibleNumber })
  }).nullable().optional(),
  acceptanceRate: z.union([z.string(), flexibleNumber]).nullable().optional(),
  studentPopulation: flexibleNumber.nullable().optional(),
  internationalStudents: flexibleNumber.nullable().optional(),
  campusSize: z.string().nullable().optional(),
  establishedYear: flexibleNumber.nullable().optional(),
  type: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  images: z.array(z.string()).nullable().optional(),
  createdAt: flexibleDatetime,
  updatedAt: flexibleDatetime
});

// Course Schemas
export const CourseSchema = z.object({
  id: z.string().uuid(),
  universityId: z.string().uuid(),
  name: z.string(),
  degree: z.string(),
  duration: z.string().optional(),
  tuitionFee: z.string().optional(),
  description: z.string().optional(),
  requirements: z.object({
    gpa: z.string().optional(),
    ielts: z.string().optional(),
    toefl: z.string().optional()
  }).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Application Schemas
export const ApplicationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  universityId: z.string().uuid(),
  courseId: z.string().uuid().optional(),
  status: z.enum(["draft", "submitted", "under_review", "accepted", "rejected", "waitlisted"]),
  submittedAt: z.string().datetime().optional(),
  deadlineDate: z.string().datetime().optional(),
  lastUpdated: z.string().datetime(),
  notes: z.string().optional(),
  applicationData: z.object({
    personalStatement: z.string().optional(),
    essays: z.array(z.object({
      question: z.string(),
      answer: z.string()
    })).optional()
  }).optional(),
  university: z.object({
    name: z.string(),
    country: z.string(),
    city: z.string()
  }).optional(),
  course: z.object({
    name: z.string(),
    degree: z.string()
  }).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Document Schemas
export const DocumentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  applicationId: z.string().uuid().optional(),
  type: z.enum(["transcript", "test_score", "essay", "recommendation", "resume", "certificate", "other"]),
  name: z.string(),
  filename: z.string(),
  url: z.string(),
  uploadedAt: z.string().datetime(),
  verified: z.boolean(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Forum Schemas
export const ForumPostSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  category: z.enum(["uk_study", "visa_tips", "ielts_prep", "general", "usa_study", "canada_study", "australia_study"]),
  tags: z.array(z.string()).optional(),
  likesCount: z.number(),
  commentsCount: z.number(),
  viewsCount: z.number(),
  isLiked: z.boolean().optional(),
  isSaved: z.boolean().optional(),
  isPinned: z.boolean(),
  author: z.object({
    id: z.string().uuid(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    profilePicture: z.string().optional()
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const ForumCommentSchema = z.object({
  id: z.string().uuid(),
  postId: z.string().uuid(),
  studentId: z.string().uuid(),
  content: z.string(),
  likesCount: z.number(),
  isLiked: z.boolean().optional(),
  author: z.object({
    id: z.string().uuid(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    profilePicture: z.string().optional()
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Notification Schemas
export const NotificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(["application_update", "document_reminder", "message", "system", "deadline"]),
  title: z.string(),
  message: z.string(),
  read: z.boolean(),
  actionUrl: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Subscription Schemas
export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  tier: z.enum(["free", "premium", "elite"]),
  status: z.enum(["active", "expired", "cancelled", "pending"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  paymentMethod: z.string().optional(),
  amount: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Event Schemas
export const EventSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  eventDate: z.string().datetime(),
  eventType: z.string(),
  location: z.string().optional(),
  maxAttendees: z.number().optional(),
  registeredCount: z.number(),
  registrationDeadline: z.string().datetime().optional(),
  isRegistered: z.boolean().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Testimonial Schemas
export const TestimonialSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  content: z.string(),
  rating: z.number().min(1).max(5),
  featured: z.boolean(),
  student: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    profilePicture: z.string().optional(),
    destinationCountry: z.string().optional()
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// Chat Schemas
export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  senderId: z.string().uuid(),
  receiverId: z.string().uuid(),
  conversationHash: z.string(),
  content: z.string(),
  messageType: z.enum(["text", "image", "file"]),
  readAt: z.string().datetime().optional(),
  sender: z.object({
    id: z.string().uuid(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    profilePicture: z.string().optional()
  }),
  receiver: z.object({
    id: z.string().uuid(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    profilePicture: z.string().optional()
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// AI Matching Schemas
export const AIMatchingResultSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  universityId: z.string().uuid(),
  matchScore: z.number().min(0).max(100),
  reasoning: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  factors: z.array(z.string()),
  university: UniversitySchema.optional(),
  createdAt: z.string().datetime()
});

// ============================================================================
// ENDPOINT-SPECIFIC RESPONSE SCHEMAS
// ============================================================================

// User endpoints
export const GetUserResponseSchema = createApiResponseSchema(UserSchema);
export const GetUsersResponseSchema = createApiResponseSchema(z.array(UserSchema));
export const CreateUserResponseSchema = createApiResponseSchema(UserSchema);
export const UpdateUserResponseSchema = createApiResponseSchema(UserSchema);

// Authentication endpoints
export const LoginResponseSchema = createApiResponseSchema(AuthResponseSchema);
export const RegisterResponseSchema = createApiResponseSchema(AuthResponseSchema);
export const RefreshTokenResponseSchema = createApiResponseSchema(z.object({
  token: z.string(),
  expiresAt: z.string().datetime()
}));

// Student Profile endpoints
export const GetStudentProfileResponseSchema = createApiResponseSchema(StudentProfileSchema);
export const GetStudentsResponseSchema = createApiResponseSchema(z.array(StudentProfileSchema));
export const CreateStudentProfileResponseSchema = createApiResponseSchema(StudentProfileSchema);
export const UpdateStudentProfileResponseSchema = createApiResponseSchema(StudentProfileSchema);

// University endpoints
export const GetUniversityResponseSchema = createApiResponseSchema(UniversitySchema);
export const GetUniversitiesResponseSchema = createApiResponseSchema(z.array(UniversitySchema));
export const SearchUniversitiesResponseSchema = createApiResponseSchema(z.array(UniversitySchema));
export const CreateUniversityResponseSchema = createApiResponseSchema(UniversitySchema);
export const UpdateUniversityResponseSchema = createApiResponseSchema(UniversitySchema);

// Course endpoints
export const GetCourseResponseSchema = createApiResponseSchema(CourseSchema);
export const GetCoursesResponseSchema = createApiResponseSchema(z.array(CourseSchema));
export const CreateCourseResponseSchema = createApiResponseSchema(CourseSchema);

// Application endpoints
export const GetApplicationResponseSchema = createApiResponseSchema(ApplicationSchema);
export const GetApplicationsResponseSchema = createApiResponseSchema(z.array(ApplicationSchema));
export const CreateApplicationResponseSchema = createApiResponseSchema(ApplicationSchema);
export const UpdateApplicationResponseSchema = createApiResponseSchema(ApplicationSchema);

// Document endpoints
export const GetDocumentResponseSchema = createApiResponseSchema(DocumentSchema);
export const GetDocumentsResponseSchema = createApiResponseSchema(z.array(DocumentSchema));
export const CreateDocumentResponseSchema = createApiResponseSchema(DocumentSchema);
export const UpdateDocumentResponseSchema = createApiResponseSchema(DocumentSchema);

// Forum endpoints
export const GetForumPostResponseSchema = createApiResponseSchema(ForumPostSchema);
export const GetForumPostsResponseSchema = createApiResponseSchema(z.array(ForumPostSchema));
export const CreateForumPostResponseSchema = createApiResponseSchema(ForumPostSchema);
export const GetForumCommentsResponseSchema = createApiResponseSchema(z.array(ForumCommentSchema));
export const CreateForumCommentResponseSchema = createApiResponseSchema(ForumCommentSchema);

// Notification endpoints
export const GetNotificationsResponseSchema = createApiResponseSchema(z.array(NotificationSchema));
export const CreateNotificationResponseSchema = createApiResponseSchema(NotificationSchema);
export const GetUnreadCountResponseSchema = createApiResponseSchema(z.object({ count: z.number() }));

// Subscription endpoints
export const GetSubscriptionResponseSchema = createApiResponseSchema(SubscriptionSchema);
export const CreateSubscriptionResponseSchema = createApiResponseSchema(SubscriptionSchema);
export const UpdateSubscriptionResponseSchema = createApiResponseSchema(SubscriptionSchema);

// Event endpoints
export const GetEventResponseSchema = createApiResponseSchema(EventSchema);
export const GetEventsResponseSchema = createApiResponseSchema(z.array(EventSchema));
export const CreateEventResponseSchema = createApiResponseSchema(EventSchema);

// Testimonial endpoints
export const GetTestimonialsResponseSchema = createApiResponseSchema(z.array(TestimonialSchema));
export const CreateTestimonialResponseSchema = createApiResponseSchema(TestimonialSchema);

// Chat endpoints
export const GetChatMessagesResponseSchema = createApiResponseSchema(z.array(ChatMessageSchema));
export const SendChatMessageResponseSchema = createApiResponseSchema(ChatMessageSchema);

// AI Matching endpoints
export const GetRecommendationsResponseSchema = createApiResponseSchema(z.array(AIMatchingResultSchema));
export const CreateAIMatchingResponseSchema = createApiResponseSchema(AIMatchingResultSchema);

// Dashboard endpoints
export const GetDashboardStatsResponseSchema = createApiResponseSchema(z.object({
  totalApplications: z.number(),
  pendingApplications: z.number(),
  acceptedApplications: z.number(),
  rejectedApplications: z.number(),
  totalDocuments: z.number(),
  verifiedDocuments: z.number(),
  pendingDocuments: z.number(),
  unreadNotifications: z.number(),
  recentActivity: z.array(z.object({
    id: z.string(),
    type: z.string(),
    message: z.string(),
    timestamp: z.string().datetime()
  }))
}));

// Analytics endpoints
export const GetAnalyticsResponseSchema = createApiResponseSchema(z.object({
  views: z.number(),
  interactions: z.number(),
  conversions: z.number(),
  timeRange: z.string(),
  data: z.array(z.object({
    date: z.string(),
    value: z.number()
  }))
}));

// ============================================================================
// BULK OPERATION SCHEMAS
// ============================================================================

export const BulkOperationResultSchema = z.object({
  successful: z.number(),
  failed: z.number(),
  errors: z.array(z.object({
    index: z.number(),
    error: z.string()
  }))
});

export const BulkCreateResponseSchema = createApiResponseSchema(BulkOperationResultSchema);
export const BulkUpdateResponseSchema = createApiResponseSchema(BulkOperationResultSchema);
export const BulkDeleteResponseSchema = createApiResponseSchema(BulkOperationResultSchema);