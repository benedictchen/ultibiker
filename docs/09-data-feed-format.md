# UltiBiker MVP - Data Feed Format & Sensor Registry

## 📊 Developer-Friendly Data Feed Design

Instead of repeating sensor metadata in every data point, UltiBiker uses a **sensor registry/legend** approach where each data feed includes a registry of sensors, and individual readings reference sensors by ID.

```
📊 EFFICIENT DATA FEED ARCHITECTURE

┌─────────────────────────────────────────────────────────────────────────────────┐
│                          SENSOR REGISTRY + DATA FEED                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ 📋 SENSOR REGISTRY (sent once or when changed)                                 │
│ ┌─────────────────────────────────────────────────────────────────────────┐   │
│ │ {                                                                       │   │
│ │   "sensors": {                                                          │   │
│ │     "hr1": {                                                            │   │
│ │       "id": "hr1",                                                      │   │
│ │       "deviceId": "ANT-12345",                                          │   │
│ │       "type": "heart_rate",                                             │   │
│ │       "name": "Wahoo TICKR",                                            │   │
│ │       "unit": "bpm",                                                    │   │
│ │       "protocol": "ant_plus",                                           │   │
│ │       "manufacturer": "Wahoo",                                          │   │
│ │       "model": "TICKR Gen 2"                                            │   │
│ │     },                                                                  │   │
│ │     "pwr1": {                                                           │   │
│ │       "id": "pwr1",                                                     │   │
│ │       "deviceId": "ANT-67890",                                          │   │
│ │       "type": "power",                                                  │   │
│ │       "name": "Stages Power Meter",                                     │   │
│ │       "unit": "watts",                                                  │   │
│ │       "protocol": "ant_plus"                                            │   │
│ │     },                                                                  │   │
│ │     "cad1": { ... }                                                     │   │
│ │   },                                                                    │   │
│ │   "sources": { ... },                                                   │   │
│ │   "session": { ... }                                                    │   │
│ │ }                                                                       │   │
│ └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│                                    ▼                                            │
│                                                                                 │
│ 🔄 COMPACT DATA STREAM (sent continuously)                                     │
│ ┌─────────────────────────────────────────────────────────────────────────┐   │
│ │ {                                                                       │   │
│ │   "timestamp": "2025-01-15T10:30:15.123Z",                             │   │
│ │   "readings": [                                                         │   │
│ │     { "s": "hr1", "v": 165, "q": 95, "t": 0 },                         │   │
│ │     { "s": "pwr1", "v": 280, "q": 100, "t": 50 },                      │   │
│ │     { "s": "cad1", "v": 92, "q": 98, "t": 100 }                        │   │
│ │   ]                                                                     │   │
│ │ }                                                                       │   │
│ │                                                                         │   │
│ │ Legend:                                                                 │   │
│ │ • s = sensor ID (references registry)                                  │   │
│ │ • v = value                                                             │   │
│ │ • q = quality score                                                     │   │
│ │ • t = time offset (ms from base timestamp)                             │   │
│ └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│ ✅ Benefits:                                                                   │
│ • 90% reduction in payload size                                                │
│ • Clean separation of metadata vs data                                        │
│ • Easy to parse and process                                                    │
│ • Efficient for real-time streaming                                           │
│ • Perfect for third-party developers                                          │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 📋 Sensor Registry Format

### Complete Registry Structure
```typescript
// Sensor Registry Response
interface SensorRegistry {
  metadata: {
    registryVersion: string;        // "v1.2.3" - for cache invalidation
    lastUpdated: string;            // ISO8601 timestamp
    sessionId: string;
    userId: string;
  };
  
  sensors: {
    [sensorId: string]: SensorDefinition;
  };
  
  sources: {
    [sourceId: string]: SourceDefinition;
  };
  
  session: SessionDefinition;
}

interface SensorDefinition {
  // Registry identification
  id: string;                       // Short registry ID: "hr1", "pwr1", "cad1", "spd1"
  
