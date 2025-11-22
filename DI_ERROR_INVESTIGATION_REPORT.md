# Dependency Injection Error Investigation Report

## Executive Summary

This investigation identifies a critical timing issue in the dependency injection (DI) container initialization where singleton service instances are created **before** the container bindings are registered, causing `No binding found for token` errors.

**Error Context:**
```
Error: No binding found for token: Symbol(IUserSubscriptionService)
    at Container.get (/home/runner/workspace/server/services/container.ts:188:13)
    at new ProrationService (/home/runner/workspace/server/services/domain/proration.service.ts:25:75)
```

---

## 1. Root Cause Analysis

### The Problem Sequence

The error occurs due to the following sequence of events:

1. **Module Import** → When `server/controllers/payment.controller.ts` imports `prorationService`:
   ```typescript
   import { prorationService } from '../services/domain/proration.service';
   ```

2. **Singleton Creation** → The import triggers evaluation of `proration.service.ts`, which includes line 159:
   ```typescript
   export const prorationService = new ProrationService();
   ```

3. **Constructor Execution** → The `ProrationService` constructor is invoked with default parameters:
   ```typescript
   constructor(
     private userSubscriptionService: IUserSubscriptionService = container.get<IUserSubscriptionService>(TYPES.IUserSubscriptionService),
     private subscriptionPlanRepo: ISubscriptionPlanRepository = container.get<ISubscriptionPlanRepository>(TYPES.ISubscriptionPlanRepository)
   )
   ```

4. **Container.get() Failure** → The `container.get()` calls execute immediately, attempting to resolve `TYPES.IUserSubscriptionService` from the container.

5. **Binding Not Found** → At this point in the initialization sequence, the container only has **repository bindings** (set in the Container constructor). The **service bindings** are registered later via `initializeContainer()` which calls `container.registerServices()`.

### Why Repositories Work But Services Fail

- ✅ **Repositories**: Bound in `Container` constructor (lines 138-166 of container.ts), available immediately
- ❌ **Services**: Bound in `container.registerServices()` method (lines 245-311 of container.ts), only available after `initializeContainer()` is called

The container initialization happens in two phases:
1. **Constructor Phase**: Binds repositories, security services, and infrastructure services
2. **registerServices() Phase**: Binds domain services (after `initializeContainer()` is called)

### The Critical Timing Gap

```
Timeline of Events:
┌─────────────────────────────────────────────────────────────┐
│ 1. server/index.ts imports routes/index.ts                 │
│ 2. routes/index.ts imports controllers                     │
│ 3. payment.controller.ts imports prorationService          │
│ 4. proration.service.ts evaluates:                         │
│    export const prorationService = new ProrationService(); │
│ 5. Constructor tries: container.get(IUserSubscriptionSvc)  │
│ 6. ❌ ERROR: No binding found                              │
│                                                             │
│ [Much later in server/index.ts...]                         │
│                                                             │
│ 7. initializeContainer() is called                         │
│ 8. container.registerServices() binds all services         │
│ 9. ✅ IUserSubscriptionService is NOW bound                │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Import Chain Trace

### Path from server/index.ts to proration.service.ts

```
server/index.ts (line ~317)
  └─> import { registerRoutes } from "./routes/index"

server/routes/index.ts
  └─> import paymentRouter from './payment.routes'

server/routes/payment.routes.ts
  └─> import { PaymentController } from '../controllers/payment.controller'

server/controllers/payment.controller.ts (line 10)
  └─> import { prorationService } from '../services/domain/proration.service'

server/services/domain/proration.service.ts (line 159)
  └─> export const prorationService = new ProrationService()
      └─> constructor tries container.get<IUserSubscriptionService>()
          └─> ❌ FAILS: Service not bound yet
