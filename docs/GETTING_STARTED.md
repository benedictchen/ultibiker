# 🚴‍♂️ UltiBiker - Getting Started Guide

> **Updated for Monorepo Architecture** - January 2025

## 📋 Prerequisites

- **Node.js** >= 18.0.0 (Required for native modules)
- **pnpm** >= 8.0.0 (Package manager)
- **Git** (Version control)

### System Requirements

**macOS** (Recommended for development):
- Xcode Command Line Tools: `xcode-select --install`
- Python 3.x for native module compilation

**Windows**:
- Visual Studio Build Tools 2019/2022
- Windows SDK

**Linux** (Ubuntu/Debian):
```bash
sudo apt-get install build-essential python3-dev libudev-dev
```

## 🏗️ Project Structure (Monorepo)

```
UltiBiker/
├── packages/
│   ├── core/              # 🎯 Shared types & business logic
│   └── server/            # 🖥️  Node.js backend + web UI
├── docs/                  # 📚 Documentation
├── scripts/               # 🛠️ Build & utility scripts
└── pnpm-workspace.yaml    # 📦 Monorepo configuration
```

## 🚀 Quick Start

### 1. Clone and Setup
```bash
# Clone the repository
git clone https://github.com/your-org/UltiBiker.git
cd UltiBiker

# Install dependencies (this builds native modules)
pnpm install

# Build core package first
pnpm --filter @ultibiker/core build
```

### 2. Database Setup
```bash
# Create database and run migrations
pnpm db:setup

# Optional: View database with Drizzle Studio
pnpm db:studio
```

### 3. Start Development Server
```bash
# Start the server with hot reload (default port 3000)
pnpm dev

# Or specify a different port
PORT=3001 pnpm dev
```

### 4. Access the Application
- **Web Dashboard**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/health

## 🔧 Development Commands

### Package Management
```bash
# Install dependencies for all packages
pnpm install

# Install for specific package
pnpm --filter @ultibiker/server add express

# Build all packages
pnpm build

# Build specific package
pnpm --filter @ultibiker/core build
```

### Database Operations
```bash
pnpm db:generate     # Generate migrations
pnpm db:migrate      # Apply migrations  
pnpm db:studio       # Open database GUI
pnpm db:drop         # Reset database
```

### Testing
```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit           # Unit tests only
pnpm test:integration    # Integration tests
pnpm test:e2e           # End-to-end tests

# Watch mode for development
pnpm test:watch
```

### Code Quality
```bash
pnpm lint           # ESLint check
pnpm format         # Format code with Biome
pnpm type-check     # TypeScript validation
```

## 🔌 Hardware Setup

### ANT+ Devices
1. **Connect ANT+ USB stick** (optional, disabled by default)
2. **Enable ANT+ scanning**:
   ```bash
   ANT_STICK_ENABLED=true pnpm dev
   ```

### Bluetooth Devices
1. **Ensure Bluetooth is enabled** on your system
2. **Grant permissions** when prompted
3. **Start scanning** via the web interface

**Note**: On first run, you'll see permission prompts for Bluetooth access.

## 🌍 Environment Configuration

Create `.env` file in the root directory:

```bash
# Server Configuration
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# Database
DATABASE_URL=./data/ultibiker.db

# Security (Change for production!)
JWT_SECRET=your-super-secret-jwt-key
SESSION_SECRET=your-session-secret

# Features
ANT_STICK_ENABLED=false
BLE_ENABLED=true
API_DOCS=true

# Optional: Redis for caching
REDIS_ENABLED=false
REDIS_URL=redis://localhost:6379
```

## 🐛 Troubleshooting

### Common Issues

**❌ "better-sqlite3" binding errors**
```bash
# Rebuild native modules
pnpm rebuild better-sqlite3
# Or clean install
rm -rf node_modules pnpm-lock.yaml && pnpm install
```

**❌ Permission denied on Bluetooth**
- **macOS**: Go to System Preferences → Security & Privacy → Privacy → Bluetooth
- **Linux**: Add user to `dialout` group: `sudo usermod -a -G dialout $USER`

**❌ ANT+ stick not detected**
```bash
# Check USB permissions (Linux)
sudo chmod 666 /dev/ttyUSB*

# Enable ANT+ explicitly
ANT_STICK_ENABLED=true pnpm dev
```

**❌ Port already in use**
```bash
# Kill processes on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 pnpm dev
```

### Development Issues

**Tests failing after monorepo migration**
```bash
# Some tests may need updates for new package structure
# This is expected and being addressed
pnpm test:unit  # Run simpler unit tests first
```

**TypeScript errors**
```bash
# Clean TypeScript cache
pnpm type-check
# Build core package first
pnpm --filter @ultibiker/core build
```

## 📱 Platform Support

### Current Status
- ✅ **Desktop (Electron)**: Fully functional
- ✅ **Web Browser**: Bootstrap + vanilla JS
- 🚧 **Mobile**: React Native (planned)
- 🚧 **CLI Tools**: Command-line interface (planned)

### Tested Hardware
- **Heart Rate Monitors**: ANT+ and BLE devices
- **Power Meters**: ANT+ FEC protocol
- **Cadence Sensors**: ANT+ and BLE
- **Speed Sensors**: ANT+ and BLE

## 🆘 Getting Help

1. **Check the logs**: `tail -f server.log`
2. **Review test output**: `pnpm test --reporter=verbose`
3. **Check permissions**: Visit `/api/permissions` endpoint
4. **Hardware debugging**: Enable verbose logging with `LOG_LEVEL=debug`

## 🔄 Development Workflow

```bash
# 1. Start development server
pnpm dev

# 2. Make code changes (server auto-reloads)

# 3. Run tests frequently
pnpm test:watch

# 4. Check types and linting
pnpm type-check && pnpm lint

# 5. Commit changes
git add . && git commit -m "feat: your change"
```

## 🏁 Next Steps

1. **Connect sensors** and verify data flow
2. **Explore the API** at `/api/docs`
3. **Check permissions** at `/api/permissions`
4. **Review code** in `packages/server/src/`
5. **Run tests** to understand the system

---

🎯 **Ready to contribute?** Check out the [Development Principles](./DEVELOPMENT_PRINCIPLES.md) and [TODO](./TODO.md) for next steps!