/**
 * Comprehensive BLE Device Identification System
 * Parses advertisement data, manufacturer info, and characteristics to identify cycling sensors
 */

import { SensorType } from '../types/sensor.js';

// Enhanced BLE Company Identifier Codes (from official Bluetooth SIG database)
// This includes the most common cycling sensor manufacturers
const COMPANY_IDENTIFIERS: Record<number, string> = {
  // Cycling sensor manufacturers
  76: 'Apple Inc.',
  109: 'Polar Electro Oy',
  135: 'Garmin International Inc.',
  153: 'Suunto Oy',
  268: 'Stages Cycling LLC',
  409: 'Wahoo Fitness LLC',
  410: 'Tacx B.V.',
  420: 'Elite S.r.l.',
  471: 'CycleOps',
  523: 'SRAM LLC',
  629: 'Elite S.r.l.',
  741: 'Quarq Technology Inc.',
  847: 'Hammerhead',
  1048: 'Rotor Componentes Tecnológicos S.L.',
  1204: '4iiii Innovations Inc.',
  1877: 'Giant Manufacturing Co. Ltd.',
  2081: 'PowerTap',
  
  // Common electronics manufacturers
  1: 'Ericsson Technology Licensing',
  10: 'Qualcomm Technologies International Ltd.',
  15: 'Broadcom Corporation',
  29: 'Qualcomm Technologies Inc.',
  61: 'Sony Corporation',
  89: 'Nordic Semiconductor ASA',
  117: 'Samsung Electronics Co. Ltd.',
  305: 'Decathlon SA',
  682: 'Magene Technology Co., Ltd.',
  696: 'Xplova Inc.',
  740: 'Bryton Inc.',
  840: 'Cateye Co., Ltd.',
  1073: 'Lezyne Inc.',
  1164: 'Topeak Inc.',
  1419: 'Bontrager',
  1452: 'Trek Bicycle Corporation'
};

// Enhanced service descriptions from official database
const OFFICIAL_SERVICE_DESCRIPTIONS: Record<string, string> = {
  '180d': 'Heart Rate',
  '1818': 'Cycling Power', 
  '1816': 'Cycling Speed and Cadence',
  '1826': 'Fitness Machine',
  '180f': 'Battery Service',
  '180a': 'Device Information',
  '1800': 'Generic Access',
  '1801': 'Generic Attribute',
  '183e': 'Body Composition',
  '181c': 'User Data'
};

// Known device name patterns for cycling sensors
const DEVICE_NAME_PATTERNS = {
  // Heart Rate Monitors
  'HR': { type: 'heart_rate' as SensorType, category: 'Heart Rate Monitor' },
  'Heart': { type: 'heart_rate' as SensorType, category: 'Heart Rate Monitor' },
  'Polar': { type: 'heart_rate' as SensorType, category: 'Heart Rate Monitor', manufacturer: 'Polar' },
  'Wahoo': { type: 'heart_rate' as SensorType, category: 'Multi-sensor Device', manufacturer: 'Wahoo' },
  'Garmin': { type: 'heart_rate' as SensorType, category: 'Multi-sensor Device', manufacturer: 'Garmin' },
  'Suunto': { type: 'heart_rate' as SensorType, category: 'Heart Rate Monitor', manufacturer: 'Suunto' },
  
  // Power Meters
  'Power': { type: 'power' as SensorType, category: 'Power Meter' },
  'Stages': { type: 'power' as SensorType, category: 'Power Meter', manufacturer: 'Stages' },
  'Quarq': { type: 'power' as SensorType, category: 'Power Meter', manufacturer: 'Quarq' },
  'SRAM': { type: 'power' as SensorType, category: 'Power Meter', manufacturer: 'SRAM' },
  'Rotor': { type: 'power' as SensorType, category: 'Power Meter', manufacturer: 'Rotor' },
  '4iiii': { type: 'power' as SensorType, category: 'Power Meter', manufacturer: '4iiii' },
  'PowerTap': { type: 'power' as SensorType, category: 'Power Meter', manufacturer: 'PowerTap' },
  
  // Speed/Cadence Sensors  
  'Speed': { type: 'cadence' as SensorType, category: 'Speed/Cadence Sensor' },
  'Cadence': { type: 'cadence' as SensorType, category: 'Speed/Cadence Sensor' },
  'CSC': { type: 'cadence' as SensorType, category: 'Speed/Cadence Sensor' },
  'DuoTrap': { type: 'cadence' as SensorType, category: 'Speed/Cadence Sensor', manufacturer: 'Bontrager' },
  
  // Smart Trainers
  'KICKR': { type: 'trainer' as SensorType, category: 'Smart Trainer', manufacturer: 'Wahoo' },
  'Neo': { type: 'trainer' as SensorType, category: 'Smart Trainer', manufacturer: 'Tacx' },
  'Flux': { type: 'trainer' as SensorType, category: 'Smart Trainer', manufacturer: 'Tacx' },
  'Elite': { type: 'trainer' as SensorType, category: 'Smart Trainer', manufacturer: 'Elite' },
  'Trainer': { type: 'trainer' as SensorType, category: 'Smart Trainer' },
  
  // Other Known Brands
  'Magene': { type: 'cadence' as SensorType, category: 'Multi-sensor Device', manufacturer: 'Magene' },
  'Bryton': { type: 'cadence' as SensorType, category: 'Bike Computer', manufacturer: 'Bryton' },
  'Lezyne': { type: 'cadence' as SensorType, category: 'Multi-sensor Device', manufacturer: 'Lezyne' },
  'CatEye': { type: 'cadence' as SensorType, category: 'Bike Computer', manufacturer: 'CatEye' }
};

