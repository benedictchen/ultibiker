import { Router, Request, Response } from 'express';
import { UltiBikerSensorManager } from '../sensors/sensor-manager.js';

export function createPermissionRoutes(sensorManager: UltiBikerSensorManager): Router {
  const router = Router();

  // Get current permission status
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const permissions = await sensorManager.getPermissionStatus();
      const summary = sensorManager.getPermissionSummary();
      
      res.json({
        success: true,
        data: {
          permissions,
          summary,
          platform: process.platform,
          nodeVersion: process.version
        }
      });
    } catch (error) {
      console.error('Error getting permission status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get permission status'
      });
    }
  });

  // Get detailed permission report
  router.get('/report', (req: Request, res: Response) => {
    try {
      const report = sensorManager.getPermissionReport();
      
      res.json({
        success: true,
        data: {
          report,
          platform: process.platform
        }
      });
    } catch (error) {
      console.error('Error getting permission report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get permission report'
      });
    }
  });

  // Get setup guide
  router.get('/guide', async (req: Request, res: Response) => {
    try {
      const guide = await sensorManager.getPermissionGuide();
      
      // Return as text/markdown for better readability
      res.set('Content-Type', 'text/markdown');
      res.send(guide);
    } catch (error) {
      console.error('Error getting permission guide:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get permission guide'
      });
    }
  });

  // Get platform-specific instructions
  router.get('/instructions', (req: Request, res: Response) => {
    try {
      const platform = process.platform;
      let instructions: any = {};

      switch (platform) {
        case 'darwin': // macOS
          instructions = {
            platform: 'macOS',
            bluetooth: {
              title: 'Bluetooth Permissions on macOS',
              steps: [
                'When UltiBiker first scans for sensors, macOS will show a permission dialog',
                'Click "Allow" to grant Bluetooth access',
                'If you denied permission or want to check:',
                '  1. Open System Preferences > Privacy & Security > Bluetooth',
                '  2. Ensure UltiBiker is checked',
                '  3. Restart UltiBiker after changing permissions'
              ],
              troubleshooting: [
                'If Bluetooth scanning fails, check System Preferences > Bluetooth',
                'Ensure Bluetooth is enabled',
                'Try restarting Bluetooth: sudo blueutil -p 0 && sudo blueutil -p 1'
              ]
            },
            usb: {
              title: 'ANT+ USB Setup on macOS',
              steps: [
                'Connect a Garmin ANT+ USB stick',
                'macOS should automatically recognize it',
                'No additional permissions needed for USB devices'
              ]
            },
            appleWatch: {
              title: 'Apple Watch Heart Rate Setup',
              description: 'Use your Apple Watch as a heart rate monitor with UltiBiker',
              steps: [
                'Install HeartCast, HRM, or BlueHeart app on Apple Watch',
                'Open the app on your Apple Watch',
                'Start heart rate broadcasting',
                'Keep iPhone nearby during workouts',
                'Start UltiBiker device scan to find Apple Watch'
              ],
              apps: [
                'HeartCast (Free) - Simple and reliable',
                'HRM Heart Rate Monitor - Compatible with most equipment',
                'BlueHeart - Works with popular fitness brands'
              ],
              limitations: [
                'Heart rate data only (no power/cadence from Apple Watch)',
                'Requires iPhone nearby for Bluetooth relay',
                'May drain Apple Watch battery faster'
              ]
            }
          };
          break;

        case 'linux':
          instructions = {
            platform: 'Linux',
            bluetooth: {
              title: 'Bluetooth Setup on Linux',
              steps: [
                'Install BlueZ: sudo apt-get install bluez',
                'Start Bluetooth service: sudo systemctl start bluetooth',
                'Enable on boot: sudo systemctl enable bluetooth',
                'Add user to bluetooth group: sudo usermod -a -G bluetooth $USER',
                'Log out and log back in'
              ]
            },
            usb: {
              title: 'ANT+ USB Setup on Linux',
              steps: [
                'Add user to dialout group: sudo usermod -a -G dialout $USER',
                'Create udev rule for ANT+ devices:',
                'sudo tee /etc/udev/rules.d/99-garmin.rules <<EOF',
                'SUBSYSTEM=="usb", ATTR{idVendor}=="0fcf", ATTR{idProduct}=="1008", MODE="0666"',
                'SUBSYSTEM=="usb", ATTR{idVendor}=="0fcf", ATTR{idProduct}=="1009", MODE="0666"',
                'EOF',
                'sudo udevadm control --reload-rules'
              ]
            }
          };
          break;

        case 'win32':
          instructions = {
            platform: 'Windows',
            bluetooth: {
              title: 'Bluetooth Setup on Windows',
              steps: [
                'Open Settings > Devices > Bluetooth & other devices',
                'Ensure Bluetooth is turned on',
                'Windows may prompt for permissions when UltiBiker starts',
                'Click "Yes" or "Allow" to grant access'
              ]
            },
            usb: {
              title: 'ANT+ USB Setup on Windows',
              steps: [
                'Connect Garmin ANT+ USB stick',
                'Windows should automatically install drivers',
                'If not recognized, download drivers from Garmin website'
              ]
            }
          };
          break;

        default:
          instructions = {
            platform: platform,
            message: 'Platform-specific instructions not available'
          };
      }

      res.json({
        success: true,
        data: instructions
      });
    } catch (error) {
      console.error('Error getting platform instructions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get platform instructions'
      });
    }
  });

  // Request native OS permission for Bluetooth
  router.post('/request-bluetooth', async (req: Request, res: Response) => {
    try {
      console.log('🔒 API request to grant native Bluetooth permission');
      
      // Get permission manager from sensor manager
      const permissionStatus = await sensorManager.getPermissionStatus();
      
      // For now, we'll use the permission manager directly
      // In future, we might need to add a method to sensor manager for this
      const { PermissionManager } = await import('../services/permission-manager.js');
      const permissionManager = new PermissionManager();
      
      const result = await permissionManager.requestNativeBluetoothPermission();
      
      res.json({
        success: true,
        data: {
          permission: result,
          message: result.granted ? 
            'Bluetooth permission granted successfully' : 
            'Bluetooth permission was not granted',
          nextSteps: result.granted ? 
            ['You can now scan for Bluetooth sensors', 'Try clicking "Start Scan" to find devices'] :
            result.instructions
        }
      });
      
    } catch (error) {
      console.error('❌ Error requesting Bluetooth permission:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to request Bluetooth permission',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get Apple Watch setup instructions
  router.get('/apple-watch-setup', async (req: Request, res: Response) => {
    try {
      const { PermissionManager } = await import('../services/permission-manager.js');
      const permissionManager = new PermissionManager();
      
      const instructions = permissionManager.getAppleWatchSetupInstructions();
      
      res.json({
        success: true,
        data: instructions
      });
    } catch (error) {
      console.error('Error getting Apple Watch setup instructions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Apple Watch setup instructions'
      });
    }
  });

  return router;
}