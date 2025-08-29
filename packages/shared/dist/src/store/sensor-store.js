import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
export const useSensorStore = create()(subscribeWithSelector((set, get) => ({
    // Initial state
    availableDevices: [],
    connectedDevices: [],
    isScanning: false,
    connectionStatus: 'disconnected',
    sensorData: {},
    lastUpdated: {},
    // Actions
    startScanning: () => {
        set({ isScanning: true });
    },
    stopScanning: () => {
        set({ isScanning: false });
    },
    connectDevice: async (device) => {
        const { connectedDevices, availableDevices } = get();
        // Remove from available and add to connected
        const newAvailable = availableDevices.filter(d => d.id !== device.id);
        const newConnected = [...connectedDevices, { ...device, connected: true }];
        set({
            availableDevices: newAvailable,
            connectedDevices: newConnected,
            connectionStatus: 'connected',
        });
    },
    disconnectDevice: async (deviceId) => {
        const { connectedDevices } = get();
        const deviceToDisconnect = connectedDevices.find(d => d.id === deviceId);
        if (!deviceToDisconnect)
            return;
        const newConnected = connectedDevices.filter(d => d.id !== deviceId);
        const newSensorData = { ...get().sensorData };
        const newLastUpdated = { ...get().lastUpdated };
        delete newSensorData[deviceId];
        delete newLastUpdated[deviceId];
        set({
            connectedDevices: newConnected,
            connectionStatus: newConnected.length > 0 ? 'connected' : 'disconnected',
            sensorData: newSensorData,
            lastUpdated: newLastUpdated,
        });
    },
    updateSensorData: (deviceId, data) => {
        const now = Date.now();
        set(state => ({
            sensorData: {
                ...state.sensorData,
                [deviceId]: data,
            },
            lastUpdated: {
                ...state.lastUpdated,
                [deviceId]: now,
            },
        }));
    },
    setConnectionStatus: (status) => {
        set({ connectionStatus: status });
    },
    addAvailableDevice: (device) => {
        set(state => {
            const exists = state.availableDevices.some(d => d.id === device.id);
            if (exists)
                return state;
            return {
                availableDevices: [...state.availableDevices, device],
            };
        });
    },
    removeAvailableDevice: (deviceId) => {
        set(state => ({
            availableDevices: state.availableDevices.filter(d => d.id !== deviceId),
        }));
    },
    clearAvailableDevices: () => {
        set({ availableDevices: [] });
    },
})));
// Selectors for optimized component re-renders
export const selectConnectedDevices = (state) => state.connectedDevices;
export const selectAvailableDevices = (state) => state.availableDevices;
export const selectIsScanning = (state) => state.isScanning;
export const selectConnectionStatus = (state) => state.connectionStatus;
export const selectSensorData = (deviceId) => (state) => state.sensorData[deviceId];
