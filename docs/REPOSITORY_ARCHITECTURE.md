# Repository Architecture Guide

## Overview

This document describes the repository layer architecture for the EduPath application. All database operations are handled through a well-structured repository layer that follows SOLID principles and provides a consistent, type-safe interface for data access.

## Architecture Principles

### 1. Single Responsibility Principle
Each repository manages exactly **one domain entity**. This ensures:
- Clear ownership of data operations
- Easy to locate and modify code
- Reduced coupling between components
- Better testability

### 2. Interface Segregation
Every repository exports an interface defining its contract:
```typescript
export interface IUserRepository {
  findById(id: string): Promise<User>;
  findByEmail(email: string): Promise<User | undefined>;
  create(data: InsertUser): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  delete(id: string): Promise<boolean>;
}
```

### 3. Dependency Inversion
Services depend on repository interfaces, not concrete implementations:
```typescript
export class UserService {
  constructor(
    private userRepository: IUserRepository = container.get(TYPES.IUserRepository)
  ) {}
}
```

## Repository Structure

### Base Repository

All repositories extend `BaseRepository<T, TInsert>` which provides:

**Core CRUD Operations:**
- `findById(id: string): Promise<T>` - Find by primary key (throws NotFoundError if missing)
- `findByIdOptional(id: string): Promise<T | undefined>` - Find by ID, returns undefined if not found
- `findAll(filters?: any): Promise<T[]>` - Find all with optional filtering
- `findOne(condition: any): Promise<T | undefined>` - Find single record by condition
- `create(data: TInsert): Promise<T>` - Insert new record
- `update(id: string, data: Partial<T>): Promise<T>` - Update existing record
- `delete(id: string): Promise<boolean>` - Delete record

**Helper Methods:**
- `paginate<T>(query, options)` - Pagination with total count and hasMore flag
- `buildFilters(filters)` - Build WHERE conditions from filter object
- `executeInTransaction(callback)` - Execute operations in atomic transaction

**Transaction Support:**
All methods accept optional `tx?: DbOrTransaction` parameter for transactional operations.

### Repository Pattern

```typescript
// 1. Define Interface
export interface IStudentRepository {
  findById(id: string): Promise<StudentProfile>;
  findByUserId(userId: string): Promise<StudentProfile | undefined>;
  create(data: InsertStudentProfile): Promise<StudentProfile>;
  // ... additional methods
}

// 2. Implement Repository
export class StudentRepository extends BaseRepository<StudentProfile, InsertStudentProfile> 
  implements IStudentRepository {
  
  constructor() {
    super(studentProfiles, 'id');
  }

  async findByUserId(userId: string): Promise<StudentProfile | undefined> {
    try {
      return await this.findOne(eq(studentProfiles.userId, userId));
    } catch (error) {
      handleDatabaseError(error, 'StudentRepository.findByUserId');
    }
  }
}

// 3. Export Singleton Instance
export const studentRepository = new StudentRepository();
```

## Repository Catalog

### User Management
- **UserRepository** - User accounts, authentication, profiles
- **StudentRepository** - Student profiles and academic information
- **CounselorAssignmentRepository** - Student-counselor relationships

### Education Domain
- **UniversityRepository** - University records and metadata
- **CourseRepository** - University courses and programs
- **ApplicationRepository** - Student applications to universities
- **DocumentRepository** - Application documents and files

### Community Forum
- **ForumPostRepository** - Forum posts with pagination and filtering
- **ForumCommentRepository** - Post comments and replies
- **ForumInteractionRepository** - Likes, saves, and engagement
- **ForumPollRepository** - Polls, voting, and results
- **ForumReportsRepository** - Content moderation and reports

### Communication
- **NotificationRepository** - User notifications and alerts
- **ChatRepository** - Direct messaging between users

### Events & Activities
- **EventRepository** - Event management and registrations

### AI & Matching
- **AIMatchingRepository** - University matching results and recommendations

