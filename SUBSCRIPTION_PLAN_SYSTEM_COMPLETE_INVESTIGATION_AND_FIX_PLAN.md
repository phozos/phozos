# Subscription Plan System - Complete Investigation & Implementation Plan

**Date:** November 7, 2025  
**Platform:** EduPath International Education Platform  
**Investigation Status:** COMPLETE  
**Implementation Priority:** CRITICAL  
**Estimated Duration:** 6-8 weeks

---

## Executive Summary

### Critical Findings

**IMMEDIATE BLOCKER DISCOVERED:**
The subscription plan creation system is completely **BROKEN** due to a schema design flaw. Attempting to create a new plan will fail with a database constraint violation.

**Root Cause:**
```typescript
// shared/schema.ts line 847
basePlanId: uuid("base_plan_id").notNull().references((): any => subscriptionPlans.id, { onDelete: 'set null' }),
```

**The Problem:**
1. New plans require a `basePlanId` (NOT NULL constraint)
2. For version 1 plans, `basePlanId` should equal the plan's own ID (self-reference)
3. But the plan doesn't have an ID until AFTER database insertion
4. This creates an **unsolvable chicken-and-egg problem**

**Impact:**
- ❌ **Cannot create ANY new subscription plans**
- ❌ **Admin UI plan creation form will fail silently or with cryptic errors**
- ❌ **Versioning system is non-functional**
- ❌ **Business is blocked from launching new pricing tiers**

**Why This Wasn't Caught Earlier:**
- Migration 0012 shows the CORRECT approach (nullable → backfill → NOT NULL)
- But the TypeScript schema doesn't match the migration
- Likely the schema was manually edited or regenerated incorrectly

### Industry Standards Gap Analysis

| Feature | Current State | Stripe Standard | AWS SaaS Lens | Gap Severity |
|---------|---------------|-----------------|---------------|--------------|
| **Plan Versioning** | ❌ Broken (schema bug) | ✅ Price objects per Product | ✅ Version per plan family | 🔴 CRITICAL |
| **Grandfathering** | ⚠️ Partial (schema exists, unused) | ✅ Automatic via subscriptions | ✅ Tenant isolation | 🟡 HIGH |
| **Price Changes** | ❌ Direct mutation | ✅ New price, old stays active | ✅ Versioned pricing | 🔴 CRITICAL |
| **Customer Notifications** | ❌ None | ✅ 30-day advance notice | ✅ Change management | 🔴 CRITICAL |
| **Audit Trail** | ⚠️ Table exists, underused | ✅ Complete event log | ✅ Compliance-ready | 🟡 MEDIUM |
| **Migration Workflow** | ⚠️ Table exists, unused | ✅ Guided UI + automation | ✅ Self-service portal | 🟡 MEDIUM |
| **Plan Deprecation** | ❌ None | ✅ Soft delete + successor | ✅ Sunset policies | 🟠 MEDIUM |

---

## Part 1: Complete System Investigation

### 1.1 Database Schema Analysis

#### Current Tables

**`subscription_plans` (Lines 819-857 in shared/schema.ts)**

