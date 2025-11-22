ALTER TABLE "subscription_plans" DROP CONSTRAINT "subscription_plans_tier_level_unique";--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "base_plan_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "version_name" varchar(50);--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "is_latest_version" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "deprecated_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "successor_plan_id" uuid;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_base_plan_id_subscription_plans_id_fk" FOREIGN KEY ("base_plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_successor_plan_id_subscription_plans_id_fk" FOREIGN KEY ("successor_plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE set null ON UPDATE no action;