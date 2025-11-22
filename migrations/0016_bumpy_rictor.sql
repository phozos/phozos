ALTER TYPE "public"."notification_type" ADD VALUE 'feature_addition';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'feature_deprecation';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'feature_modification';--> statement-breakpoint
CREATE TABLE "quota_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"quota_type" varchar(50) NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"allocated_count" integer NOT NULL,
	"last_used_at" timestamp,
	"reset_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "feature_version_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "quota_usage" ADD CONSTRAINT "quota_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quota_usage" ADD CONSTRAINT "quota_usage_subscription_id_user_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE cascade ON UPDATE no action;