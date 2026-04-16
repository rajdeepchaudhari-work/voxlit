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

          {/* Right — App window + floating pill mockup */}
          <div className="hero-stagger" style={{ alignSelf: 'center', display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>

            {/* ── App Window Mockup ── */}
            <div style={{
              border: '3px solid #0A0A0A',
              boxShadow: '8px 8px 0px #0A0A0A',
              background: '#FFFDF7',
              display: 'flex',
              overflow: 'hidden',
              minHeight: 280,
            }}>

              {/* Sidebar */}
              <div style={{
                width: 140,
                background: '#FFFFFF',
                borderRight: '3px solid #0A0A0A',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
              }}>
                {/* Sidebar logo row */}
                <div style={{
                  padding: '10px 10px',
                  borderBottom: '3px solid #0A0A0A',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                }}>
                  <div style={{
                    display: 'flex', gap: 4, marginRight: 4,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5F57' }} />
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFBD2E' }} />
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28C840' }} />
                  </div>
                  <img src="/logo.png" alt="" width={18} height={18}
                    style={{ borderRadius: 4, display: 'block' }} />
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', fontWeight: 700,
                    letterSpacing: '0.06em', color: '#0A0A0A', textTransform: 'uppercase',
                  }}>VOXLIT</span>
                </div>

                {/* Nav items */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {[
                    { label: 'Home', active: true },
                    { label: 'History', active: false },
                    { label: 'Settings', active: false },
                    { label: 'About', active: false },
                  ].map(item => (
                    <div key={item.label} style={{
                      padding: '7px 10px',
                      borderBottom: '2px solid #0A0A0A',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.5625rem',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: item.active ? '#FFFFFF' : '#0A0A0A',
                      background: item.active ? '#665DF5' : 'transparent',
                    }}>
                      {item.label}
                    </div>
                  ))}
                </div>

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Helper status */}
                <div style={{
                  padding: '7px 10px',
                  borderTop: '2px solid #0A0A0A',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#665DF5', border: '1.5px solid #665DF5',
                  }} />
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', fontWeight: 700,
                    letterSpacing: '0.1em', textTransform: 'uppercase', color: '#665DF5',
                  }}>VOXLIT CLOUD</span>
                </div>
              </div>

              {/* Main content area */}
              <div style={{ flex: 1, padding: '14px 16px', overflow: 'hidden' }}>
                {/* Dashboard header */}
                <div style={{
                  borderBottom: '3px solid #0A0A0A',
                  paddingBottom: 8,
                  marginBottom: 14,
                }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700,
                    letterSpacing: '-0.02em', color: '#0A0A0A', textTransform: 'uppercase',
                  }}>Dashboard</div>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', fontWeight: 700,
                    letterSpacing: '0.04em', color: '#666', textTransform: 'uppercase', marginTop: 2,
                  }}>PRESS HOTKEY TO START DICTATING</div>
                </div>

                {/* Stat cards */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {[
                    { label: 'TIME SAVED', value: '14m', sub: 'TOTAL RECORDED', bg: '#FFEB3B' },
                    { label: 'SPEED', value: '142', sub: 'WORDS / MIN', bg: '#FFFFFF' },
                    { label: 'STREAK', value: '3', sub: 'DAYS', bg: 'rgba(102,93,245,0.12)' },
                  ].map(card => (
                    <div key={card.label} style={{
                      flex: 1,
                      padding: '8px 10px',
                      border: '2px solid #0A0A0A',
                      boxShadow: '2px 2px 0px #0A0A0A',
                      background: card.bg,
                    }}>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.375rem', fontWeight: 700,
                        letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666',
                      }}>{card.label}</div>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: '1.125rem', fontWeight: 700,
                        letterSpacing: '-0.03em', color: '#0A0A0A', lineHeight: 1.2,
                      }}>{card.value}</div>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.375rem',
                        color: '#666', marginTop: 1,
                      }}>{card.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Recent transcriptions */}
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.375rem', fontWeight: 700,
                  letterSpacing: '0.12em', textTransform: 'uppercase', color: '#666',
                  marginBottom: 6,
                }}>RECENT TRANSCRIPTIONS</div>
                <div style={{
                  border: '2px solid #0A0A0A',
                  boxShadow: '2px 2px 0px #0A0A0A',
                  background: '#FFFFFF',
                }}>
                  {[
                    { date: 'Today, 2:14 PM', info: '5 entries · 234 words', engine: 'Cloud', engineBg: '#FFEB3B', engineColor: '#0A0A0A' },
                    { date: 'Today, 11:30 AM', info: '3 entries · 89 words', engine: 'Local', engineBg: 'rgba(102,93,245,0.1)', engineColor: '#665DF5' },
                    { date: 'Yesterday', info: '12 entries · 1,204 words', engine: 'Cloud', engineBg: '#FFEB3B', engineColor: '#0A0A0A' },
                  ].map((row, i, arr) => (
                    <div key={row.date} style={{
                      padding: '6px 10px',
                      borderBottom: i < arr.length - 1 ? '2px solid #0A0A0A' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <div>
                        <div style={{
                          fontFamily: 'var(--font-mono)', fontSize: '0.5rem', fontWeight: 700,
                          color: '#0A0A0A',
                        }}>{row.date}</div>
                        <div style={{
                          fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', color: '#666',
                        }}>{row.info}</div>
                      </div>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.375rem', fontWeight: 700,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        padding: '1px 5px',
                        border: `1.5px solid ${row.engineColor}`,
                        background: row.engineBg,
                        color: row.engineColor,
                      }}>{row.engine}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Floating Status Pill (overlaps bottom of app window) ── */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: 8,
              position: 'relative',
              zIndex: 2,
            }}>
              <div style={{
                background: '#FFFFFF',
                border: '3px solid #0A0A0A',
                boxShadow: '4px 4px 0px #0A0A0A',
                height: 44,
                padding: '0 12px 0 5px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <img src="/logo.png" alt="" width={30} height={30}
                  style={{ borderRadius: 6, display: 'block', border: '2.5px solid #FFEB3B' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 2.5, height: 24 }}>
                  {[7, 12, 19, 24, 16, 21, 10, 18, 22, 9, 14, 19].map((h, i) => (
                    <div key={i} className="waveform-bar" style={{
                      width: 2.5, height: h, borderRadius: 9999,
                      background: '#FFEB3B',
                    }} />
                  ))}
                </div>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.5rem', fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase', color: '#0A0A0A',
                }}>LISTENING</span>
              </div>
            </div>

            {/* Transcript flash */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{
                background: 'rgba(10,10,15,0.97)',
                border: '1px solid rgba(31,41,64,0.9)',
                borderRadius: 8,
                padding: '6px 12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                maxWidth: 320,
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.6875rem',
                  color: '#F0EEFF', lineHeight: 1.5,
                }}>
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

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['v2.1.0', 'arm64', '.dmg', '~135 MB'].map(t => (
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
