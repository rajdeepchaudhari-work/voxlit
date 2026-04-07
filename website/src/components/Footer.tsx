const GITHUB_URL = 'https://github.com/rajdeepchaudhari-work/voxlit'
const EAGER_URL = 'https://eagerhq.com/'
const SUPPORT_EMAIL = 'support@voxlit.co'
const WEBSITE = 'https://voxlit.co'

export default function Footer() {
  return (
    <footer style={{
      borderTop: '3px solid #0A0A0A',
      background: '#FFFFFF',
    }}>
      <div className="page-container">
        <div className="footer-grid">
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
              marginBottom: 10,
              maxWidth: 280,
            }}>
              Your voice. Your machine. Your data.
            </p>

            <a
              href={WEBSITE}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: '#665DF5',
                textDecoration: 'underline',
                textUnderlineOffset: 2,
                letterSpacing: '0.02em',
                display: 'block',
                marginBottom: 16,
              }}
            >
              voxlit.co
            </a>

            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              color: '#666',
              letterSpacing: '0.02em',
              marginBottom: 16,
            }}>
              MIT License · Copyright © 2026 Rajdeep Chaudhari
            </p>

            {/* Parent company */}
            <a
              href={EAGER_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 10px',
                border: '2px solid #0A0A0A',
                background: '#FFFDF7',
                textDecoration: 'none',
                boxShadow: '3px 3px 0px #0A0A0A',
                transition: 'box-shadow 0.1s, transform 0.1s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = '5px 5px 0px #0A0A0A'
                ;(e.currentTarget as HTMLElement).style.transform = 'translate(-2px,-2px)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = '3px 3px 0px #0A0A0A'
                ;(e.currentTarget as HTMLElement).style.transform = 'none'
              }}
            >
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#666',
              }}>A product by</span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#665DF5',
              }}>Eager HQ ↗</span>
            </a>
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

          {/* Column 3 — Project + Support */}
          <div>
            <div className="overline" style={{ marginBottom: 16 }}>Project</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {[
                { label: 'GitHub ↗', href: GITHUB_URL, external: true },
                { label: 'Docs ↗', href: `${GITHUB_URL}/wiki`, external: true },
                { label: 'Report a Bug ↗', href: `${GITHUB_URL}/issues/new`, external: true },
                { label: 'Contribute ↗', href: `${GITHUB_URL}/blob/main/CONTRIBUTING.md`, external: true },
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

            {/* Support */}
            <div className="overline" style={{ marginBottom: 12 }}>Support</div>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                border: '2px solid #0A0A0A',
                background: '#FFFDF7',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.02em',
                color: '#0A0A0A',
                textDecoration: 'none',
                boxShadow: '3px 3px 0px #0A0A0A',
                transition: 'box-shadow 0.1s, transform 0.1s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = '5px 5px 0px #0A0A0A'
                ;(e.currentTarget as HTMLElement).style.transform = 'translate(-2px,-2px)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = '3px 3px 0px #0A0A0A'
                ;(e.currentTarget as HTMLElement).style.transform = 'none'
              }}
            >
              <MailIcon />
              {SUPPORT_EMAIL}
            </a>
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
            }}>
              voxlit.co · Open source, forever.
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              letterSpacing: '0.04em',
              color: '#666',
            }}>
              Built with whisper.cpp + React ·{' '}
              <a
                href={EAGER_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#665DF5', textDecoration: 'underline', textUnderlineOffset: 2 }}
              >
                Eager HQ
              </a>
            </span>
          </div>
        </div>
      </div>


    </footer>
  )
}

function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="3" width="14" height="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1 3l7 6 7-6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
