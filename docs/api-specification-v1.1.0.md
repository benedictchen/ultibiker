# UltiBiker API Specification v1.1.0
*Complete REST API and WebSocket Documentation*

## 🌐 API Overview

### Base URLs
```
Development:  https://dev-api.ultibiker.com/v1
Staging:      https://staging-api.ultibiker.com/v1  
Production:   https://api.ultibiker.com/v1
WebSocket:    wss://ws.ultibiker.com/v1
```

### Authentication
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-API-Version: 1.1.0
X-Client-ID: ultibiker-web-app
```

## 🔐 Authentication Endpoints

### POST /auth/login
Authenticate user with multiple methods

```typescript
interface LoginRequest {
  method: 'password' | 'oauth' | 'biometric' | 'mfa';
  
  // Password authentication
  email?: string;
  password?: string;
  
  // OAuth authentication  
  provider?: 'google' | 'apple' | 'microsoft' | 'github';
  accessToken?: string;
  idToken?: string;
  
  // Biometric authentication (WebAuthn)
  credentialId?: string;
  authenticatorData?: string;
  clientDataJSON?: string;
  signature?: string;
  userHandle?: string;
  
  // MFA
  totpCode?: string;
  smsCode?: string;
  backupCode?: string;
}

interface LoginResponse {
  status: 'success' | 'account_match_found' | 'mfa_required';
  user?: UserProfile;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number; // seconds
  };
  
  // Account matching scenario
  matchingAccount?: {
    id: string;
    email: string;
    name: string;
    lastActive: string;
    sessionCount: number;
  };
  confidence?: number; // 0.0 to 1.0
  tempToken?: string; // For account merge flow
  
  // MFA scenario
  mfaChallenge?: {
    methods: ('totp' | 'sms' | 'email')[];
    maskedPhone?: string;
    maskedEmail?: string;
  };
}

// Example requests
POST /auth/login
{
  "method": "password",
  "email": "alex@example.com",
  "password": "SecurePassword123!"
}

POST /auth/login
{
  "method": "oauth",
  "provider": "google", 
  "accessToken": "ya29.a0AfH6SMC...",
  "idToken": "eyJhbGciOiJSUzI1NiIs..."
}

POST /auth/login
{
  "method": "biometric",
  "credentialId": "AQIDBAUGBwgJCgsMDQ4PEA",
  "authenticatorData": "SZYN5YgOjGh0NBcPZHZgW4...",
  "clientDataJSON": "eyJvcmlnaW4iOiJodHRwczov...",
  "signature": "MEYCIQCv7EqsBRtf7w2Et...",
  "userHandle": "user123"
}
```

### POST /auth/register  
Register new user account

```typescript
interface RegisterRequest {
  email: string;
  password?: string; // Optional if using OAuth
  name: string;
  timezone?: string;
  
  // OAuth registration
  provider?: 'google' | 'apple' | 'microsoft' | 'github';
  accessToken?: string;
  idToken?: string;
  
  // Privacy preferences
  dataSharing?: boolean;
  analyticsOptIn?: boolean;
  marketingOptIn?: boolean;
}

interface RegisterResponse {
  status: 'success' | 'email_verification_required' | 'account_exists';
  user?: UserProfile;
  tokens?: AuthTokens;
  verificationSent?: boolean;
}
```

### POST /auth/account-merge
Merge detected matching accounts

```typescript
interface AccountMergeRequest {
  tempToken: string; // From login response
  action: 'confirm_merge' | 'create_separate' | 'not_sure';
  primaryAccountId?: string; // Which account to keep as primary
}

interface AccountMergeResponse {
  status: 'merged' | 'separate_created' | 'verification_required';
  user: UserProfile;
  tokens: AuthTokens;
  mergedData?: {
    sessionsCount: number;
    dashboardsCount: number;
    sensorsCount: number;
  };
}
```

### POST /auth/refresh
Refresh expired access token

```typescript
interface RefreshRequest {
  refreshToken: string;
}

interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}
```

## 👤 User Management Endpoints

### GET /users/profile
Get current user profile

```typescript
interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  timezone: string;
  createdAt: string;
  lastLoginAt: string;
  
  preferences: {
    units: 'metric' | 'imperial';
    language: string;
    theme: 'light' | 'dark' | 'auto';
    privacy: {
      dataSharing: boolean;
      profilePublic: boolean;
      activityPublic: boolean;
    };
  };
  
  subscription: {
    plan: 'free' | 'premium' | 'enterprise';
    status: 'active' | 'cancelled' | 'past_due';
    expiresAt?: string;
    features: string[];
  };
  
  stats: {
    totalSessions: number;
    totalDistance: number; // in meters
    totalDuration: number; // in seconds  
    dashboardsInstalled: number;
  };
}
```

### PUT /users/profile
Update user profile

```typescript
interface UpdateProfileRequest {
  name?: string;
  timezone?: string;
  preferences?: {
    units?: 'metric' | 'imperial';
    language?: string;
    theme?: 'light' | 'dark' | 'auto';
    privacy?: {
      dataSharing?: boolean;
      profilePublic?: boolean;
      activityPublic?: boolean;
    };
  };
}
```

### GET /users/authentication-methods
Get user's connected authentication methods

```typescript
interface AuthenticationMethod {
  id: string;
  type: 'password' | 'oauth' | 'biometric' | 'totp';
  provider?: string; // google, apple, etc.
  displayName: string;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

interface AuthMethodsResponse {
  methods: AuthenticationMethod[];
  canDisableMethods: boolean; // At least one method must remain
}
```

### POST /users/authentication-methods
Add new authentication method

```typescript
interface AddAuthMethodRequest {
  type: 'oauth' | 'biometric' | 'totp';
  
  // OAuth
  provider?: 'google' | 'apple' | 'microsoft' | 'github';
  accessToken?: string;
  
  // Biometric (WebAuthn)
  credentialCreationOptions?: PublicKeyCredentialCreationOptions;
  
  // TOTP
  totpSecret?: string;
  totpCode?: string; // Verification
}
```

## 🚴 Cycling Sessions API

### GET /sessions
List user's cycling sessions

```typescript
interface SessionsQuery {
  limit?: number; // Default 50, max 200
  offset?: number;
  startDate?: string; // ISO 8601
  endDate?: string; // ISO 8601
  sessionType?: 'outdoor' | 'indoor' | 'virtual';
  minDistance?: number; // meters
  minDuration?: number; // seconds
  includeData?: boolean; // Include sensor readings
}

interface CyclingSession {
  id: string;
  userId: string;
  name?: string;
  description?: string;
  
  // Timing
  startedAt: string; // ISO 8601
  endedAt?: string;
  duration: number; // seconds
  timezone: string;
  
  // Metrics
  totalDistance?: number; // meters
  totalElevationGain?: number; // meters
  averageSpeed?: number; // m/s
  maxSpeed?: number;
  
  // Power data
  averagePower?: number; // watts
  maxPower?: number;
  normalizedPower?: number;
  trainingStressScore?: number;
  intensityFactor?: number;
  
  // Heart rate data
  averageHeartRate?: number; // bpm
  maxHeartRate?: number;
  
  // Cadence data
  averageCadence?: number; // rpm
  
  // Session metadata
  sessionType: 'outdoor' | 'indoor' | 'virtual';
  weatherConditions?: {
    temperature?: number;
    windSpeed?: number;
    humidity?: number;
    conditions?: string;
  };
  
  // Analysis
  powerZonesDistribution?: Record<string, number>; // seconds in each zone
  heartRateZonesDistribution?: Record<string, number>;
  
  createdAt: string;
  updatedAt: string;
  
  // Conditional data
  sensorData?: SensorReading[]; // If includeData=true
}

interface SessionsResponse {
  sessions: CyclingSession[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}
```

### POST /sessions
Start a new cycling session

```typescript
interface StartSessionRequest {
  name?: string;
  sessionType: 'outdoor' | 'indoor' | 'virtual';
  plannedDuration?: number; // seconds
  notes?: string;
}

interface StartSessionResponse {
  session: CyclingSession;
  websocketUrl: string; // For real-time data
  sessionToken: string; // For WebSocket auth
}
```

### PUT /sessions/{sessionId}
Update session details

```typescript
interface UpdateSessionRequest {
  name?: string;
  description?: string;
  weatherConditions?: {
    temperature?: number;
    windSpeed?: number; 
    humidity?: number;
    conditions?: string;
  };
  equipmentUsed?: string[];
  notes?: string;
}
```

### POST /sessions/{sessionId}/end
End an active session

```typescript
interface EndSessionResponse {
  session: CyclingSession;
  summary: {
    duration: number;
    distance?: number;
    averagePower?: number;
    averageHeartRate?: number;
    achievements?: string[]; // New records, goals met
  };
}
```

### GET /sessions/{sessionId}/export
Export session in various formats

```typescript
interface ExportQuery {
  format: 'fit' | 'tcx' | 'gpx' | 'json' | 'csv';
  includePrivateData?: boolean; // GPS coordinates, etc.
}

// Response: File download with appropriate Content-Type
```

## 📊 Sensor Data API

### GET /sensors/devices
Get user's configured sensor devices

```typescript
interface SensorDevice {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: 'heart_rate' | 'power' | 'cadence' | 'speed' | 'temperature';
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  
  // Connection
  connectionType: 'ant_plus' | 'bluetooth_le';
  deviceId: string; // ANT+ device ID or BLE MAC
  
