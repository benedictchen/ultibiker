# UltiBiker Platform - Client SDK & Developer Libraries

## 🛠️ Client SDK Overview

The UltiBiker Client SDK provides third-party developers with simple, powerful libraries to authenticate with the UltiBiker platform and consume real-time cycling data feeds with minimal configuration.

```
🛠️ CLIENT SDK ARCHITECTURE

┌─────────────────────────────────────────────────────────────────────────────────┐
│                          ULTIBIKER CLIENT SDK                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ 📦 MULTI-LANGUAGE SUPPORT           🔐 AUTHENTICATION                          │
│ ┌─────────────────────────────────┐  ┌─────────────────────────────────────┐   │
│ │                                 │  │                                     │   │
│ │ 🟨 JavaScript/TypeScript        │  │ 🔑 OAuth 2.0 + PKCE               │   │
│ │ • @ultibiker/client-js          │  │ • Secure token exchange            │   │
│ │ • Browser + Node.js support     │  │ • Refresh token handling           │   │
│ │ • WebSocket + REST APIs         │  │ • Scope-based permissions          │   │
│ │                                 │  │                                     │   │
│ │ 🐍 Python                       │  │ 🛡️  API Key (Simple)               │   │
│ │ • ultibiker-python              │  │ • For server-to-server             │   │
│ │ • Async/await support           │  │ • Rate limiting built-in           │   │
│ │ • Real-time streaming           │  │ • Webhook verification             │   │
│ │                                 │  │                                     │   │
│ │ ☕ Java/Kotlin                  │  │ 🔐 Device Authorization            │   │
│ │ • ultibiker-java                │  │ • For mobile/desktop apps          │   │
│ │ • Android compatibility         │  │ • User consent flow                │   │
│ │ • Retrofit integration          │  │ • Secure credential storage        │   │
│ │                                 │  │                                     │   │
│ └─────────────────────────────────┘  └─────────────────────────────────────┘   │
│                                                                                 │
│ 📊 DATA FEED CLIENTS                🎯 DEVELOPER EXPERIENCE                    │
│ ┌─────────────────────────────────┐  ┌─────────────────────────────────────┐   │
│ │                                 │  │                                     │   │
│ │ 🔄 Real-time Streaming          │  │ 📚 Comprehensive Documentation     │   │
│ │ • WebSocket auto-reconnection   │  │ • Interactive API explorer         │   │
│ │ • Registry caching              │  │ • Code examples & tutorials        │   │
│ │ • Automatic deduplication       │  │ • Postman collections              │   │
│ │                                 │  │                                     │   │
│ │ 📈 Historical Data              │  │ 🧪 Developer Tools                 │   │
│ │ • Pagination handling           │  │ • Sandbox environment              │   │
│ │ • Export format conversion      │  │ • Testing utilities                │   │
│ │ • Caching strategies            │  │ • Debug logging                    │   │
│ │                                 │  │                                     │   │
│ │ 🎛️ Configuration Management     │  │ 🚀 Quick Start Templates          │   │
│ │ • Environment detection         │  │ • React dashboard starter          │   │
│ │ • Retry policies                │  │ • Python analytics script          │   │
│ │ • Error handling                │  │ • Mobile app boilerplate           │   │
│ │                                 │  │                                     │   │
│ └─────────────────────────────────┘  └─────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🔐 Authentication & Authorization

### OAuth 2.0 with PKCE (Recommended)
```typescript
// @ultibiker/client-js
import { UltiBikerClient } from '@ultibiker/client-js';

const client = new UltiBikerClient({
  clientId: 'your-app-client-id',
  redirectUri: 'https://yourapp.com/callback',
  scopes: ['read:sensor-data', 'read:sessions', 'write:preferences'],
  environment: 'production' // or 'sandbox'
});

// Initiate OAuth flow
const authUrl = client.auth.getAuthorizationUrl();
window.location.href = authUrl;

