/**
 * Winston Logger Configuration
 * 
 * Provides environment-based configuration for Winston logger
 * with separate settings for development and production.
 */

import winston from 'winston';
import path from 'path';
import { loggingConfig } from '../config';

/**
 * Custom log levels with priority
 */
export const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

/**
 * Log level colors for development console
 */
export const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

/**
 * Get log level from centralized config
 */
export function getLogLevel(): string {
  return loggingConfig.LOG_LEVEL;
}

/**
 * Development format - colorized, simple, human-readable
 */
export const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message} ${
      Object.keys(info).length > 3 
        ? JSON.stringify(
            Object.fromEntries(
              Object.entries(info).filter(([key]) => !['timestamp', 'level', 'message'].includes(key))
            ),
            null,
            2
          )
        : ''
    }`
  )
);

/**
 * Production format - JSON for log aggregation systems
 */
export const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Get console transport with format from centralized config
 */
export function getConsoleTransport(): winston.transport {
  return new winston.transports.Console({
    level: getLogLevel(),
    format: loggingConfig.LOG_FORMAT === 'json' ? productionFormat : developmentFormat,
  });
}

/**
 * Get file transport for combined logs
 */
export function getCombinedFileTransport(): winston.transport {
  return new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'combined.log'),
    level: 'info',
    maxsize: 10485760, // 10MB
    maxFiles: 7, // 7 days
    tailable: true,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  });
}

/**
 * Get file transport for error logs
 */
export function getErrorFileTransport(): winston.transport {
  return new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    maxsize: 10485760, // 10MB
    maxFiles: 14, // 14 days for errors
    tailable: true,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
  });
}

/**
 * Get transports based on centralized config
 */
export function getTransports(): winston.transport[] {
  const transports: winston.transport[] = [getConsoleTransport()];

  // Add file transports if enabled in config
  if (loggingConfig.LOG_FILE_ENABLED) {
    transports.push(getCombinedFileTransport());
    transports.push(getErrorFileTransport());
  }

  return transports;
}
