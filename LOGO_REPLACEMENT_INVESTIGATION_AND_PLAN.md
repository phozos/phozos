# LOGO REPLACEMENT - COMPREHENSIVE INVESTIGATION & IMPLEMENTATION PLAN

**Investigation Date**: November 19, 2025  
**Scope**: Complete investigation of logo usage and detailed phase-by-phase replacement plan  
**Status**: INVESTIGATION COMPLETE - READY FOR IMPLEMENTATION

---

## EXECUTIVE SUMMARY

### Critical Findings
1. **Duplicate Logo Files**: Two identical logo files exist (MD5: 34dc5637efc9d5c32818d18afceff8d4)
   - `attached_assets/branding/logo/logo-white.png` (22KB)
   - `client/src/assets/branding/logo/logo-white.png` (22KB)

2. **Active File Path**: All 8 components use `@assets/branding/logo/logo-white.png`
   - Vite alias `@assets` points to `attached_assets/` directory
   - File in `client/src/assets/` is **NOT USED** and should be removed

3. **Favicon Files - CRITICAL ISSUE**: All 6 PNG favicon files are **SEVERELY OVERSIZED**
   - Current size: **938KB each** (959,913 bytes)
   - Current dimensions: **512x512 pixels for ALL files**
   - Expected sizes: 16x16, 32x32, 48x48, 192x192, 512x512, 180x180
   - **Impact**: Massive performance degradation, poor Core Web Vitals scores

4. **Logo Usage**: Found in 8 components across the application
5. **No Build Scripts**: No automated logo generation or copying processes
6. **Image Optimization**: Vite imagemin plugin configured but only affects production builds

---

## 1. INVESTIGATION RESULTS

### 1.1 Vite Configuration Analysis

**File**: `vite.config.ts`

#### Alias Configuration (Lines 64-68)
```typescript
resolve: {
  alias: {
    "@": path.resolve(import.meta.dirname, "client", "src"),
    "@shared": path.resolve(import.meta.dirname, "shared"),
    "@assets": path.resolve(import.meta.dirname, "attached_assets"),  // ← ACTIVE PATH
  },
}
```

**Verification**: ✅ Confirmed  
- `@assets` resolves to `attached_assets/` directory
- Logo import `@assets/branding/logo/logo-white.png` → `attached_assets/branding/logo/logo-white.png`
- The file in `client/src/assets/branding/logo/` is **ORPHANED** and unused

#### Build Configuration (Lines 70-73)
```typescript
root: path.resolve(import.meta.dirname, "client"),
publicDir: 'public',
build: {
  outDir: path.resolve(import.meta.dirname, "dist/public"),
  emptyOutDir: true,
  copyPublicDir: true,  // ← Copies client/public/* to dist/public/
```

**Key Points**:
- Public directory (`client/public/`) is copied to build output
- Favicon files are served directly from public directory
- No processing or optimization during copy (imagemin only affects imported assets)

#### Image Optimization (Lines 19-45)
```typescript
viteImagemin({
  gifsicle: { optimizationLevel: 7 },
  optipng: { optimizationLevel: 7 },
  mozjpeg: { quality: 80 },
  pngquant: { quality: [0.8, 0.9], speed: 4 },
  webp: { quality: 85 },
})
```

**Important**: Only applies to:
- Production builds (`npm run build`)
- Assets imported in code (like logo-white.png)
- **DOES NOT** apply to `client/public/` files (favicon files)

### 1.2 Logo File Analysis

#### Current Logo Files

| Location | Size | MD5 Hash | Status |
|----------|------|----------|--------|
| `attached_assets/branding/logo/logo-white.png` | 22KB | 34dc5637efc9d5c32818d18afceff8d4 | ✅ **ACTIVE** |
| `client/src/assets/branding/logo/logo-white.png` | 22KB | 34dc5637efc9d5c32818d18afceff8d4 | ❌ **ORPHANED** |

**Verification Method**:
```bash
md5sum attached_assets/branding/logo/logo-white.png client/src/assets/branding/logo/logo-white.png
# Both return: 34dc5637efc9d5c32818d18afceff8d4
```

**PNG Signature Verification**:
```
89 50 4e 47 0d 0a 1a 0a  # Valid PNG header
```

**Dimensions**: 512x512 pixels (extracted from PNG header: 131072 / 256 = 512)

### 1.3 Component Logo Usage Analysis

#### All 8 Components Using Logo

| # | Component Path | Import Statement | Usage Pattern |
|---|----------------|------------------|---------------|
| 1 | `client/src/components/Navigation.tsx` | Line 18 | `<img src={logoWhite} alt="Phozos" />` in header |
| 2 | `client/src/components/AppShell.tsx` | Line 41 | Logo in main navigation shell |
| 3 | `client/src/components/Footer.tsx` | Line 4 | `<img src={logoWhite} alt="Phozos Logo" />` with lazy loading |
| 4 | `client/src/components/LoadingScreen.tsx` | Line 1 | Logo in loading/splash screen animation |
| 5 | `client/src/components/mobile/MobileTopHeader.tsx` | Line 2 | Mobile header logo (6x6 display) |
| 6 | `client/src/pages/Auth.tsx` | Line 16 | Authentication page branding |
| 7 | `client/src/pages/PartnerRegistration.tsx` | Line 27 | Partner registration branding |
| 8 | `client/src/pages/StaffInvite.tsx` | Line 11 | Staff invitation page branding |

**Common Pattern**:
```typescript
import logoWhite from "@assets/branding/logo/logo-white.png";

// Usage examples:
<img src={logoWhite} alt="Phozos Logo" className="h-8 w-auto" loading="lazy" />
<img src={logoWhite} alt="Phozos Logo" className="w-full h-full object-contain" />
```

**Display Sizes**:
- Navigation/Header: `h-8` (32px height)
- Footer: `h-8` (32px height)
- Loading Screen: `w-16 h-16` (64px)
- Mobile Header: `w-6 h-6` (24px)
- Auth Pages: Various sizes with gradient backgrounds

### 1.4 Favicon Files Analysis - CRITICAL

#### Current Favicon Structure

| File | Expected Size | Actual Size | Actual Bytes | Status |
|------|---------------|-------------|--------------|---------|
| `favicon.ico` | Multiple sizes | N/A | 7,477 bytes | ✅ OK |
| `favicon-16x16.png` | 16x16 | **512x512** | 959,913 bytes | ❌ **WRONG** |
| `favicon-32x32.png` | 32x32 | **512x512** | 959,913 bytes | ❌ **WRONG** |
| `favicon-48x48.png` | 48x48 | **512x512** | 959,913 bytes | ❌ **WRONG** |
| `android-chrome-192x192.png` | 192x192 | **512x512** | 959,913 bytes | ❌ **WRONG** |
| `android-chrome-512x512.png` | 512x512 | **512x512** | 938KB | ⚠️ **TOO LARGE** |
| `apple-touch-icon.png` | 180x180 | **512x512** | 959,913 bytes | ❌ **WRONG** |