// BLE Service UUIDs and their descriptions (enhanced with official database)
const SERVICE_DESCRIPTIONS = {
  ...OFFICIAL_SERVICE_DESCRIPTIONS,
  // Additional cycling-specific services
  '180d': 'Heart Rate Service',
  '1818': 'Cycling Power Service', 
  '1816': 'Cycling Speed and Cadence Service',
  '1826': 'Fitness Machine Service',
  '180f': 'Battery Service',
  '180a': 'Device Information Service',
  '1800': 'Generic Access Service',
  '1801': 'Generic Attribute Service',
  '183e': 'Body Composition Service',
  '181c': 'User Data Service'
};

// Characteristic UUIDs and their descriptions
const CHARACTERISTIC_DESCRIPTIONS = {
  '2a37': 'Heart Rate Measurement',
  '2a38': 'Body Sensor Location',
  '2a63': 'Cycling Power Measurement',
  '2a65': 'Cycling Power Feature',
  '2a5b': 'CSC Measurement',
  '2a5c': 'CSC Feature',
  '2ad2': 'Indoor Bike Data',
  '2acc': 'Fitness Machine Feature',
  '2a19': 'Battery Level',
  '2a29': 'Manufacturer Name String',
  '2a24': 'Model Number String',
  '2a25': 'Serial Number String',
  '2a27': 'Hardware Revision String',
  '2a26': 'Firmware Revision String',
  '2a28': 'Software Revision String'
};

export interface DeviceIdentification {
  name: string;
  displayName: string;
  type: SensorType;
  category: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  hardwareRevision?: string;
  firmwareRevision?: string;
  softwareRevision?: string;
  batteryLevel?: number;
  services: ServiceInfo[];
  characteristics: CharacteristicInfo[];
  capabilities: string[];
  confidence: number; // 0-100% confidence in identification
  rawData: {
    localName?: string;
    manufacturerData?: Buffer;
    serviceUuids: string[];
    txPowerLevel?: number;
    serviceData?: Record<string, Buffer>;
  };
}

export interface ServiceInfo {
  uuid: string;
  name: string;
  description: string;
  isPrimary?: boolean;
}

export interface CharacteristicInfo {
  uuid: string;
  serviceUuid: string;
  name: string;
  properties: string[];
  description: string;
}

export class DeviceIdentifier {
  
