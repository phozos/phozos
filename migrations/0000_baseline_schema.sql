-- BASELINE MIGRATION
-- Generated: October 22, 2025
-- Purpose: Initial schema snapshot for EduPath database
-- 
-- This migration represents the baseline state of the database schema.
-- It includes:
-- - 31 tables with UUID primary keys
-- - 15 PostgreSQL enums
-- - 45 foreign key constraints
-- 
-- IMPORTANT: This baseline is for fresh databases only.
-- The production database was created with db:push and already has this schema.
-- Production will mark this as applied without running the SQL.
-- 
-- DO NOT apply this migration to existing production databases.
-- Future migrations will apply incrementally on top of this baseline.

CREATE TYPE "public"."account_status" AS ENUM('active', 'inactive', 'pending_approval', 'suspended', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('draft', 'submitted', 'under_review', 'accepted', 'rejected', 'waitlisted');--> statement-breakpoint
CREATE TYPE "public"."dashboard_section" AS ENUM('counselor');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('transcript', 'test_score', 'essay', 'recommendation', 'resume', 'certificate', 'other');--> statement-breakpoint
CREATE TYPE "public"."field_type" AS ENUM('text', 'textarea', 'number', 'date', 'dropdown', 'checkbox', 'file');--> statement-breakpoint
CREATE TYPE "public"."forum_category" AS ENUM('general', 'usa_study', 'uk_study', 'canada_study', 'australia_study', 'ielts_prep', 'visa_tips', 'scholarships', 'europe_study');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('application_update', 'document_reminder', 'message', 'system', 'deadline');--> statement-breakpoint
CREATE TYPE "public"."report_reason" AS ENUM('spam', 'inappropriate', 'harassment', 'misinformation', 'off_topic', 'other');--> statement-breakpoint
CREATE TYPE "public"."student_status" AS ENUM('inquiry', 'converted', 'visa_applied', 'visa_approved', 'departed');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'expired', 'cancelled', 'pending');--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('free', 'premium', 'elite');--> statement-breakpoint
CREATE TYPE "public"."support_type" AS ENUM('email', 'whatsapp', 'phone', 'premium');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('admin', 'counselor');--> statement-breakpoint
CREATE TYPE "public"."university_tier" AS ENUM('general', 'top500', 'top200', 'top100', 'ivy_league');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('customer', 'team_member', 'company_profile');--> statement-breakpoint
CREATE TABLE "ai_matching_results" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "university_id" uuid NOT NULL,
        "match_score" numeric(5, 2),
        "reasoning" jsonb,
        "model_version" text,
        "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "applications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "university_id" uuid NOT NULL,
        "course_id" uuid,
        "status" "application_status" DEFAULT 'draft',
        "application_data" jsonb,
        "submitted_at" timestamp,
        "last_updated" timestamp DEFAULT now(),
        "deadline_date" timestamp,
        "assigned_counselor_id" uuid,
        "notes" text,
        "tags" text[],
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "student_id" uuid NOT NULL,
        "counselor_id" uuid NOT NULL,
        "sender_id" uuid NOT NULL,
        "message" text NOT NULL,
        "is_read" boolean DEFAULT false,
        "read_at" timestamp,
        "is_edited" boolean DEFAULT false,
        "edited_at" timestamp,
        "is_deleted" boolean DEFAULT false,
        "deleted_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "university_id" uuid NOT NULL,
        "name" text NOT NULL,
        "degree" text,
        "field" text,
        "duration" text,
        "description" text,
        "requirements" jsonb,
        "tuition_fee" numeric(10, 2),
        "application_deadlines" jsonb,
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "custom_field_values" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "student_id" uuid NOT NULL,
        "field_id" uuid NOT NULL,
        "value" text,
        "file_url" text,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "custom_fields" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "role" "team_role" NOT NULL,
        "label" text NOT NULL,
        "field_type" "field_type" NOT NULL,
        "options" text[],
        "is_required" boolean DEFAULT false,
        "is_active" boolean DEFAULT true,
        "order" integer DEFAULT 0,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "documents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "application_id" uuid,
        "type" "document_type" NOT NULL,
        "name" text NOT NULL,
        "file_name" text NOT NULL,
        "file_size" integer,
        "mime_type" text,
        "file_path" text NOT NULL,
        "description" text,
        "is_verified" boolean DEFAULT false,
        "verified_by" uuid,
        "verified_at" timestamp,
        "tags" text[],
        "metadata" jsonb,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "event_registrations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "event_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "registered_at" timestamp DEFAULT now(),
        "attended" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "title" text NOT NULL,
        "description" text,
        "event_type" text,
        "start_date" timestamp NOT NULL,
        "end_date" timestamp NOT NULL,
        "timezone" text,
        "location" text,
        "max_attendees" integer,
        "current_attendees" integer DEFAULT 0,
        "organizer_id" uuid NOT NULL,
        "tags" text[],
        "is_public" boolean DEFAULT true,
        "meeting_link" text,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "forum_comments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "post_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "parent_id" uuid,
        "content" text NOT NULL,
        "likes_count" integer DEFAULT 0,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "forum_likes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "post_id" uuid,
        "author_id" uuid NOT NULL,
        "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "forum_poll_votes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "post_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "option_id" text NOT NULL,
        "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "forum_post_limits" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "post_count" integer DEFAULT 0,
        "last_post_at" timestamp,
        "reset_date" timestamp NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "forum_post_reports" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "post_id" uuid NOT NULL,
        "reporter_user_id" uuid NOT NULL,
        "report_reason" "report_reason" NOT NULL,
        "report_details" text,
        "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "forum_posts_enhanced" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "author_id" uuid NOT NULL,
        "title" text,
        "content" text NOT NULL,
        "category" "forum_category" NOT NULL,
        "tags" text[],
        "images" text[],
        "poll_options" jsonb,
        "poll_question" text,
        "poll_ends_at" timestamp,
        "is_edited" boolean DEFAULT false,
        "edited_at" timestamp,
        "is_moderated" boolean DEFAULT false,
        "moderator_id" uuid,
        "moderated_at" timestamp,
        "likes_count" integer DEFAULT 0,
        "comments_count" integer DEFAULT 0,
        "views_count" integer DEFAULT 0,
        "report_count" integer DEFAULT 0,
        "is_hidden_by_reports" boolean DEFAULT false,
        "hidden_at" timestamp,
        "can_be_restored_until" timestamp,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "forum_saves" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "post_id" uuid NOT NULL,
        "author_id" uuid NOT NULL,
        "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ip_registration_limits" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "ip_address" text NOT NULL,
        "registration_count" integer DEFAULT 0,
        "first_registration_at" timestamp DEFAULT now(),
        "last_registration_at" timestamp DEFAULT now(),
        "blocked_until" timestamp
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "email" text NOT NULL,
        "ip_address" text NOT NULL,
        "success" boolean DEFAULT false,
        "user_agent" text,
        "attempted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "type" "notification_type" NOT NULL,
        "title" text NOT NULL,
        "message" text NOT NULL,
        "data" jsonb,
        "is_read" boolean DEFAULT false,
        "read_at" timestamp,
        "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "gateway" text NOT NULL,
        "is_active" boolean DEFAULT false,
        "configuration" jsonb,
        "updated_by" uuid NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "security_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid,
        "event_type" text NOT NULL,
        "ip_address" text,
        "user_agent" text,
        "details" jsonb,
        "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "security_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "setting_key" text NOT NULL,
        "setting_value" text NOT NULL,
        "description" text,
        "updated_by" uuid NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "security_settings_setting_key_unique" UNIQUE("setting_key")
);
--> statement-breakpoint
CREATE TABLE "staff_invitation_links" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "token" varchar(255) NOT NULL,
        "created_by" uuid NOT NULL,
        "is_active" boolean DEFAULT true,
        "used_count" integer DEFAULT 0,
        "last_used_at" timestamp,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "staff_invitation_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "phone" text,
        "date_of_birth" timestamp,
        "nationality" text,
        "current_education_level" text,
        "institution_name" text,
        "gpa" numeric(5, 2),
        "academic_scoring_type" text DEFAULT 'gpa',
        "test_scores" jsonb,
        "intended_major" text,
        "preferred_countries" text[],
        "destination_country" text,
        "intake_year" text,
        "status" "student_status" DEFAULT 'inquiry',
        "assigned_counselor_id" uuid,
        "budget_range" jsonb,
        "academic_interests" text[],
        "extracurriculars" text[],
        "work_experience" jsonb,
        "family_info" jsonb,
        "education_history" jsonb,
        "personal_details" jsonb,
        "academic_details" jsonb,
        "work_details" jsonb,
        "study_preferences" jsonb,
        "university_preferences" jsonb,
        "financial_info" jsonb,
        "visa_history" jsonb,
        "family_details" jsonb,
        "additional_info" jsonb,
        "notes" text,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "student_timeline" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "student_id" uuid NOT NULL,
        "action" text NOT NULL,
        "description" text,
        "previous_status" "student_status",
        "new_status" "student_status",
        "performed_by" uuid NOT NULL,
        "metadata" jsonb,
        "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" text NOT NULL,
        "price" numeric(10, 2) NOT NULL,
        "currency" text DEFAULT 'USD' NOT NULL,
        "description" text,
        "logo" text DEFAULT 'graduation-cap',
        "features" jsonb NOT NULL,
        "max_universities" integer NOT NULL,
        "max_countries" integer NOT NULL,
        "university_tier" "university_tier" DEFAULT 'general' NOT NULL,
        "support_type" "support_type" DEFAULT 'email' NOT NULL,
        "turnaround_days" integer NOT NULL,
        "include_loan_assistance" boolean DEFAULT false,
        "include_visa_support" boolean DEFAULT false,
        "include_counselor_session" boolean DEFAULT false,
        "include_scholarship_planning" boolean DEFAULT false,
        "include_mock_interview" boolean DEFAULT false,
        "include_expert_editing" boolean DEFAULT false,
        "include_post_admit_support" boolean DEFAULT false,
        "include_dedicated_manager" boolean DEFAULT false,
        "include_networking_events" boolean DEFAULT false,
        "include_flight_accommodation" boolean DEFAULT false,
        "is_business_focused" boolean DEFAULT false,
        "display_order" integer DEFAULT 0,
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "tier" "subscription_tier" NOT NULL,
        "is_active" boolean DEFAULT true,
        "start_date" timestamp DEFAULT now(),
        "end_date" timestamp,
        "auto_renew" boolean DEFAULT false,
        "metadata" jsonb,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "name" text NOT NULL,
        "destination_country" text NOT NULL,
        "intake" text NOT NULL,
        "photo" text,
        "counselor_name" text NOT NULL,
        "feedback" text NOT NULL,
        "is_approved" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "universities" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" text NOT NULL,
        "country" text NOT NULL,
        "city" text NOT NULL,
        "website" text,
        "world_ranking" integer,
        "degree_levels" text[],
        "specialization" text,
        "offer_letter_fee" numeric(10, 2),
        "annual_fee" numeric(10, 2),
        "admission_requirements" jsonb,
        "alumni1" text,
        "alumni2" text,
        "alumni3" text,
        "logo" text,
        "description" text,
        "ranking" jsonb,
        "tuition_fees" jsonb,
        "acceptance_rate" numeric(5, 2),
        "student_population" integer,
        "international_students" integer,
        "campus_size" text,
        "established_year" integer,
        "type" text,
        "tags" text[],
        "images" text[],
        "tier" "university_tier" DEFAULT 'general',
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "plan_id" uuid NOT NULL,
        "status" "subscription_status" DEFAULT 'pending' NOT NULL,
        "started_at" timestamp,
        "expires_at" timestamp,
        "payment_reference" text,
        "payment_gateway" text,
        "auto_renew" boolean DEFAULT true,
        "universities_used" integer DEFAULT 0,
        "countries_used" integer DEFAULT 0,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "email" text NOT NULL,
        "password" text,
        "temporary_password" text,
        "user_type" "user_type" DEFAULT 'customer' NOT NULL,
        "team_role" "team_role",
        "first_name" text,
        "last_name" text,
        "company_name" text,
        "profile_picture" text,
        "account_status" "account_status" DEFAULT 'pending_approval',
        "verification_token" text,
        "verification_token_expires" timestamp,
        "last_login_at" timestamp,
        "cooling_period_bypassed_at" timestamp,
        "cooling_period_bypassed_by" uuid,
        "failed_login_attempts" integer DEFAULT 0,
        "account_locked_at" timestamp,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ai_matching_results" ADD CONSTRAINT "ai_matching_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_matching_results" ADD CONSTRAINT "ai_matching_results_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_assigned_counselor_id_users_id_fk" FOREIGN KEY ("assigned_counselor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_counselor_id_users_id_fk" FOREIGN KEY ("counselor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_field_id_custom_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."custom_fields"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_comments" ADD CONSTRAINT "forum_comments_post_id_forum_posts_enhanced_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts_enhanced"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_comments" ADD CONSTRAINT "forum_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_likes" ADD CONSTRAINT "forum_likes_post_id_forum_posts_enhanced_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts_enhanced"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_likes" ADD CONSTRAINT "forum_likes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_poll_votes" ADD CONSTRAINT "forum_poll_votes_post_id_forum_posts_enhanced_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts_enhanced"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_poll_votes" ADD CONSTRAINT "forum_poll_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_post_limits" ADD CONSTRAINT "forum_post_limits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_post_reports" ADD CONSTRAINT "forum_post_reports_post_id_forum_posts_enhanced_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts_enhanced"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_post_reports" ADD CONSTRAINT "forum_post_reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_posts_enhanced" ADD CONSTRAINT "forum_posts_enhanced_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_posts_enhanced" ADD CONSTRAINT "forum_posts_enhanced_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_saves" ADD CONSTRAINT "forum_saves_post_id_forum_posts_enhanced_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."forum_posts_enhanced"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_saves" ADD CONSTRAINT "forum_saves_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_settings" ADD CONSTRAINT "payment_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_settings" ADD CONSTRAINT "security_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_invitation_links" ADD CONSTRAINT "staff_invitation_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_assigned_counselor_id_users_id_fk" FOREIGN KEY ("assigned_counselor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_timeline" ADD CONSTRAINT "student_timeline_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_timeline" ADD CONSTRAINT "student_timeline_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_cooling_period_bypassed_by_users_id_fk" FOREIGN KEY ("cooling_period_bypassed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;