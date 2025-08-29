import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema.js';

const sqlite = new Database('./ultibiker.db');
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

// Cleanup function for graceful shutdown
export function closeDatabase() {
  sqlite.close();
  console.log('🔒 Database connection closed');
}