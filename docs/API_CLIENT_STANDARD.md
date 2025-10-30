# API Client Standardization Guide
## EduPath Application - Official Standard

**Version:** 1.0  
**Date:** October 20, 2025  
**Status:** Approved for Implementation  
**Related Documents:**
- [API Client Remediation Plan](./API_CLIENT_REMEDIATION_PLAN.md)
- [API Client Migration Checklist](./API_CLIENT_MIGRATION_CHECKLIST.md)
- [API Client Usage Guide](./API_CLIENT_USAGE_GUIDE.md)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Standardized Pattern Decision](#standardized-pattern-decision)
3. [Core Hooks](#core-hooks)
4. [Migration Examples](#migration-examples)
5. [Special Cases](#special-cases)
6. [Error Handling](#error-handling)
7. [Query Key Naming Conventions](#query-key-naming-conventions)
8. [Best Practices](#best-practices)
9. [Stakeholder Review](#stakeholder-review)

---

## Executive Summary

This document establishes the **official standard** for all API client interactions in the EduPath application. After careful evaluation, we have chosen to standardize on **`useApiQuery`** and **`useApiMutation`** hooks as the exclusive pattern for all API calls.

### Key Benefits:
- ✅ Type-safe API calls with Zod schema validation
- ✅ Centralized error handling with consistent user feedback
- ✅ Built-in retry logic for transient failures
- ✅ Reduced code duplication across 50+ components
- ✅ Easier maintenance and debugging
- ✅ Foundation for future enhancements (logging, metrics, caching)

### Migration Scope:
- **50+ components** to be migrated
- **~500-800 lines** of code affected
- **Zero breaking changes** (behavior remains identical)
- **4 batches** for incremental, low-risk rollout

---

## Standardized Pattern Decision

### Chosen Pattern: `useApiQuery` / `useApiMutation`

After evaluation of multiple approaches, we have officially adopted the **`useApiQuery`** and **`useApiMutation`** hooks as our standard pattern for all API interactions.

### Rationale

#### 1. Already Implemented
The hooks are already implemented in `client/src/hooks/api-hooks.ts` (currently commented out, awaiting adoption).

#### 2. Type-Safe with Zod Validation
```typescript
// Response schema validation ensures type safety
const UniversitySchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  city: z.string(),
  worldRanking: z.number().optional(),
});

const { data } = useApiQuery(
  ["/api/admin/universities"],
  '/api/admin/universities',
  z.array(UniversitySchema)  // ← Validates response at runtime
);
// data is now typed as Array<{id: string, name: string, ...}>
```

#### 3. Centralized Error Handling
```typescript
// Default error handling with toast notifications
const mutation = useApiMutation(
  (data) => api.post('/api/forum/posts', data)
);
// No manual error handling needed - automatic toast on errors!
```

#### 4. Built-in Retry Logic
```typescript
// Smart retry logic:
// - Doesn't retry auth errors (401)
// - Doesn't retry validation errors (422)
// - Retries server errors (5xx) up to 3 times
// - Exponential backoff: 1s → 2s → 4s
```

#### 5. Cleaner, More Maintainable Code
```typescript
// BEFORE: 10 lines of boilerplate
const { data } = useQuery({
  queryKey: ["/api/admin/universities"],
  queryFn: () => api.get('/api/admin/universities'),
  retry: (failureCount, error) => {
    if (error.status === 401) return false;
    if (error.status === 422) return false;
    return failureCount < 3;
  },
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});

// AFTER: 3 lines, same functionality
const { data } = useApiQuery(
  ["/api/admin/universities"],
  '/api/admin/universities'
);
```

#### 6. Foundation for Global Behaviors
The standardized hooks provide a single point of integration for:
- **Logging**: Automatic request/response logging
- **Metrics**: Track API performance and errors
- **Caching**: Centralized cache policies
- **Authentication**: Auto-refresh tokens
- **Testing**: Easier to mock and test

### Alternative Considered

**Direct `useQuery`/`useMutation` imports** - Rejected because:
- ❌ Requires repetitive boilerplate in every component
- ❌ Inconsistent error handling across the codebase
- ❌ No centralized retry logic
- ❌ Harder to add global behaviors later
- ❌ More difficult to maintain and debug

---

## Core Hooks

### `useApiQuery` - For GET Requests

```typescript
function useApiQuery<T>(
  queryKey: (string | number | boolean)[],
  url: string,
  responseSchema?: z.ZodSchema<T>,
  options?: Omit<UseQueryOptions<T, ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<T, ApiError>
```

**Parameters:**
- `queryKey`: Array identifying the query (for caching/invalidation)
- `url`: API endpoint URL
- `responseSchema`: Optional Zod schema for response validation
- `options`: Additional React Query options

**Returns:** Standard React Query result object with:
- `data`: Validated response data (typed)
- `isLoading`: Loading state
- `error`: ApiError instance (if failed)
- `refetch`: Manual refetch function
- All other React Query properties

**Example:**
```typescript
import { useApiQuery } from "@/hooks/api-hooks";
import { z } from "zod";

const UniversitySchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  city: z.string(),
});

function UniversitiesList() {
  const { data, isLoading, error } = useApiQuery(
    ["/api/admin/universities"],
    '/api/admin/universities',
    z.array(UniversitySchema)
  );

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <ul>
      {data.map(uni => (
        <li key={uni.id}>{uni.name} - {uni.country}</li>
      ))}
    </ul>
  );
}
```

### `useApiMutation` - For POST/PUT/PATCH/DELETE

```typescript
function useApiMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, ApiError, TVariables>
): UseMutationResult<TData, ApiError, TVariables>
```

**Parameters:**
- `mutationFn`: Async function performing the mutation
- `options`: React Query mutation options

**Returns:** Standard React Query mutation result with:
- `mutate`: Trigger mutation (fire and forget)
- `mutateAsync`: Trigger mutation (returns promise)
- `isLoading`: Mutation loading state
- `error`: ApiError instance (if failed)
- All other React Query mutation properties

**Example:**
```typescript
import { useApiMutation } from "@/hooks/api-hooks";
import { api } from "@/lib/api-client";

function CreatePostButton() {
  const queryClient = useQueryClient();
  
  const createPost = useApiMutation(
    (data: { title: string; content: string }) => 
      api.post('/api/forum/posts', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/forum/posts"] });
        toast({ title: "Post created successfully!" });
      }
    }
  );

  const handleSubmit = () => {
    createPost.mutate({
      title: "My First Post",
      content: "Hello world!"
    });
  };

  return (
    <Button onClick={handleSubmit} disabled={createPost.isLoading}>
      {createPost.isLoading ? "Creating..." : "Create Post"}
    </Button>
  );
}
```

### `usePaginatedApiQuery` - For Paginated Data

```typescript
function usePaginatedApiQuery<T>(
  baseQueryKey: string[],
  baseUrl: string,
  page: number,
  pageSize: number,
  responseSchema?: z.ZodSchema<T>,
  options?: Omit<UseQueryOptions<T, ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<T, ApiError>
```

**Example:**
```typescript
const { data } = usePaginatedApiQuery(
  ["universities"],
  "/api/admin/universities",
  currentPage,
  20,  // 20 per page
  PaginatedUniversitiesSchema
);
```

---

## Migration Examples

### Example 1: Simple Query (Home.tsx)

**BEFORE:**
```typescript
// client/src/pages/Home.tsx (lines 50-52)
import { useQuery } from "@tanstack/react-query";

const { data: apiResponse, isLoading: universitiesLoading } = useQuery({
  queryKey: ["/api/admin/universities"],
  // Uses default query function
});

const universities = Array.isArray((apiResponse as any)?.data) 
  ? (apiResponse as any).data 
  : [];
```

**AFTER:**
```typescript
import { useApiQuery } from "@/hooks/api-hooks";
import { z } from "zod";

const UniversitySchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  city: z.string(),
  worldRanking: z.number().optional(),
  specialization: z.string().optional(),
});

const { data: universities = [], isLoading: universitiesLoading } = useApiQuery(
  ["/api/admin/universities"],
  '/api/admin/universities',
  z.array(UniversitySchema)
);
// No more type casting! 'universities' is properly typed
```

**Benefits:**
- ✅ Type-safe (no `as any` casting)
- ✅ Runtime validation with Zod
- ✅ Automatic error handling
- ✅ Cleaner code

---

### Example 2: Complex Query with Options (Community.tsx)

**BEFORE:**
```typescript
// client/src/pages/Community.tsx
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

const { data: posts, isLoading, refetch } = useQuery({
  queryKey: ['/api/forum/posts', activeCategory, sortBy],
  queryFn: async () => {
    const response = await api.get(
      `/api/forum/posts?category=${activeCategory}&sort=${sortBy}`
    );
    return response;
  },
  enabled: !!user,
  staleTime: 30000,
});
```

**AFTER:**
```typescript
import { useApiQuery } from "@/hooks/api-hooks";
import { z } from "zod";

const ForumPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  category: z.string(),
  likesCount: z.number(),
  commentsCount: z.number(),
  createdAt: z.string(),
});

const { data: posts = [], isLoading, refetch } = useApiQuery(
  ['/api/forum/posts', activeCategory, sortBy],
  `/api/forum/posts?category=${activeCategory}&sort=${sortBy}`,
  z.array(ForumPostSchema),
  {
    enabled: !!user,
    staleTime: 30000,
  }
);
```

**Benefits:**
- ✅ Type-safe post data
- ✅ Validation ensures data integrity
- ✅ All query options still available

---

### Example 3: Mutation with Cache Invalidation (AdminDashboard.tsx)

**BEFORE:**
```typescript
// client/src/pages/AdminDashboard.tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

const queryClient = useQueryClient();
const { toast } = useToast();

const createUniversity = useMutation({
  mutationFn: (data: any) => api.post('/api/admin/universities', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/universities"] });
    toast({
      title: "Success",
      description: "University created successfully"
    });
    setIsCreateDialogOpen(false);
  },
  onError: (error: any) => {
    toast({
      title: "Error",
      description: error.message || "Failed to create university",
      variant: "destructive"
    });
  }
});
```

**AFTER:**
```typescript
import { useApiMutation } from "@/hooks/api-hooks";
import { api } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const queryClient = useQueryClient();
const { toast } = useToast();

const createUniversity = useApiMutation(
  (data: any) => api.post('/api/admin/universities', data),
  {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/universities"] });
      toast({
        title: "Success",
        description: "University created successfully"
      });
      setIsCreateDialogOpen(false);
    },
    // onError is optional - default error toast is shown automatically
    // Only add custom onError if you need special behavior
  }
);
```

**Benefits:**
- ✅ Automatic error toast (no manual onError needed in most cases)
- ✅ Cleaner success handling
- ✅ Can still add custom error handling when needed

---

### Example 4: Dependent Query

**BEFORE:**
```typescript
const { data: student } = useQuery({
  queryKey: ["students", studentId],
  queryFn: () => api.get(`/api/students/${studentId}`),
  enabled: !!studentId,
});

const { data: applications } = useQuery({
  queryKey: ["applications", studentId],
  queryFn: () => api.get(`/api/applications?studentId=${studentId}`),
  enabled: !!student && !!studentId,
});
```

**AFTER:**
```typescript
const { data: student } = useApiQuery(
  ["students", studentId],
  `/api/students/${studentId}`,
  StudentSchema,
  { enabled: !!studentId }
);

const { data: applications = [] } = useApiQuery(
  ["applications", studentId],
  `/api/applications?studentId=${studentId}`,
  z.array(ApplicationSchema),
  { enabled: !!student && !!studentId }
);
```

---

## Special Cases

### 1. Pagination

For paginated endpoints, use the `usePaginatedApiQuery` hook:

```typescript
import { usePaginatedApiQuery } from "@/hooks/api-hooks";

function UniversitiesPaginated() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = usePaginatedApiQuery(
    ["universities"],
    "/api/admin/universities",
    page,
    pageSize,
    PaginatedUniversitiesSchema
  );

  return (
    <div>
      {data?.items.map(uni => <UniversityCard key={uni.id} {...uni} />)}
      
      <Pagination
        currentPage={page}
        totalPages={data?.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
```

**Schema for Paginated Response:**
```typescript
const PaginatedUniversitiesSchema = z.object({
  items: z.array(UniversitySchema),
  totalItems: z.number(),
  totalPages: z.number(),
  currentPage: z.number(),
  pageSize: z.number(),
});
```

---

### 2. Polling / Auto-Refresh

For real-time data (notifications, chat messages), use `refetchInterval`:

```typescript
const { data: notifications = [] } = useApiQuery(
  ["/api/notifications"],
  '/api/notifications',
  z.array(NotificationSchema),
  {
    refetchInterval: 15000,  // Poll every 15 seconds
    staleTime: 0,            // Always fetch fresh
  }
);
```

**Best Practices:**
- Use `refetchInterval` for data that changes frequently
- Set `staleTime: 0` to always fetch fresh data
- Consider WebSocket for real-time updates (more efficient than polling)

---

### 3. Optimistic Updates

For instant UI feedback (likes, votes, saves):

```typescript
const likePost = useApiMutation(
  (postId: string) => api.post(`/api/forum/posts/${postId}/like`),
  {
    onMutate: async (postId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['posts'] });
      
      // Snapshot previous value
      const previousPosts = queryClient.getQueryData(['posts']);
      
      // Optimistically update
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
      // Rollback on error
      queryClient.setQueryData(['posts'], context?.previousPosts);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  }
);
```

**When to Use:**
- Like/unlike actions
- Poll voting
- Bookmark/save actions
- Any action where instant feedback improves UX

---

### 4. File Uploads

For file uploads with `FormData`:

```typescript
const uploadDocument = useApiMutation(
  (formData: FormData) => api.post('/api/documents/upload', formData),
  {
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document uploaded successfully!" });
    }
  }
);

const handleFileUpload = (file: File) => {
  const formData = new FormData();
  formData.append('document', file);
  formData.append('category', 'transcript');
  
  uploadDocument.mutate(formData);
};
```

**Note:** The `api.post` function automatically handles FormData (no `Content-Type` header needed).

---

### 5. Dependent Mutations (Chain Mutations)

For operations that require sequential mutations:

```typescript
const createUniversity = useApiMutation(
  (data: any) => api.post('/api/admin/universities', data)
);

const uploadLogo = useApiMutation(
  ({ universityId, logo }: { universityId: string; logo: File }) => {
    const formData = new FormData();
    formData.append('logo', logo);
    return api.post(`/api/admin/universities/${universityId}/logo`, formData);
  }
);

const handleCreateWithLogo = async (data: any, logo: File) => {
  try {
    // Step 1: Create university
    const university = await createUniversity.mutateAsync(data);
    
    // Step 2: Upload logo
    await uploadLogo.mutateAsync({
      universityId: university.id,
      logo
    });
    
    toast({ title: "University created with logo!" });
  } catch (error) {
    toast({ 
      title: "Error", 
      description: error.message,
      variant: "destructive"
    });
  }
};
```

**Key Point:** Use `mutateAsync()` instead of `mutate()` when you need to chain operations.

---

## Error Handling

### Automatic Error Handling

The `useApiMutation` hook provides automatic error handling with toast notifications. You don't need to add `onError` for common cases:

```typescript
// ✅ GOOD: Automatic error toast
const mutation = useApiMutation(
  (data) => api.post('/api/endpoint', data)
);
// Errors automatically show toast notification
```

### Custom Error Handling

Add custom `onError` only when you need special behavior:

```typescript
// ✅ GOOD: Custom error handling when needed
const mutation = useApiMutation(
  (data) => api.post('/api/endpoint', data),
  {
    onError: (error) => {
      if (error.isAuthError()) {
        // Redirect to login
        navigate('/auth');
      } else {
        // Show custom error message
        toast({
          title: "Operation Failed",
          description: `Couldn't complete action: ${error.message}`,
          variant: "destructive"
        });
      }
    }
  }
);
```

### Error Types

The `ApiError` class provides helper methods:

```typescript
type ApiError = {
  code: string;           // Error code (e.g., 'AUTH_FAILED')
  message: string;        // Human-readable message
  status: number;         // HTTP status code
  details?: unknown;      // Additional error details
  field?: string;         // Field that caused validation error
  hint?: string;          // Helpful hint for resolution
  
  isAuthError(): boolean;        // Check if 401/auth error
  isValidationError(): boolean;  // Check if 422/validation error
};
```

**Example Usage:**
```typescript
const mutation = useApiMutation(
  (data) => api.post('/api/students', data),
  {
    onError: (error) => {
      if (error.isValidationError()) {
        // Show field-specific error
        setFieldError(error.field || 'general', error.message);
      } else if (error.isAuthError()) {
        // Redirect to login
        navigate('/auth');
      } else {
        // Generic error handling
        toast({
          title: "Error",
          description: error.hint || error.message,
          variant: "destructive"
        });
      }
    }
  }
);
```

### Retry Logic

Queries automatically retry with smart logic:

- ✅ **Retries:** Server errors (5xx) - up to 3 times
- ❌ **Doesn't Retry:** Auth errors (401)
- ❌ **Doesn't Retry:** Validation errors (422)
- ❌ **Doesn't Retry:** Client errors (4xx except 401)

**Retry Delay:** Exponential backoff
- 1st retry: 1 second
- 2nd retry: 2 seconds
- 3rd retry: 4 seconds
- Max: 30 seconds

**Override Retry Behavior:**
```typescript
const { data } = useApiQuery(
  ["/api/endpoint"],
  '/api/endpoint',
  ResponseSchema,
  {
    retry: false,  // Disable retry completely
  }
);
```

---

## Query Key Naming Conventions

### Basic Structure

Query keys should follow this structure:

```typescript
[resource, ...identifiers, ...filters]
```

**Examples:**
```typescript
// Simple resource
["/api/admin/universities"]

// Resource with ID
["/api/students", studentId]

// Resource with filters
["/api/forum/posts", { category: "academic", sort: "recent" }]

// Nested resource
["/api/forum/posts", postId, "comments"]

// Complex query
["/api/applications", { 
  studentId, 
  status: "pending",
  page: 1 
}]
```

### Query Key Constants (Recommended)

Create a centralized file for query keys:

**`client/src/lib/queryKeys.ts`**
```typescript
export const QUERY_KEYS = {
  auth: {
    me: () => ['/api/auth/me'] as const,
    csrfToken: () => ['/api/auth/csrf-token'] as const,
  },
  
  universities: {
    all: () => ['/api/admin/universities'] as const,
    detail: (id: string) => ['/api/admin/universities', id] as const,
    search: (query: string) => ['/api/universities/search', { query }] as const,
  },
  
  students: {
    all: () => ['/api/students'] as const,
    detail: (id: string) => ['/api/students', id] as const,
    applications: (id: string) => ['/api/students', id, 'applications'] as const,
  },
  
  forum: {
    posts: (filters?: object) => ['/api/forum/posts', filters] as const,
    post: (id: string) => ['/api/forum/posts', id] as const,
    comments: (postId: string) => ['/api/forum/posts', postId, 'comments'] as const,
  },
} as const;
```

**Usage:**
```typescript
import { QUERY_KEYS } from '@/lib/queryKeys';

// ✅ Type-safe, consistent, refactorable
const { data } = useApiQuery(
  QUERY_KEYS.universities.all(),
  '/api/admin/universities'
);
```

### Invalidation Patterns

**Invalidate all universities:**
```typescript
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.universities.all() });
```

**Invalidate specific university:**
```typescript
queryClient.invalidateQueries({ 
  queryKey: QUERY_KEYS.universities.detail(universityId) 
});
```

**Invalidate all student data:**
```typescript
queryClient.invalidateQueries({ queryKey: ['/api/students'] });
// Matches: ['/api/students'], ['/api/students', '123'], etc.
```

---

## Best Practices

### 1. Always Use Zod Schemas

```typescript
// ❌ BAD: No validation
const { data } = useApiQuery(
  ["/api/universities"],
  '/api/universities'
);

