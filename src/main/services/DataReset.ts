import { app } from 'electron'
import { rmSync, readdirSync, unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

/**
 * Nuke all persisted Voxlit data. Used to recover users upgrading from a past
 * version whose data doesn't round-trip cleanly — common failure modes:
 *   - electron-store `encryptionKey` drift across versions → openaiApiKey becomes
 *     unreadable junk, user thinks "my cloud engine is broken."
 *   - SQLite schema additions shipped without a migration → boot crash or
 *     silent deserialize errors.
 *   - Stale /tmp/voxlit.socket blocking the new helper from binding.
 *   - Partially-downloaded auto-update in pending-updates/ that the next boot
 *     tries to install and fails.
 *
 * What gets cleared:
 *   - Everything under app.getPath('userData') — the DB, WAL/SHM sidecars,
 *     electron-store config.json, downloaded whisper models, pending-updates/,
 *     any cache directories Electron created inside userData.
 *   - /tmp/voxlit*.wav orphaned WAV files from crashed transcriptions.
 *   - /tmp/voxlit.socket if present.
 *
 * What doesn't get touched:
 *   - The .app bundle itself (resources/, bundled binaries, bundled models).
 *   - Granted TCC permissions (microphone, accessibility, automation) — those
 *     live in macOS's TCC database which we can't and shouldn't touch.
 *   - The user's Library/Logs/Voxlit directory — logs are useful when debugging
 *     WHY they needed to reset. Can be added later if it matters.
 *
 * This function is deliberately synchronous so the callers (CLI --reset and
 * tray menu) can safely call app.relaunch()/app.exit() immediately after
 * without racing async fs operations.
 *
 * Returns true on total success, false if one of the cleanup steps threw.
 * Callers should still relaunch either way — a partial wipe is still better
 * than continuing in the corrupt state the user is trying to escape.
 */
export function resetAllUserData(teardown?: () => void): boolean {
  let ok = true

  // Close live persistence handles BEFORE the rmSync. better-sqlite3 holds
  // open fds on voxlit.db/-wal/-shm and electron-store buffers settings in
  // memory that it flushes on process exit. If we rmSync while they're open,
  // macOS unlinks the directory entries but the inodes stay live — then a
  // later shutdown flush recreates files with stale data, defeating the reset.
  // Callers from the running app pass a teardown that closes SQLite, clears
  // electron-store, and kills the helper. The CLI --reset path runs before
  // services are constructed, so it passes nothing.
  if (teardown) {
    try {
      teardown()
    } catch (e) {
      console.warn('[DataReset] teardown failed:', e)
    }
  }

  // 1. Nuke the whole userData directory. electron-store, SQLite files
  //    (main + WAL + SHM), downloaded models, pending-updates/, everything.
  //    Electron recreates the directory on next boot.
  try {
    const userDataDir = app.getPath('userData')
    console.log('[DataReset] removing', userDataDir)
    rmSync(userDataDir, { recursive: true, force: true })
  } catch (e) {
    console.error('[DataReset] userData removal failed:', e)
    ok = false
  }

  // 2. Orphaned temp WAVs from crashed transcriptions + the helper socket.
  //    These live outside userData.
  try {
    const tmp = tmpdir()
    const entries = readdirSync(tmp)
    for (const name of entries) {
      if (name.startsWith('voxlit_') && name.endsWith('.wav')) {
        try { unlinkSync(join(tmp, name)) } catch (_) {}
      }
    }
  } catch (e) {
    console.warn('[DataReset] tmp wav cleanup failed:', e)
    // non-fatal — orphan wavs get cleaned up on next reboot anyway
  }

  try {
    const socketPath = '/tmp/voxlit.socket'
    if (existsSync(socketPath)) unlinkSync(socketPath)
  } catch (_) {
    // non-fatal — if the new helper can't bind because of this, SocketManager
    // already unlinks stale sockets on startSocketServer().
  }

  return ok
}

/**
 * Reset and relaunch. The standard way to invoke reset while the app is
 * running — from the tray menu or (future) a Settings button.
 */
export function resetAndRelaunch(teardown?: () => void): void {
  resetAllUserData(teardown)
  app.relaunch()
  app.exit(0)
}
