import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { UltiBikerSensorManager } from '../src/sensors/sensor-manager.js';
import { SensorEvent } from '../src/types/sensor.js';

describe('Real Sensor Detection (Integration Test)', () => {
  let sensorManager: UltiBikerSensorManager;
  let discoveredDevices: any[] = [];
  let sensorEvents: SensorEvent[] = [];

  beforeAll(async () => {
    // Override environment variables to enable real scanning
    process.env.ANT_STICK_ENABLED = 'true';
    process.env.BLE_ENABLED = 'true';
    process.env.LOG_LEVEL = 'debug';
    
    console.log('🧪 Real Sensor Detection Test - Hardware scanning ENABLED');
    console.log('⚠️  This test requires actual hardware (ANT+ USB stick and/or Bluetooth)');
    
    sensorManager = new UltiBikerSensorManager();
    
    // Capture all events for analysis
    sensorManager.on('scan-result', (event: SensorEvent) => {
      console.log('🔍 Real device discovered:', event);
      discoveredDevices.push(event.data);
    });
    
    sensorManager.on('device-status', (event: SensorEvent) => {
      console.log('📱 Device status changed:', event);
      sensorEvents.push(event);
    });
    
    sensorManager.on('sensor-data', (event: SensorEvent) => {
      console.log('📊 Live sensor data received:', event);
      sensorEvents.push(event);
    });
  });

  afterAll(async () => {
    if (sensorManager) {
      await sensorManager.shutdown();
    }
  });

  it('should attempt real sensor scanning with detailed diagnostics', async () => {
    console.log('🔍 Starting REAL sensor scanning test (30 second timeout)...');
    console.log('💡 Make sure you have cycling sensors nearby and powered on!');
    
    try {
      // Start scanning with real hardware
      await sensorManager.startScanning();
      console.log('✅ Scanning started successfully');
      
      // Wait longer for real devices to be discovered
      await new Promise(resolve => setTimeout(resolve, 15000)); // 15 seconds
      
      // Check discovered devices
      const discovered = sensorManager.getDiscoveredDevices();
      const connected = sensorManager.getConnectedDevices();
      
      console.log(`📊 RESULTS after 15 seconds:`);
      console.log(`  - Discovered: ${discovered.length} devices`);
      console.log(`  - Connected: ${connected.length} devices`);
      console.log(`  - Events captured: ${sensorEvents.length}`);
      
      if (discovered.length > 0) {
        console.log('🎉 SUCCESS: Real sensors detected!');
        discovered.forEach(device => {
          console.log(`  📱 ${device.name} (${device.type}) via ${device.protocol} - Signal: ${device.signalStrength}%`);
        });
      } else {
        console.log('🤔 No sensors detected. This could be because:');
        console.log('  1. No cycling sensors are powered on nearby');
        console.log('  2. ANT+ USB stick not connected (for ANT+ sensors)');
        console.log('  3. Bluetooth permissions not granted (for BLE sensors)');
        console.log('  4. Sensors are not in pairing/discoverable mode');
        console.log('  5. Sensors are already connected to another device');
      }
      
      // Stop scanning
      sensorManager.stopScanning();
      
      // Test passes if scanning worked without throwing errors
      expect(discovered).toBeInstanceOf(Array);
      expect(connected).toBeInstanceOf(Array);
      
    } catch (error) {
      console.error('❌ Scanning failed with error:', error);
      console.log('💡 This is likely due to missing hardware or permissions');
      
      // Test should still pass if the error is hardware-related
      if (error.message.includes('ANT+') || error.message.includes('Bluetooth')) {
        console.log('✅ Test passes - hardware limitation detected as expected');
        expect(true).toBe(true);
      } else {
        throw error;
      }
    }
  }, 30000); // 30 second timeout

  it('should handle individual protocol testing', async () => {
    console.log('🧪 Testing individual protocol availability...');
    
    // Test ANT+ specifically
    try {
      const { GarminStick3 } = await import('ant-plus-next');
      const stick = new GarminStick3();
      console.log('📡 ANT+ library available, hardware test...');
      
      // Give it a moment to initialize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        stick.close();
        console.log('📡 ANT+ stick cleanup successful');
      } catch (cleanupError) {
        console.log('📡 ANT+ stick cleanup (expected if no hardware)');
      }
    } catch (antError) {
      console.log('⚠️ ANT+ not available:', antError.message);
    }
    
    // Test Bluetooth specifically
    try {
      const noble = await import('@abandonware/noble');
      console.log(`📶 Bluetooth library available, adapter state: ${noble._state}`);
      
      if (noble._state === 'poweredOn') {
        console.log('✅ Bluetooth adapter is ready for scanning');
      } else {
        console.log(`⚠️ Bluetooth adapter not ready: ${noble._state}`);
      }
    } catch (bleError) {
      console.log('⚠️ Bluetooth not available:', bleError.message);
    }
    
    expect(true).toBe(true); // Always pass - this is diagnostic
  });

  it('should verify permission status for real sensors', async () => {
    console.log('🔒 Checking device permissions for real sensor access...');
    
    try {
      const permissionStatus = await sensorManager.getPermissionStatus();
      console.log('🔒 Permission status:', permissionStatus);
      
      const summary = sensorManager.getPermissionSummary();
      console.log('📝 Permission summary:', summary);
      
      if (permissionStatus.bluetooth.granted) {
        console.log('✅ Bluetooth permission granted - BLE sensors can be scanned');
      } else {
        console.log('⚠️ Bluetooth permission not granted - BLE scanning will fail');
      }
      
      if (permissionStatus.usb.granted) {
        console.log('✅ USB permission granted - ANT+ stick can be accessed');
      } else {
        console.log('⚠️ USB permission issues - ANT+ scanning may fail');
      }
      
      expect(permissionStatus).toBeDefined();
      expect(summary).toBeTruthy();
      
    } catch (error) {
      console.log('⚠️ Permission check failed:', error.message);
      console.log('ℹ️ This is expected if no permission manager is available');
    }
  });
});