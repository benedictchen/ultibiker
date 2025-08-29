# UltiBiker MVP Documentation

## 🚴 Welcome to UltiBiker

UltiBiker is a modern, open-source cycling sensor data aggregation platform built with the latest 2025 development tools. This MVP provides real-time sensor data collection, visualization, and management for cycling enthusiasts and athletes.

```
🚴 ULTIBIKER MVP OVERVIEW

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│ 📡 SENSOR INTEGRATION     🖥️  DATA PROCESSING      🌐 WEB INTERFACE            │
│                                                                                 │
│ • ANT+ Sensors           • Real-time Aggregation   • Live Dashboard            │
│ • Bluetooth LE           • SQLite Storage          • Device Management         │
│ • Auto-discovery         • TypeScript Safety       • Session Tracking          │
│ • Multi-protocol         • WebSocket Streaming     • Data Export               │
│                                                                                 │
│ 💓 Heart Rate  ⚡ Power  🔄 Cadence  📏 Speed  🚴 Smart Trainers              │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 📚 Documentation Structure

### Core Documentation
1. **[Architecture Overview](01-architecture-overview.md)** - System design and component relationships
2. **[UI Design](02-ui-design.md)** - User interface specifications and wireframes  
3. **[Database Schema](03-database-schema.md)** - Data models and storage design
4. **[Sensor Integration](04-sensor-integration.md)** - ANT+ and Bluetooth protocol handling
5. **[API Specification](05-api-specification.md)** - REST endpoints and WebSocket events
6. **[Development Setup](06-development-setup.md)** - Getting started with modern tooling
7. **[Multi-Device Aggregation](07-multi-device-aggregation.md)** - Complete data preservation with full attribution
8. **[Data Interpretation APIs](08-interpretation-apis.md)** - Raw vs deduplicated data views
9. **[Data Feed Format](09-data-feed-format.md)** - Efficient registry-based data streaming
10. **[Industry Standards](10-industry-standards.md)** - FIT, TCX, GPX, JSON compatibility
11. **[Client SDK](11-client-sdk.md)** - Third-party developer libraries and authentication

### 🚫 Policy Documentation
15. **[No Mock Code Policy](15-no-mock-code-policy.md)** - **CRITICAL: NO mock, fake, or demo code allowed**

## 🎯 MVP Features

### ✅ Core Functionality
- **Multi-Protocol Support**: Connect to both ANT+ and Bluetooth Low Energy sensors
- **Complete Data Preservation**: Store ALL readings from ALL devices with full attribution
- **Multi-Device Aggregation**: Handle multiple devices receiving same sensor data simultaneously
- **Timezone-Agnostic Timestamps**: ISO8601 timestamps with comprehensive timing metadata
- **Cryptographic Fingerprinting**: Group identical readings with SHA-256 fingerprinting
- **Flexible Data Interpretation**: Raw, deduplicated, and analytics views of the same data
- **Real-time Data Streaming**: Live sensor data with configurable interpretation modes
- **Device Management**: Scan, pair, and manage sensor connections
- **Session Tracking**: Automatic session creation and data persistence
- **Web Dashboard**: Real-time charts and metrics display
- **Data Export**: Export session data in multiple formats

### 📡 Supported Sensors
```
💓 Heart Rate Monitors    (ANT+ & BLE)
⚡ Power Meters          (ANT+ & BLE) 
🔄 Cadence Sensors       (ANT+ & BLE)
📏 Speed Sensors         (ANT+ & BLE)
🚴 Smart Trainers        (ANT+ & BLE)
🎯 Multi-sensors         (Combined Speed + Cadence)
```

### 🛠️ Modern Tech Stack (2025)
- **Runtime**: Bun (3x faster than Node.js)
- **Database**: SQLite + Drizzle ORM (TypeScript-first)
- **Build Tool**: Vite + SWC (lightning-fast development)
- **Code Quality**: Biome (ultra-fast formatting & linting)
- **Testing**: Vitest + Playwright (modern testing stack)

## 🚀 Quick Start

### Prerequisites
- Bun >= 1.0.0 (or Node.js >= 20.0.0)
- ANT+ USB stick (for ANT+ sensors)
- Bluetooth adapter (for BLE sensors)

### Installation
```bash
# Clone repository
git clone <repository-url> ultibiker-mvp
cd ultibiker-mvp

# Install dependencies
bun install

# Initialize database
bun run db:setup

# Start development server
bun run dev

# Open browser
open http://localhost:3000
```

## 🏗️ Architecture Highlights

### Data Flow
```
📡 Sensors → 🔧 Parser → 💾 Database → 📡 WebSocket → 🌐 Browser
```

### Key Components
- **Sensor Manager**: Unified interface for ANT+ and BLE protocols
- **Data Parser**: Normalizes sensor readings with validation
- **Real-time Streaming**: Socket.io for live data updates
- **Web Dashboard**: Interactive charts and device management
- **SQLite Storage**: Local persistence with Drizzle ORM

## 🎨 User Interface

### Device Connection Screen
- Real-time device scanning and discovery
- One-click pairing for detected sensors
- Connection status with signal strength indicators
- Device type auto-identification

### Live Data Dashboard
- Real-time metric cards (HR, Power, Cadence, Speed)
- Interactive charts with smooth animations
- Raw data stream with timestamps
- Session management and data export

## 🌟 Future Vision

This MVP is the foundation for a complete cycling data platform:

1. **Phase 1 (MVP)**: Local sensor aggregation + web dashboard ✅
2. **Phase 2**: Cloud sync + mobile apps
3. **Phase 3**: Third-party developer API
4. **Phase 4**: Marketplace ecosystem

### Ultimate Goal
Create a unified platform that:
- Aggregates data from any cycling sensor
- Provides APIs for third-party developers
- Enables an ecosystem of cycling applications
- Maintains user privacy and data ownership

## 📊 Technical Specifications

### Performance Metrics
- **Data Frequency**: 1Hz sensor readings
- **Connection Range**: ~10m for both ANT+ and BLE
- **Simultaneous Sensors**: Unlimited (hardware dependent)
- **Data Retention**: 30 days local storage (configurable)

### Supported Platforms
- **Desktop**: Windows, macOS, Linux
- **Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile**: Future React Native implementation

## 🤝 Contributing

This is an open-source project welcoming contributions:

1. **Code Contributions**: Follow the development setup guide
2. **Bug Reports**: Use GitHub issues with detailed reproduction steps
3. **Feature Requests**: Discuss in GitHub discussions
4. **Documentation**: Help improve and expand documentation

### Development Guidelines
- TypeScript for all new code
- Biome for code formatting and linting
- Vitest for unit tests
- Playwright for E2E tests
- Follow conventional commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 📞 Support

- **Documentation**: Browse the docs/ folder
- **Issues**: Report bugs on GitHub Issues
- **Discussions**: Join GitHub Discussions
- **Community**: Connect with other cyclists and developers

## 🙏 Acknowledgments

This project builds upon the excellent work of the open-source community:

- **ant-plus-next**: Modern ANT+ integration library
- **noble**: Bluetooth Low Energy support
- **Drizzle ORM**: TypeScript-first database toolkit
- **Bun**: Fast JavaScript runtime
- **Vite**: Next-generation build tool

---

**Ready to start tracking your cycling data?** 🚴‍♀️🚴‍♂️

Follow the [Development Setup Guide](06-development-setup.md) to get started!