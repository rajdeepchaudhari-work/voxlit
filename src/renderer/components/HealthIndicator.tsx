import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ipc } from '../lib/ipc'
import { useAppStore } from '../store/useAppStore'
import type { HealthSnapshot, SubsystemHealth, HealthCategory } from '@shared/ipc-types'

type ActionKind = NonNullable<SubsystemHealth['action']>['kind']

interface Props {
  /// Called when a check's action button is clicked. Receives the action kind
  /// so the parent can switch views, open URLs, etc.
  onAction?: (kind: ActionKind) => void
}

const COLORS: Record<HealthSnapshot['overall'], { bg: string; label: string }> = {
  ok:      { bg: '#00C853', label: 'HEALTHY' },
  warn:    { bg: '#FFEB3B', label: 'WARNINGS' },
  fail:    { bg: '#FF1744', label: 'ISSUES' },
  unknown: { bg: '#999999', label: 'CHECKING' },
  // Info shouldn't propagate to overall, but type union requires us to cover it
  info:    { bg: '#665DF5', label: 'INFO' },
}

const CATEGORY_TITLES: Record<HealthCategory, string> = {
  permissions:    'PERMISSIONS',
  subsystems:     'SUBSYSTEMS',
  configuration:  'CONFIGURATION',
}

const CATEGORY_ORDER: HealthCategory[] = ['subsystems', 'permissions', 'configuration']

export default function HealthIndicator({ onAction }: Props = {}) {
  const [health, setHealth] = useState<HealthSnapshot | null>(null)
  const [open, setOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const setOnboardingStep = useAppStore((s) => s.setOnboardingStep)

  // Measure the button's position every time we open, so the portal-rendered
  // popover can anchor directly under it.
  function toggleOpen() {
    console.log('[HealthIndicator] toggleOpen', { currentOpen: open, hasButtonRef: !!buttonRef.current, hasHealth: !!health })
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      console.log('[HealthIndicator] button rect', rect)
      setAnchor({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
    }
    setOpen(prev => !prev)
  }

  // Close on Escape only for now — click-outside can race with the open click
  useEffect(() => {
    if (!open) return
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [open])

  // Default handlers for the action kinds. Parent's onAction (if provided)
  // runs first so it can override these (e.g. App.tsx wants 'open-settings'
  // to switch its view state). We then fall through to sensible defaults.
  function handleAction(kind: ActionKind) {
    onAction?.(kind)
    if (kind === 'open-onboarding') {
      setOnboardingStep('welcome')
    } else if (kind === 'open-settings') {
      // Fire a global event — App.tsx listens and switches its 'view' state
      window.dispatchEvent(new CustomEvent('voxlit:navigate', { detail: { view: 'settings' } }))
    } else if (kind === 'install-helper') {
      window.open('https://github.com/rajdeepchaudhari-work/voxlit#building-the-native-helper', '_blank')
    } else if (kind === 'download-model') {
      window.dispatchEvent(new CustomEvent('voxlit:navigate', { detail: { view: 'settings' } }))
    }
    setOpen(false)
  }

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

  // Group checks by category, preserve insertion order within each
  const grouped = new Map<HealthCategory, SubsystemHealth[]>()
  for (const check of health.checks) {
    const cat = check.category ?? 'subsystems'
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(check)
  }

  // Counts for the popover header summary (only blocking checks)
  const blocking = health.checks.filter(c => c.category !== 'configuration')
  const failCount = blocking.filter(c => c.status === 'fail').length
  const warnCount = blocking.filter(c => c.status === 'warn').length
  const okCount   = blocking.filter(c => c.status === 'ok').length

  console.log('[HealthIndicator] render', { open, hasAnchor: !!anchor, willShowPopover: open && !!anchor })

  const popover = open && anchor ? (
    <div
      data-voxlit-health-popover
      style={{
        position: 'fixed',
        top: anchor.top, right: anchor.right,
        width: 360, maxHeight: '70vh', overflowY: 'auto', zIndex: 9999,
        background: '#FFFDF7',
        border: '3px solid #0A0A0A',
        boxShadow: '6px 6px 0px #0A0A0A',
        padding: 14,
      }}
    >
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '2px solid #0A0A0A', paddingBottom: 8, marginBottom: 6,
          }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11, letterSpacing: '0.06em', color: '#0A0A0A' }}>
                SYSTEM HEALTH
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#666', marginTop: 2, letterSpacing: '0.04em' }}>
                {okCount} ok · {warnCount} warn · {failCount} fail · checked {timeAgo(health.checkedAt)}
              </div>
            </div>
            <button
              onClick={refresh}
              disabled={refreshing}
              style={{
                background: 'transparent', border: '1px solid #0A0A0A',
                cursor: refreshing ? 'default' : 'pointer',
                fontSize: 9, fontFamily: 'var(--font-mono)',
                fontWeight: 700, padding: '3px 8px', letterSpacing: '0.06em',
              }}
            >
              {refreshing ? '…' : '↻ REFRESH'}
            </button>
          </div>

          {/* Grouped checks */}
          {CATEGORY_ORDER.map(cat => {
            const items = grouped.get(cat)
            if (!items || items.length === 0) return null
            return (
              <div key={cat} style={{ marginTop: 12 }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.12em', color: '#665DF5', marginBottom: 4,
                }}>
                  {CATEGORY_TITLES[cat]}
                </div>
                {items.map(item => <CheckRow key={item.name} check={item} onAction={handleAction} />)}
              </div>
            )
          })}

          {/* Footer hint */}
          <div style={{
            marginTop: 14, paddingTop: 10, borderTop: '1px dashed rgba(10,10,10,0.15)',
            fontFamily: 'var(--font-mono)', fontSize: 9, color: '#666', letterSpacing: '0.04em',
          }}>
            Auto-refreshes every 30 s · click ↻ for live snapshot
          </div>
    </div>
  ) : null

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        title="Click for system status detail"
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
      {popover && createPortal(popover, document.body)}
    </>
  )
}

function CheckRow({ check, onAction }: { check: SubsystemHealth; onAction: (kind: ActionKind) => void }) {
  const dot =
    check.status === 'ok'   ? '#00C853' :
    check.status === 'warn' ? '#FFEB3B' :
    check.status === 'fail' ? '#FF1744' :
    check.status === 'info' ? '#665DF5' :
                              '#999'
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: '6px 0', borderBottom: '1px dashed rgba(10,10,10,0.08)',
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%', background: dot,
        marginTop: 5, flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0A0A0A', fontFamily: 'var(--font-display)' }}>
          {check.name}
        </div>
        <div style={{ fontSize: 11, color: '#555', fontFamily: 'var(--font-mono)', marginTop: 2, wordBreak: 'break-word' }}>
          {check.message}
        </div>
        {check.detail && (
          <div style={{ fontSize: 10, color: '#888', fontFamily: 'var(--font-mono)', marginTop: 2, wordBreak: 'break-all' }}>
            {check.detail}
          </div>
        )}
        {check.action && (
          <button
            onClick={() => onAction(check.action!.kind)}
            style={{
              marginTop: 6,
              fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '3px 8px',
              background: '#FFEB3B',
              border: '1.5px solid #0A0A0A',
              boxShadow: '2px 2px 0px #0A0A0A',
              cursor: 'pointer',
              color: '#0A0A0A',
            }}
          >
            {check.action.label} →
          </button>
        )}
      </div>
    </div>
  )
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}