// Handle callback
const tokens = await client.auth.handleCallback(window.location.href);
// Tokens automatically stored securely
```

### API Key Authentication (Server-to-Server)
```python
# ultibiker-python
from ultibiker import UltiBikerClient

client = UltiBikerClient(
    api_key='your-server-api-key',
    environment='production'
)

# Automatic rate limiting and retry logic built-in
sessions = await client.sessions.list(user_id='user-123')
```

### Device Authorization Flow (Mobile/Desktop)
```kotlin
// ultibiker-java (Android/Kotlin)
val client = UltiBikerClient.Builder()
    .clientId("your-mobile-app-id")
    .environment(Environment.PRODUCTION)
    .build()

// Device flow for TV/mobile apps
val deviceCode = client.auth.startDeviceAuthorization()
showUserCode(deviceCode.userCode) // Display to user

val tokens = client.auth.pollForTokens(deviceCode.deviceCode)
```

## 📊 Real-time Data Feed Client

### JavaScript/TypeScript SDK
```typescript
import { UltiBikerClient, SensorType, InterpretationMode } from '@ultibiker/client-js';

const client = new UltiBikerClient({
  accessToken: 'your-access-token'
});

// Connect to real-time data feed
const dataFeed = client.createDataFeed({
  userId: 'user-123',
  interpretation: InterpretationMode.DEDUPLICATED,
  sensorTypes: [SensorType.HEART_RATE, SensorType.POWER],
  qualityThreshold: 80
});

// Registry management (automatic caching)
dataFeed.on('registryUpdate', (registry) => {
  console.log('Sensor registry updated:', registry);
  
  // Handle multiple sensors of same type
  const heartRateSensors = registry.sensors.filter(s => s.sensorType === 'heart_rate');
  if (heartRateSensors.length > 1) {
    console.log(`Found ${heartRateSensors.length} heart rate sensors:`);
    heartRateSensors.forEach(sensor => {
      console.log(`- ${sensor.displayName} (${sensor.device.manufacturer})`);
    });
  }
  
  // Update UI with new sensor information
  updateSensorRegistry(registry);
});

// Real-time data with multiple sensor support
dataFeed.on('sensorData', (data) => {
  console.log(`${data.sensor.displayName}: ${data.value} ${data.unit}`);
  
  // Handle multiple sensors of same type
  if (data.sensor.sensorType === 'heart_rate') {
    updateHeartRateDisplay(data, data.sensor.id); // Pass sensor ID for differentiation
  } else if (data.sensor.sensorType === 'power') {
    updatePowerDisplay(data, data.sensor.id);
  }
  
  // Update charts with sensor-specific data series
  updateChart(data.sensor.sensorType, data.sensor.id, data);
});

// Example: Handle multiple heart rate sensors
function updateHeartRateDisplay(data, sensorId) {
  const displayElement = document.getElementById(`hr-${sensorId}`);
  const labelElement = document.getElementById(`hr-label-${sensorId}`);
  
  displayElement.textContent = `${data.value} BPM`;
  labelElement.textContent = data.sensor.displayName; // e.g., "Wahoo TICKR" vs "Apple Watch"
  
  // Update chart with multiple HR lines
  chart.addDataPoint(sensorId, data.timestamp, data.value);
}

// Connection management
dataFeed.on('connected', () => {
  console.log('Connected to UltiBiker data feed');
});

dataFeed.on('error', (error) => {
  console.error('Data feed error:', error);
  // Automatic reconnection with exponential backoff
});

// Start streaming
await dataFeed.connect();

// Clean shutdown
await dataFeed.disconnect();
```

### Python Async SDK
```python
import asyncio
from ultibiker import UltiBikerClient, SensorType, InterpretationMode

