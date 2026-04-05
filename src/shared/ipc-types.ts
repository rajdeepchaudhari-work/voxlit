// Typed IPC contract shared between main process, preload, and renderer.
// All channel names live here — never hardcode strings on either side.

export const IPC = {
  // Main → Renderer (push events via webContents.send)
  RECORDING_STATE: 'voxlit:recording-state',
  TRANSCRIPT_SEGMENT: 'voxlit:transcript-segment',
  AMPLITUDE_UPDATE: 'voxlit:amplitude-update',
  HELPER_STATUS: 'voxlit:helper-status',

  // Renderer → Main (ipcRenderer.invoke / ipcMain.handle)
  GET_SETTINGS: 'voxlit:get-settings',
  SET_SETTING: 'voxlit:set-setting',
  GET_SESSIONS: 'voxlit:get-sessions',
  GET_ENTRIES: 'voxlit:get-entries',
  DELETE_SESSION: 'voxlit:delete-session',
  CHECK_PERMISSIONS: 'voxlit:check-permissions',
  REQUEST_PERMISSION: 'voxlit:request-permission',
  INJECT_TEXT: 'voxlit:inject-text'
} as const

// ─── Recording ────────────────────────────────────────────────────────────────

export type RecordingState = 'idle' | 'listening' | 'processing' | 'error'

export interface RecordingStateChange {
  state: RecordingState
  error?: string
}

// ─── Transcription ────────────────────────────────────────────────────────────

export interface TranscriptSegment {
  text: string
  sessionId: string
  entryId: string
  durationMs: number
  engine: 'local' | 'cloud'
  confidence?: number
}

// ─── Helper process ───────────────────────────────────────────────────────────

export type HelperStatus = 'starting' | 'connected' | 'disconnected' | 'error'

export interface HelperStatusChange {
  status: HelperStatus
  error?: string
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export type TranscriptionEngine = 'local' | 'cloud'
export type CloudProvider = 'groq' | 'openai'
export type HotkeyMode = 'push-to-talk' | 'toggle'

export interface VoxlitSettings {
  hotkeyPrimary: string       // e.g. "Option+Space"
  hotkeyMode: HotkeyMode
  transcriptionEngine: TranscriptionEngine
  cloudProvider: CloudProvider
  openaiApiKey?: string
  groqApiKey?: string
  localModel: string          // e.g. "ggml-base.en"
  vadSensitivity: number      // 0.0 – 1.0
  fillerWordFilter: boolean
  customDictionary: string[]
  launchAtLogin: boolean
  menubarOnly: boolean
}

// ─── Sessions / History ───────────────────────────────────────────────────────

export interface Session {
  id: string
  startedAt: number
  endedAt: number | null
  model: string
  entryCount: number
  totalWords: number
}

export interface Entry {
  id: string
  sessionId: string
  createdAt: number
  rawText: string
  processedText: string | null
  durationMs: number | null
  confidence: number | null
  engine: 'local' | 'cloud'
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export type PermissionType = 'microphone' | 'accessibility'
export type PermissionStatus = 'granted' | 'denied' | 'not-determined'

export interface PermissionsState {
  microphone: PermissionStatus
  accessibility: PermissionStatus
}
