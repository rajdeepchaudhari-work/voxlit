import { EventEmitter } from 'events'
import * as net from 'net'
import { spawn, ChildProcess, exec, execFile as execFileFn } from 'child_process'
import { join } from 'path'
import { app, systemPreferences, clipboard } from 'electron'
import type { HelperStatus, PermissionsState, PermissionStatus } from '@shared/ipc-types'

const SOCKET_PATH = '/tmp/voxlit.socket'
const MSG_TYPE_JSON = 0x01
const MSG_TYPE_PCM = 0x02

/**
 * SocketManager owns the lifecycle of the Swift native helper process
 * and the Unix domain socket connection to it.
 *
 * Events emitted:
 *   'hotkey'    (action: 'start' | 'stop' | 'toggle')
 *   'pcm'       (buffer: Buffer)  — raw 16kHz mono float32 PCM chunk
 *   'status'    (status: HelperStatus, error?: string)
 *   'permissions' (state: PermissionsState)
 */
export class SocketManager extends EventEmitter {
  private helper: ChildProcess | null = null
  private server: net.Server | null = null
  private socket: net.Socket | null = null
  private restartAttempts = 0
  private restartScheduled = false
  private restartTimer: NodeJS.Timeout | null = null
  private stopped = false
  private readonly MAX_RESTART_ATTEMPTS = 5
  /** Last status we broadcast — lets late subscribers (renderer) query current value. */
  private lastStatus: { status: HelperStatus; error?: string } = { status: 'disconnected' }

  getStatus() { return this.lastStatus }

  private emitStatus(status: HelperStatus, error?: string) {
    this.lastStatus = { status, error }
    this.emit('status', status, error)
  }

  start() {
    this.startSocketServer()
  }

  stop() {
    // Mark stopped FIRST so socket 'close' → scheduleRestart() is a no-op.
    // Otherwise a pending setTimeout can fire during app quit (e.g. during an
    // auto-update install) and call back into destroyed BrowserWindows.
    this.stopped = true
    if (this.restartTimer) {
      clearTimeout(this.restartTimer)
      this.restartTimer = null
      this.restartScheduled = false
    }
    this.socket?.destroy()
    this.server?.close()
    // SIGKILL so the helper exits immediately — SIGTERM gave it too much time to
    // linger, which blocked Squirrel.Mac's atomic bundle replace during updates.
    if (this.helper?.pid) {
      try { process.kill(this.helper.pid, 'SIGKILL') } catch (_) {}
    }
    this.helper = null
    this.socket = null
    this.server = null
  }

  /// Async variant for paths that MUST wait for the helper to actually exit
  /// (e.g. before autoUpdater.quitAndInstall, so file descriptors into the
  /// .app bundle are released before Squirrel.Mac tries to replace it).
  async stopAndWait(timeoutMs = 1500): Promise<void> {
    // Same ordering as stop(): flip stopped + cancel pending restart BEFORE
    // destroying the socket, so the socket 'close' handler can't re-arm a timer
    // that will fire after quitAndInstall has destroyed our windows.
    this.stopped = true
    if (this.restartTimer) {
      clearTimeout(this.restartTimer)
      this.restartTimer = null
      this.restartScheduled = false
    }
    const helper = this.helper
    this.socket?.destroy()
    this.server?.close()
    this.socket = null
    this.server = null

    if (!helper || !helper.pid) { this.helper = null; return }

    const exited = new Promise<void>((resolve) => {
      helper.once('exit', () => resolve())
    })
    try { process.kill(helper.pid, 'SIGKILL') } catch (_) {}
    this.helper = null

    await Promise.race([
      exited,
      new Promise<void>((r) => setTimeout(r, timeoutMs)),
    ])
  }

  sendInject(text: string) {
    // Always inject from Node — the Swift helper's TextInjector requires its
    // own TCC permissions (separate binary identity), which get invalidated on
    // every rebuild in dev. Electron's identity is stable, so Automation +
    // Accessibility permissions stick. Same paste mechanism either way
    // (clipboard + osascript Cmd+V), just with one reliable permission domain.
    console.log(`[inject] (${text.length} chars)`)
    injectViaClipboard(text)
  }

