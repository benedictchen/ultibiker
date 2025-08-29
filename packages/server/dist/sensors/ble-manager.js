import { EventEmitter } from 'events';
// DeviceIdentifier not implemented yet - using simplified identification
// Dynamic import for noble to handle CommonJS module
let noble = null;
// Standard Cycling BLE Service UUIDs
const CyclingServices = {
    HEART_RATE: '180d',
    CYCLING_POWER: '1818',
    CYCLING_SPEED_CADENCE: '1816',
    FITNESS_MACHINE: '1826',
    BATTERY_SERVICE: '180f',
    DEVICE_INFORMATION: '180a'
};
// BLE Characteristic UUIDs
const Characteristics = {
    HEART_RATE_MEASUREMENT: '2a37',
    CYCLING_POWER_MEASUREMENT: '2a63',
    CSC_MEASUREMENT: '2a5b',
    INDOOR_BIKE_DATA: '2ad2',
    BATTERY_LEVEL: '2a19'
};
export class BLEManager extends EventEmitter {
    isScanning = false;
    discoveredDevices = new Map(); // Noble peripherals
    connectedDevices = new Map();
    dataIntervals = new Map(); // For cleanup
    isInitialized = false;
    async startScanning() {
        if (this.isScanning) {
            console.log('📶 BLE scanning already in progress');
            return;
        }
        console.log('📶 Starting BLE scanning...');
        try {
            console.log('📶 Checking Bluetooth permissions...');
            await this.checkPermissions();
            console.log('📶 Initializing Bluetooth adapter...');
            await this.initializeNoble();
            console.log(`📶 Bluetooth adapter state: ${noble._state}`);
            const currentState = noble.state || noble._state || 'unknown';
            if (currentState !== 'poweredOn') {
                const errorMessage = this.getBluetoothErrorMessage(currentState);
                throw new Error(errorMessage);
            }
            this.isScanning = true;
            // Scan for cycling-related services
            const servicesToScan = [
                CyclingServices.HEART_RATE,
                CyclingServices.CYCLING_POWER,
                CyclingServices.CYCLING_SPEED_CADENCE,
                CyclingServices.FITNESS_MACHINE
            ];
            console.log(`📶 Starting BLE scan for services: ${servicesToScan.join(', ')}`);
            noble.startScanning(servicesToScan, false);
            console.log('✅ BLE scanning started successfully - listening for cycling sensors');
            console.log('🔍 Looking for: Heart Rate monitors, Power meters, Speed/Cadence sensors, Smart trainers');
            // Also start a broader scan after 5 seconds if no devices found
            setTimeout(() => {
                if (this.discoveredDevices.size === 0 && this.isScanning) {
                    console.log('🔍 No cycling sensors found with service filtering, trying broader scan...');
                    noble.stopScanning();
                    setTimeout(() => {
                        if (this.isScanning) {
                            noble.startScanning([], false); // Scan all devices but don't duplicate
                            console.log('🔍 Started broader BLE scan (all devices)');
                        }
                    }, 1000);
                }
            }, 5000);
        }
        catch (error) {
            console.error('❌ Failed to start BLE scanning:', error);
            this.isScanning = false;
            throw new Error(`BLE scanning failed: ${error.message}`);
        }
    }
    stopScanning() {
        if (!this.isScanning)
            return;
        console.log('📶 Stopping BLE scanning');
        this.isScanning = false;
        const currentState = noble?.state || noble?._state || 'unknown';
        if (currentState === 'poweredOn' && noble) {
            noble.stopScanning();
        }
        console.log('📶 BLE scanning stopped');
    }
    async connectDevice(deviceId) {
        console.log(`📶 Connecting to BLE device: ${deviceId}`);
        const peripheral = this.discoveredDevices.get(deviceId);
        if (!peripheral) {
            console.error(`BLE device ${deviceId} not found in discovered devices`);
            return false;
        }
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout'));
            }, 10000);
            peripheral.connect((error) => {
                clearTimeout(timeout);
                if (error) {
                    console.error(`❌ Failed to connect to ${peripheral.advertisement.localName || deviceId}:`, error);
                    reject(error);
                    return;
                }
                console.log(`✅ Connected to ${peripheral.advertisement.localName || deviceId}`);
                // Create device entry
                const device = {
                    deviceId,
                    name: peripheral.advertisement.localName || `BLE Device ${deviceId.slice(-4)}`,
                    type: this.identifyDeviceType(peripheral.advertisement.serviceUuids || []) || 'heart_rate',
                    protocol: 'bluetooth',
                    isConnected: true,
                    signalStrength: this.calculateSignalStrength(peripheral.rssi),
                    manufacturer: peripheral.advertisement.manufacturerData ? 'Unknown' : undefined
                };
                this.connectedDevices.set(deviceId, device);
                this.emit('device-connected', device);
                // Setup services and characteristics
                this.setupDeviceServices(peripheral, device);
                resolve(true);
            });
        });
    }
    async disconnectDevice(deviceId) {
        console.log(`📶 Disconnecting BLE device: ${deviceId}`);
        const peripheral = this.discoveredDevices.get(deviceId);
        const device = this.connectedDevices.get(deviceId);
        if (!peripheral || !device) {
            console.error(`BLE device ${deviceId} not found`);
            return false;
        }
        return new Promise((resolve) => {
            // Stop any data intervals
            const interval = this.dataIntervals.get(deviceId);
            if (interval) {
                clearInterval(interval);
                this.dataIntervals.delete(deviceId);
            }
            peripheral.disconnect((error) => {
                if (error) {
                    console.warn(`Warning during BLE disconnection for ${deviceId}:`, error);
                }
                device.isConnected = false;
                this.connectedDevices.delete(deviceId);
                this.emit('device-disconnected', deviceId);
                console.log(`✅ BLE device ${device.name} disconnected`);
                resolve(true);
            });
        });
    }
    async initializeNoble() {
        if (this.isInitialized && noble) {
            console.log('📶 Noble already initialized');
            return;
        }
        console.log('📶 Initializing Noble Bluetooth library...');
        // Dynamic import to handle CommonJS module
        if (!noble) {
            try {
                noble = await import('@abandonware/noble').then(m => m.default || m);
                console.log('📶 Noble library loaded successfully');
            }
            catch (error) {
                throw new Error(`Failed to load Noble Bluetooth library: ${error.message}`);
            }
        }
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Bluetooth initialization timeout (10s). Make sure Bluetooth is enabled and this app has necessary permissions.'));
            }, 10000);
            const onStateChange = (state) => {
                console.log(`📶 Bluetooth adapter state changed: ${state}`);
                if (state === 'poweredOn') {
                    clearTimeout(timeout);
                    noble.removeListener('stateChange', onStateChange);
                    this.setupNobleEventHandlers();
                    this.isInitialized = true;
                    console.log('✅ Bluetooth adapter ready for scanning');
                    resolve();
                }
                else if (state === 'poweredOff') {
                    clearTimeout(timeout);
                    noble.removeListener('stateChange', onStateChange);
                    reject(new Error('Bluetooth adapter is powered off. Please enable Bluetooth in System Preferences.'));
                }
                else if (state === 'unsupported') {
                    clearTimeout(timeout);
                    noble.removeListener('stateChange', onStateChange);
                    reject(new Error('Bluetooth Low Energy not supported on this system.'));
                }
                else if (state === 'unauthorized') {
                    clearTimeout(timeout);
                    noble.removeListener('stateChange', onStateChange);
                    reject(new Error('Bluetooth access unauthorized. Please grant Bluetooth permissions to this app in System Preferences > Privacy & Security > Bluetooth.'));
                }
                else {
                    console.log(`📶 Waiting for Bluetooth to be ready... (current state: ${state})`);
                }
            };
            noble.on('stateChange', onStateChange);
            // Check current state immediately
            const currentState = noble.state || noble._state || 'unknown';
            console.log(`📶 Current Bluetooth state: ${currentState}`);
            if (currentState === 'poweredOn') {
                onStateChange('poweredOn');
            }
            else if (currentState !== 'unknown') {
                onStateChange(currentState);
            }
            else {
                console.log('📶 Waiting for initial Bluetooth state...');
            }
        });
    }
    setupNobleEventHandlers() {
        noble.on('discover', (peripheral) => {
            this.handleDeviceDiscovery(peripheral);
        });
    }
    handleDeviceDiscovery(peripheral) {
        const { advertisement, rssi } = peripheral;
        const localName = peripheral.advertisement.localName;
        const id = peripheral.id;
        const serviceUuids = advertisement.serviceUuids || [];
        console.log(`🔍 BLE device found: ${localName || 'Unknown'} (${id}) RSSI: ${rssi}dBm Services: [${serviceUuids.join(', ')}]`);
        // Basic device identification (simplified for now)
        const deviceType = this.identifyDeviceType(serviceUuids) || this.identifyDeviceTypeByName(localName || '');
        // Filter out devices that aren't cycling-related
        if (!deviceType && !this.isPotentialCyclingDevice(localName || '', serviceUuids)) {
            console.log(`⚠️ Ignoring device ${localName || 'Unknown'} - not cycling-related`);
            return;
        }
        // Store the peripheral for later connection
        this.discoveredDevices.set(id, peripheral);
        const device = {
            deviceId: id,
            name: localName || `BLE Device ${id.slice(-4)}`,
            type: deviceType || 'heart_rate',
            protocol: 'bluetooth',
            isConnected: false,
            signalStrength: this.calculateSignalStrength(rssi),
            manufacturer: 'Unknown'
        };
        console.log(`✅ Discovered: ${device.name} | ${device.manufacturer || 'Unknown'} | Type: ${device.type} | Signal: ${device.signalStrength}%`);
        this.emit('device-discovered', device);
    }
    isPotentialCyclingDevice(deviceName, serviceUuids) {
        // Check if device has cycling-related indicators
        const cyclingIndicators = [
            'heart', 'hr', 'power', 'cadence', 'speed', 'trainer', 'cycling',
            'polar', 'wahoo', 'garmin', 'stages', 'quarq', 'kickr', 'tacx'
        ];
        const name = deviceName.toLowerCase();
        const hasNameIndicator = cyclingIndicators.some(indicator => name.includes(indicator));
        const hasCyclingService = serviceUuids.some(service => ['180d', '1818', '1816', '1826'].includes(service.replace(/-/g, '').substring(4, 8)));
        return hasNameIndicator || hasCyclingService;
    }
    identifyDeviceType(serviceUuids) {
        const services = serviceUuids.map(uuid => uuid.toLowerCase());
        if (services.includes(CyclingServices.HEART_RATE))
            return 'heart_rate';
        if (services.includes(CyclingServices.CYCLING_POWER))
            return 'power';
        if (services.includes(CyclingServices.CYCLING_SPEED_CADENCE))
            return 'cadence';
        if (services.includes(CyclingServices.FITNESS_MACHINE))
            return 'trainer';
        return null;
    }
    identifyDeviceTypeByName(deviceName) {
        if (!deviceName)
            return null;
        const name = deviceName.toLowerCase();
        // Heart rate monitors
        if (name.includes('heart') || name.includes('hr') || name.includes('polar') ||
            name.includes('wahoo') || name.includes('garmin') || name.includes('chest')) {
            return 'heart_rate';
        }
        // Power meters
        if (name.includes('power') || name.includes('stages') || name.includes('quarq') ||
            name.includes('sram') || name.includes('rotor') || name.includes('4iiii')) {
            return 'power';
        }
        // Speed/cadence sensors
        if (name.includes('cadence') || name.includes('speed') || name.includes('rpm') ||
            name.includes('csc') || name.includes('duotrap')) {
            return 'cadence';
        }
        // Smart trainers
        if (name.includes('trainer') || name.includes('kickr') || name.includes('neo') ||
            name.includes('flux') || name.includes('elite') || name.includes('tacx')) {
            return 'trainer';
        }
        return null;
    }
    async checkPermissions() {
        const platform = process.platform;
        if (platform === 'darwin') {
            console.log('📶 macOS detected - Bluetooth permission will be requested automatically');
            console.log('💡 If prompted, please grant Bluetooth access to this application');
        }
        else if (platform === 'linux') {
            console.log('📶 Linux detected - checking Bluetooth service and permissions...');
            try {
                const { exec } = await import('child_process');
                const { promisify } = await import('util');
                const execAsync = promisify(exec);
                // Check if user is in bluetooth group
                const { stdout: groups } = await execAsync('groups');
                if (!groups.includes('bluetooth')) {
                    console.warn('⚠️ User not in bluetooth group. You may need to run: sudo usermod -a -G bluetooth $USER');
                }
                // Check if bluetooth service is running
                try {
                    const { stdout: serviceStatus } = await execAsync('systemctl is-active bluetooth');
                    if (serviceStatus.trim() !== 'active') {
                        console.warn('⚠️ Bluetooth service not active. You may need to run: sudo systemctl start bluetooth');
                    }
                }
                catch (serviceError) {
                    console.log('ℹ️ Could not check Bluetooth service status (may not be systemd)');
                }
            }
            catch (error) {
                console.log('ℹ️ Could not check Linux Bluetooth permissions - continuing anyway');
            }
        }
        else if (platform === 'win32') {
            console.log('📶 Windows detected - ensure Bluetooth is enabled in Settings');
        }
    }
    getBluetoothErrorMessage(state) {
        const platform = process.platform;
        switch (state) {
            case 'unauthorized':
                if (platform === 'darwin') {
                    return `Bluetooth access denied. Please go to System Preferences > Privacy & Security > Bluetooth and enable access for this application. Then restart UltiBiker.`;
                }
                return `Bluetooth access unauthorized. Please check system Bluetooth permissions.`;
            case 'poweredOff':
                if (platform === 'darwin') {
                    return `Bluetooth is turned off. Please enable Bluetooth in System Preferences > Bluetooth or in Control Center.`;
                }
                else if (platform === 'win32') {
                    return `Bluetooth is turned off. Please enable Bluetooth in Settings > Devices > Bluetooth & other devices.`;
                }
                return `Bluetooth is turned off. Please enable Bluetooth in your system settings.`;
            case 'unsupported':
                return `Bluetooth Low Energy is not supported on this system. UltiBiker requires BLE support for wireless sensor detection.`;
            case 'unknown':
                if (platform === 'darwin') {
                    return `Bluetooth adapter state is unknown. This may indicate a permission issue. Please check System Preferences > Privacy & Security > Bluetooth and ensure this app has access. You may need to restart the app.`;
                }
                return `Bluetooth adapter state is unknown. Please check that Bluetooth is enabled and working properly.`;
            default:
                return `Bluetooth adapter not ready. State: ${state}. Please check that Bluetooth is enabled and this app has permission to access Bluetooth.`;
        }
    }
    calculateSignalStrength(rssi) {
        // Convert RSSI to percentage (rough approximation)
        // RSSI typically ranges from -30 (excellent) to -90 (poor)
        const strength = Math.max(0, Math.min(100, (rssi + 90) * (100 / 60)));
        return Math.round(strength);
    }
    setupDeviceServices(peripheral, device) {
        peripheral.discoverServices([], (error, services) => {
            if (error) {
                console.error(`❌ Service discovery error for ${device.name}:`, error);
                return;
            }
            services.forEach(service => {
                this.discoverCharacteristics(peripheral, service, device);
            });
        });
    }
    discoverCharacteristics(peripheral, service, device) {
        service.discoverCharacteristics([], (error, characteristics) => {
            if (error) {
                console.error(`❌ Characteristic discovery error for ${device.name}:`, error);
                return;
            }
            characteristics.forEach(characteristic => {
                this.setupCharacteristic(peripheral, characteristic, device);
            });
        });
    }
    setupCharacteristic(peripheral, characteristic, device) {
        const uuid = characteristic.uuid.toLowerCase();
        try {
            // Heart Rate Measurement
            if (uuid === Characteristics.HEART_RATE_MEASUREMENT) {
                characteristic.subscribe((error) => {
                    if (error) {
                        console.error(`❌ Failed to subscribe to heart rate for ${device.name}:`, error);
                        return;
                    }
                });
                characteristic.on('data', (data) => {
                    const heartRate = this.parseHeartRateData(data);
                    if (heartRate > 0) {
                        this.emit('sensor-data', {
                            deviceId: device.deviceId,
                            type: 'heart_rate',
                            value: heartRate,
                            timestamp: new Date(),
                            rawData: { buffer: data.toString('hex') }
                        });
                    }
                });
            }
            // Cycling Power Measurement
            else if (uuid === Characteristics.CYCLING_POWER_MEASUREMENT) {
                characteristic.subscribe((error) => {
                    if (error) {
                        console.error(`❌ Failed to subscribe to power for ${device.name}:`, error);
                        return;
                    }
                });
                characteristic.on('data', (data) => {
                    const power = this.parsePowerData(data);
                    if (power >= 0) {
                        this.emit('sensor-data', {
                            deviceId: device.deviceId,
                            type: 'power',
                            value: power,
                            timestamp: new Date(),
                            rawData: { buffer: data.toString('hex') }
                        });
                    }
                });
            }
            // CSC Measurement (Speed & Cadence)
            else if (uuid === Characteristics.CSC_MEASUREMENT) {
                characteristic.subscribe((error) => {
                    if (error) {
                        console.error(`❌ Failed to subscribe to CSC for ${device.name}:`, error);
                        return;
                    }
                });
                characteristic.on('data', (data) => {
                    const { speed, cadence } = this.parseCSCData(data, device.deviceId);
                    if (speed !== null && speed > 0) {
                        this.emit('sensor-data', {
                            deviceId: device.deviceId,
                            type: 'speed',
                            value: speed,
                            timestamp: new Date(),
                            rawData: { buffer: data.toString('hex') }
                        });
                    }
                    if (cadence !== null && cadence > 0) {
                        this.emit('sensor-data', {
                            deviceId: device.deviceId,
                            type: 'cadence',
                            value: cadence,
                            timestamp: new Date(),
                            rawData: { buffer: data.toString('hex') }
                        });
                    }
                });
            }
            // Indoor Bike Data (Smart Trainers)
            else if (uuid === Characteristics.INDOOR_BIKE_DATA) {
                characteristic.subscribe((error) => {
                    if (error) {
                        console.error(`❌ Failed to subscribe to trainer data for ${device.name}:`, error);
                        return;
                    }
                });
                characteristic.on('data', (data) => {
                    const trainerData = this.parseTrainerData(data);
                    Object.entries(trainerData).forEach(([type, value]) => {
                        if (value !== null && value > 0) {
                            this.emit('sensor-data', {
                                deviceId: device.deviceId,
                                type: type,
                                value: value,
                                timestamp: new Date(),
                                rawData: { buffer: data.toString('hex') }
                            });
                        }
                    });
                });
            }
        }
        catch (error) {
            console.error(`❌ Error setting up characteristic ${uuid} for ${device.name}:`, error);
        }
    }
    // Data parsing methods for BLE characteristics
    parseHeartRateData(data) {
        if (data.length < 2)
            return 0;
        const flags = data.readUInt8(0);
        const is16Bit = flags & 0x01;
        if (is16Bit && data.length >= 3) {
            return data.readUInt16LE(1);
        }
        else if (!is16Bit && data.length >= 2) {
            return data.readUInt8(1);
        }
        return 0;
    }
    parsePowerData(data) {
        if (data.length < 4)
            return -1;
        // Skip flags (2 bytes) and read instantaneous power (2 bytes)
        return data.readUInt16LE(2);
    }
    parseCSCData(data, deviceId) {
        if (data.length < 1)
            return { speed: null, cadence: null };
        const flags = data.readUInt8(0);
        const hasWheelRevolution = flags & 0x01;
        const hasCrankRevolution = flags & 0x02;
        let offset = 1;
        let speed = null;
        let cadence = null;
        if (hasWheelRevolution && data.length >= offset + 6) {
            const wheelRevolutions = data.readUInt32LE(offset);
            const wheelEventTime = data.readUInt16LE(offset + 4);
            offset += 6;
            // Calculate speed (requires previous readings for proper calculation)
            speed = this.calculateSpeedFromRevolutions(deviceId, wheelRevolutions, wheelEventTime);
        }
        if (hasCrankRevolution && data.length >= offset + 4) {
            const crankRevolutions = data.readUInt16LE(offset);
            const crankEventTime = data.readUInt16LE(offset + 2);
            // Calculate cadence
            cadence = this.calculateCadenceFromRevolutions(deviceId, crankRevolutions, crankEventTime);
        }
        return { speed, cadence };
    }
    parseTrainerData(data) {
        if (data.length < 2)
            return {};
        const flags = data.readUInt16LE(0);
        let offset = 2;
        const result = {};
        // Parse based on flags (this is a simplified implementation)
        if ((flags & 0x0001) && data.length >= offset + 2) {
            // Instantaneous speed present
            result.speed = data.readUInt16LE(offset) * 0.01; // Convert to km/h
            offset += 2;
        }
        if ((flags & 0x0004) && data.length >= offset + 2) {
            // Instantaneous cadence present
            result.cadence = data.readUInt16LE(offset) * 0.5; // Convert to RPM
            offset += 2;
        }
        if ((flags & 0x0040) && data.length >= offset + 2) {
            // Instantaneous power present
            result.power = data.readUInt16LE(offset);
            offset += 2;
        }
        return result;
    }
    // Helper methods for calculating speed and cadence from revolutions
    previousWheelData = new Map();
    previousCrankData = new Map();
    calculateSpeedFromRevolutions(deviceId, revolutions, eventTime) {
        const now = Date.now();
        const previous = this.previousWheelData.get(deviceId);
        if (!previous) {
            this.previousWheelData.set(deviceId, { revolutions, eventTime, timestamp: now });
            return null;
        }
        const deltaRevolutions = revolutions - previous.revolutions;
        const deltaTime = eventTime - previous.eventTime;
        if (deltaRevolutions <= 0 || deltaTime <= 0)
            return null;
        // Assume 2.1m wheel circumference (700x25c tire)
        const wheelCircumference = 2.1; // meters
        const timeInSeconds = deltaTime / 1024.0; // Event time is in 1/1024 seconds
        const distanceInMeters = deltaRevolutions * wheelCircumference;
        const speedInKmh = (distanceInMeters / timeInSeconds) * 3.6;
        this.previousWheelData.set(deviceId, { revolutions, eventTime, timestamp: now });
        return Math.round(speedInKmh * 10) / 10; // Round to 1 decimal place
    }
    calculateCadenceFromRevolutions(deviceId, revolutions, eventTime) {
        const now = Date.now();
        const previous = this.previousCrankData.get(deviceId);
        if (!previous) {
            this.previousCrankData.set(deviceId, { revolutions, eventTime, timestamp: now });
            return null;
        }
        const deltaRevolutions = revolutions - previous.revolutions;
        const deltaTime = eventTime - previous.eventTime;
        if (deltaRevolutions <= 0 || deltaTime <= 0)
            return null;
        const timeInMinutes = (deltaTime / 1024.0) / 60.0; // Convert to minutes
        const cadenceRpm = deltaRevolutions / timeInMinutes;
        this.previousCrankData.set(deviceId, { revolutions, eventTime, timestamp: now });
        return Math.round(cadenceRpm);
    }
    async shutdown() {
        console.log('📶 Shutting down BLE manager...');
        this.stopScanning();
        // Clear all data intervals
        this.dataIntervals.forEach(interval => clearInterval(interval));
        this.dataIntervals.clear();
        // Disconnect all devices
        const disconnectPromises = Array.from(this.connectedDevices.keys()).map(deviceId => this.disconnectDevice(deviceId));
        await Promise.all(disconnectPromises);
        // Clear device maps
        this.discoveredDevices.clear();
        this.connectedDevices.clear();
        this.previousWheelData.clear();
        this.previousCrankData.clear();
        // Remove noble event listeners
        if (this.isInitialized) {
            noble.removeAllListeners();
            this.isInitialized = false;
        }
        console.log('✅ BLE manager shutdown complete');
    }
}
//# sourceMappingURL=ble-manager.js.map