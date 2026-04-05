import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

// Schema intentionally mirrors Glaido's structure for future import compatibility.

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),                   // UUID v4
  startedAt: integer('started_at').notNull(),    // Unix ms
  endedAt: integer('ended_at'),
  model: text('model').notNull().default('ggml-base.en'),
  entryCount: integer('entry_count').notNull().default(0),
  totalWords: integer('total_words').notNull().default(0)
})

export const entries = sqliteTable('entries', {
  id: text('id').primaryKey(),                   // UUID v4
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at').notNull(),    // Unix ms
  rawText: text('raw_text').notNull(),
  processedText: text('processed_text'),
  durationMs: integer('duration_ms'),
  confidence: real('confidence'),
  engine: text('engine', { enum: ['local', 'cloud'] }).notNull().default('local')
})

// Key-value store for settings that benefit from FTS or relational joins.
// Sensitive values (API keys) live in electron-store instead.
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull()
})
