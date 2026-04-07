const GITHUB_URL = 'https://github.com/rajdeepchaudhari-work/voxlit'

const archBlock = `# voxlit architecture

audio_capture:
  engine:    AVFoundation AVAudioEngine
  format:    PCM 16kHz mono Float32
  latency:   ~12ms buffer
  process:   Swift helper (signed binary)

transcription:
  engine:    whisper.cpp (Metal backend)
  model:     ggml-base.en (142 MB, bundled)
  execution: Apple Neural Engine / Metal GPU
  latency:   <500ms for 5s audio (M2)

text_injection:
  method:    AXUIElement (Accessibility API)
  target:    any focused NSTextField / WebView
  fallback:  CGEventCreateKeyboardEvent (Cmd+V)

storage:
  database:  SQLite (better-sqlite3)
  orm:       Drizzle
  location:  ~/Library/Application Support/Voxlit
  synced:    never

network:
  outbound:  none (local model default)
  optional:  OpenAI API (user-supplied key only)`.trim()

const chips = [
  { label: 'whisper.cpp', desc: 'MIT Licensed inference engine', tag: 'LOCAL' },
  { label: 'SQLite', desc: 'Local-only transcript history', tag: 'LOCAL' },
  { label: 'AVFoundation', desc: 'Native macOS audio capture', tag: 'NATIVE' },
  { label: 'AXUIElement', desc: 'Universal text injection', tag: 'NATIVE' },
  { label: 'Electron 41', desc: 'App shell + IPC', tag: 'SHELL' },
  { label: 'React 18 + TS', desc: 'UI renderer layer', tag: 'UI' },
  { label: 'electron-builder', desc: 'Universal .dmg packaging', tag: 'BUILD' },
]

export default function TechSpecs() {
  return (
    <section
      id="tech"
      style={{
        padding: '96px 0',
        borderBottom: '3px solid #0A0A0A',
        background: '#F5F0E8',
      }}
    >
      <div className="page-container">
        <div style={{ marginBottom: 56 }}>
          <div className="overline" style={{ marginBottom: 12 }}>Under the Hood</div>
          <h2 className="section-heading">Built on solid primitives.</h2>
        </div>

        <div className="techspecs-grid">
          {/* Left — Architecture code block */}
          <div className="terminal-window">
            <div className="terminal-titlebar">
              <div className="terminal-dot" style={{ background: '#FF5F57' }} />
              <div className="terminal-dot" style={{ background: '#FFBD2E' }} />
              <div className="terminal-dot" style={{ background: '#28C840' }} />
              <span style={{ marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#999' }}>
                architecture.yml
              </span>
            </div>
            <div className="terminal-content" style={{ padding: 24 }}>
              <pre style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8125rem',
                lineHeight: 1.7,
                color: '#AAA',
                margin: 0,
                overflowX: 'auto',
                whiteSpace: 'pre',
              }}>
                {archBlock.split('\n').map((line, i) => {
                  const isComment = line.startsWith('#')
                  const isKey = /^\w/.test(line) && line.includes(':')
                  const isSubKey = line.startsWith('  ') && line.includes(':')
                  return (
                    <span key={i} style={{
                      display: 'block',
                      color: isComment ? '#555' : isKey ? '#FFEB3B' : isSubKey ? '#665DF5' : '#AAA',
                    }}>
                      {line}
                    </span>
                  )
                })}
              </pre>
            </div>
          </div>

          {/* Right — Spec chips */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="overline" style={{ marginBottom: 8 }}>Dependencies</div>
            {chips.map(chip => (
              <div key={chip.label} className="spec-chip">
                <span className="badge badge-purple" style={{ flexShrink: 0, marginTop: 1 }}>{chip.tag}</span>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    color: '#0A0A0A',
                    marginBottom: 2,
                  }}>{chip.label}</div>
                  <div style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.8125rem',
                    color: '#666',
                  }}>{chip.desc}</div>
                </div>
              </div>
            ))}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost"
              style={{ marginTop: 8, justifyContent: 'center' }}
            >
              <GitHubIcon />
              View Source on GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}