```

### When Container Initialization Happens

In `server/index.ts` (lines ~317-322):
```typescript
// Initialize DI container with service bindings (Phase 3)
try {
  const { initializeContainer } = await import('./services/container');
  await initializeContainer();
  console.log('✅ DI Container initialized with all service bindings');
} catch (error) {
  console.error('❌ Failed to initialize DI container:', error);
  process.exit(1);
}
```

This happens **AFTER** `registerRoutes()` is called, which means **AFTER** all the controllers and their service dependencies are imported.

---

## 3. Timing Issue Detailed

### The Circular Dependency Problem

The current architecture has a circular dependency in the initialization order:

```
Routes need Controllers
  ↓
Controllers need Services (singleton imports)
  ↓
Services need Container bindings
  ↓
Container bindings need Services to be created
  ↓
Services creation triggers constructor defaults
  ↓
Constructor defaults call container.get()
  ↓
Container.get() needs bindings that don't exist yet!
```

### Why This Pattern Is Problematic

The pattern of:
```typescript
export const xxxService = new XxxService();
```

...combined with constructor defaults:
```typescript
constructor(
  private dependency = container.get<IDependency>(TYPES.IDependency)
)
```

Creates an **eager initialization** problem where:
- The singleton is created when the module is first imported
- The constructor executes immediately (not lazily)
- Default parameters are evaluated at construction time
- This happens before `initializeContainer()` can register the service bindings

---

## 4. Other Services With The Same Pattern

### Complete List of Affected Services

I found **20 services** with this exact problematic pattern (singleton export + container.get in constructor defaults):

#### Domain Services
1. ✅ `application.service.ts` - Uses only repositories (works)
2. ✅ `auth.service.ts` - Uses only repositories (works)
3. ✅ `chat.service.ts` - Uses only repositories (works)
4. ✅ `company-profile.service.ts` - Uses repositories, has lazy service getter (works)
5. ✅ `counselor-assignment.service.ts` - Uses only repositories (works)
6. ✅ `counselor-dashboard.service.ts` - Uses only repositories (works)
7. ✅ `document.service.ts` - Uses only repositories (works)
8. ✅ `event.service.ts` - Uses only repositories (works)
9. ✅ `forum.service.ts` - Uses only repositories (works)
10. ✅ `notification.service.ts` - Uses only repositories (works)
11. ✅ `payment.service.ts` - Uses only repositories (works)
12. ❌ **`proration.service.ts`** - **Uses IUserSubscriptionService (FAILS)**
13. ✅ `registration.service.ts` - Uses repositories, has lazy service getters (works)
14. ✅ `subscription.service.ts` - Uses only repositories (works)
15. ✅ `testimonial.service.ts` - Uses only repositories (works)
16. ✅ `university.service.ts` - Uses only repositories (works)
17. ✅ `user-profile.service.ts` - Uses only repositories (works)
18. ✅ `user-subscription.service.ts` - Uses only repositories (works)

#### Admin Services (9 services)
All admin services (analytics, company, forum-moderation, security, staff-invitation, student, testimonial, university, user-admin) use only repositories in their constructors.

#### Infrastructure Services
19. ✅ `validation.service.ts` - No dependencies
20. ✅ `subscription-audit.service.ts` - Uses only repositories
21. ✅ `webhook-deduplication.service.ts` - No dependencies

#### Integration Services
22. ✅ `ai-matching.service.ts` - Uses only repositories

### Why Only ProrationService Fails

**ProrationService is the ONLY service that:**
1. Has a singleton export: `export const prorationService = new ProrationService()`
2. Uses a **service** dependency (IUserSubscriptionService) in constructor defaults
3. Is imported by a controller that loads before container initialization

Other services either:
- Use only repositories (which are bound in Container constructor)
- Use lazy getters for service dependencies (like `auth.service.ts` and `registration.service.ts`)

### Pattern Examples

**❌ Problematic Pattern (ProrationService):**
```typescript
constructor(
  private userSubscriptionService: IUserSubscriptionService = container.get<IUserSubscriptionService>(TYPES.IUserSubscriptionService),
  private subscriptionPlanRepo: ISubscriptionPlanRepository = container.get<ISubscriptionPlanRepository>(TYPES.ISubscriptionPlanRepository)
)
```

**✅ Safe Pattern with Lazy Getter (AuthService, RegistrationService):**
```typescript
constructor(
  private userRepo: IUserRepository = container.get<IUserRepository>(TYPES.IUserRepository)
) {
  super();
}