class CyclingAnalytics:
    def __init__(self):
        self.client = UltiBikerClient(api_key='your-api-key')
        self.data_buffer = []
    
    async def analyze_real_time_performance(self, user_id: str):
        # Connect to real-time feed
        async with self.client.create_data_feed(
            user_id=user_id,
            interpretation=InterpretationMode.DEDUPLICATED,
            sensor_types=[SensorType.HEART_RATE, SensorType.POWER]
        ) as feed:
            
            async for data_point in feed:
                await self.process_data_point(data_point)
    
    async def process_data_point(self, data):
        # Access sensor metadata
        sensor = data.sensor
        print(f"{sensor.display_name}: {data.value} {sensor.output_unit}")
        
        # Handle multiple sensors of same type
        if sensor.sensor_type == SensorType.HEART_RATE:
            await self.analyze_hr_data(data, sensor.id)
        elif sensor.sensor_type == SensorType.POWER:
            await self.analyze_power_data(data, sensor.id)
    
    async def analyze_hr_data(self, data, sensor_id):
        # Store data with sensor attribution
        self.hr_data[sensor_id] = data.value
        
        # Compare multiple HR sensors if available
        if len(self.hr_data) > 1:
            chest_strap_hr = self.hr_data.get('chest_strap_sensor_id')
            watch_hr = self.hr_data.get('watch_sensor_id')
            
            if chest_strap_hr and watch_hr:
                difference = abs(chest_strap_hr - watch_hr)
                if difference > 10:  # BPM
                    print(f"HR Variance Alert: Chest={chest_strap_hr}, Watch={watch_hr}, Diff={difference}")
        
        # Process individual sensor data
        await self.calculate_hr_zones(data.value, sensor_id)
    
    async def get_historical_data(self, user_id: str, days: int = 30):
        # Paginated historical data retrieval
        sessions = await self.client.sessions.list(
            user_id=user_id,
            start_date=datetime.now() - timedelta(days=days),
            include_data=True
        )
        
        for session in sessions:
            # Export to different formats
            fit_data = await session.export('fit')
            json_data = await session.export('json')
            
            # Process session data
            await self.analyze_session(session)

# Usage
analytics = CyclingAnalytics()
await analytics.analyze_real_time_performance('user-123')
```

### Java/Android SDK
```java
// Java/Android
public class CyclingDashboard {
    private UltiBikerClient client;
    private DataFeedConnection dataFeed;
    
    public CyclingDashboard() {
        this.client = new UltiBikerClient.Builder()
            .accessToken(getStoredAccessToken())
            .environment(Environment.PRODUCTION)
            .build();
    }
    
    public void startRealTimeMonitoring(String userId) {
        DataFeedConfig config = new DataFeedConfig.Builder()
            .userId(userId)
            .interpretation(InterpretationMode.DEDUPLICATED)
            .sensorTypes(SensorType.HEART_RATE, SensorType.POWER, SensorType.CADENCE)
            .qualityThreshold(75)
            .build();
            
        dataFeed = client.createDataFeed(config);
        
        dataFeed.setOnRegistryUpdateListener(registry -> {
            // Update UI with sensor information
            updateSensorList(registry.getSensors());
        });
        
        dataFeed.setOnSensorDataListener(data -> {
            // Update real-time displays with sensor ID for multi-sensor support
            SensorDefinition sensor = data.getSensor();
            updateMetricDisplay(sensor.getSensorType(), sensor.getId(), data.getValue());
            
            // Handle multiple sensors of same type
            if (sensor.getSensorType() == SensorType.HEART_RATE) {
                updateHeartRateChart(sensor.getId(), sensor.getDisplayName(), data.getValue());
            }
        });
    
    private void updateMetricDisplay(SensorType type, String sensorId, double value) {
        switch (type) {
            case HEART_RATE:
                // Update specific HR display based on sensor ID
                TextView hrDisplay = findViewById(getHRDisplayId(sensorId));
                TextView hrLabel = findViewById(getHRLabelId(sensorId));
                
                hrDisplay.setText(String.format("%.0f BPM", value));
                // Label shows device name for distinction
                break;
            case POWER:
                // Single power meter expected, but could support multiple
                updatePowerDisplay(value);
                break;
        }
    }
        
        dataFeed.setOnErrorListener(error -> {
            Log.e("UltiBiker", "Data feed error: " + error.getMessage());
            // Automatic reconnection handled by SDK
        });
        
        // Start streaming
        dataFeed.connect();
    }
    
