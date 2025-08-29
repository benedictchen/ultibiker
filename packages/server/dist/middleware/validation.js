import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
export function validateRequest(schemas) {
    return (req, res, next) => {
        try {
            // Validate params
            if (schemas.params) {
                const paramsResult = schemas.params.safeParse(req.params);
                if (!paramsResult.success) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid URL parameters',
                        details: formatZodError(paramsResult.error)
                    });
                }
                req.params = paramsResult.data;
            }
            // Validate query
            if (schemas.query) {
                const queryResult = schemas.query.safeParse(req.query);
                if (!queryResult.success) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid query parameters',
                        details: formatZodError(queryResult.error)
                    });
                }
                req.query = queryResult.data;
            }
            // Validate body
            if (schemas.body) {
                const bodyResult = schemas.body.safeParse(req.body);
                if (!bodyResult.success) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid request body',
                        details: formatZodError(bodyResult.error)
                    });
                }
                req.body = bodyResult.data;
            }
            next();
        }
        catch (error) {
            logger.error('Validation middleware error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal validation error'
            });
        }
    };
}
export function validateQuery(schema) {
    return validateRequest({ query: schema });
}
export function validateBody(schema) {
    return validateRequest({ body: schema });
}
export function validateParams(schema) {
    return validateRequest({ params: schema });
}
function formatZodError(error) {
    const formattedError = {};
    error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        if (!formattedError[path]) {
            formattedError[path] = [];
        }
        formattedError[path].push(issue.message);
    });
    return formattedError;
}
// Global error handler for validation errors
export function handleValidationError(error, req, res, next) {
    if (error instanceof ZodError) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: formatZodError(error)
        });
    }
    next(error);
}
//# sourceMappingURL=validation.js.map