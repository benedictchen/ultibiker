# UltiBiker Development TODO List

## 🚨 Critical Issues (Fix First)

### 🔒 Security Vulnerabilities (IMMEDIATE)
- [ ] ~~**CORS Configuration**~~ - **REDUCED PRIORITY** for Electron app
  - **Files**: `src/config/env.ts` line 71, `src/websocket/socket-handler.ts` line 42
  - **Impact**: 🟡 LOW - Not critical for Electron desktop app
  - **Reason**: Electron apps don't face same CORS risks as web deployment
  - **Future**: Will be critical for cloud web service deployment

- [ ] ~~**Request Body Size Limits**~~ - **REDUCED PRIORITY** for Electron app
  - **Files**: `src/middleware/security.ts`
  - **Impact**: 🟡 LOW - Less critical for desktop app (controlled environment)
  - **Reason**: Electron apps have controlled access, not exposed to internet attacks
  - **Future**: Will be critical for cloud API endpoints

- [ ] ~~**API Authentication**~~ - **REMOVED** - Not needed for Electron app MVP
  - **Reason**: This will become an Electron desktop app, not a web service
  - **Future**: JWT authentication will be implemented in cloud deployment phase

### 🔧 Production Readiness (HIGH PRIORITY)
- [ ] **Add Graceful Shutdown Handling** - Proper cleanup of sensors/database/websockets
  - **Files**: `src/server.ts` lines 193-210
  - **Solution**: Implement signal handlers (SIGTERM, SIGINT) with cleanup sequence
  - **Impact**: 🔥 HIGH - Data loss prevention

- [ ] ~~**Health Check Endpoints**~~ - **REDUCED PRIORITY** for Electron app  
  - **Files**: `src/server.ts`, create `src/api/health.ts`
  - **Impact**: 🟡 LOW - Not needed for desktop app deployment
  - **Reason**: Electron apps don't need external health monitoring
  - **Future**: Will be needed for cloud service deployment

- [ ] **Add Database Connection Pooling** - Production scalability
  - **Files**: `src/database/db.ts` lines 37-57
  - **Solution**: Implement connection pool management and health checks
  - **Impact**: 🔥 HIGH - Production reliability

### 🏥 Reliability Issues (HIGH PRIORITY)
- [ ] **Add Sensor Connection Timeouts** - Prevent hanging connections
  - **Files**: `src/sensors/sensor-manager.ts` lines 28-33
  - **Solution**: 30s timeout with exponential backoff retry
  - **Impact**: 🔥 HIGH - User experience degradation

- [ ] **Add Device Reconnection Handling** - Auto-reconnect dropped sensors
  - **Files**: `src/sensors/ble-manager.ts`, `src/sensors/ant-manager.ts`
  - **Solution**: Monitor connection health, implement reconnection logic
  - **Impact**: 🔥 HIGH - Session interruption prevention

### 📋 Comprehensive Error Logging & Crash Reporting (CRITICAL)
- [ ] **Frontend Error Reporting** - Send UI errors to backend logging system
  - **Files**: `public/dashboard.js`, create `src/api/errors.ts` endpoint  
  - **Solution**: Capture JS errors, network failures, send to `/api/errors/report`
  - **Logging**: Write to `output/logs/frontend-errors.log` with timestamps
  - **Impact**: 🔥 CRITICAL - Debug production issues

- [ ] **Structured Server Crash Reports** - Comprehensive crash dump before exit
  - **Files**: `src/server.ts`, `src/services/crash-logger.ts`
  - **Solution**: uncaughtException handler, process.on('SIGTERM/SIGINT')
  - **Output**: `output/logs/crash-reports/crash-YYYY-MM-DD-HH-mm-ss.json`
  - **Include**: Stack trace, memory usage, sensor states, connected devices
  - **Impact**: 🔥 CRITICAL - Production debugging and reliability

