# EduPath Webapp - Comprehensive 6-Phase Modularization Plan

## Executive Summary

This document outlines a comprehensive transformation plan for the EduPath webapp from its current monolithic structure (3,699-line routes.ts) into an industry-standard, maintainable architecture following clean architecture principles, repository pattern, and domain-driven design.

**Current State:**
- Monolithic `server/routes.ts` (3,699 lines) with mixed concerns
- Business logic embedded in route handlers
- Mock data present in route modules
- Inconsistent error handling patterns
- Large storage.ts file (1,090 lines) handling all data access
- Frontend components need better modularity

**Target State:**
- Domain-driven modular architecture
- Clear separation of concerns (Controllers → Services → Repositories)
- Standardized error handling and API responses
- No mock data in production code
- Improved frontend component reusability
- Comprehensive testing at each layer

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Pages   │  │Components│  │  Hooks   │  │ Services │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/WS
┌─────────────────────────────────────────────────────────────┐
│                     Controller Layer                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │  Users   │  │Universities│ │  Forum   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   Auth   │  │  Users   │  │Universities│ │  Forum   │   │
│  │ Service  │  │ Service  │  │  Service  │  │ Service  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    Repository Layer                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   User   │  │ Student  │  │University│  │  Forum   │   │
│  │   Repo   │  │   Repo   │  │   Repo   │  │   Repo   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                             │
│         ┌────────────────────────────────┐                  │
│         │     Drizzle ORM / Database     │                  │
│         └────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

---

# PHASE 1: Foundation - Repository Pattern Implementation

## Goals
- Extract all database operations from storage.ts into domain-specific repositories
- Establish clear data access layer with consistent patterns
- Create base repository with common CRUD operations
- Ensure type safety and error handling at data layer

## Estimated Effort
**Duration:** 2-3 weeks  
**Complexity:** Medium  
**Risk:** Low (additive changes only)

## Detailed Action Steps

### 1.1 Create Base Repository Infrastructure

**File:** `server/repositories/base.repository.ts`

```typescript
import { db } from '../db';
import { PgTable } from 'drizzle-orm/pg-core';
import { eq, and, or, sql } from 'drizzle-orm';

export interface IBaseRepository<T, TInsert> {
  findById(id: string): Promise<T | undefined>;
  findAll(filters?: Partial<T>): Promise<T[]>;
  create(data: TInsert): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T | undefined>;
  delete(id: string): Promise<boolean>;
}

export abstract class BaseRepository<T, TInsert> implements IBaseRepository<T, TInsert> {
  constructor(protected table: PgTable, protected primaryKey: string = 'id') {}

  async findById(id: string): Promise<T | undefined> {
    const results = await db
      .select()
      .from(this.table)
      .where(eq(this.table[this.primaryKey], id))
      .limit(1);
    return results[0] as T | undefined;
  }

  async findAll(filters?: Partial<T>): Promise<T[]> {
    let query = db.select().from(this.table);
    
    if (filters) {
      const conditions = Object.entries(filters)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => eq(this.table[key], value));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }
    
    return await query as T[];
  }

  async create(data: TInsert): Promise<T> {
    const results = await db.insert(this.table).values(data).returning();
    return results[0] as T;
  }

  async update(id: string, data: Partial<T>): Promise<T | undefined> {
    const results = await db
      .update(this.table)
      .set(data)
      .where(eq(this.table[this.primaryKey], id))
      .returning();
    return results[0] as T | undefined;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(this.table)
      .where(eq(this.table[this.primaryKey], id));
    return result.rowCount > 0;
  }
}
```

### 1.2 Create Domain-Specific Repositories

**Files to Create:**

1. **`server/repositories/user.repository.ts`**
```typescript
import { BaseRepository } from './base.repository';
import { User, InsertUser, users, userTypeEnum } from '@shared/schema';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';

export interface IUserRepository extends Omit<BaseRepository<User, InsertUser>, never> {
  findByEmail(email: string): Promise<User | undefined>;
  findByUsername(username: string): Promise<User | undefined>;
  findTeamMembers(): Promise<User[]>;
  updateActiveStatus(userId: string, isActive: boolean): Promise<User | undefined>;
}

export class UserRepository extends BaseRepository<User, InsertUser> implements IUserRepository {
  constructor() {
    super(users, 'id');
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const results = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return results[0];
  }

  async findByUsername(username: string): Promise<User | undefined> {
    const results = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return results[0];
  }

  async findTeamMembers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.userType, 'team_member'));
  }

  async updateActiveStatus(userId: string, isActive: boolean): Promise<User | undefined> {
    return await this.update(userId, { isActive });
  }
}

export const userRepository = new UserRepository();
```

2. **`server/repositories/student.repository.ts`**
```typescript
import { BaseRepository } from './base.repository';
import { 
  StudentProfile, 
  InsertStudentProfile, 
  studentProfiles,
  users,
  counselorAssignments 
} from '@shared/schema';
import { db } from '../db';
import { eq, and, desc } from 'drizzle-orm';

export interface IStudentRepository extends Omit<BaseRepository<StudentProfile, InsertStudentProfile>, never> {
  findByUserId(userId: string): Promise<StudentProfile | undefined>;
  findAllWithUserDetails(): Promise<any[]>;
  findAssignedToCounselor(counselorId: string): Promise<any[]>;
  assignCounselor(studentId: string, counselorId: string): Promise<void>;
  unassign(studentId: string): Promise<void>;
  checkAssignment(counselorId: string, studentId: string): Promise<boolean>;
}

export class StudentRepository extends BaseRepository<StudentProfile, InsertStudentProfile> implements IStudentRepository {
  constructor() {
    super(studentProfiles, 'id');
  }

  async findByUserId(userId: string): Promise<StudentProfile | undefined> {
    const results = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, userId))
      .limit(1);
    return results[0];
  }

  async findAllWithUserDetails(): Promise<any[]> {
    return await db
      .select({
        id: studentProfiles.id,
        userId: studentProfiles.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: studentProfiles.phone,
        nationality: studentProfiles.nationality,
        destinationCountry: studentProfiles.destinationCountry,
        intakeYear: studentProfiles.intakeYear,
        status: studentProfiles.status,
        profilePicture: users.profilePicture,
        createdAt: studentProfiles.createdAt,
        currentEducationLevel: studentProfiles.currentEducationLevel,
        intendedMajor: studentProfiles.intendedMajor,
        budgetRange: studentProfiles.budgetRange,
        gpa: studentProfiles.gpa,
        testScores: studentProfiles.testScores,
        academicInterests: studentProfiles.academicInterests,
        extracurriculars: studentProfiles.extracurriculars,
        workExperience: studentProfiles.workExperience
      })
      .from(studentProfiles)
      .leftJoin(users, eq(studentProfiles.userId, users.id))
      .orderBy(desc(studentProfiles.createdAt));
  }

  async findAssignedToCounselor(counselorId: string): Promise<any[]> {
    return await db
      .select({
        id: studentProfiles.id,
        userId: studentProfiles.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: studentProfiles.phone,
        nationality: studentProfiles.nationality,
        destinationCountry: studentProfiles.destinationCountry,
        intakeYear: studentProfiles.intakeYear,
        status: studentProfiles.status,
        profilePicture: users.profilePicture,
        createdAt: studentProfiles.createdAt,
        currentEducationLevel: studentProfiles.currentEducationLevel,
        intendedMajor: studentProfiles.intendedMajor,
        budgetRange: studentProfiles.budgetRange,
        gpa: studentProfiles.gpa,
        testScores: studentProfiles.testScores,
        academicInterests: studentProfiles.academicInterests,
        extracurriculars: studentProfiles.extracurriculars,
        workExperience: studentProfiles.workExperience
      })
      .from(studentProfiles)
      .leftJoin(users, eq(studentProfiles.userId, users.id))
      .leftJoin(counselorAssignments, eq(counselorAssignments.studentId, studentProfiles.id))
      .where(eq(counselorAssignments.counselorId, counselorId));
  }

  async assignCounselor(studentId: string, counselorId: string): Promise<void> {
    await db.insert(counselorAssignments).values({
      studentId,
      counselorId
    });
  }

  async unassign(studentId: string): Promise<void> {
    await db
      .delete(counselorAssignments)
      .where(eq(counselorAssignments.studentId, studentId));
  }

  async checkAssignment(counselorId: string, studentId: string): Promise<boolean> {
    const results = await db
      .select()
      .from(counselorAssignments)
      .where(
        and(
          eq(counselorAssignments.counselorId, counselorId),
          eq(counselorAssignments.studentId, studentId)
        )
      )
      .limit(1);
    return results.length > 0;
  }
}

export const studentRepository = new StudentRepository();
```

