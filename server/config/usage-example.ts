/**
 * Configuration Module - Usage Examples
 * 
 * This file demonstrates various ways to use the configuration module
 * in your application code.
 */

// ============================================================================
// Example 1: Basic Import and Usage
// ============================================================================

import config from './index';

console.log('App running on port:', config.app.PORT);
console.log('Environment:', config.app.NODE_ENV);
console.log('Database URL:', config.database.DATABASE_URL);

// ============================================================================
// Example 2: Importing Specific Sections
// ============================================================================

import { appConfig, databaseConfig, securityConfig } from './index';

console.log('Is development?', appConfig.isDevelopment);
console.log('JWT Secret length:', securityConfig.JWT_SECRET.length);

// ============================================================================
// Example 3: Using Helper Functions
// ============================================================================

import { isDev, isProd, isTest } from './index';

if (isDev()) {
  console.log('Running in development mode - enabling debug features');
}

if (isProd()) {
  console.log('Running in production mode - optimizing for performance');
}

// ============================================================================
// Example 4: Feature Flags
// ============================================================================

import { featuresConfig } from './index';

if (featuresConfig.SEO_META_ENABLED) {
  console.log('SEO meta tags enabled');
}

if (featuresConfig.MONITORING_ENABLED) {
  console.log('Performance monitoring enabled');
}

if (featuresConfig.ERROR_DETAILS_ENABLED) {
  console.log('Detailed error messages enabled');
}

// ============================================================================
// Example 5: CORS Configuration
// ============================================================================

import { corsConfig } from './index';

if (corsConfig.CORS_ENABLED) {
  console.log('CORS enabled for origins:', corsConfig.ALLOWED_ORIGINS);
  console.log('CORS max age:', corsConfig.CORS_MAX_AGE, 'seconds');
}

// ============================================================================
// Example 6: Logging Configuration
// ============================================================================

import { loggingConfig } from './index';

console.log('Log level:', loggingConfig.LOG_LEVEL);
console.log('Log format:', loggingConfig.LOG_FORMAT);
console.log('File logging enabled:', loggingConfig.LOG_FILE_ENABLED);

// ============================================================================
// Example 7: Cookie Configuration
// ============================================================================

import { cookiesConfig } from './index';

const cookieOptions = {
  secure: cookiesConfig.COOKIE_SECURE,
  sameSite: cookiesConfig.COOKIE_SAMESITE,
  httpOnly: true,
};

console.log('Cookie options:', cookieOptions);

// ============================================================================
// Example 8: Type-Safe Configuration Access
// ============================================================================

import type { Config, AppConfig, LoggingConfig } from './index';

// All configuration is fully typed
function setupLogger(config: LoggingConfig) {
  // TypeScript knows all the available properties and their types
  const level = config.LOG_LEVEL; // 'error' | 'warn' | 'info' | 'debug'
  const format = config.LOG_FORMAT; // 'pretty' | 'json'
  
  // Your logger setup logic here
  console.log(`Logger configured: level=${level}, format=${format}`);
}

setupLogger(loggingConfig);

// ============================================================================
// Example 9: Conditional Logic Based on Environment
// ============================================================================

import { appConfig as app } from './index';

const serverOptions = {
  port: app.PORT,
  // Use different settings based on environment
  cors: app.isProduction ? { credentials: true } : { credentials: false },
  helmet: app.isProduction ? { hsts: true } : { hsts: false },
  compression: app.isProduction,
};

console.log('Server options:', serverOptions);

// ============================================================================
// Example 10: Admin Configuration
// ============================================================================

import { adminConfig } from './index';

if (adminConfig.ADMIN_IPS.length > 0) {
  console.log('Admin IPs configured:', adminConfig.ADMIN_IPS);
}

if (adminConfig.ADMIN_PASSWORD) {
  console.log('Admin password is set');
}

// ============================================================================
// Example 11: Email Configuration
// ============================================================================

import { emailConfig } from './index';

function canSendEmail(): boolean {
  return !!emailConfig.SENDGRID_API_KEY;
}

if (canSendEmail()) {
  console.log('Email service available');
} else {
  console.log('Email service not configured');
}

// ============================================================================
// Example 12: Complete Configuration Object
// ============================================================================

// Access all configuration sections through the main config object
const allConfig: Config = config;

console.log('All configuration sections:', Object.keys(allConfig));
// Output: ['app', 'database', 'security', 'email', 'admin', 'features', 'logging', 'cors', 'cookies']
