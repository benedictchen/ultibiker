// Comprehensive error handling middleware with production-ready features
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { appLogger, Sentry } from '../services/logger.js';

/**
 * Error types and interfaces
 */

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  details?: any;
}

export class ValidationError extends Error implements AppError {
  statusCode = 400;
  isOperational = true;
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error implements AppError {
  statusCode = 404;
  isOperational = true;
  
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements AppError {
  statusCode = 409;
  isOperational = true;
  
  constructor(message: string = 'Resource conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends Error implements AppError {
  statusCode = 401;
  isOperational = true;
  
  constructor(message: string = 'Unauthorized access') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class RateLimitError extends Error implements AppError {
  statusCode = 429;
  isOperational = true;
  
  constructor(message: string = 'Too many requests') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ServiceUnavailableError extends Error implements AppError {
  statusCode = 503;
  isOperational = true;
  
  constructor(message: string = 'Service temporarily unavailable') {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Error classification utility
 */
export class ErrorClassifier {
  static isOperationalError(error: Error): boolean {
    if ('isOperational' in error) {
      return (error as AppError).isOperational === true;
    }
    
    // Common operational errors
    const operationalErrorNames = [
      'ValidationError',
      'CastError',
      'JsonWebTokenError',
      'TokenExpiredError',
      'MongoError',
      'SequelizeValidationError'
    ];
    
    return operationalErrorNames.includes(error.name);
  }
  
  static getStatusCode(error: Error): number {
    if ('statusCode' in error) {
      return (error as AppError).statusCode || 500;
    }
    
    // Map common errors to status codes
    switch (error.name) {
      case 'ValidationError':
      case 'CastError':
        return 400;
      case 'JsonWebTokenError':
      case 'TokenExpiredError':
        return 401;
      case 'NotFoundError':
        return 404;
      case 'ConflictError':
        return 409;
      case 'RateLimitError':
        return 429;
      default:
        return 500;
    }
  }
  
  static getErrorType(error: Error): 'validation' | 'authentication' | 'authorization' | 'not_found' | 'conflict' | 'rate_limit' | 'server' | 'unknown' {
    const statusCode = this.getStatusCode(error);
    
    if (statusCode >= 400 && statusCode < 500) {
      switch (statusCode) {
        case 400: return 'validation';
        case 401: return 'authentication';
        case 403: return 'authorization';
        case 404: return 'not_found';
        case 409: return 'conflict';
        case 429: return 'rate_limit';
        default: return 'unknown';
      }
    }
    
    return 'server';
  }
}

/**
 * Request context for error tracking
 */
interface RequestContext {
  method: string;
  url: string;
  ip: string;
  userAgent?: string;
  sessionId?: string;
  userId?: string;
  timestamp: string;
  requestId: string;
}

/**
 * Main error handling middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Skip if response already sent
  if (res.headersSent) {
    return next(error);
  }

  const requestId = (req as any).requestId || generateRequestId();
  const statusCode = ErrorClassifier.getStatusCode(error);
  const errorType = ErrorClassifier.getErrorType(error);
  const isOperational = ErrorClassifier.isOperationalError(error);

  // Create request context for logging
  const requestContext: RequestContext = {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('user-agent'),
    sessionId: (req as any).sessionId,
    userId: (req as any).userId,
    timestamp: new Date().toISOString(),
    requestId
  };

  // Log error with context
  logErrorWithContext(error, requestContext, isOperational);

  // Send error to Sentry for monitoring
  sendErrorToSentry(error, requestContext, req);

  // Send error response
  sendErrorResponse(res, error, statusCode, errorType, requestId, isOperational);
};

/**
 * Specialized error handlers
 */

// Handle Zod validation errors
export const handleZodError = (
  error: ZodError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const validationErrors = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }));

  const validationError = new ValidationError('Input validation failed', validationErrors);
  errorHandler(validationError, req, res, next);
};

// Handle async route errors
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Handle 404 errors
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  next(error);
};

/**
 * Helper functions
 */

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;
}

function logErrorWithContext(error: Error, context: RequestContext, isOperational: boolean): void {
  const logLevel = isOperational ? 'warn' : 'error';
  const logMessage = `${error.name}: ${error.message}`;
  
  const logData = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error as AppError).details && { details: (error as AppError).details }
    },
    request: context,
    isOperational,
    severity: isOperational ? 'medium' : 'high'
  };

  if (logLevel === 'error') {
    appLogger.logError(logMessage, error, logData);
  } else {
    appLogger.logWarning(logMessage, logData);
  }
}

