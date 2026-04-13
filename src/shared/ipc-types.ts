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
  INJECT_TEXT: 'voxlit:inject-text',
  GET_SYSTEM_INFO: 'voxlit:get-system-info',
  GET_MODEL_STATUS: 'voxlit:get-model-status',
  DOWNLOAD_MODEL: 'voxlit:download-model',
  MODEL_DOWNLOAD_PROGRESS: 'voxlit:model-download-progress',
  RELAUNCH: 'voxlit:relaunch',
  GET_APP_VERSION: 'voxlit:get-app-version',
  GET_AUDIO_DEVICES: 'voxlit:get-audio-devices',
  SET_AUDIO_DEVICE: 'voxlit:set-audio-device',
  SET_MIC_GAIN: 'voxlit:set-mic-gain',

  // Auto-update
  UPDATE_AVAILABLE: 'voxlit:update-available',
  UPDATE_DOWNLOADED: 'voxlit:update-downloaded',
  UPDATE_ERROR: 'voxlit:update-error',
  INSTALL_UPDATE: 'voxlit:install-update',
  CHECK_FOR_UPDATES: 'voxlit:check-for-updates'
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

export type TranscriptionEngine = 'voxlit' | 'local' | 'cloud'
export type CloudProvider = 'openai'
export type HotkeyMode = 'push-to-talk' | 'toggle'

export interface VoxlitSettings {
  hotkeyPrimary: string       // e.g. "Option+Space"
  hotkeyMode: HotkeyMode
  transcriptionEngine: TranscriptionEngine
  cloudProvider: CloudProvider
  openaiApiKey?: string
  localModel: string          // e.g. "ggml-base.en"
  vadSensitivity: number      // 0.0 – 1.0
  fillerWordFilter: boolean
  customDictionary: string[]
  launchAtLogin: boolean
  menubarOnly: boolean
  hasCompletedOnboarding?: boolean
  // Voxlit Server (cloud with prompt engineering). Defaults filled in main.
  voxlitServerUrl?: string
  voxlitServerToken?: string
  // Preferred input device UID (empty = system default)
  micDeviceUid?: string
  // Input gain multiplier (1.0 = no boost, 2.5 = default, 5.0 = max)
  micGain?: number
}

export interface AudioDevice {
  uid: string
  name: string
  isDefault: boolean
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

// ─── System / Models ──────────────────────────────────────────────────────────

export interface SystemInfo {
  totalRamGb: number
  freeRamGb: number
  freeDiskGb: number
}

export interface ModelStatus {
  name: string
  exists: boolean
  sizeBytes: number
}

export interface ModelDownloadProgress {
  model: string
  bytesReceived: number
  totalBytes: number
  done: boolean
  error?: string
}

// ─── Updates ─────────────────────────────────────────────────────────────────

export interface UpdateInfo {
  version: string
  releaseName?: string
  releaseNotes?: string
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export type PermissionType = 'microphone' | 'accessibility'
export type PermissionStatus = 'granted' | 'denied' | 'not-determined'

export interface PermissionsState {
  microphone: PermissionStatus
  accessibility: PermissionStatus
}
