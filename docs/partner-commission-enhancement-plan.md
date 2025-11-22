# Partner Commission System Enhancement Plan
## Industry Standards Implementation (2025)

**Document Version:** 1.0  
**Date:** November 15, 2025  
**Status:** Awaiting Approval

---

## Executive Summary

This document outlines a comprehensive enhancement plan for the partner commission system to align with 2025 industry standards. The current system has a solid foundation but lacks critical risk management features for refund/chargeback handling, commission hold periods, and administrative flexibility.

**Key Objectives:**
1. Implement industry-standard refund/chargeback protection
2. Add configurable commission hold periods (7-90 days)
3. Ensure first-payment-only commission enforcement
4. Provide full admin control through dashboard
5. Establish reserve pool mechanism for risk management
6. Add comprehensive fraud detection and monitoring

**Estimated Timeline:** 6-8 weeks  
**Complexity:** Medium-High  
**Priority:** Critical (prevents financial losses)

---

## Current State Analysis

### ✅ What's Working
- Basic commission calculation (percentage & fixed)
- Manual approval/rejection workflow
- Payout processing (bank transfer & PayPal)
- Partner dashboard and analytics
- Transaction safety with proper locking
- Audit trail with timestamps

### ❌ Critical Gaps
- No refund/chargeback handling (webhooks missing)
- No commission hold periods (immediate visibility)
- No first-payment enforcement (allows repeat commissions)
- Hardcoded settings (no admin flexibility)
- No reserve pool mechanism
- No automated fraud detection
- No negative balance handling

### 📊 Industry Benchmarks (2025)
- **Hold Period:** 30-90 days standard (not 7 days)
- **Chargeback Threshold:** <1% ratio (industry critical)
- **Reserve Pool:** 10-20% of commissions
- **First Payment Only:** Strictly enforced
- **Admin Control:** Full configurability required

---

## Implementation Phases

## Phase 1: Critical Risk Management (Week 1-2)
**Priority:** CRITICAL  
**Goal:** Prevent financial losses from refunds/chargebacks

### 1.1 Database Schema Enhancements

**Add new commission statuses:**
```sql
-- Extend commission status enum
ALTER TYPE commission_status ADD VALUE IF NOT EXISTS 'on_hold';
ALTER TYPE commission_status ADD VALUE IF NOT EXISTS 'reversed';
ALTER TYPE commission_status ADD VALUE IF NOT EXISTS 'refunded';

-- Add hold/reversal tracking columns
ALTER TABLE partner_commissions
ADD COLUMN IF NOT EXISTS visible_after TIMESTAMP,
ADD COLUMN IF NOT EXISTS available_for_payout_after TIMESTAMP,
ADD COLUMN IF NOT EXISTS hold_reason TEXT,
ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS reversed_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS reversal_reason TEXT,
ADD COLUMN IF NOT EXISTS related_refund_id TEXT,
ADD COLUMN IF NOT EXISTS related_chargeback_id TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_commissions_visible_after 
  ON partner_commissions(visible_after) WHERE status NOT IN ('reversed', 'rejected');
CREATE INDEX IF NOT EXISTS idx_commissions_available_for_payout 
  ON partner_commissions(available_for_payout_after) WHERE status = 'approved';
```

**Create refund/chargeback tracking tables:**
```sql
-- Track refund events
CREATE TABLE IF NOT EXISTS payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  razorpay_refund_id TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  status VARCHAR(50) NOT NULL, -- 'pending', 'processed', 'failed'
  reason TEXT,
  initiated_by UUID REFERENCES users(id),
  initiated_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(payment_id, razorpay_refund_id)
);

-- Track chargeback/dispute events
CREATE TABLE IF NOT EXISTS payment_chargebacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  razorpay_dispute_id TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  status VARCHAR(50) NOT NULL, -- 'open', 'won', 'lost', 'closed'
  reason TEXT,
  evidence_submitted BOOLEAN DEFAULT FALSE,
  evidence_deadline TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution_outcome TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(payment_id, razorpay_dispute_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment_id ON payment_refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_refunds_status ON payment_refunds(status);
CREATE INDEX IF NOT EXISTS idx_payment_chargebacks_payment_id ON payment_chargebacks(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_chargebacks_status ON payment_chargebacks(status);
```

### 1.2 Razorpay Webhook Handlers

**Add new webhook events to payment controller:**

