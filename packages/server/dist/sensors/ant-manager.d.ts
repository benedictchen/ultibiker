import { EventEmitter } from 'events';
export declare class ANTManager extends EventEmitter {
    private stick;
    private isScanning;
    private sensors;
    private connectedDevices;
    private heartRateSensor;
    private powerSensor;
    private speedCadenceSensor;
    private fitnessEquipmentSensor;
    private isInitialized;
    startScanning(): Promise<void>;
    stopScanning(): void;
    connectDevice(deviceId: string): Promise<boolean>;
    disconnectDevice(deviceId: string): Promise<boolean>;
    private initializeStick;
    private scanForHeartRateMonitors;
    private scanForPowerMeters;
    private scanForSpeedCadenceSensors;
    private scanForFitnessEquipment;
    shutdown(): Promise<void>;
}
