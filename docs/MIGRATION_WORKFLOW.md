# Database Migration Workflow

**Last Updated:** October 22, 2025  
**Version:** 1.0

This guide explains how to work with database migrations in the EduPath application using Drizzle Kit.

---

## Making Schema Changes

### 1. Modify Schema
Edit `shared/schema.ts` with your changes

**Examples:**
- Add a new table
- Add a column to an existing table
- Modify an enum
- Add an index
- Change a default value

### 2. Generate Migration
```bash
npm run db:generate
```
This creates a new migration file in `migrations/` with a timestamp prefix (e.g., `0001_add_user_preferences.sql`)

### 3. Review Generated SQL
Open the new migration file and verify SQL looks correct

**Check for:**
- Correct table/column names
- Proper data types
- Default values are set
- Foreign keys reference correct tables
- Enums have all expected values

### 4. Apply Locally
```bash
npm run db:migrate
```
This runs all pending migrations against your local development database.

### 5. Test Application
```bash
npm run dev
```
Verify everything works with the new schema:
- Check affected features
- Test CRUD operations
- Verify queries return expected data
- Check for console errors

### 6. Commit Migration
```bash
git add migrations/ shared/schema.ts
git commit -m "feat: add user preferences table"
git push
```

**Important:** Always commit migration files together with schema changes.

### 7. Deploy
Render will automatically run migrations on deployment when you push to the main branch.

**Deployment Flow:**
1. Code pushed to repository
2. Render starts deployment
3. `npm run db:migrate:prod` runs automatically
4. Server starts only if migrations succeed

---

## Common Scenarios

### Adding a Column

**Steps:**
1. Add column to table definition in schema.ts
   ```typescript
   export const users = pgTable("users", {
     // ... existing columns
     phoneNumber: text("phone_number"), // New column
   });
   ```

2. Run `npm run db:generate`

3. Review migration (should be ALTER TABLE ... ADD COLUMN)
   ```sql
   ALTER TABLE "users" ADD COLUMN "phone_number" text;
   ```

4. Apply and test
   ```bash
   npm run db:migrate
   npm run dev
   ```

5. Commit and deploy

---

### Adding a New Table

**Steps:**
1. Define table in schema.ts
   ```typescript
   export const userPreferences = pgTable("user_preferences", {
     id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
     userId: uuid("user_id").references(() => users.id).notNull(),
     theme: text("theme").default("light"),
     notifications: boolean("notifications").default(true),
     createdAt: timestamp("created_at").defaultNow(),
   });
   ```

2. Run `npm run db:generate`

3. Review migration (should be CREATE TABLE)

4. Apply and test

5. Update TypeScript types if needed

6. Commit and deploy

---

### Modifying an Enum

**Adding a Value (Safe):**
1. Add new value to enum in schema.ts
   ```typescript
   export const userTypeEnum = pgEnum("user_type", [
     "customer",
     "team_member",
     "company_profile",
     "partner" // New value
   ]);
   ```

2. Run `npm run db:generate`

3. Review migration (should be ALTER TYPE ... ADD VALUE)
   ```sql
   ALTER TYPE "user_type" ADD VALUE 'partner';
   ```

4. Apply and test

5. Commit and deploy

**⚠️ Warning:** Never remove enum values without a data migration plan. Removing values can break existing data.

**Removing a Value (Complex):**
1. First, migrate all data away from the old value
2. Then remove the value from the enum
3. This requires careful planning and testing

---

### Renaming a Column (Zero-Downtime)

**Traditional Approach (Causes Downtime):**
❌ Don't do this - it breaks the running application

**Zero-Downtime Approach:**

1. **Step 1: Add new column with new name**
   ```typescript
   export const users = pgTable("users", {
     firstName: text("first_name"), // Old name
     givenName: text("given_name"),  // New name
   });
   ```
   Generate migration, deploy