  // Device identification (comprehensive)
  device: {
    // Primary identifiers
    deviceId: string;               // Protocol-specific: "ANT-12345" or "12:34:56:78:90:AB"
    serialNumber: string;           // Unique device serial number
    manufacturerId: number;         // Standard manufacturer ID (Wahoo=32, Garmin=1, etc.)
    productId: number;              // Specific product identifier
    
    // Device information
    manufacturer: string;           // "Wahoo", "Garmin", "Stages", "SRAM", "Shimano"
    model: string;                  // "TICKR Gen 2", "Vector 3", "Ultegra R8000"
    displayName: string;            // User-friendly: "Wahoo TICKR (ABC123)"
    
    // Hardware details
    hardwareVersion?: string;       // Hardware revision
    firmwareVersion?: string;       // Firmware version
    softwareVersion?: string;       // Software version
    
    // Device capabilities
    supportedMeasurements: string[]; // ["heart_rate", "rr_intervals", "calories"]
    maxSampleRate: number;          // Maximum Hz the device can report
    transmissionType: number;       // ANT+ transmission type
    
    // Physical characteristics
    installLocation?: string;       // "left_crank", "right_crank", "chest", "wrist"
    batteryType?: string;           // "CR2032", "Li-ion", "rechargeable"
    waterRating?: string;           // "IPX7", "IPX8", "5ATM"
  };
  
  // Sensor type and output
  sensorType: 'heart_rate' | 'power' | 'cadence' | 'speed' | 'trainer' | 'environmental';
  outputUnit: string;               // "bpm", "watts", "rpm", "kph", "celsius"
  protocol: 'ant_plus' | 'bluetooth';
  
  // Connection status
  connection: {
    isConnected: boolean;
    signalStrength: number;         // 0-100
    batteryLevel?: number;          // 0-100 (if reported by device)
    lastSeen: string;               // ISO8601
    connectionStarted: string;      // When first connected this session
    totalConnectTime: number;       // Total seconds connected this session
  };
  
  // Data quality metrics
  quality: {
    averageScore: number;           // 0-100 overall quality
    dropoutRate: number;            // 0-1 percentage of missed readings
    latestReadingAge: number;       // Milliseconds since last reading
    totalReadings: number;          // Count of readings this session
    errorCount: number;             // Count of invalid readings
    lastQualityUpdate: string;      // ISO8601
  };
  
  // Calibration and configuration
  calibration?: {
    isCalibrated: boolean;
    calibrationType: string;        // "zero_offset", "slope", "factory"
    offset: number;
    multiplier: number;
    lastCalibrated: string;         // ISO8601
    calibrationSource: string;      // "user", "auto", "factory"
    calibrationValues: {            // Device-specific calibration data
      [key: string]: number;
    };
  };
  
  // User preferences
  preferences?: {
    displayName?: string;           // User-customized name
    colorCode?: string;             // UI color coding
    alertThresholds?: {             // User-defined alert levels
      low?: number;
      high?: number;
    };
    smoothingFactor?: number;       // Data smoothing preference
    recordingEnabled: boolean;      // Whether to log data from this sensor
  };
  
  // Historical metadata
  metadata: {
    firstSeen: string;              // ISO8601 - when device was first discovered
    totalSessions: number;          // Number of sessions this device has been used
    totalDistance?: number;         // Total distance recorded (for speed sensors)
    totalTime: number;              // Total active recording time in seconds
    averageSessionDuration: number; // Average session length in seconds
    lastMaintenanceDate?: string;   // Last battery change, calibration, etc.
  };
}

interface SourceDefinition {
  id: string;                       // "src1", "src2", "src3"
  deviceId: string;                 // "iphone-john-123"
  name: string;                     // "John's iPhone"
  type: 'mobile' | 'desktop' | 'head_unit' | 'web';
  platform: string;                // "iOS", "macOS", "Garmin"
  appVersion: string;               // "1.0.0"
  timezone: string;                 // "Europe/London"
  
  // Current network status
  network: {
    type: 'wifi' | 'cellular' | 'ethernet';
    quality: 'poor' | 'fair' | 'good' | 'excellent';
    bandwidth?: number;             // Mbps
  };
  
  // Performance metrics
  performance: {
    averageUploadDelay: number;     // milliseconds
    reliabilityScore: number;       // 0-1
    lastPerformanceUpdate: string;
  };
  
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: string;
  };
}

interface SessionDefinition {
  id: string;
  name: string;
  startTime: string;                // ISO8601
  status: 'active' | 'paused' | 'completed';
  
  // Session statistics (updated periodically)
  stats?: {
    duration: number;               // seconds
    totalReadings: number;
    uniqueReadings: number;
    averageDataRate: number;        // readings per second
  };
}
```

## 🔄 Compact Data Feed Format

### Real-time Data Stream
```typescript
interface DataFeedMessage {
  // Base timestamp for this batch
  timestamp: string;                // ISO8601 - base time for all readings
  
  // Compact readings array
  readings: CompactReading[];
  
  // Optional metadata
  sequence?: number;                // Message sequence number
  batchId?: string;                 // For tracking message batches
}

