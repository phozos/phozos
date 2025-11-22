-- Migration: Create Payments Table for Payment Ledger
-- Purpose: Implement dedicated payments table to track all payment transactions
-- Date: November 09, 2025
-- Resolves: Revenue tracking issue where upgrade payments are lost

-- ============================================================================
-- Step 1: Create payment_type enum
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE payment_type AS ENUM ('new_subscription', 'upgrade', 'renewal');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- Step 2: Create payments table
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  payment_type payment_type NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  order_id TEXT NOT NULL,
  payment_reference TEXT NOT NULL,
  payment_gateway TEXT NOT NULL,
  paid_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Step 3: Create indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_plan_id ON payments(plan_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_reference ON payments(payment_reference);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- ============================================================================
-- Step 4: Create composite index for common queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_payments_user_paid_at ON payments(user_id, paid_at DESC);

-- ============================================================================
-- Step 5: Add unique constraints for payment references
-- ============================================================================
-- Note: Commenting out unique constraints for now as we need to ensure
-- idempotency in the backfill process first. Will add in a follow-up migration.
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_order_id_unique ON payments(order_id);
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_payment_reference_unique ON payments(payment_reference);

-- ============================================================================
-- Step 6: Add comments for documentation
-- ============================================================================
COMMENT ON TABLE payments IS 'Complete payment transaction ledger for all subscription payments (new subscriptions, upgrades, renewals)';
COMMENT ON COLUMN payments.payment_type IS 'Type of payment: new_subscription, upgrade, or renewal';
COMMENT ON COLUMN payments.amount IS 'Actual amount paid in the currency (e.g., rupees for INR, dollars for USD)';
COMMENT ON COLUMN payments.order_id IS 'Payment gateway order ID (e.g., Razorpay order ID)';
COMMENT ON COLUMN payments.payment_reference IS 'Payment gateway payment/transaction ID (e.g., Razorpay payment ID)';
COMMENT ON COLUMN payments.paid_at IS 'Timestamp when the payment was completed';
