# Subscription Plan Features Management - Comprehensive Investigation Report

**Date:** November 07, 2025  
**Platform:** EduPath International Education Platform  
**Scope:** Analysis of feature management in subscription plans and handling of existing subscribers

---

## Executive Summary

### Critical Findings

**Current State:**
- ✅ Features stored in dual format: JSONB array + Boolean flags
- ✅ Grandfathering infrastructure exists (added in migration 0013)
- ✅ Plan versioning support implemented (added in migration 0012)
- ✅ Audit trail for plan changes exists
- ⚠️ **Plan snapshot mechanism partially implemented but underutilized**
- ❌ **No feature-specific access control logic**
- ❌ **No feature versioning within snapshot**
- ❌ **Direct feature mutation affects existing subscribers**

**Impact of Adding/Removing Features:**
- 🔴 **HIGH RISK**: Current implementation would affect ALL existing subscribers immediately
- 🔴 **CRITICAL GAP**: No feature access validation in the codebase
- 🟡 **MEDIUM RISK**: Grandfathering exists for pricing but unclear for features
- 🟢 **LOW RISK**: Infrastructure foundation exists, needs implementation

---

## 1. Current Feature Storage Architecture

### 1.1 Database Schema Analysis

**Subscription Plans Table (`subscription_plans`)**

```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  
  -- DUAL FEATURE STORAGE MECHANISM
  features JSONB NOT NULL,                      -- Dynamic text array
  
  -- Boolean Feature Flags (25 specific features)
  includeLoanAssistance BOOLEAN DEFAULT false,
  includeVisaSupport BOOLEAN DEFAULT false,
  includeCounselorSession BOOLEAN DEFAULT false,
  includeScholarshipPlanning BOOLEAN DEFAULT false,
  includeMockInterview BOOLEAN DEFAULT false,
  includeExpertEditing BOOLEAN DEFAULT false,
  includePostAdmitSupport BOOLEAN DEFAULT false,
  includeDedicatedManager BOOLEAN DEFAULT false,
  includeNetworkingEvents BOOLEAN DEFAULT false,
  includeFlightAccommodation BOOLEAN DEFAULT false,
  isBusinessFocused BOOLEAN DEFAULT false,
  
  -- Structural Attributes
  maxUniversities INTEGER NOT NULL,
  maxCountries INTEGER NOT NULL,
  universityTier university_tier_enum NOT NULL,
  supportType support_type_enum NOT NULL,
  turnaroundDays INTEGER NOT NULL,
  
  -- Versioning (Phase 1)
  basePlanId UUID NOT NULL REFERENCES subscription_plans(id),
  version INTEGER NOT NULL DEFAULT 1,
  versionName VARCHAR(50),
  isLatestVersion BOOLEAN DEFAULT true,
  deprecatedAt TIMESTAMP,
  archivedAt TIMESTAMP,
  successorPlanId UUID,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Observations:**

1. **Dual Feature Storage:**
   - `features` JSONB: User-facing feature descriptions (e.g., "Apply to up to 4 Universities")
   - Boolean flags: Backend feature toggles (e.g., `includeLoanAssistance`)
   - **Problem:** No clear mapping between JSONB features and boolean flags

2. **Feature Types:**
   ```typescript
   // From seed-subscription-plans.ts
   features: [
     "Apply to up to 4 Universities",           // Quota feature
     "Apply in 1 Country",                      // Quota feature
     "University Shortlisting (Public/General)", // Access feature
     "SOP & LOR Templates + Counselor Tips",    // Service feature
     "Visa Filing Checklist & Support",         // Service feature
     "Document Upload & Review",                // Service feature
     "Full Loan Assistance",                    // Service feature
     "Email Support"                            // Support feature
   ]
   ```

3. **Feature Categories:**
   - **Quota Features**: maxUniversities, maxCountries
   - **Access Features**: universityTier (general, top500, top200, top100, ivy_league)
   - **Service Features**: Boolean flags (loan assistance, visa support, etc.)
   - **Support Features**: supportType (email, whatsapp, phone, premium)
   - **Display Features**: JSONB text array (user-facing descriptions)

### 1.2 User Subscriptions Schema

**User Subscriptions Table (`user_subscriptions`)**

```sql
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY,
  userId UUID NOT NULL,
  planId UUID NOT NULL REFERENCES subscription_plans(id),
  
  -- Grandfathering Support (Phase 2)
  subscribedPlanSnapshot JSONB,              -- ✅ Immutable plan snapshot
  grandfatheredPrice DECIMAL(10,2),          -- ✅ Locked price
  grandfatheredUntil TIMESTAMP,              -- ✅ Optional expiration
  isGrandfathered BOOLEAN DEFAULT false,     -- ✅ Grandfathering flag
  
  -- Cached Attributes
  tierLevel INTEGER,
  universitiesUsed INTEGER DEFAULT 0,
  countriesUsed INTEGER DEFAULT 0,
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Grandfathering Migration (0013)**

