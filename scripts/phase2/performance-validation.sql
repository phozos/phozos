-- PERFORMANCE VALIDATION SCRIPTS
-- Phase 2, Task 2.5: Post-Deployment Performance Checks
-- 
-- Purpose: Verify database performance after migration system deployment
--          Compare with pre-deployment baseline
--
-- Instructions:
-- 1. Run these queries BEFORE deployment to establish baseline
-- 2. Run again AFTER deployment to compare
-- 3. Document results in post-deployment-report-template.md
-- 
-- Expected Result: No significant performance degradation (< 10% slowdown)

-----------------------------------------------------------
-- SECTION 1: SIMPLE QUERY PERFORMANCE
-----------------------------------------------------------

-- Test 1: User lookup by email (common operation)
EXPLAIN ANALYZE
SELECT * FROM users 
WHERE email = 'admin@edupath.com';

-- Expected: Index scan, < 5ms
-- Baseline time: _____ ms
-- Post-deployment: _____ ms

-- Test 2: Active users query
EXPLAIN ANALYZE
SELECT id, email, first_name, last_name, user_type
FROM users 
WHERE account_status = 'active'
LIMIT 100;

-- Expected: < 50ms
-- Baseline time: _____ ms
-- Post-deployment: _____ ms

-- Test 3: Student profiles list
EXPLAIN ANALYZE
SELECT * FROM student_profiles
WHERE status = 'inquiry'
ORDER BY created_at DESC
LIMIT 50;

-- Expected: < 100ms
-- Baseline time: _____ ms
-- Post-deployment: _____ ms

-----------------------------------------------------------
-- SECTION 2: JOIN QUERY PERFORMANCE
-----------------------------------------------------------

-- Test 4: Student profiles with user information
EXPLAIN ANALYZE
SELECT 
  sp.id,
  sp.status,
  sp.intended_major,
  sp.created_at,
  u.email,
  u.first_name,
  u.last_name,
  u.account_status
FROM student_profiles sp
JOIN users u ON sp.user_id = u.id
WHERE sp.status IN ('inquiry', 'converted')
ORDER BY sp.created_at DESC
LIMIT 50;

-- Expected: Nested loop or hash join, < 150ms
-- Baseline time: _____ ms
-- Post-deployment: _____ ms

-- Test 5: Applications with university and user data
EXPLAIN ANALYZE
SELECT 
  a.id,
  a.status,
  a.submitted_at,
  u.name as university_name,
  u.country,
  usr.email as student_email,
  usr.first_name,
  usr.last_name
FROM applications a
JOIN universities u ON a.university_id = u.id
JOIN users usr ON a.user_id = usr.id
WHERE a.status = 'submitted'
ORDER BY a.submitted_at DESC
LIMIT 100;

-- Expected: Multiple joins, < 200ms
-- Baseline time: _____ ms
-- Post-deployment: _____ ms

-- Test 6: User subscriptions with plan details
EXPLAIN ANALYZE
SELECT 
  us.id,
  us.status,
  us.start_date,
  us.end_date,
  sp.name as plan_name,
  sp.tier,
  sp.price,
  u.email,
  u.first_name,
  u.last_name
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
JOIN users u ON us.user_id = u.id
WHERE us.status = 'active'
ORDER BY us.start_date DESC
LIMIT 100;

-- Expected: < 150ms
-- Baseline time: _____ ms
-- Post-deployment: _____ ms

-----------------------------------------------------------
-- SECTION 3: AGGREGATE QUERY PERFORMANCE
-----------------------------------------------------------

-- Test 7: Count active users by type
EXPLAIN ANALYZE
SELECT 
  user_type,
  count(*) as user_count
FROM users
WHERE account_status = 'active'
GROUP BY user_type;

-- Expected: Sequential scan or index scan, < 100ms
-- Baseline time: _____ ms
-- Post-deployment: _____ ms

-- Test 8: Application status distribution
EXPLAIN ANALYZE
SELECT 
  status,
  count(*) as application_count
FROM applications
GROUP BY status
ORDER BY application_count DESC;

-- Expected: < 150ms
-- Baseline time: _____ ms
-- Post-deployment: _____ ms

-- Test 9: Forum posts by category with counts
EXPLAIN ANALYZE
SELECT 
  category,
  count(*) as post_count,
  count(DISTINCT author_id) as unique_authors
FROM forum_posts_enhanced
WHERE is_deleted = false
GROUP BY category
ORDER BY post_count DESC;