    public void loadHistoricalData(String userId, int days) {
        client.sessions()
            .list(userId)
            .startDate(LocalDate.now().minusDays(days))
            .executeAsync()
            .thenAccept(sessions -> {
                // Process historical sessions
                for (Session session : sessions) {
                    processSession(session);
                }
            });
    }
}
```

## 🎛️ Configuration & Environment Management

### Environment Configuration
```typescript
// Development/Staging/Production environments
const client = new UltiBikerClient({
  environment: 'sandbox', // 'sandbox' | 'staging' | 'production'
  
  // Advanced configuration
  config: {
    retryPolicy: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelayMs: 1000
    },
    
    caching: {
      registryTtl: 300000, // 5 minutes
      enableRequestCaching: true
    },
    
    logging: {
      level: 'debug', // 'error' | 'warn' | 'info' | 'debug'
      enableNetworkLogs: true
    },
    
    dataFeed: {
      reconnectOnError: true,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000
    }
  }
});
```

### Error Handling & Resilience
```typescript
class RobustDataProcessor {
  private client: UltiBikerClient;
  private reconnectAttempts = 0;
  private maxReconnects = 5;
  
  async setupDataFeed(userId: string) {
    const feed = this.client.createDataFeed({ userId });
    
    feed.on('error', async (error) => {
      if (error.code === 'AUTH_EXPIRED') {
        // Automatic token refresh
        await this.client.auth.refreshTokens();
        return; // SDK handles reconnection
      }
      
      if (error.code === 'RATE_LIMITED') {
        // Respect rate limits
        const retryAfter = error.retryAfter || 60;
        setTimeout(() => feed.reconnect(), retryAfter * 1000);
        return;
      }
      
      // Handle other errors
      this.handleDataFeedError(error);
    });
    
    feed.on('disconnected', () => {
      if (this.reconnectAttempts < this.maxReconnects) {
        this.reconnectAttempts++;
        setTimeout(() => {
          feed.connect();
        }, Math.pow(2, this.reconnectAttempts) * 1000); // Exponential backoff
      }
    });
    
    feed.on('connected', () => {
      this.reconnectAttempts = 0; // Reset on successful connection
    });
  }
}
```

## 📚 Developer Experience Features

### Interactive API Explorer
```typescript
// Built-in API explorer for development
const explorer = client.createExplorer();

// Test endpoints interactively
const testResult = await explorer.test({
  endpoint: '/api/sessions',
  method: 'GET',
  params: { userId: 'user-123', limit: 10 }
});

console.log('API Response:', testResult.data);
console.log('Performance:', testResult.timing);
```

### Testing & Mocking Utilities
```typescript
import { UltiBikerMockClient } from '@ultibiker/client-js/testing';

// For unit tests and development
const mockClient = new UltiBikerMockClient({
  mockData: {
    sensors: [
      { id: 'hr1', type: 'heart_rate', value: 165 },
      { id: 'pwr1', type: 'power', value: 280 }
    ]
  }
});

// Simulate real-time data for testing
mockClient.simulateDataFeed({
  interval: 1000, // 1 second
  variance: 0.1   // ±10% variance
});
```

### Quick Start Templates

#### React Dashboard Template (with Multi-Sensor Support)
```bash
npx create-ultibiker-app my-cycling-dashboard --template=react-dashboard
cd my-cycling-dashboard
npm start
```

**Generated template includes:**
```jsx
// components/HeartRateCard.jsx
import React, { useState, useEffect } from 'react';