  // Status
  isActive: boolean;
  isPrimary: boolean; // Primary device for this sensor type
  batteryLevel?: number; // 0-100
  signalStrength?: number;
  lastConnectedAt?: string;
  
  // Configuration
  calibrationData?: Record<string, any>;
  displayPreferences?: {
    unit: string;
    precision: number;
    color?: string;
  };
  
  createdAt: string;
  updatedAt: string;
}

interface SensorDevicesResponse {
  devices: SensorDevice[];
  activeSession?: string; // Current session ID if active
}
```

### POST /sensors/devices
Register a new sensor device

```typescript
interface RegisterDeviceRequest {
  deviceName: string;
  deviceType: 'heart_rate' | 'power' | 'cadence' | 'speed' | 'temperature';
  manufacturer?: string;
  model?: string;
  connectionType: 'ant_plus' | 'bluetooth_le';
  deviceId: string;
  
  // Optional configuration
  isPrimary?: boolean;
  calibrationData?: Record<string, any>;
  displayPreferences?: {
    unit: string;
    precision: number;
    color?: string;
  };
}
```

### PUT /sensors/devices/{deviceId}
Update sensor device configuration

```typescript
interface UpdateDeviceRequest {
  deviceName?: string;
  isPrimary?: boolean;
  isActive?: boolean;
  calibrationData?: Record<string, any>;
  displayPreferences?: {
    unit?: string;
    precision?: number;
    color?: string;
  };
}
```

### GET /sensors/data/latest
Get latest sensor readings for active session

```typescript
interface LatestSensorDataQuery {
  sessionId?: string; // Current session if omitted
  sensorTypes?: string[]; // Filter by sensor types
  maxAge?: number; // Max age in seconds (default 30)
}

interface SensorReading {
  timestamp: string; // ISO 8601
  sessionId: string;
  sensorType: 'heart_rate' | 'power' | 'cadence' | 'speed' | 'temperature';
  deviceId: string;
  deviceName: string;
  value: number;
  unit: string;
  qualityScore?: number; // 0-100
  
  metadata?: {
    batteryLevel?: number;
    signalStrength?: number;
    calibrationStatus?: 'good' | 'needs_calibration' | 'error';
  };
}

interface LatestSensorDataResponse {
  readings: SensorReading[];
  sessionId: string;
  timestamp: string; // When this data was generated
}
```

### GET /sensors/data/history
Get historical sensor data for analysis

```typescript
interface SensorDataHistoryQuery {
  sessionId: string;
  sensorTypes?: string[];
  startTime?: string; // ISO 8601
  endTime?: string;
  granularity?: 'raw' | '1s' | '5s' | '30s' | '1m'; // Data aggregation
  includeMetadata?: boolean;
}

interface SensorDataHistoryResponse {
  sessionId: string;
  granularity: string;
  dataPoints: SensorReading[];
  total: number;
  startTime: string;
  endTime: string;
}
```

## 📱 Dashboard Management API

### GET /dashboards/installed
Get user's installed dashboards

```typescript
interface InstalledDashboard {
  id: string;
  dashboardId: string;
  userId: string;
  
  // Dashboard info
  name: string;
  description: string;
  version: string;
  category: string;
  developerName: string;
  
  // Installation details
  installedAt: string;
  isActive: boolean;
  isPinned: boolean;
  
  // Customization
  customSettings: Record<string, any>;
  layoutPreferences: Record<string, any>;
  
  // Usage stats
  lastUsedAt?: string;
  usageCount: number;
  
