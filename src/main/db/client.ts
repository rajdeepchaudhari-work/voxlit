import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle> | null = null

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

  _db = drizzle(sqlite, { schema })
  return _db
}

export type Db = ReturnType<typeof getDb>
