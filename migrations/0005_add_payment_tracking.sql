-- Migration: Add payment amount tracking to user_subscriptions
-- Purpose: Track exact amount paid, currency, and payment timestamp for proper proration calculations
-- Phase 2 - Task 2.1: Add Payment Amount Tracking

-- Add payment tracking columns
ALTER TABLE user_subscriptions 
  ADD COLUMN amount_paid DECIMAL(10, 2),
  ADD COLUMN currency VARCHAR(3) DEFAULT 'INR',
  ADD COLUMN paid_at TIMESTAMP;

-- Backfill existing subscriptions with plan prices
UPDATE user_subscriptions us
SET amount_paid = sp.price::DECIMAL(10, 2),
    currency = COALESCE(sp.currency, 'INR'),
    paid_at = us.created_at
FROM subscription_plans sp
WHERE us.plan_id = sp.id
  AND us.amount_paid IS NULL;

-- Make amount_paid required for new subscriptions
ALTER TABLE user_subscriptions 
  ALTER COLUMN amount_paid SET NOT NULL;

-- Create index on paid_at for reporting queries
CREATE INDEX "idx_user_subscriptions_paid_at" ON "user_subscriptions" ("paid_at");

-- Add comment explaining the columns
COMMENT ON COLUMN user_subscriptions.amount_paid IS 'Actual amount paid by user in the specified currency';
COMMENT ON COLUMN user_subscriptions.currency IS 'Currency code (ISO 4217) - default INR';
COMMENT ON COLUMN user_subscriptions.paid_at IS 'Timestamp when payment was completed';
