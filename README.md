# UltiBiker 🚴‍♂️

**Multi-Platform Cycling Sensor Data Aggregation Platform**

A TypeScript monorepo platform for real-time cycling sensor data aggregation across web, mobile, and desktop applications.

> **📱 Multi-Platform Vision**: Web • Mobile • Desktop • CLI

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
pnpm --filter @ultibiker/core build

# 4. Initialize database
pnpm db:setup

# 5. Start development server
pnpm dev

# 6. Open browser
open http://localhost:3000
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
- **Runtime**: Node.js (server) + Bun (optional)
- **Database**: SQLite + Drizzle ORM  
- **API**: Express.js + Socket.io
- **Frontend**: Bootstrap + Chart.js (migrating to React)
- **Code Quality**: Biome (formatter/linter)
- **Language**: TypeScript (strict mode)

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

✅ **Working Features**:
- Server startup and basic functionality
- Session creation and management
- WebSocket real-time communication
- REST API with full CRUD operations
- Database persistence

🚧 **In Development**:
- ANT+ sensor integration (requires ANT+ USB stick)
- Bluetooth sensor integration (requires BLE sensors)
- Frontend dashboard UI
- Test coverage improvements

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
│   ├── 🖥️  server/                 # Node.js backend + web UI
│   │   ├── src/
│   │   │   ├── sensors/            # ANT+ & BLE integration
│   │   │   ├── database/           # SQLite + Drizzle ORM
│   │   │   ├── api/                # REST endpoints
│   │   │   ├── websocket/          # Real-time data streaming
│   │   │   └── services/           # Business logic
│   │   ├── public/                 # Web dashboard assets
│   │   └── tests/                  # 317 comprehensive tests
│   │
│   ├── 📱 mobile/ (planned)        # React Native app
│   ├── 💻 desktop/ (planned)       # Tauri desktop app  
│   └── 🌐 web/ (planned)           # React web frontend
│
├── 📚 docs/                        # Documentation
├── 🛠️  scripts/                    # Build & utility scripts
└── 📦 pnpm-workspace.yaml          # Monorepo configuration
```

**🎯 Multi-Platform Strategy**: Shared `@ultibiker/core` package enables consistent business logic across all platforms.

Built with ❤️ for the cycling community