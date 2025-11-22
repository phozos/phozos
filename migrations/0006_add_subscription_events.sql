-- Migration: Add subscription_events table for audit trail
-- Purpose: Track all subscription lifecycle events for debugging and compliance
-- Phase 2 - Task 2.2: Implement Subscription Event Audit Trail

-- Create subscription_events table
CREATE TABLE "subscription_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "subscription_id" uuid NOT NULL REFERENCES "user_subscriptions"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "event_type" text NOT NULL,
  "old_status" text,
  "new_status" text,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT NOW() NOT NULL
);

-- Create index on subscription_id for efficient event queries
CREATE INDEX "idx_subscription_events_subscription_id" ON "subscription_events" ("subscription_id");

-- Create index on user_id for user event history
CREATE INDEX "idx_subscription_events_user_id" ON "subscription_events" ("user_id");

-- Create index on event_type for filtering by event type
CREATE INDEX "idx_subscription_events_event_type" ON "subscription_events" ("event_type");

-- Create index on created_at for chronological queries
CREATE INDEX "idx_subscription_events_created_at" ON "subscription_events" ("created_at" DESC);

-- Add comment explaining the table
COMMENT ON TABLE "subscription_events" IS 'Audit trail for all subscription lifecycle events (creation, upgrade, cancellation, etc.)';
COMMENT ON COLUMN "subscription_events"."event_type" IS 'Type of event: subscription_created, subscription_upgraded, payment_verified, payment_failed, subscription_cancelled, etc.';
COMMENT ON COLUMN "subscription_events"."metadata" IS 'Additional event context: plan details, payment info, error details, etc.';