// Lazy service dependency resolution
private get adminSecurityService(): IAdminSecurityService {
  return container.get<IAdminSecurityService>(TYPES.IAdminSecurityService);
}
```

---

## 5. Solution Options

### Option 1: Lazy Getter Pattern (Recommended)

**Approach:** Convert service dependencies to lazy getters like other services do.

**Implementation:**
```typescript
// proration.service.ts
export class ProrationService extends BaseService implements IProrationService {
  constructor(
    private subscriptionPlanRepo: ISubscriptionPlanRepository = container.get<ISubscriptionPlanRepository>(TYPES.ISubscriptionPlanRepository)
  ) {
    super();
  }

  // Lazy getter for service dependency
  private get userSubscriptionService(): IUserSubscriptionService {
    return container.get<IUserSubscriptionService>(TYPES.IUserSubscriptionService);
  }

  async calculate(userId: string, targetPlanId: string): Promise<ProrationCalculationResult> {
    // Use this.userSubscriptionService instead of injected dependency
    const currentSubscription = await this.userSubscriptionService.getCurrentSubscription(userId);
    // ... rest of implementation
  }
}

export const prorationService = new ProrationService();
```

**Pros:**
- ✅ Minimal changes required
- ✅ Consistent with existing patterns (auth.service.ts, registration.service.ts, company-profile.service.ts)
- ✅ Singleton export pattern can remain
- ✅ No changes to controllers or container
- ✅ Dependencies resolved when actually needed, not at construction time

**Cons:**
- ⚠️ Dependencies are resolved on first access (slight runtime overhead)
- ⚠️ Less explicit about dependencies in constructor signature

**Risk Level:** Low

---

### Option 2: Remove Singleton Exports, Use Container Resolution

**Approach:** Stop exporting singletons; always get services from container.

**Implementation:**
```typescript
// proration.service.ts
export class ProrationService extends BaseService implements IProrationService {
  constructor(
    private userSubscriptionService: IUserSubscriptionService,
    private subscriptionPlanRepo: ISubscriptionPlanRepository
  ) {
    super();
  }
  // ... implementation
}

// Remove: export const prorationService = new ProrationService();
```

```typescript
// container.ts - registerServices()
const { ProrationService } = await import('./domain/proration.service');
const prorationServiceInstance = new ProrationService(
  userSubscriptionService,
  subscriptionPlanRepo
);
this.bindings.set(TYPES.IProrationService, prorationServiceInstance);
```

```typescript
// payment.controller.ts
import { container, TYPES } from '../services/container';
import { IProrationService } from '../services/domain/proration.service';

class PaymentController {
  private prorationService = container.get<IProrationService>(TYPES.IProrationService);
  
  async createOrder(req, res) {
    const result = await this.prorationService.calculate(userId, planId);
    // ...
  }
}
```

**Pros:**
- ✅ True dependency injection - container controls all instantiation
- ✅ Better testability - easy to mock dependencies
- ✅ Explicit dependency graph
- ✅ No timing issues - all services created after container init

**Cons:**
- ⚠️ Requires changes to all controllers using prorationService
- ⚠️ Requires adding IProrationService to TYPES symbols
- ⚠️ More extensive refactoring needed
- ⚠️ Need to update all 20+ service files for consistency

**Risk Level:** Medium

---

### Option 3: Delay Singleton Creation Until Container Ready

**Approach:** Export a factory function instead of immediate singleton.

**Implementation:**
```typescript
// proration.service.ts
export class ProrationService extends BaseService implements IProrationService {
  constructor(
    private userSubscriptionService: IUserSubscriptionService = container.get<IUserSubscriptionService>(TYPES.IUserSubscriptionService),
    private subscriptionPlanRepo: ISubscriptionPlanRepository = container.get<ISubscriptionPlanRepository>(TYPES.ISubscriptionPlanRepository)
  ) {
    super();
  }
  // ... implementation
}

