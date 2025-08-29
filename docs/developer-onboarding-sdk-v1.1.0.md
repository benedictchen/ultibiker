# UltiBiker Developer Onboarding & SDK Documentation
**Version:** 1.1.0  
**Last Updated:** August 29, 2025  
**Status:** Active

---

## 🚀 Welcome to UltiBiker Development

Welcome to the UltiBiker developer ecosystem! This comprehensive guide will help you build amazing cycling dashboards and integrations using our powerful APIs, SDK, and development tools. Whether you're creating custom analytics, building third-party integrations, or contributing to the core platform, we've got you covered.

### What You Can Build
- **📊 Custom Dashboards**: Real-time cycling analytics and visualizations
- **🧠 ML Analytics**: Advanced performance insights using machine learning
- **📱 Mobile Apps**: Native iOS/Android apps with UltiBiker integration
- **🌐 Web Integrations**: Embed UltiBiker data in your web applications
- **🔗 Third-Party Connectors**: Sync with Strava, TrainingPeaks, Garmin Connect
- **🎮 Gamification**: Achievement systems and social cycling features

---

## 🎯 Quick Start Guide

### 30-Second Setup

```bash
# 1. Install the UltiBiker CLI
npm install -g @ultibiker/cli

# 2. Login to your developer account
ultibiker auth login

# 3. Create your first dashboard
ultibiker create dashboard my-power-analyzer

# 4. Start developing with hot reload
cd my-power-analyzer && ultibiker dev
```

### Your First Dashboard in 5 Minutes

```typescript
// src/dashboard.ts - Your first UltiBiker dashboard
import { UltiBiker, Dashboard, SensorData } from '@ultibiker/sdk';

export class PowerAnalyzerDashboard extends Dashboard {
  name = 'Power Analyzer Pro';
  version = '1.0.0';
  author = 'Your Name';
  
  // Define what data you need
  requiredPermissions = [
    'sensor-data:power',
    'sensor-data:heartrate',
    'session-history:read'
  ];
  
  // Your dashboard's main logic
  async render(data: SensorData): Promise<void> {
    const powerData = data.power.current;
    const zones = this.calculatePowerZones(powerData);
    
    // Create beautiful visualizations
    this.chart('power-zones', {
      type: 'line',
      data: zones,
      options: {
        responsive: true,
        plugins: {
          title: { text: 'Power Zones Analysis' }
        }
      }
    });
    
    // Show real-time metrics
    this.metric('ftp-percentage', {
      value: this.calculateFTPPercentage(powerData),
      label: 'FTP %',
      color: this.getZoneColor(powerData)
    });
  }
  
  private calculatePowerZones(power: number) {
    // Your custom analysis logic
    const ftp = this.user.settings.ftp || 250;
    return {
      zone1: power <= ftp * 0.55,
      zone2: power <= ftp * 0.75,
      zone3: power <= ftp * 0.90,
      zone4: power <= ftp * 1.05,
      zone5: power > ftp * 1.05
    };
  }
}
```

---

## 🛠️ Development Environment Setup

### Prerequisites

```bash
# Required software
- Node.js >= 20.0.0
- npm >= 10.0.0 
- Git
- VS Code (recommended)

# Optional but recommended
- Docker Desktop
- Postman (for API testing)
- Chrome DevTools extensions
```

### IDE Configuration

```json
// .vscode/settings.json - Optimal VS Code setup
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.suggest.autoImports": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll": true,
    "source.organizeImports": true
  },
  "files.associations": {
    "*.ultibiker": "json"
  },
  "emmet.includeLanguages": {
    "typescript": "javascript"
  }
}
```

### Developer Tools Installation

```bash
# UltiBiker development suite
npm install -g @ultibiker/cli
npm install -g @ultibiker/dev-tools
npm install -g @ultibiker/dashboard-validator

# Verify installation
ultibiker --version
ultibiker-dev-tools check-setup
ultibiker-validator --help
```

---

## 🔑 Authentication & API Keys

### Getting Your API Keys

```
┌─────────────────────────────────────────────────────────────────────┐
│                   🔐 DEVELOPER PORTAL ACCESS                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. 🌐 Visit https://developers.ultibiker.com                       │
│  2. 🔑 Login with your UltiBiker account                            │
│  3. ➕ Create new application                                        │
│  4. 📋 Copy your credentials:                                       │
│                                                                     │
│     🔸 Client ID: ub_12345678901234567890                          │
│     🔸 Client Secret: ubs_abcdef1234567890...                      │
│     🔸 API Key: ubk_zyxwvu0987654321...                            │
│                                                                     │
│  5. ⚙️ Configure your development environment                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Environment Configuration

```bash
# .env.development
ULTIBIKER_API_KEY=ubk_your_api_key_here
ULTIBIKER_CLIENT_ID=ub_your_client_id_here  
ULTIBIKER_CLIENT_SECRET=ubs_your_client_secret_here
ULTIBIKER_ENVIRONMENT=sandbox
ULTIBIKER_API_BASE_URL=https://api-sandbox.ultibiker.com
ULTIBIKER_WEBSOCKET_URL=wss://ws-sandbox.ultibiker.com

# Security: Never commit these to version control!
# Add .env* to your .gitignore file
```

### Authentication Flow

```typescript
// Authentication setup
import { UltibikerAuth } from '@ultibiker/sdk';

const auth = new UltibikerAuth({
  clientId: process.env.ULTIBIKER_CLIENT_ID!,
  clientSecret: process.env.ULTIBIKER_CLIENT_SECRET!,
  environment: 'sandbox' // or 'production'
});

