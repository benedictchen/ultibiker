# OS Permissions Research: Bluetooth and ANT+ Access

## Executive Summary

This research document outlines the OS-level permissions and requirements for accessing Bluetooth and ANT+ devices across macOS, Windows, and Linux platforms for cycling sensor integration.

## macOS Permission Requirements

### Bluetooth Low Energy Access
- **Permission Model**: Explicit user consent required
- **Framework**: Core Bluetooth (via Noble.js in Node.js)
- **Permission Request**: Automatic when first accessing Bluetooth
- **User Experience**: System dialog: "App would like to access Bluetooth"
- **Programmatic Check**: `CBManager.authorization` status
- **Storage**: System stores consent in Privacy Database
- **Revocation**: Users can revoke via System Preferences > Privacy & Security > Bluetooth

### Implementation for macOS:
```javascript
// Check Bluetooth permission status
const { systemPreferences } = require('electron'); // If using Electron
const bluetoothPermission = systemPreferences.getMediaAccessStatus('bluetooth');

// Request permission programmatically
if (bluetoothPermission !== 'granted') {
  const permission = await systemPreferences.askForMediaAccess('bluetooth');
  if (!permission) {
    throw new Error('Bluetooth permission denied');
  }
}
```

### ANT+ USB Device Access
- **Permission Model**: No explicit permission required for USB devices
- **Framework**: libusb via node-usb
- **Requirements**: Device must be recognized by macOS
- **Garmin ANT+ Stick**: Vendor ID 0x0fcf, Product IDs 0x1008/0x1009
- **Driver**: Built into macOS, no additional drivers needed

## Windows Permission Requirements

### Bluetooth Low Energy Access
- **Permission Model**: Capability-based (Windows 10+)
- **Framework**: Windows.Devices.Bluetooth via Noble.js
- **Permission Request**: Automatic on first Bluetooth access
- **User Experience**: Windows permission dialog
- **Manifest Requirements**: For packaged apps, requires `bluetooth` capability
- **Registry**: Permissions stored in Windows registry
- **Group Policy**: Can be controlled by enterprise policies

### Implementation for Windows:
```javascript
// Windows permission check via WinRT
const { exec } = require('child_process');

// Check if Bluetooth is available and permitted
exec('powershell "Get-WmiObject Win32_Bluetooth"', (error, stdout) => {
  if (error) {
    console.log('Bluetooth not available or permission denied');
  } else {
    console.log('Bluetooth accessible');
  }
});
```

### ANT+ USB Device Access
- **Permission Model**: Driver-based access
- **Requirements**: Garmin ANT+ drivers must be installed
- **Driver Source**: Available from Garmin website
- **Automatic Installation**: Windows Update may install automatically
- **WinUSB**: Uses WinUSB driver for libusb compatibility

## Linux Permission Requirements

### Bluetooth Low Energy Access
- **Permission Model**: Group-based permissions
- **Framework**: BlueZ via D-Bus
- **Required Group**: `bluetooth` group membership
- **Service**: `bluetoothd` must be running
- **D-Bus Policy**: May require custom policy files for non-root access

### Implementation for Linux:
```bash
# Check if user is in bluetooth group
groups $USER | grep -q bluetooth && echo "Has bluetooth permissions" || echo "Missing bluetooth permissions"

# Check BlueZ service status  
systemctl is-active --quiet bluetooth && echo "Bluetooth service running" || echo "Bluetooth service not running"

# Check D-Bus permissions
dbus-send --system --print-reply --dest=org.bluez / org.freedesktop.DBus.Introspectable.Introspect 2>/dev/null && echo "D-Bus accessible" || echo "D-Bus access denied"
```

