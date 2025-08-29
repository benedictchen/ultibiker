import { test, expect } from '@playwright/test';

test.describe('Chart Size Control', () => {
  test('chart should not grow uncontrollably', async ({ page }) => {
    // Start the development server (assuming it's running)
    await page.goto('http://localhost:3000');
    
    // Wait for the page to load and chart to initialize
    await page.waitForSelector('#liveChart', { timeout: 10000 });
    
    // Get initial chart dimensions
    const chartElement = page.locator('#liveChart');
    const initialDimensions = await chartElement.boundingBox();
    
    expect(initialDimensions).not.toBeNull();
    console.log('Initial chart dimensions:', initialDimensions);
    
    // Verify initial size constraints are applied
    expect(initialDimensions!.height).toBeLessThanOrEqual(360);
    expect(initialDimensions!.width).toBeGreaterThan(0);
    
    // Wait for 3 seconds to allow any potential data updates
    await page.waitForTimeout(3000);
    
    // Get dimensions after waiting
    const finalDimensions = await chartElement.boundingBox();
    
    expect(finalDimensions).not.toBeNull();
    console.log('Final chart dimensions:', finalDimensions);
    
    // Verify the chart hasn't grown
    expect(finalDimensions!.height).toBeLessThanOrEqual(360);
    expect(finalDimensions!.width).toBeLessThanOrEqual(initialDimensions!.width + 10); // Allow small variance
    expect(finalDimensions!.height).toBeLessThanOrEqual(initialDimensions!.height + 10); // Allow small variance
    
    // Verify the chart container has proper styling
    const containerElement = page.locator('.chart-container');
    const containerStyles = await containerElement.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        height: computed.height,
        maxHeight: computed.maxHeight,
        overflow: computed.overflow
      };
    });
    
    console.log('Container styles:', containerStyles);
    expect(containerStyles.maxHeight).toBe('360px'); // Chart container itself is 360px
    expect(containerStyles.overflow).toBe('hidden');
  });

  test('chart size remains stable with empty data state', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('#liveChart', { timeout: 10000 });
    
    const chartElement = page.locator('#liveChart');
    const initialDimensions = await chartElement.boundingBox();
    
    console.log('🚫 UltiBiker does not support mock sensor data');
    console.log('📊 Testing chart with empty data state (no real sensors)');
    
    // Wait to ensure chart remains stable without any data
    await page.waitForTimeout(3000);
    
    // Check dimensions after waiting (no data should be added)
    const finalDimensions = await chartElement.boundingBox();
    
    expect(finalDimensions).not.toBeNull();
    
    // Verify chart hasn't grown beyond limits even in empty state
    expect(finalDimensions!.height).toBeLessThanOrEqual(360);
    expect(finalDimensions!.width).toBeLessThanOrEqual(initialDimensions!.width + 10);
    
    // The chart should handle empty state gracefully
    expect(finalDimensions!.height).toBeGreaterThan(200); // Still visible
    expect(finalDimensions!.height).toBeLessThanOrEqual(360); // Not oversized
    
    console.log('✅ Chart maintains proper dimensions without sensor data');
  });

  test('chart canvas has proper CSS constraints', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('#liveChart', { timeout: 10000 });
    
    // Check if canvas element has the required CSS constraints
    const canvasStyles = await page.locator('#liveChart').evaluate((canvas) => {
      const computed = window.getComputedStyle(canvas);
      return {
        maxWidth: computed.maxWidth,
        maxHeight: computed.maxHeight,
        height: computed.height
      };
    });
    
    console.log('Canvas styles:', canvasStyles);
    
    // Verify the CSS rules are applied correctly
    expect(canvasStyles.maxHeight).toBe('360px');
    expect(canvasStyles.height).toBe('360px');
    expect(canvasStyles.maxWidth).toBe('100%');
  });

  test('chart remains responsive but bounded', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForSelector('#liveChart', { timeout: 10000 });
    
    // Test different viewport sizes
    const viewports = [
      { width: 1200, height: 800 },
      { width: 800, height: 600 },
      { width: 400, height: 600 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500); // Allow resize to complete
      
      const chartDimensions = await page.locator('#liveChart').boundingBox();
      expect(chartDimensions).not.toBeNull();
      
      // Chart should adapt to viewport but never exceed height limit
      expect(chartDimensions!.height).toBeLessThanOrEqual(360);
      expect(chartDimensions!.width).toBeGreaterThan(0);
      
      console.log(`Viewport ${viewport.width}x${viewport.height}: Chart ${chartDimensions!.width}x${chartDimensions!.height}`);
    }
  });
});