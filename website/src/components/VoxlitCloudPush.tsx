import { useInView } from '../hooks/useInView'

const DOWNLOAD_URL = 'https://github.com/rajdeepchaudhari-work/voxlit/releases/latest'

export default function VoxlitCloudPush() {
  const { ref, inView } = useInView()

  return (
    <section
      id="voxlit-cloud-push"
      ref={ref as React.RefObject<HTMLElement>}
      style={{
        padding: '96px 0',
        borderBottom: '3px solid #0A0A0A',
        background: '#0A0A0A',
        color: '#F0EEFF',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Grid pattern background */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          pointerEvents: 'none',
        }}
      />

      <div className="page-container" style={{ position: 'relative' }}>

        <div className={`reveal${inView ? ' in-view' : ''}`} style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 6px 6px 14px',
          marginBottom: 24,
          background: '#FFFFFF',
          border: '2px solid #0A0A0A',
          boxShadow: '4px 4px 0px #22D3EE',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: '#0A0A0A',
          letterSpacing: '0.04em',
        }}>
          <span style={{
            background: '#FFEB3B', border: '2px solid #0A0A0A',
            padding: '2px 6px', fontSize: '0.625rem', fontWeight: 800,
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            Default Engine
          </span>
          <span>Free beta — no setup, no limits yet</span>
        </div>

        <h2 className={`reveal delay-1${inView ? ' in-view' : ''}`} style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 'clamp(40px, 5.5vw, 72px)',
          letterSpacing: '-0.04em',
          lineHeight: 0.95,
          marginBottom: 24,
          maxWidth: 900,
        }}>
          <span style={{ color: '#F0EEFF' }}>Voxlit Cloud.<br /></span>
          <span style={{
            background: 'linear-gradient(135deg, #A78BFA, #22D3EE)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Install. Speak. Done.
          </span>
        </h2>

        <p className={`reveal delay-2${inView ? ' in-view' : ''}`} style={{
          fontFamily: 'var(--font-body)',
          fontSize: '1.125rem',
          lineHeight: 1.65,
          color: '#9B96B8',
          maxWidth: 620,
          marginBottom: 20,
        }}>
          Voxlit Cloud is the <strong style={{ color: '#F0EEFF' }}>default engine</strong> in v2.
          No API keys. No model downloads. No credit card. Just install Voxlit and start talking.
          Powered by Whisper + GPT-4o-mini for better accuracy than local-only transcription.
        </p>

        <p className={`reveal delay-2${inView ? ' in-view' : ''}`} style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.9375rem',
          lineHeight: 1.65,
          color: '#706C8A',
          maxWidth: 580,
          marginBottom: 40,
        }}>
          Want full offline? Switch to Local mode in Settings anytime.
          Want your own OpenAI key? That works too. Voxlit Cloud is just the fastest way to start.
        </p>

        <div className={`reveal delay-3${inView ? ' in-view' : ''}`} style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 48 }}>
          <a
            href={DOWNLOAD_URL}
            className="btn-primary"
            style={{
              background: '#FFFFFF',
              color: '#0A0A0A',
              border: '2px solid #FFFFFF',
              boxShadow: '4px 4px 0px #22D3EE',
              padding: '12px 24px',
              fontSize: '0.9375rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              transition: 'transform 0.1s, box-shadow 0.1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '6px 6px 0px #22D3EE' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '4px 4px 0px #22D3EE' }}
          >
            <DownloadIcon />
            Download for macOS
          </a>
          <span style={{
            alignSelf: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#665DF5',
          }}>
            Or <a href="#features" style={{ color: '#22D3EE', textDecoration: 'underline' }}>explore all engines →</a>
          </span>
        </div>

        {/* Four-point differentiator row */}
        <div className={`reveal delay-3${inView ? ' in-view' : ''}`} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 24,
          paddingTop: 40,
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
          {[
            { n: '0', label: 'API keys needed' },
            { n: '0', label: 'models to download' },
            { n: '10s', label: 'install to first word' },
            { n: '$0', label: 'free beta, no card' },
          ].map((item) => (
            <div key={item.label}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 'clamp(40px, 5vw, 64px)',
                letterSpacing: '-0.04em',
                lineHeight: 1,
                background: 'linear-gradient(135deg, #A78BFA, #22D3EE)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: 8,
              }}>
                {item.n}
              </div>
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                color: '#9B96B8',
                lineHeight: 1.5,
              }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          #voxlit-cloud-push .page-container > div:last-child {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
      `}</style>
    </section>
  )
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
