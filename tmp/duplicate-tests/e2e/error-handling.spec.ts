import { test, expect, Page } from '@playwright/test';

test.describe('UltiBiker Error Handling - E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Navigate to the main dashboard
    await page.goto('http://localhost:3000');
    
    // Wait for the page to load and connect to WebSocket
    await expect(page.locator('#connectionStatus')).toContainText('Connected', { timeout: 10000 });
    
    // Wait for error handler to initialize
    await page.waitForTimeout(1000);
  });

  test.describe('Error Dialog Functionality', () => {
    test('should show error dialog when connection fails', async () => {
      // Simulate server disconnection by stopping the WebSocket
      await page.evaluate(() => {
        window.socket.disconnect();
      });

      // Wait for disconnect detection
      await page.waitForTimeout(1000);

      // Check if error dialog appears
      await expect(page.locator('#errorOverlay')).toHaveClass(/show/);
      await expect(page.locator('#errorTitle')).toContainText('Connection Error');
      await expect(page.locator('#errorMessage')).toContainText('Unable to connect to the UltiBiker server');
      
      // Check if retry and reload buttons are visible
      await expect(page.locator('#errorRetryBtn')).toBeVisible();
      await expect(page.locator('#errorReloadBtn')).toBeVisible();
    });

    test('should close error dialog when clicking OK button', async () => {
      // Trigger an error dialog by simulating a JavaScript error
      await page.evaluate(() => {
        window.dispatchEvent(new ErrorEvent('error', {
          message: 'Test error',
          filename: 'test.js',
          lineno: 1,
          colno: 1
        }));
      });

      // Wait for error dialog to appear
      await expect(page.locator('#errorOverlay')).toHaveClass(/show/);

      // Click OK button
      await page.click('#errorOkBtn');

      // Wait for dialog to close
      await expect(page.locator('#errorOverlay')).not.toHaveClass(/show/);
    });

    test('should close error dialog when clicking close button', async () => {
      // Trigger error dialog
      await page.evaluate(() => {
        window.errorHandler.showErrorDialog({
          title: 'Test Error',
          message: 'This is a test error'
        });
      });

      await expect(page.locator('#errorOverlay')).toHaveClass(/show/);

      // Click close button
      await page.click('#errorCloseBtn');

      await expect(page.locator('#errorOverlay')).not.toHaveClass(/show/);
    });

    test('should close error dialog when pressing Escape key', async () => {
      // Trigger error dialog
      await page.evaluate(() => {
        window.errorHandler.showErrorDialog({
          title: 'Test Error',
          message: 'This is a test error'
        });
      });

      await expect(page.locator('#errorOverlay')).toHaveClass(/show/);

      // Press Escape key
      await page.keyboard.press('Escape');

      await expect(page.locator('#errorOverlay')).not.toHaveClass(/show/);
    });

    test('should toggle technical details visibility', async () => {
      // Show error dialog with details
      await page.evaluate(() => {
        window.errorHandler.showErrorDialog({
          title: 'Test Error',
          message: 'Error with details',
          details: 'Stack trace: Error at line 123\\nCaused by: Network timeout'
        });
      });

      await expect(page.locator('#errorOverlay')).toHaveClass(/show/);
      await expect(page.locator('#errorToggleDetails')).toBeVisible();
      await expect(page.locator('#errorDetails')).not.toHaveClass(/show/);

      // Click to show details
      await page.click('#errorToggleDetails');

      await expect(page.locator('#errorDetails')).toHaveClass(/show/);
      await expect(page.locator('#errorToggleDetails')).toContainText('Hide technical details');

      // Click to hide details
      await page.click('#errorToggleDetails');

      await expect(page.locator('#errorDetails')).not.toHaveClass(/show/);
      await expect(page.locator('#errorToggleDetails')).toContainText('Show technical details');
    });

    test('should execute retry action when retry button is clicked', async () => {
      // Set up a mock retry action
      await page.evaluate(() => {
        window.testRetryExecuted = false;
        window.errorHandler.showErrorDialog({
          title: 'Retryable Error',
          message: 'Click retry to test',
          showRetry: true,
          retryAction: () => {
            window.testRetryExecuted = true;
          }
        });
      });

      await expect(page.locator('#errorOverlay')).toHaveClass(/show/);
      await expect(page.locator('#errorRetryBtn')).toBeVisible();

      // Click retry button
      await page.click('#errorRetryBtn');

      // Check that retry action was executed and dialog was closed
      const retryExecuted = await page.evaluate(() => window.testRetryExecuted);
      expect(retryExecuted).toBe(true);
      
      await expect(page.locator('#errorOverlay')).not.toHaveClass(/show/);
    });

    test('should handle different error types with appropriate icons', async () => {
      const errorTypes = [
        { type: 'error', expectedIcon: 'exclamation-triangle' },
        { type: 'warning', expectedIcon: 'exclamation-circle' },
        { type: 'info', expectedIcon: 'info-circle' },
        { type: 'success', expectedIcon: 'check-circle' }
      ];

      for (const { type, expectedIcon } of errorTypes) {
        await page.evaluate((errorType) => {
          window.errorHandler.showErrorDialog({
            type: errorType,
            title: `${errorType} Test`,
            message: `This is a ${errorType} message`
          });
        }, type);

        await expect(page.locator('#errorOverlay')).toHaveClass(/show/);
        await expect(page.locator('#errorIcon')).toHaveClass(new RegExp(type));
        await expect(page.locator('#errorIcon i')).toHaveClass(new RegExp(expectedIcon));
        await expect(page.locator('#errorTitle')).toContainText(`${type} Test`);

        // Close dialog for next iteration
        await page.click('#errorOkBtn');
        await expect(page.locator('#errorOverlay')).not.toHaveClass(/show/);
      }
    });
  });

  test.describe('Toast Notifications', () => {
    test('should show toast notifications for different types', async () => {
      const toastTypes = ['success', 'error', 'warning', 'info'];

      for (const type of toastTypes) {
        await page.evaluate((toastType) => {
          window.errorHandler.showToast(`${toastType} message`, toastType);
        }, type);

        // Check that toast appears
        const toast = page.locator(`.toast.${type}`).last();
        await expect(toast).toBeVisible();
        await expect(toast).toContainText(`${type} message`);

        // Wait for toast animation
        await page.waitForTimeout(200);
      }

      // Check that all toasts are visible
      for (const type of toastTypes) {
        await expect(page.locator(`.toast.${type}`)).toBeVisible();
      }
    });

    test('should auto-dismiss toast after duration', async () => {
      await page.evaluate(() => {
        window.errorHandler.showToast('Auto-dismiss test', 'info', null, 1000);
      });

      const toast = page.locator('.toast.info').last();
      await expect(toast).toBeVisible();

      // Wait for auto-dismiss
      await page.waitForTimeout(1500);

      // Toast should be removed or hidden
      await expect(toast).not.toBeVisible();
    });

    test('should manually close toast when close button is clicked', async () => {
      await page.evaluate(() => {
        const toastId = window.errorHandler.showToast('Manual close test', 'info', null, 0);
        window.testToastId = toastId;
      });

      const toast = page.locator('.toast.info').last();
      await expect(toast).toBeVisible();

      // Click close button
      await toast.locator('.toast-close').click();

      // Toast should be removed
      await expect(toast).not.toBeVisible();
    });

    test('should show toast with description', async () => {
      await page.evaluate(() => {
        window.errorHandler.showToast('Main message', 'info', 'Additional description text');
      });

      const toast = page.locator('.toast.info').last();
      await expect(toast).toBeVisible();
      await expect(toast.locator('.toast-message')).toContainText('Main message');
      await expect(toast.locator('.toast-description')).toContainText('Additional description text');
    });

    test('should stack multiple toasts vertically', async () => {
      // Create multiple toasts
      await page.evaluate(() => {
        window.errorHandler.showToast('Toast 1', 'info');
        window.errorHandler.showToast('Toast 2', 'success');
        window.errorHandler.showToast('Toast 3', 'warning');
      });

      // Check that all toasts are visible
      await expect(page.locator('.toast')).toHaveCount(3);

      // Check vertical stacking (toasts should have different vertical positions)
      const toasts = await page.locator('.toast').all();
      expect(toasts.length).toBe(3);

      for (const toast of toasts) {
        await expect(toast).toBeVisible();
      }
    });
  });

  test.describe('Sensor Error Handling', () => {
    test('should show permission error when scanning without permissions', async () => {
      // Mock permission denied scenario
      await page.evaluate(() => {
        // Override navigator.bluetooth to simulate permission denied
        Object.defineProperty(navigator, 'bluetooth', {
          value: {
            requestDevice: () => Promise.reject(new DOMException('User cancelled', 'NotAllowedError'))
          },
          configurable: true
        });
      });

      // Try to start scanning
      await page.click('#scanBtn');

      // Should show permission error
      await page.waitForTimeout(2000);
      
      // Check for permission-related error (either dialog or toast)
      const hasErrorDialog = await page.locator('#errorOverlay').isVisible();
      const hasPermissionToast = await page.locator('.toast.error, .toast.warning').isVisible();
      
      expect(hasErrorDialog || hasPermissionToast).toBe(true);
    });

    test('should show error when server scan fails', async () => {
      // Mock server scan failure
      await page.evaluate(() => {
        const originalEmit = window.socket.emit;
        window.socket.emit = function(event, ...args) {
          if (event === 'start-scanning') {
            const callback = args[args.length - 1];
            if (typeof callback === 'function') {
              callback({ success: false, error: 'Scan initialization failed' });
            }
          } else {
            return originalEmit.apply(this, [event, ...args]);
          }
        };
      });

      // Try to start scanning
      await page.click('#scanBtn');

      // Wait for error response
      await page.waitForTimeout(1000);

      // Should show error dialog
      await expect(page.locator('#errorOverlay')).toHaveClass(/show/);
      await expect(page.locator('#errorTitle')).toContainText('Scan Failed');
      await expect(page.locator('#errorMessage')).toContainText('Unable to start device scanning');
    });

    test('should show error when device connection fails', async () => {
      // First, let's simulate having discovered devices
      await page.evaluate(() => {
        window.dashboard.discoveredDevices.set('test-device', {
          deviceId: 'test-device',
          name: 'Test Heart Rate Monitor',
          type: 'heart_rate',
          protocol: 'bluetooth'
        });
        window.dashboard.updateDiscoveredDevices();
      });

      await page.waitForTimeout(500);

      // Mock device connection failure
      await page.evaluate(() => {
        const originalEmit = window.socket.emit;
        window.socket.emit = function(event, ...args) {
          if (event === 'connect-device') {
            const callback = args[args.length - 1];
            if (typeof callback === 'function') {
              callback({ success: false, error: 'Device connection timeout' });
            }
          } else {
            return originalEmit.apply(this, [event, ...args]);
          }
        };
      });

      // Try to connect to device
      await page.evaluate(() => {
        window.dashboard.connectDevice('test-device');
      });

      // Wait for error response
      await page.waitForTimeout(1000);

      // Should show error dialog
      await expect(page.locator('#errorOverlay')).toHaveClass(/show/);
      await expect(page.locator('#errorTitle')).toContainText('Device Connection Failed');
      await expect(page.locator('#errorMessage')).toContainText('Unable to connect to Test Heart Rate Monitor');
    });
  });

  test.describe('Session Error Handling', () => {
    test('should show error when session start fails', async () => {
      // Mock session start failure
      await page.evaluate(() => {
        const originalEmit = window.socket.emit;
        window.socket.emit = function(event, ...args) {
          if (event === 'start-session') {
            const callback = args[args.length - 1];
            if (typeof callback === 'function') {
              callback({ success: false, error: 'Database connection failed' });
            }
          } else {
            return originalEmit.apply(this, [event, ...args]);
          }
        };
      });

      // Switch to data tab first
      await page.click('#data-tab');
      await page.waitForTimeout(500);

      // Handle session name prompt and start session
      page.on('dialog', async dialog => {
        await dialog.accept('Test Session');
      });

      await page.click('#startSessionBtn');

      // Wait for error response
      await page.waitForTimeout(1000);

      // Should show error dialog
      await expect(page.locator('#errorOverlay')).toHaveClass(/show/);
      await expect(page.locator('#errorTitle')).toContainText('Session Start Failed');
      await expect(page.locator('#errorMessage')).toContainText('Unable to start the workout session');
    });
  });

  test.describe('Global Error Handling', () => {
    test('should catch and handle JavaScript runtime errors', async () => {
      // Trigger a JavaScript error
      await page.evaluate(() => {
        // This will trigger a global error handler
        throw new Error('Intentional test error');
      });

      await page.waitForTimeout(1000);

      // Should show error dialog
      await expect(page.locator('#errorOverlay')).toHaveClass(/show/);
      await expect(page.locator('#errorTitle')).toContainText('JavaScript Error');
      await expect(page.locator('#errorMessage')).toContainText('Intentional test error');
    });

    test('should handle unhandled promise rejections', async () => {
      // Trigger an unhandled promise rejection
      await page.evaluate(() => {
        Promise.reject(new Error('Unhandled promise rejection test'));
      });

      await page.waitForTimeout(1000);

      // Should show error dialog
      await expect(page.locator('#errorOverlay')).toHaveClass(/show/);
      await expect(page.locator('#errorTitle')).toContainText('Unhandled Promise Rejection');
      await expect(page.locator('#errorMessage')).toContainText('An unexpected error occurred');
    });
  });

  test.describe('Error Recovery', () => {
    test('should allow retry after connection error', async () => {
      // Simulate connection error
      await page.evaluate(() => {
        window.socket.disconnect();
      });

      await page.waitForTimeout(1000);
      await expect(page.locator('#errorOverlay')).toHaveClass(/show/);

      // Set up mock for successful reconnection
      await page.evaluate(() => {
        window.testReconnectAttempted = false;
        const originalReload = window.location.reload;
        window.location.reload = () => {
          window.testReconnectAttempted = true;
        };
      });

      // Click retry button
      await page.click('#errorRetryBtn');

      // Should attempt to reconnect
      const reconnectAttempted = await page.evaluate(() => window.testReconnectAttempted);
      expect(reconnectAttempted).toBe(true);
    });

    test('should reload page when reload button is clicked', async () => {
      await page.evaluate(() => {
        window.errorHandler.showErrorDialog({
          title: 'Test Error',
          message: 'Error requiring reload',
          showReload: true
        });

        window.testReloadAttempted = false;
        const originalReload = window.location.reload;
        window.location.reload = () => {
          window.testReloadAttempted = true;
        };
      });

      await expect(page.locator('#errorOverlay')).toHaveClass(/show/);

      // Click reload button
      await page.click('#errorReloadBtn');

      const reloadAttempted = await page.evaluate(() => window.testReloadAttempted);
      expect(reloadAttempted).toBe(true);
    });
  });

  test.describe('Error Accessibility', () => {
    test('should have proper ARIA attributes on error dialog', async () => {
      await page.evaluate(() => {
        window.errorHandler.showErrorDialog({
          title: 'Accessibility Test',
          message: 'Testing accessibility features'
        });
      });

      const overlay = page.locator('#errorOverlay');
      await expect(overlay).toHaveClass(/show/);

      // Check for accessibility attributes
      const dialog = page.locator('.error-dialog');
      await expect(dialog).toBeVisible();

      // Dialog should be focusable
      await page.keyboard.press('Tab');
      
      // Should be able to navigate through dialog elements
      await expect(page.locator('#errorCloseBtn')).toBeFocused();
    });

    test('should trap focus within error dialog', async () => {
      await page.evaluate(() => {
        window.errorHandler.showErrorDialog({
          title: 'Focus Test',
          message: 'Testing focus management',
          showRetry: true,
          showReload: true
        });
      });

      await expect(page.locator('#errorOverlay')).toHaveClass(/show/);

      // Tab through dialog elements
      await page.keyboard.press('Tab');
      await expect(page.locator('#errorCloseBtn')).toBeFocused();

      await page.keyboard.press('Tab');
      // Should focus on one of the action buttons

      // Shift+Tab should go backwards
      await page.keyboard.press('Shift+Tab');
      await expect(page.locator('#errorCloseBtn')).toBeFocused();
    });
  });
});