- [ ] **Centralized Log Directory Structure** - Organized logging system
  - **Directory**: `output/logs/` with subdirectories:
    - `frontend-errors/` - UI errors, user actions
    - `sensor-events/` - Device connections, data streams  
    - `crash-reports/` - Server failures, unhandled exceptions
    - `performance/` - Memory usage, response times
    - `security/` - Authentication failures, suspicious requests
  - **Libraries**: `winston-daily-rotate-file`, `morgan` for HTTP logs
  - **Impact**: 🔥 HIGH - Production monitoring and debugging

- [ ] **Real-time Error Monitoring** - Live error tracking dashboard
  - **Files**: Create `src/api/monitoring.ts`, update dashboard UI
  - **Features**: Error count, crash frequency, system health status
  - **Integration**: WebSocket notifications for critical errors
  - **Impact**: 🟡 Medium - Proactive issue detection

### UI Consistency Issues
- [x] ✅ **Fix Session UI Inconsistency** - Pause/Export buttons showing when status is "waiting for session"
  - Completed: Sensor Type Categories implementation fixed UI organization
- [x] ✅ **Implement Sensor Type Categories** - Replace generic sensor list with Power/HR/Cadence/Speed slots
  - Completed: Added organized sensor category cards with proper state management

### Permission System
- [x] ✅ **Permission Visibility** - Show users when app lacks Bluetooth/USB permissions
  - Completed: Added permission alert UI in `public/index.html` and `public/dashboard.js`
- [x] ✅ **OS Permission Request Button** - Add button to permission dialog that triggers native OS permission requests
  - Completed: Added native permission request functionality in `src/api/permissions.ts`
- [x] ✅ **Comprehensive BLE Device Identification** - Show manufacturer, model, device type instead of generic "BLE Device"
  - Completed: Added comprehensive device identification with manufacturer database

---

## 📋 Phase 1: High Impact / Low Effort (Next 2-4 weeks)

### 🎯 Sensor Organization & Categorization
- [x] ✅ **Implement Sensor Type Categories** - Replace generic sensor list with Power/HR/Cadence/Speed slots
  - Completed: Added organized sensor category cards with proper state management
  - **Files**: `public/dashboard.js`, `public/index.html` - sensor category slots implemented
  - **Tests**: Added comprehensive test coverage in `tests/ui/sensor-categories.test.ts`

- [ ] **Add Contextual Data Hierarchy** - Group related metrics instead of flat list
  - **Libraries**: Chart.js grouped datasets, lodash for data grouping
  - **Implementation**: Workout > Intervals > Current metrics structure
  - **Priority**: 🔥 High - Better data comprehension

### 🔧 Connection Diagnostics
- [ ] **Enhanced Connection Status Display** - Real-time connection health indicators
  - **Libraries**: Socket.io status events, moment.js for timestamps
  - **Features**: Signal strength, last seen, connection duration
  - **Priority**: 🔥 High - Reduces support burden

- [ ] **Connection Troubleshooting Guide** - Built-in help system
  - **Libraries**: Bootstrap modals, step-by-step wizard component
  - **Content**: Common issues, OS-specific instructions
  - **Priority**: 🟡 Medium - Self-service support

### 📊 Data Visualization Improvements
- [ ] **Real-time Performance Metrics** - Live power curve, HR zones
  - **Libraries**: Chart.js real-time plugins, color zones
  - **Features**: 30s/3min/20min power, HR zone indicators
  - **Priority**: 🔥 High - Core cycling functionality

- [ ] **Session Progress Tracking** - Workout completion, time remaining
  - **Libraries**: Progress bar components, duration formatting
  - **Integration**: Existing session management system
  - **Priority**: 🟡 Medium - User engagement

---

## 🏗️ Phase 2: Technical Advantages (1-3 months)

### 🔌 Multi-Protocol Excellence
- [ ] **ANT+ FE-C Trainer Control** - Smart trainer resistance control
  - **Libraries**: `ant-plus-next` trainer profiles, resistance calculation
  - **Research**: Study Zwift/TrainerRoad ANT+ implementations on GitHub
  - **Priority**: 🔥 High - Competitive differentiation

