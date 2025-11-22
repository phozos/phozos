import { BaseService } from '../base.service';
import {
  IPartnerCommissionRepository,
  IPartnerProfileRepository,
  IPartnerStudentReferralRepository,
  IPaymentRecordRepository,
  DbOrTransaction
} from '../../repositories';
import { container, TYPES } from '../container';
import { PartnerCommission } from '@shared/schema';
import {
  CommissionCalculationResult,
  CommissionWithDetails,
  DEFAULT_COMMISSION_RATE
} from '@shared/types/partner-types';
import { ValidationServiceError, ResourceNotFoundError, InvalidOperationError } from '../errors';
import { db } from '../../db';

export interface ICommissionService {
  calculateCommission(partnerId: string, paymentAmount: number): Promise<CommissionCalculationResult>;
  createCommission(referralId: string, paymentId: string, tx?: DbOrTransaction): Promise<PartnerCommission>;
  approveCommissions(commissionIds: string[], adminId: string): Promise<PartnerCommission[]>;
  rejectCommissions(commissionIds: string[], adminId: string, reason: string): Promise<PartnerCommission[]>;
  getPendingCommissions(partnerId: string): Promise<CommissionWithDetails[]>;
  getCommissionHistory(partnerId: string): Promise<CommissionWithDetails[]>;
}

export class CommissionService extends BaseService implements ICommissionService {
  constructor(
    private commissionRepo: IPartnerCommissionRepository = container.get<IPartnerCommissionRepository>(TYPES.IPartnerCommissionRepository),
    private partnerProfileRepo: IPartnerProfileRepository = container.get<IPartnerProfileRepository>(TYPES.IPartnerProfileRepository),
    private partnerStudentReferralRepo: IPartnerStudentReferralRepository = container.get<IPartnerStudentReferralRepository>(TYPES.IPartnerStudentReferralRepository),
    private paymentRecordRepo: IPaymentRecordRepository = container.get<IPaymentRecordRepository>(TYPES.IPaymentRecordRepository)
  ) {
    super();
  }

  async calculateCommission(partnerId: string, paymentAmount: number): Promise<CommissionCalculationResult> {
    try {
      const partner = await this.partnerProfileRepo.findById(partnerId);

      let commissionAmount: number;

      if (partner.commissionType === 'percentage') {
        const rate = Number(partner.commissionRate) || DEFAULT_COMMISSION_RATE;
        commissionAmount = (paymentAmount * rate) / 100;
      } else if (partner.commissionType === 'fixed') {
        commissionAmount = Number(partner.fixedCommissionAmount || 0);
      } else {
        throw new InvalidOperationError('calculate commission', 'Invalid commission type');
      }

      commissionAmount = Math.round(commissionAmount * 100) / 100;

      return {
        baseAmount: paymentAmount,
        commissionRate: Number(partner.commissionRate) || 0,
        commissionAmount,
        currency: 'INR'
      };
    } catch (error) {
      return this.handleError(error, 'CommissionService.calculateCommission');
    }
  }

  /**
   * PHASE 4 - Bug #12 Fix: Added validation for commission creation
   * ATOMICITY FIX: Accepts transaction parameter for proper atomicity
   * Phase 7.3: Create commission for a referral
   * 
   * Logic flow:
   * 1. Validate commission doesn't already exist (prevent duplicates)
   * 2. Get referral and validate it's in 'converted' status
   * 3. Validate referral is commission eligible
   * 4. Get payment details for amount
   * 5. Calculate commission based on partner rate
   * 6. Create commission record with 'pending' status
   * 7. Update partner.totalCommissionEarned
   * 8. Update referral commission fields
   * 
   * @param referralId - The referral ID to create commission for
   * @param paymentId - The payment ID associated with the commission
   * @param tx - Optional transaction handle for atomicity (required for webhook handler)
   */
  async createCommission(referralId: string, paymentId: string, tx?: DbOrTransaction): Promise<PartnerCommission> {
    try {
      // If transaction is provided, use it directly. Otherwise create a new transaction.
      const executeWithTransaction = async (txHandle: DbOrTransaction) => {
        // PHASE 4 - Bug #12: Check if commission already exists (prevent duplicates)
        // ATOMICITY FIX: Use transaction for duplicate check to prevent race conditions
        const existingCommission = await this.commissionRepo.findByReferralId(referralId, txHandle);
        if (existingCommission) {
          throw new InvalidOperationError('create commission', 'Commission already exists for this referral');
        }

        // Get referral details
        const referral = await this.partnerStudentReferralRepo.findById(referralId, txHandle);

        // PHASE 4 - Bug #12: Validate referral status
        if (referral.status !== 'converted') {
          throw new InvalidOperationError('create commission', 'Referral must be in converted status to create commission');
        }

        // PHASE 4 - Bug #12: Check commission eligibility
        if (!referral.commissionEligible) {
          throw new InvalidOperationError('create commission', 'Referral is not eligible for commission');
        }

        // Get payment details to get the actual payment amount
        const payment = await this.paymentRecordRepo.findById(paymentId, txHandle);

        // Calculate commission based on payment amount
        const calculation = await this.calculateCommission(
          referral.partnerId,
          Number(payment.amount)
        );

        // Create commission record with transaction
        const newCommission = await this.commissionRepo.create({
          partnerId: referral.partnerId,
          referralId: referral.id,
          paymentId: paymentId,
          baseAmount: String(calculation.baseAmount),
          commissionRate: String(calculation.commissionRate),
          commissionAmount: String(calculation.commissionAmount),
          currency: calculation.currency,
          status: 'pending'
        }, txHandle);

        // Update referral with commission details using transaction
        await this.partnerStudentReferralRepo.updateCommission(
          referral.id,
          calculation.commissionAmount,
          'pending',
          txHandle
        );

        // Update partner profile stats using transaction
        await this.partnerProfileRepo.updateCommissionEarned(
          referral.partnerId,
          calculation.commissionAmount,
          txHandle
        );

        return newCommission;
      };

      // Use provided transaction or create a new one
      if (tx) {
        return await executeWithTransaction(tx);
      } else {
        return await db.transaction(executeWithTransaction);
      }
    } catch (error) {
      return this.handleError(error, 'CommissionService.createCommission');
    }
  }

