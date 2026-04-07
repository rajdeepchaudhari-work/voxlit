import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc-types'

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000  // 4 hours

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

export function installUpdate() {
  autoUpdater.quitAndInstall(false, true)
}

export function checkForUpdates() {
  return autoUpdater.checkForUpdates()
}
