-- Migration: Add digestSentAt column to failed_payments table
-- This column tracks when a failed payment was included in a daily digest email
-- Allows the alerting service to send each failure only once in digest emails

ALTER TABLE "failed_payments" 
ADD COLUMN IF NOT EXISTS "digest_sent_at" TIMESTAMP;

-- Create index for efficient queries on unsent digest items
CREATE INDEX IF NOT EXISTS "idx_failed_payments_digest_pending" 
ON "failed_payments" ("failed_at") 
WHERE "digest_sent_at" IS NULL;

-- Comment on the column for documentation
COMMENT ON COLUMN "failed_payments"."digest_sent_at" IS 'Timestamp when this failed payment was included in a daily digest email';
