import { app, BrowserWindow, Tray, Menu, nativeImage, shell, ipcMain, powerMonitor, dialog } from 'electron'
import { join } from 'path'
import { randomUUID } from 'crypto'
import Store from 'electron-store'
import { IPC } from '@shared/ipc-types'
import type { VoxlitSettings, RecordingState } from '@shared/ipc-types'
import { SocketManager } from './services/SocketManager'
import { SessionStore } from './services/SessionStore'
import { TranscriptManager } from './services/TranscriptManager'
import { UtteranceChunker, type UtteranceChunk } from './services/UtteranceChunker'
import { registerHandlers } from './ipc/handlers'
import { initAutoUpdater } from './services/UpdateManager'
import { resetAllUserData, resetAndRelaunch } from './services/DataReset'
import { detectAgentTrigger, processAgentCommand } from './services/VoxlitAgent'

// ─── CLI flags ────────────────────────────────────────────────────────────────
// Handled BEFORE constructing any services so we clear the DB + electron-store
// before they try to read from the directory we're about to delete. Essential
// for users upgrading from an incompatible past version whose app won't launch.
//
// Usage:
//   /Applications/Voxlit.app/Contents/MacOS/Voxlit --reset
// Exits immediately after the wipe — user relaunches by clicking the icon.
if (process.argv.includes('--reset')) {
  // No teardown here: services/DB/electron-store haven't been constructed yet,
  // so nothing is holding open handles on the directory we're deleting.
  //
  // Wrap in try/catch + force process.exit on any error. Without this, a
  // throw (permission denied on a locked file, disk full, etc.) would fall
  // through to the service construction below and we'd try to boot on a
  // partially-deleted userData dir — worse than the state the user ran
  // --reset to escape.
  //
  // process.exit (not app.exit) because at module-eval time app.whenReady()
  // hasn't fired; app.exit is not yet safe.
  try {
    const ok = resetAllUserData()
    process.exit(ok ? 0 : 1)
  } catch (err) {
    console.error('[Voxlit --reset] failed:', err)
    process.exit(1)
  }
}

// ─── App-level singletons ─────────────────────────────────────────────────────

const store = new Store<VoxlitSettings>({
  defaults: {
    hotkeyPrimary: 'Fn',
    hotkeyMode: 'push-to-talk',
    transcriptionEngine: 'voxlit',
    cloudProvider: 'openai',
    localModel: 'ggml-small.en',
    vadSensitivity: 0.5,
    fillerWordFilter: false,
    customDictionary: [],
    launchAtLogin: false,
    menubarOnly: false,
    voxlitServerUrl: 'https://api.voxlit.co/v1/transcribe',
    voxlitServerToken: 'c6e9c055ca194fabb7f60b328ca8144b06cf2839252770a785b5abe1af3806d2',
    micGain: 1.0,
    // v2: off by default in v2.0. Flipped to true in a v2.0.x point release
    // after real-world latency + accuracy A/B. Applies to local engine only.
    chunkedTranscription: false
  },
  encryptionKey: 'voxlit-store-v1'  // encrypts openaiApiKey at rest
})

