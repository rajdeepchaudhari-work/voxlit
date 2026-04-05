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
  PermissionType
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
    ipcRenderer.invoke(IPC.INJECT_TEXT, text)
})
