CREATE TYPE "public"."ai_tier" AS ENUM('none', 'basic', 'pro', 'ultra');--> statement-breakpoint
CREATE TYPE "public"."prep_tier" AS ENUM('none', 'basic', 'pro', 'ultra');--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "include_course_country_selection" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "include_university_shortlisting" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "include_one_on_one_editing" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "include_profile_building" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "include_top50_counselling" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "support_types" text[] DEFAULT ARRAY['email']::text[];--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "phozos_ai_tier" "ai_tier" DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "include_forex_services" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "include_pre_departure_session" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "phozos_prep_tier" "prep_tier" DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "phozos_prep_description" text;--> statement-breakpoint

-- Migrate existing supportType enum to supportTypes array
UPDATE subscription_plans 
SET support_types = ARRAY[support_type::TEXT]::TEXT[]
WHERE support_type IS NOT NULL;--> statement-breakpoint

-- Add constraint to prevent empty supportTypes array
ALTER TABLE "subscription_plans" ADD CONSTRAINT "support_types_not_empty" CHECK (array_length(support_types, 1) > 0);--> statement-breakpoint

-- Mark old supportType column for deprecation (keep for rollback safety)
COMMENT ON COLUMN subscription_plans.support_type IS 'DEPRECATED: Use support_types array instead. Will be removed in future migration.';