### Setup Commands:
```bash
# Add user to bluetooth group
sudo usermod -a -G bluetooth $USER

# Install BlueZ
sudo apt-get install bluez bluez-tools

# Start and enable service
sudo systemctl start bluetooth
sudo systemctl enable bluetooth

# Create D-Bus policy (if needed)
sudo tee /etc/dbus-1/system.d/ultibiker-bluetooth.conf <<EOF
<!DOCTYPE busconfig PUBLIC "-//freedesktop//DTD D-BUS Bus Configuration 1.0//EN"
 "http://www.freedesktop.org/standards/dbus/1.0/busconfig.dtd">
<busconfig>
  <policy group="bluetooth">
    <allow send_destination="org.bluez"/>
    <allow send_interface="org.bluez.Device1"/>
    <allow send_interface="org.bluez.Adapter1"/>
  </policy>
</busconfig>
EOF
```

### ANT+ USB Device Access
- **Permission Model**: udev rules + group membership
- **Required Group**: `dialout` or custom group
- **udev Rules**: Custom rules for Garmin ANT+ devices
- **Device Nodes**: Creates `/dev/ttyUSB*` or `/dev/antusb*` nodes

### Setup Commands:
```bash
# Add user to dialout group
sudo usermod -a -G dialout $USER

# Create udev rules for ANT+ devices
sudo tee /etc/udev/rules.d/99-garmin-ant.rules <<EOF
# Garmin ANT+ USB Stick
SUBSYSTEM=="usb", ATTR{idVendor}=="0fcf", ATTR{idProduct}=="1008", MODE="0666", GROUP="dialout"
SUBSYSTEM=="usb", ATTR{idVendor}=="0fcf", ATTR{idProduct}=="1009", MODE="0666", GROUP="dialout"

# Create symlink for easy access
SUBSYSTEM=="usb", ATTR{idVendor}=="0fcf", ATTR{idProduct}=="1008", SYMLINK+="antusb%n"
SUBSYSTEM=="usb", ATTR{idVendor}=="0fcf", ATTR{idProduct}=="1009", SYMLINK+="antusb%n"
EOF

# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger
```

## Cross-Platform Permission Detection

