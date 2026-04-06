const DOWNLOAD_URL = 'https://github.com/rajdeepchaudhari-work/voxlit/releases/latest'
const GITHUB_URL = 'https://github.com/rajdeepchaudhari-work/voxlit'

export default function DownloadCTA() {
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
      {/* Dot grid on yellow */}
      <div className="bg-dot-grid" style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }} />

      <div className="page-container" style={{ position: 'relative' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
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

          {/* Subhead */}
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            lineHeight: 1.65,
            color: '#333',
            marginBottom: 40,
          }}>
            macOS 13 Ventura or later. Apple Silicon and Intel.
            ~180 MB including the base model.
          </p>

          {/* CTA */}
          <div style={{ marginBottom: 24 }}>
            <a
              href={DOWNLOAD_URL}
              className="btn-primary"
              style={{
                fontSize: '1rem',
                padding: '18px 48px',
                width: '100%',
                maxWidth: 400,
                display: 'inline-flex',
              }}
            >
              <DownloadIcon />
              Download Voxlit — Free
            </a>
          </div>

          {/* Secondary links */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 24,
            marginBottom: 32,
            flexWrap: 'wrap',
          }}>
            {[
              { label: 'View on GitHub ↗', href: GITHUB_URL },
              { label: 'Read the Docs ↗', href: `${GITHUB_URL}/wiki` },
            ].map(link => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  letterSpacing: '0.04em',
                  color: '#0A0A0A',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Version pills */}
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {['v0.1.0', 'arm64 + x64', '.dmg', '~178 MB'].map(tag => (
              <span key={tag} className="trust-pill" style={{ background: 'rgba(255,255,255,0.6)' }}>{tag}</span>
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

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
      <path d="M9 2v9M6 8l3 3 3-3M2 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  )
}
