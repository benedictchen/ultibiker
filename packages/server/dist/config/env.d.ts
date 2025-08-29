import 'dotenv/config';
export declare const env: Readonly<{
    NODE_ENV: "production" | "development" | "test";
    PORT: number;
    DATABASE_URL: string;
    LOG_LEVEL: "debug" | "error" | "info" | "warn";
    SENTRY_DSN: string;
    JWT_SECRET: string;
    SESSION_SECRET: string;
    REDIS_URL: string;
    REDIS_ENABLED: boolean;
    RATE_LIMIT_WINDOW_MS: string;
    RATE_LIMIT_MAX_REQUESTS: string;
    CORS_ORIGIN: string;
    HEALTH_CHECK_TOKEN: string;
    ENABLE_DEV_LOGGING: boolean;
    ENABLE_API_DOCS: boolean;
    STRAVA_CLIENT_ID: string;
    STRAVA_CLIENT_SECRET: string;
    ENABLE_PROFILING: boolean;
} & import("envalid").CleanedEnvAccessors>;
export declare const isProduction: boolean;
export declare const isDevelopment: boolean;
export declare const isTest: boolean;
export declare const dbConfig: {
    url: string;
    options: {
        verbose: boolean;
        fileMustExist: boolean;
    };
};
export declare const corsConfig: {
    origin: boolean | string[];
    credentials: boolean;
    optionsSuccessStatus: number;
};
export declare const rateLimitConfig: {
    windowMs: number;
    max: number;
    message: {
        error: string;
        code: string;
        retryAfter: number;
    };
    standardHeaders: boolean;
    legacyHeaders: boolean;
};
export declare const sentryConfig: {
    dsn: string | undefined;
    environment: "production" | "development" | "test";
    tracesSampleRate: number;
    profilesSampleRate: number;
    beforeSend: (event: any) => any;
};
export declare const redisConfig: {
    url: string;
    retryDelayOnFailover: number;
    maxRetriesPerRequest: number;
    lazyConnect: boolean;
} | null;
export default env;
