# Referral Tracking Bug Analysis

**Date:** November 13, 2025  
**Issue:** Student "manpreet" signed up using "singh's" referral link and bought a basic plan, but Singh's dashboard shows:
- Total Referrals: 0
- Total Conversions: 0
- Total Clicks: 3 (correctly tracked)

---

## Root Cause Summary

There are **TWO critical bugs** preventing referral tracking from working:

### Bug #1: Foreign Key Violation During Student Attribution (PRIMARY ISSUE)
**Location:** `server/services/domain/referral-tracking.service.ts` - Line 139

**The Problem:**
When a student registers with a referral code, the system tries to create a `partner_student_referrals` record. However, the code incorrectly passes the **student profile ID** as the **user ID**:

```typescript
const referral = await this.partnerStudentReferralRepo.create({
  partnerId,
  studentId,
  userId: studentId,  // ❌ BUG: studentId is student_profiles.id, NOT users.id
  referralLinkId,
  attributionMethod,
  promoCode,
  status: 'pending'
});
```

**Why It Fails:**
The `partner_student_referrals` table has TWO separate foreign keys:
- `studentId` → references `student_profiles.id`
- `userId` → references `users.id`

By passing `studentId` (which is a student profile ID) to the `userId` field (which expects a user ID), the database insert violates the foreign key constraint and fails.

**Silent Failure:**
The registration service catches this error but only logs it with `console.error()`:

```typescript
// Line 178 in registration.service.ts
} catch (referralError) {
  console.error('Failed to attribute referral:', referralError);
}
```

This means:
- Registration succeeds ✅
- User account is created ✅
- BUT no referral record is created ❌
- No error is shown to the user ❌

**Cascading Effects:**
Because no `partner_student_referrals` record is created:
1. `incrementReferralCount(partnerId)` never runs → **Singh sees 0 referrals**
2. `incrementConversionCount(referralLinkId)` never runs → **Link shows 0 conversions**

---

### Bug #2: Missing Conversion Tracking After Payment
**Location:** `server/controllers/payment.controller.ts`

**The Problem:**
When a student completes a payment, the system should call `referralTrackingService.trackConversion()` to:
- Update the referral status from `pending` → `converted`
- Increment the partner's conversion count
- Link the subscription and payment IDs to the referral record

**But this call is completely missing** from the payment verification flow.

**Search Results:**
```bash
$ grep -r "trackConversion" server/controllers/payment.controller.ts
# No matches found
```

Even if Bug #1 is fixed and referral records are created, conversions will still show as 0 because the payment flow never calls `trackConversion`.

---

## Complete Flow Analysis

### How It Should Work:

1. **Click Tracking** ✅ (Working)
   - User clicks Singh's referral link: `/ref/SINGH_CODE`
   - System records click in `referral_clicks` table
   - Sets cookies: `referral_code` and `click_id`
   - Redirects to signup page

