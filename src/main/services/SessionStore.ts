import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { eq, desc, sql } from 'drizzle-orm'
import { join } from 'path'
import { app } from 'electron'
import { randomUUID } from 'crypto'
import { getDb, getSqliteHandle, resetDbCache } from '../db/client'
import { sessions, entries } from '../db/schema'
import type { Session, Entry } from '@shared/ipc-types'

export class SessionStore {
  private _db: ReturnType<typeof getDb> | null = null
  private get db() {
    if (!this._db) this._db = getDb()
    return this._db
  }
  private activeSessionId: string | null = null
  private inactivityTimer: NodeJS.Timeout | null = null
  private readonly INACTIVITY_TIMEOUT_MS = 30_000
  private closed = false

  init() {
    // Dev: migrations live in src/main/db/migrations (app root is project root)
    // Prod: migrations are copied to resources/migrations by electron-builder
    const migrationsFolder = app.isPackaged
      ? join(process.resourcesPath, 'migrations')
      : join(app.getAppPath(), 'src/main/db/migrations')
    migrate(this.db, { migrationsFolder })
  }

  startSession(model: string = 'voxlit-cloud'): string {
    if (this.activeSessionId) {
      this.resetInactivityTimer()
      return this.activeSessionId
    }

    const id = randomUUID()
    this.db.insert(sessions).values({
      id,
      startedAt: Date.now(),
      model
    }).run()

    this.activeSessionId = id
    this.resetInactivityTimer()
    return id
  }

  addEntry(params: {
    rawText: string
    durationMs?: number
    confidence?: number
    engine?: 'voxlit' | 'local' | 'cloud'
    model?: string  // actual model used (e.g. 'whisper-1', 'ggml-base.en', 'voxlit-cloud')
  }): Entry {
    const sessionId = this.startSession(params.model)
    const id = randomUUID()
    const wordCount = params.rawText.trim().split(/\s+/).length

    // DB enum only allows 'local' | 'cloud' — fold 'voxlit' into 'cloud'.
    // The actual provider is preserved in session.model ('voxlit-cloud' etc).
    const dbEngine: 'local' | 'cloud' = params.engine === 'local' ? 'local' : 'cloud'

    this.db.insert(entries).values({
      id,
      sessionId,
      createdAt: Date.now(),
      rawText: params.rawText,
      durationMs: params.durationMs ?? null,
      confidence: params.confidence ?? null,
      engine: dbEngine
    }).run()

    // Increment session counters in-place — accumulates words across entries.
    // Previous code overwrote totalWords with the current entry's count, losing history.
    this.db
      .update(sessions)
      .set({
        entryCount: sql`${sessions.entryCount} + 1`,
        totalWords: sql`${sessions.totalWords} + ${wordCount}`
      })
      .where(eq(sessions.id, sessionId))
      .run()

    this.resetInactivityTimer()

    return {
      id,
      sessionId,
      createdAt: Date.now(),
      rawText: params.rawText,
      processedText: null,
      durationMs: params.durationMs ?? null,
      confidence: params.confidence ?? null,
      engine: dbEngine
    }
  }

  getSessions(limit = 50, offset = 0): Session[] {
    return this.db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.startedAt))
      .limit(limit)
      .offset(offset)
      .all() as Session[]
  }

  getEntries(sessionId: string): Entry[] {
    return this.db
      .select()
      .from(entries)
      .where(eq(entries.sessionId, sessionId))
      .orderBy(entries.createdAt)
      .all() as Entry[]
  }

  deleteSession(id: string) {
    this.db.delete(sessions).where(eq(sessions.id, id)).run()
    if (this.activeSessionId === id) {
      this.activeSessionId = null
    }
  }

  private closeActiveSession() {
    if (!this.activeSessionId) return
    this.db
      .update(sessions)
      .set({ endedAt: Date.now() })
      .where(eq(sessions.id, this.activeSessionId))
      .run()
    this.activeSessionId = null
  }

  /**
   * Release SQLite file handles so a subsequent rmSync of the userData dir
   * actually unlinks the inodes instead of leaving them held by the process.
   * Runs a WAL checkpoint first so any buffered writes land in the main db
   * file (otherwise the -wal sidecar might be the only truth and the checkpoint
   * on close could recreate it after we tried to delete it).
   *
   * Idempotent: safe to call multiple times. Also cancels the inactivity timer
   * so we don't race a scheduled closeActiveSession() against a closed handle.
   */
  close() {
    if (this.closed) return
    this.closed = true

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer)
      this.inactivityTimer = null
    }

    const sqlite = getSqliteHandle()
    if (sqlite) {
      try {
        sqlite.pragma('wal_checkpoint(TRUNCATE)')
      } catch (e) {
        console.warn('[SessionStore] WAL checkpoint failed:', e)
      }
      try {
        sqlite.close()
      } catch (e) {
        console.warn('[SessionStore] sqlite close failed:', e)
      }
    }

    this._db = null
    resetDbCache()
  }

  private resetInactivityTimer() {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer)
    this.inactivityTimer = setTimeout(
      () => this.closeActiveSession(),
      this.INACTIVITY_TIMEOUT_MS
    )
  }
}
