import { app, systemPreferences } from 'electron'
import { existsSync, statSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import * as https from 'https'
import type { SocketManager } from './SocketManager'
import type Store from 'electron-store'
// Single source of truth lives in @shared/ipc-types so the renderer's
// HealthIndicator and the main process emit/consume the same shape.
import type { VoxlitSettings, HealthStatus, SubsystemHealth, HealthSnapshot } from '@shared/ipc-types'

export type { HealthStatus, SubsystemHealth, HealthSnapshot }

/// Quickly verify every subsystem the app needs to do its job.
/// Designed to be cheap (<200ms total) — no blocking probes, no network round-trips
/// unless explicitly opted-in for the active engine.
export class HealthCheck {
  constructor(
    private readonly socketManager: SocketManager,
    private readonly store: Store<VoxlitSettings>,
  ) {}

  async run(): Promise<HealthSnapshot> {
    const checks: SubsystemHealth[] = []

    checks.push(this.checkSwiftHelper())
    checks.push(this.checkMicrophone())
    checks.push(this.checkAccessibility())
    checks.push(this.checkAutomation())

    const engine = this.store.get('transcriptionEngine') ?? 'voxlit'
    if (engine === 'local') {
      checks.push(this.checkWhisperBinary())
      checks.push(this.checkWhisperModel())
    } else if (engine === 'voxlit') {
      checks.push(await this.checkVoxlitServer())
    } else if (engine === 'cloud') {
      checks.push(this.checkOpenAIKey())
    }

    const overall: HealthStatus =
      checks.some(c => c.status === 'fail') ? 'fail' :
      checks.some(c => c.status === 'warn') ? 'warn' :
      checks.every(c => c.status === 'ok')   ? 'ok'   : 'unknown'

    return { overall, checks, checkedAt: Date.now() }
  }

  // ─── Individual checks ──────────────────────────────────────────────────────

  private checkSwiftHelper(): SubsystemHealth {
    const { status } = this.socketManager.getStatus()
    if (status === 'connected') return { name: 'Native helper', status: 'ok', message: 'Connected' }
    if (status === 'starting') return { name: 'Native helper', status: 'warn', message: 'Starting…' }
    return {
      name: 'Native helper',
      status: 'fail',
      message: status === 'error' ? 'Failed to spawn — run scripts/build-native.sh' : 'Disconnected',
      action: { label: 'How to fix', kind: 'install-helper' },
    }
  }

  private checkMicrophone(): SubsystemHealth {
    const s = systemPreferences.getMediaAccessStatus('microphone')
    if (s === 'granted') return { name: 'Microphone', status: 'ok', message: 'Granted' }
    return {
      name: 'Microphone',
      status: 'fail',
      message: s === 'denied' || s === 'restricted' ? 'Denied' : 'Not yet granted',
      action: { label: 'Grant now', kind: 'grant-microphone' },
    }
  }

  private checkAccessibility(): SubsystemHealth {
    const ok = systemPreferences.isTrustedAccessibilityClient(false)
    if (ok) return { name: 'Accessibility', status: 'ok', message: 'Granted' }
    return {
      name: 'Accessibility',
      status: 'warn',
      message: 'Not granted — text injection may fail',
      action: { label: 'Open settings', kind: 'grant-accessibility' },
    }
  }

  private checkAutomation(): SubsystemHealth {
    // Read the cached value — never probe at startup (would trigger TCC prompt).
    const auto = this.socketManager.checkPermissions().automation
    if (auto === 'granted') return { name: 'Automation', status: 'ok', message: 'Granted' }
    if (auto === 'denied') return {
      name: 'Automation',
      status: 'fail',
      message: 'Denied — text paste will fail',
      action: { label: 'Open settings', kind: 'grant-automation' },
    }
    return {
      name: 'Automation',
      status: 'warn',
      message: 'Not yet granted in this session',
      action: { label: 'Grant now', kind: 'grant-automation' },
    }
  }

  private checkWhisperBinary(): SubsystemHealth {
    const binaryName = process.arch === 'arm64' ? 'whisper-cli-arm64' : 'whisper-cli-x64'
    const path = app.isPackaged
      ? join(process.resourcesPath, 'binaries', binaryName)
      : join(app.getAppPath(), 'resources/binaries', binaryName)
    if (existsSync(path)) return { name: 'whisper.cpp', status: 'ok', message: binaryName }
    return {
      name: 'whisper.cpp',
      status: 'fail',
      message: 'Missing — run scripts/build-whisper.sh',
      action: { label: 'How to fix', kind: 'install-helper' },
    }
  }

  private checkWhisperModel(): SubsystemHealth {
    const modelName = (this.store.get('localModel') ?? 'ggml-base.en') + '.bin'
    const bundled = app.isPackaged
      ? join(process.resourcesPath, 'models', modelName)
      : join(app.getAppPath(), 'resources/models', modelName)
    const downloaded = join(homedir(), 'Library', 'Application Support', 'Voxlit', 'models', modelName)
    const path = existsSync(bundled) ? bundled : existsSync(downloaded) ? downloaded : null
    if (path) return { name: 'Whisper model', status: 'ok', message: `${modelName} (${(statSync(path).size / 1e6).toFixed(0)} MB)` }
    return {
      name: 'Whisper model',
      status: 'fail',
      message: `${modelName} not found`,
      action: { label: 'Download', kind: 'download-model' },
    }
  }

  private checkVoxlitServer(): Promise<SubsystemHealth> {
    const url = this.store.get('voxlitServerUrl') ?? ''
    const token = this.store.get('voxlitServerToken') ?? ''
    if (!url || !token) return Promise.resolve({
      name: 'Voxlit Server',
      status: 'warn',
      message: 'Not configured',
      action: { label: 'Open settings', kind: 'open-settings' },
    })

    // Reachability probe. Any HTTP response (even 4xx like 405 Method Not Allowed)
    // means the server is up. Only a network error or 5xx is a real failure.
    return new Promise((resolve) => {
      const req = https.request(url, { method: 'GET', timeout: 2000 }, (res) => {
        const code = res.statusCode ?? 0
        res.resume()  // drain so the socket can close cleanly
        if (code === 0) resolve({ name: 'Voxlit Server', status: 'fail', message: 'No response' })
        else if (code >= 500) resolve({ name: 'Voxlit Server', status: 'fail', message: `Server error (${code})` })
        else resolve({ name: 'Voxlit Server', status: 'ok', message: 'Reachable' })
      })
      req.on('error', (err) => resolve({ name: 'Voxlit Server', status: 'fail', message: `Unreachable: ${err.message}` }))
      req.on('timeout', () => { req.destroy(); resolve({ name: 'Voxlit Server', status: 'fail', message: 'Timed out' }) })
      req.end()
    })
  }

  private checkOpenAIKey(): SubsystemHealth {
    const key = this.store.get('openaiApiKey')
    if (key && key.length > 20) return { name: 'OpenAI key', status: 'ok', message: 'Configured' }
    return {
      name: 'OpenAI key',
      status: 'fail',
      message: 'Not set',
      action: { label: 'Open settings', kind: 'open-settings' },
    }
  }
}
