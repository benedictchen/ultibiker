# UltiBiker Development Todo List

## Core Implementation Tasks

### 1. Sensor Management Implementation
- [ ] **ANT+ Manager** (`src/sensors/ant-manager.ts`)
  - Replace placeholder with `ant-plus-next` library integration
  - Implement device discovery and pairing
  - Handle heart rate, power, speed/cadence sensors
  - Add connection state management and error handling
  
- [ ] **BLE Manager** (`src/sensors/ble-manager.ts`)
  - Implement using `@abandonware/noble` library
  - Support GATT services (Heart Rate: 0x180D, Power: 0x1818, Speed/Cadence: 0x1816)
  - Handle device scanning, connection, and characteristic reading
  - Add reconnection logic for dropped connections

- [ ] **Unified Sensor Manager** (`src/sensors/sensor-manager.ts`)
  - Orchestrate ANT+ and BLE managers
  - Implement data aggregation and normalization
  - Add real-time data processing pipeline
  - Handle sensor prioritization and conflict resolution

- [ ] **Data Parser Enhancement** (`src/sensors/data-parser.ts`)
  - Implement comprehensive ANT+ message parsing
  - Add BLE characteristic data parsing
  - Include data quality assessment algorithms
  - Add calibration and offset handling

### 2. API Security and Middleware
- [ ] **Security Middleware** (`src/middleware/security.ts`)
  - Implement Helmet.js for security headers
  - Add CORS configuration for cross-origin requests
  - Implement rate limiting with express-rate-limit
  - Add input validation and sanitization

- [ ] **Authentication System** (`src/middleware/auth.ts`)
  - Add JWT-based authentication (future-proofing)
  - Implement API key validation
  - Add role-based access control structure

- [ ] **Error Handling Middleware** (`src/middleware/error-handler.ts`)
  - Centralized error handling and logging
  - Graceful degradation for sensor failures
  - Proper HTTP status codes and error messages

### 3. WebSocket Implementation
- [ ] **Socket Handler** (`src/websocket/socket-handler.ts`)
  - Real-time sensor data broadcasting
  - Room-based streaming for multiple users
  - Device control via WebSocket commands
  - Connection management and heartbeat

- [ ] **Session Management** (`src/websocket/session-manager.ts`)
  - WebSocket-based session control
  - Live session updates and notifications
  - Multi-client synchronization

### 4. Database Layer Optimizations
- [ ] **Schema Enhancements** (`src/database/schema.ts`)
  - Add indexes for query optimization
  - Implement data retention policies
  - Add audit logging capabilities

- [ ] **Repository Pattern** (`src/database/repositories/`)
  - Create type-safe repository classes
  - Implement caching layer for frequently accessed data
  - Add bulk operations for sensor data ingestion

- [ ] **Migration System** (`drizzle/migrations/`)
  - Set up proper migration workflow
  - Add data seeding for development/testing
  - Implement backup and restore procedures

### 5. Permission Management
- [ ] **OS Permissions Handler** (`src/permissions/permission-manager.ts`)
  - Implement PermissionManager class from research
  - Platform-specific Bluetooth/ANT+ permission requests
  - User-friendly permission status reporting

### 6. Performance Optimizations
- [ ] **Data Processing Pipeline**
  - Implement buffering for high-frequency sensor data
  - Add data compression for network transmission
  - Optimize memory usage for long sessions

- [ ] **Caching Strategy**
  - Implement Redis-compatible caching layer
  - Cache frequently accessed device configurations
  - Add session data caching for performance

### 7. Testing Implementation Fixes
- [ ] **Fix Failing Unit Tests** (262 failing tests to address)
  - Implement missing sensor manager methods
  - Complete API endpoint implementations
  - Fix WebSocket handler test expectations
  
- [ ] **E2E Test Environment Setup**
  - Configure Playwright with proper test data
  - Set up test database seeding
  - Add mock sensor simulators for testing

### 8. Configuration and Environment
- [ ] **Environment Configuration** (`src/config/`)
  - Environment-specific configurations
  - Sensor-specific settings management
  - Database connection pooling configuration

- [ ] **Logging System** (`src/utils/logger.ts`)
  - Structured logging with different levels
  - Performance metrics logging
  - Error tracking and reporting

## Priority Implementation Order

### Phase 1: Core Sensor Functionality
1. ANT+ Manager implementation with ant-plus-next
2. BLE Manager implementation with noble
3. Data Parser enhancements
4. Basic error handling

### Phase 2: API and Security
1. Security middleware implementation
2. API endpoint completion
3. WebSocket real-time functionality
4. Permission management system

### Phase 3: Performance and Testing
1. Database optimizations
2. Performance improvements
3. Test suite fixes and validation
4. E2E testing environment

### Phase 4: Production Readiness
1. Comprehensive error handling
2. Logging and monitoring
3. Configuration management
4. Documentation updates

## Development Guidelines

### Third-Party Libraries to Leverage
- **ANT+**: `ant-plus-next` (modern, actively maintained)
- **Bluetooth**: `@abandonware/noble` (cross-platform BLE)
- **Security**: `helmet`, `express-rate-limit`, `cors`
- **Database**: `drizzle-orm` with `better-sqlite3`
- **WebSocket**: `socket.io` (already included)
- **Validation**: `zod` (already included)
- **Testing**: `vitest`, `@playwright/test` (already configured)

### Code Quality Standards
- Follow NO MOCK/FAKE CODE POLICY from README
- Use TypeScript strict mode
- Implement comprehensive error handling
- Add proper JSDoc documentation
- Follow existing code patterns and conventions
- Maintain 80%+ test coverage

### Research References
- OS Permissions: `docs/research/os-permissions-bluetooth-ant.md`
- Architecture: `docs/architecture.md`
- Test Suite: `docs/test-suite-summary.md`
- GitHub examples and third-party library documentation

## Current Status
- ✅ Test suite created (374 tests)
- ✅ Project structure organized
- ✅ OS permissions researched and documented
- ✅ Third-party libraries researched
- ⏳ Core implementation in progress
- ⏳ Test-driven development cycle active

## Notes
- All tests are currently failing by design (TDD Red phase)
- Tests define expected behavior before implementation
- Use `npm run test:unit` to validate progress
- Run `npm run test:all` for comprehensive testing
- Focus on getting tests to pass one module at a time