import { readFileSync, existsSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

/**
 * Custom Response Pattern Checker
 * 
 * Scans API route files for banned response patterns and enforces
 * the use of sendSuccess() and sendError() utilities.
 */

const BANNED_PATTERNS = [
  {
    pattern: /res\.json\s*\(/g,
    message: 'Use sendSuccess() or sendError() instead of res.json()',
    severity: 'error'
  },
  {
    pattern: /res\.status\s*\(\s*\d+\s*\)\.json\s*\(/g,
    message: 'Use sendError() instead of res.status().json()',
    severity: 'error'
  },
  {
    pattern: /return\s+res\.json\s*\(/g,
    message: 'Use sendSuccess() or sendError() instead of returning res.json()',
    severity: 'error'
  }
];

const ALLOWED_FILES = [
  'server/utils/response.ts',
  'server/middleware/csrf.ts', // Legacy - will be removed in future updates
];

function checkFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const violations = [];

    // Skip allowed files
    if (ALLOWED_FILES.some(allowed => filePath.includes(allowed))) {
      return violations;
    }

    BANNED_PATTERNS.forEach(({ pattern, message, severity }) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        const line = content.split('\n')[lineNumber - 1].trim();
        
        violations.push({
          file: filePath,
          line: lineNumber,
          column: match.index - content.lastIndexOf('\n', match.index - 1),
          message,
          severity,
          code: line
        });
      }
    });

    return violations;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return [];
  }
}

async function main() {
  console.log('🔍 Running Custom Response Pattern Checker...\n');

  try {
    // Find all TypeScript files in server/routes
    const files = await glob('server/routes/**/*.ts');
    files.push('server/routes.ts'); // Include main routes file

    let totalViolations = 0;
    let errorCount = 0;
    let warningCount = 0;

    for (const file of files) {
      if (!existsSync(file)) continue;

      const violations = checkFile(file);
      
      if (violations.length > 0) {
        console.log(`📁 ${file}:`);
        violations.forEach(violation => {
          const icon = violation.severity === 'error' ? '❌' : '⚠️';
          console.log(`  ${icon} Line ${violation.line}: ${violation.message}`);
          console.log(`     Code: ${violation.code}`);
          
          if (violation.severity === 'error') {
            errorCount++;
          } else {
            warningCount++;
          }
          totalViolations++;
        });
        console.log('');
      }
    }

    // Summary
    console.log('📊 Summary:');
    console.log(`   Files checked: ${files.length}`);
    console.log(`   Total violations: ${totalViolations}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Warnings: ${warningCount}`);

    if (errorCount > 0) {
      console.log('\n🚫 Response format violations detected!');
      console.log('   Please use sendSuccess() and sendError() utilities instead of direct res.json()');
      console.log('   Import from: ../utils/response or ./utils/response');
      process.exit(1);
    } else if (warningCount > 0) {
      console.log('\n⚠️  Minor issues detected, but enforcement passed');
      process.exit(0);
    } else {
      console.log('\n✅ All API routes follow standardized response format!');
      process.exit(0);
    }

  } catch (error) {
    console.error('💥 Error running response checker:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);