```sql
-- Backfills snapshot for existing active subscriptions
UPDATE user_subscriptions us
SET subscribedPlanSnapshot = (
  SELECT to_jsonb(sp.*)
  FROM subscription_plans sp
  WHERE sp.id = us.plan_id
),
grandfatheredPrice = COALESCE(us.amount_paid, (
  SELECT sp.price
  FROM subscription_plans sp
  WHERE sp.id = us.plan_id
)),
isGrandfathered = true
WHERE us.status = 'active';
```

**Critical Finding:**
- ✅ Plan snapshot mechanism EXISTS and is populated
- ⚠️ Snapshot contains FULL plan object (including features)
- ❌ No code actively uses `subscribedPlanSnapshot` for feature access
- ❌ All feature checks reference live `planId`, not snapshot

---

## 2. Current Feature Management in Admin UI

### 2.1 Plan Creation/Update Flow

**Admin Controller (`server/controllers/admin.controller.ts`)**

```typescript
// Create Subscription Plan
async createSubscriptionPlan(req, res) {
  const validatedData = insertSubscriptionPlanSchema.parse(req.body);
  const plan = await subscriptionService.createSubscriptionPlan(
    validatedData,
    req.user!.id,
    req.ip,
    req.get('user-agent')
  );
  
  res.status(201);
  return this.sendSuccess(res, plan);
}

// Update Subscription Plan (MUTATES LIVE PLAN)
async updateSubscriptionPlan(req, res) {
  const { id } = req.params;
  const validatedData = updateSubscriptionPlanBodySchema.parse(req.body);
  const { changeReason, ...updateData } = validatedData;
  
  const updated = await subscriptionService.updateSubscriptionPlan(
    id,
    updateData,          // ⚠️ Direct mutation
    req.user!.id,
    changeReason,
    req.ip,
    req.get('user-agent')
  );
  
  return this.sendSuccess(res, updated);
}
```

**Validation Schema (`server/controllers/admin.controller.ts`)**

```typescript
const updateSubscriptionPlanBodySchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  price: z.number().transform(val => val.toString()).optional(),
  features: z.array(z.string()).optional(),  // ⚠️ Array of strings, no validation
  isActive: z.boolean().optional(),
  changeReason: z.string().optional()
});
```

**Admin UI (`client/src/pages/SubscriptionPlans.tsx`)**

```typescript
// Features edited as newline-separated text
<Textarea
  name="features"
  defaultValue={editingPlan.features.join("\n")}
  placeholder="Enter features (one per line)"
/>

// Form submission
const handleUpdatePlan = (formData: FormData) => {
  const data = {
    ...
    features: (formData.get("features") as string)
      .split("\n")
      .filter(f => f.trim()),  // Simple text split
    ...
  };
  
  updatePlanMutation.mutate({ id: editingPlan.id, updates: data });
};
```

**Critical Findings:**

1. **No Feature Validation:**
   - Features accepted as arbitrary strings
   - No schema enforcement (e.g., "Apply to X universities" format)
   - No validation against boolean flags

2. **Direct Mutation:**
   - Updates directly modify plan in database
   - No versioning for feature changes
   - No subscriber notification

3. **No Feature Access Control:**
   - No middleware checking feature access
   - No service layer validating feature usage
   - Features are display-only (no enforcement)

---

## 3. Feature Access Logic Analysis

### 3.1 Current Implementation

**Search Results:** NO feature access control found in codebase

```bash
# Searched for feature access patterns
grep -r "hasFeatureAccess\|checkFeature\|featureAccess\|canUseFeature" server/ client/
# Result: NO MATCHES (except production monitoring metrics)
```

**What This Means:**
- ❌ No runtime validation of feature access
- ❌ No checks when users try to use features
- ❌ Features are purely informational/display
- ⚠️ **CRITICAL GAP**: Features listed in plans are not enforced

### 3.2 Implicit Feature Enforcement

**Found in User Subscription Service:**

```typescript
// Only tier-level validation exists
async validateUpgrade(currentSubscription, targetPlanId) {
  const currentPlan = await subscriptionPlanRepo.findById(currentSubscription.planId);
  const targetPlan = await subscriptionPlanRepo.findById(targetPlanId);
  
  if (targetPlan.tierLevel <= currentPlan.tierLevel) {
    return {
      allowed: false,
      reason: 'Cannot downgrade or switch to same tier. Only upgrades allowed.'
    };
  }
  
  return { allowed: true };
}
```

**Quota Enforcement Found:**

```typescript
// Cached in user_subscriptions
universitiesUsed INTEGER DEFAULT 0,
countriesUsed INTEGER DEFAULT 0,

// Validated against plan limits
maxUniversities: plan.maxUniversities,
maxCountries: plan.maxCountries
```

### 3.3 Feature Access Gap Analysis

**What's NOT Checked:**

```typescript
// Example: If plan has "Phozos AI access" feature
// There is NO code that:
✗ Checks if user's plan includes AI access
✗ Validates AI usage against subscription
✗ Blocks access for users without the feature
✗ Logs feature usage
```

**What IS Checked:**

```typescript
✓ Tier level (for upgrades)
✓ University quota (maxUniversities)
✓ Country quota (maxCountries)
✗ Individual service features (none)
✗ Boolean flags (not validated at runtime)
```

---

## 4. Grandfathering and Versioning Support

