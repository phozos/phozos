# Partner Account System - Implementation Plan

## Investigation Summary

### 1. Authentication & User System Analysis

**Current Implementation:**
- **User Types Enum:** `customer`, `team_member`, `company_profile` (defined in `shared/schema.ts`)
- **Team Roles Enum:** `admin`, `counselor`
- **Account Status Flow:** `pending_approval` → `active` | `rejected` | `suspended` | `inactive`
- **Registration Patterns:**
  - Student self-registration (`registerStudentComplete`) - immediately active
  - Staff invitation-based registration (`registerStaffWithInvite`) - token-based claiming
  - Company profile creation - admin-managed with optional temporary passwords
- **Authentication Flow:**
  - JWT-based with refresh token rotation (Phase 3 pattern)
  - HttpOnly cookies for refresh tokens (XSS protection)
  - Short-lived access tokens (15 minutes)
  - Long-lived refresh tokens (30 days)
  - Device fingerprinting and IP tracking in `refreshTokens` table
- **RBAC Implementation:**
  - Role checking via `requireAuth`, `requireAdmin` middleware
  - User type and team role combinations for permissions
  - Service-layer authorization checks using `AuthorizationError`

**Key Files:**
- `server/services/domain/auth.service.ts` - Authentication business logic
- `server/services/domain/registration.service.ts` - Registration workflows
- `server/controllers/auth.controller.ts` - HTTP layer, Zod validation
- `server/routes/auth.routes.ts` - Route definitions with CSRF protection
- `shared/role-constants.ts` - Role utilities and constants

**Patterns to Follow:**
- Extend `userTypeEnum` for new partner type OR use `team_member` with new `team_role`
- Follow invitation token pattern for partner onboarding
- Use `BaseService` error handling patterns
- Implement Zod schemas for validation
- Apply CSRF protection to mutation endpoints

---

### 2. Payment & Subscription System Analysis

**Current Implementation:**
- **Payment Gateway:** Razorpay (INR currency)
- **Payment Flow:**
  1. Create Razorpay order (`razorpayService.createOrder`)
  2. Frontend checkout
  3. Webhook receives payment confirmation
  4. Signature verification (`verifyWebhookSignature`)
  5. Payment record created in `payments` table
  6. Subscription activated in `userSubscriptions` table
- **Commission-Ready Architecture:**
  - `payments` table tracks: `userId`, `planId`, `amount`, `paymentType`, `paidAt`
  - `paymentReference` field stores Razorpay payment ID
  - `paymentGateway` field allows multi-gateway support
  - Webhook handling infrastructure exists
- **Subscription Versioning:**
  - Plans have `basePlanId` and `version` for grandfathering
  - Audit trail in `subscriptionPlanChanges` table
  - Price changes create new plan versions
- **Webhook Security:**
  - Signature verification using HMAC SHA256
  - Raw body preservation for signature validation
  - Deduplication service exists

**Key Files:**
- `server/services/domain/payment.service.ts` - Payment settings management
- `server/services/domain/subscription.service.ts` - Plan management, versioning
- `server/services/integration/razorpay.service.ts` - Payment gateway integration
- `server/repositories/payment.repository.ts` - Payment data access
- `shared/schema.ts` - Tables: `payments`, `userSubscriptions`, `subscriptionPlans`

**Commission Calculation Opportunities:**
- Join `payments` → `userSubscriptions` → `students` → `partnerReferrals`
- Track commission percentage in partner profile
- Calculate on `payment.amount` at payment completion
- Store in new `partnerCommissions` table

---

### 3. Student Management Analysis

**Current Implementation:**
- **Student Lifecycle:**
  - User created with `userType: 'customer'`
  - StudentProfile created with `userId` foreign key
  - Status progression: `inquiry` → `converted` → `visa_applied` → `visa_approved` → `departed`
- **Counselor Assignment:**
  - `assignedCounselorId` field in `studentProfiles`
  - Assignment via `assignCounselor(studentId, counselorId)` method
  - Counselors can query assigned students via `findAssignedToCounselor(counselorId)`
- **Comprehensive Tracking:**
  - Academic details (GPA, test scores, education history)
  - Financial info (budget range, funding source)
  - Application preferences (countries, universities, majors)
  - Timeline tracking via `studentTimeline` table
- **Data Richness:**
  - JSONB columns for flexible nested data
  - `additionalInfo.referralSource` field already exists (text field)

**Key Files:**
- `server/repositories/student.repository.ts` - Student data access with joins
- `shared/schema.ts` - `studentProfiles` table (78 lines, comprehensive schema)

**Partner Attribution Strategy:**
- Add `referredByPartnerId` UUID field to `studentProfiles`
- Track referral source in `additionalInfo.referralSource` (already exists)
- Link via `partnerReferrals` junction table for audit trail
- Query students by partner: `findByPartnerId(partnerId)` method

---

### 4. Architecture Patterns Analysis

**Current Implementation:**

**Domain-Driven Design (DDD) Layers:**
```
Client (React) 
  ↓
Controllers (HTTP, Validation) - Thin layer, Zod schemas
  ↓
Services (Business Logic) - Domain services, error handling
  ↓
Repositories (Data Access) - SQL queries, transactions
  ↓
Database (PostgreSQL + Drizzle ORM)
```

**BaseRepository Pattern:**
- Generic CRUD operations: `findById`, `findByIdOptional`, `findAll`, `create`, `update`, `delete`
- Transaction support: `executeInTransaction<TResult>(callback)`
- Helper methods: `findOne`, `findMany`, `count`, `exists`, `paginate`
- Error handling via `handleDatabaseError`
- Type-safe with generics `<T, TInsert>`

**BaseService Pattern:**
- Extends `BaseService` abstract class
- Error handling via `handleError(error, context)` method
- Validation utilities: `validateRequired`, `sanitizeUser`
- Service errors bubble up to controllers

**Error Hierarchy:**
```typescript
ServiceError (base)
  ├── AuthenticationError (401)
  ├── AuthorizationError (403)
  ├── ValidationServiceError (400)
  ├── BusinessRuleViolationError (422)
  ├── ResourceNotFoundError (404)
  ├── DuplicateResourceError (409)
  ├── ServiceUnavailableError (503)
  └── InvalidOperationError (400)
```

**Dependency Injection:**
- Container-based DI in `server/services/container.ts`
- Symbol-based tokens (`TYPES.IUserRepository`)
- Lazy service registration to avoid circular dependencies
- `getService<T>(token)` helper for resolution

**Validation Strategy:**
- Zod schemas in controllers for input validation
- `CommonValidators` for reusable checks (email, UUID, string length)
- `BusinessRuleValidators` for domain rules (payment amounts, dates)
- `InputSanitizer` for XSS prevention (HTML sanitization)

**Key Files:**
- `server/repositories/base.repository.ts` - Generic repository base class
- `server/services/base.service.ts` - Service base class
- `server/services/errors.ts` - Domain error classes
- `server/controllers/base.controller.ts` - Controller base with error mapping
- `server/services/container.ts` - DI container (400 lines)

**Patterns to Apply:**
- Create `PartnerRepository extends BaseRepository<Partner, InsertPartner>`
- Create `PartnerService extends BaseService implements IPartnerService`
- Add TYPES tokens to container for partner services
- Use transaction support for multi-table operations (referral + student creation)

---

### 5. Database Schema Analysis

**Current Schema Patterns:**

**Naming Conventions:**
- Tables: Plural snake_case (`student_profiles`, `user_subscriptions`)
- Columns: Snake_case (`assigned_counselor_id`, `created_at`)
- Enums: Snake_case with suffix `_enum` (`user_type_enum`)
- Foreign keys: `{table_singular}_id` pattern

**Standard Columns:**
- `id: uuid` (primary key, `gen_random_uuid()`)
- `created_at: timestamp` (default `now()`)
- `updated_at: timestamp` (default `now()`)

**Foreign Key Patterns:**
- `references(() => users.id)` with optional `{ onDelete: 'cascade' }`
- Nullable FKs for optional relationships

**Enum Usage:**
- Type-safe enums for constrained values
- Examples: `userTypeEnum`, `subscriptionStatusEnum`, `studentStatusEnum`
- Applied via `.enum()` method in Drizzle

**JSONB Usage:**
- Flexible nested data: `testScores`, `budgetRange`, `metadata`
- Type-safe with `.$type<T>()` for TypeScript inference

**Audit Patterns:**
- `auditLogs` table for system-wide audit trail
- Change tracking with `fieldChanges` JSONB column
- IP address and user agent logging

**Key Tables for Reference:**
- `users` - 62 fields, comprehensive user management
- `studentProfiles` - 78 fields with JSONB columns
- `subscriptionPlans` - Plan versioning with `basePlanId` self-reference
- `userSubscriptions` - Active subscriptions with status tracking
- `payments` - Payment ledger with gateway reference
- `staffInvitations` - Invitation token pattern for onboarding

**Indexing Strategy:**
- Primary keys automatically indexed
- Foreign keys should have indexes
- Unique constraints on email, tokens
- Performance indexes on frequently queried columns

---

## Phase-by-Phase Implementation Plan

### Phase 1: Database Foundation

**Complexity:** Medium  
**Dependencies:** None (foundation layer)  
**Estimated Effort:** 3-4 hours

#### 1.1 Enum Modifications

**File:** `shared/schema.ts` (around line 18-39)

**Option A: Extend User Type Enum (Recommended)**
```typescript
// Add 'partner' to existing enum
export const userTypeEnum = pgEnum("user_type", [
  "customer", 
  "team_member", 
  "company_profile",
  "partner"  // NEW
]);
```

**Option B: Extend Team Role Enum (Alternative)**
```typescript
// Add 'partner' as a team_member role
export const teamRoleEnum = pgEnum("team_role", [
  "admin", 
  "counselor",
  "partner"  // NEW
]);
```

**Recommendation:** Use Option A (`userType: 'partner'`) for clear separation and dedicated partner features.

#### 1.2 Create Partner Profiles Table

**File:** `shared/schema.ts` (insert after `studentProfiles` table, around line 215)

