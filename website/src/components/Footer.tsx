const GITHUB_URL = 'https://github.com/rajdeepchaudhari-work/voxlit'
const EMAIL = 'rajdeepchaudhari.ind@gmail.com'

export default function Footer() {
  return (
    <footer style={{
      background: '#0A0A0A',
      color: '#FFFFFF',
      padding: '48px 0 0',
    }}>
      <div className="page-container">
        <div className="footer-grid">
          {/* Left */}
          <div>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1rem',
              color: '#FFFFFF',
              marginBottom: 8,
            }}>
              Voxlit v2.0.0 — MIT License
            </p>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.875rem',
              color: '#999',
              lineHeight: 1.6,
            }}>
              Built by Rajdeep Chaudhari
            </p>
          </div>

          {/* Right — Links */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'flex-end', alignItems: 'flex-start' }}>
            {[
              { label: 'GitHub', href: GITHUB_URL },
              { label: 'Report Bug', href: `${GITHUB_URL}/issues/new` },
              { label: 'Discussions', href: `${GITHUB_URL}/discussions` },
              { label: EMAIL, href: `mailto:${EMAIL}` },
            ].map(link => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith('mailto') ? undefined : '_blank'}
                rel={link.href.startsWith('mailto') ? undefined : 'noopener noreferrer'}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: '#999',
                  textDecoration: 'none',
                  letterSpacing: '0.02em',
                  transition: 'color 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#FFFFFF'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#999'}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Bottom line */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.1)',
          marginTop: 32,
          padding: '20px 0',
        }}>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.6875rem',
            color: '#666',
            letterSpacing: '0.04em',
          }}>
            Powered by whisper.cpp · Built with Electron + React
          </p>
        </div>
      </div>
    </footer>
  )
}
