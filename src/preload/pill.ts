import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipc-types'
import type { RecordingStateChange, TranscriptSegment, HelperStatusChange } from '@shared/ipc-types'

// Minimal API surface for the floating pill window.
// The pill only needs to observe state — it never invokes main process actions.
contextBridge.exposeInMainWorld('voxlit', {
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
  }
})
