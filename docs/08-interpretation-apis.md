# UltiBiker MVP - Data Interpretation APIs

## 🧠 Interpretation Layer Overview

The interpretation layer provides different views of the collected sensor data, allowing clients to choose between raw data (everything) or processed views (deduplicated, analyzed, cleaned).

```
🧠 DATA INTERPRETATION ARCHITECTURE

┌─────────────────────────────────────────────────────────────────────────────────┐
│                          INTERPRETATION LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ 📊 RAW DATA VIEW                          🧹 PROCESSED VIEWS                   │
│ ┌─────────────────────────────────────┐   ┌─────────────────────────────────┐   │
│ │                                     │   │                                 │   │
│ │ • ALL readings from ALL devices     │   │ 🔍 Deduplicated View            │   │
│ │ • Complete attribution metadata     │   │ • One reading per fingerprint   │   │
│ │ • Full timestamps                   │   │ • Earliest/best source selected │   │
│ │ • Network/quality information       │   │ • Quality-based ranking         │   │
│ │ • No filtering or processing        │   │                                 │   │
│ │                                     │   │ 📈 Analytics View               │   │
│ │ Use cases:                          │   │ • Aggregated metrics            │   │
│ │ • Debugging connectivity issues     │   │ • Device performance stats      │   │
│ │ • Audit trails                      │   │ • Network reliability analysis  │   │
│ │ • Data export for analysis          │   │                                 │   │
│ │ • Machine learning training         │   │ 🧮 Statistical View             │   │
│ │                                     │   │ • Moving averages              │   │
│ └─────────────────────────────────────┘   │ • Smoothed data streams         │   │
│                                           │ • Outlier detection/removal     │   │
│                            │               │                                 │   │
│                            ▼               └─────────────────────────────────┘   │
│                                                                                 │
│ 🔄 REAL-TIME STREAM PROCESSING                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────┐   │
│ │ WebSocket streams can be configured for different interpretation modes: │   │
│ │                                                                         │   │
│ │ • raw: Send ALL readings as they arrive                                │   │
│ │ • deduplicated: Send only unique readings (first source wins)          │   │
│ │ • best_quality: Send reading from highest quality source               │   │
│ │ • analytics: Send processed/smoothed data                              │   │
│ └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🌐 Interpretation API Endpoints

### GET /api/data/raw
Get completely unfiltered sensor data with full attribution.

**Query Parameters:**
- `sessionId`: Filter by session
- `deviceId`: Filter by sensor device ID  
- `sourceDeviceId`: Filter by reporting device
- `sensorType`: Filter by metric type
- `startTime`: ISO8601 start time
- `endTime`: ISO8601 end time
- `limit`: Maximum results (default: 1000)

**Response:**
```json
{
  "success": true,
  "interpretation": "raw",
  "data": {
    "readings": [
      {
        "id": 12345,
        "deviceId": "ANT-12345",
        "sensorType": "heart_rate",
        "value": 165,
        "unit": "bpm",
        
        "sensorTimestamp": "2025-01-15T10:30:15.000Z",
        "deviceReceivedAt": "2025-01-15T10:30:15.123Z",
        "serverReceivedAt": "2025-01-15T10:30:15.890Z",
        
        "sourceDevice": {
          "id": "iphone-john-123",
          "name": "John's iPhone",
          "type": "mobile",
          "platform": "iOS",
          "appVersion": "1.0.0",
          "location": {
            "latitude": 51.5074,
            "longitude": -0.1278,
            "accuracy": 5
          }
        },
        
        "networkInfo": {
          "type": "wifi",
          "quality": "excellent",
          "uploadBandwidthMbps": 50.2
        },
        
        "timing": {
          "uploadDelayMs": 767,
          "processingDelayMs": 12
        },
        
        "quality": {
          "score": 95,
          "signalStrength": 87
        },
        
        "readingFingerprint": "a7f3d2e1c9b8a6f4...",
        "sessionId": "session-uuid-123",
        "userId": "user-uuid-456"
      },
      // More readings...
    ],
    "metadata": {
      "totalReadings": 15847,
      "uniqueFingerprints": 3962,
      "duplicationRate": 0.75,
      "sourceDevices": ["iphone-john-123", "macbook-john-456", "garmin-edge-789"],
      "timeRange": {
        "start": "2025-01-15T10:00:00.000Z",
        "end": "2025-01-15T11:30:00.000Z"
      }
    }
  }
}
```

### GET /api/data/deduplicated  
Get sensor data with duplicates resolved using configurable strategies.

**Query Parameters:**
- Same as `/raw` plus:
- `strategy`: `first_source` | `best_quality` | `latest` | `consensus`
- `qualityThreshold`: Minimum quality score (0-100)

**Response:**
```json
{
  "success": true,
  "interpretation": "deduplicated",
  "strategy": "best_quality", 
  "data": {
    "readings": [
      {
        "id": 12345,
        "deviceId": "ANT-12345", 
        "sensorType": "heart_rate",
        "value": 165,
        "unit": "bpm",
        "timestamp": "2025-01-15T10:30:15.000Z",
        
        "selectedSource": {
          "device": "John's iPhone",
          "reason": "highest_quality_score",
          "qualityScore": 95
        },
        
        "alternativeSources": [
          {
            "device": "Training MacBook",
            "qualityScore": 89,
            "timeDifference": 66
          },
          {
            "device": "Garmin Edge 530", 
            "qualityScore": 82,
            "timeDifference": 156
          }
        ],
        
        "readingFingerprint": "a7f3d2e1c9b8a6f4...",
        "duplicateCount": 3
      }
    ],
    "metadata": {
      "originalReadings": 15847,
      "deduplicatedReadings": 3962,
      "compressionRatio": 0.25,
      "strategy": "best_quality",
      "qualityThreshold": 70
    }
  }
}
```

### GET /api/data/analytics
Get processed analytics with statistical analysis and quality metrics.

**Response:**
```json
{
  "success": true,
  "interpretation": "analytics",
  "data": {
    "session": {
      "id": "session-uuid-123",
      "duration": 5400,
      "totalDataPoints": 3962
    },
    
    "devicePerformance": {
      "iphone-john-123": {
        "name": "John's iPhone",
        "readingsReported": 3962,
        "primaryReadings": 1587,
        "primaryRate": 0.40,
        "averageQuality": 94.2,
        "averageUploadDelay": 1247,
        "reliabilityScore": 0.89
      },
      "macbook-john-456": {
        "name": "Training MacBook", 
        "readingsReported": 3958,
        "primaryReadings": 1203,
        "primaryRate": 0.30,
        "averageQuality": 91.7,
        "averageUploadDelay": 892,
        "reliabilityScore": 0.92
      },
      "garmin-edge-789": {
        "name": "Garmin Edge 530",
        "readingsReported": 3945,
        "primaryReadings": 1172,
        "primaryRate": 0.30,
        "averageQuality": 88.3,
        "averageUploadDelay": 2156,
        "reliabilityScore": 0.85
      }
    },
    
    "sensorMetrics": {
      "heart_rate": {
        "readings": 1321,
        "average": 158.4,
        "max": 189,
        "min": 142,
        "duplicateRate": 0.74,
        "dataGaps": 3,
        "maxGapDuration": 12
      }
    },
    
    "networkAnalysis": {
      "wifi": {
        "readingCount": 8745,
        "averageUploadDelay": 934,
        "reliabilityScore": 0.94
      },
      "cellular": {
        "readingCount": 7102,
        "averageUploadDelay": 1456,
        "reliabilityScore": 0.87
      }
    }
  }
}
```

## 🔄 WebSocket Interpretation Modes

### Connection with Interpretation Mode
```javascript
const socket = io('http://localhost:3000', {
  query: {
    interpretation: 'deduplicated',  // raw | deduplicated | analytics
    strategy: 'best_quality',        // for deduplicated mode
    qualityThreshold: 80             // minimum quality for processing
  }
});