function sendErrorToSentry(error: Error, context: RequestContext, req: Request): void {
  // Don't send operational errors to Sentry in development
  if (process.env.NODE_ENV === 'development' && ErrorClassifier.isOperationalError(error)) {
    return;
  }

  Sentry.withScope((scope) => {
    // Add request context
    scope.setTag('requestId', context.requestId);
    scope.setTag('method', context.method);
    scope.setTag('statusCode', ErrorClassifier.getStatusCode(error));
    scope.setTag('errorType', ErrorClassifier.getErrorType(error));
    
    scope.setContext('request', {
      method: context.method,
      url: context.url,
      headers: req.headers,
      query: req.query,
      ip: context.ip
    });
    
    scope.setContext('response', {
      statusCode: ErrorClassifier.getStatusCode(error)
    });

    // Add user context if available
    if (context.userId) {
      scope.setUser({ id: context.userId });
    }
    
    // Set appropriate level
    const level = ErrorClassifier.isOperationalError(error) ? 'warning' : 'error';
    scope.setLevel(level);
    
    // Capture the error
    Sentry.captureException(error);
  });
}

function sendErrorResponse(
  res: Response,
  error: Error,
  statusCode: number,
  errorType: string,
  requestId: string,
  isOperational: boolean
): void {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Base error response
  const errorResponse: any = {
    success: false,
    error: {
      type: errorType,
      message: isOperational || isDevelopment ? error.message : 'Internal server error',
      requestId,
      timestamp: new Date().toISOString()
    }
  };

  // Add details for operational errors or development
  if ((isOperational || isDevelopment) && (error as AppError).details) {
    errorResponse.error.details = (error as AppError).details;
  }

  // Add stack trace in development
  if (isDevelopment && error.stack) {
    errorResponse.error.stack = error.stack;
  }

  // Add error code for known errors
  if (error.name && error.name !== 'Error') {
    errorResponse.error.code = error.name;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * Application-specific error handlers
 */

// Sensor-related errors
export class SensorError extends Error implements AppError {
  statusCode = 422;
  isOperational = true;
  
  constructor(message: string, public sensorId?: string, public details?: any) {
    super(message);
    this.name = 'SensorError';
  }
}

// Session-related errors
export class SessionError extends Error implements AppError {
  statusCode = 422;
  isOperational = true;
  
  constructor(message: string, public sessionId?: string, public details?: any) {
    super(message);
    this.name = 'SessionError';
  }
}

// Device connection errors
export class DeviceConnectionError extends Error implements AppError {
  statusCode = 503;
  isOperational = true;
  
  constructor(message: string, public deviceId?: string, public details?: any) {
    super(message);
    this.name = 'DeviceConnectionError';
  }
}

// WebSocket errors
export class WebSocketError extends Error implements AppError {
  statusCode = 500;
  isOperational = true;
  
  constructor(message: string, public clientId?: string, public details?: any) {
    super(message);
    this.name = 'WebSocketError';
  }
}

/**
 * Production error handling enhancements
 */

// Global uncaught exception handler
export const setupGlobalErrorHandling = (): void => {
  process.on('uncaughtException', (error: Error) => {
    appLogger.logError('Uncaught Exception - Shutting down gracefully', error, {
      severity: 'critical',
      processAction: 'shutdown'
    });
    
    Sentry.captureException(error, {
      level: 'fatal',
      tags: { errorType: 'uncaughtException' }
    });
    
    // Give some time for logs to be written
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    
    appLogger.logError('Unhandled Promise Rejection', error, {
      severity: 'critical',
      promise: promise.toString(),
      reason: String(reason)
    });
    
    Sentry.captureException(error, {
      level: 'fatal',
      tags: { errorType: 'unhandledRejection' },
      extra: { promise: promise.toString() }
    });
    
    // Don't exit immediately for unhandled rejections in production
    if (process.env.NODE_ENV === 'production') {
      appLogger.logWarning('Continuing after unhandled rejection in production', {
        reason: String(reason)
      });
    }
  });

  // Graceful shutdown on termination signals
  const gracefulShutdown = (signal: string) => {
    appLogger.logInfo(`Received ${signal} - Starting graceful shutdown`, {
      signal,
      uptime: process.uptime()
    });
    
    // Close Sentry
    Sentry.close(2000).then(() => {
      process.exit(0);
    }).catch(() => {
      process.exit(1);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

/**
 * Request ID middleware for error tracking
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = req.headers['x-request-id'] as string || generateRequestId();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

/**
 * Health check error handler
 */
export const healthCheckErrorHandler = (error: Error): { status: 'error'; error: string; timestamp: string } => {
  appLogger.logError('Health check failed', error);
  
  return {
    status: 'error',
    error: error.message,
    timestamp: new Date().toISOString()
  };
};