# UltiBiker MVP - Multi-Device Data Aggregation

## 🔗 Multi-Device Architecture Challenge

ANT+ sensors can broadcast to multiple receivers simultaneously, but this creates a critical challenge: **data deduplication**. When multiple devices receive the same sensor reading, the system must identify and handle overlapping data correctly.

```
🔄 MULTI-DEVICE DATA AGGREGATION PROBLEM

┌─────────────────────────────────────────────────────────────────────────────────┐
│                            THE CHALLENGE                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ 📡 ANT+ Sensor (Heart Rate: 165 BPM)                                           │
│                    │                                                           │
│                    ├──────────────┬─────────────────┬──────────────────────┐   │
│                    ▼              ▼                 ▼                      ▼   │
│                                                                                 │
│ 📱 Phone A         💻 Laptop       📟 Head Unit      📱 Phone B              │
│ UltiBiker App      UltiBiker MVP   Garmin Edge      Partner App             │
│                                                                                 │
│ Same Reading: 165 BPM @ 10:30:15.123                                          │
│                                                                                 │
│                    ▼                                                           │
│                                                                                 │
│ ☁️  CLOUD SERVER                                                               │
│ ❌ Problem: Receives 4x "165 BPM" readings                                    │
│ ❌ Risk: Interprets as 4 different heart rate readings                        │
│ ❌ Result: Corrupted analytics, inflated data points                          │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🎯 Solution: Collect All Data + Interpretive Deduplication

### Core Principle
**NEVER discard data at collection time.** Instead, collect ALL sensor readings from ALL devices with full attribution and timestamps, then provide interpretation layers that can deduplicate, analyze, and present data as needed.

```
📊 COLLECT ALL DATA + INTERPRETIVE DEDUPLICATION

┌─────────────────────────────────────────────────────────────────────────────────┐
│                        REVISED SOLUTION ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ 📡 ANT+ Sensor Reading (Physical Event)                                        │
│ ├── Device ID: 12345                                                          │
│ ├── Value: 165 BPM                                                            │
│ ├── ANT+ Timestamp: 1642234215123 (ms)                                        │
│ └── Raw Data: [0x01, 0xA5, ...]                                              │
│                                                                                 │
│                            ▼                                                   │
│                                                                                 │
│ 📱 Multiple Devices Receive Same Reading                                       │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│ │ iPhone      │  │ MacBook     │  │ Garmin Edge │  │ Partner App │           │
│ │ London, UK  │  │ London, UK  │  │ London, UK  │  │ Paris, FR   │           │
│ │ WiFi: Good  │  │ WiFi: Excel │  │ LTE: Fair   │  │ 5G: Excel   │           │
│ │ Recv: 10:30:15.123 │ │ Recv: 10:30:15.089 │ │ Recv: 10:30:15.156 │ │ Recv: 10:30:15.201 │ │
│ └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘           │
│                                                                                 │
│                            ▼                                                   │
│                                                                                 │
│ ☁️  CLOUD SERVER - STORE EVERYTHING                                            │
│ ┌─────────────────────────────────────────────────────────────────────────┐   │
│ │ ✅ ALWAYS STORE ALL READINGS with full attribution:                    │   │
│ │                                                                         │   │
│ │ Reading 1:                                                              │   │
│ │ • Value: 165 BPM                                                        │   │
│ │ • Sensor Time: 2025-01-15T10:30:15.000Z                               │   │
│ │ • Received Time: 2025-01-15T10:30:15.123Z                             │   │
│ │ • Source: "John's iPhone" (London, UK)                                 │   │
│ │ • Fingerprint: a7f3d2e1... (for grouping)                             │   │
│ │                                                                         │   │
│ │ Reading 2:                                                              │   │
│ │ • Value: 165 BPM                                                        │   │
│ │ • Sensor Time: 2025-01-15T10:30:15.000Z                               │   │
│ │ • Received Time: 2025-01-15T10:30:15.189Z                             │   │
│ │ • Source: "Training MacBook" (London, UK)                              │   │
│ │ • Fingerprint: a7f3d2e1... (same as Reading 1)                        │   │
│ │                                                                         │   │
│ │ [Continue storing ALL readings...]                                      │   │
│ └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│                            ▼                                                   │
│                                                                                 │
│ 🧠 INTERPRETATION LAYER (Query Time)                                           │
│ ┌─────────────────────────────────────────────────────────────────────────┐   │
│ │ Raw Data Query: "Give me ALL readings"                                 │   │
│ │ → Returns: 4 readings with full attribution                            │   │
│ │                                                                         │   │
│ │ Deduplicated Query: "Give me unique readings"                          │   │
│ │ → Returns: 1 reading (earliest received) + metadata                    │   │
│ │                                                                         │   │
│ │ Analytics Query: "Show device reporting patterns"                      │   │
│ │ → Returns: iPhone 41% primary, MacBook 32%, Garmin 27%                │   │
│ │                                                                         │   │
│ │ Audit Query: "Which devices reported this reading?"                    │   │
│ │ → Returns: All 4 devices with receive timestamps                       │   │
│ └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│ ✅ Result: Complete data preservation + flexible interpretation                │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## ⏰ Timezone-Agnostic Timestamping System