```typescript
// server/controllers/payment.controller.ts

// Add new webhook event handlers
switch (event) {
  case 'payment.captured':
    await this.handlePaymentCaptured(payload.payment.entity);
    break;
  
  case 'payment.failed':
    await this.handlePaymentFailed(payload.payment.entity);
    break;
  
  case 'order.paid':
    await this.handleOrderPaid(payload.order.entity);
    break;
  
  // NEW: Refund handling
  case 'refund.created':
    await this.handleRefundCreated(payload.refund.entity);
    break;
  
  case 'refund.processed':
    await this.handleRefundProcessed(payload.refund.entity);
    break;
  
  case 'refund.failed':
    await this.handleRefundFailed(payload.refund.entity);
    break;
  
  // NEW: Chargeback/Dispute handling
  case 'payment.dispute.created':
    await this.handleDisputeCreated(payload.dispute.entity);
    break;
  
  case 'payment.dispute.won':
    await this.handleDisputeWon(payload.dispute.entity);
    break;
  
  case 'payment.dispute.lost':
    await this.handleDisputeLost(payload.dispute.entity);
    break;
  
  case 'payment.dispute.closed':
    await this.handleDisputeClosed(payload.dispute.entity);
    break;
}
```

**Implement handler methods:**

```typescript
// Handle refund creation
private async handleRefundCreated(refund: any) {
  const paymentId = await this.getPaymentIdFromRazorpay(refund.payment_id);
  
  // Record refund in database
  await refundRepository.create({
    payment_id: paymentId,
    razorpay_refund_id: refund.id,
    amount: refund.amount / 100,
    status: 'pending',
    reason: 'Customer requested refund'
  });
  
  // Check if commission exists for this payment
  const commission = await commissionRepository.findByPaymentId(paymentId);
  
  if (commission) {
    const payment = await paymentRepository.findById(paymentId);
    const daysSincePayment = differenceInDays(new Date(), payment.paidAt);
    
    // Apply hold period logic (configurable via admin settings)
    const holdPeriodDays = await settingsService.get('commission_refund_hold_period', 7);
    
    if (daysSincePayment <= holdPeriodDays) {
      // Within hold period: reverse commission immediately
      await commissionService.reverseCommission(
        commission.id,
        'refund_within_hold_period',
        refund.id
      );
      
      logger.info('Commission reversed due to refund within hold period', {
        commissionId: commission.id,
        paymentId,
        refundId: refund.id,
        daysSincePayment,
        holdPeriodDays
      });
    } else {
      // Outside hold period: put on hold pending investigation
      await commissionService.putCommissionOnHold(
        commission.id,
        'refund_after_hold_period',
        `Refund requested ${daysSincePayment} days after payment`
      );
    }
  }
}

// Handle chargeback/dispute creation
private async handleDisputeCreated(dispute: any) {
  const paymentId = await this.getPaymentIdFromRazorpay(dispute.payment_id);
  
  // Record chargeback
  await chargebackRepository.create({
    payment_id: paymentId,
    razorpay_dispute_id: dispute.id,
    amount: dispute.amount / 100,
    status: 'open',
    reason: dispute.reason_code,
    evidence_deadline: new Date(dispute.respond_by * 1000)
  });
  
  // Immediately put commission on hold
  const commission = await commissionRepository.findByPaymentId(paymentId);
  if (commission && commission.status !== 'reversed') {
    await commissionService.putCommissionOnHold(
      commission.id,
      'chargeback_dispute',
      `Chargeback filed: ${dispute.reason_code}`
    );
    
    // Alert admin
    await alertingService.sendChargebackAlert(commission, dispute);
  }
}

// Handle dispute resolution
private async handleDisputeWon(dispute: any) {
  const chargeback = await chargebackRepository.findByRazorpayId(dispute.id);
  await chargebackRepository.update(chargeback.id, {
    status: 'won',
    resolved_at: new Date(),
    resolution_outcome: 'Dispute won by merchant'
  });
  
  // Release commission from hold
  const commission = await commissionRepository.findByPaymentId(chargeback.payment_id);
  if (commission && commission.status === 'on_hold') {
    await commissionService.releaseFromHold(
      commission.id,
      'Chargeback won - payment validated'
    );
  }
}

private async handleDisputeLost(dispute: any) {
  const chargeback = await chargebackRepository.findByRazorpayId(dispute.id);
  await chargebackRepository.update(chargeback.id, {
    status: 'lost',
    resolved_at: new Date(),
    resolution_outcome: 'Dispute lost - funds returned to customer'
  });
  
  // Reverse commission permanently
  const commission = await commissionRepository.findByPaymentId(chargeback.payment_id);
  if (commission && commission.status !== 'reversed') {
    await commissionService.reverseCommission(
      commission.id,
      'chargeback_lost',
      chargeback.razorpay_dispute_id
    );
  }
}
```

