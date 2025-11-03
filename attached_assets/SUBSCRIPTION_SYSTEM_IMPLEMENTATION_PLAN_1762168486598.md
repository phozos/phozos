# 🎯 Subscription System Implementation Plan
## Lifetime Plans with Upgrade-Only & Razorpay Integration

**Document Version:** 1.0  
**Date:** November 3, 2025  
**Status:** Ready for Implementation  
**Deployment Target:** AWS Lightsail (Development: Replit)

---

## 📋 Executive Summary

This plan transforms EduPath's subscription system from a recurring payment model to a **lifetime subscription model** with **upgrade-only restrictions** and **Razorpay payment integration** (replacing Stripe).

### Current State
- ❌ Plans created in admin not showing on public page
- ❌ API endpoint mismatch between frontend/backend
- ❌ Database schema designed for recurring subscriptions
- ❌ No payment gateway fully implemented
- ❌ No tier-level system for upgrade validation
- ❌ FAQ promises downgrades (contradicts business requirements)

### Target State
- ✅ Lifetime subscription model (no expiration)
- ✅ Upgrade-only plan changes (no downgrades)
- ✅ Razorpay payment integration (Indian market)
- ✅ Tier-based plan hierarchy
- ✅ Plans displaying correctly on public page
- ✅ Production-ready for AWS Lightsail deployment

### Business Requirements
1. **Lifetime validity** - No monthly recurring charges
2. **Upgrade-only** - Users cannot downgrade once upgraded
3. **Razorpay integration** - Payment gateway for Indian market
4. **Login required** - Already implemented ✅
5. **No paying users yet** - Perfect timing for changes

---

## 🗺️ Implementation Roadmap

### Phase Dependencies
```
Phase 1 (Critical Fixes)
    ↓
Phase 2 (Database Schema)
    ↓
Phase 3 (Business Logic)
    ↓
Phase 4 (Razorpay Integration)
    ↓
Phase 5 (Testing & Documentation)
```

**Total Estimated Time:** 15-20 hours of development + 5 hours testing  
**Deployment Windows:** 5 separate deployments (can be combined into 2-3)

---

## 📦 PHASE 1: Critical Fixes (Immediate)

**⏱️ Time:** 2-3 hours  
**🎯 Goal:** Fix broken UI and routing, make plans visible  
**🚀 Priority:** CRITICAL - Blocks everything else

### 1.1 Fix API Endpoint Mismatch

**Problem:** Frontend calls `/api/subscription-plans`, backend serves `/api/subscription/plans`

#### Files to Modify

**File:** `client/src/pages/PublicPlans.tsx`  
**Lines:** 33-36  
**Change:**
```typescript
// BEFORE (❌ Wrong)
const { data: plans = [], isLoading } = useApiQuery<SubscriptionPlan[]>(
  ["/api/subscription-plans"],
  '/api/subscription-plans'
);

// AFTER (✅ Correct)
const { data: plans = [], isLoading } = useApiQuery<SubscriptionPlan[]>(
  ["/api/subscription/plans"],
  '/api/subscription/plans'
);
```

**Impact:** Plans will immediately appear on public page

---

### 1.2 Fix Missing Controller Method

**Problem:** `server/routes/subscription.routes.ts` line 18 calls non-existent `subscribe` method

#### Option A: Add Missing Method (Recommended)

**File:** `server/controllers/subscription.controller.ts`  
**Location:** After existing methods  
**Add:**
```typescript
/**
 * Subscribe user to a plan
 * 
 * @route POST /api/subscription/subscribe
 * @access Private (requires authentication)
 */
async subscribe(req: AuthenticatedRequest, res: Response) {
  try {
    const { planId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return this.handleError(res, new Error('User not authenticated'), 'SubscriptionController.subscribe');
    }

    const subscription = await this.userSubscriptionService.subscribeUserToPlan(userId, planId);
    
    return this.sendSuccessResponse(res, subscription, 'Subscription created successfully');
  } catch (error) {
    return this.handleError(res, error, 'SubscriptionController.subscribe');
  }
}
```

#### Option B: Remove Unused Route (If not needed)

**File:** `server/routes/subscription.routes.ts`  
**Line:** 18  
**Action:** Comment out or delete the route if subscribe endpoint is not used

---

### 1.3 Code Format Requirements

**TypeScript:**
- Use `async/await` (not callbacks)
- Strict type checking enabled
- No `any` types (use proper interfaces)

**Naming Conventions:**
- Controllers: PascalCase classes, camelCase methods
- Services: camelCase methods
- Routes: kebab-case URLs
- Variables: camelCase

**ESLint Rules:**
- Follow existing patterns in codebase
- Standardized API response format: `{ success: boolean, data?: T, error?: ApiError }`

---

### 1.4 Testing Strategy

**Unit Tests:**
```typescript
// File: server/controllers/__tests__/subscription.controller.test.ts

describe('SubscriptionController.subscribe', () => {
  it('should create subscription for authenticated user', async () => {
    const req = {
      user: { id: 'user-123' },
      body: { planId: 'plan-456' }
    };
    const res = mockResponse();
    
    await controller.subscribe(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(userSubscriptionService.subscribeUserToPlan).toHaveBeenCalledWith('user-123', 'plan-456');
  });
});
```

**Manual Testing:**
1. Visit public plans page: `http://localhost:5000/plans`
2. Verify plan cards appear
3. Test API endpoint: `curl http://localhost:5000/api/subscription/plans`
4. Check browser console for errors

---

### 1.5 AWS Lightsail Deployment

**Steps:**
```bash
# 1. SSH into Lightsail instance
ssh ubuntu@your-lightsail-ip

# 2. Navigate to app directory
cd ~/edupath-app

# 3. Pull latest code
git pull origin main

# 4. Rebuild application
npm run build

# 5. Restart PM2
pm2 restart edupath-production

# 6. Verify
pm2 logs edupath-production --lines 50
```

**Verification:**
- Visit: `https://yourdomain.com/plans`
- Check PM2 status: `pm2 status`
- Check logs: `pm2 logs --lines 100`

---

### 1.6 Rollback Plan

**If issues occur:**
```bash
# 1. Revert Git commits
git revert HEAD
git push origin main

# 2. Redeploy previous version
npm run build
pm2 restart edupath-production
```

**Estimated downtime:** < 2 minutes

---

## 📊 PHASE 2: Database Schema Evolution

**⏱️ Time:** 4-5 hours  
**🎯 Goal:** Add lifetime subscription support to database  
**🚀 Priority:** HIGH - Enables business logic changes

### 2.1 Schema Changes Overview

**New Fields to Add:**

**Table: `subscription_plans`**
```typescript
tierLevel: integer (NOT NULL)           // 1=basic, 2=pro, 3=premium, 4=elite
isLifetime: boolean (DEFAULT true)      // Lifetime vs recurring flag
```

**Table: `user_subscriptions`**
```typescript
isLifetime: boolean (DEFAULT true)      // User has lifetime access
tierLevel: integer                      // Current tier (for quick lookups)
lifetimeActivatedAt: timestamp          // When lifetime access granted
highestTierReached: integer             // Audit trail for upgrades
```

**Fields to Deprecate (Make Nullable):**
```typescript
expiresAt: timestamp (nullable)         // Keep for data migration, set NULL for lifetime
autoRenew: boolean (nullable)           // Not applicable to lifetime
```

---

### 2.2 Drizzle Migration Files

#### Step 1: Generate Migration

