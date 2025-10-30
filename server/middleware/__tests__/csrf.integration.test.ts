import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { csrfTokenProvider, csrfProtection, csrfTokenEndpoint } from '../csrf';
import { jwtService } from '../../security/jwtService';

describe('CSRF Integration Tests', () => {
  let app: Express;
  let testUserId: string;
  let testJwtToken: string;

  beforeEach(() => {
    // Setup Express app with CSRF middleware
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(csrfTokenProvider);

    // Test routes
    app.get('/api/auth/csrf-token', csrfTokenEndpoint);
    app.post('/api/test-protected', csrfProtection, (req, res) => {
      res.json({ success: true, message: 'Protected route accessed' });
    });

    // Generate test user and JWT
    testUserId = 'test-user-123';
    testJwtToken = jwtService.sign(
      { userId: testUserId, userType: 'customer' },
      { expiresIn: '1h', subject: testUserId }
    );
  });

  describe('Full Request Flow', () => {
    it('should successfully complete: Get token → Use token → Access protected route', async () => {
      // Step 1: Get CSRF token (unauthenticated)
      const tokenResponse = await request(app)
        .get('/api/auth/csrf-token')
        .expect(200);

      expect(tokenResponse.body.success).toBe(true);
      expect(tokenResponse.body.data.csrfToken).toBeDefined();

      const csrfToken = tokenResponse.body.data.csrfToken;
      const cookies = tokenResponse.headers['set-cookie'];

      // Step 2: Use token in protected request
      const protectedResponse = await request(app)
        .post('/api/test-protected')
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({ test: 'data' })
        .expect(200);

      expect(protectedResponse.body.success).toBe(true);
    });

    it('should fail with tampered token', async () => {
      // Get valid token
      const tokenResponse = await request(app)
        .get('/api/auth/csrf-token')
        .expect(200);

      const csrfToken = tokenResponse.body.data.csrfToken;
      const cookies = tokenResponse.headers['set-cookie'];

      // Tamper with token
      const [random, signature] = csrfToken.split('.');
      const tamperedToken = `${random}.${signature.substring(0, signature.length - 1)}X`;

      // Try to use tampered token
      await request(app)
        .post('/api/test-protected')
        .set('Cookie', cookies)
        .set('x-csrf-token', tamperedToken)
        .send({ test: 'data' })
        .expect(403);
    });

    it('should generate new token for authenticated user', async () => {
      // Get token with JWT (authenticated)
      const tokenResponse = await request(app)
        .get('/api/auth/csrf-token')
        .set('Authorization', `Bearer ${testJwtToken}`)
        .expect(200);

      expect(tokenResponse.body.success).toBe(true);
      expect(tokenResponse.body.data.csrfToken).toBeDefined();

      const csrfToken = tokenResponse.body.data.csrfToken;
      const cookies = tokenResponse.headers['set-cookie'];

      // Use authenticated token
      const protectedResponse = await request(app)
        .post('/api/test-protected')
        .set('Authorization', `Bearer ${testJwtToken}`)
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({ test: 'data' })
        .expect(200);

      expect(protectedResponse.body.success).toBe(true);
    });
  });

  describe('Session Binding', () => {
    it('should reject token from different user session', async () => {
      // User A gets token
      const userAJwt = jwtService.sign(
        { userId: 'user-A', userType: 'customer' },
        { expiresIn: '1h', subject: 'user-A' }
      );

      const tokenResponse = await request(app)
        .get('/api/auth/csrf-token')
        .set('Authorization', `Bearer ${userAJwt}`)
        .expect(200);

      const csrfToken = tokenResponse.body.data.csrfToken;
      const cookies = tokenResponse.headers['set-cookie'];

      // User B tries to use User A's token
      const userBJwt = jwtService.sign(
        { userId: 'user-B', userType: 'customer' },
        { expiresIn: '1h', subject: 'user-B' }
      );

      await request(app)
        .post('/api/test-protected')
        .set('Authorization', `Bearer ${userBJwt}`)
        .set('Cookie', cookies)
        .set('x-csrf-token', csrfToken)
        .send({ test: 'data' })
        .expect(403);
    });
  });

  describe('Error Cases', () => {
    it('should fail with missing CSRF token', async () => {
      await request(app)
        .post('/api/test-protected')
        .send({ test: 'data' })
        .expect(403);
    });

    it('should fail with cookie but no header', async () => {
      const tokenResponse = await request(app)
        .get('/api/auth/csrf-token')
        .expect(200);

      const cookies = tokenResponse.headers['set-cookie'];

      await request(app)
        .post('/api/test-protected')
        .set('Cookie', cookies)
        .send({ test: 'data' })
        .expect(403);
    });

    it('should fail with header but no cookie', async () => {
      const tokenResponse = await request(app)
        .get('/api/auth/csrf-token')
        .expect(200);

      const csrfToken = tokenResponse.body.data.csrfToken;

      await request(app)
        .post('/api/test-protected')
        .set('x-csrf-token', csrfToken)
        .send({ test: 'data' })
        .expect(403);
    });

    it('should fail with mismatched cookie and header', async () => {
      const tokenResponse = await request(app)
        .get('/api/auth/csrf-token')
        .expect(200);

      const csrfToken = tokenResponse.body.data.csrfToken;
      const cookies = tokenResponse.headers['set-cookie'];

      // Get different token
      const tokenResponse2 = await request(app)
        .get('/api/auth/csrf-token')
        .expect(200);

      const differentToken = tokenResponse2.body.data.csrfToken;

      await request(app)
        .post('/api/test-protected')
        .set('Cookie', cookies)
        .set('x-csrf-token', differentToken)
        .send({ test: 'data' })
        .expect(403);
    });
  });
});
