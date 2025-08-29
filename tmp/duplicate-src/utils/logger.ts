import winston from 'winston';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { hostname } from 'os';

/**
 * Production-ready logging system using Winston and Sentry
 * Based on industry best practices and third-party library documentation
 * 
 * References:
 * - Winston: https://github.com/winstonjs/winston
 * - Sentry Node.js: https://docs.sentry.io/platforms/javascript/guides/node/
 * - Production logging patterns: https://github.com/goldbergyoni/nodebestpractices
 */

interface LoggerConfig {
  level: string;
  environment: string;
  service: string;
  version: string;
  sentryDsn?: string;
}

class UltiBikerLogger {
  private winston: winston.Logger;
  private config: LoggerConfig;

  constructor(config: LoggerConfig) {
    this.config = config;
    this.setupSentry();
    this.winston = this.createWinstonLogger();
  }

  private setupSentry() {
    if (this.config.sentryDsn) {
      Sentry.init({
        dsn: this.config.sentryDsn,
        environment: this.config.environment,
        release: `ultibiker@${this.config.version}`,
        integrations: [
          // Enable performance monitoring
          nodeProfilingIntegration(),
        ],
        // Performance monitoring sample rate
        tracesSampleRate: this.config.environment === 'production' ? 0.1 : 1.0,
        // Profiling sample rate
        profilesSampleRate: this.config.environment === 'production' ? 0.1 : 1.0,
        beforeSend(event, hint) {
          // Filter out sensitive information
          if (event.extra) {
            delete event.extra.env;
            delete event.extra.process;
          }
          
          // Don't send test events in development
          if (event.environment !== 'production' && event.level === 'info') {
            return null;
          }
          
          return event;
        },
      });
      
      console.log('✅ Sentry error tracking initialized');
    }
  }

