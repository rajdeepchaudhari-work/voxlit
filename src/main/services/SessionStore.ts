import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { eq, desc } from 'drizzle-orm'
import { join } from 'path'
import { app } from 'electron'
import { randomUUID } from 'crypto'
import { getDb } from '../db/client'
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

  init() {
    // Dev: migrations live in src/main/db/migrations (app root is project root)
    // Prod: migrations are copied to resources/migrations by electron-builder
    const migrationsFolder = app.isPackaged
      ? join(process.resourcesPath, 'migrations')
      : join(app.getAppPath(), 'src/main/db/migrations')
    migrate(this.db, { migrationsFolder })
  }

  startSession(): string {
    if (this.activeSessionId) {
      this.resetInactivityTimer()
      return this.activeSessionId
    }

    const id = randomUUID()
    this.db.insert(sessions).values({
      id,
      startedAt: Date.now(),
      model: 'ggml-base.en'
    }).run()

    this.activeSessionId = id
    this.resetInactivityTimer()
    return id
  }

  addEntry(params: {
    rawText: string
    durationMs?: number
    confidence?: number
    engine?: 'local' | 'cloud'
  }): Entry {
    const sessionId = this.startSession()
    const id = randomUUID()
    const wordCount = params.rawText.trim().split(/\s+/).length

    this.db.insert(entries).values({
      id,
      sessionId,
      createdAt: Date.now(),
      rawText: params.rawText,
      durationMs: params.durationMs ?? null,
      confidence: params.confidence ?? null,
      engine: params.engine ?? 'local'
    }).run()

    // Update session counters
    this.db
      .update(sessions)
      .set({
        entryCount: this.db.$count(entries, eq(entries.sessionId, sessionId)),
        totalWords: wordCount
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
      engine: params.engine ?? 'local'
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

  private resetInactivityTimer() {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer)
    this.inactivityTimer = setTimeout(
      () => this.closeActiveSession(),
      this.INACTIVITY_TIMEOUT_MS
    )
  }
}
