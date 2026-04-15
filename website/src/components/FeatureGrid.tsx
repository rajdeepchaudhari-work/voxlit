import { useInView } from '../hooks/useInView'

interface Feature {
  icon: React.ReactNode
  heading: string
  body: string
  bg?: string
  badge?: string
}

const features: Feature[] = [
  {
    icon: <CloudIcon />,
    heading: 'Cloud mode, if you want it',
    body: 'My MacBook Air could not handle the large models, so I built a Cloud lane for people with older Macs.\n\nNo API key. No credit card. Free during beta — and if you outgrow it, swap in your own OpenAI key and skip me entirely.',
    bg: 'rgba(102,93,245,0.1)',
    badge: 'BETA · FREE',
  },
  {
    icon: <ShieldIcon />,
    heading: 'I never want your audio',
    body: 'Local mode does not open a network socket. Not for telemetry, not for analytics, not for "product improvement". I built it this way so trust is not a promise — it is something you can verify with Little Snitch in thirty seconds.',
    bg: '#FFEB3B',
  },
  {
    icon: <BoltIcon />,
    heading: 'Fast enough to forget you are dictating',
    body: 'Words appear as you speak. I spent two weeks tuning the VAD buffers so Voxlit does not cut you off at the end of a sentence. Apple Silicon Metal GPU. No upload delay, because there is no upload.',
    bg: '#FFFFFF',
  },
  {
    icon: <CodeIcon />,
    heading: 'Read every line yourself',
    body: 'Every line — app, Swift helper, Cloud server — is MIT licensed on GitHub. Nothing proprietary, no vendored SDKs, no hidden endpoints. You can fork it today and still be using your fork in five years.',
    bg: '#FFFFFF',
  },
  {
    icon: <AppsIcon />,
    heading: 'Works in every app I use',
    body: 'Slack, Notion, Cursor, VS Code, Mail, Terminal, iTerm, Ghostty, iMessage, Gmail. If your Mac will let you type in it, Voxlit will dictate into it. One hotkey, universal injection via the Accessibility API.',
    bg: '#FFFFFF',
  },
  {
    icon: <GlobeIcon />,
    heading: 'Not just English',
    body: 'The bundled model covers 40+ languages. Download the large whisper model from Settings and you are at 100+. Offline. Free. My aunt in Delhi uses it for Hindi — that was the moment I knew this had to ship.',
    bg: '#FFFFFF',
  },
]

export default function FeatureGrid() {
  const { ref, inView } = useInView()

  return (
    <section
      id="features"
      ref={ref as React.RefObject<HTMLElement>}
      style={{
        padding: '96px 0',
        borderBottom: '3px solid #0A0A0A',
        background: '#F5F0E8',
      }}
    >
      <div className="page-container">
        <div className={`reveal${inView ? ' in-view' : ''}`} style={{ marginBottom: 56, maxWidth: 680 }}>
          <div className="overline" style={{ marginBottom: 12 }}>What I built, and why</div>
          <h2 className="section-heading">Six things I refused<br />to compromise on.</h2>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            color: '#333',
            marginTop: 16,
            lineHeight: 1.65,
          }}>
            Every dictation app I tried asked me to give something up — my privacy,
            my wallet, my ability to use it offline, my trust in a company that might
            not exist next year. Voxlit is the version I built when I stopped
            compromising.
          </p>
        </div>

        <div className={`feature-grid reveal delay-2${inView ? ' in-view' : ''}`}>
          {features.map((feature) => (
              <div
                key={feature.heading}
                style={{
                  padding: 32,
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

                {feature.badge && (
                  <div style={{
                    display: 'inline-block',
                    background: '#FFEB3B',
                    border: '2px solid #0A0A0A',
                    boxShadow: '2px 2px 0px #0A0A0A',
                    padding: '3px 9px',
                    marginBottom: 12,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.625rem',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    color: '#0A0A0A',
                    textTransform: 'uppercase',
                  }}>
                    {feature.badge}
                  </div>
                )}
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
                  whiteSpace: 'pre-line',
                }}>
                  {feature.body}
                </p>
              </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CloudIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M6 17h10a4 4 0 0 0 .7-7.94A6 6 0 0 0 5.24 8.5 4 4 0 0 0 6 17z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    </svg>
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

