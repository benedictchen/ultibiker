import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

// Conditional import for macOS permissions
let macPermissions: any = null;
try {
  if (process.platform === 'darwin') {
    macPermissions = require('node-mac-permissions');
  }
} catch (error) {
  console.log('ℹ️ node-mac-permissions not available - using fallback methods');
}

export interface PermissionStatus {
  granted: boolean;
  denied: boolean;
  requiresUserAction: boolean;
  message: string;
  instructions?: string[];
}

export interface DevicePermissions {
  bluetooth: PermissionStatus;
  usb: PermissionStatus;
  camera?: PermissionStatus;
  microphone?: PermissionStatus;
}

export class PermissionManager extends EventEmitter {
  private platform: string;
  private permissions: DevicePermissions;

  constructor() {
    super();
    this.platform = process.platform;
    this.permissions = {
      bluetooth: { granted: false, denied: false, requiresUserAction: false, message: 'Not checked' },
      usb: { granted: false, denied: false, requiresUserAction: false, message: 'Not checked' }
    };
  }

  async checkAllPermissions(): Promise<DevicePermissions> {
    console.log(`🔒 Checking device permissions on ${this.platform}...`);
    
    try {
      // Check Bluetooth permissions
      this.permissions.bluetooth = await this.checkBluetoothPermissions();
      
      // Check USB permissions (mostly informational)
      this.permissions.usb = await this.checkUSBPermissions();
      
      // Emit permission status update
      this.emit('permissions-updated', this.permissions);
      
      return this.permissions;
    } catch (error) {
      console.error('❌ Error checking permissions:', error);
      return this.permissions;
    }
  }

  async checkBluetoothPermissions(): Promise<PermissionStatus> {
    console.log('📶 Checking Bluetooth permissions...');
    
    switch (this.platform) {
      case 'darwin': // macOS
        return await this.checkMacOSBluetoothPermissions();
      case 'linux':
        return await this.checkLinuxBluetoothPermissions();
      case 'win32': // Windows
        return await this.checkWindowsBluetoothPermissions();
      default:
        return {
          granted: false,
          denied: false,
          requiresUserAction: true,
          message: `Bluetooth permission checking not implemented for ${this.platform}`,
          instructions: [`Platform ${this.platform} may require manual Bluetooth setup`]
        };
    }
  }

