import { useState } from 'react'

const VERSION = '1.0.7'
const REPO = 'rajdeepchaudhari-work/voxlit'
const RELEASES_URL = `https://github.com/${REPO}/releases/latest`
const GITHUB_URL = `https://github.com/${REPO}`
const SUPPORT_EMAIL = 'support@voxlit.co'

// Direct DMG download — skips the releases page entirely. When we bump VERSION
// this URL updates automatically across every call site on the website.
const DMG_URL = `https://github.com/${REPO}/releases/download/v${VERSION}/voxlit-${VERSION}-arm64.dmg`

const CURL_LINE = 'curl -fsSL https://voxlit.co/install.sh | bash'
const BREW_LINES = [
  'brew tap rajdeepchaudhari-work/voxlit',
  'brew install --cask voxlit',
]

type Tab = 'curl' | 'brew'

// Hoisted — see Hero.tsx's TabButton for why.
function TabButton({ active, label, accent, onClick }: {
  active: boolean; label: string; accent: string; onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? accent : 'transparent',
        border: `1.5px solid ${active ? accent : '#444'}`,
        cursor: 'pointer',
        padding: '5px 14px',
        fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', fontWeight: 700,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        color: active ? '#0A0A0A' : '#888',
      }}
    >
      {label}
    </button>
  )
}

export default function DownloadCTA() {
  const [tab, setTab] = useState<Tab>('curl')

  const lines = tab === 'curl' ? [CURL_LINE] : BREW_LINES
  const handleCopy = () => navigator.clipboard.writeText(lines.join('\n'))

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
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>

          <div className="overline" style={{ marginBottom: 16, color: '#666' }}>
            Free Download · v{VERSION}
          </div>

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
            marginBottom: 36,
          }}>
            macOS 13 Ventura or later · Apple Silicon · ~135 MB
          </p>

          {/* ── PRIMARY: Big DMG download button ── */}
          <div style={{ marginBottom: 16 }}>
            <a
              href={DMG_URL}
              download
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '16px 28px',
                background: '#0A0A0A',
                color: '#FFFFFF',
                border: '3px solid #0A0A0A',
                boxShadow: '6px 6px 0px #665DF5',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.9375rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                transition: 'transform 0.1s, box-shadow 0.1s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translate(-2px, -2px)'
                e.currentTarget.style.boxShadow = '8px 8px 0px #665DF5'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = '6px 6px 0px #665DF5'
              }}
            >
              <DownloadIcon />
              Download for macOS · v{VERSION}
            </a>
          </div>

          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6875rem',
            color: '#555',
            letterSpacing: '0.04em',
            marginBottom: 36,
          }}>
            Or grab the full <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer"
              style={{ color: '#0A0A0A', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 2 }}>
              release page
            </a>{' '}with checksums, signatures, and SBOM
          </p>

          {/* ── SECONDARY: one-liner installs (curl / brew tabs) ── */}
          <div style={{
            border: '3px solid #0A0A0A',
            background: '#1A1A1A',
            boxShadow: '6px 6px 0px #0A0A0A',
            marginBottom: 36,
            textAlign: 'left',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderBottom: '2px solid #333',
              background: '#2A2A2A',
              gap: 10,
            }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <TabButton active={tab === 'curl'} label="curl" accent="#FFEB3B" onClick={() => setTab('curl')} />
                <TabButton active={tab === 'brew'} label="brew" accent="#FFEB3B" onClick={() => setTab('brew')} />
              </div>
              <button
                onClick={handleCopy}
                title="Copy to clipboard"
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

            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lines.map(line => (
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
                    wordBreak: 'break-all',
                  }}>{line}</code>
                </div>
              ))}
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
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
      <path d="M9 2v9M6 8l3 3 3-3M2 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  )
}
