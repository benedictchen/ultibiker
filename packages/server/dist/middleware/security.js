import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger.js';
/**
 * Configure comprehensive security middleware stack
 */
export function setupSecurityMiddleware(app, config = {}) {
    logger.info('🔒 Setting up security middleware stack');
    // 1. Helmet - Security headers
    if (config.helmet !== false) {
        app.use(helmet({
            // Content Security Policy
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "ws://localhost:*", "wss://localhost:*"],
                    fontSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"]
                }
            },
            // Cross Origin Embedder Policy
            crossOriginEmbedderPolicy: false, // Disabled for now to avoid breaking existing functionality
            // Disable X-Powered-By header
            hidePoweredBy: true,
            // HSTS
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        }));
        logger.info('✅ Helmet security headers configured');
    }
    // 2. CORS - Cross-Origin Resource Sharing
    const corsOptions = {
        origin: config.cors?.origin || [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001'
        ],
        credentials: config.cors?.credentials || true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
        exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
        optionsSuccessStatus: 200
    };
    app.use(cors(corsOptions));
    logger.info('✅ CORS configured', { origins: corsOptions.origin });
    // 3. Compression - Gzip compression
    if (config.compression !== false) {
        app.use(compression({
            filter: (req, res) => {
                // Don't compress responses with this header
                if (req.headers['x-no-compression']) {
                    return false;
                }
                // Compress everything else
                return compression.filter(req, res);
            },
            threshold: 1024, // Only compress responses larger than 1KB
            level: 6 // Balanced compression level
        }));
        logger.info('✅ Gzip compression enabled');
    }
    // 4. Rate Limiting
    const rateLimitOptions = {
        windowMs: config.rateLimit?.windowMs || 15 * 60 * 1000, // 15 minutes
        max: config.rateLimit?.max || 100, // Limit each IP to 100 requests per windowMs
        message: {
            error: 'Too many requests from this IP, please try again later.',
            retryAfter: '15 minutes'
        },
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        handler: (req, res) => {
            logger.warn('Rate limit exceeded', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path
            });
            res.status(429).json({
                error: 'Too many requests',
                message: 'Rate limit exceeded. Please try again later.',
                retryAfter: Math.ceil(rateLimitOptions.windowMs / 1000)
            });
        }
    };
    app.use(rateLimit(rateLimitOptions));
    logger.info('✅ Rate limiting configured', {
        windowMs: rateLimitOptions.windowMs,
        max: rateLimitOptions.max
    });
    // 5. API-specific rate limits for intensive operations
    const strictRateLimit = rateLimit({
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 20, // Limit to 20 requests per 5 minutes
        message: {
            error: 'Too many sensor operations, please try again later.',
            retryAfter: '5 minutes'
        },
        keyGenerator: (req) => `sensor_${req.ip}`,
        handler: (req, res) => {
            logger.warn('Strict rate limit exceeded for sensor operations', {
                ip: req.ip,
                path: req.path
            });
            res.status(429).json({
                error: 'Sensor operation rate limit exceeded',
                message: 'Too many sensor operations. Please try again in 5 minutes.'
            });
        }
    });
    // Apply strict rate limiting to sensor-intensive endpoints
    app.use('/api/devices/scan', strictRateLimit);
    app.use('/api/devices/connect', strictRateLimit);
    app.use('/api/sessions/start', strictRateLimit);
    logger.info('✅ Strict rate limiting applied to sensor endpoints');
}
/**
 * Input Validation Schemas using express-validator
 */
export const validators = {
    // Session validation
    createSession: [
        body('name')
            .isLength({ min: 1, max: 100 })
            .trim()
            .escape()
            .withMessage('Session name must be 1-100 characters'),
        body('description')
            .optional()
            .isLength({ max: 500 })
            .trim()
            .escape()
            .withMessage('Description must be less than 500 characters'),
        body('sessionType')
            .optional()
            .isIn(['training', 'race', 'recovery', 'test'])
            .withMessage('Invalid session type')
    ],
    // Device connection validation
    connectDevice: [
        body('deviceId')
            .isLength({ min: 1 })
            .trim()
            .escape()
            .withMessage('Device ID is required'),
        body('protocol')
            .isIn(['ant_plus', 'bluetooth'])
            .withMessage('Protocol must be ant_plus or bluetooth')
    ],
    // Data export validation
    exportData: [
        body('sessionId')
            .isUUID()
            .withMessage('Valid session ID required'),
        body('format')
            .isIn(['json', 'csv', 'tcx', 'gpx'])
            .withMessage('Format must be json, csv, tcx, or gpx'),
        body('startDate')
            .optional()
            .isISO8601()
            .withMessage('Start date must be valid ISO 8601 format'),
        body('endDate')
            .optional()
            .isISO8601()
            .withMessage('End date must be valid ISO 8601 format')
    ],
    // Generic ID validation
    validateId: [
        body('id')
            .isUUID()
            .withMessage('Valid UUID required')
    ]
};
/**
 * Validation error handler middleware
 */
export function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn('Validation errors', {
            path: req.path,
            method: req.method,
            errors: errors.array(),
            ip: req.ip
        });
        return res.status(400).json({
            error: 'Validation failed',
            message: 'Invalid input data',
            details: errors.array().map(error => ({
                field: error.type === 'field' ? error.path : undefined,
                message: error.msg,
                value: error.type === 'field' ? error.value : undefined
            }))
        });
    }
    next();
}
/**
 * Security headers for API responses
 */
export function apiSecurityHeaders(req, res, next) {
    // Prevent caching of sensitive API responses
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        // API-specific headers
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
    });
    next();
}
/**
 * Request logging and security monitoring
 */
export function securityLogger(req, res, next) {
    const startTime = Date.now();
    // Log suspicious patterns
    const suspiciousPatterns = [
        /\.\./, // Directory traversal
        /<script/i, // XSS attempts
        /union.*select/i, // SQL injection
        /eval\s*\(/i, // Code injection
        /javascript:/i // JavaScript protocol
    ];
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(req.url) ||
        pattern.test(JSON.stringify(req.body || {})) ||
        pattern.test(JSON.stringify(req.query)));
    if (isSuspicious) {
        logger.warn('Suspicious request detected', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            method: req.method,
            url: req.url,
            body: req.body,
            query: req.query,
            headers: req.headers
        });
    }
    // Log request completion
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.info('Request completed', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
    });
    next();
}
/**
 * Sanitize input data to prevent XSS and injection attacks
 */
export function sanitizeInput(req, res, next) {
    // Recursively sanitize object properties
    function sanitize(obj) {
        if (typeof obj === 'string') {
            // Basic XSS prevention
            return obj
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '');
        }
        else if (typeof obj === 'object' && obj !== null) {
            const sanitized = Array.isArray(obj) ? [] : {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    sanitized[key] = sanitize(obj[key]);
                }
            }
            return sanitized;
        }
        return obj;
    }
    // Sanitize request body and query parameters
    if (req.body) {
        req.body = sanitize(req.body);
    }
    if (req.query) {
        req.query = sanitize(req.query);
    }
    next();
}
/**
 * Error handling middleware for security-related errors
 */
export function securityErrorHandler(error, req, res, next) {
    // Log security-related errors
    if (error.type === 'entity.parse.failed' ||
        error.type === 'entity.too.large' ||
        error.status === 413) {
        logger.warn('Security-related error', {
            error: error.message,
            type: error.type,
            status: error.status,
            ip: req.ip,
            path: req.path
        });
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Invalid request format or size'
        });
    }
    // Pass other errors to default handler
    next(error);
}
//# sourceMappingURL=security.js.map