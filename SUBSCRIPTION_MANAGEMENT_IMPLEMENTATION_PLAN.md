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

**End of Plan**
