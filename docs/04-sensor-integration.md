# UltiBiker MVP - Sensor Integration

## 📡 Sensor Protocol Overview

UltiBiker supports two primary wireless protocols for cycling sensors:

```
📡 SENSOR PROTOCOL ARCHITECTURE

┌─────────────────────────────────────────────────────────────────────────┐
│                        SENSOR INTEGRATION LAYER                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ 🔗 ANT+ Protocol                        📶 Bluetooth Low Energy (BLE)   │
│ ┌─────────────────────────────────┐     ┌─────────────────────────────┐ │
│ │                                 │     │                             │ │
│ │ 📡 ANT+ USB Stick              │     │ 📶 Built-in Bluetooth       │ │
│ │ ├── Heart Rate Monitor         │     │ ├── Heart Rate Monitor      │ │
│ │ ├── Power Meter                │     │ ├── Power Meter             │ │
│ │ ├── Speed Sensor               │     │ ├── Speed/Cadence Sensor    │ │
│ │ ├── Cadence Sensor             │     │ ├── Smart Trainer           │ │
│ │ └── Smart Trainer              │     │ └── Cycling Computer        │ │
│ │                                 │     │                             │ │
│ │ Library: ant-plus-next          │     │ Library: @abandonware/noble │ │
│ │ Protocol: Proprietary ANT+      │     │ Protocol: GATT/Bluetooth LE │ │
│ │ Range: ~10m                     │     │ Range: ~10m                 │ │
│ │ Power: Ultra Low                │     │ Power: Very Low             │ │
│ │ Frequency: 2.4GHz              │     │ Frequency: 2.4GHz           │ │
│ │                                 │     │                             │ │
│ └─────────────────────────────────┘     └─────────────────────────────┘ │
│                                                                         │
│                          ▼                          ▼                  │
│                   ┌─────────────────────────────────────┐               │
│                   │         UNIFIED DATA PARSER         │               │
│                   │                                     │               │
│                   │ • Normalize sensor readings        │               │
│                   │ • Apply calibration factors        │               │
│                   │ • Add timestamps                   │               │
│                   │ • Validate data quality            │               │
│                   │ • Convert units                    │               │
│                   │                                     │               │
│                   └─────────────────────────────────────┘               │
│                                      ▼                                  │
│                         ┌─────────────────────────┐                     │
│                         │    REAL-TIME STREAM     │                     │
│                         │                         │                     │
│                         │ Socket.io WebSocket     │                     │
│                         │ JSON Data Format        │                     │
│                         │ 1Hz Update Rate         │                     │
│                         │                         │                     │
│                         └─────────────────────────┘                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🔗 ANT+ Integration

### ANT+ Device Profiles
ANT+ uses standardized device profiles for different sensor types:

```typescript
// ANT+ Device Profile Specifications
interface ANTDeviceProfiles {
  HEART_RATE: 0x78;          // Heart Rate Monitor
  BIKE_POWER: 0x0B;          // Cycling Power Sensor  
  BIKE_SPEED_CADENCE: 0x79;  // Combined Speed & Cadence
  BIKE_SPEED: 0x7B;          // Speed Only Sensor
  BIKE_CADENCE: 0x7A;        // Cadence Only Sensor
  FITNESS_EQUIPMENT: 0x11;    // Smart Trainers (FE-C)
}
```

### ANT+ Manager Implementation

```typescript
// src/sensors/ant-manager.ts
import { GarminStick3, HeartRateSensor, BikePowerSensor, SpeedCadenceSensor } from 'ant-plus-next';
import { EventEmitter } from 'events';

export class ANTManager extends EventEmitter {
  private stick: GarminStick3;
  private sensors: Map<number, any> = new Map();
  private isScanning = false;

  constructor() {
    super();
    this.stick = new GarminStick3();
    this.setupStick();
  }

  private setupStick() {
    this.stick.on('startup', () => {
      console.log('ANT+ stick ready');
      this.emit('ready');
    });

    this.stick.on('shutdown', () => {
      console.log('ANT+ stick disconnected');
      this.emit('disconnected');
    });
  }

