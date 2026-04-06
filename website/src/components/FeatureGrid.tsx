interface Feature {
  icon: React.ReactNode
  heading: string
  body: string
  bg?: string
}

const features: Feature[] = [
  {
    icon: <ShieldIcon />,
    heading: 'Privacy by Architecture',
    body: 'Audio never touches a network socket. Architectural privacy — not a policy. There is no server to breach, no logs to subpoena, no account to compromise.',
    bg: '#FFEB3B',
  },
  {
    icon: <BoltIcon />,
    heading: 'Real-time Performance',
    body: 'Continuous transcription with no upload delay. Words appear as you speak. Optimized for M-series Neural Engine and Metal GPU.',
    bg: '#FFFFFF',
  },
  {
    icon: <CodeIcon />,
    heading: 'Open Source',
    body: 'Every line MIT licensed. Read it, fork it, audit it. No proprietary SDK. No hidden endpoints. No trust-us-bro privacy policy.',
    bg: '#FFFFFF',
  },
  {
    icon: <AppsIcon />,
    heading: 'Works Everywhere',
    body: 'Any app that accepts keyboard input: Notion, Slack, VS Code, Mail, Terminal. One hotkey. Universal text injection via Accessibility API.',
    bg: 'rgba(102,93,245,0.1)',
  },
  {
    icon: <GlobeIcon />,
    heading: '40+ Languages',
    body: 'The base model covers 40+ languages out of the box. Download the large model for 100+. All offline, all free, no API key needed.',
    bg: '#FFFFFF',
  },
  {
    icon: <CubeIcon />,
    heading: 'Your Models',
    body: 'Run the bundled base model or swap in any compatible whisper.cpp model. Optionally connect your own OpenAI key for cloud accuracy.',
    bg: '#FFFFFF',
  },
]

export default function FeatureGrid() {
  return (
    <section
      id="features"
      style={{
        padding: '96px 0',
        borderBottom: '3px solid #0A0A0A',
        background: '#F5F0E8',
      }}
    >
      <div className="page-container">
        <div style={{ marginBottom: 56 }}>
          <div className="overline" style={{ marginBottom: 12 }}>Features</div>
          <h2 className="section-heading">Built different.</h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          border: '3px solid #0A0A0A',
          boxShadow: '6px 6px 0px #0A0A0A',
          background: '#FFFFFF',
        }}>
          {features.map((feature, i) => {
            const isBottom = i >= 3
            const isRightEdge = (i + 1) % 3 === 0
            return (
              <div
                key={feature.heading}
                style={{
                  padding: 32,
                  borderTop: isBottom ? '3px solid #0A0A0A' : 'none',
                  borderRight: !isRightEdge ? '3px solid #0A0A0A' : 'none',
                  background: feature.bg ?? '#FFFFFF',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => {
                  if (!feature.bg || feature.bg === '#FFFFFF') {
                    (e.currentTarget as HTMLElement).style.background = '#F5F0E8'
                  }
                }}
                onMouseLeave={e => {
                  if (!feature.bg || feature.bg === '#FFFFFF') {
                    (e.currentTarget as HTMLElement).style.background = feature.bg ?? '#FFFFFF'
                  }
                }}
              >
                {/* Icon box */}
                <div style={{
                  width: 44, height: 44,
                  border: '3px solid #0A0A0A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#665DF5',
                  marginBottom: 18,
                  background: '#FFFFFF',
                  boxShadow: '3px 3px 0px #0A0A0A',
                }}>
                  {feature.icon}
                </div>

                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '1.0625rem',
                  letterSpacing: '-0.02em',
                  color: '#0A0A0A',
                  marginBottom: 10,
                }}>
                  {feature.heading}
                </h3>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem',
                  lineHeight: 1.65,
                  color: '#333333',
                }}>
                  {feature.body}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 2L3 6v5c0 4.5 3.4 8.7 8 9.9 4.6-1.2 8-5.4 8-9.9V6L11 2z" stroke="currentColor" strokeWidth="2" />
      <path d="M7 11l3 3 5-5" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function BoltIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M13 2L4 13h7l-2 7 9-11h-7l2-7z" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function CodeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M7 7L2 11l5 4" stroke="currentColor" strokeWidth="2" />
      <path d="M15 7l5 4-5 4" stroke="currentColor" strokeWidth="2" />
      <line x1="13" y1="4" x2="9" y2="18" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function AppsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="2" width="8" height="8" stroke="currentColor" strokeWidth="2" />
      <rect x="12" y="2" width="8" height="8" stroke="currentColor" strokeWidth="2" />
      <rect x="2" y="12" width="8" height="8" stroke="currentColor" strokeWidth="2" />
      <rect x="12" y="12" width="8" height="8" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="2" />
      <ellipse cx="11" cy="11" rx="4" ry="9" stroke="currentColor" strokeWidth="2" />
      <line x1="2" y1="11" x2="20" y2="11" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function CubeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 2L2 7v8l9 5 9-5V7L11 2z" stroke="currentColor" strokeWidth="2" />
      <line x1="11" y1="2" x2="11" y2="20" stroke="currentColor" strokeWidth="2" />
      <line x1="2" y1="7" x2="11" y2="12" stroke="currentColor" strokeWidth="2" />
      <line x1="20" y1="7" x2="11" y2="12" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}
