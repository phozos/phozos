-- Add webhook_queue enum for status tracking
DO $$ BEGIN
    CREATE TYPE webhook_queue_status AS ENUM ('pending', 'processing', 'success', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create webhook_queue table for async webhook processing
CREATE TABLE IF NOT EXISTS webhook_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status webhook_queue_status NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP,
  next_retry_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_queue_status_next_retry 
ON webhook_queue(status, next_retry_at) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_webhook_queue_event_id 
ON webhook_queue(event_id);

CREATE INDEX IF NOT EXISTS idx_webhook_queue_created_at 
ON webhook_queue(created_at DESC);

-- Add comment for documentation
COMMENT ON TABLE webhook_queue IS 'Async webhook processing queue for improved response times and retry logic';
COMMENT ON COLUMN webhook_queue.event_id IS 'Unique event ID from x-razorpay-event-id header';
COMMENT ON COLUMN webhook_queue.next_retry_at IS 'Timestamp for next retry attempt (exponential backoff)';
