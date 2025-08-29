import * as Sentry from '@sentry/node';
export interface LogEntry {
    timestamp?: string;
    level: 'error' | 'warn' | 'info' | 'debug';
    message: string;
    context?: Record<string, any>;
    stack?: string;
    userId?: string;
    sessionId?: string;
    deviceId?: string;
}
export interface SensorLogEntry {
    timestamp?: string;
    deviceId: string;
    sensorType: string;
    event: string;
    data?: Record<string, any>;
    signalStrength?: number;
}
export interface SessionLogEntry {
    timestamp?: string;
    sessionId: string;
    event: string;
    data?: Record<string, any>;
    duration?: number;
}
declare class Logger {
    private static instance;
    private constructor();
    static getInstance(): Logger;
    private setupGlobalErrorHandling;
    logError(message: string, error?: Error | any, context?: Record<string, any>): void;
    logWarning(message: string, context?: Record<string, any>): void;
    logInfo(message: string, context?: Record<string, any>): void;
    logDebug(message: string, context?: Record<string, any>): void;
    logSensorEvent(entry: SensorLogEntry): void;
    logSessionEvent(entry: SessionLogEntry): void;
    logPerformance(data: {
        operation: string;
        duration: number;
        status?: string;
        context?: Record<string, any>;
    }): void;
    errorMiddleware(): (err: Error, req: any, res: any, next: any) => void;
    requestMiddleware(): (req: any, res: any, next: any) => void;
    getHealthStatus(): {
        status: string;
        timestamp: string;
        service: string;
        version: string;
        uptime: number;
        memory: NodeJS.MemoryUsage;
        environment: string;
    };
}
export declare const appLogger: Logger;
export { Sentry };
export declare const crashLogger: {
    initialize: () => void;
    logCrash: (data: any) => void;
    logPerformance: (data: any) => void;
    errorMiddleware: () => (err: Error, req: any, res: any, next: any) => void;
};
export default appLogger;