3. **`server/repositories/university.repository.ts`**
4. **`server/repositories/application.repository.ts`**
5. **`server/repositories/document.repository.ts`**
6. **`server/repositories/forum.repository.ts`**
7. **`server/repositories/notification.repository.ts`**
8. **`server/repositories/event.repository.ts`**

### 1.3 Create Repository Index

**File:** `server/repositories/index.ts`

```typescript
export * from './base.repository';
export * from './user.repository';
export * from './student.repository';
export * from './university.repository';
export * from './application.repository';
export * from './document.repository';
export * from './forum.repository';
export * from './notification.repository';
export * from './event.repository';
```

### 1.4 Gradually Migrate storage.ts

**Strategy:** Dual implementation during migration
- Keep existing storage.ts methods
- Create new repository-based implementations
- Update one domain at a time
- Remove old storage methods only after all references updated

**File:** `server/storage.ts` (migration example)

```typescript
import { userRepository } from './repositories/user.repository';
import { studentRepository } from './repositories/student.repository';

export const storage = {
  // NEW: Repository-based methods (preferred)
  users: userRepository,
  students: studentRepository,
  
  // LEGACY: Keep during migration, mark as deprecated
  /** @deprecated Use storage.users.findByEmail instead */
  async getUserByEmail(email: string) {
    return userRepository.findByEmail(email);
  },
  
  // ... other methods
};
```

## Files to Create/Modify/Delete

### Create (8 new files)
- ✅ `server/repositories/base.repository.ts`
- ✅ `server/repositories/user.repository.ts`
- ✅ `server/repositories/student.repository.ts`
- ✅ `server/repositories/university.repository.ts`
- ✅ `server/repositories/application.repository.ts`
- ✅ `server/repositories/document.repository.ts`
- ✅ `server/repositories/forum.repository.ts`
- ✅ `server/repositories/index.ts`

### Modify
- 🔄 `server/storage.ts` - Add repository delegation, mark old methods as deprecated
- 🔄 Update imports in files using storage methods

### Delete
- ❌ None in this phase (deletion happens in Phase 2)

## Best Practices to Follow

1. **Single Responsibility:** Each repository handles only one domain entity
2. **Interface Segregation:** Define clear interfaces for each repository
3. **Dependency Inversion:** Depend on interfaces, not concrete implementations
4. **Type Safety:** Leverage TypeScript's type system fully
5. **Error Handling:** Use consistent error patterns (throw specific errors)
6. **Transactions:** Support database transactions where needed
7. **Testing:** Write unit tests for each repository method

## Testing Requirements

### Unit Tests Structure

**File:** `server/repositories/__tests__/user.repository.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { userRepository } from '../user.repository';
import { db } from '../../db';

describe('UserRepository', () => {
  beforeEach(async () => {
    // Setup test database
  });

  afterEach(async () => {
    // Cleanup test data
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const user = await userRepository.create({
        email: 'test@example.com',
        password: 'hashed',
        userType: 'customer'
      });

      const found = await userRepository.findByEmail('test@example.com');
      expect(found).toBeDefined();
      expect(found?.email).toBe('test@example.com');
    });

    it('should return undefined for non-existent email', async () => {
      const found = await userRepository.findByEmail('nonexistent@example.com');
      expect(found).toBeUndefined();
    });
  });

  // Test all public methods
});
```

### Test Coverage Goals
- **Target:** 80% code coverage for repositories
- **Focus:** Edge cases, error conditions, null handling
- **Tools:** Vitest + Supertest

## Rollback Plan

### Rollback Triggers
- Repository methods fail in production
- Data inconsistencies detected
- Performance degradation > 20%

### Rollback Steps
1. **Immediate:** Revert to using storage.ts methods directly
2. **Code Rollback:** Git revert to previous commit
3. **Database:** No schema changes in this phase - no DB rollback needed
4. **Verification:** Run integration tests to ensure old methods work
5. **Post-mortem:** Document what went wrong, fix, re-test

### Rollback Time Estimate
- **Preparation:** 30 minutes
- **Execution:** 1 hour
- **Verification:** 2 hours
- **Total:** ~4 hours

## Success Metrics

### Quantitative
- ✅ All 8 repository files created and tested
- ✅ 100% of CRUD operations migrated to repositories
- ✅ 80%+ test coverage for repository layer
- ✅ Zero data access errors in production
- ✅ Response time degradation < 5%

### Qualitative
- ✅ Code is more maintainable (less duplication)
- ✅ Clear separation between data access and business logic
- ✅ Team understands and follows repository pattern
- ✅ Documentation is complete and clear

---

# PHASE 2: Service Layer - Business Logic Extraction

## Goals
- Extract all business logic from route handlers into dedicated services
- Implement dependency injection for repositories
- Create domain-specific services with clear responsibilities
- Establish consistent service patterns and error handling

## Estimated Effort
**Duration:** 3-4 weeks  
**Complexity:** High  
**Risk:** Medium (refactoring existing logic)

## Detailed Action Steps

### 2.1 Create Base Service Infrastructure

**File:** `server/services/base.service.ts`

```typescript
export interface IService {
  // Base service interface - can be extended with common methods
}

export abstract class BaseService implements IService {
  // Common service functionality
  
  protected handleError(error: any, context: string): never {
    console.error(`Error in ${context}:`, error);
    
    if (error.code === '23505') {
      throw new Error('DUPLICATE_ENTRY');
    }
    if (error.code === '23503') {
      throw new Error('FOREIGN_KEY_VIOLATION');
    }
    
    throw error;
  }

  protected validateRequired(data: any, fields: string[]): void {
    const missing = fields.filter(field => !data[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }
}
```

### 2.2 Create Domain Services

**File:** `server/services/domain/auth.service.ts`

