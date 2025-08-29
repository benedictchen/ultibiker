// FIXME: Replace this custom logging system with production-grade libraries:
// - winston: Structured logging with multiple transports (file, console, database)
// - @sentry/node: Error tracking and performance monitoring
// - pino: High-performance JSON logger (faster than winston)
// - node-bunyan: JSON logging library with powerful features
// Current implementation is basic and missing features like log rotation, structured queries, etc.
import { writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LOG_DIR = join(__dirname, '../../logs');
export class CrashLogger {
    static instance;
    isInitialized = false;
    constructor() { }
    static getInstance() {
        if (!CrashLogger.instance) {
            CrashLogger.instance = new CrashLogger();
        }
        return CrashLogger.instance;
    }
    initialize() {
        if (this.isInitialized)
            return;
        this.ensureLogDirectories();
        this.setupProcessHandlers();
        this.cleanupOldLogs();
        this.isInitialized = true;
        console.log('🛡️  Crash detection system initialized');
    }
    ensureLogDirectories() {
        const dirs = ['crashes', 'errors', 'sessions', 'sensors', 'performance'];
        if (!existsSync(LOG_DIR)) {
            mkdirSync(LOG_DIR, { recursive: true });
        }
        dirs.forEach(dir => {
            const fullPath = join(LOG_DIR, dir);
            if (!existsSync(fullPath)) {
                mkdirSync(fullPath, { recursive: true });
            }
        });
    }
    setupProcessHandlers() {
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.logCrash({
                type: 'crash',
                severity: 'critical',
                message: `Uncaught Exception: ${error.message}`,
                stack: error.stack,
                context: {
                    errorName: error.name,
                    errorType: 'uncaughtException'
                }
            });
            console.error('💥 CRITICAL: Uncaught Exception detected, crash log written');
            console.error(error);
            // Allow time for log to be written, then exit
            setTimeout(() => {
                process.exit(1);
            }, 1000);
        });
        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            this.logCrash({
                type: 'crash',
                severity: 'critical',
                message: `Unhandled Promise Rejection: ${reason}`,
                stack: reason?.stack || new Error().stack,
                context: {
                    reason: reason?.toString(),
                    errorType: 'unhandledRejection',
                    promise: promise.toString()
                }
            });
            console.error('💥 CRITICAL: Unhandled Promise Rejection detected, crash log written');
            console.error('Reason:', reason);
            console.error('Promise:', promise);
        });
        // Handle memory warnings
        process.on('warning', (warning) => {
            this.logError({
                type: 'warning',
                severity: 'medium',
                message: `Process Warning: ${warning.message}`,
                stack: warning.stack,
                context: {
                    warningName: warning.name,
                    warningType: 'processWarning'
                }
            });
        });
        // Log startup
        this.logError({
            type: 'error',
            severity: 'low',
            message: 'UltiBiker server started successfully',
            context: {
                startupTime: new Date().toISOString(),
                nodeVersion: process.version,
                platform: process.platform
            }
        });
    }
    logCrash(crashData) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: crashData.type || 'crash',
            severity: crashData.severity || 'critical',
            message: crashData.message || 'Unknown crash',
            stack: crashData.stack,
            context: crashData.context,
            pid: process.pid,
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '0.1.0',
            environment: process.env.NODE_ENV || 'development'
        };
        const filename = `crash-${this.generateTimestamp()}.json`;
        const filepath = join(LOG_DIR, 'crashes', filename);
        try {
            writeFileSync(filepath, JSON.stringify(logEntry, null, 2));
            console.log(`💥 Crash log written: ${filepath}`);
        }
        catch (writeError) {
            console.error('❌ Failed to write crash log:', writeError);
        }
    }
    logError(errorData) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            type: errorData.type || 'error',
            severity: errorData.severity || 'medium',
            message: errorData.message || 'Unknown error',
            stack: errorData.stack,
            context: errorData.context,
            pid: process.pid,
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '0.1.0',
            environment: process.env.NODE_ENV || 'development'
        };
        const filename = `error-${this.generateTimestamp()}.json`;
        const filepath = join(LOG_DIR, 'errors', filename);
        try {
            writeFileSync(filepath, JSON.stringify(logEntry, null, 2));
        }
        catch (writeError) {
            console.error('❌ Failed to write error log:', writeError);
        }
    }
    logSession(sessionData) {
        const logEntry = {
            ...sessionData,
            timestamp: sessionData.timestamp || new Date().toISOString()
        };
        const filename = `session-${this.generateTimestamp()}.json`;
        const filepath = join(LOG_DIR, 'sessions', filename);
        try {
            writeFileSync(filepath, JSON.stringify(logEntry, null, 2));
        }
        catch (writeError) {
            console.error('❌ Failed to write session log:', writeError);
        }
    }
    logSensor(sensorData) {
        const logEntry = {
            ...sensorData,
            timestamp: sensorData.timestamp || new Date().toISOString()
        };
        const filename = `sensor-${this.generateTimestamp()}.json`;
        const filepath = join(LOG_DIR, 'sensors', filename);
        try {
            writeFileSync(filepath, JSON.stringify(logEntry, null, 2));
        }
        catch (writeError) {
            console.error('❌ Failed to write sensor log:', writeError);
        }
    }
    logPerformance(data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            ...data
        };
        const filename = `performance-${this.generateTimestamp()}.json`;
        const filepath = join(LOG_DIR, 'performance', filename);
        try {
            writeFileSync(filepath, JSON.stringify(logEntry, null, 2));
        }
        catch (writeError) {
            console.error('❌ Failed to write performance log:', writeError);
        }
    }
    generateTimestamp() {
        const now = new Date();
        return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    }
    cleanupOldLogs() {
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
        const dirs = ['crashes', 'errors', 'sessions', 'sensors', 'performance'];
        dirs.forEach(dir => {
            const dirPath = join(LOG_DIR, dir);
            if (!existsSync(dirPath))
                return;
            try {
                const files = readdirSync(dirPath);
                const now = Date.now();
                files.forEach(file => {
                    const filePath = join(dirPath, file);
                    const stats = statSync(filePath);
                    const fileAge = now - stats.mtime.getTime();
                    if (fileAge > maxAge) {
                        unlinkSync(filePath);
                        console.log(`🗑️  Cleaned up old log: ${file}`);
                    }
                });
            }
            catch (cleanupError) {
                console.error(`❌ Failed to cleanup logs in ${dir}:`, cleanupError);
            }
        });
    }
    // Express middleware for error handling
    errorMiddleware() {
        return (error, req, res, next) => {
            this.logError({
                type: 'error',
                severity: 'high',
                message: `Express Error: ${error.message}`,
                stack: error.stack,
                context: {
                    method: req.method,
                    url: req.url,
                    userAgent: req.get('user-agent'),
                    ip: req.ip,
                    body: req.body
                }
            });
            res.status(500).json({
                error: 'Internal Server Error',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
            });
        };
    }
    // Get crash statistics
    getCrashStats() {
        const dirs = ['crashes', 'errors', 'sessions', 'sensors', 'performance'];
        const stats = {};
        dirs.forEach(dir => {
            const dirPath = join(LOG_DIR, dir);
            if (existsSync(dirPath)) {
                stats[dir] = readdirSync(dirPath).length;
            }
            else {
                stats[dir] = 0;
            }
        });
        return {
            ...stats,
            totalLogs: Object.values(stats).reduce((sum, count) => sum + count, 0),
            uptime: process.uptime(),
            memory: process.memoryUsage()
        };
    }
}
// Export singleton instance
export const crashLogger = CrashLogger.getInstance();
//# sourceMappingURL=crash-logger.js.map