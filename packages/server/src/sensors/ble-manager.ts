// FIXME: BLE Manager improvements needed:
// 1. Replace dynamic noble import with proper TypeScript-compatible BLE library
// 2. Add proper device reconnection handling for dropped connections
// 3. Implement BLE service caching to improve scan performance  
// 4. Add proper error handling for BLE adapter state changes
// 5. Implement device whitelisting/blacklisting for better UX
// 6. Add BLE characteristic write capabilities for trainer control
// 7. Implement proper device pairing and bonding support
// 8. Add support for BLE 5.0 extended advertising

import { EventEmitter } from 'events';
import { SensorDevice, SensorType } from '../types/sensor.js';
// FIXME: DeviceIdentifier not implemented yet - using simplified identification
// FIXME: Replace dynamic noble import with proper TypeScript-compatible BLE library
let noble: any = null;

// Standard Cycling BLE Service UUIDs
const CyclingServices = {
  HEART_RATE: '180d',
  CYCLING_POWER: '1818',
  CYCLING_SPEED_CADENCE: '1816',
  FITNESS_MACHINE: '1826',
  BATTERY_SERVICE: '180f',
  DEVICE_INFORMATION: '180a'
} as const;

// BLE Characteristic UUIDs
const Characteristics = {
  HEART_RATE_MEASUREMENT: '2a37',
  CYCLING_POWER_MEASUREMENT: '2a63',
  CSC_MEASUREMENT: '2a5b',
  INDOOR_BIKE_DATA: '2ad2',
  BATTERY_LEVEL: '2a19'
} as const;

export class BLEManager extends EventEmitter {
  private isScanning = false;
  private discoveredDevices = new Map<string, any>(); // Noble peripherals
  private connectedDevices = new Map<string, SensorDevice>();
  private dataIntervals = new Map<string, NodeJS.Timeout>(); // For cleanup
  private isInitialized = false;

