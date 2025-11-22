ALTER TABLE "user_subscriptions" ADD COLUMN "subscribed_plan_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "grandfathered_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "grandfathered_until" timestamp;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "is_grandfathered" boolean DEFAULT false;