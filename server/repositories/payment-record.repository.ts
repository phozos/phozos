import { BaseRepository } from './base.repository';
import { Payment, InsertPayment, payments } from '@shared/schema';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { handleDatabaseError } from './errors';

export interface IPaymentRecordRepository {
  findAll(): Promise<Payment[]>;
  findById(id: string): Promise<Payment>;
  findByIdOptional(id: string): Promise<Payment | undefined>;
  findByPaymentReference(paymentReference: string): Promise<Payment | undefined>;
  findByOrderId(orderId: string): Promise<Payment | undefined>;
  findByUserId(userId: string): Promise<Payment[]>;
  findBySubscriptionId(subscriptionId: string): Promise<Payment[]>;
  create(data: InsertPayment): Promise<Payment>;
  update(id: string, data: Partial<Payment>): Promise<Payment>;
  delete(id: string): Promise<boolean>;
}

export class PaymentRecordRepository extends BaseRepository<Payment, InsertPayment> implements IPaymentRecordRepository {
  constructor() {
    super(payments, 'id');
  }

  async findAll(): Promise<Payment[]> {
    try {
      return await db
        .select()
        .from(payments)
        .orderBy(payments.paidAt) as Payment[];
    } catch (error) {
      handleDatabaseError(error, 'PaymentRecordRepository.findAll');
    }
  }

  async findByPaymentReference(paymentReference: string): Promise<Payment | undefined> {
    try {
      const results = await db
        .select()
        .from(payments)
        .where(eq(payments.paymentReference, paymentReference))
        .limit(1);
      return results[0] as Payment | undefined;
    } catch (error) {
      handleDatabaseError(error, 'PaymentRecordRepository.findByPaymentReference');
    }
  }

  async findByOrderId(orderId: string): Promise<Payment | undefined> {
    try {
      const results = await db
        .select()
        .from(payments)
        .where(eq(payments.orderId, orderId))
        .limit(1);
      return results[0] as Payment | undefined;
    } catch (error) {
      handleDatabaseError(error, 'PaymentRecordRepository.findByOrderId');
    }
  }

  async findByUserId(userId: string): Promise<Payment[]> {
    try {
      return await db
        .select()
        .from(payments)
        .where(eq(payments.userId, userId))
        .orderBy(payments.paidAt) as Payment[];
    } catch (error) {
      handleDatabaseError(error, 'PaymentRecordRepository.findByUserId');
    }
  }

  async findBySubscriptionId(subscriptionId: string): Promise<Payment[]> {
    try {
      return await db
        .select()
        .from(payments)
        .where(eq(payments.subscriptionId, subscriptionId))
        .orderBy(payments.paidAt) as Payment[];
    } catch (error) {
      handleDatabaseError(error, 'PaymentRecordRepository.findBySubscriptionId');
    }
  }
}

export const paymentRecordRepository = new PaymentRecordRepository();
