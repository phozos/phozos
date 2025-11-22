CREATE TABLE "subscription_plan_changes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "plan_id" uuid NOT NULL,
  "changed_by" uuid NOT NULL,
  "change_type" varchar(50) NOT NULL,
  "field_changes" jsonb NOT NULL,
  "change_reason" text,
  "ip_address" inet,
  "user_agent" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "subscription_plan_changes_change_type_check" CHECK (change_type IN ('created', 'updated', 'deprecated', 'archived', 'activated', 'deactivated'))
);
--> statement-breakpoint
ALTER TABLE "subscription_plan_changes" ADD CONSTRAINT "subscription_plan_changes_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "subscription_plan_changes" ADD CONSTRAINT "subscription_plan_changes_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_plan_changes_plan_id" ON "subscription_plan_changes" ("plan_id");
--> statement-breakpoint
CREATE INDEX "idx_plan_changes_changed_by" ON "subscription_plan_changes" ("changed_by");
--> statement-breakpoint
CREATE INDEX "idx_plan_changes_created_at" ON "subscription_plan_changes" ("created_at" DESC);
