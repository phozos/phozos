-- Migration: Add webhook_events table for deduplication
-- Purpose: Prevent duplicate webhook processing from Razorpay retries

-- Create webhook_events table
CREATE TABLE "webhook_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" text NOT NULL UNIQUE,
  "event_type" text NOT NULL,
  "payload" jsonb,
  "status" text DEFAULT 'processing' NOT NULL,
  "error_message" text,
  "processed_at" timestamp,
  "created_at" timestamp DEFAULT NOW() NOT NULL
);--> statement-breakpoint

-- Create index on event_id for fast lookup (deduplication check)
CREATE UNIQUE INDEX "idx_webhook_events_event_id" ON "webhook_events" ("event_id");--> statement-breakpoint

-- Create index on created_at for cleanup queries (e.g., deleting old events)
CREATE INDEX "idx_webhook_events_created_at" ON "webhook_events" ("created_at");--> statement-breakpoint

-- Create index on status for filtering
CREATE INDEX "idx_webhook_events_status" ON "webhook_events" ("status");--> statement-breakpoint

-- Add comment explaining the table
COMMENT ON TABLE "webhook_events" IS 'Tracks all webhook events from Razorpay to prevent duplicate processing';