// ✅ GOOD: Runtime validation
const { data } = useApiQuery(
  ["/api/universities"],
  '/api/universities',
  z.array(UniversitySchema)
);
```

### 2. Provide Default Values

```typescript
// ✅ GOOD: Default to empty array to avoid undefined checks
const { data: universities = [] } = useApiQuery(
  ["/api/universities"],
  '/api/universities',
  z.array(UniversitySchema)
);

// Now you can safely use universities.map() without checking
```

### 3. Handle Loading States

```typescript
const { data, isLoading, error } = useApiQuery(...);

if (isLoading) return <LoadingSkeleton />;
if (error) return <ErrorMessage error={error} />;

return <DataDisplay data={data} />;
```

### 4. Use Query Client for Cache Management

```typescript
const queryClient = useQueryClient();

// Invalidate after mutation
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
}

// Set data manually (optimistic updates)
queryClient.setQueryData(["/api/posts"], newData);

// Get cached data
const cachedPosts = queryClient.getQueryData(["/api/posts"]);
```

### 5. Leverage React Query DevTools (Development)

```typescript
// In main.tsx or App.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### 6. Avoid Unnecessary Queries

```typescript
// ✅ GOOD: Only fetch when needed
const { data } = useApiQuery(
  ["student", studentId],
  `/api/students/${studentId}`,
  StudentSchema,
  { enabled: !!studentId }  // Only fetch when studentId exists
);
```

