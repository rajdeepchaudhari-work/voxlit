import { useEffect, useState } from 'react'
import { ipc } from '../lib/ipc'

const REPO = 'rajdeepchaudhari-work/voxlit'
const REPO_URL = `https://github.com/${REPO}`
const EAGER_HQ_URL = 'https://eagerhq.com'

export default function AboutPanel() {
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    ipc.getAppVersion().then(setVersion)
  }, [])

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#FFFDF7' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 14px', borderBottom: '3px solid #0A0A0A', background: '#FFFFFF' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
          About
        </h2>
      </div>

      <div style={{ padding: '24px 20px', maxWidth: 640 }}>

        {/* ── Organization card ─────────────────────────────────────────── */}
        <div style={{
          padding: 24,
          background: '#FFFFFF',
          border: '3px solid #0A0A0A',
          boxShadow: '6px 6px 0px #665DF5',
          marginBottom: 28,
        }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
            letterSpacing: '-0.02em', color: '#0A0A0A', lineHeight: 1.05,
          }}>
            Voxlit
          </div>
          <div style={{
            marginTop: 10,
            fontFamily: 'var(--font-body, system-ui)', fontSize: 13,
            color: '#444', lineHeight: 1.55,
          }}>
            Privacy-first voice dictation for macOS. Open source, offline-capable, built for developers.
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <Stat label="Copyright" value="© 2026 Eager HQ" />
            <Stat label="Maintained by" value="Rajdeep Chaudhari" />
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <SocialLink href={EAGER_HQ_URL} label="Eager HQ" />
            <SocialLink href={REPO_URL} label="GitHub" />
          </div>
        </div>

        {/* ── App info ──────────────────────────────────────────────────── */}
        <SectionLabel>App</SectionLabel>
        <InfoCard>
          <Row label="Version" value={version ? `v${version}` : '…'} />
          <Row label="License" value="MIT" />
          <Row label="Publisher" value="Eager HQ" link={EAGER_HQ_URL} />
          <Row label="Source" value="github.com/rajdeepchaudhari-work/voxlit" link={REPO_URL} />
          <Row label="Issues" value="Report a bug or request a feature" link={`${REPO_URL}/issues/new`} />
          <Row label="Releases" value="See changelog and downloads" link={`${REPO_URL}/releases`} />
        </InfoCard>

        {/* ── Built with ────────────────────────────────────────────────── */}
        <SectionLabel>Built with</SectionLabel>
        <InfoCard>
          <Row label="Whisper" value="OpenAI's open-source ASR via whisper.cpp" link="https://github.com/ggerganov/whisper.cpp" />
          <Row label="Electron" value="Cross-platform shell" link="https://www.electronjs.org" />
          <Row label="Swift" value="Native macOS helper for hotkey + audio + paste" link="https://developer.apple.com/swift" />
          <Row label="React + TypeScript" value="Renderer UI" link="https://react.dev" />
        </InfoCard>

        {/* ── Acknowledgements ──────────────────────────────────────────── */}
        <SectionLabel>Acknowledgements</SectionLabel>
        <div style={{
          padding: '16px 20px',
          background: '#FFEB3B',
          border: '2px solid #0A0A0A',
          boxShadow: '3px 3px 0px #0A0A0A',
          fontFamily: 'var(--font-body, system-ui)', fontSize: 13, lineHeight: 1.55,
          color: '#0A0A0A',
        }}>
          Voxlit stands on the shoulders of <strong>Georgi Gerganov</strong>'s whisper.cpp work and OpenAI's open Whisper model release. None of this would be possible without them.
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', color: '#888', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#0A0A0A', marginTop: 1 }}>
        {value}
      </div>
    </div>
  )
}

function SocialLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '4px 10px',
        background: '#FFFDF7',
        border: '1.5px solid #0A0A0A',
        boxShadow: '2px 2px 0px #0A0A0A',
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
        color: '#0A0A0A', textDecoration: 'none', letterSpacing: '0.04em',
      }}
    >
      {label} ↗
    </a>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
      letterSpacing: '0.12em', color: '#665DF5',
      textTransform: 'uppercase',
      marginTop: 28, marginBottom: 8,
    }}>
      {children}
    </div>
  )
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '2px solid #0A0A0A',
      boxShadow: '3px 3px 0px #0A0A0A',
      overflow: 'hidden',
    }}>
      {children}
    </div>
  )
}

function Row({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '10px 16px',
      borderBottom: '1px solid rgba(10,10,10,0.1)',
      gap: 14,
    }}>
      <div style={{
        flexShrink: 0, width: 84,
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
        letterSpacing: '0.06em', color: '#666', textTransform: 'uppercase',
      }}>
        {label}
      </div>
      <div style={{
        flex: 1, minWidth: 0,
        fontFamily: 'var(--font-mono)', fontSize: 12, color: '#0A0A0A',
        wordBreak: 'break-word',
      }}>
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer"
            style={{ color: '#665DF5', textDecoration: 'underline', textUnderlineOffset: 2 }}>
            {value}
          </a>
        ) : value}
      </div>
    </div>
  )
}
