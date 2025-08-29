import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
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
        enum: ['heart_rate', 'power', 'cadence', 'speed', 'trainer']
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
    compositeIdx: index('idx_sensor_data_composite').on(table.sessionId, table.timestamp, table.metricType),
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
//# sourceMappingURL=schema.js.map