### 7. Use Appropriate Stale Times

```typescript
// Static data (rarely changes)
const { data: plans } = useApiQuery(
  ["/api/subscription-plans"],
  '/api/subscription-plans',
  PlansSchema,
  { staleTime: Infinity }  // Never goes stale
);

// Real-time data (frequently changes)
const { data: notifications } = useApiQuery(
  ["/api/notifications"],
  '/api/notifications',
  NotificationsSchema,
  { staleTime: 0 }  // Always fetch fresh
);
```

---

## Stakeholder Review

### What Needs Approval

This standardization plan requires stakeholder approval for:

1. **Pattern Adoption:** Official adoption of `useApiQuery`/`useApiMutation` as the exclusive standard
2. **Migration Timeline:** 2-3 day migration window affecting 50+ components
3. **Resource Allocation:** Developer time for migration and QA testing
4. **Risk Acceptance:** Acknowledgment of migration risks and mitigation strategy

### Benefits of Chosen Approach

#### For Development Team:
- **Reduced Cognitive Load:** One consistent pattern instead of multiple approaches
- **Faster Development:** Less boilerplate, more focus on features
- **Easier Onboarding:** New developers learn one pattern
- **Better Debugging:** Centralized error handling makes issues easier to track
- **Future-Proof:** Foundation for logging, metrics, and caching

