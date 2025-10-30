# Migration System Deployment Guide
## Phase 2, Task 2.4: Deploy Migration System to Production

**Document Version:** 1.0  
**Date:** October 22, 2025  
**Purpose:** Guide for deploying the Drizzle migration system to production on Render

---

## Overview

This guide walks through deploying the migration system to production. After completion, your application will automatically run migrations on every deployment, ensuring schema changes are applied consistently.

**Critical:** This is a zero-downtime deployment. The migration system will activate without affecting running application.

---

## Prerequisites Checklist

Before starting deployment, verify all prerequisites:

- [ ] **Task 2.1 Complete:** Production backup created and verified
- [ ] **Task 2.2 Complete:** Schema validation passed
- [ ] **Task 2.3 Complete:** Baseline migration marked as applied
- [ ] **Verification Complete:** verify-migration-table.sql ran successfully
- [ ] **Team Notified:** Team aware of migration system activation
- [ ] **Low Traffic Window:** Deploying during low-traffic period (recommended)
- [ ] **Rollback Plan:** Previous deployment ready to rollback if needed

**STOP:** Do not proceed if any prerequisite is incomplete.

---

## Deployment Architecture

### Current Setup (Before Deployment)
```
Render Service (Backend)
├─ Build: npm install
├─ Start: npm start
└─ Database: Supabase (schema managed by db:push)
```

### After Deployment
```
Render Service (Backend)
├─ Build: npm install
├─ Start: npm run db:migrate:prod && npm start
│   ├─ 1. Run migrations (server/db/migrate.ts)
│   └─ 2. Start application (server/index.ts)
└─ Database: Supabase (schema managed by migrations)
```

---

## Step 1: Prepare Repository

### 1.1 Verify Git Status

Ensure all Phase 1 and Phase 2 changes are committed:

```bash
# Check for uncommitted changes
git status

# Should show clean working tree
# If not, commit any pending changes
```

### 1.2 Verify Migration Files

```bash
# Ensure baseline migration exists
ls -la migrations/

# Expected files:
# migrations/
#   0000_baseline_schema.sql
#   meta/
#     0000_snapshot.json
#     _journal.json
```

### 1.3 Verify Migration Scripts

```bash
# Ensure db:migrate scripts exist in package.json
cat package.json | grep "db:migrate"

# Expected output:
# "db:migrate": "tsx server/db/migrate.ts",
# "db:migrate:prod": "NODE_ENV=production tsx server/db/migrate.ts",
```

### 1.4 Verify Migration Runner

```bash
# Ensure migrate.ts exists
ls -la server/db/migrate.ts

# Review the file (should match Phase 1 implementation)
cat server/db/migrate.ts
```

---

## Step 2: Update Render Configuration

### 2.1 Access Render Dashboard

