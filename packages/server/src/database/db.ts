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
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
}

// FIXME: Add database connection pooling for production:
// 1. Implement connection pooling for concurrent request handling
// 2. Add database health checks and automatic reconnection
// 3. Implement proper error handling for database failures
// 4. Add database metrics collection and monitoring
// 5. Consider read replica support for query scaling
// 6. Add database backup automation with S3 integration
// 7. Implement proper transaction management with rollback support
// 8. Add query performance monitoring and slow query logging

// Cleanup function for graceful shutdown
export async function closeDatabase(): Promise<void> {
  // FIXME: Add proper connection cleanup and pending transaction handling
  try {
    sqlite.close();
    console.log('🔒 Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database:', error);
    throw error;
  }
}