### Payments & Subscriptions
- **PaymentRepository** - Payment transactions and history
- **SubscriptionPlanRepository** - Subscription plans and features
- **UserSubscriptionRepository** - User subscription records

### System Management
- **SecuritySettingsRepository** - Global security settings
- **TestimonialRepository** - User testimonials and reviews
- **StudentTimelineRepository** - Student progress timeline
- **StaffInvitationRepository** - Staff invitation links and tracking

## Error Handling

### Custom Error Classes

Located in `server/repositories/errors.ts`:

```typescript
// Entity not found
throw new NotFoundError('User', userId);

// Duplicate entry (unique constraint violation)
throw new DuplicateError('User', 'email', email);

// Generic database error
throw new DatabaseError('Operation failed', originalError);
```

### Error Handling Pattern

```typescript
async findById(id: string): Promise<User> {
  try {
    const results = await db.select()...;
    
    if (!results[0]) {
      throw new NotFoundError('User', id);
    }
    
    return results[0];
  } catch (error) {
    handleDatabaseError(error, 'UserRepository.findById');
  }
}
```

### Service Layer Error Transformation

Services catch repository errors and transform them:
```typescript
async getUserById(userId: string): Promise<User> {
  try {
    return await this.userRepository.findById(userId);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw new Error('USER_NOT_FOUND');
    }
    throw error;
  }
}
```

## Transaction Support

### Simple Transactions

```typescript
async createStudentWithProfile(userData: InsertUser, profileData: InsertStudentProfile) {
  return await this.executeInTransaction(async (tx) => {
    // Create user
    const user = await this.userRepository.create(userData, tx);
    
    // Create profile linked to user
    const profile = await this.studentRepository.create({
      ...profileData,
      userId: user.id
    }, tx);
    
    return { user, profile };
  });
}
```

### Atomic Operations

The `StaffInvitationRepository.claimAndInvalidate()` example:
```typescript
async claimAndInvalidate(token: string): Promise<StaffInvitationLink | undefined> {
  return await this.executeInTransaction(async (tx) => {
    // Find active link
    const [link] = await tx
      .select()
      .from(staffInvitationLinks)
      .where(and(
        eq(staffInvitationLinks.token, token),
        eq(staffInvitationLinks.isActive, true)
      ))
      .limit(1);

    if (!link) return undefined;

    // Atomically increment usage and deactivate
    const [updated] = await tx
      .update(staffInvitationLinks)
      .set({
        usedCount: sql`${staffInvitationLinks.usedCount} + 1`,
        lastUsedAt: new Date(),
        isActive: false
      })
      .where(eq(staffInvitationLinks.id, link.id))
      .returning();

    return updated;
  });
}
```

## Pagination & Filtering

### Using Pagination Helper

```typescript
async findPaginated(
  filters: ForumPostFilters,
  limit: number = 20,
  offset: number = 0
): Promise<PaginatedResult<ForumPostEnhanced>> {
  const conditions = this.buildPostFilters(filters);
  
  let query = db.select().from(forumPostsEnhanced);
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return await this.paginate(query, { limit, offset });
}
```

### Filter Building

```typescript
private buildPostFilters(filters?: ForumPostFilters): any[] {
  if (!filters) return [];
  
  const conditions: any[] = [];
  
  if (filters.category) {
    conditions.push(eq(forumPostsEnhanced.category, filters.category));
  }
  
  if (filters.search) {
    conditions.push(
      or(
        ilike(forumPostsEnhanced.title, `%${filters.search}%`),
        ilike(forumPostsEnhanced.content, `%${filters.search}%`)
      )
    );
  }
  
  return conditions;
}
```

## Dependency Injection

### Container Configuration

Located in `server/services/container.ts`:

```typescript
export const TYPES = {
  IUserRepository: Symbol.for('IUserRepository'),
  IStudentRepository: Symbol.for('IStudentRepository'),
  // ... all repository tokens
};

class Container {
  private bindings = new Map<symbol, any>();
  
  constructor() {
    this.bindings.set(TYPES.IUserRepository, userRepository);
    this.bindings.set(TYPES.IStudentRepository, studentRepository);
    // ... all repository bindings
  }
  
  get<T>(token: symbol): T {
    return this.bindings.get(token);
  }
}

export const container = new Container();
```

