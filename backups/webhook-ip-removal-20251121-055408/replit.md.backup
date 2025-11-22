# EduPath - International Education Platform

## Overview

EduPath is an international education platform designed to connect students with global universities. It streamlines the international education application process through AI-powered university matching, application tracking, document management, and counselor support. The platform also features community forums and subscription services, catering to students, team members (admins/counselors), and partner organizations. Built with a full-stack TypeScript architecture (React frontend, Express backend), EduPath aims to be a robust solution for the global education market, enhancing student success and institutional outreach. The project focuses on a comprehensive ecosystem to support all stakeholders in the international education journey.

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
- **Performance:** Optimized with font preloading, code splitting, skeleton loading, lazy loading, and automated image optimization.

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
- **Subscription Management System:** Full lifecycle management including user cancellation requests, refund processing (with a 48-hour eligibility window), and dispute management. Incorporates background jobs for synchronization, cleanup, escalation, and metrics, along with an integrated email notification system. **Phase 5 (November 17, 2025):** Critical bug fixes completed - repository methods now support flexible status filtering, payment data integrated into subscription API responses, and navigation fully implemented.

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