  // Status
  needsUpdate: boolean;
  latestVersion?: string;
}

interface InstalledDashboardsResponse {
  dashboards: InstalledDashboard[];
  activeDashboard?: string; // Currently active dashboard ID
}
```

### POST /dashboards/install
Install a dashboard from marketplace

```typescript
interface InstallDashboardRequest {
  dashboardId: string;
  version?: string; // Install specific version, latest if omitted
  setAsActive?: boolean;
}

interface InstallDashboardResponse {
  installation: InstalledDashboard;
  permissions: {
    requested: DashboardPermission[];
    granted: DashboardPermission[];
    requiresApproval: DashboardPermission[];
  };
}

interface DashboardPermission {
  type: 'sensor_data' | 'historical_data' | 'export_data' | 'network_access' | 'notifications';
  level: 'none' | 'basic' | 'full';
  description: string;
  justification: string;
}
```

### PUT /dashboards/{installationId}/activate
Set dashboard as active

```typescript
interface ActivateDashboardResponse {
  activeDashboard: InstalledDashboard;
  deactivatedDashboard?: InstalledDashboard;
}
```

### PUT /dashboards/{installationId}/permissions
Update dashboard permissions

```typescript
interface UpdatePermissionsRequest {
  permissions: {
    [permissionType: string]: 'none' | 'basic' | 'full';
  };
}

interface UpdatePermissionsResponse {
  updatedPermissions: DashboardPermission[];
  requiresRestart: boolean;
}
```

## 🛒 Marketplace API

### GET /marketplace/dashboards
Browse marketplace dashboards

```typescript
interface MarketplaceDashboardsQuery {
  category?: string;
  search?: string;
  sort?: 'popular' | 'recent' | 'rating' | 'name';
  limit?: number;
  offset?: number;
  includePrerelease?: boolean;
}

interface MarketplaceDashboard {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  
  // Developer info
  developerId: string;
  developerName: string;
  developerVerified: boolean;
  
  // Content
  iconUrl: string;
  screenshotUrls: string[];
  
  // Metrics
  installCount: number;
  rating: {
    average: number; // 1.0-5.0
    count: number;
  };
  
  // Status
  publicationStatus: 'published' | 'beta' | 'deprecated';
  compatibility: {
    minVersion: string;
    maxVersion?: string;
    platforms: ('web' | 'mobile' | 'desktop')[];
  };
  
  // Pricing (for future paid dashboards)
  pricing: {
    type: 'free' | 'paid' | 'subscription';
    price?: number; // in cents
    currency?: string;
  };
  
  permissions: DashboardPermission[];
  
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

interface MarketplaceDashboardsResponse {
  dashboards: MarketplaceDashboard[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
  categories: string[]; // Available categories
}
```

### GET /marketplace/dashboards/{dashboardId}
Get detailed dashboard information

```typescript
interface DetailedMarketplaceDashboard extends MarketplaceDashboard {
  longDescription: string;
  changelog: {
    version: string;
    date: string;
    changes: string[];
  }[];
  
  // Reviews (sample)
  reviews: {
    total: number;
    recent: {
      id: string;
      rating: number;
      comment: string;
      authorName: string;
      createdAt: string;
    }[];
  };
  
  // Technical details
  manifest: {
    requiredPermissions: DashboardPermission[];
    supportedSensors: string[];
    minScreenSize?: string;
    maxMemoryUsage?: number; // MB
  };
}
```

## 🔌 Real-time WebSocket API

### Connection
```typescript
// Connect to WebSocket
const ws = new WebSocket('wss://ws.ultibiker.com/v1');

// Authentication message (first message)
ws.send(JSON.stringify({
  type: 'auth',
  token: 'your-jwt-token',
  sessionId: 'current-session-id' // Optional
}));
```

### Message Types

#### Sensor Data Stream
```typescript
// Subscribe to sensor data
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'sensor-data',
  sessionId: 'session-id',
  sensorTypes: ['heart_rate', 'power', 'cadence'] // Optional filter
}));

// Incoming sensor data
interface SensorDataMessage {
  type: 'sensor-data';
  sessionId: string;
  timestamp: string;
  data: SensorReading[];
}
```

#### Session Status Updates
```typescript
// Session started/ended notifications
interface SessionStatusMessage {
  type: 'session-status';
  sessionId: string;
  status: 'started' | 'paused' | 'resumed' | 'ended';
  timestamp: string;
  data?: {
    duration?: number;
    distance?: number;
    averagePower?: number;
  };
}
```

#### Dashboard Updates
```typescript
// Dashboard activation, installation updates
interface DashboardUpdateMessage {
  type: 'dashboard-update';
  action: 'installed' | 'activated' | 'updated' | 'uninstalled';
  dashboardId: string;
  data?: InstalledDashboard;
}
```

#### Error Handling
```typescript
interface ErrorMessage {
  type: 'error';
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Error codes
const ErrorCodes = {
  AUTHENTICATION_FAILED: 'auth_failed',
  SESSION_NOT_FOUND: 'session_not_found',
  SENSOR_DISCONNECTED: 'sensor_disconnected',
  PERMISSION_DENIED: 'permission_denied',
  RATE_LIMITED: 'rate_limited'
};
```

## 📊 Analytics & Insights API

### GET /analytics/summary
Get user analytics summary

```typescript
interface AnalyticsQuery {
  period: 'week' | 'month' | 'year' | 'all_time';
  timezone?: string;
}

interface AnalyticsSummary {
  period: string;
  totalSessions: number;
  totalDistance: number; // meters
  totalDuration: number; // seconds
  totalElevation: number; // meters
  
