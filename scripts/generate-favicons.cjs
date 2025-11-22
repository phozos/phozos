#!/usr/bin/env node

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SOURCE_LOGO = path.join(__dirname, '..', 'attached_assets', 'branding', 'logo', 'logo-white.png');
const OUTPUT_DIR = path.join(__dirname, '..', 'tmp', 'new-favicons');

const FAVICON_SPECS = [
  { name: 'favicon-16x16.png', size: 16, quality: 90, targetSize: '1-2KB' },
  { name: 'favicon-32x32.png', size: 32, quality: 95, targetSize: '2-3KB' },
  { name: 'favicon-48x48.png', size: 48, quality: 95, targetSize: '3-4KB' },
  { name: 'android-chrome-192x192.png', size: 192, quality: 95, targetSize: '15-25KB' },
  { name: 'android-chrome-512x512.png', size: 512, quality: 95, targetSize: '50-100KB' },
  { name: 'apple-touch-icon.png', size: 180, quality: 95, targetSize: '10-20KB' }
];

async function generateFavicons() {
  console.log('=== FAVICON GENERATION SCRIPT ===\n');
  
  if (!fs.existsSync(SOURCE_LOGO)) {
    console.error(`❌ Source logo not found: ${SOURCE_LOGO}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✓ Created output directory: ${OUTPUT_DIR}\n`);
  }
  
  console.log(`Source logo: ${SOURCE_LOGO}`);
  const sourceStats = fs.statSync(SOURCE_LOGO);
  console.log(`Source size: ${(sourceStats.size / 1024).toFixed(2)} KB\n`);
  
  console.log('Generating favicons...\n');
  
  for (const spec of FAVICON_SPECS) {
    const outputPath = path.join(OUTPUT_DIR, spec.name);
    
    try {
      await sharp(SOURCE_LOGO)
        .resize(spec.size, spec.size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({
          quality: spec.quality,
          compressionLevel: 9,
          palette: true
        })
        .toFile(outputPath);
      
      const stats = fs.statSync(outputPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      
      const metadata = await sharp(outputPath).metadata();
      console.log(`✓ ${spec.name}`);
      console.log(`  Dimensions: ${metadata.width}x${metadata.height}`);
      console.log(`  Size: ${sizeKB} KB (target: ${spec.targetSize})`);
      console.log();
      
    } catch (error) {
      console.error(`❌ Failed to generate ${spec.name}:`, error.message);
      process.exit(1);
    }
  }
  
  console.log('Optimizing with pngquant...\n');
  
  const pngquantPath = path.join(__dirname, '..', 'node_modules', '.bin', 'pngquant');
  
  if (fs.existsSync(pngquantPath)) {
    for (const spec of FAVICON_SPECS) {
      const filePath = path.join(OUTPUT_DIR, spec.name);
      const quality = spec.size <= 48 ? '80-95' : '90-95';
      
      try {
        execSync(`${pngquantPath} --quality=${quality} "${filePath}" --output "${filePath}" --force --skip-if-larger`, {
          stdio: 'pipe'
        });
        
        const stats = fs.statSync(filePath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`✓ Optimized ${spec.name}: ${sizeKB} KB`);
        
      } catch (error) {
        console.log(`⚠ pngquant optimization skipped for ${spec.name} (file might already be optimal)`);
      }
    }
  } else {
    console.log('⚠ pngquant not found, skipping additional optimization');
  }
  
  console.log('\n=== GENERATING FAVICON.ICO ===\n');
  
  const ico16 = path.join(OUTPUT_DIR, 'favicon-16x16.png');
  const ico32 = path.join(OUTPUT_DIR, 'favicon-32x32.png');
  const ico48 = path.join(OUTPUT_DIR, 'favicon-48x48.png');
  const icoOutput = path.join(OUTPUT_DIR, 'favicon.ico');
  
  console.log('⚠ favicon.ico generation requires additional tools (not available)');
  console.log('✓ You can use an online tool like https://www.icoconverter.com/');
  console.log('  Upload favicon-16x16.png, favicon-32x32.png, and favicon-48x48.png');
  console.log('  Or keep the existing favicon.ico (7.3KB, already optimized)\n');
  
  console.log('=== SUMMARY ===\n');
  console.log(`Generated files in: ${OUTPUT_DIR}\n`);
  
  let totalSize = 0;
  for (const spec of FAVICON_SPECS) {
    const filePath = path.join(OUTPUT_DIR, spec.name);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    }
  }
  
  console.log(`Total size of generated favicons: ${(totalSize / 1024).toFixed(2)} KB`);
  console.log(`Original total size: ~5625 KB (6 files × 938KB)`);
  console.log(`Size reduction: ${((1 - totalSize / (6 * 938 * 1024)) * 100).toFixed(1)}%\n`);
  
  console.log('✓ All favicons generated successfully!');
  console.log('\nNext steps:');
  console.log('1. Review generated files in tmp/new-favicons/');
  console.log('2. Proceed to PHASE 2: Backup current assets');
  console.log('3. Proceed to PHASE 4: Replace favicon files\n');
}

generateFavicons().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
