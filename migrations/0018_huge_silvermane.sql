CREATE TYPE "public"."deprecation_phase" AS ENUM('announcement', 'grace_period', 'soft_disable', 'hard_removal');--> statement-breakpoint
CREATE TYPE "public"."deprecation_status" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "feature_deprecation_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_name" varchar(100) NOT NULL,
	"plan_ids" text[] NOT NULL,
	"current_phase" "deprecation_phase" DEFAULT 'announcement' NOT NULL,
	"status" "deprecation_status" DEFAULT 'scheduled' NOT NULL,
	"announcement_date" timestamp NOT NULL,
	"grace_period_start_date" timestamp NOT NULL,
	"soft_disable_date" timestamp NOT NULL,
	"hard_removal_date" timestamp NOT NULL,
	"reason" text NOT NULL,
	"replacement_feature" varchar(100),
	"migration_guide_url" text,
	"affected_user_count" integer DEFAULT 0,
	"notifications_sent" integer DEFAULT 0,
	"users_acknowledged" integer DEFAULT 0,
	"users_migrated" integer DEFAULT 0,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"cancellation_reason" text
);
--> statement-breakpoint
ALTER TABLE "feature_deprecation_schedules" ADD CONSTRAINT "feature_deprecation_schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;