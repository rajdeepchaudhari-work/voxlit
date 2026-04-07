import { useEffect, useState } from 'react'
import { ipc } from '../lib/ipc'

export default function UpdateBanner() {
  const [downloaded, setDownloaded] = useState<{ version: string } | null>(null)
  const [available, setAvailable] = useState<{ version: string } | null>(null)
  const [installing, setInstalling] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const offAvailable = ipc.onUpdateAvailable((info) => setAvailable(info))
    const offDownloaded = ipc.onUpdateDownloaded((info) => setDownloaded(info))
    return () => { offAvailable(); offDownloaded() }
  }, [])

  if (dismissed) return null

  if (downloaded) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: 'rgba(124,58,237,0.12)',
        borderBottom: '1px solid rgba(124,58,237,0.3)',
        fontFamily: "'Inter', sans-serif",
        fontSize: 13,
        color: '#F0EEFF',
        gap: 12,
      }}>
        <span>
          <span style={{ color: '#A78BFA', fontWeight: 600 }}>Voxlit {downloaded.version}</span>
          {' '}is downloaded and ready to install.
        </span>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setDismissed(true)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(124,58,237,0.4)',
              borderRadius: 6,
              padding: '3px 10px',
              color: '#A78BFA',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Later
          </button>
          <button
            onClick={async () => { setInstalling(true); await ipc.installUpdate() }}
            disabled={installing}
            style={{
              background: '#7C3AED',
              border: 'none',
              borderRadius: 6,
              padding: '3px 12px',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: installing ? 'default' : 'pointer',
              opacity: installing ? 0.7 : 1,
            }}
          >
            {installing ? 'Restarting…' : 'Restart & Update'}
          </button>
        </div>
      </div>
    )
  }

  if (available) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: 'rgba(34,211,238,0.06)',
        borderBottom: '1px solid rgba(34,211,238,0.2)',
        fontFamily: "'Inter', sans-serif",
        fontSize: 13,
        color: '#94A3B8',
        gap: 12,
      }}>
        <span>
          <span style={{ color: '#22D3EE', fontWeight: 600 }}>Voxlit {available.version}</span>
          {' '}is available — downloading in the background…
        </span>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748B',
            fontSize: 18,
            lineHeight: 1,
            cursor: 'pointer',
            padding: '0 4px',
          }}
        >
          ×
        </button>
      </div>
    )
  }

  return null
}
