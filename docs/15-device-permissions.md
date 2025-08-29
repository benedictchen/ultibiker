# Device Permissions and Platform Setup

This document covers the device permissions required for UltiBiker to access Bluetooth and ANT+ sensors on different platforms.

## Overview

UltiBiker requires access to:
- **Bluetooth Low Energy (BLE)** for wireless cycling sensors
- **USB devices** for ANT+ USB sticks (optional)

Platform-specific setup is required to ensure proper permissions.

## macOS Setup

### Bluetooth Permissions

macOS requires explicit permission for applications to access Bluetooth.

1. **Automatic Permission Request**: When UltiBiker first tries to scan for sensors, macOS will show a permission dialog
2. **Grant Permission**: Click "Allow" to grant Bluetooth access
3. **Manual Permission Check**: 
   - Open System Preferences > Privacy & Security > Bluetooth
   - Ensure UltiBiker is checked
   - Restart UltiBiker after changing permissions

### ANT+ USB Setup

1. Connect a Garmin ANT+ USB stick
2. macOS should automatically detect it
3. No additional permissions needed for USB devices

### Troubleshooting macOS

- **No permission dialog appears**: Check System Preferences > Privacy & Security > Bluetooth manually
- **Bluetooth scanning fails**: Ensure Bluetooth is enabled in System Preferences > Bluetooth
- **Permission denied errors**: Restart UltiBiker after granting permissions
- **Bluetooth reset**: `sudo blueutil -p 0 && sudo blueutil -p 1`

## Linux Setup

### Bluetooth Setup

Linux requires BlueZ and proper user permissions.

```bash
# Install BlueZ
sudo apt-get update
sudo apt-get install bluez

# Start Bluetooth service
sudo systemctl start bluetooth
sudo systemctl enable bluetooth

# Add user to bluetooth group
sudo usermod -a -G bluetooth $USER

# Log out and log back in for changes to take effect
```

### ANT+ USB Setup

```bash
# Add user to dialout group for USB access
sudo usermod -a -G dialout $USER

# Create udev rule for ANT+ devices
sudo tee /etc/udev/rules.d/99-garmin.rules <<EOF
SUBSYSTEM=="usb", ATTR{idVendor}=="0fcf", ATTR{idProduct}=="1008", MODE="0666"
SUBSYSTEM=="usb", ATTR{idVendor}=="0fcf", ATTR{idProduct}=="1009", MODE="0666"
EOF

# Reload udev rules
sudo udevadm control --reload-rules

# Reconnect ANT+ device
```

### Troubleshooting Linux

- **BlueZ not found**: `sudo apt-get install bluez`
- **Service not running**: `sudo systemctl status bluetooth`
- **Permission denied**: Check user groups with `groups`
- **USB device not detected**: `lsusb | grep 0fcf`

## Windows Setup

### Bluetooth Setup

1. Open Settings > Devices > Bluetooth & other devices
2. Ensure "Bluetooth" is turned on
3. Windows may prompt for permissions when UltiBiker starts
4. Click "Yes" or "Allow" to grant access

### ANT+ USB Setup

1. Connect Garmin ANT+ USB stick
2. Windows should automatically install drivers
3. If not recognized, download drivers from Garmin website

### Troubleshooting Windows

- **Bluetooth not available**: Check Device Manager for Bluetooth drivers
- **Permission denied**: Check Windows privacy settings
- **ANT+ device not recognized**: Install Garmin ANT+ drivers

## API Endpoints

UltiBiker provides several API endpoints for permission checking:

### Check Permission Status
```
GET /api/permissions/status
```

Returns current permission status for Bluetooth and USB devices.

### Get Permission Report
```
GET /api/permissions/report
```

Returns a detailed text report of permission status.

### Get Setup Guide
```
GET /api/permissions/guide
```

Returns a complete markdown setup guide for the current platform.

### Get Platform Instructions
```
GET /api/permissions/instructions
```

Returns platform-specific setup instructions as JSON.

## Browser Testing Interface

The browser test interface (`/test-sensors.html`) includes:

- **Permission Status**: Real-time permission checking
- **Setup Guide**: Direct link to platform-specific instructions
- **Interactive Testing**: Test sensor detection with permission awareness

Access the interface at: `http://localhost:3000/test-sensors.html`

## Common Issues

### "Bluetooth adapter not ready"
- **macOS**: Check System Preferences > Privacy & Security > Bluetooth
- **Linux**: Ensure BlueZ is installed and service is running
- **Windows**: Check Settings > Devices > Bluetooth

### "Permission denied" errors
- **macOS**: Grant permission in System Preferences and restart app
- **Linux**: Add user to bluetooth group and log out/in
- **Windows**: Allow access when prompted by Windows

### ANT+ device not detected
- Check USB connection and try different port
- Ensure device is properly recognized by system
- Verify drivers are installed (Windows)
- Check udev rules and permissions (Linux)

### Noble library errors
- `noble.on is not a function`: Restart the application
- `Cannot redefine property`: Multiple Noble instances, restart required
- `Bluetooth adapter state unknown`: Permission or driver issue

## Development Testing

For development and testing:

1. **Mock Mode**: Set `BLE_ENABLED=false` and `ANT_STICK_ENABLED=false` in environment
2. **Permission Testing**: Use `/api/permissions/status` endpoint
3. **Browser Interface**: Use `/test-sensors.html` for interactive testing
4. **Platform Testing**: Test on different platforms with appropriate hardware

## Security Considerations

- UltiBiker only requests necessary permissions for sensor access
- No unnecessary data collection or transmission
- Bluetooth scanning limited to cycling sensor service UUIDs
- USB access limited to Garmin ANT+ devices (vendor ID 0x0fcf)
- All permission requests are transparent to users

## Hardware Requirements

### Bluetooth Sensors
- Heart rate monitors (Polar, Garmin, Wahoo, etc.)
- Power meters (Stages, Quarq, 4iiii, etc.)
- Speed/cadence sensors
- Smart trainers (Kickr, Neo, etc.)

### ANT+ Sensors
- Requires Garmin ANT+ USB stick
- Same sensor types as Bluetooth
- Often more reliable connection
- Better for stationary setups

## Support

For permission-related issues:
1. Check the setup guide: `/api/permissions/guide`
2. Use the browser test interface: `/test-sensors.html`
3. Review platform-specific troubleshooting above
4. Check system logs for detailed error messages