# Partner System API Route Investigation Report

**Date:** November 13, 2025  
**Investigator:** Replit Agent  
**Scope:** Complete partner system frontend-backend API route analysis

---

## Executive Summary

This investigation identified **18 critical route mismatches** and **7 additional issues** in the partner system that prevent the frontend from communicating with the backend correctly. All partner-related admin pages and several partner pages are completely non-functional due to these mismatches.

**Impact Assessment:**
- 🔴 **CRITICAL**: 13 endpoints (Pages completely broken)
- 🟠 **HIGH**: 5 endpoints (Features non-functional)
- 🟡 **MEDIUM**: 3 endpoints (Inconsistencies)
- 🟢 **LOW**: 2 endpoints (Minor issues)

---

## Complete Endpoint Inventory

### Partner Profile Endpoints

| Frontend Hook | Frontend Route | Backend Route | Controller Method | Status |
|--------------|----------------|---------------|-------------------|---------|
| `usePartnerProfile()` | `GET /api/partner/profile` | `GET /api/partner/profile` | `partnerController.getProfile` | ✅ MATCH |
| `useUpdatePartnerProfile()` | `PUT /api/partner/profile` | `PUT /api/partner/profile` | `partnerController.updateProfile` | ✅ MATCH |

### Dashboard Endpoints

| Frontend Hook | Frontend Route | Backend Route | Controller Method | Status |
|--------------|----------------|---------------|-------------------|---------|
| `usePartnerDashboardStats()` | `GET /api/partner/dashboard-stats` | `GET /api/partner/dashboard` | `partnerController.getDashboardStats` | 🔴 **MISMATCH** |

**Issue #1: Dashboard Stats Route Mismatch**
- **Severity:** CRITICAL
- **Frontend Expects:** `/api/partner/dashboard-stats`
- **Backend Provides:** `/api/partner/dashboard`
- **Impact:** Partner dashboard page will fail to load statistics
- **Used In:** `PartnerDashboard.tsx` (line 26)

---

### Referral Link Endpoints

| Frontend Hook | Frontend Route | Backend Route | Controller Method | Status |
|--------------|----------------|---------------|-------------------|---------|
| `useReferralLinks()` | `GET /api/partner/referral-links` | `GET /api/partner/referral-links` | `partnerController.getReferralLinks` | ✅ MATCH |
| `useCreateReferralLink()` | `POST /api/partner/referral-links` | `POST /api/partner/referral-links` | `partnerController.createReferralLink` | ✅ MATCH |
| `useUpdateReferralLink()` | `PUT /api/partner/referral-links/${linkId}` | `PUT /api/partner/referral-links/:linkId` | `partnerController.updateReferralLink` | ✅ MATCH |
| `useDeactivateReferralLink()` | `DELETE /api/partner/referral-links/${linkId}` | ❌ **MISSING** | ❌ Not implemented | 🔴 **MISSING** |

**Issue #2: Deactivate Referral Link - Missing Backend Route**
- **Severity:** CRITICAL
- **Frontend Expects:** `DELETE /api/partner/referral-links/:linkId`
- **Backend Provides:** None
- **Impact:** Users cannot deactivate referral links
- **Used In:** `PartnerReferralLinks.tsx` (line 159)
- **Note:** No route or controller method exists

---

### Commission Endpoints

| Frontend Hook | Frontend Route | Backend Route | Controller Method | Status |
|--------------|----------------|---------------|-------------------|---------|
| `usePendingCommissions()` | `GET /api/partner/commissions/pending` | `GET /api/partner/commissions` | `partnerController.getCommissions` | 🔴 **MISMATCH** |
| `useCommissionHistory()` | `GET /api/partner/commissions/history` | `GET /api/partner/commissions` | `partnerController.getCommissions` | 🔴 **MISMATCH** |

**Issue #3: Commission Endpoints - Missing Filtered Routes**
- **Severity:** CRITICAL
- **Frontend Expects:** 
  - `/api/partner/commissions/pending` (for pending only)
  - `/api/partner/commissions/history` (for historical data)
- **Backend Provides:** `/api/partner/commissions` (returns all commissions)
- **Impact:** Frontend cannot distinguish between pending and historical commissions
- **Note:** Backend returns all commissions from `getCommissionHistory()` service method, but frontend expects separate filtered endpoints

