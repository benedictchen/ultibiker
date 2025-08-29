import { z } from 'zod';
export declare const IdSchema: z.ZodString;
export declare const PaginationSchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
}, {
    limit?: number | undefined;
    offset?: number | undefined;
}>;
export declare const TimestampSchema: z.ZodUnion<[z.ZodString, z.ZodDate]>;
export declare const SensorTypeSchema: z.ZodEnum<["heart_rate", "power", "cadence", "speed", "trainer"]>;
export declare const ProtocolSchema: z.ZodEnum<["ant_plus", "bluetooth"]>;
export declare const ConnectionStatusSchema: z.ZodEnum<["connected", "connecting", "disconnected", "error"]>;
export declare const SensorDeviceSchema: z.ZodObject<{
    deviceId: z.ZodString;
    name: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["heart_rate", "power", "cadence", "speed", "trainer"]>;
    protocol: z.ZodEnum<["ant_plus", "bluetooth"]>;
    isConnected: z.ZodBoolean;
    signalStrength: z.ZodNumber;
    batteryLevel: z.ZodOptional<z.ZodNumber>;
    manufacturer: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    firmwareVersion: z.ZodOptional<z.ZodString>;
    capabilities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    confidence: z.ZodOptional<z.ZodNumber>;
    metadata: z.ZodOptional<z.ZodObject<{
        serialNumber: z.ZodOptional<z.ZodString>;
        hardwareRevision: z.ZodOptional<z.ZodString>;
        firmwareRevision: z.ZodOptional<z.ZodString>;
        softwareRevision: z.ZodOptional<z.ZodString>;
        rawAdvertisement: z.ZodOptional<z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        serialNumber?: string | undefined;
        hardwareRevision?: string | undefined;
        firmwareRevision?: string | undefined;
        softwareRevision?: string | undefined;
        rawAdvertisement?: any;
    }, {
        serialNumber?: string | undefined;
        hardwareRevision?: string | undefined;
        firmwareRevision?: string | undefined;
        softwareRevision?: string | undefined;
        rawAdvertisement?: any;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    deviceId: string;
    protocol: "ant_plus" | "bluetooth";
    type: "heart_rate" | "power" | "cadence" | "speed" | "trainer";
    isConnected: boolean;
    signalStrength: number;
    metadata?: {
        serialNumber?: string | undefined;
        hardwareRevision?: string | undefined;
        firmwareRevision?: string | undefined;
        softwareRevision?: string | undefined;
        rawAdvertisement?: any;
    } | undefined;
    category?: string | undefined;
    batteryLevel?: number | undefined;
    manufacturer?: string | undefined;
    model?: string | undefined;
    firmwareVersion?: string | undefined;
    displayName?: string | undefined;
    capabilities?: string[] | undefined;
    confidence?: number | undefined;
}, {
    name: string;
    deviceId: string;
    protocol: "ant_plus" | "bluetooth";
    type: "heart_rate" | "power" | "cadence" | "speed" | "trainer";
    isConnected: boolean;
    signalStrength: number;
    metadata?: {
        serialNumber?: string | undefined;
        hardwareRevision?: string | undefined;
        firmwareRevision?: string | undefined;
        softwareRevision?: string | undefined;
        rawAdvertisement?: any;
    } | undefined;
    category?: string | undefined;
    batteryLevel?: number | undefined;
    manufacturer?: string | undefined;
    model?: string | undefined;
    firmwareVersion?: string | undefined;
    displayName?: string | undefined;
    capabilities?: string[] | undefined;
    confidence?: number | undefined;
}>;
export declare const SensorReadingSchema: z.ZodObject<{
    deviceId: z.ZodString;
    sessionId: z.ZodString;
    timestamp: z.ZodUnion<[z.ZodString, z.ZodDate]>;
    metricType: z.ZodEnum<["heart_rate", "power", "cadence", "speed", "trainer"]>;
    value: z.ZodNumber;
    unit: z.ZodString;
    quality: z.ZodNumber;
    rawData: z.ZodOptional<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    timestamp: string | Date;
    deviceId: string;
    sessionId: string;
    metricType: "heart_rate" | "power" | "cadence" | "speed" | "trainer";
    value: number;
    unit: string;
    quality: number;
    rawData?: any;
}, {
    timestamp: string | Date;
    deviceId: string;
    sessionId: string;
    metricType: "heart_rate" | "power" | "cadence" | "speed" | "trainer";
    value: number;
    unit: string;
    quality: number;
    rawData?: any;
}>;
export declare const SessionStatusSchema: z.ZodEnum<["active", "completed", "paused"]>;
export declare const CreateSessionSchema: z.ZodObject<{
    name: z.ZodDefault<z.ZodString>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    notes?: string | null | undefined;
}, {
    name?: string | undefined;
    notes?: string | null | undefined;
}>;
export declare const UpdateSessionSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["active", "completed", "paused"]>>;
    notes: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    endTime: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    endTime?: string | Date | undefined;
    status?: "active" | "paused" | "completed" | undefined;
    notes?: string | null | undefined;
}, {
    name?: string | undefined;
    endTime?: string | Date | undefined;
    status?: "active" | "paused" | "completed" | undefined;
    notes?: string | null | undefined;
}>;
export declare const SessionQuerySchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    metricType: z.ZodOptional<z.ZodEnum<["heart_rate", "power", "cadence", "speed", "trainer"]>>;
    startTime: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
    endTime: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    startTime?: string | Date | undefined;
    endTime?: string | Date | undefined;
    metricType?: "heart_rate" | "power" | "cadence" | "speed" | "trainer" | undefined;
}, {
    limit?: number | undefined;
    startTime?: string | Date | undefined;
    endTime?: string | Date | undefined;
    metricType?: "heart_rate" | "power" | "cadence" | "speed" | "trainer" | undefined;
    offset?: number | undefined;
}>;
export declare const DeviceConnectionSchema: z.ZodObject<{
    deviceId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    deviceId: string;
}, {
    deviceId: string;
}>;
export declare const ApiSuccessResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<true>;
    data: z.ZodAny;
    message: z.ZodOptional<z.ZodString>;
    count: z.ZodOptional<z.ZodNumber>;
    pagination: z.ZodOptional<z.ZodObject<{
        limit: z.ZodNumber;
        offset: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        offset: number;
    }, {
        limit: number;
        offset: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    success: true;
    message?: string | undefined;
    data?: any;
    count?: number | undefined;
    pagination?: {
        limit: number;
        offset: number;
    } | undefined;
}, {
    success: true;
    message?: string | undefined;
    data?: any;
    count?: number | undefined;
    pagination?: {
        limit: number;
        offset: number;
    } | undefined;
}>;
export declare const ApiErrorResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<false>;
    error: z.ZodString;
    details: z.ZodOptional<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    error: string;
    success: false;
    details?: any;
}, {
    error: string;
    success: false;
    details?: any;
}>;
export declare const ApiResponseSchema: z.ZodUnion<[z.ZodObject<{
    success: z.ZodLiteral<true>;
    data: z.ZodAny;
    message: z.ZodOptional<z.ZodString>;
    count: z.ZodOptional<z.ZodNumber>;
    pagination: z.ZodOptional<z.ZodObject<{
        limit: z.ZodNumber;
        offset: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        offset: number;
    }, {
        limit: number;
        offset: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    success: true;
    message?: string | undefined;
    data?: any;
    count?: number | undefined;
    pagination?: {
        limit: number;
        offset: number;
    } | undefined;
}, {
    success: true;
    message?: string | undefined;
    data?: any;
    count?: number | undefined;
    pagination?: {
        limit: number;
        offset: number;
    } | undefined;
}>, z.ZodObject<{
    success: z.ZodLiteral<false>;
    error: z.ZodString;
    details: z.ZodOptional<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    error: string;
    success: false;
    details?: any;
}, {
    error: string;
    success: false;
    details?: any;
}>]>;
export type CreateSessionRequest = z.infer<typeof CreateSessionSchema>;
export type UpdateSessionRequest = z.infer<typeof UpdateSessionSchema>;
export type SessionQuery = z.infer<typeof SessionQuerySchema>;
export type SensorDevice = z.infer<typeof SensorDeviceSchema>;
export type SensorReading = z.infer<typeof SensorReadingSchema>;
export type ApiSuccessResponse = z.infer<typeof ApiSuccessResponseSchema>;
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