### Node.js Implementation:
```javascript
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class PermissionManager {
  async checkBluetoothPermissions() {
    const platform = os.platform();
    
    switch (platform) {
      case 'darwin':
        return this.checkMacOSBluetooth();
      case 'win32':
        return this.checkWindowsBluetooth();
      case 'linux':
        return this.checkLinuxBluetooth();
      default:
        return { available: false, reason: 'Unsupported platform' };
    }
  }
  
  async checkMacOSBluetooth() {
    try {
      // Check if Bluetooth is powered on
      const { stdout } = await execAsync('system_profiler SPBluetoothDataType');
      const powered = stdout.includes('State: On');
      
      // Noble.js will handle permission request when scanning starts
      return { 
        available: powered, 
        reason: powered ? 'Ready' : 'Bluetooth not powered on',
        requiresUserConsent: true
      };
    } catch (error) {
      return { available: false, reason: 'Cannot check Bluetooth status' };
    }
  }
  
  async checkWindowsBluetooth() {
    try {
      const { stdout } = await execAsync('powershell "Get-PnpDevice -FriendlyName *Bluetooth* | Where-Object Status -eq OK"');
      const hasWorkingBluetooth = stdout.trim().length > 0;
      
      return {
        available: hasWorkingBluetooth,
        reason: hasWorkingBluetooth ? 'Ready' : 'No working Bluetooth adapter found',
        requiresUserConsent: true
      };
    } catch (error) {
      return { available: false, reason: 'Cannot check Bluetooth status' };
    }
  }
  
  async checkLinuxBluetooth() {
    try {
      // Check if BlueZ service is running
      const { stdout: serviceStatus } = await execAsync('systemctl is-active bluetooth');
      const serviceRunning = serviceStatus.trim() === 'active';
      
      if (!serviceRunning) {
        return { available: false, reason: 'Bluetooth service not running' };
      }
      
      // Check user group membership
      const { stdout: groupsOutput } = await execAsync('groups');
      const hasBluetoothGroup = groupsOutput.includes('bluetooth');
      
      if (!hasBluetoothGroup) {
        return { available: false, reason: 'User not in bluetooth group' };
      }
      
      // Check if adapter is available
      const { stdout: hciOutput } = await execAsync('hciconfig');
      const hasAdapter = hciOutput.includes('hci');
      
      return {
        available: hasAdapter,
        reason: hasAdapter ? 'Ready' : 'No Bluetooth adapter found',
        requiresUserConsent: false
      };
    } catch (error) {
      return { available: false, reason: 'Cannot check Bluetooth status' };
    }
  }
  
  async checkANTPermissions() {
    const platform = os.platform();
    
    switch (platform) {
      case 'darwin':
        return this.checkMacOSANT();
      case 'win32':
        return this.checkWindowsANT();
      case 'linux':
        return this.checkLinuxANT();
      default:
        return { available: false, reason: 'Unsupported platform' };
    }
  }
  
  async checkMacOSANT() {
    try {
      // Check for Garmin ANT+ device
      const { stdout } = await execAsync('system_profiler SPUSBDataType');
      const hasANTDevice = stdout.includes('0fcf') || stdout.includes('Garmin') || stdout.includes('ANT');
      
      return {
        available: hasANTDevice,
        reason: hasANTDevice ? 'ANT+ device detected' : 'No ANT+ device found'
      };
    } catch (error) {
      return { available: false, reason: 'Cannot check USB devices' };
    }
  }
  
  async checkWindowsANT() {
    try {
      // Check for ANT+ device in device manager
      const { stdout } = await execAsync('wmic path Win32_PnPEntity where "DeviceID like \'%VID_0FCF%\'" get Name,Status');
      const hasANTDevice = stdout.includes('OK') && (stdout.includes('ANT') || stdout.includes('Garmin'));
      
      return {
        available: hasANTDevice,
        reason: hasANTDevice ? 'ANT+ device ready' : 'No ANT+ device found or drivers missing'
      };
    } catch (error) {
      return { available: false, reason: 'Cannot check USB devices' };
    }
  }
  
  async checkLinuxANT() {
    try {
      // Check if user is in dialout group
      const { stdout: groupsOutput } = await execAsync('groups');
      const hasDialoutGroup = groupsOutput.includes('dialout');
      
      if (!hasDialoutGroup) {
        return { available: false, reason: 'User not in dialout group' };
      }
      
      // Check for ANT+ device
      const { stdout: lsusbOutput } = await execAsync('lsusb');
      const hasANTDevice = lsusbOutput.includes('0fcf:') || lsusbOutput.includes('Garmin');
      
      return {
        available: hasANTDevice,
        reason: hasANTDevice ? 'ANT+ device detected' : 'No ANT+ device found'
      };
    } catch (error) {
      return { available: false, reason: 'Cannot check USB devices' };
    }
  }
  
  async generateSetupInstructions() {
    const platform = os.platform();
    const bluetooth = await this.checkBluetoothPermissions();
    const ant = await this.checkANTPermissions();
    
    const instructions = {
      platform,
      bluetooth,
      ant,
      setupSteps: []
    };
    
    // Generate platform-specific setup steps
    switch (platform) {
      case 'darwin':
        if (!bluetooth.available) {
          instructions.setupSteps.push({
            type: 'bluetooth',
            action: 'Enable Bluetooth in System Preferences',
            command: 'open /System/Library/PreferencePanes/Bluetooth.prefPane'
          });
        }
        if (!ant.available) {
          instructions.setupSteps.push({
            type: 'ant',
            action: 'Connect Garmin ANT+ USB stick',
            note: 'No drivers required on macOS'
          });
        }
        break;
        
      case 'linux':
        if (!bluetooth.available) {
          if (bluetooth.reason.includes('service')) {
            instructions.setupSteps.push({
              type: 'bluetooth',
              action: 'Start Bluetooth service',
              command: 'sudo systemctl start bluetooth && sudo systemctl enable bluetooth'
            });
          }
          if (bluetooth.reason.includes('group')) {
            instructions.setupSteps.push({
              type: 'bluetooth',
              action: 'Add user to bluetooth group',
              command: 'sudo usermod -a -G bluetooth $USER',
              note: 'Logout and login required'
            });
          }
        }
        if (!ant.available && ant.reason.includes('group')) {
          instructions.setupSteps.push({
            type: 'ant',
            action: 'Add user to dialout group',
            command: 'sudo usermod -a -G dialout $USER',
            note: 'Logout and login required'
          });
        }
        break;
        
      case 'win32':
        if (!bluetooth.available) {
          instructions.setupSteps.push({
            type: 'bluetooth',
            action: 'Enable Bluetooth in Windows Settings',
            command: 'ms-settings:bluetooth'
          });
        }
        if (!ant.available) {
          instructions.setupSteps.push({
            type: 'ant',
            action: 'Install Garmin ANT+ drivers',
            url: 'https://www.garmin.com/en-US/software/ant-usb-driver/'
          });
        }
        break;
    }
    
    return instructions;
  }
}

module.exports = { PermissionManager };
```

