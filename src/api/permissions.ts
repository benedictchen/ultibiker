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

  return router;
}