  private async checkMacOSBluetoothPermissions(): Promise<PermissionStatus> {
    try {
      // Check if Bluetooth is enabled at system level
      const { stdout: bluetoothPower } = await execAsync('system_profiler SPBluetoothDataType');
      
      if (!bluetoothPower.includes('Bluetooth Power: On')) {
        return {
          granted: false,
          denied: false,
          requiresUserAction: true,
          message: 'Bluetooth is disabled on this system',
          instructions: [
            'Enable Bluetooth in System Preferences > Bluetooth',
            'Or use command: sudo blueutil -p 1'
          ]
        };
      }

      // Use node-mac-permissions if available
      if (macPermissions) {
        try {
          const bluetoothStatus = macPermissions.getAuthorizationStatus('bluetooth');
          console.log(`📶 Bluetooth permission status (via node-mac-permissions): ${bluetoothStatus}`);
          
          switch (bluetoothStatus) {
            case 'authorized':
              return {
                granted: true,
                denied: false,
                requiresUserAction: false,
                message: 'Bluetooth permission granted'
              };
            case 'denied':
              return {
                granted: false,
                denied: true,
                requiresUserAction: true,
                message: 'Bluetooth permission denied',
                instructions: [
                  'Go to System Preferences > Privacy & Security > Bluetooth',
                  'Enable Bluetooth access for this application',
                  'Restart the app after changing permissions'
                ]
              };
            case 'not determined':
              return {
                granted: false,
                denied: false,
                requiresUserAction: true,
                message: 'Bluetooth permission not yet requested',
                instructions: [
                  'App will request Bluetooth permission when first scanning for devices',
                  'Click "Allow" when the system prompt appears',
                  'If no prompt appears, manually enable in System Preferences > Privacy & Security > Bluetooth'
                ]
              };
            case 'restricted':
              return {
                granted: false,
                denied: true,
                requiresUserAction: true,
                message: 'Bluetooth access is restricted by system policy',
                instructions: [
                  'Contact your system administrator',
                  'Check if parental controls or enterprise policies are blocking Bluetooth access'
                ]
              };
            default:
              console.log(`⚠️ Unknown Bluetooth permission status: ${bluetoothStatus}`);
              break;
          }
        } catch (macPermError) {
          console.log('⚠️ Failed to check permissions with node-mac-permissions:', macPermError.message);
        }
      }

      // Fallback to TCC database check
      try {
        const appName = process.env.npm_package_name || 'node';
        const { stdout: permissions } = await execAsync(
          `sqlite3 ~/Library/Application\\ Support/com.apple.TCC/TCC.db "SELECT * FROM access WHERE service='kTCCServiceBluetoothAlways' AND client LIKE '%${appName}%'" 2>/dev/null || echo "no_permission_entry"`
        );

        if (permissions.includes('no_permission_entry') || permissions.trim() === '') {
          return {
            granted: false,
            denied: false,
            requiresUserAction: true,
            message: 'Bluetooth permission not yet requested',
            instructions: [
              'App will request Bluetooth permission on first device scan',
              'Grant permission in System Preferences > Privacy & Security > Bluetooth if prompted'
            ]
          };
        }

        // Check if permission was granted (auth_value = 2) or denied (auth_value = 0)
        if (permissions.includes('|2|')) {
          return {
            granted: true,
            denied: false,
            requiresUserAction: false,
            message: 'Bluetooth permission granted'
          };
        } else if (permissions.includes('|0|')) {
          return {
            granted: false,
            denied: true,
            requiresUserAction: true,
            message: 'Bluetooth permission denied',
            instructions: [
              'Go to System Preferences > Privacy & Security > Bluetooth',
              'Enable Bluetooth access for this application',
              'Restart the app after changing permissions'
            ]
          };
        }

      } catch (sqliteError) {
        console.log('ℹ️ Could not check TCC database (this is normal on newer macOS versions)');
      }

      // Final fallback
      return {
        granted: false,
        denied: false,
        requiresUserAction: true,
        message: 'Bluetooth permission status unknown - will be determined at runtime',
        instructions: [
          'Grant Bluetooth permission when prompted during device scanning',
          'If no prompt appears, check System Preferences > Privacy & Security > Bluetooth'
        ]
      };

    } catch (error) {
      return {
        granted: false,
        denied: false,
        requiresUserAction: true,
        message: 'Could not determine Bluetooth permission status',
        instructions: [
          'Ensure Bluetooth is enabled in System Preferences',
          'Grant Bluetooth permission when prompted by the app'
        ]
      };
    }
  }

  private async checkLinuxBluetoothPermissions(): Promise<PermissionStatus> {
    try {
      // Check if bluetoothctl is available
      const { stdout: bluetoothctl } = await execAsync('which bluetoothctl');
      if (!bluetoothctl) {
        return {
          granted: false,
          denied: false,
          requiresUserAction: true,
          message: 'Bluetooth tools not installed',
          instructions: [
            'Install BlueZ: sudo apt-get install bluez',
            'Start Bluetooth service: sudo systemctl start bluetooth',
            'Add user to bluetooth group: sudo usermod -a -G bluetooth $USER'
          ]
        };
      }

      // Check if Bluetooth service is running
      const { stdout: serviceStatus } = await execAsync('systemctl is-active bluetooth');
      if (serviceStatus.trim() !== 'active') {
        return {
          granted: false,
          denied: false,
          requiresUserAction: true,
          message: 'Bluetooth service not running',
          instructions: [
            'Start Bluetooth service: sudo systemctl start bluetooth',
            'Enable on boot: sudo systemctl enable bluetooth'
          ]
        };
      }

      // Check if user has permissions
      const { stdout: groups } = await execAsync('groups');
      if (!groups.includes('bluetooth')) {
        return {
          granted: false,
          denied: false,
          requiresUserAction: true,
          message: 'User not in bluetooth group',
          instructions: [
            'Add user to bluetooth group: sudo usermod -a -G bluetooth $USER',
            'Log out and log back in for changes to take effect'
          ]
        };
      }

      return {
        granted: true,
        denied: false,
        requiresUserAction: false,
        message: 'Bluetooth permissions available'
      };

    } catch (error) {
      return {
        granted: false,
        denied: false,
        requiresUserAction: true,
        message: 'Could not check Linux Bluetooth permissions',
        instructions: [
          'Ensure BlueZ is installed: sudo apt-get install bluez',
          'Ensure user is in bluetooth group: sudo usermod -a -G bluetooth $USER'
        ]
      };
    }
  }