// OAuth flow for user authentication
export async function authenticateUser() {
  try {
    // Step 1: Generate authorization URL
    const authUrl = auth.getAuthorizationUrl({
      scopes: ['sensor-data:read', 'sessions:read', 'profile:read'],
      redirectUri: 'http://localhost:3000/callback',
      state: 'random-state-string'
    });
    
    console.log('🔗 Visit this URL to authorize:', authUrl);
    
    // Step 2: Exchange code for tokens (after user authorization)
    const tokens = await auth.exchangeCodeForTokens({
      code: 'authorization-code-from-callback',
      redirectUri: 'http://localhost:3000/callback'
    });
    
    // Step 3: Store tokens securely
    await auth.storeTokens(tokens);
    
    return tokens;
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}
```

---

## 📚 SDK Reference

### Core SDK Components

```typescript
// Main SDK exports
import {
  // Authentication
  UltibikerAuth,
  
  // API clients  
  SensorAPI,
  SessionAPI,
  UserAPI,
  DashboardAPI,
  
  // Dashboard framework
  Dashboard,
  Widget,
  Chart,
  
  // Data types
  SensorData,
  SessionData,
  UserProfile,
  
  // Utilities
  UltibikerError,
  DataValidator,
  EventEmitter
} from '@ultibiker/sdk';
```

### Sensor Data API

```typescript
// Working with real-time sensor data
import { SensorAPI, SensorType } from '@ultibiker/sdk';

export class SensorService {
  private sensorAPI: SensorAPI;
  
  constructor(apiKey: string) {
    this.sensorAPI = new SensorAPI({ apiKey });
  }
  
  // Get current sensor readings
  async getCurrentData(userId: string, sensors: SensorType[]) {
    try {
      const data = await this.sensorAPI.getCurrent({
        userId,
        sensors,
        includeMetadata: true
      });
      
      return {
        power: data.power?.value || 0,
        heartRate: data.heartRate?.value || 0,
        cadence: data.cadence?.value || 0,
        speed: data.speed?.value || 0,
        location: data.gps?.coordinates || null,
        timestamp: data.timestamp
      };
    } catch (error) {
      console.error('Failed to get sensor data:', error);
      throw new UltibikerError('SENSOR_DATA_UNAVAILABLE', error.message);
    }
  }
  
  // Stream real-time data
  streamSensorData(userId: string, callback: (data: SensorData) => void) {
    return this.sensorAPI.stream({
      userId,
      onData: callback,
      onError: (error) => console.error('Streaming error:', error),
      onDisconnect: () => console.log('Stream disconnected'),
      
      // Streaming options
      bufferSize: 100,
      throttleMs: 250,  // 4 updates per second
      sensors: ['power', 'heartRate', 'cadence', 'speed', 'gps']
    });
  }
  
  // Historical data queries
  async getHistoricalData(userId: string, query: HistoricalQuery) {
    return this.sensorAPI.getHistorical({
      userId,
      startDate: query.startDate,
      endDate: query.endDate,
      sensors: query.sensors,
      
      // Aggregation options
      aggregation: 'minute', // second, minute, hour, day
      metrics: ['avg', 'max', 'min'],
      
      // Performance optimization
      limit: 10000,
      compression: 'gzip'
    });
  }
}
```

### Session Management

```typescript
// Managing cycling sessions
import { SessionAPI, Session } from '@ultibiker/sdk';

export class SessionManager {
  private sessionAPI: SessionAPI;
  
  constructor(apiKey: string) {
    this.sessionAPI = new SessionAPI({ apiKey });
  }
  
  // Start a new session
  async startSession(userId: string, sessionConfig: SessionConfig) {
    const session = await this.sessionAPI.create({
      userId,
      name: sessionConfig.name || 'New Ride',
      type: sessionConfig.type || 'road', // road, mountain, trainer
      targetMetrics: sessionConfig.targets,
      
      // Auto-detection settings
      autoStart: true,
      autoPause: true,
      smartRecording: true
    });
    
    console.log(`🚴 Session started: ${session.id}`);
    return session;
  }
  
  // Real-time session updates
  async updateSession(sessionId: string, data: Partial<Session>) {
    return this.sessionAPI.update(sessionId, {
      ...data,
      lastUpdated: new Date().toISOString()
    });
  }
  
  // End session and process data
  async endSession(sessionId: string) {
    const session = await this.sessionAPI.end(sessionId);
    
    // Automatically trigger data processing
    await this.sessionAPI.processMetrics(sessionId, {
      calculatePowerMetrics: true,
      detectIntervals: true,
      analyzePacing: true,
      generateSummary: true
    });
    
    return session;
  }
  
  // Advanced analytics
  async analyzeSession(sessionId: string): Promise<SessionAnalytics> {
    const analytics = await this.sessionAPI.analyze(sessionId, {
      powerAnalysis: {
        ftp: true,
        powerZones: true,
        normalizedPower: true,
        intensityFactor: true
      },
      
      heartRateAnalysis: {
        hrZones: true,
        hrv: true,
        efficiency: true
      },
      
      performanceMetrics: {
        tss: true,        // Training Stress Score
        if: true,         // Intensity Factor  
        vi: true,         // Variability Index
        efficiency: true   // Power/HR efficiency
      }
    });
    
    return analytics;
  }
}
```

### Dashboard Development Framework

```typescript
// Advanced dashboard development
import { Dashboard, Widget, Chart, RealTimeData } from '@ultibiker/sdk';

export class AdvancedPowerDashboard extends Dashboard {
  // Dashboard metadata
  metadata = {
    name: 'Advanced Power Analytics',
    version: '2.1.0',
    author: 'Power Analytics Inc.',
    description: 'Professional power analysis with ML insights',
    category: 'analytics',
    tags: ['power', 'training', 'analytics', 'ml'],
    
    // Pricing (if paid dashboard)
    pricing: {
      type: 'subscription',
      price: 9.99,
      currency: 'USD',
      period: 'month'
    }
  };
  
  // Required permissions
  permissions = [
    'sensor-data:power:read',
    'sensor-data:heartrate:read', 
    'session-history:read',
    'user-profile:read',
    'ml-insights:read'
  ];
  
  // Dashboard configuration schema
  configSchema = {
    ftp: { type: 'number', min: 100, max: 500, default: 250 },
    zones: { type: 'array', items: { type: 'number' } },
    chartTheme: { type: 'string', enum: ['light', 'dark'], default: 'light' },
    updateInterval: { type: 'number', min: 100, max: 5000, default: 250 }
  };
  
  // Dashboard state
  private powerBuffer: number[] = [];
  private predictions: MLPrediction[] = [];
  
  async initialize() {
    // Setup dashboard layout
    this.layout = new GridLayout({
      columns: 12,
      rows: 8,
      responsive: true
    });
    
    // Create widgets
    this.addWidget('power-chart', new PowerChart({
      position: { x: 0, y: 0, w: 8, h: 4 },
      realTime: true,
      showZones: true,
      showPredictions: true
    }));
    
    this.addWidget('metrics-panel', new MetricsPanel({
      position: { x: 8, y: 0, w: 4, h: 4 },
      metrics: ['current-power', 'avg-power', 'ftp-percent', 'predicted-ftp']
    }));
    
    this.addWidget('zone-distribution', new ZoneChart({
      position: { x: 0, y: 4, w: 6, h: 4 },
      type: 'doughnut',
      showPercentages: true
    }));
    
    this.addWidget('ml-insights', new MLInsightsPanel({
      position: { x: 6, y: 4, w: 6, h: 4 },
      showPredictions: true,
      showRecommendations: true
    }));
  }
  
  async onData(data: RealTimeData) {
    const powerData = data.sensors.power;
    
    if (powerData?.value) {
      // Update power buffer for analysis
      this.powerBuffer.push(powerData.value);
      if (this.powerBuffer.length > 300) { // Keep last 5 minutes
        this.powerBuffer.shift();
      }
      
      // Update charts and metrics
      await this.updatePowerChart(powerData);
      await this.updateMetrics(powerData);
      
      // Trigger ML predictions every 30 seconds
      if (this.powerBuffer.length % 120 === 0) {
        await this.updateMLPredictions();
      }
    }
  }
  
  private async updatePowerChart(powerData: PowerSensorData) {
    const chart = this.getWidget('power-chart') as PowerChart;
    
    chart.addDataPoint({
      timestamp: powerData.timestamp,
      value: powerData.value,
      zone: this.calculatePowerZone(powerData.value),
      smoothed: this.calculateSmoothedPower()
    });
  }
  
  private async updateMLPredictions() {
    try {
      // Call ML service for predictions
      const predictions = await this.api.ml.predict({
        data: this.powerBuffer,
        model: 'power-analytics-v2',
        predictions: ['ftp-estimate', 'fatigue-index', 'performance-trend']
      });
      
      this.predictions = predictions;
      
      // Update ML insights panel
      const insightsPanel = this.getWidget('ml-insights') as MLInsightsPanel;
      insightsPanel.updatePredictions(predictions);
      
    } catch (error) {
      console.error('ML prediction failed:', error);
    }
  }
  
  // Custom analysis methods
  private calculatePowerZone(power: number): number {
    const ftp = this.config.ftp;
    const zones = this.config.zones || [0.55, 0.75, 0.90, 1.05, 1.20, 1.50];
    
    for (let i = 0; i < zones.length; i++) {
      if (power <= ftp * zones[i]) {
        return i + 1;
      }
    }
    return zones.length + 1; // Zone 7+
  }
  
  private calculateSmoothedPower(): number {
    if (this.powerBuffer.length < 30) return 0;
    
    // 30-second rolling average
    const recent = this.powerBuffer.slice(-30);
    return recent.reduce((sum, val) => sum + val, 0) / recent.length;
  }
  
  // Lifecycle methods
  async onSessionStart(session: Session) {
    this.reset();
    console.log('📊 Dashboard ready for session:', session.id);
  }
  
  async onSessionEnd(session: Session) {
    // Generate session summary
    const summary = this.generateSessionSummary();
    await this.saveSessionAnalysis(session.id, summary);
  }
  
  private reset() {
    this.powerBuffer = [];
    this.predictions = [];
    this.getWidgets().forEach(widget => widget.reset());
  }
}
```

---

## 🔗 API Integration Examples

### REST API Integration

```typescript
// Complete REST API integration example
import { UltibikerClient } from '@ultibiker/sdk';

export class UltibikerIntegration {
  private client: UltibikerClient;
  
  constructor(apiKey: string, environment = 'production') {
    this.client = new UltibikerClient({
      apiKey,
      environment,
      baseURL: environment === 'production' 
        ? 'https://api.ultibiker.com' 
        : 'https://api-sandbox.ultibiker.com',
      
      // Configuration options
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      
      // Rate limiting
      rateLimitStrategy: 'exponential-backoff'
    });
  }
  
  // User management
  async getUser(userId: string) {
    try {
      const user = await this.client.users.get(userId, {
        include: ['profile', 'preferences', 'settings', 'stats']
      });
      
      return {
        id: user.id,
        name: user.profile.displayName,
        email: user.profile.email,
        ftp: user.settings.training.ftp,
        zones: user.settings.training.powerZones,
        preferences: user.preferences
      };
    } catch (error) {
      if (error.status === 404) {
        throw new Error('User not found');
      }
      throw error;
    }
  }
  
  // Device management
  async getUserDevices(userId: string) {
    const devices = await this.client.devices.list({
      userId,
      status: 'active',
      include: ['capabilities', 'lastSeen']
    });
    
    return devices.map(device => ({
      id: device.id,
      name: device.name,
      type: device.type,
      manufacturer: device.manufacturer,
      model: device.model,
      capabilities: device.capabilities,
      batteryLevel: device.status.battery,
      connectionStatus: device.status.connection,
      lastSeen: device.lastSeen
    }));
  }
  
  // Session queries with advanced filtering
  async getUserSessions(userId: string, filters: SessionFilters = {}) {
    const sessions = await this.client.sessions.list({
      userId,
      
      // Date filtering
      startDate: filters.startDate,
      endDate: filters.endDate,
      
      // Activity filtering
      activityType: filters.activityType,
      minDuration: filters.minDuration,
      minDistance: filters.minDistance,
      
      // Data filtering
      hasData: filters.requiredSensors,
      
      // Sorting and pagination
      sortBy: filters.sortBy || 'startTime',
      sortOrder: filters.sortOrder || 'desc',
      limit: filters.limit || 50,
      offset: filters.offset || 0,
      
      // Data inclusion
      include: ['summary', 'weather', 'route']
    });
    
    return sessions.data.map(session => this.formatSession(session));
  }
  
  // Advanced session analytics
  async getSessionAnalytics(sessionId: string, analysisType: string[] = []) {
    const analytics = await this.client.sessions.analyze(sessionId, {
      analysis: analysisType.length > 0 ? analysisType : [
        'power-analysis',
        'heart-rate-analysis', 
        'pacing-analysis',
        'efficiency-analysis'
      ],
      
      // Analysis configuration
      options: {
        smoothing: '30s',
        excludeZeros: true,
        normalizeData: true
      }
    });
    
    return {
      power: analytics.power ? {
        average: analytics.power.average,
        normalized: analytics.power.normalized,
        ftp: analytics.power.ftp,
        intensityFactor: analytics.power.intensityFactor,
        tss: analytics.power.tss,
        zones: analytics.power.zones
      } : null,
      
      heartRate: analytics.heartRate ? {
        average: analytics.heartRate.average,
        max: analytics.heartRate.max,
        zones: analytics.heartRate.zones,
        hrv: analytics.heartRate.hrv
      } : null,
      
      pacing: analytics.pacing ? {
        variabilityIndex: analytics.pacing.variabilityIndex,
        evenness: analytics.pacing.evenness,
        consistency: analytics.pacing.consistency
      } : null
    };
  }
  
  // Batch data operations
  async batchExportData(userId: string, exportConfig: ExportConfig) {
    // Start export job
    const job = await this.client.export.start({
      userId,
      dataTypes: exportConfig.dataTypes,
      dateRange: exportConfig.dateRange,
      format: exportConfig.format || 'json',
      compression: exportConfig.compression || 'gzip',
      
      // Webhook notification when complete
      webhookUrl: exportConfig.webhookUrl
    });
    
    console.log(`📦 Export job started: ${job.id}`);
    
    // Poll for completion or wait for webhook
    if (!exportConfig.webhookUrl) {
      return this.waitForExport(job.id);
    }
    
    return { jobId: job.id, status: 'started' };
  }
  
  private async waitForExport(jobId: string): Promise<ExportResult> {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    
    while (attempts < maxAttempts) {
      const status = await this.client.export.status(jobId);
      
      if (status.status === 'completed') {
        return {
          downloadUrl: status.downloadUrl,
          expiresAt: status.expiresAt,
          size: status.fileSize
        };
      }
      
      if (status.status === 'failed') {
        throw new Error(`Export failed: ${status.error}`);
      }
      
      // Wait 5 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }
    
    throw new Error('Export timeout - job taking too long');
  }
}
```

### WebSocket Real-Time Integration

```typescript
// Real-time data streaming with WebSocket
import { UltibikerWebSocket, EventType } from '@ultibiker/sdk';

export class RealTimeDataStream {
  private ws: UltibikerWebSocket;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  
  constructor(apiKey: string, userId: string) {
    this.ws = new UltibikerWebSocket({
      apiKey,
      userId,
      
      // Connection options
      autoReconnect: true,
      heartbeatInterval: 30000,
      reconnectInterval: 5000,
      
      // Data filtering
      subscriptions: [
        'sensor-data:real-time',
        'session:updates',
        'device:status',
        'system:notifications'
      ]
    });
    
    this.setupEventHandlers();
  }
  
  private setupEventHandlers() {
    // Connection events
    this.ws.on('connected', () => {
      console.log('🔗 WebSocket connected');
      this.reconnectAttempts = 0;
    });
    
    this.ws.on('disconnected', (reason) => {
      console.log('📡 WebSocket disconnected:', reason);
      this.handleDisconnection();
    });
    
    this.ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
    
    // Data events
    this.ws.on('sensor-data', (data) => {
      this.handleSensorData(data);
    });
    
    this.ws.on('session-update', (session) => {
      this.handleSessionUpdate(session);
    });
    
    this.ws.on('device-status', (device) => {
      this.handleDeviceStatus(device);
    });
  }
  
  private handleSensorData(data: SensorData) {
    // Process real-time sensor data
    const metrics = {
      timestamp: data.timestamp,
      power: data.power?.value || null,
      heartRate: data.heartRate?.value || null,
      cadence: data.cadence?.value || null,
      speed: data.speed?.value || null,
      distance: data.distance?.total || null,
      location: data.gps ? {
        lat: data.gps.latitude,
        lng: data.gps.longitude,
        altitude: data.gps.altitude
      } : null
    };
    
    // Emit processed data to subscribers
    this.emit('metrics-update', metrics);
    
    // Check for alerts/notifications
    this.checkAlerts(metrics);
  }
  
  private checkAlerts(metrics: ProcessedMetrics) {
    const alerts = [];
    
    // Power alerts
    if (metrics.power) {
      if (metrics.power > 400) {
        alerts.push({
          type: 'power-high',
          message: 'High power output sustained',
          value: metrics.power
        });
      }
    }
    
    // Heart rate alerts
    if (metrics.heartRate) {
      const maxHR = 190; // Should come from user profile
      if (metrics.heartRate > maxHR * 0.95) {
        alerts.push({
          type: 'heartrate-high',
          message: 'Approaching maximum heart rate',
          value: metrics.heartRate
        });
      }
    }
    
    if (alerts.length > 0) {
      this.emit('alerts', alerts);
    }
  }
  
  // Advanced subscription management
  subscribeToDevice(deviceId: string, dataTypes: string[] = ['all']) {
    this.ws.subscribe(`device:${deviceId}:data`, {
      dataTypes,
      sampleRate: 'high', // high (4Hz), medium (1Hz), low (0.25Hz)
      bufferSize: 100
    });
  }
  
  subscribeToSession(sessionId: string) {
    this.ws.subscribe(`session:${sessionId}:updates`, {
      includeMetrics: true,
      includeAlerts: true,
      includeEvents: true
    });
  }
  
  // Custom data requests
  async requestHistoricalData(query: HistoricalDataQuery) {
    const requestId = this.generateRequestId();
    
    // Send request via WebSocket
    this.ws.send('data-request', {
      requestId,
      type: 'historical',
      query: {
        startTime: query.startTime,
        endTime: query.endTime,
        sensors: query.sensors,
        aggregation: query.aggregation || '1m'
      }
    });
    
    // Wait for response
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Data request timeout'));
      }, 30000);
      
      const handler = (data: any) => {
        if (data.requestId === requestId) {
          clearTimeout(timeout);
          this.ws.off('data-response', handler);
          resolve(data.result);
        }
      };
      
      this.ws.on('data-response', handler);
    });
  }
  
  private handleDisconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    } else {
      console.error('❌ Max reconnection attempts reached');
      this.emit('connection-failed');
    }
  }
  
  // Graceful shutdown
  async disconnect() {
    console.log('📡 Closing WebSocket connection...');
    await this.ws.close();
  }
}
```

---

## 🧪 Testing & Debugging

### Unit Testing Framework

```typescript
// Testing your dashboard components with REAL sensor data
import { TestHarness, RealSensorData, TestUser } from '@ultibiker/sdk/testing';
import { PowerAnalyzerDashboard } from '../src/dashboard';

