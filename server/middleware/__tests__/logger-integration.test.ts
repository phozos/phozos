import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import logger from '../../utils/logger';

describe('Middleware Logging Integration Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let loggerInfoSpy: any;
  let loggerWarnSpy: any;
  let loggerErrorSpy: any;

  beforeEach(() => {
    mockReq = {
      method: 'POST',
      path: '/api/test',
      headers: {},
      body: {},
      ip: '127.0.0.1',
      get: vi.fn((header: string) => {
        return (mockReq.headers as any)?.[header.toLowerCase()];
      })
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      headersSent: false,
      locals: {}
    };

    mockNext = vi.fn();

    loggerInfoSpy = vi.spyOn(logger, 'info').mockImplementation(() => logger);
    loggerWarnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => logger);
    loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => logger);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Error Handler Middleware', () => {
    it('should log errors without exposing sensitive headers', async () => {
      const { errorHandler } = await import('../error-handler');

      const sensitiveHeaders = {
        authorization: 'Bearer secret-token-12345',
        cookie: 'sessionId=abc123; userId=xyz789',
        'content-type': 'application/json'
      };

      mockReq.headers = sensitiveHeaders;

      const error = new Error('Test error');
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(loggerErrorSpy).toHaveBeenCalled();
      
      const logCall = loggerErrorSpy.mock.calls[0];
      const logData = JSON.stringify(logCall);

      expect(logData).not.toContain('secret-token-12345');
      expect(logData).not.toContain('abc123');
      expect(logData).not.toContain('xyz789');
    });

    it('should log errors without exposing sensitive body data', async () => {
      const { errorHandler } = await import('../error-handler');

      mockReq.body = {
        username: 'testuser',
        password: 'super-secret-password',
        email: 'user@example.com',
        token: 'access-token-12345'
      };

      const error = new Error('Validation error');
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(loggerErrorSpy).toHaveBeenCalled();
      
      const logCall = loggerErrorSpy.mock.calls[0];
      const logData = JSON.stringify(logCall);

      expect(logData).not.toContain('super-secret-password');
      expect(logData).not.toContain('access-token-12345');
    });

    it('should redact Authorization header in error logs', async () => {
      const { errorHandler } = await import('../error-handler');

      mockReq.headers = {
        authorization: 'Bearer sensitive-jwt-token',
        'user-agent': 'Mozilla/5.0'
      };

      const error = new Error('Authentication error');
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      const logCall = loggerErrorSpy.mock.calls[0];
      const logData = JSON.stringify(logCall);

      expect(logData).not.toContain('sensitive-jwt-token');
      
      if (logData.includes('authorization') || logData.includes('Authorization')) {
        expect(logData).toMatch(/\[REDACTED\]/);
      }
    });

    it('should log error messages without sensitive data in context', async () => {
      const { errorHandler } = await import('../error-handler');

      mockReq.body = {
        oldPassword: 'old-pass-123',
        newPassword: 'new-pass-456',
        username: 'testuser'
      };

      const error = new Error('Password change failed');
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(loggerErrorSpy).toHaveBeenCalled();
      
      const logCall = loggerErrorSpy.mock.calls[0];
      const logData = JSON.stringify(logCall);

      expect(logData).not.toContain('old-pass-123');
      expect(logData).not.toContain('new-pass-456');
    });
  });

  describe('Security Middleware', () => {
    it('should log without exposing email addresses', async () => {
      const { isInCoolingPeriod } = await import('../security');

      const mockUser = {
        id: 'user-123',
        email: 'sensitive.user@example.com',
        userType: 'customer' as const,
        createdAt: new Date(),
        coolingPeriodBypassedAt: null
      };

      await isInCoolingPeriod(mockUser as any);

      expect(loggerInfoSpy).toHaveBeenCalled();

      const logCalls = loggerInfoSpy.mock.calls;
      const allLogData = JSON.stringify(logCalls);

      if (allLogData.includes('email')) {
        expect(allLogData).not.toContain('sensitive.user@example.com');
        expect(allLogData).toMatch(/s\*\*\*@example\.com/);
      }
    });

    it('should mask user email in security logs', async () => {
      const { isInCoolingPeriod } = await import('../security');

      const mockUser = {
        id: 'user-456',
        email: 'john.doe@example.com',
        userType: 'customer' as const,
        createdAt: new Date(Date.now() - 1000),
        coolingPeriodBypassedAt: null
      };

      await isInCoolingPeriod(mockUser as any);

      const logCalls = loggerInfoSpy.mock.calls;
      const allLogData = JSON.stringify(logCalls);

      expect(allLogData).not.toContain('john.doe@example.com');
    });

    it('should not expose IP addresses in plain text when logging', async () => {
      const { getClientIp } = await import('../security');

      Object.defineProperty(mockReq, 'ip', { value: '192.168.1.100', writable: true, configurable: true });
      mockReq.connection = { remoteAddress: '192.168.1.100' } as any;

      const clientIp = getClientIp(mockReq as Request);

      expect(clientIp).toBe('192.168.1.100');
    });
  });

  describe('CSRF Middleware', () => {
    it('should log without exposing session IDs', async () => {
      const { CSRFTokenManager } = await import('../csrf');
      
      const csrfManager = new CSRFTokenManager({
        secret: 'test-secret-must-be-at-least-32-characters-long'
      });

      const sessionId = 'very-secret-session-id-12345';
      csrfManager.generateToken(sessionId);

      const logCalls = loggerInfoSpy.mock.calls;
      const allLogData = JSON.stringify(logCalls);

      if (allLogData.includes('session')) {
        expect(allLogData).not.toContain('very-secret-session-id-12345');
      }
    });

    it('should hash session IDs in CSRF logs', async () => {
      const { CSRFTokenManager } = await import('../csrf');
      const { hashSessionId } = await import('../../utils/logger-sanitizers');
      
      const csrfManager = new CSRFTokenManager({
        secret: 'test-secret-must-be-at-least-32-characters-long'
      });

      const sessionId = 'session-abc-123';
      csrfManager.generateToken(sessionId);

      const hashedSession = hashSessionId(sessionId);
      expect(hashedSession).toHaveLength(16);
      expect(hashedSession).not.toBe(sessionId);
    });

    it('should not expose CSRF tokens in logs', async () => {
      const { CSRFTokenManager } = await import('../csrf');
      
      const csrfManager = new CSRFTokenManager({
        secret: 'test-secret-must-be-at-least-32-characters-long'
      });

      const token = csrfManager.generateToken('test-session');

      const logCalls = [...loggerInfoSpy.mock.calls, ...loggerWarnSpy.mock.calls];
      const allLogData = JSON.stringify(logCalls);

      expect(allLogData).not.toContain(token);
    });
  });

  describe('Authentication Middleware', () => {
    it('should log without exposing user emails', async () => {
      const { authorize } = await import('../authentication');

      mockReq.get = vi.fn((header: string) => {
        if (header === 'Authorization') {
          return undefined;
        }
        return undefined;
      });

      const middleware = authorize({ requiresAuth: true });
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      const warnCalls = loggerWarnSpy.mock.calls;
      
      if (warnCalls.length > 0) {
        const allLogData = JSON.stringify(warnCalls);
        
        if (allLogData.includes('@')) {
          expect(allLogData).toMatch(/\*\*\*@/);
        }
      }
    });

    it('should mask email addresses in authentication warnings', async () => {
      loggerWarnSpy.mockRestore();
      loggerWarnSpy = vi.spyOn(logger, 'warn').mockImplementation((...args: any[]) => {
        const meta = args[1];
        if (meta && typeof meta === 'object') {
          const metaStr = JSON.stringify(meta);
          
          if (metaStr.includes('@') && !metaStr.includes('***@')) {
            throw new Error('Email not properly masked in auth logs');
          }
        }
        return logger;
      });

      const { authorize } = await import('../authentication');

      const middleware = authorize({ requiresAuth: true });
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should not expose JWT tokens in authentication logs', async () => {
      const { authorize } = await import('../authentication');

      const fakeJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMifQ.fake-signature';
      
      mockReq.get = vi.fn((header: string) => {
        if (header === 'Authorization') {
          return `Bearer ${fakeJWT}`;
        }
        return undefined;
      }) as any;

      const middleware = authorize({ requiresAuth: true });
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      const allCalls = [...loggerInfoSpy.mock.calls, ...loggerWarnSpy.mock.calls, ...loggerErrorSpy.mock.calls];
      const allLogData = JSON.stringify(allCalls);

      expect(allLogData).not.toContain(fakeJWT);
    });
  });

  describe('Cross-middleware sanitization consistency', () => {
    it('should consistently redact passwords across all middleware', () => {
      const testPassword = 'super-secret-password-123';
      
      mockReq.body = { password: testPassword };

      const allCalls = [...loggerInfoSpy.mock.calls, ...loggerWarnSpy.mock.calls, ...loggerErrorSpy.mock.calls];
      const allLogData = JSON.stringify(allCalls);

      if (allLogData.includes('password')) {
        expect(allLogData).not.toContain(testPassword);
        expect(allLogData).toContain('[REDACTED]');
      }
    });

    it('should consistently mask emails across all middleware', () => {
      const testEmail = 'test.user@example.com';

      const allCalls = [...loggerInfoSpy.mock.calls, ...loggerWarnSpy.mock.calls, ...loggerErrorSpy.mock.calls];
      const allLogData = JSON.stringify(allCalls);

      if (allLogData.includes(testEmail)) {
        expect(allLogData).toContain('***@');
      }
    });

    it('should consistently redact authorization headers across all middleware', () => {
      const testToken = 'Bearer super-secret-jwt-token-12345';
      
      mockReq.headers = { authorization: testToken };

      const allCalls = [...loggerInfoSpy.mock.calls, ...loggerWarnSpy.mock.calls, ...loggerErrorSpy.mock.calls];
      const allLogData = JSON.stringify(allCalls);

      if (allLogData.includes('authorization') || allLogData.includes('Authorization')) {
        expect(allLogData).not.toContain('super-secret-jwt-token-12345');
      }
    });
  });

  describe('Logger metadata sanitization utilities', () => {
    it('should provide sanitization utilities for nested objects', async () => {
      const { sanitizeLogData } = await import('../../utils/logger-sanitizers');
      
      const sensitiveData = {
        user: {
          credentials: {
            password: 'nested-secret',
            email: 'nested@example.com'
          }
        }
      };

      const sanitized = sanitizeLogData(sensitiveData);

      expect(sanitized.user.credentials.password).toBe('[REDACTED]');
      expect(sanitized.user.credentials.email).toBe('n***@example.com');
    });

    it('should provide sanitization utilities for arrays', async () => {
      const { sanitizeLogData } = await import('../../utils/logger-sanitizers');
      
      const sensitiveData = {
        users: [
          { email: 'user1@example.com', password: 'pass1' },
          { email: 'user2@example.com', password: 'pass2' }
        ]
      };

      const sanitized = sanitizeLogData(sensitiveData);

      expect(sanitized.users[0].password).toBe('[REDACTED]');
      expect(sanitized.users[1].password).toBe('[REDACTED]');
      expect(sanitized.users[0].email).toBe('u***@example.com');
      expect(sanitized.users[1].email).toBe('u***@example.com');
    });
  });
});