interface CompactReading {
  s: string;                        // Sensor ID (references registry)
  v: number;                        // Value
  q?: number;                       // Quality score (0-100) - optional
  t?: number;                       // Time offset in ms from base timestamp
  src?: string;                     // Source ID (if multiple sources) - optional
  f?: string;                       // Reading fingerprint (shortened) - optional
}

// Example real-time message
const dataFeedMessage: DataFeedMessage = {
  timestamp: "2025-01-15T10:30:15.000Z",
  sequence: 1547,
  readings: [
    { s: "hr1", v: 165, q: 95, t: 0 },      // Heart rate at exact timestamp
    { s: "pwr1", v: 280, q: 100, t: 50 },   // Power 50ms later
    { s: "cad1", v: 92, q: 98, t: 100 },    // Cadence 100ms later
    { s: "spd1", v: 35.2, q: 90, t: 150 }   // Speed 150ms later
  ]
};
```

## 🌐 API Endpoints for Registry-Based Feeds

### GET /api/registry
Get the current sensor and source registry.

**Query Parameters:**
- `version`: Current registry version (for cache validation)
- `include`: `sensors,sources,session` (comma-separated)

**Response:**
```json
{
  "success": true,
  "data": {
    "metadata": {
      "registryVersion": "v1.2.3",
      "lastUpdated": "2025-01-15T10:30:15.000Z",
      "sessionId": "session-uuid-123",
      "userId": "user-uuid-456"
    },
    
    "sensors": {
      "hr1": {
        "id": "hr1",
        "device": {
          "deviceId": "ANT-12345",
          "serialNumber": "AB12C34D567890",
          "manufacturerId": 32,
          "productId": 1234,
          "manufacturer": "Wahoo",
          "model": "TICKR Gen 2",
          "displayName": "Wahoo TICKR (AB12C)",
          "hardwareVersion": "2.1",
          "firmwareVersion": "4.15.0",
          "supportedMeasurements": ["heart_rate", "rr_intervals"],
          "maxSampleRate": 1,
          "transmissionType": 5,
          "installLocation": "chest",
          "batteryType": "CR2032",
          "waterRating": "IPX7"
        },
        "sensorType": "heart_rate",
        "outputUnit": "bpm",
        "protocol": "ant_plus",
        "connection": {
          "isConnected": true,
          "signalStrength": 87,
          "batteryLevel": 75,
          "lastSeen": "2025-01-15T10:30:14.500Z",
          "connectionStarted": "2025-01-15T08:00:15.000Z",
          "totalConnectTime": 8999
        },
        "quality": {
          "averageScore": 94.2,
          "dropoutRate": 0.02,
          "latestReadingAge": 1000,
          "totalReadings": 8999,
          "errorCount": 23,
          "lastQualityUpdate": "2025-01-15T10:29:00.000Z"
        },
        "preferences": {
          "displayName": "Chest HRM",
          "colorCode": "#FF6B6B",
          "alertThresholds": {
            "low": 50,
            "high": 180
          },
          "recordingEnabled": true
        },
        "metadata": {
          "firstSeen": "2024-12-01T09:15:30.000Z",
          "totalSessions": 47,
          "totalTime": 142350,
          "averageSessionDuration": 3028,
          "lastMaintenanceDate": "2025-01-01T00:00:00.000Z"
        }
      },
      
      "pwr1": {
        "id": "pwr1",
        "device": {
          "deviceId": "ANT-67890",
          "serialNumber": "STG2024001234",
          "manufacturerId": 69,
          "productId": 5678,
          "manufacturer": "Stages",
          "model": "Ultegra R8000",
          "displayName": "Stages Power (STG2024)",
          "hardwareVersion": "3.2",
          "firmwareVersion": "2.0.47",
          "supportedMeasurements": ["power", "cadence", "balance"],
          "maxSampleRate": 1,
          "transmissionType": 5,
          "installLocation": "left_crank",
          "batteryType": "CR2032",
          "waterRating": "IPX7"
        },
        "sensorType": "power",
        "outputUnit": "watts",
        "protocol": "ant_plus",
        "connection": {
          "isConnected": true,
          "signalStrength": 91,
          "batteryLevel": 82,
          "lastSeen": "2025-01-15T10:30:14.750Z",
          "connectionStarted": "2025-01-15T08:00:12.000Z",
          "totalConnectTime": 9002
        },
        "quality": {
          "averageScore": 98.7,
          "dropoutRate": 0.001,
          "latestReadingAge": 250,
          "totalReadings": 9001,
          "errorCount": 1,
          "lastQualityUpdate": "2025-01-15T10:29:00.000Z"
        },
        "calibration": {
          "isCalibrated": true,
          "calibrationType": "zero_offset",
          "offset": 0,
          "multiplier": 1.02,
          "lastCalibrated": "2025-01-15T08:00:00.000Z",
          "calibrationSource": "user",
          "calibrationValues": {
            "zeroOffset": 512,
            "slope": 10.0,
            "temperature": 22.5
          }
        },
        "preferences": {
          "displayName": "Left Crank Power",
          "colorCode": "#FF922B",
          "alertThresholds": {
            "low": 100,
            "high": 400
          },
          "smoothingFactor": 3,
          "recordingEnabled": true
        },
        "metadata": {
          "firstSeen": "2024-11-15T14:22:10.000Z",
          "totalSessions": 52,
          "totalDistance": 2847.5,
          "totalTime": 156780,
          "averageSessionDuration": 3015,
          "lastMaintenanceDate": "2024-12-15T00:00:00.000Z"
        }
      },
      
      "cad1": {
        "id": "cad1", 
        "device": {
          "deviceId": "12:34:56:78:90:AB",
          "serialNumber": "WHR2023987654",
          "manufacturerId": 32,
          "productId": 2567,
          "manufacturer": "Wahoo",
          "model": "RPM Cadence",
          "displayName": "Wahoo RPM (987654)",
          "hardwareVersion": "1.0",
          "firmwareVersion": "3.8.2", 
          "supportedMeasurements": ["cadence"],
          "maxSampleRate": 1,
          "installLocation": "left_crank",
          "batteryType": "CR2032",
          "waterRating": "IPX7"
        },
        "sensorType": "cadence",
        "outputUnit": "rpm", 
        "protocol": "bluetooth",
        "connection": {
          "isConnected": true,
          "signalStrength": 76,
          "batteryLevel": 68,
          "lastSeen": "2025-01-15T10:30:14.890Z",
          "connectionStarted": "2025-01-15T08:00:18.000Z",
          "totalConnectTime": 8996
        },
        "quality": {
          "averageScore": 91.3,
          "dropoutRate": 0.05,
          "latestReadingAge": 110,
          "totalReadings": 8847,
          "errorCount": 45,
          "lastQualityUpdate": "2025-01-15T10:29:00.000Z"
        },
        "preferences": {
          "displayName": "Cadence Sensor",
          "colorCode": "#4DABF7",
          "alertThresholds": {
            "low": 60,
            "high": 120
          },
          "recordingEnabled": true
        },
        "metadata": {
          "firstSeen": "2024-10-22T16:45:00.000Z",
          "totalSessions": 38,
          "totalTime": 108650,
          "averageSessionDuration": 2859,
          "lastMaintenanceDate": "2024-12-20T00:00:00.000Z"
        }
      }
    },
    
    "sources": {
      "src1": {
        "id": "src1",
        "deviceId": "iphone-john-123",
        "name": "John's iPhone",
        "type": "mobile",
        "platform": "iOS",
        "appVersion": "1.0.0",
        "timezone": "Europe/London",
        "network": {
          "type": "wifi",
          "quality": "excellent",
          "bandwidth": 50.2
        },
        "performance": {
          "averageUploadDelay": 1247,
          "reliabilityScore": 0.94,
          "lastPerformanceUpdate": "2025-01-15T10:29:00.000Z"
        },
        "location": {
          "latitude": 51.5074,
          "longitude": -0.1278,
          "accuracy": 5,
          "timestamp": "2025-01-15T10:30:00.000Z"
        }
      }
    },
    
    "session": {
      "id": "session-uuid-123",
      "name": "Morning Training Ride",
      "startTime": "2025-01-15T08:00:00.000Z",
      "status": "active",
      "stats": {
        "duration": 9015,
        "totalReadings": 15847,
        "uniqueReadings": 3962,
        "averageDataRate": 1.76
      }
    }
  },
  
  "cacheControl": {
    "maxAge": 300,
    "etag": "v1.2.3-abc123"
  }
}
```

### GET /api/data/feed
Get compact data feed using sensor IDs.

**Query Parameters:**
- `format`: `compact` | `verbose` (default: compact)
- `interpretation`: `raw` | `deduplicated` | `analytics`
- `sensors`: Comma-separated sensor IDs to include
- `startTime`: ISO8601 start time
- `endTime`: ISO8601 end time
- `limit`: Maximum readings (default: 1000)

**Response (Compact Format):**
```json
{
  "success": true,
  "interpretation": "deduplicated",
  "format": "compact",
  "data": {
    "baseTimestamp": "2025-01-15T10:30:15.000Z",
    "readings": [
      {
        "timestamp": "2025-01-15T10:30:15.000Z",
        "sequence": 1547,
        "data": [
          { "s": "hr1", "v": 165, "q": 95, "t": 0 },       // Chest strap HR
          { "s": "hr2", "v": 162, "q": 87, "t": 10 },      // Apple Watch HR  
          { "s": "pwr1", "v": 280, "q": 100, "t": 50 },    // Left crank power
          { "s": "pwr2", "v": 278, "q": 98, "t": 55 },     // Right crank power
          { "s": "cad1", "v": 92, "q": 98, "t": 100 },     // Power meter cadence
          { "s": "cad2", "v": 93, "q": 85, "t": 110 },     // Speed sensor cadence
          { "s": "spd1", "v": 35.2, "q": 90, "t": 150 }    // GPS speed
        ]
      },
      {
        "timestamp": "2025-01-15T10:30:16.000Z", 
        "sequence": 1548,
        "data": [
          { "s": "hr1", "v": 166, "q": 96, "t": 0 },
          { "s": "pwr1", "v": 285, "q": 100, "t": 45 },
          { "s": "cad1", "v": 93, "q": 97, "t": 95 },
          { "s": "spd1", "v": 35.4, "q": 92, "t": 140 }
        ]
      }
    ],
    "metadata": {
      "totalReadings": 1547,
      "registryVersion": "v1.2.3",
      "compressionRatio": 0.12
    }
  }
}
```

### WebSocket Feed with Registry
```javascript
// Connect to registry-based WebSocket feed
const socket = io('http://localhost:3000/feed', {
  query: {
    interpretation: 'deduplicated',
    format: 'compact',
    sensors: 'hr1,pwr1,cad1'  // Only these sensors
  }
});