function HeartRateCard({ dataFeed }) {
  const [heartRateSensors, setHeartRateSensors] = useState(new Map());
  const [showAllSensors, setShowAllSensors] = useState(true);
  
  useEffect(() => {
    dataFeed.on('sensorData', (data) => {
      if (data.sensor.sensorType === 'heart_rate') {
        setHeartRateSensors(prev => new Map(prev).set(data.sensor.id, {
          value: data.value,
          displayName: data.sensor.displayName,
          manufacturer: data.sensor.device.manufacturer,
          lastUpdate: Date.now()
        }));
      }
    });
  }, [dataFeed]);
  
  return (
    <div className="heart-rate-card">
      <div className="card-header">
        <h3>💓 Heart Rate</h3>
        {heartRateSensors.size > 1 && (
          <button onClick={() => setShowAllSensors(!showAllSensors)}>
            {showAllSensors ? 'Show Primary' : 'Show All'}
          </button>
        )}
      </div>
      
      {Array.from(heartRateSensors.entries()).map(([sensorId, sensor]) => {
        const isPrimary = sensor.manufacturer === 'Polar'; // Chest strap preference
        
        if (!showAllSensors && !isPrimary) return null;
        
        return (
          <div key={sensorId} className={`sensor-reading ${isPrimary ? 'primary' : 'secondary'}`}>
            <div className="value">{sensor.value} BPM</div>
            <div className="source">{sensor.displayName}</div>
          </div>
        );
      })}
    </div>
  );
}
```

#### Python Analytics Script Template
```bash
pip install ultibiker-cli
ultibiker create analytics-script --language=python --features=multi-sensor
cd cycling-analytics
python main.py
```

**Generated template includes:**
```python
# main.py - Multi-sensor analytics example
import asyncio
from ultibiker import UltiBikerClient, SensorType
from analytics.multi_sensor import MultiSensorAnalyzer

async def main():
    client = UltiBikerClient(api_key=os.getenv('ULTIBIKER_API_KEY'))
    analyzer = MultiSensorAnalyzer()
    
    # Connect to real-time feed with all sensor types
    async with client.create_data_feed(
        user_id='user-123',
        interpretation='raw',  # Get all sensor data for comparison
        sensor_types=[SensorType.HEART_RATE, SensorType.POWER]
    ) as feed:
        
        async for data_point in feed:
            await analyzer.handle_sensor_data(data_point)
            
            # Generate multi-sensor report every 60 seconds
            if analyzer.should_generate_report():
                report = await analyzer.generate_comparative_report()
                print(report)

if __name__ == '__main__':
    asyncio.run(main())
```

#### Mobile App Template
```bash
ultibiker create mobile-app --platform=react-native
# or
ultibiker create mobile-app --platform=android
```

## 🔧 Advanced Features

### Webhook Integration
```typescript
// Handle UltiBiker webhooks
const webhookHandler = client.createWebhookHandler({
  secret: 'your-webhook-secret'
});

webhookHandler.on('session.completed', (session) => {
  console.log('User completed session:', session.id);
  // Trigger post-session analysis
  analyzeCompletedSession(session);
});

webhookHandler.on('device.connected', (device) => {
  console.log('New device connected:', device.displayName);
  // Update device management UI
  updateDeviceList(device);
});

// Express.js integration
app.use('/webhooks/ultibiker', webhookHandler.express());
```

### Batch Operations
```typescript
// Efficient batch operations
const batchProcessor = client.createBatchProcessor();

// Batch multiple API calls
const results = await batchProcessor.execute([
  { method: 'GET', endpoint: '/users/123/sessions' },
  { method: 'GET', endpoint: '/users/123/devices' },
  { method: 'GET', endpoint: '/users/123/preferences' }
]);

// Process results
const [sessions, devices, preferences] = results;
```

### Custom Data Processing Pipelines
```python
from ultibiker import Pipeline, processors

# Create custom data processing pipeline
pipeline = Pipeline([
    processors.DataValidator(),
    processors.OutlierDetector(threshold=2.5),
    processors.Smoother(window_size=5),
    processors.PowerZoneCalculator(ftp=250),
    processors.CustomProcessor(your_custom_function)
])