### 4.1 Plan Versioning (Implemented)

**From Migration 0012:**

```sql
ALTER TABLE subscription_plans
  ADD COLUMN base_plan_id UUID NOT NULL,
  ADD COLUMN version INTEGER DEFAULT 1,
  ADD COLUMN is_latest_version BOOLEAN DEFAULT true;

-- All plans become their own base
UPDATE subscription_plans
SET base_plan_id = id,
    version = 1,
    is_latest_version = true;
```

**Versioning Service (`server/services/domain/subscription.service.ts`):**

```typescript
async createPlanVersion(
  basePlanId: string,
  updates: Partial<SubscriptionPlan>,
  adminId: string,
  releaseNotes?: string
): Promise<SubscriptionPlan> {
  const oldPlan = await subscriptionPlanRepository.findLatestVersion(basePlanId);
  
  const newVersion = await subscriptionPlanRepository.createNewVersion(
    basePlanId,
    updates,   // ✅ Creates new plan version
    adminId
  );
  
  // Logs audit trail
  await planAuditRepository.logChange({
    planId: newVersion.id,
    changedBy: adminId,
    changeType: 'created',
    fieldChanges: { type: 'new_version', changes: updates }
  });
  
  // Price change notification
  if (updates.price && Number(updates.price) !== Number(oldPlan.price)) {
    const notification = await planNotificationService.createPriceChangeNotification(
      oldPlan.id,
      Number(oldPlan.price),
      Number(updates.price),
      effectiveDate,
      adminId
    );
    
    await planNotificationService.sendPlanNotifications(notification.id);
  }
  
  return newVersion;
}
```

**Key Points:**

- ✅ Plan versioning infrastructure exists
- ✅ Notifications sent for price changes
- ⚠️ **Feature changes NOT covered by notifications**
- ❌ No "feature change notification" workflow

### 4.2 Grandfathering Implementation

**From Migration 0013:**

```sql
ALTER TABLE user_subscriptions
  ADD COLUMN subscribed_plan_snapshot JSONB,
  ADD COLUMN grandfathered_price DECIMAL(10,2),
  ADD COLUMN is_grandfathered BOOLEAN DEFAULT false;

-- Backfill existing subscriptions
UPDATE user_subscriptions us
SET subscribedPlanSnapshot = (SELECT to_jsonb(sp.*) FROM subscription_plans sp WHERE sp.id = us.plan_id),
    grandfatheredPrice = us.amount_paid,
    isGrandfathered = true
WHERE us.status = 'active';
```

**What's Stored in Snapshot:**

```json
{
  "id": "plan-uuid",
  "name": "Champion Plan",
  "price": "999.00",
  "features": [
    "Apply to up to 6 Universities",
    "Access to Top 200 Universities",
    "SOP & LOR Editing by Experts",
    "Scholarship & Financial Planning"
  ],
  "includeLoanAssistance": true,
  "includeVisaSupport": true,
  "includeCounselorSession": true,
  "includeScholarshipPlanning": true,
  "maxUniversities": 6,
  "maxCountries": 3,
  "universityTier": "top200",
  "version": 1,
  "basePlanId": "base-plan-uuid"
}
```

**Critical Analysis:**

- ✅ Snapshot contains FULL plan at subscription time
- ✅ Includes both `features` array AND boolean flags
- ✅ Grandfathering infrastructure complete
- ❌ **NO CODE USES SNAPSHOT FOR FEATURE ACCESS**
- ❌ All queries reference `planId`, not snapshot

**Code Evidence:**

```typescript
// Current implementation (WRONG)
const subscription = await userSubscriptionRepo.findByUser(userId);
const plan = await subscriptionPlanRepo.findById(subscription.planId);
// Uses live plan, ignoring snapshot!

// Should be (CORRECT)
const subscription = await userSubscriptionRepo.findByUser(userId);
const effectivePlan = subscription.isGrandfathered 
  ? subscription.subscribedPlanSnapshot 
  : await subscriptionPlanRepo.findById(subscription.planId);
```

---

## 5. What Happens When Features Change

### 5.1 Current Behavior (Direct Update)

**Scenario:** Admin changes "Champion Plan" features

```typescript
// Admin updates plan
PUT /api/admin/subscription-plans/{championPlanId}
{
  "features": [
    "Apply to up to 6 Universities",
    "Access to Top 200 Universities",
    "SOP & LOR Editing by Experts",
    "Scholarship & Financial Planning",
    "Phozos AI Access"  // ← NEW FEATURE ADDED
  ]
}
```

**What Happens:**

```
1. Database Update
   ✓ subscription_plans.features updated
   ✓ subscription_plans.updated_at = NOW()
   
2. Audit Trail
   ✓ subscription_plan_changes record created
   ✓ field_changes = { "features": { "old": [...], "new": [...] } }
   ✓ changed_by = adminId
   
3. Existing Subscribers
   ✗ planId still points to updated plan
   ✗ subscribedPlanSnapshot NOT updated (remains old)
   ✗ Users see new features when querying plan
   ⚠️ Inconsistency: snapshot has old, live plan has new
   
4. Feature Access
   ✗ No validation exists
   ✗ Feature not checked anywhere in code
   ✗ "Phozos AI Access" is display-only
   
5. Notifications
   ✗ No notification sent
   ✗ Users unaware of change
```