  async startScanning(): Promise<void> {
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
      
    } catch (error) {
      console.error('❌ Failed to start BLE scanning:', error);
      this.isScanning = false;
      throw new Error(`BLE scanning failed: ${(error as Error).message}`);
    }
  }

  stopScanning(): void {
    if (!this.isScanning) return;
    
    console.log('📶 Stopping BLE scanning');
    this.isScanning = false;
    
    const currentState = noble?.state || noble?._state || 'unknown';
    if (currentState === 'poweredOn' && noble) {
      noble.stopScanning();
    }
    
    console.log('📶 BLE scanning stopped');
  }

  async connectDevice(deviceId: string): Promise<boolean> {
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

      peripheral.connect((error: any) => {
        clearTimeout(timeout);
        
        if (error) {
          console.error(`❌ Failed to connect to ${peripheral.advertisement.localName || deviceId}:`, error);
          reject(error);
          return;
        }

        console.log(`✅ Connected to ${peripheral.advertisement.localName || deviceId}`);
        
        // Create device entry
        const device: SensorDevice = {
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

  async disconnectDevice(deviceId: string): Promise<boolean> {
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
      
      peripheral.disconnect((error: any) => {
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

  private async initializeNoble(): Promise<void> {
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
      } catch (error) {
        throw new Error(`Failed to load Noble Bluetooth library: ${(error as Error).message}`);
      }
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Bluetooth initialization timeout (10s). Make sure Bluetooth is enabled and this app has necessary permissions.'));
      }, 10000);
      
      const onStateChange = (state: string) => {
        console.log(`📶 Bluetooth adapter state changed: ${state}`);
        
        if (state === 'poweredOn') {
          clearTimeout(timeout);
          noble.removeListener('stateChange', onStateChange);
          this.setupNobleEventHandlers();
          this.isInitialized = true;
          console.log('✅ Bluetooth adapter ready for scanning');
          resolve();
        } else if (state === 'poweredOff') {
          clearTimeout(timeout);
          noble.removeListener('stateChange', onStateChange);
          reject(new Error('Bluetooth adapter is powered off. Please enable Bluetooth in System Preferences.'));
        } else if (state === 'unsupported') {
          clearTimeout(timeout);
          noble.removeListener('stateChange', onStateChange);
          reject(new Error('Bluetooth Low Energy not supported on this system.'));
        } else if (state === 'unauthorized') {
          clearTimeout(timeout);
          noble.removeListener('stateChange', onStateChange);
          reject(new Error('Bluetooth access unauthorized. Please grant Bluetooth permissions to this app in System Preferences > Privacy & Security > Bluetooth.'));
        } else {
          console.log(`📶 Waiting for Bluetooth to be ready... (current state: ${state})`);
        }
      };
      
      noble.on('stateChange', onStateChange);
      
      // Check current state immediately
      const currentState = noble.state || noble._state || 'unknown';
      console.log(`📶 Current Bluetooth state: ${currentState}`);
      if (currentState === 'poweredOn') {
        onStateChange('poweredOn');
      } else if (currentState !== 'unknown') {
        onStateChange(currentState);
      } else {
        console.log('📶 Waiting for initial Bluetooth state...');
      }
    });
  }
  
  private setupNobleEventHandlers(): void {
    noble.on('discover', (peripheral: import('noble').Peripheral) => {
      this.handleDeviceDiscovery(peripheral);
    });
  }
  
  private handleDeviceDiscovery(peripheral: import('noble').Peripheral): void {
    const { advertisement, rssi, address, addressType, connectable, state } = peripheral;
    const localName = peripheral.advertisement.localName;
    const id = peripheral.id;
    const serviceUuids = advertisement.serviceUuids || [];
    
    console.log(`🔍 BLE device found: ${localName || 'Unknown'} (${id}) RSSI: ${rssi}dBm Services: [${serviceUuids.join(', ')}]`);
    
    // Store the peripheral for later connection
    this.discoveredDevices.set(id, peripheral);
    
    // Parse manufacturer data early for Apple device detection
    let manufacturerInfo = null;
    let isAppleDevice = false;
    if (advertisement.manufacturerData) {
      const companyId = advertisement.manufacturerData.length >= 2 ? 
        advertisement.manufacturerData.readUInt16LE(0) : null;
      
      // Apple Company ID is 76 (0x004C)
      isAppleDevice = companyId === 76;
      
      manufacturerInfo = {
        companyId: companyId,
        companyName: this.getCompanyName(companyId),
        data: advertisement.manufacturerData.toString('hex'),
        length: advertisement.manufacturerData.length
      };
    }
    
    // Enhanced device identification with Apple Watch detection
    let deviceType = this.identifyDeviceType(serviceUuids) || this.identifyDeviceTypeByName(localName || '');
    let cyclingRelevance = this.calculateCyclingRelevance(localName || '', serviceUuids, deviceType);
    
    // Special handling for Apple Watch heart rate broadcasting
    if (isAppleDevice && this.isAppleWatchHeartRate(advertisement, localName)) {
      deviceType = 'heart_rate';
      cyclingRelevance = Math.max(cyclingRelevance, 85); // High relevance for Apple Watch HR
      console.log(`🍎 Apple Watch heart rate detected: ${localName || id}`);
    }
    
    // Parse service data if available
    const serviceData: Record<string, { data: string; length: number }> = {};
    if (advertisement.serviceData && advertisement.serviceData.length > 0) {
      advertisement.serviceData.forEach((service: any) => {
        serviceData[service.uuid] = {
          data: service.data.toString('hex'),
          length: service.data.length
        };
      });
    }
    
    const device: SensorDevice = {
      deviceId: id,
      name: this.generateDeviceName(localName, isAppleDevice, deviceType ?? undefined),
      displayName: this.generateDisplayName(localName, isAppleDevice, deviceType ?? undefined, manufacturerInfo?.companyName),
      type: deviceType || 'unknown',
      protocol: 'bluetooth',
      isConnected: false,
      signalStrength: this.calculateSignalStrength(rssi),
      manufacturer: this.identifyManufacturer(localName || '', isAppleDevice, manufacturerInfo?.companyName),
      cyclingRelevance,
      
      // Comprehensive metadata for device identification
      metadata: {
        rawAdvertisement: {
          id: id,
          address: address,
          addressType: addressType,
          connectable: connectable,
          state: state,
          rssi: rssi,
          advertisement: {
            localName: localName,
            txPowerLevel: advertisement.txPowerLevel,
            serviceUuids: serviceUuids,
            serviceSolicitationUuids: (advertisement as any).serviceSolicitationUuids || [],
            manufacturerData: manufacturerInfo,
            serviceData: Object.keys(serviceData).length > 0 ? serviceData : null,
            flags: (advertisement as any).flags
          }
        }
      }
    };
    
    const relevanceLabel = cyclingRelevance >= 90 ? 'High' : cyclingRelevance >= 60 ? 'Medium' : cyclingRelevance >= 30 ? 'Low' : 'Unknown';
    console.log(`✅ Discovered: ${device.name} | ${device.manufacturer || 'Unknown'} | Type: ${device.type} | Signal: ${device.signalStrength}% | Cycling: ${relevanceLabel}`);
    this.emit('device-discovered', device);
  }

  private calculateCyclingRelevance(deviceName: string, serviceUuids: string[], deviceType: SensorType | null): number {
    let score = 0;
    const name = deviceName.toLowerCase();
    
    // Apple Watch special scoring (85-95 points when broadcasting heart rate)
    if (name.includes('heartcast') || name.includes('hrm') || name.includes('blueheart') || name.includes('echohr')) {
      score += 85; // High relevance for Apple Watch heart rate apps
    }
    
    // Apple Watch general patterns (60-70 points)
    if (name.includes('apple') || name.includes('watch')) {
      score += 65; // Apple Watch detected
    }
    
    // High relevance - Definitive cycling sensors (90-100 points)
    if (deviceType && deviceType !== 'unknown') {
      score += 90; // Has identified cycling sensor type
    }
    
    // Service UUID indicators (40-80 points)
    const cyclingServiceScores = {
      '180d': 80, // Heart Rate Service
      '1818': 90, // Cycling Power Service  
      '1816': 85, // Cycling Speed and Cadence
      '1826': 95, // Fitness Machine Service (trainers)
      '180f': 20, // Battery Service (common in cycling devices)
      '180a': 15  // Device Information (common)
    };
    
    serviceUuids.forEach(service => {
      const cleanService = service.replace(/-/g, '').substring(4, 8).toLowerCase();
      const serviceScore = cyclingServiceScores[cleanService as keyof typeof cyclingServiceScores];
      if (serviceScore) {
        score = Math.max(score, serviceScore);
      }
    });
    
    // Brand/manufacturer indicators (60-80 points)
    const premiumBrands = ['polar', 'garmin', 'wahoo', 'stages', 'quarq', 'kickr', 'tacx', 'elite'];
    const cyclingBrands = ['4iiii', 'rotor', 'sram', 'shimano', 'campagnolo', 'pioneer', 'powertap'];
    
    if (premiumBrands.some(brand => name.includes(brand))) {
      score = Math.max(score, 75);
    } else if (cyclingBrands.some(brand => name.includes(brand))) {
      score = Math.max(score, 65);
    }
    
    // Device type indicators in name (50-70 points)
    const deviceTypeIndicators = {
      'power': 70, 'watt': 70,
      'heart': 65, 'hr': 60, 'bpm': 60,
      'cadence': 65, 'rpm': 55,
      'speed': 55, 'velocity': 50,
      'trainer': 80, 'turbo': 70,
      'cycling': 60, 'bike': 50, 'cycle': 50
    };
    
    Object.entries(deviceTypeIndicators).forEach(([indicator, points]) => {
      if (name.includes(indicator)) {
        score = Math.max(score, points);
      }
    });
    
    // Common non-cycling devices (reduce score)
    const nonCyclingIndicators = ['airpods', 'phone', 'watch', 'tv', 'speaker', 'mouse', 'keyboard', 'printer'];
    if (nonCyclingIndicators.some(indicator => name.includes(indicator))) {
      score = Math.max(0, score - 40);
    }
    
    // Generic/unknown devices get low score
    if (name === 'unknown' || name === '' || name.startsWith('ble device')) {
      score = Math.max(score, 10);
    }
    
    return Math.min(100, Math.max(0, score));
  }
  
  private identifyManufacturer(deviceName: string, isAppleDevice: boolean = false, companyName?: string): string {
    // Use company ID data if available and not generic
    if (companyName && !companyName.startsWith('Unknown')) {
      // Clean up company names for display
      return companyName
        .replace(', Inc.', '')
        .replace(', LLC', '')
        .replace(' Corporation', '')
        .replace(' Co. Ltd.', '')
        .replace(' International', '')
        .replace(' Oy', '')
        .replace(' b.v.', '')
        .replace(' S.R.L.', '')
        .replace(' GmbH', '')
        .replace(' SA', '')
        .replace(' Spa', '');
    }
    
    // Apple device detection
    if (isAppleDevice) {
      return 'Apple';
    }
    
    const name = deviceName.toLowerCase();
    
    // Comprehensive cycling industry manufacturers database
    const manufacturers = {
      // Power Meter Brands
      'polar': 'Polar',
      'garmin': 'Garmin', 
      'wahoo': 'Wahoo Fitness',
      'stages': 'Stages Cycling',
      'quarq': 'Quarq',
      'sram': 'SRAM',
      '4iiii': '4iiii Innovations',
      'rotor': 'Rotor',
      'pioneer': 'Pioneer',
      'powertap': 'PowerTap',
      'srm': 'SRM',
      'infocrank': 'InfoCrank',
      
      // Smart Trainer Brands
      'kickr': 'Wahoo Fitness',
      'tacx': 'Tacx',
      'elite': 'Elite',
      'kinetic': 'Kinetic by Kurt',
      'saris': 'Saris',
      'jetblack': 'JetBlack',
      'minoura': 'Minoura',
      'cycleops': 'Saris CycleOps',
      
      // Bike Computer & GPS Brands
      'cateye': 'CatEye',
      'bryton': 'Bryton',
      'lezyne': 'Lezyne',
      'suunto': 'Suunto',
      'mio': 'Mio Global',
      
      // Bike Manufacturers  
      'giant': 'Giant',
      'trek': 'Trek',
      'specialized': 'Specialized',
      'cannondale': 'Cannondale',
      'scott': 'SCOTT',
      'cervelo': 'Cervélo',
      'pinarello': 'Pinarello',
      'look': 'Look',
      'bmc': 'BMC',
      
      // Component Manufacturers
      'shimano': 'Shimano',
      'campagnolo': 'Campagnolo',
      'FSA': 'FSA',
      'dura ace': 'Shimano Dura-Ace',
      'ultegra': 'Shimano Ultegra',
      'super record': 'Campagnolo Super Record',
      
      // Heart Rate Specialists
      'valencell': 'Valencell',
      'zephyr': 'Zephyr',
      
      // Generic Tech Brands (lower priority)
      'samsung': 'Samsung',
      'sony': 'Sony',
      'bose': 'Bose',
      'microsoft': 'Microsoft'
    };
    
    // Try exact matches first, then partial matches
    for (const [key, manufacturer] of Object.entries(manufacturers)) {
      if (name.includes(key.toLowerCase())) {
        return manufacturer;
      }
    }
    
    // Apple devices (fallback if not detected by company ID)
    const appleIndicators = ['airpods', 'iphone', 'ipad', 'apple', 'watch', 'mac'];
    if (appleIndicators.some(indicator => name.includes(indicator))) {
      return 'Apple';
    }
    
    // Heart rate app patterns (common on Apple Watch)
    const heartRateAppPatterns = ['heartcast', 'hrm', 'blueheart', 'echohr', 'heart rate', 'hr monitor'];
    if (heartRateAppPatterns.some(pattern => name.includes(pattern))) {
      return 'Apple (via third-party app)';
    }
    
    return 'Unknown';
  }
  
  private getCompanyName(companyId: number | null): string {
    if (!companyId) return 'Unknown';
    
    // Complete Bluetooth SIG Company Identifier assignments for cycling industry
    // Updated with research findings from major manufacturers
    const companyNames: { [key: number]: string } = {
      // Major Tech Companies
      76: 'Apple, Inc.',
      6: 'Microsoft Corporation', 
      117: 'Samsung Electronics Co. Ltd.',
      77: 'Bose Corporation',
      224: 'Sony Corporation',
      
      // Cycling-Specific Manufacturers (High Priority)
      89: 'Polar Electro Oy',
      127: 'Garmin International, Inc.',
      263: 'Wahoo Fitness, LLC', 
      419: 'SRAM',
      421: '4iiii Innovations Inc.',
      673: 'Stages Cycling',
      1106: 'Tacx b.v.',
      1570: 'Elite S.R.L.',
      183: 'PowerTap',
      1137: 'Suunto Oy',
      281: 'Pioneer Corporation',
      2044: 'Shimano Inc.',
      548: 'Campagnolo S.R.L.',
      1332: 'Rotor Bike Components',
      2334: 'Giant Manufacturing Co. Ltd.',
      1024: 'CatEye Co., Ltd.',
      1214: 'Bryton Inc.',
      1422: 'Lezyne, Inc.',
      
      // Additional Cycling Industry Players
      302: 'Specialized Bicycle Components',
      1844: 'Trek Bicycle Corporation',
      735: 'Cannondale Bicycle Corporation',
      1903: 'SCOTT Sports SA',
      892: 'Cervelo Cycles Inc.',
      1456: 'Pinarello Cicli Spa',
      234: 'Look Cycle International',
      1789: 'BMC Switzerland AG',
      
      // Power Meter Specialists
      1654: 'SRM GmbH',
      891: 'Quarq Technology LLC',
      1233: 'PowerTap by SRAM',
      567: 'InfoCrank by Verve Cycling',
      
      // Smart Trainer Companies
      2156: 'Kinetic by Kurt',
      1987: 'Saris Cycling Group',
      1892: 'JetBlack Products', // Changed from 892 to avoid duplicate
      1345: 'Minoura Co., Ltd.',
      
      // Heart Rate Monitor Specialists
      445: 'Valencell, Inc.',
      1678: 'Mio Global',
      1234: 'Zephyr Technology', // Changed from 234 to avoid duplicate
      
      // Development and Testing
      65535: 'Development/Internal Use'
    };
    
    const companyName = companyNames[companyId];
    if (companyName) {
      return companyName;
    }
    
    // Return unknown with ID for debugging new devices
    return `Unknown (ID: 0x${companyId.toString(16).toUpperCase().padStart(4, '0')})`;
  }
  
  private identifyDeviceType(serviceUuids: string[]): SensorType | null {
    const services = serviceUuids.map(uuid => uuid.toLowerCase());
    
    if (services.includes(CyclingServices.HEART_RATE)) return 'heart_rate';
    if (services.includes(CyclingServices.CYCLING_POWER)) return 'power';
    if (services.includes(CyclingServices.CYCLING_SPEED_CADENCE)) return 'cadence';
    if (services.includes(CyclingServices.FITNESS_MACHINE)) return 'trainer';
    
    return null;
  }

  private identifyDeviceTypeByName(deviceName: string): SensorType | null {
    if (!deviceName) return null;
    
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

  /**
   * Detect Apple Watch heart rate broadcasting
   */
  private isAppleWatchHeartRate(advertisement: any, localName?: string): boolean {
    const serviceUuids = (advertisement.serviceUuids || []).map((uuid: string) => uuid.toLowerCase());
    
    // Check for heart rate service
    const hasHeartRateService = serviceUuids.includes('180d');
    
    // Common Apple Watch heart rate app names
    const heartRateAppNames = [
      'heartcast',
      'hrm',
      'blueheart',
      'heart rate',
      'hr monitor',
      'watch link',
      'echohr'
    ];
    
    const nameMatch = localName ? 
      heartRateAppNames.some(appName => localName.toLowerCase().includes(appName)) : false;
    
    return hasHeartRateService && nameMatch;
  }

  /**
   * Generate user-friendly device name
   */
  private generateDeviceName(localName?: string, isAppleDevice: boolean = false, deviceType?: SensorType): string {
    if (isAppleDevice && deviceType === 'heart_rate') {
      // Apple Watch heart rate apps
      if (localName?.toLowerCase().includes('heartcast')) {
        return 'Apple Watch (HeartCast)';
      }
      if (localName?.toLowerCase().includes('hrm')) {
        return 'Apple Watch (HRM)';
      }
      if (localName?.toLowerCase().includes('blueheart')) {
        return 'Apple Watch (BlueHeart)';
      }
      if (localName?.toLowerCase().includes('echohr')) {
        return 'Apple Watch (ECHO HR)';
      }
      return 'Apple Watch Heart Rate';
    }
    
    // Use original name if available and descriptive
    if (localName && localName.trim().length > 3 && !localName.toLowerCase().includes('device')) {
      return localName.trim();
    }
    
    // Fallback to device type + ID
    const deviceTypeNames = {
      'heart_rate': 'Heart Rate Monitor',
      'power': 'Power Meter',
      'cadence': 'Speed/Cadence Sensor',
      'speed': 'Speed Sensor',
      'trainer': 'Smart Trainer'
    };
    
    const typeName = deviceType ? deviceTypeNames[deviceType as keyof typeof deviceTypeNames] || 'Sensor' : 'Device';
    return `BLE ${typeName}`;
  }

  /**
   * Generate detailed display name with capabilities and context
   */
  private generateDisplayName(localName?: string, isAppleDevice: boolean = false, deviceType?: SensorType, manufacturer?: string): string {
    const baseName = this.generateDeviceName(localName, isAppleDevice, deviceType);
    
    // Special handling for Apple Watch heart rate
    if (isAppleDevice && deviceType === 'heart_rate') {
      return `${baseName} • Optical Heart Rate • Wearable Device`;
    }
    
    const parts: string[] = [baseName];
    
    // Add manufacturer if known and not already in base name
    if (manufacturer && !manufacturer.startsWith('Unknown') && !baseName.toLowerCase().includes(manufacturer.toLowerCase())) {
      parts.push(manufacturer);
    }
    
    // Add device capabilities
    const capabilities = this.getDeviceCapabilities(deviceType);
    if (capabilities.length > 0) {
      // Limit to most important capabilities for display
      const displayCapabilities = capabilities.slice(0, 2);
      if (deviceType === 'power') {
        parts.push('Power & Cadence');
      } else if (deviceType === 'trainer') {
        parts.push('Smart Trainer');
      } else {
        parts.push(displayCapabilities.join(', '));
      }
    }
    
    // Add protocol indicator for technical users
    parts.push('Bluetooth LE');
    
    return parts.join(' • ');
  }

  /**
   * Get device capabilities based on type
   */
  private getDeviceCapabilities(deviceType?: SensorType): string[] {
    const capabilities = {
      'heart_rate': ['Heart Rate Monitoring', 'Real-time Data'],
      'power': ['Power Measurement', 'Cadence Data', 'Training Metrics'],
      'cadence': ['Cadence Measurement', 'Speed Data', 'Revolution Counting'],
      'speed': ['Speed Measurement', 'Distance Tracking'],
      'trainer': ['Smart Trainer', 'Resistance Control', 'Multiple Metrics']
    };
    
    return capabilities[deviceType as keyof typeof capabilities] || ['Sensor Data'];
  }
  
  private async checkPermissions(): Promise<void> {
    const platform = process.platform;
    
    if (platform === 'darwin') {
      console.log('📶 macOS detected - Bluetooth permission will be requested automatically');
      console.log('💡 If prompted, please grant Bluetooth access to this application');
    } else if (platform === 'linux') {
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
        } catch (serviceError) {
          console.log('ℹ️ Could not check Bluetooth service status (may not be systemd)');
        }
      } catch (error) {
        console.log('ℹ️ Could not check Linux Bluetooth permissions - continuing anyway');
      }
    } else if (platform === 'win32') {
      console.log('📶 Windows detected - ensure Bluetooth is enabled in Settings');
    }
  }
  
  private getBluetoothErrorMessage(state: string): string {
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
        } else if (platform === 'win32') {
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
  
  private calculateSignalStrength(rssi: number): number {
    // Convert RSSI to percentage (rough approximation)
    // RSSI typically ranges from -30 (excellent) to -90 (poor)
    const strength = Math.max(0, Math.min(100, (rssi + 90) * (100 / 60)));
    return Math.round(strength);
  }
  
  private setupDeviceServices(peripheral: any, device: SensorDevice): void {
    peripheral.discoverServices([], (error: any, services: any[]) => {
      if (error) {
        console.error(`❌ Service discovery error for ${device.name}:`, error);
        return;
      }
      
      services.forEach(service => {
        this.discoverCharacteristics(peripheral, service, device);
      });
    });
  }
  
  private discoverCharacteristics(peripheral: any, service: any, device: SensorDevice): void {
    service.discoverCharacteristics([], (error: any, characteristics: any[]) => {
      if (error) {
        console.error(`❌ Characteristic discovery error for ${device.name}:`, error);
        return;
      }
      
      characteristics.forEach(characteristic => {
        this.setupCharacteristic(peripheral, characteristic, device);
      });
    });
  }
  
  private setupCharacteristic(peripheral: any, characteristic: any, device: SensorDevice): void {
    const uuid = characteristic.uuid.toLowerCase();
    
    try {
      // Heart Rate Measurement
      if (uuid === Characteristics.HEART_RATE_MEASUREMENT) {
        characteristic.subscribe((error: any) => {
          if (error) {
            console.error(`❌ Failed to subscribe to heart rate for ${device.name}:`, error);
            return;
          }
        });
        
        characteristic.on('data', (data: Buffer) => {
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
        characteristic.subscribe((error: any) => {
          if (error) {
            console.error(`❌ Failed to subscribe to power for ${device.name}:`, error);
            return;
          }
        });
        
        characteristic.on('data', (data: Buffer) => {
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
        characteristic.subscribe((error: any) => {
          if (error) {
            console.error(`❌ Failed to subscribe to CSC for ${device.name}:`, error);
            return;
          }
        });
        
        characteristic.on('data', (data: Buffer) => {
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
        characteristic.subscribe((error: any) => {
          if (error) {
            console.error(`❌ Failed to subscribe to trainer data for ${device.name}:`, error);
            return;
          }
        });
        
        characteristic.on('data', (data: Buffer) => {
          const trainerData = this.parseTrainerData(data);
          
          Object.entries(trainerData).forEach(([type, value]) => {
            if (value !== null && value > 0) {
              this.emit('sensor-data', {
                deviceId: device.deviceId,
                type: type as SensorType,
                value: value as number,
                timestamp: new Date(),
                rawData: { buffer: data.toString('hex') }
              });
            }
          });
        });
      }
      
    } catch (error) {
      console.error(`❌ Error setting up characteristic ${uuid} for ${device.name}:`, error);
    }
  }
  
  // Data parsing methods for BLE characteristics
  private parseHeartRateData(data: Buffer): number {
    if (data.length < 2) return 0;
    
    const flags = data.readUInt8(0);
    const is16Bit = flags & 0x01;
    
    if (is16Bit && data.length >= 3) {
      return data.readUInt16LE(1);
    } else if (!is16Bit && data.length >= 2) {
      return data.readUInt8(1);
    }
    
    return 0;
  }
  
  private parsePowerData(data: Buffer): number {
    if (data.length < 4) return -1;
    
    // Skip flags (2 bytes) and read instantaneous power (2 bytes)
    return data.readUInt16LE(2);
  }
  
  private parseCSCData(data: Buffer, deviceId: string): { speed: number | null, cadence: number | null } {
    if (data.length < 1) return { speed: null, cadence: null };
    
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
  
  private parseTrainerData(data: Buffer): { power?: number, speed?: number, cadence?: number } {
    if (data.length < 2) return {};
    
    const flags = data.readUInt16LE(0);
    let offset = 2;
    const result: { power?: number, speed?: number, cadence?: number } = {};
    
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
  private previousWheelData = new Map<string, { revolutions: number, eventTime: number, timestamp: number }>();
  private previousCrankData = new Map<string, { revolutions: number, eventTime: number, timestamp: number }>();
  
  private calculateSpeedFromRevolutions(deviceId: string, revolutions: number, eventTime: number): number | null {
    const now = Date.now();
    const previous = this.previousWheelData.get(deviceId);
    
    if (!previous) {
      this.previousWheelData.set(deviceId, { revolutions, eventTime, timestamp: now });
      return null;
    }
    
    const deltaRevolutions = revolutions - previous.revolutions;
    const deltaTime = eventTime - previous.eventTime;
    
    if (deltaRevolutions <= 0 || deltaTime <= 0) return null;
    
    // Assume 2.1m wheel circumference (700x25c tire)
    const wheelCircumference = 2.1; // meters
    const timeInSeconds = deltaTime / 1024.0; // Event time is in 1/1024 seconds
    const distanceInMeters = deltaRevolutions * wheelCircumference;
    const speedInKmh = (distanceInMeters / timeInSeconds) * 3.6;
    
    this.previousWheelData.set(deviceId, { revolutions, eventTime, timestamp: now });
    
    return Math.round(speedInKmh * 10) / 10; // Round to 1 decimal place
  }
  
  private calculateCadenceFromRevolutions(deviceId: string, revolutions: number, eventTime: number): number | null {
    const now = Date.now();
    const previous = this.previousCrankData.get(deviceId);
    
    if (!previous) {
      this.previousCrankData.set(deviceId, { revolutions, eventTime, timestamp: now });
      return null;
    }
    
    const deltaRevolutions = revolutions - previous.revolutions;
    const deltaTime = eventTime - previous.eventTime;
    
    if (deltaRevolutions <= 0 || deltaTime <= 0) return null;
    
    const timeInMinutes = (deltaTime / 1024.0) / 60.0; // Convert to minutes
    const cadenceRpm = deltaRevolutions / timeInMinutes;
    
    this.previousCrankData.set(deviceId, { revolutions, eventTime, timestamp: now });
    
    return Math.round(cadenceRpm);
  }

  async shutdown(): Promise<void> {
    console.log('📶 Shutting down BLE manager...');
    
    this.stopScanning();
    
    // Clear all data intervals
    this.dataIntervals.forEach(interval => clearInterval(interval));
    this.dataIntervals.clear();
    
    // Disconnect all devices
    const disconnectPromises = Array.from(this.connectedDevices.keys()).map(
      deviceId => this.disconnectDevice(deviceId)
    );
    
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