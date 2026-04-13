import { EventEmitter } from 'events'
import * as net from 'net'
import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { app, systemPreferences } from 'electron'
import type { HelperStatus, PermissionsState } from '@shared/ipc-types'

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
  private readonly MAX_RESTART_ATTEMPTS = 5

  start() {
    this.startSocketServer()
  }

  stop() {
    this.socket?.destroy()
    this.server?.close()
    this.helper?.kill()
    this.helper = null
    this.socket = null
    this.server = null
  }

  sendInject(text: string) {
    this.sendJson({ type: 'inject', text })
  }

  checkPermissions(): PermissionsState {
    const micStatus = systemPreferences.getMediaAccessStatus('microphone')
    const mic: PermissionsState['microphone'] =
      micStatus === 'granted' ? 'granted' :
      micStatus === 'denied' || micStatus === 'restricted' ? 'denied' :
      'not-determined'

    const accessible = systemPreferences.isTrustedAccessibilityClient(false)
    const accessibility: PermissionsState['accessibility'] = accessible ? 'granted' : 'not-determined'

    return { microphone: mic, accessibility }
  }

  private startSocketServer() {
    const { unlink } = require('fs')
    // Remove stale socket file
    try { unlink.call(null, SOCKET_PATH, () => {}) } catch (_) {}

    this.server = net.createServer((socket) => {
      this.socket = socket
      this.emit('status', 'connected' satisfies HelperStatus)
      this.restartAttempts = 0

      socket.on('data', (data) => this.handleData(data))
      socket.on('close', () => {
        this.socket = null
        this.emit('status', 'disconnected' satisfies HelperStatus)
        this.scheduleRestart()
      })
      socket.on('error', (err) => {
        this.emit('status', 'error' satisfies HelperStatus, err.message)
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
      this.emit('status', 'error' satisfies HelperStatus, 'Native helper not built — run ./scripts/build-native.sh')
      return
    }

    this.emit('status', 'starting' satisfies HelperStatus)

    this.helper = spawn(helperPath, [], { stdio: ['ignore', 'pipe', 'pipe'] })

    this.helper.on('error', (err) => {
      console.error('Failed to spawn VoxlitHelper:', err)
      this.emit('status', 'error' satisfies HelperStatus, err.message)
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
    // Deduplicate: socket 'close' and helper 'exit' both call this on a crash
    if (this.restartScheduled) return
    if (this.restartAttempts >= this.MAX_RESTART_ATTEMPTS) {
      this.emit('status', 'error' satisfies HelperStatus, 'Helper failed to restart after max attempts')
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
    setTimeout(() => {
      this.restartScheduled = false
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
    }
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
