# Partner System Frontend Implementation Plan

## Executive Summary

This document provides a **comprehensive, phase-by-phase implementation plan** for building the Partner Account System frontend UI. Based on extensive investigation of the existing codebase, this plan follows all established patterns for routing, authentication, API integration, component structure, and UI design.

**Tech Stack:** React, TypeScript, Wouter (routing), React Query (data fetching), React Hook Form + Zod (validation), Radix UI (components), Tailwind CSS (styling)

**Total Estimated Effort:** 120-140 hours (3-4 weeks for 1 developer)

---

## Frontend Architecture Analysis Summary

### 1. Routing System
- **Router:** Wouter (`wouter` package)
- **Pattern:** `<Switch>` with `<Route>` components in `App.tsx`
- **Navigation:** Programmatic navigation using `useLocation()` hook
- **Protection:** `ProtectedRoute` component wraps secured routes

### 2. Authentication & Authorization
- **Auth Context:** `useAuth()` hook from `hooks/useAuth.tsx`
- **User Object:** Contains `userType`, `teamRole`, and user details
- **Route Protection:** `ProtectedRoute` component with `allowedUserTypes` and `allowedRoles` props
- **Navigation Config:** `lib/navigation-config.ts` provides type-safe navigation paths

### 3. API Client Pattern
- **Base Client:** `lib/api-client.ts` - Simple fetch wrapper with CSRF, auth tokens
- **React Query Hooks:** `hooks/api-hooks.ts` provides:
  - `useApiQuery(queryKey, url, schema?, options?)` for GET requests
  - `useApiMutation(mutationFn, options?)` for POST/PUT/DELETE
  - `useAuthenticatedQuery()` for auth-required queries

### 4. Form Handling Pattern
- **Library:** React Hook Form (`useForm` hook)
- **Validation:** Zod schemas with `zodResolver`
- **UI:** Radix UI Form components (`FormField`, `FormItem`, `FormLabel`, `FormControl`)
- **Example:** See `client/src/components/admin/PriceUpdateDialog.tsx`

### 5. Component Structure
```
client/src/
├── pages/               # Full page components
│   ├── [Page].tsx      # Student/customer pages
│   └── admin/          # Admin-only pages
├── components/
│   ├── admin/          # Admin-specific components
│   ├── ui/             # Radix UI wrapper components
│   └── [Component].tsx # Shared components
├── hooks/
│   ├── api-hooks.ts    # React Query wrappers
│   └── useAuth.tsx     # Auth context hook
└── lib/
    ├── api-client.ts   # API client
    └── navigation-config.ts # Navigation helpers
```

### 6. Dashboard Page Pattern
**Example:** `StudentDashboard.tsx`, `TeamDashboard.tsx`, `AdminDashboard.tsx`
- Hero section with welcome message and user avatar
- KPI cards grid (4 columns) with icons and stats
- Tables with data, filters, search
- Action buttons with dialogs/modals
- Loading skeletons for async data

### 7. Admin Page Pattern
**Example:** `AdminDashboard.tsx`, `SubscriptionPlans.tsx`
- Tabs for different sections (`<Tabs>` from Radix UI)
- Data tables with actions dropdown (`<DropdownMenu>`)
- Dialogs for create/edit forms (`<Dialog>`)
- Alert dialogs for confirmations (`<AlertDialog>`)
- Toast notifications for feedback (`useToast()`)

### 8. UI Component Library
**Radix UI Components** (from `components/ui/`):
- `Card`, `CardHeader`, `CardTitle`, `CardContent` - Container components
- `Dialog`, `DialogContent`, `DialogHeader` - Modals
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell` - Data tables
- `Button`, `Input`, `Textarea`, `Select`, `Checkbox` - Form controls
- `Badge` - Status indicators
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` - Tab navigation
- `Alert`, `AlertDialog` - Notifications and confirmations
- `Toast` - Toast notifications via `useToast()` hook

---

## Backend API Review

### Partner Controller Endpoints (`partner.controller.ts`)
```typescript
// Authentication
POST   /api/partner/register           // Register new partner
POST   /api/partner/login              // Partner login (uses /api/auth/team-login)
GET    /api/partner/csrf-token         // Get CSRF token

// Partner Profile (Authenticated)
GET    /api/partner/profile            // Get own profile
PUT    /api/partner/profile            // Update own profile
GET    /api/partner/dashboard-stats    // Get dashboard statistics

// Referral Links
GET    /api/partner/referral-links     // List all referral links
POST   /api/partner/referral-links     // Create new referral link
PUT    /api/partner/referral-links/:id // Update referral link
DELETE /api/partner/referral-links/:id // Deactivate referral link

// Commissions
GET    /api/partner/commissions/pending  // Get pending commissions
GET    /api/partner/commissions/history  // Get commission history

// Payouts
GET    /api/partner/payouts            // Get payout history
POST   /api/partner/payouts            // Request new payout
```

### Admin Partner Controller Endpoints (`admin-partner.controller.ts`)
```typescript
// Partner Management (Admin Only)
GET    /api/admin/partners             // List all partners
POST   /api/admin/partners/:id/verify  // Verify partner (KYC)
POST   /api/admin/partners/:id/deactivate // Deactivate partner

// Referral Management (Admin Only)
POST   /api/admin/referrals/:id/approve // Approve referral
POST   /api/admin/referrals/:id/reject  // Reject referral

// Commission Management (Admin Only)
POST   /api/admin/commissions/approve  // Bulk approve commissions
POST   /api/admin/commissions/reject   // Bulk reject commissions

// Payout Processing (Admin Only)
POST   /api/admin/payouts/:id/process-bank    // Process bank transfer
POST   /api/admin/payouts/:id/process-paypal  // Process PayPal payout
POST   /api/admin/payouts/:id/complete        // Mark payout complete
POST   /api/admin/payouts/:id/cancel          // Cancel payout
```

### Public Referral Controller (`public-referral.controller.ts`)
```typescript
// Public Referral Tracking (No Auth)
GET    /ref/:linkCode                  // Handle referral link click
```

### Type Definitions (`shared/types/partner-types.ts`)
```typescript
// Dashboard Stats
interface PartnerDashboardStats {
  totalReferrals: number;
  totalConversions: number;
  conversionRate: number;
  totalClicks: number;
  uniqueClicks: number;
  clickToRegistrationRate: number;
  totalCommissionEarned: number;
  totalCommissionPaid: number;
  pendingCommission: number;
  currentMonthReferrals: number;
  currentMonthConversions: number;
  activeLinks: number;
}

// Extended Types
interface PartnerWithUser extends PartnerProfile { user: {...} }
interface ReferralLinkWithStats extends PartnerReferralLink { stats: {...} }
interface CommissionWithDetails extends PartnerCommission { details: {...} }
interface PayoutWithCommissions extends PartnerPayout { commissions: [...] }
```

---

## PHASE 1: Foundation & Setup

**Estimated Effort:** 8-10 hours  
**Dependencies:** None (Foundation phase)  
**Priority:** CRITICAL (Required for all subsequent phases)

