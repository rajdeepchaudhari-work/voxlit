import { app, systemPreferences } from 'electron'
import { existsSync, statSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import * as https from 'https'
import type { SocketManager } from './SocketManager'
import type Store from 'electron-store'
import type { VoxlitSettings } from '@shared/ipc-types'

export type HealthStatus = 'ok' | 'warn' | 'fail' | 'unknown'

export interface SubsystemHealth {
  name: string
  status: HealthStatus
  message: string
  /// Action user can take. Optional — UI shows a button when present.
  action?: { label: string; kind: 'open-settings' | 'open-onboarding' | 'install-helper' | 'download-model' }
}

export interface HealthSnapshot {
  overall: HealthStatus
  checks: SubsystemHealth[]
  checkedAt: number
}

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
      action: { label: 'Re-run onboarding', kind: 'open-onboarding' },
    }
  }

  private checkAccessibility(): SubsystemHealth {
    const ok = systemPreferences.isTrustedAccessibilityClient(false)
    if (ok) return { name: 'Accessibility', status: 'ok', message: 'Granted' }
    return {
      name: 'Accessibility',
      status: 'warn',
      message: 'Not granted — text injection may fail',
      action: { label: 'Re-run onboarding', kind: 'open-onboarding' },
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
      action: { label: 'Re-run onboarding', kind: 'open-onboarding' },
    }
    return { name: 'Automation', status: 'warn', message: 'Not yet granted in this session' }
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

    return new Promise((resolve) => {
      // Just hit the host with a HEAD on root — ~50ms to a healthy CDN, fast-fail otherwise.
      const req = https.request(url, { method: 'HEAD', timeout: 2000 }, (res) => {
        const status = (res.statusCode ?? 0) < 500 ? 'ok' : 'warn'
        resolve({ name: 'Voxlit Server', status, message: `HTTP ${res.statusCode}` })
      })
      req.on('error', () => resolve({ name: 'Voxlit Server', status: 'fail', message: 'Unreachable' }))
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