### Core Timestamp Strategy
Every sensor reading gets **multiple timestamps** with full timezone attribution:

```typescript
interface TimestampedSensorReading {
  // Original sensor timestamp (if available)
  sensorTimestamp?: string;        // ISO8601 from sensor
  
  // Device receive timestamp (when device got the reading)
  deviceReceivedAt: string;        // ISO8601 with device timezone
  
  // Server receive timestamp (when server got the upload)
  serverReceivedAt: string;        // ISO8601 UTC
  
  // Device timezone information
  deviceTimezone: string;          // e.g., "Europe/London", "America/New_York"
  deviceUtcOffset: number;         // Minutes offset from UTC at time of reading
  
  // Upload delay metrics
  uploadDelayMs: number;           // deviceReceivedAt -> serverReceivedAt
  processingDelayMs: number;       // Time spent in upload queue
}
```

## 📊 Enhanced Data Attribution System

### Complete Source Attribution
```typescript
// src/types/sensor-reading.ts
interface SensorReading {
  // Sensor data
  deviceId: string;                // ANT+ ID or BLE MAC address
  sensorType: 'heart_rate' | 'power' | 'cadence' | 'speed';
  value: number;
  unit: string;
  rawData?: any;                   // Original sensor payload
  
  // Timestamps (all ISO8601)
  sensorTimestamp?: string;        // From sensor (if available)
  deviceReceivedAt: string;        // When device received reading
  serverReceivedAt: string;        // When server received upload
  
  // Source attribution
  sourceDevice: {
    id: string;                    // Unique device identifier
    name: string;                  // "John's iPhone", "Training MacBook"
    type: 'mobile' | 'desktop' | 'head_unit' | 'web';
    platform: string;             // "iOS", "macOS", "Garmin"
    appVersion: string;            // UltiBiker app version
    location?: {                   // Device location at time of reading
      latitude: number;
      longitude: number;
      accuracy: number;
    };
  };
  
  // Network attribution
  networkInfo: {
    type: 'wifi' | 'cellular' | 'ethernet';
    quality: 'poor' | 'fair' | 'good' | 'excellent';
    uploadBandwidth?: number;      // Mbps
  };
  
  // Data quality metrics
  quality: number;                 // 0-100 quality score
  signalStrength?: number;         // ANT+/BLE signal strength
  
  // Grouping (NOT filtering)
  readingFingerprint: string;      // SHA-256 for grouping identical readings
  
  // Metadata
  sessionId: string;
  userId: string;
}
```

