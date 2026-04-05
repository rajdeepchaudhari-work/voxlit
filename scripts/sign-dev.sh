#!/bin/bash
# Signs the Electron binary with the local VoxlitDev cert so it runs on macOS 26
# Run once after npm install, and again after any electron version change.

set -e

ELECTRON_APP="$(node -e "require('path').dirname(require('electron'))" 2>/dev/null || echo "node_modules/electron/dist")/Electron.app"

if [ ! -d "$ELECTRON_APP" ]; then
  # electron package stores the app at node_modules/electron/dist/Electron.app
  ELECTRON_APP="node_modules/electron/dist/Electron.app"
fi

if [ ! -d "$ELECTRON_APP" ]; then
  echo "❌ Could not find Electron.app. Run npm install first."
  exit 1
fi

ENTITLEMENTS="$(pwd)/resources/entitlements.mac.plist"
IDENTITY="VoxlitDev"

echo "🔏 Signing $ELECTRON_APP with identity: $IDENTITY"

# Sign all frameworks and helpers first (deep sign)
find "$ELECTRON_APP" -name "*.dylib" -o -name "*.framework" | while read f; do
  codesign --force --sign "$IDENTITY" --entitlements "$ENTITLEMENTS" --options runtime "$f" 2>/dev/null || true
done

# Sign the main app bundle
codesign --force --deep --sign "$IDENTITY" \
  --entitlements "$ENTITLEMENTS" \
  --options runtime \
  "$ELECTRON_APP"

echo "✅ Signed. Verifying..."
codesign --verify --deep --strict "$ELECTRON_APP" && echo "✅ Signature valid"