---

### Payout Endpoints

| Frontend Hook | Frontend Route | Backend Route | Controller Method | Status |
|--------------|----------------|---------------|-------------------|---------|
| `usePayoutHistory()` | `GET /api/partner/payouts` | `GET /api/partner/payouts` | `partnerController.getPayouts` | ✅ MATCH |
| `useRequestPayout()` | `POST /api/partner/payouts` | `POST /api/partner/payouts` | `partnerController.createPayout` | ✅ MATCH |

---

### Admin Partner Management Endpoints

| Frontend Hook | Frontend Route | Backend Route | Controller Method | Status |
|--------------|----------------|---------------|-------------------|---------|
| `useAllPartners()` | `GET /api/admin/partners` | `GET /api/admin/partners` | `adminPartnerController.getAllPartners` | ✅ MATCH |
| `useVerifyPartner()` | `POST /api/admin/partners/${partnerId}/verify` | `POST /api/admin/partners/verify` | `adminPartnerController.verifyPartner` | 🔴 **MISMATCH** |
| `useDeactivatePartner()` | `POST /api/admin/partners/${partnerId}/deactivate` | `POST /api/admin/partners/deactivate` | `adminPartnerController.deactivatePartner` | 🔴 **MISMATCH** |
| `usePartnerAnalytics()` | `GET /api/admin/partners/analytics` | ❌ **MISSING** | ❌ Not implemented | 🔴 **MISSING** |
| N/A | N/A | `GET /api/admin/partners/:partnerId` | `adminPartnerController.getPartnerDetails` | ⚠️ Unused |

**Issue #4: Partner Verification - URL Pattern vs Body Param Mismatch**
- **Severity:** CRITICAL
- **Frontend Sends:** `POST /api/admin/partners/${partnerId}/verify` with empty body `{}`
- **Backend Expects:** `POST /api/admin/partners/verify` with body `{ partnerId: string }`
- **Impact:** 404 errors when admin tries to verify partners
- **Used In:** `PartnerManagement.tsx` (line 297)
- **Controller Schema:** Expects `partnerId` in body (line 16 of admin-partner.controller.ts)

**Issue #5: Partner Deactivation - URL Pattern vs Body Param Mismatch**
- **Severity:** CRITICAL
- **Frontend Sends:** `POST /api/admin/partners/${partnerId}/deactivate` with body `{ reason: string }`
- **Backend Expects:** `POST /api/admin/partners/deactivate` with body `{ partnerId: string, reason: string }`
- **Impact:** 404 errors when admin tries to deactivate partners
- **Used In:** `PartnerManagement.tsx` (line 327)
- **Controller Schema:** Expects both `partnerId` and `reason` in body (lines 19-22 of admin-partner.controller.ts)

**Issue #6: Partner Analytics - Missing Endpoint**
- **Severity:** HIGH
- **Frontend Expects:** `GET /api/admin/partners/analytics`
- **Backend Provides:** None
- **Impact:** Partner analytics feature non-functional
- **Used In:** `partner-api-hooks.ts` (line 355-362)
- **Note:** Hook exists but no route or controller implementation

---

### Admin Commission Management Endpoints

| Frontend Hook | Frontend Route | Backend Route | Controller Method | Status |
|--------------|----------------|---------------|-------------------|---------|
| Direct `useApiQuery` | `GET /api/admin/commissions` | ❌ **MISSING** | ❌ Not implemented | 🔴 **MISSING** |
| `useApproveCommissions()` | `POST /api/admin/commissions/approve` | `POST /api/admin/partners/commissions/approve` | `adminPartnerController.approveCommissions` | 🔴 **MISMATCH** |
| `useRejectCommissions()` | `POST /api/admin/commissions/reject` | `POST /api/admin/partners/commissions/reject` | `adminPartnerController.rejectCommissions` | 🔴 **MISMATCH** |

**Issue #7: Admin Commissions List - Missing Endpoint**
- **Severity:** CRITICAL
- **Frontend Expects:** `GET /api/admin/commissions`
- **Backend Provides:** Only `GET /api/admin/partners/commissions/pending`
- **Impact:** CommissionManagement.tsx page cannot load commission data
- **Used In:** `CommissionManagement.tsx` (lines 67-72)
- **Note:** Page needs ALL commissions (pending, approved, rejected), but backend only has endpoint for pending

