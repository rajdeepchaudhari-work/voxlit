const GITHUB_URL = 'https://github.com/rajdeepchaudhari-work/voxlit'

export default function Nav() {
  return (
    <nav style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 100,
      borderBottom: '2px solid #0A0A0A',
      background: '#FFFFFF',
    }}>
      <div className="page-container nav-inner">
        {/* Logo */}
        <a href="/" style={{ textDecoration: 'none' }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '1.25rem',
            letterSpacing: '-0.02em',
            color: '#0A0A0A',
          }}>Voxlit</span>
        </a>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              color: '#0A0A0A',
              padding: '8px 12px',
            }}
          >
            GitHub
          </a>
          <a
            href="#download"
            className="btn-yellow"
            style={{
              padding: '8px 18px',
              fontSize: '0.75rem',
              boxShadow: '3px 3px 0px #0A0A0A',
            }}
          >
            Download
          </a>
        </div>
      </div>
    </nav>
  )
}
