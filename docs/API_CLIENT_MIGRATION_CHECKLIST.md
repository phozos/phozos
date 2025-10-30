# API Client Migration Checklist
## EduPath Application - Component Migration Guide

**Version:** 1.0  
**Date:** October 20, 2025  
**Status:** Ready for Migration  
**Related Documents:**
- [API Client Standard](./API_CLIENT_STANDARD.md)
- [API Client Remediation Plan](./API_CLIENT_REMEDIATION_PLAN.md)

---

## Table of Contents

1. [Migration Overview](#migration-overview)
2. [General Migration Template](#general-migration-template)
3. [Batch 1: Low-Risk Components](#batch-1-low-risk-components)
4. [Batch 2: Admin Dashboard Components](#batch-2-admin-dashboard-components)
5. [Batch 3: Student/Counselor Components](#batch-3-studentcounselor-components)
6. [Batch 4: Complex Components](#batch-4-complex-components)
7. [Testing Checklist](#testing-checklist)
8. [Troubleshooting](#troubleshooting)

---

## Migration Overview

### Migration Strategy

The migration follows an **incremental, low-risk approach** organized into 4 batches:

| Batch | Components | Risk Level | Duration | Order |
|-------|-----------|------------|----------|-------|
| **Batch 1** | Low-Risk (8-10) | Low | 4 hours | First |
| **Batch 2** | Admin Dashboard (10-12) | Low-Medium | 6 hours | Second |
| **Batch 3** | Student/Counselor (15-20) | Medium | 8 hours | Third |
| **Batch 4** | Complex (8-10) | High | 6 hours | Last |

**Total:** 50+ components, ~24 hours development time

### Prerequisites

Before starting migration:

- [ ] Read [API Client Standard](./API_CLIENT_STANDARD.md)
- [ ] Uncomment hooks in `client/src/hooks/api-hooks.ts`
- [ ] Set up React Query DevTools (optional but recommended)
- [ ] Create feature branch: `git checkout -b api-client-migration-batchX`

### Success Criteria Per Batch

- [ ] All components in batch migrated
- [ ] No TypeScript errors
- [ ] All functionality tested and working
- [ ] No regressions in error handling
- [ ] Code review passed
- [ ] QA sign-off received

---

## General Migration Template

### Step-by-Step Process

#### 1. **Audit Current Usage**

```bash
# Find all useQuery/useMutation calls in the component
grep -n "useQuery\|useMutation" client/src/path/to/Component.tsx
```

#### 2. **Update Imports**

**BEFORE:**
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
```

**AFTER:**
```typescript
import { useApiQuery, useApiMutation } from "@/hooks/api-hooks";
import { api } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
```

#### 3. **Define Zod Schemas**

```typescript
// Add near the top of the file, after imports
const ResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  // ... other fields
});
```

#### 4. **Replace useQuery Calls**

**BEFORE:**
```typescript
const { data, isLoading } = useQuery({
  queryKey: ["/api/endpoint"],
  queryFn: () => api.get('/api/endpoint'),
  enabled: someCondition,
});
```

**AFTER:**
```typescript
const { data, isLoading } = useApiQuery(
  ["/api/endpoint"],
  '/api/endpoint',
  ResponseSchema,
  { enabled: someCondition }
);
```

#### 5. **Replace useMutation Calls**

**BEFORE:**
```typescript
const mutation = useMutation({
  mutationFn: (data) => api.post('/api/endpoint', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/endpoint"] });
  },
  onError: (error) => {
    toast({ title: "Error", description: error.message });
  }
});
```

**AFTER:**
```typescript
const mutation = useApiMutation(
  (data) => api.post('/api/endpoint', data),
  {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/endpoint"] });
    },
    // onError is optional - automatic toast shown by default
  }
);
```

#### 6. **Test the Component**

- [ ] Run in browser - component renders correctly
- [ ] Test success path - data loads and displays
- [ ] Test error path - network error shows toast
- [ ] Test loading state - skeleton/spinner appears
- [ ] Check console for errors

#### 7. **Update Tests (if applicable)**

```typescript
// Update test mocks to match new hook usage
const mockUseApiQuery = vi.fn();
vi.mock('@/hooks/api-hooks', () => ({
  useApiQuery: mockUseApiQuery,
}));
```

#### 8. **Code Review Checklist**

- [ ] Imports updated correctly
- [ ] Zod schemas defined for all responses
- [ ] Query keys match conventions
- [ ] Error handling preserved (or simplified appropriately)
- [ ] No `as any` type casting
- [ ] Loading states handled
- [ ] Tests updated

---

## Batch 1: Low-Risk Components

**Risk Level:** Low  
**Duration:** 4 hours  
**Components:** 8-10 simple, read-only components

### Components List

1. ✅ `client/src/pages/Home.tsx`
2. ✅ `client/src/pages/PublicPlans.tsx`
3. ✅ `client/src/pages/Auth.tsx`
4. ✅ `client/src/components/TestimonialsSection.tsx`
5. ✅ `client/src/components/BulkImportDialog.tsx`
6. ✅ `client/src/components/Footer.tsx`
7. ✅ `client/src/components/Header.tsx`
8. ✅ `client/src/pages/ConversionTest.tsx`

---

### Component: Home.tsx

**File:** `client/src/pages/Home.tsx`

**Complexity:** Simple (1 read-only query)

#### Migration Steps

- [ ] Update imports
- [ ] Define `UniversitySchema`
- [ ] Replace `useQuery` on line 50-52
- [ ] Remove type casting on line 55
- [ ] Test university list rendering

#### Before:
```typescript
const { data: apiResponse, isLoading: universitiesLoading } = useQuery({
  queryKey: ["/api/admin/universities"],
});

const universities = Array.isArray((apiResponse as any)?.data) 
  ? (apiResponse as any).data 
  : [];
```

#### After:
```typescript
const UniversitySchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  city: z.string(),
  worldRanking: z.number().optional(),
  specialization: z.string().optional(),
  description: z.string().optional(),
  website: z.string().optional(),
  offerLetterFee: z.number().optional(),
  annualFee: z.number().optional(),
});

const { data: universities = [], isLoading: universitiesLoading } = useApiQuery(
  ["/api/admin/universities"],
  '/api/admin/universities',
  z.array(UniversitySchema)
);
```

#### Testing:
- [ ] Homepage loads without errors
- [ ] Featured universities display correctly
- [ ] University cards show correct data (name, country, ranking, fees)
- [ ] Loading skeleton appears while fetching

---

### Component: PublicPlans.tsx

**File:** `client/src/pages/PublicPlans.tsx`

**Complexity:** Simple (1 read-only query)

#### Migration Steps

- [ ] Update imports
- [ ] Define `SubscriptionPlanSchema`
- [ ] Replace `useQuery` for plans
- [ ] Test plan cards rendering

#### Before:
```typescript
const { data: plans, isLoading } = useQuery({
  queryKey: ["/api/subscription-plans"],
  queryFn: () => api.get('/api/subscription-plans'),
});
```

#### After:
```typescript
const SubscriptionPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  billingPeriod: z.enum(['monthly', 'yearly']),
  features: z.array(z.string()),
  maxStudents: z.number().optional(),
  maxCounselors: z.number().optional(),
});

const { data: plans = [], isLoading } = useApiQuery(
  ["/api/subscription-plans"],
  '/api/subscription-plans',
  z.array(SubscriptionPlanSchema)
);
```

#### Testing:
- [ ] Plans page loads without errors
- [ ] All plan cards display correctly
- [ ] Pricing information accurate
- [ ] Features list renders properly

---

### Component: TestimonialsSection.tsx

**File:** `client/src/components/TestimonialsSection.tsx`

**Complexity:** Simple (1 read-only query)

#### Migration Steps

- [ ] Update imports
- [ ] Define `TestimonialSchema`
- [ ] Replace `useQuery` for testimonials
- [ ] Test testimonial display

#### Before:
```typescript
const { data: testimonials } = useQuery({
  queryKey: ["/api/testimonials"],
  queryFn: () => api.get('/api/testimonials'),
});
```

#### After:
```typescript
const TestimonialSchema = z.object({
  id: z.string(),
  studentName: z.string(),
  university: z.string(),
  content: z.string(),
  rating: z.number(),
  createdAt: z.string(),
});

const { data: testimonials = [] } = useApiQuery(
  ["/api/testimonials"],
  '/api/testimonials',
  z.array(TestimonialSchema)
);
```

#### Testing:
- [ ] Testimonials section renders
- [ ] Student names and universities display
- [ ] Ratings show correctly
- [ ] Testimonial content readable

---

### Batch 1 Completion Checklist

After migrating all Batch 1 components:

- [ ] All 8-10 components migrated
- [ ] No TypeScript errors: `npm run build`
- [ ] All tests passing: `npm run test`
- [ ] Manual testing completed for each component
- [ ] Git commit: `git commit -m "feat: migrate Batch 1 components to useApiQuery"`
- [ ] Code review requested
- [ ] QA sign-off received
- [ ] Merge to main: `git merge api-client-migration-batch1`

**Estimated Time:** 4 hours  
**Actual Time:** ______

---

## Batch 2: Admin Dashboard Components

**Risk Level:** Low-Medium  
**Duration:** 6 hours  
**Components:** 10-12 admin-only components

### Components List

1. ✅ `client/src/pages/AdminDashboard.tsx`
2. ✅ `client/src/components/admin/StaffInvitationManager.tsx`
3. ✅ `client/src/components/admin/CompanyProfileManagement.tsx`
4. ✅ `client/src/components/admin/SubscriptionManagement.tsx`
5. ✅ `client/src/components/BulkImportUniversities.tsx`
6. ✅ `client/src/components/UniversityExport.tsx`
7. ✅ `client/src/components/UniversityAnalytics.tsx`
8. ✅ `client/src/pages/AdminProfile.tsx`
9. ✅ `client/src/components/BulkImportDialog.tsx`
10. ✅ `client/src/components/admin/PasswordResetDialog.tsx`

---

### Component: AdminDashboard.tsx

**File:** `client/src/pages/AdminDashboard.tsx`

**Complexity:** Medium (Multiple queries and mutations)

#### Migration Steps

- [ ] Update imports
- [ ] Define schemas: `UniversitySchema`, `StudentSchema`, `StaffSchema`
- [ ] Replace all `useQuery` calls (universities, students, staff, analytics)
- [ ] Replace all `useMutation` calls (create, update, delete operations)
- [ ] Preserve custom error handling for critical operations
- [ ] Test all dashboard tabs

#### Before:
```typescript
// Universities query
const { data: universities, isLoading: universitiesLoading } = useQuery({
  queryKey: ["/api/admin/universities"],
  queryFn: () => api.get('/api/admin/universities'),
});

// Create university mutation
const createUniversity = useMutation({
  mutationFn: (data: any) => api.post('/api/admin/universities', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/universities"] });
    toast({ title: "Success", description: "University created" });
  },
  onError: (error: any) => {
    toast({ title: "Error", description: error.message, variant: "destructive" });
  }
});
```

#### After:
```typescript
const UniversitySchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  city: z.string(),
  worldRanking: z.number().optional(),
  website: z.string().optional(),
  specialization: z.string().optional(),
  offerLetterFee: z.number().optional(),
  annualFee: z.number().optional(),
});

