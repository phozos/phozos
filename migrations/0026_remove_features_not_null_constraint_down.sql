-- Rollback Migration: Re-add NOT NULL constraint to subscription_plans.features
-- WARNING: This will fail if any NULL features exist in the table
-- Date: 2025-11-11

BEGIN;

-- Step 1: Verify no NULL features exist (prerequisite)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM subscription_plans WHERE features IS NULL) THEN
    RAISE EXCEPTION 'Cannot restore NOT NULL constraint: NULL features exist. Clean up data first.';
  END IF;
END $$;

-- Step 2: Re-add NOT NULL constraint
ALTER TABLE subscription_plans 
  ALTER COLUMN features SET NOT NULL;

-- Step 3: Remove deprecation comment
COMMENT ON COLUMN subscription_plans.features IS NULL;

COMMIT;
