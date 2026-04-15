import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle> | null = null
let _sqlite: Database.Database | null = null

export function getDb() {
  if (_db) return _db

  const userDataPath = app.getPath('userData')
  mkdirSync(userDataPath, { recursive: true })

  const dbPath = join(userDataPath, 'voxlit.db')
  const sqlite = new Database(dbPath)

  // Performance settings
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  sqlite.pragma('synchronous = NORMAL')

  _sqlite = sqlite
  _db = drizzle(sqlite, { schema })
  return _db
}

/**
 * Returns the underlying better-sqlite3 handle, or null if the DB hasn't been
 * opened yet. Exposed so SessionStore.close() can run a WAL checkpoint and
 * release OS file handles before DataReset rmSync's the userData directory —
 * otherwise the unlinked inodes stay live and a subsequent shutdown flush
 * recreates stale files.
 */
export function getSqliteHandle(): Database.Database | null {
  return _sqlite
}

/**
 * Drop the cached handles so a later getDb() call reopens cleanly. Called
 * after close() — without this, the stale closed drizzle instance would be
 * returned on any subsequent DB access.
 */
export function resetDbCache() {
  _db = null
  _sqlite = null
}

export type Db = ReturnType<typeof getDb>