describe('PowerAnalyzerDashboard', () => {
  let testHarness: TestHarness;
  let dashboard: PowerAnalyzerDashboard;
  let realUser: TestUser;
  
  beforeEach(async () => {
    // Setup test environment
    testHarness = new TestHarness({
      apiKey: 'test-key',
      environment: 'test'
    });
    
    realUser = testHarness.createUser({
      ftp: 250,
      powerZones: [138, 188, 225, 263, 300, 375]
    });
    
    dashboard = new PowerAnalyzerDashboard();
    await testHarness.loadDashboard(dashboard, realUser);
  });
  
  afterEach(() => {
    testHarness.cleanup();
  });
  
  it('should calculate power zones correctly', () => {
    const testPower = 200;
    const zone = dashboard.calculatePowerZone(testPower);
    expect(zone).toBe(2); // Should be in Zone 2 (Endurance)
  });
  
  it('should handle real-time data updates from real sensors', async () => {
    // NOTE: UltiBiker only supports REAL sensor data
    console.log('⚠️ This test requires actual cycling sensors connected');
    console.log('🚫 Mock/fake sensor data is NOT supported');
    
    // Test with real sensor connection (if available)
    const realSensorConnected = await testHarness.checkRealSensors();
    
    if (!realSensorConnected) {
      console.log('ℹ️ Skipping test - no real sensors available');
      return;
    }
    
    // Wait for real sensor data (this will only work with actual hardware)
    const realData = await testHarness.waitForRealSensorData(5000);
    
    if (realData) {
      await dashboard.onData(realData);
    
    // Verify dashboard state
    const powerChart = dashboard.getWidget('power-chart');
    expect(powerChart.getLatestValue()).toBe(280);
    
    const metricsPanel = dashboard.getWidget('metrics-panel');
    expect(metricsPanel.getMetric('current-power')).toBe(280);
  });
  
  it('should trigger alerts for high power from real sensors only', async () => {
    const alerts: any[] = [];
    dashboard.on('alert', (alert) => alerts.push(alert));
    
    console.log('⚠️ This test requires real power meter producing high power values');
    console.log('🚫 Mock high power data is NOT supported');
    
    // Wait for real high power reading (requires actual high-intensity effort)
    const realHighPowerData = await testHarness.waitForHighPowerReading(450, 30000);
    
    if (realHighPowerData) {
      await dashboard.onData(realHighPowerData);
    
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('power-high');
  });
  
  it('should persist user preferences', async () => {
    // Update dashboard config
    await dashboard.updateConfig({
      ftp: 280,
      chartTheme: 'dark'
    });
    
    // Verify config was saved
    const savedConfig = await testHarness.getUserConfig(mockUser.id, dashboard.id);
    expect(savedConfig.ftp).toBe(280);
    expect(savedConfig.chartTheme).toBe('dark');
  });
  
  it('should handle session lifecycle', async () => {
    const session = testHarness.createSession({
      userId: mockUser.id,
      name: 'Test Ride',
      type: 'road'
    });
    
    // Start session
    await dashboard.onSessionStart(session);
    expect(dashboard.isSessionActive()).toBe(true);
    
    // Collect real sensor data stream (requires real hardware)
    console.log('⚠️ This test requires real sensors for 5-minute data collection');
    console.log('🚫 Mock sensor data stream generation is NOT supported');
    
    // Start real sensor data collection
    const realSensorStream = testHarness.startRealSensorCollection({
      duration: 300, // 5 minutes
      sensors: ['power', 'heartRate', 'cadence'],
      requiresRealHardware: true
    });
    
    if (realSensorStream) {
      await realSensorStream.forEach(async (realData) => {
        await dashboard.onData(realData);
      });
    } else {
      console.log('ℹ️ Test skipped - no real sensors connected');
      return;
    }
    
    // End session
    await dashboard.onSessionEnd(session);
    expect(dashboard.isSessionActive()).toBe(false);
    
    // Verify session summary was generated
    const summary = dashboard.getSessionSummary();
    expect(summary.duration).toBe(300);
    expect(summary.avgPower).toBeGreaterThan(0);
  });
});
```

### Integration Testing

```typescript
// Integration tests with real API
import { UltibikerClient } from '@ultibiker/sdk';
import { testConfig } from './config';

describe('UltiBiker API Integration', () => {
  let client: UltibikerClient;
  let testUserId: string;
  
  beforeAll(async () => {
    client = new UltibikerClient({
      apiKey: testConfig.apiKey,
      environment: 'sandbox'
    });
    
    // Create test user
    const testUser = await client.users.create({
      email: 'test@example.com',
      name: 'Test User',
      settings: {
        ftp: 250,
        zones: [138, 188, 225, 263, 300, 375]
      }
    });
    
    testUserId = testUser.id;
  });
  
  afterAll(async () => {
    // Cleanup test user
    await client.users.delete(testUserId);
  });
  
  it('should authenticate with API key', async () => {
    const response = await client.auth.validate();
    expect(response.valid).toBe(true);
    expect(response.permissions).toContain('sensor-data:read');
  });
  
  it('should create and manage sessions', async () => {
    // Create session
    const session = await client.sessions.create({
      userId: testUserId,
      name: 'Integration Test Session',
      type: 'trainer'
    });
    
    expect(session.id).toBeDefined();
    expect(session.status).toBe('active');
    
    // Update session
    await client.sessions.update(session.id, {
      name: 'Updated Test Session'
    });
    
    // Get session
    const updatedSession = await client.sessions.get(session.id);
    expect(updatedSession.name).toBe('Updated Test Session');
    
    // End session
    const endedSession = await client.sessions.end(session.id);
    expect(endedSession.status).toBe('completed');
  });
  
  it('should handle real-time data streaming', async () => {
    const receivedData: any[] = [];
    
    // Setup WebSocket connection
    const ws = client.streaming.connect(testUserId);
    
    ws.on('sensor-data', (data) => {
      receivedData.push(data);
    });
    
    // Wait for connection
    await new Promise(resolve => ws.on('connected', resolve));
    
    // Connect to real sensors for testing
    console.log('⚠️ This test requires real cycling sensors');
    console.log('🚫 Sensor data simulation is NOT supported');
    
    const realSensorConnection = await client.sensors.connectReal({
      userId: testUserId,
      duration: 10, // 10 seconds
      sensors: ['power', 'heartRate'],
      requiresRealHardware: true
    });
    
    if (!realSensorConnection) {
      console.log('ℹ️ Test skipped - no real sensors available');
      return;
    }
    
    // Wait for data
    await new Promise(resolve => setTimeout(resolve, 12000));
    
    expect(receivedData.length).toBeGreaterThan(8); // ~1Hz for 10 seconds
    expect(receivedData[0]).toHaveProperty('power');
    expect(receivedData[0]).toHaveProperty('heartRate');
    
    ws.disconnect();
  });
  
  it('should handle rate limiting gracefully', async () => {
    const promises = Array.from({ length: 100 }, (_, i) => 
      client.users.get(testUserId)
    );
    
    // Should not throw errors due to rate limiting
    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    expect(successful).toBeGreaterThan(50); // Some should succeed
    
    // Rate limited requests should be retried automatically
    const retried = results.filter(r => 
      r.status === 'rejected' && 
      r.reason.message.includes('rate limit')
    ).length;
    
    expect(retried).toBeLessThan(10); // Most should be retried successfully
  });
});
```

### Debugging Tools

```typescript
// Debugging utilities for development
import { UltibikerDebugger } from '@ultibiker/sdk/debug';

export class DashboardDebugger {
  private debugger: UltibikerDebugger;
  private logs: DebugLog[] = [];
  
  constructor(dashboard: Dashboard) {
    this.debugger = new UltibikerDebugger({
      dashboard,
      logLevel: 'debug',
      enablePerformanceTracking: true,
      enableMemoryTracking: true
    });
    
    this.setupLogging();
  }
  
  private setupLogging() {
    // Intercept dashboard events
    this.debugger.interceptEvents([
      'data-received',
      'widget-updated',
      'config-changed',
      'error-occurred'
    ]);
    
    // Performance monitoring
    this.debugger.trackPerformance([
      'data-processing-time',
      'render-time',
      'memory-usage'
    ]);
    
    // Error tracking
    this.debugger.onError((error, context) => {
      this.logs.push({
        level: 'error',
        timestamp: Date.now(),
        message: error.message,
        stack: error.stack,
        context
      });
      
      console.error('🐛 Dashboard error:', error, context);
    });
  }
  
  // Real-time performance metrics
  getPerformanceMetrics() {
    return {
      averageDataProcessingTime: this.debugger.getAverageProcessingTime(),
      averageRenderTime: this.debugger.getAverageRenderTime(),
      memoryUsage: this.debugger.getMemoryUsage(),
      eventCounts: this.debugger.getEventCounts(),
      errorRate: this.calculateErrorRate()
    };
  }
  
  // Debug data injection
  async injectTestData(scenario: string) {
    const testScenarios = {
      'high-power-interval': () => ({
        power: { value: 400, trend: 'increasing' },
        heartRate: { value: 175, trend: 'stable' },
        cadence: { value: 100, trend: 'stable' }
      }),
      
      'recovery-period': () => ({
        power: { value: 120, trend: 'decreasing' },
        heartRate: { value: 125, trend: 'decreasing' },
        cadence: { value: 70, trend: 'stable' }
      }),
      
      'sprint-finish': () => ({
        power: { value: 800, trend: 'increasing' },
        heartRate: { value: 185, trend: 'increasing' },
        cadence: { value: 120, trend: 'increasing' }
      })
    };
    
    const dataGenerator = testScenarios[scenario];
    if (!dataGenerator) {
      throw new Error(`Unknown test scenario: ${scenario}`);
    }
    
    // Generate and inject test data
    for (let i = 0; i < 30; i++) { // 30 seconds of data
      const data = dataGenerator();
      await this.debugger.injectData({
        ...data,
        timestamp: Date.now() + (i * 1000)
      });
      
      await new Promise(resolve => setTimeout(resolve, 100)); // 10Hz
    }
  }
  
  // Export debug session
  exportDebugSession(): DebugSession {
    return {
      sessionId: this.debugger.sessionId,
      logs: this.logs,
      performance: this.getPerformanceMetrics(),
      events: this.debugger.getEventHistory(),
      config: this.debugger.getDashboardConfig(),
      timestamp: Date.now()
    };
  }
  
  private calculateErrorRate(): number {
    const totalEvents = this.debugger.getTotalEventCount();
    const errorEvents = this.logs.filter(log => log.level === 'error').length;
    return totalEvents > 0 ? errorEvents / totalEvents : 0;
  }
}

// Usage in development
const debugger = new DashboardDebugger(myDashboard);

// Monitor performance
setInterval(() => {
  const metrics = debugger.getPerformanceMetrics();
  if (metrics.averageRenderTime > 16) { // Slower than 60fps
    console.warn('⚠️ Render performance issue detected');
  }
}, 5000);

// Test different scenarios
await debugger.injectTestData('high-power-interval');
await debugger.injectTestData('sprint-finish');
```

---

## 📱 Platform-Specific Guides

### Web Dashboard Development

```html
<!-- Web dashboard HTML structure -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>My UltiBiker Dashboard</title>
    
    <!-- UltiBiker CSS Framework -->
    <link rel="stylesheet" href="https://cdn.ultibiker.com/css/dashboard-v1.1.0.css">
    
    <!-- Chart.js for visualizations -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
</head>
<body>
    <div id="ultibiker-dashboard" class="ub-dashboard">
        <!-- Dashboard content will be injected here -->
    </div>
    
    <!-- UltiBiker SDK -->
    <script src="https://cdn.ultibiker.com/js/sdk-v1.1.0.js"></script>
    <script>
        // Your dashboard JavaScript
        const dashboard = new UltiBiker.Dashboard({
            containerId: 'ultibiker-dashboard',
            apiKey: 'your-api-key',
            userId: 'current-user-id',
            
            // Layout configuration
            layout: {
                type: 'grid',
                columns: 12,
                responsive: true
            },
            
            // Theme
            theme: 'auto', // auto, light, dark
            
            // Real-time updates
            realTime: true,
            updateInterval: 250
        });
        
        // Add widgets
        dashboard.addWidget('power-chart', {
            type: 'line-chart',
            title: 'Power Output',
            position: { x: 0, y: 0, w: 8, h: 4 },
            dataSource: 'sensor:power',
            options: {
                showZones: true,
                smoothing: '3s'
            }
        });
        
        dashboard.addWidget('current-metrics', {
            type: 'metrics-grid',
            position: { x: 8, y: 0, w: 4, h: 4 },
            metrics: [
                { key: 'power', label: 'Power', unit: 'W' },
                { key: 'heartRate', label: 'HR', unit: 'bpm' },
                { key: 'cadence', label: 'Cadence', unit: 'rpm' },
                { key: 'speed', label: 'Speed', unit: 'km/h' }
            ]
        });
        
        // Initialize dashboard
        dashboard.initialize();
    </script>
</body>
</html>
```

### Mobile App Integration (React Native)

```typescript
// React Native dashboard component
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { UltibikerMobile } from '@ultibiker/react-native-sdk';

const { width, height } = Dimensions.get('window');

export const CyclingDashboard: React.FC = () => {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    // Initialize UltiBiker Mobile SDK
    const ultibiker = new UltibikerMobile({
      apiKey: 'your-mobile-api-key',
      environment: 'production'
    });
    
    // Setup real-time data stream
    const stream = ultibiker.streaming.connect({
      userId: 'current-user-id',
      sensors: ['power', 'heartRate', 'cadence', 'speed', 'gps'],
      sampleRate: 'medium' // 1Hz for mobile
    });
    
    stream.on('connected', () => setIsConnected(true));
    stream.on('disconnected', () => setIsConnected(false));
    stream.on('data', (data: SensorData) => setSensorData(data));
    
    return () => stream.disconnect();
  }, []);
  
  return (
    <View style={styles.container}>
      <UltibikerMobile.StatusBar connected={isConnected} />
      
      <UltibikerMobile.MetricsGrid
        data={sensorData}
        layout="compact"
        style={styles.metrics}
        metrics={[
          { key: 'power', size: 'large' },
          { key: 'heartRate', size: 'medium' },
          { key: 'cadence', size: 'medium' },
          { key: 'speed', size: 'medium' }
        ]}
      />
      
      <UltibikerMobile.Chart
        type="realtime-line"
        data={sensorData}
        dataKey="power"
        style={styles.chart}
        options={{
          timeWindow: 300, // 5 minutes
          showZones: true,
          autoScale: true
        }}
      />
      
      <UltibikerMobile.MapView
        location={sensorData?.gps}
        style={styles.map}
        showRoute={true}
        followUser={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  metrics: {
    height: height * 0.3,
    padding: 16,
  },
  chart: {
    height: height * 0.4,
    margin: 16,
  },
  map: {
    flex: 1,
    margin: 16,
  },
});
```

### iOS Native Integration (Swift)

```swift
// Swift iOS integration
import UIKit
import UltibikerSDK

class CyclingViewController: UIViewController {
    @IBOutlet weak var powerLabel: UILabel!
    @IBOutlet weak var heartRateLabel: UILabel!
    @IBOutlet weak var chartView: UBChartView!
    
    private var ultibiker: UltibikerSDK!
    private var dataStream: UBDataStream?
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Initialize SDK
        ultibiker = UltibikerSDK(
            apiKey: "your-ios-api-key",
            environment: .production
        )
        
        setupDataStream()
        setupUI()
    }
    
    private func setupDataStream() {
        dataStream = ultibiker.streaming.connect(
            userId: "current-user-id",
            sensors: [.power, .heartRate, .cadence, .speed]
        )
        
        dataStream?.onConnect { [weak self] in
            DispatchQueue.main.async {
                self?.updateConnectionStatus(connected: true)
            }
        }
        
        dataStream?.onData { [weak self] data in
            DispatchQueue.main.async {
                self?.updateUI(with: data)
            }
        }
        
        dataStream?.onError { error in
            print("Stream error: \(error)")
        }
    }
    
    private func updateUI(with data: UBSensorData) {
        // Update metric labels
        if let power = data.power {
            powerLabel.text = "\(Int(power.value)) W"
            powerLabel.textColor = getPowerZoneColor(power.value)
        }
        
        if let heartRate = data.heartRate {
            heartRateLabel.text = "\(Int(heartRate.value)) bpm"
        }
        
        // Update chart
        chartView.addDataPoint(
            timestamp: data.timestamp,
            value: data.power?.value ?? 0
        )
    }
    
    private func getPowerZoneColor(_ power: Double) -> UIColor {
        let ftp = UserDefaults.standard.double(forKey: "user_ftp")
        let percentage = power / ftp
        
        switch percentage {
        case 0..<0.55: return .gray
        case 0.55..<0.75: return .blue
        case 0.75..<0.90: return .green
        case 0.90..<1.05: return .yellow
        case 1.05..<1.20: return .orange
        default: return .red
        }
    }
    
    private func setupUI() {
        // Configure chart
        chartView.configure(
            type: .realtimeLine,
            timeWindow: 300, // 5 minutes
            showGrid: true,
            showZones: true
        )
        
        // Setup gesture recognizers
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(chartTapped))
        chartView.addGestureRecognizer(tapGesture)
    }
    
    @objc private func chartTapped() {
        // Show chart details
        let detailVC = ChartDetailViewController()
        detailVC.dataSource = chartView.dataSource
        present(detailVC, animated: true)
    }
}
```

---

## 🏪 Publishing to Marketplace

### Dashboard Manifest

```json
{
  "manifest_version": "1.1.0",
  "name": "Advanced Power Analytics",
  "version": "2.1.0",
  "description": "Professional power analysis with machine learning insights for serious cyclists.",
  
  "author": {
    "name": "Power Analytics Inc.",
    "email": "support@poweranalytics.com",
    "website": "https://poweranalytics.com",
    "support_url": "https://poweranalytics.com/support"
  },
  
  "category": "analytics",
  "tags": ["power", "training", "analytics", "machine-learning", "professional"],
  
  "permissions": {
    "required": [
      "sensor-data:power:read",
      "sensor-data:heartrate:read",
      "session-history:read"
    ],
    "optional": [
      "ml-insights:read",
      "social-sharing:write",
      "calendar-integration:write"
    ]
  },
  
  "pricing": {
    "model": "freemium",
    "free_features": ["basic-power-analysis", "real-time-display"],
    "premium_features": ["ml-predictions", "advanced-analytics", "training-recommendations"],
    "premium_price": {
      "amount": 9.99,
      "currency": "USD",
      "period": "month",
      "trial_days": 14
    }
  },
  
  "compatibility": {
    "min_platform_version": "1.0.0",
    "supported_devices": ["web", "mobile", "tablet"],
    "screen_sizes": {
      "min_width": 320,
      "min_height": 480,
      "responsive": true
    }
  },
  
  "resources": {
    "memory_limit": "50MB",
    "cpu_limit": "moderate",
    "network_usage": "minimal",
    "storage_limit": "10MB"
  },
  
  "security": {
    "content_security_policy": "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
    "data_retention": "session_only",
    "third_party_services": [
      {
        "name": "ML Analytics API",
        "purpose": "Power prediction algorithms",
        "data_shared": ["anonymized_power_data"],
        "privacy_policy": "https://poweranalytics.com/privacy"
      }
    ]
  },
  
  "localization": {
    "default_locale": "en",
    "supported_locales": ["en", "es", "fr", "de", "ja"],
    "messages_file": "locales/{locale}/messages.json"
  },
  
  "screenshots": [
    {
      "url": "screenshots/main-dashboard.png",
      "caption": "Real-time power analysis dashboard",
      "size": "1920x1080"
    },
    {
      "url": "screenshots/ml-insights.png", 
      "caption": "Machine learning training insights",
      "size": "1920x1080"
    }
  ],
  
  "changelog": {
    "2.1.0": [
      "Added ML-powered FTP estimation",
      "Improved real-time performance",
      "New training zone recommendations"
    ],
    "2.0.0": [
      "Complete UI redesign",
      "Added premium features",
      "Enhanced data visualization"
    ]
  },
  
  "entry_points": {
    "dashboard": "src/dashboard.js",
    "config": "src/config.js",
    "worker": "src/worker.js"
  },
  
  "build": {
    "output_directory": "dist",
    "bundle_analyzer": true,
    "minification": true,
    "source_maps": false
  }
}
```

### Submission Process

```bash
#!/bin/bash
# publish.sh - Dashboard publishing script

