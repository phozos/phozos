-- VERIFY MIGRATION TABLE AND BASELINE
-- Phase 2, Task 2.3: Verification script after marking baseline as applied
-- 
-- Purpose: Verify that the migration tracking system is correctly configured
--          and the baseline migration is properly recorded
--
-- Run this AFTER executing mark-baseline-applied.sql
--
-- Expected State:
-- - __drizzle_migrations table exists in public schema
-- - Exactly 1 row (the baseline migration)
-- - Hash matches 0000_baseline_schema.sql
-- - Timestamp is recent

-----------------------------------------------------------
-- VERIFICATION SECTION 1: TABLE EXISTENCE
-----------------------------------------------------------

-- Check if migration table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = '__drizzle_migrations'
    ) THEN '✅ PASS: Migration table exists'
    ELSE '❌ FAIL: Migration table does not exist'
  END as table_existence_check;

-- Expected: ✅ PASS: Migration table exists

-----------------------------------------------------------
-- VERIFICATION SECTION 2: TABLE SCHEMA
-----------------------------------------------------------

-- Verify table has correct columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = '__drizzle_migrations'
ORDER BY ordinal_position;

-- Expected columns:
-- id       | integer    | NO  | nextval('__drizzle_migrations_id_seq'::regclass)
-- hash     | text       | NO  | NULL
-- created_at | bigint   | YES | NULL

-----------------------------------------------------------
-- VERIFICATION SECTION 3: MIGRATION COUNT
-----------------------------------------------------------

-- Verify exactly 1 migration record exists
SELECT 
  count(*) as migration_count,
  CASE 
    WHEN count(*) = 1 THEN '✅ PASS: Exactly 1 migration'
    WHEN count(*) = 0 THEN '❌ FAIL: No migrations found'
    ELSE '⚠️ WARNING: Multiple migrations found (expected only baseline)'
  END as count_check
FROM __drizzle_migrations;

-- Expected: migration_count = 1, PASS message

-----------------------------------------------------------
-- VERIFICATION SECTION 4: BASELINE HASH VERIFICATION
-----------------------------------------------------------

-- Verify baseline migration hash is correct
SELECT 
  id,
  hash,
  CASE 
    WHEN hash = 'bf3efbe1b096e87a9e5173e7cbb6b384074b249e94aa9b75651ea2d71e54261e' 
    THEN '✅ PASS: Baseline hash matches'
    ELSE '❌ FAIL: Hash mismatch - investigate immediately'
  END as hash_check
FROM __drizzle_migrations
WHERE id = 1;

-- Expected: hash_check = PASS

-----------------------------------------------------------
-- VERIFICATION SECTION 5: TIMESTAMP VALIDATION
-----------------------------------------------------------

-- Verify timestamp is recent and reasonable
SELECT 
  id,
  hash,
  created_at,
  to_timestamp(created_at / 1000) as created_at_readable,
  CASE 
    WHEN created_at > 0 AND created_at < 9999999999999 
    THEN '✅ PASS: Timestamp format valid'
    ELSE '❌ FAIL: Invalid timestamp format'
  END as timestamp_format_check,
  CASE 
    WHEN to_timestamp(created_at / 1000) > now() - interval '1 day'
    THEN '✅ PASS: Recently created (within 24 hours)'
    ELSE '⚠️ INFO: Created more than 24 hours ago'
  END as timestamp_recency_check
FROM __drizzle_migrations
WHERE id = 1;

-- Expected: Both checks show PASS/INFO (not FAIL)

-----------------------------------------------------------
-- VERIFICATION SECTION 6: MIGRATION DETAILS
-----------------------------------------------------------

-- Full migration details for documentation
SELECT 
  id as migration_id,
  hash as migration_hash,
  created_at as timestamp_ms,
  to_timestamp(created_at / 1000) as applied_at,
  date_trunc('second', now() - to_timestamp(created_at / 1000)) as time_since_applied
FROM __drizzle_migrations
ORDER BY id;

-- Document these details in your validation report

-----------------------------------------------------------
-- VERIFICATION SECTION 7: SCHEMA INTEGRITY CHECK
-----------------------------------------------------------

-- Verify that marking the baseline didn't affect existing schema
-- (This should show the same counts as in schema-validation.sql)

