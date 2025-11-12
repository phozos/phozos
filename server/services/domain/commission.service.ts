import { BaseService } from '../base.service';
import {
  IPartnerCommissionRepository,
  IPartnerProfileRepository,
  IPartnerStudentReferralRepository,
  IPaymentRepository
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
  createCommission(referralId: string, paymentId: string): Promise<PartnerCommission>;
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
    private paymentRepo: IPaymentRepository = container.get<IPaymentRepository>(TYPES.IPaymentRepository)
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

  async createCommission(referralId: string, paymentId: string): Promise<PartnerCommission> {
    try {
      const referral = await this.partnerStudentReferralRepo.findById(referralId);

      if (referral.status !== 'converted') {
        throw new InvalidOperationError('create commission', 'Referral must be in converted status');
      }

      const calculation = await this.calculateCommission(referral.partnerId, Number(referral.commissionAmount || 0));

      const commission = await db.transaction(async (tx) => {
        const newCommission = await this.commissionRepo.create({
          partnerId: referral.partnerId,
          referralId: referral.id,
          paymentId: paymentId,
          baseAmount: String(calculation.baseAmount),
          commissionRate: String(calculation.commissionRate),
          commissionAmount: String(calculation.commissionAmount),
          currency: calculation.currency,
          status: 'pending'
        });

        await this.partnerStudentReferralRepo.updateCommission(
          referral.id,
          calculation.commissionAmount,
          'pending'
        );

        await this.partnerProfileRepo.updateCommissionEarned(
          referral.partnerId,
          calculation.commissionAmount
        );

        return newCommission;
      });

      return commission;
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