```typescript
export const subscriptionPlans = pgTable("subscription_plans", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("INR"),
  description: text("description"),
  logo: text("logo").default("graduation-cap"),
  features: jsonb("features").$type<string[]>().notNull(),
  tierLevel: integer("tier_level").notNull(),
  isLifetime: boolean("is_lifetime").default(true),
  
  // University access controls
  maxUniversities: integer("max_universities").notNull(),
  maxCountries: integer("max_countries").notNull(),
  universityTier: universityTierEnum("university_tier").notNull().default("general"),
  supportType: supportTypeEnum("support_type").notNull().default("email"),
  turnaroundDays: integer("turnaround_days").notNull(),
  
  // Feature flags (10 boolean columns)
  includeLoanAssistance: boolean("include_loan_assistance").default(false),
  includeVisaSupport: boolean("include_visa_support").default(false),
  includeCounselorSession: boolean("include_counselor_session").default(false),
  includeScholarshipPlanning: boolean("include_scholarship_planning").default(false),
  includeMockInterview: boolean("include_mock_interview").default(false),
  includeExpertEditing: boolean("include_expert_editing").default(false),
  includePostAdmitSupport: boolean("include_post_admit_support").default(false),
  includeDedicatedManager: boolean("include_dedicated_manager").default(false),
  includeNetworkingEvents: boolean("include_networking_events").default(false),
  includeFlightAccommodation: boolean("include_flight_accommodation").default(false),
  
  isBusinessFocused: boolean("is_business_focused").default(false),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  
  // VERSIONING FIELDS (THE PROBLEM AREA)
  basePlanId: uuid("base_plan_id").notNull().references((): any => subscriptionPlans.id, { onDelete: 'set null' }), // ❌ CRITICAL BUG
  version: integer("version").notNull().default(1),
  versionName: varchar("version_name", { length: 50 }),
  isLatestVersion: boolean("is_latest_version").default(true),
  deprecatedAt: timestamp("deprecated_at"),
  archivedAt: timestamp("archived_at"),
  successorPlanId: uuid("successor_plan_id").references((): any => subscriptionPlans.id, { onDelete: 'set null' }),
  feature_version_metadata: jsonb("feature_version_metadata"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

**Problems Identified:**

1. **CRITICAL: `basePlanId` is NOT NULL** (Line 847)
   - Cannot create new plans (no ID exists before insert)
   - Self-referencing FK requires nullable column OR two-step insert

2. **tierLevel has no UNIQUE constraint in schema**
   - Migration 0012 line 35-36 drops it, but schema might allow duplicates
   - Allows multiple plans with same tier (good for versioning)

3. **No CHECK constraints for version/basePlanId consistency**
   - Nothing prevents orphaned versions
   - No validation that version 1 has basePlanId = id

**`user_subscriptions` (Lines 860-889)**

```typescript
export const userSubscriptions = pgTable("user_subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  planId: uuid("plan_id").references(() => subscriptionPlans.id).notNull(),
  status: subscriptionStatusEnum("status").notNull().default("pending"),
  isLifetime: boolean("is_lifetime").default(true),
  tierLevel: integer("tier_level"),
  lifetimeActivatedAt: timestamp("lifetime_activated_at"),
  highestTierReached: integer("highest_tier_reached"),
  startedAt: timestamp("started_at"),
  expiresAt: timestamp("expires_at"),
  orderId: text("order_id"),
  paymentReference: text("payment_reference"),
  paymentGateway: text("payment_gateway"),
  autoRenew: boolean("auto_renew"),
  universitiesUsed: integer("universities_used").default(0),
  countriesUsed: integer("countries_used").default(0),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("INR"),
  paidAt: timestamp("paid_at"),
  
  // Grandfathering support (Phase 2)
  subscribedPlanSnapshot: jsonb("subscribed_plan_snapshot"),
  grandfatheredPrice: decimal("grandfathered_price", { precision: 10, scale: 2 }),
  grandfatheredUntil: timestamp("grandfathered_until"),
  isGrandfathered: boolean("is_grandfathered").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

**Strengths:**
- ✅ Grandfathering columns exist (good foundation)
- ✅ Captures `amountPaid` at purchase time
- ✅ Plan snapshot field for immutability

**Problems:**
- ⚠️ Grandfathering columns are unused (no code populates them)
- ⚠️ `planId` points to mutable plan (relies on snapshot for safety)

#### Supporting Tables

**`subscription_plan_changes` (Audit Trail)**
- ✅ EXISTS (Migration 0011)
- ✅ Proper structure with JSONB field_changes
- ⚠️ Underutilized in service layer

**`subscription_plan_notifications` (Price Change Alerts)**
- ✅ EXISTS (Migration 0014)
- ✅ Tracks notification type, effective date, recipient count
- ⚠️ No active notification sending logic

**`user_plan_notifications` (User Delivery Tracking)**
- ✅ EXISTS (Migration 0014)
- ✅ Tracks sent_at, read_at, acknowledged_at
- ⚠️ No UI to display these

**`plan_migrations` (Migration Campaigns)**
- ✅ EXISTS (Migration 0015)
- ✅ Supports voluntary/mandatory/incentivized migrations
- ⚠️ Service layer incomplete

**`plan_migration_users` (Individual Migration Status)**
- ✅ EXISTS (Migration 0015)
- ✅ Tracks accept/decline/migrated status
- ⚠️ Missing integration with main subscription flow

### 1.2 Migration Files Analysis

**Migration Timeline:**

```
0011_add_subscription_plan_audit_trail.sql ✅
  ├─ Creates subscription_plan_changes table
  └─ Enables change tracking

0012_add_plan_versioning.sql ✅ (BUT SCHEMA DOESN'T MATCH)
  ├─ Adds versioning columns (basePlanId, version, etc.)
  ├─ Proper sequence: nullable → backfill → NOT NULL
  ├─ Drops tier_level UNIQUE constraint
  ├─ Adds composite UNIQUE (basePlanId, version)
  └─ Creates performance indexes

0013_add_grandfathering_support.sql ✅
  ├─ Adds grandfathering columns to user_subscriptions
  ├─ Backfills snapshot for existing active subscriptions
  └─ Creates indexes

0014_add_plan_change_notifications.sql ✅
  ├─ Creates notification tables
  └─ Sets up notification delivery tracking

0015_add_plan_migration_workflows.sql ✅
  ├─ Creates migration campaign tables
  └─ Supports migration incentives

0016_add_feature_version_metadata.sql
  └─ Adds feature_version_metadata JSONB column

0017_add_feature_change_notification_types.sql
  └─ Extends notification types enum
```

**Key Finding:**
Migration 0012 (lines 22-32) shows the CORRECT approach:

```sql
-- Step 1: Add columns as nullable
ALTER TABLE subscription_plans
  ADD COLUMN base_plan_id UUID;  -- NULLABLE!

-- Step 2: Backfill (self-reference)
UPDATE subscription_plans
SET base_plan_id = id
WHERE base_plan_id IS NULL;

-- Step 3: Make NOT NULL after backfill
ALTER TABLE subscription_plans
  ALTER COLUMN base_plan_id SET NOT NULL;
```

But the TypeScript schema doesn't match this sequence - it has `.notNull()` from the start.

### 1.3 Service Layer Analysis

**File: `server/services/domain/subscription.service.ts`**

**createSubscriptionPlan (Lines 93-133):**

```typescript
async createSubscriptionPlan(plan: InsertSubscriptionPlan, adminId: string, ipAddress?: string, userAgent?: string): Promise<SubscriptionPlan> {
  try {
    this.validateRequired(plan, ['name', 'price', 'features', 'maxUniversities', 'maxCountries', 'turnaroundDays']);
    
    // Validation...
    
    const createdPlan = await this.subscriptionPlanRepository.create(plan); // ❌ WILL FAIL - no basePlanId provided
    
    await this.planAuditRepository.logChange({
      planId: createdPlan.id,
      changedBy: adminId,
      changeType: 'created',
      fieldChanges: { created: { old: null, new: createdPlan } },
      ipAddress,
      userAgent
    });
    
    return createdPlan;
  } catch (error) {
    return this.handleError(error, 'SubscriptionService.createSubscriptionPlan');
  }
}
```

**Problems:**
1. ❌ No logic to handle basePlanId initialization
2. ❌ No version = 1 default
3. ❌ No isLatestVersion = true
4. ❌ Cannot self-reference before plan exists

**createPlanVersion (Lines 210-260):**

```typescript
async createPlanVersion(
  basePlanId: string,
  updates: Partial<SubscriptionPlan>,
  adminId: string,
  releaseNotes?: string,
  notifySubscribers: boolean = true
): Promise<SubscriptionPlan> {
  try {
    const oldPlan = await this.subscriptionPlanRepository.findLatestVersion(basePlanId);
    
    const newVersion = await this.subscriptionPlanRepository.createNewVersion(
      basePlanId,
      updates,
      adminId
    );
    
    // Audit logging...
    
    if (notifySubscribers && oldPlan && updates.price && Number(updates.price) !== Number(oldPlan.price)) {
      // Price change notification logic...
    }
    
    return newVersion;
  } catch (error) {
    return this.handleError(error, 'SubscriptionService.createPlanVersion');
  }
}
```

**Status:**
- ✅ Logic is sound
- ⚠️ Depends on createNewVersion repository method
- ❌ Can't be used until initial plan creation works

**File: `server/repositories/subscription.repository.ts`**

**createNewVersion (Lines 193-249):**

```typescript
async createNewVersion(
  basePlanId: string,
  updates: Partial<SubscriptionPlan>,
  adminId: string
): Promise<SubscriptionPlan> {
  try {
    return await db.transaction(async (tx) => {
      const currentLatest = await tx
        .select()
        .from(subscriptionPlans)
        .where(
          and(
            eq(subscriptionPlans.basePlanId, basePlanId),
            eq(subscriptionPlans.isLatestVersion, true)
          )
        )
        .limit(1);
      
      if (!currentLatest[0]) {
        throw new NotFoundError('Base Plan', basePlanId);
      }
      
      const nextVersion = currentLatest[0].version + 1;
      
      // Mark current as not latest
      await tx
        .update(subscriptionPlans)
        .set({ isLatestVersion: false, updatedAt: new Date() })
        .where(eq(subscriptionPlans.id, currentLatest[0].id));
      
      // Create new version
      const newPlanData: any = {
        ...currentLatest[0],
        ...updates,
        id: undefined,  // Let DB generate new ID
        basePlanId,
        version: nextVersion,
        versionName: `v${nextVersion}`,
        isLatestVersion: true,
        deprecatedAt: null,
        archivedAt: null,
        successorPlanId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      delete newPlanData.id;
      
      const newPlan = await tx
        .insert(subscriptionPlans)
        .values(newPlanData)
        .returning();
      
      return newPlan[0] as SubscriptionPlan;
    });
  } catch (error) {
    handleDatabaseError(error, 'SubscriptionPlanRepository.createNewVersion');
  }
}
```

**Status:**
- ✅ Transaction-safe
- ✅ Properly increments version
- ✅ Marks old as not latest
- ⚠️ Assumes base plan exists and works

### 1.4 Controller Layer Analysis

**File: `server/controllers/admin.controller.ts`**

**createSubscriptionPlan (Lines 1186-1205):**

```typescript
async createSubscriptionPlan(req: AuthenticatedRequest, res: Response) {
  try {
    const validatedData = insertSubscriptionPlanSchema.parse(req.body);
    const adminId = this.getUserId(req);
    const ipAddress = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'];
    
    const plan = await subscriptionService.createSubscriptionPlan(
      validatedData,
      adminId,
      ipAddress,
      userAgent
    );
    
    res.status(201);
    return this.sendSuccess(res, plan);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
    }
    return this.handleError(res, error, 'AdminController.createSubscriptionPlan');
  }
}
```

**Problems:**
- ❌ No basePlanId handling before calling service
- ❌ Validation doesn't account for self-reference requirement
- ❌ Will return 500 error with no actionable information

### 1.5 Client UI Analysis

**File: `client/src/pages/SubscriptionPlans.tsx` (Lines 306-336)**

```typescript
const handleCreatePlan = (formData: FormData) => {
  const data = {
    name: formData.get("name") as string,
    price: formData.get("price") as string,
    currency: formData.get("currency") as string,
    description: formData.get("description") as string,
    logo: selectedBadge,
    features: (formData.get("features") as string).split("\n").filter(f => f.trim()),
    maxUniversities: parseInt(formData.get("maxUniversities") as string),
    maxCountries: parseInt(formData.get("maxCountries") as string),
    universityTier: formData.get("universityTier") as string,
    supportType: formData.get("supportType") as string,
    turnaroundDays: parseInt(formData.get("turnaroundDays") as string),
    // ... all feature flags ...
    tierLevel: parseInt(formData.get("tierLevel") as string),
    displayOrder: parseInt(formData.get("displayOrder") as string) || 0,
    isActive: formData.get("isActive") === "on",
  };
  createPlanMutation.mutate(data);
};
```

**Problems:**
- ❌ No basePlanId sent to API
- ❌ No version field
- ❌ Form will submit successfully but API will fail

### 1.6 Validation Schema Analysis

**File: `shared/schema.ts` (Line 1132)**

```typescript
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ id: true, createdAt: true, updatedAt: true });
```

**Problem:**
- The schema includes `basePlanId` as required (NOT NULL)
- Frontend cannot provide a valid basePlanId for new plans
- Validation will pass, database will fail

### 1.7 Dependencies & Impact Analysis

**What Depends on Current Versioning:**

1. **Plan Analytics** (Line 328 in subscription.service.ts)
   - `getPlanAnalytics()` uses `version` field
   - Currently returns version = 1 for all plans

2. **User Subscriptions** (user-subscription.service.ts)
   - `subscribeUserToPlan()` Line 330-349
   - Uses `subscribedPlanSnapshot` field (grandfathering)
   - Currently populates snapshot correctly

3. **Plan Migration Service** (plan-migration.service.ts)
   - Uses `successorPlanId` for deprecation workflow
   - Currently unused in production

4. **Feature Entitlement** (feature-entitlement.service.ts)
   - Checks plan features based on `planId`
   - Doesn't care about versioning

**Queries That Need To Change:**

1. **findActive() (subscription.repository.ts Line 84-100)**
   ```typescript
   // Current: Returns all active plans
   // Should: Return only latest versions of active plans
   ```

2. **Admin Plan List (client UI)**
   ```typescript
   // Current: Shows all plans
   // Should: Option to show all versions vs latest only
   ```

3. **Public Plan Display**
   ```typescript
   // Current: Shows all active plans
   // Should: Show only latest versions
   ```

**API Contract Changes:**

1. **POST /api/admin/subscription-plans**
   - Currently: Requires all plan fields
   - Should: Auto-populate basePlanId, version, isLatestVersion

2. **PUT /api/admin/subscription-plans/:id**
   - Currently: Direct mutation
   - Should: Deprecated (replaced by createPlanVersion)

3. **POST /api/admin/subscription-plans/:basePlanId/versions**
   - Currently: EXISTS but depends on broken createSubscriptionPlan
   - Should: Primary method for price changes

**Client UI Changes:**

1. **Plan Creation Form**
   - Remove: version, basePlanId fields (auto-managed)
   - Keep: All other fields

2. **Plan Edit Form**
   - Change: "Update Plan" → "Create New Version"
   - Add: Warning about grandfathering
   - Add: "Notify Subscribers" checkbox

3. **Plan List View**
   - Add: Version badge/indicator
   - Add: Filter "Show All Versions" toggle
   - Add: Deprecation status badge

---

## Part 2: Industry Standards Deep Dive

### 2.1 Stripe's Price Architecture

**Product vs Price Separation:**

```javascript
// A Product represents the SERVICE (e.g., "Premium Tier")
const product = await stripe.products.create({
  name: "Premium Tier",
  description: "Advanced features for power users"
});

// A Price represents a specific BILLING TERM for that product
const monthlyPrice = await stripe.prices.create({
  product: product.id,
  unit_amount: 2999,  // $29.99
  currency: 'usd',
  recurring: { interval: 'month' }
});

const annualPrice = await stripe.prices.create({
  product: product.id,
  unit_amount: 29999,  // $299.99 (17% discount)
  currency: 'usd',
  recurring: { interval: 'year' }
});

// Later: Price increase - create new price, keep old one active
const monthlyPriceV2 = await stripe.prices.create({
  product: product.id,
  unit_amount: 3499,  // $34.99
  currency: 'usd',
  recurring: { interval: 'month' }
});

// Old price stays active for existing customers
// New customers get the new price
```

**Key Principles:**
1. **Immutability**: Prices are never edited, only created
2. **Grandfathering**: Subscriptions keep their original price
3. **No Deletion**: Prices are deactivated, not deleted
4. **Metadata**: Extensive use of JSON metadata for custom fields

**Mapping to Our System:**

| Stripe Concept | Our Equivalent | Current State |
|----------------|----------------|---------------|
| Product | Plan family (basePlanId group) | ❌ Broken |
| Price | Plan version | ❌ Broken |
| Price.active | plan.isActive | ✅ Works |
| Subscription.price_id | subscription.planId | ✅ Works |
| Subscription.metadata | subscription.subscribedPlanSnapshot | ⚠️ Unused |

### 2.2 AWS SaaS Lens Pricing Patterns

**Multi-Tenant Pricing Architecture:**

```typescript
// Tenant-Isolated Pricing Tiers
interface PricingTier {
  id: string;
  name: string;
  version: number;  // Immutable version number
  effectiveDate: Date;
  expiryDate: Date | null;  // null = active forever
  
  compute: {
    cpu: number;
    memory: number;
    storage: number;
  };
  
  features: string[];
  
  pricing: {
    basePrice: number;
    additionalUsers: number;  // Per-seat pricing
    overage: {
      storage: number;  // Per GB over limit
      api: number;       // Per 1000 requests over limit
    };
  };
}

// Tenant Subscription with Version Lock
interface TenantSubscription {
  tenantId: string;
  pricingTierId: string;
  pricingTierVersion: number;  // Locked version
  
  // Grandfathering
  isPriceGrandfathered: boolean;
  grandfatheredUntil: Date | null;  // null = forever
  
  // Usage tracking
  currentPeriodUsage: {
    users: number;
    storage: number;  // GB
    apiCalls: number;
  };
}
```

**Key AWS Patterns:**
1. **Version Locking**: Subscriptions lock to a specific pricing tier version
2. **Effective Dates**: All changes have effective dates (no immediate changes)
3. **Usage Tracking**: Separate usage from entitlement
4. **Tenant Isolation**: Each tenant sees their version, not global "latest"

**Mapping to Our System:**

| AWS Pattern | Our Equivalent | Current State |
|-------------|----------------|---------------|
| Pricing Tier Version | basePlanId + version | ❌ Broken |
| Effective Date | deprecatedAt, effectiveDate in notifications | ⚠️ Partial |
| Usage Tracking | universitiesUsed, countriesUsed | ✅ Works |
| Grandfathering | grandfatheredPrice, isGrandfathered | ⚠️ Unused |

### 2.3 SaaS Best Practices

**Price Change Communication Timeline:**

```
Day 0: Price Change Decided
  ├─ Day 1: Notify all affected customers (email + in-app)
  │    "Your plan price will increase from $X to $Y on [DATE]"
  │    "You can keep $X by prepaying annually"
  │
  ├─ Day 15: Reminder notification
  │    "Price change in 15 days. Options: Accept, Downgrade, Cancel"
  │
  ├─ Day 25: Final reminder
  │    "Price change in 5 days. Last chance to lock in old price"
  │
  └─ Day 30: Price Change Effective
       ├─ New subscribers: Pay new price
       └─ Existing subscribers: Grandfathered OR migrated (their choice)
```

**Grandfathering Strategies:**

1. **Permanent Grandfathering (Stripe's approach)**
   - Existing customers keep old price forever
   - Creates price drift over time
   - Requires clear revenue forecasting

2. **Time-Limited Grandfathering (AWS's approach)**
   - Existing customers locked for 12 months
   - Forced migration after grace period
   - More predictable revenue

3. **Voluntary Migration with Incentive (Shopify's approach)**
   - Offer 3 months free if they accept new price
   - Discount on annual prepayment
   - Feature upgrades for early adopters

**Feature Flag Patterns:**

```typescript
// Don't version individual features - version the PLAN
// Use feature flags for gradual rollouts WITHIN a version

interface PlanVersion {
  id: string;
  version: number;
  
  // Static features (part of the plan)
  features: {
    maxUniversities: number;
    maxCountries: number;
    supportLevel: 'basic' | 'priority' | 'white-glove';
  };
  
  // Dynamic features (can be toggled independently)
  featureFlags: {
    betaFeatureX: boolean;  // Can enable for specific users
    experimentY: boolean;    // A/B testing
  };
}

// Usage
function canAccessFeature(user, feature) {
  const plan = user.subscription.plan;
  
  // Static feature check
  if (feature === 'universityShortlist') {
    return user.subscription.universitiesUsed < plan.maxUniversities;
  }
  
  // Dynamic feature check (with fallback)
  if (feature === 'betaAI') {
    return plan.featureFlags?.betaAI ?? false;
  }
}
```

---

## Part 3: Phase-by-Phase Implementation Plan

### Phase 0: Immediate Hotfix (CRITICAL - Week 1, Days 1-2)

**Objective:** Make plan creation work RIGHT NOW

**Priority:** 🔴 BLOCKER - Production cannot create plans

**Problem:**
The schema has `basePlanId` as NOT NULL with a self-referencing FK. This creates a chicken-and-egg problem where:
1. New plan needs `basePlanId` before insert
2. But plan doesn't have an ID until after insert
3. Database rejects the INSERT

**Solution:**
Fix the schema to match the migration's intended behavior.

#### Step 1: Update TypeScript Schema (5 minutes)

**File: `shared/schema.ts` (Line 847)**

**CHANGE FROM:**
```typescript
basePlanId: uuid("base_plan_id").notNull().references((): any => subscriptionPlans.id, { onDelete: 'set null' }),
```

**CHANGE TO:**
```typescript
basePlanId: uuid("base_plan_id").references((): any => subscriptionPlans.id, { onDelete: 'set null' }),
```

**Explanation:** Remove `.notNull()` to make it nullable during initial insert.

#### Step 2: Update Service Layer (15 minutes)

**File: `server/services/domain/subscription.service.ts`**

**REPLACE createSubscriptionPlan method (Lines 93-133):**

```typescript
async createSubscriptionPlan(plan: InsertSubscriptionPlan, adminId: string, ipAddress?: string, userAgent?: string): Promise<SubscriptionPlan> {
  try {
    this.validateRequired(plan, ['name', 'price', 'features', 'maxUniversities', 'maxCountries', 'turnaroundDays']);

    const errors: Record<string, string> = {};

    const nameValidation = CommonValidators.validateStringLength(plan.name, 1, 255, 'Plan name');
    if (!nameValidation.valid) {
      errors.name = nameValidation.error!;
    }

    if (plan.price !== undefined && plan.price !== null) {
      BusinessRuleValidators.validatePaymentAmount(Number(plan.price), 0);
    }

    if (plan.maxUniversities !== undefined && plan.maxUniversities !== null) {
      const maxUnivValidation = CommonValidators.validatePositiveNumber(plan.maxUniversities, 'Max universities');
      if (!maxUnivValidation.valid) {
        errors.maxUniversities = maxUnivValidation.error!;
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationServiceError('Subscription Plan', errors);
    }

    // PHASE 0 HOTFIX: Two-step creation for self-referencing FK
    return await db.transaction(async (tx) => {
      // Step 1: Insert with NULL basePlanId
      const tempPlan = {
        ...plan,
        basePlanId: null as any,  // Temporary NULL
        version: 1,
        versionName: 'v1',
        isLatestVersion: true,
      };
      
      const [createdPlan] = await tx
        .insert(subscriptionPlans)
        .values(tempPlan)
        .returning();
      
      // Step 2: Update basePlanId to self-reference
      const [finalPlan] = await tx
        .update(subscriptionPlans)
        .set({ basePlanId: createdPlan.id })
        .where(eq(subscriptionPlans.id, createdPlan.id))
        .returning();

      // Step 3: Audit log
      await this.planAuditRepository.logChange({
        planId: finalPlan.id,
        changedBy: adminId,
        changeType: 'created',
        fieldChanges: { created: { old: null, new: finalPlan } },
        ipAddress,
        userAgent
      });

      return finalPlan as SubscriptionPlan;
    });
  } catch (error) {
    return this.handleError(error, 'SubscriptionService.createSubscriptionPlan');
  }
}
```

**Key Changes:**
1. ✅ Two-step insert: NULL → self-reference
2. ✅ Initialize version = 1, isLatestVersion = true
3. ✅ Wrapped in transaction for atomicity
4. ✅ Maintains existing audit trail

#### Step 3: Add Import (1 minute)

**File: `server/services/domain/subscription.service.ts` (Top of file)**

Add missing imports:
```typescript
import { db } from '../../db';
import { eq } from 'drizzle-orm';
import { subscriptionPlans } from '@shared/schema';
```

#### Step 4: Test Plan Creation (10 minutes)

**Test Case 1: Create Basic Plan**

```bash
# Use Admin UI or API call
curl -X POST http://localhost:5000/api/admin/subscription-plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Test Plan",
    "price": "9999",
    "currency": "INR",
    "description": "Test plan for Phase 0",
    "features": ["Feature 1", "Feature 2"],
    "tierLevel": 100,
    "maxUniversities": 5,
    "maxCountries": 2,
    "turnaroundDays": 7,
    "supportType": "email",
    "universityTier": "general"
  }'
```

**Expected Result:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Test Plan",
    "basePlanId": "550e8400-e29b-41d4-a716-446655440000",  // ✅ Self-reference
    "version": 1,
    "versionName": "v1",
    "isLatestVersion": true,
    ...
  }
}
```

**Test Case 2: Verify Database State**

```sql
-- Check basePlanId equals id for new plans
SELECT id, name, base_plan_id, version, is_latest_version
FROM subscription_plans
WHERE name = 'Test Plan';

-- Expected:
-- id                                   | name      | base_plan_id                          | version | is_latest_version
-- 550e8400-e29b-41d4-a716-446655440000 | Test Plan | 550e8400-e29b-41d4-a716-446655440000 | 1       | true
```

#### Step 5: Rollback Strategy

**If hotfix fails:**

1. Revert schema change:
   ```typescript
   basePlanId: uuid("base_plan_id").notNull().references((): any => subscriptionPlans.id, { onDelete: 'set null' }),
   ```

2. Revert service method to original (git revert)

3. Add database constraint temporarily:
   ```sql
   ALTER TABLE subscription_plans ALTER COLUMN base_plan_id DROP NOT NULL;
   ```

#### Success Criteria

- ✅ Can create new plan via admin UI
- ✅ `basePlanId` equals `id` for new plans
- ✅ `version` = 1 for all new plans
- ✅ Audit trail entry created
- ✅ No existing plans affected

#### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Existing plans have NULL basePlanId | MEDIUM | HIGH | Run backfill script before deploy |
| Transaction timeout | LOW | MEDIUM | Use connection pooling |
| Schema regeneration overwrites fix | MEDIUM | HIGH | Document in migration comments |

#### Time Estimate

- Development: 30 minutes
- Testing: 30 minutes
- Deployment: 15 minutes
- **Total: 1.5 hours**

---

### Phase 1: Database Schema Corrections (Week 1, Days 3-5)

**Objective:** Ensure database schema matches migrations and supports versioning

**Priority:** 🟡 HIGH - Foundation for all future work

#### Step 1: Backfill Existing Plans

**Problem:** Any existing plans may have NULL basePlanId

**Migration: `0020_backfill_base_plan_id.sql`**

```sql
-- Migration: Backfill base_plan_id for existing plans
-- This ensures all plans are self-referencing (version 1 behavior)

-- Step 1: Find orphaned plans (basePlanId = NULL)
SELECT id, name, base_plan_id, version 
FROM subscription_plans 
WHERE base_plan_id IS NULL;

-- Step 2: Backfill with self-reference
UPDATE subscription_plans
SET 
  base_plan_id = id,
  version = COALESCE(version, 1),
  version_name = COALESCE(version_name, 'v1 (Legacy)'),
  is_latest_version = COALESCE(is_latest_version, true)
WHERE base_plan_id IS NULL;

-- Step 3: Verify no NULLs remain
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count 
  FROM subscription_plans 
  WHERE base_plan_id IS NULL;
  
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Backfill failed: % plans still have NULL base_plan_id', null_count;
  END IF;
  
  RAISE NOTICE 'Backfill successful: All plans have base_plan_id';
END $$;

-- Step 4: Add NOT NULL constraint (safe now)
ALTER TABLE subscription_plans
  ALTER COLUMN base_plan_id SET NOT NULL;

-- Step 5: Add comments
COMMENT ON COLUMN subscription_plans.base_plan_id IS 'Self-referencing FK for version 1, references parent for versions > 1. NEVER NULL after backfill.';
```

**Rollback:**
```sql
-- Remove NOT NULL constraint if needed
ALTER TABLE subscription_plans
  ALTER COLUMN base_plan_id DROP NOT NULL;
```

#### Step 2: Add Missing Constraints

**Migration: `0021_add_versioning_constraints.sql`**

```sql
-- Migration: Add data integrity constraints for versioning

-- Constraint 1: Version must be positive
ALTER TABLE subscription_plans
  ADD CONSTRAINT check_version_positive 
  CHECK (version > 0);

-- Constraint 2: Latest version flag can only be true once per base plan
CREATE UNIQUE INDEX idx_one_latest_version_per_plan 
  ON subscription_plans(base_plan_id) 
  WHERE is_latest_version = true;

-- Constraint 3: Version 1 must be self-referencing
-- (Enforced at application level - too complex for DB constraint)

-- Constraint 4: Archived plans cannot be latest version
ALTER TABLE subscription_plans
  ADD CONSTRAINT check_archived_not_latest
  CHECK (
    (archived_at IS NULL) OR 
    (archived_at IS NOT NULL AND is_latest_version = false)
  );

-- Constraint 5: Deprecated plans must have deprecation reason in audit trail
-- (Enforced at application level via required changeReason parameter)

COMMENT ON CONSTRAINT check_version_positive ON subscription_plans IS 'Versions start at 1 and increment';
COMMENT ON INDEX idx_one_latest_version_per_plan IS 'Only one version per plan family can be marked as latest';
COMMENT ON CONSTRAINT check_archived_not_latest ON subscription_plans IS 'Archived plans cannot be the current latest version';
```

#### Step 3: Add Indexes for Performance

**Migration: `0022_add_performance_indexes.sql`**

```sql
-- Migration: Add indexes for common query patterns

-- Index 1: Find all versions of a plan (admin UI)
CREATE INDEX IF NOT EXISTS idx_plans_base_plan_version 
  ON subscription_plans(base_plan_id, version DESC);

-- Index 2: Find latest versions for public display
CREATE INDEX IF NOT EXISTS idx_plans_latest_active 
  ON subscription_plans(is_latest_version, is_active) 
  WHERE is_latest_version = true AND is_active = true;

-- Index 3: Find plans by tier level (for upgrade logic)
CREATE INDEX IF NOT EXISTS idx_plans_tier_level 
  ON subscription_plans(tier_level, is_latest_version);

-- Index 4: Find deprecated plans needing migration
CREATE INDEX IF NOT EXISTS idx_plans_deprecated 
  ON subscription_plans(deprecated_at, base_plan_id) 
  WHERE deprecated_at IS NOT NULL AND archived_at IS NULL;

-- Index 5: Audit trail by plan and date
CREATE INDEX IF NOT EXISTS idx_plan_changes_plan_date 
  ON subscription_plan_changes(plan_id, created_at DESC);

-- Analyze tables for query planner
ANALYZE subscription_plans;
ANALYZE subscription_plan_changes;
```

#### Step 4: Create Migration Dry-Run Script

**File: `scripts/phase1-migration-dryrun.sql`**

```sql
-- DRY RUN SCRIPT: Phase 1 Migration Validation
-- Run this to verify migration safety BEFORE applying

BEGIN;  -- Start transaction (will rollback at end)

-- Test 1: Check for NULL base_plan_id
SELECT 
  'FAIL' as status,
  'NULL base_plan_id found' as issue,
  id, name, base_plan_id
FROM subscription_plans
WHERE base_plan_id IS NULL
LIMIT 5;

-- Test 2: Check for duplicate latest versions
SELECT 
  'FAIL' as status,
  'Multiple latest versions for same base plan' as issue,
  base_plan_id,
  COUNT(*) as latest_count
FROM subscription_plans
WHERE is_latest_version = true
GROUP BY base_plan_id
HAVING COUNT(*) > 1;

-- Test 3: Check for version = 0 or negative
SELECT 
  'FAIL' as status,
  'Invalid version number' as issue,
  id, name, version
FROM subscription_plans
WHERE version <= 0;

-- Test 4: Check for active subscriptions referencing NULL basePlanId plans
SELECT 
  'FAIL' as status,
  'Active subscriptions on broken plans' as issue,
  us.id as subscription_id,
  sp.id as plan_id,
  sp.base_plan_id
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE sp.base_plan_id IS NULL
  AND us.status = 'active'
LIMIT 5;

-- Test 5: Check index creation impact
EXPLAIN ANALYZE
SELECT * FROM subscription_plans
WHERE base_plan_id = 'test-uuid'
  AND is_latest_version = true;

ROLLBACK;  -- Don't commit - this is just a dry run
```

#### Success Criteria

- ✅ All plans have non-NULL `basePlanId`
- ✅ All version = 1 plans are self-referencing
- ✅ Constraints prevent invalid states
- ✅ Indexes improve query performance by >50%
- ✅ No production downtime

#### Testing Checklist

- [ ] Run dry-run script on production snapshot
- [ ] Verify no orphaned plans
- [ ] Test constraint violations (should fail gracefully)
- [ ] Measure query performance before/after indexes
- [ ] Verify rollback script works

#### Time Estimate

- Migration writing: 2 hours
- Testing on staging: 4 hours
- Production deployment: 30 minutes
- Validation: 1 hour
- **Total: 7.5 hours**

---

### Phase 2: Repository Layer Updates (Week 2)

**Objective:** Update repository methods to handle versioning correctly

**Priority:** 🟡 HIGH - Required before service layer changes

#### Step 1: Update SubscriptionPlanRepository

**File: `server/repositories/subscription.repository.ts`**

**Add New Methods:**

```typescript
export interface ISubscriptionPlanRepository {
  // Existing methods...
  findAll(filters?: SubscriptionPlanFilters): Promise<SubscriptionPlan[]>;
  findActive(): Promise<SubscriptionPlan[]>;
  findById(id: string): Promise<SubscriptionPlan>;
  
  // NEW: Version-aware methods
  findLatestVersions(filters?: { isActive?: boolean }): Promise<SubscriptionPlan[]>;
  findAllVersionsOfPlan(basePlanId: string): Promise<SubscriptionPlan[]>;
  findPlanVersion(basePlanId: string, version: number): Promise<SubscriptionPlan | undefined>;
  getLatestVersionNumber(basePlanId: string): Promise<number>;
  
  // NEW: Versioning operations
  createNewVersion(basePlanId: string, updates: Partial<SubscriptionPlan>, adminId: string): Promise<SubscriptionPlan>;
  markAsNotLatest(planId: string): Promise<void>;
  
  // NEW: Deprecation/archival
  deprecatePlan(planId: string, successorPlanId?: string): Promise<SubscriptionPlan>;
  archivePlan(planId: string): Promise<SubscriptionPlan>;
  
  // NEW: Analytics
  getSubscriberCount(planId: string): Promise<number>;
  getActiveVersionCount(basePlanId: string): Promise<number>;
}
```

**Implementation:**

```typescript
// NEW METHOD: Find latest versions only (replaces findActive for public)
async findLatestVersions(filters?: { isActive?: boolean }): Promise<SubscriptionPlan[]> {
  try {
    const conditions: SQL[] = [eq(subscriptionPlans.isLatestVersion, true)];
    
    if (filters?.isActive !== undefined) {
      conditions.push(eq(subscriptionPlans.isActive, filters.isActive));
    }
    
    return await db
      .select()
      .from(subscriptionPlans)
      .where(and(...conditions))
      .orderBy(subscriptionPlans.tierLevel, subscriptionPlans.displayOrder) as SubscriptionPlan[];
  } catch (error) {
    handleDatabaseError(error, 'SubscriptionPlanRepository.findLatestVersions');
  }
}

// NEW METHOD: Get all versions of a specific plan family
async findAllVersionsOfPlan(basePlanId: string): Promise<SubscriptionPlan[]> {
  try {
    return await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.basePlanId, basePlanId))
      .orderBy(desc(subscriptionPlans.version)) as SubscriptionPlan[];
  } catch (error) {
    handleDatabaseError(error, 'SubscriptionPlanRepository.findAllVersionsOfPlan');
  }
}

