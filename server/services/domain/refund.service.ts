import { BaseService } from '../base.service';
import {
  IRefundRepository,
  IUserSubscriptionRepository,
  IPaymentRecordRepository,
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
import { subscriptionManagementNotificationService } from './subscription-management-notifications.service';
import { RazorpayService } from '../integration/razorpay.service';
import { subscriptionAuditService } from '../infrastructure/subscription-audit.service';

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
  updateRefundStatusFromRazorpay(razorpayRefundId: string, razorpayStatus: string): Promise<void>;
  getTotalRefundedAmount(subscriptionId: string): Promise<number>;
  isRefundEligible(paymentId: string): Promise<{ eligible: boolean; reason?: string }>;
}

export class RefundService extends BaseService implements IRefundService {
  private readonly REFUND_WINDOW_HOURS = 48;

  constructor(
    private refundRepository: IRefundRepository,
    private userSubscriptionRepository: IUserSubscriptionRepository,
    private paymentRepository: IPaymentRecordRepository,
    private cancellationRequestRepository: ICancellationRequestRepository,
    private razorpayService: RazorpayService
  ) {
    super();
  }

  async isRefundEligible(paymentId: string): Promise<{ eligible: boolean; reason?: string }> {
    try {
      const payment = await this.paymentRepository.findById(paymentId);
      if (!payment) {
        return { eligible: false, reason: 'Payment not found' };
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

      const refund = await db.transaction(async (tx) => {
        const newRefund = await this.refundRepository.create(sanitizedData, tx);

        logger.info('Refund request created', {
          refundId: newRefund.id,
          userId: data.userId,
          paymentId: data.paymentId,
          amount: data.amount,
        });

        return newRefund;
      }, {
        isolationLevel: 'serializable',
      });

      await subscriptionManagementNotificationService.notifyRefundRequestReceived(
        data.userId,
        data.subscriptionId,
        parseFloat(data.amount)
      );

      return refund;
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
      const updatedRefund = await db.transaction(async (tx) => {
        const refund = await this.refundRepository.findById(id, tx);
        if (!refund) {
          throw new ResourceNotFoundError('Refund', id);
        }

        if (refund.status !== 'pending') {
          throw new InvalidOperationError('approve refund', `Cannot approve refund with status: ${refund.status}`);
        }

        const payment = await this.paymentRepository.findById(refund.paymentId, tx);
        if (!payment) {
          throw new ResourceNotFoundError('Payment', refund.paymentId);
        }

        if (!payment.paymentReference) {
          throw new InvalidOperationError('approve refund', 'Payment does not have a Razorpay payment reference');
        }

        const sanitizedNotes = adminNotes ? InputSanitizer.sanitizePlainText(adminNotes) : undefined;

        try {
          const amountInPaise = Math.round(parseFloat(refund.amount) * 100);

          logger.info('Initiating Razorpay refund', {
            refundId: id,
            paymentReference: payment.paymentReference,
            amount: refund.amount,
            amountInPaise,
          });

          const razorpayRefund = await this.razorpayService.initiateRefund({
            paymentId: payment.paymentReference,
            amount: amountInPaise,
            notes: {
              refundId: id,
              subscriptionId: refund.subscriptionId,
              userId: refund.userId,
            },
            receipt: `refund_${id}`,
          });

          logger.info('Razorpay refund initiated successfully', {
            refundId: id,
            razorpayRefundId: razorpayRefund.id,
            razorpayStatus: razorpayRefund.status,
          });

          const refundStatus = razorpayRefund.status === 'processed' ? 'completed' : 'processing';

          const updated = await this.refundRepository.updateStatus(id, refundStatus, {
            processedBy: adminId,
            adminNotes: sanitizedNotes,
            razorpayRefundId: razorpayRefund.id,
            razorpayStatus: razorpayRefund.status,
            razorpayResponse: razorpayRefund as any,
            processedAt: new Date(),
          }, tx);

          await subscriptionAuditService.logEvent(
            refund.subscriptionId,
            adminId,
            'refund_request_approved',
            undefined,
            undefined,
            {
              refundId: id,
              razorpayRefundId: razorpayRefund.id,
              amount: refund.amount,
              notes: sanitizedNotes,
            }
          );

          return updated;
        } catch (razorpayError: any) {
          const errorMessage = razorpayError.message || 'Razorpay refund initiation failed';

          logger.error('Razorpay refund initiation failed', {
            refundId: id,
            paymentReference: payment.paymentReference,
            error: errorMessage,
            errorDetails: razorpayError,
          });

          const combinedNotes = sanitizedNotes
            ? `${sanitizedNotes}\n\nRazorpay Error: ${errorMessage}`
            : `Razorpay Error: ${errorMessage}`;

          const updated = await this.refundRepository.updateStatus(id, 'failed', {
            processedBy: adminId,
            adminNotes: combinedNotes,
            processedAt: new Date(),
          }, tx);

          throw new InvalidOperationError('approve refund', `Razorpay refund failed: ${errorMessage}`);
        }
      }, {
        isolationLevel: 'serializable',
      });

      await subscriptionManagementNotificationService.notifyRefundApproved(
        updatedRefund.userId,
        updatedRefund.subscriptionId,
        parseFloat(updatedRefund.amount)
      );

      return updatedRefund;
    } catch (error) {
      return this.handleError(error, 'RefundService.approveRefund');
    }
  }

  async rejectRefund(id: string, adminId: string, adminNotes?: string): Promise<Refund> {
    try {
      const updatedRefund = await db.transaction(async (tx) => {
        const refund = await this.refundRepository.findById(id, tx);
        if (!refund) {
          throw new ResourceNotFoundError('Refund', id);
        }

        if (refund.status !== 'pending') {
          throw new InvalidOperationError('reject refund', `Cannot reject refund with status: ${refund.status}`);
        }

        const sanitizedNotes = adminNotes ? InputSanitizer.sanitizePlainText(adminNotes) : undefined;

        const updated = await this.refundRepository.updateStatus(id, 'rejected', {
          processedBy: adminId,
          adminNotes: sanitizedNotes,
        }, tx);

        logger.info('Refund rejected', {
          refundId: id,
          adminId,
        });

        await subscriptionAuditService.logEvent(
          refund.subscriptionId,
          adminId,
          'refund_request_rejected',
          undefined,
          undefined,
          {
            refundId: id,
            reason: sanitizedNotes || 'Refund request rejected',
            amount: refund.amount,
          }
        );

        return updated;
      }, {
        isolationLevel: 'serializable',
      });

      await subscriptionManagementNotificationService.notifyRefundRejected(
        updatedRefund.userId,
        updatedRefund.subscriptionId,
        parseFloat(updatedRefund.amount),
        adminNotes || 'Your refund request did not meet the refund criteria.'
      );

      return updatedRefund;
    } catch (error) {
      return this.handleError(error, 'RefundService.rejectRefund');
    }
  }

  async processRefund(id: string, razorpayRefundId: string, razorpayStatus: string): Promise<Refund> {
    try {
      const updatedRefund = await db.transaction(async (tx) => {
        const refund = await this.refundRepository.findById(id, tx);
        if (!refund) {
          throw new ResourceNotFoundError('Refund', id);
        }

        let status: 'completed' | 'processing' | 'failed';
        if (razorpayStatus === 'processed') {
          status = 'completed';
        } else if (razorpayStatus === 'failed') {
          status = 'failed';
        } else {
          status = 'processing';
        }

        const updated = await this.refundRepository.updateStatus(id, status, {
          razorpayRefundId,
          razorpayStatus,
        }, tx);

        logger.info('Refund processed via webhook', {
          refundId: id,
          razorpayRefundId,
          razorpayStatus,
          newStatus: status,
        });

        return updated;
      }, {
        isolationLevel: 'serializable',
      });

      if (razorpayStatus === 'processed') {
        await subscriptionManagementNotificationService.notifyRefundProcessed(
          updatedRefund.userId,
          updatedRefund.subscriptionId,
          Math.round(parseFloat(updatedRefund.amount) * 100)
        );
      } else if (razorpayStatus === 'failed') {
        await subscriptionManagementNotificationService.notifyRefundFailed(
          updatedRefund.userId,
          updatedRefund.subscriptionId,
          Math.round(parseFloat(updatedRefund.amount) * 100)
        );
      }

      return updatedRefund;
    } catch (error) {
      return this.handleError(error, 'RefundService.processRefund');
    }
  }

  async updateRefundStatusFromRazorpay(razorpayRefundId: string, razorpayStatus: string): Promise<void> {
    try {
      logger.info('Updating refund status from Razorpay webhook', {
        razorpayRefundId,
        razorpayStatus,
      });

      const refund = await this.refundRepository.findByRazorpayRefundId(razorpayRefundId);

      if (!refund) {
        logger.warn('Refund not found for Razorpay refund ID - webhook may have arrived before approval', {
          razorpayRefundId,
          razorpayStatus,
        });
        return;
      }

      logger.info('Found refund record, processing status update', {
        refundId: refund.id,
        razorpayRefundId,
        currentStatus: refund.status,
        razorpayStatus,
      });

      await this.processRefund(refund.id, razorpayRefundId, razorpayStatus);

      logger.info('Refund status updated successfully from webhook', {
        refundId: refund.id,
        razorpayRefundId,
        razorpayStatus,
      });
    } catch (error) {
      logger.error('Error updating refund status from Razorpay webhook', {
        razorpayRefundId,
        razorpayStatus,
        error,
      });
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

let _refundService: IRefundService | undefined;
export const refundService = new Proxy({} as IRefundService, {
  get(target, prop) {
    if (!_refundService) {
      _refundService = container.get<IRefundService>(TYPES.IRefundService);
    }
    return (_refundService as any)[prop];
  }
});