// Universities query
const { data: universities = [], isLoading: universitiesLoading } = useApiQuery(
  ["/api/admin/universities"],
  '/api/admin/universities',
  z.array(UniversitySchema)
);

// Create university mutation
const createUniversity = useApiMutation(
  (data: any) => api.post('/api/admin/universities', data),
  {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/universities"] });
      toast({ title: "Success", description: "University created" });
    },
    // onError not needed - automatic error toast
  }
);
```

#### Testing:
- [ ] Admin dashboard loads all tabs
- [ ] Universities tab - list displays, create/edit/delete works
- [ ] Students tab - list displays, approve/reject works
- [ ] Staff tab - list displays, add/remove works
- [ ] Analytics tab - charts and stats render
- [ ] All mutations show success/error toasts
- [ ] Loading skeletons appear correctly

---

### Component: StaffInvitationManager.tsx

**File:** `client/src/components/admin/StaffInvitationManager.tsx`

**Complexity:** Medium (Query + mutation with form)

#### Migration Steps

- [ ] Update imports
- [ ] Define `StaffInvitationSchema`
- [ ] Replace `useQuery` for invitations list
- [ ] Replace `useMutation` for send invitation
- [ ] Test invitation flow

#### Before:
```typescript
const { data: invitations } = useQuery({
  queryKey: ["/api/admin/staff/invitations"],
  queryFn: () => api.get('/api/admin/staff/invitations'),
});