```typescript
export const partnerProfiles = pgTable("partner_profiles", {
  // Primary Key
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Foreign Keys
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  
  // Partner Business Information
  companyName: text("company_name").notNull(),
  businessType: text("business_type"), // 'education_consultant', 'immigration_firm', 'language_school', etc.
  registrationNumber: text("registration_number"), // Business registration number
  taxId: text("tax_id"), // Tax ID for payout compliance
  
  // Contact Information
  contactPerson: text("contact_person").notNull(),
  phone: text("phone").notNull(),
  whatsappNumber: text("whatsapp_number"),
  website: text("website"),
  address: jsonb("address").$type<{
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  }>(),
  
  // Commission Structure
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull().default("10.00"), // Percentage (e.g., 10.00%)
  commissionType: text("commission_type").notNull().default("percentage"), // 'percentage' or 'fixed'
  fixedCommissionAmount: decimal("fixed_commission_amount", { precision: 10, scale: 2 }), // For fixed commission type
  
  // Payout Information
  payoutMethod: text("payout_method").notNull().default("bank_transfer"), // 'bank_transfer', 'paypal', 'check'
  bankDetails: jsonb("bank_details").$type<{
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    branchName?: string;
    swiftCode?: string; // For international transfers
  }>(),
  paypalEmail: text("paypal_email"),
  minimumPayoutAmount: decimal("minimum_payout_amount", { precision: 10, scale: 2 }).default("1000.00"), // Minimum payout threshold
  
  // Performance Metrics
  totalReferrals: integer("total_referrals").default(0),
  totalConversions: integer("total_conversions").default(0),
  totalCommissionEarned: decimal("total_commission_earned", { precision: 12, scale: 2 }).default("0.00"),
  totalCommissionPaid: decimal("total_commission_paid", { precision: 12, scale: 2 }).default("0.00"),
  
  // Status and Settings
  isActive: boolean("is_active").default(true),
  isVerified: boolean("is_verified").default(false), // KYC verification status
  verifiedAt: timestamp("verified_at"),
  verifiedBy: uuid("verified_by").references(() => users.id), // Admin who verified
  
  // Marketing Materials
  logo: text("logo"), // Partner logo URL
  bio: text("bio"), // Partner description/bio
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

#### 1.3 Create Partner Referral Links Table

**File:** `shared/schema.ts` (insert after `partnerProfiles`)

```typescript
export const partnerReferralLinks = pgTable("partner_referral_links", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Foreign Keys
  partnerId: uuid("partner_id").references(() => partnerProfiles.id, { onDelete: 'cascade' }).notNull(),
  
  // Link Details
  linkCode: varchar("link_code", { length: 16 }).notNull().unique(), // Short unique code (e.g., 'PARTNER123ABC')
  linkUrl: text("link_url").notNull(), // Full URL: https://edupath.com/ref/PARTNER123ABC
  
  // Campaign Tracking (Optional)
  campaignName: varchar("campaign_name", { length: 255 }),
  campaignSource: varchar("campaign_source", { length: 100 }), // 'facebook', 'google', 'email', 'website'
  campaignMedium: varchar("campaign_medium", { length: 100 }), // 'social', 'cpc', 'newsletter'
  
  // Link Metadata
  description: text("description"), // Internal note about link purpose
  
  // Performance Tracking
  clickCount: integer("click_count").default(0),
  uniqueClickCount: integer("unique_click_count").default(0),
  conversionCount: integer("conversion_count").default(0),
  lastClickedAt: timestamp("last_clicked_at"),
  
  // Status
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"), // Optional expiration
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

#### 1.4 Create Referral Clicks Tracking Table

**File:** `shared/schema.ts` (insert after `partnerReferralLinks`)

```typescript
export const referralClicks = pgTable("referral_clicks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Foreign Keys
  referralLinkId: uuid("referral_link_id").references(() => partnerReferralLinks.id, { onDelete: 'cascade' }).notNull(),
  partnerId: uuid("partner_id").references(() => partnerProfiles.id, { onDelete: 'cascade' }).notNull(),
  
  // User Attribution (nullable - user may not be logged in at click time)
  userId: uuid("user_id").references(() => users.id, { onDelete: 'set null' }),
  
  // Click Metadata
  ipAddress: varchar("ip_address", { length: 45 }).notNull(), // IPv4 or IPv6
  userAgent: text("user_agent"),
  referer: text("referer"), // HTTP referer header
  
  // Geolocation (optional, can be enriched later)
  country: varchar("country", { length: 2 }), // ISO 3166-1 alpha-2
  city: varchar("city", { length: 100 }),
  
  // Session Tracking
  sessionId: varchar("session_id", { length: 64 }), // Browser session identifier
  fingerprint: varchar("fingerprint", { length: 64 }), // Browser fingerprint hash
  
  // Attribution
  isUnique: boolean("is_unique").default(true), // First click from this fingerprint/IP
  convertedToRegistration: boolean("converted_to_registration").default(false),
  convertedToPayment: boolean("converted_to_payment").default(false),
  convertedAt: timestamp("converted_at"),
  
  // Timestamps
  clickedAt: timestamp("clicked_at").defaultNow(),
});
```

#### 1.5 Create Partner Student Referrals Table

**File:** `shared/schema.ts` (insert after `referralClicks`)

```typescript
export const partnerStudentReferrals = pgTable("partner_student_referrals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Foreign Keys
  partnerId: uuid("partner_id").references(() => partnerProfiles.id, { onDelete: 'cascade' }).notNull(),
  studentId: uuid("student_id").references(() => studentProfiles.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(), // Student's user account
  referralLinkId: uuid("referral_link_id").references(() => partnerReferralLinks.id, { onDelete: 'set null' }), // May be null for manual attributions
  clickId: uuid("click_id").references(() => referralClicks.id, { onDelete: 'set null' }), // Original click event
  
  // Attribution Details
  attributionMethod: varchar("attribution_method", { length: 50 }).notNull(), // 'link_click', 'manual', 'promo_code'
  promoCode: varchar("promo_code", { length: 50 }), // If promo code was used
  
  // Referral Status
  status: varchar("status", { length: 50 }).notNull().default("pending"), // 'pending', 'converted', 'paid', 'rejected'
  statusReason: text("status_reason"), // Reason for status change
  
  // Commission Tracking
  commissionEligible: boolean("commission_eligible").default(true),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }), // Rate at time of referral
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }), // Calculated commission
  commissionStatus: varchar("commission_status", { length: 50 }).default("pending"), // 'pending', 'approved', 'paid', 'rejected'
  commissionPaidAt: timestamp("commission_paid_at"),
  
  // Conversion Tracking
  registeredAt: timestamp("registered_at"),
  convertedAt: timestamp("converted_at"), // When student purchased a plan
  subscriptionId: uuid("subscription_id").references(() => userSubscriptions.id, { onDelete: 'set null' }), // Linked subscription
  paymentId: uuid("payment_id").references(() => payments.id, { onDelete: 'set null' }), // Linked payment
  
  // Admin Notes
  notes: text("notes"),
  approvedBy: uuid("approved_by").references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp("approved_at"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

#### 1.6 Create Partner Commissions Table

**File:** `shared/schema.ts` (insert after `partnerStudentReferrals`)

```typescript
export const partnerCommissions = pgTable("partner_commissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Foreign Keys
  partnerId: uuid("partner_id").references(() => partnerProfiles.id, { onDelete: 'cascade' }).notNull(),
  referralId: uuid("referral_id").references(() => partnerStudentReferrals.id, { onDelete: 'cascade' }).notNull(),
  paymentId: uuid("payment_id").references(() => payments.id, { onDelete: 'cascade' }).notNull(),
  
  // Commission Calculation
  baseAmount: decimal("base_amount", { precision: 10, scale: 2 }).notNull(), // Payment amount
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(), // Rate applied (%)
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(), // Calculated amount
  currency: varchar("currency", { length: 3 }).default("INR").notNull(),
  
  // Status Tracking
  status: varchar("status", { length: 50 }).notNull().default("pending"), // 'pending', 'approved', 'paid', 'rejected', 'disputed'
  statusReason: text("status_reason"),
  
  // Approval Workflow
  approvedBy: uuid("approved_by").references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp("approved_at"),
  rejectedBy: uuid("rejected_by").references(() => users.id, { onDelete: 'set null' }),
  rejectedAt: timestamp("rejected_at"),
  
  // Payout Tracking
  payoutId: uuid("payout_id").references(() => partnerPayouts.id, { onDelete: 'set null' }),
  paidAt: timestamp("paid_at"),
  
  // Metadata
  notes: text("notes"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

#### 1.7 Create Partner Payouts Table

**File:** `shared/schema.ts` (insert after `partnerCommissions`)

```typescript
export const partnerPayouts = pgTable("partner_payouts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Foreign Keys
  partnerId: uuid("partner_id").references(() => partnerProfiles.id, { onDelete: 'cascade' }).notNull(),
  
  // Payout Details
  payoutAmount: decimal("payout_amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("INR").notNull(),
  commissionCount: integer("commission_count").notNull(), // Number of commissions included
  
  // Period
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  
  // Payment Method
  payoutMethod: varchar("payout_method", { length: 50 }).notNull(), // 'bank_transfer', 'paypal', 'check'
  
  // Bank Transfer Details
  bankTransferReference: varchar("bank_transfer_reference", { length: 255 }),
  bankTransferDate: timestamp("bank_transfer_date"),
  
  // PayPal Details
  paypalTransactionId: varchar("paypal_transaction_id", { length: 255 }),
  paypalEmail: varchar("paypal_email", { length: 255 }),
  
  // Status
  status: varchar("status", { length: 50 }).notNull().default("pending"), // 'pending', 'processing', 'completed', 'failed', 'cancelled'
  statusReason: text("status_reason"),
  
  // Processing
  processedBy: uuid("processed_by").references(() => users.id, { onDelete: 'set null' }),
  processedAt: timestamp("processed_at"),
  completedAt: timestamp("completed_at"),
  
  // Metadata
  notes: text("notes"),
  attachments: text("attachments").array(), // URLs to payout receipts/invoices
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

#### 1.8 Modify Student Profiles Table

**File:** `shared/schema.ts` (around line 78-215, modify existing table)

Add referral tracking to `studentProfiles`:

```typescript
// Add after line ~213 (before timestamps):
referredByPartnerId: uuid("referred_by_partner_id").references(() => partnerProfiles.id, { onDelete: 'set null' }),
referralLinkId: uuid("referral_link_id").references(() => partnerReferralLinks.id, { onDelete: 'set null' }),
```

#### 1.9 Create Insert Schemas & Type Exports

**File:** `shared/schema.ts` (end of file, after line 1250)

```typescript
// Partner insert schemas
export const insertPartnerProfileSchema = createInsertSchema(partnerProfiles).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  totalReferrals: true,
  totalConversions: true,
  totalCommissionEarned: true,
  totalCommissionPaid: true,
});
export const insertPartnerReferralLinkSchema = createInsertSchema(partnerReferralLinks).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  clickCount: true,
  uniqueClickCount: true,
  conversionCount: true,
});
export const insertReferralClickSchema = createInsertSchema(referralClicks).omit({ 
  id: true, 
  clickedAt: true 
});
export const insertPartnerStudentReferralSchema = createInsertSchema(partnerStudentReferrals).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertPartnerCommissionSchema = createInsertSchema(partnerCommissions).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export const insertPartnerPayoutSchema = createInsertSchema(partnerPayouts).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// Partner type exports
export type PartnerProfile = typeof partnerProfiles.$inferSelect;
export type InsertPartnerProfile = z.infer<typeof insertPartnerProfileSchema>;
export type PartnerReferralLink = typeof partnerReferralLinks.$inferSelect;
export type InsertPartnerReferralLink = z.infer<typeof insertPartnerReferralLinkSchema>;
export type ReferralClick = typeof referralClicks.$inferSelect;
export type InsertReferralClick = z.infer<typeof insertReferralClickSchema>;
export type PartnerStudentReferral = typeof partnerStudentReferrals.$inferSelect;
export type InsertPartnerStudentReferral = z.infer<typeof insertPartnerStudentReferralSchema>;
export type PartnerCommission = typeof partnerCommissions.$inferSelect;
export type InsertPartnerCommission = z.infer<typeof insertPartnerCommissionSchema>;
export type PartnerPayout = typeof partnerPayouts.$inferSelect;
export type InsertPartnerPayout = z.infer<typeof insertPartnerPayoutSchema>;
```

#### 1.10 Create Database Migration

**File:** `migrations/XXXX_create_partner_system.sql` (new file)

```sql
-- Add 'partner' to user_type enum
ALTER TYPE user_type ADD VALUE IF NOT EXISTS 'partner';

