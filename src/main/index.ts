import { app, BrowserWindow, Tray, Menu, nativeImage, shell } from 'electron'
import { join } from 'path'
import Store from 'electron-store'
import { IPC } from '@shared/ipc-types'
import type { VoxlitSettings, RecordingState } from '@shared/ipc-types'
import { SocketManager } from './services/SocketManager'
import { SessionStore } from './services/SessionStore'
import { TranscriptManager } from './services/TranscriptManager'
import { registerHandlers } from './ipc/handlers'

// ─── App-level singletons ─────────────────────────────────────────────────────

const store = new Store<VoxlitSettings>({
  defaults: {
    hotkeyPrimary: 'Option+Space',
    hotkeyMode: 'push-to-talk',
    transcriptionEngine: 'local',
    cloudProvider: 'groq',
    localModel: 'ggml-small.en',
    vadSensitivity: 0.5,
    fillerWordFilter: false,
    customDictionary: [],
    launchAtLogin: false,
    menubarOnly: false
  },
  encryptionKey: 'voxlit-store-v1'  // encrypts openaiApiKey at rest
})

const socketManager = new SocketManager()
const sessionStore = new SessionStore()
const transcriptManager = new TranscriptManager(
  sessionStore,
  () => ({ provider: store.get('cloudProvider'), groqApiKey: store.get('groqApiKey'), openaiApiKey: store.get('openaiApiKey') }),
  () => store.get('localModel')
)

let mainWindow: BrowserWindow | null = null
let pillWindow: BrowserWindow | null = null
let tray: Tray | null = null

// ─── Window creation ──────────────────────────────────────────────────────────

function createPillWindow() {
  pillWindow = new BrowserWindow({
    width: 320,
    height: 72,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    type: 'panel',    // macOS: floats above all spaces including full-screen apps
    resizable: false,
    movable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/pill.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // Position bottom-center of the screen (like Glaido)
  const { screen } = require('electron')
  const display = screen.getPrimaryDisplay()
  const { width, height } = display.workAreaSize
  pillWindow.setPosition(Math.floor(width / 2) - 150, height - 80)

  if (process.env['ELECTRON_RENDERER_URL']) {
    pillWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/pill.html`)
  } else {
    pillWindow.loadFile(join(__dirname, '../renderer/pill.html'))
  }

  // Hide once loaded — show only when recording starts
  pillWindow.once('ready-to-show', () => pillWindow?.hide())
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 650,
    show: process.env['NODE_ENV'] === 'development',  // show immediately in dev
    backgroundColor: '#0A0A0F',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    minWidth: 720,
    minHeight: 500,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })
}

function createTray() {
  const iconPath = join(__dirname, '../../resources/icons/tray.png')
  const icon = nativeImage.createFromPath(iconPath)
  icon.setTemplateImage(true)   // lets macOS invert for dark/light menu bar
  tray = new Tray(icon)
  tray.setToolTip('Voxlit')

  const menu = Menu.buildFromTemplate([
    {
      label: 'Open Voxlit',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(menu)
  tray.on('double-click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}

// ─── IPC event broadcasting ───────────────────────────────────────────────────

function broadcastToAll(channel: string, ...args: unknown[]) {
  pillWindow?.webContents.send(channel, ...args)
  mainWindow?.webContents.send(channel, ...args)
}

// ─── Service wiring ───────────────────────────────────────────────────────────

function wireServices() {
  let currentState: RecordingState = 'idle'
  let pcmAccumulator: Buffer[] = []

  socketManager.on('status', (status, error) => {
    broadcastToAll(IPC.HELPER_STATUS, { status, error })
  })

  socketManager.on('hotkey', (action: string) => {
    if (action === 'start' || (action === 'toggle' && currentState === 'idle')) {
      currentState = 'listening'
      pcmAccumulator = []
      pillWindow?.showInactive()
      broadcastToAll(IPC.RECORDING_STATE, { state: currentState })
    } else if (action === 'stop' || (action === 'toggle' && currentState !== 'idle')) {
      if (pcmAccumulator.length > 0) {
        currentState = 'processing'
        broadcastToAll(IPC.RECORDING_STATE, { state: currentState })
        const pcm = Buffer.concat(pcmAccumulator)
        pcmAccumulator = []
        transcriptManager.enqueue(pcm, store.get('transcriptionEngine'), store.get('localModel'))
      } else {
        // No audio captured — hide immediately
        currentState = 'idle'
        broadcastToAll(IPC.RECORDING_STATE, { state: currentState })
        pillWindow?.hide()
      }
    }
  })

  const BAR_COUNT = 12
  // Smooth per-bar amplitudes carried across chunks for natural decay
  let barAmplitudes = new Array(BAR_COUNT).fill(0) as number[]

  socketManager.on('pcm', (chunk: Buffer) => {
    if (currentState === 'listening') {
      pcmAccumulator.push(chunk)

      // Compute per-bar RMS from actual PCM data
      const aligned = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.length)
      const allSamples = new Float32Array(aligned)
      const totalSamples = allSamples.length
      const samplesPerBar = Math.max(1, Math.floor(totalSamples / BAR_COUNT))

      const raw = Array.from({ length: BAR_COUNT }, (_, i) => {
        const start = i * samplesPerBar
        const end = Math.min(start + samplesPerBar, totalSamples)
        let sum = 0
        for (let j = start; j < end; j++) sum += allSamples[j] * allSamples[j]
        return Math.sqrt(sum / (end - start))
      })

      // Smooth with previous values (0.6 new + 0.4 old) for natural motion
      barAmplitudes = raw.map((v, i) => v * 0.6 + barAmplitudes[i] * 0.4)

      broadcastToAll(IPC.AMPLITUDE_UPDATE, barAmplitudes)
    }
  })

  transcriptManager.on('segment', (segment) => {
    currentState = 'idle'
    broadcastToAll(IPC.RECORDING_STATE, { state: currentState })
    broadcastToAll(IPC.TRANSCRIPT_SEGMENT, segment)
    pillWindow?.hide()
    socketManager.sendInject(segment.text)
  })

  transcriptManager.on('empty', () => {
    // Transcription returned blank — hide pill immediately
    currentState = 'idle'
    broadcastToAll(IPC.RECORDING_STATE, { state: currentState })
    pillWindow?.hide()
  })
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

// Track whether the app is in the process of quitting (to distinguish
// window close from full quit — prevents hiding window on quit).
let isQuitting = false

app.whenReady().then(() => {
  sessionStore.init()

  // Set custom dock icon
  const dockIconPath = join(__dirname, '../../resources/icons/icon.png')
  if (app.dock) app.dock.setIcon(nativeImage.createFromPath(dockIconPath))

  createPillWindow()
  createMainWindow()
  createTray()

  registerHandlers({ store, sessionStore, socketManager })
  wireServices()

  socketManager.start()

  app.on('activate', () => {
    mainWindow?.show()
  })
})

app.on('window-all-closed', () => {
  // On macOS, keep the app running in the tray even with no windows
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true
  socketManager.stop()
})
