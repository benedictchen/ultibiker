import { ValidationChain } from 'express-validator';
import { Request, Response, NextFunction, Application } from 'express';
/**
 * Security Middleware Configuration
 * Implements production-ready security practices using third-party libraries
 */
export interface SecurityConfig {
    cors?: {
        origin?: string | string[] | boolean;
        credentials?: boolean;
    };
    rateLimit?: {
        windowMs?: number;
        max?: number;
    };
    compression?: boolean;
    helmet?: boolean;
}
/**
 * Configure comprehensive security middleware stack
 */
export declare function setupSecurityMiddleware(app: Application, config?: SecurityConfig): void;
/**
 * Input Validation Schemas using express-validator
 */
export declare const validators: {
    createSession: ValidationChain[];
    connectDevice: ValidationChain[];
    exportData: ValidationChain[];
    validateId: ValidationChain[];
};
/**
 * Validation error handler middleware
 */
export declare function handleValidationErrors(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
/**
 * Security headers for API responses
 */
export declare function apiSecurityHeaders(req: Request, res: Response, next: NextFunction): void;
/**
 * Request logging and security monitoring
 */
export declare function securityLogger(req: Request, res: Response, next: NextFunction): void;
/**
 * Sanitize input data to prevent XSS and injection attacks
 */
export declare function sanitizeInput(req: Request, res: Response, next: NextFunction): void;
/**
 * Error handling middleware for security-related errors
 */
export declare function securityErrorHandler(error: any, req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
