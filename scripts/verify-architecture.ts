#!/usr/bin/env tsx
/**
 * Architecture Compliance Verification Script (Phase 6)
 * 
 * Verifies 100% compliance with all architectural rules:
 * - All services extend BaseService
 * - All services use constructor DI
 * - No direct database access in services
 * - All services throw domain-specific errors
 * - All create/update methods have validation
 * - Each service has single responsibility
 * - Controllers are thin (no business logic)
 */

import * as fs from 'fs';
import * as path from 'path';

interface ComplianceCheck {
  name: string;
  description: string;
  pass: boolean;
  details: string[];
  violations: string[];
}

interface ServiceInfo {
  name: string;
  path: string;
  extendsBaseService: boolean;
  usesConstructorDI: boolean;
  throwsDomainErrors: boolean;
  hasValidation: boolean;
  hasDirectDbAccess: boolean;
}

class ArchitectureVerifier {
  private servicesDir = path.join(process.cwd(), 'server/services/domain');
  private infrastructureDir = path.join(process.cwd(), 'server/services/infrastructure');
  private controllersDir = path.join(process.cwd(), 'server/controllers');
  
  private checks: ComplianceCheck[] = [];
  private serviceFiles: string[] = [];
  private infrastructureFiles: string[] = [];

  async verify(): Promise<void> {
    console.log('🔍 Architecture Compliance Verification (Phase 6)\n');
    console.log('=' .repeat(60));
    
    // Collect all service files
    this.serviceFiles = this.getServiceFiles(this.servicesDir);
    this.infrastructureFiles = this.getServiceFiles(this.infrastructureDir);
    
    // Run all checks
    await this.checkBaseServiceInheritance();
    await this.checkConstructorDI();
    await this.checkDomainErrors();
    await this.checkValidation();
    await this.checkDirectDbAccess();
    await this.checkSingleResponsibility();
    await this.checkThinControllers();
    
    // Generate report
    this.generateReport();
  }