### 1.1 Update Navigation Configuration

**File to Modify:** `client/src/lib/navigation-config.ts`

**Changes:**
```typescript
// Add 'partner' to UserType
export type UserType = 'customer' | 'team_member' | 'company_profile' | 'partner';

// Add partner navigation paths
export const NAVIGATION_PATHS = {
  profile: {
    customer: '/profile',
    company_profile: '/dashboard/company/profile',
    admin: '/dashboard/admin/profile',
    counselor: '/dashboard/counselor/profile',
    partner: '/dashboard/partner/profile', // NEW
  },
  dashboard: {
    customer: '/dashboard/student',
    company_profile: '/dashboard/company',
    admin: '/dashboard/admin',
    counselor: '/dashboard/team',
    team_member: '/dashboard/team',
    partner: '/dashboard/partner', // NEW
  },
} as const;

// Update getProfilePath function
export function getProfilePath(user: User | null): string {
  if (!user) return '/profile';
  
  if (user.userType === 'customer') {
    return NAVIGATION_PATHS.profile.customer;
  }
  
  if (user.userType === 'company_profile') {
    return NAVIGATION_PATHS.profile.company_profile;
  }
  
  // NEW: Partner profile path
  if (user.userType === 'partner') {
    return NAVIGATION_PATHS.profile.partner;
  }
  
  if (user.userType === 'team_member') {
    if (user.teamRole === 'admin') {
      return NAVIGATION_PATHS.profile.admin;
    }
    if (user.teamRole === 'counselor') {
      return NAVIGATION_PATHS.profile.counselor;
    }
  }
  
  return '/profile';
}

// Update getDashboardPath function
export function getDashboardPath(user: User | null): string {
  if (!user) return '/auth';
  
  switch (user.userType) {
    case 'customer':
      return NAVIGATION_PATHS.dashboard.customer;
    case 'company_profile':
      return NAVIGATION_PATHS.dashboard.company_profile;
    case 'partner': // NEW
      return NAVIGATION_PATHS.dashboard.partner;
    case 'team_member':
      if (user.teamRole === 'admin') {
        return NAVIGATION_PATHS.dashboard.admin;
      }
      return NAVIGATION_PATHS.dashboard.team;
    default:
      return '/auth';
  }
}
```

**Key Pattern:** Extend existing type unions and navigation helpers

---

### 1.2 Create Partner API Hooks

**File to Create:** `client/src/hooks/partner-api-hooks.ts`

**Content:**
```typescript
/**
 * Partner System API Hooks
 * 
 * React Query hooks for partner-related API calls.
 * Follows the established pattern from api-hooks.ts
 */

import { useApiQuery, useApiMutation } from '@/hooks/api-hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type {
  PartnerDashboardStats,
  ReferralLinkWithStats,
  ReferralLinkCreatedResponse,
  CommissionWithDetails,
  PayoutWithCommissions,
  PartnerProfile,
  UpdatePartnerProfileRequest,
  CreateReferralLinkRequest,
  PartnerWithUser,
} from '@shared/types/partner-types';

// ============================================================================
// PARTNER PROFILE HOOKS
// ============================================================================

/**
 * Fetch partner profile
 */
export function usePartnerProfile() {
  return useApiQuery<PartnerProfile>(
    ['/api/partner/profile'],
    '/api/partner/profile',
    undefined,
    { staleTime: 5 * 60 * 1000 } // Cache for 5 minutes
  );
}

/**
 * Update partner profile
 */
export function useUpdatePartnerProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useApiMutation<PartnerProfile, UpdatePartnerProfileRequest>(
    async (data) => {
      const response = await api.put('/api/partner/profile', data);
      return response as PartnerProfile;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/partner/profile'] });
        toast({
          title: 'Success',
          description: 'Profile updated successfully',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to update profile',
          variant: 'destructive',
        });
      },
    }
  );
}

// ============================================================================
// DASHBOARD HOOKS
// ============================================================================

/**
 * Fetch partner dashboard statistics
 */
export function usePartnerDashboardStats() {
  return useApiQuery<PartnerDashboardStats>(
    ['/api/partner/dashboard-stats'],
    '/api/partner/dashboard-stats',
    undefined,
    { staleTime: 2 * 60 * 1000 } // Cache for 2 minutes
  );
}

// ============================================================================
// REFERRAL LINK HOOKS
// ============================================================================

/**
 * Fetch all referral links with stats
 */
export function useReferralLinks() {
  return useApiQuery<ReferralLinkWithStats[]>(
    ['/api/partner/referral-links'],
    '/api/partner/referral-links',
    undefined,
    { staleTime: 1 * 60 * 1000 } // Cache for 1 minute
  );
}

/**
 * Create new referral link
 */
export function useCreateReferralLink() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useApiMutation<ReferralLinkCreatedResponse, CreateReferralLinkRequest>(
    async (data) => {
      const response = await api.post('/api/partner/referral-links', data);
      return response as ReferralLinkCreatedResponse;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/partner/referral-links'] });
        queryClient.invalidateQueries({ queryKey: ['/api/partner/dashboard-stats'] });
        toast({
          title: 'Success',
          description: 'Referral link created successfully',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to create referral link',
          variant: 'destructive',
        });
      },
    }
  );
}

/**
 * Update referral link
 */
export function useUpdateReferralLink() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useApiMutation<void, { linkId: string; updates: Partial<CreateReferralLinkRequest> }>(
    async ({ linkId, updates }) => {
      await api.put(`/api/partner/referral-links/${linkId}`, updates);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/partner/referral-links'] });
        toast({
          title: 'Success',
          description: 'Referral link updated successfully',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to update referral link',
          variant: 'destructive',
        });
      },
    }
  );
}

/**
 * Deactivate referral link
 */
export function useDeactivateReferralLink() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useApiMutation<void, string>(
    async (linkId) => {
      await api.delete(`/api/partner/referral-links/${linkId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/partner/referral-links'] });
        queryClient.invalidateQueries({ queryKey: ['/api/partner/dashboard-stats'] });
        toast({
          title: 'Success',
          description: 'Referral link deactivated',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to deactivate referral link',
          variant: 'destructive',
        });
      },
    }
  );
}

// ============================================================================
// COMMISSION HOOKS
// ============================================================================

/**
 * Fetch pending commissions
 */
export function usePendingCommissions() {
  return useApiQuery<CommissionWithDetails[]>(
    ['/api/partner/commissions/pending'],
    '/api/partner/commissions/pending',
    undefined,
    { staleTime: 30 * 1000 } // Cache for 30 seconds
  );
}

/**
 * Fetch commission history
 */
export function useCommissionHistory() {
  return useApiQuery<CommissionWithDetails[]>(
    ['/api/partner/commissions/history'],
    '/api/partner/commissions/history',
    undefined,
    { staleTime: 2 * 60 * 1000 } // Cache for 2 minutes
  );
}

// ============================================================================
// PAYOUT HOOKS
// ============================================================================

/**
 * Fetch payout history
 */
