import { useInView } from '../hooks/useInView'

interface UseCase {
  kicker: string
  heading: string
  body: string
  bg: string
}

const useCases: UseCase[] = [
  {
    kicker: '01 · AI Prompting',
    heading: 'Better prompts for ChatGPT, Claude, Cursor.',
    body: 'Typing forces you to compress. Dictation lets you think out loud. You give the model full context, every constraint, every counter-example. The quality of replies shifts on day one.',
    bg: 'rgba(102,93,245,0.1)',
  },
  {
    kicker: '02 · Writing at speed',
    heading: 'Draft emails, docs, Slack replies 3× faster.',
    body: 'Most people type at 40 wpm. You speak at 150. Voxlit closes the gap. Dictate long emails, spec docs, release notes, anything with words, directly into whatever app is focused. No context switch. No copy-paste.',
    bg: '#FFEB3B',
  },
  {
    kicker: '03 · Code rationale',
    heading: 'Explain the why in commits and PRs.',
    body: "Good code reviews have context paragraphs. Typing them at 2am is when everyone bails and writes 'fix bug'. Hit the hotkey, talk through the tradeoff, done. Your future self and your reviewers will thank you.",
    bg: '#FFFFFF',
  },
  {
    kicker: '04 · Easy on your wrists',
    heading: 'Give your hands a break.',
    body: "If you're a heavy typist, your forearms know it. Voxlit lets you alternate. Type some, dictate some, stay productive without the pain spiral. One hotkey in every app, no separate dictation tool to open.",
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
            Built for how you actually work. AI prompts at 3 a.m., Slack threads you
            were dreading, commit messages you kept skipping. One hotkey, every app.
          </p>
        </div>

        <div
          className={`use-cases-grid reveal delay-2${inView ? ' in-view' : ''}`}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gridAutoRows: '1fr',
            gap: 0,
            border: '3px solid #0A0A0A',
            boxShadow: '6px 6px 0px #0A0A0A',
          }}
        >
          {useCases.map((uc, i) => (
            <div
              key={uc.heading}
              style={{
                padding: 36,
                background: uc.bg,
                borderRight: i % 2 === 0 ? '3px solid #0A0A0A' : 'none',
                borderBottom: i < 2 ? '3px solid #0A0A0A' : 'none',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#665DF5',
                marginBottom: 16,
              }}>
                {uc.kicker}
              </div>

              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '1.5rem',
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
                lineHeight: 1.7,
                color: '#333',
              }}>
                {uc.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 760px) {
          .use-cases-grid {
            grid-template-columns: 1fr !important;
            grid-auto-rows: auto !important;
          }
          .use-cases-grid > div {
            border-right: none !important;
            border-bottom: 3px solid #0A0A0A !important;
          }
          .use-cases-grid > div:last-child {
            border-bottom: none !important;
          }
        }
      `}</style>
    </section>
  )
}