### 1.3 Commission Service Enhancements

**Add new service methods:**

```typescript
// server/services/domain/commission.service.ts

async reverseCommission(
  commissionId: string,
  reason: string,
  referenceId?: string
): Promise<void> {
  await db.transaction(async (tx) => {
    const commission = await this.commissionRepo.findById(commissionId, tx);
    
    // Update commission status
    await this.commissionRepo.update(commissionId, {
      status: 'reversed',
      reversed_at: new Date(),
      reversal_reason: reason,
      related_refund_id: referenceId || null,
      updated_at: new Date()
    }, tx);
    
    // Update referral
    await this.partnerStudentReferralRepo.updateCommission(
      commission.referralId,
      -Number(commission.commissionAmount),
      'reversed',
      tx
    );
    
    // Deduct from partner's total earned
    await this.partnerProfileRepo.updateCommissionEarned(
      commission.partnerId,
      -Number(commission.commissionAmount),
      tx
    );
    
    // If commission was already in a payout, handle negative balance
    if (commission.payoutId) {
      await this.handleNegativeBalance(commission.partnerId, commission, tx);
    }
  });
}

async putCommissionOnHold(
  commissionId: string,
  reason: string,
  details: string
): Promise<void> {
  await this.commissionRepo.update(commissionId, {
    status: 'on_hold',
    hold_reason: reason,
    notes: details,
    updated_at: new Date()
  });
  
  // Notify partner
  await notificationService.sendCommissionHoldNotification(commissionId);
}

async releaseFromHold(commissionId: string, reason: string): Promise<void> {
  const commission = await this.commissionRepo.findById(commissionId);
  
  // Restore to previous status (usually 'approved')
  const previousStatus = commission.approvedAt ? 'approved' : 'pending';
  
  await this.commissionRepo.update(commissionId, {
    status: previousStatus,
    hold_reason: null,
    notes: `Released from hold: ${reason}`,
    updated_at: new Date()
  });
}

private async handleNegativeBalance(
  partnerId: string,
  reversedCommission: PartnerCommission,
  tx: DbOrTransaction
): Promise<void> {
  // Create a negative commission record to track the debt
  await this.commissionRepo.create({
    partnerId,
    referralId: reversedCommission.referralId,
    paymentId: reversedCommission.paymentId,
    baseAmount: `-${reversedCommission.baseAmount}`,
    commissionRate: reversedCommission.commissionRate,
    commissionAmount: `-${reversedCommission.commissionAmount}`,
    currency: reversedCommission.currency,
    status: 'approved',
    notes: `Negative balance from reversed commission ${reversedCommission.id}`
  }, tx);
  
  // Mark in partner notes
  const partner = await this.partnerProfileRepo.findById(partnerId, tx);
  await this.partnerProfileRepo.update(partnerId, {
    notes: (partner.notes || '') + `\n[${new Date().toISOString()}] Negative balance from reversed commission: ${formatCurrency(reversedCommission.commissionAmount, 'INR')}`
  }, tx);
}
```

### 1.4 Testing Requirements

**Critical test scenarios:**
1. Refund within 7 days → commission reversed immediately
2. Refund after 7 days → commission put on hold
3. Chargeback filed → commission put on hold immediately
4. Chargeback won → commission released from hold
5. Chargeback lost → commission reversed permanently
6. Negative balance handling → prevents partner payout until cleared

---

## Phase 2: Commission Hold Periods & Visibility (Week 3)
**Priority:** HIGH  
**Goal:** Implement configurable hold periods with industry standards

### 2.1 Database Configuration Table