### Fingerprint Generation (For Grouping Only)
```typescript
// src/utils/reading-fingerprinter.ts
import { createHash } from 'crypto';

export class ReadingFingerprinter {
  /**
   * Generate fingerprint for GROUPING identical physical readings
   * NOT for filtering - this is used at interpretation time
   */
  static generateFingerprint(reading: SensorReading): string {
    // Normalize timestamp to nearest second (ANT+ broadcasts ~1Hz)
    const normalizedTime = new Date(reading.deviceReceivedAt);
    normalizedTime.setMilliseconds(0);
    
    const fingerprintData = {
      deviceId: reading.deviceId,
      sensorType: reading.sensorType,
      value: reading.value,
      normalizedTimestamp: normalizedTime.toISOString(),
      rawDataHash: reading.rawData ? this.hashRawData(reading.rawData) : null
    };
    
    return createHash('sha256')
      .update(JSON.stringify(fingerprintData))
      .digest('hex');
  }
  
  private static hashRawData(rawData: any): string {
    if (Buffer.isBuffer(rawData)) {
      return rawData.toString('hex');
    }
    if (Array.isArray(rawData)) {
      return rawData.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return createHash('md5').update(JSON.stringify(rawData)).digest('hex');
  }
}
```

### Data Parser - Store Everything
```typescript
// src/sensors/data-parser.ts (NEVER DISCARD APPROACH)
export class DataParser {
  parseReading(rawReading: any, sourceDevice: any): SensorReading {
    const now = new Date();
    const deviceReceivedAt = rawReading.timestamp || now;
    
    // Create complete reading with full attribution
    const reading: SensorReading = {
      deviceId: rawReading.deviceId,
      sensorType: rawReading.type,
      value: this.applyCalibration(rawReading),
      unit: rawReading.unit,
      rawData: rawReading.rawData,
      
      // Comprehensive timestamps
      sensorTimestamp: rawReading.sensorTimestamp,
      deviceReceivedAt: deviceReceivedAt.toISOString(),
      serverReceivedAt: now.toISOString(),
      
      // Full source attribution
      sourceDevice: {
        id: sourceDevice.id,
        name: sourceDevice.name,
        type: sourceDevice.type,
        platform: sourceDevice.platform,
        appVersion: sourceDevice.appVersion,
        location: sourceDevice.location
      },
      
      networkInfo: {
        type: sourceDevice.networkType,
        quality: sourceDevice.networkQuality,
        uploadBandwidth: sourceDevice.uploadBandwidth
      },
      
      // Quality metrics
      quality: this.calculateQuality(rawReading, sourceDevice),
      signalStrength: rawReading.signalStrength,
      
      // Generate fingerprint for grouping
      readingFingerprint: ReadingFingerprinter.generateFingerprint(reading),
      
      // Context
      sessionId: rawReading.sessionId,
      userId: rawReading.userId,
      
      // Upload timing
      uploadDelayMs: now.getTime() - deviceReceivedAt.getTime(),
      processingDelayMs: 0 // Set later in pipeline
    };
    
    // ALWAYS return the reading - never discard at parse time
    return reading;
  }
  
  private calculateQuality(reading: any, sourceDevice: any): number {
    let quality = 100;
    
    // Network quality impacts data reliability
    switch (sourceDevice.networkQuality) {
      case 'poor': quality -= 30; break;
      case 'fair': quality -= 15; break;
      case 'good': quality -= 5; break;
    }
    
    // Signal strength
    if (reading.signalStrength && reading.signalStrength < 50) {
      quality -= 20;
    }
    
    // Upload delay (longer delays may indicate network issues)
    const uploadDelay = Date.now() - (reading.timestamp?.getTime() || Date.now());
    if (uploadDelay > 30000) { // 30 seconds
      quality -= 25;
    }
    
    return Math.max(0, quality);
  }
  
  private applyCalibration(reading: any): number {
    // Apply device-specific calibration factors
    // This could be user-configured per device
    return reading.value; // Placeholder
  }
}
```

## 🗃️ Database Schema for Complete Data Preservation

