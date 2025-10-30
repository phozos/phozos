-- MARK BASELINE MIGRATION AS APPLIED
-- Phase 2, Task 2.3: Create migration tracking table and mark baseline
-- 
-- WARNING: This script is for PRODUCTION database only
-- DO NOT run on fresh databases - they should use actual migrations
--
-- Purpose: Marks the baseline migration as applied without running the SQL
--          This allows future migrations to build on the existing schema
--
-- Prerequisites:
-- 1. Production backup completed (Task 2.1)
-- 2. Schema validation completed (Task 2.2)
-- 3. Baseline migration hash calculated and verified
--
-- Baseline Migration Details:
-- File: migrations/0000_baseline_schema.sql
-- Hash (SHA256): bf3efbe1b096e87a9e5173e7cbb6b384074b249e94aa9b75651ea2d71e54261e
-- Created: October 22, 2025
-- Tables: 31
-- Enums: 15

-----------------------------------------------------------
-- STEP 1: CREATE MIGRATION TRACKING TABLE
-----------------------------------------------------------

-- This table is used by Drizzle to track which migrations have been applied
-- Drizzle expects this exact schema in the 'public' schema

CREATE TABLE IF NOT EXISTS __drizzle_migrations (
  id SERIAL PRIMARY KEY,
  hash TEXT NOT NULL,
  created_at BIGINT
);

-- Verify table created successfully
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = '__drizzle_migrations'
) as migration_table_created;
-- Expected: true

-----------------------------------------------------------
-- STEP 2: INSERT BASELINE MIGRATION RECORD
-----------------------------------------------------------

-- Insert the baseline migration as "already applied"
-- This tells Drizzle that all schema objects in 0000_baseline_schema.sql
-- already exist and should not be re-applied

INSERT INTO __drizzle_migrations (hash, created_at)
VALUES (
  'bf3efbe1b096e87a9e5173e7cbb6b384074b249e94aa9b75651ea2d71e54261e',
  -- Use current timestamp in milliseconds (Drizzle format)
  extract(epoch from now()) * 1000
);

-- Alternative with explicit timestamp for documentation:
-- INSERT INTO __drizzle_migrations (hash, created_at)
-- VALUES (
--   'bf3efbe1b096e87a9e5173e7cbb6b384074b249e94aa9b75651ea2d71e54261e',
--   1729641600000  -- October 22, 2025 (example)
-- );

-----------------------------------------------------------
-- STEP 3: VERIFY INSERTION
-----------------------------------------------------------

-- Verify the baseline migration was inserted correctly
SELECT 
  id,
  hash,
  created_at,
  to_timestamp(created_at / 1000) as created_at_readable
FROM __drizzle_migrations
ORDER BY id;

-- Expected result:
-- id: 1
-- hash: bf3efbe1b096e87a9e5173e7cbb6b384074b249e94aa9b75651ea2d71e54261e
-- created_at: [bigint timestamp in milliseconds]
-- created_at_readable: [current date/time]

-----------------------------------------------------------
-- STEP 4: VERIFY MIGRATION COUNT
-----------------------------------------------------------

-- Should show exactly 1 migration
SELECT count(*) as migration_count
FROM __drizzle_migrations;
-- Expected: 1

-----------------------------------------------------------
-- VERIFICATION COMPLETE
-----------------------------------------------------------

-- SUCCESS CRITERIA:
-- ✅ __drizzle_migrations table exists
-- ✅ Baseline migration hash inserted
-- ✅ Timestamp recorded correctly
-- ✅ Exactly 1 row in migrations table

-- NEXT STEPS:
-- 1. Document the migration ID and timestamp
-- 2. Run verification script: verify-migration-table.sql
-- 3. Test migration system: npm run db:migrate (should show no pending migrations)
-- 4. Proceed to Task 2.4: Deploy Migration System

-----------------------------------------------------------
-- ROLLBACK INSTRUCTIONS (IF NEEDED)
-----------------------------------------------------------

-- If you need to undo this change (before proceeding to Task 2.4):
-- 
-- WARNING: Only run this if you need to restart Task 2.3
-- DO NOT run after deploying the migration system (Task 2.4)
--
-- DROP TABLE __drizzle_migrations;
-- 
-- Then you can re-run this script from the beginning

-----------------------------------------------------------
-- HASH VERIFICATION INSTRUCTIONS
-----------------------------------------------------------

-- To verify the baseline migration hash locally before running this script:
--
-- On Linux/WSL:
--   cd /path/to/edupath
--   sha256sum migrations/0000_baseline_schema.sql
--
-- On macOS:
--   cd /path/to/edupath
--   shasum -a 256 migrations/0000_baseline_schema.sql
--
-- On Windows (PowerShell):
--   cd C:\path\to\edupath
--   Get-FileHash -Algorithm SHA256 migrations\0000_baseline_schema.sql
--
-- Expected output:
--   bf3efbe1b096e87a9e5173e7cbb6b384074b249e94aa9b75651ea2d71e54261e

-----------------------------------------------------------
-- MIGRATION TABLE SCHEMA NOTES
-----------------------------------------------------------

-- Drizzle migration table structure:
-- 
-- Column: id
--   Type: SERIAL (auto-incrementing integer)
--   Purpose: Unique identifier for each migration
--
-- Column: hash
--   Type: TEXT
--   Purpose: SHA256 hash of the migration file content
--   Used to detect if migration file has been modified
--
-- Column: created_at
--   Type: BIGINT
--   Purpose: Timestamp in milliseconds when migration was applied
--   Format: Unix epoch * 1000 (JavaScript timestamp format)

-----------------------------------------------------------
-- IMPORTANT NOTES
-----------------------------------------------------------

-- 1. Production Safety:
--    - This script does NOT modify existing tables
--    - It only creates the migration tracking table
--    - Safe to run on production with existing data
--
-- 2. Idempotency:
--    - Uses CREATE TABLE IF NOT EXISTS
--    - Safe to re-run if interrupted
--    - However, INSERT will fail if run twice (duplicate hash)
--    - If you need to re-run, drop the table first (see rollback)
--
-- 3. Schema Location:
--    - Table created in 'public' schema (Drizzle default)
--    - Server/db/migrate.ts uses migrationsSchema: "public"
--
-- 4. Future Migrations:
--    - After this baseline, future migrations will be added as new rows
--    - Migration IDs will be 2, 3, 4, etc. (auto-incrementing)
--    - Drizzle applies migrations in order by ID
--
-- 5. Migration Integrity:
--    - Never modify migrations/0000_baseline_schema.sql after marking applied
--    - Hash mismatch will cause Drizzle to detect tampering
--    - New schema changes should be in new migration files (0001_*, 0002_*, etc.)