// Registry updates (sent when sensors change)
socket.on('registry-update', (registry) => {
  console.log('Updated sensor registry:', registry);
  // Update local sensor cache
  updateSensorRegistry(registry);
});

// Compact data feed
socket.on('data-feed', (message) => {
  console.log('Compact readings:', message);
  
  // Expand readings using local registry
  message.readings.forEach(reading => {
    const sensor = getSensorById(reading.s);
    console.log(`${sensor.name}: ${reading.v} ${sensor.unit}`);
  });
});

// Error handling
socket.on('registry-error', (error) => {
  console.error('Registry sync failed:', error);
  // Fallback to verbose format or re-request registry
});
```

## 🔧 Implementation Efficiency

### Payload Size Comparison
```
VERBOSE FORMAT (traditional):
{
  "deviceId": "ANT-12345",
  "sensorType": "heart_rate", 
  "name": "Wahoo TICKR",
  "unit": "bpm",
  "protocol": "ant_plus",
  "manufacturer": "Wahoo",
  "value": 165,
  "quality": 95,
  "timestamp": "2025-01-15T10:30:15.123Z"
}
Size: ~280 bytes per reading

COMPACT FORMAT (registry-based):
{ "s": "hr1", "v": 165, "q": 95, "t": 0 }
Size: ~30 bytes per reading