// NEW METHOD: Get specific version
async findPlanVersion(basePlanId: string, version: number): Promise<SubscriptionPlan | undefined> {
  try {
    const results = await db
      .select()
      .from(subscriptionPlans)
      .where(
        and(
          eq(subscriptionPlans.basePlanId, basePlanId),
          eq(subscriptionPlans.version, version)
        )
      )
      .limit(1);
    return results[0] as SubscriptionPlan | undefined;
  } catch (error) {
    handleDatabaseError(error, 'SubscriptionPlanRepository.findPlanVersion');
  }
}

// NEW METHOD: Get latest version number for incrementing
async getLatestVersionNumber(basePlanId: string): Promise<number> {
  try {
    const result = await db
      .select({ maxVersion: sql<number>`MAX(${subscriptionPlans.version})` })
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.basePlanId, basePlanId));
    
    return result[0]?.maxVersion || 0;
  } catch (error) {
    handleDatabaseError(error, 'SubscriptionPlanRepository.getLatestVersionNumber');
  }
}

// NEW METHOD: Mark plan as not latest (used during versioning)
async markAsNotLatest(planId: string): Promise<void> {
  try {
    await db
      .update(subscriptionPlans)
      .set({ isLatestVersion: false, updatedAt: new Date() })
      .where(eq(subscriptionPlans.id, planId));
  } catch (error) {
    handleDatabaseError(error, 'SubscriptionPlanRepository.markAsNotLatest');
  }
}

