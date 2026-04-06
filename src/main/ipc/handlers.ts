import { ipcMain, systemPreferences, shell, BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc-types'
import { join } from 'path'
import { existsSync, statSync, createWriteStream, mkdirSync } from 'fs'
import { get as httpsGet } from 'https'
import * as os from 'os'
import { exec } from 'child_process'
import type Store from 'electron-store'
import type { SessionStore } from '../services/SessionStore'
import type { SocketManager } from '../services/SocketManager'
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

  ipcMain.handle(IPC.REQUEST_PERMISSION, async (_, type: 'microphone' | 'accessibility') => {
    if (type === 'microphone') {
      await systemPreferences.askForMediaAccess('microphone')
    } else if (type === 'accessibility') {
      await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility')
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
      const file = createWriteStream(dest + '.tmp')
      let bytesReceived = 0
      let totalBytes = 0

      const request = httpsGet(url, (res) => {
        // Follow redirect
        if (res.statusCode === 302 || res.statusCode === 301) {
          file.close()
          const redirectUrl = res.headers.location!
          httpsGet(redirectUrl, (res2) => {
            totalBytes = parseInt(res2.headers['content-length'] ?? '0')
            res2.on('data', (chunk: Buffer) => {
              bytesReceived += chunk.length
              file.write(chunk)
              win?.webContents.send(IPC.MODEL_DOWNLOAD_PROGRESS, { model: name, bytesReceived, totalBytes, done: false })
            })
            res2.on('end', () => {
              file.end()
              const { renameSync } = require('fs')
              renameSync(dest + '.tmp', dest)
              win?.webContents.send(IPC.MODEL_DOWNLOAD_PROGRESS, { model: name, bytesReceived, totalBytes, done: true })
              resolve()
            })
            res2.on('error', (err: Error) => { file.destroy(); reject(err) })
          }).on('error', (err: Error) => { file.destroy(); reject(err) })
          return
        }
        totalBytes = parseInt(res.headers['content-length'] ?? '0')
        res.on('data', (chunk: Buffer) => {
          bytesReceived += chunk.length
          file.write(chunk)
          win?.webContents.send(IPC.MODEL_DOWNLOAD_PROGRESS, { model: name, bytesReceived, totalBytes, done: false })
        })
        res.on('end', () => {
          file.end()
          const { renameSync } = require('fs')
          renameSync(dest + '.tmp', dest)
          win?.webContents.send(IPC.MODEL_DOWNLOAD_PROGRESS, { model: name, bytesReceived, totalBytes, done: true })
          resolve()
        })
        res.on('error', (err: Error) => { file.destroy(); reject(err) })
      })
      request.on('error', (err: Error) => { file.destroy(); reject(err) })
    })
  })

  ipcMain.handle(IPC.INJECT_TEXT, (_, text: string) => {
    socketManager.sendInject(text)
  })
}
