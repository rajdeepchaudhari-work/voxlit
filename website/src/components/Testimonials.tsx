import { useInView } from '../hooks/useInView'

const GITHUB_URL = 'https://github.com/rajdeepchaudhari-work/voxlit'

const quotes = [
  {
    text: "First tool I've found that actually works offline on my M2 Air. The latency is genuinely impressive — I forgot I wasn't using a cloud service.",
    handle: '@hn_commenter',
    platform: 'Hacker News',
    bg: '#FFEB3B',
  },
  {
    text: "MIT licensed and it works in every text field I've tried — VS Code, Notion, even the terminal. Finally.",
    handle: '@devhandle',
    platform: 'Twitter/X',
    bg: '#FFFFFF',
  },
  {
    text: "I needed offline transcription for clinical notes. Nothing leaves my Mac. This is the only tool that gives me that guarantee architecturally, not just by policy.",
    handle: '@reddit_macapps',
    platform: 'r/MacApps',
    bg: 'rgba(102,93,245,0.1)',
  },
]

export default function Testimonials() {
  const { ref, inView } = useInView()

  return (
    <section
      id="community"
      ref={ref as React.RefObject<HTMLElement>}
      style={{
        padding: '96px 0',
        borderBottom: '3px solid #0A0A0A',
        background: '#FFFDF7',
      }}
    >
      <div className="page-container">
        <div className={`reveal${inView ? ' in-view' : ''}`} style={{ marginBottom: 48 }}>
          <div className="overline" style={{ marginBottom: 12 }}>Community</div>
          <h2 className="section-heading">Built by people who<br />got tired of paying.</h2>
        </div>

        {/* GitHub stars badge */}
        <div style={{ marginBottom: 48 }}>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 20px',
              textDecoration: 'none',
              border: '3px solid #0A0A0A',
              background: '#FFEB3B',
              boxShadow: '4px 4px 0px #0A0A0A',
              transition: 'box-shadow 0.1s, transform 0.1s',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '0.875rem',
              letterSpacing: '0.04em',
              color: '#0A0A0A',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '6px 6px 0px #0A0A0A'
              ;(e.currentTarget as HTMLElement).style.transform = 'translate(-2px, -2px)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '4px 4px 0px #0A0A0A'
              ;(e.currentTarget as HTMLElement).style.transform = 'none'
            }}
          >
            <span style={{ fontSize: '1.125rem' }}>★</span>
            STAR ON GITHUB
            <span className="badge badge-yellow">Open Source</span>
          </a>
        </div>

        {/* Quote cards */}
        <div className="testimonials-grid">
          {quotes.map(q => (
            <div
              key={q.handle}
              style={{
                padding: 28,
                border: '3px solid #0A0A0A',
                background: q.bg,
                boxShadow: '4px 4px 0px #0A0A0A',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <blockquote style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.9375rem',
                lineHeight: 1.7,
                color: '#0A0A0A',
                fontStyle: 'italic',
                margin: 0,
                flex: 1,
              }}>
                "{q.text}"
              </blockquote>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: '#666',
                }}>{q.handle}</span>
                <span className="badge" style={{
                  border: '2px solid #0A0A0A',
                  background: '#FFFFFF',
                  color: '#0A0A0A',
                }}>
                  {q.platform}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Community CTA */}
        <div style={{
          marginTop: 40,
          padding: 28,
          border: '3px solid #0A0A0A',
          background: '#FFFFFF',
          boxShadow: '6px 6px 0px #0A0A0A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1.0625rem',
              color: '#0A0A0A',
              marginBottom: 4,
            }}>
              Have something to say?
            </div>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.875rem',
              color: '#666',
            }}>
              Open an issue, start a discussion, or submit a PR.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href={`${GITHUB_URL}/discussions`} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: '10px 20px', fontSize: '0.75rem' }}>
              Join Discussion
            </a>
            <a href={`${GITHUB_URL}/issues/new`} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ padding: '10px 20px', fontSize: '0.75rem' }}>
              Report a Bug
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
