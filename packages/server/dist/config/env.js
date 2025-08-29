// Environment configuration using dotenv + envalid
// Based on best practices from:
// - https://github.com/af/envalid
// - https://github.com/motdotla/dotenv
import 'dotenv/config';
import { cleanEnv, str, port, bool } from 'envalid';
// Validate and parse environment variables
export const env = cleanEnv(process.env, {
    // Server Configuration
    NODE_ENV: str({
        choices: ['development', 'production', 'test'],
        default: 'development'
    }),
    PORT: port({
        default: 3000,
        desc: 'HTTP server port'
    }),
    // Database Configuration
    DATABASE_URL: str({
        default: './data/ultibiker.db',
        desc: 'SQLite database file path'
    }),
    // Logging Configuration
    LOG_LEVEL: str({
        choices: ['error', 'warn', 'info', 'debug'],
        default: 'info',
        desc: 'Winston logging level'
    }),
    // Sentry Configuration (optional)
    SENTRY_DSN: str({
        default: '',
        desc: 'Sentry Data Source Name for error tracking'
    }),
    // Security Configuration
    JWT_SECRET: str({
        default: 'ultibiker-dev-secret-change-in-production',
        desc: 'JWT signing secret - MUST change in production'
    }),
    SESSION_SECRET: str({
        default: 'ultibiker-session-secret-change-in-production',
        desc: 'Express session secret - MUST change in production'
    }),
    // Redis Configuration (optional)
    REDIS_URL: str({
        default: 'redis://localhost:6379',
        desc: 'Redis connection URL for caching and sessions'
    }),
    REDIS_ENABLED: bool({
        default: false,
        desc: 'Enable Redis for caching and distributed rate limiting'
    }),
    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: str({
        default: '900000', // 15 minutes
        desc: 'Rate limiting window in milliseconds'
    }),
    RATE_LIMIT_MAX_REQUESTS: str({
        default: '100',
        desc: 'Maximum requests per window'
    }),
    // CORS Configuration
    CORS_ORIGIN: str({
        default: '*',
        desc: 'CORS allowed origins (comma-separated for multiple)'
    }),
    // Health Check
    HEALTH_CHECK_TOKEN: str({
        default: 'health-check-token-change-in-production',
        desc: 'Token for authenticated health checks'
    }),
    // Development flags
    ENABLE_DEV_LOGGING: bool({
        default: true,
        desc: 'Enable detailed logging for development'
    }),
    ENABLE_API_DOCS: bool({
        default: true,
        desc: 'Enable Swagger API documentation'
    }),
    // Optional: Third-party API keys
    STRAVA_CLIENT_ID: str({
        default: '',
        desc: 'Strava OAuth client ID'
    }),
    STRAVA_CLIENT_SECRET: str({
        default: '',
        desc: 'Strava OAuth client secret'
    }),
    // Performance monitoring
    ENABLE_PROFILING: bool({
        default: false,
        desc: 'Enable Sentry performance profiling'
    })
}, {
    // Reporter configuration
    reporter: (opts) => {
        const { errors, env: validatedEnv } = opts;
        if (Object.keys(errors).length > 0) {
            console.error('❌ Environment validation failed:');
            Object.entries(errors).forEach(([key, error]) => {
                console.error(`  ${key}: ${error}`);
            });
            process.exit(1);
        }
        else {
            console.log('✅ Environment variables validated successfully');
            // Log configuration in development
            if (validatedEnv.NODE_ENV === 'development' && validatedEnv.ENABLE_DEV_LOGGING) {
                console.log('🔧 Configuration:');
                console.log(`  Environment: ${validatedEnv.NODE_ENV}`);
                console.log(`  Port: ${validatedEnv.PORT}`);
                console.log(`  Database: ${validatedEnv.DATABASE_URL}`);
                console.log(`  Log Level: ${validatedEnv.LOG_LEVEL}`);
                console.log(`  Redis Enabled: ${validatedEnv.REDIS_ENABLED}`);
                console.log(`  API Docs: ${validatedEnv.ENABLE_API_DOCS}`);
                // Show warnings for default secrets in development
                if (validatedEnv.JWT_SECRET.includes('dev-secret')) {
                    console.warn('⚠️  Using default JWT_SECRET - change for production!');
                }
                if (validatedEnv.SESSION_SECRET.includes('session-secret')) {
                    console.warn('⚠️  Using default SESSION_SECRET - change for production!');
                }
            }
        }
    }
});
// Helper functions for common configurations
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';
// Database configuration object
export const dbConfig = {
    url: env.DATABASE_URL,
    options: {
        // SQLite-specific options
        verbose: isDevelopment && env.ENABLE_DEV_LOGGING,
        fileMustExist: false
    }
};
// CORS configuration
export const corsConfig = {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map(o => o.trim()),
    credentials: true,
    optionsSuccessStatus: 200
};
// Rate limiting configuration
export const rateLimitConfig = {
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS),
    max: parseInt(env.RATE_LIMIT_MAX_REQUESTS),
    message: {
        error: 'Too many requests from this IP',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(parseInt(env.RATE_LIMIT_WINDOW_MS) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false
};
// Sentry configuration
export const sentryConfig = {
    dsn: env.SENTRY_DSN || undefined,
    environment: env.NODE_ENV,
    tracesSampleRate: isProduction ? 0.1 : 1.0,
    profilesSampleRate: env.ENABLE_PROFILING ? (isProduction ? 0.1 : 1.0) : 0,
    beforeSend: (event) => {
        // Filter out development noise in production
        if (isProduction && event.level === 'info') {
            return null;
        }
        return event;
    }
};
// Redis configuration
export const redisConfig = env.REDIS_ENABLED ? {
    url: env.REDIS_URL,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true
} : null;
export default env;
//# sourceMappingURL=env.js.map