  private async checkWindowsBluetoothPermissions(): Promise<PermissionStatus> {
    try {
      // Use PowerShell to check Bluetooth status
      const { stdout } = await execAsync('powershell "Get-WmiObject -Class Win32_SystemDriver | Where-Object {$_.Name -eq \'BthEnum\'} | Select-Object State"');
      
      if (stdout.includes('Running')) {
        return {
          granted: true,
          denied: false,
          requiresUserAction: false,
          message: 'Bluetooth service available'
        };
      } else {
        return {
          granted: false,
          denied: false,
          requiresUserAction: true,
          message: 'Bluetooth service not available',
          instructions: [
            'Enable Bluetooth in Windows Settings',
            'Ensure Bluetooth drivers are installed'
          ]
        };
      }
    } catch (error) {
      return {
        granted: false,
        denied: false,
        requiresUserAction: true,
        message: 'Could not check Windows Bluetooth status',
        instructions: [
          'Check Bluetooth settings in Windows Settings',
          'Ensure Bluetooth is enabled and drivers are installed'
        ]
      };
    }
  }

  async checkUSBPermissions(): Promise<PermissionStatus> {
    console.log('🔌 Checking USB device permissions...');
    
    switch (this.platform) {
      case 'darwin': // macOS
        return await this.checkMacOSUSBPermissions();
      case 'linux':
        return await this.checkLinuxUSBPermissions();
      case 'win32': // Windows
        return await this.checkWindowsUSBPermissions();
      default:
        return {
          granted: false,
          denied: false,
          requiresUserAction: true,
          message: `USB permission checking not implemented for ${this.platform}`
        };
    }
  }

  private async checkMacOSUSBPermissions(): Promise<PermissionStatus> {
    try {
      // Check for ANT+ USB devices specifically
      const { stdout: usbDevices } = await execAsync('system_profiler SPUSBDataType');
      
      // Look for Garmin ANT+ devices
      const hasGarminANT = usbDevices.includes('Garmin') && (
        usbDevices.includes('ANT') || 
        usbDevices.includes('0x0fcf') || // Garmin vendor ID
        usbDevices.includes('1008') ||   // ANT USB Stick 2 product ID
        usbDevices.includes('1009')      // ANT USB Stick 3 product ID
      );

      if (hasGarminANT) {
        return {
          granted: true,
          denied: false,
          requiresUserAction: false,
          message: 'ANT+ USB device detected and accessible'
        };
      }

      return {
        granted: false,
        denied: false,
        requiresUserAction: true,
        message: 'No ANT+ USB device detected',
        instructions: [
          'Connect an ANT+ USB stick (Garmin ANT+ USB-m Stick)',
          'Ensure the device is properly recognized by the system',
          'Try a different USB port if the device is not detected'
        ]
      };

    } catch (error) {
      return {
        granted: false,
        denied: false,
        requiresUserAction: true,
        message: 'Could not check USB device status',
        instructions: [
          'Connect ANT+ USB device if you have one',
          'Check USB device detection in System Information'
        ]
      };
    }
  }

