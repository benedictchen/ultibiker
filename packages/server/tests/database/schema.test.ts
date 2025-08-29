import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq, and } from 'drizzle-orm';
import * as schema from '../../src/database/schema.js';

const { devices, sensorData, sessions } = schema;

describe('Database Schema', () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: Database.Database;

  beforeEach(async () => {
    sqlite = new Database('./test-ultibiker.db');
    db = drizzle(sqlite, { schema });
    
    // Apply migrations
    await migrate(db, { migrationsFolder: './drizzle' });
  });

  describe('Devices Table', () => {
    it('should create a device record with all fields', async () => {
      const newDevice = {
        deviceId: 'test-device-123',
        name: 'Test Heart Rate Monitor',
        type: 'heart_rate' as const,
        protocol: 'bluetooth' as const,
        isConnected: true,
        signalStrength: 85,
        batteryLevel: 78,
        manufacturer: 'TestCorp',
        model: 'HR-1000',
        firmwareVersion: '1.2.3'
      };

      const inserted = await db.insert(devices).values(newDevice).returning();
      expect(inserted).toHaveLength(1);
      expect(inserted[0]).toMatchObject({
        deviceId: 'test-device-123',
        name: 'Test Heart Rate Monitor',
        type: 'heart_rate',
        protocol: 'bluetooth'
      });
      expect(inserted[0].id).toBeTypeOf('number');
      expect(inserted[0].createdAt).toBeInstanceOf(Date);
    });

    it('should enforce unique device ID constraint', async () => {
      const device = {
        deviceId: 'duplicate-id',
        name: 'Device 1',
        type: 'heart_rate' as const,
        protocol: 'bluetooth' as const
      };

      await db.insert(devices).values(device);
      
      await expect(
        db.insert(devices).values({
          ...device,
          name: 'Device 2'
        })
      ).rejects.toThrow();
    });

    it('should validate sensor types', async () => {
      const device = {
        deviceId: 'test-device',
        name: 'Invalid Device',
        type: 'invalid_type' as any,
        protocol: 'bluetooth' as const
      };

      await expect(
        db.insert(devices).values(device)
      ).rejects.toThrow();
    });

    it('should validate protocols', async () => {
      const device = {
        deviceId: 'test-device',
        name: 'Invalid Device',
        type: 'heart_rate' as const,
        protocol: 'invalid_protocol' as any
      };

      await expect(
        db.insert(devices).values(device)
      ).rejects.toThrow();
    });

    it('should set default values correctly', async () => {
      const minimalDevice = {
        deviceId: 'minimal-device',
        name: 'Minimal Device',
        type: 'heart_rate' as const,
        protocol: 'bluetooth' as const
      };

      const inserted = await db.insert(devices).values(minimalDevice).returning();
      expect(inserted[0].isConnected).toBe(false);
      expect(inserted[0].signalStrength).toBe(0);
      expect(inserted[0].createdAt).toBeInstanceOf(Date);
      expect(inserted[0].updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Sessions Table', () => {
    it('should create a session with auto-generated ID', async () => {
      const newSession = {
        name: 'Morning Ride',
        status: 'active' as const
      };

      const inserted = await db.insert(sessions).values(newSession).returning();
      expect(inserted).toHaveLength(1);
      expect(inserted[0].id).toBeTypeOf('string');
      expect(inserted[0].id).toHaveLength(24); // CUID2 length
      expect(inserted[0].name).toBe('Morning Ride');
      expect(inserted[0].status).toBe('active');
      expect(inserted[0].startTime).toBeInstanceOf(Date);
    });

    it('should set default values for session', async () => {
      const inserted = await db.insert(sessions).values({}).returning();
      expect(inserted[0].name).toBe('Ride Session');
      expect(inserted[0].status).toBe('active');
      expect(inserted[0].startTime).toBeInstanceOf(Date);
      expect(inserted[0].createdAt).toBeInstanceOf(Date);
    });

    it('should validate session status', async () => {
      const session = {
        status: 'invalid_status' as any
      };

      await expect(
        db.insert(sessions).values(session)
      ).rejects.toThrow();
    });

    it('should store session metrics correctly', async () => {
      const sessionWithMetrics = {
        name: 'Test Session',
        avgHeartRate: 165.5,
        maxHeartRate: 189,
        avgPower: 250.0,
        maxPower: 420,
        distance: 25.7,
        duration: 3600 // 1 hour
      };

      const inserted = await db.insert(sessions).values(sessionWithMetrics).returning();
      expect(inserted[0].avgHeartRate).toBe(165.5);
      expect(inserted[0].maxHeartRate).toBe(189);
      expect(inserted[0].avgPower).toBe(250.0);
      expect(inserted[0].maxPower).toBe(420);
      expect(inserted[0].distance).toBe(25.7);
      expect(inserted[0].duration).toBe(3600);
    });
  });

  describe('Sensor Data Table', () => {
    let deviceId: string;
    let sessionId: string;

    beforeEach(async () => {
      // Create test device
      const device = await db.insert(devices).values({
        deviceId: 'test-device-sensor-data',
        name: 'Test Device',
        type: 'heart_rate' as const,
        protocol: 'bluetooth' as const
      }).returning();
      deviceId = device[0].deviceId;

      // Create test session
      const session = await db.insert(sessions).values({
        name: 'Test Session'
      }).returning();
      sessionId = session[0].id;
    });

    it('should create sensor data with foreign key relationships', async () => {
      const sensorReading = {
        deviceId,
        sessionId,
        metricType: 'heart_rate' as const,
        value: 165,
        unit: 'bpm',
        quality: 95,
        rawData: { heartRate: 165, contactDetected: true }
      };

      const inserted = await db.insert(sensorData).values(sensorReading).returning();
      expect(inserted).toHaveLength(1);
      expect(inserted[0]).toMatchObject({
        deviceId,
        sessionId,
        metricType: 'heart_rate',
        value: 165,
        unit: 'bpm',
        quality: 95
      });
      expect(inserted[0].timestamp).toBeInstanceOf(Date);
      expect(inserted[0].rawData).toEqual({ heartRate: 165, contactDetected: true });
    });

    it('should enforce foreign key constraints for device', async () => {
      const invalidReading = {
        deviceId: 'non-existent-device',
        sessionId,
        metricType: 'heart_rate' as const,
        value: 165,
        unit: 'bpm'
      };

      await expect(
        db.insert(sensorData).values(invalidReading)
      ).rejects.toThrow();
    });

    it('should enforce foreign key constraints for session', async () => {
      const invalidReading = {
        deviceId,
        sessionId: 'non-existent-session',
        metricType: 'heart_rate' as const,
        value: 165,
        unit: 'bpm'
      };

      await expect(
        db.insert(sensorData).values(invalidReading)
      ).rejects.toThrow();
    });

    it('should validate metric types', async () => {
      const invalidReading = {
        deviceId,
        sessionId,
        metricType: 'invalid_metric' as any,
        value: 165,
        unit: 'bpm'
      };

      await expect(
        db.insert(sensorData).values(invalidReading)
      ).rejects.toThrow();
    });

    it('should set default quality value', async () => {
      const reading = {
        deviceId,
        sessionId,
        metricType: 'power' as const,
        value: 250,
        unit: 'watts'
      };

      const inserted = await db.insert(sensorData).values(reading).returning();
      expect(inserted[0].quality).toBe(100);
    });

    it('should handle JSON data correctly', async () => {
      const complexRawData = {
        heartRate: 165,
        rrInterval: [850, 820, 840],
        contactDetected: true,
        energyExpended: 1250,
        metadata: {
          deviceTime: '2025-01-15T10:30:15Z',
          batteryLevel: 85
        }
      };

      const reading = {
        deviceId,
        sessionId,
        metricType: 'heart_rate' as const,
        value: 165,
        unit: 'bpm',
        rawData: complexRawData
      };

      const inserted = await db.insert(sensorData).values(reading).returning();
      expect(inserted[0].rawData).toEqual(complexRawData);
    });
  });

  describe('Database Indexes and Performance', () => {
    it('should query devices by connection status efficiently', async () => {
      // Insert test devices
      await db.insert(devices).values([
        { deviceId: 'device1', name: 'Device 1', type: 'heart_rate' as const, protocol: 'bluetooth' as const, isConnected: true },
        { deviceId: 'device2', name: 'Device 2', type: 'power' as const, protocol: 'ant_plus' as const, isConnected: false },
        { deviceId: 'device3', name: 'Device 3', type: 'cadence' as const, protocol: 'bluetooth' as const, isConnected: true }
      ]);

      const connectedDevices = await db
        .select()
        .from(devices)
        .where(eq(devices.isConnected, true));

      expect(connectedDevices).toHaveLength(2);
      expect(connectedDevices.map(d => d.deviceId)).toEqual(['device1', 'device3']);
    });

    it('should query sensor data by session and timestamp efficiently', async () => {
      // Setup test data
      const device = await db.insert(devices).values({
        deviceId: 'perf-test-device',
        name: 'Performance Test Device',
        type: 'heart_rate' as const,
        protocol: 'bluetooth' as const
      }).returning();

      const session = await db.insert(sessions).values({
        name: 'Performance Test Session'
      }).returning();

      const now = new Date();
      const readings = Array.from({ length: 100 }, (_, i) => ({
        deviceId: device[0].deviceId,
        sessionId: session[0].id,
        metricType: 'heart_rate' as const,
        value: 150 + Math.random() * 30,
        unit: 'bpm',
        timestamp: new Date(now.getTime() + i * 1000) // 1 second intervals
      }));

      await db.insert(sensorData).values(readings);

      // Query with composite index
      const recentReadings = await db
        .select()
        .from(sensorData)
        .where(
          and(
            eq(sensorData.sessionId, session[0].id),
            eq(sensorData.metricType, 'heart_rate')
          )
        )
        .orderBy(sensorData.timestamp)
        .limit(10);

      expect(recentReadings).toHaveLength(10);
      expect(recentReadings[0].value).toBeGreaterThan(140);
      expect(recentReadings[0].value).toBeLessThan(190);
    });
  });
});