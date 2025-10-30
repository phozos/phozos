-- PRODUCTION SCHEMA VALIDATION SCRIPT
-- Phase 2, Task 2.2: Validate Production Schema
-- 
-- Purpose: Verify production database schema matches expectations before
--          marking baseline migration as applied
--
-- Instructions:
-- 1. Connect to production database (read-only recommended)
-- 2. Run each section sequentially
-- 3. Document results in schema-validation-report-template.md
-- 4. Compare results with expectations in comments
-- 
-- Expected Results:
-- - 31 tables in public schema
-- - 15 enums
-- - 45+ foreign key constraints
-- - No unexpected schema objects

-----------------------------------------------------------
-- SECTION 1: TABLE COUNT AND INVENTORY
-----------------------------------------------------------

-- Count all tables in public schema
SELECT count(*) as total_tables 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE';
-- Expected: 31

-- List all tables (alphabetically)
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Expected tables (31 total):
-- ai_matching_results
-- applications
-- chat_messages
-- courses
-- custom_field_values
-- custom_fields
-- documents
-- event_registrations
-- events
-- forum_comments
-- forum_likes
-- forum_poll_votes
-- forum_post_limits
-- forum_post_reports
-- forum_posts_enhanced
-- forum_saves
-- ip_registration_limits
-- login_attempts
-- notifications
-- payment_settings
-- security_events
-- security_settings
-- staff_invitation_links
-- student_profiles
-- student_timeline
-- subscriptions (legacy)
-- subscription_plans
-- testimonials
-- universities
-- user_subscriptions
-- users

-----------------------------------------------------------
-- SECTION 2: ENUM COUNT AND INVENTORY
-----------------------------------------------------------

-- Count all enums
SELECT count(*) as total_enums 
FROM pg_type 
WHERE typcategory = 'E';
-- Expected: 15

-- List all enums with their values
SELECT 
    t.typname as enum_name,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typcategory = 'E'
GROUP BY t.typname
ORDER BY t.typname;

-- Expected enums (15 total):
-- account_status: active, inactive, pending_approval, suspended, rejected
-- application_status: draft, submitted, under_review, accepted, rejected, waitlisted
-- dashboard_section: counselor
-- document_type: transcript, test_score, essay, recommendation, resume, certificate, other
-- field_type: text, textarea, number, date, dropdown, checkbox, file
-- forum_category: general, usa_study, uk_study, canada_study, australia_study, ielts_prep, visa_tips, scholarships, europe_study
-- notification_type: application_update, document_reminder, message, system, deadline
-- report_reason: spam, inappropriate, harassment, misinformation, off_topic, other
-- student_status: inquiry, converted, visa_applied, visa_approved, departed
-- subscription_status: active, expired, cancelled, pending
-- subscription_tier: free, premium, elite
-- support_type: email, whatsapp, phone, premium
-- team_role: admin, counselor
-- university_tier: general, top500, top200, top100, ivy_league
-- user_type: customer, team_member, company_profile

-----------------------------------------------------------
-- SECTION 3: FOREIGN KEY CONSTRAINTS
-----------------------------------------------------------

-- Count foreign key constraints
SELECT count(*) as total_foreign_keys
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND table_schema = 'public';
-- Expected: 45+

-- List all foreign key constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-----------------------------------------------------------
-- SECTION 4: PRIMARY KEY CONSTRAINTS
-----------------------------------------------------------

-- Count tables with UUID primary keys
SELECT count(*) as uuid_pk_tables
FROM information_schema.columns c
JOIN information_schema.table_constraints tc 
  ON tc.table_name = c.table_name 
  AND tc.table_schema = c.table_schema
JOIN information_schema.key_column_usage kcu 
  ON kcu.constraint_name = tc.constraint_name
  AND kcu.table_schema = tc.table_schema
  AND kcu.column_name = c.column_name
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND c.table_schema = 'public'
  AND c.data_type = 'uuid';
-- Expected: 31 (all tables should use UUID PKs)

