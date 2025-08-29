// Data validation schemas for sensor data and device information
import { z } from 'zod';
import { SensorType, Protocol } from '../types/sensor.js';

/**
 * Raw sensor data validation schemas
 */

// Base sensor reading schema
const BaseSensorReadingSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
  timestamp: z.date().optional().default(() => new Date()),
  rawData: z.any().optional(),
  signalStrength: z.number().min(0).max(100).optional(),
  companyId: z.number().optional(),
  manufacturer: z.string().optional(),
  deviceName: z.string().optional()
});

// Heart rate sensor validation
const HeartRateDataSchema = BaseSensorReadingSchema.extend({
  type: z.literal('heart_rate'),
  value: z.number()
    .min(30, 'Heart rate must be at least 30 BPM')
    .max(250, 'Heart rate cannot exceed 250 BPM')
    .int('Heart rate must be an integer'),
  unit: z.literal('bpm').optional().default('bpm')
});

// Power meter validation  
const PowerDataSchema = BaseSensorReadingSchema.extend({
  type: z.literal('power'),
  value: z.number()
    .min(0, 'Power cannot be negative')
    .max(3000, 'Power cannot exceed 3000W'),
  unit: z.literal('watts').optional().default('watts'),
  cadence: z.number().min(0).max(300).optional()
});

// Cadence sensor validation
const CadenceDataSchema = BaseSensorReadingSchema.extend({
  type: z.literal('cadence'),
  value: z.number()
    .min(0, 'Cadence cannot be negative')
    .max(300, 'Cadence cannot exceed 300 RPM')
    .int('Cadence must be an integer'),
  unit: z.literal('rpm').optional().default('rpm')
});

// Speed sensor validation
const SpeedDataSchema = BaseSensorReadingSchema.extend({
  type: z.literal('speed'),
  value: z.number()
    .min(0, 'Speed cannot be negative')
    .max(150, 'Speed cannot exceed 150 km/h'),
  unit: z.enum(['kmh', 'mph', 'ms']).optional().default('kmh')
});

// Smart trainer validation
const TrainerDataSchema = BaseSensorReadingSchema.extend({
  type: z.literal('trainer'),
  value: z.number().min(0),
  unit: z.string(),
  resistance: z.number().min(0).max(100).optional(),
  targetPower: z.number().min(0).optional()
});

// Union schema for all sensor types
export const RawSensorDataSchema = z.discriminatedUnion('type', [
  HeartRateDataSchema,
  PowerDataSchema,
  CadenceDataSchema,
  SpeedDataSchema,
  TrainerDataSchema
]);

/**
 * Device information validation schemas
 */

export const DeviceInfoSchema = z.object({
  deviceId: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['heart_rate', 'power', 'cadence', 'speed', 'trainer', 'unknown']),
  protocol: z.enum(['bluetooth', 'ant_plus']),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  firmwareVersion: z.string().optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
  signalStrength: z.number().min(0).max(100).optional(),
  capabilities: z.array(z.string()).optional(),
  isConnected: z.boolean().default(false),
  cyclingRelevance: z.number().min(0).max(100).optional()
});

/**
 * Session data validation schemas
 */

export const SessionDataSchema = z.object({
  name: z.string().min(1, 'Session name is required').max(100, 'Session name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  startTime: z.date().optional().default(() => new Date()),
  endTime: z.date().optional(),
  userId: z.string().optional()
});

export const SensorReadingSchema = z.object({
  deviceId: z.string().min(1),
  sessionId: z.string().min(1),
  timestamp: z.date(),
  metricType: z.enum(['heart_rate', 'power', 'cadence', 'speed', 'trainer']),
  value: z.number(),
  unit: z.string(),
  quality: z.number().min(0).max(100),
  rawData: z.any().optional()
});

/**
 * API request validation schemas
 */

export const DeviceConnectionRequestSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required')
});

export const SessionStartRequestSchema = z.object({
  name: z.string().min(1, 'Session name is required').max(100),
  description: z.string().max(500).optional()
});

export const SessionStopRequestSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required')
});

/**
 * Apple Watch specific validation
 */

export const AppleWatchDataSchema = BaseSensorReadingSchema.extend({
  type: z.literal('heart_rate'),
  value: z.number()
    .min(30, 'Apple Watch heart rate must be at least 30 BPM')
    .max(220, 'Apple Watch heart rate cannot exceed 220 BPM')
    .int('Apple Watch heart rate must be an integer'),
  unit: z.literal('bpm').default('bpm'),
  // Apple Watch specific fields
  manufacturer: z.literal('Apple').optional(),
  companyId: z.literal(76).optional(), // Apple's Bluetooth SIG Company ID
  deviceName: z.string()
    .refine(name => {
      if (!name) return true;
      const lowerName = name.toLowerCase();
      return lowerName.includes('heartcast') || 
             lowerName.includes('hrm') || 
             lowerName.includes('blueheart') || 
             lowerName.includes('echohr') ||
             lowerName.includes('apple watch');
    }, 'Invalid Apple Watch heart rate app name')
    .optional()
});