-- Expected: < 200ms
-- Baseline time: _____ ms
-- Post-deployment: _____ ms

-----------------------------------------------------------
-- SECTION 4: COMPLEX QUERY PERFORMANCE
-----------------------------------------------------------

-- Test 10: Dashboard analytics query (complex aggregation)
EXPLAIN ANALYZE
WITH user_stats AS (
  SELECT 
    user_type,
    account_status,
    count(*) as count
  FROM users
  GROUP BY user_type, account_status
),
application_stats AS (
  SELECT 
    status,
    count(*) as count
  FROM applications
  GROUP BY status
)
SELECT 
  'users' as metric,
  json_agg(user_stats) as data
FROM user_stats
UNION ALL
SELECT 
  'applications' as metric,
  json_agg(application_stats) as data
FROM application_stats;

-- Expected: < 300ms
-- Baseline time: _____ ms
-- Post-deployment: _____ ms

-- Test 11: Student matching query (JSONB operations)
EXPLAIN ANALYZE
SELECT 
  id,
  user_id,
  intended_major,
  preferred_countries,
  test_scores->>'ielts' as ielts_score,
  test_scores->>'toefl' as toefl_score
FROM student_profiles
WHERE 
  'USA' = ANY(preferred_countries)
  AND (test_scores->>'ielts')::numeric >= 6.5
LIMIT 50;

-- Expected: JSONB operations, < 200ms
-- Baseline time: _____ ms
-- Post-deployment: _____ ms

-- Test 12: Forum post search with full-text (if implemented)
EXPLAIN ANALYZE
SELECT 
  id,
  title,
  content,
  category,
  created_at,
  author_id,
  likes_count,
  comments_count
FROM forum_posts_enhanced
WHERE 
  (title ILIKE '%study%' OR content ILIKE '%study%')
  AND is_deleted = false
ORDER BY created_at DESC
LIMIT 50;

-- Expected: Sequential scan or GIN index if available, < 300ms
-- Baseline time: _____ ms
-- Post-deployment: _____ ms

-----------------------------------------------------------
-- SECTION 5: WRITE OPERATION PERFORMANCE
-----------------------------------------------------------

-- Test 13: Insert performance (use transaction to rollback)
BEGIN;

EXPLAIN ANALYZE
INSERT INTO users (
  email, 
  password, 
  user_type, 
  first_name, 
  last_name, 
  account_status
) VALUES (
  'performance-test@example.com',
  'hashed_password_here',
  'customer',
  'Performance',
  'Test',
  'active'
);

-- Expected: < 10ms
-- Baseline time: _____ ms
-- Post-deployment: _____ ms

ROLLBACK;

-- Test 14: Update performance
BEGIN;

EXPLAIN ANALYZE
UPDATE users
SET last_login_at = now()
WHERE email = 'admin@edupath.com';

-- Expected: Index scan + update, < 15ms
-- Baseline time: _____ ms
-- Post-deployment: _____ ms

ROLLBACK;

-- Test 15: Delete performance (with FK cascade)
-- WARNING: This is just a test - wrapped in transaction
BEGIN;

-- Create test data
INSERT INTO users (email, password, user_type, first_name, last_name)
VALUES ('delete-test@example.com', 'password', 'customer', 'Delete', 'Test')
RETURNING id;
-- Note the returned ID: _____

-- Test delete performance
EXPLAIN ANALYZE
DELETE FROM users
WHERE email = 'delete-test@example.com';

-- Expected: < 20ms (may cascade to related tables)
-- Baseline time: _____ ms
-- Post-deployment: _____ ms

ROLLBACK;

-----------------------------------------------------------
-- SECTION 6: INDEX USAGE VERIFICATION
-----------------------------------------------------------

-- Test 16: Verify indexes are being used
-- This query shows which indexes are being scanned

SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan > 0
ORDER BY idx_scan DESC
LIMIT 20;

-- Note top indexes and their scan counts
-- Compare with pre-deployment to ensure similar patterns

-- Test 17: Identify unused indexes (candidates for removal)
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexname NOT LIKE '%pkey'
ORDER BY tablename, indexname;

-- Note any unused indexes
-- Consider removing if they slow down writes without benefit

-----------------------------------------------------------
-- SECTION 7: TABLE STATISTICS
-----------------------------------------------------------

