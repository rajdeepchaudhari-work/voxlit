const items = [
  { icon: <LockIcon />, label: 'MIT License' },
  { icon: <UserOffIcon />, label: 'Zero Account' },
  { icon: <WifiOffIcon />, label: '100% Offline' },
  { icon: <ChipIcon />, label: 'Apple Silicon Native' },
]

export default function TrustBar() {
  return (
    <div style={{
      borderBottom: '3px solid #0A0A0A',
      background: '#FFFFFF',
    }}>
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
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .trust-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
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

function WifiOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 15a1 1 0 110 2 1 1 0 010-2z" fill="currentColor" />
      <path d="M7 12.5A4.5 4.5 0 0110 11.5m3 1a4.5 4.5 0 00-3-1" stroke="currentColor" strokeWidth="2" />
      <path d="M4.5 9.5A7.5 7.5 0 0110 8m5.5 1.5A7.5 7.5 0 0010 8" stroke="currentColor" strokeWidth="2" />
      <line x1="2" y1="2" x2="18" y2="18" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function ChipIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="5" y="5" width="10" height="10" stroke="currentColor" strokeWidth="2" />
      <line x1="8" y1="5" x2="8" y2="2" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="5" x2="12" y2="2" stroke="currentColor" strokeWidth="2" />
      <line x1="8" y1="18" x2="8" y2="15" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="18" x2="12" y2="15" stroke="currentColor" strokeWidth="2" />
      <line x1="5" y1="8" x2="2" y2="8" stroke="currentColor" strokeWidth="2" />
      <line x1="5" y1="12" x2="2" y2="12" stroke="currentColor" strokeWidth="2" />
      <line x1="18" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="2" />
      <line x1="18" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="2" />
      <rect x="7.5" y="7.5" width="5" height="5" fill="currentColor" opacity="0.4" />
    </svg>
  )
}