## Security Considerations

### Data Privacy
- **Minimal Data Collection**: Only collect necessary sensor data
- **Local Processing**: Process data locally when possible  
- **Consent Management**: Clear user consent for data access
- **Audit Logging**: Log permission requests and grants

### Permission Escalation Prevention
- **Principle of Least Privilege**: Request only necessary permissions
- **Sandboxing**: Run with minimal system privileges
- **Input Validation**: Validate all sensor data inputs
- **Secure Communication**: Use encrypted channels when available

### Enterprise Deployment
- **Group Policy Support**: Windows enterprise policy compliance
- **Mobile Device Management**: macOS profile support
- **Configuration Management**: Linux configuration automation
- **Compliance Reporting**: Permission status reporting

## Testing and Validation

### Automated Testing
```bash
# Test script for permission validation
#!/bin/bash
echo "Testing UltiBiker permissions..."

# Test Bluetooth
node -e "
const { PermissionManager } = require('./src/permissions');
const pm = new PermissionManager();
pm.checkBluetoothPermissions().then(result => {
  console.log('Bluetooth:', result.available ? 'OK' : 'FAIL -', result.reason);
});
"

# Test ANT+
node -e "
const { PermissionManager } = require('./src/permissions');
const pm = new PermissionManager();
pm.checkANTPermissions().then(result => {
  console.log('ANT+:', result.available ? 'OK' : 'FAIL -', result.reason);
});
"
```

### User Testing Checklist
- [ ] Fresh installation without prior permissions
- [ ] Permission denial and re-request flow  
- [ ] Permission revocation and re-grant
- [ ] Multiple Bluetooth adapters
- [ ] Multiple ANT+ devices
- [ ] Background permission changes
- [ ] System sleep/wake behavior
- [ ] Hot-plug device detection

## Implementation Recommendations

### Graceful Degradation
- **Fallback Modes**: Operate with limited functionality when permissions unavailable
- **Progressive Enhancement**: Enable features as permissions are granted
- **Clear Messaging**: Inform users about permission requirements
- **Retry Mechanisms**: Allow users to retry permission requests

### User Experience
- **Just-in-Time Permissions**: Request permissions when features are used
- **Clear Explanations**: Explain why permissions are needed
- **Alternative Workflows**: Provide alternatives when permissions denied
- **Status Indicators**: Show current permission status in UI

### Performance Considerations
- **Lazy Loading**: Load permission checks only when needed
- **Caching**: Cache permission status with appropriate TTL
- **Background Checks**: Periodically verify permissions are still valid
- **Efficient Scanning**: Optimize Bluetooth/ANT+ scanning for battery life

## Conclusion

Proper OS permission handling is critical for UltiBiker's sensor integration functionality. The implementation must handle platform differences gracefully while providing clear user guidance and maintaining security best practices.

The key success factors are:
1. **Platform-Specific Implementation**: Each OS has unique requirements
2. **User-Centric Design**: Clear permission explanations and setup guidance  
3. **Robust Error Handling**: Graceful degradation when permissions unavailable
4. **Security First**: Minimal permissions with strong validation
5. **Testability**: Comprehensive testing across platforms and scenarios