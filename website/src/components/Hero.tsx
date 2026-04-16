import { useState } from 'react'
import { useTerminalAnim } from '../hooks/useTerminalAnim'

const VERSION = '2.0.0'
const DOWNLOAD_URL = `https://github.com/rajdeepchaudhari-work/voxlit/releases/download/v${VERSION}/voxlit-${VERSION}-arm64.dmg`

export default function Hero() {
  const { displayText, cursorVisible } = useTerminalAnim()

  return (
    <section style={{
      paddingTop: 120,
      paddingBottom: 100,
      borderBottom: '3px solid #0A0A0A',
      background: '#FFFDF7',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div className="page-container" style={{ position: 'relative' }}>
        <div className="hero-grid">

          {/* Left — Text */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>

            {/* Headline */}
            <h1 className="hero-stagger" style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 0.95,
              marginBottom: 28,
              fontSize: 'clamp(48px, 7vw, 88px)',
            }}>
              <span style={{ display: 'block', color: '#0A0A0A' }}>Your voice.</span>
              <span style={{ display: 'block', color: '#665DF5' }}>Your machine.</span>
            </h1>

            {/* Subhead */}
            <p className="hero-stagger" style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1.0625rem',
              lineHeight: 1.7,
              color: '#333333',
              maxWidth: 520,
              marginBottom: 36,
            }}>
              Free, open-source voice dictation for macOS. Hold a key, speak, text
              appears in any app. No cloud. No subscription. No account.
            </p>

            {/* Homebrew install */}
            <div className="hero-stagger">
              <BrewBlock />
            </div>

            {/* Secondary CTA */}
            <div className="hero-stagger" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14, marginBottom: 24 }}>
              <a href={DOWNLOAD_URL} download className="btn-ghost" style={{ fontSize: '0.8125rem', padding: '10px 20px' }}>
                <DownloadIcon />
                Download .dmg
              </a>
            </div>

            {/* Trust Pills */}
            <div className="hero-stagger" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['MIT Licensed', '100% Offline', 'macOS Only'].map(pill => (
                <span key={pill} className="trust-pill">{pill}</span>
              ))}
            </div>
          </div>

          {/* Right — Terminal */}
          <div className="hero-stagger" style={{ alignSelf: 'center' }}>
            <div className="terminal-window" style={{ boxShadow: '8px 8px 0px #0A0A0A' }}>
              <div className="terminal-titlebar">
                <div className="terminal-dot" style={{ background: '#FF5F57' }} />
                <div className="terminal-dot" style={{ background: '#FFBD2E' }} />
                <div className="terminal-dot" style={{ background: '#28C840' }} />
                <span style={{ marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#999' }}>
                  voxlit · transcription
                </span>
              </div>

              <div className="terminal-content">
                <div style={{ marginBottom: 16 }}>
                  <span style={{ color: '#666', fontSize: '0.8125rem' }}>$ </span>
                  <span style={{ color: '#AAA', fontSize: '0.8125rem' }}>voxlit --hotkey "⌃Space" --model base.en</span>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <span className="badge badge-green" style={{ marginRight: 8 }}>READY</span>
                  <span style={{ color: '#999', fontSize: '0.8125rem' }}>Model loaded in 1.2s · Metal GPU</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C853' }} className="animate-pulse-rec" />
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#00C853',
                  }}>TRANSCRIBING</span>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 16, marginLeft: 8 }}>
                    {[16, 24, 20, 28, 18].map((h, i) => (
                      <div key={i} className="waveform-bar" style={{ height: h, background: '#665DF5' }} />
                    ))}
                  </div>
                </div>

                <div style={{ borderLeft: '3px solid #665DF5', paddingLeft: 12, minHeight: 64 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: '#EEEEEE', lineHeight: 1.6 }}>
                    {displayText}
                    {cursorVisible && (
                      <span className="animate-terminal-blink" style={{
                        display: 'inline-block', width: 2, height: '1em',
                        background: '#665DF5', marginLeft: 2, verticalAlign: 'text-bottom',
                      }} />
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

type InstallTab = 'curl' | 'brew'

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? '#665DF5' : 'transparent',
        border: `1px solid ${active ? '#665DF5' : '#444'}`,
        cursor: 'pointer',
        padding: '3px 10px',
        fontFamily: 'var(--font-mono)', fontSize: '0.625rem', fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: active ? '#FFFFFF' : '#888',
        transition: 'none',
      }}
    >
      {label}
    </button>
  )
}

function BrewBlock() {
  const [tab, setTab] = useState<InstallTab>('brew')

  const curlLine = 'curl -fsSL https://voxlit.co/install.sh | bash'
  const brewLine = 'brew install --cask voxlit'
  const lines = tab === 'curl' ? [curlLine] : [brewLine]

  const handleCopy = () => {
    navigator.clipboard.writeText(lines.join('\n'))
  }

  return (
    <div style={{ border: '2px solid #0A0A0A', background: '#1A1A1A', marginBottom: 4 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 12px', borderBottom: '2px solid #333', background: '#2A2A2A',
        gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <TabButton active={tab === 'brew'} label="brew" onClick={() => setTab('brew')} />
          <TabButton active={tab === 'curl'} label="curl" onClick={() => setTab('curl')} />
        </div>
        <button
          onClick={handleCopy}
          title="Copy to clipboard"
          style={{
            background: 'none', border: '1px solid #444', cursor: 'pointer',
            padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: 'var(--font-mono)', fontSize: '0.625rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase', color: '#888',
            transition: 'border-color 0.1s, color 0.1s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = '#665DF5'
            ;(e.currentTarget as HTMLElement).style.color = '#665DF5'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = '#444'
            ;(e.currentTarget as HTMLElement).style.color = '#888'
          }}
        >
          <CopyIcon /> Copy
        </button>
      </div>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {lines.map(line => (
          <div key={line} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#665DF5', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', userSelect: 'none' }}>$</span>
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: '#E8E8E8', letterSpacing: '0.01em', wordBreak: 'break-all' }}>{line}</code>
          </div>
        ))}
      </div>
    </div>
  )
}

function CopyIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
      <rect x="4" y="4" width="8" height="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 10V2h8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2v8M5 7l3 3 3-3M2 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  )
}
