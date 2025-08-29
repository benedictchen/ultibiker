# UltiBiker MVP - API Specification

## 🌐 API Architecture

The UltiBiker MVP provides both REST endpoints and WebSocket connections for real-time sensor data streaming.

```
🌐 API ARCHITECTURE

┌─────────────────────────────────────────────────────────────────────────────────┐
│                           API LAYER OVERVIEW                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ 🌐 HTTP REST API                          📡 WEBSOCKET API                     │
│ ┌─────────────────────────────────────┐   ┌─────────────────────────────────┐   │
│ │                                     │   │                                 │   │
│ │ 📱 Device Management                │   │ 🔄 Real-time Data Streams      │   │
│ │ • GET /api/devices                  │   │ • sensor-data                   │   │
│ │ • POST /api/devices/scan            │   │ • device-connected              │   │
│ │ • POST /api/devices/connect         │   │ • device-disconnected           │   │
│ │ • DELETE /api/devices/:id           │   │ • scan-started                  │   │
│ │                                     │   │ • scan-stopped                  │   │
│ │ 🏃 Session Management               │   │                                 │   │
│ │ • GET /api/sessions                 │   │ 📊 Live Updates                │   │
│ │ • POST /api/sessions                │   │ • session-started               │   │
│ │ • PUT /api/sessions/:id             │   │ • session-updated               │   │
│ │ • DELETE /api/sessions/:id          │   │ • session-ended                 │   │
│ │                                     │   │                                 │   │
│ │ 📊 Data Feed                        │   │ 🎯 Event-Driven Updates        │   │
│ │ • GET /api/data/live                │   │ • Automatic reconnection       │   │
│ │ • GET /api/data/history             │   │ • Error handling                │   │
│ │ • GET /api/data/export              │   │ • Connection status             │   │
│ │                                     │   │                                 │   │
│ └─────────────────────────────────────┘   └─────────────────────────────────┘   │
│                                                                                 │
│                          ┌─────────────────────────────────┐                   │
│                          │        MIDDLEWARE STACK         │                   │
│                          │                                 │                   │
│                          │ • CORS handling                 │                   │
│                          │ • Request validation            │                   │
│                          │ • Error handling                │                   │
│                          │ • Rate limiting                 │                   │
│                          │ • Request logging               │                   │
│                          │                                 │                   │
│                          └─────────────────────────────────┘                   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🌐 REST API Endpoints

### Base Configuration
```
Base URL: http://localhost:3000/api
Content-Type: application/json
WebSocket: ws://localhost:3000
```

## 📱 Device Management API

### GET /api/devices
Get all known devices (discovered and connected).

**Response:**
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "id": 1,
        "deviceId": "12:34:56:78:90:AB",
        "name": "Wahoo TICKR",
        "type": "heart_rate",
        "protocol": "bluetooth",
        "isConnected": true,
        "signalStrength": 85,
        "batteryLevel": 75,
        "manufacturer": "Wahoo",
        "model": "TICKR",
        "lastSeen": "2025-01-15T10:30:00Z",
        "createdAt": "2025-01-15T08:00:00Z"
      }
    ],
    "total": 1,
    "connected": 1
  }
}
```

### POST /api/devices/scan
Start or stop scanning for devices.

**Request:**
```json
{
  "action": "start" | "stop",
  "protocols": ["ant_plus", "bluetooth"] // optional, defaults to both
}
```

**Response:**
```json
{
  "success": true,
  "message": "Scanning started",
  "data": {
    "isScanning": true,
    "protocols": ["ant_plus", "bluetooth"]
  }
}
```

### POST /api/devices/connect
Connect to a discovered device.

**Request:**
```json
{
  "deviceId": "12:34:56:78:90:AB",
  "protocol": "bluetooth"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device connected successfully",
  "data": {
    "deviceId": "12:34:56:78:90:AB",
    "name": "Wahoo TICKR",
    "type": "heart_rate",
    "isConnected": true
  }
}
```

### DELETE /api/devices/:deviceId
Disconnect and remove a device.

**Response:**
```json
{
  "success": true,
  "message": "Device disconnected",
  "data": {
    "deviceId": "12:34:56:78:90:AB"
  }
}
```

## 🏃 Session Management API

### GET /api/sessions
Get all sessions with optional filtering.

