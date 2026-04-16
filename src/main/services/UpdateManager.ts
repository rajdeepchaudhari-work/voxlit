import { autoUpdater } from 'electron-updater'
import { app, BrowserWindow } from 'electron'
import { writeFileSync, chmodSync } from 'fs'
import { join } from 'path'
import { execFile } from 'child_process'
import { IPC } from '@shared/ipc-types'

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000  // 4 hours

/**
 * Path to the downloaded ZIP that electron-updater cached. Captured in the
 * 'update-downloaded' handler so installUpdate() knows where the payload is.
 */
let downloadedZipPath: string | null = null

export function initAutoUpdater(getMainWindow: () => BrowserWindow | null) {
  autoUpdater.autoDownload = true
  // Disable Squirrel's built-in install — we handle it ourselves via a
  // shell script that replaces the .app bundle after quit. Squirrel doesn't
  // work reliably with adhoc-signed open-source apps.
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.logger = null

  function send(channel: string, data?: unknown) {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, data)
    }
  }

  autoUpdater.on('update-available', (info) => {
    send(IPC.UPDATE_AVAILABLE, { version: info.version, releaseName: info.releaseName, releaseNotes: info.releaseNotes })
  })

  autoUpdater.on('download-progress', (p) => {
    send(IPC.UPDATE_PROGRESS, {
      percent: p.percent,
      bytesPerSecond: p.bytesPerSecond,
      transferred: p.transferred,
      total: p.total,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    // electron-updater downloads the ZIP to a cache dir. Find it so our
    // shell-script updater can extract and replace the .app bundle.
    const { existsSync: exists } = require('fs')
    const version = info.version

    // Check known electron-updater cache locations
    const candidates = [
      // electron-updater's internal downloadedUpdateHelper cache
      (autoUpdater as any).downloadedUpdateHelper?.cacheDir
        ? join((autoUpdater as any).downloadedUpdateHelper.cacheDir, `voxlit-${version}-arm64-mac.zip`)
        : '',
      join(app.getPath('userData'), `voxlit-${version}-arm64-mac.zip`),
      join(app.getPath('temp'), `voxlit-${version}-arm64-mac.zip`),
    ].filter(Boolean)

    downloadedZipPath = candidates.find((p) => exists(p)) ?? null
    console.log('[UpdateManager] update downloaded at:', downloadedZipPath ?? 'unknown path')
    send(IPC.UPDATE_DOWNLOADED, { version, releaseName: info.releaseName, releaseNotes: info.releaseNotes })
  })

  autoUpdater.on('error', (err) => {
    if (!err.message?.includes('net::')) {
      send(IPC.UPDATE_ERROR, err.message)
    }
  })

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {})
    setInterval(() => {
      autoUpdater.checkForUpdates().catch(() => {})
    }, CHECK_INTERVAL_MS)
  }, 10_000)
}

/**
 * Shell-script updater. Bypasses Squirrel.Mac entirely — works reliably with
 * adhoc-signed open-source apps where Squirrel's code-sign checks fail.
 *
 * Flow:
 * 1. Write a small bash script to /tmp
 * 2. The script waits for Voxlit to quit, extracts the ZIP, replaces the .app, relaunches
 * 3. Spawn the script as a detached process (survives our exit)
 * 4. Quit the app
 */
export function installUpdate() {
  const appPath = app.isPackaged
    ? app.getPath('exe').replace(/\/Contents\/MacOS\/.*$/, '')
    : null

  if (!appPath || !downloadedZipPath) {
    console.error('[UpdateManager] cannot install — appPath:', appPath, 'zip:', downloadedZipPath)
    // Fallback: just open the releases page
    require('electron').shell.openExternal('https://github.com/rajdeepchaudhari-work/voxlit/releases/latest')
    return
  }

  const script = `#!/bin/bash
# Voxlit self-updater — spawned as a detached process before the app quits.
# Waits for the old process to exit, extracts the new .app, replaces, relaunches.

APP_PATH="${appPath}"
ZIP_PATH="${downloadedZipPath}"
TEMP_DIR="/tmp/voxlit-update-$$"

# Wait for Voxlit to fully exit (up to 10s)
for i in $(seq 1 20); do
  pgrep -x "Voxlit" > /dev/null 2>&1 || break
  sleep 0.5
done

# Extract
mkdir -p "$TEMP_DIR"
if ! unzip -o -q "$ZIP_PATH" -d "$TEMP_DIR"; then
  # If unzip fails, try ditto (handles .app bundles better on macOS)
  ditto -x -k "$ZIP_PATH" "$TEMP_DIR" 2>/dev/null
fi

# Find the .app in the extracted directory
NEW_APP=$(find "$TEMP_DIR" -maxdepth 2 -name "*.app" -type d | head -1)
if [ -z "$NEW_APP" ]; then
  echo "[voxlit-updater] No .app found in ZIP — aborting"
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Replace
rm -rf "$APP_PATH"
cp -R "$NEW_APP" "$APP_PATH"

# Remove quarantine so Gatekeeper doesn't re-prompt
xattr -rd com.apple.quarantine "$APP_PATH" 2>/dev/null

# Clean up
rm -rf "$TEMP_DIR"

# Relaunch
open "$APP_PATH"
`

  const scriptPath = '/tmp/voxlit-update.sh'
  writeFileSync(scriptPath, script, { mode: 0o755 })
  chmodSync(scriptPath, 0o755)

  // Spawn detached — the script outlives our process
  const child = execFile('/bin/bash', [scriptPath], {
    detached: true,
    stdio: 'ignore',
  } as any)
  child.unref()

  console.log('[UpdateManager] update script spawned, quitting app')
  app.quit()
}

export function checkForUpdates() {
  return autoUpdater.checkForUpdates()
}
