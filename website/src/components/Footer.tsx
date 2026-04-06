const GITHUB_URL = 'https://github.com/rajdeepchaudhari-work/voxlit'

export default function Footer() {
  return (
    <footer style={{
      borderTop: '3px solid #0A0A0A',
      background: '#FFFFFF',
    }}>
      <div className="page-container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr',
          gap: 48,
          padding: '52px 0 44px',
        }}>
          {/* Column 1 — Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <img
                src="/logo.png"
                alt="Voxlit"
                width={32}
                height={32}
                style={{ borderRadius: 7, display: 'block', border: '2px solid #0A0A0A' }}
              />
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: '1rem',
                letterSpacing: '0.04em',
                color: '#0A0A0A',
                textTransform: 'uppercase',
              }}>VOXLIT</span>
            </div>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.9375rem',
              color: '#333',
              lineHeight: 1.6,
              marginBottom: 14,
              maxWidth: 280,
            }}>
              Your voice. Your machine. Your data.
            </p>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              color: '#666',
              letterSpacing: '0.02em',
            }}>
              MIT License · Copyright © 2026 Rajdeep Chaudhari
            </p>
          </div>

          {/* Column 2 — Navigation */}
          <div>
            <div className="overline" style={{ marginBottom: 16 }}>Navigate</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Features', href: '#features' },
                { label: 'How It Works', href: '#how-it-works' },
                { label: 'Compare', href: '#compare' },
                { label: 'Download', href: '#download' },
              ].map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9375rem',
                    color: '#333',
                    textDecoration: 'none',
                    transition: 'color 0.1s',
                  }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = '#665DF5'}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = '#333'}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Column 3 — Project */}
          <div>
            <div className="overline" style={{ marginBottom: 16 }}>Project</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'GitHub ↗', href: GITHUB_URL },
                { label: 'Docs ↗', href: `${GITHUB_URL}/wiki` },
                { label: 'Report a Bug ↗', href: `${GITHUB_URL}/issues/new` },
                { label: 'Contribute ↗', href: `${GITHUB_URL}/blob/main/CONTRIBUTING.md` },
              ].map(link => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9375rem',
                    color: '#333',
                    textDecoration: 'none',
                    transition: 'color 0.1s',
                  }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = '#665DF5'}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = '#333'}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '2px solid #0A0A0A' }}>
        <div className="page-container">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 0',
            flexWrap: 'wrap',
            gap: 8,
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#666',
            }}>Open source, forever.</span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              letterSpacing: '0.04em',
              color: '#666',
            }}>Built with whisper.cpp + React</span>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          footer .footer-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
      `}</style>
    </footer>
  )
}

