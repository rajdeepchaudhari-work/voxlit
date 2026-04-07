import { useState } from 'react'
import { useInView } from '../hooks/useInView'

const GITHUB_URL = 'https://github.com/rajdeepchaudhari-work/voxlit'

const faqs = [
  {
    category: 'Privacy & Security',
    items: [
      {
        q: 'Does Voxlit send my audio anywhere?',
        a: 'No. By default, all audio is processed entirely on your Mac using whisper.cpp. Nothing is sent to any server, ever. There is no telemetry, no analytics, and no background connections. You can verify this yourself — the source code is MIT licensed and fully auditable on GitHub.',
      },
      {
        q: 'Is cloud mode private?',
        a: 'Cloud mode is opt-in only. When enabled, audio is sent directly to OpenAI\'s Whisper API using your own API key — not through any Voxlit server. Your key is encrypted on disk via electron-store. Voxlit never sees, stores, or proxies your audio or API key.',
      },
      {
        q: 'Does Voxlit store my transcripts?',
        a: 'Transcripts are stored in a local SQLite database at ~/Library/Application Support/Voxlit/ on your Mac only. Nothing is synced to a cloud. You can delete the database at any time from the Settings panel.',
      },
      {
        q: 'Can I audit the code?',
        a: 'Yes. Every line is MIT licensed and public on GitHub. The Swift helper, Electron main process, and React renderer are all readable. No obfuscation, no proprietary SDKs, no hidden endpoints.',
      },
    ],
  },
  {
    category: 'Installation & Setup',
    items: [
      {
        q: 'What are the system requirements?',
        a: 'macOS 13 Ventura or later. Voxlit runs on both Apple Silicon (M1/M2/M3/M4) and Intel Macs. Apple Silicon is recommended for best performance — the Neural Engine accelerates whisper.cpp inference significantly.',
      },
      {
        q: 'How do I install Voxlit?',
        a: 'The easiest way is via Homebrew: run `brew tap rajdeepchaudhari-work/voxlit` then `brew install --cask voxlit`. Alternatively, download the .dmg from GitHub Releases, open it, and drag Voxlit to your Applications folder.',
      },
      {
        q: 'Why does macOS ask about permissions on first launch?',
        a: 'Voxlit needs two permissions: Microphone access (to capture your voice) and Accessibility access (to inject text into other apps). Both are requested through standard macOS permission dialogs. The onboarding wizard walks you through each step. You can revoke either permission in System Settings → Privacy & Security at any time.',
      },
      {
        q: 'Why is the app blocked by Gatekeeper?',
        a: 'On first launch, macOS may show a security warning about the Swift helper binary. Open System Settings → Privacy & Security and click "Allow Anyway". This is a standard macOS requirement for apps distributed outside the App Store. The binary is open source and you can compile it yourself from the repo.',
      },
    ],
  },
  {
    category: 'Performance & Accuracy',
    items: [
      {
        q: 'How accurate is the transcription?',
        a: 'Accuracy depends on your hardware and which model you use. The bundled base.en model delivers excellent accuracy for everyday dictation on any modern Mac. For higher accuracy, you can download larger whisper.cpp models (small, medium, large) from the Settings panel — all offline, all free.',
      },
      {
        q: 'How fast is transcription?',
        a: 'On an M-series Mac using the base model, Voxlit transcribes in near real-time — words typically appear within 300–500ms of you speaking them. Intel Macs are slower due to CPU-only inference. Silence trimming and VAD (voice activity detection) ensure only actual speech is processed.',
      },
      {
        q: 'What languages are supported?',
        a: 'The base model covers 40+ languages including English, Spanish, French, German, Japanese, Chinese, Hindi, and more. The large-v3 model covers 100+ languages. All language detection and transcription is fully offline.',
      },
      {
        q: 'Does background noise affect accuracy?',
        a: 'whisper.cpp is remarkably robust to background noise — it\'s the same model that powers OpenAI\'s Whisper API. For noisy environments, using a dedicated microphone or headset will improve accuracy. You can also adjust the VAD sensitivity slider in Settings to reduce false triggers.',
      },
    ],
  },
  {
    category: 'Usage & Features',
    items: [
      {
        q: 'Which apps does Voxlit work with?',
        a: 'Any app that accepts keyboard input — Notion, Slack, VS Code, Terminal, Mail, Figma, Obsidian, Safari, Chrome, Discord, and thousands more. Text is injected via the macOS Accessibility API directly into the focused text field, bypassing the clipboard entirely.',
      },
      {
        q: 'Can I change the hotkey?',
        a: 'Yes. Open Settings and choose any key combination: Fn, ⌥ Space, ⌃ Space, ⌘⇧D, ⌃⇧F, or a custom shortcut. The hotkey is push-to-talk by default — hold to record, release to stop.',
      },
      {
        q: 'Does Voxlit work when I\'m offline?',
        a: 'Yes, completely. Local mode (the default) requires zero internet. The model runs on your Mac\'s Neural Engine or GPU. Only cloud mode (opt-in) requires an internet connection.',
      },
      {
        q: 'Can I access my transcription history?',
        a: 'Yes. The History panel shows all past sessions with full-text search. Sessions are stored locally in SQLite and include timestamps, duration, and the full transcript. You can delete individual sessions or clear all history from Settings.',
      },
    ],
  },
  {
    category: 'Open Source & Contributing',
    items: [
      {
        q: 'Is Voxlit really free forever?',
        a: 'Yes. Voxlit is MIT licensed — the most permissive open-source license available. There is no paid tier, no freemium gate, no future subscription. Fork it, modify it, ship it. The license will never change.',
      },
      {
        q: 'How do I contribute?',
        a: 'Open an issue to discuss large changes first, then fork the repo and submit a PR. The CONTRIBUTING.md has full setup instructions including how to build the Swift helper and whisper.cpp binaries from source. All contributions are welcome.',
      },
      {
        q: 'Can I use Voxlit in my own project?',
        a: 'Yes, the MIT license allows commercial use, modification, distribution, and private use with no restrictions. Attribution is appreciated but not required.',
      },
    ],
  },
]