```bash
# Run in Replit terminal
npm run db:generate
```

This creates a new migration file in `migrations/` directory

#### Step 2: Review Generated SQL

**File:** `migrations/0002_add_lifetime_subscription.sql` (example)

```sql
-- Add tier system to subscription plans
ALTER TABLE "subscription_plans" 
  ADD COLUMN "tier_level" integer NOT NULL DEFAULT 1,
  ADD COLUMN "is_lifetime" boolean DEFAULT true;

-- Add unique constraint on tier_level
ALTER TABLE "subscription_plans" 
  ADD CONSTRAINT "subscription_plans_tier_level_unique" UNIQUE("tier_level");

-- Add lifetime fields to user subscriptions
ALTER TABLE "user_subscriptions"
  ADD COLUMN "is_lifetime" boolean DEFAULT true,
  ADD COLUMN "tier_level" integer,
  ADD COLUMN "lifetime_activated_at" timestamp DEFAULT NOW(),
  ADD COLUMN "highest_tier_reached" integer DEFAULT 1;

-- Make expiration fields nullable (for lifetime users)
ALTER TABLE "user_subscriptions"
  ALTER COLUMN "expires_at" DROP NOT NULL,
  ALTER COLUMN "auto_renew" DROP NOT NULL;

-- Update existing plans with tier levels (manual data migration)
-- You'll need to run this manually to assign tiers to existing plans
```

#### Step 3: Manual Data Migration Script

**File:** `server/db/migrations/seed-tier-levels.ts`

```typescript
import { db } from '../db';
import { subscriptionPlans } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Assign tier levels to existing subscription plans
 * Run this ONCE after applying the schema migration
 */
async function seedTierLevels() {
  try {
    // Fetch all plans ordered by price
    const plans = await db.select().from(subscriptionPlans).orderBy(subscriptionPlans.price);
    
    // Assign tier levels based on price order
    for (let i = 0; i < plans.length; i++) {
      await db
        .update(subscriptionPlans)
        .set({ tierLevel: i + 1 })
        .where(eq(subscriptionPlans.id, plans[i].id));
      
      console.log(`✅ Assigned tier ${i + 1} to plan: ${plans[i].name}`);
    }
    
    console.log('✅ Tier level seeding complete!');
  } catch (error) {
    console.error('❌ Error seeding tier levels:', error);
    throw error;
  }
}

seedTierLevels();
```

---

### 2.3 Schema File Updates

**File:** `shared/schema.ts`  
**Location:** Lines 816-844 (subscriptionPlans table)

```typescript
export const subscriptionPlans = pgTable("subscription_plans", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("INR"), // Changed from USD to INR
  description: text("description"),
  logo: text("logo").default("graduation-cap"),
  features: jsonb("features").$type<string[]>().notNull(),
  
  // Tier system (NEW)
  tierLevel: integer("tier_level").notNull().unique(), // 1=basic, 2=pro, 3=premium, etc.
  isLifetime: boolean("is_lifetime").default(true),     // All plans are lifetime by default
  
  maxUniversities: integer("max_universities").notNull(),
  maxCountries: integer("max_countries").notNull(),
  universityTier: universityTierEnum("university_tier").notNull().default("general"),
  supportType: supportTypeEnum("support_type").notNull().default("email"),
  turnaroundDays: integer("turnaround_days").notNull(),
  
  // Feature flags
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Subscriptions table (UPDATED)
export const userSubscriptions = pgTable("user_subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  planId: uuid("plan_id").references(() => subscriptionPlans.id).notNull(),
  status: subscriptionStatusEnum("status").notNull().default("pending"),
  
  // Lifetime subscription fields (NEW)
  isLifetime: boolean("is_lifetime").default(true),
  tierLevel: integer("tier_level"),                        // Current tier level
  lifetimeActivatedAt: timestamp("lifetime_activated_at"), // When lifetime access granted
  highestTierReached: integer("highest_tier_reached"),     // Audit trail
  
  // Legacy recurring fields (DEPRECATED - now nullable)
  startedAt: timestamp("started_at"),
  expiresAt: timestamp("expires_at"),                      // NULL for lifetime subscriptions
  autoRenew: boolean("auto_renew"),                        // NULL for lifetime subscriptions
  
  paymentReference: text("payment_reference"),
  paymentGateway: text("payment_gateway"),                 // "razorpay" for new subscriptions
  universitiesUsed: integer("universities_used").default(0),
  countriesUsed: integer("countries_used").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

---

### 2.4 Repository Updates

**File:** `server/repositories/subscription.repository.ts`

Add methods to query by tier level:

```typescript
export interface ISubscriptionPlanRepository {
  // ... existing methods ...
  findByTierLevel(tierLevel: number): Promise<SubscriptionPlan | undefined>;
  findHigherTiers(currentTierLevel: number): Promise<SubscriptionPlan[]>;
}

export class SubscriptionPlanRepository extends BaseRepository<SubscriptionPlan, InsertSubscriptionPlan> implements ISubscriptionPlanRepository {
  // ... existing methods ...
  
  async findByTierLevel(tierLevel: number): Promise<SubscriptionPlan | undefined> {
    try {
      const results = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.tierLevel, tierLevel))
        .limit(1);
      return results[0] as SubscriptionPlan | undefined;
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanRepository.findByTierLevel');
    }
  }
  
  async findHigherTiers(currentTierLevel: number): Promise<SubscriptionPlan[]> {
    try {
      return await db
        .select()
        .from(subscriptionPlans)
        .where(sql`${subscriptionPlans.tierLevel} > ${currentTierLevel}`)
        .orderBy(subscriptionPlans.tierLevel) as SubscriptionPlan[];
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanRepository.findHigherTiers');
    }
  }
}
```

---

### 2.5 Deployment Steps (Replit → AWS Lightsail)

#### Development (Replit)

```bash
# 1. Generate migration
npm run db:generate

# 2. Review generated SQL in migrations/ folder

# 3. Apply migration to development database
npm run db:migrate

# 4. Run tier level seeding script
tsx server/db/migrations/seed-tier-levels.ts

# 5. Verify in database
npm run db:studio
# Check that subscription_plans now has tier_level column
```

#### Production (AWS Lightsail)

```bash
# 1. SSH into server
ssh ubuntu@your-lightsail-ip

# 2. Navigate to app
cd ~/edupath-app

# 3. Pull latest code (includes migration files)
git pull origin main

# 4. Backup database first (CRITICAL!)
pg_dump $DATABASE_URL > ~/backup-$(date +%Y%m%d).sql

# 5. Run migration
npm run db:migrate:prod

# 6. Run tier seeding
tsx server/db/migrations/seed-tier-levels.ts

# 7. Verify migration
psql $DATABASE_URL -c "SELECT name, tier_level, is_lifetime FROM subscription_plans;"

# 8. Rebuild and restart
npm run build
pm2 restart edupath-production
```

---

### 2.6 Rollback Plan

**If migration fails:**

```bash
# 1. Restore from backup
psql $DATABASE_URL < ~/backup-YYYYMMDD.sql

# 2. Remove migration file
rm migrations/0002_add_lifetime_subscription.sql

# 3. Revert code changes
git revert HEAD
git push origin main

# 4. Redeploy
npm run build
pm2 restart edupath-production
```

**Create Rollback Migration:**

**File:** `migrations/0003_rollback_lifetime_subscription.sql`

```sql
-- Remove added columns
ALTER TABLE "subscription_plans" 
  DROP COLUMN IF EXISTS "tier_level",
  DROP COLUMN IF EXISTS "is_lifetime";

