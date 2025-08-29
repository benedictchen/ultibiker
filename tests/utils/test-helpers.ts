import { vi } from 'vitest';
import { createId } from '@paralleldrive/cuid2';

export interface MockSensorReading {
  deviceId: string;
  sessionId?: string;
  timestamp: Date;
  metricType: 'heart_rate' | 'power' | 'cadence' | 'speed';
  value: number;
  unit: string;
  quality: number;
  rawData?: any;
}

export interface MockDevice {
  id: string;
  name: string;
  type: string;
  protocol: 'ant_plus' | 'bluetooth';
  isConnected: boolean;
  batteryLevel?: number;
  signalStrength?: number;
  lastSeen: Date;
}

export interface MockSession {
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'paused' | 'completed';
  duration?: number;
  avgHeartRate?: number;
  avgPower?: number;
  maxPower?: number;
  avgSpeed?: number;
  maxSpeed?: number;
  avgCadence?: number;
  distance?: number;
  calories?: number;
}

/**
 * Generate mock sensor readings for testing
 */
export class MockDataGenerator {
  static createSensorReading(overrides: Partial<MockSensorReading> = {}): MockSensorReading {
    const baseReading: MockSensorReading = {
      deviceId: `device-${createId()}`,
      sessionId: `session-${createId()}`,
      timestamp: new Date(),
      metricType: 'heart_rate',
      value: 150,
      unit: 'bpm',
      quality: 100,
      rawData: { raw: true }
    };

    return { ...baseReading, ...overrides };
  }

  static createHeartRateReading(overrides: Partial<MockSensorReading> = {}): MockSensorReading {
    return this.createSensorReading({
      metricType: 'heart_rate',
      value: 145 + Math.random() * 40, // 145-185 bpm
      unit: 'bpm',
      rawData: { heartRate: 165, rrInterval: Math.floor(300 + Math.random() * 200) },
      ...overrides
    });
  }

  static createPowerReading(overrides: Partial<MockSensorReading> = {}): MockSensorReading {
    return this.createSensorReading({
      metricType: 'power',
      value: 200 + Math.random() * 150, // 200-350 watts
      unit: 'watts',
      rawData: { instantaneousPower: 275, pedalBalance: 50 },
      ...overrides
    });
  }

  static createSpeedReading(overrides: Partial<MockSensorReading> = {}): MockSensorReading {
    return this.createSensorReading({
      metricType: 'speed',
      value: 25 + Math.random() * 15, // 25-40 kph
      unit: 'kph',
      rawData: { wheelRevolutions: 1234, wheelEventTime: Date.now() },
      ...overrides
    });
  }

  static createCadenceReading(overrides: Partial<MockSensorReading> = {}): MockSensorReading {
    return this.createSensorReading({
      metricType: 'cadence',
      value: 80 + Math.random() * 30, // 80-110 rpm
      unit: 'rpm',
      rawData: { crankRevolutions: 567, crankEventTime: Date.now() },
      ...overrides
    });
  }

  static createDevice(overrides: Partial<MockDevice> = {}): MockDevice {
    const baseDevice: MockDevice = {
      id: `device-${createId()}`,
      name: 'Test Device',
      type: 'heart_rate',
      protocol: 'bluetooth',
      isConnected: true,
      batteryLevel: 85,
      signalStrength: -65,
      lastSeen: new Date()
    };

    return { ...baseDevice, ...overrides };
  }

  static createHeartRateMonitor(overrides: Partial<MockDevice> = {}): MockDevice {
    return this.createDevice({
      name: 'Polar H10 Heart Rate',
      type: 'heart_rate',
      protocol: 'bluetooth',
      ...overrides
    });
  }

  static createPowerMeter(overrides: Partial<MockDevice> = {}): MockDevice {
    return this.createDevice({
      name: 'Stages Power L',
      type: 'power',
      protocol: 'ant_plus',
      ...overrides
    });
  }

  static createSpeedSensor(overrides: Partial<MockDevice> = {}): MockDevice {
    return this.createDevice({
      name: 'Wahoo Speed Sensor',
      type: 'speed',
      protocol: 'bluetooth',
      ...overrides
    });
  }