const sendInvitation = useMutation({
  mutationFn: (data) => api.post('/api/admin/staff/invite', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/staff/invitations"] });
  }
});
```

#### After:
```typescript
const StaffInvitationSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'counselor']),
  status: z.enum(['pending', 'accepted', 'expired']),
  expiresAt: z.string(),
  createdAt: z.string(),
});

const { data: invitations = [] } = useApiQuery(
  ["/api/admin/staff/invitations"],
  '/api/admin/staff/invitations',
  z.array(StaffInvitationSchema)
);

const sendInvitation = useApiMutation(
  (data) => api.post('/api/admin/staff/invite', data),
  {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff/invitations"] });
    }
  }
);
```

#### Testing:
- [ ] Invitations list loads
- [ ] Send invitation form works
- [ ] Success toast appears
- [ ] List refreshes after sending
- [ ] Pending/accepted/expired status display correctly

---

### Component: BulkImportUniversities.tsx

**File:** `client/src/components/BulkImportUniversities.tsx`

**Complexity:** Medium (File upload mutation)

#### Migration Steps

- [ ] Update imports
- [ ] Replace `useMutation` for file upload
- [ ] Handle FormData properly
- [ ] Test CSV upload

#### Before:
```typescript
const bulkImport = useMutation({
  mutationFn: (formData: FormData) => api.post('/api/admin/universities/bulk-import', formData),
  onSuccess: (data) => {
    toast({ title: "Import successful", description: `${data.count} universities imported` });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/universities"] });
  }
});
```

#### After:
```typescript
const BulkImportResponseSchema = z.object({
  count: z.number(),
  errors: z.array(z.string()).optional(),
});

