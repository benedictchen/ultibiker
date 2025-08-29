# UltiBiker MVP - Database Schema

## 🗃️ SQLite Database Design

### Overview
The UltiBiker MVP uses SQLite as the local database for storing sensor data, device configurations, and session information. The schema is designed using Drizzle ORM for type safety and efficient queries.

```
🗃️ SQLITE DATABASE SCHEMA (ultibiker.db)

┌─────────────────────────────────────────────────────────────────────┐
│                           Database Tables                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 📱 devices              📊 sensor_data           🏃 sessions        │
│ ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐ │
│ │ id              │     │ id              │     │ id              │ │
│ │ device_id       │────▶│ device_id       │     │ name            │ │
│ │ name            │     │ session_id      │◀────│ start_time      │ │
│ │ type            │     │ timestamp       │     │ end_time        │ │
│ │ protocol        │     │ metric_type     │     │ duration        │ │
│ │ is_connected    │     │ value           │     │ status          │ │
│ │ last_seen       │     │ unit            │     │ notes           │ │
│ │ created_at      │     │ raw_data        │     └─────────────────┘ │
│ └─────────────────┘     └─────────────────┘                       │ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 📋 Table Schemas

### 📱 devices
Stores information about all discovered and connected sensor devices.

```sql
CREATE TABLE devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT UNIQUE NOT NULL,           -- MAC address or ANT+ device ID
    name TEXT NOT NULL,                       -- e.g., "Wahoo TICKR", "Stages Gen3"
    type TEXT NOT NULL,                       -- heart_rate, power, cadence, speed, trainer
    protocol TEXT NOT NULL,                   -- ant_plus, bluetooth
    is_connected BOOLEAN DEFAULT 0,           -- Current connection status
    signal_strength INTEGER DEFAULT 0,        -- Signal quality 0-100
    battery_level INTEGER,                    -- Battery percentage (if available)
    manufacturer TEXT,                        -- Device manufacturer
    model TEXT,                              -- Device model
    firmware_version TEXT,                   -- Firmware version (if available)
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_devices_device_id ON devices(device_id);
CREATE INDEX idx_devices_type ON devices(type);
CREATE INDEX idx_devices_is_connected ON devices(is_connected);
```

### 📊 sensor_data
Stores all real-time sensor readings with timestamps.

```sql
CREATE TABLE sensor_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,                 -- Foreign key to devices.device_id
    session_id TEXT NOT NULL,                -- Foreign key to sessions.id
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    metric_type TEXT NOT NULL,               -- heart_rate, power, cadence, speed
    value REAL NOT NULL,                     -- Numeric sensor value
    unit TEXT NOT NULL,                      -- bpm, watts, rpm, kph, etc.
    quality INTEGER DEFAULT 100,             -- Data quality 0-100
    raw_data JSON,                          -- Original sensor payload
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (device_id) REFERENCES devices(device_id),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Indexes for performance
CREATE INDEX idx_sensor_data_device_id ON sensor_data(device_id);
CREATE INDEX idx_sensor_data_session_id ON sensor_data(session_id);
CREATE INDEX idx_sensor_data_timestamp ON sensor_data(timestamp);
CREATE INDEX idx_sensor_data_metric_type ON sensor_data(metric_type);
CREATE INDEX idx_sensor_data_composite ON sensor_data(session_id, timestamp, metric_type);
```

### 🏃 sessions
Tracks cycling sessions and rides.

```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,                     -- UUID generated for each session
    name TEXT DEFAULT 'Ride Session',        -- User-friendly session name
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,                       -- NULL while session is active
    duration INTEGER,                        -- Duration in seconds
    status TEXT DEFAULT 'active',            -- active, paused, completed
    distance REAL,                          -- Total distance in km
    avg_heart_rate REAL,                    -- Average heart rate
    max_heart_rate REAL,                    -- Maximum heart rate
    avg_power REAL,                         -- Average power in watts
    max_power REAL,                         -- Maximum power in watts
    avg_cadence REAL,                       -- Average cadence in RPM
    avg_speed REAL,                         -- Average speed in km/h
    max_speed REAL,                         -- Maximum speed in km/h
    energy_expenditure REAL,               -- Estimated calories burned
    notes TEXT,                            -- User notes about the session
    weather_conditions TEXT,               -- Weather during session
    temperature REAL,                      -- Temperature in Celsius
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
CREATE INDEX idx_sessions_status ON sessions(status);
```

## 🏷️ Drizzle ORM Schema Definition

```typescript
// src/database/schema.ts
import { sqliteTable, text, integer, real, datetime, index } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

