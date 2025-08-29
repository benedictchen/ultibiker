import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UltiBikerSensorManager } from '../../src/sensors/sensor-manager.js';
import { SensorDevice, SensorEvent, ConnectionStatus } from '../../src/types/sensor.js';

describe('UltiBikerSensorManager', () => {
  let sensorManager: UltiBikerSensorManager;
  let mockANTManager: any;
  let mockBLEManager: any;
  let mockDataParser: any;

  beforeEach(() => {
    // Mock environment variables
    process.env.ANT_STICK_ENABLED = 'true';
    process.env.BLE_ENABLED = 'true';

    // Create mock managers
    mockANTManager = {
      startScanning: vi.fn().mockResolvedValue(undefined),
      stopScanning: vi.fn(),
      connectDevice: vi.fn().mockResolvedValue(true),
      disconnectDevice: vi.fn().mockResolvedValue(true),
      shutdown: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      emit: vi.fn()
    };

    mockBLEManager = {
      startScanning: vi.fn().mockResolvedValue(undefined),
      stopScanning: vi.fn(),
      connectDevice: vi.fn().mockResolvedValue(true),
      disconnectDevice: vi.fn().mockResolvedValue(true),
      shutdown: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      emit: vi.fn()
    };

    mockDataParser = {
      parse: vi.fn().mockReturnValue({
        deviceId: 'test-device',
        sessionId: 'test-session',
        timestamp: new Date(),
        metricType: 'heart_rate',
        value: 165,
        unit: 'bpm',
        quality: 95
      })
    };

    // Mock the imports
    vi.doMock('../../src/sensors/ant-manager.js', () => ({
      ANTManager: vi.fn().mockImplementation(() => mockANTManager)
    }));

    vi.doMock('../../src/sensors/ble-manager.js', () => ({
      BLEManager: vi.fn().mockImplementation(() => mockBLEManager)
    }));

    vi.doMock('../../src/sensors/data-parser.js', () => ({
      DataParser: vi.fn().mockImplementation(() => mockDataParser)
    }));

    sensorManager = new UltiBikerSensorManager();
  });

  afterEach(async () => {
    await sensorManager.shutdown();
    vi.restoreAllMocks();
  });

  describe('Scanning', () => {
    it('should start scanning on both protocols when enabled', async () => {
      await sensorManager.startScanning();

      expect(mockANTManager.startScanning).toHaveBeenCalled();
      expect(mockBLEManager.startScanning).toHaveBeenCalled();
    });

    it('should only start ANT+ scanning when BLE is disabled', async () => {
      process.env.BLE_ENABLED = 'false';
      sensorManager = new UltiBikerSensorManager();

      await sensorManager.startScanning();

      expect(mockANTManager.startScanning).toHaveBeenCalled();
      expect(mockBLEManager.startScanning).not.toHaveBeenCalled();
    });

    it('should only start BLE scanning when ANT+ is disabled', async () => {
      process.env.ANT_STICK_ENABLED = 'false';
      sensorManager = new UltiBikerSensorManager();

      await sensorManager.startScanning();

      expect(mockANTManager.startScanning).not.toHaveBeenCalled();
      expect(mockBLEManager.startScanning).toHaveBeenCalled();
    });

    it('should not start scanning twice if already scanning', async () => {
      await sensorManager.startScanning();
      await sensorManager.startScanning(); // Second call

      expect(mockANTManager.startScanning).toHaveBeenCalledTimes(1);
      expect(mockBLEManager.startScanning).toHaveBeenCalledTimes(1);
    });

    it('should stop scanning after timeout', async () => {
      vi.useFakeTimers();

      const scanPromise = sensorManager.startScanning();
      
      // Fast forward 30 seconds
      vi.advanceTimersByTime(30000);
      
      await scanPromise;

      expect(mockANTManager.stopScanning).toHaveBeenCalled();
      expect(mockBLEManager.stopScanning).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should stop scanning manually', () => {
      sensorManager.stopScanning();

      expect(mockANTManager.stopScanning).toHaveBeenCalled();
      expect(mockBLEManager.stopScanning).toHaveBeenCalled();
    });

    it('should handle scanning errors gracefully', async () => {
      mockANTManager.startScanning.mockRejectedValue(new Error('ANT+ stick not found'));

      await expect(sensorManager.startScanning()).rejects.toThrow('ANT+ stick not found');
    });
  });

  describe('Device Discovery', () => {
    it('should emit scan-result event when device is discovered', () => {
      const mockDevice: SensorDevice = {
        deviceId: 'discovered-device',
        name: 'Test Heart Rate Monitor',
        type: 'heart_rate',
        protocol: 'ant_plus',
        isConnected: false,
        signalStrength: 85
      };

      const eventSpy = vi.fn();
      sensorManager.on('scan-result', eventSpy);

      // Simulate device discovery from ANT+ manager
      const antDiscoveryHandler = mockANTManager.on.mock.calls
        .find(([event]) => event === 'device-discovered')?.[1];
      
      if (antDiscoveryHandler) {
        antDiscoveryHandler(mockDevice);
      }

      expect(eventSpy).toHaveBeenCalledWith({
        type: 'scan-result',
        device: mockDevice
      });
    });

    it('should store discovered devices', () => {
      const mockDevice: SensorDevice = {
        deviceId: 'stored-device',
        name: 'Test Power Meter',
        type: 'power',
        protocol: 'bluetooth',
        isConnected: false,
        signalStrength: 92
      };

      // Simulate device discovery
      const bleDiscoveryHandler = mockBLEManager.on.mock.calls
        .find(([event]) => event === 'device-discovered')?.[1];
      
      if (bleDiscoveryHandler) {
        bleDiscoveryHandler(mockDevice);
      }

      const discoveredDevices = sensorManager.getDiscoveredDevices();
      expect(discoveredDevices).toContainEqual(mockDevice);
    });
  });

  describe('Device Connection', () => {
    let testDevice: SensorDevice;

    beforeEach(() => {
      testDevice = {
        deviceId: 'test-connect-device',
        name: 'Test Connection Device',
        type: 'heart_rate',
        protocol: 'ant_plus',
        isConnected: false,
        signalStrength: 85
      };

      // Add device to discovered devices
      const antDiscoveryHandler = mockANTManager.on.mock.calls
        .find(([event]) => event === 'device-discovered')?.[1];
      
      if (antDiscoveryHandler) {
        antDiscoveryHandler(testDevice);
      }
    });

    it('should connect to ANT+ device successfully', async () => {
      mockANTManager.connectDevice.mockResolvedValue(true);
      const eventSpy = vi.fn();
      sensorManager.on('device-status', eventSpy);

      const result = await sensorManager.connectDevice('test-connect-device');

      expect(result).toBe(true);
      expect(mockANTManager.connectDevice).toHaveBeenCalledWith('test-connect-device');
      expect(eventSpy).toHaveBeenCalledWith({
        type: 'device-status',
        deviceId: 'test-connect-device',
        status: 'connected',
        device: expect.objectContaining({
          deviceId: 'test-connect-device',
          isConnected: true
        })
      });
    });

    it('should connect to Bluetooth device successfully', async () => {
      const bleDevice = { ...testDevice, protocol: 'bluetooth' as const };
      
      // Add BLE device to discovered devices
      const bleDiscoveryHandler = mockBLEManager.on.mock.calls
        .find(([event]) => event === 'device-discovered')?.[1];
      
      if (bleDiscoveryHandler) {
        bleDiscoveryHandler(bleDevice);
      }

      mockBLEManager.connectDevice.mockResolvedValue(true);

      const result = await sensorManager.connectDevice('test-connect-device');

      expect(result).toBe(true);
      expect(mockBLEManager.connectDevice).toHaveBeenCalledWith('test-connect-device');
    });

    it('should fail to connect to non-existent device', async () => {
      const result = await sensorManager.connectDevice('non-existent-device');

      expect(result).toBe(false);
      expect(mockANTManager.connectDevice).not.toHaveBeenCalled();
      expect(mockBLEManager.connectDevice).not.toHaveBeenCalled();
    });

    it('should handle connection errors gracefully', async () => {
      mockANTManager.connectDevice.mockRejectedValue(new Error('Connection failed'));
      const eventSpy = vi.fn();
      sensorManager.on('device-status', eventSpy);

      const result = await sensorManager.connectDevice('test-connect-device');

      expect(result).toBe(false);
      expect(eventSpy).toHaveBeenCalledWith({
        type: 'device-status',
        deviceId: 'test-connect-device',
        status: 'error',
        device: testDevice
      });
    });

    it('should track connected devices', async () => {
      await sensorManager.connectDevice('test-connect-device');

      const connectedDevices = sensorManager.getConnectedDevices();
      expect(connectedDevices).toHaveLength(1);
      expect(connectedDevices[0].deviceId).toBe('test-connect-device');
      expect(connectedDevices[0].isConnected).toBe(true);
    });
  });

  describe('Device Disconnection', () => {
    let connectedDevice: SensorDevice;

    beforeEach(async () => {
      connectedDevice = {
        deviceId: 'test-disconnect-device',
        name: 'Test Disconnection Device',
        type: 'power',
        protocol: 'ant_plus',
        isConnected: false,
        signalStrength: 90
      };

      // Add and connect device
      const antDiscoveryHandler = mockANTManager.on.mock.calls
        .find(([event]) => event === 'device-discovered')?.[1];
      
      if (antDiscoveryHandler) {
        antDiscoveryHandler(connectedDevice);
      }

      await sensorManager.connectDevice('test-disconnect-device');
    });

    it('should disconnect from device successfully', async () => {
      mockANTManager.disconnectDevice.mockResolvedValue(true);
      const eventSpy = vi.fn();
      sensorManager.on('device-status', eventSpy);

      const result = await sensorManager.disconnectDevice('test-disconnect-device');

      expect(result).toBe(true);
      expect(mockANTManager.disconnectDevice).toHaveBeenCalledWith('test-disconnect-device');
      expect(eventSpy).toHaveBeenCalledWith({
        type: 'device-status',
        deviceId: 'test-disconnect-device',
        status: 'disconnected',
        device: expect.objectContaining({
          deviceId: 'test-disconnect-device',
          isConnected: false
        })
      });
    });

    it('should remove device from connected devices list', async () => {
      await sensorManager.disconnectDevice('test-disconnect-device');

      const connectedDevices = sensorManager.getConnectedDevices();
      expect(connectedDevices).toHaveLength(0);
    });

    it('should fail to disconnect from non-connected device', async () => {
      const result = await sensorManager.disconnectDevice('non-existent-device');

      expect(result).toBe(false);
      expect(mockANTManager.disconnectDevice).not.toHaveBeenCalled();
    });

    it('should handle disconnection errors gracefully', async () => {
      mockANTManager.disconnectDevice.mockRejectedValue(new Error('Disconnection failed'));

      const result = await sensorManager.disconnectDevice('test-disconnect-device');

      expect(result).toBe(false);
    });
  });

  describe('Sensor Data Processing', () => {
    it('should process and emit sensor data from ANT+', () => {
      const rawSensorData = {
        deviceId: 'ant-hr-001',
        type: 'heart_rate',
        value: 165,
        timestamp: new Date()
      };

      const eventSpy = vi.fn();
      sensorManager.on('sensor-data', eventSpy);

      // Simulate sensor data from ANT+ manager
      const antDataHandler = mockANTManager.on.mock.calls
        .find(([event]) => event === 'sensor-data')?.[1];
      
      if (antDataHandler) {
        antDataHandler(rawSensorData);
      }

      expect(mockDataParser.parse).toHaveBeenCalledWith(rawSensorData, 'ant_plus');
      expect(eventSpy).toHaveBeenCalledWith({
        type: 'sensor-data',
        data: expect.objectContaining({
          metricType: 'heart_rate',
          value: 165,
          unit: 'bpm'
        })
      });
    });

    it('should process and emit sensor data from Bluetooth', () => {
      const rawSensorData = {
        deviceId: 'ble-power-001',
        type: 'power',
        value: 280,
        timestamp: new Date()
      };

      const eventSpy = vi.fn();
      sensorManager.on('sensor-data', eventSpy);

      // Simulate sensor data from BLE manager
      const bleDataHandler = mockBLEManager.on.mock.calls
        .find(([event]) => event === 'sensor-data')?.[1];
      
      if (bleDataHandler) {
        bleDataHandler(rawSensorData);
      }

      expect(mockDataParser.parse).toHaveBeenCalledWith(rawSensorData, 'bluetooth');
    });

    it('should handle sensor data parsing errors gracefully', () => {
      mockDataParser.parse.mockReturnValue(null); // Simulate parsing failure
      
      const rawSensorData = {
        deviceId: 'invalid-device',
        type: 'invalid_type',
        value: 'invalid'
      };

      const eventSpy = vi.fn();
      sensorManager.on('sensor-data', eventSpy);

      const antDataHandler = mockANTManager.on.mock.calls
        .find(([event]) => event === 'sensor-data')?.[1];
      
      if (antDataHandler) {
        antDataHandler(rawSensorData);
      }

      // Should not emit sensor-data event when parsing fails
      expect(eventSpy).not.toHaveBeenCalled();
    });

    it('should handle data parser exceptions', () => {
      mockDataParser.parse.mockImplementation(() => {
        throw new Error('Parser error');
      });

      const rawSensorData = {
        deviceId: 'problem-device',
        type: 'heart_rate',
        value: 165
      };

      const eventSpy = vi.fn();
      sensorManager.on('sensor-data', eventSpy);

      const antDataHandler = mockANTManager.on.mock.calls
        .find(([event]) => event === 'sensor-data')?.[1];
      
      expect(() => {
        if (antDataHandler) {
          antDataHandler(rawSensorData);
        }
      }).not.toThrow(); // Should handle the exception gracefully

      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe('Shutdown', () => {
    it('should shutdown all managers gracefully', async () => {
      // Connect some devices first
      const testDevice = {
        deviceId: 'shutdown-test',
        name: 'Shutdown Test Device',
        type: 'heart_rate' as const,
        protocol: 'ant_plus' as const,
        isConnected: false,
        signalStrength: 85
      };

      const antDiscoveryHandler = mockANTManager.on.mock.calls
        .find(([event]) => event === 'device-discovered')?.[1];
      
      if (antDiscoveryHandler) {
        antDiscoveryHandler(testDevice);
      }

      await sensorManager.connectDevice('shutdown-test');

      // Now shutdown
      await sensorManager.shutdown();

      expect(mockANTManager.disconnectDevice).toHaveBeenCalledWith('shutdown-test');
      expect(mockANTManager.shutdown).toHaveBeenCalled();
      expect(mockBLEManager.shutdown).toHaveBeenCalled();
    });

    it('should stop scanning during shutdown', async () => {
      await sensorManager.startScanning();
      await sensorManager.shutdown();

      expect(mockANTManager.stopScanning).toHaveBeenCalled();
      expect(mockBLEManager.stopScanning).toHaveBeenCalled();
    });
  });
});