**Query Parameters:**
- `status`: active | paused | completed
- `limit`: number (default: 20)
- `offset`: number (default: 0)
- `startDate`: ISO date string
- `endDate`: ISO date string

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "cuid-session-123",
        "name": "Morning Ride",
        "startTime": "2025-01-15T08:00:00Z",
        "endTime": "2025-01-15T09:30:00Z",
        "duration": 5400,
        "status": "completed",
        "distance": 25.5,
        "avgHeartRate": 158,
        "maxHeartRate": 185,
        "avgPower": 245,
        "maxPower": 420,
        "avgCadence": 88,
        "avgSpeed": 28.5,
        "energyExpenditure": 1250,
        "notes": "Great interval session"
      }
    ],
    "total": 1,
    "hasMore": false
  }
}
```

### POST /api/sessions
Create a new session.

**Request:**
```json
{
  "name": "Evening Ride", // optional
  "notes": "Recovery ride" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session created",
  "data": {
    "id": "cuid-session-456",
    "name": "Evening Ride",
    "startTime": "2025-01-15T18:00:00Z",
    "status": "active"
  }
}
```

### PUT /api/sessions/:sessionId
Update session details or status.

**Request:**
```json
{
  "name": "Updated Session Name",
  "status": "paused" | "completed",
  "notes": "Additional notes"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session updated",
  "data": {
    "id": "cuid-session-456",
    "name": "Updated Session Name",
    "status": "paused"
  }
}
```

### DELETE /api/sessions/:sessionId
Delete a session and all associated data.

**Response:**
```json
{
  "success": true,
  "message": "Session deleted",
  "data": {
    "deletedDataPoints": 1250
  }
}
```

## 📊 Data Feed API

### GET /api/data/live
Get current live sensor data for active session.

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "cuid-session-current",
    "timestamp": "2025-01-15T10:30:15Z",
    "metrics": {
      "heartRate": {
        "value": 165,
        "unit": "bpm",
        "deviceId": "12:34:56:78:90:AB",
        "quality": 95,
        "lastUpdated": "2025-01-15T10:30:15Z"
      },
      "power": {
        "value": 280,
        "unit": "watts",
        "deviceId": "ANT-1234",
        "quality": 100,
        "lastUpdated": "2025-01-15T10:30:14Z"
      },
      "cadence": {
        "value": 92,
        "unit": "rpm",
        "deviceId": "ANT-1234",
        "quality": 98,
        "lastUpdated": "2025-01-15T10:30:15Z"
      },
      "speed": {
        "value": 35.2,
        "unit": "kph",
        "deviceId": "BLE-speedsensor",
        "quality": 90,
        "lastUpdated": "2025-01-15T10:30:15Z"
      }
    }
  }
}
```

### GET /api/data/history
Get historical sensor data with filtering options.

**Query Parameters:**
- `sessionId`: specific session ID
- `deviceId`: specific device ID
- `metricType`: heart_rate | power | cadence | speed
- `startTime`: ISO date string
- `endTime`: ISO date string
- `interval`: aggregation interval (1s, 5s, 30s, 1m, 5m)
- `limit`: number of data points (default: 1000)

**Response:**
```json
{
  "success": true,
  "data": {
    "dataPoints": [
      {
        "timestamp": "2025-01-15T10:30:00Z",
        "heartRate": 162,
        "power": 275,
        "cadence": 89,
        "speed": 34.8
      },
      {
        "timestamp": "2025-01-15T10:30:01Z",
        "heartRate": 164,
        "power": 282,
        "cadence": 91,
        "speed": 35.1
      }
    ],
    "total": 3600,
    "interval": "1s",
    "hasMore": true
  }
}
```

### GET /api/data/export
Export session data in various formats.

**Query Parameters:**
- `sessionId`: required session ID
- `format`: json | csv | tcx | gpx | fit
- `metricTypes`: comma-separated list of metrics to include

**Response:**
- Content-Type varies by format
- Content-Disposition: attachment with appropriate filename

## 📡 WebSocket API

### Connection
```javascript
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('Connected to UltiBiker server');
});
```

### Event: sensor-data
Real-time sensor data updates (1Hz frequency).

**Payload:**
```json
{
  "deviceId": "12:34:56:78:90:AB",
  "type": "heart_rate",
  "value": 165,
  "unit": "bpm",
  "timestamp": "2025-01-15T10:30:15.123Z",
  "protocol": "bluetooth",
  "quality": 95,
  "sessionId": "cuid-session-current"
}
```

### Event: device-discovered
New device found during scanning.

**Payload:**
```json
{
  "deviceId": "98:76:54:32:10:FE",
  "name": "Stages Power Meter",
  "type": "power",
  "protocol": "bluetooth",
  "signalStrength": 78
}
```

### Event: device-connected / device-disconnected
Device connection status changes.

**Payload:**
```json
{
  "deviceId": "12:34:56:78:90:AB",
  "name": "Wahoo TICKR",
  "type": "heart_rate",
  "protocol": "bluetooth",
  "timestamp": "2025-01-15T10:30:15Z"
}
```

### Event: session-started / session-ended
Session lifecycle events.

**Payload:**
```json
{
  "sessionId": "cuid-session-123",
  "name": "Morning Ride",
  "timestamp": "2025-01-15T08:00:00Z",
  "connectedDevices": 3
}
```

### Event: scan-started / scan-stopped
Scanning status changes.

**Payload:**
```json
{
  "isScanning": true,
  "protocols": ["ant_plus", "bluetooth"],
  "timestamp": "2025-01-15T10:30:15Z"
}
```

## 🛠️ API Implementation

### Express Server Setup
```typescript
// src/server.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API routes
app.use('/api/devices', deviceRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/data', dataRoutes);

// WebSocket handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

export { app, server, io };
```

### Error Handling
```typescript
// Standard error response format
interface APIError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

// Error handler middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const errorResponse: APIError = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message
    },
    timestamp: new Date().toISOString()
  };
  
  res.status(500).json(errorResponse);
});
```

### Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  }
});

app.use('/api/', apiLimiter);
```

### Request Validation
```typescript
import { z } from 'zod';

const deviceConnectSchema = z.object({
  deviceId: z.string().min(1),
  protocol: z.enum(['ant_plus', 'bluetooth'])
});

// Validation middleware
const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error
        }
      });
    }
  };
};
```

This API specification provides a comprehensive interface for interacting with the UltiBiker MVP, supporting both synchronous REST operations and real-time WebSocket communication for optimal user experience.