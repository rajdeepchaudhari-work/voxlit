import { app, systemPreferences } from 'electron'
import { existsSync, statSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import * as https from 'https'
import type { SocketManager } from './SocketManager'
import type Store from 'electron-store'
// Single source of truth for these types lives in @shared/ipc-types so the
// renderer's HealthIndicator and the main process emit/consume the same shape.
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

    // ── Subsystems (can the app run at all?) ────────────────────────────────
    checks.push({ ...this.checkSwiftHelper(),   category: 'subsystems' })

    // ── Permissions (will it actually work?) ────────────────────────────────
    checks.push({ ...this.checkMicrophone(),    category: 'permissions' })
    checks.push({ ...this.checkAccessibility(), category: 'permissions' })
    checks.push({ ...this.checkAutomation(),    category: 'permissions' })

    // ── Engine-specific dependencies ────────────────────────────────────────
    const engine = this.store.get('transcriptionEngine') ?? 'voxlit'
    if (engine === 'local') {
      checks.push({ ...this.checkWhisperBinary(), category: 'subsystems' })
      checks.push({ ...this.checkWhisperModel(),  category: 'subsystems' })
    } else if (engine === 'voxlit') {
      checks.push({ ...(await this.checkVoxlitServer()), category: 'subsystems' })
    } else if (engine === 'cloud') {
      checks.push({ ...this.checkOpenAIKey(), category: 'subsystems' })
    }

    // ── Configuration (how is the app currently set up?) ────────────────────
    // These are info-only — they don't fail overall status, they just surface
    // the current settings so the user can see what's active at a glance.
    checks.push(this.describeEngine(engine))
    checks.push(this.describeMicDevice())
    checks.push(this.describeHotkey())
    checks.push(this.describeGainMode())
    checks.push(this.describeNoiseSuppression())
    checks.push(this.describeVersion())

    // Overall status ignores info-only checks in category 'configuration'
    const blocking = checks.filter(c => c.category !== 'configuration')
    const overall: HealthStatus =
      blocking.some(c => c.status === 'fail') ? 'fail' :
      blocking.some(c => c.status === 'warn') ? 'warn' :
      blocking.every(c => c.status === 'ok')  ? 'ok'   : 'unknown'

    return { overall, checks, checkedAt: Date.now() }
  }

  // ─── Configuration (info-only) ─────────────────────────────────────────────

  private describeEngine(engine: string): SubsystemHealth {
    const label =
      engine === 'voxlit' ? 'Voxlit Cloud (recommended)' :
      engine === 'local'  ? `Local — ${this.store.get('localModel') ?? 'ggml-base.en'}` :
      engine === 'cloud'  ? 'OpenAI Whisper (BYOK)' :
      engine
    return {
      name: 'Transcription engine',
      status: 'info',
      category: 'configuration',
      message: label,
    }
  }

  private describeMicDevice(): SubsystemHealth {
    const uid = this.store.get('micDeviceUid') ?? ''
    return {
      name: 'Microphone device',
      status: 'info',
      category: 'configuration',
      message: uid ? 'Custom input' : 'System default',
      detail: uid || undefined,
    }
  }

  private describeGainMode(): SubsystemHealth {
    const mode = this.store.get('micGainMode') ?? 'off'
    const gain = this.store.get('micGain') ?? 2.5
    const message =
      mode === 'off'    ? 'Off — no boost applied' :
      mode === 'auto'   ? 'Auto — AGC adapts per buffer' :
                          `Manual — ${gain.toFixed(1)}× boost`
    return {
      name: 'Mic gain boost',
      status: 'info',
      category: 'configuration',
      message,
    }
  }

  private describeNoiseSuppression(): SubsystemHealth {
    const enabled = this.store.get('noiseSuppressionEnabled') ?? false
    return {
      name: 'Noise suppression',
      status: 'info',
      category: 'configuration',
      message: enabled ? 'On — Apple voice processing engaged at next recording' : 'Off',
    }
  }

  private describeHotkey(): SubsystemHealth {
    const key = this.store.get('hotkeyPrimary') ?? 'Fn'
    const mode = this.store.get('hotkeyMode') ?? 'push-to-talk'
    return {
      name: 'Hotkey',
      status: 'info',
      category: 'configuration',
      message: mode === 'push-to-talk' ? `Push-to-talk — hold ${key}` : `Toggle — press ${key}`,
    }
  }

  private describeVersion(): SubsystemHealth {
    return {
      name: 'Voxlit version',
      status: 'info',
      category: 'configuration',
      message: `v${app.getVersion()} · ${process.arch} · ${app.isPackaged ? 'production' : 'dev'}`,
    }
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
      message: s === 'denied' || s === 'restricted' ? 'Denied — open System Settings to enable' : 'Not yet granted',
      action: { label: s === 'denied' || s === 'restricted' ? 'Open settings' : 'Grant now', kind: 'grant-microphone' },
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
      const retryAction = { label: 'Open settings', kind: 'open-settings' as const }
      const req = https.request(url, { method: 'GET', timeout: 2000 }, (res) => {
        const code = res.statusCode ?? 0
        res.resume()  // drain so the socket can close cleanly
        if (code === 0) resolve({ name: 'Voxlit Server', status: 'fail', message: 'No response', action: retryAction })
        else if (code >= 500) resolve({ name: 'Voxlit Server', status: 'fail', message: `Server error (${code})`, action: retryAction })
        else resolve({ name: 'Voxlit Server', status: 'ok', message: 'Reachable' })
      })
      req.on('error', (err) => resolve({ name: 'Voxlit Server', status: 'fail', message: `Unreachable: ${err.message}`, action: retryAction }))
      req.on('timeout', () => { req.destroy(); resolve({ name: 'Voxlit Server', status: 'fail', message: 'Timed out', action: retryAction }) })
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
