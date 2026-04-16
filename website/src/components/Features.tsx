const LEFT = [
  { name: 'Offline', desc: 'whisper.cpp runs on your Mac. Audio never leaves the machine.' },
  { name: 'Universal', desc: 'Works in Slack, Notion, VS Code, Terminal, any app with a text field.' },
  { name: 'Fast', desc: 'Sub-second on Apple Silicon with the base model.' },
]

const RIGHT = [
  { name: 'Open source', desc: 'MIT licensed. Read, fork, contribute on GitHub.' },
  { name: 'Free forever', desc: 'No subscription, no API key needed. Voxlit Cloud is free too.' },
  { name: 'Multilingual', desc: 'Whisper supports 100+ languages out of the box.' },
]

export default function Features() {
  return (
    <section id="features" style={{
      padding: '100px 0',
      borderBottom: '3px solid #0A0A0A',
      background: '#F5F0E8',
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
          What you get
        </h2>

        <div className="features-cols">
          <div>
            {LEFT.map((f, i) => (
              <FeatureItem key={i} name={f.name} desc={f.desc} last={i === LEFT.length - 1} />
            ))}
          </div>
          <div>
            {RIGHT.map((f, i) => (
              <FeatureItem key={i} name={f.name} desc={f.desc} last={i === RIGHT.length - 1} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function FeatureItem({ name, desc, last }: { name: string; desc: string; last: boolean }) {
  return (
    <div style={{
      paddingBottom: last ? 0 : 28,
      marginBottom: last ? 0 : 28,
    }}>
      <p style={{
        fontFamily: 'var(--font-body)',
        fontSize: '1rem',
        lineHeight: 1.65,
        color: '#333333',
      }}>
        <strong style={{ color: '#0A0A0A' }}>{name}</strong>
        <span style={{ margin: '0 8px', color: '#999' }}>&mdash;</span>
        {desc}
      </p>
    </div>
  )
}