  async startScanning() {
    if (this.isScanning) return;
    this.isScanning = true;

    // Scan for heart rate monitors
    const hrSensor = new HeartRateSensor(this.stick);
    hrSensor.on('heartRateData', (data) => {
      this.emit('sensorData', {
        deviceId: data.DeviceId,
        type: 'heart_rate',
        value: data.ComputedHeartRate,
        unit: 'bpm',
        timestamp: new Date(),
        rawData: data
      });
    });

    // Scan for power meters
    const powerSensor = new BikePowerSensor(this.stick);
    powerSensor.on('powerData', (data) => {
      this.emit('sensorData', {
        deviceId: data.DeviceId,
        type: 'power',
        value: data.Power,
        unit: 'watts',
        timestamp: new Date(),
        rawData: data
      });
    });

    // Scan for speed/cadence sensors
    const speedCadenceSensor = new SpeedCadenceSensor(this.stick);
    speedCadenceSensor.on('speedData', (data) => {
      this.emit('sensorData', {
        deviceId: data.DeviceId,
        type: 'speed',
        value: data.Speed,
        unit: 'kph',
        timestamp: new Date(),
        rawData: data
      });
    });

    speedCadenceSensor.on('cadenceData', (data) => {
      this.emit('sensorData', {
        deviceId: data.DeviceId,
        type: 'cadence',
        value: data.Cadence,
        unit: 'rpm',
        timestamp: new Date(),
        rawData: data
      });
    });

    // Start scanning on all channels
    hrSensor.attachSensor(0, 0); // Channel 0, Device ID 0 (scan)
    powerSensor.attachSensor(1, 0); // Channel 1, Device ID 0 (scan)
    speedCadenceSensor.attachSensor(2, 0); // Channel 2, Device ID 0 (scan)

    this.emit('scanStarted');
  }

  async stopScanning() {
    this.isScanning = false;
    // Detach all sensors
    for (const [channel, sensor] of this.sensors) {
      sensor.detachSensor();
    }
    this.sensors.clear();
    this.emit('scanStopped');
  }

  async connectDevice(deviceId: number, deviceType: string) {
    // Implementation for connecting to specific device
    console.log(`Connecting to ANT+ device ${deviceId} of type ${deviceType}`);
    this.emit('deviceConnected', { deviceId, protocol: 'ant_plus', type: deviceType });
  }

  async disconnectDevice(deviceId: number) {
    // Implementation for disconnecting device
    console.log(`Disconnecting ANT+ device ${deviceId}`);
    this.emit('deviceDisconnected', { deviceId });
  }
}
```

## 📶 Bluetooth Low Energy Integration

### BLE Service UUIDs
Standard cycling sensor services use specific UUIDs:

```typescript
// Standard Cycling BLE Service UUIDs
const CyclingServices = {
  HEART_RATE: '0x180D',           // Heart Rate Service
  CYCLING_POWER: '0x1818',        // Cycling Power Service
  CYCLING_SPEED_CADENCE: '0x1816', // Cycling Speed and Cadence Service
  FITNESS_MACHINE: '0x1826',      // Fitness Machine Service (Smart Trainers)
  BATTERY_SERVICE: '0x180F',      // Battery Level Service
  DEVICE_INFORMATION: '0x180A'     // Device Information Service
};

// BLE Characteristic UUIDs
const Characteristics = {
  HEART_RATE_MEASUREMENT: '0x2A37',
  CYCLING_POWER_MEASUREMENT: '0x2A63',
  CSC_MEASUREMENT: '0x2A5B',
  INDOOR_BIKE_DATA: '0x2AD2',
  BATTERY_LEVEL: '0x2A19'
};
```

### BLE Manager Implementation

```typescript
// src/sensors/ble-manager.ts
import noble from '@abandonware/noble';
import { EventEmitter } from 'events';

export class BLEManager extends EventEmitter {
  private isScanning = false;
  private connectedDevices = new Map<string, any>();

  constructor() {
    super();
    this.setupNoble();
  }

  private setupNoble() {
    noble.on('stateChange', (state) => {
      if (state === 'poweredOn') {
        console.log('Bluetooth powered on');
        this.emit('ready');
      } else {
        console.log('Bluetooth state:', state);
        this.emit('stateChange', state);
      }
    });

    noble.on('discover', this.handleDeviceDiscovery.bind(this));
  }