// NEW METHOD: Get count of active versions for a plan family
async getActiveVersionCount(basePlanId: string): Promise<number> {
  try {
    const result = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(subscriptionPlans)
      .where(
        and(
          eq(subscriptionPlans.basePlanId, basePlanId),
          eq(subscriptionPlans.isActive, true)
        )
      );
    
    return result[0]?.count || 0;
  } catch (error) {
    handleDatabaseError(error, 'SubscriptionPlanRepository.getActiveVersionCount');
  }
}

// UPDATED: createNewVersion - now uses separate queries for clarity
async createNewVersion(
  basePlanId: string,
  updates: Partial<SubscriptionPlan>,
  adminId: string
): Promise<SubscriptionPlan> {
  try {
    return await db.transaction(async (tx) => {
      // Get current latest version
      const currentLatest = await tx
        .select()
        .from(subscriptionPlans)
        .where(
          and(
            eq(subscriptionPlans.basePlanId, basePlanId),
            eq(subscriptionPlans.isLatestVersion, true)
          )
        )
        .limit(1);
      
      if (!currentLatest[0]) {
        throw new NotFoundError('Base Plan', basePlanId);
      }
      
      // Calculate next version
      const nextVersion = await this.getLatestVersionNumber(basePlanId) + 1;
      
      // Mark current as not latest
      await tx
        .update(subscriptionPlans)
        .set({ isLatestVersion: false, updatedAt: new Date() })
        .where(eq(subscriptionPlans.id, currentLatest[0].id));
      
      // Create new version
      const newPlanData: any = {
        ...currentLatest[0],
        ...updates,
        id: undefined,  // Let DB generate
        basePlanId,     // Maintain family reference
        version: nextVersion,
        versionName: `v${nextVersion}`,
        isLatestVersion: true,
        deprecatedAt: null,  // Reset deprecation
        archivedAt: null,    // Reset archival
        successorPlanId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      delete newPlanData.id;
      
      const [newPlan] = await tx
        .insert(subscriptionPlans)
        .values(newPlanData)
        .returning();
      
      return newPlan as SubscriptionPlan;
    });
  } catch (error) {
    handleDatabaseError(error, 'SubscriptionPlanRepository.createNewVersion');
  }
}
```

**File Changes Summary:**

| Line Range | Change Type | Description |
|-----------|-------------|-------------|
| 13-30 | Interface Update | Add 8 new method signatures |
| 52-82 | Update | Modify findAll() to respect isLatestVersion filter |
| 84-100 | Keep | findActive() unchanged (returns all active) |
| 145-380 | New Methods | Add 8 new implementation methods |

#### Step 2: Update UserSubscriptionRepository

**File: `server/repositories/subscription.repository.ts`**

**Add Grandfathering Helper:**

```typescript
export interface IUserSubscriptionRepository {
  // Existing methods...
  
  // NEW: Grandfathering support
  updateGrandfatheredPrice(subscriptionId: string, newPrice: number): Promise<UserSubscription>;
  clearGrandfathering(subscriptionId: string): Promise<UserSubscription>;
  findGrandfatheredSubscriptions(planId: string): Promise<UserSubscription[]>;
}

// Implementation
async updateGrandfatheredPrice(subscriptionId: string, newPrice: number): Promise<UserSubscription> {
  try {
    const [updated] = await db
      .update(userSubscriptions)
      .set({
        grandfatheredPrice: newPrice.toString(),
        isGrandfathered: true,
        updatedAt: new Date()
      })
      .where(eq(userSubscriptions.id, subscriptionId))
      .returning();
    
    if (!updated) {
      throw new NotFoundError('UserSubscription', subscriptionId);
    }
    
    return updated as UserSubscription;
  } catch (error) {
    handleDatabaseError(error, 'UserSubscriptionRepository.updateGrandfatheredPrice');
  }
}

async clearGrandfathering(subscriptionId: string): Promise<UserSubscription> {
  try {
    const [updated] = await db
      .update(userSubscriptions)
      .set({
        grandfatheredPrice: null,
        grandfatheredUntil: null,
        isGrandfathered: false,
        updatedAt: new Date()
      })
      .where(eq(userSubscriptions.id, subscriptionId))
      .returning();
    
    if (!updated) {
      throw new NotFoundError('UserSubscription', subscriptionId);
    }
    
    return updated as UserSubscription;
  } catch (error) {
    handleDatabaseError(error, 'UserSubscriptionRepository.clearGrandfathering');
  }
}

async findGrandfatheredSubscriptions(planId: string): Promise<UserSubscription[]> {
  try {
    return await db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.planId, planId),
          eq(userSubscriptions.isGrandfathered, true),
          eq(userSubscriptions.status, 'active')
        )
      ) as UserSubscription[];
  } catch (error) {
    handleDatabaseError(error, 'UserSubscriptionRepository.findGrandfatheredSubscriptions');
  }
}
```

#### Step 3: Add Repository Tests

**File: `server/repositories/__tests__/subscription.repository.version.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SubscriptionPlanRepository } from '../subscription.repository';
import { db } from '../../db';
import { subscriptionPlans } from '@shared/schema';

