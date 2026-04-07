import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipc-types'
import type {
  RecordingStateChange,
  TranscriptSegment,
  HelperStatusChange,
  VoxlitSettings,
  Session,
  Entry,
  PermissionsState,
  PermissionType,
  SystemInfo,
  ModelStatus,
  ModelDownloadProgress,
  UpdateInfo
} from '@shared/ipc-types'

// Full API surface for the settings/history window.
contextBridge.exposeInMainWorld('voxlit', {
  // ─── Push events (main → renderer) ──────────────────────────────────────────
  onRecordingState: (cb: (data: RecordingStateChange) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: RecordingStateChange) => cb(data)
    ipcRenderer.on(IPC.RECORDING_STATE, listener)
    return () => ipcRenderer.removeListener(IPC.RECORDING_STATE, listener)
  },

  onAmplitude: (cb: (amplitude: number) => void) => {
    const listener = (_: Electron.IpcRendererEvent, amp: number) => cb(amp)
    ipcRenderer.on(IPC.AMPLITUDE_UPDATE, listener)
    return () => ipcRenderer.removeListener(IPC.AMPLITUDE_UPDATE, listener)
  },

  onTranscript: (cb: (segment: TranscriptSegment) => void) => {
    const listener = (_: Electron.IpcRendererEvent, seg: TranscriptSegment) => cb(seg)
    ipcRenderer.on(IPC.TRANSCRIPT_SEGMENT, listener)
    return () => ipcRenderer.removeListener(IPC.TRANSCRIPT_SEGMENT, listener)
  },

  onHelperStatus: (cb: (data: HelperStatusChange) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: HelperStatusChange) => cb(data)
    ipcRenderer.on(IPC.HELPER_STATUS, listener)
    return () => ipcRenderer.removeListener(IPC.HELPER_STATUS, listener)
  },

  // ─── Invoke (renderer → main) ────────────────────────────────────────────────
  getSettings: (): Promise<VoxlitSettings> =>
    ipcRenderer.invoke(IPC.GET_SETTINGS),

  setSetting: <K extends keyof VoxlitSettings>(key: K, value: VoxlitSettings[K]): Promise<void> =>
    ipcRenderer.invoke(IPC.SET_SETTING, key, value),

  getSessions: (limit?: number, offset?: number): Promise<Session[]> =>
    ipcRenderer.invoke(IPC.GET_SESSIONS, limit, offset),

  getEntries: (sessionId: string): Promise<Entry[]> =>
    ipcRenderer.invoke(IPC.GET_ENTRIES, sessionId),

  deleteSession: (id: string): Promise<void> =>
    ipcRenderer.invoke(IPC.DELETE_SESSION, id),

  checkPermissions: (): Promise<PermissionsState> =>
    ipcRenderer.invoke(IPC.CHECK_PERMISSIONS),

  requestPermission: (type: PermissionType): Promise<void> =>
    ipcRenderer.invoke(IPC.REQUEST_PERMISSION, type),

  injectText: (text: string): Promise<void> =>
    ipcRenderer.invoke(IPC.INJECT_TEXT, text),

  getSystemInfo: (): Promise<SystemInfo> =>
    ipcRenderer.invoke(IPC.GET_SYSTEM_INFO),

  getModelStatus: (name: string): Promise<ModelStatus> =>
    ipcRenderer.invoke(IPC.GET_MODEL_STATUS, name),

  downloadModel: (name: string): Promise<void> =>
    ipcRenderer.invoke(IPC.DOWNLOAD_MODEL, name),

  onModelDownloadProgress: (cb: (data: ModelDownloadProgress) => void) => {
    const listener = (_: Electron.IpcRendererEvent, data: ModelDownloadProgress) => cb(data)
    ipcRenderer.on(IPC.MODEL_DOWNLOAD_PROGRESS, listener)
    return () => ipcRenderer.removeListener(IPC.MODEL_DOWNLOAD_PROGRESS, listener)
  },

  relaunch: (): Promise<void> => ipcRenderer.invoke(IPC.RELAUNCH),

  onUpdateAvailable: (cb: (info: UpdateInfo) => void) => {
    const listener = (_: Electron.IpcRendererEvent, info: UpdateInfo) => cb(info)
    ipcRenderer.on(IPC.UPDATE_AVAILABLE, listener)
    return () => ipcRenderer.removeListener(IPC.UPDATE_AVAILABLE, listener)
  },

  onUpdateDownloaded: (cb: (info: UpdateInfo) => void) => {
    const listener = (_: Electron.IpcRendererEvent, info: UpdateInfo) => cb(info)
    ipcRenderer.on(IPC.UPDATE_DOWNLOADED, listener)
    return () => ipcRenderer.removeListener(IPC.UPDATE_DOWNLOADED, listener)
  },

  installUpdate: (): Promise<void> => ipcRenderer.invoke(IPC.INSTALL_UPDATE),
  checkForUpdates: (): Promise<void> => ipcRenderer.invoke(IPC.CHECK_FOR_UPDATES)
})
