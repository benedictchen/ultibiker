# UltiBiker MVP - Architecture Overview

## 🚴 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           🚴 ULTIBIKER MVP PROTOTYPE                            │
└─────────────────────────────────────────────────────────────────────────────────┘

📡 SENSOR LAYER                    🖥️  NODE.JS SERVER                   🌐 WEB UI
┌─────────────────┐               ┌─────────────────────┐             ┌──────────────┐
│                 │               │                     │             │              │
│ 💓 ANT+ Sensors │──────────────▶│  📊 Data Aggregator │──────────▶│  📈 Live     │
│ • Heart Rate    │   USB/Stick   │  • ant-plus-next    │   WebSocket │  Dashboard   │
│ • Power Meter   │               │  • Data Parser      │             │              │
│ • Cadence       │               │  • Timestamp        │             │              │
│                 │               │         │           │             │              │
├─────────────────┤               │         ▼           │             │              │
│                 │               │  🗃️  SQLite DB      │             │  📊 Charts   │
│ 📶 BLE Sensors  │──────────────▶│  • sensor_data      │──────────▶│  • Speed     │
│ • Heart Rate    │   Bluetooth   │  • devices          │    HTTP     │  • Heart Rate│
│ • Speed/Cadence │               │  • sessions         │             │  • Power     │
│ • Trainer       │               │         │           │             │  • Cadence   │
│                 │               │         ▼           │             │              │
└─────────────────┘               │  🔄 Real-time Feed  │             │              │
                                  │  • Socket.io        │             │  🔄 Auto     │
                                  │  • Live Streaming   │             │  Refresh     │
                                  │  • JSON API         │             │              │
                                  └─────────────────────┘             └──────────────┘
```

## 🎯 MVP Goals

### Primary Objectives
1. **Sensor Integration**: Connect and read data from ANT+ and Bluetooth Low Energy cycling sensors
2. **Data Aggregation**: Unify sensor data into a consistent format with timestamps
3. **Real-time Display**: Show live sensor data in a web dashboard
4. **Data Persistence**: Store sensor data and device configurations locally
5. **Device Management**: Scan, pair, and manage sensor connections

### Core Components

#### 📡 Sensor Layer
- **ANT+ Integration**: Using `ant-plus-next` library
- **BLE Integration**: Using `@abandonware/noble` library
- **Supported Sensors**: Heart rate, power meters, speed/cadence, smart trainers
- **Device Discovery**: Automatic scanning and identification

#### 🖥️ Backend Server
- **Runtime**: Bun for maximum performance
- **Framework**: Express.js with TypeScript
- **Real-time**: Socket.io for WebSocket connections
- **Database**: SQLite with Drizzle ORM
- **API**: RESTful endpoints + real-time streams

#### 🌐 Frontend Interface
- **Build Tool**: Vite with SWC compiler
- **UI Framework**: Vanilla JavaScript + Bootstrap (MVP simplicity)
- **Charts**: Chart.js for real-time data visualization
- **WebSocket**: Socket.io-client for live updates

## 🔄 Data Flow

```
Sensors ───▶ Parser ───▶ Database ───▶ Stream ───▶ Web UI

  📡               🔧           💾            📡          🖥️
ANT+/BLE     ┌─────────────┐ ┌─────────────┐ ┌─────────┐ ┌──────────┐
Sensors  ───▶│ TypeScript  │▶│ SQLite +    │▶│Socket.IO│▶│ Browser  │
             │ Parsers     │ │ Drizzle ORM │ │WebSocket│ │Dashboard │
             │• Heart Rate │ │             │ │         │ │          │
             │• Power      │ │ {           │ │  📊     │ │   📈     │
             │• Speed      │ │  timestamp, │ │Live Feed│ │Live Chart│
             │• Cadence    │ │  sensors: { │ │         │ │          │
             └─────────────┘ │    hr: 165, │ └─────────┘ └──────────┘
                             │    power:280│
                             │    speed: 35│
                             │    cadence:90
                             │  }
                             │ }
                             └─────────────┘
```

## 🛠️ Technology Stack

### Development Tools (2025 Modern Stack)
- **Runtime**: Bun (all-in-one JavaScript runtime)
- **Database**: SQLite + Drizzle ORM (lightweight, TypeScript-first)
- **Build Tool**: Vite + SWC (lightning-fast development)
- **Code Quality**: Biome (ultra-fast formatting & linting)
- **Testing**: Vitest + Playwright (modern testing stack)

### Core Libraries
- **ANT+**: `ant-plus-next` - Modern TypeScript ANT+ library
- **Bluetooth**: `@abandonware/noble` - BLE central module
- **Web Server**: `express` - Minimalist web framework
- **Real-time**: `socket.io` - WebSocket communication
- **Database**: `better-sqlite3` + `drizzle-orm` - Fast SQLite access
- **Frontend**: `chart.js` - Real-time data visualization

## 🏗️ Project Structure

```
📁 ultibiker-mvp/
├── 📁 docs/                     📚 Architecture documentation
├── 📁 src/
│   ├── 📄 server.ts             🖥️  Main server entry point
│   ├── 📁 sensors/              📡 Sensor integration
│   │   ├── 📄 ant-manager.ts    📡 ANT+ device management
│   │   ├── 📄 ble-manager.ts    📶 Bluetooth device management
│   │   └── 📄 data-parser.ts    🔧 Unified data parsing
│   ├── 📁 database/             🗃️  Database layer
│   │   ├── 📄 schema.ts         📋 Drizzle database schema
│   │   ├── 📄 migrations.ts     🔄 Database migrations
│   │   └── 📁 models/           📊 Data access objects
│   ├── 📁 api/                  🌐 REST API endpoints
│   │   ├── 📄 devices.ts        📱 Device management
│   │   ├── 📄 sessions.ts       🏃 Session management
│   │   └── 📄 feed.ts           📊 Data feed endpoints
│   └── 📁 types/                🏷️  TypeScript definitions
├── 📁 public/                   🌐 Frontend assets
│   ├── 📄 index.html            📄 Main dashboard page
│   ├── 📄 dashboard.js          📊 Real-time UI logic
│   └── 📄 styles.css            💄 Styling
├── 📄 package.json              📦 Dependencies
├── 📄 bunfig.toml               ⚙️  Bun configuration
├── 📄 drizzle.config.ts         🗃️  Database configuration
├── 📄 vite.config.ts            ⚡ Build tool configuration
└── 📄 biome.json                🧹 Code quality configuration
```

## 🔑 Key Design Principles

1. **TypeScript First**: Full type safety across the entire stack
2. **Real-time by Default**: All sensor data streams live to the UI
3. **Lightweight**: Minimal dependencies, fast startup times
4. **Extensible**: Clean separation of concerns for future features
5. **Developer Experience**: Modern tooling with instant feedback
6. **Cross-platform**: Works on Windows, macOS, and Linux

## 🚀 Getting Started

```bash
# Setup project
bun install

# Initialize database
bun run db:migrate

# Start development server
bun run dev

# View dashboard
open http://localhost:3000
```

## 📈 Future Roadmap

This MVP lays the foundation for the complete UltiBiker platform:

1. **Phase 1 (MVP)**: Local sensor aggregation + web dashboard
2. **Phase 2**: Cloud sync + mobile apps
3. **Phase 3**: Third-party developer API
4. **Phase 4**: Marketplace ecosystem

The architecture is designed to support this evolution while maintaining simplicity in the initial implementation.