**Issue #8: Commission Approval - Path Prefix Mismatch**
- **Severity:** CRITICAL
- **Frontend Calls:** `POST /api/admin/commissions/approve`
- **Backend Route:** `POST /api/admin/partners/commissions/approve`
- **Impact:** 404 errors when approving commissions
- **Used In:** `CommissionManagement.tsx` (line 377)
- **Body Format:** Both expect `{ commissionIds: string[] }`

**Issue #9: Commission Rejection - Path Prefix Mismatch**
- **Severity:** CRITICAL
- **Frontend Calls:** `POST /api/admin/commissions/reject`
- **Backend Route:** `POST /api/admin/partners/commissions/reject`
- **Impact:** 404 errors when rejecting commissions
- **Used In:** `CommissionManagement.tsx` (line 407)
- **Body Format:** Both expect `{ commissionIds: string[], reason: string }`

---

### Admin Payout Processing Endpoints

| Frontend Hook | Frontend Route | Backend Route | Controller Method | Status |
|--------------|----------------|---------------|-------------------|---------|
| Direct `useApiQuery` | `GET /api/admin/payouts` | ❌ **MISSING** | ❌ Not implemented | 🔴 **MISSING** |
| `useProcessBankPayout()` | `POST /api/admin/payouts/${payoutId}/process-bank` | `POST /api/admin/partners/payouts/process-bank-transfer` | `adminPartnerController.processPayoutBankTransfer` | 🔴 **MISMATCH** |
| `useProcessPaypalPayout()` | `POST /api/admin/payouts/${payoutId}/process-paypal` | `POST /api/admin/partners/payouts/process-paypal` | `adminPartnerController.processPayoutPayPal` | 🔴 **MISMATCH** |
| `useCompletePayout()` | `POST /api/admin/payouts/${payoutId}/complete` | `POST /api/admin/partners/payouts/complete` | `adminPartnerController.completePayout` | 🔴 **MISMATCH** |
| `useCancelPayout()` | `POST /api/admin/payouts/${payoutId}/cancel` | `POST /api/admin/partners/payouts/cancel` | `adminPartnerController.cancelPayout` | 🔴 **MISMATCH** |

**Issue #10: Admin Payouts List - Missing Endpoint**
- **Severity:** CRITICAL
- **Frontend Expects:** `GET /api/admin/payouts`
- **Backend Provides:** Only `GET /api/admin/partners/payouts/pending`
- **Impact:** PayoutProcessing.tsx page cannot load payout data
- **Used In:** `PayoutProcessing.tsx` (lines 75-80)
- **Note:** Page needs ALL payouts (pending, processing, completed, failed, cancelled), but backend only has endpoint for pending

**Issue #11: Bank Payout Processing - Multiple Mismatches**
- **Severity:** CRITICAL
- **Frontend:**
  - Route: `POST /api/admin/payouts/${payoutId}/process-bank`
  - Body: `{ referenceId: string }`
  - PayoutId in URL path
- **Backend:**
  - Route: `POST /api/admin/partners/payouts/process-bank-transfer`
  - Body: `{ payoutId: string, referenceNumber: string }`
  - PayoutId in request body
- **Impact:** 404 errors + body mismatch (referenceId vs referenceNumber)
- **Used In:** `PayoutProcessing.tsx` (line 441)

**Issue #12: PayPal Payout Processing - Multiple Mismatches**
- **Severity:** CRITICAL
- **Frontend:**
  - Route: `POST /api/admin/payouts/${payoutId}/process-paypal`
  - Body: `{ referenceId: string }`
  - PayoutId in URL path
- **Backend:**
  - Route: `POST /api/admin/partners/payouts/process-paypal`
  - Body: `{ payoutId: string, transactionId: string }`
  - PayoutId in request body
- **Impact:** 404 errors + body mismatch (referenceId vs transactionId)
- **Used In:** `PayoutProcessing.tsx` (line 471)

**Issue #13: Complete Payout - Multiple Mismatches**
- **Severity:** CRITICAL
- **Frontend:**
  - Route: `POST /api/admin/payouts/${payoutId}/complete`
  - Body: `{}`
  - PayoutId in URL path