echo "🏪 Publishing to UltiBiker Marketplace"

# 1. Validate dashboard
echo "📋 Running validation checks..."
ultibiker-validator validate --strict
if [ $? -ne 0 ]; then
    echo "❌ Validation failed. Please fix errors and try again."
    exit 1
fi

# 2. Run tests
echo "🧪 Running test suite..."
npm run test:all
if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Please fix and try again."
    exit 1
fi

# 3. Build for production
echo "🔨 Building for production..."
ultibiker build --env=production --optimize

# 4. Security scan
echo "🛡️ Running security scan..."
ultibiker security-scan --deep
if [ $? -ne 0 ]; then
    echo "❌ Security issues detected. Please address and retry."
    exit 1
fi

# 5. Package dashboard
echo "📦 Creating distribution package..."
ultibiker package --include-source-maps=false

# 6. Upload to marketplace
echo "🚀 Uploading to marketplace..."
ultibiker publish \
    --package=dist/dashboard-v2.1.0.zip \
    --release-notes="Enhanced ML features and performance improvements" \
    --visibility=public \
    --pricing-tier=premium

echo "✅ Dashboard published successfully!"
echo "📊 Monitor your dashboard at: https://developers.ultibiker.com/dashboard/advanced-power-analytics"
```

### Review Process

```
┌─────────────────────────────────────────────────────────────────────┐
│                   📋 MARKETPLACE REVIEW PROCESS                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📤 SUBMISSION (Day 0)                                              │
│  ┌─────────────────────────────────────────────────────────────────┤
│  │ ✅ Automated validation checks                                  │
│  │ ✅ Security scan completion                                     │
│  │ ✅ Test suite execution                                         │
│  │ ⏳ Queue for manual review                                      │
│  └─────────────────────────────────────────────────────────────────┤
│                            ▼                                       │
│  🔍 TECHNICAL REVIEW (Days 1-3)                                    │
│  ┌─────────────────────────────────────────────────────────────────┤
│  │ • Code quality assessment                                       │
│  │ • Performance testing                                           │
│  │ • Security vulnerability analysis                               │
│  │ • API usage validation                                          │
│  │ • Resource consumption check                                    │
│  └─────────────────────────────────────────────────────────────────┤
│                            ▼                                       │
│  🎨 UX/UI REVIEW (Days 2-4)                                        │
│  ┌─────────────────────────────────────────────────────────────────┤
│  │ • Design consistency check                                      │
│  │ • Accessibility compliance                                      │
│  │ • Mobile responsiveness                                         │
│  │ • User experience flow                                          │
│  └─────────────────────────────────────────────────────────────────┤
│                            ▼                                       │
│  📋 POLICY COMPLIANCE (Days 3-5)                                   │
│  ┌─────────────────────────────────────────────────────────────────┤
│  │ • Privacy policy review                                         │
│  │ • Data usage compliance                                         │
│  │ • Content appropriateness                                       │
│  │ • Pricing validation                                            │
│  └─────────────────────────────────────────────────────────────────┤
│                            ▼                                       │
│  ✅ APPROVAL & RELEASE (Day 5-7)                                   │
│  ┌─────────────────────────────────────────────────────────────────┤
│  │ • Final approval notification                                   │
│  │ • Marketplace listing activation                                │
│  │ • Developer notification                                        │
│  │ • Analytics dashboard access                                    │
│  └─────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📈 AVERAGE REVIEW TIME: 5-7 business days                         │
│  🚀 EXPEDITED REVIEW: Available for established developers         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎓 Advanced Topics

