import { z } from 'zod';

// Base schemas
export const IdSchema = z.string().min(1, 'ID is required');

export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).default(1000),
  offset: z.coerce.number().int().min(0).default(0)
});

export const TimestampSchema = z.string().datetime().or(z.date());

// Sensor schemas
export const SensorTypeSchema = z.enum(['heart_rate', 'power', 'cadence', 'speed', 'trainer']);
export const ProtocolSchema = z.enum(['ant_plus', 'bluetooth']);
export const ConnectionStatusSchema = z.enum(['connected', 'connecting', 'disconnected', 'error']);

export const SensorDeviceSchema = z.object({
  deviceId: z.string().min(1),
  name: z.string().min(1),
  displayName: z.string().optional(),
  type: SensorTypeSchema,
  protocol: ProtocolSchema,
  isConnected: z.boolean(),
  signalStrength: z.number().min(-100).max(0),
  batteryLevel: z.number().min(0).max(100).optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  category: z.string().optional(),
  firmwareVersion: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.object({
    serialNumber: z.string().optional(),
    hardwareRevision: z.string().optional(),
    firmwareRevision: z.string().optional(),
    softwareRevision: z.string().optional(),
    rawAdvertisement: z.any().optional()
  }).optional()
});

export const SensorReadingSchema = z.object({
  deviceId: IdSchema,
  sessionId: IdSchema,
  timestamp: TimestampSchema,
  metricType: SensorTypeSchema,
  value: z.number(),
  unit: z.string().min(1),
  quality: z.number().min(0).max(1),
  rawData: z.any().optional()
});

// Session schemas
export const SessionStatusSchema = z.enum(['active', 'completed', 'paused']);

export const CreateSessionSchema = z.object({
  name: z.string().min(1).max(255).default('New Ride Session'),
  notes: z.string().max(1000).optional().nullable()
});

export const UpdateSessionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  status: SessionStatusSchema.optional(),
  notes: z.string().max(1000).optional().nullable(),
  endTime: TimestampSchema.optional()
});

export const SessionQuerySchema = z.object({
  metricType: SensorTypeSchema.optional(),
  startTime: TimestampSchema.optional(),
  endTime: TimestampSchema.optional(),
  ...PaginationSchema.shape
});

// Device API schemas
export const DeviceConnectionSchema = z.object({
  deviceId: IdSchema
});

// API Response schemas
export const ApiSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string().optional(),
  count: z.number().optional(),
  pagination: z.object({
    limit: z.number(),
    offset: z.number()
  }).optional()
});

export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.any().optional()
});

export const ApiResponseSchema = z.union([ApiSuccessResponseSchema, ApiErrorResponseSchema]);

// Type exports
export type CreateSessionRequest = z.infer<typeof CreateSessionSchema>;
export type UpdateSessionRequest = z.infer<typeof UpdateSessionSchema>;
export type SessionQuery = z.infer<typeof SessionQuerySchema>;
export type SensorDevice = z.infer<typeof SensorDeviceSchema>;
export type SensorReading = z.infer<typeof SensorReadingSchema>;
export type ApiSuccessResponse = z.infer<typeof ApiSuccessResponseSchema>;
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;