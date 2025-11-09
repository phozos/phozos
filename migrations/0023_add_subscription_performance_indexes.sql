-- Migration: Add performance indexes for subscription queries
-- As specified in REMEDIATION_PLAN.md Phase 3 P2.1

-- Index for finding subscriptions by plan (used in grandfathering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_subscriptions_plan_status 
ON user_subscriptions(plan_id, status)
WHERE status = 'active';

-- Index for finding active subscriptions by user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_subscriptions_user_status 
ON user_subscriptions(user_id, status)
WHERE status = 'active';

-- Composite index for version queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_plans_base_version 
ON subscription_plans(base_plan_id, version DESC)
WHERE base_plan_id IS NOT NULL;

-- Index for audit history queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_plan_changes_plan_created 
ON subscription_plan_changes(plan_id, created_at DESC);

-- Index for finding latest version
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_plans_latest 
ON subscription_plans(base_plan_id, is_latest_version)
WHERE is_latest_version = true;

-- Index for proration calculations (amountPaid lookup)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_subscriptions_amount 
ON user_subscriptions(user_id, amount_paid)
WHERE status = 'active';

-- Analyze tables for query planner
ANALYZE user_subscriptions;
ANALYZE subscription_plans;
ANALYZE subscription_plan_changes;
