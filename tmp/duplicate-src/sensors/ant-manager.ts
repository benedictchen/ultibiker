import { EventEmitter } from 'events';
import { SensorDevice, SensorType } from '../types/sensor.js';
import { GarminStick3, HeartRateSensor, BicyclePowerSensor, SpeedCadenceSensor, FitnessEquipmentSensor } from 'ant-plus-next';

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
          const device: SensorDevice = {
            deviceId,
            name: `ANT+ Heart Rate ${data.DeviceId}`,
            type: 'heart_rate',
            protocol: 'ant_plus',
            isConnected: true,
            signalStrength: 90, // ANT+ typically has good signal
            manufacturer: data.ManufacturerName || 'Unknown',
            model: data.ProductName || 'Heart Rate Monitor'
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
          const device: SensorDevice = {
            deviceId,
            name: `ANT+ Power Meter ${data.DeviceId}`,
            type: 'power',
            protocol: 'ant_plus',
            isConnected: true,
            signalStrength: 90,
            manufacturer: data.ManufacturerName || 'Unknown',
            model: data.ProductName || 'Power Meter'
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
          const device: SensorDevice = {
            deviceId,
            name: `ANT+ Speed Sensor ${data.DeviceId}`,
            type: 'speed',
            protocol: 'ant_plus',
            isConnected: true,
            signalStrength: 90
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
          const device: SensorDevice = {
            deviceId,
            name: `ANT+ Cadence Sensor ${data.DeviceId}`,
            type: 'cadence',
            protocol: 'ant_plus',
            isConnected: true,
            signalStrength: 90
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
          const device: SensorDevice = {
            deviceId,
            name: `ANT+ Smart Trainer ${data.DeviceId}`,
            type: 'trainer',
            protocol: 'ant_plus',
            isConnected: true,
            signalStrength: 90
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