  async approveCommissions(commissionIds: string[], adminId: string): Promise<PartnerCommission[]> {
    try {
      if (!commissionIds || commissionIds.length === 0) {
        throw new ValidationServiceError('Approve Commissions', {
          commissionIds: 'At least one commission ID is required'
        });
      }

      const approvedCommissions: PartnerCommission[] = [];

      for (const commissionId of commissionIds) {
        const commission = await this.commissionRepo.findById(commissionId);

        if (commission.status !== 'pending') {
          throw new InvalidOperationError(
            'approve commission',
            `Commission ${commissionId} is not in pending status`
          );
        }

        await this.commissionRepo.approve(commissionId, adminId);

        const referral = await this.partnerStudentReferralRepo.findById(commission.referralId);
        await this.partnerStudentReferralRepo.updateCommission(
          referral.id,
          Number(commission.commissionAmount),
          'approved'
        );

        const updated = await this.commissionRepo.findById(commissionId);
        approvedCommissions.push(updated);
      }

      return approvedCommissions;
    } catch (error) {
      return this.handleError(error, 'CommissionService.approveCommissions');
    }
  }

  async rejectCommissions(commissionIds: string[], adminId: string, reason: string): Promise<PartnerCommission[]> {
    try {
      if (!commissionIds || commissionIds.length === 0) {
        throw new ValidationServiceError('Reject Commissions', {
          commissionIds: 'At least one commission ID is required'
        });
      }

      if (!reason?.trim()) {
        throw new ValidationServiceError('Reject Commissions', {
          reason: 'Rejection reason is required'
        });
      }

      const rejectedCommissions: PartnerCommission[] = [];

      for (const commissionId of commissionIds) {
        const commission = await this.commissionRepo.findById(commissionId);

        if (commission.status !== 'pending') {
          throw new InvalidOperationError(
            'reject commission',
            `Commission ${commissionId} is not in pending status`
          );
        }

        await db.transaction(async (tx) => {
          await this.commissionRepo.reject(commissionId, adminId, reason);

          const referral = await this.partnerStudentReferralRepo.findById(commission.referralId);
          await this.partnerStudentReferralRepo.updateCommission(
            referral.id,
            Number(commission.commissionAmount),
            'rejected'
          );

          await this.partnerProfileRepo.updateCommissionEarned(
            commission.partnerId,
            -Number(commission.commissionAmount)
          );
        });

        const updated = await this.commissionRepo.findById(commissionId);
        rejectedCommissions.push(updated);
      }

      return rejectedCommissions;
    } catch (error) {
      return this.handleError(error, 'CommissionService.rejectCommissions');
    }
  }

  async getPendingCommissions(partnerId: string): Promise<CommissionWithDetails[]> {
    try {
      await this.partnerProfileRepo.findById(partnerId);

      const commissions = await this.commissionRepo.findPendingByPartnerId(partnerId);

      const commissionsWithDetails = await Promise.all(
        commissions.map(async (commission) => {
          const referral = await this.partnerStudentReferralRepo.findById(commission.referralId);

          return {
            ...commission,
            referral: {
              id: referral.id,
              studentName: 'Student',
              status: referral.status
            },
            payment: {
              id: commission.paymentId,
              amount: Number(commission.baseAmount),
              paidAt: new Date()
            },
            payout: null
          };
        })
      );

      return commissionsWithDetails;
    } catch (error) {
      return this.handleError(error, 'CommissionService.getPendingCommissions');
    }
  }

  async getCommissionHistory(partnerId: string): Promise<CommissionWithDetails[]> {
    try {
      await this.partnerProfileRepo.findById(partnerId);

      const commissions = await this.commissionRepo.findByPartnerId(partnerId);

      const commissionsWithDetails = await Promise.all(
        commissions.map(async (commission) => {
          const referral = await this.partnerStudentReferralRepo.findById(commission.referralId);

          return {
            ...commission,
            referral: {
              id: referral.id,
              studentName: 'Student',
              status: referral.status
            },
            payment: {
              id: commission.paymentId,
              amount: Number(commission.baseAmount),
              paidAt: new Date()
            },
            payout: commission.payoutId ? {
              id: commission.payoutId,
              payoutAmount: 0,
              status: 'pending',
              completedAt: null
            } : null
          };
        })
      );

      return commissionsWithDetails;
    } catch (error) {
      return this.handleError(error, 'CommissionService.getCommissionHistory');
    }
  }
}

export const commissionService = new CommissionService();
