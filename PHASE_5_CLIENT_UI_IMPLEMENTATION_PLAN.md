# Phase 5: Client UI Implementation Plan
## Subscription Plan Versioning System - Frontend Updates

**Date:** November 8, 2025  
**Project:** Phozos EduPath Platform  
**Scope:** Complete UI/UX implementation for subscription plan versioning and grandfathering  
**Estimated Duration:** 2-3 weeks

> **Historical Note:** Premium badge components (PremiumBadgeSelector, PremiumBadgeDisplay) were removed on November 11, 2025 and replaced with a simple icon system (PlanLogoSelector). This document reflects the architecture as of November 8, 2025. Where badge components are mentioned, they now refer to the simplified logo system.

---

## Table of Contents

1. [Investigation Summary](#investigation-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Implementation Plan](#implementation-plan)
4. [Component Specifications](#component-specifications)
5. [API Integration](#api-integration)
6. [Testing Strategy](#testing-strategy)
7. [Migration Path](#migration-path)

---

## Investigation Summary

### 1. Current Subscription Plans UI Analysis

**File:** `client/src/pages/SubscriptionPlans.tsx` (1431 lines)

#### Current Form Structure

**Plan Creation Form (Lines 476-679):**
- **Dialog Component:** Radix UI Dialog with max-width 4xl, max-height 90vh
- **Form Handling:** Native form with FormData, no react-hook-form
- **State Management:** Local useState hooks for each field
- **Validation:** Manual FormData extraction, no Zod validation on client
- **Fields:** 23 total fields organized in grid layouts (grid-cols-2, grid-cols-3)
  - Text inputs: name, price, currency, description
  - Number inputs: tierLevel, displayOrder, maxUniversities, maxCountries, turnaroundDays
  - Select dropdowns: universityTier, supportType
  - Textarea: features (one per line), description
  - Checkboxes: 11 feature flags (includeLoanAssistance, includeVisaSupport, etc.)
  - Custom component: PlanLogoSelector (simple icon selection) *(updated from PremiumBadgeSelector)*

**Plan Update Form (Lines 1182-1336):**
- Same structure as creation form
- Pre-populated with `defaultValue` attributes
- Separate state for editing: `editingPlan` and `editSelectedLogo` *(updated from editSelectedBadge)*

#### Current State Management

```typescript
// Local State (Lines 142-159)
const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
const [selectedLogo, setSelectedLogo] = useState<string>("shield");  // Updated: was selectedBadge with BadgeKey type
const [editSelectedLogo, setEditSelectedLogo] = useState<string>("shield");  // Updated: was editSelectedBadge

// Filter/Sort State
const [statusFilter, setStatusFilter] = useState<string>("all");
const [planFilter, setPlanFilter] = useState<string>("all");
const [searchText, setSearchText] = useState("");
const [sortBy, setSortBy] = useState<"date" | "email" | "plan">("date");

// Dialog State
const [paymentHistoryDialog, setPaymentHistoryDialog] = useState<{ open: boolean; userId: string | null }>();
const [eventsDialog, setEventsDialog] = useState<{ open: boolean; userId: string | null }>();
const [cancelDialog, setCancelDialog] = useState<{ open: boolean; subscriptionId: string | null; userEmail: string | null }>();
const [upgradeDialog, setUpgradeDialog] = useState<{ open: boolean; subscription: UserSubscription | null }>();
const [createVersionDialog, setCreateVersionDialog] = useState<{ open: boolean; plan: SubscriptionPlan | null; newPrice: string }>();
const [notifySubscribers, setNotifySubscribers] = useState(true);
```

#### Current API Calls

```typescript
// React Query Hooks (Lines 167-200)
const { data: plans = [], isLoading: plansLoading } = useApiQuery<SubscriptionPlan[]>(
  ["/api/admin/subscription-plans"],
  '/api/admin/subscription-plans',
  undefined,
  { enabled: !loading && isAdmin }
);

const { data: subscriptions = [] } = useApiQuery<UserSubscription[]>(
  ["/api/admin/user-subscriptions"],
  '/api/admin/user-subscriptions',
  undefined,
  { enabled: !loading && isAdmin }
);

const { data: failedPayments = [] } = useApiQuery<FailedPayment[]>(
  ["/api/admin/failed-payments"],
  '/api/admin/failed-payments',
  undefined,
  { enabled: !loading && isAdmin }
);

// Conditional queries for dialogs
const { data: paymentHistory = [] } = useApiQuery<PaymentHistory[]>(
  [`/api/admin/user-subscriptions/${paymentHistoryDialog.userId}/payment-history`],
  `/api/admin/user-subscriptions/${paymentHistoryDialog.userId}/payment-history`,
  undefined,
  { enabled: !loading && isAdmin && !!paymentHistoryDialog.userId }
);
```

#### Current Mutations

```typescript
// CRUD Mutations (Lines 202-279)
const createPlanMutation = useApiMutation(
  (data: Partial<SubscriptionPlan>) => api.post("/api/admin/subscription-plans", data),
  {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
      setIsCreateDialogOpen(false);
      toast({ title: "Success", description: "Subscription plan created successfully" });
    }
  }
);

const updatePlanMutation = useApiMutation(
  (data: { id: string; updates: Partial<SubscriptionPlan> }) =>
    api.put(`/api/admin/subscription-plans/${data.id}`, data.updates),
  {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
      setEditingPlan(null);
      toast({ title: "Success", description: "Subscription plan updated successfully" });
    }
  }
);

const createVersionMutation = useApiMutation(
  (data: { planId: string; updates: any; notifySubscribers: boolean }) =>
    api.post(`/api/admin/subscription-plans/${data.planId}/create-version`, {
      updates: data.updates,
      notifySubscribers: data.notifySubscribers
    }),
  {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user-subscriptions"] });
      setCreateVersionDialog({ open: false, plan: null, newPrice: "" });
      toast({ 
        title: "Success", 
        description: "New plan version created successfully" + (notifySubscribers ? " and notifications sent" : "")
      });
    }
  }
);
```

#### Existing Components Used

**From shadcn/ui:**
- Card, CardContent, CardHeader, CardTitle, CardDescription
- Button
- Input, Textarea
- Badge
- Label
- Select, SelectContent, SelectItem, SelectTrigger, SelectValue
- Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
- Tabs, TabsContent, TabsList, TabsTrigger
- Table, TableBody, TableCell, TableHead, TableHeader, TableRow
- AlertDialog (all components)
- Alert, AlertDescription, AlertTitle
- Checkbox

**Custom Components:**
- PlanLogoSelector (from @/components/PlanLogoSelector) *(replaced PremiumBadgeSelector/Display on 2025-11-11)*
- useAuth hook
- useToast hook

---

### 2. Component Architecture

#### Available shadcn/ui Components

```
✅ Available (50 components):
- accordion.tsx
- alert-dialog.tsx ✅ (USED)
- alert.tsx ✅ (USED)
- aspect-ratio.tsx
- avatar.tsx
- badge.tsx ✅ (USED)
- breadcrumb.tsx
- button.tsx ✅ (USED)
- calendar.tsx
- card.tsx ✅ (USED)
- carousel.tsx
- chart.tsx
- checkbox.tsx ✅ (USED)
- collapsible.tsx
- command.tsx
- context-menu.tsx
- dialog.tsx ✅ (USED)
- drawer.tsx
- dropdown-menu.tsx
- file-upload.tsx
- form.tsx ⚠️ (AVAILABLE but not used - react-hook-form integration)
- hover-card.tsx
- image-lightbox.tsx
- input-otp.tsx
- input.tsx ✅ (USED)
- label.tsx ✅ (USED)
- loading-skeleton.tsx
- menubar.tsx
- navigation-menu.tsx
- optimized-image.tsx
- pagination.tsx
- popover.tsx
- progress.tsx
- radio-group.tsx
- resizable.tsx
- scroll-area.tsx
- select.tsx ✅ (USED)
- separator.tsx
- sheet.tsx
- sidebar.tsx
- skeleton.tsx
- slider.tsx
- switch.tsx
- table.tsx ✅ (USED)
- tabs.tsx ✅ (USED)
- textarea.tsx ✅ (USED)
- theme-provider.tsx
- toast.tsx ✅ (USED via useToast)
- toaster.tsx ✅ (USED)
- toggle-group.tsx
- toggle.tsx
- tooltip.tsx
```

#### Component Patterns & Conventions

**Pattern 1: Lazy Loading for Admin Pages**
```typescript
// client/src/App.tsx (Lines 39-48)
const PlanAnalytics = lazy(() => import("@/pages/admin/PlanAnalytics"));
const FeatureManagementDashboard = lazy(() => import("@/pages/admin/FeatureManagementDashboard"));

// Usage with Suspense
<Route path="/admin/plan-analytics">
  <ProtectedRoute {...adminOnly}>
    <Suspense fallback={<LoadingFallback />}>
      <PlanAnalytics />
    </Suspense>
  </ProtectedRoute>
</Route>
```

**Pattern 2: Protected Routes**
```typescript
// Admin-only protection
const adminOnly = { 
  allowedUserTypes: ['team_member'] as ('customer' | 'team_member' | 'company_profile')[], 
  allowedRoles: ['admin'] 
};

// Usage
<Route path="/admin/features">
  <ProtectedRoute {...adminOnly}>
    <Suspense fallback={<LoadingFallback />}>
      <FeatureManagementDashboard />
    </Suspense>
  </ProtectedRoute>
</Route>
```

**Pattern 3: Card-based Layouts**
```typescript
// From PlanAnalytics.tsx (Lines 174-183)
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Total MRR</CardTitle>
    <DollarSign className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">{formatCurrency(analytics.overview.totalMRR)}</div>
    <p className="text-xs text-muted-foreground mt-1">Monthly Recurring Revenue</p>
  </CardContent>
</Card>
```

**Pattern 4: Loading States**
```typescript
// PlanAnalytics.tsx (Lines 118-135)
if (isLoading) {
  return (
    <>
      <AppShell />
      <div className="container mx-auto p-6 pt-24 space-y-6">
        <LoadingSkeleton className="h-32" />
        <LoadingSkeleton className="h-64" />
      </div>
    </>
  );
}
```

**Pattern 5: Error States**
```typescript
// PlanAnalytics.tsx (Lines 137-151)
if (error || !analytics) {
  return (
    <>
      <AppShell />
      <div className="container mx-auto p-6 pt-24">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load analytics data.'}
          </AlertDescription>
        </Alert>
      </div>
    </>
  );
}
```

---

### 3. API Integration Patterns

#### API Client Architecture

**File:** `client/src/lib/api-client.ts` (640 lines, simplified from 531 lines)

**Key Patterns:**
```typescript
// Simple fetch wrapper with automatic JWT injection
export async function apiRequest<T>(
  url: string,
  options?: RequestOptions,
  responseSchema?: z.ZodSchema<T>
): Promise<T>

// Automatic token refresh on 401
if (response.status === 401) {
  return await handleTokenRefreshAndRetry<T>(url, options, responseSchema);
}

// CSRF token handling for state-changing requests
const needsCsrf = !skipCsrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
if (needsCsrf) {
  await ensureCsrfReady();
  requestHeaders['x-csrf-token'] = getCsrfToken();
}

// Automatic response unwrapping
const unwrappedData = data?.success === true ? data.data : data;

// Optional Zod validation
if (responseSchema) {
  const validated = responseSchema.parse(unwrappedData);
  return validated;
}
```

**Exported API Methods:**
```typescript
export const api = {
  get: <T>(url: string, responseSchema?: z.ZodSchema<T>) => apiRequest<T>(...),
  post: <T>(url: string, body?: any, responseSchema?: z.ZodSchema<T>) => apiRequest<T>(...),
  put: <T>(url: string, body?: any, responseSchema?: z.ZodSchema<T>) => apiRequest<T>(...),
  patch: <T>(url: string, body?: any, responseSchema?: z.ZodSchema<T>) => apiRequest<T>(...),
  delete: <T>(url: string, responseSchema?: z.ZodSchema<T>) => apiRequest<T>(...)
};
```

#### React Query Hooks

**File:** `client/src/hooks/api-hooks.ts` (401 lines)

**Hook #1: useApiQuery**
```typescript
export function useApiQuery<T>(
  queryKey: (string | number | boolean)[],
  url: string,
  responseSchema?: z.ZodSchema<T>,
  options?: Omit<UseQueryOptions<T, ApiError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T, ApiError>({
    queryKey,
    queryFn: () => apiRequest<T>(url, { method: 'GET' }, responseSchema),
    retry: (failureCount, error) => {
      if (error.isAuthError()) return false;
      if (error.isValidationError()) return false;
      if (error.status >= 400 && error.status < 500) return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options
  });
}
```

**Hook #2: useApiMutation**
```typescript
export function useApiMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, ApiError, TVariables>
) {
  const { toast } = useToast();

  return useMutation<TData, ApiError, TVariables>({
    mutationFn,
    onError: (error, variables, context) => {
      if (!options?.onError) {
        // Automatic error toast
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      }
      options?.onError?.(error, variables, context);
    },
    ...options
  });
}
```

#### Error Handling Patterns

**ApiError Class:**
```typescript
export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;
  public readonly field?: string;
  public readonly hint?: string;

  isAuthError(): boolean {
    return this.code.startsWith('AUTH_') || this.status === 401;
  }

  isValidationError(): boolean {
    return this.code === 'VALIDATION_ERROR' || this.status === 422;
  }
}
```

**Usage in Components:**
```typescript
const mutation = useApiMutation(
  (data) => api.post("/api/endpoint", data),
  {
    onSuccess: () => {
      toast({ title: "Success", description: "Operation completed" });
    },
    onError: (error: ApiError) => {
      // Custom error handling (automatic toast already shown)
      if (error.isValidationError()) {
        console.error("Validation failed:", error.details);
      }
    }
  }
);
```

#### Toast Notification System

**File:** `client/src/hooks/use-toast.ts` (192 lines)

**Usage Pattern:**
```typescript
const { toast } = useToast();

// Success toast
toast({ 
  title: "Success", 
  description: "Plan created successfully" 
});

// Error toast
toast({ 
  title: "Error", 
  description: "Failed to create plan", 
  variant: "destructive" 
});

// Info toast
toast({
  title: "Information",
  description: "Processing your request...",
  variant: "default"
});
```

#### Form Validation Patterns

**Current Pattern:** Manual validation (no react-hook-form or Zod on client)
```typescript
// SubscriptionPlans.tsx (Lines 306-335)
const handleCreatePlan = (formData: FormData) => {
  const data = {
    name: formData.get("name") as string,
    price: formData.get("price") as string,
    // ... manual extraction
  };
  createPlanMutation.mutate(data);
};
```

**Available Pattern:** react-hook-form with shadcn/ui Form components
```typescript
// Available via client/src/components/ui/form.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Example usage (not currently used in SubscriptionPlans.tsx)
const form = useForm({
  resolver: zodResolver(planSchema),
  defaultValues: { name: "", price: 0 }
});

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Name</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

---

### 4. Routing and Navigation

#### Routing Setup

**Framework:** Wouter (simple React Router alternative)  
**File:** `client/src/App.tsx`

**Route Pattern:**
```typescript
<Route path="/admin/plan-analytics">
  <ProtectedRoute {...adminOnly}>
    <Suspense fallback={<LoadingFallback />}>
      <PlanAnalytics />
    </Suspense>
  </ProtectedRoute>
</Route>
```

**Current Admin Routes:**
```
/dashboard/admin                → AdminDashboard
/admin/analytics               → SubscriptionAnalytics
/admin/plan-analytics          → PlanAnalytics
/admin/features                → FeatureManagementDashboard
/dashboard/admin/profile       → AdminProfile
/test/conversions              → ConversionTest
```

**Adding New Routes:**
1. Import component (lazy if needed)
2. Add Route with proper protection
3. Update navigation (if needed in AppShell)

#### Admin Navigation Structure

**File:** `client/src/components/AppShell.tsx`

**Current Admin Nav Items (Lines 138-139):**
```typescript
...(user.teamRole === "admin" ? [
  { href: "/dashboard/admin", label: "Admin Dashboard" }
] : [])
```

**Note:** Admin navigation is minimal - most admin pages are accessed via dashboard links, not top nav

---

### 5. State Management

#### React Query Configuration

**File:** `client/src/lib/queryClient.ts`

**Query Client Setup:**
```typescript
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false
    }
  }
});
```

**Provider Setup (App.tsx):**
```typescript
<QueryClientProvider client={queryClient}>
  <AppContent />
</QueryClientProvider>
```

#### Mutation Patterns

**Pattern 1: Optimistic Updates (Not currently used)**
```typescript
// Can be implemented if needed
const mutation = useApiMutation(
  (data) => api.put(`/endpoint/${id}`, data),
  {
    onMutate: async (newData) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['key'] });
      
      // Snapshot previous value
      const previous = queryClient.getQueryData(['key']);
      
      // Optimistically update
      queryClient.setQueryData(['key'], newData);
      
      return { previous };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      queryClient.setQueryData(['key'], context.previous);
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['key'] });
    }
  }
);
```

**Pattern 2: Cache Invalidation (Currently used)**
```typescript
// SubscriptionPlans.tsx (Line 207)
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
  toast({ title: "Success", description: "Plan created successfully" });
}
```

**Pattern 3: Multiple Invalidations**
```typescript
// SubscriptionPlans.tsx (Lines 267-268)
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
  queryClient.invalidateQueries({ queryKey: ["/api/admin/user-subscriptions"] });
}
```

#### Global State Management

**No Redux/Zustand** - Using React Query cache as global state:
- Query data cached and shared across components
- AuthContext for user state (from `useAuth` hook)
- Local component state for UI concerns

---

### 6. Styling and UI Patterns

#### Tailwind Usage Patterns

**Layout Classes:**
```typescript
// Container pattern
"container mx-auto p-6 pt-24 space-y-6"

