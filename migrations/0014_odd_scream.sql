CREATE TABLE "subscription_plan_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"notification_type" varchar(50) NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"effective_date" timestamp NOT NULL,
	"notification_date" timestamp NOT NULL,
	"sent_at" timestamp,
	"recipient_count" integer DEFAULT 0,
	"metadata" jsonb,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_plan_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_notification_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp,
	"acknowledged_at" timestamp,
	"email_status" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscription_plan_notifications" ADD CONSTRAINT "subscription_plan_notifications_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_plan_notifications" ADD CONSTRAINT "subscription_plan_notifications_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_plan_notifications" ADD CONSTRAINT "user_plan_notifications_plan_notification_id_subscription_plan_notifications_id_fk" FOREIGN KEY ("plan_notification_id") REFERENCES "public"."subscription_plan_notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_plan_notifications" ADD CONSTRAINT "user_plan_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;