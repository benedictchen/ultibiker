import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
// Production-ready middleware and utilities  
import { setupSecurityMiddleware, apiSecurityHeaders, securityLogger, sanitizeInput, securityErrorHandler } from './middleware/security.js';
import { logger, morganStream } from './utils/logger.js';
import { env } from './config/env.js';
import { initializeDatabase, closeDatabase } from './database/db.js';
import { UltiBikerSensorManager } from './sensors/sensor-manager.js';
import { SessionManager } from './services/session-manager.js';
import { SocketHandler } from './websocket/socket-handler.js';
import { createDeviceRoutes } from './api/devices.js';
import { createSessionRoutes } from './api/sessions.js';
import { createDataRoutes } from './api/data.js';
import { createPermissionRoutes } from './api/permissions.js';
// Legacy logger - replaced by Winston/Sentry logging
// import { appLogger, crashLogger } from './services/logger.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
class UltiBikerServer {
    app;
    server;
    sensorManager;
    sessionManager;
    socketHandler;
    port;
    constructor() {
        this.port = env.PORT;
        this.app = express();
        this.server = createServer(this.app);
        logger.info('🚀 UltiBiker server initializing', { port: this.port });
        this.sessionManager = new SessionManager();
        this.sensorManager = new UltiBikerSensorManager(this.sessionManager);
        this.socketHandler = new SocketHandler(this.server, this.sensorManager, this.sessionManager);
        this.setupMiddleware();
        this.setupRoutes();
        this.setupSensorDataIntegration();
    }
    setupMiddleware() {
        // Production-ready security middleware stack
        setupSecurityMiddleware(this.app, {
            cors: {
                origin: process.env.CORS_ORIGIN?.split(',') || [
                    'http://localhost:3000',
                    'http://localhost:3001'
                ],
                credentials: true
            },
            rateLimit: {
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: parseInt(process.env.RATE_LIMIT_MAX || '100')
            },
            compression: true,
            helmet: true
        });
        // HTTP request logging with Morgan + Winston
        this.app.use(morgan('combined', {
            stream: morganStream,
            skip: (req) => {
                // Skip logging health checks in production
                return process.env.NODE_ENV === 'production' && req.path === '/health';
            }
        }));
        // Security monitoring and input sanitization
        this.app.use(securityLogger);
        this.app.use(sanitizeInput);
        // Body parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        // API security headers
        this.app.use('/api', apiSecurityHeaders);
        // Serve static files (web UI)
        this.app.use(express.static(path.join(__dirname, '../public'), {
            maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0'
        }));
        // Security error handling (must be last)
        this.app.use(securityErrorHandler);
    }
    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            const healthData = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: process.env.npm_package_version || '0.1.0',
                environment: process.env.NODE_ENV || 'development',
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                sensors: {
                    active: this.sensorManager.getConnectedDevices().length
                }
            };
            logger.health('Health check requested', healthData);
            res.json(healthData);
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
    setupSensorDataIntegration() {
        // Integrate sensor data with session management
        this.sensorManager.on('sensor-data', async (event) => {
            if (event.type === 'sensor-data') {
                const sensorData = event.data;
                try {
                    // Auto-start session if none is active
                    let activeSession = await this.sessionManager.getActiveSession();
                    if (!activeSession) {
                        logger.session('Auto-starting session for incoming sensor data', {
                            sensorType: sensorData.metricType,
                            deviceId: sensorData.deviceId
                        });
                        const sessionId = await this.sessionManager.startSession('Auto-started Session');
                        activeSession = await this.sessionManager.getSessionData(sessionId);
                    }
                    if (activeSession) {
                        // Update the sensor reading with the correct session ID
                        sensorData.sessionId = activeSession.id;
                        // Store the sensor reading
                        await this.sessionManager.addSensorReading(sensorData);
                        // Log sensor data for monitoring
                        logger.sensor('Sensor reading processed', {
                            sessionId: activeSession.id,
                            type: sensorData.metricType,
                            value: sensorData.value,
                            deviceId: sensorData.deviceId
                        });
                    }
                }
                catch (error) {
                    logger.error('Failed to process sensor data', error, {
                        sensorData: {
                            type: sensorData.metricType,
                            deviceId: sensorData.deviceId,
                            value: sensorData.value
                        }
                    });
                }
            }
        });
        logger.info('🔗 Sensor data integration configured');
    }
    async start() {
        try {
            // Initialize database
            logger.info('🗃️  Initializing database...');
            await initializeDatabase();
            // Start the server
            this.server.listen(this.port, () => {
                const startupMessage = `
🚴 ════════════════════════════════════════════════════════════════
   UltiBiker Server Started Successfully!
   
   📡 Server URL: http://localhost:${this.port}
   🌐 Web Dashboard: http://localhost:${this.port}
   📊 API Endpoints: http://localhost:${this.port}/api
   🔌 WebSocket: ws://localhost:${this.port}
   
   Environment: ${process.env.NODE_ENV || 'development'}
   Logging: ${process.env.LOG_LEVEL || 'debug'}
   Security: Production middleware enabled
   
   Ready to aggregate sensor data! 🚀
════════════════════════════════════════════════════════════════`;
                console.log(startupMessage);
                logger.info('🚴 UltiBiker server started successfully', {
                    port: this.port,
                    environment: process.env.NODE_ENV || 'development',
                    version: process.env.npm_package_version || '0.1.0'
                });
            });
        }
        catch (error) {
            logger.error('❌ Failed to start server', error);
            process.exit(1);
        }
    }
    async shutdown() {
        logger.info('🔄 Shutting down UltiBiker server...');
        try {
            // End any active session
            const activeSession = await this.sessionManager.getActiveSession();
            if (activeSession) {
                logger.session('🏁 Ending active session before shutdown', {
                    sessionId: activeSession.id
                });
                await this.sessionManager.endSession(activeSession.id);
            }
            // Shutdown WebSocket handler
            this.socketHandler.close();
            // Shutdown sensor manager
            await this.sensorManager.shutdown();
            // Close database connection
            closeDatabase();
            // Close server
            this.server.close(async () => {
                logger.info('✅ Server shutdown complete');
                await logger.shutdown();
                process.exit(0);
            });
        }
        catch (error) {
            logger.error('❌ Error during shutdown', error);
            await logger.shutdown();
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
server.start().catch(async (error) => {
    logger.error('❌ Failed to start UltiBiker server', error);
    await logger.shutdown();
    process.exit(1);
});
//# sourceMappingURL=server.js.map