2. **Step 2: Update application to write to both columns**
   ```typescript
   await db.insert(users).values({
     firstName: "John",  // Write to old
     givenName: "John",  // Write to new
   });
   ```
   Deploy application

3. **Step 3: Migrate data from old to new column**
   ```sql
   UPDATE users SET given_name = first_name WHERE given_name IS NULL;
   ```
   Run as a one-time migration

4. **Step 4: Update application to read from new column only**
   ```typescript
   const user = await db.select().from(users);
   console.log(user.givenName); // Use new name
   ```
   Deploy application

5. **Step 5: Remove old column**
   ```typescript
   export const users = pgTable("users", {
     // firstName: text("first_name"), // Removed
     givenName: text("given_name"),
   });
   ```
   Generate migration, deploy

6. **Done!** Column renamed with zero downtime

---

### Adding an Index

**Steps:**
1. Add index to table definition
   ```typescript
   export const applications = pgTable("applications", {
     // ... columns
   }, (table) => ({
     userIdIdx: index("user_id_idx").on(table.userId),
   }));
   ```

2. Run `npm run db:generate`

3. Review migration (should be CREATE INDEX)
   ```sql
   CREATE INDEX "user_id_idx" ON "applications" ("user_id");
   ```

4. Apply and test performance

5. Commit and deploy

---

### Changing a Default Value

**Steps:**
1. Update default in schema.ts
   ```typescript
   export const users = pgTable("users", {
     accountStatus: accountStatusEnum("account_status")
       .default("active"), // Changed from "pending_approval"
   });
   ```

2. Run `npm run db:generate`

3. Review migration (should be ALTER TABLE ... SET DEFAULT)

4. **Note:** This only affects new rows, not existing data

5. If you need to update existing data, write a data migration

6. Apply, test, commit, and deploy

---

## Troubleshooting

### Migration Fails to Apply

**Symptoms:**
```
❌ Migration failed: error: relation "users" already exists
```

**Causes:**
- Migration already applied manually
- Database out of sync with migration history
- Conflicting migration from another developer

**Solutions:**
1. Check DATABASE_URL is correct
   ```bash
   echo $DATABASE_URL
   ```

2. Review migration SQL for syntax errors
   ```bash
   cat migrations/0001_*.sql
   ```

3. Check for naming conflicts
   - Table already exists?
   - Column already exists?
   - Index name collision?

4. Verify foreign key references exist
   - Referenced table must exist first
   - Referenced column must exist

5. Manual fix (last resort):
   ```sql
   -- Mark migration as applied without running
   INSERT INTO __drizzle_migrations (hash, created_at)
   VALUES ('0001_migration_name', EXTRACT(EPOCH FROM NOW()) * 1000);
   ```

---

### Migration Applied but App Errors

**Symptoms:**
- Migration succeeds
- Application crashes or has runtime errors
- TypeScript errors about missing properties

**Solutions:**

1. **Verify schema.ts matches migration**
   - Check table names
   - Check column names
   - Check data types

2. **Check for missing imports**
   ```typescript
   import { users, studentProfiles } from "@/shared/schema";
   ```

3. **Review application code for schema assumptions**
   - Updated all queries using the changed schema?
   - Updated TypeScript types?
   - Updated validation schemas?

4. **Check database state**
   ```bash
   npm run db:studio
   ```
   Open Drizzle Studio and inspect the tables

---

### Cannot Generate Migration

**Symptoms:**
```
No schema changes detected
```

**Solutions:**
1. Verify you saved schema.ts
2. Check you're editing the correct file (shared/schema.ts)
3. Ensure changes are actually different from current state
4. Try `npm run db:check` to diagnose issues

---

### Migration Conflicts (Multiple Developers)

**Symptoms:**
- Git merge conflict in migrations/ folder
- Two developers created migrations at same time

