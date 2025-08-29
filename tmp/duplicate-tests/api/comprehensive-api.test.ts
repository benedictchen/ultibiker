import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDeviceRoutes } from '../../src/api/devices.js';
import { createSessionRoutes } from '../../src/api/sessions.js';
import { createDataRoutes } from '../../src/api/data.js';
import { createPermissionRoutes } from '../../src/api/permissions.js';
import { MockDataGenerator, HardwareMocks, DatabaseTestUtils, APITestUtils } from '../utils/test-helpers.js';
import * as schema from '../../src/database/schema.js';

describe('API Integration Tests', () => {
  let app: express.Application;
  let db: ReturnType<typeof drizzle>;
  let mockSensorManager: any;

  beforeEach(async () => {
    // Create in-memory database
    const sqlite = new Database(':memory:');
    db = drizzle(sqlite, { schema });

    // Run migrations
    await migrate(db, { migrationsFolder: './drizzle' });

    // Create mock sensor manager
    mockSensorManager = HardwareMocks.createMockSensorManager({ enableHardware: true });

    // Create Express app with API routes
    app = express();
    app.use(express.json());
    
    // Mount API routes
    app.use('/api/devices', createDeviceRoutes(mockSensorManager));
    app.use('/api/sessions', createSessionRoutes());
    app.use('/api/data', createDataRoutes());
    app.use('/api/permissions', createPermissionRoutes(mockSensorManager));

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Device API', () => {
    describe('GET /api/devices', () => {
      it('should return empty list when no devices', async () => {
        const response = await request(app).get('/api/devices');

        APITestUtils.expectSuccessResponse(response);
        expect(response.body.data).toEqual([]);
        expect(response.body.count).toBe(0);
      });

      it('should return list of discovered devices', async () => {
        const mockDevices = [
          MockDataGenerator.createHeartRateMonitor(),
          MockDataGenerator.createPowerMeter()
        ];

        mockSensorManager.getDiscoveredDevices.mockReturnValue(mockDevices);

        const response = await request(app).get('/api/devices');

        APITestUtils.expectSuccessResponse(response);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.count).toBe(2);
      });

      it('should include device properties', async () => {
        const mockDevice = MockDataGenerator.createHeartRateMonitor({
          name: 'Polar H10',
          batteryLevel: 85,
          signalStrength: -65
        });

        mockSensorManager.getDiscoveredDevices.mockReturnValue([mockDevice]);

        const response = await request(app).get('/api/devices');

        const device = response.body.data[0];
        expect(device.name).toBe('Polar H10');
        expect(device.batteryLevel).toBe(85);
        expect(device.signalStrength).toBe(-65);
      });
    });

    describe('GET /api/devices/connected', () => {
      it('should return only connected devices', async () => {
        const connectedDevice = MockDataGenerator.createHeartRateMonitor({
          isConnected: true
        });
        const disconnectedDevice = MockDataGenerator.createPowerMeter({
          isConnected: false
        });

        mockSensorManager.getConnectedDevices.mockReturnValue([{
          deviceId: connectedDevice.id,
          protocol: connectedDevice.protocol,
          isConnected: true
        }]);

        const response = await request(app).get('/api/devices/connected');

        APITestUtils.expectSuccessResponse(response);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].deviceId).toBe(connectedDevice.id);
      });
    });

    describe('POST /api/devices/scan/start', () => {
      it('should start device scanning', async () => {
        const response = await request(app)
          .post('/api/devices/scan/start')
          .send({ timeout: 30000 });

        APITestUtils.expectSuccessResponse(response);
        expect(mockSensorManager.startScanning).toHaveBeenCalledWith(30000);
      });

      it('should use default timeout if not provided', async () => {
        const response = await request(app)
          .post('/api/devices/scan/start')
          .send({});

        APITestUtils.expectSuccessResponse(response);
        expect(mockSensorManager.startScanning).toHaveBeenCalledWith(undefined);
      });

      it('should handle scanning errors', async () => {
        mockSensorManager.startScanning.mockRejectedValue(new Error('Bluetooth not available'));

        const response = await request(app)
          .post('/api/devices/scan/start')
          .send({});

        APITestUtils.expectErrorResponse(response, 500, 'Bluetooth not available');
      });
    });

    describe('POST /api/devices/scan/stop', () => {
      it('should stop device scanning', async () => {
        const response = await request(app)
          .post('/api/devices/scan/stop')
          .send({});

        APITestUtils.expectSuccessResponse(response);
        expect(mockSensorManager.stopScanning).toHaveBeenCalled();
      });
    });

    describe('POST /api/devices/connect', () => {
      it('should connect to a device', async () => {
        const response = await request(app)
          .post('/api/devices/connect')
          .send({
            deviceId: 'test-device-123',
            protocol: 'bluetooth'
          });

        APITestUtils.expectSuccessResponse(response);
        expect(mockSensorManager.connectDevice).toHaveBeenCalledWith('test-device-123', 'bluetooth');
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/devices/connect')
          .send({ deviceId: 'test-device-123' }); // Missing protocol

        APITestUtils.expectErrorResponse(response, 400, 'Protocol is required');
      });

      it('should validate protocol values', async () => {
        const response = await request(app)
          .post('/api/devices/connect')
          .send({
            deviceId: 'test-device-123',
            protocol: 'invalid_protocol'
          });

        APITestUtils.expectErrorResponse(response, 400, 'Invalid protocol');
      });
    });

    describe('POST /api/devices/disconnect', () => {
      it('should disconnect from a device', async () => {
        const response = await request(app)
          .post('/api/devices/disconnect')
          .send({
            deviceId: 'test-device-123',
            protocol: 'bluetooth'
          });

        APITestUtils.expectSuccessResponse(response);
        expect(mockSensorManager.disconnectDevice).toHaveBeenCalledWith('test-device-123', 'bluetooth');
      });
    });

    describe('GET /api/devices/status', () => {
      it('should return device status', async () => {
        const mockStatus = {
          connected: [{ deviceId: 'device-1', protocol: 'bluetooth' }],
          scanning: true,
          protocols: {
            ant_plus: { connected: [], scanning: true },
            bluetooth: { connected: [{ deviceId: 'device-1' }], scanning: true }
          },
          devices: [
            { deviceId: 'device-1', lastActivity: new Date(), quality: 100 }
          ]
        };

        mockSensorManager.getDeviceStatus.mockReturnValue(mockStatus);

        const response = await request(app).get('/api/devices/status');

        APITestUtils.expectSuccessResponse(response, mockStatus);
      });
    });
  });

  describe('Session API', () => {
    describe('GET /api/sessions', () => {
      it('should return empty list when no sessions', async () => {
        const response = await request(app).get('/api/sessions');

        APITestUtils.expectSuccessResponse(response);
        expect(response.body.data).toEqual([]);
      });

      it('should return list of sessions', async () => {
        // Seed database with test sessions
        const testSessions = [
          MockDataGenerator.createSession(),
          MockDataGenerator.createCompletedSession()
        ];

        await DatabaseTestUtils.seedDatabase(db, { sessions: testSessions });

        const response = await request(app).get('/api/sessions');

        APITestUtils.expectSuccessResponse(response);
        expect(response.body.data).toHaveLength(2);
      });

      it('should support pagination', async () => {
        // Create many sessions
        const sessions = Array.from({ length: 25 }, () => MockDataGenerator.createSession());
        await DatabaseTestUtils.seedDatabase(db, { sessions });

        const response = await request(app)
          .get('/api/sessions')
          .query({ page: 2, limit: 10 });

        APITestUtils.expectSuccessResponse(response);
        expect(response.body.data).toHaveLength(10);
        expect(response.body.pagination.page).toBe(2);
        expect(response.body.pagination.totalPages).toBe(3);
      });

      it('should filter by status', async () => {
        const activeSessions = Array.from({ length: 3 }, () =>
          MockDataGenerator.createSession({ status: 'active' })
        );
        const completedSessions = Array.from({ length: 2 }, () =>
          MockDataGenerator.createCompletedSession()
        );

        await DatabaseTestUtils.seedDatabase(db, {
          sessions: [...activeSessions, ...completedSessions]
        });

        const response = await request(app)
          .get('/api/sessions')
          .query({ status: 'active' });

        APITestUtils.expectSuccessResponse(response);
        expect(response.body.data).toHaveLength(3);
        expect(response.body.data.every((s: any) => s.status === 'active')).toBe(true);
      });
    });

    describe('GET /api/sessions/:id', () => {
      it('should return specific session', async () => {
        const testSession = MockDataGenerator.createSession();
        await DatabaseTestUtils.seedDatabase(db, { sessions: [testSession] });

        const response = await request(app).get(`/api/sessions/${testSession.id}`);

        APITestUtils.expectSuccessResponse(response);
        expect(response.body.data.id).toBe(testSession.id);
        expect(response.body.data.name).toBe(testSession.name);
      });

      it('should return 404 for non-existent session', async () => {
        const response = await request(app).get('/api/sessions/non-existent-id');

        APITestUtils.expectErrorResponse(response, 404, 'Session not found');
      });

      it('should include session metrics', async () => {
        const testSession = MockDataGenerator.createCompletedSession({
          avgHeartRate: 165,
          avgPower: 225,
          distance: 25.5
        });
        await DatabaseTestUtils.seedDatabase(db, { sessions: [testSession] });

        const response = await request(app).get(`/api/sessions/${testSession.id}`);

        expect(response.body.data.avgHeartRate).toBe(165);
        expect(response.body.data.avgPower).toBe(225);
        expect(response.body.data.distance).toBe(25.5);
      });
    });

    describe('POST /api/sessions', () => {
      it('should create new session', async () => {
        const sessionData = {
          name: 'Morning Training Ride',
          description: 'Interval training session'
        };

        const response = await request(app)
          .post('/api/sessions')
          .send(sessionData);

        APITestUtils.expectSuccessResponse(response);
        expect(response.body.data.name).toBe(sessionData.name);
        expect(response.body.data.status).toBe('active');
        expect(response.body.data.startTime).toBeDefined();
      });

      it('should use default name if not provided', async () => {
        const response = await request(app)
          .post('/api/sessions')
          .send({});

        APITestUtils.expectSuccessResponse(response);
        expect(response.body.data.name).toContain('Session');
      });

      it('should validate name length', async () => {
        const response = await request(app)
          .post('/api/sessions')
          .send({ name: 'a'.repeat(256) }); // Too long

        APITestUtils.expectErrorResponse(response, 400, 'Name too long');
      });
    });

    describe('PUT /api/sessions/:id', () => {
      it('should update session', async () => {
        const testSession = MockDataGenerator.createSession();
        await DatabaseTestUtils.seedDatabase(db, { sessions: [testSession] });

        const updates = { name: 'Updated Session Name' };

        const response = await request(app)
          .put(`/api/sessions/${testSession.id}`)
          .send(updates);

        APITestUtils.expectSuccessResponse(response);
        expect(response.body.data.name).toBe(updates.name);
      });

      it('should return 404 for non-existent session', async () => {
        const response = await request(app)
          .put('/api/sessions/non-existent-id')
          .send({ name: 'Updated Name' });

        APITestUtils.expectErrorResponse(response, 404, 'Session not found');
      });
    });

    describe('POST /api/sessions/:id/end', () => {
      it('should end active session', async () => {
        const activeSession = MockDataGenerator.createSession({ status: 'active' });
        await DatabaseTestUtils.seedDatabase(db, { sessions: [activeSession] });

        const response = await request(app)
          .post(`/api/sessions/${activeSession.id}/end`)
          .send({});

        APITestUtils.expectSuccessResponse(response);
        expect(response.body.data.status).toBe('completed');
        expect(response.body.data.endTime).toBeDefined();
        expect(response.body.data.duration).toBeGreaterThan(0);
      });

      it('should calculate session metrics when ending', async () => {
        const activeSession = MockDataGenerator.createSession({ status: 'active' });
        const sensorReadings = MockDataGenerator.createSensorReadings(100, activeSession.id);
        
        await DatabaseTestUtils.seedDatabase(db, {
          sessions: [activeSession],
          sensorReadings
        });

        const response = await request(app)
          .post(`/api/sessions/${activeSession.id}/end`)
          .send({});

        expect(response.body.data.avgHeartRate).toBeGreaterThan(0);
        expect(response.body.data.avgPower).toBeGreaterThan(0);
      });
    });

    describe('DELETE /api/sessions/:id', () => {
      it('should delete session', async () => {
        const testSession = MockDataGenerator.createSession();
        await DatabaseTestUtils.seedDatabase(db, { sessions: [testSession] });

        const response = await request(app).delete(`/api/sessions/${testSession.id}`);

        APITestUtils.expectSuccessResponse(response);

        // Verify session is deleted
        const getResponse = await request(app).get(`/api/sessions/${testSession.id}`);
        expect(getResponse.status).toBe(404);
      });
    });
  });

  describe('Data API', () => {
    describe('GET /api/data/live', () => {
      it('should return latest sensor data', async () => {
        const recentReadings = MockDataGenerator.createSensorReadings(10);
        await DatabaseTestUtils.seedDatabase(db, { sensorReadings: recentReadings });

        const response = await request(app).get('/api/data/live');

        APITestUtils.expectSuccessResponse(response);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.latest).toBeDefined();
      });

      it('should support device filtering', async () => {
        const device1Readings = MockDataGenerator.createSensorReadings(5).map(r => ({
          ...r,
          deviceId: 'device-1'
        }));
        const device2Readings = MockDataGenerator.createSensorReadings(5).map(r => ({
          ...r,
          deviceId: 'device-2'
        }));

        await DatabaseTestUtils.seedDatabase(db, {
          sensorReadings: [...device1Readings, ...device2Readings]
        });

        const response = await request(app)
          .get('/api/data/live')
          .query({ deviceId: 'device-1' });

        APITestUtils.expectSuccessResponse(response);
        // All returned readings should be from device-1
        const readings = response.body.data.readings || [];
        expect(readings.every((r: any) => r.deviceId === 'device-1')).toBe(true);
      });

      it('should support metric type filtering', async () => {
        const heartRateReadings = MockDataGenerator.createSensorReadings(5).map(r => ({
          ...r,
          metricType: 'heart_rate'
        }));
        const powerReadings = MockDataGenerator.createSensorReadings(5).map(r => ({
          ...r,
          metricType: 'power'
        }));

        await DatabaseTestUtils.seedDatabase(db, {
          sensorReadings: [...heartRateReadings, ...powerReadings]
        });

        const response = await request(app)
          .get('/api/data/live')
          .query({ metricType: 'heart_rate' });

        APITestUtils.expectSuccessResponse(response);
        const readings = response.body.data.readings || [];
        expect(readings.every((r: any) => r.metricType === 'heart_rate')).toBe(true);
      });
    });

    describe('GET /api/data/session/:sessionId', () => {
      it('should return session data', async () => {
        const testSession = MockDataGenerator.createSession();
        const sessionReadings = MockDataGenerator.createSensorReadings(50, testSession.id);

        await DatabaseTestUtils.seedDatabase(db, {
          sessions: [testSession],
          sensorReadings: sessionReadings
        });

        const response = await request(app).get(`/api/data/session/${testSession.id}`);

        APITestUtils.expectSuccessResponse(response);
        expect(response.body.data.session.id).toBe(testSession.id);
        expect(response.body.data.readings).toHaveLength(50);
      });

      it('should calculate session statistics', async () => {
        const testSession = MockDataGenerator.createSession();
        const heartRateReadings = Array.from({ length: 20 }, (_, i) =>
          MockDataGenerator.createHeartRateReading({
            sessionId: testSession.id,
            value: 150 + i * 2, // 150-188 bpm
            timestamp: new Date(Date.now() + i * 1000)
          })
        );

        await DatabaseTestUtils.seedDatabase(db, {
          sessions: [testSession],
          sensorReadings: heartRateReadings
        });

        const response = await request(app).get(`/api/data/session/${testSession.id}`);

        expect(response.body.data.statistics).toBeDefined();
        expect(response.body.data.statistics.heartRate.avg).toBeCloseTo(169, 0);
        expect(response.body.data.statistics.heartRate.min).toBe(150);
        expect(response.body.data.statistics.heartRate.max).toBe(188);
      });

      it('should support time range filtering', async () => {
        const testSession = MockDataGenerator.createSession();
        const baseTime = Date.now();
        const readings = Array.from({ length: 60 }, (_, i) =>
          MockDataGenerator.createHeartRateReading({
            sessionId: testSession.id,
            timestamp: new Date(baseTime + i * 1000) // 1 reading per second for 60 seconds
          })
        );

        await DatabaseTestUtils.seedDatabase(db, {
          sessions: [testSession],
          sensorReadings: readings
        });

        const startTime = new Date(baseTime + 20000).toISOString(); // 20 seconds in
        const endTime = new Date(baseTime + 40000).toISOString(); // 40 seconds in

        const response = await request(app)
          .get(`/api/data/session/${testSession.id}`)
          .query({ startTime, endTime });

        // Should return only readings in the 20-40 second range
        expect(response.body.data.readings).toHaveLength(21); // Including both endpoints
      });
    });

    describe('POST /api/data/export', () => {
      it('should export session data as JSON', async () => {
        const testSession = MockDataGenerator.createCompletedSession();
        const readings = MockDataGenerator.createSensorReadings(100, testSession.id);

        await DatabaseTestUtils.seedDatabase(db, {
          sessions: [testSession],
          sensorReadings: readings
        });

        const response = await request(app)
          .post('/api/data/export')
          .send({
            sessionId: testSession.id,
            format: 'json'
          });

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('application/json');
        
        const exportData = response.body;
        expect(exportData.session).toBeDefined();
        expect(exportData.readings).toHaveLength(100);
      });

      it('should export session data as CSV', async () => {
        const testSession = MockDataGenerator.createCompletedSession();
        const readings = MockDataGenerator.createSensorReadings(50, testSession.id);

        await DatabaseTestUtils.seedDatabase(db, {
          sessions: [testSession],
          sensorReadings: readings
        });

        const response = await request(app)
          .post('/api/data/export')
          .send({
            sessionId: testSession.id,
            format: 'csv'
          });

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.text).toContain('timestamp,deviceId,metricType,value,unit');
      });

      it('should support TCX export format', async () => {
        const testSession = MockDataGenerator.createCompletedSession();
        const readings = [
          ...MockDataGenerator.createSensorReadings(20, testSession.id),
          ...Array.from({ length: 10 }, () =>
            MockDataGenerator.createSpeedReading({ sessionId: testSession.id })
          )
        ];

        await DatabaseTestUtils.seedDatabase(db, {
          sessions: [testSession],
          sensorReadings: readings
        });

        const response = await request(app)
          .post('/api/data/export')
          .send({
            sessionId: testSession.id,
            format: 'tcx'
          });

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('application/xml');
        expect(response.text).toContain('<TrainingCenterDatabase');
        expect(response.text).toContain('<Activity Sport="Biking">');
      });
    });
  });

  describe('Permissions API', () => {
    describe('GET /api/permissions/status', () => {
      it('should return permission status', async () => {
        const mockPermissionStatus = {
          bluetooth: { available: true, reason: 'Ready' },
          ant: { available: true, reason: 'Device detected' },
          platform: 'darwin'
        };

        // Mock the permission checking
        vi.spyOn(mockSensorManager, 'checkPermissions')
          .mockResolvedValue(mockPermissionStatus);

        const response = await request(app).get('/api/permissions/status');

        APITestUtils.expectSuccessResponse(response, mockPermissionStatus);
      });
    });

    describe('GET /api/permissions/guide', () => {
      it('should return platform-specific setup guide', async () => {
        const response = await request(app).get('/api/permissions/guide');

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/markdown');
        expect(response.text).toContain('# Setup Guide');
      });

      it('should include platform-specific instructions', async () => {
        // Mock process.platform
        Object.defineProperty(process, 'platform', { value: 'darwin' });

        const response = await request(app).get('/api/permissions/guide');

        expect(response.text).toContain('macOS');
        expect(response.text).toContain('System Preferences');
      });
    });

    describe('GET /api/permissions/instructions', () => {
      it('should return JSON instructions', async () => {
        const response = await request(app).get('/api/permissions/instructions');

        APITestUtils.expectSuccessResponse(response);
        expect(response.body.data.platform).toBeDefined();
        expect(response.body.data.bluetooth).toBeDefined();
        expect(response.body.data.ant).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      APITestUtils.expectErrorResponse(response, 400);
    });

    it('should handle missing Content-Type', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .send('not json');

      expect(response.status).toBe(400);
    });

    it('should handle database errors gracefully', async () => {
      // Close the database to simulate error
      (db as any).close?.();

      const response = await request(app).get('/api/sessions');

      APITestUtils.expectErrorResponse(response, 500);
    });

    it('should handle sensor manager errors', async () => {
      mockSensorManager.getDiscoveredDevices.mockImplementation(() => {
        throw new Error('Sensor manager error');
      });

      const response = await request(app).get('/api/devices');

      APITestUtils.expectErrorResponse(response, 500);
    });

    it('should validate request parameters', async () => {
      const response = await request(app)
        .get('/api/sessions')
        .query({ limit: -1 }); // Invalid limit

      APITestUtils.expectErrorResponse(response, 400, 'Invalid limit');
    });

    it('should handle rate limiting', async () => {
      // Make many requests quickly to trigger rate limiting
      const requests = Array.from({ length: 150 }, () =>
        request(app).get('/api/sessions')
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Security', () => {
    it('should set security headers', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    it('should sanitize error messages', async () => {
      // Try to trigger an error that might expose internal details
      const response = await request(app).get('/api/sessions/"><script>alert(1)</script>');

      expect(response.body.error).not.toContain('<script>');
      expect(response.body.error).not.toContain('alert');
    });

    it('should validate input sizes', async () => {
      const largePayload = { name: 'a'.repeat(10000) }; // Very large name

      const response = await request(app)
        .post('/api/sessions')
        .send(largePayload);

      APITestUtils.expectErrorResponse(response, 400);
    });
  });

  describe('Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      // Seed with test data
      const sessions = Array.from({ length: 100 }, () => MockDataGenerator.createSession());
      await DatabaseTestUtils.seedDatabase(db, { sessions });

      const startTime = performance.now();

      // Make 50 concurrent requests
      const requests = Array.from({ length: 50 }, () =>
        request(app).get('/api/sessions')
      );

      await Promise.all(requests);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle 50 concurrent requests in reasonable time
      expect(duration).toBeLessThan(5000); // Less than 5 seconds
    });

    it('should handle large result sets with pagination', async () => {
      // Create 1000 sessions
      const sessions = Array.from({ length: 1000 }, () => MockDataGenerator.createSession());
      await DatabaseTestUtils.seedDatabase(db, { sessions });

      const response = await request(app)
        .get('/api/sessions')
        .query({ limit: 50 });

      APITestUtils.expectSuccessResponse(response);
      expect(response.body.data).toHaveLength(50);
      expect(response.body.pagination.totalItems).toBe(1000);
    });
  });
});