```typescript
import { BaseService } from '../base.service';
import { userRepository, IUserRepository } from '../../repositories/user.repository';
import { studentRepository } from '../../repositories/student.repository';
import { jwtService } from '../jwtService';
import * as bcrypt from 'bcrypt';
import { User, InsertUser, InsertStudentProfile } from '@shared/schema';

export interface IAuthService {
  registerStudent(data: InsertUser & { profile: InsertStudentProfile }): Promise<{ user: User; token: string }>;
  login(email: string, password: string): Promise<{ user: User; token: string }>;
  validateToken(token: string): Promise<User | null>;
  logout(userId: string): Promise<void>;
}

export class AuthService extends BaseService implements IAuthService {
  constructor(
    private userRepo: IUserRepository,
    private studentRepo = studentRepository
  ) {
    super();
  }

  async registerStudent(data: InsertUser & { profile: InsertStudentProfile }) {
    try {
      // Validate input
      this.validateRequired(data, ['email', 'password', 'firstName', 'lastName']);

      // Check if user exists
      const existingUser = await this.userRepo.findByEmail(data.email);
      if (existingUser) {
        throw new Error('EMAIL_ALREADY_EXISTS');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create user
      const user = await this.userRepo.create({
        ...data,
        password: hashedPassword,
        userType: 'customer',
        isActive: true
      });

      // Create student profile
      await this.studentRepo.create({
        ...data.profile,
        userId: user.id
      });

      // Generate JWT token
      const token = jwtService.generateToken({
        userId: user.id,
        email: user.email,
        userType: user.userType
      });

      return { user, token };
    } catch (error) {
      return this.handleError(error, 'AuthService.registerStudent');
    }
  }

  async login(email: string, password: string) {
    try {
      // Find user
      const user = await this.userRepo.findByEmail(email);
      if (!user) {
        throw new Error('INVALID_CREDENTIALS');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('ACCOUNT_SUSPENDED');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password!);
      if (!isValidPassword) {
        throw new Error('INVALID_CREDENTIALS');
      }

      // Generate token
      const token = jwtService.generateToken({
        userId: user.id,
        email: user.email,
        userType: user.userType
      });

      return { user, token };
    } catch (error) {
      return this.handleError(error, 'AuthService.login');
    }
  }

  async validateToken(token: string): Promise<User | null> {
    try {
      const payload = jwtService.verifyToken(token);
      if (!payload) return null;

      return await this.userRepo.findById(payload.userId);
    } catch (error) {
      console.error('Token validation error:', error);
      return null;
    }
  }

  async logout(userId: string): Promise<void> {
    // Implement token invalidation if using token blacklist
    // For now, logout is handled client-side by removing token
  }
}

// Export singleton instance with dependencies injected
export const authService = new AuthService(userRepository);
```

**File:** `server/services/domain/user.service.ts`

```typescript
import { BaseService } from '../base.service';
import { userRepository } from '../../repositories/user.repository';
import { studentRepository } from '../../repositories/student.repository';
import { User, StudentProfile } from '@shared/schema';
import * as bcrypt from 'bcrypt';

export interface IUserService {
  getUserById(userId: string): Promise<User | undefined>;
  getUserProfile(userId: string): Promise<{ user: User; profile?: StudentProfile }>;
  updateUserProfile(userId: string, data: Partial<User>): Promise<User>;
  changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void>;
  updateStudentProfile(userId: string, data: Partial<StudentProfile>): Promise<StudentProfile>;
}

export class UserService extends BaseService implements IUserService {
  async getUserById(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }
    return user;
  }

  async getUserProfile(userId: string) {
    const user = await this.getUserById(userId);
    let profile;

    if (user.userType === 'customer') {
      profile = await studentRepository.findByUserId(userId);
    }

    return { user, profile };
  }

  async updateUserProfile(userId: string, data: Partial<User>) {
    const updated = await userRepository.update(userId, data);
    if (!updated) {
      throw new Error('UPDATE_FAILED');
    }
    return updated;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.getUserById(userId);
    
    // Verify old password
    const isValid = await bcrypt.compare(oldPassword, user.password!);
    if (!isValid) {
      throw new Error('INVALID_OLD_PASSWORD');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update
    await userRepository.update(userId, { password: hashedPassword });
  }

  async updateStudentProfile(userId: string, data: Partial<StudentProfile>) {
    const profile = await studentRepository.findByUserId(userId);
    if (!profile) {
      throw new Error('PROFILE_NOT_FOUND');
    }

    const updated = await studentRepository.update(profile.id, data);
    if (!updated) {
      throw new Error('UPDATE_FAILED');
    }
    return updated;
  }
}

export const userService = new UserService();
```

**Additional Services to Create:**
3. `server/services/domain/university.service.ts`
4. `server/services/domain/application.service.ts`
5. `server/services/domain/forum.service.ts`
6. `server/services/domain/counselor.service.ts`
7. `server/services/domain/admin.service.ts`
8. `server/services/domain/notification.service.ts`

### 2.3 Refactor Existing Services

**Existing services to refactor:**
- `server/services/ai-matching.ts` → Use repositories instead of storage
- `server/services/notifications.ts` → Extract into domain service
- `server/services/websocket.ts` → Keep as infrastructure service
- `server/services/tempPasswordService.ts` → Move to domain/auth folder

### 2.4 Service Organization Structure

```
server/services/
├── domain/                    # Business logic services
│   ├── auth.service.ts
│   ├── user.service.ts
│   ├── university.service.ts
│   ├── application.service.ts
│   ├── forum.service.ts
│   ├── counselor.service.ts
│   ├── admin.service.ts
│   └── notification.service.ts
├── infrastructure/            # Cross-cutting concerns
│   ├── websocket.ts
│   ├── email.service.ts
│   ├── storage.service.ts
│   └── cache.service.ts
├── integration/              # External service integrations
│   ├── ai-matching.ts
│   └── payment.service.ts
├── base.service.ts
└── index.ts
```

## Files to Create/Modify/Delete

### Create (15+ new files)
- ✅ `server/services/base.service.ts`
- ✅ `server/services/domain/auth.service.ts`
- ✅ `server/services/domain/user.service.ts`
- ✅ `server/services/domain/university.service.ts`
- ✅ `server/services/domain/application.service.ts`
- ✅ `server/services/domain/forum.service.ts`
- ✅ `server/services/domain/counselor.service.ts`
- ✅ `server/services/domain/admin.service.ts`
- ✅ `server/services/domain/notification.service.ts`
- ✅ `server/services/infrastructure/` (directory)
- ✅ `server/services/integration/` (directory)
- ✅ `server/services/domain/__tests__/` (test directory)

### Modify
- 🔄 Move existing services to appropriate folders
- 🔄 Refactor services to use repositories
- 🔄 Update route handlers to use services (will be done in Phase 3)

### Delete
- ❌ Redundant service files after refactoring

## Best Practices to Follow

1. **Single Responsibility:** One service per domain
2. **Dependency Injection:** Inject repositories via constructor
3. **Error Handling:** Throw domain-specific errors
4. **Validation:** Validate at service layer
5. **Business Rules:** All business logic in services
6. **No Direct DB Access:** Services only use repositories
7. **Testability:** Services should be easily mockable

## Testing Requirements

