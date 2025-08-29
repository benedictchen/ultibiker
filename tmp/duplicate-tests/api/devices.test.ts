import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { eq } from 'drizzle-orm';
import * as schema from '../../src/database/schema.js';

const { devices } = schema;

// Mock devices API router (to be implemented)
function createDevicesRouter(db: ReturnType<typeof drizzle>) {
  const router = express.Router();
  
  // GET /api/devices - Get all devices
  router.get('/', async (req, res) => {
    try {
      const allDevices = await db.select().from(devices);
      res.json({
        success: true,
        data: allDevices,
        count: allDevices.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch devices'
      });
    }
  });

  // GET /api/devices/connected - Get only connected devices
  router.get('/connected', async (req, res) => {
    try {
      const connectedDevices = await db
        .select()
        .from(devices)
        .where(eq(devices.isConnected, true));
        
      res.json({
        success: true,
        data: connectedDevices,
        count: connectedDevices.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch connected devices'
      });
    }
  });

  // GET /api/devices/:deviceId - Get specific device
  router.get('/:deviceId', async (req, res) => {
    try {
      const { deviceId } = req.params;
      const device = await db
        .select()
        .from(devices)
        .where(eq(devices.deviceId, deviceId))
        .limit(1);

      if (device.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Device not found'
        });
      }

      res.json({
        success: true,
        data: device[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch device'
      });
    }
  });

  // POST /api/devices - Create/register new device
  router.post('/', async (req, res) => {
    try {
      const { deviceId, name, type, protocol, manufacturer, model } = req.body;

      // Validation
      if (!deviceId || !name || !type || !protocol) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: deviceId, name, type, protocol'
        });
      }

      const validTypes = ['heart_rate', 'power', 'cadence', 'speed', 'trainer'];
      const validProtocols = ['ant_plus', 'bluetooth'];

      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid device type'
        });
      }

      if (!validProtocols.includes(protocol)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid protocol'
        });
      }

      const newDevice = await db.insert(devices).values({
        deviceId,
        name,
        type,
        protocol,
        manufacturer,
        model
      }).returning();

      res.status(201).json({
        success: true,
        data: newDevice[0]
      });
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint failed')) {
        return res.status(409).json({
          success: false,
          error: 'Device already exists'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to create device'
      });
    }
  });

  // PUT /api/devices/:deviceId - Update device
  router.put('/:deviceId', async (req, res) => {
    try {
      const { deviceId } = req.params;
      const updateData = req.body;

      // Remove fields that shouldn't be updated
      delete updateData.id;
      delete updateData.deviceId;
      delete updateData.createdAt;
      
      const updatedDevice = await db
        .update(devices)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(devices.deviceId, deviceId))
        .returning();

      if (updatedDevice.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Device not found'
        });
      }

      res.json({
        success: true,
        data: updatedDevice[0]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update device'
      });
    }
  });

  // DELETE /api/devices/:deviceId - Delete device
  router.delete('/:deviceId', async (req, res) => {
    try {
      const { deviceId } = req.params;
      
      const deletedDevice = await db
        .delete(devices)
        .where(eq(devices.deviceId, deviceId))
        .returning();

      if (deletedDevice.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Device not found'
        });
      }

      res.json({
        success: true,
        message: 'Device deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete device'
      });
    }
  });

  return router;
}

