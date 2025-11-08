# EduPath - International Education Platform

## Overview

EduPath is an international education platform connecting students with global universities. It offers AI-powered university matching, application tracking, document management, counselor assignment, community forums, and subscription services. Built with a full-stack TypeScript (React frontend, Express backend) architecture, it serves students, team members (admins/counselors), and company profiles. The platform aims to streamline the international education application process and provide comprehensive support to all stakeholders. It is designed to be a robust solution for the global education market, enhancing student success and institutional outreach.

## Recent Changes

### Phase 2: UX/UI Improvements (November 2025)
- **Comprehensive Tooltips:** Added helpful tooltips throughout admin interfaces including price update dialogs, plan deprecation dialogs, and version history views to guide admins through complex operations.
- **Standardized Date Formatting:** Created centralized `formatDate` utility function with support for short, long, and relative date formats for consistency across the application.
- **Empty State Messaging:** Added informative empty states for subscription plans and subscriptions tabs with clear guidance and actionable next steps.
- **Badge Naming Consistency:** Standardized premium badge display names and labels across all contexts for better user experience.
- **Migration Workflow Integration:** Wired deprecation dialog migration checkbox to backend, enabling automatic migration workflow creation when plans are deprecated.
- **Backend Price Validation:** Enhanced server-side validation to reject same-price updates with clear error messages, preventing no-op version creation.
- **Rate Limiter Fixes:** Resolved IPv6 compatibility issues in admin route rate limiters by using authenticated user IDs instead of IP-based fallbacks.

### Phase 1: Critical Fixes (November 2025)
- **Price Update Dialog Improvements:** Removed prefilled default values, added reactive price difference calculation with visual highlighting, and validation to prevent same-price updates.
- **Destructive Action Confirmations:** Added AlertDialog for plan deletion requiring typed "DELETE" confirmation and showing active subscriber counts.
- **Race Condition Prevention:** Implemented SELECT FOR UPDATE row locking in version creation to eliminate duplicate version numbers from concurrent admins.
- **Automatic Grandfathering:** Implemented auto-grandfathering of existing subscribers when plan prices increase, preserving customer pricing with full audit trail.
- **XSS Protection:** Installed isomorphic-dompurify and created InputSanitizer utility for comprehensive input sanitization across all user-facing fields.
- **DoS Protection:** Added express-rate-limit middleware on expensive operations (version creation: 5 per 15 min, migrations: 3 per hour, bulk notifications: 1 per 30 min).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Technology Stack
- **Frontend:** React, TypeScript, Wouter, TanStack Query, Shadcn UI (Radix UI), Tailwind CSS, Vite.
- **Backend:** Node.js, Express, TypeScript (ESM), Drizzle ORM, PostgreSQL (Neon serverless), JWT-based authentication.

### Architectural Patterns
- **Domain-Driven Modular Architecture:** Three-layer structure (Controllers, Services, Repositories) for separation of concerns, input validation, business logic, and data access. Uses `BaseRepository` and `BaseService` for consistency.
- **Standardized API Response Format:** Unified `{ success: boolean, data?: T, error?: ApiError, meta?: ApiMeta }` envelope for all API endpoints.
- **Role-Based Access Control (RBAC):** Differentiates Customer, Team Member (Admin/Counselor), and Company Profile user types with `authorize()` middleware and JWT.
- **Database Schema Design:** PostgreSQL with UUID primary keys and typed enums, managed by Drizzle ORM for type-safe queries. Includes polymorphic user tables, student profiles, universities, applications, forums, subscriptions, and real-time chat.
- **Security Implementation:** JWT authentication with refresh tokens, HMAC-signed CSRF protection, rate limiting, bcrypt password hashing, secure IP detection, account lockout, and cryptographically secure temporary passwords. Includes webhook deduplication, rate limiting, IP whitelisting, transaction isolation, and timestamp validation for payment security. Input sanitization via isomorphic-dompurify for XSS prevention. Targeted rate limiting on expensive admin operations (version creation, migrations, bulk notifications) for DoS protection.
- **Error Handling Strategy:** Centralized custom error classes (e.g., `ServiceError`) mapped to standardized API error responses and HTTP status codes.
- **Centralized Configuration System:** Production-ready module (`server/config/index.ts`) with layered dotenv-flow loading, Zod schema validation, type-safe exports, and feature flags.
- **Payment Integration:** Secure Razorpay gateway with multi-step verification (signature, order, plan/amount matching) and webhook signature verification for subscription activation.
- **Modularization:** Focus on single responsibility for repositories, DTOs, and business logic in services.
- **CORS Implementation:** Comprehensive middleware for split deployment architectures with secure defaults and CSRF compatibility.
- **Image Optimization Strategy:** Automated image optimization via `vite-plugin-imagemin` for WebP conversion, lazy loading, and async decoding.
- **Core Web Vitals Optimization:** Performance enhancements including font preloading, code splitting, skeleton loading, and lazy loading for critical components.
- **Event Outbox Pattern:** Transactional Outbox Pattern for reliable subscription event processing, decoupling audit logging from payment transactions using a dedicated outbox table, background worker with retry logic, and DLQ. This ensures atomicity and eventual consistency while maintaining `SERIALIZABLE` isolation for payment security.
- **Subscription Plan Versioning:** Comprehensive system enabling grandfathering of plans, allowing existing subscribers to remain on older versions while new subscribers get the latest. Includes audit logging and admin management tools.
- **Plan Change Notification System:** System to notify users 30 days in advance of subscription plan changes, with notifications that are read on display but require explicit acknowledgment.

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