#!/usr/bin/env bash
# Reset all Voxlit permissions + stored data so the next launch behaves
# exactly like a first-ever install. Use between onboarding iterations.
set -euo pipefail

echo "Resetting Voxlit dev state..."

# 1. Kill any running Voxlit/Electron-Voxlit process. Without this, the running
#    main process keeps its in-memory TCC state and the reset has no visible effect.
#    Filter narrowly so we don't kill VS Code's Electron (also "Electron Helper").
pkill -f "VoxlitHelper" 2>/dev/null || true
pkill -f "node_modules/electron/dist/Electron.app" 2>/dev/null || true
pkill -f "Voxlit.app/Contents/MacOS/Voxlit" 2>/dev/null || true
sleep 0.3

# Bundle IDs we might've used:
#   - com.github.Electron : npm run dev (default Electron identity)
#   - com.electron.voxlit : earlier packaged builds (legacy default)
#   - co.voxlit.app       : current packaged builds
BUNDLES=(com.github.Electron com.electron.voxlit co.voxlit.app)

# TCC permissions Voxlit uses
SERVICES=(Microphone Accessibility AppleEvents ListenEvent SystemPolicyAllFiles)

# Reset per-bundle permissions
for bundle in "${BUNDLES[@]}"; do
  for svc in "${SERVICES[@]}"; do
    tccutil reset "$svc" "$bundle" 2>/dev/null || true
  done
done

# Also globally reset AppleEvents (Automation) since the consent target is "System Events",
# not Voxlit — per-bundle reset doesn't always purge it.
tccutil reset AppleEvents 2>/dev/null || true

# Wipe persisted settings + onboarding flag
for bundle in "${BUNDLES[@]}"; do
  defaults delete "$bundle" 2>/dev/null || true
done

# Wipe SQLite DB, model configs, electron-store JSON, downloaded models
rm -rf ~/Library/Application\ Support/Voxlit
rm -rf ~/Library/Application\ Support/voxlit
rm -rf ~/Library/Application\ Support/Electron

# Wipe cached preferences and saved app state
rm -rf ~/Library/Saved\ Application\ State/com.electron.voxlit.savedState
rm -rf ~/Library/Saved\ Application\ State/co.voxlit.app.savedState
rm -rf ~/Library/Saved\ Application\ State/com.github.Electron.savedState

# Logs
rm -rf ~/Library/Logs/Voxlit
rm -rf ~/Library/Logs/voxlit

# Bounce the user-level TCC daemon so the resets above propagate immediately.
# Without this, getMediaAccessStatus may keep returning the cached prior value
# until the next login or until tccd notices the change on its own schedule.
killall -USR2 tccd 2>/dev/null || true
launchctl kickstart -k gui/$(id -u)/com.apple.tccd 2>/dev/null || true

echo "Done. Next 'npm run dev' will behave like a fresh install."
echo "Permission prompts will fire for: microphone, accessibility, automation."