export const devices = sqliteTable('devices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  deviceId: text('device_id').notNull().unique(),
  name: text('name').notNull(),
  type: text('type', { 
    enum: ['heart_rate', 'power', 'cadence', 'speed', 'trainer'] 
  }).notNull(),
  protocol: text('protocol', { 
    enum: ['ant_plus', 'bluetooth'] 
  }).notNull(),
  isConnected: integer('is_connected', { mode: 'boolean' }).default(false),
  signalStrength: integer('signal_strength').default(0),
  batteryLevel: integer('battery_level'),
  manufacturer: text('manufacturer'),
  model: text('model'),
  firmwareVersion: text('firmware_version'),
  lastSeen: integer('last_seen', { mode: 'timestamp' }).defaultNow(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow(),
}, (table) => ({
  deviceIdIdx: index('idx_devices_device_id').on(table.deviceId),
  typeIdx: index('idx_devices_type').on(table.type),
  connectedIdx: index('idx_devices_is_connected').on(table.isConnected),
}));

export const sensorData = sqliteTable('sensor_data', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  deviceId: text('device_id').notNull().references(() => devices.deviceId),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  timestamp: integer('timestamp', { mode: 'timestamp' }).defaultNow(),
  metricType: text('metric_type', {
    enum: ['heart_rate', 'power', 'cadence', 'speed']
  }).notNull(),
  value: real('value').notNull(),
  unit: text('unit').notNull(),
  quality: integer('quality').default(100),
  rawData: text('raw_data', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
}, (table) => ({
  deviceIdIdx: index('idx_sensor_data_device_id').on(table.deviceId),
  sessionIdIdx: index('idx_sensor_data_session_id').on(table.sessionId),
  timestampIdx: index('idx_sensor_data_timestamp').on(table.timestamp),
  metricTypeIdx: index('idx_sensor_data_metric_type').on(table.metricType),
  compositeIdx: index('idx_sensor_data_composite').on(
    table.sessionId, table.timestamp, table.metricType
  ),
}));

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').default('Ride Session'),
  startTime: integer('start_time', { mode: 'timestamp' }).defaultNow(),
  endTime: integer('end_time', { mode: 'timestamp' }),
  duration: integer('duration'), // seconds
  status: text('status', { 
    enum: ['active', 'paused', 'completed'] 
  }).default('active'),
  distance: real('distance'),
  avgHeartRate: real('avg_heart_rate'),
  maxHeartRate: real('max_heart_rate'),
  avgPower: real('avg_power'),
  maxPower: real('max_power'),
  avgCadence: real('avg_cadence'),
  avgSpeed: real('avg_speed'),
  maxSpeed: real('max_speed'),
  energyExpenditure: real('energy_expenditure'),
  notes: text('notes'),
  weatherConditions: text('weather_conditions'),
  temperature: real('temperature'),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow(),
}, (table) => ({
  startTimeIdx: index('idx_sessions_start_time').on(table.startTime),
  statusIdx: index('idx_sessions_status').on(table.status),
}));

export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;
export type SensorData = typeof sensorData.$inferSelect;
export type NewSensorData = typeof sensorData.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
```

## 🔄 Data Persistence Flow

```
🔄 DATABASE OPERATIONS FLOW

Sensor Reading ──▶ Data Parser ──▶ Database Insert ──▶ Live Stream

