import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import { initializeDatabase, closeDatabase } from './database/db.js';
import { UltiBikerSensorManager } from './sensors/sensor-manager.js';
import { SessionManager } from './services/session-manager.js';
import { SocketHandler } from './websocket/socket-handler.js';
import { SensorEvent, SensorReading, DeviceStatusEvent, ScanResultEvent } from './types/sensor.js';
import { createDeviceRoutes } from './api/devices.js';
import { createSessionRoutes } from './api/sessions.js';
import { createDataRoutes } from './api/data.js';
import { createPermissionRoutes } from './api/permissions.js';
import { crashLogger } from './services/crash-logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UltiBikerServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private sensorManager: UltiBikerSensorManager;
  private sessionManager: SessionManager;
  private socketHandler: SocketHandler;
  private port: number;

  constructor() {
    this.port = parseInt(process.env.PORT || '3000');
    this.app = express();
    this.server = createServer(this.app);

    // Initialize crash detection system first
    crashLogger.initialize();

    this.sessionManager = new SessionManager();
    this.sensorManager = new UltiBikerSensorManager(this.sessionManager);
    this.socketHandler = new SocketHandler(this.server, this.sensorManager, this.sessionManager);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSensorDataIntegration();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false // Allow inline scripts for development
    }));

    // CORS middleware
    this.app.use(cors());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP'
    });
    this.app.use('/api/', limiter);

    // Body parsing middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Serve static files (web UI)
    this.app.use(express.static(path.join(__dirname, '../public')));

    // Request logging with crash logging integration
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      
      // Log performance metrics for slow requests
      const startTime = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        if (duration > 5000) { // Log requests slower than 5 seconds
          crashLogger.logPerformance({
            type: 'slow_request',
            method: req.method,
            path: req.path,
            duration,
            statusCode: res.statusCode,
            userAgent: req.get('user-agent')
          });
        }
      });
      
      next();
    });

    // Add crash detection error middleware (must be last)
    this.app.use(crashLogger.errorMiddleware());
  }

  private setupRoutes(): void {
    // Health check with crash statistics
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '0.1.0',
        crashStats: crashLogger.getCrashStats()
      });
    });

    // Crash logs API endpoint
    this.app.get('/api/logs/stats', (req, res) => {
      try {
        const stats = crashLogger.getCrashStats();
        res.json(stats);
      } catch (error) {
        crashLogger.logError({
          type: 'error',
          severity: 'medium',
          message: 'Failed to retrieve crash statistics',
          stack: error instanceof Error ? error.stack : undefined,
          context: { endpoint: '/api/logs/stats' }
        });
        res.status(500).json({ error: 'Failed to retrieve crash statistics' });
      }
    });

    // API routes
    this.app.use('/api/devices', createDeviceRoutes(this.sensorManager));
    this.app.use('/api/sessions', createSessionRoutes());
    this.app.use('/api/data', createDataRoutes());
    this.app.use('/api/permissions', createPermissionRoutes(this.sensorManager));

    // Serve the main dashboard
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    // Catch-all route for SPA routing
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });
  }

  private setupSensorDataIntegration(): void {
    // Integrate sensor data with session management
    this.sensorManager.on('sensor-data', async (event: SensorEvent) => {
      if (event.type === 'sensor-data') {
        const sensorData = event.data as SensorReading;
        
        try {
          // Auto-start session if none is active
          let activeSession = await this.sessionManager.getActiveSession();
          if (!activeSession) {
            console.log('🚴 Auto-starting session for incoming sensor data');
            const sessionId = await this.sessionManager.startSession('Auto-started Session');
            activeSession = await this.sessionManager.getSessionData(sessionId);
          }

          if (activeSession) {
            // Update the sensor reading with the correct session ID
            sensorData.sessionId = activeSession.id;
            
            // Store the sensor reading
            await this.sessionManager.addSensorReading(sensorData);
          }
        } catch (error) {
          console.error('❌ Failed to process sensor data:', error);
        }
      }
    });

    console.log('🔗 Sensor data integration configured');
  }

  async start(): Promise<void> {
    try {
      // Initialize database
      console.log('🗃️  Initializing database...');
      await initializeDatabase();

      // Start the server
      this.server.listen(this.port, () => {
        console.log(`
🚴 ════════════════════════════════════════════════════════════════
   UltiBiker MVP Server Started Successfully!
   
   📡 Server URL: http://localhost:${this.port}
   🌐 Web Dashboard: http://localhost:${this.port}
   📊 API Endpoints: http://localhost:${this.port}/api
   🔌 WebSocket: ws://localhost:${this.port}
   
   Ready to aggregate sensor data! 🚀
════════════════════════════════════════════════════════════════
        `);
      });

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down UltiBiker server...');
    
    try {
      // End any active session
      const activeSession = await this.sessionManager.getActiveSession();
      if (activeSession) {
        console.log('🏁 Ending active session before shutdown...');
        await this.sessionManager.endSession(activeSession.id);
      }

      // Shutdown WebSocket handler
      this.socketHandler.close();
      
      // Shutdown sensor manager
      await this.sensorManager.shutdown();
      
      // Close database connection
      closeDatabase();
      
      // Close server
      this.server.close(() => {
        console.log('✅ Server shutdown complete');
        process.exit(0);
      });
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start the server
const server = new UltiBikerServer();

// Graceful shutdown handlers
process.on('SIGTERM', () => server.shutdown());
process.on('SIGINT', () => server.shutdown());

// Start the server
server.start().catch((error) => {
  console.error('❌ Failed to start UltiBiker server:', error);
  process.exit(1);
});