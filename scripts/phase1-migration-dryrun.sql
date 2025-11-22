-- DRY RUN SCRIPT: Phase 1 Migration Validation
-- Run this to verify migration safety BEFORE applying

BEGIN;  -- Start transaction (will rollback at end)

-- Test 1: Check for NULL base_plan_id
SELECT 
  'FAIL' as status,
  'NULL base_plan_id found' as issue,
  id, name, base_plan_id
FROM subscription_plans
WHERE base_plan_id IS NULL
LIMIT 5;

-- Test 2: Check for duplicate latest versions
SELECT 
  'FAIL' as status,
  'Multiple latest versions for same base plan' as issue,
  base_plan_id,
  COUNT(*) as latest_count
FROM subscription_plans
WHERE is_latest_version = true
GROUP BY base_plan_id
HAVING COUNT(*) > 1;

-- Test 3: Check for version = 0 or negative
SELECT 
  'FAIL' as status,
  'Invalid version number' as issue,
  id, name, version
FROM subscription_plans
WHERE version <= 0;

-- Test 4: Check for active subscriptions referencing NULL basePlanId plans
SELECT 
  'FAIL' as status,
  'Active subscriptions on broken plans' as issue,
  us.id as subscription_id,
  sp.id as plan_id,
  sp.base_plan_id
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE sp.base_plan_id IS NULL
  AND us.status = 'active'
LIMIT 5;

-- Test 5: Check index creation impact
EXPLAIN ANALYZE
SELECT * FROM subscription_plans
WHERE base_plan_id = 'test-uuid'
  AND is_latest_version = true;

ROLLBACK;  -- Don't commit - this is just a dry run
