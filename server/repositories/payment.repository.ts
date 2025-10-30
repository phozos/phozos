import { BaseRepository } from './base.repository';
import { PaymentSettings, InsertPaymentSettings, paymentSettings } from '@shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { handleDatabaseError } from './errors';

export interface IPaymentRepository {
  findAll(): Promise<PaymentSettings[]>;
  findById(id: string): Promise<PaymentSettings>;
  findByIdOptional(id: string): Promise<PaymentSettings | undefined>;
  findByGateway(gateway: string): Promise<PaymentSettings | undefined>;
  findActive(): Promise<PaymentSettings[]>;
  create(data: InsertPaymentSettings): Promise<PaymentSettings>;
  update(id: string, data: Partial<PaymentSettings>): Promise<PaymentSettings>;
  updateByGateway(gateway: string, data: Partial<PaymentSettings>): Promise<PaymentSettings | undefined>;
  delete(id: string): Promise<boolean>;
}

export class PaymentRepository extends BaseRepository<PaymentSettings, InsertPaymentSettings> implements IPaymentRepository {
  constructor() {
    super(paymentSettings, 'id');
  }

  async findAll(): Promise<PaymentSettings[]> {
    try {
      return await db
        .select()
        .from(paymentSettings)
        .orderBy(paymentSettings.gateway) as PaymentSettings[];
    } catch (error) {
      handleDatabaseError(error, 'PaymentRepository.findAll');
    }
  }

  async findByGateway(gateway: string): Promise<PaymentSettings | undefined> {
    try {
      const results = await db
        .select()
        .from(paymentSettings)
        .where(eq(paymentSettings.gateway, gateway))
        .limit(1);
      return results[0] as PaymentSettings | undefined;
    } catch (error) {
      handleDatabaseError(error, 'PaymentRepository.findByGateway');
    }
  }

  async findActive(): Promise<PaymentSettings[]> {
    try {
      return await db
        .select()
        .from(paymentSettings)
        .where(eq(paymentSettings.isActive, true)) as PaymentSettings[];
    } catch (error) {
      handleDatabaseError(error, 'PaymentRepository.findActive');
    }
  }

  async updateByGateway(gateway: string, data: Partial<PaymentSettings>): Promise<PaymentSettings | undefined> {
    try {
      const results = await db
        .update(paymentSettings)
        .set(data)
        .where(eq(paymentSettings.gateway, gateway))
        .returning();
      return results[0] as PaymentSettings | undefined;
    } catch (error) {
      handleDatabaseError(error, 'PaymentRepository.updateByGateway');
    }
  }
}

export const paymentRepository = new PaymentRepository();