### Enhanced sensor_data Table (Store Everything)
```sql
CREATE TABLE sensor_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Sensor identification
    device_id TEXT NOT NULL,              -- ANT+ ID or BLE MAC
    sensor_type TEXT NOT NULL,            -- heart_rate, power, cadence, speed
    value REAL NOT NULL,
    unit TEXT NOT NULL,
    raw_data JSON,
    
    -- Comprehensive timestamps (all ISO8601)
    sensor_timestamp TEXT,               -- From sensor (if available)
    device_received_at TEXT NOT NULL,    -- When device received reading
    server_received_at TEXT NOT NULL,    -- When server received upload
    
    -- Source device attribution
    source_device_id TEXT NOT NULL,      -- Unique device identifier  
    source_device_name TEXT NOT NULL,    -- "John's iPhone"
    source_device_type TEXT NOT NULL,    -- mobile, desktop, head_unit, web
    source_platform TEXT NOT NULL,      -- iOS, macOS, Garmin, etc.
    source_app_version TEXT NOT NULL,    -- UltiBiker version
    
    -- Location information (if available)
    source_latitude REAL,
    source_longitude REAL,
    source_location_accuracy REAL,
    
    -- Network information
    network_type TEXT,                   -- wifi, cellular, ethernet
    network_quality TEXT,               -- poor, fair, good, excellent
    upload_bandwidth_mbps REAL,
    
    -- Timing metrics
    upload_delay_ms INTEGER,            -- Device to server delay
    processing_delay_ms INTEGER,        -- Server processing time
    
    -- Quality and reliability
    quality_score INTEGER DEFAULT 100,   -- 0-100 quality assessment
    signal_strength INTEGER,             -- ANT+/BLE signal strength
    
    -- Grouping fingerprint (for analysis, NOT uniqueness constraint)
    reading_fingerprint TEXT NOT NULL,   -- SHA-256 for grouping
    
    -- Session context
    session_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    
    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance (NO uniqueness constraints)
CREATE INDEX idx_sensor_data_fingerprint ON sensor_data(reading_fingerprint);
CREATE INDEX idx_sensor_data_device_received ON sensor_data(device_received_at);
CREATE INDEX idx_sensor_data_source_device ON sensor_data(source_device_id);
CREATE INDEX idx_sensor_data_session ON sensor_data(session_id);
CREATE INDEX idx_sensor_data_composite ON sensor_data(device_id, sensor_type, device_received_at);
```

### Source Device Registry
```sql
-- Track all devices that have reported data
CREATE TABLE source_devices (
    id TEXT PRIMARY KEY,                 -- Unique device identifier
    name TEXT NOT NULL,                  -- User-friendly name
    type TEXT NOT NULL,                  -- mobile, desktop, head_unit, web
    platform TEXT NOT NULL,             -- iOS, Android, macOS, Windows, Garmin
    capabilities JSON,                   -- ["ant_plus", "bluetooth"]
    timezone TEXT,                       -- Device timezone
    last_seen_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Track device locations over time
CREATE TABLE device_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy REAL,
    recorded_at DATETIME NOT NULL,
    
    FOREIGN KEY (device_id) REFERENCES source_devices(id)
);

CREATE INDEX idx_device_locations_device_time ON device_locations(device_id, recorded_at);
```

