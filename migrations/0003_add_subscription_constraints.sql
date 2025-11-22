-- Migration: Add order_id and unique constraint to prevent duplicate active subscriptions
-- Purpose: Implement idempotency and prevent users from purchasing the same plan multiple times

-- Add order_id column to track Razorpay order for idempotency
ALTER TABLE "user_subscriptions" ADD COLUMN "order_id" text;--> statement-breakpoint

-- Create partial unique index: Only one active subscription per user
-- This prevents users from having multiple active subscriptions simultaneously
CREATE UNIQUE INDEX "idx_user_active_subscription" ON "user_subscriptions" ("user_id") WHERE status = 'active';--> statement-breakpoint

-- Create index on (user_id, status) for efficient queries
CREATE INDEX "idx_user_subscriptions_user_status" ON "user_subscriptions" ("user_id", "status");--> statement-breakpoint

-- Create index on order_id for idempotency lookups
CREATE INDEX "idx_user_subscriptions_order_id" ON "user_subscriptions" ("order_id") WHERE order_id IS NOT NULL;--> statement-breakpoint

-- Data cleanup: Mark duplicate active subscriptions as 'cancelled' (keep the most recent one)
-- This ensures the unique constraint can be applied to existing data
WITH ranked_subscriptions AS (
  SELECT 
    id,
    user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id, status ORDER BY started_at DESC NULLS LAST, created_at DESC) as rn
  FROM user_subscriptions
  WHERE status = 'active'
)
UPDATE user_subscriptions
SET status = 'cancelled', expires_at = NOW()
FROM ranked_subscriptions
WHERE user_subscriptions.id = ranked_subscriptions.id
  AND ranked_subscriptions.rn > 1
  AND status = 'active';
