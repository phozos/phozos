-- Migration: Backfill base_plan_id for existing plans
-- This ensures all plans are self-referencing (version 1 behavior)

-- Step 1: Find orphaned plans (basePlanId = NULL)
SELECT id, name, base_plan_id, version 
FROM subscription_plans 
WHERE base_plan_id IS NULL;

-- Step 2: Backfill with self-reference
UPDATE subscription_plans
SET 
  base_plan_id = id,
  version = COALESCE(version, 1),
  version_name = COALESCE(version_name, 'v1 (Legacy)'),
  is_latest_version = COALESCE(is_latest_version, true)
WHERE base_plan_id IS NULL;

-- Step 3: Verify no NULLs remain
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count 
  FROM subscription_plans 
  WHERE base_plan_id IS NULL;
  
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Backfill failed: % plans still have NULL base_plan_id', null_count;
  END IF;
  
  RAISE NOTICE 'Backfill successful: All plans have base_plan_id';
END $$;

-- Step 4: Add NOT NULL constraint (safe now)
ALTER TABLE subscription_plans
  ALTER COLUMN base_plan_id SET NOT NULL;

-- Step 5: Add comments
COMMENT ON COLUMN subscription_plans.base_plan_id IS 'Self-referencing FK for version 1, references parent for versions > 1. NEVER NULL after backfill.';