### Service Injection

```typescript
export class ForumService extends BaseService {
  constructor(
    private forumPostRepository: IForumPostRepository = 
      container.get(TYPES.IForumPostRepository),
    private forumCommentRepository: IForumCommentRepository = 
      container.get(TYPES.IForumCommentRepository),
    private forumInteractionRepository: IForumInteractionRepository = 
      container.get(TYPES.IForumInteractionRepository)
  ) {
    super();
  }
}
```

### Testing with Mocks

```typescript
describe('ForumService', () => {
  it('should create post', async () => {
    const mockRepository: IForumPostRepository = {
      create: vi.fn().mockResolvedValue(mockPost),
      findById: vi.fn(),
      // ... all interface methods
    };
    
    const service = new ForumService(mockRepository);
    const result = await service.createPost(postData);
    
    expect(result).toEqual(mockPost);
    expect(mockRepository.create).toHaveBeenCalledWith(postData);
  });
});
```

## Best Practices

### 1. Repository Method Naming
- Use descriptive names: `findByEmail`, `findActiveByToken`
- Return types indicate optionality: `Promise<T>` throws error, `Promise<T | undefined>` returns undefined
- Suffix with `Optional` when needed: `findByIdOptional`

### 2. Transaction Usage
- Use transactions for multi-step operations that must succeed or fail together
- Keep transactions short and focused
- Always return a value from transaction callbacks

### 3. Error Messages
- Be specific in error messages: include entity type and identifier
- Use structured errors that can be caught and transformed
- Include context for debugging: `'UserRepository.findByEmail'`

### 4. Type Safety
- Always define proper TypeScript interfaces
- Use Drizzle schema types for consistency
- Avoid `any` types - use proper generics

### 5. Query Optimization
- Use `limit(1)` for single record queries
- Leverage indexes defined in schema
- Use pagination for large result sets
- Consider using `findOne` helper for simple queries

### 6. Separation of Concerns
- Keep business logic in services, not repositories
- Repositories only handle data access
- Let services orchestrate multiple repository calls
- Controllers handle HTTP concerns only

## Migration Guide for New Features

### Adding a New Repository

1. **Define the Interface:**
```typescript
// server/repositories/your-entity.repository.ts
export interface IYourEntityRepository {
  findById(id: string): Promise<YourEntity>;
  // ... methods
}
```

2. **Implement Repository:**
```typescript
export class YourEntityRepository 
  extends BaseRepository<YourEntity, InsertYourEntity>
  implements IYourEntityRepository {
  
  constructor() {
    super(yourEntitiesTable, 'id');
  }
  
  // Custom methods here
}

export const yourEntityRepository = new YourEntityRepository();
```

3. **Add to Repository Index:**
```typescript
// server/repositories/index.ts
export { 
  IYourEntityRepository, 
  yourEntityRepository 
} from './your-entity.repository';
```

4. **Register in DI Container:**
```typescript
// server/services/container.ts
export const TYPES = {
  // ...
  IYourEntityRepository: Symbol.for('IYourEntityRepository'),
};

// In constructor
this.bindings.set(TYPES.IYourEntityRepository, yourEntityRepository);
```

5. **Inject into Services:**
```typescript
export class YourService extends BaseService {
  constructor(
    private yourEntityRepository: IYourEntityRepository = 
      container.get(TYPES.IYourEntityRepository)
  ) {
    super();
  }
}
```

## Common Patterns

### Pattern 1: Find or Create
```typescript
async findOrCreate(email: string, userData: InsertUser): Promise<User> {
  const existing = await this.findByEmail(email);
  if (existing) return existing;
  
  return await this.create(userData);
}
```

### Pattern 2: Soft Delete
```typescript
async softDelete(id: string): Promise<boolean> {
  const updated = await this.update(id, { 
    deletedAt: new Date(),
    isActive: false 
  });
  return !!updated;
}
```

