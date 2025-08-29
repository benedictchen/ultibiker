# UltiBiker Development Guide

## 🚀 Quick Start - Development Mode

### 1. Hot Reloading Development

```bash
# Start both servers with hot reloading (recommended)
pnpm dev:all

# This starts:
# - Backend server on http://localhost:3001 (auto-restarts on changes)
# - React app on http://localhost:3000 (hot module replacement)
```

### 2. Individual Development Servers

```bash
# Backend only (API + WebSocket server)
pnpm dev                    # or pnpm --filter @ultibiker/server dev

# React frontend only  
pnpm dev:web               # or pnpm --filter @ultibiker/web dev
```

## 🔗 Development Architecture

### How Server and Web Client Connect

#### Development Mode (localhost)
```
┌─────────────────────────────────────────────────────────────────┐
│                    DEVELOPMENT SETUP                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐         ┌─────────────────────┐        │
│  │   React Dev Server  │         │   Node.js Server   │        │
│  │   Port: 3000        │ ◄────── │   Port: 3001        │        │
│  │                     │         │                     │        │
│  │ • Vite HMR          │         │ • Express API       │        │
│  │ • Hot Reloading     │         │ • Socket.IO WS      │        │
│  │ • Proxy /api → 3001 │         │ • Sensor Management │        │
│  │ • Proxy /socket.io  │         │ • Database          │        │
│  └─────────────────────┘         └─────────────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Development Features:**
- **Vite Proxy**: Automatically forwards `/api/*` and `/socket.io/*` requests to port 3001
- **Hot Module Replacement**: React components update instantly without page refresh
- **Auto-restart**: Backend restarts automatically when server code changes
- **TypeScript Watch**: Both frontend and backend compile TypeScript in real-time
- **Shared Types**: Changes to `@ultibiker/core` types are immediately available

#### Connection Configuration

**Vite Proxy Configuration** (`packages/web/vite.config.ts`):
```typescript
server: {
  port: 3000,
  proxy: {
    '/api': 'http://localhost:3001',          // REST API calls
    '/socket.io': {                           // WebSocket connections
      target: 'http://localhost:3001',
      ws: true,
    },
  },
}
```

**CORS Configuration** (`packages/server/src/server.ts`):
```typescript
// Development CORS allows React dev server
origins: [
  "http://localhost:3000",  // React dev server
  "http://localhost:3001"   // Backend server
]
```

## 🏭 Production Architecture

### How It Will Be Packaged

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION DEPLOYMENT                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                Node.js Server (Port 3001)                  │ │
│  │                                                             │ │
│  │  ┌─────────────────────┐    ┌─────────────────────┐        │ │
│  │  │   Built React App   │    │   Express Server   │        │ │
│  │  │   (Static Files)    │    │                     │        │ │
│  │  │                     │    │ • REST API          │        │ │
│  │  │ • index.html        │    │ • Socket.IO WS      │        │ │
│  │  │ • assets/*.js       │    │ • Sensor Management │        │ │
│  │  │ • assets/*.css      │    │ • Database          │        │ │
│  │  │ • PWA manifest      │    │ • Static Serving    │        │ │
│  │  └─────────────────────┘    └─────────────────────┘        │ │
│  │         served via express.static('/dist')                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Production Build Process

```bash
# 1. Build all packages
pnpm build

# This runs:
pnpm build:core      # Compile TypeScript types
pnpm build:shared    # Compile shared components  
pnpm build:web       # Vite builds React app → dist/
pnpm build:server    # Compile backend → dist/

# 2. Server serves React app
# The Node.js server serves the built React files as static assets
# All routes go through the same server (single origin)
```

### Production File Structure

After `pnpm build`, the production structure is:
```
📁 packages/server/
├── dist/                          # Compiled backend
│   ├── server.js                  # Main server entry  
│   ├── api/                       # REST endpoints
│   ├── sensors/                   # Hardware integration
│   └── websocket/                 # Real-time communication
│
├── public/                        # Built React app (from packages/web/dist)
│   ├── index.html                 # React SPA entry point
│   ├── assets/
│   │   ├── index-[hash].js        # Bundled React application
│   │   ├── index-[hash].css       # Compiled Tailwind styles  
│   │   └── vendor-[hash].js       # Third-party libraries
│   ├── manifest.json              # PWA configuration
│   └── icons/                     # Application icons
│
└── data/
    └── ultibiker.db              # SQLite database
```

### Production Serving Strategy

The Node.js server handles both API and frontend serving:

```typescript
// packages/server/src/server.ts
app.use(express.static('public'));          // Serve React app
app.use('/api', apiRoutes);                 // API endpoints  
app.get('*', (req, res) => {               // SPA fallback
  res.sendFile(path.join(__dirname, '../public/index.html'));
});
```

**Single Origin Benefits:**
- ✅ No CORS issues in production
- ✅ Simplified deployment (one server)
- ✅ Shared authentication/sessions
- ✅ PWA works properly
- ✅ WebSocket and API on same domain

## 📦 Build Commands

### Development
```bash
pnpm dev:all          # Both servers with hot reloading
pnpm dev              # Backend only
pnpm dev:web          # React frontend only
```

### Building
```bash
pnpm build            # Build all packages for production
pnpm build:core       # Build shared types
pnpm build:shared     # Build React components
pnpm build:web        # Build React app (outputs to dist/)
pnpm build:server     # Build Node.js server
```

### Production
```bash
pnpm start            # Run production server (requires built packages)
```

## 🔧 Hot Reloading Details

### React (Frontend) Hot Reloading
- **Vite HMR**: Updates React components instantly
- **State Preservation**: Component state maintained during updates
- **Error Overlay**: TypeScript errors shown in browser
- **CSS Updates**: Tailwind styles update without refresh

### Backend Auto-Restart
- **tsx Watch Mode**: Restarts server on TypeScript changes
- **Database Connections**: Gracefully handles reconnections
- **WebSocket Clients**: Automatically reconnect after restart
- **Fast Restart**: Usually under 2 seconds

### Shared Package Updates
- **Type Changes**: Both frontend and backend see updates immediately
- **Component Changes**: React components update with HMR
- **Hook Changes**: Custom hooks reload with state preservation

## 🌐 Environment Configuration

### Development Environment Variables
```bash
# packages/web/.env.local
VITE_API_URL=http://localhost:3001

# packages/server/.env.local  
PORT=3001
NODE_ENV=development
```

### Production Environment Variables
```bash
# Production server
PORT=3001
NODE_ENV=production
DATABASE_URL=./data/ultibiker.db
```

## 🧪 Testing in Development

```bash
# Frontend tests (React components)
pnpm --filter @ultibiker/web test

# Backend tests (API, sensors, database)
pnpm --filter @ultibiker/server test

# End-to-end tests (full app)
pnpm test:e2e

# Automated UI testing with Playwright
node scripts/test-react-ui.js
```

## 🚀 Deployment Options

### Single Server Deployment
1. Build all packages: `pnpm build`
2. Copy built files to server
3. Start: `pnpm start`
4. Single process serves both API and React app

### Container Deployment
```dockerfile
FROM node:18-alpine
COPY . .
RUN pnpm install
RUN pnpm build
EXPOSE 3001
CMD ["pnpm", "start"]
```

### Multi-Platform Future
- **Mobile**: React Native app connects to same API
- **Desktop**: Tauri app embeds React web app
- **API-Only**: Backend can serve multiple clients

This architecture provides excellent developer experience in development while optimizing for simple, efficient production deployment.