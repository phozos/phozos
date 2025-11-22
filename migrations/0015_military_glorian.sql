CREATE TABLE "plan_migration_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"migration_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"notified_at" timestamp,
	"responded_at" timestamp,
	"migrated_at" timestamp,
	"incentive_applied" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_migrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"source_plan_id" uuid NOT NULL,
	"target_plan_id" uuid NOT NULL,
	"migration_type" varchar(50) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"incentive_type" varchar(50),
	"incentive_value" jsonb,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"total_eligible_users" integer DEFAULT 0,
	"migrated_users" integer DEFAULT 0,
	"declined_users" integer DEFAULT 0,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plan_migration_users" ADD CONSTRAINT "plan_migration_users_migration_id_plan_migrations_id_fk" FOREIGN KEY ("migration_id") REFERENCES "public"."plan_migrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_migration_users" ADD CONSTRAINT "plan_migration_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_migration_users" ADD CONSTRAINT "plan_migration_users_subscription_id_user_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_migrations" ADD CONSTRAINT "plan_migrations_source_plan_id_subscription_plans_id_fk" FOREIGN KEY ("source_plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_migrations" ADD CONSTRAINT "plan_migrations_target_plan_id_subscription_plans_id_fk" FOREIGN KEY ("target_plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_migrations" ADD CONSTRAINT "plan_migrations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;