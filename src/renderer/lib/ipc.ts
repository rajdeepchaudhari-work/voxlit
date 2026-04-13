// Typed wrappers around the contextBridge API exposed by src/preload/index.ts.
// Import from here instead of accessing window.voxlit directly.

import type {
  RecordingStateChange,
  TranscriptSegment,
  HelperStatus,
  HelperStatusChange,
  VoxlitSettings,
  Session,
  Entry,
  PermissionsState,
  PermissionType,
  SystemInfo,
  ModelStatus,
  ModelDownloadProgress,
  UpdateInfo,
  UpdateProgress,
  AudioDevice
} from '@shared/ipc-types'

type Unsubscribe = () => void

declare global {
  interface Window {
    voxlit: {
      onRecordingState: (cb: (data: RecordingStateChange) => void) => Unsubscribe
      onAmplitude: (cb: (bars: number[]) => void) => Unsubscribe
      onTranscript: (cb: (segment: TranscriptSegment) => void) => Unsubscribe
      onHelperStatus: (cb: (data: HelperStatusChange) => void) => Unsubscribe
      getSettings: () => Promise<VoxlitSettings>
      setSetting: <K extends keyof VoxlitSettings>(key: K, value: VoxlitSettings[K]) => Promise<void>
      getSessions: (limit?: number, offset?: number) => Promise<Session[]>
      getEntries: (sessionId: string) => Promise<Entry[]>
      deleteSession: (id: string) => Promise<void>
      checkPermissions: () => Promise<PermissionsState>
      requestPermission: (type: PermissionType) => Promise<void>
      injectText: (text: string) => Promise<void>
      getSystemInfo: () => Promise<SystemInfo>
      getModelStatus: (name: string) => Promise<ModelStatus>
      downloadModel: (name: string) => Promise<void>
      onModelDownloadProgress: (cb: (data: ModelDownloadProgress) => void) => Unsubscribe
      relaunch: () => Promise<void>
      getAppVersion: () => Promise<string>
      getHelperStatus: () => Promise<{ status: HelperStatus; error?: string }>
      getAudioDevices: () => Promise<AudioDevice[]>
      setAudioDevice: (uid: string) => Promise<void>
      setMicGain: (gain: number) => Promise<void>
      setMicGainMode: (mode: 'off' | 'manual' | 'auto') => Promise<void>
      setNoiseSuppression: (enabled: boolean) => Promise<void>
      onUpdateAvailable: (cb: (info: UpdateInfo) => void) => Unsubscribe
      onUpdateProgress: (cb: (p: UpdateProgress) => void) => Unsubscribe
      onUpdateDownloaded: (cb: (info: UpdateInfo) => void) => Unsubscribe
      installUpdate: () => Promise<void>
      checkForUpdates: () => Promise<void>
    }
  }
}

export const ipc = window.voxlit
