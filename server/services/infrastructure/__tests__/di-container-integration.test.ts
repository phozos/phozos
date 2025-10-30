import { describe, it, expect, beforeEach } from 'vitest';
import { container, TYPES } from '../../container';
import { WebSocketService } from '../websocket';
import { WebSocketEventHandlers } from '../websocket-handlers';
import { createServer } from 'http';

/**
 * Phase 5.4 DI Container Integration Tests
 * Verifies WebSocket services are properly registered and accessible via DI container
 */
describe('WebSocket DI Container Integration (Phase 5.4)', () => {
  let httpServer: any;
  let wsService: WebSocketService;
  let wsHandlers: WebSocketEventHandlers;

  beforeEach(() => {
    // Simulate what happens in routes/index.ts
    httpServer = createServer();
    wsService = new WebSocketService(httpServer);
    wsHandlers = new WebSocketEventHandlers(wsService);
    
    // Bind to DI container
    container.bind(TYPES.WebSocketService, wsService);
    container.bind(TYPES.WebSocketEventHandlers, wsHandlers);
  });

  describe('TYPES Registration', () => {
    it('should have WebSocketService token in TYPES', () => {
      expect(TYPES.WebSocketService).toBeDefined();
      expect(typeof TYPES.WebSocketService).toBe('symbol');
      expect(TYPES.WebSocketService.toString()).toBe('Symbol(WebSocketService)');
    });

    it('should have WebSocketEventHandlers token in TYPES', () => {
      expect(TYPES.WebSocketEventHandlers).toBeDefined();
      expect(typeof TYPES.WebSocketEventHandlers).toBe('symbol');
      expect(TYPES.WebSocketEventHandlers.toString()).toBe('Symbol(WebSocketEventHandlers)');
    });
  });

  describe('Container Binding', () => {
    it('should retrieve WebSocketService from container', () => {
      const retrieved = container.get<WebSocketService>(TYPES.WebSocketService);
      
      expect(retrieved).toBeDefined();
      expect(retrieved).toBeInstanceOf(WebSocketService);
      expect(retrieved).toBe(wsService); // Same instance
    });

    it('should retrieve WebSocketEventHandlers from container', () => {
      const retrieved = container.get<WebSocketEventHandlers>(TYPES.WebSocketEventHandlers);
      
      expect(retrieved).toBeDefined();
      expect(retrieved).toBeInstanceOf(WebSocketEventHandlers);
      expect(retrieved).toBe(wsHandlers); // Same instance
    });

    it('should maintain singleton pattern - same instance on multiple gets', () => {
      const first = container.get<WebSocketService>(TYPES.WebSocketService);
      const second = container.get<WebSocketService>(TYPES.WebSocketService);
      
      expect(first).toBe(second);
    });
  });

  describe('WebSocketService extends BaseService', () => {
    it('should extend BaseService', () => {
      const retrieved = container.get<WebSocketService>(TYPES.WebSocketService);
      
      // Check for BaseService methods
      expect(typeof retrieved['handleError']).toBe('function');
      expect(typeof retrieved['validateRequired']).toBe('function');
      expect(typeof retrieved['sanitizeUser']).toBe('function');
    });
  });

  describe('WebSocketEventHandlers Integration', () => {
    it('should have all domain handlers initialized', () => {
      const handlers = container.get<WebSocketEventHandlers>(TYPES.WebSocketEventHandlers);
      
      expect(handlers.chat).toBeDefined();
      expect(handlers.notification).toBeDefined();
      expect(handlers.applicationStatus).toBeDefined();
      expect(handlers.forum).toBeDefined();
      expect(handlers.chat.name).toBe('ChatMessageHandler');
      expect(handlers.notification.name).toBe('NotificationHandler');
      expect(handlers.applicationStatus.name).toBe('ApplicationStatusHandler');
      expect(handlers.forum.name).toBe('ForumHandler');
    });

    it('should return all handlers via getAllHandlers()', () => {
      const handlers = container.get<WebSocketEventHandlers>(TYPES.WebSocketEventHandlers);
      const allHandlers = handlers.getAllHandlers();
      
      expect(allHandlers).toHaveLength(4);
      expect(allHandlers.map(h => h.name)).toEqual([
        'ChatMessageHandler',
        'NotificationHandler',
        'ApplicationStatusHandler',
        'ForumHandler'
      ]);
    });
  });

  describe('Getter Functions Pattern', () => {
    it('should support getter function pattern for WebSocketService', () => {
      // Simulate the getter function
      const getWebSocketService = () => container.get<WebSocketService>(TYPES.WebSocketService);
      
      const service = getWebSocketService();
      expect(service).toBeDefined();
      expect(service).toBe(wsService);
    });

    it('should support getter function pattern for WebSocketEventHandlers', () => {
      // Simulate the getter function
      const getWebSocketHandlers = () => container.get<WebSocketEventHandlers>(TYPES.WebSocketEventHandlers);
      
      const handlers = getWebSocketHandlers();
      expect(handlers).toBeDefined();
      expect(handlers).toBe(wsHandlers);
    });
  });

  describe('No Global Singletons', () => {
    it('should not export global WebSocket variables', async () => {
      // Try to import from routes/index.ts
      const routesModule = await import('../../../routes/index.js');
      
      // Check that global variables don't exist
      expect(routesModule).not.toHaveProperty('globalWsService');
      expect(routesModule).not.toHaveProperty('globalWsHandlers');
      
      // Check that getter functions exist instead
      expect(routesModule).toHaveProperty('getWebSocketService');
      expect(routesModule).toHaveProperty('getWebSocketHandlers');
    });
  });
});
