import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'

const BAR_COUNT = 12

// Voxlit pill badge — squircle with 3-bar waveform mark
function VoxlitMark({ color }: { color: string }) {
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
      <rect x="1" y="1" width="36" height="36" rx="11" fill="#0A0A0F" stroke={color} strokeWidth="1.5" />
      {/* 3 bars matching app icon */}
      <rect x="10" y="14" width="4.5" height="10" rx="2.25" fill={color} />
      <rect x="16.75" y="10" width="4.5" height="18" rx="2.25" fill={color} />
      <rect x="23.5" y="14" width="4.5" height="10" rx="2.25" fill={color} />
    </svg>
  )
}

function WaveformBars({ barAmplitudes, color, state }: {
  barAmplitudes: number[]
  color: string
  state: 'listening' | 'processing' | 'error'
}) {
  const [tick, setTick] = useState(0)
  const rafRef = useRef<number>()

  useEffect(() => {
    let f = 0
    const loop = () => { f++; setTick(f); rafRef.current = requestAnimationFrame(loop) }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current!)
  }, [])

  const t = tick / 60
  const MAX_H = 28
  const MIN_H = 3

  // Normalize bar amplitudes so loudest bar = full height
  const maxAmp = Math.max(...barAmplitudes, 0.001)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: MAX_H }}>
      {Array.from({ length: BAR_COUNT }).map((_, i) => {
        let h: number
        if (state === 'listening') {
          // Use real PCM amplitude per bar
          const norm = barAmplitudes[i] / maxAmp
          h = Math.round(MIN_H + (MAX_H - MIN_H) * Math.max(0.08, norm))
        } else {
          // Processing: travelling pulse
          const pos = ((t * 2.5) % (BAR_COUNT + 2)) - 1
          const dist = Math.abs(i - pos)
          const ratio = Math.max(0.08, 1 - dist * 0.4)
          h = Math.round(MIN_H + (MAX_H - MIN_H) * ratio)
        }

        return (
          <div
            key={i}
            style={{
              width: 3,
              height: h,
              borderRadius: 9999,
              background: color,
              transition: 'height 60ms ease-out'
            }}
          />
        )
      })}
    </div>
  )
}

// Brief transcript flash below the pill
function TranscriptFlash({ text }: { text: string | null }) {
  const [visible, setVisible] = useState(false)
  const [displayText, setDisplayText] = useState('')
  const timerRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!text) return
    setDisplayText(text)
    setVisible(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), 3000)
    return () => clearTimeout(timerRef.current)
  }, [text])

  if (!visible || !displayText) return null

  return (
    <div
      className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap max-w-xs overflow-hidden"
      style={{
        background: 'rgba(10,10,15,0.97)',
        border: '1px solid rgba(46,46,74,0.9)',
        borderRadius: 8,
        padding: '5px 12px',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12,
        color: '#F0EEFF',
        boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
        textOverflow: 'ellipsis'
      }}
    >
      {displayText.length > 55 ? displayText.slice(0, 52) + '…' : displayText}
    </div>
  )
}

const STATE = {
  listening: { color: '#22D3EE', glow: 'rgba(34,211,238,0.5)', glowOuter: 'rgba(34,211,238,0.15)' },
  processing: { color: '#A78BFA', glow: 'rgba(167,139,250,0.5)', glowOuter: 'rgba(124,58,237,0.15)' },
  error:      { color: '#EF4444', glow: 'rgba(239,68,68,0.5)',   glowOuter: 'rgba(239,68,68,0.1)' },
}

export default function StatusPill() {
  const recordingState = useAppStore((s) => s.recordingState)
  const barAmplitudes = useAppStore((s) => s.barAmplitudes)
  const lastTranscript = useAppStore((s) => s.lastTranscript)

  if (recordingState === 'idle' && !lastTranscript) return null

  const activeState = (recordingState === 'idle' ? 'processing' : recordingState) as keyof typeof STATE
  const { color, glow, glowOuter } = STATE[activeState] ?? STATE.listening

  return (
    <div
      className="relative flex items-center justify-center w-full h-full"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <TranscriptFlash text={lastTranscript?.text ?? null} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '0 16px 0 8px',
          height: 48,
          background: 'rgba(10, 10, 15, 0.96)',
          border: `2px solid ${color}`,
          borderRadius: 9999,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: `0 0 0 1px ${glowOuter}, 0 0 20px ${glow}, 0 0 50px ${glowOuter}, inset 0 1px 0 rgba(255,255,255,0.04)`,
          transition: 'border-color 200ms ease, box-shadow 200ms ease'
        }}
      >
        {/* Logo badge */}
        <div style={{ flexShrink: 0, filter: `drop-shadow(0 0 6px ${glow})` }}>
          <VoxlitMark color={color} />
        </div>

        {/* Waveform bars */}
        {recordingState !== 'idle' && (
          <WaveformBars
            barAmplitudes={barAmplitudes}
            color={color}
            state={recordingState as 'listening' | 'processing' | 'error'}
          />
        )}
      </div>
    </div>
  )
}
