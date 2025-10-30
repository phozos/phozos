/**
 * Migration Helper Utilities for Response Format Migration
 * Provides logging, validation, and monitoring for the legacy response migration
 */

import { Response } from "express";

interface MigrationLogEntry {
  endpoint: string;
  method: string;
  phase: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

class MigrationLogger {
  private logs: MigrationLogEntry[] = [];

  log(endpoint: string, method: string, phase: string, success: boolean, error?: string) {
    const entry: MigrationLogEntry = {
      endpoint,
      method,
      phase,
      timestamp: new Date().toISOString(),
      success,
      error
    };
    
    this.logs.push(entry);
    console.log(`🔄 [MIGRATION-${phase}] ${method} ${endpoint}: ${success ? '✅' : '❌'}${error ? ` - ${error}` : ''}`);
  }

  getStats() {
    const totalEndpoints = this.logs.length;
    const successfulMigrations = this.logs.filter(log => log.success).length;
    const failedMigrations = this.logs.filter(log => !log.success).length;
    
    return {
      total: totalEndpoints,
      successful: successfulMigrations,
      failed: failedMigrations,
      successRate: totalEndpoints > 0 ? (successfulMigrations / totalEndpoints) * 100 : 0
    };
  }

  getLogsByPhase(phase: string) {
    return this.logs.filter(log => log.phase === phase);
  }

  getAllLogs() {
    return [...this.logs];
  }
}

export const migrationLogger = new MigrationLogger();

/**
 * Validates that a response follows the new standardized format
 */
export function validateResponseFormat(response: any): boolean {
  try {
    if (!response || typeof response !== 'object') {
      return false;
    }

    // Check if response has required fields
    if (!('success' in response)) {
      return false;
    }

    if (response.success === true) {
      // Success response should have data and meta
      return 'data' in response && 'meta' in response;
    } else {
      // Error response should have error and meta
      return 'error' in response && 'meta' in response;
    }
  } catch (error) {
    console.error('Response validation error:', error);
    return false;
  }
}

/**
 * Validates that error response has proper structure
 */
export function validateErrorFormat(error: any): boolean {
  try {
    if (!error || typeof error !== 'object') {
      return false;
    }

    return (
      'code' in error &&
      'message' in error &&
      typeof error.code === 'string' &&
      typeof error.message === 'string'
    );
  } catch (validationError) {
    console.error('Error format validation failed:', validationError);
    return false;
  }
}

/**
 * Creates a middleware to track migration progress
 */
export function createMigrationTracker(phase: string) {
  return (req: any, res: Response, next: any) => {
    const originalJson = res.json;
    
    res.json = function(data: any) {
      const isNewFormat = validateResponseFormat(data);
      migrationLogger.log(
        req.path,
        req.method,
        phase,
        isNewFormat,
        isNewFormat ? undefined : 'Legacy format detected'
      );
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}