describe('SubscriptionPlanRepository - Versioning', () => {
  let repository: SubscriptionPlanRepository;
  let testBasePlanId: string;
  
  beforeEach(async () => {
    repository = new SubscriptionPlanRepository();
    
    // Create base plan (version 1)
    const [basePlan] = await db
      .insert(subscriptionPlans)
      .values({
        name: 'Test Plan',
        price: '9999',
        currency: 'INR',
        features: ['Feature 1'],
        tierLevel: 1,
        maxUniversities: 5,
        maxCountries: 2,
        turnaroundDays: 7,
        supportType: 'email',
        universityTier: 'general',
        basePlanId: null as any,  // Will be updated
        version: 1,
        isLatestVersion: true,
      })
      .returning();
    
    // Self-reference
    await db
      .update(subscriptionPlans)
      .set({ basePlanId: basePlan.id })
      .where(eq(subscriptionPlans.id, basePlan.id));
    
    testBasePlanId = basePlan.id;
  });
  
  afterEach(async () => {
    // Cleanup
    await db.delete(subscriptionPlans).where(eq(subscriptionPlans.basePlanId, testBasePlanId));
  });
  
  it('should create new version correctly', async () => {
    const version2 = await repository.createNewVersion(
      testBasePlanId,
      { price: '14999', description: 'Price increased' },
      'admin-id-123'
    );
    
    expect(version2.basePlanId).toBe(testBasePlanId);
    expect(version2.version).toBe(2);
    expect(version2.price).toBe('14999');
    expect(version2.isLatestVersion).toBe(true);
    
    // Verify old version is no longer latest
    const version1 = await repository.findPlanVersion(testBasePlanId, 1);
    expect(version1?.isLatestVersion).toBe(false);
  });
  
  it('should find latest versions only', async () => {
    // Create version 2
    await repository.createNewVersion(testBasePlanId, { price: '14999' }, 'admin-id');
    
    const latestPlans = await repository.findLatestVersions({ isActive: true });
    
    expect(latestPlans.length).toBe(1);
    expect(latestPlans[0].version).toBe(2);
  });
  
  it('should get correct latest version number', async () => {
    let latestVersion = await repository.getLatestVersionNumber(testBasePlanId);
    expect(latestVersion).toBe(1);
    
    await repository.createNewVersion(testBasePlanId, { price: '14999' }, 'admin-id');
    
    latestVersion = await repository.getLatestVersionNumber(testBasePlanId);
    expect(latestVersion).toBe(2);
  });
  
  it('should find all versions of plan family', async () => {
    await repository.createNewVersion(testBasePlanId, { price: '14999' }, 'admin-id');
    await repository.createNewVersion(testBasePlanId, { price: '19999' }, 'admin-id');
    
    const allVersions = await repository.findAllVersionsOfPlan(testBasePlanId);
    
    expect(allVersions.length).toBe(3);
    expect(allVersions[0].version).toBe(3);  // Descending order
    expect(allVersions[1].version).toBe(2);
    expect(allVersions[2].version).toBe(1);
  });
  
  it('should prevent multiple latest versions per family', async () => {
    // This should be prevented by UNIQUE INDEX
    const version2 = await repository.createNewVersion(testBasePlanId, { price: '14999' }, 'admin-id');
    
    // Try to manually mark version 1 as latest (should fail)
    await expect(async () => {
      await db
        .update(subscriptionPlans)
        .set({ isLatestVersion: true })
        .where(eq(subscriptionPlans.version, 1));
    }).rejects.toThrow();  // Unique constraint violation
  });
});
```

#### Success Criteria

- ✅ All 8 new repository methods implemented
- ✅ Tests pass with 100% coverage for versioning logic
- ✅ Queries use proper indexes (EXPLAIN ANALYZE confirms)
- ✅ No breaking changes to existing methods

#### Time Estimate

- Repository updates: 6 hours
- Test writing: 4 hours
- Integration testing: 2 hours
- **Total: 12 hours (1.5 days)**

---

### Phase 3: Service Layer Refactoring (Week 2-3)

**Objective:** Update service methods to use versioning correctly

**Priority:** 🟡 HIGH - Core business logic

#### Step 1: Update SubscriptionService

**File: `server/services/domain/subscription.service.ts`**

**Method Changes:**

```typescript
export interface ISubscriptionService {
  // UPDATED: Now returns latest versions only
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  
  // NEW: Get all versions (admin only)
  getAllSubscriptionPlansWithVersions(): Promise<SubscriptionPlan[]>;
  
  // NEW: Get plan family
  getPlanVersions(basePlanId: string): Promise<SubscriptionPlan[]>;
  getPlanVersion(basePlanId: string, version: number): Promise<SubscriptionPlan | undefined>;
  
  // UPDATED: Now creates version instead of mutating
  updateSubscriptionPlan(
    id: string, 
    updates: Partial<SubscriptionPlan>, 
    adminId: string, 
    changeReason: string,  // NOW REQUIRED
    ipAddress?: string, 
    userAgent?: string
  ): Promise<SubscriptionPlan>;
  
  // NEW: Explicit versioning
  createPlanVersion(
    basePlanId: string, 
    updates: Partial<SubscriptionPlan>, 
    adminId: string, 
    releaseNotes?: string, 
    notifySubscribers?: boolean
  ): Promise<SubscriptionPlan>;
  
  // NEW: Price update with notification
  updatePlanPrice(
    basePlanId: string,
    newPrice: number,
    effectiveDate: Date,
    adminId: string,
    notifySubscribers: boolean
  ): Promise<SubscriptionPlan>;
  
  // NEW: Deprecation workflow
  deprecatePlan(planId: string, successorPlanId: string | undefined, adminId: string, reason: string): Promise<void>;
  archivePlan(planId: string, adminId: string, reason: string): Promise<void>;
  
  // NEW: Analytics
  getPlanAnalytics(planId: string): Promise<PlanAnalytics>;
}
```

**Implementation:**

```typescript
// UPDATED: getSubscriptionPlans() - now returns latest versions only
async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    // For public-facing queries, ONLY show latest versions
    return await this.subscriptionPlanRepository.findLatestVersions({ isActive: true });
  } catch (error) {
    return this.handleError(error, 'SubscriptionService.getSubscriptionPlans');
  }
}

// NEW: getAllSubscriptionPlansWithVersions() - for admin dashboard
async getAllSubscriptionPlansWithVersions(): Promise<SubscriptionPlan[]> {
  try {
    // Admin can see all versions
    return await this.subscriptionPlanRepository.findAll({ includeAllVersions: true });
  } catch (error) {
    return this.handleError(error, 'SubscriptionService.getAllSubscriptionPlansWithVersions');
  }
}

// CHANGED: updateSubscriptionPlan() - now DEPRECATED in favor of createPlanVersion
async updateSubscriptionPlan(
  id: string, 
  updates: Partial<SubscriptionPlan>, 
  adminId: string, 
  changeReason: string,  // NOW REQUIRED
  ipAddress?: string, 
  userAgent?: string
): Promise<SubscriptionPlan> {
  try {
    const plan = await this.subscriptionPlanRepository.findById(id);
    const subscriberCount = await this.subscriptionPlanRepository.getSubscriberCount(id);
    
    // CRITICAL: Check if plan has active subscribers
    if (subscriberCount > 0) {
      // Log warning but allow for backward compatibility
      console.warn(`[DEPRECATED] Updating plan ${id} with ${subscriberCount} active subscribers. Use createPlanVersion() instead.`);
      
      // Throw error if trying to change price
      if (updates.price && Number(updates.price) !== Number(plan.price)) {
        throw new InvalidOperationError(
          'update plan price',
          `Cannot change price for plan with ${subscriberCount} active subscribers. Use createPlanVersion() to preserve grandfathering.`
        );
      }
    }
    
    // For non-price changes or plans with no subscribers, allow direct update
    const fieldChanges = this.calculateFieldChanges(plan, updates);
    const updatedPlan = await this.subscriptionPlanRepository.update(id, updates);
    
    // Always log changes
    if (Object.keys(fieldChanges).length > 0) {
      await this.planAuditRepository.logChange({
        planId: id,
        changedBy: adminId,
        changeType: 'updated',
        fieldChanges,
        changeReason,
        ipAddress,
        userAgent
      });
    }
    
    return updatedPlan;
  } catch (error) {
    return this.handleError(error, 'SubscriptionService.updateSubscriptionPlan');
  }
}

