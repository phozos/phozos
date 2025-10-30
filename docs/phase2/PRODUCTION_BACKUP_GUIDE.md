# Production Database Backup Guide
## Phase 2, Task 2.1: Creating Production Backups in Supabase

**Document Version:** 1.0  
**Date:** October 22, 2025  
**Purpose:** Guide for creating and verifying production database backups before migration system deployment

---

## Overview

Before marking the baseline migration as applied in production, you must create a complete backup of the production database. This backup serves as a safety net in case any issues occur during the migration system activation.

**Critical:** Do NOT proceed with Phase 2 without a verified backup.

---

## Prerequisites

- [ ] Access to Supabase Dashboard
- [ ] Project admin permissions
- [ ] Production database credentials
- [ ] Backup log template ready

---

## Step 1: Create Manual Backup in Supabase

### 1.1 Access Supabase Dashboard

1. Navigate to [https://app.supabase.com](https://app.supabase.com)
2. Sign in with your credentials
3. Select your EduPath production project

### 1.2 Navigate to Backups

1. In the left sidebar, click **Database**
2. Click **Backups** tab
3. You should see the automatic backup schedule

### 1.3 Create Manual Backup

1. Click **"Create Backup"** button (or similar)
2. Enter backup name:
   ```
   pre-migration-baseline-2025-10-22
   ```
3. Add description:
   ```
   Pre-migration baseline backup before activating Drizzle migration system (Phase 2)
   ```
4. Click **"Create"** or **"Backup Now"**
5. **Wait for completion** (may take 5-30 minutes depending on database size)

### 1.4 Monitor Backup Progress

- Watch the backup status in the dashboard
- Do NOT close the browser until backup completes
- Expected statuses: `Creating` → `In Progress` → `Completed`

---

## Step 2: Verify Backup Integrity

### 2.1 Check Backup Details

Once backup completes, verify:

1. **Backup Size:**
   - Should be in MB range (not KB - that indicates empty backup)
   - Compare with current database size
   - Expected: Similar to database size shown in project settings

2. **Backup ID/Name:**
   - Record the backup ID for reference
   - Note the timestamp

3. **Status:**
   - Ensure status is "Completed" or "Success"
   - No error messages

### 2.2 Verify Table Count (Optional but Recommended)

Connect to production database (read-only) and verify table count:

```sql
-- Count all tables in public schema
SELECT count(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Expected result: 30+ tables
```

**Expected Tables (31 total):**
- users, student_profiles, universities, courses, applications
- documents, notifications, events, event_registrations
- ai_matching_results, testimonials, custom_fields, custom_field_values
- student_timeline, chat_messages, security_settings
- ip_registration_limits, login_attempts, security_events
- staff_invitation_links, subscriptions, subscription_plans
- user_subscriptions, payment_settings
- forum_posts_enhanced, forum_comments, forum_likes, forum_saves
- forum_poll_votes, forum_post_reports, forum_post_limits

### 2.3 Download Backup (Optional)

If Supabase allows backup download:
1. Click on the backup entry
2. Select **"Download"** option
3. Save to secure local location
4. Verify downloaded file is not corrupted (check file size)

---

## Step 3: Document Backup Details

Fill out the backup log template with the following information:

```markdown
# Production Backup Log

## Backup Information
- **Date Created:** 2025-10-22
- **Backup ID:** [Copy from Supabase dashboard]
- **Backup Name:** pre-migration-baseline-2025-10-22
- **Database Size:** [e.g., 245 MB]
- **Backup Size:** [e.g., 42 MB compressed]
- **Table Count:** [e.g., 31 tables]
- **Record Count:** [Approximate, if available]

## Verification
- **Backup Status:** ✅ Completed
- **Size Verification:** ✅ Matches expected size
- **Download Tested:** ✅ Yes / ⬜ No
- **Restoration Procedure Confirmed:** ✅ Yes

## Purpose
Pre-migration baseline backup before activating Drizzle migration system (Phase 2)

## Retention
- **Supabase Retention:** [Check project settings, typically 7-30 days]
- **Local Copy:** ✅ Yes / ⬜ No
- **Local Copy Location:** [If applicable]

## Notes
[Any additional observations or important details]

## Sign-off
- **Created by:** [Your name]
- **Verified by:** [Teammate name, if applicable]
- **Date:** 2025-10-22
```

Save this log as: `docs/phase2/production-backup-log-YYYY-MM-DD.md`

---

## Step 4: Test Restoration Procedure (Optional but Recommended)

If you have a staging environment:

1. **Create test database:**
   - Spin up temporary Supabase project or local PostgreSQL
   
2. **Restore backup:**
   - Use Supabase restore feature
   - Point to the backup you just created
   
3. **Verify restoration:**
   - Check table count matches production
   - Verify sample queries return data
   - Confirm schema matches expectations

4. **Document results:**
   - Add restoration test results to backup log
   - Note any issues encountered

---

## Rollback Plan

If migration system activation fails, you can restore the database:

### Supabase Restoration Process

1. Go to **Database** → **Backups**
2. Find backup: `pre-migration-baseline-2025-10-22`
3. Click **"Restore"** or **"..."** menu → **"Restore"**
4. Confirm restoration (This will overwrite current database)
5. Wait for completion (may take 10-60 minutes)
6. Verify application works after restoration

**Warning:** Restoration will lose any data created after the backup timestamp.

---

## Troubleshooting

### Backup Fails to Create

**Symptoms:** Backup stuck in "Creating" or error message

**Solutions:**
1. Check database is accessible (not in maintenance mode)
2. Verify sufficient storage quota in Supabase project
3. Try again after a few minutes
4. Contact Supabase support if persistent

### Backup Size Suspiciously Small

**Symptoms:** Backup is only a few KB when database should be MB+

**Solutions:**
1. Verify backup completed successfully
2. Check if backup includes all schemas (should include `public`)
3. Create another backup attempt
4. Compare with automatic backups to validate size

### Cannot Download Backup

**Symptoms:** Download option unavailable or fails

**Solutions:**
1. Check your Supabase plan (some plans may not allow downloads)
2. Use PostgreSQL dump as alternative:
   ```bash
   pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
   ```
3. Document that local copy not available but Supabase backup exists

---

## Security Considerations

- **Access Control:** Only authorized personnel should have backup access
- **Local Storage:** If downloaded, store backups in encrypted, secure location
- **Credentials:** Never include database credentials in backup logs
- **Retention:** Document how long backups are retained
- **Compliance:** Ensure backup storage complies with data protection regulations

---

## Acceptance Criteria

Before proceeding to Task 2.2, verify:

- ✅ Manual backup created in Supabase
- ✅ Backup status shows "Completed" or "Success"
- ✅ Backup size appears reasonable (not 0 KB)
- ✅ Backup ID/name documented in backup log
- ✅ Table count verified (30+ tables)
- ✅ Backup log template filled out completely
- ✅ Restoration procedure confirmed available
- ✅ Team notified of backup completion

---

## Next Steps

Once backup is verified:
1. Proceed to **Task 2.2: Production Schema Validation**
2. Keep backup log accessible for entire Phase 2
3. Monitor backup retention to ensure it doesn't expire during migration
4. Communicate backup completion to team

---

## References

- Supabase Backup Documentation: https://supabase.com/docs/guides/platform/backups
- Phase 2 Implementation Plan: `docs/DATABASE_MIGRATION_IMPLEMENTATION_PLAN.md` (lines 998-1042)
- Backup Log Template: `docs/phase2/production-backup-log-template.md`
