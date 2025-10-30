import { BaseService } from '../base.service';
import { INotificationRepository, IUserRepository } from '../../repositories';
import { container, TYPES } from '../container';
import { Notification, InsertNotification } from '@shared/schema';
import { ValidationServiceError } from '../errors';
import { CommonValidators, BusinessRuleValidators } from '../validation';

export interface INotificationService {
  createNotification(data: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markAsRead(notificationId: string): Promise<boolean>;
  getUnreadCount(userId: string): Promise<number>;
  notifyApplicationUpdate(userId: string, applicationId: string, status: string): Promise<Notification>;
  notifyDocumentReminder(userId: string, documentType: string, deadline: Date): Promise<Notification>;
  notifyDeadlineApproaching(userId: string, applicationId: string, deadline: Date): Promise<Notification>;
  notifyNewMessage(userId: string, fromUserId: string, message: string): Promise<Notification>;
  notifySystemUpdate(userId: string, title: string, message: string): Promise<Notification>;
}

export class NotificationService extends BaseService implements INotificationService {
  constructor(
    private notificationRepository: INotificationRepository = container.get<INotificationRepository>(TYPES.INotificationRepository),
    private userRepository: IUserRepository = container.get<IUserRepository>(TYPES.IUserRepository)
  ) {
    super();
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    try {
      this.validateRequired(data, ['userId', 'type', 'title', 'message']);

      const errors: Record<string, string> = {};

      const userIdValidation = CommonValidators.validateUUID(data.userId, 'User ID');
      if (!userIdValidation.valid) {
        errors.userId = userIdValidation.error!;
      }

      const validNotificationTypes = ['application_update', 'document_reminder', 'message', 'system', 'deadline'];
      BusinessRuleValidators.validateNotificationType(data.type, validNotificationTypes);

      const titleValidation = CommonValidators.validateStringLength(data.title, 1, 255, 'Notification title');
      if (!titleValidation.valid) {
        errors.title = titleValidation.error!;
      }

      const messageValidation = CommonValidators.validateStringLength(data.message, 1, 1000, 'Notification message');
      if (!messageValidation.valid) {
        errors.message = messageValidation.error!;
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationServiceError('Notification', errors);
      }

      return await this.notificationRepository.create(data);
    } catch (error) {
      return this.handleError(error, 'NotificationService.createNotification');
    }
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    try {
      return await this.notificationRepository.findByUser(userId);
    } catch (error) {
      return this.handleError(error, 'NotificationService.getUserNotifications');
    }
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const updated = await this.notificationRepository.update(notificationId, { isRead: true });
      return !!updated;
    } catch (error) {
      return this.handleError(error, 'NotificationService.markAsRead');
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await this.notificationRepository.countUnreadByUser(userId);
    } catch (error) {
      return this.handleError(error, 'NotificationService.getUnreadCount');
    }
  }

  async notifyApplicationUpdate(userId: string, applicationId: string, status: string): Promise<Notification> {
    try {
      return await this.createNotification({
        userId,
        type: 'application_update',
        title: 'Application Status Update',
        message: `Your application status has been updated to: ${status}`,
        data: { applicationId, status } as any
      });
    } catch (error) {
      return this.handleError(error, 'NotificationService.notifyApplicationUpdate');
    }
  }

  async notifyDocumentReminder(userId: string, documentType: string, deadline: Date): Promise<Notification> {
    try {
      return await this.createNotification({
        userId,
        type: 'document_reminder',
        title: 'Document Upload Reminder',
        message: `Don't forget to upload your ${documentType}. Deadline: ${deadline.toDateString()}`,
        data: { documentType, deadline: deadline.toISOString() } as any
      });
    } catch (error) {
      return this.handleError(error, 'NotificationService.notifyDocumentReminder');
    }
  }

  async notifyDeadlineApproaching(userId: string, applicationId: string, deadline: Date): Promise<Notification> {
    try {
      const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      return await this.createNotification({
        userId,
        type: 'deadline',
        title: 'Application Deadline Approaching',
        message: `Your application deadline is in ${daysLeft} days`,
        data: { applicationId, deadline: deadline.toISOString(), daysLeft } as any
      });
    } catch (error) {
      return this.handleError(error, 'NotificationService.notifyDeadlineApproaching');
    }
  }

  async notifyNewMessage(userId: string, fromUserId: string, message: string): Promise<Notification> {
    try {
      const sender = await this.userRepository.findById(fromUserId);
      const senderName = sender ? `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.email : 'Someone';
      
      return await this.createNotification({
        userId,
        type: 'message',
        title: 'New Message',
        message: `${senderName} sent you a message`,
        data: { fromUserId, preview: message.substring(0, 100) } as any
      });
    } catch (error) {
      return this.handleError(error, 'NotificationService.notifyNewMessage');
    }
  }

  async notifySystemUpdate(userId: string, title: string, message: string): Promise<Notification> {
    try {
      return await this.createNotification({
        userId,
        type: 'system',
        title,
        message,
        data: {} as any
      });
    } catch (error) {
      return this.handleError(error, 'NotificationService.notifySystemUpdate');
    }
  }
}

export const notificationService = new NotificationService();
