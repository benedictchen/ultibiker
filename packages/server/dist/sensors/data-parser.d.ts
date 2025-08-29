import { SensorReading } from '../types/sensor.js';
export declare class DataParser {
    private lastReadings;
    private sessionManager;
    setSessionManager(sessionManager: any): void;
    parse(rawData: any, protocol: 'ant_plus' | 'bluetooth'): SensorReading | null;
    private mapSensorType;
    private parseValue;
    private getUnit;
    private calculateQuality;
    private validateReading;
    private sanitizeRawData;
    private extractMetricSpecificData;
}
