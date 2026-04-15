import { useInView } from '../hooks/useInView'

const steps = [
  {
    num: '01',
    icon: <KeyboardIcon />,
    heading: 'Tap your hotkey',
    body: 'Control + Space by default — or whatever feels right under your thumb. Works from any app, at any time. No Dock-hunting, no window switching, no context break.',
    accent: '#FFEB3B',
  },
  {
    num: '02',
    icon: <MicIcon />,
    heading: 'Just talk',
    body: "Speak at your normal pace. Pause. Think. Keep going. whisper.cpp runs on your Mac's Neural Engine and Metal GPU — it is not sitting on a server somewhere waiting for your voice.",
    accent: '#FFFFFF',
  },
  {
    num: '03',
    icon: <CursorIcon />,
    heading: 'The words are already there',
    body: 'Your sentence appears in whatever text field you were looking at — Notion, Slack, Cursor, Mail, Terminal. Release the hotkey and Voxlit disappears. You will forget it is there. That is the point.',
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
          <h2 className="section-heading">Three keystrokes.<br />That is the whole app.</h2>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            color: '#333',
            marginTop: 16,
            lineHeight: 1.65,
          }}>
            I did not want another tool that needed onboarding tutorials and a
            getting-started guide. If you can hold down a key, you already know
            how to use Voxlit.
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
