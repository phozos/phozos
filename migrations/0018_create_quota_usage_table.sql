-- Phase 3.2: Quota Management System - Quota Usage Tracking Table
-- Migration 0018: Create quota_usage table with performance indexes

-- Create quota_usage table
CREATE TABLE IF NOT EXISTS "quota_usage" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "subscription_id" UUID NOT NULL REFERENCES "user_subscriptions"("id") ON DELETE CASCADE,
  "quota_type" VARCHAR(50) NOT NULL,
  "used_count" INTEGER NOT NULL DEFAULT 0,
  "allocated_count" INTEGER NOT NULL,
  "last_used_at" TIMESTAMP,
  "reset_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Performance indexes for fast lookups
CREATE INDEX IF NOT EXISTS "idx_quota_usage_user_id" ON "quota_usage"("user_id");
CREATE INDEX IF NOT EXISTS "idx_quota_usage_subscription_id" ON "quota_usage"("subscription_id");
CREATE INDEX IF NOT EXISTS "idx_quota_usage_quota_type" ON "quota_usage"("quota_type");

-- Composite index for the most common query pattern (user + quota type)
CREATE UNIQUE INDEX IF NOT EXISTS "idx_quota_usage_user_quota_type" ON "quota_usage"("user_id", "quota_type");

-- Comment on table
COMMENT ON TABLE "quota_usage" IS 'Tracks quota usage for subscription features (universities, countries, etc.)';
COMMENT ON COLUMN "quota_usage"."quota_type" IS 'Type of quota: universities, countries';
COMMENT ON COLUMN "quota_usage"."used_count" IS 'Current number of quota units consumed';
COMMENT ON COLUMN "quota_usage"."allocated_count" IS 'Total quota allocated from plan snapshot or current plan';
COMMENT ON COLUMN "quota_usage"."last_used_at" IS 'Timestamp of last quota consumption';
COMMENT ON COLUMN "quota_usage"."reset_at" IS 'When quota should reset (for future monthly quotas)';