// Grid layouts
"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
"grid grid-cols-2 gap-4"
"grid grid-cols-3 gap-4"

// Flex patterns
"flex justify-between items-center"
"flex flex-row items-center justify-between space-y-0 pb-2"
"flex items-center gap-2"

// Spacing
"space-y-4"  // Vertical spacing
"space-x-2"  // Horizontal spacing
"gap-4", "gap-6"
```

**Responsive Patterns:**
```typescript
// Mobile-first breakpoints
"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
"hidden md:flex"
"text-sm md:text-base"
"grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
```

**Color Patterns:**
```typescript
// Status colors
"bg-green-100 text-green-800"    // Active/Success
"bg-red-100 text-red-800"        // Error/Cancelled
"bg-yellow-100 text-yellow-800"  // Warning/Pending
"bg-blue-100 text-blue-800"      // Info
"bg-gray-100 text-gray-800"      // Inactive/Neutral

// Interactive states
"hover:bg-blue-700"
"focus:ring-2 focus:ring-blue-500"
"transition-colors"
```

**Typography:**
```typescript
// Headings
"text-3xl font-bold"              // Page title
"text-2xl font-bold"              // Section title
"text-sm font-medium"             // Card title

// Body text
"text-gray-600"                   // Muted text
"text-muted-foreground"           // shadcn muted
"text-xs text-gray-500"          // Helper text
```

#### Button Patterns

**Primary Actions:**
```typescript
<Button className="bg-blue-600 hover:bg-blue-700">
  <Plus className="h-4 w-4 mr-2" />
  Create Plan
