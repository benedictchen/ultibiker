# UltiBiker Development TODO List

## 🚨 Critical Issues (Fix First)

### UI Consistency Issues
- [ ] **Fix Session UI Inconsistency** - Pause/Export buttons showing when status is "waiting for session"
  - Location: `public/dashboard.js` - connect button states to actual session status
  - Impact: User confusion about app state

### Permission System
- [x] ✅ **Permission Visibility** - Show users when app lacks Bluetooth/USB permissions
  - Completed: Added permission alert UI in `public/index.html` and `public/dashboard.js`
- [ ] **OS Permission Request Button** - Add button to permission dialog that triggers native OS permission requests
  - **Libraries**: Research cross-platform permission libraries, leverage existing electron/node solutions
  - **Files**: `public/dashboard.js`, `src/services/permission-manager.ts`
  - **Impact**: 🔥 Critical - Users can't grant permissions without this
- [ ] **Comprehensive BLE Device Identification** - Show manufacturer, model, device type instead of generic "BLE Device"
  - **Libraries**: `advlib-ble-manufacturers`, bluetooth-numbers-database, device info service parsing
  - **Files**: `src/sensors/ble-manager.ts`, device identification database
  - **Impact**: 🔥 High - Users need to know what devices they're connecting to

---

## 📋 Phase 1: High Impact / Low Effort (Next 2-4 weeks)

### 🎯 Sensor Organization & Categorization
- [ ] **Implement Sensor Type Categories** - Replace generic sensor list with Power/HR/Cadence/Speed slots
  - **Libraries**: Use existing sensor classification in `ant-plus-next`
  - **Files**: `public/dashboard.js`, `src/services/sensor-manager.ts`
  - **UI**: Bootstrap card components with sensor type icons
  - **Priority**: 🔥 High - Major UX improvement

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

## 🎯 Immediate Next Actions (This Week)
1. Fix session UI inconsistency (Pause/Export buttons)
2. Begin sensor categorization implementation
3. Research Chart.js real-time plugins for performance metrics
4. Study ANT+ trainer control examples on GitHub

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