### Drizzle Schema (Full Attribution)
```typescript
// src/database/schema.ts (complete data preservation)
export const sensorData = sqliteTable('sensor_data', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  
  // Sensor data
  deviceId: text('device_id').notNull(),
  sensorType: text('sensor_type').notNull(),
  value: real('value').notNull(),
  unit: text('unit').notNull(),
  rawData: text('raw_data', { mode: 'json' }),
  
  // Comprehensive timestamps
  sensorTimestamp: text('sensor_timestamp'),
  deviceReceivedAt: text('device_received_at').notNull(),
  serverReceivedAt: text('server_received_at').notNull(),
  
  // Source attribution
  sourceDeviceId: text('source_device_id').notNull(),
  sourceDeviceName: text('source_device_name').notNull(),
  sourceDeviceType: text('source_device_type').notNull(),
  sourcePlatform: text('source_platform').notNull(),
  sourceAppVersion: text('source_app_version').notNull(),
  
  // Location
  sourceLatitude: real('source_latitude'),
  sourceLongitude: real('source_longitude'),
  sourceLocationAccuracy: real('source_location_accuracy'),
  
  // Network info
  networkType: text('network_type'),
  networkQuality: text('network_quality'),
  uploadBandwidthMbps: real('upload_bandwidth_mbps'),
  
  // Timing
  uploadDelayMs: integer('upload_delay_ms'),
  processingDelayMs: integer('processing_delay_ms'),
  
  // Quality
  qualityScore: integer('quality_score').default(100),
  signalStrength: integer('signal_strength'),
  
  // Grouping (NOT uniqueness)
  readingFingerprint: text('reading_fingerprint').notNull(),
  
  // Context
  sessionId: text('session_id').notNull(),
  userId: text('user_id').notNull(),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
}, (table) => ({
  fingerprintIdx: index('idx_sensor_data_fingerprint').on(table.readingFingerprint),
  deviceReceivedIdx: index('idx_sensor_data_device_received').on(table.deviceReceivedAt),
  sourceDeviceIdx: index('idx_sensor_data_source_device').on(table.sourceDeviceId),
  sessionIdx: index('idx_sensor_data_session').on(table.sessionId),
  compositeIdx: index('idx_sensor_data_composite').on(
    table.deviceId, table.sensorType, table.deviceReceivedAt
  ),
}));

export const sourceDevices = sqliteTable('source_devices', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  platform: text('platform').notNull(),
  capabilities: text('capabilities', { mode: 'json' }),
  timezone: text('timezone'),
  lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow(),
});

export const deviceLocations = sqliteTable('device_locations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  deviceId: text('device_id').notNull().references(() => sourceDevices.id),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  accuracy: real('accuracy'),
  recordedAt: integer('recorded_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  deviceTimeIdx: index('idx_device_locations_device_time').on(
    table.deviceId, table.recordedAt
  ),
}));
```

## 🌐 API Updates for Multi-Device Support

### Device Registration Endpoint
```typescript
// POST /api/devices/register
// Each device must register itself for deduplication tracking

interface DeviceRegistration {
  deviceName: string;      // "John's iPhone", "Training Laptop"
  deviceType: string;      // "mobile", "desktop", "head_unit"
  capabilities: string[];  // ["ant_plus", "bluetooth"]
  uuid: string;           // Unique device identifier
}
```

### Enhanced WebSocket Events
```typescript
// WebSocket event with source attribution
interface SensorDataEvent {
  deviceId: string;
  type: string;
  value: number;
  unit: string;
  timestamp: string;
  fingerprint: string;        // NEW: Unique reading fingerprint
  sourceDevice: string;       // NEW: Which device reported this
  isPrimary: boolean;         // NEW: Is this the primary report?
  duplicateCount: number;     // NEW: How many devices reported this
}
```

## 🔍 Monitoring and Analytics

### Deduplication Metrics Dashboard
```typescript
// GET /api/analytics/deduplication
interface DeduplicationStats {
  totalReadings: number;
  uniqueReadings: number;
  duplicateReadings: number;
  deduplicationRate: number;  // percentage of duplicates caught
  sourceBreakdown: {
    [deviceName: string]: {
      readingsReceived: number;
      primaryReadings: number;   // readings that were stored (not duplicates)
    };
  };
}
```