#### For Business:
- **Reduced Technical Debt:** Eliminates inconsistent patterns
- **Faster Feature Delivery:** Less time on API boilerplate
- **Fewer Bugs:** Centralized error handling reduces edge cases
- **Easier Maintenance:** Simpler codebase = lower long-term costs
- **Scalability:** Pattern supports future growth

#### For Users:
- **Better Error Messages:** Consistent, user-friendly error feedback
- **More Reliable:** Built-in retry logic handles transient failures
- **Faster App:** Optimized caching and query management
- **No Disruption:** Zero breaking changes during migration

### Risks and Mitigation Strategies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Functional regressions in migrated components** | Medium | High | Incremental migration by batch; thorough testing after each batch; separate commits for easy rollback |
| **Breaking existing error handling** | Low | Medium | Preserve custom error handlers where needed; test all error scenarios |
| **Developer resistance to new pattern** | Low | Low | Provide comprehensive documentation; offer training sessions; demonstrate benefits |
| **Timeline delays** | Medium | Low | Buffer time in estimates; start with easiest batch to build momentum |
| **Hidden dependencies between components** | Low | Medium | Comprehensive grep search before migration; review with senior devs |

### Mitigation Details

#### 1. Incremental Migration
- **4 batches** from low-risk to high-risk components
- Separate git commit per batch for easy rollback
- Full QA testing after each batch before proceeding

