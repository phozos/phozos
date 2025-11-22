# Premium Badge to Simple Icon Migration Runbook

**Migration File:** `0025_map_premium_badges_to_icons.sql`  
**Created:** November 11, 2025  
**Status:** READY TO EXECUTE (awaiting database provisioning)  
**Criticality:** HIGH - Must execute before deploying frontend changes

---

## Overview

This migration translates legacy premium badge keys to simple icon keys in the `subscription_plans` table. This is a **prerequisite** for safely removing the `PremiumBadges.tsx` component from the frontend.

### Why This Migration Is Required

The frontend currently has two logo systems:
1. **Premium Badges** (ornate SVG) - Being removed
2. **Simple Icons** (Lucide React icons) - Keeping

If we remove premium badge components without migrating data, any plans with badge keys will display incorrectly (blank icons or fallback to default).

---

## Pre-Migration Checklist

Before executing this migration:

- [ ] **Database is provisioned and accessible**
- [ ] **Backup created** (this migration is irreversible)
  ```bash
  # Create backup
  pg_dump -Fc database_name > backup_$(date +%Y%m%d_%H%M%S).dump
  ```
- [ ] **Verified migration hasn't already run**
  ```sql
  SELECT COUNT(*) FROM subscription_plans
  WHERE logo IN ('platinum', 'gold', 'brilliance', 'majesty', 'fortress', 'voltage', 'prismatic', 'apex');
  -- If 0, migration already complete or not needed
  ```
- [ ] **Tested in development environment first**

---

## Execution Steps

### Step 1: Connect to Database

```bash
# Development
psql $DATABASE_URL

# Or via execute_sql_tool in Replit Agent
```

### Step 2: Review Current State

```sql
-- See which plans will be affected
SELECT id, name, logo 
FROM subscription_plans
WHERE logo IN ('platinum', 'gold', 'brilliance', 'majesty', 'fortress', 'voltage', 'prismatic', 'apex');
```

### Step 3: Execute Migration

**Option A: Via psql**
```bash
psql $DATABASE_URL -f migrations/0025_map_premium_badges_to_icons.sql
```

**Option B: Via Replit Agent execute_sql_tool**
```
Read the SQL file and execute each statement
```

**Option C: Via Drizzle (if configured)**
```bash
npm run db:migrate
```

### Step 4: Verify Results

The migration script includes automatic verification. You should see:
```
NOTICE:  Found X subscription plans with premium badge keys
NOTICE:  Successfully migrated X subscription plans from badge keys to icon keys
NOTICE:  Migration successful: All badge keys have been mapped to icon keys
```

Manual verification:
```sql
-- Should return 0 rows
SELECT * FROM subscription_plans
WHERE logo IN ('platinum', 'gold', 'brilliance', 'majesty', 'fortress', 'voltage', 'prismatic', 'apex');

-- Should only show simple icon keys
SELECT DISTINCT logo FROM subscription_plans ORDER BY logo;
-- Expected: crown, diamond, gem, graduation-cap, shield, target, trophy, zap
```

---

## Mapping Table

| Old Badge Key | New Icon Key | Rationale |
|---------------|--------------|-----------|
| `platinum` | `diamond` | Premium/luxury association |
| `gold` | `crown` | Royal/premium association |
| `brilliance` | `gem` | Sparkle/value association |
| `majesty` | `crown` | Royal theme |
| `fortress` | `shield` | Protection theme |
| `voltage` | `zap` | Electric/energy theme |
| `prismatic` | `gem` | Precious/valuable theme |
| `apex` | `target` | Precision/achievement theme |

---

## Rollback Procedure

**IMPORTANT:** This migration is **irreversible** through SQL alone. Original badge key values are overwritten.

### To Rollback:

1. **Restore from backup** (created in pre-migration checklist)
   ```bash
   pg_restore -d database_name backup_file.dump
   ```

2. **Or manually revert** (if you documented original values)
   ```sql
   UPDATE subscription_plans SET logo = 'platinum' WHERE id = 'xxx';
   -- Repeat for each plan
   ```

---

## Post-Migration Actions

After successful migration:

- [ ] **Document execution** (date, time, affected rows)
- [ ] **Update deployment checklist** to mark migration as complete
- [ ] **Notify team** that frontend changes can now be safely deployed
- [ ] **Proceed with Phase 2** (Frontend Cleanup)

---

## Troubleshooting

### Issue: Migration shows 0 affected rows
**Cause:** No plans use premium badge keys  
**Action:** This is fine - migration not needed, proceed to frontend cleanup

### Issue: Some plans still have badge keys after migration
**Cause:** New badge keys not in CASE statement  
**Action:** 
1. Identify the keys: `SELECT DISTINCT logo FROM subscription_plans WHERE logo NOT IN ('crown', 'diamond', 'gem', 'graduation-cap', 'shield', 'target', 'trophy', 'zap');`
2. Update migration SQL to include them
3. Re-run migration

### Issue: Database connection fails
**Cause:** Database not provisioned or env vars not set  
**Action:** 
1. Run `check_database_status` tool
2. Create database if needed: `create_postgresql_database_tool`
3. Verify $DATABASE_URL is set

---

## Deployment Sequence

**CRITICAL:** Execute in this order:

1. ✅ Create migration file (this step - already done)
2. 🔴 **Execute migration** (this runbook - PENDING)
3. Deploy frontend changes (Phase 2 - BLOCKED until step 2)
4. Test and validate (Phase 5)
5. Update documentation (Phase 6)

**DO NOT deploy frontend changes before executing this migration!**

---

## Notes

- Migration is idempotent (safe to run multiple times)
- Uses transaction (BEGIN/COMMIT) for atomicity
- Includes automatic verification
- Updates `updated_at` timestamp for tracking
- Works with any number of plans (0 to unlimited)

---

## Contact

For questions or issues during migration:
- Check `PREMIUM_BADGE_REMOVAL_PLAN.md` for full context
- Review backup before attempting rollback
- Test in development environment first

**Last Updated:** November 11, 2025
