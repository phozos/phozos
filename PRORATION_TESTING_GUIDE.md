# Proration Testing Guide
## End-to-End Manual Testing for Subscription Upgrades

**Document Version:** 1.0  
**Last Updated:** November 4, 2025  
**Purpose:** Manual QA testing guide for subscription proration functionality

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Testing Setup](#pre-testing-setup)
3. [Test Scenarios](#test-scenarios)
4. [Razorpay Dashboard Verification](#razorpay-dashboard-verification)
5. [Common Issues & Troubleshooting](#common-issues--troubleshooting)
6. [Test Data Reference](#test-data-reference)

---

## Overview

### What is Proration?

Proration ensures users only pay the difference when upgrading to a higher-tier subscription plan. For example:
- User pays ₹100 for Premium Plan
- User upgrades to Elite Plan (₹200)
- User only pays ₹100 (the difference), not ₹200 again

### Business Rules

1. **Upgrades Only**: Users can only upgrade to higher tiers, never downgrade
2. **Lifetime Subscriptions**: All subscriptions are lifetime (one-time payment)
3. **No Refunds**: Downgrades are not allowed, so no refunds are issued
4. **Currency Lock**: Users cannot change currency during upgrade
5. **Credit Applied**: Amount already paid is automatically credited toward upgrade

---

## Pre-Testing Setup

### 1. Environment Configuration

Ensure you have access to:
- **Frontend Application**: `http://localhost:5000` or production URL
- **Razorpay Dashboard**: https://dashboard.razorpay.com
- **Test Razorpay Account**: Use test mode API keys
- **Database Access**: To verify subscription records

### 2. Test Plans Setup

Ensure the following subscription plans exist in your database:

| Plan Name | Price (INR) | Tier Level | Features |
|-----------|-------------|------------|----------|
| Basic     | ₹50         | 1          | 10 universities, 5 countries |
| Premium   | ₹100        | 2          | 20 universities, 10 countries |
| Elite     | ₹200        | 3          | 50 universities, 20 countries |

**To verify plans exist:**
```sql
SELECT id, name, price, "tierLevel", currency, "isActive" 
FROM subscription_plans 
WHERE "isActive" = true 
ORDER BY "tierLevel";
```

### 3. Test User Accounts

Create or use test accounts with the following states:
1. **New User**: No subscription (for testing full-price purchases)
2. **Basic User**: Active Basic plan subscription
3. **Premium User**: Active Premium plan subscription
4. **Elite User**: Active Elite plan subscription (highest tier)

### 4. Test Payment Cards (Razorpay Test Mode)

Use these test cards for different scenarios:

| Card Number | Expiry | CVV | Outcome |
|-------------|--------|-----|---------|
| 4111 1111 1111 1111 | Any future date | Any 3 digits | Success |
| 4012 0010 3714 1112 | Any future date | Any 3 digits | Success (International) |
| 5555 5555 5555 4444 | Any future date | Any 3 digits | Declined |

---

## Test Scenarios

### Scenario 1: New Subscription (Full Price)

**Objective**: Verify that new users pay full price with no proration

**Preconditions**:
- User has no active subscription
- User is logged in

**Steps**:

1. **Navigate to Subscription Plans Page**
   - URL: `/subscription-plans`
   - Verify all plans are displayed with prices

2. **Select a Plan (e.g., Premium - ₹100)**
   - Click "Subscribe" or "Get Started" button on Premium plan card
   - Verify upgrade confirmation dialog appears

3. **Review Order Summary**
   - **Expected Values**:
     - Plan Name: "Premium Plan"
     - Original Price: ₹100
     - Already Paid: ₹0
     - Proration Discount: ₹0
     - **Total to Pay: ₹100**
     - Is Upgrade: No

4. **Proceed to Payment**
   - Click "Proceed to Payment" button
   - Razorpay checkout modal should open

5. **Verify Razorpay Checkout**
   - **Amount shown**: ₹100.00
   - **Currency**: INR
   - **Merchant Name**: Your application name

6. **Complete Payment**
   - Enter test card: 4111 1111 1111 1111
   - Expiry: Any future date (e.g., 12/25)
   - CVV: Any 3 digits (e.g., 123)
   - Click "Pay ₹100"

7. **Verify Success**
   - Success message: "Payment successful! Your subscription is now active."
   - User redirected to dashboard or subscription page
   - Plan badge shows "Premium" on user profile

8. **Database Verification**
   ```sql
   SELECT * FROM user_subscriptions 
   WHERE "userId" = '<user-id>' 
   AND status = 'active';
   ```
   - **Expected**:
     - `planId`: Premium plan ID
     - `status`: active
     - `amountPaid`: 100.00
     - `currency`: INR
     - `isLifetime`: true
     - `tierLevel`: 2

**✅ Pass Criteria**:
- User charged full price (₹100)
- No proration applied
- Subscription created successfully
- Order metadata shows `isUpgrade: false`

---

### Scenario 2: Upgrade with Proration

**Objective**: Verify that users upgrading from Premium to Elite only pay the difference

**Preconditions**:
- User has active Premium plan (₹100 paid)
- User is logged in

**Steps**:

1. **Navigate to Subscription Plans Page**
   - URL: `/subscription-plans`
   - Current plan badge should show "Premium" (active)

2. **Select Elite Plan (₹200)**
   - Click "Upgrade" button on Elite plan card
   - Verify upgrade confirmation dialog appears

3. **Review Order Summary**
   - **Expected Values**:
     - Current Plan: "Premium Plan"
     - New Plan: "Elite Plan"
     - Original Price: ₹200
     - Already Paid: ₹100
     - Proration Discount: ₹100
     - **Total to Pay: ₹100** (₹200 - ₹100)
     - Is Upgrade: Yes

4. **Proceed to Payment**
   - Click "Confirm Upgrade" button
   - Razorpay checkout modal should open

5. **Verify Razorpay Checkout**
   - **Amount shown**: ₹100.00 (NOT ₹200!)
   - **Currency**: INR
   - Description should mention "Upgrade to Elite Plan"

6. **Complete Payment**
   - Enter test card: 4111 1111 1111 1111
   - Complete payment for ₹100

7. **Verify Success**
   - Success message: "Upgrade successful! You are now on the Elite plan."
   - Plan badge shows "Elite" on user profile
   - User dashboard reflects Elite features

8. **Database Verification**
   ```sql
   SELECT * FROM user_subscriptions 
   WHERE "userId" = '<user-id>' 
   AND status = 'active';
   ```
   - **Expected**:
     - `planId`: Elite plan ID (updated from Premium)
     - `amountPaid`: 100.00 (only the upgrade amount, not total)
     - `tierLevel`: 3
     - Subscription ID remains same (updated, not created new)

**✅ Pass Criteria**:
- User charged only ₹100 (difference)
- Proration correctly calculated
- Existing subscription updated (not duplicated)
- Order metadata shows `isUpgrade: true`, `prorationAmount: 100`, `alreadyPaid: 100`

---

### Scenario 3: Same Plan Rejection

**Objective**: Verify that users cannot purchase the same plan they already have

**Preconditions**:
- User has active Premium plan

**Steps**:

1. **Navigate to Subscription Plans Page**
   - Current plan shows "Premium" with "Current Plan" badge

2. **Attempt to Select Premium Plan**
   - Premium plan card should show "Current Plan" badge
   - Subscribe/Upgrade button should be:
     - Disabled, OR
     - Replaced with "Current Plan" label

3. **If Button is Clickable (Edge Case)**
   - Click the button
   - **Expected**: Error message appears
   - **Message**: "You already have this plan"
   - Payment flow should NOT proceed

**✅ Pass Criteria**:
- User prevented from purchasing same plan
- Clear feedback message shown
- No payment initiated

---

### Scenario 4: Downgrade Rejection

**Objective**: Verify that users cannot downgrade to a lower tier

**Preconditions**:
- User has active Elite plan (tier 3)

**Steps**:

1. **Navigate to Subscription Plans Page**
   - Current plan shows "Elite" (tier 3)

2. **Attempt to Select Premium Plan (Tier 2)**
   - Premium plan card should show "Downgrade Not Allowed" or similar message
   - Subscribe button should be disabled

3. **If Button is Clickable (Edge Case)**
   - Click "Subscribe" on Premium plan
   - **Expected**: Error dialog appears
   - **Message**: "Cannot downgrade to a lower tier. Only upgrades to higher tiers are allowed."
   - Payment flow should NOT proceed

4. **Attempt to Select Basic Plan (Tier 1)**
   - Same behavior as Premium plan

**✅ Pass Criteria**:
- User prevented from downgrading
- Clear error message explaining why
- No payment initiated

---

### Scenario 5: Already at Highest Tier

**Objective**: Verify behavior when user is on the highest available tier

**Preconditions**:
- User has active Elite plan (tier 3, highest tier)

**Steps**:

1. **Navigate to Subscription Plans Page**
   - Elite plan shows "Current Plan" badge

2. **Verify UI State**
   - Elite plan card shows "Current Plan"
   - No upgrade options available
   - Optional: Message like "You're on the best plan!"

3. **Attempt to Click Elite Plan**
   - Button should be disabled OR show "Current Plan"
   - If clickable, error: "You already have this plan"

**✅ Pass Criteria**:
- Clear indication user is on highest tier
- No upgrade path shown
- Positive messaging (not error-focused)

---

### Scenario 6: Currency Mismatch

**Objective**: Verify that users cannot upgrade to plans with different currency

**Preconditions**:
- User has active Premium plan in INR
- Elite plan exists in USD (test scenario)

**Steps**:

1. **Navigate to Subscription Plans Page**

2. **Attempt to Upgrade to USD Plan**
   - Click upgrade on Elite plan (USD)
   - **Expected**: Error message appears
   - **Message**: "Currency mismatch: current plan is in INR, target plan is in USD"

3. **Verify Payment NOT Initiated**
   - Razorpay checkout should NOT open
   - User remains on current plan

**Note**: In production, all plans should use the same currency. This scenario tests data integrity.

**✅ Pass Criteria**:
- User prevented from cross-currency upgrades
- Clear error message
- System maintains data consistency

---

### Scenario 7: Invalid Plan ID

**Objective**: Verify error handling for deleted or non-existent plans

**Preconditions**:
- User is logged in

**Steps**:

1. **Trigger Invalid Plan Purchase**
   - Manually craft request with non-existent plan ID (developer test)
   - OR: Delete a plan while user has checkout open

2. **Attempt Payment**
   - Submit order creation request

3. **Expected Response**
   - HTTP 404 or 400 error
   - Error message: "Plan not found"
   - Graceful error handling (no crash)

**✅ Pass Criteria**:
- System handles invalid plan IDs gracefully
- Clear error message to user
- No payment initiated

---

### Scenario 8: Zero Proration (Same Price Upgrade)

**Objective**: Verify behavior when upgrade has no additional cost

**Preconditions**:
- User has active Plan A (₹100, tier 2)
- Plan B exists (₹100, tier 3, different features)

**Steps**:

1. **Navigate to Subscription Plans Page**

2. **Select Plan B (Same Price, Higher Tier)**
   - Click upgrade on Plan B

3. **Review Order Summary**
   - **Expected Values**:
     - Original Price: ₹100
     - Already Paid: ₹100
     - Proration Discount: ₹100
     - **Total to Pay: ₹0**
     - Is Upgrade: Yes

4. **Verify Payment Behavior**
   - **Option A**: Payment gateway should NOT open (no payment required)
   - **Option B**: Error message: "No payment required for this upgrade"
   - User's plan should be upgraded immediately without payment

5. **Database Verification**
   - User subscription updated to Plan B
   - No new payment record created
   - `amountPaid` remains 100.00

**✅ Pass Criteria**:
- User not charged for ₹0 upgrade
- Plan upgraded successfully
- Clear messaging about free upgrade

---

## Razorpay Dashboard Verification

### Accessing Razorpay Dashboard

1. **Login to Razorpay**
   - URL: https://dashboard.razorpay.com
   - Use test mode credentials

2. **Navigate to Orders**
   - Sidebar > Payments > Orders
   - Filter by date/status

### Verifying Order Details

For each test scenario, verify the following in Razorpay dashboard:

#### 1. Order Amount
- **New Subscription**: Order amount = Plan price
- **Upgrade**: Order amount = Proration amount (difference)

#### 2. Order Notes (Metadata)

Click on an order to view notes:

**New Subscription Notes**:
```json
{
  "userId": "user-uuid",
  "planId": "plan-uuid",
  "planName": "Premium Plan",
  "isLifetime": true,
  "isUpgrade": false,
  "originalPrice": "100",
  "prorationAmount": "100",
  "alreadyPaid": "0"
}
```

**Upgrade Notes**:
```json
{
  "userId": "user-uuid",
  "planId": "elite-plan-uuid",
  "planName": "Elite Plan",
  "isLifetime": true,
  "isUpgrade": true,
  "originalPrice": "200",
  "prorationAmount": "100",
  "alreadyPaid": "100"
}
```

#### 3. Payment Status

- **Successful Payment**: Status = `captured`
- **Failed Payment**: Status = `failed`
- **Pending Payment**: Status = `authorized` (rare)

#### 4. Receipt ID

- Format: `<timestamp>_<hash>` (e.g., `1730668192000_a1b2c3d4e5f6g7h8i9`)
- Should be unique for each order

### Common Razorpay Checks

✅ **Order Created**: Order appears in dashboard  
✅ **Correct Amount**: Amount matches expected proration  
✅ **Metadata Present**: Notes contain all required fields  
✅ **Payment Linked**: Payment linked to correct order  
✅ **Status Updated**: Order status updated after payment  

---

## Common Issues & Troubleshooting

### Issue 1: User Charged Full Price Instead of Prorated Amount

**Symptoms**:
- User has active subscription
- Upgrading charges full price (e.g., ₹200 instead of ₹100)

**Causes**:
- Proration calculation not working
- Order creation not checking for existing subscription

**Debug Steps**:
1. Check user's current subscription status in database
2. Verify `amountPaid` field is populated
3. Check API logs for proration calculation
4. Verify frontend is passing correct `planId`

**Fix**:
- Ensure `amountPaid` is stored when subscription is created
- Verify proration service is called in `createOrder` endpoint

---

### Issue 2: Duplicate Subscriptions Created

**Symptoms**:
- User has multiple active subscriptions
- Payment processed twice

**Causes**:
- Webhook and manual verification both creating subscriptions
- Missing idempotency checks

**Debug Steps**:
1. Check `user_subscriptions` table for multiple active rows
2. Check webhook logs for duplicate events
3. Verify order ID idempotency

**Fix**:
- Implement webhook deduplication
- Use database constraints (unique active subscription per user)

---

### Issue 3: Payment Signature Verification Fails

**Symptoms**:
- Payment successful in Razorpay
- Verification fails in application

**Causes**:
- Incorrect webhook secret
- Signature calculation mismatch

**Debug Steps**:
1. Check webhook secret in `.env` file
2. Verify raw body is used for signature verification
3. Check Razorpay signature calculation logic

**Fix**:
- Ensure `express.raw()` middleware is used for webhook route
- Verify webhook secret matches Razorpay dashboard

---

### Issue 4: Downgrade Allowed (Should Be Blocked)

**Symptoms**:
- User able to downgrade from Elite to Premium

**Causes**:
- Tier level validation not working
- Frontend not enforcing business rules

**Debug Steps**:
1. Check `tierLevel` values in database
2. Verify `canPurchasePlan` validation in backend
3. Check frontend plan filtering logic

**Fix**:
- Add tier level validation in `prorationService.calculate()`
- Disable downgrade buttons in frontend
- Add backend validation in `createOrder` endpoint

---

### Issue 5: Currency Mismatch Allowed

**Symptoms**:
- User with INR plan able to upgrade to USD plan

**Causes**:
- Currency validation missing in proration logic

**Debug Steps**:
1. Check currency field in `subscription_plans` table
2. Check currency field in `user_subscriptions` table
3. Verify currency validation in proration service

**Fix**:
- Add currency validation in `prorationService.calculate()`
- Return error if currencies don't match

---

## Test Data Reference

### Sample Plan Configuration

```sql
INSERT INTO subscription_plans (id, name, price, currency, "tierLevel", features, "maxUniversities", "maxCountries", "turnaroundDays", "isActive")
VALUES
  ('550e8400-e29b-41d4-a716-446655440010', 'Basic Plan', 50.00, 'INR', 1, ARRAY['Basic Feature 1', 'Basic Feature 2'], 10, 5, 10, true),
  ('550e8400-e29b-41d4-a716-446655440011', 'Premium Plan', 100.00, 'INR', 2, ARRAY['Premium Feature 1', 'Premium Feature 2'], 20, 10, 5, true),
  ('550e8400-e29b-41d4-a716-446655440012', 'Elite Plan', 200.00, 'INR', 3, ARRAY['Elite Feature 1', 'Elite Feature 2'], 50, 20, 2, true);
```

### Sample User with Subscription

```sql
-- Create test user
INSERT INTO users (id, email, password, "firstName", "lastName", "userType", "accountStatus")
VALUES ('user-uuid', 'testuser@example.com', 'hashed-password', 'Test', 'User', 'customer', 'active');

-- Create active subscription
INSERT INTO user_subscriptions ("userId", "planId", status, "startedAt", "amountPaid", currency, "tierLevel", "isLifetime", "lifetimeActivatedAt")
VALUES ('user-uuid', '550e8400-e29b-41d4-a716-446655440011', 'active', NOW(), 100.00, 'INR', 2, true, NOW());
```

### Expected API Responses

#### Create Order - New Subscription
```json
{
  "success": true,
  "data": {
    "orderId": "order_xyz123",
    "amount": 10000,
    "currency": "INR",
    "keyId": "rzp_test_...",
    "isUpgrade": false,
    "originalPrice": 100,
    "prorationAmount": 0,
    "alreadyPaid": 0
  }
}
```

#### Create Order - Upgrade
```json
{
  "success": true,
  "data": {
    "orderId": "order_abc456",
    "amount": 10000,
    "currency": "INR",
    "keyId": "rzp_test_...",
    "isUpgrade": true,
    "originalPrice": 200,
    "prorationAmount": 100,
    "alreadyPaid": 100
  }
}
```

#### Error - Downgrade Attempt
```json
{
  "success": false,
  "error": {
    "code": "PRORATION_NOT_ALLOWED",
    "message": "Cannot downgrade to a lower tier. Only upgrades to higher tiers are allowed."
  }
}
```

---

## Testing Checklist

Use this checklist to track your testing progress:

- [ ] **Scenario 1**: New subscription (full price)
- [ ] **Scenario 2**: Upgrade with proration
- [ ] **Scenario 3**: Same plan rejection
- [ ] **Scenario 4**: Downgrade rejection
- [ ] **Scenario 5**: Already at highest tier
- [ ] **Scenario 6**: Currency mismatch
- [ ] **Scenario 7**: Invalid plan ID
- [ ] **Scenario 8**: Zero proration
- [ ] **Razorpay Dashboard**: Verify all orders
- [ ] **Database**: Verify subscription records
- [ ] **UI/UX**: Test all user flows
- [ ] **Error Handling**: Test all error scenarios
- [ ] **Edge Cases**: Test boundary conditions

---

## Automated Test Execution

In addition to manual testing, run automated tests:

```bash
# Run all tests
npm test

# Run only proration tests
npm test -- proration

# Run with coverage
npm test -- --coverage
```

**Expected Coverage**: >80% for proration service

---

## Reporting Issues

When reporting issues, include:

1. **Scenario Name**: Which test scenario failed
2. **Steps to Reproduce**: Exact steps you followed
3. **Expected Behavior**: What should have happened
4. **Actual Behavior**: What actually happened
5. **Screenshots**: UI screenshots if applicable
6. **Logs**: Server logs and browser console logs
7. **Database State**: Current subscription and plan data
8. **Razorpay Order ID**: Order ID from dashboard (if applicable)

---

## Sign-Off

After completing all tests:

**Tester Name**: ___________________  
**Date**: ___________________  
**All Scenarios Passed**: ☐ Yes ☐ No  
**Issues Found**: ___________________  
**Notes**: ___________________

---

**End of Testing Guide**