// Different event types based on interpretation mode
socket.on('sensor-data-raw', (data) => {
  // Receives ALL readings with full attribution
  console.log('Raw reading from:', data.sourceDevice.name);
});

socket.on('sensor-data-deduplicated', (data) => {
  // Receives only unique readings with source selection info
  console.log('Unique reading, selected from:', data.selectedSource.device);
});

socket.on('sensor-data-analytics', (data) => {
  // Receives processed metrics and quality scores
  console.log('Analytics update:', data.metrics);
});
```

## 🧮 Deduplication Strategies

### Strategy Implementation
```typescript
// src/services/interpretation-service.ts
export class InterpretationService {
  
  async getDeduplicatedReadings(
    fingerprint: string, 
    strategy: DeduplicationStrategy
  ): Promise<SensorReading> {
    
    // Get all readings with the same fingerprint
    const duplicateReadings = await db
      .select()
      .from(sensorData)
      .where(eq(sensorData.readingFingerprint, fingerprint))
      .orderBy(asc(sensorData.serverReceivedAt));
    
    if (duplicateReadings.length === 1) {
      return duplicateReadings[0];
    }
    
    // Apply deduplication strategy
    switch (strategy) {
      case 'first_source':
        return duplicateReadings[0]; // Earliest received
        
      case 'best_quality':
        return duplicateReadings.reduce((best, current) => 
          current.qualityScore > best.qualityScore ? current : best
        );
        
      case 'latest':
        return duplicateReadings[duplicateReadings.length - 1];
        
      case 'consensus':
        return this.calculateConsensusReading(duplicateReadings);
        
      default:
        return duplicateReadings[0];
    }
  }
  
