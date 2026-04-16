import { useState } from 'react'
import { useScrollSpy, useNavScrolled } from '../hooks/useScrollSpy'

const GITHUB_URL = 'https://github.com/rajdeepchaudhari-work/voxlit'

export default function Nav() {
  const activeSection = useScrollSpy(['agent', 'features', 'how-it-works', 'compare', 'faq', 'install-guide'])
  const isScrolled = useNavScrolled()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 100,
      borderBottom: '3px solid #0A0A0A',
      background: isScrolled ? 'rgba(255,253,247,0.97)' : '#FFFDF7',
      backdropFilter: isScrolled ? 'blur(8px)' : 'none',
      transition: 'background 0.1s',
    }}>
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
        {/* Logo */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img
            src="/logo.png"
            alt="Voxlit"
            width={32}
            height={32}
            style={{ borderRadius: 7, display: 'block', border: '2px solid #0A0A0A' }}
          />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: '1rem',
            letterSpacing: '0.04em',
            color: '#0A0A0A',
            textTransform: 'uppercase',
          }}>VOXLIT</span>
        </a>

        {/* Desktop Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} className="desktop-nav">
          {[
            { label: 'Agent', href: '#agent', id: 'agent' },
            { label: 'Features', href: '#features', id: 'features' },
            { label: 'How It Works', href: '#how-it-works', id: 'how-it-works' },
            { label: 'Install', href: '#install-guide', id: 'install-guide' },
            { label: 'GitHub', href: GITHUB_URL, id: '' },
          ].map(link => {
            const isActive = activeSection === link.id && link.id !== ''
            return (
              <a
                key={link.label}
                href={link.href}
                target={link.id === '' ? '_blank' : undefined}
                rel={link.id === '' ? 'noopener noreferrer' : undefined}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  padding: '8px 14px',
                  border: '2px solid transparent',
                  color: isActive ? '#FFFFFF' : '#0A0A0A',
                  background: isActive ? '#665DF5' : 'transparent',
                  borderColor: isActive ? '#665DF5' : 'transparent',
                  transition: 'background 0.1s, color 0.1s, border-color 0.1s',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = '#F5F0E8'
                    el.style.borderColor = '#0A0A0A'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = 'transparent'
                    el.style.borderColor = 'transparent'
                  }
                }}
              >
                {link.label}
              </a>
            )
          })}
          <a href="#download" className="btn-primary" style={{ padding: '9px 20px', fontSize: '0.75rem', marginLeft: 8 }}>
            Download
          </a>
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="mobile-menu-btn"
          aria-label="Toggle menu"
          style={{
            display: 'none',
            background: 'none',
            border: '2px solid #0A0A0A',
            padding: '6px',
            cursor: 'pointer',
            color: '#0A0A0A',
          }}
        >
          <HamburgerIcon open={menuOpen} />
        </button>
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div style={{
          borderTop: '3px solid #0A0A0A',
          background: '#FFFFFF',
          padding: '12px 24px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}>
          {[
            { label: 'Agent', href: '#agent' },
            { label: 'Features', href: '#features' },
            { label: 'How It Works', href: '#how-it-works' },
            { label: 'Install', href: '#install-guide' },
            { label: 'GitHub', href: GITHUB_URL },
          ].map(link => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontSize: '0.875rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                padding: '12px 0',
                borderBottom: '2px solid #0A0A0A',
                color: '#0A0A0A',
              }}
            >
              {link.label}
            </a>
          ))}
          <a href="#download" className="btn-primary" style={{ marginTop: 16, textAlign: 'center' }}>
            Download
          </a>
        </div>
      )}


    </nav>
  )
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      {open ? (
        <>
          <line x1="3" y1="3" x2="17" y2="17" stroke="currentColor" strokeWidth="2.5" />
          <line x1="17" y1="3" x2="3" y2="17" stroke="currentColor" strokeWidth="2.5" />
        </>
      ) : (
        <>
          <line x1="2" y1="5" x2="18" y2="5" stroke="currentColor" strokeWidth="2.5" />
          <line x1="2" y1="10" x2="18" y2="10" stroke="currentColor" strokeWidth="2.5" />
          <line x1="2" y1="15" x2="18" y2="15" stroke="currentColor" strokeWidth="2.5" />
        </>
      )}
    </svg>
  )
}