```sql
-- Create commission settings table
CREATE TABLE IF NOT EXISTS commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type VARCHAR(50) NOT NULL, -- 'number', 'boolean', 'string', 'json'
  description TEXT,
  category VARCHAR(50) NOT NULL, -- 'hold_periods', 'rates', 'thresholds', 'limits'
  is_editable BOOLEAN DEFAULT TRUE,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default industry-standard settings
INSERT INTO commission_settings (setting_key, setting_value, setting_type, description, category) VALUES
('commission_hold_period_days', '30', 'number', 'Days to wait before commission becomes visible to partner', 'hold_periods'),
('commission_payout_hold_period_days', '60', 'number', 'Days to wait before commission can be withdrawn', 'hold_periods'),
('refund_hold_period_days', '7', 'number', 'Days within which refunds reverse commission automatically', 'hold_periods'),
('chargeback_hold_period_days', '90', 'number', 'Days to hold commission for potential chargebacks', 'hold_periods'),
('minimum_payout_amount', '1000.00', 'number', 'Minimum amount required for payout (INR)', 'thresholds'),
('default_commission_rate', '10.00', 'number', 'Default commission rate percentage', 'rates'),
('reserve_pool_percentage', '15.00', 'number', 'Percentage of commissions to hold in reserve', 'limits'),
('max_chargeback_rate_percentage', '1.00', 'number', 'Maximum allowed chargeback rate before partner review', 'thresholds'),
('enable_auto_commission_approval', 'false', 'boolean', 'Automatically approve commissions after hold period', 'automation'),
('enable_negative_balance_blocking', 'true', 'boolean', 'Block payouts for partners with negative balance', 'limits');

CREATE INDEX IF NOT EXISTS idx_commission_settings_category ON commission_settings(category);
CREATE INDEX IF NOT EXISTS idx_commission_settings_key ON commission_settings(setting_key);
```

### 2.2 Settings Service

```typescript
// server/services/domain/commission-settings.service.ts

export class CommissionSettingsService {
  async get(key: string, defaultValue?: any): Promise<any> {
    const setting = await settingsRepository.findByKey(key);
    if (!setting) return defaultValue;
    
    // Parse based on type
    switch (setting.setting_type) {
      case 'number':
        return parseFloat(setting.setting_value);
      case 'boolean':
        return setting.setting_value === 'true';
      case 'json':
        return JSON.parse(setting.setting_value);
      default:
        return setting.setting_value;
    }
  }
  
  async set(key: string, value: any, adminId: string): Promise<void> {
    const setting = await settingsRepository.findByKey(key);
    if (!setting) {
      throw new ResourceNotFoundError('setting', key);
    }
    
    if (!setting.is_editable) {
      throw new InvalidOperationError('update setting', 'This setting cannot be modified');
    }
    
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    await settingsRepository.update(setting.id, {
      setting_value: stringValue,
      updated_by: adminId,
      updated_at: new Date()
    });
    
    // Log change
    await auditLogger.log('commission_setting_updated', {
      settingKey: key,
      oldValue: setting.setting_value,
      newValue: stringValue,
      adminId
    });
  }
  
  async getAllByCategory(category: string): Promise<CommissionSetting[]> {
    return await settingsRepository.findByCategory(category);
  }
}
```

### 2.3 Update Commission Creation Logic

```typescript
// Modify CommissionService.createCommission() to set hold periods

async createCommission(referralId: string, paymentId: string, tx?: DbOrTransaction): Promise<PartnerCommission> {
  // ... existing validation code ...
  
  // Get hold period settings
  const visibilityHoldDays = await settingsService.get('commission_hold_period_days', 30);
  const payoutHoldDays = await settingsService.get('commission_payout_hold_period_days', 60);
  
  const now = new Date();
  const visibleAfter = addDays(now, visibilityHoldDays);
  const availableForPayoutAfter = addDays(now, payoutHoldDays);
  
  // Create commission with hold periods
  const newCommission = await this.commissionRepo.create({
    partnerId: referral.partnerId,
    referralId: referral.id,
    paymentId: paymentId,
    baseAmount: String(calculation.baseAmount),
    commissionRate: String(calculation.commissionRate),
    commissionAmount: String(calculation.commissionAmount),
    currency: calculation.currency,
    status: 'pending',
    visible_after: visibleAfter,
    available_for_payout_after: availableForPayoutAfter
  }, txHandle);
  
  logger.info('Commission created with hold periods', {
    commissionId: newCommission.id,
    visibleAfter,
    availableForPayoutAfter,
    visibilityHoldDays,
    payoutHoldDays
  });
  
  return newCommission;
}
```

### 2.4 Update Query Methods