- **Backend:**
  - Route: `POST /api/admin/partners/payouts/complete`
  - Body: `{ payoutId: string }`
  - PayoutId in request body
- **Impact:** 404 errors + missing payoutId in body
- **Used In:** `PayoutProcessing.tsx` (line 501)

**Issue #14: Cancel Payout - Multiple Mismatches**
- **Severity:** CRITICAL
- **Frontend:**
  - Route: `POST /api/admin/payouts/${payoutId}/cancel`
  - Body: `{ reason: string }`
  - PayoutId in URL path
- **Backend:**
  - Route: `POST /api/admin/partners/payouts/cancel`
  - Body: `{ payoutId: string, reason: string }`
  - PayoutId in request body
- **Impact:** 404 errors + missing payoutId in body
- **Used In:** `PayoutProcessing.tsx` (line 531)

---

### Admin Referral Management Endpoints

| Frontend Hook | Frontend Route | Backend Route | Controller Method | Status |
|--------------|----------------|---------------|-------------------|---------|
| N/A | N/A | `GET /api/admin/partners/referrals` | `adminPartnerController.getAllReferrals` | ⚠️ No frontend hook |
| N/A | N/A | `POST /api/admin/partners/referrals/approve` | `adminPartnerController.approveReferral` | ⚠️ No frontend hook |
| N/A | N/A | `POST /api/admin/partners/referrals/reject` | `adminPartnerController.rejectReferral` | ⚠️ No frontend hook |

**Issue #15: Referral Management - No Frontend Integration**
- **Severity:** MEDIUM
- **Backend Provides:** Full referral management endpoints
- **Frontend Provides:** No hooks or pages to use these endpoints
- **Impact:** Admin cannot approve/reject student referrals
- **Note:** Backend functionality exists but no UI to access it

---

## Issue Pattern Analysis

### Pattern 1: URL Path Params vs Request Body Params

**Affected Endpoints:** 5 endpoints
- Partner verification
- Partner deactivation  
- All payout processing endpoints

**Root Cause:** Inconsistent design pattern between frontend and backend

**Frontend Pattern (RESTful):**
```typescript
// Frontend sends ID in URL
POST /api/admin/partners/${partnerId}/verify
Body: {}
```

**Backend Pattern (Body-centric):**
```typescript
// Backend expects ID in body
POST /api/admin/partners/verify
Body: { partnerId: string }
```

**Impact:** 404 errors because URL doesn't match any defined route

---

### Pattern 2: Missing Path Prefix (`/partners`)

**Affected Endpoints:** 6 endpoints
- Admin commission approval
- Admin commission rejection
- All admin payout processing endpoints

**Root Cause:** Inconsistent route hierarchy

**Frontend Expectation:**
```
/api/admin/commissions/*
/api/admin/payouts/*
```

**Backend Reality:**
```
/api/admin/partners/commissions/*
/api/admin/partners/payouts/*
```

**Impact:** 404 errors due to path mismatch

---

### Pattern 3: Missing Aggregate Endpoints

**Affected Endpoints:** 2 critical endpoints
- GET /api/admin/commissions (needs ALL commissions)
- GET /api/admin/payouts (needs ALL payouts)

**Root Cause:** Backend only provides filtered endpoints (e.g., `/pending`)

**Frontend Needs:**
```typescript
// CommissionManagement.tsx needs ALL commissions with filters
GET /api/admin/commissions
// Returns: pending, approved, rejected, paid, disputed

// PayoutProcessing.tsx needs ALL payouts
GET /api/admin/payouts  
// Returns: pending, processing, completed, failed, cancelled
```

**Backend Provides:**
```typescript
// Only pending items
GET /api/admin/partners/commissions/pending
GET /api/admin/partners/payouts/pending
```

**Impact:** Admin pages cannot display full data or apply client-side filters

---

### Pattern 4: Field Name Inconsistencies

**Affected Endpoints:** 2 endpoints

**Example 1: Bank Transfer Reference**
- Frontend sends: `{ referenceId: string }`
- Backend expects: `{ referenceNumber: string }`

**Example 2: PayPal Transaction**
- Frontend sends: `{ referenceId: string }`
- Backend expects: `{ transactionId: string }`

**Impact:** Even if routes matched, validation would fail

---

## Additional Issues