**Critical Issues**:
1. **All PNG files are the same 512x512 source image** (not properly sized)
2. **Each file is 938KB** instead of properly optimized sizes:
   - 16x16 should be ~1KB
   - 32x32 should be ~2KB
   - 48x48 should be ~3KB
   - 192x192 should be ~15-20KB
   - 512x512 should be ~50-100KB (with optimization)
   - 180x180 should be ~10-15KB

3. **Performance Impact**:
   - Browser downloads **5.6MB** of favicon images for a single page
   - Terrible LCP (Largest Contentful Paint) scores
   - Wasted bandwidth on every page load
   - Poor mobile performance

#### HTML References (`client/index.html` lines 21-28)
```html
<!-- Favicon and App Icons -->
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" content="#8B5CF6" />
<meta name="msapplication-TileColor" content="#8B5CF6" />
```

**Note**: `favicon-48x48.png` is referenced in manifest but not in HTML.

#### Web Manifest (`client/public/site.webmanifest`)
```json
{
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 1.5 Build Process Analysis

#### Build Commands (`package.json`)
```json
{
  "dev": "tsx server/index.ts",
  "build": "vite build && esbuild server/index.ts --platform=node...",
  "build:backend": "esbuild server/index.ts --platform=node...",
  "start": "node dist/index.js"
}
```

**Findings**:
- ✅ No automated logo generation scripts
- ✅ No copy/move operations in build process
- ✅ No imagemin processing for public directory files
- ✅ Clean separation: imported assets vs public files

#### Vite Cache
**Location**: `node_modules/.vite/deps/`
**Impact**: Cached module dependencies, logo changes trigger automatic rebuild
**Clearing**: Automatic on file change detection

### 1.6 Cache Considerations

#### Browser Caching
**Current Setup**:
- No custom Cache-Control headers found in `server/middleware/security.ts`
- Default Express static file serving (no explicit caching)
- Vite dev server uses standard cache headers

**Implications for Logo Update**:
1. Browser may cache old logo/favicon files
2. Users need hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
3. Production: Consider adding cache-busting query params or versioning

#### Vite HMR (Hot Module Replacement)
**Configuration** (`vite.config.ts` lines 105-106):
```typescript
...(buildConfig.HMR_ENABLED ? {} : { hmr: false, ws: false }),
```

**Impact**:
- Dev mode: Logo changes auto-refresh with HMR
- Production: Full rebuild required

### 1.7 Social Media Images (DO NOT TOUCH)

| File | Purpose | Status |
|------|---------|--------|
| `client/public/og-image.png` | Open Graph default image | ✅ Keep as-is |
| `client/public/og-home.png` | Home page OG image | ✅ Keep as-is |
| `client/public/og-plans.png` | Plans page OG image | ✅ Keep as-is |

**Reason**: These are social media preview images, not logo files.

---

## 2. DETAILED PHASE-BY-PHASE IMPLEMENTATION PLAN

### PHASE 0: Pre-Update Verification Checklist

**Purpose**: Ensure clean state before making changes

#### 0.1 Verify Current State
```bash
# Check active logo file
ls -lh attached_assets/branding/logo/logo-white.png
md5sum attached_assets/branding/logo/logo-white.png

# Check orphaned logo file
ls -lh client/src/assets/branding/logo/logo-white.png
md5sum client/src/assets/branding/logo/logo-white.png

# Verify all favicon files
ls -lh client/public/favicon*.png client/public/android-chrome-*.png client/public/apple-touch-icon.png

# Check if application is running
curl http://localhost:5000 -I
```

#### 0.2 Document Current Logo Appearance
- [ ] Take screenshot of Navigation header
- [ ] Take screenshot of Footer
- [ ] Take screenshot of Loading screen
- [ ] Take screenshot of Mobile header
- [ ] Take screenshot of Auth page
- [ ] Check favicon in browser tab
- [ ] Check favicon on mobile (if testing)

#### 0.3 Verify Build Status
```bash
# Clean any existing build artifacts
rm -rf dist/