### Machine Learning Integration

```typescript
// Integrating ML models with your dashboard
import { UltibikerML, MLModel } from '@ultibiker/sdk/ml';

export class MLPoweredDashboard extends Dashboard {
  private mlService: UltibikerML;
  private ftpModel: MLModel;
  private fatigueModel: MLModel;
  
  async initialize() {
    super.initialize();
    
    // Initialize ML service
    this.mlService = new UltibikerML({
      apiKey: this.apiKey,
      region: 'us-east-1' // For low latency
    });
    
    // Load pre-trained models
    this.ftpModel = await this.mlService.loadModel({
      name: 'ftp-estimation-v2',
      version: 'latest',
      cacheLocally: true
    });
    
    this.fatigueModel = await this.mlService.loadModel({
      name: 'fatigue-detection-v1',
      version: 'stable'
    });
  }
  
  async analyzePowerData(powerHistory: PowerData[]): Promise<MLInsights> {
    try {
      // Prepare features for ML models
      const features = this.extractFeatures(powerHistory);
      
      // Run predictions in parallel
      const [ftpPrediction, fatiguePrediction] = await Promise.all([
        this.ftpModel.predict(features.ftp),
        this.fatigueModel.predict(features.fatigue)
      ]);
      
      return {
        estimatedFtp: ftpPrediction.value,
        ftpConfidence: ftpPrediction.confidence,
        fatigueLevel: fatiguePrediction.level,
        fatigueRisk: fatiguePrediction.risk,
        recommendations: this.generateRecommendations(ftpPrediction, fatiguePrediction),
        
        // Model metadata
        modelVersions: {
          ftp: this.ftpModel.version,
          fatigue: this.fatigueModel.version
        }
      };
    } catch (error) {
      console.error('ML analysis failed:', error);
      return this.getFallbackAnalysis(powerHistory);
    }
  }
  
  private extractFeatures(powerHistory: PowerData[]) {
    const recentData = powerHistory.slice(-1000); // Last 1000 data points
    
    return {
      ftp: {
        maxPower: Math.max(...recentData.map(d => d.value)),
        avgPower: recentData.reduce((sum, d) => sum + d.value, 0) / recentData.length,
        powerVariability: this.calculateVariability(recentData),
        duration: recentData.length,
        powerDistribution: this.calculatePowerDistribution(recentData),
        historicalFtp: this.user.settings.ftp || 250
      },
      
      fatigue: {
        powerDecline: this.calculatePowerDecline(recentData),
        heartRateDecoupling: this.calculateHRDecoupling(recentData),
        cadenceDrop: this.calculateCadenceDrop(recentData),
        sessionDuration: this.getSessionDuration(),
        recentTrainingLoad: this.getRecentTrainingLoad()
      }
    };
  }
  
  private generateRecommendations(
    ftpPrediction: MLPrediction,
    fatiguePrediction: MLPrediction
  ): MLRecommendation[] {
    const recommendations = [];
    
    // FTP-based recommendations
    if (ftpPrediction.value > this.user.settings.ftp * 1.05) {
      recommendations.push({
        type: 'ftp-test',
        priority: 'high',
        message: 'Consider doing an FTP test - your power suggests improvement!',
        action: 'Schedule FTP test',
        confidence: ftpPrediction.confidence
      });
    }
    
    // Fatigue-based recommendations
    if (fatiguePrediction.level > 0.8) {
      recommendations.push({
        type: 'recovery',
        priority: 'critical',
        message: 'High fatigue detected - consider reducing intensity',
        action: 'Switch to recovery mode',
        confidence: fatiguePrediction.confidence
      });
    }
    
    return recommendations;
  }
  
  // Custom ML model training (for advanced users)
  async trainCustomModel(trainingData: TrainingData[]): Promise<CustomMLModel> {
    const trainingJob = await this.mlService.training.createJob({
      name: 'custom-power-model',
      algorithm: 'gradient-boosting',
      data: trainingData,
      
      // Training configuration
      hyperparameters: {
        learning_rate: 0.1,
        max_depth: 6,
        n_estimators: 100
      },
      
      // Validation strategy
      validation: {
        strategy: 'time-series-split',
        splits: 5,
        metrics: ['mse', 'mae', 'r2']
      }
    });
    
    console.log(`🤖 Training job started: ${trainingJob.id}`);
    
    // Monitor training progress
    return new Promise((resolve, reject) => {
      const checkProgress = async () => {
        const status = await this.mlService.training.getJobStatus(trainingJob.id);
        
        if (status.state === 'completed') {
          const model = await this.mlService.loadCustomModel(status.modelId);
          resolve(model);
        } else if (status.state === 'failed') {
          reject(new Error(status.error));
        } else {
          setTimeout(checkProgress, 10000); // Check every 10 seconds
        }
      };
      
      checkProgress();
    });
  }
}
```

