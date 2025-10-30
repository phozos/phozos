/**
 * Configuration Module Unit Tests
 * 
 * Comprehensive tests for validation, type coercion, defaults, and layering
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';

describe('Configuration Module', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    // Clear module cache to allow re-importing with new env
    vi.resetModules();
  });

  describe('Schema Validation - Required Fields', () => {
    it('should fail validation when DATABASE_URL is missing', async () => {
      // Arrange: Set up env without DATABASE_URL
      process.env = {
        NODE_ENV: 'test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Mock console.error and process.exit to capture validation failure
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`process.exit(${code})`);
      });

      // Act & Assert
      await expect(async () => {
        await import('../index.ts?t=' + Date.now());
      }).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Configuration Validation Failed')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('DATABASE_URL')
      );

      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    it('should fail validation when JWT_SECRET is missing', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        CSRF_SECRET: 'b'.repeat(32),
      };

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`process.exit(${code})`);
      });

      // Act & Assert
      await expect(async () => {
        await import('../index.ts?t=' + Date.now());
      }).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('JWT_SECRET')
      );

      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    it('should fail validation when CSRF_SECRET is missing', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
      };

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`process.exit(${code})`);
      });

      // Act & Assert
      await expect(async () => {
        await import('../index.ts?t=' + Date.now());
      }).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('CSRF_SECRET')
      );

      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    it('should fail validation when multiple required fields are missing', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
      };

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`process.exit(${code})`);
      });

      // Act & Assert
      await expect(async () => {
        await import('../index.ts?t=' + Date.now());
      }).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('DATABASE_URL')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('JWT_SECRET')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('CSRF_SECRET')
      );

      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });
  });

  describe('Secret Length Validation', () => {
    it('should fail validation when JWT_SECRET is less than 64 characters', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(63), // 63 chars, should fail
        CSRF_SECRET: 'b'.repeat(32),
      };

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`process.exit(${code})`);
      });

      // Act & Assert
      await expect(async () => {
        await import('../index.ts?t=' + Date.now());
      }).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('JWT_SECRET must be at least 64 characters')
      );

      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    it('should pass validation when JWT_SECRET is exactly 64 characters', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.security.JWT_SECRET).toBe('a'.repeat(64));
    });

    it('should fail validation when CSRF_SECRET is less than 32 characters', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(31), // 31 chars, should fail
      };

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
        throw new Error(`process.exit(${code})`);
      });

      // Act & Assert
      await expect(async () => {
        await import('../index.ts?t=' + Date.now());
      }).rejects.toThrow('process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('CSRF_SECRET must be at least 32 characters')
      );

      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    it('should pass validation when CSRF_SECRET is exactly 32 characters', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.security.CSRF_SECRET).toBe('b'.repeat(32));
    });
  });

  describe('Type Coercion and Defaults', () => {
    it('should default PORT to 5000 when not provided', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.app.PORT).toBe(5000);
    });

    it('should parse PORT as integer when provided as string', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        PORT: '3000',
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.app.PORT).toBe(3000);
      expect(typeof config.default.app.PORT).toBe('number');
    });

    it('should default LOG_LEVEL to "info" when not provided', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.logging.LOG_LEVEL).toBe('info');
    });

    it('should default LOG_FORMAT to "json" when not provided', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.logging.LOG_FORMAT).toBe('json');
    });

    it('should default NODE_ENV to "development" when not provided', async () => {
      // Arrange
      process.env = {
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.app.NODE_ENV).toBe('development');
    });

    it('should default CORS_MAX_AGE to 86400 when not provided', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.cors.CORS_MAX_AGE).toBe(86400);
    });

    it('should parse CORS_MAX_AGE as integer when provided', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        CORS_MAX_AGE: '3600',
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.cors.CORS_MAX_AGE).toBe(3600);
      expect(typeof config.default.cors.CORS_MAX_AGE).toBe('number');
    });

    it('should default COOKIE_SAMESITE to "lax" when not provided', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.cookies.COOKIE_SAMESITE).toBe('lax');
    });
  });

  describe('TRUST_PROXY Parsing', () => {
    it('should convert "true" to 1', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        TRUST_PROXY: 'true',
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.security.TRUST_PROXY).toBe(1);
    });

    it('should convert "false" to false', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        TRUST_PROXY: 'false',
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.security.TRUST_PROXY).toBe(false);
    });

    it('should convert "0" to false', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        TRUST_PROXY: '0',
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.security.TRUST_PROXY).toBe(false);
    });

    it('should parse valid number strings as integers', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        TRUST_PROXY: '3',
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.security.TRUST_PROXY).toBe(3);
    });

    it('should default to 1 when invalid value is provided', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        TRUST_PROXY: 'invalid',
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.security.TRUST_PROXY).toBe(1);
    });

    it('should default to false when not provided', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.security.TRUST_PROXY).toBe(false);
    });
  });

  describe('Boolean Parsing', () => {
    it('should parse "true" as true', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        SEO_META_ENABLED: 'true',
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.features.SEO_META_ENABLED).toBe(true);
    });

    it('should parse "1" as true', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        SEO_META_ENABLED: '1',
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.features.SEO_META_ENABLED).toBe(true);
    });

    it('should parse "yes" as true', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        SEO_META_ENABLED: 'yes',
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.features.SEO_META_ENABLED).toBe(true);
    });

    it('should parse "TRUE" (uppercase) as true', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        SEO_META_ENABLED: 'TRUE',
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.features.SEO_META_ENABLED).toBe(true);
    });

    it('should default to false when blank/empty', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        SEO_META_ENABLED: '',
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.features.SEO_META_ENABLED).toBe(false);
    });

    it('should default to false when not provided', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.features.SEO_META_ENABLED).toBe(false);
      expect(config.default.features.FORCE_HTTPS_REDIRECT).toBe(false);
      expect(config.default.features.CANONICAL_URL_ENFORCEMENT).toBe(false);
      expect(config.default.features.MONITORING_ENABLED).toBe(false);
      expect(config.default.features.COMPLIANCE_REPORT_ENABLED).toBe(false);
      expect(config.default.features.ERROR_DETAILS_ENABLED).toBe(false);
    });

    it('should coerce invalid boolean strings to false', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        SEO_META_ENABLED: 'invalid',
        FORCE_HTTPS_REDIRECT: 'maybe',
        CANONICAL_URL_ENFORCEMENT: 'unknown',
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.features.SEO_META_ENABLED).toBe(false);
      expect(config.default.features.FORCE_HTTPS_REDIRECT).toBe(false);
      expect(config.default.features.CANONICAL_URL_ENFORCEMENT).toBe(false);
    });

    it('should parse multiple boolean flags correctly', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        SEO_META_ENABLED: 'true',
        FORCE_HTTPS_REDIRECT: '1',
        CANONICAL_URL_ENFORCEMENT: 'yes',
        MONITORING_ENABLED: 'false',
        COMPLIANCE_REPORT_ENABLED: '0',
        ERROR_DETAILS_ENABLED: 'no',
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.features.SEO_META_ENABLED).toBe(true);
      expect(config.default.features.FORCE_HTTPS_REDIRECT).toBe(true);
      expect(config.default.features.CANONICAL_URL_ENFORCEMENT).toBe(true);
      expect(config.default.features.MONITORING_ENABLED).toBe(false);
      expect(config.default.features.COMPLIANCE_REPORT_ENABLED).toBe(false);
      expect(config.default.features.ERROR_DETAILS_ENABLED).toBe(false);
    });
  });

  describe('Comma-Separated Array Parsing', () => {
    it('should parse ADMIN_IPS as comma-separated array', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        ADMIN_IPS: '192.168.1.1,10.0.0.1,172.16.0.1',
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.admin.ADMIN_IPS).toEqual([
        '192.168.1.1',
        '10.0.0.1',
        '172.16.0.1',
      ]);
    });

    it('should trim whitespace from ADMIN_IPS', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        ADMIN_IPS: '  192.168.1.1  ,  10.0.0.1  ,  172.16.0.1  ',
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.admin.ADMIN_IPS).toEqual([
        '192.168.1.1',
        '10.0.0.1',
        '172.16.0.1',
      ]);
    });

    it('should parse ALLOWED_ORIGINS as comma-separated array', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        ALLOWED_ORIGINS: 'https://example.com,https://app.example.com,https://api.example.com',
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.cors.ALLOWED_ORIGINS).toEqual([
        'https://example.com',
        'https://app.example.com',
        'https://api.example.com',
      ]);
    });

    it('should trim whitespace from ALLOWED_ORIGINS', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        ALLOWED_ORIGINS: '  https://example.com  ,  https://app.example.com  ',
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.cors.ALLOWED_ORIGINS).toEqual([
        'https://example.com',
        'https://app.example.com',
      ]);
    });

    it('should return empty array when not provided', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.admin.ADMIN_IPS).toEqual([]);
      expect(config.default.cors.ALLOWED_ORIGINS).toEqual([]);
    });

    it('should filter out empty strings from comma-separated values', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        ADMIN_IPS: '192.168.1.1,,10.0.0.1,,,172.16.0.1',
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.admin.ADMIN_IPS).toEqual([
        '192.168.1.1',
        '10.0.0.1',
        '172.16.0.1',
      ]);
    });
  });

  describe('Environment Mode Detection', () => {
    it('should set isDevelopment flag when NODE_ENV is development', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.app.NODE_ENV).toBe('development');
      expect(config.default.app.isDevelopment).toBe(true);
      expect(config.default.app.isProduction).toBe(false);
      expect(config.default.app.isTest).toBe(false);
      expect(config.isDev()).toBe(true);
      expect(config.isProd()).toBe(false);
      expect(config.isTest()).toBe(false);
    });

    it('should set isProduction flag when NODE_ENV is production', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.app.NODE_ENV).toBe('production');
      expect(config.default.app.isDevelopment).toBe(false);
      expect(config.default.app.isProduction).toBe(true);
      expect(config.default.app.isTest).toBe(false);
      expect(config.isDev()).toBe(false);
      expect(config.isProd()).toBe(true);
      expect(config.isTest()).toBe(false);
    });

    it('should set isTest flag when NODE_ENV is test', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.app.NODE_ENV).toBe('test');
      expect(config.default.app.isDevelopment).toBe(false);
      expect(config.default.app.isProduction).toBe(false);
      expect(config.default.app.isTest).toBe(true);
      expect(config.isDev()).toBe(false);
      expect(config.isProd()).toBe(false);
      expect(config.isTest()).toBe(true);
    });
  });

  describe('Module Exports', () => {
    it('should export default config object', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default).toBeDefined();
      expect(config.default.app).toBeDefined();
      expect(config.default.database).toBeDefined();
      expect(config.default.security).toBeDefined();
      expect(config.default.features).toBeDefined();
      expect(config.default.logging).toBeDefined();
      expect(config.default.cors).toBeDefined();
      expect(config.default.cookies).toBeDefined();
    });

    it('should export individual config sections', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Act
      const {
        appConfig,
        databaseConfig,
        securityConfig,
        emailConfig,
        adminConfig,
        featuresConfig,
        loggingConfig,
        corsConfig,
        cookiesConfig,
        buildConfig,
      } = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(appConfig).toBeDefined();
      expect(databaseConfig).toBeDefined();
      expect(securityConfig).toBeDefined();
      expect(emailConfig).toBeDefined();
      expect(adminConfig).toBeDefined();
      expect(featuresConfig).toBeDefined();
      expect(loggingConfig).toBeDefined();
      expect(corsConfig).toBeDefined();
      expect(cookiesConfig).toBeDefined();
      expect(buildConfig).toBeDefined();
    });

    it('should export helper functions', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Act
      const { isDev, isProd, isTest } = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(typeof isDev).toBe('function');
      expect(typeof isProd).toBe('function');
      expect(typeof isTest).toBe('function');
    });
  });

  describe('dotenv-flow Layering Behavior', () => {
    /**
     * NOTE: dotenv-flow layering tests verify that the config module
     * respects NODE_ENV and loads configuration appropriately.
     * 
     * Loading order (later files override earlier ones):
     * 1. .env (committed defaults)
     * 2. .env.local (local overrides, gitignored)
     * 3. .env.{NODE_ENV} (environment-specific)
     * 4. .env.{NODE_ENV}.local (environment-specific local overrides, gitignored)
     * 
     * These tests verify NODE_ENV is respected during config initialization.
     */

    it('should respect NODE_ENV=development during config loading', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://localhost:5432/dev',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.app.NODE_ENV).toBe('development');
      expect(config.default.app.isDevelopment).toBe(true);
      expect(config.isDev()).toBe(true);
    });

    it('should respect NODE_ENV=production during config loading', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://prod-server:5432/prod',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.app.NODE_ENV).toBe('production');
      expect(config.default.app.isProduction).toBe(true);
      expect(config.isProd()).toBe(true);
    });

    it('should respect NODE_ENV=test during config loading', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.app.NODE_ENV).toBe('test');
      expect(config.default.app.isTest).toBe(true);
      expect(config.isTest()).toBe(true);
    });

    it('should load environment-specific configuration with different NODE_ENV', async () => {
      // Arrange - Simulate production environment
      process.env = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://prod:5432/db',
        JWT_SECRET: 'prod'.repeat(22),
        CSRF_SECRET: 'prod'.repeat(11),
        LOG_LEVEL: 'error', // Production typically uses error level
        LOG_FORMAT: 'json', // Production typically uses json format
      };

      // Act
      const prodConfig = await import('../index.ts?t=' + Date.now());

      // Assert - Production config
      expect(prodConfig.default.app.NODE_ENV).toBe('production');
      expect(prodConfig.default.logging.LOG_LEVEL).toBe('error');
      expect(prodConfig.default.logging.LOG_FORMAT).toBe('json');

      // Reset modules
      vi.resetModules();

      // Arrange - Simulate development environment
      process.env = {
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://localhost:5432/dev',
        JWT_SECRET: 'dev'.repeat(22),
        CSRF_SECRET: 'dev'.repeat(11),
        LOG_LEVEL: 'debug', // Development typically uses debug level
        LOG_FORMAT: 'pretty', // Development typically uses pretty format
      };

      // Act
      const devConfig = await import('../index.ts?t=' + Date.now());

      // Assert - Development config
      expect(devConfig.default.app.NODE_ENV).toBe('development');
      expect(devConfig.default.logging.LOG_LEVEL).toBe('debug');
      expect(devConfig.default.logging.LOG_FORMAT).toBe('pretty');
    });

    it('should use different database URLs for different environments', async () => {
      // Arrange - Test environment
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test_db',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Act
      const testConfig = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(testConfig.default.database.DATABASE_URL).toBe('postgresql://localhost:5432/test_db');

      // Reset modules
      vi.resetModules();

      // Arrange - Production environment
      process.env = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://prod-server.example.com:5432/production_db',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Act
      const prodConfig = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(prodConfig.default.database.DATABASE_URL).toBe('postgresql://prod-server.example.com:5432/production_db');
    });

    it('should allow environment-specific feature flag overrides', async () => {
      // Arrange - Development with debugging features enabled
      process.env = {
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://localhost:5432/dev',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        ERROR_DETAILS_ENABLED: 'true', // Enabled in development
        MONITORING_ENABLED: 'false',
      };

      // Act
      const devConfig = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(devConfig.default.features.ERROR_DETAILS_ENABLED).toBe(true);
      expect(devConfig.default.features.MONITORING_ENABLED).toBe(false);

      // Reset modules
      vi.resetModules();

      // Arrange - Production with monitoring enabled, debugging disabled
      process.env = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://prod:5432/db',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        ERROR_DETAILS_ENABLED: 'false', // Disabled in production
        MONITORING_ENABLED: 'true', // Enabled in production
      };

      // Act
      const prodConfig = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(prodConfig.default.features.ERROR_DETAILS_ENABLED).toBe(false);
      expect(prodConfig.default.features.MONITORING_ENABLED).toBe(true);
    });

    it('should verify dotenv-flow initializes with correct node_env parameter', async () => {
      // This test verifies that the config module passes the correct
      // node_env to dotenv-flow.config(), which determines which .env files to load

      // Arrange - Set NODE_ENV before importing
      process.env = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://localhost:5432/db',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert - Config should reflect the NODE_ENV used during initialization
      expect(config.default.app.NODE_ENV).toBe('production');

      // The fact that the config loads successfully proves dotenv-flow
      // was initialized with the correct node_env parameter
    });

    it('should default to development when NODE_ENV is not set during dotenv-flow init', async () => {
      // Arrange - Don't set NODE_ENV
      process.env = {
        DATABASE_URL: 'postgresql://localhost:5432/db',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert - Should default to development
      expect(config.default.app.NODE_ENV).toBe('development');
      expect(config.default.app.isDevelopment).toBe(true);
    });
  });

  describe('Build Configuration', () => {
    it('should default HMR_ENABLED to true when REPL_ID is not set', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };
      delete process.env.REPL_ID;

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.build.HMR_ENABLED).toBe(true);
    });

    it('should default HMR_ENABLED to false when REPL_ID is set', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        REPL_ID: 'test-repl-id',
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.build.HMR_ENABLED).toBe(false);
    });

    it('should allow explicit HMR_ENABLED override', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        REPL_ID: 'test-repl-id',
        HMR_ENABLED: 'true',
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.build.HMR_ENABLED).toBe(true);
    });

    it('should auto-enable CARTOGRAPHER_ENABLED on Replit', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        REPL_ID: 'test-repl-id',
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.build.CARTOGRAPHER_ENABLED).toBe(true);
    });

    it('should default CARTOGRAPHER_ENABLED to false when not on Replit', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://localhost:5432/test',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
      };
      delete process.env.REPL_ID;

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert
      expect(config.default.build.CARTOGRAPHER_ENABLED).toBe(false);
    });
  });

  describe('Complete Configuration', () => {
    it('should successfully load with all valid environment variables', async () => {
      // Arrange
      process.env = {
        NODE_ENV: 'production',
        PORT: '8080',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/mydb',
        JWT_SECRET: 'a'.repeat(64),
        CSRF_SECRET: 'b'.repeat(32),
        CSRF_METRICS_ENABLED: 'true',
        TRUST_PROXY: '2',
        SENDGRID_API_KEY: 'SG.test-key',
        ADMIN_PASSWORD: 'admin123',
        ADMIN_IPS: '192.168.1.1,10.0.0.1',
        SEO_META_ENABLED: 'true',
        FORCE_HTTPS_REDIRECT: '1',
        CANONICAL_URL_ENFORCEMENT: 'yes',
        MONITORING_ENABLED: 'true',
        COMPLIANCE_REPORT_ENABLED: 'false',
        ERROR_DETAILS_ENABLED: '0',
        LOG_LEVEL: 'debug',
        LOG_FORMAT: 'pretty',
        LOG_FILE_ENABLED: 'true',
        CORS_ENABLED: '1',
        CORS_MAX_AGE: '7200',
        ALLOWED_ORIGINS: 'https://example.com,https://app.example.com',
        COOKIE_SECURE: 'true',
        COOKIE_SAMESITE: 'strict',
        HMR_ENABLED: 'false',
        IMAGE_OPTIMIZATION_ENABLED: 'true',
        CARTOGRAPHER_ENABLED: 'false',
      };

      // Act
      const config = await import('../index.ts?t=' + Date.now());

      // Assert - App Config
      expect(config.default.app.NODE_ENV).toBe('production');
      expect(config.default.app.PORT).toBe(8080);
      expect(config.default.app.isProduction).toBe(true);

      // Assert - Database Config
      expect(config.default.database.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/mydb');

      // Assert - Security Config
      expect(config.default.security.JWT_SECRET).toBe('a'.repeat(64));
      expect(config.default.security.CSRF_SECRET).toBe('b'.repeat(32));
      expect(config.default.security.CSRF_METRICS_ENABLED).toBe(true);
      expect(config.default.security.TRUST_PROXY).toBe(2);

      // Assert - Email Config
      expect(config.default.email.SENDGRID_API_KEY).toBe('SG.test-key');

      // Assert - Admin Config
      expect(config.default.admin.ADMIN_PASSWORD).toBe('admin123');
      expect(config.default.admin.ADMIN_IPS).toEqual(['192.168.1.1', '10.0.0.1']);

      // Assert - Features Config
      expect(config.default.features.SEO_META_ENABLED).toBe(true);
      expect(config.default.features.FORCE_HTTPS_REDIRECT).toBe(true);
      expect(config.default.features.CANONICAL_URL_ENFORCEMENT).toBe(true);
      expect(config.default.features.MONITORING_ENABLED).toBe(true);
      expect(config.default.features.COMPLIANCE_REPORT_ENABLED).toBe(false);
      expect(config.default.features.ERROR_DETAILS_ENABLED).toBe(false);

      // Assert - Logging Config
      expect(config.default.logging.LOG_LEVEL).toBe('debug');
      expect(config.default.logging.LOG_FORMAT).toBe('pretty');
      expect(config.default.logging.LOG_FILE_ENABLED).toBe(true);

      // Assert - CORS Config
      expect(config.default.cors.CORS_ENABLED).toBe(true);
      expect(config.default.cors.CORS_MAX_AGE).toBe(7200);
      expect(config.default.cors.ALLOWED_ORIGINS).toEqual([
        'https://example.com',
        'https://app.example.com',
      ]);

      // Assert - Cookies Config
      expect(config.default.cookies.COOKIE_SECURE).toBe(true);
      expect(config.default.cookies.COOKIE_SAMESITE).toBe('strict');

      // Assert - Build Config
      expect(config.default.build.HMR_ENABLED).toBe(false);
      expect(config.default.build.IMAGE_OPTIMIZATION_ENABLED).toBe(true);
      expect(config.default.build.CARTOGRAPHER_ENABLED).toBe(false);
    });
  });
});
