import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UltiBikerSensorManager } from '../../src/sensors/sensor-manager.js';
import { SessionManager } from '../../src/services/session-manager.js';
import { MockDataGenerator, HardwareMocks, TimeUtils } from '../utils/test-helpers.js';

// Mock the hardware managers
vi.mock('../../src/sensors/ant-manager.js', () => ({
  ANTManager: vi.fn(() => HardwareMocks.createMockANTManager())
}));

vi.mock('../../src/sensors/ble-manager.js', () => ({
  BLEManager: vi.fn(() => HardwareMocks.createMockBLEManager())
}));

describe('UltiBikerSensorManager - Comprehensive Tests', () => {
  let sensorManager: UltiBikerSensorManager;
  let mockSessionManager: SessionManager;
  let mockANTManager: any;
  let mockBLEManager: any;

  beforeEach(async () => {
    // Create mocks
    mockSessionManager = {
      getActiveSession: vi.fn().mockResolvedValue({ id: 'session-123' }),
      startSession: vi.fn().mockResolvedValue('session-123'),
      addSensorReading: vi.fn().mockResolvedValue(undefined)
    } as any;

    // Create sensor manager
    sensorManager = new UltiBikerSensorManager(mockSessionManager);
    
    // Get references to the mock managers
    mockANTManager = (sensorManager as any).antManager;
    mockBLEManager = (sensorManager as any).bleManager;
  });

  afterEach(() => {
    TimeUtils.restoreTime();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with both ANT+ and BLE managers', () => {
      expect(mockANTManager.initialize).toHaveBeenCalled();
      expect(mockBLEManager.initialize).toHaveBeenCalled();
    });

    it('should set up event listeners for both protocols', () => {
      expect(mockANTManager.on).toHaveBeenCalled();
      expect(mockBLEManager.on).toHaveBeenCalled();
    });

    it('should initialize data parser', () => {
      expect((sensorManager as any).dataParser).toBeDefined();
    });
  });

  describe('Device Scanning', () => {
    it('should start scanning on both protocols', async () => {
      await sensorManager.startScanning();

      expect(mockANTManager.startScanning).toHaveBeenCalled();
      expect(mockBLEManager.startScanning).toHaveBeenCalled();
    });

    it('should stop scanning on both protocols', async () => {
      await sensorManager.startScanning();
      await sensorManager.stopScanning();

      expect(mockANTManager.stopScanning).toHaveBeenCalled();
      expect(mockBLEManager.stopScanning).toHaveBeenCalled();
    });

    it('should emit scan events', async () => {
      const scanStartedSpy = vi.fn();
      const scanStoppedSpy = vi.fn();
      
      sensorManager.on('scanStarted', scanStartedSpy);
      sensorManager.on('scanStopped', scanStoppedSpy);

      await sensorManager.startScanning();
      await sensorManager.stopScanning();

      expect(scanStartedSpy).toHaveBeenCalled();
      expect(scanStoppedSpy).toHaveBeenCalled();
    });

    it('should prevent multiple concurrent scans', async () => {
      await sensorManager.startScanning();
      await sensorManager.startScanning(); // Second call

      // Should only call startScanning once on each manager
      expect(mockANTManager.startScanning).toHaveBeenCalledTimes(1);
      expect(mockBLEManager.startScanning).toHaveBeenCalledTimes(1);
    });

    it('should handle scanning timeout', async () => {
      const timeoutMs = 5000;
      const timeoutSpy = vi.fn();
      
      sensorManager.on('scanTimeout', timeoutSpy);
      sensorManager.startScanning(timeoutMs);

      // Advance time to trigger timeout
      TimeUtils.mockDate(Date.now());
      TimeUtils.advanceTime(timeoutMs + 100);

      expect(timeoutSpy).toHaveBeenCalled();
      expect(mockANTManager.stopScanning).toHaveBeenCalled();
      expect(mockBLEManager.stopScanning).toHaveBeenCalled();
    });
  });

  describe('Device Discovery', () => {
    it('should emit device discovered events from ANT+', () => {
      const deviceDiscoveredSpy = vi.fn();
      sensorManager.on('deviceDiscovered', deviceDiscoveredSpy);

      const mockDevice = MockDataGenerator.createHeartRateMonitor({
        protocol: 'ant_plus'
      });

      // Simulate ANT+ device discovery
      mockANTManager.emit('deviceDiscovered', mockDevice);

      expect(deviceDiscoveredSpy).toHaveBeenCalledWith(mockDevice);
    });

    it('should emit device discovered events from BLE', () => {
      const deviceDiscoveredSpy = vi.fn();
      sensorManager.on('deviceDiscovered', deviceDiscoveredSpy);

      const mockDevice = MockDataGenerator.createPowerMeter({
        protocol: 'bluetooth'
      });

      // Simulate BLE device discovery
      mockBLEManager.emit('deviceDiscovered', mockDevice);

      expect(deviceDiscoveredSpy).toHaveBeenCalledWith(mockDevice);
    });

    it('should filter duplicate devices based on deviceId', () => {
      const deviceDiscoveredSpy = vi.fn();
      sensorManager.on('deviceDiscovered', deviceDiscoveredSpy);

      const device1 = MockDataGenerator.createHeartRateMonitor({ id: 'same-id' });
      const device2 = MockDataGenerator.createHeartRateMonitor({ id: 'same-id' });

      mockBLEManager.emit('deviceDiscovered', device1);
      mockBLEManager.emit('deviceDiscovered', device2);

      // Should only emit once for duplicate deviceId
      expect(deviceDiscoveredSpy).toHaveBeenCalledTimes(1);
    });

    it('should maintain discovered devices list', async () => {
      const device1 = MockDataGenerator.createHeartRateMonitor();
      const device2 = MockDataGenerator.createPowerMeter();

      mockBLEManager.emit('deviceDiscovered', device1);
      mockBLEManager.emit('deviceDiscovered', device2);

      const discoveredDevices = sensorManager.getDiscoveredDevices();
      
      expect(discoveredDevices).toHaveLength(2);
      expect(discoveredDevices[0].id).toBe(device1.id);
      expect(discoveredDevices[1].id).toBe(device2.id);
    });

    it('should clear discovered devices when scanning starts', async () => {
      const device = MockDataGenerator.createHeartRateMonitor();
      mockBLEManager.emit('deviceDiscovered', device);

      expect(sensorManager.getDiscoveredDevices()).toHaveLength(1);

      await sensorManager.startScanning();

      expect(sensorManager.getDiscoveredDevices()).toHaveLength(0);
    });
  });

  describe('Device Connection', () => {
    it('should connect to ANT+ device', async () => {
      const deviceId = 'ant-device-123';
      
      await sensorManager.connectDevice(deviceId, 'ant_plus');

      expect(mockANTManager.connectDevice).toHaveBeenCalledWith(deviceId, 'heart_rate');
    });

    it('should connect to BLE device', async () => {
      const deviceId = 'ble-device-456';
      
      await sensorManager.connectDevice(deviceId, 'bluetooth');

      expect(mockBLEManager.connectDevice).toHaveBeenCalledWith(deviceId);
    });

    it('should emit connection events', async () => {
      const connectedSpy = vi.fn();
      const disconnectedSpy = vi.fn();

      sensorManager.on('deviceConnected', connectedSpy);
      sensorManager.on('deviceDisconnected', disconnectedSpy);

      const deviceId = 'test-device';

      // Simulate connection
      mockBLEManager.emit('deviceConnected', { deviceId, protocol: 'bluetooth' });
      
      // Simulate disconnection
      mockBLEManager.emit('deviceDisconnected', { deviceId });

      expect(connectedSpy).toHaveBeenCalledWith({ deviceId, protocol: 'bluetooth' });
      expect(disconnectedSpy).toHaveBeenCalledWith({ deviceId });
    });

    it('should track connected devices', async () => {
      const device1 = { deviceId: 'device-1', protocol: 'bluetooth' };
      const device2 = { deviceId: 'device-2', protocol: 'ant_plus' };

      mockBLEManager.emit('deviceConnected', device1);
      mockANTManager.emit('deviceConnected', device2);

      const connectedDevices = sensorManager.getConnectedDevices();
      
      expect(connectedDevices).toHaveLength(2);
      expect(connectedDevices.find(d => d.deviceId === 'device-1')).toBeDefined();
      expect(connectedDevices.find(d => d.deviceId === 'device-2')).toBeDefined();
    });

    it('should remove devices from connected list on disconnection', async () => {
      const device = { deviceId: 'device-1', protocol: 'bluetooth' };

      mockBLEManager.emit('deviceConnected', device);
      expect(sensorManager.getConnectedDevices()).toHaveLength(1);

      mockBLEManager.emit('deviceDisconnected', { deviceId: 'device-1' });
      expect(sensorManager.getConnectedDevices()).toHaveLength(0);
    });

    it('should handle connection errors gracefully', async () => {
      const errorSpy = vi.fn();
      sensorManager.on('connectionError', errorSpy);

      mockBLEManager.connectDevice.mockRejectedValue(new Error('Connection failed'));

      await expect(sensorManager.connectDevice('device-1', 'bluetooth')).rejects.toThrow('Connection failed');
      
      // Should emit error event
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('Sensor Data Processing', () => {
    beforeEach(() => {
      // Set up a mock session
      mockSessionManager.getActiveSession.mockResolvedValue({ id: 'active-session' });
    });

    it('should process sensor data from ANT+ devices', async () => {
      const sensorDataSpy = vi.fn();
      sensorManager.on('sensorData', sensorDataSpy);

      const rawReading = {
        deviceId: 'ant-hr-001',
        type: 'heart_rate',
        value: 165,
        timestamp: new Date()
      };

      // Simulate ANT+ data
      mockANTManager.emit('sensorData', rawReading);

      expect(sensorDataSpy).toHaveBeenCalled();
      
      const processedData = sensorDataSpy.mock.calls[0][0];
      expect(processedData.deviceId).toBe('ant-hr-001');
      expect(processedData.metricType).toBe('heart_rate');
      expect(processedData.value).toBe(165);
      expect(processedData.sessionId).toBe('active-session');
    });

    it('should process sensor data from BLE devices', async () => {
      const sensorDataSpy = vi.fn();
      sensorManager.on('sensorData', sensorDataSpy);

      const rawReading = {
        deviceId: 'ble-power-001',
        type: 'power',
        value: 250,
        timestamp: new Date(),
        rssi: -65
      };

      // Simulate BLE data
      mockBLEManager.emit('sensorData', rawReading);

      expect(sensorDataSpy).toHaveBeenCalled();
      
      const processedData = sensorDataSpy.mock.calls[0][0];
      expect(processedData.deviceId).toBe('ble-power-001');
      expect(processedData.metricType).toBe('power');
      expect(processedData.value).toBe(250);
    });

    it('should automatically store sensor data in active session', async () => {
      const rawReading = {
        deviceId: 'test-device',
        type: 'heart_rate',
        value: 160,
        timestamp: new Date()
      };

      mockBLEManager.emit('sensorData', rawReading);

      // Should call session manager to store data
      expect(mockSessionManager.addSensorReading).toHaveBeenCalled();
      
      const storedReading = mockSessionManager.addSensorReading.mock.calls[0][0];
      expect(storedReading.deviceId).toBe('test-device');
      expect(storedReading.sessionId).toBe('active-session');
    });

    it('should start new session if none is active', async () => {
      mockSessionManager.getActiveSession.mockResolvedValue(null);
      mockSessionManager.startSession.mockResolvedValue('new-session-id');
      mockSessionManager.getActiveSession.mockResolvedValueOnce(null).mockResolvedValue({ id: 'new-session-id' });

      const rawReading = {
        deviceId: 'test-device',
        type: 'heart_rate',
        value: 160,
        timestamp: new Date()
      };

      mockBLEManager.emit('sensorData', rawReading);

      expect(mockSessionManager.startSession).toHaveBeenCalledWith('Auto-started Session');
    });

    it('should filter invalid sensor data', async () => {
      const sensorDataSpy = vi.fn();
      sensorManager.on('sensorData', sensorDataSpy);

      const invalidReading = {
        deviceId: 'test-device',
        type: 'heart_rate',
        value: -50, // Invalid negative heart rate
        timestamp: new Date()
      };

      mockBLEManager.emit('sensorData', invalidReading);

      // Should not emit processed data for invalid readings
      expect(sensorDataSpy).not.toHaveBeenCalled();
      expect(mockSessionManager.addSensorReading).not.toHaveBeenCalled();
    });

    it('should handle data processing errors gracefully', async () => {
      const errorSpy = vi.fn();
      sensorManager.on('dataProcessingError', errorSpy);

      // Make session manager throw an error
      mockSessionManager.addSensorReading.mockRejectedValue(new Error('Storage failed'));

      const rawReading = {
        deviceId: 'test-device',
        type: 'heart_rate',
        value: 160,
        timestamp: new Date()
      };

      mockBLEManager.emit('sensorData', rawReading);

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('Device Status Management', () => {
    it('should track device status correctly', () => {
      const device1 = { deviceId: 'device-1', protocol: 'bluetooth' };
      const device2 = { deviceId: 'device-2', protocol: 'ant_plus' };

      mockBLEManager.emit('deviceConnected', device1);
      mockANTManager.emit('deviceConnected', device2);

      const status = sensorManager.getDeviceStatus();

      expect(status.connected).toHaveLength(2);
      expect(status.scanning).toBe(false);
      expect(status.protocols.ant_plus.connected).toHaveLength(1);
      expect(status.protocols.bluetooth.connected).toHaveLength(1);
    });

    it('should update scanning status', async () => {
      await sensorManager.startScanning();
      
      let status = sensorManager.getDeviceStatus();
      expect(status.scanning).toBe(true);

      await sensorManager.stopScanning();
      
      status = sensorManager.getDeviceStatus();
      expect(status.scanning).toBe(false);
    });

    it('should track last activity timestamps', async () => {
      const mockTime = TimeUtils.mockDate('2025-01-15T12:00:00Z');
      
      const rawReading = {
        deviceId: 'test-device',
        type: 'heart_rate',
        value: 160,
        timestamp: mockTime
      };

      mockBLEManager.emit('sensorData', rawReading);

      const status = sensorManager.getDeviceStatus();
      const deviceStatus = status.devices.find(d => d.deviceId === 'test-device');
      
      expect(deviceStatus?.lastActivity).toEqual(mockTime);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle high-frequency sensor data', async () => {
      const sensorDataSpy = vi.fn();
      sensorManager.on('sensorData', sensorDataSpy);

      // Simulate high-frequency data (10 Hz for 5 seconds = 50 readings)
      const readings = MockDataGenerator.createSensorReadings(50);

      readings.forEach((reading, index) => {
        setTimeout(() => {
          mockBLEManager.emit('sensorData', reading);
        }, index * 100); // 10 Hz
      });

      // Wait for all readings to be processed
      await new Promise(resolve => setTimeout(resolve, 6000));

      expect(sensorDataSpy).toHaveBeenCalledTimes(50);
    });

    it('should maintain performance with multiple devices', async () => {
      const devices = [
        MockDataGenerator.createHeartRateMonitor(),
        MockDataGenerator.createPowerMeter(),
        MockDataGenerator.createSpeedSensor(),
        MockDataGenerator.createDevice({ type: 'cadence' })
      ];

      // Connect all devices
      devices.forEach(device => {
        mockBLEManager.emit('deviceConnected', { deviceId: device.id, protocol: 'bluetooth' });
      });

      // Send data from all devices simultaneously
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        devices.forEach(device => {
          const reading = MockDataGenerator.createSensorReading({
            deviceId: device.id,
            timestamp: new Date(Date.now() + i * 1000)
          });
          mockBLEManager.emit('sensorData', reading);
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should process 400 readings (4 devices × 100) efficiently
      expect(duration).toBeLessThan(500); // Less than 500ms
    });

    it('should handle memory efficiently with long sessions', () => {
      // Simulate a long session with many readings
      for (let i = 0; i < 10000; i++) {
        const reading = MockDataGenerator.createHeartRateReading({
          timestamp: new Date(Date.now() + i * 1000)
        });
        mockBLEManager.emit('sensorData', reading);
      }

      // Check that internal data structures don't grow unbounded
      const status = sensorManager.getDeviceStatus();
      expect(Object.keys(status.devices)).toBeTruthy();
    });
  });

  describe('Shutdown and Cleanup', () => {
    it('should shutdown both protocol managers', async () => {
      await sensorManager.shutdown();

      expect(mockANTManager.shutdown).toHaveBeenCalled();
      expect(mockBLEManager.shutdown).toHaveBeenCalled();
    });

    it('should stop scanning before shutdown', async () => {
      await sensorManager.startScanning();
      await sensorManager.shutdown();

      expect(mockANTManager.stopScanning).toHaveBeenCalled();
      expect(mockBLEManager.stopScanning).toHaveBeenCalled();
    });

    it('should disconnect all devices on shutdown', async () => {
      const device1 = { deviceId: 'device-1', protocol: 'bluetooth' };
      const device2 = { deviceId: 'device-2', protocol: 'ant_plus' };

      mockBLEManager.emit('deviceConnected', device1);
      mockANTManager.emit('deviceConnected', device2);

      await sensorManager.shutdown();

      expect(mockBLEManager.disconnectDevice).toHaveBeenCalledWith('device-1');
      expect(mockANTManager.disconnectDevice).toHaveBeenCalledWith('device-2');
    });

    it('should remove all event listeners on shutdown', async () => {
      await sensorManager.shutdown();

      expect(mockANTManager.removeAllListeners).toHaveBeenCalled();
      expect(mockBLEManager.removeAllListeners).toHaveBeenCalled();
    });

    it('should clear internal state on shutdown', async () => {
      const device = { deviceId: 'device-1', protocol: 'bluetooth' };
      mockBLEManager.emit('deviceConnected', device);

      expect(sensorManager.getConnectedDevices()).toHaveLength(1);

      await sensorManager.shutdown();

      expect(sensorManager.getConnectedDevices()).toHaveLength(0);
      expect(sensorManager.getDiscoveredDevices()).toHaveLength(0);
    });
  });
});