### Custom Sensor Integration

```typescript
// Integrating custom sensors
import { CustomSensorAdapter, SensorProtocol } from '@ultibiker/sdk/sensors';

export class CustomPowerMeterAdapter extends CustomSensorAdapter {
  protocol: SensorProtocol = 'bluetooth-le';
  deviceName = 'MyCustomPowerMeter';
  serviceUUID = '0000180d-0000-1000-8000-00805f9b34fb';
  
  // Sensor capabilities
  capabilities = {
    power: { frequency: 4, accuracy: 0.5 }, // 4Hz, ±0.5% accuracy
    cadence: { frequency: 4, accuracy: 1 },
    leftRightBalance: { frequency: 1, accuracy: 2 },
    pedalSmoothness: { frequency: 1, accuracy: 5 }
  };
  
  async connect(): Promise<boolean> {
    try {
      // Connect to Bluetooth device
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ name: this.deviceName }],
        optionalServices: [this.serviceUUID]
      });
      
      const server = await this.device.gatt!.connect();
      this.service = await server.getPrimaryService(this.serviceUUID);
      
      // Setup characteristics
      await this.setupCharacteristics();
      
      this.emit('connected');
      return true;
      
    } catch (error) {
      console.error('Connection failed:', error);
      this.emit('error', error);
      return false;
    }
  }
  
  private async setupCharacteristics() {
    // Power measurement characteristic
    const powerChar = await this.service.getCharacteristic('2a63');
    await powerChar.startNotifications();
    powerChar.addEventListener('characteristicvaluechanged', (event) => {
      const data = this.parsePowerData(event.target.value);
      this.emit('data', 'power', data);
    });
    
    // Cadence characteristic
    const cadenceChar = await this.service.getCharacteristic('2a5b');
    await cadenceChar.startNotifications();
    cadenceChar.addEventListener('characteristicvaluechanged', (event) => {
      const data = this.parseCadenceData(event.target.value);
      this.emit('data', 'cadence', data);
    });
  }
  
  private parsePowerData(buffer: ArrayBuffer): PowerData {
    const view = new DataView(buffer);
    
    // Parse according to Bluetooth Power Service specification
    const flags = view.getUint16(0, true);
    let offset = 2;
    
    const power = view.getUint16(offset, true);
    offset += 2;
    
    let leftRightBalance = null;
    if (flags & 0x01) { // Pedal balance present
      leftRightBalance = view.getUint8(offset);
      offset += 1;
    }
    
    return {
      value: power,
      timestamp: Date.now(),
      leftRightBalance,
      quality: this.assessSignalQuality(power)
    };
  }
  
  private assessSignalQuality(power: number): SignalQuality {
    // Custom signal quality assessment
    if (power === 0) return 'no-signal';
    if (power > 2000) return 'poor'; // Unrealistic power
    return 'good';
  }
  
  // Calibration support
  async calibrate(): Promise<CalibrationResult> {
    try {
      const calibChar = await this.service.getCharacteristic('2a68');
      
      // Send calibration command
      const command = new Uint8Array([0x01, 0x00]); // Zero offset calibration
      await calibChar.writeValue(command);
      
      // Wait for calibration response
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Calibration timeout')), 30000);
        
        const handler = (event: Event) => {
          const result = this.parseCalibrationResult(event.target.value);
          calibChar.removeEventListener('characteristicvaluechanged', handler);
          clearTimeout(timeout);
          resolve(result);
        };
        
        calibChar.addEventListener('characteristicvaluechanged', handler);
      });
      
    } catch (error) {
      throw new Error(`Calibration failed: ${error.message}`);
    }
  }
  
  // Firmware update support
  async updateFirmware(firmwareData: ArrayBuffer): Promise<void> {
    const dfuService = await this.service.device.gatt.getPrimaryService('8ec90001-f315-4f60-9fb8-838830daea50');
    const dfuChar = await dfuService.getCharacteristic('8ec90002-f315-4f60-9fb8-838830daea50');
    
    // Implement DFU (Device Firmware Update) protocol
    const chunkSize = 20; // BLE packet size
    const totalChunks = Math.ceil(firmwareData.byteLength / chunkSize);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, firmwareData.byteLength);
      const chunk = firmwareData.slice(start, end);
      
      await dfuChar.writeValue(chunk);
      
      // Progress update
      this.emit('firmware-progress', {
        progress: (i + 1) / totalChunks,
        chunk: i + 1,
        total: totalChunks
      });
      
      // Small delay to prevent overwhelming the device
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    this.emit('firmware-updated');
  }
}

// Register custom sensor
UltibikerSDK.sensors.registerAdapter(CustomPowerMeterAdapter);
```

