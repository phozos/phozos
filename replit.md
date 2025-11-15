# EduPath - International Education Platform

## Overview

EduPath is an international education platform designed to connect students with global universities. It streamlines the international education application process through AI-powered university matching, application tracking, document management, and counselor support. The platform also features community forums and subscription services, catering to students, team members (admins/counselors), and partner organizations. Built with a full-stack TypeScript architecture (React frontend, Express backend), EduPath aims to be a robust solution for the global education market, enhancing student success and institutional outreach. The project is ambitious, focusing on a comprehensive ecosystem to support all stakeholders in the international education journey.

## Recent Changes

### Subscription Management System - Phase 1: Foundation & Infrastructure (November 15, 2025)

**Phase 1.1: Database Schema & Migrations**
- Created 3 new database tables for subscription lifecycle management:
  - `cancellation_requests`: Tracks user cancellation requests with approval workflow (11 columns, 3 FKs)
  - `refunds`: Manages refund requests with Razorpay integration (18 columns, 5 FKs)
  - `chargebacks_disputes`: Handles payment disputes and chargebacks (17 columns, 4 FKs)
- Added 4 new enums: `cancellationStatusEnum`, `refundStatusEnum`, `disputeStatusEnum`, `disputeTypeEnum`
- Generated migration file: `migrations/0023_funny_champions.sql`
- All tables use UUID primary keys, timestamps, and proper foreign key constraints

**Phase 1.2: Domain Models & Zod Validation**
- Created Zod validation schemas in `server/services/validation/schemas.ts`:
  - `insertCancellationRequestSchema`, `updateCancellationRequestSchema`
  - `insertRefundSchema`, `updateRefundSchema`
  - `insertChargebackDisputeSchema`, `updateChargebackDisputeSchema`
- All schemas include field-level validation, proper type coercion, and business rule enforcement

**Phase 1.3: Repository Layer**
- Implemented `CancellationRequestRepository` with 7 methods (create, findById, findBySubscriptionId, findByUserId, findPending, updateStatus, getStatistics)
- Implemented `RefundRepository` with 8 methods including getTotalRefundedAmount for financial reporting
- Implemented `ChargebackDisputeRepository` with 7 methods including evidence management
- All repositories extend BaseRepository pattern and registered in DI container
- Added to `server/repositories/index.ts` and `server/services/container.ts` with proper type tokens

**Phase 1.4: Domain Services**
- Created `CancellationService` with SERIALIZABLE transactions for approval/rejection workflows
- Created `RefundService` with 48-hour eligibility window validation and multi-step approval process
- Created `DisputeService` with evidence tracking and investigation escalation
- All services integrate with existing InputSanitizer for XSS protection
- Business logic separated from data access following existing patterns
- Comprehensive error handling using custom service errors

**Phase 1.5: Razorpay Payment Integration**
- Extended `RazorpayService` with 4 new refund methods:
  - `initiateRefund`: Creates refund requests in Razorpay
  - `getRefundStatus`: Fetches real-time refund status
  - `getPaymentRefunds`: Retrieves all refunds for a payment
  - `handleRefundWebhook`: Processes Razorpay refund webhooks
- Added TypeScript interfaces: `RazorpayRefundOptions`, `RazorpayRefund`
- Comprehensive error handling with descriptive error messages

**Phase 1.6: Business Rules Implementation**
- 2-day (48-hour) refund eligibility window from payment date
- Status validation for all state transitions (pending → approved/rejected)
- Prevents duplicate requests (cancellations, refunds, disputes)
- Owner validation ensures users can only manage their own requests
- All input sanitized to prevent XSS attacks

**Phase 1.7: User Notification Integration**
- Created `SubscriptionManagementNotificationService` with 10 notification methods covering complete lifecycle:
  - Cancellation workflow: request received, approved, rejected
  - Refund workflow: request received, approved, rejected, processed, failed
  - Dispute workflow: received, under investigation, resolved
