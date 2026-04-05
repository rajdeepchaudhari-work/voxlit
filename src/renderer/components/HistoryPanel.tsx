import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { ipc } from '../lib/ipc'
import type { Entry } from '@shared/ipc-types'

function formatDate(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const isYesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString()

  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  if (isToday) return `Today, ${time}`
  if (isYesterday) return `Yesterday, ${time}`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + `, ${time}`
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export default function HistoryPanel() {
  const sessions = useAppStore((s) => s.sessions)
  const sessionsLoaded = useAppStore((s) => s.sessionsLoaded)
  const loadSessions = useAppStore((s) => s.loadSessions)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [entries, setEntries] = useState<Record<string, Entry[]>>({})
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionsLoaded) loadSessions()
  }, [])

  async function toggleExpand(sessionId: string) {
    if (expandedId === sessionId) {
      setExpandedId(null)
      return
    }
    setExpandedId(sessionId)
    if (!entries[sessionId]) {
      const data = await ipc.getEntries(sessionId)
      setEntries((prev) => ({ ...prev, [sessionId]: data }))
    }
  }

  async function deleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setDeleting(id)
    await ipc.deleteSession(id)
    await loadSessions()
    if (expandedId === id) setExpandedId(null)
    setDeleting(null)
  }

  async function copyEntries(sessionId: string, e: React.MouseEvent) {
    e.stopPropagation()
    let data = entries[sessionId]
    if (!data) {
      data = await ipc.getEntries(sessionId)
      setEntries((prev) => ({ ...prev, [sessionId]: data }))
    }
    const text = data.map((en) => en.rawText).join('\n\n')
    await navigator.clipboard.writeText(text)
  }

  if (!sessionsLoaded) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#5A5578', fontSize: 13 }}>Loading…</span>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 40px' }}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" opacity={0.3}>
          <rect x="8" y="14" width="5" height="12" rx="2.5" fill="#A78BFA" />
          <rect x="17.5" y="8" width="5" height="24" rx="2.5" fill="#A78BFA" />
          <rect x="27" y="14" width="5" height="12" rx="2.5" fill="#A78BFA" />
        </svg>
        <p style={{ color: '#5A5578', fontSize: 14, textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
          No transcriptions yet.
        </p>
        <p style={{ color: '#3A3458', fontSize: 12, textAlign: 'center', margin: 0 }}>
          Press your hotkey to start dictating.
        </p>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
      {sessions.map((session) => {
        const isExpanded = expandedId === session.id
        const sessionEntries = entries[session.id] ?? []
        const isDel = deleting === session.id

        return (
          <div key={session.id}>
            {/* Session row */}
            <div
              onClick={() => toggleExpand(session.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 20px',
                cursor: 'pointer',
                background: isExpanded ? 'rgba(124,58,237,0.06)' : 'transparent',
                borderLeft: isExpanded ? '2px solid #7C3AED' : '2px solid transparent',
                transition: 'background 120ms ease, border-color 120ms ease',
              }}
            >
              {/* Expand chevron */}
              <svg
                width="12" height="12" viewBox="0 0 12 12" fill="none"
                style={{ flexShrink: 0, transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms ease', opacity: 0.4 }}
              >
                <path d="M4 2.5l4 3.5-4 3.5" stroke="#F0EEFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#F0EEFF', fontWeight: 500 }}>{formatDate(session.startedAt)}</div>
                <div style={{ fontSize: 11, color: '#5A5578', marginTop: 2 }}>
                  {session.entryCount} {session.entryCount === 1 ? 'entry' : 'entries'} · {session.totalWords} words
                </div>
              </div>

              {/* Model badge */}
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: '#5A5578',
                background: '#1A1A26',
                border: '1px solid #2E2E4A',
                borderRadius: 4,
                padding: '2px 6px',
                flexShrink: 0
              }}>
                {session.model}
              </span>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => copyEntries(session.id, e)}
                  title="Copy transcript"
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    padding: '4px', borderRadius: 4, color: '#5A5578',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <rect x="5" y="5" width="9" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M3 11H2a1 1 0 01-1-1V2a1 1 0 011-1h8a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  onClick={(e) => deleteSession(session.id, e)}
                  disabled={isDel}
                  title="Delete session"
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    padding: '4px', borderRadius: 4, color: isDel ? '#3A3458' : '#5A5578',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9a1 1 0 001 1h6a1 1 0 001-1l1-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Entries */}
            {isExpanded && (
              <div style={{ background: '#0D0D14', borderBottom: '1px solid #1A1A26' }}>
                {sessionEntries.length === 0 ? (
                  <div style={{ padding: '12px 52px', color: '#3A3458', fontSize: 12 }}>Loading…</div>
                ) : (
                  sessionEntries.map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        padding: '10px 52px 10px 52px',
                        borderBottom: '1px solid rgba(46,46,74,0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4
                      }}
                    >
                      <p style={{
                        margin: 0,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 12,
                        color: '#C4BFDF',
                        lineHeight: 1.6
                      }}>
                        {entry.rawText}
                      </p>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: '#3A3458' }}>{formatDate(entry.createdAt)}</span>
                        {entry.durationMs != null && (
                          <span style={{ fontSize: 10, color: '#3A3458' }}>{formatDuration(entry.durationMs)}</span>
                        )}
                        <span style={{
                          fontSize: 10,
                          color: entry.engine === 'cloud' ? '#22D3EE' : '#7C3AED',
                          fontFamily: "'JetBrains Mono', monospace"
                        }}>
                          {entry.engine}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
