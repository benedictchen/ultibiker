// FIXME: Consider database enhancements for production:
// - better-sqlite3-session-store: Session storage for express-session
// - sqlite-cache: Caching layer for frequently accessed queries
// - sqlite-backup: Automated database backup utilities
// - node-cron: Scheduled tasks for database maintenance and cleanup
// For cloud deployment, consider migrating to PostgreSQL with:
// - pg: PostgreSQL driver + drizzle-orm/node-postgres
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema.js';
import { env } from '../config/env.js';
// Use environment-configured database path
const sqlite = new Database(env.DATABASE_URL);
export const db = drizzle(sqlite, { schema });
export async function initializeDatabase() {
    try {
        // Run migrations
        await migrate(db, { migrationsFolder: './drizzle' });
        // Enable WAL mode for better concurrency
        sqlite.pragma('journal_mode = WAL');
        // Enable foreign keys
        sqlite.pragma('foreign_keys = ON');
        console.log('✅ Database initialized successfully');
    }
    catch (error) {
        console.error('❌ Failed to initialize database:', error);
        throw error;
    }
}
// Cleanup function for graceful shutdown
export function closeDatabase() {
    sqlite.close();
    console.log('🔒 Database connection closed');
}
//# sourceMappingURL=db.js.map