# Verify no uncommitted changes
git status
```

#### 0.4 Prepare Testing Checklist
- [ ] Browser cache clearing documented
- [ ] Multiple browsers ready (Chrome, Firefox, Safari)
- [ ] Mobile testing environment ready (if applicable)
- [ ] Screenshot comparison tool ready

---

### PHASE 1: Prepare New Logo Assets

**Purpose**: Generate all required logo/favicon files with correct specifications

#### 1.1 Main Application Logo Specifications

**File**: `logo-white.png` (or new logo filename)

**Requirements**:
- **Format**: PNG with transparency
- **Recommended Size**: 512x512 pixels (square)
- **Color**: White/light colored for dark backgrounds
- **Optimization**: Use PNG compression (pngquant, optipng, or similar)
- **Target Size**: Under 50KB for optimal performance
- **Background**: Transparent
- **Use Case**: Displayed at various sizes (24px to 64px typically)

**Quality Checklist**:
- [ ] High resolution (512x512 or higher)
- [ ] Clean edges (no artifacts)
- [ ] Transparent background
- [ ] White/light color scheme
- [ ] Optimized file size (< 50KB)
- [ ] Looks good at small sizes (test at 32px, 64px)

#### 1.2 Favicon Files Specifications

**CRITICAL**: Each file must be properly sized and optimized.

##### File 1: `favicon.ico`
- **Format**: ICO (Microsoft Icon)
- **Sizes**: Multiple sizes embedded (16x16, 32x32, 48x48)
- **Target File Size**: 5-15KB
- **Generation**: Use online tool or ImageMagick
- **Command Example**:
  ```bash
  convert logo-source.png -resize 16x16 -define icon:auto-resize=16,32,48 favicon.ico
  ```

##### File 2: `favicon-16x16.png`
- **Dimensions**: 16x16 pixels (EXACT)
- **Format**: PNG-8 or PNG-24 with transparency
- **Target File Size**: 500 bytes - 2KB
- **Use Case**: Browser tabs, bookmarks
- **Optimization**: High compression, limited colors acceptable
- **Command Example**:
  ```bash
  convert logo-source.png -resize 16x16 -quality 90 favicon-16x16.png
  pngquant --quality=80-95 favicon-16x16.png -o favicon-16x16.png --force
  ```

##### File 3: `favicon-32x32.png`
- **Dimensions**: 32x32 pixels (EXACT)
- **Format**: PNG-24 with transparency
- **Target File Size**: 1-3KB
- **Use Case**: Browser tabs (high DPI), taskbar
- **Optimization**: Good compression, maintain quality
- **Command Example**:
  ```bash
  convert logo-source.png -resize 32x32 -quality 95 favicon-32x32.png
  pngquant --quality=85-95 favicon-32x32.png -o favicon-32x32.png --force
  ```

##### File 4: `favicon-48x48.png`
- **Dimensions**: 48x48 pixels (EXACT)
- **Format**: PNG-24 with transparency
- **Target File Size**: 2-4KB
- **Use Case**: Windows taskbar, desktop shortcuts
- **Optimization**: Balanced compression
- **Command Example**:
  ```bash
  convert logo-source.png -resize 48x48 -quality 95 favicon-48x48.png
  pngquant --quality=85-95 favicon-48x48.png -o favicon-48x48.png --force
  ```

##### File 5: `android-chrome-192x192.png`
- **Dimensions**: 192x192 pixels (EXACT)
- **Format**: PNG-24 with transparency
- **Target File Size**: 10-25KB
- **Use Case**: Android home screen shortcut
- **Optimization**: Good quality, reasonable compression
- **Command Example**:
  ```bash
  convert logo-source.png -resize 192x192 -quality 95 android-chrome-192x192.png
  pngquant --quality=90-95 android-chrome-192x192.png -o android-chrome-192x192.png --force
  ```

##### File 6: `android-chrome-512x512.png`
- **Dimensions**: 512x512 pixels (EXACT)
- **Format**: PNG-24 with transparency
- **Target File Size**: 40-100KB
- **Use Case**: Android splash screen, PWA icon
- **Optimization**: High quality, moderate compression
- **Command Example**:
  ```bash
  convert logo-source.png -resize 512x512 -quality 95 android-chrome-512x512.png
  pngquant --quality=90-95 android-chrome-512x512.png -o android-chrome-512x512.png --force
  ```

##### File 7: `apple-touch-icon.png`
- **Dimensions**: 180x180 pixels (EXACT)
- **Format**: PNG-24 with transparency or solid background
- **Target File Size**: 8-20KB
- **Use Case**: iOS home screen shortcut
- **Special Note**: iOS adds rounded corners automatically
- **Background**: Can be transparent OR solid color (#8B5CF6 to match theme)
- **Optimization**: Good quality
- **Command Example**:
  ```bash
  convert logo-source.png -resize 180x180 -quality 95 apple-touch-icon.png
  pngquant --quality=90-95 apple-touch-icon.png -o apple-touch-icon.png --force
  ```

#### 1.3 Asset Generation Workflow

**Option A: Using ImageMagick & pngquant (Recommended)**
```bash
# Install tools (if not available)
# Ubuntu/Debian: sudo apt-get install imagemagick pngquant
# macOS: brew install imagemagick pngquant

# Source file: your-new-logo.png (should be high resolution, e.g., 1024x1024)

# Main logo (512x512, optimized)
convert your-new-logo.png -resize 512x512 -quality 95 logo-white-temp.png
pngquant --quality=85-95 logo-white-temp.png -o logo-white.png --force
rm logo-white-temp.png

# Favicon ICO (multi-size)
convert your-new-logo.png -resize 48x48 -define icon:auto-resize=16,32,48 favicon.ico

# Favicon PNGs
convert your-new-logo.png -resize 16x16 -quality 90 favicon-16x16-temp.png
pngquant --quality=80-95 favicon-16x16-temp.png -o favicon-16x16.png --force

convert your-new-logo.png -resize 32x32 -quality 95 favicon-32x32-temp.png
pngquant --quality=85-95 favicon-32x32-temp.png -o favicon-32x32.png --force

convert your-new-logo.png -resize 48x48 -quality 95 favicon-48x48-temp.png
pngquant --quality=85-95 favicon-48x48-temp.png -o favicon-48x48.png --force

# Android Chrome icons
convert your-new-logo.png -resize 192x192 -quality 95 android-chrome-192x192-temp.png
pngquant --quality=90-95 android-chrome-192x192-temp.png -o android-chrome-192x192.png --force

convert your-new-logo.png -resize 512x512 -quality 95 android-chrome-512x512-temp.png
pngquant --quality=90-95 android-chrome-512x512-temp.png -o android-chrome-512x512.png --force

# Apple Touch Icon
convert your-new-logo.png -resize 180x180 -quality 95 apple-touch-icon-temp.png
pngquant --quality=90-95 apple-touch-icon-temp.png -o apple-touch-icon.png --force

# Cleanup temp files
rm *-temp.png
```

**Option B: Online Tools**
- [RealFaviconGenerator](https://realfavicongenerator.net/) - Comprehensive favicon generator
- [Favicon.io](https://favicon.io/) - Simple favicon generation
- [TinyPNG](https://tinypng.com/) - PNG optimization
- [Squoosh](https://squoosh.app/) - Advanced image optimization

#### 1.4 Validation Checklist

After generating all assets, verify:

```bash
# Check file sizes
ls -lh logo-white.png favicon*.png android-chrome-*.png apple-touch-icon.png

# Verify dimensions (requires ImageMagick)
identify logo-white.png  # Should show 512x512
identify favicon-16x16.png  # Should show 16x16
identify favicon-32x32.png  # Should show 32x32
identify favicon-48x48.png  # Should show 48x48
identify android-chrome-192x192.png  # Should show 192x192
identify android-chrome-512x512.png  # Should show 512x512
identify apple-touch-icon.png  # Should show 180x180
```

**Expected Output Example**:
```
logo-white.png PNG 512x512 512x512+0+0 8-bit sRGB 45KB
favicon-16x16.png PNG 16x16 16x16+0+0 8-bit sRGB 1.2KB
favicon-32x32.png PNG 32x32 32x32+0+0 8-bit sRGB 2.3KB
...
```

**File Size Validation**:
- [ ] Main logo: < 50KB ✓
- [ ] favicon-16x16.png: < 2KB ✓
- [ ] favicon-32x32.png: < 3KB ✓
- [ ] favicon-48x48.png: < 4KB ✓
- [ ] android-chrome-192x192.png: < 25KB ✓
- [ ] android-chrome-512x512.png: < 100KB ✓
- [ ] apple-touch-icon.png: < 20KB ✓
- [ ] favicon.ico: < 15KB ✓

---

### PHASE 2: Backup Current Assets

**Purpose**: Create rollback point before making changes

#### 2.1 Create Backup Directory
```bash
mkdir -p backups/logo-replacement-$(date +%Y%m%d)
cd backups/logo-replacement-$(date +%Y%m%d)
```

#### 2.2 Backup Active Logo
```bash
# Backup the actively used logo file
cp ../../attached_assets/branding/logo/logo-white.png ./logo-white.png.backup
md5sum ./logo-white.png.backup > logo-white.png.backup.md5
```

#### 2.3 Backup Orphaned Logo (for completeness)
```bash
# Backup the unused duplicate
cp ../../client/src/assets/branding/logo/logo-white.png ./logo-white-orphaned.png.backup
md5sum ./logo-white-orphaned.png.backup > logo-white-orphaned.png.backup.md5
```

#### 2.4 Backup All Favicon Files
```bash
# Backup all favicon and app icon files
cp ../../client/public/favicon.ico ./favicon.ico.backup
cp ../../client/public/favicon-16x16.png ./favicon-16x16.png.backup
cp ../../client/public/favicon-32x32.png ./favicon-32x32.png.backup
cp ../../client/public/favicon-48x48.png ./favicon-48x48.png.backup
cp ../../client/public/android-chrome-192x192.png ./android-chrome-192x192.png.backup
cp ../../client/public/android-chrome-512x512.png ./android-chrome-512x512.png.backup
cp ../../client/public/apple-touch-icon.png ./apple-touch-icon.png.backup

