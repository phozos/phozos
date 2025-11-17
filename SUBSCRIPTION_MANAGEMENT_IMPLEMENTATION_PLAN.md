# Subscription Management Implementation Plan

**Generated:** November 15, 2025  
**Status:** Awaiting Approval  

---

## Executive Summary

This plan addresses the complete implementation of user subscription management features, allowing users to manage their subscriptions while giving admins full control over all operations.

**Current State:** Users can purchase subscriptions but have NO management capabilities  
**Goal:** Enable users to view, cancel, request refunds (2-day window), and raise disputes, with full admin oversight

**Scope:** 80+ identified gaps across database, backend, frontend, and business logic

---

## Business Requirements

### User Capabilities
1. **View Subscription** - See current plan, status, purchase date, and renewal details
2. **Request Cancellation** - Initiate cancellation request (subject to admin approval)
3. **Request Refund** - Request refund ONLY within 2 days of plan purchase
4. **Raise Dispute/Chargeback** - Submit dispute or chargeback claim anytime

### Admin Capabilities (Full Control)
1. **Approve/Reject Cancellations** - Review and action all cancellation requests
2. **Process Refunds** - Approve/reject refund requests, initiate Razorpay refunds
3. **Manage Disputes** - Track, investigate, and resolve chargebacks/disputes
4. **Full Override** - Admin can force cancel, refund, or modify any subscription
5. **Audit Trail** - Complete history of all actions and state changes

---

## Architecture Strategy

### Approach: Three-Phase Vertical Rollout

**Phase 1:** Foundation & Infrastructure (Database + Core Services)  
**Phase 2:** User Self-Service Features (User-Facing UI + APIs)  
**Phase 3:** Admin Governance & Razorpay Integration (Admin Dashboard + Payment Processing)

### Key Principles
- **Vertical Slicing:** Complete each capability (cancellation → refund → dispute) end-to-end within phases
- **Feature Flags:** All new features gated by flags for safe rollout
- **Backward Compatibility:** Additive changes only, no breaking modifications
- **Transaction Safety:** SERIALIZABLE transactions + outbox pattern for state changes
- **Audit Everything:** Leverage existing audit/outbox infrastructure

---

## Phase 1: Foundation & Infrastructure

**Goal:** Establish database schema, domain models, repositories, and core business services

### 1.1 Database Schema & Migrations

#### New Tables Required

