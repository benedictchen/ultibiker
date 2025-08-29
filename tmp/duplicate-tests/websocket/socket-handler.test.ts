import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';

// Mock WebSocket handler (to be implemented)
export class SocketHandler {
  private io: SocketIOServer;
  private connectedClients = new Map<string, any>();

  constructor(server: any) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);
      
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
          callback({ success: true, message: 'Subscribed to sensor data' });
        }
      });

      // Handle client subscription to device events
      socket.on('subscribe-device-events', (callback) => {
        const client = this.connectedClients.get(socket.id);
        if (client) {
          client.subscribedEvents.add('device-events');
          callback({ success: true, message: 'Subscribed to device events' });
        }
      });

      // Handle client unsubscription
      socket.on('unsubscribe', (eventType, callback) => {
        const client = this.connectedClients.get(socket.id);
        if (client) {
          client.subscribedEvents.delete(eventType);
          callback({ success: true, message: `Unsubscribed from ${eventType}` });
        }
      });

      // Handle device scanning requests
      socket.on('start-scanning', async (callback) => {
        try {
          // This would trigger the sensor manager to start scanning
          callback({ success: true, message: 'Scanning started' });
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      });

      // Handle device connection requests
      socket.on('connect-device', async (deviceId, callback) => {
        try {
          // This would trigger the sensor manager to connect to device
          callback({ success: true, message: `Connecting to ${deviceId}` });
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
        this.connectedClients.delete(socket.id);
      });
    });
  }

  // Method to broadcast sensor data to subscribed clients
  broadcastSensorData(sensorData: any): void {
    for (const [clientId, client] of this.connectedClients) {
      if (client.subscribedEvents.has('sensor-data')) {
        client.socket.emit('sensor-data', sensorData);
      }
    }
  }

  // Method to broadcast device events to subscribed clients
  broadcastDeviceEvent(deviceEvent: any): void {
    for (const [clientId, client] of this.connectedClients) {
      if (client.subscribedEvents.has('device-events')) {
        client.socket.emit('device-event', deviceEvent);
      }
    }
  }

  // Method to broadcast session updates
  broadcastSessionUpdate(sessionData: any): void {
    this.io.emit('session-update', sessionData);
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

  // Cleanup method
  close(): void {
    this.io.close();
  }
}

