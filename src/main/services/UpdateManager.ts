import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc-types'
import type { SocketManager } from './SocketManager'

let socketManagerRef: SocketManager | null = null

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000  // 4 hours

export function setSocketManagerForUpdater(sm: SocketManager) {
  socketManagerRef = sm
}

export function initAutoUpdater(getMainWindow: () => BrowserWindow | null) {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  // Suppress console noise in production
  autoUpdater.logger = null

  function send(channel: string, data?: unknown) {
    const win = getMainWindow()
    win?.webContents.send(channel, data)
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
    send(IPC.UPDATE_DOWNLOADED, { version: info.version, releaseName: info.releaseName, releaseNotes: info.releaseNotes })
  })

  autoUpdater.on('error', (err) => {
    // Only surface to renderer if it's not a "no update" network error
    if (!err.message?.includes('net::')) {
      send(IPC.UPDATE_ERROR, err.message)
    }
  })

  // Check once 10s after launch, then on interval
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {})
    setInterval(() => {
      autoUpdater.checkForUpdates().catch(() => {})
    }, CHECK_INTERVAL_MS)
  }, 10_000)
}

export async function installUpdate() {
  // Kill the Swift helper FIRST and wait for its real exit. If we skip this,
  // the helper keeps file descriptors open into the .app bundle, Squirrel.Mac
  // can't atomically replace the install, and quitAndInstall hangs forever.
  if (socketManagerRef) {
    try { await socketManagerRef.stopAndWait(1500) } catch (_) {}
  }
  // Silent=true on macOS (no modal dialog that can hide behind the window),
  // forceRunAfter=true so the new version launches automatically.
  autoUpdater.quitAndInstall(true, true)
}

export function checkForUpdates() {
  return autoUpdater.checkForUpdates()
}