  private async checkLinuxUSBPermissions(): Promise<PermissionStatus> {
    try {
      // Check for ANT+ USB devices using lsusb
      const { stdout: usbDevices } = await execAsync('lsusb');
      
      // Look for Garmin ANT+ devices
      const hasGarminANT = usbDevices.includes('0fcf:') && (
        usbDevices.includes('1008') || usbDevices.includes('1009')
      );

      if (hasGarminANT) {
        // Check if user has permission to access the device
        try {
          const { stdout: devicePerms } = await execAsync('ls -la /dev/ttyUSB* 2>/dev/null || ls -la /dev/ttyACM* 2>/dev/null || echo "no_devices"');
          
          if (devicePerms.includes('no_devices')) {
            return {
              granted: false,
              denied: false,
              requiresUserAction: true,
              message: 'ANT+ device detected but no accessible device nodes found',
              instructions: [
                'Add udev rules for ANT+ devices',
                'Add user to dialout group: sudo usermod -a -G dialout $USER',
                'Restart or reconnect the ANT+ device'
              ]
            };
          }

          return {
            granted: true,
            denied: false,
            requiresUserAction: false,
            message: 'ANT+ USB device detected and accessible'
          };
        } catch (permError) {
          return {
            granted: false,
            denied: false,
            requiresUserAction: true,
            message: 'ANT+ device detected but permission check failed',
            instructions: [
              'Add user to dialout group: sudo usermod -a -G dialout $USER',
              'Create udev rule for ANT+ device access'
            ]
          };
        }
      }

      return {
        granted: false,
        denied: false,
        requiresUserAction: false,
        message: 'No ANT+ USB device detected (this is optional)'
      };

    } catch (error) {
      return {
        granted: false,
        denied: false,
        requiresUserAction: true,
        message: 'Could not check Linux USB permissions'
      };
    }
  }

  private async checkWindowsUSBPermissions(): Promise<PermissionStatus> {
    try {
      // Use PowerShell to check for ANT+ USB devices
      const { stdout } = await execAsync('powershell "Get-WmiObject -Class Win32_USBHub | Where-Object {$_.Description -like \'*ANT*\' -or $_.Description -like \'*Garmin*\'} | Select-Object Description"');
      
      if (stdout.includes('ANT') || stdout.includes('Garmin')) {
        return {
          granted: true,
          denied: false,
          requiresUserAction: false,
          message: 'ANT+ USB device detected'
        };
      }

      return {
        granted: false,
        denied: false,
        requiresUserAction: false,
        message: 'No ANT+ USB device detected (this is optional)'
      };

    } catch (error) {
      return {
        granted: false,
        denied: false,
        requiresUserAction: true,
        message: 'Could not check Windows USB status'
      };
    }
  }

  async requestBluetoothPermission(): Promise<PermissionStatus> {
    console.log('📶 Requesting Bluetooth permission...');
    
    // The actual permission request happens when Noble tries to access Bluetooth
    // This method prepares the user and provides guidance
    
    switch (this.platform) {
      case 'darwin':
        return {
          granted: false,
          denied: false,
          requiresUserAction: true,
          message: 'Bluetooth permission will be requested when scanning starts',
          instructions: [
            'Click "Allow" when macOS prompts for Bluetooth access',
            'If no prompt appears, go to System Preferences > Privacy & Security > Bluetooth',
            'Enable Bluetooth access for this application'
          ]
        };
      
      case 'linux':
        const linuxStatus = await this.checkLinuxBluetoothPermissions();
        if (!linuxStatus.granted) {
          return linuxStatus; // Return the existing instructions
        }
        return linuxStatus;
      
      case 'win32':
        return {
          granted: false,
          denied: false,
          requiresUserAction: true,
          message: 'Ensure Bluetooth is enabled in Windows',
          instructions: [
            'Enable Bluetooth in Windows Settings',
            'Grant access if Windows prompts for Bluetooth permission'
          ]
        };
      
      default:
        return {
          granted: false,
          denied: false,
          requiresUserAction: true,
          message: 'Manual Bluetooth setup may be required'
        };
    }
  }

  getPermissionSummary(): string {
    const bluetooth = this.permissions.bluetooth.granted ? '✅' : this.permissions.bluetooth.denied ? '❌' : '⚠️';
    const usb = this.permissions.usb.granted ? '✅' : this.permissions.usb.denied ? '❌' : '⚠️';
    
    return `Permissions: ${bluetooth} Bluetooth, ${usb} USB/ANT+`;
  }

  getDetailedReport(): string[] {
    const report: string[] = [];
    report.push(`🔒 UltiBiker Device Permissions Report (${this.platform})`);
    report.push('');
    
    // Bluetooth permissions
    report.push(`📶 Bluetooth: ${this.permissions.bluetooth.granted ? '✅ Granted' : this.permissions.bluetooth.denied ? '❌ Denied' : '⚠️ Pending'}`);
    report.push(`   ${this.permissions.bluetooth.message}`);
    if (this.permissions.bluetooth.instructions) {
      this.permissions.bluetooth.instructions.forEach(instruction => {
        report.push(`   • ${instruction}`);
      });
    }
    report.push('');
    
    // USB permissions
    report.push(`🔌 USB/ANT+: ${this.permissions.usb.granted ? '✅ Available' : this.permissions.usb.denied ? '❌ Blocked' : '⚠️ Not detected'}`);
    report.push(`   ${this.permissions.usb.message}`);
    if (this.permissions.usb.instructions) {
      this.permissions.usb.instructions.forEach(instruction => {
        report.push(`   • ${instruction}`);
      });
    }
    
    return report;
  }