  /**
   * Identify a BLE device from its advertisement and connection data
   */
  static identifyDevice(
    peripheral: any,
    services?: any[],
    characteristics?: any[]
  ): DeviceIdentification {
    const { advertisement, id, rssi } = peripheral;
    const localName = advertisement?.localName;
    const manufacturerData = advertisement?.manufacturerData;
    const serviceUuids = advertisement?.serviceUuids || [];
    const txPowerLevel = advertisement?.txPowerLevel;
    const serviceData = advertisement?.serviceData || {};

    // Start building identification
    let identification: Partial<DeviceIdentification> = {
      rawData: {
        localName,
        manufacturerData,
        serviceUuids,
        txPowerLevel,
        serviceData
      },
      services: [],
      characteristics: [],
      capabilities: [],
      confidence: 0
    };

    // Step 1: Analyze manufacturer data
    const manufacturerInfo = this.parseManufacturerData(manufacturerData);
    if (manufacturerInfo) {
      identification.manufacturer = manufacturerInfo.name;
      identification.confidence = (identification.confidence || 0) + 30;
    }

    // Step 2: Analyze device name
    const nameAnalysis = this.analyzeDeviceName(localName);
    if (nameAnalysis) {
      identification.type = nameAnalysis.type;
      identification.category = nameAnalysis.category;
      identification.manufacturer = identification.manufacturer || nameAnalysis.manufacturer;
      identification.confidence = (identification.confidence || 0) + nameAnalysis.confidence;
    }

    // Step 3: Analyze services
    const serviceAnalysis = this.analyzeServices(serviceUuids);
    identification.services = serviceAnalysis.services;
    identification.capabilities = serviceAnalysis.capabilities;
    if (serviceAnalysis.primaryType) {
      identification.type = identification.type || serviceAnalysis.primaryType;
      identification.confidence = (identification.confidence || 0) + serviceAnalysis.confidence;
    }

    // Step 4: Analyze characteristics (if connected)
    if (characteristics && characteristics.length > 0) {
      const charAnalysis = this.analyzeCharacteristics(characteristics);
      identification.characteristics = charAnalysis.characteristics;
      identification.capabilities = [
        ...identification.capabilities, 
        ...charAnalysis.capabilities
      ];
      identification.confidence = (identification.confidence || 0) + charAnalysis.confidence;
    }

    // Step 5: Generate names and final classification
    const finalName = this.generateDeviceName(identification, localName, id);
    const displayName = this.generateDisplayName(identification, localName);
    
    // Determine final type if not already set
    const finalType = identification.type || this.inferTypeFromCapabilities(identification.capabilities);

    return {
      name: finalName,
      displayName,
      type: finalType,
      category: identification.category || this.getCategoryForType(finalType),
      manufacturer: identification.manufacturer,
      model: identification.model,
      serialNumber: identification.serialNumber,
      hardwareRevision: identification.hardwareRevision,
      firmwareRevision: identification.firmwareRevision,
      softwareRevision: identification.softwareRevision,
      batteryLevel: identification.batteryLevel,
      services: identification.services || [],
      characteristics: identification.characteristics || [],
      capabilities: identification.capabilities || [],
      confidence: Math.min(100, identification.confidence || 10),
      rawData: identification.rawData!
    };
  }

  /**
   * Parse manufacturer data from BLE advertisement
   */
  static parseManufacturerData(manufacturerData?: Buffer): { id: number; name: string; data?: Buffer } | null {
    if (!manufacturerData || manufacturerData.length < 2) {
      return null;
    }

    // First 2 bytes are company identifier (little-endian)
    const companyId = manufacturerData.readUInt16LE(0);
    const name = COMPANY_IDENTIFIERS[companyId];
    
    if (name) {
      return {
        id: companyId,
        name,
        data: manufacturerData.length > 2 ? manufacturerData.subarray(2) : undefined
      };
    }

    return {
      id: companyId,
      name: `Company ID ${companyId.toString(16).toUpperCase()}`,
      data: manufacturerData.length > 2 ? manufacturerData.subarray(2) : undefined
    };
  }

  /**
   * Analyze device name for identification clues
   */
  static analyzeDeviceName(localName?: string): { 
    type: SensorType; 
    category: string; 
    manufacturer?: string; 
    confidence: number;
    model?: string;
  } | null {
    if (!localName) return null;

    const name = localName.trim();
    let maxConfidence = 0;
    let bestMatch: any = null;

    // Check against known patterns
    for (const [pattern, info] of Object.entries(DEVICE_NAME_PATTERNS)) {
      if (name.toLowerCase().includes(pattern.toLowerCase())) {
        const confidence = this.calculateNameConfidence(name, pattern);
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          bestMatch = { ...info, confidence, pattern };
        }
      }
    }

