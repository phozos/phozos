-- Phase 3.3: Feature Usage Analytics - Feature Usage Tracking Tables
-- Migration 0019: Create feature_usage_events and feature_usage_summary tables

-- Create feature_usage_events table for tracking individual feature usage events
CREATE TABLE IF NOT EXISTS "feature_usage_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "subscription_id" UUID NOT NULL REFERENCES "user_subscriptions"("id") ON DELETE CASCADE,
  "feature_name" VARCHAR(100) NOT NULL,
  "usage_type" VARCHAR(50) NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create feature_usage_summary table for aggregated analytics
CREATE TABLE IF NOT EXISTS "feature_usage_summary" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "plan_id" UUID NOT NULL REFERENCES "subscription_plans"("id") ON DELETE CASCADE,
  "feature_name" VARCHAR(100) NOT NULL,
  "total_users" INTEGER DEFAULT 0,
  "active_users" INTEGER DEFAULT 0,
  "usage_count" INTEGER DEFAULT 0,
  "adoption_rate" DECIMAL(5, 2),
  "period_start" TIMESTAMP NOT NULL,
  "period_end" TIMESTAMP NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Performance indexes for feature_usage_events
CREATE INDEX IF NOT EXISTS "idx_feature_usage_events_user_id" ON "feature_usage_events"("user_id");
CREATE INDEX IF NOT EXISTS "idx_feature_usage_events_subscription_id" ON "feature_usage_events"("subscription_id");
CREATE INDEX IF NOT EXISTS "idx_feature_usage_events_feature_name" ON "feature_usage_events"("feature_name");
CREATE INDEX IF NOT EXISTS "idx_feature_usage_events_created_at" ON "feature_usage_events"("created_at");

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS "idx_feature_usage_events_feature_created" ON "feature_usage_events"("feature_name", "created_at");
CREATE INDEX IF NOT EXISTS "idx_feature_usage_events_user_feature" ON "feature_usage_events"("user_id", "feature_name");

-- Performance indexes for feature_usage_summary
CREATE INDEX IF NOT EXISTS "idx_feature_usage_summary_plan_id" ON "feature_usage_summary"("plan_id");
CREATE INDEX IF NOT EXISTS "idx_feature_usage_summary_feature_name" ON "feature_usage_summary"("feature_name");
CREATE INDEX IF NOT EXISTS "idx_feature_usage_summary_period" ON "feature_usage_summary"("period_start", "period_end");

-- Composite index for analytics queries
CREATE INDEX IF NOT EXISTS "idx_feature_usage_summary_plan_feature" ON "feature_usage_summary"("plan_id", "feature_name");

-- Comments for documentation
COMMENT ON TABLE "feature_usage_events" IS 'Tracks individual feature usage events for analytics and adoption tracking';
COMMENT ON COLUMN "feature_usage_events"."feature_name" IS 'Name of the feature being tracked (e.g., includeExpertEditing, includeCounselorSession)';
COMMENT ON COLUMN "feature_usage_events"."usage_type" IS 'Type of usage: accessed, completed, attempted';
COMMENT ON COLUMN "feature_usage_events"."metadata" IS 'Additional context about the usage event (JSON)';

COMMENT ON TABLE "feature_usage_summary" IS 'Aggregated feature usage statistics for analytics dashboards';
COMMENT ON COLUMN "feature_usage_summary"."total_users" IS 'Total number of users who have access to this feature';
COMMENT ON COLUMN "feature_usage_summary"."active_users" IS 'Number of users who actively used this feature in the period';
COMMENT ON COLUMN "feature_usage_summary"."adoption_rate" IS 'Percentage of users who actively use this feature';
COMMENT ON COLUMN "feature_usage_summary"."period_start" IS 'Start of the analytics period';
COMMENT ON COLUMN "feature_usage_summary"."period_end" IS 'End of the analytics period';
