// FIXME: Consider data processing and validation libraries:
// - joi or zod: Schema validation for sensor data (zod already in package.json - use it!)
// - moment.js or date-fns: Better timestamp handling and timezone support
// - lodash: Utility functions for data manipulation and transformation
// - crypto: Built-in Node.js crypto for SHA-256 fingerprinting (multi-device deduplication)
// - fast-json-stringify: Faster JSON serialization for high-frequency sensor data

import { SensorReading, SensorType } from '../types/sensor.js';
import { createId } from '@paralleldrive/cuid2';

export class DataParser {
  private lastReadings = new Map<string, { value: number, timestamp: Date }>();
  private sessionManager: any = null; // Will be injected
  
  setSessionManager(sessionManager: any) {
    this.sessionManager = sessionManager;
  }
  
  parse(rawData: any, protocol: 'ant_plus' | 'bluetooth'): SensorReading | null {
    if (!rawData || !rawData.deviceId || !rawData.type) {
      console.warn('Invalid sensor data received:', rawData);
      return null;
    }

    try {
      // Only parse data if there's an active session
      const sessionId = this.sessionManager?.getCurrentSessionId();
      if (!sessionId) {
        console.debug('📊 Sensor data received but no active session - data not recorded');
        return null;
      }
      
      const reading: SensorReading = {
        deviceId: rawData.deviceId,
        sessionId: sessionId,
        timestamp: rawData.timestamp || new Date(),
        metricType: this.mapSensorType(rawData.type),
        value: this.parseValue(rawData.value, rawData.type),
        unit: this.getUnit(rawData.type),
        quality: this.calculateQuality(rawData, protocol),
        rawData: this.sanitizeRawData(rawData.rawData || rawData)
      };

      // Validate the reading
      if (this.validateReading(reading)) {
        // Store for outlier detection
        const key = `${reading.deviceId}-${reading.metricType}`;
        this.lastReadings.set(key, { 
          value: reading.value, 
          timestamp: reading.timestamp 
        });
        
        return reading;
      }

      console.warn('Invalid reading after parsing:', reading);
      return null;
    } catch (error) {
      console.error('Failed to parse sensor data:', error);
      return null;
    }
  }

  private mapSensorType(type: string): SensorType {
    switch (type.toLowerCase()) {
      case 'heart_rate':
      case 'heartrate':
      case 'hr':
        return 'heart_rate';
      case 'power':
      case 'watts':
        return 'power';
      case 'cadence':
      case 'rpm':
        return 'cadence';
      case 'speed':
      case 'velocity':
        return 'speed';
      case 'trainer':
        return 'trainer';
      default:
        throw new Error(`Unknown sensor type: ${type}`);
    }
  }

  private parseValue(value: any, type: string): number {
    const numericValue = typeof value === 'number' ? value : parseFloat(value);
    
    if (isNaN(numericValue)) {
      throw new Error(`Invalid numeric value: ${value}`);
    }

    // Apply type-specific parsing and validation
    switch (type) {
      case 'heart_rate':
        // Heart rate should be between 40-220 BPM
        if (numericValue < 40 || numericValue > 220) {
          throw new Error(`Heart rate out of range: ${numericValue}`);
        }
        return Math.round(numericValue);

      case 'power':
        // Power should be between 0-2000W for cycling
        if (numericValue < 0 || numericValue > 2000) {
          throw new Error(`Power out of range: ${numericValue}`);
        }
        return Math.round(numericValue);

      case 'cadence':
        // Cadence should be between 0-200 RPM
        if (numericValue < 0 || numericValue > 200) {
          throw new Error(`Cadence out of range: ${numericValue}`);
        }
        return Math.round(numericValue);

      case 'speed':
        // Speed should be between 0-100 km/h for cycling
        if (numericValue < 0 || numericValue > 100) {
          throw new Error(`Speed out of range: ${numericValue}`);
        }
        return Math.round(numericValue * 100) / 100; // 2 decimal places

      default:
        return numericValue;
    }
  }

  private getUnit(type: string): string {
    switch (type) {
      case 'heart_rate':
        return 'bpm';
      case 'power':
        return 'watts';
      case 'cadence':
        return 'rpm';
      case 'speed':
        return 'km/h';
      default:
        return '';
    }
  }

