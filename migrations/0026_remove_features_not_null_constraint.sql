-- Migration: Remove NOT NULL constraint from subscription_plans.features
-- Date: 2025-11-11
-- Reason: Deprecating features field, making it optional before removal
-- Risk: LOW - backend already handles NULL values (Phase 2)

BEGIN;

-- Step 1: Remove NOT NULL constraint from features column
ALTER TABLE subscription_plans 
  ALTER COLUMN features DROP NOT NULL;

-- Step 2: Verify constraint removed
-- Query to confirm: \d subscription_plans should show features as nullable

-- Step 3: Add comment documenting the change
COMMENT ON COLUMN subscription_plans.features IS 
  'DEPRECATED: Features list for plan comparison. Will be removed in future version. Use feature flags instead.';

-- Step 4: No data migration needed - existing data remains unchanged

COMMIT;
