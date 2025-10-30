/**
 * Test Helpers for Auth Integration Tests
 */

import express, { Express } from 'express';
import { createServer } from 'http';
import cookieParser from 'cookie-parser';
import { csrfTokenProvider, csrfProtection } from '../middleware/csrf';
import { speedLimiter, addIpToRequest } from '../middleware/security';
import { checkMaintenanceMode } from '../routes';
import { registerRoutes } from '../routes';

/**
 * Create a test instance of the app for integration testing
 */
export async function createTestApp(): Promise<{ app: Express; server: any }> {
  const app = express();
  const httpServer = createServer(app);
  
  // Basic middleware setup (matching production)
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  
  // Add production middleware for realistic testing
  app.set('trust proxy', 1);
  app.use(addIpToRequest);
  app.use(speedLimiter);
  app.use(csrfTokenProvider);
  app.use(checkMaintenanceMode);
  
  // Register routes with CSRF protection
  const apiRouter = await registerRoutes(app, httpServer);
  app.use('/api', csrfProtection, apiRouter);
  
  // Start server on random port for testing
  const server = httpServer.listen(0);
  
  return { app, server };
}

/**
 * Helper to create authenticated request context
 */
export function createAuthContext(token: string) {
  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
}

/**
 * Helper to create CSRF-protected request context
 */
export async function createCSRFContext(app: Express) {
  const { default: request } = await import('supertest');
  
  // Get CSRF token
  const response = await request(app)
    .get('/api/auth/csrf-token')
    .expect(200);
    
  return {
    token: response.body.csrfToken,
    cookies: response.headers['set-cookie'],
    headers: {
      'x-csrf-token': response.body.csrfToken
    }
  };
}