-- Test 18: Table sizes and row counts
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS indexes_size,
  n_live_tup as estimated_rows,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- Compare table sizes pre and post deployment
-- Should be roughly the same (or slightly larger due to new data)

-- Test 19: Sequential scans vs index scans ratio
SELECT 
  tablename,
  seq_scan as sequential_scans,
  seq_tup_read as seq_tuples_read,
  idx_scan as index_scans,
  idx_tup_fetch as idx_tuples_fetched,
  CASE 
    WHEN (seq_scan + idx_scan) > 0 
    THEN ROUND(100.0 * seq_scan / (seq_scan + idx_scan), 2)
    ELSE 0
  END as seq_scan_percentage
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND (seq_scan + idx_scan) > 100
ORDER BY seq_scan_percentage DESC;

-- High seq_scan_percentage (>50%) on large tables may indicate missing indexes
-- Compare with pre-deployment to ensure similar patterns

-----------------------------------------------------------
-- SECTION 8: CONNECTION AND QUERY STATS
-----------------------------------------------------------

-- Test 20: Current database connections
SELECT 
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active_connections,
  count(*) FILTER (WHERE state = 'idle') as idle_connections,
  count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity
WHERE datname = current_database();

-- Compare connection counts pre and post deployment
-- Should be similar or slightly higher during deployment

-- Test 21: Long-running queries check
SELECT 
  pid,
  now() - query_start as duration,
  state,
  query
FROM pg_stat_activity
WHERE state != 'idle'
  AND now() - query_start > interval '5 seconds'
  AND datname = current_database()
ORDER BY duration DESC;

-- Should show no long-running queries (unless during batch operations)
-- If migration queries appear, they should complete quickly

-----------------------------------------------------------
-- SECTION 9: MIGRATION TABLE OVERHEAD CHECK
-----------------------------------------------------------

-- Test 22: Migration table size and performance impact
SELECT 
  pg_size_pretty(pg_total_relation_size('__drizzle_migrations')) as total_size,
  pg_size_pretty(pg_relation_size('__drizzle_migrations')) as table_size,
  (SELECT count(*) FROM __drizzle_migrations) as migration_count;

-- Expected: Very small size (< 100 KB), minimal overhead

-- Test 23: Query migration table performance
EXPLAIN ANALYZE
SELECT * FROM __drizzle_migrations
ORDER BY id;

-- Expected: Sequential scan (table is tiny), < 1ms

-----------------------------------------------------------
-- PERFORMANCE SUMMARY QUERY
-----------------------------------------------------------

-- Test 24: Overall performance health check
SELECT 
  'tables' as metric,
  count(*) as value
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 
  'total_rows_approx',
  sum(n_live_tup)::bigint
FROM pg_stat_user_tables
WHERE schemaname = 'public'
UNION ALL
SELECT 
  'total_size',
  pg_database_size(current_database())
FROM pg_database
WHERE datname = current_database()
UNION ALL
SELECT 
  'active_connections',
  count(*)::bigint
FROM pg_stat_activity
WHERE state = 'active' AND datname = current_database()
UNION ALL
SELECT 
  'migrations_applied',
  count(*)::bigint
FROM __drizzle_migrations;

-----------------------------------------------------------
-- DOCUMENTATION TEMPLATE
-----------------------------------------------------------

-- After running all performance tests, document results:
--
-- # Performance Validation Results
--
-- ## Simple Queries
-- - User lookup: ___ ms (baseline) → ___ ms (post) = ___% change
-- - Active users: ___ ms (baseline) → ___ ms (post) = ___% change
-- - Student profiles: ___ ms (baseline) → ___ ms (post) = ___% change
--
-- ## Join Queries  
-- - Students with users: ___ ms (baseline) → ___ ms (post) = ___% change
-- - Applications with data: ___ ms (baseline) → ___ ms (post) = ___% change
-- - Subscriptions: ___ ms (baseline) → ___ ms (post) = ___% change
--
-- ## Aggregate Queries
-- - User counts: ___ ms (baseline) → ___ ms (post) = ___% change
-- - Application stats: ___ ms (baseline) → ___ ms (post) = ___% change
-- - Forum categories: ___ ms (baseline) → ___ ms (post) = ___% change
--
-- ## Overall Assessment
-- - Average performance change: ____%
-- - Acceptable: [ ] Yes (< 10% slowdown) [ ] No
-- - Issues found: [None / List issues]
-- - Action required: [None / List actions]
