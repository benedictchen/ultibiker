import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import { SocketHandler } from '../../src/websocket/socket-handler.js';
import { MockDataGenerator, HardwareMocks, WebSocketTestUtils, TimeUtils } from '../utils/test-helpers.js';

describe('SocketHandler - Comprehensive WebSocket Tests', () => {
  let server: ReturnType<typeof createServer>;
  let socketHandler: SocketHandler;
  let mockSensorManager: any;
  let mockSessionManager: any;
  let clientSocket: ClientSocket;
  let serverPort: number;

  beforeEach(async () => {
    // Create HTTP server
    server = createServer();
    
    // Create mock managers
    mockSensorManager = HardwareMocks.createMockSensorManager({ enableHardware: true });
    mockSessionManager = {
      getActiveSession: vi.fn().mockResolvedValue({ id: 'active-session-123' }),
      startSession: vi.fn().mockResolvedValue('new-session-456'),
      endSession: vi.fn().mockResolvedValue(undefined),
      getSessionData: vi.fn().mockResolvedValue(MockDataGenerator.createSession()),
      addSensorReading: vi.fn().mockResolvedValue(undefined)
    };

    // Create socket handler
    socketHandler = new SocketHandler(server, mockSensorManager, mockSessionManager);

    // Start server on random port
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        serverPort = (server.address() as any)?.port;
        resolve();
      });
    });

    // Create client socket
    clientSocket = ClientIO(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
      forceNew: true
    });

    // Wait for connection
    await new Promise<void>((resolve) => {
      clientSocket.on('connect', resolve);
    });
  });

  afterEach(async () => {
    TimeUtils.restoreTime();
    
    // Cleanup
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
    
    if (socketHandler) {
      socketHandler.close();
    }
    
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
    
    vi.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should handle client connections', () => {
      expect(clientSocket.connected).toBe(true);
      expect(clientSocket.id).toBeDefined();
    });

    it('should track connected clients', () => {
      const connectionCount = socketHandler.getConnectionCount();
      expect(connectionCount).toBeGreaterThan(0);
    });

    it('should handle multiple concurrent connections', async () => {
      const additionalClients: ClientSocket[] = [];
      
      // Create 5 additional clients
      for (let i = 0; i < 5; i++) {
        const client = ClientIO(`http://localhost:${serverPort}`, {
          transports: ['websocket'],
          forceNew: true
        });
        
        await new Promise<void>((resolve) => {
          client.on('connect', resolve);
        });
        
        additionalClients.push(client);
      }

      expect(socketHandler.getConnectionCount()).toBe(6); // Original + 5 additional

      // Cleanup additional clients
      additionalClients.forEach(client => client.disconnect());
    });

    it('should handle client disconnections', async () => {
      const initialCount = socketHandler.getConnectionCount();
      
      clientSocket.disconnect();
      
      // Wait a bit for disconnection to be processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(socketHandler.getConnectionCount()).toBeLessThan(initialCount);
    });

    it('should emit connection status updates', async () => {
      const statusUpdates: any[] = [];
      
      clientSocket.on('connection_status', (data) => {
        statusUpdates.push(data);
      });

      // Trigger a status update
      socketHandler.broadcastConnectionStatus();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(statusUpdates.length).toBeGreaterThan(0);
      expect(statusUpdates[0]).toHaveProperty('connected_clients');
    });
  });

  describe('Sensor Data Broadcasting', () => {
    it('should broadcast sensor data to all clients', async () => {
      const receivedData: any[] = [];
      
      clientSocket.on('sensor_data', (data) => {
        receivedData.push(data);
      });

      // Simulate sensor data
      const sensorReading = MockDataGenerator.createHeartRateReading();
      mockSensorManager.emit('sensorData', {
        type: 'sensor-data',
        data: sensorReading
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedData).toHaveLength(1);
      expect(receivedData[0].deviceId).toBe(sensorReading.deviceId);
      expect(receivedData[0].metricType).toBe(sensorReading.metricType);
      expect(receivedData[0].value).toBe(sensorReading.value);
    });

    it('should broadcast device discovery events', async () => {
      const discoveredDevices: any[] = [];
      
      clientSocket.on('device_discovered', (data) => {
        discoveredDevices.push(data);
      });

      // Simulate device discovery
      const discoveredDevice = MockDataGenerator.createHeartRateMonitor();
      mockSensorManager.emit('deviceDiscovered', discoveredDevice);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(discoveredDevices).toHaveLength(1);
      expect(discoveredDevices[0].id).toBe(discoveredDevice.id);
      expect(discoveredDevices[0].type).toBe(discoveredDevice.type);
    });

    it('should broadcast device connection events', async () => {
      const connectionEvents: any[] = [];
      
      clientSocket.on('device_connected', (data) => {
        connectionEvents.push(data);
      });

      // Simulate device connection
      const connectionEvent = {
        deviceId: 'test-device-123',
        protocol: 'bluetooth',
        deviceType: 'heart_rate'
      };
      mockSensorManager.emit('deviceConnected', connectionEvent);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(connectionEvents).toHaveLength(1);
      expect(connectionEvents[0].deviceId).toBe('test-device-123');
    });

    it('should handle high-frequency sensor data efficiently', async () => {
      const receivedData: any[] = [];
      
      clientSocket.on('sensor_data', (data) => {
        receivedData.push(data);
      });

      // Simulate high-frequency data (10 Hz)
      const readings = MockDataGenerator.createSensorReadings(100);
      
      readings.forEach((reading, index) => {
        setTimeout(() => {
          mockSensorManager.emit('sensorData', {
            type: 'sensor-data',
            data: reading
          });
        }, index * 10); // 100 Hz simulation
      });

      // Wait for all data to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(receivedData.length).toBeGreaterThan(50); // Should receive most readings
    });

    it('should throttle sensor data to prevent overwhelming clients', async () => {
      const receivedData: any[] = [];
      let lastTimestamp = 0;
      
      clientSocket.on('sensor_data', (data) => {
        receivedData.push({
          ...data,
          receiveTime: Date.now()
        });
      });

      // Enable data throttling (if implemented)
      clientSocket.emit('configure_data_stream', {
        throttle: true,
        maxFrequency: 5 // 5 Hz max
      });

      // Simulate very high frequency data
      const readings = MockDataGenerator.createSensorReadings(50);
      readings.forEach((reading, index) => {
        setTimeout(() => {
          mockSensorManager.emit('sensorData', {
            type: 'sensor-data',
            data: reading
          });
        }, index * 5); // 200 Hz simulation
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check that data was throttled
      const timeDiffs = receivedData.slice(1).map((data, index) => 
        data.receiveTime - receivedData[index].receiveTime
      );
      
      const avgTimeDiff = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
      expect(avgTimeDiff).toBeGreaterThan(100); // Should be at least 100ms between messages (10 Hz max)
    });
  });

  describe('Device Control via WebSocket', () => {
    it('should handle start scanning requests', async () => {
      let scanResponse: any = null;
      
      clientSocket.on('scan_started', (data) => {
        scanResponse = data;
      });

      clientSocket.emit('start_scanning', { timeout: 30000 });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSensorManager.startScanning).toHaveBeenCalledWith(30000);
      expect(scanResponse).toBeTruthy();
      expect(scanResponse.success).toBe(true);
    });

    it('should handle stop scanning requests', async () => {
      let scanResponse: any = null;
      
      clientSocket.on('scan_stopped', (data) => {
        scanResponse = data;
      });

      clientSocket.emit('stop_scanning');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSensorManager.stopScanning).toHaveBeenCalled();
      expect(scanResponse).toBeTruthy();
      expect(scanResponse.success).toBe(true);
    });

    it('should handle device connection requests', async () => {
      let connectionResponse: any = null;
      
      clientSocket.on('device_connection_result', (data) => {
        connectionResponse = data;
      });

      clientSocket.emit('connect_device', {
        deviceId: 'test-device-123',
        protocol: 'bluetooth'
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSensorManager.connectDevice).toHaveBeenCalledWith('test-device-123', 'bluetooth');
      expect(connectionResponse).toBeTruthy();
    });

    it('should validate device control requests', async () => {
      let errorResponse: any = null;
      
      clientSocket.on('error', (data) => {
        errorResponse = data;
      });

      // Send invalid request (missing deviceId)
      clientSocket.emit('connect_device', {
        protocol: 'bluetooth'
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorResponse).toBeTruthy();
      expect(errorResponse.message).toContain('deviceId');
    });

    it('should handle connection errors gracefully', async () => {
      let errorResponse: any = null;
      
      clientSocket.on('device_connection_result', (data) => {
        errorResponse = data;
      });

      // Make connection fail
      mockSensorManager.connectDevice.mockRejectedValue(new Error('Device not found'));

      clientSocket.emit('connect_device', {
        deviceId: 'non-existent-device',
        protocol: 'bluetooth'
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(errorResponse).toBeTruthy();
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toContain('Device not found');
    });
  });

  describe('Session Management via WebSocket', () => {
    it('should handle session start requests', async () => {
      let sessionResponse: any = null;
      
      clientSocket.on('session_started', (data) => {
        sessionResponse = data;
      });

      clientSocket.emit('start_session', {
        name: 'WebSocket Test Session'
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSessionManager.startSession).toHaveBeenCalledWith('WebSocket Test Session');
      expect(sessionResponse).toBeTruthy();
      expect(sessionResponse.sessionId).toBe('new-session-456');
    });

    it('should handle session end requests', async () => {
      let sessionResponse: any = null;
      
      clientSocket.on('session_ended', (data) => {
        sessionResponse = data;
      });

      clientSocket.emit('end_session', {
        sessionId: 'active-session-123'
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSessionManager.endSession).toHaveBeenCalledWith('active-session-123');
      expect(sessionResponse).toBeTruthy();
    });

    it('should broadcast session events to all connected clients', async () => {
      // Create second client
      const secondClient = ClientIO(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        forceNew: true
      });

      await new Promise<void>((resolve) => {
        secondClient.on('connect', resolve);
      });

      const sessionEvents1: any[] = [];
      const sessionEvents2: any[] = [];
      
      clientSocket.on('session_started', (data) => {
        sessionEvents1.push(data);
      });
      
      secondClient.on('session_started', (data) => {
        sessionEvents2.push(data);
      });

      // Start session from first client
      clientSocket.emit('start_session', {
        name: 'Broadcast Test Session'
      });

      await new Promise(resolve => setTimeout(resolve, 200));

      // Both clients should receive the event
      expect(sessionEvents1).toHaveLength(1);
      expect(sessionEvents2).toHaveLength(1);

      secondClient.disconnect();
    });

    it('should provide session status updates', async () => {
      let statusUpdate: any = null;
      
      clientSocket.on('session_status', (data) => {
        statusUpdate = data;
      });

      clientSocket.emit('get_session_status');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSessionManager.getActiveSession).toHaveBeenCalled();
      expect(statusUpdate).toBeTruthy();
      expect(statusUpdate.activeSession).toBeDefined();
    });
  });

  describe('Real-time Data Streaming', () => {
    it('should support room-based data streaming', async () => {
      const roomData: any[] = [];
      
      // Join specific device room
      clientSocket.emit('join_room', 'device:heart-rate-monitor-123');
      
      clientSocket.on('sensor_data', (data) => {
        roomData.push(data);
      });

      // Simulate data from the specific device
      const targetReading = MockDataGenerator.createHeartRateReading({
        deviceId: 'heart-rate-monitor-123'
      });
      
      const otherReading = MockDataGenerator.createPowerReading({
        deviceId: 'power-meter-456'
      });

      // Should only receive data from the joined device
      socketHandler.broadcastToRoom('device:heart-rate-monitor-123', 'sensor_data', targetReading);
      socketHandler.broadcastToRoom('device:power-meter-456', 'sensor_data', otherReading);

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(roomData).toHaveLength(1);
      expect(roomData[0].deviceId).toBe('heart-rate-monitor-123');
    });

    it('should support metric-specific subscriptions', async () => {
      const heartRateData: any[] = [];
      const powerData: any[] = [];
      
      clientSocket.on('heart_rate_data', (data) => {
        heartRateData.push(data);
      });
      
      clientSocket.on('power_data', (data) => {
        powerData.push(data);
      });

      // Subscribe to specific metrics
      clientSocket.emit('subscribe_metrics', ['heart_rate', 'power']);

      // Simulate different types of sensor data
      const hrReading = MockDataGenerator.createHeartRateReading();
      const powerReading = MockDataGenerator.createPowerReading();
      const speedReading = MockDataGenerator.createSpeedReading();

      mockSensorManager.emit('sensorData', { type: 'sensor-data', data: hrReading });
      mockSensorManager.emit('sensorData', { type: 'sensor-data', data: powerReading });
      mockSensorManager.emit('sensorData', { type: 'sensor-data', data: speedReading });

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(heartRateData).toHaveLength(1);
      expect(powerData).toHaveLength(1);
      // Speed data should not be received since not subscribed
    });

    it('should handle data streaming configuration', async () => {
      let configConfirmation: any = null;
      
      clientSocket.on('stream_configured', (data) => {
        configConfirmation = data;
      });

      // Configure data stream
      clientSocket.emit('configure_data_stream', {
        frequency: 2, // 2 Hz
        metrics: ['heart_rate', 'power'],
        includeRawData: false,
        aggregationWindow: 5000 // 5 seconds
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(configConfirmation).toBeTruthy();
      expect(configConfirmation.frequency).toBe(2);
      expect(configConfirmation.metrics).toEqual(['heart_rate', 'power']);
    });

    it('should aggregate data when configured', async () => {
      const aggregatedData: any[] = [];
      
      clientSocket.on('aggregated_data', (data) => {
        aggregatedData.push(data);
      });

      // Configure aggregation
      clientSocket.emit('configure_data_stream', {
        enableAggregation: true,
        aggregationWindow: 1000, // 1 second
        aggregationMethod: 'average'
      });

      // Send multiple readings within the window
      const readings = Array.from({ length: 10 }, () =>
        MockDataGenerator.createHeartRateReading({
          deviceId: 'same-device',
          value: 160 + Math.random() * 10 // 160-170 bpm
        })
      );

      readings.forEach((reading, index) => {
        setTimeout(() => {
          mockSensorManager.emit('sensorData', { type: 'sensor-data', data: reading });
        }, index * 50); // 20 Hz
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      expect(aggregatedData.length).toBeGreaterThan(0);
      // Should have averaged values
      const avgReading = aggregatedData[0];
      expect(avgReading.value).toBeGreaterThan(160);
      expect(avgReading.value).toBeLessThan(170);
      expect(avgReading.sampleCount).toBe(10);
    });
  });

  describe('Error Handling and Reliability', () => {
    it('should handle malformed client messages', async () => {
      let errorResponse: any = null;
      
      clientSocket.on('error', (data) => {
        errorResponse = data;
      });

      // Send malformed message
      (clientSocket as any).emit('start_scanning', 'invalid-data');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(errorResponse).toBeTruthy();
    });

    it('should handle sensor manager errors gracefully', async () => {
      let errorResponse: any = null;
      
      clientSocket.on('scan_error', (data) => {
        errorResponse = data;
      });

      // Make sensor manager throw error
      mockSensorManager.startScanning.mockRejectedValue(new Error('Hardware not available'));

      clientSocket.emit('start_scanning');

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(errorResponse).toBeTruthy();
      expect(errorResponse.error).toContain('Hardware not available');
    });

    it('should maintain connection during high load', async () => {
      let disconnectionCount = 0;
      
      clientSocket.on('disconnect', () => {
        disconnectionCount++;
      });

      // Send many messages rapidly
      for (let i = 0; i < 1000; i++) {
        const reading = MockDataGenerator.createHeartRateReading();
        mockSensorManager.emit('sensorData', { type: 'sensor-data', data: reading });
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(disconnectionCount).toBe(0);
      expect(clientSocket.connected).toBe(true);
    });

    it('should handle client reconnections', async () => {
      let reconnectCount = 0;
      
      clientSocket.on('reconnect', () => {
        reconnectCount++;
      });

      // Simulate connection drop and reconnect
      clientSocket.disconnect();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      clientSocket.connect();
      
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(clientSocket.connected).toBe(true);
    });

    it('should clean up resources on client disconnect', async () => {
      const initialConnectionCount = socketHandler.getConnectionCount();
      
      clientSocket.disconnect();
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(socketHandler.getConnectionCount()).toBeLessThan(initialConnectionCount);
    });

    it('should handle memory efficiently with many connections', async () => {
      const clients: ClientSocket[] = [];
      
      // Create 50 concurrent connections
      for (let i = 0; i < 50; i++) {
        const client = ClientIO(`http://localhost:${serverPort}`, {
          transports: ['websocket'],
          forceNew: true
        });
        
        await new Promise<void>((resolve) => {
          client.on('connect', resolve);
        });
        
        clients.push(client);
      }

      expect(socketHandler.getConnectionCount()).toBe(51); // Original + 50

      // Send data to all clients
      const reading = MockDataGenerator.createHeartRateReading();
      mockSensorManager.emit('sensorData', { type: 'sensor-data', data: reading });

      await new Promise(resolve => setTimeout(resolve, 500));

      // Cleanup
      clients.forEach(client => client.disconnect());
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(socketHandler.getConnectionCount()).toBe(1); // Back to original
    });
  });

  describe('Performance Monitoring', () => {
    it('should provide connection statistics', () => {
      const stats = socketHandler.getConnectionStats();
      
      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('activeConnections');
      expect(stats).toHaveProperty('totalMessages');
      expect(stats.activeConnections).toBeGreaterThan(0);
    });

    it('should track message throughput', async () => {
      const initialStats = socketHandler.getConnectionStats();
      
      // Send multiple messages
      for (let i = 0; i < 10; i++) {
        const reading = MockDataGenerator.createHeartRateReading();
        mockSensorManager.emit('sensorData', { type: 'sensor-data', data: reading });
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      const finalStats = socketHandler.getConnectionStats();
      
      expect(finalStats.totalMessages).toBeGreaterThan(initialStats.totalMessages);
    });

    it('should measure latency', async () => {
      let latency: number = 0;
      
      clientSocket.on('pong', (timestamp) => {
        latency = Date.now() - timestamp;
      });

      clientSocket.emit('ping', Date.now());

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(latency).toBeGreaterThan(0);
      expect(latency).toBeLessThan(100); // Should be low latency
    });
  });
});