  static createSession(overrides: Partial<MockSession> = {}): MockSession {
    const baseSession: MockSession = {
      id: `session-${createId()}`,
      name: 'Morning Ride',
      startTime: new Date(Date.now() - 3600000), // 1 hour ago
      status: 'active'
    };

    return { ...baseSession, ...overrides };
  }

  static createCompletedSession(overrides: Partial<MockSession> = {}): MockSession {
    const startTime = new Date(Date.now() - 7200000); // 2 hours ago
    const endTime = new Date(Date.now() - 3600000); // 1 hour ago
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    return this.createSession({
      endTime,
      duration,
      status: 'completed',
      avgHeartRate: 165,
      avgPower: 225,
      maxPower: 450,
      avgSpeed: 28.5,
      maxSpeed: 52.3,
      avgCadence: 88,
      distance: 28.5, // km
      calories: 850,
      ...overrides
    });
  }

  static createSensorReadings(count: number, sessionId?: string): MockSensorReading[] {
    const readings: MockSensorReading[] = [];
    const deviceTypes = ['heart_rate', 'power', 'speed', 'cadence'] as const;
    const sessionIdToUse = sessionId || `session-${createId()}`;

    for (let i = 0; i < count; i++) {
      const metricType = deviceTypes[i % deviceTypes.length];
      const timestamp = new Date(Date.now() - (count - i) * 1000); // 1 second intervals

      switch (metricType) {
        case 'heart_rate':
          readings.push(this.createHeartRateReading({ sessionId: sessionIdToUse, timestamp }));
          break;
        case 'power':
          readings.push(this.createPowerReading({ sessionId: sessionIdToUse, timestamp }));
          break;
        case 'speed':
          readings.push(this.createSpeedReading({ sessionId: sessionIdToUse, timestamp }));
          break;
        case 'cadence':
          readings.push(this.createCadenceReading({ sessionId: sessionIdToUse, timestamp }));
          break;
      }
    }

    return readings;
  }
}

/**
 * Database test utilities
 */
export class DatabaseTestUtils {
  static createInMemoryDB() {
    const Database = require('better-sqlite3');
    const { drizzle } = require('drizzle-orm/better-sqlite3');
    const sqlite = new Database(':memory:');
    return drizzle(sqlite);
  }

  static async seedDatabase(db: any, data: { 
    devices?: MockDevice[], 
    sessions?: MockSession[], 
    sensorReadings?: MockSensorReading[] 
  }) {
    const { devices, sessions, sensorData } = await import('../../src/database/schema.js');

    // Insert devices
    if (data.devices?.length) {
      await db.insert(devices).values(data.devices);
    }

    // Insert sessions
    if (data.sessions?.length) {
      await db.insert(sessions).values(data.sessions);
    }

    // Insert sensor readings
    if (data.sensorReadings?.length) {
      await db.insert(sensorData).values(data.sensorReadings);
    }
  }
}

/**
 * Mock implementations for hardware dependencies
 */
export class HardwareMocks {
  static createMockANTManager() {
    return {
      initialize: vi.fn().mockResolvedValue(undefined),
      startScanning: vi.fn().mockResolvedValue(undefined),
      stopScanning: vi.fn().mockResolvedValue(undefined),
      connectDevice: vi.fn().mockResolvedValue(undefined),
      disconnectDevice: vi.fn().mockResolvedValue(undefined),
      getConnectedDevices: vi.fn().mockReturnValue([]),
      on: vi.fn(),
      emit: vi.fn(),
      removeListener: vi.fn()
    };
  }

  static createMockBLEManager() {
    return {
      initialize: vi.fn().mockResolvedValue(undefined),
      startScanning: vi.fn().mockResolvedValue(undefined),
      stopScanning: vi.fn().mockResolvedValue(undefined),
      connectDevice: vi.fn().mockResolvedValue(undefined),
      disconnectDevice: vi.fn().mockResolvedValue(undefined),
      getConnectedDevices: vi.fn().mockReturnValue([]),
      on: vi.fn(),
      emit: vi.fn(),
      removeListener: vi.fn()
    };
  }

