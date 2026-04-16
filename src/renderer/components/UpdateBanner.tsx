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
          return { kind: 'downloading', version: prev.version, progress: p }
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

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(10, 10, 10, 0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50,
    }}>
      {stage.kind === 'downloading'
        ? <DownloadingCard version={stage.version} progress={stage.progress} onDismiss={() => setDismissed(true)} />
        : stage.kind === 'ready'
        ? <ReadyCard version={stage.version} installing={installing} onUpdate={async () => { setInstalling(true); await ipc.installUpdate() }} onLater={() => setDismissed(true)} />
        : null}
    </div>
  )
}

/* ── Brutalist card matching website style ─────────────────────────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: 380, maxWidth: 'calc(100vw - 48px)',
      background: '#FFFFFF',
      border: '3px solid #0A0A0A',
      boxShadow: '6px 6px 0px #0A0A0A',
      padding: '28px 24px 24px',
      color: '#0A0A0A',
      fontFamily: 'var(--font-body, Inter, -apple-system, sans-serif)',
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
      {/* Header */}
      <div style={{
        fontFamily: 'var(--font-mono, JetBrains Mono, monospace)',
        fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
        color: '#665DF5', textTransform: 'uppercase', marginBottom: 10,
      }}>
        DOWNLOADING UPDATE
      </div>

      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display, Space Grotesk, sans-serif)', letterSpacing: '-0.02em', marginBottom: 4 }}>
        Voxlit {version}
      </div>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 20, fontFamily: 'var(--font-mono, monospace)' }}>
        Installing automatically when ready
      </div>

      {/* Progress bar — brutalist: no border-radius, hard border */}
      <div style={{
        height: 8, border: '2px solid #0A0A0A', background: '#F5F0E8',
        marginBottom: 10,
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: '#665DF5',
          transition: 'width 200ms linear',
        }} />
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: '#666',
        fontFamily: 'var(--font-mono, monospace)', fontWeight: 700,
        letterSpacing: '0.04em',
      }}>
        <span>{pct.toFixed(0)}%</span>
        {hasTotal
          ? <span>{formatMB(progress.transferred)} / {formatMB(progress.total)} MB</span>
          : <span>PREPARING</span>
        }
      </div>

      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onDismiss}
          style={{
            background: 'transparent', border: '2px solid #0A0A0A',
            color: '#0A0A0A', fontSize: 10, fontWeight: 700, cursor: 'pointer',
            padding: '6px 14px', fontFamily: 'var(--font-mono, monospace)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}
        >
          Continue in background
        </button>
      </div>
    </Card>
  )
}

function ReadyCard({ version, installing, onUpdate, onLater }: {
  version: string
  installing: boolean
  onUpdate: () => void
  onLater: () => void
}) {
  return (
    <Card>
      {/* Header */}
      <div style={{
        fontFamily: 'var(--font-mono, JetBrains Mono, monospace)',
        fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
        color: '#00C853', textTransform: 'uppercase', marginBottom: 10,
      }}>
        UPDATE READY
      </div>

      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display, Space Grotesk, sans-serif)', letterSpacing: '-0.02em', marginBottom: 4 }}>
        Voxlit {version}
      </div>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 24, fontFamily: 'var(--font-mono, monospace)' }}>
        {installing ? 'Updating — Voxlit will relaunch automatically' : 'Click below to install and relaunch'}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onLater}
          disabled={installing}
          style={{
            flex: 1,
            background: '#FFFFFF', border: '3px solid #0A0A0A',
            color: '#0A0A0A', fontSize: 11, fontWeight: 700,
            padding: '12px 0', cursor: installing ? 'default' : 'pointer',
            opacity: installing ? 0.4 : 1,
            fontFamily: 'var(--font-mono, monospace)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}
        >
          Later
        </button>
        <button
          onClick={onUpdate}
          disabled={installing}
          style={{
            flex: 2,
            background: '#0A0A0A', border: '3px solid #0A0A0A',
            boxShadow: '4px 4px 0px #665DF5',
            color: '#FFFFFF', fontSize: 11, fontWeight: 700,
            padding: '12px 0', cursor: installing ? 'default' : 'pointer',
            opacity: installing ? 0.7 : 1,
            fontFamily: 'var(--font-mono, monospace)',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            transition: 'transform 0.1s, box-shadow 0.1s',
          }}
          onMouseEnter={(e) => { if (!installing) { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '6px 6px 0px #665DF5' } }}
          onMouseLeave={(e) => { if (!installing) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '4px 4px 0px #665DF5' } }}
        >
          {installing ? 'Updating…' : 'Install & Relaunch'}
        </button>
      </div>
    </Card>
  )
}
