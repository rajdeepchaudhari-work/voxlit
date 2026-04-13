#!/usr/bin/env bash
# Patch the dev Electron's bundle ID to a unique value so macOS treats the next
# launch as a brand-new app and re-prompts for every TCC permission. Use when
# tccutil reset isn't surfacing the popups (cached identity, etc.).
#
# Restore with: ./scripts/restore-bundle-id.sh  (or `npm run reset:restore-id`)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$REPO_ROOT/node_modules/electron/dist/Electron.app/Contents/Info.plist"
ORIGINAL_BACKUP="$REPO_ROOT/node_modules/electron/dist/Electron.app/Contents/Info.plist.original"

if [ ! -f "$PLIST" ]; then
  echo "ERROR: Electron Info.plist not found at $PLIST"
  echo "Run 'npm install' first."
  exit 1
fi

# Backup the original ONCE — preserves it through multiple rotations
if [ ! -f "$ORIGINAL_BACKUP" ]; then
  cp "$PLIST" "$ORIGINAL_BACKUP"
  echo "Backed up original Info.plist"
fi

# Rotate to a unique ID. Timestamp suffix means each rotation = brand new identity.
NEW_ID="co.voxlit.dev.test$(date +%s)"

/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier $NEW_ID" "$PLIST"

# Re-sign with adhoc signature so macOS accepts the modified bundle.
# Without this, the modified plist invalidates the code signature.
codesign --force --deep --sign - "$REPO_ROOT/node_modules/electron/dist/Electron.app" 2>&1 | tail -5

echo ""
echo "Bundle ID rotated to: $NEW_ID"
echo "Run 'npm run dev' — every TCC prompt will fire fresh."
echo "Restore original with: npm run reset:restore-id"
