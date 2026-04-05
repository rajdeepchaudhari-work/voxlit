import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-types'
import type Store from 'electron-store'
import type { SessionStore } from '../services/SessionStore'
import type { SocketManager } from '../services/SocketManager'
import type { VoxlitSettings } from '@shared/ipc-types'

export function registerHandlers(deps: {
  store: Store<VoxlitSettings>
  sessionStore: SessionStore
  socketManager: SocketManager
}) {
  const { store, sessionStore, socketManager } = deps

  ipcMain.handle(IPC.GET_SETTINGS, () => store.store)

  ipcMain.handle(IPC.SET_SETTING, (_, key: keyof VoxlitSettings, value: unknown) => {
    store.set(key, value as VoxlitSettings[typeof key])
  })

  ipcMain.handle(IPC.GET_SESSIONS, (_, limit?: number, offset?: number) =>
    sessionStore.getSessions(limit, offset)
  )

  ipcMain.handle(IPC.GET_ENTRIES, (_, sessionId: string) =>
    sessionStore.getEntries(sessionId)
  )

  ipcMain.handle(IPC.DELETE_SESSION, (_, id: string) => {
    sessionStore.deleteSession(id)
  })

  ipcMain.handle(IPC.CHECK_PERMISSIONS, () => socketManager.checkPermissions())

  ipcMain.handle(IPC.INJECT_TEXT, (_, text: string) => {
    socketManager.sendInject(text)
  })
}
