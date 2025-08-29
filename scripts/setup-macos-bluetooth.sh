#!/bin/bash
# UltiBiker macOS Bluetooth Setup Script
# Helps users configure Bluetooth permissions and troubleshoot issues on macOS

set -e

echo "🍎 UltiBiker macOS Bluetooth Setup"
echo "=================================="
echo

# Check macOS version
MACOS_VERSION=$(sw_vers -productVersion)
MACOS_MAJOR=$(echo $MACOS_VERSION | cut -d. -f1)
MACOS_MINOR=$(echo $MACOS_VERSION | cut -d. -f2)

echo "📊 macOS Version: $MACOS_VERSION"

if [ "$MACOS_MAJOR" -ge 11 ]; then
    echo "✅ Modern macOS - advanced permission system available"
    MODERN_MACOS=true
elif [ "$MACOS_MAJOR" -eq 10 ] && [ "$MACOS_MINOR" -ge 15 ]; then
    echo "✅ macOS Catalina or later - TCC system available"
    MODERN_MACOS=true
else
    echo "⚠️ Older macOS - some features may not be available"
    MODERN_MACOS=false
fi

echo

# Step 1: Check Bluetooth hardware
echo "🔧 Step 1: Checking Bluetooth hardware..."
if system_profiler SPBluetoothDataType | grep -q "Bluetooth Power: On"; then
    echo "✅ Bluetooth is enabled"
    
    # Get Bluetooth adapter info
    BT_INFO=$(system_profiler SPBluetoothDataType | grep -A 5 "Controller:")
    if [ ! -z "$BT_INFO" ]; then
        echo "📡 Bluetooth Controller Information:"
        echo "$BT_INFO" | head -3
    fi
else
    echo "❌ Bluetooth is disabled or not available"
    echo "   Enable Bluetooth in System Preferences > Bluetooth"
    echo "   Or use command: sudo blueutil -p 1"
    
    # Check if blueutil is available
    if command -v blueutil &> /dev/null; then
        read -p "Enable Bluetooth now? (y/n): " -r
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo blueutil -p 1
            echo "✅ Bluetooth enabled"
        fi
    else
        echo "💡 Install blueutil for command-line Bluetooth control:"
        echo "   brew install blueutil"
    fi
fi

echo

# Step 2: Check application permissions
echo "🔒 Step 2: Checking application permissions..."

APP_NAME="UltiBiker"
if [ ! -z "$npm_package_name" ]; then
    APP_NAME="$npm_package_name"
fi

echo "🔍 Looking for Bluetooth permissions for: $APP_NAME"

# Check TCC database (may not work on newer macOS versions due to SIP)
if [ "$MODERN_MACOS" = true ]; then
    TCC_CHECK=$(sqlite3 ~/Library/Application\ Support/com.apple.TCC/TCC.db \
        "SELECT client, auth_value FROM access WHERE service='kTCCServiceBluetoothAlways' AND client LIKE '%$APP_NAME%' OR client LIKE '%node%' OR client LIKE '%Terminal%'" 2>/dev/null || echo "")
    
    if [ ! -z "$TCC_CHECK" ]; then
        echo "📋 Found Bluetooth permission entries:"
        echo "$TCC_CHECK"
        
        if echo "$TCC_CHECK" | grep -q "|2|"; then
            echo "✅ Bluetooth permission granted"
        elif echo "$TCC_CHECK" | grep -q "|0|"; then
            echo "❌ Bluetooth permission denied"
            echo "   Fix: System Preferences > Privacy & Security > Bluetooth"
        fi
    else
        echo "ℹ️ No Bluetooth permission entries found (permission not yet requested)"
    fi
else
    echo "ℹ️ Permission checking limited on this macOS version"
fi

echo

# Step 3: Environment detection
echo "🖥️ Step 3: Checking execution environment..."

if [ ! -z "$TERM" ]; then
    echo "📺 Running in Terminal"
    echo "   Terminal needs Bluetooth permission to access sensors"
    echo "   The permission dialog will mention 'Terminal' not 'UltiBiker'"
    
    # Check if Terminal has Bluetooth permission
    TERMINAL_PERM=$(sqlite3 ~/Library/Application\ Support/com.apple.TCC/TCC.db \
        "SELECT auth_value FROM access WHERE service='kTCCServiceBluetoothAlways' AND client LIKE '%Terminal%'" 2>/dev/null || echo "")
    
    if [ "$TERMINAL_PERM" = "2" ]; then
        echo "✅ Terminal has Bluetooth permission"
    elif [ "$TERMINAL_PERM" = "0" ]; then
        echo "❌ Terminal Bluetooth permission denied"
        echo "   Fix this in System Preferences > Privacy & Security > Bluetooth"
    else
        echo "⚠️ Terminal Bluetooth permission not set (will be requested on first scan)"
    fi