const socketManager = new SocketManager()
const sessionStore = new SessionStore()
const transcriptManager = new TranscriptManager(
  sessionStore,
  () => ({ openaiApiKey: store.get('openaiApiKey') }),
  () => store.get('localModel'),
  () => ({
    url:   store.get('voxlitServerUrl')   ?? '',
    token: store.get('voxlitServerToken') ?? '',
  })
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
    show: true,
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
  const iconsDir = app.isPackaged
    ? join(process.resourcesPath, 'icons')
    : join(__dirname, '../../resources/icons')
  const iconPath = join(iconsDir, 'tray.png')
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
      label: 'Reset All Data…',
      click: () => {
        // Kill the helper BEFORE showing the dialog. showMessageBoxSync blocks
        // the main process; if recording is in flight, PCM keeps arriving
        // from the helper and the in-flight utterance hangs. Stopping the
        // helper up front guarantees no more audio arrives while the user is
        // reading the confirmation, and means teardown isn't racing an
        // in-progress transcribe. If the user cancels the dialog, the boot
        // sequence's respawn path restarts the helper on the next hotkey.
        socketManager.stop()
        broadcastToAll(IPC.RECORDING_STATE, { state: 'idle' as RecordingState })
        pillWindow?.hide()

        // Native modal — survives even if the React UI is broken, which is
        // the exact scenario this command exists to rescue.
        const result = dialog.showMessageBoxSync({
          type: 'warning',
          buttons: ['Reset and Relaunch', 'Cancel'],
          defaultId: 1,
          cancelId: 1,
          title: 'Reset Voxlit',
          message: 'Reset all Voxlit data?',
          detail: 'This will delete your history, settings, API key, and downloaded models, then relaunch Voxlit. Bundled app files and system permissions (microphone, accessibility) are not affected. This cannot be undone.',
        })
        if (result === 0) {
          isQuitting = true
          // Teardown order: flush electron-store (clear in-memory state so
          // nothing gets written back during process exit) → close SQLite
          // (WAL checkpoint + release fds so the rmSync actually unlinks
          // inodes instead of orphaning them) → ensure helper is stopped
          // (idempotent; we already called .stop() above, but guarding
          // against a cancel → re-open → confirm retry).
          resetAndRelaunch(() => {
            try { store.clear() } catch (e) { console.warn('[DataReset] store.clear failed:', e) }
            try { sessionStore.close() } catch (e) { console.warn('[DataReset] sessionStore.close failed:', e) }
            try { socketManager.stop() } catch (e) { console.warn('[DataReset] socketManager.stop failed:', e) }
          })
        }
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
  // Guard against late-firing events during app quit / auto-update install:
  // once a BrowserWindow is destroyed, accessing .webContents throws
  // "Object has been destroyed".
  if (pillWindow && !pillWindow.isDestroyed()) {
    pillWindow.webContents.send(channel, ...args)
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args)
  }
}

// ─── Service wiring ───────────────────────────────────────────────────────────