// Lazy singleton - only created when first accessed
let _prorationServiceInstance: ProrationService | null = null;

export function getProrationService(): ProrationService {
  if (!_prorationServiceInstance) {
    _prorationServiceInstance = new ProrationService();
  }
  return _prorationServiceInstance;
}

// Or: export const prorationService = new Proxy({}, { get: () => getProrationService() });
```

```typescript
// payment.controller.ts
import { getProrationService } from '../services/domain/proration.service';

async createOrder(req, res) {
  const prorationService = getProrationService();
  const result = await prorationService.calculate(userId, planId);
  // ...
}
```

**Pros:**
- ✅ Singleton created after container initialization
- ✅ Backward compatible with function call syntax
- ✅ No changes to container needed

**Cons:**
- ⚠️ Requires changing all import sites from `prorationService` to `getProrationService()`
- ⚠️ Inconsistent with other service patterns
- ⚠️ Still relies on module-level state
- ⚠️ More complex than lazy getters

**Risk Level:** Medium

---

## Recommendation

**Implement Option 1: Lazy Getter Pattern**

This is the recommended solution because:

1. **Minimal Impact**: Only requires changing `proration.service.ts`
2. **Proven Pattern**: Already used successfully in `auth.service.ts`, `registration.service.ts`, and `company-profile.service.ts`
3. **Low Risk**: No changes to controllers, routes, or container initialization
4. **Quick Fix**: Can be implemented and tested immediately
5. **Consistent**: Aligns with existing codebase patterns

### Implementation Steps

1. Convert `userSubscriptionService` constructor parameter to a lazy getter
2. Update all usages of `this.userSubscriptionService` in the class (they remain unchanged)
3. Test the proration calculation flow
4. Verify no other services have this pattern with service dependencies

---

## Additional Findings

### Services Currently Using Lazy Getters

Several services already use the lazy getter pattern for service dependencies:

1. **AuthService** (`auth.service.ts` line 51-53):
   ```typescript
   private get adminSecurityService(): IAdminSecurityService {
     return container.get<IAdminSecurityService>(TYPES.IAdminSecurityService);
   }
   ```

2. **RegistrationService** (`registration.service.ts` lines 38-44):
   ```typescript
   private get validationService(): IValidationService {
     return container.get<IValidationService>(TYPES.IValidationService);
   }

   private get adminStaffInvitationService(): IAdminStaffInvitationService {
     return container.get<IAdminStaffInvitationService>(TYPES.IAdminStaffInvitationService);
   }
   ```

3. **CompanyProfileService** (`company-profile.service.ts`):
   Uses lazy getter for IForumService

4. **AdminStudentService** (`admin/student-admin.service.ts`):
   Uses lazy getter for IUserSubscriptionService

This confirms the lazy getter pattern is an established and working approach in the codebase.

---

## Conclusion

The root cause is a **timing mismatch** between when singleton services are instantiated (during module import) and when the DI container registers service bindings (after `initializeContainer()`). 

ProrationService uniquely fails because it's the only singleton-exported service that depends on another service (IUserSubscriptionService) in its constructor defaults.

The recommended fix is to convert the service dependency to a lazy getter, matching the pattern already used successfully in other parts of the codebase.

---

**Report Generated:** Investigation Complete  
**Status:** No code changes made (investigation only)  
**Next Steps:** Implement Option 1 (Lazy Getter Pattern) to resolve the issue