### 5.2 Impact Analysis

**If Admin Adds Feature:**

| Aspect | Current Behavior | Expected Behavior |
|--------|------------------|-------------------|
| **New Subscribers** | ✅ See new feature | ✅ See new feature |
| **Existing Subscribers** | ⚠️ See new feature (live plan) | ❓ Should they see it? |
| **Snapshot** | ❌ Shows old features | ✅ Should be immutable |
| **Feature Access** | ❌ Not validated | ✅ Should check snapshot |
| **Notification** | ❌ Silent change | ✅ Should notify users |

**If Admin Removes Feature:**

| Aspect | Current Behavior | Expected Behavior |
|--------|------------------|-------------------|
| **New Subscribers** | ✅ Don't see feature | ✅ Don't see feature |
| **Existing Subscribers** | ⚠️ Don't see feature (live plan) | ✅ Should keep access (grandfathered) |
| **Snapshot** | ✅ Still shows feature | ✅ Preserved correctly |
| **Feature Access** | ❌ Not validated | ✅ Should honor snapshot |
| **Notification** | ❌ Silent removal | ✅ Should notify removal |

---

## 6. Implementation Gaps

### 6.1 Critical Gaps

**1. No Feature Access Control**

```typescript
// MISSING: Feature validation middleware
async function checkFeatureAccess(userId: string, featureName: string): Promise<boolean> {
  const subscription = await getActiveSubscription(userId);
  if (!subscription) return false;
  
  // Use snapshot if grandfathered
  const effectivePlan = subscription.isGrandfathered
    ? subscription.subscribedPlanSnapshot
    : await getPlan(subscription.planId);
  
  return effectivePlan.features.includes(featureName);
}

// MISSING: Usage examples
if (!await checkFeatureAccess(userId, "Phozos AI Access")) {
  throw new Error("Your plan does not include AI access. Please upgrade.");
}
```

**2. Snapshot Not Used**

```typescript
// Current: Ignores snapshot
const plan = await subscriptionPlanRepo.findById(subscription.planId);

// Should be: Honor grandfathering
const effectivePlan = subscription.isGrandfathered
  ? subscription.subscribedPlanSnapshot as SubscriptionPlan
  : await subscriptionPlanRepo.findById(subscription.planId);
```

**3. No Feature Versioning Workflow**

```typescript
// MISSING: Feature change notification
async addFeatureToPlan(planId: string, feature: string, adminId: string) {
  // Create new version
  const newVersion = await createPlanVersion(planId, {
    features: [...oldPlan.features, feature]
  }, adminId);
  
  // Notify existing subscribers
  await notificationService.notifyFeatureAddition(planId, feature);
  
  // Return new version
  return newVersion;
}
```

**4. No Feature Schema Validation**

```typescript
// MISSING: Feature type definitions
type FeatureType = 
  | { type: 'quota', name: string, value: number }
  | { type: 'access', name: string, tier: string }
  | { type: 'service', name: string, enabled: boolean }
  | { type: 'display', name: string, description: string };

// MISSING: Validation
const featureSchema = z.object({
  type: z.enum(['quota', 'access', 'service', 'display']),
  name: z.string(),
  // ... type-specific fields
});
```

### 6.2 Medium Priority Gaps

**1. No Feature Usage Tracking**

```typescript
// MISSING: Feature usage analytics
CREATE TABLE feature_usage_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  feature_name TEXT NOT NULL,
  subscription_id UUID NOT NULL,
  accessed_at TIMESTAMP NOT NULL,
  metadata JSONB
);
```

**2. No Feature Deprecation Workflow**

```typescript
// MISSING: Soft deprecation
interface DeprecatedFeature {
  name: string;
  deprecatedAt: Date;
  removalDate: Date;
  replacementFeature?: string;
}
```

**3. No Feature Entitlement Check**

```typescript
// MISSING: Entitlement verification
async getFeatureEntitlements(userId: string): Promise<{
  features: string[];
  quotas: Record<string, number>;
  services: Record<string, boolean>;
}> {
  // Implementation missing
}
```

---

## 7. Industry Best Practices Comparison

### 7.1 Stripe's Approach

**Product + Price Model:**

```typescript
// Stripe separates Product from Price
const product = await stripe.products.create({
  name: "Champion Plan",
  metadata: {
    features: JSON.stringify([
      { type: 'quota', name: 'universities', value: 6 },
      { type: 'service', name: 'ai_access', enabled: true }
    ])
  }
});

// Prices reference products
const price = await stripe.prices.create({
  product: product.id,
  unit_amount: 99900,
  recurring: { interval: 'month' }
});

// Subscriptions lock to specific price
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: price.id }]  // Immutable reference
});
```

**Feature Entitlements:**

```typescript
// Stripe uses entitlements
const entitlements = await stripe.entitlements.features.list({
  customer: customerId
});

// Check access
if (entitlements.data.some(e => e.lookup_key === 'ai_access')) {
  // Grant access
}
```

### 7.2 AWS Pricing Model

