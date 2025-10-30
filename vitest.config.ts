import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/tests/**/*.test.ts', 'server/repositories/**/*.test.ts', 'server/services/**/*.test.ts', 'server/middleware/**/*.test.ts', 'server/utils/**/*.test.ts', 'server/config/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'server/repositories/base.repository.ts',
        'server/repositories/user.repository.ts',
        'server/repositories/student.repository.ts',
        'server/repositories/university.repository.ts',
        'server/repositories/application.repository.ts',
        'server/repositories/document.repository.ts',
        'server/repositories/forum.repository.ts',
        'server/repositories/notification.repository.ts',
        'server/repositories/event.repository.ts',
        'server/repositories/ai-matching.repository.ts',
        'server/repositories/chat.repository.ts',
        'server/repositories/payment.repository.ts',
        'server/repositories/subscription.repository.ts',
        'server/services/base.service.ts',
        'server/services/domain/admin.service.ts',
        'server/services/domain/application.service.ts',
        'server/services/domain/auth.service.ts',
        'server/services/domain/chat.service.ts',
        'server/services/domain/counselor.service.ts',
        'server/services/domain/document.service.ts',
        'server/services/domain/event.service.ts',
        'server/services/domain/forum.service.ts',
        'server/services/domain/notification.service.ts',
        'server/services/domain/payment.service.ts',
        'server/services/domain/subscription.service.ts',
        'server/services/domain/temporaryPassword.service.ts',
        'server/services/domain/university.service.ts',
        'server/services/domain/user.service.ts'
      ],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.test.ts',
        '**/__tests__/**',
        'server/tests/**'
      ],
      thresholds: {
        lines: 99,
        functions: 99,
        branches: 99,
        statements: 99,
        'server/repositories/base.repository.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/repositories/user.repository.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/repositories/student.repository.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/repositories/university.repository.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/repositories/application.repository.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/repositories/document.repository.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/repositories/forum.repository.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/repositories/notification.repository.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/repositories/event.repository.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/repositories/ai-matching.repository.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/repositories/chat.repository.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/repositories/payment.repository.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/repositories/subscription.repository.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/services/base.service.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/services/domain/admin.service.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/services/domain/application.service.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/services/domain/auth.service.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/services/domain/chat.service.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/services/domain/counselor.service.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/services/domain/document.service.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/services/domain/event.service.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/services/domain/forum.service.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/services/domain/notification.service.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/services/domain/payment.service.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/services/domain/subscription.service.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/services/domain/temporaryPassword.service.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/services/domain/university.service.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        },
        'server/services/domain/user.service.ts': {
          lines: 99,
          functions: 99,
          branches: 99,
          statements: 99
        }
      }
    }
  },
  resolve: {
    alias: {
      '@shared': path.resolve('./shared'),
      '@': path.resolve('./client/src')
    }
  }
});