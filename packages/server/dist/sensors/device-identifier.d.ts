/**
 * Comprehensive BLE Device Identification System
 * Parses advertisement data, manufacturer info, and characteristics to identify cycling sensors
 */
import { SensorType } from '../types/sensor.js';
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
    confidence: number;
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
export declare class DeviceIdentifier {
    /**
     * Identify a BLE device from its advertisement and connection data
     */
    static identifyDevice(peripheral: any, services?: any[], characteristics?: any[]): DeviceIdentification;
    /**
     * Parse manufacturer data from BLE advertisement
     */
    static parseManufacturerData(manufacturerData?: Buffer): {
        id: number;
        name: string;
        data?: Buffer;
    } | null;
    /**
     * Analyze device name for identification clues
     */
    static analyzeDeviceName(localName?: string): {
        type: SensorType;
        category: string;
        manufacturer?: string;
        confidence: number;
        model?: string;
    } | null;
    /**
     * Analyze BLE services to determine device capabilities
     */
    static analyzeServices(serviceUuids: string[]): {
        services: ServiceInfo[];
        capabilities: string[];
        primaryType?: SensorType;
        confidence: number;
    };
    /**
     * Analyze characteristics for detailed capabilities
     */
    static analyzeCharacteristics(characteristics: any[]): {
        characteristics: CharacteristicInfo[];
        capabilities: string[];
        confidence: number;
    };
    /**
     * Generate a comprehensive device name
     */
    static generateDeviceName(identification: Partial<DeviceIdentification>, localName?: string, deviceId?: string): string;
    /**
     * Generate a user-friendly display name with details
     */
    static generateDisplayName(identification: Partial<DeviceIdentification>, localName?: string): string;
    /**
     * Calculate confidence score for name matching
     */
    private static calculateNameConfidence;
    /**
     * Extract model information from device name
     */
    private static extractModelFromName;
    /**
     * Check if a service UUID represents a primary cycling service
     */
    private static isPrimaryService;
    /**
     * Infer device type from capabilities when type is unknown
     */
    private static inferTypeFromCapabilities;
    /**
     * Get category name for a sensor type
     */
    private static getCategoryForType;
}