```typescript
// Filter commissions by visibility date
async getPendingCommissions(partnerId: string): Promise<CommissionWithDetails[]> {
  const commissions = await this.commissionRepo.findPendingByPartnerId(partnerId);
  
  const now = new Date();
  
  // Filter by visible_after date
  const visibleCommissions = commissions.filter(c => 
    !c.visible_after || c.visible_after <= now
  );
  
  // ... map to details ...
}

// Check payout availability
async createPayout(partnerId: string, commissionIds: string[], ...): Promise<PartnerPayout> {
  const commissions = await Promise.all(
    commissionIds.map(id => this.commissionRepo.findById(id))
  );
  
  const now = new Date();
  
  for (const commission of commissions) {
    // Check visibility
    if (commission.visible_after && commission.visible_after > now) {
      throw new InvalidOperationError(
        'create payout',
        `Commission ${commission.id} is not yet visible (available ${formatDate(commission.visible_after)})`
      );
    }
    
    // Check payout availability
    if (commission.available_for_payout_after && commission.available_for_payout_after > now) {
      const daysRemaining = differenceInDays(commission.available_for_payout_after, now);
      throw new InvalidOperationError(
        'create payout',
        `Commission ${commission.id} cannot be withdrawn for ${daysRemaining} more days`
      );
    }
    
    // ... rest of validation ...
  }
}
```

---

## Phase 3: First Payment Enforcement (Week 4)
**Priority:** HIGH  
**Goal:** Prevent commission on repeat purchases/upgrades

### 3.1 Payment Tracking Enhancement

```typescript
// Add method to check if user has previous subscription payments
async isFirstSubscriptionPayment(userId: string, subscriptionId: string): Promise<boolean> {
  const payments = await paymentRecordRepository.findByUserId(userId);
  
  // Filter for subscription payments only
  const subscriptionPayments = payments.filter(p => 
    p.subscriptionId && p.subscriptionId !== subscriptionId && p.status === 'captured'
  );
  
  return subscriptionPayments.length === 0;
}
```

### 3.2 Update Commission Creation

```typescript
// Modify createCommission to enforce first-payment-only rule

async createCommission(referralId: string, paymentId: string, tx?: DbOrTransaction): Promise<PartnerCommission> {
  const executeWithTransaction = async (txHandle: DbOrTransaction) => {
    // ... existing validation ...
    
    // Get payment and user details
    const payment = await this.paymentRecordRepo.findById(paymentId, txHandle);
    const referral = await this.partnerStudentReferralRepo.findById(referralId, txHandle);
    
    // CRITICAL: Verify this is user's first subscription payment
    const isFirstPayment = await this.isFirstSubscriptionPayment(
      referral.userId,
      payment.subscriptionId,
      txHandle
    );
    
    if (!isFirstPayment) {
      logger.warn('Commission creation rejected - not first payment', {
        userId: referral.userId,
        subscriptionId: payment.subscriptionId,
        paymentId,
        referralId
      });
      
      throw new InvalidOperationError(
        'create commission',
        'Commission only allowed for first subscription payment. This user already has a previous subscription.'
      );
    }
    
    // Also check if user has any previous commissions (extra safety)
    const existingCommissions = await this.commissionRepo.findByUserId(referral.userId, txHandle);
    if (existingCommissions.length > 0) {
      logger.error('Duplicate commission attempt detected', {
        userId: referral.userId,
        existingCommissions: existingCommissions.map(c => c.id),
        attemptedPaymentId: paymentId
      });
      
      throw new InvalidOperationError(
        'create commission',
        'This user already has existing commissions. First payment rule violated.'
      );
    }
    
    logger.info('First payment verified - proceeding with commission creation', {
      userId: referral.userId,
      subscriptionId: payment.subscriptionId,
      paymentId
    });
    
    // ... rest of commission creation ...
  };
  
  // ... transaction wrapper ...
}
```

### 3.3 Repository Method

```typescript
// Add to PartnerCommissionRepository

async findByUserId(userId: string, tx?: DbOrTransaction): Promise<PartnerCommission[]> {
  const dbInstance = tx || db;
  
  const results = await dbInstance
    .select({
      commission: partnerCommissions
    })
    .from(partnerCommissions)
    .innerJoin(
      partnerStudentReferrals,
      eq(partnerCommissions.referralId, partnerStudentReferrals.id)
    )
    .where(eq(partnerStudentReferrals.userId, userId));
  
  return results.map(r => r.commission);
}
```

---

## Phase 4: Admin Dashboard Controls (Week 5-6)
**Priority:** MEDIUM  
**Goal:** Full admin control over commission settings

### 4.1 Frontend Components