const bulkImport = useApiMutation<typeof BulkImportResponseSchema, FormData>(
  (formData: FormData) => api.post('/api/admin/universities/bulk-import', formData),
  {
    onSuccess: (data) => {
      toast({ 
        title: "Import successful", 
        description: `${data.count} universities imported` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/universities"] });
    }
  }
);
```

#### Testing:
- [ ] File upload dialog opens
- [ ] CSV file upload works
- [ ] Success message shows count
- [ ] Universities list refreshes
- [ ] Error handling for invalid CSV

---

### Batch 2 Completion Checklist

After migrating all Batch 2 components:

- [ ] All 10-12 components migrated
- [ ] No TypeScript errors: `npm run build`
- [ ] All tests passing: `npm run test`
- [ ] Manual testing of admin dashboard
- [ ] All CRUD operations tested
- [ ] Git commit: `git commit -m "feat: migrate Batch 2 admin components to useApiQuery/useApiMutation"`
- [ ] Code review requested
- [ ] QA sign-off received
- [ ] Merge to main: `git merge api-client-migration-batch2`

**Estimated Time:** 6 hours  
**Actual Time:** ______

---

## Batch 3: Student/Counselor Components

**Risk Level:** Medium  
**Duration:** 8 hours  
**Components:** 15-20 core functionality components

### Components List

1. ✅ `client/src/pages/Dashboard.tsx`
2. ✅ `client/src/pages/StudentDashboard.tsx`
3. ✅ `client/src/pages/TeamDashboard.tsx`
4. ✅ `client/src/pages/Applications.tsx`
5. ✅ `client/src/pages/Documents.tsx`
6. ✅ `client/src/pages/Universities.tsx`
7. ✅ `client/src/pages/Profile.tsx`
8. ✅ `client/src/pages/StudentProfileDetail.tsx`
9. ✅ `client/src/pages/CounselorProfile.tsx`
10. ✅ `client/src/pages/CompanyProfile.tsx`
11. ✅ `client/src/components/DocumentUploadSection.tsx`
12. ✅ `client/src/components/counselor/DocumentUploadSection.tsx`
13. ✅ `client/src/components/UniversityShortlistModule.tsx`
14. ✅ `client/src/components/counselor/UniversityShortlistModule.tsx`
15. ✅ `client/src/components/AssignedStudentsOverview.tsx`
16. ✅ `client/src/components/counselor/AssignedStudentsOverview.tsx`
17. ✅ `client/src/components/StudentStatusTimeline.tsx`
18. ✅ `client/src/components/NotificationCenter.tsx`
19. ✅ `client/src/components/counselor/NotificationCenter.tsx`
20. ✅ `client/src/components/FollowUpTabs.tsx`

---

### Component: StudentDashboard.tsx

**File:** `client/src/pages/StudentDashboard.tsx`

**Complexity:** Medium-High (Multiple queries, real-time data)

#### Migration Steps

- [ ] Update imports
- [ ] Define schemas: `StudentProfileSchema`, `ApplicationSchema`, `UniversityShortlistSchema`
- [ ] Replace student profile query
- [ ] Replace applications query
- [ ] Replace shortlist query
- [ ] Replace update profile mutation
- [ ] Test dashboard overview

#### Before:
```typescript
const { data: profile } = useQuery({
  queryKey: ["/api/student/profile"],
  queryFn: () => api.get('/api/student/profile'),
});

const { data: applications } = useQuery({
  queryKey: ["/api/applications"],
  queryFn: () => api.get('/api/applications'),
  enabled: !!profile,
});

const updateProfile = useMutation({
  mutationFn: (data) => api.patch('/api/student/profile', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/student/profile"] });
  }
});
```

#### After:
```typescript
const StudentProfileSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phoneNumber: z.string().optional(),
  gpa: z.number().optional(),
  testScores: z.object({
    ielts: z.number().optional(),
    toefl: z.number().optional(),
    gmat: z.number().optional(),
  }).optional(),
});

