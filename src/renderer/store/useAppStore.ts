import { create } from 'zustand'
import type { RecordingState, TranscriptSegment, HelperStatus, Session } from '@shared/ipc-types'
import { ipc } from '../lib/ipc'

interface AppState {
  // Recording
  recordingState: RecordingState
  amplitude: number        // overall RMS (kept for compat)
  barAmplitudes: number[]  // per-bar RMS for waveform
  lastTranscript: TranscriptSegment | null

  // Helper
  helperStatus: HelperStatus

  // History (settings window)
  sessions: Session[]
  sessionsLoaded: boolean

  // Actions
  initIPC: () => () => void
  loadSessions: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  recordingState: 'idle',
  amplitude: 0,
  barAmplitudes: new Array(12).fill(0),
  lastTranscript: null,
  helperStatus: 'disconnected',
  sessions: [],
  sessionsLoaded: false,

  initIPC: () => {
    const unsubRecording = ipc.onRecordingState(({ state }) => {
      set({ recordingState: state })
      // Fade amplitude back to 0 when not listening
      if (state !== 'listening') set({ amplitude: 0 })
    })

    const unsubAmplitude = ipc.onAmplitude((data) => {
      if (Array.isArray(data)) {
        const bars = data as number[]
        const overall = Math.sqrt(bars.reduce((s, v) => s + v * v, 0) / bars.length)
        set({ barAmplitudes: bars, amplitude: overall })
      } else {
        set({ amplitude: data as number })
      }
    })

    const unsubTranscript = ipc.onTranscript((segment) => {
      set({ lastTranscript: segment })
      // Reload sessions list after a new transcript arrives
      if (get().sessionsLoaded) get().loadSessions()
    })

    const unsubHelper = ipc.onHelperStatus(({ status }) => {
      set({ helperStatus: status })
    })

    return () => {
      unsubRecording()
      unsubAmplitude()
      unsubTranscript()
      unsubHelper()
    }
  },

  loadSessions: async () => {
    const sessions = await ipc.getSessions(100, 0)
    set({ sessions, sessionsLoaded: true })
  }
}))
