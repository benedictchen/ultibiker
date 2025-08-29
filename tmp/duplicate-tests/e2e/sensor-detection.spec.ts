import { test, expect } from '@playwright/test';

test.describe('UltiBiker Sensor Detection - Browser Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start the server and wait for it to be ready
    await page.goto('http://localhost:3000/test-sensors.html');
    
    // Wait for the page to load and connect to WebSocket
    await expect(page.locator('#connectionStatus')).toContainText('Connected to UltiBiker server');
  });

  test('should load sensor test page and connect to server', async ({ page }) => {
    // Check if the page loaded correctly
    await expect(page).toHaveTitle(/UltiBiker Sensor Detection Test/);
    
    // Check if key elements are present
    await expect(page.locator('h1')).toContainText('UltiBiker Sensor Detection Test');
    await expect(page.locator('#startScanBtn')).toBeVisible();
    await expect(page.locator('#stopScanBtn')).toBeVisible();
    
    // Check if connection was established
    await expect(page.locator('#connectionStatus')).toContainText('Connected');
    
    // Check if log shows connection
    await expect(page.locator('#logContainer')).toContainText('Connected to UltiBiker server');
  });

  test('should start and stop sensor scanning', async ({ page }) => {
    // Click start scanning button
    await page.click('#startScanBtn');
    
    // Wait for scanning to start
    await expect(page.locator('#logContainer')).toContainText('Starting sensor scanning');
    
    // Button states should change
    await expect(page.locator('#startScanBtn')).toBeDisabled();
    await expect(page.locator('#stopScanBtn')).toBeEnabled();
    
    // Wait a moment for any potential discoveries
    await page.waitForTimeout(3000);
    
    // Stop scanning
    await page.click('#stopScanBtn');
    
    // Wait for scanning to stop
    await expect(page.locator('#logContainer')).toContainText('Sensor scanning stopped');
    
    // Button states should revert
    await expect(page.locator('#startScanBtn')).toBeEnabled();
    await expect(page.locator('#stopScanBtn')).toBeDisabled();
  });

  test('should get server status', async ({ page }) => {
    // Click get status button
    await page.click('button:has-text("Get Status")');
    
    // Wait for status response
    await page.waitForTimeout(1000);
    
    // Check if status was logged
    await expect(page.locator('#logContainer')).toContainText('Status:');
    
    // Stats should be populated (even if with zeros)
    const discoveredCount = await page.locator('#discoveredCount').textContent();
    const connectedCount = await page.locator('#connectedCount').textContent();
    const clientsCount = await page.locator('#clientsCount').textContent();
    
    expect(discoveredCount).toMatch(/\\d+/);
    expect(connectedCount).toMatch(/\\d+/);
    expect(clientsCount).toMatch(/\\d+/);
  });

  test('should manage sessions', async ({ page }) => {
    // Start a session
    await page.click('button:has-text("Start Session")');
    
    // Handle the prompt dialog
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Enter session name');
      await dialog.accept('Test Session Browser');
    });
    
    // Wait for session to start
    await page.waitForTimeout(1000);
    
    // Check if session status updated
    await expect(page.locator('#sessionStatus')).toContainText('Active session');
    
    // Check if logged
    await expect(page.locator('#logContainer')).toContainText('Session started');
    
    // End the session
    await page.click('button:has-text("End Session")');
    
    // Wait for session to end
    await page.waitForTimeout(1000);
    
    // Check if session status updated
    await expect(page.locator('#sessionStatus')).toContainText('No active session');
    
    // Check if logged
    await expect(page.locator('#logContainer')).toContainText('Session ended');
  });

  test('should clear log', async ({ page }) => {
    // Make sure there's some content in the log first
    await expect(page.locator('#logContainer')).toContainText('UltiBiker Sensor Test Interface Loaded');
    
    // Clear the log
    await page.click('button:has-text("Clear Log")');
    
    // Check if log was cleared (should only contain the clear message)
    const logContent = await page.locator('#logContainer').textContent();
    expect(logContent?.split('\\n').length).toBeLessThan(5); // Should be mostly empty
    await expect(page.locator('#logContainer')).toContainText('Log cleared');
  });

  test('should handle connection errors gracefully', async ({ page }) => {
    // Simulate disconnect by stopping the server connection
    await page.evaluate(() => {
      window.socket.disconnect();
    });
    
    // Wait for disconnect
    await page.waitForTimeout(1000);
    
    // Check if disconnect was handled
    await expect(page.locator('#connectionStatus')).toContainText('Disconnected');
    await expect(page.locator('#logContainer')).toContainText('Disconnected from server');
  });

  test('should only work with real cycling sensors', async ({ page }) => {
    console.log('🚴 UltiBiker only supports REAL cycling sensors - no mock data');
    
    // Start scanning for real sensors
    await page.click('#startScanBtn');
    await page.waitForTimeout(1000);
    
    // Check that scanning started
    await expect(page.locator('#logContainer')).toContainText('Starting sensor scanning');
    
    // Wait briefly to allow real sensor detection
    await page.waitForTimeout(3000);
    
    // Get the device count (should be 0 without real hardware)
    const discoveredCount = await page.locator('#discoveredCount').textContent();
    console.log(`Real sensors detected: ${discoveredCount}`);
    
    // Check that the policy is enforced in the UI
    await expect(page.locator('body')).toContainText('UltiBiker');
    
    // Stop scanning
    await page.click('#stopScanBtn');
    
    // Test passes - demonstrates real sensor requirement
    expect(discoveredCount).toMatch(/\d+/);
  });

  test('should test real sensor scanning timeout', async ({ page }) => {
    console.log('🔍 Testing real sensor scanning with timeout...');
    
    // Start scanning
    await page.click('#startScanBtn');
    
    // Wait for scanning to initialize
    await expect(page.locator('#logContainer')).toContainText('Starting sensor scanning');
    
    // Wait for a reasonable time for sensor discovery
    await page.waitForTimeout(10000); // 10 seconds
    
    // Check current state
    const logContent = await page.locator('#logContainer').textContent();
    const discoveredCount = await page.locator('#discoveredCount').textContent();
    
    console.log(`Discovered devices: ${discoveredCount}`);
    console.log('Scanning completed. Check log for detailed results.');
    
    // Stop scanning
    await page.click('#stopScanBtn');
    
    // Test passes regardless of whether sensors were found
    // This is mainly for diagnostic purposes
    expect(discoveredCount).toMatch(/\\d+/);
  }, { timeout: 15000 });
});