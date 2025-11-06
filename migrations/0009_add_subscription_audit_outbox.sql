-- Migration: Add subscription_audit_outbox table for event outbox pattern
-- Purpose: Implement reliable event processing with outbox pattern for subscription audit events
-- Phase 1: Schema and Infrastructure Setup

-- Create subscription_audit_outbox table
CREATE TABLE "subscription_audit_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "subscription_id" uuid NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "event_type" varchar(100) NOT NULL,
  "old_status" varchar(50),
  "new_status" varchar(50),
  "metadata" jsonb,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "retries" integer DEFAULT 0 NOT NULL,
  "next_retry_at" timestamp,
  "error_message" text,
  "created_at" timestamp DEFAULT NOW() NOT NULL,
  "processed_at" timestamp
);

-- Create composite index for status and created_at (for processing queue)
CREATE INDEX "idx_outbox_status_created" ON "subscription_audit_outbox" ("status", "created_at");

-- Create partial index for pending retries (WHERE clause for efficiency)
CREATE INDEX "idx_outbox_next_retry" ON "subscription_audit_outbox" ("next_retry_at") WHERE "status" = 'pending';

-- Create index on subscription_id for subscription event queries
CREATE INDEX "idx_outbox_subscription" ON "subscription_audit_outbox" ("subscription_id");

-- Add comments explaining the table and columns
COMMENT ON TABLE "subscription_audit_outbox" IS 'Event outbox for reliable processing of subscription audit events';
COMMENT ON COLUMN "subscription_audit_outbox"."status" IS 'Processing status: pending, processing, completed, failed';
COMMENT ON COLUMN "subscription_audit_outbox"."retries" IS 'Number of retry attempts for failed events';
COMMENT ON COLUMN "subscription_audit_outbox"."next_retry_at" IS 'Timestamp for next retry attempt (exponential backoff)';
COMMENT ON COLUMN "subscription_audit_outbox"."metadata" IS 'Additional event context: plan details, payment info, error details, etc.';