# Process real-time data through pipeline
async with client.create_data_feed(user_id='user-123') as feed:
    async for data_point in feed:
        processed_data = pipeline.process(data_point)
        await handle_processed_data(processed_data)
```

## 🔀 Multiple Sensor Handling Examples

### JavaScript: Managing Multiple Heart Rate Sensors
```typescript
class MultiSensorDashboard {
  private heartRateSensors = new Map<string, SensorInfo>();
  private heartRateData = new Map<string, number[]>();
  
  setupDataFeed() {
    const client = new UltiBikerClient({ accessToken: 'token' });
    const feed = client.createDataFeed({ userId: 'user-123' });
    
    feed.on('registryUpdate', (registry) => {
      // Track all heart rate sensors
      registry.sensors
        .filter(s => s.sensorType === 'heart_rate')
        .forEach(sensor => {
          this.heartRateSensors.set(sensor.id, {
            id: sensor.id,
            displayName: sensor.displayName,
            manufacturer: sensor.device.manufacturer,
            isPrimary: sensor.device.manufacturer === 'Polar' // Prefer chest strap
          });
        });
      
      this.updateSensorUI();
    });
    
    feed.on('sensorData', (data) => {
      if (data.sensor.sensorType === 'heart_rate') {
        this.handleHeartRateData(data);
      }
    });
  }
  
  handleHeartRateData(data: SensorData) {
    const sensorId = data.sensor.id;
    
    // Store recent readings for comparison
    if (!this.heartRateData.has(sensorId)) {
      this.heartRateData.set(sensorId, []);
    }
    
    const readings = this.heartRateData.get(sensorId)!;
    readings.push(data.value);
    
    // Keep only last 10 readings per sensor
    if (readings.length > 10) readings.shift();
    
    // Update individual sensor display
    this.updateHeartRateDisplay(sensorId, data.value);
    
    // Compare sensors if multiple are active
    if (this.heartRateSensors.size > 1) {
      this.compareSensors();
    }
  }
  
  compareSensors() {
    const currentReadings = new Map<string, number>();
    
    // Get latest reading from each sensor
    this.heartRateData.forEach((readings, sensorId) => {
      if (readings.length > 0) {
        currentReadings.set(sensorId, readings[readings.length - 1]);
      }
    });
    
    // Alert if sensors differ significantly
    const values = Array.from(currentReadings.values());
    if (values.length > 1) {
      const max = Math.max(...values);
      const min = Math.min(...values);
      
      if (max - min > 15) { // More than 15 BPM difference
        console.warn('Heart rate sensors showing significant variance:', {
          readings: currentReadings,
          variance: max - min
        });
        this.showVarianceAlert(currentReadings);
      }
    }
  }
}
```

### Python: Statistical Analysis of Multiple Sensors
```python
from collections import defaultdict
from statistics import median, stdev

