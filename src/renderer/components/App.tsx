import { useEffect, useState } from 'react'
import logoSrc from '../assets/logo.png'
import { useAppStore } from '../store/useAppStore'
import { ipc } from '../lib/ipc'
import HistoryPanel from './HistoryPanel'
import SettingsPanel from './SettingsPanel'
import HomePanel from './HomePanel'
import OnboardingWizard from './OnboardingWizard'
import UpdateBanner from './UpdateBanner'

type View = 'home' | 'history' | 'settings'

// ─── Brand mark ───────────────────────────────────────────────────────────────

export function VoxlitMark({ size = 28 }: { size?: number }) {
  return (
    <img
      src={logoSrc}
      width={size}
      height={size}
      style={{ borderRadius: Math.round(size * 0.18), display: 'block', objectFit: 'cover' }}
      draggable={false}
    />
  )
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

function NavItem({ label, active, onClick }: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'block',
        padding: '9px 12px',
        border: '2px solid transparent',
        borderBottom: '2px solid #0A0A0A',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        background: active ? '#665DF5' : 'transparent',
        color: active ? '#FFFFFF' : '#0A0A0A',
        fontSize: 11,
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        transition: 'background 0.1s, color 0.1s',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = '#F5F0E8'
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent'
      }}
    >
      {label}
    </button>
  )
}

// ─── Helper status ────────────────────────────────────────────────────────────

function HelperStatus({ status, engine }: { status: string; engine: string }) {
  // Single combined status: helper readiness + engine. Avoids the confusing
  // "OFFLINE / ONLINE" two-row display where helper status and engine status
  // appear contradictory.
  const helperReady = status === 'connected'
  const helperStarting = status === 'starting'

  let dotColor = '#999'
  let textColor = '#999'
  let label = 'OFFLINE'

  if (!helperReady && !helperStarting) {
    dotColor = '#FF1744'; textColor = '#999'; label = 'HELPER OFFLINE'
  } else if (helperStarting) {
    dotColor = '#FFEB3B'; textColor = '#666'; label = 'STARTING…'
  } else if (engine === 'voxlit') {
    dotColor = '#665DF5'; textColor = '#665DF5'; label = 'VOXLIT CLOUD — ONLINE'
  } else if (engine === 'cloud') {
    dotColor = '#665DF5'; textColor = '#665DF5'; label = 'OPENAI — ONLINE'
  } else {
    dotColor = '#00C853'; textColor = '#00C853'; label = 'LOCAL — READY'
  }

  return (
    <div style={{
      padding: '10px 12px',
      borderTop: '2px solid #0A0A0A',
      display: 'flex', alignItems: 'center', gap: 7
    }}>
      <div style={{ width: 7, height: 7, background: dotColor, border: `1.5px solid ${dotColor === '#999' ? '#0A0A0A' : dotColor}`, flexShrink: 0 }} />
      <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em', color: textColor }}>
        {label}
      </span>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>('home')
  const [engine, setEngine] = useState<string>('local')
  const helperStatus = useAppStore((s) => s.helperStatus)
  const initIPC = useAppStore((s) => s.initIPC)
  const onboardingStep = useAppStore((s) => s.onboardingStep)
  const checkOnboardingStatus = useAppStore((s) => s.checkOnboardingStatus)

  useEffect(() => {
    const cleanup = initIPC()
    checkOnboardingStatus()
    ipc.getSettings().then((s) => setEngine(s.transcriptionEngine))
    return cleanup
  }, [])

  useEffect(() => {
    if (onboardingStep === null) {
      ipc.getSettings().then((s) => setEngine(s.transcriptionEngine))
    }
  }, [onboardingStep, view])

  if (onboardingStep !== null) {
    return <OnboardingWizard />
  }

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: 'var(--color-base)',
      color: 'var(--color-text-primary)',
      fontFamily: 'var(--font-sans)',
      WebkitUserSelect: 'none',
      overflow: 'hidden'
    }}>
      {/* Traffic-light drag region */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 44,
        WebkitAppRegion: 'drag', zIndex: 10, pointerEvents: 'none'
      } as React.CSSProperties} />

      {/* Sidebar */}
      <div style={{
        width: 200, flexShrink: 0,
        background: '#FFFFFF',
        borderRight: '3px solid #0A0A0A',
        display: 'flex', flexDirection: 'column',
        paddingTop: 44
      }}>
        {/* Logo row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 12px',
          borderBottom: '3px solid #0A0A0A',
        }}>
          <VoxlitMark size={26} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 14, fontWeight: 700,
            letterSpacing: '-0.01em',
            color: '#0A0A0A'
          }}>
            VOXLIT
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <NavItem active={view === 'home'}     onClick={() => setView('home')}     label="Home" />
          <NavItem active={view === 'history'}  onClick={() => setView('history')}  label="History" />
          <NavItem active={view === 'settings'} onClick={() => setView('settings')} label="Settings" />
        </nav>

        <HelperStatus status={helperStatus} engine={engine} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--color-base)' }}>
        <UpdateBanner />
        {view === 'home'     && <HomePanel onNavigateHistory={() => setView('history')} />}
        {view === 'history'  && <HistoryPanel />}
        {view === 'settings' && <SettingsPanel />}
      </div>
    </div>
  )
}