  private calculateQuality(rawData: any, protocol: 'ant_plus' | 'bluetooth'): number {
    let quality = 100; // Start with perfect quality

    // Reduce quality based on missing or poor data
    if (!rawData.timestamp) quality -= 10;
    if (!rawData.rawData && !rawData.buffer) quality -= 5;

    // Check for outliers based on previous readings
    const key = `${rawData.deviceId}-${rawData.type}`;
    const lastReading = this.lastReadings.get(key);
    
    if (lastReading) {
      const timeDiff = (new Date().getTime() - lastReading.timestamp.getTime()) / 1000;
      const valueDiff = Math.abs(rawData.value - lastReading.value);
      
      // Penalize for large time gaps (more than 5 seconds)
      if (timeDiff > 5) {
        quality -= Math.min(30, timeDiff * 2);
      }
      
      // Penalize for impossible value changes
      if (rawData.type === 'heart_rate' && valueDiff > 40) {
        quality -= 25;
      } else if (rawData.type === 'power' && valueDiff > 300) {
        quality -= 25;
      } else if (rawData.type === 'cadence' && valueDiff > 50) {
        quality -= 25;
      } else if (rawData.type === 'speed' && valueDiff > 20) {
        quality -= 25;
      }
    }

    // Protocol-specific quality assessment
    if (protocol === 'ant_plus') {
      // ANT+ typically has more reliable signal
      // Check for data integrity indicators from ANT+ library
      if (rawData.rawData) {
        // ANT+ provides signal quality indicators
        if (rawData.rawData.DeviceId === undefined) quality -= 10;
        if (rawData.rawData.EventCount !== undefined) {
          // Event count helps indicate data freshness
          quality += 5;
        }
      }
    } else if (protocol === 'bluetooth') {
      // BLE quality assessment
      if (rawData.signalStrength !== undefined) {
        if (rawData.signalStrength < 30) {
          quality -= (30 - rawData.signalStrength);
        }
      }
      
      // BLE buffer data indicates direct characteristic reads
      if (rawData.rawData && rawData.rawData.buffer) {
        quality += 5; // Bonus for having raw buffer data
      }
    }

    // Ensure quality is between 0-100
    return Math.max(0, Math.min(100, Math.round(quality)));
  }

  private validateReading(reading: SensorReading): boolean {
    // Basic validation
    if (!reading.deviceId) return false;
    // Note: sessionId can be null if no session is active
    if (!reading.metricType || !reading.unit) return false;
    if (typeof reading.value !== 'number') return false;
    if (reading.quality < 0 || reading.quality > 100) return false;

    // Type-specific validation
    switch (reading.metricType) {
      case 'heart_rate':
        return reading.value >= 40 && reading.value <= 220;
      case 'power':
        return reading.value >= 0 && reading.value <= 2000;
      case 'cadence':
        return reading.value >= 0 && reading.value <= 200;
      case 'speed':
        return reading.value >= 0 && reading.value <= 100;
      default:
        return true;
    }
  }

  private sanitizeRawData(rawData: any): any {
    // Remove potentially large or circular references
    if (!rawData) return null;
    
    // If it's ANT+ data, preserve important fields
    if (rawData.DeviceId !== undefined) {
      return {
        DeviceId: rawData.DeviceId,
        EventCount: rawData.EventCount,
        ManufacturerName: rawData.ManufacturerName,
        ProductName: rawData.ProductName,
        // Include metric-specific data
        ...this.extractMetricSpecificData(rawData)
      };
    }
    
    // If it's BLE data with buffer
    if (rawData.buffer) {
      return {
        buffer: rawData.buffer,
        length: rawData.buffer.length
      };
    }
    
    // For other data, create a safe copy
    try {
      return JSON.parse(JSON.stringify(rawData));
    } catch (error) {
      console.warn('Failed to sanitize raw data:', error);
      return { error: 'Failed to serialize raw data' };
    }
  }
  
  private extractMetricSpecificData(rawData: any): any {
    const result: any = {};
    
    // Heart rate specific fields
    if (rawData.ComputedHeartRate !== undefined) {
      result.ComputedHeartRate = rawData.ComputedHeartRate;
      result.RRInterval = rawData.RRInterval;
      result.BeatTime = rawData.BeatTime;
    }
    
    // Power specific fields
    if (rawData.Power !== undefined) {
      result.Power = rawData.Power;
      result.Cadence = rawData.Cadence;
      result.AccumulatedPower = rawData.AccumulatedPower;
      result.Balance = rawData.Balance;
    }
    
    // Speed/Cadence specific fields
    if (rawData.Speed !== undefined) {
      result.Speed = rawData.Speed;
      result.Distance = rawData.Distance;
    }
    
    if (rawData.Cadence !== undefined && result.Cadence === undefined) {
      result.Cadence = rawData.Cadence;
    }
    
    return result;
  }
  
  // Remove automatic session creation - sessions must be explicitly started
  // private getCurrentSessionId(): string {
  //   // For MVP, we'll use a simple approach - create one session per day
  //   const today = new Date().toISOString().split('T')[0];
  //   return `session-${today}-${createId().slice(0, 8)}`;
  // }
}