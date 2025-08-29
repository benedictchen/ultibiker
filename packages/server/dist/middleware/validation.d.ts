import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
export interface ValidatedRequest<TParams = any, TQuery = any, TBody = any> extends Omit<Request, 'params' | 'query' | 'body'> {
    params: TParams;
    query: TQuery;
    body: TBody;
}
export declare function validateRequest<TParams = any, TQuery = any, TBody = any>(schemas: {
    params?: z.ZodSchema<TParams>;
    query?: z.ZodSchema<TQuery>;
    body?: z.ZodSchema<TBody>;
}): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare function validateQuery<T>(schema: z.ZodSchema<T>): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare function validateBody<T>(schema: z.ZodSchema<T>): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare function validateParams<T>(schema: z.ZodSchema<T>): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare function handleValidationError(error: Error, req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
