CREATE TABLE "failed_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid,
	"order_id" text,
	"payment_id" text,
	"amount" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'INR',
	"failure_reason" text,
	"razorpay_error_code" text,
	"razorpay_error_description" text,
	"failed_at" timestamp DEFAULT now() NOT NULL,
	"notified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"old_status" text,
	"new_status" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "amount_paid" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "currency" varchar(3) DEFAULT 'INR';--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD COLUMN "paid_at" timestamp;--> statement-breakpoint
ALTER TABLE "failed_payments" ADD CONSTRAINT "failed_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "failed_payments" ADD CONSTRAINT "failed_payments_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_subscription_id_user_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;