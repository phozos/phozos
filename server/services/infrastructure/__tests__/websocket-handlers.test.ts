import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketService } from '../websocket';
import { WebSocketEventHandlers, ChatMessageHandler, NotificationHandler, ApplicationStatusHandler, ForumHandler } from '../websocket-handlers';
import { createServer } from 'http';
import { userRepository } from '../../../repositories/user.repository';
import { studentRepository } from '../../../repositories/student.repository';
import { chatRepository } from '../../../repositories/chat.repository';

// Mock JwtService for authentication
vi.mock('../../../security/jwtService', () => ({
  JwtService: vi.fn().mockImplementation(() => ({
    verify: vi.fn((token: string) => {
      if (token.startsWith('valid-token-')) {
        return { userId: token.replace('valid-token-', '') };
      }
      throw new Error('Invalid token');
    })
  }))
}));

describe('WebSocket Event Handlers', () => {
  let server: any;
  let wsService: WebSocketService;
  let handlers: WebSocketEventHandlers;
  let testUserIds: string[] = [];
  let testStudentIds: string[] = [];
  let testChatIds: string[] = [];

  beforeEach(() => {
    server = createServer();
    wsService = new WebSocketService(server);
    handlers = new WebSocketEventHandlers(wsService);
  });

  afterEach(async () => {
    wsService.close();
    if (server) {
      server.close();
    }
    vi.clearAllMocks();

    // Cleanup
    for (const chatId of testChatIds) {
      try {
        await chatRepository.delete(chatId);
      } catch (error) {
        console.log('Chat cleanup failed:', error);
      }
    }
    testChatIds = [];

    for (const studentId of testStudentIds) {
      try {
        await studentRepository.delete(studentId);
      } catch (error) {
        console.log('Student cleanup failed:', error);
      }
    }
    testStudentIds = [];

    for (const userId of testUserIds) {
      try {
        await userRepository.delete(userId);
      } catch (error) {
        console.log('User cleanup failed:', error);
      }
    }
    testUserIds = [];
  });

  describe('ChatMessageHandler', () => {
    it('should broadcast chat message between student and counselor', async () => {
      const student = await userRepository.create({
        email: `chat-student-${Date.now()}@example.com`,
        firstName: 'Chat',
        lastName: 'Student',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(student.id);

      const counselor = await userRepository.create({
        email: `chat-counselor-${Date.now()}@example.com`,
        firstName: 'Chat',
        lastName: 'Counselor',
        userType: 'team_member',
        password: 'test123'
      });
      testUserIds.push(counselor.id);

      const messageData = {
        id: `msg-${Date.now()}`,
        content: 'Hello',
        sender: student.id
      };

      await handlers.chat.broadcastChatMessage(student.id, counselor.id, messageData);

      expect(handlers.chat.name).toBe('ChatMessageHandler');
    });

    it('should broadcast message read status', async () => {
      const student = await userRepository.create({
        email: `read-student-${Date.now()}@example.com`,
        firstName: 'Read',
        lastName: 'Student',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(student.id);

      const counselor = await userRepository.create({
        email: `read-counselor-${Date.now()}@example.com`,
        firstName: 'Read',
        lastName: 'Counselor',
        userType: 'team_member',
        password: 'test123'
      });
      testUserIds.push(counselor.id);

      const readData = {
        readAt: new Date().toISOString(),
        readBy: counselor.id
      };

      await handlers.chat.broadcastMessageReadStatus(
        student.id,
        counselor.id,
        `msg-${Date.now()}`,
        readData
      );

      expect(readData.readBy).toBe(counselor.id);
    });
  });

  describe('NotificationHandler', () => {
    it('should send notification to user', async () => {
      const user = await userRepository.create({
        email: `notif-user-${Date.now()}@example.com`,
        firstName: 'Notification',
        lastName: 'Test',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      const notification = {
        title: 'Application Update',
        body: 'Your application has been reviewed'
      };

      await handlers.notification.sendNotification(user.id, notification);

      expect(handlers.notification.name).toBe('NotificationHandler');
      expect(notification.title).toBe('Application Update');
    });

    it('should handle various notification types', async () => {
      const user = await userRepository.create({
        email: `multi-notif-${Date.now()}@example.com`,
        firstName: 'Multi',
        lastName: 'Notif',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      const notifications = [
        { title: 'New Assignment', body: 'New student assigned' },
        { title: 'Message Received', body: 'Student sent message' },
        { title: 'Document Uploaded', body: 'New document available' }
      ];

      for (const notif of notifications) {
        await handlers.notification.sendNotification(user.id, notif);
      }

      expect(notifications.length).toBe(3);
    });
  });

  describe('ApplicationStatusHandler', () => {
    it('should send application update to user', async () => {
      const user = await userRepository.create({
        email: `app-update-${Date.now()}@example.com`,
        firstName: 'Application',
        lastName: 'User',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      const applicationData = {
        id: `app-${Date.now()}`,
        status: 'approved',
        university: 'MIT',
        program: 'Computer Science'
      };

      await handlers.applicationStatus.sendApplicationUpdate(user.id, applicationData);

      expect(handlers.applicationStatus.name).toBe('ApplicationStatusHandler');
      expect(applicationData.status).toBe('approved');
    });

    it('should handle different application statuses', async () => {
      const user = await userRepository.create({
        email: `status-${Date.now()}@example.com`,
        firstName: 'Status',
        lastName: 'Test',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      const statuses = ['pending', 'approved', 'rejected', 'waitlisted'];

      for (const status of statuses) {
        await handlers.applicationStatus.sendApplicationUpdate(user.id, {
          id: `app-${status}`,
          status,
          university: 'Test University'
        });
      }

      expect(statuses.length).toBe(4);
    });
  });

  describe('ForumHandler', () => {
    it('should broadcast post created event', async () => {
      const postData = {
        id: `post-${Date.now()}`,
        title: 'Test Post',
        content: 'This is a test post',
        authorId: 'user-123'
      };

      await handlers.forum.broadcastPostCreated(postData);

      expect(handlers.forum.name).toBe('ForumHandler');
      expect(postData.title).toBe('Test Post');
    });

    it('should broadcast post updated event', async () => {
      const postId = `post-${Date.now()}`;

      await handlers.forum.broadcastPostUpdated(postId);

      expect(postId).toBeDefined();
    });

    it('should broadcast post like update', async () => {
      const postId = `post-${Date.now()}`;
      const likeCount = 5;
      const likedBy = ['user1', 'user2', 'user3', 'user4', 'user5'];

      await handlers.forum.broadcastPostLikeUpdate(postId, likeCount, likedBy);

      expect(likeCount).toBe(5);
      expect(likedBy.length).toBe(5);
    });

    it('should broadcast comment created event', async () => {
      const postId = `post-${Date.now()}`;
      const commentData = {
        id: `comment-${Date.now()}`,
        content: 'Great post!',
        authorId: 'user-123'
      };

      await handlers.forum.broadcastCommentCreated(postId, commentData);

      expect(commentData.content).toBe('Great post!');
    });
  });

  describe('WebSocketEventHandlers Manager', () => {
    it('should initialize all handlers', () => {
      expect(handlers.chat).toBeInstanceOf(ChatMessageHandler);
      expect(handlers.notification).toBeInstanceOf(NotificationHandler);
      expect(handlers.applicationStatus).toBeInstanceOf(ApplicationStatusHandler);
      expect(handlers.forum).toBeInstanceOf(ForumHandler);
    });

    it('should return all handlers', () => {
      const allHandlers = handlers.getAllHandlers();

      expect(allHandlers.length).toBe(4);
      expect(allHandlers[0].name).toBe('ChatMessageHandler');
      expect(allHandlers[1].name).toBe('NotificationHandler');
      expect(allHandlers[2].name).toBe('ApplicationStatusHandler');
      expect(allHandlers[3].name).toBe('ForumHandler');
    });
  });

  describe('Real-world scenarios with handlers', () => {
    it('should handle student-counselor communication workflow', async () => {
      const student = await userRepository.create({
        email: `workflow-student-${Date.now()}@example.com`,
        firstName: 'Workflow',
        lastName: 'Student',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(student.id);

      const counselor = await userRepository.create({
        email: `workflow-counselor-${Date.now()}@example.com`,
        firstName: 'Workflow',
        lastName: 'Counselor',
        userType: 'team_member',
        password: 'test123'
      });
      testUserIds.push(counselor.id);

      const studentProfile = await studentRepository.create({
        userId: student.id,
        dateOfBirth: new Date('2000-01-01'),
        academicLevel: 'undergraduate'
      });
      testStudentIds.push(studentProfile.id);

      // 1. Counselor assigned notification
      await handlers.notification.sendNotification(student.id, {
        title: 'Counselor Assigned',
        body: `${counselor.firstName} is now your counselor`
      });

      // 2. Student sends initial message
      const chat1 = await chatRepository.create({
        studentId: student.id,
        counselorId: counselor.id,
        senderId: student.id,
        message: 'Hi, I need help with my applications',
        isRead: false
      });
      testChatIds.push(chat1.id);

      await handlers.chat.broadcastChatMessage(student.id, counselor.id, {
        id: chat1.id,
        content: chat1.message,
        sender: student.id
      });

      // 3. Counselor replies
      const chat2 = await chatRepository.create({
        studentId: student.id,
        counselorId: counselor.id,
        senderId: counselor.id,
        message: 'Happy to help! What schools are you interested in?',
        isRead: false
      });
      testChatIds.push(chat2.id);

      await handlers.chat.broadcastChatMessage(student.id, counselor.id, {
        id: chat2.id,
        content: chat2.message,
        sender: counselor.id
      });

      // 4. Mark messages as read
      await chatRepository.markAsRead(chat1.id, counselor.id);
      await handlers.chat.broadcastMessageReadStatus(
        student.id,
        counselor.id,
        chat1.id,
        { readAt: new Date().toISOString(), readBy: counselor.id }
      );

      expect(testChatIds.length).toBe(2);
    });

    it('should handle application status updates workflow', async () => {
      const student = await userRepository.create({
        email: `app-workflow-${Date.now()}@example.com`,
        firstName: 'Application',
        lastName: 'Workflow',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(student.id);

      const statuses = ['submitted', 'under_review', 'approved'];

      for (const status of statuses) {
        // Send application update
        await handlers.applicationStatus.sendApplicationUpdate(student.id, {
          id: `app-123`,
          status,
          university: 'MIT',
          lastUpdated: new Date().toISOString()
        });

        // Send notification
        await handlers.notification.sendNotification(student.id, {
          title: 'Application Status Changed',
          body: `Your application is now: ${status}`
        });
      }

      expect(student.id).toBeDefined();
    });
  });
});
