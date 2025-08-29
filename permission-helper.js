#!/usr/bin/env node
/**
 * UltiBiker Permission Helper
 * This script helps users set up proper permissions for Bluetooth and ANT+ access
 */

import { PermissionManager } from './dist/services/permission-manager.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

console.log('🔒 UltiBiker Permission Helper');
console.log('==============================\n');

async function main() {
    const permissionManager = new PermissionManager();
    
    try {
        console.log('📋 Checking current permissions...\n');
        
        // Check all permissions
        const permissions = await permissionManager.checkAllPermissions();
        
        // Print detailed report
        const report = permissionManager.getDetailedReport();
        report.forEach(line => console.log(line));
        
        console.log('\n' + '='.repeat(50));
        
        // Provide platform-specific guidance
        await providePlatformGuidance(permissions);
        
        // Offer to create setup guide
        console.log('\n💾 Creating permission setup guide...');
        const guide = await permissionManager.createPermissionGuide();
        
        await fs.writeFile('PERMISSION_SETUP_GUIDE.md', guide);
        console.log('✅ Setup guide saved to: PERMISSION_SETUP_GUIDE.md');
        
    } catch (error) {
        console.error('❌ Error checking permissions:', error.message);
        process.exit(1);
    }
}

async function providePlatformGuidance(permissions) {
    const platform = process.platform;
    
    console.log('\n🛠️ PLATFORM-SPECIFIC GUIDANCE');
    console.log('--------------------------------');
    
    switch (platform) {
        case 'darwin': // macOS
            await provideMacOSGuidance(permissions);
            break;
        case 'linux':
            await provideLinuxGuidance(permissions);
            break;
        case 'win32':
            await provideWindowsGuidance(permissions);
            break;
        default:
            console.log(`ℹ️ Platform ${platform} may require manual setup`);
    }
}

async function provideMacOSGuidance(permissions) {
    console.log('🍎 macOS Detected\n');
    
    // Check macOS version
    try {
        const { stdout: version } = await execAsync('sw_vers -productVersion');
        console.log(`📊 macOS Version: ${version.trim()}`);
        
        const majorVersion = parseInt(version.split('.')[0]);
        if (majorVersion >= 11) {
            console.log('✅ macOS Big Sur or later - modern permission system');
        } else {
            console.log('⚠️ Older macOS version - permission checking may be limited');
        }
    } catch (error) {
        console.log('ℹ️ Could not determine macOS version');
    }
    
    // Bluetooth guidance
    if (!permissions.bluetooth.granted) {
        console.log('\n📶 BLUETOOTH SETUP:');
        console.log('1. 🔓 Grant permission when UltiBiker first scans for sensors');
        console.log('2. 🔄 If you missed the dialog:');
        console.log('   • System Preferences > Privacy & Security > Bluetooth');
        console.log('   • Enable checkbox next to UltiBiker or Terminal/Node');
        console.log('3. 🔄 Restart UltiBiker after changing permissions');
        
        // Check if running in Terminal vs standalone app
        if (process.env.TERM) {
            console.log('\n💡 You\'re running in Terminal - Terminal needs Bluetooth permission');
        }
        
        // Offer to open System Preferences
        console.log('\n🔧 Quick fix commands:');
        console.log('   open "x-apple.systempreferences:com.apple.preference.security?Privacy_Bluetooth"');
    }
    
    // USB/ANT+ guidance
    console.log('\n🔌 ANT+ USB SETUP:');
    console.log('1. 🔗 Connect Garmin ANT+ USB stick');
    console.log('2. ✅ macOS will auto-detect (no additional setup needed)');
    console.log('3. 🔍 Verify: Apple Menu > About This Mac > System Report > USB');
}