class MultiSensorAnalyzer:
    def __init__(self):
        self.sensor_data = defaultdict(list)  # sensor_id -> [readings]
        self.sensor_metadata = {}  # sensor_id -> sensor_info
    
    async def handle_sensor_data(self, data):
        sensor_id = data.sensor.id
        sensor_type = data.sensor.sensor_type
        
        # Store metadata
        if sensor_id not in self.sensor_metadata:
            self.sensor_metadata[sensor_id] = {
                'display_name': data.sensor.display_name,
                'manufacturer': data.sensor.device.manufacturer,
                'model': data.sensor.device.model,
                'sensor_type': sensor_type
            }
        
        # Store reading with timestamp
        self.sensor_data[sensor_id].append({
            'value': data.value,
            'timestamp': data.timestamp,
            'quality': data.quality_score
        })
        
        # Analyze multiple sensors of same type
        if sensor_type == SensorType.HEART_RATE:
            await self.analyze_multiple_hr_sensors()
    
    async def analyze_multiple_hr_sensors(self):
        hr_sensors = {
            sensor_id: readings for sensor_id, readings in self.sensor_data.items()
            if self.sensor_metadata[sensor_id]['sensor_type'] == SensorType.HEART_RATE
        }
        
        if len(hr_sensors) < 2:
            return  # Need at least 2 sensors to compare
        
        # Get last 30 seconds of data from each sensor
        recent_data = {}
        cutoff_time = datetime.now() - timedelta(seconds=30)
        
        for sensor_id, readings in hr_sensors.items():
            recent_readings = [
                r['value'] for r in readings 
                if datetime.fromisoformat(r['timestamp']) > cutoff_time
            ]
            
            if recent_readings:
                recent_data[sensor_id] = {
                    'values': recent_readings,
                    'mean': sum(recent_readings) / len(recent_readings),
                    'median': median(recent_readings),
                    'stdev': stdev(recent_readings) if len(recent_readings) > 1 else 0,
                    'sensor_name': self.sensor_metadata[sensor_id]['display_name']
                }
        
        # Compare sensor accuracy and consistency
        await self.compare_sensor_performance(recent_data)
    
    async def compare_sensor_performance(self, sensor_stats):
        print("\n=== Multi-Sensor HR Analysis ===")
        
        for sensor_id, stats in sensor_stats.items():
            print(f"{stats['sensor_name']}:")
            print(f"  Mean: {stats['mean']:.1f} BPM")
            print(f"  Median: {stats['median']:.1f} BPM")
            print(f"  Std Dev: {stats['stdev']:.1f} BPM")
            print(f"  Consistency: {'High' if stats['stdev'] < 3 else 'Medium' if stats['stdev'] < 6 else 'Low'}")
        
        # Find most stable sensor (lowest standard deviation)
        most_stable = min(sensor_stats.items(), key=lambda x: x[1]['stdev'])
        print(f"\nMost stable sensor: {most_stable[1]['sensor_name']}")
        
        # Check for significant differences between sensors
        means = [stats['mean'] for stats in sensor_stats.values()]
        if max(means) - min(means) > 10:
            print(f"⚠️  Warning: Significant variance between sensors ({max(means):.1f} - {min(means):.1f} = {max(means) - min(means):.1f} BPM)")
            
            # Suggest which sensor to trust more
            chest_sensors = [sid for sid, meta in self.sensor_metadata.items() 
                           if 'chest' in meta['display_name'].lower() or meta['manufacturer'] in ['Polar', 'Garmin']]
            
            if chest_sensors:
                print(f"💡 Recommendation: Prefer chest strap data for accuracy")
```

### Best Practices for Multiple Sensor Applications

```typescript
// Configuration for handling multiple sensors
interface MultiSensorConfig {
  primarySensorSelection: {
    heartRate: 'chest_strap_preferred' | 'watch_preferred' | 'highest_quality' | 'user_choice';
    power: 'crank_preferred' | 'pedal_preferred' | 'highest_quality';
  };
  
  varianceAlerts: {
    heartRateThreshold: number;  // BPM difference to trigger alert
    powerThreshold: number;      // Watts difference to trigger alert
  };
  
  dataStrategy: {
    displayMode: 'all_sensors' | 'primary_only' | 'average' | 'user_toggle';
    exportMode: 'all_sensors' | 'primary_only' | 'merged';
  };
}

// Example application configuration
const config: MultiSensorConfig = {
  primarySensorSelection: {
    heartRate: 'chest_strap_preferred',
    power: 'crank_preferred'
  },
  varianceAlerts: {
    heartRateThreshold: 15,  // Alert if HR sensors differ by >15 BPM
    powerThreshold: 30       // Alert if power sensors differ by >30W
  },
  dataStrategy: {
    displayMode: 'all_sensors',    // Show all sensors in UI
    exportMode: 'all_sensors'      // Export data from all sensors
  }
};
```

This comprehensive SDK approach ensures third-party developers can integrate with UltiBiker effortlessly while maintaining the flexibility to build sophisticated cycling applications that leverage multiple overlapping sensors. The SDK provides clear patterns for handling sensor conflicts, comparing data accuracy, and building user interfaces that display multiple data sources effectively.