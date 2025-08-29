# UltiBiker 🚴‍♂️

**Cycling Sensor Data Aggregation Platform**

A TypeScript-based platform for aggregating and analyzing cycling sensor data from ANT+ and Bluetooth devices.

## ⚠️ **NO MOCK/FAKE CODE POLICY**

**UltiBiker only works with REAL sensors and REAL data.**

- ❌ **NO mock sensors**
- ❌ **NO fake data**
- ❌ **NO demo/test devices**
- ❌ **NO simulated readings**

**This application REQUIRES real ANT+ or Bluetooth cycling sensors to function.**

If you don't have real sensors, this application will not work for you. We do not provide any fake or simulated sensor data as this would compromise the integrity of real cycling performance data.

## 🚀 Quick Start

```bash
# 1. Clone and setup
git clone <repository-url> ultibiker
cd ultibiker

# 2. Install dependencies
npm install

# 3. Initialize database
npm run db:setup

# 4. Start development server
npm run dev

# 5. Open browser and check permissions
open http://localhost:3000/test-sensors.html
```

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

- **Runtime**: Node.js + tsx
- **Database**: SQLite + Drizzle ORM
- **API**: Express.js + Socket.io
- **Testing**: Vitest + Supertest
- **Code Quality**: Biome (formatter/linter)
- **Language**: TypeScript

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
# Run all tests
npm run test -- --run

# Run tests in watch mode
npm run test

# Run specific test file
npm run test -- tests/sensors/data-parser.test.ts
```

**Current Status**: 72 passing tests, 72 failing tests (50% pass rate)
*Excellent progress for TDD where tests were written before implementation*

## 🗃️ Database

Uses SQLite with Drizzle ORM for type-safe database operations:

```bash
# View database in browser
npm run db:studio

# Generate migrations after schema changes
npm run db:generate

# Apply migrations
npm run db:migrate
```

## 🔧 Development

```bash
# Start dev server with hot reload
npm run dev

# Format code
npm run format

# Lint and fix issues
npm run check

# Type check
npm run type-check
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

## 🏗️ Architecture

```
📁 src/
├── 🖥️  server.ts              # Main server entry point
├── 📡 sensors/               # Sensor integration layer
├── 🗃️  database/              # Database layer (SQLite + Drizzle)  
├── 🛠️  services/              # Business logic services
├── 🌐 api/                   # REST API endpoints
├── 📡 websocket/             # Real-time communication
└── 🏷️  types/                # TypeScript type definitions
```

Built with ❤️ for the cycling community