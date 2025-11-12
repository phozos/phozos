/**
 * Partner System Types & Constants
 * 
 * Single source of truth for partner-related enums, constants, and API types
 * This file combines business types, validation helpers, and API request/response types
 */

import type { 
  PartnerProfile, 
  PartnerReferralLink, 
  ReferralClick,
  PartnerStudentReferral,
  PartnerCommission,
  PartnerPayout 
} from '../schema';

// ============================================================================
// BUSINESS TYPES & ENUMS
// ============================================================================

// Attribution Methods
export const ATTRIBUTION_METHODS = ['link_click', 'manual', 'promo_code'] as const;
export type AttributionMethod = typeof ATTRIBUTION_METHODS[number];

// Referral Status
export const REFERRAL_STATUSES = ['pending', 'converted', 'paid', 'rejected'] as const;
export type ReferralStatus = typeof REFERRAL_STATUSES[number];

// Commission Status
export const COMMISSION_STATUSES = ['pending', 'approved', 'paid', 'rejected', 'disputed'] as const;
export type CommissionStatus = typeof COMMISSION_STATUSES[number];

// Payout Status
export const PAYOUT_STATUSES = ['pending', 'processing', 'completed', 'failed', 'cancelled'] as const;
export type PayoutStatus = typeof PAYOUT_STATUSES[number];

// Payout Methods
export const PAYOUT_METHODS = ['bank_transfer', 'paypal', 'check'] as const;
export type PayoutMethod = typeof PAYOUT_METHODS[number];

// Commission Types
export const COMMISSION_TYPES = ['percentage', 'fixed'] as const;
export type CommissionType = typeof COMMISSION_TYPES[number];

// Business Types
export const BUSINESS_TYPES = [
  'education_consultant',
  'immigration_firm',
  'language_school',
  'travel_agency',
  'career_counselor',
  'individual_consultant',
  'other'
] as const;
export type BusinessType = typeof BUSINESS_TYPES[number];

// ============================================================================
// DEFAULT VALUES & CONSTANTS
// ============================================================================

export const DEFAULT_COMMISSION_RATE = 10.00;
export const DEFAULT_MINIMUM_PAYOUT = 1000.00;
export const LINK_CODE_LENGTH = 8;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export const isValidAttributionMethod = (value: string): value is AttributionMethod => {
  return ATTRIBUTION_METHODS.includes(value as AttributionMethod);
};

export const isValidReferralStatus = (value: string): value is ReferralStatus => {
  return REFERRAL_STATUSES.includes(value as ReferralStatus);
};

export const isValidCommissionStatus = (value: string): value is CommissionStatus => {
  return COMMISSION_STATUSES.includes(value as CommissionStatus);
};

export const isValidPayoutStatus = (value: string): value is PayoutStatus => {
  return PAYOUT_STATUSES.includes(value as PayoutStatus);
};

export const isValidPayoutMethod = (value: string): value is PayoutMethod => {
  return PAYOUT_METHODS.includes(value as PayoutMethod);
};

// ============================================================================
// AUTHORIZATION HELPERS
// ============================================================================

export const isPartner = (userType: string): boolean => {
  return userType === 'partner';
};

export const canAccessPartnerDashboard = (userType: string): boolean => {
  return userType === 'partner';
};

export const canManagePartners = (userType: string, teamRole: string | null): boolean => {
  return userType === 'team_member' && teamRole === 'admin';
};

// ============================================================================
// API TYPES - DASHBOARD & ANALYTICS
// ============================================================================

export interface PartnerDashboardStats {
  totalReferrals: number;
  totalConversions: number;
  conversionRate: number;
  totalClicks: number;
  uniqueClicks: number;
  clickToRegistrationRate: number;
  totalCommissionEarned: number;
  totalCommissionPaid: number;
  pendingCommission: number;
  currentMonthReferrals: number;
  currentMonthConversions: number;
  activeLinks: number;
}

// ============================================================================
// API TYPES - EXTENDED ENTITIES
// ============================================================================

export interface PartnerWithUser extends PartnerProfile {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    accountStatus: string;
    createdAt: Date;
  };
}

export interface ReferralLinkWithStats extends PartnerReferralLink {
  clickCount: number;
  uniqueClickCount: number;
  conversionCount: number;
  conversionRate: number;
  lastClickedAt: Date | null;
}

export interface ReferralWithStudentDetails extends PartnerStudentReferral {
  student: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
    status: string;
    destinationCountry: string | null;
  };
  subscription: {
    id: string;
    planName: string;
    amount: number;
    status: string;
  } | null;
  payment: {
    id: string;
    amount: number;
    paidAt: Date;
  } | null;
}

export interface CommissionWithDetails extends PartnerCommission {
  referral: {
    id: string;
    studentName: string;
    status: string;
  };
  payment: {
    id: string;
    amount: number;
    paidAt: Date;
  };
  payout: {
    id: string;
    payoutAmount: number;
    status: string;
    completedAt: Date | null;
  } | null;
}

export interface PayoutWithCommissions extends PartnerPayout {
  commissions: {
    id: string;
    commissionAmount: number;
    studentName: string;
    createdAt: Date;
  }[];
}

// ============================================================================
// API REQUEST TYPES
// ============================================================================

export interface CreatePartnerRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  businessType?: string;
  commissionRate?: number;
}

export interface UpdatePartnerProfileRequest {
  companyName?: string;
  contactPerson?: string;
  phone?: string;
  whatsappNumber?: string;
  website?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  bankDetails?: {
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    branchName?: string;
  };
  paypalEmail?: string;
  bio?: string;
}

export interface CreateReferralLinkRequest {
  campaignName?: string;
  campaignSource?: string;
  campaignMedium?: string;
  description?: string;
  expiresAt?: Date;
}

export interface RecordReferralClickRequest {
  linkCode: string;
  ipAddress: string;
  userAgent: string;
  referer?: string;
  sessionId: string;
  fingerprint: string;
}

export interface CreateManualReferralRequest {
  studentId: string;
  attributionMethod: 'manual' | 'promo_code';
  promoCode?: string;
  notes?: string;
}

export interface ApproveCommissionRequest {
  commissionIds: string[];
  notes?: string;
}

export interface CreatePayoutRequest {
  partnerId: string;
  commissionIds: string[];
  payoutMethod: 'bank_transfer' | 'paypal' | 'check';
  notes?: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface PartnerRegistrationResponse {
  message: string;
  partnerId: string;
  userId: string;
  referralLink: {
    linkCode: string;
    linkUrl: string;
  };
}

export interface ReferralLinkCreatedResponse {
  link: PartnerReferralLink;
  fullUrl: string;
}

export interface CommissionCalculationResult {
  baseAmount: number;
  commissionRate: number;
  commissionAmount: number;
  currency: string;
}
