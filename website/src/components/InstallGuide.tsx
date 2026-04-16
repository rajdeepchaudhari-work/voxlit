import { useInView } from '../hooks/useInView'

const steps = [
  {
    num: '1',
    heading: 'Download and drag to Applications',
    body: 'Download the .dmg from the button above (or from GitHub Releases). Open it and drag Voxlit into your Applications folder.',
  },
  {
    num: '2',
    heading: '"Voxlit cannot be opened"',
    body: 'Double-click Voxlit. macOS will show: "Voxlit cannot be opened because the developer cannot be verified." This is normal for open-source apps that are not notarized through Apple.',
  },
  {
    num: '3',
    heading: 'Right-click to open',
    body: 'Right-click (or Control-click) the Voxlit app icon in Applications. Click "Open" from the menu. In the dialog that appears, click "Open" again. You only need to do this once — after that, Voxlit opens normally.',
  },
  {
    num: '4',
    heading: 'Grant permissions',
    body: 'macOS will prompt for three permissions. Grant all three:\n\nMicrophone — required to hear you.\nAccessibility — required to type text into your apps.\nAutomation (System Events) — required for the Cmd+V paste fallback.',
  },
  {
    num: '5',
    heading: 'Hold Fn and speak',
    body: 'That is it. Hold the Fn key (or your configured hotkey), speak naturally, and release. Your words appear wherever you were typing.',
  },
]

export default function InstallGuide() {
  const { ref, inView } = useInView()

  return (
    <section
      id="install-guide"
      ref={ref as React.RefObject<HTMLElement>}
      style={{
        padding: '96px 0',
        borderBottom: '3px solid #0A0A0A',
        background: '#FFFDF7',
      }}
    >
      <div className="page-container">
        <div className={`reveal${inView ? ' in-view' : ''}`} style={{ marginBottom: 48, maxWidth: 640 }}>
          <div className="overline" style={{ marginBottom: 12 }}>First-Time Setup</div>
          <h2 className="section-heading">First-time install<br />on macOS.</h2>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            color: '#333',
            marginTop: 16,
            lineHeight: 1.65,
          }}>
            Voxlit is open-source and not notarized through Apple, so macOS will
            block it on first launch. Here is how to get past that. Takes 30 seconds.
          </p>
        </div>

        <div className={`reveal delay-2${inView ? ' in-view' : ''}`}>
          {steps.map((step, i) => (
            <div
              key={step.num}
              style={{
                display: 'grid',
                gridTemplateColumns: '64px 1fr',
                gap: 0,
                background: i % 2 === 0 ? '#FFFFFF' : '#F5F0E8',
                border: '3px solid #0A0A0A',
                borderBottom: i < steps.length - 1 ? 'none' : '3px solid #0A0A0A',
              }}
            >
              {/* Step number */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                paddingTop: 28,
                borderRight: '3px solid #0A0A0A',
                background: i % 2 === 0 ? '#F5F0E8' : '#FFFFFF',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: '1.5rem',
                  color: '#665DF5',
                  letterSpacing: '-0.02em',
                }}>
                  {step.num}
                </span>
              </div>

              {/* Content */}
              <div style={{ padding: '24px 28px' }}>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '1.0625rem',
                  letterSpacing: '-0.02em',
                  color: '#0A0A0A',
                  marginBottom: 8,
                }}>
                  {step.heading}
                </h3>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem',
                  lineHeight: 1.65,
                  color: '#333333',
                  whiteSpace: 'pre-line',
                }}>
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className={`reveal delay-3${inView ? ' in-view' : ''}`} style={{
          marginTop: 24,
          padding: '16px 20px',
          border: '2px solid #0A0A0A',
          background: '#FFEB3B',
          boxShadow: '4px 4px 0px #0A0A0A',
        }}>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            fontWeight: 700,
            color: '#0A0A0A',
            letterSpacing: '0.02em',
          }}>
            Stuck? Run this in Terminal to remove the quarantine flag:{' '}
            <code style={{
              background: '#FFFFFF',
              border: '1px solid #0A0A0A',
              padding: '2px 6px',
              fontSize: '0.75rem',
            }}>
              xattr -d com.apple.quarantine /Applications/Voxlit.app
            </code>
          </p>
        </div>
      </div>
    </section>
  )
}
