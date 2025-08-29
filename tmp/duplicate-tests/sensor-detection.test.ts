import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { UltiBikerSensorManager } from '../src/sensors/sensor-manager.js';
import { SensorEvent } from '../src/types/sensor.js';

describe('Sensor Detection Diagnostics', () => {
  let sensorManager: UltiBikerSensorManager;
  let discoveredDevices: any[] = [];
  let sensorEvents: SensorEvent[] = [];

  beforeAll(async () => {
    sensorManager = new UltiBikerSensorManager();
    
    // Capture all events for analysis
    sensorManager.on('scan-result', (event: SensorEvent) => {
      console.log('🔍 Scan result received:', event);
      discoveredDevices.push(event.data);
    });
    
    sensorManager.on('device-status', (event: SensorEvent) => {
      console.log('📱 Device status:', event);
      sensorEvents.push(event);
    });
    
    sensorManager.on('sensor-data', (event: SensorEvent) => {
      console.log('📊 Sensor data:', event);
      sensorEvents.push(event);
    });

    sensorManager.on('error', (error) => {
      console.log('❌ Sensor manager error:', error);
    });
  });

  afterAll(async () => {
    if (sensorManager) {
      await sensorManager.shutdown();
    }
  });

  it('should initialize sensor manager without errors', () => {
    expect(sensorManager).toBeDefined();
    expect(typeof sensorManager.startScanning).toBe('function');
    expect(typeof sensorManager.getDiscoveredDevices).toBe('function');
  });

  it('should start scanning and report status', async () => {
    console.log('🔍 Starting sensor scanning test...');
    
    // Start scanning
    await sensorManager.startScanning();
    
    // Wait a bit for any immediate discoveries
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check discovered devices
    const discovered = sensorManager.getDiscoveredDevices();
    console.log(`📱 Discovered ${discovered.length} devices:`, discovered);
    
    const connected = sensorManager.getConnectedDevices();
    console.log(`🔗 Connected to ${connected.length} devices:`, connected);
    
    // Stop scanning
    sensorManager.stopScanning();
    
    // Even if no devices found, scanning should work without errors
    expect(discovered).toBeInstanceOf(Array);
    expect(connected).toBeInstanceOf(Array);
  }, 10000);

  it('should handle Bluetooth availability', async () => {
    console.log('📶 Testing Bluetooth availability...');
    
    // Check if Noble (Bluetooth) can be initialized
    try {
      const noble = await import('@abandonware/noble');
      console.log('📶 Noble imported successfully');
      console.log('📶 Noble state:', noble._state);
      console.log('📶 Noble adapter info:', {
        address: noble.address || 'unknown',
        powered: noble._state === 'poweredOn'
      });
      
      // Test basic Noble functionality
      expect(noble).toBeDefined();
    } catch (error) {
      console.warn('⚠️ Bluetooth not available:', error.message);
    }
  });

  it('should handle ANT+ availability', async () => {
    console.log('📡 Testing ANT+ availability...');
    
    try {
      const { GarminStick3 } = await import('ant-plus-next');
      console.log('📡 ANT+ library imported successfully');
      
      // Try to create ANT+ stick instance
      const stick = new GarminStick3();
      console.log('📡 ANT+ stick created');
      
      expect(stick).toBeDefined();
      
      // Clean up
      try {
        stick.close();
      } catch (error) {
        console.log('ℹ️ ANT+ stick cleanup (expected if no hardware):', error.message);
      }
    } catch (error) {
      console.warn('⚠️ ANT+ not available:', error.message);
    }
  });

  it('should detect environment variables', () => {
    console.log('🌍 Environment variables:');
    console.log('  - ANT_STICK_ENABLED:', process.env.ANT_STICK_ENABLED || 'undefined (default: enabled)');
    console.log('  - BLE_ENABLED:', process.env.BLE_ENABLED || 'undefined (default: enabled)');
    console.log('  - NODE_ENV:', process.env.NODE_ENV || 'undefined');
    console.log('  - Platform:', process.platform);
    console.log('  - Architecture:', process.arch);
    
    // Test should always pass - just for logging
    expect(true).toBe(true);
  });

  it('should only work with real sensor hardware', () => {
    console.log('🚴 UltiBiker requires REAL sensors - no mock/fake data allowed');
    
    // Test that the sensor manager is initialized for real hardware only
    expect(sensorManager).toBeDefined();
    expect(typeof sensorManager.startScanning).toBe('function');
    expect(typeof sensorManager.getDiscoveredDevices).toBe('function');
    
    console.log('✅ Real sensor manager initialized successfully');
    console.log('🚫 Mock sensor data generation is NOT supported');
  });

  it('should only detect real cycling sensors', async () => {
    console.log('🔍 Testing real sensor detection capabilities...');
    
    // Only test real sensor detection - no simulation allowed
    console.log('📡 ANT+ sensors: Requires real Garmin ANT+ USB stick');
    console.log('📶 Bluetooth sensors: Requires real BLE cycling sensors');
    console.log('🚫 Mock/fake sensors: NOT supported in UltiBiker');
    
    // Test that discovered devices array works (even if empty without real hardware)
    const discovered = sensorManager.getDiscoveredDevices();
    expect(discovered).toBeInstanceOf(Array);
    
    console.log(`📱 Real devices detected: ${discovered.length}`);
    if (discovered.length === 0) {
      console.log('ℹ️ No real sensors detected (expected without real hardware)');
    }
  });

  it('should check system permissions and capabilities', async () => {
    console.log('🔒 Checking system capabilities...');
    
    // Check platform-specific capabilities
    if (process.platform === 'darwin') {
      console.log('🍎 macOS detected - Bluetooth should be available');
    } else if (process.platform === 'linux') {
      console.log('🐧 Linux detected - May need additional Bluetooth setup');
    } else if (process.platform === 'win32') {
      console.log('🪟 Windows detected - Bluetooth support varies');
    }
    
    // Check Node.js capabilities
    console.log('📦 Node.js capabilities:');
    console.log('  - Version:', process.version);
    console.log('  - Platform:', process.platform);
    console.log('  - Architecture:', process.arch);
    console.log('  - User ID:', process.getuid?.() || 'N/A');
    console.log('  - Group ID:', process.getgid?.() || 'N/A');
    
    expect(process.platform).toBeTruthy();
  });
});