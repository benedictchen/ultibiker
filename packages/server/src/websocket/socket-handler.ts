import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { UltiBikerSensorManager } from '../sensors/sensor-manager.js';
import { SessionManager } from '../services/session-manager.js';

interface ClientInfo {
  socket: any;
  connectedAt: Date;
  subscribedEvents: Set<string>;
  lastHeartbeat: Date;
  reconnectAttempts: number;
  isHealthy: boolean;
}

export class SocketHandler {
  private io: SocketIOServer;
  private connectedClients = new Map<string, ClientInfo>();
  private sensorManager: UltiBikerSensorManager;
  private sessionManager: SessionManager;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionMonitorInterval: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor(
    server: HTTPServer,
    sensorManager: UltiBikerSensorManager,
    sessionManager: SessionManager
  ) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      },
      // Enhanced connection options for better reliability
      pingTimeout: 60000,        // 60 seconds before disconnecting
      pingInterval: 25000,       // 25 seconds between pings
      upgradeTimeout: 30000,     // 30 seconds for transport upgrades
      maxHttpBufferSize: 1e6,    // 1MB max message size
      transports: ['websocket', 'polling'], // Allow both transports
      allowEIO3: false,          // Force Engine.IO v4
      // Connection error handling
      connectTimeout: 45000      // 45 seconds connection timeout
    });

    this.sensorManager = sensorManager;
    this.sessionManager = sessionManager;

    this.setupEventHandlers();
    this.setupSensorManagerEvents();
    this.startConnectionMonitoring();
    this.setupGlobalErrorHandling();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`🔗 Client connected: ${socket.id}`);
      
      this.connectedClients.set(socket.id, {
        socket,
        connectedAt: new Date(),
        subscribedEvents: new Set(),
        lastHeartbeat: new Date(),
        reconnectAttempts: 0,
        isHealthy: true
      });

      // Add heartbeat handler to track client health
      socket.on('heartbeat', () => {
        const client = this.connectedClients.get(socket.id);
        if (client) {
          client.lastHeartbeat = new Date();
          client.isHealthy = true;
          socket.emit('heartbeat-ack');
        }
      });

      // Add error handlers
      socket.on('error', (error) => {
        console.error(`❌ WebSocket error for client ${socket.id}:`, error);
        this.handleSocketError(socket, error);
      });

      socket.on('connect_error', (error) => {
        console.error(`❌ WebSocket connection error for client ${socket.id}:`, error);
        this.handleConnectionError(socket, error);
      });

      // Handle client subscription to sensor data
      socket.on('subscribe-sensor-data', (callback) => {
        try {
          const client = this.connectedClients.get(socket.id);
          if (client) {
            client.subscribedEvents.add('sensor-data');
            console.log(`📊 Client ${socket.id} subscribed to sensor data`);
            this.safeCallback(callback, { success: true, message: 'Subscribed to sensor data' });
          } else {
            this.safeCallback(callback, { success: false, error: 'Client not found' });
          }
        } catch (error: any) {
          console.error(`❌ Error subscribing client ${socket.id} to sensor data:`, error);
          this.safeCallback(callback, { success: false, error: error.message });
        }
      });

      // Handle client subscription to device events
      socket.on('subscribe-device-events', (callback) => {
        try {
          const client = this.connectedClients.get(socket.id);
          if (client) {
            client.subscribedEvents.add('device-events');
            console.log(`📱 Client ${socket.id} subscribed to device events`);
            this.safeCallback(callback, { success: true, message: 'Subscribed to device events' });
          } else {
            this.safeCallback(callback, { success: false, error: 'Client not found' });
          }
        } catch (error: any) {
          console.error(`❌ Error subscribing client ${socket.id} to device events:`, error);
          this.safeCallback(callback, { success: false, error: error.message });
        }
      });

      // Handle client subscription to session events
      socket.on('subscribe-session-events', (callback) => {
        try {
          const client = this.connectedClients.get(socket.id);
          if (client) {
            client.subscribedEvents.add('session-events');
            console.log(`🏁 Client ${socket.id} subscribed to session events`);
            this.safeCallback(callback, { success: true, message: 'Subscribed to session events' });
          } else {
            this.safeCallback(callback, { success: false, error: 'Client not found' });
          }
        } catch (error: any) {
          console.error(`❌ Error subscribing client ${socket.id} to session events:`, error);
          this.safeCallback(callback, { success: false, error: error.message });
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
          
          if (callback) callback({ success: true, message: 'Scanning started' });
        } catch (error: any) {
          console.error(`❌ Scanning failed for client ${socket.id}:`, error);
          if (callback) callback({ success: false, error: error.message });
        }
      });

      socket.on('stop-scanning', (callback) => {
        try {
          console.log(`⏹️  Client ${socket.id} stopped device scanning`);
          this.sensorManager.stopScanning();
          
          // Notify all clients about scan status
          this.io.emit('scan-status', { scanning: false });
          
          if (callback) callback({ success: true, message: 'Scanning stopped' });
        } catch (error: any) {
          console.error(`❌ Stop scanning failed for client ${socket.id}:`, error);
          if (callback) callback({ success: false, error: error.message });
        }
      });

      // Handle device connection requests
      socket.on('connect-device', async (deviceId, callback) => {
        try {
          console.log(`🔗 Client ${socket.id} requested connection to ${deviceId}`);
          const success = await this.sensorManager.connectDevice(deviceId);
          
          if (success) {
            callback({ success: true, message: `Connected to ${deviceId}` });
          } else {
            callback({ success: false, error: `Failed to connect to ${deviceId}` });
          }
        } catch (error: any) {
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
          } else {
            callback({ success: false, error: `Failed to disconnect from ${deviceId}` });
          }
        } catch (error: any) {
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
          
          if (callback) callback({ success: true, sessionId, message: 'Session started' });
          
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
          
        } catch (error: any) {
          console.error(`❌ Session start failed for client ${socket.id}:`, error);
          if (callback) callback({ success: false, error: error.message });
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
          
          if (callback) callback({ success: true, message: 'Session stopped' });
          
          // Broadcast session stop to all clients
          socket.broadcast.emit('session-stopped', { sessionId });
          socket.emit('session-stopped', { sessionId });
          
        } catch (error: any) {
          console.error(`❌ Session stop failed for client ${socket.id}:`, error);
          if (callback) callback({ success: false, error: error.message });
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
                isScanning: (this.sensorManager as any).isScanning || false
              }
            });
          }
        } catch (error: any) {
          console.error(`❌ Status request failed for client ${socket.id}:`, error);
          if (callback) callback({ success: false, error: error.message });
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
        this.connectedClients.delete(socket.id);
      });
    });
  }

  private setupSensorManagerEvents(): void {
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

    // Handle intelligent notifications from notification manager
    this.sensorManager.on('intelligent-notification', (notification) => {
      this.broadcastIntelligentNotification(notification);
    });
  }


  // Method to broadcast intelligent notifications
  broadcastIntelligentNotification(notification: any): void {
    for (const [clientId, client] of this.connectedClients) {
      if (client.subscribedEvents.has('device-events')) {
        client.socket.emit('intelligent-notification', notification);
      }
    }
  }

  // Method to broadcast session updates
  broadcastSessionUpdate(sessionData: any): void {
    for (const [clientId, client] of this.connectedClients) {
      if (client.subscribedEvents.has('session-events')) {
        client.socket.emit('session-update', sessionData);
      }
    }
  }

  // Get connected client count
  getConnectedClientCount(): number {
    return this.connectedClients.size;
  }

  // Get client subscription info
  getClientInfo(): Array<{ id: string; connectedAt: Date; subscriptions: string[] }> {
    return Array.from(this.connectedClients.entries()).map(([id, client]) => ({
      id,
      connectedAt: client.connectedAt,
      subscriptions: Array.from(client.subscribedEvents)
    }));
  }

  /**
   * Enhanced error handling methods
   */
  
  private setupGlobalErrorHandling(): void {
    // Handle global socket.io errors
    this.io.engine.on('connection_error', (err) => {
      console.error('❌ Socket.IO connection error:', err);
    });

    // Handle server errors
    this.io.on('error', (error) => {
      console.error('❌ Socket.IO server error:', error);
    });
  }

  private handleSocketError(socket: any, error: Error): void {
    const client = this.connectedClients.get(socket.id);
    if (client) {
      client.isHealthy = false;
      
      // Emit error to client if connection is still alive
      try {
        socket.emit('error-notification', {
          type: 'socket_error',
          message: 'WebSocket connection error occurred',
          timestamp: new Date().toISOString(),
          canReconnect: true
        });
      } catch (emitError) {
        console.error('❌ Failed to emit error notification:', emitError);
      }
    }
  }

  private handleConnectionError(socket: any, error: Error): void {
    const client = this.connectedClients.get(socket.id);
    if (client) {
      client.reconnectAttempts += 1;
      client.isHealthy = false;
      
      console.warn(`⚠️ Client ${socket.id} connection error (attempt ${client.reconnectAttempts}):`, error.message);
      
      // If too many reconnection attempts, clean up
      if (client.reconnectAttempts > 5) {
        console.log(`🚫 Client ${socket.id} exceeded reconnection attempts, removing`);
        this.connectedClients.delete(socket.id);
      }
    }
  }

  private safeCallback(callback: Function | undefined, data: any): void {
    if (callback && typeof callback === 'function') {
      try {
        callback(data);
      } catch (error) {
        console.error('❌ Error executing callback:', error);
      }
    }
  }

  private safeBroadcast(event: string, data: any): void {
    try {
      if (!this.isShuttingDown) {
        this.io.emit(event, data);
      }
    } catch (error) {
      console.error(`❌ Error broadcasting ${event}:`, error);
    }
  }

  private safeEmitToClient(clientId: string, event: string, data: any): boolean {
    try {
      const client = this.connectedClients.get(clientId);
      if (client && client.isHealthy) {
        client.socket.emit(event, data);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Error emitting ${event} to client ${clientId}:`, error);
      // Mark client as unhealthy
      const client = this.connectedClients.get(clientId);
      if (client) {
        client.isHealthy = false;
      }
      return false;
    }
  }

  /**
   * Connection monitoring and health checks
   */
  
  private startConnectionMonitoring(): void {
    // Monitor client connections every 30 seconds
    this.connectionMonitorInterval = setInterval(() => {
      if (this.isShuttingDown) return;
      
      this.checkClientHealth();
      this.cleanupStaleConnections();
    }, 30000);

    console.log('🔍 Started WebSocket connection monitoring');
  }

  private checkClientHealth(): void {
    const now = new Date();
    let healthyClients = 0;
    let unhealthyClients = 0;

    for (const [clientId, client] of this.connectedClients) {
      const timeSinceLastHeartbeat = now.getTime() - client.lastHeartbeat.getTime();
      
      // Consider client unhealthy if no heartbeat for 2 minutes
      if (timeSinceLastHeartbeat > 120000) {
        client.isHealthy = false;
        unhealthyClients++;
        
        // Try to ping the client
        try {
          client.socket.emit('health-check', { timestamp: now.toISOString() });
        } catch (error) {
          console.warn(`⚠️ Failed to send health check to client ${clientId}`);
        }
      } else {
        healthyClients++;
      }
    }

    if (unhealthyClients > 0) {
      console.log(`🔍 Connection health: ${healthyClients} healthy, ${unhealthyClients} unhealthy clients`);
    }
  }

  private cleanupStaleConnections(): void {
    const now = new Date();
    const staleClients: string[] = [];

    for (const [clientId, client] of this.connectedClients) {
      const timeSinceLastHeartbeat = now.getTime() - client.lastHeartbeat.getTime();
      
      // Remove clients that haven't responded for 5 minutes
      if (timeSinceLastHeartbeat > 300000) {
        staleClients.push(clientId);
      }
    }

    for (const clientId of staleClients) {
      console.log(`🧹 Cleaning up stale client connection: ${clientId}`);
      const client = this.connectedClients.get(clientId);
      if (client) {
        try {
          client.socket.disconnect(true);
        } catch (error) {
          console.warn(`⚠️ Error disconnecting stale client ${clientId}:`, error);
        }
      }
      this.connectedClients.delete(clientId);
    }

    if (staleClients.length > 0) {
      console.log(`🧹 Cleaned up ${staleClients.length} stale connections`);
    }
  }

  /**
   * Enhanced broadcast methods with error handling
   */
  
  broadcastSensorData(sensorEvent: any): void {
    if (this.isShuttingDown) return;

    const formattedEvent = {
      deviceId: sensorEvent.data.deviceId,
      metricType: sensorEvent.data.metricType,
      value: sensorEvent.data.value,
      unit: sensorEvent.data.unit || '',
      timestamp: sensorEvent.data.timestamp || new Date().toISOString(),
      rawData: sensorEvent.data.rawData
    };

    let successfulBroadcasts = 0;
    let failedBroadcasts = 0;

    for (const [clientId, client] of this.connectedClients) {
      if (client.subscribedEvents.has('sensor-data')) {
        const success = this.safeEmitToClient(clientId, 'sensor-data', formattedEvent);
        if (success) {
          successfulBroadcasts++;
        } else {
          failedBroadcasts++;
        }
      }
    }

    if (failedBroadcasts > 0) {
      console.warn(`⚠️ Sensor data broadcast: ${successfulBroadcasts} successful, ${failedBroadcasts} failed`);
    }
  }

  broadcastDeviceEvent(deviceEvent: any): void {
    if (this.isShuttingDown) return;

    let successfulBroadcasts = 0;
    let failedBroadcasts = 0;

    for (const [clientId, client] of this.connectedClients) {
      if (client.subscribedEvents.has('device-events')) {
        const success = this.safeEmitToClient(clientId, 'device-event', deviceEvent);
        if (success) {
          successfulBroadcasts++;
        } else {
          failedBroadcasts++;
        }
      }
    }

    if (failedBroadcasts > 0) {
      console.warn(`⚠️ Device event broadcast: ${successfulBroadcasts} successful, ${failedBroadcasts} failed`);
    }
  }

  // Cleanup method with proper shutdown handling
  close(): void {
    console.log('🔒 Closing WebSocket server...');
    this.isShuttingDown = true;

    // Clear monitoring intervals
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
      this.connectionMonitorInterval = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Notify all clients of shutdown
    this.safeBroadcast('server-shutdown', {
      message: 'Server is shutting down',
      timestamp: new Date().toISOString()
    });

    // Wait a bit for messages to be sent, then close
    setTimeout(() => {
      this.io.close(() => {
        console.log('✅ WebSocket server closed');
      });
    }, 1000);
  }
}