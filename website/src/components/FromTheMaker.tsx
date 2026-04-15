import { useInView } from '../hooks/useInView'

export default function FromTheMaker() {
  const { ref, inView } = useInView()

  return (
    <section
      id="from-the-maker"
      ref={ref as React.RefObject<HTMLElement>}
      aria-label="A note from the maker of Voxlit"
      style={{
        padding: '96px 0',
        borderBottom: '3px solid #0A0A0A',
        background: '#FFFDF7',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative corner mark */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#999',
        }}
      >
        /note-001
      </div>

      <div className="page-container">
        <div
          className={`reveal${inView ? ' in-view' : ''}`}
          style={{ maxWidth: 720, marginInline: 'auto' }}
        >
          <div className="overline" style={{ marginBottom: 14, color: '#665DF5' }}>
            From the maker
          </div>

          <h2
            className="section-heading"
            style={{ marginBottom: 32, lineHeight: 1.05 }}
          >
            I built Voxlit because I was
            <br />
            tired of paying to speak.
          </h2>

          <div
            style={{
              border: '3px solid #0A0A0A',
              background: '#FFFFFF',
              boxShadow: '6px 6px 0px #665DF5',
              padding: 36,
              position: 'relative',
            }}
          >
            {/* Quote mark */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: -28,
                left: 20,
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: '5rem',
                lineHeight: 1,
                color: '#665DF5',
                background: '#FFFDF7',
                padding: '0 10px',
                userSelect: 'none',
              }}
            >
              “
            </div>

            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '1.0625rem',
                lineHeight: 1.75,
                color: '#222',
              }}
            >
              <p style={{ marginBottom: 18 }}>
                Every dictation app I tried wanted something from me.
                A credit card. An email. An account. A subscription that auto-renewed
                at 2&nbsp;a.m. Sometimes it was my voice itself — shipped off to a server
                I was supposed to trust because the landing page said so.
              </p>

              <p style={{ marginBottom: 18 }}>
                I hit the same wall so many times I stopped dictating.
                I went back to typing, even when my wrists hurt, even when I
                had a long message to write, even when I knew it was slower. Paying
                $20 a month to talk to my own computer started to feel insulting.
              </p>

              <p style={{ marginBottom: 18 }}>
                So I opened an editor and started building the thing I actually
                wanted. Something that launches with a keystroke, runs on my own
                Mac, shuts up, and gets out of the way. Something I could open up,
                read, and understand. Something nobody could put behind a paywall
                six months from now.
              </p>

              <p style={{ marginBottom: 18 }}>
                <strong style={{ color: '#0A0A0A' }}>
                  Voxlit is that app.
                </strong>{' '}
                It is free and it will stay free. Every line of code — the app,
                the Swift helper, the Cloud server — is MIT licensed on GitHub.
                Local mode never opens a network socket. Cloud mode, if you choose
                it, uses <em>your</em> OpenAI key and talks to OpenAI directly,
                never through a server I own.
              </p>

              <p style={{ marginBottom: 0 }}>
                If Voxlit works for you, tell a friend. If it breaks, open
                an issue and I will fix it. If you want a feature, send a PR —
                I read every one. This project is small enough that a single
                message from you can actually change its direction. I hope
                you will speak up.
              </p>
            </div>

            {/* Signature */}
            <div
              style={{
                marginTop: 32,
                paddingTop: 20,
                borderTop: '2px dashed rgba(10,10,10,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '1.125rem',
                    color: '#0A0A0A',
                    letterSpacing: '-0.01em',
                  }}
                >
                  — Rajdeep Chaudhari
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: '#666',
                    letterSpacing: '0.02em',
                    marginTop: 4,
                  }}
                >
                  Maker of Voxlit · Building in public
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a
                  href="https://github.com/rajdeepchaudhari-work/voxlit/commits/main"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="trust-pill"
                  style={{ textDecoration: 'none', color: '#0A0A0A' }}
                >
                  Read every commit ↗
                </a>
                <a
                  href="https://github.com/rajdeepchaudhari-work/voxlit/issues/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="trust-pill"
                  style={{ textDecoration: 'none', color: '#0A0A0A' }}
                >
                  Tell me what is broken ↗
                </a>
              </div>
            </div>
          </div>

          {/* Craft notes strip */}
          <div
            className={`reveal delay-2${inView ? ' in-view' : ''}`}
            style={{
              marginTop: 32,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
            }}
          >
            {[
              {
                kicker: 'Two weeks',
                body: 'spent tuning the VAD so Voxlit does not cut you off mid-thought.',
              },
              {
                kicker: 'Three rewrites',
                body: 'of the text-injection layer before it felt invisible in every Mac app.',
              },
              {
                kicker: '47 issues',
                body: 'closed from friends, strangers, and one very patient designer on Reddit.',
              },
            ].map(item => (
              <div
                key={item.kicker}
                style={{
                  padding: 18,
                  border: '2px solid #0A0A0A',
                  background: '#FFFFFF',
                  boxShadow: '3px 3px 0px #0A0A0A',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#665DF5',
                    marginBottom: 6,
                  }}
                >
                  {item.kicker}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.8125rem',
                    lineHeight: 1.55,
                    color: '#333',
                  }}
                >
                  {item.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