**Create Commission Settings page:**

```typescript
// client/src/pages/admin/CommissionSettings.tsx

export default function CommissionSettings() {
  const { data: settings = [], isLoading } = useApiQuery(
    ['/api/admin/commission-settings'],
    '/api/admin/commission-settings'
  );
  
  const updateMutation = useUpdateCommissionSetting();
  
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  
  const settingsByCategory = groupBy(settings, 'category');
  
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Commission Hold Periods</CardTitle>
          <CardDescription>
            Control when commissions become visible and available for withdrawal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setting</TableHead>
                <TableHead>Current Value</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settingsByCategory.hold_periods?.map(setting => (
                <TableRow key={setting.setting_key}>
                  <TableCell className="font-medium">
                    {formatSettingName(setting.setting_key)}
                  </TableCell>
                  <TableCell>
                    {editingKey === setting.setting_key ? (
                      <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-32"
                      />
                    ) : (
                      <Badge variant="secondary">
                        {setting.setting_value} days
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {setting.description}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingKey === setting.setting_key ? (
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          onClick={() => {
                            updateMutation.mutate({
                              key: setting.setting_key,
                              value: parseFloat(editValue)
                            });
                            setEditingKey(null);
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingKey(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingKey(setting.setting_key);
                          setEditValue(setting.setting_value);
                        }}
                        disabled={!setting.is_editable}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Repeat similar cards for other categories */}
      {/* - Commission Rates */}
      {/* - Payout Thresholds */}
      {/* - Risk Management Limits */}
      {/* - Automation Settings */}
    </div>
  );
}
```

### 4.2 Backend Endpoints

```typescript
// server/routes/admin.routes.ts

router.get('/commission-settings', 
  authenticateJWT, 
  requireRole(['admin']), 
  adminController.getCommissionSettings
);

router.put('/commission-settings/:key', 
  authenticateJWT, 
  requireRole(['admin']), 
  adminController.updateCommissionSetting
);

router.post('/commission-settings/bulk-update', 
  authenticateJWT, 
  requireRole(['admin']), 
  adminController.bulkUpdateSettings
);

// server/controllers/admin.controller.ts

async getCommissionSettings(req: AuthenticatedRequest, res: Response) {
  const settings = await commissionSettingsService.getAll();
  return this.sendSuccess(res, settings);
}

async updateCommissionSetting(req: AuthenticatedRequest, res: Response) {
  const { key } = req.params;
  const { value } = req.body;
  const adminId = req.user!.id;
  
  await commissionSettingsService.set(key, value, adminId);
  const updated = await commissionSettingsService.get(key);
  
  return this.sendSuccess(res, {
    setting: updated,
    message: 'Setting updated successfully'
  });
}
```

### 4.3 Admin Features Summary

**Full admin dashboard control for:**
1. Hold periods (visibility & payout)
2. Commission rates (default & per-partner)
3. Minimum payout thresholds
4. Refund grace periods
5. Chargeback hold periods
6. Reserve pool percentage
7. Maximum chargeback rate threshold
8. Auto-approval settings
9. Negative balance handling rules

---

## Phase 5: Reserve Pool & Risk Management (Week 7)
**Priority:** MEDIUM  
**Goal:** Implement reserve pool for long-term risk management

### 5.1 Reserve Pool Table

```sql
CREATE TABLE IF NOT EXISTS partner_reserve_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partner_profiles(id) ON DELETE CASCADE,
  commission_id UUID NOT NULL REFERENCES partner_commissions(id) ON DELETE CASCADE,
  reserved_amount DECIMAL(10,2) NOT NULL,
  reserve_percentage DECIMAL(5,2) NOT NULL,
  reserved_at TIMESTAMP DEFAULT NOW(),
  release_after TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'released', 'forfeited'
  released_at TIMESTAMP,
  release_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(commission_id)
);

CREATE INDEX IF NOT EXISTS idx_reserve_pool_partner ON partner_reserve_pool(partner_id);
CREATE INDEX IF NOT EXISTS idx_reserve_pool_status ON partner_reserve_pool(status);
CREATE INDEX IF NOT EXISTS idx_reserve_pool_release_after ON partner_reserve_pool(release_after);
```

### 5.2 Reserve Pool Logic

