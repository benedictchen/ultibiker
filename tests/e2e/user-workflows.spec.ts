import { test, expect, Page } from '@playwright/test';
import { MockDataGenerator } from '../utils/test-helpers.js';

// Test user workflows end-to-end
test.describe('UltiBiker User Workflows', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Set up mock data interceptors
    await page.route('/api/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      
      // Mock API responses based on endpoint
      if (url.includes('/api/devices') && method === 'GET') {
        const mockDevices = [
          MockDataGenerator.createHeartRateMonitor(),
          MockDataGenerator.createPowerMeter(),
          MockDataGenerator.createSpeedSensor()
        ];
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: mockDevices,
            count: mockDevices.length
          })
        });
      } else if (url.includes('/api/sessions') && method === 'GET') {
        const mockSessions = [
          MockDataGenerator.createSession(),
          MockDataGenerator.createCompletedSession()
        ];
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: mockSessions,
            count: mockSessions.length
          })
        });
      } else if (url.includes('/api/permissions/status')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              bluetooth: { available: true, reason: 'Ready' },
              ant: { available: true, reason: 'Device detected' },
              platform: 'darwin'
            }
          })
        });
      } else {
        // Continue with the request for unmocked endpoints
        await route.continue();
      }
    });
  });

  test.describe('Initial App Load and Setup', () => {
    test('should load the main dashboard successfully', async () => {
      await page.goto('http://localhost:3000');
      
      // Check main elements are present
      await expect(page.locator('[data-testid="main-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="sensor-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-controls"]')).toBeVisible();
    });

    test('should show permission status on load', async () => {
      await page.goto('http://localhost:3000');
      
      // Wait for permission status to load
      await expect(page.locator('[data-testid="permission-status"]')).toBeVisible();
      
      // Should show permissions are available
      const bluetoothStatus = page.locator('[data-testid="bluetooth-permission"]');
      await expect(bluetoothStatus).toContainText('Ready');
      
      const antStatus = page.locator('[data-testid="ant-permission"]');
      await expect(antStatus).toContainText('Device detected');
    });

    test('should navigate to sensor test page', async () => {
      await page.goto('http://localhost:3000');
      
      // Click on sensor test link
      await page.click('[data-testid="sensor-test-link"]');
      
      // Should navigate to test page
      await expect(page).toHaveURL(/test-sensors\.html/);
      await expect(page.locator('[data-testid="sensor-test-interface"]')).toBeVisible();
    });

    test('should handle no-javascript gracefully', async () => {
      // Disable JavaScript
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'javaEnabled', {
          writable: true,
          value: () => false
        });
      });

      await page.goto('http://localhost:3000');
      
      // Should show fallback content
      await expect(page.locator('[data-testid="no-js-fallback"]')).toBeVisible();
    });
  });

  test.describe('Device Discovery and Connection', () => {
    test('should discover devices when scanning', async () => {
      await page.goto('http://localhost:3000/test-sensors.html');
      
      // Start scanning for devices
      const scanButton = page.locator('[data-testid="start-scan-button"]');
      await expect(scanButton).toBeVisible();
      await scanButton.click();
      
      // Should show scanning indicator
      await expect(page.locator('[data-testid="scanning-indicator"]')).toBeVisible();
      
      // Wait for devices to appear
      await expect(page.locator('[data-testid="discovered-device"]')).toHaveCount(3);
      
      // Check device types are displayed
      await expect(page.locator('[data-device-type="heart_rate"]')).toBeVisible();
      await expect(page.locator('[data-device-type="power"]')).toBeVisible();
      await expect(page.locator('[data-device-type="speed"]')).toBeVisible();
    });

    test('should connect to discovered devices', async () => {
      await page.goto('http://localhost:3000/test-sensors.html');
      
      // Start scanning
      await page.click('[data-testid="start-scan-button"]');
      await expect(page.locator('[data-testid="discovered-device"]')).toHaveCount(3);
      
      // Connect to heart rate monitor
      const hrDevice = page.locator('[data-device-type="heart_rate"]');
      const connectButton = hrDevice.locator('[data-testid="connect-button"]');
      await connectButton.click();
      
      // Should show connection in progress
      await expect(hrDevice.locator('[data-testid="connecting-indicator"]')).toBeVisible();
      
      // Mock successful connection
      await page.route('/api/devices/connect', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });
      
      // Should show connected status
      await expect(hrDevice.locator('[data-testid="connected-indicator"]')).toBeVisible();
      await expect(connectButton).toHaveText('Disconnect');
    });

    test('should handle connection errors gracefully', async () => {
      await page.goto('http://localhost:3000/test-sensors.html');
      
      // Mock connection failure
      await page.route('/api/devices/connect', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ 
            success: false, 
            error: 'Device not found' 
          })
        });
      });
      
      await page.click('[data-testid="start-scan-button"]');
      await expect(page.locator('[data-testid="discovered-device"]')).toHaveCount(3);
      
      // Try to connect to device
      const device = page.locator('[data-testid="discovered-device"]').first();
      await device.locator('[data-testid="connect-button"]').click();
      
      // Should show error message
      await expect(page.locator('[data-testid="connection-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="connection-error"]')).toContainText('Device not found');
    });

    test('should show device signal strength and battery', async () => {
      await page.goto('http://localhost:3000/test-sensors.html');
      
      await page.click('[data-testid="start-scan-button"]');
      await expect(page.locator('[data-testid="discovered-device"]')).toHaveCount(3);
      
      // Check signal strength indicators
      const devices = page.locator('[data-testid="discovered-device"]');
      for (let i = 0; i < 3; i++) {
        const device = devices.nth(i);
        await expect(device.locator('[data-testid="signal-strength"]')).toBeVisible();
        await expect(device.locator('[data-testid="battery-level"]')).toBeVisible();
      }
    });

    test('should update device list in real-time', async () => {
      await page.goto('http://localhost:3000/test-sensors.html');
      
      // Start with no devices
      await expect(page.locator('[data-testid="discovered-device"]')).toHaveCount(0);
      
      await page.click('[data-testid="start-scan-button"]');
      
      // Devices should appear progressively
      await expect(page.locator('[data-testid="discovered-device"]')).toHaveCount(1);
      
      // Wait for more devices
      await page.waitForTimeout(1000);
      await expect(page.locator('[data-testid="discovered-device"]')).toHaveCount(3);
    });
  });

  test.describe('Session Management', () => {
    test('should start a new cycling session', async () => {
      await page.goto('http://localhost:3000');
      
      // Click start session button
      const startButton = page.locator('[data-testid="start-session-button"]');
      await expect(startButton).toBeVisible();
      await startButton.click();
      
      // Should show session name dialog
      await expect(page.locator('[data-testid="session-name-dialog"]')).toBeVisible();
      
      // Enter session name
      await page.fill('[data-testid="session-name-input"]', 'Morning Training Ride');
      await page.click('[data-testid="confirm-start-button"]');
      
      // Mock session creation
      await page.route('/api/sessions', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: MockDataGenerator.createSession({
                name: 'Morning Training Ride'
              })
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // Should show active session
      await expect(page.locator('[data-testid="active-session"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-name"]')).toContainText('Morning Training Ride');
      await expect(page.locator('[data-testid="session-timer"]')).toBeVisible();
    });

    test('should pause and resume session', async () => {
      await page.goto('http://localhost:3000');
      
      // Start session first
      await page.click('[data-testid="start-session-button"]');
      await page.fill('[data-testid="session-name-input"]', 'Test Session');
      await page.click('[data-testid="confirm-start-button"]');
      
      await expect(page.locator('[data-testid="active-session"]')).toBeVisible();
      
      // Pause session
      const pauseButton = page.locator('[data-testid="pause-session-button"]');
      await pauseButton.click();
      
      // Should show paused state
      await expect(page.locator('[data-testid="session-status"]')).toContainText('Paused');
      await expect(page.locator('[data-testid="resume-session-button"]')).toBeVisible();
      
      // Resume session
      await page.click('[data-testid="resume-session-button"]');
      
      // Should show active state again
      await expect(page.locator('[data-testid="session-status"]')).toContainText('Active');
      await expect(pauseButton).toBeVisible();
    });

    test('should end session with summary', async () => {
      await page.goto('http://localhost:3000');
      
      // Start and then end session
      await page.click('[data-testid="start-session-button"]');
      await page.fill('[data-testid="session-name-input"]', 'Test Session');
      await page.click('[data-testid="confirm-start-button"]');
      
      await expect(page.locator('[data-testid="active-session"]')).toBeVisible();
      
      // End session
      await page.click('[data-testid="end-session-button"]');
      
      // Should show confirmation dialog
      await expect(page.locator('[data-testid="end-session-dialog"]')).toBeVisible();
      await page.click('[data-testid="confirm-end-button"]');
      
      // Mock session ending with summary
      await page.route('/api/sessions/*/end', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: MockDataGenerator.createCompletedSession({
              avgHeartRate: 165,
              avgPower: 225,
              distance: 25.5,
              duration: 3600
            })
          })
        });
      });
      
      // Should show session summary
      await expect(page.locator('[data-testid="session-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="avg-heart-rate"]')).toContainText('165');
      await expect(page.locator('[data-testid="avg-power"]')).toContainText('225');
      await expect(page.locator('[data-testid="distance"]')).toContainText('25.5');
    });

    test('should view session history', async () => {
      await page.goto('http://localhost:3000');
      
      // Navigate to sessions page
      await page.click('[data-testid="sessions-nav-link"]');
      
      // Should show sessions list
      await expect(page.locator('[data-testid="sessions-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-item"]')).toHaveCount(2);
      
      // Check session details are displayed
      const sessionItem = page.locator('[data-testid="session-item"]').first();
      await expect(sessionItem.locator('[data-testid="session-name"]')).toBeVisible();
      await expect(sessionItem.locator('[data-testid="session-date"]')).toBeVisible();
      await expect(sessionItem.locator('[data-testid="session-duration"]')).toBeVisible();
    });

    test('should view detailed session data', async () => {
      await page.goto('http://localhost:3000');
      
      await page.click('[data-testid="sessions-nav-link"]');
      await expect(page.locator('[data-testid="sessions-list"]')).toBeVisible();
      
      // Click on first session
      const sessionItem = page.locator('[data-testid="session-item"]').first();
      await sessionItem.click();
      
      // Should show detailed session view
      await expect(page.locator('[data-testid="session-detail"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="sensor-data-table"]')).toBeVisible();
    });
  });

  test.describe('Real-time Data Display', () => {
    test('should display live sensor data', async () => {
      await page.goto('http://localhost:3000');
      
      // Should show metric cards
      await expect(page.locator('[data-testid="heart-rate-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="power-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="speed-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="cadence-card"]')).toBeVisible();
      
      // Mock WebSocket connection for live data
      await page.addInitScript(() => {
        // Mock WebSocket for testing
        const originalWebSocket = window.WebSocket;
        window.WebSocket = class MockWebSocket extends EventTarget {
          constructor(url) {
            super();
            this.url = url;
            this.readyState = 1; // OPEN
            
            // Simulate connection
            setTimeout(() => {
              this.dispatchEvent(new Event('open'));
              
              // Simulate sensor data
              setInterval(() => {
                const mockData = {
                  type: 'sensor_data',
                  data: {
                    deviceId: 'test-hr-monitor',
                    metricType: 'heart_rate',
                    value: 160 + Math.random() * 20,
                    unit: 'bpm',
                    timestamp: new Date().toISOString()
                  }
                };
                
                const event = new MessageEvent('message', {
                  data: JSON.stringify(mockData)
                });
                this.dispatchEvent(event);
              }, 1000);
            }, 100);
          }
          
          send(data) {
            // Mock send method
          }
          
          close() {
            this.readyState = 3; // CLOSED
          }
        };
      });
      
      // Wait for WebSocket connection and data
      await page.waitForTimeout(2000);
      
      // Check that live data is displayed
      const heartRateValue = page.locator('[data-testid="heart-rate-value"]');
      await expect(heartRateValue).not.toBeEmpty();
      
      // Value should update (wait for another update)
      const initialValue = await heartRateValue.textContent();
      await page.waitForTimeout(2000);
      const updatedValue = await heartRateValue.textContent();
      
      // Values should be different (live updating)
      expect(initialValue).not.toBe(updatedValue);
    });

    test('should display real-time charts', async () => {
      await page.goto('http://localhost:3000');
      
      // Should show chart containers
      await expect(page.locator('[data-testid="heart-rate-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="power-chart"]')).toBeVisible();
      
      // Charts should have data points (canvas elements)
      const heartRateCanvas = page.locator('[data-testid="heart-rate-chart"] canvas');
      await expect(heartRateCanvas).toBeVisible();
      
      // Wait for chart to render with data
      await page.waitForTimeout(3000);
      
      // Canvas should have content (not empty)
      const canvasImage = await heartRateCanvas.screenshot();
      expect(canvasImage).toBeTruthy();
    });

    test('should handle connection loss gracefully', async () => {
      await page.goto('http://localhost:3000');
      
      // Wait for initial connection
      await page.waitForTimeout(1000);
      
      // Simulate connection loss
      await page.addInitScript(() => {
        // Find WebSocket instance and close it
        if (window.ws) {
          window.ws.close();
        }
      });
      
      // Should show disconnected indicator
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Disconnected');
      await expect(page.locator('[data-testid="reconnect-button"]')).toBeVisible();
    });

    test('should show data quality indicators', async () => {
      await page.goto('http://localhost:3000');
      
      // Wait for data to load
      await page.waitForTimeout(2000);
      
      // Should show quality indicators for each metric
      await expect(page.locator('[data-testid="heart-rate-quality"]')).toBeVisible();
      await expect(page.locator('[data-testid="power-quality"]')).toBeVisible();
      
      // Quality should be displayed as percentage or icon
      const heartRateQuality = page.locator('[data-testid="heart-rate-quality"]');
      const qualityText = await heartRateQuality.textContent();
      expect(qualityText).toMatch(/(Good|Fair|Poor|\d+%)/);
    });
  });

  test.describe('Data Export and Analysis', () => {
    test('should export session data', async () => {
      await page.goto('http://localhost:3000');
      
      // Go to sessions page
      await page.click('[data-testid="sessions-nav-link"]');
      await expect(page.locator('[data-testid="sessions-list"]')).toBeVisible();
      
      // Click on first session
      await page.locator('[data-testid="session-item"]').first().click();
      await expect(page.locator('[data-testid="session-detail"]')).toBeVisible();
      
      // Click export button
      await page.click('[data-testid="export-button"]');
      
      // Should show export options
      await expect(page.locator('[data-testid="export-dialog"]')).toBeVisible();
      await expect(page.locator('[data-testid="format-json"]')).toBeVisible();
      await expect(page.locator('[data-testid="format-csv"]')).toBeVisible();
      await expect(page.locator('[data-testid="format-tcx"]')).toBeVisible();
      
      // Select CSV format and export
      await page.click('[data-testid="format-csv"]');
      
      // Mock export API
      await page.route('/api/data/export', async (route) => {
        await route.fulfill({
          status: 200,
          headers: {
            'content-type': 'text/csv',
            'content-disposition': 'attachment; filename=session-data.csv'
          },
          body: 'timestamp,deviceId,metricType,value,unit\n2025-01-01T10:00:00Z,hr-001,heart_rate,165,bpm'
        });
      });
      
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="confirm-export-button"]')
      ]);
      
      expect(download.suggestedFilename()).toBe('session-data.csv');
    });

    test('should analyze session performance', async () => {
      await page.goto('http://localhost:3000');
      
      await page.click('[data-testid="sessions-nav-link"]');
      await page.locator('[data-testid="session-item"]').first().click();
      
      // Should show analysis tab
      await page.click('[data-testid="analysis-tab"]');
      
      // Should display performance metrics
      await expect(page.locator('[data-testid="performance-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="heart-rate-zones"]')).toBeVisible();
      await expect(page.locator('[data-testid="power-zones"]')).toBeVisible();
      
      // Should show zone distribution chart
      await expect(page.locator('[data-testid="zone-distribution-chart"]')).toBeVisible();
      
      // Should display key metrics
      await expect(page.locator('[data-testid="avg-heart-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="max-heart-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="avg-power"]')).toBeVisible();
      await expect(page.locator('[data-testid="normalized-power"]')).toBeVisible();
    });

    test('should compare multiple sessions', async () => {
      await page.goto('http://localhost:3000');
      
      await page.click('[data-testid="sessions-nav-link"]');
      
      // Enable comparison mode
      await page.click('[data-testid="compare-mode-toggle"]');
      
      // Select multiple sessions
      await page.click('[data-testid="session-checkbox"]');
      await page.locator('[data-testid="session-checkbox"]').nth(1).click();
      
      // Click compare button
      await page.click('[data-testid="compare-sessions-button"]');
      
      // Should show comparison view
      await expect(page.locator('[data-testid="session-comparison"]')).toBeVisible();
      await expect(page.locator('[data-testid="comparison-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="comparison-table"]')).toBeVisible();
      
      // Should show side-by-side metrics
      await expect(page.locator('[data-testid="session-1-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-2-metrics"]')).toBeVisible();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle API errors gracefully', async () => {
      // Mock API errors
      await page.route('/api/**', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error'
          })
        });
      });
      
      await page.goto('http://localhost:3000');
      
      // Should show error message
      await expect(page.locator('[data-testid="api-error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('should handle offline mode', async () => {
      await page.goto('http://localhost:3000');
      
      // Go offline
      await page.context().setOffline(true);
      
      // Try to perform an action that requires network
      await page.click('[data-testid="start-scan-button"]');
      
      // Should show offline indicator
      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
      await expect(page.locator('[data-testid="offline-message"]')).toContainText('offline');
    });

    test('should handle slow network conditions', async () => {
      // Simulate slow network
      await page.route('/api/**', async (route) => {
        // Add 3 second delay
        await new Promise(resolve => setTimeout(resolve, 3000));
        await route.continue();
      });
      
      await page.goto('http://localhost:3000');
      
      // Should show loading indicators
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      
      // Content should eventually load
      await expect(page.locator('[data-testid="main-dashboard"]')).toBeVisible({ timeout: 10000 });
    });

    test('should handle large datasets efficiently', async () => {
      // Mock large dataset
      await page.route('/api/data/session/*', async (route) => {
        const largeDataset = {
          success: true,
          data: {
            session: MockDataGenerator.createCompletedSession(),
            readings: Array.from({ length: 10000 }, () => 
              MockDataGenerator.createSensorReading()
            )
          }
        };
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(largeDataset)
        });
      });
      
      await page.goto('http://localhost:3000');
      await page.click('[data-testid="sessions-nav-link"]');
      await page.locator('[data-testid="session-item"]').first().click();
      
      // Should handle large dataset without freezing
      await expect(page.locator('[data-testid="session-detail"]')).toBeVisible();
      
      // Chart should render (may take some time)
      await expect(page.locator('[data-testid="session-chart"]')).toBeVisible({ timeout: 10000 });
    });

    test('should validate user inputs', async () => {
      await page.goto('http://localhost:3000');
      
      // Try to start session with invalid name
      await page.click('[data-testid="start-session-button"]');
      
      // Enter very long name
      const longName = 'a'.repeat(256);
      await page.fill('[data-testid="session-name-input"]', longName);
      await page.click('[data-testid="confirm-start-button"]');
      
      // Should show validation error
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="validation-error"]')).toContainText('too long');
    });

    test('should handle browser compatibility issues', async () => {
      // Mock older browser without WebSocket support
      await page.addInitScript(() => {
        delete window.WebSocket;
      });
      
      await page.goto('http://localhost:3000');
      
      // Should show compatibility warning
      await expect(page.locator('[data-testid="browser-compatibility-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="fallback-mode"]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async () => {
      await page.goto('http://localhost:3000');
      
      // Tab through main interface elements
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="start-session-button"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="start-scan-button"]')).toBeFocused();
      
      // Should be able to activate buttons with keyboard
      await page.keyboard.press('Enter');
      
      // Should show scanning state
      await expect(page.locator('[data-testid="scanning-indicator"]')).toBeVisible();
    });

    test('should have proper ARIA labels', async () => {
      await page.goto('http://localhost:3000');
      
      // Check important elements have ARIA labels
      const startButton = page.locator('[data-testid="start-session-button"]');
      await expect(startButton).toHaveAttribute('aria-label');
      
      const heartRateCard = page.locator('[data-testid="heart-rate-card"]');
      await expect(heartRateCard).toHaveAttribute('aria-label');
      
      // Check form elements have labels
      await page.click('[data-testid="start-session-button"]');
      const nameInput = page.locator('[data-testid="session-name-input"]');
      await expect(nameInput).toHaveAttribute('aria-label');
    });

    test('should work with screen readers', async () => {
      await page.goto('http://localhost:3000');
      
      // Check for screen reader announcements
      const announcements = page.locator('[aria-live]');
      await expect(announcements).toHaveCount.greaterThan(0);
      
      // Status updates should be announced
      await page.click('[data-testid="start-scan-button"]');
      
      // Should have announcement region for scan status
      await expect(page.locator('[aria-live="polite"]')).toContainText('Scanning');
    });

    test('should support high contrast mode', async () => {
      await page.goto('http://localhost:3000');
      
      // Simulate high contrast mode
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            .metric-card { 
              border: 2px solid white !important; 
              background: black !important; 
              color: white !important; 
            }
          }
        `
      });
      
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
      
      // Elements should still be visible and usable
      await expect(page.locator('[data-testid="heart-rate-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="start-session-button"]')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load quickly', async () => {
      const startTime = Date.now();
      
      await page.goto('http://localhost:3000');
      await expect(page.locator('[data-testid="main-dashboard"]')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Should load in under 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle real-time updates efficiently', async () => {
      await page.goto('http://localhost:3000');
      
      // Monitor performance during high-frequency updates
      const performanceEntries = [];
      
      page.on('console', msg => {
        if (msg.text().includes('performance')) {
          performanceEntries.push(msg.text());
        }
      });
      
      // Simulate high-frequency sensor data
      await page.addInitScript(() => {
        let updateCount = 0;
        const startTime = performance.now();
        
        const interval = setInterval(() => {
          updateCount++;
          
          // Simulate DOM updates
          const element = document.querySelector('[data-testid="heart-rate-value"]');
          if (element) {
            element.textContent = (160 + Math.random() * 20).toFixed(0);
          }
          
          if (updateCount >= 100) {
            const endTime = performance.now();
            console.log(`performance: 100 updates in ${endTime - startTime}ms`);
            clearInterval(interval);
          }
        }, 100);
      });
      
      // Wait for performance test to complete
      await page.waitForTimeout(12000);
      
      // Should complete updates in reasonable time
      expect(performanceEntries.length).toBeGreaterThan(0);
    });
  });
});