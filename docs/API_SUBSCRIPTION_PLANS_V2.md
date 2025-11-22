# Subscription Plans API v2 - Versioning & Grandfathering

## Overview

Version 2 of the Subscription Plans API introduces proper plan versioning, grandfathering, and deprecation workflows to ensure backward compatibility and fair pricing for existing customers.

### Key Changes from v1

- ❌ **DEPRECATED**: `PUT /api/admin/subscription-plans/:id` for price changes
- ✅ **NEW**: `POST /api/admin/subscription-plans/:basePlanId/price` for price updates
- ✅ **NEW**: `GET /api/admin/subscription-plans/:basePlanId/versions/history` for version history
- ✅ **NEW**: `POST /api/admin/subscription-plans/:id/deprecate` for plan deprecation
- ✅ **NEW**: `POST /api/admin/subscription-plans/:id/archive` for plan archival
- ✅ **ENHANCED**: `POST /api/admin/subscription-plans/:basePlanId/versions` with enriched response

## Endpoints

### 1. Update Plan Price

Creates a new plan version with updated pricing while preserving existing subscriber terms.

**Endpoint:** `POST /api/admin/subscription-plans/:basePlanId/price`

**Authentication:** Required (Admin only)

**CSRF Protection:** Required

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

**Request Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `newPrice` | number | Yes | New price in base currency units (e.g., 14999 for ₹149.99) |
| `effectiveDate` | string | Yes | ISO 8601 datetime when the new price takes effect |
| `notifySubscribers` | boolean | No | Whether to notify existing subscribers (default: true) |

**Response (201 Created):**
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
      "name": "Premium Plan",
      "isLatestVersion": true,
      "createdAt": "2025-11-08T00:00:00.000Z",
      ...
    },
    "effectiveDate": "2025-12-01T00:00:00.000Z",
    "subscribersNotified": true
  }
}
```

**Error Responses:**

```json
// 400 - Invalid Date
{
  "success": false,
  "error": {
    "code": "INVALID_DATE",
    "message": "effectiveDate must be a valid ISO 8601 date"
  }
}

// 422 - Validation Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      {
        "path": ["newPrice"],
        "message": "Price must be positive"
      }
    ]
  }
}
```

---

### 2. Get Plan Version History

Returns all versions of a plan family with subscriber counts.

**Endpoint:** `GET /api/admin/subscription-plans/:basePlanId/versions/history`

**Authentication:** Required (Admin only)

**Request:**
```http
GET /api/admin/subscription-plans/:basePlanId/versions/history
```

**Response (200 OK):**
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
      "activeSubscribers": 0,
      "createdAt": "2025-11-07T00:00:00.000Z"
    },
    "versions": [
      {
        "id": "plan-v3-uuid",
        "basePlanId": "base-plan-uuid",
        "version": 3,
        "price": "19999",
        "name": "Premium Plan",
        "isLatestVersion": true,
        "activeSubscribers": 0,
        "createdAt": "2025-11-07T00:00:00.000Z",
        "deprecatedAt": null
      },
      {
        "id": "plan-v2-uuid",
        "basePlanId": "base-plan-uuid",
        "version": 2,
        "price": "14999",
        "name": "Premium Plan",
        "isLatestVersion": false,
        "activeSubscribers": 25,
        "createdAt": "2025-09-01T00:00:00.000Z",
        "deprecatedAt": null
      },
      {
        "id": "plan-v1-uuid",
        "basePlanId": "base-plan-uuid",
        "version": 1,
        "price": "9999",
        "name": "Premium Plan",
        "isLatestVersion": false,
        "activeSubscribers": 150,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "deprecatedAt": null
      }
    ]
  }
}
```

**Use Cases:**
- Understanding grandfathering impact
- Auditing price change history
- Planning future migrations

---

### 3. Create Plan Version (Enhanced)

Creates a new version of a subscription plan with any updates.

**Endpoint:** `POST /api/admin/subscription-plans/:basePlanId/versions`

**Authentication:** Required (Admin only)

**CSRF Protection:** Required

**Request:**
```http
POST /api/admin/subscription-plans/:basePlanId/versions
Content-Type: application/json
X-CSRF-Token: <token>

{
  "updates": {
    "price": 14999,
    "features": ["Feature 1", "Feature 2", "New Feature 3"],
    "maxUniversities": 15
  },
  "releaseNotes": "Added new feature 3 and increased university limit"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "newVersion": {
      "id": "plan-v2-uuid",
      "basePlanId": "base-plan-uuid",
      "version": 2,
      "price": "14999",
      "features": ["Feature 1", "Feature 2", "New Feature 3"],
      "maxUniversities": 15,
      "isLatestVersion": true,
      ...
    },
    "subscribersAffected": 150,
    "message": "Version 2 created successfully"
  }
}
```

---

### 4. Deprecate Plan

Marks a plan as deprecated and optionally creates a migration workflow.

