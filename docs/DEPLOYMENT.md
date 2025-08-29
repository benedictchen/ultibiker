# UltiBiker Deployment Guide

## 🚀 Production Deployment

### Build Process

```bash
# 1. Install dependencies
pnpm install

# 2. Build all packages
pnpm build

# This creates:
# - packages/core/dist/           # Compiled TypeScript types
# - packages/shared/dist/         # Compiled React components 
# - packages/web/dist/            # Built React app (static files)
# - packages/server/dist/         # Compiled Node.js server
```

### Single Server Deployment (Recommended)

The built React app is automatically served by the Node.js server:

```bash
# Start production server
pnpm start

# Server runs on http://localhost:3001 and serves:
# - React app at /
# - API endpoints at /api/*  
# - WebSocket at /socket.io
```

### Production File Copy

After building, copy these files to your server:
```
📁 Production Files:
├── packages/server/dist/          # Node.js server
├── packages/server/public/        # Built React app (copied from web/dist)
├── packages/server/data/          # SQLite database
├── package.json                   # Dependencies
├── pnpm-lock.yaml                # Lockfile
└── node_modules/                  # Production dependencies
```

### Environment Variables

```bash
# Required for production
NODE_ENV=production
PORT=3001
DATABASE_URL=./data/ultibiker.db

# Optional security
JWT_SECRET=your-secure-jwt-secret
SESSION_SECRET=your-secure-session-secret
HEALTH_CHECK_TOKEN=your-health-check-token
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/shared/package.json ./packages/shared/
COPY packages/web/package.json ./packages/web/
COPY packages/server/package.json ./packages/server/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Expose port
EXPOSE 3001

# Create data directory
RUN mkdir -p packages/server/data

# Start production server
CMD ["pnpm", "start"]
```

Build and run:
```bash
docker build -t ultibiker .
docker run -p 3001:3001 -v $(pwd)/data:/app/packages/server/data ultibiker
```

### Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start packages/server/dist/server.js --name ultibiker

# Save PM2 configuration
pm2 save
pm2 startup
```

PM2 ecosystem file (`ecosystem.config.js`):
```javascript
module.exports = {
  apps: [{
    name: 'ultibiker',
    script: 'packages/server/dist/server.js',
    cwd: '/app',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

### Health Checks

```bash
# Check server health
curl http://localhost:3001/health

# Check database
curl http://localhost:3001/api/status
```

### Performance Optimizations

1. **Static File Caching**:
   ```javascript
   // packages/server/src/server.ts
   app.use(express.static('public', {
     maxAge: '1y',
     etag: true,
     immutable: true
   }));
   ```

2. **Compression**:
   - Already enabled with `compression` middleware
   - Reduces React bundle size by ~70%

3. **Database Optimization**:
   ```bash
   # SQLite optimization
   PRAGMA journal_mode=WAL;
   PRAGMA synchronous=NORMAL;
   PRAGMA cache_size=1000000;
   ```

### Security Checklist

- ✅ HTTPS enabled (via reverse proxy)
- ✅ Helmet security headers configured
- ✅ CORS properly configured
- ✅ Rate limiting enabled
- ✅ Environment variables secured
- ✅ Database file permissions restricted
- ✅ JWT secrets configured
- ✅ Health check endpoint protected

### Monitoring

```bash
# Application logs
tail -f packages/server/logs/combined.log

# Error logs
tail -f packages/server/logs/error.log

# Sensor logs
tail -f packages/server/logs/sensors.log
```

### Scaling Options

1. **Horizontal Scaling**: Multiple server instances behind load balancer
2. **Database**: Can migrate to PostgreSQL for multi-instance deployments  
3. **CDN**: Static React assets can be served from CDN
4. **Microservices**: Split sensor management from web server

### Backup Strategy

```bash
# Database backup
cp packages/server/data/ultibiker.db backup/ultibiker-$(date +%Y%m%d).db

# Full backup
tar -czf backup/ultibiker-$(date +%Y%m%d).tar.gz \
    packages/server/dist/ \
    packages/server/data/ \
    packages/server/public/
```

This deployment strategy provides a robust, scalable foundation for the UltiBiker platform while maintaining simplicity for single-server deployments.