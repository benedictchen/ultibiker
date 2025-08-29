import { Server as SocketIOServer } from 'socket.io';
export class SocketHandler {
    io;
    connectedClients = new Map();
    sensorManager;
    sessionManager;
    constructor(server, sensorManager, sessionManager) {
        this.io = new SocketIOServer(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        this.sensorManager = sensorManager;
        this.sessionManager = sessionManager;
        this.setupEventHandlers();
        this.setupSensorManagerEvents();
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`🔗 Client connected: ${socket.id}`);
            this.connectedClients.set(socket.id, {
                socket,
                connectedAt: new Date(),
                subscribedEvents: new Set()
            });
            // Handle client subscription to sensor data
            socket.on('subscribe-sensor-data', (callback) => {
                const client = this.connectedClients.get(socket.id);
                if (client) {
                    client.subscribedEvents.add('sensor-data');
                    console.log(`📊 Client ${socket.id} subscribed to sensor data`);
                    callback({ success: true, message: 'Subscribed to sensor data' });
                }
            });
            // Handle client subscription to device events
            socket.on('subscribe-device-events', (callback) => {
                const client = this.connectedClients.get(socket.id);
                if (client) {
                    client.subscribedEvents.add('device-events');
                    console.log(`📱 Client ${socket.id} subscribed to device events`);
                    callback({ success: true, message: 'Subscribed to device events' });
                }
            });
            // Handle client subscription to session events
            socket.on('subscribe-session-events', (callback) => {
                const client = this.connectedClients.get(socket.id);
                if (client) {
                    client.subscribedEvents.add('session-events');
                    console.log(`🏁 Client ${socket.id} subscribed to session events`);
                    callback({ success: true, message: 'Subscribed to session events' });
                }
            });
            // Handle client unsubscription
            socket.on('unsubscribe', (eventType, callback) => {
                const client = this.connectedClients.get(socket.id);
                if (client) {
                    client.subscribedEvents.delete(eventType);
                    console.log(`❌ Client ${socket.id} unsubscribed from ${eventType}`);
                    callback({ success: true, message: `Unsubscribed from ${eventType}` });
                }
            });
            // Handle device scanning requests
            socket.on('start-scanning', async (callback) => {
                try {
                    console.log(`🔍 Client ${socket.id} requested device scanning`);
                    await this.sensorManager.startScanning();
                    // Send current device list to the client
                    const discoveredDevices = this.sensorManager.getDiscoveredDevices();
                    const connectedDevices = this.sensorManager.getConnectedDevices();
                    socket.emit('device-list', {
                        discovered: discoveredDevices,
                        connected: connectedDevices
                    });
                    // Notify all clients about scan status
                    this.io.emit('scan-status', { scanning: true });
                    if (callback)
                        callback({ success: true, message: 'Scanning started' });
                }
                catch (error) {
                    console.error(`❌ Scanning failed for client ${socket.id}:`, error);
                    if (callback)
                        callback({ success: false, error: error.message });
                }
            });
            socket.on('stop-scanning', (callback) => {
                try {
                    console.log(`⏹️  Client ${socket.id} stopped device scanning`);
                    this.sensorManager.stopScanning();
                    // Notify all clients about scan status
                    this.io.emit('scan-status', { scanning: false });
                    if (callback)
                        callback({ success: true, message: 'Scanning stopped' });
                }
                catch (error) {
                    console.error(`❌ Stop scanning failed for client ${socket.id}:`, error);
                    if (callback)
                        callback({ success: false, error: error.message });
                }
            });
            // Handle device connection requests
            socket.on('connect-device', async (deviceId, callback) => {
                try {
                    console.log(`🔗 Client ${socket.id} requested connection to ${deviceId}`);
                    const success = await this.sensorManager.connectDevice(deviceId);
                    if (success) {
                        callback({ success: true, message: `Connected to ${deviceId}` });
                    }
                    else {
                        callback({ success: false, error: `Failed to connect to ${deviceId}` });
                    }
                }
                catch (error) {
                    console.error(`❌ Connection failed for client ${socket.id}:`, error);
                    callback({ success: false, error: error.message });
                }
            });
            socket.on('disconnect-device', async (deviceId, callback) => {
                try {
                    console.log(`🔌 Client ${socket.id} requested disconnection from ${deviceId}`);
                    const success = await this.sensorManager.disconnectDevice(deviceId);
                    if (success) {
                        callback({ success: true, message: `Disconnected from ${deviceId}` });
                    }
                    else {
                        callback({ success: false, error: `Failed to disconnect from ${deviceId}` });
                    }
                }
                catch (error) {
                    console.error(`❌ Disconnection failed for client ${socket.id}:`, error);
                    callback({ success: false, error: error.message });
                }
            });
            // Handle session management requests
            socket.on('start-session', async (data, callback) => {
                try {
                    const sessionName = data?.name || 'Untitled';
                    console.log(`🚴 Client ${socket.id} starting session: ${sessionName}`);
                    const sessionId = await this.sessionManager.startSession(sessionName);
                    if (callback)
                        callback({ success: true, sessionId, message: 'Session started' });
                    // Broadcast session start to all clients
                    socket.broadcast.emit('session-started', {
                        sessionId,
                        sessionName
                    });
                    // Send to the requesting client as well
                    socket.emit('session-started', {
                        sessionId,
                        sessionName
                    });
                }
                catch (error) {
                    console.error(`❌ Session start failed for client ${socket.id}:`, error);
                    if (callback)
                        callback({ success: false, error: error.message });
                }
            });
            socket.on('stop-session', async (data, callback) => {
                try {
                    const sessionId = data?.sessionId;
                    if (!sessionId) {
                        throw new Error('Session ID is required');
                    }
                    console.log(`🏁 Client ${socket.id} stopping session: ${sessionId}`);
                    await this.sessionManager.endSession(sessionId);
                    if (callback)
                        callback({ success: true, message: 'Session stopped' });
                    // Broadcast session stop to all clients
                    socket.broadcast.emit('session-stopped', { sessionId });
                    socket.emit('session-stopped', { sessionId });
                }
                catch (error) {
                    console.error(`❌ Session stop failed for client ${socket.id}:`, error);
                    if (callback)
                        callback({ success: false, error: error.message });
                }
            });
            // Handle requests for current status
            socket.on('get-status', async (callback) => {
                try {
                    const connectedDevices = this.sensorManager.getConnectedDevices();
                    const discoveredDevices = this.sensorManager.getDiscoveredDevices();
                    const activeSession = await this.sessionManager.getActiveSession();
                    // Send initial device list
                    socket.emit('device-list', {
                        discovered: discoveredDevices,
                        connected: connectedDevices
                    });
                    if (callback) {
                        callback({
                            success: true,
                            status: {
                                connectedDevices: connectedDevices.length,
                                discoveredDevices: discoveredDevices.length,
                                activeSession: activeSession?.id || null,
                                clients: this.connectedClients.size,
                                isScanning: this.sensorManager.isScanning || false
                            }
                        });
                    }
                }
                catch (error) {
                    console.error(`❌ Status request failed for client ${socket.id}:`, error);
                    if (callback)
                        callback({ success: false, error: error.message });
                }
            });
            // Handle disconnection
            socket.on('disconnect', (reason) => {
                console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
                this.connectedClients.delete(socket.id);
            });
        });
    }
    setupSensorManagerEvents() {
        // Forward sensor manager events to subscribed clients
        this.sensorManager.on('scan-result', (event) => {
            this.broadcastDeviceEvent(event);
        });
        this.sensorManager.on('device-status', (event) => {
            this.broadcastDeviceEvent(event);
        });
        this.sensorManager.on('sensor-data', (event) => {
            this.broadcastSensorData(event);
        });
    }
    // Method to broadcast sensor data to subscribed clients
    broadcastSensorData(sensorEvent) {
        // Format sensor event for frontend compatibility
        const formattedEvent = {
            deviceId: sensorEvent.data.deviceId,
            metricType: sensorEvent.data.metricType,
            value: sensorEvent.data.value,
            unit: sensorEvent.data.unit || '',
            timestamp: sensorEvent.data.timestamp || new Date().toISOString(),
            rawData: sensorEvent.data.rawData
        };
        for (const [clientId, client] of this.connectedClients) {
            if (client.subscribedEvents.has('sensor-data')) {
                client.socket.emit('sensor-data', formattedEvent);
            }
        }
    }
    // Method to broadcast device events to subscribed clients
    broadcastDeviceEvent(deviceEvent) {
        for (const [clientId, client] of this.connectedClients) {
            if (client.subscribedEvents.has('device-events')) {
                client.socket.emit('device-event', deviceEvent);
            }
        }
    }
    // Method to broadcast session updates
    broadcastSessionUpdate(sessionData) {
        for (const [clientId, client] of this.connectedClients) {
            if (client.subscribedEvents.has('session-events')) {
                client.socket.emit('session-update', sessionData);
            }
        }
    }
    // Get connected client count
    getConnectedClientCount() {
        return this.connectedClients.size;
    }
    // Get client subscription info
    getClientInfo() {
        return Array.from(this.connectedClients.entries()).map(([id, client]) => ({
            id,
            connectedAt: client.connectedAt,
            subscriptions: Array.from(client.subscribedEvents)
        }));
    }
    // Cleanup method
    close() {
        console.log('🔒 Closing WebSocket server...');
        this.io.close();
    }
}
//# sourceMappingURL=socket-handler.js.map