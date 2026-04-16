const CHANGES = [
  {
    title: 'Chunked transcription',
    body: 'Long utterances split at silence gaps, transcribed in parallel. Release-to-text is 3\u20135\u00d7 faster.',
  },
  {
    title: 'Sleep/wake recovery',
    body: 'Close the lid, reopen \u2014 dictation picks up without restart.',
  },
  {
    title: 'Device fallback',
    body: 'Bluetooth mic dies? Auto-falls back to built-in, tells you it switched.',
  },
  {
    title: 'Reset command',
    body: 'Tray menu or --reset flag. Clean start from any data conflict.',
  },
  {
    title: '16 bug fixes',
    body: 'Frame parser hardening, injection error surfacing, healthcheck validation, and more.',
  },
]

export default function WhatsNew() {
  return (
    <section style={{
      padding: '100px 0',
      borderBottom: '3px solid #0A0A0A',
      background: '#FFFDF7',
    }}>
      <div className="page-container">
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          color: '#0A0A0A',
          marginBottom: 56,
        }}>
          v2.0.0 — what changed
        </h2>

        <div style={{ maxWidth: 720 }}>
          {CHANGES.map((item, i) => (
            <div
              key={i}
              style={{
                padding: '20px 0',
                borderBottom: i < CHANGES.length - 1 ? '1px solid rgba(10,10,10,0.1)' : 'none',
              }}
            >
              <div style={{
                display: 'flex',
                gap: 12,
                alignItems: 'baseline',
                flexWrap: 'wrap',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1rem',
                  color: '#665DF5',
                  flexShrink: 0,
                  lineHeight: 1.6,
                }}>{'\u2192'}</span>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <span style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: '#0A0A0A',
                    lineHeight: 1.6,
                  }}>{item.title}</span>
                  <span style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '1rem',
                    color: '#666666',
                    lineHeight: 1.6,
                    marginLeft: 12,
                  }}>{item.body}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