const ApplicationSchema = z.object({
  id: z.string(),
  universityId: z.string(),
  universityName: z.string(),
  status: z.enum(['pending', 'submitted', 'accepted', 'rejected']),
  submittedAt: z.string().optional(),
  createdAt: z.string(),
});

const { data: profile } = useApiQuery(
  ["/api/student/profile"],
  '/api/student/profile',
  StudentProfileSchema
);

const { data: applications = [] } = useApiQuery(
  ["/api/applications"],
  '/api/applications',
  z.array(ApplicationSchema),
  { enabled: !!profile }
);

const updateProfile = useApiMutation(
  (data) => api.patch('/api/student/profile', data),
  {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/profile"] });
    }
  }
);
```

#### Testing:
- [ ] Dashboard loads student profile
- [ ] Applications list displays correctly
- [ ] Status badges show accurate states
- [ ] Profile update works
- [ ] Real-time updates reflect (if applicable)

---

### Component: Documents.tsx

**File:** `client/src/pages/Documents.tsx`

**Complexity:** Medium (File upload + list)

#### Migration Steps

- [ ] Update imports
- [ ] Define `DocumentSchema`
- [ ] Replace documents query
- [ ] Replace upload mutation
- [ ] Replace delete mutation
- [ ] Test file upload and download

#### Before:
```typescript
const { data: documents } = useQuery({
  queryKey: ["/api/documents"],
  queryFn: () => api.get('/api/documents'),
});

const uploadDocument = useMutation({
  mutationFn: (formData: FormData) => api.post('/api/documents/upload', formData),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
  }
});

const deleteDocument = useMutation({
  mutationFn: (id: string) => api.delete(`/api/documents/${id}`),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
  }
});
```

#### After:
```typescript
const DocumentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  category: z.string(),
  size: z.number(),
  uploadedAt: z.string(),
  url: z.string(),
});

const { data: documents = [] } = useApiQuery(
  ["/api/documents"],
  '/api/documents',
  z.array(DocumentSchema)
);

const uploadDocument = useApiMutation(
  (formData: FormData) => api.post('/api/documents/upload', formData),
  {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    }
  }
);

const deleteDocument = useApiMutation(
  (id: string) => api.delete(`/api/documents/${id}`),
  {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    }
  }
);
```

#### Testing:
- [ ] Documents list loads
- [ ] Upload form works
- [ ] File upload shows progress
- [ ] Delete confirmation works
- [ ] Download document works

---

### Component: NotificationCenter.tsx

**File:** `client/src/components/NotificationCenter.tsx`

**Complexity:** Medium (Polling query + mark as read mutation)

#### Migration Steps

- [ ] Update imports
- [ ] Define `NotificationSchema`
- [ ] Replace notifications query with polling
- [ ] Replace mark as read mutation
- [ ] Test real-time notification updates

#### Before:
```typescript
const { data: notifications } = useQuery({
  queryKey: ["/api/notifications"],
  queryFn: () => api.get('/api/notifications'),
  refetchInterval: 15000,  // Poll every 15 seconds
});

