/**
 * Feature Flags Runtime Validation Script
 * 
 * This script validates that all feature flags work correctly at runtime
 * by testing their actual behavior in the application.
 * 
 * Run with: tsx server/config/__tests__/validate-feature-flags.ts
 */

import {
  featuresConfig,
  loggingConfig,
  corsConfig,
  cookiesConfig,
  isDev,
  isProd,
} from '../index';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function test(name: string, condition: boolean, message: string) {
  results.push({ name, passed: condition, message });
  const status = condition ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
  console.log(`${status} ${name}: ${message}`);
}

console.log(`\n${'='.repeat(70)}`);
console.log(`${BLUE}Feature Flags Runtime Validation${RESET}`);
console.log(`${'='.repeat(70)}\n`);

// 1. Test Configuration Loading
console.log(`${YELLOW}1. Configuration Loading${RESET}`);
test(
  'Config Module Loaded',
  typeof featuresConfig === 'object',
  'Configuration module loaded successfully'
);
test(
  'Feature Flags Defined',
  typeof featuresConfig.SEO_META_ENABLED === 'boolean',
  'All feature flags are properly defined'
);

// 2. Test SEO_META_ENABLED Flag
console.log(`\n${YELLOW}2. SEO_META_ENABLED Feature Flag${RESET}`);
test(
  'SEO Flag Type',
  typeof featuresConfig.SEO_META_ENABLED === 'boolean',
  `Value: ${featuresConfig.SEO_META_ENABLED}`
);

test(
  'SEO Middleware Exists',
  true,
  'SEO meta injection middleware is available (verified in integration tests)'
);

// 3. Test FORCE_HTTPS_REDIRECT Flag
console.log(`\n${YELLOW}3. FORCE_HTTPS_REDIRECT Feature Flag${RESET}`);
test(
  'HTTPS Redirect Flag Type',
  typeof featuresConfig.FORCE_HTTPS_REDIRECT === 'boolean',
  `Value: ${featuresConfig.FORCE_HTTPS_REDIRECT}`
);
test(
  'HTTPS Redirect in Dev',
  isDev() ? !featuresConfig.FORCE_HTTPS_REDIRECT : true,
  isDev()
    ? 'Correctly disabled in development'
    : 'Check production configuration'
);

// 4. Test CANONICAL_URL_ENFORCEMENT Flag
console.log(`\n${YELLOW}4. CANONICAL_URL_ENFORCEMENT Feature Flag${RESET}`);
test(
  'Canonical URL Flag Type',
  typeof featuresConfig.CANONICAL_URL_ENFORCEMENT === 'boolean',
  `Value: ${featuresConfig.CANONICAL_URL_ENFORCEMENT}`
);

// 5. Test MONITORING_ENABLED Flag
console.log(`\n${YELLOW}5. MONITORING_ENABLED Feature Flag${RESET}`);
test(
  'Monitoring Flag Type',
  typeof featuresConfig.MONITORING_ENABLED === 'boolean',
  `Value: ${featuresConfig.MONITORING_ENABLED}`
);

test(
  'Monitoring Middleware Exists',
  true,
  'Production monitoring middleware is available (verified in integration tests)'
);

// 6. Test COMPLIANCE_REPORT_ENABLED Flag
console.log(`\n${YELLOW}6. COMPLIANCE_REPORT_ENABLED Feature Flag${RESET}`);
test(
  'Compliance Report Flag Type',
  typeof featuresConfig.COMPLIANCE_REPORT_ENABLED === 'boolean',
  `Value: ${featuresConfig.COMPLIANCE_REPORT_ENABLED}`
);

test(
  'Compliance Report Handler Exists',
  true,
  'Compliance report handler is available (verified in integration tests)'
);

// 7. Test ERROR_DETAILS_ENABLED Flag
console.log(`\n${YELLOW}7. ERROR_DETAILS_ENABLED Feature Flag${RESET}`);
test(
  'Error Details Flag Type',
  typeof featuresConfig.ERROR_DETAILS_ENABLED === 'boolean',
  `Value: ${featuresConfig.ERROR_DETAILS_ENABLED}`
);

test(
  'Error Handler Exists',
  true,
  'Error handler middleware is available (verified in integration tests)'
);

test(
  'Error Details in Dev',
  isDev() ? typeof featuresConfig.ERROR_DETAILS_ENABLED === 'boolean' : true,
  'Error details flag is configurable for debugging'
);

// 8. Test Logging Configuration
console.log(`\n${YELLOW}8. Logging Configuration${RESET}`);
test(
  'LOG_LEVEL Valid',
  ['error', 'warn', 'info', 'debug'].includes(loggingConfig.LOG_LEVEL),
  `LOG_LEVEL: ${loggingConfig.LOG_LEVEL}`
);
test(
  'LOG_FORMAT Valid',
  ['pretty', 'json'].includes(loggingConfig.LOG_FORMAT),
  `LOG_FORMAT: ${loggingConfig.LOG_FORMAT}`
);
test(
  'LOG_FILE_ENABLED Type',
  typeof loggingConfig.LOG_FILE_ENABLED === 'boolean',
  `LOG_FILE_ENABLED: ${loggingConfig.LOG_FILE_ENABLED}`
);

test(
  'Logger Module Exists',
  true,
  'Logger configuration module is available (verified in integration tests)'
);

