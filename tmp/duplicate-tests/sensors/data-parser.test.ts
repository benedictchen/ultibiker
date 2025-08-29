import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataParser } from '../../src/sensors/data-parser.js';

describe('DataParser', () => {
  let parser: DataParser;

  beforeEach(() => {
    parser = new DataParser();
    // Mock session ID generation
    vi.spyOn(parser as any, 'getCurrentSessionId').mockReturnValue('test-session-123');
  });

  describe('Heart Rate Parsing', () => {
    it('should parse valid heart rate data from ANT+', () => {
      const rawData = {
        deviceId: 'ant-hr-001',
        type: 'heart_rate',
        value: 165,
        timestamp: new Date('2025-01-15T10:30:15Z'),
        rawData: { heartRate: 165, rrInterval: 375 }
      };

      const result = parser.parse(rawData, 'ant_plus');

      expect(result).toEqual({
        deviceId: 'ant-hr-001',
        sessionId: 'test-session-123',
        timestamp: new Date('2025-01-15T10:30:15Z'),
        metricType: 'heart_rate',
        value: 165,
        unit: 'bpm',
        quality: 100,
        rawData: { heartRate: 165, rrInterval: 375 }
      });
    });

    it('should parse valid heart rate data from Bluetooth', () => {
      const rawData = {
        deviceId: 'ble-hr-001',
        type: 'heartrate',
        value: '168.5',
        timestamp: new Date('2025-01-15T10:30:16Z'),
        rawData: { heartRate: 168, contactDetected: true },
        rssi: -75
      };

      const result = parser.parse(rawData, 'bluetooth');

      expect(result).toEqual({
        deviceId: 'ble-hr-001',
        sessionId: 'test-session-123',
        timestamp: new Date('2025-01-15T10:30:16Z'),
        metricType: 'heart_rate',
        value: 169, // Rounded from 168.5
        unit: 'bpm',
        quality: 95, // Reduced due to RSSI
        rawData: { heartRate: 168, contactDetected: true }
      });
    });

    it('should reject heart rate values outside valid range', () => {
      const invalidLow = {
        deviceId: 'hr-001',
        type: 'heart_rate',
        value: 25 // Too low
      };

      const invalidHigh = {
        deviceId: 'hr-001',
        type: 'heart_rate',
        value: 250 // Too high
      };

      expect(parser.parse(invalidLow, 'ant_plus')).toBeNull();
      expect(parser.parse(invalidHigh, 'ant_plus')).toBeNull();
    });

    it('should handle alternative heart rate type names', () => {
      const hrVariations = ['heart_rate', 'heartrate', 'hr'];
      
      hrVariations.forEach(type => {
        const rawData = {
          deviceId: 'hr-001',
          type,
          value: 165
        };

        const result = parser.parse(rawData, 'ant_plus');
        expect(result?.metricType).toBe('heart_rate');
        expect(result?.unit).toBe('bpm');
      });
    });
  });

  describe('Power Parsing', () => {
    it('should parse valid power data', () => {
      const rawData = {
        deviceId: 'power-001',
        type: 'power',
        value: 250,
        timestamp: new Date('2025-01-15T10:30:15Z'),
        rawData: { power: 250, cadence: 90, balance: 52 }
      };

      const result = parser.parse(rawData, 'ant_plus');

      expect(result).toMatchObject({
        deviceId: 'power-001',
        metricType: 'power',
        value: 250,
        unit: 'watts',
        rawData: { power: 250, cadence: 90, balance: 52 }
      });
    });

    it('should reject power values outside valid range', () => {
      const invalidNegative = {
        deviceId: 'power-001',
        type: 'power',
        value: -50
      };

      const invalidHigh = {
        deviceId: 'power-001',
        type: 'power',
        value: 2500
      };

      expect(parser.parse(invalidNegative, 'ant_plus')).toBeNull();
      expect(parser.parse(invalidHigh, 'ant_plus')).toBeNull();
    });

    it('should handle power aliases', () => {
      const powerVariations = ['power', 'watts'];
      
      powerVariations.forEach(type => {
        const rawData = {
          deviceId: 'power-001',
          type,
          value: 300
        };

        const result = parser.parse(rawData, 'ant_plus');
        expect(result?.metricType).toBe('power');
        expect(result?.unit).toBe('watts');
      });
    });
  });

  describe('Cadence Parsing', () => {
    it('should parse valid cadence data', () => {
      const rawData = {
        deviceId: 'cadence-001',
        type: 'cadence',
        value: 92.7,
        rawData: { cadence: 92, revolutionCount: 1234 }
      };

      const result = parser.parse(rawData, 'bluetooth');

      expect(result).toMatchObject({
        metricType: 'cadence',
        value: 93, // Rounded
        unit: 'rpm'
      });
    });

    it('should reject cadence values outside valid range', () => {
      const invalidNegative = {
        deviceId: 'cadence-001',
        type: 'cadence',
        value: -5
      };

      const invalidHigh = {
        deviceId: 'cadence-001',
        type: 'cadence',
        value: 250
      };

      expect(parser.parse(invalidNegative, 'ant_plus')).toBeNull();
      expect(parser.parse(invalidHigh, 'ant_plus')).toBeNull();
    });

    it('should handle cadence aliases', () => {
      const cadenceVariations = ['cadence', 'rpm'];
      
      cadenceVariations.forEach(type => {
        const rawData = {
          deviceId: 'cadence-001',
          type,
          value: 85
        };

        const result = parser.parse(rawData, 'ant_plus');
        expect(result?.metricType).toBe('cadence');
        expect(result?.unit).toBe('rpm');
      });
    });
  });

  describe('Speed Parsing', () => {
    it('should parse valid speed data with precision', () => {
      const rawData = {
        deviceId: 'speed-001',
        type: 'speed',
        value: 35.237,
        rawData: { speed: 35.237, distance: 1250 }
      };

      const result = parser.parse(rawData, 'ant_plus');

      expect(result).toMatchObject({
        metricType: 'speed',
        value: 35.24, // Rounded to 2 decimal places
        unit: 'km/h'
      });
    });

    it('should reject speed values outside valid range', () => {
      const invalidNegative = {
        deviceId: 'speed-001',
        type: 'speed',
        value: -10
      };

      const invalidHigh = {
        deviceId: 'speed-001',
        type: 'speed',
        value: 150 // Too fast for cycling
      };

      expect(parser.parse(invalidNegative, 'ant_plus')).toBeNull();
      expect(parser.parse(invalidHigh, 'ant_plus')).toBeNull();
    });

    it('should handle speed aliases', () => {
      const speedVariations = ['speed', 'velocity'];
      
      speedVariations.forEach(type => {
        const rawData = {
          deviceId: 'speed-001',
          type,
          value: 28.5
        };

        const result = parser.parse(rawData, 'ant_plus');
        expect(result?.metricType).toBe('speed');
        expect(result?.unit).toBe('km/h');
      });
    });
  });

  describe('Data Quality Assessment', () => {
    it('should calculate quality based on signal strength for ANT+', () => {
      const strongSignal = {
        deviceId: 'device-001',
        type: 'heart_rate',
        value: 165,
        signalStrength: 95
      };

      const weakSignal = {
        deviceId: 'device-001',
        type: 'heart_rate',
        value: 165,
        signalStrength: 30 // Below 50 threshold
      };

      const strongResult = parser.parse(strongSignal, 'ant_plus');
      const weakResult = parser.parse(weakSignal, 'ant_plus');

      expect(strongResult?.quality).toBe(100);
      expect(weakResult?.quality).toBe(80); // 100 - (50-30)
    });

    it('should calculate quality based on RSSI for Bluetooth', () => {
      const strongRSSI = {
        deviceId: 'device-001',
        type: 'heart_rate',
        value: 165,
        rssi: -60 // Good signal
      };

      const weakRSSI = {
        deviceId: 'device-001',
        type: 'heart_rate',
        value: 165,
        rssi: -90 // Poor signal (-90 is 10 dB below -80 threshold)
      };

      const strongResult = parser.parse(strongRSSI, 'bluetooth');
      const weakResult = parser.parse(weakRSSI, 'bluetooth');

      expect(strongResult?.quality).toBe(100);
      expect(weakResult?.quality).toBe(90); // 100 - 10
    });

    it('should reduce quality for missing metadata', () => {
      const completeData = {
        deviceId: 'device-001',
        type: 'heart_rate',
        value: 165,
        timestamp: new Date(),
        rawData: { heartRate: 165 }
      };

      const incompleteData = {
        deviceId: 'device-001',
        type: 'heart_rate',
        value: 165
        // Missing timestamp and rawData
      };

      const completeResult = parser.parse(completeData, 'ant_plus');
      const incompleteResult = parser.parse(incompleteData, 'ant_plus');

      expect(completeResult?.quality).toBe(100);
      expect(incompleteResult?.quality).toBe(85); // 100 - 10 (no timestamp) - 5 (no rawData)
    });

    it('should clamp quality between 0 and 100', () => {
      const veryBadSignal = {
        deviceId: 'device-001',
        type: 'heart_rate',
        value: 165,
        rssi: -150, // Extremely poor signal
        // Missing timestamp and rawData too
      };

      const result = parser.parse(veryBadSignal, 'bluetooth');
      expect(result?.quality).toBeGreaterThanOrEqual(0);
      expect(result?.quality).toBeLessThanOrEqual(100);
    });
  });

  describe('Error Handling', () => {
    it('should return null for missing required fields', () => {
      const missingDeviceId = {
        type: 'heart_rate',
        value: 165
      };

      const missingType = {
        deviceId: 'device-001',
        value: 165
      };

      expect(parser.parse(missingDeviceId, 'ant_plus')).toBeNull();
      expect(parser.parse(missingType, 'ant_plus')).toBeNull();
    });

    it('should return null for invalid numeric values', () => {
      const invalidValue = {
        deviceId: 'device-001',
        type: 'heart_rate',
        value: 'not-a-number'
      };

      expect(parser.parse(invalidValue, 'ant_plus')).toBeNull();
    });

    it('should return null for unknown sensor types', () => {
      const unknownType = {
        deviceId: 'device-001',
        type: 'unknown_sensor',
        value: 123
      };

      expect(parser.parse(unknownType, 'ant_plus')).toBeNull();
    });

    it('should handle null and undefined input gracefully', () => {
      expect(parser.parse(null, 'ant_plus')).toBeNull();
      expect(parser.parse(undefined, 'ant_plus')).toBeNull();
      expect(parser.parse({}, 'ant_plus')).toBeNull();
    });
  });

  describe('Timestamp Handling', () => {
    it('should use provided timestamp when available', () => {
      const customTimestamp = new Date('2025-01-15T10:30:15Z');
      const rawData = {
        deviceId: 'device-001',
        type: 'heart_rate',
        value: 165,
        timestamp: customTimestamp
      };

      const result = parser.parse(rawData, 'ant_plus');
      expect(result?.timestamp).toEqual(customTimestamp);
    });

    it('should generate timestamp when not provided', () => {
      const beforeParse = new Date();
      const rawData = {
        deviceId: 'device-001',
        type: 'heart_rate',
        value: 165
      };

      const result = parser.parse(rawData, 'ant_plus');
      const afterParse = new Date();

      expect(result?.timestamp).toBeInstanceOf(Date);
      expect(result?.timestamp.getTime()).toBeGreaterThanOrEqual(beforeParse.getTime());
      expect(result?.timestamp.getTime()).toBeLessThanOrEqual(afterParse.getTime());
    });
  });
});