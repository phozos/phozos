# Subscription Plan Versioning & Grandfathering Implementation Plan

**Date:** November 6, 2025  
**Platform:** EduPath International Education Platform  
**Scope:** Address 6 critical gaps in subscription plan management  
**Estimated Total Duration:** 8-10 weeks  
**Total Phases:** 5 implementation phases + 1 infrastructure phase

---

## Executive Summary

### Critical Business Problem

The current subscription system **directly modifies live plans**, causing:
- **Customer confusion**: Price changes instantly affect all subscribers
- **Revenue leakage**: No ability to raise prices for new customers while honoring legacy pricing
- **Legal/compliance risk**: No audit trail of plan changes for GDPR/SOC 2 compliance
- **Churn risk**: Unexpected price increases without notification
- **Support burden**: No tools to migrate users from discontinued plans

### Real-World Impact Example

**Today's Broken Flow:**
```
Admin changes "Premium Plan" from ₹7,999 to ₹9,999
↓
ALL existing Premium subscribers see ₹9,999 immediately
↓
Customer calls support: "I paid ₹7,999, why does it say ₹9,999?"
↓
No notification sent, no audit trail, no migration path
```

**Industry Standard (Post-Implementation):**
```
Admin creates "Premium Plan v2" at ₹9,999
↓
Existing subscribers stay on "Premium Plan v1" at ₹7,999 (grandfathered)
↓
New subscribers get v2 at ₹9,999
↓
Notification: "Your plan remains at ₹7,999. New subscribers pay ₹9,999"
↓
Full audit trail: who, what, when, why
```

---

## Investigation Findings

### Current System Architecture

#### ✅ What Works Well

1. **Solid Foundation**
   - Clean service-repository pattern with dependency injection
   - Comprehensive plan attributes (25+ fields)
   - Proper validation using Zod schemas
   - Database constraints prevent accidental deletion
   - `isActive` flag for plan activation/deactivation
   - Existing `subscription_events` table (underutilized)
   - Notification infrastructure exists

2. **Good Security**
   - Payment signature verification
   - Plan mismatch protection during checkout
   - Admin role-based access control

#### ❌ Critical Gaps

| Gap | Current State | Industry Standard | Business Impact |
|-----|--------------|-------------------|-----------------|
| **Grandfathering** | ❌ None - price changes affect all users | ✅ Automatic via versioning | **HIGH** - Customer churn, support tickets |
| **Plan Versioning** | ❌ Direct edits, no history | ✅ Immutable versions | **CRITICAL** - Legal compliance risk |
| **Change Notifications** | ❌ Silent updates | ✅ 30-60 day advance notice | **HIGH** - Customer trust erosion |
| **Audit Trail** | ❌ Only `updatedAt` timestamp | ✅ Complete change log | **CRITICAL** - GDPR/SOC 2 failure |
| **Delete Protection** | ⚠️ DB constraints only | ✅ Soft delete + migration | **MEDIUM** - Data integrity risk |
| **Migration Workflow** | ❌ No tools | ✅ Guided migration UI | **MEDIUM** - Manual work, errors |

### Database Schema Analysis

#### Current `subscription_plans` Table
```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  description TEXT,
  features JSONB NOT NULL,
  tier_level INTEGER NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- ... 15+ feature flags
);
```

**Problems:**
- No `version` field
- No `plan_version_id` to link versions
- No `base_plan_id` to group plan families
- No `deprecated_at`, `archived_at` timestamps
- No `successor_plan_id` for migrations
- `tier_level` is UNIQUE (prevents same-tier versioning)

#### Current `user_subscriptions` Table
```sql
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  -- ^ Direct reference - no grandfathering
  status subscription_status_enum NOT NULL,
  started_at TIMESTAMP,
  expires_at TIMESTAMP,
  amount_paid DECIMAL(10,2),  -- Good: captures actual price paid
  tier_level INTEGER,         -- Good: cached tier level
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Problems:**
- `plan_id` points to mutable plan
- No `subscribed_plan_snapshot` JSONB to store immutable terms
- No `grandfathered_price` field
- No `scheduled_change_*` fields for plan transitions

#### Existing `subscription_events` Table (GOOD!)
```sql
CREATE TABLE subscription_events (
  id UUID PRIMARY KEY,
  subscription_id UUID NOT NULL,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL
);
```

**Current Usage:** Only tracks status changes  
**Opportunity:** Expand to track plan changes, upgrades, migrations

### Code Analysis

#### Plan CRUD Operations (`admin.controller.ts`)

**Create Plan:**
```typescript
async createSubscriptionPlan(req, res) {
  const validatedData = insertSubscriptionPlanSchema.parse(req.body);
  const plan = await subscriptionService.createSubscriptionPlan(validatedData);
  return this.sendSuccess(res, plan);
}
```
✅ Good: Validation  
❌ Missing: Version initialization, audit logging

**Update Plan:**
```typescript
async updateSubscriptionPlan(req, res) {
  const { id } = req.params;
  const validatedData = updateSubscriptionPlanBodySchema.parse(req.body);
  const updated = await subscriptionService.updateSubscriptionPlan(id, validatedData);
  return this.sendSuccess(res, updated);
}
```
❌ **CRITICAL ISSUE:** Directly mutates plan  
❌ No version creation  
❌ No notification to affected users  
❌ No audit trail (who/why)

**Delete Plan:**
```typescript
async deleteSubscriptionPlan(req, res) {
  const success = await subscriptionService.deleteSubscriptionPlan(id);
  return this.sendEmptySuccess(res);
}
```
❌ Hard delete (protected only by FK constraints)  
❌ No migration workflow  
❌ No deprecation period

#### User Subscription Flow (`user-subscription.service.ts`)

**Subscribe User:**
```typescript
async subscribeUserToPlan(userId, planId, orderId) {
  const plan = await subscriptionPlanRepo.findById(planId);
  
  return await createSubscription({
    userId,
    planId,      // <- Direct reference
    tierLevel: plan.tierLevel,
    amountPaid: plan.price,  // Good: captures price at purchase
  });
}
```

✅ Good: Captures `amountPaid` at purchase time  
❌ Problem: No plan snapshot, relies on mutable `plan_id`

### Industry Standards Comparison

#### Stripe's Approach
```typescript
// Stripe creates new Price objects for same Product
const product = await stripe.products.create({ name: "Premium Plan" });

const price_v1 = await stripe.prices.create({
  product: product.id,
  unit_amount: 9900,  // $99.00
  active: true
});

// Later: Create new price, deactivate old one
const price_v2 = await stripe.prices.create({
  product: product.id,
  unit_amount: 14900,  // $149.00
  active: true
});

await stripe.prices.update(price_v1.id, { active: false });

// Existing subscriptions keep price_v1, new ones get price_v2
```

#### Shopify's Approach
```typescript
// Shopify uses grandfathering for billing plans
const subscription = await shopify.billingPlans.create({
  plan_id: "premium",
  price: 99.00,
  grandfathered: true,  // Lock price for this subscription
  locked_until: "2026-12-31"
});
```

#### SaaS Metrics Platform Approach
```typescript
// ChartMogul/ProfitWell track MRR by plan version
{
  plan_external_id: "premium-v1-legacy",
  mrr: 7999,
  customer_count: 1247,
  is_grandfathered: true
}
```

---

## Phase-by-Phase Implementation Plan

### Phase 0: Infrastructure Foundation (Week 1)
**Complexity:** Low  
**Priority:** Foundation for all subsequent phases

#### Problem Solved
Establish audit logging and change tracking infrastructure before making schema changes.

#### Database Changes

**New Table: `subscription_plan_changes`**
```sql
CREATE TABLE subscription_plan_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  changed_by UUID NOT NULL REFERENCES users(id),
  change_type VARCHAR(50) NOT NULL,  -- 'created', 'updated', 'deprecated', 'archived'
  field_changes JSONB NOT NULL,      -- {"price": {"old": "7999", "new": "9999"}}
  change_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plan_changes_plan_id ON subscription_plan_changes(plan_id);
CREATE INDEX idx_plan_changes_changed_by ON subscription_plan_changes(changed_by);
CREATE INDEX idx_plan_changes_created_at ON subscription_plan_changes(created_at DESC);
```

**Migration File:** `0011_add_subscription_plan_audit_trail.sql`
```sql
-- Run this migration
CREATE TABLE subscription_plan_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES users(id),
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('created', 'updated', 'deprecated', 'archived', 'activated', 'deactivated')),
  field_changes JSONB NOT NULL,
  change_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plan_changes_plan_id ON subscription_plan_changes(plan_id);
CREATE INDEX idx_plan_changes_changed_by ON subscription_plan_changes(changed_by);
CREATE INDEX idx_plan_changes_created_at ON subscription_plan_changes(created_at DESC);

