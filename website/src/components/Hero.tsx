import { useState } from 'react'
import { useTerminalAnim } from '../hooks/useTerminalAnim'

const GITHUB_URL = 'https://github.com/rajdeepchaudhari-work/voxlit'
const VERSION = '2.0.0'
const DOWNLOAD_URL = `https://github.com/rajdeepchaudhari-work/voxlit/releases/download/v${VERSION}/voxlit-${VERSION}-arm64.dmg`

export default function Hero() {
  const { displayText, cursorVisible } = useTerminalAnim()

  return (
    <section style={{
      paddingTop: 120,
      paddingBottom: 80,
      borderBottom: '3px solid #0A0A0A',
      background: '#FFFDF7',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Dot pattern */}
      <div className="bg-dot-grid" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      {/* Large decorative background letter */}
      <div style={{
        position: 'absolute',
        right: -40,
        top: -20,
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 'clamp(280px, 30vw, 480px)',
        lineHeight: 1,
        color: 'transparent',
        WebkitTextStroke: '2px rgba(10,10,10,0.05)',
        userSelect: 'none',
        pointerEvents: 'none',
        letterSpacing: '-0.06em',
      }}>V</div>

      <div className="page-container" style={{ position: 'relative' }}>
        <div className="hero-grid">

          {/* Left — Text with stagger */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>

            {/* Beta announcement */}
            <a
              href="#agent"
              className="hero-stagger beta-pill"
              style={{
                alignSelf: 'flex-start',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 6px 6px 14px',
                marginBottom: 18,
                background: '#FFFFFF',
                border: '2px solid #0A0A0A',
                boxShadow: '3px 3px 0px #665DF5',
                textDecoration: 'none',
                transition: 'transform 0.1s, box-shadow 0.1s',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#0A0A0A',
                letterSpacing: '0.02em',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translate(-1px,-1px)'; e.currentTarget.style.boxShadow = '4px 4px 0px #665DF5' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '3px 3px 0px #665DF5' }}
            >
              <span style={{
                background: '#FFEB3B', border: '2px solid #0A0A0A',
                padding: '2px 6px', fontSize: '0.625rem', fontWeight: 800,
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                New
              </span>
              <span>Voxlit Agent: say "Hey Voxlit" and the AI acts</span>
              <span style={{
                background: '#665DF5', color: '#FFFFFF',
                border: '2px solid #0A0A0A',
                padding: '3px 10px', fontSize: '0.6875rem', fontWeight: 700,
                letterSpacing: '0.04em',
              }}>
                Try it →
              </span>
            </a>

            {/* Overline */}
            <div className="hero-stagger" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              {['Open Source', 'macOS', 'Free Forever'].map((t, i, arr) => (
                <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="overline">{t}</span>
                  {i < arr.length - 1 && (
                    <span style={{ color: '#CCC', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem' }}>·</span>
                  )}
                </span>
              ))}
            </div>

            {/* Headline */}
            <h1 className="hero-stagger" style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 0.95,
              marginBottom: 24,
              fontSize: 'clamp(48px, 7vw, 88px)',
            }}>
              <span style={{ display: 'block', color: '#0A0A0A' }}>Stop paying.</span>
              <span style={{ display: 'block', color: '#665DF5' }}>Start dictating.</span>
            </h1>

            {/* Subhead */}
            <p className="hero-stagger" style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1.0625rem',
              lineHeight: 1.65,
              color: '#333333',
              maxWidth: 500,
              marginBottom: 36,
            }}>
              I got tired of paying <strong style={{ color: '#0A0A0A' }}>$20 a month</strong> to
              talk to my own Mac. So I built Voxlit. One hotkey, speak, and your words
              show up wherever you type. Slack. Cursor. Notion. Terminal. Gmail.
              Cloud-powered by default with <strong style={{ color: '#665DF5' }}>Voxlit Agent</strong> built
              in. Say "Hey Voxlit" and the AI writes, fixes, or translates for you.
              Offline mode always there if you want it.
            </p>

            {/* Homebrew */}
            <div className="hero-stagger">
              <BrewBlock />
            </div>

            {/* Secondary CTAs */}
            <div className="hero-stagger" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20, marginTop: 12 }}>
              <a href={DOWNLOAD_URL} download className="btn-ghost" style={{ fontSize: '0.8125rem', padding: '10px 20px' }}>
                <DownloadIcon />
                Download .dmg
              </a>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: '0.8125rem', padding: '10px 20px' }}>
                <GitHubIcon />
                GitHub
              </a>
            </div>

            {/* Trust Pills */}
            <div className="hero-stagger" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {['MIT License', 'Zero Account', 'Cloud + Offline', 'Apple Silicon'].map(pill => (
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

            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['v2.0.0', 'arm64', '.dmg', '~135 MB'].map(t => (
                <span key={t} className="trust-pill">{t}</span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

type InstallTab = 'curl' | 'brew'

// Hoisted OUT of BrewBlock — if this were declared inside, React would treat it
// as a brand-new component type on every parent render and unmount/remount the
// buttons. That teardown is what was making the toggle feel laggy.
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
        transition: 'none',  // instant swap — no transition jitter during the switch
      }}
    >
      {label}
    </button>
  )
}

function BrewBlock() {
  const [tab, setTab] = useState<InstallTab>('curl')

  const curlLine = 'curl -fsSL https://voxlit.co/install.sh | bash'
  const brewLines = [
    'brew tap rajdeepchaudhari-work/voxlit',
    'brew install --cask voxlit',
  ]
  const lines = tab === 'curl' ? [curlLine] : brewLines

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
          <TabButton active={tab === 'curl'} label="curl" onClick={() => setTab('curl')} />
          <TabButton active={tab === 'brew'} label="brew" onClick={() => setTab('brew')} />
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

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}