**Endpoint:** `POST /api/admin/subscription-plans/:id/deprecate`

**Authentication:** Required (Admin only)

**CSRF Protection:** Required

**Request:**
```http
POST /api/admin/subscription-plans/:id/deprecate
Content-Type: application/json
X-CSRF-Token: <token>

{
  "successorPlanId": "new-plan-uuid",
  "reason": "Replacing with new tier structure to better align with customer needs and market positioning"
}
```

**Request Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `successorPlanId` | string (UUID) | No | ID of the plan that replaces this one |
| `reason` | string | Yes | Detailed reason for deprecation (10-500 chars) |

**Response (200 OK):**
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

**Error Responses:**

```json
// 400 - Missing Reason
{
  "success": false,
  "error": {
    "code": "REASON_REQUIRED",
    "message": "Deprecation reason is required"
  }
}
```

**Behavior:**
- Existing subscribers can continue using the plan
- New subscriptions to this plan are blocked
- Plan marked with `deprecatedAt` timestamp
- Optional `successorPlanId` can trigger migration workflow

---

### 5. Archive Plan

Archives a plan with no active subscribers.

**Endpoint:** `POST /api/admin/subscription-plans/:id/archive`

**Authentication:** Required (Admin only)

**CSRF Protection:** Required

**Request:**
```http
POST /api/admin/subscription-plans/:id/archive
Content-Type: application/json
X-CSRF-Token: <token>

{
  "reason": "No longer offered, all subscribers migrated to Premium tier successfully"
}
```

**Request Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | Yes | Detailed reason for archiving (10-500 chars) |

**Response (200 OK):**
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

**Error Responses:**

```json
// 400 - Cannot Archive
{
  "success": false,
  "error": {
    "code": "CANNOT_ARCHIVE",
    "message": "Cannot archive plan with 50 active subscribers"
  }
}

// 400 - Missing Reason
{
  "success": false,
  "error": {
    "code": "REASON_REQUIRED",
    "message": "Archive reason is required"
  }
}
```

**Behavior:**
- Only plans with 0 active subscribers can be archived
- Plan marked with `archivedAt` timestamp
- Archived plans are hidden from all listings
- Cannot be unarchived (permanent operation)

---

### 6. Get Plan Analytics

Returns analytics for a specific plan version.

**Endpoint:** `GET /api/admin/subscription-plans/:id/analytics`

**Authentication:** Required (Admin only)

**Request:**
```http
GET /api/admin/subscription-plans/:id/analytics
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "planId": "plan-v1-uuid",
    "planName": "Premium Plan",
    "version": 1,
    "activeSubscribers": 150,
    "totalRevenue": 1498500,
    "averageRevenuePerUser": 9990,
    "isDeprecated": false,
    "deprecatedAt": null,
    "successorPlan": null,
    "isArchived": false,
    "archivedAt": null
  }
}
```

---

### 7. Update Subscription Plan (Modified)

**BREAKING CHANGE:** Price changes now blocked for plans with active subscribers.

**Endpoint:** `PUT /api/admin/subscription-plans/:id`

**Authentication:** Required (Admin only)

**CSRF Protection:** Required

**Request:**
```http
PUT /api/admin/subscription-plans/:id
Content-Type: application/json
X-CSRF-Token: <token>

{
  "price": 14999,
  "description": "Updated description"
}
```

**Response (400 Bad Request) - Price Change Blocked:**
```json
{
  "success": false,
  "error": {
    "code": "PRICE_CHANGE_NOT_ALLOWED",
    "message": "Cannot change price for plan with 150 active subscribers",
    "data": {
      "subscriberCount": 150,
      "currentPrice": "9999",
      "attemptedPrice": "14999",
      "recommendation": "Use createPlanVersion() to preserve grandfathering for existing users",
      "alternativeEndpoint": "/api/admin/subscription-plans/base-plan-uuid/versions",
      "priceUpdateEndpoint": "/api/admin/subscription-plans/base-plan-uuid/price"
    }
  }
}
```

**Response (200 OK) - Non-price Updates:**
```json
{
  "success": true,
  "data": {
    "id": "plan-uuid",
    "name": "Premium Plan",
    "price": "9999",
    "description": "Updated description",
    ...
  }
}
```

**Backward Compatibility:**
- Non-price updates continue to work as before
- Only price changes are blocked
- Error response includes actionable guidance
- Admins can still update descriptions, features, limits, etc.

---

## Migration Guide

### v1 → v2 Migration

#### Scenario 1: Updating Plan Price