# Create checksums for all backups
md5sum *.backup > all-backups.md5
```

#### 2.5 Backup Configuration Files
```bash
# Backup HTML (contains favicon references)
cp ../../client/index.html ./index.html.backup

# Backup manifest (contains icon references)
cp ../../client/public/site.webmanifest ./site.webmanifest.backup
```

#### 2.6 Create Backup Manifest
```bash
cat > BACKUP_MANIFEST.txt << 'EOF'
LOGO REPLACEMENT BACKUP
=======================
Date: $(date)
Backup Location: backups/logo-replacement-$(date +%Y%m%d)/

Files Backed Up:
1. Active Logo:
   - attached_assets/branding/logo/logo-white.png
   
2. Orphaned Logo:
   - client/src/assets/branding/logo/logo-white.png
   
3. Favicon Files:
   - client/public/favicon.ico
   - client/public/favicon-16x16.png
   - client/public/favicon-32x32.png
   - client/public/favicon-48x48.png
   - client/public/android-chrome-192x192.png
   - client/public/android-chrome-512x512.png
   - client/public/apple-touch-icon.png
   
4. Configuration Files:
   - client/index.html
   - client/public/site.webmanifest

Rollback Instructions:
To restore all files, run:
  ./restore-backup.sh

MD5 Checksums:
See all-backups.md5
EOF
```

#### 2.7 Create Restore Script
```bash
cat > restore-backup.sh << 'SCRIPT'
#!/bin/bash
set -e

echo "Restoring logo and favicon files from backup..."

# Restore active logo
cp logo-white.png.backup ../../attached_assets/branding/logo/logo-white.png
echo "✓ Restored active logo"

# Restore orphaned logo
cp logo-white-orphaned.png.backup ../../client/src/assets/branding/logo/logo-white.png
echo "✓ Restored orphaned logo"

# Restore favicon files
cp favicon.ico.backup ../../client/public/favicon.ico
cp favicon-16x16.png.backup ../../client/public/favicon-16x16.png
cp favicon-32x32.png.backup ../../client/public/favicon-32x32.png
cp favicon-48x48.png.backup ../../client/public/favicon-48x48.png
cp android-chrome-192x192.png.backup ../../client/public/android-chrome-192x192.png
cp android-chrome-512x512.png.backup ../../client/public/android-chrome-512x512.png
cp apple-touch-icon.png.backup ../../client/public/apple-touch-icon.png
echo "✓ Restored all favicon files"

# Restore config files
cp index.html.backup ../../client/index.html
cp site.webmanifest.backup ../../client/public/site.webmanifest
echo "✓ Restored configuration files"

echo "Backup restoration complete!"
echo "Clear browser cache and restart development server."
SCRIPT

chmod +x restore-backup.sh
```

#### 2.8 Verify Backup
```bash
# List all backed up files
ls -lh *.backup

# Verify checksums
md5sum -c all-backups.md5

# Count files
echo "Total files backed up: $(ls -1 *.backup | wc -l)"
```

**Expected Output**: 10 backup files created successfully

---

### PHASE 3: Update Main Application Logo

**Purpose**: Replace the actively used logo file

#### 3.1 Prepare New Logo File

**Location**: Should be ready from Phase 1  
**Filename**: `logo-white.png` (or your new logo filename)  
**Specification**: 512x512 pixels, < 50KB, PNG with transparency

#### 3.2 Replace Active Logo
```bash
# Copy new logo to active location
cp /path/to/new/logo-white.png attached_assets/branding/logo/logo-white.png

# Verify file
ls -lh attached_assets/branding/logo/logo-white.png
md5sum attached_assets/branding/logo/logo-white.png
identify attached_assets/branding/logo/logo-white.png  # Should show 512x512
```

#### 3.3 Clear Vite Cache (if needed)
```bash
# Remove Vite dependency cache
rm -rf node_modules/.vite/deps/

# Or restart development server (auto-clears cache)
```

#### 3.4 Verify in Development
```bash
# Start development server (if not already running)
npm run dev

# Server should be at http://localhost:5000
# Check browser for updated logo in:
# - Navigation header
# - Footer
# - Loading screen
# - Mobile header (if testing on mobile)
```

#### 3.5 Testing Checklist

**Visual Verification** (use screenshots from Phase 0 for comparison):
- [ ] Navigation header shows new logo
- [ ] Footer shows new logo
- [ ] Loading screen shows new logo
- [ ] Mobile header shows new logo (if testing)
- [ ] Auth page shows new logo
- [ ] Partner registration page shows new logo
- [ ] Staff invite page shows new logo

**Technical Verification**:
```bash
# Check browser console for errors
# Open DevTools → Console → look for 404 or image load errors

# Check network tab for logo file
# Open DevTools → Network → Filter: PNG → Refresh page
# Verify logo-white.png loads successfully with status 200
```

**Hard Refresh Required**:
- Chrome/Edge: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
- Firefox: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
- Safari: Cmd+Option+R

#### 3.6 Troubleshooting

**Issue**: Logo not updating in browser
- **Solution 1**: Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
- **Solution 2**: Clear browser cache completely
- **Solution 3**: Restart development server
- **Solution 4**: Remove Vite cache: `rm -rf node_modules/.vite/`

**Issue**: Logo appears at wrong size
- **Cause**: File dimensions incorrect
- **Solution**: Verify with `identify logo-white.png`
- **Expected**: 512x512 pixels

**Issue**: Logo has white background instead of transparency
- **Cause**: PNG doesn't have alpha channel
- **Solution**: Re-export logo with transparency enabled

---

### PHASE 4: Update Favicons/App Icons

**Purpose**: Replace all 7 favicon/icon files with properly sized and optimized versions

#### 4.1 Pre-Update Verification

**CRITICAL**: Ensure all new favicon files are ready from Phase 1

```bash
# Verify you have all 7 files ready
ls -1 /path/to/new/favicons/
# Expected output:
# favicon.ico
# favicon-16x16.png
# favicon-32x32.png
# favicon-48x48.png
# android-chrome-192x192.png
# android-chrome-512x512.png
# apple-touch-icon.png

