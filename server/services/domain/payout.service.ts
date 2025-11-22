import { BaseService } from '../base.service';
import {
  IPartnerPayoutRepository,
  IPartnerCommissionRepository,
  IPartnerProfileRepository
} from '../../repositories';
import { container, TYPES } from '../container';
import { PartnerPayout } from '@shared/schema';
import {
  PayoutWithCommissions,
  PayoutMethod,
  DEFAULT_MINIMUM_PAYOUT
} from '@shared/types/partner-types';
import { ValidationServiceError, ResourceNotFoundError, InvalidOperationError } from '../errors';
import { db } from '../../db';

export interface IPayoutService {
  createPayout(partnerId: string, commissionIds: string[], payoutMethod: PayoutMethod, notes?: string): Promise<PartnerPayout>;
  processPayoutBankTransfer(payoutId: string, referenceNumber: string): Promise<PartnerPayout>;
  processPayoutPayPal(payoutId: string, transactionId: string): Promise<PartnerPayout>;
  completePayout(payoutId: string, adminId: string): Promise<PartnerPayout>;
  cancelPayout(payoutId: string, adminId: string, reason: string): Promise<PartnerPayout>;
  getPayoutHistory(partnerId: string): Promise<PayoutWithCommissions[]>;
}

export class PayoutService extends BaseService implements IPayoutService {
  constructor(
    private payoutRepo: IPartnerPayoutRepository = container.get<IPartnerPayoutRepository>(TYPES.IPartnerPayoutRepository),
    private commissionRepo: IPartnerCommissionRepository = container.get<IPartnerCommissionRepository>(TYPES.IPartnerCommissionRepository),
    private partnerProfileRepo: IPartnerProfileRepository = container.get<IPartnerProfileRepository>(TYPES.IPartnerProfileRepository)
  ) {
    super();
  }

  async createPayout(
    partnerId: string,
    commissionIds: string[],
    payoutMethod: PayoutMethod,
    notes?: string
  ): Promise<PartnerPayout> {
    try {
      const errors: Record<string, string> = {};

      if (!commissionIds || commissionIds.length === 0) {
        errors.commissionIds = 'At least one commission is required';
      }

      if (!payoutMethod) {
        errors.payoutMethod = 'Payout method is required';
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Create Payout', errors);
      }

      const partner = await this.partnerProfileRepo.findById(partnerId);

      if (!partner.isActive) {
        throw new InvalidOperationError('create payout', 'Partner account is not active');
      }

      if (!partner.isVerified) {
        throw new InvalidOperationError('create payout', 'Partner account is not verified');
      }

      const commissions = await Promise.all(
        commissionIds.map(id => this.commissionRepo.findById(id))
      );

      for (const commission of commissions) {
        if (commission.partnerId !== partnerId) {
          throw new InvalidOperationError('create payout', 'All commissions must belong to the same partner');
        }

        if (commission.status !== 'approved') {
          throw new InvalidOperationError('create payout', 'All commissions must be in approved status');
        }

        if (commission.payoutId) {
          throw new InvalidOperationError('create payout', 'Commission already included in another payout');
        }
      }

      const totalAmount = commissions.reduce((sum, c) => sum + Number(c.commissionAmount), 0);

      if (totalAmount < DEFAULT_MINIMUM_PAYOUT) {
        throw new InvalidOperationError(
          'create payout',
          `Total payout amount (${totalAmount}) is below minimum threshold (${DEFAULT_MINIMUM_PAYOUT})`
        );
      }

      if (payoutMethod === 'bank_transfer' && !partner.bankDetails) {
        throw new InvalidOperationError('create payout', 'Bank details are required for bank transfer');
      }

      if (payoutMethod === 'paypal' && !partner.paypalEmail) {
        throw new InvalidOperationError('create payout', 'PayPal email is required for PayPal transfer');
      }

      const payout = await db.transaction(async (tx) => {
        const newPayout = await this.payoutRepo.create({
          partnerId,
          payoutAmount: String(totalAmount),
          payoutMethod,
          currency: 'INR',
          commissionCount: commissions.length,
          periodStart: new Date(),
          periodEnd: new Date(),
          status: 'pending',
          notes
        });

        for (const commission of commissions) {
          await this.commissionRepo.markAsPaid(commission.id, newPayout.id);
        }

        return newPayout;
      });

      return payout;
    } catch (error) {
      return this.handleError(error, 'PayoutService.createPayout');
    }
  }