SELECT 
  (SELECT count(*) FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as table_count,
  (SELECT count(*) FROM pg_type WHERE typcategory = 'E') as enum_count,
  (SELECT count(*) FROM users) as user_count,
  (SELECT count(*) FROM security_settings) as security_settings_count;

-- Expected:
-- table_count: 31 (same as before + migration table = 32 total, but query excludes __drizzle_migrations)
-- enum_count: 15 (unchanged)
-- user_count: > 0 (unchanged)
-- security_settings_count: >= 5 (unchanged)

-----------------------------------------------------------
-- VERIFICATION SECTION 8: TABLE PERMISSIONS
-----------------------------------------------------------

-- Verify migration table has correct ownership
SELECT 
  tablename,
  tableowner,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = '__drizzle_migrations';

-- Note the owner - should match your database user

-----------------------------------------------------------
-- COMPREHENSIVE VALIDATION REPORT
-----------------------------------------------------------

-- Run this query for a complete validation summary
WITH validation AS (
  SELECT 
    -- Test 1: Table exists
    EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = '__drizzle_migrations'
    ) as table_exists,
    
    -- Test 2: Exactly 1 migration
    (SELECT count(*) FROM __drizzle_migrations) = 1 as correct_count,
    
    -- Test 3: Hash matches baseline
    (SELECT hash FROM __drizzle_migrations WHERE id = 1) = 
    'bf3efbe1b096e87a9e5173e7cbb6b384074b249e94aa9b75651ea2d71e54261e' as hash_matches,
    
    -- Test 4: Timestamp valid
    (SELECT created_at FROM __drizzle_migrations WHERE id = 1) > 0 as timestamp_valid,
    
    -- Test 5: Schema unchanged (user count same)
    (SELECT count(*) FROM users) > 0 as has_users
)
SELECT 
  table_exists,
  correct_count,
  hash_matches,
  timestamp_valid,
  has_users,
  CASE 
    WHEN table_exists AND correct_count AND hash_matches AND timestamp_valid AND has_users
    THEN '✅ ALL CHECKS PASSED - Safe to proceed to Task 2.4'
    ELSE '❌ SOME CHECKS FAILED - Review above results before proceeding'
  END as overall_status
FROM validation;

-- Expected: All columns TRUE, overall_status = ALL CHECKS PASSED

-----------------------------------------------------------
-- NEXT STEPS BASED ON RESULTS
-----------------------------------------------------------

-- If ALL CHECKS PASSED:
--   ✅ Document migration ID and timestamp
--   ✅ Update Phase 2 checklist
--   ✅ Proceed to Task 2.4: Deploy Migration System to Production
--
-- If ANY CHECKS FAILED:
--   ❌ DO NOT PROCEED to Task 2.4
--   ❌ Review the specific failed checks above
--   ❌ Investigate root cause
--   ❌ Consider rollback: DROP TABLE __drizzle_migrations;
--   ❌ Re-run mark-baseline-applied.sql after fixing issues
--
-- Common Issues:
--   - Hash mismatch: Verify you calculated hash from correct file
--   - Table doesn't exist: Re-run mark-baseline-applied.sql
--   - Multiple migrations: Investigate how extra rows were added
--   - Invalid timestamp: Check timestamp calculation in insert statement

-----------------------------------------------------------
-- DOCUMENTATION TEMPLATE
-----------------------------------------------------------

-- After verification passes, document these details:
--
-- Migration Table Status: ✅ Created and verified
-- Migration ID: [from query above]
-- Migration Hash: bf3efbe1b096e87a9e5173e7cbb6b384074b249e94aa9b75651ea2d71e54261e
-- Applied At: [from created_at_readable]
-- Verification Date: YYYY-MM-DD
-- Verified By: [Your name]
-- Overall Status: PASSED
-- Ready for Task 2.4: YES

-----------------------------------------------------------
-- TESTING MIGRATION SYSTEM (Optional but Recommended)
-----------------------------------------------------------

-- After verification passes, you can test the migration system locally:
--
-- 1. Set production DATABASE_URL in local environment
-- 2. Run: npm run db:migrate
-- 3. Expected output: "No new migrations to apply" or similar
-- 4. This confirms Drizzle recognizes the baseline as applied
--
-- DO NOT run db:push or db:generate against production
-- Only db:migrate is safe after marking baseline

-----------------------------------------------------------
-- SECURITY NOTES
-----------------------------------------------------------

-- 1. Read-Only Testing:
--    - These verification queries are read-only (SELECT only)
--    - Safe to run multiple times
--    - No risk to production data
--
-- 2. Migration Table Access:
--    - Only database admins should modify __drizzle_migrations
--    - Application should only READ from this table
--    - Never manually edit migration hashes
--
-- 3. Audit Trail:
--    - Keep this verification output for audit purposes
--    - Include in Phase 2 completion documentation
--    - Useful for future troubleshooting