export default function FAQ() {
  const { ref, inView } = useInView()
  const [openItem, setOpenItem] = useState<string | null>(null)

  const toggle = (key: string) => setOpenItem(prev => prev === key ? null : key)

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
        {/* Header */}
        <div className={`reveal${inView ? ' in-view' : ''}`} style={{ marginBottom: 64 }}>
          <div className="overline" style={{ marginBottom: 12 }}>FAQ</div>
          <h2 className="section-heading">Everything you<br />need to know.</h2>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            color: '#555',
            marginTop: 16,
            lineHeight: 1.65,
            maxWidth: 480,
          }}>
            Still have questions?{' '}
            <a
              href={`${GITHUB_URL}/discussions`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#665DF5', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              Ask on GitHub Discussions ↗
            </a>
          </p>
        </div>

        {/* FAQ categories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {faqs.map((cat, ci) => (
            <div
              key={cat.category}
              className={`reveal delay-${ci + 1}${inView ? ' in-view' : ''}`}
            >
              {/* Category label */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 16,
              }}>
                <div className="overline" style={{ color: '#665DF5' }}>{cat.category}</div>
                <div style={{ flex: 1, height: 2, background: '#0A0A0A', opacity: 0.1 }} />
              </div>

              {/* Questions */}
              <div style={{
                border: '3px solid #0A0A0A',
                boxShadow: '4px 4px 0px #0A0A0A',
                background: '#FFFFFF',
              }}>
                {cat.items.map((item, ii) => {
                  const key = `${ci}-${ii}`
                  const isOpen = openItem === key
                  const isLast = ii === cat.items.length - 1

                  return (
                    <div
                      key={key}
                      style={{ borderBottom: isLast ? 'none' : '2px solid #0A0A0A' }}
                    >
                      {/* Question row */}
                      <button
                        onClick={() => toggle(key)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 16,
                          padding: '20px 24px',
                          background: isOpen ? '#FFFDF7' : '#FFFFFF',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => {
                          if (!isOpen) (e.currentTarget as HTMLElement).style.background = '#F5F0E8'
                        }}
                        onMouseLeave={e => {
                          if (!isOpen) (e.currentTarget as HTMLElement).style.background = '#FFFFFF'
                        }}
                      >
                        <span style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 700,
                          fontSize: '0.9375rem',
                          letterSpacing: '-0.01em',
                          color: '#0A0A0A',
                          lineHeight: 1.4,
                        }}>
                          {item.q}
                        </span>
                        <span style={{
                          flexShrink: 0,
                          width: 28,
                          height: 28,
                          border: '2px solid #0A0A0A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isOpen ? '#665DF5' : '#FFFFFF',
                          color: isOpen ? '#FFFFFF' : '#0A0A0A',
                          transition: 'background 0.1s, color 0.1s',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '1rem',
                          fontWeight: 700,
                          lineHeight: 1,
                        }}>
                          {isOpen ? '−' : '+'}
                        </span>
                      </button>

                      {/* Answer */}
                      {isOpen && (
                        <div style={{
                          padding: '0 24px 24px 24px',
                          background: '#FFFDF7',
                          borderTop: '2px solid rgba(10,10,10,0.08)',
                        }}>
                          <p style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.9375rem',
                            lineHeight: 1.75,
                            color: '#333',
                            marginTop: 16,
                          }}>
                            {item.a.includes('`')
                              ? item.a.split('`').map((part, pi) =>
                                  pi % 2 === 1
                                    ? <code key={pi} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', background: '#F5F0E8', padding: '1px 6px', border: '1px solid rgba(10,10,10,0.15)' }}>{part}</code>
                                    : part
                                )
                              : item.a
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
