-- Migration: Add Grandfathering Support to User Subscriptions
-- Phase 2: Grandfathering Implementation
-- This migration enables automatic price and terms preservation for existing subscribers

-- Step 1: Add grandfathering columns to user_subscriptions table
ALTER TABLE user_subscriptions
  ADD COLUMN subscribed_plan_snapshot JSONB,
  ADD COLUMN grandfathered_price DECIMAL(10,2),
  ADD COLUMN grandfathered_until TIMESTAMP,
  ADD COLUMN is_grandfathered BOOLEAN DEFAULT false;

-- Step 2: Backfill snapshot for existing active subscriptions
UPDATE user_subscriptions us
SET subscribed_plan_snapshot = (
  SELECT to_jsonb(sp.*)
  FROM subscription_plans sp
  WHERE sp.id = us.plan_id
),
grandfathered_price = COALESCE(us.amount_paid, (
  SELECT sp.price
  FROM subscription_plans sp
  WHERE sp.id = us.plan_id
)),
is_grandfathered = true
WHERE us.status = 'active';

-- Step 3: Create index for grandfathered subscriptions
CREATE INDEX idx_user_subscriptions_grandfathered ON user_subscriptions(user_id) 
  WHERE is_grandfathered = true;

-- Step 4: Add column comments for documentation
COMMENT ON COLUMN user_subscriptions.subscribed_plan_snapshot IS 'Immutable snapshot of plan terms at subscription time';
COMMENT ON COLUMN user_subscriptions.grandfathered_price IS 'Locked price for this subscriber, immune to plan changes';
COMMENT ON COLUMN user_subscriptions.grandfathered_until IS 'Optional expiration of grandfather clause (null = forever)';
COMMENT ON COLUMN user_subscriptions.is_grandfathered IS 'Whether this subscription has grandfathered pricing and terms';
