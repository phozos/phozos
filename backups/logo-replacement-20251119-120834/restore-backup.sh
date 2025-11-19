#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== LOGO REPLACEMENT BACKUP RESTORATION ==="
echo "Backup location: $SCRIPT_DIR"
echo "Project root: $PROJECT_ROOT"
echo

read -p "Are you sure you want to restore all files from backup? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Restoration cancelled."
  exit 0
fi

echo
echo "Restoring files..."

cp "$SCRIPT_DIR/logo-white.png.backup" "$PROJECT_ROOT/attached_assets/branding/logo/logo-white.png"
echo "✓ Restored active logo"

cp "$SCRIPT_DIR/logo-white-orphaned.png.backup" "$PROJECT_ROOT/client/src/assets/branding/logo/logo-white.png"
echo "✓ Restored orphaned logo"

cp "$SCRIPT_DIR/favicon.ico.backup" "$PROJECT_ROOT/client/public/favicon.ico"
cp "$SCRIPT_DIR/favicon-16x16.png.backup" "$PROJECT_ROOT/client/public/favicon-16x16.png"
cp "$SCRIPT_DIR/favicon-32x32.png.backup" "$PROJECT_ROOT/client/public/favicon-32x32.png"
cp "$SCRIPT_DIR/favicon-48x48.png.backup" "$PROJECT_ROOT/client/public/favicon-48x48.png"
cp "$SCRIPT_DIR/android-chrome-192x192.png.backup" "$PROJECT_ROOT/client/public/android-chrome-192x192.png"
cp "$SCRIPT_DIR/android-chrome-512x512.png.backup" "$PROJECT_ROOT/client/public/android-chrome-512x512.png"
cp "$SCRIPT_DIR/apple-touch-icon.png.backup" "$PROJECT_ROOT/client/public/apple-touch-icon.png"
echo "✓ Restored all 7 favicon files"

cp "$SCRIPT_DIR/index.html.backup" "$PROJECT_ROOT/client/index.html"
cp "$SCRIPT_DIR/site.webmanifest.backup" "$PROJECT_ROOT/client/public/site.webmanifest"
echo "✓ Restored configuration files"

echo
echo "✅ Backup restoration complete!"
echo
echo "Next steps:"
echo "1. Clear browser cache (Ctrl+Shift+Delete)"
echo "2. Restart development server if running"
echo "3. Hard refresh browser (Ctrl+Shift+R)"