-- List primary keys by table
SELECT 
    tc.table_name,
    kcu.column_name as pk_column,
    c.data_type as pk_type
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.columns c
  ON c.table_name = tc.table_name
  AND c.table_schema = tc.table_schema
  AND c.column_name = kcu.column_name
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-----------------------------------------------------------
-- SECTION 5: INDEXES
-----------------------------------------------------------

-- Count indexes (excluding primary keys)
SELECT count(*) as total_indexes
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%pkey';
-- Result will vary based on custom indexes

-- List all indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-----------------------------------------------------------
-- SECTION 6: UNEXPECTED OBJECTS CHECK
-----------------------------------------------------------

-- Check for views (should be none or documented)
SELECT count(*) as total_views
FROM information_schema.views
WHERE table_schema = 'public';
-- Expected: 0 (or document any views)

-- List views if any
SELECT table_name as view_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check for custom functions (should be minimal or documented)
SELECT count(*) as total_functions
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION';
-- Expected: 0-5 (document any custom functions)

-- List custom functions if any
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Check for triggers (should be documented if present)
SELECT count(*) as total_triggers
FROM information_schema.triggers
WHERE trigger_schema = 'public';
-- Expected: 0-10 (document any triggers)

-- List triggers if any
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-----------------------------------------------------------
-- SECTION 7: TABLE SIZE AND ROW COUNTS
-----------------------------------------------------------

-- Get table sizes (useful for backup verification)
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Get approximate row counts (fast estimate)
SELECT 
    schemaname,
    relname as tablename,
    n_live_tup as estimated_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-----------------------------------------------------------
-- SECTION 8: CRITICAL TABLE VERIFICATION
-----------------------------------------------------------

-- Verify critical tables have data (production should have records)
SELECT 'users' as table_name, count(*) as record_count FROM users
UNION ALL
SELECT 'student_profiles', count(*) FROM student_profiles
UNION ALL
SELECT 'universities', count(*) FROM universities
UNION ALL
SELECT 'security_settings', count(*) FROM security_settings
UNION ALL
SELECT 'subscription_plans', count(*) FROM subscription_plans
UNION ALL
SELECT 'forum_posts_enhanced', count(*) FROM forum_posts_enhanced
ORDER BY table_name;

-- Expected: All should have > 0 records (except possibly forum posts)

-----------------------------------------------------------
-- SECTION 9: SCHEMA VERSION CHECK
-----------------------------------------------------------

-- Check PostgreSQL version
SELECT version();
-- Should be PostgreSQL 14+ (Supabase typically uses recent versions)

-- Check for existing migration table (should NOT exist yet)
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = '__drizzle_migrations'
) as migration_table_exists;
-- Expected: false (we haven't created it yet)

-----------------------------------------------------------
-- SECTION 10: DISCREPANCY DETECTION
-----------------------------------------------------------

-- Find tables with unexpected column types
-- This query helps identify schema drift from schema.ts
SELECT 
    table_name,
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'users', 'student_profiles', 'universities', 'applications',
    'documents', 'notifications', 'forum_posts_enhanced'
  )
ORDER BY table_name, ordinal_position;

-- Review this output against schema.ts to identify any discrepancies

-----------------------------------------------------------
-- VALIDATION COMPLETE
-----------------------------------------------------------

-- Summary Query: Quick Health Check
SELECT 
    (SELECT count(*) FROM information_schema.tables 
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as table_count,
    (SELECT count(*) FROM pg_type WHERE typcategory = 'E') as enum_count,
    (SELECT count(*) FROM information_schema.table_constraints
     WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public') as fk_count,
    (SELECT count(*) FROM information_schema.table_constraints
     WHERE constraint_type = 'PRIMARY KEY' AND table_schema = 'public') as pk_count,
    (SELECT count(*) FROM users) as user_count,
    (SELECT count(*) FROM security_settings) as security_settings_count;

-- Expected:
-- table_count: 31
-- enum_count: 15
-- fk_count: 45+
-- pk_count: 31
-- user_count: > 0
-- security_settings_count: >= 5

-- After running all sections, document results in:
-- docs/phase2/schema-validation-report-template.md
