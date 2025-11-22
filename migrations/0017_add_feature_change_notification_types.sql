-- Migration: Add feature change notification types
-- Date: 2025-11-07
-- Purpose: Add notification types for feature changes (addition, deprecation, modification)

-- Add new notification types to the enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'feature_addition';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'feature_deprecation';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'feature_modification';
