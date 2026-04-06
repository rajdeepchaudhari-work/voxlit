import { create } from 'zustand'
import type { RecordingState, TranscriptSegment, HelperStatus, Session } from '@shared/ipc-types'
import { ipc } from '../lib/ipc'

type OnboardingStep = 'welcome' | 'microphone' | 'accessibility' | 'engine' | 'localsetup' | 'done' | null

interface Stats {
  totalMinutes: number
  wordsPerMinute: number
  dayStreak: number
}

interface AppState {
  // Recording
  recordingState: RecordingState
  amplitude: number
  barAmplitudes: number[]
  lastTranscript: TranscriptSegment | null

  // Helper
  helperStatus: HelperStatus

  // History
  sessions: Session[]
  sessionsLoaded: boolean

  // Onboarding
  hasCompletedOnboarding: boolean
  onboardingStep: OnboardingStep

  // Dashboard stats
  stats: Stats | null

  // Actions
  initIPC: () => () => void
  loadSessions: () => Promise<void>
  loadStats: () => void
  setOnboardingStep: (step: OnboardingStep) => void
  completeOnboarding: () => Promise<void>
  checkOnboardingStatus: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  recordingState: 'idle',
  amplitude: 0,
  barAmplitudes: new Array(12).fill(0),
  lastTranscript: null,
  helperStatus: 'disconnected',
  sessions: [],
  sessionsLoaded: false,
  hasCompletedOnboarding: false,
  onboardingStep: null,
  stats: null,

  initIPC: () => {
    const unsubRecording = ipc.onRecordingState(({ state }) => {
      set({ recordingState: state })
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
    get().loadStats()
  },

  loadStats: () => {
    const { sessions } = get()
    if (sessions.length === 0) {
      set({ stats: { totalMinutes: 0, wordsPerMinute: 0, dayStreak: 0 } })
      return
    }

    const totalMs = sessions.reduce((acc, s) => {
      if (s.endedAt) return acc + (s.endedAt - s.startedAt)
      return acc
    }, 0)
    const totalMinutes = Math.max(1, Math.round(totalMs / 60000))
    const totalWords = sessions.reduce((acc, s) => acc + s.totalWords, 0)
    const wordsPerMinute = Math.round(totalWords / totalMinutes)

    // Streak: count consecutive days going back from today
    const days = new Set(sessions.map(s => new Date(s.startedAt).toDateString()))
    let streak = 0
    const today = new Date()
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      if (days.has(d.toDateString())) {
        streak++
      } else if (i > 0) {
        break
      }
    }

    set({ stats: { totalMinutes, wordsPerMinute, dayStreak: streak } })
  },

  setOnboardingStep: (step) => set({ onboardingStep: step }),

  completeOnboarding: async () => {
    await ipc.setSetting('hasCompletedOnboarding', true)
    set({ hasCompletedOnboarding: true, onboardingStep: null })
  },

  checkOnboardingStatus: async () => {
    const settings = await ipc.getSettings()
    if (!settings.hasCompletedOnboarding) {
      set({ onboardingStep: 'welcome' })
    } else {
      set({ hasCompletedOnboarding: true, onboardingStep: null })
    }
  },
}))
