import { Session, SensorData } from '../database/schema.js';
import { SensorReading } from '../types/sensor.js';
export declare class SessionManager {
    private currentSessionId;
    startSession(name?: string): Promise<string>;
    endSession(sessionId: string): Promise<void>;
    pauseSession(sessionId: string): Promise<void>;
    resumeSession(sessionId: string): Promise<void>;
    getCurrentSessionId(): string | null;
    getActiveSession(): Promise<Session | null>;
    getSessionData(sessionId: string): Promise<Session | null>;
    addSensorReading(reading: SensorReading): Promise<void>;
    getSessionSensorData(sessionId: string): Promise<SensorData[]>;
    private calculateSessionMetrics;
    getAllSessions(): Promise<Session[]>;
    deleteSession(sessionId: string): Promise<boolean>;
}
