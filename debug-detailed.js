import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Set up comprehensive monitoring
  page.on('console', msg => {
    console.log(`CONSOLE [${msg.type()}]: ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.log(`PAGE ERROR: ${error.message}`);
    console.log(`Stack: ${error.stack}`);
  });

  page.on('requestfailed', request => {
    console.log(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`);
  });
  
  try {
    console.log('Navigating to http://localhost:3002...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    
    // Wait a bit for everything to initialize
    await page.waitForTimeout(2000);
    
    console.log('Taking initial screenshot...');
    await page.screenshot({ path: 'screenshot-initial.png', fullPage: true });
    
    // Check dashboard initialization
    const dashboardState = await page.evaluate(() => {
      return {
        dashboardExists: typeof window.dashboard !== 'undefined',
        connectDeviceExists: typeof window.dashboard?.connectDevice === 'function',
        discoveredDevicesCount: window.dashboard?.discoveredDevices?.size || 0,
        connectedDevicesCount: window.dashboard?.connectedDevices?.size || 0,
        scanningState: window.dashboard?.isScanning,
        socketConnected: window.dashboard?.socket?.connected
      };
    });
    
    console.log('Dashboard state:', dashboardState);
    
    // Check if devices are discovered
    const devicesInDOM = await page.$$('#discovered-devices .device-card');
    console.log(`Devices found in DOM: ${devicesInDOM.length}`);
    
    // Check for Add buttons
    const addButtons = await page.$$('[onclick*="connectDevice"]');
    console.log(`Add buttons found: ${addButtons.length}`);
    
    // Try to trigger a manual scan
    console.log('Looking for scan button...');
    const scanButton = await page.$('button[onclick*="startScan"], button:has-text("Start Scan"), #startScanBtn');
    
    if (scanButton) {
      console.log('Found scan button, clicking...');
      await scanButton.click();
      
      // Wait for scan to potentially discover devices
      await page.waitForTimeout(5000);
      
      // Check again after scanning
      const postScanDevices = await page.$$('#discovered-devices .device-card');
      const postScanAddButtons = await page.$$('[onclick*="connectDevice"]');
      
      console.log(`After scanning - Devices: ${postScanDevices.length}, Add buttons: ${postScanAddButtons.length}`);
      
      // Take another screenshot
      await page.screenshot({ path: 'screenshot-after-scan.png', fullPage: true });
      
      // If we found buttons, try clicking one
      if (postScanAddButtons.length > 0) {
        console.log('Found Add button, attempting to click...');
        
        // Get button details
        const buttonInfo = await postScanAddButtons[0].evaluate(btn => ({
          onclick: btn.getAttribute('onclick'),
          visible: btn.offsetParent !== null,
          enabled: !btn.disabled,
          innerHTML: btn.innerHTML
        }));
        
        console.log('Button info:', buttonInfo);
        
        try {
          await postScanAddButtons[0].click();
          console.log('Button clicked successfully');
          
          // Wait to see what happens
          await page.waitForTimeout(2000);
          
        } catch (error) {
          console.log(`Failed to click button: ${error.message}`);
        }
      }
    } else {
      console.log('No scan button found, checking current scan state...');
      
      // Check if scanning is already active
      const scanState = await page.evaluate(() => {
        const scanButton = document.querySelector('#startScanBtn, button[onclick*="startScan"]');
        return {
          scanButtonExists: !!scanButton,
          scanButtonText: scanButton?.textContent,
          scanButtonDisabled: scanButton?.disabled,
          autoScanActive: window.dashboard?.autoScanActive
        };
      });
      
      console.log('Scan state:', scanState);
    }
    
    // Final screenshot
    await page.screenshot({ path: 'screenshot-final.png', fullPage: true });
    
    console.log('Investigation complete. Screenshots saved.');
    
  } catch (error) {
    console.error('Error during investigation:', error);
  } finally {
    await browser.close();
  }
})();