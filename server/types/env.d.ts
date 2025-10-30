/**
 * TypeScript Environment Variable Declarations
 * 
 * This file provides comprehensive type definitions for environment variables:
 * 1. ProcessEnv interface - raw environment variable types (strings)
 * 2. ENV interface - transformed/validated types matching the Zod schema
 * 3. Config type exports - for IDE autocomplete with validated config
 * 
 * NOTE: Prefer using the centralized config module (server/config/index.ts)
 * instead of accessing process.env directly for type safety and validation.
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // ========================================
      // Application Configuration
      // ========================================
      
      /**
       * Application environment mode
       * @default 'development'
       */
      NODE_ENV: 'development' | 'production' | 'test';
      
      /**
       * HTTP server port
       * @default '5000'
       */
      PORT?: string;

      // ========================================
      // Database Configuration
      // ========================================
      
      /**
       * PostgreSQL connection string (required)
       * @example 'postgresql://user:password@localhost:5432/dbname'
       */
      DATABASE_URL: string;

      // ========================================
      // Security Secrets
      // ========================================
      
      /**
       * Secret key for JWT token signing (minimum 64 characters)
       * @required
       */
      JWT_SECRET: string;
      
      /**
       * Secret key for CSRF token generation (minimum 32 characters)
       * @required
       */
      CSRF_SECRET: string;
      
      /**
       * Enable detailed CSRF metrics logging
       * Accepts: 'true', '1', 'yes' for true; 'false', '0', 'no' for false
       * @default 'false'
       */
      CSRF_METRICS_ENABLED?: string;
      
      /**
       * Configure proxy trust level for secure IP detection
       * - 'false' or '0': Don't trust any proxy
       * - 'true' or '1': Trust first proxy (AWS, Heroku, etc.)
       * - number: Trust N proxies
       * @default '1'
       */
      TRUST_PROXY?: string;

      // ========================================
      // Email Configuration
      // ========================================
      
      /**
       * SendGrid API key for email delivery
       * @optional
       */
      SENDGRID_API_KEY?: string;

      // ========================================
      // Admin Configuration
      // ========================================
      
      /**
       * Default admin account password
       * @optional
       */
      ADMIN_PASSWORD?: string;
      
      /**
       * Comma-separated list of admin IP addresses
       * @example '127.0.0.1,192.168.1.1'
       * @optional
       */
      ADMIN_IPS?: string;

      // ========================================
      // Feature Flags
      // ========================================
      
      /**
       * Enable SEO meta tags middleware
       * @default 'false'
       */
      SEO_META_ENABLED?: string;
      
      /**
       * Force HTTPS redirect in production
       * @default 'false'
       */
      FORCE_HTTPS_REDIRECT?: string;
      
      /**
       * Enforce canonical URL normalization
       * @default 'false'
       */
      CANONICAL_URL_ENFORCEMENT?: string;
      
      /**
       * Enable application monitoring and metrics
       * @default 'false'
       */
      MONITORING_ENABLED?: string;
      
      /**
       * Enable compliance reporting features
       * @default 'false'
       */
      COMPLIANCE_REPORT_ENABLED?: string;
      
      /**
       * Include detailed error information in responses
       * @default 'false'
       */
      ERROR_DETAILS_ENABLED?: string;

      // ========================================
      // Logging Configuration
      // ========================================
      
      /**
       * Logging verbosity level
       * @default 'info'
       */
      LOG_LEVEL?: 'error' | 'warn' | 'info' | 'debug';
      
      /**
       * Log output format
       * - 'json': Structured JSON logs (production)
       * - 'pretty': Human-readable logs (development)
       * @default 'json'
       */
      LOG_FORMAT?: 'pretty' | 'json';
      
      /**
       * Enable file-based logging
       * @default 'false'
       */
      LOG_FILE_ENABLED?: string;

      // ========================================
      // CORS Configuration
      // ========================================
      
      /**
       * Enable Cross-Origin Resource Sharing
       * @default 'false'
       */
      CORS_ENABLED?: string;
      
      /**
       * CORS preflight cache duration in seconds
       * @default '86400' (24 hours)
       */
      CORS_MAX_AGE?: string;
      
      /**
       * Comma-separated list of allowed origins
       * @example 'https://example.com,https://app.example.com'
       * @optional
       */
      ALLOWED_ORIGINS?: string;

      // ========================================
      // Cookie Configuration
      // ========================================
      
      /**
       * Enable secure flag on cookies (HTTPS only)
       * @default 'false'
       */
      COOKIE_SECURE?: string;
      
      /**
       * SameSite cookie attribute for CSRF protection
       * @default 'lax'
       */
      COOKIE_SAMESITE?: 'strict' | 'lax' | 'none';

      // ========================================
      // Build Configuration
      // ========================================
      
      /**
       * Enable Vite Hot Module Replacement
       * Auto-disabled on Replit, enabled locally by default
       * @default 'true' (false on Replit)
       */
      HMR_ENABLED?: string;
      
      /**
       * Enable image optimization in Vite build
       * @default 'false'
       */
      IMAGE_OPTIMIZATION_ENABLED?: string;
      
      /**
       * Enable Replit Cartographer plugin for better navigation
       * Auto-enabled on Replit
       * @default 'false' (true on Replit)
       */
      CARTOGRAPHER_ENABLED?: string;

      // ========================================
      // Replit-specific Variables
      // ========================================
      
      /**
       * Replit deployment ID (automatically set on Replit)
       * @readonly
       */
      REPL_ID?: string;
      
      /**
       * Replit deployment domains (automatically set on Replit)
       * @readonly
       */
      REPLIT_DOMAINS?: string;
    }
  }
}

