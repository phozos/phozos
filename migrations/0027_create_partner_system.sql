-- Add 'partner' to user_type enum
ALTER TYPE user_type ADD VALUE IF NOT EXISTS 'partner';

-- Create partner_profiles table
CREATE TABLE IF NOT EXISTS partner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  business_type TEXT,
  registration_number TEXT,
  tax_id TEXT,
  contact_person TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp_number TEXT,
  website TEXT,
  address JSONB,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  commission_type TEXT NOT NULL DEFAULT 'percentage',
  fixed_commission_amount DECIMAL(10,2),
  payout_method TEXT NOT NULL DEFAULT 'bank_transfer',
  bank_details JSONB,
  paypal_email TEXT,
  minimum_payout_amount DECIMAL(10,2) DEFAULT 1000.00,
  total_referrals INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_commission_earned DECIMAL(12,2) DEFAULT 0.00,
  total_commission_paid DECIMAL(12,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES users(id),
  logo TEXT,
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create partner_referral_links table
CREATE TABLE IF NOT EXISTS partner_referral_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partner_profiles(id) ON DELETE CASCADE,
  link_code VARCHAR(16) NOT NULL UNIQUE,
  link_url TEXT NOT NULL,
  campaign_name VARCHAR(255),
  campaign_source VARCHAR(100),
  campaign_medium VARCHAR(100),
  description TEXT,
  click_count INTEGER DEFAULT 0,
  unique_click_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  last_clicked_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create referral_clicks table
CREATE TABLE IF NOT EXISTS referral_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_link_id UUID NOT NULL REFERENCES partner_referral_links(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partner_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  referer TEXT,
  country VARCHAR(2),
  city VARCHAR(100),
  session_id VARCHAR(64),
  fingerprint VARCHAR(64),
  is_unique BOOLEAN DEFAULT TRUE,
  converted_to_registration BOOLEAN DEFAULT FALSE,
  converted_to_payment BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMP,
  clicked_at TIMESTAMP DEFAULT NOW()
);

-- Create partner_student_referrals table
CREATE TABLE IF NOT EXISTS partner_student_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partner_profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_link_id UUID REFERENCES partner_referral_links(id) ON DELETE SET NULL,
  click_id UUID REFERENCES referral_clicks(id) ON DELETE SET NULL,
  attribution_method VARCHAR(50) NOT NULL,
  promo_code VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  status_reason TEXT,
  commission_eligible BOOLEAN DEFAULT TRUE,
  commission_rate DECIMAL(5,2),
  commission_amount DECIMAL(10,2),
  commission_status VARCHAR(50) DEFAULT 'pending',
  commission_paid_at TIMESTAMP,
  registered_at TIMESTAMP,
  converted_at TIMESTAMP,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  notes TEXT,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create partner_commissions table
CREATE TABLE IF NOT EXISTS partner_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partner_profiles(id) ON DELETE CASCADE,
  referral_id UUID NOT NULL REFERENCES partner_student_referrals(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  base_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR' NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  status_reason TEXT,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejected_at TIMESTAMP,
  payout_id UUID,
  paid_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create partner_payouts table
CREATE TABLE IF NOT EXISTS partner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partner_profiles(id) ON DELETE CASCADE,
  payout_amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR' NOT NULL,
  commission_count INTEGER NOT NULL,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  payout_method VARCHAR(50) NOT NULL,
  bank_transfer_reference VARCHAR(255),
  bank_transfer_date TIMESTAMP,
  paypal_transaction_id VARCHAR(255),
  paypal_email VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  status_reason TEXT,
  processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,
  notes TEXT,
  attachments TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key to partner_commissions (circular dependency resolved)
ALTER TABLE partner_commissions 
ADD CONSTRAINT partner_commissions_payout_id_fkey 
FOREIGN KEY (payout_id) REFERENCES partner_payouts(id) ON DELETE SET NULL;

-- Add referral tracking to student_profiles
ALTER TABLE student_profiles 
ADD COLUMN IF NOT EXISTS referred_by_partner_id UUID REFERENCES partner_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS referral_link_id UUID REFERENCES partner_referral_links(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_partner_profiles_user_id ON partner_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_profiles_is_active ON partner_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_partner_referral_links_partner_id ON partner_referral_links(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_referral_links_link_code ON partner_referral_links(link_code);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_referral_link_id ON referral_clicks(referral_link_id);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_partner_id ON referral_clicks(partner_id);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_user_id ON referral_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_fingerprint ON referral_clicks(fingerprint);
CREATE INDEX IF NOT EXISTS idx_partner_student_referrals_partner_id ON partner_student_referrals(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_student_referrals_student_id ON partner_student_referrals(student_id);
CREATE INDEX IF NOT EXISTS idx_partner_student_referrals_status ON partner_student_referrals(status);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_partner_id ON partner_commissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_referral_id ON partner_commissions(referral_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_status ON partner_commissions(status);
CREATE INDEX IF NOT EXISTS idx_partner_payouts_partner_id ON partner_payouts(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_payouts_status ON partner_payouts(status);
CREATE INDEX IF NOT EXISTS idx_student_profiles_referred_by_partner_id ON student_profiles(referred_by_partner_id);