Savings: 89% reduction in payload size
```

### Registry Caching Strategy
```typescript
// Client-side registry caching
class SensorRegistryCache {
  private registry: SensorRegistry | null = null;
  private version: string | null = null;
  
  async getRegistry(): Promise<SensorRegistry> {
    // Check if we need to refresh
    const response = await fetch(`/api/registry?version=${this.version}`);
    
    if (response.status === 304) {
      // Not modified, use cached registry
      return this.registry!;
    }
    
    // Update registry and version
    const data = await response.json();
    this.registry = data.data;
    this.version = data.data.metadata.registryVersion;
    
    return this.registry;
  }
  
  expandReading(compactReading: CompactReading, baseTimestamp: string): ExpandedReading {
    const sensor = this.registry!.sensors[compactReading.s];
    const actualTimestamp = new Date(
      new Date(baseTimestamp).getTime() + (compactReading.t || 0)
    );
    
    return {
      sensor: sensor,
      value: compactReading.v,
      unit: sensor.unit,
      quality: compactReading.q || 100,
      timestamp: actualTimestamp.toISOString()
    };
  }
}
```

This registry-based approach provides developers with:
- **90% smaller payloads** for real-time feeds
- **Clean separation** between metadata and data
- **Easy caching** of sensor information
- **Flexible interpretation** without payload bloat
- **Efficient streaming** for mobile and web clients

Perfect for third-party developers who need efficient, clean access to your cycling sensor data!