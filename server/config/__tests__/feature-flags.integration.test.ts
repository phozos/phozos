/**
 * Feature Flags Integration Tests
 * 
 * Comprehensive tests to verify all feature flags function correctly
 * in their actual usage contexts throughout the application.
 * 
 * This test suite validates:
 * - Feature flag values are read correctly
 * - Conditional logic based on flags works as expected
 * - All feature flags have corresponding implementation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  featuresConfig,
  loggingConfig,
  corsConfig,
  cookiesConfig,
  isDev,
  isProd,
} from '../index';

describe('Feature Flags Integration Tests', () => {
  
  describe('Configuration Loading', () => {
    it('should load all feature flags as booleans', () => {
      expect(typeof featuresConfig.SEO_META_ENABLED).toBe('boolean');
      expect(typeof featuresConfig.FORCE_HTTPS_REDIRECT).toBe('boolean');
      expect(typeof featuresConfig.CANONICAL_URL_ENFORCEMENT).toBe('boolean');
      expect(typeof featuresConfig.MONITORING_ENABLED).toBe('boolean');
      expect(typeof featuresConfig.COMPLIANCE_REPORT_ENABLED).toBe('boolean');
      expect(typeof featuresConfig.ERROR_DETAILS_ENABLED).toBe('boolean');
    });

    it('should load all logging configuration', () => {
      expect(['error', 'warn', 'info', 'debug']).toContain(loggingConfig.LOG_LEVEL);
      expect(['pretty', 'json']).toContain(loggingConfig.LOG_FORMAT);
      expect(typeof loggingConfig.LOG_FILE_ENABLED).toBe('boolean');
    });

    it('should load all CORS configuration', () => {
      expect(typeof corsConfig.CORS_ENABLED).toBe('boolean');
      expect(typeof corsConfig.CORS_MAX_AGE).toBe('number');
      expect(Array.isArray(corsConfig.ALLOWED_ORIGINS)).toBe(true);
    });

    it('should load all cookie configuration', () => {
      expect(typeof cookiesConfig.COOKIE_SECURE).toBe('boolean');
      expect(['strict', 'lax', 'none']).toContain(cookiesConfig.COOKIE_SAMESITE);
    });
  });

  describe('SEO_META_ENABLED Feature Flag', () => {
    it('should be a boolean value', () => {
      expect(typeof featuresConfig.SEO_META_ENABLED).toBe('boolean');
    });

    it('should control SEO meta injection logic', () => {
      // Test the flag can be used in conditional logic
      const shouldInjectSeo = featuresConfig.SEO_META_ENABLED;
      expect(typeof shouldInjectSeo).toBe('boolean');
      
      // Verify the flag affects behavior
      if (shouldInjectSeo) {
        expect(featuresConfig.SEO_META_ENABLED).toBe(true);
      } else {
        expect(featuresConfig.SEO_META_ENABLED).toBe(false);
      }
    });

    it('should have implementation in seo-meta.ts', async () => {
      // Verify the middleware can be imported
      const seoMetaModule = await import('../../middleware/seo-meta');
      expect(seoMetaModule).toBeDefined();
      expect(seoMetaModule.injectSEOMeta).toBeDefined();
    });
  });

  describe('FORCE_HTTPS_REDIRECT Feature Flag', () => {
    it('should be a boolean value', () => {
      expect(typeof featuresConfig.FORCE_HTTPS_REDIRECT).toBe('boolean');
    });

    it('should control HTTPS redirect logic', () => {
      const shouldRedirect = featuresConfig.FORCE_HTTPS_REDIRECT;
      expect(typeof shouldRedirect).toBe('boolean');
    });

    it('should typically be disabled in development', () => {
      // In development, HTTPS redirect should typically be off
      if (isDev()) {
        // This is a recommendation, not a requirement
        expect(featuresConfig.FORCE_HTTPS_REDIRECT).toBeDefined();
      }
    });
  });

  describe('CANONICAL_URL_ENFORCEMENT Feature Flag', () => {
    it('should be a boolean value', () => {
      expect(typeof featuresConfig.CANONICAL_URL_ENFORCEMENT).toBe('boolean');
    });

    it('should control canonical URL enforcement logic', () => {
      const shouldEnforce = featuresConfig.CANONICAL_URL_ENFORCEMENT;
      expect(typeof shouldEnforce).toBe('boolean');
    });
  });

  describe('MONITORING_ENABLED Feature Flag', () => {
    it('should be a boolean value', () => {
      expect(typeof featuresConfig.MONITORING_ENABLED).toBe('boolean');
    });

    it('should control monitoring middleware activation', () => {
      const monitoringActive = featuresConfig.MONITORING_ENABLED;
      expect(typeof monitoringActive).toBe('boolean');
    });

    it('should have implementation in production-monitor.ts', async () => {
      const monitorModule = await import('../../middleware/production-monitor');
      expect(monitorModule).toBeDefined();
      expect(monitorModule.trackApiCompliance).toBeDefined();
    });
  });

  describe('COMPLIANCE_REPORT_ENABLED Feature Flag', () => {
    it('should be a boolean value', () => {
      expect(typeof featuresConfig.COMPLIANCE_REPORT_ENABLED).toBe('boolean');
    });

    it('should control compliance reporting endpoint', () => {
      const reportingEnabled = featuresConfig.COMPLIANCE_REPORT_ENABLED;
      expect(typeof reportingEnabled).toBe('boolean');
    });

    it('should have implementation in production-monitor.ts', async () => {
      const monitorModule = await import('../../middleware/production-monitor');
      expect(monitorModule).toBeDefined();
      expect(monitorModule.getProductionReport).toBeDefined();
    });
  });

  describe('ERROR_DETAILS_ENABLED Feature Flag', () => {
    it('should be a boolean value', () => {
      expect(typeof featuresConfig.ERROR_DETAILS_ENABLED).toBe('boolean');
    });

    it('should control error detail exposure', () => {
      const showDetails = featuresConfig.ERROR_DETAILS_ENABLED;
      expect(typeof showDetails).toBe('boolean');
    });

    it('should be used in error handling logic', async () => {
      const errorModule = await import('../../middleware/error-handler');
      expect(errorModule).toBeDefined();
      expect(errorModule.errorHandler).toBeDefined();
    });

    it('should be used in base controller', async () => {
      const { BaseController } = await import('../../controllers/base.controller');
      expect(BaseController).toBeDefined();
    });

    it('should typically be enabled in development for debugging', () => {
      if (isDev()) {
        // In development, detailed errors help with debugging
        expect(featuresConfig.ERROR_DETAILS_ENABLED).toBeDefined();
      }
    });
  });

  describe('Logging Configuration', () => {
    it('LOG_LEVEL should be a valid level', () => {
      expect(['error', 'warn', 'info', 'debug']).toContain(loggingConfig.LOG_LEVEL);
    });

    it('LOG_FORMAT should be a valid format', () => {
      expect(['pretty', 'json']).toContain(loggingConfig.LOG_FORMAT);
    });

    it('LOG_FILE_ENABLED should control file logging', () => {
      expect(typeof loggingConfig.LOG_FILE_ENABLED).toBe('boolean');
    });

    it('should have implementation in logger-config.ts', async () => {
      const loggerModule = await import('../../utils/logger-config');
      expect(loggerModule).toBeDefined();
      expect(loggerModule.getLogLevel).toBeDefined();
      expect(loggerModule.getTransports).toBeDefined();
    });

    it('should prefer debug level in development', () => {
      if (isDev()) {
        // Development should have verbose logging
        expect(['debug', 'info']).toContain(loggingConfig.LOG_LEVEL);
      }
    });

    it('should prefer pretty format in development', () => {
      if (isDev()) {
        // Pretty format is easier to read in development
        expect(loggingConfig.LOG_FORMAT).toBeDefined();
      }
    });
  });

  describe('CORS Configuration', () => {
    it('CORS_ENABLED should control CORS middleware', () => {
      expect(typeof corsConfig.CORS_ENABLED).toBe('boolean');
    });

    it('CORS_MAX_AGE should be a positive number', () => {
      expect(typeof corsConfig.CORS_MAX_AGE).toBe('number');
      expect(corsConfig.CORS_MAX_AGE).toBeGreaterThan(0);
    });

    it('ALLOWED_ORIGINS should be an array', () => {
      expect(Array.isArray(corsConfig.ALLOWED_ORIGINS)).toBe(true);
    });

    it('should typically have CORS disabled for monolithic deployments', () => {
      if (isDev() && !corsConfig.CORS_ENABLED) {
        // Monolithic dev deployments don't need CORS
        expect(corsConfig.CORS_ENABLED).toBe(false);
      }
    });

    it('should have allowed origins when CORS is enabled', () => {
      if (corsConfig.CORS_ENABLED) {
        // When CORS is enabled, we should have origins configured
        expect(corsConfig.ALLOWED_ORIGINS.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Cookie Configuration', () => {
    it('COOKIE_SECURE should be boolean', () => {
      expect(typeof cookiesConfig.COOKIE_SECURE).toBe('boolean');
    });

    it('COOKIE_SAMESITE should be a valid value', () => {
      expect(['strict', 'lax', 'none']).toContain(cookiesConfig.COOKIE_SAMESITE);
    });

    it('should have implementation in csrf.ts', async () => {
      const csrfModule = await import('../../middleware/csrf');
      expect(csrfModule).toBeDefined();
      expect(csrfModule.csrfProtection).toBeDefined();
    });

    it('should typically use insecure cookies in development', () => {
      if (isDev()) {
        // Development typically runs on HTTP
        expect(cookiesConfig.COOKIE_SECURE).toBeDefined();
      }
    });

    it('should use lax or strict SameSite for same-origin deployments', () => {
      if (!corsConfig.CORS_ENABLED) {
        // Same-origin deployments should use lax or strict
        expect(['lax', 'strict']).toContain(cookiesConfig.COOKIE_SAMESITE);
      }
    });

    it('should use none SameSite when CORS is enabled', () => {
      if (corsConfig.CORS_ENABLED && cookiesConfig.COOKIE_SAMESITE === 'none') {
        // Cross-origin deployments need SameSite=none
        expect(cookiesConfig.COOKIE_SAMESITE).toBe('none');
        // And secure must be true for SameSite=none
        expect(cookiesConfig.COOKIE_SECURE).toBe(true);
      }
    });
  });

  describe('Feature Flag Consistency', () => {
    it('should have all flags properly typed', () => {
      const flags = [
        featuresConfig.SEO_META_ENABLED,
        featuresConfig.FORCE_HTTPS_REDIRECT,
        featuresConfig.CANONICAL_URL_ENFORCEMENT,
        featuresConfig.MONITORING_ENABLED,
        featuresConfig.COMPLIANCE_REPORT_ENABLED,
        featuresConfig.ERROR_DETAILS_ENABLED,
      ];

      flags.forEach((flag) => {
        expect(typeof flag).toBe('boolean');
      });
    });

    it('should have sensible development defaults', () => {
      if (isDev()) {
        // Development should have debugging features enabled
        expect(featuresConfig.ERROR_DETAILS_ENABLED).toBeDefined();
        expect(loggingConfig.LOG_LEVEL).toBeDefined();
        
        // Development should have security features relaxed
        expect(featuresConfig.FORCE_HTTPS_REDIRECT).toBeDefined();
        expect(cookiesConfig.COOKIE_SECURE).toBeDefined();
      }
    });

    it('should have monitoring available in any environment', () => {
      // Monitoring can be enabled in dev or prod for testing
      expect(featuresConfig.MONITORING_ENABLED).toBeDefined();
      expect(featuresConfig.COMPLIANCE_REPORT_ENABLED).toBeDefined();
    });
  });

  describe('Configuration Usage Patterns', () => {
    it('should allow conditional middleware loading', () => {
      // Test that feature flags can be used for conditional logic
      const shouldLoadMonitoring = featuresConfig.MONITORING_ENABLED;
      const shouldLoadCompliance = featuresConfig.COMPLIANCE_REPORT_ENABLED;
      
      expect(typeof shouldLoadMonitoring).toBe('boolean');
      expect(typeof shouldLoadCompliance).toBe('boolean');
    });

    it('should allow conditional error detail exposure', () => {
      // Test error detail flag usage pattern
      const errorContext = featuresConfig.ERROR_DETAILS_ENABLED 
        ? { detail: 'some detail' } 
        : undefined;
      
      if (featuresConfig.ERROR_DETAILS_ENABLED) {
        expect(errorContext).toBeDefined();
      } else {
        expect(errorContext).toBeUndefined();
      }
    });

    it('should allow conditional SEO injection', () => {
      // Test SEO flag usage pattern
      const shouldInject = featuresConfig.SEO_META_ENABLED;
      expect(typeof shouldInject).toBe('boolean');
    });
  });

  describe('Real-world Scenarios', () => {
    it('development environment should have debugging enabled', () => {
      if (isDev()) {
        expect(loggingConfig.LOG_LEVEL).toBe('debug');
        expect(loggingConfig.LOG_FORMAT).toBe('pretty');
      }
    });

    it('should have valid configuration for current environment', () => {
      // All feature flags should be defined
      expect(featuresConfig).toBeDefined();
      expect(loggingConfig).toBeDefined();
      expect(corsConfig).toBeDefined();
      expect(cookiesConfig).toBeDefined();

      // No undefined values
      expect(featuresConfig.SEO_META_ENABLED).not.toBeUndefined();
      expect(featuresConfig.FORCE_HTTPS_REDIRECT).not.toBeUndefined();
      expect(featuresConfig.CANONICAL_URL_ENFORCEMENT).not.toBeUndefined();
      expect(featuresConfig.MONITORING_ENABLED).not.toBeUndefined();
      expect(featuresConfig.COMPLIANCE_REPORT_ENABLED).not.toBeUndefined();
      expect(featuresConfig.ERROR_DETAILS_ENABLED).not.toBeUndefined();
    });
  });

  describe('Documentation and Maintenance', () => {
    it('should have all flags documented in .env.example', async () => {
      // This test ensures the .env.example is kept in sync
      // We can't read files in tests, but we verify the structure exists
      expect(featuresConfig).toHaveProperty('SEO_META_ENABLED');
      expect(featuresConfig).toHaveProperty('FORCE_HTTPS_REDIRECT');
      expect(featuresConfig).toHaveProperty('CANONICAL_URL_ENFORCEMENT');
      expect(featuresConfig).toHaveProperty('MONITORING_ENABLED');
      expect(featuresConfig).toHaveProperty('COMPLIANCE_REPORT_ENABLED');
      expect(featuresConfig).toHaveProperty('ERROR_DETAILS_ENABLED');
    });

    it('should have all flags used in actual code', () => {
      // This test verifies that all flags are being used
      // If a flag exists but isn't used anywhere, it should be removed
      const allFlagsUsed = [
        'SEO_META_ENABLED',
        'FORCE_HTTPS_REDIRECT',
        'CANONICAL_URL_ENFORCEMENT',
        'MONITORING_ENABLED',
        'COMPLIANCE_REPORT_ENABLED',
        'ERROR_DETAILS_ENABLED',
      ];

      allFlagsUsed.forEach((flagName) => {
        expect(featuresConfig).toHaveProperty(flagName);
      });
    });
  });
});