**Before (v1 - DEPRECATED):**
```typescript
// ❌ Don't do this anymore - will fail for plans with subscribers
const response = await fetch(`/api/admin/subscription-plans/${planId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify({
    price: 14999
  })
});
```

**After (v2 - CORRECT):**
```typescript
// ✅ Use the dedicated price update endpoint
const response = await fetch(`/api/admin/subscription-plans/${basePlanId}/price`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify({
    newPrice: 14999,
    effectiveDate: '2025-12-01T00:00:00Z',
    notifySubscribers: true
  })
});
```

#### Scenario 2: Updating Plan Features (Non-price)

**Before and After (NO CHANGE):**
```typescript
// ✅ Still works the same way
const response = await fetch(`/api/admin/subscription-plans/${planId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify({
    description: 'Updated description',
    features: ['Feature 1', 'Feature 2', 'New Feature']
  })
});
```

#### Scenario 3: Viewing Plan History

**New in v2:**
```typescript
// ✅ New endpoint to view all versions
const response = await fetch(
  `/api/admin/subscription-plans/${basePlanId}/versions/history`
);
const { versions, latestVersion } = await response.json();

// See how many users are on each version
versions.forEach(version => {
  console.log(`Version ${version.version}: ${version.activeSubscribers} subscribers`);
});
```

---

## Best Practices

### 1. Price Changes

**DO:**
- ✅ Use `POST /subscription-plans/:basePlanId/price` for all price changes
- ✅ Set `effectiveDate` in the future to give advance notice
- ✅ Enable `notifySubscribers` to maintain transparency
- ✅ Monitor version history to understand grandfathering impact

**DON'T:**
- ❌ Use `PUT /subscription-plans/:id` to change prices
- ❌ Change prices without checking subscriber count
- ❌ Force price changes on existing users
- ❌ Skip the `reason` field for deprecation/archival

### 2. Plan Deprecation

**DO:**
- ✅ Specify a `successorPlanId` when available
- ✅ Provide detailed `reason` for audit trail
- ✅ Communicate with affected users before deprecation
- ✅ Monitor migration completion before archiving

**DON'T:**
- ❌ Deprecate plans without a migration path
- ❌ Archive plans with active subscribers
- ❌ Use generic reasons like "No longer needed"

### 3. Versioning Strategy

**DO:**
- ✅ Create new versions for all breaking changes
- ✅ Use semantic versioning approach (v1, v2, v3)
- ✅ Document changes in `releaseNotes`
- ✅ Review impact using version history endpoint

**DON'T:**
- ❌ Create versions for minor text changes
- ❌ Skip release notes
- ❌ Delete old versions (archive instead)

---

## Error Handling

### Common Error Codes

| Code | HTTP Status | Meaning | Resolution |
|------|-------------|---------|------------|
| `PRICE_CHANGE_NOT_ALLOWED` | 400 | Attempted price change on plan with subscribers | Use price update endpoint instead |
| `INVALID_DATE` | 400 | effectiveDate is not valid ISO 8601 | Provide valid datetime string |
| `REASON_REQUIRED` | 400 | Missing deprecation/archive reason | Provide detailed reason |
| `CANNOT_ARCHIVE` | 400 | Plan has active subscribers | Migrate subscribers first |
| `VALIDATION_ERROR` | 422 | Request body validation failed | Check error details for field issues |
| `NOT_FOUND` | 404 | Plan or version not found | Verify ID and version number |

### Example Error Handling

```typescript
try {
  const response = await fetch(`/api/admin/subscription-plans/${planId}`, {
    method: 'PUT',
    body: JSON.stringify({ price: 14999 })
  });
  
  const data = await response.json();
  
  if (!data.success) {
    if (data.error.code === 'PRICE_CHANGE_NOT_ALLOWED') {
      // Show modal suggesting to use price update endpoint
      showPriceUpdateModal({
        subscriberCount: data.error.data.subscriberCount,
        alternativeEndpoint: data.error.data.priceUpdateEndpoint
      });
    }
  }
} catch (error) {
  console.error('Failed to update plan:', error);
}
```

---

## Changelog

### v2.0.0 (November 8, 2025)

**Breaking Changes:**
- Price changes via `PUT /subscription-plans/:id` now blocked for plans with subscribers

**New Endpoints:**
- `POST /subscription-plans/:basePlanId/price` - Dedicated price update
- `GET /subscription-plans/:basePlanId/versions/history` - Version history with subscriber counts
- `POST /subscription-plans/:id/deprecate` - Plan deprecation
- `POST /subscription-plans/:id/archive` - Plan archival
- `GET /subscription-plans/:id/analytics` - Plan analytics

**Enhanced Endpoints:**
- `POST /subscription-plans/:basePlanId/versions` - Now includes subscriber counts

**New Validation:**
- `updatePlanPriceSchema` - Price update validation
- Enhanced `deprecatePlanSchema` - Minimum 10 char reason
- Enhanced `archivePlanSchema` - Minimum 10 char reason

---

## Support

For questions or issues with the API:
- Review this documentation
- Check error response `data` field for actionable guidance
- Contact development team for clarification

**Important:** Always test API changes in a development environment before deploying to production.