# Verify dimensions of each file
identify /path/to/new/favicons/favicon-16x16.png  # Must be 16x16
identify /path/to/new/favicons/favicon-32x32.png  # Must be 32x32
identify /path/to/new/favicons/favicon-48x48.png  # Must be 48x48
identify /path/to/new/favicons/android-chrome-192x192.png  # Must be 192x192
identify /path/to/new/favicons/android-chrome-512x512.png  # Must be 512x512
identify /path/to/new/favicons/apple-touch-icon.png  # Must be 180x180
```

#### 4.2 Replace Favicon Files

**IMPORTANT**: Do NOT replace og-image.png, og-home.png, or og-plans.png

```bash
# Navigate to public directory
cd client/public/

# Replace favicon.ico
cp /path/to/new/favicons/favicon.ico ./favicon.ico
echo "✓ Replaced favicon.ico"

# Replace 16x16 favicon
cp /path/to/new/favicons/favicon-16x16.png ./favicon-16x16.png
echo "✓ Replaced favicon-16x16.png"

# Replace 32x32 favicon
cp /path/to/new/favicons/favicon-32x32.png ./favicon-32x32.png
echo "✓ Replaced favicon-32x32.png"

# Replace 48x48 favicon (used in manifest)
cp /path/to/new/favicons/favicon-48x48.png ./favicon-48x48.png
echo "✓ Replaced favicon-48x48.png"

# Replace Android Chrome 192x192
cp /path/to/new/favicons/android-chrome-192x192.png ./android-chrome-192x192.png
echo "✓ Replaced android-chrome-192x192.png"

# Replace Android Chrome 512x512
cp /path/to/new/favicons/android-chrome-512x512.png ./android-chrome-512x512.png
echo "✓ Replaced android-chrome-512x512.png"

# Replace Apple Touch Icon
cp /path/to/new/favicons/apple-touch-icon.png ./apple-touch-icon.png
echo "✓ Replaced apple-touch-icon.png"

# Return to project root
cd ../..
```

#### 4.3 Verify Replacements

```bash
# Check file sizes (should be much smaller than before)
ls -lh client/public/favicon*.png client/public/android-chrome-*.png client/public/apple-touch-icon.png

# Expected sizes:
# favicon-16x16.png: ~1-2KB (was 938KB)
# favicon-32x32.png: ~2-3KB (was 938KB)
# favicon-48x48.png: ~3-4KB (was 938KB)
# android-chrome-192x192.png: ~15-25KB (was 938KB)
# android-chrome-512x512.png: ~50-100KB (was 938KB)
# apple-touch-icon.png: ~10-20KB (was 938KB)

# Verify dimensions
identify client/public/favicon-16x16.png  # Must show 16x16
identify client/public/favicon-32x32.png  # Must show 32x32
identify client/public/favicon-48x48.png  # Must show 48x48
identify client/public/android-chrome-192x192.png  # Must show 192x192
identify client/public/android-chrome-512x512.png  # Must show 512x512
identify client/public/apple-touch-icon.png  # Must show 180x180
```

#### 4.4 Update site.webmanifest (if needed)

**Current configuration** (`client/public/site.webmanifest`):
```json
{
  "name": "Phozos Study Abroad",
  "short_name": "Phozos",
  "description": "Your Global Education Journey",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#8B5CF6",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Action**: No changes needed unless:
- Adding new icon sizes
- Changing theme colors to match new branding
- Updating app name/description

**If updating theme_color**:
```bash
# Edit client/public/site.webmanifest
# AND update client/index.html meta tags (lines 27-28)
```

#### 4.5 Verify HTML References

**File**: `client/index.html` (lines 21-28)

**Current configuration**:
```html
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" content="#8B5CF6" />
<meta name="msapplication-TileColor" content="#8B5CF6" />
```

**Action**: No changes needed (filenames unchanged)

**Optional**: Add 48x48 reference if desired:
```html
<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
```

#### 4.6 Performance Impact Verification

**Before replacement**:
- Total favicon size: ~5.6MB (6 × 938KB)
- Page load includes 5.6MB of unnecessary data

**After replacement** (expected):
- Total favicon size: ~150-200KB
- **Reduction**: ~5.4MB saved (~96% reduction)
- **LCP improvement**: Significant (especially on mobile)
- **Bandwidth savings**: Massive, especially for repeat visitors

```bash
# Calculate total size before (from backup)
du -sh backups/logo-replacement-*/favicon*.backup backups/logo-replacement-*/android*.backup backups/logo-replacement-*/apple*.backup

# Calculate total size after
du -sh client/public/favicon*.png client/public/android-chrome-*.png client/public/apple-touch-icon.png
```

---

### PHASE 5: Testing & Verification

**Purpose**: Comprehensive testing to ensure all logo/favicon changes are working correctly

#### 5.1 Development Server Testing

##### 5.1.1 Clear All Caches
```bash
# Stop development server (if running)
# Ctrl+C in terminal running npm run dev

# Clear Vite cache
rm -rf node_modules/.vite/

# Restart development server
npm run dev
```

##### 5.1.2 Browser Cache Clearing

**Chrome/Edge**:
1. Open DevTools (F12)
2. Right-click Refresh button
3. Select "Empty Cache and Hard Reload"
4. OR: Settings → Privacy → Clear browsing data → Cached images and files

**Firefox**:
1. Ctrl+Shift+Delete (Windows) / Cmd+Shift+Delete (Mac)
2. Select "Cache"
3. Click "Clear Now"

**Safari**:
1. Develop menu → Empty Caches
2. OR: Safari → Clear History → All History

##### 5.1.3 Visual Testing Checklist

**Desktop Browser** (test in at least Chrome + Firefox):

Navigation/Header:
- [ ] Logo displays correctly in navigation bar
- [ ] Logo size is appropriate (32px height)
- [ ] Logo maintains aspect ratio
- [ ] No broken image icon
- [ ] Clicking logo navigates correctly

Footer:
- [ ] Logo displays in footer
- [ ] Logo is white/light colored
- [ ] Lazy loading works (check Network tab)

Loading Screen:
- [ ] Logo appears in loading animation
- [ ] Logo scales correctly (64px)
- [ ] Animation effects apply correctly

Auth Pages:
- [ ] Logo on login/register page
- [ ] Logo on partner registration
- [ ] Logo on staff invite page

Favicon:
- [ ] Browser tab shows new favicon
- [ ] Favicon is clear and recognizable (check at different zoom levels)
- [ ] Favicon appears correctly in bookmarks bar

Mobile:
- [ ] Mobile header logo (24px)
- [ ] Responsive scaling works

##### 5.1.4 Network Performance Testing

**Using Browser DevTools**:
```
1. Open DevTools → Network tab
2. Check "Disable cache"
3. Refresh page
4. Filter by "Img"
5. Check logo-white.png:
   - Status: 200 OK
   - Size: < 50KB
   - Type: image/png
   - Load time: < 100ms (on fast connection)
6. Check favicon files:
   - favicon-16x16.png: < 2KB
   - favicon-32x32.png: < 3KB
   - android-chrome-192x192.png: < 25KB
   - android-chrome-512x512.png: < 100KB
   - apple-touch-icon.png: < 20KB
```

**Performance Metrics**:
- [ ] Total image size for favicons: < 200KB (was ~5.6MB)
- [ ] Main logo loads in < 100ms
- [ ] No 404 errors for any logo/favicon files
- [ ] No duplicate requests for same file

##### 5.1.5 Console Error Check
```bash
# Open browser DevTools → Console
# Look for any errors related to:
# - Image loading failures
# - 404 errors
# - Invalid file format warnings
# - CORS errors (shouldn't occur for local assets)
```

**Expected**: No errors

#### 5.2 Production Build Testing

##### 5.2.1 Create Production Build
```bash
# Build for production
npm run build

# Verify build output
ls -lh dist/public/assets/
ls -lh dist/public/favicon*.png
ls -lh dist/public/android-chrome-*.png
ls -lh dist/public/apple-touch-icon.png
```

##### 5.2.2 Verify Asset Paths

**Check that Vite correctly bundled the logo**:
```bash
# Logo should be copied to dist/public/assets/ with hash
ls -lh dist/public/assets/ | grep -i logo

# Favicon files should be in dist/public/
ls -lh dist/public/favicon*.png
```

##### 5.2.3 Test Production Server
```bash
# Start production server
npm start

# Or use a static file server for testing
npx serve dist/public -p 5001
```

**Testing Checklist**:
- [ ] Navigate to http://localhost:5000 (or 5001)
- [ ] Verify all logos display correctly
- [ ] Check browser tab favicon
- [ ] Check Network tab for correct file sizes
- [ ] Test navigation between pages
- [ ] Verify no console errors

##### 5.2.4 PWA Testing (if applicable)

**Android Chrome**:
1. Open site on Android device
2. Menu → Add to Home Screen
3. Check home screen icon (should use android-chrome-192x192.png)
4. Open PWA → check splash screen (should use android-chrome-512x512.png)

**iOS Safari**:
1. Open site on iOS device
2. Share → Add to Home Screen
3. Check home screen icon (should use apple-touch-icon.png)

#### 5.3 Cross-Browser Testing

**Minimum browsers to test**:
- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest) - if on macOS
- [ ] Edge (latest)

