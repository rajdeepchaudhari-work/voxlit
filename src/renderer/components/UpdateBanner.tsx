import { useEffect, useState } from 'react'
import { ipc } from '../lib/ipc'
import type { UpdateProgress } from '@shared/ipc-types'

type Stage =
  | { kind: 'idle' }
  | { kind: 'available'; version: string }
  | { kind: 'downloading'; version: string; progress: UpdateProgress }
  | { kind: 'ready'; version: string }

function formatMB(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(1)
}

export default function UpdateBanner() {
  const [stage, setStage] = useState<Stage>({ kind: 'idle' })
  const [installing, setInstalling] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const offAvailable = ipc.onUpdateAvailable((info) => {
      setStage({
        kind: 'downloading',
        version: info.version,
        progress: { percent: 0, bytesPerSecond: 0, transferred: 0, total: 0 },
      })
    })
    const offProgress = ipc.onUpdateProgress((p) => {
      setStage((prev) => {
        if (prev.kind === 'downloading' || prev.kind === 'available') {
          const version = prev.kind === 'downloading' ? prev.version : prev.version
          return { kind: 'downloading', version, progress: p }
        }
        return prev
      })
    })
    const offDownloaded = ipc.onUpdateDownloaded((info) => {
      setStage({ kind: 'ready', version: info.version })
    })
    return () => { offAvailable(); offProgress(); offDownloaded() }
  }, [])

  if (dismissed || stage.kind === 'idle') return null

  const overlay = (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(10, 10, 15, 0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50,
      animation: 'fade-up 200ms ease-out',
    }}>
      {stage.kind === 'downloading'
        ? <DownloadingCard version={stage.version} progress={stage.progress} onDismiss={() => setDismissed(true)} />
        : stage.kind === 'ready'
        ? <ReadyCard version={stage.version} installing={installing} onQuit={async () => { setInstalling(true); await ipc.installUpdate() }} onLater={() => setDismissed(true)} />
        : null}
    </div>
  )

  return overlay
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: 420, maxWidth: 'calc(100vw - 48px)',
      background: 'var(--bg-1, #111118)',
      border: '1px solid var(--border, #2E2E4A)',
      borderRadius: 14,
      boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02) inset',
      padding: '28px 28px 24px',
      color: 'var(--text, #F0EEFF)',
      fontFamily: 'var(--font-body, -apple-system, Inter, sans-serif)',
    }}>
      {children}
    </div>
  )
}

function DownloadingCard({ version, progress, onDismiss }: {
  version: string
  progress: UpdateProgress
  onDismiss: () => void
}) {
  const pct = Math.max(0, Math.min(100, progress.percent || 0))
  const hasTotal = progress.total > 0

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(124, 58, 237, 0.12)',
          border: '1px solid rgba(124, 58, 237, 0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>
            Downloading Voxlit {version}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2, #9B96B8)', marginTop: 2 }}>
            Update installs when you quit
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 6, borderRadius: 3, overflow: 'hidden',
        background: 'rgba(255,255,255,0.06)',
        marginBottom: 10,
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: 'linear-gradient(90deg, #7C3AED, #A78BFA)',
          transition: 'width 240ms cubic-bezier(0.16, 1, 0.3, 1)',
        }} />
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 12, color: 'var(--text-2, #9B96B8)',
        fontFamily: 'var(--font-mono, JetBrains Mono, monospace)',
      }}>
        <span>{pct.toFixed(0)}%</span>
        {hasTotal ? (
          <span>{formatMB(progress.transferred)} / {formatMB(progress.total)} MB</span>
        ) : (
          <span>Preparing…</span>
        )}
      </div>

      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onDismiss}
          style={{
            background: 'transparent', border: 'none', color: 'var(--text-2, #9B96B8)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '6px 10px',
            borderRadius: 6, fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text, #F0EEFF)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-2, #9B96B8)' }}
        >
          Continue in background
        </button>
      </div>
    </Card>
  )
}

function ReadyCard({ version, installing, onQuit, onLater }: {
  version: string
  installing: boolean
  onQuit: () => void
  onLater: () => void
}) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>
            Voxlit {version} is ready
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2, #9B96B8)', marginTop: 2 }}>
            Quit and reopen to get the new version
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
        <button
          onClick={onLater}
          disabled={installing}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-strong, #3A3A55)',
            color: 'var(--text, #F0EEFF)',
            fontSize: 13, fontWeight: 500, padding: '8px 14px',
            borderRadius: 8, cursor: installing ? 'default' : 'pointer',
            opacity: installing ? 0.5 : 1, fontFamily: 'inherit',
          }}
        >
          Later
        </button>
        <button
          onClick={onQuit}
          disabled={installing}
          style={{
            background: '#7C3AED', border: 'none',
            color: '#FFFFFF', fontSize: 13, fontWeight: 600,
            padding: '8px 18px', borderRadius: 8,
            cursor: installing ? 'default' : 'pointer',
            opacity: installing ? 0.7 : 1, fontFamily: 'inherit',
            transition: 'background 140ms ease',
          }}
          onMouseEnter={(e) => { if (!installing) e.currentTarget.style.background = '#5B21B6' }}
          onMouseLeave={(e) => { if (!installing) e.currentTarget.style.background = '#7C3AED' }}
        >
          {installing ? 'Quitting…' : 'Quit & Update'}
        </button>
      </div>
    </Card>
  )
}
