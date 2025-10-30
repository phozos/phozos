import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChatService } from '../chat.service';
import { chatRepository } from '../../../repositories/chat.repository';
import { studentRepository } from '../../../repositories/student.repository';
import { userRepository } from '../../../repositories/user.repository';

describe('ChatService', () => {
  let chatService: ChatService;
  let testStudentUserId: string;
  let testCounselorUserId: string;
  let testStudentId: string;
  let testMessageIds: string[] = [];

  beforeEach(async () => {
    chatService = new ChatService();

    const studentUser = await userRepository.create({
      email: `chat-svc-student-${Date.now()}@example.com`,
      password: 'hashedPassword123',
      userType: 'customer',
      firstName: 'Chat',
      lastName: 'Student'
    });
    testStudentUserId = studentUser.id;

    const student = await studentRepository.create({
      userId: testStudentUserId
    });
    testStudentId = student.id;

    const counselorUser = await userRepository.create({
      email: `chat-svc-counselor-${Date.now()}@example.com`,
      password: 'hashedPassword123',
      userType: 'team_member',
      firstName: 'Chat',
      lastName: 'Counselor'
    });
    testCounselorUserId = counselorUser.id;
  });

  afterEach(async () => {
    for (const messageId of testMessageIds) {
      try {
        await chatRepository.delete(messageId);
      } catch (error) {
        console.log('Message cleanup failed:', error);
      }
    }
    testMessageIds = [];

    if (testStudentId) {
      try {
        await studentRepository.delete(testStudentId);
      } catch (error) {
        console.log('Student cleanup failed:', error);
      }
    }

    if (testStudentUserId) {
      try {
        await userRepository.delete(testStudentUserId);
      } catch (error) {
        console.log('Student user cleanup failed:', error);
      }
    }

    if (testCounselorUserId) {
      try {
        await userRepository.delete(testCounselorUserId);
      } catch (error) {
        console.log('Counselor cleanup failed:', error);
      }
    }
  });

  describe('getChatMessages', () => {
    it('should return messages between student and counselor', async () => {
      const message1 = await chatRepository.create({
        studentId: testStudentUserId,
        counselorId: testCounselorUserId,
        senderId: testStudentUserId,
        message: 'Hello'
      });
      testMessageIds.push(message1.id);

      const message2 = await chatRepository.create({
        studentId: testStudentUserId,
        counselorId: testCounselorUserId,
        senderId: testCounselorUserId,
        message: 'Hi'
      });
      testMessageIds.push(message2.id);

      const result = await chatService.getChatMessages(testStudentUserId, testCounselorUserId);

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.some(m => m.message === 'Hello')).toBe(true);
      expect(result.some(m => m.message === 'Hi')).toBe(true);
    });

    it('should return empty array when no messages exist', async () => {
      const nonExistentUserId = '00000000-0000-0000-0000-000000000001';
      const result = await chatService.getChatMessages(nonExistentUserId, testCounselorUserId);

      expect(result).toEqual([]);
    });
  });

  describe('createChatMessage', () => {
    it('should create a new chat message', async () => {
      const result = await chatService.createChatMessage({
        studentId: testStudentUserId,
        counselorId: testCounselorUserId,
        message: 'New message',
        senderId: testStudentUserId
      });
      testMessageIds.push(result.id);

      expect(result.id).toBeDefined();
      expect(result.studentId).toBe(testStudentUserId);
      expect(result.counselorId).toBe(testCounselorUserId);
      expect(result.message).toBe('New message');
      expect(result.senderId).toBe(testStudentUserId);
      expect(result.isRead).toBe(false);
    });

    it('should create multiple messages in sequence', async () => {
      const msg1 = await chatService.createChatMessage({
        studentId: testStudentUserId,
        counselorId: testCounselorUserId,
        message: 'First message',
        senderId: testStudentUserId
      });
      testMessageIds.push(msg1.id);

      const msg2 = await chatService.createChatMessage({
        studentId: testStudentUserId,
        counselorId: testCounselorUserId,
        message: 'Second message',
        senderId: testCounselorUserId
      });
      testMessageIds.push(msg2.id);

      expect(msg1.message).toBe('First message');
      expect(msg2.message).toBe('Second message');
      expect(msg1.id).not.toBe(msg2.id);
    });
  });

  describe('getChatMessageById', () => {
    it('should return a message by id', async () => {
      const message = await chatRepository.create({
        studentId: testStudentUserId,
        counselorId: testCounselorUserId,
        senderId: testStudentUserId,
        message: 'Test message'
      });
      testMessageIds.push(message.id);

      const result = await chatService.getChatMessageById(message.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(message.id);
      expect(result?.message).toBe('Test message');
    });

    it('should return undefined for non-existent message', async () => {
      const result = await chatService.getChatMessageById('00000000-0000-0000-0000-000000000000');

      expect(result).toBeUndefined();
    });
  });

  describe('markChatMessageAsRead', () => {
    it('should mark message as read', async () => {
      const message = await chatRepository.create({
        studentId: testStudentUserId,
        counselorId: testCounselorUserId,
        senderId: testStudentUserId,
        message: 'Unread message'
      });
      testMessageIds.push(message.id);

      expect(message.isRead).toBe(false);

      await chatService.markChatMessageAsRead(message.id, testCounselorUserId);

      const updated = await chatRepository.findById(message.id);
      expect(updated?.isRead).toBe(true);
    });

    it('should handle marking already read message', async () => {
      const message = await chatRepository.create({
        studentId: testStudentUserId,
        counselorId: testCounselorUserId,
        senderId: testStudentUserId,
        message: 'Message to mark read twice'
      });
      testMessageIds.push(message.id);

      await chatService.markChatMessageAsRead(message.id, testCounselorUserId);
      await chatService.markChatMessageAsRead(message.id, testCounselorUserId);

      const updated = await chatRepository.findById(message.id);
      expect(updated?.isRead).toBe(true);
    });
  });

  describe('getStudentAssignedCounselor', () => {
    it('should return assigned counselor id', async () => {
      await studentRepository.update(testStudentId, {
        assignedCounselorId: testCounselorUserId
      });

      const result = await chatService.getStudentAssignedCounselor(testStudentUserId);

      expect(result).toBe(testCounselorUserId);
    });

    it('should return null if no counselor assigned', async () => {
      const result = await chatService.getStudentAssignedCounselor(testStudentUserId);

      expect(result).toBeNull();
    });

    it('should return null if student not found', async () => {
      const result = await chatService.getStudentAssignedCounselor('00000000-0000-0000-0000-000000000000');

      expect(result).toBeNull();
    });
  });
});