export function usePayoutHistory() {
  return useApiQuery<PayoutWithCommissions[]>(
    ['/api/partner/payouts'],
    '/api/partner/payouts',
    undefined,
    { staleTime: 2 * 60 * 1000 } // Cache for 2 minutes
  );
}

/**
 * Request new payout
 */
export function useRequestPayout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useApiMutation<void, { commissionIds: string[]; payoutMethod: string; notes?: string }>(
    async (data) => {
      await api.post('/api/partner/payouts', data);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/partner/payouts'] });
        queryClient.invalidateQueries({ queryKey: ['/api/partner/commissions/pending'] });
        queryClient.invalidateQueries({ queryKey: ['/api/partner/dashboard-stats'] });
        toast({
          title: 'Success',
          description: 'Payout request submitted successfully',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to request payout',
          variant: 'destructive',
        });
      },
    }
  );
}

// ============================================================================
// ADMIN PARTNER HOOKS
// ============================================================================

/**
 * Fetch all partners (Admin only)
 */
export function useAllPartners() {
  return useApiQuery<PartnerWithUser[]>(
    ['/api/admin/partners'],
    '/api/admin/partners',
    undefined,
    { staleTime: 5 * 60 * 1000 } // Cache for 5 minutes
  );
}

/**
 * Verify partner (Admin only)
 */
export function useVerifyPartner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useApiMutation<void, string>(
    async (partnerId) => {
      await api.post(`/api/admin/partners/${partnerId}/verify`, {});
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/partners'] });
        toast({
          title: 'Success',
          description: 'Partner verified successfully',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to verify partner',
          variant: 'destructive',
        });
      },
    }
  );
}

/**
 * Deactivate partner (Admin only)
 */
export function useDeactivatePartner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useApiMutation<void, { partnerId: string; reason: string }>(
    async ({ partnerId, reason }) => {
      await api.post(`/api/admin/partners/${partnerId}/deactivate`, { reason });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/partners'] });
        toast({
          title: 'Success',
          description: 'Partner deactivated',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to deactivate partner',
          variant: 'destructive',
        });
      },
    }
  );
}
```

**Key Patterns:**
- Use `useApiQuery` for GET requests
- Use `useApiMutation` for POST/PUT/DELETE
- Invalidate queries on success to refetch data
- Show toast notifications for user feedback
- Cache data appropriately (staleTime)

---

### 1.3 Update App Routing

**File to Modify:** `client/src/App.tsx`

**Changes:**
```typescript
// Add imports
import PartnerDashboard from "@/pages/PartnerDashboard";
import PartnerProfile from "@/pages/PartnerProfile";

// Add routes in the <Switch> block (after company routes, before admin routes)

{/* Partner Routes */}
<Route path="/dashboard/partner">
  <ProtectedRoute allowedUserTypes={['partner']}>
    <PartnerDashboard />
  </ProtectedRoute>
</Route>

<Route path="/dashboard/partner/profile">
  <ProtectedRoute allowedUserTypes={['partner']}>
    <PartnerProfile />
  </ProtectedRoute>
</Route>

{/* Add Partner Registration */}
<Route path="/partner/register">
  <PartnerRegistration />
