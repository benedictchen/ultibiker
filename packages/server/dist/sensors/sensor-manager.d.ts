import { EventEmitter } from 'events';
import { SensorManager, SensorDevice } from '@ultibiker/core';
export declare class UltiBikerSensorManager extends EventEmitter implements SensorManager {
    private antManager;
    private bleManager;
    private dataParser;
    private permissionManager;
    private connectedDevices;
    private discoveredDevices;
    private isScanning;
    private sessionManager;
    constructor(sessionManager?: any);
    private setupEventHandlers;
    startScanning(): Promise<void>;
    stopScanning(): void;
    connectDevice(deviceId: string): Promise<boolean>;
    disconnectDevice(deviceId: string): Promise<boolean>;
    getConnectedDevices(): SensorDevice[];
    getDiscoveredDevices(): SensorDevice[];
    getPermissionStatus(): Promise<import("../services/permission-manager.js").DevicePermissions>;
    getPermissionSummary(): string;
    getPermissionGuide(): Promise<string>;
    getPermissionReport(): string[];
    private handleDeviceDiscovered;
    private handleDeviceConnected;
    private handleDeviceDisconnected;
    private handleSensorData;
    shutdown(): Promise<void>;
}
