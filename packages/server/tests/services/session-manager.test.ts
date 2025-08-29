import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import * as schema from '../../src/database/schema.js';

const { sessions, sensorData, devices } = schema;

// Mock session manager (to be implemented)
export class SessionManager {
  private db: ReturnType<typeof drizzle>;
  private currentSessionId: string | null = null;

  constructor(database: ReturnType<typeof drizzle>) {
    this.db = database;
  }

  async startSession(name?: string): Promise<string> {
    const session = await this.db.insert(sessions).values({
      name: name || 'New Ride Session',
      status: 'active'
    }).returning();

    this.currentSessionId = session[0].id;
    return session[0].id;
  }

  async endSession(sessionId: string): Promise<void> {
    const endTime = new Date();
    const sessionData = await this.getSessionData(sessionId);
    
    const updates = {
      endTime,
      duration: Math.floor((endTime.getTime() - sessionData.startTime.getTime()) / 1000),
      status: 'completed' as const,
      ...await this.calculateSessionMetrics(sessionId)
    };

    await this.db
      .update(sessions)
      .set(updates)
      .where(eq(sessions.id, sessionId));

    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }
  }

  async pauseSession(sessionId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ status: 'paused' })
      .where(eq(sessions.id, sessionId));
  }

  async resumeSession(sessionId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ status: 'active' })
      .where(eq(sessions.id, sessionId));
  }

  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  async getActiveSession(): Promise<typeof sessions.$inferSelect | null> {
    const activeSessions = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.status, 'active'))
      .limit(1);

    return activeSessions[0] || null;
  }

  async getSessionData(sessionId: string): Promise<typeof sessions.$inferSelect> {
    const session = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (!session[0]) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return session[0];
  }

  async addSensorReading(reading: {
    deviceId: string;
    sessionId: string;
    metricType: 'heart_rate' | 'power' | 'cadence' | 'speed';
    value: number;
    unit: string;
    quality: number;
    timestamp: Date;
    rawData?: any;
  }): Promise<void> {
    await this.db.insert(sensorData).values(reading);
  }

  private async calculateSessionMetrics(sessionId: string) {
    // Get all sensor data for this session
    const sessionReadings = await this.db
      .select()
      .from(sensorData)
      .where(eq(sensorData.sessionId, sessionId));

    const metrics = {
      avgHeartRate: null as number | null,
      maxHeartRate: null as number | null,
      avgPower: null as number | null,
      maxPower: null as number | null,
      avgCadence: null as number | null,
      avgSpeed: null as number | null,
      maxSpeed: null as number | null
    };

    // Calculate heart rate metrics
    const hrReadings = sessionReadings.filter(r => r.metricType === 'heart_rate');
    if (hrReadings.length > 0) {
      metrics.avgHeartRate = hrReadings.reduce((sum, r) => sum + r.value, 0) / hrReadings.length;
      metrics.maxHeartRate = Math.max(...hrReadings.map(r => r.value));
    }

    // Calculate power metrics
    const powerReadings = sessionReadings.filter(r => r.metricType === 'power');
    if (powerReadings.length > 0) {
      metrics.avgPower = powerReadings.reduce((sum, r) => sum + r.value, 0) / powerReadings.length;
      metrics.maxPower = Math.max(...powerReadings.map(r => r.value));
    }

    // Calculate cadence metrics
    const cadenceReadings = sessionReadings.filter(r => r.metricType === 'cadence');
    if (cadenceReadings.length > 0) {
      metrics.avgCadence = cadenceReadings.reduce((sum, r) => sum + r.value, 0) / cadenceReadings.length;
    }

    // Calculate speed metrics
    const speedReadings = sessionReadings.filter(r => r.metricType === 'speed');
    if (speedReadings.length > 0) {
      metrics.avgSpeed = speedReadings.reduce((sum, r) => sum + r.value, 0) / speedReadings.length;
      metrics.maxSpeed = Math.max(...speedReadings.map(r => r.value));
    }

    return metrics;
  }
}

