import { BaseService } from '../base.service';
import {
  IRefundRepository,
  IUserSubscriptionRepository,
  IPaymentRepository,
  ICancellationRequestRepository,
} from '../../repositories';
import { container, TYPES } from '../container';
import {
  Refund,
  InsertRefund,
  refunds,
} from '@shared/schema';
import { ValidationServiceError, InvalidOperationError, ResourceNotFoundError } from '../errors';
import { db } from '../../db';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '../../utils/logger';
import { InputSanitizer } from '../../utils/input-sanitizer';
import type { RefundWithDetails } from '../../repositories/refund.repository';

export interface IRefundService {
  createRefundRequest(data: InsertRefund): Promise<Refund>;
  getRefund(id: string): Promise<Refund>;
  getRefundsByUser(userId: string): Promise<Refund[]>;
  getRefundsBySubscription(subscriptionId: string): Promise<Refund[]>;
  getRefundsByPayment(paymentId: string): Promise<Refund[]>;
  getPendingRefunds(): Promise<RefundWithDetails[]>;
  approveRefund(id: string, adminId: string, adminNotes?: string): Promise<Refund>;
  rejectRefund(id: string, adminId: string, adminNotes?: string): Promise<Refund>;
  processRefund(id: string, razorpayRefundId: string, razorpayStatus: string): Promise<Refund>;
  getTotalRefundedAmount(subscriptionId: string): Promise<number>;
  isRefundEligible(paymentId: string): Promise<{ eligible: boolean; reason?: string }>;
}

export class RefundService extends BaseService implements IRefundService {
  private readonly REFUND_WINDOW_HOURS = 48;

  constructor(
    private refundRepository: IRefundRepository,
    private userSubscriptionRepository: IUserSubscriptionRepository,
    private paymentRepository: IPaymentRepository,
    private cancellationRequestRepository: ICancellationRequestRepository
  ) {
    super();
  }

  async isRefundEligible(paymentId: string): Promise<{ eligible: boolean; reason?: string }> {
    try {
      const payment = await this.paymentRepository.findById(paymentId);
      if (!payment) {
        return { eligible: false, reason: 'Payment not found' };
      }

      if (payment.status !== 'completed' && payment.status !== 'success') {
        return { eligible: false, reason: 'Payment is not completed' };
      }

      if (!payment.paidAt) {
        return { eligible: false, reason: 'Payment date is not available' };
      }

      const paymentDate = new Date(payment.paidAt);
      const now = new Date();
      const hoursSincePayment = (now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60);

      if (hoursSincePayment > this.REFUND_WINDOW_HOURS) {
        return {
          eligible: false,
          reason: `Refund window expired. Refunds must be requested within ${this.REFUND_WINDOW_HOURS} hours of payment.`,
        };
      }

      const existingRefunds = await this.refundRepository.findByPaymentId(paymentId);
      const hasSuccessfulRefund = existingRefunds.some(
        (refund) => refund.status === 'completed' || refund.status === 'pending' || refund.status === 'processing'
      );
      if (hasSuccessfulRefund) {
        return { eligible: false, reason: 'A refund has already been processed or is pending for this payment' };
      }

      return { eligible: true };
    } catch (error) {
      return this.handleError(error, 'RefundService.isRefundEligible');
    }
  }

  async createRefundRequest(data: InsertRefund): Promise<Refund> {
    try {
      const eligibility = await this.isRefundEligible(data.paymentId);
      if (!eligibility.eligible) {
        throw new InvalidOperationError('refund request', eligibility.reason || 'Refund not eligible');
      }

      const payment = await this.paymentRepository.findById(data.paymentId);
      if (!payment) {
        throw new ResourceNotFoundError('Payment', data.paymentId);
      }

      const subscription = await this.userSubscriptionRepository.findById(data.subscriptionId);
      if (!subscription) {
        throw new ResourceNotFoundError('Subscription', data.subscriptionId);
      }

      if (subscription.userId !== data.userId) {
        throw new InvalidOperationError('refund request', 'User does not own this subscription');
      }

      if (data.cancellationRequestId) {
        const cancellationRequest = await this.cancellationRequestRepository.findById(
          data.cancellationRequestId
        );
        if (!cancellationRequest || cancellationRequest.status !== 'approved') {
          throw new InvalidOperationError(
            'refund request',
            'Cancellation request must be approved before requesting a refund'
          );
        }
      }

      const sanitizedData: InsertRefund = {
        ...data,
        reason: InputSanitizer.sanitizePlainText(data.reason || ''),
        status: 'pending',
        requestedAt: new Date(),
        currency: payment.currency,
      };

      return await db.transaction(async (tx) => {
        const refund = await this.refundRepository.create(sanitizedData);

        logger.info('Refund request created', {
          refundId: refund.id,
          userId: data.userId,
          paymentId: data.paymentId,
          amount: data.amount,
        });

        return refund;
      }, {
        isolationLevel: 'serializable',
      });
    } catch (error) {
      return this.handleError(error, 'RefundService.createRefundRequest');
    }
  }