### Pattern 3: Bulk Operations
```typescript
async createMany(items: InsertItem[]): Promise<Item[]> {
  return await this.executeInTransaction(async (tx) => {
    const results = [];
    for (const item of items) {
      results.push(await this.create(item, tx));
    }
    return results;
  });
}
```

### Pattern 4: Counting with Filters
```typescript
async count(filters?: EntityFilters): Promise<number> {
  const conditions = this.buildFilters(filters);
  
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(this.table)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  
  return Number(result.count);
}
```

## Performance Considerations

### 1. Query Optimization
- Use `select()` to fetch only needed columns
- Add indexes for frequently queried fields
- Use joins carefully - avoid N+1 queries
- Consider pagination for large datasets

### 2. Caching Strategy
- Implement caching at service layer, not repository
- Cache frequently accessed, rarely changed data
- Invalidate cache on updates
- Consider Redis for distributed caching

### 3. Connection Pooling
- Drizzle handles connection pooling automatically
- Configure pool size in database configuration
- Monitor connection usage in production
- Use transactions for batch operations

## Troubleshooting

### Common Issues

**1. "NotFoundError: User with id X not found"**
- Repository throws error when using `findById`
- Use `findByIdOptional` if undefined is acceptable
- Catch and handle in service layer

**2. "DuplicateError: User with email already exists"**
- Unique constraint violation
- Check for existing record before insert
- Handle in service with appropriate error message

**3. "Transaction already closed"**
- Don't hold transactions open too long
- Complete all operations quickly
- Avoid async operations outside transaction callback

**4. TypeScript errors: "Property X does not exist"**
- Ensure interface matches implementation
- Update DI container bindings
- Regenerate types if schema changed

## Testing Repositories

### Unit Testing
```typescript
describe('UserRepository', () => {
  beforeEach(async () => {
    // Clean database
    await db.delete(users);
  });

  it('should create user', async () => {
    const userData = { email: 'test@example.com', ... };
    const user = await userRepository.create(userData);
    
    expect(user.id).toBeDefined();
    expect(user.email).toBe(userData.email);
  });

  it('should throw NotFoundError when user not found', async () => {
    await expect(
      userRepository.findById('nonexistent')
    ).rejects.toThrow(NotFoundError);
  });
});
```

### Integration Testing
```typescript
describe('User Creation Flow', () => {
  it('should create user and student profile', async () => {
    const result = await userService.createStudent({
      email: 'student@example.com',
      firstName: 'John',
      // ...
    });
    
    expect(result.user).toBeDefined();
    expect(result.profile).toBeDefined();
    expect(result.profile.userId).toBe(result.user.id);
  });
});
```

## Architecture Decisions

### Why Repository Pattern?
- **Separation of Concerns:** Data access logic separated from business logic
- **Testability:** Easy to mock for unit testing
- **Flexibility:** Can swap implementations (e.g., cache layer)
- **Consistency:** Standardized data access patterns

### Why Dependency Injection?
- **Loose Coupling:** Services don't depend on concrete implementations
- **Testability:** Easy to inject mocks for testing
- **Maintainability:** Changes to repositories don't affect services
- **Scalability:** Easy to add new dependencies

### Why Transaction Support?
- **Data Integrity:** Multi-step operations succeed or fail atomically
- **Consistency:** Prevent partial updates
- **Reliability:** Handle race conditions properly
- **Safety:** Rollback on errors

## Resources

- **Drizzle ORM Docs:** https://orm.drizzle.team/
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/
- **SOLID Principles:** https://en.wikipedia.org/wiki/SOLID
- **Repository Pattern:** https://martinfowler.com/eaaCatalog/repository.html

## Conclusion

The repository architecture provides a solid foundation for data access in the EduPath application. By following these patterns and best practices, developers can build robust, maintainable, and testable features efficiently.

For questions or improvements to this architecture, please contact the development team or create an issue in the project repository.
