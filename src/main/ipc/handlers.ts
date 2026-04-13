import { ipcMain, systemPreferences, shell, BrowserWindow, app } from 'electron'
import { installUpdate, checkForUpdates } from '../services/UpdateManager'
import { IPC } from '@shared/ipc-types'
import { join } from 'path'
import { existsSync, statSync, createWriteStream, mkdirSync } from 'fs'
import { get as httpsGet } from 'https'
import * as os from 'os'
import { exec } from 'child_process'
import type Store from 'electron-store'
import type { SessionStore } from '../services/SessionStore'
import type { SocketManager } from '../services/SocketManager'
import { HealthCheck } from '../services/HealthCheck'
import type { VoxlitSettings, SystemInfo, ModelStatus } from '@shared/ipc-types'

const MODEL_URLS: Record<string, string> = {
  'ggml-base.en': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
  'ggml-small.en': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin',
}

function modelsDir(): string {
  const dir = join(os.homedir(), 'Library', 'Application Support', 'Voxlit', 'models')
  mkdirSync(dir, { recursive: true })
  return dir
}

function modelPath(name: string): string {
  return join(modelsDir(), name + '.bin')
}

export function registerHandlers(deps: {
  store: Store<VoxlitSettings>
  sessionStore: SessionStore
  socketManager: SocketManager
}) {
  const { store, sessionStore, socketManager } = deps

  ipcMain.handle(IPC.GET_SETTINGS, () => store.store)

  ipcMain.handle(IPC.SET_SETTING, (_, key: keyof VoxlitSettings, value: unknown) => {
    store.set(key, value as VoxlitSettings[typeof key])
  })

  ipcMain.handle(IPC.GET_SESSIONS, (_, limit?: number, offset?: number) =>
    sessionStore.getSessions(limit, offset)
  )

  ipcMain.handle(IPC.GET_ENTRIES, (_, sessionId: string) =>
    sessionStore.getEntries(sessionId)
  )

  ipcMain.handle(IPC.DELETE_SESSION, (_, id: string) => {
    sessionStore.deleteSession(id)
  })

  ipcMain.handle(IPC.CHECK_PERMISSIONS, () => socketManager.checkPermissions())

  ipcMain.handle(IPC.REQUEST_PERMISSION, async (_, type: 'microphone' | 'accessibility' | 'automation') => {
    if (type === 'microphone') {
      await systemPreferences.askForMediaAccess('microphone')
    } else if (type === 'accessibility') {
      await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility')
    } else if (type === 'automation') {
      // Fire the TCC prompt and await the user's response (Allow/Deny).
      // Result is cached on socketManager — subsequent checkPermissions() returns it.
      const status = await socketManager.probeAutomationNow()
      if (status === 'denied') {
        // Already denied — open the Automation pane so the user can flip it manually
        shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Automation')
      }
    }
  })

  ipcMain.handle(IPC.GET_SYSTEM_INFO, (): Promise<SystemInfo> => {
    const totalRamGb = os.totalmem() / 1e9
    const freeRamGb = os.freemem() / 1e9
    return new Promise((resolve) => {
      exec('df -k .', (err, stdout) => {
        let freeDiskGb = 0
        if (!err) {
          const lines = stdout.trim().split('\n')
          if (lines[1]) {
            const parts = lines[1].split(/\s+/)
            freeDiskGb = parseInt(parts[3] ?? '0') * 1024 / 1e9
          }
        }
        resolve({ totalRamGb, freeRamGb, freeDiskGb })
      })
    })
  })

  ipcMain.handle(IPC.GET_MODEL_STATUS, (_, name: string): ModelStatus => {
    const path = modelPath(name)
    const exists = existsSync(path)
    const sizeBytes = exists ? statSync(path).size : 0
    return { name, exists, sizeBytes }
  })

  ipcMain.handle(IPC.DOWNLOAD_MODEL, async (event, name: string) => {
    const url = MODEL_URLS[name]
    if (!url) throw new Error(`Unknown model: ${name}`)
    const dest = modelPath(name)
    if (existsSync(dest)) {
      const win = BrowserWindow.fromWebContents(event.sender)
      win?.webContents.send(IPC.MODEL_DOWNLOAD_PROGRESS, { model: name, bytesReceived: 1, totalBytes: 1, done: true })
      return
    }

    return new Promise<void>((resolve, reject) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      let bytesReceived = 0
      let totalBytes = 0

      const sendProgress = (done: boolean, error?: string) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC.MODEL_DOWNLOAD_PROGRESS, { model: name, bytesReceived, totalBytes, done, error })
        }
      }

      // Validate redirect URL stays within huggingface CDN (security hardening)
      const isSafeRedirect = (u: string): boolean => {
        try {
          const host = new URL(u).hostname
          return host === 'huggingface.co' || host.endsWith('.huggingface.co') || host.endsWith('.hf.co') || host.endsWith('.cloudfront.net')
        } catch { return false }
      }

      const streamTo = (res: import('http').IncomingMessage, file: import('fs').WriteStream) => {
        totalBytes = parseInt(res.headers['content-length'] ?? '0')
        res.on('data', (chunk: Buffer) => {
          bytesReceived += chunk.length
          if (!file.write(chunk)) res.pause()
        })
        file.on('drain', () => res.resume())
        // Throttle progress to ~20 updates/sec instead of one-per-chunk
        const progressTimer = setInterval(() => sendProgress(false), 50)
        res.on('end', () => {
          clearInterval(progressTimer)
          file.end(() => {
            const { renameSync } = require('fs')
            try { renameSync(dest + '.tmp', dest); sendProgress(true); resolve() }
            catch (e) { sendProgress(true, (e as Error).message); reject(e) }
          })
        })
        res.on('error', (err: Error) => { clearInterval(progressTimer); file.destroy(); sendProgress(true, err.message); reject(err) })
      }

      const doRequest = (requestUrl: string, redirectDepth = 0) => {
        if (redirectDepth > 5) { reject(new Error('Too many redirects')); return }

        const file = createWriteStream(dest + '.tmp')
        file.on('error', (err) => { reject(err) })

        httpsGet(requestUrl, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
            file.destroy()
            res.resume()  // drain the redirect response body so socket can close
            const loc = res.headers.location
            if (!loc) { reject(new Error(`Redirect ${res.statusCode} without Location header`)); return }
            if (!isSafeRedirect(loc)) { reject(new Error(`Unsafe redirect to ${loc}`)); return }
            doRequest(loc, redirectDepth + 1)
            return
          }
          if (res.statusCode !== 200) {
            file.destroy()
            res.resume()
            reject(new Error(`Download failed: HTTP ${res.statusCode}`))
            return
          }
          streamTo(res, file)
        }).on('error', (err: Error) => { file.destroy(); reject(err) })
      }

      doRequest(url)
    })
  })

  ipcMain.handle(IPC.INJECT_TEXT, (_, text: string) => {
    socketManager.sendInject(text)
  })

  ipcMain.handle(IPC.GET_APP_VERSION, () => app.getVersion())

  ipcMain.handle(IPC.IS_PACKAGED, () => app.isPackaged)

  const healthCheck = new HealthCheck(socketManager, store)
  ipcMain.handle(IPC.HEALTH_CHECK, () => healthCheck.run())

  ipcMain.handle(IPC.GET_HELPER_STATUS, () => socketManager.getStatus())

  ipcMain.handle(IPC.GET_AUDIO_DEVICES, () => socketManager.listMicDevices())

  ipcMain.handle(IPC.SET_AUDIO_DEVICE, (_, uid: string) => {
    store.set('micDeviceUid', uid ?? '')
    socketManager.setMicDevice(uid ?? '')
  })

  ipcMain.handle(IPC.SET_MIC_GAIN, (_, gain: number) => {
    store.set('micGain', gain)
    socketManager.setMicGain(gain)
  })

  ipcMain.handle(IPC.SET_MIC_GAIN_MODE, (_, mode: 'off' | 'manual' | 'auto') => {
    store.set('micGainMode', mode)
    socketManager.setMicGainMode(mode)
  })

  ipcMain.handle(IPC.SET_NOISE_SUPPRESSION, (_, enabled: boolean) => {
    store.set('noiseSuppressionEnabled', enabled)
    socketManager.setNoiseSuppression(enabled)
  })

  ipcMain.handle(IPC.RELAUNCH, () => {
    app.relaunch()
    app.exit(0)
  })

  ipcMain.handle(IPC.INSTALL_UPDATE, () => {
    installUpdate()
  })

  ipcMain.handle(IPC.CHECK_FOR_UPDATES, () => {
    if (app.isPackaged) checkForUpdates()?.catch(() => {})
  })
}
