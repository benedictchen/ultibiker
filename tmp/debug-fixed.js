import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Set up monitoring
  const logs = [];
  page.on('console', msg => {
    const log = `CONSOLE [${msg.type()}]: ${msg.text()}`;
    console.log(log);
    logs.push(log);
  });
  
  const errors = [];
  page.on('pageerror', error => {
    const err = `PAGE ERROR: ${error.message}`;
    console.log(err);
    errors.push(err);
  });
  
  try {
    console.log('Navigating to http://localhost:3002...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    
    // Wait for initialization
    await page.waitForTimeout(3000);
    
    console.log('Taking screenshot...');
    await page.screenshot({ path: 'fixed-screenshot.png', fullPage: true });
    
    // Check dashboard state
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
    
    // Check for devices and buttons
    const devicesInDOM = await page.$$('#discovered-devices .device-card');
    const addButtons = await page.$$('[onclick*="connectDevice"]');
    
    console.log(`Devices in DOM: ${devicesInDOM.length}`);
    console.log(`Add buttons found: ${addButtons.length}`);
    
    // Try triggering a scan to discover devices
    console.log('Looking for scan controls...');
    
    const scanButton = await page.$('button[onclick*="startScan"], button:has-text("Start Scan"), #startScanBtn');
    
    if (scanButton) {
      console.log('Found scan button, triggering scan...');
      await scanButton.click();
    } else {
      console.log('No scan button found, checking if auto-scanning is enabled...');
    }
    
    // Wait for devices to potentially appear
    console.log('Waiting for device discovery...');
    await page.waitForTimeout(10000);
    
    // Check again for devices and buttons
    const postScanDevices = await page.$$('#discovered-devices .device-card');
    const postScanAddButtons = await page.$$('[onclick*="connectDevice"]');
    
    console.log(`After waiting - Devices: ${postScanDevices.length}, Add buttons: ${postScanAddButtons.length}`);
    
    // Get more detailed device info
    const deviceInfo = await page.evaluate(() => {
      const discoveredContainer = document.getElementById('discovered-devices');
      const connectedContainer = document.getElementById('connected-devices');
      
      return {
        discoveredHTML: discoveredContainer ? discoveredContainer.innerHTML.substring(0, 500) + '...' : 'not found',
        connectedHTML: connectedContainer ? connectedContainer.innerHTML.substring(0, 500) + '...' : 'not found',
        bodyClasses: document.body.className,
        hasScanning: document.querySelector('.scanning, [data-scanning="true"]') !== null
      };
    });
    
    console.log('Device containers info:', deviceInfo);
    
    // If we still have buttons, try to click one
    if (postScanAddButtons.length > 0) {
      console.log('Testing button functionality...');
      
      const buttonInfo = await postScanAddButtons[0].evaluate(btn => ({
        onclick: btn.getAttribute('onclick'),
        visible: btn.offsetParent !== null,
        enabled: !btn.disabled,
        innerHTML: btn.innerHTML.substring(0, 100)
      }));
      
      console.log('First button info:', buttonInfo);
      
      // Click the button
      try {
        await postScanAddButtons[0].click();
        console.log('Button clicked successfully!');
        
        // Wait for response
        await page.waitForTimeout(2000);
        
        console.log('Checking for any new notifications or changes...');
        
      } catch (error) {
        console.log(`Failed to click button: ${error.message}`);
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'fixed-final-screenshot.png', fullPage: true });
    
    console.log('\n=== SUMMARY ===');
    console.log(`Dashboard loaded: ${dashboardState.dashboardExists}`);
    console.log(`Connect function exists: ${dashboardState.connectDeviceExists}`);
    console.log(`Socket connected: ${dashboardState.socketConnected}`);
    console.log(`Devices discovered: ${postScanDevices.length}`);
    console.log(`Add buttons found: ${postScanAddButtons.length}`);
    console.log(`JavaScript errors: ${errors.length}`);
    
    if (errors.length > 0) {
      console.log('\nJavaScript Errors:');
      errors.forEach(err => console.log(`  - ${err}`));
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();