  averages: {
    sessionDuration: number; // seconds
    distance: number; // meters per session
    power?: number; // watts
    heartRate?: number; // bpm
    cadence?: number; // rpm
    speed: number; // m/s
  };
  
  records: {
    longestRide: {
      duration: number;
      date: string;
      sessionId: string;
    };
    maxPower?: {
      value: number;
      date: string;
      sessionId: string;
    };
    maxHeartRate?: {
      value: number;
      date: string;
      sessionId: string;
    };
  };
  
  trends: {
    sessionsPerWeek: number;
    distanceGrowth: number; // percentage change
    fitnessGrowth?: number; // estimated FTP change
  };
  
  goals?: {
    weeklyDistance?: {
      target: number;
      current: number;
      progress: number; // 0-1
    };
    weeklyDuration?: {
      target: number;
      current: number;
      progress: number;
    };
  };
}
```

### GET /analytics/power-curve
Get user's power curve analysis

```typescript
interface PowerCurveQuery {
  period: 'week' | 'month' | 'year';
  duration?: number[]; // Specific durations in seconds
}

interface PowerCurveResponse {
  period: string;
  curve: {
    duration: number; // seconds
    power: number; // watts
    date: string; // When this power was achieved
    sessionId: string;
  }[];
  
  estimatedFTP: number;
  ftpConfidence: number; // 0-1
  lastTested?: string;
  
  improvements: {
    duration: number;
    currentPower: number;
    previousPower: number;
    improvement: number; // watts gained
    date: string;
  }[];
}
```

## 🔒 Error Handling & Status Codes

### HTTP Status Codes
```typescript
const StatusCodes = {
  // Success
  200: 'OK',
  201: 'Created', 
  204: 'No Content',
  
  // Client Errors
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  
  // Server Errors
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};
```

### Error Response Format
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
    requestId: string;
  };
}

// Common error codes
const ErrorCodes = {
  // Authentication
  INVALID_CREDENTIALS: 'invalid_credentials',
  TOKEN_EXPIRED: 'token_expired',
  ACCOUNT_NOT_FOUND: 'account_not_found',
  MFA_REQUIRED: 'mfa_required',
  
  // Validation
  VALIDATION_ERROR: 'validation_error',
  MISSING_FIELD: 'missing_field',
  INVALID_FORMAT: 'invalid_format',
  
  // Resources
  SESSION_NOT_FOUND: 'session_not_found',
  DEVICE_NOT_FOUND: 'device_not_found',
  DASHBOARD_NOT_FOUND: 'dashboard_not_found',
  
  // Permissions
  INSUFFICIENT_PERMISSIONS: 'insufficient_permissions',
  DASHBOARD_PERMISSION_DENIED: 'dashboard_permission_denied',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  QUOTA_EXCEEDED: 'quota_exceeded',
  
  // Business logic
  SESSION_ALREADY_ACTIVE: 'session_already_active',
  DEVICE_ALREADY_REGISTERED: 'device_already_registered',
  DASHBOARD_ALREADY_INSTALLED: 'dashboard_already_installed'
};
```

## 🚀 Rate Limiting

### Rate Limits by Endpoint
```typescript
const RateLimits = {
  // Authentication (per IP)
  'POST /auth/login': '5 requests per minute',
  'POST /auth/register': '3 requests per minute',
  'POST /auth/refresh': '10 requests per minute',
  
  // General API (per user)
  'GET *': '1000 requests per hour',
  'POST *': '200 requests per hour', 
  'PUT *': '200 requests per hour',
  'DELETE *': '100 requests per hour',
  
  // Real-time data (per user)
  'GET /sensors/data/latest': '60 requests per minute',
  'WebSocket sensor-data': '1 message per second',
  
  // Heavy operations (per user)
  'GET /sessions/*/export': '10 requests per hour',
  'POST /analytics/*': '20 requests per hour'
};
```

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
X-RateLimit-Policy: 1000;w=3600
```

This comprehensive API specification provides developers with all the necessary endpoints and data structures to build powerful integrations with the UltiBiker platform.