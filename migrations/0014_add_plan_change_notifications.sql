-- Migration: Add Plan Change Notification System
-- Phase 3: Change Notification System
-- This migration enables automated notifications to subscribers when plan changes occur

-- Step 1: Create subscription_plan_notifications table
CREATE TABLE subscription_plan_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('price_change', 'feature_change', 'deprecation', 'migration_required')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  effective_date TIMESTAMP NOT NULL,
  notification_date TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  recipient_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Step 2: Create indexes for subscription_plan_notifications
CREATE INDEX idx_plan_notifications_plan_id ON subscription_plan_notifications(plan_id);
CREATE INDEX idx_plan_notifications_sent_at ON subscription_plan_notifications(sent_at);
CREATE INDEX idx_plan_notifications_effective_date ON subscription_plan_notifications(effective_date);

-- Step 3: Create user_plan_notifications table for tracking individual user notification delivery
CREATE TABLE user_plan_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_notification_id UUID NOT NULL REFERENCES subscription_plan_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  read_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  email_status VARCHAR(50) CHECK (email_status IN ('sent', 'delivered', 'bounced', 'failed')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Step 4: Create indexes for user_plan_notifications
CREATE INDEX idx_user_plan_notif_user_id ON user_plan_notifications(user_id);
CREATE INDEX idx_user_plan_notif_plan_notif_id ON user_plan_notifications(plan_notification_id);
CREATE INDEX idx_user_plan_notif_read_at ON user_plan_notifications(user_id, read_at);

-- Step 5: Add column comments for documentation
COMMENT ON TABLE subscription_plan_notifications IS 'System-wide notifications about plan changes (price, features, deprecation)';
COMMENT ON COLUMN subscription_plan_notifications.notification_type IS 'Type of notification: price_change, feature_change, deprecation, migration_required';
COMMENT ON COLUMN subscription_plan_notifications.effective_date IS 'When the plan change takes effect';
COMMENT ON COLUMN subscription_plan_notifications.notification_date IS 'When the notification should be sent (typically 30 days before effective_date)';
COMMENT ON COLUMN subscription_plan_notifications.sent_at IS 'When the notification was actually sent to users';
COMMENT ON COLUMN subscription_plan_notifications.recipient_count IS 'Number of users who received this notification';
COMMENT ON COLUMN subscription_plan_notifications.metadata IS 'Additional data (oldPrice, newPrice, etc.)';

COMMENT ON TABLE user_plan_notifications IS 'Tracks which users received which plan notifications and their engagement';
COMMENT ON COLUMN user_plan_notifications.sent_at IS 'When the notification was sent to this specific user';
COMMENT ON COLUMN user_plan_notifications.read_at IS 'When the user read the notification';
COMMENT ON COLUMN user_plan_notifications.acknowledged_at IS 'When the user acknowledged the notification';
COMMENT ON COLUMN user_plan_notifications.email_status IS 'Email delivery status: sent, delivered, bounced, failed';
