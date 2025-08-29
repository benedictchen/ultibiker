// Professional logging service using winston + sentry
// Based on best practices from:
// - https://github.com/winstonjs/winston
// - https://github.com/getsentry/sentry-javascript

import winston from 'winston';
import * as Sentry from '@sentry/node';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LOG_DIR = join(__dirname, '../../logs');

// Ensure logs directory exists
if (!existsSync(LOG_DIR)) {
  mkdirSync(LOG_DIR, { recursive: true });
}

// Initialize Sentry for error tracking
Sentry.init({
  dsn: process.env.SENTRY_DSN, // Set in environment variables
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0, // Adjust for production
  integrations: [
    // Use available integrations for @sentry/node v10+
    Sentry.httpIntegration(),
    Sentry.consoleIntegration()
  ],
});

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, ...meta } = info;
    return JSON.stringify({
      timestamp,
      level,
      message,
      stack,
      metadata: Object.keys(meta).length ? meta : undefined,
      service: 'ultibiker-platform'
    });
  })
);

// Create winston logger with multiple transports
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { 
    service: 'ultibiker-platform',
    version: process.env.npm_package_version || '0.1.0'
  },
  transports: [
    // Error logs - critical issues only
    new winston.transports.File({
      filename: join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),

    // Combined logs - all levels
    new winston.transports.File({
      filename: join(LOG_DIR, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    }),

    // Sensor-specific logs for debugging
    new winston.transports.File({
      filename: join(LOG_DIR, 'sensors.log'),
      level: 'debug',
      maxsize: 5242880, // 5MB
      maxFiles: 3
    })
  ],
  
  // Handle unhandled exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: join(LOG_DIR, 'exceptions.log')
    })
  ],

  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: join(LOG_DIR, 'rejections.log')
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf((info) => {
        const { timestamp, level, message, stack } = info;
        return `${timestamp} [${level}]: ${message}${stack ? `\n${stack}` : ''}`;
      })
    )
  }));
}

// Enhanced logging interface matching previous crash logger
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

class Logger {
  private static instance: Logger;
  
  private constructor() {
    // Set up global error handling
    this.setupGlobalErrorHandling();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private setupGlobalErrorHandling(): void {
    // Capture unhandled exceptions
    process.on('uncaughtException', (error: Error) => {
      this.logError('Uncaught Exception', error, { severity: 'critical' });
      Sentry.captureException(error);
      // Give time for logs to be written
      setTimeout(() => process.exit(1), 1000);
    });

    // Capture unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      this.logError('Unhandled Promise Rejection', reason, { 
        severity: 'critical',
        promise: promise.toString()
      });
      Sentry.captureException(reason);
    });
  }

  // Main logging methods
  logError(message: string, error?: Error | any, context?: Record<string, any>): void {
    const logData: LogEntry = {
      level: 'error',
      message,
      context,
      stack: error?.stack,
      timestamp: new Date().toISOString()
    };

    logger.error(logData);
    
    // Also send to Sentry for monitoring
    if (error instanceof Error) {
      Sentry.captureException(error, {
        extra: context,
        tags: { service: 'ultibiker-platform' }
      });
    } else {
      Sentry.captureMessage(message, 'error');
    }
  }

  logWarning(message: string, context?: Record<string, any>): void {
    const logData: LogEntry = {
      level: 'warn',
      message,
      context,
      timestamp: new Date().toISOString()
    };

    logger.warn(logData);
  }

  logInfo(message: string, context?: Record<string, any>): void {
    const logData: LogEntry = {
      level: 'info',
      message,
      context,
      timestamp: new Date().toISOString()
    };

    logger.info(logData);
  }

  logDebug(message: string, context?: Record<string, any>): void {
    const logData: LogEntry = {
      level: 'debug',
      message,
      context,
      timestamp: new Date().toISOString()
    };

    logger.debug(logData);
  }

  // Specialized logging for sensors
  logSensorEvent(entry: SensorLogEntry): void {
    const logData = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
      category: 'sensor'
    };

    logger.info('Sensor Event', logData);
  }

  // Specialized logging for sessions
  logSessionEvent(entry: SessionLogEntry): void {
    const logData = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
      category: 'session'
    };

    logger.info('Session Event', logData);
  }

  // Performance logging
  logPerformance(data: {
    operation: string;
    duration: number;
    status?: string;
    context?: Record<string, any>;
  }): void {
    const logData = {
      level: 'info' as const,
      message: `Performance: ${data.operation}`,
      context: {
        duration: data.duration,
        status: data.status,
        ...data.context,
        category: 'performance'
      },
      timestamp: new Date().toISOString()
    };

    logger.info(logData);

    // Log slow operations to Sentry
    if (data.duration > 5000) { // 5 seconds
      Sentry.captureMessage(`Slow operation: ${data.operation}`, {
        level: 'warning',
        extra: data
      });
    }
  }

  // Express error middleware
  errorMiddleware() {
    return (err: Error, req: any, res: any, next: any) => {
      this.logError('Express Error', err, {
        method: req.method,
        url: req.url,
        userAgent: req.get('user-agent'),
        ip: req.ip
      });

      // Send error response
      if (!res.headersSent) {
        res.status(500).json({
          error: process.env.NODE_ENV === 'production' 
            ? 'Internal Server Error' 
            : err.message,
          timestamp: new Date().toISOString()
        });
      }

      next(err);
    };
  }

  // Request logging middleware (replaces morgan for structured logs)
  requestMiddleware() {
    return (req: any, res: any, next: any) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        this.logInfo('HTTP Request', {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          userAgent: req.get('user-agent'),
          ip: req.ip,
          category: 'http'
        });

        // Track slow requests
        if (duration > 1000) {
          this.logWarning('Slow HTTP Request', {
            method: req.method,
            url: req.url,
            duration,
            statusCode: res.statusCode
          });
        }
      });

      next();
    };
  }

  // Health check for monitoring
  getHealthStatus() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'ultibiker-platform',
      version: process.env.npm_package_version || '0.1.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    };
  }
}

// Export singleton instance
export const appLogger = Logger.getInstance();

// Export Sentry for direct use if needed
export { Sentry };

// Backward compatibility - export functions matching old crash logger
export const crashLogger = {
  initialize: () => {
    appLogger.logInfo('Logger initialized with winston + sentry');
  },
  logCrash: (data: any) => {
    appLogger.logError('Crash detected', data.error || new Error(data.message), data);
  },
  logPerformance: (data: any) => {
    appLogger.logPerformance(data);
  },
  errorMiddleware: () => appLogger.errorMiddleware()
};

export default appLogger;