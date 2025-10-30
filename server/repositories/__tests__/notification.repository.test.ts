import { describe, it, expect, afterEach } from 'vitest';
import { notificationRepository } from '../notification.repository';
import { userRepository } from '../user.repository';

describe('NotificationRepository', () => {
  let testNotificationId: string;
  let testUserId: string;

  afterEach(async () => {
    if (testNotificationId) {
      try {
        await notificationRepository.delete(testNotificationId);
      } catch (error) {
        console.log('Notification cleanup failed:', error);
      }
    }
    if (testUserId) {
      try {
        await userRepository.delete(testUserId);
      } catch (error) {
        console.log('User cleanup failed:', error);
      }
    }
  });

  describe('create', () => {
    it('should create a notification', async () => {
      const user = await userRepository.create({
        email: `notif-test-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Notif',
        lastName: 'Test'
      });
      testUserId = user.id;

      const notification = await notificationRepository.create({
        userId: user.id,
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'system',
        isRead: false
      });
      testNotificationId = notification.id;

      expect(notification.id).toBeDefined();
      expect(notification.userId).toBe(user.id);
      expect(notification.title).toBe('Test Notification');
      expect(notification.isRead).toBe(false);
    });
  });

  describe('findByUser', () => {
    it('should find all notifications for a user', async () => {
      const user = await userRepository.create({
        email: `find-notif-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Find',
        lastName: 'Notif'
      });
      testUserId = user.id;

      const notification = await notificationRepository.create({
        userId: user.id,
        title: 'Find this notification',
        message: 'Test message',
        type: 'message',
        isRead: false
      });
      testNotificationId = notification.id;

      const notifications = await notificationRepository.findByUser(user.id);
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications.some(n => n.id === notification.id)).toBe(true);
    });
  });

  describe('findUnreadByUser', () => {
    it('should find only unread notifications', async () => {
      const user = await userRepository.create({
        email: `unread-notif-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Unread',
        lastName: 'Notif'
      });
      testUserId = user.id;

      const notification = await notificationRepository.create({
        userId: user.id,
        title: 'Unread notification',
        message: 'Not yet read',
        type: 'system',
        isRead: false
      });
      testNotificationId = notification.id;

      const unreadNotifs = await notificationRepository.findUnreadByUser(user.id);
      expect(unreadNotifs.length).toBeGreaterThan(0);
      expect(unreadNotifs.some(n => n.id === notification.id)).toBe(true);
      expect(unreadNotifs.every(n => n.isRead === false)).toBe(true);
    });
  });

  describe('countUnreadByUser', () => {
    it('should count unread notifications for a user', async () => {
      const user = await userRepository.create({
        email: `count-notif-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Count',
        lastName: 'Notif'
      });
      testUserId = user.id;

      const notification = await notificationRepository.create({
        userId: user.id,
        title: 'Count me',
        message: 'Unread notification',
        type: 'deadline',
        isRead: false
      });
      testNotificationId = notification.id;

      const count = await notificationRepository.countUnreadByUser(user.id);
      expect(count).toBeGreaterThan(0);
    });

    it('should return 0 when user has no unread notifications', async () => {
      const user = await userRepository.create({
        email: `count-zero-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'CountZero',
        lastName: 'Notif'
      });
      testUserId = user.id;

      const count = await notificationRepository.countUnreadByUser(user.id);
      expect(count).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const user = await userRepository.create({
        email: `read-notif-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Read',
        lastName: 'Notif'
      });
      testUserId = user.id;

      const notification = await notificationRepository.create({
        userId: user.id,
        title: 'Mark as read',
        message: 'Will be marked as read',
        type: 'application_update',
        isRead: false
      });
      testNotificationId = notification.id;

      const marked = await notificationRepository.markAsRead(notification.id);
      expect(marked).toBe(true);

      const updated = await notificationRepository.findById(notification.id);
      expect(updated?.isRead).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete a notification', async () => {
      const user = await userRepository.create({
        email: `delete-notif-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'Delete',
        lastName: 'Notif'
      });
      testUserId = user.id;

      const notification = await notificationRepository.create({
        userId: user.id,
        title: 'Delete me',
        message: 'Will be deleted',
        type: 'document_reminder',
        isRead: false
      });

      const deleted = await notificationRepository.delete(notification.id);
      expect(deleted).toBe(true);

      const found = await notificationRepository.findById(notification.id);
      expect(found).toBeUndefined();
      testNotificationId = '';
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for a user', async () => {
      const user = await userRepository.create({
        email: `markall-notif-${Date.now()}@example.com`,
        password: 'hashedPassword123',
        userType: 'customer',
        firstName: 'MarkAll',
        lastName: 'Notif'
      });
      testUserId = user.id;

      const notif1 = await notificationRepository.create({
        userId: user.id,
        title: 'First notification',
        message: 'First message',
        type: 'system',
        isRead: false
      });

      const notif2 = await notificationRepository.create({
        userId: user.id,
        title: 'Second notification',
        message: 'Second message',
        type: 'message',
        isRead: false
      });

      await notificationRepository.markAllAsRead(user.id);

      const notif1Updated = await notificationRepository.findById(notif1.id);
      const notif2Updated = await notificationRepository.findById(notif2.id);

      expect(notif1Updated?.isRead).toBe(true);
      expect(notif2Updated?.isRead).toBe(true);

      await notificationRepository.delete(notif1.id);
      await notificationRepository.delete(notif2.id);
      testNotificationId = '';
    });
  });
});