- Integrated notification service into all domain services (cancellation, refund, dispute)
- Notifications triggered after database transactions complete, ensuring data consistency
- Error handling prevents notification failures from blocking main workflow
- Webhook-driven notifications for Razorpay refund status updates
- Fixed circular dependency issues using lazy initialization pattern
- Fixed notification routes to match controller method names
- Added client-side routes for admin subscription management pages:
  - `/admin/subscriptions/cancellation-requests` (CancellationRequests.tsx)
  - `/admin/subscriptions/refund-management` (RefundManagement.tsx)
  - `/admin/subscriptions/dispute-management` (DisputeManagement.tsx)

**Technical Implementation:**
- **Files Created:** 10 new files (3 repositories, 3 domain services, 1 notification service, 3 admin pages)
- **Files Modified:** 7 files (schema.ts, validation schemas, razorpay.service.ts, container.ts, repositories/index.ts, App.tsx, notification.routes.ts)
- **Database Migration:** Generated migration with 3 new tables and 4 enums
- **Status:** Phase 1 & Notification Integration complete - All components tested and working
- **Next Steps:** End-to-end testing of complete subscription management flows

### Partner Account System - Frontend Implementation Complete (November 12, 2025)

**Phase 10: Partner Analytics Dashboard (Admin)**
- Created comprehensive analytics dashboard (`PartnerAnalytics.tsx`) displaying system-wide KPIs including total partners (verified, pending, inactive), monthly referrals and conversions, and commissions paid
- Top performing partners table ranked by conversions and total earnings
- Monthly trends visualization using recharts LineChart showing referrals and conversions over time
- Conversion funnel BarChart displaying the student journey from click to conversion
- Additional metrics card showing active referral links and average conversion rate across all partners
- Complete with loading skeletons, error handling with retry functionality, dark mode support, and mobile-responsive design
- Added protected admin route `/dashboard/admin/partner-analytics` (requires admin role)
- Created `usePartnerAnalytics` hook in `partner-api-hooks.ts` for API integration
- **Backend Requirement:** Needs implementation of GET `/api/admin/partners/analytics` endpoint

**Phase 11: Public Referral Landing & Integration**
- Enhanced `Auth.tsx` with complete referral attribution system
- Added `getCookie` helper function to detect partner referral cookies (`referral_code` and `click_id`) set by backend
- Displays blue Alert badge with UserCheck icon during student signup when referral is detected
- Informs users they were referred by a Phozos partner and will receive priority support
- Referral click ID automatically included in student registration payload for complete attribution tracking
- Maintains full backward compatibility with non-referral signup flows

**Phase 12: Testing & Polish**
- Conducted comprehensive quality review of all 10 partner system pages:
  - Partner-facing: PartnerDashboard, PartnerProfile, PartnerReferralLinks, PartnerCommissions, PartnerPayouts
  - Admin-facing: PartnerManagement, CommissionManagement, PayoutProcessing, PartnerAnalytics
- Verified implementation standards across all pages:
  - Consistent error handling with user-friendly messages and retry buttons
  - Loading states using animated skeletons following established patterns
  - Toast notifications via `partner-api-hooks` for all mutations
  - Dark mode compatibility with proper Tailwind dark: classes
  - Mobile responsiveness through responsive grid layouts (md:grid-cols-2, lg:grid-cols-4)
  - Accessibility features including proper labels, semantic HTML, and ARIA attributes
  - Performance optimization with React Query caching and appropriate staleTime configurations
- All partner pages follow established admin analytics patterns and codebase conventions

**Implementation Summary:**
- **Files Created:** 11 new files (10 pages + 1 hooks file with 15 React Query hooks)
- **Files Modified:** `App.tsx` (routing), `Auth.tsx` (referral integration), `partner-api-hooks.ts` (analytics hook)
- **Status:** All 12 phases from PARTNER_SYSTEM_FRONTEND_IMPLEMENTATION_PLAN.md are now complete
- **Next Steps:** Backend analytics endpoint implementation and end-to-end testing of referral attribution flow

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Technology Stack
- **Frontend:** React, TypeScript, Wouter, TanStack Query, Shadcn UI (Radix UI), Tailwind CSS, Vite.
- **Backend:** Node.js, Express, TypeScript (ESM), Drizzle ORM, PostgreSQL (Neon serverless), JWT-based authentication.