- [ ] **Bluetooth Trainer Integration** - Support major trainer brands
  - **Libraries**: `@abandonware/noble`, existing BLE FTMS profiles
  - **Research**: Check `wahoo-webhooks` and similar GitHub repos
  - **Priority**: 🔥 High - Market requirement

- [ ] **Power Meter Calibration Tools** - Zero offset, slope adjustment
  - **Libraries**: ANT+ calibration commands, validation utilities
  - **Features**: Guided calibration wizard, calibration history
  - **Priority**: 🟡 Medium - Pro user feature

### 🛠️ Developer-Focused Features  
- [ ] **API Documentation Dashboard** - Interactive API explorer
  - **Libraries**: Swagger UI, OpenAPI spec generation
  - **Integration**: Express.js route documentation
  - **Priority**: 🟡 Medium - Developer attraction

- [ ] **Webhook System** - Real-time data push to external services
  - **Libraries**: Express.js webhooks, retry logic with `axios-retry`
  - **Features**: Configurable endpoints, payload customization
  - **Priority**: 🟡 Medium - Integration capability

- [ ] **Plugin Architecture** - Third-party sensor/service extensions
  - **Libraries**: Dynamic module loading, sandboxed execution
  - **Research**: Study VS Code extension patterns
  - **Priority**: 🔵 Low - Future extensibility

---

## 🚀 Phase 3: Strategic Value (3-6 months)

### 📈 Data Ownership & Analytics
- [ ] **Personal Data Dashboard** - Comprehensive data ownership display
  - **Libraries**: Chart.js advanced charts, data export utilities
  - **Features**: Data retention policies, export formats
  - **Priority**: 🟡 Medium - Privacy compliance

- [ ] **Advanced Analytics Engine** - Training load, fitness trends
  - **Libraries**: ML.js for trend analysis, statistical calculations
  - **Features**: TSS calculation, fitness/fatigue modeling
  - **Priority**: 🔵 Low - Advanced user feature

### 🌐 Ecosystem Integration
- [ ] **Popular Service Integrations** - Strava, TrainingPeaks, Garmin Connect
  - **Libraries**: OAuth2 flows, service-specific APIs
  - **Research**: Study existing integration libraries on NPM
  - **Priority**: 🟡 Medium - User retention

- [ ] **Workout Import/Export** - Support standard formats (TCX, GPX, FIT)
  - **Libraries**: Existing parsers like `tcx-js`, `fit-file-parser`
  - **Features**: Batch import, format conversion
  - **Priority**: 🟡 Medium - Data portability

### 🎨 Customization & Themes
- [ ] **Dark Mode Implementation** - Complete dark theme support
  - **Libraries**: CSS custom properties, theme switching utilities
  - **Features**: Auto/manual toggle, preference persistence
  - **Priority**: 🔵 Low - User preference

- [ ] **Customizable Dashboard Layout** - Drag-and-drop widget arrangement
  - **Libraries**: `react-grid-layout` or vanilla drag-drop
  - **Features**: Widget library, layout templates
  - **Priority**: 🔵 Low - Power user feature

- [ ] **Advanced Data Fields** - Configurable metric displays
  - **Libraries**: Formula parsing, custom calculation engine
  - **Features**: Calculated fields, conditional formatting
  - **Priority**: 🔵 Low - Customization

---

## 🧪 Testing & Quality Assurance

### Test Coverage Expansion
- [ ] **Sensor Integration Tests** - End-to-end hardware simulation
  - **Libraries**: Existing Vitest setup, mock sensor implementations
  - **Coverage**: ANT+, Bluetooth, WebSocket scenarios
  - **Priority**: 🟡 Medium - Quality assurance

