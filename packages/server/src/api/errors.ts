import express, { Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ClientError {
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

export function createErrorRoutes(): express.Router {
  const router = express.Router();

  router.post('/report', async (req: Request, res: Response) => {
    try {
      const errorData: ClientError = {
        message: req.body.message || 'Unknown error',
        stack: req.body.stack,
        url: req.body.url,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
        severity: req.body.severity || 'medium',
        context: req.body.context || {}
      };

      const logDir = path.join(__dirname, '../../logs');
      await fs.mkdir(logDir, { recursive: true });

      const errorLogFile = path.join(logDir, 'client-errors.log');
      const logEntry = JSON.stringify(errorData) + '\n';
      
      await fs.appendFile(errorLogFile, logEntry);

      logger.error('Client error reported', new Error(errorData.message), {
        category: 'client-error',
        url: errorData.url,
        userAgent: errorData.userAgent,
        severity: errorData.severity,
        context: errorData.context,
        stack: errorData.stack
      });

      res.json({ success: true, message: 'Error reported successfully' });
    } catch (error) {
      logger.error('Failed to process error report', error as Error);
      res.status(500).json({ success: false, message: 'Failed to process error report' });
    }
  });

  router.get('/logs', async (req: Request, res: Response) => {
    try {
      const logDir = path.join(__dirname, '../../logs');
      const errorLogFile = path.join(logDir, 'client-errors.log');
      
      try {
        const logContent = await fs.readFile(errorLogFile, 'utf-8');
        const lines = logContent.trim().split('\n').filter(line => line);
        const errors = lines.map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return { message: line, timestamp: new Date().toISOString() };
          }
        });
        
        const limit = parseInt(req.query.limit as string) || 100;
        const recentErrors = errors.slice(-limit).reverse();
        
        res.json({ errors: recentErrors, total: errors.length });
      } catch (fileError) {
        res.json({ errors: [], total: 0 });
      }
    } catch (error) {
      logger.error('Failed to retrieve error logs', error as Error);
      res.status(500).json({ success: false, message: 'Failed to retrieve error logs' });
    }
  });

  return router;
}