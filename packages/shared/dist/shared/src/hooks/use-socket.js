import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useSensorStore } from '../store/sensor-store';
import { useAppStore } from '../store/app-store';
export function useSocket(options = {}) {
    const { url = '/socket.io', autoConnect = true, reconnection = true, reconnectionAttempts = 10, reconnectionDelay = 1000, } = options;
    const socketRef = useRef(null);
    const [socketState, setSocketState] = useState({
        connected: false,
        connecting: false,
        error: null,
        reconnectAttempts: 0,
    });
    // Store actions
    const { addAvailableDevice, removeAvailableDevice, updateSensorData, setConnectionStatus, } = useSensorStore();
    const { addError, setLoading } = useAppStore();
    useEffect(() => {
        if (!autoConnect)
            return;
        // Create socket connection
        const socket = io(url, {
            reconnection,
            reconnectionAttempts,
            reconnectionDelay,
            timeout: 5000,
        });
        socketRef.current = socket;
        // Connection events
        socket.on('connect', () => {
            console.log('🔌 Connected to UltiBiker server');
            setSocketState(prev => ({
                ...prev,
                connected: true,
                connecting: false,
                error: null,
                reconnectAttempts: 0,
            }));
            setConnectionStatus('connected');
            setLoading(false);
        });
        socket.on('disconnect', (reason) => {
            console.log('🔌 Disconnected from server:', reason);
            setSocketState(prev => ({
                ...prev,
                connected: false,
                connecting: false,
            }));
            setConnectionStatus('disconnected');
            if (reason === 'io server disconnect') {
                // Server initiated disconnect, don't auto-reconnect
                addError('Server disconnected the connection', 'error');
            }
        });
        socket.on('connect_error', (error) => {
            console.error('🔌 Connection error:', error.message);
            setSocketState(prev => ({
                ...prev,
                connected: false,
                connecting: false,
                error: error.message,
            }));
            setConnectionStatus('error');
            addError(`Connection failed: ${error.message}`, 'error');
        });
        socket.on('reconnect', (attemptNumber) => {
            console.log(`🔌 Reconnected after ${attemptNumber} attempts`);
            setSocketState(prev => ({
                ...prev,
                connected: true,
                connecting: false,
                error: null,
                reconnectAttempts: 0,
            }));
            setConnectionStatus('connected');
        });
        socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`🔌 Reconnection attempt ${attemptNumber}`);
            setSocketState(prev => ({
                ...prev,
                connecting: true,
                reconnectAttempts: attemptNumber,
            }));
            setConnectionStatus('connecting');
            setLoading(true, `Reconnecting... (${attemptNumber}/${reconnectionAttempts})`);
        });
        socket.on('reconnect_failed', () => {
            console.error('🔌 Failed to reconnect after maximum attempts');
            setSocketState(prev => ({
                ...prev,
                connected: false,
                connecting: false,
                error: 'Failed to reconnect',
            }));
            setConnectionStatus('error');
            setLoading(false);
            addError('Failed to reconnect to server', 'error');
        });
        // Sensor events
        socket.on('device-discovered', (device) => {
            console.log('📡 Device discovered:', device);
            addAvailableDevice(device);
        });
        socket.on('device-lost', (deviceId) => {
            console.log('📡 Device lost:', deviceId);
            removeAvailableDevice(deviceId);
        });
        socket.on('sensor-data', ({ deviceId, data }) => {
            updateSensorData(deviceId, data);
        });
        socket.on('scanning-started', () => {
            console.log('🔍 Scanning started');
            useSensorStore.getState().startScanning();
        });
        socket.on('scanning-stopped', () => {
            console.log('🔍 Scanning stopped');
            useSensorStore.getState().stopScanning();
        });
        // Error events
        socket.on('error', (error) => {
            console.error('🚨 Server error:', error);
            addError(error.message, error.type || 'error');
        });
        // Cleanup
        return () => {
            console.log('🔌 Cleaning up socket connection');
            socket.disconnect();
            socketRef.current = null;
        };
    }, [url, autoConnect, reconnection, reconnectionAttempts, reconnectionDelay]);
    // Socket methods
    const connect = () => {
        if (socketRef.current && !socketRef.current.connected) {
            socketRef.current.connect();
            setSocketState(prev => ({ ...prev, connecting: true }));
        }
    };
    const disconnect = () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
    };
    const emit = (event, data) => {
        if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit(event, data);
            return true;
        }
        console.warn(`Cannot emit '${event}': socket not connected`);
        return false;
    };
    const on = (event, handler) => {
        if (socketRef.current) {
            socketRef.current.on(event, handler);
            return () => socketRef.current?.off(event, handler);
        }
        return () => { };
    };
    return {
        socket: socketRef.current,
        ...socketState,
        connect,
        disconnect,
        emit,
        on,
    };
}
// Specific hooks for common socket operations
export function useSensorSocket() {
    const { emit, connected } = useSocket();
    return {
        connected,
        startScanning: () => emit('start-scanning'),
        stopScanning: () => emit('stop-scanning'),
        connectDevice: (deviceId) => emit('connect-device', { deviceId }),
        disconnectDevice: (deviceId) => emit('disconnect-device', { deviceId }),
        requestDeviceInfo: (deviceId) => emit('get-device-info', { deviceId }),
    };
}
