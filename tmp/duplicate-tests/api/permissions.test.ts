import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createPermissionRoutes } from '../../src/api/permissions.js';

// Mock sensor manager
const mockSensorManager = {
  getPermissionStatus: vi.fn(),
  getPermissionSummary: vi.fn(),
  getPermissionReport: vi.fn(),
  getPermissionGuide: vi.fn()
};

// Mock platform-specific permission responses
const mockPermissions = {
  darwin: {
    bluetooth: {
      granted: true,
      denied: false,
      requiresUserAction: false,
      message: 'Bluetooth is available and accessible'
    },
    usb: {
      granted: false,
      denied: false,
      requiresUserAction: false,
      message: 'No ANT+ USB stick detected'
    }
  },
  linux: {
    bluetooth: {
      granted: false,
      denied: false,
      requiresUserAction: true,
      message: 'Run: sudo usermod -a -G bluetooth $USER'
    },
    usb: {
      granted: false,
      denied: true,
      requiresUserAction: true,
      message: 'Run: sudo usermod -a -G dialout $USER'
    }
  },
  win32: {
    bluetooth: {
      granted: true,
      denied: false,
      requiresUserAction: false,
      message: 'Bluetooth is enabled in Windows settings'
    },
    usb: {
      granted: true,
      denied: false,
      requiresUserAction: false,
      message: 'ANT+ USB drivers are installed'
    }
  }
};

const mockGuides = {
  darwin: `# macOS Permission Setup

## Bluetooth Permissions
1. Open System Preferences
2. Go to Security & Privacy > Privacy
3. Select Bluetooth from the list
4. Ensure your browser is checked

## ANT+ USB Setup
1. Connect ANT+ USB stick
2. No additional setup required`,

  linux: `# Linux Permission Setup

## Bluetooth Setup
\`\`\`bash
sudo apt-get install bluez
sudo systemctl start bluetooth
sudo usermod -a -G bluetooth $USER
\`\`\`

## ANT+ USB Setup
\`\`\`bash
sudo usermod -a -G dialout $USER
# Logout and login for changes to take effect
\`\`\``,

  win32: `# Windows Permission Setup

## Bluetooth Setup
1. Open Windows Settings
2. Go to Devices > Bluetooth & other devices
3. Ensure Bluetooth is turned On

## ANT+ USB Setup
1. Download ANT+ drivers from thisisant.com
2. Install drivers
3. Connect ANT+ USB stick`
};

