import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Client } from 'socket.io-client';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../../src/database/schema.js';
import { createDeviceRoutes } from '../../src/api/devices.js';
import { createSessionRoutes } from '../../src/api/sessions.js';
import { createPermissionRoutes } from '../../src/api/permissions.js';

// Mock sensor manager for integration tests
const mockSensorManager = {
  checkPermissions: vi.fn(),
  getPermissionGuide: vi.fn(),
  getPermissionInstructions: vi.fn(),
  startScanning: vi.fn(),
  stopScanning: vi.fn(),
  connectDevice: vi.fn(),
  disconnectDevice: vi.fn(),
  getStatus: vi.fn(),
  on: vi.fn(),
  emit: vi.fn()
};

// Mock session manager
const mockSessionManager = {
  startSession: vi.fn(),
  endSession: vi.fn(),
  getActiveSession: vi.fn(),
  getAllSessions: vi.fn(),
  getSessionData: vi.fn(),
  addSensorReading: vi.fn()
};

describe('Error Handling Integration Tests', () => {
  let app: express.Application;
  let server: Server;
  let io: SocketIOServer;
  let db: ReturnType<typeof drizzle>;
  let sqlite: Database.Database;
  let clientSocket: any;

  beforeEach(async () => {
    // Setup test database
    sqlite = new Database('./test-error-integration.db');
    db = drizzle(sqlite, { schema });
    await migrate(db, { migrationsFolder: './drizzle' });

    // Setup express app with error handling middleware
    app = express();
    app.use(express.json());

    // Custom error handling middleware
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Unhandled error:', err);
      
      if (res.headersSent) {
        return next(err);
      }

      // Determine error type and status code
      let statusCode = 500;
      let errorType = 'server_error';
      
      if (err.name === 'ValidationError') {
        statusCode = 400;
        errorType = 'validation_error';
      } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        errorType = 'auth_error';
      } else if (err.name === 'NotFoundError') {
        statusCode = 404;
        errorType = 'not_found_error';
      } else if (err.name === 'PermissionError') {
        statusCode = 403;
        errorType = 'permission_error';
      }

      res.status(statusCode).json({
        success: false,
        error: err.message || 'An unexpected error occurred',
        errorType,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      });
    });

    // Setup API routes
    app.use('/api/devices', createDeviceRoutes(mockSensorManager as any));
    app.use('/api/sessions', createSessionRoutes());
    app.use('/api/permissions', createPermissionRoutes(mockSensorManager as any));

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Setup Socket.IO server
    server = app.listen(0);
    const port = (server.address() as any)?.port;
    io = new SocketIOServer(server, {
      cors: { origin: "*", methods: ["GET", "POST"] }
    });

    // Setup Socket.IO handlers with error handling
    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Handle scanning requests
      socket.on('start-scanning', async (callback) => {
        try {
          const result = await mockSensorManager.startScanning();
          if (callback) callback({ success: true, data: result });
        } catch (error: any) {
          console.error('Scan start error:', error);
          if (callback) callback({ 
            success: false, 
            error: error.message,
            errorType: 'scan_error'
          });
          socket.emit('error', {
            type: 'scan_error',
            message: error.message,
            timestamp: new Date().toISOString()
          });
        }
      });

      socket.on('stop-scanning', async (callback) => {
        try {
          const result = await mockSensorManager.stopScanning();
          if (callback) callback({ success: true, data: result });
        } catch (error: any) {
          console.error('Scan stop error:', error);
          if (callback) callback({ 
            success: false, 
            error: error.message,
            errorType: 'scan_error'
          });
        }
      });

      // Handle device connection requests
      socket.on('connect-device', async (deviceId, callback) => {
        try {
          const result = await mockSensorManager.connectDevice(deviceId);
          if (callback) callback({ success: true, data: result });
          
          socket.emit('device-status', {
            deviceId,
            status: 'connected',
            timestamp: new Date().toISOString()
          });
        } catch (error: any) {
          console.error('Device connection error:', error);
          if (callback) callback({ 
            success: false, 
            error: error.message,
            errorType: 'device_error'
          });
        }
      });

      socket.on('disconnect-device', async (deviceId, callback) => {
        try {
          const result = await mockSensorManager.disconnectDevice(deviceId);
          if (callback) callback({ success: true, data: result });
          
          socket.emit('device-status', {
            deviceId,
            status: 'disconnected',
            timestamp: new Date().toISOString()
          });
        } catch (error: any) {
          console.error('Device disconnection error:', error);
          if (callback) callback({ 
            success: false, 
            error: error.message,
            errorType: 'device_error'
          });
        }
      });

      // Handle session requests
      socket.on('start-session', async (data, callback) => {
        try {
          const result = await mockSessionManager.startSession(data.name);
          if (callback) callback({ success: true, sessionId: result });
          
          socket.emit('session-started', {
            sessionId: result,
            sessionName: data.name,
            timestamp: new Date().toISOString()
          });
        } catch (error: any) {
          console.error('Session start error:', error);
          if (callback) callback({ 
            success: false, 
            error: error.message,
            errorType: 'session_error'
          });
        }
      });

      socket.on('stop-session', async (data, callback) => {
        try {
          const result = await mockSessionManager.endSession(data.sessionId);
          if (callback) callback({ success: true, data: result });
          
          socket.emit('session-stopped', {
            sessionId: data.sessionId,
            timestamp: new Date().toISOString()
          });
        } catch (error: any) {
          console.error('Session stop error:', error);
          if (callback) callback({ 
            success: false, 
            error: error.message,
            errorType: 'session_error'
          });
        }
      });

      // Handle status requests
      socket.on('get-status', async (callback) => {
        try {
          const status = await mockSensorManager.getStatus();
          if (callback) callback({ success: true, status });
        } catch (error: any) {
          console.error('Status error:', error);
          if (callback) callback({ 
            success: false, 
            error: error.message,
            errorType: 'status_error'
          });
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
        socket.emit('error', {
          type: 'socket_error',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      });
    });

    // Setup client socket for testing
    clientSocket = new (require('socket.io-client').io)(`http://localhost:${port}`, {
      forceNew: true,
      transports: ['websocket']
    });

    await new Promise<void>((resolve) => {
      clientSocket.on('connect', resolve);
    });
  });

  afterEach(async () => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    if (io) {
      io.close();
    }
    if (server) {
      server.close();
    }
    if (sqlite) {
      sqlite.close();
    }
    vi.clearAllMocks();
  });

  describe('API Error Handling', () => {
    it('should handle validation errors in device creation', async () => {
      const invalidDevice = {
        name: 'Test Device',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/devices')
        .send(invalidDevice)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Missing required fields'),
        errorType: expect.any(String),
        timestamp: expect.any(String)
      });
    });

    it('should handle database errors gracefully', async () => {
      // Close database to force an error
      sqlite.close();

      const response = await request(app)
        .get('/api/devices')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String),
        errorType: 'server_error',
        timestamp: expect.any(String)
      });
    });

    it('should handle permission errors', async () => {
      mockSensorManager.checkPermissions.mockRejectedValue(
        Object.assign(new Error('Permission denied'), { name: 'PermissionError' })
      );

      const response = await request(app)
        .get('/api/permissions/status')
        .expect(403);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Permission denied',
        errorType: 'permission_error',
        timestamp: expect.any(String)
      });
    });

    it('should include stack trace in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockSensorManager.checkPermissions.mockRejectedValue(
        new Error('Test error with stack')
      );

      const response = await request(app)
        .get('/api/permissions/status')
        .expect(500);

      expect(response.body).toHaveProperty('stack');
      expect(response.body.stack).toContain('Test error with stack');

      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockSensorManager.checkPermissions.mockRejectedValue(
        new Error('Test error')
      );

      const response = await request(app)
        .get('/api/permissions/status')
        .expect(500);

      expect(response.body).not.toHaveProperty('stack');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('WebSocket Error Handling', () => {
    it('should handle scan errors via WebSocket', (done) => {
      mockSensorManager.startScanning.mockRejectedValue(
        new Error('Bluetooth adapter not found')
      );

      clientSocket.emit('start-scanning', (response: any) => {
        expect(response).toMatchObject({
          success: false,
          error: 'Bluetooth adapter not found',
          errorType: 'scan_error'
        });
        done();
      });
    });

    it('should handle device connection errors via WebSocket', (done) => {
      mockSensorManager.connectDevice.mockRejectedValue(
        new Error('Device not in pairing mode')
      );

      clientSocket.emit('connect-device', 'test-device', (response: any) => {
        expect(response).toMatchObject({
          success: false,
          error: 'Device not in pairing mode',
          errorType: 'device_error'
        });
        done();
      });
    });

    it('should handle session start errors via WebSocket', (done) => {
      mockSessionManager.startSession.mockRejectedValue(
        new Error('Database connection failed')
      );

      clientSocket.emit('start-session', { name: 'Test Session' }, (response: any) => {
        expect(response).toMatchObject({
          success: false,
          error: 'Database connection failed',
          errorType: 'session_error'
        });
        done();
      });
    });

    it('should emit error events for critical failures', (done) => {
      mockSensorManager.startScanning.mockRejectedValue(
        new Error('Critical hardware failure')
      );

      clientSocket.on('error', (error: any) => {
        expect(error).toMatchObject({
          type: 'scan_error',
          message: 'Critical hardware failure',
          timestamp: expect.any(String)
        });
        done();
      });

      clientSocket.emit('start-scanning');
    });

    it('should handle status request errors', (done) => {
      mockSensorManager.getStatus.mockRejectedValue(
        new Error('Status unavailable')
      );

      clientSocket.emit('get-status', (response: any) => {
        expect(response).toMatchObject({
          success: false,
          error: 'Status unavailable',
          errorType: 'status_error'
        });
        done();
      });
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should recover from temporary database errors', async () => {
      // First request fails
      sqlite.close();
      
      let response = await request(app)
        .get('/api/devices')
        .expect(500);

      expect(response.body.success).toBe(false);

      // Recreate database connection
      sqlite = new Database('./test-error-integration.db');
      db = drizzle(sqlite, { schema });
      await migrate(db, { migrationsFolder: './drizzle' });

      // Second request should succeed
      response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String)
      });
    });

    it('should handle sensor manager recovery', async () => {
      // Mock initial failure
      mockSensorManager.startScanning.mockRejectedValueOnce(
        new Error('Temporary hardware error')
      );

      // First attempt fails
      await new Promise<void>((resolve) => {
        clientSocket.emit('start-scanning', (response: any) => {
          expect(response.success).toBe(false);
          resolve();
        });
      });

      // Mock successful recovery
      mockSensorManager.startScanning.mockResolvedValueOnce({
        scanning: true,
        devicesFound: 0
      });

      // Second attempt succeeds
      await new Promise<void>((resolve) => {
        clientSocket.emit('start-scanning', (response: any) => {
          expect(response.success).toBe(true);
          expect(response.data).toMatchObject({
            scanning: true,
            devicesFound: 0
          });
          resolve();
        });
      });
    });

    it('should handle graceful session management errors', async () => {
      // Start a session successfully
      mockSessionManager.startSession.mockResolvedValueOnce('session-123');

      await new Promise<void>((resolve) => {
        clientSocket.emit('start-session', { name: 'Test Session' }, (response: any) => {
          expect(response.success).toBe(true);
          expect(response.sessionId).toBe('session-123');
          resolve();
        });
      });

      // Mock session stop error (session already ended)
      mockSessionManager.endSession.mockRejectedValueOnce(
        new Error('Session not found or already ended')
      );

      await new Promise<void>((resolve) => {
        clientSocket.emit('stop-session', { sessionId: 'session-123' }, (response: any) => {
          expect(response.success).toBe(false);
          expect(response.error).toContain('Session not found');
          resolve();
        });
      });
    });
  });

  describe('Error Logging and Monitoring', () => {
    it('should log errors with sufficient detail', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockSensorManager.checkPermissions.mockRejectedValue(
        new Error('Test logging error')
      );

      await request(app)
        .get('/api/permissions/status')
        .expect(500);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Unhandled error:',
        expect.objectContaining({
          message: 'Test logging error'
        })
      );

      consoleSpy.mockRestore();
    });

    it('should provide error context in responses', async () => {
      mockSensorManager.startScanning.mockRejectedValue(
        new Error('Hardware initialization failed')
      );

      await new Promise<void>((resolve) => {
        clientSocket.emit('start-scanning', (response: any) => {
          expect(response).toMatchObject({
            success: false,
            error: 'Hardware initialization failed',
            errorType: 'scan_error'
          });
          
          // Should provide actionable error information
          expect(response.error).toBeTruthy();
          expect(response.errorType).toBeTruthy();
          
          resolve();
        });
      });
    });

    it('should handle multiple concurrent errors', async () => {
      const errors = [
        'Device 1 connection failed',
        'Device 2 connection failed', 
        'Device 3 connection failed'
      ];

      const promises = errors.map((errorMessage, index) => {
        mockSensorManager.connectDevice.mockRejectedValueOnce(
          new Error(errorMessage)
        );

        return new Promise<any>((resolve) => {
          clientSocket.emit('connect-device', `device-${index}`, (response: any) => {
            resolve(response);
          });
        });
      });

      const responses = await Promise.all(promises);

      responses.forEach((response, index) => {
        expect(response).toMatchObject({
          success: false,
          error: errors[index],
          errorType: 'device_error'
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed WebSocket messages', (done) => {
      // Send malformed data that might cause parsing errors
      clientSocket.emit('start-scanning', 'invalid-callback-parameter', (response: any) => {
        // Should handle gracefully even with malformed input
        expect(response).toMatchObject({
          success: false,
          error: expect.any(String)
        });
        done();
      });
    });

    it('should handle null/undefined error messages', async () => {
      mockSensorManager.checkPermissions.mockRejectedValue(
        new Error() // Empty error message
      );

      const response = await request(app)
        .get('/api/permissions/status')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String), // Should provide fallback error message
        errorType: 'server_error'
      });
    });

    it('should handle very long error messages', async () => {
      const longError = 'A'.repeat(10000); // Very long error message
      
      mockSensorManager.checkPermissions.mockRejectedValue(
        new Error(longError)
      );

      const response = await request(app)
        .get('/api/permissions/status')
        .expect(500);

      expect(response.body.error).toBe(longError);
      expect(response.headers['content-length']).toBeDefined();
    });
  });
});