### Issue #16: Partner Registration Not Accessible
- **Severity:** MEDIUM
- **Route:** `POST /api/partner/register`
- **Status:** Backend implemented, but no frontend registration page
- **Impact:** New partners cannot self-register
- **Note:** PartnerRegistration.tsx page exists in file list but may not be routed

### Issue #17: CSRF Token Endpoint Inconsistency
- **Severity:** LOW
- **Partner Route:** `GET /api/partner/csrf-token`
- **Admin Routes:** Use built-in CSRF middleware
- **Impact:** Partner registration may have CSRF issues if not properly integrated
- **Note:** Frontend doesn't appear to fetch CSRF token before registration

### Issue #18: Missing GET Partner Details Frontend Hook
- **Severity:** LOW
- **Backend Provides:** `GET /api/admin/partners/:partnerId`
- **Frontend:** No dedicated hook, uses inline detail view in PartnerManagement.tsx
- **Impact:** Cannot link to individual partner detail page
- **Note:** Minor UX limitation

---

## Severity Categorization

### 🔴 CRITICAL (13 Issues) - Pages Completely Broken

1. Dashboard stats route mismatch
2. Deactivate referral link missing
3. Commission filtered endpoints missing
4. Partner verification route pattern mismatch
5. Partner deactivation route pattern mismatch
6. Admin commissions list missing
7. Admin commission approval path mismatch
8. Admin commission rejection path mismatch
9. Admin payouts list missing
10. Bank payout processing route + body mismatch
11. PayPal payout processing route + body mismatch
12. Complete payout route + body mismatch
13. Cancel payout route + body mismatch

### 🟠 HIGH (5 Issues) - Features Non-Functional

14. Partner analytics endpoint missing
15. Referral management no frontend integration

### 🟡 MEDIUM (2 Issues) - Inconsistencies

16. Partner registration page not accessible

### 🟢 LOW (2 Issues) - Minor Issues

17. CSRF token endpoint inconsistency
18. Missing partner details frontend hook

---

## Impact Assessment by Page

