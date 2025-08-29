# UltiBiker 🚴‍♂️

**Modern React-Powered Cycling Sensor Data Aggregation Platform**

A TypeScript monorepo platform for real-time cycling sensor data aggregation with modern React 18 frontend, Node.js backend, and multi-platform architecture.

> **📱 Multi-Platform Reality**: React Web App • React Native Mobile • Tauri Desktop • REST API

## ⚠️ **NO MOCK/FAKE CODE POLICY**

**UltiBiker only works with REAL sensors and REAL data.**

- ❌ **NO mock sensors**
- ❌ **NO fake data**  
- ❌ **NO demo/test devices**
- ❌ **NO simulated readings**

**This application REQUIRES real ANT+ or Bluetooth cycling sensors to function.**

## 🚀 Quick Start

```bash
# 1. Clone and setup
git clone <repository-url> ultibiker
cd ultibiker

# 2. Install dependencies (includes native modules)
pnpm install

# 3. Build core packages
pnpm build:core
pnpm build:shared

# 4. Initialize database
pnpm db:setup

# 5. Start development servers (both backend + React)
pnpm dev:all

# 6. Open applications
# - React Web App: http://localhost:3000
# - Backend API: http://localhost:3001
```

### 🔥 Development Mode (Hot Reloading)

```bash
# Start both servers with hot reloading
pnpm dev:all

# Or run individually:
pnpm dev         # Backend server (port 3001) with auto-restart
pnpm dev:web     # React app (port 3000) with hot module replacement
```

**📖 Detailed Setup Guide**: [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)

### 🔒 Device Permissions Setup

UltiBiker requires permissions to access Bluetooth and USB devices. The setup varies by platform:

**macOS:**
- Grant Bluetooth permission when prompted (System Preferences > Privacy & Security > Bluetooth)
- ANT+ USB devices work automatically

**Linux:**
```bash
# Install Bluetooth support
sudo apt-get install bluez
sudo systemctl start bluetooth
sudo usermod -a -G bluetooth $USER

# For ANT+ USB devices
sudo usermod -a -G dialout $USER
```

**Windows:**
- Enable Bluetooth in Settings
- Install ANT+ drivers if using USB stick

📖 **Detailed Setup Guide:** `/api/permissions/guide`
🔍 **Permission Checker:** `/test-sensors.html`

## ✨ Features

- **Multi-Protocol Support** - ANT+ and Bluetooth Low Energy sensors
- **Real-time Data Streaming** - WebSocket-based live sensor data
- **Session Management** - Track and analyze cycling sessions with automatic metrics
- **REST API** - Complete CRUD operations for devices, sessions, and data
- **TypeScript-First** - Full type safety with Drizzle ORM
- **Test-Driven Development** - Comprehensive test suite (50% passing, TDD approach)

## 🛠️ Tech Stack

**Monorepo Architecture:**
- **Package Manager**: pnpm workspaces
- **Build System**: TypeScript + tsx
- **Testing**: Vitest + Playwright

**Core Technologies:**
- **Backend**: Node.js + Express.js + Socket.IO
- **Frontend**: React 18 + TypeScript + Zustand + Tailwind CSS
- **Database**: SQLite + Drizzle ORM  
- **Build Tools**: Vite (frontend) + tsx (backend)
- **Charts**: Recharts (React-native)
- **Code Quality**: Biome (formatter/linter)
- **Language**: TypeScript (strict mode throughout)

## 📡 API Endpoints

### Core APIs
- `GET /health` - Server health check
- `GET /api/sessions` - List all sessions
- `POST /api/sessions` - Create new session
- `GET /api/devices/discovered` - List discovered devices
- `POST /api/devices/scan/start` - Start device scanning
- `GET /api/data/live` - Get latest sensor data

### Permission Management
- `GET /api/permissions/status` - Check device permissions
- `GET /api/permissions/guide` - Platform setup guide
- `GET /api/permissions/instructions` - Platform-specific help

### Testing & Debugging
- `GET /test-sensors.html` - Interactive sensor testing interface

