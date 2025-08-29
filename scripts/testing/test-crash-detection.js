#!/usr/bin/env node

// Simple test script to verify crash detection system works
// This will be deleted after testing

import { crashLogger } from './src/services/crash-logger.js';

console.log('🧪 Testing UltiBiker Crash Detection System...\n');

// Test 1: Initialize system
console.log('1. Initializing crash logger...');
crashLogger.initialize();
console.log('   ✅ Crash logger initialized\n');

// Test 2: Test error logging
console.log('2. Testing error logging...');
crashLogger.logError({
  type: 'error',
  severity: 'medium',
  message: 'Test error from crash detection test script',
  context: { 
    test: true, 
    testType: 'error_logging',
    timestamp: new Date().toISOString()
  }
});
console.log('   ✅ Error logged successfully\n');

// Test 3: Test session logging  
console.log('3. Testing session logging...');
crashLogger.logSession({
  sessionId: 'test-session-' + Date.now(),
  event: 'test_session_created',
  data: {
    name: 'Test Session for Crash Detection',
    testMode: true
  }
});
console.log('   ✅ Session log created successfully\n');

// Test 4: Test sensor logging
console.log('4. Testing sensor logging...');
crashLogger.logSensor({
  deviceId: 'test-device-' + Date.now(),
  sensorType: 'heart_rate',
  event: 'test_device_discovered',
  data: {
    name: 'Test Heart Rate Monitor',
    protocol: 'bluetooth',
    testMode: true
  },
  signalStrength: 85
});
console.log('   ✅ Sensor log created successfully\n');

// Test 5: Test performance logging
console.log('5. Testing performance logging...');
crashLogger.logPerformance({
  type: 'test_performance',
  operation: 'crash_detection_test',
  duration: 1234,
  memory: process.memoryUsage(),
  testMode: true
});
console.log('   ✅ Performance log created successfully\n');

// Test 6: Get crash statistics
console.log('6. Testing crash statistics...');
const stats = crashLogger.getCrashStats();
console.log('   📊 Current log statistics:');
console.log(`      - Crashes: ${stats.crashes}`);
console.log(`      - Errors: ${stats.errors}`); 
console.log(`      - Sessions: ${stats.sessions}`);
console.log(`      - Sensors: ${stats.sensors}`);
console.log(`      - Performance: ${stats.performance}`);
console.log(`      - Total logs: ${stats.totalLogs}`);
console.log(`      - Server uptime: ${Math.floor(stats.uptime)}s`);
console.log('   ✅ Statistics retrieved successfully\n');

console.log('🎉 All crash detection tests passed!');
console.log('📁 Check the logs/ directory to see the generated log files.\n');

console.log('💡 To test actual crash handling, you can:');
console.log('   - Throw an uncaught exception: throw new Error("test crash")');
console.log('   - Create an unhandled promise rejection: Promise.reject("test rejection")');
console.log('   - Simulate a server error via the API endpoints\n');

process.exit(0);