**Feature Flags in Service Plans:**

```json
{
  "planId": "professional",
  "features": [
    {
      "id": "advanced_analytics",
      "name": "Advanced Analytics",
      "enabled": true,
      "limits": { "reports_per_month": 100 }
    },
    {
      "id": "api_access",
      "name": "API Access",
      "enabled": true,
      "limits": { "requests_per_second": 1000 }
    }
  ]
}
```

### 7.3 Shopify App Subscriptions

**Grandfathered Features:**

```ruby
# Shopify preserves features at subscription time
class AppSubscription
  def active_features
    if grandfathered?
      # Use snapshot
      plan_snapshot['features']
    else
      # Use current plan
      current_plan.features
    end
  end
end
```

---

## 8. Recommended Architecture

### 8.1 Short-Term Fix (Minimal Changes)

**Goal:** Make feature grandfathering work with existing infrastructure

**Step 1: Use Existing Snapshot**

```typescript
// server/services/domain/user-subscription.service.ts

async getEffectiveFeatures(userId: string): Promise<{
  features: string[];
  booleanFlags: Record<string, boolean>;
  quotas: Record<string, number>;
}> {
  const subscription = await this.userSubscriptionRepo.findByUser(userId);
  if (!subscription) {
    throw new Error('No active subscription');
  }
  
  // ✅ Use snapshot if grandfathered
  let effectivePlan: SubscriptionPlan;
  
  if (subscription.isGrandfathered && subscription.subscribedPlanSnapshot) {
    effectivePlan = subscription.subscribedPlanSnapshot as SubscriptionPlan;
  } else {
    effectivePlan = await this.subscriptionPlanRepo.findById(subscription.planId);
  }
  
  return {
    features: effectivePlan.features || [],
    booleanFlags: {
      loanAssistance: effectivePlan.includeLoanAssistance,
      visaSupport: effectivePlan.includeVisaSupport,
      counselorSession: effectivePlan.includeCounselorSession,
      // ... other flags
    },
    quotas: {
      maxUniversities: effectivePlan.maxUniversities,
      maxCountries: effectivePlan.maxCountries,
    }
  };
}
```

**Step 2: Add Feature Access Middleware**

```typescript
// server/middleware/feature-access.ts

export function requireFeature(featureName: string) {
  return async (req: AuthenticatedRequest, res: Response, next: Function) => {
    const userId = req.user!.id;
    const userSubscriptionService = getService<IUserSubscriptionService>(
      TYPES.IUserSubscriptionService
    );
    
    const { features } = await userSubscriptionService.getEffectiveFeatures(userId);
    
    if (!features.includes(featureName)) {
      return res.status(403).json({
        error: 'FEATURE_NOT_AVAILABLE',
        message: `Your plan does not include ${featureName}. Please upgrade.`
      });
    }
    
    next();
  };
}

// Usage
app.get('/api/ai/chat', 
  authenticate,
  requireFeature('Phozos AI Access'),
  aiController.chat
);
```

**Step 3: Update Plan Update Logic**

```typescript
// Force versioning for feature changes
async updateSubscriptionPlan(
  id: string,
  updates: Partial<SubscriptionPlan>,
  adminId: string,
  changeReason?: string
): Promise<SubscriptionPlan> {
  const oldPlan = await this.subscriptionPlanRepository.findById(id);
  
  // Check if features changed
  const featuresChanged = 
    updates.features && 
    JSON.stringify(updates.features) !== JSON.stringify(oldPlan.features);
  
  if (featuresChanged) {
    // Force versioning for feature changes
    return this.createPlanVersion(
      oldPlan.basePlanId,
      updates,
      adminId,
      changeReason || 'Feature changes'
    );
  }
  
  // Normal update for non-feature changes
  return this.subscriptionPlanRepository.update(id, updates);
}
```

### 8.2 Long-Term Solution (Comprehensive)

**Goal:** Structured feature management with entitlements

**Step 1: Create Feature Schema**

```typescript
// shared/feature-schema.ts

export type Feature = 
  | QuotaFeature
  | AccessFeature
  | ServiceFeature
  | DisplayFeature;

interface QuotaFeature {
  type: 'quota';
  id: string;
  name: string;
  description: string;
  value: number;
  unit: string; // 'universities', 'countries', 'documents'
}

interface AccessFeature {
  type: 'access';
  id: string;
  name: string;
  description: string;
  tier: 'general' | 'top500' | 'top200' | 'top100' | 'ivy_league';
}

interface ServiceFeature {
  type: 'service';
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  metadata?: Record<string, any>;
}

interface DisplayFeature {
  type: 'display';
  id: string;
  name: string;
  description: string;
}

export const featureSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('quota'),
    id: z.string(),
    name: z.string(),
    description: z.string(),
    value: z.number().positive(),
    unit: z.string()
  }),
  // ... other types
]);
```

**Step 2: Create Feature Entitlements Table**

```sql
CREATE TABLE feature_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id),
  feature_id TEXT NOT NULL,
  feature_type TEXT NOT NULL,
  feature_config JSONB NOT NULL,
  granted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_grandfathered BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_entitlements_subscription ON feature_entitlements(subscription_id);
CREATE INDEX idx_entitlements_feature ON feature_entitlements(feature_id);
```