**A. cancellation_requests**
```sql
- id (serial primary key)
- subscription_id (integer, FK to subscriptions)
- user_id (integer, FK to users)
- reason (text)
- status (enum: pending, approved, rejected, cancelled)
- requested_at (timestamp)
- processed_at (timestamp, nullable)
- processed_by (integer, FK to users, nullable) -- admin who processed
- admin_notes (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

**B. refunds**
```sql
- id (serial primary key)
- payment_id (integer, FK to payments)
- subscription_id (integer, FK to subscriptions)
- user_id (integer, FK to users)
- cancellation_request_id (integer, FK to cancellation_requests, nullable)
- amount (decimal)
- currency (varchar)
- reason (text)
- status (enum: pending, processing, completed, failed, rejected)
- razorpay_refund_id (varchar, nullable)
- razorpay_status (varchar, nullable)
- requested_at (timestamp)
- processed_at (timestamp, nullable)
- processed_by (integer, FK to users, nullable) -- admin
- admin_notes (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

**C. chargebacks_disputes**
```sql
- id (serial primary key)
- payment_id (integer, FK to payments)
- subscription_id (integer, FK to subscriptions)
- user_id (integer, FK to users)
- type (enum: chargeback, dispute)
- reason (text)
- status (enum: open, investigating, resolved, closed)
- amount (decimal)
- currency (varchar)
- evidence (jsonb, nullable) -- store uploaded evidence/documents
- razorpay_dispute_id (varchar, nullable)
- resolution (text, nullable)
- resolved_at (timestamp, nullable)
- resolved_by (integer, FK to users, nullable) -- admin
- admin_notes (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

#### Migration Tasks
- [ ] Write Drizzle migration for all 3 tables
- [ ] Add enums to schema (CancellationStatus, RefundStatus, DisputeStatus, DisputeType)
- [ ] Update shared/schema.ts with new table definitions
- [ ] Create indexes on foreign keys and status columns
- [ ] Add database constraints (e.g., refund amount <= payment amount)

---

### 1.2 Domain Models & Types

#### TypeScript Types/Interfaces
- [ ] Define `CancellationRequest` interface
- [ ] Define `Refund` interface  
- [ ] Define `ChargebackDispute` interface
- [ ] Create status enums (align with database)
- [ ] Add validation schemas (Zod) for all entities
- [ ] Update shared/types.ts and shared/api-types.ts

---

### 1.3 Repositories

#### New Repository Files

**A. cancellation-request.repository.ts**
```typescript
Methods:
- create(data: CreateCancellationRequestData): Promise<CancellationRequest>
- findById(id: number): Promise<CancellationRequest | null>
- findBySubscriptionId(subscriptionId: number): Promise<CancellationRequest[]>
- findByUserId(userId: number): Promise<CancellationRequest[]>
- findPending(): Promise<CancellationRequest[]>
- updateStatus(id: number, status: string, processedBy: number, notes?: string): Promise<void>
- getStatistics(): Promise<CancellationStats>
```

**B. refund.repository.ts**
```typescript
Methods:
- create(data: CreateRefundData): Promise<Refund>
- findById(id: number): Promise<Refund | null>
- findByPaymentId(paymentId: number): Promise<Refund[]>
- findBySubscriptionId(subscriptionId: number): Promise<Refund[]>
- findByUserId(userId: number): Promise<Refund[]>
- findPending(): Promise<Refund[]>
- updateStatus(id: number, status: string, razorpayData?: object): Promise<void>
- updateRazorpayRefundId(id: number, refundId: string): Promise<void>
- getTotalRefundedAmount(subscriptionId: number): Promise<number>
```

**C. chargeback-dispute.repository.ts**
```typescript
Methods:
- create(data: CreateDisputeData): Promise<ChargebackDispute>
- findById(id: number): Promise<ChargebackDispute | null>
- findByPaymentId(paymentId: number): Promise<ChargebackDispute[]>
- findByUserId(userId: number): Promise<ChargebackDispute[]>
- findOpen(): Promise<ChargebackDispute[]>
- updateStatus(id: number, status: string, resolvedBy?: number): Promise<void>
- addEvidence(id: number, evidence: object): Promise<void>
- resolve(id: number, resolution: string, resolvedBy: number): Promise<void>
```

#### Tasks
- [ ] Implement all 3 repositories following existing patterns
- [ ] Add to server/repositories/index.ts
- [ ] Write unit tests for each repository
- [ ] Ensure DI container registration

---

### 1.4 Domain Services

#### New Service Files

**A. cancellation.service.ts**
```typescript
Business Logic:
- validateCancellationEligibility(subscriptionId: number, userId: number)
- createCancellationRequest(userId: number, subscriptionId: number, reason: string)
- approveCancellation(requestId: number, adminId: number, notes?: string)
  → Calls subscription.service.cancelSubscription()
  → Updates cancellation_request status
  → Triggers audit event
- rejectCancellation(requestId: number, adminId: number, notes: string)
- getCancellationRequestsForUser(userId: number)
- getPendingCancellationRequests(adminOnly: boolean)
```

**B. refund.service.ts**
```typescript
Business Logic:
- validateRefundEligibility(subscriptionId: number)
  → Check if within 2-day window from paidAt
  → Check if already refunded
  → Check subscription status
- createRefundRequest(userId: number, subscriptionId: number, reason: string)
  → Calculate eligible refund amount
  → Create refund record
  → Link to cancellation_request if exists
- approveRefund(refundId: number, adminId: number)
  → Update refund status to 'processing'
  → Trigger Razorpay refund (async)
- rejectRefund(refundId: number, adminId: number, notes: string)
- processRazorpayRefund(refundId: number)
  → Call razorpay.service.initiateRefund()
  → Handle success/failure
  → Update refund status + razorpay_refund_id
- getRefundRequestsForUser(userId: number)
- getPendingRefundRequests()
```

**C. dispute.service.ts**
```typescript
Business Logic:
- createDisputeRequest(userId: number, subscriptionId: number, type: string, reason: string)
- addDisputeEvidence(disputeId: number, evidence: object)
- assignToInvestigation(disputeId: number, adminId: number)
- resolveDispute(disputeId: number, resolution: string, adminId: number)
- getDisputesForUser(userId: number)
- getOpenDisputes()
- syncRazorpayDisputeStatus(disputeId: number) -- if Razorpay provides dispute webhooks
```

#### Tasks
- [ ] Implement all 3 services with full business logic
- [ ] Add transaction wrappers (SERIALIZABLE) for state changes
- [ ] Integrate with existing audit/outbox services
- [ ] Add to DI container (server/services/container.ts)
- [ ] Write comprehensive unit tests
- [ ] Add validation using Zod schemas

---

### 1.5 Razorpay Integration Extension

#### Extend razorpay.service.ts

**New Methods:**
```typescript
- initiateRefund(paymentId: string, amount: number, notes?: string): Promise<RazorpayRefund>
- getRefundStatus(refundId: string): Promise<RazorpayRefundStatus>
- handleRefundWebhook(webhookPayload: object): Promise<void>
- getPaymentDisputes(paymentId: string): Promise<RazorpayDispute[]> -- if supported
```

#### Tasks
- [ ] Research Razorpay Refund API documentation
- [ ] Implement refund creation with retry/backoff
- [ ] Add refund webhook handler (if available)
- [ ] Create reconciliation job for refund status sync
- [ ] Add error handling and logging
- [ ] Test in Razorpay sandbox environment
- [ ] Store all Razorpay responses in refunds table for audit

---

### 1.6 Business Rules & Validation

#### Implement Refund Eligibility Logic

**2-Day Window Calculation:**
```typescript
function isRefundEligible(subscription: Subscription, payment: Payment): boolean {
  const paidAt = new Date(payment.paidAt);
  const now = new Date();
  const hoursSincePurchase = (now.getTime() - paidAt.getTime()) / (1000 * 60 * 60);
  return hoursSincePurchase <= 48; // 2 days = 48 hours
}
```

#### Validation Rules
- [ ] User can only have 1 active cancellation request per subscription
- [ ] Refund requests only allowed for 'active' or 'cancelled' subscriptions
- [ ] Refund amount cannot exceed original payment amount
- [ ] Dispute can be raised anytime but only 1 open dispute per payment
- [ ] Admin actions require proper authorization (role check)

#### Tasks
- [ ] Add business rules to server/services/validation/business-rules.ts
- [ ] Create validator functions for each operation
- [ ] Add to validation middleware where applicable

---

### Phase 1 Deliverables

✅ **Database:**
- 3 new tables with migrations
- All indexes and constraints
- Enums and types defined

✅ **Backend:**
- 3 new repositories (tested)
- 3 new domain services (tested)
- Extended Razorpay service
- Business validation rules

✅ **Infrastructure:**
- Feature flags setup
- Audit/outbox integration
- DI container bindings

---

## Phase 2: User Self-Service Features

**Goal:** Enable users to view and manage their subscriptions through dedicated UI

### 2.1 Backend API Endpoints

#### New Routes in subscription.routes.ts

**User Subscription Management Endpoints:**
```typescript
GET    /api/subscriptions/me                    -- Get user's current subscription details
GET    /api/subscriptions/me/history            -- Get subscription history
POST   /api/subscriptions/me/cancel-request     -- Create cancellation request
GET    /api/subscriptions/me/cancel-requests    -- Get user's cancellation requests
POST   /api/subscriptions/me/refund-request     -- Create refund request
GET    /api/subscriptions/me/refund-requests    -- Get user's refund requests
POST   /api/subscriptions/me/dispute            -- Create dispute/chargeback
GET    /api/subscriptions/me/disputes           -- Get user's disputes
GET    /api/subscriptions/me/refund-eligibility -- Check if eligible for refund
```

#### Controller Methods (subscription.controller.ts)

```typescript
- getUserSubscription(req, res) -- with full details
- getUserSubscriptionHistory(req, res)
- createCancellationRequest(req, res)
  → Validate user owns subscription
  → Call cancellation.service.createCancellationRequest()
  → Return 201 with request details
- getUserCancellationRequests(req, res)
- createRefundRequest(req, res)
  → Validate refund eligibility (2-day window)
  → Call refund.service.createRefundRequest()
  → Return 201 or 400 if ineligible
- getUserRefundRequests(req, res)
- createDispute(req, res)
  → Call dispute.service.createDisputeRequest()
  → Return 201
- getUserDisputes(req, res)
- checkRefundEligibility(req, res)
  → Calculate time since purchase
  → Return { eligible: boolean, hoursRemaining: number }
```

#### Tasks
- [ ] Implement all controller methods
- [ ] Add authentication middleware (user must be logged in)
- [ ] Add authorization checks (user owns the subscription)
- [ ] Add rate limiting (prevent spam requests)
- [ ] Add input validation middleware (Zod schemas)
- [ ] Write integration tests for all endpoints
- [ ] Add error handling with proper HTTP status codes

---

### 2.2 Frontend - User Subscription Management Page

#### New Page: client/src/pages/SubscriptionManagement.tsx

**Components Structure:**
```
SubscriptionManagement (main page)
├── SubscriptionOverview
│   ├── Current plan details
│   ├── Purchase date
│   ├── Renewal/expiry date
│   ├── Status badge
│   └── Action buttons area
├── CancellationRequestPanel
│   ├── Request form (reason textarea)
│   ├── Confirmation dialog
│   └── Request status display
├── RefundRequestPanel
│   ├── Eligibility checker (countdown timer)
│   ├── Request form (reason textarea)
│   ├── Eligibility warning
│   └── Request status display
├── DisputePanel
│   ├── Dispute type selector
│   ├── Reason form
│   ├── Evidence upload (optional)
│   └── Dispute history
└── RequestHistoryTab
    ├── All cancellation requests
    ├── All refund requests
    └── All disputes
```

#### Tasks
- [ ] Create main SubscriptionManagement page
- [ ] Build SubscriptionOverview component
- [ ] Build CancellationRequestPanel component with form
- [ ] Build RefundRequestPanel with eligibility countdown
- [ ] Build DisputePanel component
- [ ] Build RequestHistoryTab with status tracking
- [ ] Add React Query hooks for all API calls
- [ ] Add form validation (react-hook-form + Zod)
- [ ] Add loading states and error handling
- [ ] Add success/error toast notifications
- [ ] Add confirmation dialogs for destructive actions
- [ ] Add responsive design (mobile-friendly)

---

### 2.3 Frontend - Navigation Integration

#### Update Existing Pages

**client/src/pages/Dashboard.tsx**
- [ ] Add "Manage Subscription" button/link (if user has subscription)
- [ ] Show subscription status badge
- [ ] Add refund eligibility indicator if within 2-day window

**client/src/components/Navigation.tsx**
- [ ] Add "My Subscription" nav item (for subscribed users only)

**client/src/pages/Profile.tsx**
- [ ] Add subscription section with link to management page

---

### 2.4 React Query Hooks & API Integration

#### New Hooks File: client/src/hooks/useSubscriptionManagement.ts

```typescript
- useUserSubscription() -- fetch current subscription
- useSubscriptionHistory() -- fetch history
- useCreateCancellationRequest() -- mutation
- useCancellationRequests() -- fetch requests
- useCreateRefundRequest() -- mutation
- useRefundRequests() -- fetch requests
- useRefundEligibility() -- check eligibility
- useCreateDispute() -- mutation
- useDisputes() -- fetch disputes
```

#### Tasks
- [ ] Implement all React Query hooks
- [ ] Add optimistic updates where applicable
- [ ] Add cache invalidation logic
- [ ] Add error handling and retry logic
- [ ] Add TypeScript types for all responses

---

### 2.5 UI/UX Components

#### New Reusable Components

**client/src/components/subscription/**
- [ ] RefundEligibilityCountdown.tsx -- countdown timer showing remaining hours
- [ ] RequestStatusBadge.tsx -- status badges for requests
- [ ] CancellationReasonForm.tsx -- reusable reason input
- [ ] DisputeTypeSelector.tsx -- radio/select for dispute type
- [ ] RequestTimeline.tsx -- visual timeline of request status changes

---

### Phase 2 Deliverables

✅ **Backend APIs:**
- 9 new user-facing endpoints
- Full authentication & authorization
- Rate limiting & validation
- Integration tests

✅ **Frontend:**
- Complete Subscription Management page
- 10+ reusable components
- React Query integration
- Form validation & error handling

✅ **User Experience:**
- View subscription details
- Request cancellation
- Request refund (with 2-day eligibility check)
- Raise disputes
- Track all request statuses

---

## Phase 3: Admin Governance & Control

**Goal:** Give admins full control over subscription management, refunds, and disputes

### 3.1 Backend Admin APIs

#### New Routes in admin.routes.ts (or dedicated admin-subscription.routes.ts)

**Admin Subscription Management:**
```typescript
GET    /api/admin/subscriptions                     -- List all subscriptions (paginated, filtered)
GET    /api/admin/subscriptions/:id                 -- Get subscription details
PATCH  /api/admin/subscriptions/:id/force-cancel    -- Admin force cancel
PATCH  /api/admin/subscriptions/:id/force-refund    -- Admin force refund

GET    /api/admin/cancellation-requests             -- Get all pending/all requests
GET    /api/admin/cancellation-requests/:id         -- Get request details
PATCH  /api/admin/cancellation-requests/:id/approve -- Approve cancellation
PATCH  /api/admin/cancellation-requests/:id/reject  -- Reject cancellation

GET    /api/admin/refund-requests                   -- Get all refund requests
GET    /api/admin/refund-requests/:id               -- Get refund details
PATCH  /api/admin/refund-requests/:id/approve       -- Approve & initiate Razorpay refund
PATCH  /api/admin/refund-requests/:id/reject        -- Reject refund
POST   /api/admin/refund-requests/:id/process       -- Manually trigger Razorpay refund
GET    /api/admin/refund-requests/:id/status        -- Check Razorpay refund status

GET    /api/admin/disputes                          -- Get all disputes
GET    /api/admin/disputes/:id                      -- Get dispute details
PATCH  /api/admin/disputes/:id/assign               -- Assign to admin
PATCH  /api/admin/disputes/:id/investigate          -- Mark as investigating
PATCH  /api/admin/disputes/:id/resolve              -- Resolve dispute
POST   /api/admin/disputes/:id/evidence             -- Add admin evidence/notes

GET    /api/admin/subscription-analytics            -- Dashboard analytics
```

#### Controller Methods (admin.controller.ts or new admin-subscription.controller.ts)

```typescript
- getAllSubscriptions(req, res) -- with filters (status, date range, user)
- getSubscriptionDetails(req, res)
- forceCancelSubscription(req, res)
  → Admin can cancel without user request
  → Requires admin notes
- forceRefund(req, res)
  → Admin can initiate refund outside 2-day window
  
- getPendingCancellationRequests(req, res)
- approveCancellationRequest(req, res)
  → Call cancellation.service.approveCancellation()
  → Cancel subscription
  → Send user notification
- rejectCancellationRequest(req, res)
  
- getAllRefundRequests(req, res)
- approveRefundRequest(req, res)
  → Call refund.service.approveRefund()
  → Initiate Razorpay refund asynchronously
  → Update subscription status
- rejectRefundRequest(req, res)
- processRefundManually(req, res) -- retry failed refunds
- getRefundStatus(req, res) -- query Razorpay

- getAllDisputes(req, res)
- assignDispute(req, res)
- updateDisputeStatus(req, res)
- resolveDispute(req, res)
- addDisputeEvidence(req, res)

- getSubscriptionAnalytics(req, res)
  → Cancellation rate
  → Refund rate
  → Dispute statistics
  → Revenue impact
```

#### Tasks
- [ ] Implement all admin controller methods
- [ ] Add admin authorization middleware (role check)
- [ ] Add audit logging for all admin actions
- [ ] Add validation for all inputs
- [ ] Write integration tests
- [ ] Add rate limiting (prevent admin abuse)

---

### 3.2 Frontend - Admin Subscription Management Dashboard

#### New Pages

**A. client/src/pages/admin/SubscriptionManagement.tsx** (enhanced)
- [ ] Add admin action panels
- [ ] Show all subscriptions with filters
- [ ] Quick actions for cancel/refund

**B. client/src/pages/admin/CancellationRequests.tsx** (NEW)
```
CancellationRequestsPage
├── FilterBar (status, date range, search)
├── RequestsTable
│   ├── User info
│   ├── Subscription details
│   ├── Request reason
│   ├── Status
│   ├── Action buttons (Approve/Reject)
├── RequestDetailModal
│   ├── Full subscription info
│   ├── User history
│   ├── Reason display
│   ├── Admin notes input
│   └── Action buttons
└── BulkActionsBar (optional)
```

**C. client/src/pages/admin/RefundManagement.tsx** (NEW)
```
RefundManagementPage
├── FilterBar (status, eligibility, amount range)
├── RefundsTable
│   ├── User info
│   ├── Payment details
│   ├── Refund amount
│   ├── Eligibility status (within 2 days?)
│   ├── Razorpay refund status
│   ├── Action buttons (Approve/Reject/Retry)
├── RefundDetailModal
│   ├── Full payment info
│   ├── User subscription history
│   ├── Razorpay transaction details
│   ├── Admin notes input
│   ├── Approve/Reject/Process buttons
└── RefundAnalytics
    ├── Total refunds processed
    ├── Success/failure rate
    ├── Amount refunded
```

**D. client/src/pages/admin/DisputeManagement.tsx** (NEW)
```
DisputeManagementPage
├── FilterBar (status, type, date)
├── DisputesTable
│   ├── User info
│   ├── Payment details
│   ├── Dispute type
│   ├── Status
│   ├── Assigned admin
│   ├── Action buttons
├── DisputeDetailModal
│   ├── Full dispute details
│   ├── Evidence display
│   ├── Timeline of actions
│   ├── Admin evidence/notes input
│   ├── Status update buttons
│   └── Resolution form
└── DisputeAnalytics
```

---

### 3.3 Admin Dashboard Integration

#### Update client/src/pages/AdminDashboard.tsx

**Add New Widgets:**
- [ ] Pending Cancellation Requests widget (with count badge)
- [ ] Pending Refund Requests widget
- [ ] Open Disputes widget
- [ ] Subscription Health Metrics
  - Active subscriptions
  - Cancellation rate (%)
  - Refund rate (%)
  - Average resolution time

**Add Navigation:**
- [ ] Link to Cancellation Requests page
- [ ] Link to Refund Management page
- [ ] Link to Dispute Management page

---

### 3.4 React Query Hooks - Admin

#### New Hooks: client/src/hooks/useAdminSubscriptionManagement.ts

```typescript
- useAdminSubscriptions(filters) -- paginated list
- useAdminSubscriptionDetails(id)
- useForceCancelSubscription() -- mutation
- useForceRefund() -- mutation

- useAdminCancellationRequests(filters)
- useApproveCancellation() -- mutation
- useRejectCancellation() -- mutation

- useAdminRefundRequests(filters)
- useApproveRefund() -- mutation
- useRejectRefund() -- mutation
- useProcessRefundManually() -- mutation
- useRefundStatus(refundId)

- useAdminDisputes(filters)
- useAssignDispute() -- mutation
- useUpdateDisputeStatus() -- mutation
- useResolveDispute() -- mutation

- useSubscriptionAnalytics() -- dashboard stats
```

#### Tasks
- [ ] Implement all admin hooks
- [ ] Add proper cache invalidation
- [ ] Add optimistic updates
- [ ] Add error handling

---

### 3.5 Razorpay Refund Processing

#### Background Job/Scheduler

**server/jobs/process-pending-refunds.ts**
```typescript
Purpose:
- Run every 5 minutes
- Find refunds with status 'processing'
- Check Razorpay refund status
- Update local refund status
- Handle failures (retry with backoff)
- Send notifications on completion
```

#### Webhook Handler

**server/routes/webhook.routes.ts**
```typescript
POST /api/webhooks/razorpay/refund
- Verify webhook signature
- Update refund status based on Razorpay event
- Trigger user notification
- Log event in audit trail
```

#### Tasks
- [ ] Implement refund processing job
- [ ] Add to job scheduler/cron
- [ ] Implement Razorpay refund webhook handler
- [ ] Add webhook signature verification
- [ ] Add retry mechanism with exponential backoff
- [ ] Add alerting for failed refunds

---

### 3.6 Notifications & Alerts

#### User Notifications

**Email/In-App Notifications:**
- Cancellation request received
- Cancellation request approved/rejected
- Refund request received
- Refund request approved/rejected
- Refund processed successfully
- Dispute received and under review
- Dispute resolved

#### Admin Notifications

**Email/Dashboard Alerts:**
- New cancellation request (if SLA approaching)
- New refund request
- New dispute raised
- Refund processing failed (requires manual intervention)

#### Tasks
- [ ] Create email templates for all user notifications
- [ ] Integrate with existing notification system
- [ ] Add in-app notification support
- [ ] Implement admin alert system
- [ ] Add SLA tracking (e.g., respond within 24 hours)

---

### Phase 3 Deliverables

✅ **Backend:**
- 20+ admin API endpoints
- Full CRUD for cancellations, refunds, disputes
- Razorpay refund integration
- Background jobs for refund processing
- Webhook handlers

✅ **Frontend:**
- 3 new admin management pages
- Enhanced admin dashboard
- Full admin control interfaces
- Analytics and reporting

✅ **Automation:**
- Refund processing automation
- Status sync with Razorpay
- SLA alerts and notifications

✅ **Admin Capabilities:**
- Review and action all user requests
- Force cancel/refund any subscription
- Manage disputes end-to-end
- Full audit trail and analytics

---

## Testing Strategy

### Phase 1 Testing
- [ ] Unit tests for all repositories
- [ ] Unit tests for all services
- [ ] Integration tests for Razorpay refund API
- [ ] Database migration tests

### Phase 2 Testing
- [ ] API integration tests for all user endpoints
- [ ] End-to-end tests for user flows
- [ ] Component tests for UI
- [ ] Refund eligibility calculation tests
- [ ] Form validation tests

### Phase 3 Testing
- [ ] Admin API integration tests
- [ ] Admin authorization tests
- [ ] Refund processing job tests
- [ ] Webhook handler tests
- [ ] End-to-end admin flow tests
- [ ] Load tests for bulk operations

### Business Logic Testing
- [ ] 2-day refund window calculation (timezone-aware)
- [ ] Duplicate request prevention
- [ ] Transaction consistency tests (SERIALIZABLE)
- [ ] State machine validation (subscription status transitions)

---

## Security Considerations

### Authentication & Authorization
- [ ] User can only manage their own subscriptions
- [ ] Admin role verification for all admin endpoints
- [ ] Rate limiting on all endpoints (prevent spam)
- [ ] CSRF protection on state-changing operations

### Data Validation
- [ ] Validate all user inputs (Zod schemas)
- [ ] Prevent SQL injection (use parameterized queries)
- [ ] Sanitize user-provided reasons/notes (XSS prevention)

### Financial Security
- [ ] Verify refund amount does not exceed payment amount
- [ ] Prevent duplicate refund requests
- [ ] Audit trail for all financial operations
- [ ] Razorpay webhook signature verification

### PII & Data Privacy
- [ ] Mask sensitive payment details in logs
- [ ] Secure storage of evidence/documents (disputes)
- [ ] GDPR compliance (data retention policies)

---

## Rollout Strategy

### Feature Flags
```typescript
- ENABLE_USER_CANCELLATION_REQUESTS: boolean
- ENABLE_USER_REFUND_REQUESTS: boolean
- ENABLE_USER_DISPUTES: boolean
- ENABLE_ADMIN_SUBSCRIPTION_MANAGEMENT: boolean
- ENABLE_RAZORPAY_REFUND_PROCESSING: boolean
```

### Gradual Rollout
1. **Phase 1:** Deploy database + backend services (flags OFF)
2. **Phase 2:** Enable user features for beta users (flags ON for subset)
3. **Phase 3:** Enable admin features for admins (test internally)
4. **Full Rollout:** Enable all flags for production

### Monitoring
- [ ] Track API error rates
- [ ] Monitor refund success/failure rates
- [ ] Alert on failed Razorpay refunds
- [ ] Track user adoption of subscription management
- [ ] Monitor cancellation/refund rates for business insights

---

## Estimated Effort

### Phase 1: Foundation (5-7 days)
- Database: 1 day
- Repositories: 1 day
- Services: 2-3 days
- Razorpay Integration: 1-2 days
- Testing: 1 day

### Phase 2: User Features (4-6 days)
- Backend APIs: 2 days
- Frontend Pages: 2-3 days
- Integration & Testing: 1 day

### Phase 3: Admin Features (5-7 days)
- Backend APIs: 2 days
- Frontend Dashboards: 2-3 days
- Background Jobs: 1 day
- Notifications: 1 day
- Integration & Testing: 1 day

**Total Estimated Time:** 14-20 days (full-time development)

---

## Dependencies & Prerequisites

### External Services
- Razorpay account with Refund API access
- Razorpay sandbox for testing
- Email service for notifications (existing)

### Internal Dependencies
- Existing audit/outbox infrastructure (available)
- Existing DI container (available)
- Existing authentication system (available)
- Existing admin role system (verify)

### Required Resources
- Access to Razorpay API documentation
- Test Razorpay account credentials
- Admin user for testing
- Sample subscription data for testing

---

## Risk Mitigation

### Technical Risks
| Risk | Mitigation |
|------|------------|
| Razorpay refund failures | Implement retry mechanism + manual fallback |
| Database transaction deadlocks | Use SERIALIZABLE + proper locking order |
| Race conditions on refund window | Calculate eligibility server-side, not client |
| Webhook replay attacks | Implement idempotency keys + deduplication |

### Business Risks
| Risk | Mitigation |
|------|------------|
| Abuse of refund system | Rate limiting + admin review required |
| Revenue loss from refunds | Analytics dashboard to track impact |
| Legal compliance (chargebacks) | Proper dispute tracking + evidence storage |

---

## Success Metrics

### User Adoption
- % of users who view subscription management page
- # of cancellation requests per week
- # of refund requests per week
- # of disputes raised

### Admin Efficiency
- Average time to process cancellation request
- Average time to process refund
- Refund success rate (%)
- Dispute resolution time

### System Health
- Razorpay refund API success rate
- Webhook processing success rate
- Background job execution time
- API response times

---

## Next Steps (Awaiting Approval)

Once approved, implementation will proceed in the following order:

1. **Phase 1 Kickoff:**
   - Create database migrations
   - Implement repositories
   - Build domain services
   - Extend Razorpay integration

2. **Phase 2 Kickoff:**
   - Build user-facing APIs
   - Create subscription management page
   - Implement refund eligibility logic

3. **Phase 3 Kickoff:**
   - Build admin APIs
   - Create admin dashboards
   - Implement background jobs
   - Setup notifications

**Please review this plan and provide approval to proceed with implementation.**

---

## Appendix: API Contracts (Summary)

### User APIs
```
GET    /api/subscriptions/me
POST   /api/subscriptions/me/cancel-request
POST   /api/subscriptions/me/refund-request
POST   /api/subscriptions/me/dispute
GET    /api/subscriptions/me/refund-eligibility
```

### Admin APIs
```
GET    /api/admin/cancellation-requests
PATCH  /api/admin/cancellation-requests/:id/approve
PATCH  /api/admin/refund-requests/:id/approve
PATCH  /api/admin/disputes/:id/resolve
POST   /api/admin/subscriptions/:id/force-refund
```

### Webhooks
```
POST   /api/webhooks/razorpay/refund
```

---

## Phase 4: Navigation Integration & User Discovery

**Generated:** November 17, 2025  
**Goal:** Make subscription management features discoverable and accessible across all user touchpoints  
**Scope:** Add navigation links in AppShell, dashboards, profile pages, and admin panels

**Investigation Summary:**
- Examined 8 navigation-critical files (AppShell.tsx, StudentDashboard.tsx, Profile.tsx, AdminDashboard.tsx, TeamDashboard.tsx, CompanyDashboard.tsx, App.tsx, navigation-config.ts)
- Analyzed existing icon patterns (lucide-react library)
- Reviewed conditional rendering logic for user types (customer, team_member, company_profile, partner)
- Studied mobile vs desktop navigation differences
- Identified routing patterns and protection mechanisms

---

### 4.1 AppShell Navigation (Primary Global Navigation)

**File:** `client/src/components/AppShell.tsx`

#### A. Add to User Navigation Items (Lines 123-141)

**Current Pattern:**
```typescript
const userNavigationItems = user ? [
  ...(user.userType === "customer" ? [
    { href: "/dashboard/student", label: "Dashboard" },
    { href: "/applications", label: "Applications" },
    { href: "/documents", label: "Documents" },
  ] : []),
  // ... other user types
] : [];
```

**Change Location:** After line 127 (after Documents link)

**Code to Add:**
```typescript
...(user.userType === "customer" ? [
  { href: "/dashboard/student", label: "Dashboard" },
  { href: "/applications", label: "Applications" },
  { href: "/documents", label: "Documents" },
  { href: "/subscription-management", label: "My Subscription" }, // ADD THIS LINE
] : []),
```

**Rationale:**
- Follows existing pattern for customer-only links
- Places subscription link after Documents (logical flow: Dashboard → Applications → Documents → Subscription)
- Uses "My Subscription" label (possessive, consistent with user-facing terminology)
- Only shows for `userType === "customer"` (paying subscribers)

#### B. User Dropdown Menu Enhancement (Lines 332-354)

**Current Pattern:**
```typescript
<DropdownMenuContent align="end" className="w-56">
  <DropdownMenuLabel>...</DropdownMenuLabel>
  <DropdownMenuSeparator />
  <DropdownMenuItem onClick={() => navigate(getUserProfileLink())}>
    <User className="mr-2 h-4 w-4" />
    Profile
  </DropdownMenuItem>
  <DropdownMenuSeparator />
  <DropdownMenuItem onClick={handleLogout}>
    <LogOut className="mr-2 h-4 w-4" />
    Log Out
  </DropdownMenuItem>
</DropdownMenuContent>
```

**Change Location:** After line 349 (after Profile menu item, before final separator)

**Code to Add:**
```typescript
<DropdownMenuItem onClick={() => navigate(getUserProfileLink())}>
  <User className="mr-2 h-4 w-4" />
  Profile
</DropdownMenuItem>
{user.userType === "customer" && (
  <DropdownMenuItem onClick={() => navigate('/subscription-management')}>
    <CreditCard className="mr-2 h-4 w-4" />
    <span>Subscription</span>
  </DropdownMenuItem>
)}
<DropdownMenuSeparator />
```

**Additional Required Import:**
```typescript
// At top of file, add to existing lucide-react import (line ~9-15)
import { 
  Bell, 
  Moon, 
  Sun, 
  Menu, 
  GraduationCap,
  User,
  LogOut,
  Search,
  ChevronDown,
  X,
  Loader2,
  CreditCard  // ADD THIS
} from "lucide-react";
```

**Rationale:**
- `CreditCard` icon is semantically appropriate for subscription/billing
- Conditional rendering ensures only customers see this menu item
- Placed before logout (common pattern: Profile → Settings/Billing → Logout)
- Uses existing dropdown menu pattern

#### C. Mobile Sheet Navigation (Lines 355-476)

**Investigation Finding:** AppShell has a mobile Sheet component for navigation (not fully visible in code sample)

**Change Location:** Within the mobile Sheet component's navigation list

**Pattern to Follow:**
Look for the mobile menu rendering section (likely around line 360-400) and add:

```typescript
{user.userType === "customer" && (
  <SheetClose asChild>
    <Link href="/subscription-management">
      <Button 
        variant={isActiveLink("/subscription-management") ? "secondary" : "ghost"} 
        className="w-full justify-start"
      >
        <CreditCard className="mr-2 h-4 w-4" />
        My Subscription
      </Button>
    </Link>
  </SheetClose>
)}
```

**Note:** Exact line number depends on mobile sheet structure - developer should locate the mobile navigation list and insert after Documents link.

---

### 4.2 StudentDashboard Integration

**File:** `client/src/pages/StudentDashboard.tsx`

#### A. Hero Section Quick Action Button (Lines 84-120)

**Current Pattern:**
```typescript
<div className="flex items-center space-x-4">
  <Badge className="bg-gradient-to-r from-primary to-amber-500 text-white px-4 py-2 shadow-lg">
    <GraduationCap className="w-4 h-4 mr-2" />
    Student Dashboard
  </Badge>
  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 shadow-lg">
    <Star className="w-4 h-4 mr-2" />
    Premium Member
  </Badge>
</div>
```

**Change Location:** After line 118 (after Premium Member badge)

**Code to Add:**
```typescript
<Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 shadow-lg">
  <Star className="w-4 h-4 mr-2" />
  Premium Member
</Badge>
<Link href="/subscription-management">
  <Button 
    variant="outline" 
    size="sm" 
    className="bg-white/80 hover:bg-white border-2 border-primary/20 hover:border-primary/40 shadow-md"
  >
    <CreditCard className="w-4 h-4 mr-2" />
    Manage Subscription
  </Button>
</Link>
```

**Additional Required Imports:**
```typescript
// Add to existing imports (top of file)
import { Link } from "wouter";
import { 
  // ... existing icons
  CreditCard  // ADD THIS
} from "lucide-react";
```

**Rationale:**
- Hero section is prime real estate for important actions
- "Manage Subscription" is clear call-to-action
- Consistent with premium badge placement
- Uses Link component from wouter (existing router)

#### B. Quick Actions Panel (Lines 122-280)

**Investigation Finding:** StudentDashboard has collapsible Quick Actions section

**Suggested Location:** Create new card in the quick actions grid

**Code Pattern:**
```typescript
<Card className="liquid-glass dark:liquid-glass-dark liquid-glass-interactive rounded-[2rem] p-6 cursor-pointer hover:shadow-xl transition-all">
  <Link href="/subscription-management">
    <div className="flex items-center space-x-4">
      <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
        <CreditCard className="w-6 h-6 text-white" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground">Subscription</h3>
        <p className="text-sm text-muted-foreground">Manage your plan</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto" />
    </div>
  </Link>
</Card>
```

**Note:** Developer should identify the Quick Actions grid structure and add this card alongside existing action cards.

---

### 4.3 Profile Page Integration

**File:** `client/src/pages/Profile.tsx`

#### A. Add Subscription Section (After Line 52)

**Current Pattern:**
Profile page has two-column grid layout:
- Column 1: ProfileOverviewCard
- Column 2: PersonalInfoForm

**Change Location:** After line 52 (after closing div of grid)

**Code to Add:**
```typescript
</div>

{/* Subscription Management Section */}
<Card className="mt-8">
  <CardHeader>
    <div className="flex items-center justify-between">
      <div>
        <CardTitle className="flex items-center">
          <CreditCard className="w-5 h-5 mr-2" />
          Subscription
        </CardTitle>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your subscription, billing, and payment settings
        </p>
      </div>
      <Link href="/subscription-management">
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Manage Subscription
        </Button>
      </Link>
    </div>
  </CardHeader>
  <CardContent>
    {/* Subscription overview could be added here in future */}
    <p className="text-sm text-muted-foreground">
      View your current plan, request cancellations, refunds, or raise disputes.
    </p>
  </CardContent>
</Card>
```

**Additional Required Imports:**
```typescript
// Add to existing imports
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { CreditCard, Settings } from "lucide-react";
```

**Rationale:**
- Profile is where users expect to find account-related settings
- Separate card makes subscription management prominent
- Uses existing Card component pattern from ProfileOverviewCard
- "Manage Subscription" button is clear call-to-action

---

### 4.4 Admin Dashboard Integration

**File:** `client/src/pages/AdminDashboard.tsx`

**Investigation Finding:** AdminDashboard uses tab-based navigation with sidebar

#### A. Admin Sidebar Navigation Links (Location: Lines 1100-1300 approximately)

**Current Pattern:**
Admin sidebar has sections like "Users", "Universities", "Subscriptions", etc.

**Suggested Change:** Within "Subscriptions" section of sidebar

**Code Pattern to Add:**
```typescript
{/* Subscription Management Section */}
<div className="px-3 py-2">
  <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
    Subscription Management
  </h3>
  <div className="space-y-1">
    <Button
      variant={selectedTab === "cancellation-requests" ? "secondary" : "ghost"}
      className="w-full justify-start"
      onClick={() => setSelectedTab("cancellation-requests")}
    >
      <XCircle className="mr-2 h-4 w-4" />
      Cancellation Requests
    </Button>
    <Button
      variant={selectedTab === "refund-requests" ? "secondary" : "ghost"}
      className="w-full justify-start"
      onClick={() => setSelectedTab("refund-requests")}
    >
      <DollarSign className="mr-2 h-4 w-4" />
      Refund Requests
    </Button>
    <Button
      variant={selectedTab === "dispute-management" ? "secondary" : "ghost"}
      className="w-full justify-start"
      onClick={() => setSelectedTab("dispute-management")}
    >
      <AlertTriangle className="mr-2 h-4 w-4" />
      Disputes
    </Button>
  </div>
</div>
```

**Additional Required Imports:**
```typescript
// Add to existing lucide-react imports (line ~18-74)
import { 
  // ... existing icons
  XCircle,    // for cancellations
  DollarSign, // for refunds
  AlertTriangle // for disputes (may already be imported)
} from "lucide-react";
```

**Rationale:**
- Groups all subscription management admin functions together
- Uses icons semantically: XCircle (cancel), DollarSign (refund), AlertTriangle (dispute)
- Follows existing sidebar button pattern
- Consistent with admin navigation structure

#### B. Add Navigation Links to Admin Routes

**File:** `client/src/App.tsx`

**Change Location:** After line 224 (after partner-analytics route)

**Code to Add:**
```typescript
<Route path="/dashboard/admin/partner-analytics">
  <ProtectedRoute {...adminOnly}>
    <Suspense fallback={<LoadingFallback />}>
      <PartnerAnalytics />
    </Suspense>
  </ProtectedRoute>
</Route>

{/* Subscription Management Admin Routes */}
<Route path="/admin/subscription-management/cancellation-requests">
  <ProtectedRoute {...adminOnly}>
    <Suspense fallback={<LoadingFallback />}>
      <CancellationRequests />
    </Suspense>
  </ProtectedRoute>
</Route>

<Route path="/admin/subscription-management/refund-management">
  <ProtectedRoute {...adminOnly}>
    <Suspense fallback={<LoadingFallback />}>
      <RefundManagement />
    </Suspense>
  </ProtectedRoute>
</Route>

<Route path="/admin/subscription-management/dispute-management">
  <ProtectedRoute {...adminOnly}>
    <Suspense fallback={<LoadingFallback />}>
      <DisputeManagement />
    </Suspense>
  </ProtectedRoute>
</Route>
```

**Note:** These pages already exist (from Phase 3) but routes need to be added if not present.

---

### 4.5 Mobile Navigation Considerations

**File:** `client/src/components/mobile/MobileBottomNav.tsx`

**Investigation Finding:** Mobile bottom nav has 3 tabs: Feed, Search, Profile

**Recommendation:** Do NOT add subscription to bottom nav (already crowded)

**Alternative:** Subscription link should be accessible via:
1. ✅ Mobile sheet menu in AppShell (Section 4.1.C)
2. ✅ Profile tab → Subscription section
3. ✅ Dashboard quick actions

**Rationale:**
- Bottom nav is for primary app sections only
- Subscription management is secondary action, not primary navigation
- Better UX to keep bottom nav simple with 3-4 core actions

---

### 4.6 Additional Navigation Enhancements

#### A. Add Subscription Status Badge to AppShell (Optional Enhancement)

**File:** `client/src/components/AppShell.tsx`

**Change Location:** Near user avatar dropdown (line ~315-330)

**Concept:** Show subscription status indicator

```typescript
{user.userType === "customer" && user.subscription?.status === "active" && (
  <Badge variant="secondary" className="hidden lg:flex mr-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
    <Shield className="w-3 h-3 mr-1" />
    Active
  </Badge>
)}
```

**Note:** Requires subscription data to be available in user context. May need useUserSubscription hook.

#### B. Conditional "Upgrade" Link for Non-Subscribers

**File:** `client/src/components/AppShell.tsx`

**Logic:**
```typescript
{user.userType === "customer" && !user.subscription ? (
  <Link href="/plans">
    <Button size="sm" className="bg-gradient-to-r from-primary to-amber-500">
      <Zap className="w-4 h-4 mr-2" />
      Upgrade
    </Button>
  </Link>
) : null}
```

**Placement:** Right side actions area, before user avatar

---

### 4.7 Routing Configuration Updates

**File:** `client/src/App.tsx`

**Verify Route Exists:** (Should already exist from Phase 2)

```typescript
<Route path="/subscription-management">
  <ProtectedRoute {...customerOnly}>
    <SubscriptionManagement />
  </ProtectedRoute>
</Route>
```

**Location:** Around line 260-280 (user-facing routes section)

**If Missing:** Add this route with `customerOnly` protection

---

### 4.8 Navigation Accessibility & Conditional Logic

#### Conditional Rendering Rules

**User Type Conditions:**
```typescript
// Customer (subscriber) only
{user.userType === "customer" && (
  <Link to="/subscription-management">...</Link>
)}

// Admin only
{user.teamRole === "admin" && (
  <Link to="/admin/subscription-management/cancellation-requests">...</Link>
)}

// Not for partners, company profiles, or counselors
// (Subscription management is customer-only feature)
```

**Subscription Status Conditions (Future Enhancement):**
```typescript
// Only show if user has active/cancelled subscription
{user.subscription?.status && (
  <Link to="/subscription-management">...</Link>
)}

// Show upgrade button if no subscription
{!user.subscription && (
  <Link to="/plans">Upgrade</Link>
)}
```

---

### 4.9 Icon Reference Guide

**Recommended Icons from lucide-react:**

| Feature | Icon | Semantic Meaning |
|---------|------|------------------|
| Subscription Overview | `Shield` | Protection/Coverage |
| My Subscription (menu) | `CreditCard` | Billing/Payment |
| Manage Subscription | `Settings` | Configuration |
| Cancellation | `XCircle` or `X` | Cancel/Stop |
| Refund | `DollarSign` or `Banknote` | Money/Refund |
| Dispute | `AlertTriangle` or `AlertCircle` | Warning/Issue |
| History | `History` or `Clock` | Timeline/Past |
| Active Status | `CheckCircle` or `Shield` | Verified/Active |
| Upgrade | `Zap` or `TrendingUp` | Growth/Enhancement |

**Import Pattern:**
```typescript
import { 
  Shield, 
  CreditCard, 
  Settings, 
  XCircle, 
  DollarSign, 
  AlertTriangle, 
  History,
  CheckCircle,
  Zap
} from "lucide-react";
```

---

### 4.10 Label/Text Consistency Guide

**User-Facing Labels:**
- ✅ "My Subscription" (possessive, personal)
- ✅ "Manage Subscription" (action-oriented)
- ✅ "Subscription Management" (page title)
- ❌ "Subscription Settings" (too generic)
- ❌ "Billing" (too narrow, implies only payment)

**Admin-Facing Labels:**
- ✅ "Cancellation Requests"
- ✅ "Refund Requests"
- ✅ "Dispute Management"
- ✅ "Subscription Analytics"

**Button Text:**
- Primary action: "Manage Subscription"
- Secondary: "View Subscription" or "Subscription Details"
- Upgrade: "Upgrade Plan" or "Upgrade"

---

### 4.11 Testing Requirements

#### Manual Testing Checklist

**Desktop Navigation:**
- [ ] AppShell main nav shows "My Subscription" for customers
- [ ] User dropdown menu shows "Subscription" with CreditCard icon
- [ ] StudentDashboard hero section has "Manage Subscription" button
- [ ] Profile page has Subscription section card
- [ ] Admin sidebar shows subscription management links
- [ ] All links navigate to correct routes
- [ ] Active link highlighting works correctly

**Mobile Navigation:**
- [ ] Mobile sheet menu includes "My Subscription"
- [ ] Links are tappable (min 44px touch target)
- [ ] Sheet closes after navigation
- [ ] StudentDashboard quick actions accessible on mobile

**Conditional Rendering:**
- [ ] Links only show for `userType === "customer"`
- [ ] Admin links only show for `teamRole === "admin"`
- [ ] Non-subscribers see upgrade prompt (if implemented)
- [ ] No subscription links for partners/companies/counselors

**Accessibility:**
- [ ] All links have proper aria-labels
- [ ] Icons have text labels (not icon-only)
- [ ] Keyboard navigation works (Tab, Enter)
- [ ] Screen reader announces link purpose
- [ ] Color contrast meets WCAG 2.1 AA standards

#### Automated Testing

**Unit Tests:**
```typescript
// AppShell.test.tsx
describe('AppShell Navigation', () => {
  it('shows My Subscription link for customers', () => {
    // Mock user with userType: "customer"
    // Assert subscription link is rendered
  });

  it('does not show subscription link for non-customers', () => {
    // Mock user with userType: "partner"
    // Assert subscription link is NOT rendered
  });

  it('navigates to /subscription-management on click', () => {
    // Click subscription link
    // Assert navigation occurred
  });
});
```

**Integration Tests:**
```typescript
// navigation.integration.test.tsx
describe('Subscription Navigation Flow', () => {
  it('allows customer to navigate from dashboard to subscription management', () => {
    // Login as customer
    // Navigate to dashboard
    // Click "Manage Subscription"
    // Assert at /subscription-management
  });
});
```

---

### 4.12 Implementation Sequence

**Recommended Order:**

1. **AppShell.tsx Updates** (Highest Priority)
   - User navigation items array
   - User dropdown menu
   - Mobile sheet menu
   - Import icons
   - Test desktop & mobile

2. **Routing Verification (App.tsx)**
   - Verify /subscription-management route exists
   - Verify admin routes exist
   - Test route protection

3. **StudentDashboard.tsx**
   - Hero section button
   - Quick actions card (optional)
   - Test navigation

4. **Profile.tsx**
   - Subscription section card
   - Manage Subscription button
   - Test link

5. **AdminDashboard.tsx**
   - Sidebar navigation links
   - Tab state management
   - Test admin navigation

6. **Testing & Refinement**
   - Manual testing all navigation paths
   - Accessibility audit
   - Mobile responsiveness check
   - Fix any bugs/issues

---

### 4.13 Phase 4 Deliverables

✅ **Navigation Updates:**
- AppShell global navigation (desktop + mobile)
- StudentDashboard quick actions
- Profile page subscription section
- Admin sidebar navigation

✅ **User Experience:**
- Subscription management discoverable from multiple entry points
- Clear, consistent labeling
- Appropriate iconography
- Conditional rendering based on user type

✅ **Technical:**
- All routes properly configured
- Protected routes enforced
- Accessibility standards met
- Mobile-responsive design

✅ **Documentation:**
- This implementation plan
- Icon reference guide
- Label consistency guide
- Testing checklist

---

### 4.14 Known Considerations & Edge Cases

**Edge Case 1: Non-Subscriber Customers**
- **Issue:** Customer users without subscriptions
- **Solution:** Add conditional to check `user.subscription` exists before showing link, OR show "Subscribe" link instead

**Edge Case 2: Expired Subscriptions**
- **Issue:** Users with expired subscriptions
- **Solution:** Still show subscription management (they may want to renew or view history)

**Edge Case 3: Admin Viewing as Customer**
- **Issue:** Admins may have both admin and customer roles
- **Solution:** Show both admin and customer links if applicable

**Edge Case 4: Deep Linking**
- **Issue:** Users may bookmark /subscription-management
- **Solution:** Ensure route protection redirects non-customers gracefully

**Edge Case 5: Mobile Performance**
- **Issue:** Mobile devices may have slower rendering
- **Solution:** Use lazy loading for subscription management page components

---

### 4.15 Future Enhancements (Post-Phase 4)

**Potential Additions:**
1. **Notification Badges**
   - Show pending request count on subscription nav items
   - Example: "My Subscription (2)" for 2 pending requests

2. **Contextual Prompts**
   - "Refund window expires in 6 hours" banner
   - "You have a pending cancellation request" alert

3. **Quick Actions Menu**
   - Dropdown from subscription link with quick actions:
     - View Plan
     - Request Cancellation
     - Contact Support

4. **Analytics Integration**
   - Track navigation clicks
   - Measure feature discovery rate
   - A/B test placement

---

## Phase 4 Implementation Summary

**Total Changes Required:** ~8 files
**Estimated Development Time:** 4-6 hours
**Testing Time:** 2-3 hours
**Total Phase 4 Effort:** 6-9 hours

**Files Modified:**
1. `client/src/components/AppShell.tsx` (3 changes)
2. `client/src/pages/StudentDashboard.tsx` (2 changes)
3. `client/src/pages/Profile.tsx` (1 change)
4. `client/src/pages/AdminDashboard.tsx` (1 change)
5. `client/src/App.tsx` (route verification)
6. `client/src/components/mobile/MobileBottomNav.tsx` (optional)
7. Test files (new)
8. This plan document (updated)

**Success Criteria:**
- [ ] All navigation links implemented and functional
- [ ] Icons and labels consistent with design system
- [ ] Conditional rendering works correctly
- [ ] Mobile navigation responsive and accessible
- [ ] All tests passing
- [ ] Accessibility audit passed
- [ ] Code review approved

---

**End of Phase 4 Plan**

---

## Phase 5: Critical Bug Fixes & System Stabilization

**Generated:** November 17, 2025  
**Status:** Investigation Complete - Awaiting Implementation Approval  
**Investigation Report:** `SUBSCRIPTION_MANAGEMENT_PHASE_5_INVESTIGATION_REPORT.md`

### Executive Summary

Phases 1-4 have been successfully implemented with all infrastructure in place:
- ✅ Database tables, repositories, services
- ✅ API endpoints (user + admin)
- ✅ Frontend pages (SubscriptionManagement, Admin pages)
- ✅ Feature flags, audit logging, email notifications

**However, critical bugs prevent the system from functioning:**
1. 🔴 **Bug #1:** Hardcoded `status='active'` filter makes non-active subscriptions invisible
2. 🔴 **Bug #2:** Payment info hardcoded as `undefined`, breaking refund/dispute features
3. ⚠️ **Gap:** Navigation not integrated into main navigation components

**Phase 5 Goal:** Fix critical bugs and complete navigation integration to make the system fully functional.

---

### 5.1 Critical Bug #1: Repository Status Filter Fix

**Priority:** CRITICAL  
**Estimated Time:** 2-3 hours

#### Problem Analysis

**Location:** `server/repositories/subscription.repository.ts`

**Affected Methods:**
- `findByUser(userId)` - Line 438: Hardcoded `status='active'`
- `findByUserWithPlan(userId)` - Line 457: Hardcoded `status='active'`
- `findActiveByUserId(userId)` - Line 556: Hardcoded `status='active'` (OK, this is expected)
- `hasActiveSubscription(userId)` - Line 585: Hardcoded `status='active'` (OK, this is expected)

**Root Cause:**
- Methods meant to "find user's subscription" are filtering for ONLY `status='active'`
- Subscriptions with status `'pending'`, `'expired'`, or `'cancelled'` become invisible
- User "Manpreet" has a subscription with non-active status → system shows "You don't have an active subscription"

**Impact:**
- Users cannot view their subscription details if status ≠ 'active'
- Cannot request cancellation/refund for non-active subscriptions
- Dashboard incorrectly shows "no subscription" message
- Breaks subscription management page completely

#### Solution Strategy

**Refactor repository methods to separate concerns:**

**Option A: Status Parameter (Recommended)**
```typescript
// Make methods flexible with optional status filter
async findByUser(
  userId: string, 
  status?: SubscriptionStatus | SubscriptionStatus[]
): Promise<UserSubscription | undefined>

async findByUserWithPlan(
  userId: string, 
  status?: SubscriptionStatus | SubscriptionStatus[]
): Promise<SubscriptionWithPlan | undefined>
```

**Option B: Separate Methods**
```typescript
// Keep existing active-only methods, add new any-status methods
async findByUser(userId: string)  // Any status
async findActiveByUser(userId: string)  // Active only
async findByUserWithPlan(userId: string)  // Any status
async findActiveByUserWithPlan(userId: string)  // Active only
```

**Recommendation:** Use **Option A** - more flexible, less code duplication

#### Implementation Tasks

**Task 5.1.1: Update Repository Methods**
- [ ] Modify `findByUser()` to accept optional `status` parameter
- [ ] Modify `findByUserWithPlan()` to accept optional `status` parameter
- [ ] Update method signatures in `IUserSubscriptionRepository` interface
- [ ] Add JSDoc comments explaining status parameter behavior
- [ ] Keep `findActiveByUserId()` and `hasActiveSubscription()` unchanged (they're correct)

**Code Changes:**

**File:** `server/repositories/subscription.repository.ts`

```typescript
/**
 * Find user's subscription with optional status filter
 * @param userId - User ID
 * @param status - Optional status filter. If not provided, returns any status. 
 *                 Can be single status or array of statuses.
 */
async findByUser(
  userId: string,
  status?: SubscriptionStatus | SubscriptionStatus[]
): Promise<UserSubscription | undefined> {
  try {
    const whereConditions = [eq(userSubscriptions.userId, userId)];
    
    if (status) {
      if (Array.isArray(status)) {
        whereConditions.push(inArray(userSubscriptions.status, status));
      } else {
        whereConditions.push(eq(userSubscriptions.status, status));
      }
    }
    
    const results = await db
      .select()
      .from(userSubscriptions)
      .where(and(...whereConditions))
      .orderBy(desc(userSubscriptions.createdAt)) // Get most recent
      .limit(1);
      
    return results[0] as UserSubscription | undefined;
  } catch (error) {
    handleDatabaseError(error, 'UserSubscriptionRepository.findByUser');
  }
}

/**
 * Find user's subscription with plan, with optional status filter
 * @param userId - User ID
 * @param status - Optional status filter
 */
async findByUserWithPlan(
  userId: string,
  status?: SubscriptionStatus | SubscriptionStatus[]
): Promise<SubscriptionWithPlan | undefined> {
  try {
    const whereConditions = [eq(userSubscriptions.userId, userId)];
    
    if (status) {
      if (Array.isArray(status)) {
        whereConditions.push(inArray(userSubscriptions.status, status));
      } else {
        whereConditions.push(eq(userSubscriptions.status, status));
      }
    }
    
    const results = await db
      .select({
        subscription: userSubscriptions,
        plan: subscriptionPlans
      })
      .from(userSubscriptions)
      .leftJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
      .where(and(...whereConditions))
      .orderBy(desc(userSubscriptions.createdAt)) // Get most recent
      .limit(1);
    
    if (results.length === 0) return undefined;
    
    return {
      subscription: results[0].subscription as UserSubscription,
      plan: results[0].plan as SubscriptionPlan
    };
  } catch (error) {
    handleDatabaseError(error, 'UserSubscriptionRepository.findByUserWithPlan');
  }
}
```

**Task 5.1.2: Update Service Layer Callers**
- [ ] Review all service methods calling `findByUser()` or `findByUserWithPlan()`
- [ ] Determine appropriate status filter for each use case:
  - **Subscription Management Page:** Any status (user should see their subscription regardless)
  - **Feature Access Checks:** Active only (use `hasActiveSubscription()`)
  - **Cancellation Requests:** Any status (can request for expired/cancelled too)
  - **Refund Requests:** Any status (might refund cancelled subscription)
- [ ] Update service method calls with appropriate status parameter

**Files to Review:**
- `server/services/domain/user-subscription.service.ts`
- `server/services/domain/cancellation.service.ts`
- `server/services/domain/refund.service.ts`
- `server/controllers/subscription.controller.ts`

**Task 5.1.3: Controller Updates**

**File:** `server/controllers/subscription.controller.ts`

**Method:** `getUserSubscription()` (Line ~136-145)

**Current Code:**
```typescript
const subscription = await userSubscriptionService.getCurrentSubscription(userId);
if (!subscription) {
  return res.json({ status: 'inactive', plan: null });
}
```

**Updated Code:**
```typescript
// Get user's subscription regardless of status
// (User should be able to see cancelled/expired subscriptions)
const subscription = await userSubscriptionService.getCurrentSubscription(userId);

if (!subscription) {
  return res.json({ 
    subscription: null, 
    plan: null,
    message: 'No subscription found' 
  });
}

// Return subscription with status for frontend to handle appropriately
return res.json({
  subscription: subscription.subscription,
  plan: subscription.plan,
  status: subscription.subscription.status
});
```

**Task 5.1.4: Testing**
- [ ] Unit test: `findByUser()` without status parameter returns any status
- [ ] Unit test: `findByUser(userId, 'active')` returns only active
- [ ] Unit test: `findByUser(userId, ['active', 'expired'])` returns active or expired
- [ ] Integration test: User with cancelled subscription can view subscription page
- [ ] Integration test: User with expired subscription can view subscription page
- [ ] Integration test: Feature access still properly checks active status

---

### 5.2 Critical Bug #2: Payment Info Missing in API Response

**Priority:** CRITICAL  
**Estimated Time:** 1-2 hours

#### Problem Analysis

**Location:** `client/src/pages/SubscriptionManagement.tsx` (Line 71)

**Current Code:**
```typescript
const payment = undefined as { id: string; paidAt: string; amount: string } | undefined;
```

**Impact:**
- Refund panel always shows "No Payment Found" (lines 136-149)
- Dispute panel cannot function (lines 169-176)
- Users cannot request refunds or raise disputes
- Features are 100% broken despite UI existing

**Root Cause:**
1. Backend API `getUserSubscription()` doesn't include payment record in response
2. Frontend hardcoded payment as `undefined` instead of fetching it
3. No API endpoint to retrieve payment info for subscription

#### Solution Strategy

**Add payment record to subscription API response:**

1. Update backend to join payment record when fetching subscription
2. Update API response type to include payment
3. Update frontend to use real payment data instead of undefined

#### Implementation Tasks

**Task 5.2.1: Backend - Update Repository**

**File:** `server/repositories/subscription.repository.ts`

**Add new method:**
```typescript
/**
 * Find user's subscription with plan AND latest payment
 * @param userId - User ID
 * @param status - Optional status filter
 */
async findByUserWithPlanAndPayment(
  userId: string,
  status?: SubscriptionStatus | SubscriptionStatus[]
): Promise<SubscriptionWithPlanAndPayment | undefined> {
  try {
    const whereConditions = [eq(userSubscriptions.userId, userId)];
    
    if (status) {
      if (Array.isArray(status)) {
        whereConditions.push(inArray(userSubscriptions.status, status));
      } else {
        whereConditions.push(eq(userSubscriptions.status, status));
      }
    }
    
    const results = await db
      .select({
        subscription: userSubscriptions,
        plan: subscriptionPlans,
        payment: payments
      })
      .from(userSubscriptions)
      .leftJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
      .leftJoin(payments, eq(userSubscriptions.id, payments.subscriptionId))
      .where(and(...whereConditions))
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(1);
    
    if (results.length === 0) return undefined;
    
    return {
      subscription: results[0].subscription as UserSubscription,
      plan: results[0].plan as SubscriptionPlan,
      payment: results[0].payment as Payment | null
    };
  } catch (error) {
    handleDatabaseError(error, 'UserSubscriptionRepository.findByUserWithPlanAndPayment');
  }
}
```

**Task 5.2.2: Backend - Update Type Definitions**

**File:** `shared/types.ts` or `server/types/subscription.types.ts`

```typescript
export interface SubscriptionWithPlanAndPayment {
  subscription: UserSubscription;
  plan: SubscriptionPlan | null;
  payment: Payment | null;
}
```

**Task 5.2.3: Backend - Update Service**

**File:** `server/services/domain/user-subscription.service.ts`

**Update method:**
```typescript
async getCurrentSubscription(userId: string): Promise<SubscriptionWithPlanAndPayment | undefined> {
  // Use new method that includes payment
  return this.userSubscriptionRepo.findByUserWithPlanAndPayment(userId);
}
```

**Task 5.2.4: Backend - Update Controller**

**File:** `server/controllers/subscription.controller.ts`

**Update response structure:**
```typescript
async getUserSubscription(req: Request, res: Response) {
  const userId = req.user!.id;
  
  const data = await userSubscriptionService.getCurrentSubscription(userId);
  
  if (!data) {
    return res.json({ 
      subscription: null, 
      plan: null,
      payment: null,
      message: 'No subscription found' 
    });
  }
  
  return res.json({
    subscription: data.subscription,
    plan: data.plan,
    payment: data.payment ? {
      id: data.payment.id,
      amount: data.payment.amount,
      currency: data.payment.currency,
      paidAt: data.payment.createdAt, // or paidAt field if exists
      razorpayPaymentId: data.payment.razorpayPaymentId,
      status: data.payment.status
    } : null
  });
}
```

**Task 5.2.5: Frontend - Update API Hook**

**File:** `client/src/hooks/useUserSubscription.tsx`

**Update response type:**
```typescript
interface UserSubscriptionResponse {
  subscription: UserSubscription | null;
  plan: SubscriptionPlan | null;
  payment: {
    id: string;
    amount: string;
    currency: string;
    paidAt: string;
    razorpayPaymentId: string;
    status: string;
  } | null;
  message?: string;
}
```

**Task 5.2.6: Frontend - Update SubscriptionManagement Page**

**File:** `client/src/pages/SubscriptionManagement.tsx`

**Replace line 71:**
```typescript
// OLD: const payment = undefined as { id: string; paidAt: string; amount: string } | undefined;

// NEW: Use actual payment from API
const payment = subscriptionData?.payment;
```

**Update conditionals to handle null payment:**
```typescript
// Refund Tab (lines 136-149)
<TabsContent value="refund" className="space-y-6">
  {payment ? (
    <RefundRequestPanel
      subscriptionId={subscription.id}
      paymentId={payment.id}
      paymentAmount={payment.amount}
      paidAt={payment.paidAt}
      currency={plan?.currency || payment.currency}
      existingRequest={existingRefundRequest}
    />
  ) : (
    <Card>
      <CardHeader>
        <CardTitle>Payment Information Not Available</CardTitle>
        <CardDescription>
          Unable to find payment record for this subscription. 
          Please contact support if you need to request a refund.
        </CardDescription>
      </CardHeader>
    </Card>
  )}
</TabsContent>
```

**Task 5.2.7: Testing**
- [ ] Backend test: API returns payment record in response
- [ ] Backend test: API handles subscriptions without payment gracefully
- [ ] Frontend test: Payment info displayed correctly in UI
- [ ] Integration test: Refund panel shows payment info correctly
- [ ] Integration test: Dispute panel shows payment info correctly
- [ ] E2E test: Complete refund request flow works end-to-end

---

### 5.3 Navigation Integration Completion

**Priority:** HIGH  
**Estimated Time:** 1 hour

#### Problem Analysis

Navigation links for subscription management are missing from main navigation components, making features hard to discover.

**Gaps:**
- ❌ Not in `Navigation.tsx` main navigation
- ❌ Not in `navigation-config.ts` configuration
- ❌ User must manually type URL or find links in dashboard

#### Implementation Tasks

**Task 5.3.1: Add to Navigation Config**

**File:** `client/src/config/navigation-config.ts` (if exists)

```typescript
export const customerNavigationItems = [
  // ... existing items
  {
    id: 'subscription',
    label: 'My Subscription',
    path: '/subscription-management',
    icon: 'CreditCard',
    requiresSubscription: true, // Only show if user has subscription
  }
];
```

**Task 5.3.2: Update Navigation Component**

**File:** `client/src/components/Navigation.tsx`

Add subscription management link to customer navigation section:
```typescript
{user.role === 'customer' && user.subscription && (
  <Link 
    href="/subscription-management" 
    className="nav-link"
  >
    <CreditCard className="w-4 h-4" />
    <span>My Subscription</span>
  </Link>
)}
```

**Task 5.3.3: Update AppShell (if not already done in Phase 4)**

**File:** `client/src/components/AppShell.tsx`

Ensure subscription link in user dropdown menu:
```typescript
const userMenuItems = [
  { label: 'Dashboard', path: '/dashboard', icon: Home },
  { label: 'Profile', path: '/profile', icon: User },
  { label: 'My Subscription', path: '/subscription-management', icon: CreditCard }, // Add this
  { label: 'Logout', path: '/logout', icon: LogOut }
];
```

**Task 5.3.4: Conditional Rendering**

Add logic to only show subscription link if user has a subscription:
```typescript
{userSubscription && (
  <NavigationItem href="/subscription-management">
    <CreditCard /> My Subscription
  </NavigationItem>
)}
```

**Task 5.3.5: Testing**
- [ ] Navigation link appears for users with subscriptions
- [ ] Navigation link hidden for users without subscriptions
- [ ] Link navigates to correct page
- [ ] Active state highlights correctly
- [ ] Mobile navigation shows link
- [ ] Admin users see admin links

---

### 5.4 Additional Fixes & Improvements

**Priority:** MEDIUM  
**Estimated Time:** 1-2 hours

#### Task 5.4.1: Frontend Status Handling

**File:** `client/src/pages/SubscriptionManagement.tsx`

**Update to handle different subscription statuses:**
```typescript
// Show appropriate message based on status
if (!subscriptionData || !subscriptionData.subscription) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>No Subscription</CardTitle>
        <CardDescription>
          You don't have an active subscription. <Link href="/plans">View Plans</Link>
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

const { subscription, plan, payment } = subscriptionData;

// Show status-specific warnings
{subscription.status === 'cancelled' && (
  <Alert variant="warning">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Subscription Cancelled</AlertTitle>
    <AlertDescription>
      Your subscription was cancelled on {formatDate(subscription.updatedAt)}
    </AlertDescription>
  </Alert>
)}

{subscription.status === 'expired' && (
  <Alert variant="warning">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Subscription Expired</AlertTitle>
    <AlertDescription>
      Your subscription expired on {formatDate(subscription.expiresAt)}
    </AlertDescription>
  </Alert>
)}

{subscription.status === 'pending' && (
  <Alert variant="info">
    <Info className="h-4 w-4" />
    <AlertTitle>Payment Processing</AlertTitle>
    <AlertDescription>
      Your payment is being verified. This usually takes a few minutes.
    </AlertDescription>
  </Alert>
)}
```

#### Task 5.4.2: Feature Flag Verification

**Files:** 
- `server/config/feature-flags.ts`
- `.env` file

**Verify flags are enabled:**
```bash
ENABLE_USER_CANCELLATION_REQUESTS=true
ENABLE_REFUND_SYSTEM=true
ENABLE_DISPUTE_MANAGEMENT=true
```

#### Task 5.4.3: Database Verification for User Manpreet

Run SQL query to check Manpreet's subscription status:
```sql
SELECT 
  id, 
  user_id, 
  plan_id, 
  status, 
  started_at, 
  expires_at,
  created_at,
  updated_at
FROM user_subscriptions 
WHERE user_id = (SELECT id FROM users WHERE email = 'manpreet@example.com' OR name LIKE '%Manpreet%')
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Actions:**
- If status is 'pending' → Update to 'active' manually OR investigate why payment didn't set it to active
- If status is 'cancelled' → This explains the bug, system is working correctly but status is wrong
- If status is 'expired' → Check if expiresAt is in the past

---

### 5.5 Testing & Validation Plan

**Priority:** HIGH  
**Estimated Time:** 2-3 hours

#### Test Suite 5.5.1: Repository Tests

**File:** `server/tests/repositories/subscription.repository.test.ts`

```typescript
describe('UserSubscriptionRepository - Status Filter Fix', () => {
  it('findByUser() without status returns any subscription', async () => {
    // Create subscriptions with different statuses
    await createTestSubscription(userId, { status: 'cancelled' });
    const result = await repo.findByUser(userId);
    expect(result).toBeDefined();
    expect(result.status).toBe('cancelled');
  });
  
  it('findByUser() with status filter returns only matching status', async () => {
    await createTestSubscription(userId, { status: 'cancelled' });
    const result = await repo.findByUser(userId, 'active');
    expect(result).toBeUndefined();
  });
  
  it('findByUser() with array status returns any matching', async () => {
    await createTestSubscription(userId, { status: 'expired' });
    const result = await repo.findByUser(userId, ['active', 'expired']);
    expect(result).toBeDefined();
    expect(result.status).toBe('expired');
  });
  
  it('findByUserWithPlanAndPayment() includes payment record', async () => {
    const result = await repo.findByUserWithPlanAndPayment(userId);
    expect(result.subscription).toBeDefined();
    expect(result.plan).toBeDefined();
    expect(result.payment).toBeDefined();
    expect(result.payment.id).toBeDefined();
  });
});
```

#### Test Suite 5.5.2: API Integration Tests

**File:** `server/tests/integration/subscription.api.test.ts`

```typescript
describe('GET /api/subscription/user/subscription', () => {
  it('returns subscription with payment info', async () => {
    const response = await request(app)
      .get('/api/subscription/user/subscription')
      .set('Cookie', authCookie)
      .expect(200);
    
    expect(response.body.subscription).toBeDefined();
    expect(response.body.plan).toBeDefined();
    expect(response.body.payment).toBeDefined();
    expect(response.body.payment.id).toBeDefined();
    expect(response.body.payment.amount).toBeDefined();
  });
  
  it('returns cancelled subscription correctly', async () => {
    await updateUserSubscription(userId, { status: 'cancelled' });
    
    const response = await request(app)
      .get('/api/subscription/user/subscription')
      .expect(200);
    
    expect(response.body.subscription.status).toBe('cancelled');
    expect(response.body.subscription).toBeDefined(); // Should still return it
  });
});
```

#### Test Suite 5.5.3: Frontend Component Tests

**File:** `client/src/pages/__tests__/SubscriptionManagement.test.tsx`

```typescript
describe('SubscriptionManagement - Bug Fixes', () => {
  it('displays subscription with cancelled status', async () => {
    mockAPI({
      subscription: { id: '123', status: 'cancelled' },
      plan: { name: 'Pro Plan' },
      payment: { id: 'pay_123', amount: '1667' }
    });
    
    render(<SubscriptionManagement />);
    
    expect(screen.getByText('Subscription Cancelled')).toBeInTheDocument();
    expect(screen.queryByText("You don't have an active subscription")).not.toBeInTheDocument();
  });
  
  it('displays payment info in refund panel', async () => {
    mockAPI({
      subscription: { id: '123', status: 'active' },
      plan: { name: 'Pro Plan' },
      payment: { id: 'pay_123', amount: '1667', paidAt: '2025-11-15' }
    });
    
    render(<SubscriptionManagement />);
    
    await userEvent.click(screen.getByText('Refund'));
    
    expect(screen.queryByText('No Payment Found')).not.toBeInTheDocument();
    expect(screen.getByText(/1667/)).toBeInTheDocument(); // Amount displayed
  });
});
```

#### Manual Testing Checklist

**Bug #1 Verification:**
- [ ] Create test user with cancelled subscription
- [ ] Navigate to /subscription-management
- [ ] Verify page loads and shows subscription details
- [ ] Verify status badge shows "Cancelled"
- [ ] Verify no "You don't have an active subscription" error

**Bug #2 Verification:**
- [ ] Login as user with active subscription and payment
- [ ] Navigate to /subscription-management
- [ ] Click "Refund" tab
- [ ] Verify payment info is displayed (not "No Payment Found")
- [ ] Verify refund eligibility countdown appears
- [ ] Click "Dispute" tab
- [ ] Verify payment amount and date displayed

**Navigation Verification:**
- [ ] Check main navigation has "My Subscription" link
- [ ] Click link navigates to /subscription-management
- [ ] User without subscription doesn't see link
- [ ] Mobile navigation includes link
- [ ] Active state highlights correctly

---

### 5.6 Deployment & Rollout Plan

**Priority:** CRITICAL  
**Estimated Time:** 1 hour

#### Pre-Deployment Checklist

**Database:**
- [ ] Run migration verification query
- [ ] Check all 3 new tables exist
- [ ] Verify foreign key constraints
- [ ] Check indexes exist

**Environment Variables:**
- [ ] Feature flags enabled in production `.env`
- [ ] Razorpay credentials configured
- [ ] Email service configured

**Code Review:**
- [ ] All bug fixes reviewed
- [ ] Type definitions updated
- [ ] Tests passing
- [ ] No console errors

#### Deployment Sequence

**Step 1: Backend Deployment**
1. Deploy repository changes
2. Deploy service layer changes
3. Deploy controller changes
4. Restart backend server
5. Verify API endpoints respond correctly

**Step 2: Database Migration** (if needed)
1. Backup database
2. Run any new migrations
3. Verify schema changes

**Step 3: Frontend Deployment**
1. Deploy updated components
2. Deploy updated hooks
3. Clear CDN cache
4. Verify pages load

**Step 4: Feature Flag Enablement**
1. Enable `ENABLE_USER_CANCELLATION_REQUESTS=true`
2. Enable `ENABLE_REFUND_SYSTEM=true`
3. Enable `ENABLE_DISPUTE_MANAGEMENT=true`
4. Monitor error logs

**Step 5: Smoke Testing**
1. Login as test user
2. Navigate to subscription management
3. Verify all tabs load
4. Test one cancellation request
5. Test one refund request (if within window)
6. Verify admin pages load

#### Rollback Plan

If critical issues arise:
```bash
# 1. Disable feature flags
ENABLE_USER_CANCELLATION_REQUESTS=false
ENABLE_REFUND_SYSTEM=false
ENABLE_DISPUTE_MANAGEMENT=false

# 2. Revert frontend deployment
# 3. Revert backend deployment
# 4. Restore database backup (if schema changes made)
```

---

### 5.7 Post-Deployment Monitoring

**Priority:** HIGH  
**Estimated Time:** Ongoing for 48 hours

#### Metrics to Monitor

**Application Metrics:**
- [ ] `/subscription-management` page load success rate
- [ ] API endpoint response times (`/api/subscription/user/subscription`)
- [ ] Error rates for refund/cancellation requests
- [ ] Payment retrieval success rate

**Business Metrics:**
- [ ] Number of users accessing subscription management
- [ ] Cancellation request volume
- [ ] Refund request volume
- [ ] Dispute creation rate

**Error Monitoring:**
- [ ] Watch for "Payment not found" errors
- [ ] Watch for "Subscription not found" errors
- [ ] Monitor database query performance
- [ ] Check for 500 errors

#### Alert Thresholds

Set up alerts for:
- Error rate > 5% on subscription endpoints
- Page load time > 3 seconds
- Database query time > 1 second
- Any 500 errors on new endpoints

---

### 5.8 Documentation Updates

**Priority:** MEDIUM  
**Estimated Time:** 1 hour

#### Update Documentation Files

**File:** `README.md`
- [ ] Update with Phase 5 completion status
- [ ] Document bug fixes
- [ ] Update feature list

**File:** `SUBSCRIPTION_MANAGEMENT_IMPLEMENTATION_PLAN.md` (this file)
- [ ] Mark Phase 5 tasks as complete
- [ ] Add completion date
- [ ] Update success criteria

**File:** `docs/API.md` (if exists)
- [ ] Document updated API response structure
- [ ] Add payment field to subscription endpoint docs
- [ ] Document status parameter behavior

**File:** `replit.md`
- [ ] Update project status
- [ ] Document Phase 5 completion
- [ ] Note any remaining issues

---

### 5.9 Phase 5 Implementation Checklist

#### Critical Bug Fixes
- [ ] **Bug #1: Repository Status Filter**
  - [ ] Add status parameter to `findByUser()`
  - [ ] Add status parameter to `findByUserWithPlan()`
  - [ ] Update method signatures in interface
  - [ ] Update all service layer callers
  - [ ] Update controller to handle non-active statuses
  - [ ] Write unit tests
  - [ ] Write integration tests
  - [ ] Test with user "Manpreet"
  
- [ ] **Bug #2: Payment Info Missing**
  - [ ] Create `findByUserWithPlanAndPayment()` repository method
  - [ ] Add `SubscriptionWithPlanAndPayment` type
  - [ ] Update service to use new method
  - [ ] Update controller to include payment in response
  - [ ] Update frontend API hook types
  - [ ] Update SubscriptionManagement page to use real payment
  - [ ] Test refund panel shows payment info
  - [ ] Test dispute panel shows payment info

#### Navigation Integration
- [ ] Add to navigation config
- [ ] Update Navigation.tsx component
- [ ] Update AppShell user menu
- [ ] Add conditional rendering logic
- [ ] Test desktop navigation
- [ ] Test mobile navigation

#### Additional Improvements
- [ ] Add status-specific UI messages (cancelled, expired, pending)
- [ ] Verify feature flags enabled
- [ ] Check Manpreet's subscription in database
- [ ] Update status if needed

#### Testing
- [ ] Run all repository tests
- [ ] Run all API integration tests
- [ ] Run all frontend component tests
- [ ] Perform manual testing checklist
- [ ] Test with different subscription statuses
- [ ] Test payment info display
- [ ] Test navigation links

#### Deployment
- [ ] Code review approved
- [ ] All tests passing
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Enable feature flags
- [ ] Smoke test in production
- [ ] Monitor for 48 hours

#### Documentation
- [ ] Update README
- [ ] Update API docs
- [ ] Update this implementation plan
- [ ] Update replit.md

---

### 5.10 Success Criteria

Phase 5 is complete when:

✅ **Bug #1 Fixed:**
- Users with cancelled/expired subscriptions can view subscription management page
- No more "You don't have an active subscription" for valid subscriptions
- System correctly differentiates between "no subscription" and "non-active subscription"

✅ **Bug #2 Fixed:**
- Payment info displays correctly in subscription management page
- Refund panel shows payment details (not "No Payment Found")
- Dispute panel shows payment details
- Users can successfully request refunds and raise disputes

✅ **Navigation Complete:**
- "My Subscription" link visible in main navigation
- Link only shows for users with subscriptions
- Mobile navigation includes link
- All navigation paths work correctly

✅ **System Functional:**
- All Phase 1-4 features work end-to-end
- User can request cancellation, refunds, disputes
- Admin can approve/reject/process all requests
- No critical errors in logs
- All tests passing

---

## Phase 5 Summary

**Total Files Modified:** ~12 files  
**Total Estimated Effort:** 6-9 hours  
**Priority:** CRITICAL - System is non-functional without these fixes

**Key Deliverables:**
1. Repository methods accept status parameter (flexible querying)
2. Payment info included in subscription API response
3. Frontend uses real payment data instead of undefined
4. Navigation integration complete
5. Status-specific UI messaging
6. Comprehensive test coverage
7. Production deployment with monitoring

**Risk Assessment:**
- **Risk:** Low - Changes are isolated and well-tested
- **Impact:** High - Fixes critical bugs blocking all subscription management features
- **Complexity:** Medium - Requires careful update of multiple layers

**Approval Required Before:**
- Modifying repository method signatures
- Updating API response structure (breaking change)
- Deploying to production

---

**End of Phase 5 Plan**

---

**End of Plan**
