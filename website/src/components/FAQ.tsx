import { useState } from 'react'
import { useInView } from '../hooks/useInView'

const GITHUB_URL = 'https://github.com/rajdeepchaudhari-work/voxlit'

const faqs = [
  {
    q: 'Does Voxlit send my audio anywhere?',
    a: 'No. All audio is processed on your Mac using whisper.cpp. No telemetry, no analytics, no background connections. MIT licensed and fully auditable.',
  },
  {
    q: 'What are the system requirements?',
    a: 'macOS 13 Ventura or later, Apple Silicon or Intel. Apple Silicon recommended for best performance.',
  },
  {
    q: 'How do I install Voxlit?',
    a: 'Via Homebrew: run `brew tap rajdeepchaudhari-work/voxlit` then `brew install --cask voxlit`. Or download the .dmg from GitHub Releases.',
  },
  {
    q: 'Which apps does it work with?',
    a: 'Any app that accepts keyboard input — Notion, Slack, VS Code, Terminal, Mail, Discord, and thousands more. Text is injected via the macOS Accessibility API.',
  },
  {
    q: 'How accurate is the transcription?',
    a: 'Excellent for everyday dictation on M-series Macs. Download larger whisper.cpp models (small, medium, large) from Settings for higher accuracy — all offline, all free.',
  },
  {
    q: 'Is Voxlit really free forever?',
    a: 'Yes. MIT licensed — no paid tier, no freemium gate, no future subscription. Fork it, modify it, ship it.',
  },
  {
    q: 'Does cloud mode compromise my privacy?',
    a: 'Cloud mode is opt-in. Audio goes directly to OpenAI\'s API using your own key — never through any Voxlit server. Your key is encrypted on disk.',
  },
  {
    q: 'Why does macOS ask for permissions?',
    a: 'Voxlit needs Microphone access (to hear you) and Accessibility access (to type into other apps). The onboarding wizard walks you through both.',
  },
]

export default function FAQ() {
  const { ref, inView } = useInView()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section
      id="faq"
      ref={ref as React.RefObject<HTMLElement>}
      style={{
        padding: '96px 0',
        borderBottom: '3px solid #0A0A0A',
        background: '#F5F0E8',
      }}
    >
      <div className="page-container">
        <div className={`reveal${inView ? ' in-view' : ''}`} style={{ marginBottom: 48 }}>
          <div className="overline" style={{ marginBottom: 12 }}>FAQ</div>
          <h2 className="section-heading">Common questions.</h2>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.9375rem',
            color: '#666',
            marginTop: 12,
          }}>
            More questions?{' '}
            <a href={`${GITHUB_URL}/discussions`} target="_blank" rel="noopener noreferrer"
              style={{ color: '#665DF5', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>
              Ask on GitHub ↗
            </a>
          </p>
        </div>

        <div
          className={`reveal delay-2${inView ? ' in-view' : ''}`}
          style={{
            border: '3px solid #0A0A0A',
            boxShadow: '6px 6px 0px #0A0A0A',
            background: '#FFFFFF',
          }}
        >
          {faqs.map((item, i) => {
            const isOpen = openIndex === i
            const isLast = i === faqs.length - 1
            return (
              <div key={i} style={{ borderBottom: isLast ? 'none' : '2px solid #0A0A0A' }}>
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: '18px 24px',
                    background: isOpen ? '#FFFDF7' : '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = '#F5F0E8' }}
                  onMouseLeave={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = '#FFFFFF' }}
                >
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '0.9375rem',
                    letterSpacing: '-0.01em',
                    color: '#0A0A0A',
                  }}>
                    {item.q}
                  </span>
                  <span style={{
                    flexShrink: 0,
                    width: 26, height: 26,
                    border: '2px solid #0A0A0A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isOpen ? '#665DF5' : '#FFFFFF',
                    color: isOpen ? '#FFFFFF' : '#0A0A0A',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1rem', fontWeight: 700,
                    transition: 'background 0.1s, color 0.1s',
                  }}>
                    {isOpen ? '−' : '+'}
                  </span>
                </button>

                {isOpen && (
                  <div style={{ padding: '0 24px 20px', background: '#FFFDF7', borderTop: '1px solid rgba(10,10,10,0.08)' }}>
                    <p style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.9375rem',
                      lineHeight: 1.7,
                      color: '#444',
                      marginTop: 14,
                    }}>
                      {item.a.includes('`')
                        ? item.a.split('`').map((part, pi) =>
                            pi % 2 === 1
                              ? <code key={pi} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', background: '#F5F0E8', padding: '1px 6px', border: '1px solid rgba(10,10,10,0.15)' }}>{part}</code>
                              : part
                          )
                        : item.a}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
