import { BaseRepository } from './base.repository';
import { 
  UserPlanNotification, 
  InsertUserPlanNotification, 
  userPlanNotifications,
  subscriptionPlanNotifications 
} from '@shared/schema';
import { db } from '../db';
import { eq, and, desc, isNull, SQL } from 'drizzle-orm';
import { handleDatabaseError } from './errors';

export interface IUserPlanNotificationRepository {
  findById(id: string): Promise<UserPlanNotification>;
  findByIdOptional(id: string): Promise<UserPlanNotification | undefined>;
  findByNotificationId(notificationId: string): Promise<UserPlanNotification[]>;
  findUnreadByUser(userId: string): Promise<any[]>;
  markAsRead(userId: string, notificationId: string): Promise<void>;
  acknowledge(userId: string, notificationId: string): Promise<void>;
  create(data: InsertUserPlanNotification): Promise<UserPlanNotification>;
  update(id: string, data: Partial<UserPlanNotification>): Promise<UserPlanNotification>;
  delete(id: string): Promise<boolean>;
}

export class UserPlanNotificationRepository 
  extends BaseRepository<UserPlanNotification, InsertUserPlanNotification> 
  implements IUserPlanNotificationRepository {
  
  constructor() {
    super(userPlanNotifications, 'id');
  }

  async findByNotificationId(notificationId: string): Promise<UserPlanNotification[]> {
    try {
      return await db
        .select()
        .from(userPlanNotifications)
        .where(eq(userPlanNotifications.planNotificationId, notificationId))
        .orderBy(desc(userPlanNotifications.createdAt)) as UserPlanNotification[];
    } catch (error) {
      handleDatabaseError(error, 'UserPlanNotificationRepository.findByNotificationId');
    }
  }

  async findUnreadByUser(userId: string): Promise<any[]> {
    try {
      return await db
        .select({
          id: userPlanNotifications.id,
          planNotificationId: userPlanNotifications.planNotificationId,
          userId: userPlanNotifications.userId,
          sentAt: userPlanNotifications.sentAt,
          readAt: userPlanNotifications.readAt,
          acknowledgedAt: userPlanNotifications.acknowledgedAt,
          emailStatus: userPlanNotifications.emailStatus,
          createdAt: userPlanNotifications.createdAt,
          // Flatten notification details to top level for easier UI consumption
          planId: subscriptionPlanNotifications.planId,
          notificationType: subscriptionPlanNotifications.notificationType,
          title: subscriptionPlanNotifications.title,
          message: subscriptionPlanNotifications.message,
          effectiveDate: subscriptionPlanNotifications.effectiveDate,
          metadata: subscriptionPlanNotifications.metadata,
        })
        .from(userPlanNotifications)
        .innerJoin(
          subscriptionPlanNotifications,
          eq(userPlanNotifications.planNotificationId, subscriptionPlanNotifications.id)
        )
        .where(
          and(
            eq(userPlanNotifications.userId, userId),
            isNull(userPlanNotifications.acknowledgedAt)
          )
        )
        .orderBy(desc(userPlanNotifications.sentAt));
    } catch (error) {
      handleDatabaseError(error, 'UserPlanNotificationRepository.findUnreadByUser');
    }
  }

  async markAsRead(userId: string, userNotificationId: string): Promise<void> {
    try {
      await db
        .update(userPlanNotifications)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(userPlanNotifications.userId, userId),
            eq(userPlanNotifications.id, userNotificationId)
          )
        );
    } catch (error) {
      handleDatabaseError(error, 'UserPlanNotificationRepository.markAsRead');
    }
  }

  async acknowledge(userId: string, userNotificationId: string): Promise<void> {
    try {
      await db
        .update(userPlanNotifications)
        .set({ acknowledgedAt: new Date() })
        .where(
          and(
            eq(userPlanNotifications.userId, userId),
            eq(userPlanNotifications.id, userNotificationId)
          )
        );
    } catch (error) {
      handleDatabaseError(error, 'UserPlanNotificationRepository.acknowledge');
    }
  }
}

export const userPlanNotificationRepository = new UserPlanNotificationRepository();