</Button>
```

**Secondary Actions:**
```typescript
<Button variant="outline" onClick={handleCancel}>
  Cancel
</Button>
```

**Destructive Actions:**
```typescript
<Button variant="destructive" onClick={handleDelete}>
  Delete
</Button>

<AlertDialogAction className="bg-red-600 hover:bg-red-700">
  Yes, Delete
</AlertDialogAction>
```

**Loading States:**
```typescript
<Button disabled={mutation.isPending}>
  {mutation.isPending ? "Creating..." : "Create Plan"}
</Button>
```

#### Badge Patterns

**Status Badges (SubscriptionPlans.tsx Lines 392-400):**
```typescript
const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case "active": return "bg-green-100 text-green-800";
    case "expired": return "bg-gray-100 text-gray-800";
    case "cancelled": return "bg-red-100 text-red-800";
    case "pending": return "bg-yellow-100 text-yellow-800";
    default: return "bg-blue-100 text-blue-800";
  }
};

<Badge className={getStatusBadgeColor(status)}>
  {status}
</Badge>
```

**Feature Badges:**
```typescript
<Badge variant="outline">Top 100</Badge>
<Badge className="bg-yellow-100 text-yellow-800">Premium</Badge>
```

#### Form Field Patterns

**Standard Input:**
```typescript
<div>
  <Label htmlFor="name">Plan Name</Label>
  <Input id="name" name="name" required />
</div>
```

**Number Input with Validation:**
```typescript
<div>
  <Label htmlFor="price">Price</Label>
  <Input id="price" name="price" type="number" step="0.01" required />
</div>
```

**Select Dropdown:**
```typescript
<div>
  <Label htmlFor="currency">Currency</Label>
  <Select name="currency" defaultValue="USD">
    <SelectTrigger>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="USD">USD</SelectItem>
      <SelectItem value="EUR">EUR</SelectItem>
      <SelectItem value="INR">INR</SelectItem>
    </SelectContent>
  </Select>
</div>
```

**Textarea:**
```typescript
<div>
  <Label htmlFor="description">Description</Label>
  <Textarea id="description" name="description" rows={4} />
</div>
```

**Checkbox:**
```typescript
<div className="flex items-center space-x-2">
  <input 
    type="checkbox" 
    id="isActive" 
    name="isActive" 
    defaultChecked={true}
  />
  <Label htmlFor="isActive">Active</Label>
</div>

// Or with shadcn Checkbox
<div className="flex items-center space-x-2">
  <Checkbox
    id="notifySubscribers"
    checked={notifySubscribers}
    onCheckedChange={(checked) => setNotifySubscribers(checked as boolean)}
  />
  <Label htmlFor="notifySubscribers">Send notifications</Label>
</div>
```

---

## Implementation Plan

### Overview

Based on the investigation, we need to implement the following UI features for Phase 5:

1. **Plan Version History View** - Display all versions of a plan family
2. **Price Update Workflow** - Create new price versions with grandfathering
3. **Plan Deprecation Workflow** - Mark plans as deprecated with migration paths
4. **Plan Migration UI** - Admin interface to create and manage migrations
5. **Version Comparison View** - Side-by-side comparison of plan versions
6. **Subscriber Impact Preview** - Show impact of price/feature changes
7. **Enhanced Analytics Dashboard** - Add versioning metrics to Plan Analytics

### Implementation Sequence

```
Week 1: Foundation & Core Components
├── Day 1-2: Plan Version History Component
├── Day 3-4: Price Update Dialog & Workflow
└── Day 5: Enhanced Plan Analytics (Version Metrics)

Week 2: Advanced Features
├── Day 1-2: Plan Deprecation Workflow
├── Day 3-4: Migration Management UI
└── Day 5: Version Comparison Component

Week 3: Integration & Testing
├── Day 1-2: Integration with existing SubscriptionPlans.tsx
├── Day 3: Testing & Bug Fixes
└── Day 4-5: Documentation & Deployment
```

---

## Component Specifications

### Component 1: PlanVersionHistory

**Purpose:** Display version history for a subscription plan family

**File Location:** `client/src/components/admin/PlanVersionHistory.tsx`

**Dependencies:**
- useApiQuery from @/hooks/api-hooks
- Card, Table components from shadcn/ui
- Badge for version status
- format from date-fns

**Props Interface:**
```typescript
interface PlanVersionHistoryProps {
  basePlanId: string;
  onVersionSelect?: (version: PlanVersion) => void;
}

