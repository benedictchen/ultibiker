import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { SensorDevice, SensorData, ConnectionStatus } from '@ultibiker/core';

interface SensorState {
  // Device discovery and connection
  availableDevices: SensorDevice[];
  connectedDevices: SensorDevice[];
  isScanning: boolean;
  connectionStatus: ConnectionStatus;
  
  // Real-time sensor data
  sensorData: Record<string, SensorData>;
  lastUpdated: Record<string, number>;
  
  // Actions
  startScanning: () => void;
  stopScanning: () => void;
  connectDevice: (device: SensorDevice) => Promise<void>;
  disconnectDevice: (deviceId: string) => Promise<void>;
  updateSensorData: (deviceId: string, data: SensorData) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  
  // Device management
  addAvailableDevice: (device: SensorDevice) => void;
  removeAvailableDevice: (deviceId: string) => void;
  clearAvailableDevices: () => void;
}

export const useSensorStore = create<SensorState>()(
  subscribeWithSelector((set, get) => ({
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

    connectDevice: async (device: SensorDevice) => {
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

    disconnectDevice: async (deviceId: string) => {
      const { connectedDevices } = get();
      
      const deviceToDisconnect = connectedDevices.find(d => d.id === deviceId);
      if (!deviceToDisconnect) return;

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

    updateSensorData: (deviceId: string, data: SensorData) => {
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

    setConnectionStatus: (status: ConnectionStatus) => {
      set({ connectionStatus: status });
    },

    addAvailableDevice: (device: SensorDevice) => {
      set(state => {
        const exists = state.availableDevices.some(d => d.id === device.id);
        if (exists) return state;
        
        return {
          availableDevices: [...state.availableDevices, device],
        };
      });
    },

    removeAvailableDevice: (deviceId: string) => {
      set(state => ({
        availableDevices: state.availableDevices.filter(d => d.id !== deviceId),
      }));
    },

    clearAvailableDevices: () => {
      set({ availableDevices: [] });
    },
  }))
);

// Selectors for optimized component re-renders
export const selectConnectedDevices = (state: SensorState) => state.connectedDevices;
export const selectAvailableDevices = (state: SensorState) => state.availableDevices;
export const selectIsScanning = (state: SensorState) => state.isScanning;
export const selectConnectionStatus = (state: SensorState) => state.connectionStatus;
export const selectSensorData = (deviceId: string) => (state: SensorState) => 
  state.sensorData[deviceId];