### Performance Optimization

```typescript
// Advanced performance optimization techniques
export class OptimizedDashboard extends Dashboard {
  private dataBuffer: RingBuffer<SensorData>;
  private renderQueue: RenderTask[];
  private webWorker: Worker;
  private virtualDOM: VirtualNode;
  
  constructor() {
    super();
    
    // Initialize performance optimizations
    this.dataBuffer = new RingBuffer<SensorData>(1000); // Keep last 1000 samples
    this.renderQueue = [];
    
    // Setup Web Worker for heavy computations
    this.webWorker = new Worker('/workers/data-processing.js');
    this.webWorker.onmessage = (event) => {
      this.handleWorkerResult(event.data);
    };
    
    // Virtual DOM for efficient updates
    this.virtualDOM = this.createVirtualDOM();
  }
  
  // Optimized data processing
  async onData(data: SensorData) {
    // Add to buffer (O(1) operation)
    this.dataBuffer.push(data);
    
    // Batch data processing
    if (this.dataBuffer.length % 4 === 0) { // Process every 4 samples
      await this.processBatchedData();
    }
    
    // Throttled rendering
    this.scheduleRender();
  }
  
  private async processBatchedData() {
    const recentData = this.dataBuffer.slice(-16); // Last 16 samples
    
    // Offload heavy computations to Web Worker
    this.webWorker.postMessage({
      type: 'process-power-data',
      data: recentData,
      config: {
        smoothingWindow: 30,
        calculateZones: true,
        detectIntervals: true
      }
    });
  }
  
  private scheduleRender() {
    // Debounced rendering at 60fps max
    if (!this.renderScheduled) {
      this.renderScheduled = true;
      requestAnimationFrame(() => {
        this.performRender();
        this.renderScheduled = false;
      });
    }
  }
  
  private performRender() {
    // Virtual DOM diffing for minimal updates
    const newVDOM = this.createVirtualDOM();
    const patches = diff(this.virtualDOM, newVDOM);
    
    // Apply only necessary DOM updates
    applyPatches(this.container, patches);
    
    this.virtualDOM = newVDOM;
  }
  
  // Memory management
  private cleanupOldData() {
    // Remove data older than 1 hour
    const cutoff = Date.now() - (60 * 60 * 1000);
    
    while (this.dataBuffer.length > 0 && this.dataBuffer.peek().timestamp < cutoff) {
      this.dataBuffer.shift();
    }
    
    // Garbage collection hint
    if (performance.memory && performance.memory.usedJSHeapSize > 50 * 1024 * 1024) {
      this.requestGarbageCollection();
    }
  }
  
  // Canvas-based high-performance charts
  private renderHighPerformanceChart(canvas: HTMLCanvasElement, data: number[]) {
    const ctx = canvas.getContext('2d')!;
    const { width, height } = canvas;
    
    // Clear with single operation
    ctx.clearRect(0, 0, width, height);
    
    // Batch drawing operations
    ctx.beginPath();
    
    const stepX = width / data.length;
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const valueRange = maxValue - minValue;
    
    // Single path for entire line
    data.forEach((value, index) => {
      const x = index * stepX;
      const y = height - ((value - minValue) / valueRange) * height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    // Single stroke operation
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  // Resource monitoring
  monitorPerformance() {
    setInterval(() => {
      if (performance.memory) {
        const memoryInfo = {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        };
        
        console.log(`🧠 Memory: ${memoryInfo.used}MB / ${memoryInfo.total}MB (${memoryInfo.limit}MB limit)`);
        
        // Warning if memory usage is high
        if (memoryInfo.used > memoryInfo.limit * 0.8) {
          console.warn('⚠️ High memory usage detected');
          this.cleanupOldData();
        }
      }
      
      // Measure render performance
      const renderStart = performance.now();
      this.performRender();
      const renderTime = performance.now() - renderStart;
      
      if (renderTime > 16) { // Slower than 60fps
        console.warn(`⚠️ Slow render: ${renderTime.toFixed(2)}ms`);
      }
    }, 5000);
  }
}
```