1. Navigate to [https://dashboard.render.com](https://dashboard.render.com)
2. Sign in with your credentials
3. Select your EduPath backend service

### 2.2 Update Start Command

**Current Start Command:**
```bash
npm start
```

**New Start Command:**
```bash
npm run db:migrate:prod && npm start
```

**How to Update:**
1. In Render dashboard, click on your service
2. Go to **"Settings"** tab
3. Scroll to **"Build & Deploy"** section
4. Find **"Start Command"** field
5. Replace with new command above
6. Click **"Save Changes"**

### 2.3 Verify Build Command (Should Not Change)

**Build Command should remain:**
```bash
npm install
```

**Do NOT change the build command** - it's already correct.

### 2.4 Verify Environment Variables

Ensure these environment variables are set in Render:

**Required:**
- `DATABASE_URL` - Supabase connection string
- `NODE_ENV` - Should be `production`

**Optional (but recommended):**
- `SESSION_SECRET` - For sessions
- `JWT_SECRET` - For JWT tokens
- Any other app-specific secrets

**How to Check:**
1. In Render dashboard, click **"Environment"** tab
2. Verify `DATABASE_URL` is set and correct
3. Verify `NODE_ENV` is set to `production`
4. Do NOT modify these unless necessary

---

## Step 3: Test in Staging (If Available)

### 3.1 If You Have a Staging Environment

1. **Deploy to staging first:**
   - Update staging start command same as production
   - Trigger staging deployment
   - Monitor logs for migration execution

2. **Verify staging deployment:**
   ```
   Expected logs:
   "🔄 Running database migrations..."
   "✅ Migrations completed successfully"
   [No migrations applied - baseline already marked]
   "🔧 Running complete auto-setup..."
   "✅ Admin user created/updated"
   "🚀 Platform is ready for use!"
   ```

3. **Test staging application:**
   - Login as admin
   - Create test data
   - Verify all features work

4. **If staging succeeds:**
   - Proceed to production deployment
   
5. **If staging fails:**
   - Review error logs
   - Fix issues before deploying to production
   - Do NOT proceed until staging works

### 3.2 If No Staging Environment

- Skip to Step 4 (Production Deployment)
- Monitor production deployment extra carefully
- Have rollback plan ready

---

## Step 4: Production Deployment

### 4.1 Pre-Deployment Checklist

Final verification before triggering deployment:

- [ ] Render start command updated to include migration
- [ ] DATABASE_URL environment variable confirmed
- [ ] Team notified of imminent deployment
- [ ] Backup verified and accessible (Task 2.1)
- [ ] Baseline migration marked as applied (Task 2.3)
- [ ] Low traffic period (if possible)
- [ ] Rollback plan ready

### 4.2 Trigger Deployment

**Option A: Manual Deploy (Recommended)**
1. In Render dashboard, click **"Manual Deploy"**
2. Select **"Deploy latest commit"**
3. Click **"Deploy"**
4. **Immediately proceed to Step 4.3 for monitoring**

**Option B: Git Push Deploy**
1. Merge changes to main branch
2. Push to Git remote
3. Render will auto-deploy (if configured)
4. **Immediately proceed to Step 4.3 for monitoring**

### 4.3 Monitor Deployment Logs

**Critical:** Watch deployment logs in real-time.

**Expected Log Sequence:**

```
==> Building...
npm install
[Install output]
Build succeeded

==> Starting...
🔄 Running database migrations...
Migration source: ./migrations
Applying migrations from schema: public
✅ Migrations completed successfully

🔧 Running complete auto-setup...
Admin user already exists
✅ Admin user updated and approved
✅ Security settings functional
✅ Student profile validation completed
🚀 Platform is ready for use!

🔐 Simple JWT service initialized
✅ DI Container initialized
🌐 CORS Configuration...
🚀 Starting application...
serving on port 5000
```

### 4.4 Deployment Success Criteria

Monitor logs for these key indicators:

**Must See:**
- ✅ `"Migrations completed successfully"`
- ✅ `"Platform is ready for use"`
- ✅ `"serving on port 5000"`

**Must NOT See:**
- ❌ Migration errors
- ❌ SQL syntax errors
- ❌ Connection failures
- ❌ Application crashes

### 4.5 Deployment Duration

**Expected timeline:**
- Build: 2-5 minutes
- Migration execution: <10 seconds (baseline already applied)
- Application startup: 5-15 seconds
- **Total: ~3-6 minutes**

If deployment takes longer than 10 minutes, investigate.

---

## Step 5: Verify Deployment Success

### 5.1 Check Application Status

1. **Check Render Dashboard:**
   - Service status should be **"Live"** or **"Running"**
   - No error badges or warnings

2. **Access Application URL:**
   - Visit your production URL
   - Page should load normally
   - No 502/503 errors

### 5.2 Verify Migration Execution

**Option A: Check Logs**
- Review deployment logs in Render
- Confirm migration success message appeared

**Option B: Query Database (Recommended)**
```sql
-- Connect to production database
SELECT * FROM __drizzle_migrations
ORDER BY id;

-- Should still show exactly 1 row (baseline)
-- If you see 2+ rows, investigate what extra migrations ran
```

### 5.3 Smoke Test Application

Test critical features:

**User Authentication:**
- [ ] Login page loads
- [ ] Admin login works (admin@edupath.com)
- [ ] User session persists

**Database Connectivity:**
- [ ] Dashboard loads (proves database connection)
- [ ] User data displays correctly
- [ ] No database connection errors

**Core Features:**
- [ ] Create/view student profile
- [ ] Browse universities
- [ ] View forum posts
- [ ] Access admin panel (if admin)

### 5.4 Monitor Error Rates

**In Render:**
- Check **"Metrics"** tab
- Monitor error rate
- Should be same as pre-deployment baseline

**In Application:**
- Check application error logs
- Look for new errors after deployment
- Verify no spike in exceptions

---

## Step 6: Post-Deployment Actions

### 6.1 Document Deployment

Fill out deployment checklist:

```markdown
# Deployment Record

Date: YYYY-MM-DD HH:MM UTC
Deployment Type: Migration system activation (Phase 2)
Render Deployment ID: [from dashboard]
Git Commit: [commit hash]

## Deployment Results
- Migration execution: ✅ Success
- Application startup: ✅ Success
- Smoke tests: ✅ Passed
- Error rate: [unchanged/increased]

## Issues Encountered
[None / List any issues]

## Rollback Performed
- [ ] No
- [ ] Yes - [reason and outcome]
```

### 6.2 Notify Team

Send team notification:

```
✅ Production Deployment Complete

The Drizzle migration system has been successfully deployed to production.

Deployment Details:
- Date: [date/time]
- Status: Success
- Migration system: Active
- Application: Running normally

What Changed:
- Start command now runs migrations before app startup
- Future schema changes will use migration files
- Team should use "npm run db:generate" for new changes

Next Steps:
- Monitor application for 24 hours
- Complete Task 2.5 (Post-Deployment Validation)
- No changes to development workflow yet

If Issues Arise:
- Contact [your name]
- Rollback plan available if needed
```

### 6.3 Monitor for 24 Hours

**First Hour:**
- Check application every 15 minutes
- Monitor error rates
- Watch for user-reported issues

**First 24 Hours:**
- Check application 3-4 times
- Review daily metrics
- Verify no degradation

### 6.4 Update Documentation

Update these documents:
- [ ] Phase 2 checklist (mark Task 2.4 complete)
- [ ] Deployment log
- [ ] Team wiki/runbook with new deployment process

---

## Rollback Procedures

### When to Rollback

Rollback immediately if:
- ❌ Application fails to start after deployment
- ❌ Critical features broken (login, database access)
- ❌ High error rate (>5% increase)
- ❌ Data corruption detected
- ❌ Security issue identified

### Rollback Method 1: Revert Start Command (Fastest)

**If migration ran successfully but app has issues:**

1. Go to Render dashboard → Settings
2. Change start command back to:
   ```bash
   npm start
   ```
3. Click "Save Changes"
4. Trigger manual deployment
5. Application will start without running migrations
6. Migration table remains (safe to leave)

**Downside:** Doesn't undo any schema changes.

### Rollback Method 2: Restore Database Backup (Nuclear Option)

**If migration caused database issues:**

1. **Restore Supabase Backup:**
   - Go to Supabase → Database → Backups
   - Find backup from Task 2.1
   - Click "Restore" (overwrites current database)
   - Wait for completion (10-60 minutes)

2. **Revert Render Start Command:**
   - Change start command back to `npm start`
   - Deploy

3. **Verify Restoration:**
   - Test application
   - Verify data is back to backup state

**Downside:** Loses all data created after backup timestamp.

### Rollback Method 3: Previous Deployment

**If application code has issues:**

1. In Render dashboard, go to **"Events"** tab
2. Find previous successful deployment
3. Click **"Redeploy"** on that deployment
4. Monitor logs for successful startup

---

## Troubleshooting Common Issues

### Issue 1: Migration Fails with "Table already exists"

**Symptoms:** 
```
ERROR: relation "users" already exists
```

**Cause:** Baseline not properly marked as applied

**Solution:**
1. Check `__drizzle_migrations` table exists
2. Verify baseline hash is correct
3. Re-run Task 2.3 if needed
4. Redeploy

### Issue 2: "Cannot find module 'tsx'"

**Symptoms:**
```
Error: Cannot find module 'tsx'
npm run db:migrate:prod failed
```

**Cause:** tsx not installed in production dependencies

**Solution:**
1. Verify `tsx` is in `dependencies` (not `devDependencies`) in package.json
2. If in devDependencies, move to dependencies
3. Commit and redeploy

### Issue 3: Database Connection Timeout

**Symptoms:**
```
Migration failed: connect ETIMEDOUT
```

**Cause:** DATABASE_URL incorrect or database unreachable

**Solution:**
1. Verify DATABASE_URL environment variable in Render
2. Check Supabase database is running
3. Test connection from Render shell
4. Update DATABASE_URL if needed
5. Redeploy

### Issue 4: Application Starts But Migrations Didn't Run

**Symptoms:**
- No migration log output
- Application runs normally

**Cause:** && operator failed silently

**Solution:**
1. Check exact start command syntax
2. Verify command is: `npm run db:migrate:prod && npm start`
3. Check for shell escaping issues
4. Try alternative: `bash -c "npm run db:migrate:prod && npm start"`

### Issue 5: Increased Error Rate After Deployment

**Symptoms:**
- Error rate jumps 5-10%
- User-reported issues increase

**Cause:** Could be unrelated to migrations or environment issue

**Solution:**
1. Check Render logs for specific errors
2. Review application error logs
3. Test affected features manually
4. Consider rollback if errors persist
5. Investigate root cause before redeploying

---

## Security Considerations

### Database Access
- Migration system needs write access to database
- Verify DATABASE_URL uses appropriate credentials
- Consider using separate migration user (advanced)

### Secrets Management
- Never log DATABASE_URL or secrets
- Verify environment variables encrypted in Render
- Rotate secrets if accidentally exposed

### Audit Trail
- Keep deployment logs for audit purposes
- Document who performed deployment
- Track all configuration changes

---

## Next Steps

After successful deployment:

1. **Complete Post-Deployment Validation (Task 2.5):**
   - Run validation checklist
   - Verify performance unchanged
   - Document final results

2. **Monitor Production:**
   - Watch for 24-48 hours
   - Check error rates
   - Verify user experience

3. **Team Training:**
   - Brief team on new migration workflow
   - Share migration cheat sheet
   - Answer questions

4. **Proceed to Phase 3 (Future):**
   - Phase 3: Team workflow transition
   - New schema changes use migrations
   - Deprecate `db:push` for production

---

## References

- Render Documentation: https://render.com/docs
- Drizzle Migrations: https://orm.drizzle.team/docs/migrations
- Phase 2 Implementation Plan: `docs/DATABASE_MIGRATION_IMPLEMENTATION_PLAN.md`
- Deployment Checklist: `docs/phase2/deployment-checklist.md`
- Post-Deployment Validation: `docs/phase2/POST_DEPLOYMENT_VALIDATION.md`