describe('SessionManager', () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: Database.Database;
  let sessionManager: SessionManager;

  beforeEach(async () => {
    sqlite = new Database('./test-ultibiker.db');
    db = drizzle(sqlite, { schema });
    await migrate(db, { migrationsFolder: './drizzle' });
    
    sessionManager = new SessionManager(db);
  });

  afterEach(() => {
    sqlite.close();
  });

  describe('Session Lifecycle', () => {
    it('should start a new session with default name', async () => {
      const sessionId = await sessionManager.startSession();

      expect(sessionId).toBeTypeOf('string');
      expect(sessionId).toHaveLength(24); // CUID2 length

      const session = await sessionManager.getSessionData(sessionId);
      expect(session.name).toBe('New Ride Session');
      expect(session.status).toBe('active');
      expect(session.startTime).toBeInstanceOf(Date);
      expect(session.endTime).toBeNull();
    });

    it('should start a new session with custom name', async () => {
      const sessionId = await sessionManager.startSession('Morning Training Ride');

      const session = await sessionManager.getSessionData(sessionId);
      expect(session.name).toBe('Morning Training Ride');
    });

    it('should track current session ID', async () => {
      expect(sessionManager.getCurrentSessionId()).toBeNull();

      const sessionId = await sessionManager.startSession();
      expect(sessionManager.getCurrentSessionId()).toBe(sessionId);
    });

    it('should get active session', async () => {
      const sessionId = await sessionManager.startSession();
      
      const activeSession = await sessionManager.getActiveSession();
      expect(activeSession).not.toBeNull();
      expect(activeSession?.id).toBe(sessionId);
      expect(activeSession?.status).toBe('active');
    });

    it('should return null when no active session exists', async () => {
      const activeSession = await sessionManager.getActiveSession();
      expect(activeSession).toBeNull();
    });
  });

  describe('Session State Management', () => {
    let sessionId: string;

    beforeEach(async () => {
      sessionId = await sessionManager.startSession('Test Session');
    });

    it('should pause an active session', async () => {
      await sessionManager.pauseSession(sessionId);

      const session = await sessionManager.getSessionData(sessionId);
      expect(session.status).toBe('paused');
    });

    it('should resume a paused session', async () => {
      await sessionManager.pauseSession(sessionId);
      await sessionManager.resumeSession(sessionId);

      const session = await sessionManager.getSessionData(sessionId);
      expect(session.status).toBe('active');
    });

    it('should end a session and calculate duration', async () => {
      // Wait a bit to ensure duration > 0
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await sessionManager.endSession(sessionId);

      const session = await sessionManager.getSessionData(sessionId);
      expect(session.status).toBe('completed');
      expect(session.endTime).toBeInstanceOf(Date);
      expect(session.duration).toBeGreaterThan(0);
      expect(sessionManager.getCurrentSessionId()).toBeNull();
    });

    it('should throw error when getting non-existent session', async () => {
      await expect(
        sessionManager.getSessionData('non-existent-session')
      ).rejects.toThrow('Session not found');
    });
  });

  describe('Sensor Data Integration', () => {
    let sessionId: string;
    let deviceId: string;

    beforeEach(async () => {
      // Create test device
      const device = await db.insert(devices).values({
        deviceId: 'test-sensor-device',
        name: 'Test Heart Rate Monitor',
        type: 'heart_rate',
        protocol: 'bluetooth'
      }).returning();
      deviceId = device[0].deviceId;

      sessionId = await sessionManager.startSession('Sensor Test Session');
    });

    it('should add sensor readings to session', async () => {
      const reading = {
        deviceId,
        sessionId,
        metricType: 'heart_rate' as const,
        value: 165,
        unit: 'bpm',
        quality: 95,
        timestamp: new Date(),
        rawData: { heartRate: 165, contactDetected: true }
      };

      await sessionManager.addSensorReading(reading);

      // Verify reading was stored
      const readings = await db
        .select()
        .from(sensorData)
        .where(eq(sensorData.sessionId, sessionId));

      expect(readings).toHaveLength(1);
      expect(readings[0]).toMatchObject({
        deviceId,
        sessionId,
        metricType: 'heart_rate',
        value: 165,
        unit: 'bpm',
        quality: 95
      });
    });

    it('should calculate session metrics when ending session', async () => {
      // Add multiple sensor readings
      const readings = [
        { metricType: 'heart_rate' as const, value: 160, unit: 'bpm' },
        { metricType: 'heart_rate' as const, value: 170, unit: 'bpm' },
        { metricType: 'heart_rate' as const, value: 165, unit: 'bpm' },
        { metricType: 'power' as const, value: 200, unit: 'watts' },
        { metricType: 'power' as const, value: 250, unit: 'watts' },
        { metricType: 'power' as const, value: 300, unit: 'watts' },
        { metricType: 'cadence' as const, value: 85, unit: 'rpm' },
        { metricType: 'cadence' as const, value: 90, unit: 'rpm' },
        { metricType: 'speed' as const, value: 30, unit: 'km/h' },
        { metricType: 'speed' as const, value: 35, unit: 'km/h' }
      ];

      for (const reading of readings) {
        await sessionManager.addSensorReading({
          deviceId,
          sessionId,
          ...reading,
          quality: 95,
          timestamp: new Date()
        });
      }

      await sessionManager.endSession(sessionId);

      const session = await sessionManager.getSessionData(sessionId);

      // Check calculated metrics
      expect(session.avgHeartRate).toBeCloseTo(165, 1); // (160+170+165)/3
      expect(session.maxHeartRate).toBe(170);
      expect(session.avgPower).toBeCloseTo(250, 1); // (200+250+300)/3
      expect(session.maxPower).toBe(300);
      expect(session.avgCadence).toBeCloseTo(87.5, 1); // (85+90)/2
      expect(session.avgSpeed).toBeCloseTo(32.5, 1); // (30+35)/2
      expect(session.maxSpeed).toBe(35);
    });

    it('should handle sessions with no sensor data', async () => {
      await sessionManager.endSession(sessionId);

      const session = await sessionManager.getSessionData(sessionId);

      expect(session.avgHeartRate).toBeNull();
      expect(session.maxHeartRate).toBeNull();
      expect(session.avgPower).toBeNull();
      expect(session.maxPower).toBeNull();
      expect(session.avgCadence).toBeNull();
      expect(session.avgSpeed).toBeNull();
      expect(session.maxSpeed).toBeNull();
    });

    it('should calculate partial metrics when only some sensor types present', async () => {
      // Add only heart rate readings
      const readings = [
        { metricType: 'heart_rate' as const, value: 150, unit: 'bpm' },
        { metricType: 'heart_rate' as const, value: 160, unit: 'bpm' }
      ];

      for (const reading of readings) {
        await sessionManager.addSensorReading({
          deviceId,
          sessionId,
          ...reading,
          quality: 95,
          timestamp: new Date()
        });
      }

      await sessionManager.endSession(sessionId);

      const session = await sessionManager.getSessionData(sessionId);

      expect(session.avgHeartRate).toBeCloseTo(155, 1);
      expect(session.maxHeartRate).toBe(160);
      expect(session.avgPower).toBeNull(); // No power data
      expect(session.maxPower).toBeNull();
      expect(session.avgCadence).toBeNull(); // No cadence data
    });
  });

  describe('Multiple Sessions', () => {
    it('should handle multiple sessions correctly', async () => {
      const session1Id = await sessionManager.startSession('Session 1');
      await sessionManager.endSession(session1Id);

      const session2Id = await sessionManager.startSession('Session 2');

      expect(session1Id).not.toBe(session2Id);
      expect(sessionManager.getCurrentSessionId()).toBe(session2Id);

      const session1 = await sessionManager.getSessionData(session1Id);
      const session2 = await sessionManager.getSessionData(session2Id);

      expect(session1.status).toBe('completed');
      expect(session2.status).toBe('active');
    });

    it('should only return active session when multiple sessions exist', async () => {
      const session1Id = await sessionManager.startSession('Completed Session');
      await sessionManager.endSession(session1Id);

      const session2Id = await sessionManager.startSession('Active Session');

      const activeSession = await sessionManager.getActiveSession();
      expect(activeSession?.id).toBe(session2Id);
      expect(activeSession?.name).toBe('Active Session');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      sqlite.close(); // Force database error

      await expect(
        sessionManager.startSession('Error Test')
      ).rejects.toThrow();
    });
  });
});