**Solutions:**
1. Resolve Git conflict in migrations/
2. Migrations are ordered by timestamp - usually auto-resolves
3. If migrations conflict logically:
   - Discuss with team which should apply first
   - May need to regenerate one of the migrations
   - Test both migrations together

---

## Best Practices

### ✅ DO

- **Review generated SQL** before applying
  - Drizzle generates good SQL, but always verify
  - Check for unintended changes

- **Test migrations in development first**
  - Apply locally before pushing
  - Run full test suite
  - Manual testing of affected features

- **Commit migration files with schema changes**
  - Always commit together
  - Never commit schema without migration
  - Never commit migration without schema

- **Make backward-compatible changes when possible**
  - Add columns as nullable first
  - Add new tables safely
  - Expand enums (don't remove values)

- **Write clear commit messages**
  ```bash
  git commit -m "feat: add user preferences table with theme and notification settings"
  ```

- **Document complex migrations**
  - Add comments to migration SQL if needed
  - Update this workflow guide for new patterns

---

### ❌ DON'T

- **Don't use `db:push` for production anymore**
  - Migrations provide history and rollback
  - db:push is now only for rapid prototyping in development

- **Don't skip migration generation**
  - Every schema change needs a migration
  - No exceptions for "small" changes

- **Don't edit migration files after applying**
  - Once applied, migrations are immutable
  - Create a new migration to fix issues

- **Don't drop columns with data without a migration plan**
  - Data loss is permanent
  - Always plan data migration first
  - Consider soft-deletes instead

- **Don't modify enums destructively**
  - Don't remove values that are in use
  - Don't rename values without data migration

- **Don't deploy without testing locally**
  - Always apply migrations locally first
  - Test the application thoroughly
  - Check for breaking changes

---

## Emergency Procedures

### Rolling Back a Migration (Production)

**If a migration causes critical issues:**

1. **Identify the problematic migration**
   ```sql
   SELECT * FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 5;
   ```

2. **Write a reverse migration**
   - Create SQL to undo the changes
   - Test thoroughly in development

3. **Apply reverse migration manually**
   ```bash
   psql $DATABASE_URL < reverse_migration.sql
   ```

4. **Update migration tracking**
   ```sql
   DELETE FROM __drizzle_migrations WHERE hash = 'problematic_migration';
   ```

5. **Revert code changes**
   ```bash
   git revert <commit-hash>
   git push
   ```

6. **Post-mortem**
   - What went wrong?
   - How to prevent in the future?
   - Update testing procedures

---

### Database Corruption Recovery

**If migrations left database in bad state:**

1. **Restore from backup** (if available)
   - Render provides automatic backups
   - Contact support for restoration

2. **Manual schema repair**
   ```sql
   -- Fix individual tables/columns
   ALTER TABLE users ADD COLUMN missing_column text;
   ```

3. **Regenerate from schema.ts**
   ```bash
   npm run db:push --force
   ```
   ⚠️ Only as last resort - causes data loss

4. **Rebuild migration history**
   ```bash
   npm run db:introspect
   ```
   Generates schema from current database state

---

## Additional Resources

- **Drizzle Kit Documentation:** https://orm.drizzle.team/kit-docs/overview
- **PostgreSQL Enum Docs:** https://www.postgresql.org/docs/current/datatype-enum.html
- **Migration Cheatsheet:** See `docs/MIGRATION_CHEATSHEET.md`
- **Deployment Config:** See `docs/DEPLOYMENT_MIGRATION_CONFIG.md`
- **Implementation Plan:** See `docs/DATABASE_MIGRATION_IMPLEMENTATION_PLAN.md`

---

## Getting Help

**When stuck:**
1. Check this workflow guide
2. Review the migration cheatsheet
3. Check Drizzle Kit documentation
4. Ask team members
5. Review past migrations for patterns

**For bugs or issues:**
1. Check migration logs
2. Verify database state with `npm run db:studio`
3. Test in isolation (fresh database)
4. Document the issue for team
