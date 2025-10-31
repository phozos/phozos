# Phozos Study Abroad Platform

## Overview

Phozos is a comprehensive study abroad platform that connects students with universities worldwide. The application provides AI-powered university matching, application tracking, document management, counselor-student communication, and subscription-based services. Built with a modern TypeScript stack featuring Express.js backend, React frontend, and PostgreSQL database.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture

**Framework & Runtime**
- Node.js with Express.js REST API server
- TypeScript with strict type checking and ES modules
- Service-oriented architecture with dependency injection container

**Layered Architecture Pattern**
- **Controllers**: Thin HTTP layer handling requests/responses, extending BaseController
- **Services**: Business logic layer with domain-specific services (auth, user, application, etc.)
- **Repositories**: Data access layer abstracting database operations
- **Middleware**: Cross-cutting concerns (authentication, CSRF, error handling, performance monitoring)

**Authentication & Authorization**
- JWT-based authentication with access/refresh token pattern
- Role-based access control supporting three user types: customer (students), team_member (staff), company_profile
- Team members can have roles: admin or counselor
- Session management with PostgreSQL session store
- HMAC-signed CSRF tokens with session binding for security

**API Response Standardization**
- Centralized response utilities (sendSuccess, sendError) enforced via ESLint
- Type-safe API contracts using Zod schemas
- Consistent error handling with domain-specific error classes
- All responses follow ApiResponse<T> envelope pattern

**Real-time Features**
- WebSocket integration for live chat between students and counselors
- Message queue system for background job processing
- Performance monitoring middleware tracking response times and system metrics

### Frontend Architecture

**Framework & Libraries**
- React 18 with TypeScript
- Wouter for routing (lightweight alternative to React Router)
- TanStack Query for server state management
- shadcn/ui component library with Radix UI primitives
- Tailwind CSS for styling with custom theme system

**Performance Optimizations**
- Lazy loading for heavy dashboard components (Community, AdminDashboard, etc.)
- Image optimization with vite-plugin-imagemin
- Code splitting and bundle optimization
- Loading fallbacks to prevent layout shifts (CLS optimization)
- Font preloading and display=swap for faster text rendering (LCP optimization)

**State Management**
- React Context for authentication state (useAuth hook)
- TanStack Query for server-side data caching and synchronization
- Local component state for UI interactions

**Theme & Styling**
- Dark mode support via ThemeProvider
- CSS custom properties for theming
- Responsive design with mobile-first approach
- Premium glass effects and scrollbar customization

### Data Layer

**ORM & Migrations**
- Drizzle ORM for type-safe database queries
- PostgreSQL with Neon serverless driver
- Schema-first approach with Zod validation
- Migration management via drizzle-kit

**Database Schema Organization**
- User management with account status workflow (active, pending_approval, suspended, etc.)
- Student profiles with comprehensive academic tracking
- University catalog with rankings, courses, and filtering
- Application tracking with status workflow
- Document management with type categorization
- Forum system with posts, comments, reactions, and moderation
- Chat system for counselor-student communication
- Events and notifications
- Subscription plans with tiered features
- Payment tracking and custom fields

**Repository Pattern**
- Base repository providing common CRUD operations
- Domain-specific repositories extending base functionality
- Transaction support for complex operations
- Comprehensive error handling at data access layer

### Configuration Management

**Centralized Configuration**
- Environment-based configuration using dotenv-flow
- Layered .env file support (.env, .env.local, .env.development, .env.production)
- Zod schema validation for all configuration values
- Type-safe exports with no 'any' types
- Helper functions for environment detection (isDev, isProd, isTest)

**Feature Flags**
- FORCE_HTTPS_REDIRECT: Redirect HTTP to HTTPS in production
- SEO_META_ENABLED: Enable SEO meta tag injection
- IMAGE_OPTIMIZATION_ENABLED: Enable image compression during builds
- CARTOGRAPHER_ENABLED: Enable Replit Cartographer integration
- HMR_ENABLED: Hot module replacement for development

**Security Configuration**
- JWT and CSRF secret management
- Cookie configuration (secure, httpOnly, sameSite)
- CORS origin whitelisting
- Admin IP whitelisting
- Rate limiting and trust proxy settings

### Code Quality & Testing

**Linting & Validation**
- ESLint with TypeScript plugin
- Strict rules for API routes enforcing response utilities
- Husky pre-commit hooks with lint-staged
- Custom validation scripts for architectural compliance

**Testing Framework**
- Vitest for unit and integration testing
- Coverage tracking for repositories and services
- Test isolation with proper mocking

**Build & Deployment**
- Vite for frontend bundling with production optimizations
- esbuild for backend compilation
- Separate build scripts for frontend and backend
- Production readiness validation scripts

## External Dependencies

### Database
- PostgreSQL (via Neon serverless)
- Connection pooling via pg library
- Drizzle ORM for queries and migrations

### Authentication & Security
- bcrypt for password hashing
- jsonwebtoken for JWT generation/validation
- csurf for CSRF protection (transitioning to custom implementation)
- helmet for security headers

### Email Services
- SendGrid for transactional emails
- Email templates for user notifications

### UI Components
- Radix UI primitives (dialogs, dropdowns, tooltips, etc.)
- shadcn/ui component system
- Lucide React for icons
- React Hook Form with Zod resolvers for forms

### Development Tools
- tsx for TypeScript execution
- Vite with React plugin and runtime error overlay
- dotenv-flow for environment management
- Replit-specific plugins (Cartographer, runtime error modal)

### Monitoring & Performance
- Custom performance monitoring middleware
- WebSocket metrics tracking
- System health checks
- Message queue for background processing

### Third-party Integrations
- Payment processing infrastructure (prepared for Stripe/PayPal)
- File upload handling (prepared for cloud storage)
- Analytics tracking (prepared for integration)
- SEO optimization with react-helmet-async