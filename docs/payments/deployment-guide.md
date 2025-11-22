# Payment Tracking System Deployment Guide

## Overview

This guide covers the deployment of the payment tracking fix that resolves the revenue loss issue where upgrade payments were being overwritten in the `user_subscriptions` table.

## Problem Statement

**Issue**: When users upgraded their subscriptions, the payment amount in `user_subscriptions.amount_paid` was overwritten with the new payment amount, causing loss of previous payment history and revenue tracking errors.

**Solution**: Introduced a dedicated `payments` table that serves as a permanent ledger of all payment transactions (new subscriptions, upgrades, renewals).

## Architecture Changes

### New Database Table: `payments`

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  payment_type payment_type_enum NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  order_id VARCHAR(255),
  payment_reference VARCHAR(255),
  payment_gateway VARCHAR(50),
  paid_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Application Changes

1. **payment-transaction.service.ts**: Inserts payment records for BOTH new subscriptions AND upgrades
2. **subscription-analytics.service.ts**: Queries `payments` table for revenue metrics instead of `user_subscriptions.amount_paid`
3. **Backward Compatibility**: The `user_subscriptions.amount_paid` field remains unchanged for backward compatibility

## Pre-Deployment Checklist

- [ ] Database backup completed
- [ ] Migration file reviewed: `migrations/0024_create_payments_table.sql`
- [ ] Backfill script reviewed: `server/scripts/backfill-payments-ledger.ts`
- [ ] Tests passing: `npm test -- payment-ledger.test.ts`
- [ ] Code review completed
- [ ] Staging environment tested

## Deployment Sequence

### Step 1: Run Database Migration

```bash
# Development environment
npx drizzle-kit push:pg

# OR using direct migration
psql $DATABASE_URL -f migrations/0024_create_payments_table.sql
```

**Verification:**
```sql
-- Verify table exists
\dt payments

-- Verify indexes
\di payments_*

-- Check enum type
\dT payment_type_enum
```

### Step 2: Backfill Historical Data

```bash
# Run backfill script
npx tsx server/scripts/backfill-payments-ledger.ts
```

**Expected Output:**
```
✅ Starting payment ledger backfill...
✅ Found X subscription events to process
✅ Successfully inserted X payment records
✅ Backfill completed successfully
```

**Verification Queries:**
```sql
-- Count payments by type
SELECT payment_type, COUNT(*) 
FROM payments 
GROUP BY payment_type;

-- Verify total revenue matches
SELECT 
  SUM(CAST(amount AS NUMERIC)) as total_from_payments,
  (SELECT SUM(CAST(amount_paid AS NUMERIC)) FROM user_subscriptions WHERE amount_paid IS NOT NULL) as total_from_subscriptions;

-- Check for any missing events
SELECT COUNT(*) as events_without_payments
FROM subscription_events se
WHERE event_type IN ('subscription_created', 'subscription_upgraded')
  AND NOT EXISTS (
    SELECT 1 FROM payments p 
    WHERE p.order_id = se.metadata->>'orderId'
  );
```

### Step 3: Deploy Application Code

```bash
# Deploy updated services
git push origin main

# Restart application
# (deployment platform specific)
```

### Step 4: Verify Analytics

```bash
# Test revenue metrics endpoint
curl https://your-app.com/api/admin/analytics/revenue

# Expected: Total revenue should include all payments (initial + upgrades)
```

## Rollback Procedures

### Emergency Rollback (Application Only)

If issues are detected AFTER deployment but payments table is intact:

1. Revert application code:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. The `payments` table can remain - it won't affect the old code

### Full Rollback (Database + Application)

**⚠️ WARNING: Only use if absolutely necessary**

1. Drop the payments table:
   ```sql
   DROP TABLE IF EXISTS payments CASCADE;
   DROP TYPE IF EXISTS payment_type_enum CASCADE;
   ```

2. Revert application code (as above)

## Monitoring Guidelines

### Key Metrics to Monitor

