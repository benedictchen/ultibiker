import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Listen for console messages
  page.on('console', msg => {
    console.log(`CONSOLE [${msg.type()}]: ${msg.text()}`);
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    console.log(`PAGE ERROR: ${error.message}`);
  });
  
  try {
    console.log('Navigating to http://localhost:3002...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    
    console.log('Page loaded, taking screenshot...');
    await page.screenshot({ path: 'screenshot.png', fullPage: true });
    
    // Check if Add buttons exist
    const addButtons = await page.$$('[onclick*="connectDevice"]');
    console.log(`Found ${addButtons.length} Add buttons with connectDevice onclick handlers`);
    
    // Check if dashboard object exists
    const dashboardExists = await page.evaluate(() => {
      return typeof window.dashboard !== 'undefined';
    });
    console.log(`Dashboard object exists: ${dashboardExists}`);
    
    // Check if connectDevice method exists
    const connectDeviceExists = await page.evaluate(() => {
      return typeof window.dashboard?.connectDevice === 'function';
    });
    console.log(`Dashboard.connectDevice method exists: ${connectDeviceExists}`);
    
    // Get button states
    for (let i = 0; i < addButtons.length; i++) {
      const button = addButtons[i];
      const isVisible = await button.isVisible();
      const isEnabled = await button.isEnabled();
      const onclick = await button.getAttribute('onclick');
      console.log(`Button ${i + 1}: visible=${isVisible}, enabled=${isEnabled}, onclick="${onclick}"`);
    }
    
    // Try clicking the first Add button if it exists
    if (addButtons.length > 0) {
      console.log('Attempting to click first Add button...');
      try {
        await addButtons[0].click();
        console.log('Button click succeeded');
        
        // Wait a moment and check for any changes
        await page.waitForTimeout(1000);
      } catch (error) {
        console.log(`Button click failed: ${error.message}`);
      }
    }
    
    console.log('Screenshot saved as screenshot.png');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();