  /// Snapshot the frontmost app at recording start. Used by the Node fallback
  /// to restore focus before pasting (the Swift helper does this in TextInjector.captureFocusedApp).
  captureFocusedApp() {
    captureFocused()
  }

  setMicDevice(uid: string) {
    this.sendJson({ type: 'set_mic_device', uid })
  }

  setMicGain(gain: number) {
    this.sendJson({ type: 'set_mic_gain', gain })
  }

  setMicGainMode(mode: 'off' | 'manual' | 'auto') {
    this.sendJson({ type: 'set_mic_gain_mode', mode })
  }

  setNoiseSuppression(enabled: boolean) {
    this.sendJson({ type: 'set_noise_suppression', enabled })
  }

  /**
   * Ask the Swift helper to enumerate audio input devices.
   * Returns a promise that resolves with the device list (or [] on timeout).
   */
  listMicDevices(timeoutMs = 5000): Promise<Array<{ uid: string; name: string; isDefault: boolean; isBluetooth: boolean }>> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.removeListener('mic_devices', handler)
        resolve([])
      }, timeoutMs)
      const handler = (devices: Array<{ uid: string; name: string; isDefault: boolean; isBluetooth?: boolean }>) => {
        clearTimeout(timer)
        resolve(devices.map(d => ({ ...d, isBluetooth: d.isBluetooth ?? false })))
      }
      this.once('mic_devices', handler)
      this.sendJson({ type: 'list_mic_devices' })
    })
  }

  checkPermissions(): PermissionsState {
    const micStatus = systemPreferences.getMediaAccessStatus('microphone')
    const mic: PermissionsState['microphone'] =
      micStatus === 'granted' ? 'granted' :
      micStatus === 'denied' || micStatus === 'restricted' ? 'denied' :
      'not-determined'

    const accessible = systemPreferences.isTrustedAccessibilityClient(false)
    const accessibility: PermissionsState['accessibility'] = accessible ? 'granted' : 'not-determined'

    // Automation status is controlled by ipc/handlers — we never probe here because
    // the only way to detect it is to RUN a System Events command, which fires the
    // TCC prompt. That would happen on every app launch instead of when the user
    // explicitly clicks Grant. The handler updates this via setAutomationStatus().
    return { microphone: mic, accessibility, automation: this.lastAutomationStatus }
  }

  /// Cached automation status. Updated when the user clicks Grant in onboarding,
  /// or by an explicit refresh-after-prompt flow. Defaults to 'not-determined'.
  private lastAutomationStatus: PermissionStatus = 'not-determined'

  /// Fire the macOS TCC prompt for AppleEvents and update cached status.
  /// Async because the prompt blocks until the user responds (could be many seconds).
  /// Returns the resolved status when the user picks Allow/Deny, or 'not-determined'
  /// if they dismiss without choosing.
  probeAutomationNow(): Promise<PermissionStatus> {
    return new Promise((resolve) => {
      execFileFn('osascript', ['-e', 'tell application "System Events" to count processes'],
        { timeout: 60_000 }, (err, _stdout, stderr) => {
          let status: PermissionStatus
          if (!err) status = 'granted'
          else if ((stderr ?? '').toString().includes('1743') || (stderr ?? '').toString().includes('not allowed')) status = 'denied'
          else status = 'not-determined'
          this.lastAutomationStatus = status
          resolve(status)
        }
      )
    })
  }

  /// Set the cached status without probing — used after onboarding to remember
  /// a successful grant across checkPermissions() calls.
  setAutomationStatus(status: PermissionStatus) {
    this.lastAutomationStatus = status
  }

  private startSocketServer() {
    const { unlink } = require('fs')
    // Remove stale socket file
    try { unlink.call(null, SOCKET_PATH, () => {}) } catch (_) {}

    this.server = net.createServer((socket) => {
      this.socket = socket
      this.emitStatus('connected')
      this.restartAttempts = 0

      socket.on('data', (data) => this.handleData(data))
      socket.on('close', () => {
        this.socket = null
        this.emitStatus('disconnected')
        this.scheduleRestart()
      })
      socket.on('error', (err) => {
        this.emitStatus('error', err.message)
      })
    })

    this.server.listen(SOCKET_PATH, () => {
      this.spawnHelper()
    })
  }

  private spawnHelper() {
    const helperPath = app.isPackaged
      ? join(process.resourcesPath, 'native/macos/build/release/VoxlitHelper')
      : join(app.getAppPath(), 'resources/native/macos/build/release/VoxlitHelper')

    // Don't crash if the native helper hasn't been compiled yet
    const { existsSync } = require('fs')
    if (!existsSync(helperPath)) {
      console.warn('[SocketManager] VoxlitHelper not found at', helperPath)
      console.warn('[SocketManager] Run ./scripts/build-native.sh to build it')
      this.emitStatus('error', 'Native helper not built — run ./scripts/build-native.sh')
      return
    }

    this.emitStatus('starting')

    this.helper = spawn(helperPath, [], { stdio: ['ignore', 'pipe', 'pipe'] })

    this.helper.on('error', (err) => {
      console.error('Failed to spawn VoxlitHelper:', err)
      this.emitStatus('error', err.message)
      this.helper = null
      this.scheduleRestart()
    })

    // removeAllListeners before adding — previous helpers may have attached listeners
    // to the same pipes if references were kept around during a respawn
    this.helper.stdout?.removeAllListeners('data')
    this.helper.stderr?.removeAllListeners('data')
    this.helper.stdout?.on('data', (d: Buffer) => console.log('[helper]', d.toString()))
    this.helper.stderr?.on('data', (d: Buffer) => console.error('[helper]', d.toString()))

    this.helper.on('exit', (code, signal) => {
      if (signal) {
        console.error(`[SocketManager] VoxlitHelper killed by signal ${signal} — likely a crash`)
      } else {
        console.warn(`[SocketManager] VoxlitHelper exited with code ${code}`)
      }
      this.helper = null
      // Only restart here if the socket already closed (no pending restart from socket 'close').
      // If the socket is still open, the 'close' handler will fire next and restart there.
      if (!this.socket) {
        this.scheduleRestart()
      }
    })
  }

  private scheduleRestart() {
    // Never schedule after stop() — otherwise a pending timer fires during app
    // quit (auto-update install) and emits into destroyed BrowserWindows.
    if (this.stopped) return
    // Deduplicate: socket 'close' and helper 'exit' both call this on a crash
    if (this.restartScheduled) return
    if (this.restartAttempts >= this.MAX_RESTART_ATTEMPTS) {
      this.emitStatus('error', 'Helper failed to restart after max attempts')
      return
    }
    // Don't bother retrying if the binary simply doesn't exist
    const helperPath = app.isPackaged
      ? join(process.resourcesPath, 'native/macos/build/release/VoxlitHelper')
      : join(app.getAppPath(), 'resources/native/macos/build/release/VoxlitHelper')
    const { existsSync } = require('fs')
    if (!existsSync(helperPath)) return

    const delay = Math.min(1000 * 2 ** this.restartAttempts, 30_000)
    this.restartAttempts++
    this.restartScheduled = true
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null
      this.restartScheduled = false
      if (this.stopped) return
      this.spawnHelper()
    }, delay)
  }

  // Length-prefix framing: 4-byte big-endian length, 1-byte type, N-1 bytes payload
  private readBuffer = Buffer.alloc(0)

  private handleData(chunk: Buffer) {
    this.readBuffer = Buffer.concat([this.readBuffer, chunk])

    while (this.readBuffer.length >= 5) {
      const msgLen = this.readBuffer.readUInt32BE(0)
      if (this.readBuffer.length < 4 + msgLen) break

      const type = this.readBuffer[4]
      const payload = this.readBuffer.slice(5, 4 + msgLen)
      this.readBuffer = this.readBuffer.slice(4 + msgLen)

      if (type === MSG_TYPE_JSON) {
        try {
          const msg = JSON.parse(payload.toString('utf8'))
          this.handleJsonMessage(msg)
        } catch (e) {
          console.error('Failed to parse helper JSON:', e)
        }
      } else if (type === MSG_TYPE_PCM) {
        this.emit('pcm', payload)
      }
    }
  }

  private handleJsonMessage(msg: Record<string, unknown>) {
    if (msg.type === 'hotkey') {
      this.emit('hotkey', msg.action)
    } else if (msg.type === 'permissions') {
      this.emit('permissions', msg.state)
    } else if (msg.type === 'mic_devices') {
      this.emit('mic_devices', msg.devices)
    } else if (msg.type === 'audio_error') {
      // Helper couldn't start audio (device gone, HAL stale, bind failed).
      // Surface to main so it can notify the renderer and reset recording state.
      this.emit('audio_error', {
        kind: (msg.kind as string) ?? 'unknown',
        message: (msg.message as string) ?? 'Audio error',
        preferredUid: (msg.preferredUid as string) ?? '',
      })
    }
  }

  /// Called from the main process when Electron's powerMonitor fires 'resume'.
  /// Clean up the old helper (which is likely zombified after sleep) and kick
  /// off a fresh spawn. Resets restart backoff so we don't wait 30s for wake-up.
  handleSystemResume() {
    if (this.stopped) return
    console.log('[SocketManager] System resumed — resetting helper')
    this.restartAttempts = 0
    if (this.restartTimer) {
      clearTimeout(this.restartTimer)
      this.restartTimer = null
      this.restartScheduled = false
    }
    // Tear down socket + kill helper; the 'exit' or 'close' handler (whichever
    // fires first) will scheduleRestart, which now runs with a 1s delay.
    this.socket?.destroy()
    this.socket = null
    if (this.helper?.pid) {
      try { process.kill(this.helper.pid, 'SIGKILL') } catch (_) {}
    }
    this.helper = null
    // If neither handler fires (e.g. helper already dead), force a restart here.
    this.scheduleRestart()
  }

  private sendJson(obj: Record<string, unknown>) {
    if (!this.socket) return
    const payload = Buffer.from(JSON.stringify(obj), 'utf8')
    const header = Buffer.alloc(5)
    header.writeUInt32BE(payload.length + 1, 0)
    header[4] = MSG_TYPE_JSON
    this.socket.write(Buffer.concat([header, payload]))
  }
}