  private createWinstonLogger(): winston.Logger {
    const formats = [
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.metadata({ 
        key: 'metadata',
        fillExcept: ['message', 'level', 'timestamp', 'label'] 
      })
    ];

    // Production format: structured JSON
    if (this.config.environment === 'production') {
      formats.push(winston.format.json());
    } 
    // Development format: human-readable
    else {
      formats.push(
        winston.format.colorize(),
        winston.format.printf((info) => {
          const { timestamp, level, message, metadata, ...extra } = info;
          const metaStr = Object.keys(metadata || {}).length > 0 
            ? `\n${JSON.stringify(metadata, null, 2)}`
            : '';
          const extraStr = Object.keys(extra).length > 0 
            ? `\n${JSON.stringify(extra, null, 2)}`
            : '';
          return `${timestamp} [${level}] ${message}${metaStr}${extraStr}`;
        })
      );
    }

    const transports: winston.transport[] = [
      // Console transport
      new winston.transports.Console({
        level: this.config.level,
        handleExceptions: true,
        handleRejections: true
      })
    ];

    // File transports for production
    if (this.config.environment === 'production') {
      transports.push(
        // Combined logs
        new winston.transports.File({
          filename: 'logs/combined.log',
          level: 'info',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          tailable: true
        }),
        // Error logs
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 3,
          tailable: true
        }),
        // Sensor-specific logs
        new winston.transports.File({
          filename: 'logs/sensors.log',
          level: 'debug',
          maxsize: 50 * 1024 * 1024, // 50MB for sensor data
          maxFiles: 3,
          tailable: true,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
            winston.format((info) => {
              // Only log sensor-related messages to this file
              return info.category === 'sensor' ? info : false;
            })()
          )
        })
      );
    }

    return winston.createLogger({
      level: this.config.level,
      format: winston.format.combine(...formats),
      defaultMeta: {
        service: this.config.service,
        version: this.config.version,
        environment: this.config.environment,
        pid: process.pid,
        hostname: hostname()
      },
      transports,
      exitOnError: false
    });
  }

  // Core logging methods
  debug(message: string, meta: any = {}) {
    this.winston.debug(message, meta);
  }

  info(message: string, meta: any = {}) {
    this.winston.info(message, meta);
  }

  warn(message: string, meta: any = {}) {
    this.winston.warn(message, meta);
    
    // Send warnings to Sentry in production
    if (this.config.environment === 'production') {
      Sentry.captureMessage(message, 'warning');
    }
  }

  error(message: string, error?: Error, meta: any = {}) {
    const errorMeta = {
      ...meta,
      stack: error?.stack,
      name: error?.name,
      message: error?.message
    };
    
    this.winston.error(message, errorMeta);
    
    // Send errors to Sentry
    if (this.config.sentryDsn) {
      if (error) {
        Sentry.captureException(error, {
          tags: meta,
          extra: { originalMessage: message }
        });
      } else {
        Sentry.captureMessage(message, 'error');
      }
    }
  }

  // Specialized logging methods for UltiBiker
  sensor(message: string, sensorData: any = {}) {
    this.winston.info(message, {
      category: 'sensor',
      ...sensorData,
      timestamp: new Date().toISOString()
    });
  }

  performance(message: string, metrics: any = {}) {
    this.winston.info(message, {
      category: 'performance',
      ...metrics,
      timestamp: new Date().toISOString()
    });
  }

  security(message: string, securityData: any = {}) {
    this.winston.warn(message, {
      category: 'security',
      ...securityData,
      timestamp: new Date().toISOString()
    });
    
    // Always send security events to Sentry
    if (this.config.sentryDsn) {
      Sentry.captureMessage(message, 'warning');
    }
  }

  api(message: string, requestData: any = {}) {
    this.winston.info(message, {
      category: 'api',
      ...requestData,
      timestamp: new Date().toISOString()
    });
  }

  // Database logging
  database(message: string, queryData: any = {}) {
    this.winston.debug(message, {
      category: 'database',
      ...queryData,
      timestamp: new Date().toISOString()
    });
  }

  // WebSocket logging
  websocket(message: string, socketData: any = {}) {
    this.winston.debug(message, {
      category: 'websocket',
      ...socketData,
      timestamp: new Date().toISOString()
    });
  }

  // Business logic logging
  session(message: string, sessionData: any = {}) {
    this.winston.info(message, {
      category: 'session',
      ...sessionData,
      timestamp: new Date().toISOString()
    });
  }

  // Utility methods
  profile(id: string) {
    return this.winston.profile(id);
  }

  startTimer(label: string) {
    const start = Date.now();
    return {
      end: () => {
        const duration = Date.now() - start;
        this.performance(`Timer: ${label}`, { duration, label });
        return duration;
      }
    };
  }

  // Health check logging
  health(message: string, healthData: any = {}) {
    this.winston.info(message, {
      category: 'health',
      ...healthData,
      timestamp: new Date().toISOString()
    });
  }

  // Graceful shutdown
  async shutdown() {
    return new Promise<void>((resolve) => {
      this.winston.end(() => {
        if (this.config.sentryDsn) {
          Sentry.close(2000).then(() => resolve());
        } else {
          resolve();
        }
      });
    });
  }
}

// Environment configuration
const environment = process.env.NODE_ENV || 'development';
const logLevel = process.env.LOG_LEVEL || (environment === 'production' ? 'info' : 'debug');

// Create and export logger instance
export const logger = new UltiBikerLogger({
  level: logLevel,
  environment,
  service: 'ultibiker',
  version: process.env.npm_package_version || '0.1.0',
  sentryDsn: process.env.SENTRY_DSN
});

// Export Sentry for advanced usage
export { Sentry };

// Morgan integration for HTTP request logging
export const morganStream = {
  write: (message: string) => {
    logger.api(message.trim());
  }
};

// Unhandled exception and rejection handling
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', reason, { promise: promise.toString() });
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  
  // Give winston time to write logs before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown`);
  await logger.shutdown();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default logger;