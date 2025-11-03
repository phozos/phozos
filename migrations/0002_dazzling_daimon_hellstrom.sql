ALTER TABLE "subscription_plans" ALTER COLUMN "currency" SET DEFAULT 'INR';--> statement-breakpoint
ALTER TABLE "user_subscriptions" ALTER COLUMN "auto_renew" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "tier_level" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "is_lifetime" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "is_lifetime" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "tier_level" integer;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "lifetime_activated_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "highest_tier_reached" integer;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_tier_level_unique" UNIQUE("tier_level");