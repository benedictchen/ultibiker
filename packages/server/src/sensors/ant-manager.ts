// FIXME: ANT+ Manager improvements needed:
// 1. Add ANT-FS support for device configuration and data download
// 2. Implement ANT+ device pairing and authentication
// 3. Add support for ANT+ extended messaging for higher data rates
// 4. Implement proper channel management for multi-device scenarios
// 5. Add ANT+ Common Pages support for battery status, manufacturer info
// 6. Implement trainer control (ANT+ FE-C) for smart trainer resistance
// 7. Add support for ANT+ Bridging to share data across networks
// 8. Implement proper ANT stick detection and multi-stick support

import { EventEmitter } from 'events';
import { SensorDevice, SensorType } from '../types/sensor.js';
import { GarminStick3, HeartRateSensor, BicyclePowerSensor, SpeedCadenceSensor, FitnessEquipmentSensor } from 'ant-plus-next';

// ANT+ Device Profile definitions
const ANT_DEVICE_PROFILES = {
  HEART_RATE: 0x78,
  CYCLING_POWER: 0x0B, 
  SPEED_CADENCE: 0x79,
  SPEED_ONLY: 0x7B,
  CADENCE_ONLY: 0x7A,
  FITNESS_EQUIPMENT: 0x11
} as const;

// ANT+ Manufacturer ID mappings from research
const ANT_MANUFACTURER_IDS: { [key: number]: string } = {
  1: 'Garmin',
  2: 'Garmin International', 
  13: 'Dynastream Innovations (ANT+)',
  15: 'Timex',
  16: 'Polar Electronics', 
  88: 'Tacx',
  89: 'Polar Electro Oy',
  255: 'Development',
  // Power Meter Manufacturers
  263: 'Wahoo Fitness',
  265: 'Stages Cycling', 
  267: 'PowerTap',
  268: 'SRM',
  269: 'Quarq',
  283: '4iiii Innovations',
  // Trainer Manufacturers  
  260: 'Elite',
  // Component Manufacturers
  285: 'Shimano',
  286: 'Campagnolo',
  287: 'SRAM',
  // Additional cycling brands
  290: 'Pioneer',
  295: 'Rotor',
  300: 'CatEye',
  305: 'Bryton',
  310: 'Lezyne',
  315: 'Suunto'
};

export class ANTManager extends EventEmitter {
  private stick: GarminStick3 | null = null;
  private isScanning = false;
  private sensors = new Map<number, any>();
  private connectedDevices = new Map<string, SensorDevice>();
  private heartRateSensor: HeartRateSensor | null = null;
  private powerSensor: BicyclePowerSensor | null = null;
  private speedCadenceSensor: SpeedCadenceSensor | null = null;
  private fitnessEquipmentSensor: FitnessEquipmentSensor | null = null;
  private isInitialized = false;

  async startScanning(): Promise<void> {
    if (this.isScanning) {
      console.log('📡 ANT+ scanning already in progress');
      return;
    }

    console.log('📡 Starting ANT+ scanning...');
    
    try {
      await this.initializeStick();
      this.isScanning = true;
      
      console.log('📡 Setting up ANT+ sensor listeners...');
      
      // Start scanning for different sensor types
      await this.scanForHeartRateMonitors();
      await this.scanForPowerMeters();
      await this.scanForSpeedCadenceSensors();
      await this.scanForFitnessEquipment();
      
      console.log('✅ ANT+ scanning initialized for all sensor types (Heart Rate, Power, Speed/Cadence, Trainers)');
      console.log('🔍 Now listening for ANT+ sensor broadcasts...');
      
    } catch (error) {
      console.error('❌ Failed to start ANT+ scanning:', error);
      this.isScanning = false;
      throw new Error(`ANT+ scanning failed: ${(error as Error).message}`);
    }
  }

  stopScanning(): void {
    if (!this.isScanning) return;
    
    console.log('📡 Stopping ANT+ scanning');
    this.isScanning = false;
    
    // Detach all sensors
    this.sensors.forEach((sensor, channel) => {
      try {
        sensor.detachSensor();
      } catch (error) {
        console.warn(`Failed to detach sensor on channel ${channel}:`, error);
      }
    });
    
    this.sensors.clear();
    console.log('📡 ANT+ scanning stopped');
  }

  async connectDevice(deviceId: string): Promise<boolean> {
    console.log(`📡 Connecting to ANT+ device: ${deviceId}`);
    
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      console.error(`Device ${deviceId} not found in discovered devices`);
      return false;
    }

