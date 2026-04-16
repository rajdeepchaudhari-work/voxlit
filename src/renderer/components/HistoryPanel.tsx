import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { ipc } from '../lib/ipc'
import { formatDate, formatDuration } from '../lib/utils'
import type { Entry } from '@shared/ipc-types'

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
    if (expandedId === sessionId) { setExpandedId(null); return }
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
    await navigator.clipboard.writeText(data.map((en) => en.rawText).join('\n\n'))
  }

  if (!sessionsLoaded) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFDF7' }}>
        <span style={{ color: '#666', fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>LOADING…</span>
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 40px', background: '#FFFDF7' }}>
        <div style={{ border: '3px solid #0A0A0A', padding: '32px 40px', boxShadow: '6px 6px 0px #0A0A0A', background: '#FFFFFF', textAlign: 'center' }}>
          <p style={{ color: '#0A0A0A', fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', margin: 0 }}>
            NO TRANSCRIPTIONS YET
          </p>
          <p style={{ color: '#666', fontSize: 10, fontFamily: 'var(--font-mono)', margin: '8px 0 0' }}>
            press your hotkey to start dictating
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#FFFDF7' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 14px', borderBottom: '3px solid #0A0A0A', background: '#FFFFFF' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
          History
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 10, color: '#666', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
          {sessions.length} SESSION{sessions.length !== 1 ? 'S' : ''}
        </p>
      </div>

      {sessions.map((session, si) => {
        const isExpanded = expandedId === session.id
        const sessionEntries = entries[session.id] ?? []
        const isDel = deleting === session.id
        const model = session.model ?? 'unknown'
        const isCloud = !model.startsWith('ggml')
        const modelLabel =
          model === 'voxlit-cloud' ? 'Cloud' :
          model === 'whisper-1'    ? 'OpenAI' :
          model === 'unknown'      ? 'Cloud' :
          model.startsWith('ggml') ? model.replace('ggml-', '').replace('.en', '').toUpperCase() :
          model

        return (
          <div key={session.id} style={{ borderBottom: '2px solid #0A0A0A' }}>
            {/* Session row */}
            <div
              onClick={() => toggleExpand(session.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 20px',
                cursor: 'pointer',
                background: isExpanded ? '#FFEB3B' : si % 2 === 0 ? '#FFFFFF' : '#F5F0E8',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = '#EDE8DE' }}
              onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = si % 2 === 0 ? '#FFFFFF' : '#F5F0E8' }}
            >
              {/* Chevron */}
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
                color: '#0A0A0A', flexShrink: 0,
                transform: isExpanded ? 'rotate(90deg)' : 'none',
                display: 'inline-block', transition: 'transform 0.1s',
                width: 12
              }}>▶</span>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#0A0A0A', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {formatDate(session.startedAt)}
                </div>
                <div style={{ fontSize: 10, color: '#666', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                  {session.entryCount} {session.entryCount === 1 ? 'ENTRY' : 'ENTRIES'} · {session.totalWords} WORDS
                </div>
              </div>

              {/* Model badge */}
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: isCloud ? '#0A0A0A' : '#665DF5',
                background: isCloud ? '#FFEB3B' : 'rgba(102,93,245,0.1)',
                border: `2px solid ${isCloud ? '#0A0A0A' : '#665DF5'}`,
                padding: '2px 6px', flexShrink: 0
              }}>
                {modelLabel}
              </span>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => copyEntries(session.id, e)}
                  title="Copy"
                  style={{
                    background: 'transparent', border: '2px solid #0A0A0A',
                    cursor: 'pointer', padding: '3px 6px',
                    fontFamily: 'var(--font-mono)', fontSize: 9,
                    fontWeight: 700, letterSpacing: '0.06em',
                    transition: 'background 0.1s, color 0.1s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#0A0A0A'; e.currentTarget.style.color = '#FFFFFF' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#0A0A0A' }}
                >
                  COPY
                </button>
                <button
                  onClick={(e) => deleteSession(session.id, e)}
                  disabled={isDel}
                  title="Delete"
                  style={{
                    background: 'transparent', border: '2px solid #FF1744',
                    cursor: isDel ? 'not-allowed' : 'pointer',
                    padding: '3px 6px',
                    fontFamily: 'var(--font-mono)', fontSize: 9,
                    fontWeight: 700, letterSpacing: '0.06em',
                    color: '#FF1744',
                    opacity: isDel ? 0.4 : 1,
                    transition: 'background 0.1s, color 0.1s'
                  }}
                  onMouseEnter={(e) => { if (!isDel) { e.currentTarget.style.background = '#FF1744'; e.currentTarget.style.color = '#FFFFFF' } }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#FF1744' }}
                >
                  DEL
                </button>
              </div>
            </div>

            {/* Entries */}
            {isExpanded && (
              <div style={{ borderTop: '2px solid #0A0A0A', background: '#F5F0E8' }}>
                {sessionEntries.length === 0 ? (
                  <div style={{ padding: '12px 48px', color: '#666', fontSize: 10, fontFamily: 'var(--font-mono)' }}>LOADING…</div>
                ) : (
                  sessionEntries.map((entry, ei) => (
                    <div
                      key={entry.id}
                      style={{
                        padding: '12px 20px 12px 44px',
                        borderBottom: ei < sessionEntries.length - 1 ? '1px solid rgba(10,10,10,0.12)' : 'none',
                      }}
                    >
                      <p style={{
                        margin: 0,
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12, color: '#0A0A0A', lineHeight: 1.6
                      }}>
                        {entry.rawText}
                      </p>
                      <div style={{ display: 'flex', gap: 12, marginTop: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 9, color: '#666', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                          {formatDate(entry.createdAt)}
                        </span>
                        {entry.durationMs != null && (
                          <span style={{ fontSize: 9, color: '#666', fontFamily: 'var(--font-mono)' }}>
                            {formatDuration(entry.durationMs)}
                          </span>
                        )}
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                          color: entry.engine === 'cloud' ? '#0A0A0A' : '#665DF5',
                          background: entry.engine === 'cloud' ? '#FFEB3B' : 'rgba(102,93,245,0.1)',
                          border: `1.5px solid ${entry.engine === 'cloud' ? '#0A0A0A' : '#665DF5'}`,
                          padding: '1px 5px', fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase'
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
