# Migration Command Cheatsheet

**Quick Reference Guide for Database Migrations**

---

## Command Reference

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm run db:generate` | Create new migration | After schema.ts changes |
| `npm run db:migrate` | Run pending migrations | After pulling new migrations |
| `npm run db:migrate:prod` | Run migrations in production | Automatically by Render |
| `npm run db:studio` | Visual database browser | Inspect data |
| `npm run db:push` | Sync schema directly (old way) | DEPRECATED - use migrations |
| `npm run db:introspect` | Generate schema from DB | Emergency recovery |
| `npm run db:check` | Validate migrations | Diagnose issues |
| `npm run db:drop` | Drop a migration | Undo uncommitted migration |

---

## Migration Lifecycle

```
1. Develop
   ↓
   Modify `shared/schema.ts`
   
2. Generate
   ↓
   npm run db:generate
   
3. Review
   ↓
   Check migrations/*.sql
   
4. Apply
   ↓
   npm run db:migrate
   
5. Test
   ↓
   npm run dev
   
6. Commit
   ↓
   git add migrations/ shared/schema.ts
   git commit -m "feat: add user preferences table"
   git push
   
7. Deploy
   ↓
   Render auto-migrates
```

---

## Common Commands

### Start a New Feature

```bash
# 1. Create a new branch
git checkout -b feature/user-preferences

# 2. Edit schema
code shared/schema.ts

# 3. Generate migration
npm run db:generate

# 4. Review the generated SQL
cat migrations/0001_*.sql

# 5. Apply migration locally
npm run db:migrate

# 6. Test
npm run dev

# 7. Commit
git add migrations/ shared/schema.ts
git commit -m "feat: add user preferences table"
git push origin feature/user-preferences
```

---

### After Pulling Changes

```bash
# 1. Pull latest code
git pull origin main

# 2. Install any new dependencies
npm install

# 3. Apply new migrations
npm run db:migrate

# 4. Restart dev server
npm run dev
```

---

### Inspect Database

```bash
# Visual database browser (recommended)
npm run db:studio

# Or use psql
psql $DATABASE_URL
```

---

### Check Migration Status

```bash
# Check which migrations are applied
psql $DATABASE_URL -c "SELECT * FROM __drizzle_migrations ORDER BY created_at;"

# Validate migrations without applying
npm run db:check
```

---

## Quick Fixes

### Undo Last Migration (Not Applied Yet)

```bash
# If you just generated a migration but haven't applied it yet
npm run db:drop

# Or manually delete the file
rm migrations/0001_*.sql
```

---

### Undo Applied Migration (Development Only)

```bash
# 1. Manually revert database changes
psql $DATABASE_URL
# Run reverse SQL commands

# 2. Remove migration record
DELETE FROM __drizzle_migrations WHERE hash = '0001_migration_name';

# 3. Delete migration file
rm migrations/0001_*.sql

# 4. Revert schema.ts changes
git checkout shared/schema.ts
```

⚠️ **Never do this in production!**

---

### Fix "Migration Already Applied" Error

```bash
# Check if migration is in database
psql $DATABASE_URL -c "SELECT * FROM __drizzle_migrations;"

# If migration was applied manually, mark it as applied
psql $DATABASE_URL -c "INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('0001_migration_name', EXTRACT(EPOCH FROM NOW()) * 1000);"
```

---

## Best Practices

### ✅ DO

- ✅ Always review generated SQL before applying
- ✅ Test migrations in development first
- ✅ Commit migration files with schema changes
- ✅ Never edit applied migration files
- ✅ Make backward-compatible changes when possible
- ✅ Use descriptive migration commit messages
- ✅ Run migrations before starting dev server
- ✅ Keep migrations small and focused

---

### ❌ DON'T

- ❌ Don't use `db:push` for production anymore
- ❌ Don't skip migration generation
- ❌ Don't edit migration files after applying
- ❌ Don't drop columns with data without migration plan
- ❌ Don't remove enum values without data migration
- ❌ Don't deploy without testing locally
- ❌ Don't commit schema changes without migration
- ❌ Don't run migrations manually in production

---

## Workflow Patterns

### Pattern 1: Add New Column

```bash
# 1. Edit schema.ts
export const users = pgTable("users", {
  // ...existing columns
  phoneNumber: text("phone_number"), # Add this
});

# 2. Generate & apply
npm run db:generate
npm run db:migrate

# 3. Verify in studio
npm run db:studio

# 4. Test & commit
npm run dev
git add migrations/ shared/schema.ts
git commit -m "feat: add phone number to users"
```

---

### Pattern 2: Add New Table

```bash
# 1. Define table in schema.ts
export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  theme: text("theme").default("light"),
  createdAt: timestamp("created_at").defaultNow(),
});

# 2. Generate & apply
npm run db:generate
npm run db:migrate

# 3. Verify
npm run db:studio

# 4. Test & commit
npm run dev
git add migrations/ shared/schema.ts
git commit -m "feat: add user preferences table"
```

---

### Pattern 3: Add Enum Value

```bash
# 1. Edit enum in schema.ts
export const userTypeEnum = pgEnum("user_type", [
  "customer",
  "team_member",
  "company_profile",
  "partner" # Add this
]);

# 2. Generate & apply
npm run db:generate
npm run db:migrate

# 3. Test & commit
npm run dev
git add migrations/ shared/schema.ts
git commit -m "feat: add partner user type"
```

---

### Pattern 4: Rename Column (Zero-Downtime)

```bash
# Step 1: Add new column
export const users = pgTable("users", {
  firstName: text("first_name"), # Old
  givenName: text("given_name"),  # New
});
npm run db:generate
npm run db:migrate
git commit -m "feat: add given_name column"
git push

# Step 2: Update app to write to both
# (code changes)
git commit -m "feat: write to both first_name and given_name"
git push

# Step 3: Migrate data
psql $DATABASE_URL -c "UPDATE users SET given_name = first_name WHERE given_name IS NULL;"

# Step 4: Update app to read from new
# (code changes)
git commit -m "feat: read from given_name"
git push

# Step 5: Remove old column
export const users = pgTable("users", {
  # firstName: text("first_name"), # Removed
  givenName: text("given_name"),
});
npm run db:generate
npm run db:migrate
git commit -m "feat: remove first_name column"
git push
```

---

## Troubleshooting Quick Reference

| Problem | Solution |
|---------|----------|
| "No schema changes detected" | Verify schema.ts is saved |
| "Migration already applied" | Check __drizzle_migrations table |
| "Cannot find DATABASE_URL" | Set environment variable |
| "relation already exists" | Migration was applied manually |
| "type already exists" | Enum was created manually |
| Migration conflicts (Git) | Merge by timestamp, test both |
| App errors after migration | Verify schema.ts matches database |

---

## Environment Variables

```bash
# Required for migrations
DATABASE_URL=postgresql://user:password@host:5432/database

# Optional
NODE_ENV=production  # For production migrations
```

---

## File Structure

```
project/
├── migrations/
│   ├── 0000_baseline_schema.sql      # Initial schema
│   ├── 0001_add_user_preferences.sql # Generated migrations
│   ├── 0002_add_partner_role.sql
│   └── meta/
│       ├── _journal.json              # Migration history
│       └── 0000_snapshot.json         # Schema snapshots
├── shared/
│   └── schema.ts                      # Source of truth
├── server/
│   └── db/
│       └── migrate.ts                 # Migration runner
└── drizzle.config.ts                  # Drizzle configuration
```

---

## Migration File Naming

```
0000_baseline_schema.sql           # Baseline (initial)
0001_add_user_preferences.sql      # Descriptive name
0002_add_partner_role.sql          # Short and clear
0003_rename_first_name.sql         # Action + target
XXXX_auto_generated_name.sql       # Before renaming
```

**Tips:**
- Drizzle auto-generates names based on changes
- Rename to be more descriptive (optional)
- Keep names short but clear
- Use snake_case

---

## Git Workflow

```bash
# Always commit together
git add migrations/ shared/schema.ts
git commit -m "feat: add user preferences table"

# Never commit separately
git add shared/schema.ts     # ❌ Wrong
git commit -m "update schema"

# Migration without schema = incomplete
# Schema without migration = can't apply
```

---

## Production Deployment

```bash
# Render automatically runs:
npm run db:migrate:prod && npm start

# If migration fails, deployment fails
# Previous version keeps running (safe)
```

---

## Visual Studio Code Snippets

Add to your `.vscode/typescript.json`:

```json
{
  "Drizzle Table": {
    "prefix": "drtable",
    "body": [
      "export const ${1:tableName} = pgTable(\"${1:tableName}\", {",
      "  id: uuid(\"id\").primaryKey().default(sql`gen_random_uuid()`),",
      "  $0",
      "  createdAt: timestamp(\"created_at\").defaultNow(),",
      "  updatedAt: timestamp(\"updated_at\").defaultNow(),",
      "});"
    ]
  }
}
```

---

## Related Documentation

- **Workflow Guide:** `docs/MIGRATION_WORKFLOW.md`
- **Deployment Config:** `docs/DEPLOYMENT_MIGRATION_CONFIG.md`
- **Implementation Plan:** `docs/DATABASE_MIGRATION_IMPLEMENTATION_PLAN.md`
- **Drizzle Docs:** https://orm.drizzle.team/

---

## Emergency Contacts

**For critical production issues:**
1. Check deployment logs in Render
2. Review migration error messages
3. Check `docs/MIGRATION_WORKFLOW.md` troubleshooting section
4. Consult team members
5. If data loss risk, restore from backup first

---

**Last Updated:** October 22, 2025  
**Version:** 1.0
