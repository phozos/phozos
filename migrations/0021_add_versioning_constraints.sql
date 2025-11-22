-- Migration: Add data integrity constraints for versioning

-- Constraint 1: Version must be positive
ALTER TABLE subscription_plans
  ADD CONSTRAINT check_version_positive 
  CHECK (version > 0);

-- Constraint 2: Latest version flag can only be true once per base plan
CREATE UNIQUE INDEX idx_one_latest_version_per_plan 
  ON subscription_plans(base_plan_id) 
  WHERE is_latest_version = true;

-- Constraint 3: Version 1 must be self-referencing
-- (Enforced at application level - too complex for DB constraint)

-- Constraint 4: Archived plans cannot be latest version
ALTER TABLE subscription_plans
  ADD CONSTRAINT check_archived_not_latest
  CHECK (
    (archived_at IS NULL) OR 
    (archived_at IS NOT NULL AND is_latest_version = false)
  );

-- Constraint 5: Deprecated plans must have deprecation reason in audit trail
-- (Enforced at application level via required changeReason parameter)

COMMENT ON CONSTRAINT check_version_positive ON subscription_plans IS 'Versions start at 1 and increment';
COMMENT ON INDEX idx_one_latest_version_per_plan IS 'Only one version per plan family can be marked as latest';
COMMENT ON CONSTRAINT check_archived_not_latest ON subscription_plans IS 'Archived plans cannot be the current latest version';
