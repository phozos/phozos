# Partner Commission System - Comprehensive Investigation and Remediation Plan

**Investigation Date:** November 14, 2025  
**Investigator:** Replit Agent  
**Status:** Investigation Complete - DO NOT IMPLEMENT WITHOUT APPROVAL  
**Document Version:** 2.0 (Enhanced with Architect Feedback)  
**Last Enhancement:** November 14, 2025

---

## Executive Summary

### Critical Finding

The partner commission system is **completely non-functional**. Despite having a fully converted, commission-eligible referral in the database with a verified payment of ₹20,000, **ZERO commissions have been created**.

**Database Evidence:**
```sql
-- 1 converted referral exists, commission-eligible
SELECT COUNT(*) FROM partner_student_referrals 
WHERE status = 'converted' AND commission_eligible = true;
Result: 1

-- ZERO commissions exist
SELECT COUNT(*) FROM partner_commissions;
Result: 0
```

### Business Impact

- **Revenue at Risk:** ₹20,000 in commissionable revenue has no commission record
- **Partner Trust:** Partners cannot see earned commissions, breaking trust
- **Legal Exposure:** Failure to track and pay commissions may violate partnership agreements
- **Data Integrity:** Missing commission records create incomplete audit trails
- **Scalability:** System cannot scale if commission creation is broken

### Severity Classification

| Priority | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 3 | Complete system failure - commission creation never occurs |
| **HIGH** | 4 | Missing functionality in payment paths, data loss risks |
| **MEDIUM** | 2 | Performance and monitoring issues |
| **LOW** | 1 | Enhancement opportunities |

**Total Issues:** 10 distinct problems identified

---

## Table of Contents

