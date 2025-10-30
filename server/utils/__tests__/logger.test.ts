import { describe, it, expect, vi } from 'vitest';
import winston from 'winston';
import logger from '../logger';
import { levels } from '../logger-config';

describe('Logger Module', () => {
  describe('Logger initialization', () => {
    it('should initialize without errors', () => {
      expect(logger).toBeDefined();
      expect(logger).toBeInstanceOf(Object);
    });

    it('should export default logger with logging methods', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should have all required logging methods', () => {
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.http).toBe('function');
    });
  });

  describe('Logger transports', () => {
    it('should have console transport configured', () => {
      const transports = logger.transports;
      expect(transports).toBeDefined();
      expect(transports.length).toBeGreaterThan(0);

      const hasConsoleTransport = transports.some(
        (t: winston.transport) => t instanceof winston.transports.Console
      );
      expect(hasConsoleTransport).toBe(true);
    });

    it('should have at least one transport', () => {
      expect(logger.transports).toBeDefined();
      expect(logger.transports.length).toBeGreaterThan(0);
    });
  });

  describe('Logger methods', () => {
    it('should have error method', () => {
      expect(typeof logger.error).toBe('function');
    });

    it('should have warn method', () => {
      expect(typeof logger.warn).toBe('function');
    });

    it('should have info method', () => {
      expect(typeof logger.info).toBe('function');
    });

    it('should have http method', () => {
      expect(typeof logger.http).toBe('function');
    });

    it('should have debug method', () => {
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('Logger configuration', () => {
    it('should not exit on error', () => {
      expect(logger.exitOnError).toBe(false);
    });

    it('should have custom log levels', () => {
      const loggerLevels = logger.levels;
      expect(loggerLevels).toBeDefined();
      expect(loggerLevels.error).toBeDefined();
      expect(loggerLevels.warn).toBeDefined();
      expect(loggerLevels.info).toBeDefined();
      expect(loggerLevels.http).toBeDefined();
      expect(loggerLevels.debug).toBeDefined();
    });

    it('should use custom levels from config', () => {
      expect(logger.levels).toEqual(levels);
    });

    it('should have transports configured', () => {
      expect(logger.transports).toBeDefined();
      expect(logger.transports.length).toBeGreaterThan(0);
    });
  });

  describe('Logger error handling', () => {
    it('should not throw when logging with metadata', () => {
      expect(() => {
        logger.info('Test message', { data: 'test' });
      }).not.toThrow();
    });

    it('should handle logging without metadata', () => {
      expect(() => {
        logger.info('Test message');
      }).not.toThrow();
    });

    it('should handle logging with null metadata', () => {
      expect(() => {
        logger.info('Test message', null as any);
      }).not.toThrow();
    });

    it('should handle logging with undefined metadata', () => {
      expect(() => {
        logger.info('Test message', undefined);
      }).not.toThrow();
    });

    it('should handle logging with complex objects', () => {
      expect(() => {
        logger.info('Test message', {
          user: { id: 1, name: 'Test' },
          data: [1, 2, 3],
          nested: { deep: { value: 'test' } }
        });
      }).not.toThrow();
    });
  });

  describe('Logger methods execute without errors', () => {
    it('should execute error() without throwing', () => {
      expect(() => logger.error('Error message')).not.toThrow();
    });

    it('should execute warn() without throwing', () => {
      expect(() => logger.warn('Warning message')).not.toThrow();
    });

    it('should execute info() without throwing', () => {
      expect(() => logger.info('Info message')).not.toThrow();
    });

    it('should execute http() without throwing', () => {
      expect(() => logger.http('HTTP message')).not.toThrow();
    });

    it('should execute debug() without throwing', () => {
      expect(() => logger.debug('Debug message')).not.toThrow();
    });
  });

  describe('Logger transport validation', () => {
    it('should have Console transport', () => {
      const transports = logger.transports;
      const consoleTransport = transports.find(
        (t: winston.transport) => t instanceof winston.transports.Console
      );
      expect(consoleTransport).toBeDefined();
    });

    it('should have proper transport configuration', () => {
      const transports = logger.transports;
      expect(Array.isArray(transports)).toBe(true);
      expect(transports.length).toBeGreaterThan(0);
      
      transports.forEach((transport: winston.transport) => {
        expect(transport).toBeDefined();
        expect(transport.level).toBeDefined();
      });
    });
  });

  describe('Logger level priority', () => {
    it('should have correct level priority', () => {
      expect(levels.error).toBe(0);
      expect(levels.warn).toBe(1);
      expect(levels.info).toBe(2);
      expect(levels.http).toBe(3);
      expect(levels.debug).toBe(4);
    });

    it('should respect level hierarchy', () => {
      expect(levels.error).toBeLessThan(levels.warn);
      expect(levels.warn).toBeLessThan(levels.info);
      expect(levels.info).toBeLessThan(levels.http);
      expect(levels.http).toBeLessThan(levels.debug);
    });
  });
});
