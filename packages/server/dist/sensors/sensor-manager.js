// FIXME: Consider enhanced event handling and state management libraries:
// - eventemitter3: Faster and feature-rich EventEmitter alternative
// - rxjs: Reactive programming for complex data streams and sensor events
// - p-queue: Priority queue for managing concurrent sensor operations
// - bottleneck: Rate limiting for sensor requests to prevent overwhelming devices
import { EventEmitter } from 'events';
import { ANTManager } from './ant-manager.js';
import { BLEManager } from './ble-manager.js';
import { DataParser } from './data-parser.js';
import { PermissionManager } from '../services/permission-manager.js';
import { logger } from '../utils/logger.js';
export class UltiBikerSensorManager extends EventEmitter {
    antManager;
    bleManager;
    dataParser;
    permissionManager;
    connectedDevices = new Map();
    discoveredDevices = new Map();
    isScanning = false;
    sessionManager = null;
    constructor(sessionManager) {
        super();
        console.log('🔧 Initializing Real Hardware Sensor Manager');
        this.antManager = new ANTManager();
        this.bleManager = new BLEManager();
        this.dataParser = new DataParser();
        this.permissionManager = new PermissionManager();
        // Inject session manager if provided
        if (sessionManager) {
            this.sessionManager = sessionManager;
            this.dataParser.setSessionManager(sessionManager);
        }
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        // ANT+ events
        this.antManager.on('device-discovered', (device) => {
            this.handleDeviceDiscovered(device);
        });
        this.antManager.on('device-connected', (device) => {
            this.handleDeviceConnected(device);
        });
        this.antManager.on('device-disconnected', (deviceId) => {
            this.handleDeviceDisconnected(deviceId);
        });
        this.antManager.on('sensor-data', (rawData) => {
            this.handleSensorData(rawData, 'ant_plus');
        });
        // BLE events
        this.bleManager.on('device-discovered', (device) => {
            this.handleDeviceDiscovered(device);
        });
        this.bleManager.on('device-connected', (device) => {
            this.handleDeviceConnected(device);
        });
        this.bleManager.on('device-disconnected', (deviceId) => {
            this.handleDeviceDisconnected(deviceId);
        });
        this.bleManager.on('sensor-data', (rawData) => {
            this.handleSensorData(rawData, 'bluetooth');
        });
    }
    async startScanning() {
        if (this.isScanning) {
            console.log('🔍 Already scanning for sensors...');
            return;
        }
        console.log('🔍 Starting sensor scanning...');
        // Check permissions before starting
        console.log('🔒 Checking device permissions...');
        const permissions = await this.permissionManager.checkAllPermissions();
        console.log('🔒 ' + this.permissionManager.getPermissionSummary());
        // Log detailed permission report if needed
        if (!permissions.bluetooth.granted && !permissions.bluetooth.denied) {
            console.log('💡 Bluetooth permission will be requested during scanning');
        }
        this.isScanning = true;
        this.discoveredDevices.clear();
        try {
            // Start ANT+ scanning (enabled by default, can be disabled with ANT_STICK_ENABLED=false)
            const antEnabled = process.env.ANT_STICK_ENABLED !== 'false';
            if (antEnabled) {
                console.log('📡 Attempting to start ANT+ scanning...');
                try {
                    await this.antManager.startScanning();
                    console.log('📡 ANT+ scanning started successfully');
                }
                catch (antError) {
                    console.warn('⚠️ ANT+ scanning failed (this is normal if no ANT+ stick is connected):', antError.message);
                }
            }
            else {
                console.log('📡 ANT+ scanning disabled by environment variable');
            }
            // Start BLE scanning (enabled by default, can be disabled with BLE_ENABLED=false)
            const bleEnabled = process.env.BLE_ENABLED !== 'false';
            if (bleEnabled) {
                console.log('📶 Attempting to start BLE scanning...');
                try {
                    await this.bleManager.startScanning();
                    console.log('📶 BLE scanning started successfully');
                }
                catch (bleError) {
                    console.warn('⚠️ BLE scanning failed (this is normal if Bluetooth is unavailable):', bleError.message);
                }
            }
            else {
                console.log('📶 BLE scanning disabled by environment variable');
            }
            // Auto-stop scanning after 60 seconds to save battery (longer for testing)
            setTimeout(() => {
                console.log('⏰ Auto-stopping scan after 60 seconds');
                this.stopScanning();
            }, 60000);
            console.log(`🔍 Scanning will continue for 60 seconds. Discovered devices: ${this.discoveredDevices.size}`);
        }
        catch (error) {
            console.error('❌ Failed to start scanning:', error);
            this.isScanning = false;
            // Don't throw error - allow partial scanning success
            console.log('ℹ️ Continuing with any successfully initialized sensor protocols');
        }
    }
    stopScanning() {
        if (!this.isScanning)
            return;
        console.log('⏹️  Stopping sensor scanning...');
        this.isScanning = false;
        this.antManager.stopScanning();
        this.bleManager.stopScanning();
        console.log(`🔍 Scan complete. Found ${this.discoveredDevices.size} devices`);
    }
    async connectDevice(deviceId) {
        const device = this.discoveredDevices.get(deviceId) || this.connectedDevices.get(deviceId);
        if (!device) {
            console.error(`❌ Device not found: ${deviceId}`);
            return false;
        }
        console.log(`🔗 Connecting to ${device.name} (${device.protocol})...`);
        try {
            let success = false;
            if (device.protocol === 'ant_plus') {
                success = await this.antManager.connectDevice(deviceId);
            }
            else if (device.protocol === 'bluetooth') {
                success = await this.bleManager.connectDevice(deviceId);
            }
            if (success) {
                device.isConnected = true;
                this.connectedDevices.set(deviceId, device);
                console.log(`✅ Connected to ${device.name}`);
                this.emit('device-status', {
                    type: 'device-status',
                    deviceId,
                    status: 'connected',
                    device
                });
            }
            return success;
        }
        catch (error) {
            console.error(`❌ Failed to connect to ${device.name}:`, error);
            this.emit('device-status', {
                type: 'device-status',
                deviceId,
                status: 'error',
                device
            });
            return false;
        }
    }
    async disconnectDevice(deviceId) {
        const device = this.connectedDevices.get(deviceId);
        if (!device) {
            console.error(`❌ Connected device not found: ${deviceId}`);
            return false;
        }
        console.log(`🔌 Disconnecting from ${device.name}...`);
        try {
            let success = false;
            if (device.protocol === 'ant_plus') {
                success = await this.antManager.disconnectDevice(deviceId);
            }
            else if (device.protocol === 'bluetooth') {
                success = await this.bleManager.disconnectDevice(deviceId);
            }
            if (success) {
                device.isConnected = false;
                this.connectedDevices.delete(deviceId);
                console.log(`✅ Disconnected from ${device.name}`);
                this.emit('device-status', {
                    type: 'device-status',
                    deviceId,
                    status: 'disconnected',
                    device
                });
            }
            return success;
        }
        catch (error) {
            console.error(`❌ Failed to disconnect from ${device.name}:`, error);
            return false;
        }
    }
    getConnectedDevices() {
        return Array.from(this.connectedDevices.values());
    }
    getDiscoveredDevices() {
        return Array.from(this.discoveredDevices.values());
    }
    async getPermissionStatus() {
        return await this.permissionManager.checkAllPermissions();
    }
    getPermissionSummary() {
        return this.permissionManager.getPermissionSummary();
    }
    async getPermissionGuide() {
        return await this.permissionManager.createPermissionGuide();
    }
    getPermissionReport() {
        return this.permissionManager.getDetailedReport();
    }
    handleDeviceDiscovered(device) {
        this.discoveredDevices.set(device.deviceId, device);
        console.log(`🔍 Discovered: ${device.name} (${device.type}) via ${device.protocol}`);
        // Log device discovery
        logger.sensor('Device discovered', {
            deviceId: device.deviceId,
            sensorType: device.type,
            event: 'device_discovered',
            data: {
                name: device.name,
                protocol: device.protocol,
                manufacturer: device.manufacturer,
                signalStrength: device.signalStrength
            },
            signalStrength: device.signalStrength
        });
        this.emit('scan-result', {
            type: 'scan-result',
            device
        });
    }
    handleDeviceConnected(device) {
        this.connectedDevices.set(device.deviceId, device);
        console.log(`🔗 Connected: ${device.name}`);
        // Log device connection
        logger.sensor('Device connected', {
            deviceId: device.deviceId,
            sensorType: device.type,
            event: 'device_connected',
            data: {
                name: device.name,
                protocol: device.protocol,
                batteryLevel: device.batteryLevel,
                firmwareVersion: device.firmwareVersion
            },
            signalStrength: device.signalStrength
        });
        this.emit('device-status', {
            type: 'device-status',
            deviceId: device.deviceId,
            status: 'connected',
            device
        });
    }
    handleDeviceDisconnected(deviceId) {
        const device = this.connectedDevices.get(deviceId);
        if (device) {
            device.isConnected = false;
            this.connectedDevices.delete(deviceId);
            console.log(`🔌 Disconnected: ${device.name}`);
            this.emit('device-status', {
                type: 'device-status',
                deviceId,
                status: 'disconnected',
                device
            });
        }
    }
    async handleSensorData(rawData, protocol) {
        try {
            const parsedData = this.dataParser.parse(rawData, protocol);
            if (parsedData) {
                console.log(`📊 ${parsedData.metricType}: ${parsedData.value} ${parsedData.unit} (${parsedData.deviceId})`);
                // Store data in database (optional for MVP - data will be stored via API if needed)
                // await this.storeSensorData(parsedData);
                this.emit('sensor-data', {
                    type: 'sensor-data',
                    data: parsedData
                });
            }
        }
        catch (error) {
            console.error('❌ Failed to parse sensor data:', error);
        }
    }
    // Graceful shutdown
    async shutdown() {
        console.log('🔄 Shutting down sensor manager...');
        this.stopScanning();
        // Disconnect all devices
        const disconnectPromises = Array.from(this.connectedDevices.keys()).map(deviceId => this.disconnectDevice(deviceId));
        await Promise.all(disconnectPromises);
        await this.antManager.shutdown();
        await this.bleManager.shutdown();
        console.log('✅ Sensor manager shutdown complete');
    }
}
//# sourceMappingURL=sensor-manager.js.map