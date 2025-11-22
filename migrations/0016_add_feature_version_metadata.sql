-- Migration: Add Feature Version Metadata
-- Phase 2.1: Feature Versioning Workflow
-- This migration adds feature_version_metadata JSONB column to track feature changes across versions

-- Step 1: Add feature_version_metadata column to subscription_plans
ALTER TABLE subscription_plans
  ADD COLUMN feature_version_metadata JSONB;

-- Step 2: Add index for querying feature version metadata
CREATE INDEX idx_plans_feature_version_metadata ON subscription_plans
  USING gin(feature_version_metadata);

-- Step 3: Add comments for documentation
COMMENT ON COLUMN subscription_plans.feature_version_metadata IS 'JSON metadata tracking feature changes, grandfathering rules, and rollout strategy for this version';

-- Example structure:
-- {
--   "version": 2,
--   "effectiveDate": "2024-01-15T00:00:00Z",
--   "changes": [
--     {
--       "featureName": "includeLoanAssistance",
--       "changeType": "added",
--       "oldValue": false,
--       "newValue": true,
--       "reason": "Enhanced service offering",
--       "migrationPath": "Automatically enabled for all subscribers"
--     },
--     {
--       "featureName": "maxUniversities",
--       "changeType": "modified",
--       "oldValue": 15,
--       "newValue": 10,
--       "reason": "Tier restructuring",
--       "migrationPath": "Existing users grandfathered at 15"
--     }
--   ],
--   "affectedFeatures": ["includeLoanAssistance", "maxUniversities"],
--   "rolloutStrategy": "immediate",
--   "grandfatheringRules": [
--     {
--       "condition": "before_date",
--       "retainOldValue": true,
--       "expirationDate": null,
--       "notificationRequired": true,
--       "affectedFeatures": ["maxUniversities"]
--     }
--   ],
--   "releaseNotes": "Updated plan features for better service alignment",
--   "createdBy": "admin-user-id"
-- }
