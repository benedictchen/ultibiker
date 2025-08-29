import { eq } from 'drizzle-orm';
import { db } from '../database/db.js';
import { sessions, sensorData } from '../database/schema.js';
import { crashLogger } from './crash-logger.js';
export class SessionManager {
    currentSessionId = null;
    async startSession(name) {
        try {
            const session = await db.insert(sessions).values({
                name: name || 'New Ride Session',
                status: 'active'
            }).returning();
            this.currentSessionId = session[0].id;
            console.log(`🚴 Started session: ${session[0].name} (${session[0].id})`);
            // Log session start
            crashLogger.logSession({
                sessionId: session[0].id,
                event: 'session_started',
                timestamp: new Date().toISOString(),
                data: {
                    name: session[0].name,
                    startTime: session[0].startTime
                }
            });
            return session[0].id;
        }
        catch (error) {
            console.error('❌ Failed to start session:', error);
            // Log session start failure
            crashLogger.logError({
                type: 'error',
                severity: 'high',
                message: `Failed to start session: ${error instanceof Error ? error.message : 'Unknown error'}`,
                stack: error instanceof Error ? error.stack : undefined,
                context: { sessionName: name || 'New Ride Session' }
            });
            throw error;
        }
    }
    async endSession(sessionId) {
        try {
            const endTime = new Date();
            const sessionData = await this.getSessionData(sessionId);
            if (!sessionData) {
                throw new Error(`Session not found: ${sessionId}`);
            }
            const updates = {
                endTime,
                duration: sessionData.startTime ? Math.floor((endTime.getTime() - sessionData.startTime.getTime()) / 1000) : 0,
                status: 'completed',
                ...await this.calculateSessionMetrics(sessionId)
            };
            await db
                .update(sessions)
                .set(updates)
                .where(eq(sessions.id, sessionId));
            if (this.currentSessionId === sessionId) {
                this.currentSessionId = null;
            }
            console.log(`🏁 Ended session: ${sessionData.name} (${sessionId})`);
            console.log(`📊 Duration: ${updates.duration}s, Metrics calculated`);
        }
        catch (error) {
            console.error('❌ Failed to end session:', error);
            throw error;
        }
    }
    async pauseSession(sessionId) {
        try {
            await db
                .update(sessions)
                .set({ status: 'paused' })
                .where(eq(sessions.id, sessionId));
            console.log(`⏸️  Paused session: ${sessionId}`);
        }
        catch (error) {
            console.error('❌ Failed to pause session:', error);
            throw error;
        }
    }
    async resumeSession(sessionId) {
        try {
            await db
                .update(sessions)
                .set({ status: 'active' })
                .where(eq(sessions.id, sessionId));
            console.log(`▶️  Resumed session: ${sessionId}`);
        }
        catch (error) {
            console.error('❌ Failed to resume session:', error);
            throw error;
        }
    }
    getCurrentSessionId() {
        return this.currentSessionId;
    }
    async getActiveSession() {
        try {
            const activeSessions = await db
                .select()
                .from(sessions)
                .where(eq(sessions.status, 'active'))
                .limit(1);
            return activeSessions[0] || null;
        }
        catch (error) {
            console.error('❌ Failed to get active session:', error);
            return null;
        }
    }
    async getSessionData(sessionId) {
        try {
            const session = await db
                .select()
                .from(sessions)
                .where(eq(sessions.id, sessionId))
                .limit(1);
            return session[0] || null;
        }
        catch (error) {
            console.error('❌ Failed to get session data:', error);
            return null;
        }
    }
    async addSensorReading(reading) {
        try {
            await db.insert(sensorData).values({
                deviceId: reading.deviceId,
                sessionId: reading.sessionId,
                timestamp: reading.timestamp,
                metricType: reading.metricType,
                value: reading.value,
                unit: reading.unit,
                quality: reading.quality,
                rawData: reading.rawData ? JSON.stringify(reading.rawData) : null
            });
            console.log(`💾 Stored sensor reading: ${reading.metricType} = ${reading.value} ${reading.unit}`);
        }
        catch (error) {
            console.error('❌ Failed to store sensor reading:', error);
            throw error;
        }
    }
    async getSessionSensorData(sessionId) {
        try {
            return await db
                .select()
                .from(sensorData)
                .where(eq(sensorData.sessionId, sessionId));
        }
        catch (error) {
            console.error('❌ Failed to get session sensor data:', error);
            return [];
        }
    }
    async calculateSessionMetrics(sessionId) {
        try {
            // Get all sensor data for this session
            const sessionReadings = await db
                .select()
                .from(sensorData)
                .where(eq(sensorData.sessionId, sessionId));
            const metrics = {
                avgHeartRate: null,
                maxHeartRate: null,
                avgPower: null,
                maxPower: null,
                avgCadence: null,
                avgSpeed: null,
                maxSpeed: null
            };
            // Calculate heart rate metrics
            const hrReadings = sessionReadings.filter(r => r.metricType === 'heart_rate');
            if (hrReadings.length > 0) {
                metrics.avgHeartRate = Math.round(hrReadings.reduce((sum, r) => sum + r.value, 0) / hrReadings.length);
                metrics.maxHeartRate = Math.max(...hrReadings.map(r => r.value));
            }
            // Calculate power metrics
            const powerReadings = sessionReadings.filter(r => r.metricType === 'power');
            if (powerReadings.length > 0) {
                metrics.avgPower = Math.round(powerReadings.reduce((sum, r) => sum + r.value, 0) / powerReadings.length);
                metrics.maxPower = Math.max(...powerReadings.map(r => r.value));
            }
            // Calculate cadence metrics
            const cadenceReadings = sessionReadings.filter(r => r.metricType === 'cadence');
            if (cadenceReadings.length > 0) {
                metrics.avgCadence = Math.round(cadenceReadings.reduce((sum, r) => sum + r.value, 0) / cadenceReadings.length);
            }
            // Calculate speed metrics
            const speedReadings = sessionReadings.filter(r => r.metricType === 'speed');
            if (speedReadings.length > 0) {
                metrics.avgSpeed = Math.round((speedReadings.reduce((sum, r) => sum + r.value, 0) / speedReadings.length) * 100) / 100;
                metrics.maxSpeed = Math.round(Math.max(...speedReadings.map(r => r.value)) * 100) / 100;
            }
            console.log(`📊 Calculated metrics:`, {
                heartRate: metrics.avgHeartRate ? `${metrics.avgHeartRate}/${metrics.maxHeartRate} BPM` : 'N/A',
                power: metrics.avgPower ? `${metrics.avgPower}/${metrics.maxPower}W` : 'N/A',
                cadence: metrics.avgCadence ? `${metrics.avgCadence} RPM` : 'N/A',
                speed: metrics.avgSpeed ? `${metrics.avgSpeed}/${metrics.maxSpeed} km/h` : 'N/A'
            });
            return metrics;
        }
        catch (error) {
            console.error('❌ Failed to calculate session metrics:', error);
            return {
                avgHeartRate: null,
                maxHeartRate: null,
                avgPower: null,
                maxPower: null,
                avgCadence: null,
                avgSpeed: null,
                maxSpeed: null
            };
        }
    }
    async getAllSessions() {
        try {
            return await db
                .select()
                .from(sessions)
                .orderBy(sessions.startTime);
        }
        catch (error) {
            console.error('❌ Failed to get all sessions:', error);
            return [];
        }
    }
    async deleteSession(sessionId) {
        try {
            // First delete all associated sensor data
            await db
                .delete(sensorData)
                .where(eq(sensorData.sessionId, sessionId));
            // Then delete the session
            const deletedSessions = await db
                .delete(sessions)
                .where(eq(sessions.id, sessionId))
                .returning();
            if (deletedSessions.length > 0) {
                console.log(`🗑️  Deleted session: ${sessionId}`);
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('❌ Failed to delete session:', error);
            return false;
        }
    }
}
//# sourceMappingURL=session-manager.js.map