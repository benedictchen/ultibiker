// Sensor type definitions
export type SensorType = 'heart_rate' | 'power' | 'cadence' | 'speed' | 'trainer' | 'unknown';
export type Protocol = 'ant_plus' | 'bluetooth';
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface SensorDevice {
  deviceId: string;
  name: string;
  displayName?: string;
  type: SensorType;
  protocol: Protocol;
  isConnected: boolean;
  signalStrength: number;
  batteryLevel?: number;
  manufacturer?: string;
  cyclingRelevance?: number; // 0-100 score for sorting by cycling relevance
  model?: string;
  category?: string;
  firmwareVersion?: string;
  capabilities?: string[];
  services?: ServiceInfo[];
  characteristics?: CharacteristicInfo[];
  confidence?: number;
  metadata?: {
    // Common metadata
    serialNumber?: string;
    hardwareRevision?: string;
    firmwareRevision?: string;
    softwareRevision?: string;
    
    // BLE-specific metadata
    rawAdvertisement?: any;
    companyId?: number;
    serviceData?: { [uuid: string]: { data: string; length: number } };
    
    // ANT+-specific metadata
    antDeviceProfile?: number;
    manufacturerId?: number;
    hardwareVersion?: number;
    softwareVersion?: number;
    
    // Power meter specific
    powerBalance?: number;
    crankLength?: number;
    
    // Trainer specific
    equipmentType?: string;
    maxResistance?: number;
  };
}

export interface ServiceInfo {
  uuid: string;
  name: string;
  description: string;
  isPrimary?: boolean;
}

export interface CharacteristicInfo {
  uuid: string;
  serviceUuid: string;
  name: string;
  properties: string[];
  description: string;
}

export interface SensorReading {
  deviceId: string;
  sessionId: string;
  timestamp: Date;
  metricType: SensorType;
  value: number;
  unit: string;
  quality: number;
  rawData?: any;
}

export interface SensorManager {
  startScanning(): Promise<void>;
  stopScanning(): void;
  connectDevice(deviceId: string): Promise<boolean>;
  disconnectDevice(deviceId: string): Promise<boolean>;
  getConnectedDevices(): SensorDevice[];
  getDiscoveredDevices(): SensorDevice[];
}

// Event types for sensor data streaming
export interface SensorDataEvent {
  type: 'sensor-data';
  data: SensorReading;
}

export interface DeviceStatusEvent {
  type: 'device-status';
  deviceId: string;
  status: ConnectionStatus;
  device?: SensorDevice;
}

export interface ScanResultEvent {
  type: 'scan-result';
  device: SensorDevice;
}

export type SensorEvent = SensorDataEvent | DeviceStatusEvent | ScanResultEvent;