</Route>
```

**Key Pattern:** Use `ProtectedRoute` with `allowedUserTypes={['partner']}` to restrict access

---

### 1.4 Testing Strategy

**Manual Testing:**
- [ ] Verify navigation helpers return correct paths for partner user type
- [ ] Test route protection prevents non-partner users from accessing partner routes
- [ ] Verify API hooks import correctly without errors

**Unit Tests:** (Optional for Phase 1, recommended for Phase 11)
- Test navigation helper functions with partner user type
- Test ProtectedRoute with partner-only routes

---

## PHASE 2: Partner Registration & Authentication

**Estimated Effort:** 12-15 hours  
**Dependencies:** Phase 1  
**Priority:** HIGH (Required for partner access)

### 2.1 Partner Registration Page

**File to Create:** `client/src/pages/PartnerRegistration.tsx`

**Component Specification:**
- Two-step registration wizard (Step 1: Account, Step 2: Business Details)
- Form validation using React Hook Form + Zod
- CSRF token integration
- Email verification notice
- Redirect to login after success

**Content:**
```typescript
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage, 
  FormDescription 
} from "@/components/ui/form";
import { Building2, UserCheck, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { BUSINESS_TYPES } from "@shared/types/partner-types";

// Zod validation schema
const partnerRegistrationSchema = z.object({
  // Step 1: Account Information
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  
  // Step 2: Business Information
  companyName: z.string().min(1, "Company name is required"),
  contactPerson: z.string().min(1, "Contact person is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  businessType: z.enum(BUSINESS_TYPES as any).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PartnerRegistrationForm = z.infer<typeof partnerRegistrationSchema>;

export default function PartnerRegistration() {
  const [, navigate] = useLocation();
  const { getCsrfToken } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<PartnerRegistrationForm>({
    resolver: zodResolver(partnerRegistrationSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      companyName: "",
      contactPerson: "",
      phone: "",
      businessType: undefined,
    },
  });

  const handleSubmit = async (data: PartnerRegistrationForm) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get CSRF token
      const csrfToken = await getCsrfToken();
      if (!csrfToken) {
        setError("Unable to establish secure connection. Please refresh the page.");
        setIsLoading(false);
        return;
      }

      // Submit registration
      const response = await api.post("/api/partner/register", {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        phone: data.phone,
        businessType: data.businessType,
      }) as any;

      toast({
        title: "Registration Successful!",
        description: "Your partner account has been created. Please check your email for verification instructions.",
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/auth?type=admin");
      }, 2000);
    } catch (error: any) {
      setError(error.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = async () => {
    // Validate step 1 fields before proceeding
    const step1Fields = ['email', 'password', 'confirmPassword', 'firstName', 'lastName'] as const;
    const result = await form.trigger(step1Fields);
    
    if (result) {
      setStep(2);
    }
  };

  const prevStep = () => {
    setStep(1);
  };

  const progressValue = (step / 2) * 100;

  return (
    <>
      <SEO
        title="Partner Registration - Phozos Study Abroad"
        description="Join the Phozos partner program and earn commissions by referring students."
        canonical="/partner/register"
        noindex={true}
      />

      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-background to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-6">
          {/* Back Button */}
          <div className="flex justify-start">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground"
            >
              ← Back to Home
            </Button>
          </div>

          {/* Registration Card */}
          <Card className="w-full">
            <CardHeader className="text-center space-y-2">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-3xl">Partner Registration</CardTitle>
              <CardDescription>
                Join our partner program and start earning commissions
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span className={step === 1 ? "font-semibold text-foreground" : ""}>
                    Step 1: Account
                  </span>
                  <span className={step === 2 ? "font-semibold text-foreground" : ""}>
                    Step 2: Business Details
                  </span>
                </div>
                <Progress value={progressValue} className="h-2" />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  {/* Step 1: Account Information */}
                  {step === 1 && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="John" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="john@company.com" {...field} />
                            </FormControl>
                            <FormDescription>
                              Use your business email address
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password *</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormDescription>
                              Minimum 8 characters with uppercase, lowercase, and number
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password *</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="button"
                        onClick={nextStep}
                        className="w-full"
                        size="lg"
                      >
                        Next: Business Details
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Step 2: Business Information */}
                  {step === 2 && (
                    <div className="space-y-4 animate-fade-in">
                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Acme Education Consultants" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="contactPerson"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Contact Person *</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormDescription>
                              Person responsible for partnership matters
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="+1234567890" {...field} />
                            </FormControl>
                            <FormDescription>
                              Include country code
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="businessType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Type (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your business type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="education_consultant">Education Consultant</SelectItem>
                                <SelectItem value="immigration_firm">Immigration Firm</SelectItem>
                                <SelectItem value="language_school">Language School</SelectItem>
                                <SelectItem value="travel_agency">Travel Agency</SelectItem>
                                <SelectItem value="career_counselor">Career Counselor</SelectItem>
                                <SelectItem value="individual_consultant">Individual Consultant</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={prevStep}
                          className="flex-1"
                          size="lg"
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back
                        </Button>

                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="flex-1"
                          size="lg"
                        >
                          {isLoading ? (
                            <>Processing...</>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Complete Registration
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </form>
              </Form>

              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-semibold"
                  onClick={() => navigate("/auth?type=admin")}
                >
                  Sign in here
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
```

**Key Patterns:**
- Multi-step wizard with progress bar
- React Hook Form + Zod validation
- CSRF token before submission
- Toast notifications for feedback
- SEO component for metadata

---

### 2.2 Partner Login Integration

**File to Modify:** `client/src/pages/Auth.tsx`

**Changes:**
```typescript
// No changes needed! Partners use the existing team login flow.
// They just need to access /auth?type=admin and login with their partner credentials.
// The backend handles partner authentication through the team-login endpoint.
```

**Note:** Partners log in using the existing "Team Access" option in the Auth page. The backend `partner.controller.ts` redirects to `/api/auth/team-login`, which handles both team members and partners.

---

### 2.3 Update AppShell Navigation

**File to Modify:** `client/src/components/AppShell.tsx` or `client/src/components/Navigation.tsx`

**Changes:** Add partner-specific navigation items when user is a partner

```typescript
// Example addition to Navigation component
{user?.userType === 'partner' && (
  <>
    <Link href="/dashboard/partner" className="nav-link">
      <LayoutDashboard className="w-4 h-4 mr-2" />
      Dashboard
    </Link>
    <Link href="/dashboard/partner/referral-links" className="nav-link">
      <Link2 className="w-4 h-4 mr-2" />
      Referral Links
    </Link>
    <Link href="/dashboard/partner/commissions" className="nav-link">
      <DollarSign className="w-4 h-4 mr-2" />
      Commissions
    </Link>
    <Link href="/dashboard/partner/payouts" className="nav-link">
      <Wallet className="w-4 h-4 mr-2" />
      Payouts
    </Link>
    <Link href="/dashboard/partner/profile" className="nav-link">
      <User className="w-4 h-4 mr-2" />
      Profile
    </Link>
  </>
)}
```

---

### 2.4 Testing Strategy

**Manual Testing:**
- [ ] Registration form validation works correctly
- [ ] Multi-step wizard navigation works (next/back buttons)
- [ ] Password confirmation validates match
- [ ] CSRF token is fetched before submission
- [ ] Success toast appears and redirects to login
- [ ] Error messages display for failed registration
- [ ] Partner can login using team access
- [ ] After login, partner is redirected to /dashboard/partner

**Integration Tests:**
- Test full registration flow end-to-end
- Test validation errors for each field
- Test password mismatch error

---

## PHASE 3: Partner Dashboard

**Estimated Effort:** 15-18 hours  
**Dependencies:** Phase 1, Phase 2  
**Priority:** HIGH (Core partner experience)

### 3.1 Partner Dashboard Page

**File to Create:** `client/src/pages/PartnerDashboard.tsx`

**Component Specification:**
- Hero section with welcome message
- KPI cards grid (4x2 = 8 cards total)
- Recent referrals table
- Top performing links chart (optional)
- Quick action buttons

**Content:** (Abbreviated for brevity - full implementation follows established dashboard pattern)

```typescript
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePartnerDashboardStats } from "@/hooks/partner-api-hooks";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  TrendingUp, 
  DollarSign,
  Eye,
  CheckCircle,
  Clock,
  Link2,
  BarChart3,
  Plus,
  ArrowRight
} from "lucide-react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/currency";

export default function PartnerDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = usePartnerDashboardStats();

  if (!user) {
    return <LoadingSkeleton type="card" count={3} />;
  }

  // KPI Cards Data
  const kpiCards = [
    {
      title: "Total Referrals",
      value: stats?.totalReferrals || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      change: `+${stats?.currentMonthReferrals || 0} this month`,
    },
    {
      title: "Total Conversions",
      value: stats?.totalConversions || 0,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      change: `+${stats?.currentMonthConversions || 0} this month`,
    },
    {
      title: "Conversion Rate",
      value: `${stats?.conversionRate.toFixed(1) || 0}%`,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      change: stats && stats.conversionRate > 10 ? "Above average" : "Keep going!",
    },
    {
      title: "Total Clicks",
      value: stats?.totalClicks || 0,
      icon: Eye,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-900/20",
      change: `${stats?.uniqueClicks || 0} unique`,
    },
    {
      title: "Commission Earned",
      value: formatCurrency(stats?.totalCommissionEarned || 0, 'INR'),
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      change: `${formatCurrency(stats?.pendingCommission || 0, 'INR')} pending`,
    },
    {
      title: "Commission Paid",
      value: formatCurrency(stats?.totalCommissionPaid || 0, 'INR'),
      icon: CheckCircle,
      color: "text-teal-600",
      bgColor: "bg-teal-50 dark:bg-teal-900/20",
      change: "All time",
    },
    {
      title: "Active Links",
      value: stats?.activeLinks || 0,
      icon: Link2,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
      change: "Currently active",
    },
    {
      title: "Click-to-Reg Rate",
      value: `${stats?.clickToRegistrationRate.toFixed(1) || 0}%`,
      icon: BarChart3,
      color: "text-pink-600",
      bgColor: "bg-pink-50 dark:bg-pink-900/20",
      change: "Conversion efficiency",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 pt-16">
      <AppShell />
      
      <main className="container mx-auto px-4 pt-24 pb-8 space-y-8">
        {/* Hero Section */}
        <Card className="liquid-glass dark:liquid-glass-dark rounded-[3rem] p-8 md:p-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Welcome back, {user.firstName || 'Partner'}!
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-6 max-w-2xl">
                Track your referrals, commissions, and grow your partnership with Phozos
              </p>
              <div className="flex items-center space-x-4">
                <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 shadow-lg">
                  <Building2 className="w-4 h-4 mr-2" />
                  Partner Dashboard
                </Badge>
                <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 shadow-lg">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verified Partner
                </Badge>
              </div>
            </div>
            <div className="hidden md:block">
              <Avatar className="w-20 h-20 border-4 border-white/40 shadow-xl">
                <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-2xl font-bold">
                  {user.firstName?.[0] || 'P'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </Card>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsLoading ? (
            <LoadingSkeleton type="card" count={8} />
          ) : (
            kpiCards.map((card, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className={`p-2 ${card.bgColor} rounded-lg`}>
                      <card.icon className={`w-6 h-6 ${card.color}`} />
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        {card.title}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-2xl font-bold">{card.value}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-muted-foreground">
                    {card.change}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Link2 className="w-5 h-5 mr-2" />
                Referral Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Create and manage your referral links to track student sign-ups
              </p>
              <Button className="w-full" asChild>
                <Link href="/dashboard/partner/referral-links">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Link
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Commissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                View pending and approved commissions from your referrals
              </p>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/dashboard/partner/commissions">
                  View Commissions
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wallet className="w-5 h-5 mr-2" />
                Payouts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Request payouts and track payment history
              </p>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/dashboard/partner/payouts">
                  Request Payout
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
```

**API Integration:**
- `usePartnerDashboardStats()` - Fetch dashboard KPIs
- Auto-refresh every 2 minutes (via staleTime in hook)

**Key Patterns:**
- Follow StudentDashboard/TeamDashboard layout structure
- Use liquid-glass effect for cards (existing CSS classes)
- KPI cards with icon, value, and change indicator
- Loading skeletons while data fetches

---

### 3.2 Testing Strategy

**Manual Testing:**
- [ ] Dashboard loads without errors
- [ ] All KPI cards display correct data
- [ ] Loading skeletons appear while fetching data
- [ ] Quick action buttons navigate correctly
- [ ] Dashboard auto-refreshes data every 2 minutes

**Performance:**
- Ensure dashboard loads in < 2 seconds
- Check for unnecessary re-renders

---

## PHASE 4: Referral Link Management

**Estimated Effort:** 12-15 hours  
**Dependencies:** Phase 1, Phase 2, Phase 3  
**Priority:** HIGH (Core partner feature)

### 4.1 Referral Links Page

**File to Create:** `client/src/pages/PartnerReferralLinks.tsx`

**Component Specification:**
- Table listing all referral links with stats
- Create new link dialog (React Hook Form + Zod)
- Edit link dialog
- Deactivate link confirmation
- Copy link to clipboard button
- Performance metrics per link (clicks, conversions, rate)

**Content:** (Key sections)

```typescript
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  useReferralLinks, 
  useCreateReferralLink, 
  useUpdateReferralLink,
  useDeactivateReferralLink 
} from "@/hooks/partner-api-hooks";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Link2, 
  Plus, 
  Copy, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Eye,
  TrendingUp,
  CheckCircle,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import type { ReferralLinkWithStats } from "@shared/types/partner-types";

// Zod schema for referral link form
const referralLinkSchema = z.object({
  campaignName: z.string().min(1, "Campaign name is required").max(100),
  campaignSource: z.string().optional(),
  campaignMedium: z.string().optional(),
  description: z.string().max(500).optional(),
  expiresAt: z.string().optional(),
});

type ReferralLinkForm = z.infer<typeof referralLinkSchema>;

export default function PartnerReferralLinks() {
  const { toast } = useToast();
  const { data: links = [], isLoading } = useReferralLinks();
  const createLinkMutation = useCreateReferralLink();
  const updateLinkMutation = useUpdateReferralLink();
  const deactivateLinkMutation = useDeactivateReferralLink();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<ReferralLinkWithStats | null>(null);
  const [deletingLink, setDeletingLink] = useState<ReferralLinkWithStats | null>(null);

  const createForm = useForm<ReferralLinkForm>({
    resolver: zodResolver(referralLinkSchema),
    defaultValues: {
      campaignName: "",
      campaignSource: "",
      campaignMedium: "",
      description: "",
      expiresAt: "",
    },
  });

  const editForm = useForm<ReferralLinkForm>({
    resolver: zodResolver(referralLinkSchema),
  });

  // Reset edit form when editingLink changes
  useEffect(() => {
    if (editingLink) {
      editForm.reset({
        campaignName: editingLink.campaignName || "",
        campaignSource: editingLink.campaignSource || "",
        campaignMedium: editingLink.campaignMedium || "",
        description: editingLink.description || "",
        expiresAt: editingLink.expiresAt 
          ? new Date(editingLink.expiresAt).toISOString().split('T')[0] 
          : "",
      });
    }
  }, [editingLink, editForm]);

  const handleCreateLink = async (data: ReferralLinkForm) => {
    createLinkMutation.mutate(data, {
      onSuccess: (response) => {
        setCreateDialogOpen(false);
        createForm.reset();
        toast({
          title: "Referral Link Created!",
          description: "Your new referral link is ready to use.",
        });
      },
    });
  };

  const handleUpdateLink = async (data: ReferralLinkForm) => {
    if (!editingLink) return;

    updateLinkMutation.mutate(
      { linkId: editingLink.id, updates: data },
      {
        onSuccess: () => {
          setEditingLink(null);
          editForm.reset();
        },
      }
    );
  };

  const handleDeactivateLink = async () => {
    if (!deletingLink) return;

    deactivateLinkMutation.mutate(deletingLink.id, {
      onSuccess: () => {
        setDeletingLink(null);
      },
    });
  };

  const copyToClipboard = (linkCode: string) => {
    const fullUrl = `${window.location.origin}/ref/${linkCode}`;
    navigator.clipboard.writeText(fullUrl);
    toast({
      title: "Link Copied!",
      description: "Referral link copied to clipboard",
    });
  };

  const getStatusBadge = (link: ReferralLinkWithStats) => {
    if (!link.isActive) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge className="bg-green-100 text-green-700">Active</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pt-16">
      <AppShell />
      
      <main className="container mx-auto px-4 pt-24 pb-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Referral Links</h1>
            <p className="text-muted-foreground">
              Create and manage your referral links to track student sign-ups
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Create New Link
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Referral Links</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign Name</TableHead>
                  <TableHead>Link Code</TableHead>
                  <TableHead className="text-center">Clicks</TableHead>
                  <TableHead className="text-center">Conversions</TableHead>
                  <TableHead className="text-center">Conv. Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading referral links...
                    </TableCell>
                  </TableRow>
                ) : links.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Link2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">
                        No referral links yet. Create your first link to get started!
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  links.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell className="font-medium">
                        {link.campaignName || "Default Link"}
                        {link.description && (
                          <p className="text-sm text-muted-foreground">
                            {link.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm">
                          {link.linkCode}
                        </code>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col">
                          <span className="font-semibold">{link.clickCount}</span>
                          <span className="text-xs text-muted-foreground">
                            {link.uniqueClickCount} unique
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-green-600">
                          {link.conversionCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {link.conversionRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(link)}</TableCell>
                      <TableCell>{formatDate(link.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(link.linkCode)}
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingLink(link)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => window.open(`/ref/${link.linkCode}`, '_blank')}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Test Link
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setDeletingLink(link)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create Link Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Referral Link</DialogTitle>
              <DialogDescription>
                Create a new referral link to track student sign-ups from different campaigns
              </DialogDescription>
            </DialogHeader>

            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateLink)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="campaignName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Facebook Ad Campaign" {...field} />
                      </FormControl>
                      <FormDescription>
                        A friendly name to identify this link
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="campaignSource"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., facebook, google" {...field} />
                        </FormControl>
                        <FormDescription>
                          Where traffic comes from
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="campaignMedium"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medium (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., social, email, cpc" {...field} />
                        </FormControl>
                        <FormDescription>
                          Type of marketing
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Add notes about this campaign..." 
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>
                        Leave empty for no expiration
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createLinkMutation.isPending}>
                    {createLinkMutation.isPending ? "Creating..." : "Create Link"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Link Dialog */}
        <Dialog open={!!editingLink} onOpenChange={(open) => !open && setEditingLink(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Referral Link</DialogTitle>
              <DialogDescription>
                Update the details of your referral link
              </DialogDescription>
            </DialogHeader>

            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleUpdateLink)} className="space-y-4">
                {/* Same fields as Create Dialog */}
                {/* ... (omitted for brevity) ... */}

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setEditingLink(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateLinkMutation.isPending}>
                    {updateLinkMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingLink} onOpenChange={(open) => !open && setDeletingLink(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate Referral Link?</AlertDialogTitle>
              <AlertDialogDescription>
                This will deactivate the link "{deletingLink?.campaignName}". 
                The link will no longer accept new clicks, but existing data will be preserved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeactivateLink}
                className="bg-red-600 hover:bg-red-700"
              >
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
```

**API Endpoints:**
- GET `/api/partner/referral-links` - List all links
- POST `/api/partner/referral-links` - Create link
- PUT `/api/partner/referral-links/:id` - Update link
- DELETE `/api/partner/referral-links/:id` - Deactivate link

**Key Patterns:**
- Table with action dropdown menu
- Create/Edit dialogs with React Hook Form
- AlertDialog for delete confirmation
- Copy to clipboard functionality
- Badge indicators for status

---

### 4.2 Add Route to App.tsx

**File to Modify:** `client/src/App.tsx`

```typescript
<Route path="/dashboard/partner/referral-links">
  <ProtectedRoute allowedUserTypes={['partner']}>
    <PartnerReferralLinks />
  </ProtectedRoute>
</Route>
```

---

### 4.3 Testing Strategy

**Manual Testing:**
- [ ] Create new referral link with all fields
- [ ] Create link with minimal required fields
- [ ] Edit existing link
- [ ] Deactivate link (confirmation dialog works)
- [ ] Copy link to clipboard
- [ ] Test link opens in new tab
- [ ] Table displays all stats correctly
- [ ] Status badges display correctly (Active/Inactive/Expired)

---

## PHASE 5: Commission Tracking

**Estimated Effort:** 10-12 hours  
**Dependencies:** Phase 1, Phase 2  
**Priority:** MEDIUM (Financial tracking)

### 5.1 Commission Tracking Page

**File to Create:** `client/src/pages/PartnerCommissions.tsx`

**Component Specification:**
- Tabs for "Pending" and "History"
- Table with commission details
- Filters (status, date range, student)
- Commission detail dialog (click row to view)
- Search functionality

**Key Features:**
```typescript
// Two tabs: Pending & History
<Tabs defaultValue="pending">
  <TabsList>
    <TabsTrigger value="pending">Pending Commissions</TabsTrigger>
    <TabsTrigger value="history">Commission History</TabsTrigger>
  </TabsList>
  
  <TabsContent value="pending">
    {/* Pending commissions table */}
  </TabsContent>
  
  <TabsContent value="history">
    {/* All commissions table with filters */}
  </TabsContent>
</Tabs>
```

**API Endpoints:**
- GET `/api/partner/commissions/pending`
- GET `/api/partner/commissions/history`

**Table Columns:**
- Student Name
- Subscription Plan
- Commission Amount
- Payment Amount
- Status
- Created Date
- Approved Date (if applicable)
- Actions (View Details)

**Key Patterns:**
- Follow existing table patterns (SubscriptionPlans.tsx)
- Use Tabs from Radix UI
- Commission detail dialog shows full referral info

---

### 5.2 Add Route

**File to Modify:** `client/src/App.tsx`

```typescript
<Route path="/dashboard/partner/commissions">
  <ProtectedRoute allowedUserTypes={['partner']}>
    <PartnerCommissions />
  </ProtectedRoute>
</Route>
```

---

### 5.3 Testing Strategy

**Manual Testing:**
- [ ] Pending tab shows only pending commissions
- [ ] History tab shows all commissions
- [ ] Filters work correctly
- [ ] Search finds commissions by student name
- [ ] Detail dialog shows complete information
- [ ] Status badges display correctly

---

## PHASE 6: Payout Management

**Estimated Effort:** 12-15 hours  
**Dependencies:** Phase 1, Phase 2, Phase 5  
**Priority:** HIGH (Partner payment)

### 6.1 Payout Management Page

**File to Create:** `client/src/pages/PartnerPayouts.tsx`

**Component Specification:**
- Request payout dialog (select commissions, payout method)
- Payout history table
- Payout status tracking
- Bank/PayPal details configuration (inline or separate section)
- Minimum payout threshold indicator

**Request Payout Flow:**
1. Click "Request Payout" button
2. Dialog shows:
   - Available commissions (approved, not paid)
   - Total amount available
   - Select payout method (Bank Transfer / PayPal)
   - Optional notes
3. Submit request
4. Admin processes payout

**API Endpoints:**
- GET `/api/partner/payouts` - Payout history
- POST `/api/partner/payouts` - Request new payout

**Key Patterns:**
- Form in dialog for payout request
- Table for payout history
- Status badges (Pending, Processing, Completed, Failed)

---

### 6.2 Add Route

**File to Modify:** `client/src/App.tsx`

```typescript
<Route path="/dashboard/partner/payouts">
  <ProtectedRoute allowedUserTypes={['partner']}>
    <PartnerPayouts />
  </ProtectedRoute>
</Route>
```

---

### 6.3 Testing Strategy

**Manual Testing:**
- [ ] Request payout dialog shows available commissions
- [ ] Minimum payout validation works
- [ ] Payout method selection works
- [ ] Payout request submits successfully
- [ ] History table displays all payouts
- [ ] Status tracking is accurate

---

## PHASE 7: Partner Profile Settings

**Estimated Effort:** 10-12 hours  
**Dependencies:** Phase 1, Phase 2  
**Priority:** MEDIUM (Profile management)

### 7.1 Partner Profile Page

**File to Create:** `client/src/pages/PartnerProfile.tsx`

**Component Specification:**
- Profile overview card (company name, contact person, status badges)
- Edit profile form (React Hook Form + Zod)
- Bank details configuration
- PayPal email configuration
- Business information section
- Logo upload (if implementing file upload)

**Sections:**
1. **Business Information**
   - Company Name
   - Contact Person
   - Phone
   - WhatsApp Number
   - Website
   - Business Type
   - Bio/Description

2. **Payment Configuration**
   - Payout Method preference
   - Bank Details (if bank transfer)
   - PayPal Email (if PayPal)
   - Minimum Payout Amount (view only, set by admin)

3. **Account Status**
   - Verification status badge
   - Commission rate (view only)
   - Active/Inactive status

**API Endpoints:**
- GET `/api/partner/profile`
- PUT `/api/partner/profile`

**Key Patterns:**
- Follow existing profile patterns (Profile.tsx, CompanyProfile.tsx)
- Form with sections
- Read-only fields for admin-controlled values

---

### 7.2 Add Route

**File to Modify:** `client/src/App.tsx`

```typescript
{/* Already added in Phase 1 */}
<Route path="/dashboard/partner/profile">
  <ProtectedRoute allowedUserTypes={['partner']}>
    <PartnerProfile />
  </ProtectedRoute>
</Route>
```

---

### 7.3 Testing Strategy

**Manual Testing:**
- [ ] Profile data loads correctly
- [ ] Edit form validation works
- [ ] Profile updates successfully
- [ ] Toast notifications appear
- [ ] Bank details save correctly
- [ ] PayPal email saves correctly

---

## PHASE 8: Admin Partner Management

**Estimated Effort:** 15-18 hours  
**Dependencies:** Phase 1  
**Priority:** HIGH (Admin control)

### 8.1 Admin Partners List Page

**File to Create:** `client/src/pages/admin/PartnerManagement.tsx`

**Component Specification:**
- Partners list table
- Filters (status: all, verified, pending, inactive)
- Search by company name or email
- Actions dropdown (Verify, View Details, Deactivate)
- Partner detail dialog (full profile view)
- KYC verification UI

**Table Columns:**
- Company Name
- Contact Person
- Email
- Phone
- Business Type
- Status (Verified/Pending/Inactive)
- Total Referrals
- Total Conversions
- Commission Earned
- Commission Rate
- Created Date
- Actions

**API Endpoints:**
- GET `/api/admin/partners` - List all partners
- POST `/api/admin/partners/:id/verify` - Verify partner
- POST `/api/admin/partners/:id/deactivate` - Deactivate partner

**Key Patterns:**
- Follow AdminDashboard table structure
- Use DropdownMenu for actions
- Dialog for partner details
- AlertDialog for verify/deactivate confirmations

---

### 8.2 Add Admin Route

**File to Modify:** `client/src/App.tsx`

```typescript
<Route path="/dashboard/admin/partners">
  <ProtectedRoute allowedUserTypes={['team_member']} allowedRoles={['admin']}>
    <PartnerManagement />
  </ProtectedRoute>
</Route>
```

---

### 8.3 Add Navigation Link

**File to Modify:** `client/src/components/AppShell.tsx` or `Navigation.tsx`

```typescript
{user?.userType === 'team_member' && user?.teamRole === 'admin' && (
  <>
    {/* Existing admin links */}
    <Link href="/dashboard/admin/partners" className="nav-link">
      <Building2 className="w-4 h-4 mr-2" />
      Partners
    </Link>
  </>
)}
```

---

### 8.4 Testing Strategy

**Manual Testing:**
- [ ] Partners table loads all partners
- [ ] Filters work correctly
- [ ] Search finds partners by name/email
- [ ] Verify action works
- [ ] Deactivate action works with confirmation
- [ ] Partner detail dialog shows complete info

---

## PHASE 9: Admin Commission & Payout Processing

**Estimated Effort:** 15-18 hours  
**Dependencies:** Phase 1, Phase 8  
**Priority:** HIGH (Admin operations)

### 9.1 Admin Commission Management

**File to Create:** `client/src/pages/admin/CommissionManagement.tsx`

**Component Specification:**
- Pending commissions queue
- Bulk select checkboxes
- Bulk approve/reject actions
- Commission detail view
- Filter by partner, status, date range

**Key Features:**
- Checkbox column for bulk selection
- "Select All" checkbox in header
- Bulk approve button (shows count)
- Bulk reject button (shows count + reason dialog)
- Individual approve/reject actions

**API Endpoints:**
- POST `/api/admin/commissions/approve` - Bulk approve
- POST `/api/admin/commissions/reject` - Bulk reject

---

### 9.2 Admin Payout Processing

**File to Create:** `client/src/pages/admin/PayoutProcessing.tsx`

**Component Specification:**
- Payout requests table
- Process payout flow:
  1. Select payout
  2. Choose processing action (Bank Transfer / PayPal)
  3. Enter reference/transaction ID
  4. Mark as complete
- Cancel payout with reason
- Payout history view

**API Endpoints:**
- POST `/api/admin/payouts/:id/process-bank` - Process bank transfer
- POST `/api/admin/payouts/:id/process-paypal` - Process PayPal
- POST `/api/admin/payouts/:id/complete` - Mark complete
- POST `/api/admin/payouts/:id/cancel` - Cancel payout

**Key Patterns:**
- Multi-step processing flow
- Confirmation dialogs
- Status tracking

---

### 9.3 Add Admin Routes

**File to Modify:** `client/src/App.tsx`

```typescript
<Route path="/dashboard/admin/commissions">
  <ProtectedRoute allowedUserTypes={['team_member']} allowedRoles={['admin']}>
    <CommissionManagement />
  </ProtectedRoute>
</Route>

<Route path="/dashboard/admin/payouts">
  <ProtectedRoute allowedUserTypes={['team_member']} allowedRoles={['admin']}>
    <PayoutProcessing />
  </ProtectedRoute>
</Route>
```

---

### 9.4 Testing Strategy

**Manual Testing:**
- [ ] Bulk selection works correctly
- [ ] Bulk approve updates all selected commissions
- [ ] Bulk reject shows reason dialog
- [ ] Individual actions work
- [ ] Payout processing flow completes successfully
- [ ] Status updates appear immediately

---

## PHASE 10: Analytics & Reporting

**Estimated Effort:** 12-15 hours  
**Dependencies:** Phase 1, Phase 8  
**Priority:** MEDIUM (Business intelligence)

### 10.1 Partner Analytics Dashboard (Admin)

**File to Create:** `client/src/pages/admin/PartnerAnalytics.tsx`

**Component Specification:**
- System-wide KPIs
  - Total partners (verified, pending, inactive)
  - Total referrals this month
  - Total conversions this month
  - Total commissions paid this month
- Top performing partners table
- Conversion funnel visualization (optional - use recharts)
- Monthly trends chart (optional)

**API Endpoints:**
- Create new endpoint: GET `/api/admin/partners/analytics`
  - Backend needs to implement this endpoint

**Key Patterns:**
- Follow LifetimeAnalyticsDashboard.tsx pattern
- Use recharts library for charts (already installed)

---

### 10.2 Add Admin Route

**File to Modify:** `client/src/App.tsx`

```typescript
<Route path="/dashboard/admin/partner-analytics">
  <ProtectedRoute allowedUserTypes={['team_member']} allowedRoles={['admin']}>
    <PartnerAnalytics />
  </ProtectedRoute>
</Route>
```

---

### 10.3 Testing Strategy

**Manual Testing:**
- [ ] KPIs load correctly
- [ ] Top partners table displays accurately
- [ ] Charts render without errors
- [ ] Data refreshes periodically

---

## PHASE 11: Public Referral Landing & Integration

**Estimated Effort:** 8-10 hours  
**Dependencies:** Phase 4  
**Priority:** MEDIUM (User experience)

### 11.1 Referral Attribution Integration

**File to Modify:** `client/src/pages/Auth.tsx` (Student Registration)

**Changes:**
1. Check for referral cookies on page load
2. Display "Referred by [Partner]" badge if referral code present
3. Store referral click ID in hidden form field
4. Submit referral data with registration

**Pattern:**
```typescript
// In Auth.tsx, add useEffect to check cookies
useEffect(() => {
  const referralCode = getCookie('referral_code');
  const clickId = getCookie('click_id');
  
  if (referralCode) {
    setHasReferral(true);
    setReferralInfo({ code: referralCode, clickId });
  }
}, []);

// Display referral badge
{hasReferral && (
  <Alert className="bg-blue-50 border-blue-200">
    <Info className="h-4 w-4" />
    <AlertDescription>
      You were referred by a Phozos partner. You'll get priority support!
    </AlertDescription>
  </Alert>
)}
```

**Note:** The backend already handles referral click tracking via `/ref/:linkCode`. The frontend just needs to show the user they were referred and include the click ID in registration.

---

### 11.2 Referral Link Handler (Already Implemented)

The backend already handles GET `/ref/:linkCode` which:
1. Records the click
2. Sets attribution cookies
3. Redirects to `/auth` (registration page)

**No frontend changes needed** - just ensure the Auth page reads the cookies.

---

### 11.3 Testing Strategy

**Manual Testing:**
- [ ] Click referral link (/ref/LINKCODE)
- [ ] Verify redirect to /auth
- [ ] Verify "Referred by" badge appears
- [ ] Register student account
- [ ] Verify referral is recorded (check partner dashboard)

**Integration Testing:**
- Full attribution flow end-to-end
- Cookie expiration testing (30 days)
- Multiple device testing

---

## PHASE 12: Testing & Polish

**Estimated Effort:** 10-12 hours  
**Dependencies:** All previous phases  
**Priority:** HIGH (Quality assurance)

### 12.1 Comprehensive Testing

**Manual Testing Checklist:**
- [ ] All routes accessible with correct permissions
- [ ] All forms validate correctly
- [ ] All API calls handle errors gracefully
- [ ] Loading states appear appropriately
- [ ] Toast notifications are clear and helpful
- [ ] Mobile responsiveness on all pages
- [ ] Dark mode compatibility
- [ ] Browser compatibility (Chrome, Firefox, Safari)

### 12.2 Performance Optimization

- [ ] Check for unnecessary re-renders
- [ ] Optimize React Query cache times
- [ ] Lazy load heavy components
- [ ] Ensure no memory leaks

### 12.3 Accessibility

- [ ] All forms have proper labels
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility
- [ ] Color contrast meets WCAG standards

### 12.4 Error Handling

- [ ] Network errors show user-friendly messages
- [ ] 401/403 errors redirect to login
- [ ] 500 errors show generic error message
- [ ] Retry logic for failed requests

---

## Summary & Timeline

### Total Effort Estimate: 120-140 hours (3-4 weeks)

**Phase Breakdown:**
- Phase 1: Foundation - 8-10 hours
- Phase 2: Registration - 12-15 hours
- Phase 3: Dashboard - 15-18 hours
- Phase 4: Referral Links - 12-15 hours
- Phase 5: Commissions - 10-12 hours
- Phase 6: Payouts - 12-15 hours
- Phase 7: Profile - 10-12 hours
- Phase 8: Admin Partners - 15-18 hours
- Phase 9: Admin Commissions/Payouts - 15-18 hours
- Phase 10: Analytics - 12-15 hours
- Phase 11: Referral Integration - 8-10 hours
- Phase 12: Testing & Polish - 10-12 hours

### Critical Path
1. Phase 1 → Phase 2 → Phase 3 (Must be done first)
2. Phase 4, 5, 6, 7 can be done in parallel after Phase 3
3. Phase 8 → Phase 9 (Admin features)
4. Phase 10 (Analytics) can be done anytime after Phase 1
5. Phase 11 (Integration) after Phase 4
6. Phase 12 (Testing) last

### Files Created (28 new files)
```
client/src/
├── pages/
│   ├── PartnerRegistration.tsx (new)
│   ├── PartnerDashboard.tsx (new)
│   ├── PartnerProfile.tsx (new)
│   ├── PartnerReferralLinks.tsx (new)
│   ├── PartnerCommissions.tsx (new)
│   ├── PartnerPayouts.tsx (new)
│   └── admin/
│       ├── PartnerManagement.tsx (new)
│       ├── CommissionManagement.tsx (new)
│       ├── PayoutProcessing.tsx (new)
│       └── PartnerAnalytics.tsx (new)
└── hooks/
    └── partner-api-hooks.ts (new)
```

### Files Modified (5 files)
```
client/src/
├── App.tsx (add routes)
├── lib/navigation-config.ts (add partner paths)
├── components/AppShell.tsx (add partner navigation)
├── components/Navigation.tsx (add partner links)
└── pages/Auth.tsx (add referral attribution)
```

### Key Success Metrics
- Partner registration conversion rate > 20%
- Dashboard load time < 2 seconds
- Commission approval time < 1 minute (admin)
- Payout processing time < 5 minutes (admin)
- Zero critical bugs in production

---

## Appendix: Code Pattern Reference

### A. Form Pattern (React Hook Form + Zod)

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  field1: z.string().min(1, "Required"),
  field2: z.number().positive(),
});

type FormData = z.infer<typeof schema>;

function MyComponent() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { field1: "", field2: 0 },
  });

  const onSubmit = (data: FormData) => {
    // Handle submission
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="field1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Label</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

### B. API Query Pattern

```typescript
import { useApiQuery, useApiMutation } from '@/hooks/api-hooks';

// GET request
const { data, isLoading, error } = useApiQuery(
  ['/api/endpoint'],
  '/api/endpoint',
  undefined,
  { staleTime: 5 * 60 * 1000 }
);

// POST/PUT/DELETE request
const mutation = useApiMutation(
  async (data) => await api.post('/api/endpoint', data),
  {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/endpoint'] });
      toast({ title: "Success" });
    },
    onError: () => {
      toast({ title: "Error", variant: "destructive" });
    },
  }
);

// Usage
mutation.mutate({ field: "value" });
```

### C. Table with Actions Pattern

```typescript
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleEdit(item)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(item)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### D. Dialog Pattern

```typescript
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    
    {/* Dialog content */}
    
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleSubmit}>
        Confirm
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

**END OF FRONTEND IMPLEMENTATION PLAN**