    try {
      // For ANT+, connection is handled automatically when a sensor is attached
      // The device is considered "connected" when it starts transmitting data
      device.isConnected = true;
      this.connectedDevices.set(deviceId, device);
      
      this.emit('device-connected', { ...device, isConnected: true });
      console.log(`✅ ANT+ device ${device.name} marked as connected`);
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to connect to ANT+ device ${deviceId}:`, error);
      return false;
    }
  }

  async disconnectDevice(deviceId: string): Promise<boolean> {
    console.log(`📡 Disconnecting ANT+ device: ${deviceId}`);
    
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      console.error(`Connected device ${deviceId} not found`);
      return false;
    }

    try {
      // Find and detach the corresponding sensor
      const sensorToDetach = Array.from(this.sensors.entries()).find(([channel, sensor]) => {
        // Match sensor by device properties if possible
        return sensor.deviceId && sensor.deviceId.toString() === deviceId;
      });

      if (sensorToDetach) {
        const [channel, sensor] = sensorToDetach;
        sensor.detachSensor();
        this.sensors.delete(channel);
      }

      device.isConnected = false;
      this.connectedDevices.delete(deviceId);
      
      this.emit('device-disconnected', deviceId);
      console.log(`✅ ANT+ device ${device.name} disconnected`);
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to disconnect ANT+ device ${deviceId}:`, error);
      return false;
    }
  }

  private async initializeStick(): Promise<void> {
    if (this.isInitialized && this.stick) return;
    
    console.log('📡 Initializing ANT+ stick...');
    
    try {
      // Check if ANT+ USB driver is available
      this.stick = new GarminStick3();
      console.log('📡 ANT+ stick object created, waiting for hardware...');
      
      this.stick.on('startup', () => {
        console.log('✅ ANT+ stick hardware detected and initialized successfully');
        this.isInitialized = true;
      });
      
      this.stick.on('shutdown', () => {
        console.log('📡 ANT+ stick hardware disconnected');
        this.isInitialized = false;
      });
      
      this.stick.on('error', (error) => {
        console.error('📡 ANT+ stick error:', error);
      });
      
      // Wait for stick to initialize with a reasonable timeout
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('ANT+ stick initialization timeout - no ANT+ USB stick detected. Please connect an ANT+ USB stick to scan for ANT+ sensors.'));
        }, 5000); // Reduced timeout
        
        this.stick!.once('startup', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize ANT+ stick:', error);
      throw new Error(`ANT+ initialization failed: ${(error as Error).message}`);
    }
  }
  
  private async scanForHeartRateMonitors(): Promise<void> {
    if (!this.stick) return;
    
    try {
      this.heartRateSensor = new HeartRateSensor(this.stick);
      
      this.heartRateSensor.on('heartRateData', (data) => {
        const deviceId = `ant-hr-${data.DeviceId}`;
        
        // Create device entry if not exists
        if (!this.connectedDevices.has(deviceId)) {
          const manufacturer = this.identifyANTManufacturer(data.ManufacturerId, data.ManufacturerName, data.DeviceId);
          const deviceName = this.generateANTDeviceName('heart_rate', data.DeviceId, manufacturer, data.ProductName);
          const displayName = this.generateANTDisplayName('heart_rate', data.DeviceId, manufacturer, data.ProductName);
          
          const device: SensorDevice = {
            deviceId,
            name: deviceName,
            displayName: displayName,
            type: 'heart_rate',
            protocol: 'ant_plus',
            isConnected: true,
            signalStrength: this.calculateANTSignalStrength(data),
            manufacturer: manufacturer,
            model: data.ProductName || 'Heart Rate Monitor',
            cyclingRelevance: 85, // Heart rate monitoring is highly relevant
            metadata: {
              antDeviceProfile: ANT_DEVICE_PROFILES.HEART_RATE,
              manufacturerId: data.ManufacturerId,
              serialNumber: data.SerialNumber,
              hardwareVersion: data.HardwareVersion,
              softwareVersion: data.SoftwareVersion
            }
          };
          
          this.connectedDevices.set(deviceId, device);
          this.emit('device-discovered', device);
        }
        
        // Emit sensor data
        this.emit('sensor-data', {
          deviceId,
          type: 'heart_rate',
          value: data.ComputedHeartRate,
          timestamp: new Date(),
          rawData: data
        });
      });
      
      // Start scanning on channel 0 with proper parameters
      try {
        // Use proper attachSensor signature: (channel, deviceType, deviceId, period, frequency, transmission)
        (this.heartRateSensor as any).attachSensor(0, 'receive', 0, 8070, 57, 1);
        this.sensors.set(0, this.heartRateSensor);
      } catch (attachError) {
        console.warn('❌ ANT+ Heart Rate sensor attachment failed, using fallback:', attachError);
        // Fallback to simple attach if available
        if (typeof (this.heartRateSensor as any).attach === 'function') {
          (this.heartRateSensor as any).attach(0, 'receive');
          this.sensors.set(0, this.heartRateSensor);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to setup heart rate scanning:', error);
    }
  }
  
  private async scanForPowerMeters(): Promise<void> {
    if (!this.stick) return;
    
    try {
      this.powerSensor = new BicyclePowerSensor(this.stick);
      
      this.powerSensor.on('powerData', (data) => {
        const deviceId = `ant-power-${data.DeviceId}`;
        
        // Create device entry if not exists
        if (!this.connectedDevices.has(deviceId)) {
          const manufacturer = this.identifyANTManufacturer(data.ManufacturerId, data.ManufacturerName, data.DeviceId);
          const deviceName = this.generateANTDeviceName('power', data.DeviceId, manufacturer, data.ProductName);
          const displayName = this.generateANTDisplayName('power', data.DeviceId, manufacturer, data.ProductName);
          
          const device: SensorDevice = {
            deviceId,
            name: deviceName,
            displayName: displayName,
            type: 'power',
            protocol: 'ant_plus',
            isConnected: true,
            signalStrength: this.calculateANTSignalStrength(data),
            manufacturer: manufacturer,
            model: data.ProductName || 'Power Meter',
            cyclingRelevance: 95, // Power meters are extremely relevant
            metadata: {
              antDeviceProfile: ANT_DEVICE_PROFILES.CYCLING_POWER,
              manufacturerId: data.ManufacturerId,
              serialNumber: data.SerialNumber,
              powerBalance: data.PedalPowerBalance,
              crankLength: data.CrankLength
            }
          };
          
          this.connectedDevices.set(deviceId, device);
          this.emit('device-discovered', device);
        }
        
        // Emit power data
        this.emit('sensor-data', {
          deviceId,
          type: 'power',
          value: data.Power,
          timestamp: new Date(),
          rawData: data
        });
        
        // Also emit cadence if available
        if (data.Cadence !== undefined) {
          this.emit('sensor-data', {
            deviceId,
            type: 'cadence',
            value: data.Cadence,
            timestamp: new Date(),
            rawData: data
          });
        }
      });
      
      // Start scanning on channel 1 with proper parameters  
      try {
        (this.powerSensor as any).attachSensor(1, 'receive', 0, 8182, 57, 1);
        this.sensors.set(1, this.powerSensor);
      } catch (attachError) {
        console.warn('❌ ANT+ Power sensor attachment failed, using fallback:', attachError);
        if (typeof (this.powerSensor as any).attach === 'function') {
          (this.powerSensor as any).attach(1, 'receive');
          this.sensors.set(1, this.powerSensor);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to setup power meter scanning:', error);
    }
  }
  
  private async scanForSpeedCadenceSensors(): Promise<void> {
    if (!this.stick) return;
    
    try {
      this.speedCadenceSensor = new SpeedCadenceSensor(this.stick);
      
      this.speedCadenceSensor.on('speedData', (data) => {
        const deviceId = `ant-speed-${data.DeviceId}`;
        
        if (!this.connectedDevices.has(deviceId)) {
          const manufacturer = this.identifyANTManufacturer(data.ManufacturerId, data.ManufacturerName, data.DeviceId);
          const deviceName = this.generateANTDeviceName('speed', data.DeviceId, manufacturer);
          const displayName = this.generateANTDisplayName('speed', data.DeviceId, manufacturer);
          
          const device: SensorDevice = {
            deviceId,
            name: deviceName,
            displayName: displayName,
            type: 'speed',
            protocol: 'ant_plus',
            isConnected: true,
            signalStrength: this.calculateANTSignalStrength(data),
            manufacturer: manufacturer,
            cyclingRelevance: 75,
            metadata: {
              antDeviceProfile: ANT_DEVICE_PROFILES.SPEED_ONLY,
              manufacturerId: data.ManufacturerId
            }
          };
          
          this.connectedDevices.set(deviceId, device);
          this.emit('device-discovered', device);
        }
        
        this.emit('sensor-data', {
          deviceId,
          type: 'speed',
          value: data.Speed,
          timestamp: new Date(),
          rawData: data
        });
      });
      
      this.speedCadenceSensor.on('cadenceData', (data) => {
        const deviceId = `ant-cadence-${data.DeviceId}`;
        
        if (!this.connectedDevices.has(deviceId)) {
          const manufacturer = this.identifyANTManufacturer(data.ManufacturerId, data.ManufacturerName, data.DeviceId);
          const deviceName = this.generateANTDeviceName('cadence', data.DeviceId, manufacturer);
          const displayName = this.generateANTDisplayName('cadence', data.DeviceId, manufacturer);
          
          const device: SensorDevice = {
            deviceId,
            name: deviceName,
            displayName: displayName,
            type: 'cadence',
            protocol: 'ant_plus',
            isConnected: true,
            signalStrength: this.calculateANTSignalStrength(data),
            manufacturer: manufacturer,
            cyclingRelevance: 80,
            metadata: {
              antDeviceProfile: ANT_DEVICE_PROFILES.CADENCE_ONLY,
              manufacturerId: data.ManufacturerId
            }
          };
          
          this.connectedDevices.set(deviceId, device);
          this.emit('device-discovered', device);
        }
        
        this.emit('sensor-data', {
          deviceId,
          type: 'cadence',
          value: data.Cadence,
          timestamp: new Date(),
          rawData: data
        });
      });
      
      // Start scanning on channel 2 with proper parameters
      try {
        (this.speedCadenceSensor as any).attachSensor(2, 'receive', 0, 8118, 57, 1);
        this.sensors.set(2, this.speedCadenceSensor);
      } catch (attachError) {
        console.warn('❌ ANT+ Speed/Cadence sensor attachment failed, using fallback:', attachError);
        if (typeof (this.speedCadenceSensor as any).attach === 'function') {
          (this.speedCadenceSensor as any).attach(2, 'receive');
          this.sensors.set(2, this.speedCadenceSensor);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to setup speed/cadence scanning:', error);
    }
  }
  
  private async scanForFitnessEquipment(): Promise<void> {
    if (!this.stick) return;
    
    try {
      this.fitnessEquipmentSensor = new FitnessEquipmentSensor(this.stick);
      
      this.fitnessEquipmentSensor.on('fitnessData', (data) => {
        const deviceId = `ant-trainer-${data.DeviceId}`;
        
        if (!this.connectedDevices.has(deviceId)) {
          const manufacturer = this.identifyANTManufacturer(data.ManufacturerId, data.ManufacturerName, data.DeviceId);
          const deviceName = this.generateANTDeviceName('trainer', data.DeviceId, manufacturer, data.ProductName);
          const displayName = this.generateANTDisplayName('trainer', data.DeviceId, manufacturer, data.ProductName);
          
          const device: SensorDevice = {
            deviceId,
            name: deviceName,
            displayName: displayName,
            type: 'trainer',
            protocol: 'ant_plus',
            isConnected: true,
            signalStrength: this.calculateANTSignalStrength(data),
            manufacturer: manufacturer,
            model: data.ProductName || 'Smart Trainer',
            cyclingRelevance: 100, // Smart trainers are extremely relevant
            metadata: {
              antDeviceProfile: ANT_DEVICE_PROFILES.FITNESS_EQUIPMENT,
              manufacturerId: data.ManufacturerId,
              equipmentType: data.EquipmentType,
              maxResistance: data.MaxResistance
            }
          };
          
          this.connectedDevices.set(deviceId, device);
          this.emit('device-discovered', device);
        }
        
        // Smart trainers can provide multiple metrics
        if (data.Power !== undefined) {
          this.emit('sensor-data', {
            deviceId,
            type: 'power',
            value: data.Power,
            timestamp: new Date(),
            rawData: data
          });
        }
        
        if (data.Speed !== undefined) {
          this.emit('sensor-data', {
            deviceId,
            type: 'speed',
            value: data.Speed,
            timestamp: new Date(),
            rawData: data
          });
        }
        
        if (data.Cadence !== undefined) {
          this.emit('sensor-data', {
            deviceId,
            type: 'cadence',
            value: data.Cadence,
            timestamp: new Date(),
            rawData: data
          });
        }
      });
      
      // Start scanning on channel 3 with proper parameters
      try {
        (this.fitnessEquipmentSensor as any).attachSensor(3, 'receive', 0, 8192, 57, 1);
        this.sensors.set(3, this.fitnessEquipmentSensor);
      } catch (attachError) {
        console.warn('❌ ANT+ Fitness Equipment sensor attachment failed, using fallback:', attachError);
        if (typeof (this.fitnessEquipmentSensor as any).attach === 'function') {
          (this.fitnessEquipmentSensor as any).attach(3, 'receive');
          this.sensors.set(3, this.fitnessEquipmentSensor);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to setup fitness equipment scanning:', error);
    }
  }

  /**
   * Identify ANT+ device manufacturer from manufacturer ID or name
   */
  private identifyANTManufacturer(manufacturerId?: number, manufacturerName?: string, deviceId?: number): string {
    // Use manufacturer name if available and meaningful
    if (manufacturerName && manufacturerName !== 'Unknown' && manufacturerName.length > 2) {
      return manufacturerName;
    }
    
    // Use manufacturer ID lookup
    if (manufacturerId && ANT_MANUFACTURER_IDS[manufacturerId]) {
      return ANT_MANUFACTURER_IDS[manufacturerId];
    }
    
    // Try to infer from device ID patterns (some manufacturers use specific ranges)
    if (deviceId) {
      // Garmin devices often use device IDs in certain ranges
      if (deviceId >= 1 && deviceId <= 65535) {
        // This is a broad range, but we could narrow it down with more research
        // For now, we'll rely on the manufacturer ID
      }
    }
    
    return manufacturerId ? `Unknown (ANT+ ID: ${manufacturerId})` : 'Unknown';
  }

  /**
   * Generate user-friendly device name for ANT+ sensors
   */
  private generateANTDeviceName(sensorType: SensorType, deviceId: number, manufacturer: string, productName?: string): string {
    // Use product name if available and descriptive
    if (productName && productName.length > 3 && !productName.toLowerCase().includes('unknown')) {
      return productName;
    }
    
    // Generate based on manufacturer and type
    const typeNames: Record<SensorType, string> = {
      'heart_rate': 'Heart Rate Monitor',
      'power': 'Power Meter', 
      'cadence': 'Cadence Sensor',
      'speed': 'Speed Sensor',
      'trainer': 'Smart Trainer',
      'unknown': 'Sensor'
    };
    
    const typeName = typeNames[sensorType] || 'Sensor';
    
    if (manufacturer && !manufacturer.startsWith('Unknown')) {
      return `${manufacturer} ${typeName}`;
    }
    
    return `ANT+ ${typeName} ${deviceId}`;
  }

  /**
   * Generate detailed display name for ANT+ devices
   */
  private generateANTDisplayName(sensorType: SensorType, deviceId: number, manufacturer: string, productName?: string): string {
    const baseName = this.generateANTDeviceName(sensorType, deviceId, manufacturer, productName);
    const parts: string[] = [baseName];
    
    // Add manufacturer if not already in base name
    if (manufacturer && !manufacturer.startsWith('Unknown') && !baseName.includes(manufacturer)) {
      parts.push(manufacturer);
    }
    
    // Add capabilities based on sensor type
    const capabilities: Record<SensorType, string[]> = {
      'heart_rate': ['Real-time HR', 'Training Zones'],
      'power': ['Power Measurement', 'Training Analysis'],
      'cadence': ['Pedal RPM', 'Efficiency Tracking'],
      'speed': ['Speed Tracking', 'Distance Calculation'],
      'trainer': ['Resistance Control', 'Multiple Metrics'],
      'unknown': ['Sensor Data']
    };
    
    const sensorCapabilities = capabilities[sensorType];
    if (sensorCapabilities) {
      parts.push(sensorCapabilities[0]);
    }
    
    // Add protocol indicator
    parts.push('ANT+');
    
    return parts.join(' • ');
  }

  /**
   * Calculate signal strength for ANT+ devices
   */
  private calculateANTSignalStrength(data: any): number {
    // ANT+ typically has good signal strength due to low-power design
    // We can use RSSI if available, otherwise estimate based on data quality
    
    if (data.RSSI !== undefined) {
      // Convert RSSI to percentage (ANT+ RSSI is typically better than BLE)
      return Math.max(0, Math.min(100, (data.RSSI + 80) * (100 / 50)));
    }
    
    // If we have data transmission, assume good signal
    if (data.DeviceId && data.DeviceId > 0) {
      return 88; // Good signal strength for ANT+
    }
    
    return 75; // Default moderate signal strength
  }

  async shutdown(): Promise<void> {
    console.log('📡 Shutting down ANT+ manager...');
    
    this.stopScanning();
    
    // Cleanup sensors
    this.heartRateSensor = null;
    this.powerSensor = null;
    this.speedCadenceSensor = null;
    this.fitnessEquipmentSensor = null;
    
    // Shutdown the stick
    if (this.stick && this.isInitialized) {
      try {
        this.stick.close();
        this.stick = null;
        this.isInitialized = false;
        console.log('✅ ANT+ stick closed');
      } catch (error) {
        console.error('❌ Error closing ANT+ stick:', error);
      }
    }
    
    this.connectedDevices.clear();
    console.log('✅ ANT+ manager shutdown complete');
  }
}