ALTER TABLE "user_subscriptions"
  DROP COLUMN IF EXISTS "is_lifetime",
  DROP COLUMN IF EXISTS "tier_level",
  DROP COLUMN IF EXISTS "lifetime_activated_at",
  DROP COLUMN IF EXISTS "highest_tier_reached";

-- Restore NOT NULL constraints
ALTER TABLE "user_subscriptions"
  ALTER COLUMN "expires_at" SET NOT NULL,
  ALTER COLUMN "auto_renew" SET NOT NULL;
```

---

### 2.7 Testing Strategy

**Database Integrity Tests:**

```typescript
// File: server/repositories/__tests__/subscription.repository.test.ts

describe('Tier Level Queries', () => {
  it('should find plan by tier level', async () => {
    const plan = await subscriptionPlanRepo.findByTierLevel(2);
    expect(plan).toBeDefined();
    expect(plan.tierLevel).toBe(2);
  });
  
  it('should return higher tier plans', async () => {
    const higherPlans = await subscriptionPlanRepo.findHigherTiers(1);
    expect(higherPlans.length).toBeGreaterThan(0);
    expect(higherPlans.every(p => p.tierLevel > 1)).toBe(true);
  });
});
```

**Manual Verification:**

```sql
-- Check tier levels are unique
SELECT tier_level, COUNT(*) FROM subscription_plans GROUP BY tier_level HAVING COUNT(*) > 1;
-- Should return 0 rows

-- Check lifetime flags
SELECT name, tier_level, is_lifetime FROM subscription_plans ORDER BY tier_level;

-- Check user subscriptions migrated correctly
SELECT COUNT(*) FROM user_subscriptions WHERE is_lifetime = true AND expires_at IS NULL;
```

---

## 🔧 PHASE 3: Business Logic Refactoring

**⏱️ Time:** 5-6 hours  
**🎯 Goal:** Implement lifetime subscription and upgrade-only logic  
**🚀 Priority:** HIGH - Core business requirements

### 3.1 Subscription Service Updates

**File:** `server/services/domain/user-subscription.service.ts`

#### 3.1.1 Update `subscribeUserToPlan` Method

**Location:** Lines ~182-213

```typescript
async subscribeUserToPlan(userId: string, planId: string): Promise<UserSubscription> {
  try {
    const errors: Record<string, string> = {};

    const userIdValidation = CommonValidators.validateUUID(userId, 'User ID');
    if (!userIdValidation.valid) {
      errors.userId = userIdValidation.error!;
    }

    const planIdValidation = CommonValidators.validateUUID(planId, 'Plan ID');
    if (!planIdValidation.valid) {
      errors.planId = planIdValidation.error!;
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationServiceError('Subscription', errors);
    }

    // Fetch the plan to get tier level
    const plan = await this.subscriptionPlanRepo.findById(planId);
    if (!plan) {
      throw new NotFoundError('Subscription plan', planId);
    }

    // Create LIFETIME subscription (no expiry)
    return await this.createSubscription({
      userId,
      planId,
      status: 'active',
      isLifetime: true,                           // NEW: Lifetime flag
      tierLevel: plan.tierLevel,                  // NEW: Store current tier
      lifetimeActivatedAt: new Date(),            // NEW: Activation timestamp
      highestTierReached: plan.tierLevel,         // NEW: Track highest tier
      startedAt: new Date(),
      expiresAt: null,                            // NEW: NULL for lifetime (was 30-day expiry)
      autoRenew: null,                            // NEW: NULL for lifetime
    });
  } catch (error) {
    return this.handleError(error, 'UserSubscriptionService.subscribeUserToPlan');
  }
}
```

#### 3.1.2 Add Upgrade Validation Method

**Location:** After `cancelSubscription` method

```typescript
/**
 * Validate if upgrade is allowed based on tier levels
 * Lifetime subscriptions can ONLY upgrade (not downgrade)
 */
async validateUpgrade(
  currentSubscription: UserSubscription,
  targetPlanId: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    // Fetch target plan
    const targetPlan = await this.subscriptionPlanRepo.findById(targetPlanId);
    if (!targetPlan) {
      return { allowed: false, reason: 'Target plan not found' };
    }

    // Get current plan for tier comparison
    const currentPlan = await this.subscriptionPlanRepo.findById(currentSubscription.planId);
    if (!currentPlan) {
      return { allowed: false, reason: 'Current plan not found' };
    }

    // Check if target tier is higher than current tier
    if (targetPlan.tierLevel <= currentPlan.tierLevel) {
      return {
        allowed: false,
        reason: `Cannot ${targetPlan.tierLevel < currentPlan.tierLevel ? 'downgrade' : 'switch to same tier'}. Only upgrades to higher tiers are allowed.`
      };
    }

    // Upgrade is allowed
    return { allowed: true };
  } catch (error) {
    return this.handleError(error, 'UserSubscriptionService.validateUpgrade');
  }
}
```

#### 3.1.3 Update `upgradeSubscription` Method

**Location:** Lines ~142-180

```typescript
async upgradeSubscription(userId: string, newPlanId: string): Promise<UserSubscription> {
  try {
    const errors: Record<string, string> = {};

    const userIdValidation = CommonValidators.validateUUID(userId, 'User ID');
    if (!userIdValidation.valid) {
      errors.userId = userIdValidation.error!;
    }

    const planIdValidation = CommonValidators.validateUUID(newPlanId, 'Plan ID');
    if (!planIdValidation.valid) {
      errors.planId = planIdValidation.error!;
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationServiceError('Subscription Upgrade', errors);
    }

    const currentSubscription = await this.userSubscriptionRepo.findByUser(userId);
    
    if (currentSubscription) {
      // VALIDATE UPGRADE (NEW)
      const validation = await this.validateUpgrade(currentSubscription, newPlanId);
      if (!validation.allowed) {
        throw new InvalidOperationError(validation.reason || 'Upgrade not allowed');
      }

      // Fetch new plan to get tier level
      const newPlan = await this.subscriptionPlanRepo.findById(newPlanId);
      if (!newPlan) {
        throw new NotFoundError('Subscription plan', newPlanId);
      }

      // Update subscription with new tier
      const updated = await this.userSubscriptionRepo.update(currentSubscription.id, {
        planId: newPlanId,
        status: 'active',
        tierLevel: newPlan.tierLevel,                           // NEW: Update tier level
        highestTierReached: newPlan.tierLevel,                  // NEW: Update highest tier
        startedAt: new Date(),                                  // Reset start date to now
        expiresAt: null,                                        // Maintain lifetime (no expiry)
        lifetimeActivatedAt: currentSubscription.lifetimeActivatedAt || new Date(), // Preserve original activation
      });
      return updated!;
    } else {
      // No existing subscription - create new one
      return await this.subscribeUserToPlan(userId, newPlanId);
    }
  } catch (error) {
    return this.handleError(error, 'UserSubscriptionService.upgradeSubscription');
  }
}
```

---

### 3.2 Add Upgrade-Only Enforcement

**File:** `server/controllers/subscription.controller.ts`

Add validation in controller before calling service:

```typescript
/**
 * Upgrade user subscription (upgrade-only, no downgrades)
 * 
 * @route POST /api/subscription/upgrade
 * @access Private
 */
