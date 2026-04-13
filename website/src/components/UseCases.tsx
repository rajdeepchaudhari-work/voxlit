import { useInView } from '../hooks/useInView'

interface UseCase {
  kicker: string
  heading: string
  body: string
  metric?: { label: string; value: string }
  bg: string
  example?: { before: string; after: string; label: string }
}

const useCases: UseCase[] = [
  {
    kicker: '01 · AI Prompting',
    heading: 'Get better answers from ChatGPT, Claude, Cursor.',
    body: "Typing forces you to compress. Dictation lets you think out loud — give the model the full context, every constraint, every counter-example. You'll feel the quality of replies shift on day one.",
    bg: 'rgba(102,93,245,0.1)',
    example: {
      before: '"refactor this"',
      after: '"refactor this list component to use virtualization, keep the existing prop API, and make sure hover states still work — we hit 50k rows in prod yesterday and it froze"',
      label: 'What you actually meant',
    },
  },
  {
    kicker: '02 · Writing at speed',
    heading: 'Draft emails, docs, and Slack replies 3× faster.',
    body: 'Most people type at 40 wpm. You speak at 150. Voxlit closes the gap — dictate messages, long-form writing, spec docs, release notes, anything with words — directly into whatever app is focused. No context-switch, no copy-paste.',
    metric: { label: 'Average typing speed', value: '40 wpm' },
    bg: '#FFEB3B',
  },
  {
    kicker: '03 · Code rationale',
    heading: 'Explain the *why* in commit messages and PRs.',
    body: "The best code reviews have context paragraphs — but typing them out at 2am is when everyone bails and writes 'fix bug'. Hit the hotkey, talk through the tradeoff, done. Your future self and your reviewers will thank you.",
    bg: '#FFFFFF',
  },
  {
    kicker: '04 · RSI-friendly',
    heading: 'Give your wrists a break.',
    body: "If you're a heavy typist, your forearms know it. Voxlit lets you alternate — type some, dictate some, stay productive without the pain spiral. One hotkey in every app means you don't have to open a separate dictation tool.",
    bg: '#FFFFFF',
  },
]

export default function UseCases() {
  const { ref, inView } = useInView()

  return (
    <section
      id="use-cases"
      ref={ref as React.RefObject<HTMLElement>}
      style={{
        padding: '96px 0',
        borderBottom: '3px solid #0A0A0A',
        background: '#FFFDF7',
      }}
    >
      <div className="page-container">
        <div className={`reveal${inView ? ' in-view' : ''}`} style={{ marginBottom: 56, maxWidth: 680 }}>
          <div className="overline" style={{ marginBottom: 12 }}>Use Cases</div>
          <h2 className="section-heading">
            What you do with your hands,<br />
            now you can do with your voice.
          </h2>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            color: '#333',
            marginTop: 16,
            lineHeight: 1.65,
          }}>
            Voxlit is built for how you actually work — AI prompts at 3 a.m., Slack
            threads you were dreading, commit messages you kept skipping. One hotkey,
            every app.
          </p>
        </div>

        <div className={`reveal delay-2${inView ? ' in-view' : ''}`} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 0,
          border: '3px solid #0A0A0A',
          boxShadow: '6px 6px 0px #0A0A0A',
        }}>
          {useCases.map((uc, i) => (
            <div
              key={uc.heading}
              style={{
                padding: 36,
                background: uc.bg,
                borderRight: i % 2 === 0 ? '3px solid #0A0A0A' : 'none',
                borderBottom: i < useCases.length - 2 ? '3px solid #0A0A0A' : 'none',
                position: 'relative',
              }}
            >
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#665DF5',
                marginBottom: 14,
              }}>
                {uc.kicker}
              </div>

              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '1.375rem',
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                color: '#0A0A0A',
                marginBottom: 14,
              }}>
                {uc.heading}
              </h3>

              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.9375rem',
                lineHeight: 1.65,
                color: '#333',
              }}>
                {uc.body}
              </p>

              {uc.metric && (
                <div style={{
                  marginTop: 18,
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: 8,
                  padding: '6px 12px',
                  background: '#FFFFFF',
                  border: '2px solid #0A0A0A',
                  boxShadow: '3px 3px 0px #0A0A0A',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: '1.1rem',
                    color: '#0A0A0A',
                    letterSpacing: '-0.02em',
                  }}>
                    {uc.metric.value}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#666',
                  }}>
                    {uc.metric.label}
                  </span>
                </div>
              )}

              {uc.example && (
                <div style={{
                  marginTop: 18,
                  padding: '14px 16px',
                  background: '#FFFFFF',
                  border: '2px solid #0A0A0A',
                  boxShadow: '3px 3px 0px #0A0A0A',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#666',
                    marginBottom: 6,
                  }}>
                    What you typed
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8125rem',
                    color: '#999',
                    textDecoration: 'line-through',
                    marginBottom: 12,
                  }}>
                    {uc.example.before}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#665DF5',
                    marginBottom: 6,
                  }}>
                    {uc.example.label}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8125rem',
                    color: '#0A0A0A',
                    lineHeight: 1.5,
                  }}>
                    {uc.example.after}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 760px) {
          #use-cases .page-container > div:nth-child(2) {
            grid-template-columns: 1fr !important;
          }
          #use-cases .page-container > div:nth-child(2) > div {
            border-right: none !important;
            border-bottom: 3px solid #0A0A0A !important;
          }
          #use-cases .page-container > div:nth-child(2) > div:last-child {
            border-bottom: none !important;
          }
        }
      `}</style>
    </section>
  )
}
