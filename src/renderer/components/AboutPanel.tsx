import { useEffect, useState } from 'react'
import { ipc } from '../lib/ipc'

const GITHUB_USER = 'RajdeepChaudhari'
const GITHUB_PROFILE = `https://github.com/${GITHUB_USER}`
const REPO = 'rajdeepchaudhari-work/voxlit'
const REPO_URL = `https://github.com/${REPO}`

// github.com/{user}.png redirects to the actual avatar CDN URL — works without
// an API call AND tolerates the user changing their photo. The avatars
// subdomain only accepts numeric user IDs, not usernames, so we can't hit it
// directly from a static URL.
const AVATAR_URL = `https://github.com/${GITHUB_USER}.png?size=240`

interface GitHubProfile {
  name?: string | null
  bio?: string | null
  blog?: string | null
  location?: string | null
  twitter_username?: string | null
  followers?: number
  public_repos?: number
  avatar_url?: string | null
}

export default function AboutPanel() {
  const [version, setVersion] = useState<string>('')
  const [profile, setProfile] = useState<GitHubProfile | null>(null)

  useEffect(() => {
    ipc.getAppVersion().then(setVersion)

    // Best-effort fetch of live profile data. Falls back to static info.
    // 5s timeout so a flaky network never hangs the panel.
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    fetch(`https://api.github.com/users/${GITHUB_USER}`, { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then((p: GitHubProfile | null) => p && setProfile(p))
      .catch(() => { /* offline / blocked / rate-limited — fine, we have defaults */ })
      .finally(() => clearTimeout(timer))
  }, [])

  const displayName = profile?.name ?? 'Rajdeep Chaudhari'
  const bio = profile?.bio ?? 'Building privacy-first developer tools. Voxlit is the latest one — voice dictation that runs entirely on your Mac.'
  // Prefer the API's canonical avatar URL (skips one redirect), fall back to
  // the predictable username-based URL if the API call hasn't landed yet.
  const avatarSrc = profile?.avatar_url ?? AVATAR_URL

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#FFFDF7' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 14px', borderBottom: '3px solid #0A0A0A', background: '#FFFFFF' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
          About
        </h2>
      </div>

      <div style={{ padding: '24px 20px', maxWidth: 640 }}>

        {/* ── Developer card ────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: 20, padding: 20,
          background: '#FFFFFF',
          border: '3px solid #0A0A0A',
          boxShadow: '6px 6px 0px #665DF5',
          marginBottom: 28,
        }}>
          <div style={{ flexShrink: 0 }}>
            <img
              src={avatarSrc}
              alt={displayName}
              width={96}
              height={96}
              referrerPolicy="no-referrer"
              style={{
                display: 'block',
                width: 96, height: 96,
                border: '2.5px solid #0A0A0A',
                boxShadow: '3px 3px 0px #0A0A0A',
                objectFit: 'cover',
              }}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.12em', color: '#665DF5', marginBottom: 4,
            }}>
              MAINTAINED BY
            </div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700,
              letterSpacing: '-0.02em', color: '#0A0A0A', lineHeight: 1.1,
            }}>
              {displayName}
            </div>
            <div style={{
              marginTop: 8,
              fontFamily: 'var(--font-body, system-ui)', fontSize: 13,
              color: '#444', lineHeight: 1.55,
            }}>
              {bio}
            </div>

            {/* Profile stats — only shown if API responded */}
            {profile && (
              <div style={{ marginTop: 12, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {profile.location && <Stat label="Location" value={profile.location} />}
                {typeof profile.public_repos === 'number' && <Stat label="Repos" value={String(profile.public_repos)} />}
                {typeof profile.followers === 'number' && <Stat label="Followers" value={String(profile.followers)} />}
              </div>
            )}

            {/* Social links */}
            <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <SocialLink href={GITHUB_PROFILE} label="GitHub" />
              {profile?.twitter_username && (
                <SocialLink href={`https://twitter.com/${profile.twitter_username}`} label={`@${profile.twitter_username}`} />
              )}
              {profile?.blog && (
                <SocialLink href={profile.blog.startsWith('http') ? profile.blog : `https://${profile.blog}`} label="Website" />
              )}
            </div>
          </div>
        </div>

        {/* ── App info ──────────────────────────────────────────────────── */}
        <SectionLabel>App</SectionLabel>
        <InfoCard>
          <Row label="Version" value={version ? `v${version}` : '…'} />
          <Row label="License" value="MIT" />
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