  private async handleDeviceDiscovery(peripheral: any) {
    const { advertisement, localName, id } = peripheral;
    const serviceUuids = advertisement.serviceUuids || [];

    // Check if this is a cycling sensor
    const deviceType = this.identifyDeviceType(serviceUuids);
    if (!deviceType) return;

    const deviceInfo = {
      deviceId: id,
      name: localName || `Unknown ${deviceType}`,
      type: deviceType,
      protocol: 'bluetooth',
      signalStrength: peripheral.rssi,
      serviceUuids
    };

    this.emit('deviceDiscovered', deviceInfo);
  }

  private identifyDeviceType(serviceUuids: string[]): string | null {
    const services = serviceUuids.map(uuid => uuid.toLowerCase());
    
    if (services.includes('180d')) return 'heart_rate';
    if (services.includes('1818')) return 'power';
    if (services.includes('1816')) return 'speed_cadence';
    if (services.includes('1826')) return 'trainer';
    
    return null;
  }

  async startScanning() {
    if (this.isScanning || noble.state !== 'poweredOn') return;
    
    this.isScanning = true;
    
    // Scan for cycling-related services
    const servicesToScan = [
      '180d', // Heart Rate
      '1818', // Cycling Power
      '1816', // Cycling Speed and Cadence
      '1826'  // Fitness Machine
    ];

    noble.startScanning(servicesToScan, false);
    console.log('Started BLE scanning for cycling sensors');
    this.emit('scanStarted');
  }

  async stopScanning() {
    if (!this.isScanning) return;
    
    noble.stopScanning();
    this.isScanning = false;
    console.log('Stopped BLE scanning');
    this.emit('scanStopped');
  }

  async connectDevice(deviceId: string) {
    return new Promise((resolve, reject) => {
      const peripheral = noble._peripherals[deviceId];
      if (!peripheral) {
        reject(new Error('Device not found'));
        return;
      }

      peripheral.connect((error: any) => {
        if (error) {
          reject(error);
          return;
        }

        console.log(`Connected to ${peripheral.advertisement.localName || deviceId}`);
        this.connectedDevices.set(deviceId, peripheral);
        
        this.setupDeviceServices(peripheral);
        this.emit('deviceConnected', {
          deviceId,
          name: peripheral.advertisement.localName,
          protocol: 'bluetooth'
        });

        resolve(peripheral);
      });
    });
  }

  private async setupDeviceServices(peripheral: any) {
    peripheral.discoverServices([], (error: any, services: any[]) => {
      if (error) {
        console.error('Service discovery error:', error);
        return;
      }

      services.forEach(service => {
        service.discoverCharacteristics([], (error: any, characteristics: any[]) => {
          if (error) {
            console.error('Characteristic discovery error:', error);
            return;
          }

          characteristics.forEach(characteristic => {
            this.setupCharacteristic(peripheral, service, characteristic);
          });
        });
      });
    });
  }

  private setupCharacteristic(peripheral: any, service: any, characteristic: any) {
    const uuid = characteristic.uuid.toLowerCase();
    
    // Heart Rate Measurement
    if (uuid === '2a37') {
      characteristic.subscribe();
      characteristic.on('data', (data: Buffer) => {
        const heartRate = this.parseHeartRateData(data);
        this.emit('sensorData', {
          deviceId: peripheral.id,
          type: 'heart_rate',
          value: heartRate,
          unit: 'bpm',
          timestamp: new Date(),
          rawData: data
        });
      });
    }
    
    // Cycling Power Measurement
    else if (uuid === '2a63') {
      characteristic.subscribe();
      characteristic.on('data', (data: Buffer) => {
        const power = this.parsePowerData(data);
        this.emit('sensorData', {
          deviceId: peripheral.id,
          type: 'power',
          value: power,
          unit: 'watts',
          timestamp: new Date(),
          rawData: data
        });
      });
    }
    
    // CSC Measurement (Speed & Cadence)
    else if (uuid === '2a5b') {
      characteristic.subscribe();
      characteristic.on('data', (data: Buffer) => {
        const { speed, cadence } = this.parseCSCData(data);
        
        if (speed !== null) {
          this.emit('sensorData', {
            deviceId: peripheral.id,
            type: 'speed',
            value: speed,
            unit: 'kph',
            timestamp: new Date(),
            rawData: data
          });
        }
        
        if (cadence !== null) {
          this.emit('sensorData', {
            deviceId: peripheral.id,
            type: 'cadence',
            value: cadence,
            unit: 'rpm',
            timestamp: new Date(),
            rawData: data
          });
        }
      });
    }
  }

