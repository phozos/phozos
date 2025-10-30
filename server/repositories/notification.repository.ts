import { BaseRepository } from './base.repository';
import { Notification, InsertNotification, notifications } from '@shared/schema';
import { db } from '../db';
import { eq, and, desc, sql, SQL } from 'drizzle-orm';
import { handleDatabaseError } from './errors';
import { NotificationFilters } from '../types/repository-filters';

export interface INotificationRepository {
  findById(id: string): Promise<Notification>;
  findByIdOptional(id: string): Promise<Notification | undefined>;
  findByUser(userId: string): Promise<Notification[]>;
  findUnreadByUser(userId: string): Promise<Notification[]>;
  countUnreadByUser(userId: string): Promise<number>;
  findAll(filters?: NotificationFilters): Promise<Notification[]>;
  create(data: InsertNotification): Promise<Notification>;
  update(id: string, data: Partial<Notification>): Promise<Notification>;
  markAsRead(id: string): Promise<boolean>;
  markAllAsRead(userId: string): Promise<void>;
  delete(id: string): Promise<boolean>;
}

export class NotificationRepository extends BaseRepository<Notification, InsertNotification> implements INotificationRepository {
  constructor() {
    super(notifications, 'id');
  }

  async findByUser(userId: string): Promise<Notification[]> {
    try {
      return await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt)) as Notification[];
    } catch (error) {
      handleDatabaseError(error, 'NotificationRepository.findByUser');
    }
  }

  async findUnreadByUser(userId: string): Promise<Notification[]> {
    try {
      return await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        )
        .orderBy(desc(notifications.createdAt)) as Notification[];
    } catch (error) {
      handleDatabaseError(error, 'NotificationRepository.findUnreadByUser');
    }
  }

  async countUnreadByUser(userId: string): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );
      
      return Number(result[0]?.count || 0);
    } catch (error) {
      handleDatabaseError(error, 'NotificationRepository.countUnreadByUser');
    }
  }

  async markAsRead(id: string): Promise<boolean> {
    try {
      const result = await this.update(id, { isRead: true });
      return result !== undefined;
    } catch (error) {
      handleDatabaseError(error, 'NotificationRepository.markAsRead');
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, userId));
    } catch (error) {
      handleDatabaseError(error, 'NotificationRepository.markAllAsRead');
    }
  }

  async findAll(filters?: NotificationFilters): Promise<Notification[]> {
    try {
      const conditions: SQL[] = [];
      
      if (filters) {
        if (filters.userId) {
          conditions.push(eq(notifications.userId, filters.userId));
        }
        if (filters.isRead !== undefined) {
          conditions.push(eq(notifications.isRead, filters.isRead));
        }
        if (filters.type) {
          conditions.push(eq(notifications.type, filters.type));
        }
      }
      
      let query = db.select().from(notifications);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }
      
      return await query.orderBy(desc(notifications.createdAt)) as Notification[];
    } catch (error) {
      handleDatabaseError(error, 'NotificationRepository.findAll');
    }
  }
}

export const notificationRepository = new NotificationRepository();