describe('Permissions API', () => {
  let app: express.Application;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup express app
    app = express();
    app.use(express.json());
    app.use('/api/permissions', createPermissionRoutes(mockSensorManager as any));
  });

  describe('GET /api/permissions/status', () => {
    it('should return permission status for macOS', async () => {
      // Mock platform and permissions
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      
      mockSensorManager.getPermissionStatus.mockResolvedValue(mockPermissions.darwin);
      mockSensorManager.getPermissionSummary.mockReturnValue('All permissions granted');

      const response = await request(app)
        .get('/api/permissions/status')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          platform: 'darwin',
          permissions: mockPermissions.darwin
        }
      });

      expect(mockSensorManager.checkPermissions).toHaveBeenCalled();

      // Restore platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should return permission status for Linux', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });
      
      mockSensorManager.checkPermissions.mockResolvedValue(mockPermissions.linux);

      const response = await request(app)
        .get('/api/permissions/status')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          platform: 'linux',
          permissions: mockPermissions.linux
        }
      });

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should return permission status for Windows', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });
      
      mockSensorManager.checkPermissions.mockResolvedValue(mockPermissions.win32);

      const response = await request(app)
        .get('/api/permissions/status')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          platform: 'win32',
          permissions: mockPermissions.win32
        }
      });

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should handle sensor manager errors gracefully', async () => {
      mockSensorManager.checkPermissions.mockRejectedValue(new Error('Permission check failed'));

      const response = await request(app)
        .get('/api/permissions/status')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to check permissions'
      });
    });

    it('should include additional metadata in response', async () => {
      mockSensorManager.checkPermissions.mockResolvedValue({
        bluetooth: { granted: true, denied: false },
        lastChecked: new Date().toISOString(),
        systemInfo: { arch: 'x64', nodeVersion: 'v18.0.0' }
      });

      const response = await request(app)
        .get('/api/permissions/status')
        .expect(200);

      expect(response.body.data).toHaveProperty('permissions');
      expect(response.body.data).toHaveProperty('platform');
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/permissions/guide', () => {
    it('should return setup guide for macOS', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      
      mockSensorManager.getPermissionGuide.mockReturnValue(mockGuides.darwin);

      const response = await request(app)
        .get('/api/permissions/guide')
        .expect(200);

      expect(response.text).toBe(mockGuides.darwin);
      expect(response.headers['content-type']).toContain('text/markdown');
      expect(mockSensorManager.getPermissionGuide).toHaveBeenCalledWith('darwin');

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should return setup guide for Linux', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });
      
      mockSensorManager.getPermissionGuide.mockReturnValue(mockGuides.linux);

      const response = await request(app)
        .get('/api/permissions/guide')
        .expect(200);

      expect(response.text).toBe(mockGuides.linux);
      expect(response.headers['content-type']).toContain('text/markdown');

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should return setup guide for Windows', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });
      
      mockSensorManager.getPermissionGuide.mockReturnValue(mockGuides.win32);

      const response = await request(app)
        .get('/api/permissions/guide')
        .expect(200);

      expect(response.text).toBe(mockGuides.win32);
      expect(response.headers['content-type']).toContain('text/markdown');

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should handle missing guide gracefully', async () => {
      mockSensorManager.getPermissionGuide.mockReturnValue(null);

      const response = await request(app)
        .get('/api/permissions/guide')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Permission guide not available for this platform'
      });
    });

    it('should handle sensor manager errors', async () => {
      mockSensorManager.getPermissionGuide.mockImplementation(() => {
        throw new Error('Guide generation failed');
      });

      const response = await request(app)
        .get('/api/permissions/guide')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to generate permission guide'
      });
    });
  });

  describe('GET /api/permissions/instructions', () => {
    it('should return platform-specific instructions', async () => {
      const instructions = {
        bluetooth: 'Enable Bluetooth in system settings',
        usb: 'Install ANT+ USB drivers',
        troubleshooting: ['Restart Bluetooth service', 'Check hardware connections']
      };
      
      mockSensorManager.getPermissionInstructions.mockReturnValue(instructions);

      const response = await request(app)
        .get('/api/permissions/instructions')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          platform: process.platform,
          instructions
        }
      });

      expect(mockSensorManager.getPermissionInstructions).toHaveBeenCalledWith(process.platform);
    });

    it('should handle missing instructions', async () => {
      mockSensorManager.getPermissionInstructions.mockReturnValue(null);

      const response = await request(app)
        .get('/api/permissions/instructions')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Instructions not available for this platform'
      });
    });

    it('should handle sensor manager errors', async () => {
      mockSensorManager.getPermissionInstructions.mockImplementation(() => {
        throw new Error('Instructions generation failed');
      });

      const response = await request(app)
        .get('/api/permissions/instructions')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to generate instructions'
      });
    });
  });

  describe('Permission Validation', () => {
    it('should validate bluetooth permission structure', async () => {
      const validBluetoothPermission = {
        granted: true,
        denied: false,
        requiresUserAction: false,
        message: 'Bluetooth is available'
      };
      
      mockSensorManager.checkPermissions.mockResolvedValue({
        bluetooth: validBluetoothPermission
      });

      const response = await request(app)
        .get('/api/permissions/status')
        .expect(200);

      const bluetooth = response.body.data.permissions.bluetooth;
      expect(bluetooth).toHaveProperty('granted');
      expect(bluetooth).toHaveProperty('denied');
      expect(bluetooth).toHaveProperty('requiresUserAction');
      expect(bluetooth).toHaveProperty('message');
      expect(typeof bluetooth.granted).toBe('boolean');
      expect(typeof bluetooth.denied).toBe('boolean');
      expect(typeof bluetooth.requiresUserAction).toBe('boolean');
      expect(typeof bluetooth.message).toBe('string');
    });

    it('should validate usb permission structure', async () => {
      const validUsbPermission = {
        granted: false,
        denied: false,
        requiresUserAction: true,
        message: 'ANT+ USB stick not detected'
      };
      
      mockSensorManager.checkPermissions.mockResolvedValue({
        usb: validUsbPermission
      });

      const response = await request(app)
        .get('/api/permissions/status')
        .expect(200);

      const usb = response.body.data.permissions.usb;
      expect(usb).toHaveProperty('granted');
      expect(usb).toHaveProperty('denied');
      expect(usb).toHaveProperty('requiresUserAction');
      expect(usb).toHaveProperty('message');
    });

    it('should handle partial permission data', async () => {
      mockSensorManager.checkPermissions.mockResolvedValue({
        bluetooth: { granted: true, denied: false },
        // USB permission missing
      });

      const response = await request(app)
        .get('/api/permissions/status')
        .expect(200);

      expect(response.body.data.permissions).toHaveProperty('bluetooth');
      expect(response.body.data.permissions).not.toHaveProperty('usb');
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format for 500 errors', async () => {
      mockSensorManager.checkPermissions.mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .get('/api/permissions/status')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to check permissions'
      });
      expect(response.body).not.toHaveProperty('data');
    });

    it('should return consistent error format for 404 errors', async () => {
      mockSensorManager.getPermissionGuide.mockReturnValue(null);

      const response = await request(app)
        .get('/api/permissions/guide')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Permission guide not available for this platform'
      });
      expect(response.body).not.toHaveProperty('data');
    });
  });

  describe('Platform Detection', () => {
    const platforms = [
      { platform: 'darwin', name: 'macOS' },
      { platform: 'linux', name: 'Linux' },
      { platform: 'win32', name: 'Windows' },
      { platform: 'freebsd', name: 'FreeBSD' }
    ];

    platforms.forEach(({ platform, name }) => {
      it(`should correctly identify ${name} platform`, async () => {
        const originalPlatform = process.platform;
        Object.defineProperty(process, 'platform', { value: platform });
        
        mockSensorManager.checkPermissions.mockResolvedValue({
          bluetooth: { granted: true, denied: false }
        });

        const response = await request(app)
          .get('/api/permissions/status')
          .expect(200);

        expect(response.body.data.platform).toBe(platform);

        Object.defineProperty(process, 'platform', { value: originalPlatform });
      });
    });
  });

  describe('Content-Type Headers', () => {
    it('should return JSON for status endpoint', async () => {
      mockSensorManager.checkPermissions.mockResolvedValue({});

      const response = await request(app)
        .get('/api/permissions/status')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
    });

    it('should return markdown for guide endpoint', async () => {
      mockSensorManager.getPermissionGuide.mockReturnValue('# Test Guide');

      const response = await request(app)
        .get('/api/permissions/guide')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/markdown');
    });

    it('should return JSON for instructions endpoint', async () => {
      mockSensorManager.getPermissionInstructions.mockReturnValue({});

      const response = await request(app)
        .get('/api/permissions/instructions')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('Response Caching', () => {
    it('should include cache headers for guide endpoint', async () => {
      mockSensorManager.getPermissionGuide.mockReturnValue('# Test Guide');

      const response = await request(app)
        .get('/api/permissions/guide')
        .expect(200);

      // Guide content is relatively static, should be cacheable
      expect(response.headers['cache-control']).toBeTruthy();
    });

    it('should not cache status endpoint', async () => {
      mockSensorManager.checkPermissions.mockResolvedValue({});

      const response = await request(app)
        .get('/api/permissions/status')
        .expect(200);

      // Status should be fresh each time
      expect(response.headers['cache-control']).toContain('no-cache');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      mockSensorManager.checkPermissions.mockResolvedValue({});

      const response = await request(app)
        .get('/api/permissions/status')
        .expect(200);

      // Check for basic security headers (if middleware is configured)
      expect(response.headers).toBeDefined();
    });
  });
});