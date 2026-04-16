const LOGO_TOKEN = 'pk_GR7cSmNQQ4qY0miVd120KA'

// 26 visually distinct apps — no duplicate logo designs
const apps = [
  { name: 'Notion',     domain: 'notion.so' },
  { name: 'Slack',      domain: 'slack.com' },
  { name: 'VS Code',    domain: 'code.visualstudio.com' },
  { name: 'GitHub',     domain: 'github.com' },
  { name: 'Figma',      domain: 'figma.com' },
  { name: 'WhatsApp',   domain: 'whatsapp.com' },
  { name: 'Gmail',      domain: 'gmail.com' },
  { name: 'Zoom',       domain: 'zoom.us' },
  { name: 'Discord',    domain: 'discord.com' },
  { name: 'Linear',     domain: 'linear.app' },
  { name: 'X',          domain: 'x.com' },
  { name: 'Obsidian',   domain: 'obsidian.md' },
  { name: 'Arc',        domain: 'arc.net' },
  { name: 'Raycast',    domain: 'raycast.com' },
  { name: 'Todoist',    domain: 'todoist.com' },
  { name: 'Airtable',   domain: 'airtable.com' },
  { name: 'Miro',       domain: 'miro.com' },
  { name: 'Loom',       domain: 'loom.com' },
  { name: 'Dropbox',    domain: 'dropbox.com' },
  { name: 'Grammarly',  domain: 'grammarly.com' },
  { name: 'Craft',      domain: 'craft.do' },
  { name: 'Spotify',    domain: 'spotify.com' },
  { name: 'Jira',       domain: 'atlassian.com' },
  { name: 'Superhuman', domain: 'superhuman.com' },
]

// Each cell 80px wide — 24 apps × 80px = 1920px per set, wider than any viewport
const CELL_W = 80

function logoUrl(domain: string) {
  return `https://img.logo.dev/${domain}?token=${LOGO_TOKEN}&size=64`
}

export default function AppLogoStrip() {
  const items = [...apps, ...apps]

  return (
    <div style={{
      borderBottom: '3px solid #0A0A0A',
      background: '#000000',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'stretch',
        borderLeft: '3px solid #222',
        borderRight: '3px solid #222',
      }}>

        {/* Fixed label */}
        <div style={{
          flexShrink: 0,
          padding: '0 20px 0 0',
          borderRight: '2px solid #252525',
          display: 'flex',
          alignItems: 'center',
          marginRight: 0,
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.5625rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#665DF5',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            whiteSpace: 'nowrap',
          }}>
            <span style={{ width: 5, height: 5, background: '#665DF5', flexShrink: 0, display: 'inline-block' }} />
            Works in the apps<br />you already use
          </span>
        </div>

        {/* Scrolling track */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', position: 'relative' }}>

          {/* Left fade */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 32,
            background: 'linear-gradient(to right, #000000, transparent)',
            zIndex: 2, pointerEvents: 'none',
          }} />

          <div
            className="logo-marquee-track"
            style={{ display: 'flex', alignItems: 'center', width: 'max-content' }}
          >
            {items.map((app, i) => (
              <div
                key={`${app.domain}-${i}`}
                title={app.name}
                style={{
                  flexShrink: 0,
                  width: CELL_W,
                  height: 64,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRight: '1px solid #1E1E1E',
                }}
              >
                <img
                  src={logoUrl(app.domain)}
                  alt={app.name}
                  width={32}
                  height={32}
                  style={{
                    width: 32,
                    height: 32,
                    objectFit: 'contain',
                    filter: 'grayscale(1) invert(1) brightness(1.2)',
                    opacity: 1,
                  }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              </div>
            ))}
          </div>

          {/* Right fade */}
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: 32,
            background: 'linear-gradient(to left, #000000, transparent)',
            zIndex: 2, pointerEvents: 'none',
          }} />
        </div>
      </div>

      <style>{`
        .logo-marquee-track {
          animation: logo-scroll ${apps.length * 2}s linear infinite;
        }
        .logo-marquee-track:hover {
          animation-play-state: paused;
        }
        @keyframes logo-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-${apps.length * CELL_W}px); }
        }
      `}</style>
    </div>
  )
}
