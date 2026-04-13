import { useInView } from '../hooks/useInView'

interface Signal {
  kicker: string
  heading: string
  body: string
  badge?: { src: string; alt: string; href: string }
  cta?: { label: string; href: string }
}

const REPO = 'rajdeepchaudhari-work/voxlit'
const BADGE_STYLE = 'style=flat-square'

const signals: Signal[] = [
  {
    kicker: '01 · Transparent',
    heading: 'MIT licensed.\nEvery line on GitHub.',
    body: 'No proprietary SDK. No hidden endpoints. Read the code, audit the build, fork if you want. The app, the Swift helper, and the cloud server are all public.',
    badge: {
      src: `https://img.shields.io/github/license/${REPO}?${BADGE_STYLE}&color=22D3EE&labelColor=0A0A0A`,
      alt: 'MIT License',
      href: `https://github.com/${REPO}/blob/main/LICENSE`,
    },
    cta: { label: 'View on GitHub →', href: `https://github.com/${REPO}` },
  },
  {
    kicker: '02 · Scanned',
    heading: 'CodeQL scans\nevery commit.',
    body: 'GitHub’s security analyzer runs on every push and PR using the security-extended query set. Vulnerabilities are surfaced publicly before they reach release.',
    badge: {
      src: `https://img.shields.io/github/actions/workflow/status/${REPO}/codeql.yml?${BADGE_STYLE}&label=CodeQL&color=00C853&labelColor=0A0A0A`,
      alt: 'CodeQL Status',
      href: `https://github.com/${REPO}/actions/workflows/codeql.yml`,
    },
  },
  {
    kicker: '03 · Scored',
    heading: 'Rated by\nOpenSSF.',
    body: 'Automated security posture scoring from the Open Source Security Foundation. Checks branch protection, dependency pinning, signed releases, maintenance activity, and more.',
    badge: {
      src: `https://api.securityscorecards.dev/projects/github.com/${REPO}/badge`,
      alt: 'OpenSSF Scorecard',
      href: `https://securityscorecards.dev/viewer/?uri=github.com/${REPO}`,
    },
  },
  {
    kicker: '04 · Reported',
    heading: 'Coordinated\ndisclosure policy.',
    body: 'Found a security issue? A documented policy with a 3-business-day acknowledgement, 90-day disclosure window, and credit in the changelog. PGP key on the security page.',
    cta: { label: 'Read SECURITY.md →', href: `https://github.com/${REPO}/blob/main/SECURITY.md` },
  },
]

export default function SecuritySignals() {
  const { ref, inView } = useInView()

  return (
    <section
      id="security"
      ref={ref as React.RefObject<HTMLElement>}
      style={{
        padding: '96px 0',
        borderBottom: '3px solid #0A0A0A',
        background: '#F5F0E8',
      }}
    >
      <div className="page-container">
        <div className={`reveal${inView ? ' in-view' : ''}`} style={{ marginBottom: 56, maxWidth: 680 }}>
          <div className="overline" style={{ marginBottom: 12 }}>Trust</div>
          <h2 className="section-heading">
            Verified by code,<br />
            not by marketing.
          </h2>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            color: '#333',
            marginTop: 16,
            lineHeight: 1.65,
          }}>
            No paid safety seals. No vague certifications. Just automated security checks,
            public audit history, and a coordinated disclosure policy. Every claim below
            is something you can verify yourself.
          </p>
        </div>

        <div
          className={`security-grid reveal delay-2${inView ? ' in-view' : ''}`}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gridAutoRows: '1fr',
            gap: 0,
            border: '3px solid #0A0A0A',
            boxShadow: '6px 6px 0px #0A0A0A',
            background: '#FFFFFF',
          }}
        >
          {signals.map((s, i) => (
            <div
              key={s.heading}
              style={{
                padding: 36,
                borderRight: i % 2 === 0 ? '3px solid #0A0A0A' : 'none',
                borderBottom: i < 2 ? '3px solid #0A0A0A' : 'none',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6875rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#665DF5',
                marginBottom: 16,
              }}>
                {s.kicker}
              </div>

              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '1.5rem',
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                color: '#0A0A0A',
                marginBottom: 14,
                whiteSpace: 'pre-line',
              }}>
                {s.heading}
              </h3>

              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.9375rem',
                lineHeight: 1.7,
                color: '#333',
                flex: 1,
              }}>
                {s.body}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
                {s.badge && (
                  <a href={s.badge.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                    <img src={s.badge.src} alt={s.badge.alt} height={20} style={{ display: 'block' }} />
                  </a>
                )}
                {s.cta && (
                  <a href={s.cta.href} target="_blank" rel="noopener noreferrer" style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    color: '#665DF5',
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                  }}>
                    {s.cta.label}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 760px) {
          .security-grid {
            grid-template-columns: 1fr !important;
            grid-auto-rows: auto !important;
          }
          .security-grid > div {
            border-right: none !important;
            border-bottom: 3px solid #0A0A0A !important;
          }
          .security-grid > div:last-child {
            border-bottom: none !important;
          }
        }
      `}</style>
    </section>
  )
}