/**
 * Validated and transformed environment configuration interface
 * 
 * This interface represents the actual runtime types after Zod validation
 * and transformation. Use this for type-safe access to config values.
 * 
 * @example
 * ```typescript
 * import config from './config';
 * 
 * // Type-safe access with proper types
 * const port: number = config.app.PORT;
 * const isSecure: boolean = config.cookies.COOKIE_SECURE;
 * const origins: string[] = config.cors.ALLOWED_ORIGINS;
 * ```
 */
export interface ENV {
  // ========================================
  // Application Configuration
  // ========================================
  readonly app: {
    /**
     * Application environment mode
     */
    readonly NODE_ENV: 'development' | 'production' | 'test';
    
    /**
     * HTTP server port (transformed to number)
     */
    readonly PORT: number;
    
    /**
     * Computed: true if NODE_ENV === 'development'
     */
    readonly isDevelopment: boolean;
    
    /**
     * Computed: true if NODE_ENV === 'production'
     */
    readonly isProduction: boolean;
    
    /**
     * Computed: true if NODE_ENV === 'test'
     */
    readonly isTest: boolean;
  };

  // ========================================
  // Database Configuration
  // ========================================
  readonly database: {
    /**
     * PostgreSQL connection string
     */
    readonly DATABASE_URL: string;
  };

  // ========================================
  // Security Configuration
  // ========================================
  readonly security: {
    /**
     * JWT token signing secret
     */
    readonly JWT_SECRET: string;
    
    /**
     * CSRF token generation secret
     */
    readonly CSRF_SECRET: string;
    
    /**
     * CSRF metrics enabled (transformed to boolean)
     */
    readonly CSRF_METRICS_ENABLED: boolean;
    
    /**
     * Proxy trust configuration (transformed to false | number)
     */
    readonly TRUST_PROXY: false | number;
  };

  // ========================================
  // Email Configuration
  // ========================================
  readonly email: {
    /**
     * SendGrid API key (optional)
     */
    readonly SENDGRID_API_KEY?: string;
  };

  // ========================================
  // Admin Configuration
  // ========================================
  readonly admin: {
    /**
     * Admin password (optional)
     */
    readonly ADMIN_PASSWORD?: string;
    
    /**
     * Admin IP whitelist (transformed to string array)
     */
    readonly ADMIN_IPS: readonly string[];
  };

