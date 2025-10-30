import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { chatRepository } from '../chat.repository';
import { userRepository } from '../user.repository';
import { studentRepository } from '../student.repository';

describe('ChatRepository', () => {
  let testStudentId: string;
  let testCounselorId: string;
  let testStudentUserId: string;
  let testCounselorUserId: string;
  let testMessageIds: string[] = [];

  beforeEach(async () => {
    // Create test student user
    const studentUser = await userRepository.create({
      email: `chat-student-${Date.now()}@example.com`,
      password: 'hashedPassword123',
      userType: 'customer',
      firstName: 'Chat',
      lastName: 'Student'
    });
    testStudentUserId = studentUser.id;

    // Create student profile
    const student = await studentRepository.create({
      userId: testStudentUserId
    });
    testStudentId = student.id;

    // Create test counselor user
    const counselorUser = await userRepository.create({
      email: `chat-counselor-${Date.now()}@example.com`,
      password: 'hashedPassword123',
      userType: 'team_member',
      firstName: 'Chat',
      lastName: 'Counselor'
    });
    testCounselorUserId = counselorUser.id;
  });

  afterEach(async () => {
    // Cleanup messages
    for (const messageId of testMessageIds) {
      try {
        await chatRepository.delete(messageId);
      } catch (error) {
        console.log('Message cleanup failed:', error);
      }
    }
    testMessageIds = [];

    // Cleanup users
    if (testStudentUserId) {
      try {
        await studentRepository.delete(testStudentId);
        await userRepository.delete(testStudentUserId);
      } catch (error) {
        console.log('Student cleanup failed:', error);
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

  describe('create and findById', () => {
    it('should create and retrieve a chat message', async () => {
      const message = await chatRepository.create({
        studentId: testStudentUserId,
        counselorId: testCounselorUserId,
        senderId: testStudentUserId,
        message: 'Hello counselor!'
      });
      testMessageIds.push(message.id);

      expect(message.id).toBeDefined();
      expect(message.message).toBe('Hello counselor!');

      const found = await chatRepository.findById(message.id);
      expect(found).toBeDefined();
      expect(found?.message).toBe('Hello counselor!');
    });
  });

  describe('findByChatParticipants', () => {
    it('should find all messages between student and counselor', async () => {
      const msg1 = await chatRepository.create({
        studentId: testStudentUserId,
        counselorId: testCounselorUserId,
        senderId: testStudentUserId,
        message: 'First message'
      });
      testMessageIds.push(msg1.id);

      const msg2 = await chatRepository.create({
        studentId: testStudentUserId,
        counselorId: testCounselorUserId,
        senderId: testCounselorUserId,
        message: 'Second message'
      });
      testMessageIds.push(msg2.id);

      const messages = await chatRepository.findByChatParticipants(testStudentUserId, testCounselorUserId);
      expect(messages.length).toBeGreaterThanOrEqual(2);
      expect(messages[0].message).toBe('First message');
      expect(messages[1].message).toBe('Second message');
    });

    it('should return empty array for non-existent chat', async () => {
      const fakeUuid1 = '00000000-0000-0000-0000-000000000001';
      const fakeUuid2 = '00000000-0000-0000-0000-000000000002';
      const messages = await chatRepository.findByChatParticipants(fakeUuid1, fakeUuid2);
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark a message as read', async () => {
      const message = await chatRepository.create({
        studentId: testStudentUserId,
        counselorId: testCounselorUserId,
        senderId: testStudentUserId,
        message: 'Unread message'
      });
      testMessageIds.push(message.id);

      const marked = await chatRepository.markAsRead(message.id, testCounselorUserId);
      expect(marked).toBe(true);

      const updated = await chatRepository.findById(message.id);
      expect(updated?.isRead).toBe(true);
      expect(updated?.readAt).toBeDefined();
    });

    it('should return false for non-existent message', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000999';
      const marked = await chatRepository.markAsRead(fakeUuid, testCounselorUserId);
      expect(marked).toBe(false);
    });
  });

  describe('update', () => {
    it('should update a chat message', async () => {
      const message = await chatRepository.create({
        studentId: testStudentUserId,
        counselorId: testCounselorUserId,
        senderId: testStudentUserId,
        message: 'Original message'
      });
      testMessageIds.push(message.id);

      const updated = await chatRepository.update(message.id, {
        message: 'Updated message'
      });

      expect(updated).toBeDefined();
      expect(updated?.message).toBe('Updated message');
    });
  });

  describe('delete', () => {
    it('should delete a chat message', async () => {
      const message = await chatRepository.create({
        studentId: testStudentUserId,
        counselorId: testCounselorUserId,
        senderId: testStudentUserId,
        message: 'Message to delete'
      });

      const deleted = await chatRepository.delete(message.id);
      expect(deleted).toBe(true);

      const found = await chatRepository.findById(message.id);
      expect(found).toBeUndefined();
    });

    it('should return false when deleting non-existent message', async () => {
      const deleted = await chatRepository.delete('00000000-0000-0000-0000-000000000000');
      expect(deleted).toBe(false);
    });
  });
});