#### 2. Comprehensive Testing
- Automated unit tests for hooks
- Integration tests for key user flows
- Manual QA for critical paths
- Error scenario testing (network failures, auth errors, validation errors)

#### 3. Monitoring & Rollback Plan
- Monitor error rates during migration
- Feature flags to toggle between old/new patterns if needed
- Quick rollback via `git revert` if critical issues arise

#### 4. Developer Support
- This standardization guide (comprehensive documentation)
- Migration checklist with step-by-step instructions
- Code review guidelines
- Slack channel for migration questions

### Timeline and Resource Estimates

#### Phase 2: Standardization (Current Phase)
- **Duration:** 2-4 hours
- **Resources:** 1 senior developer
- **Deliverables:** 
  - ✅ API Client Standard (this document)
  - ✅ Migration Checklist
  - ✅ Team approval

#### Phase 3: Migration
- **Duration:** 2-3 days
- **Resources:** 2-3 developers + 1 QA engineer
- **Breakdown:**
  - Batch 1 (Low-Risk): 4 hours
  - Batch 2 (Admin): 6 hours
  - Batch 3 (Student/Counselor): 8 hours
  - Batch 4 (Complex): 6 hours
  - QA Testing: 4 hours (parallel)

#### Total Effort
- **Development:** ~24 hours
- **QA:** ~4 hours
- **Total:** ~28 hours (~3.5 developer-days)

#### Cost-Benefit Analysis
- **One-time Investment:** ~3.5 developer-days
- **Ongoing Savings:** ~2 hours/week (less debugging, faster development)
- **ROI:** Break-even in ~3 weeks
- **Long-term Benefit:** Reduced technical debt, faster feature delivery

### Approval Checklist

- [ ] **Technical Lead:** Pattern decision approved
- [ ] **Product Manager:** Timeline and resource allocation approved
- [ ] **QA Lead:** Testing plan reviewed and approved
- [ ] **Development Team:** Migration approach reviewed and accepted
- [ ] **Engineering Manager:** Risk mitigation strategy approved

---

## Appendix

### Related Documentation
- [API Client Remediation Plan](./API_CLIENT_REMEDIATION_PLAN.md) - Full remediation roadmap
- [API Client Migration Checklist](./API_CLIENT_MIGRATION_CHECKLIST.md) - Step-by-step migration guide
- [API Client Usage Guide](./API_CLIENT_USAGE_GUIDE.md) - Current state documentation

### Support & Questions
- **Slack Channel:** #api-client-migration
- **Technical Lead:** [Your Tech Lead Name]
- **Migration Owner:** [Migration Owner Name]

### Version History
- **v1.0** (October 20, 2025): Initial standardization guide
