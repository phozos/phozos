# API Client Usage Guide

## Current State (Post-Phase 3 Cleanup)

The EduPath application uses React Query (@tanstack/react-query) for server state management.

### Available Patterns

#### Pattern 1: Default Query Function (Implicit)
Use when you have a simple GET request with standard error handling.

```typescript
const { data } = useQuery({
  queryKey: ["/api/admin/universities"],
  // No queryFn needed - uses defaultQueryFn
});
```

#### Pattern 2: Explicit Query Function
Use when you need custom options or non-GET methods.

```typescript
const { data } = useQuery({
  queryKey: ["/api/admin/universities"],
  queryFn: () => api.get('/api/admin/universities'),
  enabled: someCondition,
});
```

#### Pattern 3: Mutations
For POST/PUT/PATCH/DELETE operations:

```typescript
const mutation = useMutation({
  mutationFn: (data) => api.post('/api/endpoint', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/endpoint"] });
  },
});
```

### Query Key Conventions
- Always start with `/api` prefix
- Use array format: `["/api/resource", params]`
- Example: `["/api/users", { page: 1, limit: 10 }]`

### Error Handling
Errors are automatically wrapped in `ApiError` class with:
- `code`: Error code (e.g., 'AUTH_FAILED')
- `message`: Human-readable message
- `status`: HTTP status code
- `isAuthError()`: Check if 401/auth error
- `isValidationError()`: Check if 422/validation error

### Future Migration (Phase 3)
The application will migrate to standardized hooks:
- `useApiQuery` for GET requests
- `useApiMutation` for mutations
- These are currently NOT in use but will be adopted in Phase 3.
