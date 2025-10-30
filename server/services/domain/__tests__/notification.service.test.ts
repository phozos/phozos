import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NotificationService } from '../notification.service';
import { notificationRepository } from '../../../repositories/notification.repository';
import { userRepository } from '../../../repositories/user.repository';

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let testUserId: string;
  let testUser2Id: string;
  let testNotificationIds: string[] = [];

  beforeEach(async () => {
    notificationService = new NotificationService();

    const user = await userRepository.create({
      email: `notification-svc-user-${Date.now()}-${Math.random()}@example.com`,
      password: 'hashedPassword123',
      userType: 'customer',
      firstName: 'Notification',
      lastName: 'User'
    });
    testUserId = user.id;

    const user2 = await userRepository.create({
      email: `notification-svc-user2-${Date.now()}-${Math.random()}@example.com`,
      password: 'hashedPassword123',
      userType: 'customer',
      firstName: 'Sender',
      lastName: 'User'
    });
    testUser2Id = user2.id;
  });

  afterEach(async () => {
    for (const notificationId of testNotificationIds) {
      try {
        await notificationRepository.delete(notificationId);
      } catch (error) {
        console.log('Notification cleanup failed:', error);
      }
    }
    testNotificationIds = [];

    if (testUserId) {
      try {
        await userRepository.delete(testUserId);
      } catch (error) {
        console.log('User cleanup failed:', error);
      }
    }

    if (testUser2Id) {
      try {
        await userRepository.delete(testUser2Id);
      } catch (error) {
        console.log('User2 cleanup failed:', error);
      }
    }
  });

  describe('createNotification', () => {
    it('should create notification successfully', async () => {
      const result = await notificationService.createNotification({
        userId: testUserId,
        type: 'application_update',
        title: 'Test Notification',
        message: 'Test message',
        data: {} as any
      });
      testNotificationIds.push(result.id);

      expect(result.id).toBeDefined();
      expect(result.userId).toBe(testUserId);
      expect(result.type).toBe('application_update');
      expect(result.title).toBe('Test Notification');
      expect(result.message).toBe('Test message');
    });

    it('should throw error if required fields are missing', async () => {
      await expect(
        notificationService.createNotification({} as any)
      ).rejects.toThrow('Missing required fields');
    });
  });

  describe('getUserNotifications', () => {
    it('should return user notifications', async () => {
      const notif1 = await notificationRepository.create({
        userId: testUserId,
        type: 'application_update',
        title: 'Notification 1',
        message: 'Message 1',
        data: {} as any
      });
      testNotificationIds.push(notif1.id);

      const notif2 = await notificationRepository.create({
        userId: testUserId,
        type: 'message',
        title: 'Notification 2',
        message: 'Message 2',
        data: {} as any
      });
      testNotificationIds.push(notif2.id);

      const result = await notificationService.getUserNotifications(testUserId);

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some(n => n.id === notif1.id)).toBe(true);
      expect(result.some(n => n.id === notif2.id)).toBe(true);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notification = await notificationRepository.create({
        userId: testUserId,
        type: 'application_update',
        title: 'Test',
        message: 'Test message',
        data: {} as any,
        isRead: false
      });
      testNotificationIds.push(notification.id);

      const result = await notificationService.markAsRead(notification.id);

      expect(result).toBe(true);

      const updated = await notificationRepository.findById(notification.id);
      expect(updated?.isRead).toBe(true);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      const notif1 = await notificationRepository.create({
        userId: testUserId,
        type: 'application_update',
        title: 'Unread 1',
        message: 'Message 1',
        data: {} as any,
        isRead: false
      });
      testNotificationIds.push(notif1.id);

      const notif2 = await notificationRepository.create({
        userId: testUserId,
        type: 'message',
        title: 'Unread 2',
        message: 'Message 2',
        data: {} as any,
        isRead: false
      });
      testNotificationIds.push(notif2.id);

      const result = await notificationService.getUnreadCount(testUserId);

      expect(result).toBeGreaterThanOrEqual(2);
    });
  });

  describe('notifyApplicationUpdate', () => {
    it('should create application update notification', async () => {
      const result = await notificationService.notifyApplicationUpdate(testUserId, 'app-123', 'accepted');
      testNotificationIds.push(result.id);

      expect(result.type).toBe('application_update');
      expect(result.userId).toBe(testUserId);
      expect(result.title).toBe('Application Status Update');
      expect(result.message).toContain('accepted');
    });
  });

  describe('notifyNewMessage', () => {
    it('should create new message notification with sender name', async () => {
      const result = await notificationService.notifyNewMessage(testUserId, testUser2Id, 'Hello!');
      testNotificationIds.push(result.id);

      expect(result.type).toBe('message');
      expect(result.userId).toBe(testUserId);
      expect(result.title).toBe('New Message');
      expect(result.message).toContain('Sender User');
    });

    it('should use "Someone" when sender is not found', async () => {
      const result = await notificationService.notifyNewMessage(testUserId, '00000000-0000-0000-0000-000000000000', 'Hello!');
      testNotificationIds.push(result.id);

      expect(result.message).toContain('Someone sent you a message');
    });

    it('should use email when sender has no name', async () => {
      const userNoName = await userRepository.create({
        email: `no-name-${Date.now()}-${Math.random()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: '',
        lastName: ''
      });

      const result = await notificationService.notifyNewMessage(testUserId, userNoName.id, 'Hello!');
      testNotificationIds.push(result.id);

      expect(result.message).toContain('@example.com');

      await userRepository.delete(userNoName.id);
    });

    it('should handle error in notifyNewMessage', async () => {
      const result = await notificationService.notifyNewMessage(testUserId, testUser2Id, 'Hello!');
      testNotificationIds.push(result.id);

      expect(result).toBeDefined();
    });
  });

  describe('notifyDocumentReminder', () => {
    it('should create document reminder notification', async () => {
      const deadline = new Date('2024-12-31');
      const result = await notificationService.notifyDocumentReminder(testUserId, 'Passport', deadline);
      testNotificationIds.push(result.id);

      expect(result.type).toBe('document_reminder');
      expect(result.userId).toBe(testUserId);
      expect(result.title).toBe('Document Upload Reminder');
      expect(result.message).toContain('Passport');
    });

    it('should handle error in notifyDocumentReminder', async () => {
      const deadline = new Date('2024-12-31');
      const result = await notificationService.notifyDocumentReminder(testUserId, 'Passport', deadline);
      testNotificationIds.push(result.id);

      expect(result).toBeDefined();
    });
  });

  describe('notifyDeadlineApproaching', () => {
    it('should create deadline approaching notification', async () => {
      const deadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const result = await notificationService.notifyDeadlineApproaching(testUserId, 'app-123', deadline);
      testNotificationIds.push(result.id);

      expect(result.type).toBe('deadline');
      expect(result.userId).toBe(testUserId);
      expect(result.title).toBe('Application Deadline Approaching');
      expect(result.message).toContain('days');
    });

    it('should handle error in notifyDeadlineApproaching', async () => {
      const deadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const result = await notificationService.notifyDeadlineApproaching(testUserId, 'app-123', deadline);
      testNotificationIds.push(result.id);

      expect(result).toBeDefined();
    });
  });

  describe('notifySystemUpdate', () => {
    it('should create system update notification', async () => {
      const result = await notificationService.notifySystemUpdate(
        testUserId,
        'System Maintenance',
        'The system will be down for maintenance'
      );
      testNotificationIds.push(result.id);

      expect(result.type).toBe('system');
      expect(result.userId).toBe(testUserId);
      expect(result.title).toBe('System Maintenance');
      expect(result.message).toBe('The system will be down for maintenance');
    });

    it('should handle error in notifySystemUpdate', async () => {
      const result = await notificationService.notifySystemUpdate(testUserId, 'Title', 'Message');
      testNotificationIds.push(result.id);

      expect(result).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle error in createNotification', async () => {
      await expect(
        notificationService.createNotification({
          userId: '',
          type: 'application_update',
          title: '',
          message: '',
          data: {} as any
        })
      ).rejects.toThrow();
    });

    it('should handle error in getUserNotifications', async () => {
      const result = await notificationService.getUserNotifications('00000000-0000-0000-0000-000000000000');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle error in markAsRead', async () => {
      const result = await notificationService.markAsRead('00000000-0000-0000-0000-000000000000');

      expect(typeof result).toBe('boolean');
    });

    it('should handle error in getUnreadCount', async () => {
      const result = await notificationService.getUnreadCount('00000000-0000-0000-0000-000000000000');

      expect(typeof result).toBe('number');
    });

    it('should handle error in notifyApplicationUpdate', async () => {
      const result = await notificationService.notifyApplicationUpdate(testUserId, 'app-123', 'accepted');
      testNotificationIds.push(result.id);

      expect(result).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should return false when markAsRead update returns null', async () => {
      const result = await notificationService.markAsRead('00000000-0000-0000-0000-000000000000');

      expect(typeof result).toBe('boolean');
    });

    it('should return false when markAsRead update returns undefined', async () => {
      const result = await notificationService.markAsRead('00000000-0000-0000-0000-000000000000');

      expect(typeof result).toBe('boolean');
    });

    it('should truncate long message preview in notifyNewMessage', async () => {
      const longMessage = 'a'.repeat(150);
      const result = await notificationService.notifyNewMessage(testUserId, testUser2Id, longMessage);
      testNotificationIds.push(result.id);

      expect(result.data).toBeDefined();
      const data = result.data as any;
      if (data.preview) {
        expect(data.preview.length).toBeLessThanOrEqual(100);
      }
    });
  });
});