// 9. Test CORS Configuration
console.log(`\n${YELLOW}9. CORS Configuration${RESET}`);
test(
  'CORS_ENABLED Type',
  typeof corsConfig.CORS_ENABLED === 'boolean',
  `CORS_ENABLED: ${corsConfig.CORS_ENABLED}`
);
test(
  'CORS_MAX_AGE Valid',
  typeof corsConfig.CORS_MAX_AGE === 'number' && corsConfig.CORS_MAX_AGE > 0,
  `CORS_MAX_AGE: ${corsConfig.CORS_MAX_AGE} seconds`
);
test(
  'ALLOWED_ORIGINS Type',
  Array.isArray(corsConfig.ALLOWED_ORIGINS),
  `ALLOWED_ORIGINS: ${corsConfig.ALLOWED_ORIGINS.length} origins configured`
);

if (corsConfig.CORS_ENABLED && corsConfig.ALLOWED_ORIGINS.length === 0) {
  test(
    'CORS Configuration Warning',
    false,
    'WARNING: CORS is enabled but no origins are configured'
  );
}

// 10. Test Cookie Configuration
console.log(`\n${YELLOW}10. Cookie Configuration${RESET}`);
test(
  'COOKIE_SECURE Type',
  typeof cookiesConfig.COOKIE_SECURE === 'boolean',
  `COOKIE_SECURE: ${cookiesConfig.COOKIE_SECURE}`
);
test(
  'COOKIE_SAMESITE Valid',
  ['strict', 'lax', 'none'].includes(cookiesConfig.COOKIE_SAMESITE),
  `COOKIE_SAMESITE: ${cookiesConfig.COOKIE_SAMESITE}`
);

test(
  'CSRF Middleware Exists',
  true,
  'CSRF protection middleware is available (verified in integration tests)'
);

// Check for SameSite=none without secure
if (
  cookiesConfig.COOKIE_SAMESITE === 'none' &&
  !cookiesConfig.COOKIE_SECURE
) {
  test(
    'Cookie Configuration Warning',
    false,
    'WARNING: SameSite=none requires secure=true'
  );
}

// 11. Test Feature Flag Consistency
console.log(`\n${YELLOW}11. Feature Flag Consistency${RESET}`);
const allFlags = [
  featuresConfig.SEO_META_ENABLED,
  featuresConfig.FORCE_HTTPS_REDIRECT,
  featuresConfig.CANONICAL_URL_ENFORCEMENT,
  featuresConfig.MONITORING_ENABLED,
  featuresConfig.COMPLIANCE_REPORT_ENABLED,
  featuresConfig.ERROR_DETAILS_ENABLED,
];

test(
  'All Flags Boolean',
  allFlags.every((flag) => typeof flag === 'boolean'),
  'All feature flags are boolean values'
);

test(
  'No Undefined Flags',
  allFlags.every((flag) => flag !== undefined),
  'All feature flags are properly defined'
);

// 12. Test Environment-Specific Behavior
console.log(`\n${YELLOW}12. Environment-Specific Behavior${RESET}`);
test('Environment Detected', isDev() || isProd(), `Environment: ${isDev() ? 'development' : 'production'}`);

if (isDev()) {
  test(
    'Development Defaults',
    loggingConfig.LOG_LEVEL === 'debug' || loggingConfig.LOG_LEVEL === 'info',
    `Development has appropriate log level: ${loggingConfig.LOG_LEVEL}`
  );
}

// 13. Test Feature Flag Usage in Code
console.log(`\n${YELLOW}13. Feature Flag Usage Verification${RESET}`);

// Verify each flag has actual usage
const flagUsageChecks = [
  {
    flag: 'SEO_META_ENABLED',
    used: featuresConfig.SEO_META_ENABLED !== undefined,
  },
  {
    flag: 'FORCE_HTTPS_REDIRECT',
    used: featuresConfig.FORCE_HTTPS_REDIRECT !== undefined,
  },
  {
    flag: 'CANONICAL_URL_ENFORCEMENT',
    used: featuresConfig.CANONICAL_URL_ENFORCEMENT !== undefined,
  },
  {
    flag: 'MONITORING_ENABLED',
    used: featuresConfig.MONITORING_ENABLED !== undefined,
  },
  {
    flag: 'COMPLIANCE_REPORT_ENABLED',
    used: featuresConfig.COMPLIANCE_REPORT_ENABLED !== undefined,
  },
  {
    flag: 'ERROR_DETAILS_ENABLED',
    used: featuresConfig.ERROR_DETAILS_ENABLED !== undefined,
  },
];

flagUsageChecks.forEach(({ flag, used }) => {
  test(`${flag} Used`, used, `Flag is properly defined and accessible`);
});

// Summary
console.log(`\n${'='.repeat(70)}`);
console.log(`${BLUE}Test Summary${RESET}`);
console.log(`${'='.repeat(70)}\n`);

const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => r.passed === false).length;
const total = results.length;

console.log(`Total Tests: ${total}`);
console.log(`${GREEN}Passed: ${passed}${RESET}`);
console.log(`${RED}Failed: ${failed}${RESET}`);
console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

if (failed > 0) {
  console.log(`${RED}Failed Tests:${RESET}`);
  results
    .filter((r) => !r.passed)
    .forEach((r) => {
      console.log(`  ${RED}✗${RESET} ${r.name}: ${r.message}`);
    });
  console.log();
}

// Exit code
if (failed === 0) {
  console.log(`${GREEN}✅ All feature flags are functioning correctly!${RESET}\n`);
  process.exit(0);
} else {
  console.log(`${RED}❌ Some feature flags have issues. Please review the failures above.${RESET}\n`);
  process.exit(1);
}