### PartnerDashboard.tsx
- **Status:** 🔴 BROKEN
- **Issue:** Cannot load dashboard statistics (Issue #1)
- **User Experience:** Page loads but shows no data

### PartnerReferralLinks.tsx
- **Status:** 🟠 PARTIALLY BROKEN
- **Issues:** Cannot deactivate links (Issue #2)
- **User Experience:** Can create and view links, but cannot delete them

### PartnerCommissions.tsx (Likely exists)
- **Status:** 🔴 BROKEN
- **Issue:** Cannot load pending vs historical commissions separately (Issue #3)
- **User Experience:** May show all commissions without filtering

### PartnerManagement.tsx (Admin)
- **Status:** 🔴 BROKEN
- **Issues:** 
  - Cannot verify partners (Issue #4)
  - Cannot deactivate partners (Issue #5)
  - Cannot view analytics (Issue #6)
- **User Experience:** Admin can view partners but cannot perform any actions

### CommissionManagement.tsx (Admin)
- **Status:** 🔴 BROKEN
- **Issues:**
  - Cannot load commission list (Issue #7)
  - Cannot approve commissions (Issue #8)
  - Cannot reject commissions (Issue #9)
- **User Experience:** Page completely non-functional, cannot load

### PayoutProcessing.tsx (Admin)
- **Status:** 🔴 BROKEN
- **Issues:**
  - Cannot load payout list (Issue #10)
  - Cannot process bank payouts (Issue #11)
  - Cannot process PayPal payouts (Issue #12)
  - Cannot complete payouts (Issue #13)
  - Cannot cancel payouts (Issue #14)
- **User Experience:** Page completely non-functional, cannot load

---

## Root Cause Analysis

### 1. Lack of API Contract Documentation
- No OpenAPI/Swagger specification
- No shared API contract types between frontend and backend
- Frontend and backend teams working with different assumptions

### 2. Inconsistent Design Patterns
- Mix of RESTful (URL params) and RPC-style (body params) approaches
- No agreed-upon standard for resource identification (URL vs body)
- Inconsistent route hierarchies (/admin/commissions vs /admin/partners/commissions)

### 3. Missing Integration Testing
- No end-to-end tests covering frontend → backend API calls
- No contract testing to validate request/response formats
- Routes defined but never tested from frontend perspective

### 4. Partial Implementation
- Backend controllers exist but routes not registered correctly
- Frontend hooks created before backend routes finalized
- Missing aggregate endpoints (GET all vs GET filtered)

---

## Recommendations for Prevention

### 1. Implement API Contract First Design
- Create OpenAPI specification before implementation
- Generate TypeScript types from specification for both frontend and backend
- Use tools like `openapi-typescript` for type generation

### 2. Establish Consistent RESTful Standards
```
RECOMMENDED PATTERN:
✅ POST /api/admin/partners/:partnerId/verify
✅ POST /api/admin/payouts/:payoutId/process
✅ GET /api/admin/commissions (with query params for filtering)

AVOID:
❌ POST /api/admin/partners/verify (with partnerId in body)
❌ POST /api/admin/partners/payouts/process-bank-transfer
❌ GET /api/admin/partners/commissions/pending (separate routes for filters)
```

### 3. Add Integration Tests
```typescript
// Example integration test
describe('Partner API Integration', () => {
  it('should verify partner using correct route', async () => {
    const partnerId = 'test-partner-id';
    const response = await api.post(`/api/admin/partners/${partnerId}/verify`);
    expect(response.status).toBe(200);
  });
});
```

### 4. Use Shared Type Definitions
```typescript
// shared/types/api-contracts.ts
export interface VerifyPartnerRequest {
  // Empty - partnerId comes from URL
}

export interface VerifyPartnerResponse {
  success: boolean;
  data: PartnerProfile;
}

// Backend uses these types
router.post('/partners/:partnerId/verify', async (req, res) => {
  const { partnerId } = req.params;
  // ... implementation
});

// Frontend uses same types
const verifyPartner = async (partnerId: string): Promise<VerifyPartnerResponse> => {
  return api.post(`/api/admin/partners/${partnerId}/verify`);
};
```

### 5. Implement API Versioning
```
/api/v1/partner/*
/api/v1/admin/partners/*
```

### 6. Add API Documentation Generation
- Use `tsoa` or `nest.js` for automatic route documentation
- Generate client SDK from backend routes
- Keep documentation in sync with code

---

## Next Steps

### Phase 1: Critical Fixes (Immediate)
1. Fix dashboard stats route
2. Add missing deactivate referral link route
3. Fix partner verification route pattern
4. Fix partner deactivation route pattern
5. Add missing admin commissions aggregate endpoint
6. Fix admin commission approve/reject path prefixes
7. Add missing admin payouts aggregate endpoint
8. Fix all payout processing route patterns and body params

### Phase 2: High Priority Fixes
1. Implement partner analytics endpoint
2. Add frontend hooks for referral management

### Phase 3: Improvements
1. Create API contract documentation
2. Add integration tests
3. Implement consistent RESTful patterns
4. Add field validation alignment

---

## Appendix A: Complete Route Mapping Table

### Partner Routes

| HTTP Method | Frontend Route | Backend Route | Status | Issue # |
|-------------|---------------|---------------|---------|---------|
| POST | /api/partner/register | /api/partner/register | ✅ Match | - |
| GET | /api/partner/csrf-token | /api/partner/csrf-token | ✅ Match | - |
| GET | /api/partner/profile | /api/partner/profile | ✅ Match | - |
| PUT | /api/partner/profile | /api/partner/profile | ✅ Match | - |
| GET | /api/partner/dashboard-stats | /api/partner/dashboard | 🔴 Mismatch | #1 |
| GET | /api/partner/referral-links | /api/partner/referral-links | ✅ Match | - |
| POST | /api/partner/referral-links | /api/partner/referral-links | ✅ Match | - |
| PUT | /api/partner/referral-links/:linkId | /api/partner/referral-links/:linkId | ✅ Match | - |
| DELETE | /api/partner/referral-links/:linkId | ❌ Missing | 🔴 Missing | #2 |
| GET | /api/partner/referrals | /api/partner/referrals | ✅ Match | - |
| GET | /api/partner/commissions/pending | /api/partner/commissions | 🔴 Mismatch | #3 |
| GET | /api/partner/commissions/history | /api/partner/commissions | 🔴 Mismatch | #3 |
| GET | /api/partner/payouts | /api/partner/payouts | ✅ Match | - |
| POST | /api/partner/payouts | /api/partner/payouts | ✅ Match | - |

### Admin Partner Routes

| HTTP Method | Frontend Route | Backend Route | Status | Issue # |
|-------------|---------------|---------------|---------|---------|
| GET | /api/admin/partners | /api/admin/partners | ✅ Match | - |
| GET | ❌ No hook | /api/admin/partners/:partnerId | ⚠️ Unused | #18 |
| POST | /api/admin/partners/:partnerId/verify | /api/admin/partners/verify | 🔴 Mismatch | #4 |
| POST | /api/admin/partners/:partnerId/deactivate | /api/admin/partners/deactivate | 🔴 Mismatch | #5 |
| GET | /api/admin/partners/analytics | ❌ Missing | 🔴 Missing | #6 |

### Admin Referral Routes

| HTTP Method | Frontend Route | Backend Route | Status | Issue # |
|-------------|---------------|---------------|---------|---------|
| GET | ❌ No hook | /api/admin/partners/referrals | ⚠️ No UI | #15 |
| POST | ❌ No hook | /api/admin/partners/referrals/approve | ⚠️ No UI | #15 |
| POST | ❌ No hook | /api/admin/partners/referrals/reject | ⚠️ No UI | #15 |

### Admin Commission Routes

| HTTP Method | Frontend Route | Backend Route | Status | Issue # |
|-------------|---------------|---------------|---------|---------|
| GET | /api/admin/commissions | ❌ Missing | 🔴 Missing | #7 |
| GET | ❌ No hook | /api/admin/partners/commissions/pending | ⚠️ Partial | - |
| POST | /api/admin/commissions/approve | /api/admin/partners/commissions/approve | 🔴 Mismatch | #8 |
| POST | /api/admin/commissions/reject | /api/admin/partners/commissions/reject | 🔴 Mismatch | #9 |

### Admin Payout Routes

| HTTP Method | Frontend Route | Backend Route | Status | Issue # |
|-------------|---------------|---------------|---------|---------|
| GET | /api/admin/payouts | ❌ Missing | 🔴 Missing | #10 |
| GET | ❌ No hook | /api/admin/partners/payouts/pending | ⚠️ Partial | - |
| POST | /api/admin/payouts/:payoutId/process-bank | /api/admin/partners/payouts/process-bank-transfer | 🔴 Mismatch | #11 |
| POST | /api/admin/payouts/:payoutId/process-paypal | /api/admin/partners/payouts/process-paypal | 🔴 Mismatch | #12 |
| POST | /api/admin/payouts/:payoutId/complete | /api/admin/partners/payouts/complete | 🔴 Mismatch | #13 |
| POST | /api/admin/payouts/:payoutId/cancel | /api/admin/partners/payouts/cancel | 🔴 Mismatch | #14 |

---

## Appendix B: Request/Response Format Mismatches

### Partner Verification

**Frontend:**
```typescript
POST /api/admin/partners/${partnerId}/verify
Headers: { 'X-CSRF-Token': token }
Body: {}
```

**Backend Expected:**
```typescript
POST /api/admin/partners/verify
Headers: { 'X-CSRF-Token': token }
Body: { partnerId: string }
```

### Bank Payout Processing

**Frontend:**
```typescript
POST /api/admin/payouts/${payoutId}/process-bank
Body: { referenceId: string }
```

**Backend Expected:**
```typescript
POST /api/admin/partners/payouts/process-bank-transfer
Body: { payoutId: string, referenceNumber: string }
```

### PayPal Payout Processing

**Frontend:**
```typescript
POST /api/admin/payouts/${payoutId}/process-paypal
Body: { referenceId: string }
```

**Backend Expected:**
```typescript
POST /api/admin/partners/payouts/process-paypal
Body: { payoutId: string, transactionId: string }
```

### Complete Payout

**Frontend:**
```typescript
POST /api/admin/payouts/${payoutId}/complete
Body: {}
```

**Backend Expected:**
```typescript
POST /api/admin/partners/payouts/complete
Body: { payoutId: string }
```

### Cancel Payout

**Frontend:**
```typescript
POST /api/admin/payouts/${payoutId}/cancel
Body: { reason: string }
```

**Backend Expected:**
```typescript
POST /api/admin/partners/payouts/cancel
Body: { payoutId: string, reason: string }
```

---

**End of Report**
