-- Migration: Add failed_payments table for tracking payment failures
-- Purpose: Track and analyze failed payment attempts for debugging and user support
-- Phase 2 - Task 2.4: Failed Payment Tracking

-- Create failed_payments table
CREATE TABLE "failed_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "plan_id" uuid REFERENCES "subscription_plans"("id") ON DELETE SET NULL,
  "order_id" text,
  "payment_id" text,
  "amount" DECIMAL(10, 2),
  "currency" VARCHAR(3) DEFAULT 'INR',
  "failure_reason" text,
  "razorpay_error_code" text,
  "razorpay_error_description" text,
  "failed_at" timestamp NOT NULL DEFAULT NOW(),
  "notified_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT NOW()
);

-- Create index on user_id for user's failed payment history
CREATE INDEX "idx_failed_payments_user_id" ON "failed_payments" ("user_id");

-- Create index on plan_id for plan-specific failure analysis
CREATE INDEX "idx_failed_payments_plan_id" ON "failed_payments" ("plan_id");

-- Create index on failed_at for chronological queries
CREATE INDEX "idx_failed_payments_failed_at" ON "failed_payments" ("failed_at" DESC);

-- Create index on order_id for quick lookups
CREATE INDEX "idx_failed_payments_order_id" ON "failed_payments" ("order_id") WHERE order_id IS NOT NULL;

-- Add comments explaining the table
COMMENT ON TABLE "failed_payments" IS 'Tracks all failed payment attempts for debugging, analytics, and user support';
COMMENT ON COLUMN "failed_payments"."failure_reason" IS 'High-level reason for failure: payment_failed, payment_not_captured, signature_invalid, etc.';
COMMENT ON COLUMN "failed_payments"."razorpay_error_code" IS 'Razorpay-specific error code from payment gateway';
COMMENT ON COLUMN "failed_payments"."razorpay_error_description" IS 'Detailed error description from Razorpay';
COMMENT ON COLUMN "failed_payments"."notified_at" IS 'Timestamp when user was notified about the failure';