async upgradeSubscription(req: AuthenticatedRequest, res: Response) {
  try {
    const { planId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return this.sendErrorResponse(res, 'User not authenticated', 401);
    }

    if (!planId) {
      return this.sendErrorResponse(res, 'Plan ID is required', 400);
    }

    // Upgrade subscription (service handles validation)
    const subscription = await this.userSubscriptionService.upgradeSubscription(userId, planId);
    
    return this.sendSuccessResponse(res, subscription, 'Subscription upgraded successfully');
  } catch (error) {
    // Handle InvalidOperationError for downgrade attempts
    if (error instanceof InvalidOperationError) {
      return this.sendErrorResponse(res, error.message, 403); // Forbidden
    }
    return this.handleError(res, error, 'SubscriptionController.upgradeSubscription');
  }
}
```

---

### 3.3 Frontend Updates

#### 3.3.1 Update FAQ Content

**File:** `client/src/pages/PublicPlans.tsx`  
**Lines:** 38-63 (faqItems array)

```typescript
const faqItems = [
  {
    question: "Can I change my plan anytime?",
    answer: "You can upgrade to a higher plan at any time! All our plans are lifetime access - once purchased, you have permanent access to all features. Note: Downgrades are not available to protect the value of your investment."
  },
  {
    question: "Are these really lifetime plans?",
    answer: "Yes! Unlike monthly subscriptions, you pay once and get lifetime access. Your plan never expires, and you'll continue to receive updates and support. You can upgrade to unlock more universities and premium features whenever you want."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major payment methods through Razorpay - credit cards, debit cards, UPI, net banking, and digital wallets. All payments are secured with industry-standard encryption."
  },
  {
    question: "Do you offer student discounts?",
    answer: "Yes! We offer special pricing for students. Contact our support team with your valid student ID to learn about current promotions and discounts."
  },
  {
    question: "What if I'm not satisfied?",
    answer: "We offer a 30-day money-back guarantee. If you're not completely satisfied with your purchase, contact us within 30 days for a full refund - no questions asked."
  },
  {
    question: "How does upgrading work?",
    answer: "Upgrading is instant! When you upgrade to a higher tier, you'll immediately gain access to additional universities, countries, and premium features. The price difference is calculated, and your lifetime access continues uninterrupted."
  }
];
```

#### 3.3.2 Filter Upgrade Options in Plans Page

**File:** `client/src/pages/PublicPlans.tsx`

Add helper function to show only upgrade options:

```typescript
// Add after the component definition
interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  currency: string;
  description: string;
  logo: string;
  features: string[];
  tierLevel: number;        // NEW: Add tier level
  isLifetime: boolean;      // NEW: Add lifetime flag
  maxUniversities: number;
  maxCountries: number;
  supportType: string;
  isActive: boolean;
  displayOrder: number;
}

// Inside component, before the return statement
const { data: currentSubscription } = useApiQuery<UserSubscription | null>(
  ['/api/subscription/user/current'],
  '/api/subscription/user/current'
);

// Filter plans to show only upgrades if user has a subscription
const availablePlans = currentSubscription
  ? plans.filter(plan => plan.tierLevel > (currentSubscription.tierLevel || 0))
  : plans;

// Then in the JSX, use availablePlans instead of plans
{availablePlans
  .filter(plan => plan.isActive)
  .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
  .map((plan, index) => {
    // ... existing rendering logic
  })}
```

#### 3.3.3 Update Plan Card UI

Add badge for lifetime access:

```typescript
<CardHeader className="text-center pb-6 relative z-10">
  {/* NEW: Lifetime Badge */}
  {plan.isLifetime && (
    <Badge className="absolute top-4 right-4 bg-green-500 text-white">
      Lifetime Access
    </Badge>
  )}
  
  {/* Existing plan icon and title */}
  <div className="mb-6 flex justify-center">
    {/* ... existing icon code ... */}
  </div>
</CardHeader>
```

---

### 3.4 Testing Strategy

#### Unit Tests

**File:** `server/services/domain/__tests__/user-subscription.service.test.ts`

```typescript
describe('UserSubscriptionService - Lifetime & Upgrade-Only', () => {
  describe('subscribeUserToPlan', () => {
    it('should create lifetime subscription with no expiry', async () => {
      const subscription = await service.subscribeUserToPlan(userId, planId);
      
      expect(subscription.isLifetime).toBe(true);
      expect(subscription.expiresAt).toBeNull();
      expect(subscription.autoRenew).toBeNull();
      expect(subscription.lifetimeActivatedAt).toBeDefined();
    });
  });

  describe('validateUpgrade', () => {
    it('should allow upgrade from tier 1 to tier 2', async () => {
      const currentSub = createMockSubscription({ tierLevel: 1 });
      const validation = await service.validateUpgrade(currentSub, tier2PlanId);
      
      expect(validation.allowed).toBe(true);
    });

    it('should block downgrade from tier 3 to tier 2', async () => {
      const currentSub = createMockSubscription({ tierLevel: 3 });
      const validation = await service.validateUpgrade(currentSub, tier2PlanId);
      
      expect(validation.allowed).toBe(false);
      expect(validation.reason).toContain('downgrade');
    });

    it('should block switching to same tier', async () => {
      const currentSub = createMockSubscription({ tierLevel: 2 });
      const validation = await service.validateUpgrade(currentSub, sameTierPlanId);
      
      expect(validation.allowed).toBe(false);
      expect(validation.reason).toContain('same tier');
    });
  });

  describe('upgradeSubscription', () => {
    it('should update tier level and highest tier reached', async () => {
      const upgraded = await service.upgradeSubscription(userId, tier3PlanId);
      
      expect(upgraded.tierLevel).toBe(3);
      expect(upgraded.highestTierReached).toBe(3);
      expect(upgraded.expiresAt).toBeNull(); // Still lifetime
    });

    it('should throw error when attempting downgrade', async () => {
      await expect(
        service.upgradeSubscription(userWithTier3, tier1PlanId)
      ).rejects.toThrow('downgrade');
    });
  });
});
```

#### Integration Tests

**File:** `server/__tests__/integration/subscription-flow.test.ts`

```typescript
describe('Subscription Flow Integration', () => {
  it('should complete full upgrade journey: tier 1 → 2 → 3', async () => {
    // 1. Subscribe to tier 1
    const tier1Sub = await request(app)
      .post('/api/subscription/subscribe')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ planId: tier1PlanId })
      .expect(200);

    expect(tier1Sub.body.data.tierLevel).toBe(1);

    // 2. Upgrade to tier 2
    const tier2Sub = await request(app)
      .post('/api/subscription/upgrade')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ planId: tier2PlanId })
      .expect(200);

    expect(tier2Sub.body.data.tierLevel).toBe(2);
    expect(tier2Sub.body.data.highestTierReached).toBe(2);

    // 3. Upgrade to tier 3
    const tier3Sub = await request(app)
      .post('/api/subscription/upgrade')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ planId: tier3PlanId })
      .expect(200);

    expect(tier3Sub.body.data.tierLevel).toBe(3);
    expect(tier3Sub.body.data.highestTierReached).toBe(3);

    // 4. Attempt downgrade (should fail)
    const downgradeFail = await request(app)
      .post('/api/subscription/upgrade')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ planId: tier1PlanId })
      .expect(403);

    expect(downgradeFail.body.error).toContain('downgrade');
  });
});
```

---

### 3.5 Deployment Steps

Same as Phase 2, but ensure:

1. Database migration from Phase 2 is applied first
2. Frontend and backend deployed together
3. PM2 restart includes both services

```bash
# After pulling latest code
npm run build
pm2 restart edupath-production
pm2 logs edupath-production --lines 100
```

---

### 3.6 Rollback Plan

```bash
# Revert service changes
git revert <commit-hash-for-phase3>
git push origin main