```typescript
// server/services/domain/__tests__/auth.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../auth.service';
import { IUserRepository } from '../../../repositories/user.repository';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepo: IUserRepository;

  beforeEach(() => {
    mockUserRepo = {
      findByEmail: vi.fn(),
      create: vi.fn(),
      // ... other methods
    } as any;

    authService = new AuthService(mockUserRepo);
  });

  describe('registerStudent', () => {
    it('should create user and profile successfully', async () => {
      mockUserRepo.findByEmail = vi.fn().mockResolvedValue(null);
      mockUserRepo.create = vi.fn().mockResolvedValue({
        id: '123',
        email: 'test@example.com'
      });

      const result = await authService.registerStudent({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        profile: {}
      });

      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
    });

    it('should throw error if email already exists', async () => {
      mockUserRepo.findByEmail = vi.fn().mockResolvedValue({ email: 'existing@example.com' });

      await expect(
        authService.registerStudent({
          email: 'existing@example.com',
          password: 'password',
          firstName: 'John',
          lastName: 'Doe',
          profile: {}
        })
      ).rejects.toThrow('EMAIL_ALREADY_EXISTS');
    });
  });
});
```

### Test Coverage Goals
- **Target:** 85% code coverage for services
- **Focus:** Business logic, error cases, edge cases

## Rollback Plan

### Rollback Steps
1. Keep old storage-based logic in route handlers during migration
2. Use feature flags to switch between old and new service layer
3. If issues found, disable feature flag
4. Fix issues in service layer
5. Re-enable when stable

## Success Metrics

- ✅ All business logic extracted from routes
- ✅ 85%+ test coverage for services
- ✅ Zero business logic in route handlers
- ✅ All services use repositories (no direct DB access)
- ✅ Clear error handling throughout

---

# PHASE 3: Controller Layer - Route Modularization

## Goals
- Break down monolithic routes.ts (3,699 lines) into domain-specific controllers
- Implement clean controller pattern (thin controllers, fat services)
- Standardize API response patterns
- Remove all business logic from controllers

## Estimated Effort
**Duration:** 3-4 weeks  
**Complexity:** High  
**Risk:** Medium (major refactoring)

## Detailed Action Steps

### 3.1 Create Controller Base Class

**File:** `server/controllers/base.controller.ts`

```typescript
import { Response } from 'express';
import { sendSuccess, sendError, sendEmptySuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types/auth';

export abstract class BaseController {
  protected sendSuccess<T>(res: Response, data: T, message?: string) {
    return sendSuccess(res, data, message);
  }

  protected sendError(
    res: Response,
    status: number,
    code: string,
    message: string,
    details?: any
  ) {
    return sendError(res, status, code, message, details);
  }

  protected sendEmptySuccess(res: Response, message?: string) {
    return sendEmptySuccess(res, message);
  }

  protected getUserId(req: AuthenticatedRequest): string {
    if (!req.user?.id) {
      throw new Error('USER_NOT_AUTHENTICATED');
    }
    return req.user.id;
  }

  protected handleError(res: Response, error: any, context: string) {
    console.error(`Error in ${context}:`, error);

    if (error.message === 'USER_NOT_FOUND') {
      return this.sendError(res, 404, 'USER_NOT_FOUND', 'User not found');
    }
    if (error.message === 'EMAIL_ALREADY_EXISTS') {
      return this.sendError(res, 409, 'EMAIL_EXISTS', 'Email already registered');
    }
    if (error.message === 'INVALID_CREDENTIALS') {
      return this.sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }

    return this.sendError(
      res,
      500,
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      process.env.NODE_ENV === 'development' ? error : undefined
    );
  }
}
```

### 3.2 Create Domain Controllers

**File:** `server/controllers/auth.controller.ts`

```typescript
import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { authService } from '../services/domain/auth.service';
import { AuthenticatedRequest } from '../types/auth';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  nationality: z.string().optional(),
  destinationCountry: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export class AuthController extends BaseController {
  async register(req: Request, res: Response) {
    try {
      const validatedData = registerSchema.parse(req.body);

      const result = await authService.registerStudent({
        ...validatedData,
        profile: {
          phone: validatedData.phone,
          nationality: validatedData.nationality,
          destinationCountry: validatedData.destinationCountry
        }
      });

      return this.sendSuccess(res, {
        user: this.sanitizeUser(result.user),
        token: result.token
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AuthController.register');
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const result = await authService.login(email, password);

      return this.sendSuccess(res, {
        user: this.sanitizeUser(result.user),
        token: result.token
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'AuthController.login');
    }
  }

  async me(req: AuthenticatedRequest, res: Response) {
    try {
      return this.sendSuccess(res, this.sanitizeUser(req.user));
    } catch (error) {
      return this.handleError(res, error, 'AuthController.me');
    }
  }

  async logout(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      await authService.logout(userId);
      return this.sendEmptySuccess(res, 'Logged out successfully');
    } catch (error) {
      return this.handleError(res, error, 'AuthController.logout');
    }
  }

  private sanitizeUser(user: any) {
    const { password, temporaryPassword, ...sanitized } = user;
    return sanitized;
  }
}

export const authController = new AuthController();
```

**File:** `server/controllers/user.controller.ts`

```typescript
import { Response } from 'express';
import { BaseController } from './base.controller';
import { userService } from '../services/domain/user.service';
import { AuthenticatedRequest } from '../types/auth';
import { z } from 'zod';

const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  profilePicture: z.string().optional()
});

const changePasswordSchema = z.object({
  oldPassword: z.string(),
  newPassword: z.string().min(8)
});

export class UserController extends BaseController {
  async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const profile = await userService.getUserProfile(userId);
      return this.sendSuccess(res, profile);
    } catch (error) {
      return this.handleError(res, error, 'UserController.getProfile');
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const validatedData = updateProfileSchema.parse(req.body);
      
      const updated = await userService.updateUserProfile(userId, validatedData);
      return this.sendSuccess(res, updated);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'UserController.updateProfile');
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = this.getUserId(req);
      const { oldPassword, newPassword } = changePasswordSchema.parse(req.body);
      
      await userService.changePassword(userId, oldPassword, newPassword);
      return this.sendEmptySuccess(res, 'Password changed successfully');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return this.sendError(res, 422, 'VALIDATION_ERROR', 'Invalid input', error.errors);
      }
      return this.handleError(res, error, 'UserController.changePassword');
    }
  }
}

export const userController = new UserController();
```

**Additional Controllers to Create:**
3. `server/controllers/university.controller.ts`
4. `server/controllers/application.controller.ts`
5. `server/controllers/forum.controller.ts`
6. `server/controllers/counselor.controller.ts`
7. `server/controllers/admin.controller.ts`
8. `server/controllers/notification.controller.ts`

### 3.3 Create Modular Route Files

**File:** `server/routes/auth.routes.ts`

```typescript
import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/authentication';
import { csrfProtection } from '../middleware/csrf';
import { loginRateLimit, registrationRateLimit } from '../middleware/security';
import { asyncHandler } from '../middleware/error-handler';

const router = Router();

// Public routes
router.post('/register', 
  registrationRateLimit, 
  csrfProtection,
  asyncHandler((req, res) => authController.register(req, res))
);

router.post('/login', 
  loginRateLimit,
  csrfProtection,
  asyncHandler((req, res) => authController.login(req, res))
);

// Protected routes
router.get('/me', 
  requireAuth,
  asyncHandler((req, res) => authController.me(req, res))
);

router.post('/logout', 
  requireAuth,
  asyncHandler((req, res) => authController.logout(req, res))
);

export default router;
```