interface PlanVersion {
  id: string;
  basePlanId: string;
  version: number;
  price: string;
  name: string;
  isLatestVersion: boolean;
  activeSubscribers: number;
  createdAt: string;
  deprecatedAt: string | null;
  features: string[];
  // ... other plan fields
}
```

**API Endpoint:**
```
GET /api/admin/subscription-plans/:basePlanId/versions/history
```

**Component Structure:**
```tsx
export default function PlanVersionHistory({ basePlanId, onVersionSelect }: PlanVersionHistoryProps) {
  const { data: versionHistory, isLoading, error } = useApiQuery<{
    basePlanId: string;
    latestVersion: PlanVersion;
    versions: PlanVersion[];
  }>(
    [`/api/admin/subscription-plans/${basePlanId}/versions/history`],
    `/api/admin/subscription-plans/${basePlanId}/versions/history`
  );

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <Alert variant="destructive">...</Alert>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Version History
        </CardTitle>
        <CardDescription>
          All versions of {versionHistory?.latestVersion.name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Active Subscribers</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versionHistory?.versions.map((version) => (
              <TableRow key={version.id} className={version.isLatestVersion ? "bg-blue-50" : ""}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={version.isLatestVersion ? "default" : "outline"}>
                      v{version.version}
                    </Badge>
                    {version.isLatestVersion && (
                      <Badge className="bg-green-500">Latest</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {version.price} {version.currency || 'INR'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    {version.activeSubscribers}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(version.createdAt), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  {version.deprecatedAt ? (
                    <Badge variant="destructive">Deprecated</Badge>
                  ) : version.isLatestVersion ? (
                    <Badge className="bg-green-500">Active</Badge>
                  ) : (
                    <Badge variant="outline">Grandfathered</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => onVersionSelect?.(version)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

**Styling Patterns:**
- Use existing Card/Table layout from PlanAnalytics
- Highlight latest version with bg-blue-50
- Use Badge components consistently with color coding
- Match existing table styling (text sizes, spacing)

**Testing Requirements:**
- Unit tests for component rendering
- Test loading/error states
- Test version selection callback
- Test badge color logic for different statuses

---

### Component 2: PriceUpdateDialog

**Purpose:** Create a new price version with grandfathering notification preview

**File Location:** `client/src/components/admin/PriceUpdateDialog.tsx`

**Dependencies:**
- useApiMutation from @/hooks/api-hooks
- Dialog, Input, Checkbox components from shadcn/ui
- Alert for notification preview
- useForm from react-hook-form (NEW)
- zodResolver from @hookform/resolvers/zod
- Zod for schema validation

**Props Interface:**
```typescript
interface PriceUpdateDialogProps {
  plan: SubscriptionPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface PriceUpdateFormData {
  newPrice: number;
  effectiveDate: string;
  notifySubscribers: boolean;
  changeReason: string;
}
```

**Zod Schema:**
```typescript
import { z } from "zod";

const priceUpdateSchema = z.object({
  newPrice: z.number().positive("Price must be positive"),
  effectiveDate: z.string().min(1, "Effective date is required"),
  notifySubscribers: z.boolean().default(true),
  changeReason: z.string().min(10, "Reason must be at least 10 characters").max(500)
});
```

**API Endpoint:**
```
POST /api/admin/subscription-plans/:basePlanId/price
```

**Component Structure:**
```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";

export default function PriceUpdateDialog({ plan, open, onOpenChange, onSuccess }: PriceUpdateDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PriceUpdateFormData>({
    resolver: zodResolver(priceUpdateSchema),
    defaultValues: {
      newPrice: plan ? parseFloat(plan.price) : 0,
      effectiveDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notifySubscribers: true,
      changeReason: ""
    }
  });

  const priceUpdateMutation = useApiMutation(
    (data: PriceUpdateFormData) => 
      api.post(`/api/admin/subscription-plans/${plan?.basePlanId || plan?.id}/price`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
        onSuccess?.();
        onOpenChange(false);
        toast({ 
          title: "Success", 
          description: "Price update scheduled successfully" 
        });
      }
    }
  );

  const onSubmit = (data: PriceUpdateFormData) => {
    priceUpdateMutation.mutate(data);
  };

  if (!plan) return null;

  const oldPrice = parseFloat(plan.price);
  const newPrice = form.watch("newPrice");
  const priceChange = ((newPrice - oldPrice) / oldPrice * 100).toFixed(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Update Plan Price</DialogTitle>
          <DialogDescription>
            Create a new version of {plan.name} with updated pricing
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Current Price Display */}
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Current Price</div>
              <div className="text-2xl font-bold">{plan.currency} {plan.price}</div>
            </div>

            {/* New Price Input */}
            <FormField
              control={form.control}
              name="newPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Price *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="Enter new price"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  {newPrice && oldPrice && (
                    <FormDescription>
                      {newPrice > oldPrice ? "Increase" : "Decrease"} of {Math.abs(parseFloat(priceChange))}%
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Effective Date */}
            <FormField
              control={form.control}
              name="effectiveDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Effective Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>
                    New subscribers will see the new price from this date
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Change Reason */}
            <FormField
              control={form.control}
              name="changeReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Change *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g., Price adjustment due to increased operational costs..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This will be logged in the audit trail
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notification Preview */}
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertTitle>Notification Preview</AlertTitle>
              <AlertDescription className="mt-2 p-4 bg-muted rounded-md space-y-2">
                <div>
                  <strong>Subject:</strong>{" "}
                  {newPrice > oldPrice
                    ? `Price Update Notice: ${plan.name}`
                    : `Price Reduction: ${plan.name}`}
                </div>
                <div className="text-sm leading-relaxed">
                  We're writing to inform you of an upcoming price change for your{" "}
                  <strong>{plan.name}</strong> subscription. Effective{" "}
                  <strong>{format(new Date(form.watch("effectiveDate")), 'MMM d, yyyy')}</strong>, 
                  the price will {newPrice > oldPrice ? "increase" : "decrease"} from{" "}
                  <strong>{plan.currency} {plan.price}</strong> to{" "}
                  <strong>{plan.currency} {newPrice}</strong>.
                </div>
                <div className="text-sm font-semibold text-green-600 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                  Your current pricing of {plan.currency} {plan.price} is grandfathered and will NOT change.
                </div>
              </AlertDescription>
            </Alert>

            {/* Notify Subscribers Checkbox */}
            <FormField
              control={form.control}
              name="notifySubscribers"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal cursor-pointer">
                    Send notification emails to existing subscribers
                  </FormLabel>
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={priceUpdateMutation.isPending}>
                {priceUpdateMutation.isPending ? "Creating..." : "Create New Version"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

**Key Features:**
1. **react-hook-form Integration** - Proper form validation with Zod
2. **Real-time Price Change Calculation** - Shows % increase/decrease
3. **Notification Preview** - Shows exactly what subscribers will see
4. **Grandfathering Notice** - Clear messaging about price protection
5. **Form Validation** - Client-side validation before submission
6. **Loading States** - Disabled button during mutation

**Testing Requirements:**
- Form validation (all fields)
- Price change calculation accuracy
- Notification preview rendering
- Mutation success/error handling
- Dialog open/close behavior

---

### Component 3: PlanDeprecationDialog

**Purpose:** Deprecate a plan and optionally create migration workflow

**File Location:** `client/src/components/admin/PlanDeprecationDialog.tsx`

**Props Interface:**
```typescript
interface PlanDeprecationDialogProps {
  plan: SubscriptionPlan | null;
  availablePlans: SubscriptionPlan[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface DeprecationFormData {
  successorPlanId: string | null;
  reason: string;
  createMigration: boolean;
  notifySubscribers: boolean;
}
```

**Zod Schema:**
```typescript
const deprecationSchema = z.object({
  successorPlanId: z.string().uuid().nullable(),
  reason: z.string().min(10, "Reason must be at least 10 characters").max(500),
  createMigration: z.boolean().default(false),
  notifySubscribers: z.boolean().default(true)
});
```

**API Endpoint:**
```
POST /api/admin/subscription-plans/:id/deprecate
```

**Component Structure:**
```tsx
export default function PlanDeprecationDialog({ 
  plan, 
  availablePlans, 
  open, 
  onOpenChange, 
  onSuccess 
}: PlanDeprecationDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<DeprecationFormData>({
    resolver: zodResolver(deprecationSchema),
    defaultValues: {
      successorPlanId: null,
      reason: "",
      createMigration: false,
      notifySubscribers: true
    }
  });

  const deprecationMutation = useApiMutation(
    (data: DeprecationFormData) => 
      api.post(`/api/admin/subscription-plans/${plan?.id}/deprecate`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
        onSuccess?.();
        onOpenChange(false);
        toast({ 
          title: "Success", 
          description: "Plan deprecated successfully" 
        });
      }
    }
  );

  const onSubmit = (data: DeprecationFormData) => {
    deprecationMutation.mutate(data);
  };

  if (!plan) return null;

  // Filter out current plan from successor options
  const successorOptions = availablePlans.filter(p => p.id !== plan.id && p.isActive);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Deprecate Plan
          </DialogTitle>
          <DialogDescription>
            Mark {plan.name} as deprecated. Existing subscribers can continue, but new subscriptions will be blocked.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Warning Alert */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Deprecating a plan will:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Block new subscriptions to this plan</li>
                  <li>Allow existing subscribers to continue</li>
                  <li>Mark the plan as deprecated in analytics</li>
                  {form.watch("createMigration") && <li>Create a migration workflow to successor plan</li>}
                </ul>
              </AlertDescription>
            </Alert>

            {/* Successor Plan Selection */}
            <FormField
              control={form.control}
              name="successorPlanId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Successor Plan (Optional)</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a replacement plan..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {successorOptions.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} - {p.currency} {p.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Recommended replacement plan for existing subscribers
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Deprecation Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Deprecation *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g., Replacing with new tier structure to better align with customer needs..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This will be logged and may be shown to subscribers
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Create Migration Checkbox */}
            {form.watch("successorPlanId") && (
              <FormField
                control={form.control}
                name="createMigration"
                render={({ field }) => (
                  <FormItem className="flex items-start space-x-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Create migration workflow to successor plan
                      </FormLabel>
                      <FormDescription>
                        Allows you to plan and execute subscriber migrations
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            )}

            {/* Notify Subscribers */}
            <FormField
              control={form.control}
              name="notifySubscribers"
              render={({ field }) => (
                <FormItem className="flex items-start space-x-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      Notify existing subscribers about deprecation
                    </FormLabel>
                    <FormDescription>
                      Sends email notification with deprecation details
                    </FormDescription>
                  </div>
                </FormItem>
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="destructive"
                disabled={deprecationMutation.isPending}
              >
                {deprecationMutation.isPending ? "Deprecating..." : "Deprecate Plan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

**Key Features:**
1. **Successor Plan Selection** - Dropdown of available replacement plans
2. **Optional Migration Creation** - Checkbox to create migration workflow
3. **Comprehensive Warning** - Clear explanation of deprecation impact
4. **Reason Tracking** - Required text field for audit trail
5. **Notification Control** - Option to notify subscribers

**Testing Requirements:**
- Form validation (reason length, etc.)
- Successor plan filtering (excludes current plan)
- Conditional migration checkbox visibility
- Mutation success/error handling

---

### Component 4: MigrationManagementPanel

**Purpose:** Create and manage plan migration workflows

**File Location:** `client/src/components/admin/MigrationManagementPanel.tsx`

**Props Interface:**
```typescript
interface MigrationManagementPanelProps {
  // No props - standalone panel
}

interface Migration {
  id: string;
  name: string;
  fromPlanId: string;
  toPlanId: string;
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  targetUserCount: number;
  migratedCount: number;
  scheduledFor: string | null;
  completedAt: string | null;
  createdAt: string;
  fromPlan: { id: string; name: string; };
  toPlan: { id: string; name: string; };
}
```

**API Endpoints:**
```
GET /api/admin/migrations
POST /api/admin/migrations
POST /api/admin/migrations/:id/start
POST /api/admin/migrations/:id/cancel
GET /api/admin/migrations/:id/stats
```

**Component Structure:**
```tsx
export default function MigrationManagementPanel() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedMigration, setSelectedMigration] = useState<Migration | null>(null);

  const { data: migrations = [], isLoading } = useApiQuery<Migration[]>(
    ['/api/admin/migrations'],
    '/api/admin/migrations'
  );

  const { data: plans = [] } = useApiQuery<SubscriptionPlan[]>(
    ["/api/admin/subscription-plans"],
    '/api/admin/subscription-plans'
  );

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Plan Migrations</h2>
          <p className="text-muted-foreground">
            Manage subscriber migrations between plans
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Migration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <CreateMigrationForm 
              plans={plans} 
              onSuccess={() => setCreateDialogOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Migrations List */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : migrations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No migrations created yet
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {migrations.map(migration => (
            <MigrationCard 
              key={migration.id} 
              migration={migration}
              onSelect={() => setSelectedMigration(migration)}
            />
          ))}
        </div>
      )}

      {/* Migration Details Sheet */}
      {selectedMigration && (
        <Sheet open={!!selectedMigration} onOpenChange={() => setSelectedMigration(null)}>
          <SheetContent className="w-full sm:max-w-2xl">
            <MigrationDetails migration={selectedMigration} />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function MigrationCard({ migration, onSelect }: { 
  migration: Migration; 
  onSelect: () => void; 
}) {
  const getStatusBadge = (status: string) => {
    const colors = {
      draft: "bg-gray-100 text-gray-800",
      scheduled: "bg-blue-100 text-blue-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };
    return <Badge className={colors[status] || ""}>{status}</Badge>;
  };

  const progress = (migration.migratedCount / migration.targetUserCount) * 100;

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onSelect}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{migration.name}</CardTitle>
            <CardDescription>
              {migration.fromPlan.name} → {migration.toPlan.name}
            </CardDescription>
          </div>
          {getStatusBadge(migration.status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {migration.migratedCount} / {migration.targetUserCount}
            </span>
          </div>
          <Progress value={progress} />
          {migration.scheduledFor && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Scheduled for {format(new Date(migration.scheduledFor), 'MMM d, yyyy')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Key Features:**
1. **Migration Cards** - Visual cards showing migration status and progress
2. **Progress Tracking** - Progress bar showing completion percentage
3. **Status Badges** - Color-coded badges for different states
4. **Detail Panel** - Sheet/drawer for detailed migration view
5. **Create Dialog** - Form to create new migrations

**Testing Requirements:**
- List rendering with various migration statuses
- Progress calculation accuracy
- Card click interaction
- Create dialog form validation
- Migration start/cancel actions

---

### Component 5: VersionComparisonView

**Purpose:** Side-by-side comparison of two plan versions

**File Location:** `client/src/components/admin/VersionComparisonView.tsx`

**Props Interface:**
```typescript
interface VersionComparisonViewProps {
  version1: PlanVersion;
  version2: PlanVersion;
  onClose?: () => void;
}
```

**Component Structure:**
```tsx
export default function VersionComparisonView({ 
  version1, 
  version2, 
  onClose 
}: VersionComparisonViewProps) {
  const fields = [
    { key: 'price', label: 'Price', format: (v) => `${v.currency} ${v.price}` },
    { key: 'maxUniversities', label: 'Max Universities' },
    { key: 'maxCountries', label: 'Max Countries' },
    { key: 'turnaroundDays', label: 'Turnaround Days' },
    { key: 'universityTier', label: 'University Tier' },
    { key: 'supportType', label: 'Support Type' },
  ];

  const booleanFields = [
    { key: 'includeLoanAssistance', label: 'Loan Assistance' },
    { key: 'includeVisaSupport', label: 'Visa Support' },
    { key: 'includeCounselorSession', label: 'Counselor Session' },
    { key: 'includeScholarshipPlanning', label: 'Scholarship Planning' },
    { key: 'includeMockInterview', label: 'Mock Interview' },
    { key: 'includeExpertEditing', label: 'Expert Editing' },
  ];

  const getDiffClass = (v1: any, v2: any) => {
    if (v1 === v2) return "";
    return "bg-yellow-50 dark:bg-yellow-900/20";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Version Comparison</CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {/* Headers */}
          <div className="font-medium text-sm text-muted-foreground">Field</div>
          <div className="font-medium text-sm text-center">
            <Badge variant="outline">v{version1.version}</Badge>
            <div className="text-xs text-muted-foreground mt-1">
              {format(new Date(version1.createdAt), 'MMM d, yyyy')}
            </div>
          </div>
          <div className="font-medium text-sm text-center">
            <Badge variant="outline">v{version2.version}</Badge>
            <div className="text-xs text-muted-foreground mt-1">
              {format(new Date(version2.createdAt), 'MMM d, yyyy')}
            </div>
          </div>

          {/* Standard Fields */}
          {fields.map(field => (
            <Fragment key={field.key}>
              <div className="text-sm py-2 border-t">{field.label}</div>
              <div className={cn(
                "text-sm py-2 border-t text-center",
                getDiffClass(version1[field.key], version2[field.key])
              )}>
                {field.format ? field.format(version1) : version1[field.key]}
              </div>
              <div className={cn(
                "text-sm py-2 border-t text-center",
                getDiffClass(version1[field.key], version2[field.key])
              )}>
                {field.format ? field.format(version2) : version2[field.key]}
              </div>
            </Fragment>
          ))}

          {/* Boolean Fields */}
          {booleanFields.map(field => (
            <Fragment key={field.key}>
              <div className="text-sm py-2 border-t">{field.label}</div>
              <div className={cn(
                "text-sm py-2 border-t text-center",
                getDiffClass(version1[field.key], version2[field.key])
              )}>
                {version1[field.key] ? (
                  <Check className="h-4 w-4 text-green-600 mx-auto" />
                ) : (
                  <X className="h-4 w-4 text-gray-400 mx-auto" />
                )}
              </div>
              <div className={cn(
                "text-sm py-2 border-t text-center",
                getDiffClass(version1[field.key], version2[field.key])
              )}>
                {version2[field.key] ? (
                  <Check className="h-4 w-4 text-green-600 mx-auto" />
                ) : (
                  <X className="h-4 w-4 text-gray-400 mx-auto" />
                )}
              </div>
            </Fragment>
          ))}
        </div>

        {/* Features Comparison */}
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-2">Features</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Badge variant="outline" className="mb-2">v{version1.version}</Badge>
              <ul className="text-sm space-y-1">
                {version1.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <Badge variant="outline" className="mb-2">v{version2.version}</Badge>
              <ul className="text-sm space-y-1">
                {version2.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Key Features:**
1. **Grid Layout** - 3-column grid (field, v1, v2)
2. **Difference Highlighting** - Yellow background for different values
3. **Boolean Visual Indicators** - Check/X icons for true/false
4. **Feature List Comparison** - Side-by-side feature lists
5. **Formatted Values** - Custom formatters for specific fields

**Testing Requirements:**
- Render with identical versions (no highlights)
- Render with different versions (highlights visible)
- Test all field types (string, number, boolean, array)
- Test formatter functions

---

## API Integration

### Required API Endpoints

Based on `server/routes/admin.routes.ts` (Lines 72-93), the following endpoints are available:

#### Existing Endpoints (Already Implemented)

```typescript
// Plan CRUD
GET    /api/admin/subscription-plans
POST   /api/admin/subscription-plans
PUT    /api/admin/subscription-plans/:id
DELETE /api/admin/subscription-plans/:id

// Plan Versioning
POST   /api/admin/subscription-plans/:basePlanId/versions
GET    /api/admin/subscription-plans/:basePlanId/versions
GET    /api/admin/subscription-plans/:basePlanId/versions/:version

// Plan Change History
GET    /api/admin/subscription-plans/recent-changes
GET    /api/admin/subscription-plans/:id/change-history

// Phase 4 Endpoints
POST   /api/admin/subscription-plans/:basePlanId/price
GET    /api/admin/subscription-plans/:basePlanId/versions/history
POST   /api/admin/subscription-plans/:id/deprecate
POST   /api/admin/subscription-plans/:id/archive
GET    /api/admin/subscription-plans/:id/analytics

// Migrations
GET    /api/admin/migrations
POST   /api/admin/migrations
GET    /api/admin/migrations/:id
POST   /api/admin/migrations/:id/start
POST   /api/admin/migrations/:id/cancel
GET    /api/admin/migrations/:id/stats

// Analytics
GET    /api/admin/subscription-plans/analytics
```

#### API Integration Code Patterns

**Pattern 1: Simple GET Query**
```typescript
const { data, isLoading, error } = useApiQuery<DataType>(
  ['unique-query-key'],
  '/api/endpoint',
  optionalZodSchema,
  { enabled: condition, staleTime: 60000 }
);
```

**Pattern 2: Mutation with Invalidation**
```typescript
const mutation = useApiMutation(
  (variables) => api.post('/api/endpoint', variables),
  {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['related-data'] });
      toast({ title: "Success", description: "Action completed" });
    },
    onError: (error: ApiError) => {
      // Automatic error toast already shown
      // Add custom handling if needed
    }
  }
);
```

**Pattern 3: Conditional Query**
```typescript
const { data } = useApiQuery(
  [`/api/endpoint/${id}`],
  `/api/endpoint/${id}`,
  undefined,
  { enabled: !!id } // Only fetch when id exists
);
```

---

### New API Hooks to Create

**File:** `client/src/hooks/plan-versioning-hooks.ts`

```typescript
import { useApiQuery, useApiMutation } from "@/hooks/api-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

// Plan Version History
export function usePlanVersionHistory(basePlanId: string) {
  return useApiQuery(
    [`/api/admin/subscription-plans/${basePlanId}/versions/history`],
    `/api/admin/subscription-plans/${basePlanId}/versions/history`,
    undefined,
    { enabled: !!basePlanId }
  );
}

// Create Price Version
export function useCreatePriceVersion() {
  const queryClient = useQueryClient();
  
  return useApiMutation(
    ({ basePlanId, data }: { basePlanId: string; data: any }) =>
      api.post(`/api/admin/subscription-plans/${basePlanId}/price`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
      }
    }
  );
}

// Deprecate Plan
export function useDeprecatePlan() {
  const queryClient = useQueryClient();
  
  return useApiMutation(
    ({ planId, data }: { planId: string; data: any }) =>
      api.post(`/api/admin/subscription-plans/${planId}/deprecate`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
      }
    }
  );
}

// Get Migrations
export function useMigrations() {
  return useApiQuery(
    ['/api/admin/migrations'],
    '/api/admin/migrations'
  );
}

// Create Migration
export function useCreateMigration() {
  const queryClient = useQueryClient();
  
  return useApiMutation(
    (data: any) => api.post('/api/admin/migrations', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/migrations'] });
      }
    }
  );
}

// Start Migration
export function useStartMigration() {
  const queryClient = useQueryClient();
  
  return useApiMutation(
    (migrationId: string) => 
      api.post(`/api/admin/migrations/${migrationId}/start`, {}),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/migrations'] });
      }
    }
  );
}

// Cancel Migration
export function useCancelMigration() {
  const queryClient = useQueryClient();
  
  return useApiMutation(
    (migrationId: string) => 
      api.post(`/api/admin/migrations/${migrationId}/cancel`, {}),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/migrations'] });
      }
    }
  );
}

// Get Migration Stats
export function useMigrationStats(migrationId: string) {
  return useApiQuery(
    [`/api/admin/migrations/${migrationId}/stats`],
    `/api/admin/migrations/${migrationId}/stats`,
    undefined,
    { enabled: !!migrationId, refetchInterval: 5000 } // Poll every 5s
  );
}

// Get Plan Analytics
export function usePlanAnalytics(planId: string) {
  return useApiQuery(
    [`/api/admin/subscription-plans/${planId}/analytics`],
    `/api/admin/subscription-plans/${planId}/analytics`,
    undefined,
    { enabled: !!planId }
  );
}
```

---

## Testing Strategy

### Unit Tests

**Component Tests** (using Vitest + React Testing Library)

**File:** `client/src/components/admin/__tests__/PlanVersionHistory.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PlanVersionHistory from '../PlanVersionHistory';

const mockVersionHistory = {
  basePlanId: 'base-123',
  latestVersion: {
    id: 'v3-123',
    version: 3,
    price: '19999',
    // ...
  },
  versions: [
    { id: 'v3-123', version: 3, price: '19999', activeSubscribers: 0 },
    { id: 'v2-123', version: 2, price: '14999', activeSubscribers: 25 },
    { id: 'v1-123', version: 1, price: '9999', activeSubscribers: 150 },
  ]
};

describe('PlanVersionHistory', () => {
  it('renders loading state', () => {
    render(<PlanVersionHistory basePlanId="base-123" />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders version history table', async () => {
    // Mock useApiQuery to return data
    vi.mock('@/hooks/api-hooks', () => ({
      useApiQuery: () => ({
        data: mockVersionHistory,
        isLoading: false,
        error: null
      })
    }));

    render(<PlanVersionHistory basePlanId="base-123" />);
    
    await waitFor(() => {
      expect(screen.getByText('v3')).toBeInTheDocument();
      expect(screen.getByText('v2')).toBeInTheDocument();
      expect(screen.getByText('v1')).toBeInTheDocument();
    });
  });

  it('highlights latest version', async () => {
    render(<PlanVersionHistory basePlanId="base-123" />);
    
    const latestBadge = await screen.findByText('Latest');
    expect(latestBadge).toBeInTheDocument();
  });

  it('calls onVersionSelect when row clicked', async () => {
    const onSelect = vi.fn();
    render(<PlanVersionHistory basePlanId="base-123" onVersionSelect={onSelect} />);
    
    const viewButton = await screen.findByText('View');
    viewButton.click();
    
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
      version: expect.any(Number)
    }));
  });
});
```

**Hook Tests**

**File:** `client/src/hooks/__tests__/plan-versioning-hooks.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlanVersionHistory, useCreatePriceVersion } from '../plan-versioning-hooks';

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('usePlanVersionHistory', () => {
  it('fetches version history', async () => {
    const { result } = renderHook(
      () => usePlanVersionHistory('base-123'),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
  });
});

describe('useCreatePriceVersion', () => {
  it('creates price version and invalidates cache', async () => {
    const { result } = renderHook(() => useCreatePriceVersion(), { wrapper });

    result.current.mutate({
      basePlanId: 'base-123',
      data: { newPrice: 19999, effectiveDate: '2025-12-01' }
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
```

### Integration Tests

**Full Flow Tests**

**File:** `client/src/__tests__/plan-versioning.integration.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubscriptionPlans from '@/pages/SubscriptionPlans';

describe('Plan Versioning Integration', () => {
  it('completes full price update workflow', async () => {
    const user = userEvent.setup();
    render(<SubscriptionPlans />);

    // Wait for plans to load
    await waitFor(() => {
      expect(screen.getByText('Premium Plan')).toBeInTheDocument();
    });

    // Open version history
    const versionButton = screen.getByText('View Versions');
    await user.click(versionButton);

    // Verify version history displayed
    expect(screen.getByText('Version History')).toBeInTheDocument();

    // Open price update dialog
    const updatePriceButton = screen.getByText('Update Price');
    await user.click(updatePriceButton);

    // Fill form
    const priceInput = screen.getByLabelText('New Price');
    await user.clear(priceInput);
    await user.type(priceInput, '19999');

    const reasonInput = screen.getByLabelText('Reason for Change');
    await user.type(reasonInput, 'Price adjustment due to increased operational costs');

    // Submit
    const submitButton = screen.getByText('Create New Version');
    await user.click(submitButton);

    // Verify success
    await waitFor(() => {
      expect(screen.getByText('Price update scheduled successfully')).toBeInTheDocument();
    });
  });

  it('completes plan deprecation workflow', async () => {
    const user = userEvent.setup();
    render(<SubscriptionPlans />);

    // Navigate to deprecation
    const deprecateButton = screen.getByText('Deprecate');
    await user.click(deprecateButton);

    // Select successor
    const successorSelect = screen.getByLabelText('Successor Plan');
    await user.click(successorSelect);
    await user.click(screen.getByText('Elite Plan'));

    // Enter reason
    const reasonInput = screen.getByLabelText('Reason for Deprecation');
    await user.type(reasonInput, 'Replacing with new tier structure');

    // Submit
    const submitButton = screen.getByText('Deprecate Plan');
    await user.click(submitButton);

    // Verify success
    await waitFor(() => {
      expect(screen.getByText('Plan deprecated successfully')).toBeInTheDocument();
    });
  });
});
```

### E2E Tests (Playwright)

**File:** `e2e/plan-versioning.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Plan Versioning Admin Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/auth');
    await page.fill('[name="email"]', 'admin@phozos.com');
    await page.fill('[name="password"]', 'admin-password');
    await page.click('button[type="submit"]');
    
    // Navigate to subscription plans
    await page.goto('/dashboard/admin/subscription-plans');
  });

  test('view plan version history', async ({ page }) => {
    // Click on version history button
    await page.click('text=View Versions');

    // Verify version history modal opened
    await expect(page.locator('text=Version History')).toBeVisible();

    // Verify versions displayed
    await expect(page.locator('text=v1')).toBeVisible();
    await expect(page.locator('text=v2')).toBeVisible();
  });

  test('create new price version', async ({ page }) => {
    // Open price update dialog
    await page.click('text=Update Price');

    // Fill form
    await page.fill('[name="newPrice"]', '19999');
    await page.fill('[name="effectiveDate"]', '2025-12-01');
    await page.fill('[name="changeReason"]', 'Price adjustment test');

    // Verify notification preview
    await expect(page.locator('text=grandfathered')).toBeVisible();

    // Submit
    await page.click('text=Create New Version');

    // Verify success toast
    await expect(page.locator('text=Price update scheduled successfully')).toBeVisible();
  });

  test('deprecate plan with migration', async ({ page }) => {
    // Open deprecation dialog
    await page.click('text=Deprecate');

    // Select successor plan
    await page.click('[name="successorPlanId"]');
    await page.click('text=Elite Plan');

    // Enter reason
    await page.fill('[name="reason"]', 'Replacing with new tier structure for better market alignment');

    // Enable migration creation
    await page.check('[name="createMigration"]');

    // Submit
    await page.click('text=Deprecate Plan');

    // Verify success
    await expect(page.locator('text=Plan deprecated successfully')).toBeVisible();

    // Verify migration created
    await page.goto('/dashboard/admin/migrations');
    await expect(page.locator('text=Replacing with new tier')).toBeVisible();
  });
});
```

### Manual Testing Checklist

**Test Scenarios:**

1. **Price Update Workflow**
   - [ ] Open price update dialog
   - [ ] Enter new price (higher and lower)
   - [ ] Verify percentage change calculation
   - [ ] Verify notification preview renders correctly
   - [ ] Submit and verify success toast
   - [ ] Verify new version appears in version history
   - [ ] Verify subscribers NOT affected (check user subscriptions)

2. **Plan Deprecation**
   - [ ] Open deprecation dialog
   - [ ] Select successor plan from dropdown
   - [ ] Enter deprecation reason
   - [ ] Toggle migration creation checkbox
   - [ ] Submit and verify success
   - [ ] Verify plan marked as deprecated
   - [ ] Verify new subscriptions blocked
   - [ ] Verify existing subscriptions continue

3. **Version Comparison**
   - [ ] Select two versions from history
   - [ ] View side-by-side comparison
   - [ ] Verify differences highlighted
   - [ ] Check all field types render correctly
   - [ ] Verify feature list comparison

4. **Migration Management**
   - [ ] Create new migration workflow
   - [ ] View migration list
   - [ ] Check migration progress bar
   - [ ] Start migration
   - [ ] Monitor progress
   - [ ] Cancel migration
   - [ ] Verify migration statistics

5. **Analytics Integration**
   - [ ] Navigate to Plan Analytics
   - [ ] Verify version metrics displayed
   - [ ] Check grandfathering impact section
   - [ ] Verify charts render correctly
   - [ ] Export analytics data

---

## Migration Path

### Phase 1: Add New Components (Week 1)

**Goal:** Add new versioning components without breaking existing functionality

**Steps:**

1. **Create New Component Files**
   ```bash
   # New component files
   client/src/components/admin/PlanVersionHistory.tsx
   client/src/components/admin/PriceUpdateDialog.tsx
   client/src/components/admin/PlanDeprecationDialog.tsx
   client/src/components/admin/MigrationManagementPanel.tsx
   client/src/components/admin/VersionComparisonView.tsx
   
   # New hooks file
   client/src/hooks/plan-versioning-hooks.ts
   
   # Test files
   client/src/components/admin/__tests__/PlanVersionHistory.test.tsx
   client/src/hooks/__tests__/plan-versioning-hooks.test.ts
   ```

2. **Update SubscriptionPlans.tsx** - Add version tab

   **File:** `client/src/pages/SubscriptionPlans.tsx`
   
   **Modification:** Add new tab to existing Tabs component (around line 650)
   
   ```tsx
   // Current structure (Line 650)
   <Tabs defaultValue="plans" className="space-y-6">
     <TabsList>
       <TabsTrigger value="plans">Plans</TabsTrigger>
       <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
       <TabsTrigger value="failed-payments">Failed Payments</TabsTrigger>
       {/* ADD NEW TAB */}
       <TabsTrigger value="versions">
         <History className="h-4 w-4 mr-2" />
         Version History
       </TabsTrigger>
       <TabsTrigger value="migrations">
         <TrendingUp className="h-4 w-4 mr-2" />
         Migrations
       </TabsTrigger>
     </TabsList>

     {/* Existing tabs... */}

     {/* ADD NEW TAB CONTENT */}
     <TabsContent value="versions">
       <PlanVersionHistory basePlanId={selectedPlanForVersions} />
     </TabsContent>

     <TabsContent value="migrations">
       <MigrationManagementPanel />
     </TabsContent>
   </Tabs>
   ```

3. **Add Import Statements** (top of file)
   
   ```tsx
   // Add to existing imports
   import PlanVersionHistory from "@/components/admin/PlanVersionHistory";
   import PriceUpdateDialog from "@/components/admin/PriceUpdateDialog";
   import PlanDeprecationDialog from "@/components/admin/PlanDeprecationDialog";
   import MigrationManagementPanel from "@/components/admin/MigrationManagementPanel";
   import { History, TrendingUp } from "lucide-react"; // Add new icons
   ```

4. **Add State for Version Tab** (around line 159)
   
   ```tsx
   // Add to existing state declarations
   const [selectedPlanForVersions, setSelectedPlanForVersions] = useState<string | null>(null);
   const [priceUpdateDialogOpen, setPriceUpdateDialogOpen] = useState(false);
   const [deprecationDialogOpen, setDeprecationDialogOpen] = useState(false);
   ```

### Phase 2: Integrate Actions into Plan Cards (Week 2)

**Goal:** Add version management actions to existing plan cards

**Steps:**

1. **Modify Plan Card Actions** (Lines 700-800 area)
   
   **Current:** Edit, Delete buttons  
   **Add:** Version History, Update Price, Deprecate buttons
   
   ```tsx
   // Find existing action buttons in plan card
   <div className="flex gap-2">
     <Button 
       variant="outline" 
       size="sm"
       onClick={() => setEditingPlan(plan)}
     >
       <Edit className="h-4 w-4 mr-1" />
       Edit
     </Button>
     
     {/* ADD NEW BUTTONS */}
     <Button
       variant="outline"
       size="sm"
       onClick={() => {
         setSelectedPlanForVersions(plan.basePlanId || plan.id);
         // Switch to versions tab programmatically or open dialog
       }}
     >
       <History className="h-4 w-4 mr-1" />
       Versions
     </Button>

     <Button
       variant="outline"
       size="sm"
       onClick={() => {
         setEditingPlan(plan);
         setPriceUpdateDialogOpen(true);
       }}
     >
       <DollarSign className="h-4 w-4 mr-1" />
       Update Price
     </Button>

     <Button
       variant="outline"
       size="sm"
       className="text-yellow-600 hover:text-yellow-700"
       onClick={() => {
         setEditingPlan(plan);
         setDeprecationDialogOpen(true);
       }}
     >
       <AlertTriangle className="h-4 w-4 mr-1" />
       Deprecate
     </Button>

     {/* Existing delete button */}
     <Button 
       variant="destructive" 
       size="sm"
       onClick={() => handleDelete(plan.id)}
     >
       <Trash2 className="h-4 w-4 mr-1" />
       Delete
     </Button>
   </div>
   ```

2. **Add Dialog Components** (end of file, before closing div)
   
   ```tsx
   {/* Existing dialogs... */}

   {/* ADD NEW DIALOGS */}
   <PriceUpdateDialog
     plan={editingPlan}
     open={priceUpdateDialogOpen}
     onOpenChange={setPriceUpdateDialogOpen}
     onSuccess={() => {
       queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
     }}
   />

   <PlanDeprecationDialog
     plan={editingPlan}
     availablePlans={plans.filter(p => p.id !== editingPlan?.id)}
     open={deprecationDialogOpen}
     onOpenChange={setDeprecationDialogOpen}
     onSuccess={() => {
       queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
     }}
   />
   ```

### Phase 3: Enhance Plan Analytics (Week 2)

**Goal:** Add versioning metrics to existing analytics dashboard

**Steps:**

1. **Update PlanAnalytics.tsx**
   
   **File:** `client/src/pages/admin/PlanAnalytics.tsx`
   
   **Add Version Breakdown Section** (after line 225)
   
   ```tsx
   {/* Existing Revenue by Plan Version chart... */}

   {/* ADD NEW SECTION */}
   <Card>
     <CardHeader>
       <CardTitle className="flex items-center gap-2">
         <Activity className="h-5 w-5" />
         Version Distribution
       </CardTitle>
       <CardDescription>
         Subscriber distribution across plan versions
       </CardDescription>
     </CardHeader>
     <CardContent>
       <div className="rounded-md border">
         <Table>
           <TableHeader>
             <TableRow>
               <TableHead>Plan</TableHead>
               <TableHead>Version</TableHead>
               <TableHead>Status</TableHead>
               <TableHead>Subscribers</TableHead>
               <TableHead>MRR</TableHead>
               <TableHead>Avg Price</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {analytics.planVersions.map((pv) => (
               <TableRow key={`${pv.basePlanId}-${pv.version}`}>
                 <TableCell className="font-medium">{pv.planName}</TableCell>
                 <TableCell>
                   <Badge variant={pv.isLatestVersion ? "default" : "outline"}>
                     v{pv.version}
                   </Badge>
                 </TableCell>
                 <TableCell>
                   {pv.isDeprecated ? (
                     <Badge variant="destructive">Deprecated</Badge>
                   ) : pv.isLatestVersion ? (
                     <Badge className="bg-green-500">Active</Badge>
                   ) : (
                     <Badge variant="outline">Grandfathered</Badge>
                   )}
                 </TableCell>
                 <TableCell>{pv.subscribers}</TableCell>
                 <TableCell>{formatCurrency(pv.mrr)}</TableCell>
                 <TableCell>{formatCurrency(pv.avgPrice)}</TableCell>
               </TableRow>
             ))}
           </TableBody>
         </Table>
       </div>
     </CardContent>
   </Card>
   ```

2. **Add Grandfathering Impact Card**
   
   ```tsx
   <Card>
     <CardHeader>
       <CardTitle className="flex items-center gap-2">
         <TrendingUp className="h-5 w-5" />
         Grandfathering Impact
       </CardTitle>
       <CardDescription>
         Revenue impact of grandfathered pricing
       </CardDescription>
     </CardHeader>
     <CardContent>
       <div className="space-y-4">
         <div className="grid grid-cols-2 gap-4">
           <div className="p-4 rounded-lg bg-muted">
             <div className="text-sm text-muted-foreground">Grandfathered Users</div>
             <div className="text-2xl font-bold">
               {analytics.grandfatheringImpact.totalGrandfatheredUsers}
             </div>
           </div>
           <div className="p-4 rounded-lg bg-muted">
             <div className="text-sm text-muted-foreground">Revenue Gap</div>
             <div className="text-2xl font-bold">
               {formatCurrency(analytics.grandfatheringImpact.revenueGap)}
             </div>
             <div className="text-xs text-muted-foreground">
               {formatPercentage(analytics.grandfatheringImpact.percentageImpact)} of total MRR
             </div>
           </div>
         </div>

         <Alert>
           <AlertTriangle className="h-4 w-4" />
           <AlertTitle>Analysis</AlertTitle>
           <AlertDescription>
             {analytics.grandfatheringImpact.totalGrandfatheredUsers} subscribers are grandfathered,
             representing a potential revenue uplift of{" "}
             {formatCurrency(analytics.grandfatheringImpact.revenueGap)} if migrated to current pricing.
           </AlertDescription>
         </Alert>
       </div>
     </CardContent>
   </Card>
   ```

### Phase 4: Add Migrations Route (Week 3)

**Goal:** Create dedicated page for migration management

**Steps:**

1. **Create New Page**
   
   **File:** `client/src/pages/admin/PlanMigrations.tsx`
   
   ```tsx
   import { Suspense } from "react";
   import AppShell from "@/components/AppShell";
   import MigrationManagementPanel from "@/components/admin/MigrationManagementPanel";
   import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

   export default function PlanMigrations() {
     return (
       <>
         <AppShell />
         <div className="container mx-auto p-6 pt-24">
           <Suspense fallback={<LoadingSkeleton />}>
             <MigrationManagementPanel />
           </Suspense>
         </div>
       </>
     );
   }
   ```

2. **Add Route**
   
   **File:** `client/src/App.tsx`
   
   **Add lazy import** (around line 41)
   ```tsx
   const PlanMigrations = lazy(() => import("@/pages/admin/PlanMigrations"));
   ```
   
   **Add route** (around line 135)
   ```tsx
   <Route path="/admin/plan-migrations">
     <ProtectedRoute {...adminOnly}>
       <Suspense fallback={<LoadingFallback />}>
         <PlanMigrations />
       </Suspense>
     </ProtectedRoute>
   </Route>
   ```

3. **Add Navigation Link** (Optional - could add to admin dashboard)
   
   **File:** `client/src/pages/AdminDashboard.tsx`
   
   ```tsx
   // Add migration card to dashboard
   <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/admin/plan-migrations')}>
     <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
       <CardTitle className="text-sm font-medium">Plan Migrations</CardTitle>
       <TrendingUp className="h-4 w-4 text-muted-foreground" />
     </CardHeader>
     <CardContent>
       <div className="text-2xl font-bold">{migrationCount}</div>
       <p className="text-xs text-muted-foreground">
         Active migration workflows
       </p>
     </CardContent>
   </Card>
   ```

### Phase 5: Testing & Validation (Week 3)

**Goal:** Comprehensive testing before deployment

**Steps:**

1. **Run Unit Tests**
   ```bash
   npm run test
   ```

2. **Run Integration Tests**
   ```bash
   npm run test:integration
   ```

3. **Run E2E Tests**
   ```bash
   npx playwright test
   ```

4. **Manual Testing**
   - Complete all items in Manual Testing Checklist
   - Test on different screen sizes (mobile, tablet, desktop)
   - Test in different browsers (Chrome, Firefox, Safari)
   - Test with slow network (throttle in DevTools)

5. **Accessibility Testing**
   - Run Lighthouse audit
   - Test keyboard navigation
   - Test screen reader compatibility
   - Verify color contrast ratios

### Phase 6: Documentation & Deployment (Week 3)

**Goal:** Document changes and deploy to production

**Steps:**

1. **Update Documentation**
   - Document new components in README
   - Update API documentation
   - Create admin user guide for versioning features
   - Add migration runbook

2. **Create Migration Guide**
   - Step-by-step guide for admins
   - Screenshots of new features
   - Common use cases and examples
   - Troubleshooting section

3. **Deployment Checklist**
   - [ ] All tests passing
   - [ ] Code reviewed and approved
   - [ ] Documentation updated
   - [ ] Environment variables checked
   - [ ] Database migrations applied
   - [ ] Backup created
   - [ ] Staged deployment tested
   - [ ] Production deployment
   - [ ] Smoke tests passed
   - [ ] Monitoring alerts configured

---

## Rollback Plan

**If issues occur in production:**

1. **Identify Issue**
   - Check error logs
   - Review user reports
   - Check monitoring dashboards

2. **Assess Impact**
   - Minor UI bug → Fix forward
   - Critical functionality broken → Rollback

3. **Rollback Steps**
   ```bash
   # Revert frontend deployment
   git revert <commit-hash>
   npm run build
   # Deploy previous version

   # If database changes were made
   # Run down migration
   npm run db:migrate:down
   ```

4. **Post-Rollback**
   - Notify stakeholders
   - Document issue
   - Create hotfix branch
   - Test fix thoroughly
   - Re-deploy with fix

---

## Performance Considerations

### Bundle Size Optimization

1. **Lazy Loading**
   - All admin components lazy loaded
   - Reduces initial bundle size
   - Improves Time to Interactive (TTI)

2. **Code Splitting**
   - Separate chunks for versioning features
   - Only load when needed
   - Reduces main bundle by ~30KB (estimated)

### Query Optimization

1. **Stale Time Configuration**
   ```typescript
   // Version history doesn't change frequently
   const { data } = useApiQuery(
     ['version-history'],
     '/api/endpoint',
     undefined,
     { staleTime: 5 * 60 * 1000 } // 5 minutes
   );
   ```

2. **Pagination**
   - Implement pagination for large version lists
   - Load 20 versions at a time
   - Infinite scroll or pagination controls

3. **Prefetching**
   ```typescript
   // Prefetch version history when hovering over button
   const queryClient = useQueryClient();
   
   <Button
     onMouseEnter={() => {
       queryClient.prefetchQuery({
         queryKey: [`/api/versions/${planId}`],
         queryFn: () => api.get(`/api/versions/${planId}`)
       });
     }}
   >
     View Versions
   </Button>
   ```

---

## Accessibility (a11y) Considerations

### Keyboard Navigation

1. **Dialog Focus Management**
   - Auto-focus on first input when dialog opens
   - Trap focus within dialog
   - Return focus to trigger on close

2. **Table Navigation**
   - Support arrow key navigation
   - Tab order follows visual order
   - Escape to close modals

### Screen Reader Support

1. **ARIA Labels**
   ```tsx
   <Button aria-label="View version history for Premium Plan">
     <History className="h-4 w-4" />
   </Button>
   ```

2. **Live Regions**
   ```tsx
   <div role="status" aria-live="polite">
     {mutation.isSuccess && "Version created successfully"}
   </div>
   ```

3. **Semantic HTML**
   - Use proper heading hierarchy
   - Use `<table>` for tabular data
   - Use `<form>` for forms

### Color Contrast

- All text meets WCAG AA standards (4.5:1 ratio)
- Status colors tested with contrast checker
- Provide non-color indicators (icons + text)

---

## Security Considerations

### Input Validation

1. **Client-Side Validation** (Zod schemas)
   ```typescript
   const priceUpdateSchema = z.object({
     newPrice: z.number().positive().max(999999),
     effectiveDate: z.string().refine(isValidDate),
     changeReason: z.string().min(10).max(500)
   });
   ```

2. **Server-Side Validation** (Always required)
   - Never trust client input
   - Validate all fields on backend
   - Sanitize inputs

### CSRF Protection

- All mutations use POST/PUT/DELETE
- CSRF token automatically included by api-client
- Token refreshed before state-changing requests

### Authorization

- All endpoints require admin role
- Role checked on every request
- Protected routes enforce authentication

---

## Browser Compatibility

**Supported Browsers:**
- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅

**Testing:**
- Manual testing on each browser
- Automated E2E tests in Chrome
- Check for polyfills if needed

---

## Monitoring & Analytics

### Error Tracking

1. **Frontend Errors**
   - Sentry integration (if available)
   - Error boundary catches
   - Log to backend endpoint

2. **API Errors**
   - Track mutation failures
   - Monitor 4xx/5xx responses
   - Alert on error rate spikes

### Usage Analytics

1. **Feature Usage**
   - Track version history views
   - Track price update creations
   - Track migration workflows

2. **Performance Metrics**
   - Component render times
   - API response times
   - Bundle load times

---

## Success Metrics

**Key Performance Indicators (KPIs):**

1. **Adoption Metrics**
   - Number of price versions created in first month
   - Number of plan deprecations
   - Number of migrations initiated

2. **User Experience**
   - Time to complete price update: < 2 minutes
   - Admin satisfaction score: > 8/10
   - Support tickets reduced by 30%

3. **Technical Metrics**
   - Page load time: < 2 seconds
   - Time to Interactive: < 3 seconds
   - Error rate: < 0.5%

---

## Conclusion

This implementation plan provides a comprehensive, step-by-step approach to implementing Phase 5: Client UI Updates for the subscription plan versioning system. The plan is designed to be:

✅ **Minimal Risk** - Additive changes, no breaking modifications  
✅ **Well-Tested** - Comprehensive testing strategy  
✅ **Maintainable** - Follows existing patterns and conventions  
✅ **Performant** - Lazy loading, code splitting, query optimization  
✅ **Accessible** - WCAG AA compliant, keyboard navigation  
✅ **Secure** - Input validation, CSRF protection, authorization

**Estimated Total Effort:** 2-3 weeks  
**Estimated Lines of Code:** ~2000 new lines  
**Components Created:** 5 new components + 1 new hooks file  
**Routes Added:** 1 new admin route  
**Files Modified:** 3 existing files (SubscriptionPlans.tsx, App.tsx, PlanAnalytics.tsx)

---

## Appendix

### File Structure Summary

```
client/src/
├── components/
│   └── admin/
│       ├── PlanVersionHistory.tsx          [NEW - 250 lines]
│       ├── PriceUpdateDialog.tsx           [NEW - 300 lines]
│       ├── PlanDeprecationDialog.tsx       [NEW - 280 lines]
│       ├── MigrationManagementPanel.tsx    [NEW - 400 lines]
│       ├── VersionComparisonView.tsx       [NEW - 200 lines]
│       └── __tests__/
│           ├── PlanVersionHistory.test.tsx [NEW - 100 lines]
│           └── ...
├── hooks/
│   ├── plan-versioning-hooks.ts            [NEW - 150 lines]
│   └── __tests__/
│       └── plan-versioning-hooks.test.ts   [NEW - 80 lines]
├── pages/
│   ├── SubscriptionPlans.tsx               [MODIFIED - add 50 lines]
│   └── admin/
│       ├── PlanAnalytics.tsx               [MODIFIED - add 100 lines]
│       └── PlanMigrations.tsx              [NEW - 30 lines]
└── App.tsx                                  [MODIFIED - add 15 lines]

Total New Lines: ~1930
Total Modified Lines: ~165
Total Files Created: 11
Total Files Modified: 3
```

### Dependencies Summary

**No new npm packages required!** All dependencies already installed:
- ✅ react-hook-form
- ✅ @hookform/resolvers
- ✅ zod
- ✅ @tanstack/react-query
- ✅ All shadcn/ui components
- ✅ lucide-react (icons)
- ✅ date-fns

### Quick Reference Links

**Key Files:**
- Current SubscriptionPlans: `client/src/pages/SubscriptionPlans.tsx`
- API Client: `client/src/lib/api-client.ts`
- API Hooks: `client/src/hooks/api-hooks.ts`
- Admin Routes: `server/routes/admin.routes.ts`
- API Documentation: `docs/API_SUBSCRIPTION_PLANS_V2.md`
- Backend Plan: `SUBSCRIPTION_PLAN_VERSIONING_IMPLEMENTATION_PLAN.md`

**Useful Commands:**
```bash
# Development
npm run dev

# Testing
npm run test
npm run test:watch
npm run test:coverage

# Build
npm run build

# Type checking
npm run check

# Linting
npm run lint:fix
```

---

**End of Phase 5 Implementation Plan**
