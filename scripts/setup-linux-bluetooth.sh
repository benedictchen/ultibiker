#!/bin/bash
# UltiBiker Linux Bluetooth Setup Script
# Automatically configures Bluetooth permissions and services on Linux

set -e

echo "🐧 UltiBiker Linux Bluetooth Setup"
echo "=================================="
echo

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ Do not run this script as root! Run as your regular user."
   echo "   The script will ask for sudo when needed."
   exit 1
fi

# Detect Linux distribution
if command -v lsb_release &> /dev/null; then
    DISTRO=$(lsb_release -si)
    VERSION=$(lsb_release -sr)
    echo "📊 Detected: $DISTRO $VERSION"
elif [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO=$ID
    VERSION=$VERSION_ID
    echo "📊 Detected: $PRETTY_NAME"
else
    DISTRO="unknown"
    echo "⚠️ Could not detect Linux distribution"
fi

echo

# Step 1: Install BlueZ
echo "📦 Step 1: Installing BlueZ Bluetooth stack..."
if command -v apt-get &> /dev/null; then
    # Debian/Ubuntu
    sudo apt-get update
    sudo apt-get install -y bluez bluetooth libbluetooth-dev
elif command -v dnf &> /dev/null; then
    # Fedora/RHEL 8+
    sudo dnf install -y bluez bluez-libs-devel
elif command -v yum &> /dev/null; then
    # RHEL/CentOS 7
    sudo yum install -y bluez bluez-libs-devel
elif command -v pacman &> /dev/null; then
    # Arch Linux
    sudo pacman -S --noconfirm bluez bluez-utils
elif command -v zypper &> /dev/null; then
    # openSUSE
    sudo zypper install -y bluez bluez-devel
else
    echo "⚠️ Package manager not recognized. Please install BlueZ manually:"
    echo "   • Debian/Ubuntu: sudo apt-get install bluez bluetooth"
    echo "   • Fedora: sudo dnf install bluez"
    echo "   • Arch: sudo pacman -S bluez bluez-utils"
fi

echo "✅ BlueZ installation completed"
echo

# Step 2: Start and enable Bluetooth service
echo "🔧 Step 2: Configuring Bluetooth service..."
sudo systemctl enable bluetooth
sudo systemctl start bluetooth

# Check service status
if systemctl is-active --quiet bluetooth; then
    echo "✅ Bluetooth service is running"
else
    echo "❌ Bluetooth service failed to start"
    echo "   Try manually: sudo systemctl start bluetooth"
fi

echo

# Step 3: Add user to bluetooth group
echo "👤 Step 3: Adding user to bluetooth group..."
sudo usermod -a -G bluetooth $USER

# Check if user is in bluetooth group
if id -nG $USER | grep -qw bluetooth; then
    echo "✅ User $USER is in bluetooth group"
else
    echo "⚠️ User may need to log out and back in for group changes to take effect"
fi

echo

# Step 4: Set up udev rules for better device access
echo "🔧 Step 4: Setting up udev rules..."
sudo tee /etc/udev/rules.d/99-bluetooth-permissions.rules > /dev/null <<EOF
# Bluetooth device permissions for UltiBiker
KERNEL=="rfkill", GROUP="bluetooth", MODE="0664"
SUBSYSTEM=="bluetooth", GROUP="bluetooth", MODE="0664"

# Grant access to bluetooth devices for users in bluetooth group
SUBSYSTEM=="usb", ATTRS{idVendor}=="*", ATTRS{bDeviceClass}=="e0", GROUP="bluetooth", MODE="0664"
EOF

sudo udevadm control --reload-rules
sudo udevadm trigger

echo "✅ udev rules configured"
echo

# Step 5: Check for common issues
echo "🔍 Step 5: Checking for common issues..."

# Check if bluetooth kernel module is loaded
if lsmod | grep -q bluetooth; then
    echo "✅ Bluetooth kernel module loaded"
else
    echo "⚠️ Bluetooth kernel module not loaded, trying to load..."
    sudo modprobe bluetooth
    if lsmod | grep -q bluetooth; then
        echo "✅ Bluetooth kernel module loaded successfully"
    else
        echo "❌ Failed to load bluetooth kernel module"
    fi
fi

# Check if hci0 interface exists
if hciconfig hci0 &> /dev/null; then
    echo "✅ Bluetooth adapter (hci0) detected"
    hciconfig hci0
else
    echo "⚠️ No Bluetooth adapter detected"
    echo "   This could mean:"
    echo "   • No Bluetooth hardware present"
    echo "   • Bluetooth is disabled in BIOS"
    echo "   • Driver not installed for your Bluetooth adapter"
fi

echo

# Step 6: Test Bluetooth functionality
echo "🧪 Step 6: Testing Bluetooth functionality..."
if command -v bluetoothctl &> /dev/null; then
    echo "✅ bluetoothctl command available"
    
    # Try to scan briefly
    timeout 5 bluetoothctl --agent scan on 2>/dev/null || echo "ℹ️ Quick scan test completed (this is normal)"
    
else
    echo "❌ bluetoothctl not found - install bluez-tools"
    echo "   sudo apt-get install bluez-tools  # Debian/Ubuntu"
fi

echo

# Step 7: ANT+ USB setup (optional)
echo "🔌 Step 7: Setting up ANT+ USB permissions (optional)..."

# Add user to dialout group for USB serial access
sudo usermod -a -G dialout $USER

# Create udev rules for Garmin ANT+ devices
sudo tee /etc/udev/rules.d/99-garmin-ant.rules > /dev/null <<EOF
# Garmin ANT+ USB stick permissions
SUBSYSTEM=="usb", ATTR{idVendor}=="0fcf", ATTR{idProduct}=="1008", MODE="0666", GROUP="dialout"
SUBSYSTEM=="usb", ATTR{idVendor}=="0fcf", ATTR{idProduct}=="1009", MODE="0666", GROUP="dialout"

# Alternative: grant access to ttyUSB and ttyACM devices for dialout group
KERNEL=="ttyUSB[0-9]*", GROUP="dialout", MODE="0666"
KERNEL=="ttyACM[0-9]*", GROUP="dialout", MODE="0666"
EOF

sudo udevadm control --reload-rules
sudo udevadm trigger

echo "✅ ANT+ USB permissions configured"
echo

# Final summary
echo "🎉 Setup Complete!"
echo "=================="
echo
echo "What was done:"
echo "✅ Installed BlueZ Bluetooth stack"
echo "✅ Started and enabled bluetooth service"  
echo "✅ Added $USER to bluetooth and dialout groups"
echo "✅ Set up udev rules for device permissions"
echo "✅ Configured ANT+ USB access"
echo
echo "⚠️ IMPORTANT: You must log out and log back in for group changes to take effect"
echo
echo "🧪 Test your setup:"
echo "1. Log out and log back in (or reboot)"
echo "2. Run: node permission-helper.js"
echo "3. Start UltiBiker and try scanning for sensors"
echo
echo "🆘 If you still have issues:"
echo "• Check dmesg for hardware errors: dmesg | grep -i bluetooth"
echo "• Verify group membership: groups | grep bluetooth"  
echo "• Test Bluetooth manually: bluetoothctl scan on"
echo

read -p "Press Enter to continue..."