**File:** `server/routes/user.routes.ts`

```typescript
import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { requireAuth } from '../middleware/authentication';
import { csrfProtection } from '../middleware/csrf';
import { asyncHandler } from '../middleware/error-handler';

const router = Router();

// All routes require authentication
router.use(requireAuth);

router.get('/profile', asyncHandler((req, res) => userController.getProfile(req, res)));
router.put('/profile', csrfProtection, asyncHandler((req, res) => userController.updateProfile(req, res)));
router.post('/change-password', csrfProtection, asyncHandler((req, res) => userController.changePassword(req, res)));

export default router;
```

**Additional Route Files:**
3. `server/routes/university.routes.ts`
4. `server/routes/application.routes.ts`
5. `server/routes/forum.routes.ts`
6. `server/routes/counselor.routes.ts` (refactor existing)
7. `server/routes/admin.routes.ts`

### 3.4 Create New Route Registry

**File:** `server/routes/index.ts`

```typescript
import { Express, Router } from 'express';
import { createServer, type Server } from 'http';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import universityRoutes from './university.routes';
import applicationRoutes from './application.routes';
import forumRoutes from './forum.routes';
import counselorRoutes from './counselor.routes';
import adminRoutes from './admin.routes';
import systemMetricsRoutes from './systemMetrics';
import { checkMaintenanceMode } from '../middleware/maintenance';

export async function registerRoutes(app: Express, httpServer: Server): Promise<Router> {
  const apiRouter = Router();

  // Apply global middleware
  apiRouter.use(checkMaintenanceMode);

  // Mount domain routes
  apiRouter.use('/auth', authRoutes);
  apiRouter.use('/users', userRoutes);
  apiRouter.use('/universities', universityRoutes);
  apiRouter.use('/applications', applicationRoutes);
  apiRouter.use('/forum', forumRoutes);
  apiRouter.use('/counselor', counselorRoutes);
  apiRouter.use('/admin', adminRoutes);
  apiRouter.use('/system', systemMetricsRoutes);

  // Mount API router
  app.use('/api', apiRouter);

  return apiRouter;
}
```

### 3.5 Migration Strategy

**Step-by-step migration:**
1. Create one controller + route file at a time
2. Keep old routes.ts running alongside new routes
3. Use feature flags to switch traffic between old/new
4. Test thoroughly before removing old code
5. Delete old routes.ts sections only after validation

## Files to Create/Modify/Delete

### Create (15+ files)
- ✅ `server/controllers/base.controller.ts`
- ✅ `server/controllers/auth.controller.ts`
- ✅ `server/controllers/user.controller.ts`
- ✅ `server/controllers/university.controller.ts`
- ✅ `server/controllers/application.controller.ts`
- ✅ `server/controllers/forum.controller.ts`
- ✅ `server/controllers/counselor.controller.ts`
- ✅ `server/controllers/admin.controller.ts`
- ✅ `server/routes/auth.routes.ts`
- ✅ `server/routes/user.routes.ts`
- ✅ `server/routes/university.routes.ts`
- ✅ `server/routes/application.routes.ts`
- ✅ `server/routes/forum.routes.ts`
- ✅ `server/routes/admin.routes.ts`
- ✅ Refactor `server/routes/index.ts`

### Modify
- 🔄 `server/index.ts` - Update route registration
- 🔄 Existing route files to use controllers

### Delete
- ❌ `server/routes.ts` (3,699 lines) - DELETE AFTER MIGRATION COMPLETE

## Best Practices to Follow

1. **Thin Controllers:** Only handle HTTP concerns (request/response)
2. **No Business Logic:** All logic in services
3. **Validation:** Use Zod schemas for input validation
4. **Error Handling:** Consistent error responses
5. **RESTful Design:** Follow REST conventions
6. **Documentation:** JSDoc comments for all controllers

## Testing Requirements

```typescript
// server/controllers/__tests__/auth.controller.test.ts
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '../../routes/auth.routes';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('AuthController', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.token).toBeDefined();
    });

    it('should return validation error for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123'
        });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
```

## Rollback Plan

### Steps
1. Switch traffic back to old routes.ts using load balancer
2. Disable new route modules
3. Fix issues
4. Gradual rollout with canary deployment

## Success Metrics

- ✅ routes.ts reduced from 3,699 lines to < 100 lines (just registry)
- ✅ All routes modularized by domain (8+ route files)
- ✅ Zero business logic in controllers
- ✅ 100% consistent error handling
- ✅ All routes have integration tests

---

# PHASE 4: Data Layer Cleanup - Remove Mock Data

## Goals
- Remove ALL mock data from the application
- Ensure proper database integration for all features
- Migrate any hardcoded data to database seeds
- Validate data integrity across all domains

## Estimated Effort
**Duration:** 1-2 weeks  
**Complexity:** Medium  
**Risk:** Low (primarily removal)

## Detailed Action Steps

### 4.1 Audit Mock Data Locations

**Files with mock data (from current analysis):**
1. `server/routes/counselor.ts` - Mock documents (lines 85-118)
2. Other route files - Need to search for:
   - Array literals returning fake data
   - Hardcoded IDs
   - TODO comments mentioning mock data
   - Functions generating sample data

**Audit Command:**
```bash
grep -r "TODO" server/routes/ | grep -i "mock\|sample\|hardcoded\|fake"
grep -r "const mock" server/
grep -r "// Sample" server/
```

### 4.2 Replace Mock Data with Database Queries

**Example: Remove Mock Documents**

**Before (`server/routes/counselor.ts`):**
```typescript
router.get('/student-documents/:studentId', async (req: Request, res: Response) => {
  const mockDocuments = [
    {
      id: '1',
      name: 'Passport Copy',
      type: 'transcript',
      // ... more mock data
    }
  ];
  return sendSuccess(res, mockDocuments);
});
```

**After (using service layer):**
```typescript
// In counselor.controller.ts
async getStudentDocuments(req: AuthenticatedRequest, res: Response) {
  try {
    const { studentId } = req.params;
    const counselorId = this.getUserId(req);
    
    // Verify counselor has access to this student
    const hasAccess = await counselorService.verifyCounselorAccess(counselorId, studentId);
    if (!hasAccess) {
      return this.sendError(res, 403, 'ACCESS_DENIED', 'You do not have access to this student');
    }
    
    // Get real documents from database
    const documents = await documentService.getDocumentsByStudent(studentId);
    
    return this.sendSuccess(res, documents);
  } catch (error) {
    return this.handleError(res, error, 'CounselorController.getStudentDocuments');
  }
}
```

### 4.3 Create Database Seeders

**File:** `server/seeds/development.seed.ts`

```typescript
import { db } from '../db';
import { universities, courses } from '@shared/schema';

export async function seedDevelopmentData() {
  console.log('🌱 Seeding development data...');

  // Seed universities
  const sampleUniversities = [
    {
      name: 'University of Oxford',
      country: 'United Kingdom',
      ranking: 1,
      tuitionFee: 9250,
      description: 'Leading research university'
    },
    // ... more sample data
  ];

  for (const uni of sampleUniversities) {
    await db.insert(universities).values(uni).onConflictDoNothing();
  }

  console.log('✅ Development data seeded successfully');
}
```