-- Create partner_profiles table
CREATE TABLE IF NOT EXISTS partner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  business_type TEXT,
  registration_number TEXT,
  tax_id TEXT,
  contact_person TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp_number TEXT,
  website TEXT,
  address JSONB,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  commission_type TEXT NOT NULL DEFAULT 'percentage',
  fixed_commission_amount DECIMAL(10,2),
  payout_method TEXT NOT NULL DEFAULT 'bank_transfer',
  bank_details JSONB,
  paypal_email TEXT,
  minimum_payout_amount DECIMAL(10,2) DEFAULT 1000.00,
  total_referrals INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_commission_earned DECIMAL(12,2) DEFAULT 0.00,
  total_commission_paid DECIMAL(12,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES users(id),
  logo TEXT,
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create partner_referral_links table
CREATE TABLE IF NOT EXISTS partner_referral_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partner_profiles(id) ON DELETE CASCADE,
  link_code VARCHAR(16) NOT NULL UNIQUE,
  link_url TEXT NOT NULL,
  campaign_name VARCHAR(255),
  campaign_source VARCHAR(100),
  campaign_medium VARCHAR(100),
  description TEXT,
  click_count INTEGER DEFAULT 0,
  unique_click_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  last_clicked_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create referral_clicks table
CREATE TABLE IF NOT EXISTS referral_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_link_id UUID NOT NULL REFERENCES partner_referral_links(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partner_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  referer TEXT,
  country VARCHAR(2),
  city VARCHAR(100),
  session_id VARCHAR(64),
  fingerprint VARCHAR(64),
  is_unique BOOLEAN DEFAULT TRUE,
  converted_to_registration BOOLEAN DEFAULT FALSE,
  converted_to_payment BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMP,
  clicked_at TIMESTAMP DEFAULT NOW()
);

-- Create partner_student_referrals table
CREATE TABLE IF NOT EXISTS partner_student_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partner_profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_link_id UUID REFERENCES partner_referral_links(id) ON DELETE SET NULL,
  click_id UUID REFERENCES referral_clicks(id) ON DELETE SET NULL,
  attribution_method VARCHAR(50) NOT NULL,
  promo_code VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  status_reason TEXT,
  commission_eligible BOOLEAN DEFAULT TRUE,
  commission_rate DECIMAL(5,2),
  commission_amount DECIMAL(10,2),
  commission_status VARCHAR(50) DEFAULT 'pending',
  commission_paid_at TIMESTAMP,
  registered_at TIMESTAMP,
  converted_at TIMESTAMP,
  subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  notes TEXT,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create partner_commissions table
CREATE TABLE IF NOT EXISTS partner_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partner_profiles(id) ON DELETE CASCADE,
  referral_id UUID NOT NULL REFERENCES partner_student_referrals(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  base_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR' NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  status_reason TEXT,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejected_at TIMESTAMP,
  payout_id UUID,
  paid_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create partner_payouts table
CREATE TABLE IF NOT EXISTS partner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partner_profiles(id) ON DELETE CASCADE,
  payout_amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR' NOT NULL,
  commission_count INTEGER NOT NULL,
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  payout_method VARCHAR(50) NOT NULL,
  bank_transfer_reference VARCHAR(255),
  bank_transfer_date TIMESTAMP,
  paypal_transaction_id VARCHAR(255),
  paypal_email VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  status_reason TEXT,
  processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,
  notes TEXT,
  attachments TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key to partner_commissions (circular dependency resolved)
ALTER TABLE partner_commissions 
ADD CONSTRAINT partner_commissions_payout_id_fkey 
FOREIGN KEY (payout_id) REFERENCES partner_payouts(id) ON DELETE SET NULL;

-- Add referral tracking to student_profiles
ALTER TABLE student_profiles 
ADD COLUMN IF NOT EXISTS referred_by_partner_id UUID REFERENCES partner_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS referral_link_id UUID REFERENCES partner_referral_links(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_partner_profiles_user_id ON partner_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_profiles_is_active ON partner_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_partner_referral_links_partner_id ON partner_referral_links(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_referral_links_link_code ON partner_referral_links(link_code);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_referral_link_id ON referral_clicks(referral_link_id);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_partner_id ON referral_clicks(partner_id);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_user_id ON referral_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_fingerprint ON referral_clicks(fingerprint);
CREATE INDEX IF NOT EXISTS idx_partner_student_referrals_partner_id ON partner_student_referrals(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_student_referrals_student_id ON partner_student_referrals(student_id);
CREATE INDEX IF NOT EXISTS idx_partner_student_referrals_status ON partner_student_referrals(status);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_partner_id ON partner_commissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_referral_id ON partner_commissions(referral_id);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_status ON partner_commissions(status);
CREATE INDEX IF NOT EXISTS idx_partner_payouts_partner_id ON partner_payouts(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_payouts_status ON partner_payouts(status);
CREATE INDEX IF NOT EXISTS idx_student_profiles_referred_by_partner_id ON student_profiles(referred_by_partner_id);
```

**Migration Execution:**
```bash
# Generate migration
npm run drizzle-kit generate

# Apply migration to development
npm run db:migrate

# Verify migration
npm run db:studio
```

---

### Phase 2: Shared Types & Constants

**Complexity:** Low  
**Dependencies:** Phase 1 (Database)  
**Estimated Effort:** 1-2 hours

#### 2.1 Partner Role Constants

**File:** `shared/partner-constants.ts` (new file)

```typescript
/**
 * Partner System Constants
 * Single source of truth for partner-related enums and constants
 */

// Attribution Methods
export const ATTRIBUTION_METHODS = ['link_click', 'manual', 'promo_code'] as const;
export type AttributionMethod = typeof ATTRIBUTION_METHODS[number];

// Referral Status
export const REFERRAL_STATUSES = ['pending', 'converted', 'paid', 'rejected'] as const;
export type ReferralStatus = typeof REFERRAL_STATUSES[number];

// Commission Status
export const COMMISSION_STATUSES = ['pending', 'approved', 'paid', 'rejected', 'disputed'] as const;
export type CommissionStatus = typeof COMMISSION_STATUSES[number];

// Payout Status
export const PAYOUT_STATUSES = ['pending', 'processing', 'completed', 'failed', 'cancelled'] as const;
export type PayoutStatus = typeof PAYOUT_STATUSES[number];

// Payout Methods
export const PAYOUT_METHODS = ['bank_transfer', 'paypal', 'check'] as const;
export type PayoutMethod = typeof PAYOUT_METHODS[number];

// Commission Types
export const COMMISSION_TYPES = ['percentage', 'fixed'] as const;
export type CommissionType = typeof COMMISSION_TYPES[number];

// Business Types
export const BUSINESS_TYPES = [
  'education_consultant',
  'immigration_firm',
  'language_school',
  'travel_agency',
  'career_counselor',
  'individual_consultant',
  'other'
] as const;
export type BusinessType = typeof BUSINESS_TYPES[number];

// Default Values
export const DEFAULT_COMMISSION_RATE = 10.00; // 10%
export const DEFAULT_MINIMUM_PAYOUT = 1000.00; // INR 1000
export const LINK_CODE_LENGTH = 8; // Characters in referral code

// Validation Helpers
export const isValidAttributionMethod = (value: string): value is AttributionMethod => {
  return ATTRIBUTION_METHODS.includes(value as AttributionMethod);
};

export const isValidReferralStatus = (value: string): value is ReferralStatus => {
  return REFERRAL_STATUSES.includes(value as ReferralStatus);
};

export const isValidCommissionStatus = (value: string): value is CommissionStatus => {
  return COMMISSION_STATUSES.includes(value as CommissionStatus);
};

export const isValidPayoutStatus = (value: string): value is PayoutStatus => {
  return PAYOUT_STATUSES.includes(value as PayoutStatus);
};

export const isValidPayoutMethod = (value: string): value is PayoutMethod => {
  return PAYOUT_METHODS.includes(value as PayoutMethod);
};

// Authorization Helpers
export const isPartner = (userType: string): boolean => {
  return userType === 'partner';
};

export const canAccessPartnerDashboard = (userType: string): boolean => {
  return userType === 'partner';
};

export const canManagePartners = (userType: string, teamRole: string | null): boolean => {
  return userType === 'team_member' && teamRole === 'admin';
};
```

#### 2.2 Partner API Types

**File:** `shared/types/partner-types.ts` (new file)

```typescript
/**
 * Partner System API Types
 * Type definitions for API requests and responses
 */

import type { 
  PartnerProfile, 
  PartnerReferralLink, 
  ReferralClick,
  PartnerStudentReferral,
  PartnerCommission,
  PartnerPayout 
} from '../schema';

// Partner Dashboard Analytics
export interface PartnerDashboardStats {
  totalReferrals: number;
  totalConversions: number;
  conversionRate: number; // percentage
  totalClicks: number;
  uniqueClicks: number;
  clickToRegistrationRate: number; // percentage
  totalCommissionEarned: number;
  totalCommissionPaid: number;
  pendingCommission: number;
  currentMonthReferrals: number;
  currentMonthConversions: number;
  activeLinks: number;
}

// Partner with User Details
export interface PartnerWithUser extends PartnerProfile {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    accountStatus: string;
    createdAt: Date;
  };
}

// Referral Link with Performance
export interface ReferralLinkWithStats extends PartnerReferralLink {
  clickCount: number;
  uniqueClickCount: number;
  conversionCount: number;
  conversionRate: number; // percentage
  lastClickedAt: Date | null;
}

// Referral with Student Details
export interface ReferralWithStudentDetails extends PartnerStudentReferral {
  student: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
    status: string;
    destinationCountry: string | null;
  };
  subscription: {
    id: string;
    planName: string;
    amount: number;
    status: string;
  } | null;
  payment: {
    id: string;
    amount: number;
    paidAt: Date;
  } | null;
}

// Commission with Details
export interface CommissionWithDetails extends PartnerCommission {
  referral: {
    id: string;
    studentName: string;
    status: string;
  };
  payment: {
    id: string;
    amount: number;
    paidAt: Date;
  };
  payout: {
    id: string;
    payoutAmount: number;
    status: string;
    completedAt: Date | null;
  } | null;
}

// Payout with Commission List
export interface PayoutWithCommissions extends PartnerPayout {
  commissions: {
    id: string;
    commissionAmount: number;
    studentName: string;
    createdAt: Date;
  }[];
}

// API Request Types
export interface CreatePartnerRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  businessType?: string;
  commissionRate?: number;
}

export interface UpdatePartnerProfileRequest {
  companyName?: string;
  contactPerson?: string;
  phone?: string;
  whatsappNumber?: string;
  website?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  bankDetails?: {
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    branchName?: string;
  };
  paypalEmail?: string;
  bio?: string;
}

export interface CreateReferralLinkRequest {
  campaignName?: string;
  campaignSource?: string;
  campaignMedium?: string;
  description?: string;
  expiresAt?: Date;
}

export interface RecordReferralClickRequest {
  linkCode: string;
  ipAddress: string;
  userAgent: string;
  referer?: string;
  sessionId: string;
  fingerprint: string;
}

export interface CreateManualReferralRequest {
  studentId: string;
  attributionMethod: 'manual' | 'promo_code';
  promoCode?: string;
  notes?: string;
}

export interface ApproveCommissionRequest {
  commissionIds: string[];
  notes?: string;
}

export interface CreatePayoutRequest {
  partnerId: string;
  commissionIds: string[];
  payoutMethod: 'bank_transfer' | 'paypal' | 'check';
  notes?: string;
}

// API Response Types
export interface PartnerRegistrationResponse {
  message: string;
  partnerId: string;
  userId: string;
  referralLink: {
    linkCode: string;
    linkUrl: string;
  };
}

export interface ReferralLinkCreatedResponse {
  link: PartnerReferralLink;
  fullUrl: string;
}

export interface CommissionCalculationResult {
  baseAmount: number;
  commissionRate: number;
  commissionAmount: number;
  currency: string;
}
```

#### 2.3 Update Role Constants

**File:** `shared/role-constants.ts` (modify existing file)

Add partner type check:

```typescript
// Add after existing constants (around line 12)
export const isPartner = (userType: UserType): boolean => {
  return userType === 'partner';
};

export const canManagePartners = (userType: UserType, teamRole: TeamRole | null): boolean => {
  return userType === 'team_member' && teamRole === 'admin';
};
```

---

### Phase 3: Repository Layer

**Complexity:** Medium-High  
**Dependencies:** Phase 1 (Database), Phase 2 (Types)  
**Estimated Effort:** 6-8 hours

#### 3.1 Create Partner Profile Repository

**File:** `server/repositories/partner-profile.repository.ts` (new file)

```typescript
import { BaseRepository } from './base.repository';
import { 
  PartnerProfile, 
  InsertPartnerProfile, 
  partnerProfiles,
  users
} from '@shared/schema';
import { db } from '../db';
import { eq, desc, sql } from 'drizzle-orm';
import { handleDatabaseError } from './errors';
import { PartnerWithUser } from '@shared/types/partner-types';

export interface IPartnerProfileRepository {
  findById(id: string): Promise<PartnerProfile>;
  findByIdOptional(id: string): Promise<PartnerProfile | undefined>;
  findByUserId(userId: string): Promise<PartnerProfile | undefined>;
  findAll(): Promise<PartnerProfile[]>;
  findAllWithUserDetails(): Promise<PartnerWithUser[]>;
  findActive(): Promise<PartnerProfile[]>;
  findVerified(): Promise<PartnerProfile[]>;
  create(data: InsertPartnerProfile): Promise<PartnerProfile>;
  update(id: string, data: Partial<PartnerProfile>): Promise<PartnerProfile>;
  delete(id: string): Promise<boolean>;
  incrementReferralCount(partnerId: string): Promise<void>;
  incrementConversionCount(partnerId: string): Promise<void>;
  updateCommissionEarned(partnerId: string, amount: number): Promise<void>;
  updateCommissionPaid(partnerId: string, amount: number): Promise<void>;
}

export class PartnerProfileRepository 
  extends BaseRepository<PartnerProfile, InsertPartnerProfile> 
  implements IPartnerProfileRepository 
{
  constructor() {
    super(partnerProfiles, 'id');
  }

  async findByUserId(userId: string): Promise<PartnerProfile | undefined> {
    try {
      const results = await db
        .select()
        .from(partnerProfiles)
        .where(eq(partnerProfiles.userId, userId))
        .limit(1);
      return results[0];
    } catch (error) {
      handleDatabaseError(error, 'PartnerProfileRepository.findByUserId');
    }
  }

  async findAllWithUserDetails(): Promise<PartnerWithUser[]> {
    try {
      const results = await db
        .select({
          // Partner profile fields
          id: partnerProfiles.id,
          userId: partnerProfiles.userId,
          companyName: partnerProfiles.companyName,
          businessType: partnerProfiles.businessType,
          contactPerson: partnerProfiles.contactPerson,
          phone: partnerProfiles.phone,
          whatsappNumber: partnerProfiles.whatsappNumber,
          website: partnerProfiles.website,
          commissionRate: partnerProfiles.commissionRate,
          commissionType: partnerProfiles.commissionType,
          totalReferrals: partnerProfiles.totalReferrals,
          totalConversions: partnerProfiles.totalConversions,
          totalCommissionEarned: partnerProfiles.totalCommissionEarned,
          totalCommissionPaid: partnerProfiles.totalCommissionPaid,
          isActive: partnerProfiles.isActive,
          isVerified: partnerProfiles.isVerified,
          verifiedAt: partnerProfiles.verifiedAt,
          createdAt: partnerProfiles.createdAt,
          // User fields
          userEmail: users.email,
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userAccountStatus: users.accountStatus,
          userCreatedAt: users.createdAt,
        })
        .from(partnerProfiles)
        .leftJoin(users, eq(partnerProfiles.userId, users.id))
        .orderBy(desc(partnerProfiles.createdAt));

      return results.map(row => ({
        ...row,
        user: {
          id: row.userId,
          email: row.userEmail,
          firstName: row.userFirstName,
          lastName: row.userLastName,
          accountStatus: row.userAccountStatus || 'pending_approval',
          createdAt: row.userCreatedAt || new Date(),
        },
        // Remove flattened user fields
        userEmail: undefined,
        userFirstName: undefined,
        userLastName: undefined,
        userAccountStatus: undefined,
        userCreatedAt: undefined,
      })) as PartnerWithUser[];
    } catch (error) {
      handleDatabaseError(error, 'PartnerProfileRepository.findAllWithUserDetails');
    }
  }

  async findActive(): Promise<PartnerProfile[]> {
    try {
      return await db
        .select()
        .from(partnerProfiles)
        .where(eq(partnerProfiles.isActive, true))
        .orderBy(desc(partnerProfiles.createdAt)) as PartnerProfile[];
    } catch (error) {
      handleDatabaseError(error, 'PartnerProfileRepository.findActive');
    }
  }

  async findVerified(): Promise<PartnerProfile[]> {
    try {
      return await db
        .select()
        .from(partnerProfiles)
        .where(eq(partnerProfiles.isVerified, true))
        .orderBy(desc(partnerProfiles.createdAt)) as PartnerProfile[];
    } catch (error) {
      handleDatabaseError(error, 'PartnerProfileRepository.findVerified');
    }
  }

  async incrementReferralCount(partnerId: string): Promise<void> {
    try {
      await db
        .update(partnerProfiles)
        .set({ 
          totalReferrals: sql`${partnerProfiles.totalReferrals} + 1`,
          updatedAt: new Date()
        })
        .where(eq(partnerProfiles.id, partnerId));
    } catch (error) {
      handleDatabaseError(error, 'PartnerProfileRepository.incrementReferralCount');
    }
  }

  async incrementConversionCount(partnerId: string): Promise<void> {
    try {
      await db
        .update(partnerProfiles)
        .set({ 
          totalConversions: sql`${partnerProfiles.totalConversions} + 1`,
          updatedAt: new Date()
        })
        .where(eq(partnerProfiles.id, partnerId));
    } catch (error) {
      handleDatabaseError(error, 'PartnerProfileRepository.incrementConversionCount');
    }
  }

  async updateCommissionEarned(partnerId: string, amount: number): Promise<void> {
    try {
      await db
        .update(partnerProfiles)
        .set({ 
          totalCommissionEarned: sql`${partnerProfiles.totalCommissionEarned} + ${amount}`,
          updatedAt: new Date()
        })
        .where(eq(partnerProfiles.id, partnerId));
    } catch (error) {
      handleDatabaseError(error, 'PartnerProfileRepository.updateCommissionEarned');
    }
  }

  async updateCommissionPaid(partnerId: string, amount: number): Promise<void> {
    try {
      await db
        .update(partnerProfiles)
        .set({ 
          totalCommissionPaid: sql`${partnerProfiles.totalCommissionPaid} + ${amount}`,
          updatedAt: new Date()
        })
        .where(eq(partnerProfiles.id, partnerId));
    } catch (error) {
      handleDatabaseError(error, 'PartnerProfileRepository.updateCommissionPaid');
    }
  }
}

export const partnerProfileRepository = new PartnerProfileRepository();
```

#### 3.2 Create Partner Referral Links Repository

**File:** `server/repositories/partner-referral-link.repository.ts` (new file)

```typescript
import { BaseRepository } from './base.repository';
import { 
  PartnerReferralLink, 
  InsertPartnerReferralLink, 
  partnerReferralLinks 
} from '@shared/schema';
import { db } from '../db';
import { eq, and, sql, desc } from 'drizzle-orm';
import { handleDatabaseError } from './errors';

export interface IPartnerReferralLinkRepository {
  findById(id: string): Promise<PartnerReferralLink>;
  findByIdOptional(id: string): Promise<PartnerReferralLink | undefined>;
  findByLinkCode(linkCode: string): Promise<PartnerReferralLink | undefined>;
  findByPartnerId(partnerId: string): Promise<PartnerReferralLink[]>;
  findActiveByPartnerId(partnerId: string): Promise<PartnerReferralLink[]>;
  create(data: InsertPartnerReferralLink): Promise<PartnerReferralLink>;
  update(id: string, data: Partial<PartnerReferralLink>): Promise<PartnerReferralLink>;
  delete(id: string): Promise<boolean>;
  incrementClickCount(linkId: string, isUnique: boolean): Promise<void>;
  incrementConversionCount(linkId: string): Promise<void>;
  updateLastClickedAt(linkId: string): Promise<void>;
  generateUniqueLinkCode(length: number): Promise<string>;
}

export class PartnerReferralLinkRepository 
  extends BaseRepository<PartnerReferralLink, InsertPartnerReferralLink> 
  implements IPartnerReferralLinkRepository 
{
  constructor() {
    super(partnerReferralLinks, 'id');
  }

  async findByLinkCode(linkCode: string): Promise<PartnerReferralLink | undefined> {
    try {
      const results = await db
        .select()
        .from(partnerReferralLinks)
        .where(eq(partnerReferralLinks.linkCode, linkCode))
        .limit(1);
      return results[0];
    } catch (error) {
      handleDatabaseError(error, 'PartnerReferralLinkRepository.findByLinkCode');
    }
  }

  async findByPartnerId(partnerId: string): Promise<PartnerReferralLink[]> {
    try {
      return await db
        .select()
        .from(partnerReferralLinks)
        .where(eq(partnerReferralLinks.partnerId, partnerId))
        .orderBy(desc(partnerReferralLinks.createdAt)) as PartnerReferralLink[];
    } catch (error) {
      handleDatabaseError(error, 'PartnerReferralLinkRepository.findByPartnerId');
    }
  }

  async findActiveByPartnerId(partnerId: string): Promise<PartnerReferralLink[]> {
    try {
      return await db
        .select()
        .from(partnerReferralLinks)
        .where(
          and(
            eq(partnerReferralLinks.partnerId, partnerId),
            eq(partnerReferralLinks.isActive, true)
          )
        )
        .orderBy(desc(partnerReferralLinks.createdAt)) as PartnerReferralLink[];
    } catch (error) {
      handleDatabaseError(error, 'PartnerReferralLinkRepository.findActiveByPartnerId');
    }
  }

  async incrementClickCount(linkId: string, isUnique: boolean): Promise<void> {
    try {
      const updateData: any = {
        clickCount: sql`${partnerReferralLinks.clickCount} + 1`,
        updatedAt: new Date()
      };

      if (isUnique) {
        updateData.uniqueClickCount = sql`${partnerReferralLinks.uniqueClickCount} + 1`;
      }

      await db
        .update(partnerReferralLinks)
        .set(updateData)
        .where(eq(partnerReferralLinks.id, linkId));
    } catch (error) {
      handleDatabaseError(error, 'PartnerReferralLinkRepository.incrementClickCount');
    }
  }

  async incrementConversionCount(linkId: string): Promise<void> {
    try {
      await db
        .update(partnerReferralLinks)
        .set({ 
          conversionCount: sql`${partnerReferralLinks.conversionCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(partnerReferralLinks.id, linkId));
    } catch (error) {
      handleDatabaseError(error, 'PartnerReferralLinkRepository.incrementConversionCount');
    }
  }

  async updateLastClickedAt(linkId: string): Promise<void> {
    try {
      await db
        .update(partnerReferralLinks)
        .set({ 
          lastClickedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(partnerReferralLinks.id, linkId));
    } catch (error) {
      handleDatabaseError(error, 'PartnerReferralLinkRepository.updateLastClickedAt');
    }
  }

  async generateUniqueLinkCode(length: number = 8): Promise<string> {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars (0, O, 1, I)
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      let code = '';
      for (let i = 0; i < length; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      // Check if code already exists
      const existing = await this.findByLinkCode(code);
      if (!existing) {
        return code;
      }

      attempts++;
    }

    throw new Error('Failed to generate unique link code after multiple attempts');
  }
}

export const partnerReferralLinkRepository = new PartnerReferralLinkRepository();
```

*(Continue with remaining repositories in next section due to length...)*

#### 3.3 Additional Repositories Summary

Create the following repositories following the same pattern as above:

1. **`server/repositories/referral-click.repository.ts`**
   - Methods: `findById`, `findByReferralLinkId`, `findByFingerprint`, `create`, `markAsConverted`

2. **`server/repositories/partner-student-referral.repository.ts`**
   - Methods: `findById`, `findByPartnerId`, `findByStudentId`, `create`, `updateStatus`, `updateCommission`

3. **`server/repositories/partner-commission.repository.ts`**
   - Methods: `findById`, `findByPartnerId`, `findPendingByPartnerId`, `create`, `approve`, `reject`, `markAsPaid`

4. **`server/repositories/partner-payout.repository.ts`**
   - Methods: `findById`, `findByPartnerId`, `create`, `updateStatus`, `complete`

#### 3.4 Update Repository Index

**File:** `server/repositories/index.ts` (modify existing)

Add exports for new repositories:

```typescript
// Partner repositories
export { PartnerProfileRepository, type IPartnerProfileRepository, partnerProfileRepository } from './partner-profile.repository';
export { PartnerReferralLinkRepository, type IPartnerReferralLinkRepository, partnerReferralLinkRepository } from './partner-referral-link.repository';
export { ReferralClickRepository, type IReferralClickRepository, referralClickRepository } from './referral-click.repository';
export { PartnerStudentReferralRepository, type IPartnerStudentReferralRepository, partnerStudentReferralRepository } from './partner-student-referral.repository';
export { PartnerCommissionRepository, type IPartnerCommissionRepository, partnerCommissionRepository } from './partner-commission.repository';
export { PartnerPayoutRepository, type IPartnerPayoutRepository, partnerPayoutRepository } from './partner-payout.repository';
```

---

### Phase 4: Service Layer

**Complexity:** High  
**Dependencies:** Phase 3 (Repositories)  
**Estimated Effort:** 10-12 hours

#### 4.1 Create Partner Service

**File:** `server/services/domain/partner.service.ts` (new file)

This service handles partner profile management, registration, and verification.

**Key Methods:**
- `registerPartner(data: CreatePartnerRequest): Promise<PartnerRegistrationResponse>`
- `getPartnerProfile(partnerId: string): Promise<PartnerProfile>`
- `getPartnerByUserId(userId: string): Promise<PartnerProfile>`
- `updatePartnerProfile(partnerId: string, updates: UpdatePartnerProfileRequest): Promise<PartnerProfile>`
- `verifyPartner(partnerId: string, adminId: string): Promise<PartnerProfile>`
- `deactivatePartner(partnerId: string, adminId: string, reason: string): Promise<PartnerProfile>`
- `getAllPartners(): Promise<PartnerWithUser[]>`
- `getDashboardStats(partnerId: string): Promise<PartnerDashboardStats>`

**Pattern:** Follow `server/services/domain/registration.service.ts` pattern

#### 4.2 Create Referral Link Service

**File:** `server/services/domain/referral-link.service.ts` (new file)

This service handles referral link generation and management.

**Key Methods:**
- `createReferralLink(partnerId: string, data: CreateReferralLinkRequest): Promise<ReferralLinkCreatedResponse>`
- `getReferralLinks(partnerId: string): Promise<ReferralLinkWithStats[]>`
- `updateReferralLink(linkId: string, updates: Partial<PartnerReferralLink>): Promise<PartnerReferralLink>`
- `deactivateReferralLink(linkId: string): Promise<void>`
- `generateDefaultReferralLink(partnerId: string): Promise<PartnerReferralLink>`

**Integration:** Uses `partnerReferralLinkRepository.generateUniqueLinkCode()`

#### 4.3 Create Referral Tracking Service

**File:** `server/services/domain/referral-tracking.service.ts` (new file)

This service handles click tracking, attribution, and conversion tracking.

**Key Methods:**
- `recordClick(data: RecordReferralClickRequest): Promise<ReferralClick>`
- `attributeStudentToPartner(studentId: string, partnerId: string, clickId?: string): Promise<PartnerStudentReferral>`
- `trackConversion(studentId: string, subscriptionId: string, paymentId: string): Promise<void>`
- `isUniqueClick(fingerprint: string, linkId: string): Promise<boolean>`
- `getFingerprintFromRequest(ipAddress: string, userAgent: string): string`

**Business Logic:**
- Fingerprinting algorithm (hash IP + User-Agent)
- Click attribution window (e.g., 30 days)
- Duplicate detection logic
- Conversion tracking on payment webhook

**Pattern:** Follow `server/services/domain/payment.service.ts` for payment integration

#### 4.4 Create Commission Service

**File:** `server/services/domain/commission.service.ts` (new file)

This service handles commission calculation, approval, and payout.

**Key Methods:**
- `calculateCommission(partnerId: string, paymentAmount: number): Promise<CommissionCalculationResult>`
- `createCommission(referralId: string, paymentId: string): Promise<PartnerCommission>`
- `approveCommissions(commissionIds: string[], adminId: string): Promise<PartnerCommission[]>`
- `rejectCommissions(commissionIds: string[], adminId: string, reason: string): Promise<PartnerCommission[]>`
- `getPendingCommissions(partnerId: string): Promise<CommissionWithDetails[]>`
- `getCommissionHistory(partnerId: string): Promise<CommissionWithDetails[]>`

**Business Logic:**
- Commission rate lookup from partner profile
- Percentage vs fixed commission calculation
- Approval workflow
- Integration with payout system

**Integration:** Called from Razorpay webhook handler after payment confirmation

#### 4.5 Create Payout Service

**File:** `server/services/domain/payout.service.ts` (new file)

This service handles payout generation and processing.

**Key Methods:**
- `createPayout(partnerId: string, commissionIds: string[], payoutMethod: PayoutMethod): Promise<PartnerPayout>`
- `processPayoutBankTransfer(payoutId: string, referenceNumber: string): Promise<PartnerPayout>`
- `processPayoutPayPal(payoutId: string, transactionId: string): Promise<PartnerPayout>`
- `completePayout(payoutId: string, adminId: string): Promise<PartnerPayout>`
- `cancelPayout(payoutId: string, adminId: string, reason: string): Promise<PartnerPayout>`
- `getPayoutHistory(partnerId: string): Promise<PayoutWithCommissions[]>`
- `generatePayoutReport(payoutId: string): Promise<Buffer>` // PDF generation

**Business Logic:**
- Minimum payout threshold check
- Commission aggregation
- Payout period calculation
- Bank transfer / PayPal integration

#### 4.6 Update Service Container

**File:** `server/services/container.ts` (modify existing)

Add type tokens (around line 170):

```typescript
// Partner Service Tokens
IPartnerService: Symbol.for('IPartnerService'),
IReferralLinkService: Symbol.for('IReferralLinkService'),
IReferralTrackingService: Symbol.for('IReferralTrackingService'),
ICommissionService: Symbol.for('ICommissionService'),
IPayoutService: Symbol.for('IPayoutService'),
```

Register repositories in constructor (around line 210):

```typescript
this.bindings.set(TYPES.IPartnerProfileRepository, partnerProfileRepository);
this.bindings.set(TYPES.IPartnerReferralLinkRepository, partnerReferralLinkRepository);
this.bindings.set(TYPES.IReferralClickRepository, referralClickRepository);
this.bindings.set(TYPES.IPartnerStudentReferralRepository, partnerStudentReferralRepository);
this.bindings.set(TYPES.IPartnerCommissionRepository, partnerCommissionRepository);
this.bindings.set(TYPES.IPartnerPayoutRepository, partnerPayoutRepository);
```

Register services in `registerServices()` method (around line 375):

```typescript
const { partnerService } = await import('./domain/partner.service');
const { referralLinkService } = await import('./domain/referral-link.service');
const { referralTrackingService } = await import('./domain/referral-tracking.service');
const { commissionService } = await import('./domain/commission.service');
const { payoutService } = await import('./domain/payout.service');

this.bindings.set(TYPES.IPartnerService, partnerService);
this.bindings.set(TYPES.IReferralLinkService, referralLinkService);
this.bindings.set(TYPES.IReferralTrackingService, referralTrackingService);
this.bindings.set(TYPES.ICommissionService, commissionService);
this.bindings.set(TYPES.IPayoutService, payoutService);
```

---

### Phase 5: Controller & Routes

**Complexity:** Medium  
**Dependencies:** Phase 4 (Services)  
**Estimated Effort:** 6-8 hours

#### 5.1 Create Partner Controller

**File:** `server/controllers/partner.controller.ts` (new file)

Thin HTTP layer following the pattern from `auth.controller.ts`.

**Key Endpoints:**
- `GET /api/partners/me` - Get current partner profile
- `PUT /api/partners/me` - Update partner profile
- `GET /api/partners/dashboard` - Get dashboard stats
- `GET /api/partners/referrals` - Get referrals list
- `GET /api/partners/commissions` - Get commissions
- `GET /api/partners/payouts` - Get payouts history

**Pattern:**
```typescript
import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { getService, TYPES } from '../services/container';
import { IPartnerService } from '../services/domain/partner.service';
import { AuthenticatedRequest } from '../types/auth';
import { z } from 'zod';

const updatePartnerProfileSchema = z.object({
  companyName: z.string().min(1).max(255).optional(),
  contactPerson: z.string().min(1).max(255).optional(),
  phone: z.string().min(1).max(50).optional(),
  // ... other fields
});

export class PartnerController extends BaseController {
  async getMe(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const partnerService = getService<IPartnerService>(TYPES.IPartnerService);
      const partner = await partnerService.getPartnerByUserId(userId);
      return this.sendSuccess(res, partner);
    } catch (error) {
      return this.handleError(res, error, 'PartnerController.getMe');
    }
  }

  async updateMe(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const validatedData = updatePartnerProfileSchema.parse(req.body);
      
      const partnerService = getService<IPartnerService>(TYPES.IPartnerService);
      const partner = await partnerService.getPartnerByUserId(userId);
      const updated = await partnerService.updatePartnerProfile(partner.id, validatedData);
      
      return this.sendSuccess(res, updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'PartnerController.updateMe');
    }
  }

  // ... other methods
}

export const partnerController = new PartnerController();
```

#### 5.2 Create Referral Link Controller

**File:** `server/controllers/referral-link.controller.ts` (new file)

**Key Endpoints:**
- `POST /api/referral-links` - Create new referral link
- `GET /api/referral-links` - List partner's referral links
- `GET /api/referral-links/:id` - Get link details
- `PUT /api/referral-links/:id` - Update link
- `DELETE /api/referral-links/:id` - Deactivate link

#### 5.3 Create Admin Partner Controller

**File:** `server/controllers/admin-partner.controller.ts` (new file)

Admin-only endpoints following `admin.controller.ts` pattern.

**Key Endpoints:**
- `GET /api/admin/partners` - List all partners
- `GET /api/admin/partners/:id` - Get partner details
- `PUT /api/admin/partners/:id/verify` - Verify partner KYC
- `PUT /api/admin/partners/:id/commission-rate` - Update commission rate
- `GET /api/admin/commissions/pending` - List pending commissions
- `POST /api/admin/commissions/approve` - Bulk approve commissions
- `POST /api/admin/payouts` - Create payout
- `PUT /api/admin/payouts/:id/complete` - Mark payout as completed

#### 5.4 Create Partner Routes

**File:** `server/routes/partner.routes.ts` (new file)

```typescript
import { Router, Response } from 'express';
import { partnerController } from '../controllers/partner.controller';
import { referralLinkController } from '../controllers/referral-link.controller';
import { requireAuth } from '../middleware/authentication';
import { requirePartner } from '../middleware/partner-authentication';
import { csrfProtection } from '../middleware/csrf';
import { asyncHandler } from '../middleware/error-handler';
import { AuthenticatedRequest } from '../types/auth';

const router = Router();

// All routes require authentication and partner role
router.use(requireAuth);
router.use(requirePartner);

// Partner Profile
router.get('/me',
  asyncHandler((req: AuthenticatedRequest, res: Response) => partnerController.getMe(req, res))
);

router.put('/me',
  csrfProtection,
  asyncHandler((req: AuthenticatedRequest, res: Response) => partnerController.updateMe(req, res))
);

// Dashboard
router.get('/dashboard',
  asyncHandler((req: AuthenticatedRequest, res: Response) => partnerController.getDashboard(req, res))
);

// Referral Links
router.post('/referral-links',
  csrfProtection,
  asyncHandler((req: AuthenticatedRequest, res: Response) => referralLinkController.create(req, res))
);

router.get('/referral-links',
  asyncHandler((req: AuthenticatedRequest, res: Response) => referralLinkController.list(req, res))
);

// ... other routes

export default router;
```

#### 5.5 Create Middleware for Partner Authorization

**File:** `server/middleware/partner-authentication.ts` (new file)

```typescript
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/auth';

/**
 * Middleware to ensure user is a partner
 */
export const requirePartner = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Authentication required'
      }
    });
  }

  if (req.user.userType !== 'partner') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'PARTNER_REQUIRED',
        message: 'Partner account required'
      }
    });
  }

  next();
};
```

#### 5.6 Update Main Routes Index

**File:** `server/routes/index.ts` (modify existing)

```typescript
import partnerRoutes from './partner.routes';
import adminPartnerRoutes from './admin-partner.routes';

// Add routes
router.use('/partners', partnerRoutes);
router.use('/admin/partners', adminPartnerRoutes);
```

---

### Phase 6: Referral Tracking System

**Complexity:** High  
**Dependencies:** Phase 5 (Controllers)  
**Estimated Effort:** 8-10 hours

#### 6.1 Create Public Referral Handler

**File:** `server/controllers/public-referral.controller.ts` (new file)

Handles public-facing referral link clicks (NO authentication required).

**Endpoint:** `GET /ref/:linkCode`

**Logic:**
1. Extract `linkCode` from URL
2. Look up link in database
3. Record click with metadata (IP, User-Agent, Referer)
4. Generate browser fingerprint
5. Check if unique click (by fingerprint + link)
6. Store click in `referralClicks` table
7. Set cookie with `referral_code` and `click_id` (30-day expiry)
8. Redirect to registration page with query params

**Implementation:**
```typescript
import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { getService, TYPES } from '../services/container';
import { IReferralTrackingService } from '../services/domain/referral-tracking.service';
import crypto from 'crypto';

export class PublicReferralController extends BaseController {
  async handleReferralClick(req: Request, res: Response) {
    try {
      const { linkCode } = req.params;
      
      // Collect metadata
      const ipAddress = req.ip || '0.0.0.0';
      const userAgent = req.get('User-Agent') || '';
      const referer = req.get('Referer') || '';
      
      // Generate session ID if not exists
      let sessionId = req.cookies['ref_session'];
      if (!sessionId) {
        sessionId = crypto.randomBytes(32).toString('hex');
        res.cookie('ref_session', sessionId, {
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
      }
      
      // Generate fingerprint
      const trackingService = getService<IReferralTrackingService>(TYPES.IReferralTrackingService);
      const fingerprint = trackingService.getFingerprintFromRequest(ipAddress, userAgent);
      
      // Record click
      const click = await trackingService.recordClick({
        linkCode,
        ipAddress,
        userAgent,
        referer,
        sessionId,
        fingerprint
      });
      
      // Set attribution cookies
      res.cookie('referral_code', linkCode, {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: false, // Need to read from frontend
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      
      res.cookie('click_id', click.id, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      
      // Redirect to registration page
      return res.redirect(`/register?ref=${linkCode}`);
      
    } catch (error) {
      // Log error but don't expose details
      console.error('Referral tracking error:', error);
      // Redirect to home page on error
      return res.redirect('/');
    }
  }
}

export const publicReferralController = new PublicReferralController();
```

**Route:** Add to `server/routes/index.ts`
```typescript
// Public referral handler (NO auth required)
router.get('/ref/:linkCode', (req, res) => publicReferralController.handleReferralClick(req, res));
```

#### 6.2 Modify Student Registration Flow

**File:** `server/services/domain/registration.service.ts` (modify existing)

Update `registerStudentComplete` method to handle referral attribution:

```typescript
async registerStudentComplete(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  phone: string,
  referralCode?: string, // NEW parameter
  clickId?: string        // NEW parameter
): Promise<RegisterStudentDTO> {
  try {
    const emailLower = email.toLowerCase();
    const profile = this.createDefaultStudentProfile(phone);

    // Create user and profile
    const result = await this.registerStudent({
      email: emailLower,
      password,
      firstName,
      lastName,
      userType: 'customer',
      accountStatus: 'active',
      profile
    });

    // NEW: Attribute to partner if referral code exists
    if (referralCode) {
      const referralTrackingService = getService<IReferralTrackingService>(TYPES.IReferralTrackingService);
      const studentProfile = await this.studentRepo.findByUserId(result.user.id);
      
      if (studentProfile) {
        await referralTrackingService.attributeStudentToPartner(
          studentProfile.id,
          referralCode,
          clickId
        );
      }
    }

    // ... existing cooling period logic

    return {
      message: 'Registration successful! You can now login.',
      userId: result.user.id,
      coolingPeriod,
      coolingPeriodEnds
    };
  } catch (error) {
    return this.handleError(error, 'RegistrationService.registerStudentComplete');
  }
}
```

#### 6.3 Modify Registration Controller

**File:** `server/controllers/auth.controller.ts` (modify existing)

Update `registerStudent` to extract referral data from cookies:

```typescript
async registerStudent(req: Request, res: Response) {
  try {
    const validatedData = registerSchema.parse(req.body);
    
    // NEW: Extract referral tracking from cookies
    const referralCode = req.cookies['referral_code'];
    const clickId = req.cookies['click_id'];

    const registrationService = getService<IRegistrationService>(TYPES.IRegistrationService);
    const result = await registrationService.registerStudentComplete(
      validatedData.email,
      validatedData.password,
      validatedData.firstName,
      validatedData.lastName,
      validatedData.phone,
      referralCode,    // NEW
      clickId          // NEW
    );

    // NEW: Clear referral cookies after attribution
    res.clearCookie('referral_code');
    res.clearCookie('click_id');

    res.status(201);
    return this.sendSuccess(res, result);
  } catch (error: any) {
    // ... existing error handling
  }
}
```

#### 6.4 Fraud Prevention Measures

**File:** `server/services/domain/referral-tracking.service.ts` (add methods)

**Fingerprinting Algorithm:**
```typescript
getFingerprintFromRequest(ipAddress: string, userAgent: string): string {
  // Create hash of IP + User-Agent
  const data = `${ipAddress}:${userAgent}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}
```

**Unique Click Detection:**
```typescript
async isUniqueClick(fingerprint: string, linkId: string): Promise<boolean> {
  const existingClick = await this.referralClickRepo.findByFingerprintAndLink(
    fingerprint,
    linkId
  );
  return !existingClick;
}
```

**Additional Fraud Prevention:**
1. **Rate Limiting:** Limit clicks per IP per hour (e.g., max 10 clicks/hour)
2. **Bot Detection:** Check User-Agent for known bots
3. **Referrer Validation:** Verify HTTP referer makes sense
4. **Time Window:** Only attribute conversions within 30 days of click
5. **Manual Review:** Flag suspicious patterns for admin review
6. **IP Geolocation:** Track country/city for anomaly detection

---

### Phase 7: Commission & Payout System

**Complexity:** High  
**Dependencies:** Phase 6 (Referral Tracking)  
**Estimated Effort:** 8-10 hours

#### 7.1 Webhook Integration for Commission Creation

**File:** `server/controllers/payment.controller.ts` (modify existing webhook handler)

Update Razorpay webhook handler to create commissions:

```typescript
async handleRazorpayWebhook(req: Request, res: Response) {
  try {
    // ... existing signature verification

    const { event, payload } = req.body;
    
    if (event === 'payment.captured') {
      const paymentEntity = payload.payment.entity;
      
      // ... existing payment processing
      
      // NEW: Check if this payment is from a referred student
      const payment = await this.paymentRepository.findByPaymentReference(paymentEntity.id);
      if (payment && payment.userId) {
        const studentProfile = await this.studentRepository.findByUserId(payment.userId);
        
        if (studentProfile && studentProfile.referredByPartnerId) {
          // Create commission for partner
          const commissionService = getService<ICommissionService>(TYPES.ICommissionService);
          
          // Find referral record
          const referral = await this.partnerStudentReferralRepo.findByStudentId(studentProfile.id);
          
          if (referral && referral.commissionEligible) {
            await commissionService.createCommission(referral.id, payment.id);
            
            // Mark referral as converted
            await this.partnerStudentReferralRepo.update(referral.id, {
              status: 'converted',
              convertedAt: new Date(),
              subscriptionId: payment.subscriptionId,
              paymentId: payment.id
            });
          }
        }
      }
    }
    
    return res.status(200).json({ success: true });
  } catch (error) {
    return this.handleError(res, error, 'PaymentController.handleRazorpayWebhook');
  }
}
```

#### 7.2 Commission Calculation Logic

**File:** `server/services/domain/commission.service.ts` (implement method)

```typescript
async calculateCommission(
  partnerId: string, 
  paymentAmount: number
): Promise<CommissionCalculationResult> {
  try {
    // Get partner profile for commission rate
    const partner = await this.partnerProfileRepo.findById(partnerId);
    
    let commissionAmount: number;
    
    if (partner.commissionType === 'percentage') {
      // Calculate percentage-based commission
      const rate = parseFloat(partner.commissionRate);
      commissionAmount = (paymentAmount * rate) / 100;
    } else if (partner.commissionType === 'fixed') {
      // Use fixed commission amount
      commissionAmount = parseFloat(partner.fixedCommissionAmount || '0');
    } else {
      throw new InvalidOperationError(
        'calculate commission',
        `Invalid commission type: ${partner.commissionType}`
      );
    }
    
    // Round to 2 decimal places
    commissionAmount = Math.round(commissionAmount * 100) / 100;
    
    return {
      baseAmount: paymentAmount,
      commissionRate: parseFloat(partner.commissionRate),
      commissionAmount,
      currency: 'INR'
    };
  } catch (error) {
    return this.handleError(error, 'CommissionService.calculateCommission');
  }
}
```

#### 7.3 Commission Creation & Approval Workflow

**File:** `server/services/domain/commission.service.ts`

```typescript
async createCommission(
  referralId: string, 
  paymentId: string
): Promise<PartnerCommission> {
  return await this.partnerCommissionRepo.executeInTransaction(async (tx) => {
    // Get referral details
    const referral = await this.partnerStudentReferralRepo.findById(referralId, tx);
    
    // Get payment details
    const payment = await this.paymentRepo.findById(paymentId, tx);
    
    // Calculate commission
    const calculation = await this.calculateCommission(
      referral.partnerId,
      parseFloat(payment.amount)
    );
    
    // Create commission record
    const commission = await this.partnerCommissionRepo.create({
      partnerId: referral.partnerId,
      referralId: referral.id,
      paymentId: payment.id,
      baseAmount: calculation.baseAmount.toString(),
      commissionRate: calculation.commissionRate.toString(),
      commissionAmount: calculation.commissionAmount.toString(),
      currency: calculation.currency,
      status: 'pending'
    }, tx);
    
    // Update partner profile stats
    await this.partnerProfileRepo.updateCommissionEarned(
      referral.partnerId,
      calculation.commissionAmount
    );
    
    // Log creation
    logger.info('Commission created', {
      commissionId: commission.id,
      partnerId: referral.partnerId,
      amount: calculation.commissionAmount,
      paymentId: payment.id
    });
    
    return commission;
  });
}

async approveCommissions(
  commissionIds: string[], 
  adminId: string
): Promise<PartnerCommission[]> {
  const approved: PartnerCommission[] = [];
  
  for (const id of commissionIds) {
    const commission = await this.partnerCommissionRepo.update(id, {
      status: 'approved',
      approvedBy: adminId,
      approvedAt: new Date()
    });
    approved.push(commission);
  }
  
  return approved;
}
```

#### 7.4 Payout Generation Logic

**File:** `server/services/domain/payout.service.ts`

```typescript
async createPayout(
  partnerId: string,
  commissionIds: string[],
  payoutMethod: PayoutMethod
): Promise<PartnerPayout> {
  return await this.partnerPayoutRepo.executeInTransaction(async (tx) => {
    // Validate all commissions belong to partner and are approved
    const commissions = await Promise.all(
      commissionIds.map(id => this.partnerCommissionRepo.findById(id, tx))
    );
    
    const invalidCommissions = commissions.filter(
      c => c.partnerId !== partnerId || c.status !== 'approved' || c.payoutId !== null
    );
    
    if (invalidCommissions.length > 0) {
      throw new InvalidOperationError(
        'create payout',
        'Some commissions are not eligible for payout'
      );
    }
    
    // Calculate total payout amount
    const totalAmount = commissions.reduce(
      (sum, c) => sum + parseFloat(c.commissionAmount),
      0
    );
    
    // Check minimum payout threshold
    const partner = await this.partnerProfileRepo.findById(partnerId, tx);
    const minPayout = parseFloat(partner.minimumPayoutAmount);
    
    if (totalAmount < minPayout) {
      throw new InvalidOperationError(
        'create payout',
        `Payout amount ${totalAmount} is below minimum ${minPayout}`
      );
    }
    
    // Determine period
    const commissionDates = commissions.map(c => new Date(c.createdAt));
    const periodStart = new Date(Math.min(...commissionDates.map(d => d.getTime())));
    const periodEnd = new Date(Math.max(...commissionDates.map(d => d.getTime())));
    
    // Create payout
    const payout = await this.partnerPayoutRepo.create({
      partnerId,
      payoutAmount: totalAmount.toString(),
      currency: 'INR',
      commissionCount: commissions.length,
      periodStart,
      periodEnd,
      payoutMethod,
      status: 'pending'
    }, tx);
    
    // Link commissions to payout
    for (const commission of commissions) {
      await this.partnerCommissionRepo.update(commission.id, {
        payoutId: payout.id
      }, tx);
    }
    
    logger.info('Payout created', {
      payoutId: payout.id,
      partnerId,
      amount: totalAmount,
      commissionCount: commissions.length
    });
    
    return payout;
  });
}

async completePayout(
  payoutId: string, 
  adminId: string
): Promise<PartnerPayout> {
  return await this.partnerPayoutRepo.executeInTransaction(async (tx) => {
    const payout = await this.partnerPayoutRepo.findById(payoutId, tx);
    
    // Update payout status
    const completed = await this.partnerPayoutRepo.update(payoutId, {
      status: 'completed',
      processedBy: adminId,
      processedAt: new Date(),
      completedAt: new Date()
    }, tx);
    
    // Mark all commissions as paid
    const commissions = await this.partnerCommissionRepo.findByPayoutId(payoutId, tx);
    for (const commission of commissions) {
      await this.partnerCommissionRepo.update(commission.id, {
        status: 'paid',
        paidAt: new Date()
      }, tx);
    }
    
    // Update partner profile stats
    const payoutAmount = parseFloat(payout.payoutAmount);
    await this.partnerProfileRepo.updateCommissionPaid(payout.partnerId, payoutAmount);
    
    logger.info('Payout completed', {
      payoutId: payout.id,
      partnerId: payout.partnerId,
      amount: payoutAmount
    });
    
    return completed;
  });
}
```

#### 7.5 Admin Payout Management Interface

**Endpoints:**
- `GET /api/admin/payouts/pending` - List pending payouts
- `POST /api/admin/payouts/:id/process` - Mark as processing
- `POST /api/admin/payouts/:id/complete` - Mark as completed
- `POST /api/admin/payouts/:id/cancel` - Cancel payout

**File:** `server/controllers/admin-partner.controller.ts`

---

### Phase 8: Testing & Security

**Complexity:** Medium  
**Dependencies:** All previous phases  
**Estimated Effort:** 8-10 hours

#### 8.1 Unit Tests

**Test Coverage Plan:**

1. **Repository Tests** (`server/repositories/__tests__/`)
   - `partner-profile.repository.test.ts`
   - `partner-referral-link.repository.test.ts`
   - `partner-commission.repository.test.ts`
   - Test CRUD operations, transaction handling, edge cases

2. **Service Tests** (`server/services/domain/__tests__/`)
   - `partner.service.test.ts`
   - `referral-tracking.service.test.ts`
   - `commission.service.test.ts`
   - `payout.service.test.ts`
   - Mock repositories, test business logic, error scenarios

3. **Controller Tests** (`server/controllers/__tests__/`)
   - `partner.controller.test.ts`
   - `admin-partner.controller.test.ts`
   - Test HTTP layer, input validation, authorization

**Pattern:** Follow existing test patterns in codebase (Vitest + Supertest)

**Example Test:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { CommissionService } from '../commission.service';

describe('CommissionService', () => {
  describe('calculateCommission', () => {
    it('should calculate percentage-based commission correctly', async () => {
      const result = await commissionService.calculateCommission('partner-id', 10000);
      expect(result.commissionAmount).toBe(1000); // 10% of 10000
      expect(result.commissionRate).toBe(10);
    });

    it('should calculate fixed commission correctly', async () => {
      // Test fixed commission type
    });

    it('should round to 2 decimal places', async () => {
      // Test rounding logic
    });
  });
});
```

#### 8.2 Integration Tests

**Key Flows to Test:**

1. **End-to-End Referral Flow**
   - Click referral link → Cookie set → Register → Attribution created → Payment → Commission created

2. **Commission Approval Workflow**
   - Create commission → Admin approves → Status updated

3. **Payout Flow**
   - Create payout → Process → Complete → Partner stats updated

**File:** `server/tests/partner-integration.test.ts`

#### 8.3 Security Measures

**Input Validation:**
- Zod schemas for all API inputs
- Sanitization via `InputSanitizer` for XSS prevention
- Phone number validation
- Email validation

**Authorization Checks:**
- `requireAuth` middleware on all protected routes
- `requirePartner` middleware for partner-only routes
- `requireAdmin` for admin partner management
- Service-layer checks: `if (partner.userId !== req.user.id) throw AuthorizationError`

**CSRF Protection:**
- Applied to all mutation endpoints (POST, PUT, DELETE)
- Excluded from public referral handler (GET /ref/:linkCode)

**Rate Limiting:**
```typescript
// server/routes/partner.routes.ts
import rateLimit from 'express-rate-limit';

const partnerApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this account',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => req.user?.id || 'unauthenticated'
});

router.use(partnerApiLimiter);
```

**Referral Click Rate Limiting:**
```typescript
// server/routes/index.ts
const referralClickLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 clicks per IP per hour
  message: 'Too many referral clicks. Please try again later.',
  keyGenerator: (req) => req.ip || 'unknown'
});

router.get('/ref/:linkCode', referralClickLimiter, publicReferralController.handleReferralClick);
```

**SQL Injection Prevention:**
- Drizzle ORM with parameterized queries
- No raw SQL except for safe operations (e.g., `sql\`count(*)\``)

**Sensitive Data Protection:**
- Partner bank details stored in JSONB (encrypted at rest by PostgreSQL)
- No password storage for partners (use User.password)
- Sanitize user objects before sending to frontend (`sanitizeUser` method)

**Webhook Security:**
- Razorpay signature verification (HMAC SHA256)
- Raw body preservation for signature check
- IP whitelisting (optional, for production)

#### 8.4 Documentation

**Files to Create:**

1. **`docs/partner-system/PARTNER_SYSTEM_OVERVIEW.md`**
   - System architecture diagram
   - Data flow diagrams
   - Entity relationship diagram

2. **`docs/partner-system/API_DOCUMENTATION.md`**
   - Endpoint documentation
   - Request/response examples
   - Authentication requirements

3. **`docs/partner-system/PARTNER_ONBOARDING_GUIDE.md`**
   - How partners register
   - KYC verification process
   - How to create referral links
   - Dashboard usage

4. **`docs/partner-system/ADMIN_GUIDE.md`**
   - Partner management
   - Commission approval workflow
   - Payout processing
   - Fraud detection guidelines

5. **`docs/partner-system/DEVELOPER_GUIDE.md`**
   - Code architecture
   - Service layer patterns
   - Testing guidelines
   - Deployment checklist

#### 8.5 Monitoring & Alerting

**Logging:**
```typescript
// Commission creation
logger.info('Commission created', {
  commissionId,
  partnerId,
  amount,
  paymentId,
  timestamp: new Date()
});

// Suspicious activity
logger.warn('Suspicious referral pattern detected', {
  partnerId,
  pattern: 'high_click_rate',
  clickCount: 100,
  timeWindow: '1 hour'
});
```

**Metrics to Track:**
- Total referrals per partner
- Conversion rates
- Commission amounts
- Payout processing time
- Fraud detection events
- API error rates

---

## Implementation Timeline Summary

| Phase | Name | Effort | Dependencies | Status |
|-------|------|--------|--------------|--------|
| Phase 1 | Database Foundation | 3-4 hours | None | Ready to implement |
| Phase 2 | Shared Types & Constants | 1-2 hours | Phase 1 | - |
| Phase 3 | Repository Layer | 6-8 hours | Phase 1, Phase 2 | - |
| Phase 4 | Service Layer | 10-12 hours | Phase 3 | - |
| Phase 5 | Controller & Routes | 6-8 hours | Phase 4 | - |
| Phase 6 | Referral Tracking | 8-10 hours | Phase 5 | - |
| Phase 7 | Commission & Payout | 8-10 hours | Phase 6 | - |
| Phase 8 | Testing & Security | 8-10 hours | All phases | - |
| **Total** | | **50-64 hours** | | |

**Suggested Sprint Breakdown:**
- **Sprint 1 (Week 1):** Phases 1-3 (Database + Types + Repositories)
- **Sprint 2 (Week 2):** Phases 4-5 (Services + Controllers)
- **Sprint 3 (Week 3):** Phases 6-7 (Tracking + Commissions)
- **Sprint 4 (Week 4):** Phase 8 + Integration testing + Documentation

---

## Risk Assessment & Mitigation

### High-Risk Items

1. **Commission Calculation Accuracy**
   - **Risk:** Incorrect calculations leading to financial disputes
   - **Mitigation:** Extensive unit tests, manual verification, audit logging

2. **Referral Attribution Fraud**
   - **Risk:** Partners gaming the system with fake clicks/registrations
   - **Mitigation:** Multi-layered fraud detection, admin review workflow, time-based attribution

3. **Payout Processing Errors**
   - **Risk:** Incorrect payouts or duplicate payments
   - **Mitigation:** Transaction-based payout creation, admin approval required, reconciliation reports

4. **Data Privacy Compliance**
   - **Risk:** Exposing sensitive partner financial data
   - **Mitigation:** Role-based access control, data encryption, audit logging

5. **Performance Impact**
   - **Risk:** Referral tracking slowing down registration flow
   - **Mitigation:** Async processing, database indexing, caching strategies

---

## Future Enhancements (Post-MVP)

1. **Advanced Analytics Dashboard**
   - Real-time conversion tracking
   - A/B testing for referral links
   - Geographic heatmaps

2. **Multi-Tier Commission Structure**
   - Different rates for different plan tiers
   - Bonus thresholds (e.g., 50 conversions = +5% rate)

3. **Automated Payouts**
   - Scheduled automatic payouts
   - Integration with payment gateways (PayPal API, bank transfer APIs)

4. **Partner Tiering System**
   - Bronze/Silver/Gold tiers based on performance
   - Tier-based commission rates

5. **Referral Link Customization**
   - Custom domains (e.g., partner.com → EduPath with attribution)
   - Branded landing pages

6. **Mobile App Integration**
   - Partner mobile app with dashboard
   - Push notifications for conversions

---

## Conclusion

This implementation plan provides a comprehensive, phase-by-phase approach to building the Partner Account System for EduPath. By following the existing architectural patterns and leveraging the robust foundation already in place (DDD, service container, error handling, Razorpay integration), the system can be implemented systematically with minimal risk.

The estimated total effort of **50-64 hours** (approximately 4 weeks for 1 developer) is realistic given the complexity of the system and the need for thorough testing and documentation. The modular approach allows for incremental delivery and testing at each phase.

**Key Success Factors:**
- Strict adherence to existing code patterns
- Comprehensive testing at each layer
- Thorough fraud prevention measures
- Clear documentation for partners and admins
- Careful financial calculations with audit trails

This plan is ready for immediate implementation following the database migration in Phase 1.