---

## 🤝 Community & Support

### Getting Help

- **📚 Documentation**: https://docs.ultibiker.com
- **💬 Discord Community**: https://discord.gg/ultibiker
- **❓ Stack Overflow**: Tag your questions with `ultibiker-sdk`
- **🐛 Bug Reports**: https://github.com/ultibiker/sdk/issues
- **📧 Developer Support**: developers@ultibiker.com

### Contributing to the Ecosystem

- **🔧 SDK Contributions**: Help improve the SDK on GitHub
- **📖 Documentation**: Contribute to developer docs
- **🎨 UI Components**: Create reusable dashboard components
- **🧩 Example Dashboards**: Share your dashboard code
- **🌍 Translations**: Help localize the platform

### Developer Resources

- **📺 Video Tutorials**: https://youtube.com/ultibikerdev
- **🎓 Developer Courses**: https://learn.ultibiker.com
- **📰 Developer Blog**: https://blog.ultibiker.com/developers
- **🎪 Developer Events**: Join our monthly virtual meetups
- **💰 Bug Bounty Program**: Earn rewards for finding security issues

---

**📋 Document Control**
- **Classification**: Public
- **Owner**: Developer Relations Team
- **Review Cycle**: Quarterly
- **Next Review**: November 2025
- **Distribution**: All Developers

---

*Ready to build amazing cycling experiences? Start with `npm install -g @ultibiker/cli` and join thousands of developers in the UltiBiker ecosystem!*