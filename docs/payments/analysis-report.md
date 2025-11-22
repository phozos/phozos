# Payment Tracking Analysis Report

**Generated**: 2025-11-09T17:41:30.954Z
**Purpose**: Data analysis for payment ledger migration

---

## USERS WITH MULTIPLE PAYMENT EVENTS

**Execution Time**: 550ms
**Rows Returned**: 1

### Results

| user_id                              | email            | user_name            | payment_event_count | subscription_count | reported_revenue | actual_revenue       | revenue_gap             |
|--------------------------------------|------------------|----------------------|---------------------|--------------------|------------------|----------------------|-------------------------|
| d5316780-b1c2-40d5-9e94-94bcd1c53a28 | admin@phozos.com | Phozos Administrator | 2                   | 1                  | 20000.00         | 400.0000000000000000 | -19600.0000000000000000 |

---

## REVENUE GAP CALCULATION

**Execution Time**: 67ms
**Rows Returned**: 1

### Results

| total_reported_revenue | total_actual_revenue | revenue_gap             | revenue_gap_percentage |
|------------------------|----------------------|-------------------------|------------------------|
| 40000.00               | 400.0000000000000000 | -39600.0000000000000000 | -99.00                 |

---

## METADATA COVERAGE VERIFICATION

**Execution Time**: 68ms
**Rows Returned**: 2

### Results

| event_type            | total_events | has_amount_paid | has_order_id | has_payment_id | has_currency | metadata_coverage_pct |
|-----------------------|--------------|-----------------|--------------|----------------|--------------|-----------------------|
| subscription_created  | 1            | 1               | 1            | 1              | 1            | 100.00                |
| subscription_upgraded | 1            | 1               | 1            | 1              | 1            | 100.00                |

---

## PAYMENT EVENT HISTORY

**Execution Time**: 67ms
**Rows Returned**: 2

### Results

| email            | user_name            | event_type            | amount_paid_rupees   | currency   | order_id             | payment_id         | plan_name  | payment_date               |
|------------------|----------------------|-----------------------|----------------------|------------|----------------------|--------------------|------------|----------------------------|
| admin@phozos.com | Phozos Administrator | subscription_created  | 200.0000000000000000 | INR        | order_RdijHKBSibuCoD | pay_RdijcDOzHze0Nx | basic      | 2025-11-09 17:16:00.18878  |
| admin@phozos.com | Phozos Administrator | subscription_upgraded | 200.0000000000000000 | INR        | order_Rdikflcjlq8AJ1 | pay_RdiktEFRV8XQOD | premium    | 2025-11-09 17:17:14.204435 |

---

## BEFORE AFTER REVENUE REPORT

**Execution Time**: 65ms
**Rows Returned**: 2

### Results

| source                                   | total_revenue        | unique_users | total_records |
|------------------------------------------|----------------------|--------------|---------------|
| Current (user_subscriptions.amount_paid) | 20000.00             | 1            | 1             |
| After Fix (subscription_events.metadata) | 400.0000000000000000 | 1            | 2             |

---

## DUPLICATE PAYMENT DETECTION

**Execution Time**: 63ms
**Rows Returned**: 0

*No data found*

---

## PAYMENT TYPE DISTRIBUTION

**Execution Time**: 67ms
**Rows Returned**: 2

### Results

| payment_type     | event_count | total_amount_rupees  | avg_amount_rupees    | earliest_payment           | latest_payment             |
|------------------|-------------|----------------------|----------------------|----------------------------|----------------------------|
| new_subscription | 1           | 200.0000000000000000 | 200.0000000000000000 | 2025-11-09 17:16:00.18878  | 2025-11-09 17:16:00.18878  |
| upgrade          | 1           | 200.0000000000000000 | 200.0000000000000000 | 2025-11-09 17:17:14.204435 | 2025-11-09 17:17:14.204435 |

---