// NEW: updatePlanPrice() - proper way to handle price changes
async updatePlanPrice(
  basePlanId: string,
  newPrice: number,
  effectiveDate: Date,
  adminId: string,
  notifySubscribers: boolean
): Promise<SubscriptionPlan> {
  try {
    const currentPlan = await this.subscriptionPlanRepository.findLatestVersion(basePlanId);
    
    if (!currentPlan) {
      throw new NotFoundError('Plan', basePlanId);
    }
    
    const subscriberCount = await this.subscriptionPlanRepository.getSubscriberCount(currentPlan.id);
    
    // Create new version
    const newVersion = await this.createPlanVersion(
      basePlanId,
      { price: newPrice.toString() },
      adminId,
      `Price change: ${currentPlan.price} → ${newPrice} (effective ${effectiveDate.toISOString().split('T')[0]})`,
      false  // Don't auto-notify (we'll do it manually with effective date)
    );
    
    // Send notifications if requested
    if (notifySubscribers && subscriberCount > 0) {
      const planNotificationService = getService<IPlanNotificationService>(TYPES.IPlanNotificationService);
      
      const notification = await planNotificationService.createPriceChangeNotification(
        currentPlan.id,
        Number(currentPlan.price),
        newPrice,
        effectiveDate,
        adminId
      );
      
      await planNotificationService.sendPlanNotifications(notification.id);
    }
    
    return newVersion;
  } catch (error) {
    return this.handleError(error, 'SubscriptionService.updatePlanPrice');
  }
}

// KEEP: createPlanVersion() - already good (from Phase 0)
// (No changes needed - lines 210-260)

// NEW: deprecatePlan()
async deprecatePlan(
  planId: string,
  successorPlanId: string | undefined,
  adminId: string,
  reason: string
): Promise<void> {
  try {
    const subscriberCount = await this.subscriptionPlanRepository.getSubscriberCount(planId);
    
    if (subscriberCount === 0) {
      throw new InvalidOperationError(
        'deprecate plan',
        'Cannot deprecate plan with no subscribers. Use archivePlan() instead.'
      );
    }
    
    // Mark as deprecated
    await this.subscriptionPlanRepository.deprecatePlan(planId, successorPlanId);
    
    // Audit log
    await this.planAuditRepository.logChange({
      planId,
      changedBy: adminId,
      changeType: 'deprecated',
      fieldChanges: {
        subscriberCount,
        successorPlanId,
        reason
      },
      changeReason: reason
    });
    
    // Create migration workflow if successor exists
    if (successorPlanId) {
      const planMigrationService = getService<IPlanMigrationService>(TYPES.IPlanMigrationService);
      
      await planMigrationService.createMigration({
        name: `Migration from ${planId} to ${successorPlanId}`,
        sourcePlanId: planId,
        targetPlanId: successorPlanId,
        migrationType: 'voluntary',
        startDate: new Date(),
        endDate: null  // Open-ended
      }, adminId);
    }
  } catch (error) {
    return this.handleError(error, 'SubscriptionService.deprecatePlan');
  }
}

// NEW: archivePlan()
async archivePlan(planId: string, adminId: string, reason: string): Promise<void> {
  try {
    await this.subscriptionPlanRepository.archivePlan(planId);
    
    await this.planAuditRepository.logChange({
      planId,
      changedBy: adminId,
      changeType: 'archived',
      fieldChanges: { archived: true, reason },
      changeReason: reason
    });
  } catch (error) {
    return this.handleError(error, 'SubscriptionService.archivePlan');
  }
}
```

#### Step 2: Update UserSubscriptionService

**File: `server/services/domain/user-subscription.service.ts`**

**Enhanced subscribeUserToPlan (Lines 272-353):**

```typescript
async subscribeUserToPlan(userId: string, planId: string, orderId?: string): Promise<UserSubscription> {
  try {
    // Validation...
    
    // Idempotency check...
    if (orderId) {
      const existingSubscription = await this.userSubscriptionRepo.findByOrderId(orderId);
      if (existingSubscription) {
        return existingSubscription;
      }
    }
    
    // Check if user can purchase...
    
    const plan = await this.subscriptionPlanRepo.findById(planId);
    if (!plan) {
      throw new NotFoundError('Subscription Plan', planId);
    }
    
    // ENHANCED: Verify plan is latest version (prevent accidental legacy plan purchases)
    if (!plan.isLatestVersion) {
      console.warn(`User ${userId} attempting to subscribe to non-latest plan version ${planId}. Redirecting to latest.`);
      
      const latestPlan = await this.subscriptionPlanRepo.findLatestVersion(plan.basePlanId);
      if (!latestPlan) {
        throw new NotFoundError('Latest Plan Version', plan.basePlanId);
      }
      
      plan = latestPlan;  // Use latest instead
    }
    
    const startDate = new Date();
    
    // If upgrade...
    if (validation.requiresUpgrade) {
      // ... existing upgrade logic ...
    }
    
    // Create new subscription with FULL GRANDFATHERING
    return await this.createSubscription({
      userId,
      planId: plan.id,
      orderId,
      status: 'active',
      startedAt: startDate,
      isLifetime: true,
      tierLevel: plan.tierLevel,
      lifetimeActivatedAt: new Date(),
      highestTierReached: plan.tierLevel,
      expiresAt: null,
      autoRenew: null,
      
      // CRITICAL: Full grandfathering implementation
      subscribedPlanSnapshot: plan as any,        // Immutable snapshot
      grandfatheredPrice: plan.price,             // Lock price
      isGrandfathered: true,                      // Mark as grandfathered
      grandfatheredUntil: null                    // Forever (null = no expiration)
    });
  } catch (error) {
    return this.handleError(error, 'UserSubscriptionService.subscribeUserToPlan');
  }
}
```

#### Step 3: Add Service Tests

**File: `server/services/domain/__tests__/subscription.service.version.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubscriptionService } from '../subscription.service';
import { InvalidOperationError } from '../../errors';

describe('SubscriptionService - Versioning', () => {
  let service: SubscriptionService;
  let mockPlanRepo: any;
  let mockAuditRepo: any;
  
  beforeEach(() => {
    mockPlanRepo = {
      findLatestVersion: vi.fn(),
      createNewVersion: vi.fn(),
      getSubscriberCount: vi.fn(),
      findById: vi.fn(),
    };
    
    mockAuditRepo = {
      logChange: vi.fn(),
    };
    
    service = new SubscriptionService(mockPlanRepo, {} as any, mockAuditRepo, {} as any);
  });
  
  it('should prevent price updates on plans with active subscribers', async () => {
    mockPlanRepo.findById.mockResolvedValue({
      id: 'plan-123',
      price: '9999',
      name: 'Test Plan'
    });
    
    mockPlanRepo.getSubscriberCount.mockResolvedValue(50);  // 50 active subscribers
    
    await expect(
      service.updateSubscriptionPlan(
        'plan-123',
        { price: '14999' },  // Price change attempt
        'admin-id',
        'Increasing price'
      )
    ).rejects.toThrow(InvalidOperationError);
    
    expect(mockPlanRepo.update).not.toHaveBeenCalled();
  });
  
  it('should allow non-price updates on plans with subscribers', async () => {
    mockPlanRepo.findById.mockResolvedValue({
      id: 'plan-123',
      price: '9999',
      description: 'Old description'
    });
    
    mockPlanRepo.getSubscriberCount.mockResolvedValue(50);
    mockPlanRepo.update.mockResolvedValue({
      id: 'plan-123',
      price: '9999',
      description: 'New description'
    });
    
    const updated = await service.updateSubscriptionPlan(
      'plan-123',
      { description: 'New description' },  // Non-price change
      'admin-id',
      'Updating description'
    );
    
    expect(updated.description).toBe('New description');
    expect(mockAuditRepo.logChange).toHaveBeenCalled();
  });
  
  it('should create new version for price changes', async () => {
    mockPlanRepo.findLatestVersion.mockResolvedValue({
      id: 'plan-v1',
      basePlanId: 'base-plan-123',
      version: 1,
      price: '9999'
    });
    
    mockPlanRepo.getSubscriberCount.mockResolvedValue(50);
    
    mockPlanRepo.createNewVersion.mockResolvedValue({
      id: 'plan-v2',
      basePlanId: 'base-plan-123',
      version: 2,
      price: '14999',
      isLatestVersion: true
    });
    
    const newVersion = await service.updatePlanPrice(
      'base-plan-123',
      14999,
      new Date('2025-12-01'),
      'admin-id',
      true  // Notify subscribers
    );
    
    expect(newVersion.version).toBe(2);
    expect(newVersion.price).toBe('14999');
    expect(mockAuditRepo.logChange).toHaveBeenCalled();
  });
});
```

#### Success Criteria

- ✅ Price changes blocked for plans with subscribers
- ✅ createPlanVersion() works end-to-end
- ✅ Grandfathering snapshot populated on new subscriptions
- ✅ All service tests pass
- ✅ Backward compatibility maintained for non-price updates

#### Time Estimate

- Service updates: 8 hours
- Test writing: 6 hours
- Integration testing: 4 hours
- **Total: 18 hours (2.25 days)**

---

### Phase 4: API & Controller Updates (Week 3-4)

**Objective:** Update API endpoints and validation

**Priority:** 🟡 MEDIUM - Required for client integration

#### Step 1: Update Admin Controller

**File: `server/controllers/admin.controller.ts`**

**Changes:**

```typescript
// UPDATED: updateSubscriptionPlan - add deprecation warning
async updateSubscriptionPlan(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const validatedData = updateSubscriptionPlanBodySchema.parse(req.body);
    const adminId = this.getUserId(req);
    const ipAddress = this.getIpAddress(req);
    const userAgent = req.headers['user-agent'];
    
    // NEW: Check subscriber count and warn
    const plan = await subscriptionService.getSubscriptionPlan(id);
    const subscriberCount = await subscriptionPlanRepository.getSubscriberCount(id);
    
    if (subscriberCount > 0 && validatedData.price && Number(validatedData.price) !== Number(plan.price)) {
      return this.sendError(
        res,
        400,
        'PRICE_CHANGE_NOT_ALLOWED',
        `Cannot change price for plan with ${subscriberCount} active subscribers`,
        {
          subscriberCount,
          recommendation: 'Use createPlanVersion() to preserve grandfathering for existing users',
          alternativeEndpoint: `/api/admin/subscription-plans/${plan.basePlanId}/versions`
        }
      );
    }
    
    const updated = await subscriptionService.updateSubscriptionPlan(
      id,
      validatedData,
      adminId,
      validatedData.changeReason || 'Admin update',
      ipAddress,
      userAgent
    );
    
    return this.sendSuccess(res, updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
    }
    return this.handleError(res, error, 'AdminController.updateSubscriptionPlan');
  }
}

