import type { SensorDevice, SensorData, ConnectionStatus } from '@ultibiker/core';
interface SensorState {
    availableDevices: SensorDevice[];
    connectedDevices: SensorDevice[];
    isScanning: boolean;
    connectionStatus: ConnectionStatus;
    sensorData: Record<string, SensorData>;
    lastUpdated: Record<string, number>;
    startScanning: () => void;
    stopScanning: () => void;
    connectDevice: (device: SensorDevice) => Promise<void>;
    disconnectDevice: (deviceId: string) => Promise<void>;
    updateSensorData: (deviceId: string, data: SensorData) => void;
    setConnectionStatus: (status: ConnectionStatus) => void;
    addAvailableDevice: (device: SensorDevice) => void;
    removeAvailableDevice: (deviceId: string) => void;
    clearAvailableDevices: () => void;
}
export declare const useSensorStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<SensorState>, "subscribe"> & {
    subscribe: {
        (listener: (selectedState: SensorState, previousSelectedState: SensorState) => void): () => void;
        <U>(selector: (state: SensorState) => U, listener: (selectedState: U, previousSelectedState: U) => void, options?: {
            equalityFn?: ((a: U, b: U) => boolean) | undefined;
            fireImmediately?: boolean;
        } | undefined): () => void;
    };
}>;
export declare const selectConnectedDevices: (state: SensorState) => SensorDevice[];
export declare const selectAvailableDevices: (state: SensorState) => SensorDevice[];
export declare const selectIsScanning: (state: SensorState) => boolean;
export declare const selectConnectionStatus: (state: SensorState) => ConnectionStatus;
export declare const selectSensorData: (deviceId: string) => (state: SensorState) => SensorData;
export {};