  // Data parsing methods
  private parseHeartRateData(data: Buffer): number {
    const flags = data.readUInt8(0);
    const is16Bit = flags & 0x01;
    
    if (is16Bit) {
      return data.readUInt16LE(1);
    } else {
      return data.readUInt8(1);
    }
  }

  private parsePowerData(data: Buffer): number {
    // Skip flags (2 bytes) and read power (2 bytes)
    return data.readUInt16LE(2);
  }

  private parseCSCData(data: Buffer): { speed: number | null, cadence: number | null } {
    const flags = data.readUInt8(0);
    const hasWheelRevolution = flags & 0x01;
    const hasCrankRevolution = flags & 0x02;
    
    let offset = 1;
    let speed = null;
    let cadence = null;
    
    if (hasWheelRevolution) {
      const wheelRevolutions = data.readUInt32LE(offset);
      const wheelEventTime = data.readUInt16LE(offset + 4);
      offset += 6;
      
      // Calculate speed (implementation depends on wheel circumference)
      speed = this.calculateSpeed(wheelRevolutions, wheelEventTime);
    }
    
    if (hasCrankRevolution) {
      const crankRevolutions = data.readUInt16LE(offset);
      const crankEventTime = data.readUInt16LE(offset + 2);
      
      // Calculate cadence
      cadence = this.calculateCadence(crankRevolutions, crankEventTime);
    }
    
    return { speed, cadence };
  }

  private calculateSpeed(revolutions: number, eventTime: number): number {
    // Implementation would track previous values and calculate speed
    // Based on time difference and wheel circumference
    // This is a placeholder - actual implementation needed
    return 0;
  }

  private calculateCadence(revolutions: number, eventTime: number): number {
    // Implementation would track previous values and calculate RPM
    // Based on time difference between crank revolutions
    // This is a placeholder - actual implementation needed
    return 0;
  }

  async disconnectDevice(deviceId: string) {
    const peripheral = this.connectedDevices.get(deviceId);
    if (peripheral) {
      peripheral.disconnect();
      this.connectedDevices.delete(deviceId);
      this.emit('deviceDisconnected', { deviceId });
    }
  }
}
```

## 🔧 Unified Data Parser

```typescript
// src/sensors/data-parser.ts
interface SensorReading {
  deviceId: string;
  type: 'heart_rate' | 'power' | 'cadence' | 'speed';
  value: number;
  unit: string;
  timestamp: Date;
  protocol: 'ant_plus' | 'bluetooth';
  quality: number;
  rawData: any;
}

export class DataParser {
  private calibrationFactors = new Map<string, number>();
  private previousReadings = new Map<string, SensorReading>();

  parseReading(rawReading: any): SensorReading | null {
    const reading: SensorReading = {
      deviceId: rawReading.deviceId,
      type: rawReading.type,
      value: this.applyCalibration(rawReading),
      unit: rawReading.unit,
      timestamp: rawReading.timestamp || new Date(),
      protocol: rawReading.protocol || 'unknown',
      quality: this.calculateQuality(rawReading),
      rawData: rawReading.rawData
    };

    // Validate the reading
    if (!this.validateReading(reading)) {
      return null;
    }

    // Store for future comparisons
    this.previousReadings.set(`${reading.deviceId}-${reading.type}`, reading);

    return reading;
  }

  private applyCalibration(reading: any): number {
    const key = `${reading.deviceId}-${reading.type}`;
    const factor = this.calibrationFactors.get(key) || 1.0;
    return reading.value * factor;
  }

