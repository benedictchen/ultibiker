import winston from 'winston';
import * as Sentry from '@sentry/node';
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
declare class UltiBikerLogger {
    private winston;
    private config;
    constructor(config: LoggerConfig);
    private setupSentry;
    private createWinstonLogger;
    debug(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    error(message: string, error?: Error, meta?: any): void;
    sensor(message: string, sensorData?: any): void;
    performance(message: string, metrics?: any): void;
    security(message: string, securityData?: any): void;
    api(message: string, requestData?: any): void;
    database(message: string, queryData?: any): void;
    websocket(message: string, socketData?: any): void;
    session(message: string, sessionData?: any): void;
    profile(id: string): winston.Logger;
    startTimer(label: string): {
        end: () => number;
    };
    health(message: string, healthData?: any): void;
    shutdown(): Promise<void>;
}
export declare const logger: UltiBikerLogger;
export { Sentry };
export declare const morganStream: {
    write: (message: string) => void;
};
export default logger;
