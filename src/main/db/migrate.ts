// Run via: npm run db:migrate
// In production, migrations run automatically on app start via SessionStore.init()
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { getDb } from './client'
import { join } from 'path'

const db = getDb()
migrate(db, { migrationsFolder: join(__dirname, 'migrations') })
console.log('Migrations applied successfully')
