import { useInView } from '../hooks/useInView'

const steps = [
  {
    num: '01',
    icon: <KeyboardIcon />,
    heading: 'Tap your hotkey',
    body: 'Control + Space by default, or bind it to whatever feels right under your thumb. Works from any app, anytime. No Dock-hunting, no window switching, no context break.',
    accent: '#FFEB3B',
  },
  {
    num: '02',
    icon: <MicIcon />,
    heading: 'Just talk',
    body: "Speak at your normal pace. Pause, think, keep going. whisper.cpp runs on your Mac's Neural Engine and Metal GPU. It is not sitting on a server somewhere waiting for your voice.",
    accent: '#FFFFFF',
  },
  {
    num: '03',
    icon: <CursorIcon />,
    heading: 'The words are already there',
    body: 'Your sentence shows up in whatever text field you were looking at. Notion, Slack, Cursor, Mail, Terminal. Release the hotkey, and Voxlit is gone.',
    accent: 'rgba(102,93,245,0.12)',
  },
]

export default function HowItWorks() {
  const { ref, inView } = useInView()

  return (
    <section
      id="how-it-works"
      ref={ref as React.RefObject<HTMLElement>}
      style={{
        padding: '96px 0',
        borderBottom: '3px solid #0A0A0A',
        background: '#FFFDF7',
      }}
    >
      <div className="page-container">
        <div className={`reveal${inView ? ' in-view' : ''}`} style={{ marginBottom: 56, maxWidth: 640 }}>
          <div className="overline" style={{ marginBottom: 12 }}>How It Works</div>
          <h2 className="section-heading">Three keystrokes.<br />Whole app.</h2>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            color: '#333',
            marginTop: 16,
            lineHeight: 1.65,
          }}>
            No onboarding tutorial, no getting-started guide, no "quick tour."
            If you can hold down a key, you already know how to use it.
          </p>
        </div>

        <div className={`how-grid reveal delay-2${inView ? ' in-view' : ''}`}>
          {steps.map((step) => (
            <div
              key={step.num}
              style={{
                padding: 36,
                background: step.accent,
                position: 'relative',
              }}
            >
              {/* Step number — oversized, brutalist */}
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: '5rem',
                lineHeight: 1,
                letterSpacing: '-0.05em',
                color: 'rgba(10,10,10,0.1)',
                position: 'absolute',
                top: 12,
                right: 16,
                userSelect: 'none',
              }}>
                {step.num}
              </div>

              <div style={{
                width: 48, height: 48,
                border: '3px solid #0A0A0A',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#665DF5',
                marginBottom: 20,
                background: '#FFFFFF',
                boxShadow: '3px 3px 0px #0A0A0A',
              }}>
                {step.icon}
              </div>

              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '1.125rem',
                letterSpacing: '-0.02em',
                color: '#0A0A0A',
                marginBottom: 12,
              }}>
                {step.heading}
              </h3>
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                lineHeight: 1.65,
                color: '#333333',
              }}>
                {step.body}
              </p>
            </div>
          ))}
        </div>

        {/* What's new in v2 */}
        <div className={`reveal delay-3${inView ? ' in-view' : ''}`} style={{
          marginTop: 56,
          padding: 32,
          border: '3px solid #0A0A0A',
          background: '#FFFFFF',
          boxShadow: '6px 6px 0px #0A0A0A',
        }}>
          <div className="overline" style={{ marginBottom: 12 }}>What's new in v2.0.0</div>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '1.25rem',
            letterSpacing: '-0.02em',
            color: '#0A0A0A',
            marginBottom: 16,
          }}>
            Faster, more reliable, easier to start.
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 12,
          }}>
            {[
              'Voxlit Cloud is the default engine — no setup',
              'Chunked parallel transcription (faster results)',
              'Sleep/wake recovery — close lid, reopen, keep going',
              'Smart device fallback — auto-switches to default mic',
              'Reset command for when things get stuck',
              '16 bug fixes across the board',
            ].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{
                  color: '#665DF5',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  flexShrink: 0,
                  fontWeight: 700,
                }}>+</span>
                <span style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  color: '#333',
                }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function KeyboardIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="6" width="20" height="12" stroke="currentColor" strokeWidth="2" />
      <line x1="6" y1="10" x2="6" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
      <line x1="10" y1="10" x2="10" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
      <line x1="14" y1="10" x2="14" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
      <line x1="18" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
      <line x1="8" y1="14" x2="16" y2="14" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="2" width="6" height="11" stroke="currentColor" strokeWidth="2" />
      <path d="M5 10v2a7 7 0 0014 0v-2" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="2" />
      <line x1="8" y1="22" x2="16" y2="22" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function CursorIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M4 4l7 18 3-7 7-3L4 4z" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}
