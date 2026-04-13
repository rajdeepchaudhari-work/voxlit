import { useEffect, useState } from 'react'
import { ipc } from '../lib/ipc'
import { VoxlitMark } from './App'
import type { BootState, BootStep } from '@shared/ipc-types'

const ICON: Record<BootStep['status'], string> = {
  pending: '·',
  running: '⟳',
  ok:      '✓',
  fail:    '✗',
}

const COLOR: Record<BootStep['status'], string> = {
  pending: '#999',
  running: '#665DF5',
  ok:      '#00C853',
  fail:    '#FF1744',
}

export default function SplashScreen({ onReady }: { onReady: (state: BootState) => void }) {
  const [state, setState] = useState<BootState | null>(null)

  useEffect(() => {
    let stillMounted = true
    let transitioned = false

    // Common path for both initial poll and live updates — fire onReady once.
    function handle(s: BootState) {
      if (!stillMounted) return
      setState(s)
      if (s.done && !transitioned) {
        transitioned = true
        // Hold the splash on screen for a beat so the user can see it completed,
        // then transition. 350ms feels intentional without being slow.
        setTimeout(() => onReady(s), 350)
      }
    }

    // Initial poll covers the case where boot completed BEFORE we mounted —
    // in that case the BOOT_PROGRESS event already fired and we'd never get it.
    ipc.getBootState().then(handle)
    const off = ipc.onBootProgress(handle)
    return () => { stillMounted = false; off() }
  }, [])

  if (!state) return <SplashFrame steps={[]} />
  return <SplashFrame steps={state.steps} />
}

function SplashFrame({ steps }: { steps: BootStep[] }) {
  return (
    <div style={{
      height: '100vh', width: '100vw',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 0, background: '#FFFDF7',
      WebkitAppRegion: 'drag',
    } as React.CSSProperties}>
      <div style={{
        background: '#FFFFFF',
        border: '3px solid #0A0A0A',
        boxShadow: '6px 6px 0px #0A0A0A',
        padding: '32px 40px',
        minWidth: 360,
        WebkitAppRegion: 'no-drag',
      } as React.CSSProperties}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <VoxlitMark size={32} />
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700,
              letterSpacing: '-0.02em', color: '#0A0A0A',
            }}>
              VOXLIT
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.08em', color: '#666', marginTop: 2,
            }}>
              STARTING UP…
            </div>
          </div>
        </div>

        {steps.map(s => (
          <div key={s.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '7px 0', borderTop: '1px dashed rgba(10,10,10,0.1)',
          }}>
            <span style={{
              width: 14, textAlign: 'center', fontSize: 13, fontWeight: 700,
              color: COLOR[s.status],
              animation: s.status === 'running' ? 'splash-spin 0.9s linear infinite' : 'none',
              display: 'inline-block',
            }}>{ICON[s.status]}</span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600,
                color: s.status === 'fail' ? '#FF1744' : '#0A0A0A',
              }}>
                {s.label}
              </div>
              {s.detail && (
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10, color: '#666', marginTop: 2,
                }}>
                  {s.detail}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <style>{`@keyframes splash-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
