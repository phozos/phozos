import { db } from '../../db';
import { failedPayments } from '@shared/schema';
import logger from '../../utils/logger';

export interface IPaymentFailureService {
  logFailedPayment(params: {
    userId: string;
    planId?: string;
    orderId?: string;
    paymentId?: string;
    amount?: number;
    currency?: string;
    failureReason: string;
    razorpayErrorCode?: string;
    razorpayErrorDescription?: string;
  }): Promise<void>;
  markAsNotified(failedPaymentId: string): Promise<void>;
  getUserFailedPayments(userId: string): Promise<any[]>;
}

export class PaymentFailureService implements IPaymentFailureService {
  /**
   * Log a failed payment attempt
   * @param params - Payment failure details
   */
  async logFailedPayment(params: {
    userId: string;
    planId?: string;
    orderId?: string;
    paymentId?: string;
    amount?: number;
    currency?: string;
    failureReason: string;
    razorpayErrorCode?: string;
    razorpayErrorDescription?: string;
  }): Promise<void> {
    try {
      await db.insert(failedPayments).values({
        userId: params.userId,
        planId: params.planId || null,
        orderId: params.orderId || null,
        paymentId: params.paymentId || null,
        amount: params.amount?.toString() || null,
        currency: params.currency || 'INR',
        failureReason: params.failureReason,
        razorpayErrorCode: params.razorpayErrorCode || null,
        razorpayErrorDescription: params.razorpayErrorDescription || null,
        failedAt: new Date(),
      });

      logger.warn('Payment failure logged', {
        userId: params.userId,
        planId: params.planId,
        orderId: params.orderId,
        paymentId: params.paymentId,
        failureReason: params.failureReason,
        razorpayErrorCode: params.razorpayErrorCode,
      });
    } catch (error) {
      logger.error('Failed to log payment failure', {
        error,
        userId: params.userId,
        failureReason: params.failureReason,
      });
      // Don't throw - logging failures shouldn't break the payment flow
    }
  }

  /**
   * Mark a failed payment as notified (user has been informed)
   * @param failedPaymentId - UUID of the failed payment record
   */
  async markAsNotified(failedPaymentId: string): Promise<void> {
    try {
      await db
        .update(failedPayments)
        .set({ notifiedAt: new Date() })
        .where((failedPayments as any).id.eq(failedPaymentId));

      logger.info('Failed payment marked as notified', {
        failedPaymentId,
      });
    } catch (error) {
      logger.error('Failed to mark payment failure as notified', {
        error,
        failedPaymentId,
      });
    }
  }

  /**
   * Get all failed payments for a specific user
   * @param userId - UUID of the user
   * @returns Array of failed payment records
   */
  async getUserFailedPayments(userId: string): Promise<any[]> {
    try {
      const failures = await db.query.failedPayments.findMany({
        where: (failedPayments, { eq }) => eq(failedPayments.userId, userId),
        orderBy: (failedPayments, { desc }) => [desc(failedPayments.failedAt)],
      });

      return failures;
    } catch (error) {
      logger.error('Failed to get user failed payments', {
        error,
        userId,
      });
      throw error;
    }
  }
}

export const paymentFailureService = new PaymentFailureService();