**Step 3: Entitlements Service**

```typescript
// server/services/domain/feature-entitlement.service.ts

export interface IFeatureEntitlementService {
  grantFeatures(subscriptionId: string, features: Feature[]): Promise<void>;
  checkAccess(userId: string, featureId: string): Promise<boolean>;
  getEntitlements(userId: string): Promise<Feature[]>;
  revokeFeature(subscriptionId: string, featureId: string): Promise<void>;
  logUsage(userId: string, featureId: string, metadata?: any): Promise<void>;
}

export class FeatureEntitlementService implements IFeatureEntitlementService {
  async grantFeatures(subscriptionId: string, features: Feature[]) {
    // Create entitlement records
    const entitlements = features.map(feature => ({
      subscriptionId,
      featureId: feature.id,
      featureType: feature.type,
      featureConfig: feature,
      grantedAt: new Date(),
      isGrandfathered: false
    }));
    
    await this.entitlementRepo.createBatch(entitlements);
  }
  
  async checkAccess(userId: string, featureId: string): Promise<boolean> {
    const subscription = await this.subscriptionRepo.findActiveByUserId(userId);
    if (!subscription) return false;
    
    const entitlement = await this.entitlementRepo.findBySubscriptionAndFeature(
      subscription.id,
      featureId
    );
    
    return !!entitlement;
  }
  
  async logUsage(userId: string, featureId: string, metadata?: any) {
    await this.usageLogRepo.create({
      userId,
      featureId,
      accessedAt: new Date(),
      metadata
    });
  }
}
```

---

## 9. Recommended Approach for Adding/Removing Features

### 9.1 Adding "Phozos AI Access" Feature

**Step-by-Step Process:**

**Phase 1: Define Feature**

```typescript
// 1. Add to feature registry
export const FEATURES = {
  PHOZOS_AI_ACCESS: {
    id: 'phozos_ai_access',
    name: 'Phozos AI Access',
    description: 'Access to AI-powered university matching and SOP assistance',
    type: 'service' as const,
    enabled: true
  }
} as const;
```

**Phase 2: Add to Plan (Versioned)**

```typescript
// 2. Create new plan version with feature
POST /api/admin/subscription-plans/{championPlanId}/versions
{
  "updates": {
    "features": [
      ...existingFeatures,
      "Phozos AI Access - AI-powered university matching"
    ],
    "versionName": "v2 - AI Access Added"
  },
  "releaseNotes": "Added Phozos AI Access for Champion Plan subscribers",
  "notifySubscribers": true  // ✅ Notify existing subscribers
}
```

**Phase 3: Implementation**

```typescript
// 3. Add feature check to AI endpoints
app.post('/api/ai/chat',
  authenticate,
  requireFeature('phozos_ai_access'),  // ✅ Access control
  aiController.chat
);

app.post('/api/ai/university-match',
  authenticate,
  requireFeature('phozos_ai_access'),
  aiController.universityMatch
);
```

**Phase 4: UI Updates**

```typescript
// 4. Show feature in UI conditionally
const { features } = await getEffectiveFeatures(userId);

{features.includes('Phozos AI Access') && (
  <Card>
    <CardHeader>
      <CardTitle>Phozos AI Assistant</CardTitle>
    </CardHeader>
    <CardContent>
      <Button onClick={() => openAIChat()}>
        Start AI Chat
      </Button>
    </CardContent>
  </Card>
)}
```

**Phase 5: Analytics**

```typescript
// 5. Track feature usage
await featureEntitlementService.logUsage(userId, 'phozos_ai_access', {
  action: 'chat_message_sent',
  messageCount: 1
});
```

### 9.2 Removing a Feature

**Step-by-Step Process:**

**Phase 1: Deprecation Notice (30 days)**

```typescript
// 1. Mark feature as deprecated
POST /api/admin/features/deprecate
{
  "featureId": "old_feature",
  "deprecationDate": "2025-12-07",
  "removalDate": "2026-01-07",
  "replacementFeature": "new_feature",
  "notificationMessage": "This feature will be removed on Jan 7, 2026. Migrate to {new_feature}."
}

// Sends email to affected users
```

**Phase 2: Create Plan Version Without Feature**

```typescript
// 2. Create new version (after deprecation period)
POST /api/admin/subscription-plans/{planId}/versions
{
  "updates": {
    "features": existingFeatures.filter(f => f !== "Old Feature"),
    "versionName": "v3 - Old Feature Removed"
  },
  "releaseNotes": "Old Feature has been removed as announced",
  "notifySubscribers": true
}
```

**Phase 3: Grandfathering Decision**

```typescript
// Option A: Allow existing users to keep access
// - Don't revoke entitlements
// - Use snapshot-based access control
// - Existing users keep feature until they upgrade

// Option B: Remove for everyone
// - Revoke entitlements
// - Feature check fails for all users
// - Provide refund/credit if significant
```

**Phase 4: Cleanup**

```typescript
// 3. Remove feature checks from code (after all users migrated)
// 4. Archive feature in database (soft delete)
UPDATE features SET archived_at = NOW() WHERE id = 'old_feature';
```

