import { Router } from 'express';
import { db } from '../database/db.js';
import { sensorData } from '../database/schema.js';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
export function createDataRoutes() {
    const router = Router();
    // Get real-time sensor data stream (latest readings)
    router.get('/live', async (req, res) => {
        try {
            const { metricType, deviceId, limit = '50' } = req.query;
            // Build where conditions array
            const conditions = [];
            if (metricType && typeof metricType === 'string') {
                conditions.push(eq(sensorData.metricType, metricType));
            }
            if (deviceId && typeof deviceId === 'string') {
                conditions.push(eq(sensorData.deviceId, deviceId));
            }
            const query = db
                .select()
                .from(sensorData)
                .where(conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : and(...conditions)) : undefined)
                .orderBy(desc(sensorData.timestamp));
            const data = await query.limit(parseInt(limit));
            res.json({
                success: true,
                data,
                count: data.length,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Error getting live data:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get live sensor data'
            });
        }
    });
    // Get sensor data with time range filtering
    router.get('/range', async (req, res) => {
        try {
            const { startTime, endTime, metricType, deviceId, limit = '1000', offset = '0' } = req.query;
            if (!startTime || !endTime) {
                return res.status(400).json({
                    success: false,
                    error: 'startTime and endTime are required'
                });
            }
            const start = new Date(startTime);
            const end = new Date(endTime);
            let conditions = [
                gte(sensorData.timestamp, start),
                lte(sensorData.timestamp, end)
            ];
            if (metricType && typeof metricType === 'string') {
                conditions.push(eq(sensorData.metricType, metricType));
            }
            if (deviceId && typeof deviceId === 'string') {
                conditions.push(eq(sensorData.deviceId, deviceId));
            }
            const data = await db
                .select()
                .from(sensorData)
                .where(and(...conditions))
                .orderBy(desc(sensorData.timestamp))
                .limit(parseInt(limit))
                .offset(parseInt(offset));
            res.json({
                success: true,
                data,
                count: data.length,
                dateRange: {
                    startTime,
                    endTime
                },
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            });
        }
        catch (error) {
            console.error('Error getting ranged data:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get sensor data for time range'
            });
        }
    });
    // Get aggregated sensor data (averages, min, max)
    router.get('/aggregate', async (req, res) => {
        try {
            const { startTime, endTime, metricType, deviceId, interval = '1m' // 1m, 5m, 15m, 1h
             } = req.query;
            if (!startTime || !endTime) {
                return res.status(400).json({
                    success: false,
                    error: 'startTime and endTime are required'
                });
            }
            const start = new Date(startTime);
            const end = new Date(endTime);
            let conditions = [
                gte(sensorData.timestamp, start),
                lte(sensorData.timestamp, end)
            ];
            if (metricType && typeof metricType === 'string') {
                conditions.push(eq(sensorData.metricType, metricType));
            }
            if (deviceId && typeof deviceId === 'string') {
                conditions.push(eq(sensorData.deviceId, deviceId));
            }
            // Get basic aggregations
            const aggregations = await db
                .select({
                metricType: sensorData.metricType,
                deviceId: sensorData.deviceId,
                count: sql `COUNT(*)`.as('count'),
                average: sql `AVG(${sensorData.value})`.as('average'),
                min: sql `MIN(${sensorData.value})`.as('min'),
                max: sql `MAX(${sensorData.value})`.as('max'),
                unit: sensorData.unit
            })
                .from(sensorData)
                .where(and(...conditions))
                .groupBy(sensorData.metricType, sensorData.deviceId, sensorData.unit);
            res.json({
                success: true,
                data: aggregations,
                count: aggregations.length,
                dateRange: {
                    startTime,
                    endTime
                },
                interval
            });
        }
        catch (error) {
            console.error('Error getting aggregated data:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get aggregated sensor data'
            });
        }
    });
    // Store sensor data (typically called by internal systems)
    router.post('/store', async (req, res) => {
        try {
            const { deviceId, sessionId, metricType, value, unit, quality = 100, rawData } = req.body;
            // Validate required fields
            if (!deviceId || !sessionId || !metricType || value === undefined || !unit) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: deviceId, sessionId, metricType, value, unit'
                });
            }
            const newReading = {
                deviceId,
                sessionId,
                timestamp: new Date(),
                metricType,
                value: parseFloat(value),
                unit,
                quality: parseInt(quality),
                rawData: rawData ? JSON.stringify(rawData) : null
            };
            await db.insert(sensorData).values(newReading);
            res.status(201).json({
                success: true,
                data: newReading,
                message: 'Sensor data stored successfully'
            });
        }
        catch (error) {
            console.error('Error storing sensor data:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to store sensor data'
            });
        }
    });
    // Get data statistics by metric type
    router.get('/stats/:metricType', async (req, res) => {
        try {
            const { metricType } = req.params;
            const { startTime, endTime, deviceId } = req.query;
            let conditions = [
                eq(sensorData.metricType, metricType)
            ];
            if (startTime && endTime) {
                conditions.push(gte(sensorData.timestamp, new Date(startTime)), lte(sensorData.timestamp, new Date(endTime)));
            }
            if (deviceId && typeof deviceId === 'string') {
                conditions.push(eq(sensorData.deviceId, deviceId));
            }
            const stats = await db
                .select({
                count: sql `COUNT(*)`.as('count'),
                average: sql `ROUND(AVG(${sensorData.value}), 2)`.as('average'),
                min: sql `MIN(${sensorData.value})`.as('min'),
                max: sql `MAX(${sensorData.value})`.as('max'),
                stddev: sql `ROUND(
            SQRT(AVG((${sensorData.value} - (SELECT AVG(${sensorData.value}) FROM ${sensorData})) * 
                     (${sensorData.value} - (SELECT AVG(${sensorData.value}) FROM ${sensorData})))), 2
          )`.as('stddev'),
                unit: sensorData.unit
            })
                .from(sensorData)
                .where(and(...conditions))
                .groupBy(sensorData.unit)
                .limit(1);
            if (stats.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: `No data found for metric type: ${metricType}`
                });
            }
            res.json({
                success: true,
                data: {
                    metricType,
                    ...stats[0],
                    filters: {
                        startTime: startTime || null,
                        endTime: endTime || null,
                        deviceId: deviceId || null
                    }
                }
            });
        }
        catch (error) {
            console.error('Error getting metric statistics:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get metric statistics'
            });
        }
    });
    return router;
}
//# sourceMappingURL=data.js.map