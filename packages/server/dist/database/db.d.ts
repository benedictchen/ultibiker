import * as schema from './schema.js';
export declare const db: import("drizzle-orm/better-sqlite3/driver.js").BetterSQLite3Database<typeof schema>;
export declare function initializeDatabase(): Promise<void>;
export declare function closeDatabase(): void;