1. **Revenue Accuracy**
   ```sql
   -- Daily revenue check
   SELECT 
     DATE(paid_at) as date,
     COUNT(*) as payment_count,
     SUM(CAST(amount AS NUMERIC)) as total_revenue
   FROM payments
   WHERE paid_at >= CURRENT_DATE - INTERVAL '7 days'
   GROUP BY DATE(paid_at)
   ORDER BY date DESC;
   ```

2. **Payment Type Distribution**
   ```sql
   SELECT 
     payment_type,
     COUNT(*) as count,
     SUM(CAST(amount AS NUMERIC)) as revenue
   FROM payments
   GROUP BY payment_type;
   ```

3. **Data Integrity**
   ```sql
   -- Check for orphaned payments
   SELECT COUNT(*) as orphaned_payments
   FROM payments p
   LEFT JOIN user_subscriptions us ON p.subscription_id = us.id
   WHERE us.id IS NULL;
   ```

### Application Logs to Watch

- Payment insertion errors in `payment-transaction.service.ts`
- Revenue calculation errors in `subscription-analytics.service.ts`
- Database transaction failures

### Alert Thresholds

- ❌ Zero payments inserted in last 24 hours (if traffic exists)
- ❌ Revenue metrics returning errors
- ❌ Orphaned payment records > 0

## Post-Deployment Validation

### Validation Checklist

- [ ] All historical payments backfilled successfully
- [ ] New subscription payments are recording to payments table
- [ ] Upgrade payments are recording to payments table (CRITICAL)
- [ ] Revenue metrics endpoint returns correct totals
- [ ] Analytics dashboard displays accurate data
- [ ] No application errors in logs
- [ ] Database performance acceptable (query times < 200ms)

### Test Scenarios

1. **Create New Subscription**
   - Make a payment for new subscription
   - Verify payment record in `payments` table
   - Verify analytics updated correctly

2. **Process Upgrade**
   - Upgrade existing subscription
   - Verify new payment record created (not updated)
   - Verify both payments visible in history
   - Verify total revenue includes both payments

3. **View Analytics**
   - Access admin analytics dashboard
   - Verify total revenue matches sum of all payments
   - Verify revenue by plan is accurate

## Troubleshooting

### Issue: Backfill script fails with duplicate key error

**Cause**: Payments table already has some records

**Solution**: 
```sql
-- Check existing payments
SELECT COUNT(*) FROM payments;

-- If safe to clear and re-run:
TRUNCATE payments CASCADE;

-- Then re-run backfill script
```

### Issue: Revenue metrics show 0 or incorrect values

**Cause**: Application code not updated or payments table empty

**Solution**:
1. Verify deployment: `git log -1`
2. Check payments table: `SELECT COUNT(*) FROM payments;`
3. Run backfill if empty
4. Check application logs for errors

### Issue: New payments not inserting

**Cause**: Database transaction failing or code not deployed

**Solution**:
1. Check application logs for transaction errors
2. Verify code deployment
3. Test database connectivity
4. Check for foreign key violations

## Performance Considerations

### Index Usage

The following indexes are created for optimal performance:

- `idx_payments_user_id`: Fast lookup by user
- `idx_payments_subscription_id`: Fast lookup by subscription
- `idx_payments_paid_at`: Time-based queries for analytics
- `idx_payments_payment_type`: Group by payment type

### Query Performance Targets

- Single user payment history: < 50ms
- Revenue metrics calculation: < 200ms
- Backfill script: < 5 seconds for 1000 events

## Success Criteria

✅ **Deployment is successful when:**

1. All historical payments are in `payments` table
2. New subscriptions insert payment records
3. Upgrades insert NEW payment records (not overwrite)
4. Revenue analytics show correct totals
5. No application errors in production logs
6. Database queries perform within acceptable ranges
7. Payment history is complete for all users

## Support Contacts

- **Database Issues**: DBA team
- **Application Issues**: Backend team
- **Analytics Issues**: Data team

## Related Documentation

- [PAYMENT_TRACKING_INVESTIGATION_REPORT.md](../../PAYMENT_TRACKING_INVESTIGATION_REPORT.md)
- [Analysis Report](./analysis-report.md)
- [Backfill Report](./backfill-report.md)