// NEW: updatePlanPrice - dedicated price update endpoint
async updatePlanPrice(req: AuthenticatedRequest, res: Response) {
  try {
    const { basePlanId } = req.params;
    const { newPrice, effectiveDate, notifySubscribers } = req.body;
    const adminId = this.getUserId(req);
    
    const effectiveDateParsed = new Date(effectiveDate);
    
    if (isNaN(effectiveDateParsed.getTime())) {
      return this.sendError(res, 400, 'INVALID_DATE', 'effectiveDate must be a valid ISO 8601 date');
    }
    
    const newVersion = await subscriptionService.updatePlanPrice(
      basePlanId,
      Number(newPrice),
      effectiveDateParsed,
      adminId,
      notifySubscribers ?? true
    );
    
    return this.sendSuccess(res, {
      message: 'Price updated successfully',
      newVersion,
      effectiveDate: effectiveDateParsed,
      subscribersNotified: notifySubscribers ?? true
    });
  } catch (error) {
    return this.handleError(res, error, 'AdminController.updatePlanPrice');
  }
}

// UPDATED: createPlanVersion - already exists, enhance response
async createPlanVersion(req: AuthenticatedRequest, res: Response) {
  try {
    const { basePlanId } = req.params;
    const validatedData = createPlanVersionSchema.parse(req.body);
    const adminId = this.getUserId(req);
    
    const newVersion = await subscriptionService.createPlanVersion(
      basePlanId,
      validatedData.updates,
      adminId,
      validatedData.releaseNotes,
      validatedData.notifySubscribers ?? true
    );
    
    // Enhanced response
    return this.sendSuccess(res, {
      newVersion,
      previousVersion: validatedData.updates,
      subscribersAffected: await subscriptionPlanRepository.getSubscriberCount(basePlanId),
      message: `Version ${newVersion.version} created successfully`
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
    }
    return this.handleError(res, error, 'AdminController.createPlanVersion');
  }
}

// NEW: getPlanVersionHistory
async getPlanVersionHistory(req: AuthenticatedRequest, res: Response) {
  try {
    const { basePlanId } = req.params;
    
    const versions = await subscriptionService.getPlanVersions(basePlanId);
    
    // Enrich with subscriber counts
    const versionsWithCounts = await Promise.all(
      versions.map(async (version) => ({
        ...version,
        activeSubscribers: await subscriptionPlanRepository.getSubscriberCount(version.id)
      }))
    );
    
    return this.sendSuccess(res, {
      basePlanId,
      versions: versionsWithCounts,
      latestVersion: versionsWithCounts.find(v => v.isLatestVersion)
    });
  } catch (error) {
    return this.handleError(res, error, 'AdminController.getPlanVersionHistory');
  }
}

// NEW: deprecatePlan
async deprecatePlan(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { successorPlanId, reason } = req.body;
    const adminId = this.getUserId(req);
    
    if (!reason || reason.trim().length === 0) {
      return this.sendError(res, 400, 'REASON_REQUIRED', 'Deprecation reason is required');
    }
    
    await subscriptionService.deprecatePlan(id, successorPlanId, adminId, reason);
    
    return this.sendSuccess(res, {
      message: 'Plan deprecated successfully',
      deprecatedPlanId: id,
      successorPlanId: successorPlanId || null,
      reason
    });
  } catch (error) {
    return this.handleError(res, error, 'AdminController.deprecatePlan');
  }
}

// NEW: archivePlan
async archivePlan(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = this.getUserId(req);
    
    if (!reason || reason.trim().length === 0) {
      return this.sendError(res, 400, 'REASON_REQUIRED', 'Archive reason is required');
    }
    
    await subscriptionService.archivePlan(id, adminId, reason);
    
    return this.sendSuccess(res, {
      message: 'Plan archived successfully',
      archivedPlanId: id,
      reason
    });
  } catch (error) {
    return this.handleError(res, error, 'AdminController.archivePlan');
  }
}

// NEW: getPlanAnalytics
async getPlanAnalytics(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;
    
    const analytics = await subscriptionService.getPlanAnalytics(id);
    
    return this.sendSuccess(res, analytics);
  } catch (error) {
    return this.handleError(res, error, 'AdminController.getPlanAnalytics');
  }
}
```

#### Step 2: Update Routes

**File: `server/routes/admin.routes.ts`**

**Add New Routes:**

```typescript
// Subscription plan version management
router.post('/subscription-plans/:basePlanId/price', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.updatePlanPrice(req, res)));
router.get('/subscription-plans/:basePlanId/versions/history', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getPlanVersionHistory(req, res)));
router.post('/subscription-plans/:id/deprecate', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.deprecatePlan(req, res)));
router.post('/subscription-plans/:id/archive', csrfProtection, asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.archivePlan(req, res)));
router.get('/subscription-plans/:id/analytics', asyncHandler((req: AuthenticatedRequest, res: Response) => adminController.getPlanAnalytics(req, res)));
```

#### Step 3: Update Validation Schemas

**File: `server/services/validation/schemas.ts`**

**Add New Schemas:**

```typescript
// Price update schema
export const updatePlanPriceSchema = z.object({
  newPrice: z.number().positive('Price must be positive'),
  effectiveDate: z.string().datetime('Must be ISO 8601 date'),
  notifySubscribers: z.boolean().optional().default(true)
});

// Deprecation schema (already exists, enhance)
export const deprecatePlanSchema = z.object({
  successorPlanId: z.string().uuid().optional(),
  reason: z.string().min(10, 'Deprecation reason must be at least 10 characters').max(500)
});

// Archive schema (already exists, enhance)
export const archivePlanSchema = z.object({
  reason: z.string().min(10, 'Archive reason must be at least 10 characters').max(500)
});
```

#### Step 4: Update API Documentation

**File: `docs/API_SUBSCRIPTION_PLANS_V2.md` (NEW)**

```markdown
# Subscription Plans API v2 - Versioning & Grandfathering

## Overview

Version 2 of the Subscription Plans API introduces proper plan versioning, grandfathering, and deprecation workflows.

### Key Changes from v1

- ❌ **DEPRECATED**: `PUT /api/admin/subscription-plans/:id` for price changes
- ✅ **NEW**: `POST /api/admin/subscription-plans/:basePlanId/price` for price updates
- ✅ **NEW**: `GET /api/admin/subscription-plans/:basePlanId/versions/history` for version history
- ✅ **NEW**: `POST /api/admin/subscription-plans/:id/deprecate` for plan deprecation
- ✅ **NEW**: `POST /api/admin/subscription-plans/:id/archive` for plan archival

## Endpoints

### Update Plan Price

Creates a new plan version with updated pricing while preserving existing subscriber terms.

**Request:**
```http
POST /api/admin/subscription-plans/:basePlanId/price
Content-Type: application/json
X-CSRF-Token: <token>

{
  "newPrice": 14999,
  "effectiveDate": "2025-12-01T00:00:00Z",
  "notifySubscribers": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Price updated successfully",
    "newVersion": {
      "id": "plan-v2-uuid",
      "basePlanId": "base-plan-uuid",
      "version": 2,
      "price": "14999",
      "isLatestVersion": true,
      ...
    },
    "effectiveDate": "2025-12-01T00:00:00.000Z",
    "subscribersNotified": true
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_DATE",
    "message": "effectiveDate must be a valid ISO 8601 date"
  }
}
```

### Get Plan Version History

Returns all versions of a plan family with subscriber counts.

**Request:**
```http
GET /api/admin/subscription-plans/:basePlanId/versions/history
```

**Response:**
```json
{
  "success": true,
  "data": {
    "basePlanId": "base-plan-uuid",
    "latestVersion": {
      "id": "plan-v3-uuid",
      "version": 3,
      "price": "19999",
      "isLatestVersion": true,
      "activeSubscribers": 0
    },
    "versions": [
      {
        "id": "plan-v3-uuid",
        "version": 3,
        "price": "19999",
        "activeSubscribers": 0,
        "createdAt": "2025-11-07T00:00:00Z"
      },
      {
        "id": "plan-v2-uuid",
        "version": 2,
        "price": "14999",
        "activeSubscribers": 25,
        "createdAt": "2025-09-01T00:00:00Z"
      },
      {
        "id": "plan-v1-uuid",
        "version": 1,
        "price": "9999",
        "activeSubscribers": 150,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### Deprecate Plan

Marks a plan as deprecated and optionally creates a migration workflow.

**Request:**
```http
POST /api/admin/subscription-plans/:id/deprecate
Content-Type: application/json
X-CSRF-Token: <token>

{
  "successorPlanId": "new-plan-uuid",
  "reason": "Replacing with new tier structure to better align with customer needs"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Plan deprecated successfully",
    "deprecatedPlanId": "old-plan-uuid",
    "successorPlanId": "new-plan-uuid",
    "reason": "Replacing with new tier structure..."
  }
}
```

### Archive Plan

Archives a plan with no active subscribers.

**Request:**
```http
POST /api/admin/subscription-plans/:id/archive
Content-Type: application/json
X-CSRF-Token: <token>

{
  "reason": "No longer offered, all subscribers migrated to Premium tier"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Plan archived successfully",
    "archivedPlanId": "plan-uuid",
    "reason": "No longer offered..."
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "CANNOT_ARCHIVE",
    "message": "Cannot archive plan with 50 active subscribers"
  }
}
```

### Get Plan Analytics

Returns analytics for a specific plan version.

**Request:**
```http
GET /api/admin/subscription-plans/:id/analytics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "planId": "plan-v1-uuid",
    "planName": "Premium Plan",
    "version": 1,
    "activeSubscribers": 150,
    "totalRevenue": 1498500,
    "isDeprecated": false,
    "deprecatedAt": null,
    "successorPlan": null
  }
}
```

## Migration Guide

### v1 → v2 Migration

**Before (v1 - DEPRECATED):**
```typescript
// ❌ Don't do this anymore
await api.put(`/api/admin/subscription-plans/${planId}`, {
  price: 14999
});
```

**After (v2 - CORRECT):**
```typescript
// ✅ Use this instead
await api.post(`/api/admin/subscription-plans/${basePlanId}/price`, {
  newPrice: 14999,
  effectiveDate: '2025-12-01T00:00:00Z',
  notifySubscribers: true
});
```

### Backward Compatibility

- `PUT /api/admin/subscription-plans/:id` still works for NON-price updates
- Price changes via PUT will return 400 error with migration guidance
- Existing integrations will continue to work for description/feature updates
```

#### Success Criteria

- ✅ All new API endpoints functional
- ✅ Validation schemas prevent invalid requests
- ✅ Error responses include actionable guidance
- ✅ API documentation complete
- ✅ Backward compatibility maintained

#### Time Estimate

- Controller updates: 6 hours
- Route additions: 2 hours
- Validation schemas: 2 hours
- API documentation: 4 hours
- Testing: 6 hours
- **Total: 20 hours (2.5 days)**