  async getRefund(id: string): Promise<Refund> {
    try {
      const refund = await this.refundRepository.findById(id);
      if (!refund) {
        throw new ResourceNotFoundError('Refund', id);
      }
      return refund;
    } catch (error) {
      return this.handleError(error, 'RefundService.getRefund');
    }
  }

  async getRefundsByUser(userId: string): Promise<Refund[]> {
    try {
      return await this.refundRepository.findByUserId(userId);
    } catch (error) {
      return this.handleError(error, 'RefundService.getRefundsByUser');
    }
  }

  async getRefundsBySubscription(subscriptionId: string): Promise<Refund[]> {
    try {
      return await this.refundRepository.findBySubscriptionId(subscriptionId);
    } catch (error) {
      return this.handleError(error, 'RefundService.getRefundsBySubscription');
    }
  }

  async getRefundsByPayment(paymentId: string): Promise<Refund[]> {
    try {
      return await this.refundRepository.findByPaymentId(paymentId);
    } catch (error) {
      return this.handleError(error, 'RefundService.getRefundsByPayment');
    }
  }

  async getPendingRefunds(): Promise<RefundWithDetails[]> {
    try {
      return await this.refundRepository.findPending();
    } catch (error) {
      return this.handleError(error, 'RefundService.getPendingRefunds');
    }
  }

  async approveRefund(id: string, adminId: string, adminNotes?: string): Promise<Refund> {
    try {
      const refund = await this.refundRepository.findById(id);
      if (!refund) {
        throw new ResourceNotFoundError('Refund', id);
      }

      if (refund.status !== 'pending') {
        throw new InvalidOperationError('approve refund', `Cannot approve refund with status: ${refund.status}`);
      }

      return await db.transaction(async (tx) => {
        const sanitizedNotes = adminNotes ? InputSanitizer.sanitizePlainText(adminNotes) : undefined;

        const updatedRefund = await this.refundRepository.updateStatus(id, 'processing', {
          processedBy: adminId,
          adminNotes: sanitizedNotes,
        });

        logger.info('Refund approved', {
          refundId: id,
          adminId,
          amount: refund.amount,
        });

        return updatedRefund;
      }, {
        isolationLevel: 'serializable',
      });
    } catch (error) {
      return this.handleError(error, 'RefundService.approveRefund');
    }
  }

  async rejectRefund(id: string, adminId: string, adminNotes?: string): Promise<Refund> {
    try {
      const refund = await this.refundRepository.findById(id);
      if (!refund) {
        throw new ResourceNotFoundError('Refund', id);
      }

      if (refund.status !== 'pending') {
        throw new InvalidOperationError('reject refund', `Cannot reject refund with status: ${refund.status}`);
      }

      return await db.transaction(async (tx) => {
        const sanitizedNotes = adminNotes ? InputSanitizer.sanitizePlainText(adminNotes) : undefined;

        const updatedRefund = await this.refundRepository.updateStatus(id, 'rejected', {
          processedBy: adminId,
          adminNotes: sanitizedNotes,
        });

        logger.info('Refund rejected', {
          refundId: id,
          adminId,
        });

        return updatedRefund;
      }, {
        isolationLevel: 'serializable',
      });
    } catch (error) {
      return this.handleError(error, 'RefundService.rejectRefund');
    }
  }

  async processRefund(id: string, razorpayRefundId: string, razorpayStatus: string): Promise<Refund> {
    try {
      const refund = await this.refundRepository.findById(id);
      if (!refund) {
        throw new ResourceNotFoundError('Refund', id);
      }

      return await db.transaction(async (tx) => {
        const status = razorpayStatus === 'processed' ? 'completed' : 'processing';

        const updatedRefund = await this.refundRepository.updateStatus(id, status, {
          razorpayRefundId,
          razorpayStatus,
        });

        logger.info('Refund processed', {
          refundId: id,
          razorpayRefundId,
          razorpayStatus,
        });

        return updatedRefund;
      }, {
        isolationLevel: 'serializable',
      });
    } catch (error) {
      return this.handleError(error, 'RefundService.processRefund');
    }
  }

  async getTotalRefundedAmount(subscriptionId: string): Promise<number> {
    try {
      return await this.refundRepository.getTotalRefundedAmount(subscriptionId);
    } catch (error) {
      return this.handleError(error, 'RefundService.getTotalRefundedAmount');
    }
  }
}

export const refundService = new RefundService();