```typescript
// Calculate and reserve percentage of commission
async createCommissionWithReserve(commissionData: any): Promise<PartnerCommission> {
  const reservePercentage = await settingsService.get('reserve_pool_percentage', 15.0);
  const reserveReleaseDays = await settingsService.get('reserve_release_days', 180);
  
  await db.transaction(async (tx) => {
    const commission = await this.createCommission(..., tx);
    
    // Calculate reserve amount
    const reserveAmount = (Number(commission.commissionAmount) * reservePercentage) / 100;
    const releaseAfter = addDays(new Date(), reserveReleaseDays);
    
    // Create reserve record
    await reservePoolRepository.create({
      partner_id: commission.partnerId,
      commission_id: commission.id,
      reserved_amount: reserveAmount,
      reserve_percentage: reservePercentage,
      release_after: releaseAfter,
      status: 'active'
    }, tx);
    
    logger.info('Reserve pool created', {
      commissionId: commission.id,
      reserveAmount,
      reservePercentage,
      releaseAfter
    });
  });
}

// Automated job to release reserves
async releaseMaturedReserves(): Promise<void> {
  const maturedReserves = await reservePoolRepository.findMatured();
  
  for (const reserve of maturedReserves) {
    await db.transaction(async (tx) => {
      await reservePoolRepository.update(reserve.id, {
        status: 'released',
        released_at: new Date(),
        release_reason: 'Automatic release after holding period'
      }, tx);
      
      // Add to partner available balance
      await partnerProfileRepository.updateAvailableBalance(
        reserve.partner_id,
        Number(reserve.reserved_amount),
        tx
      );
    });
  }
}
```

---

## Phase 6: Monitoring & Analytics (Week 8)
**Priority:** LOW  
**Goal:** Comprehensive monitoring and fraud detection

### 6.1 Partner Performance Monitoring

```typescript
// Track chargeback rates per partner
interface PartnerRiskMetrics {
  partnerId: string;
  totalConversions: number;
  chargebackCount: number;
  chargebackRate: number; // percentage
  refundCount: number;
  refundRate: number;
  averageTimeToConversion: number; // days
  suspiciousPatterns: string[];
}

async calculatePartnerRiskMetrics(partnerId: string): Promise<PartnerRiskMetrics> {
  const conversions = await referralRepository.findConversionsByPartner(partnerId);
  const chargebacks = await chargebackRepository.findByPartner(partnerId);
  const refunds = await refundRepository.findByPartner(partnerId);
  
  const chargebackRate = (chargebacks.length / conversions.length) * 100;
  const refundRate = (refunds.length / conversions.length) * 100;
  
  // Detect suspicious patterns
  const suspiciousPatterns = [];
  
  if (chargebackRate > 1.0) {
    suspiciousPatterns.push('High chargeback rate (>1%)');
  }
  
  if (refundRate > 5.0) {
    suspiciousPatterns.push('High refund rate (>5%)');
  }
  
  // Check for rapid conversions (possible fraud)
  const avgConversionTime = conversions.reduce((sum, c) => {
    const timeDiff = differenceInMinutes(c.converted_at, c.registered_at);
    return sum + timeDiff;
  }, 0) / conversions.length;
  
  if (avgConversionTime < 5) {
    suspiciousPatterns.push('Abnormally fast conversions (<5 min avg)');
  }
  
  return {
    partnerId,
    totalConversions: conversions.length,
    chargebackCount: chargebacks.length,
    chargebackRate,
    refundCount: refunds.length,
    refundRate,
    averageTimeToConversion: avgConversionTime,
    suspiciousPatterns
  };
}
```

### 6.2 Admin Alerts Dashboard

**Real-time alerts for:**
- Chargeback rate exceeding 1%
- Refund rate exceeding 5%
- Abnormal conversion patterns
- Negative balance partners
- Large payout requests (>₹50,000)
- Commission holds requiring review

---

## Testing Strategy

### Unit Tests
- Commission calculation with hold periods
- Refund/chargeback handling logic
- First payment validation
- Reserve pool calculations
- Settings service CRUD operations

### Integration Tests
- Webhook processing end-to-end
- Commission lifecycle (creation → hold → approval → payout)
- Negative balance scenarios
- Multi-partner refund scenarios

### Manual Testing Checklist
- [ ] Create commission → verify hold period applied
- [ ] Request refund within 7 days → verify commission reversed
- [ ] File chargeback → verify commission on hold
- [ ] Win chargeback → verify commission released
- [ ] Lose chargeback → verify commission reversed
- [ ] Request payout before hold period → verify error
- [ ] Update admin settings → verify applied to new commissions
- [ ] Test reserve pool creation and release

