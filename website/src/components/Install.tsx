import { useState } from 'react'

const VERSION = '2.0.0'
const REPO = 'rajdeepchaudhari-work/voxlit'
const DMG_URL = `https://github.com/${REPO}/releases/download/v${VERSION}/voxlit-${VERSION}-arm64.dmg`
const SHA256 = '1308ed23f749d3c65d5737a964ad5fb4243dd464e99f279b5fe209841807cfd6'

const CURL_LINE = 'curl -fsSL https://voxlit.co/install.sh | bash'
const BREW_LINE = 'brew install --cask voxlit'

type Tab = 'brew' | 'curl'

function TabButton({ active, label, onClick }: {
  active: boolean; label: string; onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: active ? '#FFEB3B' : 'transparent',
        border: `1.5px solid ${active ? '#0A0A0A' : '#444'}`,
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

export default function Install() {
  const [tab, setTab] = useState<Tab>('brew')

  const lines = tab === 'curl' ? [CURL_LINE] : [BREW_LINE]
  const handleCopy = () => navigator.clipboard.writeText(lines.join('\n'))

  return (
    <section
      id="download"
      style={{
        padding: '100px 0',
        borderBottom: '3px solid #0A0A0A',
        background: '#FFEB3B',
        position: 'relative',
      }}
    >
      <div className="page-container" style={{ position: 'relative' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>

          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 'clamp(2.25rem, 6vw, 4rem)',
            letterSpacing: '-0.04em',
            lineHeight: 1,
            marginBottom: 32,
            color: '#0A0A0A',
          }}>
            Get Voxlit
          </h2>

          {/* Primary download button */}
          <div style={{ marginBottom: 28 }}>
            <a
              href={DMG_URL}
              download
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '16px 32px',
                background: '#0A0A0A',
                color: '#FFFFFF',
                border: '3px solid #0A0A0A',
                boxShadow: '4px 4px 0px rgba(0,0,0,0.3)',
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
                e.currentTarget.style.boxShadow = '6px 6px 0px rgba(0,0,0,0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = '4px 4px 0px rgba(0,0,0,0.3)'
              }}
            >
              <DownloadIcon />
              Download DMG — v{VERSION}, 129 MB
            </a>
          </div>

          {/* Install commands */}
          <div style={{
            border: '3px solid #0A0A0A',
            background: '#1A1A1A',
            boxShadow: '4px 4px 0px #0A0A0A',
            marginBottom: 24,
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
                <TabButton active={tab === 'brew'} label="brew" onClick={() => setTab('brew')} />
                <TabButton active={tab === 'curl'} label="curl" onClick={() => setTab('curl')} />
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

          {/* SHA */}
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.625rem',
            color: '#555',
            letterSpacing: '0.02em',
            marginBottom: 16,
            wordBreak: 'break-all',
          }}>
            SHA256: {SHA256}
          </p>

          {/* Requirements */}
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6875rem',
            color: '#555',
            letterSpacing: '0.04em',
            lineHeight: 1.7,
          }}>
            Requires macOS 13+. Apple Silicon (arm64). Adhoc-signed — right-click → Open on first launch.
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