# Redeploy
cd ~/edupath-app
git pull origin main
npm run build
pm2 restart edupath-production
```

**Note:** Database schema from Phase 2 stays intact (backward compatible)

---

## 💳 PHASE 4: Razorpay Integration

**⏱️ Time:** 6-8 hours  
**🎯 Goal:** Replace Stripe with Razorpay payment gateway  
**🚀 Priority:** MEDIUM - Enables actual payments

### 4.1 Prerequisites

**Required:**
- Razorpay account (https://razorpay.com)
- API keys from Razorpay dashboard
- Webhook secret generated in Razorpay settings

**Get Credentials:**
1. Login to Razorpay Dashboard
2. Go to Settings → API Keys
3. Generate **Key ID** and **Key Secret**
4. Go to Settings → Webhooks → Create webhook
5. Copy **Webhook Secret**

---

### 4.2 Install Dependencies

**Add to package.json:**

```bash
npm install razorpay crypto
npm install --save-dev @types/razorpay
```

---

### 4.3 Environment Variables

**Development (.env in Replit):**

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

**Production (AWS Lightsail):**

```bash
# SSH into server
ssh ubuntu@your-lightsail-ip

# Edit .env file
cd ~/edupath-app
nano .env

# Add Razorpay credentials (use LIVE keys for production)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

# Save and restart
pm2 restart edupath-production
```

---

### 4.4 Backend Implementation

#### 4.4.1 Create Razorpay Service

**File:** `server/services/integration/razorpay.service.ts` (NEW FILE)

```typescript
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '../config';

export interface RazorpayOrderOptions {
  amount: number;        // in paise (100 paise = 1 INR)
  currency: string;      // "INR"
  receipt: string;       // unique receipt ID
  notes?: Record<string, any>;
}

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
}