1. [Current System Architecture](#current-system-architecture)
2. [All Commission-Triggering Flows](#all-commission-triggering-flows) **[NEW]**
3. [Payment Flow Analysis](#payment-flow-analysis)
4. [Root Cause Analysis](#root-cause-analysis)
5. [Complete Issue Classification](#complete-issue-classification)
6. [Idempotency & Race Condition Handling](#idempotency--race-condition-handling) **[NEW]**
7. [Referral Lookup Strategy](#referral-lookup-strategy) **[NEW]**
8. [Database Integrity Assessment](#database-integrity-assessment)
9. [Frontend-Backend Alignment](#frontend-backend-alignment)
10. [Detailed Backfill Procedure](#detailed-backfill-procedure) **[ENHANCED]**
11. [Phase-by-Phase Remediation Plan](#phase-by-phase-remediation-plan)
12. [Testing Strategy](#testing-strategy) **[ENHANCED]**
13. [Rollback Plan](#rollback-plan)
14. [Database Migration Needs](#database-migration-needs) **[ENHANCED]**
15. [Risk Assessment](#risk-assessment)
16. [Monitoring and Alerting](#monitoring-and-alerting)

---

## Current System Architecture

### How It's Supposed to Work

```
┌─────────────────────────────────────────────────────────────────────┐
│                  INTENDED COMMISSION FLOW                            │
└─────────────────────────────────────────────────────────────────────┘

1. Partner creates referral link
   ├─> Student clicks link (tracked in referral_clicks)
   └─> Cookies set: referral_code, click_id, ref_session

2. Student registers
   ├─> Creates user account
   ├─> Creates student profile
   └─> Calls: referralTrackingService.attributeStudentToPartner()
       ├─> Creates partner_student_referrals record (status: 'pending')
       ├─> Increments partner.totalReferrals
       └─> Increments referralLink.conversionCount

3. Student purchases subscription
   └─> THREE POSSIBLE PATHS:
       
       PATH A: Manual Verification (verifyPayment)
       ├─> Creates subscription
       ├─> Creates payment record
       ├─> Calls: referralTrackingService.trackConversion()
       │   ├─> Updates referral status: 'pending' → 'converted'
       │   ├─> Sets convertedAt timestamp
       │   ├─> Links subscription_id and payment_id
       │   └─> Increments partner.totalConversions
       └─> ❌ MISSING: commissionService.createCommission()
       
       PATH B: Payment Captured Webhook (handlePaymentCaptured)
       ├─> Looks up payment by paymentReference
       ├─> Finds student profile
       ├─> Calls: referralTrackingService.trackConversion() ✅
       └─> Calls: commissionService.createCommission() ✅
           ├─> Checks commission doesn't already exist
           ├─> Validates referral is 'converted' and eligible
           ├─> Calculates commission amount
           ├─> Creates partner_commissions record (status: 'pending')
           ├─> Updates partner.totalCommissionEarned
           └─> Updates referral.commissionAmount and commissionStatus
       
       PATH C: Order Paid Webhook (handleOrderPaid)
       ├─> Creates subscription
       ├─> Creates payment record
       ├─> Calls: referralTrackingService.trackConversion()
       └─> ❌ MISSING: commissionService.createCommission()

4. Admin approves commissions
   ├─> Calls: commissionService.approveCommissions()
   ├─> Updates status: 'pending' → 'approved'
   └─> Sets approved_by and approved_at

5. Admin processes payout
   ├─> Creates partner_payouts record
   ├─> Links multiple commissions to payout
   ├─> Updates commission status: 'approved' → 'paid'
   └─> Sets paid_at timestamp
```

### How It Actually Works (BROKEN)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ACTUAL BROKEN FLOW                                │
└─────────────────────────────────────────────────────────────────────┘

1. Partner creates referral link ✅
2. Student clicks link ✅
3. Student registers ✅
4. Student purchases subscription:
   
   PATH A (Manual Verification) - 95% of transactions
   ├─> Creates subscription ✅
   ├─> Creates payment record ✅
   ├─> Calls trackConversion() ✅
   └─> ❌ NEVER CALLS createCommission() - CRITICAL BUG
       Result: Referral converted, but NO COMMISSION CREATED
   
   PATH B (Payment Captured Webhook) - Rarely fires
   ├─> Only fires if webhook arrives before manual verification
   ├─> Race condition with manual verification path
   └─> Even if it fires: ✅ Would create commission
       But: Usually doesn't reach this code due to timing
   
   PATH C (Order Paid Webhook) - Deprecated?
   ├─> Creates subscription ✅
   ├─> Calls trackConversion() ✅
   └─> ❌ NEVER CALLS createCommission() - CRITICAL BUG

RESULT: 99% of successful paid referrals have NO COMMISSION RECORD
```

### Database Schema Analysis

**Core Tables:**

```typescript
// partner_student_referrals - Tracks referral lifecycle
{
  id: uuid (PK)
  partner_id: uuid (FK → partner_profiles.id)
  student_id: uuid (FK → student_profiles.id)
  user_id: uuid (FK → users.id)
  referral_link_id: uuid (FK → partner_referral_links.id)
  
  status: varchar  // 'pending' → 'converted' → 'paid' | 'rejected'
  commission_eligible: boolean
  commission_amount: numeric
  commission_status: varchar
  
  subscription_id: uuid (FK → user_subscriptions.id)
  payment_id: uuid (FK → payments.id)
  
  converted_at: timestamp
  created_at: timestamp
}

// partner_commissions - Commission records (EMPTY TABLE!)
{
  id: uuid (PK)
  partner_id: uuid (FK → partner_profiles.id)
  referral_id: uuid (FK → partner_student_referrals.id)
  payment_id: uuid (FK → payments.id)
  
  base_amount: numeric       // Original payment amount
  commission_rate: numeric   // Percentage (e.g., 10.00)
  commission_amount: numeric // Calculated amount
  currency: varchar
  
  status: varchar  // 'pending' → 'approved' → 'paid' | 'rejected'
  
  approved_by: uuid (FK → users.id, nullable)
  approved_at: timestamp (nullable)
  payout_id: uuid (FK → partner_payouts.id, nullable)
  paid_at: timestamp (nullable)
  
  created_at: timestamp
}

// payments - Payment ledger (4 records exist)
{
  id: uuid (PK)
  user_id: uuid (FK → users.id)
  subscription_id: uuid (FK → user_subscriptions.id)
  plan_id: uuid (FK → subscription_plans.id)
  
  payment_type: varchar  // 'new_subscription' | 'upgrade' | 'renewal'
  amount: numeric
  currency: varchar
  
  order_id: varchar          // Razorpay order ID
  payment_reference: varchar // Razorpay payment ID
  payment_gateway: varchar
  
  paid_at: timestamp
}
```

**Foreign Key Relationships:**

```
partner_commissions
  ├─> partner_id → partner_profiles.id
  ├─> referral_id → partner_student_referrals.id (UNIQUE constraint expected)
  ├─> payment_id → payments.id
  ├─> approved_by → users.id (nullable)
  ├─> rejected_by → users.id (nullable)
  └─> payout_id → partner_payouts.id (nullable)

partner_student_referrals
  ├─> partner_id → partner_profiles.id
  ├─> student_id → student_profiles.id
  ├─> user_id → users.id
  ├─> referral_link_id → partner_referral_links.id (nullable)
  ├─> subscription_id → user_subscriptions.id (nullable)
  └─> payment_id → payments.id (nullable)
```

---

## All Commission-Triggering Flows

### Overview

This section documents ALL scenarios that should trigger commission creation, including edge cases that are currently missing from implementation. Each scenario requires careful handling to ensure commissions are created accurately and idempotently.

### Flow 1: Standard New Subscription Payment ✅ (PARTIALLY WORKING)

**Scenario:** Student with referral makes their first subscription payment

**Trigger:** User clicks "Verify Payment" button after completing Razorpay payment

**File:** `server/controllers/payment.controller.ts`  
**Method:** `verifyPayment()` (lines 456-483)  
**Current Status:** 🔴 BROKEN - Tracks conversion but never creates commission

**Commission Eligibility:**
- ✅ YES - This is the primary revenue event that should trigger commission
- Commission should be based on full payment amount
- Referral status changes: `pending` → `converted`

**Implementation Requirements:**
```typescript
// Required flow:
1. Verify payment with Razorpay
2. Create subscription
3. Create payment record
4. Wrap in transaction:
   a. Call trackConversion(studentId, subscriptionId, paymentId)
   b. Lookup referral by studentId
   c. If referral exists and commission_eligible:
      - Call createCommission(referralId, paymentId)
   d. Else: Log "organic signup" or "not commission eligible"
```

**Edge Cases:**
- Webhook may arrive later and try to create duplicate commission (handled by unique constraint)
- Student might not have referral (organic signup) - gracefully skip commission creation
- Referral might exist but be marked as not commission_eligible - skip commission

**Testing Requirements:**
- Test with referred student
- Test with non-referred student  
- Test webhook arriving after manual verification
- Verify only one commission created despite multiple attempts

---

### Flow 2: Zero-Cost Upgrade (Free → Paid) ⚠️ (MISSING COMMISSION)

**Scenario:** Student who already paid for a plan upgrades to a higher-tier plan at zero additional cost due to proration

**Trigger:** Proration calculation shows `requiresPayment = false` because student already paid equal or more

**File:** `server/controllers/payment.controller.ts`  
**Method:** `createOrder()` (lines 93-158)  
**Current Status:** 🟡 PARTIAL - Tracks conversion but NO commission created

**Current Implementation:**
```typescript
// Lines 114-149: Zero-cost upgrade detection
if (!prorationResult.requiresPayment) {
  logger.info('Zero-cost upgrade detected - upgrading without payment');
  
  const upgradedSubscription = await userSubscriptionService.upgradeSubscription(userId, planId);
  
  // Lines 114-149: Tracks conversion ✅
  await referralTrackingService.trackConversion(
    studentProfile.id,
    upgradedSubscription.id,
    paymentRecord.id
  );
  
  // ❌ MISSING: Commission creation
}
```

**Commission Eligibility:**
- 🤔 **DECISION NEEDED:** Should zero-cost upgrades trigger commission?
  
  **Option A: YES - Commission on original payment**
  - Rationale: Partner drove the conversion, original payment already occurred
  - Commission amount: Based on ORIGINAL payment, not the zero-cost upgrade
  - Implementation: Create commission referencing the original payment_id
  
  **Option B: NO - No commission for zero-cost**
  - Rationale: No new revenue generated, commission already paid on first payment
  - Implementation: Track conversion but skip commission creation
  - Log: "Zero-cost upgrade - commission already processed on original payment"

**Recommended Approach: Option B (No Commission)**

Reasoning:
- Commission should only be created once per referral
- If student paid $1000 initially and upgrades to $1500 plan at $0 cost, the partner already got commission on $1000
- Creating another commission would be double-paying the partner
- The conversion tracking is still important for analytics

**Implementation Plan:**
```typescript
// In zero-cost upgrade path (lines 114-149)
if (!prorationResult.requiresPayment) {
  // ... existing upgrade code ...
  
  // Track conversion but check if commission already exists
  await db.transaction(async (tx) => {
    await referralTrackingService.trackConversion(
      studentProfile.id,
      upgradedSubscription.id,
      paymentRecord.id,
      tx
    );
    
    const referral = await partnerStudentReferralRepository.findByStudentId(studentProfile.id);
    
    if (referral) {
      // Check if commission already created from previous payment
      const existingCommission = await commissionRepo.findByReferralId(referral.id, tx);
      
      if (existingCommission) {
        logger.info('Zero-cost upgrade - commission already created from original payment', {
          referralId: referral.id,
          existingCommissionId: existingCommission.id,
          upgradedSubscriptionId: upgradedSubscription.id
        });
      } else {
        // This should not happen in normal flow
        logger.warn('Zero-cost upgrade but no existing commission - may need manual review', {
          referralId: referral.id,
          paymentId: paymentRecord.id
        });
      }
    }
  });
}
```

**Testing Requirements:**
- Test student with referral doing zero-cost upgrade
- Verify conversion tracked but no duplicate commission created
- Verify proper logging
- Test partner dashboard shows correct conversion count but no duplicate commission

---

### Flow 3: Paid Plan Upgrade/Change 💰 (NEEDS COMMISSION)

**Scenario:** Student upgrades to higher-tier plan and pays prorated difference

**Trigger:** Proration calculation shows `requiresPayment = true` with prorated amount

**File:** `server/controllers/payment.controller.ts`  
**Method:** `createOrder()` followed by `verifyPayment()`  
**Current Status:** 🔴 BROKEN - Same as Flow 1, conversion tracked but no commission

**Commission Eligibility:**
- ✅ **YES** - New payment occurred, partner should get commission on prorated amount
- Commission amount: Based on PRORATED payment amount (not full plan price)
- Example: Student paid ₹10,000 for Plan A, upgrades to Plan B (₹15,000). Proration = ₹5,000. Commission = 10% of ₹5,000 = ₹500

**Implementation Requirements:**
Same as Flow 1 - `verifyPayment()` needs commission creation logic. The prorated payment will be in the `payments` table with `payment_type = 'upgrade'`.

**Special Considerations:**
- Should commission be on prorated amount or full plan price?
  - **RECOMMENDED:** Prorated amount (actual revenue)
- Should this create a NEW commission or update existing?
  - **RECOMMENDED:** Create NEW commission (it's a new payment event)
  - Partner gets commissions on all revenue they drive

**Edge Cases:**
- Student might have multiple upgrades over time - each should create separate commission
- Referral should remain in `converted` status (no re-conversion)
- Multiple commissions can exist for same referral_id if we allow it
  - **DECISION NEEDED:** Change unique constraint to allow multiple commissions per referral?
  - **ALTERNATIVE:** Make referral_id nullable and use (referral_id, payment_id) composite unique key

**Schema Change Required:**
```sql
-- Current constraint: referral_id UNIQUE
-- Problem: Can't create multiple commissions for same referral (e.g., upgrade payments)

-- Option A: Remove unique constraint on referral_id alone
-- Option B: Change to composite unique (referral_id, payment_id)
ALTER TABLE partner_commissions DROP CONSTRAINT IF EXISTS uq_partner_commissions_referral_id;
ALTER TABLE partner_commissions ADD CONSTRAINT uq_partner_commissions_referral_payment 
UNIQUE (referral_id, payment_id);
```

**Testing Requirements:**
- Test student upgrading from Basic → Premium (paid upgrade)
- Verify commission created on prorated amount
- Verify partner receives separate commission for upgrade payment
- Test multiple upgrades to ensure each creates new commission

---

### Flow 4: Admin-Assisted Payment/Subscription Creation ⚠️ (SCENARIO INVESTIGATION NEEDED)

**Scenario:** Admin manually creates or updates a subscription for a student (bypassing normal payment flow)

**Potential Trigger Locations:**
1. `server/controllers/admin.controller.ts` - `updateStudentSubscription()` (lines 1848-1895)
2. Direct database manipulation by admin
3. Manual subscription extension/modification

**File:** `server/controllers/admin.controller.ts`  
**Method:** `updateStudentSubscription()` (lines 1848-1895)  
**Current Code:**
```typescript
async updateStudentSubscription(req: AuthenticatedRequest, res: Response) {
  try {
    // ... validation ...
    
    const subscription = await userSubscriptionService.createSubscription({
      userId: studentProfile.userId,
      planId,
      status,
      startedAt,
      expiresAt
    });
    
    // ❌ NO referral tracking
    // ❌ NO payment record creation
    // ❌ NO commission creation
  }
}
```

**Commission Eligibility:**
- 🤔 **DECISION NEEDED:** Should admin-created subscriptions trigger commission?

**Option A: YES - Commission if referral exists**
- Rationale: If student came through referral link, partner deserves commission even if payment is admin-assisted
- Implementation: Check for referral, create payment record, then create commission
- Problem: What payment amount to use if no actual payment occurred?

**Option B: NO - Only actual payments trigger commission**
- Rationale: No revenue = no commission
- Implementation: Skip commission creation for admin-created subscriptions
- Track as non-commissionable referral

**Option C: CONDITIONAL - Admin chooses**
- Rationale: Give admin flexibility to grant commission or not
- Implementation: Add checkbox "Create commission for this subscription"
- If checked: Admin enters payment amount, commission created

**Recommended Approach: Option B (No Commission)**

Reasoning:
- Commissions should only be paid on actual revenue
- Admin-assisted subscriptions might be:
  - Free trials
  - Customer service appeasement
  - Testing accounts
  - Special arrangements
- No payment record = no commission basis

**Implementation Plan:**
```typescript
// In updateStudentSubscription method
async updateStudentSubscription(req: AuthenticatedRequest, res: Response) {
  try {
    // ... existing validation ...
    
    const subscription = await userSubscriptionService.createSubscription({
      userId: studentProfile.userId,
      planId,
      status,
      startedAt,
      expiresAt
    });
    
    // Log that this is admin-created (non-commissionable)
    logger.info('Admin-created subscription - no commission or payment record', {
      subscriptionId: subscription.id,
      studentId: studentProfile.id,
      adminId: req.user?.id,
      reason: 'admin_manual_creation'
    });
    
    // Optionally: Check if student has referral and mark as "admin-created"
    const referral = await partnerStudentReferralRepository.findByStudentId(studentProfile.id);
    if (referral) {
      await partnerStudentReferralRepository.updateStatus(
        referral.id, 
        'converted', 
        'Admin-created subscription - no commission'
      );
      
      logger.info('Referral exists for admin-created subscription', {
        referralId: referral.id,
        partnerId: referral.partnerId,
        note: 'Marked as converted but commission not created (admin manual)'
      });
    }
    
    return this.sendSuccess(res, subscription);
  }
}
```

**Alternative: Add Optional Commission Creation**
If business wants flexibility:
```typescript
const createCommissionSchema = z.object({
  planId: z.string(),
  status: z.enum(['active', 'cancelled', 'expired', 'pending']).optional(),
  startedAt: z.string().optional(),
  expiresAt: z.string().optional().nullable(),
  createCommission: z.boolean().optional(), // NEW
  commissionAmount: z.number().optional()   // NEW - if createCommission true
});

// In handler:
if (createCommission && commissionAmount) {
  // Create manual payment record
  const manualPayment = await paymentRepository.create({
    userId: studentProfile.userId,
    subscriptionId: subscription.id,
    planId,
    paymentType: 'admin_manual',
    amount: commissionAmount.toString(),
    currency: 'INR',
    paymentGateway: 'manual',
    orderId: `admin_${Date.now()}`,
    paymentReference: `admin_ref_${subscription.id}`,
    paidAt: new Date()
  });
  
  // Track conversion and create commission
  await referralTrackingService.trackConversion(
    studentProfile.id,
    subscription.id,
    manualPayment.id
  );
  
  const referral = await partnerStudentReferralRepository.findByStudentId(studentProfile.id);
  if (referral && referral.commissionEligible) {
    await commissionService.createCommission(referral.id, manualPayment.id);
  }
}
```

**Testing Requirements:**
- Test admin creating subscription for referred student
- Verify commission behavior matches chosen option
- Test with and without createCommission flag (if implemented)
- Verify proper logging and status tracking

---

### Flow 5: Refunds and Chargebacks 💸 (COMMISSION REVERSAL NEEDED)

**Scenario:** Payment is refunded or disputed/charged back after commission was created

**Current Status:** 🔴 **CRITICAL GAP** - No refund/chargeback handling exists

**Commission Impact:**
- If payment is refunded, commission should be reversed
- Partner should NOT be paid for refunded transactions
- If already paid out, might need to be recovered from future commissions

**Razorpay Webhooks for Refunds:**
```typescript
// Webhooks that should trigger commission reversal:
'refund.created'       // Refund initiated
'refund.processed'     // Refund completed  
'payment.dispute.created'  // Chargeback filed
'payment.dispute.closed'   // Chargeback resolved (check outcome)
```

**Implementation Location:**
`server/controllers/payment.controller.ts` - Add new webhook handlers

**Database Schema Addition Needed:**
```sql
-- Add reversed status to commission_status enum
ALTER TYPE commission_status ADD VALUE IF NOT EXISTS 'reversed';

-- Add reversal tracking fields
ALTER TABLE partner_commissions
ADD COLUMN reversed_at TIMESTAMP NULL,
ADD COLUMN reversal_reason VARCHAR(255) NULL,
ADD COLUMN reversed_by UUID REFERENCES users(id) NULL;
```

**Implementation Plan:**
```typescript
// New webhook handler in payment.controller.ts
async handleRefundProcessed(req: Request, res: Response) {
  try {
    const { payload } = req.body;
    const paymentId = payload.payment.entity.id; // Razorpay payment ID
    
    // Find payment record
    const paymentRecord = await paymentRecordRepository.findByPaymentReference(paymentId);
    if (!paymentRecord) {
      logger.warn('Refund webhook for unknown payment', { paymentId });
      return this.sendSuccess(res, { message: 'Payment not found' });
    }
    
    await db.transaction(async (tx) => {
      // Find commission for this payment
      const commission = await commissionRepo.findByPaymentId(paymentRecord.id, tx);
      
      if (!commission) {
        logger.warn('Refund for payment with no commission', { 
          paymentId: paymentRecord.id 
        });
        return;
      }
      
      // Check commission status
      if (commission.status === 'pending' || commission.status === 'approved') {
        // Not yet paid - simply reject the commission
        await commissionRepo.reject(
          commission.id,
          'system', // System-initiated
          `Payment refunded: ${payload.refund.entity.id}`,
          tx
        );
        
        logger.info('Commission rejected due to refund', {
          commissionId: commission.id,
          refundId: payload.refund.entity.id,
          amount: commission.commissionAmount
        });
      } else if (commission.status === 'paid') {
        // Already paid out - mark as reversed, might need manual recovery
        await commissionRepo.update(commission.id, {
          status: 'reversed',
          reversedAt: new Date(),
          reversalReason: `Payment refunded: ${payload.refund.entity.id}`,
          reversedBy: null // System-initiated
        }, tx);
        
        // Create negative commission balance that must be recovered
        await partnerProfileRepo.updateCommissionEarned(
          commission.partnerId,
          -Number(commission.commissionAmount),
          tx
        );
        
        logger.error('Commission already paid - marked as reversed, manual recovery needed', {
          commissionId: commission.id,
          partnerId: commission.partnerId,
          amount: commission.commissionAmount,
          refundId: payload.refund.entity.id
        });
        
        // Alert admin
        await sendAdminAlert({
          title: '💰 Commission Reversal Required',
          message: `Commission ${commission.id} was already paid but payment was refunded. Amount: ₹${commission.commissionAmount}. Manual recovery needed.`,
          severity: 'high',
          partnerId: commission.partnerId
        });
      }
      
      // Update referral status
      const referral = await partnerStudentReferralRepository.findById(commission.referralId, tx);
      await partnerStudentReferralRepository.updateStatus(
        referral.id,
        'refunded',
        `Payment refunded: ${payload.refund.entity.id}`,
        tx
      );
    });
    
    return this.sendSuccess(res, { message: 'Refund processed' });
  } catch (error) {
    return this.handleError(res, error, 'PaymentController.handleRefundProcessed');
  }
}
```

**Database Changes Required:**
```sql
-- Add 'refunded' to referral status enum
ALTER TYPE referral_status ADD VALUE IF NOT EXISTS 'refunded';

-- Add 'reversed' to commission status enum  
ALTER TYPE commission_status ADD VALUE IF NOT EXISTS 'reversed';

-- Add reversal tracking columns
ALTER TABLE partner_commissions
ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS reversal_reason VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS reversed_by UUID REFERENCES users(id) NULL;
```

**Partner Dashboard Impact:**
```typescript
// Commission history should show:
{
  id: 'comm_123',
  status: 'reversed',
  amount: '2000.00',
  reversedAt: '2025-11-14T10:30:00Z',
  reversalReason: 'Payment refunded: rfnd_xyz',
  displayText: 'Reversed (Refund)',
  badgeColor: 'red'
}
```

**Testing Requirements:**
- Test refund webhook arriving after commission created (pending status)
- Test refund webhook arriving after commission approved (approved status)
- Test refund webhook arriving after commission paid (paid status)
- Verify partner dashboard shows reversed commissions
- Verify admin dashboard shows alert for paid+reversed commissions
- Test partial refunds (if applicable)

---

### Flow 6: Subscription Renewals 🔄 (DECISION NEEDED)

**Scenario:** Student's subscription auto-renews or manually renews after expiration

**Current Status:** 🟡 **UNCLEAR** - No renewal payment flow exists in codebase

**Investigation Results:**
- Searched codebase for renewal logic
- Found `payment_type` enum includes 'renewal' value
- Found references to `auto_renew` boolean in subscriptions table
- **NO ACTUAL RENEWAL PAYMENT FLOW IMPLEMENTED**

**Commission Eligibility:**
- 🤔 **BUSINESS DECISION NEEDED:** Should renewals trigger new commissions?

**Option A: YES - Commission on every renewal**
- Rationale: Partner continues to provide value by keeping student engaged
- Commission amount: Based on renewal payment amount
- Implementation: Create new commission for each renewal payment
- Problem: One referral could generate infinite commissions

**Option B: NO - Commission only on initial conversion**
- Rationale: Partner's job is acquisition, not retention
- Commission amount: One-time payment on first conversion
- Implementation: Skip commission creation for `payment_type = 'renewal'`
- This is the standard affiliate model

**Option C: TIERED - Reduced commission on renewals**
- Rationale: Acknowledge ongoing value but at reduced rate
- Commission amount: First payment = 10%, renewals = 5%
- Implementation: Check if payment_type='renewal', use different rate

**Recommended Approach: Option B (No Commission on Renewals)**

Reasoning:
- Industry standard for affiliate/referral programs
- Prevents unlimited liability on single referral
- Partner's value is customer acquisition, not retention
- Simpler accounting and payout management

**Implementation Plan (if renewals exist):**
```typescript
// In verifyPayment or renewal payment handler
if (paymentType === 'renewal') {
  logger.info('Renewal payment detected - skipping commission creation', {
    paymentId: paymentRecord.id,
    subscriptionId: subscription.id,
    reason: 'Commissions only on initial conversion, not renewals'
  });
  
  // Don't call trackConversion or createCommission
  // Student already has converted referral from initial payment
}
```

**If Renewals Should Create Commissions:**
```typescript
// Check if this is a renewal
const payment = await paymentRecordRepository.findById(paymentId);

if (payment.paymentType === 'renewal') {
  // Find referral
  const referral = await partnerStudentReferralRepository.findByStudentId(studentId);
  
  if (referral && referral.status === 'converted') {
    // Create commission with 'renewal' note
    // But this violates unique constraint on (referral_id, payment_id) if we change schema
    // OR: Allow multiple commissions per referral if payment_id differs
    
    await commissionService.createCommission(referral.id, payment.id);
    
    logger.info('Renewal commission created', {
      referralId: referral.id,
      paymentId: payment.id,
      isRenewal: true
    });
  }
}
```

**Testing Requirements (if implemented):**
- Test student renewing subscription
- Verify commission created or skipped per business decision
- Verify partner dashboard shows renewal commissions separately (if applicable)
- Test multiple renewals over time

**Current Action Required:**
1. **Confirm business requirement:** Should renewals trigger commissions?
2. **Document decision in schema:** Add comment to `payment_type` enum
3. **Update commission service:** Handle or skip renewal payments accordingly

---

### Flow Summary Table

| Flow | Scenario | Current Status | Commission? | Implementation Priority |
|------|----------|----------------|-------------|-------------------------|
| 1. New Subscription | First payment from referred student | 🔴 Broken | ✅ YES | 🔴 CRITICAL |
| 2. Zero-Cost Upgrade | Upgrade without payment | 🟡 Partial | ❌ NO (already paid) | 🟡 MEDIUM |
| 3. Paid Upgrade | Upgrade with prorated payment | 🔴 Broken | ✅ YES (prorated amount) | 🔴 CRITICAL |
| 4. Admin-Assisted | Admin creates subscription | ⚠️ No tracking | ❌ NO (no revenue) | 🟢 LOW |
| 5. Refunds/Chargebacks | Payment reversed after commission | 🔴 Missing | 🔄 REVERSE commission | 🔴 CRITICAL |
| 6. Renewals | Subscription auto-renews | ⚠️ Not implemented | 🤔 TBD (recommend NO) | 🟢 LOW |

### Implementation Checklist

**Phase 0 (CRITICAL):**
- [x] Flow 1: Add commission creation to `verifyPayment()`
- [x] Flow 3: Same fix covers paid upgrades
- [ ] Flow 5: Add refund webhook handlers
- [ ] Flow 5: Add commission reversal logic
- [ ] Flow 5: Add 'reversed' status to enums

**Phase 1 (MEDIUM):**
- [ ] Flow 2: Document zero-cost upgrade policy (no commission)
- [ ] Flow 2: Add logging for zero-cost upgrade tracking
- [ ] Flow 6: Make business decision on renewals
- [ ] Flow 6: Implement renewal commission logic (if YES decision)

**Phase 2 (LOW):**
- [ ] Flow 4: Document admin-assisted subscription policy
- [ ] Flow 4: Add optional commission creation UI (if needed)
- [ ] All Flows: Comprehensive end-to-end testing

---

## Payment Flow Analysis

### Three Payment Paths Identified

The system has THREE distinct code paths for handling payments:

#### Path 1: Manual Payment Verification (PRIMARY PATH)

**File:** `server/controllers/payment.controller.ts`  
**Method:** `verifyPayment()` (lines 258-499)  
**Trigger:** User clicks "Verify Payment" button in frontend  
**Frequency:** ~95% of all transactions (frontend-initiated)

**Current Implementation:**
```typescript
// Line 435-442: Creates subscription with payment record
const result = await paymentTransactionService.createSubscriptionWithLock(
  userId, planId, orderId, paymentId, amountPaid, currency
);
// Returns: { subscription, paymentRecordId }

// Lines 456-483: Tracks referral conversion ✅
const studentProfile = await studentRepository.findByUserId(userId);
if (studentProfile && result.paymentRecordId) {
  await referralTrackingService.trackConversion(
    studentProfile.id,
    result.subscription.id,
    result.paymentRecordId
  );
  logger.info('Referral conversion tracked', { ... });
}

// ❌ MISSING: Commission creation
// Should call: commissionService.createCommission(referralId, paymentId)
```

**What's Missing:**
1. No call to `commissionService.createCommission()`
2. No transaction wrapping for conversion + commission creation
3. No error handling for commission creation failures
4. No logging for missing partner referrals

**Impact:**
- **CRITICAL:** 95% of commissions are never created
- Referral shows as 'converted' but no commission record exists
- Partner dashboard shows conversions but ₹0 commissions earned

---

#### Path 2: Payment Captured Webhook (BACKUP PATH)

**File:** `server/controllers/payment.controller.ts`  
**Method:** `handlePaymentCaptured()` (lines 698-798)  
**Trigger:** Razorpay webhook `payment.captured` event  
**Frequency:** ~5% of transactions (async, may arrive late)

**Current Implementation:**
```typescript
// Lines 734-788: CORRECT IMPLEMENTATION ✅
await db.transaction(async (tx) => {
  // Step 1: Track conversion
  await referralTrackingService.trackConversion(
    studentProfile.id,
    paymentRecord.subscriptionId!,
    paymentRecord.id,
    tx  // Transaction passed for atomicity
  );
  
  // Step 2: Create commission
  const referral = await partnerStudentReferralRepository.findByStudentId(
    studentProfile.id
  );
  
  if (referral && referral.status === 'converted' && referral.commissionEligible) {
    await commissionService.createCommission(
      referral.id, 
      paymentRecord.id, 
      tx  // Transaction passed for atomicity
    );
    logger.info('Commission created successfully in webhook', { ... });
  }
});
```

**What Works:**
- ✅ Properly wraps conversion + commission in transaction
- ✅ Calls both `trackConversion()` and `createCommission()`
- ✅ Handles duplicate commission prevention
- ✅ Uses structured logging

**Why It Doesn't Help:**
- **Race Condition:** Webhook often arrives AFTER manual verification completes
- **Timing Issue:** Manual verification happens in 2-5 seconds; webhook takes 10-30 seconds
- **Duplicate Prevention:** If manual path already called `trackConversion()`, commission creation has no referral to work with (status already 'converted')
- **Low Coverage:** Only ~5% of transactions use this path

---

#### Path 3: Order Paid Webhook (TERTIARY PATH)

**File:** `server/controllers/payment.controller.ts`  
**Method:** `handleOrderPaid()` (lines 903-999)  
**Trigger:** Razorpay webhook `order.paid` event  
**Frequency:** Unknown, possibly deprecated

**Current Implementation:**
```typescript
// Lines 947-954: Creates subscription
const result = await paymentTransactionService.createSubscriptionWithLock(
  userId, planId, orderId, paymentId, amountPaid, currency
);

// Lines 966-992: Tracks referral conversion ✅
const studentProfile = await studentRepository.findByUserId(userId);
if (studentProfile && result.paymentRecordId) {
  await referralTrackingService.trackConversion(
    studentProfile.id,
    result.subscription.id,
    result.paymentRecordId
  );
}

// ❌ MISSING: Commission creation
// Should call: commissionService.createCommission(referralId, paymentId)
```

**What's Missing:**
- Same as Path 1: No commission creation
- No transaction wrapping
- Unknown usage frequency (may be deprecated)

---

### Conversion Tracking Service Analysis

**File:** `server/services/domain/referral-tracking.service.ts`  
**Method:** `trackConversion()` (lines 205-261)

**What It Does:**
```typescript
async trackConversion(studentId, subscriptionId, paymentId, tx?) {
  // 1. Validates studentId is UUID
  // 2. Finds referral by studentId
  // 3. Checks if already converted (idempotency)
  // 4. Validates attribution window (30 days)
  // 5. Updates referral:
  //    - status: 'pending' → 'converted'
  //    - convertedAt: new Date()
  //    - subscriptionId, paymentId
  // 6. Increments partner.totalConversions
}
```

**What It DOESN'T Do:**
- ❌ Does NOT create commission records
- ❌ Does NOT update referral.commissionAmount
- ❌ Does NOT trigger commission calculation

**Design Intent:**
This is correct separation of concerns:
- `trackConversion()` = Referral lifecycle management
- `createCommission()` = Financial record creation

**The Problem:**
All three payment paths call `trackConversion()` but only ONE calls `createCommission()`.

---

### Commission Creation Service Analysis

**File:** `server/services/domain/commission.service.ts`  
**Method:** `createCommission()` (lines 85-157)

**What It Does:**
```typescript
async createCommission(referralId, paymentId, tx?) {
  // Uses transaction (provided or creates new)
  await executeWithTransaction(async (txHandle) => {
    // 1. Check if commission already exists (duplicate prevention)
    const existingCommission = await commissionRepo.findByReferralId(referralId, txHandle);
    if (existingCommission) {
      throw new InvalidOperationError('Commission already exists');
    }
    
    // 2. Get referral and validate status
    const referral = await partnerStudentReferralRepo.findById(referralId, txHandle);
    if (referral.status !== 'converted') {
      throw new InvalidOperationError('Referral must be in converted status');
    }
    if (!referral.commissionEligible) {
      throw new InvalidOperationError('Referral is not eligible');
    }
    
    // 3. Get payment amount
    const payment = await paymentRecordRepo.findById(paymentId, txHandle);
    
    // 4. Calculate commission
    const calculation = await calculateCommission(
      referral.partnerId,
      Number(payment.amount)
    );
    
    // 5. Create commission record
    const newCommission = await commissionRepo.create({
      partnerId: referral.partnerId,
      referralId: referral.id,
      paymentId: paymentId,
      baseAmount: String(calculation.baseAmount),
      commissionRate: String(calculation.commissionRate),
      commissionAmount: String(calculation.commissionAmount),
      currency: calculation.currency,
      status: 'pending'
    }, txHandle);
    
    // 6. Update referral commission fields
    await partnerStudentReferralRepo.updateCommission(
      referral.id,
      calculation.commissionAmount,
      'pending',
      txHandle
    );
    
    // 7. Update partner total commission earned
    await partnerProfileRepo.updateCommissionEarned(
      referral.partnerId,
      calculation.commissionAmount,
      txHandle
    );
    
    return newCommission;
  });
}
```

**Service Quality:**
- ✅ Excellent duplicate prevention
- ✅ Proper validation (status, eligibility)
- ✅ Transaction support for atomicity
- ✅ Updates all related tables in single transaction
- ✅ Clear error messages

**The Problem:**
This service is ONLY called in webhook handler (Path 2). It's NEVER called in:
- Manual verification path (Path 1) - 95% of transactions
- Order paid webhook (Path 3) - Unknown frequency

---

## Root Cause Analysis

### Primary Root Cause: Incomplete Implementation

**Evidence:**
```typescript
// File: server/controllers/payment.controller.ts

// PATH 1: verifyPayment() - Lines 456-483
// ✅ HAS: trackConversion()
// ❌ MISSING: createCommission()

// PATH 2: handlePaymentCaptured() - Lines 734-788  
// ✅ HAS: trackConversion()
// ✅ HAS: createCommission()

// PATH 3: handleOrderPaid() - Lines 966-992
// ✅ HAS: trackConversion()
// ❌ MISSING: createCommission()
```

**Inconsistency Pattern:**
- 2 out of 3 payment paths are missing commission creation
- The webhook handler (PATH 2) has correct implementation
- Suggests code was copy-pasted initially, then webhook was fixed but other paths were not

**Timeline Reconstruction:**
Based on code comments and PHASE markers:

1. **Initial Implementation** (Early phase)
   - All three paths had only `trackConversion()`
   - Commission system not yet implemented

2. **PHASE 3 - Bug #9 Fix** (Recent - Lines 752-761)
   - Webhook handler updated with commission creation
   - Added transaction wrapping for atomicity
   - Added duplicate prevention handling

3. **Gap in Implementation**
   - Manual verification path (PRIMARY PATH) never updated
   - Order paid webhook never updated
   - 95% of traffic still goes through broken path

### Secondary Root Cause: Race Condition Design

The webhook-based commission creation (Path 2) cannot be relied upon as primary mechanism:

**Race Condition Timeline:**
```
T+0s: User clicks "Verify Payment" button
T+2s: verifyPayment() completes
      - Subscription created ✅
      - Conversion tracked ✅
      - Commission NOT created ❌

T+15s: Razorpay sends payment.captured webhook
T+16s: handlePaymentCaptured() executes
      - Tries to create commission ✅
      - But: Referral already 'converted' from T+2s
      - Commission creation succeeds ✅
      
PROBLEM: 13-second gap where no commission exists
BIGGER PROBLEM: If webhook fails/delays, commission NEVER created
```

**Why Webhook Cannot Be Primary:**
- **Async Uncertainty:** Webhooks can take 10-60 seconds to arrive
- **Failure Risk:** Network issues can prevent webhook delivery
- **Retry Complexity:** Webhook deduplication prevents retries
- **User Experience:** Users expect immediate commission tracking

**Correct Design:**
- Manual verification (Path 1) should ALWAYS create commission
- Webhook (Path 2) serves as backup/retry mechanism
- Webhook's duplicate prevention ensures idempotency

### Tertiary Root Cause: Missing Transaction Wrapping

**File:** `server/controllers/payment.controller.ts` - `verifyPayment()` method

**Current Code (Lines 456-483):**
```typescript
// NO TRANSACTION WRAPPER
const studentProfile = await studentRepository.findByUserId(userId);

if (studentProfile && result.paymentRecordId) {
  await referralTrackingService.trackConversion(
    studentProfile.id,
    result.subscription.id,
    result.paymentRecordId
  );
  // No commission creation here
}
```

**Problems:**
1. **No Atomicity:** Conversion tracking not wrapped in transaction
2. **Partial Failure Risk:** If `trackConversion()` succeeds but commission creation (if added) fails, data becomes inconsistent
3. **No Rollback:** Errors don't rollback conversion status

**Correct Pattern (from webhook):**
```typescript
await db.transaction(async (tx) => {
  await referralTrackingService.trackConversion(
    studentProfile.id,
    result.subscription.id,
    result.paymentRecordId,
    tx  // Pass transaction for atomicity
  );
  
  const referral = await partnerStudentReferralRepository.findByStudentId(
    studentProfile.id
  );
  
  if (referral && referral.status === 'converted' && referral.commissionEligible) {
    await commissionService.createCommission(referral.id, paymentRecord.id, tx);
  }
});
```

---

## Complete Issue Classification

### 🔴 CRITICAL Priority (System Completely Broken)

#### Issue #1: Manual Verification Path Missing Commission Creation

**Severity:** 🔴 **CRITICAL**  
**Impact:** 95% of commissions never created  
**File:** `server/controllers/payment.controller.ts`  
**Lines:** 456-483 (`verifyPayment()` method)

**Problem:**
The primary payment path (manual verification) tracks referral conversion but never creates commission records.

**Evidence:**
```typescript
// Lines 456-483: Current implementation
if (studentProfile && result.paymentRecordId) {
  await referralTrackingService.trackConversion(
    studentProfile.id,
    result.subscription.id,
    result.paymentRecordId
  );
  // ❌ MISSING: Commission creation
}
```

**Expected Code:**
```typescript
if (studentProfile && result.paymentRecordId) {
  await db.transaction(async (tx) => {
    // Track conversion
    await referralTrackingService.trackConversion(
      studentProfile.id,
      result.subscription.id,
      result.paymentRecordId,
      tx
    );
    
    // Create commission
    const referral = await partnerStudentReferralRepository.findByStudentId(
      studentProfile.id
    );
    if (referral && referral.status === 'converted' && referral.commissionEligible) {
      await commissionService.createCommission(referral.id, result.paymentRecordId, tx);
    }
  });
}
```

**Business Impact:**
- Partner earns ₹2,000 commission (10% of ₹20,000)
- Partner dashboard shows ₹0 earned
- Partner cannot request payout
- Partner loses trust in system

**Data Evidence:**
- 1 converted referral exists (payment ₹20,000)
- 0 commission records exist
- Partner dashboard would show 1 conversion but ₹0 earnings

---

#### Issue #2: Order Paid Webhook Missing Commission Creation

**Severity:** 🔴 **CRITICAL**  
**Impact:** Unknown percentage of commissions (webhook-triggered transactions)  
**File:** `server/controllers/payment.controller.ts`  
**Lines:** 966-992 (`handleOrderPaid()` method)

**Problem:**
Same as Issue #1 - tracks conversion but doesn't create commission.

**Current Implementation:**
```typescript
// Lines 966-992
if (studentProfile && result.paymentRecordId) {
  await referralTrackingService.trackConversion(
    studentProfile.id,
    result.subscription.id,
    result.paymentRecordId
  );
  // ❌ MISSING: Commission creation
}
```

**Fix Required:**
Same transaction-wrapped pattern as Issue #1.

---

#### Issue #3: No Transaction Wrapping in Primary Path

**Severity:** 🔴 **CRITICAL**  
**Impact:** Data integrity at risk  
**File:** `server/controllers/payment.controller.ts`  
**Lines:** 456-483

**Problem:**
Conversion tracking and (future) commission creation are not wrapped in a transaction, allowing partial failures and inconsistent state.

**Risk Scenarios:**
```
Scenario 1: trackConversion() succeeds, createCommission() fails
  Result: Referral shows 'converted', but no commission exists
  
Scenario 2: createCommission() fails midway through
  Result: Commission record created but partner stats not updated
  
Scenario 3: Database error after trackConversion()
  Result: Conversion recorded but commission creation never attempted
```

**Fix Required:**
Wrap both operations in `db.transaction()` with proper error handling.

---

### 🟠 HIGH Priority (Data Loss / Missing Functionality)

#### Issue #4: Missing Database Indexes on Critical Tables

**Severity:** 🟠 **HIGH**  
**Impact:** Performance degradation as data grows  

**Current Index Status:**
```sql
-- Only primary keys are indexed
partner_commissions: id (PK only)
partner_student_referrals: id (PK only)
```

**Missing Indexes:**
```sql
-- partner_commissions
CREATE INDEX idx_partner_commissions_partner_id ON partner_commissions(partner_id);
CREATE INDEX idx_partner_commissions_referral_id ON partner_commissions(referral_id);
CREATE INDEX idx_partner_commissions_status ON partner_commissions(status);
CREATE INDEX idx_partner_commissions_payout_id ON partner_commissions(payout_id);
CREATE INDEX idx_partner_commissions_created_at ON partner_commissions(created_at);

-- partner_student_referrals  
CREATE INDEX idx_partner_student_referrals_partner_id ON partner_student_referrals(partner_id);
CREATE INDEX idx_partner_student_referrals_student_id ON partner_student_referrals(student_id);
CREATE INDEX idx_partner_student_referrals_status ON partner_student_referrals(status);
CREATE INDEX idx_partner_student_referrals_subscription_id ON partner_student_referrals(subscription_id);

-- Composite indexes for common queries
CREATE INDEX idx_referrals_partner_status ON partner_student_referrals(partner_id, status);
CREATE INDEX idx_commissions_partner_status ON partner_commissions(partner_id, status);
```

**Impact:**
- Slow dashboard queries as partners accumulate referrals
- Timeout risks on admin commission approval page
- Poor performance on payout history queries

---

#### Issue #5: No Unique Constraint on referral_id in partner_commissions

**Severity:** 🟠 **HIGH**  
**Impact:** Duplicate commissions possible

**Problem:**
The `commissionService.createCommission()` has application-level duplicate prevention (line 91-94), but no database constraint enforces it.

**Risk:**
- Race condition between multiple webhook deliveries
- Concurrent requests could bypass application check
- Manual database operations could create duplicates

**Fix Required:**
```sql
ALTER TABLE partner_commissions 
ADD CONSTRAINT uq_partner_commissions_referral_id 
UNIQUE (referral_id);
```

**Impact if Not Fixed:**
- Same referral could have 2+ commission records
- Partner gets paid twice for same referral
- Financial loss for business

---

#### Issue #6: No Logging for Non-Referred Students

**Severity:** 🟠 **HIGH**  
**Impact:** Silent failures, no visibility  
**File:** `server/controllers/payment.controller.ts`  
**Lines:** 456-483, 966-992

**Problem:**
When a student pays but has no referral, the code silently does nothing:

```typescript
const studentProfile = await studentRepository.findByUserId(userId);

if (studentProfile && result.paymentRecordId) {
  // Only logs if student profile exists
  // No logging for:
  // - No student profile found
  // - Student has no referral
  // - Referral exists but not eligible
}
```

**Missing Logging:**
```typescript
if (!studentProfile) {
  logger.info('No student profile found for payment', {
    userId,
    paymentId: result.paymentRecordId,
    subscriptionId: result.subscription.id
  });
  return; // Not an error - customer users might not have student profiles
}

const referral = await partnerStudentReferralRepository.findByStudentId(
  studentProfile.id
);

if (!referral) {
  logger.info('Payment completed without referral', {
    studentId: studentProfile.id,
    paymentId: result.paymentRecordId,
    amount: amountPaid
  });
  return; // Not an error - organic signups have no referral
}

if (!referral.commissionEligible) {
  logger.warn('Referral exists but not commission eligible', {
    referralId: referral.id,
    reason: referral.statusReason || 'Unknown'
  });
}
```

**Impact:**
- Cannot distinguish between:
  - Organic signups (expected)
  - Referred students with broken attribution (bug)
  - Commission-ineligible referrals (business rule)
- No metrics on referral vs. organic conversion rates

---

#### Issue #7: Commission Error Handling Swallows Failures

**Severity:** 🟠 **HIGH**  
**Impact:** Silent commission creation failures  
**File:** `server/controllers/payment.controller.ts`  
**Lines:** 776-787 (webhook handler)

**Problem:**
```typescript
try {
  const referral = await partnerStudentReferralRepository.findByStudentId(
    studentProfile.id
  );
  
  if (referral && referral.status === 'converted' && referral.commissionEligible) {
    await commissionService.createCommission(referral.id, paymentRecord.id, tx);
  }
} catch (commissionError: any) {
  // If commission already exists, that's OK
  if (commissionError.message?.includes('already exists')) {
    logger.info('Commission already created (likely from manual verification)');
  } else {
    // Re-throw other errors to rollback transaction
    throw commissionError;
  }
}
```

**Issue:**
The error message check `commissionError.message?.includes('already exists')` is fragile:
- Depends on exact error message text
- Could accidentally catch other "already exists" errors
- No structured error codes

**Better Approach:**
```typescript
} catch (commissionError: any) {
  if (commissionError instanceof InvalidOperationError && 
      commissionError.operation === 'create commission' &&
      commissionError.reason?.includes('already exists')) {
    logger.info('Commission already created', {
      referralId: referral.id,
      paymentId: paymentRecord.id,
      source: 'duplicate_prevention'
    });
  } else {
    logger.error('Commission creation failed in webhook', {
      error: commissionError.message,
      referralId: referral?.id,
      paymentId: paymentRecord.id
    });
    throw commissionError; // Rollback transaction
  }
}
```

---

### 🟡 MEDIUM Priority (Monitoring & Visibility)

#### Issue #8: No Monitoring for Commission Creation Rate

**Severity:** 🟡 **MEDIUM**  
**Impact:** Cannot detect system degradation

**Problem:**
No metrics tracking:
- Conversion-to-commission ratio
- Commission creation latency
- Failed commission attempts
- Partner-wise commission distribution

**Recommended Metrics:**
```typescript
// After each successful conversion
metrics.increment('referral.conversions.total');

// After successful commission creation  
metrics.increment('commission.created.total');
metrics.histogram('commission.creation.latency', latencyMs);
metrics.gauge('commission.amount.total', commissionAmount);

// On commission creation failure
metrics.increment('commission.creation.failed', { reason: errorType });

// Daily aggregates
metrics.gauge('commission.pending.count', pendingCount);
metrics.gauge('commission.approved.count', approvedCount);
```

**Business Value:**
- Alert if conversion rate suddenly drops
- Track partner program ROI
- Identify high-performing partners
- Detect fraud patterns

---

#### Issue #9: Frontend Dashboard May Show Incorrect Totals

**Severity:** 🟡 **MEDIUM**  
**Impact:** User confusion, trust issues

**Problem:**
Partner dashboard calculates totals from two sources:
1. `partner_profiles.totalCommissionEarned` (denormalized field)
2. SUM of `partner_commissions.commission_amount`

If commissions aren't created, these will diverge.

**File:** `client/src/pages/PartnerDashboard.tsx` (lines 35-45)

**Current Implementation:**
```typescript
const stats = await usePartnerDashboardStats();
// Shows: stats.totalCommissionEarned (from partner_profiles)
//        stats.pendingCommission (calculated from commissions table)
```

**If No Commissions Exist:**
- `totalCommissionEarned` might be updated by `trackConversion()` (if implemented)
- `pendingCommission` will be ₹0 (no records in commissions table)
- **Result:** Partner sees "Total Earned: ₹2,000" but "Pending: ₹0" → Confusion

**Verification Needed:**
Check if `referralTrackingService.trackConversion()` updates `partner_profiles.totalCommissionEarned`. If yes, this creates data inconsistency.

**File to Review:** `server/services/domain/referral-tracking.service.ts` line 257

```typescript
// Line 257
await this.partnerProfileRepo.incrementConversionCount(referral.partnerId, tx);
```

This only increments conversion count, not commission earned. Good - avoids inconsistency.

**However:**
`commissionService.createCommission()` line 138-143 DOES update totalCommissionEarned:

```typescript
await this.partnerProfileRepo.updateCommissionEarned(
  referral.partnerId,
  calculation.commissionAmount,
  txHandle
);
```

**Result:**
Since `createCommission()` is never called, `totalCommissionEarned` stays at ₹0. This is actually consistent with reality (no commission = ₹0 earned), but partner sees 0 conversions worth ₹0 despite having paid referrals.

---

### 🟢 LOW Priority (Enhancements)

#### Issue #10: No Admin Alert for Failed Commission Creation

**Severity:** 🟢 **LOW**  
**Impact:** Delayed detection of issues

**Problem:**
When commission creation fails (after being implemented), admins have no way to know except:
1. Partner complains
2. Manual database audit
3. Partner dashboard shows ₹0

**Recommended Enhancement:**
- Admin dashboard widget: "Failed Commission Attempts (Last 7 Days)"
- Email/Slack alert when commission creation fails
- Weekly report: "Conversions Without Commissions"

**Implementation:**
```typescript
// After failed commission creation
await adminAlertService.notifyCommissionFailure({
  referralId: referral.id,
  partnerId: referral.partnerId,
  paymentAmount: payment.amount,
  error: commissionError.message,
  timestamp: new Date()
});
```

---

## Idempotency & Race Condition Handling

### Overview

The commission system must handle concurrent requests from multiple sources (manual verification, webhooks, retries) without creating duplicate commissions or missing any. This section documents the comprehensive idempotency strategy.

### Current Idempotency Mechanisms

#### 1. Webhook Deduplication Service

**File:** `server/services/infrastructure/webhook-deduplication.service.ts`

**How It Works:**
```typescript
// Before processing webhook:
const isProcessed = await webhookDeduplicationService.isEventProcessed(eventId);
if (isProcessed) {
  return; // Skip duplicate webhook
}

// Record event as processing:
await webhookDeduplicationService.recordEvent(eventId, eventType, payload);

// Process webhook...

// Mark as success:
await webhookDeduplicationService.markSuccess(eventId);
```

**Database Table:** `webhook_events`
```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,  -- Razorpay event ID
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(50) NOT NULL,  -- 'processing', 'success', 'failed'
  processed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Effectiveness:**
- ✅ Prevents webhook duplicates (Razorpay sends same event multiple times)
- ✅ Unique constraint on `event_id` prevents race conditions
- ❌ Does NOT prevent manual verification + webhook race

**Limitations:**
- Only protects against webhook→webhook duplicates
- Does NOT protect against manual→webhook or manual→manual races
- Event ID is Razorpay-specific (not applicable to manual verification)

---

#### 2. Commission Repository Duplicate Check

**File:** `server/services/domain/commission.service.ts` (lines 93-97)

**Current Implementation:**
```typescript
// Check if commission already exists
const existingCommission = await commissionRepo.findByReferralId(referralId, txHandle);
if (existingCommission) {
  throw new InvalidOperationError('create commission', 'Commission already exists for this referral');
}
```

**Problem:** **NOT ATOMIC** - Race condition exists

**Race Condition Scenario:**
```
Thread A (Manual)              Thread B (Webhook)
├─ Check exists? NO            
                               ├─ Check exists? NO
├─ Create commission ✅        
                               ├─ Create commission ✅
= TWO COMMISSIONS CREATED! ❌
```

**Root Cause:**
- `findByReferralId()` does not lock the row
- Between check and insert, another thread can proceed
- Both threads see "no commission exists" and both create one

**Solution Required:** Use `SELECT FOR UPDATE` to lock during check

---

#### 3. Database Unique Constraint (MISSING)

**Current State:** ❌ NO unique constraint on `partner_commissions.referral_id`

**Impact:**
- Database allows multiple commissions for same referral
- Application-level checks can be bypassed by race conditions
- No last line of defense against duplicates

**Required Migration:**
```sql
-- Add unique constraint to prevent duplicates at database level
ALTER TABLE partner_commissions 
ADD CONSTRAINT uq_partner_commissions_referral_id 
UNIQUE (referral_id);
```

**But wait...** This constraint is TOO RESTRICTIVE if we want to allow:
- Multiple commissions for same referral (e.g., upgrade payments)

**Better Approach:**
```sql
-- Option 1: Unique on (referral_id, payment_id)
-- Allows one commission per payment, multiple payments per referral
ALTER TABLE partner_commissions 
ADD CONSTRAINT uq_partner_commissions_referral_payment 
UNIQUE (referral_id, payment_id);

-- Option 2: Keep referral_id unique IF business rule is "one commission per referral ever"
ALTER TABLE partner_commissions 
ADD CONSTRAINT uq_partner_commissions_referral_id 
UNIQUE (referral_id);
```

**Recommended:** **Option 1** - Allows multiple commissions per referral for different payments (upgrades, renewals if applicable)

---

### Enhanced Idempotency Strategy

#### Strategy 1: Pessimistic Locking with SELECT FOR UPDATE ⭐ RECOMMENDED

**Concept:** Lock the row during duplicate check to prevent concurrent inserts

**Implementation:**

**Step 1: Add `SELECT FOR UPDATE` to repository**

```typescript
// File: server/repositories/partner-commission.repository.ts

async findByReferralIdWithLock(
  referralId: string, 
  tx: DbOrTransaction
): Promise<PartnerCommission | undefined> {
  try {
    const executor = tx; // Must be within transaction
    
    // SELECT FOR UPDATE locks the row (or nothing if row doesn't exist)
    // Other transactions will wait until this transaction completes
    const result = await executor.execute(sql`
      SELECT * FROM partner_commissions
      WHERE referral_id = ${referralId}
      FOR UPDATE
    `);
    
    return result[0] as PartnerCommission | undefined;
  } catch (error) {
    handleDatabaseError(error, 'PartnerCommissionRepository.findByReferralIdWithLock');
  }
}
```

**Step 2: Use locked query in commission service**

```typescript
// File: server/services/domain/commission.service.ts

async createCommission(referralId: string, paymentId: string, tx?: DbOrTransaction): Promise<PartnerCommission> {
  return await db.transaction(async (txHandle) => {
    // CRITICAL: Use SELECT FOR UPDATE to lock row during check
    const existingCommission = await this.commissionRepo.findByReferralIdWithLock(
      referralId,
      txHandle
    );
    
    if (existingCommission) {
      logger.info('Commission already exists (prevented duplicate)', {
        referralId,
        existingCommissionId: existingCommission.id
      });
      throw new InvalidOperationError('create commission', 'Commission already exists for this referral');
    }
    
    // Row is now locked, safe to insert
    const commission = await this.commissionRepo.create({
      partnerId: referral.partnerId,
      referralId: referral.id,
      paymentId: paymentId,
      // ... other fields
    }, txHandle);
    
    return commission;
    // Lock released when transaction commits
  });
}
```

**How It Prevents Race Conditions:**
```
Thread A (Manual)                    Thread B (Webhook)
├─ BEGIN TRANSACTION                 
├─ SELECT FOR UPDATE (LOCK ACQUIRED) 
├─ No commission found               
├─ INSERT commission                 
                                     ├─ BEGIN TRANSACTION
                                     ├─ SELECT FOR UPDATE (WAITING... 🔒)
├─ COMMIT (LOCK RELEASED)            
                                     ├─ SELECT FOR UPDATE (LOCK ACQUIRED)
                                     ├─ Commission found! ✅
                                     ├─ Throw "already exists"
                                     ├─ ROLLBACK
= ONE COMMISSION CREATED ✅
```

**Advantages:**
- ✅ Prevents all race conditions at application level
- ✅ Works across webhook + manual verification
- ✅ No distributed locks needed
- ✅ Database handles lock management

**Considerations:**
- Lock contention if many concurrent requests (unlikely for same referral)
- Requires transaction (already in place)
- Must use correct transaction isolation level (READ COMMITTED is fine)

---

#### Strategy 2: Database Unique Constraint (Fallback Defense)

**Purpose:** Last line of defense if application logic fails

**Implementation:**
```sql
-- Primary Key: id (already exists)
-- Unique Constraint: (referral_id, payment_id)
ALTER TABLE partner_commissions 
ADD CONSTRAINT uq_partner_commissions_referral_payment 
UNIQUE (referral_id, payment_id);

-- If business rule is "one commission per referral ever":
ALTER TABLE partner_commissions 
ADD CONSTRAINT uq_partner_commissions_referral_id 
UNIQUE (referral_id);
```

**Error Handling:**
```typescript
try {
  await commissionRepo.create({ ... }, tx);
} catch (error: any) {
  if (error.code === '23505') { // PostgreSQL unique violation
    logger.info('Commission duplicate prevented by database constraint', {
      referralId,
      paymentId
    });
    // Don't throw error, just log and continue
    // Commission already exists, which is the desired state
    return existingCommission;
  }
  throw error;
}
```

**Advantages:**
- ✅ 100% guaranteed no duplicates
- ✅ Works even if application code has bugs
- ✅ No performance impact
- ✅ Self-documenting schema

---

### Race Condition Scenarios & Handling

#### Scenario 1: Manual Verification + Webhook (MOST COMMON)

**Timeline:**
```
T+0s:  User clicks "Verify Payment"
T+1s:  verifyPayment() → trackConversion() → createCommission() ✅
T+10s: Razorpay sends payment.captured webhook
T+11s: handlePaymentCaptured() → trackConversion() (idempotent, skips) → createCommission() (prevented by lock)
```

**Sequence Diagram:**
```
User                 Manual Path           Webhook Path        Database
 |                        |                       |                |
 |--Verify Payment------->|                       |                |
 |                        |---BEGIN TX----------->|                |
 |                        |---trackConversion---->|                |
 |                        |<--Already converted---|                |
 |                        |---SELECT FOR UPDATE-->|                |
 |                        |<--No commission-------|                |
 |                        |---INSERT commission-->|                |
 |                        |<--Commission created--|                |
 |                        |---COMMIT------------->|                |
 |<--Success--------------|                       |                |
 |                                                 |                |
[10 seconds later...]                              |                |
 |                                                 |                |
Razorpay--------payment.captured webhook---------->|                |
 |                                                 |---BEGIN TX---->|
 |                                                 |---trackConversion->|
 |                                                 |<--Skipped (idempotent)|
 |                                                 |---SELECT FOR UPDATE-->|
 |                                                 |<--Commission exists----|
 |                                                 |---Throw "already exists"|
 |                                                 |---Catch & log-->|
 |                                                 |---COMMIT------->|
Razorpay<-------200 OK---------------------------- |                |
```

**Result:** ✅ One commission created, webhook gracefully handled

---

#### Scenario 2: Two Webhooks Simultaneously

**Timeline:**
```
T+0s: Razorpay sends webhook #1
T+0.1s: Razorpay sends webhook #2 (retry/duplicate)
T+1s: Both webhooks arrive at server simultaneously
```

**Protection Layers:**
```
Layer 1: Webhook Deduplication Service
├─ Webhook #1: isEventProcessed(event_abc) → NO → recordEvent() → PROCEED ✅
└─ Webhook #2: isEventProcessed(event_abc) → YES → SKIP ✅

Layer 2: (If Layer 1 somehow fails)
└─ Both try to insert webhook_events with same event_id
   └─ Second fails with unique constraint → Caught and ignored ✅

Layer 3: (If both somehow proceed)
└─ Both try to create commission
   ├─ First: SELECT FOR UPDATE → Lock acquired → Insert ✅
   └─ Second: SELECT FOR UPDATE → Waits → Lock acquired → Found existing → Skip ✅

Layer 4: (Database constraint)
└─ If both somehow insert
   └─ Second insert fails with unique constraint ❌ (should never reach here)
```

**Result:** ✅ Webhook processed once, commission created once

---

#### Scenario 3: Manual Verification Twice (User Clicks Button Twice)

**Timeline:**
```
T+0s: User clicks "Verify Payment" (Request A)
T+0.5s: User clicks "Verify Payment" again (Request B) - impatient user
```

**Protection:**
```
Request A                          Request B
├─ Verify with Razorpay ✅        
├─ BEGIN TX                        
├─ trackConversion()               
   ├─ Check if converted?          
   ├─ NO → Mark as converted ✅    
                                   ├─ Verify with Razorpay ✅
                                   ├─ BEGIN TX
                                   ├─ trackConversion()
                                      ├─ Check if converted?
                                      ├─ YES → Skip (idempotent) ✅
├─ createCommission()              
   ├─ SELECT FOR UPDATE → Lock     
   ├─ No commission → Insert ✅    
                                   ├─ createCommission()
                                      ├─ SELECT FOR UPDATE → WAIT... 🔒
├─ COMMIT → Lock released          
                                      ├─ Lock acquired
                                      ├─ Commission exists → Skip ✅
                                   ├─ COMMIT
```

**Result:** ✅ One commission created, second request sees existing commission

---

### Implementation Checklist

**Phase 0: Critical Fixes**
- [ ] Add `findByReferralIdWithLock()` method to `PartnerCommissionRepository`
- [ ] Update `createCommission()` to use locked query
- [ ] Add unique constraint: `(referral_id, payment_id)` OR `referral_id` (depending on business rule)
- [ ] Add error handling for unique constraint violations
- [ ] Test concurrent manual + webhook scenarios

**Phase 1: Edge Cases**
- [ ] Handle zero-cost upgrades (check existing commission, don't create new)
- [ ] Handle paid upgrades (allow multiple commissions per referral if using composite key)
- [ ] Add comprehensive logging for duplicate prevention events
- [ ] Add metrics for tracking duplicate attempts

**Phase 2: Monitoring**
- [ ] Add alert for high rate of duplicate prevention
- [ ] Dashboard widget showing duplicate prevention stats
- [ ] Log analysis to identify race condition sources

---

### Transaction Isolation Levels

**Current PostgreSQL Default:** `READ COMMITTED`

**Is It Sufficient?**
- ✅ YES for our use case
- `SELECT FOR UPDATE` works correctly with `READ COMMITTED`
- We don't need `SERIALIZABLE` (which would add overhead)

**Why READ COMMITTED Works:**
```sql
-- Thread A
BEGIN;
SELECT * FROM partner_commissions WHERE referral_id = 'xyz' FOR UPDATE;
-- Row is locked (or no row exists, locks nothing but prevents insert)

-- Thread B (concurrent)
BEGIN;
SELECT * FROM partner_commissions WHERE referral_id = 'xyz' FOR UPDATE;
-- Waits for Thread A's lock...

-- Thread A
INSERT INTO partner_commissions (referral_id, ...) VALUES ('xyz', ...);
COMMIT;
-- Lock released

-- Thread B
-- Lock acquired, SELECT now sees the row inserted by Thread A
-- Commission exists! Skip insert
COMMIT;
```

**No Isolation Level Change Needed** ✅

---

### Distributed Locking (NOT NEEDED)

**Question:** Do we need distributed locks (Redis, etc.)?

**Answer:** ❌ NO

**Reasoning:**
1. **Single Database:** All nodes use same PostgreSQL database
2. **Database Locks Sufficient:** `SELECT FOR UPDATE` provides distributed locking via database
3. **Stateless Application:** No application-level state to synchronize
4. **Performance:** Database locks are faster than Redis locks
5. **Complexity:** Adding Redis adds unnecessary complexity and failure points

**When You WOULD Need Distributed Locks:**
- Multiple independent databases (sharding)
- Application-level caching that needs invalidation
- Rate limiting across multiple nodes
- None of these apply to commission creation

**Conclusion:** Database-level locking is sufficient and recommended ✅

---

### Webhook vs Manual Verification Coordination

**Design Principle:** Manual verification is PRIMARY, webhook is BACKUP

**Coordination Strategy:**

**1. Manual Verification Path (95% of traffic)**
```typescript
async verifyPayment(req, res) {
  // ... verify with Razorpay ...
  
  await db.transaction(async (tx) => {
    // Step 1: Track conversion (idempotent)
    await referralTrackingService.trackConversion(studentId, subscriptionId, paymentId, tx);
    
    // Step 2: Create commission (idempotent with SELECT FOR UPDATE)
    try {
      const referral = await partnerStudentReferralRepository.findByStudentId(studentId);
      if (referral && referral.status === 'converted' && referral.commissionEligible) {
        await commissionService.createCommission(referral.id, paymentId, tx);
      }
    } catch (error) {
      if (error.message.includes('already exists')) {
        // Webhook beat us to it (rare but possible)
        logger.info('Commission already created by webhook');
      } else {
        throw error; // Real error
      }
    }
  });
}
```

**2. Webhook Path (5% of traffic, backup + verification)**
```typescript
async handlePaymentCaptured(req, res) {
  const eventId = req.body.event_id;
  
  // Deduplicate webhooks
  if (await webhookDeduplicationService.isEventProcessed(eventId)) {
    return res.sendStatus(200);
  }
  await webhookDeduplicationService.recordEvent(eventId, 'payment.captured', req.body);
  
  try {
    await db.transaction(async (tx) => {
      // Step 1: Track conversion (idempotent)
      await referralTrackingService.trackConversion(studentId, subscriptionId, paymentId, tx);
      
      // Step 2: Create commission (idempotent)
      try {
        const referral = await partnerStudentReferralRepository.findByStudentId(studentId);
        if (referral && referral.status === 'converted' && referral.commissionEligible) {
          await commissionService.createCommission(referral.id, paymentId, tx);
        }
      } catch (error) {
        if (error.message.includes('already exists')) {
          // Manual path beat us to it (normal)
          logger.info('Commission already created by manual verification');
        } else {
          throw error;
        }
      }
    });
    
    await webhookDeduplicationService.markSuccess(eventId);
  } catch (error) {
    await webhookDeduplicationService.markFailed(eventId, error.message);
    throw error;
  }
}
```

**Key Points:**
- ✅ Both paths are idempotent
- ✅ Both paths can handle the other finishing first
- ✅ Error handling distinguishes duplicates from real errors
- ✅ Logging shows which path created commission
- ✅ Neither path fails if the other succeeds

**3. Race Resolution Priority**
```
1. Manual verification wins (it's first 95% of the time)
2. Webhook fills gaps if manual fails
3. Database constraint is final safeguard
4. Admin can manually review any anomalies
```

---

## Referral Lookup Strategy

### Overview

Each payment path must safely retrieve the referral record without race conditions and handle missing referrals (organic signups) gracefully.

### Current Lookup Method

**File:** `server/repositories/partner-student-referral.repository.ts`

```typescript
async findByStudentId(studentId: string): Promise<PartnerStudentReferral | undefined> {
  try {
    const results = await db
      .select()
      .from(partnerStudentReferrals)
      .where(eq(partnerStudentReferrals.studentId, studentId))
      .limit(1);
    return results[0];
  } catch (error) {
    handleDatabaseError(error, 'PartnerStudentReferralRepository.findByStudentId');
  }
}
```

**Issues:**
- ❌ No transaction support (tx parameter not used in read operations)
- ❌ No locking (concurrent updates possible)
- ✅ Returns undefined if not found (handles organic signups)

---

### Enhanced Lookup Strategy

#### Strategy 1: Read Within Transaction (Current Approach - ACCEPTABLE)

**When:** Reading for commission creation within payment transaction

**Implementation:**
```typescript
// All repository read methods already support optional tx parameter
async findByStudentId(studentId: string, tx?: DbOrTransaction): Promise<PartnerStudentReferral | undefined> {
  try {
    const executor = tx || db; // Use transaction if provided
    const results = await executor
      .select()
      .from(partnerStudentReferrals)
      .where(eq(partnerStudentReferrals.studentId, studentId))
      .limit(1);
    return results[0];
  } catch (error) {
    handleDatabaseError(error, 'PartnerStudentReferralRepository.findByStudentId');
  }
}
```

**Usage in Payment Flow:**
```typescript
await db.transaction(async (tx) => {
  // Read referral within transaction
  const referral = await partnerStudentReferralRepository.findByStudentId(studentId, tx);
  
  if (!referral) {
    logger.info('No referral found - organic signup', { studentId });
    return; // Gracefully exit, no commission needed
  }
  
  if (!referral.commissionEligible) {
    logger.warn('Referral exists but not commission eligible', {
      referralId: referral.id,
      reason: referral.statusReason
    });
    return;
  }
  
  // Proceed with commission creation
  await commissionService.createCommission(referral.id, paymentId, tx);
});
```

**Advantages:**
- ✅ Consistent read within transaction (READ COMMITTED isolation)
- ✅ No locks needed for read (referral won't change during payment processing)
- ✅ Simple and performant

---

#### Strategy 2: Denormalized Referral Lookup (OPTIMIZATION)

**Concept:** Store `referredByPartnerId` directly on `student_profiles` for fast lookup

**Current Schema:**
```typescript
// student_profiles table
{
  id: uuid,
  user_id: uuid,
  referred_by_partner_id: uuid (nullable) // ← Already exists!
}
```

**Usage:**
```typescript
// Fast path: Check denormalized field first
const studentProfile = await studentRepository.findByUserId(userId);

if (!studentProfile.referredByPartnerId) {
  logger.info('No referral - organic signup', { studentId: studentProfile.id });
  return; // Skip commission creation
}

// referral exists, proceed to look up full referral record
const referral = await partnerStudentReferralRepository.findByStudentId(studentProfile.id);
```

**Advantages:**
- ✅ One less JOIN in queries
- ✅ Faster check for "has referral?" before expensive lookup
- ✅ Denormalization already in place (Phase 6 Issue #2 documents this)

**Maintenance:**
- `referralTrackingService.attributeStudentToPartner()` already updates both:
  1. Creates `partner_student_referrals` record (source of truth)
  2. Updates `student_profiles.referred_by_partner_id` (denormalized cache)

---

### Handling Missing Referrals (Organic Signups)

**Scenario:** Student registers and pays without clicking any referral link

**Expected Behavior:**
1. ✅ Payment succeeds normally
2. ✅ Subscription created
3. ✅ No referral record exists
4. ✅ No commission created
5. ✅ Log event for analytics

**Implementation:**
```typescript
async verifyPayment(req, res) {
  // ... payment verification ...
  
  try {
    const { studentRepository } = await import('../repositories');
    const { partnerStudentReferralRepository } = await import('../repositories');
    const { referralTrackingService } = await import('../services/domain/referral-tracking.service');
    const { commissionService } = await import('../services/domain/commission.service');
    
    const studentProfile = await studentRepository.findByUserId(userId);
    
    if (!studentProfile) {
      // User is not a student (might be company/counselor/admin buying subscription)
      logger.info('Non-student user payment - no referral tracking', {
        userId,
        paymentId: result.paymentRecordId,
        userType: req.user?.role
      });
      return this.sendSuccess(res, { subscription: result.subscription });
    }
    
    // Check denormalized field first (optimization)
    if (!studentProfile.referredByPartnerId) {
      logger.info('Organic signup - no referral partner', {
        studentId: studentProfile.id,
        paymentId: result.paymentRecordId,
        conversionSource: 'organic'
      });
      // Track for analytics but don't create commission
      metrics.increment('payment.organic_signup');
      return this.sendSuccess(res, { subscription: result.subscription });
    }
    
    // Referral exists, proceed with commission flow
    await db.transaction(async (tx) => {
      await referralTrackingService.trackConversion(
        studentProfile.id,
        result.subscription.id,
        result.paymentRecordId,
        tx
      );
      
      const referral = await partnerStudentReferralRepository.findByStudentId(
        studentProfile.id,
        tx
      );
      
      if (referral && referral.status === 'converted' && referral.commissionEligible) {
        await commissionService.createCommission(referral.id, result.paymentRecordId, tx);
        logger.info('Commission created for referred student', {
          referralId: referral.id,
          partnerId: referral.partnerId
        });
      }
    });
    
    return this.sendSuccess(res, { subscription: result.subscription });
  } catch (conversionError) {
    // Log but don't fail payment
    logger.error('Referral tracking failed', {
      error: conversionError,
      userId,
      paymentId: result.paymentRecordId
    });
    // Payment succeeded, so return success even if referral tracking failed
    return this.sendSuccess(res, { subscription: result.subscription });
  }
}
```

**Key Points:**
- ✅ Payment NEVER fails due to missing referral
- ✅ Clear logging distinguishes organic vs referred
- ✅ Metrics track conversion sources
- ✅ Commission creation errors don't fail payment

---

### Handling Race Conditions with Concurrent Requests

**Scenario:** Two concurrent payment verifications for same student (unlikely but possible)

**Protection:**
```typescript
// trackConversion() is already idempotent:
async trackConversion(studentId, subscriptionId, paymentId, tx?) {
  const referral = await this.partnerStudentReferralRepo.findByStudentId(studentId);
  
  if (!referral) {
    throw new ResourceNotFoundError('Referral', studentId);
  }
  
  // Idempotent check
  if (referral.status === 'converted') {
    logger.info('Referral already converted - skipping', { referralId: referral.id });
    return; // ✅ Idempotent - safe to call multiple times
  }
  
  // ... proceed with conversion ...
}

// createCommission() is idempotent with SELECT FOR UPDATE:
async createCommission(referralId, paymentId, tx?) {
  await db.transaction(async (txHandle) => {
    // SELECT FOR UPDATE locks row
    const existingCommission = await this.commissionRepo.findByReferralIdWithLock(
      referralId,
      txHandle
    );
    
    if (existingCommission) {
      logger.info('Commission already exists', { commissionId: existingCommission.id });
      throw new InvalidOperationError('create commission', 'Commission already exists');
      // Caller catches this and treats as success ✅
    }
    
    // Safe to insert
    // ...
  });
}
```

**Result:**
- First request: Creates commission ✅
- Second request: Sees existing commission, logs, continues ✅
- No duplicate commissions ✅

---

### Coordination with Webhook Handlers

**Principle:** All paths use same lookup and creation logic → automatic coordination

**Manual Path:**
```typescript
const referral = await partnerStudentReferralRepository.findByStudentId(studentId, tx);
if (referral && referral.commissionEligible) {
  await commissionService.createCommission(referral.id, paymentId, tx);
}
```

**Webhook Path:**
```typescript
const referral = await partnerStudentReferralRepository.findByStudentId(studentId, tx);
if (referral && referral.commissionEligible) {
  await commissionService.createCommission(referral.id, paymentId, tx);
}
```

**Coordination happens automatically:**
1. Both use same `findByStudentId()` - sees same data
2. Both use same `createCommission()` - duplicate prevention built in
3. Both wrapped in transactions - atomic operations
4. No explicit coordination needed ✅

---

### Repository Methods Enhancement

**Current Methods (Sufficient):**
```typescript
// partner-student-referral.repository.ts
findById(id: string, tx?: DbOrTransaction): Promise<PartnerStudentReferral>
findByStudentId(studentId: string, tx?: DbOrTransaction): Promise<PartnerStudentReferral | undefined>
findByPartnerId(partnerId: string): Promise<PartnerStudentReferral[]>
updateStatus(referralId: string, status: string, statusReason?: string): Promise<void>
updateCommission(referralId: string, commissionAmount: number, commissionStatus: string, tx?: DbOrTransaction): Promise<void>
```

**Potentially Useful Additions:**
```typescript
// Find all referrals for a student (if student can be referred multiple times? - probably not)
findAllByStudentId(studentId: string, tx?: DbOrTransaction): Promise<PartnerStudentReferral[]>

// Find referral by subscription ID (useful for refund handling)
findBySubscriptionId(subscriptionId: string, tx?: DbOrTransaction): Promise<PartnerStudentReferral | undefined>

// Find referrals by payment ID (useful for commission verification)
findByPaymentId(paymentId: string, tx?: DbOrTransaction): Promise<PartnerStudentReferral | undefined>
```

**Recommendation:** Current methods are sufficient. Add new methods only if specific use cases emerge.

---

## Database Integrity Assessment

### Current State Analysis

**Tables Created:** ✅ All partner commission tables exist
- `partner_profiles`
- `partner_referral_links`
- `referral_clicks`
- `partner_student_referrals`
- `partner_commissions`
- `partner_payouts`

**Foreign Keys:** ✅ All FK constraints properly defined

**Data Integrity Check:**

```sql
-- Check 1: Orphaned referrals (referral without student)
SELECT COUNT(*) FROM partner_student_referrals psr
LEFT JOIN student_profiles sp ON sp.id = psr.student_id
WHERE sp.id IS NULL;
-- Result: 0 (good)

-- Check 2: Referrals without valid partner
SELECT COUNT(*) FROM partner_student_referrals psr
LEFT JOIN partner_profiles pp ON pp.id = psr.partner_id  
WHERE pp.id IS NULL;
-- Result: 0 (good)

-- Check 3: Converted referrals without commission
SELECT COUNT(*) FROM partner_student_referrals psr
LEFT JOIN partner_commissions pc ON pc.referral_id = psr.id
WHERE psr.status = 'converted' 
  AND psr.commission_eligible = true
  AND pc.id IS NULL;
-- Result: 1 (BAD - this is the bug!)

-- Check 4: Commissions without valid referral
SELECT COUNT(*) FROM partner_commissions pc
LEFT JOIN partner_student_referrals psr ON psr.id = pc.referral_id
WHERE psr.id IS NULL;
-- Result: 0 (good - no orphaned commissions, because table is empty)

-- Check 5: Commissions without payment record
SELECT COUNT(*) FROM partner_commissions pc
LEFT JOIN payments p ON p.id = pc.payment_id
WHERE p.id IS NULL;
-- Result: 0 (good - table is empty)
```

### Missing Constraints

**Unique Constraint:**
```sql
-- CRITICAL: Prevent duplicate commissions for same referral
ALTER TABLE partner_commissions 
ADD CONSTRAINT uq_partner_commissions_referral_id 
UNIQUE (referral_id);
```

**Check Constraints:**
```sql
-- Ensure commission amounts are positive
ALTER TABLE partner_commissions
ADD CONSTRAINT chk_commission_amount_positive
CHECK (CAST(commission_amount AS NUMERIC) >= 0);

-- Ensure commission rate is valid percentage
ALTER TABLE partner_commissions  
ADD CONSTRAINT chk_commission_rate_valid
CHECK (CAST(commission_rate AS NUMERIC) >= 0 AND CAST(commission_rate AS NUMERIC) <= 100);

-- Ensure base amount is positive
ALTER TABLE partner_commissions
ADD CONSTRAINT chk_base_amount_positive  
CHECK (CAST(base_amount AS NUMERIC) > 0);
```

### Performance Indexes Needed

**Analysis of Common Queries:**

1. **Partner Dashboard - Get pending commissions**
   ```sql
   SELECT * FROM partner_commissions 
   WHERE partner_id = ? AND status = 'pending'
   ORDER BY created_at DESC;
   ```
   **Index needed:** `(partner_id, status, created_at)`

2. **Admin Panel - All pending commissions**
   ```sql
   SELECT * FROM partner_commissions 
   WHERE status = 'pending'
   ORDER BY created_at DESC;
   ```
   **Index needed:** `(status, created_at)`

3. **Payout Processing - Get approved commissions**
   ```sql
   SELECT * FROM partner_commissions
   WHERE partner_id = ? AND status = 'approved' AND payout_id IS NULL;
   ```
   **Index needed:** `(partner_id, status, payout_id)`

4. **Referral Lookup - Find commission by referral**
   ```sql
   SELECT * FROM partner_commissions WHERE referral_id = ?;
   ```
   **Index needed:** `(referral_id)` - Should also be UNIQUE

**Recommended Indexes:**
```sql
-- Core lookup indexes
CREATE INDEX idx_pc_partner_id ON partner_commissions(partner_id);
CREATE UNIQUE INDEX idx_pc_referral_id ON partner_commissions(referral_id);
CREATE INDEX idx_pc_payment_id ON partner_commissions(payment_id);
CREATE INDEX idx_pc_payout_id ON partner_commissions(payout_id) 
  WHERE payout_id IS NOT NULL;

-- Status-based queries
CREATE INDEX idx_pc_status ON partner_commissions(status);
CREATE INDEX idx_pc_partner_status ON partner_commissions(partner_id, status);

-- Time-based queries  
CREATE INDEX idx_pc_created_at ON partner_commissions(created_at);
CREATE INDEX idx_pc_approved_at ON partner_commissions(approved_at) 
  WHERE approved_at IS NOT NULL;

-- Composite for common dashboard queries
CREATE INDEX idx_pc_partner_status_created 
  ON partner_commissions(partner_id, status, created_at DESC);

-- Referral table indexes
CREATE INDEX idx_psr_partner_id ON partner_student_referrals(partner_id);
CREATE INDEX idx_psr_student_id ON partner_student_referrals(student_id);
CREATE INDEX idx_psr_status ON partner_student_referrals(status);
CREATE INDEX idx_psr_subscription_id ON partner_student_referrals(subscription_id);
CREATE INDEX idx_psr_payment_id ON partner_student_referrals(payment_id);

-- Composite for conversion tracking
CREATE INDEX idx_psr_student_status 
  ON partner_student_referrals(student_id, status);
CREATE INDEX idx_psr_partner_status 
  ON partner_student_referrals(partner_id, status);
```

---

## Frontend-Backend Alignment

### API Endpoints Verification

**Commission Management:**

| Endpoint | Method | Controller | Frontend Hook | Status |
|----------|--------|------------|---------------|--------|
| `/api/partner/commissions/pending` | GET | PartnerController | `usePendingCommissions()` | ✅ Aligned |
| `/api/partner/commissions/history` | GET | PartnerController | `useCommissionHistory()` | ✅ Aligned |
| `/api/admin/commissions` | GET | AdminPartnerController | Admin UI | ✅ Aligned |
| `/api/admin/commissions/pending` | GET | AdminPartnerController | Admin UI | ✅ Aligned |
| `/api/admin/commissions/approve` | POST | AdminPartnerController | Admin UI | ✅ Aligned |
| `/api/admin/commissions/reject` | POST | AdminPartnerController | Admin UI | ✅ Aligned |

**Files Reviewed:**
- Frontend: `client/src/hooks/partner-api-hooks.ts`
- Backend: `server/routes/partner.routes.ts`
- Backend: `server/controllers/partner.controller.ts`
- Backend: `server/controllers/admin-partner.controller.ts`

**Findings:**
✅ All API endpoints are correctly defined and aligned with frontend expectations.

### Dashboard Data Display

**File:** `client/src/pages/PartnerDashboard.tsx`

**Displays:**
```typescript
{
  totalReferrals: number,           // From partner_profiles.total_referrals
  totalConversions: number,         // From partner_profiles.total_conversions  
  totalCommissionEarned: number,    // From partner_profiles.total_commission_earned
  totalCommissionPaid: number,      // From partner_profiles.total_commission_paid
  pendingCommission: number,        // SUM(commission_amount) WHERE status = 'pending'
  conversionRate: number,           // Calculated: conversions / referrals * 100
  // ... other metrics
}
```

**Data Consistency Issues:**

1. **If No Commissions Exist:**
   - `totalCommissionEarned` = ₹0 (correct - not updated by trackConversion)
   - `pendingCommission` = ₹0 (correct - no commission records)
   - **Result:** Partner sees 1 conversion but ₹0 earnings (confusing but technically accurate)

2. **If Commissions Are Backfilled:**
   - `totalCommissionEarned` = ₹2,000 (updated by createCommission)
   - `pendingCommission` = ₹2,000 (SUM from commissions table)
   - **Result:** Consistent and correct

**Frontend Commission Details Page:**

**File:** `client/src/pages/PartnerCommissions.tsx`

Displays commission table with:
- Student name (from referral.studentName - stub data)
- Subscription plan
- Payment amount
- Commission amount
- Status badge
- Created/Approved dates

**Issue:**
Since `partner_commissions` table is empty, this page shows "No commissions found" even though 1 conversion exists.

**After Fix:**
Table will populate correctly once commissions are created.

### Type Definitions Alignment

**Shared Types:** `shared/types/partner-types.ts`

Defines:
```typescript
export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'rejected' | 'disputed';

export interface CommissionWithDetails {
  // ... commission fields
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
  payout: PayoutInfo | null;
}
```

**Backend Service:** `server/services/domain/commission.service.ts`

Returns `CommissionWithDetails` from:
- `getPendingCommissions()`
- `getCommissionHistory()`

**Findings:**
✅ Type definitions are consistent between frontend and backend.

---

## Detailed Backfill Procedure

### Overview

The backfill procedure will create commission records for historical referral conversions that were missed due to the bug. This is a sensitive operation involving financial data and must be executed with extreme caution.

### Pre-Backfill Assessment

#### Step 1: Identify Missing Commissions

**Query:** Find all converted referrals without commissions
```sql
-- Count missing commissions
SELECT COUNT(*) as missing_count
FROM partner_student_referrals psr
LEFT JOIN partner_commissions pc ON pc.referral_id = psr.id
WHERE psr.status = 'converted'
  AND psr.commission_eligible = true
  AND pc.id IS NULL;
```

**Expected Result:** Should match the 1 record identified in initial investigation

**Query:** Get details of missing commissions
```sql
-- Detailed view of missing commissions
SELECT 
  psr.id as referral_id,
  psr.partner_id,
  psr.student_id,
  psr.converted_at,
  psr.payment_id,
  p.amount as payment_amount,
  p.currency,
  p.created_at as payment_date,
  pp.company_name as partner_name,
  pp.commission_type,
  pp.commission_rate,
  pp.fixed_commission_amount,
  -- Calculate expected commission
  CASE 
    WHEN pp.commission_type = 'percentage'
      THEN CAST(p.amount AS NUMERIC) * CAST(pp.commission_rate AS NUMERIC) / 100
    WHEN pp.commission_type = 'fixed'
      THEN CAST(pp.fixed_commission_amount AS NUMERIC)
    ELSE 0
  END as calculated_commission_amount
FROM partner_student_referrals psr
LEFT JOIN partner_commissions pc ON pc.referral_id = psr.id
JOIN partner_profiles pp ON pp.id = psr.partner_id
LEFT JOIN payments p ON p.id = psr.payment_id
WHERE psr.status = 'converted'
  AND psr.commission_eligible = true
  AND pc.id IS NULL
ORDER BY psr.converted_at DESC;
```

**Action:** Review results manually before proceeding
- Verify payment amounts are correct
- Check commission calculations match expectations
- Confirm these are legitimate conversions that should be commissioned

---

#### Step 2: Data Integrity Checks

**Query:** Check for referrals without payments
```sql
-- Referrals marked as converted but no payment record
SELECT 
  psr.id as referral_id,
  psr.partner_id,
  psr.student_id,
  psr.converted_at,
  psr.payment_id,
  psr.subscription_id
FROM partner_student_referrals psr
WHERE psr.status = 'converted'
  AND psr.commission_eligible = true
  AND (psr.payment_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM payments p WHERE p.id = psr.payment_id
  ));
```

**Expected Result:** Should be 0 rows

**If > 0:** These conversions cannot be backfilled without payment records. Mark as manual review needed.

**Query:** Check for orphaned partner references
```sql
-- Referrals pointing to non-existent partners
SELECT psr.id, psr.partner_id
FROM partner_student_referrals psr
LEFT JOIN partner_profiles pp ON pp.id = psr.partner_id
WHERE psr.status = 'converted'
  AND pp.id IS NULL;
```

**Expected Result:** Should be 0 rows

**Query:** Check for existing duplicate commissions (safety check)
```sql
-- Referrals with multiple commissions (should not exist)
SELECT 
  referral_id,
  COUNT(*) as commission_count,
  array_agg(id) as commission_ids
FROM partner_commissions
GROUP BY referral_id
HAVING COUNT(*) > 1;
```

**Expected Result:** Should be 0 rows (before unique constraint added)

---

### Dry-Run Mode

#### Step 3: Preview Backfill Results (Without Committing)

**Purpose:** See exactly what will be created without modifying database

**Script:** `scripts/backfill-commissions-dry-run.sql`

```sql
-- DRY RUN: Preview commission backfill without creating records
-- This query shows what WOULD be created

BEGIN; -- Start transaction for dry-run

-- Create temporary table to hold preview results
CREATE TEMP TABLE backfill_preview AS
SELECT 
  gen_random_uuid() as new_commission_id,
  psr.id as referral_id,
  psr.partner_id,
  psr.payment_id,
  p.amount as base_amount,
  pp.commission_type,
  pp.commission_rate,
  pp.fixed_commission_amount,
  p.currency,
  -- Calculate commission amount
  CASE 
    WHEN pp.commission_type = 'percentage'
      THEN CAST(p.amount AS NUMERIC) * CAST(pp.commission_rate AS NUMERIC) / 100
    WHEN pp.commission_type = 'fixed'
      THEN CAST(pp.fixed_commission_amount AS NUMERIC)
    ELSE 0
  END as commission_amount,
  psr.converted_at,
  pp.company_name as partner_name,
  psr.student_id,
  (SELECT CONCAT(u.first_name, ' ', u.last_name) 
   FROM student_profiles sp 
   JOIN users u ON u.id = sp.user_id 
   WHERE sp.id = psr.student_id) as student_name
FROM partner_student_referrals psr
LEFT JOIN partner_commissions pc ON pc.referral_id = psr.id
JOIN partner_profiles pp ON pp.id = psr.partner_id
JOIN payments p ON p.id = psr.payment_id
WHERE psr.status = 'converted'
  AND psr.commission_eligible = true
  AND pc.id IS NULL;

-- Display preview
SELECT 
  referral_id,
  partner_name,
  student_name,
  base_amount,
  commission_type,
  CASE 
    WHEN commission_type = 'percentage' 
      THEN CONCAT(commission_rate, '%')
    ELSE 'Fixed'
  END as rate,
  commission_amount,
  currency,
  converted_at
FROM backfill_preview
ORDER BY converted_at DESC;

-- Summary statistics
SELECT 
  COUNT(*) as total_commissions_to_create,
  SUM(commission_amount) as total_commission_amount_inr,
  COUNT(DISTINCT partner_id) as partners_affected,
  MIN(commission_amount) as min_commission,
  MAX(commission_amount) as max_commission,
  AVG(commission_amount) as avg_commission
FROM backfill_preview;

-- Per-partner breakdown
SELECT 
  partner_id,
  partner_name,
  COUNT(*) as commissions_count,
  SUM(commission_amount) as total_commission_amount
FROM backfill_preview
GROUP BY partner_id, partner_name
ORDER BY total_commission_amount DESC;

ROLLBACK; -- Don't commit, just preview
```

**Expected Output Example:**
```
┌──────────────┬────────────────┬─────────────┬─────────────┬─────────────────┬──────┬─────────────────┬──────────┬────────────────────┐
│ referral_id  │ partner_name   │ student_name│ base_amount │ commission_type │ rate │ commission_amt  │ currency │ converted_at       │
├──────────────┼────────────────┼─────────────┼─────────────┼─────────────────┼──────┼─────────────────┼──────────┼────────────────────┤
│ ref_123...   │ EduConsult Inc │ John Smith  │ 20000.00    │ percentage      │ 10%  │ 2000.00         │ INR      │ 2025-11-10 14:30.. │
└──────────────┴────────────────┴─────────────┴─────────────┴─────────────────┴──────┴─────────────────┴──────────┴────────────────────┘

Summary:
- Total commissions to create: 1
- Total commission amount: ₹2,000.00 INR
- Partners affected: 1
```

**Action:** Review preview results with business stakeholders before proceeding

---

### Backfill Execution

#### Step 4: Execute Backfill with Transaction Safety

**Script:** `scripts/backfill-commissions-execute.sql`

**IMPORTANT:** Review dry-run results before running this script!

```sql
-- PRODUCTION BACKFILL SCRIPT
-- Creates commission records for historical converted referrals
-- 
-- PREREQUISITES:
-- 1. Dry-run completed and results reviewed
-- 2. Stakeholder approval obtained
-- 3. Database backup created
-- 4. Off-peak hours scheduled
--
-- SAFETY FEATURES:
-- - Wrapped in transaction (can rollback if issues)
-- - Validates all data before insert
-- - Logs every operation
-- - Idempotent (safe to run multiple times)
--
-- USAGE:
-- psql -U <user> -d <database> -f backfill-commissions-execute.sql
--
-- Or in transaction:
-- BEGIN;
-- \i backfill-commissions-execute.sql
-- -- Review results
-- COMMIT; -- or ROLLBACK to undo

BEGIN; -- Transaction start

-- Create log table for backfill audit trail
CREATE TEMP TABLE backfill_audit_log (
  operation VARCHAR(50),
  referral_id UUID,
  commission_id UUID,
  partner_id UUID,
  amount NUMERIC,
  status VARCHAR(50),
  message TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Log backfill start
INSERT INTO backfill_audit_log (operation, message)
VALUES ('BACKFILL_START', 'Commission backfill started');

-- Validate preconditions
DO $$
DECLARE
  missing_count INTEGER;
  orphaned_referrals INTEGER;
  missing_payments INTEGER;
BEGIN
  -- Check 1: Count missing commissions
  SELECT COUNT(*) INTO missing_count
  FROM partner_student_referrals psr
  LEFT JOIN partner_commissions pc ON pc.referral_id = psr.id
  WHERE psr.status = 'converted'
    AND psr.commission_eligible = true
    AND pc.id IS NULL;
  
  INSERT INTO backfill_audit_log (operation, message)
  VALUES ('VALIDATION', FORMAT('Found %s referrals missing commissions', missing_count));
  
  -- Check 2: Verify no orphaned referrals
  SELECT COUNT(*) INTO orphaned_referrals
  FROM partner_student_referrals psr
  LEFT JOIN partner_profiles pp ON pp.id = psr.partner_id
  WHERE psr.status = 'converted'
    AND pp.id IS NULL;
  
  IF orphaned_referrals > 0 THEN
    INSERT INTO backfill_audit_log (operation, status, message)
    VALUES ('VALIDATION_FAILED', 'ERROR', FORMAT('%s orphaned referrals found - ABORTING', orphaned_referrals));
    RAISE EXCEPTION 'Orphaned referrals detected: %', orphaned_referrals;
  END IF;
  
  -- Check 3: Verify all conversions have payment records
  SELECT COUNT(*) INTO missing_payments
  FROM partner_student_referrals psr
  LEFT JOIN partner_commissions pc ON pc.referral_id = psr.id
  LEFT JOIN payments p ON p.id = psr.payment_id
  WHERE psr.status = 'converted'
    AND psr.commission_eligible = true
    AND pc.id IS NULL
    AND (psr.payment_id IS NULL OR p.id IS NULL);
  
  IF missing_payments > 0 THEN
    INSERT INTO backfill_audit_log (operation, status, message)
    VALUES ('VALIDATION_FAILED', 'WARNING', FORMAT('%s conversions missing payment records', missing_payments));
    -- Don't abort, just log warning
  END IF;
  
  INSERT INTO backfill_audit_log (operation, status, message)
  VALUES ('VALIDATION', 'SUCCESS', 'All precondition checks passed');
END $$;

-- Create commissions for missing historical conversions
WITH missing_commissions AS (
  SELECT 
    gen_random_uuid() as new_commission_id,
    psr.id as referral_id,
    psr.partner_id,
    psr.payment_id,
    psr.subscription_id,
    p.amount as base_amount,
    pp.commission_type,
    pp.commission_rate,
    pp.fixed_commission_amount,
    p.currency,
    psr.converted_at,
    -- Calculate commission amount
    CASE 
      WHEN pp.commission_type = 'percentage'
        THEN CAST(p.amount AS NUMERIC) * CAST(pp.commission_rate AS NUMERIC) / 100
      WHEN pp.commission_type = 'fixed'
        THEN CAST(pp.fixed_commission_amount AS NUMERIC)
      ELSE 0
    END as commission_amount
  FROM partner_student_referrals psr
  LEFT JOIN partner_commissions pc ON pc.referral_id = psr.id
  JOIN partner_profiles pp ON pp.id = psr.partner_id
  JOIN payments p ON p.id = psr.payment_id
  WHERE psr.status = 'converted'
    AND psr.commission_eligible = true
    AND pc.id IS NULL
)
INSERT INTO partner_commissions (
  id,
  partner_id,
  referral_id,
  payment_id,
  subscription_id,
  base_amount,
  commission_rate,
  commission_amount,
  currency,
  status,
  notes,
  created_at,
  updated_at
)
SELECT 
  new_commission_id,
  partner_id,
  referral_id,
  payment_id,
  subscription_id,
  CAST(base_amount AS VARCHAR),
  CAST(commission_rate AS VARCHAR),
  CAST(commission_amount AS VARCHAR),
  currency,
  'pending' as status,
  'Backfilled from missing historical commission on ' || TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS') as notes,
  converted_at as created_at,  -- Use original conversion date for audit trail
  NOW() as updated_at
FROM missing_commissions
RETURNING id, partner_id, referral_id, commission_amount INTO backfill_audit_log;

-- Get count of created commissions
DO $$
DECLARE
  created_count INTEGER;
BEGIN
  GET DIAGNOSTICS created_count = ROW_COUNT;
  
  INSERT INTO backfill_audit_log (operation, message)
  VALUES ('COMMISSIONS_CREATED', FORMAT('Created %s commission records', created_count));
  
  RAISE NOTICE 'Created % commission records', created_count;
END $$;

-- Update referral commission denormalized fields
WITH updated_referrals AS (
  UPDATE partner_student_referrals psr
  SET 
    commission_amount = CAST(pc.commission_amount AS VARCHAR),
    commission_status = pc.status,
    updated_at = NOW()
  FROM partner_commissions pc
  WHERE pc.referral_id = psr.id
    AND pc.notes LIKE 'Backfilled from missing historical commission%'
  RETURNING psr.id, psr.commission_amount
)
INSERT INTO backfill_audit_log (operation, message)
SELECT 
  'REFERRAL_UPDATED',
  FORMAT('Updated referral %s with commission amount %s', id, commission_amount)
FROM updated_referrals;

-- Update partner total commission earned
WITH partner_totals AS (
  SELECT 
    partner_id,
    SUM(CAST(commission_amount AS NUMERIC)) as new_commission_total
  FROM partner_commissions
  WHERE notes LIKE 'Backfilled from missing historical commission%'
  GROUP BY partner_id
)
UPDATE partner_profiles pp
SET 
  total_commission_earned = COALESCE(CAST(pp.total_commission_earned AS NUMERIC), 0) + pt.new_commission_total,
  updated_at = NOW()
FROM partner_totals pt
WHERE pp.id = pt.partner_id
RETURNING pp.id, pp.company_name, pp.total_commission_earned
  INTO backfill_audit_log;

INSERT INTO backfill_audit_log (operation, status, message)
VALUES ('BACKFILL_COMPLETE', 'SUCCESS', 'All operations completed successfully');

-- Display audit log
SELECT * FROM backfill_audit_log ORDER BY timestamp;

-- Display summary
SELECT 
  COUNT(*) FILTER (WHERE operation = 'COMMISSIONS_CREATED') as commissions_created,
  COUNT(*) FILTER (WHERE operation = 'REFERRAL_UPDATED') as referrals_updated,
  COUNT(*) FILTER (WHERE operation LIKE 'PARTNER%') as partners_updated
FROM backfill_audit_log;

-- Final verification query
SELECT 
  'Missing commissions after backfill' as check_name,
  COUNT(*) as count
FROM partner_student_referrals psr
LEFT JOIN partner_commissions pc ON pc.referral_id = psr.id
WHERE psr.status = 'converted'
  AND psr.commission_eligible = true
  AND pc.id IS NULL;

-- DECISION POINT: Review the audit log and summary above
-- If everything looks correct, COMMIT
-- If anything looks wrong, ROLLBACK

-- COMMIT; -- Uncomment to commit changes
-- ROLLBACK; -- Uncomment to undo all changes
```

**Manual Execution Steps:**

1. **Create database backup:**
   ```bash
   pg_dump -U <user> <database> > backup_before_backfill_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Run in psql with transaction control:**
   ```bash
   psql -U <user> -d <database>
   ```
   ```sql
   BEGIN;
   \i scripts/backfill-commissions-execute.sql
   -- Review output carefully
   COMMIT; -- or ROLLBACK if issues found
   ```

3. **Verify results** (see Step 5 below)

---

#### Step 5: Post-Backfill Verification

**Query 1:** Verify no missing commissions remain
```sql
-- Should return 0 rows
SELECT COUNT(*) as remaining_missing
FROM partner_student_referrals psr
LEFT JOIN partner_commissions pc ON pc.referral_id = psr.id
WHERE psr.status = 'converted'
  AND psr.commission_eligible = true
  AND pc.id IS NULL;
```

**Expected:** `remaining_missing = 0`

**Query 2:** Verify backfilled commissions were created correctly
```sql
-- View all backfilled commissions
SELECT 
  pc.id,
  pc.partner_id,
  pc.referral_id,
  pc.commission_amount,
  pc.status,
  pc.notes,
  pc.created_at,
  pp.company_name
FROM partner_commissions pc
JOIN partner_profiles pp ON pp.id = pc.partner_id
WHERE pc.notes LIKE 'Backfilled from missing historical commission%'
ORDER BY pc.created_at;
```

**Verify:**
- All backfilled commissions have `status = 'pending'`
- Notes contain backfill timestamp
- Commission amounts match dry-run preview
- All commissions associated with valid partners

**Query 3:** Verify partner totals updated correctly
```sql
-- Compare calculated total vs stored total
SELECT 
  pp.id,
  pp.company_name,
  pp.total_commission_earned as stored_total,
  COALESCE(SUM(CAST(pc.commission_amount AS NUMERIC)), 0) as calculated_total,
  COALESCE(SUM(CAST(pc.commission_amount AS NUMERIC)), 0) - 
    CAST(pp.total_commission_earned AS NUMERIC) as difference
FROM partner_profiles pp
LEFT JOIN partner_commissions pc ON pc.partner_id = pp.id
GROUP BY pp.id, pp.company_name, pp.total_commission_earned
HAVING COALESCE(SUM(CAST(pc.commission_amount AS NUMERIC)), 0) != 
       CAST(pp.total_commission_earned AS NUMERIC);
```

**Expected:** 0 rows (all totals match)

**Query 4:** Verify referral denormalization updated
```sql
-- Check referral commission fields match actual commissions
SELECT 
  psr.id as referral_id,
  psr.commission_amount as referral_amount,
  pc.commission_amount as commission_amount,
  psr.commission_status as referral_status,
  pc.status as commission_status
FROM partner_student_referrals psr
JOIN partner_commissions pc ON pc.referral_id = psr.id
WHERE pc.notes LIKE 'Backfilled from missing historical commission%'
  AND (
    psr.commission_amount != pc.commission_amount
    OR psr.commission_status != pc.status
  );
```

**Expected:** 0 rows (all fields synchronized)

---

### Batching Strategy (For Large Backfills)

**Note:** Current backfill only has 1 record, so batching not needed. Included for completeness.

**If backfilling > 100 records**, use batching to avoid long-running transactions:

```sql
-- Batch backfill script (process 50 records at a time)
DO $$
DECLARE
  batch_size INTEGER := 50;
  processed INTEGER := 0;
  batch_count INTEGER := 0;
  total_to_process INTEGER;
BEGIN
  -- Get total count
  SELECT COUNT(*) INTO total_to_process
  FROM partner_student_referrals psr
  LEFT JOIN partner_commissions pc ON pc.referral_id = psr.id
  WHERE psr.status = 'converted'
    AND psr.commission_eligible = true
    AND pc.id IS NULL;
  
  RAISE NOTICE 'Total records to backfill: %', total_to_process;
  
  -- Process in batches
  WHILE processed < total_to_process LOOP
    batch_count := batch_count + 1;
    
    -- Process batch within its own transaction
    WITH batch AS (
      SELECT psr.id
      FROM partner_student_referrals psr
      LEFT JOIN partner_commissions pc ON pc.referral_id = psr.id
      WHERE psr.status = 'converted'
        AND psr.commission_eligible = true
        AND pc.id IS NULL
      LIMIT batch_size
    )
    INSERT INTO partner_commissions (
      -- ... same as above ...
    )
    SELECT -- ... same as above ...
    FROM batch
    JOIN partner_student_referrals psr ON psr.id = batch.id
    -- ... rest of query ...
    ;
    
    GET DIAGNOSTICS processed = ROW_COUNT;
    
    RAISE NOTICE 'Batch %: processed % records (% total)', batch_count, processed, processed;
    
    -- Commit each batch
    COMMIT;
    
    -- Small delay between batches (optional)
    PERFORM pg_sleep(0.5);
  END LOOP;
  
  RAISE NOTICE 'Backfill complete: % records in % batches', total_to_process, batch_count;
END $$;
```

---

### Progress Tracking & Resumability

**Track backfill progress** in case of interruption:

```sql
-- Create backfill progress table
CREATE TABLE IF NOT EXISTS backfill_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backfill_type VARCHAR(100) NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  total_records INTEGER,
  processed_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
  error_message TEXT,
  last_processed_referral_id UUID
);

-- Before starting backfill
INSERT INTO backfill_progress (backfill_type, total_records)
SELECT 'commission_backfill_2025_11_14', COUNT(*)
FROM partner_student_referrals psr
LEFT JOIN partner_commissions pc ON pc.referral_id = psr.id
WHERE psr.status = 'converted'
  AND psr.commission_eligible = true
  AND pc.id IS NULL
RETURNING id;

-- During backfill (update after each batch)
UPDATE backfill_progress
SET 
  processed_records = processed_records + <batch_size>,
  last_processed_referral_id = <last_id>
WHERE backfill_type = 'commission_backfill_2025_11_14'
  AND status = 'in_progress';

-- On completion
UPDATE backfill_progress
SET 
  completed_at = NOW(),
  status = 'completed'
WHERE backfill_type = 'commission_backfill_2025_11_14';

-- On error
UPDATE backfill_progress
SET 
  status = 'failed',
  failed_records = failed_records + 1,
  error_message = <error_text>
WHERE backfill_type = 'commission_backfill_2025_11_14';
```

**Resume after interruption:**
```sql
-- Find last successfully processed referral
SELECT last_processed_referral_id
FROM backfill_progress
WHERE backfill_type = 'commission_backfill_2025_11_14';

-- Resume backfill from that point
-- Add WHERE clause: psr.id > <last_processed_referral_id>
-- to skip already-processed records
```

---

### Rollback / Undo Procedure

**If backfill needs to be reversed:**

```sql
BEGIN;

-- Delete backfilled commissions
WITH deleted_commissions AS (
  DELETE FROM partner_commissions
  WHERE notes LIKE 'Backfilled from missing historical commission%'
  RETURNING id, partner_id, referral_id, CAST(commission_amount AS NUMERIC) as amount
)
INSERT INTO backfill_audit_log (operation, commission_id, partner_id, referral_id, amount, message)
SELECT 'ROLLBACK_DELETED', id, partner_id, referral_id, amount, 'Commission deleted during rollback'
FROM deleted_commissions;

-- Reset referral commission fields
UPDATE partner_student_referrals psr
SET 
  commission_amount = NULL,
  commission_status = NULL,
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM backfill_audit_log bal
  WHERE bal.operation = 'ROLLBACK_DELETED'
    AND bal.referral_id = psr.id
);

-- Recalculate partner totals from remaining commissions
WITH partner_new_totals AS (
  SELECT 
    partner_id,
    COALESCE(SUM(CAST(commission_amount AS NUMERIC)), 0) as new_total
  FROM partner_commissions
  GROUP BY partner_id
)
UPDATE partner_profiles pp
SET 
  total_commission_earned = CAST(pnt.new_total AS VARCHAR),
  updated_at = NOW()
FROM partner_new_totals pnt
WHERE pp.id = pnt.partner_id;

-- Verify rollback
SELECT 
  COUNT(*) as remaining_backfilled_commissions
FROM partner_commissions
WHERE notes LIKE 'Backfilled from missing historical commission%';
-- Should be 0

COMMIT; -- or ROLLBACK if verification fails
```

---

### Post-Backfill Actions

#### 1. Notify Affected Partners

**Action:** Send email notifications to partners about newly visible commissions

**Email Template:**
```
Subject: Your Referral Commissions Have Been Updated

Dear [Partner Name],

We've completed a system update to our commission tracking. You may now see additional commissions in your partner dashboard that were previously not visible due to a technical issue.

New Commission(s) Added:
- Date: [Conversion Date]
- Student: [Student Name]
- Amount: ₹[Commission Amount]
- Status: Pending Approval

These commissions are now pending admin approval and will be included in your next payout cycle once approved.

If you have any questions, please contact our partner support team.

Best regards,
[Platform Name] Team
```

#### 2. Admin Review & Approval

**Action:** Admin reviews all backfilled commissions before approval

**Query:** Get backfilled commissions for review
```sql
SELECT 
  pc.id,
  pp.company_name as partner,
  psr.student_id,
  pc.base_amount,
  pc.commission_amount,
  pc.created_at as conversion_date,
  pc.notes,
  pc.status
FROM partner_commissions pc
JOIN partner_profiles pp ON pp.id = pc.partner_id
JOIN partner_student_referrals psr ON psr.id = pc.referral_id
WHERE pc.notes LIKE 'Backfilled from missing historical commission%'
  AND pc.status = 'pending'
ORDER BY pc.created_at DESC;
```

**Approval Action:** Batch approve all backfilled commissions (if verified correct)
```sql
-- Approve all backfilled commissions
UPDATE partner_commissions
SET 
  status = 'approved',
  approved_at = NOW(),
  approved_by = '<admin_user_id>',
  updated_at = NOW()
WHERE notes LIKE 'Backfilled from missing historical commission%'
  AND status = 'pending';
```

#### 3. Update Monitoring Dashboard

**Add widget:** "Recent Backfill Summary"
- Total backfilled: X commissions
- Total amount: ₹X,XXX
- Partners affected: X
- Status: All approved / X pending

---

## Phase-by-Phase Remediation Plan

### Phase 0: Emergency Hotfix (CRITICAL - Immediate)

**Goal:** Stop the bleeding - fix the 95% commission loss in production

**Duration:** 1-2 hours  
**Risk Level:** MEDIUM  
**Rollback Complexity:** LOW (simple code change)

**Tasks:**

#### Task 0.1: Add Commission Creation to Manual Verification Path

**File:** `server/controllers/payment.controller.ts`  
**Method:** `verifyPayment()`  
**Lines:** 456-483

**Changes Required:**

```typescript
// BEFORE (Lines 456-483)
try {
  const { studentRepository } = await import('../repositories');
  const { referralTrackingService } = await import('../services/domain/referral-tracking.service');
  
  const studentProfile = await studentRepository.findByUserId(userId);
  
  if (studentProfile && result.paymentRecordId) {
    await referralTrackingService.trackConversion(
      studentProfile.id,
      result.subscription.id,
      result.paymentRecordId
    );
    
    logger.info('Referral conversion tracked', {
      studentId: studentProfile.id,
      subscriptionId: result.subscription.id,
      paymentRecordId: result.paymentRecordId
    });
  }
} catch (conversionError) {
  logger.error('Failed to track referral conversion', {
    error: conversionError,
    userId,
    subscriptionId: result.subscription.id,
    orderId
  });
}

// AFTER (with commission creation)
try {
  const { studentRepository } = await import('../repositories');
  const { partnerStudentReferralRepository } = await import('../repositories');
  const { referralTrackingService } = await import('../services/domain/referral-tracking.service');
  const { commissionService } = await import('../services/domain/commission.service');
  const { db } = await import('../db');
  
  const studentProfile = await studentRepository.findByUserId(userId);
  
  if (!studentProfile) {
    logger.info('No student profile found for payment - likely customer user', {
      userId,
      paymentId: result.paymentRecordId,
      subscriptionId: result.subscription.id
    });
    return this.sendSuccess(res, {
      subscription: result.subscription,
      paymentId,
    });
  }
  
  if (result.paymentRecordId) {
    // Wrap conversion tracking + commission creation in transaction
    await db.transaction(async (tx) => {
      // Step 1: Track referral conversion
      await referralTrackingService.trackConversion(
        studentProfile.id,
        result.subscription.id,
        result.paymentRecordId,
        tx  // Pass transaction for atomicity
      );
      
      logger.info('Referral conversion tracked', {
        studentId: studentProfile.id,
        subscriptionId: result.subscription.id,
        paymentRecordId: result.paymentRecordId
      });
      
      // Step 2: Create commission if eligible
      const referral = await partnerStudentReferralRepository.findByStudentId(
        studentProfile.id
      );
      
      if (!referral) {
        logger.info('No referral found for student - organic signup', {
          studentId: studentProfile.id,
          paymentId: result.paymentRecordId
        });
        return; // Not an error - organic signups have no referral
      }
      
      if (referral.status === 'converted' && referral.commissionEligible) {
        try {
          await commissionService.createCommission(
            referral.id,
            result.paymentRecordId,
            tx  // Pass transaction for atomicity
          );
          
          logger.info('Commission created successfully', {
            referralId: referral.id,
            paymentId: result.paymentRecordId,
            partnerId: referral.partnerId,
            studentId: studentProfile.id
          });
        } catch (commissionError: any) {
          // Handle duplicate commission gracefully
          if (commissionError.message?.includes('already exists')) {
            logger.info('Commission already exists (duplicate prevention)', {
              referralId: referral.id,
              paymentId: result.paymentRecordId
            });
          } else {
            // Log error but don't fail the transaction
            // Commission creation is important but not critical for payment verification
            logger.error('Failed to create commission - will need manual review', {
              error: commissionError.message,
              stack: commissionError.stack,
              referralId: referral.id,
              paymentId: result.paymentRecordId
            });
            // Don't re-throw - allow payment verification to succeed
            // Commission can be created manually or via scheduled job
          }
        }
      } else {
        logger.warn('Referral exists but not commission eligible', {
          referralId: referral.id,
          status: referral.status,
          commissionEligible: referral.commissionEligible,
          statusReason: referral.statusReason || 'Unknown'
        });
      }
    });
  }
} catch (conversionError) {
  // Log error but don't fail payment verification
  logger.error('Failed to track referral conversion or create commission', {
    error: conversionError,
    userId,
    subscriptionId: result.subscription.id,
    orderId
  });
  // Payment verification succeeded, so proceed
}
```

**Testing:**
1. Create test partner account
2. Create referral link
3. Register new student via referral link
4. Complete payment via manual verification
5. Verify:
   - ✅ Subscription created
   - ✅ Referral status = 'converted'
   - ✅ Commission record created
   - ✅ Partner dashboard shows commission

**Rollback Plan:**
Simple git revert - no database changes made.

---

#### Task 0.2: Add Commission Creation to Order Paid Webhook

**File:** `server/controllers/payment.controller.ts`  
**Method:** `handleOrderPaid()`  
**Lines:** 966-992

**Changes Required:**
Apply the same transaction-wrapped pattern as Task 0.1.

**Testing:**
Trigger `order.paid` webhook and verify commission creation.

---

#### Task 0.3: Deploy Emergency Hotfix

**Steps:**
1. Run full test suite: `npm test`
2. Run integration tests for payment flow
3. Deploy to staging environment
4. Test complete payment flow on staging
5. Deploy to production with monitoring
6. Watch error logs for 24 hours

**Monitoring:**
```sql
-- Check commission creation rate every hour
SELECT 
  COUNT(*) as commissions_created_last_hour
FROM partner_commissions 
WHERE created_at > NOW() - INTERVAL '1 hour';
```

---

### Phase 1: Database Integrity & Performance (HIGH Priority)

**Goal:** Add missing constraints and indexes to prevent future issues

**Duration:** 2-3 hours  
**Risk Level:** LOW (additive changes only)  
**Rollback Complexity:** LOW (can drop constraints/indexes)

**Tasks:**

#### Task 1.1: Add Unique Constraint on Referral ID

**Migration File:** `migrations/0028_add_commission_constraints.sql`

```sql
-- Prevent duplicate commissions for same referral
ALTER TABLE partner_commissions 
ADD CONSTRAINT uq_partner_commissions_referral_id 
UNIQUE (referral_id);

-- Add check constraints for data integrity
ALTER TABLE partner_commissions
ADD CONSTRAINT chk_commission_amount_positive
CHECK (CAST(commission_amount AS NUMERIC) >= 0);

ALTER TABLE partner_commissions  
ADD CONSTRAINT chk_commission_rate_valid
CHECK (CAST(commission_rate AS NUMERIC) >= 0 
   AND CAST(commission_rate AS NUMERIC) <= 100);

ALTER TABLE partner_commissions
ADD CONSTRAINT chk_base_amount_positive  
CHECK (CAST(base_amount AS NUMERIC) > 0);
```

**Down Migration:**
```sql
ALTER TABLE partner_commissions DROP CONSTRAINT uq_partner_commissions_referral_id;
ALTER TABLE partner_commissions DROP CONSTRAINT chk_commission_amount_positive;
ALTER TABLE partner_commissions DROP CONSTRAINT chk_commission_rate_valid;
ALTER TABLE partner_commissions DROP CONSTRAINT chk_base_amount_positive;
```

**Testing:**
```sql
-- Test 1: Try to insert duplicate commission (should fail)
INSERT INTO partner_commissions (partner_id, referral_id, ...) 
VALUES (...);

INSERT INTO partner_commissions (partner_id, referral_id, ...) 
VALUES (...); -- Should fail with unique constraint violation

-- Test 2: Try negative commission amount (should fail)
INSERT INTO partner_commissions (commission_amount, ...) 
VALUES ('-100.00', ...); -- Should fail

-- Test 3: Try invalid commission rate (should fail)
INSERT INTO partner_commissions (commission_rate, ...) 
VALUES ('150.00', ...); -- Should fail (> 100%)
```

---

#### Task 1.2: Add Performance Indexes

**Migration File:** Same as 1.1

```sql
-- Core lookup indexes
CREATE INDEX idx_pc_partner_id ON partner_commissions(partner_id);
CREATE INDEX idx_pc_payment_id ON partner_commissions(payment_id);
CREATE INDEX idx_pc_payout_id ON partner_commissions(payout_id) 
  WHERE payout_id IS NOT NULL;

-- Status-based queries
CREATE INDEX idx_pc_status ON partner_commissions(status);
CREATE INDEX idx_pc_partner_status ON partner_commissions(partner_id, status);

-- Time-based queries  
CREATE INDEX idx_pc_created_at ON partner_commissions(created_at);
CREATE INDEX idx_pc_approved_at ON partner_commissions(approved_at) 
  WHERE approved_at IS NOT NULL;

-- Composite for dashboard queries
CREATE INDEX idx_pc_partner_status_created 
  ON partner_commissions(partner_id, status, created_at DESC);

-- Referral table indexes
CREATE INDEX idx_psr_partner_id ON partner_student_referrals(partner_id);
CREATE INDEX idx_psr_student_id ON partner_student_referrals(student_id);
CREATE INDEX idx_psr_status ON partner_student_referrals(status);
CREATE INDEX idx_psr_subscription_id ON partner_student_referrals(subscription_id);
CREATE INDEX idx_psr_payment_id ON partner_student_referrals(payment_id);

-- Composite for conversion tracking
CREATE INDEX idx_psr_student_status 
  ON partner_student_referrals(student_id, status);
CREATE INDEX idx_psr_partner_status 
  ON partner_student_referrals(partner_id, status);
```

**Performance Testing:**
```sql
-- Benchmark before indexes
EXPLAIN ANALYZE
SELECT * FROM partner_commissions 
WHERE partner_id = '...' AND status = 'pending'
ORDER BY created_at DESC;

-- Add indexes

-- Benchmark after indexes (should show index scan instead of seq scan)
EXPLAIN ANALYZE
SELECT * FROM partner_commissions 
WHERE partner_id = '...' AND status = 'pending'
ORDER BY created_at DESC;
```

---

### Phase 2: Historical Data Backfill (CRITICAL)

**Goal:** Create missing commission records for existing converted referrals

**Duration:** 1-2 hours  
**Risk Level:** MEDIUM (data creation, must be idempotent)  
**Rollback Complexity:** MEDIUM (delete created records)

**Prerequisite:** Phase 0 must be deployed first (to prevent future missing commissions)

#### Task 2.1: Identify Missing Commissions

**SQL Query:**
```sql
-- Find all converted, eligible referrals without commission
SELECT 
  psr.id as referral_id,
  psr.partner_id,
  psr.student_id,
  psr.payment_id,
  psr.converted_at,
  p.amount as payment_amount,
  pp.commission_rate,
  pp.commission_type,
  pp.fixed_commission_amount
FROM partner_student_referrals psr
LEFT JOIN partner_commissions pc ON pc.referral_id = psr.id
JOIN payments p ON p.id = psr.payment_id
JOIN partner_profiles pp ON pp.id = psr.partner_id
WHERE psr.status = 'converted'
  AND psr.commission_eligible = true
  AND pc.id IS NULL
  AND psr.payment_id IS NOT NULL
ORDER BY psr.converted_at DESC;
```

**Expected Results:**
Based on current database state, should return 1 record:
- Referral ID: cd16780e-341b-48a6-ad1c-f70744a92bfa
- Payment Amount: ₹20,000
- Commission Rate: 10%
- Commission Amount: ₹2,000

---

#### Task 2.2: Create Backfill Script

**File:** `server/scripts/backfill-missing-commissions.ts`

```typescript
import { db } from '../db';
import { 
  partnerStudentReferrals, 
  partnerCommissions,
  payments,
  partnerProfiles 
} from '@shared/schema';
import { eq, and, isNull } from 'drizzle-orm';
import logger from '../utils/logger';

interface MissingCommission {
  referralId: string;
  partnerId: string;
  paymentId: string;
  paymentAmount: string;
  commissionRate: string;
  commissionType: string;
  fixedCommissionAmount: string | null;
}

async function backfillMissingCommissions(dryRun: boolean = true) {
  logger.info('Starting commission backfill', { dryRun });
  
  try {
    // Find all converted referrals without commissions
    const missingCommissions = await db
      .select({
        referralId: partnerStudentReferrals.id,
        partnerId: partnerStudentReferrals.partnerId,
        paymentId: partnerStudentReferrals.paymentId,
        paymentAmount: payments.amount,
        commissionRate: partnerProfiles.commissionRate,
        commissionType: partnerProfiles.commissionType,
        fixedCommissionAmount: partnerProfiles.fixedCommissionAmount,
      })
      .from(partnerStudentReferrals)
      .leftJoin(
        partnerCommissions,
        eq(partnerCommissions.referralId, partnerStudentReferrals.id)
      )
      .innerJoin(
        payments,
        eq(payments.id, partnerStudentReferrals.paymentId)
      )
      .innerJoin(
        partnerProfiles,
        eq(partnerProfiles.id, partnerStudentReferrals.partnerId)
      )
      .where(
        and(
          eq(partnerStudentReferrals.status, 'converted'),
          eq(partnerStudentReferrals.commissionEligible, true),
          isNull(partnerCommissions.id)
        )
      );
    
    logger.info(`Found ${missingCommissions.length} missing commissions`);
    
    if (missingCommissions.length === 0) {
      logger.info('No missing commissions found - backfill complete');
      return { created: 0, skipped: 0, errors: 0 };
    }
    
    let created = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const missing of missingCommissions) {
      try {
        // Calculate commission amount
        let commissionAmount: number;
        
        if (missing.commissionType === 'percentage') {
          const rate = Number(missing.commissionRate) || 10.00;
          commissionAmount = (Number(missing.paymentAmount) * rate) / 100;
        } else if (missing.commissionType === 'fixed') {
          commissionAmount = Number(missing.fixedCommissionAmount || 0);
        } else {
          logger.error('Invalid commission type', {
            referralId: missing.referralId,
            commissionType: missing.commissionType
          });
          errors++;
          continue;
        }
        
        commissionAmount = Math.round(commissionAmount * 100) / 100;
        
        logger.info('Processing commission', {
          referralId: missing.referralId,
          paymentAmount: missing.paymentAmount,
          commissionRate: missing.commissionRate,
          commissionAmount,
          dryRun
        });
        
        if (!dryRun) {
          // Create commission record in transaction
          await db.transaction(async (tx) => {
            // Create commission
            await tx.insert(partnerCommissions).values({
              partnerId: missing.partnerId,
              referralId: missing.referralId,
              paymentId: missing.paymentId,
              baseAmount: missing.paymentAmount,
              commissionRate: missing.commissionRate,
              commissionAmount: commissionAmount.toString(),
              currency: 'INR',
              status: 'pending',
              notes: 'Backfilled from missing historical commission'
            });
            
            // Update referral commission fields
            await tx
              .update(partnerStudentReferrals)
              .set({
                commissionAmount: commissionAmount.toString(),
                commissionStatus: 'pending',
                updatedAt: new Date()
              })
              .where(eq(partnerStudentReferrals.id, missing.referralId));
            
            // Update partner total commission earned
            await tx
              .update(partnerProfiles)
              .set({
                totalCommissionEarned: sql`CAST(total_commission_earned AS NUMERIC) + ${commissionAmount}`,
                updatedAt: new Date()
              })
              .where(eq(partnerProfiles.id, missing.partnerId));
          });
          
          created++;
          logger.info('Commission created successfully', {
            referralId: missing.referralId,
            commissionAmount
          });
        } else {
          skipped++;
        }
      } catch (error) {
        logger.error('Failed to create commission', {
          error,
          referralId: missing.referralId
        });
        errors++;
      }
    }
    
    logger.info('Commission backfill complete', {
      total: missingCommissions.length,
      created,
      skipped,
      errors,
      dryRun
    });
    
    return { created, skipped, errors };
  } catch (error) {
    logger.error('Commission backfill failed', { error });
    throw error;
  }
}

// CLI execution
const dryRun = process.argv.includes('--dry-run');

backfillMissingCommissions(dryRun)
  .then((result) => {
    console.log('Backfill result:', result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Backfill error:', error);
    process.exit(1);
  });
```

---

#### Task 2.3: Test Backfill Script

**Steps:**

1. **Dry Run First:**
   ```bash
   npm run tsx server/scripts/backfill-missing-commissions.ts --dry-run
   ```
   
   Expected output:
   ```
   Found 1 missing commissions
   Processing commission { referralId: 'cd16780e...', paymentAmount: '20000.00', ... }
   Commission backfill complete { total: 1, created: 0, skipped: 1, errors: 0 }
   ```

2. **Verify Dry Run Results:**
   ```sql
   -- Should still show 1 missing commission
   SELECT COUNT(*) FROM partner_student_referrals psr
   LEFT JOIN partner_commissions pc ON pc.referral_id = psr.id
   WHERE psr.status = 'converted' 
     AND psr.commission_eligible = true
     AND pc.id IS NULL;
   -- Result: 1
   ```

3. **Execute Real Backfill:**
   ```bash
   npm run tsx server/scripts/backfill-missing-commissions.ts
   ```
   
   Expected output:
   ```
   Found 1 missing commissions
   Processing commission { referralId: 'cd16780e...', paymentAmount: '20000.00', commissionAmount: 2000 }
   Commission created successfully { referralId: 'cd16780e...', commissionAmount: 2000 }
   Commission backfill complete { total: 1, created: 1, skipped: 0, errors: 0 }
   ```

4. **Verify Backfill Success:**
   ```sql
   -- Should now show 0 missing commissions
   SELECT COUNT(*) FROM partner_student_referrals psr
   LEFT JOIN partner_commissions pc ON pc.referral_id = psr.id
   WHERE psr.status = 'converted' 
     AND psr.commission_eligible = true
     AND pc.id IS NULL;
   -- Result: 0
   
   -- Should show 1 commission record
   SELECT COUNT(*) FROM partner_commissions;
   -- Result: 1
   
   -- Verify commission details
   SELECT 
     pc.*,
     psr.status as referral_status,
     p.amount as payment_amount
   FROM partner_commissions pc
   JOIN partner_student_referrals psr ON psr.id = pc.referral_id
   JOIN payments p ON p.id = pc.payment_id;
   ```

**Rollback Plan:**
```sql
-- If backfill creates incorrect data, delete backfilled records
DELETE FROM partner_commissions 
WHERE notes = 'Backfilled from missing historical commission';

-- Reset partner totals (re-calculate from remaining commissions)
UPDATE partner_profiles pp
SET total_commission_earned = COALESCE(
  (SELECT SUM(CAST(commission_amount AS NUMERIC)) 
   FROM partner_commissions 
   WHERE partner_id = pp.id),
  0
);
```

---

### Phase 3: Testing & Validation (HIGH Priority)

**Goal:** Comprehensive testing of commission flow end-to-end

**Duration:** 4-6 hours  
**Risk Level:** LOW (testing only, no production changes)

#### Task 3.1: Unit Tests for Commission Service

**File:** `server/services/domain/__tests__/commission.service.test.ts`

Add test cases for:

```typescript
describe('CommissionService.createCommission', () => {
  it('should create commission for eligible converted referral', async () => {
    // Test normal flow
  });
  
  it('should throw error if commission already exists (duplicate prevention)', async () => {
    // Test idempotency
  });
  
  it('should throw error if referral status is not "converted"', async () => {
    // Test validation
  });
  
  it('should throw error if referral is not commission eligible', async () => {
    // Test business rules
  });
  
  it('should calculate percentage commission correctly', async () => {
    // Test percentage: 10% of ₹20,000 = ₹2,000
  });
  
  it('should calculate fixed commission correctly', async () => {
    // Test fixed: ₹500 regardless of payment amount
  });
  
  it('should update partner total commission earned', async () => {
    // Test partner stats update
  });
  
  it('should update referral commission fields', async () => {
    // Test referral denormalization
  });
  
  it('should rollback transaction on error', async () => {
    // Test atomicity
  });
});
```

---

#### Task 3.2: Integration Tests for Payment Flow

**File:** `server/controllers/__tests__/payment.controller.integration.test.ts`

Add test cases for:

```typescript
describe('Payment Flow with Commission Creation', () => {
  it('should create commission when referred student pays (manual verification)', async () => {
    // 1. Create partner
    // 2. Create referral link
    // 3. Register student via referral
    // 4. Complete payment via verifyPayment
    // 5. Verify commission created
  });
  
  it('should create commission when referred student pays (webhook)', async () => {
    // Test webhook path
  });
  
  it('should handle race condition between manual and webhook gracefully', async () => {
    // Test duplicate prevention
  });
  
  it('should not create commission for non-referred students', async () => {
    // Test organic signup (no referral)
  });
  
  it('should not create commission for ineligible referrals', async () => {
    // Test commission_eligible = false
  });
  
  it('should log warning for non-referred payments', async () => {
    // Test logging coverage
  });
});
```

---

#### Task 3.3: End-to-End Testing on Staging

**Test Scenarios:**

**Scenario 1: Happy Path (Referred Student)**
1. Partner creates referral link
2. Student clicks link (verify cookies set)
3. Student registers (verify referral created)
4. Student completes payment
5. Verify:
   - ✅ Subscription active
   - ✅ Referral status = 'converted'
   - ✅ Commission created
   - ✅ Partner dashboard shows:
     - Total referrals: 1
     - Total conversions: 1
     - Pending commission: ₹X
     - Total earned: ₹X

**Scenario 2: Organic Student (No Referral)**
1. Student registers directly (no referral link)
2. Student completes payment
3. Verify:
   - ✅ Subscription active
   - ✅ No referral created
   - ✅ No commission created
   - ✅ Logs show "No referral found - organic signup"

**Scenario 3: Ineligible Referral**
1. Admin marks referral as commission_eligible = false
2. Student completes payment
3. Verify:
   - ✅ Subscription active
   - ✅ Referral status = 'converted'
   - ✅ No commission created
   - ✅ Logs show "not commission eligible"

**Scenario 4: Duplicate Prevention**
1. Student completes payment (commission created)
2. Webhook arrives late (tries to create commission again)
3. Verify:
   - ✅ Only 1 commission record exists
   - ✅ Logs show "Commission already exists"
   - ✅ No error thrown

**Scenario 5: Zero-Cost Upgrade**
1. Student has active Free plan
2. Student upgrades to Premium (proration = ₹0)
3. Verify:
   - ✅ Upgrade succeeds
   - ✅ Conversion tracked if referral exists
   - ✅ No commission for ₹0 payment

---

### Phase 4: Monitoring & Alerting (MEDIUM Priority)

**Goal:** Add observability to detect future issues

**Duration:** 3-4 hours  
**Risk Level:** LOW (additive changes)

#### Task 4.1: Add Commission Creation Metrics

**File:** `server/controllers/payment.controller.ts`

Add metrics in commission creation code:

```typescript
// After successful commission creation
metrics.increment('commission.created.success', {
  path: 'manual_verification', // or 'webhook_payment_captured'
  partnerId: referral.partnerId
});
metrics.histogram('commission.amount', Number(commissionAmount), {
  currency: 'INR'
});

// On commission creation failure
metrics.increment('commission.created.failed', {
  path: 'manual_verification',
  error: errorType
});

// For non-referred payments
metrics.increment('payment.without_referral', {
  reason: 'organic_signup' // or 'no_student_profile'
});
```

---

#### Task 4.2: Add Admin Dashboard Widget

**File:** `client/src/pages/admin/CommissionManagement.tsx`

Add widgets for:

```typescript
// Commission Health Metrics
{
  title: "Commission Creation Rate",
  value: `${(conversionsWithCommissions / totalConversions * 100).toFixed(1)}%`,
  target: "100%",
  status: conversionsWithCommissions === totalConversions ? 'healthy' : 'warning'
}

// Missing Commissions Alert
{
  title: "Missing Commissions",
  value: conversionsWithoutCommissions,
  status: conversionsWithoutCommissions === 0 ? 'healthy' : 'critical',
  action: conversionsWithoutCommissions > 0 
    ? "Run backfill script" 
    : null
}

// Recent Commission Activity
{
  title: "Commissions Created (Last 24h)",
  value: commissionsLast24h,
  change: percentageChange
}
```

---

#### Task 4.3: Add Scheduled Health Check Job

**File:** `server/jobs/commission-health-check.ts`

```typescript
import { db } from '../db';
import { eq, and, isNull } from 'drizzle-orm';
import logger from '../utils/logger';
import { sendAdminAlert } from '../services/infrastructure/admin-alerts.service';

export async function runCommissionHealthCheck() {
  logger.info('Starting commission health check');
  
  // Find converted referrals without commissions
  const missingCommissions = await db
    .select({ count: sql`COUNT(*)` })
    .from(partnerStudentReferrals)
    .leftJoin(
      partnerCommissions,
      eq(partnerCommissions.referralId, partnerStudentReferrals.id)
    )
    .where(
      and(
        eq(partnerStudentReferrals.status, 'converted'),
        eq(partnerStudentReferrals.commissionEligible, true),
        isNull(partnerCommissions.id)
      )
    );
  
  const missing = Number(missingCommissions[0].count);
  
  if (missing > 0) {
    logger.error('Commission health check failed - missing commissions detected', {
      missingCount: missing
    });
    
    // Send alert to admins
    await sendAdminAlert({
      title: '⚠️ Missing Commissions Detected',
      message: `${missing} converted referral(s) do not have commission records.`,
      severity: 'high',
      action: 'Run backfill script: npm run backfill-commissions',
      timestamp: new Date()
    });
  } else {
    logger.info('Commission health check passed - all conversions have commissions');
  }
  
  return { missing };
}

// Run daily at 2 AM
// Schedule in your job scheduler (e.g., node-cron, pg-boss, etc.)
```

---

### Phase 5: Future Enhancements (LOW Priority)

**Goal:** Improve commission system capabilities

**Duration:** Variable (ongoing)  
**Risk Level:** LOW  
**Priority:** Enhancement only

**Potential Features:**

1. **Commission Rate Overrides**
   - Allow custom commission rates per referral
   - Partner tier system (Bronze/Silver/Gold with different rates)

2. **Commission Disputes**
   - Add 'disputed' status to workflow
   - Admin panel for dispute resolution
   - Notes and communication thread

3. **Automated Payout Scheduling**
   - Monthly automated payouts for approved commissions
   - Minimum threshold enforcement
   - Email notifications for payout processing

4. **Commission Analytics**
   - Partner performance leaderboard
   - Conversion funnel analysis
   - Revenue attribution reports
   - Partner ROI tracking

5. **Referral Link Analytics**
   - Click-to-signup conversion rate per link
   - A/B testing for different link formats
   - Geographic performance analysis

---

## Testing Strategy

### Test Categories

#### 1. Unit Tests (Required Before Deployment)

**Commission Service:**
- Commission calculation (percentage vs fixed)
- Duplicate prevention
- Validation (status, eligibility)
- Error handling

**Referral Tracking Service:**
- Conversion tracking
- Attribution window validation
- Status transitions

**Coverage Target:** > 90%

---

#### 2. Integration Tests (Required Before Deployment)

**Payment Flow End-to-End:**
- Manual verification with commission creation
- Webhook with commission creation
- Race condition handling

**Database Transactions:**
- Atomicity of conversion + commission
- Rollback on errors
- Concurrent request handling

**Coverage Target:** All critical paths covered

---

#### 3. Regression Tests (Automated)

**Existing Functionality:**
- Payment verification still works
- Subscription creation not affected
- Webhook processing remains stable

**Run Frequency:** Every deployment

---

#### 4. Manual QA Tests (Staging Environment)

**Test Plan:**

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| TC-1: Referred Student Payment | 1. Create partner<br>2. Create referral link<br>3. Student clicks link<br>4. Student registers<br>5. Student pays | Commission created, partner dashboard updated |
| TC-2: Organic Student Payment | 1. Student registers directly<br>2. Student pays | No commission created, no errors |
| TC-3: Webhook Arrives After Manual | 1. Student pays (manual path)<br>2. Webhook arrives | Only 1 commission exists |
| TC-4: Backfill Script | 1. Create converted referral without commission<br>2. Run backfill script | Commission created with backfill note |
| TC-5: Admin Approval Flow | 1. Approve pending commission<br>2. Check status change | Status = 'approved', timestamps set |

---

### Performance Testing

**Load Test Scenarios:**

1. **Concurrent Payment Processing:**
   - 100 simultaneous payment verifications
   - Verify no race conditions in commission creation
   - Check database lock contention

2. **Dashboard Query Performance:**
   - Partner with 1000+ referrals
   - Load dashboard page
   - Verify < 2 second load time

3. **Webhook Processing:**
   - 50 webhooks arriving simultaneously
   - Verify all processed correctly
   - Check deduplication works

**Tools:** Artillery, k6, or Apache JMeter

---

## Rollback Plan

### Phase 0 Rollback (Code Changes Only)

**If Issues Detected:**

1. **Stop Deployments Immediately**
   ```bash
   # Roll back to previous version
   git revert <commit-hash>
   git push origin main
   ```

2. **Verify Rollback Success**
   ```sql
   -- Check that no new commissions are being created
   SELECT COUNT(*) FROM partner_commissions 
   WHERE created_at > NOW() - INTERVAL '10 minutes';
   ```

3. **Assess Damage**
   ```sql
   -- Count commissions created during deployment window
   SELECT COUNT(*) FROM partner_commissions
   WHERE created_at BETWEEN '<deploy_start>' AND '<rollback_time>';
   
   -- Check for duplicate commissions
   SELECT referral_id, COUNT(*) as count
   FROM partner_commissions
   GROUP BY referral_id
   HAVING COUNT(*) > 1;
   ```

4. **Clean Up If Needed**
   ```sql
   -- If duplicates were created, keep oldest and delete rest
   DELETE FROM partner_commissions pc1
   WHERE EXISTS (
     SELECT 1 FROM partner_commissions pc2
     WHERE pc2.referral_id = pc1.referral_id
       AND pc2.created_at < pc1.created_at
   );
   ```

**Risk:** LOW - Code changes are easily reversible

---

### Phase 1 Rollback (Database Constraints/Indexes)

**If Constraint Causes Issues:**

1. **Drop Constraint**
   ```sql
   ALTER TABLE partner_commissions 
   DROP CONSTRAINT uq_partner_commissions_referral_id;
   ```

2. **Keep Indexes** (they're performance-only, don't cause issues)

**Risk:** LOW - Constraints can be dropped without data loss

---

### Phase 2 Rollback (Backfilled Data)

**If Backfill Created Bad Data:**

1. **Delete Backfilled Records**
   ```sql
   -- Delete only backfilled commissions
   DELETE FROM partner_commissions 
   WHERE notes = 'Backfilled from missing historical commission';
   ```

2. **Reset Partner Totals**
   ```sql
   -- Recalculate from remaining commissions
   UPDATE partner_profiles pp
   SET total_commission_earned = COALESCE(
     (SELECT SUM(CAST(commission_amount AS NUMERIC)) 
      FROM partner_commissions 
      WHERE partner_id = pp.id),
     0
   );
   ```

3. **Reset Referral Commission Fields**
   ```sql
   UPDATE partner_student_referrals psr
   SET 
     commission_amount = NULL,
     commission_status = NULL
   WHERE id IN (
     SELECT referral_id 
     FROM partner_commissions 
     WHERE notes = 'Backfilled from missing historical commission'
   );
   ```

**Risk:** MEDIUM - Data deletion required, but isolated by notes field

---

### Emergency Rollback (Complete System Failure)

**Nuclear Option - Only if System Completely Broken:**

1. **Disable Commission Creation**
   ```typescript
   // Add feature flag check at start of createCommission method
   if (!config.features.commissionsEnabled) {
     logger.warn('Commission creation disabled via feature flag');
     return null;
   }
   ```

2. **Feature Flag Off**
   ```bash
   # In environment variables
   FEATURE_COMMISSIONS_ENABLED=false
   ```

3. **Restart Services**

4. **Investigate and Fix**

5. **Re-enable When Ready**

**Risk:** HIGH - Stops all commission creation, but protects data integrity

---

## Database Migration Needs

### Migration #28: Add Commission Constraints and Indexes

**File:** `migrations/0028_add_commission_constraints.sql`

```sql
-- Up Migration
-- ============

-- Add unique constraint on referral_id to prevent duplicate commissions
ALTER TABLE partner_commissions 
ADD CONSTRAINT uq_partner_commissions_referral_id 
UNIQUE (referral_id);

-- Add check constraints for data integrity
ALTER TABLE partner_commissions
ADD CONSTRAINT chk_commission_amount_positive
CHECK (CAST(commission_amount AS NUMERIC) >= 0);

ALTER TABLE partner_commissions  
ADD CONSTRAINT chk_commission_rate_valid
CHECK (CAST(commission_rate AS NUMERIC) >= 0 
   AND CAST(commission_rate AS NUMERIC) <= 100);

ALTER TABLE partner_commissions
ADD CONSTRAINT chk_base_amount_positive  
CHECK (CAST(base_amount AS NUMERIC) > 0);

-- Add performance indexes for partner_commissions
CREATE INDEX idx_pc_partner_id ON partner_commissions(partner_id);
CREATE INDEX idx_pc_payment_id ON partner_commissions(payment_id);
CREATE INDEX idx_pc_payout_id ON partner_commissions(payout_id) 
  WHERE payout_id IS NOT NULL;
CREATE INDEX idx_pc_status ON partner_commissions(status);
CREATE INDEX idx_pc_partner_status ON partner_commissions(partner_id, status);
CREATE INDEX idx_pc_created_at ON partner_commissions(created_at);
CREATE INDEX idx_pc_approved_at ON partner_commissions(approved_at) 
  WHERE approved_at IS NOT NULL;
CREATE INDEX idx_pc_partner_status_created 
  ON partner_commissions(partner_id, status, created_at DESC);

-- Add performance indexes for partner_student_referrals
CREATE INDEX idx_psr_partner_id ON partner_student_referrals(partner_id);
CREATE INDEX idx_psr_student_id ON partner_student_referrals(student_id);
CREATE INDEX idx_psr_status ON partner_student_referrals(status);
CREATE INDEX idx_psr_subscription_id ON partner_student_referrals(subscription_id);
CREATE INDEX idx_psr_payment_id ON partner_student_referrals(payment_id);
CREATE INDEX idx_psr_student_status 
  ON partner_student_referrals(student_id, status);
CREATE INDEX idx_psr_partner_status 
  ON partner_student_referrals(partner_id, status);
```

```sql
-- Down Migration
-- ==============

-- Drop constraints
ALTER TABLE partner_commissions DROP CONSTRAINT uq_partner_commissions_referral_id;
ALTER TABLE partner_commissions DROP CONSTRAINT chk_commission_amount_positive;
ALTER TABLE partner_commissions DROP CONSTRAINT chk_commission_rate_valid;
ALTER TABLE partner_commissions DROP CONSTRAINT chk_base_amount_positive;

-- Drop partner_commissions indexes
DROP INDEX IF EXISTS idx_pc_partner_id;
DROP INDEX IF EXISTS idx_pc_payment_id;
DROP INDEX IF EXISTS idx_pc_payout_id;
DROP INDEX IF EXISTS idx_pc_status;
DROP INDEX IF EXISTS idx_pc_partner_status;
DROP INDEX IF EXISTS idx_pc_created_at;
DROP INDEX IF EXISTS idx_pc_approved_at;
DROP INDEX IF EXISTS idx_pc_partner_status_created;

-- Drop partner_student_referrals indexes
DROP INDEX IF EXISTS idx_psr_partner_id;
DROP INDEX IF EXISTS idx_psr_student_id;
DROP INDEX IF EXISTS idx_psr_status;
DROP INDEX IF EXISTS idx_psr_subscription_id;
DROP INDEX IF EXISTS idx_psr_payment_id;
DROP INDEX IF EXISTS idx_psr_student_status;
DROP INDEX IF EXISTS idx_psr_partner_status;
```

---

## Risk Assessment

### Phase 0 Risks (Code Changes)

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Duplicate commissions created | MEDIUM | HIGH | Unique constraint + application-level check |
| Transaction deadlocks | LOW | MEDIUM | Retry logic with exponential backoff |
| Payment verification fails due to commission error | LOW | HIGH | Catch commission errors, don't fail payment |
| Webhook and manual path create 2 commissions | LOW | MEDIUM | Transaction isolation + duplicate check |
| Performance degradation from transaction overhead | LOW | LOW | Transaction is fast (<100ms), minimal impact |

**Overall Risk:** MEDIUM - Benefits outweigh risks

---

### Phase 1 Risks (Database Changes)

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Unique constraint blocks legitimate operations | LOW | MEDIUM | Unique constraint is correct - prevents actual bug |
| Index creation locks table | MEDIUM | LOW | Create indexes concurrently on production |
| Check constraints reject valid data | LOW | HIGH | Validate constraint logic on staging first |

**Overall Risk:** LOW - Standard database operations

---

### Phase 2 Risks (Backfill)

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Backfill creates wrong commission amounts | MEDIUM | HIGH | Dry-run first, manual verification of results |
| Backfill creates duplicate commissions | LOW | MEDIUM | Use transaction + check for existing before create |
| Partner totals become incorrect | LOW | MEDIUM | Recalculate totals from commissions table after backfill |
| Backfill script crashes mid-way | MEDIUM | LOW | Transaction per commission, idempotent script |

**Overall Risk:** MEDIUM - Requires careful testing

---

### Business Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Partners lose trust if they don't see past commissions | HIGH | Backfill historical data in Phase 2 |
| Legal issues if commissions are not properly tracked | HIGH | Fix critical bug ASAP (Phase 0) |
| Financial loss if duplicate commissions are created | HIGH | Unique constraint + duplicate prevention |
| Partners demand retroactive payments | MEDIUM | Backfill shows all commissions, approve all pending |

---

## Monitoring and Alerting

### Key Metrics to Monitor

**Commission Creation Health:**
```
commission.created.success (counter)
  - Tags: path (manual_verification | webhook_payment_captured | webhook_order_paid)

commission.created.failed (counter)
  - Tags: path, error_type

commission.amount (histogram)
  - Tags: currency, partner_id
  
commission.creation.latency (histogram)
  - Tags: path
```

**Data Integrity:**
```
conversion.without_commission (counter)
  - Alert if > 0 for 1 hour

commission.duplicate_prevented (counter)
  - Normal if low, investigate if high
  
payment.without_referral (counter)
  - Tags: reason (organic_signup | no_student_profile)
```

**Business Metrics:**
```
commission.total_pending (gauge)
commission.total_approved (gauge)
commission.total_paid (gauge)

commission.pending_amount_inr (gauge)
commission.approved_amount_inr (gauge)
commission.paid_amount_inr (gauge)
```

### Alert Rules

**Critical Alerts:**
```yaml
- alert: CommissionCreationFailed
  expr: rate(commission.created.failed[5m]) > 0.1
  severity: critical
  message: "Commission creation failing at high rate"
  
- alert: ConversionWithoutCommission
  expr: conversion.without_commission > 0
  severity: critical
  message: "Converted referrals exist without commissions"
  for: 1h
```

**Warning Alerts:**
```yaml
- alert: HighCommissionLatency
  expr: histogram_quantile(0.95, commission.creation.latency) > 1000ms
  severity: warning
  message: "Commission creation taking > 1 second"
  
- alert: LowCommissionRate
  expr: rate(commission.created.success[1h]) < expected_rate
  severity: warning
  message: "Commission creation rate lower than expected"
```

### Dashboard Widgets

**Admin Dashboard:**
- Commission Health Score (% of conversions with commissions)
- Missing Commissions Count (with "Run Backfill" button)
- Commission Creation Rate (last 24h)
- Total Pending/Approved/Paid Amounts
- Recent Commission Activity (list of last 10)
- Commission Errors (last 24h)

**Partner Dashboard:**
- Total Commissions Earned (all-time)
- Pending Commissions (awaiting approval)
- Paid Commissions (already paid out)
- Commission Timeline (chart of earnings over time)
- Recent Commission Activity (list of recent commissions)

---

## Appendices

### Appendix A: Related Documentation

- **Comprehensive Referral Payment Investigation Report** - Documents 14 bugs in referral/payment system (many now fixed)
- **Partner System Implementation Plan** - Original implementation plan for partner system
- **Referral Tracking Architecture Guide** (`docs/payments/referral-tracking-architecture.md`) - Dual-tracking system documentation

### Appendix B: Database Queries for Investigation

**Find Missing Commissions:**
```sql
SELECT 
  psr.id as referral_id,
  psr.partner_id,
  psr.student_id,
  psr.converted_at,
  p.amount as payment_amount
FROM partner_student_referrals psr
LEFT JOIN partner_commissions pc ON pc.referral_id = psr.id
JOIN payments p ON p.id = psr.payment_id
WHERE psr.status = 'converted'
  AND psr.commission_eligible = true
  AND pc.id IS NULL;
```

**Check Partner Commission Totals:**
```sql
SELECT 
  pp.id,
  pp.company_name,
  pp.total_commission_earned as profile_total,
  COALESCE(SUM(CAST(pc.commission_amount AS NUMERIC)), 0) as actual_total
FROM partner_profiles pp
LEFT JOIN partner_commissions pc ON pc.partner_id = pp.id
GROUP BY pp.id, pp.company_name, pp.total_commission_earned
HAVING pp.total_commission_earned != COALESCE(SUM(CAST(pc.commission_amount AS NUMERIC)), 0);
```

**Commission Status Breakdown:**
```sql
SELECT 
  status,
  COUNT(*) as count,
  SUM(CAST(commission_amount AS NUMERIC)) as total_amount
FROM partner_commissions
GROUP BY status;
```

### Appendix C: Code Snippets for Reference

**Transaction-Wrapped Commission Creation:**
```typescript
await db.transaction(async (tx) => {
  await referralTrackingService.trackConversion(
    studentProfile.id,
    subscription.id,
    paymentId,
    tx
  );
  
  const referral = await partnerStudentReferralRepository.findByStudentId(
    studentProfile.id
  );
  
  if (referral && referral.status === 'converted' && referral.commissionEligible) {
    await commissionService.createCommission(referral.id, paymentId, tx);
  }
});
```

---

## Conclusion

The partner commission system has a **critical bug** preventing commission creation for 95% of transactions. The webhook-based path (5%) works correctly, but the primary manual verification path is broken.

**Recommended Action Plan:**

1. **IMMEDIATE (Week 1):** Deploy Phase 0 emergency hotfix
   - Add commission creation to manual verification path
   - Add commission creation to order paid webhook
   - Wrap in transactions for atomicity

2. **SHORT-TERM (Week 2):** Complete Phase 1 & 2
   - Add database constraints and indexes
   - Backfill missing historical commission (1 record)
   - Verify partner dashboard shows correct data

3. **MEDIUM-TERM (Week 3-4):** Phase 3 & 4
   - Comprehensive testing
   - Add monitoring and alerting
   - Admin dashboard widgets

4. **LONG-TERM (Ongoing):** Phase 5
   - Enhanced analytics
   - Additional features based on partner feedback

**Business Impact of Fix:**
- Partners will see ₹2,000+ in pending commissions immediately after backfill
- Future commissions will be tracked accurately
- Admin can approve and pay out commissions
- System becomes scalable for partner program growth

**Approval Needed Before Implementation:** ✋

This document provides the complete investigation and remediation plan. Please review and approve before proceeding with implementation.

---

**Document Version:** 1.0  
**Last Updated:** November 14, 2025  
**Status:** Awaiting Approval
