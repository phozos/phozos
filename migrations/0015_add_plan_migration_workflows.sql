-- Migration: Add Plan Migration Workflow System
-- Phase 4: Migration Workflow Tools
-- This migration enables admin tools to migrate subscribers from deprecated plans to new ones with tracking and incentives

-- Step 1: Create plan_migrations table
CREATE TABLE plan_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  source_plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  target_plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  migration_type VARCHAR(50) NOT NULL CHECK (migration_type IN ('voluntary', 'mandatory', 'incentivized')),
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  incentive_type VARCHAR(50) CHECK (incentive_type IN ('discount', 'free_months', 'feature_upgrade')),
  incentive_value JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  total_eligible_users INTEGER DEFAULT 0,
  migrated_users INTEGER DEFAULT 0,
  declined_users INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Step 2: Create indexes for plan_migrations
CREATE INDEX idx_plan_migrations_source_plan ON plan_migrations(source_plan_id);
CREATE INDEX idx_plan_migrations_target_plan ON plan_migrations(target_plan_id);
CREATE INDEX idx_plan_migrations_status ON plan_migrations(status);
CREATE INDEX idx_plan_migrations_created_by ON plan_migrations(created_by);

-- Step 3: Create plan_migration_users table for tracking individual user migration status
CREATE TABLE plan_migration_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_id UUID NOT NULL REFERENCES plan_migrations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'migrated')),
  notified_at TIMESTAMP,
  responded_at TIMESTAMP,
  migrated_at TIMESTAMP,
  incentive_applied BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Step 4: Create indexes for plan_migration_users
CREATE INDEX idx_plan_migration_users_migration_id ON plan_migration_users(migration_id);
CREATE INDEX idx_plan_migration_users_user_id ON plan_migration_users(user_id);
CREATE INDEX idx_plan_migration_users_status ON plan_migration_users(migration_id, status);
CREATE INDEX idx_plan_migration_users_subscription_id ON plan_migration_users(subscription_id);
CREATE UNIQUE INDEX idx_plan_migration_users_unique ON plan_migration_users(migration_id, user_id);

-- Step 5: Add column comments for documentation
COMMENT ON TABLE plan_migrations IS 'Tracks plan migration campaigns from deprecated plans to new ones';
COMMENT ON COLUMN plan_migrations.migration_type IS 'Type of migration: voluntary (users can decline), mandatory (auto-migrate), incentivized (offer discount/benefits)';
COMMENT ON COLUMN plan_migrations.status IS 'Migration campaign status: draft (being prepared), active (users can accept), completed (all processed), cancelled (abandoned)';
COMMENT ON COLUMN plan_migrations.incentive_type IS 'Type of incentive offered: discount (percentage off), free_months (trial period), feature_upgrade (bonus features)';
COMMENT ON COLUMN plan_migrations.incentive_value IS 'JSON value containing incentive details (e.g., {"percentage": 20} or {"months": 3})';
COMMENT ON COLUMN plan_migrations.total_eligible_users IS 'Number of users eligible for this migration (active subscribers on source plan)';
COMMENT ON COLUMN plan_migrations.migrated_users IS 'Number of users who successfully migrated to target plan';
COMMENT ON COLUMN plan_migrations.declined_users IS 'Number of users who explicitly declined the migration offer';

COMMENT ON TABLE plan_migration_users IS 'Individual user responses and migration status for each migration campaign';
COMMENT ON COLUMN plan_migration_users.status IS 'User migration status: pending (notified, awaiting response), accepted (user agreed), declined (user refused), migrated (completed)';
COMMENT ON COLUMN plan_migration_users.notified_at IS 'When the user was notified about the migration opportunity';
COMMENT ON COLUMN plan_migration_users.responded_at IS 'When the user responded (accepted or declined)';
COMMENT ON COLUMN plan_migration_users.migrated_at IS 'When the user subscription was actually migrated to new plan';
COMMENT ON COLUMN plan_migration_users.incentive_applied IS 'Whether the special incentive pricing was applied to the user subscription';
COMMENT ON COLUMN plan_migration_users.notes IS 'Admin notes or user-provided decline reason';
