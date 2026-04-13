#!/usr/bin/env bash
# Restore the dev Electron's original bundle ID after a rotate-bundle-id run.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$REPO_ROOT/node_modules/electron/dist/Electron.app/Contents/Info.plist"
ORIGINAL_BACKUP="$REPO_ROOT/node_modules/electron/dist/Electron.app/Contents/Info.plist.original"

if [ ! -f "$ORIGINAL_BACKUP" ]; then
  echo "Nothing to restore — no backup found at $ORIGINAL_BACKUP"
  echo "Bundle ID is probably already at its default."
  exit 0
fi

cp "$ORIGINAL_BACKUP" "$PLIST"
codesign --force --deep --sign - "$REPO_ROOT/node_modules/electron/dist/Electron.app" 2>&1 | tail -5
rm "$ORIGINAL_BACKUP"

CURRENT=$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$PLIST")
echo ""
echo "Bundle ID restored to: $CURRENT"