const markAsRead = useMutation({
  mutationFn: (id: string) => api.patch(`/api/notifications/${id}/read`),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
  }
});
```

#### After:
```typescript
const NotificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  isRead: z.boolean(),
  createdAt: z.string(),
});

const { data: notifications = [] } = useApiQuery(
  ["/api/notifications"],
  '/api/notifications',
  z.array(NotificationSchema),
  {
    refetchInterval: 15000,  // Poll every 15 seconds
    staleTime: 0,            // Always fetch fresh
  }
);

const markAsRead = useApiMutation(
  (id: string) => api.patch(`/api/notifications/${id}/read`),
  {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    }
  }
);
```

#### Testing:
- [ ] Notifications load
- [ ] Polling works (updates every 15s)
- [ ] Mark as read works
- [ ] Badge count updates
- [ ] Unread notifications highlighted

---

### Batch 3 Completion Checklist

After migrating all Batch 3 components:

- [ ] All 15-20 components migrated
- [ ] No TypeScript errors: `npm run build`
- [ ] All tests passing: `npm run test`
- [ ] Student dashboard fully tested
- [ ] Counselor dashboard fully tested
- [ ] Document upload/download tested
- [ ] Notifications tested (polling + mark as read)
- [ ] Git commit: `git commit -m "feat: migrate Batch 3 student/counselor components"`
- [ ] Code review requested
- [ ] QA sign-off received
- [ ] Merge to main: `git merge api-client-migration-batch3`

**Estimated Time:** 8 hours  
**Actual Time:** ______

---

## Batch 4: Complex Components

**Risk Level:** High  
**Duration:** 6 hours  
**Components:** 8-10 complex components with many queries/mutations

### Components List

1. ✅ `client/src/pages/Community.tsx` (MOST COMPLEX)
2. ✅ `client/src/pages/StudentChat.tsx`
3. ✅ `client/src/hooks/useNotifications.ts`
4. ✅ `client/src/hooks/useAuth.tsx`
5. ✅ `client/src/hooks/usePollVoteStatus.ts`
6. ✅ `client/src/pages/CompanyDashboard.tsx`
7. ✅ `client/src/pages/SubscriptionPlans.tsx`
8. ✅ `client/src/components/profile/PersonalInfoForm.tsx`

---

### Component: Community.tsx (MOST COMPLEX)

**File:** `client/src/pages/Community.tsx`

**Complexity:** Very High (40+ queries and mutations)

#### Migration Steps

- [ ] Update imports
- [ ] Define schemas: `ForumPostSchema`, `ForumCommentSchema`, `PollSchema`
- [ ] Replace ALL `useQuery` calls (posts, comments, polls, saved, user votes)
- [ ] Replace ALL `useMutation` calls (create post, like, comment, vote, report)
- [ ] Handle optimistic updates for likes and votes
- [ ] Test all forum features
- [ ] **CRITICAL:** Thorough testing required

#### Before (Example - there are 40+ similar):
```typescript
// Posts query
const { data: posts } = useQuery({
  queryKey: ['/api/forum/posts', activeCategory, sortBy],
  queryFn: async () => {
    const response = await api.get(
      `/api/forum/posts?category=${activeCategory}&sort=${sortBy}`
    );
    return response;
  },
  enabled: !!user,
});

