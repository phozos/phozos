import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  timestamp, 
  integer, 
  boolean, 
  jsonb, 
  decimal,
  uuid,
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userTypeEnum = pgEnum("user_type", ["customer", "team_member", "company_profile"]);
export const teamRoleEnum = pgEnum("team_role", ["admin", "counselor"]);
export const accountStatusEnum = pgEnum("account_status", ["active", "inactive", "pending_approval", "suspended", "rejected"]);
export const applicationStatusEnum = pgEnum("application_status", ["draft", "submitted", "under_review", "accepted", "rejected", "waitlisted"]);
export const documentTypeEnum = pgEnum("document_type", ["transcript", "test_score", "essay", "recommendation", "resume", "certificate", "other"]);
export const notificationTypeEnum = pgEnum("notification_type", ["application_update", "document_reminder", "message", "system", "deadline", "feature_addition", "feature_deprecation", "feature_modification"]);
export const subscriptionTierEnum = pgEnum("subscription_tier", ["free", "premium", "elite"]);
export const studentStatusEnum = pgEnum("student_status", ["inquiry", "converted", "visa_applied", "visa_approved", "departed"]);
export const fieldTypeEnum = pgEnum("field_type", ["text", "textarea", "number", "date", "dropdown", "checkbox", "file"]);
export const dashboardSectionEnum = pgEnum("dashboard_section", ["counselor"]);
export const forumCategoryEnum = pgEnum("forum_category", ["general", "usa_study", "uk_study", "canada_study", "australia_study", "ielts_prep", "visa_tips", "scholarships", "europe_study"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "expired", "cancelled", "pending"]);
export const supportTypeEnum = pgEnum("support_type", ["email", "whatsapp", "phone", "premium"]);
export const universityTierEnum = pgEnum("university_tier", ["general", "top500", "top200", "top100", "ivy_league"]);
export const reportReasonEnum = pgEnum("report_reason", ["spam", "inappropriate", "harassment", "misinformation", "off_topic", "other"]);
export const outboxStatusEnum = pgEnum("outbox_status", ["pending", "processing", "completed", "failed"]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password"),
  temporaryPassword: text("temporary_password"), // Store encrypted copy of temporary password for admin reference
  userType: userTypeEnum("user_type").notNull().default("customer"),
  teamRole: teamRoleEnum("team_role"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  companyName: text("company_name"), // Company name for company_profile users
  profilePicture: text("profile_picture"),
  accountStatus: accountStatusEnum("account_status").default("pending_approval"),
  verificationToken: text("verification_token"),
  verificationTokenExpires: timestamp("verification_token_expires"),
  lastLoginAt: timestamp("last_login_at"),
  coolingPeriodBypassedAt: timestamp("cooling_period_bypassed_at"), // Admin can bypass cooling period
  coolingPeriodBypassedBy: uuid("cooling_period_bypassed_by").references((): any => users.id), // Admin who bypassed
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  accountLockedAt: timestamp("account_locked_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Refresh tokens table for token rotation pattern
export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
  deviceInfo: varchar("device_info", { length: 500 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  isRevoked: boolean("is_revoked").default(false).notNull()
});

// Student profiles
export const studentProfiles = pgTable("student_profiles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  phone: text("phone"),
  dateOfBirth: timestamp("date_of_birth"),
  nationality: text("nationality"),
  currentEducationLevel: text("current_education_level"),
  institutionName: text("institution_name"),
  gpa: decimal("gpa", { precision: 5, scale: 2 }),
  academicScoringType: text("academic_scoring_type").default("gpa"), // 'gpa', 'percentage', or 'grade'
  testScores: jsonb("test_scores").$type<{
    sat?: number;
    act?: number;
    gre?: number;
    gmat?: number;
    toefl?: number;
    ielts?: number;
    englishTestScore?: string;
    englishBandScores?: string;
    englishTestDate?: string;
    standardizedTestScore?: string;
    standardizedTestDate?: string;
    planToRetake?: boolean;
  }>(),
  intendedMajor: text("intended_major"),
  preferredCountries: text("preferred_countries").array(),
  destinationCountry: text("destination_country"),
  intakeYear: text("intake_year"),
  status: studentStatusEnum("status").default("inquiry"),
  assignedCounselorId: uuid("assigned_counselor_id").references(() => users.id),
  budgetRange: jsonb("budget_range").$type<{ min: number; max: number }>(),
  academicInterests: text("academic_interests").array(),
  extracurriculars: text("extracurriculars").array(),
  workExperience: jsonb("work_experience").$type<Array<{
    company: string;
    position: string;
    duration: string;
    description: string;
  }>>(),
  familyInfo: jsonb("family_info").$type<{
    fatherName?: string;
    motherName?: string;
    fatherOccupation?: string;
    motherOccupation?: string;
    familyIncome?: number;
    siblings?: number;
  }>(),
  educationHistory: jsonb("education_history").$type<Array<{
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startYear: string;
    endYear: string;
    gpa?: number;
    percentage?: number;
  }>>(),
  // Extended profile information
  personalDetails: jsonb("personal_details").$type<{
    gender?: string;
    nationality?: string;
    whatsappNumber?: string;
    permanentAddress?: string;
    address?: string;
    city?: string;
    country?: string;
    passportFirstName?: string;
    passportLastName?: string;
    passportNumber?: string;
    passportExpiry?: string;
  }>(),
  
  academicDetails: jsonb("academic_details").$type<{
    highestQualification?: string;
    academicYear?: string;
    academicGaps?: string;
  }>(),
  
  workDetails: jsonb("work_details").$type<{
    jobTitle?: string;
    companyName?: string;
    workDuration?: string;
    employmentStatus?: string;
    jobResponsibilities?: string;
  }>(),

  
  studyPreferences: jsonb("study_preferences").$type<{
    preferredCountries?: string[];
    preferredIntake?: string;
    programLevel?: string;
    countryChoiceReason?: string;
    studyGoals?: string;
  }>(),
  
  universityPreferences: jsonb("university_preferences").$type<{
    preferredUniversities?: string;
    preferredLocation?: string;
    institutionType?: string;
    campusPreference?: string;
  }>(),
  
  financialInfo: jsonb("financial_info").$type<{
    estimatedBudget?: string;
    fundingSource?: string;
    loanRequired?: boolean;
    financialConstraints?: string;
  }>(),
  
  visaHistory: jsonb("visa_history").$type<{
    previousVisaApplications?: string;
    visaOutcomes?: string;
    travelHistory?: string;
    immigrationIssues?: string;
  }>(),
  
  familyDetails: jsonb("family_details").$type<{
    fatherDetails?: string;
    motherDetails?: string;
    familyIncome?: string;
    familyMembers?: string;
    relativesAbroad?: string;
    sponsor?: string;
    emergencyContact?: string;
  }>(),
  
  additionalInfo: jsonb("additional_info").$type<{
    careerGoals?: string;
    specialNeeds?: string;
    preferredLanguage?: string;
    referralSource?: string;
    applicationUrgency?: string;
    importantDeadlines?: string;
  }>(),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Universities - Simplified Structure
export const universities = pgTable("universities", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // 1. Basic Information
  name: text("name").notNull(),
  country: text("country").notNull(),
  city: text("city").notNull(),
  website: text("website"),
  worldRanking: integer("world_ranking"),
  
  // 2. Academics
  degreeLevels: text("degree_levels").array(), // Bachelor, Master, PhD
  specialization: text("specialization"), // business, science, engineering, etc.
  
  // 3. Fees
  offerLetterFee: decimal("offer_letter_fee", { precision: 10, scale: 2 }),
  annualFee: decimal("annual_fee", { precision: 10, scale: 2 }),
  
  // 4. Requirements (simplified)
  admissionRequirements: jsonb("admission_requirements").$type<{
    minimumGPA?: string;
    ieltsScore?: string;
    gmatScore?: string;
  }>(),
  
  // 5. Known Alumni
  alumni1: text("alumni1"),
  alumni2: text("alumni2"),
  alumni3: text("alumni3"),
  
  // Legacy fields (kept for backward compatibility)
  logo: text("logo"),
  description: text("description"),
  ranking: jsonb("ranking").$type<{
    world?: number;
    national?: number;
    subject?: Record<string, number>;
  }>(),
  tuitionFees: jsonb("tuition_fees").$type<{
    domestic: { min: number; max: number };
    international: { min: number; max: number };
  }>(),
  acceptanceRate: decimal("acceptance_rate", { precision: 5, scale: 2 }),
  studentPopulation: integer("student_population"),
  internationalStudents: integer("international_students"),
  campusSize: text("campus_size"),
  establishedYear: integer("established_year"),
  type: text("type"),
  tags: text("tags").array(),
  images: text("images").array(),
  tier: universityTierEnum("tier").default("general"),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Courses/Programs
export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  universityId: uuid("university_id").references(() => universities.id).notNull(),
  name: text("name").notNull(),
  degree: text("degree"), // Bachelor's, Master's, PhD
  field: text("field"),
  duration: text("duration"),
  description: text("description"),
  requirements: jsonb("requirements").$type<{
    gpa?: number;
    testScores?: Record<string, number>;
    prerequisites?: string[];
  }>(),
  tuitionFee: decimal("tuition_fee", { precision: 10, scale: 2 }),
  applicationDeadlines: jsonb("application_deadlines").$type<{
    fall?: string;
    spring?: string;
    summer?: string;
  }>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Applications
export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  universityId: uuid("university_id").references(() => universities.id).notNull(),
  courseId: uuid("course_id").references(() => courses.id),
  status: applicationStatusEnum("status").default("draft"),
  applicationData: jsonb("application_data").$type<{
    personalStatement?: string;
    essays?: Array<{ question: string; answer: string }>;
    additionalInfo?: string;
  }>(),
  submittedAt: timestamp("submitted_at"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  deadlineDate: timestamp("deadline_date"),
  assignedCounselorId: uuid("assigned_counselor_id").references(() => users.id),
  notes: text("notes"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documents
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  applicationId: uuid("application_id").references(() => applications.id),
  type: documentTypeEnum("type").notNull(),
  name: text("name").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  filePath: text("file_path").notNull(),
  description: text("description"),
  isVerified: boolean("is_verified").default(false),
  verifiedBy: uuid("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  tags: text("tags").array(),
  metadata: jsonb("metadata").$type<{
    ocrText?: string;
    qualityScore?: number;
    extractedData?: Record<string, any>;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: jsonb("data").$type<Record<string, any>>(),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});



// Forum comments
export const forumComments = pgTable("forum_comments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: uuid("post_id").references(() => forumPostsEnhanced.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  parentId: uuid("parent_id"),
  content: text("content").notNull(),
  likesCount: integer("likes_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  tier: subscriptionTierEnum("tier").notNull(),
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  autoRenew: boolean("auto_renew").default(false),
  metadata: jsonb("metadata").$type<{
    applicationLimit?: number;
    storageLimit?: number;
    features?: string[];
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Events
export const events = pgTable("events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  eventType: text("event_type"), // webinar, workshop, info session
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  timezone: text("timezone"),
  location: text("location"), // online/physical address
  maxAttendees: integer("max_attendees"),
  currentAttendees: integer("current_attendees").default(0),
  organizerId: uuid("organizer_id").references(() => users.id).notNull(),
  tags: text("tags").array(),
  isPublic: boolean("is_public").default(true),
  meetingLink: text("meeting_link"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Security settings
export const securitySettings = pgTable("security_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: text("setting_value").notNull(),
  description: text("description"),
  updatedBy: uuid("updated_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event registrations
export const eventRegistrations = pgTable("event_registrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: uuid("event_id").references(() => events.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  registeredAt: timestamp("registered_at").defaultNow(),
  attended: boolean("attended").default(false),
});

// AI matching results
export const aiMatchingResults = pgTable("ai_matching_results", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  universityId: uuid("university_id").references(() => universities.id).notNull(),
  matchScore: decimal("match_score", { precision: 5, scale: 2 }),
  reasoning: jsonb("reasoning").$type<{
    factors: string[];
    weights: Record<string, number>;
    details: string;
  }>(),
  modelVersion: text("model_version"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Student testimonials
export const testimonials = pgTable("testimonials", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  destinationCountry: text("destination_country").notNull(),
  intake: text("intake").notNull(),
  photo: text("photo"),
  counselorName: text("counselor_name").notNull(),
  feedback: text("feedback").notNull(),
  isApproved: boolean("is_approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Custom fields system
export const customFields = pgTable("custom_fields", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  role: teamRoleEnum("role").notNull(),
  label: text("label").notNull(),
  fieldType: fieldTypeEnum("field_type").notNull(),
  options: text("options").array(), // for dropdown options
  isRequired: boolean("is_required").default(false),
  isActive: boolean("is_active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Custom field values
export const customFieldValues = pgTable("custom_field_values", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: uuid("student_id").references(() => studentProfiles.id).notNull(),
  fieldId: uuid("field_id").references(() => customFields.id).notNull(),
  value: text("value"),
  fileUrl: text("file_url"), // for file uploads
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced forum posts with better categorization
export const forumPostsEnhanced = pgTable("forum_posts_enhanced", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  // Universal authorId supports all user types (students, companies, team members)
  authorId: uuid("author_id").references(() => users.id).notNull(),
  title: text("title"),
  content: text("content").notNull(),
  category: forumCategoryEnum("category").notNull(),
  tags: text("tags").array(),
  images: text("images").array(), // Support for photos
  pollOptions: jsonb("poll_options").$type<Array<PollOptionStored>>(), // Support for polls - stores only id and text
  pollQuestion: text("poll_question"),
  pollEndsAt: timestamp("poll_ends_at"),
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at"),
  isModerated: boolean("is_moderated").default(false),
  moderatorId: uuid("moderator_id").references(() => users.id),
  moderatedAt: timestamp("moderated_at"),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  viewsCount: integer("views_count").default(0),
  reportCount: integer("report_count").default(0),
  isHiddenByReports: boolean("is_hidden_by_reports").default(false),
  hiddenAt: timestamp("hidden_at"),
  canBeRestoredUntil: timestamp("can_be_restored_until"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


// Forum likes
export const forumLikes = pgTable("forum_likes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: uuid("post_id").references(() => forumPostsEnhanced.id),
  // Universal authorId supports all user types (students, companies, team members)
  authorId: uuid("author_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Forum saves
export const forumSaves = pgTable("forum_saves", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: uuid("post_id").references(() => forumPostsEnhanced.id).notNull(),
  // Universal authorId supports all user types (students, companies, team members)
  authorId: uuid("author_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Forum post reports
export const forumPostReports = pgTable("forum_post_reports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: uuid("post_id").references(() => forumPostsEnhanced.id).notNull(),
  reporterUserId: uuid("reporter_user_id").references(() => users.id).notNull(),
  reportReason: reportReasonEnum("report_reason").notNull(),
  reportDetails: text("report_details"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Student timeline/status history
export const studentTimeline = pgTable("student_timeline", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: uuid("student_id").references(() => studentProfiles.id).notNull(),
  action: text("action").notNull(),
  description: text("description"),
  previousStatus: studentStatusEnum("previous_status"),
  newStatus: studentStatusEnum("new_status"),
  performedBy: uuid("performed_by").references(() => users.id).notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat messages table for student-counselor communication
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: uuid("student_id").references(() => users.id).notNull(),
  counselorId: uuid("counselor_id").references(() => users.id).notNull(),
  senderId: uuid("sender_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at"),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Forum poll votes table
export const forumPollVotes = pgTable("forum_poll_votes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: uuid("post_id").references(() => forumPostsEnhanced.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  optionId: text("option_id").notNull(), // corresponds to poll option id
  createdAt: timestamp("created_at").defaultNow(),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStudentProfileSchema = createInsertSchema(studentProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUniversitySchema = createInsertSchema(universities).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  offerLetterFee: z.union([z.string(), z.number()]).transform(val => {
    if (val === "" || val === null || val === undefined) return null;
    return String(val);
  }).optional(),
  annualFee: z.union([z.string(), z.number()]).transform(val => {
    if (val === "" || val === null || val === undefined) return null;
    return String(val);
  }).optional(),
  acceptanceRate: z.union([z.string(), z.number()]).transform(val => {
    if (val === "" || val === null || val === undefined) return null;
    return String(val);
  }).optional(),
});
export const insertCourseSchema = createInsertSchema(courses).omit({ id: true, createdAt: true, updatedAt: true });
export const insertApplicationSchema = createInsertSchema(applications).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });

export const insertForumCommentSchema = createInsertSchema(forumComments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertForumPostReportSchema = createInsertSchema(forumPostReports).omit({ id: true, createdAt: true });
export const insertForumPollVoteSchema = createInsertSchema(forumPollVotes).omit({ id: true, createdAt: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTestimonialSchema = createInsertSchema(testimonials).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomFieldSchema = createInsertSchema(customFields).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomFieldValueSchema = createInsertSchema(customFieldValues).omit({ id: true, createdAt: true, updatedAt: true });
// Enhanced forum post validation with content rules for regular users
export const insertForumPostEnhancedSchema = createInsertSchema(forumPostsEnhanced).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  content: z.string()
    .min(1, "Content is required")
    .max(100, "Content cannot exceed 100 characters including spaces")
    .refine((content) => {
      // Rule 2: No links allowed - detect URLs
      const urlRegex = /(https?:\/\/|www\.|[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i;
      return !urlRegex.test(content);
    }, "Links are not allowed in posts")
    .refine((content) => {
      // Rule 3: No phone numbers allowed - detect various phone number formats
      const phoneRegex = /(\+?\d[\d\s\-\(\)]{7,}|\b\d{3}[\s\-]?\d{3}[\s\-]?\d{4}\b)/;
      return !phoneRegex.test(content);
    }, "Phone numbers are not allowed in posts")
    .refine((content) => {
      // Rule 4: Only typed text allowed - detect potentially pasted content
      // This is a basic check since we can't actually detect paste vs type on server
      // The real check will be implemented on the frontend
      return content.length <= 100;
    }, "Content exceeds maximum length"),
  pollEndsAt: z.union([z.string(), z.date()]).transform(val => {
    if (val === null || val === undefined) return undefined;
    if (typeof val === 'string') {
      const date = new Date(val);
      return isNaN(date.getTime()) ? undefined : date;
    }
    return val;
  }).optional()
});

// Company profile forum post schema - bypasses all restrictions
export const insertForumPostCompanySchema = createInsertSchema(forumPostsEnhanced).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  content: z.string().min(1, "Content is required"), // No character limit, links, or paste detection
  title: z.string().optional(), // Allow optional custom titles
  pollEndsAt: z.union([z.string(), z.date()]).transform(val => {
    if (val === null || val === undefined) return undefined;
    if (typeof val === 'string') {
      const date = new Date(val);
      return isNaN(date.getTime()) ? undefined : date;
    }
    return val;
  }).optional()
});
export const insertForumLikeSchema = createInsertSchema(forumLikes).omit({ id: true, createdAt: true });
export const insertForumSaveSchema = createInsertSchema(forumSaves).omit({ id: true, createdAt: true });
export const insertStudentTimelineSchema = createInsertSchema(studentTimeline).omit({ id: true, createdAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true, updatedAt: true });
// Followup schemas will be defined after the table definitions

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = typeof refreshTokens.$inferInsert;
export type StudentProfile = typeof studentProfiles.$inferSelect;
export type InsertStudentProfile = z.infer<typeof insertStudentProfileSchema>;
export type University = typeof universities.$inferSelect;
export type InsertUniversity = z.infer<typeof insertUniversitySchema>;
export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type ForumComment = typeof forumComments.$inferSelect;
export type InsertForumComment = z.infer<typeof insertForumCommentSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type EventRegistration = typeof eventRegistrations.$inferSelect;
export type AIMatchingResult = typeof aiMatchingResults.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// New table types
export type Testimonial = typeof testimonials.$inferSelect;
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type CustomField = typeof customFields.$inferSelect;
export type InsertCustomField = z.infer<typeof insertCustomFieldSchema>;
export type CustomFieldValue = typeof customFieldValues.$inferSelect;
export type InsertCustomFieldValue = z.infer<typeof insertCustomFieldValueSchema>;
export type ForumPostEnhanced = typeof forumPostsEnhanced.$inferSelect;
export type InsertForumPostEnhanced = z.infer<typeof insertForumPostEnhancedSchema>;
export type ForumPostReport = typeof forumPostReports.$inferSelect;
export type InsertForumPostReport = z.infer<typeof insertForumPostReportSchema>;

// Extended type for reportPost method return value with metadata
export type ForumPostReportWithMetadata = ForumPostReport & {
  currentReportCount: number;
  wasAutoHidden: boolean;
};

export type ForumLike = typeof forumLikes.$inferSelect;
export type InsertForumLike = z.infer<typeof insertForumLikeSchema>;
export type ForumSave = typeof forumSaves.$inferSelect;
export type InsertForumSave = z.infer<typeof insertForumSaveSchema>;
export type StudentTimeline = typeof studentTimeline.$inferSelect;
export type InsertStudentTimeline = z.infer<typeof insertStudentTimelineSchema>;
export type ForumPollVote = typeof forumPollVotes.$inferSelect;
export type InsertForumPollVote = z.infer<typeof insertForumPollVoteSchema>;

// DUAL-TYPE Poll Option Types - New architecture for safe poll handling
export type PollOptionStored = {
  id: string;
  text: string;
};

export type PollOptionWithResults = {
  id: string;
  text: string;
  votes: number;
  percentage: number;
};

export interface PollVoteResult {
  success: boolean;
  pollResults?: any;
  userVotes?: string[];
  error?: string;
  message?: string;
}

export type StaffInvitationLink = typeof staffInvitationLinks.$inferSelect;
export type InsertStaffInvitationLink = z.infer<typeof insertStaffInvitationLinkSchema>;


// Security tables
export const ipRegistrationLimits = pgTable("ip_registration_limits", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ipAddress: text("ip_address").notNull(),
  registrationCount: integer("registration_count").default(0),
  firstRegistrationAt: timestamp("first_registration_at").defaultNow(),
  lastRegistrationAt: timestamp("last_registration_at").defaultNow(),
  blockedUntil: timestamp("blocked_until"),
});

export const loginAttempts = pgTable("login_attempts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  ipAddress: text("ip_address").notNull(),
  success: boolean("success").default(false),
  userAgent: text("user_agent"),
  attemptedAt: timestamp("attempted_at").defaultNow(),
});

export const securityEvents = pgTable("security_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id),
  eventType: text("event_type").notNull(), // 'account_locked', 'cooling_bypassed', 'failed_login', etc.
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Staff invitation links table
export const staffInvitationLinks = pgTable("staff_invitation_links", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  token: varchar("token", { length: 255 }).unique().notNull(),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  isActive: boolean("is_active").default(true),
  usedCount: integer("used_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Forum post limits tracking
export const forumPostLimits = pgTable("forum_post_limits", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  postCount: integer("post_count").default(0),
  lastPostAt: timestamp("last_post_at"),
  resetDate: timestamp("reset_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create insert schemas for new security tables
export const insertIpRegistrationLimitSchema = createInsertSchema(ipRegistrationLimits);
export const insertLoginAttemptSchema = createInsertSchema(loginAttempts);
export const insertStaffInvitationLinkSchema = createInsertSchema(staffInvitationLinks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSecurityEventSchema = createInsertSchema(securityEvents);
export const insertSecuritySettingsSchema = createInsertSchema(securitySettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertForumPostLimitSchema = createInsertSchema(forumPostLimits).omit({ id: true, createdAt: true, updatedAt: true });

// Follow-up schemas (removed duplicate - defined above with other schemas)

// Export security table types
export type IpRegistrationLimit = typeof ipRegistrationLimits.$inferSelect;
export type InsertIpRegistrationLimit = z.infer<typeof insertIpRegistrationLimitSchema>;
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type InsertLoginAttempt = z.infer<typeof insertLoginAttemptSchema>;
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type InsertSecurityEvent = z.infer<typeof insertSecurityEventSchema>;
export type SecuritySettings = typeof securitySettings.$inferSelect;
export type InsertSecuritySettings = z.infer<typeof insertSecuritySettingsSchema>;
export type ForumPostLimit = typeof forumPostLimits.$inferSelect;
export type InsertForumPostLimit = z.infer<typeof insertForumPostLimitSchema>;

// Follow-up types (moved to above with other types)

// Subscription Plans table
export const subscriptionPlans = pgTable("subscription_plans", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("INR"),
  description: text("description"),
  logo: text("logo").default("graduation-cap"), // Plan logo identifier
  features: jsonb("features").$type<string[]>().notNull(),
  tierLevel: integer("tier_level").notNull(),
  isLifetime: boolean("is_lifetime").default(true),
  maxUniversities: integer("max_universities").notNull(),
  maxCountries: integer("max_countries").notNull(),
  universityTier: universityTierEnum("university_tier").notNull().default("general"),
  supportType: supportTypeEnum("support_type").notNull().default("email"),
  turnaroundDays: integer("turnaround_days").notNull(),
  includeLoanAssistance: boolean("include_loan_assistance").default(false),
  includeVisaSupport: boolean("include_visa_support").default(false),
  includeCounselorSession: boolean("include_counselor_session").default(false),
  includeScholarshipPlanning: boolean("include_scholarship_planning").default(false),
  includeMockInterview: boolean("include_mock_interview").default(false),
  includeExpertEditing: boolean("include_expert_editing").default(false),
  includePostAdmitSupport: boolean("include_post_admit_support").default(false),
  includeDedicatedManager: boolean("include_dedicated_manager").default(false),
  includeNetworkingEvents: boolean("include_networking_events").default(false),
  includeFlightAccommodation: boolean("include_flight_accommodation").default(false),
  isBusinessFocused: boolean("is_business_focused").default(false),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  basePlanId: uuid("base_plan_id").notNull().references((): any => subscriptionPlans.id, { onDelete: 'set null' }),
  version: integer("version").notNull().default(1),
  versionName: varchar("version_name", { length: 50 }),
  isLatestVersion: boolean("is_latest_version").default(true),
  deprecatedAt: timestamp("deprecated_at"),
  archivedAt: timestamp("archived_at"),
  successorPlanId: uuid("successor_plan_id").references((): any => subscriptionPlans.id, { onDelete: 'set null' }),
  feature_version_metadata: jsonb("feature_version_metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Subscriptions table
export const userSubscriptions = pgTable("user_subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  planId: uuid("plan_id").references(() => subscriptionPlans.id).notNull(),
  status: subscriptionStatusEnum("status").notNull().default("pending"),
  isLifetime: boolean("is_lifetime").default(true),
  tierLevel: integer("tier_level"),
  lifetimeActivatedAt: timestamp("lifetime_activated_at"),
  highestTierReached: integer("highest_tier_reached"),
  startedAt: timestamp("started_at"),
  expiresAt: timestamp("expires_at"),
  orderId: text("order_id"), // Razorpay order ID for idempotency
  paymentReference: text("payment_reference"),
  paymentGateway: text("payment_gateway"), // stripe, razorpay, etc.
  autoRenew: boolean("auto_renew"),
  universitiesUsed: integer("universities_used").default(0),
  countriesUsed: integer("countries_used").default(0),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("INR"),
  paidAt: timestamp("paid_at"),
  
  // Grandfathering support (Phase 2)
  subscribedPlanSnapshot: jsonb("subscribed_plan_snapshot"), // Immutable snapshot of plan at subscription time
  grandfatheredPrice: decimal("grandfathered_price", { precision: 10, scale: 2 }), // Locked price immune to plan changes
  grandfatheredUntil: timestamp("grandfathered_until"), // Optional expiration (null = forever)
  isGrandfathered: boolean("is_grandfathered").default(false), // Whether pricing is grandfathered
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment Settings table (for admin configuration)
export const paymentSettings = pgTable("payment_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  gateway: text("gateway").notNull(), // stripe, razorpay, paypal, etc.
  isActive: boolean("is_active").default(false),
  configuration: jsonb("configuration").$type<{
    publicKey?: string;
    webhookSecret?: string;
    apiEndpoint?: string;
    currency?: string;
    testMode?: boolean;
  }>(),
  updatedBy: uuid("updated_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Webhook Events table (for deduplication)
export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: text("event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload"),
  status: text("status").notNull().default("processing"),
  errorMessage: text("error_message"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Subscription Events table (for audit trail)
export const subscriptionEvents = pgTable("subscription_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: uuid("subscription_id").references(() => userSubscriptions.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  eventType: text("event_type").notNull(),
  oldStatus: text("old_status"),
  newStatus: text("new_status"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Subscription Audit Outbox table (for event outbox pattern)
export const subscriptionAuditOutbox = pgTable("subscription_audit_outbox", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: uuid("subscription_id").notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  oldStatus: varchar("old_status", { length: 50 }),
  newStatus: varchar("new_status", { length: 50 }),
  metadata: jsonb("metadata"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  retries: integer("retries").default(0).notNull(),
  nextRetryAt: timestamp("next_retry_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
});

// Failed Payments table (for tracking payment failures)
export const failedPayments = pgTable("failed_payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  planId: uuid("plan_id").references(() => subscriptionPlans.id, { onDelete: 'set null' }),
  orderId: text("order_id"),
  paymentId: text("payment_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("INR"),
  failureReason: text("failure_reason"),
  razorpayErrorCode: text("razorpay_error_code"),
  razorpayErrorDescription: text("razorpay_error_description"),
  failedAt: timestamp("failed_at").notNull().defaultNow(),
  notifiedAt: timestamp("notified_at"),
  digestSentAt: timestamp("digest_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Subscription Plan Changes table (for audit trail)
export const subscriptionPlanChanges = pgTable("subscription_plan_changes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: uuid("plan_id").references(() => subscriptionPlans.id, { onDelete: 'cascade' }).notNull(),
  changedBy: uuid("changed_by").references(() => users.id).notNull(),
  changeType: varchar("change_type", { length: 50 }).notNull(),
  fieldChanges: jsonb("field_changes").$type<Record<string, { old: any; new: any }>>().notNull(),
  changeReason: text("change_reason"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Subscription Plan Notifications table (for plan change notifications)
export const subscriptionPlanNotifications = pgTable("subscription_plan_notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: uuid("plan_id").references(() => subscriptionPlans.id, { onDelete: 'cascade' }).notNull(),
  notificationType: varchar("notification_type", { length: 50 }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  notificationDate: timestamp("notification_date").notNull(),
  sentAt: timestamp("sent_at"),
  recipientCount: integer("recipient_count").default(0),
  metadata: jsonb("metadata").$type<{
    oldPrice?: number;
    newPrice?: number;
    percentChange?: string;
    priceIncrease?: boolean;
    successorPlanId?: string;
    migrationDeadline?: string;
    [key: string]: any;
  }>(),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User Plan Notifications table (for tracking individual user notification delivery)
export const userPlanNotifications = pgTable("user_plan_notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  planNotificationId: uuid("plan_notification_id").references(() => subscriptionPlanNotifications.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  readAt: timestamp("read_at"),
  acknowledgedAt: timestamp("acknowledged_at"),
  emailStatus: varchar("email_status", { length: 50 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Plan Migrations table (for managing plan migration campaigns)
export const planMigrations = pgTable("plan_migrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  sourcePlanId: uuid("source_plan_id").references(() => subscriptionPlans.id, { onDelete: 'cascade' }).notNull(),
  targetPlanId: uuid("target_plan_id").references(() => subscriptionPlans.id, { onDelete: 'cascade' }).notNull(),
  migrationType: varchar("migration_type", { length: 50 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  incentiveType: varchar("incentive_type", { length: 50 }),
  incentiveValue: jsonb("incentive_value").$type<{
    percentage?: number;
    months?: number;
    features?: string[];
    [key: string]: any;
  }>(),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  totalEligibleUsers: integer("total_eligible_users").default(0),
  migratedUsers: integer("migrated_users").default(0),
  declinedUsers: integer("declined_users").default(0),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Plan Migration Users table (for tracking individual user migration status)
export const planMigrationUsers = pgTable("plan_migration_users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  migrationId: uuid("migration_id").references(() => planMigrations.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  subscriptionId: uuid("subscription_id").references(() => userSubscriptions.id, { onDelete: 'cascade' }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  notifiedAt: timestamp("notified_at"),
  respondedAt: timestamp("responded_at"),
  migratedAt: timestamp("migrated_at"),
  incentiveApplied: boolean("incentive_applied").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Quota Usage table (Phase 3.2: Quota Management System)
export const quotaUsage = pgTable("quota_usage", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  subscriptionId: uuid("subscription_id").references(() => userSubscriptions.id, { onDelete: 'cascade' }).notNull(),
  quotaType: varchar("quota_type", { length: 50 }).notNull(),
  usedCount: integer("used_count").default(0).notNull(),
  allocatedCount: integer("allocated_count").notNull(),
  lastUsedAt: timestamp("last_used_at"),
  resetAt: timestamp("reset_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Feature Usage Events table (Phase 3.3: Feature Usage Analytics)
export const featureUsageEvents = pgTable("feature_usage_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  subscriptionId: uuid("subscription_id").references(() => userSubscriptions.id, { onDelete: 'cascade' }).notNull(),
  featureName: varchar("feature_name", { length: 100 }).notNull(),
  usageType: varchar("usage_type", { length: 50 }).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Feature Usage Summary table (Phase 3.3: Feature Usage Analytics - Aggregated data)
export const featureUsageSummary = pgTable("feature_usage_summary", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: uuid("plan_id").references(() => subscriptionPlans.id, { onDelete: 'cascade' }).notNull(),
  featureName: varchar("feature_name", { length: 100 }).notNull(),
  totalUsers: integer("total_users").default(0),
  activeUsers: integer("active_users").default(0),
  usageCount: integer("usage_count").default(0),
  adoptionRate: decimal("adoption_rate", { precision: 5, scale: 2 }),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Create insert schemas
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaymentSettingsSchema = createInsertSchema(paymentSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({ id: true, createdAt: true });
export const insertSubscriptionEventSchema = createInsertSchema(subscriptionEvents).omit({ id: true, createdAt: true });
export const insertSubscriptionAuditOutboxSchema = createInsertSchema(subscriptionAuditOutbox).omit({ id: true, createdAt: true });
export const insertFailedPaymentSchema = createInsertSchema(failedPayments).omit({ id: true, createdAt: true });
export const insertSubscriptionPlanChangeSchema = createInsertSchema(subscriptionPlanChanges).omit({ id: true, createdAt: true });
export const insertSubscriptionPlanNotificationSchema = createInsertSchema(subscriptionPlanNotifications).omit({ id: true, createdAt: true });
export const insertUserPlanNotificationSchema = createInsertSchema(userPlanNotifications).omit({ id: true, createdAt: true });
export const insertPlanMigrationSchema = createInsertSchema(planMigrations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlanMigrationUserSchema = createInsertSchema(planMigrationUsers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertQuotaUsageSchema = createInsertSchema(quotaUsage).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFeatureUsageEventSchema = createInsertSchema(featureUsageEvents).omit({ id: true, createdAt: true });
export const insertFeatureUsageSummarySchema = createInsertSchema(featureUsageSummary).omit({ id: true, createdAt: true, updatedAt: true });

// Insert schemas will be added based on what's actually missing after checking existing ones

// Company forum post schema already exists above, no need to redefine

// ForumPostEnhanced types already exported above - removing duplicates

export type SecuritySetting = typeof securitySettings.$inferSelect;
// Removed: Follow-up related type definitions (schemas removed from system)
// ForumPostLimit and ForumPollVote types already exported above - removing duplicates

// Export subscription-related types
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type PaymentSettings = typeof paymentSettings.$inferSelect;
export type InsertPaymentSettings = z.infer<typeof insertPaymentSettingsSchema>;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect;
export type InsertSubscriptionEvent = z.infer<typeof insertSubscriptionEventSchema>;
export type SubscriptionAuditOutbox = typeof subscriptionAuditOutbox.$inferSelect;
export type InsertSubscriptionAuditOutbox = z.infer<typeof insertSubscriptionAuditOutboxSchema>;
export type FailedPayment = typeof failedPayments.$inferSelect;
export type InsertFailedPayment = z.infer<typeof insertFailedPaymentSchema>;
export type SubscriptionPlanChange = typeof subscriptionPlanChanges.$inferSelect;
export type InsertSubscriptionPlanChange = z.infer<typeof insertSubscriptionPlanChangeSchema>;
export type SubscriptionPlanNotification = typeof subscriptionPlanNotifications.$inferSelect;
export type InsertSubscriptionPlanNotification = z.infer<typeof insertSubscriptionPlanNotificationSchema>;
export type UserPlanNotification = typeof userPlanNotifications.$inferSelect;
export type InsertUserPlanNotification = z.infer<typeof insertUserPlanNotificationSchema>;
export type PlanMigration = typeof planMigrations.$inferSelect;
export type InsertPlanMigration = z.infer<typeof insertPlanMigrationSchema>;
export type PlanMigrationUser = typeof planMigrationUsers.$inferSelect;
export type InsertPlanMigrationUser = z.infer<typeof insertPlanMigrationUserSchema>;
export type QuotaUsage = typeof quotaUsage.$inferSelect;
export type InsertQuotaUsage = z.infer<typeof insertQuotaUsageSchema>;
export type FeatureUsageEvent = typeof featureUsageEvents.$inferSelect;
export type InsertFeatureUsageEvent = z.infer<typeof insertFeatureUsageEventSchema>;
export type FeatureUsageSummary = typeof featureUsageSummary.$inferSelect;
export type InsertFeatureUsageSummary = z.infer<typeof insertFeatureUsageSummarySchema>;