  private getServiceFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    
    const files: string[] = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getServiceFiles(fullPath));
      } else if (item.endsWith('.service.ts') && !item.includes('.test.')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private async checkBaseServiceInheritance(): Promise<void> {
    const check: ComplianceCheck = {
      name: 'BaseService Inheritance',
      description: 'All services must extend BaseService',
      pass: true,
      details: [],
      violations: []
    };

    const allServiceFiles = [...this.serviceFiles, ...this.infrastructureFiles];
    
    for (const file of allServiceFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const fileName = path.basename(file);
      
      // Check if class extends BaseService
      const extendsBaseService = content.includes('extends BaseService');
      
      if (extendsBaseService) {
        check.details.push(`✅ ${fileName} extends BaseService`);
      } else {
        // Check if it's a valid exception (interfaces, etc.)
        if (content.includes('export class') || content.includes('export default class')) {
          check.violations.push(`❌ ${fileName} does NOT extend BaseService`);
          check.pass = false;
        }
      }
    }

    this.checks.push(check);
  }

  private async checkConstructorDI(): Promise<void> {
    const check: ComplianceCheck = {
      name: 'Constructor Dependency Injection',
      description: 'All services must use constructor DI (no direct repository imports)',
      pass: true,
      details: [],
      violations: []
    };

    const allServiceFiles = [...this.serviceFiles, ...this.infrastructureFiles];
    
    for (const file of allServiceFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const fileName = path.basename(file);
      
      // Check for direct repository imports (bad pattern)
      const hasDirectRepoImport = /from ['"].*repositories.*['"]/.test(content) && 
                                  !content.includes('IRepository') &&
                                  !content.includes('container.get');
      
      // Check for constructor with DI
      const hasConstructorDI = content.includes('constructor(') && 
                               (content.includes('private') || content.includes('public') || content.includes('protected'));
      
      if (!hasDirectRepoImport && hasConstructorDI) {
        check.details.push(`✅ ${fileName} uses constructor DI`);
      } else if (hasDirectRepoImport) {
        check.violations.push(`❌ ${fileName} has direct repository imports`);
        check.pass = false;
      }
    }

    this.checks.push(check);
  }

  private async checkDomainErrors(): Promise<void> {
    const check: ComplianceCheck = {
      name: 'Domain-Specific Errors',
      description: 'All services must throw domain-specific errors (no generic Error)',
      pass: true,
      details: [],
      violations: []
    };

    const allServiceFiles = [...this.serviceFiles, ...this.infrastructureFiles];
    
    for (const file of allServiceFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const fileName = path.basename(file);
      
      // Check for domain error imports
      const hasDomainErrorImport = content.includes("from '../errors'") || 
                                   content.includes("from './errors'") ||
                                   content.includes("from '../../services/errors'");
      
      // Check for generic Error throws (bad pattern)
      const hasGenericError = /throw new Error\(/.test(content);
      
      if (hasDomainErrorImport && !hasGenericError) {
        check.details.push(`✅ ${fileName} uses domain-specific errors`);
      } else if (hasGenericError) {
        check.violations.push(`❌ ${fileName} throws generic Error`);
        check.pass = false;
      } else if (!hasDomainErrorImport && content.includes('class')) {
        check.violations.push(`⚠️  ${fileName} may not have error handling`);
      }
    }

    this.checks.push(check);
  }

  private async checkValidation(): Promise<void> {
    const check: ComplianceCheck = {
      name: 'Validation Layer',
      description: 'All create/update methods must have validation',
      pass: true,
      details: [],
      violations: []
    };

    for (const file of this.serviceFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const fileName = path.basename(file);
      
      // Check for validation usage
      const hasValidation = content.includes('ValidationServiceError') ||
                           content.includes('CommonValidators') ||
                           content.includes('BusinessRuleValidators') ||
                           content.includes('validateRequired');
      
      // Check for create/update methods
      const hasCreateUpdate = /async\s+(create|update)/g.test(content);
      
      if (hasCreateUpdate && hasValidation) {
        check.details.push(`✅ ${fileName} has validation`);
      } else if (hasCreateUpdate && !hasValidation) {
        check.violations.push(`❌ ${fileName} has create/update but no validation`);
        check.pass = false;
      }
    }

    this.checks.push(check);
  }

  private async checkDirectDbAccess(): Promise<void> {
    const check: ComplianceCheck = {
      name: 'No Direct Database Access',
      description: 'Services must use repositories only (no direct db access)',
      pass: true,
      details: [],
      violations: []
    };

    const allServiceFiles = [...this.serviceFiles, ...this.infrastructureFiles];
    
    for (const file of allServiceFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const fileName = path.basename(file);
      
      // Check for direct DB access patterns
      const hasDirectDbAccess = /from\s+['"].*\/db['"]/.test(content) ||
                                content.includes('db.select') ||
                                content.includes('db.insert') ||
                                content.includes('db.update') ||
                                content.includes('db.delete');
      
      if (!hasDirectDbAccess) {
        check.details.push(`✅ ${fileName} uses repositories only`);
      } else {
        check.violations.push(`❌ ${fileName} has direct DB access`);
        check.pass = false;
      }
    }

    this.checks.push(check);
  }

  private async checkSingleResponsibility(): Promise<void> {
    const check: ComplianceCheck = {
      name: 'Single Responsibility Principle',
      description: 'Each service should have one clear domain responsibility',
      pass: true,
      details: [],
      violations: []
    };

    for (const file of this.serviceFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const fileName = path.basename(file);
      
      // Count number of public methods (rough heuristic)
      const publicMethods = content.match(/async\s+\w+\(/g) || [];
      const methodCount = publicMethods.length;
      
      // Services with too many methods likely violate SRP
      if (methodCount > 20) {
        check.violations.push(`⚠️  ${fileName} has ${methodCount} methods (may violate SRP)`);
        check.pass = false;
      } else {
        check.details.push(`✅ ${fileName} has ${methodCount} methods`);
      }
    }

    this.checks.push(check);
  }

  private async checkThinControllers(): Promise<void> {
    const check: ComplianceCheck = {
      name: 'Thin Controllers',
      description: 'Controllers should only handle HTTP concerns (no business logic)',
      pass: true,
      details: [],
      violations: []
    };

    if (!fs.existsSync(this.controllersDir)) {
      check.details.push('⚠️  Controllers directory not found');
      this.checks.push(check);
      return;
    }

    const controllerFiles = fs.readdirSync(this.controllersDir)
      .filter(f => f.endsWith('.controller.ts') && !f.includes('.test.'));
    
    for (const file of controllerFiles) {
      const fullPath = path.join(this.controllersDir, file);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      // Check for business logic patterns (bad in controllers)
      const hasBusinessLogic = content.includes('for (') && content.includes('if (') ||
                              content.includes('forEach') ||
                              /const\s+\w+\s*=\s*await\s+\w+Repository/.test(content);
      
      if (!hasBusinessLogic) {
        check.details.push(`✅ ${file} is thin (delegates to services)`);
      } else {
        check.violations.push(`⚠️  ${file} may contain business logic`);
      }
    }

    this.checks.push(check);
  }

  private generateReport(): void {
    console.log('\n📊 COMPLIANCE REPORT\n');
    console.log('=' .repeat(60));
    
    let allPassed = true;
    
    for (const check of this.checks) {
      const status = check.pass ? '✅ PASS' : '❌ FAIL';
      console.log(`\n${status} - ${check.name}`);
      console.log(`   ${check.description}`);
      
      if (check.violations.length > 0) {
        console.log('\n   Violations:');
        check.violations.forEach(v => console.log(`   ${v}`));
        allPassed = false;
      }
      
      if (check.details.length > 0 && check.details.length <= 5) {
        console.log('\n   Details:');
        check.details.forEach(d => console.log(`   ${d}`));
      } else if (check.details.length > 5) {
        console.log(`\n   ✅ ${check.details.length} services verified`);
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    
    const passedChecks = this.checks.filter(c => c.pass).length;
    const totalChecks = this.checks.length;
    const percentage = Math.round((passedChecks / totalChecks) * 100);
    
    console.log(`\n📈 OVERALL COMPLIANCE: ${passedChecks}/${totalChecks} checks passed (${percentage}%)\n`);
    
    if (allPassed) {
      console.log('🎉 ✅ ALL CHECKS PASSED - 100% ARCHITECTURAL COMPLIANCE!\n');
      process.exit(0);
    } else {
      console.log('⚠️  Some checks failed. Please review violations above.\n');
      process.exit(1);
    }
  }
}

// Run verification
const verifier = new ArchitectureVerifier();
verifier.verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