---

### Phase 5: Client UI Updates (Week 4-5)

**Objective:** Update admin UI to support versioning workflow

**Priority:** 🟡 MEDIUM - User-facing changes

*(Detailed plan truncated for brevity - includes form updates, version history display, deprecation workflow UI, etc.)*

---

### Phase 6: Testing & Validation (Week 5-6)

**Objective:** Comprehensive testing of all versioning functionality

**Priority:** 🟡 HIGH - Quality assurance

*(Detailed plan truncated for brevity - includes unit tests, integration tests, E2E tests, performance tests, etc.)*

---

## Part 4: Additional Deliverables

### 4.1 Complete File Inventory

**Files to Modify:**

| File Path | Change Type | Lines Affected | Priority |
|-----------|-------------|----------------|----------|
| `shared/schema.ts` | CRITICAL FIX | Line 847 | 🔴 Phase 0 |
| `server/services/domain/subscription.service.ts` | Major Refactor | Lines 93-366 | 🟡 Phase 0, 3 |
| `server/repositories/subscription.repository.ts` | Interface Expansion | Lines 13-493 | 🟡 Phase 2 |
| `server/controllers/admin.controller.ts` | New Endpoints | Lines 1186-1500 | 🟡 Phase 4 |
| `server/routes/admin.routes.ts` | Route Additions | Lines 75-90 | 🟡 Phase 4 |
| `server/services/validation/schemas.ts` | New Schemas | End of file | 🟡 Phase 4 |
| `client/src/pages/SubscriptionPlans.tsx` | UI Enhancements | Lines 300-800 | 🟢 Phase 5 |

**Files to Create:**

| File Path | Purpose | Priority |
|-----------|---------|----------|
| `migrations/0020_backfill_base_plan_id.sql` | Fix existing data | 🟡 Phase 1 |
| `migrations/0021_add_versioning_constraints.sql` | Data integrity | 🟡 Phase 1 |
| `migrations/0022_add_performance_indexes.sql` | Query optimization | 🟡 Phase 1 |
| `docs/API_SUBSCRIPTION_PLANS_V2.md` | API documentation | 🟡 Phase 4 |
| `server/repositories/__tests__/subscription.repository.version.test.ts` | Repository tests | 🟡 Phase 2 |
| `server/services/domain/__tests__/subscription.service.version.test.ts` | Service tests | 🟡 Phase 3 |

### 4.2 Data Migration Strategy

**Pre-Migration Checklist:**

1. ✅ **Database Backup**
   ```bash
   pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backup_pre_phase1_$(date +%Y%m%d_%H%M%S).sql
   ```

2. ✅ **Dry Run on Staging**
   ```bash
   psql -h staging_db -f scripts/phase1-migration-dryrun.sql
   ```

3. ✅ **Count Affected Records**
   ```sql
   SELECT 
     COUNT(*) as total_plans,
     COUNT(*) FILTER (WHERE base_plan_id IS NULL) as null_base_plan_id,
     COUNT(*) FILTER (WHERE version IS NULL OR version <= 0) as invalid_version
   FROM subscription_plans;
   ```

4. ✅ **Check Active Subscriptions**
   ```sql
   SELECT 
     COUNT(DISTINCT us.id) as active_subscriptions,
     COUNT(DISTINCT sp.id) as plans_with_subscribers
   FROM user_subscriptions us
   JOIN subscription_plans sp ON us.plan_id = sp.id
   WHERE us.status = 'active';
   ```

**Migration Execution:**

```bash
# Phase 1: Schema Corrections
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/0020_backfill_base_plan_id.sql
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/0021_add_versioning_constraints.sql
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/0022_add_performance_indexes.sql

# Verify
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM subscription_plans WHERE base_plan_id IS NULL;"
# Expected: 0
```

**Rollback Plan:**

```sql
-- Emergency rollback if migrations fail
BEGIN;

-- Revert constraints
ALTER TABLE subscription_plans DROP CONSTRAINT IF EXISTS check_version_positive;
DROP INDEX IF EXISTS idx_one_latest_version_per_plan;
ALTER TABLE subscription_plans DROP CONSTRAINT IF EXISTS check_archived_not_latest;

-- Revert indexes
DROP INDEX IF EXISTS idx_plans_base_plan_version;
DROP INDEX IF EXISTS idx_plans_latest_active;
DROP INDEX IF EXISTS idx_plans_tier_level;
DROP INDEX IF EXISTS idx_plans_deprecated;
DROP INDEX IF EXISTS idx_plan_changes_plan_date;

-- Revert NOT NULL
ALTER TABLE subscription_plans ALTER COLUMN base_plan_id DROP NOT NULL;

COMMIT;

-- Restore from backup if needed
-- psql -h $DB_HOST -U $DB_USER -d $DB_NAME < backup_pre_phase1_TIMESTAMP.sql
```

### 4.3 Testing Checklist

**Phase 0 Testing:**
- [ ] Create new plan via admin UI
- [ ] Verify `basePlanId` equals `id`
- [ ] Check `version` = 1
- [ ] Confirm audit trail entry
- [ ] Test with existing plans (no regression)

**Phase 1 Testing:**
- [ ] Run migration dry-run
- [ ] Verify backfill (no NULL `basePlanId`)
- [ ] Test constraint violations
- [ ] Measure query performance (before/after indexes)
- [ ] Verify rollback script

**Phase 2 Testing:**
- [ ] Unit tests for all new repository methods
- [ ] Integration tests for transactions
- [ ] Performance tests for large datasets (>1000 plans)
- [ ] Concurrency tests (multiple admins creating versions)

**Phase 3 Testing:**
- [ ] Service layer unit tests
- [ ] Mock dependency injection tests
- [ ] Error handling tests
- [ ] Edge case tests (deprecated plans, archived plans)

**Phase 4 Testing:**
- [ ] API endpoint tests (Postman/Insomnia)
- [ ] Validation schema tests
- [ ] Error response tests
- [ ] CSRF protection tests

**Phase 5 Testing:**
- [ ] UI component tests (Vitest)
- [ ] Form validation tests
- [ ] Visual regression tests
- [ ] Accessibility tests (a11y)

**Phase 6 Testing:**
- [ ] End-to-end tests (Playwright/Cypress)
- [ ] Load tests (100 concurrent users)
- [ ] Smoke tests on production-like environment
- [ ] Rollback tests

### 4.4 Documentation Updates

**Required Documentation:**

1. **Admin User Guide**
   - How to create plan versions
   - How to update prices without breaking grandfathering
   - How to deprecate plans
   - How to view version history

2. **Developer Guide**
   - Versioning architecture
   - Database schema diagram
   - Service layer patterns
   - API contract changes

3. **API Reference**
   - New endpoints
   - Request/response examples
   - Error codes
   - Migration guide (v1 → v2)

4. **Runbooks**
   - Database migration procedures
   - Rollback procedures
   - Troubleshooting common issues
   - Emergency procedures

---

## Part 5: Risk Assessment & Mitigation

### Critical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Data loss during migration** | LOW | CRITICAL | Full backups + dry-run testing |
| **Production downtime** | MEDIUM | HIGH | Blue-green deployment + rollback plan |
| **Existing subscriptions broken** | LOW | CRITICAL | Grandfathering preserves all existing subscriptions |
| **Revenue loss from bugs** | MEDIUM | HIGH | Feature flags + gradual rollout |
| **Customer complaints** | MEDIUM | MEDIUM | 30-day advance notice + clear communication |

### Mitigation Strategies

1. **Feature Flags:**
   ```typescript
   const USE_PLAN_VERSIONING = process.env.FEATURE_PLAN_VERSIONING === 'true';
   
   if (USE_PLAN_VERSIONING) {
     return await createPlanVersion(...);
   } else {
     return await updatePlanDirectly(...);
   }
   ```

2. **Gradual Rollout:**
   - Week 1: Enable for 1 admin user (testing)
   - Week 2: Enable for all admins
   - Week 3: Enable notifications
   - Week 4: Full production

3. **Monitoring:**
   ```typescript
   // Add metrics
   metrics.increment('plan_version_created');
   metrics.timing('plan_version_creation_time', duration);
   ```

4. **Alerting:**
   - Alert if >10 plan creation failures/hour
   - Alert if migration query takes >5 seconds
   - Alert if constraint violations occur

---

## Part 6: Success Metrics

### Key Performance Indicators (KPIs)

1. **Technical Metrics:**
   - ✅ 0 plan creation failures
   - ✅ <500ms average query time for plan fetching
   - ✅ 100% uptime during deployment
   - ✅ 0 data integrity violations

2. **Business Metrics:**
   - ✅ 0 customer churn due to surprise price changes
   - ✅ 100% of existing subscribers grandfathered
   - ✅ >95% admin satisfaction with new versioning workflow
   - ✅ 50% reduction in support tickets related to pricing

3. **Code Quality Metrics:**
   - ✅ >90% test coverage for new code
   - ✅ 0 critical security vulnerabilities
   - ✅ <5% code duplication
   - ✅ All PRs reviewed by 2+ developers

---

## Part 7: Timeline & Resource Allocation

### Gantt Chart (6-8 Weeks)

```
Week 1:
├─ Phase 0: Hotfix [2 days] ████░░░░
├─ Phase 1: Schema [3 days] ░░░░███░

Week 2:
├─ Phase 2: Repository [5 days] █████░░░

Week 3:
├─ Phase 3: Service Layer [5 days] █████░░░

Week 4:
├─ Phase 4: API & Controller [5 days] █████░░░

Week 5:
├─ Phase 5: Client UI [5 days] █████░░░

Week 6:
├─ Phase 6: Testing [3 days] ███░░░░░
└─ Documentation [2 days] ░░░██░░░

Week 7-8: Buffer & Production Deployment
```

### Resource Requirements

| Role | Allocation | Duration |
|------|-----------|----------|
| Backend Developer | 100% | 6 weeks |
| Frontend Developer | 50% | 2 weeks (Phase 5) |
| QA Engineer | 50% | 2 weeks (Phase 6) |
| DevOps Engineer | 25% | Throughout (migrations) |
| Product Manager | 10% | Throughout (validation) |

---

## Conclusion

This comprehensive plan addresses the critical schema bug preventing plan creation and establishes a robust, industry-standard subscription versioning system. The phased approach minimizes risk while delivering immediate value.

**Next Steps:**
1. **Immediate:** Apply Phase 0 hotfix (1.5 hours)
2. **Short-term:** Execute Phase 1 migrations (1 week)
3. **Medium-term:** Complete Phases 2-4 (3 weeks)
4. **Long-term:** UI updates and full testing (2 weeks)

**Total Estimated Effort:** 6-8 weeks with proper testing and rollout

**Total Development Time:** ~200-250 hours (1.25-1.5 FTEs for 2 months)

---

**Document Status:** COMPLETE  
**Last Updated:** November 7, 2025  
**Next Review:** After Phase 0 deployment
