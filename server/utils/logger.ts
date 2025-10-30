/**
 * Winston Logger Singleton
 * 
 * Centralized logging utility for the Phozos application.
 * Provides structured logging with environment-based configuration
 * and sensitive data sanitization.
 */

import winston from 'winston';
import { levels, getTransports } from './logger-config';

/**
 * Create Winston logger instance
 */
function createLogger(): winston.Logger {
  try {
    const logger = winston.createLogger({
      levels,
      transports: getTransports(),
      // Don't exit on error
      exitOnError: false,
    });

    return logger;
  } catch (error) {
    // Fallback to console if Winston initialization fails
    console.error('Failed to initialize Winston logger, falling back to console:', error);
    
    // Create a console-only fallback logger
    return winston.createLogger({
      levels,
      transports: [new winston.transports.Console()],
      exitOnError: false,
    });
  }
}

/**
 * Singleton logger instance
 */
const logger = createLogger();

/**
 * Export logger as default
 */
export default logger;

/**
 * Export logger for named imports
 */
export { logger };