  async createPermissionGuide(): Promise<string> {
    const permissions = await this.checkAllPermissions();
    const guide: string[] = [];
    
    guide.push('# UltiBiker Device Permission Setup Guide');
    guide.push('');
    guide.push(`**Platform:** ${this.platform} (${process.arch})`);
    guide.push(`**Node.js:** ${process.version}`);
    guide.push('');
    
    // Platform-specific setup
    switch (this.platform) {
      case 'darwin':
        guide.push('## macOS Setup');
        guide.push('');
        guide.push('### Bluetooth Permissions');
        guide.push('1. When UltiBiker first tries to scan for sensors, macOS will show a permission dialog');
        guide.push('2. Click "Allow" to grant Bluetooth access');
        guide.push('3. If you missed the dialog or denied it:');
        guide.push('   - Open System Preferences > Privacy & Security > Bluetooth');
        guide.push('   - Enable the checkbox next to your application');
        guide.push('4. Restart UltiBiker after changing permissions');
        guide.push('');
        guide.push('### ANT+ USB Setup (Optional)');
        guide.push('1. Connect a Garmin ANT+ USB stick');
        guide.push('2. macOS should automatically detect it');
        guide.push('3. No additional permissions needed for USB devices');
        break;
        
      case 'linux':
        guide.push('## Linux Setup');
        guide.push('');
        guide.push('### Bluetooth Setup');
        guide.push('```bash');
        guide.push('# Install BlueZ');
        guide.push('sudo apt-get update');
        guide.push('sudo apt-get install bluez');
        guide.push('');
        guide.push('# Start Bluetooth service');
        guide.push('sudo systemctl start bluetooth');
        guide.push('sudo systemctl enable bluetooth');
        guide.push('');
        guide.push('# Add user to bluetooth group');
        guide.push('sudo usermod -a -G bluetooth $USER');
        guide.push('');
        guide.push('# Log out and log back in');
        guide.push('```');
        guide.push('');
        guide.push('### ANT+ USB Setup (Optional)');
        guide.push('```bash');
        guide.push('# Add user to dialout group for USB access');
        guide.push('sudo usermod -a -G dialout $USER');
        guide.push('');
        guide.push('# Create udev rule for ANT+ devices');
        guide.push('sudo tee /etc/udev/rules.d/99-garmin.rules <<EOF');
        guide.push('SUBSYSTEM=="usb", ATTR{idVendor}=="0fcf", ATTR{idProduct}=="1008", MODE="0666"');
        guide.push('SUBSYSTEM=="usb", ATTR{idVendor}=="0fcf", ATTR{idProduct}=="1009", MODE="0666"');
        guide.push('EOF');
        guide.push('');
        guide.push('sudo udevadm control --reload-rules');
        guide.push('```');
        break;
        
      case 'win32':
        guide.push('## Windows Setup');
        guide.push('');
        guide.push('### Bluetooth Setup');
        guide.push('1. Open Settings > Devices > Bluetooth & other devices');
        guide.push('2. Ensure "Bluetooth" is turned on');
        guide.push('3. Windows may prompt for app permissions when UltiBiker starts');
        guide.push('4. Click "Yes" or "Allow" to grant Bluetooth access');
        guide.push('');
        guide.push('### ANT+ USB Setup (Optional)');
        guide.push('1. Connect Garmin ANT+ USB stick');
        guide.push('2. Windows should automatically install drivers');
        guide.push('3. If not recognized, download drivers from Garmin website');
        break;
    }
    
    guide.push('');
    guide.push('## Current Permission Status');
    guide.push('```');
    this.getDetailedReport().forEach(line => guide.push(line));
    guide.push('```');
    
    return guide.join('\n');
  }
}