---

## Rollout Plan

### Pre-Deployment
1. Database migration testing on staging
2. Webhook endpoint testing with Razorpay test mode
3. Admin training on new settings
4. Partner communication about hold periods

### Deployment Sequence
1. Deploy Phase 1 (Critical Risk Management) to production
2. Monitor for 1 week
3. Deploy Phase 2 (Hold Periods)
4. Monitor for 1 week
5. Deploy Phase 3 (First Payment Enforcement)
6. Deploy Phase 4-6 in single release

### Rollback Strategy
- Each phase has independent database migrations
- Rollback scripts prepared for each phase
- Feature flags for gradual rollout
- Settings can be adjusted without code changes

---

## Success Metrics

### Phase 1 Success Criteria
- ✅ All Razorpay webhook events handled correctly
- ✅ Zero commission losses from refunds/chargebacks
- ✅ Negative balance handling working correctly

### Phase 2 Success Criteria
- ✅ Hold periods enforced correctly
- ✅ Partner visibility matches settings
- ✅ Payout requests blocked before hold period expires

### Phase 3 Success Criteria
- ✅ Duplicate commissions prevented (0 false positives)
- ✅ Legitimate first payments processed correctly

### Phase 4 Success Criteria
- ✅ Admin can modify all settings via dashboard
- ✅ Settings applied correctly to new commissions
- ✅ Audit trail for all setting changes

### Overall KPIs
- Chargeback rate: <1%
- Commission reversal rate: <3%
- Admin intervention rate: <10% of commissions
- Partner satisfaction: >90%
- Zero financial losses from commission fraud

---

## Risk Assessment

### High Risk Items
1. **Webhook reliability:** Razorpay webhook failures could miss refunds/chargebacks
   - **Mitigation:** Implement polling fallback + manual review queue
   
2. **Negative balance enforcement:** Partners with negative balance might create new accounts
   - **Mitigation:** KYC verification + email/phone uniqueness checks

3. **Hold period communication:** Partners may be surprised by 30-60 day holds
   - **Mitigation:** Clear communication in T&C + partner onboarding

### Medium Risk Items
1. **Performance impact:** Additional queries for hold period checks
   - **Mitigation:** Proper indexing + caching layer
   
2. **Edge cases:** Complex scenarios (partial refunds, multiple chargebacks)
   - **Mitigation:** Comprehensive test coverage + manual review queue

---

## Maintenance & Support

### Ongoing Tasks
- Monthly review of chargeback/refund rates
- Quarterly optimization of hold period settings
- Weekly review of partners exceeding thresholds
- Daily monitoring of webhook processing

### Documentation
- Partner knowledge base article on hold periods
- Admin guide for commission settings
- Troubleshooting guide for common scenarios
- API documentation for webhook handlers

---

## Appendix A: Industry Comparison

| Feature | Our Current | Our Planned | Industry Standard |
|---------|-------------|-------------|-------------------|
| Hold Period | 0 days | 30-60 days | 30-90 days |
| Refund Window | N/A | 7 days | 7-30 days |
| Chargeback Handling | ❌ None | ✅ Automated | ✅ Required |
| First Payment Only | ❌ Not enforced | ✅ Enforced | ✅ Standard |
| Reserve Pool | ❌ None | ✅ 15% | 10-20% |
| Admin Control | ⚠️ Limited | ✅ Full | ✅ Required |
| Negative Balance | ❌ None | ✅ Handled | ✅ Required |
| Max Chargeback Rate | N/A | <1% | <1% |

---

## Appendix B: Configuration Examples

**Conservative Configuration (Low Risk):**
- Hold Period: 60 days
- Payout Hold: 90 days
- Reserve Pool: 20%
- Refund Window: 30 days
- Auto-approval: Disabled

**Balanced Configuration (Recommended):**
- Hold Period: 30 days
- Payout Hold: 60 days
- Reserve Pool: 15%
- Refund Window: 7 days
- Auto-approval: Enabled after 45 days

**Aggressive Configuration (High Trust Partners):**
- Hold Period: 7 days
- Payout Hold: 30 days
- Reserve Pool: 10%
- Refund Window: 7 days
- Auto-approval: Enabled after 14 days

---

**Document Status:** Ready for Review  
**Next Steps:** Await approval to begin Phase 1 implementation

**Prepared by:** AI Agent  
**Date:** November 15, 2025
