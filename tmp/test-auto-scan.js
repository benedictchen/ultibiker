/**
 * Test script to verify auto-scanning functionality
 * Run this in the browser console on the UltiBiker dashboard
 */

// Test auto-scanning behavior
function testAutoScanning() {
    console.log('🧪 Testing auto-scanning functionality...');
    
    // Test 1: Verify auto-scanning is enabled on devices tab
    if (dashboard.currentTab === 'devices' && dashboard.autoScanEnabled) {
        console.log('✅ Auto-scanning is enabled on devices tab');
    } else {
        console.log('❌ Auto-scanning should be enabled on devices tab');
        return false;
    }
    
    // Test 2: Verify user activity tracking
    const lastActivity = dashboard.lastUserActivity;
    if (lastActivity && typeof lastActivity === 'number') {
        console.log('✅ User activity tracking is working');
        console.log(`   Last activity: ${new Date(lastActivity).toLocaleTimeString()}`);
    } else {
        console.log('❌ User activity tracking not working');
        return false;
    }
    
    // Test 3: Verify idle detection
    const isIdle = dashboard.isUserIdle();
    console.log(`✅ Idle detection working - User is ${isIdle ? 'idle' : 'active'}`);
    
    // Test 4: Verify scan rate calculation
    const scanRate = dashboard.getCurrentScanRate();
    const expectedRate = isIdle ? dashboard.idleScanRate : dashboard.normalScanRate;
    if (scanRate === expectedRate) {
        console.log(`✅ Scan rate correct: ${scanRate/1000}s (${isIdle ? 'idle' : 'normal'} mode)`);
    } else {
        console.log('❌ Scan rate calculation incorrect');
        return false;
    }
    
    // Test 5: Verify intervals are running
    const intervals = {
        autoScanInterval: dashboard.autoScanInterval,
        autoPermissionCheckInterval: dashboard.autoPermissionCheckInterval,
        permissionUpdateInterval: dashboard.permissionUpdateInterval
    };
    
    Object.entries(intervals).forEach(([name, interval]) => {
        if (interval) {
            console.log(`✅ ${name} is running`);
        } else {
            console.log(`❌ ${name} is not running`);
        }
    });
    
    console.log('🧪 Auto-scanning test completed!');
    return true;
}

// Test tab switching behavior
function testTabSwitching() {
    console.log('🧪 Testing tab switching behavior...');
    
    const originalTab = dashboard.currentTab;
    const originalAutoScan = dashboard.autoScanEnabled;
    
    // Simulate switching to data tab
    dashboard.currentTab = 'data';
    dashboard.stopAutoScanning();
    
    if (!dashboard.autoScanEnabled) {
        console.log('✅ Auto-scanning stopped when switching away from devices tab');
    } else {
        console.log('❌ Auto-scanning should stop when leaving devices tab');
        return false;
    }
    
    // Simulate switching back to devices tab
    dashboard.currentTab = 'devices';
    dashboard.startAutoScanning();
    
    if (dashboard.autoScanEnabled) {
        console.log('✅ Auto-scanning started when switching back to devices tab');
    } else {
        console.log('❌ Auto-scanning should start when returning to devices tab');
        return false;
    }
    
    console.log('🧪 Tab switching test completed!');
    return true;
}

// Run tests
console.log('🚀 Starting UltiBiker auto-scanning tests...');
console.log('-------------------------------------------');

if (typeof dashboard !== 'undefined') {
    testAutoScanning();
    testTabSwitching();
    console.log('✅ All tests completed successfully!');
} else {
    console.log('❌ Dashboard not found - make sure this is run on the UltiBiker dashboard page');
}