  static createMockSensorManager(options: { enableHardware?: boolean } = {}) {
    const mockManager = {
      initialize: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined),
      startScanning: vi.fn().mockResolvedValue(undefined),
      stopScanning: vi.fn().mockResolvedValue(undefined),
      connectDevice: vi.fn().mockResolvedValue(undefined),
      disconnectDevice: vi.fn().mockResolvedValue(undefined),
      getDeviceStatus: vi.fn().mockReturnValue({ connected: [], scanning: false }),
      on: vi.fn(),
      emit: vi.fn(),
      removeListener: vi.fn(),
      removeAllListeners: vi.fn()
    };

    if (options.enableHardware) {
      // Simulate finding devices when scanning
      mockManager.startScanning.mockImplementation(async () => {
        setTimeout(() => {
          mockManager.emit('deviceDiscovered', MockDataGenerator.createHeartRateMonitor());
          mockManager.emit('deviceDiscovered', MockDataGenerator.createPowerMeter());
        }, 100);
      });
    }

    return mockManager;
  }
}

/**
 * API test utilities
 */
export class APITestUtils {
  static async makeRequest(app: any, method: 'get' | 'post' | 'put' | 'delete', path: string, data?: any) {
    const request = require('supertest');
    const req = request(app)[method](path);
    
    if (data) {
      req.send(data);
    }
    
    return req;
  }

  static expectSuccessResponse(response: any, expectedData?: any) {
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    
    if (expectedData) {
      expect(response.body.data).toEqual(expect.objectContaining(expectedData));
    }
  }

  static expectErrorResponse(response: any, expectedStatus: number, expectedMessage?: string) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.success).toBe(false);
    
    if (expectedMessage) {
      expect(response.body.error).toContain(expectedMessage);
    }
  }
}

/**
 * WebSocket test utilities
 */
export class WebSocketTestUtils {
  static createMockSocket() {
    return {
      id: `socket-${createId()}`,
      emit: vi.fn(),
      on: vi.fn(),
      disconnect: vi.fn(),
      rooms: new Set(),
      join: vi.fn((room: string) => {
        this.rooms.add(room);
      }),
      leave: vi.fn((room: string) => {
        this.rooms.delete(room);
      })
    };
  }

  static createMockSocketIO() {
    return {
      on: vi.fn(),
      emit: vi.fn(),
      to: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      sockets: {
        sockets: new Map()
      }
    };
  }
}

/**
 * Time utilities for testing
 */
export class TimeUtils {
  static mockDate(date: Date | string) {
    const mockDate = new Date(date);
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
    return mockDate;
  }

  static restoreTime() {
    vi.useRealTimers();
  }

  static advanceTime(ms: number) {
    vi.advanceTimersByTime(ms);
  }
}

/**
 * Validation utilities
 */
export class ValidationUtils {
  static isValidSensorReading(reading: any): reading is MockSensorReading {
    return (
      typeof reading.deviceId === 'string' &&
      typeof reading.sessionId === 'string' &&
      reading.timestamp instanceof Date &&
      typeof reading.metricType === 'string' &&
      typeof reading.value === 'number' &&
      typeof reading.unit === 'string' &&
      typeof reading.quality === 'number' &&
      reading.quality >= 0 && reading.quality <= 100
    );
  }

  static isValidDevice(device: any): device is MockDevice {
    return (
      typeof device.id === 'string' &&
      typeof device.name === 'string' &&
      typeof device.type === 'string' &&
      ['ant_plus', 'bluetooth'].includes(device.protocol) &&
      typeof device.isConnected === 'boolean' &&
      device.lastSeen instanceof Date
    );
  }

  static isValidSession(session: any): session is MockSession {
    return (
      typeof session.id === 'string' &&
      typeof session.name === 'string' &&
      session.startTime instanceof Date &&
      ['active', 'paused', 'completed'].includes(session.status)
    );
  }
}