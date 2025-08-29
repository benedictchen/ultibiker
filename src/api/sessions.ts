import { Router, Request, Response } from 'express';
import { db } from '../database/db.js';
import { sessions, sensorData } from '../database/schema.js';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

export function createSessionRoutes(): Router {
  const router = Router();

  // Get all sessions
  router.get('/', async (req: Request, res: Response) => {
    try {
      const allSessions = await db
        .select()
        .from(sessions)
        .orderBy(desc(sessions.startTime));

      res.json({
        success: true,
        data: allSessions,
        count: allSessions.length
      });
    } catch (error) {
      console.error('Error getting sessions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sessions'
      });
    }
  });

  // Create a new session
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { name, notes } = req.body;
      
      const newSession = {
        id: createId(),
        name: name || 'New Ride Session',
        notes: notes || null,
        startTime: new Date(),
        status: 'active' as const
      };

      await db.insert(sessions).values(newSession);

      res.status(201).json({
        success: true,
        data: newSession,
        message: 'Session created successfully'
      });
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create session'
      });
    }
  });

  // Get specific session
  router.get('/:sessionId', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      
      const session = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1);

      if (session.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      res.json({
        success: true,
        data: session[0]
      });
    } catch (error) {
      console.error('Error getting session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get session'
      });
    }
  });

  // Update session
  router.patch('/:sessionId', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { name, status, notes, endTime } = req.body;

      const updateData: any = {
        updatedAt: new Date()
      };

      if (name !== undefined) updateData.name = name;
      if (status !== undefined) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      if (endTime !== undefined) updateData.endTime = new Date(endTime);
      
      // Calculate duration if ending session
      if (status === 'completed' && !endTime) {
        updateData.endTime = new Date();
      }

      const updatedSessions = await db
        .update(sessions)
        .set(updateData)
        .where(eq(sessions.id, sessionId))
        .returning();

      if (updatedSessions.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      res.json({
        success: true,
        data: updatedSessions[0],
        message: 'Session updated successfully'
      });
    } catch (error) {
      console.error('Error updating session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update session'
      });
    }
  });

  // Delete session
  router.delete('/:sessionId', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      // First delete associated sensor data
      await db
        .delete(sensorData)
        .where(eq(sensorData.sessionId, sessionId));

      // Then delete the session
      const deletedSessions = await db
        .delete(sessions)
        .where(eq(sessions.id, sessionId))
        .returning();

      if (deletedSessions.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      res.json({
        success: true,
        message: 'Session deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete session'
      });
    }
  });

  // Get session sensor data
  router.get('/:sessionId/data', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { 
        metricType, 
        startTime, 
        endTime, 
        limit = '1000', 
        offset = '0' 
      } = req.query;

      // Build conditions array
      const conditions = [eq(sensorData.sessionId, sessionId)];
      
      if (metricType && typeof metricType === 'string') {
        conditions.push(eq(sensorData.metricType, metricType as any));
      }
      
      if (startTime && typeof startTime === 'string') {
        const start = new Date(startTime);
        conditions.push(gte(sensorData.timestamp, start));
      }
      
      if (endTime && typeof endTime === 'string') {
        const end = new Date(endTime);
        conditions.push(lte(sensorData.timestamp, end));
      }

      let query = db
        .select()
        .from(sensorData)
        .where(and(...conditions));

      // Add pagination
      const data = await query
        .orderBy(desc(sensorData.timestamp))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));

      res.json({
        success: true,
        data,
        count: data.length,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } catch (error) {
      console.error('Error getting session data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get session data'
      });
    }
  });

  // Get session statistics
  router.get('/:sessionId/stats', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      // Get basic session info
      const session = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1);

      if (session.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      // Get sensor data counts by metric type
      const metricCounts = await db
        .select({
          metricType: sensorData.metricType,
          count: sql<number>`COUNT(*)`
        })
        .from(sensorData)
        .where(eq(sensorData.sessionId, sessionId))
        .groupBy(sensorData.metricType);

      res.json({
        success: true,
        data: {
          session: session[0],
          metricCounts,
          totalDataPoints: metricCounts.reduce((sum, metric) => 
            sum + metric.count, 0
          )
        }
      });
    } catch (error) {
      console.error('Error getting session stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get session statistics'
      });
    }
  });

  return router;
}