function wireServices() {
  let currentState: RecordingState = 'idle'
  // v2: chunker replaces the pcmAccumulator array. It buffers PCM internally
  // and emits 'chunk' events at silence gates for parallel transcription.
  // In pass-through mode (flag off OR non-local engine) it collapses to
  // one-chunk-per-utterance — identical to v1.0 behavior.
  const chunker = new UtteranceChunker()
  let currentUtteranceId: string | null = null

  chunker.on('chunk', (c: UtteranceChunk) => {
    // Use the engine/model snapshotted on the chunk itself — re-reading from
    // the store here would let a mid-utterance settings change route later
    // chunks to a different engine, or cross-contaminate a late chunk that
    // fires after a new utterance has begun.
    transcriptManager.enqueueChunk(c.utteranceId, c.seq, c.pcm, c.engine, c.modelName, c.isFinal)
  })

  // Hard reset of in-flight utterance state. Used by audio_error and by
  // powerMonitor resume/unlock handlers — those kill the Swift helper, so
  // the user's hotkey-release never reaches us and `finalizeUtterance`
  // would otherwise never fire (tracker leaks with its rawPcm shadow).
  function abortCurrentUtterance() {
    if (currentUtteranceId) {
      chunker.abort()
      transcriptManager.cancelUtterance(currentUtteranceId)
      currentUtteranceId = null
    }
    if (currentState !== 'idle') {
      currentState = 'idle'
      broadcastToAll(IPC.RECORDING_STATE, { state: currentState })
      pillWindow?.hide()
    }
  }

  socketManager.on('status', (status, error) => {
    broadcastToAll(IPC.HELPER_STATUS, { status, error })
    // When helper connects, push saved mic preference + gain
    if (status === 'connected') {
      const uid = store.get('micDeviceUid') ?? ''
      if (uid) socketManager.setMicDevice(uid)
      const mode = store.get('micGainMode') ?? 'off'
      socketManager.setMicGainMode(mode)
      socketManager.setMicGain(store.get('micGain') ?? 2.5)
      // VPIO causes engine start failures on some hardware (mic indicator flickers,
      // no audio captured). One-time reset for users who got defaulted to true earlier.
      if (!store.get('noiseSuppressionMigrated' as never)) {
        store.set('noiseSuppressionEnabled', false)
        store.set('noiseSuppressionMigrated' as never, true as never)
      }
      socketManager.setNoiseSuppression(store.get('noiseSuppressionEnabled') ?? false)
    }
  })

  socketManager.on('hotkey', (action: string) => {
    if (action === 'start' || (action === 'toggle' && currentState === 'idle')) {
      currentState = 'listening'
      currentUtteranceId = randomUUID()
      const engine = store.get('transcriptionEngine')
      const modelName = store.get('localModel')
      const chunked = store.get('chunkedTranscription') ?? false
      chunker.begin(currentUtteranceId, engine, chunked, modelName)
      // Snapshot the focused app NOW — needed by the Node inject fallback to
      // restore focus before pasting. Swift TextInjector does the same in captureFocusedApp().
      socketManager.captureFocusedApp()
      pillWindow?.showInactive()
      broadcastToAll(IPC.RECORDING_STATE, { state: currentState })
    } else if (action === 'stop' || (action === 'toggle' && currentState !== 'idle')) {
      const id = currentUtteranceId
      currentUtteranceId = null
      // chunker.end() synchronously emits the final 'chunk' event (which our
      // listener forwards as enqueueChunk) and returns the raw concatenated
      // PCM. The chunk must hit the queue BEFORE finalizeUtterance so the
      // finalize check sees it. That ordering is guaranteed by end() being
      // sync and the 'chunk' listener being sync.
      const rawPcm = id ? chunker.end() : Buffer.alloc(0)
      if (id && rawPcm.length > 0) {
        currentState = 'processing'
        broadcastToAll(IPC.RECORDING_STATE, { state: currentState })
        // rawPcm only fuels the fallback path; TranscriptManager ignores it
        // unless a chunk failed. Passing it for all cases is cheap.
        transcriptManager.finalizeUtterance(id, rawPcm)
      } else {
        // No audio captured — hide immediately
        currentState = 'idle'
        broadcastToAll(IPC.RECORDING_STATE, { state: currentState })
        pillWindow?.hide()
        if (id) transcriptManager.cancelUtterance(id)
      }
    }
  })

  const BAR_COUNT = 12
  // Smooth per-bar amplitudes carried across chunks for natural decay
  let barAmplitudes = new Array(BAR_COUNT).fill(0) as number[]
  // Throttle amplitude broadcasts to 30 Hz — PCM chunks arrive 100+ times/sec
  let amplitudeFramePending = false

  socketManager.on('pcm', (chunk: Buffer) => {
    if (currentState === 'listening') {
      chunker.pushPcm(chunk)

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

      // Throttle to 30 fps — schedule one broadcast per ~33ms frame
      if (!amplitudeFramePending) {
        amplitudeFramePending = true
        const snapshot = [...barAmplitudes]
        setImmediate(() => {
          amplitudeFramePending = false
          broadcastToAll(IPC.AMPLITUDE_UPDATE, snapshot)
        })
      }
    }
  })

  transcriptManager.on('segment', (segment) => {
    currentState = 'idle'
    broadcastToAll(IPC.RECORDING_STATE, { state: currentState })

    // Voxlit Agent: detect trigger phrases like "Hey Voxlit, optimize this prompt..."
    // and route the command through GPT-4o-mini instead of injecting raw text.
    const { triggered, command } = detectAgentTrigger(segment.text)
    if (triggered && command) {
      broadcastToAll(IPC.RECORDING_STATE, { state: 'processing' as RecordingState })
      processAgentCommand(command, {
        openaiApiKey: store.get('openaiApiKey'),
        voxlitServerUrl: store.get('voxlitServerUrl'),
        voxlitServerToken: store.get('voxlitServerToken'),
      }).then((result) => {
        const agentSegment = { ...segment, text: result }
        broadcastToAll(IPC.RECORDING_STATE, { state: 'idle' as RecordingState })
        broadcastToAll(IPC.TRANSCRIPT_SEGMENT, agentSegment)
        pillWindow?.hide()
        socketManager.sendInject(result)
      }).catch((err) => {
        console.error('[VoxlitAgent] failed:', err.message)
        // Fall back to injecting the raw transcript
        broadcastToAll(IPC.RECORDING_STATE, { state: 'idle' as RecordingState })
        broadcastToAll(IPC.TRANSCRIPT_SEGMENT, segment)
        pillWindow?.hide()
        socketManager.sendInject(segment.text)
      })
      return
    }

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

  // Surface transcription errors (missing model, missing binary) to the
  // renderer via the existing audio_error channel so the user sees an
  // actionable message instead of a silent pill-hide.
  transcriptManager.on('error', (message: string) => {
    broadcastToAll(IPC.AUDIO_ERROR, {
      kind: 'transcription_error',
      message,
    })
  })

  // Helper failed to open the mic (device gone, HAL stale, or bind error).
  // Surface to the renderer so the UI can stop showing 'listening' and, when
  // it's a device fallback, tell the user which device is now active.
  socketManager.on('audio_error', (err) => {
    broadcastToAll(IPC.AUDIO_ERROR, err)
    abortCurrentUtterance()
  })

  // Expose for top-level powerMonitor handlers — they fire outside of
  // wireServices() scope but need to reset the same in-flight state.
  abortCurrentUtteranceRef = abortCurrentUtterance
}

// Set by wireServices() so the powerMonitor handlers installed in
// app.whenReady() can clear in-flight utterance state before the Swift
// helper is killed + respawned.
let abortCurrentUtteranceRef: (() => void) | null = null

// ─── App lifecycle ────────────────────────────────────────────────────────────

// Track whether the app is in the process of quitting (to distinguish
// window close from full quit — prevents hiding window on quit).
let isQuitting = false

app.whenReady().then(async () => {
  // Set custom dock icon
  const iconsDir = app.isPackaged
    ? join(process.resourcesPath, 'icons')
    : join(__dirname, '../../resources/icons')
  if (app.dock) app.dock.setIcon(nativeImage.createFromPath(join(iconsDir, 'icon.png')))

  createPillWindow()
  createMainWindow()
  createTray()

  registerHandlers({ store, sessionStore, socketManager })
  wireServices()

  // Let the updater kill the helper cleanly before quitAndInstall fires
  if (app.isPackaged) initAutoUpdater(() => mainWindow)

  // Boot sequence — orchestrates database init, helper spawn, health check.
  // Renderer shows a splash listening to BOOT_PROGRESS until 'done' fires.
  const { BootSequence } = await import('./services/BootSequence')
  const { HealthCheck } = await import('./services/HealthCheck')
  const boot = new BootSequence(socketManager, sessionStore, new HealthCheck(socketManager, store))

  // Stream boot progress to all windows so the splash can react in real time
  boot.on('progress', (state) => broadcastToAll(IPC.BOOT_PROGRESS, state))

  // Renderer requests the current state on mount (handles late-mount race)
  ipcMain.handle(IPC.GET_BOOT_STATE, () => boot.getState())

  // Log a final summary to stdout for headless dev visibility
  boot.on('done', (state) => {
    const symbol = (s: string) => s === 'ok' ? '✓' : s === 'fail' ? '✗' : s === 'running' ? '·' : ' '
    console.log(`[boot] complete (${state.ok ? 'ok' : 'with errors'})`)
    for (const s of state.steps) console.log(`  ${symbol(s.status)} ${s.label}${s.detail ? ` — ${s.detail}` : ''}`)
  })

  void boot.run()

  // On system resume, the Swift helper is often zombified (post-sleep AVAudio
  // HAL state is unreliable, socket may be half-open). Kill it + respawn with
  // backoff reset so the user doesn't have to quit/relaunch the app after
  // closing the lid or switching users.
  // On resume/unlock, clear in-flight utterance state BEFORE killing the
  // helper — the helper respawn otherwise orphans the utterance (its
  // hotkey-release message never arrives, so the tracker + ~2MB rawPcm leak).
  powerMonitor.on('resume', () => {
    abortCurrentUtteranceRef?.()
    socketManager.handleSystemResume()
  })
  powerMonitor.on('unlock-screen', () => {
    abortCurrentUtteranceRef?.()
    socketManager.handleSystemResume()
  })

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
