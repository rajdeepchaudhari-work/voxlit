const COMMANDS = [
  {
    category: 'Emails & Messages',
    items: [
      { trigger: 'write an email to...', desc: 'Drafts a full email with subject line' },
      { trigger: 'decline this meeting...', desc: 'Polite meeting decline, ready to send' },
      { trigger: 'write a Slack message...', desc: 'Casual professional tone' },
      { trigger: 'draft a reply to...', desc: 'Context-aware response' },
    ],
  },
  {
    category: 'Code & Development',
    items: [
      { trigger: 'optimize this prompt...', desc: 'Structured prompt with requirements + criteria' },
      { trigger: 'write a commit message for...', desc: 'Conventional commit format' },
      { trigger: 'explain this error...', desc: 'Diagnosis + fix, no preamble' },
      { trigger: 'write a regex for...', desc: 'Just the pattern, ready to paste' },
      { trigger: 'draft a PR description...', desc: 'Summary + test plan format' },
    ],
  },
  {
    category: 'Writing & Editing',
    items: [
      { trigger: 'fix the grammar in...', desc: 'Corrected text only' },
      { trigger: 'make this more professional...', desc: 'Formal rewrite' },
      { trigger: 'summarize this...', desc: 'Tight bullet points' },
      { trigger: 'translate this to Spanish...', desc: 'Just the translation' },
    ],
  },
  {
    category: 'Productivity',
    items: [
      { trigger: 'write a bug report for...', desc: 'Steps, expected, actual, environment' },
      { trigger: 'break this down into tasks...', desc: 'Numbered action items' },
      { trigger: 'compare X and Y...', desc: 'Side-by-side pros/cons' },
      { trigger: 'write a proposal for...', desc: 'Objective, approach, timeline' },
    ],
  },
]

export default function AgentPanel() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#FFFDF7' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 14px', borderBottom: '3px solid #0A0A0A', background: '#FFFFFF' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
          Voxlit Agent
        </h2>
      </div>

      <div style={{ padding: '24px 20px', maxWidth: 640 }}>

        {/* How to use */}
        <div style={{
          padding: '20px 20px',
          background: '#FFFFFF',
          border: '3px solid #0A0A0A',
          boxShadow: '6px 6px 0px #665DF5',
          marginBottom: 28,
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.12em', color: '#665DF5', marginBottom: 10,
          }}>
            HOW TO USE
          </div>
          <p style={{ fontSize: 13, color: '#333', lineHeight: 1.65, fontFamily: 'var(--font-body)', margin: 0 }}>
            Say <strong style={{ color: '#0A0A0A' }}>"Hey Voxlit"</strong> before any command.
            The AI executes your intent and pastes the result directly into your current app.
          </p>
          <div style={{
            marginTop: 14, padding: '10px 14px',
            background: '#1A1A1A', border: '2px solid #0A0A0A',
            fontFamily: 'var(--font-mono)', fontSize: 12, color: '#E8E8E8',
          }}>
            <span style={{ color: '#665DF5' }}>$</span> Hey Voxlit, write an email declining the 3pm meeting
          </div>
        </div>

        {/* Command categories */}
        {COMMANDS.map((cat) => (
          <div key={cat.category} style={{ marginBottom: 24 }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.12em', color: '#665DF5', textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              {cat.category}
            </div>
            <div style={{
              background: '#FFFFFF', border: '2px solid #0A0A0A',
              boxShadow: '3px 3px 0px #0A0A0A',
            }}>
              {cat.items.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 12, alignItems: 'baseline',
                  padding: '10px 14px',
                  borderBottom: i < cat.items.length - 1 ? '1px solid rgba(10,10,10,0.1)' : 'none',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                      color: '#0A0A0A',
                    }}>
                      "{item.trigger}"
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      color: '#888', marginTop: 2,
                    }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Beta note */}
        <div style={{
          padding: '14px 16px',
          border: '2px solid #FFEB3B', background: 'rgba(255,235,59,0.08)',
          marginTop: 8,
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.12em', color: '#0A0A0A', marginBottom: 6,
          }}>
            BETA
          </div>
          <p style={{
            fontSize: 11, color: '#666', lineHeight: 1.6,
            fontFamily: 'var(--font-mono)', margin: 0,
          }}>
            Voxlit Agent is in beta. Powered by Voxlit Cloud.
            More skills coming soon — custom workflows, app-specific commands, team templates.
          </p>
        </div>
      </div>
    </div>
  )
}
