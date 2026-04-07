const DOWNLOAD_URL = 'https://github.com/rajdeepchaudhari-work/voxlit/releases/latest'
const GITHUB_URL = 'https://github.com/rajdeepchaudhari-work/voxlit'
const SUPPORT_EMAIL = 'support@voxlit.co'

const BREW_LINES = [
  'brew tap rajdeepchaudhari-work/voxlit',
  'brew install --cask voxlit',
]

export default function DownloadCTA() {
  const handleCopy = () => {
    navigator.clipboard.writeText(BREW_LINES.join('\n'))
  }

  return (
    <section
      id="download"
      style={{
        padding: '104px 0',
        borderBottom: '3px solid #0A0A0A',
        background: '#FFEB3B',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="bg-dot-grid" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />

      <div className="page-container" style={{ position: 'relative' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>

          {/* Overline */}
          <div className="overline" style={{ marginBottom: 16, color: '#666' }}>
            Free Download · v0.1.0
          </div>

          {/* Headline */}
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            letterSpacing: '-0.04em',
            lineHeight: 1,
            marginBottom: 20,
            color: '#0A0A0A',
          }}>
            Your voice.<br />Your machine.
          </h2>

          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            lineHeight: 1.65,
            color: '#333',
            marginBottom: 40,
          }}>
            macOS 13 Ventura or later. Apple Silicon and Intel. ~180 MB.
          </p>

          {/* ── PRIMARY: Homebrew ── */}
          <div style={{
            border: '3px solid #0A0A0A',
            background: '#1A1A1A',
            boxShadow: '6px 6px 0px #0A0A0A',
            marginBottom: 12,
            textAlign: 'left',
          }}>
            {/* Titlebar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              borderBottom: '2px solid #333',
              background: '#2A2A2A',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#FFEB3B',
                }}>Recommended</span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.6875rem',
                  color: '#666',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}>Install via Homebrew</span>
              </div>
              <button
                onClick={handleCopy}
                title="Copy commands"
                style={{
                  background: 'none',
                  border: '1px solid #444',
                  cursor: 'pointer',
                  padding: '4px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#888',
                  transition: 'border-color 0.1s, color 0.1s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#FFEB3B'
                  ;(e.currentTarget as HTMLElement).style.color = '#FFEB3B'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#444'
                  ;(e.currentTarget as HTMLElement).style.color = '#888'
                }}
              >
                <CopyIcon /> Copy
              </button>
            </div>

            {/* Commands */}
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {BREW_LINES.map(line => (
                <div key={line} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    color: '#FFEB3B',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.9375rem',
                    userSelect: 'none',
                    flexShrink: 0,
                  }}>$</span>
                  <code style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.9375rem',
                    color: '#EEEEEE',
                    letterSpacing: '0.01em',
                  }}>{line}</code>
                </div>
              ))}
            </div>
          </div>

          {/* Homebrew link */}
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6875rem',
            color: '#555',
            letterSpacing: '0.04em',
            marginBottom: 36,
          }}>
            Requires{' '}
            <a
              href="https://brew.sh"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0A0A0A', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 2 }}
            >
              Homebrew
            </a>
            {' '}· Auto-updates with <code style={{ fontFamily: 'var(--font-mono)' }}>brew upgrade</code>
          </p>

          {/* ── SECONDARY: Manual .dmg ── */}
          <div style={{
            border: '3px solid #0A0A0A',
            background: '#FFFDF7',
            boxShadow: '4px 4px 0px #0A0A0A',
            padding: '20px 24px',
            marginBottom: 32,
            textAlign: 'left',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#666',
                  marginBottom: 4,
                }}>Prefer manual install?</div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8125rem',
                  color: '#333',
                }}>Download the .dmg · arm64 + x64 · ~178 MB</div>
              </div>
              <a href={DOWNLOAD_URL} className="btn-ghost" style={{ padding: '10px 20px', fontSize: '0.8125rem', flexShrink: 0 }}>
                <DownloadIcon /> Download .dmg
              </a>
            </div>
          </div>

          {/* Links row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 28 }}>
            {[
              { label: 'GitHub ↗', href: GITHUB_URL },
              { label: 'Docs ↗', href: `${GITHUB_URL}/wiki` },
              { label: `support@voxlit.co`, href: `mailto:${SUPPORT_EMAIL}` },
            ].map(link => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith('mailto') ? undefined : '_blank'}
                rel={link.href.startsWith('mailto') ? undefined : 'noopener noreferrer'}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  letterSpacing: '0.02em',
                  color: '#0A0A0A',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Fine print */}
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6875rem',
            letterSpacing: '0.04em',
            color: '#666',
          }}>
            MIT License · Copyright © 2026 Rajdeep Chaudhari · No account required
          </p>
        </div>
      </div>
    </section>
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
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
      <path d="M9 2v9M6 8l3 3 3-3M2 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  )
}