---

## 10. Summary and Recommendations

### 10.1 Current State Summary

| Component | Status | Notes |
|-----------|--------|-------|
| **Feature Storage** | ⚠️ Partial | Dual format (JSONB + booleans), no validation |
| **Grandfathering** | ⚠️ Implemented but unused | Snapshot exists, not used for feature access |
| **Versioning** | ✅ Working | Plan versioning implemented, works for pricing |
| **Access Control** | ❌ Missing | No feature access validation anywhere |
| **Audit Trail** | ✅ Working | Plan changes logged, but not feature-specific |
| **Notifications** | ⚠️ Partial | Works for price changes, not feature changes |

### 10.2 Immediate Actions Required

**Priority 1 (Critical - This Week):**

1. ✅ **Use Existing Snapshot for Feature Access**
   - Implement `getEffectiveFeatures()` method
   - Reference snapshot when `isGrandfathered = true`
   - Test with existing subscriptions

2. ✅ **Add Feature Access Middleware**
   - Create `requireFeature()` middleware
   - Apply to protected endpoints
   - Document feature IDs

3. ✅ **Force Versioning for Feature Changes**
   - Modify update logic to create versions
   - Prevent direct feature mutation
   - Add feature change detection

**Priority 2 (Important - Next Sprint):**

4. ✅ **Add Feature Change Notifications**
   - Extend notification service
   - Email existing subscribers on feature changes
   - Provide 30-day notice for removals

5. ✅ **Implement Feature Validation**
   - Create feature schema
   - Validate on plan create/update
   - Reject malformed features

6. ✅ **Admin UI Improvements**
   - Structured feature editor
   - Feature type selection
   - Preview feature changes impact

**Priority 3 (Enhancement - Future):**

7. ⬜ **Feature Entitlements System**
   - Create entitlements table
   - Implement entitlement service
   - Migrate to structured features

8. ⬜ **Feature Usage Analytics**
   - Track feature usage
   - Generate usage reports
   - Inform pricing decisions

9. ⬜ **Feature Deprecation Workflow**
   - Deprecation notice system
   - Migration tools
   - Sunset timeline management

### 10.3 Risk Assessment

**If No Action Taken:**

- 🔴 **HIGH RISK**: Feature changes affect all subscribers without notice
- 🔴 **HIGH RISK**: No enforcement of plan features (security issue)
- 🟡 **MEDIUM RISK**: Grandfathering doesn't work for features
- 🟡 **MEDIUM RISK**: Legal compliance issues (no audit trail for features)

**After Implementing Short-Term Fix:**

- 🟢 **LOW RISK**: Features grandfathered correctly
- 🟢 **LOW RISK**: Access control prevents unauthorized usage
- 🟡 **MEDIUM RISK**: Still need structured feature management

**After Full Implementation:**

- 🟢 **LOW RISK**: Complete feature lifecycle management
- 🟢 **LOW RISK**: Industry-standard entitlements system
- 🟢 **LOW RISK**: Scalable for future growth

---

## Appendix A: Code Examples

### A.1 Complete Feature Access Implementation

```typescript
// server/services/domain/feature-access.service.ts

export interface IFeatureAccessService {
  checkAccess(userId: string, featureId: string): Promise<boolean>;
  getEffectiveFeatures(userId: string): Promise<FeatureSet>;
  hasQuotaRemaining(userId: string, quotaType: string): Promise<boolean>;
  consumeQuota(userId: string, quotaType: string, amount: number): Promise<void>;
}

interface FeatureSet {
  textFeatures: string[];
  serviceFeatures: Record<string, boolean>;
  quotas: Record<string, { max: number; used: number; remaining: number }>;
  tier: string;
  supportType: string;
}

export class FeatureAccessService implements IFeatureAccessService {
  constructor(
    private userSubscriptionRepo: IUserSubscriptionRepository,
    private subscriptionPlanRepo: ISubscriptionPlanRepository
  ) {}
  
  async getEffectiveFeatures(userId: string): Promise<FeatureSet> {
    const subscription = await this.userSubscriptionRepo.findActiveByUserId(userId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }
    
    // Use snapshot if grandfathered
    let plan: SubscriptionPlan;
    if (subscription.isGrandfathered && subscription.subscribedPlanSnapshot) {
      plan = subscription.subscribedPlanSnapshot as SubscriptionPlan;
    } else {
      plan = await this.subscriptionPlanRepo.findById(subscription.planId);
    }
    
    return {
      textFeatures: plan.features || [],
      serviceFeatures: {
        loanAssistance: plan.includeLoanAssistance,
        visaSupport: plan.includeVisaSupport,
        counselorSession: plan.includeCounselorSession,
        scholarshipPlanning: plan.includeScholarshipPlanning,
        mockInterview: plan.includeMockInterview,
        expertEditing: plan.includeExpertEditing,
        postAdmitSupport: plan.includePostAdmitSupport,
        dedicatedManager: plan.includeDedicatedManager,
        networkingEvents: plan.includeNetworkingEvents,
        flightAccommodation: plan.includeFlightAccommodation,
      },
      quotas: {
        universities: {
          max: plan.maxUniversities,
          used: subscription.universitiesUsed || 0,
          remaining: plan.maxUniversities - (subscription.universitiesUsed || 0)
        },
        countries: {
          max: plan.maxCountries,
          used: subscription.countriesUsed || 0,
          remaining: plan.maxCountries - (subscription.countriesUsed || 0)
        }
      },
      tier: plan.universityTier,
      supportType: plan.supportType
    };
  }
  
  async checkAccess(userId: string, featureId: string): Promise<boolean> {
    const features = await this.getEffectiveFeatures(userId);
    
    // Check text features
    if (features.textFeatures.some(f => f.toLowerCase().includes(featureId.toLowerCase()))) {
      return true;
    }
    
    // Check service features
    if (features.serviceFeatures[featureId] === true) {
      return true;
    }
    
    return false;
  }
  
  async hasQuotaRemaining(userId: string, quotaType: string): Promise<boolean> {
    const features = await this.getEffectiveFeatures(userId);
    const quota = features.quotas[quotaType];
    return quota && quota.remaining > 0;
  }
  
  async consumeQuota(userId: string, quotaType: string, amount: number = 1): Promise<void> {
    const subscription = await this.userSubscriptionRepo.findActiveByUserId(userId);
    if (!subscription) {
      throw new Error('No active subscription');
    }
    
    const hasQuota = await this.hasQuotaRemaining(userId, quotaType);
    if (!hasQuota) {
      throw new Error(`Quota exceeded for ${quotaType}`);
    }
    
    // Update usage
    if (quotaType === 'universities') {
      await this.userSubscriptionRepo.update(subscription.id, {
        universitiesUsed: (subscription.universitiesUsed || 0) + amount
      });
    } else if (quotaType === 'countries') {
      await this.userSubscriptionRepo.update(subscription.id, {
        countriesUsed: (subscription.countriesUsed || 0) + amount
      });
    }
  }
}
```