  async processPayoutBankTransfer(payoutId: string, referenceNumber: string): Promise<PartnerPayout> {
    try {
      if (!referenceNumber?.trim()) {
        throw new ValidationServiceError('Process Payout', {
          referenceNumber: 'Bank reference number is required'
        });
      }

      const payout = await this.payoutRepo.findById(payoutId);

      if (payout.status !== 'pending') {
        throw new InvalidOperationError('process payout', 'Payout is not in pending status');
      }

      if (payout.payoutMethod !== 'bank_transfer') {
        throw new InvalidOperationError('process payout', 'Payout method is not bank transfer');
      }

      await this.payoutRepo.update(payoutId, {
        status: 'processing',
        processedAt: new Date(),
        updatedAt: new Date()
      });

      return await this.payoutRepo.findById(payoutId);
    } catch (error) {
      return this.handleError(error, 'PayoutService.processPayoutBankTransfer');
    }
  }

  async processPayoutPayPal(payoutId: string, transactionId: string): Promise<PartnerPayout> {
    try {
      if (!transactionId?.trim()) {
        throw new ValidationServiceError('Process Payout', {
          transactionId: 'PayPal transaction ID is required'
        });
      }

      const payout = await this.payoutRepo.findById(payoutId);

      if (payout.status !== 'pending') {
        throw new InvalidOperationError('process payout', 'Payout is not in pending status');
      }

      if (payout.payoutMethod !== 'paypal') {
        throw new InvalidOperationError('process payout', 'Payout method is not PayPal');
      }

      await this.payoutRepo.update(payoutId, {
        status: 'processing',
        processedAt: new Date(),
        updatedAt: new Date()
      });

      return await this.payoutRepo.findById(payoutId);
    } catch (error) {
      return this.handleError(error, 'PayoutService.processPayoutPayPal');
    }
  }

  async completePayout(payoutId: string, adminId: string): Promise<PartnerPayout> {
    try {
      const payout = await this.payoutRepo.findById(payoutId);

      if (payout.status !== 'processing') {
        throw new InvalidOperationError('complete payout', 'Payout must be in processing status');
      }

      const updatedPayout = await db.transaction(async (tx) => {
        await this.payoutRepo.complete(payoutId, adminId);

        const commissions = await this.commissionRepo.findByPayoutId(payoutId);
        
        await this.partnerProfileRepo.updateCommissionPaid(
          payout.partnerId,
          Number(payout.payoutAmount)
        );

        return await this.payoutRepo.findById(payoutId);
      });

      return updatedPayout;
    } catch (error) {
      return this.handleError(error, 'PayoutService.completePayout');
    }
  }

  async cancelPayout(payoutId: string, adminId: string, reason: string): Promise<PartnerPayout> {
    try {
      if (!reason?.trim()) {
        throw new ValidationServiceError('Cancel Payout', {
          reason: 'Cancellation reason is required'
        });
      }

      const payout = await this.payoutRepo.findById(payoutId);

      if (payout.status === 'completed') {
        throw new InvalidOperationError('cancel payout', 'Cannot cancel a completed payout');
      }

      if (payout.status === 'cancelled') {
        throw new InvalidOperationError('cancel payout', 'Payout is already cancelled');
      }

      await db.transaction(async (tx) => {
        await this.payoutRepo.updateStatus(payoutId, 'cancelled', reason);

        const commissions = await this.commissionRepo.findByPayoutId(payoutId);

        for (const commission of commissions) {
          await this.commissionRepo.update(commission.id, {
            payoutId: null,
            status: 'approved',
            updatedAt: new Date()
          });
        }
      });

      return await this.payoutRepo.findById(payoutId);
    } catch (error) {
      return this.handleError(error, 'PayoutService.cancelPayout');
    }
  }

  async getPayoutHistory(partnerId: string): Promise<PayoutWithCommissions[]> {
    try {
      await this.partnerProfileRepo.findById(partnerId);

      const payouts = await this.payoutRepo.findByPartnerId(partnerId);

      const payoutsWithCommissions = await Promise.all(
        payouts.map(async (payout) => {
          const commissions = await this.commissionRepo.findByPayoutId(payout.id);

          return {
            ...payout,
            commissions: commissions.map(c => ({
              id: c.id,
              commissionAmount: Number(c.commissionAmount),
              studentName: 'Student',
              createdAt: c.createdAt || new Date()
            }))
          };
        })
      );

      return payoutsWithCommissions;
    } catch (error) {
      return this.handleError(error, 'PayoutService.getPayoutHistory');
    }
  }
}

export const payoutService = new PayoutService();
