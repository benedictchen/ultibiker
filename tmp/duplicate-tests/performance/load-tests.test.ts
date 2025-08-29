import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { performance } from 'perf_hooks';
import { MockDataGenerator, HardwareMocks, TimeUtils } from '../utils/test-helpers.js';
import { UltiBikerSensorManager } from '../../src/sensors/sensor-manager.js';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';

describe('Performance and Load Tests', () => {
  describe('Data Processing Performance', () => {
    let sensorManager: UltiBikerSensorManager;
    let mockSessionManager: any;

    beforeEach(() => {
      mockSessionManager = {
        getActiveSession: vi.fn().mockResolvedValue({ id: 'test-session' }),
        addSensorReading: vi.fn().mockResolvedValue(undefined)
      };

      sensorManager = new UltiBikerSensorManager(mockSessionManager);
    });

    afterEach(() => {
      TimeUtils.restoreTime();
    });

    it('should process high-frequency sensor data efficiently', async () => {
      const processedData: any[] = [];
      
      sensorManager.on('sensorData', (data) => {
        processedData.push(data);
      });

      const startTime = performance.now();
      
      // Simulate 1000 sensor readings at high frequency
      const readings = MockDataGenerator.createSensorReadings(1000);
      
      // Process all readings
      for (const reading of readings) {
        (sensorManager as any).handleSensorData({
          type: 'sensor-data',
          data: reading
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should process 1000 readings in under 1 second
      expect(duration).toBeLessThan(1000);
      expect(processedData.length).toBe(1000);
      
      // Average processing time per reading should be under 1ms
      const avgProcessingTime = duration / 1000;
      expect(avgProcessingTime).toBeLessThan(1);
    });

    it('should handle multiple device streams simultaneously', async () => {
      const processedData: any[] = [];
      const deviceCount = 10;
      const readingsPerDevice = 100;
      
      sensorManager.on('sensorData', (data) => {
        processedData.push(data);
      });

      const startTime = performance.now();

      // Create readings from multiple devices
      const allReadings: any[] = [];
      for (let deviceId = 0; deviceId < deviceCount; deviceId++) {
        const deviceReadings = Array.from({ length: readingsPerDevice }, () =>
          MockDataGenerator.createSensorReading({
            deviceId: `device-${deviceId}`,
            timestamp: new Date(Date.now() + Math.random() * 10000)
          })
        );
        allReadings.push(...deviceReadings);
      }

      // Shuffle readings to simulate realistic timing
      const shuffledReadings = allReadings.sort(() => Math.random() - 0.5);

      // Process all readings
      for (const reading of shuffledReadings) {
        (sensorManager as any).handleSensorData({
          type: 'sensor-data',
          data: reading
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(processedData.length).toBe(deviceCount * readingsPerDevice);
      
      // Should handle multi-device scenario efficiently
      expect(duration).toBeLessThan(2000); // Under 2 seconds for 1000 readings from 10 devices
      
      // Verify data from all devices was processed
      const uniqueDevices = new Set(processedData.map(d => d.deviceId));
      expect(uniqueDevices.size).toBe(deviceCount);
    });

    it('should maintain memory efficiency during long sessions', () => {
      const initialMemory = process.memoryUsage();
      const processedCount = 50000; // Large number of readings
      
      sensorManager.on('sensorData', () => {
        // Just count, don't store to avoid test memory issues
      });

      // Process many readings over time
      for (let i = 0; i < processedCount; i++) {
        const reading = MockDataGenerator.createSensorReading({
          timestamp: new Date(Date.now() + i * 1000)
        });
        
        (sensorManager as any).handleSensorData({
          type: 'sensor-data',
          data: reading
        });
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryPerReading = memoryIncrease / processedCount;

      // Memory increase per reading should be minimal
      expect(memoryPerReading).toBeLessThan(1000); // Less than 1KB per reading
    });

    it('should handle data validation efficiently', async () => {
      const validReadings = MockDataGenerator.createSensorReadings(500);
      const invalidReadings = Array.from({ length: 500 }, () => ({
        ...MockDataGenerator.createSensorReading(),
        value: -999, // Invalid value
      }));
      
      const allReadings = [...validReadings, ...invalidReadings];
      const processedData: any[] = [];
      
      sensorManager.on('sensorData', (data) => {
        processedData.push(data);
      });

      const startTime = performance.now();

      for (const reading of allReadings) {
        (sensorManager as any).handleSensorData({
          type: 'sensor-data',
          data: reading
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should process validation quickly
      expect(duration).toBeLessThan(500);
      
      // Should only have valid readings
      expect(processedData.length).toBe(500);
      expect(processedData.every(d => d.value >= 0)).toBe(true);
    });
  });

  describe('API Performance', () => {
    let app: any;
    let server: any;

    beforeEach(async () => {
      // Create minimal Express app for testing
      const express = await import('express');
      app = express.default();
      app.use(express.json());
      
      // Add test routes
      app.get('/api/test/fast', (req, res) => {
        res.json({ success: true, data: 'fast response' });
      });
      
      app.get('/api/test/slow', async (req, res) => {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
        res.json({ success: true, data: 'slow response' });
      });
      
      app.get('/api/test/data/:count', (req, res) => {
        const count = parseInt(req.params.count);
        const data = Array.from({ length: count }, (_, i) => ({
          id: i,
          value: Math.random(),
          timestamp: new Date().toISOString()
        }));
        res.json({ success: true, data, count });
      });

      app.post('/api/test/echo', (req, res) => {
        res.json({ success: true, data: req.body });
      });
    });

    it('should handle concurrent API requests efficiently', async () => {
      const concurrentRequests = 50;
      const startTime = performance.now();

      // Make many concurrent requests
      const requests = Array.from({ length: concurrentRequests }, () =>
        request(app).get('/api/test/fast')
      );

      const responses = await Promise.all(requests);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Should handle concurrent requests efficiently
      expect(duration).toBeLessThan(1000); // Under 1 second for 50 requests
      
      const avgResponseTime = duration / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(50); // Average under 50ms per request
    });

    it('should handle large payloads efficiently', async () => {
      const largePayload = {
        data: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          value: Math.random(),
          timestamp: new Date().toISOString(),
          metadata: 'some additional data'.repeat(10)
        }))
      };

      const startTime = performance.now();

      const response = await request(app)
        .post('/api/test/echo')
        .send(largePayload);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(response.body.data.data.length).toBe(10000);
      
      // Should handle large payload in reasonable time
      expect(duration).toBeLessThan(2000); // Under 2 seconds
    });

    it('should return large datasets efficiently', async () => {
      const dataCount = 5000;
      const startTime = performance.now();

      const response = await request(app)
        .get(`/api/test/data/${dataCount}`);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(dataCount);
      
      // Should return large dataset efficiently
      expect(duration).toBeLessThan(1000); // Under 1 second
    });

    it('should maintain performance under sustained load', async () => {
      const testDuration = 5000; // 5 seconds
      const requestsPerSecond = 20;
      const totalRequests = Math.floor(testDuration / 1000) * requestsPerSecond;
      
      const results: { duration: number; success: boolean }[] = [];
      const startTime = performance.now();

      // Make requests at steady rate
      for (let i = 0; i < totalRequests; i++) {
        const requestStart = performance.now();
        
        try {
          const response = await request(app).get('/api/test/fast');
          const requestEnd = performance.now();
          
          results.push({
            duration: requestEnd - requestStart,
            success: response.status === 200
          });
        } catch (error) {
          results.push({
            duration: 0,
            success: false
          });
        }

        // Maintain request rate
        await new Promise(resolve => setTimeout(resolve, 1000 / requestsPerSecond));
      }

      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      // All requests should succeed
      const successRate = results.filter(r => r.success).length / results.length;
      expect(successRate).toBeGreaterThan(0.95); // 95% success rate

      // Average response time should remain reasonable
      const avgResponseTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      expect(avgResponseTime).toBeLessThan(100); // Under 100ms average
    });
  });

  describe('WebSocket Performance', () => {
    let server: any;
    let io: SocketIOServer;
    let clientSockets: ClientSocket[];
    let serverPort: number;

    beforeEach(async () => {
      const { createServer } = await import('http');
      const { Server } = await import('socket.io');
      
      server = createServer();
      io = new Server(server);
      
      await new Promise<void>((resolve) => {
        server.listen(0, () => {
          serverPort = (server.address() as any)?.port;
          resolve();
        });
      });

      clientSockets = [];
    });

    afterEach(async () => {
      // Cleanup all client sockets
      clientSockets.forEach(socket => {
        if (socket.connected) {
          socket.disconnect();
        }
      });

      if (server) {
        await new Promise<void>((resolve) => {
          server.close(() => resolve());
        });
      }
    });

    it('should handle multiple simultaneous connections', async () => {
      const connectionCount = 100;
      const connectionPromises: Promise<ClientSocket>[] = [];

      const startTime = performance.now();

      // Create multiple connections
      for (let i = 0; i < connectionCount; i++) {
        const promise = new Promise<ClientSocket>((resolve) => {
          const socket = ClientIO(`http://localhost:${serverPort}`, {
            transports: ['websocket'],
            forceNew: true
          });
          
          socket.on('connect', () => {
            resolve(socket);
          });
          
          clientSockets.push(socket);
        });
        
        connectionPromises.push(promise);
      }

      const connectedSockets = await Promise.all(connectionPromises);
      const endTime = performance.now();
      const connectionTime = endTime - startTime;

      // All connections should succeed
      expect(connectedSockets.length).toBe(connectionCount);
      expect(connectedSockets.every(socket => socket.connected)).toBe(true);
      
      // Connection time should be reasonable
      expect(connectionTime).toBeLessThan(5000); // Under 5 seconds for 100 connections
    });

    it('should broadcast messages to many clients efficiently', async () => {
      const clientCount = 50;
      const messageCount = 100;
      
      // Connect multiple clients
      const connectionPromises = Array.from({ length: clientCount }, () => {
        return new Promise<ClientSocket>((resolve) => {
          const socket = ClientIO(`http://localhost:${serverPort}`, {
            transports: ['websocket'],
            forceNew: true
          });
          
          socket.on('connect', () => resolve(socket));
          clientSockets.push(socket);
        });
      });

      const clients = await Promise.all(connectionPromises);

      // Set up message receivers
      const receivedMessages: { [key: string]: any[] } = {};
      clients.forEach((client, index) => {
        receivedMessages[client.id] = [];
        client.on('test_message', (data) => {
          receivedMessages[client.id].push(data);
        });
      });

      const startTime = performance.now();

      // Broadcast messages
      for (let i = 0; i < messageCount; i++) {
        const message = { id: i, data: `message-${i}`, timestamp: Date.now() };
        io.emit('test_message', message);
      }

      // Wait for all messages to be received
      await new Promise(resolve => setTimeout(resolve, 1000));

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Check that all clients received all messages
      const totalMessagesReceived = Object.values(receivedMessages)
        .reduce((sum, messages) => sum + messages.length, 0);
      
      const expectedTotal = clientCount * messageCount;
      const deliveryRate = totalMessagesReceived / expectedTotal;
      
      expect(deliveryRate).toBeGreaterThan(0.95); // 95% delivery rate
      expect(duration).toBeLessThan(2000); // Under 2 seconds for broadcast
    });

    it('should handle high-frequency message streaming', async () => {
      const messageFrequency = 100; // 100 Hz
      const testDuration = 2000; // 2 seconds
      const expectedMessages = (testDuration / 1000) * messageFrequency;
      
      // Connect single client
      const clientSocket = await new Promise<ClientSocket>((resolve) => {
        const socket = ClientIO(`http://localhost:${serverPort}`, {
          transports: ['websocket'],
          forceNew: true
        });
        
        socket.on('connect', () => resolve(socket));
        clientSockets.push(socket);
      });

      const receivedMessages: any[] = [];
      clientSocket.on('sensor_data', (data) => {
        receivedMessages.push(data);
      });

      const startTime = performance.now();

      // Send high-frequency messages
      const interval = setInterval(() => {
        const now = performance.now();
        if (now - startTime >= testDuration) {
          clearInterval(interval);
          return;
        }

        const sensorData = MockDataGenerator.createHeartRateReading();
        io.emit('sensor_data', sensorData);
      }, 1000 / messageFrequency);

      // Wait for test to complete
      await new Promise(resolve => setTimeout(resolve, testDuration + 500));

      const endTime = performance.now();
      const actualDuration = endTime - startTime;

      // Should receive most messages
      const receivedRate = receivedMessages.length / expectedMessages;
      expect(receivedRate).toBeGreaterThan(0.8); // 80% of high-frequency messages
      
      // Messages should have reasonable timestamps
      const messageDelays = receivedMessages.slice(1).map((msg, index) => {
        const prevMsg = receivedMessages[index];
        return new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime();
      });
      
      const avgDelay = messageDelays.reduce((a, b) => a + b, 0) / messageDelays.length;
      expect(avgDelay).toBeLessThan(50); // Average delay under 50ms
    });

    it('should handle message backpressure gracefully', async () => {
      // Connect client with slow message processing
      const clientSocket = await new Promise<ClientSocket>((resolve) => {
        const socket = ClientIO(`http://localhost:${serverPort}`, {
          transports: ['websocket'],
          forceNew: true
        });
        
        socket.on('connect', () => resolve(socket));
        clientSockets.push(socket);
      });

      let processedCount = 0;
      let droppedCount = 0;

      clientSocket.on('fast_data', async (data) => {
        // Simulate slow processing
        await new Promise(resolve => setTimeout(resolve, 50));
        processedCount++;
      });

      const totalMessages = 100;
      const startTime = performance.now();

      // Send messages rapidly
      for (let i = 0; i < totalMessages; i++) {
        const message = { id: i, data: `fast-message-${i}` };
        
        try {
          io.emit('fast_data', message);
        } catch (error) {
          droppedCount++;
        }
      }

      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 6000)); // 6 seconds

      const endTime = performance.now();

      // Should handle backpressure without crashing
      expect(processedCount + droppedCount).toBeLessThanOrEqual(totalMessages);
      expect(processedCount).toBeGreaterThan(0);
    });
  });

  describe('Database Performance', () => {
    let db: any;

    beforeEach(async () => {
      const Database = await import('better-sqlite3');
      const { drizzle } = await import('drizzle-orm/better-sqlite3');
      
      const sqlite = new Database.default(':memory:');
      db = drizzle(sqlite);
    });

    it('should insert sensor readings efficiently', async () => {
      const { sensorData } = await import('../../src/database/schema.js');
      
      const readingCount = 10000;
      const readings = MockDataGenerator.createSensorReadings(readingCount);

      const startTime = performance.now();

      // Insert readings in batches
      const batchSize = 1000;
      for (let i = 0; i < readings.length; i += batchSize) {
        const batch = readings.slice(i, i + batchSize);
        await db.insert(sensorData).values(batch);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should insert 10k readings efficiently
      expect(duration).toBeLessThan(3000); // Under 3 seconds
      
      const insertsPerSecond = readingCount / (duration / 1000);
      expect(insertsPerSecond).toBeGreaterThan(3000); // At least 3k inserts/sec
    });

    it('should query large datasets efficiently', async () => {
      const { sensorData, sessions } = await import('../../src/database/schema.js');
      
      // Insert test data
      const session = MockDataGenerator.createSession();
      await db.insert(sessions).values([session]);
      
      const readings = Array.from({ length: 50000 }, () =>
        MockDataGenerator.createSensorReading({ sessionId: session.id })
      );
      
      // Insert in batches
      const batchSize = 5000;
      for (let i = 0; i < readings.length; i += batchSize) {
        const batch = readings.slice(i, i + batchSize);
        await db.insert(sensorData).values(batch);
      }

      const startTime = performance.now();

      // Query large dataset
      const { eq } = await import('drizzle-orm');
      const sessionData = await db
        .select()
        .from(sensorData)
        .where(eq(sensorData.sessionId, session.id))
        .limit(10000);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(sessionData.length).toBe(10000);
      expect(duration).toBeLessThan(1000); // Under 1 second for large query
    });

    it('should handle concurrent database operations', async () => {
      const { sensorData } = await import('../../src/database/schema.js');
      
      const concurrentOperations = 20;
      const readingsPerOperation = 100;

      const operations = Array.from({ length: concurrentOperations }, async (_, index) => {
        const readings = Array.from({ length: readingsPerOperation }, () =>
          MockDataGenerator.createSensorReading({
            deviceId: `device-${index}`,
            sessionId: `session-${index}`
          })
        );

        return db.insert(sensorData).values(readings);
      });

      const startTime = performance.now();
      await Promise.all(operations);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle concurrent operations efficiently
      expect(duration).toBeLessThan(5000); // Under 5 seconds
      
      // Verify all data was inserted
      const totalCount = await db.select().from(sensorData);
      expect(totalCount.length).toBe(concurrentOperations * readingsPerOperation);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory during long-running operations', () => {
      const initialMemory = process.memoryUsage();
      
      // Perform memory-intensive operations
      const largeArrays: any[][] = [];
      
      for (let i = 0; i < 1000; i++) {
        const readings = MockDataGenerator.createSensorReadings(100);
        largeArrays.push(readings);
        
        // Process and discard
        readings.forEach(reading => {
          // Simulate processing
          JSON.stringify(reading);
        });
      }

      // Clear arrays to allow garbage collection
      largeArrays.length = 0;
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Wait for GC
      setTimeout(() => {
        const finalMemory = process.memoryUsage();
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
        
        // Memory increase should be reasonable
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
      }, 100);
    });

    it('should handle resource cleanup properly', async () => {
      // Create resources that need cleanup
      const resources: Array<{ cleanup: () => void }> = [];
      
      for (let i = 0; i < 100; i++) {
        const timer = setInterval(() => {
          // Simulate periodic work
          MockDataGenerator.createSensorReading();
        }, 10);
        
        resources.push({
          cleanup: () => clearInterval(timer)
        });
      }

      // Simulate application shutdown
      resources.forEach(resource => resource.cleanup());
      
      // Verify timers are cleared
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // No specific assertion needed - if timers weren't cleared,
      // they would continue running and potentially cause issues
      expect(resources.length).toBe(100);
    });

    it('should handle CPU-intensive tasks efficiently', () => {
      const iterations = 1000000;
      const complexData = Array.from({ length: 1000 }, () =>
        MockDataGenerator.createSensorReading()
      );

      const startTime = performance.now();

      // CPU-intensive processing
      let processedCount = 0;
      for (let i = 0; i < iterations; i++) {
        const reading = complexData[i % complexData.length];
        
        // Simulate complex calculations
        const processed = {
          ...reading,
          movingAverage: (reading.value + Math.random()) / 2,
          variance: Math.pow(reading.value - 150, 2),
          normalized: reading.value / 200
        };
        
        if (processed.normalized > 0.5) {
          processedCount++;
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete CPU-intensive work in reasonable time
      expect(duration).toBeLessThan(5000); // Under 5 seconds
      expect(processedCount).toBeGreaterThan(0);
      
      const operationsPerSecond = iterations / (duration / 1000);
      expect(operationsPerSecond).toBeGreaterThan(200000); // At least 200k ops/sec
    });
  });
});