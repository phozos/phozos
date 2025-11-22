-- Migration: Add Plan Versioning Support
-- Phase 1: Plan Versioning Foundation
-- This migration adds versioning capabilities to subscription_plans table

-- Step 1: Add new columns (nullable initially for backfill)
ALTER TABLE subscription_plans
  ADD COLUMN base_plan_id UUID,
  ADD COLUMN version INTEGER DEFAULT 1,
  ADD COLUMN version_name VARCHAR(50),
  ADD COLUMN is_latest_version BOOLEAN DEFAULT true,
  ADD COLUMN deprecated_at TIMESTAMP,
  ADD COLUMN archived_at TIMESTAMP,
  ADD COLUMN successor_plan_id UUID;

-- Step 2: Create self-referencing foreign keys
ALTER TABLE subscription_plans
  ADD CONSTRAINT fk_base_plan 
    FOREIGN KEY (base_plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_successor_plan 
    FOREIGN KEY (successor_plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL;

-- Step 3: Backfill existing plans (make them their own base)
UPDATE subscription_plans
SET base_plan_id = id,
    version = 1,
    version_name = 'v1 (Legacy)',
    is_latest_version = true
WHERE base_plan_id IS NULL;

-- Step 4: Make base_plan_id NOT NULL (after backfill)
ALTER TABLE subscription_plans
  ALTER COLUMN base_plan_id SET NOT NULL;

-- Step 5: Drop UNIQUE constraint on tier_level (allow same tier across versions)
ALTER TABLE subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_tier_level_key;

-- Step 6: Create composite UNIQUE constraint
ALTER TABLE subscription_plans
  ADD CONSTRAINT unique_plan_version 
    UNIQUE (base_plan_id, version);

-- Step 7: Create indexes for performance
CREATE INDEX idx_plans_base_plan_id ON subscription_plans(base_plan_id);
CREATE INDEX idx_plans_version ON subscription_plans(base_plan_id, version DESC);
CREATE INDEX idx_plans_latest_version ON subscription_plans(base_plan_id) 
  WHERE is_latest_version = true;
CREATE INDEX idx_plans_deprecated ON subscription_plans(deprecated_at) 
  WHERE deprecated_at IS NOT NULL;

-- Step 8: Add CHECK constraint
ALTER TABLE subscription_plans
  ADD CONSTRAINT check_version_positive CHECK (version > 0);

-- Step 9: Add comments for documentation
COMMENT ON COLUMN subscription_plans.base_plan_id IS 'Groups all versions of the same plan family';
COMMENT ON COLUMN subscription_plans.version IS 'Incrementing version number (1, 2, 3...)';
COMMENT ON COLUMN subscription_plans.version_name IS 'Human-readable version name (e.g., v1 (Legacy), v2)';
COMMENT ON COLUMN subscription_plans.is_latest_version IS 'Only one version per base_plan_id should have this true';
COMMENT ON COLUMN subscription_plans.deprecated_at IS 'When plan stopped accepting new subscriptions';
COMMENT ON COLUMN subscription_plans.archived_at IS 'When plan was archived (no active subscribers)';
COMMENT ON COLUMN subscription_plans.successor_plan_id IS 'Recommended upgrade path for this version';
