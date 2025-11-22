import { BaseRepository } from './base.repository';
import { 
  SubscriptionPlanNotification, 
  InsertSubscriptionPlanNotification, 
  subscriptionPlanNotifications 
} from '@shared/schema';
import { db } from '../db';
import { eq, and, desc, isNull, lte, SQL } from 'drizzle-orm';
import { handleDatabaseError } from './errors';

export interface ISubscriptionPlanNotificationRepository {
  findById(id: string): Promise<SubscriptionPlanNotification>;
  findByIdOptional(id: string): Promise<SubscriptionPlanNotification | undefined>;
  findByPlanId(planId: string): Promise<SubscriptionPlanNotification[]>;
  findPendingNotifications(): Promise<SubscriptionPlanNotification[]>;
  findAll(): Promise<SubscriptionPlanNotification[]>;
  create(data: InsertSubscriptionPlanNotification): Promise<SubscriptionPlanNotification>;
  update(id: string, data: Partial<SubscriptionPlanNotification>): Promise<SubscriptionPlanNotification>;
  delete(id: string): Promise<boolean>;
}

export class SubscriptionPlanNotificationRepository 
  extends BaseRepository<SubscriptionPlanNotification, InsertSubscriptionPlanNotification> 
  implements ISubscriptionPlanNotificationRepository {
  
  constructor() {
    super(subscriptionPlanNotifications, 'id');
  }

  async findByPlanId(planId: string): Promise<SubscriptionPlanNotification[]> {
    try {
      return await db
        .select()
        .from(subscriptionPlanNotifications)
        .where(eq(subscriptionPlanNotifications.planId, planId))
        .orderBy(desc(subscriptionPlanNotifications.createdAt)) as SubscriptionPlanNotification[];
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanNotificationRepository.findByPlanId');
    }
  }

  async findPendingNotifications(): Promise<SubscriptionPlanNotification[]> {
    try {
      const now = new Date();
      return await db
        .select()
        .from(subscriptionPlanNotifications)
        .where(
          and(
            isNull(subscriptionPlanNotifications.sentAt),
            lte(subscriptionPlanNotifications.notificationDate, now)
          )
        )
        .orderBy(subscriptionPlanNotifications.notificationDate) as SubscriptionPlanNotification[];
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanNotificationRepository.findPendingNotifications');
    }
  }

  async findAll(): Promise<SubscriptionPlanNotification[]> {
    try {
      return await db
        .select()
        .from(subscriptionPlanNotifications)
        .orderBy(desc(subscriptionPlanNotifications.createdAt)) as SubscriptionPlanNotification[];
    } catch (error) {
      handleDatabaseError(error, 'SubscriptionPlanNotificationRepository.findAll');
    }
  }
}

export const subscriptionPlanNotificationRepository = new SubscriptionPlanNotificationRepository();
