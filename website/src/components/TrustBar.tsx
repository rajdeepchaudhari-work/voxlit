import { useDownloadCount } from '../hooks/useDownloadCount'

const items = [
  { icon: <LockIcon />, label: 'MIT License' },
  { icon: <UserOffIcon />, label: 'Zero Account' },
  { icon: <CloudCheckIcon />, label: 'Cloud + Offline' },
]

function formatCount(n: number): string {
  if (n >= 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return n.toLocaleString('en-US')
}

export default function TrustBar() {
  const downloads = useDownloadCount()

  return (
    <section aria-label="Voxlit trust indicators and download count" style={{
      borderBottom: '3px solid #0A0A0A',
      background: '#FFFFFF',
    }}>
      <h2 style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
        Voxlit at a glance
      </h2>
      <div className="page-container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {items.map((item, i) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '20px 16px',
                borderLeft: i > 0 ? '2px solid #0A0A0A' : 'none',
              }}
            >
              <div style={{ color: '#665DF5' }}>{item.icon}</div>
              <span className="overline" style={{ textAlign: 'center' }}>{item.label}</span>
            </div>
          ))}

          {/* Live download counter */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '20px 16px',
            borderLeft: '2px solid #0A0A0A',
            background: '#FFEB3B',
          }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '1.5rem',
              letterSpacing: '-0.02em',
              color: '#0A0A0A',
              lineHeight: 1,
            }}>
              {downloads !== null ? formatCount(downloads) : '—'}
            </span>
            <span className="overline" style={{ textAlign: 'center' }}>
              Downloads
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .trust-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </section>
  )
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="9" width="14" height="9" stroke="currentColor" strokeWidth="2" />
      <path d="M6 9V6a4 4 0 018 0v3" stroke="currentColor" strokeWidth="2" />
      <circle cx="10" cy="13" r="1.5" fill="currentColor" />
    </svg>
  )
}

function UserOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M4 17c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="2" />
      <line x1="2" y1="2" x2="18" y2="18" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function CloudCheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M6 15h8a3.5 3.5 0 0 0 .6-6.95A5 5 0 0 0 5.2 7.5 3.5 3.5 0 0 0 6 15z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M7.5 11l2 2 3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

