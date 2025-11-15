CREATE TYPE "public"."cancellation_status" AS ENUM('pending', 'approved', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."dispute_status" AS ENUM('open', 'investigating', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."dispute_type" AS ENUM('chargeback', 'dispute');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'rejected');--> statement-breakpoint
ALTER TYPE "public"."user_type" ADD VALUE 'partner';--> statement-breakpoint
CREATE TABLE "cancellation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" "cancellation_status" DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"processed_by" uuid,
	"admin_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chargebacks_disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "dispute_type" NOT NULL,
	"reason" text NOT NULL,
	"status" "dispute_status" DEFAULT 'open' NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"evidence" jsonb,
	"razorpay_dispute_id" text,
	"resolution" text,
	"resolved_at" timestamp,
	"resolved_by" uuid,
	"admin_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"referral_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"base_amount" numeric(10, 2) NOT NULL,
	"commission_rate" numeric(5, 2) NOT NULL,
	"commission_amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"status_reason" text,
	"approved_by" uuid,
	"approved_at" timestamp,
	"rejected_by" uuid,
	"rejected_at" timestamp,
	"payout_id" uuid,
	"paid_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "partner_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"payout_amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"commission_count" integer NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"payout_method" varchar(50) NOT NULL,
	"bank_transfer_reference" varchar(255),
	"bank_transfer_date" timestamp,
	"paypal_transaction_id" varchar(255),
	"paypal_email" varchar(255),
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"status_reason" text,
	"processed_by" uuid,
	"processed_at" timestamp,
	"completed_at" timestamp,
	"notes" text,
	"attachments" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "partner_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_name" text NOT NULL,
	"business_type" text,
	"registration_number" text,
	"tax_id" text,
	"contact_person" text NOT NULL,
	"phone" text NOT NULL,
	"whatsapp_number" text,
	"website" text,
	"address" jsonb,
	"commission_rate" numeric(5, 2) DEFAULT '10.00' NOT NULL,
	"commission_type" text DEFAULT 'percentage' NOT NULL,
	"fixed_commission_amount" numeric(10, 2),
	"payout_method" text DEFAULT 'bank_transfer' NOT NULL,
	"bank_details" jsonb,
	"paypal_email" text,
	"minimum_payout_amount" numeric(10, 2) DEFAULT '1000.00',
	"total_referrals" integer DEFAULT 0,
	"total_conversions" integer DEFAULT 0,
	"total_commission_earned" numeric(12, 2) DEFAULT '0.00',
	"total_commission_paid" numeric(12, 2) DEFAULT '0.00',
	"is_active" boolean DEFAULT true,
	"is_verified" boolean DEFAULT false,
	"verified_at" timestamp,
	"verified_by" uuid,
	"logo" text,
	"bio" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "partner_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "partner_referral_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"link_code" varchar(16) NOT NULL,
	"link_url" text NOT NULL,
	"campaign_name" varchar(255),
	"campaign_source" varchar(100),
	"campaign_medium" varchar(100),
	"description" text,
	"click_count" integer DEFAULT 0,
	"unique_click_count" integer DEFAULT 0,
	"conversion_count" integer DEFAULT 0,
	"last_clicked_at" timestamp,
	"is_active" boolean DEFAULT true,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "partner_referral_links_link_code_unique" UNIQUE("link_code")
);
--> statement-breakpoint
CREATE TABLE "partner_student_referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"referral_link_id" uuid,
	"click_id" uuid,
	"attribution_method" varchar(50) NOT NULL,
	"promo_code" varchar(50),
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"status_reason" text,
	"commission_eligible" boolean DEFAULT true,
	"commission_rate" numeric(5, 2),
	"commission_amount" numeric(10, 2),
	"commission_status" varchar(50) DEFAULT 'pending',
	"commission_paid_at" timestamp,
	"registered_at" timestamp,
	"converted_at" timestamp,
	"subscription_id" uuid,
	"payment_id" uuid,
	"notes" text,
	"approved_by" uuid,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referral_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_link_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"user_id" uuid,
	"ip_address" varchar(45) NOT NULL,
	"user_agent" text,
	"referer" text,
	"country" varchar(2),
	"city" varchar(100),
	"session_id" varchar(64),
	"fingerprint" varchar(64),
	"is_unique" boolean DEFAULT true,
	"converted_to_registration" boolean DEFAULT false,
	"converted_to_payment" boolean DEFAULT false,
	"converted_at" timestamp,
	"clicked_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"cancellation_request_id" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"reason" text NOT NULL,
	"status" "refund_status" DEFAULT 'pending' NOT NULL,
	"razorpay_refund_id" text,
	"razorpay_status" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"processed_by" uuid,
	"admin_notes" text,
	"razorpay_response" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscription_plans" ALTER COLUMN "features" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "referred_by_partner_id" uuid;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "referral_link_id" uuid;--> statement-breakpoint
ALTER TABLE "cancellation_requests" ADD CONSTRAINT "cancellation_requests_subscription_id_user_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cancellation_requests" ADD CONSTRAINT "cancellation_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cancellation_requests" ADD CONSTRAINT "cancellation_requests_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chargebacks_disputes" ADD CONSTRAINT "chargebacks_disputes_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chargebacks_disputes" ADD CONSTRAINT "chargebacks_disputes_subscription_id_user_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chargebacks_disputes" ADD CONSTRAINT "chargebacks_disputes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chargebacks_disputes" ADD CONSTRAINT "chargebacks_disputes_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_partner_id_partner_profiles_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partner_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_referral_id_partner_student_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."partner_student_referrals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_commissions" ADD CONSTRAINT "partner_commissions_payout_id_partner_payouts_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."partner_payouts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_payouts" ADD CONSTRAINT "partner_payouts_partner_id_partner_profiles_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partner_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_payouts" ADD CONSTRAINT "partner_payouts_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_profiles" ADD CONSTRAINT "partner_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_profiles" ADD CONSTRAINT "partner_profiles_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_referral_links" ADD CONSTRAINT "partner_referral_links_partner_id_partner_profiles_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partner_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_student_referrals" ADD CONSTRAINT "partner_student_referrals_partner_id_partner_profiles_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partner_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_student_referrals" ADD CONSTRAINT "partner_student_referrals_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_student_referrals" ADD CONSTRAINT "partner_student_referrals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_student_referrals" ADD CONSTRAINT "partner_student_referrals_referral_link_id_partner_referral_links_id_fk" FOREIGN KEY ("referral_link_id") REFERENCES "public"."partner_referral_links"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_student_referrals" ADD CONSTRAINT "partner_student_referrals_click_id_referral_clicks_id_fk" FOREIGN KEY ("click_id") REFERENCES "public"."referral_clicks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_student_referrals" ADD CONSTRAINT "partner_student_referrals_subscription_id_user_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_student_referrals" ADD CONSTRAINT "partner_student_referrals_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_student_referrals" ADD CONSTRAINT "partner_student_referrals_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_clicks" ADD CONSTRAINT "referral_clicks_referral_link_id_partner_referral_links_id_fk" FOREIGN KEY ("referral_link_id") REFERENCES "public"."partner_referral_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_clicks" ADD CONSTRAINT "referral_clicks_partner_id_partner_profiles_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partner_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_clicks" ADD CONSTRAINT "referral_clicks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_subscription_id_user_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_cancellation_request_id_cancellation_requests_id_fk" FOREIGN KEY ("cancellation_request_id") REFERENCES "public"."cancellation_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;