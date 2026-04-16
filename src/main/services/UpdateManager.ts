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
    // electron-updater downloads the ZIP to a cache dir. We need the path
    // so our shell-script updater can extract it after the app quits.
    const { existsSync: exists, readdirSync } = require('fs')
    const version = info.version

    // Method 1: electron-updater v6+ exposes downloadedFile on the event
    if ((info as any).downloadedFile && exists((info as any).downloadedFile)) {
      downloadedZipPath = (info as any).downloadedFile
    }

    // Method 2: search known cache directories for a matching ZIP
    if (!downloadedZipPath) {
      const searchDirs = [
        // electron-updater's standard cache: ~/Library/Caches/<appName>-updater/
        join(app.getPath('userData'), '..', 'Caches', `${app.getName()}-updater`),
        // Some versions use pending-updates/ inside userData
        join(app.getPath('userData'), 'pending-updates'),
        // Internal downloadedUpdateHelper cache (if accessible)
        (autoUpdater as any).downloadedUpdateHelper?.cacheDir,
        // System temp
        app.getPath('temp'),
      ].filter(Boolean) as string[]

      for (const dir of searchDirs) {
        if (!exists(dir)) continue
        try {
          const files = readdirSync(dir) as string[]
          const zip = files.find((f: string) => f.endsWith('.zip') && f.includes(version))
          if (zip) {
            downloadedZipPath = join(dir, zip)
            break
          }
        } catch { /* dir not readable */ }
      }
    }

    console.log('[UpdateManager] update downloaded at:', downloadedZipPath ?? 'NOT FOUND')
    if (!downloadedZipPath) {
      console.error('[UpdateManager] could not locate downloaded ZIP — update will fall back to browser download')
    }
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

  const pid = process.pid
  const logFile = '/tmp/voxlit-update.log'

  const script = `#!/bin/bash
# Voxlit self-updater — spawned as detached process before the app quits.
LOG="${logFile}"
echo "[$(date)] Update script started" > "$LOG"

APP_PATH="${appPath}"
ZIP_PATH="${downloadedZipPath}"
VOXLIT_PID=${pid}
TEMP_DIR="/tmp/voxlit-update-$$"

echo "[$(date)] APP=$APP_PATH" >> "$LOG"
echo "[$(date)] ZIP=$ZIP_PATH" >> "$LOG"
echo "[$(date)] PID=$VOXLIT_PID" >> "$LOG"

# Wait for the specific Voxlit process to exit (up to 15s)
for i in $(seq 1 30); do
  kill -0 $VOXLIT_PID 2>/dev/null || break
  sleep 0.5
done
echo "[$(date)] Voxlit exited" >> "$LOG"

# Verify ZIP exists
if [ ! -f "$ZIP_PATH" ]; then
  echo "[$(date)] ERROR: ZIP not found at $ZIP_PATH" >> "$LOG"
  exit 1
fi

# Extract
mkdir -p "$TEMP_DIR"
if ditto -x -k "$ZIP_PATH" "$TEMP_DIR" 2>>"$LOG"; then
  echo "[$(date)] Extracted with ditto" >> "$LOG"
elif unzip -o -q "$ZIP_PATH" -d "$TEMP_DIR" 2>>"$LOG"; then
  echo "[$(date)] Extracted with unzip" >> "$LOG"
else
  echo "[$(date)] ERROR: Both ditto and unzip failed" >> "$LOG"
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Find the .app
NEW_APP=$(find "$TEMP_DIR" -maxdepth 2 -name "*.app" -type d | head -1)
if [ -z "$NEW_APP" ]; then
  echo "[$(date)] ERROR: No .app found in extracted files" >> "$LOG"
  ls -laR "$TEMP_DIR" >> "$LOG" 2>&1
  rm -rf "$TEMP_DIR"
  exit 1
fi
echo "[$(date)] Found: $NEW_APP" >> "$LOG"

# Replace
rm -rf "$APP_PATH"
cp -R "$NEW_APP" "$APP_PATH"
echo "[$(date)] Replaced app bundle" >> "$LOG"

# Remove quarantine
xattr -rd com.apple.quarantine "$APP_PATH" 2>/dev/null

# Clean up
rm -rf "$TEMP_DIR"

# Relaunch
echo "[$(date)] Relaunching" >> "$LOG"
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
