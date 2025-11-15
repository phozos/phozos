import { BaseRepository } from './base.repository';
import {
  Refund,
  InsertRefund,
  refunds,
  payments,
  userSubscriptions,
  users
} from '@shared/schema';
import { db } from '../db';
import { eq, and, desc, sql, sum } from 'drizzle-orm';
import { handleDatabaseError, NotFoundError } from './errors';

export interface RefundWithDetails extends Refund {
  payment?: {
    id: string;
    orderId: string;
    paymentReference: string;
    amount: string;
  };
  subscription?: {
    id: string;
    planId: string;
    status: string;
  };
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export interface IRefundRepository {
  create(data: InsertRefund): Promise<Refund>;
  findById(id: string): Promise<Refund | undefined>;
  findByPaymentId(paymentId: string): Promise<Refund[]>;
  findBySubscriptionId(subscriptionId: string): Promise<Refund[]>;
  findByUserId(userId: string): Promise<Refund[]>;
  findPending(): Promise<RefundWithDetails[]>;
  updateStatus(id: string, status: string, razorpayData?: Partial<Refund>): Promise<Refund>;
  updateRazorpayRefundId(id: string, refundId: string): Promise<Refund>;
  getTotalRefundedAmount(subscriptionId: string): Promise<number>;
}

export class RefundRepository
  extends BaseRepository<Refund, InsertRefund>
  implements IRefundRepository
{
  constructor() {
    super(refunds, 'id');
  }

  async create(data: InsertRefund): Promise<Refund> {
    try {
      const results = await db
        .insert(refunds)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return results[0] as Refund;
    } catch (error) {
      handleDatabaseError(error, 'RefundRepository.create');
    }
  }

  async findById(id: string): Promise<Refund | undefined> {
    try {
      const results = await db
        .select()
        .from(refunds)
        .where(eq(refunds.id, id))
        .limit(1);

      return results[0] as Refund | undefined;
    } catch (error) {
      handleDatabaseError(error, 'RefundRepository.findById');
    }
  }

  async findByPaymentId(paymentId: string): Promise<Refund[]> {
    try {
      return await db
        .select()
        .from(refunds)
        .where(eq(refunds.paymentId, paymentId))
        .orderBy(desc(refunds.createdAt)) as Refund[];
    } catch (error) {
      handleDatabaseError(error, 'RefundRepository.findByPaymentId');
    }
  }

  async findBySubscriptionId(subscriptionId: string): Promise<Refund[]> {
    try {
      return await db
        .select()
        .from(refunds)
        .where(eq(refunds.subscriptionId, subscriptionId))
        .orderBy(desc(refunds.createdAt)) as Refund[];
    } catch (error) {
      handleDatabaseError(error, 'RefundRepository.findBySubscriptionId');
    }
  }

  async findByUserId(userId: string): Promise<Refund[]> {
    try {
      return await db
        .select()
        .from(refunds)
        .where(eq(refunds.userId, userId))
        .orderBy(desc(refunds.createdAt)) as Refund[];
    } catch (error) {
      handleDatabaseError(error, 'RefundRepository.findByUserId');
    }
  }

  async findPending(): Promise<RefundWithDetails[]> {
    try {
      const results = await db
        .select({
          id: refunds.id,
          paymentId: refunds.paymentId,
          subscriptionId: refunds.subscriptionId,
          userId: refunds.userId,
          cancellationRequestId: refunds.cancellationRequestId,
          amount: refunds.amount,
          currency: refunds.currency,
          reason: refunds.reason,
          status: refunds.status,
          razorpayRefundId: refunds.razorpayRefundId,
          razorpayStatus: refunds.razorpayStatus,
          requestedAt: refunds.requestedAt,
          processedAt: refunds.processedAt,
          processedBy: refunds.processedBy,
          adminNotes: refunds.adminNotes,
          razorpayResponse: refunds.razorpayResponse,
          createdAt: refunds.createdAt,
          updatedAt: refunds.updatedAt,
          payment: {
            id: payments.id,
            orderId: payments.orderId,
            paymentReference: payments.paymentReference,
            amount: payments.amount,
          },
          subscription: {
            id: userSubscriptions.id,
            planId: userSubscriptions.planId,
            status: userSubscriptions.status,
          },
          user: {
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
          },
        })
        .from(refunds)
        .leftJoin(payments, eq(refunds.paymentId, payments.id))
        .leftJoin(userSubscriptions, eq(refunds.subscriptionId, userSubscriptions.id))
        .leftJoin(users, eq(refunds.userId, users.id))
        .where(eq(refunds.status, 'pending'))
        .orderBy(desc(refunds.createdAt));

      return results as RefundWithDetails[];
    } catch (error) {
      handleDatabaseError(error, 'RefundRepository.findPending');
    }
  }

  async updateStatus(
    id: string,
    status: string,
    razorpayData?: Partial<Refund>
  ): Promise<Refund> {
    try {
      const updateData: Partial<Refund> = {
        status: status as any,
        updatedAt: new Date(),
      };

      if (razorpayData) {
        if (razorpayData.razorpayRefundId) {
          updateData.razorpayRefundId = razorpayData.razorpayRefundId;
        }
        if (razorpayData.razorpayStatus) {
          updateData.razorpayStatus = razorpayData.razorpayStatus;
        }
        if (razorpayData.razorpayResponse) {
          updateData.razorpayResponse = razorpayData.razorpayResponse;
        }
        if (razorpayData.processedBy) {
          updateData.processedBy = razorpayData.processedBy;
        }
        if (razorpayData.adminNotes) {
          updateData.adminNotes = razorpayData.adminNotes;
        }
      }

      if (status === 'completed' || status === 'rejected' || status === 'failed') {
        updateData.processedAt = new Date();
      }

      const results = await db
        .update(refunds)
        .set(updateData)
        .where(eq(refunds.id, id))
        .returning();

      if (!results[0]) {
        throw new NotFoundError('Refund', id);
      }

      return results[0] as Refund;
    } catch (error) {
      handleDatabaseError(error, 'RefundRepository.updateStatus');
    }
  }

  async updateRazorpayRefundId(id: string, refundId: string): Promise<Refund> {
    try {
      const results = await db
        .update(refunds)
        .set({
          razorpayRefundId: refundId,
          updatedAt: new Date(),
        })
        .where(eq(refunds.id, id))
        .returning();

      if (!results[0]) {
        throw new NotFoundError('Refund', id);
      }

      return results[0] as Refund;
    } catch (error) {
      handleDatabaseError(error, 'RefundRepository.updateRazorpayRefundId');
    }
  }

  async getTotalRefundedAmount(subscriptionId: string): Promise<number> {
    try {
      const result = await db
        .select({
          total: sum(refunds.amount),
        })
        .from(refunds)
        .where(
          and(
            eq(refunds.subscriptionId, subscriptionId),
            eq(refunds.status, 'completed')
          )
        );

      return Number(result[0]?.total || 0);
    } catch (error) {
      handleDatabaseError(error, 'RefundRepository.getTotalRefundedAmount');
    }
  }
}

export const refundRepository = new RefundRepository();
