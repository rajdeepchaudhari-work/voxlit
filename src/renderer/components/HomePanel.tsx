import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { formatDate, formatMinutes } from '../lib/utils'

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{
      flex: 1,
      background: accent ?? '#FFFFFF',
      border: '3px solid #0A0A0A',
      boxShadow: '4px 4px 0px #0A0A0A',
      padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 4
    }}>
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: '#666',
        fontFamily: 'var(--font-mono)'
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em',
        color: '#0A0A0A', lineHeight: 1,
        fontFamily: 'var(--font-mono)'
      }}>
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: 10, color: '#666', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
          {sub}
        </span>
      )}
    </div>
  )
}

export default function HomePanel({ onNavigateHistory }: { onNavigateHistory: () => void }) {
  const sessions = useAppStore((s) => s.sessions)
  const sessionsLoaded = useAppStore((s) => s.sessionsLoaded)
  const loadSessions = useAppStore((s) => s.loadSessions)
  const stats = useAppStore((s) => s.stats)

  useEffect(() => {
    if (!sessionsLoaded) loadSessions()
  }, [])

  const recent = sessions.slice(0, 5)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 28px 48px', background: '#FFFDF7' }}>

      {/* Header */}
      <div style={{ marginBottom: 28, borderBottom: '3px solid #0A0A0A', paddingBottom: 16 }}>
        <h1 style={{
          fontSize: 28, fontWeight: 700, color: '#0A0A0A',
          margin: 0, letterSpacing: '-0.03em',
          fontFamily: 'var(--font-mono)', textTransform: 'uppercase'
        }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 11, color: '#666', margin: '6px 0 0', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
          PRESS HOTKEY TO START DICTATING
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 36 }}>
        <StatCard
          label="Time Saved"
          value={stats ? formatMinutes(stats.totalMinutes) : '—'}
          sub="TOTAL RECORDED"
          accent="#FFEB3B"
        />
        <StatCard
          label="Speed"
          value={stats && stats.wordsPerMinute > 0 ? `${stats.wordsPerMinute}` : '—'}
          sub="WORDS / MIN"
        />
        <StatCard
          label="Streak"
          value={stats ? `${stats.dayStreak}` : '—'}
          sub={stats && stats.dayStreak === 1 ? 'DAY' : 'DAYS'}
          accent="rgba(102,93,245,0.12)"
        />
      </div>

      {/* Recent transcriptions */}
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 12
        }}>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: '#666',
            fontFamily: 'var(--font-mono)'
          }}>
            Recent Transcriptions
          </span>
          {sessions.length > 5 && (
            <button
              onClick={onNavigateHistory}
              style={{
                background: 'transparent',
                border: '2px solid #0A0A0A',
                cursor: 'pointer',
                fontSize: 9, color: '#0A0A0A',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                letterSpacing: '0.08em',
                padding: '3px 8px',
                textTransform: 'uppercase',
                transition: 'background 0.1s, color 0.1s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#0A0A0A'; e.currentTarget.style.color = '#FFFFFF' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#0A0A0A' }}
            >
              View all →
            </button>
          )}
        </div>

        {!sessionsLoaded ? (
          <div style={{ padding: '20px 0', color: '#666', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            LOADING…
          </div>
        ) : recent.length === 0 ? (
          <div style={{
            border: '3px solid #0A0A0A',
            padding: '36px 24px',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 10,
            background: '#FFFFFF',
            boxShadow: '4px 4px 0px #0A0A0A'
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <polyline points="4,10 16,24 28,10" fill="none" stroke="#0A0A0A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.2"/>
            </svg>
            <p style={{ margin: 0, fontSize: 12, color: '#0A0A0A', fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.06em' }}>
              NO TRANSCRIPTIONS YET
            </p>
            <p style={{ margin: 0, fontSize: 10, color: '#666', fontFamily: 'var(--font-mono)' }}>
              press your hotkey and start speaking
            </p>
          </div>
        ) : (
          <div style={{ border: '3px solid #0A0A0A', boxShadow: '4px 4px 0px #0A0A0A', background: '#FFFFFF' }}>
            {recent.map((session, idx) => (
              <div
                key={session.id}
                onClick={onNavigateHistory}
                style={{
                  padding: '12px 16px',
                  borderBottom: idx < recent.length - 1 ? '2px solid #0A0A0A' : 'none',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: '#FFFFFF',
                  transition: 'background 0.1s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F0E8')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: '#0A0A0A', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    {formatDate(session.startedAt)}
                  </div>
                  <div style={{ fontSize: 10, color: '#666', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                    {session.entryCount} {session.entryCount === 1 ? 'entry' : 'entries'} · {session.totalWords} words
                  </div>
                </div>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: session.model?.startsWith('ggml') ? '#665DF5' : '#0A0A0A',
                  background: session.model?.startsWith('ggml') ? 'rgba(102,93,245,0.1)' : '#FFEB3B',
                  border: `2px solid ${session.model?.startsWith('ggml') ? '#665DF5' : '#0A0A0A'}`,
                  padding: '2px 6px', flexShrink: 0
                }}>
                  {session.model ?? 'local'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
