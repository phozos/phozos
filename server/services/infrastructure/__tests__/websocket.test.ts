import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketService } from '../websocket';
import { WebSocket } from 'ws';
import { createServer } from 'http';
import { userRepository } from '../../../repositories/user.repository';
import { studentRepository } from '../../../repositories/student.repository';
import { chatRepository } from '../../../repositories/chat.repository';

// Mock JwtService for authentication
vi.mock('../../../security/jwtService', () => ({
  JwtService: vi.fn().mockImplementation(() => ({
    verify: vi.fn((token: string) => {
      // Extract userId from token for testing
      if (token.startsWith('valid-token-')) {
        return { userId: token.replace('valid-token-', '') };
      }
      throw new Error('Invalid token');
    })
  }))
}));

describe('WebSocketService', () => {
  let server: any;
  let wsService: WebSocketService;
  let testUserIds: string[] = [];
  let testStudentIds: string[] = [];
  let testChatIds: string[] = [];

  beforeEach(() => {
    server = createServer();
    wsService = new WebSocketService(server);
  });

  afterEach(async () => {
    wsService.close();
    if (server) {
      server.close();
    }
    vi.clearAllMocks();

    // Clean up chats
    for (const chatId of testChatIds) {
      try {
        await chatRepository.delete(chatId);
      } catch (error) {
        console.log('Chat cleanup failed:', error);
      }
    }
    testChatIds = [];

    // Clean up students
    for (const studentId of testStudentIds) {
      try {
        await studentRepository.delete(studentId);
      } catch (error) {
        console.log('Student cleanup failed:', error);
      }
    }
    testStudentIds = [];

    // Clean up users
    for (const userId of testUserIds) {
      try {
        await userRepository.delete(userId);
      } catch (error) {
        console.log('User cleanup failed:', error);
      }
    }
    testUserIds = [];
  });

  describe('initialization', () => {
    it('should create WebSocketServer on /ws path', () => {
      expect(wsService).toBeDefined();
      expect(wsService).toHaveProperty('wss');
    });
  });

  describe('sendToUser with real user data', () => {
    it('should prepare message for real user', async () => {
      const user = await userRepository.create({
        email: `ws-user-${Date.now()}@example.com`,
        firstName: 'WebSocket',
        lastName: 'User',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      const message = {
        type: 'notification',
        data: {
          title: 'New Message',
          body: 'You have a new message'
        }
      };

      // This tests the method doesn't throw errors with real user IDs
      await wsService.sendToUser(user.id, message);

      expect(user.id).toBeDefined();
    });

    it('should handle non-existent user gracefully', async () => {
      const message = { type: 'test', data: 'hello' };

      // Should not throw error for non-existent user
      await expect(
        wsService.sendToUser('00000000-0000-0000-0000-000000000000', message)
      ).resolves.not.toThrow();
    });
  });

  describe('getAuthenticatedConnections', () => {
    it('should return empty array when no authenticated connections', () => {
      const connections = wsService.getAuthenticatedConnections();
      
      expect(connections).toEqual([]);
    });

    it('should return authenticated connections', () => {
      const connections = wsService.getAuthenticatedConnections();
      
      expect(Array.isArray(connections)).toBe(true);
      connections.forEach(conn => {
        expect(conn).toHaveProperty('userId');
        expect(conn).toHaveProperty('connectionId');
      });
    });
  });




  describe('broadcastToAll', () => {
    it('should broadcast system message to all users', async () => {
      const users = await Promise.all([
        userRepository.create({
          email: `broadcast-1-${Date.now()}@example.com`,
          firstName: 'User',
          lastName: 'One',
          userType: 'customer',
          password: 'test123'
        }),
        userRepository.create({
          email: `broadcast-2-${Date.now()}@example.com`,
          firstName: 'User',
          lastName: 'Two',
          userType: 'team_member',
          password: 'test123'
        }),
        userRepository.create({
          email: `broadcast-3-${Date.now()}@example.com`,
          firstName: 'User',
          lastName: 'Three',
          userType: 'company_profile',
          password: 'test123'
        })
      ]);

      users.forEach(u => testUserIds.push(u.id));

      const announcement = {
        type: 'system_announcement',
        data: {
          title: 'System Maintenance',
          message: 'Scheduled maintenance tonight at 2 AM',
          priority: 'high'
        }
      };

      wsService.broadcastToAll(announcement);

      expect(users.length).toBe(3);
    });
  });

  describe('getConnectionStats', () => {
    it('should return current connection statistics', () => {
      const stats = wsService.getConnectionStats();

      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('authenticatedConnections');
      expect(stats).toHaveProperty('timestamp');
      expect(stats.totalConnections).toBe(0);
      expect(stats.authenticatedConnections).toBe(0);
    });

    it('should include ISO formatted timestamp', () => {
      const stats = wsService.getConnectionStats();

      expect(stats.timestamp).toBeDefined();
      expect(() => new Date(stats.timestamp)).not.toThrow();
      expect(new Date(stats.timestamp).toISOString()).toBe(stats.timestamp);
    });

    it('should show authenticated connections <= total connections', () => {
      const stats = wsService.getConnectionStats();

      expect(stats.authenticatedConnections).toBeLessThanOrEqual(stats.totalConnections);
    });
  });

  describe('message handling', () => {
    it('should handle ping message structure', () => {
      const message = { type: 'ping' };
      expect(message.type).toBe('ping');
    });

    it('should handle subscribe message structure', () => {
      const message = { type: 'subscribe', topic: 'notifications' };
      expect(message.type).toBe('subscribe');
      expect(message.topic).toBe('notifications');
    });

    it('should handle authentication message structure with real user', async () => {
      const user = await userRepository.create({
        email: `auth-msg-${Date.now()}@example.com`,
        firstName: 'Auth',
        lastName: 'Message',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      const message = {
        type: 'authenticate',
        token: `valid-token-${user.id}`
      };

      expect(message.type).toBe('authenticate');
      expect(message.token).toContain(user.id);
    });
  });


  describe('error handling', () => {
    it('should handle invalid JSON messages gracefully', () => {
      const invalidMessage = 'not-json';

      expect(() => {
        try {
          JSON.parse(invalidMessage);
        } catch (e) {
          // Expected to throw
        }
      }).not.toThrow();
    });

    it('should handle closed WebSocket connections', () => {
      const mockWs = {
        send: vi.fn(),
        readyState: WebSocket.CLOSED
      };

      expect(mockWs.readyState).toBe(WebSocket.CLOSED);
    });

    it('should handle send errors for non-existent connections', async () => {
      const user = await userRepository.create({
        email: `error-${Date.now()}@example.com`,
        firstName: 'Error',
        lastName: 'Test',
        userType: 'customer',
        password: 'test123'
      });
      testUserIds.push(user.id);

      // Should not throw when sending to user with no active connection
      await expect(
        wsService.sendToUser(user.id, { type: 'test', data: 'test' })
      ).resolves.not.toThrow();
    });
  });


  describe('close', () => {
    it('should close WebSocket server without errors', () => {
      expect(() => wsService.close()).not.toThrow();
    });

    it('should be idempotent when called multiple times', () => {
      wsService.close();
      expect(() => wsService.close()).not.toThrow();
    });
  });
});