2. **Registration Attribution** ❌ (Broken - Bug #1)
   - Student registers with referral cookies
   - `registerStudentComplete()` reads cookies
   - Calls `attributeStudentToPartner(studentId, partnerId, ...)`
   - **FAILS** with FK violation
   - **Silently swallows error** - no referral record created
   - Partner referral count stays at 0

3. **Payment & Conversion** ❌ (Broken - Bug #2)
   - Student purchases a plan
   - Payment is verified and subscription is activated
   - **`trackConversion()` is never called**
   - Partner conversion count stays at 0

---

## Evidence from Code

### Evidence #1: Incorrect userId Assignment
**File:** `server/services/domain/referral-tracking.service.ts` (Line 136-145)

```typescript
async attributeStudentToPartner(
  studentId: string,  // This is student_profiles.id
  partnerId: string,
  attributionMethod: AttributionMethod = 'link_click',
  clickId?: string,
  promoCode?: string
): Promise<PartnerStudentReferral> {
  try {
    // ... validation code ...

    const referral = await this.partnerStudentReferralRepo.create({
      partnerId,
      studentId,
      userId: studentId,  // ❌ WRONG: Using student profile ID as user ID
      referralLinkId,
      attributionMethod,
      promoCode,
      status: 'pending'
    });
```

### Evidence #2: Registration Error Handling
**File:** `server/services/domain/registration.service.ts` (Line 152-180)

```typescript
// Phase 6.2: Attribute to partner if referral code exists
if (referralCode) {
  try {
    // ... attribution code ...
  } catch (referralError) {
    // Log but don't fail registration if referral attribution fails
    console.error('Failed to attribute referral:', referralError);
    // ❌ PROBLEM: Error is silently swallowed, no alert raised
  }
}
```

### Evidence #3: Database Schema
**File:** `shared/schema.ts` (Line 307-332)

```typescript
export const partnerStudentReferrals = pgTable("partner_student_referrals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: uuid("partner_id").references(() => partnerProfiles.id, { onDelete: 'cascade' }).notNull(),
  studentId: uuid("student_id").references(() => studentProfiles.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  // ^ These are TWO DIFFERENT foreign keys pointing to different tables
```

### Evidence #4: Missing trackConversion Call
**File:** `server/controllers/payment.controller.ts`

The `trackConversion` method exists in `referral-tracking.service.ts` but is never called in the payment flow:

```bash
# No calls to trackConversion anywhere in payment.controller.ts
```

---

## Fix Required

### Fix #1: Pass Correct User ID to Attribution
**File:** `server/services/domain/referral-tracking.service.ts`

**Change the method signature** to accept both student profile ID and user ID:
```typescript
async attributeStudentToPartner(
  studentId: string,      // student_profiles.id
  userId: string,         // users.id (NEW PARAMETER)
  partnerId: string,
  attributionMethod: AttributionMethod = 'link_click',
  clickId?: string,
  promoCode?: string
): Promise<PartnerStudentReferral>
```

**Update the insert** to use the correct IDs:
```typescript
const referral = await this.partnerStudentReferralRepo.create({
  partnerId,
  studentId,    // student_profiles.id
  userId,       // users.id (now separate)
  referralLinkId,
  attributionMethod,
  promoCode,
  status: 'pending'
});
```

**Update the caller** in `registration.service.ts` (Line 167):
```typescript
await referralTrackingService.attributeStudentToPartner(
  studentProfile.id,        // student profile ID
  studentProfile.userId,    // user ID (from student profile)
  referralLink.partnerId,
  'link_click',
  clickId,
  undefined
);
```

### Fix #2: Add Conversion Tracking to Payment Flow
**File:** `server/controllers/payment.controller.ts`

Add this code after subscription creation (around line 415):

```typescript
// Track referral conversion if this student was referred
const { studentRepository } = await import('../repositories');
const { referralTrackingService } = await import('../services/domain/referral-tracking.service');

const studentProfile = await studentRepository.findByUserId(userId);
if (studentProfile) {
  await referralTrackingService.trackConversion(
    studentProfile.id,      // student profile ID
    subscription.id,        // subscription ID
    paymentId              // payment ID
  );
}
```

### Fix #3: Add Error Alerting
**File:** `server/services/domain/registration.service.ts`

Replace silent error logging with proper alerting:

```typescript
} catch (referralError) {
  // Log error and alert monitoring system
  logger.error('Failed to attribute referral - CRITICAL', {
    userId: result.user.id,
    referralCode,
    clickId,
    error: referralError
  });
  
  // Optionally send alert to monitoring service
  // This prevents silent failures in production
}
```

---

## Impact on Singh's Dashboard

### Current State (Broken):
- **Total Clicks:** 3 ✅ (correctly tracked)
- **Total Referrals:** 0 ❌ (should be 1+)
- **Total Conversions:** 0 ❌ (should be 1+)
- **Commission Earned:** ₹0 ❌ (no commission created)

### After Fix:
- **Total Clicks:** 3 ✅
- **Total Referrals:** 1+ ✅ (counts when Manpreet registered)
- **Total Conversions:** 1+ ✅ (counts when Manpreet bought plan)
- **Commission Earned:** ₹X.XX ✅ (commission calculated and tracked)

---

## Database Impact

### Current Database State:
```sql
-- Singh's referral link exists and has clicks
SELECT * FROM partner_referral_links WHERE partner_id = 'singh_id';
-- ✅ Returns 1 row

SELECT * FROM referral_clicks WHERE referral_link_id = 'singh_link_id';
-- ✅ Returns 3 rows (the clicks)

-- BUT no referral attribution exists for Manpreet
SELECT * FROM partner_student_referrals WHERE student_id = 'manpreet_id';
-- ❌ Returns 0 rows (should return 1 row)

-- Therefore no commission exists
SELECT * FROM partner_commissions WHERE partner_id = 'singh_id';
-- ❌ Returns 0 rows (should return 1 row after payment)
```

---

## Testing Recommendations

After implementing the fixes, test with the following sequence:

1. **Create a test referral link** for a partner
2. **Click the link** in incognito browser → Verify cookies are set
3. **Register a new student** with the referral cookies → Check logs for FK errors
4. **Query database:**
   ```sql
   SELECT * FROM partner_student_referrals WHERE student_id = 'new_student_id';
   -- Should return 1 row with status = 'pending'
   ```
5. **Purchase a plan** with the test student
6. **Query database again:**
   ```sql
   SELECT * FROM partner_student_referrals WHERE student_id = 'new_student_id';
   -- Should show status = 'converted' with subscription_id and payment_id populated
   
   SELECT * FROM partner_commissions WHERE referral_id = 'referral_id';
   -- Should return 1 row with calculated commission
   ```
7. **Check partner dashboard** → Should show 1 referral, 1 conversion

---

## Conclusion

The referral tracking system has **two critical bugs**:

1. **FK Violation Bug:** The code passes student profile ID where user ID is required, causing silent database insert failures during registration
2. **Missing Conversion Tracking:** The payment flow never calls `trackConversion()` to update referral status and increment conversion counts

Both bugs must be fixed for the referral system to work correctly. The fixes are straightforward but require careful attention to passing the correct IDs through the attribution flow.

---

**Next Steps:**
1. Implement Fix #1 to resolve the FK violation
2. Implement Fix #2 to add conversion tracking
3. Implement Fix #3 to add error alerting
4. Test the complete flow end-to-end
5. Consider adding a database migration or script to backfill any missed referrals (if applicable)
