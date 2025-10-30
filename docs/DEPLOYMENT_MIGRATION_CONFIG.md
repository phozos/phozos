# Render Deployment Configuration for Database Migrations

**Last Updated:** October 22, 2025  
**Version:** 1.0

## Overview

This document outlines the required Render deployment configuration changes to support automatic database migrations in the EduPath application.

---

## Configuration Changes Required

### 1. Start Command Update

**Before (Current):**
```bash
npm start
```

**After (Required):**
```bash
npm run db:migrate:prod && npm start
```

**What This Does:**
1. Runs all pending database migrations in production environment
2. Only starts the application server if migrations succeed
3. Ensures database schema is always up-to-date before app starts

---

### 2. Environment Variables Required

The following environment variables must be configured in Render:

| Variable | Value | Status | Purpose |
|----------|-------|--------|---------|
| `DATABASE_URL` | `postgresql://...` | ✅ Already Set | Database connection string |
| `NODE_ENV` | `production` | ⚠️ Recommended | Enables production-specific behavior |

**Note:** `DATABASE_URL` is already configured in Render. `NODE_ENV` is recommended but not strictly required for migrations.

---

## Deployment Process Flow

When you deploy to Render with the new configuration:

```
1. Code pushed to repository
   ↓
2. Render detects changes
   ↓
3. Build process runs (npm install, build)
   ↓
4. Start command executes:
   ├─ npm run db:migrate:prod
   │  ├─ Connects to production database
   │  ├─ Checks for pending migrations
   │  ├─ Applies migrations in order
   │  └─ Logs success/failure
   ↓
5. If migrations succeed:
   └─ npm start (server starts)
   
6. If migrations fail:
   └─ Deployment fails (server doesn't start)
      └─ Previous version remains running
```

---

## Safety Features

### Automatic Rollback Protection

- If a migration fails, the deployment stops
- The previous working version of the app continues running
- No partial schema changes applied (PostgreSQL transactions)
- You can review the error logs and fix the issue

### Transaction Safety

All migrations run within PostgreSQL transactions:
- Either the entire migration succeeds, or none of it applies
- No partial table creations or half-applied changes
- Database remains in consistent state

---

## Migration Commands Reference

### Production Deployment

```bash
npm run db:migrate:prod
```
- Sets `NODE_ENV=production`
- Runs all pending migrations
- Used automatically by Render start command

### Local Testing

```bash
npm run db:migrate
```
- Runs migrations in development environment
- Test before pushing to production

### Generate New Migration

```bash
npm run db:generate
```
- Creates a new migration from schema.ts changes
- Run locally after modifying shared/schema.ts

---

## First-Time Setup Instructions

### For Existing Production Database

The production database was created using `db:push` and already has all tables. The baseline migration should NOT be applied.

**Important:** Before deploying with the new start command, you must mark the baseline migration as applied:

```bash
# Connect to production database
psql $DATABASE_URL

# Create migrations tracking table and mark baseline as applied
CREATE TABLE IF NOT EXISTS __drizzle_migrations (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);

# Mark baseline as applied (use the actual migration hash from meta/_journal.json)
INSERT INTO __drizzle_migrations (hash, created_at)
VALUES ('0000_baseline_schema', 1761125941928);
```

**Alternatively:** The first deployment with migrations will fail trying to create existing tables. This is expected and safe - just manually mark the baseline as applied using the method above.

---

## Troubleshooting

### Migration Fails on Deployment

**Symptoms:** Deployment fails with migration error in logs

**Solutions:**
1. Check the error message in Render logs
2. Verify the migration SQL is correct
3. Test the migration locally first
4. If needed, manually fix the database and mark migration as applied

### Database Connection Issues

**Symptoms:** "DATABASE_URL is required" error

**Solutions:**
1. Verify DATABASE_URL is set in Render environment variables
2. Check the database is accessible from Render
3. Verify the connection string format is correct

### Migration Already Applied Error

**Symptoms:** Migration tries to create tables/types that already exist

**Solutions:**
1. Check if migration is already marked in __drizzle_migrations table
2. Manually mark migration as applied if it was run outside the system
3. For baseline migration, follow first-time setup instructions above

---

## Rollback Procedure

If a migration causes issues in production:

1. **Identify the problematic migration:**
   ```bash
   # Check which migrations are applied
   SELECT * FROM __drizzle_migrations ORDER BY created_at DESC;
   ```

2. **Manual rollback (if needed):**
   - Write a reverse migration SQL
   - Apply it manually to the database
   - Remove the migration record from __drizzle_migrations

3. **Revert code changes:**
   - Git revert the migration commit
   - Push to trigger new deployment
   - Old schema and old code work together

4. **Best Practice:**
   - Always make backward-compatible migrations
   - Avoid rollbacks by thorough testing in staging

---

## Best Practices

### Before Each Deployment

✅ Test migrations locally with `npm run db:migrate`  
✅ Review the generated SQL in migrations/*.sql  
✅ Verify the migration is backward-compatible  
✅ Test the application with the new schema  
✅ Commit migration files with schema changes  

### During Deployment

✅ Monitor Render logs for migration progress  
✅ Verify "✅ Migrations completed successfully" message  
✅ Check application starts correctly after migrations  

### After Deployment

✅ Verify application functionality  
✅ Check database schema matches expectations  
✅ Monitor for any errors in production logs  

---

## Additional Notes

### Baseline Migration

The first migration (`0000_baseline_schema.sql`) represents the initial database state. It should NOT be run on the existing production database, as the schema already exists from `db:push` operations.

### Future Migrations

All future migrations will be generated from changes to `shared/schema.ts` and will apply incrementally on top of the baseline.

### Migration Naming

Migrations are automatically named with timestamps (e.g., `0001_add_user_preferences.sql`). This ensures proper ordering even when multiple developers create migrations.

---

## Support

For issues or questions about database migrations:
1. Review the migration logs in Render
2. Check the `docs/MIGRATION_WORKFLOW.md` for common scenarios
3. Consult the `docs/MIGRATION_CHEATSHEET.md` for command reference
4. Review the implementation plan in `docs/DATABASE_MIGRATION_IMPLEMENTATION_PLAN.md`
