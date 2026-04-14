import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import logoSrc from '../../assets/logo.png'
import soundStartUrl from '../../assets/sound-start.wav'
import soundEndUrl from '../../assets/sound-end.wav'

// ─── Sound effects (same approach as Glaido) ─────────────────────────────────

let audioCtx: AudioContext | null = null
const bufferCache = new Map<string, AudioBuffer>()

async function getCtx(): Promise<AudioContext> {
  if (!audioCtx) audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended') await audioCtx.resume()
  return audioCtx
}

async function playFile(url: string) {
  try {
    const ctx = await getCtx()
    let buf = bufferCache.get(url)
    if (!buf) {
      const res = await fetch(url)
      const raw = await res.arrayBuffer()
      buf = await ctx.decodeAudioData(raw)
      bufferCache.set(url, buf)
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start()
  } catch (_) {}
}

const playStartSound = () => playFile(soundStartUrl)
const playStopSound  = () => playFile(soundEndUrl)

/// Pre-warm the audio output graph: create the AudioContext, decode both wav
/// files, and play one inaudible silent buffer to fully spin up the HAL.
/// Without this the FIRST playStartSound has to do all this work on demand,
/// stealing CPU from the buffer mix and causing choppy/glitchy playback.
let warmedUp = false
export async function warmupChimes() {
  if (warmedUp) return
  warmedUp = true
  try {
    const ctx = await getCtx()
    // Decode both sound files into the cache so the next play just hands
    // a ready buffer to the audio thread.
    for (const url of [soundStartUrl, soundEndUrl]) {
      if (bufferCache.has(url)) continue
      const res = await fetch(url)
      const raw = await res.arrayBuffer()
      bufferCache.set(url, await ctx.decodeAudioData(raw))
    }
    // Play 1 frame of silence to finish HAL setup. The first audible play after
    // this is immediate — no choppy fade-in.
    const silent = ctx.createBuffer(1, 1, ctx.sampleRate)
    const src = ctx.createBufferSource()
    src.buffer = silent
    src.connect(ctx.destination)
    src.start()
  } catch (_) {
    warmedUp = false  // allow retry next time
  }
}

const BAR_COUNT = 12

// Voxlit pill badge — real logo with state ring
function VoxlitMark({ color }: { color: string }) {
  return (
    <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
      <img
        src={logoSrc}
        width={36}
        height={36}
        style={{ borderRadius: 7, display: 'block', objectFit: 'cover' }}
        draggable={false}
      />
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 7,
        border: `2.5px solid ${color}`,
        pointerEvents: 'none'
      }} />
    </div>
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
        border: '1px solid rgba(31,41,64,0.9)',
        borderRadius: 8,
        padding: '5px 12px',
        fontFamily: "'Geist Mono', 'SF Mono', monospace",
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
  listening:  { color: '#FFEB3B', glow: 'rgba(255,235,59,0.6)',  glowOuter: 'rgba(255,235,59,0.2)', label: 'LISTENING' },
  processing: { color: '#665DF5', glow: 'rgba(102,93,245,0.6)',  glowOuter: 'rgba(102,93,245,0.2)', label: 'PROCESSING' },
  error:      { color: '#FF1744', glow: 'rgba(255,23,68,0.6)',   glowOuter: 'rgba(255,23,68,0.15)', label: 'ERROR' },
}

export default function StatusPill() {
  const recordingState = useAppStore((s) => s.recordingState)
  const barAmplitudes = useAppStore((s) => s.barAmplitudes)
  const prevStateRef = useRef(recordingState)

  useEffect(() => {
    const prev = prevStateRef.current
    prevStateRef.current = recordingState
    if (prev !== 'listening' && recordingState === 'listening') playStartSound()
    if (prev === 'listening' && recordingState !== 'listening') playStopSound()
  }, [recordingState])

  if (recordingState === 'idle') return null

  // recordingState is narrowed to the non-idle union here. The earlier conditional
  // was a defensive holdover from before the early return.
  const activeState = recordingState as keyof typeof STATE
  const { color, glow, glowOuter, label } = STATE[activeState] ?? STATE.listening

  return (
    <div
      className="relative flex items-center justify-center w-full h-full"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 14px 0 6px',
          height: 50,
          background: '#FFFFFF',
          border: `3px solid #0A0A0A`,
          boxShadow: `4px 4px 0px #0A0A0A`,
          transition: 'box-shadow 0.1s'
        }}
      >
        {/* Logo badge */}
        <div style={{ flexShrink: 0 }}>
          <VoxlitMark color={color} />
        </div>

        {/* Waveform bars — recordingState is already non-idle at this point */}
        <WaveformBars
          barAmplitudes={barAmplitudes}
          color={color}
          state={recordingState as 'listening' | 'processing' | 'error'}
        />

        {/* State label */}
        <span style={{
          fontFamily: "'Geist Mono', monospace", fontSize: 9, fontWeight: 700,
          letterSpacing: '0.1em', color: '#0A0A0A', marginLeft: 2
        }}>
          {label}
        </span>
      </div>
    </div>
  )
}