- [ ] **Performance Testing Suite** - Load testing for concurrent users
  - **Libraries**: Artillery.js for load testing, performance monitoring
  - **Scenarios**: Multiple sensor streams, WebSocket connections
  - **Priority**: 🔵 Low - Scalability preparation

- [ ] **Cross-Platform Testing** - Windows/macOS/Linux compatibility
  - **Libraries**: Playwright for OS-specific testing
  - **Focus**: Permission handling, hardware access variations
  - **Priority**: 🟡 Medium - Platform support

---

## 📚 Documentation & Community

### User Documentation
- [ ] **Comprehensive User Guide** - Setup, usage, troubleshooting
  - **Tools**: Markdown, screenshots, video guides
  - **Content**: Hardware compatibility, feature walkthroughs
  - **Priority**: 🟡 Medium - User onboarding

- [ ] **Developer Documentation** - API reference, contribution guide
  - **Libraries**: Documentation generators, code examples
  - **Content**: Architecture overview, development setup
  - **Priority**: 🔵 Low - Community building

### Community Features  
- [ ] **Issue Reporting System** - Built-in feedback collection
  - **Libraries**: Form handling, GitHub API integration
  - **Features**: Automatic log collection, issue templates
  - **Priority**: 🔵 Low - Support efficiency

---

## 🔧 Technical Debt & Infrastructure

### Code Quality
- [ ] **Enhanced Error Handling** - Graceful degradation, user-friendly errors
  - **Libraries**: Error boundary patterns, notification systems
  - **Scope**: Sensor failures, network issues, permission denials
  - **Priority**: 🟡 Medium - User experience

- [ ] **Performance Optimization** - Memory usage, rendering efficiency
  - **Tools**: Chrome DevTools, memory profiling
  - **Focus**: Chart rendering, WebSocket message handling
  - **Priority**: 🔵 Low - Optimization

### Security & Privacy
- [ ] **Security Audit** - Vulnerability assessment, dependency updates
  - **Tools**: npm audit, security scanning
  - **Scope**: Authentication, data transmission, storage
  - **Priority**: 🟡 Medium - Security compliance

---

## 📊 Priority Legend
- 🔥 **High Priority**: Core functionality, major UX improvements
- 🟡 **Medium Priority**: Important features, quality improvements  
- 🔵 **Low Priority**: Nice-to-have, future enhancements

## 🎯 Immediate Next Actions (This Week) - Electron App MVP Focus
1. **CRITICAL**: Implement comprehensive error logging system (`output/logs/` structure)
2. **CRITICAL**: Add graceful shutdown handling with crash reporting  
3. **HIGH**: Implement sensor connection timeouts and reconnection logic
4. **HIGH**: Add database connection pooling for reliability
5. **MEDIUM**: Add Electron app packaging and auto-updater setup
6. **FUTURE**: Security items (CORS, auth) deferred to cloud deployment phase

### 📱 New Electron App Priorities  
- [ ] **Electron App Setup** - Package as desktop application
  - **Files**: Add `electron-builder` configuration, main process setup
  - **Libraries**: `electron`, `electron-builder`, `electron-updater`
  - **Impact**: 🔥 HIGH - Core delivery method for MVP

- [ ] **Auto-Updater Integration** - Seamless app updates
  - **Libraries**: `electron-updater`, GitHub releases integration
  - **Impact**: 🟡 MEDIUM - User experience and maintenance

---

## 📝 Notes for Future Development

### Library Research Priorities
- Always check GitHub and NPM before custom implementation
- Focus on TypeScript-compatible libraries
- Prioritize actively maintained packages (commits within 6 months)
- Study existing cycling app implementations for proven patterns

### Key GitHub Repositories to Study
- `ant-plus-next` - ANT+ protocol implementations
- `@abandonware/noble` - Bluetooth Low Energy examples
- Zwift/TrainerRoad open source components
- Chart.js real-time data plugins
- Socket.io performance optimization examples

**Last Updated**: August 29, 2025  
**Total Tasks**: 35+ identified improvements across all phases