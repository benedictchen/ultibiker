#!/usr/bin/env node
/**
 * Test script for sensor discovery functionality
 * This script helps debug ANT+ and Bluetooth sensor detection issues
 */

console.log('🧪 UltiBiker Sensor Discovery Test');
console.log('==================================');

// Test WebSocket connection and events
const io = require('socket.io-client');

const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('✅ Connected to UltiBiker server');
    
    // Subscribe to events
    socket.emit('subscribe-device-events', (response) => {
        console.log('📡 Device events subscription:', response);
    });
    
    socket.emit('subscribe-sensor-data', (response) => {
        console.log('📊 Sensor data subscription:', response);
    });
    
    // Get initial status
    socket.emit('get-status', (response) => {
        console.log('📋 System status:', response);
    });
    
    // Start scanning after 2 seconds
    setTimeout(() => {
        console.log('\n🔍 Starting device scan...');
        socket.emit('start-scanning', (response) => {
            console.log('🔍 Scan start result:', response);
            
            if (response.success) {
                console.log('✅ Scan started successfully - waiting for device discoveries...');
                
                // Stop scan after 30 seconds
                setTimeout(() => {
                    console.log('\n⏹️ Stopping scan...');
                    socket.emit('stop-scanning', (response) => {
                        console.log('⏹️ Scan stop result:', response);
                        process.exit(0);
                    });
                }, 30000);
            } else {
                console.error('❌ Failed to start scan:', response.error);
                process.exit(1);
            }
        });
    }, 2000);
});

socket.on('device-list', (data) => {
    console.log('\n📱 Received device list:');
    console.log(`   Discovered: ${data.discovered.length} devices`);
    console.log(`   Connected: ${data.connected.length} devices`);
    
    if (data.discovered.length > 0) {
        console.log('\n🔍 Discovered devices:');
        data.discovered.forEach(device => {
            console.log(`   • ${device.name} (${device.type}) - ${device.protocol} - ${device.signalStrength}%`);
        });
    }
    
    if (data.connected.length > 0) {
        console.log('\n🔗 Connected devices:');
        data.connected.forEach(device => {
            console.log(`   • ${device.name} (${device.type}) - ${device.protocol}`);
        });
    }
});

socket.on('device-event', (event) => {
    if (event.type === 'scan-result') {
        const device = event.device;
        console.log(`🆕 New device discovered: ${device.name} (${device.type}) - ${device.protocol} - ${device.signalStrength}%`);
    } else if (event.type === 'device-status') {
        console.log(`📡 Device status: ${event.deviceId} -> ${event.status}`);
    }
});

socket.on('sensor-data', (data) => {
    console.log(`📊 Sensor data: ${data.data.metricType} = ${data.data.value} ${data.data.unit || ''} from ${data.data.deviceId}`);
});

socket.on('scan-status', (status) => {
    console.log(`🔍 Scan status: ${status.scanning ? 'ACTIVE' : 'STOPPED'}`);
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected from server');
    process.exit(1);
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
    console.log('\n💡 Make sure the UltiBiker server is running with: npm run dev');
    process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n\n🛑 Test interrupted');
    socket.disconnect();
    process.exit(0);
});

console.log('\n💡 Starting test in 1 second...');
console.log('💡 Make sure you have:');
console.log('   • An ANT+ USB stick connected (for ANT+ testing)');
console.log('   • Bluetooth enabled (for BLE testing)'); 
console.log('   • Some cycling sensors nearby and turned on');
console.log('');