-- Trigger to auto-log plan changes (optional but recommended)
CREATE OR REPLACE FUNCTION log_subscription_plan_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    INSERT INTO subscription_plan_changes (plan_id, changed_by, change_type, field_changes)
    VALUES (
      NEW.id,
      current_setting('app.current_user_id', true)::UUID,
      'updated',
      jsonb_build_object(
        'old', to_jsonb(OLD),
        'new', to_jsonb(NEW)
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscription_plan_change_trigger
AFTER UPDATE ON subscription_plans
FOR EACH ROW
EXECUTE FUNCTION log_subscription_plan_change();
```

#### Backend Changes

**New Repository:** `server/repositories/subscription-plan-audit.repository.ts`
```typescript
export interface ISubscriptionPlanAuditRepository {
  logChange(data: InsertPlanChange): Promise<PlanChange>;
  getChangeHistory(planId: string): Promise<PlanChange[]>;
  getChangesBy(userId: string): Promise<PlanChange[]>;
  getRecentChanges(limit: number): Promise<PlanChange[]>;
}

export class SubscriptionPlanAuditRepository extends BaseRepository<PlanChange, InsertPlanChange> 
  implements ISubscriptionPlanAuditRepository {
  
  async logChange(data: InsertPlanChange): Promise<PlanChange> {
    return await this.create(data);
  }

  async getChangeHistory(planId: string): Promise<PlanChange[]> {
    return await db
      .select()
      .from(subscriptionPlanChanges)
      .where(eq(subscriptionPlanChanges.planId, planId))
      .orderBy(desc(subscriptionPlanChanges.createdAt));
  }

  async getChangesBy(userId: string): Promise<PlanChange[]> {
    return await db
      .select()
      .from(subscriptionPlanChanges)
      .where(eq(subscriptionPlanChanges.changedBy, userId))
      .orderBy(desc(subscriptionPlanChanges.createdAt));
  }

  async getRecentChanges(limit: number = 50): Promise<PlanChange[]> {
    return await db
      .select()
      .from(subscriptionPlanChanges)
      .orderBy(desc(subscriptionPlanChanges.createdAt))
      .limit(limit);
  }
}
```

**Update Service:** `server/services/domain/subscription.service.ts`
```typescript
export class SubscriptionService extends BaseService {
  constructor(
    private subscriptionPlanRepository: ISubscriptionPlanRepository,
    private planAuditRepository: ISubscriptionPlanAuditRepository,  // NEW
    private studentRepository: IStudentRepository
  ) {
    super();
  }

  async createSubscriptionPlan(plan: InsertSubscriptionPlan, adminId: string): Promise<SubscriptionPlan> {
    const created = await this.subscriptionPlanRepository.create(plan);
    
    // Log creation
    await this.planAuditRepository.logChange({
      planId: created.id,
      changedBy: adminId,
      changeType: 'created',
      fieldChanges: { new: created },
      changeReason: 'New plan created'
    });
    
    return created;
  }

  async updateSubscriptionPlan(
    id: string, 
    updates: Partial<SubscriptionPlan>,
    adminId: string,
    changeReason?: string
  ): Promise<SubscriptionPlan> {
    const existing = await this.subscriptionPlanRepository.findById(id);
    const updated = await this.subscriptionPlanRepository.update(id, updates);
    
    // Calculate field changes
    const fieldChanges = this.calculateFieldChanges(existing, updated);
    
    // Log the change
    await this.planAuditRepository.logChange({
      planId: id,
      changedBy: adminId,
      changeType: 'updated',
      fieldChanges,
      changeReason
    });
    
    return updated;
  }

  private calculateFieldChanges(old: SubscriptionPlan, updated: SubscriptionPlan): any {
    const changes: any = {};
    const keys = Object.keys(updated) as (keyof SubscriptionPlan)[];
    
    for (const key of keys) {
      if (old[key] !== updated[key]) {
        changes[key] = { old: old[key], new: updated[key] };
      }
    }
    
    return changes;
  }
}
```

**Update Controller:** `server/controllers/admin.controller.ts`
```typescript
async updateSubscriptionPlan(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const { changeReason, ...validatedData } = updateSubscriptionPlanBodySchema.parse(req.body);
  const adminId = this.getUserId(req);
  
  const subscriptionService = getService<ISubscriptionService>(TYPES.ISubscriptionService);
  const updated = await subscriptionService.updateSubscriptionPlan(
    id, 
    validatedData,
    adminId,
    changeReason  // NEW: require reason for changes
  );
  
  return this.sendSuccess(res, updated);
}
```

#### Frontend Changes

**Update Plan Edit Dialog:** `client/src/pages/SubscriptionPlans.tsx`
```tsx
// Add changeReason field to edit form
<div className="space-y-2">
  <Label htmlFor="changeReason">Reason for Change *</Label>
  <Textarea
    id="changeReason"
    value={changeReason}
    onChange={(e) => setChangeReason(e.target.value)}
    placeholder="e.g., Price adjustment due to increased costs..."
    required
  />
  <p className="text-xs text-muted-foreground">
    This will be logged in the audit trail for compliance.
  </p>
</div>

// Show audit trail in plan view
<Card>
  <CardHeader>
    <CardTitle>Change History</CardTitle>
  </CardHeader>
  <CardContent>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Date</TableCell>
          <TableCell>Changed By</TableCell>
          <TableCell>Changes</TableCell>
          <TableCell>Reason</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {auditTrail.map(change => (
          <TableRow key={change.id}>
            <TableCell>{formatDate(change.createdAt)}</TableCell>
            <TableCell>{change.changedByEmail}</TableCell>
            <TableCell>
              {Object.entries(change.fieldChanges).map(([field, values]) => (
                <Badge key={field} variant="outline">
                  {field}: {values.old} → {values.new}
                </Badge>
              ))}
            </TableCell>
            <TableCell>{change.changeReason}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CardContent>
</Card>
```

#### Testing Strategy

1. **Unit Tests**
   - `subscription-plan-audit.repository.test.ts`
   - Test audit log creation, retrieval, filtering

2. **Integration Tests**
   - Verify plan updates create audit entries
   - Test change history retrieval
   - Validate change reason is required

3. **Manual Testing**
   - Update a plan and verify audit log
   - View change history in admin UI
   - Test with different admin users

#### Rollback Plan

1. Drop trigger: `DROP TRIGGER subscription_plan_change_trigger`
2. Drop table: `DROP TABLE subscription_plan_changes`
3. Revert code changes via git

#### Success Metrics

- ✅ All plan changes logged with admin ID and reason
- ✅ Change history visible in admin UI
- ✅ No performance degradation (trigger overhead < 5ms)

---

### Phase 1: Plan Versioning Foundation (Week 2-3)
**Complexity:** High  
**Priority:** CRITICAL - Foundation for grandfathering

#### Problem Solved
Enable multiple versions of the same plan to coexist, allowing price changes without affecting existing subscribers.

#### Database Changes

**Modify `subscription_plans` Table:**
```sql
-- Migration: 0012_add_plan_versioning.sql

-- Step 1: Add new columns (nullable initially)
ALTER TABLE subscription_plans
  ADD COLUMN base_plan_id UUID,
  ADD COLUMN version INTEGER DEFAULT 1,
  ADD COLUMN version_name VARCHAR(50),
  ADD COLUMN is_latest_version BOOLEAN DEFAULT true,
  ADD COLUMN deprecated_at TIMESTAMP,
  ADD COLUMN archived_at TIMESTAMP,
  ADD COLUMN successor_plan_id UUID;

-- Step 2: Create self-referencing foreign keys
ALTER TABLE subscription_plans
  ADD CONSTRAINT fk_base_plan 
    FOREIGN KEY (base_plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_successor_plan 
    FOREIGN KEY (successor_plan_id) REFERENCES subscription_plans(id) ON DELETE SET NULL;

-- Step 3: Backfill existing plans (make them their own base)
UPDATE subscription_plans
SET base_plan_id = id,
    version = 1,
    version_name = 'v1 (Legacy)',
    is_latest_version = true
WHERE base_plan_id IS NULL;

-- Step 4: Make base_plan_id NOT NULL (after backfill)
ALTER TABLE subscription_plans
  ALTER COLUMN base_plan_id SET NOT NULL;

-- Step 5: Drop UNIQUE constraint on tier_level (allow same tier across versions)
ALTER TABLE subscription_plans
  DROP CONSTRAINT subscription_plans_tier_level_key;

-- Step 6: Create composite UNIQUE constraint
ALTER TABLE subscription_plans
  ADD CONSTRAINT unique_plan_version 
    UNIQUE (base_plan_id, version);

-- Step 7: Create indexes
CREATE INDEX idx_plans_base_plan_id ON subscription_plans(base_plan_id);
CREATE INDEX idx_plans_version ON subscription_plans(base_plan_id, version DESC);
CREATE INDEX idx_plans_latest_version ON subscription_plans(base_plan_id) 
  WHERE is_latest_version = true;
CREATE INDEX idx_plans_deprecated ON subscription_plans(deprecated_at) 
  WHERE deprecated_at IS NOT NULL;

-- Step 8: Add CHECK constraint
ALTER TABLE subscription_plans
  ADD CONSTRAINT check_version_positive CHECK (version > 0);

-- Step 9: Add comments
COMMENT ON COLUMN subscription_plans.base_plan_id IS 'Groups all versions of the same plan family';
COMMENT ON COLUMN subscription_plans.version IS 'Incrementing version number (1, 2, 3...)';
COMMENT ON COLUMN subscription_plans.is_latest_version IS 'Only one version per base_plan_id should have this true';
COMMENT ON COLUMN subscription_plans.deprecated_at IS 'When plan stopped accepting new subscriptions';
COMMENT ON COLUMN subscription_plans.successor_plan_id IS 'Recommended upgrade path for this version';
```

**New Table: `plan_version_metadata`** (optional, for richer versioning)
```sql
CREATE TABLE plan_version_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  release_notes TEXT,
  breaking_changes TEXT[],
  migration_guide TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plan_version_metadata_plan_id ON plan_version_metadata(plan_id);
```

#### Backend Changes

**Enhanced Repository:** `server/repositories/subscription.repository.ts`
```typescript
export interface ISubscriptionPlanRepository {
  // Existing methods...
  findAll(filters?: SubscriptionPlanFilters): Promise<SubscriptionPlan[]>;
  findById(id: string): Promise<SubscriptionPlan>;
  
  // NEW: Versioning methods
  findLatestVersion(basePlanId: string): Promise<SubscriptionPlan | undefined>;
  findAllVersions(basePlanId: string): Promise<SubscriptionPlan[]>;
  findVersion(basePlanId: string, version: number): Promise<SubscriptionPlan | undefined>;
  createNewVersion(basePlanId: string, updates: Partial<SubscriptionPlan>, adminId: string): Promise<SubscriptionPlan>;
  deprecatePlan(planId: string, successorPlanId?: string): Promise<SubscriptionPlan>;
  archivePlan(planId: string): Promise<SubscriptionPlan>;
  getSubscriberCount(planId: string): Promise<number>;
}

export class SubscriptionPlanRepository extends BaseRepository<SubscriptionPlan, InsertSubscriptionPlan> 
  implements ISubscriptionPlanRepository {
  
  async findLatestVersion(basePlanId: string): Promise<SubscriptionPlan | undefined> {
    const results = await db
      .select()
      .from(subscriptionPlans)
      .where(
        and(
          eq(subscriptionPlans.basePlanId, basePlanId),
          eq(subscriptionPlans.isLatestVersion, true)
        )
      )
      .limit(1);
    return results[0];
  }

  async findAllVersions(basePlanId: string): Promise<SubscriptionPlan[]> {
    return await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.basePlanId, basePlanId))
      .orderBy(desc(subscriptionPlans.version));
  }

  async findVersion(basePlanId: string, version: number): Promise<SubscriptionPlan | undefined> {
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
    return results[0];
  }

  async createNewVersion(
    basePlanId: string, 
    updates: Partial<SubscriptionPlan>,
    adminId: string
  ): Promise<SubscriptionPlan> {
    // Transaction to ensure atomicity
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

      const nextVersion = currentLatest[0].version + 1;

      // Mark current as NOT latest
      await tx
        .update(subscriptionPlans)
        .set({ isLatestVersion: false })
        .where(eq(subscriptionPlans.id, currentLatest[0].id));

      // Create new version
      const newPlan = await tx
        .insert(subscriptionPlans)
        .values({
          ...currentLatest[0],  // Copy all fields from current
          ...updates,           // Apply updates
          id: undefined,        // Generate new ID
          basePlanId,
          version: nextVersion,
          versionName: `v${nextVersion}`,
          isLatestVersion: true,
          deprecatedAt: null,
          archivedAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      return newPlan[0];
    });
  }

  async deprecatePlan(planId: string, successorPlanId?: string): Promise<SubscriptionPlan> {
    const updated = await db
      .update(subscriptionPlans)
      .set({
        deprecatedAt: new Date(),
        successorPlanId,
        isActive: false,  // Stop showing to new users
        updatedAt: new Date()
      })
      .where(eq(subscriptionPlans.id, planId))
      .returning();

    if (!updated[0]) {
      throw new NotFoundError('Subscription Plan', planId);
    }

    return updated[0];
  }

  async archivePlan(planId: string): Promise<SubscriptionPlan> {
    // Can only archive if no active subscribers
    const subscriberCount = await this.getSubscriberCount(planId);
    if (subscriberCount > 0) {
      throw new InvalidOperationError(
        'archive plan',
        `Cannot archive plan with ${subscriberCount} active subscribers`
      );
    }

    const updated = await db
      .update(subscriptionPlans)
      .set({
        archivedAt: new Date(),
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(subscriptionPlans.id, planId))
      .returning();

    if (!updated[0]) {
      throw new NotFoundError('Subscription Plan', planId);
    }

    return updated[0];
  }

  async getSubscriberCount(planId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.planId, planId),
          eq(userSubscriptions.status, 'active')
        )
      );

    return Number(result[0]?.count || 0);
  }
}
```

**Enhanced Service:** `server/services/domain/subscription.service.ts`
```typescript
export interface ISubscriptionService {
  // Existing methods...
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  createSubscriptionPlan(plan: InsertSubscriptionPlan, adminId: string): Promise<SubscriptionPlan>;
  
  // NEW: Versioning methods
  createPlanVersion(
    basePlanId: string, 
    updates: Partial<SubscriptionPlan>,
    adminId: string,
    releaseNotes?: string
  ): Promise<SubscriptionPlan>;
  
  getPlanVersions(basePlanId: string): Promise<SubscriptionPlan[]>;
  getPlanVersion(basePlanId: string, version: number): Promise<SubscriptionPlan | undefined>;
  deprecatePlan(planId: string, successorPlanId: string | undefined, adminId: string, reason: string): Promise<void>;
  getPlanAnalytics(planId: string): Promise<PlanAnalytics>;
}

interface PlanAnalytics {
  planId: string;
  planName: string;
  version: number;
  activeSubscribers: number;
  totalRevenue: number;
  isDeprecated: boolean;
  deprecatedAt: Date | null;
  successorPlan: SubscriptionPlan | null;
}

export class SubscriptionService extends BaseService implements ISubscriptionService {
  constructor(
    private subscriptionPlanRepository: ISubscriptionPlanRepository,
    private planAuditRepository: ISubscriptionPlanAuditRepository,
    private userSubscriptionRepo: IUserSubscriptionRepository,
    private studentRepository: IStudentRepository
  ) {
    super();
  }

  async createPlanVersion(
    basePlanId: string,
    updates: Partial<SubscriptionPlan>,
    adminId: string,
    releaseNotes?: string
  ): Promise<SubscriptionPlan> {
    // Create new version
    const newVersion = await this.subscriptionPlanRepository.createNewVersion(
      basePlanId,
      updates,
      adminId
    );

    // Log in audit trail
    await this.planAuditRepository.logChange({
      planId: newVersion.id,
      changedBy: adminId,
      changeType: 'created',
      fieldChanges: {
        type: 'new_version',
        basePlanId,
        version: newVersion.version,
        changes: updates,
        releaseNotes
      },
      changeReason: `Created version ${newVersion.version}`
    });

    return newVersion;
  }

  async getPlanVersions(basePlanId: string): Promise<SubscriptionPlan[]> {
    return await this.subscriptionPlanRepository.findAllVersions(basePlanId);
  }

  async getPlanVersion(basePlanId: string, version: number): Promise<SubscriptionPlan | undefined> {
    return await this.subscriptionPlanRepository.findVersion(basePlanId, version);
  }

  async deprecatePlan(
    planId: string,
    successorPlanId: string | undefined,
    adminId: string,
    reason: string
  ): Promise<void> {
    // Check subscriber count first
    const subscriberCount = await this.subscriptionPlanRepository.getSubscriberCount(planId);
    
    if (subscriberCount === 0) {
      throw new InvalidOperationError(
        'deprecate plan',
        'Cannot deprecate plan with no subscribers. Use archive instead.'
      );
    }

    // Deprecate the plan
    await this.subscriptionPlanRepository.deprecatePlan(planId, successorPlanId);

    // Log in audit trail
    await this.planAuditRepository.logChange({
      planId,
      changedBy: adminId,
      changeType: 'deprecated',
      fieldChanges: {
        subscriberCount,
        successorPlanId
      },
      changeReason: reason
    });

    // TODO Phase 3: Send notification to affected subscribers
  }

  async getPlanAnalytics(planId: string): Promise<PlanAnalytics> {
    const plan = await this.subscriptionPlanRepository.findById(planId);
    const subscriberCount = await this.subscriptionPlanRepository.getSubscriberCount(planId);
    
    // Calculate total revenue from this plan
    const subscriptions = await this.userSubscriptionRepo.findAll({ planId });
    const totalRevenue = subscriptions.reduce((sum, sub) => {
      return sum + Number(sub.amountPaid || 0);
    }, 0);

    let successorPlan = null;
    if (plan.successorPlanId) {
      successorPlan = await this.subscriptionPlanRepository.findByIdOptional(plan.successorPlanId);
    }

    return {
      planId: plan.id,
      planName: plan.name,
      version: plan.version,
      activeSubscribers: subscriberCount,
      totalRevenue,
      isDeprecated: !!plan.deprecatedAt,
      deprecatedAt: plan.deprecatedAt,
      successorPlan
    };
  }
}
```

#### API Changes

**New Routes:** `server/routes/admin.routes.ts`
```typescript
// Plan versioning endpoints
router.post(
  '/subscription-plans/:basePlanId/versions',
  adminController.createPlanVersion.bind(adminController)
);

router.get(
  '/subscription-plans/:basePlanId/versions',
  adminController.getPlanVersions.bind(adminController)
);

router.get(
  '/subscription-plans/:basePlanId/versions/:version',
  adminController.getPlanVersion.bind(adminController)
);

router.post(
  '/subscription-plans/:planId/deprecate',
  adminController.deprecatePlan.bind(adminController)
);

router.post(
  '/subscription-plans/:planId/archive',
  adminController.archivePlan.bind(adminController)
);

router.get(
  '/subscription-plans/:planId/analytics',
  adminController.getPlanAnalytics.bind(adminController)
);
```

**New Controller Methods:** `server/controllers/admin.controller.ts`
```typescript
async createPlanVersion(req: AuthenticatedRequest, res: Response) {
  try {
    const { basePlanId } = req.params;
    const { updates, releaseNotes } = req.body;
    const adminId = this.getUserId(req);

    const subscriptionService = getService<ISubscriptionService>(TYPES.ISubscriptionService);
    const newVersion = await subscriptionService.createPlanVersion(
      basePlanId,
      updates,
      adminId,
      releaseNotes
    );

    res.status(201);
    return this.sendSuccess(res, newVersion);
  } catch (error) {
    return this.handleError(res, error, 'AdminController.createPlanVersion');
  }
}

async deprecatePlan(req: AuthenticatedRequest, res: Response) {
  try {
    const { planId } = req.params;
    const { successorPlanId, reason } = req.body;
    const adminId = this.getUserId(req);

    const subscriptionService = getService<ISubscriptionService>(TYPES.ISubscriptionService);
    await subscriptionService.deprecatePlan(planId, successorPlanId, adminId, reason);

    return this.sendSuccess(res, { message: 'Plan deprecated successfully' });
  } catch (error) {
    return this.handleError(res, error, 'AdminController.deprecatePlan');
  }
}
```

#### Frontend Changes

**Enhanced Plan Management UI:** `client/src/pages/SubscriptionPlans.tsx`
```tsx
// Add "Create New Version" button
<Button onClick={() => setCreateVersionDialog({ open: true, basePlan: plan })}>
  <Plus className="w-4 h-4 mr-2" />
  Create New Version
</Button>

// Version Dialog
<Dialog open={createVersionDialog.open} onOpenChange={(open) => setCreateVersionDialog({ ...createVersionDialog, open })}>
  <DialogContent className="max-w-3xl">
    <DialogHeader>
      <DialogTitle>Create New Version of {createVersionDialog.basePlan?.name}</DialogTitle>
      <DialogDescription>
        Current version: v{createVersionDialog.basePlan?.version} (₹{createVersionDialog.basePlan?.price})
        <br />
        Existing subscribers will stay on v{createVersionDialog.basePlan?.version}
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Creating a new version will:<br />
          • Keep existing subscribers on v{createVersionDialog.basePlan?.version}<br />
          • Make this new version available for new subscribers<br />
          • Mark the current version as deprecated (no new subscriptions)
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label>Price *</Label>
        <Input
          type="number"
          value={newVersionPrice}
          onChange={(e) => setNewVersionPrice(e.target.value)}
          placeholder="9999"
        />
      </div>

      <div className="space-y-2">
        <Label>Release Notes *</Label>
        <Textarea
          value={releaseNotes}
          onChange={(e) => setReleaseNotes(e.target.value)}
          placeholder="What changed in this version? E.g., Price increase due to expanded support coverage..."
          rows={4}
        />
      </div>

      {/* Copy other plan fields as needed */}
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setCreateVersionDialog({ open: false, basePlan: null })}>
        Cancel
      </Button>
      <Button onClick={handleCreateVersion}>
        Create Version v{(createVersionDialog.basePlan?.version || 0) + 1}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// Version History View
<Tabs defaultValue="current">
  <TabsList>
    <TabsTrigger value="current">Current Version</TabsTrigger>
    <TabsTrigger value="history">Version History ({planVersions.length})</TabsTrigger>
  </TabsList>
  
  <TabsContent value="history">
    <Table>
      <TableHeader>
        <TableRow>
          <TableCell>Version</TableCell>
          <TableCell>Price</TableCell>
          <TableCell>Active Subscribers</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Created</TableCell>
          <TableCell>Actions</TableCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {planVersions.map(version => (
          <TableRow key={version.id}>
            <TableCell>
              v{version.version}
              {version.isLatestVersion && <Badge className="ml-2">Latest</Badge>}
            </TableCell>
            <TableCell>₹{version.price}</TableCell>
            <TableCell>{version.subscriberCount}</TableCell>
            <TableCell>
              {version.deprecatedAt ? (
                <Badge variant="secondary">Deprecated</Badge>
              ) : version.archivedAt ? (
                <Badge variant="outline">Archived</Badge>
              ) : (
                <Badge variant="default">Active</Badge>
              )}
            </TableCell>
            <TableCell>{formatDate(version.createdAt)}</TableCell>
            <TableCell>
              <Button size="sm" variant="ghost" onClick={() => viewVersion(version)}>
                View
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TabsContent>
</Tabs>
```

#### Testing Strategy

1. **Unit Tests**
   - Test version creation logic
   - Test latest version retrieval
   - Test deprecation workflow

2. **Integration Tests**
   - Create plan → Create v2 → Verify v1 is NOT latest
   - Verify existing subscriptions stay on v1
   - Test subscriber count calculation

3. **E2E Tests**
   - Admin creates new version
   - Verify old subscribers see old price
   - Verify new subscribers see new price

#### Rollback Plan

**If issues occur:**
1. Do NOT rollback migration immediately (would orphan data)
2. Create compensating migration:
```sql
-- Emergency rollback: mark all plans as latest
UPDATE subscription_plans SET is_latest_version = true;

-- Future: proper migration to remove versioning
ALTER TABLE subscription_plans 
  DROP COLUMN base_plan_id,
  DROP COLUMN version,
  DROP COLUMN version_name,
  DROP COLUMN is_latest_version,
  DROP COLUMN deprecated_at,
  DROP COLUMN archived_at,
  DROP COLUMN successor_plan_id;
```

#### Success Metrics

- ✅ Admin can create new plan version
- ✅ Old subscribers remain on old version
- ✅ New subscribers get latest version
- ✅ Version history visible in admin UI
- ✅ Deprecated plans stop accepting new subs

---

### Phase 2: Grandfathering Implementation (Week 4)
**Complexity:** Medium  
**Priority:** CRITICAL - Customer satisfaction

#### Problem Solved
Automatically preserve pricing and terms for existing subscribers when plans change.

#### Database Changes

**Modify `user_subscriptions` Table:**
```sql
-- Migration: 0013_add_grandfathering_support.sql

ALTER TABLE user_subscriptions
  ADD COLUMN subscribed_plan_snapshot JSONB,
  ADD COLUMN grandfathered_price DECIMAL(10,2),
  ADD COLUMN grandfathered_until TIMESTAMP,
  ADD COLUMN is_grandfathered BOOLEAN DEFAULT false;

-- Backfill snapshot for existing subscriptions
UPDATE user_subscriptions us
SET subscribed_plan_snapshot = (
  SELECT to_jsonb(sp.*)
  FROM subscription_plans sp
  WHERE sp.id = us.plan_id
),
grandfathered_price = COALESCE(us.amount_paid, (
  SELECT sp.price
  FROM subscription_plans sp
  WHERE sp.id = us.plan_id
)),
is_grandfathered = true
WHERE us.status = 'active';

CREATE INDEX idx_user_subscriptions_grandfathered ON user_subscriptions(user_id) 
  WHERE is_grandfathered = true;

COMMENT ON COLUMN user_subscriptions.subscribed_plan_snapshot IS 'Immutable snapshot of plan terms at subscription time';
COMMENT ON COLUMN user_subscriptions.grandfathered_price IS 'Locked price for this subscriber, immune to plan changes';
COMMENT ON COLUMN user_subscriptions.grandfathered_until IS 'Optional expiration of grandfather clause (null = forever)';
```

#### Backend Changes

**Enhanced Service:** `server/services/domain/user-subscription.service.ts`
```typescript
async subscribeUserToPlan(userId: string, planId: string, orderId?: string): Promise<UserSubscription> {
  // ... existing validation ...

  // Fetch the plan to get complete details
  const plan = await this.subscriptionPlanRepo.findById(planId);
  if (!plan) {
    throw new NotFoundError('Subscription Plan', planId);
  }

  // Create subscription with grandfathering
  return await this.createSubscription({
    userId,
    planId,
    orderId,
    status: 'active',
    startedAt: new Date(),
    isLifetime: true,
    tierLevel: plan.tierLevel,
    amountPaid: plan.price,
    
    // NEW: Grandfathering fields
    subscribedPlanSnapshot: plan as any,  // Full immutable snapshot
    grandfatheredPrice: plan.price,        // Lock the price
    isGrandfathered: true,                 // Mark as grandfathered
    grandfatheredUntil: null,              // Forever (lifetime plans)
    
    lifetimeActivatedAt: new Date(),
    highestTierReached: plan.tierLevel,
    expiresAt: null,
    autoRenew: null
  });
}

// NEW: Get effective price for a subscriber
async getEffectivePrice(userId: string): Promise<number | null> {
  const subscription = await this.userSubscriptionRepo.findByUser(userId);
  
  if (!subscription) {
    return null;
  }

  // If grandfathered, return locked price
  if (subscription.isGrandfathered && subscription.grandfatheredPrice) {
    return Number(subscription.grandfatheredPrice);
  }

  // Otherwise, return current plan price
  const currentPlan = await this.subscriptionPlanRepo.findById(subscription.planId);
  return currentPlan ? Number(currentPlan.price) : null;
}

// NEW: Check if subscriber would benefit from price lock removal
async shouldOfferPriceUpdate(userId: string): Promise<{ 
  shouldOffer: boolean; 
  currentPrice: number; 
  newPrice: number;
  savings?: number;
}> {
  const subscription = await this.userSubscriptionRepo.findByUser(userId);
  
  if (!subscription || !subscription.isGrandfathered) {
    return { shouldOffer: false, currentPrice: 0, newPrice: 0 };
  }

  const currentPlan = await this.subscriptionPlanRepo.findById(subscription.planId);
  if (!currentPlan) {
    return { shouldOffer: false, currentPrice: 0, newPrice: 0 };
  }

  const lockedPrice = Number(subscription.grandfatheredPrice);
  const currentPrice = Number(currentPlan.price);

  // Offer if current price is LOWER than locked price
  if (currentPrice < lockedPrice) {
    return {
      shouldOffer: true,
      currentPrice: lockedPrice,
      newPrice: currentPrice,
      savings: lockedPrice - currentPrice
    };
  }

  return { shouldOffer: false, currentPrice: lockedPrice, newPrice: currentPrice };
}
```

**New API Endpoint:**
```typescript
// server/controllers/subscription.controller.ts
async getMyEffectivePrice(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = this.getUserId(req);
    const userSubscriptionService = getService<IUserSubscriptionService>(TYPES.IUserSubscriptionService);
    
    const effectivePrice = await userSubscriptionService.getEffectivePrice(userId);
    const priceUpdate = await userSubscriptionService.shouldOfferPriceUpdate(userId);
    
    return this.sendSuccess(res, {
      effectivePrice,
      priceUpdate
    });
  } catch (error) {
    return this.handleError(res, error, 'SubscriptionController.getMyEffectivePrice');
  }
}
```

#### Frontend Changes

**User Dashboard - Show Grandfathered Price:**
```tsx
// client/src/pages/Dashboard.tsx
const { data: subscription } = useApiQuery(['/api/subscription/current'], '/api/subscription/current');
const { data: priceInfo } = useApiQuery(['/api/subscription/effective-price'], '/api/subscription/effective-price');

{subscription && (
  <Card>
    <CardHeader>
      <CardTitle>Your Subscription</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Plan:</span>
          <span className="font-semibold">{subscription.plan.name}</span>
        </div>
        
        {subscription.isGrandfathered && (
          <>
            <div className="flex justify-between items-center">
              <span>Your Price:</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-green-600">
                  ₹{subscription.grandfatheredPrice}
                </span>
                <Badge variant="secondary">Locked</Badge>
              </div>
            </div>
            
            {priceInfo?.priceUpdate?.shouldOffer && (
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertTitle>Price Drop Available!</AlertTitle>
                <AlertDescription>
                  This plan now costs ₹{priceInfo.priceUpdate.newPrice} 
                  (save ₹{priceInfo.priceUpdate.savings}). 
                  <Button variant="link" onClick={handleUpdateToNewPrice}>
                    Update my price
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="text-xs text-muted-foreground">
              <Lock className="w-3 h-3 inline mr-1" />
              Your price is locked. New subscribers pay ₹{subscription.plan.price}.
            </div>
          </>
        )}
        
        {!subscription.isGrandfathered && (
          <div className="flex justify-between">
            <span>Price:</span>
            <span className="font-semibold">₹{subscription.plan.price}</span>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
)}
```

**Admin Dashboard - Show Grandfathered Subscribers:**
```tsx
// client/src/pages/SubscriptionPlans.tsx
<Card>
  <CardHeader>
    <CardTitle>Plan v{plan.version} - Subscriber Breakdown</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <div className="flex justify-between">
        <span>Current Price:</span>
        <span className="font-semibold">₹{plan.price}</span>
      </div>
      
      <Separator />
      
      <div className="flex justify-between text-sm">
        <span>Grandfathered subscribers (₹{plan.previousVersionPrice}):</span>
        <Badge variant="secondary">{analytics.grandfatheredCount}</Badge>
      </div>
      
      <div className="flex justify-between text-sm">
        <span>Current price subscribers (₹{plan.price}):</span>
        <Badge variant="default">{analytics.currentPriceCount}</Badge>
      </div>
      
      <Separator />
      
      <div className="flex justify-between font-semibold">
        <span>Total Active:</span>
        <span>{analytics.totalSubscribers}</span>
      </div>
    </div>
  </CardContent>
</Card>
```

#### Testing Strategy

1. **Unit Tests**
   - Test plan snapshot capture on subscription
   - Test effective price calculation
   - Test price update offer logic

2. **Integration Tests**
   - Subscribe user to plan → Update plan price → Verify user sees old price
   - Test price drop notification logic
   - Verify new subscribers get new price

3. **E2E Tests**
   - Full subscription flow with grandfathering
   - Admin changes plan price
   - Verify existing vs new subscriber pricing

#### Rollback Plan

No immediate rollback needed - new columns are additive. To disable:
```typescript
// Feature flag in service
const ENABLE_GRANDFATHERING = false;

async subscribeUserToPlan(...) {
  const subscription = {
    // ... existing fields
    isGrandfathered: ENABLE_GRANDFATHERING ? true : false,
    subscribedPlanSnapshot: ENABLE_GRANDFATHERING ? plan : null,
  };
}
```

#### Success Metrics

- ✅ 100% of new subscriptions have `subscribedPlanSnapshot` populated
- ✅ Existing subscribers see locked prices after plan updates
- ✅ New subscribers see updated prices
- ✅ Price drop offers shown when applicable
- ✅ Admin can see grandfathered vs current price breakdown

---

### Phase 3: Change Notification System (Week 5)
**Complexity:** Medium  
**Priority:** HIGH - Customer communication

#### Problem Solved
Notify subscribers in advance when plan prices or features change, maintaining trust and compliance.

#### Database Changes

**New Table: `subscription_plan_notifications`**
```sql
-- Migration: 0014_add_plan_change_notifications.sql

CREATE TABLE subscription_plan_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,  -- 'price_change', 'feature_change', 'deprecation', 'migration_required'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  effective_date TIMESTAMP NOT NULL,
  notification_date TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  recipient_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plan_notifications_plan_id ON subscription_plan_notifications(plan_id);
CREATE INDEX idx_plan_notifications_sent_at ON subscription_plan_notifications(sent_at);
CREATE INDEX idx_plan_notifications_effective_date ON subscription_plan_notifications(effective_date);
```

**New Table: `user_plan_notifications`** (tracking who received what)
```sql
CREATE TABLE user_plan_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_notification_id UUID NOT NULL REFERENCES subscription_plan_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  read_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  email_status VARCHAR(50),  -- 'sent', 'delivered', 'bounced', 'failed'
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_plan_notif_user_id ON user_plan_notifications(user_id);
CREATE INDEX idx_user_plan_notif_plan_notif_id ON user_plan_notifications(plan_notification_id);
CREATE INDEX idx_user_plan_notif_read_at ON user_plan_notifications(user_id, read_at);
```

#### Backend Changes

**New Service:** `server/services/domain/plan-notification.service.ts`
```typescript
export interface IPlanNotificationService {
  createPriceChangeNotification(
    planId: string,
    oldPrice: number,
    newPrice: number,
    effectiveDate: Date,
    adminId: string
  ): Promise<SubscriptionPlanNotification>;

  createDeprecationNotification(
    planId: string,
    successorPlanId: string | undefined,
    effectiveDate: Date,
    adminId: string,
    migrationDeadline?: Date
  ): Promise<SubscriptionPlanNotification>;

  sendPlanNotifications(notificationId: string): Promise<{ sent: number; failed: number }>;
  
  getUnreadPlanNotifications(userId: string): Promise<SubscriptionPlanNotification[]>;
  markPlanNotificationRead(userId: string, notificationId: string): Promise<void>;
  acknowledgePlanChange(userId: string, notificationId: string): Promise<void>;
}

export class PlanNotificationService extends BaseService implements IPlanNotificationService {
  constructor(
    private planNotificationRepo: IPlanNotificationRepository,
    private userPlanNotificationRepo: IUserPlanNotificationRepository,
    private subscriptionPlanRepo: ISubscriptionPlanRepository,
    private userSubscriptionRepo: IUserSubscriptionRepository,
    private notificationService: INotificationService,
    private emailService: IEmailService  // Assume SendGrid integration exists
  ) {
    super();
  }

  async createPriceChangeNotification(
    planId: string,
    oldPrice: number,
    newPrice: number,
    effectiveDate: Date,
    adminId: string
  ): Promise<SubscriptionPlanNotification> {
    const plan = await this.subscriptionPlanRepo.findById(planId);
    
    const priceIncrease = newPrice > oldPrice;
    const percentChange = ((newPrice - oldPrice) / oldPrice * 100).toFixed(1);
    
    const title = priceIncrease 
      ? `Price Increase Notice: ${plan.name}`
      : `Price Reduction Notice: ${plan.name}`;

    const message = priceIncrease
      ? `We're writing to inform you of an upcoming price change for your ${plan.name} subscription. Effective ${effectiveDate.toDateString()}, the price will increase from ₹${oldPrice} to ₹${newPrice} (${percentChange}% increase). Your current pricing is grandfathered and will NOT change. This new pricing applies only to new subscribers.`
      : `Good news! We're reducing the price of ${plan.name} from ₹${oldPrice} to ₹${newPrice} (${percentChange}% decrease). You can opt-in to the new lower price at any time from your account settings.`;

    // Schedule notification for 30 days before effective date (industry standard)
    const notificationDate = new Date(effectiveDate);
    notificationDate.setDate(notificationDate.getDate() - 30);

    return await this.planNotificationRepo.create({
      planId,
      notificationType: 'price_change',
      title,
      message,
      effectiveDate,
      notificationDate,
      metadata: {
        oldPrice,
        newPrice,
        percentChange,
        priceIncrease
      },
      createdBy: adminId
    });
  }

  async createDeprecationNotification(
    planId: string,
    successorPlanId: string | undefined,
    effectiveDate: Date,
    adminId: string,
    migrationDeadline?: Date
  ): Promise<SubscriptionPlanNotification> {
    const plan = await this.subscriptionPlanRepo.findById(planId);
    let successorPlan = null;
    
    if (successorPlanId) {
      successorPlan = await this.subscriptionPlanRepo.findByIdOptional(successorPlanId);
    }

    const title = `Important: ${plan.name} Plan Deprecation`;
    
    const message = successorPlan
      ? `We're discontinuing the ${plan.name} plan effective ${effectiveDate.toDateString()}. We've created an improved plan, ${successorPlan.name}, which we believe better serves your needs. Your current subscription will continue uninterrupted, but we encourage you to review the new plan. Migration deadline: ${migrationDeadline?.toDateString() || 'No deadline'}.`
      : `We're discontinuing the ${plan.name} plan effective ${effectiveDate.toDateString()}. Your current subscription will continue at your grandfathered price. No action is required.`;

    const notificationDate = new Date();  // Send immediately

    return await this.planNotificationRepo.create({
      planId,
      notificationType: 'deprecation',
      title,
      message,
      effectiveDate,
      notificationDate,
      metadata: {
        successorPlanId,
        migrationDeadline
      },
      createdBy: adminId
    });
  }

  async sendPlanNotifications(notificationId: string): Promise<{ sent: number; failed: number }> {
    const notification = await this.planNotificationRepo.findById(notificationId);
    
    // Get all active subscribers of this plan
    const subscriptions = await this.userSubscriptionRepo.findAll({
      planId: notification.planId,
      status: 'active'
    });

    let sent = 0;
    let failed = 0;

    for (const subscription of subscriptions) {
      try {
        // Create in-app notification
        await this.notificationService.createNotification({
          userId: subscription.userId,
          type: 'system',
          title: notification.title,
          message: notification.message,
          data: {
            planNotificationId: notificationId,
            planId: notification.planId,
            effectiveDate: notification.effectiveDate
          }
        });

        // Send email (if emailService is configured)
        // await this.emailService.sendPlanChangeNotification(...)

        // Track sent notification
        await this.userPlanNotificationRepo.create({
          planNotificationId: notificationId,
          userId: subscription.userId,
          emailStatus: 'sent'
        });

        sent++;
      } catch (error) {
        console.error(`Failed to send notification to user ${subscription.userId}:`, error);
        failed++;
      }
    }

    // Update notification with sent count
    await this.planNotificationRepo.update(notificationId, {
      sentAt: new Date(),
      recipientCount: sent
    });

    return { sent, failed };
  }

  async getUnreadPlanNotifications(userId: string): Promise<any[]> {
    return await this.userPlanNotificationRepo.findUnreadByUser(userId);
  }

  async markPlanNotificationRead(userId: string, notificationId: string): Promise<void> {
    await this.userPlanNotificationRepo.markAsRead(userId, notificationId);
  }

  async acknowledgePlanChange(userId: string, notificationId: string): Promise<void> {
    await this.userPlanNotificationRepo.acknowledge(userId, notificationId);
  }
}
```

**Integrate into Subscription Service:**
```typescript
// server/services/domain/subscription.service.ts
async createPlanVersion(
  basePlanId: string,
  updates: Partial<SubscriptionPlan>,
  adminId: string,
  releaseNotes?: string,
  notifySubscribers: boolean = true
): Promise<SubscriptionPlan> {
  const oldPlan = await this.subscriptionPlanRepository.findLatestVersion(basePlanId);
  const newVersion = await this.subscriptionPlanRepository.createNewVersion(basePlanId, updates, adminId);

  // Log in audit trail
  await this.planAuditRepository.logChange({
    planId: newVersion.id,
    changedBy: adminId,
    changeType: 'created',
    fieldChanges: {
      type: 'new_version',
      basePlanId,
      version: newVersion.version,
      changes: updates,
      releaseNotes
    },
    changeReason: `Created version ${newVersion.version}`
  });

  // NEW: Create notification if price changed
  if (notifySubscribers && oldPlan && updates.price && Number(updates.price) !== Number(oldPlan.price)) {
    const effectiveDate = new Date();
    effectiveDate.setDate(effectiveDate.getDate() + 30);  // 30 days from now

    const planNotificationService = getService<IPlanNotificationService>(TYPES.IPlanNotificationService);
    const notification = await planNotificationService.createPriceChangeNotification(
      oldPlan.id,
      Number(oldPlan.price),
      Number(updates.price),
      effectiveDate,
      adminId
    );

    // Send notifications immediately (or schedule for later)
    await planNotificationService.sendPlanNotifications(notification.id);
  }

  return newVersion;
}
```

#### Frontend Changes

**Admin UI - Notification Preview:**
```tsx
// client/src/pages/SubscriptionPlans.tsx
<AlertDialog open={createVersionDialog.open}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Create New Version & Notify Subscribers?</AlertDialogTitle>
      <AlertDialogDescription>
        This will create version v{nextVersion} and notify {subscriberCount} existing subscribers.
      </AlertDialogDescription>
    </AlertDialogHeader>
    
    <div className="space-y-4">
      <Alert>
        <Mail className="h-4 w-4" />
        <AlertTitle>Notification Preview</AlertTitle>
        <AlertDescription className="mt-2 p-4 bg-muted rounded-md">
          <strong>Subject:</strong> Price Increase Notice: {plan.name}<br /><br />
          
          We're writing to inform you of an upcoming price change for your {plan.name} subscription. 
          Effective {formatDate(effectiveDate)}, the price will increase from ₹{oldPrice} to ₹{newPrice} 
          ({percentChange}% increase).<br /><br />
          
          <strong className="text-green-600">
            Your current pricing of ₹{oldPrice} is grandfathered and will NOT change.
          </strong><br /><br />
          
          This new pricing applies only to new subscribers.
        </AlertDescription>
      </Alert>

      <div className="flex items-center space-x-2">
        <Checkbox 
          id="notifySubscribers" 
          checked={notifySubscribers} 
          onCheckedChange={setNotifySubscribers}
        />
        <Label htmlFor="notifySubscribers">
          Send notifications to {subscriberCount} subscribers
        </Label>
      </div>
    </div>

    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleCreateVersionWithNotification}>
        Create & Notify
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

**User Dashboard - Plan Change Notifications:**
```tsx
// client/src/components/NotificationCenter.tsx
const { data: planNotifications } = useApiQuery(
  ['/api/subscription/plan-notifications/unread'],
  '/api/subscription/plan-notifications/unread'
);

{planNotifications?.map(notif => (
  <Card key={notif.id} className="border-l-4 border-l-blue-500">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Bell className="w-5 h-5" />
        {notif.title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm mb-4">{notif.message}</p>
      
      <div className="flex items-center gap-4">
        <Button size="sm" onClick={() => acknowledgePlanChange(notif.id)}>
          I Understand
        </Button>
        <Button size="sm" variant="outline" onClick={() => viewPlanDetails(notif.planId)}>
          View Plan Details
        </Button>
      </div>
      
      <p className="text-xs text-muted-foreground mt-4">
        Effective Date: {formatDate(notif.effectiveDate)}
      </p>
    </CardContent>
  </Card>
))}
```

#### Testing Strategy

1. **Unit Tests**
   - Test notification message generation
   - Test recipient list creation
   - Test notification scheduling

2. **Integration Tests**
   - Create price change → Verify notifications created
   - Test notification delivery
   - Test read/acknowledgment tracking

3. **E2E Tests**
   - Admin creates new version
   - Verify subscribers receive in-app notification
   - Verify email sent (if configured)

#### Rollback Plan

Feature flag:
```typescript
const ENABLE_PLAN_NOTIFICATIONS = process.env.ENABLE_PLAN_NOTIFICATIONS === 'true';

if (ENABLE_PLAN_NOTIFICATIONS) {
  await planNotificationService.sendPlanNotifications(notification.id);
}
```

#### Success Metrics

- ✅ 100% of price changes trigger notifications
- ✅ < 5% notification delivery failure rate
- ✅ > 80% notification read rate within 7 days
- ✅ < 10 support tickets about unexpected price changes (down from current levels)

---

### Phase 4: Migration Workflow Tools (Week 6-7)
**Complexity:** Medium-High  
**Priority:** MEDIUM - Operational efficiency

#### Problem Solved
Provide admin tools to migrate subscribers from deprecated plans to new ones, with tracking and incentives.

#### Database Changes

**New Table: `plan_migrations`**
```sql
-- Migration: 0015_add_plan_migration_workflows.sql

CREATE TABLE plan_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  source_plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  target_plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  migration_type VARCHAR(50) NOT NULL,  -- 'voluntary', 'mandatory', 'incentivized'
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  incentive_type VARCHAR(50),  -- 'discount', 'free_months', 'feature_upgrade'
  incentive_value JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',  -- 'draft', 'active', 'completed', 'cancelled'
  total_eligible_users INTEGER DEFAULT 0,
  migrated_users INTEGER DEFAULT 0,
  declined_users INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plan_migrations_source_plan ON plan_migrations(source_plan_id);
CREATE INDEX idx_plan_migrations_target_plan ON plan_migrations(target_plan_id);
CREATE INDEX idx_plan_migrations_status ON plan_migrations(status);
```

**New Table: `plan_migration_users`**
```sql
CREATE TABLE plan_migration_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_id UUID NOT NULL REFERENCES plan_migrations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- 'pending', 'accepted', 'declined', 'migrated'
  notified_at TIMESTAMP,
  responded_at TIMESTAMP,
  migrated_at TIMESTAMP,
  incentive_applied BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plan_migration_users_migration_id ON plan_migration_users(migration_id);
CREATE INDEX idx_plan_migration_users_user_id ON plan_migration_users(user_id);
CREATE INDEX idx_plan_migration_users_status ON plan_migration_users(migration_id, status);
CREATE UNIQUE INDEX idx_plan_migration_users_unique ON plan_migration_users(migration_id, user_id);
```

#### Backend Changes

**New Service:** `server/services/domain/plan-migration.service.ts`
```typescript
export interface IPlanMigrationService {
  createMigration(data: CreateMigrationData, adminId: string): Promise<PlanMigration>;
  getMigration(migrationId: string): Promise<PlanMigration>;
  getMigrationsByPlan(planId: string): Promise<PlanMigration[]>;
  startMigration(migrationId: string, adminId: string): Promise<void>;
  processMigrationAcceptance(migrationId: string, userId: string): Promise<void>;
  processMigrationDecline(migrationId: string, userId: string, reason?: string): Promise<void>;
  getMigrationStats(migrationId: string): Promise<MigrationStats>;
  cancelMigration(migrationId: string, adminId: string, reason: string): Promise<void>;
}

interface CreateMigrationData {
  name: string;
  sourcePlanId: string;
  targetPlanId: string;
  migrationType: 'voluntary' | 'mandatory' | 'incentivized';
  startDate: Date;
  endDate?: Date;
  incentiveType?: 'discount' | 'free_months' | 'feature_upgrade';
  incentiveValue?: any;
}

interface MigrationStats {
  totalEligible: number;
  migrated: number;
  declined: number;
  pending: number;
  conversionRate: number;
}

export class PlanMigrationService extends BaseService implements IPlanMigrationService {
  constructor(
    private migrationRepo: IPlanMigrationRepository,
    private migrationUserRepo: IPlanMigrationUserRepository,
    private subscriptionPlanRepo: ISubscriptionPlanRepository,
    private userSubscriptionRepo: IUserSubscriptionRepository,
    private notificationService: INotificationService
  ) {
    super();
  }

  async createMigration(data: CreateMigrationData, adminId: string): Promise<PlanMigration> {
    // Validate plans exist
    const sourcePlan = await this.subscriptionPlanRepo.findById(data.sourcePlanId);
    const targetPlan = await this.subscriptionPlanRepo.findById(data.targetPlanId);

    if (!sourcePlan || !targetPlan) {
      throw new NotFoundError('Plan', 'source or target plan not found');
    }

    // Get eligible users
    const eligibleSubscriptions = await this.userSubscriptionRepo.findAll({
      planId: data.sourcePlanId,
      status: 'active'
    });

    // Create migration
    const migration = await this.migrationRepo.create({
      ...data,
      status: 'draft',
      totalEligibleUsers: eligibleSubscriptions.length,
      createdBy: adminId
    });

    // Create migration user records
    for (const subscription of eligibleSubscriptions) {
      await this.migrationUserRepo.create({
        migrationId: migration.id,
        userId: subscription.userId,
        subscriptionId: subscription.id,
        status: 'pending'
      });
    }

    return migration;
  }

  async startMigration(migrationId: string, adminId: string): Promise<void> {
    const migration = await this.migrationRepo.findById(migrationId);

    if (migration.status !== 'draft') {
      throw new InvalidOperationError('start migration', 'Migration is not in draft status');
    }

    // Update migration status
    await this.migrationRepo.update(migrationId, { status: 'active' });

    // Get all pending users
    const migrationUsers = await this.migrationUserRepo.findByMigration(migrationId, 'pending');

    // Send notifications
    for (const migUser of migrationUsers) {
      await this.notificationService.createNotification({
        userId: migUser.userId,
        type: 'system',
        title: `Plan Migration Opportunity: ${migration.name}`,
        message: this.generateMigrationMessage(migration),
        data: {
          migrationId: migration.id,
          sourcePlanId: migration.sourcePlanId,
          targetPlanId: migration.targetPlanId,
          incentive: migration.incentiveValue
        }
      });

      // Mark as notified
      await this.migrationUserRepo.update(migUser.id, { 
        notifiedAt: new Date() 
      });
    }
  }

  async processMigrationAcceptance(migrationId: string, userId: string): Promise<void> {
    const migUser = await this.migrationUserRepo.findByMigrationAndUser(migrationId, userId);
    const migration = await this.migrationRepo.findById(migrationId);

    if (!migUser) {
      throw new NotFoundError('Migration User', 'not found');
    }

    // Update subscription to new plan
    const subscription = await this.userSubscriptionRepo.findById(migUser.subscriptionId);
    const targetPlan = await this.subscriptionPlanRepo.findById(migration.targetPlanId);

    await this.userSubscriptionRepo.update(subscription.id, {
      planId: migration.targetPlanId,
      tierLevel: targetPlan.tierLevel,
      // Apply incentive if applicable
      grandfatheredPrice: this.calculateIncentivePrice(targetPlan, migration),
      isGrandfathered: true
    });

    // Update migration user status
    await this.migrationUserRepo.update(migUser.id, {
      status: 'migrated',
      respondedAt: new Date(),
      migratedAt: new Date(),
      incentiveApplied: !!migration.incentiveValue
    });

    // Update migration stats
    await this.migrationRepo.increment(migrationId, 'migratedUsers');

    // Log event
    // await subscriptionEventRepo.create({ ... })
  }

  async processMigrationDecline(migrationId: string, userId: string, reason?: string): Promise<void> {
    const migUser = await this.migrationUserRepo.findByMigrationAndUser(migrationId, userId);

    if (!migUser) {
      throw new NotFoundError('Migration User', 'not found');
    }

    await this.migrationUserRepo.update(migUser.id, {
      status: 'declined',
      respondedAt: new Date(),
      notes: reason
    });

    await this.migrationRepo.increment(migrationId, 'declinedUsers');
  }

  async getMigrationStats(migrationId: string): Promise<MigrationStats> {
    const migration = await this.migrationRepo.findById(migrationId);
    const pending = migration.totalEligibleUsers - migration.migratedUsers - migration.declinedUsers;

    return {
      totalEligible: migration.totalEligibleUsers,
      migrated: migration.migratedUsers,
      declined: migration.declinedUsers,
      pending,
      conversionRate: migration.totalEligibleUsers > 0 
        ? (migration.migratedUsers / migration.totalEligibleUsers) * 100 
        : 0
    };
  }

  private generateMigrationMessage(migration: PlanMigration): string {
    // Generate user-friendly migration message
    const baseMessage = `We're offering you an opportunity to migrate from your current plan to our improved ${migration.targetPlanId} plan.`;
    
    if (migration.incentiveType === 'discount') {
      return `${baseMessage} As a valued customer, you'll receive a ${migration.incentiveValue.percentage}% discount.`;
    } else if (migration.incentiveType === 'free_months') {
      return `${baseMessage} Plus, you'll get ${migration.incentiveValue.months} months free!`;
    }
    
    return baseMessage;
  }

  private calculateIncentivePrice(targetPlan: SubscriptionPlan, migration: PlanMigration): number {
    const basePrice = Number(targetPlan.price);
    
    if (migration.incentiveType === 'discount') {
      const discountPercent = migration.incentiveValue.percentage || 0;
      return basePrice * (1 - discountPercent / 100);
    }
    
    return basePrice;
  }
}
```

#### Frontend Changes

**Admin UI - Create Migration Workflow:**
```tsx
// client/src/pages/admin/PlanMigrations.tsx
export default function PlanMigrations() {
  const [createMigrationDialog, setCreateMigrationDialog] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Plan Migrations</h1>
        <Button onClick={() => setCreateMigrationDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Migration
        </Button>
      </div>

      <Dialog open={createMigrationDialog} onOpenChange={setCreateMigrationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Plan Migration</DialogTitle>
            <DialogDescription>
              Migrate subscribers from a deprecated plan to a new one
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Migration Name</Label>
              <Input
                placeholder="e.g., Premium v1 to Premium v2 Migration"
                value={migrationName}
                onChange={(e) => setMigrationName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>From Plan</Label>
                <Select value={sourcePlanId} onValueChange={setSourcePlanId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.filter(p => p.deprecatedAt).map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} v{plan.version} ({plan.activeSubscribers} subs)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>To Plan</Label>
                <Select value={targetPlanId} onValueChange={setTargetPlanId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.filter(p => !p.deprecatedAt).map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} v{plan.version}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Migration Type</Label>
              <Select value={migrationType} onValueChange={setMigrationType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="voluntary">Voluntary (users can decline)</SelectItem>
                  <SelectItem value="incentivized">Incentivized (offer discount)</SelectItem>
                  <SelectItem value="mandatory">Mandatory (auto-migrate)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {migrationType === 'incentivized' && (
              <div>
                <Label>Incentive</Label>
                <div className="flex gap-2">
                  <Select value={incentiveType} onValueChange={setIncentiveType}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discount">Percentage Discount</SelectItem>
                      <SelectItem value="free_months">Free Months</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Value"
                    value={incentiveValue}
                    onChange={(e) => setIncentiveValue(e.target.value)}
                  />
                </div>
              </div>
            )}

            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                This will affect {eligibleUsers} active subscribers on {sourcePlan?.name}
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateMigrationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateMigration}>
              Create Migration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Migration List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Migrations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Conversion Rate</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {migrations.map(migration => (
                <TableRow key={migration.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{migration.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {migration.sourcePlanName} → {migration.targetPlanName}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Progress value={(migration.migratedUsers / migration.totalEligibleUsers) * 100} />
                      <div className="text-xs text-muted-foreground">
                        {migration.migratedUsers} / {migration.totalEligibleUsers} migrated
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={migration.conversionRate > 70 ? "default" : "secondary"}>
                      {migration.conversionRate.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge>{migration.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => viewMigrationDetails(migration)}>
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

**User Dashboard - Migration Offer:**
```tsx
// client/src/components/MigrationOffer.tsx
const { data: migrationOffer } = useApiQuery(
  ['/api/subscription/migration-offer'],
  '/api/subscription/migration-offer'
);

{migrationOffer && (
  <Card className="border-l-4 border-l-green-500">
    <CardHeader>
      <CardTitle>Upgrade Opportunity!</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <p>
        We're offering you an exclusive opportunity to upgrade to our new {migrationOffer.targetPlanName} plan.
      </p>

      <div className="bg-muted p-4 rounded-md space-y-2">
        <div className="flex justify-between">
          <span>Current Plan:</span>
          <span className="font-semibold">{migrationOffer.currentPlanName}</span>
        </div>
        <div className="flex justify-between">
          <span>New Plan:</span>
          <span className="font-semibold">{migrationOffer.targetPlanName}</span>
        </div>
        {migrationOffer.incentive && (
          <div className="flex justify-between text-green-600">
            <span>Special Offer:</span>
            <span className="font-semibold">
              {migrationOffer.incentive.type === 'discount' && `${migrationOffer.incentive.value}% OFF`}
              {migrationOffer.incentive.type === 'free_months' && `${migrationOffer.incentive.value} Months FREE`}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={() => acceptMigration(migrationOffer.migrationId)} className="flex-1">
          Accept Upgrade
        </Button>
        <Button variant="outline" onClick={() => declineMigration(migrationOffer.migrationId)}>
          No Thanks
        </Button>
      </div>

      {migrationOffer.endDate && (
        <p className="text-xs text-muted-foreground">
          Offer expires: {formatDate(migrationOffer.endDate)}
        </p>
      )}
    </CardContent>
  </Card>
)}
```

#### Testing Strategy

1. **Unit Tests**
   - Test migration creation logic
   - Test incentive calculation
   - Test acceptance/decline processing

2. **Integration Tests**
   - Create migration → Start → Process acceptances
   - Test stats calculation
   - Test notification delivery

3. **E2E Tests**
   - Admin creates migration
   - User receives offer
   - User accepts/declines
   - Verify subscription updated

#### Rollback Plan

Migrations table is additive, no breaking changes. To rollback:
- Mark all migrations as 'cancelled'
- Feature flag to disable migration offers

#### Success Metrics

- ✅ > 60% voluntary migration acceptance rate
- ✅ < 5% migration-related support tickets
- ✅ Admin can track migration progress in real-time
- ✅ All migrations complete within deadlines

---

### Phase 5: Enhanced Admin UI & Reporting (Week 8)
**Complexity:** Low-Medium  
**Priority:** MEDIUM - Operations & analytics

#### Problem Solved
Provide admins with comprehensive dashboards to manage plan lifecycles, track revenue impact, and make data-driven decisions.

#### Features

1. **Plan Version Comparison Dashboard**
2. **Revenue Impact Analytics**
3. **Grandfathered Subscriber Reports**
4. **Audit Trail Viewer**
5. **Migration Performance Metrics**

#### Frontend Implementation

**Plan Analytics Dashboard:** `client/src/pages/admin/PlanAnalytics.tsx`
```tsx
export default function PlanAnalytics() {
  const { data: analytics } = useApiQuery(
    ['/api/admin/subscription-plans/analytics'],
    '/api/admin/subscription-plans/analytics'
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Subscription Analytics</h1>

      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{analytics?.totalMRR.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3 inline text-green-500" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalSubscribers}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.grandfatheredCount} grandfathered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Revenue Per User</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{analytics?.arpu.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Migrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.activeMigrations}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.pendingMigrations} pending responses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Version Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Plan Version</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>Plan</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Subscribers</TableCell>
                <TableCell>MRR</TableCell>
                <TableCell>Avg. Price</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics?.planVersions.map(pv => (
                <TableRow key={pv.id}>
                  <TableCell className="font-medium">{pv.name}</TableCell>
                  <TableCell>
                    v{pv.version}
                    {pv.isLatestVersion && <Badge className="ml-2" variant="default">Latest</Badge>}
                  </TableCell>
                  <TableCell>{pv.subscribers}</TableCell>
                  <TableCell>₹{pv.mrr.toLocaleString()}</TableCell>
                  <TableCell>₹{pv.avgPrice.toLocaleString()}</TableCell>
                  <TableCell>
                    {pv.deprecatedAt ? (
                      <Badge variant="secondary">Deprecated</Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Grandfathering Impact */}
      <Card>
        <CardHeader>
          <CardTitle>Grandfathering Revenue Impact</CardTitle>
          <CardDescription>
            Revenue difference between grandfathered subscribers and current pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics?.grandfatheringImpact.map(impact => (
              <div key={impact.planId} className="flex items-center justify-between p-4 border rounded-md">
                <div>
                  <div className="font-medium">{impact.planName}</div>
                  <div className="text-sm text-muted-foreground">
                    {impact.grandfatheredCount} subscribers on legacy pricing
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {impact.revenueGap > 0 ? '+' : ''}₹{impact.revenueGap.toLocaleString()}/mo
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Potential if all paid current price
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Audit Trail */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Plan Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Plan</TableCell>
                <TableCell>Change Type</TableCell>
                <TableCell>Changed By</TableCell>
                <TableCell>Details</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics?.recentChanges.map(change => (
                <TableRow key={change.id}>
                  <TableCell>{formatDateTime(change.createdAt)}</TableCell>
                  <TableCell>{change.planName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{change.changeType}</Badge>
                  </TableCell>
                  <TableCell>{change.changedByEmail}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {change.changeReason || 'No reason provided'}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => viewChangeDetails(change)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### Backend API Endpoints

```typescript
// server/controllers/admin.controller.ts
async getSubscriptionAnalytics(req: AuthenticatedRequest, res: Response) {
  try {
    const analyticsService = getService<ISubscriptionAnalyticsService>(TYPES.ISubscriptionAnalyticsService);
    
    const analytics = await analyticsService.getComprehensiveAnalytics();
    
    return this.sendSuccess(res, analytics);
  } catch (error) {
    return this.handleError(res, error, 'AdminController.getSubscriptionAnalytics');
  }
}
```

```typescript
// server/services/domain/subscription-analytics.service.ts (enhance existing)
async getComprehensiveAnalytics(): Promise<any> {
  const plans = await this.subscriptionPlanRepo.findAll();
  const subscriptions = await this.userSubscriptionRepo.findAll({ status: 'active' });
  
  // Calculate MRR
  const totalMRR = subscriptions.reduce((sum, sub) => {
    return sum + (sub.isGrandfathered ? Number(sub.grandfatheredPrice) : Number(sub.amountPaid));
  }, 0);

  // Grandfathering impact
  const grandfatheringImpact = [];
  for (const plan of plans) {
    const planSubs = subscriptions.filter(s => s.planId === plan.id);
    const grandfatheredSubs = planSubs.filter(s => s.isGrandfathered);
    
    const currentRevenue = grandfatheredSubs.reduce((sum, s) => sum + Number(s.grandfatheredPrice || 0), 0);
    const potentialRevenue = grandfatheredSubs.length * Number(plan.price);
    
    grandfatheringImpact.push({
      planId: plan.id,
      planName: plan.name,
      grandfatheredCount: grandfatheredSubs.length,
      currentRevenue,
      potentialRevenue,
      revenueGap: potentialRevenue - currentRevenue
    });
  }

  // Get recent changes
  const recentChanges = await this.planAuditRepo.getRecentChanges(20);

  return {
    totalMRR,
    totalSubscribers: subscriptions.length,
    grandfatheredCount: subscriptions.filter(s => s.isGrandfathered).length,
    arpu: totalMRR / subscriptions.length,
    planVersions: await this.getPlanVersionBreakdown(),
    grandfatheringImpact,
    recentChanges
  };
}
```

#### Testing Strategy

1. **Unit Tests**
   - Test analytics calculation logic
   - Test grandfathering impact calculation

2. **Integration Tests**
   - Verify analytics API returns correct data
   - Test with different plan/subscription scenarios

3. **Manual Testing**
   - Verify dashboards load correctly
   - Test data accuracy against database queries

#### Success Metrics

- ✅ Admin can view revenue impact of grandfathering
- ✅ All plan changes visible in audit log
- ✅ Migration performance trackable in real-time
- ✅ Dashboard loads < 2 seconds

---

## Industry Best Practices Summary

### Stripe's Approach
- **Product + Price model**: Immutable prices, products group related prices
- **Grandfathering**: Automatic via subscription.price_id
- **Versioning**: Create new Price, archive old one
- **Notifications**: Webhooks + email notifications
- **Migrations**: Subscription schedules for future changes

### Shopify's Approach
- **Billing plans**: Versioned with locked pricing
- **Grandfathering**: Built-in via `grandfathered` flag
- **Change management**: Requires merchant approval for price changes
- **Notifications**: Multi-channel (email, dashboard, webhook)

### ChartMogul/ProfitWell SaaS Metrics
- **Plan versioning**: Essential for accurate MRR tracking
- **Cohort analysis**: Track revenue by plan version
- **Grandfathered tracking**: Separate MRR from grandfathered vs current pricing

---

## Implementation Timeline

| Phase | Duration | Priority | Dependencies |
|-------|----------|----------|--------------|
| Phase 0: Audit Infrastructure | Week 1 | Foundation | None |
| Phase 1: Plan Versioning | Week 2-3 | CRITICAL | Phase 0 |
| Phase 2: Grandfathering | Week 4 | CRITICAL | Phase 1 |
| Phase 3: Notifications | Week 5 | HIGH | Phase 1-2 |
| Phase 4: Migrations | Week 6-7 | MEDIUM | Phase 1-3 |
| Phase 5: Admin UI | Week 8 | MEDIUM | Phase 1-4 |

**Total Duration:** 8 weeks  
**Resource Requirements:** 1 backend dev, 1 frontend dev, 1 QA tester

---

## Risk Mitigation

### Technical Risks

1. **Data Migration Complexity**
   - **Risk:** Backfilling versioning data for existing plans
   - **Mitigation:** Thorough testing on staging, gradual rollout

2. **Performance Impact**
   - **Risk:** Additional joins/queries slow down subscription lookups
   - **Mitigation:** Proper indexing, caching, query optimization

3. **Notification Delivery Failures**
   - **Risk:** Email/notification service outages
   - **Mitigation:** Queue-based retry mechanism, fallback channels

### Business Risks

1. **Customer Confusion**
   - **Risk:** Versioning complexity confuses users
   - **Mitigation:** Clear UI/UX, help documentation, support training

2. **Migration Resistance**
   - **Risk:** Low acceptance rates for voluntary migrations
   - **Mitigation:** Compelling incentives, clear value communication

---

## Success Criteria

### Technical Success Metrics

- ✅ 100% of new subscriptions capture plan snapshot
- ✅ Zero data loss during migration backfills
- ✅ < 200ms latency for subscription queries (with versioning)
- ✅ 100% audit trail coverage for plan changes

### Business Success Metrics

- ✅ > 60% voluntary migration acceptance rate
- ✅ < 10 support tickets/month about unexpected price changes
- ✅ > 95% grandfathering accuracy (correct price applied)
- ✅ > 80% notification delivery success rate

### Compliance Success Metrics

- ✅ Full GDPR compliance (right to be informed)
- ✅ SOC 2 audit trail requirements met
- ✅ Complete change history for financial audits

---

## Appendix

### A. Database Schema Reference

**Complete ER Diagram:**
```
subscription_plans (versioned)
  ├── base_plan_id → subscription_plans.id (self-reference)
  ├── successor_plan_id → subscription_plans.id (migration path)
  └── version (composite unique with base_plan_id)

user_subscriptions (with grandfathering)
  ├── plan_id → subscription_plans.id (current plan reference)
  ├── subscribed_plan_snapshot (JSONB) - immutable terms
  └── grandfathered_price (locked price)

subscription_plan_changes (audit trail)
  ├── plan_id → subscription_plans.id
  ├── changed_by → users.id
  └── field_changes (JSONB) - diff

plan_migrations (workflow tracking)
  ├── source_plan_id → subscription_plans.id
  ├── target_plan_id → subscription_plans.id
  └── plan_migration_users (junction table)

subscription_plan_notifications (change communications)
  ├── plan_id → subscription_plans.id
  └── user_plan_notifications (delivery tracking)
```

### B. API Endpoint Reference

**Plan Versioning:**
- `POST /api/admin/subscription-plans/:basePlanId/versions` - Create new version
- `GET /api/admin/subscription-plans/:basePlanId/versions` - List versions
- `POST /api/admin/subscription-plans/:planId/deprecate` - Deprecate plan

**Grandfathering:**
- `GET /api/subscription/effective-price` - Get user's effective price
- `POST /api/subscription/update-to-current-price` - Opt-in to price drop

**Notifications:**
- `GET /api/subscription/plan-notifications/unread` - Get user's unread notifications
- `POST /api/subscription/plan-notifications/:id/acknowledge` - Mark as read

**Migrations:**
- `POST /api/admin/plan-migrations` - Create migration workflow
- `POST /api/admin/plan-migrations/:id/start` - Start migration
- `POST /api/subscription/migrations/:id/accept` - User accepts migration
- `POST /api/subscription/migrations/:id/decline` - User declines migration

**Analytics:**
- `GET /api/admin/subscription-plans/analytics` - Comprehensive analytics

### C. Glossary

- **Base Plan**: The root plan that groups all versions together
- **Grandfathering**: Locking a subscriber's price/terms despite plan changes
- **Plan Snapshot**: Immutable copy of plan terms at subscription time
- **Plan Version**: A specific iteration of a plan with unique pricing/features
- **Migration**: Guided transition from one plan to another
- **Deprecation**: Marking a plan as no longer accepting new subscribers
- **Archive**: Removing a plan from all visibility (requires zero subscribers)

---

## Conclusion

This implementation plan transforms the subscription plan management from a **simple CRUD system** into a **production-ready, compliance-friendly, customer-centric platform** that matches industry standards set by Stripe, Shopify, and leading SaaS companies.

**Key Outcomes:**
1. **Grandfathering** → Customer loyalty, predictable revenue
2. **Versioning** → Legal compliance, audit readiness
3. **Notifications** → Customer trust, transparency
4. **Migrations** → Operational efficiency, revenue optimization
5. **Audit Trail** → Compliance (GDPR, SOC 2), accountability
6. **Admin Tools** → Data-driven decision making

**Next Steps:**
1. Review and approve this plan
2. Set up development environment
3. Begin Phase 0 (Audit Infrastructure)
4. Iterate based on feedback and testing

**Total Investment:** 8-10 weeks development + QA  
**ROI:** Reduced churn, increased customer satisfaction, legal compliance, scalable pricing strategy
