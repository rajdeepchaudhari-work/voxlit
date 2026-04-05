import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import HistoryPanel from './HistoryPanel'
import SettingsPanel from './SettingsPanel'

type Tab = 'history' | 'settings'

function VoxlitLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 34 34" fill="none">
      {/* Squircle */}
      <rect x="1" y="1" width="32" height="32" rx="9" fill="#0A0A0F" stroke="url(#lg)" strokeWidth="1.2" />
      {/* 3 bars: left short, center tall, right short */}
      <rect x="9"  y="12" width="4" height="10" rx="2" fill="url(#lg)" />
      <rect x="15" y="8"  width="4" height="18" rx="2" fill="url(#lg)" />
      <rect x="21" y="12" width="4" height="10" rx="2" fill="url(#lg)" />
      <defs>
        <linearGradient id="lg" x1="17" y1="6" x2="17" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A78BFA" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function NavItem({
  icon, label, active, onClick
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 14px', borderRadius: 8,
        background: active ? 'rgba(124,58,237,0.12)' : 'transparent',
        border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
        color: active ? '#A78BFA' : '#5A5578',
        fontSize: 13, fontWeight: active ? 600 : 400,
        transition: 'all 120ms ease'
      }}
    >
      <span style={{ opacity: active ? 1 : 0.6 }}>{icon}</span>
      {label}
    </button>
  )
}

function HelperStatusDot({ status }: { status: string }) {
  const color = status === 'connected' ? '#10B981' : status === 'starting' ? '#F59E0B' : '#3A3458'
  const label = status === 'connected' ? 'Helper connected' : status === 'starting' ? 'Starting…' : 'Helper offline'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px 16px' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: status === 'connected' ? '0 0 6px #10B981' : 'none' }} />
      <span style={{ fontSize: 10, color: '#3A3458' }}>{label}</span>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('history')
  const helperStatus = useAppStore((s) => s.helperStatus)
  const initIPC = useAppStore((s) => s.initIPC)

  useEffect(() => {
    const cleanup = initIPC()
    return cleanup
  }, [])

  return (
    <div style={{
      display: 'flex', height: '100vh',
      background: '#0A0A0F', color: '#F0EEFF',
      fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
      WebkitUserSelect: 'none', overflow: 'hidden'
    }}>
      {/* Traffic-light drag region */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 44,
        WebkitAppRegion: 'drag', zIndex: 10, pointerEvents: 'none'
      } as React.CSSProperties} />

      {/* Sidebar */}
      <div style={{
        width: 200, flexShrink: 0,
        background: '#0D0D14',
        borderRight: '1px solid #1A1A26',
        display: 'flex', flexDirection: 'column',
        paddingTop: 52
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px 24px' }}>
          <VoxlitLogo />
          <span style={{
            fontFamily: "'Space Grotesk', Inter, system-ui",
            fontSize: 17, fontWeight: 700,
            letterSpacing: '-0.025em',
            background: 'linear-gradient(135deg, #A78BFA 0%, #22D3EE 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Voxlit
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <NavItem
            active={tab === 'history'}
            onClick={() => setTab('history')}
            label="History"
            icon={
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 4.5V8l2.5 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
          <NavItem
            active={tab === 'settings'}
            onClick={() => setTab('settings')}
            label="Settings"
            icon={
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            }
          />
        </nav>

        {/* Helper status */}
        <HelperStatusDot status={helperStatus} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          padding: '52px 24px 16px',
          borderBottom: '1px solid #1A1A26',
          flexShrink: 0
        }}>
          <h1 style={{
            margin: 0,
            fontFamily: "'Space Grotesk', Inter, system-ui",
            fontSize: 20, fontWeight: 700,
            letterSpacing: '-0.02em', color: '#F0EEFF'
          }}>
            {tab === 'history' ? 'History' : 'Settings'}
          </h1>
          {tab === 'history' && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#5A5578' }}>
              Your transcription sessions
            </p>
          )}
          {tab === 'settings' && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#5A5578' }}>
              Configure Voxlit to your workflow
            </p>
          )}
        </div>

        {/* Panel */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {tab === 'history' ? <HistoryPanel /> : <SettingsPanel />}
        </div>
      </div>
    </div>
  )
}
