/**
 * Simple Database Health Check
 * 
 * Provides a lightweight database health probe to replace complex pool monitoring.
 * This checks basic database connectivity and responsiveness.
 */

import { Request, Response } from 'express';
import { db } from '../db';
import { sendSuccess, sendError } from '../utils/response';

interface DatabaseHealth {
  connected: boolean;
  responseTime: number;
  timestamp: string;
}

/**
 * Simple database health check
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const startTime = Date.now();
  
  try {
    // Simple connectivity test
    await db.execute('SELECT 1');
    
    const responseTime = Date.now() - startTime;
    
    return {
      connected: true,
      responseTime,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error('Database health check failed:', error);
    
    return {
      connected: false,
      responseTime,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Health check endpoint for monitoring systems
 */
export async function healthCheckEndpoint(req: Request, res: Response) {
  try {
    const health = await checkDatabaseHealth();
    
    if (health.connected) {
      return sendSuccess(res, health);
    } else {
      return sendError(res, 503, 'DATABASE_UNHEALTHY', 'Database connection failed', health);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return sendError(res, 500, 'HEALTH_CHECK_ERROR', 'Health check failed', { error: errorMessage });
  }
}

/**
 * Simple monitoring data for development
 */
export async function getSimpleDatabaseStats() {
  const health = await checkDatabaseHealth();
  
  return {
    status: health.connected ? 'healthy' : 'unhealthy',
    responseTime: health.responseTime,
    lastChecked: health.timestamp,
    connectionType: 'neon-serverless',
    pooling: 'basic-pg-pool'
  };
}