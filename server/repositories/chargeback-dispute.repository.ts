import { BaseRepository } from './base.repository';
import {
  ChargebackDispute,
  InsertChargebackDispute,
  chargebacksDisputes,
  payments,
  userSubscriptions,
  users
} from '@shared/schema';
import { db } from '../db';
import { eq, and, desc, or, sql, count } from 'drizzle-orm';
import { handleDatabaseError, NotFoundError } from './errors';

export interface ChargebackDisputeWithDetails extends ChargebackDispute {
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

export interface IChargebackDisputeRepository {
  create(data: InsertChargebackDispute): Promise<ChargebackDispute>;
  findById(id: string): Promise<ChargebackDispute>;
  findByIdOptional(id: string): Promise<ChargebackDispute | undefined>;
  findByPaymentId(paymentId: string): Promise<ChargebackDispute[]>;
  findByUserId(userId: string): Promise<ChargebackDispute[]>;
  findOpen(): Promise<ChargebackDisputeWithDetails[]>;
  updateStatus(id: string, status: string, resolvedBy?: string): Promise<ChargebackDispute>;
  addEvidence(id: string, evidence: Record<string, any>): Promise<ChargebackDispute>;
  resolve(id: string, resolution: string, resolvedBy: string): Promise<ChargebackDispute>;
}

export class ChargebackDisputeRepository
  extends BaseRepository<ChargebackDispute, InsertChargebackDispute>
  implements IChargebackDisputeRepository
{
  constructor() {
    super(chargebacksDisputes, 'id');
  }

  async create(data: InsertChargebackDispute): Promise<ChargebackDispute> {
    try {
      const results = await db
        .insert(chargebacksDisputes)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return results[0] as ChargebackDispute;
    } catch (error) {
      handleDatabaseError(error, 'ChargebackDisputeRepository.create');
    }
  }

  async findByPaymentId(paymentId: string): Promise<ChargebackDispute[]> {
    try {
      return await db
        .select()
        .from(chargebacksDisputes)
        .where(eq(chargebacksDisputes.paymentId, paymentId))
        .orderBy(desc(chargebacksDisputes.createdAt)) as ChargebackDispute[];
    } catch (error) {
      handleDatabaseError(error, 'ChargebackDisputeRepository.findByPaymentId');
    }
  }

  async findByUserId(userId: string): Promise<ChargebackDispute[]> {
    try {
      return await db
        .select()
        .from(chargebacksDisputes)
        .where(eq(chargebacksDisputes.userId, userId))
        .orderBy(desc(chargebacksDisputes.createdAt)) as ChargebackDispute[];
    } catch (error) {
      handleDatabaseError(error, 'ChargebackDisputeRepository.findByUserId');
    }
  }

  async findOpen(): Promise<ChargebackDisputeWithDetails[]> {
    try {
      const results = await db
        .select({
          id: chargebacksDisputes.id,
          paymentId: chargebacksDisputes.paymentId,
          subscriptionId: chargebacksDisputes.subscriptionId,
          userId: chargebacksDisputes.userId,
          type: chargebacksDisputes.type,
          reason: chargebacksDisputes.reason,
          status: chargebacksDisputes.status,
          amount: chargebacksDisputes.amount,
          currency: chargebacksDisputes.currency,
          evidence: chargebacksDisputes.evidence,
          razorpayDisputeId: chargebacksDisputes.razorpayDisputeId,
          resolution: chargebacksDisputes.resolution,
          resolvedAt: chargebacksDisputes.resolvedAt,
          resolvedBy: chargebacksDisputes.resolvedBy,
          adminNotes: chargebacksDisputes.adminNotes,
          createdAt: chargebacksDisputes.createdAt,
          updatedAt: chargebacksDisputes.updatedAt,
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
        .from(chargebacksDisputes)
        .leftJoin(payments, eq(chargebacksDisputes.paymentId, payments.id))
        .leftJoin(userSubscriptions, eq(chargebacksDisputes.subscriptionId, userSubscriptions.id))
        .leftJoin(users, eq(chargebacksDisputes.userId, users.id))
        .where(
          or(
            eq(chargebacksDisputes.status, 'open'),
            eq(chargebacksDisputes.status, 'investigating')
          )
        )
        .orderBy(desc(chargebacksDisputes.createdAt));

      return results as ChargebackDisputeWithDetails[];
    } catch (error) {
      handleDatabaseError(error, 'ChargebackDisputeRepository.findOpen');
    }
  }

  async updateStatus(
    id: string,
    status: string,
    resolvedBy?: string
  ): Promise<ChargebackDispute> {
    try {
      const updateData: Partial<ChargebackDispute> = {
        status: status as any,
        updatedAt: new Date(),
      };

      if (resolvedBy && (status === 'resolved' || status === 'closed')) {
        updateData.resolvedBy = resolvedBy;
        updateData.resolvedAt = new Date();
      }

      const results = await db
        .update(chargebacksDisputes)
        .set(updateData)
        .where(eq(chargebacksDisputes.id, id))
        .returning();

      if (!results[0]) {
        throw new NotFoundError('ChargebackDispute', id);
      }

      return results[0] as ChargebackDispute;
    } catch (error) {
      handleDatabaseError(error, 'ChargebackDisputeRepository.updateStatus');
    }
  }

  async addEvidence(id: string, evidence: Record<string, any>): Promise<ChargebackDispute> {
    try {
      // First get the existing dispute to merge evidence
      const existing = await this.findByIdOptional(id);
      if (!existing) {
        throw new NotFoundError('ChargebackDispute', id);
      }

      const existingEvidence = (existing.evidence as Record<string, any>) || {};
      const mergedEvidence = {
        ...existingEvidence,
        ...evidence,
      };

      const results = await db
        .update(chargebacksDisputes)
        .set({
          evidence: mergedEvidence,
          updatedAt: new Date(),
        })
        .where(eq(chargebacksDisputes.id, id))
        .returning();

      return results[0] as ChargebackDispute;
    } catch (error) {
      handleDatabaseError(error, 'ChargebackDisputeRepository.addEvidence');
    }
  }

  async resolve(id: string, resolution: string, resolvedBy: string): Promise<ChargebackDispute> {
    try {
      const results = await db
        .update(chargebacksDisputes)
        .set({
          status: 'resolved',
          resolution,
          resolvedBy,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(chargebacksDisputes.id, id))
        .returning();

      if (!results[0]) {
        throw new NotFoundError('ChargebackDispute', id);
      }

      return results[0] as ChargebackDispute;
    } catch (error) {
      handleDatabaseError(error, 'ChargebackDisputeRepository.resolve');
    }
  }
}

export const chargebackDisputeRepository = new ChargebackDisputeRepository();
