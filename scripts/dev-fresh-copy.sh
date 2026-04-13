#!/usr/bin/env bash
# Run dev with a COPY of Electron at a unique bundle ID so macOS treats it as
# a brand-new app (every TCC popup fires fresh). Original Electron is untouched.
# Uses ELECTRON_OVERRIDE_DIST_PATH so electron-vite picks up the copy automatically.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ORIG_DIST="$REPO_ROOT/node_modules/electron/dist"
COPY_ROOT="/tmp/voxlit-fresh-electron"
COPY_DIST="$COPY_ROOT/dist"
COPY_APP="$COPY_DIST/Electron.app"

if [ ! -d "$ORIG_DIST/Electron.app" ]; then
  echo "ERROR: Electron not installed. Run 'npm install' first."
  exit 1
fi

echo "Preparing fresh Electron copy with new bundle ID..."

# Wipe any prior copy
rm -rf "$COPY_ROOT"
mkdir -p "$COPY_DIST"

# Copy the entire dist folder (Electron.app + supporting files like version)
cp -R "$ORIG_DIST/." "$COPY_DIST/"

# Rotate to a unique bundle ID
NEW_ID="co.voxlit.dev.test$(date +%s)"
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier $NEW_ID" "$COPY_APP/Contents/Info.plist"

# Adhoc-resign (modifying plist invalidates the original signature)
codesign --force --deep --sign - "$COPY_APP" >/dev/null 2>&1

echo "Bundle ID: $NEW_ID"
echo "Wiping prior TCC + app data..."
"$REPO_ROOT/scripts/reset-dev.sh" >/dev/null 2>&1 || true
# Also clean any TCC entries for previous test IDs we created
for old in $(defaults domains 2>/dev/null | tr ',' '\n' | grep -E '^\s*co\.voxlit\.dev\.test' || true); do
  defaults delete "$old" 2>/dev/null || true
  tccutil reset Microphone "$old" 2>/dev/null || true
  tccutil reset Accessibility "$old" 2>/dev/null || true
  tccutil reset AppleEvents "$old" 2>/dev/null || true
done

echo ""
echo "Launching dev with override path: $COPY_DIST"
ELECTRON_OVERRIDE_DIST_PATH="$COPY_DIST" exec "$REPO_ROOT/node_modules/.bin/electron-vite" dev