  private calculateConsensusReading(readings: SensorReading[]): SensorReading {
    // For consensus, use the median value and best quality source
    const values = readings.map(r => r.value).sort((a, b) => a - b);
    const medianValue = values[Math.floor(values.length / 2)];
    
    // Find reading closest to median value
    const consensusReading = readings.reduce((closest, current) => {
      const currentDiff = Math.abs(current.value - medianValue);
      const closestDiff = Math.abs(closest.value - medianValue);
      return currentDiff < closestDiff ? current : closest;
    });
    
    return {
      ...consensusReading,
      value: medianValue, // Use consensus value
      metadata: {
        ...consensusReading.metadata,
        consensusType: 'median',
        sourceReadings: readings.length
      }
    };
  }
}
```

### Real-time Stream Processing
```typescript
// src/websocket/interpretation-handler.ts
export class InterpretationHandler {
  
  async handleNewReading(reading: SensorReading, socketConnections: Map<string, any>) {
    
    // Always store the raw reading
    await this.storeRawReading(reading);
    
    // Process for each connected client based on their interpretation preferences
    for (const [socketId, connection] of socketConnections) {
      const { interpretation, strategy, qualityThreshold } = connection.preferences;
      
      switch (interpretation) {
        case 'raw':
          connection.socket.emit('sensor-data-raw', reading);
          break;
          
        case 'deduplicated':
          const isUnique = await this.checkIfUniqueReading(reading.readingFingerprint);
          if (isUnique || this.shouldOverrideWithBetterQuality(reading, strategy)) {
            const deduplicatedReading = await this.buildDeduplicatedReading(reading);
            connection.socket.emit('sensor-data-deduplicated', deduplicatedReading);
          }
          break;
          
        case 'analytics':
          const analyticsUpdate = await this.calculateAnalyticsUpdate(reading);
          connection.socket.emit('sensor-data-analytics', analyticsUpdate);
          break;
      }
    }
  }
  
  private async checkIfUniqueReading(fingerprint: string): Promise<boolean> {
    // Check if we've seen this fingerprint in recent readings
    const recentDuplicate = await db
      .select()
      .from(sensorData)
      .where(
        and(
          eq(sensorData.readingFingerprint, fingerprint),
          gte(sensorData.serverReceivedAt, new Date(Date.now() - 5000)) // Last 5 seconds
        )
      )
      .limit(1);
      
    return recentDuplicate.length === 0;
  }
}
```

## 📊 Interpretation Query Examples

### Complex Analytics Query
```sql
-- Get device performance analytics for a session
SELECT 
  source_device_name,
  source_platform,
  COUNT(*) as total_readings,
  COUNT(DISTINCT reading_fingerprint) as unique_readings,
  AVG(quality_score) as avg_quality,
  AVG(upload_delay_ms) as avg_upload_delay,
  AVG(CASE WHEN network_quality = 'excellent' THEN 100
           WHEN network_quality = 'good' THEN 75
           WHEN network_quality = 'fair' THEN 50
           WHEN network_quality = 'poor' THEN 25
           ELSE 0 END) as avg_network_score
FROM sensor_data 
WHERE session_id = 'session-uuid-123'
GROUP BY source_device_name, source_platform
ORDER BY avg_quality DESC;
```

### Deduplication Analysis
```sql
-- Analyze duplication patterns by fingerprint
SELECT 
  reading_fingerprint,
  COUNT(*) as duplicate_count,
  COUNT(DISTINCT source_device_id) as reporting_devices,
  MIN(server_received_at) as first_received,
  MAX(server_received_at) as last_received,
  MAX(server_received_at) - MIN(server_received_at) as spread_ms,
  AVG(quality_score) as avg_quality
FROM sensor_data
WHERE session_id = 'session-uuid-123'
  AND device_received_at BETWEEN '2025-01-15T10:30:00Z' AND '2025-01-15T10:31:00Z'
GROUP BY reading_fingerprint
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
```

This interpretation layer ensures that all data is preserved while providing flexible, meaningful views for different use cases - from detailed debugging to real-time dashboard displays.