export class RazorpayService {
  private razorpay: Razorpay;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
  }

  /**
   * Create Razorpay order for subscription purchase
   */
  async createOrder(options: RazorpayOrderOptions): Promise<RazorpayOrder> {
    try {
      const order = await this.razorpay.orders.create({
        amount: options.amount,
        currency: options.currency,
        receipt: options.receipt,
        notes: options.notes,
      });

      return order as RazorpayOrder;
    } catch (error: any) {
      throw new Error(`Razorpay order creation failed: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature for security
   */
  verifyWebhookSignature(
    webhookBody: string,
    signature: string
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.webhookSecret)
      .update(webhookBody)
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Verify payment signature after checkout
   */
  verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
  ): boolean {
    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(payload)
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Fetch payment details
   */
  async getPaymentDetails(paymentId: string) {
    try {
      return await this.razorpay.payments.fetch(paymentId);
    } catch (error: any) {
      throw new Error(`Failed to fetch payment: ${error.message}`);
    }
  }
}

export const razorpayService = new RazorpayService();
```

#### 4.4.2 Update Config

**File:** `server/config/index.ts`

Add Razorpay configuration:

```typescript
// Add to config schema
const configSchema = z.object({
  // ... existing config ...
  
  razorpay: z.object({
    keyId: z.string().min(1, 'RAZORPAY_KEY_ID is required'),
    keySecret: z.string().min(1, 'RAZORPAY_KEY_SECRET is required'),
    webhookSecret: z.string().min(1, 'RAZORPAY_WEBHOOK_SECRET is required'),
  }),
});

// Add to config object
export const config = {
  // ... existing config ...
  
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID!,
    keySecret: process.env.RAZORPAY_KEY_SECRET!,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET!,
  },
};
```

#### 4.4.3 Create Payment Controller

**File:** `server/controllers/payment.controller.ts`

```typescript
import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { AuthenticatedRequest } from '../types';
import { razorpayService } from '../services/integration/razorpay.service';
import { userSubscriptionService } from '../services/domain/user-subscription.service';
import { subscriptionPlanRepository } from '../repositories/subscription.repository';

export class PaymentController extends BaseController {
  /**
   * Create Razorpay order for subscription purchase
   * 
   * @route POST /api/payment/create-order
   * @access Private
   */
  async createOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const { planId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return this.sendErrorResponse(res, 'User not authenticated', 401);
      }

      // Fetch plan details
      const plan = await subscriptionPlanRepository.findById(planId);
      if (!plan) {
        return this.sendErrorResponse(res, 'Plan not found', 404);
      }

      // Convert price to paise (Razorpay uses smallest currency unit)
      const amountInPaise = Math.round(parseFloat(plan.price) * 100);

      // Create Razorpay order
      const order = await razorpayService.createOrder({
        amount: amountInPaise,
        currency: plan.currency || 'INR',
        receipt: `receipt_${userId}_${planId}_${Date.now()}`,
        notes: {
          userId,
          planId,
          planName: plan.name,
          isLifetime: true,
        },
      });

      return this.sendSuccessResponse(res, {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID, // Send to frontend for checkout
      }, 'Order created successfully');
    } catch (error) {
      return this.handleError(res, error, 'PaymentController.createOrder');
    }
  }

  /**
   * Verify payment and activate subscription
   * 
   * @route POST /api/payment/verify
   * @access Private
   */
  async verifyPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const { orderId, paymentId, signature, planId } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return this.sendErrorResponse(res, 'User not authenticated', 401);
      }

      // Verify signature
      const isValid = razorpayService.verifyPaymentSignature(
        orderId,
        paymentId,
        signature
      );

      if (!isValid) {
        return this.sendErrorResponse(res, 'Invalid payment signature', 400);
      }

      // Fetch payment details from Razorpay
      const paymentDetails = await razorpayService.getPaymentDetails(paymentId);

      // Check if payment was successful
      if (paymentDetails.status !== 'captured') {
        return this.sendErrorResponse(res, 'Payment not captured', 400);
      }

      // Activate subscription
      const subscription = await userSubscriptionService.subscribeUserToPlan(
        userId,
        planId
      );

      // Update subscription with payment reference
      await userSubscriptionService.updateSubscription(subscription.id, {
        paymentReference: paymentId,
        paymentGateway: 'razorpay',
        status: 'active',
      });

      return this.sendSuccessResponse(res, {
        subscription,
        paymentId,
      }, 'Payment verified and subscription activated');
    } catch (error) {
      return this.handleError(res, error, 'PaymentController.verifyPayment');
    }
  }

  /**
   * Handle Razorpay webhooks
   * 
   * @route POST /api/payment/webhook
   * @access Public (but verified via signature)
   */
  async handleWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      const webhookBody = JSON.stringify(req.body);

      // Verify webhook signature
      const isValid = razorpayService.verifyWebhookSignature(webhookBody, signature);

      if (!isValid) {
        return this.sendErrorResponse(res, 'Invalid webhook signature', 400);
      }

      const event = req.body.event;
      const payload = req.body.payload;

      // Handle different webhook events
      switch (event) {
        case 'payment.captured':
          await this.handlePaymentCaptured(payload.payment.entity);
          break;

        case 'payment.failed':
          await this.handlePaymentFailed(payload.payment.entity);
          break;

        case 'order.paid':
          await this.handleOrderPaid(payload.order.entity);
          break;

        default:
          console.log(`Unhandled webhook event: ${event}`);
      }

      // Always respond 200 OK to Razorpay
      return res.status(200).send('OK');
    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(500).send('Internal server error');
    }
  }

  private async handlePaymentCaptured(payment: any) {
    console.log('Payment captured:', payment.id);
    // Additional logging or processing if needed
  }

  private async handlePaymentFailed(payment: any) {
    console.log('Payment failed:', payment.id);
    // Send notification to user, update subscription status
  }

  private async handleOrderPaid(order: any) {
    console.log('Order paid:', order.id);
    // Update order status in database if tracked separately
  }
}

export const paymentController = new PaymentController();
```

#### 4.4.4 Create Payment Routes

**File:** `server/routes/payment.routes.ts` (NEW FILE)

```typescript
import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';
import { AuthenticatedRequest } from '../types';
import { Response } from 'express';

const router = Router();

// Protected routes (require authentication)
router.post('/create-order', requireAuth, asyncHandler((req: AuthenticatedRequest, res: Response) => 
  paymentController.createOrder(req, res)
));

router.post('/verify', requireAuth, asyncHandler((req: AuthenticatedRequest, res: Response) => 
  paymentController.verifyPayment(req, res)
));

// Public webhook endpoint (verified via signature)
router.post('/webhook', asyncHandler((req: AuthenticatedRequest, res: Response) => 
  paymentController.handleWebhook(req, res)
));

export default router;
```

**Register routes in `server/routes/index.ts`:**

```typescript
import paymentRoutes from './payment.routes';

// ... existing routes ...

app.use('/api/payment', paymentRoutes);
```

---

### 4.5 Frontend Implementation

#### 4.5.1 Install Razorpay Checkout

Add Razorpay script to index.html:

**File:** `index.html`

```html
<head>
  <!-- Existing head content -->
  
  <!-- Razorpay Checkout Script -->
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
```

#### 4.5.2 Create Payment Hook

**File:** `client/src/hooks/useRazorpayCheckout.tsx` (NEW FILE)

```typescript
import { useState } from 'react';
import { useApiMutation } from './useApiMutation';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: any) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
}

export function useRazorpayCheckout() {
  const [isProcessing, setIsProcessing] = useState(false);
  
  const createOrderMutation = useApiMutation('/api/payment/create-order');
  const verifyPaymentMutation = useApiMutation('/api/payment/verify');

  const initiatePayment = async (planId: string, planName: string, userInfo?: {
    name?: string;
    email?: string;
    contact?: string;
  }) => {
    try {
      setIsProcessing(true);

      // Step 1: Create Razorpay order
      const orderResponse = await createOrderMutation.mutateAsync({ planId });
      const { orderId, amount, currency, keyId } = orderResponse.data;

      // Step 2: Open Razorpay checkout
      const options: RazorpayOptions = {
        key: keyId,
        amount: amount,
        currency: currency,
        order_id: orderId,
        name: 'EduPath',
        description: `Lifetime Access - ${planName}`,
        handler: async (response: any) => {
          // Step 3: Verify payment on server
          try {
            await verifyPaymentMutation.mutateAsync({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              planId: planId,
            });

            // Payment successful
            window.location.href = '/dashboard/subscriptions?payment=success';
          } catch (error) {
            console.error('Payment verification failed:', error);
            window.location.href = '/dashboard/subscriptions?payment=failed';
          }
        },
        prefill: userInfo,
        theme: {
          color: '#6366f1', // Your brand color
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

      razorpay.on('payment.failed', (response: any) => {
        console.error('Payment failed:', response.error);
        window.location.href = '/dashboard/subscriptions?payment=failed';
      });
    } catch (error) {
      console.error('Payment initiation failed:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    initiatePayment,
    isProcessing,
  };
}
```

#### 4.5.3 Update Plan Card Component

**File:** `client/src/pages/PublicPlans.tsx`

```typescript
import { useRazorpayCheckout } from '../hooks/useRazorpayCheckout';
import { useAuth } from '../hooks/useAuth';

export default function PublicPlans() {
  const { initiatePayment, isProcessing } = useRazorpayCheckout();
  const { user } = useAuth();
  
  // ... existing code ...

  const handlePurchasePlan = async (plan: SubscriptionPlan) => {
    if (!user) {
      // Redirect to login
      window.location.href = '/auth/login?redirect=/plans';
      return;
    }

    try {
      await initiatePayment(plan.id, plan.name, {
        name: user.fullName,
        email: user.email,
        contact: user.phone,
      });
    } catch (error) {
      console.error('Purchase failed:', error);
      // Show error toast/notification
    }
  };

  return (
    <div>
      {/* ... existing plan cards ... */}
      
      {plans.map((plan) => (
        <Card key={plan.id}>
          {/* ... existing plan details ... */}
          
          <CardFooter>
            <Button
              onClick={() => handlePurchasePlan(plan)}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? 'Processing...' : isFree ? 'Get Started Free' : 'Purchase Lifetime Access'}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
```

---

### 4.6 Razorpay Dashboard Configuration

1. **Login to Razorpay Dashboard**
2. **Navigate to Settings → Webhooks**
3. **Create New Webhook:**
   - **URL:** `https://yourdomain.com/api/payment/webhook`
   - **Secret:** Copy this and add to `.env` as `RAZORPAY_WEBHOOK_SECRET`
   - **Events to subscribe:**
     - payment.captured
     - payment.failed
     - order.paid

4. **Test with Test Mode:**
   - Use test API keys (starts with `rzp_test_`)
   - Test card: `4111 1111 1111 1111`
   - Any CVV, future expiry date
   - OTP: `754081`

---

### 4.7 Remove Stripe References

**Files to update:**

1. `server/services/validation/schemas.ts` - Update payment gateway enum:
```typescript
export const paymentGatewaySchema = z.enum(['razorpay', 'paypal']); // Remove 'stripe'
```

2. Search and replace:
```bash
# Find all Stripe references
grep -r "stripe\|Stripe\|STRIPE" server/ client/

# Replace or remove Stripe-specific code
```

---

### 4.8 Testing Strategy

#### Manual Testing (Test Mode)

```bash
# 1. Start dev server
npm run dev

# 2. Navigate to plans page
open http://localhost:5000/plans

# 3. Click "Purchase" on any plan

# 4. Razorpay checkout should open

# 5. Use test card details:
Card: 4111 1111 1111 1111
CVV: 123
Expiry: 12/25
OTP: 754081

# 6. Verify subscription activated in dashboard
```

#### Webhook Testing (Local)

Use ngrok to expose local server:

```bash
# Install ngrok
npm install -g ngrok

# Start tunnel
ngrok http 5000

# Copy ngrok URL (e.g., https://abc123.ngrok.io)
# Update Razorpay webhook URL to: https://abc123.ngrok.io/api/payment/webhook
```

#### Integration Tests

**File:** `server/__tests__/integration/payment-flow.test.ts`

```typescript
import request from 'supertest';
import { app } from '../../index';

describe('Payment Flow', () => {
  it('should create Razorpay order', async () => {
    const response = await request(app)
      .post('/api/payment/create-order')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ planId: testPlanId })
      .expect(200);

    expect(response.body.data).toHaveProperty('orderId');
    expect(response.body.data).toHaveProperty('keyId');
  });

  it('should verify valid payment signature', async () => {
    // Mock Razorpay response
    const mockSignature = generateMockSignature(orderId, paymentId);
    
    const response = await request(app)
      .post('/api/payment/verify')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        orderId,
        paymentId,
        signature: mockSignature,
        planId: testPlanId,
      })
      .expect(200);

    expect(response.body.data.subscription.status).toBe('active');
  });

  it('should reject invalid payment signature', async () => {
    const response = await request(app)
      .post('/api/payment/verify')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        orderId,
        paymentId,
        signature: 'invalid_signature',
        planId: testPlanId,
      })
      .expect(400);

    expect(response.body.error).toContain('Invalid');
  });
});
```

---

### 4.9 Deployment Steps

#### Development (Replit)

```bash
# 1. Add Razorpay credentials to .env
echo "RAZORPAY_KEY_ID=rzp_test_xxxxx" >> .env
echo "RAZORPAY_KEY_SECRET=xxxxx" >> .env
echo "RAZORPAY_WEBHOOK_SECRET=xxxxx" >> .env

# 2. Install dependencies
npm install

# 3. Test locally
npm run dev
```

#### Production (AWS Lightsail)

```bash
# 1. SSH into server
ssh ubuntu@your-lightsail-ip

# 2. Add Razorpay LIVE credentials to .env
cd ~/edupath-app
nano .env

# Add these lines:
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx

# 3. Pull latest code
git pull origin main

# 4. Install new dependencies
npm install

# 5. Build
npm run build

# 6. Restart PM2
pm2 restart edupath-production

# 7. Verify
pm2 logs edupath-production
```

**Configure Razorpay Production Webhook:**
- URL: `https://yourdomain.com/api/payment/webhook`
- Use production webhook secret
- Test webhook from Razorpay dashboard

---

### 4.10 Rollback Plan

```bash
# Revert to Stripe or no payment gateway
git revert <commit-hash-phase4>
git push origin main

# Remove Razorpay from .env
nano .env
# Delete RAZORPAY_* lines

# Redeploy
cd ~/edupath-app
git pull origin main
npm install
npm run build
pm2 restart edupath-production
```

---

## ✅ PHASE 5: Testing & Documentation

**⏱️ Time:** 3-4 hours  
**🎯 Goal:** Comprehensive testing and documentation updates  
**🚀 Priority:** MEDIUM - Ensures quality and maintainability

### 5.1 Comprehensive Testing Checklist

#### 5.1.1 Unit Tests

**Run all tests:**
```bash
npm test
npm run test:coverage
```

**Target Coverage:**
- Services: >80%
- Controllers: >70%
- Repositories: >90%

#### 5.1.2 Integration Tests

**Subscription Flow:**
```bash
npm run test:integration
```

Test scenarios:
- [ ] Create new subscription (tier 1)
- [ ] Upgrade tier 1 → tier 2
- [ ] Upgrade tier 2 → tier 3
- [ ] Attempt downgrade tier 3 → tier 1 (should fail)
- [ ] Attempt same-tier switch (should fail)
- [ ] Check lifetime flags are set correctly
- [ ] Verify no expiration dates

#### 5.1.3 Manual End-to-End Testing

**User Journey:**

1. **Public Plans Page**
   - [ ] Plans display correctly
   - [ ] Prices shown in INR
   - [ ] "Lifetime Access" badges visible
   - [ ] FAQ shows upgrade-only messaging
   - [ ] No downgrade references

2. **Purchase Flow (Unauthenticated)**
   - [ ] Click "Purchase" redirects to login
   - [ ] After login, redirects back to plans
   - [ ] Purchase button works

3. **Purchase Flow (Authenticated)**
   - [ ] Click "Purchase" opens Razorpay checkout
   - [ ] Order details correct (amount, plan name)
   - [ ] Test payment succeeds
   - [ ] Redirects to success page
   - [ ] Subscription shows in user dashboard

4. **Upgrade Flow**
   - [ ] Only higher-tier plans shown as upgrade options
   - [ ] Current plan hidden or marked as "Current"
   - [ ] Upgrade button calculates price difference
   - [ ] Razorpay checkout shows upgrade amount
   - [ ] Upgrade succeeds
   - [ ] Tier level updated in database

5. **Downgrade Prevention**
   - [ ] Lower-tier plans not shown in UI
   - [ ] API returns 403 if downgrade attempted
   - [ ] Error message is user-friendly

6. **Webhook Processing**
   - [ ] Trigger test webhook from Razorpay dashboard
   - [ ] Check server logs for "Payment captured"
   - [ ] Verify subscription status in database

---

### 5.2 Documentation Updates

#### 5.2.1 Update AWS Lightsail Deployment Guide

**File:** `AWS_LIGHTSAIL_DEPLOYMENT_GUIDE.md`

Add new section after "Step 10: Create Environment Variables File":

```markdown
### Razorpay Configuration (Required for Payments)

EduPath uses Razorpay for processing subscription payments. You need to configure Razorpay credentials in your production environment.

#### Step 1: Get Razorpay Credentials

1. **Create Razorpay Account**
   - Visit: https://razorpay.com
   - Sign up for a business account
   - Complete KYC verification

2. **Get API Keys**
   - Login to Razorpay Dashboard
   - Go to **Settings → API Keys**
   - Click **Generate Live Key**
   - Copy **Key ID** and **Key Secret**
   - **Important:** Never share these keys publicly!

3. **Configure Webhook**
   - In Razorpay Dashboard, go to **Settings → Webhooks**
   - Click **Create Webhook**
   - **Webhook URL:** `https://yourdomain.com/api/payment/webhook`
   - **Active Events:** Select these:
     - payment.captured
     - payment.failed
     - order.paid
   - Click **Create Webhook**
   - Copy the **Webhook Secret** (shown after creation)

#### Step 2: Add to .env File

Edit your `.env` file on the server:

\`\`\`bash
nano .env
\`\`\`

Add these lines:

\`\`\`env
# Razorpay Payment Gateway
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
\`\`\`

**Save and restart:**

\`\`\`bash
pm2 restart edupath-production
\`\`\`

#### Step 3: Test Payment Flow

1. Visit your plans page: `https://yourdomain.com/plans`
2. Select a plan and click "Purchase"
3. Complete payment using Razorpay checkout
4. Verify subscription activated in your dashboard
```

#### 5.2.2 Update replit.md

**File:** `replit.md`

Add to "Recent Changes" section:

```markdown
**November 3, 2025 - Subscription System Overhaul**
- ✅ Migrated from recurring to lifetime subscription model
- ✅ Implemented tier-based plan hierarchy (upgrade-only, no downgrades)
- ✅ Integrated Razorpay payment gateway (replaced Stripe)
- ✅ Fixed API endpoint mismatch (plans now display correctly)
- ✅ Added lifetime subscription fields to database schema
- ✅ Updated FAQ and UI messaging for lifetime model
- **Impact:** Production-ready subscription system for Indian market with lifetime access
```

Add to "External Dependencies → Payment Processing":

```markdown
- **Payment Processing:** Razorpay (for Indian market)
  - Order creation and verification
  - Webhook signature validation
  - Support for UPI, cards, net banking, wallets
```

#### 5.2.3 Create Admin Documentation

**File:** `docs/SUBSCRIPTION_ADMIN_GUIDE.md` (NEW FILE)

```markdown
# Subscription System Admin Guide

## Overview

EduPath uses a **lifetime subscription model** with **upgrade-only** restrictions. This means:
- Users pay once for permanent access
- Users can upgrade to higher tiers anytime
- **Downgrades are not allowed** (by design)

## Plan Tier Hierarchy

Plans are organized by tier level (integer):

| Tier | Plan Name | Price | Universities | Countries |
|------|-----------|-------|--------------|-----------|
| 1    | Explorer  | ₹999  | 3            | 1         |
| 2    | Achiever  | ₹2,999| 10           | 3         |
| 3    | Champion  | ₹9,999| 25           | 10        |
| 4    | Legend    | ₹29,999| Unlimited   | Unlimited |

**Important:** Tier levels must be unique and sequential.

## Creating a New Plan

1. Login as admin
2. Go to **Admin Dashboard → Subscriptions**
3. Click **Create Plan**
4. Fill in details:
   - **Name:** Plan display name
   - **Price:** Amount in INR (e.g., 2999 for ₹2,999)
   - **Tier Level:** Unique integer (higher = better plan)
   - **Max Universities:** Number allowed
   - **Max Countries:** Number allowed
   - **Features:** List of included features
5. Click **Save**

## Editing Plans

**⚠️ Warning:** Changing tier levels affects upgrade/downgrade logic

- **Price changes:** Safe to modify anytime
- **Tier level changes:** Only if no users have this plan
- **Feature changes:** Safe to modify (reflects immediately)

## Handling Customer Requests

### "Can I downgrade to a lower plan?"

**Answer:** "Our subscription model offers lifetime access, which means your investment is protected. Downgrades aren't available, but you'll continue to enjoy all features of your current plan forever. You can upgrade anytime to unlock additional features!"

### "My payment failed, but I was charged"

1. Check Razorpay dashboard for payment status
2. If payment status = "captured" but subscription not active:
   - Manually activate subscription in database
   - Update `payment_reference` with Razorpay payment ID
3. If payment status = "failed":
   - Amount will auto-refund in 5-7 business days
   - User can retry purchase

### "I want a refund"

1. Check purchase date (30-day money-back guarantee)
2. Login to Razorpay dashboard
3. Find payment by payment ID or email
4. Click **Refund** → Enter amount → Confirm
5. Mark subscription as "cancelled" in admin dashboard

## Troubleshooting

### Plans not showing on public page

**Check:**
1. Plan is marked as "Active" (`is_active = true`)
2. Frontend API calls correct endpoint: `/api/subscription/plans`
3. Clear browser cache

### Payment verification failing

**Check:**
1. Razorpay credentials in `.env` are correct
2. Webhook secret matches Razorpay dashboard
3. Webhook URL is accessible: `https://yourdomain.com/api/payment/webhook`

### User can't upgrade

**Check:**
1. Target plan has higher `tier_level` than current plan
2. User is authenticated
3. Check server logs for error messages

## Database Queries

### View all active subscriptions
\`\`\`sql
SELECT 
  u.email,
  sp.name as plan_name,
  us.tier_level,
  us.lifetime_activated_at,
  us.status
FROM user_subscriptions us
JOIN users u ON us.user_id = u.id
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.status = 'active'
ORDER BY us.created_at DESC;
\`\`\`

### Find users by plan
\`\`\`sql
SELECT COUNT(*) 
FROM user_subscriptions 
WHERE plan_id = 'plan-uuid-here' AND status = 'active';
\`\`\`

### Manually activate subscription
\`\`\`sql
UPDATE user_subscriptions 
SET 
  status = 'active',
  payment_reference = 'pay_XXXXX',
  payment_gateway = 'razorpay'
WHERE id = 'subscription-uuid-here';
\`\`\`
```

---

### 5.3 Code Quality Checks

**Run before deploying:**

```bash
# TypeScript type checking
npm run type-check

# ESLint
npm run lint:api-routes

# Build verification
npm run build:production
```

**Fix any errors before deploying to production.**

---

### 5.4 Performance Testing

**Load Test Subscription Endpoints:**

```bash
# Install autocannon
npm install -g autocannon

# Test plan listing
autocannon -c 100 -d 30 http://localhost:5000/api/subscription/plans

# Test authenticated endpoints (with auth token)
autocannon -c 50 -d 30 -H "Authorization: Bearer YOUR_TOKEN" -m POST -b '{"planId":"xxx"}' http://localhost:5000/api/payment/create-order
```

**Target Metrics:**
- Response time: <200ms (p95)
- Throughput: >1000 req/sec
- Error rate: <0.1%

---

### 5.5 Security Audit

**Checklist:**

- [ ] Razorpay webhook signature verification enabled
- [ ] Payment API keys not exposed in frontend
- [ ] CSRF protection on payment endpoints
- [ ] Rate limiting on payment creation (max 10 orders/min per user)
- [ ] SQL injection prevention (using parameterized queries)
- [ ] XSS prevention (input sanitization)
- [ ] HTTPS enforced in production
- [ ] Environment variables properly secured

---

### 5.6 Final Deployment Checklist

**Before Going Live:**

- [ ] All Phase 1-4 changes deployed
- [ ] Database migrations applied
- [ ] Razorpay LIVE credentials configured
- [ ] Webhook URL set in Razorpay dashboard
- [ ] All tests passing
- [ ] Code quality checks passed
- [ ] Documentation updated
- [ ] Backup created
- [ ] Rollback plan ready
- [ ] Team notified of deployment
- [ ] Monitoring alerts configured

**After Deployment:**

- [ ] Smoke test all critical paths
- [ ] Monitor PM2 logs for errors
- [ ] Check Razorpay webhook logs
- [ ] Test one real payment (small amount)
- [ ] Verify subscription activation
- [ ] Monitor server resources (CPU, RAM)
- [ ] Check error tracking (if configured)

---

## 📊 Success Metrics

**Track these KPIs after deployment:**

| Metric | Target | Monitoring Tool |
|--------|--------|----------------|
| Plan page load time | <2 seconds | Browser DevTools |
| Payment success rate | >95% | Razorpay Dashboard |
| Subscription activation | 100% | Database queries |
| Upgrade conversion | Track baseline | Analytics |
| Downgrade attempts blocked | 100% | Server logs |
| API error rate | <1% | PM2 logs |

---

## 🆘 Emergency Contacts

**If critical issues occur:**

1. **Razorpay Support:**
   - Dashboard: https://dashboard.razorpay.com/support
   - Email: support@razorpay.com
   - Phone: +91-80-6890-6890

2. **AWS Lightsail Support:**
   - Console: https://console.aws.amazon.com/support
   - Documentation: https://docs.aws.amazon.com/lightsail

3. **Database Issues:**
   - Check PM2 logs: `pm2 logs`
   - Database console: Supabase/Neon dashboard

---

## 🎯 Summary

This implementation plan provides a complete roadmap to:

1. ✅ Fix immediate bugs (Phase 1)
2. ✅ Add lifetime subscription support (Phase 2)
3. ✅ Enforce upgrade-only logic (Phase 3)
4. ✅ Integrate Razorpay payments (Phase 4)
5. ✅ Ensure quality through testing (Phase 5)

**Estimated Total Time:** 20-25 hours development + testing  
**Deployments:** 5 phases (can be combined into 2-3 deployments)  
**Risk Level:** Low (no paying users yet, backward compatible)

**Recommended Approach:**
- Deploy Phase 1 immediately (critical bug fix)
- Combine Phases 2-3 into one deployment (schema + logic)
- Deploy Phase 4 separately (payment integration)
- Phase 5 is continuous (testing + documentation)

---

**Document End**