// Like mutation with optimistic update
const likePost = useMutation({
  mutationFn: (postId: string) => api.post(`/api/forum/posts/${postId}/like`),
  onMutate: async (postId) => {
    await queryClient.cancelQueries({ queryKey: ['posts'] });
    const previousPosts = queryClient.getQueryData(['posts']);
    queryClient.setQueryData(['posts'], (old: any) => 
      old?.map((post: any) =>
        post.id === postId
          ? { ...post, likesCount: post.likesCount + 1, isLiked: true }
          : post
      )
    );
    return { previousPosts };
  },
  onError: (err, postId, context) => {
    queryClient.setQueryData(['posts'], context?.previousPosts);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  },
});
```

#### After:
```typescript
const ForumPostSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  title: z.string(),
  content: z.string(),
  category: z.string(),
  tags: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  pollOptions: z.array(z.object({
    id: z.string(),
    text: z.string(),
    votes: z.number(),
    percentage: z.number(),
  })).optional(),
  pollQuestion: z.string().optional(),
  likesCount: z.number(),
  commentsCount: z.number(),
  viewsCount: z.number(),
  isPinned: z.boolean().optional(),
  isLiked: z.boolean().optional(),
  isSaved: z.boolean().optional(),
  createdAt: z.string(),
  user: z.object({
    firstName: z.string(),
    lastName: z.string(),
    profilePicture: z.string().optional(),
    email: z.string(),
    subscriptionTier: z.string().optional(),
    userType: z.string().optional(),
    companyName: z.string().optional(),
  }).optional(),
});

// Posts query
const { data: posts = [] } = useApiQuery(
  ['/api/forum/posts', activeCategory, sortBy],
  `/api/forum/posts?category=${activeCategory}&sort=${sortBy}`,
  z.array(ForumPostSchema),
  { enabled: !!user }
);

// Like mutation with optimistic update
const likePost = useApiMutation(
  (postId: string) => api.post(`/api/forum/posts/${postId}/like`),
  {
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      const previousPosts = queryClient.getQueryData(['posts']);
      queryClient.setQueryData(['posts'], (old: any) => 
        old?.map((post: any) =>
          post.id === postId
            ? { ...post, likesCount: post.likesCount + 1, isLiked: true }
            : post
        )
      );
      return { previousPosts };
    },
    onError: (err, postId, context) => {
      queryClient.setQueryData(['posts'], context?.previousPosts);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  }
);
```

#### Testing (CRITICAL):
- [ ] Posts load with filters (category, sort)
- [ ] Create post works (text, images, polls)
- [ ] Like/unlike works with optimistic update
- [ ] Comment works
- [ ] Reply to comment works
- [ ] Poll voting works
- [ ] Save/unsave post works
- [ ] Report post works
- [ ] Edit post works
- [ ] Delete post works
- [ ] Pin/unpin works (admin)
- [ ] All optimistic updates rollback on error
- [ ] WebSocket updates work
- [ ] Mobile view works
- [ ] Image lightbox works
- [ ] Emoji picker works

**NOTE:** Community.tsx requires the most careful migration due to:
- 40+ API calls
- Complex optimistic updates
- Real-time WebSocket integration
- Mobile-specific components

---

### Component: StudentChat.tsx

**File:** `client/src/pages/StudentChat.tsx`

**Complexity:** High (Real-time chat with WebSocket)

#### Migration Steps

- [ ] Update imports
- [ ] Define `ChatMessageSchema`, `ChatConversationSchema`
- [ ] Replace conversations query
- [ ] Replace messages query
- [ ] Replace send message mutation
- [ ] Test WebSocket integration
- [ ] Test message loading and sending

#### Testing:
- [ ] Conversations list loads
- [ ] Messages display for selected conversation
- [ ] Send message works
- [ ] Real-time messages appear via WebSocket
- [ ] Typing indicators work
- [ ] Unread count updates

---

### Batch 4 Completion Checklist

After migrating all Batch 4 components:

- [ ] All 8-10 components migrated
- [ ] **Community.tsx thoroughly tested** (all features)
- [ ] Chat functionality tested (real-time)
- [ ] No TypeScript errors: `npm run build`
- [ ] All tests passing: `npm run test`
- [ ] Full regression testing completed
- [ ] Performance testing (no slowdowns)
- [ ] Git commit: `git commit -m "feat: migrate Batch 4 complex components"`
- [ ] Code review requested (senior dev)
- [ ] QA sign-off received
- [ ] Merge to main: `git merge api-client-migration-batch4`

**Estimated Time:** 6 hours  
**Actual Time:** ______

---

## Testing Checklist

### Automated Testing

```bash
# Run TypeScript compiler
npm run build

# Run all tests
npm run test