/**
 * Inject text into the focused app without the Swift helper.
 * Captures focused app at recording start, activates it before paste, restores clipboard.
 * Used as a dev-mode fallback — production always goes through the Swift TextInjector.
 */
let capturedAppName: string | null = null

function captureFocused() {
  // Snapshot the frontmost app BEFORE Voxlit's UI (StatusPill etc) steals focus.
  // Used at inject time to route the Cmd+V keystroke back to the right app.
  exec(`osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`,
    (err, stdout) => {
      if (err) { console.warn('[inject-fallback] capture failed:', err.message); return }
      capturedAppName = stdout.trim()
      console.log(`[inject-fallback] captured focused app: "${capturedAppName}"`)
    }
  )
}

function injectViaClipboard(text: string) {
  if (!text) return
  const previous = clipboard.readText()
  clipboard.writeText(text)

  const target = capturedAppName
  // Build the AppleScript: activate captured app (so keystroke lands there),
  // settle 80ms (activation is async), then send Cmd+V.
  // Pass each script line as its own -e to dodge shell-quoting hell with app names.
  const args = ['-e', 'tell application "System Events" to keystroke "v" using command down']
  if (target) {
    args.unshift(
      '-e', `tell application "${target.replace(/"/g, '\\"')}" to activate`,
      '-e', 'delay 0.08',
    )
  }

  execFileFn('osascript', args, (err, _stdout, stderr) => {
    if (err) {
      console.warn('[inject] paste failed:', err.message)
      if (stderr) console.warn('[inject] stderr:', stderr.trim())
      console.warn('[inject] grant Automation > System Events to Electron in System Settings > Privacy & Security')
    } else {
      console.log(`[inject] pasted into "${target ?? 'frontmost app'}"`)
    }
    setTimeout(() => clipboard.writeText(previous), 800)
  })
}