**Testing matrix**:

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Navigation logo | ☐ | ☐ | ☐ | ☐ |
| Footer logo | ☐ | ☐ | ☐ | ☐ |
| Loading screen | ☐ | ☐ | ☐ | ☐ |
| Browser favicon | ☐ | ☐ | ☐ | ☐ |
| No console errors | ☐ | ☐ | ☐ | ☐ |

#### 5.4 Accessibility Testing

**Logo alt text verification**:
```bash
# Check that all logo images have proper alt text
grep -r "logoWhite" client/src --include="*.tsx" -A 2 | grep alt=
```

**Expected**: Every `<img src={logoWhite}>` should have `alt="Phozos Logo"` or similar

**Screen reader testing** (optional but recommended):
- [ ] Navigate with screen reader
- [ ] Logo alt text is read correctly
- [ ] Favicon changes are announced (if applicable)

#### 5.5 Automated Testing

**Visual regression testing** (if tools available):
```bash
# Take screenshots of all pages
# Compare with baseline screenshots from Phase 0

# Example using puppeteer or playwright
# npm run test:visual
```

**Checklist**:
- [ ] Navigation header screenshot matches expected
- [ ] Footer screenshot matches expected
- [ ] Loading screen screenshot matches expected
- [ ] Mobile header screenshot matches expected

#### 5.6 Final Verification Checklist

**Files Updated**:
- [x] `attached_assets/branding/logo/logo-white.png` (active logo)
- [x] `client/public/favicon.ico`
- [x] `client/public/favicon-16x16.png`
- [x] `client/public/favicon-32x32.png`
- [x] `client/public/favicon-48x48.png`
- [x] `client/public/android-chrome-192x192.png`
- [x] `client/public/android-chrome-512x512.png`
- [x] `client/public/apple-touch-icon.png`

**Files NOT Touched** (verify):
- [ ] `client/public/og-image.png` (unchanged)
- [ ] `client/public/og-home.png` (unchanged)
- [ ] `client/public/og-plans.png` (unchanged)
- [ ] `client/index.html` (unchanged, unless theme color updated)
- [ ] `client/public/site.webmanifest` (unchanged, unless theme updated)

**All 8 Components Display Logo**:
- [ ] Navigation.tsx
- [ ] AppShell.tsx
- [ ] Footer.tsx
- [ ] LoadingScreen.tsx
- [ ] MobileTopHeader.tsx
- [ ] Auth.tsx
- [ ] PartnerRegistration.tsx
- [ ] StaffInvite.tsx

**Performance Verified**:
- [ ] Main logo: < 50KB
- [ ] Total favicon size: < 200KB (was 5.6MB)
- [ ] Page load improvement visible
- [ ] No 404 errors
- [ ] No console errors

**Cross-Browser Tested**:
- [ ] Chrome ✓
- [ ] Firefox ✓
- [ ] Safari ✓ (if available)
- [ ] Edge ✓

**User Experience**:
- [ ] Logo clearly visible
- [ ] Favicon recognizable in browser tab
- [ ] PWA icons work (if testing mobile)
- [ ] No broken images
- [ ] Smooth loading experience

---

### PHASE 6: Cleanup

**Purpose**: Remove duplicate/orphaned files and document changes

#### 6.1 Remove Orphaned Logo File

**File to remove**: `client/src/assets/branding/logo/logo-white.png`  
**Reason**: Not used by any component (all use `@assets` alias → `attached_assets/`)

