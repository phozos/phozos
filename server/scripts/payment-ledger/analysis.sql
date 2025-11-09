-- Payment Tracking Analysis Queries
-- Purpose: Identify revenue tracking gaps and validate data for migration
-- Date: November 09, 2025

-- ============================================================================
-- ANALYSIS 1: Users with Multiple Payment Events but Single Amount Paid
-- ============================================================================
-- This identifies users who have upgraded (multiple payment events) but whose
-- user_subscriptions.amount_paid only reflects the latest payment

WITH user_payment_counts AS (
  SELECT 
    se.user_id,
    u.email,
    u.first_name,
    u.last_name,
    COUNT(DISTINCT se.id) FILTER (WHERE se.event_type IN ('subscription_created', 'subscription_upgraded')) as payment_event_count,
    COUNT(DISTINCT us.id) as subscription_count,
    MAX(us.amount_paid) as current_amount_paid,
    COALESCE(
      SUM(CAST(se.metadata->>'amountPaid' AS NUMERIC)) FILTER (WHERE se.event_type IN ('subscription_created', 'subscription_upgraded')),
      0
    ) / 100 as total_actual_payments -- Convert from paise to rupees
  FROM subscription_events se
  JOIN users u ON se.user_id = u.id
  LEFT JOIN user_subscriptions us ON se.user_id = us.user_id
  WHERE se.event_type IN ('subscription_created', 'subscription_upgraded')
  GROUP BY se.user_id, u.email, u.first_name, u.last_name
)
SELECT 
  user_id,
  email,
  COALESCE(first_name || ' ' || last_name, email) as user_name,
  payment_event_count,
  subscription_count,
  current_amount_paid as reported_revenue,
  total_actual_payments as actual_revenue,
  (total_actual_payments - COALESCE(current_amount_paid, 0)) as revenue_gap
FROM user_payment_counts
WHERE payment_event_count > 1
ORDER BY revenue_gap DESC;

-- ============================================================================
-- ANALYSIS 2: Revenue Gap Calculation
-- ============================================================================
-- Calculate total revenue gap between actual payments and reported amounts

WITH revenue_summary AS (
  SELECT 
    SUM(COALESCE(us.amount_paid, 0)) as total_reported_revenue,
    SUM(
      CAST(se.metadata->>'amountPaid' AS NUMERIC)
    ) / 100 as total_actual_revenue -- Convert from paise to rupees
  FROM subscription_events se
  LEFT JOIN user_subscriptions us ON se.user_id = us.user_id
  WHERE se.event_type IN ('subscription_created', 'subscription_upgraded')
)
SELECT 
  total_reported_revenue,
  total_actual_revenue,
  (total_actual_revenue - total_reported_revenue) as revenue_gap,
  CASE 
    WHEN total_reported_revenue > 0 
    THEN ROUND(((total_actual_revenue - total_reported_revenue) / total_reported_revenue * 100)::numeric, 2)
    ELSE 0 
  END as revenue_gap_percentage
FROM revenue_summary;

-- ============================================================================
-- ANALYSIS 3: Metadata Coverage Verification
-- ============================================================================
-- Verify that all subscription_events have complete payment metadata

SELECT 
  event_type,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE metadata->>'amountPaid' IS NOT NULL) as has_amount_paid,
  COUNT(*) FILTER (WHERE metadata->>'orderId' IS NOT NULL) as has_order_id,
  COUNT(*) FILTER (WHERE metadata->>'paymentId' IS NOT NULL) as has_payment_id,
  COUNT(*) FILTER (WHERE metadata->>'currency' IS NOT NULL) as has_currency,
  ROUND(
    (COUNT(*) FILTER (WHERE metadata->>'amountPaid' IS NOT NULL)::numeric / COUNT(*) * 100)::numeric, 
    2
  ) as metadata_coverage_pct
FROM subscription_events
WHERE event_type IN ('subscription_created', 'subscription_upgraded')
GROUP BY event_type
ORDER BY event_type;

-- ============================================================================
-- ANALYSIS 4: Payment Event History by User
-- ============================================================================
-- Show complete payment history for each user from subscription_events

SELECT 
  u.email,
  COALESCE(u.first_name || ' ' || u.last_name, u.email) as user_name,
  se.event_type,
  CAST(se.metadata->>'amountPaid' AS NUMERIC) / 100 as amount_paid_rupees,
  se.metadata->>'currency' as currency,
  se.metadata->>'orderId' as order_id,
  se.metadata->>'paymentId' as payment_id,
  CASE 
    WHEN se.event_type = 'subscription_created' THEN se.metadata->>'planName'
    WHEN se.event_type = 'subscription_upgraded' THEN 
      (SELECT name FROM subscription_plans WHERE id = CAST(se.metadata->>'newPlanId' AS UUID))
    ELSE NULL
  END as plan_name,
  se.created_at as payment_date
FROM subscription_events se
JOIN users u ON se.user_id = u.id
WHERE se.event_type IN ('subscription_created', 'subscription_upgraded')
ORDER BY u.email, se.created_at;

-- ============================================================================
-- ANALYSIS 5: Before/After Revenue Report
-- ============================================================================
-- Compare current revenue tracking vs what it will be after fix

WITH current_state AS (
  SELECT 
    'Current (user_subscriptions.amount_paid)' as source,
    SUM(COALESCE(amount_paid, 0)) as total_revenue,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_records
  FROM user_subscriptions
  WHERE status = 'active'
),
future_state AS (
  SELECT 
    'After Fix (subscription_events.metadata)' as source,
    SUM(CAST(metadata->>'amountPaid' AS NUMERIC)) / 100 as total_revenue,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_records
  FROM subscription_events
  WHERE event_type IN ('subscription_created', 'subscription_upgraded')
)
SELECT * FROM current_state
UNION ALL
SELECT * FROM future_state;

-- ============================================================================
-- ANALYSIS 6: Duplicate Payment Detection
-- ============================================================================
-- Check for any duplicate order_ids or payment_ids in metadata

WITH payment_refs AS (
  SELECT 
    se.metadata->>'orderId' as order_id,
    se.metadata->>'paymentId' as payment_id,
    COUNT(*) as occurrence_count
  FROM subscription_events se
  WHERE se.event_type IN ('subscription_created', 'subscription_upgraded')
    AND se.metadata->>'orderId' IS NOT NULL
  GROUP BY se.metadata->>'orderId', se.metadata->>'paymentId'
  HAVING COUNT(*) > 1
)
SELECT 
  order_id,
  payment_id,
  occurrence_count,
  'DUPLICATE DETECTED' as status
FROM payment_refs;

-- ============================================================================
-- ANALYSIS 7: Payment Type Distribution
-- ============================================================================
-- Classify payments into types for future payments table

SELECT 
  CASE 
    WHEN event_type = 'subscription_created' THEN 'new_subscription'
    WHEN event_type = 'subscription_upgraded' THEN 'upgrade'
    ELSE 'unknown'
  END as payment_type,
  COUNT(*) as event_count,
  SUM(CAST(metadata->>'amountPaid' AS NUMERIC)) / 100 as total_amount_rupees,
  AVG(CAST(metadata->>'amountPaid' AS NUMERIC)) / 100 as avg_amount_rupees,
  MIN(created_at) as earliest_payment,
  MAX(created_at) as latest_payment
FROM subscription_events
WHERE event_type IN ('subscription_created', 'subscription_upgraded')
GROUP BY event_type
ORDER BY payment_type;
