import { useEffect, useState } from 'react'
import { ipc } from '../lib/ipc'
import type { HealthSnapshot, SubsystemHealth } from '@shared/ipc-types'

const COLORS = {
  ok:      { bg: '#00C853', label: 'HEALTHY' },
  warn:    { bg: '#FFEB3B', label: 'WARNINGS' },
  fail:    { bg: '#FF1744', label: 'ISSUES' },
  unknown: { bg: '#999999', label: 'CHECKING' },
}

export default function HealthIndicator() {
  const [health, setHealth] = useState<HealthSnapshot | null>(null)
  const [open, setOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  async function refresh() {
    setRefreshing(true)
    try {
      const snapshot = await ipc.healthCheck()
      setHealth(snapshot)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30_000)
    return () => clearInterval(interval)
  }, [])

  if (!health) return null
  const { bg, label } = COLORS[health.overall]

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Click for details"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 10px',
          background: '#FFFFFF',
          border: '2px solid #0A0A0A',
          boxShadow: '2px 2px 0px #0A0A0A',
          cursor: 'pointer',
          fontFamily: 'var(--font-mono)',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
        }}
      >
        <span style={{
          width: 8, height: 8, borderRadius: '50%', background: bg,
          boxShadow: health.overall === 'ok' ? `0 0 6px ${bg}` : 'none',
        }} />
        {label}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          width: 320, zIndex: 100,
          background: '#FFFDF7',
          border: '3px solid #0A0A0A',
          boxShadow: '6px 6px 0px #0A0A0A',
          padding: 14,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '2px solid #0A0A0A', paddingBottom: 8, marginBottom: 10,
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11, letterSpacing: '0.06em' }}>
              SYSTEM HEALTH
            </span>
            <button
              onClick={refresh}
              disabled={refreshing}
              style={{
                background: 'transparent', border: '1px solid #0A0A0A',
                cursor: 'pointer', fontSize: 9, fontFamily: 'var(--font-mono)',
                fontWeight: 700, padding: '2px 8px', letterSpacing: '0.06em',
              }}
            >
              {refreshing ? '…' : '↻ REFRESH'}
            </button>
          </div>
          {health.checks.map(c => <CheckRow key={c.name} check={c} />)}
        </div>
      )}
    </div>
  )
}

function CheckRow({ check }: { check: SubsystemHealth }) {
  const dot = check.status === 'ok' ? '#00C853'
            : check.status === 'warn' ? '#FFEB3B'
            : check.status === 'fail' ? '#FF1744'
            : '#999'
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: '6px 0', borderBottom: '1px dashed rgba(10,10,10,0.1)',
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%', background: dot,
        marginTop: 5, flexShrink: 0,
      }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0A0A0A', fontFamily: 'var(--font-display)' }}>
          {check.name}
        </div>
        <div style={{ fontSize: 11, color: '#555', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
          {check.message}
        </div>
      </div>
    </div>
  )
}
