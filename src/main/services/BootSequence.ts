import { EventEmitter } from 'events'
import type { SocketManager } from './SocketManager'
import type { SessionStore } from './SessionStore'
import type { HealthCheck, HealthSnapshot } from './HealthCheck'

export type BootStepId = 'database' | 'helper' | 'health' | 'done'
export type BootStepStatus = 'pending' | 'running' | 'ok' | 'fail'

export interface BootStep {
  id: BootStepId
  label: string
  status: BootStepStatus
  detail?: string
}

export interface BootState {
  steps: BootStep[]
  done: boolean
  ok: boolean
  health?: HealthSnapshot
}

const INITIAL_STEPS: BootStep[] = [
  { id: 'database', label: 'Loading database',          status: 'pending' },
  { id: 'helper',   label: 'Connecting native helper',  status: 'pending' },
  { id: 'health',   label: 'Verifying subsystems',      status: 'pending' },
  { id: 'done',     label: 'Ready',                     status: 'pending' },
]

/**
 * Orchestrates app startup. Each step emits a 'progress' event so the splash
 * screen can react in real time. Order matters: helper must be connected before
 * the health check can probe its state.
 */
export class BootSequence extends EventEmitter {
  private steps: BootStep[] = JSON.parse(JSON.stringify(INITIAL_STEPS))
  private state: BootState = { steps: this.steps, done: false, ok: false }

  constructor(
    private readonly socketManager: SocketManager,
    private readonly sessionStore: SessionStore,
    private readonly healthCheck: HealthCheck,
  ) {
    super()
  }

  getState(): BootState { return this.state }

  private patchStep(id: BootStepId, status: BootStepStatus, detail?: string) {
    const s = this.steps.find(s => s.id === id)
    if (!s) return
    s.status = status
    if (detail !== undefined) s.detail = detail
    this.emit('progress', this.state)
  }

  async run(): Promise<BootState> {
    // 1. Database — synchronous so this completes immediately
    try {
      this.patchStep('database', 'running')
      this.sessionStore.init()
      this.patchStep('database', 'ok')
    } catch (err) {
      this.patchStep('database', 'fail', (err as Error).message)
      return this.finish(false)
    }

    // 2. Native helper — wait up to 5s for socket connection
    this.patchStep('helper', 'running')
    this.socketManager.start()
    const connected = await this.waitForHelper(5000)
    if (connected) {
      this.patchStep('helper', 'ok')
    } else {
      this.patchStep('helper', 'fail', 'Timed out — run scripts/build-native.sh if not built')
      // Don't bail — main UI still works without the helper (for settings, history, etc.)
    }

    // 3. Health check — non-fatal, just informational
    this.patchStep('health', 'running')
    try {
      const health = await this.healthCheck.run()
      this.state.health = health
      const status: BootStepStatus = health.overall === 'ok' ? 'ok' : health.overall === 'warn' ? 'ok' : 'fail'
      const failures = health.checks.filter(c => c.status === 'fail').map(c => c.name)
      this.patchStep('health', status, failures.length ? `Issues: ${failures.join(', ')}` : undefined)
    } catch (err) {
      this.patchStep('health', 'fail', (err as Error).message)
    }

    return this.finish(true)
  }

  private finish(ok: boolean): BootState {
    this.patchStep('done', ok ? 'ok' : 'fail')
    this.state.done = true
    this.state.ok = ok
    this.emit('progress', this.state)
    this.emit('done', this.state)
    return this.state
  }

  /** Resolve true if the helper connects within timeoutMs, false otherwise. */
  private waitForHelper(timeoutMs: number): Promise<boolean> {
    if (this.socketManager.getStatus().status === 'connected') return Promise.resolve(true)
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.socketManager.off('status', onStatus)
        resolve(false)
      }, timeoutMs)
      const onStatus = (status: string) => {
        if (status === 'connected') {
          clearTimeout(timer)
          this.socketManager.off('status', onStatus)
          resolve(true)
        }
      }
      this.socketManager.on('status', onStatus)
    })
  }
}
