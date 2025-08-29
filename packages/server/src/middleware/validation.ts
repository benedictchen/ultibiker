import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export interface ValidatedRequest<
  TParams = any,
  TQuery = any,
  TBody = any
> extends Omit<Request, 'params' | 'query' | 'body'> {
  params: TParams;
  query: TQuery;
  body: TBody;
}

export function validateRequest<
  TParams = any,
  TQuery = any, 
  TBody = any
>(schemas: {
  params?: z.ZodSchema<TParams>;
  query?: z.ZodSchema<TQuery>;
  body?: z.ZodSchema<TBody>;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
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
        (req as any).params = paramsResult.data;
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
        (req as any).query = queryResult.data;
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
    } catch (error) {
      logger.error('Validation middleware error:', error as Error);
      res.status(500).json({
        success: false,
        error: 'Internal validation error'
      });
    }
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return validateRequest({ query: schema });
}

export function validateBody<T>(schema: z.ZodSchema<T>) {
  return validateRequest({ body: schema });
}

export function validateParams<T>(schema: z.ZodSchema<T>) {
  return validateRequest({ params: schema });
}

function formatZodError(error: ZodError): Record<string, string[]> {
  const formattedError: Record<string, string[]> = {};
  
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
export function handleValidationError(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: formatZodError(error)
    });
  }
  
  next(error);
}