describe('Devices API', () => {
  let app: express.Application;
  let db: ReturnType<typeof drizzle>;
  let sqlite: Database.Database;

  beforeEach(async () => {
    // Setup test database
    sqlite = new Database('./test-ultibiker.db');
    db = drizzle(sqlite, { schema });
    await migrate(db, { migrationsFolder: './drizzle' });

    // Setup express app
    app = express();
    app.use(express.json());
    app.use('/api/devices', createDevicesRouter(db));
  });

  afterEach(() => {
    sqlite.close();
  });

  describe('GET /api/devices', () => {
    it('should return empty array when no devices exist', async () => {
      const response = await request(app)
        .get('/api/devices')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [],
        count: 0
      });
    });

    it('should return all devices', async () => {
      // Insert test devices
      const testDevices = [
        {
          deviceId: 'hr-001',
          name: 'Heart Rate Monitor 1',
          type: 'heart_rate' as const,
          protocol: 'bluetooth' as const
        },
        {
          deviceId: 'power-001',
          name: 'Power Meter 1',
          type: 'power' as const,
          protocol: 'ant_plus' as const
        }
      ];

      for (const device of testDevices) {
        await db.insert(devices).values(device);
      }

      const response = await request(app)
        .get('/api/devices')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.count).toBe(2);
      expect(response.body.data.map((d: any) => d.deviceId)).toEqual(['hr-001', 'power-001']);
    });
  });

  describe('GET /api/devices/connected', () => {
    beforeEach(async () => {
      const testDevices = [
        {
          deviceId: 'connected-1',
          name: 'Connected Device 1',
          type: 'heart_rate' as const,
          protocol: 'bluetooth' as const,
          isConnected: true
        },
        {
          deviceId: 'disconnected-1',
          name: 'Disconnected Device 1',
          type: 'power' as const,
          protocol: 'ant_plus' as const,
          isConnected: false
        },
        {
          deviceId: 'connected-2',
          name: 'Connected Device 2',
          type: 'cadence' as const,
          protocol: 'bluetooth' as const,
          isConnected: true
        }
      ];

      for (const device of testDevices) {
        await db.insert(devices).values(device);
      }
    });

    it('should return only connected devices', async () => {
      const response = await request(app)
        .get('/api/devices/connected')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.count).toBe(2);
      
      const connectedDeviceIds = response.body.data.map((d: any) => d.deviceId);
      expect(connectedDeviceIds).toEqual(['connected-1', 'connected-2']);
      
      response.body.data.forEach((device: any) => {
        expect(device.isConnected).toBe(true);
      });
    });

    it('should return empty array when no devices are connected', async () => {
      // Update all devices to be disconnected
      await db.update(devices).set({ isConnected: false });

      const response = await request(app)
        .get('/api/devices/connected')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [],
        count: 0
      });
    });
  });

  describe('GET /api/devices/:deviceId', () => {
    beforeEach(async () => {
      await db.insert(devices).values({
        deviceId: 'test-device-123',
        name: 'Test Device',
        type: 'heart_rate' as const,
        protocol: 'bluetooth' as const,
        manufacturer: 'TestCorp',
        model: 'HR-1000'
      });
    });

    it('should return specific device by ID', async () => {
      const response = await request(app)
        .get('/api/devices/test-device-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        deviceId: 'test-device-123',
        name: 'Test Device',
        type: 'heart_rate',
        protocol: 'bluetooth',
        manufacturer: 'TestCorp',
        model: 'HR-1000'
      });
    });

    it('should return 404 for non-existent device', async () => {
      const response = await request(app)
        .get('/api/devices/non-existent-device')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Device not found'
      });
    });
  });

  describe('POST /api/devices', () => {
    it('should create a new device with valid data', async () => {
      const newDevice = {
        deviceId: 'new-device-001',
        name: 'New Test Device',
        type: 'power',
        protocol: 'ant_plus',
        manufacturer: 'TestCorp',
        model: 'PWR-2000'
      };

      const response = await request(app)
        .post('/api/devices')
        .send(newDevice)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        deviceId: 'new-device-001',
        name: 'New Test Device',
        type: 'power',
        protocol: 'ant_plus',
        manufacturer: 'TestCorp',
        model: 'PWR-2000',
        isConnected: false
      });
      expect(response.body.data.id).toBeTypeOf('number');
      expect(response.body.data.createdAt).toBeTypeOf('string');
    });

    it('should reject device with missing required fields', async () => {
      const incompleteDevice = {
        name: 'Incomplete Device',
        type: 'heart_rate'
        // Missing deviceId and protocol
      };

      const response = await request(app)
        .post('/api/devices')
        .send(incompleteDevice)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Missing required fields: deviceId, name, type, protocol'
      });
    });

    it('should reject device with invalid type', async () => {
      const invalidDevice = {
        deviceId: 'invalid-device',
        name: 'Invalid Device',
        type: 'invalid_type',
        protocol: 'bluetooth'
      };

      const response = await request(app)
        .post('/api/devices')
        .send(invalidDevice)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid device type'
      });
    });

    it('should reject device with invalid protocol', async () => {
      const invalidDevice = {
        deviceId: 'invalid-protocol-device',
        name: 'Invalid Protocol Device',
        type: 'heart_rate',
        protocol: 'invalid_protocol'
      };

      const response = await request(app)
        .post('/api/devices')
        .send(invalidDevice)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid protocol'
      });
    });

    it('should reject duplicate device ID', async () => {
      const device = {
        deviceId: 'duplicate-device',
        name: 'First Device',
        type: 'heart_rate',
        protocol: 'bluetooth'
      };

      // Create first device
      await request(app)
        .post('/api/devices')
        .send(device)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/devices')
        .send({
          ...device,
          name: 'Duplicate Device'
        })
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: 'Device already exists'
      });
    });
  });

  describe('PUT /api/devices/:deviceId', () => {
    beforeEach(async () => {
      await db.insert(devices).values({
        deviceId: 'update-test-device',
        name: 'Original Name',
        type: 'heart_rate' as const,
        protocol: 'bluetooth' as const,
        signalStrength: 50
      });
    });

    it('should update device fields', async () => {
      const updates = {
        name: 'Updated Name',
        signalStrength: 85,
        batteryLevel: 75,
        isConnected: true
      };

      const response = await request(app)
        .put('/api/devices/update-test-device')
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        deviceId: 'update-test-device',
        name: 'Updated Name',
        signalStrength: 85,
        batteryLevel: 75,
        isConnected: true
      });
      expect(response.body.data.updatedAt).toBeTypeOf('string');
    });

    it('should ignore protected fields in updates', async () => {
      const maliciousUpdates = {
        id: 999,
        deviceId: 'hacked-id',
        createdAt: '2020-01-01T00:00:00Z',
        name: 'Updated Name'
      };

      const response = await request(app)
        .put('/api/devices/update-test-device')
        .send(maliciousUpdates)
        .expect(200);

      expect(response.body.data.deviceId).toBe('update-test-device'); // Unchanged
      expect(response.body.data.name).toBe('Updated Name'); // Changed
      expect(response.body.data.id).not.toBe(999); // Protected
    });

    it('should return 404 for non-existent device', async () => {
      const response = await request(app)
        .put('/api/devices/non-existent-device')
        .send({ name: 'New Name' })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Device not found'
      });
    });
  });

  describe('DELETE /api/devices/:deviceId', () => {
    beforeEach(async () => {
      await db.insert(devices).values({
        deviceId: 'delete-test-device',
        name: 'Device to Delete',
        type: 'heart_rate' as const,
        protocol: 'bluetooth' as const
      });
    });

    it('should delete existing device', async () => {
      const response = await request(app)
        .delete('/api/devices/delete-test-device')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Device deleted successfully'
      });

      // Verify device was deleted
      const getResponse = await request(app)
        .get('/api/devices/delete-test-device')
        .expect(404);
    });

    it('should return 404 for non-existent device', async () => {
      const response = await request(app)
        .delete('/api/devices/non-existent-device')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Device not found'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Close database to force errors
      sqlite.close();

      const response = await request(app)
        .get('/api/devices')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch devices'
      });
    });
  });
});