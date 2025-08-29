export interface CrashLogEntry {
    timestamp: string;
    type: 'crash' | 'error' | 'warning';
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    stack?: string;
    context?: Record<string, any>;
    pid: number;
    memory: NodeJS.MemoryUsage;
    uptime: number;
    version: string;
    environment: string;
}
export interface SessionLogEntry {
    timestamp: string;
    sessionId?: string;
    event: string;
    data?: Record<string, any>;
    duration?: number;
}
export interface SensorLogEntry {
    timestamp: string;
    deviceId?: string;
    sensorType: string;
    event: string;
    data?: Record<string, any>;
    signalStrength?: number;
}
export declare class CrashLogger {
    private static instance;
    private isInitialized;
    private constructor();
    static getInstance(): CrashLogger;
    initialize(): void;
    private ensureLogDirectories;
    private setupProcessHandlers;
    logCrash(crashData: Partial<CrashLogEntry>): void;
    logError(errorData: Partial<CrashLogEntry>): void;
    logSession(sessionData: SessionLogEntry): void;
    logSensor(sensorData: SensorLogEntry): void;
    logPerformance(data: Record<string, any>): void;
    private generateTimestamp;
    private cleanupOldLogs;
    errorMiddleware(): (error: Error, req: any, res: any, next: any) => void;
    getCrashStats(): any;
}
export declare const crashLogger: CrashLogger;
