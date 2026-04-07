import { useInView } from '../hooks/useInView'

const rows = [
  { feature: 'Price', voxlit: 'Free, forever', glaido: 'Free / $20/mo', dragon: '$600 one-time', cloud: '$8–$30/mo' },
  { feature: 'Open Source', voxlit: 'MIT', glaido: 'Proprietary', dragon: 'Proprietary', cloud: 'Proprietary' },
  { feature: 'Processes Audio', voxlit: 'On device', glaido: 'Off device', dragon: 'On device', cloud: 'Off device' },
  { feature: 'Internet Required', voxlit: 'Never', glaido: 'Always', dragon: 'Rarely', cloud: 'Always' },
  { feature: 'Account Required', voxlit: 'No', glaido: 'Yes', dragon: 'No', cloud: 'Yes' },
  { feature: 'Apple Silicon', voxlit: 'Optimized', glaido: 'Unknown', dragon: 'No', cloud: 'N/A' },
  { feature: 'Vendor Risk', voxlit: 'Zero', glaido: 'Medium', dragon: 'Medium', cloud: 'High' },
  { feature: 'Can Self-host', voxlit: 'Yes (fork it)', glaido: 'No', dragon: 'N/A', cloud: 'No' },
]

function cellStyle(val: string): React.CSSProperties {
  const good = ['Free, forever', 'MIT', 'On device', 'Never', 'No', 'Optimized', 'Zero', 'Yes (fork it)']
  const bad = ['Off device', 'Always', 'Yes', 'High', 'Proprietary', '$600 one-time', '$8–$30/mo']
  if (good.includes(val)) return { color: '#00C853', fontWeight: 700 }
  if (bad.includes(val)) return { color: '#999' }
  return {}
}

export default function ComparisonTable() {
  const { ref, inView } = useInView()

  return (
    <section
      id="compare"
      ref={ref as React.RefObject<HTMLElement>}
      style={{
        padding: '96px 0',
        borderBottom: '3px solid #0A0A0A',
        background: '#FFFDF7',
      }}
    >
      <div className="page-container">
        <div className={`reveal${inView ? ' in-view' : ''}`} style={{ marginBottom: 48 }}>
          <div className="overline" style={{ marginBottom: 12 }}>Comparison</div>
          <h2 className="section-heading">We compared ourselves.<br />Honestly.</h2>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            color: '#333',
            maxWidth: 560,
            marginTop: 16,
            lineHeight: 1.65,
          }}>
            We didn't cherry-pick metrics. Here's the full picture — including where commercial tools have an edge.
          </p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="brut-table">
            <thead>
              <tr>
                <th style={{ minWidth: 160 }}>Feature</th>
                <th className="col-voxlit" style={{ minWidth: 140 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>★</span> Voxlit
                  </div>
                </th>
                <th style={{ minWidth: 120 }}>Glaido</th>
                <th style={{ minWidth: 120 }}>Dragon</th>
                <th style={{ minWidth: 120 }}>Cloud SaaS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.feature}>
                  <td style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    color: '#0A0A0A',
                    letterSpacing: '0.02em',
                  }}>
                    {row.feature}
                  </td>
                  <td className="col-voxlit" style={cellStyle(row.voxlit)}>{row.voxlit}</td>
                  <td style={cellStyle(row.glaido)}>{row.glaido}</td>
                  <td style={cellStyle(row.dragon)}>{row.dragon}</td>
                  <td style={cellStyle(row.cloud)}>{row.cloud}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Honest trade-off callout — matches app warning pattern */}
        <div style={{
          marginTop: 28,
          padding: 24,
          border: '3px solid #0A0A0A',
          borderLeftWidth: 6,
          borderLeftColor: '#FFEB3B',
          background: '#FFFDF7',
          boxShadow: '4px 4px 0px #0A0A0A',
        }}>
          <div className="overline" style={{ color: '#665DF5', marginBottom: 10 }}>
            Honest Trade-off
          </div>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.9375rem',
            lineHeight: 1.65,
            color: '#333',
          }}>
            Transcription quality scales with your Mac's hardware. An M3 Max will outperform an older Intel Mac.
            If you need guaranteed accuracy on legacy hardware, a cloud service may serve you better.
            If you need guaranteed privacy on any hardware, Voxlit is the answer.
          </p>
        </div>
      </div>
    </section>
  )
}
