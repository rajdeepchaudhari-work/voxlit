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
      <div className="page-container">
        <div
          className={`reveal${inView ? ' in-view' : ''}`}
          style={{ maxWidth: 680, marginInline: 'auto' }}
        >
          <div className="overline" style={{ marginBottom: 14, color: '#665DF5' }}>
            A note from me
          </div>

          <h2
            className="section-heading"
            style={{ marginBottom: 28, lineHeight: 1.05 }}
          >
            I got tired of paying
            <br />
            to speak.
          </h2>

          <div
            style={{
              border: '3px solid #0A0A0A',
              background: '#FFFFFF',
              boxShadow: '6px 6px 0px #665DF5',
              padding: '36px 36px 30px',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '1.0625rem',
                lineHeight: 1.75,
                color: '#222',
              }}
            >
              <p style={{ marginBottom: 18 }}>
                Every dictation app I tried wanted something from me. A credit card.
                An account. A subscription that auto-renewed at 2&nbsp;a.m. Sometimes
                it was my voice itself, shipped off to a server I was asked to trust.
              </p>

              <p style={{ marginBottom: 18 }}>
                So one weekend I opened an editor and started building the thing I
                actually wanted. Launches with a keystroke. Runs on my own Mac. Gets
                out of the way.
              </p>

              <p style={{ marginBottom: 0 }}>
                Voxlit is free today and will stay free. Every line is on GitHub.
                If it works for you, send it to a friend. If it breaks, open an
                issue and I&rsquo;ll fix it.
              </p>
            </div>

            <div
              style={{
                marginTop: 28,
                paddingTop: 18,
                borderTop: '2px dashed rgba(10,10,10,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: '#0A0A0A',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Rajdeep Chaudhari
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6875rem',
                    color: '#666',
                    letterSpacing: '0.02em',
                    marginTop: 3,
                  }}
                >
                  Building Voxlit in public
                </div>
              </div>

              <a
                href="https://github.com/rajdeepchaudhari-work/voxlit"
                target="_blank"
                rel="noopener noreferrer"
                className="trust-pill"
                style={{ textDecoration: 'none', color: '#0A0A0A' }}
              >
                Read the code &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
