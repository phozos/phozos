# Student ID Usage Guidelines

## 📋 Overview

Students in our system have **two distinct IDs** that serve different purposes:

| ID Type | Property | Purpose | Table |
|---------|----------|---------|-------|
| **Account ID** | `student.userId` | User account operations (login, status, password) | `users` |
| **Profile ID** | `student.id` | Student profile operations (documents, counselor, timeline) | `student_profiles` |

This dual-ID system exists because:
- **User accounts** (`users` table) handle authentication and account management
- **Student profiles** (`student_profiles` table) store academic and application data
- One user account can theoretically have multiple profiles (though currently 1:1)

---

## ⚡ Quick Reference: Which ID to Use?

### Use Account ID (`student.userId`) for:

✅ **Account Operations:**
- Toggle account status (active/inactive/suspended)
- Reset password
- Update email or login credentials
- Delete user account
- View user account details

### Use Profile ID (`student.id`) for:

✅ **Profile Operations:**
- Assign/unassign counselor
- Upload/manage documents
- Update academic information (GPA, test scores)
- View/edit profile details
- Track application timeline
- Messaging and chat
- Schedule meetings

---

## 🛠️ Using Helper Functions (Phase 1)

**Always use helper functions** instead of accessing IDs directly:

```typescript
import { getStudentAccountId, getStudentProfileId } from '@shared/utils/student-id-helpers';

// ✅ CORRECT: Use helper functions
const accountId = getStudentAccountId(student);
const profileId = getStudentProfileId(student);

// ❌ WRONG: Don't access IDs directly
const accountId = student.userId; // Unclear intent
const profileId = student.id;     // Unclear intent
```

### Helper Function Benefits:
- ✅ **Self-documenting code** - Clear which ID you're using
- ✅ **Runtime validation** - Ensures ID exists and is valid UUID
- ✅ **Descriptive errors** - Includes student name/email in error messages
- ✅ **Type safety** - Returns branded types for compile-time safety

### Example: Toggle Student Status

```typescript
// ✅ CORRECT
const handleToggleStatus = async (student: StudentWithUserDetails, newStatus: string) => {
  const accountId = getStudentAccountId(student); // Clear: this is for account operations
  await adminUserService.updateUserAccountStatus(accountId, newStatus);
};

// ❌ WRONG
const handleToggleStatus = async (student: StudentWithUserDetails, newStatus: string) => {
  await adminUserService.updateUserAccountStatus(student.id, newStatus); // BUG! Wrong ID type
};
```

---

## 🔒 Type Guards (Phase 2 Enhancement)

Use type guards for runtime validation and type narrowing:

```typescript
import { isAccountId, isStudentProfileId, isValidUUID } from '@shared/types/branded-ids';

// Validate ID format
if (isValidUUID(someId)) {
  // Valid UUID format
}

// Type guard with type narrowing
function processAccountId(id: unknown) {
  if (isAccountId(id)) {
    // TypeScript now knows 'id' is AccountId
    await updateAccountStatus(id); // Type-safe!
  }
}

// Safe conversion with error handling
import { toAccountIdSafe, toStudentProfileIdSafe } from '@shared/types/branded-ids';

const accountId = toAccountIdSafe(userInput);
if (accountId) {
  // Safe to use
} else {
  // Invalid ID, handle error
}
```

### Available Type Guards:
- `isValidUUID(id: string): boolean` - Check UUID format
- `isAccountId(value: unknown): value is AccountId` - Type guard for AccountId
- `isStudentProfileId(value: unknown): value is StudentProfileId` - Type guard for ProfileId
- `toAccountIdSafe(id: string): AccountId | null` - Safe conversion (no throw)
- `toStudentProfileIdSafe(id: string): StudentProfileId | null` - Safe conversion (no throw)

---

## 📚 Branded Types for Compile-Time Safety

Branded types prevent mixing IDs at compile time:

```typescript
import { AccountId, StudentProfileId } from '@shared/types/branded-ids';

// Function signatures enforce correct ID type
async function updateUserAccountStatus(userId: AccountId, status: string): Promise<User> {
  // Implementation
}

async function assignCounselor(studentId: StudentProfileId, counselorId: string): Promise<void> {
  // Implementation
}

// ✅ CORRECT: Using right ID types
const accountId = getStudentAccountId(student);
await updateUserAccountStatus(accountId, 'active'); // Type-safe ✓

const profileId = getStudentProfileId(student);
await assignCounselor(profileId, counselorId); // Type-safe ✓

// ❌ COMPILE ERROR: Using wrong ID type
await updateUserAccountStatus(profileId, 'active'); // Error: ProfileId not assignable to AccountId
await assignCounselor(accountId, counselorId);      // Error: AccountId not assignable to ProfileId
```

---

## 🎯 Complete Examples

### Example 1: Admin Dashboard Actions

```typescript
import { getStudentAccountId, getStudentProfileId } from '@shared/utils/student-id-helpers';

// Account operation - uses userId
const handleToggleStatus = async (student: StudentWithUserDetails, status: string) => {
  try {
    const accountId = getStudentAccountId(student);
    await api.put(`/api/admin/students/${accountId}/toggle-status`, { status });
    toast.success('Account status updated');
  } catch (error) {
    toast.error('Failed to update status: ' + error.message);
  }
};

// Profile operation - uses id
const handleAssignCounselor = async (student: StudentWithUserDetails, counselorId: string) => {
  try {
    const profileId = getStudentProfileId(student);
    await api.post('/api/admin/assign-student', { 
      studentId: profileId, 
      counselorId 
    });
    toast.success('Counselor assigned successfully');
  } catch (error) {
    toast.error('Failed to assign counselor: ' + error.message);
  }
};

// Account operation - uses userId
const handleResetPassword = async (student: StudentWithUserDetails) => {
  try {
    const accountId = getStudentAccountId(student);
    await api.post(`/api/admin/students/${accountId}/reset-password`);
    toast.success('Password reset email sent');
  } catch (error) {
    toast.error('Failed to reset password: ' + error.message);
  }
};
```

### Example 2: Server-Side Controller

```typescript
import { AccountId, StudentProfileId, toAccountId } from '@shared/types/branded-ids';

export class AdminController {
  /**
   * Toggle student account status
   * Uses Account ID (userId) from the users table
   */
  async toggleStudentStatus(req: Request, res: Response) {
    const { studentId } = req.params; // This is actually userId
    const { status } = req.body;
    
    // Convert to branded type for type safety
    const accountId = toAccountId(studentId);
    
    const updatedUser = await adminUserService.updateUserAccountStatus(accountId, status);
    return res.json({ user: updatedUser });
  }

  /**
   * Assign counselor to student
   * Uses Profile ID (id) from the student_profiles table
   */
  async assignCounselor(req: Request, res: Response) {
    const { studentId, counselorId } = req.body; // studentId is profile ID
    
    const result = await counselorAssignmentService.assignStudentToCounselor(
      studentId as StudentProfileId,
      counselorId
    );
    return res.json(result);
  }
}
```

---

## ⚠️ Common Pitfalls

### ❌ Pitfall 1: Using student.id for account operations
```typescript
// WRONG - Will cause 404 or unexpected behavior
await api.put(`/api/admin/students/${student.id}/toggle-status`, { status });
```

**Fix:** Use helper function
```typescript
// CORRECT
const accountId = getStudentAccountId(student);
await api.put(`/api/admin/students/${accountId}/toggle-status`, { status });
```

### ❌ Pitfall 2: Inconsistent ID usage in different files
```typescript
// File A
handleViewProfile(student.userId);

// File B
handleViewProfile(student.id); // Inconsistent!
```

**Fix:** Standardize using helper functions
```typescript
// Both files
const accountId = getStudentAccountId(student);
handleViewProfile(accountId);
```