async function provideLinuxGuidance(permissions) {
    console.log('🐧 Linux Detected\n');
    
    // Check distribution
    try {
        const { stdout: distro } = await execAsync('cat /etc/os-release | grep PRETTY_NAME');
        console.log(`📊 Distribution: ${distro.replace('PRETTY_NAME=', '').replace(/"/g, '')}`);
    } catch (error) {
        console.log('ℹ️ Could not determine Linux distribution');
    }
    
    // Bluetooth setup
    if (!permissions.bluetooth.granted) {
        console.log('\n📶 BLUETOOTH SETUP:');
        console.log('Run these commands to fix Bluetooth permissions:\n');
        
        console.log('# Install BlueZ (if not already installed)');
        console.log('sudo apt-get update && sudo apt-get install bluez\n');
        
        console.log('# Start and enable Bluetooth service');
        console.log('sudo systemctl start bluetooth');
        console.log('sudo systemctl enable bluetooth\n');
        
        console.log('# Add your user to the bluetooth group');
        console.log('sudo usermod -a -G bluetooth $USER\n');
        
        console.log('# Log out and back in (or restart)');
        console.log('# Then verify with: groups | grep bluetooth');
        
        // Check if we can help with automatic setup
        console.log('\n🚀 AUTOMATIC SETUP OPTION:');
        console.log('Run this one-liner to fix most Bluetooth issues:');
        console.log('curl -sSL https://github.com/user/ultibiker/raw/main/scripts/setup-linux-bluetooth.sh | bash');
    }
    
    // ANT+ setup
    console.log('\n🔌 ANT+ USB SETUP:');
    console.log('Run these commands for ANT+ USB access:\n');
    
    console.log('# Add user to dialout group for USB serial access');
    console.log('sudo usermod -a -G dialout $USER\n');
    
    console.log('# Create udev rules for Garmin ANT+ devices');
    console.log('sudo tee /etc/udev/rules.d/99-garmin-ant.rules <<EOF');
    console.log('# Garmin ANT+ USB sticks');
    console.log('SUBSYSTEM=="usb", ATTR{idVendor}=="0fcf", ATTR{idProduct}=="1008", MODE="0666", GROUP="dialout"');
    console.log('SUBSYSTEM=="usb", ATTR{idVendor}=="0fcf", ATTR{idProduct}=="1009", MODE="0666", GROUP="dialout"');
    console.log('EOF\n');
    
    console.log('# Reload udev rules');
    console.log('sudo udevadm control --reload-rules');
    console.log('sudo udevadm trigger\n');
    
    console.log('# Reconnect ANT+ USB stick after setting up rules');
}

async function provideWindowsGuidance(permissions) {
    console.log('🪟 Windows Detected\n');
    
    // Check Windows version
    try {
        const { stdout: version } = await execAsync('ver');
        console.log(`📊 Windows Version: ${version.trim()}`);
    } catch (error) {
        console.log('ℹ️ Could not determine Windows version');
    }
    
    // Bluetooth setup
    if (!permissions.bluetooth.granted) {
        console.log('\n📶 BLUETOOTH SETUP:');
        console.log('1. 🔧 Open Settings > Devices > Bluetooth & other devices');
        console.log('2. 🔄 Ensure "Bluetooth" toggle is ON');
        console.log('3. 🔓 Grant permission when Windows prompts (first scan)');
        console.log('4. 🔍 If issues persist: Device Manager > Bluetooth');
        
        console.log('\n🚀 PowerShell quick commands:');
        console.log('# Enable Bluetooth (if supported)');
        console.log('Get-Service | Where-Object {$_.Name -like "*bluetooth*"}');
        console.log('\n# Check Bluetooth adapters');
        console.log('Get-WmiObject -Class Win32_SystemDriver | Where-Object {$_.Name -eq "BthEnum"}');
    }
    
    // ANT+ setup
    console.log('\n🔌 ANT+ USB SETUP:');
    console.log('1. 🔗 Connect Garmin ANT+ USB stick');
    console.log('2. 💾 Windows should auto-install drivers');
    console.log('3. 🌐 If not: Download from https://www.garmin.com/en-US/software/ant/');
    console.log('4. 🔍 Verify in Device Manager under "Ports (COM & LPT)"');
    
    console.log('\n🔧 Troubleshooting:');
    console.log('• Try different USB ports');
    console.log('• Uninstall and reinstall device drivers');
    console.log('• Run as Administrator if permission issues');
}

// Run the permission helper
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('\n❌ Permission helper failed:', error.message);
        process.exit(1);
    });
}

export { main, providePlatformGuidance };