# Run tests with coverage
npm run test -- --coverage
```

**Coverage Targets:**
- `client/src/hooks/api-hooks.ts`: >90%
- Migrated components: >80%

### Manual Testing

#### For Each Component:

**Functionality:**
- [ ] Component renders without errors
- [ ] Data loads correctly
- [ ] Loading states appear
- [ ] Empty states display (if applicable)

**Success Paths:**
- [ ] Primary actions work (create, update, delete)
- [ ] Data refreshes after mutations
- [ ] Success toasts appear

**Error Paths:**
- [ ] Network error → Error toast appears
- [ ] 401 Unauthorized → Handled appropriately
- [ ] 422 Validation → Field errors shown
- [ ] 500 Server error → Error message shown

**Edge Cases:**
- [ ] No data → Empty state
- [ ] Pagination → All pages load
- [ ] Filters → Results update correctly

### Regression Testing

#### Critical User Flows:

**Student Flow:**
- [ ] Register → Login → Dashboard
- [ ] Browse universities → Add to shortlist
- [ ] Upload documents → Submit application
- [ ] View application status

**Counselor Flow:**
- [ ] Login → Dashboard
- [ ] View assigned students
- [ ] Add follow-up note
- [ ] Upload student document

**Admin Flow:**
- [ ] Login → Admin dashboard
- [ ] Create university → Edit → Delete
- [ ] Approve student → Assign counselor
- [ ] Bulk import universities

**Community Flow:**
- [ ] Browse posts → Like → Comment
- [ ] Create post with images
- [ ] Create poll → Vote
- [ ] Save post → View saved

---

## Troubleshooting

### Common Issues

#### 1. TypeScript Error: "Type 'X' is not assignable to type 'Y'"

**Cause:** Zod schema doesn't match actual API response

**Solution:**
```typescript
// Check actual API response in browser DevTools Network tab
// Update Zod schema to match exact structure
// Use .optional() for nullable fields
// Use .nullable() for explicitly null fields
```

#### 2. Error: "Cannot read property 'map' of undefined"

**Cause:** Not providing default value for query data

**Solution:**
```typescript
// ❌ BAD
const { data } = useApiQuery(...);
data.map(...)  // Crashes if data is undefined

// ✅ GOOD
const { data = [] } = useApiQuery(...);
data.map(...)  // Safe - defaults to empty array
```

#### 3. Mutation Not Refreshing Data

**Cause:** Missing `invalidateQueries` in `onSuccess`

**Solution:**
```typescript
const mutation = useApiMutation(
  (data) => api.post(...),
  {
    onSuccess: () => {
      // Add this to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/..."] });
    }
  }
);
```

#### 4. Validation Error in Production

**Cause:** API response structure changed but schema not updated

**Solution:**
```typescript
// Enable schema validation logging in development
if (import.meta.env.DEV) {
  console.log('Validating response:', data);
}

// Update schema to match current API structure
// Or make fields optional if they may be missing
```

#### 5. Infinite Loop / Too Many Requests

**Cause:** Query dependency causing re-fetches

**Solution:**
```typescript
// ❌ BAD - rerenders cause refetch
const { data } = useApiQuery(
  ["/api/posts", sortBy],  // sortBy changes frequently
  ...
);

// ✅ GOOD - stabilize dependencies
const { data } = useApiQuery(
  ["/api/posts", sortBy],
  ...,
  { staleTime: 60000 }  // Only refetch after 1 minute
);
```

---

## Migration Complete! 🎉

Once all 4 batches are complete:

### Final Verification

- [ ] All 50+ components migrated
- [ ] Zero TypeScript errors
- [ ] All tests passing
- [ ] Full regression testing complete
- [ ] Performance metrics acceptable
- [ ] No console errors in production build
- [ ] Documentation updated

### Cleanup

- [ ] Remove old commented-out code
- [ ] Update code review guidelines
- [ ] Archive this checklist
- [ ] Celebrate with team! 🎊

### Next Steps

- [ ] Monitor error rates post-deployment
- [ ] Gather developer feedback
- [ ] Plan Phase 4: Optimization (query key constants, strict mode)
- [ ] Update onboarding docs for new developers

---

## Support

**Questions?** Contact:
- Technical Lead: [Name]
- Slack Channel: #api-client-migration

**Resources:**
- [API Client Standard](./API_CLIENT_STANDARD.md)
- [API Client Remediation Plan](./API_CLIENT_REMEDIATION_PLAN.md)
- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)