else
    echo "📱 Running as standalone application"
    echo "   Permission dialog will show the app name directly"
fi

echo

# Step 4: ANT+ USB detection
echo "🔌 Step 4: Checking for ANT+ USB devices..."

USB_DEVICES=$(system_profiler SPUSBDataType)
if echo "$USB_DEVICES" | grep -q "Garmin.*ANT\|0x0fcf"; then
    echo "✅ ANT+ USB device detected"
    
    # Show device details
    GARMIN_INFO=$(echo "$USB_DEVICES" | grep -A 10 -B 2 "Garmin.*ANT\|0x0fcf")
    if [ ! -z "$GARMIN_INFO" ]; then
        echo "📡 Device Information:"
        echo "$GARMIN_INFO" | grep "Product ID\|Vendor ID\|Serial Number" || echo "   Details not available"
    fi
else
    echo "ℹ️ No ANT+ USB device detected"
    echo "   Connect Garmin ANT+ USB stick if you have one"
    echo "   ANT+ is optional - Bluetooth sensors will work without it"
fi

echo

# Step 5: Permission troubleshooting
echo "🔧 Step 5: Permission troubleshooting guide..."

echo "If you're having Bluetooth permission issues:"
echo
echo "1️⃣ **Grant Permission When Prompted**"
echo "   • UltiBiker will request permission on first sensor scan"
echo "   • Click 'Allow' in the system dialog"
echo
echo "2️⃣ **Manual Permission Setup**"
echo "   • System Preferences > Privacy & Security > Bluetooth"
echo "   • Look for 'Terminal', 'Node', or your app name"
echo "   • Enable the checkbox"
echo
echo "3️⃣ **Reset Permissions (if stuck)**"
if [ "$MODERN_MACOS" = true ]; then
    echo "   • Run: tccutil reset Bluetooth"
    echo "   • Restart UltiBiker"
    echo "   • Grant permission when prompted again"
fi

echo
echo "4️⃣ **Open System Preferences Now**"
read -p "Open Privacy & Security settings now? (y/n): " -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open "x-apple.systempreferences:com.apple.preference.security?Privacy_Bluetooth"
    echo "✅ Privacy settings opened"
    echo "   Look for Terminal or Node.js in the Bluetooth section"
fi

echo

# Step 6: Create helpful shortcuts
echo "🔗 Step 6: Creating helpful shortcuts..."

# Create quick permission reset script
cat > /tmp/reset-bluetooth-permission.sh << 'EOF'
#!/bin/bash
echo "🔄 Resetting Bluetooth permissions..."
tccutil reset Bluetooth
echo "✅ Permissions reset. Restart UltiBiker and grant permission when prompted."
EOF
chmod +x /tmp/reset-bluetooth-permission.sh

echo "📝 Created utility scripts:"
echo "   • /tmp/reset-bluetooth-permission.sh - Reset Bluetooth permissions"

# Create troubleshooting commands file
cat > /tmp/bluetooth-diagnostics.sh << 'EOF'
#!/bin/bash
echo "🔍 macOS Bluetooth Diagnostics"
echo "=============================="
echo

echo "📊 System Information:"
sw_vers
echo

echo "📡 Bluetooth Hardware:"
system_profiler SPBluetoothDataType | grep -A 5 "Bluetooth Power\|Controller:"
echo

echo "🔌 USB Devices (ANT+):"
system_profiler SPUSBDataType | grep -A 5 -B 2 "Garmin\|0x0fcf" || echo "No ANT+ devices found"
echo

echo "🔒 Bluetooth Permissions:"
sqlite3 ~/Library/Application\ Support/com.apple.TCC/TCC.db \
  "SELECT client, auth_value, last_modified FROM access WHERE service='kTCCServiceBluetoothAlways'" 2>/dev/null || echo "Cannot access TCC database"
EOF
chmod +x /tmp/bluetooth-diagnostics.sh

echo "   • /tmp/bluetooth-diagnostics.sh - Run full Bluetooth diagnostics"

echo

# Final summary
echo "🎉 macOS Setup Complete!"
echo "========================"
echo
echo "✅ Checked Bluetooth hardware"
echo "✅ Analyzed permission status"  
echo "✅ Detected execution environment"
echo "✅ Checked for ANT+ devices"
echo "✅ Created troubleshooting tools"
echo
echo "🚀 **Next Steps:**"
echo "1. Start UltiBiker: npm run dev"
echo "2. Click 'Start Scan' in the web interface"
echo "3. Grant Bluetooth permission when prompted"
echo "4. If no prompt appears, check Privacy & Security settings"
echo
echo "🆘 **If you have problems:**"
echo "• Run: /tmp/bluetooth-diagnostics.sh"
echo "• Reset permissions: /tmp/reset-bluetooth-permission.sh"
echo "• Check Console.app for permission errors"
echo

read -p "Press Enter to continue..."