// Sensor type definitions
export type SensorType = 'heart_rate' | 'power' | 'cadence' | 'speed' | 'trainer';
export type Protocol = 'ant_plus' | 'bluetooth';
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface SensorDevice {
  deviceId: string;
  name: string;
  type: SensorType;
  protocol: Protocol;
  isConnected: boolean;
  signalStrength: number;
  batteryLevel?: number;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
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