  private calculateQuality(reading: any): number {
    // Basic quality assessment based on:
    // - Signal strength (if available)
    // - Data consistency
    // - Time since last reading
    let quality = 100;

    if (reading.signalStrength && reading.signalStrength < 50) {
      quality -= 20;
    }

    // Check for outliers
    const previous = this.previousReadings.get(`${reading.deviceId}-${reading.type}`);
    if (previous) {
      const timeDiff = reading.timestamp.getTime() - previous.timestamp.getTime();
      const valueDiff = Math.abs(reading.value - previous.value);
      
      // Penalize for large time gaps
      if (timeDiff > 5000) { // 5 seconds
        quality -= 30;
      }
      
      // Penalize for impossible value changes
      if (reading.type === 'heart_rate' && valueDiff > 30) {
        quality -= 40;
      } else if (reading.type === 'power' && valueDiff > 200) {
        quality -= 40;
      }
    }

    return Math.max(0, quality);
  }

  private validateReading(reading: SensorReading): boolean {
    // Basic validation rules
    switch (reading.type) {
      case 'heart_rate':
        return reading.value >= 30 && reading.value <= 220;
      case 'power':
        return reading.value >= 0 && reading.value <= 2000;
      case 'cadence':
        return reading.value >= 0 && reading.value <= 200;
      case 'speed':
        return reading.value >= 0 && reading.value <= 100;
      default:
        return true;
    }
  }

  setCalibrationFactor(deviceId: string, type: string, factor: number) {
    this.calibrationFactors.set(`${deviceId}-${type}`, factor);
  }
}
```

## 🎛️ Sensor Manager (Main Controller)

```typescript
// src/sensors/sensor-manager.ts
import { EventEmitter } from 'events';
import { ANTManager } from './ant-manager';
import { BLEManager } from './ble-manager';
import { DataParser } from './data-parser';

export class SensorManager extends EventEmitter {
  private antManager: ANTManager;
  private bleManager: BLEManager;
  private dataParser: DataParser;
  private isInitialized = false;

  constructor() {
    super();
    this.antManager = new ANTManager();
    this.bleManager = new BLEManager();
    this.dataParser = new DataParser();
    
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // ANT+ events
    this.antManager.on('sensorData', (data) => {
      const parsed = this.dataParser.parseReading({ ...data, protocol: 'ant_plus' });
      if (parsed) {
        this.emit('sensorData', parsed);
      }
    });

    this.antManager.on('deviceConnected', (device) => {
      this.emit('deviceConnected', device);
    });

    // BLE events
    this.bleManager.on('sensorData', (data) => {
      const parsed = this.dataParser.parseReading({ ...data, protocol: 'bluetooth' });
      if (parsed) {
        this.emit('sensorData', parsed);
      }
    });

    this.bleManager.on('deviceDiscovered', (device) => {
      this.emit('deviceDiscovered', device);
    });

    this.bleManager.on('deviceConnected', (device) => {
      this.emit('deviceConnected', device);
    });
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log('Initializing sensor managers...');
    
    // Wait for both protocols to be ready
    await Promise.all([
      this.waitForReady(this.antManager),
      this.waitForReady(this.bleManager)
    ]);

    this.isInitialized = true;
    this.emit('ready');
    console.log('Sensor managers initialized');
  }

  private waitForReady(manager: EventEmitter): Promise<void> {
    return new Promise((resolve) => {
      manager.once('ready', resolve);
    });
  }

  async startScanning() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log('Starting sensor scanning...');
    await Promise.all([
      this.antManager.startScanning(),
      this.bleManager.startScanning()
    ]);
    
    this.emit('scanStarted');
  }

  async stopScanning() {
    console.log('Stopping sensor scanning...');
    await Promise.all([
      this.antManager.stopScanning(),
      this.bleManager.stopScanning()
    ]);
    
    this.emit('scanStopped');
  }

  async connectDevice(deviceId: string, protocol: 'ant_plus' | 'bluetooth') {
    if (protocol === 'ant_plus') {
      return this.antManager.connectDevice(parseInt(deviceId), 'unknown');
    } else {
      return this.bleManager.connectDevice(deviceId);
    }
  }

  async disconnectDevice(deviceId: string, protocol: 'ant_plus' | 'bluetooth') {
    if (protocol === 'ant_plus') {
      return this.antManager.disconnectDevice(parseInt(deviceId));
    } else {
      return this.bleManager.disconnectDevice(deviceId);
    }
  }
}
```

This sensor integration architecture provides a robust, extensible foundation for connecting to and managing cycling sensors across both ANT+ and Bluetooth protocols, with unified data parsing and quality validation.