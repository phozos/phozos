#!/usr/bin/env node

/**
 * TypeScript Validation Script for Phozos
 * Prevents community forum and other TypeScript compilation issues
 */

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🔍 Running Phozos TypeScript validation...\n');

// 1. Check TypeScript compilation
console.log('📝 Checking TypeScript compilation...');
try {
  execSync('npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful\n');
} catch (error) {
  console.log('❌ TypeScript compilation errors detected:');
  try {
    const output = execSync('npx tsc --noEmit --skipLibCheck', { encoding: 'utf8' });
    console.log(output);
  } catch (e) {
    console.log('   Run "npx tsc --noEmit" manually for detailed error information');
  }
  console.log('');
}

// 2. Validate Community Forum TypeScript interfaces
console.log('🏛️  Validating Community Forum interfaces...');
try {
  const communityPath = 'client/src/pages/Community.tsx';
  
  if (fs.existsSync(communityPath)) {
    const communityContent = fs.readFileSync(communityPath, 'utf8');
    
    // Check for required interface fields
    const checks = [
      { 
        name: 'ForumPost interface with userType field', 
        test: communityContent.includes('userType?:') || communityContent.includes('userType:') 
      },
      { 
        name: 'ForumPost interface with companyName field', 
        test: communityContent.includes('companyName?:') || communityContent.includes('companyName:') 
      },
      { 
        name: 'Correct handlePostClick parameter passing', 
        test: communityContent.includes('handlePostClick(post.id)') 
      }
    ];
    
    checks.forEach(check => {
      if (check.test) {
        console.log(`   ✅ ${check.name}`);
      } else {
        console.log(`   ❌ ${check.name} - NEEDS FIX`);
      }
    });
  } else {
    console.log('   ⚠️  Community.tsx not found');
  }
  
  // Note: Backend data contract validation removed - now handled by repository layer
  console.log('   ℹ️  Backend API validation skipped (legacy db-storage.ts removed)');
  
} catch (error) {
  console.log(`   ❌ Error validating Community Forum: ${error.message}`);
}

console.log('');

// 3. Check critical component imports
console.log('🧩 Validating critical component imports...');
try {
  const criticalFiles = [
    'client/src/pages/AdminDashboard.tsx',
    'client/src/pages/StudentDashboard.tsx',
    'client/src/pages/CounselorDashboard.tsx'
  ];
  
  criticalFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      const imports = [
        { name: 'Switch', pattern: /import.*Switch.*from.*switch/ },
        { name: 'Dialog', pattern: /import.*Dialog.*from.*dialog/ },
        { name: 'Toast', pattern: /import.*Toast.*from.*toast/ }
      ];
      
      console.log(`   📄 ${filePath.split('/').pop()}:`);
      imports.forEach(imp => {
        if (imp.pattern.test(content)) {
          console.log(`      ✅ ${imp.name} imported correctly`);
        } else {
          console.log(`      ⚠️  ${imp.name} import not found`);
        }
      });
    }
  });
} catch (error) {
  console.log(`   ❌ Error checking imports: ${error.message}`);
}

console.log('');

// 4. Schema consistency check
console.log('🗃️  Checking schema consistency...');
try {
  const schemaPath = 'shared/schema.ts';
  
  if (fs.existsSync(schemaPath)) {
    console.log('   ✅ Schema file exists');
    console.log('   ℹ️  Legacy db-storage validation removed - using repository pattern');
  } else {
    console.log('   ❌ Schema file not found');
  }
} catch (error) {
  console.log(`   ❌ Error checking schema: ${error.message}`);
}

console.log('\n🎯 TypeScript validation complete!');
console.log('💡 Run this script after any schema or interface changes to prevent compilation issues.');