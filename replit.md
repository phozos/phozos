# EduPath - International Education Platform

## Overview

EduPath is a comprehensive international education platform designed to connect students with universities globally. It offers AI-powered university matching, application tracking, document management, counselor assignment, community forums, and subscription services. The platform is a full-stack TypeScript application with a React frontend and an Express backend, catering to students, team members (admins/counselors), and company profiles. Its core purpose is to streamline the international education application process and provide a robust support system for all stakeholders.

## Recent Changes

**October 28, 2025 - Environment Configuration Modernization (Phase 4 Complete)**
- ✅ Removed all legacy `dotenv/config` imports from codebase
- ✅ Migrated database migration script to use centralized config module
- ✅ Eliminated duplicate environment loading logic
- ✅ All environment variable access now flows through validated `server/config/index.ts`
- ✅ Single dotenv-flow entry point ensures consistent configuration across all runtime contexts
- **Impact:** Improved configuration consistency, better error handling, eliminated maintenance gaps

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Technology Stack
- **Frontend:** React, TypeScript, Wouter, TanStack Query, Shadcn UI (Radix UI), Tailwind CSS, Vite.
- **Backend:** Node.js, Express, TypeScript (ESM), Drizzle ORM, PostgreSQL (Neon serverless), JWT-based authentication.

### Architectural Patterns
- **Domain-Driven Modular Architecture:** Employs a three-layer structure (Controllers, Services, Repositories) for clear separation of concerns, input validation, business logic, and data access. `BaseRepository` and `BaseService` classes ensure consistency and error handling.
- **Standardized API Response Format:** All API endpoints use a unified `{ success: boolean, data?: T, error?: ApiError, meta?: ApiMeta }` envelope, enforced by ESLint.
- **Role-Based Access Control (RBAC):** Differentiates between Customer (student), Team Member (Admin/Counselor), and Company Profile user types, with permissions managed by `authorize()` middleware and JWT tokens.
- **Database Schema Design:** PostgreSQL with UUID primary keys and typed enums. Includes tables for users (polymorphic), student profiles, universities, applications, forums, subscriptions, and real-time chat. Drizzle ORM provides type-safe queries.
- **Security Implementation:** Features JWT-based authentication with refresh tokens, HMAC-signed CSRF protection with session binding, rate limiting, bcrypt password hashing, secure IP detection, account lockout, and cryptographically secure 16-character temporary password generation via `TemporaryPasswordService`.
- **Error Handling Strategy:** Centralized error handling using custom error classes (e.g., `ServiceError`, `AuthenticationError`, `ValidationServiceError`) that map to standardized API error responses and appropriate HTTP status codes.
- **Centralized Configuration System:** Production-ready configuration module (`server/config/index.ts`) with layered environment file loading via dotenv-flow, Zod schema validation, type-safe exports, and feature flags for business logic. All runtime configuration flows through a single validated entry point, eliminating scattered `process.env` checks and enabling testable production features in development.
- **Modularization:** Ongoing effort to transition to a modular architecture, focusing on single responsibility for repositories, DTOs, moving business logic to services, and increasing test coverage.
- **CORS Implementation:** Comprehensive CORS middleware supporting split deployment architectures with secure defaults (explicit origins, credentials, CSRF compatibility) and robust monitoring.
- **Image Optimization Strategy:** Automated image optimization pipeline using vite-plugin-imagemin for production builds, achieving 30-50% file size reduction through WebP conversion, lazy loading, and async decoding. Includes OptimizedImage component for improved Core Web Vitals (LCP, CLS).
- **Core Web Vitals Optimization:** Comprehensive performance optimizations targeting Google's 2025 standards: font preloading for faster LCP, code splitting with manual chunks (vendor, ui, query) for better FID, skeleton loading utilities and enhanced fallback states for CLS prevention. Lazy loading extended to 7 heavy components.

## External Dependencies

### Third-Party Services
- **Email:** SendGrid (for notifications and verification).
- **Authentication:** JWT (jsonwebtoken), Passport Google OAuth 2.0.
- **Payment Processing:** Stripe (planned integration).
- **File Storage:** Local filesystem (multer) for document uploads.
- **Database:** Neon PostgreSQL (serverless) via `@neondatabase/serverless` driver.

### Key NPM Packages
- **Backend:** `express`, `drizzle-orm`, `zod`, `bcrypt`, `cookie-parser`, `express-rate-limit`, `express-slow-down`.
- **Frontend:** `@tanstack/react-query`, `react-hook-form`, `wouter`, `@radix-ui/*`, `tailwindcss`.
- **Development:** `vite`, `tsx`, `esbuild`, `vitest`, `eslint`, `@typescript-eslint`, `husky`, `lint-staged`.

### API Integrations
- **Planned:** University data providers, AI/ML services for matching, document verification services, Visa application tracking APIs.

### Environment Configuration
- **Required:** `DATABASE_URL`, `JWT_SECRET`, `CSRF_SECRET`, `NODE_ENV`.
- **Optional:** `SENDGRID_API_KEY`, `ADMIN_PASSWORD`, `ADMIN_IPS`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`.