**File:** `server/seeds/production.seed.ts`

```typescript
export async function seedProductionData() {
  // Only essential data for production
  console.log('🌱 Seeding production data...');
  
  // Create default admin if not exists
  // Create default settings
  // etc.
  
  console.log('✅ Production data seeded');
}
```

### 4.4 Validation & Testing

**Create validation script:**

**File:** `server/scripts/validate-no-mock-data.ts`

```typescript
import * as fs from 'fs';
import * as path from 'path';

const MOCK_PATTERNS = [
  /const mock\w+\s*=\s*\[/,
  /\/\/\s*TODO.*mock/i,
  /\/\/\s*Sample data/i,
  /hardcoded/i
];

function scanDirectory(dir: string): string[] {
  const issues: string[] = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      issues.push(...scanDirectory(fullPath));
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        MOCK_PATTERNS.forEach(pattern => {
          if (pattern.test(line)) {
            issues.push(`${fullPath}:${index + 1} - ${line.trim()}`);
          }
        });
      });
    }
  }

  return issues;
}

console.log('🔍 Scanning for mock data...');
const issues = scanDirectory('./server');

if (issues.length > 0) {
  console.error('❌ Found potential mock data:');
  issues.forEach(issue => console.error(issue));
  process.exit(1);
} else {
  console.log('✅ No mock data found!');
}
```

## Files to Create/Modify/Delete

### Create
- ✅ `server/seeds/development.seed.ts`
- ✅ `server/seeds/production.seed.ts`
- ✅ `server/scripts/validate-no-mock-data.ts`

### Modify
- 🔄 All route/controller files with mock data
- 🔄 Services to fetch real data
- 🔄 Add database queries where needed

### Delete
- ❌ All mock data arrays and functions
- ❌ Commented-out TODO notes about mock data

## Best Practices to Follow

1. **Never Mock in Production Code:** Use seeders for test data
2. **Validate Data Exists:** Check database before removing mocks
3. **Graceful Degradation:** Return empty arrays, not errors, when no data
4. **Clear Errors:** If data is required, clear error messages
5. **Testing:** Use factories for test data, not mocks in code

## Testing Requirements

```typescript
// Test that endpoints return real data
describe('Document Endpoints', () => {
  it('should return real documents from database', async () => {
    // Create test document in database
    const doc = await documentRepository.create({
      userId: testUser.id,
      name: 'Test Document',
      type: 'transcript'
    });

    const response = await request(app)
      .get(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.body.data).toEqual(expect.objectContaining({
      id: doc.id,
      name: 'Test Document'
    }));
  });

  it('should return empty array when no documents exist', async () => {
    const response = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${token}`);

    expect(response.body.data).toEqual([]);
  });
});
```

## Rollback Plan

### Steps
1. Re-add mock data temporarily if database queries fail
2. Fix database queries
3. Remove mocks again
4. Low risk - can rollback individual endpoints

## Success Metrics

- ✅ Zero mock data in production code (validated by script)
- ✅ All endpoints return real database data
- ✅ Comprehensive seeders for development
- ✅ All tests use real data or factories
- ✅ No hardcoded IDs in code

---

# PHASE 5: Frontend Modularization

## Goals
- Break down large page components into smaller, reusable pieces
- Extract shared UI logic into custom hooks
- Organize components by feature/domain
- Improve component reusability and testability

## Estimated Effort
**Duration:** 2-3 weeks  
**Complexity:** Medium  
**Risk:** Low (UI-only changes)

## Detailed Action Steps

### 5.1 Audit Large Components

**Current structure needs improvement:**
```
client/src/pages/
  ├── Dashboard.tsx (potentially large)
  ├── StudentDashboard.tsx
  ├── AdminDashboard.tsx
  ├── Profile.tsx
  ├── Universities.tsx
  └── Applications.tsx
