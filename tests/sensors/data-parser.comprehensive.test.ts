import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DataParser } from '../../src/sensors/data-parser.js';
import { MockDataGenerator, TimeUtils, ValidationUtils } from '../utils/test-helpers.js';

describe('DataParser - Comprehensive Tests', () => {
  let parser: DataParser;
  const mockSessionId = 'test-session-123';

  beforeEach(() => {
    parser = new DataParser();
    vi.spyOn(parser as any, 'getCurrentSessionId').mockReturnValue(mockSessionId);
  });

  afterEach(() => {
    TimeUtils.restoreTime();
  });

  describe('Heart Rate Parsing', () => {
    describe('ANT+ Heart Rate', () => {
      it('should parse valid ANT+ heart rate data', () => {
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
          sessionId: mockSessionId,
          timestamp: new Date('2025-01-15T10:30:15Z'),
          metricType: 'heart_rate',
          value: 165,
          unit: 'bpm',
          quality: 100,
          rawData: { heartRate: 165, rrInterval: 375 }
        });

        expect(ValidationUtils.isValidSensorReading(result)).toBe(true);
      });

      it('should handle missing timestamp by using current time', () => {
        const mockTime = TimeUtils.mockDate('2025-01-15T12:00:00Z');
        
        const rawData = {
          deviceId: 'ant-hr-001',
          type: 'heart_rate',
          value: 165,
          rawData: { heartRate: 165 }
        };

        const result = parser.parse(rawData, 'ant_plus');

        expect(result?.timestamp).toEqual(mockTime);
      });

      it('should reject invalid heart rate values', () => {
        const invalidValues = [0, -10, 25, 250, null, undefined, 'invalid'];

        invalidValues.forEach(invalidValue => {
          const rawData = {
            deviceId: 'ant-hr-001',
            type: 'heart_rate',
            value: invalidValue,
            timestamp: new Date()
          };

          const result = parser.parse(rawData as any, 'ant_plus');
          expect(result).toBeNull();
        });
      });

      it('should calculate quality based on signal consistency', () => {
        // First reading - should be high quality
        const reading1 = parser.parse({
          deviceId: 'ant-hr-001',
          type: 'heart_rate',
          value: 160,
          timestamp: new Date()
        }, 'ant_plus');

        expect(reading1?.quality).toBe(100);

        // Second reading with realistic change - should maintain quality
        TimeUtils.advanceTime(1000);
        const reading2 = parser.parse({
          deviceId: 'ant-hr-001',
          type: 'heart_rate',
          value: 162,
          timestamp: new Date()
        }, 'ant_plus');

        expect(reading2?.quality).toBeGreaterThan(90);

        // Third reading with unrealistic jump - should reduce quality
        TimeUtils.advanceTime(1000);
        const reading3 = parser.parse({
          deviceId: 'ant-hr-001',
          type: 'heart_rate',
          value: 200,
          timestamp: new Date()
        }, 'ant_plus');

        expect(reading3?.quality).toBeLessThan(80);
      });
    });

    describe('Bluetooth Heart Rate', () => {
      it('should parse valid Bluetooth heart rate data', () => {
        const rawData = {
          deviceId: 'ble-hr-001',
          type: 'heartrate',
          value: '168',
          timestamp: new Date('2025-01-15T10:30:16Z'),
          rawData: { heartRate: 168, contactDetected: true },
          rssi: -75
        };

        const result = parser.parse(rawData, 'bluetooth');

        expect(result).toEqual({
          deviceId: 'ble-hr-001',
          sessionId: mockSessionId,
          timestamp: new Date('2025-01-15T10:30:16Z'),
          metricType: 'heart_rate',
          value: 168,
          unit: 'bpm',
          quality: expect.any(Number),
          rawData: { heartRate: 168, contactDetected: true }
        });
      });

      it('should handle string values by parsing to number', () => {
        const rawData = {
          deviceId: 'ble-hr-001',
          type: 'heartrate',
          value: '175.5',
          timestamp: new Date()
        };

        const result = parser.parse(rawData, 'bluetooth');

        expect(result?.value).toBe(176); // Should round to nearest integer
      });

      it('should adjust quality based on RSSI signal strength', () => {
        const strongSignal = parser.parse({
          deviceId: 'ble-hr-001',
          type: 'heartrate',
          value: 165,
          rssi: -45,
          timestamp: new Date()
        }, 'bluetooth');

        const weakSignal = parser.parse({
          deviceId: 'ble-hr-002',
          type: 'heartrate',
          value: 165,
          rssi: -85,
          timestamp: new Date()
        }, 'bluetooth');

        expect(strongSignal?.quality).toBeGreaterThan(weakSignal?.quality || 0);
      });
    });
  });

  describe('Power Meter Parsing', () => {
    describe('ANT+ Power', () => {
      it('should parse valid ANT+ power data', () => {
        const rawData = {
          deviceId: 'ant-power-001',
          type: 'power',
          value: 275,
          timestamp: new Date('2025-01-15T10:30:15Z'),
          rawData: { 
            instantaneousPower: 275,
            pedalBalance: 52,
            cadence: 88
          }
        };

        const result = parser.parse(rawData, 'ant_plus');

        expect(result).toEqual({
          deviceId: 'ant-power-001',
          sessionId: mockSessionId,
          timestamp: new Date('2025-01-15T10:30:15Z'),
          metricType: 'power',
          value: 275,
          unit: 'watts',
          quality: 100,
          rawData: { 
            instantaneousPower: 275,
            pedalBalance: 52,
            cadence: 88
          }
        });
      });

      it('should reject negative power values', () => {
        const rawData = {
          deviceId: 'ant-power-001',
          type: 'power',
          value: -50,
          timestamp: new Date()
        };

        const result = parser.parse(rawData, 'ant_plus');
        expect(result).toBeNull();
      });

      it('should reject unrealistically high power values', () => {
        const rawData = {
          deviceId: 'ant-power-001',
          type: 'power',
          value: 2500,
          timestamp: new Date()
        };

        const result = parser.parse(rawData, 'ant_plus');
        expect(result).toBeNull();
      });

      it('should allow zero power (coasting)', () => {
        const rawData = {
          deviceId: 'ant-power-001',
          type: 'power',
          value: 0,
          timestamp: new Date()
        };

        const result = parser.parse(rawData, 'ant_plus');
        expect(result?.value).toBe(0);
        expect(result?.quality).toBeGreaterThan(0);
      });
    });

    describe('Bluetooth Power', () => {
      it('should parse cycling power measurement from BLE', () => {
        const rawData = {
          deviceId: 'ble-power-001',
          type: 'cycling_power',
          value: 225,
          timestamp: new Date(),
          rawData: {
            instantaneousPower: 225,
            pedalPowerBalance: 48.5,
            accumulatedTorque: 1234567
          }
        };

        const result = parser.parse(rawData, 'bluetooth');

        expect(result?.metricType).toBe('power');
        expect(result?.value).toBe(225);
        expect(result?.unit).toBe('watts');
      });
    });
  });

  describe('Speed Sensor Parsing', () => {
    it('should parse speed data with proper unit conversion', () => {
      const rawData = {
        deviceId: 'speed-001',
        type: 'speed',
        value: 15.5, // m/s
        unit: 'm/s',
        timestamp: new Date()
      };

      const result = parser.parse(rawData, 'bluetooth');

      // Should convert m/s to kph: 15.5 * 3.6 = 55.8 kph
      expect(result?.value).toBeCloseTo(55.8, 1);
      expect(result?.unit).toBe('kph');
    });

    it('should handle wheel revolution data for speed calculation', () => {
      const rawData = {
        deviceId: 'speed-001',
        type: 'wheel_revolution',
        value: 2100, // wheel circumference in mm
        timestamp: new Date(),
        rawData: {
          wheelRevolutions: 1500,
          wheelEventTime: Date.now(),
          wheelCircumference: 2100 // mm
        }
      };

      const result = parser.parse(rawData, 'bluetooth');

      expect(result?.metricType).toBe('speed');
      expect(result?.unit).toBe('kph');
      expect(result?.value).toBeGreaterThan(0);
    });

    it('should reject negative speeds', () => {
      const rawData = {
        deviceId: 'speed-001',
        type: 'speed',
        value: -10,
        timestamp: new Date()
      };

      const result = parser.parse(rawData, 'bluetooth');
      expect(result).toBeNull();
    });

    it('should reject unrealistically high speeds', () => {
      const rawData = {
        deviceId: 'speed-001',
        type: 'speed',
        value: 120, // 120 kph is too high for cycling
        unit: 'kph',
        timestamp: new Date()
      };

      const result = parser.parse(rawData, 'bluetooth');
      expect(result).toBeNull();
    });
  });

  describe('Cadence Sensor Parsing', () => {
    it('should parse cadence data correctly', () => {
      const rawData = {
        deviceId: 'cadence-001',
        type: 'cadence',
        value: 88,
        timestamp: new Date(),
        rawData: {
          crankRevolutions: 2500,
          crankEventTime: Date.now()
        }
      };

      const result = parser.parse(rawData, 'ant_plus');

      expect(result?.metricType).toBe('cadence');
      expect(result?.value).toBe(88);
      expect(result?.unit).toBe('rpm');
    });

    it('should handle crank revolution data for cadence calculation', () => {
      const rawData = {
        deviceId: 'cadence-001',
        type: 'crank_revolution',
        timestamp: new Date(),
        rawData: {
          crankRevolutions: 1200,
          crankEventTime: Date.now() - 60000 // 1 minute ago
        }
      };

      const result = parser.parse(rawData, 'bluetooth');

      expect(result?.metricType).toBe('cadence');
      expect(result?.unit).toBe('rpm');
      expect(result?.value).toBeGreaterThan(0);
    });

    it('should allow zero cadence (not pedaling)', () => {
      const rawData = {
        deviceId: 'cadence-001',
        type: 'cadence',
        value: 0,
        timestamp: new Date()
      };

      const result = parser.parse(rawData, 'ant_plus');
      expect(result?.value).toBe(0);
    });

    it('should reject unrealistically high cadence', () => {
      const rawData = {
        deviceId: 'cadence-001',
        type: 'cadence',
        value: 250, // 250 RPM is unrealistic
        timestamp: new Date()
      };

      const result = parser.parse(rawData, 'ant_plus');
      expect(result).toBeNull();
    });
  });

  describe('Data Quality Assessment', () => {
    it('should penalize old timestamps', () => {
      const oldTimestamp = new Date(Date.now() - 10000); // 10 seconds old
      
      const rawData = {
        deviceId: 'test-001',
        type: 'heart_rate',
        value: 165,
        timestamp: oldTimestamp
      };

      const result = parser.parse(rawData, 'ant_plus');

      expect(result?.quality).toBeLessThan(100);
    });

    it('should improve quality with consistent readings', () => {
      const deviceId = 'consistent-001';
      const baseTime = Date.now();
      
      // Add several consistent readings
      for (let i = 0; i < 5; i++) {
        parser.parse({
          deviceId,
          type: 'heart_rate',
          value: 160 + i, // Small increments
          timestamp: new Date(baseTime + i * 1000)
        }, 'ant_plus');
      }

      // The latest reading should have high quality
      const result = parser.parse({
        deviceId,
        type: 'heart_rate',
        value: 165,
        timestamp: new Date(baseTime + 5000)
      }, 'ant_plus');

      expect(result?.quality).toBeGreaterThan(90);
    });

    it('should reduce quality for erratic readings', () => {
      const deviceId = 'erratic-001';
      const baseTime = Date.now();
      
      // Add erratic readings
      const values = [160, 190, 140, 180, 150];
      values.forEach((value, i) => {
        parser.parse({
          deviceId,
          type: 'heart_rate',
          value,
          timestamp: new Date(baseTime + i * 1000)
        }, 'ant_plus');
      });

      // The quality should be reduced due to erratic behavior
      const result = parser.parse({
        deviceId,
        type: 'heart_rate',
        value: 165,
        timestamp: new Date(baseTime + 5000)
      }, 'ant_plus');

      expect(result?.quality).toBeLessThan(80);
    });
  });

  describe('Protocol-Specific Parsing', () => {
    it('should handle ANT+ specific data formats', () => {
      const rawData = {
        deviceId: 'ant-001',
        type: 'fitness_equipment',
        value: 250,
        timestamp: new Date(),
        rawData: {
          equipmentType: 'trainer',
          instantaneousPower: 250,
          targetPower: 260,
          feState: 'in_use'
        }
      };

      const result = parser.parse(rawData, 'ant_plus');

      expect(result?.metricType).toBe('power');
      expect(result?.value).toBe(250);
    });

    it('should handle Bluetooth GATT service data', () => {
      const rawData = {
        deviceId: 'ble-001',
        type: 'indoor_bike_data',
        timestamp: new Date(),
        rawData: {
          instantaneousSpeed: 25.5,
          instantaneousPower: 275,
          instantaneousCadence: 88,
          heartRate: 165
        }
      };

      // Should extract multiple metrics from indoor bike data
      const result = parser.parse(rawData, 'bluetooth');

      // Should prioritize power data from indoor bike
      expect(result?.metricType).toBe('power');
      expect(result?.value).toBe(275);
    });
  });

  describe('Calibration and Offset Handling', () => {
    it('should apply calibration offsets when configured', () => {
      // Set a calibration offset for power meter
      parser.setCalibrationOffset('power-001', 'power', -10);

      const rawData = {
        deviceId: 'power-001',
        type: 'power',
        value: 250,
        timestamp: new Date()
      };

      const result = parser.parse(rawData, 'ant_plus');

      expect(result?.value).toBe(240); // 250 - 10 = 240
    });

    it('should apply calibration multipliers', () => {
      // Set a calibration multiplier for heart rate
      parser.setCalibrationMultiplier('hr-001', 'heart_rate', 1.05);

      const rawData = {
        deviceId: 'hr-001',
        type: 'heart_rate',
        value: 160,
        timestamp: new Date()
      };

      const result = parser.parse(rawData, 'bluetooth');

      expect(result?.value).toBe(168); // 160 * 1.05 = 168
    });
  });

  describe('Error Handling', () => {
    it('should handle null/undefined input gracefully', () => {
      expect(parser.parse(null as any, 'ant_plus')).toBeNull();
      expect(parser.parse(undefined as any, 'bluetooth')).toBeNull();
    });

    it('should handle missing required fields', () => {
      const incompleteData = {
        // Missing deviceId and type
        value: 165,
        timestamp: new Date()
      };

      const result = parser.parse(incompleteData as any, 'ant_plus');
      expect(result).toBeNull();
    });

    it('should handle invalid protocol values', () => {
      const rawData = {
        deviceId: 'test-001',
        type: 'heart_rate',
        value: 165,
        timestamp: new Date()
      };

      const result = parser.parse(rawData, 'invalid_protocol' as any);
      expect(result).toBeNull();
    });

    it('should handle parsing errors without crashing', () => {
      const malformedData = {
        deviceId: 'test-001',
        type: 'heart_rate',
        value: { complex: 'object' },
        timestamp: 'invalid-date'
      };

      expect(() => {
        parser.parse(malformedData as any, 'ant_plus');
      }).not.toThrow();

      const result = parser.parse(malformedData as any, 'ant_plus');
      expect(result).toBeNull();
    });
  });

  describe('Performance Tests', () => {
    it('should parse readings efficiently', () => {
      const startTime = performance.now();
      const readings = MockDataGenerator.createSensorReadings(1000);

      readings.forEach(reading => {
        parser.parse(reading, 'bluetooth');
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should process 1000 readings in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle memory efficiently with large datasets', () => {
      // Create a large number of readings to test memory usage
      for (let i = 0; i < 10000; i++) {
        const reading = MockDataGenerator.createHeartRateReading({
          deviceId: `device-${i % 10}` // Rotate through 10 devices
        });
        parser.parse(reading, 'bluetooth');
      }

      // Memory usage should be reasonable (no specific assertion, just ensure no crash)
      expect(true).toBe(true);
    });
  });
});