```bash
# Verify file is not imported anywhere
grep -r "src/assets/branding/logo" client/src --include="*.tsx" --include="*.ts"
# Expected: No results (all imports use @assets alias)

# Remove the orphaned file
rm client/src/assets/branding/logo/logo-white.png

# Remove empty directories (if any)
rmdir client/src/assets/branding/logo 2>/dev/null || true
rmdir client/src/assets/branding 2>/dev/null || true
# Note: Only removes if empty; leaves directory if other files exist
```

**Verification**:
```bash
# Confirm file is deleted
ls client/src/assets/branding/logo/logo-white.png
# Expected: "No such file or directory"

# Verify application still works
npm run dev
# Check browser - logo should still display correctly
```

#### 6.2 Clean Up Development Artifacts

```bash
# Remove Vite cache (will rebuild on next dev run)
rm -rf node_modules/.vite/

# Remove any temporary files created during asset generation
find . -name "*-temp.png" -delete
find . -name "*.tmp" -delete
```

#### 6.3 Verify Directory Structure

**Final structure should be**:

```
attached_assets/
  └── branding/
      └── logo/
          └── logo-white.png  ← ACTIVE (22KB, 512x512, used by all components)

client/
  ├── public/
  │   ├── favicon.ico  ← UPDATED (7KB multi-size ICO)
  │   ├── favicon-16x16.png  ← UPDATED (~1-2KB, 16x16)
  │   ├── favicon-32x32.png  ← UPDATED (~2-3KB, 32x32)
  │   ├── favicon-48x48.png  ← UPDATED (~3-4KB, 48x48)
  │   ├── android-chrome-192x192.png  ← UPDATED (~15-25KB, 192x192)
  │   ├── android-chrome-512x512.png  ← UPDATED (~50-100KB, 512x512)
  │   ├── apple-touch-icon.png  ← UPDATED (~10-20KB, 180x180)
  │   ├── og-image.png  ← NOT TOUCHED
  │   ├── og-home.png  ← NOT TOUCHED
  │   ├── og-plans.png  ← NOT TOUCHED
  │   └── site.webmanifest
  ├── src/
  │   └── assets/
  │       └── branding/
  │           └── logo/  ← DIRECTORY REMOVED (was orphaned)
  └── index.html

backups/
  └── logo-replacement-YYYYMMDD/  ← BACKUP CREATED
      ├── logo-white.png.backup
      ├── favicon*.backup
      ├── all-backups.md5
      └── restore-backup.sh
```

#### 6.4 Update Documentation

**File**: `replit.md` (if exists and tracks project structure)

Add section:
```markdown
## Branding Assets

### Logo Files
- **Main Application Logo**: `attached_assets/branding/logo/logo-white.png`
  - Format: PNG with transparency
  - Dimensions: 512x512 pixels
  - Usage: Imported via @assets alias in 8 components
  - Last updated: [DATE]

### Favicon Files
Located in `client/public/`:
- `favicon.ico` - Multi-size ICO (16x16, 32x32, 48x48)
- `favicon-16x16.png` - 16x16 PNG for browser tabs
- `favicon-32x32.png` - 32x32 PNG for high-DPI displays
- `favicon-48x48.png` - 48x48 PNG for Windows taskbar
- `android-chrome-192x192.png` - 192x192 PNG for Android home screen
- `android-chrome-512x512.png` - 512x512 PNG for Android splash screen
- `apple-touch-icon.png` - 180x180 PNG for iOS home screen

### DO NOT MODIFY
Social media preview images (not logo files):
- `og-image.png`
- `og-home.png`
- `og-plans.png`
```

#### 6.5 Git Commit (Recommended)

**Create meaningful commit message**:
```bash
git add attached_assets/branding/logo/logo-white.png
git add client/public/favicon*.png
git add client/public/android-chrome-*.png
git add client/public/apple-touch-icon.png
git add client/src/assets/  # Shows deletion
git add replit.md  # If updated

git commit -m "Update logo and optimize favicon files

- Replace main application logo (attached_assets/branding/logo/logo-white.png)
- Remove orphaned duplicate logo from client/src/assets/branding/logo/
- Fix favicon files with correct dimensions and optimization:
  * favicon-16x16.png: 938KB → ~2KB (16x16)
  * favicon-32x32.png: 938KB → ~3KB (32x32)
  * favicon-48x48.png: 938KB → ~4KB (48x48)
  * android-chrome-192x192.png: 938KB → ~20KB (192x192)
  * android-chrome-512x512.png: 938KB → ~80KB (512x512)
  * apple-touch-icon.png: 938KB → ~15KB (180x180)
- Total reduction: ~5.4MB (96% reduction in favicon payload)
- Performance improvement: Significant LCP and bandwidth savings

All 8 components verified:
✓ Navigation.tsx
✓ AppShell.tsx
✓ Footer.tsx
✓ LoadingScreen.tsx
✓ MobileTopHeader.tsx
✓ Auth.tsx
✓ PartnerRegistration.tsx
✓ StaffInvite.tsx

Tested: Chrome, Firefox, Edge
Backup: backups/logo-replacement-YYYYMMDD/"
```

#### 6.6 Deployment Considerations

**Production Deployment Checklist**:

Before deploying to production:
- [ ] Test production build locally (`npm run build && npm start`)
- [ ] Verify all logos display correctly in production mode
- [ ] Check favicon files are served with correct MIME types
- [ ] Ensure CDN/cache purging is configured (if applicable)

**Cache Busting**:
```bash
# If using CDN or aggressive caching:
# 1. Clear CDN cache for favicon files
# 2. Consider adding cache-busting query params
# 3. Update cache headers to prevent stale favicons

# Example: Set short cache for favicon files
# In server configuration (if serving static files):
# Cache-Control: max-age=3600 (1 hour) for favicon files
# vs. max-age=31536000 (1 year) for hashed assets
```

**Post-Deployment Verification**:
1. Check production site in browser
2. Hard refresh to clear cache
3. Verify favicon in browser tab
4. Check mobile PWA icons (if applicable)
5. Monitor error logs for any 404s
6. Check web analytics for image load errors

#### 6.7 Final Cleanup Checklist

**Completed Actions**:
- [ ] Removed orphaned logo file from `client/src/assets/`
- [ ] Removed empty directories (if created)
- [ ] Cleared Vite cache
- [ ] Verified final directory structure
- [ ] Updated documentation (replit.md or similar)
- [ ] Created git commit with changes
- [ ] Verified application works in dev mode
- [ ] Tested production build
- [ ] Documented deployment considerations

**Backup Available**:
- [ ] Backup directory created: `backups/logo-replacement-YYYYMMDD/`
- [ ] All old files backed up with checksums
- [ ] Restore script tested and verified