### Real-time Deduplication Monitoring
```
📊 DEDUPLICATION DASHBOARD

┌─────────────────────────────────────────────────────────────────────────────────┐
│ 🔍 REAL-TIME DEDUPLICATION MONITORING                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ 📊 Session Statistics:                                                         │
│ • Total Readings Received: 4,523                                              │
│ • Unique Readings Stored: 1,508                                               │
│ • Duplicates Detected: 3,015 (66.7%)                                          │
│ • Deduplication Working: ✅ EXCELLENT                                          │
│                                                                                 │
│ 📱 Source Device Breakdown:                                                    │
│ ┌─────────────────┬─────────────┬─────────────┬─────────────────────────────┐ │
│ │ Device          │ Received    │ Primary     │ Duplicate Rate              │ │
│ ├─────────────────┼─────────────┼─────────────┼─────────────────────────────┤ │
│ │ 📱 John's iPhone │ 1,508       │ 892 (59%)   │ 616 (41%) ████████▓░        │ │
│ │ 💻 Training Mac  │ 1,508       │ 403 (27%)   │ 1,105 (73%) ██████████████▓ │ │
│ │ 📟 Garmin Edge   │ 1,507       │ 213 (14%)   │ 1,294 (86%) ████████████████│ │
│ └─────────────────┴─────────────┴─────────────┴─────────────────────────────┘ │
│                                                                                 │
│ 🕐 Recent Deduplication Activity:                                              │
│ • 10:30:15 - HR 165 BPM - Primary: iPhone, Duplicates: Mac, Garmin           │
│ • 10:30:14 - Power 280W - Primary: Mac, Duplicates: iPhone, Garmin           │
│ • 10:30:13 - Cadence 92 RPM - Primary: Garmin, Duplicates: iPhone, Mac       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🧪 Testing Deduplication

### Unit Tests
```typescript
// tests/unit/data-fingerprint.test.ts
describe('DataFingerprinter', () => {
  it('generates identical fingerprints for same readings', () => {
    const reading1 = {
      deviceId: 'ANT-12345',
      deviceType: 'ant_plus',
      sensorType: 'heart_rate',
      value: 165,
      timestamp: 1642234215000,
      rawData: Buffer.from([0x01, 0xA5])
    };
    
    const reading2 = { ...reading1 }; // Identical reading
    
    const fingerprint1 = DataFingerprinter.generateFingerprint(reading1);
    const fingerprint2 = DataFingerprinter.generateFingerprint(reading2);
    
    expect(fingerprint1).toBe(fingerprint2);
  });
  
  it('generates different fingerprints for different readings', () => {
    const reading1 = { /* ... */ };
    const reading2 = { ...reading1, value: 166 }; // Different value
    
    const fingerprint1 = DataFingerprinter.generateFingerprint(reading1);
    const fingerprint2 = DataFingerprinter.generateFingerprint(reading2);
    
    expect(fingerprint1).not.toBe(fingerprint2);
  });
});
```

### Integration Tests  
```typescript
// tests/integration/multi-device.test.ts
describe('Multi-device deduplication', () => {
  it('handles simultaneous readings from multiple devices', async () => {
    // Simulate 3 devices receiving same ANT+ reading
    const baseReading = { /* ... */ };
    
    const results = await Promise.all([
      dataParser.parseReading({ ...baseReading, sourceDevice: 'iPhone' }),
      dataParser.parseReading({ ...baseReading, sourceDevice: 'Mac' }),
      dataParser.parseReading({ ...baseReading, sourceDevice: 'Garmin' })
    ]);
    
    // Only one reading should be accepted
    const acceptedReadings = results.filter(r => r !== null);
    expect(acceptedReadings).toHaveLength(1);
  });
});
```

## 🚀 Implementation Priority

### Phase 1 - Core Deduplication
1. ✅ Fingerprint generation algorithm
2. ✅ Enhanced data parser with dedup logic
3. ✅ Database schema updates
4. ✅ Local deduplication cache

### Phase 2 - Multi-Device Tracking  
1. Device registration system
2. Source attribution in data storage
3. Deduplication monitoring dashboard
4. Enhanced WebSocket events

### Phase 3 - Advanced Features
1. Machine learning for anomaly detection
2. Adaptive timestamp normalization
3. Cross-device sensor calibration
4. Historical deduplication analysis

This multi-device aggregation system ensures data integrity while supporting the ANT+ protocol's strength of broadcasting to multiple receivers simultaneously.