### A.2 Feature Access Middleware

```typescript
// server/middleware/feature-access.ts

export function requireFeature(featureName: string) {
  return async (req: AuthenticatedRequest, res: Response, next: Function) => {
    try {
      const userId = req.user!.id;
      const featureAccessService = getService<IFeatureAccessService>(
        TYPES.IFeatureAccessService
      );
      
      const hasAccess = await featureAccessService.checkAccess(userId, featureName);
      
      if (!hasAccess) {
        return res.status(403).json({
          error: 'FEATURE_NOT_AVAILABLE',
          message: `Your plan does not include ${featureName}. Please upgrade to access this feature.`,
          upgradeUrl: '/plans'
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({
        error: 'FEATURE_CHECK_FAILED',
        message: 'Unable to verify feature access'
      });
    }
  };
}

export function requireQuota(quotaType: string) {
  return async (req: AuthenticatedRequest, res: Response, next: Function) => {
    try {
      const userId = req.user!.id;
      const featureAccessService = getService<IFeatureAccessService>(
        TYPES.IFeatureAccessService
      );
      
      const hasQuota = await featureAccessService.hasQuotaRemaining(userId, quotaType);
      
      if (!hasQuota) {
        const features = await featureAccessService.getEffectiveFeatures(userId);
        const quota = features.quotas[quotaType];
        
        return res.status(403).json({
          error: 'QUOTA_EXCEEDED',
          message: `You have used all ${quota.max} ${quotaType} in your plan. Please upgrade to add more.`,
          quota: quota,
          upgradeUrl: '/plans'
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({
        error: 'QUOTA_CHECK_FAILED',
        message: 'Unable to verify quota availability'
      });
    }
  };
}

// Usage examples
app.get('/api/ai/chat', 
  authenticate,
  requireFeature('Phozos AI Access'),
  aiController.chat
);

app.post('/api/applications/create',
  authenticate,
  requireQuota('universities'),
  async (req, res) => {
    // Consume quota
    await featureAccessService.consumeQuota(req.user!.id, 'universities');
    // Create application
  }
);
```

---

## Appendix B: Migration Scripts

### B.1 Add Feature Access Indices

```sql
-- Optimize feature access queries
CREATE INDEX idx_user_subscriptions_grandfathered 
  ON user_subscriptions(user_id, is_grandfathered) 
  WHERE status = 'active';

CREATE INDEX idx_user_subscriptions_snapshot 
  ON user_subscriptions USING gin(subscribed_plan_snapshot)
  WHERE subscribed_plan_snapshot IS NOT NULL;
```

### B.2 Backfill Missing Snapshots

```sql
-- Ensure all active subscriptions have snapshots
UPDATE user_subscriptions us
SET subscribedPlanSnapshot = (
  SELECT to_jsonb(sp.*)
  FROM subscription_plans sp
  WHERE sp.id = us.plan_id
),
isGrandfathered = CASE 
  WHEN us.created_at < '2025-11-07' THEN true 
  ELSE false 
END
WHERE us.status = 'active' 
  AND us.subscribedPlanSnapshot IS NULL;
```

---

**End of Report**

*Generated by: Replit Agent*  
*Date: November 07, 2025*  
*Report Version: 1.0*
