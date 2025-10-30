import { describe, it, expect } from 'vitest';
import {
  sanitizeLogData,
  sanitizeHeaders,
  maskEmail,
  hashSessionId,
  sanitizeBody
} from '../logger-sanitizers';

describe('Logger Sanitization Utilities', () => {
  describe('sanitizeLogData', () => {
    it('should redact password fields', () => {
      const data = {
        username: 'john',
        password: 'secret123',
        email: 'john@example.com'
      };

      const sanitized = sanitizeLogData(data);

      expect(sanitized.username).toBe('john');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.email).toBe('j***@example.com');
    });

    it('should redact all sensitive field types', () => {
      const data = {
        password: 'secret',
        newPassword: 'newsecret',
        oldPassword: 'oldsecret',
        currentPassword: 'current',
        token: 'token123',
        accessToken: 'access123',
        refreshToken: 'refresh123',
        apiKey: 'key123',
        secret: 'secret123',
        creditCard: '1234-5678-9012-3456',
        cardNumber: '1234567890123456',
        cvv: '123',
        ssn: '123-45-6789',
        socialSecurity: '123-45-6789'
      };

      const sanitized = sanitizeLogData(data);

      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.newPassword).toBe('[REDACTED]');
      expect(sanitized.oldPassword).toBe('[REDACTED]');
      expect(sanitized.currentPassword).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.accessToken).toBe('[REDACTED]');
      expect(sanitized.refreshToken).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.secret).toBe('[REDACTED]');
      expect(sanitized.creditCard).toBe('[REDACTED]');
      expect(sanitized.cardNumber).toBe('[REDACTED]');
      expect(sanitized.cvv).toBe('[REDACTED]');
      expect(sanitized.ssn).toBe('[REDACTED]');
      expect(sanitized.socialSecurity).toBe('[REDACTED]');
    });

    it('should handle nested objects containing sensitive fields', () => {
      const data = {
        user: {
          username: 'john',
          password: 'secret123',
          profile: {
            email: 'john@example.com',
            settings: {
              apiKey: 'key123',
              theme: 'dark'
            }
          }
        }
      };

      const sanitized = sanitizeLogData(data);

      expect(sanitized.user.username).toBe('john');
      expect(sanitized.user.password).toBe('[REDACTED]');
      expect(sanitized.user.profile.email).toBe('j***@example.com');
      expect(sanitized.user.profile.settings.apiKey).toBe('[REDACTED]');
      expect(sanitized.user.profile.settings.theme).toBe('dark');
    });

    it('should handle arrays', () => {
      const data = {
        users: [
          { username: 'john', password: 'secret1', email: 'john@example.com' },
          { username: 'jane', password: 'secret2', email: 'jane@example.com' }
        ]
      };

      const sanitized = sanitizeLogData(data);

      expect(sanitized.users[0].username).toBe('john');
      expect(sanitized.users[0].password).toBe('[REDACTED]');
      expect(sanitized.users[0].email).toBe('j***@example.com');
      expect(sanitized.users[1].username).toBe('jane');
      expect(sanitized.users[1].password).toBe('[REDACTED]');
      expect(sanitized.users[1].email).toBe('j***@example.com');
    });

    it('should handle null and undefined values', () => {
      expect(sanitizeLogData(null)).toBe(null);
      expect(sanitizeLogData(undefined)).toBe(undefined);
    });

    it('should handle primitive types', () => {
      expect(sanitizeLogData('string')).toBe('string');
      expect(sanitizeLogData(123)).toBe(123);
      expect(sanitizeLogData(true)).toBe(true);
      expect(sanitizeLogData(false)).toBe(false);
    });

    it('should handle empty objects and arrays', () => {
      expect(sanitizeLogData({})).toEqual({});
      expect(sanitizeLogData([])).toEqual([]);
    });

    it('should not mutate original object', () => {
      const original = {
        username: 'john',
        password: 'secret123',
        email: 'john@example.com'
      };

      const originalCopy = { ...original };
      sanitizeLogData(original);

      expect(original).toEqual(originalCopy);
    });

    it('should handle arrays of primitives', () => {
      const data = [1, 2, 3, 'test', true];
      const sanitized = sanitizeLogData(data);

      expect(sanitized).toEqual([1, 2, 3, 'test', true]);
    });

    it('should handle deeply nested structures', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              password: 'deep-secret',
              value: 'keep-this'
            }
          }
        }
      };

      const sanitized = sanitizeLogData(data);

      expect(sanitized.level1.level2.level3.password).toBe('[REDACTED]');
      expect(sanitized.level1.level2.level3.value).toBe('keep-this');
    });
  });

  describe('maskEmail', () => {
    it('should mask valid email to format j***@example.com', () => {
      expect(maskEmail('john@example.com')).toBe('j***@example.com');
    });

    it('should mask email with dots in username', () => {
      expect(maskEmail('john.doe@example.com')).toBe('j***@example.com');
    });

    it('should mask email with numbers', () => {
      expect(maskEmail('user123@example.com')).toBe('u***@example.com');
    });

    it('should handle single character username', () => {
      expect(maskEmail('a@example.com')).toBe('a***@example.com');
    });

    it('should handle invalid email gracefully', () => {
      expect(maskEmail('not-an-email')).toBe('not-an-email');
      expect(maskEmail('missing-at-sign.com')).toBe('missing-at-sign.com');
      expect(maskEmail('@example.com')).toBe('@example.com');
    });

    it('should handle null and undefined gracefully', () => {
      expect(maskEmail(null as any)).toBe(null);
      expect(maskEmail(undefined as any)).toBe(undefined);
      expect(maskEmail('')).toBe('');
    });

    it('should handle non-string input gracefully', () => {
      expect(maskEmail(123 as any)).toBe(123);
      expect(maskEmail({} as any)).toEqual({});
    });

    it('should mask emails with subdomains', () => {
      expect(maskEmail('user@mail.example.com')).toBe('u***@mail.example.com');
    });

    it('should mask emails with plus addressing', () => {
      expect(maskEmail('user+tag@example.com')).toBe('u***@example.com');
    });

    it('should mask long usernames', () => {
      expect(maskEmail('verylongusername@example.com')).toBe('v***@example.com');
    });
  });

  describe('sanitizeHeaders', () => {
    it('should redact Authorization header to "Bearer [REDACTED]"', () => {
      const headers = {
        authorization: 'Bearer token123',
        'content-type': 'application/json'
      };

      const sanitized = sanitizeHeaders(headers);

      expect(sanitized.authorization).toBe('Bearer [REDACTED]');
      expect(sanitized['content-type']).toBe('application/json');
    });

    it('should redact Authorization header with capital A', () => {
      const headers = {
        Authorization: 'Bearer token123',
        Accept: 'application/json'
      };

      const sanitized = sanitizeHeaders(headers);

      expect(sanitized.Authorization).toBe('Bearer [REDACTED]');
      expect(sanitized.Accept).toBe('application/json');
    });

    it('should redact non-Bearer authorization schemes', () => {
      const headers = {
        authorization: 'Basic dXNlcjpwYXNz',
        'content-type': 'application/json'
      };

      const sanitized = sanitizeHeaders(headers);

      expect(sanitized.authorization).toBe('[REDACTED]');
    });

    it('should redact Cookie header', () => {
      const headers = {
        cookie: 'sessionId=abc123; userId=xyz789',
        'user-agent': 'Mozilla/5.0'
      };

      const sanitized = sanitizeHeaders(headers);

      expect(sanitized.cookie).toBe('[REDACTED]');
      expect(sanitized['user-agent']).toBe('Mozilla/5.0');
    });

    it('should redact Cookie header with capital C', () => {
      const headers = {
        Cookie: 'sessionId=abc123',
        Host: 'example.com'
      };

      const sanitized = sanitizeHeaders(headers);

      expect(sanitized.Cookie).toBe('[REDACTED]');
      expect(sanitized.Host).toBe('example.com');
    });

    it('should redact x-api-key header', () => {
      const headers = {
        'x-api-key': 'secret-api-key-123',
        'content-type': 'application/json'
      };

      const sanitized = sanitizeHeaders(headers);

      expect(sanitized['x-api-key']).toBe('[REDACTED]');
    });

    it('should keep normal headers unchanged', () => {
      const headers = {
        'content-type': 'application/json',
        'user-agent': 'Mozilla/5.0',
        'accept': 'application/json',
        'host': 'example.com'
      };

      const sanitized = sanitizeHeaders(headers);

      expect(sanitized).toEqual(headers);
    });

    it('should handle null and undefined headers', () => {
      expect(sanitizeHeaders(null)).toBe(null);
      expect(sanitizeHeaders(undefined)).toBe(undefined);
    });

    it('should handle non-object headers', () => {
      expect(sanitizeHeaders('not-an-object' as any)).toBe('not-an-object');
      expect(sanitizeHeaders(123 as any)).toBe(123);
    });

    it('should handle empty headers object', () => {
      expect(sanitizeHeaders({})).toEqual({});
    });

    it('should not mutate original headers object', () => {
      const original = {
        authorization: 'Bearer token123',
        'content-type': 'application/json'
      };

      const originalCopy = { ...original };
      sanitizeHeaders(original);

      expect(original).toEqual(originalCopy);
    });

    it('should handle multiple sensitive headers at once', () => {
      const headers = {
        authorization: 'Bearer token123',
        cookie: 'sessionId=abc',
        'x-api-key': 'key123',
        'content-type': 'application/json'
      };

      const sanitized = sanitizeHeaders(headers);

      expect(sanitized.authorization).toBe('Bearer [REDACTED]');
      expect(sanitized.cookie).toBe('[REDACTED]');
      expect(sanitized['x-api-key']).toBe('[REDACTED]');
      expect(sanitized['content-type']).toBe('application/json');
    });
  });

  describe('hashSessionId', () => {
    it('should return consistent SHA256 hash', () => {
      const sessionId = 'test-session-123';
      const hash1 = hashSessionId(sessionId);
      const hash2 = hashSessionId(sessionId);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(16);
      expect(hash1).toMatch(/^[0-9a-f]{16}$/);
    });

    it('should return different hashes for different session IDs', () => {
      const hash1 = hashSessionId('session-1');
      const hash2 = hashSessionId('session-2');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = hashSessionId('');

      expect(hash).toBe('[INVALID_SESSION]');
    });

    it('should handle null and undefined gracefully', () => {
      expect(hashSessionId(null as any)).toBe('[INVALID_SESSION]');
      expect(hashSessionId(undefined as any)).toBe('[INVALID_SESSION]');
    });

    it('should handle non-string input', () => {
      expect(hashSessionId(123 as any)).toBe('[INVALID_SESSION]');
      expect(hashSessionId({} as any)).toBe('[INVALID_SESSION]');
    });

    it('should handle long session IDs', () => {
      const longSessionId = 'a'.repeat(1000);
      const hash = hashSessionId(longSessionId);

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(16);
    });

    it('should handle special characters', () => {
      const sessionId = 'session-!@#$%^&*()';
      const hash = hashSessionId(sessionId);

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(16);
      expect(hash).toMatch(/^[0-9a-f]{16}$/);
    });

    it('should handle unicode characters', () => {
      const sessionId = '用户-会话-123';
      const hash = hashSessionId(sessionId);

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(16);
      expect(hash).toMatch(/^[0-9a-f]{16}$/);
    });

    it('should return first 16 characters of SHA256 hash', () => {
      const sessionId = 'test-session';
      const hash = hashSessionId(sessionId);

      expect(hash).toHaveLength(16);
      
      const crypto = require('crypto');
      const fullHash = crypto.createHash('sha256').update(sessionId).digest('hex');
      expect(hash).toBe(fullHash.substring(0, 16));
    });
  });

  describe('sanitizeBody', () => {
    it('should redact password/token fields from request body', () => {
      const body = {
        username: 'john',
        password: 'secret123',
        email: 'john@example.com',
        token: 'abc123'
      };

      const sanitized = sanitizeBody(body);

      expect(sanitized.username).toBe('john');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.email).toBe('j***@example.com');
      expect(sanitized.token).toBe('[REDACTED]');
    });

    it('should handle nested body data', () => {
      const body = {
        user: {
          credentials: {
            password: 'secret',
            token: 'abc123'
          },
          profile: {
            name: 'John Doe'
          }
        }
      };

      const sanitized = sanitizeBody(body);

      expect(sanitized.user.credentials.password).toBe('[REDACTED]');
      expect(sanitized.user.credentials.token).toBe('[REDACTED]');
      expect(sanitized.user.profile.name).toBe('John Doe');
    });

    it('should handle arrays in body', () => {
      const body = {
        users: [
          { username: 'user1', password: 'pass1' },
          { username: 'user2', password: 'pass2' }
        ]
      };

      const sanitized = sanitizeBody(body);

      expect(sanitized.users[0].password).toBe('[REDACTED]');
      expect(sanitized.users[1].password).toBe('[REDACTED]');
    });

    it('should handle null and undefined body', () => {
      expect(sanitizeBody(null)).toBe(null);
      expect(sanitizeBody(undefined)).toBe(undefined);
    });

    it('should handle empty body', () => {
      expect(sanitizeBody({})).toEqual({});
    });
  });

  describe('Integration scenarios', () => {
    it('should sanitize complete request object', () => {
      const request = {
        headers: {
          authorization: 'Bearer token123',
          'content-type': 'application/json',
          cookie: 'sessionId=abc'
        },
        body: {
          username: 'john',
          password: 'secret123',
          email: 'john@example.com'
        },
        session: {
          id: 'session-123'
        }
      };

      const sanitized = {
        headers: sanitizeHeaders(request.headers),
        body: sanitizeBody(request.body),
        sessionHash: hashSessionId(request.session.id)
      };

      expect(sanitized.headers.authorization).toBe('Bearer [REDACTED]');
      expect(sanitized.headers.cookie).toBe('[REDACTED]');
      expect(sanitized.body.password).toBe('[REDACTED]');
      expect(sanitized.body.email).toBe('j***@example.com');
      expect(sanitized.sessionHash).toHaveLength(16);
    });

    it('should handle error logging scenario', () => {
      const errorData = {
        message: 'Authentication failed',
        user: {
          email: 'user@example.com',
          password: 'wrong-password'
        },
        request: {
          headers: {
            authorization: 'Bearer invalid-token'
          }
        }
      };

      const sanitized = {
        message: errorData.message,
        user: sanitizeLogData(errorData.user),
        request: {
          headers: sanitizeHeaders(errorData.request.headers)
        }
      };

      expect(sanitized.message).toBe('Authentication failed');
      expect(sanitized.user.email).toBe('u***@example.com');
      expect(sanitized.user.password).toBe('[REDACTED]');
      expect(sanitized.request.headers.authorization).toBe('Bearer [REDACTED]');
    });
  });
});