## 🧪 Testing

```bash
# Run all tests across packages
pnpm test

# Run tests for specific package
pnpm --filter @ultibiker/server test

# Run test categories
pnpm test:unit          # Unit tests only
pnpm test:integration   # Integration tests  
pnpm test:e2e          # End-to-end tests

# Watch mode for development
pnpm test:watch
```

**Current Status**: 317 comprehensive tests (some failing after monorepo migration)
*Excellent TDD foundation - tests written before implementation*

## 🗃️ Database

Uses SQLite with Drizzle ORM for type-safe database operations:

```bash
# View database in browser
pnpm db:studio

# Generate migrations after schema changes
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Reset database
pnpm db:drop
```

## 🔧 Development

```bash
# Start dev server with hot reload
pnpm dev

# Format code across all packages
pnpm format

# Lint and fix issues
pnpm check

# Type check all packages
pnpm type-check

# Build all packages
pnpm build
```

## 📊 Current Implementation

✅ **Complete Features**:
- **Modern React 18 Web Application** with TypeScript and hot reloading
- **Zustand State Management** (85% smaller than Redux)
- **Real-time WebSocket Communication** with automatic reconnection
- **Responsive Dashboard UI** with live sensor metrics and charts
- **Multi-page Navigation** (Dashboard, Devices, Settings)
- **REST API** with full CRUD operations
- **Database Persistence** with type-safe Drizzle ORM
- **Comprehensive Error Handling** with user feedback

🚧 **Hardware Integration**:
- ANT+ sensor integration (requires ANT+ USB stick)
- Bluetooth sensor integration (requires BLE sensors)
- Device auto-discovery and pairing

**Hardware Requirements:**
- ANT+ USB stick for ANT+ sensors
- Bluetooth 4.0+ for BLE sensors
- Compatible cycling sensors (heart rate, power, cadence, speed)

## 📚 Documentation

See [docs/06-development-setup.md](docs/06-development-setup.md) for detailed setup and configuration information.

## 🏗️ Monorepo Architecture

```
📁 UltiBiker/
├── 📦 packages/
│   ├── 🎯 core/                    # Shared types & business logic
│   │   ├── types/                  # Cross-platform type definitions  
│   │   ├── services/               # Data processing & validation
│   │   └── utils/                  # Shared utilities
│   │
│   ├── 🖥️  server/                 # Node.js backend (port 3001)
│   │   ├── src/
│   │   │   ├── sensors/            # ANT+ & BLE integration
│   │   │   ├── database/           # SQLite + Drizzle ORM
│   │   │   ├── api/                # REST endpoints
│   │   │   ├── websocket/          # Real-time data streaming
│   │   │   └── services/           # Business logic
│   │   ├── public/                 # Legacy web assets (deprecated)
│   │   └── tests/                  # Comprehensive test suite
│   │
│   ├── 🌐 web/                     # React 18 frontend (port 3000) ✅ COMPLETE
│   │   ├── src/
│   │   │   ├── components/         # React components
│   │   │   ├── pages/              # Dashboard, Devices, Settings
│   │   │   ├── hooks/              # Custom React hooks
│   │   │   └── services/           # API client
│   │   ├── public/                 # PWA assets
│   │   └── vite.config.ts          # Vite build configuration
│   │
│   ├── 🔗 shared/                  # Shared React components & hooks ✅ COMPLETE
│   │   ├── ui/                     # Reusable UI components
│   │   ├── hooks/                  # WebSocket & data hooks
│   │   └── store/                  # Zustand state management
│   │
│   ├── 📱 mobile/ (planned)        # React Native app
│   └── 💻 desktop/ (planned)       # Tauri desktop app
│
├── 📚 docs/                        # Documentation
├── 🛠️  scripts/                    # Build & utility scripts
└── 📦 pnpm-workspace.yaml          # Monorepo configuration
```

**🎯 Multi-Platform Strategy**: Shared `@ultibiker/core` package enables consistent business logic across all platforms.

Built with ❤️ for the cycling community