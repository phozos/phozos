/**
 * Production-Ready Configuration Module
 * 
 * Provides centralized, type-safe configuration management with:
 * - Layered environment variable loading (.env, .env.local, .env.development, .env.production)
 * - Zod schema validation with comprehensive error reporting
 * - Type-safe exports with no 'any' types
 * - Helper functions for environment detection
 * - Sensible defaults and proper type coercion
 * 
 * @module config
 */

import dotenvFlow from 'dotenv-flow';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load environment variables with automatic layered configuration support via dotenv-flow
 * 
 * Loading order (later files override earlier ones):
 * 1. .env (committed defaults)
 * 2. .env.local (local overrides, gitignored)
 * 3. .env.{NODE_ENV} (environment-specific, e.g., .env.development, .env.production)
 * 4. .env.{NODE_ENV}.local (environment-specific local overrides, gitignored)
 * 
 * dotenv-flow automatically handles this layering and respects the NODE_ENV variable.
 */
dotenvFlow.config({
  path: resolve(__dirname, '../..'),
  silent: true, // Don't throw errors if files don't exist
  node_env: process.env.NODE_ENV || 'development',
});

/**
 * Helper to parse boolean environment variables
 * Accepts: 'true', '1', 'yes' as true; 'false', '0', 'no' as false
 */
const booleanSchema = z
  .string()
  .optional()
  .transform((val) => {
    if (!val) return false;
    const normalized = val.toLowerCase().trim();
    if (['true', '1', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'no'].includes(normalized)) return false;
    return false;
  });

/**
 * Helper to parse comma-separated string lists
 */
const commaSeparatedSchema = z
  .string()
  .optional()
  .transform((val) => {
    if (!val) return [];
    return val.split(',').map((item) => item.trim()).filter(Boolean);
  });

/**
 * Application configuration schema
 */
const appConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().optional().transform((val) => parseInt(val || '5000', 10)),
}).transform((data) => ({
  ...data,
  isDevelopment: data.NODE_ENV === 'development',
  isProduction: data.NODE_ENV === 'production',
  isTest: data.NODE_ENV === 'test',
}));

/**
 * Database configuration schema
 */
const databaseConfigSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
});

/**
 * Security configuration schema
 */
const securityConfigSchema = z.object({
  JWT_SECRET: z.string().min(64, 'JWT_SECRET must be at least 64 characters'),
  CSRF_SECRET: z.string().min(32, 'CSRF_SECRET must be at least 32 characters'),
  CSRF_METRICS_ENABLED: booleanSchema,
  // Trust proxy configuration for secure IP detection
  // - false: Don't trust any proxy (direct connection)
  // - 1: Trust first proxy (most common: AWS, Heroku, etc.)
  // - number: Trust N proxies
  TRUST_PROXY: z
    .string()
    .optional()
    .transform((val) => {
      if (!val || val === 'false' || val === '0') return false;
      if (val === 'true') return 1; // Convert 'true' to safe value of 1
      const num = parseInt(val, 10);
      return isNaN(num) ? 1 : num; // Default to 1 if invalid
    }),
});

/**
 * Email configuration schema
 */
const emailConfigSchema = z.object({
  SENDGRID_API_KEY: z.string().optional(),
});

/**
 * Admin configuration schema
 */
const adminConfigSchema = z.object({
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_IPS: commaSeparatedSchema,
});

/**
 * Feature flags configuration schema
 */
const featuresConfigSchema = z.object({
  SEO_META_ENABLED: booleanSchema,
  FORCE_HTTPS_REDIRECT: booleanSchema,
  CANONICAL_URL_ENFORCEMENT: booleanSchema,
  MONITORING_ENABLED: booleanSchema,
  COMPLIANCE_REPORT_ENABLED: booleanSchema,
  ERROR_DETAILS_ENABLED: booleanSchema,
});

/**
 * Logging configuration schema
 */
const loggingConfigSchema = z.object({
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['pretty', 'json']).default('json'),
  LOG_FILE_ENABLED: booleanSchema,
});

/**
 * CORS configuration schema
 */
const corsConfigSchema = z.object({
  CORS_ENABLED: booleanSchema,
  CORS_MAX_AGE: z.string().optional().transform((val) => parseInt(val || '86400', 10)),
  ALLOWED_ORIGINS: commaSeparatedSchema,
});

/**
 * Cookie configuration schema
 */
const cookiesConfigSchema = z.object({
  COOKIE_SECURE: booleanSchema,
  COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('lax'),
});

/**
 * Build configuration schema
 * Controls Vite build-time and development features
 */
const buildConfigSchema = z.object({
  // HMR should be enabled by default for good DX, disable only in prod or on Replit
  HMR_ENABLED: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return process.env.REPL_ID ? false : true; // Default true, false on Replit
      const normalized = val.toLowerCase().trim();
      if (['true', '1', 'yes'].includes(normalized)) return true;
      if (['false', '0', 'no'].includes(normalized)) return false;
      return true;
    }),
  IMAGE_OPTIMIZATION_ENABLED: booleanSchema,
  CARTOGRAPHER_ENABLED: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return process.env.REPL_ID !== undefined; // Auto-enable on Replit
      const normalized = val.toLowerCase().trim();
      if (['true', '1', 'yes'].includes(normalized)) return true;
      if (['false', '0', 'no'].includes(normalized)) return false;
      return false;
    }),
});

/**
 * Complete configuration schema combining all sections
 */
