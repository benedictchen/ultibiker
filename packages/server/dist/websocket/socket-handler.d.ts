import { Server as HTTPServer } from 'http';
import { UltiBikerSensorManager } from '../sensors/sensor-manager.js';
import { SessionManager } from '../services/session-manager.js';
export declare class SocketHandler {
    private io;
    private connectedClients;
    private sensorManager;
    private sessionManager;
    constructor(server: HTTPServer, sensorManager: UltiBikerSensorManager, sessionManager: SessionManager);
    private setupEventHandlers;
    private setupSensorManagerEvents;
    broadcastSensorData(sensorEvent: any): void;
    broadcastDeviceEvent(deviceEvent: any): void;
    broadcastSessionUpdate(sessionData: any): void;
    getConnectedClientCount(): number;
    getClientInfo(): Array<{
        id: string;
        connectedAt: Date;
        subscriptions: string[];
    }>;
    close(): void;
}
