-- Migration: Map premium badge keys to simple icon keys
-- Created: 2025-11-11
-- Purpose: Prepare for removal of PremiumBadges.tsx component
-- Status: READY TO EXECUTE (when database is provisioned)
-- 
-- This migration translates ornate premium badge keys to equivalent simple icon keys
-- before removing the PremiumBadges.tsx component in the frontend.
--
-- IMPORTANT: Execute this migration BEFORE deploying frontend changes that remove PremiumBadges.tsx
-- 
-- Badge to Icon Mapping:
--   platinum   -> diamond  (premium/luxury association)
--   gold       -> crown    (royal/premium association)
--   brilliance -> gem      (sparkle/value association)
--   majesty    -> crown    (royal theme)
--   fortress   -> shield   (protection theme)
--   voltage    -> zap      (electric/energy theme)
--   prismatic  -> gem      (precious/valuable theme)
--   apex       -> target   (precision/achievement theme)

-- Check current state before migration
DO $$
DECLARE
  badge_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO badge_count
  FROM subscription_plans
  WHERE logo IN ('platinum', 'gold', 'brilliance', 'majesty', 'fortress', 'voltage', 'prismatic', 'apex');
  
  RAISE NOTICE 'Found % subscription plans with premium badge keys', badge_count;
END $$;

-- Execute the mapping
BEGIN;

UPDATE subscription_plans 
SET 
  logo = CASE 
    WHEN logo = 'platinum' THEN 'diamond'
    WHEN logo = 'gold' THEN 'crown'
    WHEN logo = 'brilliance' THEN 'gem'
    WHEN logo = 'majesty' THEN 'crown'
    WHEN logo = 'fortress' THEN 'shield'
    WHEN logo = 'voltage' THEN 'zap'
    WHEN logo = 'prismatic' THEN 'gem'
    WHEN logo = 'apex' THEN 'target'
    ELSE logo
  END,
  updated_at = NOW()
WHERE logo IN ('platinum', 'gold', 'brilliance', 'majesty', 'fortress', 'voltage', 'prismatic', 'apex');

-- Log the migration result
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RAISE NOTICE 'Successfully migrated % subscription plans from badge keys to icon keys', affected_count;
END $$;

COMMIT;

-- Verification: Check that no premium badge keys remain
DO $$
DECLARE
  remaining_badges INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_badges
  FROM subscription_plans
  WHERE logo IN ('platinum', 'gold', 'brilliance', 'majesty', 'fortress', 'voltage', 'prismatic', 'apex');
  
  IF remaining_badges > 0 THEN
    RAISE WARNING 'Migration incomplete: % plans still have badge keys', remaining_badges;
  ELSE
    RAISE NOTICE 'Migration successful: All badge keys have been mapped to icon keys';
  END IF;
END $$;

-- Display final logo distribution
SELECT 
  logo,
  COUNT(*) as plan_count
FROM subscription_plans
GROUP BY logo
ORDER BY logo;
