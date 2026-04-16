import { useState } from 'react'
import { useInView } from '../hooks/useInView'

const GITHUB_URL = 'https://github.com/rajdeepchaudhari-work/voxlit'

const faqs = [
  {
    q: 'Does Voxlit send my audio anywhere?',
    a: "In Cloud mode (the default), audio is sent to Voxlit Cloud for transcription and Agent processing. In Local mode, everything stays on your Mac. You choose. Either way, Voxlit never stores your recordings, never runs telemetry, and never sells data. The code is MIT licensed, so you can verify any of this yourself.",
  },
  {
    q: 'What are the system requirements?',
    a: 'macOS 13 Ventura or later. Works on both Apple Silicon and Intel, but M-series Macs are where it really sings. The Neural Engine and Metal GPU make transcription feel instant.',
  },
  {
    q: 'How do I install Voxlit?',
    a: 'Fastest path: run `curl -fsSL https://voxlit.co/install.sh | bash` in Terminal. It grabs the latest DMG, drops Voxlit.app into /Applications, and clears the macOS quarantine flag so Gatekeeper does not block it. You can also use `brew install --cask voxlit` (after `brew tap rajdeepchaudhari-work/voxlit`), or download the .dmg from GitHub Releases and right-click Open the first time.',
  },
  {
    q: 'Which apps does it work with?',
    a: 'If you can type in it, you can dictate into it. Notion, Slack, Cursor, VS Code, Terminal, iTerm, Ghostty, Mail, Gmail, iMessage, Discord, Linear. Basically any native or Electron app that accepts keyboard input. Voxlit uses the macOS Accessibility API, so coverage is as wide as macOS itself.',
  },
  {
    q: 'How accurate is the transcription?',
    a: 'On an M-series Mac with the default base model, accuracy is good for everyday messages, emails, and AI prompts. Need more, for long-form writing, medical terminology, or technical jargon? Download the small, medium, or large whisper model from Settings. All of them are offline and all of them are free.',
  },
  {
    q: 'Is Voxlit really free forever?',
    a: "Yes. I am not building this to flip it to a VC in two years. MIT licensed means even if I got hit by a bus tomorrow, every copy of Voxlit that already exists keeps working, and anyone can fork the repo and ship a new version. No paid tier. No freemium gate. No subscription hiding behind 'Pro features.'",
  },
  {
    q: 'What is Voxlit Agent?',
    a: 'Voxlit Agent is a voice-to-action feature built into v2. Say "Hey Voxlit" before a command and the AI executes your intent instead of just transcribing your words. Write emails, fix code, optimize prompts, draft commit messages, translate text, all by voice. Powered by GPT-4o-mini through Voxlit Cloud. Free during beta, no API key needed.',
  },
  {
    q: 'What can I do with the Agent?',
    a: 'Over 25 categories: write or reply to emails, explain errors, generate code, optimize prompts, summarize text, translate between languages, write commit messages, draft PR descriptions, create bug reports, compare tools, and more. The output is paste-ready and lands directly in whatever app you are typing in.',
  },
  {
    q: 'Does cloud mode compromise my privacy?',
    a: "Cloud mode sends audio to Voxlit Cloud for transcription and Agent processing. Local mode keeps everything on-device. You choose which mode to use in Settings, and you can switch anytime.",
  },
  {
    q: 'Why does macOS ask for permissions?',
    a: 'Two permissions, both essential. Microphone, so Voxlit can actually hear you. Accessibility, so it can type the result into your focused app. The onboarding wizard walks you through granting both in about 30 seconds. If you ever want to revoke them, System Settings > Privacy & Security is one click away.',
  },
  {
    q: 'Who builds Voxlit and why should I trust it?',
    a: "Voxlit is built by Eager HQ and developed in the open at github.com/rajdeepchaudhari-work/voxlit. Every commit is signed. Every release ships with checksums and an SBOM. CodeQL and OpenSSF run on every push. You do not have to trust us. You can trust the code, because the code is right there.",
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