/**
 * Validation error types
 */

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

/**
 * Validation utility class
 */

export class SensorDataValidator {
  
  /**
   * Validate raw sensor data
   */
  static validateRawSensorData(data: unknown): ValidationResult<z.infer<typeof RawSensorDataSchema>> {
    try {
      const validated = RawSensorDataSchema.parse(data);
      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: ValidationError[] = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          value: 'received' in err ? err.received : undefined
        }));
        return { success: false, errors };
      }
      return { 
        success: false, 
        errors: [{ field: 'unknown', message: 'Unknown validation error', code: 'unknown' }]
      };
    }
  }

  /**
   * Validate device information
   */
  static validateDeviceInfo(data: unknown): ValidationResult<z.infer<typeof DeviceInfoSchema>> {
    try {
      const validated = DeviceInfoSchema.parse(data);
      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: ValidationError[] = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          value: 'received' in err ? err.received : undefined
        }));
        return { success: false, errors };
      }
      return { 
        success: false, 
        errors: [{ field: 'unknown', message: 'Unknown validation error', code: 'unknown' }]
      };
    }
  }

  /**
   * Validate Apple Watch specific data
   */
  static validateAppleWatchData(data: unknown): ValidationResult<z.infer<typeof AppleWatchDataSchema>> {
    try {
      const validated = AppleWatchDataSchema.parse(data);
      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: ValidationError[] = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          value: 'received' in err ? err.received : undefined
        }));
        return { success: false, errors };
      }
      return { 
        success: false, 
        errors: [{ field: 'unknown', message: 'Unknown validation error', code: 'unknown' }]
      };
    }
  }

  /**
   * Validate session data
   */
  static validateSessionData(data: unknown): ValidationResult<z.infer<typeof SessionDataSchema>> {
    try {
      const validated = SessionDataSchema.parse(data);
      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: ValidationError[] = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          value: 'received' in err ? err.received : undefined
        }));
        return { success: false, errors };
      }
      return { 
        success: false, 
        errors: [{ field: 'unknown', message: 'Unknown validation error', code: 'unknown' }]
      };
    }
  }

  /**
   * Validate sensor reading for database storage
   */
  static validateSensorReading(data: unknown): ValidationResult<z.infer<typeof SensorReadingSchema>> {
    try {
      const validated = SensorReadingSchema.parse(data);
      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: ValidationError[] = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          value: 'received' in err ? err.received : undefined
        }));
        return { success: false, errors };
      }
      return { 
        success: false, 
        errors: [{ field: 'unknown', message: 'Unknown validation error', code: 'unknown' }]
      };
    }
  }

  /**
   * Sanitize and normalize sensor data
   */
  static sanitizeRawData(data: any): any {
    if (!data) return null;
    
    // Remove sensitive information
    const sanitized = { ...data };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    delete sanitized.key;
    
    // Limit string lengths to prevent excessive storage
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
        sanitized[key] = sanitized[key].substring(0, 1000) + '...';
      }
    });
    
    return sanitized;
  }

  /**
   * Check if data represents a valid cycling sensor
   */
  static isCyclingSensor(data: any): boolean {
    if (!data || !data.type) return false;
    
    const cyclingTypes = ['heart_rate', 'power', 'cadence', 'speed', 'trainer'];
    return cyclingTypes.includes(data.type);
  }

  /**
   * Get validation schema for sensor type
   */
  static getSchemaForSensorType(type: SensorType): z.ZodSchema | null {
    switch (type) {
      case 'heart_rate':
        return HeartRateDataSchema;
      case 'power':
        return PowerDataSchema;
      case 'cadence':
        return CadenceDataSchema;
      case 'speed':
        return SpeedDataSchema;
      case 'trainer':
        return TrainerDataSchema;
      default:
        return null;
    }
  }
}

// Type exports for use in other modules
export type ValidatedRawSensorData = z.infer<typeof RawSensorDataSchema>;
export type ValidatedDeviceInfo = z.infer<typeof DeviceInfoSchema>;
export type ValidatedSessionData = z.infer<typeof SessionDataSchema>;
export type ValidatedSensorReading = z.infer<typeof SensorReadingSchema>;
export type ValidatedAppleWatchData = z.infer<typeof AppleWatchDataSchema>;