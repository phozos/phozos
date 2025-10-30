const fs = require('fs');
const path = require('path');

const repositoryFiles = [
  'server/repositories/university.repository.ts',
  'server/repositories/application.repository.ts',
  'server/repositories/document.repository.ts',
  'server/repositories/event.repository.ts',
  'server/repositories/notification.repository.ts',
  'server/repositories/forum.repository.ts',
  'server/repositories/chat.repository.ts',
  'server/repositories/ai-matching.repository.ts',
  'server/repositories/payment.repository.ts',
  'server/repositories/subscription.repository.ts',
  'server/repositories/security-settings.repository.ts',
  'server/repositories/testimonial.repository.ts',
  'server/repositories/student-timeline.repository.ts',
  'server/repositories/forum-reports.repository.ts'
];

function wrapMethodWithErrorHandling(content, className) {
  // Match async methods that don't already have try-catch
  const methodRegex = /(  async \w+\([^)]*\): [^{]+\{)\n(?!    try \{)/g;
  
  let result = content;
  let match;
  let offset = 0;
  
  const matches = [];
  while ((match = methodRegex.exec(content)) !== null) {
    matches.push({ index: match.index, match: match[0], signature: match[1] });
  }
  
  // Process matches in reverse to maintain indices
  for (let i = matches.length - 1; i >= 0; i--) {
    const { index, signature } = matches[i];
    
    // Extract method name
    const methodNameMatch = signature.match(/async (\w+)\(/);
    if (!methodNameMatch) continue;
    
    const methodName = methodNameMatch[1];
    const methodStart = index + signature.length;
    
    // Find the matching closing brace
    let braceCount = 1;
    let pos = methodStart + 1;
    while (braceCount > 0 && pos < result.length) {
      if (result[pos] === '{') braceCount++;
      if (result[pos] === '}') braceCount--;
      pos++;
    }
    
    if (braceCount === 0) {
      const methodBody = result.substring(methodStart + 1, pos - 1);
      const wrapped = `\n    try {${methodBody}    } catch (error) {\n      handleDatabaseError(error, '${className}.${methodName}');\n    }\n  `;
      result = result.substring(0, methodStart) + wrapped + result.substring(pos);
    }
  }
  
  return result;
}

function getClassName(content) {
  const match = content.match(/export class (\w+Repository)/);
  return match ? match[1] : 'Repository';
}

repositoryFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log(`Skipping ${file} - not found`);
    return;
  }
  
  let content = fs.readFileSync(file, 'utf8');
  
  // Skip if base repository (already done)
  if (file.includes('base.repository')) {
    console.log(`Skipping ${file} - base repository`);
    return;
  }
  
  // Check if methods already have try-catch
  const hasTryCatch = /async \w+\([^)]*\):[^{]+\{\s*try \{/.test(content);
  if (hasTryCatch && content.split('try {').length > 3) {
    console.log(`Skipping ${file} - already has error handling`);
    return;
  }
  
  const className = getClassName(content);
  const newContent = wrapMethodWithErrorHandling(content, className);
  
  if (newContent !== content) {
    fs.writeFileSync(file, newContent);
    console.log(`✓ Updated ${file} with error handling`);
  } else {
    console.log(`  No changes needed for ${file}`);
  }
});

console.log('\nError handling wrap complete!');