const configSchema = z.object({
  app: appConfigSchema,
  database: databaseConfigSchema,
  security: securityConfigSchema,
  email: emailConfigSchema,
  admin: adminConfigSchema,
  features: featuresConfigSchema,
  logging: loggingConfigSchema,
  cors: corsConfigSchema,
  cookies: cookiesConfigSchema,
  build: buildConfigSchema,
});

/**
 * Validate and parse configuration with comprehensive error reporting
 */
function validateConfiguration() {
  try {
    const rawConfig = {
      app: {
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
      },
      database: {
        DATABASE_URL: process.env.DATABASE_URL,
      },
      security: {
        JWT_SECRET: process.env.JWT_SECRET,
        CSRF_SECRET: process.env.CSRF_SECRET,
        CSRF_METRICS_ENABLED: process.env.CSRF_METRICS_ENABLED,
        TRUST_PROXY: process.env.TRUST_PROXY,
      },
      email: {
        SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
      },
      admin: {
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
        ADMIN_IPS: process.env.ADMIN_IPS,
      },
      features: {
        SEO_META_ENABLED: process.env.SEO_META_ENABLED,
        FORCE_HTTPS_REDIRECT: process.env.FORCE_HTTPS_REDIRECT,
        CANONICAL_URL_ENFORCEMENT: process.env.CANONICAL_URL_ENFORCEMENT,
        MONITORING_ENABLED: process.env.MONITORING_ENABLED,
        COMPLIANCE_REPORT_ENABLED: process.env.COMPLIANCE_REPORT_ENABLED,
        ERROR_DETAILS_ENABLED: process.env.ERROR_DETAILS_ENABLED,
      },
      logging: {
        LOG_LEVEL: process.env.LOG_LEVEL,
        LOG_FORMAT: process.env.LOG_FORMAT,
        LOG_FILE_ENABLED: process.env.LOG_FILE_ENABLED,
      },
      cors: {
        CORS_ENABLED: process.env.CORS_ENABLED,
        CORS_MAX_AGE: process.env.CORS_MAX_AGE,
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
      },
      cookies: {
        COOKIE_SECURE: process.env.COOKIE_SECURE,
        COOKIE_SAMESITE: process.env.COOKIE_SAMESITE,
      },
      build: {
        HMR_ENABLED: process.env.HMR_ENABLED,
        IMAGE_OPTIMIZATION_ENABLED: process.env.IMAGE_OPTIMIZATION_ENABLED,
        CARTOGRAPHER_ENABLED: process.env.CARTOGRAPHER_ENABLED,
      },
    };

    return configSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('\n❌ Configuration Validation Failed\n');
      console.error('The following environment variables are missing or invalid:\n');
      
      const errorsBySection: Record<string, string[]> = {};
      
      for (const issue of error.errors) {
        const section = issue.path[0] as string;
        const field = issue.path.slice(1).join('.');
        const message = issue.message;
        
        if (!errorsBySection[section]) {
          errorsBySection[section] = [];
        }
        
        errorsBySection[section].push(`  • ${field}: ${message}`);
      }
      
      for (const [section, errors] of Object.entries(errorsBySection)) {
        console.error(`[${section.toUpperCase()}]`);
        errors.forEach(err => console.error(err));
        console.error('');
      }
      
      console.error('Please check your .env file and ensure all required variables are set correctly.');
      console.error('Refer to .env.example for the expected format.\n');
      
      process.exit(1);
    }
    
    throw error;
  }
}

/**
 * Validated configuration object
 */
const validatedConfig = validateConfiguration();

/**
 * Type-safe configuration object
 */
export type Config = z.infer<typeof configSchema>;
export type AppConfig = z.infer<typeof appConfigSchema>;
export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;
export type SecurityConfig = z.infer<typeof securityConfigSchema>;
export type EmailConfig = z.infer<typeof emailConfigSchema>;
export type AdminConfig = z.infer<typeof adminConfigSchema>;
export type FeaturesConfig = z.infer<typeof featuresConfigSchema>;
export type LoggingConfig = z.infer<typeof loggingConfigSchema>;
export type CorsConfig = z.infer<typeof corsConfigSchema>;
export type CookiesConfig = z.infer<typeof cookiesConfigSchema>;
export type BuildConfig = z.infer<typeof buildConfigSchema>;

/**
 * Main configuration object with all sections
 */
const config: Config = validatedConfig;

/**
 * Individual configuration sections for convenience
 */
export const appConfig: AppConfig = config.app;
export const databaseConfig: DatabaseConfig = config.database;
export const securityConfig: SecurityConfig = config.security;
export const emailConfig: EmailConfig = config.email;
export const adminConfig: AdminConfig = config.admin;
export const featuresConfig: FeaturesConfig = config.features;
export const loggingConfig: LoggingConfig = config.logging;
export const corsConfig: CorsConfig = config.cors;
export const cookiesConfig: CookiesConfig = config.cookies;
export const buildConfig: BuildConfig = config.build;

/**
 * Helper function to check if running in development mode
 * @returns true if NODE_ENV is 'development'
 */
export function isDev(): boolean {
  return config.app.isDevelopment;
}

/**
 * Helper function to check if running in production mode
 * @returns true if NODE_ENV is 'production'
 */
export function isProd(): boolean {
  return config.app.isProduction;
}

/**
 * Helper function to check if running in test mode
 * @returns true if NODE_ENV is 'test'
 */
export function isTest(): boolean {
  return config.app.isTest;
}

/**
 * Default export - complete configuration object
 */
export default config;