    if (bestMatch) {
      // Try to extract model information
      const model = this.extractModelFromName(name, bestMatch.pattern);
      return {
        ...bestMatch,
        model
      };
    }

    return null;
  }

  /**
   * Analyze BLE services to determine device capabilities
   */
  static analyzeServices(serviceUuids: string[]): {
    services: ServiceInfo[];
    capabilities: string[];
    primaryType?: SensorType;
    confidence: number;
  } {
    const services: ServiceInfo[] = [];
    const capabilities: string[] = [];
    let confidence = 0;
    let primaryType: SensorType | undefined;

    for (const uuid of serviceUuids) {
      const shortUuid = uuid.toLowerCase().replace(/-/g, '');
      const normalizedUuid = shortUuid.length === 4 ? shortUuid : shortUuid.substring(4, 8);
      
      const description = SERVICE_DESCRIPTIONS[normalizedUuid as keyof typeof SERVICE_DESCRIPTIONS];
      
      services.push({
        uuid: uuid.toLowerCase(),
        name: description || 'Unknown Service',
        description: description || `Custom Service (${uuid})`,
        isPrimary: this.isPrimaryService(normalizedUuid)
      });

      // Determine capabilities and primary type
      switch (normalizedUuid) {
        case '180d': // Heart Rate
          capabilities.push('Heart Rate Monitoring');
          primaryType = primaryType || 'heart_rate';
          confidence += 40;
          break;
        case '1818': // Cycling Power
          capabilities.push('Power Measurement');
          primaryType = 'power'; // Power takes precedence
          confidence += 40;
          break;
        case '1816': // Cycling Speed and Cadence
          capabilities.push('Speed Measurement', 'Cadence Measurement');
          primaryType = primaryType || 'cadence';
          confidence += 35;
          break;
        case '1826': // Fitness Machine
          capabilities.push('Smart Trainer Functions');
          primaryType = 'trainer';
          confidence += 45;
          break;
        case '180f': // Battery
          capabilities.push('Battery Level Reporting');
          confidence += 5;
          break;
        case '180a': // Device Information
          capabilities.push('Device Information');
          confidence += 10;
          break;
      }
    }

    return { services, capabilities, primaryType, confidence };
  }

  /**
   * Analyze characteristics for detailed capabilities
   */
  static analyzeCharacteristics(characteristics: any[]): {
    characteristics: CharacteristicInfo[];
    capabilities: string[];
    confidence: number;
  } {
    const charInfo: CharacteristicInfo[] = [];
    const capabilities: string[] = [];
    let confidence = 0;

    for (const char of characteristics) {
      const uuid = char.uuid.toLowerCase();
      const description = CHARACTERISTIC_DESCRIPTIONS[uuid as keyof typeof CHARACTERISTIC_DESCRIPTIONS];
      
      charInfo.push({
        uuid: uuid,
        serviceUuid: char.serviceUuid?.toLowerCase() || '',
        name: description || 'Unknown Characteristic',
        properties: char.properties || [],
        description: description || `Custom Characteristic (${uuid})`
      });

      // Add specific capabilities based on characteristics
      switch (uuid) {
        case '2a37': // Heart Rate Measurement
          capabilities.push('Real-time Heart Rate');
          confidence += 10;
          break;
        case '2a63': // Cycling Power Measurement
          capabilities.push('Instantaneous Power');
          confidence += 10;
          break;
        case '2a5b': // CSC Measurement
          capabilities.push('Speed & Cadence Data');
          confidence += 10;
          break;
        case '2ad2': // Indoor Bike Data
          capabilities.push('Trainer Metrics');
          confidence += 10;
          break;
        case '2a19': // Battery Level
          capabilities.push('Battery Status');
          confidence += 5;
          break;
      }
    }

    return { characteristics: charInfo, capabilities, confidence };
  }

  /**
   * Generate a comprehensive device name
   */
  static generateDeviceName(
    identification: Partial<DeviceIdentification>, 
    localName?: string, 
    deviceId?: string
  ): string {
    const parts: string[] = [];

    // Use local name if it's descriptive
    if (localName && localName.trim().length > 3 && !localName.toLowerCase().includes('device')) {
      return localName.trim();
    }

    // Build name from identification
    if (identification.manufacturer) {
      parts.push(identification.manufacturer);
    }

    if (identification.category && identification.category !== 'Unknown Device') {
      parts.push(identification.category);
    } else if (identification.type) {
      parts.push(this.getCategoryForType(identification.type));
    }

    if (identification.model) {
      parts.push(identification.model);
    }

    // If we have good identification, use it
    if (parts.length >= 2) {
      return parts.join(' ');
    }

    // If we have some identification but not complete
    if (parts.length === 1 && identification.capabilities && identification.capabilities.length > 0) {
      return `${parts[0]} Sensor`;
    }

    // Fall back to generic name with device ID
    const shortId = deviceId ? deviceId.slice(-4).toUpperCase() : 'Unknown';
    return `Cycling Sensor ${shortId}`;
  }

  /**
   * Generate a user-friendly display name with details
   */
  static generateDisplayName(identification: Partial<DeviceIdentification>, localName?: string): string {
    const parts: string[] = [];

    // Start with manufacturer if available
    if (identification.manufacturer) {
      parts.push(identification.manufacturer);
    }

    // Add category/type
    const category = identification.category || this.getCategoryForType(identification.type || 'heart_rate');
    parts.push(category);

    // Add model if available
    if (identification.model) {
      parts.push(`(${identification.model})`);
    }

    // Add key capabilities
    if (identification.capabilities && identification.capabilities.length > 0) {
      const keyCapabilities = identification.capabilities
        .filter(cap => !cap.includes('Battery') && !cap.includes('Device Information'))
        .slice(0, 2);
      
      if (keyCapabilities.length > 0) {
        parts.push(`• ${keyCapabilities.join(', ')}`);
      }
    }

    return parts.join(' ');
  }

  /**
   * Calculate confidence score for name matching
   */
  private static calculateNameConfidence(deviceName: string, pattern: string): number {
    const name = deviceName.toLowerCase();
    const pat = pattern.toLowerCase();
    
    if (name === pat) return 50;
    if (name.startsWith(pat)) return 40;
    if (name.includes(pat)) return 30;
    if (name.includes(pat.substring(0, 3))) return 20;
    
    return 10;
  }

  /**
   * Extract model information from device name
   */
  private static extractModelFromName(deviceName: string, pattern: string): string | undefined {
    const name = deviceName.trim();
    const patternIndex = name.toLowerCase().indexOf(pattern.toLowerCase());
    
    if (patternIndex === -1) return undefined;
    
    // Get text after the pattern
    const afterPattern = name.substring(patternIndex + pattern.length).trim();
    
    // Look for model patterns (numbers, versions)
    const modelMatch = afterPattern.match(/^[\s-]?([A-Za-z0-9\-]+)/);
    
    return modelMatch ? modelMatch[1] : undefined;
  }

  /**
   * Check if a service UUID represents a primary cycling service
   */
  private static isPrimaryService(uuid: string): boolean {
    const primaryServices = ['180d', '1818', '1816', '1826'];
    return primaryServices.includes(uuid);
  }

  /**
   * Infer device type from capabilities when type is unknown
   */
  private static inferTypeFromCapabilities(capabilities: string[]): SensorType {
    if (capabilities.some(cap => cap.includes('Power'))) return 'power';
    if (capabilities.some(cap => cap.includes('Heart Rate'))) return 'heart_rate';
    if (capabilities.some(cap => cap.includes('Trainer'))) return 'trainer';
    if (capabilities.some(cap => cap.includes('Speed') || cap.includes('Cadence'))) return 'cadence';
    
    return 'heart_rate'; // Default fallback
  }

  /**
   * Get category name for a sensor type
   */
  private static getCategoryForType(type: SensorType): string {
    switch (type) {
      case 'heart_rate': return 'Heart Rate Monitor';
      case 'power': return 'Power Meter';
      case 'cadence': return 'Speed/Cadence Sensor';
      case 'speed': return 'Speed Sensor';
      case 'trainer': return 'Smart Trainer';
      default: return 'Cycling Sensor';
    }
  }
}