```

**Analyze component sizes:**
```bash
wc -l client/src/pages/*.tsx
```

### 5.2 Create Feature-Based Organization

**New structure:**
```
client/src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── PasswordResetForm.tsx
│   │   ├── hooks/
│   │   │   ├── useLogin.ts
│   │   │   └── useRegister.ts
│   │   ├── services/
│   │   │   └── auth.api.ts
│   │   └── types.ts
│   │
│   ├── universities/
│   │   ├── components/
│   │   │   ├── UniversityCard.tsx
│   │   │   ├── UniversityList.tsx
│   │   │   ├── UniversityFilters.tsx
│   │   │   └── UniversityDetails.tsx
│   │   ├── hooks/
│   │   │   ├── useUniversities.ts
│   │   │   └── useUniversitySearch.ts
│   │   ├── services/
│   │   │   └── university.api.ts
│   │   └── types.ts
│   │
│   ├── applications/
│   ├── forum/
│   ├── profile/
│   └── admin/
│
├── components/ (shared UI components)
│   ├── ui/ (existing shadcn components)
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   └── common/
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       └── EmptyState.tsx
│
├── hooks/ (shared custom hooks)
│   ├── useAuth.tsx (existing)
│   ├── useApi.ts
│   └── useDebounce.ts
│
└── pages/ (route containers only)
    ├── Home.tsx
    ├── Dashboard.tsx (composition of features)
    └── ...
```

### 5.3 Extract Feature Components

**Example: Universities Feature**

**File:** `client/src/features/universities/components/UniversityCard.tsx`

```typescript
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { University } from '@shared/schema';

interface UniversityCardProps {
  university: University;
  onApply?: (university: University) => void;
  onViewDetails?: (university: University) => void;
}

export function UniversityCard({ university, onApply, onViewDetails }: UniversityCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-semibold">{university.name}</h3>
          <Badge variant="secondary">#{university.ranking}</Badge>
        </div>
        <p className="text-sm text-gray-600">{university.country}</p>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm line-clamp-3">{university.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-lg font-bold">
            ${university.tuitionFee?.toLocaleString()}/year
          </span>
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-2">
        {onViewDetails && (
          <Button variant="outline" onClick={() => onViewDetails(university)}>
            View Details
          </Button>
        )}
        {onApply && (
          <Button onClick={() => onApply(university)}>
            Apply Now
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
```

**File:** `client/src/features/universities/hooks/useUniversities.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { universityApi } from '../services/university.api';
import { University } from '@shared/schema';

export function useUniversities(filters?: any) {
  return useQuery({
    queryKey: ['universities', filters],
    queryFn: () => universityApi.getAll(filters)
  });
}

export function useUniversity(id: string) {
  return useQuery({
    queryKey: ['university', id],
    queryFn: () => universityApi.getById(id),
    enabled: !!id
  });
}

export function useUniversitySearch(query: string) {
  return useQuery({
    queryKey: ['universities', 'search', query],
    queryFn: () => universityApi.search(query),
    enabled: query.length > 2
  });
}

export function useCreateUniversity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<University>) => universityApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['universities'] });
    }
  });
}
```

**File:** `client/src/features/universities/services/university.api.ts`

```typescript
import { api } from '@/lib/api-client';
import { University } from '@shared/schema';

export const universityApi = {
  async getAll(filters?: any): Promise<University[]> {
    return api.get('/api/universities', { params: filters });
  },

  async getById(id: string): Promise<University> {
    return api.get(`/api/universities/${id}`);
  },

  async search(query: string, filters?: any): Promise<University[]> {
    return api.get('/api/universities/search', { 
      params: { q: query, ...filters } 
    });
  },

  async create(data: Partial<University>): Promise<University> {
    return api.post('/api/universities', data);
  },

  async update(id: string, data: Partial<University>): Promise<University> {
    return api.put(`/api/universities/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return api.delete(`/api/universities/${id}`);
  }
};
```

### 5.4 Refactor Page Components

**Before (`client/src/pages/Universities.tsx`):**
```typescript
// 300+ lines of mixed concerns
export default function Universities() {
  // All logic, UI, and API calls in one file
  // ...
}
```

**After (composition approach):**
```typescript
import { UniversityList } from '@/features/universities/components/UniversityList';
import { UniversityFilters } from '@/features/universities/components/UniversityFilters';
import { useUniversities } from '@/features/universities/hooks/useUniversities';
import { useState } from 'react';

export default function Universities() {
  const [filters, setFilters] = useState({});
  const { data: universities, isLoading, error } = useUniversities(filters);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Universities</h1>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3">
          <UniversityFilters filters={filters} onChange={setFilters} />
        </div>
        
        <div className="col-span-9">
          <UniversityList 
            universities={universities} 
            onApply={(uni) => navigate(`/apply/${uni.id}`)}
          />
        </div>
      </div>
    </div>
  );
}
```

### 5.5 Extract Shared Hooks

**File:** `client/src/hooks/useDebounce.ts`

```typescript
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

**File:** `client/src/hooks/useApi.ts`

```typescript
import { useState, useCallback } from 'react';
import { ApiError } from '@/lib/api-client';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setState({ data: null, loading: true, error: null });

    try {
      const data = await apiCall();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError(
        'UNKNOWN_ERROR',
        'An unexpected error occurred',
        500
      );
      setState({ data: null, loading: false, error: apiError });
      throw apiError;
    }
  }, []);

  return { ...state, execute };
}
```

## Files to Create/Modify/Delete

### Create (50+ files)
- ✅ Feature-based component structure (7-8 features × 4-6 components each)
- ✅ Feature-specific hooks (7-8 features × 2-3 hooks each)
- ✅ Feature-specific API services (7-8 features)
- ✅ Shared hooks (3-5 new hooks)
- ✅ Shared UI components

### Modify
- 🔄 All page components (composition instead of monolithic)
- 🔄 Existing components to use new structure

### Delete
- ❌ Duplicated component code
- ❌ Inline business logic in pages

## Best Practices to Follow

1. **Component Composition:** Build UIs from small, focused components
2. **Single Responsibility:** Each component does one thing well
3. **Custom Hooks:** Extract reusable logic into hooks
4. **Type Safety:** Strong TypeScript typing throughout
5. **Accessibility:** ARIA labels, keyboard navigation
6. **Performance:** Memoization, lazy loading where appropriate

## Testing Requirements

```typescript
// client/src/features/universities/components/__tests__/UniversityCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { UniversityCard } from '../UniversityCard';

describe('UniversityCard', () => {
  const mockUniversity = {
    id: '1',
    name: 'Test University',
    country: 'UK',
    ranking: 10,
    tuitionFee: 20000
  };

  it('renders university information correctly', () => {
    render(<UniversityCard university={mockUniversity} />);
    
    expect(screen.getByText('Test University')).toBeInTheDocument();
    expect(screen.getByText('UK')).toBeInTheDocument();
    expect(screen.getByText('#10')).toBeInTheDocument();
  });

  it('calls onApply when apply button clicked', () => {
    const onApply = vi.fn();
    render(<UniversityCard university={mockUniversity} onApply={onApply} />);
    
    fireEvent.click(screen.getByText('Apply Now'));
    expect(onApply).toHaveBeenCalledWith(mockUniversity);
  });
});
```

## Rollback Plan

### Steps
1. Frontend changes are isolated - can rollback individual features
2. No backend dependencies - safe to iterate
3. Feature flags for gradual rollout
4. Keep old components during migration

## Success Metrics

- ✅ Average component size < 200 lines
- ✅ 80%+ component reusability
- ✅ Zero duplicate business logic
- ✅ Feature-based organization complete
- ✅ 70%+ test coverage for components

---

# PHASE 6: Quality Assurance & Documentation

## Goals
- Comprehensive testing at all layers
- Complete API documentation
- Code quality tools and enforcement
- Performance optimization
- Security audit and hardening

## Estimated Effort
**Duration:** 2-3 weeks  
**Complexity:** Medium  
**Risk:** Low (quality improvements)

## Detailed Action Steps

### 6.1 Testing Infrastructure

**Unit Tests:**
- Repository layer: 80% coverage
- Service layer: 85% coverage
- Controllers: 75% coverage
- Frontend components: 70% coverage

**Integration Tests:**
```typescript
// server/__tests__/integration/auth.integration.test.ts
import request from 'supertest';
import { app } from '../../index';
import { db } from '../../db';

describe('Auth Integration', () => {
  beforeAll(async () => {
    // Setup test database
  });

  afterAll(async () => {
    // Cleanup
  });

  it('should complete full registration flow', async () => {
    const userData = {
      email: 'integration@test.com',
      password: 'TestPass123!',
      firstName: 'John',
      lastName: 'Doe'
    };

    // Register
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send(userData);

    expect(registerRes.status).toBe(200);
    const { token } = registerRes.body.data;

    // Verify token works
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe(userData.email);
  });
});
```

**E2E Tests:**
```typescript
// e2e/auth.spec.ts (Playwright)
import { test, expect } from '@playwright/test';

test('user can register and login', async ({ page }) => {
  await page.goto('/auth');
  
  // Fill registration form
  await page.fill('[name="email"]', 'e2e@test.com');
  await page.fill('[name="password"]', 'TestPass123!');
  await page.fill('[name="firstName"]', 'John');
  await page.fill('[name="lastName"]', 'Doe');
  
  await page.click('button[type="submit"]');
  
  // Should redirect to dashboard
  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Welcome');
});
```

### 6.2 API Documentation

**File:** `docs/api/README.md`

```markdown
# EduPath API Documentation

## Authentication

### POST /api/auth/register
Register a new student account.

**Request Body:**
```json
{
  "email": "student@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "nationality": "US"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "student@example.com",
      ...
    },
    "token": "jwt-token"
  }
}
```

**Errors:**
- 409: EMAIL_EXISTS - Email already registered
- 422: VALIDATION_ERROR - Invalid input data
```

**Use OpenAPI/Swagger:**

**File:** `server/swagger.ts`

```typescript
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EduPath API',
      version: '1.0.0',
      description: 'International Education Platform API'
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      }
    ]
  },
  apis: ['./server/routes/*.ts', './server/controllers/*.ts']
};

export const specs = swaggerJsdoc(options);

// In server/index.ts:
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
```

### 6.3 Code Quality Tools

**ESLint Configuration:**

**File:** `eslint.config.js` (update)

```javascript
export default [
  {
    rules: {
      // Enforce best practices
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      
      // Code organization
      'import/order': ['error', {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling'],
        'newlines-between': 'always'
      }],
      
      // Security
      'no-eval': 'error',
      'no-implied-eval': 'error'
    }
  }
];
```

**Prettier Configuration:**

**File:** `.prettierrc`

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

**Pre-commit Hooks:**

**File:** `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run linter
npm run lint

# Run type check
npm run type-check

# Run tests
npm run test:changed
```

### 6.4 Performance Optimization

**Database Indexing:**

```typescript
// Add indexes to frequently queried fields
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_students_user_id ON student_profiles(user_id);
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_forum_posts_category ON forum_posts(category);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
```

**Query Optimization:**

```typescript
// Bad: N+1 query problem
const students = await studentRepo.findAll();
for (const student of students) {
  student.documents = await documentRepo.findByUserId(student.userId);
}

// Good: Single query with join
const students = await db
  .select()
  .from(studentProfiles)
  .leftJoin(documents, eq(documents.userId, studentProfiles.userId));
```

**Caching Strategy:**

```typescript
// server/services/infrastructure/cache.service.ts
import memoize from 'memoizee';

export class CacheService {
  // Cache university list for 5 minutes
  getUniversities = memoize(
    async (filters: any) => {
      return universityRepository.findAll(filters);
    },
    { maxAge: 5 * 60 * 1000, promise: true }
  );

  invalidateUniversities() {
    this.getUniversities.clear();
  }
}
```

### 6.5 Security Hardening

**Security Checklist:**
- ✅ SQL Injection: Using Drizzle ORM (parameterized queries)
- ✅ XSS: Input sanitization, CSP headers
- ✅ CSRF: CSRF tokens on state-changing requests
- ✅ Authentication: JWT with secure cookies
- ✅ Authorization: Role-based access control
- ✅ Rate Limiting: Login, registration endpoints
- ✅ Input Validation: Zod schemas everywhere
- ✅ Secrets Management: Environment variables
- ✅ HTTPS: Enforced in production
- ✅ Dependency Scanning: npm audit, Snyk

**Security Middleware:**

```typescript
// server/middleware/security-headers.ts
import helmet from 'helmet';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
});
```

### 6.6 Monitoring & Logging

**Structured Logging:**

```typescript
// server/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

## Files to Create/Modify/Delete

### Create (20+ files)
- ✅ Test files for all layers
- ✅ API documentation
- ✅ Integration tests
- ✅ E2E tests
- ✅ Performance monitoring
- ✅ Security middleware

### Modify
- 🔄 ESLint config
- 🔄 CI/CD pipelines
- 🔄 Package.json scripts

## Best Practices to Follow

1. **Test Pyramid:** More unit tests, fewer E2E tests
2. **Documentation:** Keep docs in sync with code
3. **Code Reviews:** Mandatory reviews before merge
4. **Monitoring:** Log important events
5. **Security First:** Regular audits

## Testing Requirements

**Coverage Goals:**
- Unit Tests: 80%+
- Integration Tests: Key user flows
- E2E Tests: Critical paths
- Performance Tests: Response time < 200ms for 95th percentile

## Rollback Plan

Quality improvements can be added incrementally with minimal risk.

## Success Metrics

- ✅ 80%+ code coverage
- ✅ Zero high-severity security vulnerabilities
- ✅ API documentation 100% complete
- ✅ All quality gates pass
- ✅ Performance benchmarks met

---

# Implementation Timeline

## Overall Schedule

| Phase | Duration | Dependencies | Risk Level |
|-------|----------|--------------|------------|
| Phase 1: Repository Pattern | 2-3 weeks | None | Low |
| Phase 2: Service Layer | 3-4 weeks | Phase 1 | Medium |
| Phase 3: Controller Layer | 3-4 weeks | Phase 2 | Medium |
| Phase 4: Mock Data Removal | 1-2 weeks | Phase 3 | Low |
| Phase 5: Frontend Modularization | 2-3 weeks | Phase 3 | Low |
| Phase 6: QA & Documentation | 2-3 weeks | All previous | Low |

**Total Duration:** 13-19 weeks (~3-5 months)

## Recommended Approach

1. **Incremental Migration:** Complete one phase before starting next
2. **Parallel Work:** Phases 4, 5 can run in parallel after Phase 3
3. **Continuous Testing:** Test after each phase
4. **Stakeholder Reviews:** Demo after each phase
5. **Documentation:** Update as you go, not at the end

---

# Risk Management

## High-Risk Areas

### 1. Breaking Changes During Migration
**Mitigation:**
- Feature flags for gradual rollout
- Dual implementation during transition
- Comprehensive integration tests
- Canary deployments

### 2. Data Integrity Issues
**Mitigation:**
- Extensive testing before removing mocks
- Database backups before migrations
- Validation scripts
- Rollback procedures documented

### 3. Performance Degradation
**Mitigation:**
- Benchmark before/after each phase
- Load testing in staging
- Query optimization
- Caching strategy

### 4. Team Learning Curve
**Mitigation:**
- Training sessions for new patterns
- Code review guidelines
- Pair programming
- Documentation and examples

---

# Tools & Technologies

## Required
- **TypeScript** - Type safety
- **Drizzle ORM** - Database access
- **Zod** - Validation
- **Express** - Web framework
- **React** - Frontend
- **Vitest** - Testing
- **ESLint** - Code quality

## Recommended
- **Swagger/OpenAPI** - API documentation
- **Winston** - Logging
- **Helmet** - Security headers
- **Playwright** - E2E testing
- **Husky** - Git hooks

---

# Success Criteria

## Technical Metrics
- ✅ Code coverage > 80%
- ✅ Zero critical security vulnerabilities
- ✅ API response time < 200ms (p95)
- ✅ Zero production errors from refactoring
- ✅ Clear separation of concerns (100%)

## Code Quality Metrics
- ✅ Average file size < 300 lines
- ✅ Cyclomatic complexity < 10
- ✅ Zero circular dependencies
- ✅ 100% TypeScript (no `any`)

## Team Metrics
- ✅ Developer satisfaction improved
- ✅ Onboarding time reduced by 50%
- ✅ Bug fix time reduced by 40%
- ✅ Feature development velocity increased

---

# Conclusion

This 6-phase modularization plan transforms the EduPath webapp from a monolithic architecture into a maintainable, scalable, industry-standard application. Each phase builds upon the previous, minimizing risk while delivering incremental value.

**Key Takeaways:**
1. **Start with Data Layer:** Repository pattern provides foundation
2. **Extract Business Logic:** Services ensure testability and reusability
3. **Thin Controllers:** Route handlers become simple coordinators
4. **Clean Up Technical Debt:** Remove mocks, improve frontend
5. **Maintain Quality:** Testing and documentation throughout

**Next Steps:**
1. Get stakeholder approval for this plan
2. Allocate team resources
3. Set up project tracking (Jira/Linear)
4. Begin Phase 1 implementation
5. Schedule weekly reviews

**Estimated ROI:**
- **Maintainability:** 70% reduction in bug fix time
- **Scalability:** Easy to add new features
- **Team Velocity:** 50% faster development after migration
- **Code Quality:** Professional, enterprise-grade codebase

---

*Document Version: 1.0*  
*Last Updated: [Current Date]*  
*Authors: EduPath Engineering Team*

---