describe('SocketHandler', () => {
  let httpServer: any;
  let socketHandler: SocketHandler;
  let clientSocket: ClientSocket;
  let serverAddress: string;

  beforeEach(async () => {
    return new Promise<void>((resolve) => {
      httpServer = createServer();
      socketHandler = new SocketHandler(httpServer);
      
      httpServer.listen(() => {
        const port = httpServer.address()?.port;
        serverAddress = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (clientSocket) {
      clientSocket.close();
    }
    socketHandler.close();
    httpServer.close();
  });

  describe('Client Connection', () => {
    it('should accept client connections', async () => {
      return new Promise<void>((resolve) => {
        clientSocket = Client(serverAddress);
        
        clientSocket.on('connect', () => {
          expect(clientSocket.connected).toBe(true);
          expect(socketHandler.getConnectedClientCount()).toBe(1);
          resolve();
        });
      });
    });

    it('should track multiple client connections', async () => {
      return new Promise<void>((resolve) => {
        let connectCount = 0;
        
        const client1 = Client(serverAddress);
        const client2 = Client(serverAddress);
        
        const onConnect = () => {
          connectCount++;
          if (connectCount === 2) {
            expect(socketHandler.getConnectedClientCount()).toBe(2);
            client1.close();
            client2.close();
            resolve();
          }
        };
        
        client1.on('connect', onConnect);
        client2.on('connect', onConnect);
      });
    });

    it('should handle client disconnections', async () => {
      return new Promise<void>((resolve) => {
        clientSocket = Client(serverAddress);
        
        clientSocket.on('connect', () => {
          expect(socketHandler.getConnectedClientCount()).toBe(1);
          
          clientSocket.on('disconnect', () => {
            // Give a moment for cleanup
            setTimeout(() => {
              expect(socketHandler.getConnectedClientCount()).toBe(0);
              resolve();
            }, 10);
          });
          
          clientSocket.close();
        });
      });
    });
  });

  describe('Event Subscriptions', () => {
    beforeEach(async () => {
      return new Promise<void>((resolve) => {
        clientSocket = Client(serverAddress);
        clientSocket.on('connect', () => resolve());
      });
    });

    it('should handle sensor data subscription', async () => {
      return new Promise<void>((resolve) => {
        clientSocket.emit('subscribe-sensor-data', (response: any) => {
          expect(response.success).toBe(true);
          expect(response.message).toBe('Subscribed to sensor data');
          
          const clientInfo = socketHandler.getClientInfo();
          expect(clientInfo[0].subscriptions).toContain('sensor-data');
          resolve();
        });
      });
    });

    it('should handle device events subscription', async () => {
      return new Promise<void>((resolve) => {
        clientSocket.emit('subscribe-device-events', (response: any) => {
          expect(response.success).toBe(true);
          expect(response.message).toBe('Subscribed to device events');
          
          const clientInfo = socketHandler.getClientInfo();
          expect(clientInfo[0].subscriptions).toContain('device-events');
          resolve();
        });
      });
    });

    it('should handle unsubscription', async () => {
      return new Promise<void>((resolve) => {
        // First subscribe
        clientSocket.emit('subscribe-sensor-data', () => {
          // Then unsubscribe
          clientSocket.emit('unsubscribe', 'sensor-data', (response: any) => {
            expect(response.success).toBe(true);
            expect(response.message).toBe('Unsubscribed from sensor-data');
            
            const clientInfo = socketHandler.getClientInfo();
            expect(clientInfo[0].subscriptions).not.toContain('sensor-data');
            resolve();
          });
        });
      });
    });

    it('should handle multiple subscriptions', async () => {
      return new Promise<void>((resolve) => {
        let subscriptionCount = 0;
        
        const checkComplete = () => {
          subscriptionCount++;
          if (subscriptionCount === 2) {
            const clientInfo = socketHandler.getClientInfo();
            expect(clientInfo[0].subscriptions).toContain('sensor-data');
            expect(clientInfo[0].subscriptions).toContain('device-events');
            resolve();
          }
        };
        
        clientSocket.emit('subscribe-sensor-data', checkComplete);
        clientSocket.emit('subscribe-device-events', checkComplete);
      });
    });
  });

  describe('Device Control', () => {
    beforeEach(async () => {
      return new Promise<void>((resolve) => {
        clientSocket = Client(serverAddress);
        clientSocket.on('connect', () => resolve());
      });
    });

    it('should handle scanning requests', async () => {
      return new Promise<void>((resolve) => {
        clientSocket.emit('start-scanning', (response: any) => {
          expect(response.success).toBe(true);
          expect(response.message).toBe('Scanning started');
          resolve();
        });
      });
    });

    it('should handle device connection requests', async () => {
      return new Promise<void>((resolve) => {
        const deviceId = 'test-device-123';
        
        clientSocket.emit('connect-device', deviceId, (response: any) => {
          expect(response.success).toBe(true);
          expect(response.message).toBe(`Connecting to ${deviceId}`);
          resolve();
        });
      });
    });
  });

  describe('Data Broadcasting', () => {
    beforeEach(async () => {
      return new Promise<void>((resolve) => {
        clientSocket = Client(serverAddress);
        clientSocket.on('connect', () => {
          // Subscribe to sensor data
          clientSocket.emit('subscribe-sensor-data', () => resolve());
        });
      });
    });

    it('should broadcast sensor data to subscribed clients', async () => {
      return new Promise<void>((resolve) => {
        const testSensorData = {
          deviceId: 'hr-monitor-001',
          metricType: 'heart_rate',
          value: 165,
          unit: 'bpm',
          timestamp: new Date().toISOString()
        };

        clientSocket.on('sensor-data', (data: any) => {
          expect(data).toEqual(testSensorData);
          resolve();
        });

        // Broadcast sensor data
        socketHandler.broadcastSensorData(testSensorData);
      });
    });

    it('should not broadcast sensor data to unsubscribed clients', async () => {
      return new Promise<void>((resolve) => {
        const testSensorData = {
          deviceId: 'hr-monitor-001',
          metricType: 'heart_rate',
          value: 165,
          unit: 'bpm'
        };

        // Unsubscribe first
        clientSocket.emit('unsubscribe', 'sensor-data', () => {
          let dataReceived = false;
          
          clientSocket.on('sensor-data', () => {
            dataReceived = true;
          });

          // Broadcast sensor data
          socketHandler.broadcastSensorData(testSensorData);

          // Wait a bit and check if data was received
          setTimeout(() => {
            expect(dataReceived).toBe(false);
            resolve();
          }, 100);
        });
      });
    });

    it('should broadcast device events to subscribed clients', async () => {
      return new Promise<void>((resolve) => {
        // Subscribe to device events
        clientSocket.emit('subscribe-device-events', () => {
          const testDeviceEvent = {
            type: 'device-connected',
            deviceId: 'power-meter-001',
            device: {
              name: 'Test Power Meter',
              type: 'power',
              protocol: 'ant_plus'
            }
          };

          clientSocket.on('device-event', (event: any) => {
            expect(event).toEqual(testDeviceEvent);
            resolve();
          });

          // Broadcast device event
          socketHandler.broadcastDeviceEvent(testDeviceEvent);
        });
      });
    });

    it('should broadcast session updates to all clients', async () => {
      return new Promise<void>((resolve) => {
        const testSessionData = {
          sessionId: 'session-123',
          status: 'active',
          duration: 1800,
          avgHeartRate: 155,
          avgPower: 240
        };

        clientSocket.on('session-update', (data: any) => {
          expect(data).toEqual(testSessionData);
          resolve();
        });

        // Broadcast session update
        socketHandler.broadcastSessionUpdate(testSessionData);
      });
    });
  });

  describe('Multiple Clients', () => {
    let client1: ClientSocket;
    let client2: ClientSocket;

    beforeEach(async () => {
      return new Promise<void>((resolve) => {
        let connectCount = 0;
        
        const onConnect = () => {
          connectCount++;
          if (connectCount === 2) resolve();
        };

        client1 = Client(serverAddress);
        client2 = Client(serverAddress);
        
        client1.on('connect', onConnect);
        client2.on('connect', onConnect);
      });
    });

    afterEach(() => {
      if (client1) client1.close();
      if (client2) client2.close();
    });

    it('should broadcast to multiple subscribed clients', async () => {
      return new Promise<void>((resolve) => {
        let receivedCount = 0;
        const testData = { value: 175, unit: 'bpm' };
        
        const onDataReceived = (data: any) => {
          expect(data).toEqual(testData);
          receivedCount++;
          if (receivedCount === 2) resolve();
        };

        // Subscribe both clients
        client1.emit('subscribe-sensor-data', () => {
          client2.emit('subscribe-sensor-data', () => {
            client1.on('sensor-data', onDataReceived);
            client2.on('sensor-data', onDataReceived);
            
            // Broadcast to both
            socketHandler.broadcastSensorData(testData);
          });
        });
      });
    });

    it('should only broadcast to subscribed clients', async () => {
      return new Promise<void>((resolve) => {
        let client1Received = false;
        let client2Received = false;
        const testData = { value: 180, unit: 'bpm' };

        // Only subscribe client1
        client1.emit('subscribe-sensor-data', () => {
          client1.on('sensor-data', () => {
            client1Received = true;
          });

          client2.on('sensor-data', () => {
            client2Received = true;
          });

          socketHandler.broadcastSensorData(testData);

          setTimeout(() => {
            expect(client1Received).toBe(true);
            expect(client2Received).toBe(false);
            resolve();
          }, 100);
        });
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      return new Promise<void>((resolve) => {
        clientSocket = Client(serverAddress);
        clientSocket.on('connect', () => resolve());
      });
    });

    it('should handle errors in device operations gracefully', async () => {
      // Mock an error scenario
      const originalEmit = clientSocket.emit;
      
      return new Promise<void>((resolve) => {
        clientSocket.emit('connect-device', 'invalid-device', (response: any) => {
          // In real implementation, this might return an error
          // For now, we just check the response structure
          expect(response).toHaveProperty('success');
          resolve();
        });
      });
    });
  });

  describe('Client Information', () => {
    beforeEach(async () => {
      return new Promise<void>((resolve) => {
        clientSocket = Client(serverAddress);
        clientSocket.on('connect', () => resolve());
      });
    });

    it('should provide accurate client information', async () => {
      return new Promise<void>((resolve) => {
        clientSocket.emit('subscribe-sensor-data', () => {
          clientSocket.emit('subscribe-device-events', () => {
            const clientInfo = socketHandler.getClientInfo();
            
            expect(clientInfo).toHaveLength(1);
            expect(clientInfo[0]).toMatchObject({
              id: expect.any(String),
              connectedAt: expect.any(Date),
              subscriptions: expect.arrayContaining(['sensor-data', 'device-events'])
            });
            resolve();
          });
        });
      });
    });
  });
});