**Performance Gains Verified**:
- [ ] Main logo: Optimized and correct size
- [ ] Favicon total size reduced by ~5.4MB (96%)
- [ ] Page load performance improved
- [ ] No broken images or 404 errors

---

## 3. ADDITIONAL CONSIDERATIONS

### 3.1 Cache Busting Strategies

**Problem**: Browsers may cache old favicon files aggressively

**Solutions**:

#### Option A: Add Version Query Parameter
Update `client/index.html`:
```html
<!-- Add ?v=2 to force reload -->
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=2" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=2" />
<!-- etc. -->
```

**Pros**: Simple, no code changes  
**Cons**: Must update manually each time

#### Option B: Content Hash in Filename
Rename files during build:
```bash
# Example: favicon-16x16.abc123.png
# Requires build script modification
```

**Pros**: Automatic cache busting  
**Cons**: Requires build process changes

#### Option C: User Education
Include note in deployment documentation:
```markdown
After deploying new logo:
- Instruct users to hard refresh (Ctrl+Shift+R)
- Or wait for natural cache expiration
- Mobile users may need to clear app cache
```

### 3.2 Performance Monitoring

**Metrics to track before/after**:

1. **Page Load Time**:
   - Before: ~5.6MB favicon overhead
   - After: ~150-200KB favicon overhead
   - Expected savings: 5.4MB per page load

2. **Largest Contentful Paint (LCP)**:
   - Monitor improvement in Core Web Vitals
   - Especially on mobile connections

3. **Bandwidth Usage**:
   - Track total bandwidth reduction
   - Especially important for users on metered connections

**Tools**:
- Google PageSpeed Insights
- Chrome DevTools Lighthouse
- WebPageTest.org

### 3.3 Mobile PWA Considerations

**Android**:
- Home screen icon uses `android-chrome-192x192.png`
- Splash screen uses `android-chrome-512x512.png`
- Must clear app cache to see updated icons

**iOS**:
- Home screen icon uses `apple-touch-icon.png`
- iOS applies rounded corners automatically
- May need to delete and re-add to home screen

**Testing**:
```bash
# Test manifest is valid
# Visit: https://manifest-validator.appspot.com/
# Upload your site.webmanifest
```

### 3.4 Rollback Procedure

**If issues are discovered post-deployment**:

```bash
# Navigate to backup directory
cd backups/logo-replacement-YYYYMMDD/

# Run restore script
./restore-backup.sh

# Or manually restore specific files
cp logo-white.png.backup ../../attached_assets/branding/logo/logo-white.png
cp favicon-16x16.png.backup ../../client/public/favicon-16x16.png
# etc.

# Restart development server
npm run dev

# Verify restoration
# Check browser for old logo/favicons
```

**Rollback checklist**:
- [ ] Run restore script or manual restoration
- [ ] Clear Vite cache: `rm -rf node_modules/.vite/`
- [ ] Restart development server
- [ ] Hard refresh browser
- [ ] Verify old logo/favicons restored
- [ ] Check for console errors
- [ ] Rebuild for production if needed

### 3.5 Common Pitfalls & Gotchas

**1. Favicon Not Updating**:
- **Cause**: Aggressive browser caching
- **Solution**: Hard refresh, clear cache, add query param (?v=2)

**2. Logo Appears Pixelated**:
- **Cause**: Source file too small or low quality
- **Solution**: Use high-resolution source (1024x1024 or higher) and scale down

**3. Favicon Wrong Size**:
- **Cause**: File not properly resized (e.g., 512x512 for all sizes)
- **Solution**: Use `identify` command to verify dimensions before copying

**4. Transparent Background Shows White**:
- **Cause**: PNG doesn't have alpha channel or viewer doesn't support transparency
- **Solution**: Verify PNG has transparency, test in multiple browsers

**5. PWA Icon Not Updating**:
- **Cause**: Service worker cache or app cache
- **Solution**: Uninstall and reinstall PWA, or clear service worker cache

**6. Wrong File Path**:
- **Cause**: Editing `client/src/assets/` instead of `attached_assets/`
- **Solution**: Always use `attached_assets/branding/logo/` for active logo

**7. Build Fails After Logo Change**:
- **Cause**: Corrupted image file or wrong format
- **Solution**: Verify PNG signature, re-export from source

**8. Console Error: "Failed to load image"**:
- **Cause**: File path incorrect or file missing
- **Solution**: Check Network tab for 404, verify file exists at correct path

---

## 4. QUICK REFERENCE SUMMARY

### Active Logo Path
```
attached_assets/branding/logo/logo-white.png
```
**Used by**: All 8 components via `@assets` alias

### Orphaned Logo Path (TO REMOVE)
```
client/src/assets/branding/logo/logo-white.png
```
**Used by**: None (duplicate file)

### Favicon Files (All in client/public/)
```
favicon.ico              - Multi-size ICO
favicon-16x16.png        - 16x16 PNG
favicon-32x32.png        - 32x32 PNG
favicon-48x48.png        - 48x48 PNG
android-chrome-192x192.png - 192x192 PNG
android-chrome-512x512.png - 512x512 PNG
apple-touch-icon.png     - 180x180 PNG
```

### DO NOT TOUCH
```
client/public/og-image.png
client/public/og-home.png
client/public/og-plans.png
```

### Components Using Logo (8 total)
1. Navigation.tsx
2. AppShell.tsx
3. Footer.tsx
4. LoadingScreen.tsx
5. MobileTopHeader.tsx
6. Auth.tsx
7. PartnerRegistration.tsx
8. StaffInvite.tsx

### File Size Targets
- Main logo: < 50KB
- favicon-16x16.png: < 2KB
- favicon-32x32.png: < 3KB
- favicon-48x48.png: < 4KB
- android-chrome-192x192.png: < 25KB
- android-chrome-512x512.png: < 100KB
- apple-touch-icon.png: < 20KB

### Performance Improvement
- **Before**: ~5.6MB total favicon payload
- **After**: ~150-200KB total favicon payload
- **Reduction**: ~5.4MB (96% savings)

---

## 5. CONCLUSION

This investigation reveals:

1. **Logo Structure**: Clean Vite alias configuration with one orphaned duplicate
2. **Critical Favicon Issue**: All 6 PNG favicons are massively oversized (938KB each, all 512x512)
3. **Performance Impact**: Replacing favicons will save ~5.4MB per page load
4. **No Build Complexity**: Simple file replacement, no scripts to modify
5. **Clear Implementation Path**: Well-defined 6-phase plan with verification at each step

**Recommendation**: Proceed with implementation following the phased plan. The favicon optimization alone will provide massive performance improvements.

---

**Document End**
