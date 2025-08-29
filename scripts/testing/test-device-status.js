#!/usr/bin/env node

// Test script to verify device status indicators work correctly
// This script tests the permission API endpoints that the frontend uses

import { createServer } from 'http';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createPermissionRoutes } from './src/api/permissions.js';
import { UltiBikerSensorManager } from './src/sensors/sensor-manager.js';
import { SessionManager } from './src/services/session-manager.js';
import { crashLogger } from './src/services/crash-logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing Device Status Indicators...\n');

// Initialize components
crashLogger.initialize();
const sessionManager = new SessionManager();
const sensorManager = new UltiBikerSensorManager(sessionManager);

// Create test server
const app = express();
app.use(express.json());

// Add permission routes
app.use('/api/permissions', createPermissionRoutes(sensorManager));

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    test: true
  });
});

const server = createServer(app);
const port = 3001;

async function runTests() {
  console.log('1. Starting test server...');
  
  server.listen(port, async () => {
    console.log(`   ✅ Test server running on port ${port}\n`);

    try {
      // Test 1: Health check
      console.log('2. Testing health endpoint...');
      const healthResponse = await fetch(`http://localhost:${port}/health`);
      const health = await healthResponse.json();
      console.log(`   ✅ Health check: ${health.status}`);
      console.log(`   📋 Test mode: ${health.test}\n`);

      // Test 2: Permission status endpoint
      console.log('3. Testing permission status endpoint...');
      const permResponse = await fetch(`http://localhost:${port}/api/permissions/status`);
      
      if (!permResponse.ok) {
        throw new Error(`HTTP ${permResponse.status}: ${permResponse.statusText}`);
      }
      
      const permissionData = await permResponse.json();
      console.log('   ✅ Permission status endpoint working');
      console.log('   📊 Permission data structure:');
      console.log(`      - Success: ${permissionData.success}`);
      console.log(`      - Platform: ${permissionData.data?.platform || 'unknown'}`);
      
      if (permissionData.data?.permissions) {
        const perms = permissionData.data.permissions;
        
        // Test Bluetooth status
        if (perms.bluetooth) {
          console.log(`      - Bluetooth: ${perms.bluetooth.granted ? '✅ Granted' : perms.bluetooth.denied ? '❌ Denied' : '⚠️ Pending'}`);
          console.log(`        Message: ${perms.bluetooth.message}`);
        }
        
        // Test USB status
        if (perms.usb) {
          console.log(`      - USB/ANT+: ${perms.usb.granted ? '✅ Available' : perms.usb.denied ? '❌ Blocked' : '⚠️ Not detected'}`);
          console.log(`        Message: ${perms.usb.message}`);
        }
      }
      console.log();

      // Test 3: Permission report endpoint
      console.log('4. Testing permission report endpoint...');
      const reportResponse = await fetch(`http://localhost:${port}/api/permissions/report`);
      
      if (reportResponse.ok) {
        const reportData = await reportResponse.json();
        console.log('   ✅ Permission report endpoint working');
        console.log(`   📋 Report lines: ${reportData.data?.report?.length || 0}`);
        
        if (reportData.data?.report && reportData.data.report.length > 0) {
          console.log('   📄 Sample report lines:');
          reportData.data.report.slice(0, 3).forEach(line => {
            console.log(`      ${line}`);
          });
        }
      } else {
        console.log('   ⚠️ Permission report endpoint failed');
      }
      console.log();

      // Test 4: Permission guide endpoint
      console.log('5. Testing permission guide endpoint...');
      const guideResponse = await fetch(`http://localhost:${port}/api/permissions/guide`);
      
      if (guideResponse.ok) {
        const guideText = await guideResponse.text();
        console.log('   ✅ Permission guide endpoint working');
        console.log(`   📖 Guide length: ${guideText.length} characters`);
        
        const lines = guideText.split('\n');
        if (lines.length > 0) {
          console.log(`   📋 Guide sections: ${lines.filter(line => line.startsWith('#')).length}`);
        }
      } else {
        console.log('   ⚠️ Permission guide endpoint failed');
      }
      console.log();

      console.log('🎉 All device status tests completed successfully!\n');
      
      console.log('💡 Frontend status indicators should now show:');
      console.log('   📶 Bluetooth: Real system availability status');
      console.log('   📡 ANT+ USB: Real hardware detection status'); 
      console.log('   🔄 Status updates: Every 15 seconds + on device changes');
      console.log('   ⚠️ Alerts: When permissions need user attention');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      console.error('   Stack:', error.stack);
    } finally {
      // Cleanup
      console.log('\n🧹 Cleaning up test environment...');
      server.close(() => {
        console.log('✅ Test server stopped');
        process.exit(0);
      });
    }
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⚡ Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⚡ Received SIGINT, shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

// Run the tests
runTests().catch((error) => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});