  // ========================================
  // Feature Flags
  // ========================================
  readonly features: {
    /**
     * SEO meta tags enabled (transformed to boolean)
     */
    readonly SEO_META_ENABLED: boolean;
    
    /**
     * Force HTTPS redirect (transformed to boolean)
     */
    readonly FORCE_HTTPS_REDIRECT: boolean;
    
    /**
     * Canonical URL enforcement (transformed to boolean)
     */
    readonly CANONICAL_URL_ENFORCEMENT: boolean;
    
    /**
     * Monitoring enabled (transformed to boolean)
     */
    readonly MONITORING_ENABLED: boolean;
    
    /**
     * Compliance reporting enabled (transformed to boolean)
     */
    readonly COMPLIANCE_REPORT_ENABLED: boolean;
    
    /**
     * Detailed error info enabled (transformed to boolean)
     */
    readonly ERROR_DETAILS_ENABLED: boolean;
  };

  // ========================================
  // Logging Configuration
  // ========================================
  readonly logging: {
    /**
     * Log verbosity level
     */
    readonly LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
    
    /**
     * Log output format
     */
    readonly LOG_FORMAT: 'pretty' | 'json';
    
    /**
     * File logging enabled (transformed to boolean)
     */
    readonly LOG_FILE_ENABLED: boolean;
  };

  // ========================================
  // CORS Configuration
  // ========================================
  readonly cors: {
    /**
     * CORS enabled (transformed to boolean)
     */
    readonly CORS_ENABLED: boolean;
    
    /**
     * CORS preflight cache duration in seconds (transformed to number)
     */
    readonly CORS_MAX_AGE: number;
    
    /**
     * Allowed origins list (transformed to string array)
     */
    readonly ALLOWED_ORIGINS: readonly string[];
  };

  // ========================================
  // Cookie Configuration
  // ========================================
  readonly cookies: {
    /**
     * Secure cookie flag (transformed to boolean)
     */
    readonly COOKIE_SECURE: boolean;
    
    /**
     * SameSite cookie attribute
     */
    readonly COOKIE_SAMESITE: 'strict' | 'lax' | 'none';
  };

  // ========================================
  // Build Configuration
  // ========================================
  readonly build: {
    /**
     * HMR enabled (transformed to boolean)
     */
    readonly HMR_ENABLED: boolean;
    
    /**
     * Image optimization enabled (transformed to boolean)
     */
    readonly IMAGE_OPTIMIZATION_ENABLED: boolean;
    
    /**
     * Cartographer enabled (transformed to boolean)
     */
    readonly CARTOGRAPHER_ENABLED: boolean;
  };
}

/**
 * Type exports for individual configuration sections
 * Import these for focused type-safe access to specific config areas
 */

/**
 * Application configuration types
 * @see ENV['app']
 */
export type AppConfig = ENV['app'];

/**
 * Database configuration types
 * @see ENV['database']
 */
export type DatabaseConfig = ENV['database'];

/**
 * Security configuration types
 * @see ENV['security']
 */
export type SecurityConfig = ENV['security'];

/**
 * Email configuration types
 * @see ENV['email']
 */
export type EmailConfig = ENV['email'];

/**
 * Admin configuration types
 * @see ENV['admin']
 */
export type AdminConfig = ENV['admin'];

/**
 * Feature flags configuration types
 * @see ENV['features']
 */
export type FeaturesConfig = ENV['features'];

/**
 * Logging configuration types
 * @see ENV['logging']
 */
export type LoggingConfig = ENV['logging'];

/**
 * CORS configuration types
 * @see ENV['cors']
 */
export type CorsConfig = ENV['cors'];

/**
 * Cookie configuration types
 * @see ENV['cookies']
 */
export type CookiesConfig = ENV['cookies'];

/**
 * Build configuration types
 * @see ENV['build']
 */
export type BuildConfig = ENV['build'];

/**
 * Complete validated configuration type
 * This matches the runtime config object from server/config/index.ts
 * 
 * @example
 * ```typescript
 * import type { Config } from './types/env';
 * import config from './config';
 * 
 * const myConfig: Config = config;
 * ```
 */
export type Config = ENV;