### UI/UX Decisions
- **Design System:** Utilizes Shadcn UI (Radix UI) and Tailwind CSS for a modern, responsive, and accessible interface.
- **Visual Differentiation:** Employs color-coded gradients, accent borders, gradient typography, and enhanced shadows for visual hierarchy.
- **Accessibility:** WCAG AA compliance with text-based designs and semantic HTML.
- **Performance:** Optimized with font preloading, code splitting, skeleton loading, lazy loading, and automated image optimization (WebP conversion, lazy loading, async decoding).

### Technical Implementations
- **Domain-Driven Modular Architecture:** Employs a three-layer structure (Controllers, Services, Repositories) for clear separation of concerns, robust input validation, and business logic encapsulation.
- **Standardized API Response Format:** Consistent `{ success: boolean, data?: T, error?: ApiError, meta?: ApiMeta }` envelope for all API endpoints.
- **Role-Based Access Control (RBAC):** Differentiates user types (Customer, Team Member, Partner) with JWT-based authorization.
- **Database Design:** PostgreSQL with UUID primary keys and typed enums, managed by Drizzle ORM for type-safe queries. Includes polymorphic user tables, student profiles, universities, applications, forums, subscriptions, and real-time chat, along with dedicated tables for partner management, referral links, and commission tracking.
- **Security:** JWT authentication with refresh tokens, HMAC-signed CSRF protection, rate limiting, bcrypt password hashing, secure IP detection, account lockout, cryptographically secure temporary passwords, XSS protection via `isomorphic-dompurify`, and DoS protection on expensive operations. Payment security includes webhook deduplication, IP whitelisting, transaction isolation, and timestamp validation.
- **Error Handling:** Centralized custom error classes mapped to standardized API error responses and HTTP status codes.
- **Centralized Configuration:** Layered `dotenv-flow` loading with Zod schema validation, type-safe exports, and feature flags.
- **Payment Integration:** Secure Razorpay gateway with multi-step verification and webhook signature verification for subscription activation.
- **Event Outbox Pattern:** Ensures reliable subscription event processing and audit logging, decoupling payment transactions from logging using a dedicated outbox table, background worker, and Dead Letter Queue (DLQ).
- **Subscription Plan Versioning & Grandfathering:** Allows existing subscribers to remain on older plan versions during price increases, with audit logging and admin management tools. Includes a notification system for plan changes requiring explicit acknowledgment.
- **Referral System:** End-to-end referral attribution with cookie detection, automatic click ID inclusion in registration, and tracking through dedicated partner tables.

### Feature Specifications
- **AI-Powered University Matching:** Core capability for student-university connections.
- **Application Tracking & Document Management:** Tools for managing student applications and associated documents.
- **Counselor Assignment:** System for assigning and managing student counselors.
- **Community Forums:** Platform for student interaction and support.
- **Subscription Services:** Tiered access to platform features.
- **Partner Account System:** Comprehensive system for managing partners, including profiles, referral links, commission structures, payout processing, and analytics dashboards.
- **Subscription Plan Management:** Admin tools for managing plans, versions, pricing, and migrations, including robust validation and confirmation dialogs for destructive actions.

## External Dependencies

### Third-Party Services
- **Email:** SendGrid.
- **Authentication:** JWT, Passport Google OAuth 2.0.
- **Payment Processing:** Razorpay.
- **File Storage:** Local filesystem (multer).
- **Database:** Neon PostgreSQL (serverless).

### Key NPM Packages
- **Backend:** `express`, `drizzle-orm`, `zod`, `bcrypt`, `cookie-parser`, `express-rate-limit`, `express-slow-down`, `razorpay`, `isomorphic-dompurify`.
- **Frontend:** `@tanstack/react-query`, `react-hook-form`, `wouter`, `@radix-ui/*`, `tailwindcss`.
- **Development:** `vite`, `tsx`, `esbuild`, `vitest`, `eslint`, `@typescript-eslint`, `husky`, `lint-staged`.

### API Integrations
- **Planned:** University data providers, AI/ML services for matching, document verification services, Visa application tracking APIs.

### Environment Configuration
- **Required:** `DATABASE_URL`, `JWT_SECRET`, `CSRF_SECRET`, `NODE_ENV`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
- **Optional:** `SENDGRID_API_KEY`, `ADMIN_PASSWORD`, `ADMIN_IPS`.