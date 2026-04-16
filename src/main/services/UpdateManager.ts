import { autoUpdater } from 'electron-updater'
import { app, BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc-types'

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000  // 4 hours

export function initAutoUpdater(getMainWindow: () => BrowserWindow | null) {
  autoUpdater.autoDownload = true
  // This is the key: electron-updater installs the update silently when
  // the app quits normally. No quitAndInstall, no helper teardown race,
  // no "Object has been destroyed" crash, no Squirrel.Mac bundle-replace
  // failures. User just quits and reopens.
  autoUpdater.autoInstallOnAppQuit = true

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
    send(IPC.UPDATE_DOWNLOADED, { version: info.version, releaseName: info.releaseName, releaseNotes: info.releaseNotes })
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

export function installUpdate() {
  // Don't use quitAndInstall — it races with helper teardown, window
  // destruction, and Squirrel.Mac's bundle-replace step, causing crashes.
  // Instead: just quit. autoInstallOnAppQuit=true means electron-updater
  // applies the update during the normal quit sequence. User reopens the
  // app from Dock/Spotlight and gets the new version.
  app.quit()
}

export function checkForUpdates() {
  return autoUpdater.checkForUpdates()
}