### ❌ Pitfall 3: Not validating IDs before use
```typescript
// RISKY - No validation
function updateStudent(studentId: string) {
  return api.put(`/api/students/${studentId}`, data);
}
```

**Fix:** Use type guards or helper functions
```typescript
// SAFE - With validation
function updateStudent(studentId: string) {
  if (!isValidUUID(studentId)) {
    throw new Error('Invalid student ID format');
  }
  return api.put(`/api/students/${studentId}`, data);
}
```

---

## 📖 API Endpoint Reference

### Account Operations (Expect AccountId)

| Endpoint | Method | ID Type | Purpose |
|----------|--------|---------|---------|
| `/api/admin/students/:studentId/toggle-status` | PUT | AccountId | Toggle account status |
| `/api/admin/students/:studentId/reset-password` | POST | AccountId | Reset password |
| `/api/admin/students/:studentId` (view details) | GET | AccountId | View user account |

### Profile Operations (Expect ProfileId)

| Endpoint | Method | ID Type | Purpose |
|----------|--------|---------|---------|
| `/api/admin/assign-student` | POST | ProfileId | Assign counselor |
| `/api/admin/students/:studentId/timeline` | GET | ProfileId | Get student timeline |
| `/api/students/:studentId/documents` | GET | ProfileId | Get student documents |

---

## ✅ Best Practices Checklist

When working with student IDs:

- [ ] **Import helper functions** from `@shared/utils/student-id-helpers`
- [ ] **Use `getStudentAccountId()`** for account operations
- [ ] **Use `getStudentProfileId()`** for profile operations
- [ ] **Add JSDoc comments** explaining which ID type a function expects
- [ ] **Use branded types** in function signatures for type safety
- [ ] **Validate IDs** before passing to external APIs
- [ ] **Handle errors** from helper functions with try-catch
- [ ] **Document API endpoints** with expected ID type
- [ ] **Review code** to ensure consistent ID usage
- [ ] **Test error cases** when IDs are missing or invalid

---

## 🔧 Migration Guide

### If you're updating existing code:

1. **Find all student ID usages:**
   ```bash
   grep -r "student\.id\|student\.userId" client/src/
   ```

2. **Determine operation type:**
   - Account operation? → Use `getStudentAccountId()`
   - Profile operation? → Use `getStudentProfileId()`

3. **Replace direct access:**
   ```typescript
   // Before
   const id = student.userId;
   
   // After
   import { getStudentAccountId } from '@shared/utils/student-id-helpers';
   const accountId = getStudentAccountId(student);
   ```

4. **Update function signatures:**
   ```typescript
   // Before
   function updateStatus(studentId: string) { }
   
   // After
   import { AccountId } from '@shared/types/branded-ids';
   function updateStatus(studentId: AccountId) { }
   ```

5. **Test thoroughly** to ensure no regressions

---

## 🎓 Learning Resources

- **Phase 1 Implementation:** `shared/utils/student-id-helpers.ts`
- **Phase 2 Implementation:** `shared/types/branded-ids.ts`
- **Example Usage:** `client/src/pages/AdminDashboard.tsx`
- **Architecture Discussion:** `DUAL_ID_RESEARCH_PROPOSAL.md`
- **Bug Analysis:** `STUDENT_STATUS_BUG_ANALYSIS.md`

---

## 🆘 Need Help?

**If you're unsure which ID to use:**

1. **Ask yourself:** "Am I working with the user's account or their student profile?"
   - Account (login, status, password) → `getStudentAccountId()`
   - Profile (academics, documents, counselor) → `getStudentProfileId()`

2. **Check the API endpoint documentation** to see which ID it expects

3. **Look at similar operations** in the codebase for guidance

4. **When in doubt, use helper functions** - they provide clear intent and validation

---

**Last Updated:** Based on Phase 1 & Phase 2 implementation
**Maintained By:** Development Team
**Questions?** Check the architecture documentation or ask in the team chat.
