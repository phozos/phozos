-- Migration: Add indexes for common query patterns

-- Index 1: Find all versions of a plan (admin UI)
CREATE INDEX IF NOT EXISTS idx_plans_base_plan_version 
  ON subscription_plans(base_plan_id, version DESC);

-- Index 2: Find latest versions for public display
CREATE INDEX IF NOT EXISTS idx_plans_latest_active 
  ON subscription_plans(is_latest_version, is_active) 
  WHERE is_latest_version = true AND is_active = true;

-- Index 3: Find plans by tier level (for upgrade logic)
CREATE INDEX IF NOT EXISTS idx_plans_tier_level 
  ON subscription_plans(tier_level, is_latest_version);

-- Index 4: Find deprecated plans needing migration
CREATE INDEX IF NOT EXISTS idx_plans_deprecated 
  ON subscription_plans(deprecated_at, base_plan_id) 
  WHERE deprecated_at IS NOT NULL AND archived_at IS NULL;

-- Index 5: Audit trail by plan and date
CREATE INDEX IF NOT EXISTS idx_plan_changes_plan_date 
  ON subscription_plan_changes(plan_id, created_at DESC);

-- Analyze tables for query planner
ANALYZE subscription_plans;
ANALYZE subscription_plan_changes;