┌─────────────────────────────────────────────────────────────────────┐
│                    Database Write Operations                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 📡 Device Connection:                                               │
│ INSERT INTO devices (device_id, name, type, protocol, is_connected) │
│ VALUES ('12:34:56:78:90:AB', 'Wahoo TICKR', 'heart_rate',         │
│         'bluetooth', true);                                         │
│                                                                     │
│ 📊 Sensor Data (every second):                                     │
│ INSERT INTO sensor_data (device_id, session_id, metric_type,       │
│                         value, unit, raw_data)                     │
│ VALUES ('12:34:56:78:90:AB', 'session-uuid-123', 'heart_rate',    │
│         165.0, 'bpm', '{"deviceId": "12:34", "heartRate": 165}');  │
│                                                                     │
│ 🏃 Session Management:                                              │
│ INSERT INTO sessions (id, name, start_time, status)                │
│ VALUES ('cuid-session-123', 'Morning Ride',                       │
│         '2025-01-15 08:00:00', 'active');                         │
│                                                                     │
│ 📈 Session Analytics (on completion):                              │
│ UPDATE sessions SET                                                 │
│   end_time = '2025-01-15 09:30:00',                               │
│   duration = 5400,                                                 │
│   avg_heart_rate = (SELECT AVG(value) FROM sensor_data            │
│                     WHERE session_id = 'session-123'              │
│                     AND metric_type = 'heart_rate'),              │
│   status = 'completed'                                             │
│ WHERE id = 'session-123';                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 📊 Query Patterns

### Common Queries

#### Get Live Session Data
```typescript
// Get current active session with latest metrics
const getCurrentSession = async () => {
  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.status, 'active'))
    .limit(1);
    
  const latestData = await db
    .select()
    .from(sensorData)
    .where(eq(sensorData.sessionId, session.id))
    .orderBy(desc(sensorData.timestamp))
    .limit(10);
    
  return { session, latestData };
};
```

#### Get Device History
```typescript
// Get all data for a specific device in the last hour
const getDeviceHistory = async (deviceId: string) => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  return await db
    .select()
    .from(sensorData)
    .where(
      and(
        eq(sensorData.deviceId, deviceId),
        gte(sensorData.timestamp, oneHourAgo)
      )
    )
    .orderBy(asc(sensorData.timestamp));
};
```

#### Session Analytics
```typescript
// Calculate session statistics
const getSessionStats = async (sessionId: string) => {
  return await db
    .select({
      avgHeartRate: avg(sensorData.value).where(eq(sensorData.metricType, 'heart_rate')),
      maxPower: max(sensorData.value).where(eq(sensorData.metricType, 'power')),
      avgCadence: avg(sensorData.value).where(eq(sensorData.metricType, 'cadence')),
      dataPoints: count(sensorData.id),
    })
    .from(sensorData)
    .where(eq(sensorData.sessionId, sessionId));
};
```

## 💾 Database Management

### Initialization
```typescript
// src/database/db.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

const sqlite = new Database('ultibiker.db');
export const db = drizzle(sqlite, { schema });

export async function initializeDatabase() {
  // Run migrations
  await migrate(db, { migrationsFolder: './drizzle' });
  
  // Enable WAL mode for better concurrency
  sqlite.pragma('journal_mode = WAL');
  
  // Enable foreign keys
  sqlite.pragma('foreign_keys = ON');
  
  console.log('Database initialized successfully');
}
```

### Migration Strategy
```bash
# Generate migration
bunx drizzle-kit generate:sqlite

# Apply migration
bunx drizzle-kit push:sqlite

# View database
bunx drizzle-kit studio
```

## 🗂️ Data Retention Policy

### Automatic Cleanup
```typescript
// Clean old sensor data (keep last 30 days)
const cleanupOldData = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  await db
    .delete(sensorData)
    .where(lt(sensorData.timestamp, thirtyDaysAgo));
    
  console.log('Old data cleaned up');
};

// Archive completed sessions older than 6 months
const archiveOldSessions = async () => {
  const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
  
  // Export to JSON before deletion
  const oldSessions = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.status, 'completed'),
        lt(sessions.startTime, sixMonthsAgo)
      )
    );
    
  // Save to archive files...
  
  await db
    .delete(sessions)
    .where(lt(sessions.startTime, sixMonthsAgo));
};
```

This database schema provides a robust foundation for storing and querying cycling sensor data while maintaining performance and data integrity.